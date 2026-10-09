// «🏠 5 تصميمات تلقائية» — candidate kitchens for one room. Everything here works on copies: the project is never
// touched (the module applies a design only when the owner taps «اختار ده»).
// The app's own «صمملي المطبخ» (autoKitchen) makes the base layouts — shape (I / L / U) × walls × finish tier, and the
// fridge at either end — then post-edits make the variations (drawers instead of doors, uppers to the ceiling, glass
// uppers, no / extra tall columns, the hob on another wall) and the owner's must-haves (dishwasher, washer, oven, pantry).
import * as More from "../../library.js";

export const TIERS = { eco: "اقتصادي", std: "عادي", lux: "فاخر" };
export const SHAPES = { 1: "خطي", 2: "حرف L", 3: "حرف U" };
const TAGS = { flip: "التلاجة في الناحية التانية", drawers: "أدراج بدل الضلف", ceil: "علوي لحد السقف", glass: "علوي زجاج", nooven: "من غير عمود فرن", pantry: "دولاب تموين", hob: "البوتجاز على حيطة تانية", hob60: "بوتجاز 60 بدل 90", fridge: "التلاجة في آخر الرصة" };
export const tagText = (t) => TAGS[t] || t;

let A = null; // the app api
export const setApi = (api) => { A = api; };
const clone = (x) => JSON.parse(JSON.stringify(x));
const yes = (v) => v === true || v === "true";

// ------------------------------------------------------------------ room helpers (A-based: distances from each wall's start)
/** chains of walls that meet at right angles, turning into the room: [[seg], [seg, seg], [seg, seg, seg]] */
export function wallChains(room) {
  const segs = A.Room.segments(room).filter((s) => s.L >= 100);
  const meets = (a, b) => Math.hypot(a.B[0] - b.A[0], a.B[1] - b.A[1]) < 1 && Math.abs(a.d[0] * b.d[0] + a.d[1] * b.d[1]) < 0.2 && a.n[0] * b.d[0] + a.n[1] * b.d[1] > 0.5;
  const out = [];
  for (const s of segs) {
    out.push([s]);
    const b = segs.find((x) => x !== s && meets(s, x));
    if (!b) continue;
    out.push([s, b]);
    const c = segs.find((x) => x !== s && x !== b && meets(b, x));
    if (c) out.push([s, b, c]);
  }
  return out;
}
/** what each wall can't take: all = no unit at all (doors, low windows, columns), upper = no wall / tall unit */
export function wallBlocks(room, seg) {
  const all = [], upper = [], windows = [];
  for (const o of room.openings || []) {
    if (o.wall !== seg.id) continue;
    if (o.kind === "door") all.push([o.at - 5, o.at + o.w + 5]);
    else { upper.push([+o.at, +o.at + +o.w]); windows.push(o); if ((+o.sill || 0) < 88) all.push([+o.at, +o.at + +o.w]); }
  }
  for (const cb of A.Room.columnBlocks(room)) if (cb.wall === seg.id) all.push([cb.a, cb.b]);
  all.push(...A.Room.crossBlocks(room, seg, "lower", 62));
  upper.push(...A.Room.crossBlocks(room, seg, "upper", 36), ...A.Room.crossBlocks(room, seg, "tall", 62));
  return { all, upper, windows };
}
const minus = (span, blocks) => {
  let parts = [span];
  for (const [a, b] of blocks) parts = parts.flatMap(([x, y]) => (b <= x || a >= y ? [[x, y]] : [[x, Math.min(y, a)], [Math.max(x, b), y]].filter(([p, q]) => q - p > 0.5)));
  return parts;
};
const hits = (a0, a1, blocks) => blocks.some(([a, b]) => a < a1 - 0.5 && b > a0 + 0.5);
/** widths 30–90 that fill len (half-centimetre steps) — the same rule as the app's auto kitchen */
export function fillWidths(len, max = 90) {
  if (len < 29.5) return [];
  const n = Math.ceil(len / max);
  const w = Math.floor((len / n) * 2) / 2;
  return Array.from({ length: n }, () => w);
}
const usable = (room, seg) => minus([0, seg.L], wallBlocks(room, seg).all).reduce((s, [a, b]) => s + b - a, 0);

