// Port of lib/panel_engine/templates_tables.rb (v181) — coffee / side / dining / office / meeting / console.
import { fmt, inc, type Dict } from "../core/ruby.ts";
import { rround, maxBy } from "../core/rubyMath.ts";
import * as Catalog from "./catalog.ts";
import * as TableSpec from "./tableSpec.ts";
import { AXES, type Axis, type Box, type Part, type PartOpts } from "./design.ts";
import type { TemplateBuilder } from "./templates.ts";
import { subUnit } from "./templatesRooms.ts";

const ARC_SEGS = 12;
const ROUND_SEGS = 72;
type Pt = [number, number];

const tbl = (tb: TemplateBuilder): Dict => tb.p.table;

export function buildTable(tb: TemplateBuilder): void {
  const { d, p } = tb;
  const k = tbl(tb);
  const shape = k.shape;
  if (shape === "round") p.depth = p.width;
  const tt = k.top_thickness;
  const hb = tb.h - tt;
  if (hb < 15) {
    d.errors.push(`الارتفاع (${fmt(tb.h)}) صغير على سطح سمكه ${fmt(tt)}.`);
    return;
  }
  if (k.base === "waterfall" && shape !== "rect") {
    d.errors.push("الحرف النازل (Waterfall) محتاج سطح مستطيل — غيّر شكل السطح أو نوع القاعدة.");
    return;
  }
  tb.outline = tableOutline(tb, shape);
  tb.hb = hb;
  tb.topParts = buildTableTop(tb, tt);
  switch (k.base) {
    case "slab": case "waterfall": slabBase(tb, k.base === "waterfall"); break;
    case "box": boxBase(tb); break;
    case "cross": crossBase(tb); break;
    case "pedestals": pedestalBase(tb); break;
    case "frame": slabBase(tb, false, true); break;
    case "legs4": legs4Base(tb); break;
  }
  if (d.errors.length) return;
  tableExtras(tb, tt);
  tableNotes(tb, tt);
}

// ================================================================ outline
function tableOutline(tb: TemplateBuilder, shape: string): Pt[] | null {
  const { w, dp } = tb;
  const cx = w / 2.0;
  const cy = dp / 2.0;
  const a = w / 2.0;
  const b = dp / 2.0;
  switch (shape) {
    case "round": case "oval":
      return Array.from({ length: ROUND_SEGS }, (_, i) => {
        const ang = (2 * Math.PI * i) / ROUND_SEGS;
        return [cx + a * Math.cos(ang), cy + b * Math.sin(ang)] as Pt;
      });
    case "rounded": {
      const r = Math.min(Number(tbl(tb).corner_radius), a, b);
      return r < 0.5 ? null : roundedRect(0.0, 0.0, w, dp, r);
    }
    case "stadium":
      return roundedRect(0.0, 0.0, w, dp, Math.min(a, b) - 0.001);
    case "boat": {
      const bEnd = b * 0.7;
      const n = 24;
      const front: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
        const x = (w * i) / n;
        const u = (2.0 * x) / w - 1.0;
        return [x, cy - (bEnd + (b - bEnd) * (1 - u * u))];
      });
      const back = front.slice().reverse().map(([x, y]) => [x, dp - y] as Pt);
      return [...front, ...back];
    }
  }
  return null;
}

function roundedRect(x0: number, y0: number, x1: number, y1: number, r: number): Pt[] {
  const pts: Pt[] = [];
  for (const [ccx, ccy, start] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]]) {
    for (let i = 0; i <= ARC_SEGS; i++) {
      const ang = ((start + (90.0 * i) / ARC_SEGS) * Math.PI) / 180.0;
      pts.push([ccx + r * Math.cos(ang), ccy + r * Math.sin(ang)]);
    }
  }
  return pts;
}

function spanAt(tb: TemplateBuilder, x: number): [number, number] {
  const o = tb.outline;
  if (!o) return [0.0, tb.dp];
  const ys: number[] = [];
  const n = o.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = o[i];
    const [x2, y2] = o[(i + 1) % n];
    if (Math.abs(x1 - x2) < 1e-9 && Math.abs(x - x1) > 1e-9) continue;
    if (!(x >= Math.min(x1, x2) - 1e-9 && x <= Math.max(x1, x2) + 1e-9)) continue;
    ys.push(Math.abs(x1 - x2) < 1e-9 ? y1 : y1 + ((y2 - y1) * (x - x1)) / (x2 - x1));
    if (Math.abs(x1 - x2) < 1e-9) ys.push(y2);
  }
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : [tb.dp / 2.0, tb.dp / 2.0];
}

function spanOver(tb: TemplateBuilder, x0: number, x1: number): [number, number] {
  const spans = Array.from({ length: 9 }, (_, i) => spanAt(tb, x0 + ((x1 - x0) * i) / 8.0));
  return [Math.max(...spans.map((s) => s[0])), Math.min(...spans.map((s) => s[1]))];
}

