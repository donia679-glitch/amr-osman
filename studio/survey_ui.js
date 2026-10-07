// NOVERA Studio — «رفع المقاسات»: the surveyor's own screen, separate from the design screen.
// One question at a time: the room's shape → each wall's length and heights → what is on it (doors,
// windows, columns, sockets, water, gas) with photos and voice notes → the diagonals → a review with the
// checks, signatures and the survey PDF. Finishing hands the room to the designer.
import * as Room from "./room.js";
import * as S from "./survey.js";
import * as Media from "./media.js";

let C = null, el = null;
const V = { step: 0, pop: null, recFor: null, recT: 0, list: null, from: null };
const r1 = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const uid = () => Math.random().toString(36).slice(2, 10);
const CN = S.CORNER_NAMES;
const QUICK = [["door", "🚪 باب"], ["window", "🪟 شباك"], ["col", "▮ عمود / خلع"], ["mep:socket", "🔌 بريزة"], ["mep:socket_counter", "🔌 بريزة كونتر"], ["mep:switch", "💡 مفتاح"],
  ["mep:cold", "🚰 تغذية بارد"], ["mep:hot", "♨ تغذية ساخن"], ["mep:drain", "⬇ صرف"], ["mep:gas", "🔥 غاز"], ["mep:hood", "🌀 شفاط"], ["mep:ac", "❄ تكييف"]];

const P = () => C.state.project;
function SV() {
  const p = P();
  p.survey ??= { status: "measuring", info: {}, draft: null, notes: [], photos: [], sign: {}, meta: {} };
  const s = p.survey;
  s.info ??= {}; s.notes ??= []; s.photos ??= []; s.sign ??= {}; s.meta ??= {};
  if (!s.draft) s.draft = p.room ? S.draftFromRoom(p.room) : S.newDraft("rect");
  return s;
}
const D = () => SV().draft;
function steps() {
  const d = D();
  return ["info", "shape", ...d.walls.flatMap((_, i) => [`len:${i}`, `items:${i}`]), ...(S.diagSlots(d).length ? ["diag"] : []), "review"];
}
function save() { SV().at = new Date().toISOString(); C.save(); }
const isOpen = () => !!el && !el.hidden;

// ------------------------------------------------------------------ public
export function init(ctx) {
  C = ctx;
  el = document.getElementById("survey");
  el.addEventListener("click", onClick);
  el.addEventListener("input", onInput);
  el.addEventListener("change", onChange);
  el.addEventListener("keydown", onKey);
  window.addEventListener("online", () => { netBadge(); if (isOpen()) C.cloudSync?.(); });
  window.addEventListener("offline", netBadge);
}
/** open the survey screen: "list" (start / continue) or straight into the current project's survey */
export async function open(where = "list") {
  el.hidden = false;
  document.body.classList.add("insurvey");
  if (where === "list") { V.list = null; V.screen = "list"; draw(); V.list = await C.listProjects(); draw(); return; }
  V.screen = "steps";
  const s = SV();
  V.step = Math.min(s.step || 0, steps().length - 1);
  await Media.preload([...(s.photos || []), ...s.draft.walls.flatMap((w) => w.photos || []), ...s.notes.map((n) => n.audio).filter(Boolean), s.sign.client, s.sign.tech].filter(Boolean), C.cloud);
  draw();
}
export function close() {
  if (Media.recording()) Media.stopRecord();
  el.hidden = true;
  document.body.classList.remove("insurvey");
  V.pop = null;
}
export { isOpen };

// ------------------------------------------------------------------ drawing
function netBadge() { const b = el?.querySelector(".svnet"); if (b) b.hidden = navigator.onLine !== false; }
function draw() {
  if (V.screen === "list") { el.innerHTML = listHtml(); return; }
  const st = steps(), k = st[V.step] || "info";
  const s = SV();
  s.step = V.step;
  const title = s.info.client || P().name;
  let h = `<header class="svtop"><button class="svx" data-svx aria-label="خروج">✕</button><div class="svttl"><b>📐 رفع مقاسات</b><small>${esc(title)}</small></div>
    <span class="svnet" ${navigator.onLine === false ? "" : "hidden"}>📴 من غير نت — بيتحفظ على الجهاز</span></header>
    <nav class="svprog" aria-label="الخطوات">${st.map((x, i) => `<button data-svstep="${i}" class="${i === V.step ? "on" : i < V.step ? "done" : ""}" title="${esc(stepName(x))}" aria-label="${esc(stepName(x))}"></button>`).join("")}</nav>
    <main class="svbody">${body(k)}</main>
    <footer class="svnav">${V.step > 0 ? `<button class="ghost2 big" data-svprev>→ السابق</button>` : `<span></span>`}
      ${k === "review" ? `<button class="primary big" data-svfinish>✓ خلّصت الرفع</button>` : `<button class="primary big" data-svnext>التالي ←</button>`}</footer>`;
  if (V.pop) h += popHtml();
  el.innerHTML = h;
  if (V.pop?.kind === "mark") markInit();
  if (V.pop?.kind === "sign") signInit();
  const f = el.querySelector("[data-autofocus]");
  if (f && !V.pop) setTimeout(() => { try { f.focus({ preventScroll: true }); f.select?.(); } catch { /* */ } }, 30);
}
function stepName(k) {
  const [a, b] = k.split(":");
  return { info: "بيانات العميل", shape: "شكل الأوضة", diag: "الأقطار", review: "المراجعة" }[a] || (a === "len" ? `حيطة ${+b + 1} — المقاس` : `حيطة ${+b + 1} — اللي عليها`);
}
function body(k) {
  const [a, b] = k.split(":");
  if (a === "info") return infoHtml();
  if (a === "shape") return shapeHtml();
  if (a === "len") return lenHtml(+b);
  if (a === "items") return itemsHtml(+b);
  if (a === "diag") return diagHtml();
  return reviewHtml();
}
const fld = (path, label, v, { len = false, big = false, ph = "", af = false, note = "", type = "text" } = {}) =>
  `<label class="svf ${big ? "svbig" : ""}"><span>${esc(label)}</span><input type="${type}" ${len ? 'inputmode="decimal" data-len' : ""} data-sv="${path}" value="${esc(v ?? "")}" placeholder="${esc(ph)}" ${af ? "data-autofocus" : ""} autocomplete="off"><em class="svnote">${esc(note)}</em></label>`;

