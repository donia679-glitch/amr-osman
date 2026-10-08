// Port of lib/panel_engine/templates.rb (+ rooms and tables in sibling files).
// Every template adds parts on a Design; all share the same carcass/fronts/shelves pieces.
import { fmt, inc } from "../core/ruby.js";
import { rround, sum } from "../core/rubyMath.js";
import * as Catalog from "./catalog.js";
import * as TableSpec from "./tableSpec.js";
import { Design } from "./design.js";
import { buildTv, buildTvWall, buildBed, buildDresser, buildDesk } from "./templatesRooms.js";
import { buildTable } from "./templatesTables.js";
import { buildBlocks } from "./templatesBlocks.js";
export class TemplateBuilder {
    static EPS = 0.01;
    d;
    p;
    // table state (templates_tables.rb instance vars)
    outline = null;
    hb = 0;
    topParts = [];
    ledBase = null;
    constructor(design, params) {
        this.d = design;
        this.p = params;
    }
    run(notes = true) {
        switch (this.p.template) {
            case "free":
                this.buildFree();
                break;
            case "washer_tower":
                this.buildWasherTower();
                break;
            case "tv_unit":
                buildTv(this);
                break;
            case "tv_wall":
                buildTvWall(this);
                break;
            case "bed":
                buildBed(this);
                break;
            case "dresser":
                buildDresser(this);
                break;
            case "desk":
                buildDesk(this);
                break;
            case "blocks":
                buildBlocks(this);
                break;
            default:
                if (TableSpec.KEYS.includes(this.p.template))
                    buildTable(this);
                else
                    this.buildCabinet();
        }
        if (notes)
            this.wetNotes();
    }
    get t() { return this.p.thickness; }
    get ft() { return this.p.front_thickness; }
    get w() { return this.p.width; }
    get h() { return this.p.height; }
    get dp() { return this.p.depth; }
    get g() { return this.p.front_gap; }
    get wall() { return this.p.mount === "wall"; }
    get gola() { return this.p.handle === "gola"; }
    box(x0, y0, z0, x1, y1, z1) { return this.d.box(x0, y0, z0, x1, y1, z1); }
    add(name, role, mat, bx, o = {}) { return this.d.addPart(name, role, mat, bx, o); }
    /** v106: the built-in aluminium handle with its real section, in the gap [zb, zt] behind the fronts (carcass front plane y = 0):
     *  "L" under the top of the unit, "C" between two fronts. x0..x1 = the run between the sides. */
    golaProfile(kind, x0, x1, zb, zt) {
        const D = 2.5, a = 0.2, lip = 0.6, ov = 0.6;
        const pts = kind === "L"
            ? [[0, zt], [D, zt], [D, zb - 1.0], [D - a, zb - 1.0], [D - a, zt - a], [a, zt - a], [a, zt - lip], [0, zt - lip]]
            : [[0, zt + ov], [D, zt + ov], [D, zb - ov], [0, zb - ov], [0, zb - ov + a], [D - a, zb - ov + a], [D - a, zt + ov - a], [0, zt + ov - a]];
        const zs = pts.map((q) => q[1]);
        this.add(this.d.seqName(kind === "L" ? "بروفايل مقبض L" : "بروفايل مقبض C"), "handle", "handle", this.box(x0, 0.0, Math.min(...zs), x1, D, Math.max(...zs)), {
            cut_piece: false, layer: "front", shape: { type: "profile_x", points: pts.map(([y, z]) => [rround(y, 4), rround(z, 4)]), x0, x1 },
        });
        const k = `بروفايل مقبض بلت إن ${kind === "L" ? "L (فوق)" : "C (بين وشين)"} (متر طولي)`;
        this.d.hardware[k] = rround((this.d.hardware[k] ?? 0) + (x1 - x0) / 100.0, 3);
    }
    get backOn() { return !!this.p.back.enabled; }
    backFrontY() {
        if (!this.backOn)
            return this.dp;
        return this.dp - this.p.back.inset - this.p.back.thickness;
    }
    plinthH() {
        return this.wall ? 0.0 : Number(this.p.plinth.height);
    }
    // ================================================================ carcass
    buildCarcass(zb, zt, topStyle = this.p.top, bottom = true) {
        const { t, w, dp } = this;
        const sideBand = ["front"];
        if (this.wall)
            sideBand.push("bottom");
        if (this.wall && topStyle === "rails")
            sideBand.push("top");
        const sides = [];
        for (const [nm, x0, x1] of [["جنب شمال", 0.0, t], ["جنب يمين", w - t, w]]) {
            sides.push(this.add(nm, "side", "carcass", this.box(x0, 0.0, zb, x1, dp, zt), { label_axes: ["y", "z"], band: sideBand, grain: "z" }));
        }
        let innerZ0 = zb;
        const horizontals = [];
        if (bottom) {
            horizontals.push(this.add("قاعدة", "horizontal", "carcass", this.box(t, 0.0, zb, w - t, dp, zb + t), { label_axes: ["x", "y"], band: ["front"], grain: "x" }));
            innerZ0 = zb + t;
        }
        if (topStyle === "rails") {
            const rw = this.p.rail_width;
            if (rw * 2 > dp - 1) {
                this.d.errors.push(`عرض الشريط العلوي (${fmt(rw)}) كبير على عمق الوحدة (${fmt(dp)}).`);
            }
            else {
                horizontals.push(this.add("شريط علوي أمامي", "horizontal", "carcass", this.box(t, 0.0, zt - t, w - t, rw, zt), { label_axes: ["x", "y"], band: ["front"], grain: "x" }));
                horizontals.push(this.add("شريط علوي خلفي", "horizontal", "carcass", this.box(t, dp - rw, zt - t, w - t, dp, zt), { label_axes: ["x", "y"], band: [], grain: "x" }));
            }
        }
        else {
            horizontals.push(this.add("رأس", "horizontal", "carcass", this.box(t, 0.0, zt - t, w - t, dp, zt), { label_axes: ["x", "y"], band: ["front"], grain: "x" }));
        }
        const innerZ1 = zt - t;
        if (this.backOn)
            this.buildBack(zb + (bottom ? t : 0.0), zt - t, sides, horizontals);
        return { x0: t, x1: w - t, z0: innerZ0, z1: innerZ1, y1: this.backFrontY(), sides };
    }
    buildBack(zIn0, zIn1, sides, horizontals) {
        const { t, w, dp } = this;
        const b = this.p.back;
        const bt = b.thickness;
        const gd = b.groove_depth;
        const y0 = dp - b.inset - bt;
        const y1 = dp - b.inset;
        if (y0 < 1) {
            this.d.errors.push("الظهر مش داخل في العمق — راجع بعد الظهر عن الورا.");
            return;
        }
        const gy = (y0 + y1) / 2.0;
        this.add("ظهر", "back", "back", this.box(t - gd, y0, zIn0 - gd, w - t + gd, y1, zIn1 + gd), { label_axes: ["x", "z"], band: [] });
        if (gd <= TemplateBuilder.EPS)
            return;
        for (const pt of [...sides, ...horizontals]) {
            if (!(pt.box.y0 <= gy && pt.box.y1 >= gy))
                continue;
            const run = pt.role === "side" ? "z" : "x";
            pt.label.groove = this.d.grooveFor(pt.box, pt.axes, run, gy);
        }
    }
    buildPlinth() {
        const ph = this.plinthH();
        if (ph <= TemplateBuilder.EPS)
            return;
        if (this.p.plinth.style === "legs") {
            inc(this.d.hardware, `رجل معدن ظاهرة ${fmt(ph)} سم`, this.w > 100 ? 6 : 4);
            return;
        }
        const sb = this.p.plinth.setback;
        this.add("وزرة أمامية", "plinth", "plinth", this.box(0.0, sb, 0.0, this.w, sb + this.t, ph), {
            label_axes: ["x", "z"], band: ["top"], grain: "x", layer: "plinth", note: "بتتركب بكليبس على الرجول في الآخر",
        });
        const legs = this.w > 80 ? 6 : 4;
        inc(this.d.hardware, `رجل بلاستيك ${fmt(ph)} سم`, legs);
        inc(this.d.hardware, "كليبس وزرة", legs > 4 ? 3 : 2);
    }
    mountHardware() {
        if (!this.wall)
            return;
        inc(this.d.hardware, "معلاق وحدة معلّقة (طقم يمين + شمال)", 1);
        this.d.notes.push("الوحدة معلّقة: اتأكد إن الحيطة تشيل (طوب مصمت) واستخدم خوابير مناسبة.");
        if (this.w > 120)
            this.d.warnings.push(`وحدة معلّقة عرضها ${fmt(this.w)} سم — زوّد شريط تعليق خلفي أو معلاق تالت.`);
    }
    // ================================================================ generic cabinet
    buildCabinet() {
        const { t, w, h } = this;
        const zb = this.plinthH();
        const zt = h;
        if (zt - zb < 3 * t + 5) {
            this.d.errors.push(`الارتفاع (${fmt(h)}) صغير على الوحدة بعد السكلو.`);
            return;
        }
        if (w < 2 * t + 5) {
            this.d.errors.push(`العرض (${fmt(w)}) صغير قوي.`);
            return;
        }
        const inner = this.buildCarcass(zb, zt);
        this.buildPlinth();
        this.mountHardware();
        this.buildFronts(inner, zb, zt);
        if (this.p.led_under)
            this.d.addLed("ليد تحت الوحدة", this.box(t + 2, 3.0, zb - 0.5, w - t - 2, 4.6, zb));
        if (this.p.template === "vanity")
            this.vanityNotes();
    }
    // ================================================================ washer tower
    buildWasherTower() {
        const { t, w, h, dp } = this;
        const gh = this.p.washer.gap_height;
        const gapW = w - 2 * t;
        if (gh + 3 * t + 15 > h) {
            this.d.errors.push(`الارتفاع (${fmt(h)}) مش كفاية لمكان غسالة ${fmt(gh)} سم + دولاب فوقها.`);
            return;
        }
        if (gapW < 62 - TemplateBuilder.EPS)
            this.d.warnings.push(`عرض مكان الغسالة ${fmt(gapW)} سم — الغسالة العادية 60 ومحتاجة 1 سم من كل ناحية على الأقل.`);
        if (dp < 63)
            this.d.warnings.push(`عمق ${fmt(dp)} سم — الغسالة عمقها ~60 + خراطيم ورا؛ 65 هو المعيار.`);
        const sides = [];
        for (const [nm, x0, x1] of [["جنب شمال", 0.0, t], ["جنب يمين", w - t, w]]) {
            sides.push(this.add(nm, "side", "carcass", this.box(x0, 0.0, 0.0, x1, dp, h), { label_axes: ["y", "z"], band: ["front", "bottom"], grain: "z" }));
        }
        const horizontals = [];
        horizontals.push(this.add("رأس", "horizontal", "carcass", this.box(t, 0.0, h - t, w - t, dp, h), { label_axes: ["x", "y"], band: ["front"], grain: "x" }));
        horizontals.push(this.add("قاعدة الدولاب العلوي", "horizontal", "carcass", this.box(t, 0.0, gh, w - t, dp, gh + t), {
            label_axes: ["x", "y"], band: ["front"], grain: "x", note: "تحتها الغسالة — سيب خلوص 2 سم فوق الغسالة",
        }));
        if (this.backOn)
            this.buildBack(gh + t, h - t, sides, horizontals);
        inc(this.d.hardware, "زاوية تثبيت في الحيطة", 2);
        this.d.notes.push("ثبّت الجنبين في الحيطة (زاويتين) — الوحدة مفتوحة من تحت ومالهاش قاعدة.");
        this.d.notes.push("سيب فتحة في الظهر أو مسافة ورا لخراطيم الغسالة والكهرباء.");
        const inner = { x0: t, x1: w - t, z0: gh + t, z1: h - t, y1: this.backFrontY(), sides };
        this.buildFronts(inner, gh, h);
    }
    // ================================================================ free panels
    buildFree() {
        for (const pn of this.p.panels) {
            const bx = this.box(pn.x, pn.y, pn.z, pn.x + pn.w, pn.y + pn.d, pn.z + pn.h);
            const role = pn.role;
            const layer = { back: "back", door: "front", shelf: "shelf", plinth: "plinth" }[role] ?? "carcass";
            this.add(pn.name, role, pn.material, bx, { band: pn.band, grain: pn.grain ?? null, layer, group: pn.group ?? null, door_label: pn.door_label ?? null });
        }
        if (!this.d.parts.length)
            return;
        const pts = this.d.parts;
        const span = (a) => Math.max(...pts.map((pt) => pt.box[`${a}1`])) - Math.min(...pts.map((pt) => pt.box[`${a}0`]));
        this.p.width = rround(span("x"), 2);
        this.p.depth = rround(span("y"), 2);
        this.p.height = rround(span("z"), 2);
    }
    // ================================================================ fronts
    buildFronts(inner, fz0, fz1) {
        const { t, w, g } = this;
        const zones = this.p.fronts;
        if (!zones.length)
            return;
        const total = fz1 - fz0;
        const fixed = sum(zones.filter((z) => z.height !== "auto").map((z) => Number(z.height)));
        const autos = zones.filter((z) => z.height === "auto").length;
        if (autos === 0 && Math.abs(fixed - total) > 0.05) {
            this.d.errors.push(`مجموع ارتفاعات الواجهة (${fmt(fixed)}) لازم يساوي ارتفاع الواجهة (${fmt(total)}) — أو خلّي جزء منهم auto.`);
            return;
        }
        const autoH = autos === 0 ? 0 : (total - fixed) / autos;
        if (autos > 0 && autoH < 8) {
            this.d.errors.push(`مفيش مكان كفاية للأجزاء الأوتوماتيك في الواجهة (فاضل ${fmt(total - fixed)} سم).`);
            return;
        }
        let z = fz0;
        const bounds = zones.map((zn) => {
            const zh = zn.height === "auto" ? autoH : Number(zn.height);
            const r = [z, z + zh];
            z += zh;
            return r;
        });
        const floors = [inner.z0];
        const ceilings = [];
        bounds.slice(0, -1).forEach(([, zb], i) => {
            const zc = zb;
            if (zc - t / 2 < inner.z0 + 3 || zc + t / 2 > inner.z1 - 3) {
                this.d.errors.push(`الفاصل بين الجزء ${i + 1} و${i + 2} قريب قوي من قاعدة أو رأس الوحدة.`);
                return;
            }
            this.add(this.d.seqName("رف ثابت"), "fixed_shelf", "carcass", this.box(inner.x0, 0.0, zc - t / 2, inner.x1, inner.y1, zc + t / 2), {
                label_axes: ["x", "y"], band: ["front"], grain: "x",
            });
            ceilings.push(zc - t / 2);
            floors.push(zc + t / 2);
        });
        ceilings.push(inner.z1);
        zones.forEach((zn, i) => {
            const [za, zb] = bounds[i];
            if (this.d.module_tag === null)
                this.d.zone_marks.push({ index: i, x0: 0.0, x1: w, z0: za, z1: zb, type: zn.type });
            const cell = { x0: inner.x0, x1: inner.x1, z0: floors[i] ?? inner.z0, z1: ceilings[i] ?? inner.z1, y1: inner.y1, sides: inner.sides };
            const frZ0 = za + g / 2.0;
            const frZ1 = zb - (this.gola && zn.type !== "open" ? 4.0 : g / 2.0);
            switch (zn.type) {
                case "doors":
                    this.buildDoors(zn, cell, frZ0, frZ1, i);
                    break;
                case "flap":
                    this.buildFlap(frZ0, frZ1);
                    break;
                case "drawers":
                    this.buildDrawers(zn, cell, frZ0, zb, i, i === zones.length - 1);
                    break;
            }
            if (["doors", "flap", "open"].includes(zn.type))
                this.buildShelves(zn, cell);
            if (zn.led && zn.type !== "drawers") {
                this.d.addLed(this.d.seqName("ليد خانة"), this.box(cell.x0 + 1.5, 2.0, cell.z1 - 0.5, cell.x1 - 1.5, 3.6, cell.z1));
            }
            if (this.gola && zn.type !== "open" && zn.type !== "drawers")
                this.golaProfile(i === zones.length - 1 ? "L" : "C", cell.x0, cell.x1, frZ1, zb);
        });
    }
    frontMat() {
        return "front";
    }
    handleHw(count) {
        if (this.p.handle === "bar")
            inc(this.d.hardware, "مقبض", count);
        else if (this.p.handle === "push")
            inc(this.d.hardware, "Push تاتش", count);
    }
    doorNote() {
        if (this.p.handle === "bar")
            return "مقبض: اتأكد من المسافة وخرّمه في الموقع أو على الماكينة";
        if (this.p.handle === "gola")
            return "ناقصة 4 سم من فوق لبروفايل الجولا";
        return null;
    }
    buildDoors(zn, _cell, z0, z1, idx) {
        const { w, g } = this;
        const n = zn.count;
        const xa = g / 2.0;
        const xb = w - g / 2.0;
        let spans;
        if (n === 1)
            spans = [[xa, xb, zn.hinge]];
        else {
            const mid = w / 2.0;
            spans = [[xa, mid - g / 2.0, "left"], [mid + g / 2.0, xb, "right"]];
        }
        for (const [x0, x1, side] of spans)
            this.addDoor(this.d.seqName("ضلفة"), x0, x1, z0, z1, side);
        if (n === 1 && xb - xa > 60)
            this.d.warnings.push(`ضلفة عرضها أكتر من 60 سم في الجزء ${idx + 1} — الأحسن تبقى ضلفتين.`);
    }
    hingePositions(len) {
        const e = this.p.hinge_edge;
        const n = Catalog.hingeCount(len);
        if (len < 2 * e + 2)
            return null;
        return Array.from({ length: n }, (_, i) => e + ((len - 2 * e) * i) / (n - 1));
    }
    addDoor(name, x0, x1, z0, z1, side, flip = false) {
        const fy0 = -this.ft;
        const fy1 = 0.0;
        const len = flip ? x1 - x0 : z1 - z0;
        const pos = this.hingePositions(len);
        if (!pos) {
            this.d.errors.push(`${name}: ${flip ? "عرضها" : "ارتفاعها"} ${fmt(len)} سم مش كفاية للمفصلات.`);
            return;
        }
        const ratios = pos.map((p) => rround(p / len, 4));
        const key = `door${this.d.groups.length + 1}`;
        let hinge;
        if (flip) {
            const mx = (x0 + x1) / 2.0;
            hinge = { point: [mx, fy0, z1], axis: [1, 0, 0], free: [mx, fy0, z0], normal: [0, -1, 0] };
        }
        else {
            const [hx, fx] = side === "left" ? [x0, x1] : [x1, x0];
            hinge = { point: [hx, fy0, 0.0], axis: [0, 0, 1], free: [fx, fy0, 0.0], normal: [0, -1, 0] };
        }
        this.d.addGroup({ key, kind: "door", name, hinge_side: flip ? "top" : side, hinge, box: this.box(x0, fy0, z0, x1, fy1, z1), style: this.p.front_style });
        this.add(name, "door", this.frontMat(), this.box(x0, fy0, z0, x1, fy1, z1), {
            label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true, layer: "front", group: key, grain: "z",
            note: this.doorNote(), door_label: { hinge_side: flip ? "top" : side, hinge_ratios: ratios },
        });
        inc(this.d.hardware, flip ? "مفصلة قلاب" : "مفصلة سوفت كلوز 35 مم", pos.length);
        this.handleHw(1);
        if (this.p.front_style !== "mirror")
            return;
        const mt = 0.4;
        this.add(`مراية ${name}`, "mirror", "mirror", this.box(x0, fy0 - mt, z0, x1, fy0, z1), { layer: "front", group: key, cut_piece: false });
        this.pushUniqNote("المرايات بتتلزق على الضلف بسيليكون مرايات (مش عادي).");
        inc(this.d.hardware, `مراية ${fmt(x1 - x0)}×${fmt(z1 - z0)} سم`, 1);
    }
    /** (notes << x).uniq! */
    pushUniqNote(n) {
        this.d.notes.push(n);
        const u = [...new Set(this.d.notes)];
        this.d.notes.length = 0;
        this.d.notes.push(...u);
    }
    buildFlap(z0, z1) {
        const name = this.d.seqName("ضلفة قلاب");
        this.addDoor(name, this.g / 2.0, this.w - this.g / 2.0, z0, z1, "top", true);
        inc(this.d.hardware, "ذراع رفع قلاب (طقم)", 1);
    }
    buildShelves(zn, cell) {
        const t = this.t;
        const n = Math.trunc(Number(zn.shelves));
        if (n <= 0)
            return;
        const setback = zn.type === "open" ? 0.0 : 1.0;
        const x0 = cell.x0 + 0.1;
        const x1 = cell.x1 - 0.1;
        const y0 = setback;
        const y1 = cell.y1 - 0.2;
        const space = cell.z1 - cell.z0;
        if (space < (n + 1) * 8 + n * t) {
            this.d.errors.push(`مفيش مكان لـ ${n} رف في الخانة (${fmt(space)} سم).`);
            return;
        }
        if (x1 - x0 > 90)
            this.d.warnings.push(`رف طوله ${fmt(x1 - x0)} سم من غير قاطوع — الأقصى 90 سم وإلا هيقوّس.`);
        const pitch = (space - n * t) / (n + 1);
        for (let i = 0; i < n; i++) {
            const zb = cell.z0 + pitch * (i + 1) + t * i;
            this.add(this.d.seqName("رف"), "shelf", "shelf", this.box(x0, y0, zb, x1, y1, zb + t), { label_axes: ["x", "y"], band: ["front"], layer: "shelf", grain: "x" });
            for (const py of [y0 + 5.0, y1 - 5.0]) {
                for (const sd of cell.sides ?? [])
                    this.d.attachHole(sd, { x: sd.box.x0, y: py, z: zb }, 0.5, "pin");
            }
            inc(this.d.hardware, "بنز رف", 4);
        }
    }
    buildDrawers(zn, cell, zoneZ0, zoneZ1, idx, topZone = true) {
        const { w, g, ft } = this;
        const n = zn.count;
        const dr = this.p.drawer;
        const bt = dr.box_thickness;
        const bb = dr.bottom_thickness;
        const gd = dr.groove_depth;
        const sc = dr.slide_clearance;
        const between = this.gola ? 4.0 : g;
        const topGap = this.gola ? 4.0 : g / 2.0;
        const span = zoneZ1 - topGap - zoneZ0;
        const fh = (span - (n - 1) * between) / n;
        if (fh < 8) {
            this.d.errors.push(`الجزء ${idx + 1}: وش الدرج طلع ${fmt(fh)} سم — قلّل عدد الأدراج أو كبّر الارتفاع.`);
            return;
        }
        const slide = Catalog.slideFor(cell.y1 - 1.0);
        if (!slide) {
            this.d.errors.push(`الجزء ${idx + 1}: العمق الصافي ${fmt(cell.y1)} سم مش كفاية لأقصر مجرى (30 سم).`);
            return;
        }
        const bx0 = cell.x0 + sc;
        const bx1 = cell.x1 - sc;
        if (bx1 - bx0 < 2 * bt + 5) {
            this.d.errors.push(`الجزء ${idx + 1}: الوحدة ضيقة على صندوق درج.`);
            return;
        }
        for (let i = 0; i < n; i++) {
            const f0 = zoneZ0 + i * (fh + between);
            const f1 = f0 + fh;
            if (this.gola)
                this.golaProfile(i < n - 1 || !topZone ? "C" : "L", cell.x0, cell.x1, f1, i < n - 1 ? f1 + between : zoneZ1);
            const name = this.d.seqName("درج");
            const key = `drawer${this.d.groups.length + 1}`;
            const z0 = Math.max(f0 + 1.0, cell.z0 + 1.0);
            const z1 = Math.min(f1 - 2.5, cell.z1 - 1.5);
            const hb = z1 - z0;
            if (hb < 6) {
                this.d.errors.push(`${name}: صندوق الدرج طلع ارتفاعه ${fmt(hb)} سم بس.`);
                continue;
            }
            this.d.addGroup({ key, kind: "drawer", name, open_distance: rround(slide * 0.75, 2), slide_len: slide });
            const glassHere = zn.glass === true || (Array.isArray(zn.glass) && zn.glass.includes(i + 1));
            const fx0 = g / 2.0, fx1 = w - g / 2.0;
            if (glassHere) {
                // NOVERA v53: a glass drawer front — a wood frame (4 rails) with a 4 mm glass panel in a groove; pulled from the top rail, no handle.
                // the frame IS the drawer's front wall: the box sides screw into the back of the stiles, the bottom runs into the bottom rail's groove
                const W = fx1 - fx0, H = f1 - f0, fw = Math.min(4.0, W / 4.0, H / 3.0), eng = 0.8, gt = 0.4;
                // v110: the bottom rail reaches 0.5 cm over the box bottom's top, so the bottom really runs in its groove
                const fwB = Math.min(Math.max(fw, z0 + 1.0 + bb + 0.5 - f0), H / 2.0);
                const gnote = `فريم وش درج زجاج: مفحار ${fmt(gt * 10 + 1)} مم عرض × 8 مم عمق في نص السمك على الحرف الداخلي، الزجاج بيتركب أثناء تجميع الفريم (دويلين في الأركان)`;
                const rails = [["فوق", fx0, f1 - fw, fx1, f1, "الحرف اللي تحت ليه مفحار الزجاج — الحرف اللي فوق هو مسكة السحب"], ["تحت", fx0, f0, fx1, f0 + fwB, "مفحار الزجاج فوق، ومفحار قاعدة الدرج من ورا"],
                    ["شمال", fx0, f0 + fwB, fx0 + fw, f1 - fw, "جنب الصندوق بيتثبت في ضهره بدويلين ومسمارين"], ["يمين", fx1 - fw, f0 + fwB, fx1, f1 - fw, "جنب الصندوق بيتثبت في ضهره بدويلين ومسمارين"]];
                for (const [lbl, a0, b0, a1, b1, extra] of rails) {
                    this.add(`فريم ${lbl} ${name}`, "door", this.frontMat(), this.box(a0, -ft, b0, a1, 0.0, b1), {
                        label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true, layer: "front", group: key, grain: lbl === "فوق" || lbl === "تحت" ? "x" : "z", note: `${gnote} · ${extra}`,
                    });
                }
                this.add(`زجاج وش ${name}`, "door", "glass", this.box(fx0 + fw - eng, -ft / 2.0 - gt / 2.0, f0 + fwB - eng, fx1 - fw + eng, -ft / 2.0 + gt / 2.0, f1 - fw + eng), {
                    label_axes: ["x", "z"], band: [], layer: "front", group: key,
                });
                inc(this.d.hardware, "دوبل خشب 8 مم (فريم زجاج)", 8);
            }
            else {
                this.add(`وش ${name}`, "door", this.frontMat(), this.box(fx0, -ft, f0, fx1, 0.0, f1), {
                    label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true, layer: "front", group: key, grain: "x", note: this.doorNote(),
                });
                this.handleHw(1);
            }
            const gz = z0 + 1.0 + bb / 2.0;
            for (const [sd, x0, x1] of [["شمال", bx0, bx0 + bt], ["يمين", bx1 - bt, bx1]]) {
                const bx = this.box(x0, 0.0, z0, x1, slide, z1);
                const pt = this.add(`جنب ${name} ${sd}`, "drawer_box", "drawer_box", bx, { label_axes: ["y", "z"], band: ["top"], group: key, grain: "y" });
                pt.label.groove = this.d.grooveFor(bx, pt.axes, "y", gz);
            }
            // a glass front: the frame itself is the front wall — no wood wall behind the glass
            for (const [nm, y0, y1] of (glassHere ? [["خلفي", slide - bt, slide]] : [["أمامي", 0.0, bt], ["خلفي", slide - bt, slide]])) {
                const bx = this.box(bx0 + bt, y0, z0, bx1 - bt, y1, z1);
                const pt = this.add(`${nm} صندوق ${name}`, "drawer_box", "drawer_box", bx, { label_axes: ["x", "z"], band: ["top"], group: key, grain: "x" });
                pt.label.groove = this.d.grooveFor(bx, pt.axes, "x", gz);
            }
            const by0 = glassHere ? -gd : bt - gd; // v110: into the groove in the bottom rail's BACK face (it started near the frame's front face)
            this.add(`قاعدة ${name}`, "drawer_bottom", "drawer_bottom", this.box(bx0 + bt - gd, by0, z0 + 1.0, bx1 - bt + gd, slide - bt + gd, z0 + 1.0 + bb), { label_axes: ["x", "y"], band: [], group: key, note: glassHere ? "القاعدة بتدخل في مفحار الفريم التحتاني من قدام" : undefined });
            inc(this.d.hardware, `مجرى تاندم مخفي سوفت كلوز ${slide} سم (زوج)`, 1);
            inc(this.d.hardware, "دوبل صندوق درج", 8);
        }
        this.pushUniqNote("صناديق الأدراج بتتجمع دوبل + غراء (مش أليتا).");
    }
    // ================================================================ notes
    vanityNotes() {
        this.d.notes.push("سطح الحوض المعتاد 85 سم من الأرض — ركّب الوحدة المعلّقة بحيث رأسها على (85 - سمك الحوض).");
        if (!this.p.siphon_cut)
            return;
        const back = this.d.parts.find((pt) => pt.role === "back");
        if (back)
            back.note = [back.note, "فتحة مواسير الصرف والتغذية — تتقص في الموقع حسب مكانهم"].filter((x) => x != null).join(" | ");
        for (const pt of this.d.parts.filter((pt) => pt.name.startsWith("خلفي صندوق درج 1") || pt.name.startsWith("قاعدة درج 1"))) {
            pt.note = [pt.note, "قص U للسيفون — اتأكد من مكان الصرف"].filter((x) => x != null).join(" | ");
        }
        this.d.warnings.push("وحدة الحوض: قيس مكان الصرف في الموقع قبل قص فتحة السيفون في الظهر/الدرج.");
    }
    wetNotes() {
        if (this.p.environment !== "wet")
            return;
        this.d.notes.push("بيئة رطبة: كل الحروف تتقفل بشريط PVC (حتى المستخبية) وسيليكون على الحرف اللي على الأرض أو جنب الحوض.");
        this.d.notes.push("المفصلات والمجاري والمسامير ستانلس أو مجلفنة.");
    }
}
