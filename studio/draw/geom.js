// NOVERA Studio — drawing studio geometry (pure, no DOM, no three.js).
// World frame = the engine's: centimetres, x right, y depth (away from you), z up.
// A plane = { o, u, v } (origin + two unit axes); its normal n = u × v.
// A solid = a flat profile (outer loop + holes, in plane coords) pushed `depth` along n — a board when thin.

export const EPS = 1e-6;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const dist = (a, b) => len(sub(a, b));
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const r1 = (v) => Math.round(v * 10) / 10;
export const r2 = (v) => Math.round(v * 100) / 100;
export const clone = (o) => JSON.parse(JSON.stringify(o));

// ------------------------------------------------------------------ planes
export const GROUND = { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0] };
export const FRONT = { o: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1] }; // normal −y (towards you)
export const SIDE = { o: [0, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }; // normal +x
export const nOf = (pl) => norm(cross(pl.u, pl.v));
export function toWorld(pl, p, w = 0) {
  const n = nOf(pl);
  return [0, 1, 2].map((i) => pl.o[i] + pl.u[i] * p[0] + pl.v[i] * p[1] + n[i] * w);
}
export function toPlane(pl, P) {
  const d = sub(P, pl.o);
  return [dot(d, pl.u), dot(d, pl.v), dot(d, nOf(pl))];
}
/** t along the ray where it meets the plane (null when parallel or behind) */
export function rayPlane(ro, rd, pl) {
  const n = nOf(pl), den = dot(rd, n);
  if (Math.abs(den) < 1e-9) return null;
  const t = dot(sub(pl.o, ro), n) / den;
  return t > 0 ? t : null;
}
export function samePlane(a, b, tol = 0.05) {
  const na = nOf(a), nb = nOf(b);
  if (Math.abs(Math.abs(dot(na, nb)) - 1) > 1e-4) return false;
  return Math.abs(dot(sub(b.o, a.o), na)) < tol;
}
/** a plane whose normal is n, through o, with axes chosen like SketchUp (u follows world x when it can) */
export function planeFromNormal(o, n) {
  n = norm(n);
  let u = Math.abs(n[2]) > 0.9 ? [1, 0, 0] : norm(cross([0, 0, 1], n));
  if (Math.abs(n[2]) > 0.9 && n[2] < 0) u = [1, 0, 0];
  let v = cross(n, u);
  return { o: [...o], u, v: norm(v) };
}
/** rotate vector a around unit axis k by angle (rad) */
export function rotV(a, k, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return add(add(mul(a, c), mul(cross(k, a), s)), mul(k, dot(k, a) * (1 - c)));
}
export const rotP = (p, c, k, ang) => add(c, rotV(sub(p, c), k, ang));

// ------------------------------------------------------------------ 2D polygons ([[x, y], …], no repeated last point)
export function area(l) { let s = 0; for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
export const ccw = (l) => (area(l) < 0 ? [...l].reverse() : l);
export const cw = (l) => (area(l) > 0 ? [...l].reverse() : l);
export function inside(pt, l) {
  let c = false;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
    const [xi, yi] = l[i], [xj, yj] = l[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
export function bbox2(l) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of l) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); }
  return b;
}
export function perimeter(l) { let s = 0; for (let i = 0; i < l.length; i++) s += Math.hypot(l[(i + 1) % l.length][0] - l[i][0], l[(i + 1) % l.length][1] - l[i][1]); return s; }
export function centroid2(l) { const b = bbox2(l); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
/** drop repeated / collinear points */
export function clean(l, tol = 1e-4) {
  let out = l.filter((p, i) => Math.hypot(p[0] - l[(i + 1) % l.length][0], p[1] - l[(i + 1) % l.length][1]) > tol);
  let changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const a = out[(i - 1 + out.length) % out.length], b = out[i], c = out[(i + 1) % out.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (Math.abs(cr) < tol * Math.max(l1, l2) * 0.5 && (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) > 0) { out.splice(i, 1); changed = true; break; }
    }
  }
  return out;
}
export const rect = (x0, y0, x1, y1) => ccw([[Math.min(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.max(y0, y1)], [Math.min(x0, x1), Math.max(y0, y1)]]);
export function circle(c, r, n = 32, a0 = 0) { const out = []; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI * 2; out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } return out; }
/** circle through three points: { c, r } or null when they are in a line */
export function circle3(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  const a2 = a[0] ** 2 + a[1] ** 2, b2 = b[0] ** 2 + b[1] ** 2, c2 = c[0] ** 2 + c[1] ** 2;
  const x = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
  const y = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
  return { c: [x, y], r: Math.hypot(a[0] - x, a[1] - y) };
}
/** points of the arc from a to b passing near m (2-point arc + bulge), a included, b included */
export function arc3(a, b, m, segPer90 = 8) {
  const C = circle3(a, m, b);
  if (!C) return [a, b];
  const ang = (p) => Math.atan2(p[1] - C.c[1], p[0] - C.c[0]);
  let t0 = ang(a), t1 = ang(b), tm = ang(m);
  const norm2 = (t) => { while (t < 0) t += Math.PI * 2; while (t >= Math.PI * 2) t -= Math.PI * 2; return t; };
  // go from a to b the way that passes m
  let sweep = norm2(t1 - t0);
  if (norm2(tm - t0) > sweep) sweep = sweep - Math.PI * 2;
  const n = Math.max(2, Math.ceil((Math.abs(sweep) / (Math.PI / 2)) * segPer90));
  const out = [];
  for (let i = 0; i <= n; i++) { const t = t0 + (sweep * i) / n; out.push([C.c[0] + C.r * Math.cos(t), C.c[1] + C.r * Math.sin(t)]); }
  out[0] = [...a]; out[n] = [...b];
  return out;
}
/** an arc's bulge point from its chord (a→b) and the sagitta h (signed, left of a→b positive) */
export function bulgePoint(a, b, h) {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1;
  return [m[0] - (d[1] / l) * h, m[1] + (d[0] / l) * h];
}
/** a regular polygon (n sides) inscribed in radius r, first corner towards `dirAng` */
export const ngon = (c, r, n, dirAng = 0) => circle(c, r, Math.max(3, n), dirAng);

