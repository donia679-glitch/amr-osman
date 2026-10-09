// NOVERA Studio — module «🎯 التصميم الواعي بالقص» (cutfit, v126).
// After the design is done it tries SMALL size changes (whole mm, inside a tolerance the owner sets) so the pieces nest
// better and fewer sheets / less scrap are needed. Every wall run keeps its exact length (a unit's +d is its neighbour's −d),
// locked sizes are never touched, and NOTHING in the project changes before the owner ticks the proposals and taps «طبّق».
// Every evaluation is the real pipeline: changed units rebuilt by R(), cutGroups(), packed by the cut worker.
import { engine } from "../registry.js";
import * as Appl from "../../appliances.js";
import { search, editsOf, fits, better } from "./search.js";

let api = null;
let pop = null;        // the open panel
let job = null;        // the running / finished search { pid, input, ctx, res, chosen, … }
let boxOpen = false;   // the lock box in the unit panel stays open between redraws
let styleEl = null;
const LS = "novera-cutfit";
const DEF = { tol: 5, width: true, height: true, kheight: false, depth: false, drawers: true, link: true, budget: 30 };
const SEARCH_EFFORT = 0.12, VERIFY_EFFORT = 0.6; // packing effort while searching / for the before–after shown to the owner

const opts = () => { try { return { ...DEF, ...(JSON.parse(localStorage.getItem(LS) || "{}") || {}) }; } catch { return { ...DEF }; } };
const saveOpts = (o) => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch { /* private mode */ } };
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const mm = (d) => `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d)} مم`;
const DIMN = { width: "العرض", height: "الارتفاع", depth: "العمق", drawers: "ارتفاعات الأدراج" };
const yes = (v) => v === true || v === "true";

// ------------------------------------------------------------------ what may change
const LOCK_CATS = { fridge: "تجويف تلاجة", oven: "عمود فرن", microwave: "ميكروويف", washing_machine: "غسالة", washer_gap: "فتحة غسالة", cooker_gap: "فتحة بوتجاز", corner: "وحدة زاوية", corner_glass_display: "فاترينة زاوية", dishwasher: "غسالة أطباق" };
const LOCK_CLASS = { fridge: "تلاجة", oven: "فرن", microwave: "ميكروويف", washer: "غسالة", cooker: "بوتجاز", hood: "شفاط", sink: "حوض", hob: "مسطح بوتجاز" };
/** why a unit's sizes are fixed by itself (an appliance / a corner / part of a divided wall), or "" */
function autoLock(u, r, P) {
  if (u.kind === "pieces" || u.params?.model) return "قطع حرة";
  const p = r.params || {};
  if (u.kind === "kitchen") {
    if (LOCK_CATS[p.unit_category]) return LOCK_CATS[p.unit_category];
    const c = Appl.classOf(p, u.name);
    if (c && LOCK_CLASS[c]) return LOCK_CLASS[c];
    if (u.appliance && Object.values(u.appliance).some(Boolean)) return "عليها جهاز";
    if (yes(p.include_microwave) || yes(p.include_oven)) return "فرن / ميكروويف";
  }
  if (/غسالة|ديش|غسالة أطباق|تلاجة|ثلاجة|فرن|ميكروويف|بوتجاز|مسطح|شفاط|حوض/.test(u.name || "")) return "جهاز";
  if (/زاوية|ركنة|كورنر|corner/i.test(`${u.name || ""} ${p.template || ""} ${p.corner_style || ""}`)) return "وحدة زاوية";
  if (u.wcOf) return "جزء من حيطة متقسّمة";
  if (P.units.some((x) => x.wcOf === u.id)) return "حيطة متقسّمة فيها مطبخ";
  return "";
}
const lockDims = (u) => new Set(Array.isArray(u.cutLockDims) ? u.cutLockDims : []);

/** a unit's cut pieces as {name → [w, h, t]} (same numbering as the cut list) */
function piecesOf(u) {
  const out = [];
  for (const pc of api.projectPieces({ id: "cutfit", units: [u] })) out.push({ name: pc.pt.name, w: +pc.lb.w, h: +pc.lb.h, t: +pc.lb.t });
  return out;
}
const sameP = (a, b) => a.length === b.length && a.every((x, i) => x.name === b[i].name && Math.abs(x.w - b[i].w) < 0.05 && Math.abs(x.h - b[i].h) < 0.05 && Math.abs(x.t - b[i].t) < 0.05);
const boxW = (r) => { const b = api.localBox(r); return b.x1 - b.x0; };
const errN = (r) => (r.ok ? (r.errors || []).length : 99);

/** a copy of unit u with the edits e (mm) */
function editedUnit(u, e, drawers) {
  const p = api.expanded(u);
  if (e.width) p.width = r1(+p.width + e.width / 10);
  if (e.height) p.height = r1(+p.height + e.height / 10);
  if (e.depth) p.depth = r1(+p.depth + e.depth / 10);
  if (e.drw && drawers) {
    for (let i = 1; i < drawers.n; i++) p[`drawer${i}_height`] = r2(drawers.H[i - 1] + (e.drw[i - 1] || 0) / 10);
    p[`drawer${drawers.n}_height`] = 0; // the top drawer takes what is left — the unit keeps its height
  }
  return { ...api.clone(u), params: p };
}
/** the heights the drawers of a kitchen drawer unit really have (the engine splits «auto» drawers itself) — null when unsure */
function drawerHeights(u, r) {
  const p = r.params || {};
  const n = +p.drawer_count || 0;
  if (u.kind !== "kitchen" || p.door_type !== "drawers" || n < 2 || n > 8) return null;
  const fronts = (pcs) => { const f = []; for (const x of pcs) { const m = /^درج (\d+)$/.exec(x.name); if (m) f[+m[1] - 1] = x.h; } return f; };
  const base = piecesOf(u), F = fronts(base);
  if (F.length !== n || F.some((x) => !(x > 0))) return null;
  // all drawers typed as their front height: the difference is the handle recess each one leaves
  const pr = api.expanded(u);
  for (let i = 1; i <= n; i++) pr[`drawer${i}_height`] = r2(F[i - 1]);
  const F2 = fronts(piecesOf({ ...api.clone(u), params: pr }));
  if (F2.length !== n) return null;
  const H = F.map((f, i) => r2(f + (f - F2[i])));
  // check: drawers 1..n-1 typed, the top one on auto, gives exactly today's pieces
  const back = editedUnit(u, { drw: new Array(n - 1).fill(0) }, { n, H });
  if (!sameP(piecesOf(back), base)) return null;
  return { n, H };
}

