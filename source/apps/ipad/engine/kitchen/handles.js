// Port of lib/handles/kitchen.rb — fits the unified handle system onto a built kitchen unit
// (runs after the builder, exactly like the plugin's BuilderFactory hook).
import { rround } from "../core/rubyMath.js";
import * as Catalog from "../handles/catalog.js";
import { COLORS as KCOLORS } from "./config.js";
import { assignLayer, createBox, createHoleMarkerY, NO_BAND } from "./helpers.js";
import { TAGS } from "./carcass.js";
import { fs, toF, toS } from "./rb.js";
import { BoundingBox, cm, Point3d, Transformation, Vector3d } from "./su/geom.js";
import { ComponentInstance, Entities, Face, Group } from "./su/model.js";
export const PARAM_KEY = "kud_handles";
export const LAYER = "Kitchen - Handles";
const COLORS = { handle: [70, 72, 76], profile: [188, 192, 198], routed: [92, 64, 40], wood_strip: [196, 160, 112] };
const SKIP_CATEGORIES = ["bed"];
const isHash = (v) => !!v && typeof v === "object" && !Array.isArray(v);
/** Handles.effective_cfg — the unit's own settings (params.kud_handles), else the app default */
export function effectiveCfg(params, appDefault = null) {
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
            if (!(toF(attr(e, "normal_y", 0)) < -0.5))
                continue;
            const hinge = Math.abs(toF(attr(e, "axis_x", 0))) > 0.5 ? "top" : toF(attr(e, "hinge_x", 0)) < toF(attr(e, "free_x", 0)) ? "left" : "right";
            const framed = e.name.includes("زجاج") || e.definition.entities.list.some((c) => isInst(c) && attr(c, "is_cut_piece", false));
            out.push({ kind: "door", hinge, piece: e, piece_tr: t, holder: e, holder_tr: t, framed, name: e.name, parent_ents: entities });
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
    const fronts = collectFronts(group.entities, new Transformation(), []);
    for (const f of fronts)
        f.box = boxIn(f.piece, f.piece_tr);
    const topZ = Math.max(...fronts.map((f) => f.box.z1));
    const recess = unitType === "base" ? toF(params["door_handle_recess"]) : 0.0;
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
        const front = {
            w: b.x1 - b.x0, h: b.z1 - b.z0, t: b.y1 - b.y0, kind: f.kind, hinge: f.hinge, unit_type: unitType,
            z_base: b.z0 - unitZ0, framed: f.framed, existing_recess: recess > 0 && Math.abs(b.z1 - topZ) < 1.0 ? recess : 0.0,
        };
        const plan = Catalog.compute(front, isKick && kcfg ? kcfg : cfg);
        for (const w of plan.warnings)
            warnings.push(`${f.name}: ${w}`);
        for (const [k, v] of Object.entries(plan.hardware))
            hardware[k] = rround((hardware[k] ?? 0) + v, 3);
        if (!plan.holes.length && !plan.visuals.length && !plan.pieces.length && plan.reduce == null)
            continue;
        if (plan.reduce)
            reshape(ctx, f, plan);
        draw(ctx, group, f, plan);
        updateLabel(ctx, group, pieces, used, f, plan);
    }
    const uniq = [...new Set(warnings)];
    group.setAttribute("KUD", "handles_cfg_json", rubyJson(cfg, () => true));
    group.setAttribute("KUD", "handles_hardware_json", rubyJson(hardware, (k) => k.includes("(متر طولي)")));
    group.setAttribute("KUD", "handles_warnings", uniq.join("\n"));
    if (uniq.length)
        ctx.puts(`[KitchenUnitDesigner] Handles: ${uniq.join(" | ")}`);
    return { fronts: fronts.length, hardware, warnings: uniq };
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
const NAMES = { handle: "مقبض", profile: "بروفايل مقبض", routed: "حفر مقبض", wood_strip: "مقبض خشب" };
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
            const m = createHoleMarkerY(ctx, f.holder.definition.entities, "خرم مقبض", c.x, c.y, c.z, cm(h.d / 2.0), cm(depth + 0.02), KCOLORS.assembly);
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
