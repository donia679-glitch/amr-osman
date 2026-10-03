// Port of lib/panel_engine/templates.rb (+ rooms and tables in sibling files).
// Every template adds parts on a Design; all share the same carcass/fronts/shelves pieces.
import { fmt, inc, type Dict } from "../core/ruby.ts";
import { rround, sum } from "../core/rubyMath.ts";
import * as Catalog from "./catalog.ts";
import * as TableSpec from "./tableSpec.ts";
import { Design, type Axis, type Box, type End, type Part, type PartOpts } from "./design.ts";
import { buildTv, buildBed, buildDresser, buildDesk } from "./templatesRooms.ts";
import { buildTable } from "./templatesTables.ts";

export interface Inner { x0: number; x1: number; z0: number; z1: number; y1: number; sides: Part[] }

export class TemplateBuilder {
  static EPS = 0.01;
  d: Design;
  p: Dict;
  // table state (templates_tables.rb instance vars)
  outline: [number, number][] | null = null;
  hb = 0;
  topParts: Part[] = [];
  ledBase: [number, number, number, number] | null = null;

  constructor(design: Design, params: Dict) {
    this.d = design;
    this.p = params;
  }

  run(notes = true): void {
    switch (this.p.template) {
      case "free": this.buildFree(); break;
      case "washer_tower": this.buildWasherTower(); break;
      case "tv_unit": buildTv(this); break;
      case "bed": buildBed(this); break;
      case "dresser": buildDresser(this); break;
      case "desk": buildDesk(this); break;
      default:
        if (TableSpec.KEYS.includes(this.p.template)) buildTable(this);
        else this.buildCabinet();
    }
    if (notes) this.wetNotes();
  }

  get t(): number { return this.p.thickness; }
  get ft(): number { return this.p.front_thickness; }
  get w(): number { return this.p.width; }
  get h(): number { return this.p.height; }
  get dp(): number { return this.p.depth; }
  get g(): number { return this.p.front_gap; }
  get wall(): boolean { return this.p.mount === "wall"; }
  get gola(): boolean { return this.p.handle === "gola"; }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box { return this.d.box(x0, y0, z0, x1, y1, z1); }
  add(name: string, role: string, mat: string, bx: Box, o: PartOpts = {}): Part { return this.d.addPart(name, role, mat, bx, o); }

  get backOn(): boolean { return !!this.p.back.enabled; }

  backFrontY(): number {
    if (!this.backOn) return this.dp;
    return this.dp - this.p.back.inset - this.p.back.thickness;
  }

  plinthH(): number {
    return this.wall ? 0.0 : Number(this.p.plinth.height);
  }

  // ================================================================ carcass
  buildCarcass(zb: number, zt: number, topStyle: string = this.p.top, bottom = true): Inner {
    const { t, w, dp } = this;
    const sideBand: End[] = ["front"];
    if (this.wall) sideBand.push("bottom");
    if (this.wall && topStyle === "rails") sideBand.push("top");
    const sides: Part[] = [];
    for (const [nm, x0, x1] of [["جنب شمال", 0.0, t], ["جنب يمين", w - t, w]] as [string, number, number][]) {
      sides.push(this.add(nm, "side", "carcass", this.box(x0, 0.0, zb, x1, dp, zt), { label_axes: ["y", "z"], band: sideBand, grain: "z" }));
    }
    let innerZ0 = zb;
    const horizontals: Part[] = [];
    if (bottom) {
      horizontals.push(this.add("قاعدة", "horizontal", "carcass", this.box(t, 0.0, zb, w - t, dp, zb + t), { label_axes: ["x", "y"], band: ["front"], grain: "x" }));
      innerZ0 = zb + t;
    }
    if (topStyle === "rails") {
      const rw = this.p.rail_width;
      if (rw * 2 > dp - 1) {
        this.d.errors.push(`عرض الشريط العلوي (${fmt(rw)}) كبير على عمق الوحدة (${fmt(dp)}).`);
      } else {
        horizontals.push(this.add("شريط علوي أمامي", "horizontal", "carcass", this.box(t, 0.0, zt - t, w - t, rw, zt), { label_axes: ["x", "y"], band: ["front"], grain: "x" }));
        horizontals.push(this.add("شريط علوي خلفي", "horizontal", "carcass", this.box(t, dp - rw, zt - t, w - t, dp, zt), { label_axes: ["x", "y"], band: [], grain: "x" }));
      }
    } else {
      horizontals.push(this.add("رأس", "horizontal", "carcass", this.box(t, 0.0, zt - t, w - t, dp, zt), { label_axes: ["x", "y"], band: ["front"], grain: "x" }));
    }
    const innerZ1 = zt - t;
    if (this.backOn) this.buildBack(zb + (bottom ? t : 0.0), zt - t, sides, horizontals);
    return { x0: t, x1: w - t, z0: innerZ0, z1: innerZ1, y1: this.backFrontY(), sides };
  }

