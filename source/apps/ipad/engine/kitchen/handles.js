// Port of lib/handles/kitchen.rb — fits the unified handle system onto a built kitchen unit
// (runs after the builder, exactly like the plugin's BuilderFactory hook).
import { rround } from "../core/rubyMath.js";
import * as Catalog from "../handles/catalog.js";
import { recessFor } from "./config.js";
import { COLORS as KCOLORS } from "./config.js";
import { assignLayer, createBox, createFlatSlab, createHoleMarker, createHoleMarkerY, createSlabAlongX, NO_BAND } from "./helpers.js";
import { TAGS } from "./carcass.js";
import { fs, toF, toS } from "./rb.js";
import { BoundingBox, cm, Point3d, Transformation, Vector3d } from "./su/geom.js";
import { ComponentInstance, Entities, Face, Group } from "./su/model.js";
export const PARAM_KEY = "kud_handles";
export const LAYER = "Kitchen - Handles";
const COLORS = { handle: [70, 72, 76], profile: [188, 192, 198], gola: [34, 36, 35], routed: [92, 64, 40], wood_strip: [196, 160, 112] };
const SKIP_CATEGORIES = ["bed"];
const isHash = (v) => !!v && typeof v === "object" && !Array.isArray(v);
/** Handles.effective_cfg — the unit's own settings (params.kud_handles), else the app default */
export function effectiveCfg(params, appDefault = null) {
    const r = effectiveCfg0(params, appDefault);
    // v106 (NOVERA): a base unit that leaves a handle gap at the top of its fronts and has no other handle gets the real
    // built-in aluminium profile — L under the counter, C between drawers (the drawer fronts get the same gap)
    const recess = isHash(params) ? toF(params["door_handle_recess"]) : 0;
    if ((!r[0] || r[0].type === "none") && recess > 0 && toS(params["unit_type"]) === "base")
        return Catalog.normalize({ type: "gola", gola_height: recess });
    return r;
}
function effectiveCfg0(params, appDefault = null) {
    const own = isHash(params) ? params[PARAM_KEY] : null;
    if (isHash(own))
        return Catalog.normalize(own);
    if (appDefault) {
        const [cfg, errors] = Catalog.normalize(appDefault);
        return errors.length ? [null, []] : [cfg, []];
    }
    return [null, []];
}
export function applicable(params, appDefault = null) {
    if (!isHash(params))
        return false;
    if (toS(params["element_mode"]) === "accessory")
        return false;
    if (SKIP_CATEGORIES.includes(toS(params["unit_category"])))
        return false;
    const [cfg] = effectiveCfg(params, appDefault);
    if (params["toe_kick_drawer"] && toS(params["toe_kick_drawer_handle"]) === "routed")
        return true; // v191
    return !!cfg && cfg.type !== "none";
}
/** Handles.shift_ratios */
function shiftRatios(ratios, hingeSide, reduce, w, h, fr) {
    const flip = hingeSide === "top";
    const full = flip ? w : h;
    const lo = flip ? fr.x0 : fr.z0;
    const len = flip ? fr.x1 - fr.x0 : fr.z1 - fr.z0;
    const hiEdge = flip ? "right" : "top";
    const loEdge = flip ? "left" : "bottom";
    return ratios
        .map((r) => {
        const abs = r * full;
        const pos = reduce.edge === hiEdge && abs > full / 2.0 ? len - (full - abs) : reduce.edge === loEdge && abs < full / 2.0 ? abs : abs - lo;
        return rround(pos / len, 4);
    })
        .filter((r) => r > 0 && r < 1);
}
const toCm = (v) => v / cm(1.0);
const isInst = (e) => e instanceof Group || e instanceof ComponentInstance;
function localBounds(e) {
    return e.definition.bounds();
}
function boxIn(e, tr) {
    const lb = localBounds(e);
    const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => tr.applyPoint(lb.corner(i)));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const zs = pts.map((p) => p.z);
    return {
        x0: toCm(Math.min(...xs)), x1: toCm(Math.max(...xs)), y0: toCm(Math.min(...ys)), y1: toCm(Math.max(...ys)),
        z0: toCm(Math.min(...zs)), z1: toCm(Math.max(...zs)),
    };
}
const attr = (e, k, d = null) => e.getAttribute("KUD", k, d);
function collectFronts(entities, tr, out) {
    for (const e of entities.list) {
        if (!isInst(e))
            continue;
        const t = tr.mul(e.transformation);
        if (attr(e, "is_door", false)) {
            // NOVERA: a corner door facing along another axis (the L corner's two doors face +y / +x) is handled in a frame turned
            // so that it faces −y like every other front (`rot`); angled (diagonal) doors still get none
            const nw = tr.applyVector([toF(attr(e, "normal_x", 0)), toF(attr(e, "normal_y", 0)), toF(attr(e, "normal_z", 0))]);
            const nl = Math.hypot(nw.x, nw.y, nw.z) || 1;
            let V = null;
            if (!(nw.y / nl < -0.5)) {
                if (!(Math.abs(nw.x / nl) > 0.9 || nw.y / nl > 0.9))
                    continue;
                V = Transformation.rotation([0, 0, 0], [0, 0, 1], -Math.PI / 2 - Math.atan2(nw.y, nw.x));
            }
            const ct = V ? V.mul(tr) : tr;
            const hp = ct.applyPoint([toF(attr(e, "hinge_x", 0)), toF(attr(e, "hinge_y", 0)), 0]), fp = ct.applyPoint([toF(attr(e, "free_x", 0)), toF(attr(e, "free_y", 0)), 0]);
            const hinge = Math.abs(toF(attr(e, "axis_x", 0))) > 0.5 ? "top" : (V ? hp.x < fp.x : toF(attr(e, "hinge_x", 0)) < toF(attr(e, "free_x", 0))) ? "left" : "right";
            const t0 = t;
            if (V) {
                const tt = V.mul(t0);
                out.push({ kind: "door", hinge, piece: e, piece_tr: tt, holder: e, holder_tr: tt, framed: false, frameW: 0, name: e.name, parent_ents: entities, rot: true });
                continue;
            }
            const framed = e.name.includes("زجاج") || e.definition.entities.list.some((c) => isInst(c) && attr(c, "is_cut_piece", false));
            // v113: a framed door's handle sits on the middle of its upright / rail — the frame member's width
            let frameW = 0;
            if (framed) {
                const db = boxIn(e, t), dh = db.z1 - db.z0;
                const ws = e.definition.entities.list.filter((c) => isInst(c)).map((c) => boxIn(c, t.mul(c.transformation))).filter((b) => b.z1 - b.z0 > dh * 0.5 && b.x1 - b.x0 < (db.x1 - db.x0) * 0.4).map((b) => b.x1 - b.x0);
                frameW = ws.length ? Math.min(...ws) : 0;
            }
            out.push({ kind: "door", hinge, piece: e, piece_tr: t, holder: e, holder_tr: t, framed, frameW, name: e.name, parent_ents: entities });
        }
        else if (attr(e, "is_drawer", false)) {
            const kids = e.definition.entities.insts();
            let fr = kids.find((c) => c.name === e.name);
            if (!fr && kids.length) {
                let best;
                let bk = null;
                for (const c of kids) {
                    const b = boxIn(c, t.mul(c.transformation));
                    const k = [b.y0, -(b.x1 - b.x0)];
                    if (!bk || k[0] < bk[0] || (k[0] === bk[0] && k[1] < bk[1])) {
                        bk = k;
                        best = c;
                    }
                }
                fr = best;
            }
            if (fr)
                out.push({ kind: "drawer", hinge: null, piece: fr, piece_tr: t.mul(fr.transformation), holder: e, holder_tr: t, framed: false, name: fr.name });
        }
        else {
            collectFronts(e.definition.entities, t, out);
        }
    }
    return out;
}
/** Ruby JSON.generate for the handle cfg / hardware hashes (Floats keep their ".0") */
function rubyJson(v, isFloat, key = "") {
    if (typeof v === "number")
        return isFloat(key) ? fs(v) : String(v);
    if (typeof v === "string")
        return JSON.stringify(v);
    if (typeof v === "boolean" || v === null || v === undefined)
        return v == null ? "null" : String(v);
    if (Array.isArray(v))
        return `[${v.map((x) => rubyJson(x, isFloat, key)).join(",")}]`;
    return `{${Object.entries(v)
        .map(([k, x]) => `${JSON.stringify(k)}:${rubyJson(x, isFloat, k)}`)
        .join(",")}}`;
}
/** v191: the plinth drawer has its own handle: none (default) · same as the unit · a routed CNC handle · a finger gap */
export const KICK_DRAWER = "درج وزرة";
export function kickHandleMode(params) {
    const m = toS(params["toe_kick_drawer_handle"]);
    return ["none", "same", "routed", "gap"].includes(m) ? m : "none";
}
/** v107: every solid board of the unit (no fronts, holes, hinge cups or handle parts) in unit cm, tagged with the drawer front it rides with */
function leafSolids(entities, tr, out, fronts, owner = null) {
    for (const e of entities.list) {
        if (!isInst(e) || attr(e, "handle_part", false))
            continue;
        if (/^(ثقب|خرم|كبة)/.test(e.name || ""))
            continue;
        const t = tr.mul(e.transformation);
        const fr = fronts.find((f) => f.piece === e);
        if (fr)
            continue;
        const own = owner ?? fronts.find((f) => f.kind === "drawer" && f.holder === e) ?? null;
        const kids = e.definition.entities.insts();
        if (kids.length)
            leafSolids(e.definition.entities, t, out, fronts, own);
        if (e.definition.entities.faces().length)
            out.push({ ...boxIn(e, t), owner: own, name: e.name, inst: e });
    }
    return out;
}
/** v107: cut the profile's seat out of a carcass side — the front edge steps back by the profile depth over each profile's height */
function notchSide(ctx, sd, list, pieces) {
    if (!list.length)
        return;
    try {
        const e = sd.inst, parent = e.parent;
        if (!parent)
            return;
        const tr = e.transformation, inv = tr.inverse();
        const P = (x, y, z) => inv.applyPoint(new Point3d(cm(x), cm(y), cm(z)));
        const ns = list.map((n) => ({ z0: Math.max(n.z0, sd.z0), z1: Math.min(n.z1, sd.z1), d: Math.min(n.y1, sd.y1 - 1.0) })).filter((n) => n.z1 - n.z0 > 0.1 && n.d > sd.y0 + 0.1).sort((a, b) => a.z0 - b.z0);
        if (!ns.length)
            return;
        // the side's outline in (y, z), walking the front edge bottom → top with the notches, then the back edge down
        const fy = sd.y0, out = [[sd.y1, sd.z0], [sd.y1, sd.z1]];
        const front = [];
        let z = sd.z0;
        front.push([fy, sd.z0]);
        for (const n of ns) {
            if (n.z0 < z - 0.01)
                continue;
            if (n.z0 > z + 0.01)
                front.push([fy, n.z0]);
            front.push([n.d, n.z0], [n.d, n.z1]);
            if (n.z1 < sd.z1 - 0.01)
                front.push([fy, n.z1]);
            z = n.z1;
        }
        if (z < sd.z1 - 0.01)
            front.push([fy, sd.z1]);
        const poly = [...front, ...out.reverse()];
        const yz = poly.map(([y, zz]) => { const q = P(sd.x0, y, zz); return [q.y, q.z]; });
        const a = P(sd.x0, 0, 0), c = P(sd.x1, 0, 0);
        const old = e.definition.entities.faces();
        const body = old.reduce((m, f) => (!m || f.area() > m.area() ? f : m), null)?.material ?? null;
        const tmp = createSlabAlongX(ctx, parent, `${e.name} (تفريغ)`, Math.min(a.x, c.x), Math.max(a.x, c.x), yz, body);
        parent.remove(tmp);
        // keep the edge banding on the same edges (front / top / bottom)
        const bands = old.filter((f) => f.material && body && f.material !== body).map((f) => [f.normal(), f.material]);
        for (const f of tmp.definition.entities.faces())
            for (const [nv, m] of bands)
                if (f.normal().dot(nv) > 0.9) { f.material = m; f.backMaterial = m; }
        e.definition = tmp.definition;
        const pc = pieces.find((p) => clean(p.name) === clean(e.name));
        if (pc) {
            const txt = ns.map((n) => `${fmtCm(n.d - fy)}×${fmtCm(n.z1 - n.z0)} عند ${fmtCm(n.z0 - sd.z0)}`).join(" · ");
            pc.note = [pc.note, `تفريغ لبروفايل المقبض في الحرف الأمامي (عمق×ارتفاع، من تحت): ${txt}`].filter((x) => x).join(" | ");
        }
    }
    catch (ex) {
        ctx.puts(`[KitchenUnitDesigner] Handles notch warning: ${ex.message}`);
    }
}
const fmtCm = (v) => String(rround(v, 1));
export function applyHandles(ctx, group, params, appDefault = null) {
    const [cfg0, errors] = effectiveCfg(params, appDefault);
    const unitOn = !!(cfg0 && cfg0.type !== "none");
    const kmode = kickHandleMode(params);
    const kcfg = kmode === "routed" ? Catalog.normalize({ type: "builtin_routed", routed_height: toF(params["toe_kick_drawer_handle_size"] ?? 3.0) || 3.0 })[0] : null;
    if (!unitOn && !kcfg)
        return null;
    const cfg = unitOn ? cfg0 : kcfg;
    const warnings = errors.map((e) => `إعداد المقبض: ${e}`);
    const unitId = group.entityID;
    let unitType = toS(params["unit_type"]);
    if (["wardrobe", "fridge"].includes(toS(params["unit_category"])))
        unitType = "tall";
    if (!["base", "wall", "tall"].includes(unitType))
        unitType = "base";
    const ub = localBounds(group);
    const unitZ0 = toCm(ub.min().z);
    const fronts0 = collectFronts(group.entities, new Transformation(), []);
    // the built-in profile is cut to fit between the two sides
    const W = toF(params["width"]), T = toF(params["panel_thickness"]) || 1.8;
    const clipX = W > 2 * T ? [T, W - T] : null;
    for (const f of fronts0) {
        f.box = boxIn(f.piece, f.piece_tr);
        f.clipX = clipX;
    }
    // v107: only the fronts in the door plane get a handle — an inner drawer's own front («وش داخلي») hides behind the main front
    const planeY = Math.min(...fronts0.filter((f) => !f.rot).map((f) => f.box.y0));
    const fronts = fronts0.filter((f) => f.rot || f.box.y0 <= planeY + 0.5);
    const straight = fronts0.filter((f) => !f.rot);
    const solids = cfg0?.type === "gola" ? leafSolids(group.entities, new Transformation(), [], straight) : [];
    // v113: a front with a board standing right in front of it (a drawer behind a sliding door, a filler) gets no handle that sticks out
    const blockers = leafSolids(group.entities, new Transformation(), [], straight);
    const blockedBy = (f) => blockers.find((sd) => sd.owner !== f && sd.y1 <= f.box.y0 + 0.05 && sd.y1 > f.box.y0 - 8.0 &&
        Math.min(sd.x1, f.box.x1) - Math.max(sd.x0, f.box.x0) > 2.0 && Math.min(sd.z1, f.box.z1) - Math.max(sd.z0, f.box.z0) > 2.0);
    // the carcass sides as built (a blind-corner box is wider than its «width» parameter)
    const sL = solids.find((sd) => /^جنب شمال/.test(sd.name) && !sd.owner), sR = solids.find((sd) => /^جنب يمين/.test(sd.name) && !sd.owner);
    // v107: the profile runs the full width of the box through notches cut in the sides (like a real gola), so it lines up with the fronts
    const notchable = !!(sL && sR && sR.x0 - sL.x1 > 5);
    const boards = notchable ? solids.filter((sd) => !sd.owner && sd.x1 - sd.x0 < 2.6 && sd.y1 - sd.y0 > 20 && sd.z1 - sd.z0 > 20 && /جنب|فاصل|قاطوع/.test(sd.name)) : [];
    if (notchable)
        // v110: a glass side (aluminium / wood frame + glass) can't be notched — the profile stops at its inner face
        for (const f of fronts) { f.clipX = [/زجاج/.test(sL.name) ? sL.x1 : sL.x0, /زجاج/.test(sR.name) ? sR.x0 : sR.x1]; f.boards = boards; f.sides = [sL, sR]; }
    const notches = [];
    const recess = unitType === "base" ? recessFor(params) : 0.0;
    const pieces = ctx.labels.pieces.filter((p) => p.unit_id === unitId);
    const used = new Set();
    const hardware = {};
    for (const f of fronts) {
        const isKick = f.holder.name === KICK_DRAWER;
        if (isKick && kmode !== "same" && kmode !== "routed")
            continue;
        if (!isKick && !unitOn)
            continue;
        const b = f.box;
        // NOVERA: a corner door (turned frame) gets only a handle that sticks out — bar / knob on its free edge; never a built-in profile
        if (f.rot && !(!isKick && ["bar", "knob"].includes(cfg?.type)))
            continue;
        const hidden = f.rot ? null : blockedBy(f);
        if (hidden && ["bar", "knob", "edge_pull", "profile"].includes((isKick && kcfg ? kcfg : cfg)?.type)) {
            warnings.push(`${f.name}: ورا «${hidden.name}» — اتعمل من غير مقبض بارز (قصّة إيد أو Push).`);
            continue;
        }
        // v107: what is really above this front — the next front (C between them) or a board / the counter (L under it);
        // the gap the carcass already left there is used as is (it was counted twice before)
        const xa = b.x0 + 1.0, xb = b.x1 - 1.0;
        const xo = (o) => Math.min(o.x1, xb) - Math.max(o.x0, xa) > 0.5;
        let next = null;
        for (const o of f.rot ? [] : fronts)
            if (o !== f && !o.rot && o.holder.name !== KICK_DRAWER && xo(o.box) && o.box.z0 >= b.z1 - 0.01 && (!next || o.box.z0 < next.box.z0))
                next = o;
        let ceil = null;
        for (const sd of f.rot ? [] : solids)
            if (sd.owner !== f && xo(sd) && sd.z0 >= b.z1 - 0.01 && Math.min(sd.y1, b.y1 + 2.5) - Math.max(sd.y0, b.y1) > 0.1 && (ceil === null || sd.z0 < ceil))
                ceil = sd.z0;
        const boxTop = Math.max(-Infinity, ...solids.filter((sd) => sd.owner === f).map((sd) => sd.z1));
        const nextBox = next ? Math.min(Infinity, ...solids.filter((sd) => sd.owner === next).map((sd) => sd.z0)) : Infinity;
        const underBoard = ceil !== null && (!next || ceil < next.box.z0 - 0.01);
        const limit = underBoard ? ceil : next ? next.box.z0 : null;
        const gapAbove = limit === null ? (recess > 0 ? recess + 0.3 : 0.0) : limit - b.z1;
        const front = {
            w: b.x1 - b.x0, h: b.z1 - b.z0, t: b.y1 - b.y0, kind: f.kind, hinge: f.hinge, unit_type: unitType,
            z_base: b.z0 - unitZ0, framed: f.framed, frame_w: f.frameW || 0, existing_recess: gapAbove - 0.3 >= 0.9 ? rround(gapAbove - 0.3, 3) : 0.0,
            is_top: next === null || underBoard, drop: unitType === "wall" ? toF(params["door_bottom_extension"]) : 0.0,
            overlay: toS(params["door_position"]) !== "inset", rail_d: toF(params["top_rail_front_inset"]) > 0 ? toF(params["top_rail_front_inset"]) : 2.5,
            // in the front's own frame: the board / counter above, the next front's bottom, this drawer's box top, the next drawer's box bottom
            ceil: limit === null ? null : limit - b.z0, next_z0: next && !underBoard ? next.box.z0 - b.z0 : null,
            box_top: Number.isFinite(boxTop) ? boxTop - b.z0 : null, next_box_z0: next && !underBoard && Number.isFinite(nextBox) ? nextBox - b.z0 : null,
        };
        // a corner door's free edge meets the other door's face in the inside corner — keep its handle ≥ 6 cm off that edge so the two never touch
        const fcfg = isKick && kcfg ? kcfg : f.rot ? { ...cfg, edge_offset: Math.max(toF(cfg.edge_offset) || 0, 6.0) } : cfg;
        const plan = Catalog.compute(front, fcfg);
        for (const w of plan.warnings)
            warnings.push(`${f.name}: ${w}`);
        for (const [k, v] of Object.entries(plan.hardware))
            hardware[k] = rround((hardware[k] ?? 0) + v, 3);
        if (!plan.holes.length && !plan.visuals.length && !plan.pieces.length && plan.reduce == null)
            continue;
        if (plan.reduce) {
            reshape(ctx, f, plan);
            // v107: a drawer box never rises into the handle gap — its walls follow the cut front down (1 cm under its top)
            if (f.kind === "drawer" && plan.reduce.edge === "top")
                shrinkBoxes(pieces, solids.filter((sd) => sd.owner === f), b.z0 + plan.front.z1 - 1.0);
        }
        draw(ctx, group, f, plan);
        updateLabel(ctx, group, pieces, used, f, plan);
        for (const v of plan.visuals)
            if (v.mat === "gola" && v.section)
                notches.push({ x0: b.x0 + (v.rx0 ?? v.x0), x1: b.x0 + (v.rx1 ?? v.x1), y0: b.y0 + v.y0, y1: b.y0 + v.y1, z0: b.z0 + v.z0, z1: b.z0 + v.z1, kind: /L/.test(v.name) ? "L" : "C" });
    }
    if (notchable && notches.length)
        for (const sd of boards)
            notchSide(ctx, sd, notches.filter((n) => n.x0 < sd.x1 - 0.05 && n.x1 > sd.x0 + 0.05), pieces);
    const uniq = [...new Set(warnings)];
    group.setAttribute("KUD", "handles_cfg_json", rubyJson(cfg, () => true));
    group.setAttribute("KUD", "handles_hardware_json", rubyJson(hardware, (k) => k.includes("(متر طولي)")));
    group.setAttribute("KUD", "handles_warnings", uniq.join("\n"));
    if (uniq.length)
        ctx.puts(`[KitchenUnitDesigner] Handles: ${uniq.join(" | ")}`);
    return { fronts: fronts.length, hardware, warnings: uniq };
}
function shrinkBoxes(pieces, owned, lim) {
    for (const sd of owned) {
        const d = sd.z1 - lim;
        if (d <= 0.01 || sd.z1 - sd.z0 - d < 1.0)
            continue;
        try {
            const e = sd.inst, es = e.definition.entities, top = localBounds(e).max().z, tol = cm(0.01);
            const faces = es.faces().filter((fc) => Math.abs(fc.normal().z) > 0.9 && fc.vertices().every((v) => Math.abs(v.position.z - top) < tol));
            if (!faces.length)
                continue;
            es.transformEntities(Transformation.translation(new Vector3d(0, 0, -cm(d))), faces);
            const h = sd.z1 - sd.z0, pc = pieces.find((p) => clean(p.name) === clean(sd.name) && (Math.abs(toF(p.h) - h) < 0.05 || Math.abs(toF(p.w) - h) < 0.05));
            if (pc) {
                if (Math.abs(toF(pc.h) - h) < 0.05) pc.h = rround(h - d, 3);
                else pc.w = rround(h - d, 3);
            }
        }
        catch (_) { }
    }
}
function reshape(ctx, f, plan) {
    try {
        const r = plan.reduce;
        const [axis, sign] = { top: ["z", -1], bottom: ["z", 1], left: ["x", 1], right: ["x", -1] }[r.edge];
        const e = f.piece;
        const es = e.definition.entities;
        const lb = localBounds(e);
        const edgeVal = axis === "z" ? (r.edge === "top" ? lb.max().z : lb.min().z) : r.edge === "right" ? lb.max().x : lb.min().x;
        const tol = cm(0.01);
        const faces = es.faces().filter((fc) => {
            const n = fc.normal();
            const nv = axis === "z" ? n.z : n.x;
            const vs = fc.vertices().map((v) => (axis === "z" ? v.position.z : v.position.x));
            return Math.abs(nv) > 0.9 && vs.every((v) => Math.abs(v - edgeVal) < tol);
        });
        if (!faces.length)
            return;
        const d = cm(toF(r.amount)) * sign;
        const vec = axis === "z" ? new Vector3d(0, 0, d) : new Vector3d(d, 0, 0);
        const before = f.piece.bounds();
        es.transformEntities(Transformation.translation(vec), faces);
        if (f.parent_ents && (r.edge === "top" || r.edge === "bottom") && f.hinge !== "top")
            moveHingeMarkers(f, r, before);
    }
    catch (ex) {
        ctx.puts(`[KitchenUnitDesigner] Handles reshape warning: ${ex.message}`);
    }
}
function moveHingeMarkers(f, r, db) {
    const mid = (db.min().z + db.max().z) / 2.0;
    const d = cm(toF(r.amount)) * (r.edge === "top" ? -1 : 1);
    for (const c of f.parent_ents.list.slice()) {
        if (!(isInst(c) && c.name === "كبة مفصلة"))
            continue;
        const cb = c.bounds();
        const cx = (cb.min().x + cb.max().x) / 2.0;
        const cz = (cb.min().z + cb.max().z) / 2.0;
        if (!(cx >= db.min().x - cm(0.5) && cx <= db.max().x + cm(0.5) && cz >= db.min().z && cz <= db.max().z))
            continue;
        if (!(r.edge === "top" ? cz > mid : cz < mid))
            continue;
        c.transformBang(Transformation.translation(new Vector3d(0, 0, d)));
    }
}
/** a cylinder along the front's normal (the frame's y) in the holder's own coordinates — along x for a corner door facing ±x */
function cylN(ctx, ents, htr, name, q, r, len, color) {
    const d = htr.inverse().applyVector([0, 1, 0]);
    const l = Math.hypot(d.x, d.y, d.z) || 1;
    return Math.abs(d.x / l) > 0.9 ? createHoleMarker(ctx, ents, name, q.x, q.y, q.z, r, len, color) : createHoleMarkerY(ctx, ents, name, q.x, q.y, q.z, r, len, color);
}
const NAMES = { handle: "مقبض", profile: "بروفايل مقبض", gola: "بروفايل مقبض بلت إن", routed: "حفر مقبض", wood_strip: "مقبض خشب" };
function local(tr, x, y, z) {
    return tr.inverse().applyPoint(new Point3d(cm(x), cm(y), cm(z)));
}
function draw(ctx, group, f, plan) {
    try {
        const b = f.box;
        const fy = b.y0;
        const t = b.y1 - b.y0;
        for (const v of plan.visuals) {
            const [holder, htr] = v.attach === "carcass" ? [group, new Transformation()] : [f.holder, f.holder_tr];
            if (v.section || v.kind) {
                // v106: the real section of the handle, extruded along its run (or posts + a round bar / a round knob)
                const nm = `${f.name} - ${v.name || NAMES[v.mat]}`;
                const ents = holder.definition.entities;
                const color = COLORS[v.mat] ?? COLORS.handle;
                const made = [];
                const L = (x, y, z) => local(htr, b.x0 + x, fy + y, b.z0 + z);
                const circ = (n, r) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
                if (v.section && v.run === "x") {
                    let vx0 = v.x0, vx1 = v.x1;
                    if (v.attach === "carcass" && f.boards) {
                        // run on to the outer face of a side / the middle of a divider next to this end (the boards are notched for it)
                        const ex0 = b.x0 + vx0, ex1 = b.x0 + vx1;
                        const lb = f.boards.find((q) => q.x1 >= ex0 - 2.5 && q.x0 <= ex0 + 0.5);
                        const rb = f.boards.find((q) => q.x0 <= ex1 + 2.5 && q.x1 >= ex1 - 0.5);
                        if (lb) vx0 = (lb === f.sides[0] ? lb.x0 : (lb.x0 + lb.x1) / 2.0) - b.x0;
                        if (rb) vx1 = (rb === f.sides[1] ? rb.x1 : (rb.x0 + rb.x1) / 2.0) - b.x0;
                    }
                    if (v.attach === "carcass" && f.clipX) { vx0 = Math.max(vx0, f.clipX[0] - b.x0); vx1 = Math.min(vx1, f.clipX[1] - b.x0); }
                    v.rx0 = vx0; v.rx1 = vx1;
                    if (vx1 - vx0 < 0.5)
                        continue;
                    const a = L(vx0, 0, 0), c = L(vx1, 0, 0);
                    const yz = v.section.map(([y, z]) => { const q = L(v.x0, y, z); return [q.y, q.z]; });
                    made.push(createSlabAlongX(ctx, ents, nm, Math.min(a.x, c.x), Math.max(a.x, c.x), yz, color));
                }
                else if (v.section) {
                    const a = L(0, 0, v.z0), c = L(0, 0, v.z1);
                    const xy = v.section.map(([y, x]) => { const q = L(x, y, 0); return { x: q.x, y: q.y }; });
                    made.push(createFlatSlab(ctx, ents, nm, xy, Math.min(a.z, c.z), Math.max(a.z, c.z), color));
                }
                else if (v.kind === "bar") {
                    const pr = v.proj, r = 0.6;
                    for (const [px, pz] of v.pts) {
                        const q = L(px, -pr / 2.0, pz);
                        made.push(cylN(ctx, ents, htr, `${nm} - رجل`, q, cm(0.45), cm(pr), color));
                    }
                    if (v.vertical) {
                        const a = L(0, 0, v.cz - v.len / 2.0), c = L(0, 0, v.cz + v.len / 2.0);
                        const xy = circ(12, r).map(([dx, dy]) => { const q = L(v.cx + dx, -pr + r + dy, 0); return { x: q.x, y: q.y }; });
                        made.push(createFlatSlab(ctx, ents, nm, xy, Math.min(a.z, c.z), Math.max(a.z, c.z), color));
                    }
                    else if (f.rot) {
                        // a corner door: the front's x is not the holder's x — a square rod of the same size
                        const a = L(v.cx - v.len / 2.0, -pr, v.cz - r), c = L(v.cx + v.len / 2.0, -pr + 2 * r, v.cz + r);
                        made.push(createBox(ctx, ents, nm, Math.min(a.x, c.x), Math.min(a.y, c.y), Math.min(a.z, c.z), Math.max(a.x, c.x), Math.max(a.y, c.y), Math.max(a.z, c.z), color));
                    }
                    else {
                        const a = L(v.cx - v.len / 2.0, 0, 0), c = L(v.cx + v.len / 2.0, 0, 0);
                        const yz = circ(12, r).map(([dy, dz]) => { const q = L(v.cx, -pr + r + dy, v.cz + dz); return [q.y, q.z]; });
                        made.push(createSlabAlongX(ctx, ents, nm, Math.min(a.x, c.x), Math.max(a.x, c.x), yz, color));
                    }
                }
                else if (v.kind === "knob") {
                    const pr = v.proj, head = Math.min(1.6, pr * 0.6);
                    const [px, pz] = v.pts[0];
                    const h = L(px, -pr + head / 2.0, pz), st = L(px, -(pr - head) / 2.0, pz);
                    made.push(cylN(ctx, ents, htr, nm, h, cm(1.3), cm(head), color));
                    made.push(cylN(ctx, ents, htr, `${nm} - رجل`, st, cm(0.5), cm(pr - head), color));
                }
                for (const inst of made) {
                    inst.setAttribute("KUD", "is_cut_piece", false);
                    inst.setAttribute("KUD", "handle_part", true);
                    inst.layer = ctx.model.layers.get(LAYER) ?? ctx.model.layers.add(LAYER);
                }
                continue;
            }
            const p0 = local(htr, b.x0 + v.x0, fy + v.y0, b.z0 + v.z0);
            const p1 = local(htr, b.x0 + v.x1, fy + v.y1, b.z0 + v.z1);
            const nm = `${f.name} - ${NAMES[v.mat]}`;
            const [x0, x1] = [Math.min(p0.x, p1.x), Math.max(p0.x, p1.x)];
            const [y0, y1] = [Math.min(p0.y, p1.y), Math.max(p0.y, p1.y)];
            const [z0, z1] = [Math.min(p0.z, p1.z), Math.max(p0.z, p1.z)];
            if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4)
                continue;
            const color = v.mat === "wood_strip" ? stripMaterial(ctx, plan) : COLORS[v.mat];
            const inst = createBox(ctx, holder.definition.entities, nm, x0, y0, z0, x1, y1, z1, color);
            const piece = v.mat === "wood_strip";
            inst.setAttribute("KUD", "is_cut_piece", piece);
            inst.setAttribute("KUD", "handle_part", true);
            if (piece)
                assignLayer(ctx, inst, TAGS.front);
            else
                inst.layer = ctx.model.layers.get(LAYER) ?? ctx.model.layers.add(LAYER);
        }
        for (const h of plan.holes) {
            const depth = h.face === "through" ? t : Math.max(toF(h.depth), 0.3);
            const cy = h.face === "back" ? fy + t - depth / 2.0 : fy + t / 2.0;
            const c = local(f.holder_tr, b.x0 + h.x, cy, b.z0 + h.z);
            const m = cylN(ctx, f.holder.definition.entities, f.holder_tr, "خرم مقبض", c, cm(h.d / 2.0), cm(depth + 0.02), KCOLORS.assembly);
            m.setAttribute("KUD", "handle_part", true);
            assignLayer(ctx, m, TAGS.assembly);
        }
    }
    catch (ex) {
        ctx.puts(`[KitchenUnitDesigner] Handles draw warning: ${ex.message}`);
    }
}
function stripMaterial(ctx, plan) {
    const name = plan.pieces[0] ? toS(plan.pieces[0].material) : "";
    const m = name !== "" ? ctx.model.materials.get(name) : undefined;
    return m ?? COLORS.wood_strip;
}
const clean = (n) => toS(n).replace(/^\d{3} - /, "");
function updateLabel(ctx, group, pieces, used, f, plan) {
    try {
        const b = f.box;
        const w = b.x1 - b.x0;
        const h = b.z1 - b.z0;
        const cands = pieces.filter((p) => !used.has(p)).filter((p) => clean(p.name) === clean(f.name));
        let pc;
        let best = Infinity;
        for (const p of cands) {
            const k = Math.abs(toF(p.w) - w) + Math.abs(toF(p.h) - h);
            if (pc === undefined || k < best) {
                best = k;
                pc = p;
            }
        }
        const fr = plan.front;
        const fw = fr.x1 - fr.x0;
        const fh = fr.z1 - fr.z0;
        // v110: a framed glass door has no whole-door label — its handle holes go on the free-side upright stile
        if (!pc && f.kind === "door" && plan.holes.length && (f.hinge === "left" || f.hinge === "right")) {
            const sn = f.hinge === "left" ? "يمين" : "شمال";
            const st = pieces.find((p) => !used.has(p) && clean(p.name) === `${clean(f.name)} - إطار ${sn}`);
            if (st) {
                const sw = Math.min(toF(st.w), toF(st.h)), sx0 = f.hinge === "left" ? fw - sw : 0;
                const holes = plan.holes.filter((hl) => hl.x - fr.x0 >= sx0 - 0.01 && hl.x - fr.x0 <= sx0 + sw + 0.01)
                    .map((hl) => ({ y_ratio: rround((hl.x - fr.x0 - sx0) / sw, 4), z_ratio: rround((hl.z - fr.z0) / fh, 4), d: hl.d }));
                if (holes.length)
                    st.assembly_holes = [...(st.assembly_holes ?? []), ...holes];
                if (plan.notes.length)
                    st.note = [st.note, ...plan.notes].filter((x) => x != null && toS(x) !== "").join(" | ");
            }
        }
        if (pc) {
            used.add(pc);
            if (plan.reduce) {
                if ((pc.hinge_ratios ?? []).length)
                    pc.hinge_ratios = shiftRatios(pc.hinge_ratios, pc.hinge_side, plan.reduce, w, h, fr);
                pc.w = fw;
                pc.h = fh;
            }
            const holes = plan.holes.map((hl) => ({ y_ratio: rround((hl.x - fr.x0) / fw, 4), z_ratio: rround((hl.z - fr.z0) / fh, 4), d: hl.d }));
            if (holes.length)
                pc.assembly_holes = [...(pc.assembly_holes ?? []), ...holes];
            const back = plan.holes.filter((hl) => hl.face === "back").length;
            const extra = [...plan.notes];
            if (back > 0)
                extra.push(`${back} من الأخرام من الضهر (مش نافذة)`);
            if (extra.length)
                pc.note = [pc.note, ...extra].filter((s) => s != null && toS(s) !== "").join(" | ");
        }
        for (const sp of plan.pieces) {
            const label = pc ? pc.unit : group.name;
            ctx.labels.add(group.entityID, label, `${clean(f.name)} - ${sp.suffix}`, cm(sp.w), cm(sp.h), cm(sp.d), {
                material: sp.material, note: sp.note, banded: { ...NO_BAND },
            });
        }
    }
    catch (ex) {
        ctx.puts(`[KitchenUnitDesigner] Handles label warning: ${ex.message}`);
    }
}
