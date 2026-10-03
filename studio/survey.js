// NOVERA Studio — site survey (رفع المقاسات): a measuring draft → a room, plus the checks a surveyor needs.
// The draft is what the surveyor typed (wall lengths in order, heights at 3 points, diagonals, what is on
// each wall); build() turns it into the same room object the designer works on (room.js).
import * as Room from "./room.js";

const uid = () => Math.random().toString(36).slice(2, 10);
const r1 = (v) => Math.round(v * 10) / 10;
const DEG = Math.PI / 180;

/** turn at each corner after wall i (+1: the usual inside corner, -1: a corner that sticks into the room) */
export const SHAPES = {
  line: { label: "حيطة واحدة", n: 1, closed: false, turns: [], def: [400] },
  corner: { label: "ركنة (L)", n: 2, closed: false, turns: [1], def: [300, 400] },
  u: { label: "حرف U", n: 3, closed: false, turns: [1, 1], def: [300, 400, 300] },
  rect: { label: "أوضة مقفولة (4 حيطان)", n: 4, closed: true, turns: [1, 1, 1], def: [400, 300, 400, 300] },
  lroom: { label: "أوضة على شكل L (6 حيطان)", n: 6, closed: true, turns: [1, 1, -1, 1, 1], def: [500, 250, 250, 200, 250, 450] },
  free: { label: "شكل تاني (عدد حيطان حر)", n: 5, closed: true, turns: [1, 1, 1, 1] },
};
export const CORNER_NAMES = "أبجدهوزحطيكلمنسعفصقرشتثخذضظغ".split("");

export function newDraft(shape = "rect", n) {
  const S = SHAPES[shape] || SHAPES.rect;
  const count = shape === "free" ? Math.max(1, Math.min(16, +n || S.n)) : S.n;
  return {
    shape, closed: S.closed, t: Room.WALL_T, h: Room.WALL_H,
    turns: shape === "free" ? Array.from({ length: count - 1 }, () => 1) : [...S.turns],
    walls: Array.from({ length: count }, () => ({ id: uid(), L: null, hs: [null, null, null], t: null })),
    ops: [], pts: [], cols: [], diag: {},
  };
}
export function setWallCount(d, n) {
  n = Math.max(1, Math.min(16, n | 0));
  while (d.walls.length < n) d.walls.push({ id: uid(), L: null, hs: [null, null, null], t: null });
  d.walls.length = n;
  while (d.turns.length < n - 1) d.turns.push(1);
  d.turns.length = Math.max(0, n - 1);
  const ids = new Set(d.walls.map((_, i) => i));
  for (const k of ["ops", "pts", "cols"]) d[k] = d[k].filter((x) => ids.has(x.wall));
}

/**
 * A typed length → centimetres. Understands "3.42 m", "3420 mm", "342 سم", Arabic digits and the
 * values a Bluetooth laser in keyboard mode types. A bare number up to 12 with a decimal point is metres.
 */
export function parseLen(s) {
  if (s == null) return { v: null };
  let t = String(s).trim().replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c)).replace(/[٫]/g, ".").replace(/[،]/g, ",");
  if (!t) return { v: null };
  const unit = /mm|مم|ملي/i.test(t) ? "mm" : /cm|سم|سنتي/i.test(t) ? "cm" : /(^|[\d\s])(m|م|متر)\s*$/i.test(t) || /\bm\b/i.test(t) ? "m" : "";
  let num = t.replace(/[^\d.,\-]/g, "");
  if (/^\d+,\d{1,3}$/.test(num)) num = num.replace(",", ".");
  num = num.replace(/,/g, "");
  let v = parseFloat(num);
  if (!isFinite(v)) return { v: null };
  let note = "";
  if (unit === "mm") { v /= 10; note = "مم ← سم"; }
  else if (unit === "m") { v *= 100; note = "متر ← سم"; }
  else if (!unit && v > 0 && v < 8 && /\.\d{1,3}$/.test(num)) { /* 3.45 = metres; 10.5 (a sill, a gap) stays cm */ v *= 100; note = `اتحسبت ${r1(v)} سم (كتبتها بالمتر)`; }
  return { v: r1(v), note };
}

