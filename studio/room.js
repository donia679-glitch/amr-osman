// Room: walls (drawn or from dimensions), doors/windows, and where every unit stands.
// Plan coordinates are centimetres on the floor: x → right, z → towards the viewer (screen down),
// the same axes as the 3D scene's x/z. A wall's points are its INTERIOR face (what the carpenter
// measures); its thickness grows outwards.
const uid = () => Math.random().toString(36).slice(2, 10);
export const WALL_T = 12;
export const WALL_H = 280;

// ------------------------------------------------------------------ presets
/** interior dimensions → a room (clockwise on screen, so the interior is on each wall's right) */
export function presetRoom(kind, d = {}) {
  const t = +d.t || WALL_T, h = +d.h || WALL_H;
  const W = +d.w || 400, D = +d.d || 300, W2 = +d.w2 || 200, D2 = +d.d2 || 150;
  let pts, closed = true;
  if (kind === "line") { pts = [[0, 0], [W, 0]]; closed = false; }
  else if (kind === "corner") { pts = [[0, D], [0, 0], [W, 0]]; closed = false; }
  else if (kind === "u") { pts = [[0, D], [0, 0], [W, 0], [W, D]]; closed = false; }
  else if (kind === "lroom") pts = [[0, 0], [W, 0], [W, D2], [W2, D2], [W2, D], [0, D]];
  else pts = [[0, 0], [W, 0], [W, D], [0, D]];
  const n = closed ? pts.length : pts.length - 1;
  return { pts, closed, walls: Array.from({ length: n }, () => ({ id: uid(), t, h, flip: false })), openings: [] };
}
export const PRESETS = {
  line: { label: "حيطة واحدة", fields: [["w", "الطول", 400]] },
  corner: { label: "ركنة (L)", fields: [["w", "الحيطة الأساسية", 400], ["d", "الحيطة الجانبية", 300]] },
  u: { label: "حرف U", fields: [["w", "الحيطة اللي في النص", 400], ["d", "الجانبين", 300]] },
  rect: { label: "أوضة مستطيلة", fields: [["w", "العرض", 400], ["d", "العمق", 350]] },
  lroom: { label: "أوضة على شكل L", fields: [["w", "العرض الكلي", 500], ["d", "العمق الكلي", 450], ["w2", "عرض الجزء الضيق", 250], ["d2", "عمق الجزء العريض", 250]] },
};

// ------------------------------------------------------------------ geometry
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
export const r1 = (v) => Math.round(v * 10) / 10;

function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}
/** every wall segment with its direction, length and interior normal */
export function segments(room) {
  if (!room?.pts?.length) return [];
  const pts = room.pts, n = room.closed ? pts.length : pts.length - 1;
  const side = room.closed ? (signedArea(pts) >= 0 ? 1 : -1) : 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = pts[i], B = pts[(i + 1) % pts.length];
    const L = len(sub(B, A));
    if (L < 1e-6) continue;
    const d = mul(sub(B, A), 1 / L);
    const w = room.walls[i] || { id: "w" + i, t: WALL_T, h: WALL_H };
    const sd = side * (w.flip ? -1 : 1);
    out.push({ i, id: w.id, A, B, d, L, n: [-d[1] * sd, d[0] * sd], t: +w.t || WALL_T, h: +w.h || WALL_H, wall: w });
  }
  return out;
}
/** walls used when the project has no room: the old automatic layout's two walls (z = 0 and x = 0) */
export function virtualSegments() {
  return [
    { i: 0, id: "A", A: [0, 0], B: [3000, 0], d: [1, 0], L: 3000, n: [0, 1], t: 0, h: WALL_H, virtual: true },
    { i: 1, id: "B", A: [0, 3000], B: [0, 0], d: [0, -1], L: 3000, n: [1, 0], t: 0, h: WALL_H, virtual: true },
  ];
}
export function bounds(room) {
  const b = { x0: 0, x1: 0, z0: 0, z1: 0 };
  (room?.pts || []).forEach((p, i) => {
    if (!i) { b.x0 = b.x1 = p[0]; b.z0 = b.z1 = p[1]; }
    b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]); b.z0 = Math.min(b.z0, p[1]); b.z1 = Math.max(b.z1, p[1]);
  });
  return b;
}

