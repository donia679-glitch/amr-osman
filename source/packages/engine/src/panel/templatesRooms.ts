// Port of lib/panel_engine/templates_rooms.rb — bed, TV unit, dresser, desk.
// Composite products: each box module is built by the generic cabinet template (subUnit).
import { deepDup, deepMerge, fmt, inc, type Dict } from "../core/ruby.ts";
import { rround } from "../core/rubyMath.ts";
import * as Schema from "./schema.ts";
import { Design } from "./design.ts";
import { TemplateBuilder } from "./templates.ts";

export const MAX_STRIP = 120.0;

const INHERIT = ["environment", "materials", "edge_banding", "handle", "thickness", "front_thickness", "front_gap", "joints",
  "drawer", "back", "hinge_edge", "rail_width", "plinth"];

export function subUnit(tb: TemplateBuilder, overrides: Dict, offset: [number, number, number], prefix: string, tag: string): Dict | null {
  let raw: Dict = {};
  for (const k of INHERIT) raw[k] = deepDup(tb.p[k]);
  raw.template = "cabinet";
  raw = deepMerge(raw, overrides);
  const [sp, errs] = Schema.normalize(raw);
  if (errs.length) {
    for (const e of errs) tb.d.errors.push(`${prefix}: ${e}`);
    return null;
  }
  const sd = new Design(sp);
  sd.module_tag = tag;
  new TemplateBuilder(sd, sp).run(false);
  tb.d.import(sd, offset, prefix, tag);
  return sp;
}

/** split a length into equal strips each <= max */
export function strips(total: number, max = MAX_STRIP): [number, number][] {
  let n = Math.ceil(total / max);
  if (n < 1) n = 1;
  return Array.from({ length: n }, (_, i) => [(total * i) / n, (total * (i + 1)) / n]);
}

export function withModule(tb: TemplateBuilder, tag: string, fn: () => void): void {
  const old = tb.d.module_tag;
  tb.d.module_tag = tag;
  try {
    fn();
  } finally {
    tb.d.module_tag = old;
  }
}