function listHtml() {
  const p = P(), list = V.list;
  const badge = (x) => x.srv === "measured" ? `<span class="svb ok">اترفع ✓</span>` : x.srv === "measuring" ? `<span class="svb">لسه بيترفع</span>` : "";
  return `<header class="svtop"><button class="svx" data-svx aria-label="خروج">✕</button><div class="svttl"><b>📐 رفع مقاسات</b><small>شاشة الرفع في الموقع — المصمم بيستلم الأوضة جاهزة</small></div></header>
  <main class="svbody">
    <section class="svcard"><h2>رفع جديد</h2>
      ${fld("new.client", "اسم العميل", "", { ph: "مثلاً: أ. محمد — التجمع", af: true })}
      <div class="svrow">${fld("new.phone", "التليفون", "", { type: "tel" })}${fld("new.addr", "العنوان", "")}</div>
      <button class="primary big" data-svnew>ابدأ الرفع ←</button></section>
    <section class="svcard"><h2>كمّل رفع</h2>
      <button class="svitem" data-svcur><b>${esc(p.name)}</b><small>المشروع المفتوح دلوقتي ${badge({ srv: p.survey?.status === "measured" ? "measured" : p.survey?.draft?.walls?.some((w) => +w.L > 0) ? "measuring" : null })}</small></button>
      ${list === null ? `<p class="hint">بيحمّل…</p>` : list.filter((x) => x.id !== p.id && (x.srv || x.room)).slice(0, 30).map((x) => `<button class="svitem" data-svopen="${x.id}"><b>${esc(x.name)}</b><small>${badge(x)} ${x.updatedAt ? new Date(x.updatedAt).toLocaleDateString("ar-EG") : ""}</small></button>`).join("")}
    </section>
    <p class="hint">💡 بتشتغل من غير نت: كل حاجة بتتحفظ على الجهاز، وبتتبعت أونلاين أول ما النت يرجع.<br>💡 لو عندك متر ليزر بالبلوتوث يشتغل كـ«كيبورد»، المقاس بينزل في الخانة على طول وبيعدّي للي بعدها.</p>
  </main>`;
}
function infoHtml() {
  const i = SV().info;
  return `<h2 class="svh">بيانات الرفع</h2>
    ${fld("info.client", "اسم العميل", i.client ?? P().name, { af: true })}
    <div class="svrow">${fld("info.phone", "التليفون", i.phone, { type: "tel" })}${fld("info.addr", "العنوان", i.addr)}</div>
    <div class="svrow">${fld("info.by", "اللي بيرفع", i.by ?? C.state.surveyor ?? "")}${fld("info.room", "الأوضة", i.room, { ph: "مطبخ / أوضة نوم / ريسبشن" })}</div>`;
}
function shapeHtml() {
  const d = D();
  let h = `<h2 class="svh">شكل الأوضة</h2><p class="hint">اختار الشكل — هنمشي حيطة حيطة بعد كده. الحيطان بتتعد مع عقارب الساعة من ركن ${CN[0]}.</p>
    <div class="svshapes">${Object.entries(S.SHAPES).map(([k, v]) => `<button class="svshape ${d.shape === k ? "on" : ""}" data-svshape="${k}">${shapeIcon(k)}<span>${esc(v.label)}</span></button>`).join("")}</div>`;
  if (d.shape === "free") {
    h += `<div class="svrow">${fld("draft.__n", "عدد الحيطان", d.walls.length, { len: false })}<label class="svf"><span>مقفولة؟</span><select data-svclosed><option value="1" ${d.closed ? "selected" : ""}>أوضة مقفولة</option><option value="0" ${d.closed ? "" : "selected"}>حيطان مفتوحة</option></select></label></div>
      <div class="svturns">${d.turns.map((t, i) => `<div><span>ركن ${CN[i + 1]}</span><div class="seg"><button data-svturn="${i}:1" class="${t > 0 ? "on" : ""}">عادي</button><button data-svturn="${i}:-1" class="${t < 0 ? "on" : ""}">داخل لجوه (كرش)</button></div></div>`).join("")}</div>`;
  }
  h += `<div class="svrow">${fld("draft.h", "ارتفاع السقف (عادة)", d.h, { len: true })}${fld("draft.t", "سمك الحيطة (عادة)", d.t, { len: true })}</div>
    <div class="svplanbox">${S.miniPlan(d, -1, { w: 360, h: 240 })}</div>
    <div class="btnrow"><button class="ghost2" data-svfrom>📂 خد الأوضة من مشروع قديم</button>${(C.state.roomTpls || []).length ? `<button class="ghost2" data-svtpls>⭐ قوالبي (${C.state.roomTpls.length})</button>` : ""}</div>`;
  return h;
}
function shapeIcon(k) {
  const p = { line: "M3 12h18", corner: "M4 20V4h16", u: "M4 20V4h16v16", rect: "M4 4h16v16H4z", lroom: "M4 4h16v8h-8v8H4z", free: "M4 6l7-3 9 5-2 12H6z" }[k];
  return `<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg>`;
}
const wallEnds = (i) => { const d = D(), n = d.walls.length; return [CN[i % CN.length], CN[(d.closed ? (i + 1) % n : i + 1) % CN.length]]; };
function lenHtml(i) {
  const d = D(), w = d.walls[i], [a, b] = wallEnds(i);
  return `<h2 class="svh">حيطة ${i + 1} <small>من ركن ${a} لركن ${b}</small></h2>
    <div class="svlive">${liveHtml(i)}</div>
    ${fld(`draft.walls.${i}.L`, "الطول (سم — أو اكتب بالمتر 3.45)", w.L, { len: true, big: true, af: true, ph: "مثلاً 342" })}
    <p class="hint">قيس على وش الحيطة من الركن للركن، على ارتفاع الكونتر تقريباً (90 سم).</p>
    <h3 class="svsub">ارتفاع السقف في 3 نقط <small>(اختياري — بيكشف ميل السقف)</small></h3>
    <div class="svrow3">${["عند ركن " + a, "في النص", "عند ركن " + b].map((l, j) => fld(`draft.walls.${i}.hs.${j}`, l, w.hs?.[j], { len: true, ph: String(d.h) })).join("")}</div>
    <details class="svmore"><summary>سمك الحيطة دي</summary>${fld(`draft.walls.${i}.t`, "السمك", w.t, { len: true, ph: String(d.t) })}</details>`;
}
function liveHtml(i) {
  const d = D();
  const cs = S.checks(d).filter((c) => c.wall === i && !/لسه ما اتكتبش/.test(c.t));
  return `<div class="svplanbox">${S.miniPlan(d, i, { w: 360, h: 230 })}</div>${cs.map((c) => `<p class="${c.l}">${esc(c.t)}</p>`).join("")}`;
}
function itemsHtml(i) {
  const d = D(), w = d.walls[i], [a] = wallEnds(i);
  const rows = [
    ...d.ops.filter((o) => o.wall === i).map((o) => itemRow("ops", o, a)),
    ...d.cols.filter((c) => c.wall === i).map((c) => itemRow("cols", c, a)),
    ...d.pts.filter((p) => p.wall === i).map((p) => itemRow("pts", p, a)),
  ];
  const notes = SV().notes.filter((n) => n.wall === i);
  return `<h2 class="svh">حيطة ${i + 1} — إيه اللي عليها؟ <small>${w.L ? r1(+w.L) + " سم" : ""}</small></h2>
    <div class="svlive">${liveHtml(i)}</div>
    <div class="svquick">${QUICK.map(([k, l]) => `<button class="chip" data-svadd="${k}">${l}</button>`).join("")}
      <select data-svaddsel aria-label="نقطة تانية"><option value="">＋ نقطة تانية…</option>${Object.entries(Room.MEP_KINDS).map(([k, v]) => `<option value="${k}">${esc(v[0])}</option>`).join("")}</select></div>
    <p class="hint">كل الأبعاد من ركن ${a} (أول الحيطة). لو مفيش حاجة دوس «التالي».</p>
    <div class="svitems">${rows.join("") || `<p class="hint svempty">الحيطة فاضية.</p>`}</div>
    <h3 class="svsub">صور وملاحظات الحيطة</h3>
    ${photosHtml(`wall:${i}`, w.photos || [])}
    <label class="svf"><span>ملاحظة مكتوبة <small>(🎤 تقدر تتكلم من زرار المايك في الكيبورد)</small></span><textarea data-sv="draft.walls.${i}.note" rows="2" placeholder="مثلاً: الحيطة مايلة · فيها رطوبة · ماسورة ظاهرة">${esc(w.note || "")}</textarea></label>
    ${voiceHtml(`wall:${i}`, notes)}`;
}
function itemRow(kind, o, a) {
  const base = `draft.${kind}.${D()[kind].indexOf(o)}`;
  const del = `<button class="svdel" data-svdel="${kind}:${o.id}" aria-label="امسح">🗑</button>`;
  if (kind === "ops") {
    const door = o.kind === "door";
    return `<div class="svit"><div class="svith"><div class="seg"><button data-svopk="${o.id}:door" class="${door ? "on" : ""}">🚪 باب</button><button data-svopk="${o.id}:window" class="${door ? "" : "on"}">🪟 شباك</button></div>${del}</div>
      <div class="svrow4">${fld(`${base}.at`, `البعد من ركن ${a}`, o.at, { len: true, af: o.__new })}${fld(`${base}.w`, "العرض", o.w, { len: true })}${fld(`${base}.h`, "الارتفاع", o.h, { len: true })}${door ? "" : fld(`${base}.sill`, "الجلسة من الأرض", o.sill, { len: true })}</div></div>`;
  }
  if (kind === "cols") return `<div class="svit"><div class="svith"><b>▮ عمود / خلع</b>${del}</div>
      <div class="svrow4">${fld(`${base}.at`, `البعد من ركن ${a}`, o.at, { len: true, af: o.__new })}${fld(`${base}.w`, "عرضه على الحيطة", o.w, { len: true })}${fld(`${base}.d`, "بارز قد إيه", o.d, { len: true })}</div></div>`;
  const k = Room.MEP_KINDS[o.kind] || Room.MEP_KINDS.socket;
  return `<div class="svit"><div class="svith"><select data-svptk="${o.id}">${Object.entries(Room.MEP_KINDS).map(([kk, v]) => `<option value="${kk}" ${kk === o.kind ? "selected" : ""}>${esc(Room.MEP_SYS[v[1]][0])} — ${esc(v[0])}</option>`).join("")}</select>${del}</div>
    <div class="svrow4">${fld(`${base}.at`, `البعد من ركن ${a}`, o.at, { len: true, af: o.__new })}${fld(`${base}.z`, "الارتفاع من الأرض", o.z, { len: true, ph: String(k[2]) })}</div></div>`;
}
function photosHtml(tgt, ids) {
  return `<div class="svphotos">${ids.map((id) => { const src = Media.cached(id); return `<button class="svph" data-svph="${id}" data-tgt="${tgt}">${src ? `<img src="${src}" alt="صورة">` : `<span>📷</span>`}</button>`; }).join("")}
    <label class="svph add">📷<span>صوّر</span><input type="file" accept="image/*" capture="environment" data-svphoto="${tgt}" hidden></label>
    <label class="svph add">🖼<span>من الصور</span><input type="file" accept="image/*" data-svphoto="${tgt}" hidden></label></div>`;
}
function voiceHtml(tgt, notes) {
  const on = V.recFor === tgt;
  return `<div class="svvoice">${notes.filter((n) => n.audio).map((n) => { const src = Media.cached(n.audio); return `<div class="svaud">${src ? `<audio controls preload="none" src="${src}"></audio>` : `<span>🎤 ${n.dur || ""} ث (على جهاز تاني)</span>`}<button class="svdel" data-svdelnote="${n.id}" aria-label="امسح">🗑</button></div>`; }).join("")}
    ${Media.canRecord() ? `<button class="ghost2 ${on ? "rec" : ""}" data-svrec="${tgt}">${on ? `⏹ وقّف (${Math.round(V.recT)} ث)` : "🎤 سجّل ملاحظة صوتية"}</button>` : `<p class="hint">التسجيل الصوتي مش متاح على المتصفح ده — اكتب الملاحظة أو استخدم مايك الكيبورد.</p>`}</div>`;
}
function diagHtml() {
  const d = D();
  return `<h2 class="svh">الأقطار <small>(بتتأكد إن الأركان قايمة)</small></h2>
    <p class="hint">قيس من ركن لركن على الأرض (أو على ارتفاع واحد). لو الركن قايم 90°، القطر بيساوي الرقم اللي جنبه. سيبها فاضية لو مش هتقيسها.</p>
    <div class="svlive">${diagLive()}</div>
    ${S.diagSlots(d).map((s, j) => fld(`draft.diag.${s.k}`, `القطر من ركن ${s.from} لركن ${s.to}`, d.diag[s.k], { len: true, af: j === 0, ph: s.ideal ? `لو قايمة: ${r1(s.ideal)}` : "" })).join("")}`;
}
function diagLive() {
  const d = D();
  const cs = S.checks(d).filter((c) => c.wall == null);
  return `<div class="svplanbox">${S.miniPlan(d, -1, { w: 360, h: 230 })}</div>${cs.map((c) => `<p class="${c.l}">${esc(c.t)}</p>`).join("")}`;
}
function reviewHtml() {
  const s = SV(), d = D();
  const cs = S.checks(d);
  const bad = cs.filter((c) => c.l === "e").length, warn = cs.filter((c) => c.l === "w").length;
  const per = d.walls.reduce((a, w) => a + (+w.L || 0), 0);
  const sig = (k, label) => { const src = s.sign[k] && Media.cached(s.sign[k]); return `<button class="svsig" data-svsign="${k}">${src ? `<img src="${src}" alt="${label}">` : `<span>✍ ${label}</span>`}</button>`; };
  return `<h2 class="svh">المراجعة</h2>
    <div class="svplanbox svbig">${S.miniPlan(d, -1, { w: 560, h: 360 })}</div>
    <div class="kv"><span>الحيطان</span><b>${d.walls.length}</b><span>مجموع الأطوال</span><b>${r1(per / 100)} م</b><span>أبواب / شبابيك</span><b>${d.ops.length}</b><span>نقط كهربا وسباكة</span><b>${d.pts.length}</b><span>أعمدة</span><b>${d.cols.length}</b></div>
    <h3 class="svsub">${bad ? `⛔ ${bad} غلط لازم يتصلّح` : warn ? `⚠ ${warn} تنبيه` : "✓ الأرقام سليمة"}</h3>
    <div class="svchecks">${cs.map((c) => `<button class="chk ${c.l}" ${c.wall != null ? `data-svgo="${c.wall}"` : ""}>${esc(c.t)}</button>`).join("") || `<p class="hint">مفيش ملاحظات.</p>`}</div>
    <h3 class="svsub">ملاحظات وصور عامة</h3>
    <label class="svf"><textarea data-sv="info.note" rows="3" placeholder="أي حاجة المصمم لازم يعرفها: مكان التلاجة اللي العميل عايزه، الأجهزة، الميزانية…">${esc(s.info.note || "")}</textarea></label>
    ${photosHtml("gen", s.photos)}
    ${voiceHtml("gen", s.notes.filter((n) => n.wall == null))}
    <h3 class="svsub">التوقيعات <small>(بتطلع في الكروكي)</small></h3>
    <div class="svrow">${sig("client", "توقيع العميل")}${sig("tech", "توقيع اللي رفع")}</div>
    <div class="btnrow"><button class="ghost2" data-svpdf>📄 كروكي الرفع PDF</button><button class="ghost2" data-svdesign>🎨 افتحها في التصميم</button><button class="ghost2" data-svtplsave>⭐ احفظها قالب</button></div>
    <p class="hint" id="svmsg"></p>`;
}

