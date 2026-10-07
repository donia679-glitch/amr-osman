// ورشة الرسم — مصمّم الوحدات بالقطع (v72): a cabinet described by roles and joints, turned into studio boards.
// Coordinates: x across (0 = left outer face), y depth (0 = carcass front, D = rear), z up (0 = floor under the sides).
// Every board is a studio solid { plane:{o,u,v}, outer: rect, depth } extruded from its plane along n = u × v.
import * as G from "./geom.js";

const uid = () => Math.random().toString(36).slice(2, 9);
export const r1 = (v) => Math.round(v * 10) / 10;

/** a fresh cabinet with NOVERA's defaults */
export function newCab(n = 1, x0 = 0) {
  return {
    id: uid(), name: `علبة ${n}`, W: 60, H: 72, D: 58, t: 1.8, tb: 0.6, pos: [x0, 0, 0],
    bottom: { joint: "between", kick: 10, insetF: 0, insetB: 0 },        // between = القاعدة بين الجنبين · under = الجنبين واقفين على القاعدة
    top: { joint: "rails", railW: 8, railInset: 2.5 },                    // between · over (الرأس فوق الجنبين) · rails (شريطين) · none
    back: { kind: "groove", off: 1.8, groove: 0.8, rabbet: 0.9 },         // groove = مفحار · rabbet = أورزة · overlay = مسمّر من ورا · none
    front: { overlay: true, gap: 0.3, reveal: 0.2 },                      // overlay fronts cover the carcass edges; reveal = what stays visible at the outer edges
    drawers: { clr: 0.6, boxT: 1.8, baseT: 0.6, drop: 3, lowerFront: 2 }, // runner clearance per side, box walls, box bottom, box lower than the front
    hdividers: [], // horizontal structural dividers across the whole width {id, from: bottom|top, at}
    vparts: [],    // inner vertical partitions inside a cavity, like shelves but upright {id, band, col, x (from the cavity's left face), setback}
    dividers: [], shelves: [], fronts: [], // fronts: zones over one or more cavities {id, cavs:[keys], kind, hinge, n, hs}
  };
}
export const BOTTOM_JOINTS = { between: "القاعدة بين الجنبين", under: "الجنبين واقفين على القاعدة" };
export const TOP_JOINTS = { between: "رأس بين الجنبين", over: "رأس فوق الجنبين", rails: "شريطين (أمامي وخلفي)", none: "من غير رأس" };
export const BACK_KINDS = { groove: "ظهر في مفحار", rabbet: "ظهر في أورزة", overlay: "ظهر مسمّر من ورا", none: "من غير ظهر" };
export const FILL_KINDS = { open: "فاضي (مفتوح)", door1: "ضلفة واحدة", door2: "ضلفتين", flap: "ضلفة قلاب", drawers: "أدراج", split: "مقسّم (فراغات جوه الفراغ)" };
export const SUB_KINDS = { door1: "ضلفة واحدة", door2: "ضلفتين", flap: "ضلفة قلاب", drawers: "أدراج", open: "فاضي" };