// ------------------------------------------------------------------ units
function info(u) {
  const r = A.R(u);
  if (!r.ok) return null;
  const box = A.localBox(r), p = r.params || u.params || {};
  const row = A.rowOf(u, r);
  let cls = row === "upper" ? "upper" : row === "tall" ? "tall" : "base";
  const cat = p.unit_category || "";
  if (cat === "corner" || cat === "corner_glass_display" || !u.pos?.wall) cls = row === "upper" ? "cornerU" : "corner";
  else if (yes(p.include_sink_cutout)) cls = "sink";
  else if (p.unit_label === "بوتجاز" || cat === "cooker_gap") cls = "hob";
  else if (cat === "washer_gap") cls = u.agDish ? "dish" : "washer";
  else if (cat === "fridge") cls = "fridge";
  else if (cat === "oven") cls = "oven";
  else if (row === "tall") cls = "tall";
  else if (row === "upper" && (yes(p.include_hood) || /شفاط/.test(u.name || ""))) cls = "hood";
  else if (row === "upper" && u.agTop) cls = "top";
  return { u, r, box, w: box.x1 - box.x0, row, cls, p };
}
/** a unit's stretch on its wall, A-based [a, b] */
function spanA(seg, u, w) {
  const e = A.Room.axisX(A.Room.rotFor(seg.n)), fromA = e[0] * seg.d[0] + e[1] * seg.d[1] > 0;
  const s = +u.pos.s;
  return fromA ? [s, s + w] : [seg.L - s - w, seg.L - s];
}
function posAt(seg, a, w) {
  const e = A.Room.axisX(A.Room.rotFor(seg.n)), fromA = e[0] * seg.d[0] + e[1] * seg.d[1] > 0;
  return { wall: seg.id, s: Math.round((fromA ? a : seg.L - a - w) * 2) / 2 };
}
/** a unit made from a library preset, dressed like `tpl` (same finish, handles, LED) */
function makeLike(tpl, preset, w, name, row) {
  const p = A.withDefaults({ ...clone(preset || {}), width: w, kud_handles: clone(tpl.params.kud_handles || { type: "bar" }) });
  const libs = { ...(tpl.libs || {}) };
  if (row !== "base") delete libs.countertop;
  for (const k of Object.keys(libs)) { const m = A.KU.K_MATS[k]; if (m && tpl.params[m[1]] != null) p[m[1]] = tpl.params[m[1]]; }
  if (tpl.params.door_color != null) p.door_color = tpl.params.door_color;
  if (row === "upper" && yes(tpl.params.include_led_marker)) p.include_led_marker = true;
  return { id: A.uid(), kind: "kitchen", name, params: p, libs };
}
const P_BASE = () => A.KU.KITCHEN.k_base2.params, P_BASE1 = () => More.KITCHEN.k_base1_45?.params || A.KU.KITCHEN.k_base2.params;
const P_WALL = () => A.KU.KITCHEN.k_wall2.params, P_WALL1 = () => More.KITCHEN.k_wall1_40?.params || A.KU.KITCHEN.k_wall2.params;
const plainBase = (tpl, w) => makeLike(tpl, w >= 50 ? P_BASE() : P_BASE1(), w, `سفلية ${w}`, "base");
const plainWall = (tpl, w) => makeLike(tpl, w >= 50 ? P_WALL() : P_WALL1(), w, `علوية ${w}`, "upper");

/** a working copy of a candidate on which the edits below run */
class Draft {
  constructor(room, units) { this.room = room; this.units = units; this.segs = new Map(A.Room.segments(room).map((s) => [s.id, s])); }
  infos() { return this.units.map(info).filter(Boolean); }
  tpl(row) {
    const L = this.infos();
    const pick = (f) => L.find(f)?.u;
    return row === "base" ? pick((x) => x.cls === "sink") || pick((x) => x.row === "lower") : pick((x) => x.cls === "upper") || pick((x) => x.row === "upper");
  }
  /** units on a wall as A-based stretches */
  on(wall, rows) {
    const seg = this.segs.get(wall);
    return this.infos().filter((x) => x.u.pos?.wall === wall && rows.includes(x.row)).map((x) => ({ ...x, ab: spanA(seg, x.u, x.w) }));
  }
  drop(list) { const ids = new Set(list.map((x) => x.u?.id || x.id)); this.units = this.units.filter((u) => !ids.has(u.id)); }
  add(u, wall, a, w) { u.pos = posAt(this.segs.get(wall), a, w); this.units.push(u); }
  /** contiguous runs of plain base units around [a, b] (plus [a, b] itself) */
  baseRun(wall, a, b) {
    const L = this.on(wall, ["lower"]).filter((x) => x.cls === "base").sort((p, q) => p.ab[0] - q.ab[0]);
    let lo = a, hi = b, take = [];
    let grew = true;
    while (grew) {
      grew = false;
      for (const x of L) if (!take.includes(x) && x.ab[1] >= lo - 1 && x.ab[0] <= hi + 1) { take.push(x); lo = Math.min(lo, x.ab[0]); hi = Math.max(hi, x.ab[1]); grew = true; }
    }
    return { lo, hi, take };
  }
  /** empty [a, b] on the base row and refill it (merged with the plain units around it) */
  refillBase(wall, a, b, tpl = this.tpl("base")) {
    const { lo, hi, take } = this.baseRun(wall, a, b);
    this.drop(take);
    let x = lo;
    for (const w of fillWidths(hi - lo)) { this.add(plainBase(tpl, w), wall, x, w); x += w; }
  }
  /** free wall space on the upper row in [a, b] (windows, doors, tall units and other uppers kept) → new wall units */
  refillUpper(wall, a, b, tpl = this.tpl("upper")) {
    if (!tpl) return;
    const seg = this.segs.get(wall), bl = wallBlocks(this.room, seg);
    const L = this.on(wall, ["upper", "tall"]);
    // merge with the plain wall units touching it so the widths even out
    let lo = a, hi = b;
    const plain = L.filter((x) => x.cls === "upper" && !x.u.agTop && x.ab[1] >= a - 1 && x.ab[0] <= b + 1 && x.row === "upper");
    for (const x of plain) { lo = Math.min(lo, x.ab[0]); hi = Math.max(hi, x.ab[1]); }
    this.drop(plain);
    const busy = this.on(wall, ["upper", "tall"]).filter((x) => !x.u.agTop).map((x) => x.ab);
    for (const [p, q] of minus([lo, hi], [...bl.upper, ...bl.all, ...busy])) {
      let x = p;
      for (const w of fillWidths(q - p)) { this.add(plainWall(tpl, w), wall, x, w); x += w; }
    }
  }
  /** put a base-row unit of width w at a (A-based) inside a run of plain base units; the rest of the run is refilled */
  placeBase(wall, a, w, u) {
    const L = this.on(wall, ["lower"]).filter((x) => x.cls === "base").sort((p, q) => p.ab[0] - q.ab[0]);
    const run = this.baseRun(wall, a + 1, a + w - 1);
    if (!run.take.length || run.lo > a + 0.5 || run.hi < a + w - 0.5) return false;
    const left = a - run.lo, right = run.hi - a - w;
    if ((left > 0.5 && left < 29.5) || (right > 0.5 && right < 29.5)) return false;
    void L;
    const tpl = this.tpl("base");
    this.drop(run.take);
    let x = run.lo;
    for (const ww of fillWidths(left)) { this.add(plainBase(tpl, ww), wall, x, ww); x += ww; }
    this.add(u, wall, a, w);
    x = a + w;
    for (const ww of fillWidths(right)) { this.add(plainBase(tpl, ww), wall, x, ww); x += ww; }
    return true;
  }
  /** a tall unit at a: the base row as placeBase, the wall units over it go (and are refilled around it) */
  placeTall(wall, a, w, u) {
    const seg = this.segs.get(wall), bl = wallBlocks(this.room, seg);
    if (hits(a, a + w, bl.upper)) return false; // never in front of a window
    const ups = this.on(wall, ["upper"]).filter((x) => x.ab[0] < a + w - 0.5 && x.ab[1] > a + 0.5);
    if (ups.some((x) => !["upper", "top"].includes(x.cls))) return false; // a hood / corner there
    const tplU = this.tpl("upper");
    if (!this.placeBase(wall, a, w, u)) return false;
    const lo = Math.min(a, ...ups.map((x) => x.ab[0])), hi = Math.max(a + w, ...ups.map((x) => x.ab[1]));
    this.drop(ups);
    if (tplU) { if (lo < a - 0.5) this.refillUpper(wall, lo, a, tplU); if (hi > a + w + 0.5) this.refillUpper(wall, a + w, hi, tplU); }
    return true;
  }
  /** places next to an anchor unit (both sides) where a unit of width w can go on the base row */
  besides(anchor, w) {
    const out = [];
    for (const x of this.on(anchor.u.pos.wall, ["lower", "tall"])) {
      if (x.u.id !== anchor.u.id) continue;
      out.push(x.ab[1], x.ab[0] - w);
    }
    return out;
  }
}