/** offset a loop by d (positive = outwards for a ccw loop), mitred, capped at 4×d on sharp corners */
export function offset(l, d) {
  const L = ccw(l), n = L.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = L[(i - 1 + n) % n], b = L[i], c = L[(i + 1) % n];
    const e1 = norm2d([b[0] - a[0], b[1] - a[1]]), e2 = norm2d([c[0] - b[0], c[1] - b[1]]);
    const n1 = [e1[1], -e1[0]], n2 = [e2[1], -e2[0]];
    let m = [n1[0] + n2[0], n1[1] + n2[1]];
    const ml = Math.hypot(m[0], m[1]);
    if (ml < 1e-9) { out.push([b[0] + n1[0] * d, b[1] + n1[1] * d]); continue; }
    m = [m[0] / ml, m[1] / ml];
    const k = Math.min(4, 1 / Math.max(0.25, m[0] * n1[0] + m[1] * n1[1]));
    out.push([b[0] + m[0] * d * k, b[1] + m[1] * d * k]);
  }
  return d < 0 ? untangle(L.map((p) => [...p]), out, d) : out;
}
/** an inward offset of short edges (a rounded corner) flips them over: drop each flipped edge and meet its
 *  neighbours' offset lines instead, so the result stays a simple loop (a sharp corner where the arc vanished) */