/** the inner box the dividers/shelves/fronts work in */
export function inner(c) {
  const t = c.t, z0 = c.bottom.kick + t;
  const z1 = c.top.joint === "none" ? c.H : c.H - t;
  const Db = c.back.kind === "none" || c.back.kind === "overlay" ? c.D : c.back.kind === "rabbet" ? c.D - c.tb : c.D - c.back.off - c.tb; // y of the back's front face
  return { x0: t, x1: c.W - t, z0, z1, y0: 0, y1: Db };
}
/** the horizontal dividers (full width) sorted bottom → top with their z range */
export function hdividerBoxes(c) {
  const I = inner(c);
  return (c.hdividers || []).map((d) => { const z0 = d.from === "top" ? I.z1 - d.at - c.t : I.z0 + d.at; return { d, z0: r1(z0), z1: r1(z0 + c.t) }; }).filter((b) => b.z0 >= I.z0 - 0.01 && b.z1 <= I.z1 + 0.01).sort((a, b) => a.z0 - b.z0);
}
/** the bands between the bottom, the horizontal dividers and the top */
export function bands(c) {
  const I = inner(c), H = hdividerBoxes(c), out = [];
  let z = I.z0;
  for (const b of H) { if (b.z0 - z > 0.5) out.push({ z0: z, z1: b.z0 }); z = b.z1; }
  if (I.z1 - z > 0.5) out.push({ z0: z, z1: I.z1 });
  return out;
}
/** the vertical dividers of one band (full-height ones + the ones limited to this band) sorted left → right */
export function dividerBoxes(c, bi = null) {
  const I = inner(c);
  return c.dividers.filter((d) => bi === null || d.band == null || d.band === "" || +d.band === bi).map((d) => { const x0 = d.from === "right" ? c.W - c.t - d.at - c.t : c.t + d.at; return { d, x0: r1(x0), x1: r1(x0 + c.t) }; }).filter((b) => b.x0 >= I.x0 - 0.01 && b.x1 <= I.x1 + 0.01).sort((a, b) => a.x0 - b.x0);
}
/** the columns of one band between the sides and its dividers */
export function columns(c, bi = 0) {
  const I = inner(c), D = dividerBoxes(c, bi), cols = [];
  let x = I.x0;
  for (const b of D) { if (b.x0 - x > 0.5) cols.push({ x0: x, x1: b.x0 }); x = b.x1; }
  if (I.x1 - x > 0.5) cols.push({ x0: x, x1: I.x1 });
  return cols;
}
/** every cell = band × column */
export function cells(c) {
  const out = [];
  bands(c).forEach((bd, bi) => columns(c, bi).forEach((col, ci) => out.push({ band: bi, col: ci, x0: col.x0, x1: col.x1, z0: bd.z0, z1: bd.z1 })));
  return out;
}
const shelfBand = (s) => (s.band == null || s.band === "" ? 0 : +s.band);
/** the cavities the fronts work on = the cells between the sides, the dividers (vertical and horizontal), the bottom and the top; key "band:col".
 *  Shelves live inside a cavity and never split it (a door covers the shelves behind it). */
export function cavities(c) {
  const I = inner(c);
  return cells(c).map((cell) => ({ key: `${cell.band}:${cell.col}`, band: cell.band, col: cell.col, x0: cell.x0, x1: cell.x1, z0: cell.z0, z1: cell.z1, y1: I.y1,
    below: Math.abs(cell.z0 - I.z0) < 0.01 ? "bottom" : "hdiv", above: Math.abs(cell.z1 - I.z1) < 0.01 ? "top" : "hdiv" }));
}
/** the cabinet's placement: local (x across, y depth, z up) → world. `rot` = degrees about z, `mirror` = left ↔ right (x → W − x) */
export function cabXf(c) {
  const a = ((+c.rot || 0) * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a), m = !!c.mirror, W = c.W, pos = c.pos || [0, 0, 0];
  const cl = (v) => (Math.abs(v) < 1e-9 ? 0 : v);
  const R = (p) => [cl(p[0] * co - p[1] * si), cl(p[0] * si + p[1] * co), p[2]];
  return { m, P: (p) => G.add(R(m ? [W - p[0], p[1], p[2]] : p), pos).map((v) => Math.round(v * 1e4) / 1e4), V: (v) => R(m ? [-v[0], v[1], v[2]] : v) };
}
function place(s, xf) {
  const pl = s.plane, o = xf.P(pl.o), u = xf.V(pl.u);
  let v = xf.V(pl.v);
  if (xf.m) {
    // a mirror turns the frame left-handed: flip v back (and the outline with it) so the board extrudes the mirrored way
    v = G.mul(v, -1);
    const flip = (l) => l.map(([a, b]) => [a, b === 0 ? 0 : -b]);
    s.outer = G.ccw(flip(s.outer)); s.holes = (s.holes || []).map((h) => G.cw(flip(h))); s.pockets = (s.pockets || []).map((pk) => ({ ...pk, loop: G.ccw(flip(pk.loop)) }));
  }
  s.plane = { o, u, v };
}
/** read the placement back from the cabinet's left side as it stands now (the user may have moved / turned / mirrored the group).
 *  null when it was tipped off the floor plane (only turns about z are kept). */
