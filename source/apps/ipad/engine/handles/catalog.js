// @ts-nocheck — restored from the compiled app build (types to be re-added)
// Port of lib/handles/catalog.rb — the unified handle catalog + per-front planner
// (shared by the kitchen and dressing systems in the plugin). Pure computation only.
import { has, inc, isHash, rs, toF, clamp } from "../core/ruby.js";
import { rround, sum } from "../core/rubyMath.js";
/** NOVERA hinge rule — ONE rule for every engine (kitchen, panel, dressing): by the door's length along its hinge edge
 *  (height for side-hinged doors, width for flip-ups): ≤ 90 → 2, ≤ 160 → 3, ≤ 200 → 4, longer → 5 */
export function hingeCount(len) {
    if (len <= 90)
        return 2;
    if (len <= 160)
        return 3;
    if (len <= 200)
        return 4;
    return 5;
}
export const TYPES = {
    none: { label: "من غير مقبض", group: "بدون", holes: false },
    push: { label: "Push-to-open (تكة ضغط)", group: "بدون", holes: false },
    knob: { label: "زرار (خرم واحد)", group: "بأخرام", holes: true },
    bar: { label: "مقبض بخرمين (عادي / طويل)", group: "بأخرام", holes: true },
    edge_pull: { label: "مقبض حرف (تاب) — براغي من الضهر", group: "على الحرف", holes: true },
    profile: { label: "بروفايل ألومنيوم على الحرف", group: "على الحرف", holes: false },
    builtin_routed: { label: "مقبض بلت إن محفور في الخشب (CNC)", group: "بلت إن", holes: false },
    builtin_strip: { label: "مقبض خشب بلت إن مضاف (شريحة خشب)", group: "بلت إن", holes: false },
    gola: { label: "جولا (قناة ألومنيوم في الهيكل)", group: "بلت إن", holes: false },
};
export const BAR_SPACINGS = [9.6, 12.8, 16.0, 19.2, 22.4, 25.6, 32.0, 44.8, 64.0, 96.0];
export const EDGES = {
    auto: "تلقائي (فوق للأرضي والأدراج، تحت للعلوي، جنب للطويل)",
    top: "الحرف اللي فوق",
    bottom: "الحرف اللي تحت",
    side: "الحرف الحر (عكس المفصلة)",
};
export const DEFAULTS = {
    type: "none",
    spacing: 12.8,
    length: 0.0,
    hole_d: 0.5,
    edge_offset: 3.5,
    door_orientation: "vertical",
    door_height: "auto",
    drawer_position: "center",
    edge: "auto",
    profile_length: "full",
    profile_height: 2.5,
    reduce_front: true,
    strip_depth: 3.0,
    strip_material: "خشب زان",
    routed_height: 3.0,
    routed_depth: 1.2,
    tab_length: 10.0,
    gola_height: 3.5,
    projection: 3.0,
};
export const NUMBERS = {
    spacing: [1.0, 200.0], length: [0.0, 250.0], hole_d: [0.2, 1.5], edge_offset: [0.5, 30.0],
    profile_height: [0.5, 10.0], strip_depth: [0.5, 10.0], routed_height: [0.5, 10.0],
    routed_depth: [0.2, 3.0], tab_length: [2.0, 100.0], gola_height: [1.0, 10.0], projection: [0.5, 10.0],
};
export const NUMBER_LABELS = {
    spacing: "المسافة بين خرمين المقبض", length: "طول المقبض", hole_d: "قطر خرم المقبض",
    edge_offset: "بعد المقبض عن الحرف", profile_height: "ارتفاع البروفايل/شريحة الخشب",
    strip_depth: "عمق شريحة الخشب", routed_height: "عرض حفر المقبض", routed_depth: "عمق حفر المقبض",
    tab_length: "طول مقبض الحرف", gola_height: "فتحة الجولا", projection: "بروز المقبض",
};
export function label(type) {
    return TYPES[rs(type)]?.label ?? rs(type);
}
/** Catalog.num — numbers, or plain numeric strings (Arabic digits / comma ok); else null */
export function num(v) {
    return toF(v);
}
/** Catalog.fmt */
export function fmt(v) {
    const x = rround(Number(v), 2);
    return x === rround(x) ? String(rround(x)) : fFloat(x);
}
function fFloat(x) {
    return Number.isInteger(x) ? `${x}.0` : String(x);
}
/** Strict validation — returns [clean cfg, errors] */
export function normalize(raw) {
    const src = isHash(raw) ? raw : {};
    const cfg = { ...DEFAULTS };
    for (const [k, v] of Object.entries(src))
        if (has(DEFAULTS, k))
            cfg[k] = v;
    const errors = [];
    cfg.type = rs(cfg.type);
    if (!has(TYPES, cfg.type))
        errors.push(`نوع المقبض '${cfg.type}' مش معروف.`);
    for (const [k, [lo, hi]] of Object.entries(NUMBERS)) {
        let v = num(cfg[k]);
        if (v === null) {
            errors.push(`${NUMBER_LABELS[k]} لازم يكون رقم.`);
            v = DEFAULTS[k];
        }
        else if (v < lo || v > hi) {
            errors.push(`${NUMBER_LABELS[k]} لازم يكون بين ${fmt(lo)} و ${fmt(hi)} سم.`);
        }
        cfg[k] = v;
    }
    const dh = rsFloat(cfg.door_height).trim();
    let v;
    if (dh === "auto" || dh === "center")
        cfg.door_height = dh;
    else if ((v = num(dh)) !== null)
        cfg.door_height = v;
    else {
        errors.push("ارتفاع مقبض الضلف لازم يكون رقم أو center أو auto.");
        cfg.door_height = "auto";
    }
    const pl = rsFloat(cfg.profile_length).trim();
    if (pl === "full" || pl === "")
        cfg.profile_length = "full";
    else if ((v = num(pl)) !== null && v > 0)
        cfg.profile_length = v;
    else {
        errors.push("طول البروفايل لازم يكون full أو رقم أكبر من صفر.");
        cfg.profile_length = "full";
    }
    if (!["vertical", "horizontal"].includes(rs(cfg.door_orientation)))
        cfg.door_orientation = "vertical";
    if (!["center", "top"].includes(rs(cfg.drawer_position)))
        cfg.drawer_position = "center";
    if (!has(EDGES, rs(cfg.edge)))
        cfg.edge = "auto";
    cfg.reduce_front = !(cfg.reduce_front === false || rs(cfg.reduce_front) === "false");
    cfg.strip_material = rs(cfg.strip_material).trim();
    if (cfg.strip_material === "")
        cfg.strip_material = DEFAULTS.strip_material;
    return [cfg, errors];
}
/**
 * #to_s of a value that may be a Ruby Float. The plugin's default door_height is 100.0 (Float);
 * its to_s is "100.0", which Catalog.num still parses to 100.0 — so integer-valued numbers can
 * safely go through String(). Kept as a named helper to document the Float#to_s spot.
 */