// ------------------------------------------------------------------ pops (photo markup, signature, lists)
function popHtml() {
  const p = V.pop;
  if (p.kind === "mark") return `<div class="svpop"><div class="svpopbox wide"><div class="libhead"><h2>علّم على الصورة</h2><button class="x" data-svpopx aria-label="قفل">×</button></div>
    <div class="svmarkbar"><div class="seg">${["#e5322d", "#1e6fd9", "#f2c200", "#ffffff"].map((c) => `<button data-svcol="${c}" class="${p.col === c ? "on" : ""}" aria-label="لون"><i style="background:${c}"></i></button>`).join("")}</div>
      <input class="svmtext" data-svmtext placeholder="اكتب كلمة ودوس على الصورة (مثلاً: ماسورة)" value="${esc(p.text || "")}">
      <button class="ghost2" data-svmundo>↶ رجّع</button>${p.id ? `<button class="ghost2 danger" data-svphdel>🗑 امسح الصورة</button>` : ""}</div>
    <div class="svmarkwrap"><canvas id="svmark"></canvas></div>
    <div class="btnrow"><button class="primary big" data-svmsave>احفظ الصورة</button></div></div></div>`;
  if (p.kind === "sign") return `<div class="svpop"><div class="svpopbox"><div class="libhead"><h2>${p.k === "client" ? "توقيع العميل" : "توقيع اللي رفع"}</h2><button class="x" data-svpopx aria-label="قفل">×</button></div>
    ${fld(p.k === "client" ? "info.client" : "info.by", "الاسم", p.k === "client" ? SV().info.client : SV().info.by)}
    <div class="svsignwrap"><canvas id="svsign"></canvas></div>
    <div class="btnrow"><button class="ghost2" data-svsclear>امسح</button><button class="primary big" data-svssave>احفظ التوقيع</button></div></div></div>`;
  if (p.kind === "from") return `<div class="svpop"><div class="svpopbox"><div class="libhead"><h2>خد الأوضة من مشروع قديم</h2><button class="x" data-svpopx aria-label="قفل">×</button></div>
    <p class="hint">بتتنسخ الحيطان والفتحات والنقط بمقاساتها — عدّل اللي اختلف بس.</p>
    ${p.list ? p.list.filter((x) => x.room && x.id !== P().id).map((x) => `<button class="svitem" data-svfromp="${x.id}"><b>${esc(x.name)}</b><small>${x.updatedAt ? new Date(x.updatedAt).toLocaleDateString("ar-EG") : ""}</small></button>`).join("") || `<p class="hint">مفيش مشاريع فيها أوضة.</p>` : `<p class="hint">بيحمّل…</p>`}</div></div>`;
  if (p.kind === "tpls") return `<div class="svpop"><div class="svpopbox"><div class="libhead"><h2>⭐ قوالب الأوض</h2><button class="x" data-svpopx aria-label="قفل">×</button></div>
    ${(C.state.roomTpls || []).map((t) => `<div class="svtpl"><button class="svitem" data-svtpl="${t.id}"><b>${esc(t.name)}</b><small>${t.draft.walls.length} حيطان</small></button><button class="svdel" data-svtpldel="${t.id}" aria-label="امسح">🗑</button></div>`).join("")}</div></div>`;
  return "";
}
// photo markup
let mk = null;
function markInit() {
  const cv = el.querySelector("#svmark"), p = V.pop;
  const img = new Image();
  img.onload = () => {
    const wrap = cv.parentElement, maxW = Math.min(wrap.clientWidth || 900, 1100), sc = Math.min(1, maxW / img.naturalWidth, (window.innerHeight * 0.58) / img.naturalHeight);
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.style.width = Math.round(img.naturalWidth * sc) + "px"; cv.style.height = Math.round(img.naturalHeight * sc) + "px";
    mk = { cv, g: cv.getContext("2d"), img, marks: p.marks || [], cur: null };
    markDraw();
  };
  img.src = p.src;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height]; };
  cv.addEventListener("pointerdown", (e) => {
    if (!mk) return;
    e.preventDefault();
    const q = pos(e);
    const txt = el.querySelector("[data-svmtext]")?.value.trim();
    if (txt) { mk.marks.push({ t: "text", c: V.pop.col, p: q, s: txt, w: cv.width }); V.pop.text = ""; const ti = el.querySelector("[data-svmtext]"); if (ti) ti.value = ""; markDraw(); return; }
    mk.cur = { t: "line", c: V.pop.col, pts: [q], w: cv.width };
    mk.marks.push(mk.cur);
    cv.setPointerCapture?.(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => { if (mk?.cur) { mk.cur.pts.push(pos(e)); markDraw(); } });
  const up = () => { if (mk) mk.cur = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
}
function markDraw() {
  const { g, img, marks, cv } = mk;
  g.drawImage(img, 0, 0, cv.width, cv.height);
  const lw = Math.max(3, cv.width / 220);
  for (const m of marks) {
    g.strokeStyle = g.fillStyle = m.c; g.lineCap = g.lineJoin = "round";
    if (m.t === "line") { g.lineWidth = lw; g.beginPath(); m.pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); if (m.pts.length === 1) g.lineTo(m.pts[0][0] + 0.1, m.pts[0][1]); g.stroke(); }
    else {
      const fs = Math.max(18, cv.width / 28);
      g.font = `700 ${fs}px "IBM Plex Sans Arabic", Tahoma, sans-serif`; g.direction = "rtl"; g.textAlign = "center";
      const tw = g.measureText(m.s).width;
      g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(m.p[0] - tw / 2 - fs * 0.3, m.p[1] - fs * 0.9, tw + fs * 0.6, fs * 1.25);
      g.fillStyle = m.c; g.fillText(m.s, m.p[0], m.p[1]);
    }
  }
}
// signature pad
let sg = null;
function signInit() {
  const cv = el.querySelector("#svsign");
  const w = Math.min(560, cv.parentElement.clientWidth || 560);
  cv.width = w * 2; cv.height = 220 * 2; cv.style.width = w + "px"; cv.style.height = "220px";
  const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = "#0b1f3a"; g.lineWidth = 5; g.lineCap = g.lineJoin = "round";
  sg = { cv, g, down: false, any: false };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height]; };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); sg.down = true; sg.any = true; const q = pos(e); g.beginPath(); g.moveTo(q[0], q[1]); cv.setPointerCapture?.(e.pointerId); });
  cv.addEventListener("pointermove", (e) => { if (!sg.down) return; const q = pos(e); g.lineTo(q[0], q[1]); g.stroke(); });
  const up = () => { sg.down = false; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
}