function untangle(L, out, d) {
  const line = (j) => { const n = L.length, a = L[j], b = L[(j + 1) % n], e = norm2d([b[0] - a[0], b[1] - a[1]]); return { p: [a[0] + e[1] * d, a[1] - e[0] * d], e }; };
  for (let guard = 0; guard < 400 && out.length > 3; guard++) {
    const n = out.length;
    let bad = -1;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, oe = [out[j][0] - out[i][0], out[j][1] - out[i][1]], le = [L[j][0] - L[i][0], L[j][1] - L[i][1]];
      if (oe[0] * le[0] + oe[1] * le[1] <= 1e-9) { bad = i; break; }
    }
    if (bad < 0) break;
    const i = bad, j = (i + 1) % n, A = line((i - 1 + n) % n), B = line(j);
    const den = A.e[0] * B.e[1] - A.e[1] * B.e[0];
    let X;
    if (Math.abs(den) < 1e-9) X = [(out[i][0] + out[j][0]) / 2, (out[i][1] + out[j][1]) / 2];
    else { const t = ((B.p[0] - A.p[0]) * B.e[1] - (B.p[1] - A.p[1]) * B.e[0]) / den; X = [A.p[0] + A.e[0] * t, A.p[1] + A.e[1] * t]; }
    // edge i (from L[i] to L[j]) disappears: L[j] goes, out[i] becomes the meeting point
    out[i] = X; out.splice(j, 1); L.splice(j, 1);
  }
  return out;
}
const norm2d = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
/** round the corner at index i with radius r (null when the corner is too tight for it) */
export function fillet(l, i, r, segPer90 = 8) {
  const n = l.length, a = l[(i - 1 + n) % n], b = l[i], c = l[(i + 1) % n];
  const d1 = norm2d([a[0] - b[0], a[1] - b[1]]), d2 = norm2d([c[0] - b[0], c[1] - b[1]]);
  const cosT = d1[0] * d2[0] + d1[1] * d2[1], th = Math.acos(Math.max(-1, Math.min(1, cosT)));
  if (th < 1e-3 || Math.abs(th - Math.PI) < 1e-3) return null;
  const t = r / Math.tan(th / 2);
  if (t > Math.hypot(a[0] - b[0], a[1] - b[1]) - 1e-3 || t > Math.hypot(c[0] - b[0], c[1] - b[1]) - 1e-3) return null;
  const p1 = [b[0] + d1[0] * t, b[1] + d1[1] * t], p2 = [b[0] + d2[0] * t, b[1] + d2[1] * t];
  const bis = norm2d([d1[0] + d2[0], d1[1] + d2[1]]), h = r / Math.sin(th / 2);
  const cc = [b[0] + bis[0] * h, b[1] + bis[1] * h];
  const mid = [cc[0] - bis[0] * r, cc[1] - bis[1] * r];
  const arc = arc3(p1, p2, mid, segPer90);
  return [...l.slice(0, i), ...arc, ...l.slice(i + 1)];
}
export function chamfer(l, i, d) {
  const n = l.length, a = l[(i - 1 + n) % n], b = l[i], c = l[(i + 1) % n];
  const d1 = norm2d([a[0] - b[0], a[1] - b[1]]), d2 = norm2d([c[0] - b[0], c[1] - b[1]]);
  if (d > Math.hypot(a[0] - b[0], a[1] - b[1]) - 1e-3 || d > Math.hypot(c[0] - b[0], c[1] - b[1]) - 1e-3) return null;
  return [...l.slice(0, i), [b[0] + d1[0] * d, b[1] + d1[1] * d], [b[0] + d2[0] * d, b[1] + d2[1] * d], ...l.slice(i + 1)];
}
/** is the vertex a smooth one (part of a curve) — no hard edge drawn there */
export function soft(l, i, deg = 21) {
  const n = l.length, a = l[(i - 1 + n) % n], b = l[i], c = l[(i + 1) % n];
  const d1 = norm2d([b[0] - a[0], b[1] - a[1]]), d2 = norm2d([c[0] - b[0], c[1] - b[1]]);
  return Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1]))) < (deg * Math.PI) / 180;
}