function insideTop(tb: TemplateBuilder, x0: number, y0: number, x1: number, y1: number): boolean {
  const [ya, yb] = spanOver(tb, x0, x1);
  return y0 >= ya - 0.01 && y1 <= yb + 0.01 && x0 >= -0.01 && x1 <= tb.w + 0.01;
}

function clipPoly(ptsIn: Pt[], x0: number, y0: number, x1: number, y1: number): Pt[] {
  let pts = ptsIn;
  for (const [axis, v, sgn] of [[0, x0, 1], [0, x1, -1], [1, y0, 1], [1, y1, -1]] as [0 | 1, number, number][]) {
    if (!pts.length) return [];
    const out: Pt[] = [];
    pts.forEach((cur, i) => {
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const cin = (cur[axis] - v) * sgn >= -1e-9;
      const pin = (prev[axis] - v) * sgn >= -1e-9;
      if (cin) {
        if (!pin) out.push(crossAt(prev, cur, axis, v));
        out.push(cur);
      } else if (pin) {
        out.push(crossAt(prev, cur, axis, v));
      }
    });
    pts = out;
  }
  return pts;
}

function crossAt(a: Pt, b: Pt, axis: 0 | 1, v: number): Pt {
  const t = (v - a[axis]) / (b[axis] - a[axis]);
  const p: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  p[axis] = v;
  return p;
}

function polyArea(pts: Pt[]): number {
  let s = 0.0;
  pts.forEach(([x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  });
  return Math.abs(s) / 2.0;
}

// ================================================================ top
function sheetMax(): [number, number] {
  const saw = Catalog.machines().saw;
  return [Number(saw.sheet_length) - 2 * Number(saw.trim), Number(saw.sheet_width) - 2 * Number(saw.trim)];
}

function buildTableTop(tb: TemplateBuilder, tt: number): Part[] {
  const { d, w, dp, h } = tb;
  const [longMax, shortMax] = sheetMax();
  const nx = Math.max(Math.ceil(w / longMax), 1);
  const ny = Math.max(Math.ceil(dp / shortMax), 1);
  const xs = Array.from({ length: nx + 1 }, (_, i) => (w * i) / nx);
  const ys = Array.from({ length: ny + 1 }, (_, i) => (dp * i) / ny);
  const z0 = h - tt;
  const multi = nx * ny > 1;
  const tops: Part[] = [];
  const shapeName = TableSpec.SHAPES[tbl(tb).shape];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const [cx0, cx1, cy0, cy1] = [xs[i], xs[i + 1], ys[j], ys[j + 1]];
      const seams: Record<string, boolean> = { left: i > 0, right: i < nx - 1, front: j > 0, back: j < ny - 1 };
      const band = (["left", "right", "front", "back"] as const).filter((s) => !seams[s]);
      const name = multi ? d.seqName("سطح - جزء") : "سطح";
      if (tb.outline === null) {
        tops.push(d.addPart(name, "other", "table_top", tb.box(cx0, cy0, z0, cx1, cy1, h), { label_axes: ["y", "x"], band: [...band], grain: "x" }));
        continue;
      }
      const poly = clipPoly(tb.outline, cx0, cy0, cx1, cy1);
      if (poly.length < 3 || polyArea(poly) < 4) continue;
      const pxs = poly.map((q) => q[0]);
      const pys = poly.map((q) => q[1]);
      const [bx0, bx1] = [Math.min(...pxs), Math.max(...pxs)];
      const [by0, by1] = [Math.min(...pys), Math.max(...pys)];
      const seamX = [seams.left ? cx0 : null, seams.right ? cx1 : null].filter((v): v is number => v !== null);
      const seamY = [seams.front ? cy0 : null, seams.back ? cy1 : null].filter((v): v is number => v !== null);
      const part = d.addPart(name, "other", "table_top", tb.box(bx0, by0, z0, bx1, by1, h), {
        label_axes: ["y", "x"], band: [...band], grain: "x",
        shape: { type: "poly_z", points: poly.map(([x, y]) => [rround(x, 3), rround(y, 3)]), z0, z1: h, seam_x: seamX, seam_y: seamY, router_ok: true },
        note: `شكل ${shapeName} — المقاس هنا المستطيل اللي محيط بالقطعة؛ القص بالشكل بالفريزة بفرجار أو شبلونة`,
      });
      if (tb.p.edge_banding) {
        let len = 0.0;
        poly.forEach(([x1, y1], q) => {
          const [x2, y2] = poly[(q + 1) % poly.length];
          const onSeam = seamX.some((s) => Math.abs(x1 - s) < 1e-6 && Math.abs(x2 - s) < 1e-6)
            || seamY.some((s) => Math.abs(y1 - s) < 1e-6 && Math.abs(y2 - s) < 1e-6);
          if (!onSeam) len += Math.hypot(x2 - x1, y2 - y1);
        });
        part.band_len = rround(len, 2);
      }
      tops.push(part);
    }
  }
  if (multi) {
    const seams = (nx - 1) * ny * (dp / ny) + (ny - 1) * nx * (w / nx);
    const nConn = Math.trunc(Math.ceil(seams / 45.0) + (nx - 1) + (ny - 1));
    inc(d.hardware, "مسمار ربط سطح (Table connector)", nConn);
    inc(d.hardware, "دوبل (خابور)", nConn * 2);
    d.notes.push(`السطح اتقسم ${nx * ny} أجزاء عشان أكبر من اللوح الخام — الوصلات بمسامير ربط سطح من تحت + دوبل وغراء، والشريط على المحيط الخارجي بس.`);
  }
  if (tt > 2.2 && tb.p.edge_banding) d.notes.push(`سطح سمكه ${fmt(tt)} سم: الشريط لازم يكون عرضه ≥ ${fmt(tt * 10 + 2)} مم.`);
  return tops;
}

