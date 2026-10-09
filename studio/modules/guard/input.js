// NOVERA Studio — module «guard»: builds the plain-JSON input of priceQuote() from the open project
// (only numbers and names leave the device — no designs, no 3D). Needs the cut plan (api.cutData) and
// api.hwNorm (one line in modApi — see server/guard/README.md «اللي لسه هيتنقل»); without them it throws
// and the app keeps its own quoteCalc().

const CTR_RX = /كونتر|countertop/i;
/** same as app.js ctrMetres(r): running metres of a unit's countertop */
function ctrMetres(r) {
  let b = null;
  for (const x of r.meshes || []) if (x.box && CTR_RX.test(`${x.name || ""} ${x.mat || ""}`)) {
    b = b ? { x0: Math.min(b.x0, x.box.x0), x1: Math.max(b.x1, x.box.x1), y0: Math.min(b.y0, x.box.y0), y1: Math.max(b.y1, x.box.y1) } : { ...x.box };
  }
  if (!b) return 0;
  const w = b.x1 - b.x0, d = b.y1 - b.y0;
  return (w > 75 && d > 75 ? w + d - 60 : Math.max(w, d)) / 100;
}

export function priceInput(api) {
  const st = api.state, cd = api.cutData;
  if (!cd?.results || cd.pid !== st.project.id) throw new Error("خطة القص لسه ما خلصتش");
  if (typeof api.hwNorm !== "function") throw new Error("hwNorm مش متاح في modApi");
  const P0 = api.priceDefaults();
  const m2 = (g) => {
    if (+P0.m2?.[g.key] > 0) return +P0.m2[g.key];
    const sh = g.sheet || api.groupSheet(g), sp = +P0.sheets?.[g.key] || +P0.defaultSheet || 0;
    return sp ? sp / ((sh.w * sh.h) / 10000) : 0;
  };
  api.ensureCodes(st.project);
  const codeOf = new Map(st.project.units.map((u) => [u.code, u.id]));
  const idOfKey = (key) => codeOf.get(String(key).split("-")[0]) || null;
  const groups = cd.groups.map((g) => {
    const sh = g.sheet || api.groupSheet(g);
    return { key: g.key, name: g.name, color: g.color, slots: g.slots, m2: m2(g), sheet: sh ? { w: sh.w, h: sh.h } : null,
      parts: g.parts.map((p) => ({ w: +p.w, h: +p.h, kind: p.kind || "", unit: idOfKey(p.key) })) };
  });
  const units = [];
  for (const u of st.project.units) {
    const r = api.R(u);
    if (!r.ok) continue;
    let a = 0;
    for (const pt of r.parts) if (pt.cut_piece && pt.label) a += (pt.label.w * pt.label.h) / 10000;
    units.push({ id: u.id, banding: +r.banding || 0, area: a, hw: api.hwNorm(r.hardware), ctrM: (api.ctrMetres || ctrMetres)(r) });
  }
  const outside = (cd.outside || []).map((pc) => ({ name: pc.mname || "خامة من مورّد", a: ((+pc.lb?.w || 0) * (+pc.lb?.h || 0)) / 10000, unit: idOfKey(pc.key) }));
  const sheets = [];
  for (const g of cd.groups) for (const sh of cd.results[g.key]?.sheets || []) {
    let used = 0;
    for (const pl of sh.placements || []) used += pl.w * pl.h;
    sheets.push({ w: sh.w, h: sh.h, used });
  }
  const pick = ["waste", "margin", "band", "laborUnit", "laborM2", "install", "transport", "ctr"];
  const P = Object.fromEntries(pick.map((k) => [k, +P0[k] || 0]));
  P.out = { ...(P0.out || {}) }; P.hw = { ...(P0.hw || {}) };
  return { P, qcut: !!st.project.qcut, groups, units, outside, sheets };
}
