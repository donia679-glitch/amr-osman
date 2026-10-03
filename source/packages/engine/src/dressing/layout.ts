// @ts-nocheck — restored from the compiled app build (types to be re-added)
// Port of lib/dressing_system/layout.rb — the dressing "brain": computes every part with its exact
// size/position (cm) without drawing anything. compute(params) ->
//   { ok, errors, warnings, parts, groups, drawers, summary, params }
// Axes: X = width (0 = left edge), Y = depth (0 = front, D = back), Z = height (0 = floor).
// Overlay doors sit in front of the unit: Y from -door thickness to 0.
import { inc } from "../core/ruby.ts";
import { rround, minBy, sum } from "../core/rubyMath.ts";
import * as Schema from "./schema.ts";
import * as Handles from "../handles/catalog.ts";
export const EPS = 0.01;
export const MIN_SPACE = 5.0;
export function compute(raw) {
    let params = null;
    try {
        const [p, errors] = Schema.normalize(raw);
        params = p;
        if (errors.length)
            return failure(p, errors);
        const engine = new Engine(p);
        engine.run();
        if (engine.errors.length)
            return failure(p, engine.errors, engine.warnings);
        return {
            ok: true,
            errors: [],
            warnings: engine.warnings,
            parts: engine.parts,
            groups: engine.drawer_groups,
            drawers: engine.drawer_groups.filter((g) => g.kind === "drawer"),
            summary: engine.summary,
            params: p,
        };
    }
    catch (e) {
        return failure(params ?? {}, [`خطأ داخلي غير متوقع في الحسابات: ${e.message}`]);
    }
}
export function failure(params, errors, warnings = []) {
    return { ok: false, errors, warnings, parts: [], drawers: [], summary: {}, params };
}
/** Rectangle a0..a1 × b0..b1 with a groove on face b0/b1 (depth), spanning s0..s1 along a. */
export function notchedRect(a0, a1, b0, b1, face, depth, s0, s1) {
    s0 = Math.min(Math.max(s0, a0), a1);
    s1 = Math.min(Math.max(s1, a0), a1);
    let pts;
    if (depth <= EPS || s1 - s0 <= EPS) {
        pts = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
    }
    else if (face === "b1") {
        const n = b1 - depth;
        pts = [[a0, b0], [a1, b0], [a1, b1], [s1, b1], [s1, n], [s0, n], [s0, b1], [a0, b1]];
    }
    else {
        const n = b0 + depth;
        pts = [[a0, b0], [s0, b0], [s0, n], [s1, n], [s1, b0], [a1, b0], [a1, b1], [a0, b1]];
    }
    return cleanPolygon(pts);
}
export function cleanPolygon(input) {
    let pts = input.map(([a, b]) => [rround(a, 6), rround(b, 6)]);
    for (;;) {
        let changed = false;
        const dedup = [];
        for (const p of pts)
            if (!(dedup.length && close(dedup[dedup.length - 1], p)))
                dedup.push(p);
        while (dedup.length > 1 && close(dedup[0], dedup[dedup.length - 1]))
            dedup.pop();
        if (dedup.length !== pts.length)
            changed = true;
        pts = dedup;
        const n = pts.length;
        let idx = -1;
        for (let i = 0; i < n; i++) {
            const p0 = pts[(i - 1 + n) % n];
            const p1 = pts[i];
            const p2 = pts[(i + 1) % n];
            if (Math.abs((p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0])) < 1e-9) {
                idx = i;
                break;
            }
        }
        if (idx >= 0 && pts.length > 3) {
            pts.splice(idx, 1);
            changed = true;
        }
        if (!changed)
            break;
    }
    return pts;
}
function close(p, q) {
    return Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;
}
export function polygonArea(pts) {
    let s = 0.0;
    pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        s += p[0] * q[1] - q[0] * p[1];
    });
    return Math.abs(s) / 2.0;
}
const f = (v) => Schema.fmt(v);
const minus = (all, rem) => all.filter((a) => !rem.includes(a));
const XYZ = ["x", "y", "z"];
export const THROUGH_NOTE = "رف متصل للزاوية العمياء — بيعدّي ورا قايم المفصلات لحد جنب الوحدة (متسند على الجنبين)";
export const THROUGH_CLEARANCE = 0.3;
const HANDLE_VISUAL_MATERIAL = { handle: "handle", profile: "handle_profile", routed: "__hole" };
const HANDLE_VISUAL_NAME = { handle: "مقبض", profile: "بروفايل مقبض", routed: "حفر مقبض" };
const AXIS_ENDS = { x: ["left", "right"], y: ["front", "back"], z: ["bottom", "top"] };
const LED_TOL = 0.05;
const JOINT_ROLES = ["side", "horizontal", "divider", "fixed_shelf"];
export class Engine {
    errors = [];
    warnings = [];
    parts = [];
    drawer_groups = [];
    summary = {};
    p;
    nextId = 0;
    sections = [];
    facade = [];
    facadeRows = null;
    hingeSides = null;
    doorSeq = 0;
    handleHw = null;
    ledHw = null;
    ledRuns = 0;
    plinthHw = null;
    plinthLegs = null;
    constructor(params) {
        this.p = params;
    }
    // ---------------------------------------------------------- readers
    get w() { return this.p.width; }
    get h() { return this.p.height - this.ph; }
    get totalH() { return this.p.height; }
    get plinth() { return this.p.plinth ?? {}; }
    get ph() { return this.plinth.enabled ? Number(this.plinth.height) : 0.0; }
    get d() { return this.p.depth; }
    get t() { return this.p.panel_t; }
    get dt() { return this.p.divider_t; }
    get st() { return this.p.fixed_shelf_t; }
    get back() { return this.p.back; }
    get doors() { return this.p.doors; }
    get dr() { return this.p.drawers; }
    get shelvesCfg() { return this.p.shelves; }
    get railCfg() { return this.p.rail; }
    get banding() { return this.p.edge_banding; }
    get inset() { return this.doors.mode === "inset"; }
    get ft() { return this.doors.thickness; }
    get sidesOuter() { return this.p.construction === "sides_outer"; }
    get whole() { return this.doors.layout === "whole" || this.sliding; }
    /** v190: sliding doors across the whole front (2–4 panels on two tracks) */
    get sliding() { return this.doors.layout === "sliding"; }
    get slidingN() { return Math.min(Math.max(Math.round(Number(this.doors.sliding_panels) || 2), 2), 4); }
    /** both tracks + 0.6 between them: what the inside has to keep clear behind inset sliding doors */
    get slidingDepth() { return 2 * this.ft + 0.6; }
    behindFacadeY() {
        if (this.sliding) return this.inset ? this.slidingDepth + this.shelvesCfg.front_setback : 0.0;
        return this.whole && this.inset ? this.ft + this.shelvesCfg.front_setback : 0.0;
    }
    get ix0() { return this.t; }
    get ix1() { return this.w - this.t; }
    get iz0() { return this.t; }
    get iz1() { return this.h - this.t; }
    get gy1() { return this.d - this.back.rear_offset; }
    get gy0() { return this.gy1 - this.back.thickness; }
    get groove() { return this.back.groove_depth; }
    // ---------------------------------------------------------- run
    run() {
        this.validateCarcass();
        if (this.errors.length)
            return;
        this.sections = this.computeSections();
        if (this.errors.length)
            return;
        this.facade = this.whole ? this.computeFacade() : [];
        if (this.errors.length)
            return;
        this.buildCarcass();
        this.buildBack();
        this.buildMainDividers();
        for (const sec of this.sections)
            this.buildSection(sec);
        if (this.whole)
            this.buildFacade();
        this.buildLed();
        if (this.p.assembly.enabled)
            this.buildAssembly();
        if (this.ph > EPS) {
            this.shiftUp(this.ph);
            this.buildPlinth();
        }
        this.checkPartSanity();
        this.buildSummary();
    }
    // ======================================================= basic checks
    validateCarcass() {
        const { w, h, t, d, ph, plinth, groove, dr } = this;
        if (ph > EPS && h < 20.0) {
            this.errors.push(`ارتفاع السكلو (${f(ph)}) كبير على الارتفاع الكلي ${f(this.totalH)} — الهيكل هيبقى ${f(h)} سم بس.`);
            return;
        }
        if (ph > EPS && plinth.setback + plinth.apron_t > d - 10.0) {
            this.errors.push("رجوع وزرة السكلو + سمكها أكبر من عمق الوحدة.");
        }
        if (w - 2 * t < MIN_SPACE) {
            this.errors.push(`العرض الكلي ${f(w)} صغير جداً على سمك خشب ${f(t)} (العرض الداخلي لازم يبقى ${f(MIN_SPACE)} سم على الأقل).`);
        }
        if (h - 2 * t < MIN_SPACE) {
            this.errors.push(`الارتفاع الكلي ${f(h)} صغير جداً على سمك خشب ${f(t)}.`);
        }
        if (groove >= t - EPS) {
            this.errors.push(`عمق مفحار الظهر (${f(groove)}) لازم يكون أقل من سمك الخشب (${f(t)}) — وإلا المفحار هيقطع الخشب.`);
        }
        if (this.gy0 < 10.0) {
            this.errors.push(`العمق الداخلي (من الوش لحد الظهر) = ${f(this.gy0)} سم — صغير جداً. قلّل بعد الظهر عن الورا أو زوّد العمق.`);
        }
        if (groove > t / 2.0 + EPS && groove < t - EPS) {
            this.warnings.push(`عمق مفحار الظهر (${f(groove)}) أكبر من نص سمك الخشب — الحرف الورّاني هيبقى ضعيف.`);
        }
        if (dr.bottom_groove >= dr.box_t - EPS) {
            this.errors.push(`دخول قاعدة الدرج في المفحار (${f(dr.bottom_groove)}) لازم يكون أقل من سمك صندوق الدرج (${f(dr.box_t)}).`);
        }
    }
    // ============================================== sections & compartments
    distribute(values, available, what) {
        const fixed = sum(values.filter((v) => v !== "auto"));
        const autos = values.filter((v) => v === "auto").length;
        if (autos === 0) {
            if (Math.abs(fixed - available) > 0.05) {
                this.errors.push(`${what}: مجموع المقاسات = ${f(fixed)} سم، لازم يساوي ${f(available)} سم بالظبط ` +
                    `(أو خلّي مقاس واحد على الأقل "تلقائي").`);
                return null;
            }
            const out = [...values];
            out[out.length - 1] = out[out.length - 1] + (available - fixed);
            return out;
        }
        const each = (available - fixed) / autos;
        if (each < MIN_SPACE - EPS) {
            this.errors.push(`${what}: المقاسات الثابتة (${f(fixed)} سم) مش سايبة مكان كفاية للمقاسات التلقائية ` +
                `(المتاح ${f(available)} سم — كل تلقائي هيطلع ${f(each)} سم).`);
            return null;
        }
        return values.map((v) => (v === "auto" ? each : v));
    }
    computeSections() {
        const secs = this.p.sections;
        const n = secs.length;
        const availW = (this.ix1 - this.ix0) - (n - 1) * this.dt;
        const widths = this.distribute(secs.map((s) => s.width), availW, `عروض الأقسام (الصافي بعد خصم ${n - 1} قاطوع)`);
        if (!widths)
            return [];
        let x = this.ix0;
        const out = secs.map((sec, si) => {
            const sw = widths[si];
            if (sw < MIN_SPACE - EPS)
                this.errors.push(`قسم ${si + 1}: العرض الصافي ${f(sw)} سم أصغر من ${f(MIN_SPACE)} سم.`);
            const sx0 = x;
            const sx1 = x + sw;
            x = sx1 + this.dt;
            let comps = sec.compartments;
            if (sec.kind === "blind") {
                comps = [{ ...Schema.DEFAULT_COMPARTMENT, height: "auto", content: "empty", door: "none" }];
            }
            const m = comps.length;
            const availH = (this.iz1 - this.iz0) - (m - 1) * this.st;
            const heights = this.distribute(comps.map((c) => c.height), availH, `قسم ${si + 1}: ارتفاعات الفراغات (الصافي بعد خصم ${m - 1} رف ثابت)`);
            if (!heights)
                return null;
            let z = this.iz0;
            const cs = comps.map((c, ci) => {
                const ch = heights[ci];
                if (ch < MIN_SPACE - EPS) {
                    this.errors.push(`قسم ${si + 1} / فراغ ${ci + 1}: الارتفاع الصافي ${f(ch)} سم أصغر من ${f(MIN_SPACE)} سم.`);
                }
                const cz0 = z;
                const cz1 = z + ch;
                z = cz1 + this.st;
                return { ...c, index: ci, z0: cz0, z1: cz1 };
            });
            return {
                index: si, x0: sx0, x1: sx1, compartments: cs,
                first: si === 0, last: si === n - 1,
                blind: sec.kind === "blind", blind_partition: sec.blind_partition ?? null,
                post_depth: sec.post_depth ?? null, blind_front: sec.blind_front ?? null,
                blind_through: sec.blind_through ? true : false,
            };
        });
        return out.filter((s) => s !== null);
    }
    // ================================================================ carcass
    buildCarcass() {
        const { w, h, t, d, groove } = this;
        const gyA = this.gy0;
        const gyB = this.gy1;
        let sideZ0, sideZ1, hx0, hx1, sideBand, horizBand;
        if (this.sidesOuter) {
            sideZ0 = 0.0;
            sideZ1 = h;
            hx0 = t;
            hx1 = w - t;
            sideBand = ["front", "back", "top", "bottom"];
            horizBand = ["front", "back"];
        }
        else {
            sideZ0 = t;
            sideZ1 = h - t;
            hx0 = 0.0;
            hx1 = w;
            sideBand = ["front", "back"];
            horizBand = ["front", "back", "left", "right"];
        }
        const sides = [["جنب شمال", 0.0, t, "b1"], ["جنب يمين", w - t, w, "b0"]];
        for (const [name, x0, x1, face] of sides) {
            const ptsAb = notchedRect(0.0, d, x0, x1, face, groove, gyA, gyB);
            const ptsXy = ptsAb.map(([yy, xx]) => [xx, yy]);
            this.addPart(name, "side", "carcass", this.box(x0, 0.0, sideZ0, x1, d, sideZ1), {
                shape: { type: "profile_z", points: ptsXy, z0: sideZ0, z1: sideZ1 },
                label_axes: ["y", "z"], band: sideBand,
                groove: this.grooveLabel("vertical", (gyA + gyB) / 2.0 / d),
                layer: "carcass",
            });
        }
        const horiz = [["قاعدة", 0.0, t, "b1"], ["رأس", h - t, h, "b0"]];
        for (const [name, z0, z1, face] of horiz) {
            const ptsYz = notchedRect(0.0, d, z0, z1, face, groove, gyA, gyB);
            this.addPart(name, "horizontal", "carcass", this.box(hx0, 0.0, z0, hx1, d, z1), {
                shape: { type: "profile_x", points: ptsYz, x0: hx0, x1: hx1 },
                label_axes: ["x", "y"], band: horizBand,
                groove: this.grooveLabel("horizontal", (gyA + gyB) / 2.0 / d),
                layer: "carcass",
            });
        }
    }
    grooveLabel(axis, ratio) {
        if (this.groove <= EPS)
            return null;
        return { axis, ratio: rround(ratio, 4) };
    }
    buildBack() {
        const g = this.groove;
        this.addPart("ظهر", "back", "back", this.box(this.ix0 - g, this.gy0, this.iz0 - g, this.ix1 + g, this.gy1, this.iz1 + g), {
            label_axes: ["x", "z"], band: [], layer: "back",
        });
    }
    buildMainDividers() {
        const secs = this.sections;
        for (let i = 0; i + 1 < secs.length; i++) {
            const a = secs[i];
            const b = secs[i + 1];
            const x0 = a.x1;
            const x1 = x0 + this.dt;
            const blind = [a, b].find((s) => s.blind);
            const y0 = this.behindFacadeY();
            let y1 = this.gy0;
            let name = `قاطوع رأسي ${i + 1}`;
            let kind = "divider";
            if (blind) {
                kind = "blind_panel";
                if (blind.blind_partition === "post") {
                    name = "قايم مفصلات (زاوية عمياء)";
                    y1 = Math.min(y0 + blind.post_depth, this.gy0);
                    if (y1 - y0 < 5.0 - EPS) {
                        this.errors.push(`قايم المفصلات: العمق المتاح ${f(y1 - y0)} سم صغير جداً.`);
                        continue;
                    }
                }
                else {
                    name = "جنب سد (زاوية عمياء)";
                }
            }
            this.addPart(name, "divider", "divider", this.box(x0, y0, this.iz0, x1, y1, this.iz1), {
                label_axes: ["y", "z"], band: ["front"], layer: "carcass",
                mark: { type: "divider", kind, x_from_left: rround((x0 + x1) / 2.0 - this.ix0, 3) },
            });
        }
    }
    // ================================================================ sections
    buildSection(sec) {
        if (sec.blind) {
            this.buildBlindFront(sec);
            return;
        }
        const si = sec.index;
        const comps = sec.compartments;
        let rows;
        let covered;
        let rowOf;
        if (this.whole) {
            rows = [];
            covered = comps.map((c) => this.facadeCovers(sec, c));
            rowOf = comps.map((c) => c);
        }
        else {
            const r = this.doorRows(sec);
            if (!r)
                return;
            rows = r;
            covered = new Array(comps.length).fill(false);
            rowOf = new Array(comps.length).fill(null);
            for (const row of rows) {
                for (let ci = row.from; ci <= row.to; ci++) {
                    covered[ci] = row.type !== "none";
                    rowOf[ci] = row;
                }
            }
        }
        for (let k = 0; k + 1 < comps.length; k++) {
            const lower = comps[k];
            const internal = rowOf[k] === rowOf[k + 1] && covered[k];
            let y0 = internal && this.inset ? this.ft + this.shelvesCfg.front_setback : 0.0;
            if (this.whole)
                y0 = this.behindFacadeY();
            if (this.gy0 - y0 < MIN_SPACE) {
                this.errors.push(`قسم ${si + 1}: بعد الرف الثابت عن الوش (${f(y0)} سم) كبير على العمق الداخلي ${f(this.gy0)} سم.`);
                continue;
            }
            const z0 = lower.z1;
            const name = `قسم ${si + 1} - رف ثابت ${k + 1}`;
            const [fx0, fx1, fy0] = this.throughExtent(sec, sec.x0, sec.x1, y0);
            this.addPart(name, "fixed_shelf", "fixed_shelf", this.box(fx0, fy0, z0, fx1, this.gy0, z0 + this.st), {
                label_axes: ["x", "y"], band: ["front"], layer: "shelf",
                mark: { type: "shelf", z: rround(z0, 3) },
                note: fx0 !== sec.x0 || fx1 !== sec.x1 ? THROUGH_NOTE : null,
            });
        }
        for (const c of comps) {
            this.hingeSides = this.hingeSidesFor(sec, c, rowOf[c.index]);
            this.buildContent(sec, c, covered[c.index]);
        }
        this.hingeSides = [];
        for (const r of rows)
            if (r.type !== "none")
                this.buildDoorRow(sec, r);
    }
    doorRows(sec) {
        const rows = [];
        for (const c of sec.compartments) {
            if (c.door === "continue") {
                if (rows.length === 0) {
                    this.errors.push(`قسم ${sec.index + 1} / فراغ 1: مينفعش يكون "تكملة" — مفيش فراغ تحته يكمّل ضلفته.`);
                    return null;
                }
                rows[rows.length - 1].to = c.index;
            }
            else {
                const style = c.door_style === "default" ? this.doors.style : c.door_style;
                rows.push({ type: c.door, style, from: c.index, to: c.index });
            }
        }
        return rows;
    }
    baseY(covered) {
        if (this.sliding && this.inset)
            return this.slidingDepth;
        return this.inset && (covered || this.whole) ? this.ft : 0.0;
    }
    /** sliding panels over the whole front: they overlap 2 cm, every other one runs in the second track
     *  (behind it when the doors are inset, in front when overlay) */
    buildSliding() {
        const eg = this.doors.edge_gap, n = this.slidingN, ov = 2.0;
        const [x0, x1] = this.inset ? [this.ix0 + eg, this.ix1 - eg] : [eg, this.w - eg];
        const [z0, z1] = this.inset ? [this.iz0 + eg, this.iz1 - eg] : [eg, this.h - eg];
        const pw = ((x1 - x0) + (n - 1) * ov) / n;
        if (pw < 20.0 || z1 - z0 < 20.0) {
            this.errors.push(`الضلف السحّاب: كل لوح هيبقى ${f(pw)}×${f(z1 - z0)} سم — صغير جداً.`);
            return;
        }
        const style = this.doors.style;
        for (let i = 0; i < n; i++) {
            const px0 = x0 + i * (pw - ov);
            const px1 = Math.min(px0 + pw, x1 + (i === n - 1 ? 0 : ov));
            const track = (this.ft + 0.6) * (i % 2);
            const fy0 = this.inset ? track : -this.ft - track;
            const name = `باب سحاب ${i + 1}`;
            this.doorSeq += 1;
            const key = `door${this.doorSeq}`;
            this.drawer_groups.push({ key, kind: "slide", name, style, hinge_side: null, hinge: null, box: this.box(px0, fy0, z0, px1, fy0 + this.ft, z1), slide: i % 2 === 1 ? (px1 - px0) * 0.92 : 0 });
            this.addPart(name, "sliding_door", style === "mirror_alu" ? "mirror" : "door", this.box(px0, fy0, z0, px1, fy0 + this.ft, z1), {
                label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true,
                layer: "front", group: key, note: "⚠ باب سحّاب — هيتركّب على سكة علوية/سفلية، مش مفصلات",
            });
        }
        this.slidingTrack = rround((x1 - x0) / 100.0, 2);
    }
    // ================================================================ contents
    buildContent(sec, c, covered) {
        switch (c.content) {
            case "shelves":
                this.buildShelves(sec, c, covered, sec.x0, sec.x1, c.shelf_count, "");
                break;
            case "rail":
                this.buildRail(sec, c, covered);
                break;
            case "drawers":
                this.buildDrawers(sec, c, covered);
                break;
            case "dividers":
                this.buildSubDividers(sec, c, covered);
                break;
        }
    }
    hingeSidesFor(sec, c, row) {
        const sides = [];
        if (this.whole) {
            const tol = Math.max(this.t, this.dt) + this.doors.edge_gap + 1.0;
            const leftX = sec.first ? this.t / 2.0 : sec.x0 - this.dt / 2.0;
            const rightX = sec.last ? this.w - this.t / 2.0 : sec.x1 + this.dt / 2.0;
            for (const lf of this.facade) {
                if (lf.hinge === "top")
                    continue;
                if (!(Math.min(c.z1, lf.z1) - Math.max(c.z0, lf.z0) > EPS))
                    continue;
                if (!(Math.min(sec.x1, lf.x1) - Math.max(sec.x0, lf.x0) > EPS))
                    continue;
                const hx = lf.hinge === "left" ? lf.x0 : lf.x1;
                if (Math.abs(hx - leftX) <= tol)
                    sides.push("left");
                if (Math.abs(hx - rightX) <= tol)
                    sides.push("right");
            }
        }
        else if (row) {
            switch (row.type) {
                case "single_left":
                    sides.push("left");
                    break;
                case "single_right":
                    sides.push("right");
                    break;
                case "double":
                    sides.push("left", "right");
                    break;
            }
        }
        return [...new Set(sides)];
    }
    tag(sec, c) {
        return `قسم ${sec.index + 1} - فراغ ${c.index + 1}`;
    }
    buildShelves(sec, c, covered, x0, x1, count, extraTag) {
        if (count <= 0)
            return;
        let through = false;
        if (extraTag === "" && this.throughBlind(sec)) {
            const [nx0, nx1] = this.throughExtent(sec, x0, x1, 0.0);
            through = true;
            x0 = nx0;
            x1 = nx1;
        }
        else if (this.nextToPost(sec) && extraTag === "") {
            this.warnings.push(`${this.tag(sec, c)}: الأرفف ناحية الزاوية العمياء متسندة على القايم من قدام بس — اعمل حامل خلفي، أو فعّل "أرفف متصلة للزاوية"، أو خلّي الفاصل "جنب سد".`);
        }
        const t = this.t;
        const ch = c.z1 - c.z0;
        const space = (ch - count * t) / (count + 1);
        if (space < MIN_SPACE - EPS) {
            this.errors.push(`${this.tag(sec, c)}${extraTag}: ${count} رف مش هيدخلوا في ارتفاع ${f(ch)} سم (المسافة بينهم هتبقى ${f(space)} سم).`);
            return;
        }
        const sg = this.shelvesCfg.side_gap;
        if ((x1 - x0) - 2 * sg < MIN_SPACE) {
            this.errors.push(`${this.tag(sec, c)}${extraTag}: خلوص جوانب الرف (${f(sg)} سم) كبير على عرض ${f(x1 - x0)} سم.`);
            return;
        }
        let y0 = this.baseY(covered) + this.shelvesCfg.front_setback;
        if (through)
            y0 = Math.max(y0, this.postBackY(this.throughBlind(sec)));
        if (this.gy0 - y0 < MIN_SPACE) {
            this.errors.push(`${this.tag(sec, c)}: بعد الرف عن الحرف كبير جداً على العمق المتاح.`);
            return;
        }
        for (let i = 0; i < count; i++) {
            const z0 = c.z0 + space * (i + 1) + t * i;
            const name = `${this.tag(sec, c)}${extraTag} - رف ${i + 1}${through ? " (متصل للزاوية)" : ""}`;
            this.addPart(name, "shelf", "shelf", this.box(x0 + sg, y0, z0, x1 - sg, this.gy0, z0 + t), {
                label_axes: ["x", "y"], band: ["front"], layer: "shelf",
                mark: { type: "shelf", z: rround(z0, 3) }, note: through ? THROUGH_NOTE : null,
            });
            this.addShelfPins(x0, x1, y0, this.gy0, z0);
        }
    }
    addShelfPins(x0, x1, y0, y1, zBottom) {
        const sc = this.shelvesCfg;
        const z = zBottom - sc.pin_d / 2.0 - 0.1;
        const ys = [y0 + sc.pin_setback, y1 - sc.pin_setback];
        const sides = [[x0, "left"], [x1, "right"]];
        for (const [x, side] of sides) {
            const panel = this.parts.find((pt) => (pt.role === "side" || pt.role === "divider") && pt.axes &&
                (side === "left" ? Math.abs(pt.box.x1 - x) < 0.01 : Math.abs(pt.box.x0 - x) < 0.01) &&
                pt.box.z0 <= z && pt.box.z1 >= z);
            if (!panel)
                continue;
            for (const y of ys) {
                if (y < panel.box.y0 || y > panel.box.y1)
                    continue;
                this.attachPointHole(panel, { x, y, z }, sc.pin_d, "pin");
            }
        }
    }
    buildRail(sec, c, covered) {
        const through = this.throughBlind(sec);
        if (this.nextToPost(sec) && !through) {
            this.warnings.push(`${this.tag(sec, c)}: الشماعة ناحية الزاوية العمياء مفيش جنب كامل تتركب عليه — محتاجة حامل من السقف أو خلّي الفاصل "جنب سد".`);
        }
        const rc = this.railCfg;
        const r = rc.diameter / 2.0;
        const ch = c.z1 - c.z0;
        const need = rc.top_offset + r + MIN_SPACE;
        if (ch < need - EPS) {
            this.errors.push(`${this.tag(sec, c)}: ارتفاع الفراغ ${f(ch)} سم صغير على شماعة (محتاج ${f(need)} سم على الأقل).`);
            return;
        }
        const yFront = this.baseY(covered);
        const cy = (yFront + this.gy0) / 2.0;
        const cz = c.z1 - rc.top_offset;
        const [rx0, rx1] = through ? this.throughExtent(sec, sec.x0, sec.x1, 0.0) : [sec.x0, sec.x1];
        if (through && cy - r < this.postBackY(through) - EPS) {
            this.errors.push(`${this.tag(sec, c)}: الشماعة مش هتعدّي ورا قايم المفصلات (القايم عمقه كبير) — قلّل عمق القايم.`);
            return;
        }
        const len = rx1 - rx0;
        if (this.gy0 - yFront < 50.0) {
            this.warnings.push(`${this.tag(sec, c)}: العمق الداخلي للشماعة ${f(this.gy0 - yFront)} سم — أقل من 50 سم، الهدوم مش هتاخد راحتها.`);
        }
        this.addPart(`${this.tag(sec, c)} - شماعة${through ? " (متصلة للزاوية)" : ""}`, "rail", "rail", this.box(rx0, cy - r, cz - r, rx1, cy + r, cz + r), {
            shape: { type: "cylinder_x", cx: (rx0 + rx1) / 2.0, cy, cz, r, length: len },
            label_axes: null, band: [], layer: "shelf", cut_piece: false,
        });
    }
    buildSubDividers(sec, c, covered) {
        const n = c.divider_count;
        const dt = this.dt;
        const sw = sec.x1 - sec.x0;
        const subW = (sw - n * dt) / (n + 1);
        if (subW < MIN_SPACE - EPS) {
            this.errors.push(`${this.tag(sec, c)}: ${n} قاطوع مش هيدخلوا في عرض ${f(sw)} سم (كل خانة هتبقى ${f(subW)} سم).`);
            return;
        }
        const y0 = this.inset && (covered || this.whole) ? this.ft + this.shelvesCfg.front_setback : 0.0;
        let x = sec.x0;
        const spaces = [];
        for (let i = 0; i < n; i++) {
            const sx0 = x;
            const sx1 = x + subW;
            spaces.push([sx0, sx1]);
            const x0 = sx1;
            const x1 = x0 + dt;
            this.addPart(`${this.tag(sec, c)} - قاطوع ${i + 1}`, "divider", "divider", this.box(x0, y0, c.z0, x1, this.gy0, c.z1), {
                label_axes: ["y", "z"], band: ["front"], layer: "carcass",
                mark: { type: "divider", x_from_left: rround((x0 + x1) / 2.0 - this.ix0, 3) },
            });
            x = x1;
        }
        spaces.push([x, sec.x1]);
        if (c.sub_shelf_count <= 0)
            return;
        spaces.forEach(([a, b], j) => {
            this.buildShelves(sec, c, covered, a, b, c.sub_shelf_count, ` - خانة ${j + 1}`);
        });
    }
    // ================================================================ doors
    frontRegion(sec, from, to) {
        const comps = sec.compartments;
        const lo = comps[from];
        const hi = comps[to];
        const g = this.doors.gap;
        const eg = this.doors.edge_gap;
        if (this.inset)
            return [sec.x0 + eg, sec.x1 - eg, lo.z0 + eg, hi.z1 - eg, 0.0, this.ft];
        const left = sec.first ? 0.0 : sec.x0 - this.dt / 2.0;
        const right = sec.last ? this.w : sec.x1 + this.dt / 2.0;
        const bottom = from === 0 ? 0.0 : lo.z0 - this.st / 2.0;
        const top = to === comps.length - 1 ? this.h : hi.z1 + this.st / 2.0;
        const gl = sec.first ? eg : g / 2.0;
        const gr = sec.last ? eg : g / 2.0;
        const gb = from === 0 ? eg : g / 2.0;
        const gt = to === comps.length - 1 ? eg : g / 2.0;
        return [left + gl, right - gr, bottom + gb, top - gt, -this.ft, 0.0];
    }
    buildDoorRow(sec, row) {
        const [x0, x1, z0, z1, fy0, fy1] = this.frontRegion(sec, row.from, row.to);
        const base = `قسم ${sec.index + 1} - `;
        let span = row.from === row.to ? "" : ` (فراغ ${row.from + 1}-${row.to + 1})`;
        if (span === "" && sec.compartments.length > 1)
            span = ` (فراغ ${row.from + 1})`;
        if (x1 - x0 < 10.0 || z1 - z0 < 10.0) {
            const b = base.trim().replace(/-$/, "").trim();
            this.errors.push(`${b}: الضلفة${span} صغيرة جداً (${f(x1 - x0)}×${f(z1 - z0)} سم).`);
            return;
        }
        const g = this.doors.gap;
        switch (row.type) {
            case "single_left":
            case "single_right": {
                const side = row.type === "single_left" ? "left" : "right";
                this.addDoor(`${base}ضلفة${span}`, x0, x1, z0, z1, fy0, fy1, side, row.style);
                if (x1 - x0 > 60.0 + EPS) {
                    this.warnings.push(`${base}ضلفة${span}: عرضها ${f(x1 - x0)} سم — أعرض من 60 سم، الأفضل ضلفتين.`);
                }
                break;
            }
            case "double": {
                const mid = (x0 + x1) / 2.0;
                if (mid - g / 2.0 - x0 < 10.0) {
                    this.errors.push(`${base}ضلفتين${span}: العرض ${f(x1 - x0)} سم صغير على ضلفتين.`);
                    return;
                }
                this.addDoor(`${base}ضلفة شمال${span}`, x0, mid - g / 2.0, z0, z1, fy0, fy1, "left", row.style);
                this.addDoor(`${base}ضلفة يمين${span}`, mid + g / 2.0, x1, z0, z1, fy0, fy1, "right", row.style);
                break;
            }
            case "flip_up":
                this.addDoor(`${base}ضلفة قلاب${span}`, x0, x1, z0, z1, fy0, fy1, "top", row.style);
                break;
        }
    }
    // ======================================================= blind corner
    buildBlindFront(sec) {
        if (!sec.blind_front)
            return;
        const [x0, x1, z0, z1, fy0, fy1] = this.frontRegion(sec, 0, sec.compartments.length - 1);
        if (x1 - x0 < 1.0) {
            this.errors.push(`الزاوية العمياء: عرض اللوح الأمامي ${f(x1 - x0)} سم صغير جداً.`);
            return;
        }
        this.addPart("لوح أعمى (زاوية عمياء)", "blind_front", "door", this.box(x0, fy0, z0, x1, fy1, z1), {
            label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true, layer: "front",
        });
    }
    nextToPost(sec) {
        const i = this.sections.indexOf(sec);
        return [i - 1, i + 1].some((j) => j >= 0 && j < this.sections.length && this.sections[j].blind && this.sections[j].blind_partition === "post");
    }
    throughBlind(sec) {
        const i = this.sections.indexOf(sec);
        for (const j of [i - 1, i + 1]) {
            if (j < 0 || j >= this.sections.length)
                continue;
            const b = this.sections[j];
            if (b.blind && b.blind_partition === "post" && b.blind_through)
                return b;
        }
        return null;
    }
    postBackY(blind) {
        return Math.min(this.behindFacadeY() + blind.post_depth, this.gy0) + THROUGH_CLEARANCE;
    }
    throughExtent(sec, x0, x1, y0) {
        const b = this.throughBlind(sec);
        if (!b)
            return [x0, x1, y0];
        if (b.index < sec.index)
            x0 = b.x0;
        if (b.index > sec.index)
            x1 = b.x1;
        return [x0, x1, Math.max(y0, this.postBackY(b))];
    }
    facadeXRange(eg, g) {
        const secs = this.sections;
        const left = secs[0];
        const right = secs[secs.length - 1];
        let a, b;
        if (this.inset) {
            a = left.blind ? secs[1].x0 + eg : this.ix0 + eg;
            b = right.blind ? secs[secs.length - 2].x1 - eg : this.ix1 - eg;
        }
        else {
            a = left.blind ? left.x1 + this.dt / 2.0 + g / 2.0 : eg;
            b = right.blind ? right.x0 - this.dt / 2.0 - g / 2.0 : this.w - eg;
        }
        return [a, b];
    }
    // ======================================================= whole-facade doors
    computeFacade() {
        if (this.sliding)
            return [];
        const rows = this.doors.rows;
        const g = this.doors.gap;
        const eg = this.doors.edge_gap;
        let fz0, fz1;
        if (this.inset) {
            fz0 = this.iz0 + eg;
            fz1 = this.iz1 - eg;
        }
        else {
            fz0 = eg;
            fz1 = this.h - eg;
        }
        const [fx0, fx1] = this.facadeXRange(eg, g);
        const avail = (fz1 - fz0) - (rows.length - 1) * g;
        const heights = this.distribute(rows.map((r) => r.height), avail, "ارتفاعات صفوف الضلف (الواجهة كلها)");
        if (!heights)
            return [];
        this.facadeRows = [];
        const leaves = [];
        let z = fz0;
        rows.forEach((r, ri) => {
            const rh = heights[ri];
            const rz0 = z;
            const rz1 = z + rh;
            z = rz1 + g;
            this.facadeRows.push({ index: ri + 1, height: rround(rh, 2), z0: rround(rz0, 3), z1: rround(rz1, 3) });
            if (r.type === "none")
                return;
            const n = r.leaves;
            const lw = ((fx1 - fx0) - (n - 1) * g) / n;
            if (lw < 10.0 || rh < 10.0) {
                this.errors.push(`صف ضلف ${ri + 1}: كل ضلفة هتبقى ${f(lw)}×${f(rh)} سم — صغيرة جداً.`);
                return;
            }
            const style = r.style === "default" ? this.doors.style : r.style;
            for (let k = 0; k < n; k++) {
                const lx0 = fx0 + k * (lw + g);
                leaves.push({ row: ri, leaf: k, x0: lx0, x1: lx0 + lw, z0: rz0, z1: rz1,
                    hinge: r.hinges[k], style, rows: rows.length, leaves: n });
            }
        });
        return leaves;
    }
    facadeCovers(sec, c) {
        if (this.sliding)
            return true;
        const area = (sec.x1 - sec.x0) * (c.z1 - c.z0);
        if (area <= 0)
            return false;
        const cov = sum(this.facade.map((lf) => {
            const ox = Math.max(Math.min(sec.x1, lf.x1) - Math.max(sec.x0, lf.x0), 0);
            const oz = Math.max(Math.min(c.z1, lf.z1) - Math.max(c.z0, lf.z0), 0);
            return ox * oz;
        }));
        return cov >= area * 0.5;
    }
    verticalPanels() {
        const list = [[0.0, this.t], [this.w - this.t, this.w]];
        for (let i = 0; i + 1 < this.sections.length; i++) {
            const a = this.sections[i];
            list.push([a.x1, a.x1 + this.dt]);
        }
        return list;
    }
    buildFacade() {
        if (this.sliding)
            return this.buildSliding();
        const [fy0, fy1] = this.inset ? [0.0, this.ft] : [-this.ft, 0.0];
        const tol = this.doors.edge_gap + 1.0;
        for (const lf of this.facade) {
            let name = `ضلفة ${lf.leaf + 1}`;
            if (lf.rows > 1)
                name += ` - صف ${lf.row + 1}`;
            this.addDoor(name, lf.x0, lf.x1, lf.z0, lf.z1, fy0, fy1, lf.hinge, lf.style);
            if (lf.hinge === "top")
                continue;
            const hx = lf.hinge === "left" ? lf.x0 : lf.x1;
            if (!this.verticalPanels().some(([a, b]) => hx >= a - tol && hx <= b + tol)) {
                this.warnings.push(`${name}: حرف المفصلة (على بعد ${f(hx)} سم من الشمال) مش جاي على جنب ولا قاطوع — ` +
                    "مفيش حاجة تتركب عليها المفصلة. غيّر عدد الضلف أو اتجاه المفصلة أو عروض الأقسام.");
            }
            if (lf.x1 - lf.x0 > 60.0 + EPS) {
                this.warnings.push(`${name}: عرضها ${f(lf.x1 - lf.x0)} سم — أعرض من 60 سم.`);
            }
        }
    }
    hingeCountFor(len, flip) {
        const hc = this.doors.hinge_count;
        if (hc !== "auto")
            return hc;
        if (flip)
            return len <= 60 ? 2 : len <= 120 ? 3 : 4;
        return len <= 90 ? 2 : len <= 150 ? 3 : len <= 200 ? 4 : 5;
    }
    hingePositions(len, flip) {
        const e = this.doors.hinge_edge;
        const n = this.hingeCountFor(len, flip);
        if (len < 2 * e + EPS)
            return null;
        return Array.from({ length: n }, (_, i) => e + ((len - 2 * e) * i) / (n - 1));
    }
    addDoor(name, x0, x1, z0, z1, fy0, fy1, hingeSide, style0 = "wood") {
        const style = Object.prototype.hasOwnProperty.call(Schema.DOOR_STYLE_SPECS, style0) ? style0 : "wood";
        const spec = Schema.DOOR_STYLE_SPECS[style];
        const flip = hingeSide === "top";
        const len = flip ? x1 - x0 : z1 - z0;
        const positions = this.hingePositions(len, flip);
        if (!positions) {
            this.errors.push(`${name}: ${flip ? "عرضها" : "ارتفاعها"} ${f(len)} سم مش كفاية للمفصلات (بعد المفصلة عن الطرف ${f(this.doors.hinge_edge)} سم).`);
            return;
        }
        const absPos = positions.map((p) => (flip ? x0 : z0) + p);
        let hinge;
        if (flip) {
            const midX = (x0 + x1) / 2.0;
            hinge = { point: [midX, fy0, z1], axis: [1, 0, 0], free: [midX, fy0, z0], normal: [0, -1, 0] };
        }
        else {
            const [hx, fx] = hingeSide === "left" ? [x0, x1] : [x1, x0];
            hinge = { point: [hx, fy0, 0.0], axis: [0, 0, 1], free: [fx, fy0, 0.0], normal: [0, -1, 0] };
        }
        this.doorSeq += 1;
        const key = `door${this.doorSeq}`;
        this.drawer_groups.push({ key, kind: "door", name, style, hinge_side: hingeSide, hinge,
            box: this.box(x0, fy0, z0, x1, fy1, z1) });
        if (!flip)
            this.addHingePlates(name, hingeSide, absPos, x0, x1);
        if (!spec.frame) {
            const plan = this.handlePlan(name, "door", hingeSide, x0, x1, z0, z1, fy0, fy1, false);
            const fr = plan.front;
            const fx0 = x0 + fr.x0, fx1 = x0 + fr.x1, fz0 = z0 + fr.z0, fz1 = z0 + fr.z1;
            const span = flip ? [fx0, fx1] : [fz0, fz1];
            if (plan.reduce && absPos.some((pz) => pz < span[0] + 2.0 || pz > span[1] - 2.0)) {
                this.errors.push(`${name}: بعد خصم ${f(plan.reduce.amount)} سم للمقبض، مكان المفصلة بقى على حرف الضلفة — زوّد "بعد المفصلة عن الطرف".`);
                return;
            }
            const dp = this.addPart(name, "door", "door", this.box(fx0, fy0, fz0, fx1, fy1, fz1), {
                label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true,
                layer: "front", group: key, note: this.handleNote(plan),
                door_label: { hinge_side: hingeSide, hinge_ratios: this.ratiosFor(absPos, span) },
            });
            this.placeHandle(name, key, dp, plan, x0, z0, fy0);
            return;
        }
        const wood = spec.frame === "wood";
        const fw = wood ? this.doors.wood_frame_width : this.doors.alu_frame_width;
        if (x1 - x0 < 2 * fw + MIN_SPACE || z1 - z0 < 2 * fw + MIN_SPACE) {
            this.errors.push(`${name}: مقاسها ${f(x1 - x0)}×${f(z1 - z0)} سم صغير على فريم عرضه ${f(fw)} سم.`);
            return;
        }
        const frameMat = wood ? "door_frame_wood" : "door_frame_alu";
        const eng = this.doors.insert_engage;
        if (eng >= fw - EPS) {
            this.errors.push(`${name}: دخول الحشوة/الزجاج في الفريم (${f(eng)} سم) لازم يكون أقل من عرض الفريم (${f(fw)} سم).`);
            return;
        }
        const ft_ = fy1 - fy0;
        const note = `مفحار في الحرف الداخلي بعمق ${f(eng)} سم للحشوة/الزجاج`;
        const b = (ends) => (wood ? ends : []);
        const railRatio = flip ? this.ratiosFor(absPos, [x0, x1]) : [];
        const railBottom = this.addPart(`${name} - فريم تحت`, "door_frame", frameMat, this.box(x0, fy0, z0, x1, fy1, z0 + fw), {
            label_axes: ["x", "z"], band: b(["bottom", "left", "right"]), layer: "front", group: key, note,
        });
        this.addPart(`${name} - فريم فوق`, "door_frame", frameMat, this.box(x0, fy0, z1 - fw, x1, fy1, z1), {
            label_axes: ["x", "z"], band: b(["top", "left", "right"]), layer: "front", group: key, note,
            door_label: flip ? { hinge_side: "top", hinge_ratios: railRatio } : null,
        });
        const s0 = z0 + fw;
        const s1 = z1 - fw;
        if (!flip && absPos.some((p) => p < s0 + 2.0 || p > s1 - 2.0)) {
            this.errors.push(`${name}: بعد المفصلة عن الطرف (${f(this.doors.hinge_edge)} سم) لازم يكون أكبر من عرض الفريم ` +
                `(${f(fw)} سم) بـ 2 سم على الأقل — وإلا المفصلة هتيجي في القايم الأفقي.`);
            return;
        }
        const stiles = {};
        const defs = [
            ["شمال", x0, x0 + fw, ["left"], "left"], ["يمين", x1 - fw, x1, ["right"], "right"],
        ];
        for (const [lbl, a, c, ends, side] of defs) {
            const dl = !flip && hingeSide === side ? { hinge_side: side, hinge_ratios: this.ratiosFor(absPos, [s0, s1]) } : null;
            stiles[side] = this.addPart(`${name} - فريم ${lbl}`, "door_frame", frameMat, this.box(a, fy0, s0, c, fy1, s1), {
                label_axes: ["x", "z"], band: b(ends), layer: "front", group: key, note, door_label: dl,
            });
        }
        const handleTarget = flip ? railBottom : stiles[hingeSide === "left" ? "right" : "left"];
        const plan = this.handlePlan(name, "door", hingeSide, x0, x1, z0, z1, fy0, fy1, true);
        this.placeHandle(name, key, handleTarget, plan, x0, z0, fy0);
        const insKey = spec.insert;
        const insT = insKey === "glass" ? this.doors.glass_t : insKey === "mirror" ? this.doors.mirror_t : this.doors.panel_t;
        if (insT >= ft_ - EPS) {
            this.errors.push(`${name}: سمك الحشوة/الزجاج (${f(insT)}) لازم يكون أقل من سمك الضلفة (${f(ft_)}).`);
            return;
        }
        const ym = (fy0 + fy1) / 2.0;
        const insName = { glass: "زجاج", mirror: "مراية" }[insKey] ?? "حشوة";
        this.addPart(`${name} - ${insName}`, "door_insert", insKey, this.box(x0 + fw - eng, ym - insT / 2.0, z0 + fw - eng, x1 - fw + eng, ym + insT / 2.0, z1 - fw + eng), {
            label_axes: ["x", "z"], band: [], layer: "front", group: key,
        });
    }
    // ======================================================= hinge plates
    addHingePlates(name, hingeSide, absPos, x0, x1) {
        const hx = hingeSide === "left" ? x0 : x1;
        const tol = Math.max(this.t, this.dt) + this.doors.edge_gap + 1.0;
        const zmin = Math.min(...absPos);
        const zmax = Math.max(...absPos);
        const cands = this.parts.filter((pt) => (pt.role === "side" || pt.role === "divider") && pt.axes &&
            pt.box.x0 - tol <= hx && hx <= pt.box.x1 + tol &&
            pt.box.z0 <= zmin && pt.box.z1 >= zmax && pt.box.y0 < 5.0);
        const panel = minBy(cands, (pt) => Math.abs((pt.box.x0 + pt.box.x1) / 2.0 - hx));
        if (!panel) {
            this.warnings.push(`${name}: مفيش جنب ولا قاطوع تحت حرف المفصلة — قاعدة المفصلة مش هتتسجّل على أي ملصق.`);
            return;
        }
        const y = panel.box.y0 + this.doors.plate_setback;
        const sp = this.doors.plate_hole_spacing / 2.0;
        const xc = (panel.box.x0 + panel.box.x1) / 2.0;
        for (const z of absPos) {
            for (const zz of [z - sp, z + sp])
                this.attachPointHole(panel, { x: xc, y, z: zz }, this.doors.plate_hole_d, "plate");
        }
    }
    // ======================================================= handles
    handlePlan(name, kind, hingeSide, x0, x1, z0, z1, fy0, fy1, framed) {
        const front = { w: x1 - x0, h: z1 - z0, t: fy1 - fy0, kind, hinge: hingeSide,
            unit_type: "tall", z_base: z0, framed };
        const plan = Handles.compute(front, this.p.handles);
        for (const wr of plan.warnings)
            this.warnings.push(`${name}: ${wr}`);
        this.handleHw ??= {};
        for (const [k, v] of Object.entries(plan.hardware)) {
            this.handleHw[k] = rround((this.handleHw[k] ?? 0) + v, 3);
        }
        return plan;
    }
    handleNote(plan) {
        const notes = [...plan.notes];
        const back = plan.holes.filter((hl) => hl.face === "back").length;
        if (back > 0)
            notes.push(`${back} من أخرام المقبض من الضهر (مش نافذة)`);
        return notes.length === 0 ? null : notes.join(" | ");
    }
    placeHandle(name, key, target, plan, ox, oz, fy0) {
        if (!target)
            return;
        for (const hl of plan.holes) {
            this.attachPointHole(target, { x: ox + hl.x, y: fy0, z: oz + hl.z }, hl.d, "handle");
        }
        for (const v of plan.visuals) {
            if (v.mat === "wood_strip")
                continue;
            this.addPart(`${name} - ${HANDLE_VISUAL_NAME[v.mat]}`, "handle", HANDLE_VISUAL_MATERIAL[v.mat], this.box(ox + v.x0, fy0 + v.y0, oz + v.z0, ox + v.x1, fy0 + v.y1, oz + v.z1), {
                label_axes: null, band: [], layer: "front", group: v.attach === "carcass" ? null : key, cut_piece: false,
            });
        }
        for (const pc of plan.pieces) {
            const r = pc.rect;
            const horizontal = r.x1 - r.x0 >= r.z1 - r.z0;
            this.addPart(`${name} - ${pc.suffix}`, "handle_strip", "handle_wood", this.box(ox + r.x0, fy0 + pc.y0, oz + r.z0, ox + r.x1, fy0 + pc.y1, oz + r.z1), {
                label_axes: horizontal ? ["x", "z"] : ["z", "x"], band: [], layer: "front", group: key, note: pc.note,
            });
        }
    }
    attachPointHole(pt, pos, d, kind = null) {
        if (!pt.axes)
            return;
        const [wa, ha] = pt.axes;
        const b = pt.box;
        const ratio = (ax) => {
            const ext = b[`${ax}1`] - b[`${ax}0`];
            return ext > 0 ? rround(Math.min(Math.max((pos[ax] - b[`${ax}0`]) / ext, 0.0), 1.0), 4) : 0.5;
        };
        pt.holes.push({ w: ratio(wa), h: ratio(ha), d, kind });
    }
    ratiosFor(absPositions, [a0, a1]) {
        const len = a1 - a0;
        return absPositions.map((p) => rround((p - a0) / len, 4)).filter((r) => r > 0 && r < 1);
    }
    // ================================================================ drawers
    buildDrawers(sec, c, covered) {
        if (this.nextToPost(sec)) {
            this.errors.push(`${this.tag(sec, c)}: الأدراج محتاجة جنب بعمق كامل يتركب عليه المجرى — القسم ده جنب زاوية عمياء ` +
                `بقايم مفصلات بس. خلّي فاصل الزاوية العمياء "جنب سد" أو انقل الأدراج لقسم تاني.`);
            return;
        }
        const dr = this.dr;
        const n = c.drawer_count;
        const g = dr.gap;
        const ci = c.index;
        const t_ = this.tag(sec, c);
        const hasFront = c.drawer_front !== false;
        let fx0, fx1, fy0, fy1, rz0, rz1, boxY0;
        if (covered) {
            const isc = dr.internal_side_clearance;
            fx0 = sec.x0 + isc;
            fx1 = sec.x1 - isc;
            const hs = this.hingeFixSides();
            const fix = dr.hinge_spacer_t + dr.hinge_front_gap;
            if (hs.includes("left"))
                fx0 += fix;
            if (hs.includes("right"))
                fx1 -= fix;
            fy0 = this.baseY(true) + dr.internal_setback;
            fy1 = fy0 + this.ft;
            rz0 = c.z0;
            rz1 = c.z1 - g;
            boxY0 = hasFront ? fy1 : fy0;
        }
        else {
            [fx0, fx1, rz0, rz1, fy0, fy1] = this.frontRegion(sec, ci, ci);
            boxY0 = hasFront ? Math.max(fy1, 0.0) : 0.0;
        }
        if (this.whole && !covered && hasFront) {
            const hit = this.facade.find((lf) => Math.min(fx1, lf.x1) - Math.max(fx0, lf.x0) > EPS && Math.min(rz1, lf.z1) - Math.max(rz0, lf.z0) > EPS);
            if (hit) {
                this.errors.push(`${t_}: وش الأدراج الخارجية بيتقاطع مع ضلفة من ضلف الواجهة — ` +
                    `خلّي صف الضلف ده "من غير ضلف" أو شيل وش الأدراج أو خلّي الضلفة تغطي الفراغ كله.`);
                return;
            }
        }
        if (hasFront && fx1 - fx0 < 10.0) {
            this.errors.push(`${t_}: عرض وش الأدراج ${f(fx1 - fx0)} سم صغير جداً.`);
            return;
        }
        const eachH = (rz1 - rz0 - (n - 1) * g) / n;
        if (eachH < 8.0 - EPS) {
            this.errors.push(`${t_}: ${n} درج في ارتفاع ${f(rz1 - rz0)} سم — كل وش هيبقى ${f(eachH)} سم (أقل من 8 سم).`);
            return;
        }
        const hs = covered ? this.hingeFixSides() : [];
        const sp = dr.hinge_spacer_t;
        const bx0 = sec.x0 + dr.slide_clearance + (hs.includes("left") ? sp : 0.0);
        const bx1 = sec.x1 - dr.slide_clearance - (hs.includes("right") ? sp : 0.0);
        if (bx1 - bx0 < 2 * dr.box_t + MIN_SPACE) {
            this.errors.push(`${t_}: عرض صندوق الدرج ${f(bx1 - bx0)} سم صغير جداً بعد خلوص المجاري.`);
            return;
        }
        const avail = this.gy0 - boxY0 - 1.0;
        const boxLen = this.drawerLength(avail, t_);
        if (boxLen === null)
            return;
        if (covered && hs.length)
            this.buildHingeSpacers(sec, c, hs, t_);
        if (covered && !dr.hinge_fix && this.hingeSides.length) {
            this.warnings.push(`${t_}: الأدراج الداخلية ورا ضلفة بمفصلات — من غير حشوة مجرى هتخبط في المفصلات وهي طالعة. فعّل "حل خبط المفصلات".`);
        }
        const slots = Array.from({ length: n }, (_, i) => {
            const fz0 = rz0 + i * (eachH + g);
            const fz1 = fz0 + eachH;
            const bz0 = Math.max(fz0, c.z0) + dr.box_bottom_gap;
            const bz1 = Math.min(fz1, c.z1) - dr.box_top_gap;
            return [fz0, fz1, bz0, bz1 - bz0];
        });
        const bh = Math.min(...slots.map((s) => s[3]));
        if (bh < 6.0 - EPS) {
            this.errors.push(`${t_}: ارتفاع صندوق الدرج ${f(bh)} سم صغير جداً (راجع خلوص فوق/تحت الصندوق أو قلّل عدد الأدراج).`);
            return;
        }
        if (dr.bottom_inset + dr.bottom_t > bh - 2.0) {
            this.errors.push(`${t_}: قاعدة الدرج (بعدها + سمكها) مش هتدخل في ارتفاع الصندوق ${f(bh)} سم.`);
            return;
        }
        slots.forEach(([fz0, fz1, bz0], i) => {
            const bz1 = bz0 + bh;
            const name = `${t_} - درج ${i + 1}`;
            const key = `s${sec.index}c${ci}d${i}`;
            const grp = { key, kind: "drawer", name, open_distance: rround(boxLen * 0.75, 2) };
            this.drawer_groups.push(grp);
            if (hasFront) {
                const plan = this.handlePlan(name, "drawer", null, fx0, fx1, fz0, fz1, fy0, fy1, false);
                const fr = plan.front;
                const fp = this.addPart(name, "drawer_front", "drawer_front", this.box(fx0 + fr.x0, fy0, fz0 + fr.z0, fx0 + fr.x1, fy1, fz0 + fr.z1), {
                    label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true,
                    layer: "front", group: key, note: this.handleNote(plan),
                });
                this.placeHandle(name, key, fp, plan, fx0, fz0, fy0);
            }
            this.drawer_groups[this.drawer_groups.length - 1].slide_len = boxLen;
            this.buildDrawerBox(name, key, bx0, bx1, boxY0, boxY0 + boxLen, bz0, bz1);
        });
    }
    hingeFixSides() {
        return this.dr.hinge_fix ? (this.hingeSides ?? []) : [];
    }
    buildHingeSpacers(sec, c, sides, t_) {
        const sp = this.dr.hinge_spacer_t;
        const y0 = this.baseY(true) + this.dr.hinge_zone_depth;
        const y1 = this.gy0;
        if (y1 - y0 < MIN_SPACE) {
            this.errors.push(`${t_}: مفيش عمق كفاية لحشوة المجرى بعد منطقة المفصلة.`);
            return;
        }
        for (const sd of sides) {
            const [x0, x1] = sd === "left" ? [sec.x0, sec.x0 + sp] : [sec.x1 - sp, sec.x1];
            const nm = `${t_} - حشوة مجرى ${sd === "left" ? "شمال" : "يمين"}`;
            this.addPart(nm, "spacer", "carcass", this.box(x0, y0, c.z0, x1, y1, c.z1), {
                label_axes: ["y", "z"], band: ["front"], layer: "carcass",
                note: "بتتركب على الجنب — المجرى بيتركب عليها عشان الدرج ميخبطش في المفصلة",
            });
        }
    }
    drawerLength(avail, t_) {
        const manual = this.dr.box_depth;
        if (manual !== "auto") {
            if (manual > avail + EPS) {
                this.errors.push(`${t_}: عمق صندوق الدرج ${f(manual)} سم أكبر من العمق المتاح ${f(avail)} سم.`);
                return null;
            }
            return manual;
        }
        const lens = this.dr.slide_lengths;
        const fits = lens.filter((l) => l <= avail + EPS);
        if (fits.length === 0) {
            this.errors.push(`${t_}: مفيش مقاس مجرى قياسي يدخل في العمق المتاح ${f(avail)} سم ` +
                `(أصغر مجرى ${f(Math.min(...lens))} سم).`);
            return null;
        }
        return Math.max(...fits);
    }
    buildDrawerBox(name, key, bx0, bx1, by0, by1, bz0, bz1) {
        const dr = this.dr;
        const bt = dr.box_t;
        const bg = dr.bottom_groove;
        const bi = dr.bottom_inset;
        const bb = dr.bottom_t;
        const bh = bz1 - bz0;
        const ratio = rround((bi + bb / 2.0) / bh, 4);
        const grv = bg > EPS ? { axis: "horizontal", ratio } : null;
        this.addPart(`${name} - جنب شمال`, "drawer_box", "drawer_box", this.box(bx0, by0, bz0, bx0 + bt, by1, bz1), {
            label_axes: ["y", "z"], band: ["top"], layer: "front", group: key, groove: grv,
            mark: { type: "drawer", z: rround(bz0, 3) },
        });
        this.addPart(`${name} - جنب يمين`, "drawer_box", "drawer_box", this.box(bx1 - bt, by0, bz0, bx1, by1, bz1), {
            label_axes: ["y", "z"], band: ["top"], layer: "front", group: key, groove: grv,
        });
        this.addPart(`${name} - جدار أمامي`, "drawer_box", "drawer_box", this.box(bx0 + bt, by0, bz0, bx1 - bt, by0 + bt, bz1), {
            label_axes: ["x", "z"], band: ["top"], layer: "front", group: key, groove: grv,
        });
        this.addPart(`${name} - جدار خلفي`, "drawer_box", "drawer_box", this.box(bx0 + bt, by1 - bt, bz0, bx1 - bt, by1, bz1), {
            label_axes: ["x", "z"], band: ["top"], layer: "front", group: key, groove: grv,
        });
        this.addPart(`${name} - قاعدة`, "drawer_bottom", "drawer_bottom", this.box(bx0 + bt - bg, by0 + bt - bg, bz0 + bi, bx1 - bt + bg, by1 - bt + bg, bz0 + bi + bb), {
            label_axes: ["x", "y"], band: [], layer: "front", group: key,
        });
    }
    // ================================================================ plinth
    shiftUp(dz) {
        const up = (b) => ({ ...b, z0: rround(b.z0 + dz, 4), z1: rround(b.z1 + dz, 4) });
        for (const pt of this.parts) {
            pt.box = up(pt.box);
            const sh = pt.shape;
            switch (sh.type) {
                case "profile_z":
                    pt.shape = { ...sh, z0: sh.z0 + dz, z1: sh.z1 + dz };
                    break;
                case "profile_x":
                    pt.shape = { ...sh, points: sh.points.map(([yy, zz]) => [yy, rround(zz + dz, 6)]) };
                    break;
                case "cylinder_x":
                case "cylinder_z":
                    pt.shape = { ...sh, cz: sh.cz + dz };
                    break;
            }
        }
        for (const g of this.drawer_groups) {
            if (g.box)
                g.box = up(g.box);
            if (!g.hinge)
                continue;
            const hg = g.hinge;
            g.hinge = { ...hg, point: [hg.point[0], hg.point[1], hg.point[2] + dz], free: [hg.free[0], hg.free[1], hg.free[2] + dz] };
        }
        if (this.facadeRows) {
            for (const r of this.facadeRows) {
                r.z0 = rround(r.z0 + dz, 3);
                r.z1 = rround(r.z1 + dz, 3);
            }
        }
    }
    buildPlinth() {
        this.plinthHw = {};
        if (this.plinth.style === "frame")
            this.buildPlinthFrame();
        else
            this.buildPlinthLegs();
        this.addPlinthNote();
    }
    buildPlinthLegs() {
        const { w, d, ph, plinth } = this;
        const sb = plinth.setback;
        const at = plinth.apron_t;
        const li = plinth.leg_inset;
        const side = plinth.side_apron;
        const left = side === "left" || side === "both";
        const right = side === "right" || side === "both";
        const note = "بتتركب في الآخر بكليبسات على الرجول — بتتقص في الموقع على ارتفاع الأرضية لو مش مستوية";
        this.addPart("سكلو - وزرة قدام", "plinth", "plinth", this.box(0.0, sb, 0.0, w, sb + at, ph), {
            label_axes: ["x", "z"], band: [], layer: "plinth", note,
        });
        const aprons = [[left, "شمال", 0.0, at], [right, "يمين", w - at, w]];
        for (const [on, lbl, x0, x1] of aprons) {
            if (!on)
                continue;
            this.addPart(`سكلو - وزرة جنب ${lbl}`, "plinth", "plinth", this.box(x0, sb + at, 0.0, x1, d, ph), {
                label_axes: ["y", "z"], band: [], layer: "plinth", note,
            });
        }
        const r = 2.0;
        const xs0 = li;
        const xs1 = w - li;
        const n = Math.max(Math.ceil((xs1 - xs0) / plinth.leg_spacing) + 1, 2);
        const xs = Array.from({ length: n }, (_, i) => xs0 + ((xs1 - xs0) * i) / (n - 1));
        const yf = Math.max(sb + at + r + 0.5, li);
        const yb = d - li;
        if (yb - yf < 2 * r) {
            this.errors.push("السكلو: العمق مش كفاية لصفين رجول (قدام وورا).");
            return;
        }
        const legs = [...xs.map((x) => [x, yf]), ...xs.map((x) => [x, yb])];
        if (yb - yf > plinth.leg_spacing + EPS) {
            for (const x of xs)
                legs.push([x, (yf + yb) / 2.0]);
        }
        legs.forEach(([x, y], i) => {
            this.addPart(`سكلو - رجل ${i + 1}`, "plinth_leg", "plinth_leg", this.box(x - r, y - r, 0.0, x + r, y + r, ph), {
                shape: { type: "cylinder_z", cx: x, cy: y, cz: ph / 2.0, r, length: ph },
                label_axes: null, band: [], layer: "plinth", cut_piece: false,
            });
        });
        this.plinthLegs = { count: legs.length, per_row: n, front_y: rround(yf, 1), back_from_rear: rround(d - yb, 1),
            spacing: n > 1 ? rround((xs1 - xs0) / (n - 1), 1) : 0 };
        inc(this.plinthHw, `رجل بلاستيك سكلو ${f(ph)} سم (قابلة للضبط)`, legs.length);
        const frontClips = n + (left ? 2 : 0) + (right ? 2 : 0);
        inc(this.plinthHw, "كليبس وزرة سكلو", frontClips);
    }
    buildPlinthFrame() {
        const { w, d, ph, plinth } = this;
        const sb = plinth.setback;
        const at = plinth.apron_t;
        const y0 = sb + at;
        const y1 = d - at;
        if (y1 - y0 < MIN_SPACE) {
            this.errors.push("السكلو: العمق مش كفاية للبرواز.");
            return;
        }
        this.addPart("سكلو - وزرة قدام", "plinth", "plinth", this.box(0.0, sb, 0.0, w, y0, ph), {
            label_axes: ["x", "z"], band: [], layer: "plinth",
        });
        this.addPart("سكلو - لوح ورا", "plinth", "plinth", this.box(0.0, y1, 0.0, w, d, ph), {
            label_axes: ["x", "z"], band: [], layer: "plinth",
        });
        const inner = w - 2 * at;
        const gaps = Math.max(Math.ceil(inner / plinth.leg_spacing), 1);
        const step = (inner - (gaps - 1) * at) / gaps;
        const xs = [0.0];
        for (let i = 1; i < gaps; i++)
            xs.push(at + i * step + (i - 1) * at);
        xs.push(w - at);
        xs.forEach((x, i) => {
            const name = i === 0 ? "سكلو - جنب شمال" : i === xs.length - 1 ? "سكلو - جنب يمين" : `سكلو - عارضة ${i}`;
            this.addPart(name, "plinth", "plinth", this.box(x, y0, 0.0, x + at, y1, ph), {
                label_axes: ["y", "z"], band: [], layer: "plinth",
            });
        });
        const joints = xs.length * 2;
        inc(this.plinthHw, "زاوية/برغي تثبيت برواز السكلو (وصلة)", joints);
        inc(this.plinthHw, "برغي تثبيت الهيكل على برواز السكلو", xs.length * 2);
    }
    addPlinthNote() {
        const base = this.parts.find((pt) => pt.role === "horizontal" && pt.name === "قاعدة");
        if (!base)
            return;
        let txt;
        if (this.plinthLegs) {
            const lg = this.plinthLegs;
            txt = `السكلو: ${lg.count} رجل — صف قدام على بعد ${f(lg.front_y)} سم من الوش وصف ورا على بعد ${f(lg.back_from_rear)} سم من الضهر، ${lg.per_row} في كل صف (كل ${f(lg.spacing)} سم تقريباً)`;
        }
        else {
            txt = `السكلو: الهيكل بيتركب على برواز خشب ارتفاعه ${f(this.ph)} سم`;
        }
        base.note = [base.note, txt].filter((s) => s !== null && s !== undefined && s !== "").join(" | ");
    }
    // ================================================================ tools
    box(x0, y0, z0, x1, y1, z1) {
        return { x0: rround(x0, 4), y0: rround(y0, 4), z0: rround(z0, 4), x1: rround(x1, 4), y1: rround(y1, 4), z1: rround(z1, 4) };
    }
    addPart(name, role, material, bx, o) {
        this.nextId += 1;
        const band = this.banding ? o.band : [];
        let label = null;
        const la = o.label_axes;
        if (la) {
            const [wa, ha] = la;
            const ta = minus(XYZ, la)[0];
            const ext = (a) => rround(bx[`${a}1`] - bx[`${a}0`], 3);
            label = {
                w: ext(wa), h: ext(ha), t: ext(ta),
                banded: {
                    left: band.includes(AXIS_ENDS[wa][0]), right: band.includes(AXIS_ENDS[wa][1]),
                    bottom: band.includes(AXIS_ENDS[ha][0]), top: band.includes(AXIS_ENDS[ha][1]),
                },
                groove: o.groove ?? null,
            };
        }
        const part = {
            id: this.nextId, name, role, material, box: bx,
            shape: o.shape ?? { type: "box" }, label, band,
            band_all_sides: (o.band_all_sides ?? false) && this.banding, layer: o.layer, mark: o.mark ?? null,
            door_label: o.door_label ?? null, group: o.group ?? null, cut_piece: o.cut_piece ?? true, note: o.note ?? null,
            axes: la, holes: [],
        };
        this.parts.push(part);
        return part;
    }
    // ======================================================= LED
    get ledCfg() { return this.p.led; }
    buildLed() {
        this.ledHw = {};
        this.ledRuns = 0;
        let totalCm = 0.0;
        let lit = 0;
        for (const sec of this.sections) {
            if (sec.kind === "blind")
                continue; // (sections carry "blind", not "kind" — never true, as in the plugin)
            for (const c of sec.compartments) {
                const mode = c.led == null ? "" : String(c.led);
                if (mode === "" || mode === "none")
                    continue;
                const before = totalCm;
                if (mode === "top" || mode === "top_sides")
                    totalCm += this.ledTop(sec, c);
                if (mode === "sides" || mode === "top_sides")
                    totalCm += this.ledSides(sec, c);
                if (mode === "shelves")
                    totalCm += this.ledShelves(sec, c);
                if (totalCm > before)
                    lit += 1;
            }
        }
        if (totalCm <= 0)
            return;
        const lc = this.ledCfg;
        const m = rround(totalCm / 100.0, 2);
        this.ledHw["شريط ليد (متر)"] = m;
        this.ledHw[`بروفايل ليد ألومنيوم${lc.install === "surface" ? " سطحي" : " غاطس"} (متر)`] = m;
        const watts = Math.ceil((m * lc.watt_per_m * 1.2) / 10.0) * 10;
        this.ledHw[`درايفر ليد 12 فولت — ${watts} وات أو أكتر`] = 1;
        switch (lc.sensor) {
            case "door":
                this.ledHw["حساس ضلفة لليد"] = lit;
                break;
            case "motion":
                this.ledHw["حساس حركة لليد"] = lit;
                break;
            case "switch":
                this.ledHw["مفتاح ليد"] = 1;
                break;
        }
    }
    ledTop(sec, c) {
        const panel = this.parts.find((pt) => (pt.role === "horizontal" || pt.role === "fixed_shelf") && pt.axes &&
            Math.abs(pt.box.z0 - c.z1) < LED_TOL &&
            pt.box.x0 <= sec.x0 + LED_TOL && pt.box.x1 >= sec.x1 - LED_TOL);
        if (!panel) {
            this.warnings.push(`${this.tag(sec, c)}: مفيش لوح فوق الفراغ يتركب تحته الليد.`);
            return 0.0;
        }
        return this.ledHorizontal(panel, sec.x0, sec.x1, panel.box.z0, `${this.tag(sec, c)} - ليد فوق`);
    }
    ledShelves(sec, c) {
        const shelves = this.parts.filter((pt) => pt.role === "shelf" && pt.box.x1 > sec.x0 + LED_TOL && pt.box.x0 < sec.x1 - LED_TOL &&
            pt.box.z0 > c.z0 - LED_TOL && pt.box.z1 < c.z1 + LED_TOL);
        if (shelves.length === 0) {
            this.warnings.push(`${this.tag(sec, c)}: الليد "تحت الأرفف" محتاج أرفف في الفراغ.`);
            return 0.0;
        }
        return sum(shelves.map((pt) => this.ledHorizontal(pt, pt.box.x0, pt.box.x1, pt.box.z0, `${pt.name} - ليد`)));
    }
    ledHorizontal(panel, x0, x1, zFace, name) {
        const lc = this.ledCfg;
        const y0 = panel.box.y0 + lc.offset;
        const y1 = y0 + lc.width;
        if (y1 > panel.box.y1 - 0.5) {
            this.warnings.push(`${name}: عمق اللوح مش كفاية لقناة الليد على بعد ${f(lc.offset)} سم.`);
            return 0.0;
        }
        const dz = lc.install === "recessed" ? lc.depth : 0.0;
        this.addPart(name, "led", "__led", this.box(x0, y0, zFace - 0.15, x1, y1, zFace + Math.max(dz, 0.05)), {
            label_axes: null, band: [], layer: "assembly", cut_piece: false,
        });
        this.markLed(panel, "y", (y0 + y1) / 2.0, `قناة ليد تحت اللوح من ${f(x0 - panel.box.x0)} لـ ${f(x1 - panel.box.x0)} سم من الشمال`);
        if (x1 - x0 > 8.0)
            this.attachPointHole(panel, { x: x0 + 3.0, y: (y0 + y1) / 2.0, z: zFace }, lc.wire_hole_d, "led");
        this.ledRuns += 1;
        return x1 - x0;
    }
    ledSides(sec, c) {
        const lc = this.ledCfg;
        let total = 0.0;
        const defs = [[sec.x0, "x1", 1], [sec.x1, "x0", -1]];
        for (const [xf, key, dir] of defs) {
            const panel = this.parts.find((pt) => (pt.role === "side" || pt.role === "divider") && pt.axes && Math.abs(pt.box[key] - xf) < LED_TOL &&
                pt.box.z0 <= c.z0 + LED_TOL && pt.box.z1 >= c.z1 - LED_TOL);
            if (!panel) {
                this.warnings.push(`${this.tag(sec, c)}: مفيش جنب ${dir > 0 ? "شمال" : "يمين"} يتركب عليه الليد.`);
                continue;
            }
            const y0 = panel.box.y0 + lc.offset;
            const y1 = y0 + lc.width;
            if (y1 > panel.box.y1 - 0.5) {
                this.warnings.push(`${this.tag(sec, c)}: الجنب مش عميق كفاية لقناة الليد.`);
                continue;
            }
            const dx = lc.install === "recessed" ? lc.depth : 0.0;
            const [xa, xb] = dir > 0 ? [xf - Math.max(dx, 0.05), xf + 0.15] : [xf - 0.15, xf + Math.max(dx, 0.05)];
            this.addPart(`${this.tag(sec, c)} - ليد ${dir > 0 ? "شمال" : "يمين"}`, "led", "__led", this.box(xa, y0, c.z0, xb, y1, c.z1), {
                label_axes: null, band: [], layer: "assembly", cut_piece: false,
            });
            this.markLed(panel, "y", (y0 + y1) / 2.0, `قناة ليد رأسية من ${f(c.z0 - panel.box.z0)} لـ ${f(c.z1 - panel.box.z0)} سم من تحت (وش ${dir > 0 ? "اليمين" : "الشمال"})`);
            this.ledRuns += 1;
            total += c.z1 - c.z0;
        }
        return total;
    }
    markLed(panel, posAxis, pos, text) {
        const [wa, ha] = panel.axes;
        const b = panel.box;
        const ext = b[`${posAxis}1`] - b[`${posAxis}0`];
        const ratio = ext > 0 ? rround(Math.min(Math.max((pos - b[`${posAxis}0`]) / ext, 0.0), 1.0), 4) : 0.5;
        const axis = wa === posAxis ? "vertical" : ha === posAxis ? "horizontal" : null;
        if (!axis)
            return;
        panel.led = { ratio, axis };
        const lc = this.ledCfg;
        const how = lc.install === "recessed" ? `حفر ${f(lc.width)}×${f(lc.depth)} سم` : `بروفايل سطحي ${f(lc.width)} سم`;
        const note = `${text} — ${how} على بعد ${f(lc.offset)} سم من قدام`;
        panel.led_notes ??= [];
        panel.led_notes.push(note);
        if (panel.base_note_led === undefined || panel.base_note_led === null)
            panel.base_note_led = panel.note ?? "";
        panel.note = [panel.base_note_led, ...panel.led_notes].filter((s) => s !== "").join(" | ");
    }
    // ======================================================= cam-lock assembly
    thinAxis(pt) {
        return minus(XYZ, pt.axes)[0];
    }
    buildAssembly() {
        const a = this.p.assembly;
        const pieces = this.parts.filter((pt) => JOINT_ROLES.includes(pt.role) && pt.axes);
        const joints = [];
        for (const fp of pieces) {
            const k = this.thinAxis(fp);
            for (const ep of pieces) {
                if (ep === fp)
                    continue;
                const ek = this.thinAxis(ep);
                if (ek === k)
                    continue;
                const line = minus(XYZ, [k, ek])[0];
                if (line !== "y")
                    continue;
                const fb = fp.box;
                const eb = ep.box;
                let plane = null;
                let inward = 0;
                if (Math.abs(eb[`${k}0`] - fb[`${k}1`]) < 0.001) {
                    plane = fb[`${k}1`];
                    inward = 1.0;
                }
                else if (Math.abs(eb[`${k}1`] - fb[`${k}0`]) < 0.001) {
                    plane = fb[`${k}0`];
                    inward = -1.0;
                }
                if (plane === null)
                    continue;
                const o0 = Math.max(eb[`${ek}0`], fb[`${ek}0`]);
                const o1 = Math.min(eb[`${ek}1`], fb[`${ek}1`]);
                if (!(o1 - o0 > 0.001))
                    continue;
                const y0 = Math.max(eb.y0, fb.y0);
                const y1 = Math.min(eb.y1, fb.y1);
                if (!(y1 - y0 > 0.001))
                    continue;
                joints.push([fp, ep, k, ek, plane, inward, y0, y1]);
            }
        }
        for (const j of joints)
            this.drillJoint(a, ...j);
    }
    drillJoint(a, fp, ep, k, ek, plane, inward, y0, y1) {
        const e = a.edge_distance;
        const s = a.spacing;
        const front = [y0 + e, y0 + e + s, y0 + e + 2 * s];
        const back = [y1 - e, y1 - e - s, y1 - e - 2 * s];
        if (Math.max(...front) > y1 - e + EPS)
            return;
        const sets = [["قدام", front]];
        if (Math.min(...back) > Math.max(...front) + s - EPS)
            sets.push(["ورا", back]);
        const eb = ep.box;
        const ec = (eb[`${ek}0`] + eb[`${ek}1`]) / 2.0;
        const et = eb[`${ek}1`] - eb[`${ek}0`];
        const r = a.hole_d / 2.0;
        const base = `أليتا - ${fp.name} × ${ep.name}`;
        for (const [setName, ys] of sets) {
            ys.forEach((y, i) => {
                const faceC = plane - (inward * a.face_depth) / 2.0;
                const edgeC = plane + (inward * a.edge_depth) / 2.0;
                this.addHole(`${base} - ${setName} - وش ${i + 1}`, k, ek, faceC, ec, y, r, a.face_depth);
                this.addHole(`${base} - ${setName} - حرف ${i + 1}`, k, ek, edgeC, ec, y, r, a.edge_depth);
                this.attachLabelHole(fp, k, ek, plane, ec, y, a.hole_d);
                this.attachLabelHole(ep, k, ek, plane, ec, y, a.hole_d);
                if (i !== 1)
                    return;
                const camK = plane + inward * a.edge_depth;
                const dir = ek === "z" ? (ec < this.h / 2.0 ? 1.0 : -1.0) : 1.0;
                const camC = ec + dir * (et / 2.0 - a.cam_depth / 2.0);
                this.addHole(`${base} - ${setName} - قفل كام`, ek, k, camC, camK, y, a.cam_d / 2.0, a.cam_depth);
            });
        }
    }
    addHole(name, axis, other, cAxis, cOther, y, r, len) {
        const pos = { [axis]: cAxis, [other]: cOther, y };
        const cx = pos.x, cy = pos.y, cz = pos.z;
        const half = { x: r, y: r, z: r };
        half[axis] = len / 2.0;
        const bx = this.box(cx - half.x, cy - half.y, cz - half.z, cx + half.x, cy + half.y, cz + half.z);
        this.addPart(name, "hole", "__hole", bx, {
            shape: { type: `cylinder_${axis}`, cx, cy, cz, r, length: len },
            label_axes: null, band: [], layer: "assembly", cut_piece: false,
        });
    }
    attachLabelHole(pt, k, ek, plane, ec, y, d) {
        const [wa, ha] = pt.axes;
        const b = pt.box;
        const pos = { [k]: plane, [ek]: ec, y };
        const ratio = (ax) => {
            const ext = b[`${ax}1`] - b[`${ax}0`];
            return ext > 0 ? rround(Math.min(Math.max((pos[ax] - b[`${ax}0`]) / ext, 0.0), 1.0), 4) : 0.5;
        };
        pt.holes.push({ w: ratio(wa), h: ratio(ha), d });
    }
    checkPartSanity() {
        for (const pt of this.parts) {
            const b = pt.box;
            if (b.x1 - b.x0 <= EPS / 10 || b.y1 - b.y0 <= EPS / 10 || b.z1 - b.z0 <= EPS / 10) {
                this.errors.push(`القطعة "${pt.name}" طلعت بمقاس صفر أو سالب — راجع المقاسات.`);
            }
            if (!String(pt.shape.type).startsWith("profile"))
                continue;
            const pts = pt.shape.points;
            if (pts.length < 4 || polygonArea(pts) <= 1e-6) {
                this.errors.push(`القطعة "${pt.name}" شكل المفحار بتاعها طلع غير سليم.`);
            }
        }
    }
    buildSummary() {
        const cut = this.parts.filter((pt) => pt.cut_piece);
        const ph = this.ph;
        this.summary = {
            outer: { width: this.w, height: this.totalH, depth: this.d },
            plinth: ph > EPS ? { height: ph, style: this.plinth.style } : null,
            inner: { width: rround(this.ix1 - this.ix0, 2), height: rround(this.iz1 - this.iz0, 2), depth: rround(this.gy0, 2) },
            construction: this.p.construction,
            sections: this.sections.map((s) => ({
                index: s.index + 1,
                width: rround(s.x1 - s.x0, 2),
                x0: rround(s.x0, 3), x1: rround(s.x1, 3),
                compartments: s.compartments.map((c) => ({
                    index: c.index + 1, height: rround(c.z1 - c.z0, 2),
                    z0: rround(c.z0, 3), z1: rround(c.z1, 3), content: c.content, door: c.door,
                })),
            })),
            facade_rows: this.facadeRows ?? [],
            piece_count: cut.length,
            door_count: this.drawer_groups.filter((g) => g.kind === "door").length,
            drawer_count: this.drawer_groups.filter((g) => g.kind === "drawer").length,
            handle_hardware: { ...(this.handleHw ?? {}) },
            led_hardware: { ...(this.ledHw ?? {}) },
            plinth_hardware: { ...(this.plinthHw ?? {}) },
            ...(this.sliding ? { sliding: { panels: this.drawer_groups.filter((g) => g.kind === "slide").length, track_m: this.slidingTrack ?? 0 } } : {}),
        };
        if (!(ph > EPS))
            return;
        for (const s of this.summary.sections) {
            for (const c of s.compartments) {
                c.z0 = rround(c.z0 + ph, 3);
                c.z1 = rround(c.z1 + ph, 3);
            }
        }
    }
}