// ================================================================ base pieces
// a base piece larger than a raw sheet gets its grain turned or is split into joined parts
function tpart(tb: TemplateBuilder, name: string, role: string, mat: string, bx: Box, optsIn: PartOpts = {}): Part {
  const { d } = tb;
  let opts = optsIn;
  const [longMax, shortMax] = sheetMax();
  const thin = d.thinAxisOf(bx);
  const face = AXES.filter((a) => a !== thin);
  const longAx = maxBy(face, (ax) => d.ext(bx, ax))!;
  if (opts.grain === "z" && longAx !== "z" && d.ext(bx, longAx) > shortMax) opts = { ...opts, grain: longAx };
  const g: Axis = opts.grain && face.includes(opts.grain) ? opts.grain : longAx;
  const other = face.find((a) => a !== g)!;
  const counts: Record<string, number> = {
    [g]: Math.ceil(d.ext(bx, g) / longMax - 0.0001),
    [other]: Math.ceil(d.ext(bx, other) / shortMax - 0.0001),
  };
  for (const ax of Object.keys(counts)) if (counts[ax] < 1) counts[ax] = 1;
  if (Object.values(counts).every((c) => c === 1)) return d.addPart(name, role, mat, bx, opts);

  const parts: Part[] = [];
  let k = 0;
  const total = counts[g] * counts[other];
  for (let i = 0; i < counts[g]; i++) {
    for (let j = 0; j < counts[other]; j++) {
      const sb: Dict = { ...bx };
      for (const [ax, idx] of [[g, i], [other, j]] as [Axis, number][]) {
        const a0 = (bx as any)[`${ax}0`];
        const e = d.ext(bx, ax);
        sb[`${ax}0`] = rround(a0 + (e * idx) / counts[ax], 4);
        sb[`${ax}1`] = rround(a0 + (e * (idx + 1)) / counts[ax], 4);
      }
      k++;
      parts.push(d.addPart(`${name} - جزء ${k}`, role, mat, sb as Box, opts));
    }
  }
  const seams = total - 1;
  inc(d.hardware, "مسمار ربط سطح (Table connector)", 2 * seams);
  inc(d.hardware, "دوبل (خابور)", 3 * seams);
  d.notes.push(`"${name}" أكبر من اللوح الخام — اتقسمت ${total} أجزاء بوصلة دوبل + مسمار ربط.`);
  return parts[parts.length - 1];
}

const up1 = (v: number) => Math.ceil(v * 10) / 10.0;
const down1 = (v: number) => Math.floor(v * 10) / 10.0;
const feet = (tb: TemplateBuilder, n: number) => inc(tb.d.hardware, "كعب رجل (لباد / بلاستيك)", n);
const pos = (v: unknown) => Number(v) > 0;

