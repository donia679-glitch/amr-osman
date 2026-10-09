// NOVERA Studio — module «🔗 النسخة الرقمية للمطبخ» (twin, v126).
// A QR stuck inside the cabinet: years later the client scans it and finds the kitchen's design, its units, materials and the
// exact cut list, and can ask for maintenance / a piece / an addition on WhatsApp.
//  • FREE tier (no server, works forever): everything lives in the QR itself — twin.html#z=<deflate-raw JSON, base64url>
//    (#j=<plain JSON> on a device without CompressionStream). The main QR carries the units + materials (+ plan, + pieces when
//    they fit); one QR per unit carries that unit's full cut list + hardware (split in 2+ labels when a unit is too big).
//  • HOSTED tier (optional, also free — GitHub Pages; needs the owner's fine-grained token once): the full twin JSON goes to
//    <repo>/<folder>/<id>.json through the contents API, the QR is twin.html#id=<unguessable id>&z=<header> — the header keeps
//    the request buttons working even if the file can't be fetched. Never published: the client's phone / address; the client's
//    name only when the owner ticks it (off by default).
// Codec (shared with twin.html — keep both in step): see `pack()`; t = "m" main · "u" one unit (k/n part) · "f" full (hosted).
const KEY = "novera-twin";
const DEF = { repo: "donia679-glitch/amr-osman", branch: "main", folder: "twins", token: "", page: "https://donia679-glitch.github.io/amr-osman/studio/twin.html", client: false, hosted: true };
const MAIN_MAX = 1800, UNIT_MAX = 1500; // URL chars — a 45–50 mm printed QR stays readable (version ≤ ~35, M correction)
let api = null, pop = null, S = null, busy = false, cache = null;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const r1 = (v) => Math.round((+v || 0) * 10) / 10;
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { S = {}; }
  S.cfg = { ...DEF, ...(S.cfg || {}) };
  return S;
}
function store() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* full */ } }