// ------------------------------------------------------------------ polygon booleans (Greiner–Hormann, simple polygons)
function mkList(l) {
  const vs = l.map((p) => ({ x: p[0], y: p[1], next: null, prev: null, inter: false, alpha: 0, entry: false, corr: null, visited: false }));
  vs.forEach((v, i) => { v.next = vs[(i + 1) % vs.length]; v.prev = vs[(i - 1 + vs.length) % vs.length]; });
  return vs[0];
}
const realNext = (v) => { let c = v.next; while (c.inter) c = c.next; return c; };
function each(first, fn) { let v = first; do { fn(v); v = v.next; } while (v !== first); }
function insertBetween(v, start, end) {
  let cur = start.next;
  while (cur !== end && cur.alpha < v.alpha) cur = cur.next;
  v.next = cur; v.prev = cur.prev; cur.prev.next = v; cur.prev = v;
}
function segX(a, b, c, d) {
  const den = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
  if (Math.abs(den) < 1e-12) return null;
  const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / den;
  const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / den;
  if (ua <= 1e-9 || ua >= 1 - 1e-9 || ub <= 1e-9 || ub >= 1 - 1e-9) return null;
  return { x: a.x + ua * (b.x - a.x), y: a.y + ua * (b.y - a.y), ua, ub };
}
function gh(S, C, op) {
  const sf = op === "inter" ? true : op === "union" ? false : false;
  const cf = op === "inter" ? true : op === "union" ? false : true;
  const s0 = mkList(S), c0 = mkList(C);
  // all real vertices first (list changes while inserting)
  const sReal = [], cReal = [];
  each(s0, (v) => sReal.push(v)); each(c0, (v) => cReal.push(v));
  let found = 0;
  for (const a of sReal) {
    const an = sReal[(sReal.indexOf(a) + 1) % sReal.length];
    for (const c of cReal) {
      const cn = cReal[(cReal.indexOf(c) + 1) % cReal.length];
      const X = segX(a, an, c, cn);
      if (!X) continue;
      found++;
      const sv = { x: X.x, y: X.y, inter: true, alpha: X.ua, entry: false, corr: null, visited: false, next: null, prev: null };
      const cv = { x: X.x, y: X.y, inter: true, alpha: X.ub, entry: false, corr: null, visited: false, next: null, prev: null };
      sv.corr = cv; cv.corr = sv;
      insertBetween(sv, a, an); insertBetween(cv, c, cn);
    }
  }
  if (!found) return null;
  let sIn = inside([s0.x, s0.y], C), cIn = inside([c0.x, c0.y], S);
  sIn = sIn !== sf; cIn = cIn !== cf;
  each(s0, (v) => { if (v.inter) { v.entry = sIn; sIn = !sIn; } });
  each(c0, (v) => { if (v.inter) { v.entry = cIn; cIn = !cIn; } });
  const out = [];
  for (;;) {
    let cur = null;
    each(s0, (v) => { if (!cur && v.inter && !v.visited) cur = v; });
    if (!cur) break;
    const poly = [[cur.x, cur.y]];
    let guard = 0;
    do {
      cur.visited = true; cur.corr.visited = true;
      if (cur.entry) { do { cur = cur.next; poly.push([cur.x, cur.y]); } while (!cur.inter && guard++ < 1e5); }
      else { do { cur = cur.prev; poly.push([cur.x, cur.y]); } while (!cur.inter && guard++ < 1e5); }
      cur = cur.corr;
    } while (!cur.visited && guard++ < 1e5);
    poly.pop();
    const cl = clean(poly);
    if (cl.length >= 3 && Math.abs(area(cl)) > 1e-4) out.push(cl);
  }
  void realNext;
  return out;
}
/** nudge a loop a hair so no vertex sits exactly on the other loop's edges */
const nudge = (l, k = 1) => l.map(([x, y]) => [x + 1.37e-5 * k, y + 0.91e-5 * k]);
/**
 * Boolean of two simple loops. Returns { outers: [loops], holes: [loops] } (holes only when one loop sits inside the other).
 * op: "diff" (a − b) | "union" | "inter"
 */