function slabBase(tb: TemplateBuilder, waterfall: boolean, frame = false): void {
  const { d, w, dp } = tb;
  const k = tbl(tb);
  const legt = waterfall ? k.top_thickness : k.leg_thickness;
  const ox = waterfall ? 0.0 : k.overhang_x;
  const bw = pos(k.base_width) ? k.base_width : w - 2 * ox;
  if (bw < 2 * legt + 20 || bw > w + 0.01) {
    d.errors.push(`عرض القاعدة (${fmt(bw)}) مش مناسب للسطح (${fmt(w)}) — راجع البروز.`);
    return;
  }
  const xl0 = (w - bw) / 2.0;
  const xr1 = xl0 + bw;
  const [ya, yb] = spanOver(tb, xl0, xl0 + legt);
  let y0: number;
  let y1: number;
  if (waterfall) {
    y0 = 0.0;
    y1 = dp;
  } else if (pos(k.base_depth)) {
    y0 = (dp - k.base_depth) / 2.0;
    y1 = y0 + k.base_depth;
  } else {
    y0 = up1(ya + k.overhang_y);
    y1 = down1(yb - k.overhang_y);
  }
  if (y1 - y0 < 15) {
    d.errors.push(`مفيش عمق كفاية للرجلين عند أطراف السطح ده (${fmt(y1 - y0)} سم) — قرّب الرجلين (زوّد البروز) أو اختار قاعدة صليب / أعمدة.`);
    return;
  }
  if (!insideTop(tb, xl0, y0, xr1, y1)) {
    d.errors.push("الرجلين طالعين بره السطح — زوّد البروز أو صغّر عمق القاعدة.");
    return;
  }
  const hb = tb.hb;
  const sides: [string, number, number][] = [["شمال", xl0, xl0 + legt], ["يمين", xr1 - legt, xr1]];
  if (frame) {
    const fw = k.frame_width;
    if (y1 - y0 < 2 * fw + 5 || hb < 2 * fw + 10) {
      d.errors.push(`شريحة البرواز (${fmt(fw)}) عريضة على مقاس الرجل.`);
      return;
    }
    for (const [nm, x0, x1] of sides) {
      for (const [pn, py0, py1] of [["قايم أمامي", y0, y0 + fw], ["قايم خلفي", y1 - fw, y1]] as [string, number, number][]) {
        tpart(tb, `برواز ${nm} - ${pn}`, "leg_strip", "table_base", tb.box(x0, py0, 0.0, x1, py1, hb), { band: ["front", "back"], grain: "z" });
      }
      tpart(tb, `برواز ${nm} - عارضة تحت`, "leg_strip", "table_base", tb.box(x0, y0 + fw, 0.0, x1, y1 - fw, fw), { band: ["top"], grain: "y" });
      tpart(tb, `برواز ${nm} - عارضة فوق`, "leg_strip", "table_base", tb.box(x0, y0 + fw, hb - fw, x1, y1 - fw, hb), { band: ["bottom"], grain: "y" });
    }
    inc(d.hardware, "دوبل (خابور)", 16);
    inc(d.hardware, "زاوية تثبيت سطح", 4);
    d.notes.push("البرواز: كل ركن بدوبلين + غراء (أو استبدله ببرواز حديد مدهّن جاهز بنفس المقاس).");
    feet(tb, 4);
  } else {
    for (const [nm, x0, x1] of sides) {
      tpart(tb, `${waterfall ? "حرف نازل" : "رجل"} ${nm}`, "side", waterfall ? "table_top" : "table_base",
        tb.box(x0, y0, 0.0, x1, y1, hb), { label_axes: ["y", "z"], band: ["front", "back", "bottom"], grain: "z" });
    }
    feet(tb, 4);
    if (waterfall) d.notes.push("الحرف النازل: الوصلة مع السطح بأليتا مخفية — لو عايزها زاوية 45° (ميتر) اعملها على المنشار وخلي العروق ماشية متصلة.");
  }
  tableBetween(tb, xl0 + legt, xr1 - legt, y0, y1);
}

function tableBetween(tb: TemplateBuilder, xi0: number, xi1: number, y0: number, y1: number): void {
  const { d, t } = tb;
  const k = tbl(tb);
  const hb = tb.hb;
  let drawerY1 = y1;
  let st = k.stretcher;
  const sh = k.modesty ? 40.0 : k.stretcher_height;
  if (k.drawer && st === "center") st = "back";
  if (st !== "none" && xi1 - xi0 > 5) {
    if (sh > hb - 5) {
      d.errors.push(`ارتفاع العارضة (${fmt(sh)}) أكبر من المسافة تحت السطح.`);
      return;
    }
    const yc = st === "back" ? y1 - 4.0 - t / 2.0 : (y0 + y1) / 2.0;
    const nm = k.modesty ? "لوح ساتر (Modesty)" : "عارضة";
    tpart(tb, nm, "divider", "table_base", tb.box(xi0, yc - t / 2.0, hb - sh, xi1, yc + t / 2.0, hb), { label_axes: ["z", "x"], band: ["bottom"], grain: "x" });
    drawerY1 = yc - t / 2.0;
  }
  if (k.shelf) {
    const sz = k.shelf_height;
    if (sz + t > hb - (st === "none" ? 8 : sh + 5)) {
      d.errors.push(`الرف التحتاني (${fmt(sz)}) عالي قوي — هيخبط في العارضة / السطح.`);
      return;
    }
    tpart(tb, "رف تحتاني", "horizontal", "table_top", tb.box(xi0, y0 + 2.0, sz, xi1, y1 - 2.0, sz + t), { label_axes: ["y", "x"], band: ["front", "back"], grain: "x" });
    if (k.led) d.addLed(d.seqName("ليد رف"), tb.box(xi0 + 2, y0 + 3.0, sz - 0.5, xi1 - 2, y0 + 4.6, sz));
  }
  if (k.drawer) tableDrawer(tb, xi0, xi1, y0, drawerY1);
}