// ------------------------------------------------------------------ poses
// A unit's local frame (3D): x along its width, +z out of its front, back at z = −depth.
// rot = rotation about the vertical (three.js rotation.y): local +z → (sin rot, cos rot), local x → (cos rot, −sin rot).
export const rotFor = (n) => Math.atan2(n[0], n[1]);
export const axisX = (rot) => [Math.cos(rot), -Math.sin(rot)];
export const axisZ = (rot) => [Math.sin(rot), Math.cos(rot)];
/** where the run along a wall starts (the end the units' local x points away from) */
function runStart(seg) {
  const e = axisX(rotFor(seg.n));
  return dot(e, seg.d) > 0 ? { S: seg.A, e } : { S: seg.B, e };
}
/** box: the unit's engine-space footprint {x0,x1,y0,y1} (y = depth, front ≈ 0) */
export function poseOnWall(seg, s, box) {
  const rot = rotFor(seg.n);
  const { S, e } = runStart(seg);
  const P = add(add(S, mul(e, s - box.x0)), mul(seg.n, box.y1));
  return { x: P[0], z: P[1], rot, wall: seg.id, s };
}
/** a corner unit standing in the corner between seg `inc` (ending there) and `out` (starting there) */
export function poseInCorner(inc, out) {
  const a = mul(inc.d, -1);
  return { x: out.A[0], z: out.A[1], rot: Math.atan2(-a[1], a[0]), corner: inc.id + ">" + out.id };
}
/** world-space footprint corners of a posed unit */
export function footprint(pose, box) {
  const ex = axisX(pose.rot), ez = axisZ(pose.rot);
  const P = [pose.x, pose.z];
  const at = (lx, lz) => add(add(P, mul(ex, lx)), mul(ez, lz));
  return [at(box.x0, -box.y1), at(box.x1, -box.y1), at(box.x1, -box.y0), at(box.x0, -box.y0)];
}
export function centerOf(pose, box) {
  const f = footprint(pose, box);
  return [(f[0][0] + f[2][0]) / 2, (f[0][1] + f[2][1]) / 2];
}

// ------------------------------------------------------------------ automatic arrangement
/**
 * Stands every unit: pinned units where the user put them, the rest along the walls in order —
 * corner units in the corners, base/wall/tall rows, skipping doors (and windows for wall units),
 * tables in the middle of the room. items: [{id, box, row: lower|upper|tall|free, corner, pos}]
 */