// ------------------------------------------------------------------ data
const ROWC = { lower: "l", upper: "u", tall: "t", free: "f" };
const FIN = { wood: "خشب طبيعي", hpl: "HPL", acrylic: "أكريليك", paint: "دهان", lacquer: "دهان", glass: "زجاج", melamine: "ميلامين", pvc: "PVC", veneer: "قشرة" };
function dateOf(p) {
  const st = p.stages || {};
  for (const k of ["handover", "install"]) { const s = st[k]; if (typeof s?.done === "string") return s.done.slice(0, 10); if (s?.done && s.date) return s.date; }
  for (const k of ["handover", "install"]) if (st[k]?.plan) return st[k].plan;
  return new Date().toISOString().slice(0, 10);
}
const hwPick = (hw, rx) => { const k = Object.keys(hw || {}).find((x) => rx.test(x)); return k ? k.replace(/\s*\((زوج|متر طولي|متر)\)\s*$/, "") : ""; };
/** front view of a unit: its outline + the doors / drawer fronts as rectangles (whole cm) */
function elevOf(r) {
  const items = r.meshes || r.parts || [];
  const bs = items.filter((x) => x.box && x.mat !== "hole" && x.role !== "hole").map((x) => x.box);
  if (!bs.length) return null;
  const X0 = Math.min(...bs.map((b) => b.x0)), X1 = Math.max(...bs.map((b) => b.x1)), Z0 = Math.min(...bs.map((b) => b.z0)), Z1 = Math.max(...bs.map((b) => b.z1));
  const fr = [];
  for (const x of items) {
    const b = x.box; if (!b) continue;
    const front = r.meshes ? x.mat === "front" : /^(door|drawer_front)$/.test(x.role || "");
    if (!front || b.x1 - b.x0 < 6 || b.z1 - b.z0 < 6 || b.y1 - b.y0 > 6) continue;
    const q = [Math.round(b.x0 - X0), Math.round(b.z0 - Z0), Math.round(b.x1 - b.x0), Math.round(b.z1 - b.z0)];
    if (!fr.some((o) => o.every((v, i) => Math.abs(v - q[i]) < 1.5))) fr.push(q);
    if (fr.length >= 30) break;
  }
  return [Math.round(X1 - X0), Math.round(Z1 - Z0), Math.round(Z0), fr];
}
/** everything the twin knows, from the app's own engines (R, projectPieces) — nothing re-computed */
function collect() {
  const st = api.state, p = st.project, P = api.priceDefaults();
  const pcs = api.projectPieces(p); // also gives every unit its code
  const M = [], mi = new Map();
  const mat = (name, color) => { const k = `${name}|${color}`; if (!mi.has(k)) { mi.set(k, M.length); M.push([name, color || ""]); } return mi.get(k); };
  const units = [], byCode = {};
  let poses = null;
  try { poses = p.room ? api.projectPoses(p) : null; } catch { poses = null; }
  for (const u of p.units) {
    const r = api.R(u);
    if (!r.ok) continue;
    const code = u.code || "";
    const mine = pcs.filter((x) => x.uid === u.id);
    const mats = [...new Set(mine.map((x) => mat(x.mname, x.color)))];
    let row = "f";
    try { row = ROWC[api.rowOf(u, r)] || "f"; } catch { /* */ }
    const fin = r.params?.door_finish ? FIN[r.params.door_finish] || r.params.door_finish : "";
    const hw = r.hardware || {};
    const U = [code, u.name, api.dimsText(u, r), row, mats, fin, hwPick(hw, /مقبض|بروفايل مقبض|gola|جولا/i), hwPick(hw, /مفصل/), hwPick(hw, /مجر/), mine.length];
    // pieces: [name, L, W, T, material, banding bits (1 ط١ · 2 ط٢ · 4 ع١ · 8 ع٢), key tail when it isn't the next number]
    let n = 0;
    const Pc = mine.map((x) => {
      const b = x.lb.banded || {};
      const row_ = [x.pt.name, r1(x.lb.h), r1(x.lb.w), r1(x.lb.t), mat(x.mname, x.color), (b.left ? 1 : 0) | (b.right ? 2 : 0) | (b.bottom ? 4 : 0) | (b.top ? 8 : 0)];
      const tail = x.key.slice(code.length + 1), m = /^(\d+)(?:\/(\d+))?$/.exec(tail);
      if (m && !m[2] && +m[1] === n + 1) n++;
      else { row_.push(tail); if (m) n = +m[1]; }
      return row_;
    });
    let L = null;
    const pose = poses?.get?.(u.id);
    if (pose) {
      try {
        const f = api.Room.footprint(pose, api.localBox(r));
        const cx = (f[0][0] + f[2][0]) / 2, cz = (f[0][1] + f[2][1]) / 2;
        L = [Math.round(cx), Math.round(cz), Math.round((Math.atan2(f[1][1] - f[0][1], f[1][0] - f[0][0]) * 180) / Math.PI), Math.round(Math.hypot(f[1][0] - f[0][0], f[1][1] - f[0][1])), Math.round(Math.hypot(f[2][0] - f[1][0], f[2][1] - f[1][1]))];
      } catch { L = null; }
    }
    const one = { u, r, U, P: Pc, H: Object.entries(hw).map(([k, v]) => [k, r1(v)]), E: elevOf(r), L };
    units.push(one); byCode[code] = one;
  }
  const room = p.room?.pts?.length ? p.room.pts.map((q) => [Math.round(q[0]), Math.round(q[1])]) : null;
  const head = { v: 1, f: P.factory || "NOVERA", p: P.phone || "", w: P.warranty || "", n: p.name || "", c: String(p.id || "").toUpperCase(), dt: dateOf(p) };
  if (S.cfg.client && P.client) head.cl = String(P.client).slice(0, 40);
  return { head, M, units, byCode, room, pieces: pcs.length };
}
/** the JSON one QR carries. lvl: 0 everything · 1 no hardware · 2 no pieces · 3 no plan · 4 bare units */
function mainObj(D, lvl, extra = {}) {
  const o = { ...D.head, t: "m", M: D.M, U: D.units.map((x) => (lvl >= 4 ? x.U.slice(0, 4).concat([x.U[4]]) : x.U)) };
  if (lvl <= 2 && D.room) o.L = { r: D.room, u: D.units.map((x) => x.L) };
  if (lvl <= 1) o.P = Object.fromEntries(D.units.map((x) => [x.U[0], x.P]));
  if (lvl <= 0) o.H = Object.fromEntries(D.units.map((x) => [x.U[0], x.H]));
  if (lvl >= 2) o.x = 1; // the cut list is on the units' own labels
  return { ...o, ...extra };
}
/** only the materials a set of rows uses, re-indexed */
function subMats(D, rows, U) {
  const keep = [...new Set([...U[4], ...rows.map((q) => q[4])])].sort((a, b) => a - b), map = new Map(keep.map((k, i) => [k, i]));
  return { M: keep.map((k) => D.M[k]), U: [...U.slice(0, 4), U[4].map((k) => map.get(k)), ...U.slice(5)], P: rows.map((q) => { const z = q.slice(); z[4] = map.get(q[4]); return z; }) };
}
function unitObj(D, x, rows, part, parts, withHw, withE) {
  const s = subMats(D, rows, x.U);
  const o = { ...D.head, t: "u", M: s.M, U: [s.U], P: { [x.U[0]]: s.P } };
  if (parts > 1) { o.k = [part, parts]; if (part > 1) { delete o.w; o.U = [s.U.slice(0, 5)]; } } // later parts: just enough to name the unit
  if (withHw) o.H = { [x.U[0]]: x.H };
  if (withE && x.E) o.E = { [x.U[0]]: x.E };
  return o;
}