function tableDrawer(tb: TemplateBuilder, xi0: number, xi1: number, y0: number, y1: number): void {
  const { d, p } = tb;
  const k = tbl(tb);
  const dh = k.drawer_height;
  const dw = Math.min(60.0, xi1 - xi0 - 4.0);
  const ddep = Math.min(50.0, y1 - y0 - 1.0 - p.front_thickness);
  if (dw < 30 || ddep < 30) {
    d.warnings.push(`مفيش مكان كفاية لدرج تحت السطح (${fmt(dw)}×${fmt(ddep)}) — اتشال.`);
    return;
  }
  const x = (xi0 + xi1 - dw) / 2.0;
  const hwBefore: Dict = { ...d.hardware };
  const notesBefore = d.notes.length;
  subUnit(tb, { width: dw, height: dh, depth: ddep, mount: "wall", top: "rails", back: { enabled: false }, fronts: [{ type: "drawers", count: 1 }] },
    [x, y0 + p.front_thickness, tb.hb - dh], "درج", "tdrawer");
  for (const pt of d.parts) if (pt.module === "tdrawer" && ["carcass", "front"].includes(pt.material)) pt.material = "table_base";
  for (const [hk, v] of Object.entries(d.hardware)) if (hk.includes("معلاق") && v !== (hwBefore[hk] ?? 0)) delete d.hardware[hk];
  const added = d.notes.splice(notesBefore);
  for (const n of added.filter((n) => !n.includes("معلّقة"))) d.notes.push(n);
  inc(d.hardware, "مسامير تثبيت الدرج في السطح", 6);
  const clear = tb.hb - dh;
  if (clear < 58 && ["office_table", "dining_table", "meeting_table"].includes(p.template)) {
    d.warnings.push(`المسافة تحت الدرج ${fmt(clear)} سم — الرجلين محتاجين 58 سم على الأقل (قلّل ارتفاع الدرج).`);
  }
}

function defaultFootprint(tb: TemplateBuilder): [number, number] {
  const k = tbl(tb);
  const round = ["round", "oval"].includes(k.shape);
  const bw = pos(k.base_width) ? k.base_width : round ? tb.w * 0.55 : tb.w - 2 * k.overhang_x;
  const bd = pos(k.base_depth) ? k.base_depth : round ? tb.dp * 0.55 : tb.dp - 2 * k.overhang_y;
  return [bw, bd];
}

function checkFootprint(tb: TemplateBuilder, x0: number, y0: number, x1: number, y1: number, what: string): boolean {
  if (insideTop(tb, x0, y0, x1, y1)) return true;
  tb.d.errors.push(`${what} طالعة بره السطح — صغّر مقاسها أو زوّد البروز.`);
  return false;
}

function boxBase(tb: TemplateBuilder): void {
  const { d, t, w, dp } = tb;
  const [bw, bd] = defaultFootprint(tb);
  const legt = tbl(tb).leg_thickness;
  if (bw < 2 * legt + 10 || bd < 2 * legt + 10) {
    d.errors.push(`مقاس الصندوق (${fmt(bw)}×${fmt(bd)}) صغير.`);
    return;
  }
  const x0 = (w - bw) / 2.0;
  const y0 = (dp - bd) / 2.0;
  const x1 = x0 + bw;
  const y1 = y0 + bd;
  if (!checkFootprint(tb, x0, y0, x1, y1, "قاعدة الصندوق")) return;
  const hb = tb.hb;
  tpart(tb, "قاعدة - وش أمامي", "side", "table_base", tb.box(x0, y0, 0.0, x1, y0 + legt, hb), { label_axes: ["x", "z"], band: ["left", "right", "bottom"], grain: "x" });
  tpart(tb, "قاعدة - وش خلفي", "side", "table_base", tb.box(x0, y1 - legt, 0.0, x1, y1, hb), { label_axes: ["x", "z"], band: ["left", "right", "bottom"], grain: "x" });
  for (const [nm, sx] of [["شمال", x0], ["يمين", x1 - legt]] as [string, number][]) {
    tpart(tb, `قاعدة - جنب ${nm}`, "side", "table_base", tb.box(sx, y0 + legt, 0.0, sx + legt, y1 - legt, hb), { label_axes: ["y", "z"], band: ["bottom"], grain: "z" });
  }
  const inner = bw - 2 * legt;
  const nRibs = Math.ceil(inner / 80.0) - 1;
  for (let i = 0; i < nRibs; i++) {
    const rx = x0 + legt + (inner * (i + 1)) / (nRibs + 1) - t / 2.0;
    tpart(tb, d.seqName("قاعدة - ضلع داخلي"), "divider", "table_base", tb.box(rx, y0 + legt, hb - 15.0, rx + t, y1 - legt, hb), { label_axes: ["y", "z"], band: [], grain: "y" });
  }
  feet(tb, 4 + 2 * nRibs);
  tb.ledBase = [x0, y0, x1, y1];
}