export function arrange(room, items) {
  const segs = room ? segments(room) : virtualSegments();
  const out = new Map();
  const byId = new Map(segs.map((s) => [s.id, s]));
  const used = new Map(segs.map((s) => [s.id, { lower: [], upper: [] }]));
  const block = (sid, row, a, b) => {
    const u = used.get(sid);
    if (!u) return;
    if (row === "tall" || row === "lower") u.lower.push([a, b]);
    if (row === "tall" || row === "upper") u.upper.push([a, b]);
  };
  // doors block every row, windows the wall units and tall units
  for (const o of room?.openings || []) {
    const seg = segs.find((s) => s.id === o.wall);
    if (!seg) continue;
    const { S } = runStart(seg);
    const fromA = S === seg.A;
    const a = fromA ? o.at : seg.L - o.at - o.w, b = a + o.w;
    if (o.kind === "door") block(seg.id, "tall", a - 5, b + 5);
    else { used.get(seg.id).upper.push([a, b]); }
  }
  // columns standing against a wall block it for every row
  for (const cb of columnBlocks(room)) {
    const seg = byId.get(cb.wall);
    const { S } = runStart(seg);
    const a = S === seg.A ? cb.a : seg.L - cb.b;
    block(cb.wall, "tall", a, a + (cb.b - cb.a));
  }
  // pinned units
  for (const it of items) {
    const p = it.pos;
    if (!p) continue;
    if (p.wall && byId.has(p.wall)) {
      const pose = poseOnWall(byId.get(p.wall), +p.s || 0, it.box);
      out.set(it.id, pose);
      block(p.wall, it.row, pose.s, pose.s + it.box.x1 - it.box.x0);
    } else if (p.x != null) out.set(it.id, { x: +p.x, z: +p.z, rot: +p.rot || 0, wall: null });
  }
  // corners
  const corners = [];
  // closed rooms: the corner before the first wall comes first, so runs flow from it along wall 1
  const order = room?.closed ? [segs.length - 1, ...segs.keys()].slice(0, segs.length) : [...segs.keys()];
  for (const k of order) {
    const inc = segs[k], nx = segs[(k + 1) % segs.length];
    if (!room?.closed && k === segs.length - 1) continue;
    if (len(sub(inc.B, nx.A)) > 1) continue;
    corners.push([inc, nx]);
  }
  if (!room) corners.splice(0, corners.length, [segs[1], segs[0]]);
  let ci = 0;
  for (const it of items) {
    if (out.has(it.id) || !it.corner) continue;
    const c = corners[ci++];
    if (!c) break;
    const [inc, outS] = c;
    out.set(it.id, poseInCorner(inc, outS));
    // the corner unit takes box.y1 along the outgoing wall and box.x1 along the incoming one
    const ro = it.row === "upper" ? "upper" : "lower";
    const so = runStart(outS), si = runStart(inc);
    const oa = so.S === outS.A ? 0 : outS.L - it.box.y1;
    block(outS.id, ro, oa, oa + it.box.y1);
    const ia = si.S === inc.B ? 0 : inc.L - it.box.x1;
    block(inc.id, ro, ia, ia + it.box.x1);
  }
  // runs
  const fits = (list, a, b) => list.every(([x, y]) => b <= x + 0.01 || a >= y - 0.01);
  const firstFit = (seg, rows, w) => {
    const lists = rows.map((r) => used.get(seg.id)[r]);
    if (seg.fromEnd) {
      const cands = [seg.L - w, ...lists.flat().map((iv) => iv[0] - w)].sort((a, b) => b - a);
      for (const a of cands) if (a >= -0.01 && lists.every((l) => fits(l, a, a + w))) return a;
      return null;
    }
    const cands = [0, ...lists.flat().map((iv) => iv[1])].sort((a, b) => a - b);
    for (const a of cands) if (a + w <= seg.L + 0.01 && lists.every((l) => fits(l, a, a + w))) return a;
    return null;
  };
  // runs start on the wall leaving the first corner and go round; walls before it fill towards it
  const k0 = corners.length ? segs.indexOf(corners[0][1]) : 0;
  const runSegs = [...segs.slice(k0), ...segs.slice(0, k0).reverse()].filter((sg) => !(sg.virtual && sg.id === "B"))
    .map((sg) => ({ ...sg, fromEnd: !room?.closed && segs.indexOf(sg) < k0 && runStart(sg).S === sg.A }));
  let freeX = 0;
  const free = [];
  for (const it of items) {
    if (out.has(it.id)) continue;
    const w = it.box.x1 - it.box.x0;
    if (it.row === "free") { free.push(it); continue; }
    const rows = it.row === "tall" ? ["lower", "upper"] : [it.row === "upper" ? "upper" : "lower"];
    let placed = false;
    for (const seg of runSegs) {
      const a = firstFit(seg, rows, w);
      if (a == null) continue;
      out.set(it.id, poseOnWall(seg, a, it.box));
      block(seg.id, it.row, a, a + w);
      placed = true;
      break;
    }
    if (!placed) free.push(it);
  }
  // free-standing: a row in the middle of the room (or in front of the walls)
  const b = room ? bounds(room) : { x0: 0, x1: 400, z0: 0, z1: 0 };
  const cz = room?.closed ? (b.z0 + b.z1) / 2 : b.z1 + 180;
  const total = free.reduce((a, it) => a + (it.box.x1 - it.box.x0) + 40, -40);
  freeX = (b.x0 + b.x1) / 2 - Math.max(0, total) / 2;
  for (const it of free) {
    const w = it.box.x1 - it.box.x0, dpt = it.box.y1 - it.box.y0;
    out.set(it.id, { x: freeX - it.box.x0, z: cz + dpt / 2 + it.box.y0, rot: 0, wall: null, free: true });
    freeX += w + 40;
  }
  return out;
}