// ------------------------------------------------------------------ the plain-data input of the search
function prepare(o) {
  const P = api.state.project;
  const poses = api.projectPoses(P);
  const items = new Map(api.projectItems(P).map((it) => [it.id, it]));
  const segs = api.roomSegs(P);
  const units = [], info = new Map();
  for (const u of P.units) {
    if (u.kind === "pieces") continue;
    const r = api.R(u);
    if (!r.ok) continue;
    const p = r.params || {};
    const it = items.get(u.id), pose = poses.get(u.id);
    const auto = autoLock(u, r, P);
    const LD = lockDims(u);
    const locked = !!u.cutLock || !!auto;
    // the expanded params must build the very same pieces — else this unit is left as it is
    const pcs = piecesOf(u);
    const same = !locked && sameP(piecesOf({ ...api.clone(u), params: api.expanded(u) }), pcs);
    const kitchen = u.kind === "kitchen";
    const num = (k) => +p[k] > 0;
    const free = locked || !same ? {} : {
      width: o.width && num("width") && !LD.has("width"),
      height: (kitchen ? o.kheight : o.height) && num("height") && !LD.has("height"),
      depth: o.depth && num("depth") && !LD.has("depth"),
      drawers: o.drawers && kitchen && !LD.has("drawers") && !LD.has("height"),
    };
    const drawers = free.drawers ? drawerHeights(u, r) : null;
    if (!drawers) free.drawers = false;
    let kwCol = "";
    if (u.kw && P.kwalls?.[u.kw]) { const i = (P.kwalls[u.kw].cols || []).findIndex((c) => Object.values(c.ids || {}).includes(u.id)); if (i >= 0) kwCol = `${u.kw}#${i}`; }
    const onWall = !!pose?.wall;
    const unit = {
      id: u.id, code: u.code || "", name: u.name || "", kind: u.kind, params: api.clone(u.params || {}),
      dims: { width: +p.width || 0, height: +p.height || 0, depth: +p.depth || 0 },
      lock: { all: !!u.cutLock, auto, dims: [...LD] }, free, drawers, kwCol,
      wall: onWall ? pose.wall : null, row: it?.row || null, s: onWall ? r1(pose.s) : null, w: it ? r1(it.box.x1 - it.box.x0) : 0,
      pinned: onWall && u.pos?.wall === pose.wall, alone: !onWall && !it?.corner, krow: kitchen && onWall ? it?.row || null : null,
    };
    units.push(unit);
    info.set(u.id, { u, r, pcs, err: errN(r) });
  }
  // boundaries: on one wall, the place x where one unit ends and the next starts (same row) — both sides move together
  const boundaries = [];
  const byWall = new Map();
  for (const x of units) if (x.wall && x.row) (byWall.get(x.wall) || byWall.set(x.wall, []).get(x.wall)).push(x);
  const near = (a, b) => Math.abs(a - b) < 0.06;
  for (const [wall, list] of byWall) {
    const xs = [];
    for (const x of list) for (const e of [x.s, r1(x.s + x.w)]) if (!xs.some((q) => near(q, e))) xs.push(e);
    xs.sort((a, b) => a - b);
    const segIdx = segs.findIndex((g) => g.id === wall) + 1;
    for (const at of xs) {
      const side = (row) => ({ L: list.filter((x) => x.row === row && near(r1(x.s + x.w), at)), R: list.filter((x) => x.row === row && near(x.s, at)) });
      const rows = { lower: side("lower"), upper: side("upper"), tall: side("tall"), free: side("free") };
      const two = (s) => s.L.length && s.R.length, one = (s) => (s.L.length > 0) !== (s.R.length > 0);
      const groups = [];
      if (o.link) {
        // a wall unit with the same edges as the base unit under it moves with it — the edge must be a joint on both rows
        const lo = rows.lower, up = rows.upper;
        if (two(lo) && !one(up)) groups.push(["lower", "upper"]);
        else if (two(up) && !lo.L.length && !lo.R.length) groups.push(["upper"]);
      } else { if (two(rows.lower)) groups.push(["lower"]); if (two(rows.upper)) groups.push(["upper"]); }
      if (two(rows.tall)) groups.push(["tall"]);
      if (two(rows.free)) groups.push(["free"]);
      for (const g of groups) {
        const L = g.flatMap((k) => rows[k].L), R = g.flatMap((k) => rows[k].R);
        // everyone at that joint must be free to change width and pinned on this wall (its place is written back)
        if (![...L, ...R].every((x) => x.free.width && x.pinned)) continue;
        boundaries.push({ wall, wallNo: segIdx, at, rows: g, left: L.map((x) => x.id), right: R.map((x) => x.id) });
      }
    }
  }
  // identical units (same kind, sizes and settings): one change for all of them is a move of its own
  const twinMap = new Map();
  for (const x of units) {
    if (!Object.values(x.free).some(Boolean)) continue;
    const k = JSON.stringify([x.kind, x.wall ? "w" : "f", api.R(info.get(x.id).u).params]);
    (twinMap.get(k) || twinMap.set(k, []).get(k)).push(x.id);
  }
  const twins = [...twinMap.values()].filter((ids) => ids.length > 1);
  // every kitchen unit of a row (locked ones too — then the row can't change at all)
  const krows = {};
  for (const u of P.units) {
    if (u.kind !== "kitchen") continue;
    const it = items.get(u.id);
    if (!it?.row) continue;
    (krows[it.row] ??= []).push(u.id);
  }
  const tol = Math.max(1, Math.min(20, Math.round(+o.tol || 5)));
  return { input: { v: 1, options: { tol, budgetMs: Math.max(5, Math.min(120, +o.budget || 30)) * 1000, link: !!o.link }, units, boundaries, twins, krows }, info };
}