function crossBase(tb: TemplateBuilder): void {
  const { d, w, dp } = tb;
  const [bw, bd] = defaultFootprint(tb);
  const legt = tbl(tb).leg_thickness;
  if (bw < 2 * legt + 15 || bd < 2 * legt + 15) {
    d.errors.push(`مقاس قاعدة الصليب (${fmt(bw)}×${fmt(bd)}) صغير — قلّل البروز أو حدد عرض/عمق القاعدة.`);
    return;
  }
  const xc = w / 2.0;
  const yc = dp / 2.0;
  const x0 = xc - bw / 2.0;
  const y0 = yc - bd / 2.0;
  if (!checkFootprint(tb, x0, yc - legt / 2.0, x0 + bw, yc + legt / 2.0, "قاعدة الصليب")) return;
  if (!checkFootprint(tb, xc - legt / 2.0, y0, xc + legt / 2.0, y0 + bd, "قاعدة الصليب")) return;
  const hb = tb.hb;
  tpart(tb, "صليب - لوح طولي", "side", "table_base", tb.box(x0, yc - legt / 2.0, 0.0, x0 + bw, yc + legt / 2.0, hb), { label_axes: ["x", "z"], band: ["left", "right", "bottom"], grain: "z" });
  for (const [nm, a, b] of [["قدام", y0, yc - legt / 2.0], ["ورا", yc + legt / 2.0, y0 + bd]] as [string, number, number][]) {
    tpart(tb, `صليب - نص ${nm}`, "side", "table_base", tb.box(xc - legt / 2.0, a, 0.0, xc + legt / 2.0, b, hb), {
      label_axes: ["y", "z"], band: nm === "قدام" ? ["front", "bottom"] : ["back", "bottom"], grain: "z",
    });
  }
  feet(tb, 4);
  tb.ledBase = null;
}

function pedestalBase(tb: TemplateBuilder): void {
  const { d, t, w, dp } = tb;
  const k = tbl(tb);
  const n = Math.min(Math.max(Math.trunc(Number(k.columns)), 1), 4);
  const cs = k.column_size;
  const cd = pos(k.base_depth) ? k.base_depth : cs;
  const legt = k.leg_thickness;
  if (cs < 2 * legt + 6 || cd < 2 * legt + 6) {
    d.errors.push(`مقاس العمود (${fmt(cs)}) صغير على سمك اللوح (${fmt(legt)}).`);
    return;
  }
  const ox = k.overhang_x;
  let centers: number[];
  if (n === 1) centers = [w / 2.0];
  else {
    const a = ox + cs / 2.0;
    const b = w - ox - cs / 2.0;
    centers = Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  }
  if (n > 1 && centers[1] - centers[0] < cs + 5) {
    d.errors.push("الأعمدة متلزقة في بعض — قلّل العدد أو زوّد طول الترابيزة.");
    return;
  }
  const y0 = (dp - cd) / 2.0;
  const y1 = y0 + cd;
  const hb = tb.hb;
  const boxes: [number, number][] = [];
  for (let i = 0; i < centers.length; i++) {
    const cx = centers[i];
    const x0 = cx - cs / 2.0;
    const x1 = cx + cs / 2.0;
    if (!checkFootprint(tb, x0, y0, x1, y1, `العمود ${i + 1}`)) return;
    const tag = n === 1 ? "عمود" : `عمود ${i + 1}`;
    tpart(tb, `${tag} - وش`, "side", "table_base", tb.box(x0, y0, 0.0, x1, y0 + legt, hb), { label_axes: ["x", "z"], band: ["left", "right", "bottom"], grain: "z" });
    tpart(tb, `${tag} - ظهر`, "side", "table_base", tb.box(x0, y1 - legt, 0.0, x1, y1, hb), { label_axes: ["x", "z"], band: ["left", "right", "bottom"], grain: "z" });
    tpart(tb, `${tag} - جنب شمال`, "side", "table_base", tb.box(x0, y0 + legt, 0.0, x0 + legt, y1 - legt, hb), { label_axes: ["y", "z"], band: ["bottom"], grain: "z" });
    tpart(tb, `${tag} - جنب يمين`, "side", "table_base", tb.box(x1 - legt, y0 + legt, 0.0, x1, y1 - legt, hb), { label_axes: ["y", "z"], band: ["bottom"], grain: "z" });
    boxes.push([x0, x1]);
    feet(tb, 4);
  }
  const st = k.stretcher;
  if (st !== "none" && n > 1) {
    const sh = k.modesty ? 40.0 : k.stretcher_height;
    const yc = st === "back" ? y1 - legt - t / 2.0 : (y0 + y1) / 2.0;
    for (let i = 0; i + 1 < boxes.length; i++) {
      const a1 = boxes[i][1];
      const b0 = boxes[i + 1][0];
      tpart(tb, d.seqName(k.modesty ? "لوح ساتر" : "عارضة"), "divider", "table_base", tb.box(a1, yc - t / 2.0, hb - sh, b0, yc + t / 2.0, hb), { label_axes: ["z", "x"], band: ["bottom"], grain: "x" });
    }
  }
  if (k.power_box || Math.trunc(Number(k.grommets)) > 0) d.notes.push("الأعمدة: سيب فتحة كابلات في ضهر العمود لو فيه علبة كهرباء في السطح.");
  if (n === 1) tb.ledBase = [centers[0] - cs / 2.0, y0, centers[centers.length - 1] + cs / 2.0, y1];
}

