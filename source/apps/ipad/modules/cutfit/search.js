// «🎯 التصميم الواعي بالقص» — the search. Pure: plain data in (units, the moves that keep every wall run's length,
// options), a score per set of edits from `evaluate` (the app's real cut pipeline, or a server's), the best set out.
//
// A state is a map key → value in whole mm:
//   "b:<i>"        boundary i between units on one wall (the left units +v, the right units −v → every run keeps its length)
//   "s:<uid>:<dim>" one unit alone (a free unit's width, or a height / depth that no run depends on)
//   "t:<i>:<dim>"  a set of identical units (input.twins[i]) all changed the same way (four equal bookcases: one change for all)
//   "k:<row>:<dim>" every kitchen unit of one row (input.krows[row]) — a kitchen's heights / depth only change for the whole row
//   "d:<uid>:<i>"  drawer i (1-based, not the top one) of a kitchen unit +v — the top drawer takes the difference, the unit keeps its height
// edits = what that means for every unit: { [uid]: { width, height, depth, drw: [mm per drawer i = 1..n-1] } }

/** the edits a state stands for */
export function editsOf(input, state) {
  const E = {};
  const at = (uid) => (E[uid] ??= { width: 0, height: 0, depth: 0, drw: null });
  for (const [k, v] of Object.entries(state)) {
    if (!v) continue;
    if (k.startsWith("b:")) {
      const b = input.boundaries[+k.slice(2)];
      if (!b) continue;
      for (const id of b.left) at(id).width += v;
      for (const id of b.right) at(id).width -= v;
    } else if (k.startsWith("k:")) {
      const [, row, dim] = k.split(":");
      for (const id of input.krows?.[row] || []) at(id)[dim] += v;
    } else if (k.startsWith("t:")) {
      const [, i, dim] = k.split(":");
      for (const id of input.twins?.[+i] || []) at(id)[dim] += v;
    } else if (k.startsWith("s:")) {
      const [, uid, dim] = k.split(":");
      at(uid)[dim] += v;
    } else if (k.startsWith("d:")) {
      const [, uid, i] = k.split(":");
      const u = input.units.find((x) => x.id === uid);
      const e = at(uid);
      e.drw ??= new Array(Math.max(0, (u?.drawers?.n || 1) - 1)).fill(0);
      e.drw[+i - 1] += v;
    }
  }
  for (const [uid, e] of Object.entries(E)) if (!e.width && !e.height && !e.depth && !(e.drw || []).some(Boolean)) delete E[uid];
  return E;
}

/** every edit inside the tolerance, nothing on a locked dimension, kitchen-wall columns move as one */
export function fits(input, edits) {
  const tol = input.options.tol;
  const byId = new Map(input.units.map((u) => [u.id, u]));
  for (const [uid, e] of Object.entries(edits)) {
    const u = byId.get(uid);
    if (!u) return false;
    for (const d of ["width", "height", "depth"]) {
      if (!e[d]) continue;
      if (Math.abs(e[d]) > tol || !u.free?.[d]) return false;
    }
    if (e.drw) {
      if (!u.free?.drawers || !u.drawers) return false;
      const sum = e.drw.reduce((a, x) => a + x, 0);
      if (Math.abs(sum) > tol || e.drw.some((x) => Math.abs(x) > tol)) return false;
      // no drawer below 10 cm
      const H = u.drawers.H;
      for (let i = 0; i < H.length; i++) { const h = H[i] * 10 + (i < H.length - 1 ? e.drw[i] || 0 : -sum); if (h < 100) return false; }
    }
  }
  // units made together on one composed kitchen wall column keep the same width
  const cols = new Map();
  for (const u of input.units) if (u.kwCol) (cols.get(u.kwCol) || cols.set(u.kwCol, []).get(u.kwCol)).push(u.id);
  for (const ids of cols.values()) {
    const ws = new Set(ids.map((id) => edits[id]?.width || 0));
    if (ws.size > 1) return false;
  }
  return true;
}

/** every key and the values it may take */
export function moveKeys(input) {
  const tol = Math.max(0, Math.round(input.options.tol));
  const keys = [];
  const vals = [];
  for (let v = 1; v <= tol; v++) vals.push(-v, v);
  input.boundaries.forEach((b, i) => keys.push({ key: `b:${i}`, vals, kind: "b" }));
  const byId = new Map(input.units.map((u) => [u.id, u]));
  // a kitchen unit standing in a run keeps the run's lines: its height / depth only change with the whole row ("k:")
  const ok = (u, d) => u?.free?.[d] && (d === "width" ? u.alone : !u.krow);
  (input.twins || []).forEach((ids, i) => {
    for (const d of ["width", "height", "depth"]) if (ids.every((id) => ok(byId.get(id), d))) keys.push({ key: `t:${i}:${d}`, vals, kind: "t" });
  });
  for (const [row, ids] of Object.entries(input.krows || {})) for (const d of ["height", "depth"]) if (ids.length && ids.every((id) => byId.get(id)?.free?.[d])) keys.push({ key: `k:${row}:${d}`, vals, kind: "k" });
  for (const u of input.units) {
    for (const d of ["width", "height", "depth"]) if (ok(u, d)) keys.push({ key: `s:${u.id}:${d}`, vals, kind: "s" });
    if (u.free?.drawers && u.drawers) for (let i = 1; i < u.drawers.n; i++) keys.push({ key: `d:${u.id}:${i}`, vals, kind: "d" });
  }
  return keys;
}