// ------------------------------------------------------------------ the real cut pipeline as the score
const STOCK_MODE = () => api.state.cutOpts?.stockMode || (api.state.cutOpts?.useStock === false ? "off" : "first");
function remnantsOf(key) {
  const pid = api.state.project.id, m = STOCK_MODE();
  return (api.state.stock?.[key]?.remnants || []).filter((r) => r.from !== pid && +r.w > 0 && +r.h > 0 && (m === "first" ? r.use !== false : m === "pick" ? r.use === true : false)).map((r) => [+r.w, +r.h]);
}
function makeEvaluator(input, info, effort) {
  const P = api.state.project;
  const order = new Map(P.units.map((u, i) => [u.id, i]));
  const byId = new Map(input.units.map((x) => [x.id, x]));
  const base = api.cutGroups({ ...P, units: P.units });
  const packMemo = new Map();
  const o = api.cutOptsSafe();
  const popts = { kerf: +o.kerf, trim: +o.trim, timeCap: 20, effort };
  /** groups (sorted the way the full project lists them) with the changed units' parts in place of the old ones */
  const merged = (changed) => {
    if (!changed.size) return base.groups;
    const sub = api.cutGroups({ ...P, units: [...changed.values()] });
    const keys = new Set([...base.groups.map((g) => g.key), ...sub.groups.map((g) => g.key)]);
    const out = [];
    for (const key of keys) {
      const b = base.groups.find((g) => g.key === key), s = sub.groups.find((g) => g.key === key);
      const parts = [...(b?.parts || []).filter((p) => !changed.has(p.uid)), ...(s?.parts || [])];
      if (!parts.length) continue;
      parts.sort((a, c) => (!!a.strip - !!c.strip) || ((order.get(a.uid) ?? 0) - (order.get(c.uid) ?? 0)));
      out.push({ ...(b || s), key, parts, touched: !b || !!s || (b.parts.length !== parts.length) });
    }
    return out;
  };
  const sheetOf = (g) => api.groupSheet(g);
  const pack = async (groups) => {
    const need = [];
    const sigOf = (g, sh) => JSON.stringify([g.key, sh.w, sh.h, g.parts.map((p) => [r2(p.w), r2(p.h), p.rotate === false ? 0 : 1])]);
    const res = {};
    for (const g of groups) {
      const sh = sheetOf(g), k = sigOf(g, sh);
      if (packMemo.has(k)) { res[g.key] = packMemo.get(k); continue; }
      need.push({ g, sh, k });
    }
    if (need.length) {
      const out = await api.cutCall(need.map(({ g, sh }) => ({ key: g.key, sheetW: sh.w, sheetH: sh.h, remnants: remnantsOf(g.key), parts: g.parts.map(({ name, w, h, rotate }) => ({ name, w, h, rotate })) })), popts);
      for (const { g, k } of need) { const x = out.find((q) => q.key === g.key)?.result; if (x) { packMemo.set(k, x); res[g.key] = x; } }
      while (packMemo.size > 600) packMemo.delete(packMemo.keys().next().value);
    }
    return res;
  };
  const sum = (groups, res) => {
    let sheets = 0, scrap = 0, area = 0, parts = 0, over = 0;
    const per = {};
    for (const g of groups) {
      const x = res[g.key];
      if (!x) return { ok: false, why: "pack" };
      let gs = 0, ga = 0, gp = 0;
      for (const s of x.sheets) {
        const used = s.placements.reduce((a, q) => a + q.w * q.h, 0);
        if (s.stock !== "sheet") continue;
        const off = (s.offcuts || []).reduce((a, q) => a + q.w * q.h, 0);
        gs += Math.max(0, s.w * s.h - used - off); ga += s.w * s.h; gp += used;
      }
      sheets += x.stats.sheets; scrap += gs; area += ga; parts += gp; over += x.oversized?.length || 0;
      per[g.key] = { sheets: x.stats.sheets, util: x.stats.utilization, scrap: gs, area: ga, parts: gp, color: g.color, name: g.name };
    }
    return { ok: true, sheets, scrap, area, parts, over, per };
  };
  let baseScore = null;
  const evaluate = async (edits) => {
    const changed = new Map();
    for (const [uid, e] of Object.entries(edits)) {
      const I = info.get(uid), X = byId.get(uid);
      if (!I || !X) return { ok: false, why: "unit" };
      const nu = editedUnit(I.u, e, X.drawers);
      const r = api.R(nu);
      if (!r.ok || errN(r) > I.err) return { ok: false, why: "build" };
      // the box must really grow / shrink by the edit (a template that ignores its width would break the wall's length)
      if (e.width && Math.abs(boxW(r) - boxW(I.r) - e.width / 10) > 0.02) return { ok: false, why: "box" };
      changed.set(uid, nu);
    }
    const groups = merged(changed);
    const s = sum(groups, await pack(groups));
    if (s.ok && baseScore && s.over > baseScore.over) return { ok: false, why: "oversized" };
    return s;
  };
  return { evaluate, init: async () => { baseScore = await evaluate({}); return baseScore; } };
}

