// «📷 صورة ← مطبخ» — marks → spec → the app's own kitchen units (library presets, NOVERA defaults, the
// owner's materials), placed on a room's walls. Nothing here touches the project: make() returns
// { room, units, plan } and the caller decides where they go (a new variant / a new project).
import * as G from "./geom.js";
import { LOWER, UPPER, TALL } from "./spec.js";

// ------------------------------------------------------------------ marks (what was tapped) → spec
/** the real length of each wall's run: typed › AI's guess › estimated from the 90 cm counter (scaled by a typed wall when there is one) */
export function lengths(M) {
  const f = focal(M);
  const est = M.walls.map((w) => (G.quadOk(w.q) ? G.estimateLength(w.q, M.img.w, M.img.h, 90, f)?.len || null : null));
  const ref = M.walls.map((w, i) => (w.len > 0 && est[i] ? w.len / est[i] : null)).filter(Boolean);
  const corr = ref.length ? ref.reduce((a, b) => a + b, 0) / ref.length : 1;
  return M.walls.map((w, i) => {
    if (w.len > 0) return { len: +w.len, why: "typed", est: est[i] };
    if (w.lenAI > 0) return { len: +w.lenAI, why: "ai", est: est[i] };
    if (est[i]) return { len: Math.round(est[i] * corr), why: ref.length ? "scaled" : "est", est: est[i] };
    return { len: 300, why: "none", est: null };
  });
}
/** the camera's focal length from walls at right angles (L / U), else null (each wall guesses its own) */
export function focal(M) { return M.walls.length > 1 ? G.focalFromWalls(M.walls.map((w) => w.q), M.img.w, M.img.h) : null; }
const bounds = (cuts) => [0, ...[...cuts].sort((a, b) => a - b), 1];
/** the lower row's segments [a, b] (0…1) and the upper row's (between its own cut points) */
export function segsOf(w) {
  const lb = bounds(w.lower.cuts);
  const lower = lb.slice(0, -1).map((a, k) => ({ a, b: lb[k + 1], ...(w.lower.segs[k] || { t: "doors", man: false }) }));
  const uc = [...w.upper.cuts].sort((a, b) => a - b);
  const upper = uc.slice(0, -1).map((a, k) => ({ a, b: uc[k + 1], ...(w.upper.segs[k] || { t: "doors", man: false }) }));
  return { lower, upper };
}
/** types for the segments the owner hasn't picked by hand: corner at a shared end, fridge at the open end, sink near the
 *  middle of the longest wall, hob away from it, drawers beside the hob, the hood over the hob, doors for the rest */
