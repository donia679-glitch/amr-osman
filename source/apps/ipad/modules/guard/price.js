// NOVERA Studio — module «guard» (v126): the quote math as ONE pure function (no DOM, no app state).
// Same rules as app.js quoteCalc() (v97 "by area"): every piece's area × its board's m² price (+ waste %),
// + countertops / supplier pieces, + banding, + hardware, + labour per unit / per m², + transport + install
// (shared by area), × (1 + margin %). The same file runs on the device (fallback) and on the server
// (server/guard/sync.mjs copies it) — so the numbers are identical on both sides.
//
// input (plain JSON, built on the device by input.js → priceInput(api)):
// { P: {waste, margin, band, laborUnit, laborM2, install, transport, ctr, out:{name: price/m²}, hw:{name: price}},
//   qcut: bool,                                   // a quick cut list: no labour per unit
//   groups: [{key, name, color, slots, m2: price per m² of that board, sheet:{w,h}, parts:[{w, h, kind, unit}]}],
//   units:  [{id, banding, area, hw:{canonical name: qty}, ctrM}],   // only the units that built (R(u).ok)
//   outside:[{name, a (m²), unit}],               // glass / mirror / stone … bought from a supplier
//   sheets: [{w, h, used}] }                      // every cut sheet + the area inside its pieces (for the waste %)
// output: {lines, mat, band, hwT, labor, fixed, cost, total, perUnit:[{id, price, cost, area}], area, waste, byArea: true}

const r2 = (v) => Math.round(v * 100) / 100;
const num = (v) => +v || 0;

export function priceQuote(inp) {
  if (!inp || typeof inp !== "object") throw new Error("price: no input");
  const P = inp.P || {};
  const wf = 1 + num(P.waste) / 100;
  const roleOf = (kind) => (kind === "front" ? "front" : kind === "back" ? "back" : kind === "box" ? "box" : "body");
  const lines = [];
  let mat = 0;
  const unitMat = new Map();
  for (const g of inp.groups || []) {
    const pm = num(g.m2);
    let a = 0;
    const roles = {};
    for (const p of g.parts || []) {
      const pa = (num(p.w) * num(p.h)) / 10000;
      a += pa;
      const rk = roleOf(p.kind); roles[rk] = (roles[rk] || 0) + pa;
      if (p.unit) unitMat.set(p.unit, (unitMat.get(p.unit) || 0) + pa * wf * pm);
    }
    const q = Math.round(a * wf * 100) / 100;
    lines.push({ k: "m2", key: g.key, slots: g.slots, name: g.name, color: g.color, roles, area: a, sheet: g.sheet, label: `${g.key} (${Math.round(a * 10) / 10} م² + ${num(P.waste)}% هالك)`, qty: q, unit: "م²", price: Math.round(pm), total: a * wf * pm });
    mat += a * wf * pm;
  }
  const units = inp.units || [];
  let bandM = 0, area = 0;
  for (const u of units) { bandM += num(u.banding); area += num(u.area); }
  const band = bandM * num(P.band);
  lines.push({ k: "band", label: "شريط حواف", qty: Math.round(bandM * 10) / 10, unit: "م", price: num(P.band), total: band });
  const unitOut = new Map(), addU = (id, v) => id && unitOut.set(id, (unitOut.get(id) || 0) + v);
  const outBy = new Map();
  for (const pc of inp.outside || []) {
    const k = pc.name || "خامة من مورّد";
    const o = outBy.get(k) || { a: 0, list: [] }; o.a += num(pc.a); o.list.push([pc.unit, num(pc.a)]); outBy.set(k, o);
  }
  const outP = P.out || {};
  for (const [k, o] of outBy) {
    const pr = num(outP[k]), q = Math.round(o.a * 100) / 100;
    lines.push({ k: "out", key: k, label: `${k} (من المورّد)`, qty: q, unit: "م²", price: pr, total: q * pr });
    mat += q * pr; for (const [id, a] of o.list) addU(id, a * pr);
  }
  let ctrM = 0;
  for (const u of units) { const m = num(u.ctrM); if (m > 0) { ctrM += m; addU(u.id, m * num(P.ctr)); } }
  if (ctrM > 0) { const q = Math.round(ctrM * 100) / 100; lines.push({ k: "ctr", label: "كونتر (رخام / كوارتز) — متر طولي", qty: q, unit: "م", price: num(P.ctr), total: q * num(P.ctr) }); mat += q * num(P.ctr); }
  const hwP = P.hw || {};
  const hw = {};
  for (const u of units) for (const [k, v] of Object.entries(u.hw || {})) hw[k] = r2((hw[k] || 0) + num(v));
  let hwT = 0;
  for (const [k, q] of Object.entries(hw)) { const pr = num(hwP[k]); lines.push({ k: "hw", key: k, label: k, qty: q, unit: "", price: pr, total: q * pr }); hwT += q * pr; }
  const fixed = num(P.install) + num(P.transport);
  const perU = inp.qcut ? 0 : num(P.laborUnit);
  const labor = units.length * perU + area * num(P.laborM2) + fixed;
  const cost = mat + band + hwT + labor;
  const k = 1 + num(P.margin) / 100;
  const total = cost * k;
  let usedA = 0, sheetA = 0;
  for (const s of inp.sheets || []) { sheetA += num(s.w) * num(s.h); usedA += num(s.used); }
  const waste = sheetA ? Math.round((1 - usedA / sheetA) * 100) : null;
  const perUnit = units.map((u) => {
    let hwU = 0;
    for (const [n, q] of Object.entries(u.hw || {})) hwU += num(q) * num(hwP[n]);
    const a = num(u.area);
    const c = (unitMat.get(u.id) || 0) + (unitOut.get(u.id) || 0) + num(u.banding) * num(P.band) + hwU + perU + a * num(P.laborM2) + (area ? (fixed * a) / area : 0);
    return { id: u.id, price: c * k, cost: c, area: a };
  });
  return { lines, mat, band, hwT, labor, fixed, cost, total, perUnit, area, waste, byArea: true };
}
export default priceQuote;