function rsFloat(v) {
    return rs(v);
}
export function compute(front, cfg) {
    return new Plan(front, cfg).run();
}
const EDGE_NAMES = {
    top: "الحرف اللي فوق", bottom: "الحرف اللي تحت", left: "الحرف الشمال", right: "الحرف اليمين",
};
export class Plan {
    f;
    c;
    w;
    h;
    t;
    out;
    constructor(front, cfg) {
        this.f = front;
        this.c = cfg;
        this.w = Number(front.w ?? 0);
        this.h = Number(front.h ?? 0);
        this.t = Number(front.t ?? 0);
        this.out = {
            type: cfg.type, edge: null, front: { x0: 0.0, x1: this.w, z0: 0.0, z1: this.h }, reduce: null,
            holes: [], visuals: [], pieces: [], hardware: {}, notes: [], warnings: [],
        };
    }
    run() {
        const type = this.c.type;
        if (type === "none")
            return this.out;
        if (this.w <= 0 || this.h <= 0) {
            this.out.warnings.push("مقاس الوش غلط — المقبض اتلغى.");
            return this.out;
        }
        if (this.f.framed && !["knob", "bar", "push"].includes(type) && !(type === "gola" && Number(this.f.existing_recess ?? 0) > 0)) {
            this.out.warnings.push(`${label(type)} مش بيتركب على ضلف الفريم/الزجاج — الضلفة دي اتسابت من غير مقبض.`);
            return this.out;
        }
        switch (type) {
            case "push":
                this.push();
                break;
            case "knob":
            case "bar":
                this.holesHandle();
                break;
            case "edge_pull":
                this.edgePull();
                break;
            case "profile":
                this.profile();
                break;
            case "builtin_routed":
                this.routed();
                break;
            case "builtin_strip":
                this.strip();
                break;
            case "gola":
                this.gola();
                break;
        }
        return this.out;
    }
    door() { return this.f.kind === "door"; }
    flip() { return this.f.hinge === "top"; }
    unitType() { return rs(this.f.unit_type ?? "base"); }
    freeSide() { return this.f.hinge === "left" ? "right" : "left"; }
    edge() {
        let e = this.c.edge;
        if (e === "auto") {
            if (!this.door())
                e = "top";
            else if (this.flip())
                e = "bottom";
            else if (this.unitType() === "wall")
                e = "bottom";
            else if (this.unitType() === "tall")
                e = "side";
            else
                e = "top";
        }
        if (e === "side") {
            if (!this.door() || this.flip()) {
                this.out.warnings.push(`الحرف الجانبي مالوش معنى في ${this.door() ? "الضلف القلاب" : "الأدراج"} — اتركب فوق.`);
                return this.door() ? "bottom" : "top";
            }
            return this.freeSide();
        }
        return e;
    }
    edgeLen(e) { return e === "top" || e === "bottom" ? this.w : this.h; }
    runLen(e) {
        const full = this.edgeLen(e);
        const pl = this.c.profile_length;
        return pl === "full" ? full : Math.min(Number(pl), full);
    }
    band(e, s0, s1, d0, d1) {
        switch (e) {
            case "top": return { x0: s0, x1: s1, z0: this.h - d1, z1: this.h - d0 };
            case "bottom": return { x0: s0, x1: s1, z0: d0, z1: d1 };
            case "left": return { x0: d0, x1: d1, z0: s0, z1: s1 };
            default: return { x0: this.w - d1, x1: this.w - d0, z0: s0, z1: s1 };
        }
    }
    centeredRun(e, len) {
        const full = this.edgeLen(e);
        let s0;
        if (e === "left" || e === "right") {
            const zc = this.handleCenterZ(len);
            s0 = clampRuby(zc - len / 2.0, 0.0, full - len);
        }
        else {
            s0 = (full - len) / 2.0;
        }
        return [s0, s0 + len];
    }
    reduce(e, amount) {
        const fr = this.out.front;
        switch (e) {
            case "top":
                fr.z1 -= amount;
                break;
            case "bottom":
                fr.z0 += amount;
                break;
            case "left":
                fr.x0 += amount;
                break;
            default: fr.x1 -= amount;
        }
        if (fr.x1 - fr.x0 < 5.0 || fr.z1 - fr.z0 < 5.0) {
            this.out.warnings.push(`الوش صغير جداً على ${fmt(amount)} سم خصم — المقبض اتلغى.`);
            this.out.front = { x0: 0.0, x1: this.w, z0: 0.0, z1: this.h };
            return false;
        }
        this.out.reduce = { edge: e, amount };
        return true;
    }
    /** a profiled visual running along edge e from s0 to s1; pts = [[y, n]] with n measured inward from the edge (negative = beyond it) */
    edgeSection(e, s0, s1, pts, mat, name) {
        const across = (n) => (e === "top" ? this.h - n : e === "bottom" ? n : e === "left" ? n : this.w - n);
        const run = e === "top" || e === "bottom" ? "x" : "z";
        const sec = pts.map(([y, n]) => [rround(y, 3), rround(across(n), 3)]);
        const ys = sec.map((q) => q[0]), cs = sec.map((q) => q[1]);
        const r = run === "x" ? { x0: s0, x1: s1, z0: Math.min(...cs), z1: Math.max(...cs) } : { x0: Math.min(...cs), x1: Math.max(...cs), z0: s0, z1: s1 };
        this.out.visuals.push({ ...r, y0: Math.min(...ys), y1: Math.max(...ys), mat, attach: "front", run, section: sec, name });
    }
    visual(rect, y0, y1, mat, attach = "front") {
        this.out.visuals.push({ ...rect, y0, y1, mat, attach });
    }
    hole(x, z, d, face, depth = null) {
        this.out.holes.push({ x: rround(x, 3), z: rround(z, 3), d, face, depth });
    }
    handleCenterZ(span) {
        const dh = this.c.door_height;
        const fw0 = this.f.framed ? Number(this.f.frame_w ?? 0) : 0;
        const off = fw0 > 0 ? fw0 / 2.0 : this.c.edge_offset;
        let z;
        if (dh === "center")
            z = this.h / 2.0;
        else if (typeof dh === "number")
            z = dh - Number(this.f.z_base ?? 0);
        else if (this.unitType() === "wall")
            z = off + span / 2.0;
        else if (this.unitType() === "tall")
            z = 100.0 - Number(this.f.z_base ?? 0);
        else
            z = this.h - off - span / 2.0;
        const lo = off + span / 2.0;
        const hi = this.h - off - span / 2.0;
        return lo <= hi ? clamp(z, lo, hi) : this.h / 2.0;
    }
    push() {
        inc(this.out.hardware, "تكة Push-to-open", 1);
        this.out.notes.push(this.door() ? "Push-to-open: مفصلات من غير سوستة أو تكة ضغط" : "Push-to-open: محتاج مجاري Push للأدراج");
    }
    holesHandle() {
        const c = this.c;
        const bar = c.type === "bar";
        const sp = bar ? c.spacing : 0.0;
        // v113: on a framed (glass / mirror / panel-in-frame) door the handle goes on the middle of the frame member, never on the glass
        const fw = this.f.framed ? Number(this.f.frame_w ?? 0) : 0;
        // (a knob wider than a slim aluminium frame keeps its edge flush with the door edge)
        const off = fw > 0 ? Math.max(fw / 2.0, (bar ? 1.2 : 2.4) / 2.0 + 0.1) : c.edge_offset;
        let vertical = this.door() && !this.flip() && c.door_orientation === "vertical";
        let short = false;
        if (vertical && bar && this.h < sp + 2 * off && this.w >= sp + 2 * off) {
            vertical = false;
            short = true;
        }
        const spanLen = vertical ? this.h : this.w;
        if (bar && spanLen < sp + 2 * off) {
            this.out.warnings.push(`المقبض (${fmt(sp * 10)} مم) أكبر من ${this.door() ? "الضلفة" : "وش الدرج"} (${fmt(spanLen)} سم) — اتلغى.`);
            return;
        }
        let pts;
        if (vertical) {
            const x = this.f.hinge === "left" ? this.w - off : off;
            const zc = this.handleCenterZ(sp);
            pts = sp > 0 ? [[x, zc - sp / 2.0], [x, zc + sp / 2.0]] : [[x, zc]];
        }
        else {
            let xc;
            let zc;
            if (short) {
                xc = this.w / 2.0;
                zc = this.h / 2.0;
            }
            else if (this.door() && !this.flip()) {
                zc = this.unitType() === "wall" ? off : this.unitType() === "tall" ? this.handleCenterZ(0.0) : this.h - off;
                xc = this.f.hinge === "left" ? this.w - off - sp / 2.0 : off + sp / 2.0;
            }
            else {
                xc = this.w / 2.0;
                zc = this.door() ? off : c.drawer_position === "top" ? this.h - off : this.h / 2.0;
            }
            pts = sp > 0 ? [[xc - sp / 2.0, zc], [xc + sp / 2.0, zc]] : [[xc, zc]];
        }
        for (const [px, pz] of pts)
            this.hole(px, pz, c.hole_d, "through");
        const len = bar ? (c.length > 0 ? Math.max(c.length, sp + 1.0) : sp + 2.0) : 2.4;
        const th = bar ? 1.2 : 2.4;
        const cx = sum(pts.map((p) => p[0])) / pts.length;
        const cz = sum(pts.map((p) => p[1])) / pts.length;
        const rect = vertical
            ? { x0: cx - th / 2.0, x1: cx + th / 2.0, z0: cz - len / 2.0, z1: cz + len / 2.0 }
            : { x0: cx - len / 2.0, x1: cx + len / 2.0, z0: cz - th / 2.0, z1: cz + th / 2.0 };
        this.out.visuals.push({ ...rect, y0: -c.projection, y1: 0.0, mat: "handle", attach: "front", kind: bar ? "bar" : "knob",
            pts: pts.map(([px, pz]) => [rround(px, 3), rround(pz, 3)]), vertical, len, cx, cz, proj: c.projection });
        const name = bar
            ? `مقبض ${fmt(sp * 10)} مم${c.length > sp + 2.0 ? ` (طول ${fmt(c.length)} سم)` : ""}`
            : "زرار مقبض";
        inc(this.out.hardware, name, 1);
        this.out.notes.push(`مقبض: ${pts.length} خرم ⌀${fmt(c.hole_d * 10)} مم نافذ`);
    }
    edgePull() {
        const e = this.edge();
        const len = Math.min(this.c.tab_length, this.edgeLen(e) - 2.0);
        if (len < 2.0) {
            this.out.warnings.push("مقبض الحرف أطول من الحرف نفسه — اتلغى.");
            return;
        }
        const [s0, s1] = this.centeredRun(e, len);
        for (const s of [s0 + 1.5, s1 - 1.5]) {
            const r = this.band(e, s, s, 1.5, 1.5);
            this.hole(r.x0, r.z0, 0.35, "back", Math.max(this.t - 0.4, 0.5));
        }
        const t = this.t;
        this.edgeSection(e, s0, s1, [[t + 0.2, 2.0], [t + 0.2, -0.2], [-0.4, -0.2], [-0.4, 1.0], [-0.2, 1.0], [-0.2, 0.0], [t, 0.0], [t, 2.0]], "handle", "مقبض حرف");
        inc(this.out.hardware, `مقبض حرف (تاب) ${fmt(len)} سم`, 1);
        this.out.notes.push(`مقبض حرف على ${EDGE_NAMES[e]} — 2 مسمار من الضهر`);
        this.out.edge = e;
    }
    profile() {
        const e = this.edge();
        const ph = this.c.profile_height;
        const len = this.runLen(e);
        const [s0, s1] = this.centeredRun(e, len);
        if (this.c.reduce_front) {
            if (!this.reduce(e, ph))
                return;
            const t = this.t, m = t / 2.0;
            this.edgeSection(e, s0, s1, [[0, ph], [0, 0], [t, 0], [t, 1.4], [t - 0.2, 1.4], [t - 0.2, 0.2], [0.2, 0.2], [0.2, ph - 0.2], [m + 0.1, ph - 0.2], [m + 0.1, ph + 0.8], [m - 0.1, ph + 0.8], [m - 0.1, ph]], "profile", "بروفايل مقبض");
            this.out.notes.push(`بروفايل ألومنيوم على ${EDGE_NAMES[e]} بطول ${fmt(len)} سم — الوش اتخصم ${fmt(ph)} سم`);
        }
        else {
            this.edgeSection(e, s0, s1, [[0, 0.2], [-1.2, 0.2], [-1.2, ph], [-1.0, ph], [-1.0, 0.4], [-0.2, 0.4], [-0.2, ph * 0.6], [0, ph * 0.6]], "profile", "بروفايل مقبض");
            const n = Math.max(Math.ceil(len / 30.0) + 1, 2);
            const step = (len - 10.0) / (n - 1);
            for (let i = 0; i < n; i++) {
                const r = this.band(e, s0 + 5.0 + step * i, s0 + 5.0 + step * i, ph / 2.0, ph / 2.0);
                this.hole(r.x0, r.z0, 0.35, "back", Math.max(this.t - 0.4, 0.5));
            }
            this.out.notes.push(`بروفايل ألومنيوم متركب على الوش (${EDGE_NAMES[e]}) — ${n} مسمار من الضهر`);
        }
        inc(this.out.hardware, "بروفايل مقبض ألومنيوم (متر طولي)", rround(len / 100.0, 3));
        this.out.edge = e;
    }
    routed() {
        const e = this.edge();
        const rh = this.c.routed_height;
        const rd = Math.min(this.c.routed_depth, this.t - 0.4);
        if (rd <= 0.1) {
            this.out.warnings.push("سمك الضلفة مايكفيش حفر مقبض — اتلغى.");
            return;
        }
        const len = this.runLen(e);
        const [s0, s1] = this.centeredRun(e, len);
        this.visual(this.band(e, s0, s1, 0.0, rh), this.t - rd, this.t + 0.05, "routed");
        inc(this.out.hardware, "حفر مقبض بلت إن (CNC)", 1);
        this.out.notes.push(`حفر CNC مقبض بلت إن من الضهر على ${EDGE_NAMES[e]}: طول ${fmt(len)} × عرض ${fmt(rh)} × عمق ${fmt(rd)} سم`);
        this.out.edge = e;
    }
    strip() {
        const e = this.edge();
        const ph = this.c.profile_height;
        if (!this.reduce(e, ph))
            return;
        const len = this.edgeLen(e);
        const r = this.band(e, 0.0, len, 0.0, ph);
        const sd = Math.max(this.c.strip_depth, this.t);
        this.visual(r, 0.0, sd, "wood_strip");
        this.out.pieces.push({
            suffix: "مقبض خشب", w: len, h: ph, d: sd, material: this.c.strip_material, rect: r, y0: 0.0, y1: sd,
            note: `مقبض خشب بلت إن — يتلزق ويتبرشم على ${EDGE_NAMES[e]} للوش`,
        });
        inc(this.out.hardware, "مقبض خشب بلت إن (متر طولي)", rround(len / 100.0, 3));
        this.out.notes.push(`شريحة خشب ${this.c.strip_material} على ${EDGE_NAMES[e]} — الوش اتخصم ${fmt(ph)} سم`);
        this.out.edge = e;
    }
    /** v106: the built-in aluminium handle with its real section — L under the counter (top of the box), C between two fronts,
     *  an upside-down L under a wall unit. Section points are [y, z] in cm: y from the front face (+ = into the carcass),
     *  z in the front's own frame; the carcass front plane is at y = t for overlay fronts (0 for inset), the rail sits D behind it. */
    gola() {
        let e = this.c.edge === "auto" ? (this.door() && (this.unitType() === "wall" || this.flip()) ? "bottom" : "top") : this.edge();
        if (e === "left" || e === "right")
            e = "top";
        // NOVERA wall units: the door hangs 2 cm under the box — that IS the handle, no profile
        if (e === "bottom" && this.unitType() === "wall" && Number(this.f.drop ?? 0) >= 1.0) {
            this.out.notes.push(`مقبض: الضلفة نازلة ${fmt(this.f.drop)} سم تحت العلبة (من غير بروفايل)`);
            return;
        }
        const gh = this.c.gola_height;
        const existing = Number(this.f.existing_recess ?? 0);
        // v107: the gap the carcass already left above this front IS the handle gap — never cut the front a second time
        if (existing >= gh - 0.31) {
            this.out.notes.push(`مقبض بلت إن في الفتحة الموجودة (${fmt(existing)} سم)`);
        }
        else {
            if (!this.reduce(e, gh - Math.max(existing, 0)))
                return;
            this.out.notes.push(`مقبض بلت إن على ${EDGE_NAMES[e]} — الوش اتخصم ${fmt(gh - Math.max(existing, 0))} سم`);
        }
        const fr = this.out.front;
        const num = (k) => (this.f[k] === null || this.f[k] === undefined || !Number.isFinite(Number(this.f[k])) ? null : Number(this.f[k]));
        const ceil = num("ceil"), nextZ0 = num("next_z0"), boxTop = num("box_top"), nextBox = num("next_box_z0");
        const yc = this.f.overlay === false ? 0.0 : this.t, D = Number(this.f.rail_d ?? 2.5) || 2.5, a = 0.2, lip = 0.6;
        let kind, pts;
        if (e === "bottom") {
            // upside-down L under a wall unit / a flap: plate under the box bottom + wall up behind the door
            kind = "L";
            const zt = fr.z0, zb = fr.z0 - Math.max(gh, existing);
            pts = [[yc, zb], [yc + D, zb], [yc + D, zt + 1.0], [yc + D - a, zt + 1.0], [yc + D - a, zb + a], [yc + a, zb + a], [yc + a, zb + lip], [yc, zb + lip]];
        }
        else if (this.f.is_top || nextZ0 === null) {
            // L under the counter / a board: the plate closes the top of the gap, the wall goes down behind the front (above its drawer box)
            kind = "L";
            const zt = ceil ?? fr.z1 + Math.max(gh, existing) + 0.3;
            let zb = fr.z1 - 1.0;
            if (boxTop !== null)
                zb = Math.min(Math.max(zb, boxTop + 0.1), fr.z1 - 0.2);
            pts = [[yc, zt], [yc + D, zt], [yc + D, zb], [yc + D - a, zb], [yc + D - a, zt - a], [yc + a, zt - a], [yc + a, zt - lip], [yc, zt - lip]];
        }
        else {
            // C between two fronts, open to the front: the lower plate tucks behind this front's top, the upper plate sits level with the
            // next front's bottom edge (the drawer box above stands on it, nothing goes into it)
            kind = "C";
            let zb = fr.z1 - 0.6;
            if (boxTop !== null)
                zb = Math.min(Math.max(zb, boxTop + 0.1), fr.z1 - 0.2);
            const zt = Math.max(Math.min(nextZ0, nextBox ?? Infinity) - 0.05, fr.z1 + 1.0);
            pts = [[yc, zt], [yc + D, zt], [yc + D, zb], [yc, zb], [yc, zb + a], [yc + D - a, zb + a], [yc + D - a, zt - a], [yc, zt - a]];
        }
        const zs = pts.map((q) => q[1]);
        this.out.visuals.push({ x0: -0.15, x1: this.w + 0.15, z0: Math.min(...zs), z1: Math.max(...zs), y0: yc, y1: yc + D, mat: "gola", attach: "carcass", run: "x", section: pts.map(([y, z]) => [rround(y, 3), rround(z, 3)]), name: kind === "L" ? "بروفايل مقبض L" : "بروفايل مقبض C" });
        inc(this.out.hardware, `بروفايل مقبض بلت إن ${kind === "L" ? "L (فوق)" : "C (بين وشين)"} (متر طولي)`, rround((this.w + 0.3) / 100.0, 3));
        this.out.edge = e;
    }
}
/** Comparable#clamp (raises in Ruby when lo > hi — unreachable from the callers) */
function clampRuby(v, lo, hi) {
    if (lo > hi)
        throw new Error("min argument must be less than or equal to max argument");
    return clamp(v, lo, hi);
}