// ------------------------------------------------------------------ snapping while dragging
/**
 * The pose a dragged unit gets when its centre is at point `pt`: on the nearest wall (back against it)
 * when close enough, sliding along it and catching neighbours' edges; otherwise free at `rot`.
 * others: [{box, pose, row}] of the other units.
 */
export function snapPose(segs, box, pt, rot, others, row) {
  const w = box.x1 - box.x0, dep = box.y1 - box.y0;
  let best = null;
  for (const seg of segs) {
    const rel = sub(pt, seg.A);
    const along = dot(rel, seg.d), off = dot(rel, seg.n);
    if (along < -w / 2 || along > seg.L + w / 2) continue;
    if (off < -20 || off > dep / 2 + 45) continue;
    const dist = Math.abs(off - dep / 2);
    if (!best || dist < best.dist) best = { seg, along, dist };
  }
  if (best) {
    const seg = best.seg;
    const { S, e } = runStart(seg);
    let s = dot(sub(pt, S), e) - w / 2;
    s = Math.max(0, Math.min(seg.L - w, s));
    // catch the edges of neighbours on the same wall and the wall ends
    const edges = [0, seg.L - w];
    for (const o of others) {
      if (o.pose.wall !== seg.id || o.pose.s == null) continue;
      if (row !== "tall" && o.row !== "tall" && o.row !== row) continue;
      const ow = o.box.x1 - o.box.x0;
      edges.push(o.pose.s + ow, o.pose.s - w);
    }
    for (const ed of edges) if (Math.abs(ed - s) < 6) { s = ed; break; }
    return poseOnWall(seg, Math.round(s * 2) / 2, box);
  }
  const ex = axisX(rot), ez = axisZ(rot);
  const cx = (box.x0 + box.x1) / 2, cz = -(box.y0 + box.y1) / 2;
  const P = sub(pt, add(mul(ex, cx), mul(ez, cz)));
  return { x: Math.round(P[0]), z: Math.round(P[1]), rot, wall: null };
}

// ------------------------------------------------------------------ editing
/** change wall i's length: its end point moves along the wall, the walls after it shift with it */
export function setWallLength(room, segIndex, L) {
  const pts = room.pts, i = segIndex, j = (i + 1) % pts.length;
  const A = pts[i], B = pts[j];
  const cur = len(sub(B, A));
  if (cur < 1e-6 || !(L > 1)) return;
  const dv = mul(sub(B, A), L / cur - 1);
  if (room.closed && j === 0) { pts[i] = sub(pts[i], dv); return; } // closing wall: move its start
  const last = room.closed ? pts.length - 1 : pts.length - 1;
  for (let k = j; k <= last; k++) pts[k] = add(pts[k], dv);
}
/** drawing: snap a point to 5 cm and to right angles from the previous point */
export function snapDraw(prev, p, grid = 5) {
  let q = [Math.round(p[0] / grid) * grid, Math.round(p[1] / grid) * grid];
  if (prev) {
    const v = sub(q, prev);
    const ang = Math.atan2(v[1], v[0]);
    const step = Math.PI / 4;
    const snapA = Math.round(ang / step) * step;
    if (Math.abs(ang - snapA) < 0.12) {
      const L = Math.round(len(v) / grid) * grid;
      q = [prev[0] + Math.round(Math.cos(snapA) * L), prev[1] + Math.round(Math.sin(snapA) * L)];
    }
  }
  return q;
}
export function addOpening(room, wallId, kind) {
  const seg = segments(room).find((s) => s.id === wallId);
  if (!seg) return null;
  const w = kind === "door" ? 90 : 120;
  const o = { id: uid(), wall: wallId, kind, w, h: kind === "door" ? 210 : 120, sill: kind === "door" ? 0 : 100, at: Math.max(0, r1((seg.L - w) / 2)) };
  room.openings.push(o);
  return o;
}
export function removeWall(room, segIndex) {
  const w = room.walls[segIndex];
  if (!w) return;
  room.openings = room.openings.filter((o) => o.wall !== w.id);
  if (room.closed) { room.closed = false; room.pts = [...room.pts.slice(segIndex + 1), ...room.pts.slice(0, segIndex + 1)]; room.walls = [...room.walls.slice(segIndex + 1), ...room.walls.slice(0, segIndex)]; return; }
  if (segIndex === 0) { room.pts.shift(); room.walls.shift(); return; }
  if (segIndex === room.walls.length - 1) { room.pts.pop(); room.walls.pop(); return; }
  // a wall in the middle of an open chain: keep the longer side
  const left = segIndex, right = room.walls.length - segIndex - 1;
  if (left >= right) { room.pts = room.pts.slice(0, segIndex + 1); room.walls = room.walls.slice(0, segIndex); }
  else { room.pts = room.pts.slice(segIndex + 1); room.walls = room.walls.slice(segIndex + 1); }
}
export function newWallMeta(t = WALL_T, h = WALL_H) { return { id: uid(), t, h, flip: false }; }