/** the whole project with the edits of `state` (positions written back for units on a wall run) */
function projectWith(input, info, state) {
  const P = api.state.project;
  const E = editsOf(input, state);
  const shift = {};
  for (const [k, v] of Object.entries(state)) {
    if (!k.startsWith("b:") || !v) continue;
    const b = input.boundaries[+k.slice(2)];
    for (const id of b.right) shift[id] = (shift[id] || 0) + v;
  }
  const byId = new Map(input.units.map((x) => [x.id, x]));
  const units = P.units.map((u) => {
    if (!E[u.id] && !shift[u.id]) return u;
    const nu = E[u.id] ? editedUnit(u, E[u.id], byId.get(u.id)?.drawers) : api.clone(u);
    if (shift[u.id] && nu.pos?.wall) nu.pos = { ...nu.pos, s: r1(+nu.pos.s + shift[u.id] / 10) };
    return nu;
  });
  return { project: { ...P, units }, edits: E };
}

// ------------------------------------------------------------------ the module
async function run() {
  const o = opts();
  const { input, info } = prepare(o);
  const P = api.state.project;
  const ev = makeEvaluator(input, info, SEARCH_EFFORT);
  job = { pid: P.id, input, info, o, running: true, stop: false, prog: null, res: null, chosen: null, view: null, t0: performance.now() };
  draw();
  await ev.init();
  const ctx = {
    evaluate: ev.evaluate,
    onProgress: (p) => { job.prog = p; drawProgress(); },
    stopped: () => job.stop || !pop,
  };
  const localSearch = (inp, c) => search(inp, c.evaluate, c);
  let res;
  try { res = await engine("cutfitSearch", localSearch)(input, ctx); }
  catch (err) { console.error(err); res = null; }
  if (!pop || job.pid !== api.state.project.id) { job = null; return; }
  job.running = false;
  job.res = res;
  // what the owner sees is measured again, the before and the after the same way, with a stronger packing
  job.verify = makeEvaluator(input, info, VERIFY_EFFORT);
  const keys = Object.keys(res?.state || {});
  job.chosen = new Set(keys);
  job.before = await job.verify.evaluate({});
  job.checks0 = eCount(P);
  await recompute();
  // no real gain → say so and propose nothing
  if (!gainOf(job.before, job.after)) job.chosen = new Set();
  if (!job.chosen.size) job.after = job.before;
  draw();
}
const eCount = (project) => { try { return api.designChecks(project).filter((c) => c.level === "e").length; } catch { return 0; } };
/** a real gain: fewer sheets, or the same sheets with at least a quarter of a square metre less scrap */
function gainOf(a, b) { return !!(a?.ok && b?.ok && b.area <= a.area + 1 && b.sheets <= a.sheets && (b.area < a.area - 1 || a.scrap - b.scrap >= 2500)); }
async function recompute() {
  const st = Object.fromEntries([...job.chosen].map((k) => [k, job.res.state[k]]));
  const E = editsOf(job.input, st);
  job.after = fits(job.input, E) ? await job.verify.evaluate(E) : { ok: false };
  const { project } = projectWith(job.input, job.info, st);
  job.checks1 = eCount(project);
  job.bad = !job.after.ok || job.checks1 > job.checks0 || job.after.sheets > job.before.sheets || job.after.area > job.before.area + 1;
}

function proposals() {
  const out = [];
  const I = job.input, byId = new Map(I.units.map((x) => [x.id, x]));
  const lab = (x) => `${x.code} ${x.name}`.trim();
  for (const [k, v] of Object.entries(job.res?.state || {})) {
    const E = editsOf(I, { [k]: v });
    let title = "";
    if (k.startsWith("b:")) {
      const b = I.boundaries[+k.slice(2)];
      title = `↔ الوصلة بين ${b.left.map((id) => byId.get(id)?.code).join(" + ")} و ${b.right.map((id) => byId.get(id)?.code).join(" + ")} — الحيطة ${b.wallNo}`;
    } else if (k.startsWith("t:")) { const [, i, d] = k.split(":"); title = `${DIMN[d]} — ${I.twins[+i].map((id) => byId.get(id)?.code).join(" + ")} (وحدات زي بعض)`; }
    else if (k.startsWith("k:")) { const [, row, d] = k.split(":"); title = `${DIMN[d]} — ${{ lower: "كل السفلي", upper: "كل العلوي", tall: "كل الطوال" }[row] || row}`; }
    else if (k.startsWith("s:")) { const [, uid, d] = k.split(":"); title = `${lab(byId.get(uid))} — ${DIMN[d]}`; }
    else { const [, uid] = k.split(":"); title = `${lab(byId.get(uid))} — ${DIMN.drawers}`; }
    const rows = Object.entries(E).map(([uid, e]) => {
      const x = byId.get(uid), I0 = job.info.get(uid);
      const lines = [];
      for (const d of ["width", "height", "depth"]) if (e[d]) lines.push(`${x.code} ${DIMN[d]} ${api.n1(x.dims[d])} ← ${api.n1(r1(x.dims[d] + e[d] / 10))} سم (${mm(e[d])})`);
      if (e.drw) {
        const H = x.drawers.H, sumD = e.drw.reduce((a, q) => a + q, 0);
        H.forEach((h, i) => { const d = i < H.length - 1 ? e.drw[i] || 0 : -sumD; if (d) lines.push(`${x.code} درج ${i + 1} ${api.n1(h)} ← ${api.n1(r1(h + d / 10))} سم (${mm(d)})`); });
      }
      const after = piecesOf(editedUnit(I0.u, e, x.drawers)), before = I0.pcs;
      const pcs = [];
      before.forEach((p, i) => {
        const q = after[i];
        if (!q || q.name !== p.name) return;
        const dw = Math.abs(q.w - p.w) > 0.04, dh = Math.abs(q.h - p.h) > 0.04;
        if (!dw && !dh) return;
        pcs.push(dw && dh ? `${p.name} ${api.n1(p.w)}×${api.n1(p.h)} ← ${api.n1(q.w)}×${api.n1(q.h)}` : dw ? `${p.name} ${api.n1(p.w)} ← ${api.n1(q.w)}` : `${p.name} ${api.n1(p.h)} ← ${api.n1(q.h)}`);
      });
      return { uid, lines, pcs };
    });
    out.push({ k, title, rows });
  }
  return out;
}

