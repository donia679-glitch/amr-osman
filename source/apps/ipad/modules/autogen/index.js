// NOVERA Studio — optional module «🏠 5 تصميمات تلقائية» (v126).
// The place (walls, door, windows, water / gas / power points) + the budget → many kitchens made by the app's own
// «صمملي المطبخ» plus variations → 5 different ones ranked by cost, the work triangle and the board waste.
// Nothing in the project changes until «اختار ده» (then: a NEW variant, the current design is kept).
import { engine } from "../registry.js";
import * as Gen from "./gen.js";
import * as Plan from "./plan.js";
import { localRank, W } from "./rank.js";

let A = null, pop = null, styleEl = null;
const S = {
  src: "project", newProj: false, fromHome: false,
  form: { shape: "rect", dims: {}, h: 280, doors: [{ wall: 3, at: 40, w: 90 }], windows: [], points: [] },
  budget: "", must: { dish: false, washer: false, oven: false, pantry: false },
  busy: false, stop: false, prog: { done: 0, total: 1, text: "" },
  res: null, sort: "score", cmp: false, err: "",
};
const esc = (s) => A.esc(String(s ?? ""));
const AR = "٠١٢٣٤٥٦٧٨٩";
const num = (v) => { const t = String(v ?? "").replace(/[٠-٩]/g, (d) => AR.indexOf(d)).replace(/٫/g, ".").replace(/[,،٬\s]/g, ""); const n = parseFloat(t); return Number.isFinite(n) ? n : NaN; };
const money = (v) => Math.round(v).toLocaleString("ar-EG");
const SHAPES = [["rect", "أوضة مستطيلة"], ["lroom", "أوضة L"], ["u", "حرف U (3 حيطان)"], ["corner", "ركنة (حيطتين)"], ["line", "حيطة واحدة"]];
const PT_KINDS = [["drain", "صرف الحوض"], ["cold", "تغذية مية"], ["gas", "مخرج غاز"], ["fridge", "بريزة تلاجة"], ["washer_drain", "صرف غسالة"], ["washer_cold", "تغذية غسالة"]];
const MUSTS = [["dish", "غسالة أطباق 60"], ["washer", "مكان غسالة هدوم"], ["oven", "عمود فرن"], ["pantry", "دولاب تموين"]];

// ------------------------------------------------------------------ the room from the form
function presetDims() {
  const P = A.Room.PRESETS[S.form.shape] || A.Room.PRESETS.rect, d = {};
  for (const [k, , def] of P.fields) { const v = num(S.form.dims[k]); d[k] = Number.isFinite(v) ? v : def; }
  return d;
}
function formRoom() {
  const f = S.form, d = presetDims(), h = num(f.h) > 150 ? num(f.h) : 280;
  const why = A.Room.presetCheck(f.shape, d);
  if (why) return { why };
  const room = A.Room.presetRoom(f.shape, { ...d, h });
  const segs = A.Room.segments(room);
  const segOf = (i) => segs[Math.max(0, Math.min(segs.length - 1, (+i || 1) - 1))];
  for (const x of f.doors) { const g = segOf(x.wall); const o = A.Room.addOpening(room, g.id, "door"); o.at = num(x.at) || 0; o.w = num(x.w) > 0 ? num(x.w) : 90; A.Room.clampOpening(room, o); }
  for (const x of f.windows) { const g = segOf(x.wall); const o = A.Room.addOpening(room, g.id, "window"); o.at = num(x.at) || 0; o.w = num(x.w) > 0 ? num(x.w) : 120; o.sill = Number.isFinite(num(x.sill)) ? num(x.sill) : 100; o.h = Math.min(120, h - o.sill - 20); A.Room.clampOpening(room, o); }
  for (const x of f.points) { const g = segOf(x.wall); const p = A.Room.addPoint(room, g.id, x.kind, num(x.at) || 0); if (p) A.Room.clampPoint(room, p); }
  return { room, n: segs.length };
}
const wallCount = () => ({ rect: 4, lroom: 6, u: 3, corner: 2, line: 1 })[S.form.shape] || 4;