// ------------------------------------------------------------------ editing
function getPath(o, path) { return path.split(".").reduce((a, k) => (a == null ? a : a[k]), o); }
function setPath(o, path, v) {
  const ks = path.split("."); let a = o;
  for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; a[k] ??= /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k]; }
  a[ks[ks.length - 1]] = v;
}
function refreshLive() {
  const k = steps()[V.step] || "";
  const box = el.querySelector(".svlive");
  if (!box) return;
  const [a, b] = k.split(":");
  box.innerHTML = a === "diag" ? diagLive() : liveHtml(+b);
}
let saveT = 0;
function onInput(e) {
  const t = e.target, path = t.dataset?.sv;
  if (V.pop?.kind === "mark" && t.hasAttribute("data-svmtext")) { V.pop.text = t.value; return; }
  if (!path) return;
  if (path.startsWith("new.")) return;
  const s = SV();
  if (path === "draft.__n") { const n = parseInt(String(t.value).replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c))); if (n >= 1 && n <= 16) { S.setWallCount(s.draft, n); clearTimeout(saveT); saveT = setTimeout(() => { save(); draw(); }, 600); } return; }
  let v = t.value;
  if (t.hasAttribute("data-len")) {
    const r = S.parseLen(v);
    v = r.v;
    const note = t.parentElement.querySelector(".svnote");
    if (note) note.textContent = r.note || "";
  }
  setPath(s, path, v);
  if (path === "info.by") C.state.surveyor = v;
  if (path === "info.client" && v) P().name = v;
  refreshLive();
  clearTimeout(saveT); saveT = setTimeout(save, 400);
}
async function onChange(e) {
  const t = e.target, d = D();
  if (t.dataset.svphoto) {
    const f = t.files?.[0]; if (!f) return;
    try { const src = await Media.imageFile(f, 1800); V.pop = { kind: "mark", src, tgt: t.dataset.svphoto, marks: [], col: "#e5322d" }; draw(); }
    catch { C.alertBar("الصورة دي مش بتتفتح."); }
    return;
  }
  if (t.hasAttribute("data-svaddsel") && t.value) { addItem(`mep:${t.value}`); return; }
  if (t.dataset.svptk) { const p = d.pts.find((x) => x.id === t.dataset.svptk); if (p) { p.kind = t.value; p.z = Room.MEP_KINDS[t.value]?.[2] ?? p.z; save(); draw(); } return; }
  if (t.hasAttribute("data-svclosed")) { d.closed = t.value === "1"; save(); draw(); return; }
  if (t.dataset.sv && t.hasAttribute("data-len")) { const k = steps()[V.step] || ""; if (k === "shape") draw(); }
}
function onKey(e) {
  if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement)) return;
  e.preventDefault();
  const ins = [...el.querySelectorAll(".svbody input[data-sv]")].filter((x) => x.offsetParent !== null && !x.closest("details:not([open])"));
  const i = ins.indexOf(e.target);
  if (i >= 0 && i < ins.length - 1) { ins[i + 1].focus(); ins[i + 1].select?.(); }
  else go(1);
}
function curWall() { const k = steps()[V.step] || ""; const m = k.match(/:(\d+)$/); return m ? +m[1] : null; }
function addItem(key) {
  const d = D(), i = curWall(), w = d.walls[i];
  if (i == null) return;
  const L = +w.L || 300;
  if (key === "door" || key === "window") d.ops.push({ id: uid(), wall: i, kind: key, at: null, w: key === "door" ? 90 : 120, h: key === "door" ? 210 : 120, sill: key === "door" ? 0 : 100, __new: true });
  else if (key === "col") d.cols.push({ id: uid(), wall: i, at: null, w: 30, d: 30, __new: true });
  else { const kind = key.slice(4); d.pts.push({ id: uid(), wall: i, kind, at: null, z: Room.MEP_KINDS[kind]?.[2] ?? 55, __new: true }); }
  void L;
  save(); draw();
  for (const k of ["ops", "pts", "cols"]) for (const x of d[k]) delete x.__new;
}
function go(dir) {
  const st = steps();
  V.step = Math.max(0, Math.min(st.length - 1, V.step + dir));
  save(); draw();
  el.querySelector(".svbody")?.scrollTo?.(0, 0);
}
/** the survey → the project's room (keeping wall finishes the designer already chose) */
/** the room the survey describes, merged with what the designer already set (not written to the project) */
function surveyRoom() {
  const s = SV(), d = s.draft;
  const old = P().room;
  // lengths / angles untouched: the room keeps its own outline (no re-squaring, no turning)
  const keep = old && S.sameWalls(old, d) ? old.pts : null;
  const { room } = S.build(d, { pts: keep });
  if (old) {
    for (const w of room.walls) { const o = old.walls.find((x) => x.id === w.id); if (o) for (const k of ["finish", "color", "mat", "size", "band", "flip"]) if (o[k] !== undefined && w[k] === undefined) w[k] = o[k]; }
    for (const k of ["floor", "wallAll", "lights"]) if (old[k]) room[k] = JSON.parse(JSON.stringify(old[k]));
    // free-standing columns (not on a wall) are not in the survey: keep them
    for (const c of old.columns || []) if (!c.wall && !room.columns.some((x) => x.id === c.id)) room.columns.push({ ...c });
  }
  room.survey = { at: new Date().toISOString(), by: s.info.by || "", geo: S.geoSig(d) };
  return room;
}
function apply() {
  const old = P().room, room = surveyRoom();
  const moved = !old || JSON.stringify(old.pts) !== JSON.stringify(room.pts);
  P().room = room;
  // the units keep their places unless the walls really changed (a unit on a wall that is gone is laid out again)
  const ids = new Set(room.walls.map((w) => w.id));
  for (const u of P().units) if (moved || (u.pos?.wall && !ids.has(u.pos.wall))) delete u.pos;
  C.roomChanged?.();
  return room;
}
async function finish() {
  const s = SV(), cs = S.checks(s.draft);
  const bad = cs.filter((c) => c.l === "e");
  if (bad.length && !V.forceFinish) { V.forceFinish = true; C.alertBar(`فيه ${bad.length} غلط — صلّحهم، أو دوس «خلّصت الرفع» تاني لو متأكد.`); return; }
  V.forceFinish = false;
  apply();
  s.status = "measured"; s.doneAt = new Date().toISOString();
  const st = (P().stages ??= {});
  st.measure = { ...(st.measure || {}), done: new Date().toISOString(), date: new Date().toISOString().slice(0, 10), note: s.info.by ? `رفع: ${s.info.by}` : (st.measure?.note || "") };
  save();
  await C.saveNow?.();
  C.cloudSync?.();
  C.alertBar(navigator.onLine === false ? "اتحفظ الرفع على الجهاز ✓ — هيتبعت للمصمم أول ما النت يرجع." : "خلص الرفع ✓ — المشروع بقى «مستني تصميم».");
  close();
  C.onFinish?.();
}