// ------------------------------------------------------------------ wall outlines (mitred corners)
function lineX(p, d, q, e) {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return add(p, mul(d, t));
}
/** per wall: inner face A→B and the outer corners, mitred where walls meet */
export function wallGeom(room) {
  const segs = segments(room);
  const conn = (a, b) => a && b && len(sub(a.B, b.A)) < 0.5;
  return segs.map((s, k) => {
    const prev = k > 0 ? segs[k - 1] : room.closed ? segs[segs.length - 1] : null;
    const next = k < segs.length - 1 ? segs[k + 1] : room.closed ? segs[0] : null;
    const oA = sub(s.A, mul(s.n, s.t)), oB = sub(s.B, mul(s.n, s.t));
    let outerStart = oA, outerEnd = oB;
    if (conn(prev, s)) outerStart = lineX(sub(prev.A, mul(prev.n, prev.t)), prev.d, oA, s.d) || oA;
    if (conn(s, next)) outerEnd = lineX(oA, s.d, sub(next.A, mul(next.n, next.t)), next.d) || oB;
    return { seg: s, outerStart, outerEnd };
  });
}
/** outline of the part of a wall between a and b cm from its start (inner face), as 4 points */
export function piecePoly(g, a, b) {
  const s = g.seg;
  const inner = (x) => add(s.A, mul(s.d, x));
  const outer = (x) => {
    if (x <= 0.01) return g.outerStart;
    if (x >= s.L - 0.01) return g.outerEnd;
    return sub(inner(x), mul(s.n, s.t));
  };
  return [inner(a), inner(b), outer(b), outer(a)];
}
/** wall pieces between 0 and L with heights (for 3D and elevations) */
export function wallSpans(seg, openings) {
  const os = openings.filter((o) => o.wall === seg.id).map((o) => ({ ...o, a: Math.max(0, o.at), b: Math.min(seg.L, o.at + o.w) })).filter((o) => o.b > o.a).sort((x, y) => x.a - y.a);
  const out = [];
  let cur = 0;
  for (const o of os) {
    if (o.a > cur) out.push({ a: cur, b: o.a, z0: 0, z1: seg.h });
    if (o.sill > 0) out.push({ a: o.a, b: o.b, z0: 0, z1: o.sill });
    if (o.sill + o.h < seg.h) out.push({ a: o.a, b: o.b, z0: o.sill + o.h, z1: seg.h });
    cur = Math.max(cur, o.b);
  }
  if (cur < seg.L) out.push({ a: cur, b: seg.L, z0: 0, z1: seg.h });
  return out;
}