/** interior angle at corner k (between wall k-1 and wall k), from its diagonal; null when not measured */
export function cornerAngle(d, k) {
  const dg = +d.diag?.[k], a = +d.walls[k - 1]?.L, b = +d.walls[k]?.L;
  if (!(dg > 0 && a > 0 && b > 0) || d.turns[k - 1] < 0) return null;
  const c = (a * a + b * b - dg * dg) / (2 * a * b);
  if (c < -1 || c > 1) return NaN;
  return Math.acos(c) / DEG;
}
/** the diagonals worth asking for: one per inside corner, skipping ones that repeat (a 4-wall room needs 2) */
export function diagSlots(d) {
  const out = [], seen = new Set();
  const n = d.walls.length, np = d.closed ? n : n + 1;
  for (let k = 1; k < n; k++) {
    if (d.turns[k - 1] < 0) continue;
    const a = (k - 1) % np, b = (k + 1) % np;
    const key = [Math.min(a, b), Math.max(a, b)].join("-");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ k, from: CORNER_NAMES[a % CORNER_NAMES.length], to: CORNER_NAMES[b % CORNER_NAMES.length], ideal: Math.hypot(+d.walls[k - 1].L || 0, +d.walls[k].L || 0) });
  }
  return out;
}

const minH = (w, dflt) => { const v = (w.hs || []).map(Number).filter((x) => x > 0); return v.length ? Math.min(...v) : dflt; };

/** draft → { room, closure (cm the drawn outline misses by), angles } */
export function build(d, { trueAngles = true } = {}) {
  const n = d.walls.length;
  const L = d.walls.map((w) => +w.L || 0);
  let a = 0, p = [0, 0];
  const pts = [p], angles = [];
  for (let i = 0; i < n; i++) {
    p = [p[0] + Math.cos(a) * L[i], p[1] + Math.sin(a) * L[i]];
    pts.push(p);
    if (i < n - 1) {
      const th = trueAngles ? cornerAngle(d, i + 1) : null;
      const ang = th > 0 ? th : 90;
      angles.push(ang);
      a += (d.turns[i] || 1) * (180 - ang) * DEG;
    }
  }
  let closure = 0, P = pts;
  if (d.closed && n >= 3) { closure = Math.hypot(pts[n][0] - pts[0][0], pts[n][1] - pts[0][1]); P = pts.slice(0, n); }
  // keep the numbers tidy (0.1 cm) and the drawing near the origin
  const mx = Math.min(...P.map((q) => q[0])), mz = Math.min(...P.map((q) => q[1]));
  P = P.map((q) => [r1(q[0] - mx), r1(q[1] - mz)]);
  const walls = d.walls.slice(0, d.closed ? n : n).map((w) => ({ id: w.id, t: +w.t || +d.t || Room.WALL_T, h: minH(w, +d.h || Room.WALL_H), flip: false, hs: (w.hs || []).map((x) => (+x > 0 ? +x : null)), srvL: +w.L || null,
    ...(w.photos?.length ? { photos: [...w.photos] } : {}), ...(w.note ? { note: w.note } : {}) }));
  const room = { pts: P, closed: !!d.closed && n >= 3, walls, openings: [], points: [], columns: [] };
  const segs = Room.segments(room);
  const segOf = (i) => segs.find((s) => s.id === d.walls[i]?.id);
  for (const o of d.ops) {
    const s = segOf(o.wall); if (!s) continue;
    const door = o.kind === "door";
    room.openings.push({ id: o.id || uid(), wall: s.id, kind: door ? "door" : "window", w: +o.w || (door ? 90 : 120), h: +o.h || (door ? 210 : 120), sill: door ? 0 : +o.sill || 0, at: +o.at || 0 });
  }
  for (const q of d.pts) {
    const s = segOf(q.wall); if (!s) continue;
    const k = Room.MEP_KINDS[q.kind] || Room.MEP_KINDS.socket;
    room.points.push({ id: q.id || uid(), wall: s.id, kind: q.kind in Room.MEP_KINDS ? q.kind : "socket", at: +q.at || 0, z: q.z === "" || q.z == null ? k[2] : +q.z });
  }
  for (const c of d.cols) {
    const s = segOf(c.wall); if (!s) continue;
    const at = +c.at || 0, w = +c.w || 30, dp = +c.d || 30;
    const A = [s.A[0] + s.d[0] * at, s.A[1] + s.d[1] * at], B = [A[0] + s.d[0] * w, A[1] + s.d[1] * w];
    const q = [A, B, [B[0] + s.n[0] * dp, B[1] + s.n[1] * dp], [A[0] + s.n[0] * dp, A[1] + s.n[1] * dp]];
    const x0 = Math.min(...q.map((v) => v[0])), x1 = Math.max(...q.map((v) => v[0])), z0 = Math.min(...q.map((v) => v[1])), z1 = Math.max(...q.map((v) => v[1]));
    room.columns.push({ id: c.id || uid(), x: r1(x0), z: r1(z0), w: r1(x1 - x0), d: r1(z1 - z0), h: s.h, wall: s.id, at, along: w, depth: dp });
  }
  return { room, closure: r1(closure), angles };
}