// ------------------------------------------------------------------ drawing
const esc = (s) => api.esc(s);
function optsHtml() {
  const o = opts();
  const tg = (k, t, d) => `<label class="cfopt"><input type="checkbox" data-cfo="${k}" ${o[k] ? "checked" : ""}><span><b>${t}</b><small>${d}</small></span></label>`;
  return `<p class="hint">البرنامج هيجرب تغييرات صغيرة بالمللي في مقاسات الوحدات علشان القطع ترص أحسن على الألواح ويقل عدد الألواح والهالك. طول الوحدات على كل حيطة بيفضل زي ما هو بالظبط (اللي بيزيد في وحدة بيقل من اللي جنبها)، والأجهزة والزوايا والمقاسات اللي قفلتها مش بتتلمس. <b>مفيش أي حاجة في المشروع بتتغير غير لما توافق.</b></p>
    <div class="cfrow"><span class="cflab">السماحية</span><button class="ghost2 sm" data-cfx="tol:-1" aria-label="أقل">−</button><b class="cfbig">± ${o.tol} مم</b><button class="ghost2 sm" data-cfx="tol:1" aria-label="أكتر">+</button></div>
    <div class="cfopts">
      ${tg("width", "العرض", "عرض الوحدات — على الحيطة بيتعوض من الوحدة اللي جنبها")}
      ${tg("height", "ارتفاع الدواليب والعفش", "دريسنج، دواليب، مكتبات، ترابيزات")}
      ${tg("kheight", "ارتفاعات المطبخ", "مقفولة عادةً: الكونتر على 90 وخط العلوي ثابت — لو فتحتها بتتغير للصف كله مع بعض")}
      ${tg("depth", "العمق", "مقفول عادةً — المطبخ بيتغير للصف كله مع بعض بس")}
      ${tg("drawers", "ارتفاعات وشوش الأدراج", "جوه نفس الوحدة — ارتفاع الوحدة ما بيتغيرش")}
      ${tg("link", "العلوي يتحرك مع السفلي", "العلوية اللي حروفها على نفس حروف السفلية تحتها بتتحرك معاها")}
    </div>
    <div class="cfrow"><span class="cflab">وقت التجربة</span>${[20, 30, 40].map((s) => `<button class="ghost2 sm ${+o.budget === s ? "on" : ""}" data-cfx="budget:${s}">${s} ث</button>`).join("")}</div>
    <div class="btnrow"><button class="primary" data-cfx="go">▶ ابدأ التجربة</button><button class="ghost2" data-modclose>رجوع</button></div>`;
}
function progressHtml() {
  const p = job.prog, frac = p ? Math.round(p.frac * 100) : 0;
  const b = p?.base, best = p?.best;
  const ph = { screen: "بيجرب كل تعديل لوحده", combine: "بيجمّع التعديلات اللي نفعت", walk: "بيدوّر على تركيبة أحسن", prune: "بيشيل التعديلات اللي مالهاش لازمة" }[p?.phase] || "بيجهّز القطع";
  return `<div class="cfprog"><div class="cfbar"><i style="width:${frac}%"></i></div>
    <p><b data-cfph>${ph}</b> · <span data-cftr>${p?.tried || 0}</span> تجربة${b?.ok ? ` · دلوقتي ${b.sheets} لوح ← أحسن لحد دلوقتي <b>${best?.sheets ?? b.sheets}</b> لوح` : ""}</p>
    <div class="btnrow"><button class="ghost2" data-cfx="stop">⏹ وقّف وخد الأحسن</button></div></div>`;
}
function drawProgress() {
  if (!pop || !job?.running) return;
  const el = pop.body()?.querySelector(".cfprog");
  if (el) el.outerHTML = progressHtml();
}
const pct = (x) => `${Math.round(x * 100)}%`;
function groupsTable(a, b) {
  const keys = Object.keys(a.per || {});
  const m2 = (cm2) => api.n1(cm2 / 1e4);
  let h = `<table class="purt cftab"><thead><tr><th>الخامة</th><th>ألواح</th><th>استغلال</th><th>هالك (مش بيرجع)</th></tr></thead><tbody>`;
  for (const k of keys) {
    const x = a.per[k], y = b.per?.[k] || x;
    const ch = (u, v, f, good) => (u === v ? `${f(u)}` : `${f(u)} ← <b class="${good ? "cfgood" : "cfbad"}">${f(v)}</b>`);
    const sc = (v, area) => `${api.n1(v / 1e4)} م² (${pct(area ? v / area : 0)})`;
    h += `<tr><td><i class="cfdot" style="background:${x.color || "#ccc"}"></i>${esc(k)}</td><td>${ch(x.sheets, y.sheets, String, y.sheets < x.sheets)}</td><td>${ch(Math.round(x.util * 100), Math.round(y.util * 100), (v) => `${v}%`, y.util > x.util)}</td><td>${Math.abs(x.scrap - y.scrap) < 100 ? sc(x.scrap, x.area) : `${sc(x.scrap, x.area)} ← <b class="${y.scrap < x.scrap ? "cfgood" : "cfbad"}">${sc(y.scrap, y.area)}</b>`}</td></tr>`;
  }
  return h + `</tbody></table>`;
}
function resultHtml() {
  const A = job.before, B = job.after || A;
  if (!A?.ok) return `<p class="e">ما قدرش يحسب خطة القص للمشروع ده.</p><div class="btnrow"><button class="ghost2" data-modclose>قفل</button></div>`;
  const props = proposals();
  const gain = gainOf(A, B);
  const tried = job.res?.tried || 0;
  const two = (a, b, f) => (f(a) === f(b) ? f(a) : `${f(a)} ← ${f(b)}`);
  let h = `<div class="kpis cfk"><div><b>${two(A.sheets, B.sheets, String)}</b><span>لوح كامل</span></div><div><b>${two(A.area ? A.parts / A.area : 0, B.area ? B.parts / B.area : 0, pct)}</b><span>استغلال</span></div><div><b>${two(A.scrap, B.scrap, (v) => api.n1(v / 1e4))}</b><span>هالك م² (مش بيرجع)</span></div><div><b>${tried}</b><span>تجربة</span></div></div>`;
  if (!props.length || (!gain && !job.chosen.size)) {
    h += `<div class="cfnone"><b>مفيش مكسب حقيقي.</b><p class="hint">جرّب ${tried} تركيبة في حدود ± ${job.o.tol} مم ومفيش واحدة بتوفّر لوح أو بتقلل الهالك بشكل يستاهل — التصميم زي ما هو مترص كويس. مش هنغيّر أي حاجة.</p>${job.res?.stopped ? `<p class="hint">(التجربة اتوقفت بدري — ممكن تجرب تاني بوقت أطول أو سماحية أكبر.)</p>` : ""}</div>`;
    h += groupsTable(A, A);
    return h + `<div class="btnrow"><button class="ghost2" data-cfx="again">↻ جرّب بإعدادات تانية</button><button class="ghost2" data-modclose>قفل</button></div>`;
  }
  h += gain ? `<p class="cfwin">✓ ${B.sheets < A.sheets ? `هتوفّر ${A.sheets - B.sheets} لوح` : B.area < A.area - 1 ? `ألواح مساحتها أقل: ${api.n1(B.area / 1e4)} م² بدل ${api.n1(A.area / 1e4)} م²` : `نفس عدد الألواح بهالك أقل ${api.n1((A.scrap - B.scrap) / 1e4)} م² (البواقي بتكبر وتنفع تاني)`} بالتعديلات المختارة.</p>`
    : `<p class="hint">التعديلات المختارة لوحدها مش بتجيب مكسب — رجّع ✓ على اللي شلته.</p>`;
  if (job.bad && job.chosen.size) h += `<p class="e">⚠ التركيبة دي بتعمل مشكلة في التصميم أو بتزوّد الألواح — مش هتتطبق.</p>`;
  h += groupsTable(A, B);
  h += `<h3 class="cfh">التعديلات المقترحة (${props.length})</h3><p class="hint">كل كارت بيتطبق كله مع بعض — الوحدتين على نفس الوصلة لازم يتغيروا سوا علشان طول الحيطة يفضل زي ما هو.</p>`;
  for (const p of props) {
    const on = job.chosen.has(p.k);
    h += `<div class="cfprop ${on ? "on" : "off"}"><div class="cfph"><b>${esc(p.title)}</b><span class="cfyn"><button class="${on ? "primary" : "ghost2"} sm" data-cfx="yes:${p.k}" aria-pressed="${on}">✓</button><button class="${on ? "ghost2" : "primary cfno"} sm" data-cfx="no:${p.k}" aria-pressed="${!on}">✕</button></span></div>
      ${p.rows.map((r) => `<div class="cfu">${r.lines.map((l) => `<div class="cfl">${esc(l)}</div>`).join("")}${r.pcs.length ? `<div class="cfpcs">${r.pcs.slice(0, 10).map((x) => `<span>${esc(x)}</span>`).join("")}${r.pcs.length > 10 ? `<span class="hint">و ${r.pcs.length - 10} قطعة كمان</span>` : ""}</div>` : ""}</div>`).join("")}</div>`;
  }
  const can = job.chosen.size && !job.bad && gain && !job.busy;
  h += `<div class="btnrow cfapply"><button class="primary" data-cfx="apply" ${can ? "" : "disabled"}>✓ طبّق المختار (${job.chosen.size})</button><button class="ghost2" data-cfx="again">↻ جرّب تاني</button><button class="ghost2" data-modclose>إلغاء</button></div>
    <p class="hint">بعد التطبيق: قايمة القطع والملصقات وملفات الماكينة والسعر بيتحدّثوا لوحدهم، وتقدر ترجع بزرار ↶ خطوة واحدة.</p>`;
  return h;
}
function draw() {
  if (!pop) return;
  const h = !job ? optsHtml() : job.running ? progressHtml() : job.busy ? `<div class="busy"><span class="spin" aria-hidden="true"></span>بيحسب…</div>` + resultHtml() : resultHtml();
  pop.set(h);
}
function openPanel() {
  if (api.state.project?.qcut) { api.alertBar("المشروع ده كت ليست سريع — مفيش وحدات تتعدّل."); return; }
  if (!pop) {
    pop = api.popup({ title: "🎯 قلّل الهالك بتعديلات صغيرة", html: "", onClose: () => { pop = null; if (job) job.stop = true; if (!job?.running) job = null; } });
    pop.el.addEventListener("click", onClick);
    pop.el.addEventListener("change", onChange);
  }
  if (job && !job.running && job.pid !== api.state.project.id) job = null;
  draw();
}
function onChange(e) {
  const t = e.target.closest?.("[data-cfo]");
  if (!t) return;
  const o = opts(); o[t.dataset.cfo] = t.checked; saveOpts(o);
}
async function onClick(e) {
  const b = e.target.closest?.("[data-cfx]");
  if (!b || b.disabled) return;
  const [cmd, arg] = b.dataset.cfx.split(/:(.*)/s);
  if (cmd === "tol") { const o = opts(); o.tol = Math.max(1, Math.min(20, (+o.tol || 5) + +arg)); saveOpts(o); draw(); }
  else if (cmd === "budget") { const o = opts(); o.budget = +arg; saveOpts(o); draw(); }
  else if (cmd === "go") { if (!job?.running) run().catch((err) => { console.error(err); api.alertBar(err.message || "ما كملش"); job = null; draw(); }); }
  else if (cmd === "stop") { if (job) job.stop = true; b.disabled = true; b.textContent = "بيقفل على الأحسن…"; }
  else if (cmd === "again") { job = null; draw(); }
  else if (cmd === "yes" || cmd === "no") {
    if (!job?.res || job.busy) return;
    if (cmd === "yes") job.chosen.add(arg); else job.chosen.delete(arg);
    job.busy = true; draw();
    try { if (job.chosen.size) await recompute(); else { job.after = job.before; job.bad = false; } } finally { job.busy = false; }
    draw();
  } else if (cmd === "apply") apply();
}
/** the accepted edits into the real project — one save = one undo step */
function apply() {
  if (!job?.res || !job.chosen.size || job.bad || job.pid !== api.state.project.id) return;
  const st = Object.fromEntries([...job.chosen].map((k) => [k, job.res.state[k]]));
  const { project, edits } = projectWith(job.input, job.info, st);
  const P = api.state.project;
  let n = 0;
  for (const nu of project.units) {
    const u = P.units.find((x) => x.id === nu.id);
    if (!u || nu === u) continue;
    const w0 = +api.R(u).params?.width;
    u.params = nu.params;
    if (nu.pos) u.pos = nu.pos;
    // a name that carries the width follows it («سفلية 82» → 81.6), like a width typed by hand
    const w1 = +u.params.width, nm0 = u.name;
    if (w0 > 0 && w1 > 0 && w1 !== w0 && u.name) { const re = new RegExp(`(^|\\D)${String(w0).replace(".", "\\.")}(?!\\d)`); if (re.test(u.name)) u.name = u.name.replace(re, `$1${api.n1(w1)}`); }
    if (u.kwName === nm0 && u.name !== nm0) u.kwName = u.name;
    n++;
  }
  // a composed kitchen wall keeps its columns' widths in step with its units
  const done = new Set();
  for (const x of job.input.units) {
    const e = edits[x.id];
    if (!x.kwCol || !e?.width || done.has(x.kwCol)) continue;
    done.add(x.kwCol);
    const [wall, i] = x.kwCol.split("#"), col = P.kwalls?.[wall]?.cols?.[+i];
    if (col) col.w = r1(+col.w + e.width / 10);
  }
  api.save();
  api.render(true);
  const saved = job.before.sheets - job.after.sheets;
  api.alertBar(`🎯 اتطبق: ${n} وحدة اتعدلت${saved > 0 ? ` — وفّرت ${saved} لوح` : ""} (↶ يرجّعها)`);
  pop?.close();
  job = null;
}