// ------------------------------------------------------------------ html
function wallSel(path, v) {
  return `<label class="f"><span>الحيطة</span><select data-ag="${path}">${Array.from({ length: wallCount() }, (_, i) => `<option value="${i + 1}" ${+v === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select></label>`;
}
const nf = (path, label, v, ph = "") => `<label class="f"><span>${label}</span><input type="text" inputmode="decimal" data-numf data-ag="${path}" value="${esc(v ?? "")}" placeholder="${esc(ph)}"></label>`;
function formHtml() {
  const f = S.form, P = A.Room.PRESETS[f.shape] || A.Room.PRESETS.rect;
  let h = `<div class="agseg">${SHAPES.map(([k, l]) => `<button class="${f.shape === k ? "on" : ""}" data-agact="shape:${k}">${l}</button>`).join("")}</div>
    <div class="aggrid">${P.fields.map(([k, l, def]) => nf(`dims.${k}`, `${l} (سم)`, f.dims[k] ?? "", String(def))).join("")}${nf("h", "ارتفاع السقف (سم)", f.h, "280")}</div>`;
  const rows = (key, title, add, fields) => {
    let s = `<div class="agrows"><div class="agrh"><b>${title}</b><button class="ghost2 sm" data-agact="add:${key}">＋ ${add}</button></div>`;
    f[key].forEach((x, i) => { const fl = fields(x, i); s += `<div class="agrow" style="grid-template-columns: repeat(${(fl.match(/<label/g) || []).length}, minmax(0, 1fr)) 46px">${fl}<button class="agdel" data-agact="del:${key}:${i}" aria-label="امسح">×</button></div>`; });
    return s + `</div>`;
  };
  h += rows("doors", "🚪 الأبواب", "باب", (x, i) => wallSel(`doors.${i}.wall`, x.wall) + nf(`doors.${i}.at`, "من أول الحيطة", x.at) + nf(`doors.${i}.w`, "العرض", x.w));
  h += rows("windows", "🪟 الشبابيك", "شباك", (x, i) => wallSel(`windows.${i}.wall`, x.wall) + nf(`windows.${i}.at`, "من أول الحيطة", x.at) + nf(`windows.${i}.w`, "العرض", x.w) + nf(`windows.${i}.sill`, "الجلسة من الأرض", x.sill));
  h += rows("points", "🚰 المية والغاز والكهربا", "نقطة", (x, i) => `<label class="f"><span>النوع</span><select data-ag="points.${i}.kind">${PT_KINDS.map(([k, l]) => `<option value="${k}" ${x.kind === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>` + wallSel(`points.${i}.wall`, x.wall) + nf(`points.${i}.at`, "من أول الحيطة", x.at));
  return h;
}
function inputHtml() {
  const p = A.state.project, hasRoom = !!p.room && A.Room.segments(p.room).length > 0;
  let h = `<div class="agin"><div class="agleft">`;
  if (hasRoom) h += `<div class="agseg"><button class="${S.src === "project" ? "on" : ""}" data-agact="src:project">أوضة المشروع «${esc(p.name)}»</button><button class="${S.src === "form" ? "on" : ""}" data-agact="src:form">مكان جديد بالمقاسات</button></div>`;
  h += `<div class="agprev">${previewHtml()}</div>`;
  if (S.src === "project" && hasRoom) h += `<p class="hint">ده المسقط اللي في المشروع (الأبواب والشبابيك والمرافق). عايز تغيّر فيه؟ <button class="ghost2 sm" data-agact="editroom">📐 عدّل الأوضة</button></p>`;
  else h += `<p class="hint">النمرة في الدايرة = رقم الحيطة، والنقطة الصغيرة = أولها (المسافات بتتقاس منها).</p>`;
  h += `</div><div class="agright">`;
  if (S.src === "form" || !hasRoom) h += formHtml();
  h += `<div class="agbud">${nf("budget", "الميزانية (ج.م) — فاضي = من غير حد", S.budget, "مثلاً 120000")}</div>
    <div class="agmust"><b>لازم يكون فيه:</b>${MUSTS.map(([k, l]) => `<label class="agchk"><input type="checkbox" data-agmust="${k}" ${S.must[k] ? "checked" : ""}> ${l}</label>`).join("")}</div>`;
  if (S.src === "form" || !hasRoom) h += `<label class="agchk"><input type="checkbox" data-agnew ${S.newProj || (hasRoom && S.src === "form") ? "checked" : ""} ${hasRoom && S.src === "form" ? "disabled" : ""}> اعمله في مشروع جديد${hasRoom && S.src === "form" ? " (المشروع ده ليه أوضة خلاص)" : ""}</label>`;
  h += `<p class="e agerr" ${S.err ? "" : "hidden"}>${esc(S.err)}</p>
    <div class="btnrow"><button class="primary agbig" data-agact="gen">🏠 طلّعلي 5 تصميمات</button>${S.res ? `<button class="ghost2" data-agact="show">آخر نتيجة</button>` : ""}</div>
    <p class="hint">بيجرب كل شكل ينفع (خطي / L / U) على أكتر من حيطة × 3 تشطيبات × تعديلات (أدراج، علوي لحد السقف، زجاج، عمود فرن، تموين، مكان البوتجاز…)، ويستبعد أي تصميم فيه مشكلة، ويختار 5 مختلفين. مفيش حاجة بتتغير في المشروع غير لما تختار.</p></div></div>`;
  return h;
}
function previewHtml() {
  if (S.src === "project" && A.state.project.room) return Plan.planSvg(A.state.project.room, { numbers: true, h: 230 });
  const r = formRoom();
  if (r.why) return `<p class="e">${esc(r.why)}</p>`;
  return Plan.planSvg(r.room, { numbers: true, h: 230 });
}
function progHtml() {
  const p = S.prog, pc = Math.round((100 * p.done) / Math.max(1, p.total));
  return `<div class="agprog"><div class="agbar"><i style="width:${pc}%"></i></div><p><b>بيجرب التصميمات…</b> <span class="agpt">${esc(p.text)}</span></p><button class="ghost2" data-agact="stop">وقّف</button></div>`;
}
const TRI_OK = (l) => l >= 120 && l <= 270;
function cardHtml(x, i) {
  const c = x.c, q = c.cost, t = c.tri;
  const title = `${Gen.SHAPES[c.k]} · ${Gen.TIERS[c.tier]}`;
  const tri = t ? `${(t.sum / 100).toFixed(1)} م <small>(${t.legs.map((l) => `<span class="${TRI_OK(l) ? "" : "agbad"}">${(l / 100).toFixed(1)}</span>`).join(" · ")})</small>` : `<span class="agbad">مفيش مثلث</span>`;
  const notes = [];
  if (x.over) notes.push(`<span class="agbad">فوق الميزانية بـ ${money(x.overBy)} ج.م</span>`);
  if (!q.owner) notes.push(`<span>السعر تقديري — حط أسعار خاماتك في «الورشة والعميل» يبقى مظبوط</span>`);
  else if (q.partial) notes.push(`<span>فيه خامات من غير سعر — السعر أقل من الحقيقي</span>`);
  for (const n of c.notes || []) notes.push(`<span>${esc(n)}</span>`);
  const bar = (k, l) => `<div class="agsb"><span>${l}</span><i><b style="width:${x.sub[k]}%"></b></i><em>${x.sub[k]}</em></div>`;
  return `<article class="agcard" data-agid="${c.id}"><header><span class="agrank">${i + 1}</span><div><b>${title}</b><small>حيطة ${c.walls.join(" + ")}${c.tags.length ? " · " + c.tags.map(Gen.tagText).join(" · ") : ""}</small></div><span class="agscore">${x.score}</span></header>
    <div class="agpic">${planOf(c)}</div>
    <div class="agkv"><span>السعر</span><b>≈ ${money(q.total)} ج.م</b><span>الألواح</span><b>${c.sheets} لوح · هالك ${Math.round(c.waste * 100)}%</b><span>مثلث الشغل</span><b>${tri}</b><span>التخزين</span><b>${(c.storage.base / 100).toFixed(1)} م سفلي · ${(c.storage.wall / 100).toFixed(1)} م علوي${c.storage.tall ? ` · ${(c.storage.tall / 100).toFixed(1)} م طويل` : ""}</b><span>الوحدات</span><b>${q.units}</b>${S.res.room.points?.length ? `<span>المرافق</span><b>${c.svc ? `<span class="agbad">⚠ ${c.svc} بعيد عن مكانه</span>` : "✓ كله على مكانه"}</b>` : ""}</div>
    <div class="agsubs">${bar("cost", "التكلفة")}${bar("move", "الحركة")}${bar("waste", "الهالك")}${bar("storage", "التخزين")}</div>
    ${notes.length ? `<div class="agnotes">${notes.join("")}</div>` : ""}
    <div class="btnrow"><button class="primary" data-agact="use:${c.id}">✓ اختار ده</button></div></article>`;
}
function planOf(c) {
  const R = S.res, proj = { ...A.state.project, room: R.room, units: [...R.keep, ...c.units] };
  const poses = A.projectPoses(proj);
  const items = A.projectItems(proj).map((it) => ({ ...it, u: proj.units.find((u) => u.id === it.id), pose: poses.get(it.id) })).filter((x) => x.pose);
  const sp = A.workSpots(items.filter((x) => x.u.kind === "kitchen"));
  const spots = sp.sink && sp.hob && sp.fridge ? [sp.sink, sp.hob, sp.fridge] : null;
  return Plan.planSvg(R.room, { items, tri: !!spots, spots, h: 200 });
}
function cmpHtml(list) {
  const rows = [["السعر", (x) => `${money(x.c.cost.total)}`], ["الألواح", (x) => x.c.sheets], ["الهالك", (x) => `${Math.round(x.c.waste * 100)}%`], ["مثلث الشغل", (x) => (x.c.tri ? `${(x.c.tri.sum / 100).toFixed(1)} م` : "—")],
    ["التخزين", (x) => x.c.storage.score], ["الوحدات", (x) => x.c.cost.units], ["التقييم", (x) => x.score]];
  return `<div class="tblwrap"><table class="tbl agcmp"><thead><tr><th></th>${list.map((x, i) => `<th>${i + 1}. ${Gen.SHAPES[x.c.k]} ${Gen.TIERS[x.c.tier]}</th>`).join("")}</tr></thead><tbody>
    ${rows.map(([l, f]) => `<tr><td>${l}</td>${list.map((x) => `<td class="num">${f(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function resultsHtml() {
  const R = S.res;
  if (!R) return "";
  const list = R.ranked.list.map((x) => ({ ...x, c: R.byId.get(x.id) })).filter((x) => x.c);
  let h = `<div class="agtop"><button class="ghost2" data-agact="back">↩ المقاسات والميزانية</button>
    <span class="agsum">جرّب ${R.tried} تصميم${R.ranked.dropped.errors ? ` · اتشال ${R.ranked.dropped.errors} فيهم مشاكل` : ""}${R.ranked.dropped.budget ? ` · ${R.ranked.dropped.budget} فوق الميزانية` : ""}</span></div>`;
  if (!list.length) {
    return h + `<p class="e">${R.cands.length ? "كل التصميمات اللي طلعت فيها مشاكل أو مش لاقية مكان للبوتجاز" : "المكان صغير على مطبخ: محتاج حيطة متر ونص فاضية على الأقل (من غير باب)"} — كبّر المقاسات أو حرّك الباب.</p>`;
  }
  if (R.budget > 0 && !R.ranked.inBudget) h += `<p class="e">مفيش تصميم جوه الميزانية دي — دول أقرب حاجة ليها.</p>`;
  h += `<div class="agsort"><span>رتّب حسب:</span>${[["score", "الأفضل كله"], ["cost", "التكلفة"], ["move", "سهولة الحركة"], ["waste", "أقل هالك"]].map(([k, l]) => `<button class="${S.sort === k ? "on" : ""}" data-agact="sort:${k}">${l}</button>`).join("")}<button class="${S.cmp ? "on" : ""}" data-agact="cmp">⇆ قارن</button></div>`;
  if (S.cmp) h += cmpHtml(list);
  h += `<div class="agcards">${list.map(cardHtml).join("")}</div>
    <p class="hint">التقييم = التكلفة ${Math.round(W.cost * 100)}% + الحركة (مثلث الشغل: كل ضلع 1.2–2.7 م والمجموع 4–7.9 م) ${Math.round(W.move * 100)}% + الهالك ${Math.round(W.waste * 100)}% + التخزين ${Math.round(W.storage * 100)}%. «اختار ده» بيعمل نسخة جديدة في المشروع والتصميم الحالي بيفضل في «النسخ».</p>`;
  return h;
}
function bodyHtml() {
  if (S.busy) return progHtml();
  if (S.view === "res" && S.res) return resultsHtml();
  return inputHtml();
}
function draw() { if (pop?.el?.isConnected) pop.set(bodyHtml()); }

// ------------------------------------------------------------------ running
const rankE = (input) => engine("autogenRank", localRank)(input);
const plainC = (c) => ({ id: c.id, k: c.k, ci: c.ci, tier: c.tier, tags: c.tags, cost: c.cost.total, waste: c.waste ?? c.cost.wasteEst, sheets: c.sheets ?? c.cost.sheets, tri: c.tri, storage: c.storage.score, errors: c.errors ? c.errors.length : 0, hasHob: c.hasHob, hasFridge: c.hasFridge, svc: c.svc || 0 });
async function run() {
  if (S.busy) return;
  const p = A.state.project, hasRoom = !!p.room && A.Room.segments(p.room).length > 0;
  let room;
  if (S.src === "project" && hasRoom) room = JSON.parse(JSON.stringify(p.room));
  else { const r = formRoom(); if (r.why) { S.err = r.why; draw(); return; } room = r.room; }
  S.err = "";
  const target = S.src === "project" && hasRoom ? "here" : S.newProj || hasRoom ? "new" : "here";
  const keep = target === "here" ? p.units.filter((u) => u.kind !== "kitchen" && u.kind !== "pieces").map((u) => JSON.parse(JSON.stringify(u))) : [];
  const budget = num(S.budget) > 0 ? num(S.budget) : 0;
  S.busy = true; S.stop = false; S.prog = { done: 0, total: 1, text: "" }; draw();
  const prog = (done, total, text) => {
    S.prog = { done, total, text };
    const el = pop?.el; if (!el) return;
    const b = el.querySelector(".agbar i"), t = el.querySelector(".agpt");
    if (b) b.style.width = `${Math.round((100 * done) / Math.max(1, total))}%`;
    if (t) t.textContent = text;
  };
  try {
    const t0 = performance.now();
    const g = await Gen.generate({ room, keep, must: { ...S.must } }, prog, () => S.stop || !pop?.el?.isConnected);
    // the design check only for the ones that could make it (it's the slow part): rank, check the picks, drop the
    // ones with errors, rank again — until 9 clean finalists
    let pre = null, fin = [], round = 0, checked = 0;
    const baseErr = new Set(keep.length ? Gen.checkErrors({ units: [] }, room, keep) : []); // what the kept units already had
    while (round++ < 12 && !S.stop) {
      pre = await rankE({ budget, count: 9, sort: "score", cands: g.cands.filter((c) => !c.errors?.length).map(plainC) });
      fin = pre.list.map((x) => g.cands.find((c) => c.id === x.id));
      const todo = fin.filter((c) => c.errors == null);
      if (!todo.length) break;
      for (const c of todo) { prog(checked, checked + todo.length, `فحص التصميم ${++checked}`); await new Promise((r) => setTimeout(r, 0)); c.errors = Gen.checkErrors(c, room, keep).filter((t) => !baseErr.has(t)); }
    }
    pre.dropped = { ...pre.dropped, errors: g.cands.filter((c) => c.errors?.length).length };
    let i = 0;
    for (const c of fin) {
      if (S.stop) break;
      prog(i, fin.length, `خطة قص سريعة ${++i} / ${fin.length}`);
      const ev = await Gen.cutEval(c);
      c.sheets = ev.sheets; c.waste = ev.waste;
    }
    for (const c of g.cands) { c.sheets ??= c.cost.sheets; c.waste ??= c.cost.wasteEst; }
    const finIds = new Set(fin.map((c) => c.id));
    const ranked = await rankE({ budget, count: 5, sort: S.sort, cands: g.cands.filter((c) => finIds.has(c.id)).map(plainC) });
    ranked.dropped = pre.dropped;
    S.res = { room, keep, target, budget, cands: g.cands, tried: g.tried, byId: new Map(g.cands.map((c) => [c.id, c])), fin: [...finIds], ranked, ms: Math.round(performance.now() - t0) };
    S.view = "res";
  } catch (err) {
    console.error(err);
    S.err = err.message || String(err);
  } finally { S.busy = false; }
  draw();
  pop?.el?.querySelector(".modbody")?.scrollTo?.(0, 0);
}
async function resort(k) {
  S.sort = k;
  const R = S.res;
  const ids = new Set(R.fin);
  const keepDrop = R.ranked.dropped;
  R.ranked = await rankE({ budget: R.budget, count: 5, sort: k, cands: R.cands.filter((c) => ids.has(c.id)).map(plainC) });
  R.ranked.dropped = keepDrop;
  draw();
}
async function use(id) {
  const R = S.res, c = R?.byId.get(id);
  if (!c) return;
  const st = A.state, ui = A.ui;
  const name = `🏠 ${Gen.SHAPES[c.k]} ${Gen.TIERS[c.tier]}`;
  const units = c.units.map((u) => { const x = JSON.parse(JSON.stringify(u)); delete x.agTop; delete x.agDish; return x; });
  pop?.close(); pop = null;
  if (R.target === "new") {
    await A.newProject(`مطبخ ${Gen.SHAPES[c.k]} ${Gen.TIERS[c.tier]}`);
    st.project.room = JSON.parse(JSON.stringify(R.room));
    st.project.units = units;
    A.ensureCodes(st.project);
    st.sel = units[0]?.id ?? null; st.whole = true;
  } else {
    if (!st.project.room) st.project.room = JSON.parse(JSON.stringify(R.room));
    A.closeHome();
  }
  st.tab = "design"; ui.planOn = false; ui.planSel = null; st.whole = true;
  if (R.target === "new") { A.save(); A.render(true); }
  else {
    const hasDesign = st.project.units.length > 0;
    A.applyKitchen(units, hasDesign ? name : null);
    if (hasDesign) { const v = st.project.variants?.find((x) => x.id === st.project.variant); if (v) v.name = name; }
    A.ensureCodes(st.project); A.save(); A.render(true);
  }
  A.alertBar(`${name} — ${R.target === "new" ? "في مشروع جديد" : st.project.variants?.length > 1 ? "نسخة جديدة، والتصميم اللي كان قبله في «النسخ»" : "اتحط في المشروع"}. عدّل براحتك.`);
}

// ------------------------------------------------------------------ events
function setPath(path, v) {
  const ks = path.split(".");
  if (ks[0] === "budget") { S.budget = v; return; }
  let o = S.form;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
  o[ks[ks.length - 1]] = v;
}
function onInput(e) {
  const t = e.target;
  if (t.matches?.("[data-ag]")) { setPath(t.dataset.ag, t.value); if (t.dataset.ag !== "budget") { const pv = pop.el.querySelector(".agprev"); if (pv) pv.innerHTML = previewHtml(); } return; }
  if (t.matches?.("[data-agmust]")) { S.must[t.dataset.agmust] = t.checked; return; }
  if (t.matches?.("[data-agnew]")) { S.newProj = t.checked; }
}
async function onClick(e) {
  const b = e.target.closest?.("[data-agact]");
  if (!b) return;
  const [act, a1, a2] = b.dataset.agact.split(":");
  const f = S.form;
  if (act === "shape") { f.shape = a1; f.dims = {}; const n = wallCount(); for (const k of ["doors", "windows", "points"]) for (const x of f[k]) x.wall = Math.min(+x.wall || 1, n); draw(); }
  else if (act === "src") { S.src = a1; draw(); }
  else if (act === "add") {
    const at = 40;
    if (a1 === "doors") f.doors.push({ wall: Math.min(3, wallCount()), at, w: 90 });
    else if (a1 === "windows") f.windows.push({ wall: 1, at: 100, w: 120, sill: 100 });
    else f.points.push({ kind: ["drain", "gas", "fridge"][f.points.length % 3], wall: 1, at: 150 });
    draw();
  } else if (act === "del") { f[a1].splice(+a2, 1); draw(); }
  else if (act === "gen") run();
  else if (act === "stop") S.stop = true;
  else if (act === "back") { S.view = "in"; draw(); }
  else if (act === "show") { S.view = "res"; draw(); }
  else if (act === "sort") await resort(a1);
  else if (act === "cmp") { S.cmp = !S.cmp; draw(); }
  else if (act === "use") await use(b.dataset.agact.slice(4));
  else if (act === "editroom") { pop?.close(); pop = null; A.closeHome(); A.state.tab = "design"; A.ui.planOn = true; A.ui.planIn = "room"; A.render(true); A.alertBar("📐 عدّل الحيطان والأبواب والشبابيك والمرافق، وبعدين افتح «🏠 5 تصميمات» تاني"); }
}
function open({ fromHome = false } = {}) {
  if (pop?.el?.isConnected) return;
  const p = A.state.project, hasRoom = !!p.room && A.Room.segments(p.room).length > 0;
  S.fromHome = fromHome;
  S.src = hasRoom && !fromHome ? "project" : hasRoom && fromHome ? "project" : "form";
  S.newProj = fromHome ? p.units.length > 0 || hasRoom : false;
  if (!S.busy) S.view = "in";
  pop = A.popup({ title: "🏠 5 تصميمات تلقائية للمكان", html: bodyHtml(), onClose: () => { S.stop = true; pop = null; } });
  pop.el.classList.add("agpop");
  pop.el.addEventListener("input", onInput);
  pop.el.addEventListener("change", onInput);
  pop.el.addEventListener("click", onClick);
}

const CSS = `
.agpop { --agbg: var(--panel); --agfloor: color-mix(in srgb, var(--panel2, #eee) 70%, transparent); --agwall: var(--ink); --agdoor: #b07a2a; --agwin: #3a8fc9; --agnum: var(--brand, #123f23); --agtri: #d2452f; }
.agpop .popbox.wide { max-width: 1120px; }
.agin { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 18px; align-items: start; }
@media (max-width: 820px) { .agin { grid-template-columns: 1fr; } }
.agleft { position: sticky; top: 64px; }
.agprev { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--panel); min-height: 120px; display: grid; place-items: center; }
.agplan { width: 100%; display: block; }
.agseg, .agsort { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; align-items: center; }
.agseg button, .agsort button { border: 1px solid var(--line); background: var(--panel2); color: var(--ink); border-radius: 999px; padding: 9px 14px; font: inherit; min-height: 42px; cursor: pointer; }
.agseg button.on, .agsort button.on { background: var(--brand); color: #fff; border-color: var(--brand); }
.aggrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.agrows { border-top: 1px solid var(--line); margin-top: 10px; padding-top: 8px; }
.agrh { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.agrow { display: grid; gap: 6px; align-items: end; margin-bottom: 6px; }
.agdel { min-height: 44px; border: 1px solid var(--line); background: var(--panel2); color: var(--ink); border-radius: 10px; font-size: 20px; cursor: pointer; }
.agbud { margin-top: 12px; }
.agmust { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin: 10px 0; }
.agchk { display: inline-flex; gap: 8px; align-items: center; min-height: 40px; }
.agchk input { width: 22px; height: 22px; }
.agbig { font-size: 17px; min-height: 52px; padding: 0 22px; }
.agprog { padding: 30px 10px; text-align: center; }
.agbar { height: 14px; border-radius: 99px; background: var(--panel2); border: 1px solid var(--line); overflow: hidden; }
.agbar i { display: block; height: 100%; background: var(--brand); transition: width .2s; }
.agtop { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.agsum { color: var(--muted); font-size: 13px; }
.agcards { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 12px; }
.agcard { border: 1px solid var(--line); border-radius: 16px; background: var(--panel); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.agcard header { display: flex; gap: 10px; align-items: center; }
.agcard header div { flex: 1; display: flex; flex-direction: column; }
.agcard header small { color: var(--muted); font-size: 12.5px; line-height: 1.5; }
.agrank { width: 34px; height: 34px; border-radius: 50%; background: var(--brand); color: #fff; display: grid; place-items: center; font-weight: 800; flex: none; }
.agscore { font-weight: 800; font-size: 20px; color: var(--brand); }
.agpic { border-radius: 10px; overflow: hidden; border: 1px solid var(--line); }
.agkv { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; font-size: 14px; }
.agkv span { color: var(--muted); }
.agkv small { color: var(--muted); font-weight: 400; }
.agbad { color: #c0392b !important; }
.agsubs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.agsb { display: grid; grid-template-columns: 62px 1fr 26px; gap: 6px; align-items: center; font-size: 12px; color: var(--muted); }
.agsb i { height: 7px; background: var(--panel2); border-radius: 9px; overflow: hidden; display: block; }
.agsb i b { display: block; height: 100%; background: var(--brand); }
.agsb em { font-style: normal; text-align: end; }
.agnotes { display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; color: var(--muted); }
.agcmp td, .agcmp th { white-space: nowrap; }
.agplan .agb { fill: #e3d6bc; stroke: #6d5d40; }
.agplan .agt { fill: #8d7a58; stroke: #4c3f27; }
.agplan .agu { fill: rgba(61, 90, 128, .12); stroke: #3d5a80; }
.agplan .agsink { fill: #9fcbea; }
.agplan .aghob { fill: #f2a68f; }
.agplan .agfridge { fill: #c9ced4; }
.agplan .aggap { fill: #f4f1ea; }
`;

export default {
  init(api) {
    A = api; Gen.setApi(api); Plan.setApi(api);
    styleEl = document.createElement("style"); styleEl.id = "autogen-css"; styleEl.textContent = CSS; document.head.appendChild(styleEl);
  },
  destroy() { S.stop = true; pop?.close(); pop = null; styleEl?.remove(); styleEl = null; },
  slots: {
    home: () => `<button class="htile" data-mod="autogen:home"><b>🏠 5 تصميمات للمكان</b><small>مقاسات المكان والمرافق والميزانية ← 5 مطابخ مختلفة مترتبة بالتكلفة والحركة والهالك</small></button>`,
    menu: () => `<button class="mitem" data-mod="autogen:open"><span class="mic">🏠</span><span><b>5 تصميمات تلقائية</b><small>للمكان ده بالميزانية — وتختار واحد تكمّل عليه</small></span></button>`,
  },
  cmd: () => [{ label: "🏠 5 تصميمات تلقائية للمكان", run: () => open(), hint: "مقاسات + ميزانية ← 5 مطابخ" }],
  action(act) { if (act === "home") open({ fromHome: true }); else open(); },
  _test: { S, open, run, use, resort, rankE, Gen },
};
