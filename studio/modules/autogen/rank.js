// «🏠 5 تصميمات تلقائية» — the ranking. A PURE function of plain numbers (no app, no DOM) so a server can serve the same
// thing later: registry engine("autogenRank", localRank)(input).
// input: { budget, sort: "score" | "cost" | "move" | "waste", count, cands: [{ id, k, ci, tier, tags, cost, waste, sheets,
//          tri: {legs, sum} | null, storage, errors, hasHob, hasFridge, svc }] }
// output: { list: [{ id, score, sub: {cost, move, waste, storage}, over, overBy }], dropped: {errors, budget}, inBudget }
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
export const W = { cost: 0.3, move: 0.3, waste: 0.25, storage: 0.15 };

/** the work triangle: every leg 120–270 cm, the three together 400–790 (best near 550) */
export function moveScore(tri) {
  if (!tri || !tri.legs?.length) return 15;
  let pen = 0;
  for (const l of tri.legs) { if (l < 120) pen += (120 - l) * 0.5; if (l > 270) pen += (l - 270) * 0.4; }
  const s = tri.sum;
  if (s < 400) pen += (400 - s) * 0.3;
  if (s > 790) pen += (s - 790) * 0.3;
  pen += Math.abs(s - 550) * 0.04;
  return clamp(100 - pen);
}
export function localRank(input) {
  const { budget = 0, sort = "score", count = 5 } = input || {};
  const all = (input?.cands || []).filter((c) => c && c.hasHob);
  const ok = all.filter((c) => !c.errors);
  const dropped = { errors: all.length - ok.length, budget: 0 };
  let pool = ok, inBudget = true;
  if (budget > 0) {
    const within = ok.filter((c) => c.cost <= budget), near = ok.filter((c) => c.cost <= budget * 1.1);
    pool = within.length >= count ? within : near.length >= Math.min(count, ok.length) || near.length >= 3 ? near : ok;
    dropped.budget = ok.length - pool.length;
    inBudget = within.length > 0;
  }
  if (!pool.length) return { list: [], dropped, inBudget };
  const costs = pool.map((c) => c.cost), cMin = Math.min(...costs), cMax = Math.max(...costs);
  const stMax = Math.max(1, ...pool.map((c) => c.storage || 0));
  const scored = pool.map((c) => {
    const over = budget > 0 && c.cost > budget, overBy = over ? c.cost - budget : 0;
    const cost = budget > 0 && inBudget ? (over ? 70 - ((c.cost / budget) - 1) * 300 : 70 + 30 * (1 - c.cost / budget) + (cMax > cMin ? (10 * (cMax - c.cost)) / (cMax - cMin) : 0))
      : cMax > cMin ? 100 * (cMax - c.cost) / (cMax - cMin) * 0.8 + 20 : 100;
    const move = moveScore(c.tri);
    const waste = 100 - (c.waste || 0) * 100 * 2.5;
    const storage = (100 * (c.storage || 0)) / stMax;
    const sub = { cost: clamp(cost), move: clamp(move), waste: clamp(waste), storage: clamp(storage) };
    // a design that leaves the services far (sink away from the drain, hob away from the gas…) loses 10 per miss
    const score = clamp(W.cost * sub.cost + W.move * sub.move + W.waste * sub.waste + W.storage * sub.storage - (c.hasFridge ? 0 : 15) - 10 * (c.svc || 0));
    return { c, id: c.id, score, sub, over, overBy };
  });
  // diverse picks: first one per shape / wall set / tier, then other variations; never two that differ in nothing
  const sim = (a, b) => (a.k === b.k ? 2 : 0) + (a.ci === b.ci && a.k === b.k ? 1 : 0) + (a.tier === b.tier ? 2 : 0) + (a.tags.join() === b.tags.join() ? 1.5 : 0) + (a.tags.filter((t) => b.tags.includes(t)).length ? 0.5 : 0);
  const key = (x) => (sort === "cost" ? x.sub.cost : sort === "move" ? x.sub.move : sort === "waste" ? x.sub.waste : x.score);
  const picked = [];
  for (const strict of [true, false]) {
    while (picked.length < count) {
      let best = null, bv = -1e9;
      for (const x of scored) {
        if (picked.includes(x)) continue;
        const ms = picked.length ? Math.max(...picked.map((p) => sim(p.c, x.c))) : 0;
        if (strict && picked.some((p) => p.c.k === x.c.k && p.c.ci === x.c.ci && p.c.tier === x.c.tier)) continue;
        if (ms >= 6.5) continue;
        const v = x.score - ms * 4;
        if (v > bv) { bv = v; best = x; }
      }
      if (!best) break;
      picked.push(best);
    }
  }
  picked.sort((a, b) => key(b) - key(a) || b.score - a.score);
  return { list: picked.map(({ c, ...x }) => { void c; return x; }), dropped, inBudget };
}