// ------------------------------------------------------------------ the unit panel box: lock the sizes
function unitBox(u, r) {
  if (!u || u.kind === "pieces" || u.params?.model || api.state.project?.qcut) return "";
  const auto = autoLock(u, r, api.state.project), LD = lockDims(u), all = !!u.cutLock;
  const p = r.params || {};
  const dims = ["width", "height", "depth"].filter((d) => +p[d] > 0);
  if (u.kind === "kitchen" && p.door_type === "drawers" && +p.drawer_count >= 2) dims.push("drawers");
  const chip = (on, act, extra, txt) => `<button class="cfchip ${on ? "on" : ""}" data-mod="cutfit:${act}" data-uid="${esc(u.id)}" ${extra} aria-pressed="${on}">${txt}</button>`;
  let h = `<details class="keepopen cfbox" data-cfbox ${boxOpen ? "open" : ""}><summary>🎯 مقاسات ثابتة (التصميم الواعي بالقص)</summary>`;
  if (auto) h += `<p class="hint">🔒 ثابتة لوحدها: ${esc(auto)} — مقاساتها مش بتتلمس.</p>`;
  else {
    h += `<div class="cfchips">${chip(all, "lock", "", all ? "🔒 مقاساتها ثابتة" : "🔓 مقاساتها ممكن تتعدل بالمللي")}</div>`;
    if (!all) h += `<p class="hint">العميل حدد مقاس معين؟ اقفله:</p><div class="cfchips">${dims.map((d) => chip(LD.has(d), "dim", `data-dim="${d}"`, `${LD.has(d) ? "🔒" : "🔓"} ${DIMN[d]}`)).join("")}</div>`;
    if (u.kind === "kitchen") h += `<p class="hint">ارتفاعات المطبخ (الكونتر وخط العلوي) والعمق ثابتين عادةً من غير ما تقفلهم.</p>`;
  }
  return h + `</details>`;
}
function toggleLock(act, el) {
  const u = api.state.project.units.find((x) => x.id === el?.dataset.uid);
  if (!u) return;
  if (act === "lock") { if (u.cutLock) delete u.cutLock; else u.cutLock = true; }
  else {
    const d = el.dataset.dim, s = lockDims(u);
    if (s.has(d)) s.delete(d); else s.add(d);
    if (s.size) u.cutLockDims = [...s]; else delete u.cutLockDims;
  }
  boxOpen = true;
  job = null; // a different set of locks: the last result no longer holds
  api.save();
  api.renderProps();
}
const onToggle = (e) => { if (e.target?.matches?.("details[data-cfbox]")) boxOpen = e.target.open; };

