// Port of lib/kitchen_joints.rb (v185) — the general aleta (cam-lock) system: after a unit is built,
// every piece edge that sits on another piece's face becomes a joint with dowel/cam sets.
import { rround } from "../core/rubyMath.js";
import { COLORS } from "./config.js";
import { assignLayer, createHoleMarker, createHoleMarkerY, createHoleMarkerZ } from "./helpers.js";
import { TAGS } from "./carcass.js";
import { clamp, toF, toS, truthy } from "./rb.js";
import { BoundingBox, cm, Transformation } from "./su/geom.js";
import { ComponentInstance, Entities, Group } from "./su/model.js";
const EPS = 0.001;
const SKIP_LAYERS = ["Kitchen - Back Panel", "Kitchen - Countertop", "Kitchen - Front", "Kitchen - Toe Kick", "Kitchen - Assembly Points"];
const MIDDLE_SET_OVER = 70.0;
const AXES = ["x", "y", "z"];
const lo = (b, a) => b[`${a}0`];
const hi = (b, a) => b[`${a}1`];
const ext = (b, a) => hi(b, a) - lo(b, a);
const toCm = (v) => v / cm(1.0);
export function enabled(p) {
    return !!p && truthy(p["include_assembly_holes"]) && toS(p["element_mode"]) !== "accessory";
}
/** returns the number of sets made */
export function applyJoints(ctx, group, params, unitIdIn = null) {
    if (!group || !enabled(params))
        return 0;
    try {
        const unitId = unitIdIn ?? group.entityID;
        const c = config(params);
        const labels = ctx.labels.pieces.filter((p) => p.unit_id === unitId);
        let pieces = collect(group, labels);
        if (params["assembly_shelves_fixed"] === false)
            pieces = pieces.filter((pc) => pc.layer !== "Kitchen - Shelves");
        if (pieces.length < 2)
            return 0;
        const center = {};
        for (const a of AXES)
            center[a] = (Math.min(...pieces.map((p) => lo(p.box, a))) + Math.max(...pieces.map((p) => hi(p.box, a)))) / 2.0;
        const ents = group.entities;
        let sets = 0;
        for (const fp of pieces) {
            const k = fp.thin;
            for (const ep of pieces) {
                if (ep === fp)
                    continue;
                const ek = ep.thin;
                if (ek === k)
                    continue;
                const fb = fp.box;
                const eb = ep.box;
                let plane;
                let inward;
                if (Math.abs(lo(eb, k) - hi(fb, k)) < EPS)
                    [plane, inward] = [hi(fb, k), 1.0];
                else if (Math.abs(hi(eb, k) - lo(fb, k)) < EPS)
                    [plane, inward] = [lo(fb, k), -1.0];
                else
                    continue;
                const o0 = Math.max(lo(eb, ek), lo(fb, ek));
                const o1 = Math.min(hi(eb, ek), hi(fb, ek));
                if (!(o1 - o0 > ext(eb, ek) - 0.01))
                    continue;
                const line = AXES.find((a) => a !== k && a !== ek);
                const l0 = Math.max(lo(eb, line), lo(fb, line));
                const l1 = Math.min(hi(eb, line), hi(fb, line));
                if (!(l1 - l0 > 0.5))
                    continue;
                sets += drill(ctx, ents, c, fp, ep, k, ek, line, plane, inward, l0, l1, center, unitId);
            }
        }
        return sets;
    }
    catch (e) {
        ctx.puts(`[KitchenUnitDesigner] KitchenJoints error: ${e.message}\n${(e.stack ?? "").split("\n").slice(1, 5).join("\n")}`);
        return 0;
    }
}
function config(p) {
    const v = (k, d) => (toF(p[k]) > 0 ? toF(p[k]) : d);
    return {
        d: v("assembly_hole_diameter", 0.8),
        edge: v("assembly_edge_distance", 1.0),
        spacing: v("assembly_hole_spacing", 2.8),
        face_depth: v("assembly_side_depth", 0.8),
        edge_depth: v("assembly_base_depth", 3.2),
        cam_d: v("assembly_cam_diameter", 1.5),
        cam_depth: v("assembly_cam_depth", 1.4),
    };
}
function collect(group, labels) {
    const out = [];
    walk(group.entities, new Transformation(), labels, out);
    return out;
}
function walk(entities, tr, labels, out) {
    for (const e of entities.list) {
        if (!(e instanceof Group || e instanceof ComponentInstance))
            continue;
        if (e.getAttribute("KUD", "is_door", false) || e.getAttribute("KUD", "is_drawer", false))
            continue;
        const layer = e.layer ? e.layer.name : "";
        if (SKIP_LAYERS.includes(layer))
            continue;
        const ttr = tr.mul(e.transformation);
        if (e.getAttribute("KUD", "is_cut_piece", false)) {
            const pc = piece(e, ttr, labels);
            if (pc)
                out.push({ ...pc, layer });
        }
        else
            walk(e.definition.entities, ttr, labels, out);
    }
}
function piece(e, tr, labels) {
    const name = e.name;
    let label;
    for (let i = labels.length - 1; i >= 0; i--)
        if (labels[i].name === name) {
            label = labels[i];
            break;
        }
    if (!label)
        return null;
    const faces = e.definition.entities.faces();
    if (!faces.length)
        return null;
    if (!faces.every((f) => {
        const n = f.normal().transform(tr).normalizeBang();
        return Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)) > 0.999;
    }))
        return null;
    const bb = new BoundingBox();
    for (const f of faces)
        for (const v of f.vertices())
            bb.add(tr.applyPoint(v.position));
    const mn = bb.min();
    const mx = bb.max();
    const box = { x0: toCm(mn.x), y0: toCm(mn.y), z0: toCm(mn.z), x1: toCm(mx.x), y1: toCm(mx.y), z1: toCm(mx.z) };
    let thin = "x";
    for (const a of AXES)
        if (ext(box, a) < ext(box, thin))
            thin = a;
    if (ext(box, thin) < 0.3)
        return null;
    return { name, box, thin, label, axes: labelAxes(box, thin, label) };
}
function labelAxes(box, thin, label) {
    const [a, b] = AXES.filter((x) => x !== thin);
    const w = toF(label.w);
    const da = Math.abs(ext(box, a) - w);
    const db = Math.abs(ext(box, b) - w);
    if (Math.abs(da - db) < 0.05)
        return b === "z" || (a === "x" && b === "y") ? [a, b] : [b, a];
    return da < db ? [a, b] : [b, a];
}
function ratio(box, a, v) {
    const e = ext(box, a);
    return e > 0 ? rround(clamp((v - lo(box, a)) / e, 0.0, 1.0), 4) : 0.5;
}
function labelHole(ctx, unitId, pc, pos, d) {
    const [wa, ha] = pc.axes;
    ctx.labels.appendHoles(unitId, pc.name, { y_ratio: ratio(pc.box, wa, pos[wa]), z_ratio: ratio(pc.box, ha, pos[ha]), d });
}
function pt(k, kv, ek, ev, line, lv) {
    const o = {};
    o[k] = kv;
    o[ek] = ev;
    o[line] = lv;
    return o;
}
function drill(ctx, ents, c, fp, ep, k, ek, line, plane, inward, l0, l1, center, unitId) {
    const e = c.edge;
    const s = c.spacing;
    const span = l1 - l0;
    const eb = ep.box;
    const ec = (lo(eb, ek) + hi(eb, ek)) / 2.0;
    const et = ext(eb, ek);
    const base = `ثقب أليتا - ${ep.name} × ${fp.name}`;
    if (span < 2 * e + 2 * s - 0.001) {
        dowel(ctx, ents, c, fp, ep, k, ek, line, plane, inward, ec, (l0 + l1) / 2.0, `${base} - دوبل`, unitId);
        ctx.labels.appendNote(unitId, ep.name, `وصلة قصيرة مع "${fp.name}" — دوبل واحد + غراء`);
        return 0;
    }
    let starts = [l0 + e, l1 - e - 2 * s];
    if (span > MIDDLE_SET_OVER)
        starts.splice(1, 0, (l0 + l1) / 2.0 - s);
    const seen = [];
    starts = starts.filter((v) => {
        const key = rround(v, 2);
        if (seen.includes(key))
            return false;
        seen.push(key);
        return true;
    });
    if (starts.length === 2 && starts[1] < starts[0] + 3 * s - 0.001)
        starts.pop();
    starts.forEach((st, si) => {
        const set = `طقم ${si + 1}`;
        [st, st + s, st + 2 * s].forEach((pos, i) => {
            dowel(ctx, ents, c, fp, ep, k, ek, line, plane, inward, ec, pos, `${base} - ${set} - ${i + 1}`, unitId);
            if (i !== 1)
                return;
            const camK = plane + inward * c.edge_depth;
            const dir = ec < center[ek] ? 1.0 : -1.0;
            const camC = ec + dir * (et / 2.0 - c.cam_depth / 2.0);
            marker(ctx, ents, ek, pt(k, camK, ek, camC, line, pos), c.cam_d / 2.0, c.cam_depth, `ثقب تجميع (قفل كام) - ${ep.name} × ${fp.name} - ${set}`);
            labelHole(ctx, unitId, ep, pt(k, camK, ek, ec, line, pos), c.cam_d);
        });
    });
    return starts.length;
}
function dowel(ctx, ents, c, fp, ep, k, ek, line, plane, inward, ec, pos, name, unitId) {
    const faceC = plane - (inward * c.face_depth) / 2.0;
    const edgeC = plane + (inward * c.edge_depth) / 2.0;
    marker(ctx, ents, k, pt(k, faceC, ek, ec, line, pos), c.d / 2.0, c.face_depth, `${name} (وش)`);
    marker(ctx, ents, k, pt(k, edgeC, ek, ec, line, pos), c.d / 2.0, c.edge_depth, `${name} (حرف)`);
    labelHole(ctx, unitId, fp, pt(k, plane, ek, ec, line, pos), c.d);
    labelHole(ctx, unitId, ep, pt(k, plane, ek, ec, line, pos), c.d);
}
function marker(ctx, ents, axis, p, r, len, name) {
    const [x, y, z] = [cm(p.x), cm(p.y), cm(p.z)];
    const f = axis === "x" ? createHoleMarker : axis === "y" ? createHoleMarkerY : createHoleMarkerZ;
    const m = f(ctx, ents, name, x, y, z, cm(r), cm(len), COLORS.assembly);
    assignLayer(ctx, m, TAGS.assembly);
    return m;
}