const EPS = 50; // cm² — less than this is not a difference
// sheets are compared by their area (a group may move to another sheet size when a piece gets shorter), then the scrap
const sheetsOf = (s) => (Number.isFinite(s.area) ? Math.round(s.area) : s.sheets);
/** a is better than b: fewer sheets, then less scrap (the area no one can use again) */
export function better(a, b) {
  if (!a?.ok) return false;
  if (!b?.ok) return true;
  if (sheetsOf(a) !== sheetsOf(b)) return sheetsOf(a) < sheetsOf(b);
  return a.scrap < b.scrap - EPS;
}
const notWorse = (a, b) => a?.ok && b?.ok && sheetsOf(a) <= sheetsOf(b) && a.scrap <= b.scrap + EPS;
const size = (st) => Object.values(st).reduce((a, v) => a + (v ? 1 : 0), 0);
const clean = (st) => Object.fromEntries(Object.entries(st).filter(([, v]) => v));
const sig = (st) => JSON.stringify(Object.entries(clean(st)).sort((a, b) => (a[0] < b[0] ? -1 : 1)));

/** a small seeded random (the same project gives the same search) */
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * search(input, evaluate, hooks) → { base, best, state, tried, timedOut, stopped }
 *   evaluate(edits) → Promise<{ ok, sheets, scrap, … }>
 *   hooks: { onProgress({tried, frac, best, base, phase}), stopped() → bool, now() → ms }
 */
export async function search(input, evaluate, hooks = {}) {
  const now = hooks.now || (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));
  const t0 = now(), budget = +input.options.budgetMs || 30000;
  const left = () => budget - (now() - t0);
  const stop = () => left() <= 0 || !!hooks.stopped?.();
  const memo = new Map();
  let tried = 0;
  const score = async (st) => {
    const k = sig(st);
    if (memo.has(k)) return memo.get(k);
    const e = editsOf(input, st);
    const s = fits(input, e) ? await evaluate(e) : { ok: false, why: "fit" };
    tried++;
    memo.set(k, s);
    return s;
  };
  const base = await score({});
  const prog = (phase, best) => hooks.onProgress?.({ tried, frac: Math.min(1, (now() - t0) / budget), best, base, phase });
  if (!base?.ok) return { base, best: base, state: {}, tried, timedOut: false, stopped: false };
  let state = {}, best = base;
  const keys = moveKeys(input);
  const R = rng(input.units.length * 7919 + keys.length * 31 + Math.round(input.options.tol * 101));
  // phase 1: every single move from the design as it is — which ones help at all
  const single = [];
  const order = keys.flatMap((k) => k.vals.map((v) => ({ key: k.key, v })));
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  // the biggest steps first (shrinking a piece by the whole tolerance is the likeliest to let a sheet go)
  order.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  for (const m of order) {
    if (stop()) break;
    const s = await score({ [m.key]: m.v });
    if (s.ok) single.push({ ...m, s });
    if (better(s, best)) { best = s; state = { [m.key]: m.v }; }
    if (tried % 4 === 0) prog("screen", best);
  }
  // phase 2: put the helpful ones together, best first (one value per key)
  single.sort((a, b) => (better(a.s, b.s) ? -1 : better(b.s, a.s) ? 1 : 0));
  for (const m of single) {
    if (stop()) break;
    if (!better(m.s, base) && !notWorse(m.s, base)) continue;
    if (state[m.key] === m.v) continue;
    const st = { ...state, [m.key]: m.v };
    const s = await score(st);
    if (better(s, best)) { best = s; state = st; }
    prog("combine", best);
  }
  // phase 3: random walks around the best state while time is left
  let still = 0;
  while (!stop() && order.length && still < order.length * 2) {
    const m = order[Math.floor(R() * order.length)];
    const st = clean({ ...state, [m.key]: R() < 0.15 ? 0 : m.v });
    if (sig(st) === sig(state)) { still++; continue; }
    const s = await score(st);
    if (better(s, best)) { best = s; state = st; still = 0; } else still++;
    if (tried % 3 === 0) prog("walk", best);
  }
  // phase 4: fewest / smallest edits — drop or shrink any move the result doesn't need (this runs even after a stop)
  let changed = true;
  const hard = () => now() - t0 > budget * 1.3 + 4000;
  while (changed && size(state) && !hard()) {
    changed = false;
    const ks = Object.keys(state).sort((a, b) => Math.abs(state[a]) - Math.abs(state[b]));
    for (const k of ks) {
      if (hard()) break;
      const st = clean({ ...state, [k]: 0 });
      const s = await score(st);
      if (notWorse(s, best)) { state = st; best = s; changed = true; break; }
      const half = Math.trunc(state[k] / 2);
      if (half && half !== state[k]) {
        const st2 = { ...state, [k]: half };
        const s2 = await score(st2);
        if (notWorse(s2, best)) { state = st2; best = s2; changed = true; break; }
      }
    }
    prog("prune", best);
  }
  return { base, best, state: clean(state), tried, timedOut: left() <= 0, stopped: !!hooks.stopped?.() };
}
