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
    dividers: [], shelves: [], fronts: [], // fronts: zones over one or more cavities {id, cavs:[keys], kind, hinge, n, hs}
  };
}
export const BOTTOM_JOINTS = { between: "القاعدة بين الجنبين", under: "الجنبين واقفين على القاعدة" };
export const TOP_JOINTS = { between: "رأس بين الجنبين", over: "رأس فوق الجنبين", rails: "شريطين (أمامي وخلفي)", none: "من غير رأس" };
export const BACK_KINDS = { groove: "ظهر في مفحار", rabbet: "ظهر في أورزة", overlay: "ظهر مسمّر من ورا", none: "من غير ظهر" };
export const FILL_KINDS = { open: "فاضي (مفتوح)", door1: "ضلفة واحدة", door2: "ضلفتين", flap: "ضلفة قلاب", drawers: "أدراج" };

/** the inner box the dividers/shelves/fronts work in */
export function inner(c) {
  const t = c.t, z0 = c.bottom.kick + t;
  const z1 = c.top.joint === "none" ? c.H : c.H - t;
  const Db = c.back.kind === "none" ? c.D : c.back.kind === "overlay" ? c.D : c.D - c.back.off - c.tb; // y of the back's front face
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
/** the cavities: every cell split by its shelves (bottom → top); key "band:col:row" */
export function cavities(c) {
  const I = inner(c), out = [];
  for (const cell of cells(c)) {
    const sh = c.shelves.filter((s) => shelfBand(s) === cell.band && s.col === cell.col).map((s) => ({ s, z0: cell.z0 + s.z, z1: cell.z0 + s.z + c.t })).filter((b) => b.z0 >= cell.z0 - 0.01 && b.z1 <= cell.z1 + 0.01).sort((a, b) => a.z0 - b.z0);
    let z = cell.z0, ri = 0;
    const edgeBelow = Math.abs(cell.z0 - I.z0) < 0.01 ? "bottom" : "hdiv", edgeAbove = Math.abs(cell.z1 - I.z1) < 0.01 ? "top" : "hdiv";
    const push = (z0, z1, below, above) => { if (z1 - z0 > 0.5) out.push({ key: `${cell.band}:${cell.col}:${ri++}`, band: cell.band, col: cell.col, row: ri - 1, x0: cell.x0, x1: cell.x1, z0, z1, y1: I.y1, below, above }); };
    for (const b of sh) { push(z, b.z0, z === cell.z0 ? edgeBelow : "shelf", "shelf"); z = b.z1; }
    push(z, cell.z1, z === cell.z0 ? edgeBelow : "shelf", edgeAbove);
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
  const BAND = { side: ["front"], bottom: ["front"], top: ["front"], rail: ["front"], hdivider: ["front"], divider: ["front"], shelf: ["front"], fixed_shelf: ["front"], door: ["left", "right", "top", "bottom"], drawer_front: ["left", "right", "top", "bottom"], back: [], drawer_box: ["top"], drawer_bottom: [] };
  const add = (s, role) => { s.cab = c.id; s.role = role; s.group = c.id; s.bandEdges = BAND[role] || ["front"]; if (!s.bandEdges.length) s.band = false; out.push(s); return s; };
  const underJ = c.bottom.joint === "under", overT = c.top.joint === "over";
  const sideZ0 = underJ ? c.bottom.kick + t : 0, sideZ1 = overT ? H - t : H;
  const sideD = c.back.kind === "overlay" ? D : D; // the carcass depth; an overlay back is nailed behind it
  // sides (depth along y, height along z, extruded +x)
  const L = add(S("جنب شمال", "carcass", [0, 0, sideZ0], Y, Z, sideD, sideZ1 - sideZ0, t), "side");
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
  hdividerBoxes(c).forEach((b, i) => add(S(`قاطوع أفقي ${i + 1}`, "carcass", [I.x0, 0, b.z0], X, Y, I.x1 - I.x0, I.y1, t), "hdivider"));
  const BD = bands(c);
  // vertical dividers: one board per band they live in (a full-height one is cut by the horizontal dividers)
  c.dividers.forEach((d, i) => {
    const x0 = d.from === "right" ? c.W - c.t - d.at - c.t : c.t + d.at; if (x0 < I.x0 - 0.01 || x0 + t > I.x1 + 0.01) return;
    const mine = BD.map((bd, bi) => ({ bd, bi })).filter(({ bi }) => d.band == null || d.band === "" || +d.band === bi);
    mine.forEach(({ bd, bi }) => add(S(`قاطوع ${i + 1}${mine.length > 1 ? ` (حزام ${bi + 1})` : ""}`, "carcass", [x0, 0, bd.z0], Y, Z, I.y1, bd.z1 - bd.z0, t), "divider"));
  });
  // shelves
  const CELLS = cells(c);
  c.shelves.forEach((s, i) => {
    const cell = CELLS.find((q) => q.band === shelfBand(s) && q.col === s.col); if (!cell) return;
    const col = cell;
    const z = cell.z0 + s.z; if (z < cell.z0 - 0.01 || z + t > cell.z1 + 0.01) return;
    const loose = !s.fixed, side = loose ? 0.15 : 0, sb = s.setback ?? (loose ? 1 : 0);
    add(S(`${s.fixed ? "رف ثابت" : "رف متحرك"} ${i + 1}`, "carcass", [col.x0 + side, sb, z], X, Y, col.x1 - col.x0 - 2 * side, I.y1 - sb, t), s.fixed ? "fixed_shelf" : "shelf");
  });
  // fronts: each zone covers one or more cavities (a whole divided space can be one door, the whole box can be two doors…)
  const cavs = cavities(c), gap = c.front.gap, rv = c.front.reveal;
  let drawerN = 0, doorN = 0;
  for (const f of frontZones(c)) {
    if (!f || f.kind === "open") continue;
    const list = cavs.filter((cv) => f.cavs.includes(cv.key)); if (!list.length) continue;
    const cv = { x0: Math.min(...list.map((q) => q.x0)), x1: Math.max(...list.map((q) => q.x1)), z0: Math.min(...list.map((q) => q.z0)), z1: Math.max(...list.map((q) => q.z1)), y1: list[0].y1 };
    cv.below = Math.abs(cv.z0 - I.z0) < 0.01 ? "bottom" : "shelf"; cv.above = Math.abs(cv.z1 - I.z1) < 0.01 ? "top" : "shelf"; // a horizontal divider or a shelf: the front covers half of it
    const oneCol = new Set(list.map((q) => `${q.band}:${q.col}`)).size === 1; // drawer boxes only fit when no divider crosses the zone
    // the front's rectangle: overlay fronts cover the carcass boards around the zone (half of a shared board, the whole of an outer one minus the reveal)
    const leftOuter = Math.abs(cv.x0 - I.x0) < 0.01, rightOuter = Math.abs(cv.x1 - I.x1) < 0.01;
    const fx0 = cv.x0 - (leftOuter ? t - rv : t / 2 - gap / 2), fx1 = cv.x1 + (rightOuter ? t - rv : t / 2 - gap / 2);
    const fz0 = cv.z0 - (cv.below === "bottom" ? t - rv : t / 2 - gap / 2);
    const fz1 = cv.z1 + (cv.above === "top" ? (c.top.joint === "none" ? -gap : t - rv) : t / 2 - gap / 2);
    const fw = fx1 - fx0, fh = fz1 - fz0;
    const front = (name, x0, z0, w, h, role = "door") => add(S(name, "front", [x0, 0, z0], X, Z, w, h, t), role);
    if (f.kind === "door1") { doorN++; front(`ضلفة ${f.hinge === "right" ? "يمين" : "شمال"} ${doorN}`, fx0, fz0, fw, fh); }
    else if (f.kind === "flap") { doorN++; front(`ضلفة قلاب ${doorN}`, fx0, fz0, fw, fh); }
    else if (f.kind === "door2") { doorN++; const w2 = (fw - gap) / 2; front(`ضلفة شمال ${doorN}`, fx0, fz0, w2, fh); front(`ضلفة يمين ${doorN}`, fx0 + w2 + gap, fz0, w2, fh); }
    else if (f.kind === "drawers") {
      const n = Math.max(1, Math.min(8, +f.n || 3));
      let hs = (f.hs || []).map(Number).filter((v) => v > 0);
      const total = fh - gap * (n - 1);
      if (hs.length !== n) { const eq = total / n; hs = Array.from({ length: n }, () => eq); }
      else { const sum = hs.reduce((a, b) => a + b, 0); hs = hs.map((v) => (v * total) / sum); } // typed heights are scaled to fill the cavity exactly
      const dr = c.drawers, boxW = cv.x1 - cv.x0 - 2 * dr.clr, boxD = Math.max(20, Math.floor((cv.y1 - 2) / 5) * 5);
      let z = fz0;
      hs.forEach((h, i) => {
        drawerN++;
        front(`وش درج ${drawerN}`, fx0, z, fw, h, "drawer_front");
        // the box: sides + front/back walls + a thin bottom; it hangs `drop` under the front's top and `lowerFront` above the front's bottom
        const bz0 = Math.max(cv.z0 + 0.5, z + dr.lowerFront), bz1 = Math.min(cv.z1 - 0.5, z + h - dr.drop), bh = bz1 - bz0;
        if (bh >= 5 && oneCol) {
          const bx = cv.x0 + dr.clr, k = drawerN;
          add(S(`جنب درج ${k} شمال`, "carcass", [bx, 0, bz0], Y, Z, boxD, bh, dr.boxT), "drawer_box");
          add(S(`جنب درج ${k} يمين`, "carcass", [bx + boxW - dr.boxT, 0, bz0], Y, Z, boxD, bh, dr.boxT), "drawer_box");
          add(S(`أمامي درج ${k}`, "carcass", [bx + dr.boxT, dr.boxT, bz0], X, Z, boxW - 2 * dr.boxT, bh, dr.boxT), "drawer_box");
          add(S(`خلفي درج ${k}`, "carcass", [bx + dr.boxT, boxD, bz0], X, Z, boxW - 2 * dr.boxT, bh, dr.boxT), "drawer_box");
          add(S(`قاعدة درج ${k}`, "back", [bx + dr.boxT - 0.6, 0, bz0 + 1.2], X, Y, boxW - 2 * dr.boxT + 1.2, boxD, dr.baseT), "drawer_bottom");
        }
        z += h + gap;
      });
    }
  }
  // place the cabinet
  for (const s of out) s.plane.o = G.add(s.plane.o, c.pos);
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
  if (kind && kind !== "open") c.fronts.push({ id: uid(), cavs: [...keys], kind, ...(kind === "drawers" ? { n: 3 } : {}), ...opts });
}
/** a short description of what a cavity is filled with */
export function fillLabel(f) {
  if (!f || f.kind === "open") return FILL_KINDS.open;
  if (f.kind === "drawers") return `${f.n || 3} أدراج`;
  if (f.kind === "door1") return `ضلفة (مفصلات ${f.hinge === "right" ? "يمين" : "شمال"})`;
  return FILL_KINDS[f.kind] || f.kind;
}