/** a room drawn some other way → a draft the surveyor can walk through (lengths, heights, what is on each wall) */
export function draftFromRoom(room) {
  if (room?.survey?.draft) return JSON.parse(JSON.stringify(room.survey.draft));
  const segs = Room.segments(room);
  const d = newDraft("free", Math.max(1, segs.length));
  d.closed = !!room.closed;
  d.shape = "free";
  segs.forEach((s, i) => {
    d.walls[i] = { id: s.id, L: r1(s.L), hs: s.wall.hs || [s.h, null, null], t: s.t, ...(s.wall.photos ? { photos: s.wall.photos } : {}), ...(s.wall.note ? { note: s.wall.note } : {}) };
    if (i < segs.length - 1) { const nx = segs[i + 1]; const cr = s.d[0] * nx.d[1] - s.d[1] * nx.d[0]; d.turns[i] = cr >= 0 ? 1 : -1; }
  });
  const idx = (id) => segs.findIndex((s) => s.id === id);
  d.ops = (room.openings || []).map((o) => ({ id: o.id, wall: idx(o.wall), kind: o.kind, at: o.at, w: o.w, h: o.h, sill: o.sill })).filter((o) => o.wall >= 0);
  d.pts = (room.points || []).map((p) => ({ id: p.id, wall: idx(p.wall), kind: p.kind, at: p.at, z: p.z })).filter((p) => p.wall >= 0);
  d.cols = (room.columns || []).filter((c) => c.wall).map((c) => ({ id: c.id, wall: idx(c.wall), at: c.at, w: c.along, d: c.depth })).filter((c) => c.wall >= 0);
  return d;
}