// ================================================================ TV unit
export function buildTv(tb: TemplateBuilder): void {
  const { d, p, t, w, h } = tb;
  const tv = p.tv;
  const cols = tv.columns;
  const cw = cols === "none" ? 0.0 : tv.column_width;
  const cd = tv.column_depth;
  const bd = tv.base_depth;
  const bh = tv.base_height;
  const fl = tv.base_float;
  const dmax = Math.max(bd, cols === "none" ? 0.0 : cd);
  p.depth = dmax;
  const left = ["both", "left"].includes(cols);
  const right = ["both", "right"].includes(cols);
  const bx0 = left ? cw : 0.0;
  const bx1 = right ? w - cw : w;
  const bw = bx1 - bx0;
  if (bw < 30) {
    d.errors.push(`مفيش مكان للوحدة الأرضية بين الأعمدة (${fmt(bw)} سم).`);
    return;
  }
  const baseTop = (fl > 0 ? fl : 0.0) + bh;
  if (cols !== "none" && h < baseTop + 20) {
    d.errors.push(`الارتفاع الكلي (${fmt(h)}) أقل من الوحدة الأرضية — كبّره أو شيل الأعمدة.`);
    return;
  }
  const fronts = tv.base_fronts === "drawers" ? [{ type: "drawers", count: 1 }]
    : tv.base_fronts === "doors" ? [{ type: "doors", count: 2, shelves: 0 }] : [{ type: "flap" }];
  const mods = strips(bw, 100.0);
  mods.forEach(([a, b], i) => {
    const ov = { width: b - a, height: bh, depth: bd, fronts, top: "full", mount: fl > 0 ? "wall" : "floor", led_under: tv.led && fl > 0 };
    subUnit(tb, ov, [bx0 + a, dmax - bd, fl > 0 ? fl : 0.0], mods.length > 1 ? `أرضي ${i + 1}` : "أرضي", `base${i}`);
  });
  if (mods.length > 1) inc(d.hardware, "مسمار ربط وحدات", 2 * (mods.length - 1));

  const colFronts = (hinge: string): Dict[] =>
    tv.column_doors ? [{ type: "doors", count: 1, hinge, shelves: tv.column_shelves }] : [{ type: "open", shelves: tv.column_shelves }];
  for (const [side, on, x, hinge] of [["left", left, 0.0, "left"], ["right", right, w - cw, "right"]] as [string, boolean, number, string][]) {
    if (!on) continue;
    const cf = colFronts(hinge);
    if (tv.led && !tv.column_doors) cf[0].led = true;
    subUnit(tb, { width: cw, height: h, depth: cd, mount: "floor", top: "full", fronts: cf },
      [x, dmax - cd, 0.0], side === "left" ? "عمود شمال" : "عمود يمين", `col_${side}`);
  }

  if (!tv.panel) return;
  const pt = tv.panel_thickness;
  const pz0 = baseTop;
  const pz1 = Math.min(baseTop + tv.panel_height, cols === "none" ? baseTop + tv.panel_height : h);
  if (pz1 - pz0 < 10) {
    d.warnings.push("البانوه طلع ارتفاعه أقل من 10 سم — اتشال.");
    return;
  }
  const list = strips(bw);
  const mid = Math.trunc(list.length / 2);
  withModule(tb, "panel", () => {
    list.forEach(([a, b], i) => {
      const note = i === mid && tv.cable_hole ? "فتحة كابلات Ø8 خلف الشاشة (تتخرم في الموقع على مكان الحامل)" : null;
      tb.add(list.length > 1 ? `بانوه شاشة ${i + 1}` : "بانوه شاشة", "other", tv.panel_style === "slats" ? "carcass" : "accent",
        tb.box(bx0 + a, dmax - pt, pz0, bx0 + b, dmax, pz1), { band: ["left", "right", "top", "bottom"], grain: "z", layer: "front", note });
    });
  });
  inc(d.hardware, "زد تعليق بانوه (طقم)", 2 * list.length);
  inc(d.hardware, "حامل شاشة حيطة", 1);
  let faceY = dmax - pt;

  if (tv.panel_style === "slats") {
    const sw = tv.slat_width;
    const gap = tv.slat_gap;
    const n = Math.floor((bw + gap) / (sw + gap));
    const used = n * sw + (n - 1) * gap;
    const start = bx0 + (bw - used) / 2.0;
    const fy = faceY;
    withModule(tb, "slats", () => {
      for (let i = 0; i < n; i++) {
        const x = start + i * (sw + gap);
        tb.add(`شريحة بانوه ${i + 1}`, "other", "accent", tb.box(x, fy - t, pz0, x + sw, fy, pz1), { band: ["left", "right", "top", "bottom"], grain: "z", layer: "front" });
      }
    });
    faceY -= t;
    d.notes.push(`شرايح البانوه ${n} × ${fmt(sw)} سم بمسافة ${fmt(gap)} سم — بتتلزق وتتسمر من ورا.`);
  }

  const ns = Math.trunc(Number(tv.panel_shelves));
  if (ns > 0) {
    const sdp = tv.shelf_depth;
    const swid = Math.min(tv.shelf_width, bw - 10);
    const sx0 = tv.shelves_side === "right" ? bx1 - 5 - swid : bx0 + 5;
    const fy = faceY;
    withModule(tb, "shelves", () => {
      for (let i = 0; i < ns; i++) {
        const z = pz0 + ((pz1 - pz0) * (i + 1)) / (ns + 1);
        tb.add(d.seqName("رف عائم"), "other", "accent", tb.box(sx0, fy - sdp, z, sx0 + swid, fy, z + tv.shelf_thickness), { band: ["front", "left", "right"], grain: "x" });
        if (tv.led) d.addLed(d.seqName("ليد رف عائم"), tb.box(sx0 + 2, fy - sdp + 1.5, z - 0.5, sx0 + swid - 2, fy - sdp + 3.1, z));
      }
    });
    inc(d.hardware, "حامل رف مخفي", 2 * ns);
    d.notes.push(`الأرفف العائمة سمكها ${fmt(tv.shelf_thickness)} سم — بتتركب على حوامل مخفية في الحيطة قبل البانوه.`);
  }

  if (tv.led) d.addLed("ليد ورا البانوه", tb.box(bx0 + 3, dmax, pz1 - 3.0, bx1 - 3, dmax + 0.8, pz1 - 1.4));
  d.notes.push("منتصف الشاشة المعتاد 110–120 سم من الأرض (قعدة) — ثبّت الحامل في الحيطة نفسها مش في البانوه.");
  if (list.length > 1) d.notes.push(`البانوه ${list.length} شرايح — الفواصل بينهم بتبان؛ لو عايزها مخفية اعمل حليات أو شريط ألومنيوم.`);
}

