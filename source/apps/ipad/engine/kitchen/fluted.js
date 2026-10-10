// NOVERA v127: fluted (ribbed) fronts — «فلوتد». A plain MDF front with CNC grooves on its face (vertical or horizontal):
// one board per front in the cut list (its note says «فلوتد: مجاري N مم كل M مم عمق D مم», the grooves ride along as
// `flutes` for the CNC export), and in the 3D the face really is ribbed (the board is thinned by the groove depth and
// the ribs between the grooves stand on it). Runs AFTER the handles (a gola / edge pull may have cut the front first),
// on every front facing −y that is one solid board: doors, flip-ups, drawer fronts, the pull-out's front.
// Glass / framed fronts, inner drawer fronts, the kick drawer and fillers are left plain.
// Params (all opt-in, "" = flat front as before):
//   front_style "fluted" · front_flute_dir "v" | "h" · front_flute_groove (cm, the cutter: groove width, default 1.0)
//   front_flute_rib (cm, the flat between two grooves, default 1.5) · front_flute_depth (cm, default 0.4)
//   front_flute_margin (cm, plain border with stopped grooves, default 0 = grooves run through the edges)
//   front_flute_on "all" | "doors" | "drawers"
import { rround } from "../core/rubyMath.js";
import { assignLayer } from "./helpers.js";
import { TAGS } from "./carcass.js";
import { toF, toS } from "./rb.js";
import { cm, Point3d, Transformation, Vector3d } from "./su/geom.js";
import { ComponentInstance, Face, Group } from "./su/model.js";

const isInst = (e) => e instanceof Group || e instanceof ComponentInstance;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const num = (v, d) => { const n = toF(v); return Number.isFinite(n) && n > 0 ? n : d; };

/** the flute settings of a unit, or null when its fronts are flat */
export function fluteCfg(p) {
    if (!p || toS(p["front_style"]) !== "fluted")
        return null;
    const on = toS(p["front_flute_on"]);
    return {
        dir: toS(p["front_flute_dir"]) === "h" ? "h" : "v",
        g: clamp(num(p["front_flute_groove"], 1.0), 0.3, 3.0),
        r: clamp(num(p["front_flute_rib"], 1.5), 0.4, 10.0),
        d: clamp(num(p["front_flute_depth"], 0.4), 0.1, 0.8), // a 1.8 front keeps ≥ 1 cm under the grooves
        m: clamp(toF(p["front_flute_margin"]) || 0, 0, 15.0),
        on: on === "doors" || on === "drawers" ? on : "all",
    };
}

/** groove start positions (cm) across a front of length L: ribs at both ends when there is no border, grooves next to the
 *  border when there is one — the flats between grooves are stretched a little so the pattern ends symmetrically */
export function fluteLayout(L, c) {
    const { g, r, m } = c;
    if (m <= 0) {
        const k = Math.floor((L - r) / (r + g) + 1e-9);
        if (k < 1)
            return [];
        const rr = (L - k * g) / (k + 1);
        return Array.from({ length: k }, (_, i) => rr + i * (rr + g));
    }
    const Li = L - 2 * m;
    const k = Math.floor((Li + r) / (r + g) + 1e-9);
    if (k < 1)
        return [];
    if (k === 1)
        return [m + (Li - g) / 2];
    const rr = (Li - k * g) / (k - 1);
    return Array.from({ length: k }, (_, i) => m + i * (g + rr));
}

/** six faces of a box straight into `ents` (the kernel's pushpull takes a lone face only — the ribs share one definition) */
function addBox(ents, x0, y0, z0, x1, y1, z1, mat) {
    const P = (x, y, z) => ents.vertex(new Point3d(x, y, z));
    const F = (pts, n) => {
        const f = new Face(ents.model, pts, new Vector3d(...n));
        f.material = mat;
        f.backMaterial = mat;
        ents.add(f);
    };
    F([P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), P(x1, y0, z0)], [0, 0, -1]);
    F([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], [0, 0, 1]);
    F([P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], [0, -1, 0]);
    F([P(x0, y1, z0), P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0)], [0, 1, 0]);
    F([P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)], [-1, 0, 0]);
    F([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], [1, 0, 0]);
}

/** the fronts to flute: [piece, kind] — a door that is one board, or a drawer group's own front board */
function collect(ents, tr, out, inDrawer = null) {
    for (const e of ents.list) {
        if (!isInst(e))
            continue;
        const t = tr.mul(e.transformation);
        const isDoor = !!e.getAttribute("KUD", "is_door", false);
        const isDrawer = !!e.getAttribute("KUD", "is_drawer", false);
        if (isDoor) {
            const framed = /زجاج/.test(e.name) || e.definition.entities.list.some((c) => isInst(c) && c.getAttribute("KUD", "is_cut_piece", false));
            if (!framed && e.definition.entities.faces().length)
                out.push([e, t, "door"]);
            continue;
        }
        if (isDrawer) {
            if (/وزرة/.test(e.name) || /داخلي/.test(e.name))
                continue; // the kick drawer stays plain like the plinth; an inner drawer hides behind its big front
            for (const c of e.definition.entities.list)
                if (isInst(c) && c.name === e.name && c.definition.entities.faces().length && c.getAttribute("KUD", "is_cut_piece", false))
                    out.push([c, t.mul(c.transformation), "drawer"]);
            continue;
        }
        collect(e.definition.entities, t, out, inDrawer);
    }
    return out;
}