export function boolean(a, b, op) {
  a = ccw(clean(a)); b = ccw(clean(b));
  const partial = (x, y) => { const k = x.map((p) => inside(p, y)); return k.some(Boolean) && k.some((q) => !q); };
  let res = gh(a, b, op);
  for (let k = 1; k <= 3 && (!res || !res.length) && (partial(a, b) || partial(b, a)); k++) res = gh(a, nudge(b, k), op);
  if (res) {
    if (op === "union" && res.length > 1) { // GH can return the hole of a union as a second loop
      const big = res.reduce((m, l) => (Math.abs(area(l)) > Math.abs(area(m)) ? l : m), res[0]);
      return { outers: [ccw(big)], holes: res.filter((l) => l !== big && inside(l[0], big)).map(cw) };
    }
    return { outers: res.map(ccw), holes: [] };
  }
  const aInB = a.every((p) => inside(p, b)), bInA = b.every((p) => inside(p, a));
  if (op === "diff") { if (aInB) return { outers: [], holes: [] }; if (bInA) return { outers: [a], holes: [cw(b)] }; return { outers: [a], holes: [] }; }
  if (op === "union") { if (aInB) return { outers: [b], holes: [] }; if (bInA) return { outers: [a], holes: [] }; return { outers: [a, b], holes: [] }; }
  if (aInB) return { outers: [a], holes: [] }; if (bInA) return { outers: [b], holes: [] }; return { outers: [], holes: [] };
}