export function cabFrame(c, left) {
  if (!left) return null;
  const { o, u, v } = left.plane;
  if (Math.abs(u[2]) > 1e-3 || Math.abs(Math.abs(v[2]) - 1) > 1e-3) return null;
  const mirror = v[2] < 0;
  let rot = (Math.atan2(-u[0], u[1]) * 180) / Math.PI; rot = Math.round(rot * 100) / 100; if (rot <= -180) rot += 360; if (Math.abs(rot) < 0.005) rot = 0;
  const z0 = c.bottom.joint === "under" ? c.bottom.kick + c.t : 0;
  const tmp = cabXf({ ...c, rot, mirror, pos: [0, 0, 0] }).P([0, 0, z0]);
  return { pos: G.sub(o, tmp).map(G.r2), rot, mirror };
}
/** the rectangles (cavity coords) that hold drawers — shelves and partitions there are left out */
function drawerRects(c) {
  const out = [], cavs = cavities(c);
  const walk = (cv, f) => {
    if (!f || f.kind === "open") return;
    if (f.kind === "drawers") { out.push(cv); return; }
    if (f.kind !== "split") return;
    const parts = (f.parts || []).length ? f.parts : [{ kind: "drawers", n: 1, size: 20 }, { kind: "door1" }];
    const dir = f.dir === "v" ? "v" : "h", span = dir === "h" ? cv.z1 - cv.z0 : cv.x1 - cv.x0;
    const fixed = parts.slice(0, -1).map((p) => Math.max(0, +p.size || 0)), rest = span - fixed.reduce((a, b) => a + b, 0);
    let at = dir === "h" ? cv.z0 : cv.x0;
    parts.forEach((p, i) => { const sz = i < parts.length - 1 ? fixed[i] : Math.max(0, rest); if (sz <= 0.5) return; walk(dir === "h" ? { ...cv, z0: at, z1: at + sz } : { ...cv, x0: at, x1: at + sz }, p); at += sz; });
  };
  for (const f of frontZones(c)) {
    const list = cavs.filter((cv) => f.cavs.includes(cv.key)); if (!list.length) continue;
    walk({ x0: Math.min(...list.map((q) => q.x0)), x1: Math.max(...list.map((q) => q.x1)), z0: Math.min(...list.map((q) => q.z0)), z1: Math.max(...list.map((q) => q.z1)) }, f);
  }
  return out;
}
const S = (name, mat, o, u, v, w, h, d, extra = {}) => ({ id: uid(), name, mat, plane: { o, u, v }, outer: G.rect(0, 0, r1(w), r1(h)), holes: [], pockets: [], depth: r1(d), ...extra });
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
/** a groove pocket (the back's مفحار) across a board, given in the board's plane coords */
const groove = (s, u0, u1, v0, v1, depth, face) => { s.pockets.push({ loop: G.rect(r1(u0), r1(v0), r1(u1), r1(v1)), depth: r1(depth), face }); };