// ------------------------------------------------------------------ electrical / plumbing / gas points
// kinds match the SketchUp plugin's MEP module (sys + kind), default heights are NOVERA's standards
export const MEP_SYS = { elec: ["كهرباء", "#d9a514"], cold: ["تغذية بارد", "#2a6ed2"], hot: ["تغذية ساخن", "#d23228"], drain: ["صرف", "#5f5f5f"], gas: ["غاز", "#8c50c8"], acd: ["صرف تكييف", "#3aa7c9"] };
export const MEP_KINDS = {
  socket: ["بريزة", "elec", 55, "ب"], socket_counter: ["بريزة فوق الكونتر", "elec", 110, "بك"], switch: ["مفتاح", "elec", 120, "م"], switch2: ["مفتاح دبل", "elec", 120, "م٢"],
  ac: ["تكييف", "elec", 220, "تك"], tv: ["شاشة", "elec", 120, "ش"], data: ["نت / تليفون", "elec", 55, "نت"], bell: ["جرس", "elec", 140, "جر"],
  heater: ["سخان", "elec", 180, "سخ"], hood: ["شفاط", "elec", 200, "شف"], fridge: ["بريزة تلاجة", "elec", 55, "تل"], washer: ["بريزة غسالة", "elec", 55, "غس"],
  oven: ["فرن بلت إن (خلف الفرن)", "elec", 55, "فر"], panel: ["لوحة كهربا", "elec", 160, "لوحة"], jbox: ["علبة توزيع", "elec", 250, "عل"], light: ["إنارة سقف", "elec", 280, "ن"], spot: ["سبوت", "elec", 280, "س"],
  cold: ["تغذية بارد", "cold", 60, "ب"], hot: ["تغذية ساخن", "hot", 60, "س"], drain: ["صرف", "drain", 50, "ص"], floor_drain: ["صرف أرضي (بيبة)", "drain", 0, "ص"],
  washer_cold: ["تغذية غسالة", "cold", 90, "غ"], washer_drain: ["صرف غسالة", "drain", 70, "صغ"], gas: ["مخرج غاز", "gas", 60, "غاز"], ac_drain: ["صرف تكييف", "acd", 220, "صت"],
};
export function addPoint(room, wallId, kind, at) {
  const seg = segments(room).find((s) => s.id === wallId);
  if (!seg) return null;
  const k = MEP_KINDS[kind] || MEP_KINDS.socket;
  const p = { id: uid(), wall: wallId, kind, at: r1(at ?? seg.L / 2), z: k[2] };
  (room.points ??= []).push(p);
  return p;
}
export function pointWorld(room, p) {
  const seg = segments(room).find((s) => s.id === p.wall);
  if (!seg) return null;
  return { x: seg.A[0] + seg.d[0] * p.at, z: seg.A[1] + seg.d[1] * p.at, h: p.z, n: seg.n, seg };
}

// ------------------------------------------------------------------ columns / obstacles
export function addColumn(room) {
  const b = bounds(room);
  const c = { id: uid(), x: r1((b.x0 + b.x1) / 2 - 15), z: r1((b.z0 + b.z1) / 2 - 15), w: 30, d: 30, h: room.walls[0]?.h || WALL_H };
  (room.columns ??= []).push(c);
  return c;
}
/** stretches of each wall a column stands against (blocks every row there) */
export function columnBlocks(room) {
  const out = [];
  for (const c of room?.columns || []) {
    const pts = [[c.x, c.z], [c.x + c.w, c.z], [c.x + c.w, c.z + c.d], [c.x, c.z + c.d]];
    for (const seg of segments(room)) {
      const offs = pts.map((p) => dot(sub(p, seg.A), seg.n));
      if (Math.min(...offs) > 6 || Math.max(...offs) < -1) continue;
      const al = pts.map((p) => dot(sub(p, seg.A), seg.d));
      const a = Math.max(0, Math.min(...al)), b = Math.min(seg.L, Math.max(...al));
      if (b > a) out.push({ wall: seg.id, a, b });
    }
  }
  return out;
}

// ------------------------------------------------------------------ Apple RoomPlan scan → room
/**
 * Accepts the JSON of a RoomPlan CapturedRoom (Codable export: walls/doors/windows/openings with
 * `dimensions` [x,y,z] metres and a column-major 4×4 `transform`). Walls become the room's interior
 * faces, joined where their ends meet; doors and windows land on the nearest wall.
 */