// ------------------------------------------------------------------ codec: JSON → base64url(deflate-raw) — twin.html reads it back
const b64u = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const canZip = () => typeof CompressionStream === "function" && (() => { try { new CompressionStream("deflate-raw"); return true; } catch { return false; } })();
async function zip(str) {
  const cs = new CompressionStream("deflate-raw");
  const out = new Response(new Blob([new TextEncoder().encode(str)]).stream().pipeThrough(cs));
  return new Uint8Array(await out.arrayBuffer());
}
async function enc(obj) {
  const js = JSON.stringify(obj);
  if (canZip()) return `z=${b64u(await zip(js))}`;
  return `j=${b64u(new TextEncoder().encode(js))}`;
}
const pageUrl = () => (S.cfg.page || DEF.page).replace(/#.*$/, "");
async function urlFor(obj, pre = "") { return `${pageUrl()}#${pre}${await enc(obj)}`; }

/** every QR of the project: main + per unit (split when a unit's list is too long) */
async function build() {
  const D = collect();
  const twin = api.state.project.twin;
  const hosted = !!(S.cfg.hosted && twin?.id && twin.at);
  let main = null, lvl = 0;
  if (hosted) {
    const b = S.cfg.folder && S.cfg.folder !== DEF.folder ? `b=${encodeURIComponent("../" + S.cfg.folder.replace(/^\/|\/$/g, ""))}&` : "";
    // the hosted QR: the id + the units list as a fallback when the file can't be fetched (else just the header)
    for (lvl = 3; lvl <= 5; lvl++) {
      const o = lvl <= 4 ? mainObj(D, lvl, { id: twin.id }) : { ...D.head, t: "m", id: twin.id, x: 1 };
      main = await urlFor(o, `id=${twin.id}&${b}`);
      if (main.length <= MAIN_MAX) break;
    }
  } else {
    for (lvl = 0; lvl <= 4; lvl++) { main = await urlFor(mainObj(D, lvl)); if (main.length <= MAIN_MAX) break; }
    if (main.length > MAIN_MAX) main = await urlFor({ ...D.head, t: "m", M: [], U: D.units.map((x) => [x.U[0], x.U[1], x.U[2], x.U[3], []]), x: 1 });
  }
  const per = [];
  for (const x of D.units) {
    // one label when it fits (hardware + front view first to go), else the list split in equal parts
    let urls = null;
    for (const [hw, el] of [[true, true], [true, false], [false, false]]) {
      const u = await urlFor(unitObj(D, x, x.P, 1, 1, hw, el));
      if (u.length <= UNIT_MAX) { urls = [u]; break; }
    }
    for (let parts = 2; !urls && parts <= 12; parts++) {
      const sz = Math.ceil(x.P.length / parts), list = [];
      for (let i = 0; i < parts; i++) {
        const rows = x.P.slice(i * sz, (i + 1) * sz);
        if (!rows.length) break;
        // a part that starts after a split piece must say its number explicitly
        const rr = rows.map((q, j) => (j === 0 && q.length < 7 ? [...q, String(pieceNo(x.P, i * sz)).padStart(2, "0")] : q));
        const nn = Math.ceil(x.P.length / sz);
        let u = i === 0 ? await urlFor(unitObj(D, x, rr, 1, nn, true, true)) : "";
        if (!u || u.length > UNIT_MAX) u = await urlFor(unitObj(D, x, rr, i + 1, nn, false, false)); // hardware / front view only when they fit
        list.push(u);
      }
      if (list.every((u) => u.length <= UNIT_MAX)) urls = list;
    }
    per.push({ x, urls: urls || [await urlFor({ ...D.head, t: "u", M: [], U: [x.U.slice(0, 4).concat([[]])] })] });
  }
  cache = { D, main, lvl, hosted, per, zip: canZip(), at: Date.now() };
  return cache;
}
/** the running number of the piece at index i (what twin.html computes) */
function pieceNo(rows, i) {
  let n = 0;
  for (let j = 0; j <= i; j++) { const t = rows[j][6]; if (t) n = parseInt(t, 10); else n++; }
  return n;
}
const LVL = ["كل حاجة جوه الكود الرئيسي: الوحدات + الخامات + الرسم + كل القطع + الهاردوير", "الوحدات + الخامات + الرسم + كل القطع (الهاردوير في ملصق كل وحدة)", "الوحدات + الخامات + رسم المطبخ — قايمة القطع في ملصق كل وحدة", "الوحدات + الخامات — الرسم وقايمة القطع في ملصق كل وحدة", "أسماء الوحدات ومقاساتها بس — التفاصيل في ملصق كل وحدة", "رابط النسخة الأونلاين + بيانات المصنع"];

// ------------------------------------------------------------------ QR
function qrInfo(text) {
  try {
    if (typeof qrcode !== "function") return null;
    const q = qrcode(0, "M"); q.addData(text); q.make();
    const n = q.getModuleCount();
    return { n, ver: (n - 17) / 4 };
  } catch { return { n: 0, ver: 99 }; }
}
const qr = (text, px) => { try { return api.qrSvg(text, px) || ""; } catch { return ""; } };
const modMm = (info, mm) => (info?.n ? mm / (info.n + 8) : 0); // printed with a 4-module quiet zone each side

// ------------------------------------------------------------------ panel
async function openPanel() {
  load();
  if (!pop || !pop.el.isConnected) pop = api.popup({ title: "🔗 النسخة الرقمية للمطبخ (QR للعميل)", html: `<p class="hint">بيجهّز…</p>`, onClose: () => { pop = null; } });
  pop.el.onclick = onClick; pop.el.onchange = onChange;
  try { await build(); } catch (err) { console.error(err); pop.set(`<p class="erow">⚠ ${esc(err.message || err)}</p>`); return; }
  draw();
}
function draw(msg = "") {
  if (!pop) return;
  const c = cache, D = c.D, cfg = S.cfg, twin = api.state.project.twin;
  const mi = qrInfo(c.main), mm = modMm(mi, 50);
  const um = Math.max(0, ...c.per.flatMap((p) => p.urls.map((u) => u.length)));
  const labels = c.per.reduce((s, p) => s + p.urls.length, 0);
  const split = c.per.filter((p) => p.urls.length > 1);
  const noPhone = !D.head.p;
  let h = `<div class="modcard"><div class="btnrow" style="margin:0;align-items:center"><span class="pill ${c.hosted ? "gold" : ""}">${c.hosted ? "☁ النسخة الكاملة أونلاين (GitHub Pages — مجاني)" : "🆓 مجاني — كل البيانات جوه الكود نفسه"}</span>
      <span class="pill soft">${c.zip ? "مضغوط" : "من غير ضغط (الجهاز قديم) — ملخص أصغر"}</span></div>
    <p class="hint">${c.hosted ? `الكود الرئيسي بيفتح النسخة اللي اترفعت ${esc((twin.at || "").slice(0, 10))} (كل القطع + الهاردوير + الرسم). لو النت أو الملف مش متاح، الصفحة بتعرض اللي جوه الكود وزراير الطلب شغالة.` : "مش محتاج سيرفر ولا نت عندك: الصفحة بتقرا البيانات من الكود نفسه — تفضل شغالة طول ما الصفحة موجودة."}</p></div>
    ${noPhone ? `<div class="modcard"><p class="erow">⚠ مفيش رقم تليفون/واتساب للمصنع — زراير «طلب صيانة / قطعة» محتاجاه. حطه من «🏷 هوية المصنع» أو بيانات عرض السعر.</p></div>` : ""}
    <div class="modkpis"><div><b>${esc(D.head.f)}</b><span>${esc(D.head.p || "من غير تليفون")}</span></div><div><b>${D.units.length}</b><span>وحدة</span></div><div><b>${D.pieces}</b><span>قطعة</span></div><div><b>${esc(D.head.dt)}</b><span>تاريخ التسليم</span></div></div>
    <div class="modcard" style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><div style="background:#fff;padding:8px;border-radius:10px">${qr(c.main, 150)}</div>
      <div style="flex:1;min-width:220px"><b>الكود الرئيسي (يتلزق جوه دولاب الحوض أو أول وحدة)</b>
      <p class="hint">فيه: ${esc(LVL[c.hosted ? 5 : c.lvl])}.</p>
      <p class="hint">حجم البيانات: <b>${c.main.length}</b> حرف من ${MAIN_MAX} · QR مقاس ${mi?.n || "?"}×${mi?.n || "?"} (إصدار ${mi?.ver || "?"}) · المربع الصغير ≈ ${mm.toFixed(2)} مم لما يتطبع 5 سم ${mm && mm < 0.3 ? "— ⚠ صغير: اطبعه بطابعة كويسة أو كبّره" : "✓"}</p>
      <p class="hint">ملصقات الوحدات: <b>${labels}</b> ملصق لـ ${c.per.length} وحدة (أكبر واحد ${um} حرف)${split.length ? ` · ${split.map((p) => `${esc(p.x.U[0])} على ${p.urls.length} ملصقات`).join(" · ")}` : ""}.</p></div></div>
    <div class="btnrow"><button class="primary" data-tw="pdf">📄 ملصقات QR PDF</button><button class="ghost2" data-tw="open">🔗 افتح الصفحة</button><button class="ghost2" data-tw="copy">📋 انسخ اللينك</button></div>
    <label class="f b"><input type="checkbox" data-twc="client" ${cfg.client ? "checked" : ""}><span>اسم العميل يظهر في الصفحة (مقفول عادي — تليفونه وعنوانه عمرهم ما بيظهروا)</span></label>
    <details class="modcard" ${S.cfgOpen ? "open" : ""}><summary><b>☁ النسخة الكاملة أونلاين (اختياري — مجاني)</b></summary>
      <p class="hint">التكلفة: <b>مفيش</b> — GitHub Pages مجاني. الفرق: الكود الرئيسي بيبقى رابط قصير لصفحة فيها كل القطع والهاردوير والرسم مرة واحدة، والملف تقدر تحدّثه بعدين. محتاج توكن GitHub مرة واحدة (بيتحفظ على الجهاز ده بس). البديل المجاني من غير أي إعداد: الملصقات العادية فوق (كل حاجة جوه الكود).</p>
      <ol class="hint"><li>اعمل توكن: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained token ↗</a> → Repository access: <b>Only select repositories → ${esc(cfg.repo.split("/")[1] || "amr-osman")}</b> → Permissions: <b>Contents: Read and write</b> → Generate.</li>
      <li>الملفات بتتحط في فولدر <b>${esc(cfg.folder)}</b> في الـ repo (لازم يكون عليه GitHub Pages). الصفحة بتظهر للي معاه الكود بس (رقم عشوائي صعب يتخمّن) — من غير تليفون العميل ولا عنوانه.</li></ol>
      <div class="grid2"><label class="f"><span>الـ repo</span><input data-twc="repo" value="${esc(cfg.repo)}" dir="ltr" autocomplete="off"></label><label class="f"><span>الفرع</span><input data-twc="branch" value="${esc(cfg.branch)}" dir="ltr" autocomplete="off"></label>
      <label class="f"><span>الفولدر</span><input data-twc="folder" value="${esc(cfg.folder)}" dir="ltr" autocomplete="off"></label><label class="f"><span>التوكن</span><input data-twc="token" type="password" value="${esc(cfg.token)}" dir="ltr" autocomplete="off" placeholder="github_pat_…"></label></div>
      <label class="f"><span>رابط صفحة العميل</span><input data-twc="page" value="${esc(cfg.page)}" dir="ltr" autocomplete="off"></label>
      <label class="f b"><input type="checkbox" data-twc="hosted" ${cfg.hosted ? "checked" : ""}><span>الكود الرئيسي يفتح النسخة الأونلاين لما تكون اترفعت</span></label>
      <div class="btnrow"><button class="primary" data-tw="upload" ${busy ? "disabled" : ""}>☁ ارفع النسخة الكاملة</button>${cfg.token ? `<button class="ghost2" data-tw="forget">امسح التوكن</button>` : ""}</div>
      ${twin?.id ? `<p class="hint">اترفعت قبل كده: ${esc((twin.at || "—").slice(0, 16).replace("T", " "))} · <span dir="ltr">${esc(twin.id)}</span></p>` : ""}</details>
    ${msg ? `<p class="hint" id="twMsg">${msg}</p>` : ""}`;
  pop.set(h);
}
async function onClick(e) {
  const b = e.target.closest?.("[data-tw]");
  if (!b) return;
  const a = b.dataset.tw;
  if (a === "pdf") { try { api.alertBar("بيجهّز ملصقات الـ QR…"); await exportPdf(); } catch (err) { api.alertBar(err.message || "ما كملش"); } }
  else if (a === "open") openPage(cache.main);
  else if (a === "copy") { try { await navigator.clipboard.writeText(cache.main); api.alertBar("✓ اتنسخ اللينك"); } catch { draw(`<span dir="ltr" style="word-break:break-all">${esc(cache.main)}</span>`); } }
  else if (a === "forget") { S.cfg.token = ""; store(); draw("اتمسح التوكن من الجهاز."); }
  else if (a === "upload") await upload();
}
async function onChange(e) {
  const t = e.target.closest?.("[data-twc]");
  if (!t) return;
  const k = t.dataset.twc;
  S.cfg[k] = t.type === "checkbox" ? t.checked : t.value.trim();
  if (k === "repo") S.cfg.repo = S.cfg.repo.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  if (k === "folder") S.cfg.folder = S.cfg.folder.replace(/^\/|\/$/g, "") || DEF.folder;
  if (k === "page") S.cfg.page = S.cfg.page || DEF.page;
  S.cfgOpen = !["client"].includes(k) || S.cfgOpen;
  store();
  if (["client", "hosted", "folder", "page"].includes(k)) { await build(); draw(); }
}
/** preview: the local copy of twin.html (works offline in the app) with the same data */
function openPage(url) {
  const hash = url.slice(url.indexOf("#"));
  const local = new URL("twin.html", location.href).href + hash;
  const w = window.open(local, "_blank");
  if (!w) location.href = local; // inside the iOS wrapper a new window may be refused
}

// ------------------------------------------------------------------ PDF (A4: the main label + one label per unit, 8 a page)
const PF = `font-family="Geeza Pro, 'IBM Plex Sans Arabic', Arial, Tahoma, sans-serif"`;
const page = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1414" width="1000" height="1414" ${PF}><rect width="1000" height="1414" fill="#fff"/>${inner}</svg>`;
// the page is rasterised at SC px per unit (3200 × 4525 — under the iPad's 16.7 MP canvas limit) and every QR module lands on whole
// pixels (crisp edges, high JPEG quality): a blurry / resampled 150-module code is what makes a phone give up
const SC = 3.2, MMU = 1000 / 210;
function qrAt(text, x, y, mm, maxU) {
  if (typeof qrcode !== "function") return { svg: "", size: 0 };
  let q;
  try { q = qrcode(0, "M"); q.addData(text); q.make(); } catch { return { svg: "", size: 0 }; }
  const n = q.getModuleCount(), m = Math.max(2, Math.round((mm * MMU * SC) / n));
  let px = n * m;
  if (maxU && px / SC > maxU) px = n * Math.max(2, Math.floor((maxU * SC) / n));
  const size = px / SC, X = Math.round(x * SC) / SC, Y = Math.round(y * SC) / SC;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { size, mm: size / MMU, svg: `<svg x="${X}" y="${Y}" width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${d}" fill="#000"/></svg>` };
}
async function pdfOut(pages, title) {
  const W = Math.round(1000 * SC), H = Math.round(1414 * SC), out = [];
  for (const s of pages) out.push({ jpeg: await api.Exp.svgToJpeg(s, W, H, 0.97), w: W, h: H, pw: 595, ph: 842 });
  return api.Exp.pdfFromJpegs(out, title);
}
async function exportPdf() {
  const c = cache || (await build()), D = c.D, H = D.head;
  if (!D.units.length) throw new Error("مفيش وحدات");
  const MM = MMU, pages = [];
  // page 1: the main label (cut along the dashes) + how to use it
  const qm = qrAt(c.main, 0, 0, 50, 260);
  const q0 = qrAt(c.main, 500 - qm.size / 2, 250, 50, 260), yb = 250 + q0.size;
  let t = `<text x="940" y="90" font-size="24" font-weight="800" text-anchor="end">النسخة الرقمية للمطبخ — ملصق الكود الرئيسي</text>
    <text x="940" y="122" font-size="15" fill="#555" text-anchor="end">يتلزق جوه دولاب الحوض أو أول وحدة (مكان نضيف بعيد عن المية) — اطبعه من غير تكبير/تصغير (100%).</text>
    <rect x="200" y="160" width="600" height="${yb + 190 - 160}" rx="22" fill="#fff" stroke="#123f23" stroke-width="3" stroke-dasharray="10 6"/>
    <rect x="200" y="160" width="600" height="70" rx="22" fill="#123f23"/><rect x="200" y="205" width="600" height="25" fill="#123f23"/>
    <text x="780" y="206" font-size="26" font-weight="800" fill="#fff" text-anchor="end">${esc(H.f)}</text>
    <text x="220" y="206" font-size="16" fill="#e9d9b0">NOVERA Studio</text>
    ${q0.svg}
    <text x="500" y="${yb + 40}" font-size="24" font-weight="800" text-anchor="middle">صوّر الكود بالموبايل 📱</text>
    <text x="500" y="${yb + 72}" font-size="17" text-anchor="middle">تصميم مطبخك · وحداته وخاماته · قايمة القطع</text>
    <text x="500" y="${yb + 100}" font-size="17" text-anchor="middle">طلب صيانة · طلب قطعة · إضافة أو تعديل</text>
    <text x="500" y="${yb + 134}" font-size="15" fill="#555" text-anchor="middle">${esc(H.n.slice(0, 40))} · ${esc(H.c)} · ${esc(H.dt)}</text>
    ${H.p ? `<text x="500" y="${yb + 162}" font-size="18" font-weight="700" text-anchor="middle" direction="ltr">${esc(H.p)}</text>` : ""}`;
  t += `<text x="940" y="${yb + 250}" font-size="17" font-weight="700" fill="#123f23" text-anchor="end">في الصفحات الجاية: ملصق لكل وحدة يتلزق جواها — فيه قايمة قطعها بالظبط.</text>
    <text x="940" y="${yb + 280}" font-size="14" fill="#555" text-anchor="end">${c.hosted ? "الكود الرئيسي بيفتح النسخة الكاملة أونلاين." : "كل البيانات جوه الكود نفسه — مش محتاج سيرفر."} الكود ${q0.mm.toFixed(0)} مم · ${c.main.length} حرف.</text>`;
  pages.push(page(t));
  const labels = c.per.flatMap((p) => p.urls.map((u, i) => ({ x: p.x, u, i, n: p.urls.length })));
  for (let i = 0; i < labels.length; i += 8) {
    let g = `<text x="940" y="104" font-size="22" font-weight="800" text-anchor="end">ملصقات الوحدات — كل ملصق يتلزق جوه وحدته</text>`;
    labels.slice(i, i + 8).forEach((L, j) => {
      const col = j % 2, row = Math.floor(j / 2), x = 60 + col * 450, y = 130 + row * 300;
      const q = qrAt(L.u, x + 12, y + 50, 45, 222);
      g += `<rect x="${x}" y="${y}" width="430" height="280" rx="16" fill="#fff" stroke="#123f23" stroke-width="2"/>
        <rect x="${x}" y="${y}" width="430" height="40" rx="16" fill="#123f23"/><rect x="${x}" y="${y + 24}" width="430" height="16" fill="#123f23"/>
        <text x="${x + 410}" y="${y + 28}" font-size="17" font-weight="800" fill="#fff" text-anchor="end">${esc(H.f.slice(0, 22))} — النسخة الرقمية</text>
        ${q.svg}
        <text x="${x + 418}" y="${y + 86}" font-size="28" font-weight="800" text-anchor="end">${esc(L.x.U[0])}</text>
        ${L.n > 1 ? `<text x="${x + 418}" y="${y + 112}" font-size="14" font-weight="700" fill="#8a5a00" text-anchor="end">ملصق ${L.i + 1} من ${L.n}</text>` : ""}
        <text x="${x + 418}" y="${y + 138}" font-size="15" text-anchor="end">${esc(L.x.U[1].slice(0, 18))}</text>
        <text x="${x + 418}" y="${y + 162}" font-size="13" fill="#555" text-anchor="end" direction="ltr">${esc(L.x.U[2])}</text>
        <text x="${x + 418}" y="${y + 200}" font-size="13" font-weight="700" fill="#123f23" text-anchor="end">صوّر الكود:</text>
        <text x="${x + 418}" y="${y + 220}" font-size="12.5" text-anchor="end">قطع الوحدة وخاماتها</text>
        <text x="${x + 418}" y="${y + 238}" font-size="12.5" text-anchor="end">طلب صيانة أو قطعة</text>
        ${H.p ? `<text x="${x + 418}" y="${y + 264}" font-size="13" font-weight="700" text-anchor="end" direction="ltr">${esc(H.p)}</text>` : ""}`;
    });
    pages.push(page(g));
  }
  const bytes = await pdfOut(pages, `${H.n} — النسخة الرقمية`);
  return api.deliver(`${(H.n || "NOVERA").replace(/[\\/:*?"<>|]/g, "_")} — ملصقات النسخة الرقمية QR.pdf`, bytes);
}

// ------------------------------------------------------------------ hosted tier (GitHub contents API)
const rid = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return [...a].map((v) => "abcdefghijkmnpqrstuvwxyz23456789"[v & 31]).join(""); };
async function gh(path, opt = {}) {
  const r = await fetch(`https://api.github.com/repos/${S.cfg.repo}${path}`, {
    ...opt, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${S.cfg.token}`, "X-GitHub-Api-Version": "2022-11-28", ...(opt.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (r.status === 404 && opt.soft) return null;
  if (!r.ok) { const e = new Error(`GitHub ${r.status}`); e.status = r.status; throw e; }
  return r.status === 204 ? {} : r.json();
}
const ghWhy = (e) => e.status === 401 ? "التوكن غلط أو انتهى — اعمل واحد جديد." : e.status === 403 ? "التوكن مش معاه صلاحية «Contents: Read and write» على الـ repo ده." : e.status === 404 ? "الـ repo مش موجود أو التوكن مش شايفه — اتأكد من الاسم وإنك اخترته في التوكن." : e.status === 409 || e.status === 422 ? "الفرع أو الفولدر فيه مشكلة — اتأكد من اسم الفرع." : `ما اترفعش (${e.message || e}). جرّب تاني لما النت يبقى كويس.`;
/** the full twin (no limits): every piece, hardware, front views, the plan drawing */
function fullObj(D) {
  return { ...D.head, t: "f", M: D.M, U: D.units.map((x) => x.U), P: Object.fromEntries(D.units.map((x) => [x.U[0], x.P])), H: Object.fromEntries(D.units.map((x) => [x.U[0], x.H])),
    E: Object.fromEntries(D.units.filter((x) => x.E).map((x) => [x.U[0], x.E])), L: D.room ? { r: D.room, u: D.units.map((x) => x.L) } : undefined, S: planSvg(D) || undefined, at: new Date().toISOString() };
}
async function upload() {
  if (busy) return;
  S.cfgOpen = true;
  if (!S.cfg.token) { store(); draw("⚠ الصق التوكن الأول (الخطوات فوق) — أو استعمل الملصقات المجانية من غير رفع."); return; }
  busy = true; draw("☁ بيرفع…");
  const p = api.state.project;
  try {
    const repo = await gh("");
    p.twin ??= {};
    p.twin.id ||= rid();
    const D = collect(), body = JSON.stringify(fullObj(D));
    const path = `${S.cfg.folder}/${p.twin.id}.json`;
    const old = await gh(`/contents/${path}?ref=${encodeURIComponent(S.cfg.branch)}`, { soft: true });
    const content = b64std(new TextEncoder().encode(body));
    await gh(`/contents/${path}`, { method: "PUT", body: JSON.stringify({ message: `twin ${D.head.c} ${D.head.n}`.slice(0, 120), content, branch: S.cfg.branch, ...(old?.sha ? { sha: old.sha } : {}) }) });
    p.twin.at = new Date().toISOString(); p.twin.size = body.length;
    api.save();
    busy = false;
    await build();
    draw(`✓ اترفعت (${Math.round(body.length / 1024)} ك.ب) على ${esc(repo.full_name || S.cfg.repo)}. GitHub Pages بيحدّث خلال دقيقة أو اتنين — بعدها اطبع الملصقات.${repo.private ? " ⚠ الـ repo خاص — GitHub Pages المجاني بيشتغل على الـ repo العام بس." : ""}`);
  } catch (err) {
    busy = false; console.warn("twin upload", err);
    draw(`⚠ ${esc(ghWhy(err))}`);
  }
}
const b64std = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
/** small plan drawing (the room + every unit's footprint, coloured by row) — the same drawing twin.html makes from L */
function planSvg(D) {
  if (!D.room) return "";
  const pts = D.room.concat(D.units.filter((x) => x.L).flatMap((x) => [[x.L[0], x.L[1]]]));
  const xs = pts.map((q) => q[0]), zs = pts.map((q) => q[1]);
  const x0 = Math.min(...xs) - 30, z0 = Math.min(...zs) - 30, w = Math.max(...xs) - x0 + 30, h = Math.max(...zs) - z0 + 30;
  const FILL = { l: "#cfe3d3", u: "#e9ddb8", t: "#b9cdbf", f: "#dcd6ea" };
  let g = `<polygon points="${D.room.map((q) => q.join(",")).join(" ")}" fill="#f6f4ee" stroke="#333" stroke-width="5"/>`;
  let tx = "";
  for (const x of D.units.filter((q) => q.L).sort((p, q) => (p.U[3] === "u") - (q.U[3] === "u"))) {
    const [cx, cz, a, uw, ud] = x.L, up = x.U[3] === "u", rad = (a * Math.PI) / 180, off = up ? -ud / 4 : ud / 6;
    g += `<g transform="translate(${cx} ${cz}) rotate(${a})"><rect x="${-uw / 2}" y="${-ud / 2}" width="${uw}" height="${ud}" fill="${FILL[x.U[3]] || FILL.f}" fill-opacity="${up ? 0.3 : 0.95}" stroke="${up ? "#9a7a2a" : "#123f23"}" stroke-width="1.5"${up ? ' stroke-dasharray="5 4"' : ""}/>${up ? "" : `<line x1="${-uw / 2}" y1="${ud / 2}" x2="${uw / 2}" y2="${ud / 2}" stroke="#123f23" stroke-width="3"/>`}</g>`;
    tx += `<text x="${Math.round(cx - Math.sin(rad) * off)}" y="${Math.round(cz + Math.cos(rad) * off + 4)}" font-size="${up ? 10 : 12}" text-anchor="middle" font-weight="700" fill="${up ? "#9a7a2a" : "#123f23"}">${esc(x.U[0])}</text>`;
  }
  g += tx;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${z0} ${w} ${h}">${g}</svg>`;
}

// ------------------------------------------------------------------ module
export default {
  init(a) { api = a; load(); },
  destroy() { pop?.close(); pop = null; cache = null; },
  slots: {
    export: () => `<button class="mrow" data-mod="twin:open"><span><b>🔗 النسخة الرقمية (QR للعميل)</b><small class="wrap">ملصق QR جوه الدولاب: العميل يلاقي تصميم مطبخه وقطعه وخاماته بعد سنين، ويطلب صيانة أو قطعة أو إضافة على واتساب. مجاني — من غير سيرفر.</small></span></button>`,
    menu: () => `<button class="mitem" data-mod="twin:open"><span class="mic">🔗</span><span><b>النسخة الرقمية للمطبخ</b><small>QR للعميل جوه الدولاب</small></span></button>`,
  },
  cmd() { return [{ label: "🔗 النسخة الرقمية للمطبخ (QR للعميل)", run: () => openPanel(), hint: "ملصقات QR · صفحة العميل · طلب صيانة" }]; },
  async action(act) { if (act === "open") await openPanel(); else if (act === "pdf") { await build(); await exportPdf(); } },
  // for tests
  _t: { build: () => build(), collect: () => collect(), fullObj: (D) => fullObj(D || collect()), enc, planSvg, get cache() { return cache; }, get S() { return S; } },
};