/** all the boards of a cabinet (world coords, cab.pos applied) */
export function cabSolids(c) {
  const t = c.t, W = c.W, H = c.H, D = c.D, tb = c.tb, I = inner(c);
  const out = [];
  // banding by role: carcass boards get their front edge, fronts all four, backs and drawer bottoms none, drawer box walls the top edge
  const BAND = { side: ["front"], bottom: ["front"], top: ["front"], rail: ["front"], hdivider: ["front"], divider: ["front"], partition: ["front"], shelf: ["front"], fixed_shelf: ["front"], door: ["left", "right", "top", "bottom"], drawer_front: ["left", "right", "top", "bottom"], back: [], drawer_box: ["top"], drawer_bottom: [] };
  let curRef = null; // the description item being generated (set around each part)
  const add = (s, role, ref = curRef) => { s.cab = c.id; s.role = role; s.group = c.id; if (ref) s.cabRef = ref; s.bandEdges = BAND[role] || ["front"]; if (!s.bandEdges.length) s.band = false; out.push(s); return s; };
  const underJ = c.bottom.joint === "under", overT = c.top.joint === "over";
  const sideZ0 = underJ ? c.bottom.kick + t : 0, sideZ1 = overT ? H - t : H;
  const sideD = c.back.kind === "overlay" ? D : D; // the carcass depth; an overlay back is nailed behind it
  // sides (depth along y, height along z, extruded +x)
  const L = add(S("جنب شمال", "carcass", [0, 0, sideZ0], Y, Z, sideD, sideZ1 - sideZ0, t, { cabKey: "sideL" }), "side");
  const R = add(S("جنب يمين", "carcass", [W - t, 0, sideZ0], Y, Z, sideD, sideZ1 - sideZ0, t), "side");
  // bottom (extruded +z from its plane)
  const bx0 = underJ ? 0 : t, bx1 = underJ ? W : W - t, by0 = c.bottom.insetF, by1 = D - c.bottom.insetB;
  const B = add(S("قاعدة", "carcass", [bx0, by0, c.bottom.kick], X, Y, bx1 - bx0, by1 - by0, t), "bottom");
  // top
  let T = null, TF = null, TB = null;
  if (c.top.joint === "between") T = add(S("رأس", "carcass", [t, 0, H - t], X, Y, W - 2 * t, D, t), "top");
  else if (c.top.joint === "over") T = add(S("رأس", "carcass", [0, 0, H - t], X, Y, W, D, t), "top");
  else if (c.top.joint === "rails") {
    const rw = c.top.railW, fy = c.top.railInset;
    TF = add(S("شريط علوي أمامي", "carcass", [t, fy, H - t], X, Y, W - 2 * t, rw, t), "rail");
    TB = add(S("شريط علوي خلفي", "carcass", [t, I.y1 - rw, H - t], X, Y, W - 2 * t, rw, t), "rail"); TB.bandEdges = []; TB.band = false;
  }
  // back
  if (c.back.kind !== "none") {
    const g = c.back.kind === "groove" ? c.back.groove : 0, rb = c.back.kind === "rabbet" ? c.back.rabbet : 0;
    const by = c.back.kind === "overlay" ? D + tb : c.back.kind === "rabbet" ? D : D - c.back.off; // the back's rear face
    const x0 = c.back.kind === "overlay" ? 0 : t - g - rb, x1 = c.back.kind === "overlay" ? W : W - t + g + rb;
    const z0 = c.back.kind === "overlay" ? c.bottom.kick : c.bottom.kick + t - g - rb;
    const z1 = c.back.kind === "overlay" ? H : (c.top.joint === "none" ? H : H - t + g + rb);
    add(S("ظهر", "back", [x0, by, z0], X, Z, x1 - x0, z1 - z0, tb), "back");
    if (g > 0 || rb > 0) {
      const depth = g || rb, yA = by - tb - (rb ? 0 : 0.05), yB = by + (rb ? 0 : 0.05); // the groove is a touch wider than the back
      // sides: plane u = y, v = z; the inner face of the left side is its "top" face (x = t), of the right side its "bottom"
      groove(L, yA, yB, 0, sideZ1 - sideZ0, depth, "top"); groove(R, yA, yB, 0, sideZ1 - sideZ0, depth, "bottom");
      // bottom: plane u = x, v = y; inner face = top. top board: inner face = bottom
      groove(B, 0, bx1 - bx0, yA - by0, yB - by0, depth, "top");
      if (T) groove(T, 0, (overT ? W : W - 2 * t), yA, yB, depth, "bottom");
    }
  }
  // horizontal dividers (full width, structural) and the bands between them
  hdividerBoxes(c).forEach((b, i) => add(S(`قاطوع أفقي ${i + 1}`, "carcass", [I.x0, 0, b.z0], X, Y, I.x1 - I.x0, I.y1, t), "hdivider", { k: "hdiv", i: c.hdividers.indexOf(b.d) }));
  const BD = bands(c);
  // vertical dividers: one board per band they live in (a full-height one is cut by the horizontal dividers)
  c.dividers.forEach((d, i) => {
    const x0 = d.from === "right" ? c.W - c.t - d.at - c.t : c.t + d.at; if (x0 < I.x0 - 0.01 || x0 + t > I.x1 + 0.01) return;
    const mine = BD.map((bd, bi) => ({ bd, bi })).filter(({ bi }) => d.band == null || d.band === "" || +d.band === bi);
    mine.forEach(({ bd, bi }) => add(S(`قاطوع ${i + 1}${mine.length > 1 ? ` (حزام ${bi + 1})` : ""}`, "carcass", [x0, 0, bd.z0], Y, Z, I.y1, bd.z1 - bd.z0, t), "divider", { k: "div", i }));
  });
  // inner vertical partitions (inside a cavity, like an upright shelf — they never split the cavity for fronts)
  const CELLS = cells(c), DR = drawerRects(c);
  // a drawer cavity keeps no shelves / partitions (the drawer boxes live there)
  const inDrawers = (x0, x1, z0, z1) => DR.some((r) => Math.min(x1, r.x1) - Math.max(x0, r.x0) > 0.5 && Math.min(z1, r.z1) - Math.max(z0, r.z0) > 0.5);
  const parts = []; // partitions actually built, per cell: the shelves stop at them
  (c.vparts || []).forEach((v, i) => {
    const cell = CELLS.find((q) => q.band === (v.band || 0) && q.col === v.col); if (!cell) return;
    const x0 = cell.x0 + v.x; if (x0 < cell.x0 - 0.01 || x0 + t > cell.x1 + 0.01) return;
    if (inDrawers(x0, x0 + t, cell.z0, cell.z1)) return;
    const sb = v.setback ?? 1;
    parts.push({ band: cell.band, col: cell.col, x0, x1: x0 + t });
    add(S(`فاصل رأسي ${i + 1}`, "carcass", [x0, sb, cell.z0], Y, Z, I.y1 - sb, cell.z1 - cell.z0, t), "partition", { k: "vpart", i });
  });
  // shelves (split where an upright partition stands in the cavity)
  c.shelves.forEach((s, i) => {
    const cell = CELLS.find((q) => q.band === shelfBand(s) && q.col === s.col); if (!cell) return;
    const z = cell.z0 + s.z; if (z < cell.z0 - 0.01 || z + t > cell.z1 + 0.01) return;
    if (inDrawers(cell.x0, cell.x1, z, z + t)) return;
    const loose = !s.fixed, side = loose ? 0.15 : 0, sb = s.setback ?? (loose ? 1 : 0);
    const segs = []; let x = cell.x0;
    for (const p of parts.filter((q) => q.band === cell.band && q.col === cell.col).sort((a, b) => a.x0 - b.x0)) { if (p.x0 - x > 0.5) segs.push([x, p.x0]); x = Math.max(x, p.x1); }
    if (cell.x1 - x > 0.5) segs.push([x, cell.x1]);
    segs.forEach(([a, b], j) => add(S(`${s.fixed ? "رف ثابت" : "رف متحرك"} ${i + 1}${segs.length > 1 ? `-${j + 1}` : ""}`, "carcass", [a + side, sb, z], X, Y, b - a - 2 * side, I.y1 - sb, t), s.fixed ? "fixed_shelf" : "shelf", { k: "shelf", i }));
  });
  // fronts: each zone covers one or more cavities (a whole divided space can be one door, the whole box can be two doors…);
  // a zone may be split into sub-fronts (drawers over a door, say) without any board in the box; every front has its own details
  const cavs = cavities(c), gap = c.front.gap, rv = c.front.reveal;
  let drawerN = 0, doorN = 0;
  // a front's plane extrudes towards −y: an overlay front sits in front of the carcass (y −t..0), an inset one inside the cavity (y 0..t)
  const front = (name, x0, z0, w, h, role = "door", fy = 0) => (w > 0.5 && h > 0.5 ? add(S(name, "front", [x0, fy, z0], X, Z, w, h, t), role) : null);
  /** the cavity rectangle (cv: x0,x1,z0,z1,y1, edges) → its overlay front rectangle; `virt` edges are splits between fronts (just the gap) */
  const frontRect = (cv, f) => {
    const cover = (edge) => (edge === "outerX" ? t - rv : edge === "virt" ? -gap / 2 : t / 2 - gap / 2);
    let fx0 = cv.x0 - cover(cv.left), fx1 = cv.x1 + cover(cv.right);
    let fz0 = cv.z0 - cover(cv.below), fz1 = cv.z1 + (cv.above === "outerX" && c.top.joint === "none" ? -gap : cover(cv.above));
    if (f.inset) { fx0 = cv.x0 + gap; fx1 = cv.x1 - gap; fz0 = cv.z0 + gap; fz1 = cv.z1 - gap; } // an inset front sits inside the cavity
    const tr = f.trim || {}; fx0 += +tr.l || 0; fx1 -= +tr.r || 0; fz0 += +tr.b || 0; fz1 -= +tr.t || 0;
    const rc = +f.recess || 0; if (rc > 0) { if (f.recessAt === "bottom") fz0 += rc; else fz1 -= rc; } // built-in handle clearance
    return { x0: fx0, x1: fx1, z0: fz0, z1: fz1 };
  };
  const renderFront = (cv, f, oneCol, path) => {
    if (!f || f.kind === "open") return;
    curRef = { k: "zone", path, key: cv.key || null };
    if (f.kind === "split") {
      // sub-cavities along z (dir "h": parts from the bottom up) or x (dir "v": parts from the left); sizes in cm, the last one takes the rest
      const parts = (f.parts || []).length ? f.parts : [{ kind: "drawers", n: 1, size: 20 }, { kind: "door1" }];
      const dir = f.dir === "v" ? "v" : "h", span = dir === "h" ? cv.z1 - cv.z0 : cv.x1 - cv.x0;
      const fixed = parts.slice(0, -1).map((p) => Math.max(0, +p.size || 0)), rest = span - fixed.reduce((a, b) => a + b, 0);
      let at = dir === "h" ? cv.z0 : cv.x0;
      parts.forEach((p, i) => {
        const sz = i < parts.length - 1 ? fixed[i] : Math.max(0, rest); if (sz <= 0.5) return;
        const sub = { ...cv };
        if (dir === "h") { sub.z0 = at; sub.z1 = at + sz; sub.below = i === 0 ? cv.below : "virt"; sub.above = i === parts.length - 1 ? cv.above : "virt"; }
        else { sub.x0 = at; sub.x1 = at + sz; sub.left = i === 0 ? cv.left : "virt"; sub.right = i === parts.length - 1 ? cv.right : "virt"; }
        renderFront(sub, p, oneCol, `${path}.parts.${i}`);
        at += sz;
      });
      return;
    }
    const R0 = frontRect(cv, f), fx0 = R0.x0, fz0 = R0.z0, fw = R0.x1 - R0.x0, fh = R0.z1 - R0.z0, fy = f.inset ? t : 0;
    if (f.kind === "door1") { doorN++; front(`ضلفة ${f.hinge === "right" ? "يمين" : "شمال"} ${doorN}`, fx0, fz0, fw, fh, "door", fy); }
    else if (f.kind === "flap") { doorN++; front(`ضلفة قلاب ${doorN}`, fx0, fz0, fw, fh, "door", fy); }
    else if (f.kind === "door2") { doorN++; const w2 = (fw - gap) / 2; front(`ضلفة شمال ${doorN}`, fx0, fz0, w2, fh, "door", fy); front(`ضلفة يمين ${doorN}`, fx0 + w2 + gap, fz0, w2, fh, "door", fy); }
    else if (f.kind === "drawers") {
      const n = Math.max(1, Math.min(8, +f.n || 3));
      let hs = (f.hs || []).map(Number).filter((v) => v > 0);
      const total = fh - gap * (n - 1);
      if (hs.length !== n) { const eq = total / n; hs = Array.from({ length: n }, () => eq); }
      else { const sum = hs.reduce((a, b) => a + b, 0); hs = hs.map((v) => (v * total) / sum); } // typed heights are scaled to fill the cavity exactly
      const dr = c.drawers, boxW = cv.x1 - cv.x0 - 2 * dr.clr, boxD = Math.max(20, Math.floor((cv.y1 - fy - 2) / 5) * 5);
      let z = fz0;
      hs.forEach((h) => {
        drawerN++;
        front(`وش درج ${drawerN}`, fx0, z, fw, h, "drawer_front", fy);
        // the box: sides + front/back walls + a thin bottom; it hangs `drop` under the front's top and `lowerFront` above the front's bottom
        const bz0 = Math.max(cv.z0 + 0.5, z + dr.lowerFront), bz1 = Math.min(cv.z1 - 0.5, z + h - dr.drop), bh = bz1 - bz0;
        if (bh >= 5 && oneCol) {
          const bx = cv.x0 + dr.clr, k = drawerN;
          add(S(`جنب درج ${k} شمال`, "carcass", [bx, fy, bz0], Y, Z, boxD, bh, dr.boxT), "drawer_box");
          add(S(`جنب درج ${k} يمين`, "carcass", [bx + boxW - dr.boxT, fy, bz0], Y, Z, boxD, bh, dr.boxT), "drawer_box");
          add(S(`أمامي درج ${k}`, "carcass", [bx + dr.boxT, fy + dr.boxT, bz0], X, Z, boxW - 2 * dr.boxT, bh, dr.boxT), "drawer_box");
          add(S(`خلفي درج ${k}`, "carcass", [bx + dr.boxT, fy + boxD, bz0], X, Z, boxW - 2 * dr.boxT, bh, dr.boxT), "drawer_box");
          // the bottom sits in 0.6 grooves in all four walls (between the sides and between the front / back walls)
          add(S(`قاعدة درج ${k}`, "back", [bx + dr.boxT - 0.6, fy + dr.boxT - 0.6, bz0 + 1.2], X, Y, boxW - 2 * dr.boxT + 1.2, boxD - 2 * dr.boxT + 1.2, dr.baseT), "drawer_bottom");
        }
        z += h + gap;
      });
    }
  };
  frontZones(c).forEach((f, zi) => {
    if (!f || f.kind === "open") return;
    const list = cavs.filter((cv) => f.cavs.includes(cv.key)); if (!list.length) return;
    const cv = { x0: Math.min(...list.map((q) => q.x0)), x1: Math.max(...list.map((q) => q.x1)), z0: Math.min(...list.map((q) => q.z0)), z1: Math.max(...list.map((q) => q.z1)), y1: list[0].y1 };
    // what the front meets on each side: the outer carcass (outerX) or a shared board (divider / horizontal divider)
    cv.left = Math.abs(cv.x0 - I.x0) < 0.01 ? "outerX" : "board"; cv.right = Math.abs(cv.x1 - I.x1) < 0.01 ? "outerX" : "board";
    cv.below = Math.abs(cv.z0 - I.z0) < 0.01 ? "outerX" : "board"; cv.above = Math.abs(cv.z1 - I.z1) < 0.01 ? "outerX" : "board";
    const oneCol = new Set(list.map((q) => `${q.band}:${q.col}`)).size === 1; // drawer boxes only fit when no divider crosses the zone
    cv.key = list[0].key;
    renderFront(cv, f, oneCol, `fronts.${zi}`);
  });
  curRef = null;
  // place the cabinet
  const xf = cabXf(c);
  for (const s of out) place(s, xf);
  return out;
}
/** the front zones (legacy per-cavity `fills` are read as single-cavity zones) */
export function frontZones(c) {
  const zones = (c.fronts || []).map((z) => ({ ...z, cavs: z.cavs || [] }));
  for (const [key, f] of Object.entries(c.fills || {})) if (f && f.kind !== "open" && !zones.some((z) => z.cavs.includes(key))) zones.push({ id: "legacy-" + key, cavs: [key], ...f });
  return zones;
}
/** do these cavities make one rectangle (no L shapes — a door is a rectangle)? */
export function rectZone(c, keys) {
  const list = cavities(c).filter((cv) => keys.includes(cv.key)); if (!list.length) return false;
  const x0 = Math.min(...list.map((q) => q.x0)), x1 = Math.max(...list.map((q) => q.x1)), z0 = Math.min(...list.map((q) => q.z0)), z1 = Math.max(...list.map((q) => q.z1));
  const area = list.reduce((a, q) => a + (q.x1 - q.x0) * (q.z1 - q.z0), 0);
  // the boards between the cavities (dividers / shelves) are part of the rectangle; allow their area
  return area >= (x1 - x0) * (z1 - z0) - (list.length - 1) * c.t * Math.max(x1 - x0, z1 - z0) - 0.5;
}
/** the zone a cavity belongs to */
export const zoneOf = (c, key) => frontZones(c).find((z) => z.cavs.includes(key)) || null;
/** set what a cavity (or a set of cavities) is: makes one zone over them, taking those cavities out of other zones */
export function setZone(c, keys, kind, opts = {}) {
  c.fronts ||= []; delete c.fills;
  for (const z of c.fronts) z.cavs = z.cavs.filter((k) => !keys.includes(k));
  c.fronts = c.fronts.filter((z) => z.cavs.length);
  if (kind && kind !== "open") c.fronts.push({ id: uid(), cavs: [...keys], kind, ...(kind === "drawers" ? { n: 3 } : {}), ...(kind === "split" ? { dir: "h", parts: [{ kind: "drawers", n: 1, size: 20 }, { kind: "door1", hinge: "left" }] } : {}), ...opts });
}
/** a short description of what a cavity is filled with */
export function fillLabel(f) {
  if (!f || f.kind === "open") return FILL_KINDS.open;
  if (f.kind === "drawers") return `${f.n || 3} أدراج`;
  if (f.kind === "door1") return `ضلفة (مفصلات ${f.hinge === "right" ? "يمين" : "شمال"})`;
  return FILL_KINDS[f.kind] || f.kind;
}