// ------------------------------------------------------------------ solids
/** the solid's faces in world coords: { n, outer, holes, kind, ref } (kind: top | bottom | side | pfloor | pwall) */
export function solidFaces(s) {
  const pl = s.plane, n = nOf(pl), D = s.depth;
  const W = (p, w) => toWorld(pl, p, w);
  const faces = [];
  const outer = ccw(s.outer), holes = (s.holes || []).map(cw);
  const pockets = (s.pockets || []).filter((pk) => pk.depth < D - 1e-6);
  const topHoles = [...holes, ...pockets.filter((pk) => pk.face !== "bottom").map((pk) => cw(pk.loop))];
  const botHoles = [...holes, ...pockets.filter((pk) => pk.face === "bottom").map((pk) => cw(pk.loop))];
  faces.push({ n, outer: outer.map((p) => W(p, D)), holes: topHoles.map((h) => h.map((p) => W(p, D))), kind: "top", ref: {} });
  faces.push({ n: mul(n, -1), outer: [...outer].reverse().map((p) => W(p, 0)), holes: botHoles.map((h) => [...h].reverse().map((p) => W(p, 0))), kind: "bottom", ref: {} });
  const sides = (l, loop) => {
    for (let i = 0; i < l.length; i++) {
      const p = l[i], q = l[(i + 1) % l.length];
      const dx = q[0] - p[0], dy = q[1] - p[1], ll = Math.hypot(dx, dy) || 1;
      const nn = add(mul(pl.u, dy / ll), mul(pl.v, -dx / ll)); // outward for a ccw outer / cw hole
      faces.push({ n: nn, outer: [W(p, 0), W(q, 0), W(q, D), W(p, D)], holes: [], kind: "side", ref: { loop, i } });
    }
  };
  sides(outer, "o");
  holes.forEach((h, hi) => sides(h, hi));
  pockets.forEach((pk, pi) => {
    const top = pk.face !== "bottom", w0 = top ? D - pk.depth : pk.depth;
    const L = ccw(pk.loop);
    faces.push({ n: top ? n : mul(n, -1), outer: (top ? L : [...L].reverse()).map((p) => W(p, w0)), holes: [], kind: "pfloor", ref: { pocket: pi } });
    const wl = cw(L); // walls face inwards into the pocket
    for (let i = 0; i < wl.length; i++) {
      const p = wl[i], q = wl[(i + 1) % wl.length];
      const dx = q[0] - p[0], dy = q[1] - p[1], ll = Math.hypot(dx, dy) || 1;
      const nn = add(mul(pl.u, dy / ll), mul(pl.v, -dx / ll));
      const [wa, wb] = top ? [w0, D] : [0, w0];
      faces.push({ n: nn, outer: [W(p, wa), W(q, wa), W(q, wb), W(p, wb)], holes: [], kind: "pwall", ref: { pocket: pi, i } });
    }
  });
  return faces;
}
/** hard edges of a solid (world segments), for drawing outlines and for snapping */
export function solidEdges(s) {
  const pl = s.plane, D = s.depth, W = (p, w) => toWorld(pl, p, w), out = [];
  const loopEdges = (l, wa, wb, verticals = true) => {
    for (let i = 0; i < l.length; i++) {
      const p = l[i], q = l[(i + 1) % l.length];
      out.push([W(p, wa), W(q, wa)]);
      if (wb != null) out.push([W(p, wb), W(q, wb)]);
      if (verticals && wb != null && !soft(l, i)) out.push([W(p, wa), W(p, wb)]);
    }
  };
  loopEdges(s.outer, 0, D);
  for (const h of s.holes || []) loopEdges(h, 0, D);
  for (const pk of s.pockets || []) {
    if (pk.depth >= D - 1e-6) continue;
    const top = pk.face !== "bottom";
    loopEdges(pk.loop, top ? D - pk.depth : pk.depth, top ? D : 0);
  }
  return out;
}
/** corner points (world) of a solid: outline vertices top + bottom (hard ones), for endpoint snapping */
export function solidPoints(s) {
  const pl = s.plane, out = [];
  const L = [s.outer, ...(s.holes || []), ...(s.pockets || []).map((p) => p.loop)];
  for (const l of L) l.forEach((p, i) => { if (!soft(l, i)) { out.push({ p: toWorld(pl, p, 0), loop: l, i, w: 0 }); out.push({ p: toWorld(pl, p, s.depth), loop: l, i, w: s.depth }); } });
  return out;
}
export function solidBox(s) {
  const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  for (const w of [0, s.depth]) for (const p of s.outer) {
    const P = toWorld(s.plane, p, w);
    b.x0 = Math.min(b.x0, P[0]); b.y0 = Math.min(b.y0, P[1]); b.z0 = Math.min(b.z0, P[2]);
    b.x1 = Math.max(b.x1, P[0]); b.y1 = Math.max(b.y1, P[1]); b.z1 = Math.max(b.z1, P[2]);
  }
  return b;
}
/** the plane of one face of a solid (normal = the face's outward normal) */
export function facePlane(s, face) {
  const pl = s.plane, n = nOf(pl), D = s.depth;
  if (face.kind === "top") return { o: toWorld(pl, [0, 0], D), u: [...pl.u], v: [...pl.v] };
  if (face.kind === "bottom") return { o: toWorld(pl, [0, 0], 0), u: [...pl.u], v: mul(pl.v, -1) };
  if (face.kind === "pfloor") {
    const pk = s.pockets[face.ref.pocket], top = pk.face !== "bottom";
    return top ? { o: toWorld(pl, [0, 0], D - pk.depth), u: [...pl.u], v: [...pl.v] } : { o: toWorld(pl, [0, 0], pk.depth), u: [...pl.u], v: mul(pl.v, -1) };
  }
  const p = face.outer[0], q = face.outer[1];
  const u = norm(sub(q, p));
  return { o: [...p], u, v: face.kind === "pwall" ? norm(sub(face.outer[3], face.outer[0])) : [...n] };
}
/** is the solid a board (thin enough to cut from a sheet)? */
export const isBoard = (s) => s.depth <= 6;
/** label size of a board: length along its grain, width across, thickness */
export function boardSize(s) {
  const b = bbox2(s.outer), du = b[2] - b[0], dv = b[3] - b[1];
  const alongU = s.grain === "v" ? false : s.grain === "u" ? true : du >= dv;
  return { w: r1(alongU ? du : dv), h: r1(alongU ? dv : du), t: r2(s.depth), alongU, b };
}
/** is the outline a plain rectangle (no shaped cut) aligned with its own axes? */
export function plainRect(s) {
  const o = clean(s.outer);
  if (o.length !== 4 || (s.holes || []).length || (s.pockets || []).length) return false;
  return o.every((p, i) => { const q = o[(i + 1) % 4]; return Math.abs(p[0] - q[0]) < 1e-3 || Math.abs(p[1] - q[1]) < 1e-3; });
}