/** what looks wrong in the numbers — {l: "e" | "w" | "n", t, wall?} (wall = index from 0) */
export function checks(d) {
  const out = [];
  const W = (i) => `حيطة ${i + 1}`;
  d.walls.forEach((w, i) => {
    const L = +w.L;
    if (!(L > 0)) { out.push({ l: "e", t: `${W(i)}: لسه ما اتكتبش طولها.`, wall: i }); return; }
    if (L < 20) out.push({ l: "w", t: `${W(i)}: ${L} سم بس — اتكتبت بالمتر؟ لو كده اكتبها ${r1(L * 100)}.`, wall: i });
    if (L > 1500) out.push({ l: "w", t: `${W(i)}: ${L} سم (${r1(L / 100)} م) — اتكتبت بالمليمتر؟`, wall: i });
    const hs = (w.hs || []).map(Number).filter((x) => x > 0);
    if (hs.some((x) => x < 150 || x > 600)) out.push({ l: "w", t: `${W(i)}: ارتفاع ${hs.find((x) => x < 150 || x > 600)} سم مش منطقي للسقف — راجعه.`, wall: i });
    if (hs.length >= 2) { const sp = Math.max(...hs) - Math.min(...hs); if (sp >= 1.5) out.push({ l: "w", t: `${W(i)}: السقف مايل ${r1(sp)} سم (من ${Math.min(...hs)} لـ ${Math.max(...hs)}). الدواليب الطويلة هتتعمل على ${Math.min(...hs)}.`, wall: i }); }
    const t = +w.t || +d.t;
    if (t && (t < 5 || t > 60)) out.push({ l: "w", t: `${W(i)}: سمك ${t} سم غريب.`, wall: i });
    const hh = Math.min(...(hs.length ? hs : [+d.h || Room.WALL_H]));
    const ops = d.ops.filter((o) => o.wall === i).map((o) => ({ ...o, a: +o.at || 0, b: (+o.at || 0) + (+o.w || 0) })).sort((x, y) => x.a - y.a);
    for (const o of ops) {
      const nm = o.kind === "door" ? "الباب" : "الشباك";
      if (!(+o.w > 0)) out.push({ l: "e", t: `${W(i)}: ${nm} من غير عرض.`, wall: i });
      if (o.b > L + 0.5) out.push({ l: "e", t: `${W(i)}: ${nm} طالع برا الحيطة (${r1(o.a)} + ${o.w} = ${r1(o.b)} والحيطة ${L}).`, wall: i });
      if ((+o.sill || 0) + (+o.h || 0) > hh + 0.5) out.push({ l: "e", t: `${W(i)}: ${nm} أعلى من السقف (${(+o.sill || 0) + (+o.h || 0)} والسقف ${hh}).`, wall: i });
      if (o.kind === "door" && +o.h && (+o.h < 170 || +o.w < 55)) out.push({ l: "w", t: `${W(i)}: باب ${o.w}×${o.h} صغير — ده شباك؟`, wall: i });
      if (o.kind !== "door" && o.sill !== "" && o.sill != null && +o.sill < 30) out.push({ l: "w", t: `${W(i)}: جلسة الشباك ${+o.sill || 0} سم — ده باب بلكونة؟ لو كده غيّره لباب.`, wall: i });
      if (o.kind !== "door" && +o.sill > 0 && +o.sill < 90) out.push({ l: "n", t: `${W(i)}: جلسة الشباك ${o.sill} سم — أوطى من الكونتر (90)، الوحدات السفلية مش هتتحط تحته.`, wall: i });
    }
    for (let k = 1; k < ops.length; k++) if (ops[k].a < ops[k - 1].b - 0.5) out.push({ l: "e", t: `${W(i)}: فيه باب/شباك راكب على اللي قبله.`, wall: i });
    for (const p of d.pts.filter((x) => x.wall === i)) {
      const k = Room.MEP_KINDS[p.kind]?.[0] || "نقطة";
      if (+p.at > L + 0.5) out.push({ l: "e", t: `${W(i)}: ${k} على بعد ${p.at} والحيطة ${L} بس.`, wall: i });
      if (+p.z > hh) out.push({ l: "e", t: `${W(i)}: ${k} أعلى من السقف.`, wall: i });
      const inOp = ops.find((o) => +p.at > o.a + 1 && +p.at < o.b - 1 && (o.kind === "door" || (+p.z > +o.sill && +p.z < +o.sill + +o.h)));
      if (inOp) out.push({ l: "w", t: `${W(i)}: ${k} واقعة جوه ${inOp.kind === "door" ? "باب" : "شباك"} — راجع البعد.`, wall: i });
    }
    for (const c of d.cols.filter((x) => x.wall === i)) if (+c.at + (+c.w || 0) > L + 0.5) out.push({ l: "e", t: `${W(i)}: العمود طالع برا الحيطة.`, wall: i });
  });
  // corners
  for (const s of diagSlots(d)) {
    const th = cornerAngle(d, s.k);
    if (th === null) continue;
    if (Number.isNaN(th)) { out.push({ l: "e", t: `القطر من ${s.from} لـ ${s.to} مش ممكن مع طول الحيطتين — راجع القطر أو الأطوال.` }); continue; }
    const dev = th - 90;
    if (Math.abs(dev) >= 0.3) {
      const off = r1(Math.abs(Math.tan(dev * DEG)) * 60);
      out.push({ l: Math.abs(dev) >= 1 ? "w" : "n", t: `ركن ${CORNER_NAMES[s.k]}: الزاوية ${r1(th)}° مش 90 — على عمق الكونتر (60 سم) الفرق ${off} سم. ${off >= 1 ? "الكونتر والزاوية محتاجين تتفصّل على المقاس." : ""}`.trim() });
    } else out.push({ l: "n", t: `ركن ${CORNER_NAMES[s.k]}: قايم (${r1(th)}°) ✓` });
  }
  if (d.closed && d.walls.every((w) => +w.L > 0) && d.walls.length >= 3) {
    const { closure } = build(d);
    if (closure >= 2) out.push({ l: closure >= 5 ? "e" : "w", t: `الأوضة مش بتقفل: الرسم بيفرق ${closure} سم عند ركن ${CORNER_NAMES[0]}. راجع طول حيطة أو قيس قطر ناقص.` });
    else if (Object.keys(d.diag || {}).length) out.push({ l: "n", t: `الأوضة بتقفل ✓ (فرق ${closure} سم)` });
  }
  return out;
}