/** flute one front: thin the board by the groove depth and stand the ribs (and the plain border) on it */
function flute(ctx, piece, c) {
    const es = piece.definition.entities;
    const lb = piece.definition.bounds();
    const x0 = lb.min().x, x1 = lb.max().x, y0 = lb.min().y, y1 = lb.max().y, z0 = lb.min().z, z1 = lb.max().z;
    const tol = cm(0.01);
    const face = es.faces().filter((f) => f.normal().y < -0.9 && f.vertices().every((v) => Math.abs(v.position.y - y0) < tol));
    if (!face.length || y1 - y0 < cm(1.2))
        return null;
    const mat = face[0].material;
    const W = (x1 - x0) / cm(1.0), H = (z1 - z0) / cm(1.0);
    const v = c.dir === "v";
    const across = v ? W : H, run = v ? H : W;
    if (across < 8.0 || run < 8.0 || (c.m > 0 && (across < 2 * c.m + c.g + 2 || run < 2 * c.m + 4)))
        return null;
    const starts = fluteLayout(across, c);
    if (!starts.length)
        return null;
    const d = cm(c.d);
    es.transformEntities(Transformation.translation(new Vector3d(0, d, 0)), face);
    const name = piece.name;
    const def = ctx.model.addDefinition(`${name} - فلوتد`);
    const re = def.entities;
    // ribs = the flats between the grooves (and before the first / after the last one when there is no border)
    const m = cm(c.m), g = cm(c.g);
    const a0 = (v ? x0 : z0), r0 = (v ? z0 : x0) + m, r1 = (v ? z1 : x1) - m;
    const flats = [];
    let at = m;
    for (const s of starts) {
        if (cm(s) - at > cm(0.05))
            flats.push([at, cm(s)]);
        at = cm(s) + g;
    }
    if (c.m <= 0 && cm(across) - at > cm(0.05))
        flats.push([at, cm(across)]);
    for (const [p0, p1] of flats) {
        if (v)
            addBox(re, a0 + p0, y0, r0, a0 + p1, y0 + d, r1, mat); // vertical ribs: across x, running up z
        else
            addBox(re, r0, y0, a0 + p0, r1, y0 + d, a0 + p1, mat); // horizontal ribs: across z, running along x
    }
    if (re.list.length) {
        const inst = es.addInstance(def, new Transformation());
        inst.name = name;
        assignLayer(ctx, inst, TAGS.front);
    }
    if (c.m > 0) {
        // the plain border: two end strips over the whole width, two side strips between them
        const bdef = ctx.model.addDefinition(`${name} - فلوتد برواز`);
        const strips = v
            ? [[x0, z0, x1, z0 + m], [x0, z1 - m, x1, z1]]
            : [[x0, z0, x0 + m, z1], [x1 - m, z0, x1, z1]];
        const sides = v
            ? [[x0, z0 + m, x0 + m, z1 - m], [x1 - m, z0 + m, x1, z1 - m]]
            : [[x0 + m, z0, x1 - m, z0 + m], [x0 + m, z1 - m, x1 - m, z1]];
        // separate definitions so their touching edges never merge
        for (const [i, [sx0, sz0, sx1, sz1]] of [...strips, ...sides].entries()) {
            const sd = i === 0 ? bdef : ctx.model.addDefinition(`${name} - فلوتد برواز ${i + 1}`);
            addBox(sd.entities, sx0, y0, sz0, sx1, y0 + d, sz1, mat);
            const si = es.addInstance(sd, new Transformation());
            si.name = name;
            assignLayer(ctx, si, TAGS.front);
        }
    }
    // the grooves in the board's own frame (label w = x span, h = z span), cm from its left / bottom edge
    const rects = starts.map((s) => (v ? [s, c.m, c.g, H - 2 * c.m] : [c.m, s, W - 2 * c.m, c.g]).map((q) => rround(q, 2)));
    const pitch = starts.length > 1 ? starts[1] - starts[0] : c.g + c.r;
    return { W, H, rects, pitch };
}

/** v127: flute every eligible front of a built kitchen unit (no-op unless params.front_style === "fluted") */
export function applyFlutes(ctx, group, params) {
    const c = fluteCfg(params);
    if (!c)
        return 0;
    const unitId = group.entityID;
    const pieces = ctx.labels.pieces.filter((p) => p.unit_id === unitId);
    const used = new Set();
    let n = 0;
    for (const [piece, t, kind] of collect(group.entities, new Transformation(), [])) {
        if (c.on !== "all" && c.on !== (kind === "door" ? "doors" : "drawers"))
            continue;
        // only fronts that face the room straight (an L / diagonal corner door stays flat)
        const nn = t.applyVector([0, -1, 0]);
        if (!(nn.y < -0.9))
            continue;
        const res = flute(ctx, piece, c);
        if (!res)
            continue;
        n++;
        const lab = pieces.find((p) => !used.has(p) && p.name === piece.name && Math.abs(p.w - res.W) < 0.06 && Math.abs(p.h - res.H) < 0.06)
            ?? pieces.find((p) => !used.has(p) && p.name === piece.name);
        if (!lab)
            continue;
        used.add(lab);
        const mm = (v) => String(rround(v * 10, 1)).replace(/\.0$/, "");
        const where = c.m > 0 ? ` — مجاري موقوفة ${mm(c.m)} مم من الأطراف` : " — من حرف لحرف";
        const note = `فلوتد: ${res.rects.length} مجرى ${mm(c.g)} مم كل ${mm(res.pitch)} مم عمق ${mm(c.d)} مم ${c.dir === "v" ? "رأسي" : "أفقي"}${where} (CNC بسكينة نصف دايرة على وش الضلفة) · MDF يتدهن بعد التفريز — من غير شريط حرف`;
        lab.note = lab.note ? `${lab.note} · ${note}` : note;
        lab.banded = { top: false, bottom: false, left: false, right: false };
        lab.flutes = { dir: c.dir, z: c.d, rects: res.rects };
    }
    if (n)
        group.setAttribute("KUD", "fluted_fronts", n);
    return n;
}