// ================================================================ bed
export function buildBed(tb: TemplateBuilder): void {
  const { d, p, t } = tb;
  const b = p.bed;
  const c = b.clearance;
  const win = b.mattress_width + 2 * c;
  const lin = b.mattress_length + 2 * c;
  const bw = win + 2 * t;
  const bl = lin + 2 * t;
  const bh = b.height;
  const storage = b.storage;
  if (bh < 15) {
    d.errors.push(`ارتفاع السرير ${fmt(bh)} سم صغير قوي.`);
    return;
  }
  let spineX: number | null = null;
  withModule(tb, "frame", () => {
    for (const [nm, x0, x1] of [["جنب سرير شمال", 0.0, t], ["جنب سرير يمين", bw - t, bw]] as [string, number, number][]) {
      tb.add(nm, "side", "front", tb.box(x0, 0.0, 0.0, x1, bl, bh), { band: ["top", "front", "back"], grain: "y" });
    }
    tb.add("لوح الرجلين", "side", "front", tb.box(t, 0.0, 0.0, bw - t, t, bh), { band: ["top"], grain: "x" });
    tb.add("لوح الراس (داخلي)", "side", "carcass", tb.box(t, bl - t, 0.0, bw - t, bl, bh), { band: ["top"], grain: "x" });
    const xs = strips(win);
    const split = xs.length > 1;
    spineX = split ? t + xs[0][1] : null;
    const zBottom = storage === "lift" ? t : 0.0;
    if (storage === "lift") {
      xs.forEach(([a, e], i) => {
        tb.add(split ? `قاعدة صندوق ${i + 1}` : "قاعدة صندوق", "horizontal", "carcass", tb.box(t + a, t, 0.0, t + e, bl - t, t), { band: [], grain: "y" });
      });
    }
    if (spineX !== null) {
      tb.add("ضلع أوسط", "divider", "carcass", tb.box(spineX - t / 2, t, zBottom, spineX + t / 2, bl - t, bh - t), { band: [], grain: "y" });
    }
  });

  if (storage === "lift") {
    withModule(tb, "cleats", () => {
      const cz0 = bh - t - 5.0;
      const cz1 = bh - t;
      ([[t, t + t], [bw - t - t, bw - t]] as [number, number][]).forEach(([x0, x1], i) => {
        tb.add(`مسند غطا جنب ${i + 1}`, "cleat", "carcass", tb.box(x0, t + t, cz0, x1, bl - t - t, cz1), { band: [], grain: "y", note: "لزق + مسامير على الجنب" });
      });
      ([[t, t + t], [bl - t - t, bl - t]] as [number, number][]).forEach(([y0, y1], i) => {
        const xsGap: [number, number][] = spineX !== null
          ? [[t + t, spineX - t / 2], [spineX + t / 2, bw - t - t]] : [[t + t, bw - t - t]];
        xsGap.forEach(([x0, x1], j) => {
          tb.add(`مسند غطا ${i === 0 ? "رجلين" : "راس"} ${j + 1}`, "cleat", "carcass", tb.box(x0, y0, cz0, x1, y1, cz1), { band: [], grain: "x", note: "لزق + مسامير" });
        });
      });
    });
    const key = "lid";
    d.addGroup({ key, kind: "door", name: "غطا السرير", hinge_side: "top",
      hinge: { point: [bw / 2.0, bl - t, bh], axis: [1, 0, 0], free: [bw / 2.0, t, bh], normal: [0, 0, 1] },
      box: tb.box(t, t, bh - t, bw - t, bl - t, bh) });
    withModule(tb, "lid", () => {
      strips(win).forEach(([a, e], i) => {
        tb.add(strips(win).length > 1 ? `غطا صندوق ${i + 1}` : "غطا صندوق", "door", "carcass", tb.box(t + a, t, bh - t, t + e, bl - t, bh), { band: [], group: key, grain: "y", layer: "front" });
      });
    });
    inc(d.hardware, "مكبس غاز سرير + مكانيزم رفع (طقم)", 1);
    d.notes.push("مكانيزم الرفع بيتركب على الجنبين من جوه قرب الراس — اتأكد من طوله حسب طول السرير.");
  } else {
    withModule(tb, "frame", () => {
      strips(win).forEach(([a, e], i) => {
        tb.add(strips(win).length > 1 ? `قاعدة مرتبة ${i + 1}` : "قاعدة مرتبة", "horizontal", "carcass", tb.box(t + a, t, bh - t, t + e, bl - t, bh), { band: [], grain: "y" });
      });
    });
  }

  if (b.floating) floatBed(tb, bw, bl);
  if (b.headboard) buildHeadboard(tb, bw, bl);
  if (!b.floating) inc(d.hardware, "لباد تحت الشاسيه", 6);
  p.width = rround(bw + 2 * (b.headboard ? b.headboard_extra : 0.0), 2);
  p.depth = rround(Math.max(...d.parts.map((pt) => pt.box.y1)), 2);
  p.height = rround(Math.max(...d.parts.map((pt) => pt.box.z1)), 2);
  d.notes.push(`المرتبة ${fmt(b.mattress_width)}×${fmt(b.mattress_length)} — الصندوق من جوه ${fmt(win)}×${fmt(lin)} (خلوص ${fmt(c)} سم من كل ناحية).`);
}

