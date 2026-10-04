// App-facing adapter of the kitchen engine: builds a unit exactly like the plugin and returns
// (1) world-space faces for the 3D view, (2) the cut pieces (the plugin's label data), (3) hardware.
// Coordinates are centimetres, x → right, y → depth (front at 0), z → up — like the other engines.
import { COLORS, DEFAULTS } from "./config.js";
import { adjustForFinish, Ctx, hexToRgb } from "./helpers.js";
import { buildUnit, errorText } from "./index.js";
import { hardwareRows, scanHardware } from "./hardware.js";
import { strip, toS } from "./rb.js";
import { cm, Transformation } from "./su/geom.js";
import { ComponentInstance, Entities, Face, Group } from "./su/model.js";
const in2cm = (v) => v / cm(1.0);
/** a few plugin labels come out with the axes swapped (e.g. the L corner's second-leg door is
 * labelled 1.8 × 58 × 27.8): for the cut list the thickness is always the smallest dimension. */
function sheetDims(w, h, t) {
    if (t <= 2.6 || Math.min(w, h) > 2.6)
        return { w, h, t };
    if (w <= h)
        return { w: t, h, t: w };
    return { w, h: t, t: h };
}
/** the material names the builders give each role (so faces can be mapped back to roles) */
export function materialNames(p) {
    const nm = (k) => strip(toS(p[k]));
    const front = nm("material_front_name") || `KUD_${adjustForFinish(hexToRgb(p["door_color"]), toS(p["door_finish"])).join("_")}`;
    const rgb = (c) => `KUD_${c.join("_")}`;
    return [
        [nm("material_carcass_name") || rgb(COLORS.carcass), "carcass"],
        [nm("fridge_side_material_name") || rgb(COLORS.carcass), "carcass"],
        [front, "front"],
        [nm("material_back_name") || rgb(COLORS.back_panel), "back"],
        [nm("material_countertop_name") || rgb(COLORS.countertop), "countertop"],
        [nm("material_glass_name") || "زجاج", "glass"],
        [nm("material_metal_frame_name") || "برواز ألومنيوم", "frame"],
        ["برواز معدن", "frame"],
        [nm("edge_banding_material_name") || "شريط حواف", "banding"],
        [nm("wardrobe_rail_material_name") || "شماعة معدن", "rail"],
        [rgb(COLORS.led), "led"],
        [rgb(COLORS.groove), "groove"],
        [rgb(COLORS.assembly), "hole"],
        ["KUD_70_72_76", "handle"],
        ["KUD_188_192_198", "handle"],
        ["KUD_92_64_40", "handle"],
        ["KUD_196_160_112", "handle"],
    ];
}
const isInst = (e) => e instanceof Group || e instanceof ComponentInstance;
export function computeKitchen(input, opts = {}) {
    const params = { ...JSON.parse(JSON.stringify(DEFAULTS)), ...JSON.parse(JSON.stringify(input ?? {})) };
    const ctx = new Ctx();
    const res = { ok: false, errors: [], warnings: [], params, meshes: [], movers: [], parts: [], hardware: {}, stats: {}, unit_name: "" };
    let g;
    try {
        g = buildUnit(ctx, params, opts);
    }
    catch (e) {
        res.errors.push(errorText(e).replace(/^[A-Za-z]+Error: /, ""));
        return res;
    }
    res.ok = true;
    res.unit_name = g.name;
    res.warnings = ctx.log.map((l) => l.replace(/^\[KitchenUnitDesigner\]\s*/, "")).filter((l) => l);
    const names = materialNames(params);
    const keyOf = (m) => (m ? names.find(([n]) => n === m.name)?.[1] ?? null : null);
    const nameKey = new Map();
    let mid = 0;
    const num = (e, k) => Number(e.getAttribute("KUD", k, 0)) || 0;
    const pt = (tr, e, k) => {
        const q = tr.applyPoint([num(e, `${k}_x`), num(e, `${k}_y`), num(e, `${k}_z`)]);
        return [in2cm(q.x), in2cm(q.y), in2cm(q.z)];
    };
    const vec = (tr, e, k) => {
        const v = tr.applyVector([num(e, `${k}_x`), num(e, `${k}_y`), num(e, `${k}_z`)]);
        const l = Math.hypot(v.x, v.y, v.z) || 1;
        return [v.x / l, v.y / l, v.z / l];
    };
    const walk = (ents, tr, door, drawer, mover) => {
        for (const e of ents.list) {
            if (!isInst(e))
                continue;
            const t = tr.mul(e.transformation);
            let mv = mover;
            const isDoorHere = !!e.getAttribute("KUD", "is_door", false);
            const isDrawerHere = !!e.getAttribute("KUD", "is_drawer", false);
            const slideM = mv === null && !isDoorHere && !isDrawerHere ? /باب سحاب (\d+)$/.exec(e.name) : null;
            if (slideM) {
                // sliding door: every second panel slides over its neighbour (towards -x)
                const bb = e.definition.entities.bounds();
                const w = in2cm(bb.max().x - bb.min().x);
                const dir = tr.applyVector([-1, 0, 0]);
                const dl = Math.hypot(dir.x, dir.y, dir.z) || 1;
                const i = Number(slideM[1]) - 1;
                res.movers.push({ kind: "slide", name: e.name, hinge: [0, 0, 0], axis: [0, 0, 1], free: [0, 0, 0], normal: [dir.x / dl, dir.y / dl, dir.z / dl], slide: i % 2 === 1 ? w * 0.92 : 0 });
                mv = res.movers.length - 1;
            }
            if (mv === null && (isDoorHere || isDrawerHere)) {
                // hinge data is stored in the coordinates of the door's container (tr)
                const fwd = tr.applyVector([0, -1, 0]);
                const fl = Math.hypot(fwd.x, fwd.y, fwd.z) || 1;
                res.movers.push(isDoorHere
                    ? { kind: "door", name: e.name, hinge: pt(tr, e, "hinge"), axis: vec(tr, e, "axis"), free: pt(tr, e, "free"), normal: vec(tr, e, "normal"), slide: 0 }
                    : { kind: "drawer", name: e.name, hinge: [0, 0, 0], axis: [0, 0, 1], free: [0, 0, 0], normal: [fwd.x / fl, fwd.y / fl, fwd.z / fl], slide: in2cm(num(e, "slide_distance")) });
                mv = res.movers.length - 1;
            }
            const isDoor = door || isDoorHere;
            const isDrawer = drawer || isDrawerHere;
            const faces = e.definition.entities.faces();
            if (faces.length)
                addMesh(e, faces, t, isDoor, isDrawer, mv);
            walk(e.definition.entities, t, isDoor, isDrawer, mv);
        }
    };
    const addMesh = (e, faces, t, door, drawer, mover) => {
        const area = new Map();
        const out = [];
        let lo = [Infinity, Infinity, Infinity];
        let hi = [-Infinity, -Infinity, -Infinity];
        const P = (v) => {
            const q = t.applyPoint(v.position);
            const c = [in2cm(q.x), in2cm(q.y), in2cm(q.z)];
            lo = lo.map((x, i) => Math.min(x, c[i]));
            hi = hi.map((x, i) => Math.max(x, c[i]));
            return c;
        };
        for (const f of faces) {
            const k = keyOf(f.material) ?? "carcass";
            if (k !== "banding" && k !== "led" && k !== "groove")
                area.set(k, (area.get(k) ?? 0) + f.area());
            const n = f.normal().transform(t).normalizeBang();
            out.push({ n: [n.x, n.y, n.z], outer: f.outerVs.map(P), holes: f.innerVss.map((vs) => vs.map(P)), mat: k });
        }
        let main = "carcass";
        let best = -1;
        for (const [k, a] of area)
            if (a > best)
                [main, best] = [k, a];
        if (best < 0)
            main = out[0]?.mat ?? "carcass";
        for (const f of out)
            if (f.mat === "banding")
                f.mat = main;
        if (!nameKey.has(e.name))
            nameKey.set(e.name, main);
        res.meshes.push({
            id: `m${mid++}`, name: e.name, layer: e.layer?.name ?? "", mat: main, door, drawer, mover, faces: out,
            box: { x0: lo[0], x1: hi[0], y0: lo[1], y1: hi[1], z0: lo[2], z1: hi[2] },
        });
    };
    walk(ctx.model.entities, new Transformation(), false, false, null);
    const pieces = ctx.labels.pieces.filter((p) => p.unit_id === g.entityID);
    pieces.forEach((pc, i) => {
        const key = nameKey.get(pc.name) ?? (/زجاج/.test(pc.name) && !/إطار/.test(pc.name) ? "glass" : "carcass");
        res.parts.push({
            id: `k${i}`, name: pc.name, material: key, cut_piece: true,
            label: { ...sheetDims(pc.w, pc.h, pc.d), banded: pc.banded, groove: pc.groove ? { axis: pc.groove_axis ?? "vertical", ratio: pc.groove_ratio ?? 0.5 } : null, led: pc.led ? pc.led_ratio : null },
            holes: pc.assembly_holes.map((h) => ({ kind: h.d >= 1.2 ? "cam" : "dowel", w: h.y_ratio, h: h.z_ratio, d: h.d })),
            door_label: pc.hinge_ratios.length ? { hinge_ratios: pc.hinge_ratios, hinge_side: pc.hinge_side } : null,
            checks: pc.note ? [pc.note] : [],
            material_name: pc.material,
        });
    });
    const stats = scanHardware(ctx, g);
    res.stats = stats;
    for (const row of hardwareRows(stats))
        res.hardware[row.label] = row.qty;
    const hj = g.getAttribute("KUD", "handles_hardware_json", null);
    if (hj)
        for (const [k, v] of Object.entries(JSON.parse(String(hj))))
            res.hardware[k] = (res.hardware[k] ?? 0) + v;
    // NOVERA v56: a wooden pull-out runs on two pairs of full-extension runners (top + bottom), not one
    if (String(params["unit_category"]) === "pullout" && stats.drawers > 0) {
        const L = Math.min(55, Math.max(30, Math.round((Number(params["depth"]) || 58) - 8)));
        delete res.hardware["أزواج سكك أدراج"];
        res.hardware[`مجاري فول إكستنشن ${L} سم للبول أوت (زوج)`] = Math.min(2, Math.max(1, Number(params["pullout_tray_count"]) || 1));
    }
    if (String(params["drawer_turbo"]) === "true" || params["drawer_turbo"] === true) {
        const n = res.hardware["أزواج سكك أدراج"];
        if (n) { delete res.hardware["أزواج سكك أدراج"]; res.hardware["أزواج سكك أدراج جانبية فول إكستنشن (تيربو خشب)"] = n; }
    }
    return res;
}