async function onClick(e) {
  const b = e.target.closest("button, [data-svph]");
  if (!b) return;
  const d0 = b.dataset;
  if (d0.svx !== undefined) { close(); C.onExit?.(); return; }
  if (V.screen === "list") {
    if (d0.svnew !== undefined) {
      const v = (k) => el.querySelector(`[data-sv="new.${k}"]`)?.value.trim() || "";
      const client = v("client");
      await C.newProject(client || "رفع جديد");
      const s = SV(); s.info = { client: client || "", phone: v("phone"), addr: v("addr"), by: C.state.surveyor || "" }; s.draft = S.newDraft("rect");
      save(); open("steps"); return;
    }
    if (d0.svcur !== undefined) { open("steps"); return; }
    if (d0.svopen) { await C.openProject(d0.svopen, true); open("steps"); return; }
    return;
  }
  const s = SV(), d = s.draft;
  if (d0.svnext !== undefined) { go(1); return; }
  if (d0.svprev !== undefined) { go(-1); return; }
  if (d0.svstep) { V.step = +d0.svstep; save(); draw(); return; }
  if (d0.svgo) { V.step = steps().indexOf(`len:${d0.svgo}`); draw(); return; }
  if (d0.svshape) {
    const k = d0.svshape;
    const nd = S.newDraft(k, k === "free" ? d.walls.length : undefined);
    nd.h = d.h; nd.t = d.t;
    nd.walls.forEach((w, i) => { if (d.walls[i]) Object.assign(w, d.walls[i]); });
    nd.ops = d.ops.filter((o) => o.wall < nd.walls.length); nd.pts = d.pts.filter((o) => o.wall < nd.walls.length); nd.cols = d.cols.filter((o) => o.wall < nd.walls.length);
    s.draft = nd; save(); draw(); return;
  }
  if (d0.svturn) { const [i, t] = d0.svturn.split(":"); d.turns[+i] = +t; save(); draw(); return; }
  if (d0.svadd) { addItem(d0.svadd); return; }
  if (d0.svdel) { const [k, id] = d0.svdel.split(":"); d[k] = d[k].filter((x) => x.id !== id); save(); draw(); return; }
  if (d0.svopk) { const [id, k] = d0.svopk.split(":"); const o = d.ops.find((x) => x.id === id); if (o) { o.kind = k; if (k === "door") { o.sill = 0; if (+o.h < 180) o.h = 210; } else if (!+o.sill) o.sill = 100; save(); draw(); } return; }
  if (d0.svph) {
    const id = d0.svph, m = s.meta[id] || {};
    const orig = m.orig ? (await Media.get(m.orig, C.cloud))?.data : null;
    const src = orig || Media.cached(id) || (await Media.get(id, C.cloud))?.data;
    if (!src) { C.alertBar("الصورة دي لسه على الجهاز التاني."); return; }
    V.pop = { kind: "mark", src, tgt: d0.tgt, id, marks: m.orig ? JSON.parse(JSON.stringify(m.marks || [])) : [], col: "#e5322d", base: !m.orig }; draw(); return;
  }
  if (d0.svpopx !== undefined) { V.pop = null; draw(); return; }
  if (d0.svcol) { V.pop.col = d0.svcol; el.querySelectorAll("[data-svcol]").forEach((x) => x.classList.toggle("on", x.dataset.svcol === d0.svcol)); return; }
  if (d0.svmundo !== undefined) { mk?.marks.pop(); if (mk) markDraw(); return; }
  if (d0.svmsave !== undefined) { await savePhoto(); return; }
  if (d0.svphdel !== undefined) { removePhoto(V.pop.tgt, V.pop.id); V.pop = null; save(); draw(); return; }
  if (d0.svrec) { await toggleRec(d0.svrec); return; }
  if (d0.svdelnote) { const n = s.notes.find((x) => x.id === d0.svdelnote); if (n?.audio) Media.del(n.audio); s.notes = s.notes.filter((x) => x.id !== d0.svdelnote); save(); draw(); return; }
  if (d0.svsign) { V.pop = { kind: "sign", k: d0.svsign }; draw(); return; }
  if (d0.svsclear !== undefined) { signInit(); return; }
  if (d0.svssave !== undefined) {
    if (!sg?.any) { V.pop = null; draw(); return; }
    const rec = await Media.put(Media.fitJpeg(sg.cv, sg.cv.width, sg.cv.height, 900), { pid: P().id });
    if (s.sign[V.pop.k]) Media.del(s.sign[V.pop.k]);
    s.sign[V.pop.k] = rec.id; s.sign[V.pop.k + "At"] = new Date().toISOString();
    V.pop = null; save(); draw(); return;
  }
  if (d0.svfrom !== undefined) { V.pop = { kind: "from", list: null }; draw(); V.pop.list = await C.listProjects(); if (V.pop?.kind === "from") draw(); return; }
  if (d0.svfromp) {
    const p = await C.getProject(d0.svfromp);
    if (!p?.room) { C.alertBar("المشروع ده مفيهوش أوضة."); return; }
    s.draft = freshIds(S.draftFromRoom(p.room));
    V.pop = null; save(); draw(); C.alertBar(`اتنسخت أوضة «${p.name}» — راجع المقاسات.`); return;
  }
  if (d0.svtpls !== undefined) { V.pop = { kind: "tpls" }; draw(); return; }
  if (d0.svtpl) { const t = (C.state.roomTpls || []).find((x) => x.id === d0.svtpl); if (t) { const nd = freshIds(JSON.parse(JSON.stringify(t.draft))); s.draft = nd; V.pop = null; save(); draw(); C.alertBar(`اتحط قالب «${t.name}».`); } return; }
  if (d0.svtpldel) { C.state.roomTpls = (C.state.roomTpls || []).filter((x) => x.id !== d0.svtpldel); C.save(); draw(); return; }
  if (d0.svtplsave !== undefined) {
    const name = (s.info.room ? `${s.info.room} — ` : "") + (s.info.client || P().name);
    const t = JSON.parse(JSON.stringify(d));
    t.walls.forEach((w) => { delete w.photos; delete w.note; });
    (C.state.roomTpls ??= []).unshift({ id: uid(), name, draft: t, at: new Date().toISOString() });
    C.state.roomTpls = C.state.roomTpls.slice(0, 40);
    C.save(); C.alertBar(`اتحفظ قالب «${name}» — هتلاقيه في «شكل الأوضة».`); return;
  }
  if (d0.svpdf !== undefined) {
    const msg = el.querySelector("#svmsg"); b.disabled = true; if (msg) msg.textContent = "بيجهّز الكروكي…";
    // the PDF shows the survey as typed, without applying it to the project (units keep their places)
    try { const r = await surveyPdf(surveyRoom()); if (msg) msg.textContent = r === "declined" ? "" : "تم ✓"; } catch (err) { console.error(err); if (msg) msg.textContent = err?.message?.length < 60 ? err.message : "ما كملش."; }
    b.disabled = false; return;
  }
  if (d0.svdesign !== undefined) { apply(); save(); close(); C.openDesign(); return; }
  if (d0.svfinish !== undefined) { await finish(); return; }
}
function freshIds(d) {
  const map = {};
  d.walls.forEach((w) => { const n = uid(); map[w.id] = n; w.id = n; delete w.photos; delete w.note; });
  for (const k of ["ops", "pts", "cols"]) for (const x of d[k]) x.id = uid();
  return d;
}
function photoList(tgt) { const s = SV(); if (tgt === "gen") return s.photos; const i = +tgt.split(":")[1]; return (s.draft.walls[i].photos ??= []); }
function removePhoto(tgt, id) {
  const s = SV(), list = photoList(tgt), i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  const m = s.meta[id];
  if (m?.orig) Media.del(m.orig);
  delete s.meta[id];
  Media.del(id);
}
async function savePhoto() {
  const p = V.pop, s = SV();
  if (!mk) return;
  markDraw();
  const pid = P().id;
  const out = Media.fitJpeg(mk.cv, mk.cv.width, mk.cv.height, 1600);
  // the untouched photo is kept too (to re-edit the marks); only when there are marks
  let orig = p.id ? s.meta[p.id]?.orig : null;
  if (mk.marks.length && !orig) orig = (await Media.put(p.base && p.id ? Media.cached(p.id) || p.src : p.src, { pid })).id;
  const rec = await Media.put(out, { pid });
  const list = photoList(p.tgt);
  if (p.id) { const i = list.indexOf(p.id); if (i >= 0) list[i] = rec.id; else list.push(rec.id); const om = s.meta[p.id]; delete s.meta[p.id]; Media.del(p.id); if (om?.orig && om.orig !== orig) Media.del(om.orig); }
  else list.push(rec.id);
  s.meta[rec.id] = mk.marks.length ? { orig, marks: mk.marks } : {};
  V.pop = null; mk = null;
  save(); draw();
  C.cloudSync?.();
}
/** a finished recording → a voice note on the wall it was made for */
async function keepNote(was, r) {
  if (!r?.data || !was) return;
  const s = SV();
  const m = await Media.put(r.data, { pid: P().id, dur: r.dur });
  s.notes.push({ id: uid(), audio: m.id, dur: r.dur, wall: was === "gen" ? null : +was.split(":")[1], at: new Date().toISOString() });
  save(); C.cloudSync?.();
}
async function toggleRec(tgt) {
  if (Media.recording()) {
    const was = V.recFor;
    V.recFor = null;
    const r = await Media.stopRecord();
    await keepNote(was, r);
    draw();
    if (was === tgt) return;
  }
  try {
    V.recFor = tgt; V.recT = 0;
    // at 60 s it stops by itself: the note is kept once and nothing restarts
    await Media.startRecord(60, (sec) => { V.recT = sec; const btn = el.querySelector(`[data-svrec="${tgt}"]`); if (btn) btn.textContent = `⏹ وقّف (${Math.round(sec)} ث)`; },
      async (r) => { if (V.recFor === tgt) V.recFor = null; try { await keepNote(tgt, r); } catch { /* storage */ } draw(); });
    draw();
  } catch { V.recFor = null; C.alertBar("المايك مش متاح — اسمح للتطبيق يستخدم المايك من الإعدادات."); draw(); }
}