function floatBed(tb: TemplateBuilder, bw: number, bl: number): void {
  const { d, p, t } = tb;
  const b = p.bed;
  const fh = b.float_height;
  const sb = b.float_setback;
  for (const pt of d.parts) {
    if (!["frame", "cleats", "lid"].includes(pt.module ?? "")) continue;
    pt.box = { ...pt.box, z0: rround(pt.box.z0 + fh, 4), z1: rround(pt.box.z1 + fh, 4) };
  }
  for (const g of d.groups) {
    if (g.key !== "lid") continue;
    g.hinge = { ...g.hinge, point: [g.hinge.point[0], g.hinge.point[1], g.hinge.point[2] + fh], free: [g.hinge.free[0], g.hinge.free[1], g.hinge.free[2] + fh] };
    g.box = { ...g.box, z0: g.box.z0 + fh, z1: g.box.z1 + fh };
  }
  const x0 = sb;
  const x1 = bw - sb;
  const y0 = sb;
  const y1 = bl - sb;
  withModule(tb, "float_base", () => {
    tb.add("قاعدة معلّقة جنب شمال", "side", "carcass", tb.box(x0, y0, 0.0, x0 + t, y1, fh), { band: [], grain: "y" });
    tb.add("قاعدة معلّقة جنب يمين", "side", "carcass", tb.box(x1 - t, y0, 0.0, x1, y1, fh), { band: [], grain: "y" });
    tb.add("قاعدة معلّقة قدام", "side", "carcass", tb.box(x0 + t, y0, 0.0, x1 - t, y0 + t, fh), { band: [], grain: "x" });
    tb.add("قاعدة معلّقة ورا", "side", "carcass", tb.box(x0 + t, y1 - t, 0.0, x1 - t, y1, fh), { band: [], grain: "x" });
  });
  inc(d.hardware, "رجل تسوية للقاعدة", 6);
  if (b.led) {
    d.addLed("ليد تحت السرير قدام", tb.box(3.0, 3.0, fh - 0.5, bw - 3.0, 4.6, fh));
    d.addLed("ليد تحت السرير شمال", tb.box(3.0, 5.0, fh - 0.5, 4.6, bl - 5.0, fh));
    d.addLed("ليد تحت السرير يمين", tb.box(bw - 4.6, 5.0, fh - 0.5, bw - 3.0, bl - 5.0, fh));
  }
  d.notes.push(`السرير المعلّق: القاعدة داخلة ${fmt(sb)} سم وارتفاعها ${fmt(fh)} سم — ثبّت الصندوق عليها بزوايا من جوه.`);
}