function legs4Base(tb: TemplateBuilder): void {
  const { d, t, w, dp } = tb;
  const k = tbl(tb);
  const ls = k.leg_size;
  const ox = k.overhang_x;
  const oy = k.overhang_y;
  let lx0: number, lx1: number, ly0: number, ly1: number;
  if (["round", "oval"].includes(k.shape)) {
    const hx = (w / 2.0) * 0.7071 - ox * 0.5;
    const hy = (dp / 2.0) * 0.7071 - oy * 0.5;
    lx0 = w / 2.0 - hx;
    lx1 = w / 2.0 + hx - ls;
    ly0 = dp / 2.0 - hy;
    ly1 = dp / 2.0 + hy - ls;
  } else {
    lx0 = ox;
    lx1 = w - ox - ls;
    const [ya, yb] = spanOver(tb, lx0, lx0 + ls);
    ly0 = up1(ya + oy);
    ly1 = down1(yb - oy - ls);
  }
  if (lx1 - lx0 < ls + 10 || ly1 - ly0 < ls + 10) {
    d.errors.push("مفيش مكان للرجول الأربعة بالبروز ده.");
    return;
  }
  if (!checkFootprint(tb, lx0, ly0, lx1 + ls, ly1 + ls, "الرجول")) return;
  const hb = tb.hb;
  for (const [nm, x, y] of [["قدام شمال", lx0, ly0], ["قدام يمين", lx1, ly0], ["ورا شمال", lx0, ly1], ["ورا يمين", lx1, ly1]] as [string, number, number][]) {
    tpart(tb, `رجل ${nm}`, "leg_strip", "table_base", tb.box(x, y, 0.0, x + ls, y + ls, hb), {
      label_axes: ["x", "z"], band: ["left", "right"], grain: "z", note: "رجل مصمتة: الطبقات بتتلزق والحرفين الظاهرين بشريط",
    });
  }
  const ah = k.stretcher_height;
  if (k.stretcher !== "none" && ah < hb - 10) {
    tpart(tb, "برواز أمامي", "divider", "table_base", tb.box(lx0 + ls, ly0 + 1, hb - ah, lx1, ly0 + 1 + t, hb), { label_axes: ["z", "x"], band: ["bottom"], grain: "x" });
    tpart(tb, "برواز خلفي", "divider", "table_base", tb.box(lx0 + ls, ly1 + ls - 1 - t, hb - ah, lx1, ly1 + ls - 1, hb), { label_axes: ["z", "x"], band: ["bottom"], grain: "x" });
    tpart(tb, "برواز شمال", "divider", "table_base", tb.box(lx0 + 1, ly0 + ls, hb - ah, lx0 + 1 + t, ly1, hb), { label_axes: ["z", "y"], band: ["bottom"], grain: "y" });
    tpart(tb, "برواز يمين", "divider", "table_base", tb.box(lx1 + ls - 1 - t, ly0 + ls, hb - ah, lx1 + ls - 1, ly1, hb), { label_axes: ["z", "y"], band: ["bottom"], grain: "y" });
    inc(d.hardware, "زاوية تثبيت رجل (Corner brace)", 4);
  }
  inc(d.hardware, "زاوية تثبيت سطح", 6);
  d.notes.push("الرجول طبقات ملزوقة تحت مكبس، والبرواز بيتربط في الرجول بدوبل + زوايا تثبيت من جوه.");
  if (k.stretcher !== "none") inc(d.hardware, "دوبل (خابور)", 16);
  if (k.shelf) {
    const sz = k.shelf_height;
    tpart(tb, "رف تحتاني", "horizontal", "table_top", tb.box(lx0 + ls, ly0 + 1, sz, lx1, ly1 + ls - 1, sz + t), { label_axes: ["y", "x"], band: ["front", "back"], grain: "x" });
    inc(d.hardware, "حامل رف (بنز / زاوية)", 4);
  }
  feet(tb, 4);
}