// ------------------------------------------------------------------ the survey PDF (كروكي الرفع)
function planSvgBig(room, W, H) {
  const segs = Room.segments(room);
  const pts = segs.flatMap((s) => [s.A, s.B]);
  const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), z0 = Math.min(...pts.map((p) => p[1])), z1 = Math.max(...pts.map((p) => p[1]));
  const pad = 90, sc = Math.min((W - pad * 2) / Math.max(1, x1 - x0), (H - pad * 2) / Math.max(1, z1 - z0));
  const ox = (W - (x1 - x0) * sc) / 2, oz = (H - (z1 - z0) * sc) / 2;
  const X = (p) => ox + (p[0] - x0) * sc, Z = (p) => oz + (p[1] - z0) * sc;
  let s = "";
  for (const g of Room.wallGeom(room)) {
    const q = Room.piecePoly(g, 0, g.seg.L);
    s += `<polygon points="${q.map((p) => `${X(p)},${Z(p)}`).join(" ")}" fill="#6b6f66" stroke="#333" stroke-width="1"/>`;
  }
  segs.forEach((g, i) => {
    for (const o of (room.openings || []).filter((x) => x.wall === g.id)) {
      const a = Math.max(0, o.at), b = Math.min(g.L, o.at + o.w);
      const P1 = [g.A[0] + g.d[0] * a, g.A[1] + g.d[1] * a], P2 = [g.A[0] + g.d[0] * b, g.A[1] + g.d[1] * b];
      const out = (p) => [p[0] - g.n[0] * g.t, p[1] - g.n[1] * g.t];
      s += `<polygon points="${[P1, P2, out(P2), out(P1)].map((p) => `${X(p)},${Z(p)}`).join(" ")}" fill="#fff" stroke="#333" stroke-width="1"/>`;
      s += `<line x1="${X(P1)}" y1="${Z(P1)}" x2="${X(P2)}" y2="${Z(P2)}" stroke="${o.kind === "door" ? "#8a6a3a" : "#2a7fc0"}" stroke-width="4"/>`;
      const m = [(P1[0] + P2[0]) / 2 + g.n[0] * 22 / sc, (P1[1] + P2[1]) / 2 + g.n[1] * 22 / sc];
      s += `<text x="${X(m)}" y="${Z(m) + 5}" font-size="14" text-anchor="middle" fill="${o.kind === "door" ? "#6b4d1e" : "#1a5f94"}">${o.kind === "door" ? "باب" : "شباك"} ${r1(o.w)}${o.kind === "door" ? "" : ` · ج${r1(o.sill)}`} ← ${r1(o.at)}</text>`;
    }
    const m = [(g.A[0] + g.B[0]) / 2 - g.n[0] * (g.t + 30 / sc), (g.A[1] + g.B[1]) / 2 - g.n[1] * (g.t + 30 / sc)];
    const ang = Math.atan2(g.d[1], g.d[0]) * 180 / Math.PI, a2 = ang > 90 || ang < -90 ? ang + 180 : ang;
    s += `<text x="${X(m)}" y="${Z(m)}" font-size="20" font-weight="800" text-anchor="middle" dominant-baseline="middle" transform="rotate(${a2} ${X(m)} ${Z(m)})" fill="#111">${r1(g.L)}</text>`;
    const mi = [(g.A[0] + g.B[0]) / 2 + g.n[0] * 40 / sc, (g.A[1] + g.B[1]) / 2 + g.n[1] * 40 / sc];
    s += `<circle cx="${X(mi)}" cy="${Z(mi)}" r="13" fill="#123f23"/><text x="${X(mi)}" y="${Z(mi) + 5}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">${i + 1}</text>`;
  });
  for (const c of room.columns || []) s += `<rect x="${X([c.x, 0])}" y="${Z([0, c.z])}" width="${c.w * sc}" height="${c.d * sc}" fill="#9a9d94" stroke="#333"/><text x="${X([c.x + c.w / 2, 0])}" y="${Z([0, c.z + c.d / 2]) + 5}" font-size="12" text-anchor="middle" fill="#fff">${r1(c.along || c.w)}×${r1(c.depth || c.d)}</text>`;
  for (const p of room.points || []) {
    const w = Room.pointWorld(room, p); if (!w) continue;
    const k = Room.MEP_KINDS[p.kind] || Room.MEP_KINDS.socket, col = Room.MEP_SYS[k[1]][1];
    const q = [w.x + w.n[0] * 14 / sc, w.z + w.n[1] * 14 / sc];
    s += `<circle cx="${X(q)}" cy="${Z(q)}" r="10" fill="${col}" stroke="#fff" stroke-width="1.5"/><text x="${X(q)}" y="${Z(q) + 4}" font-size="10" font-weight="700" fill="#fff" text-anchor="middle">${esc(k[3])}</text>`;
  }
  for (const c of S.cornerPoints(room)) s += `<circle cx="${X(c.p)}" cy="${Z(c.p)}" r="14" fill="#d9a63a" stroke="#123f23" stroke-width="2"/><text x="${X(c.p)}" y="${Z(c.p) + 6}" font-size="16" font-weight="800" text-anchor="middle" fill="#123f23">${c.name}</text>`;
  return s;
}
async function surveyPdf(roomArg) {
  const s = SV(), d = s.draft, room = roomArg || P().room;
  const segs = Room.segments(room);
  const ids = [...s.photos, ...d.walls.flatMap((w) => w.photos || []), s.sign.client, s.sign.tech].filter(Boolean);
  await Media.preload(ids, C.cloud);
  const img = (id) => Media.cached(id);
  const T = (x, y, t, o = "") => `<text x="${x}" y="${y}" text-anchor="end" ${o}>${esc(t)}</text>`;
  const pages = [];
  // page 1: who / where, the plan, the walls table
  let t = "";
  const info = [["العميل", s.info.client || P().name], ["التليفون", s.info.phone], ["العنوان", s.info.addr], ["الأوضة", s.info.room], ["اللي رفع", s.info.by], ["التاريخ", new Date(s.doneAt || s.at || Date.now()).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })]].filter((x) => x[1]);
  info.forEach(([k, v], i) => { const col = i % 2, row = Math.floor(i / 2); t += T(950 - col * 460, 104 + row * 28, k, 'font-size="15" fill="#666"') + `<text x="${950 - col * 460 - 80}" y="${104 + row * 28}" text-anchor="end" font-size="16" font-weight="700">${esc(v)}</text>`; });
  const top = 104 + Math.ceil(info.length / 2) * 28;
  t += `<rect x="40" y="${top}" width="920" height="640" fill="#fafaf6" stroke="#ddd"/><g transform="translate(40 ${top})">${planSvgBig(room, 920, 640)}</g>`;
  let y = top + 670;
  t += `<rect x="40" y="${y}" width="920" height="30" fill="#123f23"/>` + [["#", 940], ["الطول", 860], ["السمك", 760], ["ارتفاع السقف (بداية · نص · آخر)", 640], ["ملاحظة", 330]].map(([h, x]) => `<text x="${x}" y="${y + 21}" font-size="14" font-weight="700" fill="#fff" text-anchor="end">${h}</text>`).join("");
  y += 30;
  d.walls.forEach((w, i) => {
    const g = segs[i];
    t += `<rect x="40" y="${y}" width="920" height="28" fill="${i % 2 ? "#f3f4ee" : "#fff"}"/>`;
    t += [[String(i + 1), 940], [r1(+w.L || g?.L || 0) + " سم", 860], [(+w.t || d.t) + "", 760], [(w.hs || []).map((x) => (+x > 0 ? x : "—")).join(" · "), 640], [(w.note || "").slice(0, 46), 330]].map(([v, x]) => `<text x="${x}" y="${y + 19}" font-size="14" text-anchor="end">${esc(v)}</text>`).join("");
    y += 28;
  });
  // corners
  const slots = S.diagSlots(d).filter((x) => +d.diag[x.k] > 0);
  if (slots.length) {
    y += 14;
    t += T(960, y + 4, "الأقطار والأركان", 'font-size="16" font-weight="800"'); y += 24;
    for (const x of slots) { const a = S.cornerAngle(d, x.k); t += T(960, y, `القطر ${x.from}←${x.to}: ${r1(+d.diag[x.k])} سم (لو قايمة ${r1(x.ideal)}) — زاوية ركن ${CN[x.k]}: ${Number.isFinite(a) ? r1(a) + "°" : "؟"}`, 'font-size="14"'); y += 22; }
  }
  const cs = S.checks(d).filter((c) => c.l !== "n");
  if (cs.length && y < 1240) {
    y += 10; t += T(960, y + 4, "ملاحظات على المقاسات", 'font-size="16" font-weight="800" fill="#8a5a00"'); y += 24;
    for (const c of cs.slice(0, Math.max(1, Math.floor((1250 - y) / 22)))) { t += T(960, y, `${c.l === "e" ? "⛔" : "⚠"} ${c.t.replace(/[.\s]+$/, "")}`.slice(0, 120), `font-size="13" fill="${c.l === "e" ? "#a32a2a" : "#8a5a00"}"`); y += 22; }
  }
  // signatures
  const sy = 1270;
  for (const [k, label, x] of [["client", "توقيع العميل", 960], ["tech", "توقيع اللي رفع", 480]]) {
    t += `<rect x="${x - 420}" y="${sy}" width="420" height="96" fill="#fff" stroke="#bbb" rx="8"/>` + T(x - 10, sy + 20, `${label} — ${k === "client" ? s.info.client || "" : s.info.by || ""}`, 'font-size="13" fill="#555"');
    if (img(s.sign[k])) t += `<image href="${img(s.sign[k])}" x="${x - 300}" y="${sy + 26}" width="170" height="66" preserveAspectRatio="xMidYMid meet"/>`;
  }
  pages.push({ title: "كروكي رفع المقاسات", svg: t });
  // a page per wall: elevation, what is on it, photos
  d.walls.forEach((w, i) => {
    const g = segs[i]; if (!g) return;
    let q = "";
    const [a, b] = wallEnds(i);
    q += T(960, 104, `حيطة ${i + 1} — من ركن ${a} لركن ${b} — الطول ${r1(g.L)} سم`, 'font-size="20" font-weight="800"');
    // the elevation is drawn from the project's room: show the survey's room just for this (synchronous) call
    const keepRoom = P().room;
    try { P().room = room; const e = C.elevSvg(g.id); P().room = keepRoom; if (e) q += `<rect x="40" y="124" width="920" height="420" fill="#fafaf6" stroke="#ddd"/>` + nestSvg(e, 50, 130, 900, 408); } catch { /* no elevation */ } finally { P().room = keepRoom; }
    let yy = 570;
    const items = [
      ...d.ops.filter((o) => o.wall === i).map((o) => `${o.kind === "door" ? "باب" : "شباك"}: ${r1(+o.w)} × ${r1(+o.h)}${o.kind === "door" ? "" : ` · الجلسة ${r1(+o.sill || 0)}`} · على بعد ${r1(+o.at || 0)} من ركن ${a}`),
      ...d.cols.filter((c) => c.wall === i).map((c) => `عمود: ${r1(+c.w)} × ${r1(+c.d)} بارز · على بعد ${r1(+c.at || 0)} من ركن ${a}`),
      ...d.pts.filter((p) => p.wall === i).map((p) => { const k = Room.MEP_KINDS[p.kind] || Room.MEP_KINDS.socket; return `${Room.MEP_SYS[k[1]][0]} — ${k[0]}: على بعد ${r1(+p.at || 0)} · ارتفاع ${r1(+p.z || 0)}`; }),
    ];
    for (const it of items.slice(0, 14)) { q += T(960, yy, "• " + it, 'font-size="15"'); yy += 24; }
    if (w.note) { q += T(960, yy + 6, "ملاحظة — " + w.note.slice(0, 110), 'font-size="15" fill="#8a5a00"'); yy += 30; }
    const ph = (w.photos || []).map(img).filter(Boolean).slice(0, 4);
    const top2 = Math.max(yy + 14, 700), hh = ph.length > 2 ? (1340 - top2) / 2 - 10 : 1340 - top2;
    ph.forEach((src, j) => { const col = j % 2, row = Math.floor(j / 2); q += `<image href="${src}" x="${col ? 40 : 505}" y="${top2 + row * (hh + 10)}" width="455" height="${hh}" preserveAspectRatio="xMidYMid meet"/>`; });
    pages.push({ title: `حيطة ${i + 1}`, svg: q });
  });
  // notes + general photos
  const gen = s.photos.map(img).filter(Boolean);
  const voice = s.notes.filter((n) => n.audio);
  if (s.info.note || gen.length || voice.length) {
    let q = T(960, 104, "ملاحظات عامة", 'font-size="20" font-weight="800"'), yy = 140;
    for (const line of String(s.info.note || "").split(/\n/).flatMap((l) => l.match(/.{1,80}(\s|$)/g) || [l])) { q += T(960, yy, line.trim(), 'font-size="16"'); yy += 26; }
    if (voice.length) { yy += 6; q += T(960, yy, `🎤 ${voice.length} ملاحظة صوتية (${voice.map((n) => `${n.wall == null ? "عامة" : "حيطة " + (n.wall + 1)} ${n.dur || ""} ث`).join(" · ")}) — اسمعها في التطبيق`, 'font-size="14" fill="#555"'); yy += 30; }
    const n = Math.min(6, gen.length), cols = n > 1 ? 2 : 1, rows = Math.ceil(n / cols) || 1, hh = (1340 - yy) / rows - 10;
    gen.slice(0, 6).forEach((src, j) => { const c = j % cols, r = Math.floor(j / cols); q += `<image href="${src}" x="${cols === 1 ? 40 : c ? 40 : 505}" y="${yy + r * (hh + 10)}" width="${cols === 1 ? 920 : 455}" height="${hh}" preserveAspectRatio="xMidYMid meet"/>`; });
    pages.push({ title: "ملاحظات وصور", svg: q });
  }
  return C.pdfOut(pages, "كروكي الرفع", false);
}
function nestSvg(svg, x, y, w, h) {
  const i = svg.indexOf("<svg"), j = svg.indexOf(">", i);
  const tag = svg.slice(i, j).replace(/\s(width|height|x|y)="[^"]*"/g, "");
  return tag.replace("<svg", `<svg x="${x}" y="${y}" width="${w}" height="${h}"`) + svg.slice(j);
}