function buildHeadboard(tb: TemplateBuilder, bw: number, bl: number): void {
  const { d, p, t } = tb;
  const b = p.bed;
  const ex = b.headboard_extra;
  const ht = b.headboard_thickness;
  const hh = b.headboard_height;
  const style = b.headboard_style;
  const hx0 = -ex;
  const hx1 = bw + ex;
  const width = hx1 - hx0;
  const uph = b.upholstered ? "تنجيد: فوم 5 سم + قماش على الوش (يتعمل بره الورشة)" : null;
  let frontY = bl;
  withModule(tb, "headboard", () => {
    if (style === "slats") {
      const sw = b.slat_width;
      const gap = b.slat_gap;
      const n = Math.floor((width + gap) / (sw + gap));
      const used = n * sw + (n - 1) * gap;
      const start = hx0 + (width - used) / 2.0;
      for (let i = 0; i < n; i++) {
        const x = start + i * (sw + gap);
        tb.add(`شريحة ضهر ${i + 1}`, "other", "accent", tb.box(x, bl, 0.0, x + sw, bl + t, hh), { band: ["left", "right", "top"], grain: "z", layer: "front" });
      }
      frontY = bl + t;
      backParts(tb, hx0, width, frontY, ht, hh, "ضهر خلفي للشرايح", "carcass", null);
      d.notes.push(`الشرايح ${n} شريحة × ${fmt(sw)} سم بمسافة ${fmt(gap)} سم — بتتلزق وتتسمر من ورا على اللوح الخلفي.`);
    } else if (style === "panels") {
      backParts(tb, hx0, width, frontY + t, ht, hh, "ضهر خلفي للبانوهات", "carcass", null);
      const bands = b.panel_rows;
      const gap = 0.6;
      const bhEach = (hh - (bands - 1) * gap) / bands;
      for (let i = 0; i < bands; i++) {
        const z0 = i * (bhEach + gap);
        strips(width).forEach(([a, e], j) => {
          tb.add(`بانوه ضهر ${i + 1}-${j + 1}`, "other", "accent", tb.box(hx0 + a, bl, z0, hx0 + e, bl + t, z0 + bhEach), {
            band: ["left", "right", "top", "bottom"], grain: "x", layer: "front", note: uph,
          });
        });
      }
      frontY = bl + t;
    } else {
      backParts(tb, hx0, width, bl, ht, hh, "ضهر سرير", "accent", uph);
    }
  });

  if (b.headboard_shelf) {
    const sd = 12.0;
    withModule(tb, "hb_shelf", () => {
      strips(width, 240.0).forEach(([a, e], i) => {
        tb.add(strips(width, 240.0).length > 1 ? `رف فوق الضهر ${i + 1}` : "رف فوق الضهر", "other", "accent",
          tb.box(hx0 + a, frontY - sd, hh, hx0 + e, bl + ht + (frontY - bl), hh + t), { band: ["front", "left", "right"], grain: "x" });
      });
    });
    inc(d.hardware, "حامل رف مخفي", 3);
    if (b.led) d.addLed("ليد تحت رف الضهر", tb.box(hx0 + 3, frontY - sd + 1.5, hh - 0.5, hx1 - 3, frontY - sd + 3.1, hh));
  } else if (b.led) {
    const backY = Math.max(...d.parts.filter((pt) => pt.module === "headboard").map((pt) => pt.box.y1));
    d.addLed("ليد ورا الضهر", tb.box(hx0 + 3, backY, hh - 3.0, hx1 - 3, backY + 0.8, hh - 1.4));
  }

  if (b.side_tables) {
    if (ex < 48) {
      d.warnings.push("الكومودينو المعلّق محتاج الضهر يبقى أعرض من السرير بـ 48 سم على الأقل من كل ناحية — زوّد \"الضهر أعرض من السرير\".");
    } else {
      const tw = Math.min(ex - 5.0, 55.0);
      ([["كومودينو شمال", -tw - 3.0], ["كومودينو يمين", bw + 3.0]] as [string, number][]).forEach(([nm, x], i) => {
        subUnit(tb, { width: tw, height: 22.0, depth: 38.0, mount: "wall", top: "full", led_under: b.led, back: { enabled: true },
          fronts: [{ type: "drawers", count: 1 }] }, [x, bl - 38.0, 38.0], nm, `table${i}`);
      });
    }
  }
  inc(d.hardware, "مسامير ربط ضهر السرير بالشاسيه", 4);
  inc(d.hardware, "زد تعليق ضهر سرير (طقم)", 1);
}