// ------------------------------------------------------------------ the variations (each returns true when it changed something)
const EDITS = {
  drawers(d) {
    let n = 0;
    for (const x of d.infos()) {
      if (x.cls !== "base" || x.w < 40 || x.p.door_type === "drawers") continue;
      const u = x.u, w = +u.params.width || x.w;
      u.params = A.withDefaults({ ...u.params, ...clone(A.KU.KITCHEN.k_base_drawers.params), width: w });
      u.name = `أدراج ${w}`; n++;
    }
    return n > 0;
  },
  glass(d) {
    const L = d.infos().filter((x) => x.cls === "upper" && x.w >= 50 && x.w <= 90 && !/glass/.test(x.p.door_type || ""));
    if (!L.length) return false;
    // the two widest, or every other one on a long run
    L.sort((a, b) => b.w - a.w);
    for (const x of L.slice(0, Math.max(2, Math.floor(L.length / 2)))) { x.u.params = { ...x.u.params, door_type: "double_glass" }; x.u.name = `علوية زجاج ${x.w}`; }
    return true;
  },
  ceil(d) {
    let n = 0;
    for (const x of d.infos()) {
      if (!["upper", "hood"].includes(x.cls)) continue;
      const seg = d.segs.get(x.u.pos.wall), ceil = +(seg?.h || 280);
      const top = (+x.p.wall_mount_height || 145) + (+x.p.height || 80), h = Math.round((ceil - top - 1) * 10) / 10;
      if (h < 30) continue;
      const c = makeLike(x.u, P_WALL(), +x.p.width || x.w, `علوية لحد السقف ${+x.p.width || x.w}`, "upper");
      Object.assign(c.params, { height: h, wall_mount_height: Math.round(top * 10) / 10, door_bottom_extension: 0, include_led_marker: false, shelf_count: h > 45 ? 1 : 0, include_shelves: h > 45 });
      c.pos = { ...x.u.pos }; c.agTop = true;
      d.units.push(c); n++;
    }
    return n > 0;
  },
  nooven(d) {
    const ov = d.infos().find((x) => x.cls === "oven");
    if (!ov) return false;
    const seg = d.segs.get(ov.u.pos.wall), [a, b] = spanA(seg, ov.u, ov.w);
    d.drop([ov]);
    d.refillBase(seg.id, a, b);
    d.refillUpper(seg.id, a, b);
    return true;
  },
  pantry(d) {
    const L = d.infos();
    const ov = L.find((x) => x.cls === "oven"), fr = L.find((x) => x.cls === "fridge");
    const anchor = ov || fr;
    if (!anchor) return false;
    const tpl = d.tpl("base");
    const pu = makeLike(tpl, More.KITCHEN.k_pantry60?.params || { unit_type: "tall", door_type: "double", shelf_count: 5 }, 60, "دولاب تموين 60", "tall");
    const pw = (() => { const r = A.R(pu); return r.ok ? A.localBox(r).x1 - A.localBox(r).x0 : 60; })();
    for (const a of d.besides(anchor, pw)) if (d.placeTall(anchor.u.pos.wall, a, pw, pu)) return true;
    return false;
  },
  /** the hob (and its hood) moved to another wall of the run — only when no gas point fixes it */
  hob(d, ctx) {
    if ((d.room.points || []).some((p) => p.kind === "gas")) return false;
    const L = d.infos(), hob = L.find((x) => x.cls === "hob");
    if (!hob || ctx.chain.length < 2) return false;
    const hood = L.find((x) => x.cls === "hood" && x.u.pos?.wall === hob.u.pos.wall);
    const seg0 = d.segs.get(hob.u.pos.wall), [h0, h1] = spanA(seg0, hob.u, hob.w);
    const hobU = hob.u, hoodU = hood?.u, hoodAB = hood ? spanA(seg0, hood.u, hood.w) : null;
    d.drop([hob, ...(hood ? [hood] : [])]);
    d.refillBase(seg0.id, h0, h1);
    if (hoodAB) d.refillUpper(seg0.id, ...hoodAB);
    const nh = clone(hobU), nd = hoodU ? clone(hoodU) : null;
    nh.id = A.uid(); if (nd) nd.id = A.uid();
    return putHob(d, ctx.chain, nh, nd, hob.w, seg0.id);
  },
};
/** where a hob of width w can go (plain base runs, 60 cm of counter from the sink — 30 when nothing else fits — never under a
 *  window, its hood clear of corners), best work triangle first; the first that really fits is used */