/** run `mutate` (adding / deleting / moving a divider…) and keep every zone, shelf and partition with the physical cavity it was in —
 *  cavity keys are "band:col" indexes, so a new divider on the left would otherwise shift everything one cavity over */
export function remapCavities(c, mutate) {
  const B0 = bands(c), C0 = cells(c);
  if (c.fills) { c.fronts = frontZones(c).map((z) => (String(z.id).startsWith("legacy-") ? { ...z, id: uid() } : z)); delete c.fills; }
  const key = (q) => `${q.band}:${q.col}`;
  const zones0 = (c.fronts || []).map((z) => ({ z, cells: z.cavs.map((k) => C0.find((q) => key(q) === k)).filter(Boolean) }));
  const sh0 = (c.shelves || []).map((s) => { const cell = C0.find((q) => q.band === shelfBand(s) && q.col === s.col); return cell && { s, cell, abs: cell.z0 + s.z }; }).filter(Boolean);
  const vp0 = (c.vparts || []).map((v) => { const cell = C0.find((q) => q.band === (v.band || 0) && q.col === v.col); return cell && { v, cell, abs: cell.x0 + v.x }; }).filter(Boolean);
  mutate();
  const ovl = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  const B1 = bands(c);
  if (JSON.stringify(B0) !== JSON.stringify(B1)) {
    // band-limited vertical dividers follow their band
    for (const d of c.dividers) {
      if (d.band == null || d.band === "") continue;
      const ob = B0[+d.band]; if (!ob) continue;
      let best = -1, bo = 0; B1.forEach((nb, i) => { const o = ovl(ob.z0, ob.z1, nb.z0, nb.z1); if (o > bo) { bo = o; best = i; } });
      if (best >= 0) d.band = typeof d.band === "number" ? best : String(best);
    }
  }
  const C1 = cells(c);
  if (JSON.stringify(C0) === JSON.stringify(C1)) return;
  const area = (q) => (q.x1 - q.x0) * (q.z1 - q.z0), ov = (a, b) => ovl(a.x0, a.x1, b.x0, b.x1) * ovl(a.z0, a.z1, b.z0, b.z1);
  // zones: each new cavity joins the zone whose old cavities covered most of it
  const got = new Map();
  for (const nc of C1) {
    let best = null, bo = 0;
    for (const zz of zones0) { const o = zz.cells.reduce((a, q) => a + ov(q, nc), 0); if (o > bo) { bo = o; best = zz; } }
    if (best && bo >= 0.4 * area(nc)) got.set(key(nc), { zz: best, share: bo / area(nc) });
  }
  for (const zz of zones0) {
    const mine = [...got].filter(([, g]) => g.zz === zz).sort((a, b) => b[1].share - a[1].share).map(([k]) => k);
    zz.z.cavs = mine.length > 1 && !rectZone(c, mine) ? mine.slice(0, 1) : mine;
  }
  c.fronts = (c.fronts || []).filter((z) => z.cavs.length);
  // shelves keep their height in the room, in the new cavity that holds it
  for (const { s, cell, abs } of sh0) {
    const cand = C1.filter((q) => ovl(cell.x0, cell.x1, q.x0, q.x1) > 0.5);
    if (!cand.length) continue;
    const fits = cand.filter((q) => abs >= q.z0 - 0.01 && abs + c.t <= q.z1 + 0.01);
    const pool = fits.length ? fits : cand;
    const nb = pool.sort((a, b) => (fits.length ? ovl(cell.x0, cell.x1, b.x0, b.x1) - ovl(cell.x0, cell.x1, a.x0, a.x1) : Math.abs(abs - (a.z0 + a.z1) / 2) - Math.abs(abs - (b.z0 + b.z1) / 2)))[0];
    s.band = nb.band; s.col = nb.col; s.z = r1(Math.max(0, Math.min(nb.z1 - nb.z0 - c.t, abs - nb.z0)));
  }
  // upright partitions keep their x in the room
  for (const { v, cell, abs } of vp0) {
    const cand = C1.filter((q) => ovl(cell.z0, cell.z1, q.z0, q.z1) > 0.5 && abs >= q.x0 - 0.01 && abs + c.t <= q.x1 + 0.01)
      .sort((a, b) => ovl(cell.z0, cell.z1, b.z0, b.z1) - ovl(cell.z0, cell.z1, a.z0, a.z1));
    if (!cand.length) continue;
    v.band = cand[0].band; v.col = cand[0].col; v.x = r1(abs - cand[0].x0);
  }
}