const CSS = `
.cfopts { display: grid; gap: 2px; margin: 8px 0; }
.cfopt { display: flex; gap: 10px; align-items: flex-start; padding: 9px 4px; border-bottom: 1px solid var(--line); cursor: pointer; }
.cfopt input { width: 22px; height: 22px; flex: none; margin-top: 2px; accent-color: var(--brand); }
.cfopt b { display: block; font-size: 14px; } .cfopt small { display: block; color: var(--muted); font-size: 12.5px; }
.cfrow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
.cfrow .cflab { color: var(--muted); min-width: 90px; }
.cfrow .ghost2.sm { min-width: 48px; height: 44px; justify-content: center; }
.cfrow .ghost2.on { background: var(--brand); color: var(--brand-ink); border-color: transparent; }
.cfbig { font-size: 20px; min-width: 96px; text-align: center; }
.cfprog { padding: 18px 4px; } .cfbar { height: 12px; border-radius: 6px; background: var(--panel2); border: 1px solid var(--line); overflow: hidden; }
.cfbar i { display: block; height: 100%; background: var(--brand); transition: width .3s; }
.cfk b { font-size: 19px; } .cftab td { white-space: nowrap; } .cftab td:first-child { white-space: normal; }
.cfdot { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-inline-end: 6px; vertical-align: middle; }
.cfgood { color: var(--brand); } .cfbad { color: var(--err); }
.cfwin { background: color-mix(in srgb, var(--brand) 14%, transparent); border-radius: 10px; padding: 10px 12px; font-weight: 700; }
.cfnone { background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin: 8px 0; }
.cfh { margin: 16px 0 4px; font-size: 16px; }
.cfprop { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; margin: 8px 0; background: var(--panel); }
.cfprop.off { opacity: .6; } .cfprop.on { border-color: var(--brand); }
.cfph { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.cfyn { display: flex; gap: 6px; flex: none; } .cfyn button.sm { min-width: 48px; height: 44px; justify-content: center; }
.cfyn .cfno { background: var(--err); }
.cfu { margin-top: 8px; } .cfl { font-weight: 600; font-variant-numeric: tabular-nums; }
.cfpcs { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 3px; font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.cfapply { position: sticky; bottom: 0; background: var(--panel); padding: 8px 0; }
.cfchips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.cfchip { min-height: 40px; padding: 0 12px; border-radius: 20px; border: 1px solid var(--line); background: var(--panel2); color: var(--ink); font-size: 13px; }
.cfchip.on { background: var(--gold-soft); border-color: var(--gold); font-weight: 700; }
.cfcard .primary { margin-top: 6px; }
`;