function putHob(d, chain, hobU, hoodU, w, skipWall = null) {
  const L = d.infos(), sink = L.find((x) => x.cls === "sink"), fr = L.find((x) => x.cls === "fridge");
  const at = (seg, a) => [seg.A[0] + seg.d[0] * a + seg.n[0] * 30, seg.A[1] + seg.d[1] * a + seg.n[1] * 30];
  const mid = (x) => { if (!x?.u.pos?.wall) return null; const g = d.segs.get(x.u.pos.wall), ab = spanA(g, x.u, x.w); return at(g, (ab[0] + ab[1]) / 2); };
  const S = mid(sink), F = mid(fr), D = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  for (const gap of [60, 30]) {
    const spots = [];
    for (const seg of chain) {
      if (seg.id === skipWall) continue;
      const bl = wallBlocks(d.room, seg), runs = [];
      for (const x of d.on(seg.id, ["lower"]).filter((q) => q.cls === "base").sort((p, q) => p.ab[0] - q.ab[0])) { const r = runs[runs.length - 1]; if (r && x.ab[0] <= r[1] + 1) r[1] = Math.max(r[1], x.ab[1]); else runs.push([x.ab[0], x.ab[1]]); }
      const sAB = sink && sink.u.pos.wall === seg.id ? spanA(seg, sink.u, sink.w) : null;
      for (const [lo, hi] of runs) for (let k = 0; k <= 8; k++) {
        const a = Math.round((lo + ((hi - w - lo) * k) / 8) * 2) / 2;
        if (a < lo - 0.5 || a + w > hi + 0.5) continue;
        if (bl.windows.some((o) => a < +o.at + +o.w && a + w > +o.at) || hits(a, a + w, bl.upper)) continue;
        if (sAB && (a >= sAB[1] ? a - sAB[1] : sAB[0] - a - w) < gap) continue;
        const H = at(seg, a + w / 2);
        let sc = 0;
        if (S && F) { const l = [D(H, S), D(H, F), D(F, S)], sum = l[0] + l[1] + l[2]; sc = Math.abs(sum - 550) + l.reduce((p, x) => p + (x < 120 ? (120 - x) * 2 : x > 270 ? (x - 270) * 2 : 0), 0); }
        else if (S) sc = Math.abs(D(H, S) - 150);
        spots.push({ seg, a, sc });
      }
    }
    spots.sort((p, q) => p.sc - q.sc);
    for (const sp of spots.slice(0, 10)) {
      const keep = d.units.map((u) => clone(u));
      const ok = d.placeBase(sp.seg.id, sp.a, w, hobU) && (!hoodU || (() => {
        const ups = d.on(sp.seg.id, ["upper"]).filter((x) => x.ab[0] < sp.a + w - 0.5 && x.ab[1] > sp.a + 0.5);
        if (!ups.every((x) => x.cls === "upper")) return false;
        const lo = Math.min(sp.a, ...ups.map((x) => x.ab[0])), hi = Math.max(sp.a + w, ...ups.map((x) => x.ab[1]));
        d.drop(ups);
        d.add(hoodU, sp.seg.id, sp.a, w);
        if (lo < sp.a - 0.5) d.refillUpper(sp.seg.id, lo, sp.a);
        if (hi > sp.a + w + 0.5) d.refillUpper(sp.seg.id, sp.a + w, hi);
        return true;
      })());
      if (ok) return true;
      d.units = keep;
    }
  }
  return false;
}
/** no fridge found an end (the auto kitchen wants 60 cm to spare): a 90 — else 70 — fridge cavity at the end of a base run,
 *  best work triangle first */