function backParts(tb: TemplateBuilder, x0: number, width: number, y0: number, th: number, hh: number, name: string, mat: string, note: string | null): void {
  let list: [number, number][] = hh > MAX_STRIP && width > MAX_STRIP ? strips(width) : [[0.0, width]];
  if (width > 240) list = strips(width);
  list.forEach(([a, e], i) => {
    tb.add(list.length > 1 ? `${name} ${i + 1}` : name, "other", mat, tb.box(x0 + a, y0, 0.0, x0 + e, y0 + th, hh), {
      band: ["left", "right", "top"], grain: list.length > 1 ? "z" : "x", layer: "front", note,
    });
  });
}

// ================================================================ dresser
export function buildDresser(tb: TemplateBuilder): void {
  const { d, p, t, w, dp } = tb;
  const r = p.dresser;
  let bh = r.base_height;
  const zf = p.mount === "wall" ? r.float_height : 0.0;
  subUnit(tb, { width: w, height: bh, depth: dp, mount: p.mount, top: "full", led_under: p.led_under, fronts: p.fronts }, [0.0, 0.0, zf], "وحدة التسريحة", "base");
  bh += zf;
  const mw = Math.min(r.mirror_width, w);
  const mh = r.mirror_height;
  const x0 = (w - mw) / 2.0;
  const z0 = bh + r.mirror_gap;
  withModule(tb, "mirror", () => {
    tb.add("لوح المراية", "other", "front", tb.box(x0, dp - t, z0, x0 + mw, dp, z0 + mh), { band: ["left", "right", "top", "bottom"], grain: "z", layer: "front" });
    tb.add("مراية التسريحة", "mirror", "mirror", tb.box(x0 + 2, dp - t - 0.4, z0 + 2, x0 + mw - 2, dp - t, z0 + mh - 2), { layer: "front", cut_piece: false });
  });
  if (r.mirror_led) {
    d.addLed("ليد ورا المراية فوق", tb.box(x0 + 3, dp, z0 + mh - 4, x0 + mw - 3, dp + 0.8, z0 + mh - 2.4));
    d.addLed("ليد ورا المراية تحت", tb.box(x0 + 3, dp, z0 + 2.4, x0 + mw - 3, dp + 0.8, z0 + 4));
    d.addLed("ليد ورا المراية شمال", tb.box(x0 + 2.4, dp, z0 + 5, x0 + 4, dp + 0.8, z0 + mh - 5));
    d.addLed("ليد ورا المراية يمين", tb.box(x0 + mw - 4, dp, z0 + 5, x0 + mw - 2.4, dp + 0.8, z0 + mh - 5));
    d.notes.push("المراية Backlit: لوح المراية بيتركب على دبل 2 سم بعيد عن الحيطة عشان النور يطلع حواليه.");
  }
  inc(d.hardware, `مراية ${fmt(mw - 4)}×${fmt(mh - 4)} سم`, 1);
  inc(d.hardware, "زد تعليق لوح المراية (طقم)", 1);
  d.notes.push("المراية بتتلزق على اللوح بسيليكون مرايات، واللوح بيتعلّق على الحيطة.");
  p.height = rround(z0 + mh, 2);
}