export function autoTypes(M) {
  const L = lengths(M).map((x) => x.len), n = M.walls.length;
  const all = M.walls.map((w, i) => ({ i, ...segsOf(w) }));
  const lowers = [];
  all.forEach((W, i) => W.lower.forEach((s, k) => lowers.push({ i, k, s, w: (s.b - s.a) * L[i], mid: (s.a + s.b) / 2, last: k === W.lower.length - 1 })));
  const setL = (x, t) => { if (!x.s.man) x.s.t = t; };
  // once the owner has picked any type himself, nothing is moved around behind his back: what is shown stays
  const touched = lowers.some((x) => x.s.man) || all.some((W) => W.upper.some((s) => s.man));
  if (!touched) for (const x of lowers) if (!x.s.man) x.s.t = "doors";
  for (const x of lowers) if ((x.i > 0 && x.k === 0) || (x.i < n - 1 && x.last)) setL(x, "corner");
  const free = () => (touched ? [] : lowers.filter((x) => !x.s.man && x.s.t === "doors"));
  const ends = free().filter((x) => (x.i === 0 && x.k === 0) || (x.i === n - 1 && x.last));
  const fr = ends.find((x) => x.w >= 70 && x.w <= 100 && lowers.length > 3);
  if (fr && !lowers.some((x) => x.s.man && x.s.t === "fridge")) setL(fr, "fridge");
  const longest = L.indexOf(Math.max(...L));
  // cm along all the runs one after the other (good enough to keep the hob a step away from the sink)
  const at = (x) => L.slice(0, x.i).reduce((a, b) => a + b, 0) + x.mid * L[x.i];
  if (!lowers.some((x) => x.s.t === "sink")) {
    const c = free().filter((x) => x.w >= 70 && x.w <= 110).sort((a, b) => (a.i !== longest) - (b.i !== longest) || Math.abs(a.w - 80) / 20 + Math.abs(a.mid - 0.5) - (Math.abs(b.w - 80) / 20 + Math.abs(b.mid - 0.5)))[0];
    if (c) setL(c, "sink");
  }
  const sink = lowers.find((x) => x.s.t === "sink");
  if (!lowers.some((x) => x.s.t === "hob")) {
    const score = (x) => Math.min(Math.abs(x.w - 90), Math.abs(x.w - 60) + 5) / 30 + (sink ? Math.abs(Math.abs(at(x) - at(sink)) - 130) / 100 : Math.abs(x.mid - 0.6));
    const c = free().filter((x) => x.w >= 55 && x.w <= 100 && (!sink || Math.abs(at(x) - at(sink)) >= (x.w + sink.w) / 2 + 30)).sort((a, b) => score(a) - score(b))[0];
    if (c) setL(c, "hob");
  }
  const hob = lowers.find((x) => x.s.t === "hob");
  if (hob) for (const x of free()) if (x.i === hob.i && Math.abs(x.k - hob.k) === 1 && x.w >= 30) { setL(x, "drawers"); break; }
  all.forEach((W, i) => {
    W.upper.forEach((s) => {
      if (s.man || (touched && s.t !== "doors")) return;
      const m = (s.a + s.b) / 2;
      s.t = hob && hob.i === i && m > hob.s.a && m < hob.s.b ? "hood" : "doors";
    });
  });
  // write back (segsOf made copies)
  all.forEach((W, i) => {
    M.walls[i].lower.segs = W.lower.map(({ t, man }) => ({ t, man: !!man }));
    M.walls[i].upper.segs = W.upper.map(({ t, man }) => ({ t, man: !!man }));
  });
}
export function marksToSpec(M) {
  const Ls = lengths(M);
  return {
    v: 1, src: M.src || "manual", shape: M.walls.length, handle: M.handle || "bar",
    libs: { front: M.colors.front?.lib || null, upper: M.colors.upper?.lib || null, carcass: M.colors.carcass?.lib || null, counter: M.colors.counter?.lib || null },
    colors: Object.fromEntries(Object.entries(M.colors).filter(([, v]) => v?.hex).map(([k, v]) => [k, v.hex])),
    walls: M.walls.map((w, i) => {
      const L = Ls[i].len, S = segsOf(w);
      return {
        len: L, lenWhy: Ls[i].why,
        lower: S.lower.map((s) => ({ t: s.t, w: Math.round((s.b - s.a) * L * 10) / 10 })),
        upper: S.upper.filter((s) => s.t !== "gap").map((s) => ({ t: s.t, x: Math.round(s.a * L * 10) / 10, w: Math.round((s.b - s.a) * L * 10) / 10 })),
      };
    }),
  };
}