export function fixFridge(d) {
  const L = d.infos();
  if (L.some((x) => x.cls === "fridge")) return false;
  const tpl = d.tpl("base");
  if (!tpl) return false;
  const sink = L.find((x) => x.cls === "sink"), hob = L.find((x) => x.cls === "hob");
  const at = (seg, a) => [seg.A[0] + seg.d[0] * a + seg.n[0] * 30, seg.A[1] + seg.d[1] * a + seg.n[1] * 30];
  const mid = (x) => { if (!x?.u.pos?.wall) return null; const g = d.segs.get(x.u.pos.wall), ab = spanA(g, x.u, x.w); return at(g, (ab[0] + ab[1]) / 2); };
  const S = mid(sink), H = mid(hob), D = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const walls = [...d.segs.values()].filter((g) => d.units.some((u) => u.pos?.wall === g.id));
  for (const fw of [90, 70]) {
    const u = makeLike(tpl, { ...A.KU.KITCHEN.k_fridge.params, fridge_cavity_width: fw }, A.KU.KITCHEN.k_fridge.params.width, `تجويف تلاجة ${fw}`, "tall");
    u.params.fridge_cavity_width = fw;
    const r = A.R(u); if (!r.ok) continue;
    const b = A.localBox(r), w = b.x1 - b.x0;
    const spots = [];
    for (const seg of walls) {
      const runs = [];
      for (const x of d.on(seg.id, ["lower"]).filter((q) => q.cls === "base").sort((p, q) => p.ab[0] - q.ab[0])) { const rr = runs[runs.length - 1]; if (rr && x.ab[0] <= rr[1] + 1) rr[1] = Math.max(rr[1], x.ab[1]); else runs.push([x.ab[0], x.ab[1]]); }
      for (const [lo, hi] of runs) for (const a of [lo, hi - w]) {
        if (a < lo - 0.5 || a + w > hi + 0.5) continue;
        const F = at(seg, a + w / 2);
        let sc = 0;
        if (S && H) { const l = [D(H, S), D(H, F), D(F, S)], sum = l[0] + l[1] + l[2]; sc = Math.abs(sum - 550) + l.reduce((p, x) => p + (x < 120 ? (120 - x) * 2 : x > 270 ? (x - 270) * 2 : 0), 0); }
        spots.push({ seg, a, sc });
      }
    }
    spots.sort((p, q) => p.sc - q.sc);
    for (const sp of spots.slice(0, 8)) {
      const keep = d.units.map((x) => clone(x));
      const nu = clone(u); nu.id = A.uid();
      if (d.placeTall(sp.seg.id, sp.a, w, nu)) return true;
      d.units = keep;
    }
  }
  return false;
}
/** a finish tier whose 90 hob found no place gets a 60 one (+ its hood) where it fits best */
export function fixHob(d) {
  const L = d.infos();
  if (L.some((x) => x.cls === "hob")) return false;
  const tpl = d.tpl("base"), tplU = d.tpl("upper");
  if (!tpl) return false;
  const hob = makeLike(tpl, More.KITCHEN.k_hob90?.params || {}, 60, "وحدة بوتجاز 60", "base");
  hob.params.unit_label = "بوتجاز";
  let hood = null;
  if (tplU) {
    const kd = A.kdefNow?.() || { wallZ: 145, wallH: 80 };
    hood = makeLike(tplU, More.KITCHEN.k_wall_hood90?.params || P_WALL(), 60, "علوية شفاط 60", "upper");
    hood.params.wall_mount_height = 155; hood.params.height = Math.max(30, (+kd.wallZ || 145) + (+kd.wallH || 80) - 155);
  }
  return putHob(d, [...d.segs.values()].filter((g) => d.units.some((u) => u.pos?.wall === g.id)), hob, hood, 60);
}
// must-haves the owner ticks: added where they belong; a design that can't take one is dropped
const MUST = {
  dish(d) {
    if (d.infos().some((x) => x.cls === "dish")) return true;
    const L = d.infos(), sink = L.find((x) => x.cls === "sink");
    if (!sink) return false;
    const tpl = d.tpl("base");
    const u = makeLike(tpl, A.KU.KITCHEN.k_washer_gap.params, 60, "مكان غسالة أطباق 60", "base"); u.agDish = true;
    for (const a of d.besides(sink, 60)) if (d.placeBase(sink.u.pos.wall, a, 60, u)) return true;
    return false;
  },
  washer(d) {
    if (d.infos().some((x) => x.cls === "washer")) return true;
    const L = d.infos(), tpl = d.tpl("base");
    const u = makeLike(tpl, A.KU.KITCHEN.k_washer_gap.params, 60, "مكان غسالة 60", "base");
    const sink = L.find((x) => x.cls === "sink");
    const spots = sink ? d.besides(sink, 60).map((a) => [sink.u.pos.wall, a]) : [];
    // else the ends of the plain runs
    for (const x of L.filter((q) => q.cls === "base")) { const seg = d.segs.get(x.u.pos.wall), ab = spanA(seg, x.u, x.w); spots.push([seg.id, ab[0]], [seg.id, ab[1] - 60]); }
    for (const [wall, a] of spots) if (d.placeBase(wall, a, 60, u)) return true;
    return false;
  },
  oven(d) {
    if (d.infos().some((x) => x.cls === "oven")) return true;
    const L = d.infos(), fr = L.find((x) => x.cls === "fridge") || L.find((x) => x.row === "tall");
    if (!fr) return false;
    const u = makeLike(d.tpl("base"), More.KITCHEN.k_oven_only.params, 60, "عمود فرن", "tall");
    const r = A.R(u); const w = r.ok ? A.localBox(r).x1 - A.localBox(r).x0 : 60;
    for (const a of d.besides(fr, w)) if (d.placeTall(fr.u.pos.wall, a, w, u)) return true;
    return false;
  },
  pantry(d) {
    if (d.infos().some((x) => x.cls === "tall" && /تموين/.test(x.u.name))) return true;
    return EDITS.pantry(d);
  },
};