// ================================================================ desk
export function buildDesk(tb: TemplateBuilder): void {
  const { d, p, t, w, dp } = tb;
  const k = p.desk;
  const dh = k.height;
  const ped = k.pedestal;
  const pw = k.pedestal_width;
  withModule(tb, "desk", () => {
    tb.add("سطح المكتب", "horizontal", "front", tb.box(0.0, 0.0, dh - t, w, dp, dh), { band: ["front", "left", "right"], grain: "x" });
  });
  let innerL = t;
  let innerR = w - t;
  for (const [side, x] of [["left", 0.0], ["right", w - pw]] as [string, number][]) {
    if (ped === side) {
      subUnit(tb, { width: pw, height: dh - t, depth: dp - 2.0, mount: "floor", top: "full",
        fronts: [{ type: "drawers", count: k.pedestal_drawers }] }, [x, 2.0, 0.0], "وحدة أدراج", "ped");
      if (side === "left") innerL = pw;
      else innerR = w - pw;
      inc(d.hardware, "مسامير تثبيت السطح على وحدة الأدراج", 4);
    } else {
      withModule(tb, "desk", () => {
        const sx = side === "left" ? 0.0 : w - t;
        tb.add(`جنب مكتب ${side === "left" ? "شمال" : "يمين"}`, "side", "front", tb.box(sx, 0.0, 0.0, sx + t, dp, dh - t), { band: ["front"], grain: "z" });
      });
    }
  }
  if (k.modesty && innerR - innerL > 10) {
    withModule(tb, "desk", () => {
      tb.add("لوح أمامي (Modesty)", "divider", "front", tb.box(innerL, dp - 5.0 - t, dh - t - 40.0, innerR, dp - 5.0, dh - t), { band: ["bottom"], grain: "x" });
    });
  }
  const ns = Math.trunc(Number(k.wall_shelves));
  if (ns > 0) {
    const swid = Math.min(w - 20.0, 120.0);
    const sx0 = (w - swid) / 2.0;
    withModule(tb, "wall_shelves", () => {
      for (let i = 0; i < ns; i++) {
        const z = dh + 35.0 + i * 35.0;
        tb.add(d.seqName("رف حيطة"), "other", "front", tb.box(sx0, dp - 25.0, z, sx0 + swid, dp, z + t), { band: ["front", "left", "right"], grain: "x" });
        if (k.led && i === 0) d.addLed(d.seqName("ليد رف حيطة"), tb.box(sx0 + 2, dp - 23.5, z - 0.5, sx0 + swid - 2, dp - 21.9, z));
      }
    });
    inc(d.hardware, "حامل رف مخفي", 2 * ns);
    p.height = dh + 35.0 * ns + t;
  }
  d.notes.push("اعمل فتحة كابلات Ø6 في السطح ورا الشاشة (Grommet).");
  if (!(ns > 0)) p.height = dh;
}