export default {
  init(a) {
    api = a;
    styleEl = document.createElement("style");
    styleEl.dataset.mod = "cutfit-css";
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
    document.addEventListener("toggle", onToggle, true);
  },
  destroy() {
    if (job) job.stop = true;
    pop?.close(); pop = null; job = null;
    styleEl?.remove(); styleEl = null;
    document.removeEventListener("toggle", onToggle, true);
  },
  slots: {
    cut() {
      if (api.state.project?.qcut) return "";
      const o = opts();
      return `<section class="mgroup cfcard"><div class="mg-h"><h3>🎯 قلّل الهالك بتعديلات صغيرة</h3></div>
        <p class="hint">يجرب تغييرات بالمللي (± ${o.tol} مم) في مقاسات الوحدات علشان القطع ترص أحسن ويقل عدد الألواح — طول كل حيطة بيفضل زي ما هو، والأجهزة والزوايا والمقاسات المقفولة مش بتتلمس، ومفيش حاجة بتتغير غير لما توافق.</p>
        <button class="primary" data-mod="cutfit:open">🎯 جرّب دلوقتي</button></section>`;
    },
    unit(u, r) { return unitBox(u, r); },
  },
  cmd() { return [{ label: "🎯 قلّل الهالك بتعديلات صغيرة (التصميم الواعي بالقص)", run: () => openPanel(), hint: "مقاسات بالمللي ← ألواح أقل" }]; },
  action(act, el) {
    if (act === "open") openPanel();
    else if (act === "lock" || act === "dim") toggleLock(act, el);
  },
  // for tests (node / browser): the pure parts and the pipeline pieces
  _t: { prepare: (o) => prepare({ ...DEF, ...o }), makeEvaluator, projectWith, search, editsOf, fits, better, eCount, gainOf, autoLock, get job() { return job; }, get api() { return api; } },
};