// ------------------------------------------------------------------ spec → units
/** walls of a room that meet at right angles, as chains of 1–3 (like the app's auto kitchen) */
export function wallChains(Room, room) {
  const segs = Room.segments(room).filter((s) => s.L >= 100);
  const meets = (a, b) => Math.hypot(a.B[0] - b.A[0], a.B[1] - b.A[1]) < 1 && Math.abs(a.d[0] * b.d[0] + a.d[1] * b.d[1]) < 0.2 && a.n[0] * b.d[0] + a.n[1] * b.d[1] > 0.5;
  const out = [];
  for (const s of segs) {
    out.push([s]);
    const b = segs.find((x) => x !== s && meets(s, x));
    if (b) { out.push([s, b]); const c = segs.find((x) => x !== s && x !== b && meets(b, x)); if (c) out.push([s, b, c]); }
  }
  return out;
}
/** a room made from the run lengths: I = the back wall, L = left + back, U = left + back + right */
export function roomFor(Room, spec) {
  const L = spec.walls.map((w) => Math.max(100, Math.round(w.len)));
  const n = L.length;
  // the runs are the units' length: a 3 cm filler is left where a run meets a side wall (like ✨ صمملي المطبخ)
  const W = n === 1 ? L[0] + 6 : n === 2 ? L[1] + 3 : L[1];
  const D = Math.max(300, n >= 2 ? L[0] + 3 : 0, n === 3 ? L[2] + 3 : 0);
  const room = Room.presetRoom("rect", { w: W, d: D, h: Room.WALL_H });
  const segs = Room.segments(room); // 0 back (0,0)→(W,0) · 1 right · 2 front · 3 left
  const chain = n === 1 ? [segs[0]] : n === 2 ? [segs[3], segs[0]] : [segs[3], segs[0], segs[1]];
  return { room, chain };
}