// ------------------------------------------------------------------ evaluation
const sigOf = (units) => units.map((u) => `${u.name}@${u.pos?.wall || "c"}:${u.pos?.s ?? Math.round(u.pos?.x || 0)}`).sort().join("|");
/** price per m² of a board when the owner has no prices yet (EGP, 2026 market, just to rank) */
function refRate(name, key) {
  const t = +(/(\d+) مم/.exec(key || "")?.[1] || 18);
  if (t <= 8) return 260;
  if (/أكريليك|acrylic/i.test(name)) return 2100;
  if (/قشرة|خشب|بلوط|جوز|veneer|oak|walnut/i.test(name)) return 1600;
  if (/HPL|اتش|إتش/i.test(name)) return 1050;
  return 900;
}
export function pricedByOwner() {
  const P = A.state.prices || {};
  return Object.values(P.sheets || {}).some((v) => +v > 0) || Object.values(P.m2 || {}).some((v) => +v > 0) || +P.defaultSheet > 0;
}
/** cost (owner prices when set, else a reference estimate), sheets, area — cheap (no cut plan) */
function costOf(units, tier) {
  const proj = { ...A.state.project, units: clone(units) };
  const { groups, outside } = A.cutGroups(proj);
  const o = A.cutOptsSafe();
  let area = 0, sheets = 0, sheetArea = 0, mat = 0;
  for (const g of groups) {
    const a = g.parts.reduce((s, x) => s + x.w * x.h, 0), gs = A.groupSheet(g);
    const n = Math.max(1, Math.ceil(a / (gs.w * gs.h * 0.8)));
    area += a; sheets += n; sheetArea += n * gs.w * gs.h;
    mat += (a / 10000) * 1.1 * refRate(g.name, g.key);
  }
  for (const pc of outside || []) mat += (((+pc.lb?.w || 0) * (+pc.lb?.h || 0)) / 10000) * 1400;
  let hw = 0, ctr = 0, n = 0;
  for (const u of units) {
    const x = info(u); if (!x) continue; n++;
    const p = x.p, d = +p.drawer_count || 0;
    hw += x.cls === "oven" ? 1600 : x.row === "tall" ? 1300 : x.cls.startsWith("corner") ? 1700 : x.row === "upper" ? 380 : p.door_type === "drawers" ? 300 + d * 480 : 650;
    if (x.row === "lower") ctr += x.cls === "corner" ? x.w + (x.box.y1 - x.box.y0) - 60 : x.w;
  }
  if (tier === "lux") hw *= 1.5;
  const lib = units.find((u) => u.libs?.countertop)?.libs.countertop || "";
  const ctrRate = /marble/.test(lib) ? 9500 : /quartz/.test(lib) ? 7200 : 5200;
  const margin = +(A.state.prices?.margin ?? 35);
  let total = (mat + hw + (ctr / 100) * ctrRate + n * 750) * (1 + margin / 100);
  let owner = false, partial = false;
  if (pricedByOwner()) { const q = A.quickEstimate(units); if (q.total > 0) { total = q.total; owner = true; partial = !q.priced; } }
  void o;
  return { total, sheets, area: area / 10000, wasteEst: sheetArea ? 1 - area / sheetArea : 0, owner, partial, units: n };
}
/** the work triangle between the door faces of the sink, hob and fridge (cm) */
function triangle(proj) {
  const poses = A.projectPoses(proj);
  const items = A.projectItems(proj).map((it) => ({ ...it, u: proj.units.find((x) => x.id === it.id), pose: poses.get(it.id) })).filter((x) => x.pose && x.u?.kind === "kitchen");
  const { sink, hob, fridge } = A.workSpots(items);
  const c = (it) => A.frontCenter(it);
  const D = (a, b) => Math.round(Math.hypot(c(a)[0] - c(b)[0], c(a)[1] - c(b)[1]));
  const tri = sink && hob && fridge ? { legs: [D(sink, hob), D(hob, fridge), D(fridge, sink)] } : null;
  if (tri) tri.sum = tri.legs.reduce((a, b) => a + b, 0);
  return { tri, poses, items };
}
function storage(units) {
  let base = 0, wall = 0, tall = 0;
  for (const u of units) {
    const x = info(u); if (!x) continue;
    if (["sink", "hob", "washer", "dish", "fridge"].includes(x.cls)) continue;
    if (x.row === "upper") wall += x.w * (x.u.agTop ? 0.6 : 1); else if (x.row === "tall") tall += x.w; else base += x.cls === "corner" ? x.w + 30 : x.w;
  }
  return { base, wall, tall, score: Math.round(base + wall * 0.8 + tall * 2.6) };
}
/** the room's services vs where the design put things: sink ↔ drain / water, hob ↔ gas, fridge ↔ its socket, washer ↔ its
 *  drain / feed. Far (> 1 m) = a note and a «miss» (the ranking takes points off) */
