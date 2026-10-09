// NOVERA Studio v118 — «💬 كلّم المطوّر»: notes from Amr to the developer, straight from inside the app.
// Write (or dictate) what is wrong / what you want, attach a picture of the 3D or a photo / screenshot from the device, the app adds
// where you are (version, screen, project, selected unit + its code) and — if you want — the whole project file. Notes wait on the
// device until «📤 ابعت الكل»: each one becomes a GitHub issue in a PRIVATE repo (default novera-feedback) through the REST API with
// a fine-grained token kept on this device only. The developer's replies (issue comments) come back into the chat; a closed issue = ✅ done.
const KEY = "novera-devchat";
const DEF_REPO = "donia679-glitch/novera-feedback";
const MARK = "<!-- novera-app-note -->";
let ctx = null, el = null, S = null, busy = false, rec = null;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const uid = () => Math.random().toString(36).slice(2, 10);
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { S = {}; }
  S.cfg ??= { repo: DEF_REPO, token: "" };
  S.notes ??= [];
  S.draft ??= "";
  return S;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { ctx?.alertBar?.("مساحة الجهاز مليانة — ابعت الملاحظات أو امسح القديمة"); } }
/** pictures live in IndexedDB (they can be big), keyed by note id */
const IDB = {
  db: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((ok, no) => { const r = indexedDB.open("novera-devchat", 1); r.onupgradeneeded = () => r.result.createObjectStore("img"); r.onsuccess = () => { this.db = r.result; ok(this.db); }; r.onerror = () => no(r.error); }); },
  async put(k, v) { const db = await this.open(); return new Promise((ok, no) => { const t = db.transaction("img", "readwrite"); t.objectStore("img").put(v, k); t.oncomplete = ok; t.onerror = () => no(t.error); }); },
  async get(k) { const db = await this.open(); return new Promise((ok) => { const r = db.transaction("img").objectStore("img").get(k); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); },
  async del(k) { const db = await this.open(); return new Promise((ok) => { const t = db.transaction("img", "readwrite"); t.objectStore("img").delete(k); t.oncomplete = ok; t.onerror = ok; }); },
};
/** shrink a picture to ≤ 1400 px, JPEG */
function shrink(src, max = 1400) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", 0.82)); };
    im.onerror = () => ok(null);
    im.src = src;
  });
}
export const pending = () => load().notes.filter((n) => n.status !== "sent").length;
export const unread = () => load().notes.reduce((t, n) => t + (n.replies || []).filter((r) => !r.seen).length, 0);
export function open(c) {
  ctx = c;
  load();
  el?.remove();
  el = document.createElement("div");
  el.className = "dchat"; el.id = "dchat";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "كلّم المطوّر");
  document.body.appendChild(el);
  el.addEventListener("click", onClick);
  el.addEventListener("change", onChange);
  el.addEventListener("input", (e) => { if (e.target.id === "dcText") { S.draft = e.target.value; save(); } });
  draw();
  if (S.cfg.token && S.notes.some((n) => n.issue)) sync(true);
}
function close() { try { rec?.stop(); } catch { /* idle */ } el?.remove(); el = null; ctx?.closed?.(); }
const when = (t) => { try { return new Date(t).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); } catch { return ""; } };
function draw() {
  if (!el) return;
  const N = S.notes, wait = N.filter((n) => n.status !== "sent");
  const hasTok = !!S.cfg.token;
  el.innerHTML = `
    <div class="dchead"><b>💬 كلّم المطوّر</b><small>${hasTok ? `بيوصل على ${esc(S.cfg.repo)}` : "لسه مش متوصّل — ⚙ الإعداد"}</small><span class="wcsp"></span>
      ${hasTok ? `<button class="wcb" data-dc="sync" title="هات الردود">🔄</button>` : ""}<button class="wcb" data-dc="cfg" title="الإعداد">⚙</button><button class="wcb" data-dc="close" aria-label="اقفل">✕</button></div>
    <div class="dcbody">${S.cfgOpen || !hasTok && !N.length ? cfgHtml() : ""}
      ${N.length ? N.map(noteHtml).join("") : `<div class="dcempty"><b>اكتب أي مشكلة أو فكرة</b><p>كل ملاحظة بتتسجل معاها النسخة والشاشة اللي أنت فيها والوحدة المختارة. جمّع كذا ملاحظة وابعتهم مرة واحدة — وأنا بقراهم كلهم وأطبّقهم في نسخة واحدة، وردّي بيوصلك هنا.</p></div>`}
    </div>
    <div class="dcfoot">
      <div class="dcatt" id="dcAtt"></div>
      <textarea id="dcText" rows="3" placeholder="اكتب الملاحظة… (مثلاً: لما بفتح «قسّم الحيطة» وأدوس على … بيحصل …)">${esc(S.draft)}</textarea>
      <div class="dcrow">
        ${(window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button class="wcb" data-dc="mic" title="اتكلم وهي تتكتب">🎙<small>بصوتك</small></button>` : ""}
        <button class="wcb" data-dc="shot" title="صورة من الـ3D زي ما أنت شايفه">📷<small>صورة الـ3D</small></button>
        <label class="wcb dcfile" title="صورة أو سكرين شوت من الجهاز">🖼<small>صورة من الجهاز</small><input type="file" accept="image/*" id="dcFile" hidden></label>
        <label class="dcchk"><input type="checkbox" id="dcProj" ${S.withProj ? "checked" : ""}> 📎 ارفق المشروع</label>
        <span class="wcsp"></span>
        <button class="wcb primary" data-dc="add">＋ ضيف الملاحظة</button>
      </div>
      <div class="dcrow send">
        <button class="wcb primary dcsend" data-dc="send" ${wait.length && !busy ? "" : "disabled"}>${busy ? "⏳ بيبعت…" : `📤 ابعت الكل (${wait.length})`}</button>
        <button class="wcb" data-dc="copy" ${N.length ? "" : "disabled"} title="لو مفيش نت أو مش متوصّل: انسخها وابعتها في الشات">📋 انسخ الكل</button>
      </div>
    </div>`;
  paintAtt();
  for (const n of N) if (n.img) IDB.get(n.id).then((src) => { const im = el?.querySelector(`[data-dcimg="${n.id}"]`); if (im && src) im.src = src; });
  const b = el.querySelector(".dcbody"); b.scrollTop = b.scrollHeight;
}
function noteHtml(n) {
  const st = n.closed ? `<span class="dcst ok">✅ اتعمل</span>` : n.status === "sent" ? `<span class="dcst">📤 وصل${n.issue ? ` #${n.issue}` : ""}</span>` : `<span class="dcst wait">⏳ مستني الإرسال</span>`;
  const reps = (n.replies || []).map((r) => `<div class="dcmsg dev"><div class="dcb">${esc(r.body).replace(/\n/g, "<br>")}</div><small>المطوّر · ${when(r.at)}</small></div>`).join("");
  return `<div class="dcmsg me"><div class="dcb">${esc(n.text).replace(/\n/g, "<br>")}${n.img ? `<img data-dcimg="${n.id}" alt="صورة مرفقة">` : ""}
      <div class="dcctx">${esc([n.ctx?.screen, n.ctx?.unit].filter(Boolean).join(" · "))}${n.proj ? " · 📎 المشروع" : ""}</div></div>
    <small>${when(n.at)} · ${st}${n.status !== "sent" ? ` <button class="dclink" data-dcdel="${n.id}">شيلها</button>` : ""}</small></div>${reps}`;
}
function cfgHtml() {
  const c = S.cfg;
  return `<div class="dccfg"><h3>⚙ توصيل الملاحظات بالمطوّر (مرة واحدة)</h3>
    <ol>
      <li>اعمل repo <b>خاص (Private)</b> على GitHub اسمه <b>novera-feedback</b>: <a href="https://github.com/new?name=novera-feedback&visibility=private" target="_blank" rel="noopener">افتح صفحة الإنشاء ↗</a> — خليه <b>Private</b> علشان صور ومشاريع العملاء متبقاش ظاهرة.</li>
      <li>اعمل توكن: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained token ↗</a> → Repository access: <b>Only select repositories → novera-feedback</b> → Permissions: <b>Issues: Read and write</b> و <b>Contents: Read and write</b> → Generate.</li>
      <li>الصق التوكن هنا ودوس «جرّب». التوكن بيتحفظ على الجهاز ده بس.</li>
    </ol>
    <label>الـ repo<input id="dcRepo" value="${esc(c.repo)}" dir="ltr" autocomplete="off"></label>
    <label>التوكن<input id="dcTok" type="password" value="${esc(c.token)}" dir="ltr" autocomplete="off" placeholder="github_pat_…"></label>
    <div class="dcrow"><button class="wcb primary" data-dc="test">جرّب واحفظ</button>${c.token ? `<button class="wcb" data-dc="forget">امسح التوكن</button>` : ""}</div>
    <p class="dcnote" id="dcCfgMsg">${S.cfgMsg ? esc(S.cfgMsg) : ""}</p></div>`;
}
let att = null; // the picture waiting to go with the next note
function paintAtt() {
  const a = el?.querySelector("#dcAtt");
  if (!a) return;
  a.innerHTML = att ? `<img src="${att}" alt=""><button class="dclink" data-dc="unatt">✕ شيل الصورة</button>` : "";
}
async function onChange(e) {
  const t = e.target;
  if (t.id === "dcProj") { S.withProj = t.checked; save(); }
  if (t.id === "dcFile" && t.files?.[0]) {
    const f = t.files[0], r = new FileReader();
    r.onload = async () => { att = await shrink(r.result); paintAtt(); };
    r.readAsDataURL(f);
  }
}
async function onClick(e) {
  const t = e.target.closest("[data-dc],[data-dcdel]");
  if (!t) return;
  if (t.dataset.dcdel) { const id = t.dataset.dcdel; S.notes = S.notes.filter((n) => n.id !== id); IDB.del(id); save(); draw(); return; }
  const a = t.dataset.dc;
  if (a === "close") { close(); return; }
  if (a === "cfg") { S.cfgOpen = !S.cfgOpen; save(); draw(); return; }
  if (a === "unatt") { att = null; paintAtt(); return; }
  if (a === "shot") { try { const src = ctx.shot?.(); if (!src) { ctx.alertBar("مفيش 3D مفتوح دلوقتي — استخدم «صورة من الجهاز»"); return; } att = await shrink(src); paintAtt(); } catch { ctx.alertBar("مقدرتش آخد صورة من الـ3D"); } return; }
  if (a === "mic") { mic(t); return; }
  if (a === "add") {
    const ta = el.querySelector("#dcText"), text = ta.value.trim();
    if (!text && !att) { ctx.alertBar("اكتب الملاحظة الأول"); return; }
    const n = { id: uid(), at: Date.now(), text: text || "(صورة)", ctx: ctx.context?.() || {}, status: "wait", proj: !!S.withProj };
    if (att) { await IDB.put(n.id, att); n.img = true; }
    if (n.proj) { try { await IDB.put(n.id + "-p", ctx.project?.() || null); } catch { n.proj = false; } }
    S.notes.push(n); S.draft = ""; S.withProj = false; att = null; save(); draw();
    ctx.alertBar(S.cfg.token ? "✓ اتضافت — جمّع اللي عندك ودوس «📤 ابعت الكل»" : "✓ اتضافت — وصّل الإعداد ⚙ علشان تتبعت، أو «📋 انسخ الكل»");
    return;
  }
  if (a === "copy") { copyAll(); return; }
  if (a === "test") { await testCfg(); return; }
  if (a === "forget") { S.cfg.token = ""; S.cfgMsg = "اتمسح التوكن من الجهاز."; save(); draw(); return; }
  if (a === "send") { await sendAll(); return; }
  if (a === "sync") { await sync(false); return; }
}
function mic(btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  if (rec) { rec.stop(); return; }
  const ta = el.querySelector("#dcText"), base = ta.value ? ta.value + " " : "";
  rec = new SR();
  rec.lang = "ar-EG"; rec.interimResults = true; rec.continuous = true;
  btn.classList.add("on");
  rec.onresult = (ev) => { let s = ""; for (const r of ev.results) s += r[0].transcript; ta.value = base + s; S.draft = ta.value; save(); };
  rec.onend = () => { rec = null; btn.classList.remove("on"); };
  rec.onerror = () => { rec = null; btn.classList.remove("on"); ctx.alertBar("الميكروفون مش متاح هنا — اكتبها"); };
  try { rec.start(); } catch { rec = null; btn.classList.remove("on"); }
}
function noteText(n) {
  const c = n.ctx || {};
  const rows = [["النسخة", c.version], ["الشاشة", c.screen], ["المشروع", c.project], ["الوحدة", c.unit], ["أخطاء/ملاحظات", c.errs], ["الجهاز", c.device]].filter(([, v]) => v);
  return `${n.text}\n\n${rows.map(([k, v]) => `- ${k}: ${v}`).join("\n")}`;
}
async function copyAll() {
  const txt = S.notes.filter((n) => n.status !== "sent" || !n.closed).map((n, i) => `${i + 1}) ${noteText(n)}`).join("\n\n———\n\n");
  try { await navigator.clipboard.writeText(txt); ctx.alertBar("📋 اتنسخت — الصقها في الشات مع المطوّر"); }
  catch { if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else ctx.alertBar("مقدرتش أنسخ — جرّب تاني"); }
}
// ---------------------------------------------------------------- GitHub
async function gh(path, opt = {}) {
  const r = await fetch(`https://api.github.com/repos/${S.cfg.repo}${path}`, {
    ...opt, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${S.cfg.token}`, "X-GitHub-Api-Version": "2022-11-28", ...(opt.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!r.ok) { let m = ""; try { m = (await r.json()).message; } catch { /* no body */ } const e = new Error(`${r.status} ${m}`); e.status = r.status; throw e; }
  return r.status === 204 ? null : r.json();
}
const b64 = (s) => { const u = new TextEncoder().encode(s); let out = ""; for (let i = 0; i < u.length; i += 0x8000) out += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(out); };
function errText(e) {
  if (e.status === 401) return "التوكن غلط أو انتهى — اعمل واحد جديد.";
  if (e.status === 403) return "التوكن مش معاه صلاحية — لازم Issues و Contents: Read and write على novera-feedback.";
  if (e.status === 404) return "الـ repo مش موجود أو التوكن مش شايفه — اتأكد من الاسم وإنك اخترته في التوكن.";
  return "مفيش نت أو GitHub مش بيرد — جرّب تاني بعد شوية. (" + e.message + ")";
}
async function testCfg() {
  S.cfg.repo = (el.querySelector("#dcRepo")?.value || DEF_REPO).trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  S.cfg.token = (el.querySelector("#dcTok")?.value || "").trim();
  if (!S.cfg.token) { S.cfgMsg = "الصق التوكن الأول."; save(); draw(); return; }
  S.cfgMsg = "⏳ بيجرّب…"; draw();
  try {
    const r = await gh("");
    S.cfgMsg = r.private ? `✓ تمام — متوصّل بـ ${r.full_name} (خاص). الملاحظات هتتبعت هناك.` : `⚠ متوصّل، بس ${r.full_name} عام (Public) — أي حد يقدر يشوف الملاحظات والصور. خليه Private من Settings الـ repo.`;
    if (r.private) S.cfgOpen = false;
  } catch (e) { S.cfgMsg = "✗ " + errText(e); }
  save(); draw();
}
async function sendAll() {
  if (!S.cfg.token) { S.cfgOpen = true; save(); draw(); ctx.alertBar("وصّل الإعداد الأول (⚙) — أو «📋 انسخ الكل»"); return; }
  if (busy) return;
  busy = true; draw();
  let ok = 0, fail = null;
  for (const n of S.notes.filter((x) => x.status !== "sent")) {
    try {
      const folder = `notes/${new Date(n.at).toISOString().slice(0, 10)}`;
      let imgMd = "", projMd = "";
      if (n.img) {
        const src = await IDB.get(n.id);
        if (src) { const r = await gh(`/contents/${folder}/${n.id}.jpg`, { method: "PUT", body: JSON.stringify({ message: `note ${n.id}: picture`, content: src.split(",")[1] }) }); imgMd = `\n\n![صورة](${r.content.html_url}?raw=true)\n\`${r.content.path}\``; }
      }
      if (n.proj) {
        const pj = await IDB.get(n.id + "-p");
        if (pj) { const r = await gh(`/contents/${folder}/${n.id}-project.json`, { method: "PUT", body: JSON.stringify({ message: `note ${n.id}: project`, content: b64(pj) }) }); projMd = `\n\n📎 ملف المشروع: \`${r.content.path}\``; }
      }
      const c = n.ctx || {};
      const title = `[NOVERA ${c.version || ""}] ${n.text.replace(/\s+/g, " ").slice(0, 70)}`;
      const body = `${MARK}\n${n.text}${imgMd}${projMd}\n\n| | |\n|---|---|\n${[["النسخة", c.version], ["الشاشة", c.screen], ["المشروع", c.project], ["الوحدة", c.unit], ["أخطاء/ملاحظات", c.errs], ["الجهاز", c.device], ["الوقت", new Date(n.at).toISOString()]].filter(([, v]) => v).map(([k, v]) => `| ${k} | ${String(v).replace(/\|/g, "/")} |`).join("\n")}`;
      const is = await gh("/issues", { method: "POST", body: JSON.stringify({ title, body }) });
      n.status = "sent"; n.issue = is.number; n.url = is.html_url; n.sentAt = Date.now();
      if (n.img) { /* keep the picture on the device for the chat view */ }
      IDB.del(n.id + "-p");
      ok++;
      save();
    } catch (e) { fail = e; break; }
  }
  busy = false;
  draw();
  ctx.alertBar(fail ? `${ok ? `اتبعت ${ok} · ` : ""}✗ ${errText(fail)}` : `📤 اتبعت ${ok} ملاحظة — المطوّر هيشوفهم ويرد عليك هنا`);
}
async function sync(quiet) {
  if (!S.cfg.token) return;
  try {
    const mine = S.notes.filter((n) => n.issue);
    let news = 0;
    for (const n of mine) {
      const is = await gh(`/issues/${n.issue}`);
      n.closed = is.state === "closed";
      if (is.comments > (n.replies || []).length) {
        const cm = await gh(`/issues/${n.issue}/comments?per_page=100`);
        const old = new Set((n.replies || []).map((r) => r.id));
        n.replies = cm.map((x) => ({ id: x.id, at: x.created_at, body: x.body, seen: old.has(x.id) }));
        news += cm.filter((x) => !old.has(x.id)).length;
      }
    }
    save();
    if (el) { draw(); for (const n of S.notes) for (const r of n.replies || []) r.seen = true; save(); }
    if (!quiet || news) ctx.alertBar(news ? `💬 ${news} رد جديد من المطوّر` : "مفيش ردود جديدة لسه");
  } catch (e) { if (!quiet) ctx.alertBar("✗ " + errText(e)); }
}