/** the corner letters around the drawn outline, for the mini plan and the PDF */
export function cornerPoints(room) {
  const segs = Room.segments(room);
  const pts = segs.map((s) => s.A);
  if (!room.closed && segs.length) pts.push(segs[segs.length - 1].B);
  return pts.map((p, i) => ({ p, name: CORNER_NAMES[i % CORNER_NAMES.length] }));
}

/** a small plan of the draft as SVG (current wall highlighted), for the survey screens */
export function miniPlan(d, cur = -1, { w = 320, h = 220 } = {}) {
  const dd = JSON.parse(JSON.stringify(d));
  // unknown walls: borrow the parallel wall's length (2 walls away) so the sketch still looks like the room
  const n = dd.walls.length, known = (i) => +d.walls[((i % n) + n) % n]?.L > 0 ? +d.walls[((i % n) + n) % n].L : 0;
  const def = SHAPES[d.shape]?.def;
  if (def && def.length === n) {
    // a preset shape: scale its usual proportions to the walls already measured
    const ks = d.walls.map((w, i) => (+w.L > 0 ? +w.L / def[i] : 0)).filter(Boolean), f = ks.length ? ks.reduce((a, b) => a + b) / ks.length : 1;
    dd.walls.forEach((x, i) => { if (!(+x.L > 0)) x.L = def[i] * f; });
  } else dd.walls.forEach((x, i) => { if (!(+x.L > 0)) x.L = known(i + 2) || known(i - 2) || (i % 2 ? 250 : 320); });
  const { room } = build(dd);
  const segs = Room.segments(room);
  if (!segs.length) return "";
  const all = [...room.pts];
  const x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0])), z0 = Math.min(...all.map((p) => p[1])), z1 = Math.max(...all.map((p) => p[1]));
  const pad = 34, sc = Math.min((w - pad * 2) / Math.max(1, x1 - x0), (h - pad * 2) / Math.max(1, z1 - z0));
  const X = (p) => pad + (p[0] - x0) * sc + ((w - pad * 2) - (x1 - x0) * sc) / 2, Z = (p) => pad + (p[1] - z0) * sc + ((h - pad * 2) - (z1 - z0) * sc) / 2;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="svplan" role="img" aria-label="رسم الأوضة">`;
  segs.forEach((g, i) => {
    const on = i === cur, known = +d.walls[i]?.L > 0;
    s += `<line x1="${X(g.A)}" y1="${Z(g.A)}" x2="${X(g.B)}" y2="${Z(g.B)}" class="${on ? "on" : known ? "ok" : "todo"}"/>`;
    const m = [(g.A[0] + g.B[0]) / 2, (g.A[1] + g.B[1]) / 2], o = [m[0] - g.n[0] * (16 / sc), m[1] - g.n[1] * (16 / sc)];
    s += `<text x="${X(o)}" y="${Z(o) + 4}" class="${on ? "on" : ""}">${known ? r1(+d.walls[i].L) : i + 1}</text>`;
    for (const op of d.ops.filter((x) => x.wall === i)) {
      const a = Math.max(0, +op.at || 0), b = Math.min(g.L, a + (+op.w || 0));
      if (b <= a) continue;
      const P = (t) => [g.A[0] + g.d[0] * t, g.A[1] + g.d[1] * t];
      s += `<line x1="${X(P(a))}" y1="${Z(P(a))}" x2="${X(P(b))}" y2="${Z(P(b))}" class="${op.kind === "door" ? "door" : "win"}"/>`;
    }
  });
  for (const c of cornerPoints(room)) s += `<circle cx="${X(c.p)}" cy="${Z(c.p)}" r="9" class="cn"/><text x="${X(c.p)}" y="${Z(c.p) + 4}" class="cnt">${c.name}</text>`;
  return s + `</svg>`;
}