const SVC = [
  ["sink", ["drain", "cold", "hot", "floor_drain"], "الحوض", "الصرف / المية", 100],
  ["hob", ["gas"], "البوتجاز", "مخرج الغاز", 100],
  ["fridge", ["fridge"], "التلاجة", "بريزة التلاجة", 120],
  ["washer", ["washer_drain", "washer_cold", "washer"], "الغسالة", "صرف / تغذية الغسالة", 100],
];
function services(room, items) {
  const notes = [];
  let miss = 0;
  const yes = (v) => v === true || v === "true";
  const find = {
    sink: (it) => yes(it.u.params?.include_sink_cutout), hob: (it) => it.row !== "upper" && (it.u.params?.unit_label === "بوتجاز" || it.u.params?.unit_category === "cooker_gap"),
    fridge: (it) => it.u.params?.unit_category === "fridge", washer: (it) => it.u.params?.unit_category === "washer_gap" && !it.u.agDish,
  };
  for (const [k, kinds, what, pt, lim] of SVC) {
    const ps = (room.points || []).filter((p) => kinds.includes(p.kind));
    if (!ps.length) continue;
    const it = items.find(find[k]);
    if (!it) { if (k !== "washer") { notes.push(`مفيش ${what} في التصميم ده`); miss++; } continue; }
    const c = A.Room.centerOf(it.pose, it.box);
    const d = Math.min(...ps.map((p) => { const w = A.Room.pointWorld(room, p); return w ? Math.hypot(w.x - c[0], w.z - c[1]) : 1e9; }));
    if (d > lim) { notes.push(`${what} بعيد عن ${pt} ${Math.round(d)} سم — هتحتاج تمديد`); miss++; }
  }
  return { notes, miss };
}

const tick = () => new Promise((r) => setTimeout(r, 0));
/**
 * all the candidates for a room. input: {room, keep (other units kept in the project), must: {dish, washer, oven, pantry}, budget}
 * onProgress(done, total, text); cancelled() → stop early. Returns {cands, tried}.
 */