// ================================================================ extras
const covers = (b: Box, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

function tableExtras(tb: TemplateBuilder, tt: number): void {
  const { d, p, w, dp, h } = tb;
  const k = tbl(tb);
  const topZ = h - tt / 2.0;
  const n = Math.trunc(Number(k.grommets));
  if (n > 0) {
    const desk = p.template === "office_table";
    const gy = desk ? dp - 10.0 : dp / 2.0;
    for (let i = 0; i < n; i++) {
      const gx = (w * (i + 1)) / (n + 1);
      const [sa, sb] = spanAt(tb, gx);
      const gy2 = Math.min(Math.max(gy, sa + 6), sb - 6);
      d.addHoleMarker(d.seqName("فتحة كابلات Ø6"), "z", [gx, gy2, topZ], 3.0, tt);
      holeOnTop(tb, gx, gy2, 6.0);
    }
    inc(d.hardware, "جروميت كابلات Ø6", n);
  }
  if (k.power_box) {
    const bxw = 25.0;
    const bxd = 12.0;
    let cx = w / 2.0;
    const cy = dp / 2.0;
    if (n % 2 === 1) cx += 20;
    d.addPart("فتحة علبة كهرباء 25×12", "hole", "__hole", tb.box(cx - bxw / 2, cy - bxd / 2, h - tt, cx + bxw / 2, cy + bxd / 2, h + 0.05), { layer: "assembly", cut_piece: false });
    const top = tb.topParts.find((pt) => covers(pt.box, cx, cy));
    if (top) top.note = [top.note, "فتحة علبة كهرباء/داتا 25×12 في النص (تتظبط على مقاس العلبة الفعلي)"].filter((x) => x != null).join(" | ");
    inc(d.hardware, "علبة كهرباء/داتا Pop-up للسطح", 1);
  }
  if (!k.led) return;
  const lb = tb.ledBase;
  if (lb && insideTop(tb, lb[0] - 3.5, lb[1] - 3.5, lb[2] + 3.5, lb[3] + 3.5)) {
    const [x0, y0, x1, y1] = lb;
    d.addLed("ليد تحت القاعدة (قدام)", tb.box(x0 - 3.0, y0 - 3.0, 0.0, x1 + 3.0, y0 - 1.4, 0.5));
    d.addLed("ليد تحت القاعدة (ورا)", tb.box(x0 - 3.0, y1 + 1.4, 0.0, x1 + 3.0, y1 + 3.0, 0.5));
    d.notes.push("ليد القاعدة: بروفايل ألومنيوم على الأرض حوالين القاعدة (أو تحت حرف القاعدة الداخل) — بيدّي شكل الترابيزة الطايرة.");
  } else {
    const inset = Math.max(k.overhang_x * 0.5, 4.0);
    const xa = inset;
    const xb = w - inset;
    const [sa] = spanOver(tb, xa, xb);
    if (xb - xa > 10) d.addLed("ليد تحت السطح (قدام)", tb.box(xa, sa + 3.0, h - tt - 0.5, xb, sa + 4.6, h - tt));
  }
}

function holeOnTop(tb: TemplateBuilder, x: number, y: number, dd: number): void {
  const top = tb.topParts.find((pt) => covers(pt.box, x, y));
  if (top) tb.d.attachHole(top, { x, y, z: top.box.z1 }, dd);
}

function tableNotes(tb: TemplateBuilder, tt: number): void {
  const { d, p, w, dp, h } = tb;
  const k = tbl(tb);
  const tpl = p.template;
  const range = TableSpec.HEIGHT_RANGE[tpl];
  if (range && (h < range[0] || h > range[1])) {
    d.warnings.push(`ارتفاع ${fmt(h)} سم مش معتاد لـ ${TableSpec.TEMPLATES[tpl]?.label ?? ""} (المعتاد ${range[0]}–${range[1]}).`);
  }
  if (["dining_table", "meeting_table"].includes(tpl)) {
    let seats: number;
    if (["round", "oval"].includes(k.shape)) {
      const a = w / 2.0;
      const b = dp / 2.0;
      const per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
      seats = Math.floor(per / 62.0);
    } else {
      seats = 2 * Math.floor(w / 62.0) + (dp >= 80 ? 2 : 0);
    }
    d.notes.push(`تقريباً ${seats} كراسي (62 سم للفرد).`);
  }
  if (tt > 1.85) d.notes.push(`السطح سمكه ${fmt(tt)} سم = طبقات ملزوقة (الفاحص كاتب التركيبة) — لزق تحت مكبس.`);
  d.notes.push("ثبّت السطح في القاعدة من تحت (أليتا / زوايا) عشان يتفك في النقل.");
}