// ------------------------------------------------------------------ sweeps (Follow Me): a profile carried along a path
/** faces of a profile loop (2D, in its own frame: x across, y up) swept along a polyline path (world points) */
export function sweepFaces(profile, path, closed = false) {
  const P = ccw(profile);
  const pts = closed ? [...path, path[0], path[1]] : path;
  if (pts.length < 2) return [];
  const rings = [];
  const N = pts.length;
  for (let i = 0; i < N; i++) {
    if (closed && i === N - 1) break;
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[Math.min(N - 1, i + 1)];
    let t1 = i === 0 && !closed ? norm(sub(c, b)) : norm(sub(b, a));
    let t2 = i === N - 1 && !closed ? t1 : norm(sub(c, b));
    if (i === 0 && !closed) t2 = t1;
    const t = norm(add(t1, t2));
    const up0 = Math.abs(t[2]) > 0.95 ? [0, 1, 0] : [0, 0, 1];
    const side = norm(cross(t, up0)), up = norm(cross(side, t));
    const k = 1 / Math.max(0.2, dot(t, t1)); // mitre: stretch across the bend
    const sideM = mul(side, Math.abs(dot(side, t1)) < 0.99 ? k : 1);
    rings.push(P.map(([x, y]) => add(add(b, mul(sideM, x)), mul(up, y))));
  }
  if (closed) rings.push(rings[0]);
  const faces = [];
  for (let r = 0; r + 1 < rings.length; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let i = 0; i < A.length; i++) {
      const j = (i + 1) % A.length;
      const q = [A[i], A[j], B[j], B[i]];
      faces.push({ n: norm(cross(sub(q[1], q[0]), sub(q[3], q[0]))), outer: q, holes: [], kind: "side", ref: {} });
    }
  }
  if (!closed) {
    const f0 = rings[0], f1 = rings[rings.length - 1];
    faces.push({ n: norm(sub(pts[0], pts[1])), outer: [...f0].reverse(), holes: [], kind: "cap", ref: {} });
    faces.push({ n: norm(sub(pts[N - 1], pts[N - 2])), outer: f1, holes: [], kind: "cap", ref: {} });
  }
  return faces;
}
export function pathLength(path, closed) { let s = 0; for (let i = 0; i + 1 < path.length; i++) s += dist(path[i], path[i + 1]); if (closed && path.length > 2) s += dist(path[path.length - 1], path[0]); return s; }

// ------------------------------------------------------------------ the VCB (measurements box) parser
/** "60" → 60 cm · "600mm" → 60 · "1.2m" → 120 · "60,40" → [60, 40] · "x5" / "5x" / "*5" → { times: 5 } · "/4" → { div: 4 } · "12s" → { sides: 12 } · "45°" → 45 */
export function parseVcb(txt) {
  const t = String(txt || "").trim().replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/،/g, ",").replace(/\s+/g, "");
  if (!t) return null;
  let m;
  if ((m = /^(?:[x×*])(\d+)$|^(\d+)[x×*]$/i.exec(t))) return { times: +(m[1] || m[2]) };
  if ((m = /^\/(\d+)$/.exec(t))) return { div: +m[1] };
  if ((m = /^(\d+)s$/i.exec(t))) return { sides: +m[1] };
  if ((m = /^r(-?[\d.]+)$/i.exec(t))) return { r: +m[1] };
  const one = (s) => {
    const q = /^(-?[\d.]+)(mm|cm|m|°|deg)?$/i.exec(s);
    if (!q) return NaN;
    const v = +q[1], u = (q[2] || "").toLowerCase();
    return u === "mm" ? v / 10 : u === "m" ? v * 100 : v;
  };
  const parts = t.split(/[,;]/).map(one);
  if (parts.some((v) => Number.isNaN(v))) return null;
  return parts.length === 1 ? { v: parts[0] } : { list: parts };
}
