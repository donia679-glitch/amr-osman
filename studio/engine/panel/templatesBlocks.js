// NOVERA v86 — «ترابيزات كتل»: tables, side tables, nightstands and TV units composed of slabs, boxes and drawer boxes
// (the interlocking / floating-slab look). Every block is placed in the unit's frame (x width → right, y depth → back, z up);
// its numbers may be expressions of W, D, H (the unit's size) and T (the board thickness), so the design scales when resized.
import { fmt, inc } from "../core/ruby.js";
import { rround } from "../core/rubyMath.js";
import * as Catalog from "./catalog.js";

export const BLOCK_KINDS = { slab: "لوح", box: "صندوق", drawer: "صندوق بدرج", glass: "زجاج" };
export const FACES = ["left", "right", "top", "bottom", "back", "front"];
const FACE_AR = { left: "جنب شمال", right: "جنب يمين", top: "رأس", bottom: "قاعدة", back: "ظهر", front: "وش" };

const SAFE = /^[\d\s+\-*/().WDHT]+$/;
/** a block number: a number, or a string formula of W D H T ("W-40", "(D-T)/2") */
export function ev(v, c) {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (!SAFE.test(s)) return NaN;
  try { return Number(new Function("W", "D", "H", "T", `return (${s});`)(c.W, c.D, c.H, c.T)); } catch { return NaN; }
}