  buildBack(zIn0: number, zIn1: number, sides: Part[], horizontals: Part[]): void {
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
    if (gd <= TemplateBuilder.EPS) return;
    for (const pt of [...sides, ...horizontals]) {
      if (!(pt.box.y0 <= gy && pt.box.y1 >= gy)) continue;
      const run: Axis = pt.role === "side" ? "z" : "x";
      pt.label!.groove = this.d.grooveFor(pt.box, pt.axes, run, gy);
    }
  }

  buildPlinth(): void {
    const ph = this.plinthH();
    if (ph <= TemplateBuilder.EPS) return;
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

  mountHardware(): void {
    if (!this.wall) return;
    inc(this.d.hardware, "معلاق وحدة معلّقة (طقم يمين + شمال)", 1);
    this.d.notes.push("الوحدة معلّقة: اتأكد إن الحيطة تشيل (طوب مصمت) واستخدم خوابير مناسبة.");
    if (this.w > 120) this.d.warnings.push(`وحدة معلّقة عرضها ${fmt(this.w)} سم — زوّد شريط تعليق خلفي أو معلاق تالت.`);
  }

  // ================================================================ generic cabinet
  buildCabinet(): void {
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
    if (this.p.led_under) this.d.addLed("ليد تحت الوحدة", this.box(t + 2, 3.0, zb - 0.5, w - t - 2, 4.6, zb));
    if (this.p.template === "vanity") this.vanityNotes();
  }

  // ================================================================ washer tower
  buildWasherTower(): void {
    const { t, w, h, dp } = this;
    const gh = this.p.washer.gap_height;
    const gapW = w - 2 * t;
    if (gh + 3 * t + 15 > h) {
      this.d.errors.push(`الارتفاع (${fmt(h)}) مش كفاية لمكان غسالة ${fmt(gh)} سم + دولاب فوقها.`);
      return;
    }
    if (gapW < 62 - TemplateBuilder.EPS) this.d.warnings.push(`عرض مكان الغسالة ${fmt(gapW)} سم — الغسالة العادية 60 ومحتاجة 1 سم من كل ناحية على الأقل.`);
    if (dp < 63) this.d.warnings.push(`عمق ${fmt(dp)} سم — الغسالة عمقها ~60 + خراطيم ورا؛ 65 هو المعيار.`);
    const sides: Part[] = [];
    for (const [nm, x0, x1] of [["جنب شمال", 0.0, t], ["جنب يمين", w - t, w]] as [string, number, number][]) {
      sides.push(this.add(nm, "side", "carcass", this.box(x0, 0.0, 0.0, x1, dp, h), { label_axes: ["y", "z"], band: ["front", "bottom"], grain: "z" }));
    }
    const horizontals: Part[] = [];
    horizontals.push(this.add("رأس", "horizontal", "carcass", this.box(t, 0.0, h - t, w - t, dp, h), { label_axes: ["x", "y"], band: ["front"], grain: "x" }));
    horizontals.push(this.add("قاعدة الدولاب العلوي", "horizontal", "carcass", this.box(t, 0.0, gh, w - t, dp, gh + t), {
      label_axes: ["x", "y"], band: ["front"], grain: "x", note: "تحتها الغسالة — سيب خلوص 2 سم فوق الغسالة",
    }));
    if (this.backOn) this.buildBack(gh + t, h - t, sides, horizontals);
    inc(this.d.hardware, "زاوية تثبيت في الحيطة", 2);
    this.d.notes.push("ثبّت الجنبين في الحيطة (زاويتين) — الوحدة مفتوحة من تحت ومالهاش قاعدة.");
    this.d.notes.push("سيب فتحة في الظهر أو مسافة ورا لخراطيم الغسالة والكهرباء.");
    const inner: Inner = { x0: t, x1: w - t, z0: gh + t, z1: h - t, y1: this.backFrontY(), sides };
    this.buildFronts(inner, gh, h);
  }

  // ================================================================ free panels
  buildFree(): void {
    for (const pn of this.p.panels as Dict[]) {
      const bx = this.box(pn.x, pn.y, pn.z, pn.x + pn.w, pn.y + pn.d, pn.z + pn.h);
      const role = pn.role as string;
      const layer = ({ back: "back", door: "front", shelf: "shelf", plinth: "plinth" } as Dict)[role] ?? "carcass";
      this.add(pn.name, role, pn.material, bx, { band: pn.band, grain: pn.grain ?? null, layer });
    }
    if (!this.d.parts.length) return;
    const pts = this.d.parts;
    const span = (a: Axis) => Math.max(...pts.map((pt) => (pt.box as any)[`${a}1`])) - Math.min(...pts.map((pt) => (pt.box as any)[`${a}0`]));
    this.p.width = rround(span("x"), 2);
    this.p.depth = rround(span("y"), 2);
    this.p.height = rround(span("z"), 2);
  }

  // ================================================================ fronts
  buildFronts(inner: Inner, fz0: number, fz1: number): void {
    const { t, w, g } = this;
    const zones = this.p.fronts as Dict[];
    if (!zones.length) return;
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
      const r: [number, number] = [z, z + zh];
      z += zh;
      return r;
    });
    const floors: number[] = [inner.z0];
    const ceilings: number[] = [];
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
      if (this.d.module_tag === null) this.d.zone_marks.push({ index: i, x0: 0.0, x1: w, z0: za, z1: zb, type: zn.type });
      const cell: Inner = { x0: inner.x0, x1: inner.x1, z0: floors[i] ?? inner.z0, z1: ceilings[i] ?? inner.z1, y1: inner.y1, sides: inner.sides };
      const frZ0 = za + g / 2.0;
      const frZ1 = zb - (this.gola && zn.type !== "open" ? 4.0 : g / 2.0);
      switch (zn.type) {
        case "doors": this.buildDoors(zn, cell, frZ0, frZ1, i); break;
        case "flap": this.buildFlap(frZ0, frZ1); break;
        case "drawers": this.buildDrawers(zn, cell, frZ0, zb, i); break;
      }
      if (["doors", "flap", "open"].includes(zn.type)) this.buildShelves(zn, cell);
      if (zn.led && zn.type !== "drawers") {
        this.d.addLed(this.d.seqName("ليد خانة"), this.box(cell.x0 + 1.5, 2.0, cell.z1 - 0.5, cell.x1 - 1.5, 3.6, cell.z1));
      }
      if (this.gola && zn.type !== "open") {
        const k = "بروفايل جولا (متر)";
        this.d.hardware[k] = rround((this.d.hardware[k] ?? 0) + w / 100.0, 2);
      }
    });
  }

  frontMat(): string {
    return "front";
  }

  handleHw(count: number): void {
    if (this.p.handle === "bar") inc(this.d.hardware, "مقبض", count);
    else if (this.p.handle === "push") inc(this.d.hardware, "Push تاتش", count);
  }

  doorNote(): string | null {
    if (this.p.handle === "bar") return "مقبض: اتأكد من المسافة وخرّمه في الموقع أو على الماكينة";
    if (this.p.handle === "gola") return "ناقصة 4 سم من فوق لبروفايل الجولا";
    return null;
  }

  buildDoors(zn: Dict, _cell: Inner, z0: number, z1: number, idx: number): void {
    const { w, g } = this;
    const n = zn.count;
    const xa = g / 2.0;
    const xb = w - g / 2.0;
    let spans: [number, number, string][];
    if (n === 1) spans = [[xa, xb, zn.hinge]];
    else {
      const mid = w / 2.0;
      spans = [[xa, mid - g / 2.0, "left"], [mid + g / 2.0, xb, "right"]];
    }
    for (const [x0, x1, side] of spans) this.addDoor(this.d.seqName("ضلفة"), x0, x1, z0, z1, side);
    if (n === 1 && xb - xa > 60) this.d.warnings.push(`ضلفة عرضها أكتر من 60 سم في الجزء ${idx + 1} — الأحسن تبقى ضلفتين.`);
  }

  hingePositions(len: number): number[] | null {
    const e = this.p.hinge_edge;
    const n = Catalog.hingeCount(len);
    if (len < 2 * e + 2) return null;
    return Array.from({ length: n }, (_, i) => e + ((len - 2 * e) * i) / (n - 1));
  }

  addDoor(name: string, x0: number, x1: number, z0: number, z1: number, side: string, flip = false): void {
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
    let hinge: Dict;
    if (flip) {
      const mx = (x0 + x1) / 2.0;
      hinge = { point: [mx, fy0, z1], axis: [1, 0, 0], free: [mx, fy0, z0], normal: [0, -1, 0] };
    } else {
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
    if (this.p.front_style !== "mirror") return;
    const mt = 0.4;
    this.add(`مراية ${name}`, "mirror", "mirror", this.box(x0, fy0 - mt, z0, x1, fy0, z1), { layer: "front", group: key, cut_piece: false });
    this.pushUniqNote("المرايات بتتلزق على الضلف بسيليكون مرايات (مش عادي).");
    inc(this.d.hardware, `مراية ${fmt(x1 - x0)}×${fmt(z1 - z0)} سم`, 1);
  }

  /** (notes << x).uniq! */
  pushUniqNote(n: string): void {
    this.d.notes.push(n);
    const u = [...new Set(this.d.notes)];
    this.d.notes.length = 0;
    this.d.notes.push(...u);
  }

  buildFlap(z0: number, z1: number): void {
    const name = this.d.seqName("ضلفة قلاب");
    this.addDoor(name, this.g / 2.0, this.w - this.g / 2.0, z0, z1, "top", true);
    inc(this.d.hardware, "ذراع رفع قلاب (طقم)", 1);
  }

  buildShelves(zn: Dict, cell: Inner): void {
    const t = this.t;
    const n = Math.trunc(Number(zn.shelves));
    if (n <= 0) return;
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
    if (x1 - x0 > 90) this.d.warnings.push(`رف طوله ${fmt(x1 - x0)} سم من غير قاطوع — الأقصى 90 سم وإلا هيقوّس.`);
    const pitch = (space - n * t) / (n + 1);
    for (let i = 0; i < n; i++) {
      const zb = cell.z0 + pitch * (i + 1) + t * i;
      this.add(this.d.seqName("رف"), "shelf", "shelf", this.box(x0, y0, zb, x1, y1, zb + t), { label_axes: ["x", "y"], band: ["front"], layer: "shelf", grain: "x" });
      for (const py of [y0 + 5.0, y1 - 5.0]) {
        for (const sd of cell.sides ?? []) this.d.attachHole(sd, { x: sd.box.x0, y: py, z: zb }, 0.5, "pin");
      }
      inc(this.d.hardware, "بنز رف", 4);
    }
  }

  buildDrawers(zn: Dict, cell: Inner, zoneZ0: number, zoneZ1: number, idx: number): void {
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
      this.add(`وش ${name}`, "door", this.frontMat(), this.box(g / 2.0, -ft, f0, w - g / 2.0, 0.0, f1), {
        label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true, layer: "front", group: key, grain: "x", note: this.doorNote(),
      });
      this.handleHw(1);
      const gz = z0 + 1.0 + bb / 2.0;
      for (const [sd, x0, x1] of [["شمال", bx0, bx0 + bt], ["يمين", bx1 - bt, bx1]] as [string, number, number][]) {
        const bx = this.box(x0, 0.0, z0, x1, slide, z1);
        const pt = this.add(`جنب ${name} ${sd}`, "drawer_box", "drawer_box", bx, { label_axes: ["y", "z"], band: ["top"], group: key, grain: "y" });
        pt.label!.groove = this.d.grooveFor(bx, pt.axes, "y", gz);
      }
      for (const [nm, y0, y1] of [["أمامي", 0.0, bt], ["خلفي", slide - bt, slide]] as [string, number, number][]) {
        const bx = this.box(bx0 + bt, y0, z0, bx1 - bt, y1, z1);
        const pt = this.add(`${nm} صندوق ${name}`, "drawer_box", "drawer_box", bx, { label_axes: ["x", "z"], band: ["top"], group: key, grain: "x" });
        pt.label!.groove = this.d.grooveFor(bx, pt.axes, "x", gz);
      }
      this.add(`قاعدة ${name}`, "drawer_bottom", "drawer_bottom",
        this.box(bx0 + bt - gd, bt - gd, z0 + 1.0, bx1 - bt + gd, slide - bt + gd, z0 + 1.0 + bb), { label_axes: ["x", "y"], band: [], group: key });
      inc(this.d.hardware, `مجرى تاندم مخفي سوفت كلوز ${slide} سم (زوج)`, 1);
      inc(this.d.hardware, "دوبل صندوق درج", 8);
    }
    this.pushUniqNote("صناديق الأدراج بتتجمع دوبل + غراء (مش أليتا).");
  }

  // ================================================================ notes
  vanityNotes(): void {
    this.d.notes.push("سطح الحوض المعتاد 85 سم من الأرض — ركّب الوحدة المعلّقة بحيث رأسها على (85 - سمك الحوض).");
    if (!this.p.siphon_cut) return;
    const back = this.d.parts.find((pt) => pt.role === "back");
    if (back) back.note = [back.note, "فتحة مواسير الصرف والتغذية — تتقص في الموقع حسب مكانهم"].filter((x) => x != null).join(" | ");
    for (const pt of this.d.parts.filter((pt) => pt.name.startsWith("خلفي صندوق درج 1") || pt.name.startsWith("قاعدة درج 1"))) {
      pt.note = [pt.note, "قص U للسيفون — اتأكد من مكان الصرف"].filter((x) => x != null).join(" | ");
    }
    this.d.warnings.push("وحدة الحوض: قيس مكان الصرف في الموقع قبل قص فتحة السيفون في الظهر/الدرج.");
  }

  wetNotes(): void {
    if (this.p.environment !== "wet") return;
    this.d.notes.push("بيئة رطبة: كل الحروف تتقفل بشريط PVC (حتى المستخبية) وسيليكون على الحرف اللي على الأرض أو جنب الحوض.");
    this.d.notes.push("المفصلات والمجاري والمسامير ستانلس أو مجلفنة.");
  }
}