export function fromRoomPlan(data) {
  const arr = (k) => (Array.isArray(data?.[k]) ? data[k] : []);
  const pose = (o) => {
    const t = (o.transform || []).flat ? (o.transform || []).flat(2) : o.transform;
    const d = o.dimensions || [0, 0, 0];
    return { c: [t[12] * 100, t[13] * 100, t[14] * 100], ax: [t[0], t[2]], dim: [d[0] * 100, d[1] * 100, (d[2] || 0) * 100] };
  };
  const walls = arr("walls").map(pose).filter((w) => w.dim[0] > 5);
  if (!walls.length) throw new Error("مفيش حيطان في ملف المسح");
  const floorY = Math.min(...walls.map((w) => w.c[1] - w.dim[1] / 2));
  // segments in plan (x, z) — RoomPlan's z already points towards the viewer like ours
  const segs = walls.map((w) => {
    const L = Math.hypot(w.ax[0], w.ax[1]) || 1, a = [w.ax[0] / L, w.ax[1] / L];
    return { a: [w.c[0] - a[0] * w.dim[0] / 2, w.c[2] - a[1] * w.dim[0] / 2], b: [w.c[0] + a[0] * w.dim[0] / 2, w.c[2] + a[1] * w.dim[0] / 2], h: w.dim[1] };
  });
  // chain the segments end to end (tolerance 20 cm)
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 20;
  const left = segs.slice(1), chain = [segs[0]];
  let grew = true;
  while (left.length && grew) {
    grew = false;
    for (let i = 0; i < left.length; i++) {
      const s = left[i], end = chain[chain.length - 1].b, start = chain[0].a;
      if (near(end, s.a)) { chain.push(s); left.splice(i, 1); grew = true; break; }
      if (near(end, s.b)) { chain.push({ ...s, a: s.b, b: s.a }); left.splice(i, 1); grew = true; break; }
      if (near(start, s.b)) { chain.unshift(s); left.splice(i, 1); grew = true; break; }
      if (near(start, s.a)) { chain.unshift({ ...s, a: s.b, b: s.a }); left.splice(i, 1); grew = true; break; }
    }
  }
  const closed = chain.length > 2 && near(chain[chain.length - 1].b, chain[0].a);
  // corners where neighbouring walls meet: average of the two ends
  let pts = chain.map((s, i) => (i === 0 ? s.a : [(s.a[0] + chain[i - 1].b[0]) / 2, (s.a[1] + chain[i - 1].b[1]) / 2]));
  if (closed) pts[0] = [(chain[0].a[0] + chain[chain.length - 1].b[0]) / 2, (chain[0].a[1] + chain[chain.length - 1].b[1]) / 2];
  else pts.push(chain[chain.length - 1].b);
  // move to positive coordinates and round to 0.5 cm
  const mx = Math.min(...pts.map((p) => p[0])), mz = Math.min(...pts.map((p) => p[1]));
  pts = pts.map((p) => [Math.round((p[0] - mx) * 2) / 2, Math.round((p[1] - mz) * 2) / 2]);
  // our walls keep the room on their right (clockwise on screen); flip if the scan ran the other way
  if (closed && signedArea(pts) < 0) pts.reverse();
  const h = Math.round(Math.max(...chain.map((s) => s.h)));
  const room = { pts, closed, walls: Array.from({ length: closed ? pts.length : pts.length - 1 }, () => ({ id: uid(), t: WALL_T, h: h || WALL_H, flip: false })), openings: [], scanned: true };
  // doors / windows
  const sgs = segments(room);
  const place = (o, kind) => {
    const P = pose(o);
    const p = [P.c[0] - mx, P.c[2] - mz];
    let best = null;
    for (const sg of sgs) {
      const al = dot(sub(p, sg.A), sg.d), off = Math.abs(dot(sub(p, sg.A), sg.n));
      if (al < -10 || al > sg.L + 10) continue;
      if (!best || off < best.off) best = { sg, al, off };
    }
    if (!best || best.off > 40) return;
    const w = Math.round(P.dim[0]), hh = Math.round(P.dim[1]);
    room.openings.push({ id: uid(), wall: best.sg.id, kind, w, h: hh, sill: kind === "door" ? 0 : Math.max(0, Math.round(P.c[1] - hh / 2 - floorY)), at: r1(Math.max(0, Math.min(best.sg.L - w, best.al - w / 2))) });
  };
  for (const o of arr("doors")) place(o, "door");
  for (const o of [...arr("windows"), ...arr("openings")]) place(o, "window");
  return room;
}