export function buildBlocks(tb) {
  const { d, p } = tb;
  const T = p.thickness, ft = p.front_thickness, g = p.front_gap;
  const ctx = { W: p.width, D: p.depth, H: p.height, T };
  const blocks = Array.isArray(p.blocks) ? p.blocks : [];
  if (!blocks.length) { d.errors.push("التصميم ده مفيهوش كتل — ضيف لوح أو صندوق."); return; }
  const seq = {};
  const nm = (base) => { seq[base] = (seq[base] || 0) + 1; return `${base} ${seq[base]}`; };
  blocks.forEach((b, i) => {
    const kind = BLOCK_KINDS[b.k] ? b.k : "slab";
    const x = ev(b.x, ctx), y = ev(b.y, ctx), z = ev(b.z, ctx), w = ev(b.w, ctx), dp = ev(b.d, ctx), h = ev(b.h, ctx);
    if ([x, y, z, w, dp, h].some((v) => !isFinite(v))) { d.errors.push(`الكتلة ${i + 1}: في رقم أو معادلة مش مفهومة.`); return; }
    if (w <= 0 || dp <= 0 || h <= 0) { d.errors.push(`الكتلة ${i + 1}: المقاس لازم يكون أكبر من صفر.`); return; }
    const mat = b.mat || (kind === "glass" ? "glass" : "carcass");
    const t = kind === "glass" ? (+b.t || 0.8) : (+b.t || T);
    const label = b.name || "";
    const bx = (x0, y0, z0, x1, y1, z1) => tb.box(rround(x0, 3), rround(y0, 3), rround(z0, 3), rround(x1, 3), rround(y1, 3), rround(z1, 3));
    if (kind === "slab" || kind === "glass") {
      // a single board; its role follows its thin direction (a top / shelf lies flat, a side stands)
      const thin = Math.min(w, dp, h);
      const role = kind === "glass" ? "other" : thin === h ? "horizontal" : "side";
      const name = label || nm(kind === "glass" ? "زجاج" : thin === h ? "سطح" : thin === w ? "جنب" : "لوح واقف");
      d.addPart(name, role, mat, bx(x, y, z, x + w, y + dp, z + h), {
        band: kind === "glass" ? [] : ["left", "right", "top", "bottom", "front", "back"], band_all_sides: kind !== "glass", layer: role === "horizontal" ? "shelf" : "carcass",
        grain: b.grain || null, note: kind === "glass" ? `زجاج ${fmt(t * 10)} مم مصنفر الحواف — بيتثبت بلزق شفاف أو مساند سيليكون` : null,
      });
      if (kind === "glass") inc(d.hardware, "مساند زجاج سيليكون شفاف", 4);
      return;
    }
    // ---- a box: faces present (default every face but the front), top/bottom wrap the sides unless joint = "sides"
    const faces = Array.isArray(b.faces) && b.faces.length ? b.faces.filter((f) => FACES.includes(f)) : (kind === "drawer" ? ["left", "right", "top", "bottom", "back"] : ["left", "right", "top", "bottom", "back"]);
    const has = (f) => faces.includes(f);
    const wrap = b.joint !== "sides";
    const x0 = x, x1 = x + w, y0 = y, y1 = y + dp, z0 = z, z1 = z + h;
    const bt = b.back_t ? +b.back_t : t; // boxes in this family show their backs: full-thickness back by default
    const backMat = b.back_mat || mat;
    const base = label || nm("صندوق");
    const tag = blocks.length > 1 ? ` ${base}` : "";
    const sz0 = wrap && has("bottom") ? z0 + t : z0, sz1 = wrap && has("top") ? z1 - t : z1;
    const hx0 = !wrap && has("left") ? x0 + t : x0, hx1 = !wrap && has("right") ? x1 - t : x1;
    const yBack = has("back") ? y1 - bt : y1; // the inside stops at the back
    const opts = (edges) => ({ band: edges, band_all_sides: false, layer: "carcass" });
    if (has("left")) d.addPart(`جنب شمال${tag}`, "side", mat, bx(x0, y0, sz0, x0 + t, y1, sz1), opts(["front", "back", "top", "bottom"]));
    if (has("right")) d.addPart(`جنب يمين${tag}`, "side", mat, bx(x1 - t, y0, sz0, x1, y1, sz1), opts(["front", "back", "top", "bottom"]));
    if (has("top")) d.addPart(`رأس${tag}`, "horizontal", mat, bx(hx0, y0, z1 - t, hx1, y1, z1), opts(["front", "back", "left", "right"]));
    if (has("bottom")) d.addPart(`قاعدة${tag}`, "horizontal", mat, bx(hx0, y0, z0, hx1, y1, z0 + t), opts(["front", "back", "left", "right"]));
    if (has("back")) {
      const ix0 = has("left") ? x0 + t : x0, ix1 = has("right") ? x1 - t : x1, iz0 = has("bottom") ? z0 + t : z0, iz1 = has("top") ? z1 - t : z1;
      d.addPart(`ظهر${tag}`, bt >= 1 ? "divider" : "back", backMat, bx(ix0, y1 - bt, iz0, ix1, y1, iz1), opts(bt >= 1 ? ["left", "right", "top", "bottom"] : []));
    }
    if (has("front")) {
      const ix0 = has("left") ? x0 + t : x0, ix1 = has("right") ? x1 - t : x1, iz0 = has("bottom") ? z0 + t : z0, iz1 = has("top") ? z1 - t : z1;
      d.addPart(`وش ثابت${tag}`, "divider", mat, bx(ix0, y0, iz0, ix1, y0 + t, iz1), opts(["left", "right", "top", "bottom"]));
    }
    // inner shelves / dividers
    const ix0 = has("left") ? x0 + t : x0, ix1 = has("right") ? x1 - t : x1, iz0 = has("bottom") ? z0 + t : z0, iz1 = has("top") ? z1 - t : z1;
    const n = Math.max(0, Math.round(+b.shelves || 0)), setback = +b.setback || 0;
    for (let k = 1; k <= n; k++) {
      const zc = iz0 + ((iz1 - iz0) * k) / (n + 1);
      d.addPart(`رف ${k}${tag}`, "fixed_shelf", b.shelf_mat || mat, bx(ix0, y0 + setback, zc - t / 2, ix1, yBack, zc + t / 2), { band: ["front"], layer: "shelf" });
    }
    const nd = Math.max(0, Math.round(+b.dividers || 0));
    for (let k = 1; k <= nd; k++) {
      const xc = ix0 + ((ix1 - ix0) * k) / (nd + 1);
      d.addPart(`قاطوع ${k}${tag}`, "divider", mat, bx(xc - t / 2, y0 + setback, iz0, xc + t / 2, yBack, iz1), { band: ["front"], layer: "carcass" });
    }
    if (kind === "drawer") {
      // one drawer filling the opening: overlay front in front of the box, wooden box on runners
      const dr = p.drawer, bt2 = dr.box_thickness, bb = dr.bottom_thickness, sc = dr.slide_clearance;
      const depthIn = yBack - y0;
      const slide = Catalog.slideFor(depthIn - 1.0);
      if (!slide) { d.errors.push(`${base}: العمق ${fmt(depthIn)} سم مش كفاية لأقصر مجرى (30 سم).`); return; }
      // a drawer of a given height at the bottom, with an open niche above it (behind a fixed shelf)
      let dz1 = iz1;
      const dh = ev(b.drawer_h, ctx);
      if (dh > 0 && dh < iz1 - iz0 - t - 4) {
        dz1 = iz0 + dh;
        d.addPart(`رف فوق الدرج${tag}`, "fixed_shelf", mat, bx(ix0, y0, dz1, ix1, yBack, dz1 + t), { band: ["front"], layer: "shelf" });
      }
      const fh = dz1 - iz0, fw = ix1 - ix0;
      if (fh < 8 || fw < 2 * bt2 + 5) { d.errors.push(`${base}: الفتحة صغيرة على درج.`); return; }
      const dn = nm("درج"), key = `blockdrawer${i + 1}`;
      d.addGroup({ key, kind: "drawer", name: dn, open_distance: rround(slide * 0.75, 2), slide_len: slide });
      const over = b.front_cover === "inset" ? 0 : t; // the front covers the box's edges (overlay) unless inset
      const fx0 = ix0 - over + g / 2, fx1 = ix1 + over - g / 2, fz0 = iz0 - over + g / 2, fz1 = dz1 + (dz1 === iz1 ? over : t / 2) - g / 2;
      d.addPart(`وش ${dn}`, "door", b.front_mat || "front", bx(fx0, y0 - ft, fz0, fx1, y0, fz1), {
        label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true, layer: "front", group: key, grain: "x", door_label: { hinge_side: "drawer" },
        note: b.handle === "none" || b.front_cover === "recess" ? "من غير مقبض — بيتفتح من حرف الوش اللي فوق (خلوص 2 سم)" : null,
      });
      if (!(b.handle === "none")) inc(d.hardware, "مقبض", 1);
      const bx0 = ix0 + sc, bx1 = ix1 - sc, bz0 = iz0 + 1.0, bz1 = Math.min(dz1 - 2.5, bz0 + Math.max(6, fh - 3.5)), by0 = y0 + 0.5, by1 = by0 + slide, gd = dr.groove_depth;
      const gz = bz0 + 1.0 + bb / 2.0;
      for (const [sd, a0, a1] of [["شمال", bx0, bx0 + bt2], ["يمين", bx1 - bt2, bx1]]) {
        const bb0 = bx(a0, by0, bz0, a1, by1, bz1);
        const pt = d.addPart(`جنب ${dn} ${sd}`, "drawer_box", "drawer_box", bb0, { label_axes: ["y", "z"], band: ["top"], group: key, grain: "y" });
        pt.label.groove = d.grooveFor(bb0, pt.axes, "y", gz);
      }
      for (const [sd, c0, c1] of [["أمامي", by0, by0 + bt2], ["خلفي", by1 - bt2, by1]]) {
        const bb0 = bx(bx0 + bt2, c0, bz0, bx1 - bt2, c1, bz1);
        const pt = d.addPart(`${sd} صندوق ${dn}`, "drawer_box", "drawer_box", bb0, { label_axes: ["x", "z"], band: ["top"], group: key, grain: "x" });
        pt.label.groove = d.grooveFor(bb0, pt.axes, "x", gz);
      }
      d.addPart(`قاعدة ${dn}`, "drawer_bottom", "drawer_bottom", bx(bx0 + bt2 - gd, by0 + bt2 - gd, bz0 + 1.0, bx1 - bt2 + gd, by1 - bt2 + gd, bz0 + 1.0 + bb), { label_axes: ["x", "y"], band: [], group: key });
      inc(d.hardware, `مجرى تاندم مخفي سوفت كلوز ${slide} سم (زوج)`, 1);
      inc(d.hardware, "دوبل صندوق درج", 8);
    }
  });
  // feet / notes
  const lowest = Math.min(...d.parts.map((pt) => pt.box.z0));
  if (lowest <= 0.01) inc(d.hardware, "كعب رجل (لباد / بلاستيك)", 4);
  d.notes.push("الكتل بتتثبت في بعض بأليتا + خابور على الأوشاش المتلامسة (الخرم بيطلع تلقائي)، والألواح المحمّلة على كتلة بمسمار ربط من جوه الصندوق.");
}