export function makeBuilder(api) {
  const { Catalog, KU, libUnit, R, localBox, Room } = api;
  const wallTop = () => { const k = api.kdefNow?.() || {}; return (+k.wallZ || 145) + (+k.wallH || 80); };
  /** one kitchen unit of a type at a width (the library preset, then NOVERA's defaults through libUnit) */
  function unit(t, w, row) {
    const W = Math.round(w * 10) / 10;
    let id, over = { width: W }, name;
    if (row === "upper") {
      if (t === "glass") { id = "k_wall2"; over.door_type = W >= 50 ? "double_glass" : "single_glass"; name = `علوية زجاج ${W}`; }
      else if (t === "open") { id = "k_wall_open60"; name = `رفوف مفتوحة علوية ${W}`; }
      else if (t === "flip") { id = "k_wall2"; over.door_type = W > 90 ? "flip_up_double" : "flip_up"; name = `علوية قلاب ${W}`; }
      else if (t === "hood") { id = "k_wall_hood90"; over.wall_mount_height = 155; name = `علوية شفاط ${W}`; }
      else if (W >= 50) { id = "k_wall2"; name = `علوية ${W}`; }
      else { id = "k_wall1_40"; name = `علوية ضلفة ${W}`; }
    } else if (t === "sink") { id = "k_sink"; over.unit_label = "حوض"; if (W >= 100) over.sink_cutout_width = 86; name = `وحدة حوض ${W}`; }
    else if (t === "hob") { id = "k_hob90"; over.unit_label = "بوتجاز"; name = `وحدة بوتجاز ${W}`; }
    else if (t === "drawers") { id = "k_base_drawers"; name = `أدراج ${W}`; }
    else if (t === "oven") { id = "k_oven_under"; name = `فرن تحت الرخامة ${W}`; }
    else if (t === "dish") { id = "k_washer_gap"; name = `مكان غسالة أطباق ${W}`; }
    else if (t === "open") { id = "k_base_open30"; name = `رفوف مفتوحة ${W}`; }
    else if (t === "glass") { id = "k_base2"; over.door_type = W >= 50 ? "double_glass" : "single_glass"; name = `سفلية زجاج ${W}`; }
    else if (t === "fridge") { id = "k_fridge"; over = { fridge_cavity_width: Math.round((W - 3.6) * 10) / 10 }; name = `تجويف تلاجة ${W}`; }
    else if (t === "toven") { id = "k_oven_only"; name = `عمود فرن ${W}`; }
    else if (t === "pantry") { id = W >= 50 ? "k_pantry60" : "k_pantry40"; name = `دولاب تموين ${W}`; }
    else if (W >= 50) { id = "k_base2"; name = `سفلية ضلفتين ${W}`; }
    else { id = "k_base1_45"; name = `سفلية ضلفة ${W}`; }
    if (!KU.KITCHEN[id]) id = row === "upper" ? "k_wall2" : "k_base2";
    const u = libUnit({ kitchen: id }, over);
    u.name = name;
    if (t === "hood") u.params.height = Math.max(30, wallTop() - 155); // its top on the wall units' line (like ✨ صمملي المطبخ)
    u.fromPhoto = t; // the type it was marked as in the photo (kept on the unit; the engines ignore it)
    return u;
  }
  /** fronts / carcass / counter / handle on one unit — the same way the auto-kitchen tiers do it */
  function finish(u, spec) {
    const p = u.params, up = p.unit_type === "wall";
    if (spec.handle) p.kud_handles = { type: spec.handle };
    const L = { front: (up && spec.libs.upper) || spec.libs.front, carcass: spec.libs.carcass, ...(!up && p.unit_type !== "tall" ? { countertop: spec.libs.counter } : {}) };
    for (const [k, lib] of Object.entries(L)) {
      if (!lib || !KU.K_MATS[k] || !Catalog.LIB[lib]) continue;
      u.libs[k] = lib;
      p[KU.K_MATS[k][1]] = Catalog.libName(lib);
      if (k === "front") p.door_color = Catalog.LIB[lib][2];
    }
    return u;
  }
  const boxOf = (u) => localBox(R(u));
  /**
   * place the spec on a chain of walls. ctx = { room, chain, fresh } (fresh = a room made for it).
   * Returns { units, plan: [{ wall, len, lower:[{t,w,s}], upper:[…], left }] , notes }
   */
  function make(spec, ctx) {
    const { room, chain } = ctx;
    const n = Math.min(chain.length, spec.walls.length);
    const notes = [];
    const units = [];
    const cornerB = finish(Object.assign(libUnit({ kitchen: "k_corner_l" }), { name: "زاوية L سفلية" }), spec);
    const cornerU = finish(Object.assign(libUnit({ kitchen: "k_corner_l_wall" }), { name: "زاوية L علوية" }), spec);
    const cbB = boxOf(cornerB), cbU = boxOf(cornerU);
    const runs = [];
    for (let i = 0; i < n; i++) {
      const seg = chain[i], W = spec.walls[i];
      const len = Math.min(seg.L - (ctx.fresh && n === 1 ? 6 : 0), Math.max(60, +W.len || seg.L));
      if (W.len > seg.L + 1) notes.push(`حيطة ${i + 1}: الصف (${Math.round(W.len)}) أطول من الحيطة (${Math.round(seg.L)}) — اتصغّر عليها`);
      // anchored at its corner(s); a lone run starts at the wall's left end (centred when it is shorter than the wall in a room he drew)
      const offset = i < n - 1 ? seg.L - len : i > 0 ? 0 : Math.max(0, (seg.L - len) / 2);
      const atWallEnd0 = offset < 1, atWallEnd1 = offset + len > seg.L - 1;
      const closed = !!room.closed;
      const lo = i > 0 ? cbB.y1 : atWallEnd0 && closed ? 3 : 0;
      const hi = len - (i < n - 1 ? cbB.x1 : atWallEnd1 && closed ? 3 : 0);
      runs.push({ i, seg, W, len, offset, lo, hi, cornU0: false, cornU1: false });
    }
    // corners: a base corner in every shared corner; a wall corner when both walls have wall units reaching it
    for (let i = 0; i < n - 1; i++) {
      const a = runs[i], b = runs[i + 1];
      const pose = Room.poseInCorner(a.seg, b.seg);
      const c = api.clone(cornerB); c.id = api.uid(); c.pos = { x: pose.x, z: pose.z, rot: pose.rot }; units.push(c);
      const reachA = a.W.upper.some((x) => x.x + x.w > a.len - cbU.x1 - 40), reachB = b.W.upper.some((x) => x.x < cbU.y1 + 40);
      if (reachA && reachB) { const cu = api.clone(cornerU); cu.id = api.uid(); cu.pos = { x: pose.x, z: pose.z, rot: pose.rot }; units.push(cu); a.cornU1 = b.cornU0 = true; }
    }
    const plan = [];
    for (const r of runs) {
      const lastK = r.W.lower.length - 1;
      const lowerIn = r.W.lower.filter((x, k) => !(x.t === "corner" && ((k === 0 && r.i > 0) || (k === lastK && r.i < n - 1)))); // the shared corner is built once, below
      // a «corner» marked on a straight run is a plain unit
      const fit = G.fitRow(lowerIn.map((x) => ({ t: x.t === "corner" ? "doors" : x.t, w: x.w })), r.hi - r.lo);
      if (fit.left >= 5) notes.push(`حيطة ${r.i + 1}: فاضل ${Math.round(fit.left)} سم في آخر الصف`);
      const P = { wall: r.i + 1, len: r.len, lower: [], upper: [], left: fit.left, lenWhy: r.W.lenWhy };
      let a = r.lo;
      const joints = [a];
      let hob = null;
      for (const x of fit.items) {
        const u = finish(unit(x.t, x.w, "lower"), spec);
        const bx = boxOf(u), bw = bx.x1 - bx.x0;
        u.pos = { wall: r.seg.id, s: Math.round((r.offset + a) * 10) / 10 };
        units.push(u);
        P.lower.push({ t: x.t, w: Math.round(bw * 10) / 10, s: a, name: u.name, tall: TALL.has(x.t) });
        if (x.t === "hob") hob = { a, b: a + bw };
        a += bw; joints.push(a);
      }
      // upper: x scaled like the lower row, edges snapped to the base joints (within 8 cm) or to 5 cm, overlaps pushed along
      const k = r.W.len > 0 ? r.len / r.W.len : 1; // the photo's run → the run on the wall
      const snapX = (x) => { const j = joints.reduce((p, q) => (Math.abs(q - x) < Math.abs(p - x) ? q : p), joints[0]); return Math.abs(j - x) <= 8 ? j : Math.round(x / 5) * 5; };
      const loU = r.cornU0 ? cbU.y1 : r.i > 0 ? 0 : r.lo, hiU = r.cornU1 ? r.len - cbU.x1 : r.i < n - 1 ? r.len : r.hi;
      let prev = loU;
      const ups = [...r.W.upper].sort((p, q) => p.x - q.x);
      for (const x of ups) {
        let x0 = snapX(x.x * k), x1 = snapX((x.x + x.w) * k);
        if (x.t === "hood" && hob && Math.abs((x0 + x1) / 2 - (hob.a + hob.b) / 2) < 45) { x0 = hob.a; x1 = hob.b; } // over its hob
        if (x0 - prev < 6 && x0 - prev > -40) x0 = Math.max(x0, prev); // closes slivers and overlaps
        x0 = Math.max(x0, prev, loU); x1 = Math.min(x1, hiU);
        if (x1 - x0 < 15) continue;
        // wide stretches become several units (≤ 90), hood / open keep their width
        const parts = x.t === "hood" ? [x1 - x0] : G.fitRow([{ t: x.t === "glass" ? "glass" : x.t === "open" ? "open" : "doors", w: x1 - x0 }], x1 - x0, { maxW: 100 }).items.map((y) => y.w);
        let xa = x0;
        for (const w of parts) {
          if (w < 15) continue;
          const u = finish(unit(x.t, w, "upper"), spec);
          const bw = boxOf(u).x1 - boxOf(u).x0;
          u.pos = { wall: r.seg.id, s: Math.round((r.offset + xa) * 10) / 10 };
          units.push(u);
          P.upper.push({ t: x.t, w: Math.round(bw * 10) / 10, s: xa, name: u.name });
          xa += bw;
        }
        prev = xa;
      }
      plan.push(P);
    }
    return { units, plan, notes };
  }
  return { unit, finish, make };
}
export const typeLabel = (t, row) => (row === "upper" ? UPPER[t] : LOWER[t]) || t;