export async function generate(input, onProgress = () => {}, cancelled = () => false) {
  const { room, keep = [], must = {} } = input;
  const chains = wallChains(room);
  const byK = {};
  for (const ch of chains) {
    // walls that carry the water / gas first (the sink and the hob go on them)
    const svcW = new Set((room.points || []).filter((p) => ["drain", "cold", "hot", "floor_drain", "gas"].includes(p.kind)).map((p) => p.wall));
    const score = ch.reduce((s, g) => s + usable(room, g) + (svcW.has(g.id) ? 250 : 0), 0) + (ch.some((g) => wallBlocks(room, g).windows.length) ? 60 : 0);
    (byK[ch.length] ??= []).push({ ch, score });
  }
  // shape × the two best wall sets × tier; the fridge flipped to the other end for the middle tier
  const plan = [];
  for (const k of [1, 2, 3]) {
    const list = (byK[k] || []).sort((a, b) => b.score - a.score);
    // keep wall sets that are really different (an L on walls 1+2 vs 2+3), at most 2
    const pick = [];
    for (const c of list) { if (pick.length >= 2) break; if (!pick.some((p) => p.ch.map((g) => g.id).join() === c.ch.map((g) => g.id).join())) pick.push(c); }
    // the best walls in every tier; the second wall set and the flipped fridge in the middle tier only (each auto kitchen takes ~1 s)
    pick.forEach((c, ci) => { for (const tier of ci ? ["std"] : ["std", "eco", "lux"]) { plan.push({ k, ch: c.ch, ci, tier, flip: false }); if (tier === "std") plan.push({ k, ch: c.ch, ci, tier, flip: true }); } });
  }
  const bases = [], seen = new Set(), cands = [];
  let done = 0, tried = 0;
  const total = plan.length;
  // one candidate: the cheap numbers right away (the engine's cache is still warm for its units); the design check
  // (the slow part) runs later only for the ones that could make the final 5 — see checkErrors()
  const evaluate = (c) => {
    const proj = { ...A.state.project, room, units: [...keep, ...c.units] };
    const { tri, items } = triangle(proj);
    const hasFridge = items.some((it) => it.u.params?.unit_category === "fridge");
    if (c.tags.includes("flip") && !hasFridge) return; // the fridge didn't fit at the other end: nothing gained
    cands.push({ id: `c${cands.length + 1}`, k: c.k, ci: c.ci, tier: c.tier, walls: c.walls, tags: c.tags, units: c.units, errors: null, tri, cost: costOf(c.units, c.tier), storage: storage(c.units), ...(() => { const sv = services(room, items); return { notes: sv.notes, svc: sv.miss }; })(),
      hasFridge, hasHob: !!items.find((it) => it.u.params?.unit_label === "بوتجاز" || it.u.params?.unit_category === "cooker_gap") });
  };
  for (const job of plan) {
    if (cancelled()) break;
    onProgress(done, total, `${SHAPES[job.k]} · ${TIERS[job.tier]}${job.flip ? " · " + TAGS.flip : ""} — ${cands.length} تصميم لحد دلوقتي`);
    await tick();
    let rm = room;
    let units = null;
    try {
      if (job.flip) {
        const prev = bases.find((b) => b.k === job.k && b.ci === job.ci && b.tier === job.tier && !b.tags.includes("flip"));
        if (!prev) { done++; continue; }
        const d = new Draft(room, clone(prev.units));
        const fr = d.infos().find((x) => x.cls === "fridge");
        if (!fr) { done++; continue; }
        const seg = d.segs.get(fr.u.pos.wall), ab = spanA(seg, fr.u, fr.w), tl = d.on(seg.id, ["tall"]);
        // a 2 cm "window" high on the wall where the tall units stood: the auto kitchen can't use that end for them
        const at = ab[0] < seg.L / 2 ? Math.max(0, Math.min(...tl.map((x) => x.ab[0]))) + 10 : Math.min(seg.L, Math.max(...tl.map((x) => x.ab[1]))) - 12;
        rm = clone(room); rm.openings = [...(rm.openings || []), { id: "agfake", wall: seg.id, kind: "window", w: 2, h: 10, sill: Math.max(150, (seg.h || 280) - 30), at }];
      }
      units = A.autoKitchen(rm, job.ch, job.tier);
    } catch (err) { console.warn("autogen", err); }
    done++;
    if (!units) continue;
    const tags0 = job.flip ? ["flip"] : [];
    { const d = new Draft(room, units); try { if (fixHob(d)) { units = d.units; tags0.push("hob60"); } } catch (err) { console.warn("autogen hob60", err); } }
    if (job.flip && !new Draft(room, units).infos().some((x) => x.cls === "fridge")) continue; // the fridge didn't fit at the other end
    if (!job.flip) { const d = new Draft(room, units); try { if (fixFridge(d)) { units = d.units; tags0.push("fridge"); } } catch (err) { console.warn("autogen fridge", err); } }
    const sg = sigOf(units);
    if (seen.has(sg)) continue;
    seen.add(sg);
    const b = { k: job.k, ci: job.ci, tier: job.tier, ch: job.ch, walls: job.ch.map((g) => g.i + 1), units, tags: tags0 };
    bases.push(b);
    // the variations of this layout, then the must-haves
    const combos = [[], ["drawers"], ["ceil"], ["hob"], ["pantry"]];
    if (b.tier === "std") combos.push(["glass"]);
    if (b.tier !== "eco") combos.push(["nooven"]);
    if (b.tier === "lux") combos.push(["drawers", "ceil"]);
    for (const tags of combos) {
      if (cancelled()) break;
      const d = new Draft(room, clone(b.units));
      let ok = true;
      for (const t of tags) { try { if (!EDITS[t](d, { chain: b.ch })) ok = false; } catch (err) { console.warn("autogen edit", t, err); ok = false; } if (!ok) break; }
      if (!ok) continue;
      for (const [k, on] of Object.entries(must)) { if (!on) continue; try { if (!MUST[k](d)) ok = false; } catch (err) { console.warn("autogen must", k, err); ok = false; } if (!ok) break; }
      if (!ok) continue;
      const s2 = sigOf(d.units);
      if (seen.has(s2) && tags.length) continue;
      seen.add(s2);
      tried++;
      try { evaluate({ ...b, units: d.units, tags: [...b.tags, ...tags] }); } catch (err) { console.warn("autogen eval", err); }
      await tick();
    }
  }
  onProgress(total, total, "");
  return { cands, tried, bases: bases.length };
}
/** the design check (clashes, doors, windows, wall lengths…) of one candidate → the error texts (must be none) */
export function checkErrors(c, room, keep = []) {
  const proj = { ...A.state.project, room, units: [...keep, ...c.units] };
  return A.designChecks(proj).filter((x) => x.level === "e").map((e) => e.text);
}

/** a fast cut plan of the finalists (the cut worker, a short time cap): real sheets and waste */
export async function cutEval(c) {
  const proj = { ...A.state.project, units: clone(c.units) };
  const { groups } = A.cutGroups(proj);
  const o = A.cutOptsSafe();
  const gs = groups.map((g) => { const s = A.groupSheet(g); return { key: g.key, sheetW: s.w, sheetH: s.h, parts: g.parts }; });
  if (!gs.length) return { sheets: 0, waste: 0 };
  const out = await A.cutCall(gs, { kerf: +o.kerf, trim: +o.trim, timeCap: 0.15 });
  let sheets = 0, used = 0, avail = 0, over = 0;
  for (const x of out) {
    const g = gs.find((q) => q.key === x.key), r = x.result;
    const n = r?.stats?.sheets || 0;
    sheets += n; over += r?.oversized?.length || 0;
    avail += n * g.sheetW * g.sheetH;
    used += g.parts.reduce((s, p) => s + p.w * p.h, 0);
  }
  return { sheets, waste: avail ? Math.max(0, 1 - used / avail) : 0, over };
}
