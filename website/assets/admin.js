/* NOVERA — shop control panel (admin.html). Edits the catalogue (assets/store-data.json): prices, what is shown, products, photos,
   categories, finishes. Edits are kept as a draft on this device; «انشر» writes them to the site's GitHub repository
   (the site is static — GitHub Pages republishes in about a minute). Nothing here is visible to visitors until it is published. */
(function () {
  "use strict";
  const N = window.NOVERA;
  const { $, $$, t, store } = N;
  const DRAFT = "novera-store-draft", PIN = "novera-admin-pin", GH = "novera-admin-gh", PUB = "novera-admin-published";
  let D = null, base = "", tab = "products", q = "", catF = "all", editing = null;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const load = (k, d) => { try { return JSON.parse(store.get(k) || "null") ?? d; } catch { return d; } };
  const save = (k, v) => store.set(k, JSON.stringify(v));
  const num = (v) => { const x = parseFloat(String(v).replace(/[^\d.]/g, "")); return isFinite(x) && x > 0 ? x : null; };
  const money = (v) => (v == null ? "—" : `${Math.round(v).toLocaleString("en-US")} ${D.currency?.ar || "ج.م"}`);
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "p" + Date.now().toString(36);
  async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("novera:" + s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
  const dirty = () => JSON.stringify(D) !== base;

  // ------------------------------------------------------------------ lock
  function lock() {
    const has = !!store.get(PIN);
    $("#adm").innerHTML = `<div class="adm-lock"><form id="pinForm" class="adm-card">
      <h1>${t("لوحة تحكم المتجر", "Shop control panel")}</h1>
      <p class="muted">${has ? t("اكتب الرقم السري بتاعك.", "Enter your PIN.") : t("أول مرة: اختار رقم سري (4 أرقام أو أكتر) يقفل اللوحة على الجهاز ده.", "First time: choose a PIN (4+ digits) that locks the panel on this device.")}</p>
      <input id="pin" type="password" inputmode="numeric" autocomplete="${has ? "current-password" : "new-password"}" placeholder="••••" aria-label="${t("الرقم السري", "PIN")}">
      ${has ? "" : `<input id="pin2" type="password" inputmode="numeric" autocomplete="new-password" placeholder="${t("كرره تاني", "Repeat it")}" aria-label="${t("كرر الرقم السري", "Repeat PIN")}">`}
      <p class="form-err" hidden></p>
      <button class="btn" type="submit">${has ? t("ادخل", "Enter") : t("احفظ وادخل", "Save and enter")}</button>
      <p class="note">${t("الرقم السري بيقفل اللوحة على الجهاز ده بس. النشر على الموقع محتاج مفتاح GitHub بتاعك — من غيره محدش يقدر يغيّر حاجة في الموقع.", "The PIN locks this device only. Publishing needs your GitHub key — without it nobody can change the site.")}</p>
    </form></div>`;
    $("#pin").focus();
    $("#pinForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = $("#pin").value.trim(), err = $(".form-err");
      if (p.length < 4) { err.hidden = false; err.textContent = t("الرقم السري 4 أرقام على الأقل.", "The PIN needs at least 4 digits."); return; }
      if (!has) {
        if (p !== $("#pin2").value.trim()) { err.hidden = false; err.textContent = t("الرقمين مش زي بعض.", "The two PINs differ."); return; }
        store.set(PIN, await sha(p));
      } else if (await sha(p) !== store.get(PIN)) { err.hidden = false; err.textContent = t("الرقم السري غلط.", "Wrong PIN."); $("#pin").select(); return; }
      sessionStorage.setItem("novera-admin-ok", "1");
      start();
    });
  }

  // ------------------------------------------------------------------ data
  async function fetchPublished() { return (await fetch(`assets/store-data.json?v=${Date.now()}`, { cache: "no-store" })).json(); }
  async function start() {
    const pub = await fetchPublished().catch(() => null);
    const draft = load(DRAFT, null);
    D = draft || pub;
    if (!D) { $("#adm").innerHTML = `<p class="adm-card">${t("مش لاقي ملف المتجر (assets/store-data.json).", "Can't find the shop file (assets/store-data.json).")}</p>`; return; }
    base = JSON.stringify(pub || D);
    render();
    window.addEventListener("beforeunload", (e) => { if (dirty() && !load(DRAFT, null)) { e.preventDefault(); e.returnValue = ""; } });
  }
  let saveT = 0;
  function touch(redraw = false) {
    clearTimeout(saveT);
    saveT = setTimeout(() => { save(DRAFT, D); status(); }, 250);
    if (redraw) render(); else status();
  }
  function status() {
    const s = $("#admStatus"); if (!s) return;
    const d = dirty();
    s.className = "adm-status " + (d ? "warn" : "ok");
    s.textContent = d ? t("في تعديلات لسه ما اتنشرتش — محفوظة على الجهاز ده", "Unpublished changes — saved on this device") : t("كل حاجة منشورة على الموقع", "Everything is published");
  }

  // ------------------------------------------------------------------ layout
  function render() {
    const tabs = [["products", t("المنتجات والأسعار", "Products & prices")], ["cats", t("الأقسام والتشطيبات", "Categories & finishes")], ["publish", t("الإعدادات والنشر", "Settings & publishing")]];
    $("#adm").innerHTML = `
      <div class="adm-top">
        <div><h1>${t("لوحة تحكم المتجر", "Shop control panel")}</h1><p id="admStatus" class="adm-status"></p></div>
        <div class="hero-actions">
          <a class="btn ghost" href="store.html?preview" target="_blank" rel="noopener">${t("معاينة المتجر", "Preview the shop")}</a>
          <button class="btn brass" type="button" data-act="publish">${t("انشر على الموقع", "Publish to the site")}</button>
        </div>
      </div>
      <div class="adm-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${tab === k}">${l}</button>`).join("")}</div>
      <div id="admBody"></div>`;
    ({ products: products, cats: cats, publish: publishTab })[tab]();
    status();
  }

  // ------------------------------------------------------------------ products
  function products() {
    const P = D.products.filter((p) => (catF === "all" || p.cat === catF) && (!q || (p.name.ar + " " + p.name.en).toLowerCase().includes(q.toLowerCase())));
    const priced = D.products.filter((p) => p.price > 0).length;
    $("#admBody").innerHTML = `
      <div class="adm-tools">
        <input type="search" id="aq" value="${esc(q)}" placeholder="${t("ابحث باسم المنتج", "Search by name")}" aria-label="${t("بحث", "Search")}">
        <select id="acat" aria-label="${t("القسم", "Category")}"><option value="all">${t("كل الأقسام", "All categories")}</option>${D.categories.map((c) => `<option value="${esc(c.id)}"${catF === c.id ? " selected" : ""}>${esc(c.ar)}</option>`).join("")}</select>
        <button class="btn" type="button" data-act="new">＋ ${t("منتج جديد", "New product")}</button>
      </div>
      <p class="note">${t(`${D.products.length} منتج · ${priced} متسعّر · ${D.products.filter((p) => p.visible === false).length} مخفي. اللي من غير سعر بيظهر للزوار «السعر عند الطلب».`, `${D.products.length} products · ${priced} priced · ${D.products.filter((p) => p.visible === false).length} hidden. Products without a price show "Price on request".`)}</p>
      <details class="adm-bulk"><summary>${t("تغيير الأسعار مرة واحدة (نسبة %)", "Change prices at once (%)")}</summary>
        <div class="adm-tools"><select id="bcat"><option value="all">${t("كل المنتجات المتسعّرة", "All priced products")}</option>${D.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.ar)}</option>`).join("")}</select>
        <input id="bpct" type="number" step="1" placeholder="${t("مثلاً 10 أو -5", "e.g. 10 or -5")}" aria-label="%">
        <select id="bround"><option value="50">${t("قرّب لأقرب 50", "Round to 50")}</option><option value="100">${t("قرّب لأقرب 100", "Round to 100")}</option><option value="1">${t("من غير تقريب", "No rounding")}</option></select>
        <button class="btn ghost" type="button" data-act="bulk">${t("طبّق", "Apply")}</button></div></details>
      <div class="adm-list">${P.map((p) => row(p)).join("") || `<p class="muted">${t("مفيش منتجات بالبحث ده.", "No products match.")}</p>`}</div>`;
  }
  function row(p) {
    const i = D.products.indexOf(p);
    const badge = (v, l) => `<option value="${v}"${(p.badge || "") === v ? " selected" : ""}>${l}</option>`;
    return `<div class="adm-row${p.visible === false ? " off" : ""}" data-i="${i}">
      <img src="${esc(p.images[0] || "")}" alt="" width="96" height="72">
      <div class="adm-name"><b>${esc(p.name.ar)}</b><small>${esc(D.categories.find((c) => c.id === p.cat)?.ar || p.cat)} · ${p.unit === "meter" ? t("بالمتر", "per metre") : t("بالقطعة", "per piece")}</small></div>
      <label class="adm-f"><span>${t("السعر", "Price")}</span><input class="num" inputmode="decimal" data-f="price" value="${p.price ?? ""}" placeholder="${t("عند الطلب", "on request")}"></label>
      <label class="adm-f"><span>${t("قبل الخصم", "Was")}</span><input class="num" inputmode="decimal" data-f="old_price" value="${p.old_price ?? ""}" placeholder="—"></label>
      <label class="adm-f"><span>${t("علامة", "Badge")}</span><select data-f="badge">${badge("", "—")}${badge("new", t("جديد", "New"))}${badge("best", t("الأكثر طلباً", "Best seller"))}${badge("offer", t("عرض", "Offer"))}</select></label>
      <label class="adm-sw"><input type="checkbox" data-f="visible"${p.visible !== false ? " checked" : ""}><span>${t("ظاهر", "Shown")}</span></label>
      <label class="adm-sw"><input type="checkbox" data-f="featured"${p.featured ? " checked" : ""}><span>${t("مميز", "Featured")}</span></label>
      <div class="adm-acts">
        <button type="button" class="iconbtn" data-act="up" aria-label="${t("لفوق", "Up")}">↑</button>
        <button type="button" class="iconbtn" data-act="down" aria-label="${t("لتحت", "Down")}">↓</button>
        <button type="button" class="btn ghost sm" data-act="edit">${t("تعديل", "Edit")}</button>
      </div>
    </div>`;
  }

  // ------------------------------------------------------------------ product editor
  function blank() {
    return { id: "", cat: D.categories[0]?.id || "", name: { ar: "", en: "" }, desc: { ar: "", en: "" }, materials: { ar: "", en: "" }, dims: { w: null, d: null, h: null },
      images: [], unit: "piece", price: null, old_price: null, badge: "new", visible: true, featured: false, finishes: true, lead_days: 14 };
  }
  function openEditor(i) {
    editing = i == null ? { i: null, p: blank() } : { i, p: JSON.parse(JSON.stringify(D.products[i])) };
    drawEditor();
    $("#ped").showModal();
  }
  function drawEditor() {
    const p = editing.p;
    const f = (k, l, v, ph = "", type = "text") => `<label class="field"><span class="lbl">${l}</span><input data-e="${k}" type="${type}" value="${esc(v ?? "")}" placeholder="${esc(ph)}"></label>`;
    const ta = (k, l, v) => `<label class="field full"><span class="lbl">${l}</span><textarea data-e="${k}" rows="3">${esc(v ?? "")}</textarea></label>`;
    $("#pedBody").innerHTML = `
      <h2>${editing.i == null ? t("منتج جديد", "New product") : t("تعديل المنتج", "Edit product")}</h2>
      <div class="adm-imgs">${p.images.map((s, k) => `<figure><img src="${esc(s)}" alt="" width="160" height="120"><figcaption>
        <button type="button" class="iconbtn" data-img="left:${k}" aria-label="${t("قبل", "Earlier")}">→</button>
        <button type="button" class="iconbtn" data-img="right:${k}" aria-label="${t("بعد", "Later")}">←</button>
        <button type="button" class="iconbtn" data-img="del:${k}" aria-label="${t("امسح", "Delete")}">✕</button></figcaption></figure>`).join("")}
        <label class="adm-add">＋<span>${t("صور", "Photos")}</span><input type="file" accept="image/*" multiple id="pedFiles" hidden></label></div>
      <p class="note">${t("أول صورة هي اللي بتظهر في الكارت، والتانية بتظهر لما الزائر يقف عليه. الصور بتتظبط تلقائي على 1200×900.", "The first photo shows on the card, the second on hover. Photos are fitted to 1200×900 automatically.")}</p>
      <div class="form">
        ${f("name.ar", t("الاسم (عربي)", "Name (Arabic)"), p.name.ar)}${f("name.en", t("الاسم (English)", "Name (English)"), p.name.en)}
        <label class="field"><span class="lbl">${t("القسم", "Category")}</span><select data-e="cat">${D.categories.map((c) => `<option value="${esc(c.id)}"${p.cat === c.id ? " selected" : ""}>${esc(c.ar)}</option>`).join("")}</select></label>
        <label class="field"><span class="lbl">${t("بيتسعّر بـ", "Priced per")}</span><select data-e="unit"><option value="piece"${p.unit !== "meter" ? " selected" : ""}>${t("القطعة", "piece")}</option><option value="meter"${p.unit === "meter" ? " selected" : ""}>${t("المتر الطولي", "running metre")}</option></select></label>
        ${f("price", t("السعر (ج.م)", "Price (EGP)"), p.price, t("فاضي = عند الطلب", "empty = on request"))}${f("old_price", t("السعر قبل الخصم", "Price before discount"), p.old_price, "—")}
        ${f("dims.w", t("العرض سم", "Width cm"), p.dims?.w)}${f("dims.d", t("العمق سم", "Depth cm"), p.dims?.d)}${f("dims.h", t("الارتفاع سم", "Height cm"), p.dims?.h)}${f("lead_days", t("مدة التنفيذ (يوم)", "Lead time (days)"), p.lead_days)}
        ${ta("desc.ar", t("الوصف (عربي)", "Description (Arabic)"), p.desc.ar)}${ta("desc.en", t("الوصف (English)", "Description (English)"), p.desc.en)}
        ${f("materials.ar", t("الخامات (عربي)", "Materials (Arabic)"), p.materials.ar)}${f("materials.en", t("الخامات (English)", "Materials (English)"), p.materials.en)}
        <label class="toggle full"><input type="checkbox" data-e="finishes"${p.finishes ? " checked" : ""}> <span>${t("الزائر يختار التشطيب (HPL / أكريليك / قشرة) والسعر يتغيّر بنسبة التشطيب", "Visitors choose the finish and the price follows the finish percentage")}</span></label>
      </div>
      <p class="form-err" hidden></p>
      <div class="hero-actions adm-ped-acts">
        <button class="btn" type="button" data-pe="ok">${t("احفظ", "Save")}</button>
        <button class="btn ghost" type="button" data-pe="cancel">${t("إلغاء", "Cancel")}</button>
        ${editing.i != null ? `<button class="btn ghost" type="button" data-pe="dup">${t("نسخة منه", "Duplicate")}</button><button class="btn ghost danger" type="button" data-pe="del">${t("امسح المنتج", "Delete product")}</button>` : ""}
      </div>`;
  }
  function setPath(o, path, v) { const k = path.split("."); let x = o; for (const a of k.slice(0, -1)) x = x[a] ??= {}; x[k[k.length - 1]] = v; }
  async function fitImage(file) {
    const bm = await createImageBitmap(file);
    const W = 1200, H = 900, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"), s = Math.max(W / bm.width, H / bm.height);
    g.fillStyle = "#ecebe6"; g.fillRect(0, 0, W, H);
    g.drawImage(bm, (W - bm.width * s) / 2, (H - bm.height * s) / 2, bm.width * s, bm.height * s);
    let url = c.toDataURL("image/webp", 0.84);
    if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/jpeg", 0.86);
    return url;
  }

  // ------------------------------------------------------------------ categories & finishes
  function cats() {
    $("#admBody").innerHTML = `
      <div class="adm-cols">
        <section class="adm-card"><h2>${t("الأقسام", "Categories")}</h2>
          ${D.categories.map((c, i) => `<div class="adm-mini" data-ci="${i}">
            <input data-c="ar" value="${esc(c.ar)}" aria-label="${t("بالعربي", "Arabic")}"><input data-c="en" value="${esc(c.en)}" aria-label="English">
            <span class="muted num">${D.products.filter((p) => p.cat === c.id).length}</span>
            <button type="button" class="iconbtn" data-c-act="up" aria-label="${t("لفوق", "Up")}">↑</button>
            <button type="button" class="iconbtn" data-c-act="del" aria-label="${t("امسح", "Delete")}">✕</button></div>`).join("")}
          <button class="btn ghost" type="button" data-act="addcat">＋ ${t("قسم جديد", "New category")}</button>
          <p class="note">${t("قسم فيه منتجات مش بيتمسح — انقل منتجاته لقسم تاني الأول.", "A category with products can't be deleted — move its products first.")}</p></section>
        <section class="adm-card"><h2>${t("التشطيبات", "Finishes")}</h2>
          <p class="note">${t("النسبة بتتضاف على سعر المنتج لما الزائر يختار التشطيب ده (أول تشطيب هو الأساسي، نسبته 0).", "The percentage is added to the product price when a visitor picks that finish (the first is the base, 0%).")}</p>
          ${D.finishes.map((f, i) => `<div class="adm-mini" data-fi="${i}">
            <input data-fn="ar" value="${esc(f.ar)}" aria-label="${t("الاسم", "Name")}"><input data-fn="en" value="${esc(f.en)}" aria-label="English">
            <label class="adm-pct"><input data-fn="pct" class="num" inputmode="decimal" value="${f.pct ?? 0}" aria-label="%">%</label>
            <button type="button" class="iconbtn" data-f-act="del" aria-label="${t("امسح", "Delete")}">✕</button>
            <input class="wide" data-fn="note_ar" value="${esc(f.note_ar || "")}" placeholder="${t("سطر عن التشطيب (عربي)", "One line about it (Arabic)")}">
            <input class="wide" data-fn="note_en" value="${esc(f.note_en || "")}" placeholder="One line about it (English)"></div>`).join("")}
          <button class="btn ghost" type="button" data-act="addfin">＋ ${t("تشطيب جديد", "New finish")}</button></section>
      </div>`;
  }

  // ------------------------------------------------------------------ settings & publishing
  function publishTab() {
    const gh = load(GH, {}), last = load(PUB, null), S = D.settings || (D.settings = {});
    $("#admBody").innerHTML = `
      <div class="adm-cols">
        <section class="adm-card"><h2>${t("إعدادات المتجر", "Shop settings")}</h2>
          <div class="form">
            <label class="field"><span class="lbl">${t("العملة (عربي)", "Currency (Arabic)")}</span><input data-s="currency.ar" value="${esc(D.currency?.ar)}"></label>
            <label class="field"><span class="lbl">${t("العملة (English)", "Currency (English)")}</span><input data-s="currency.en" value="${esc(D.currency?.en)}"></label>
            <label class="field"><span class="lbl">${t("المقدم عند التعاقد %", "Deposit %")}</span><input data-s="settings.deposit_pct" class="num" inputmode="decimal" value="${esc(S.deposit_pct ?? "")}"></label>
            <span></span>
            <label class="field full"><span class="lbl">${t("ملاحظة الأسعار (عربي)", "Price note (Arabic)")}</span><textarea data-s="settings.note.ar" rows="2">${esc(S.note?.ar)}</textarea></label>
            <label class="field full"><span class="lbl">${t("ملاحظة الأسعار (English)", "Price note (English)")}</span><textarea data-s="settings.note.en" rows="2">${esc(S.note?.en)}</textarea></label>
            <label class="field full"><span class="lbl">${t("التوصيل والتركيب (عربي)", "Delivery (Arabic)")}</span><input data-s="settings.delivery.ar" value="${esc(S.delivery?.ar)}"></label>
            <label class="field full"><span class="lbl">${t("التوصيل والتركيب (English)", "Delivery (English)")}</span><input data-s="settings.delivery.en" value="${esc(S.delivery?.en)}"></label>
          </div></section>
        <section class="adm-card"><h2>${t("النشر على الموقع", "Publishing")}</h2>
          <p class="note">${t("الموقع متخزن على GitHub. اعمل مرة واحدة «مفتاح» (Fine-grained token) بصلاحية Contents: Read and write على مستودع الموقع بس، والصقه هنا — بيتحفظ على الجهاز ده بس.", "The site lives on GitHub. Create a fine-grained token once, with Contents: Read and write on the site repository only, and paste it here — it stays on this device.")}</p>
          <div class="form">
            <label class="field"><span class="lbl">${t("المستودع (owner/repo)", "Repository (owner/repo)")}</span><input id="ghRepo" value="${esc(gh.repo || "")}" placeholder="novera/novera-site" dir="ltr"></label>
            <label class="field"><span class="lbl">${t("الفرع", "Branch")}</span><input id="ghBranch" value="${esc(gh.branch || "main")}" dir="ltr"></label>
            <label class="field"><span class="lbl">${t("فولدر الموقع جوه المستودع", "Site folder in the repo")}</span><input id="ghDir" value="${esc(gh.dir || "")}" placeholder="${t("فاضي = أول المستودع", "empty = repo root")}" dir="ltr"></label>
            <label class="field"><span class="lbl">${t("المفتاح (token)", "Token")}</span><input id="ghToken" type="password" value="${esc(gh.token || "")}" autocomplete="off" dir="ltr" placeholder="github_pat_…"></label>
          </div>
          <div class="hero-actions"><button class="btn ghost" type="button" data-act="ghsave">${t("احفظ وجرّب الاتصال", "Save and test")}</button><button class="btn brass" type="button" data-act="publish">${t("انشر على الموقع", "Publish to the site")}</button></div>
          <p class="note" id="ghOut">${last ? t(`آخر نشر: ${new Date(last).toLocaleString("ar-EG-u-nu-latn")}`, `Last published: ${new Date(last).toLocaleString("en-GB")}`) : ""}</p>
        </section>
        <section class="adm-card"><h2>${t("نسخ احتياطية", "Backups")}</h2>
          <div class="hero-actions">
            <button class="btn ghost" type="button" data-act="export">${t("نزّل نسخة من المتجر", "Download a copy")}</button>
            <label class="btn ghost">${t("افتح نسخة", "Open a copy")}<input type="file" accept="application/json,.json" id="impFile" hidden></label>
            <button class="btn ghost danger" type="button" data-act="discard">${t("الغي تعديلاتي وارجع للمنشور", "Discard my edits")}</button>
          </div>
          <p class="note">${t("لو مش عايز تستخدم GitHub: نزّل النسخة (store-data.json) وارفعها مكان assets/store-data.json على الاستضافة.", "Without GitHub: download the copy (store-data.json) and upload it over assets/store-data.json on your hosting.")}</p>
          <h3 style="margin-top:18px">${t("الرقم السري", "PIN")}</h3>
          <button class="btn ghost" type="button" data-act="pin">${t("غيّر الرقم السري", "Change PIN")}</button>
        </section>
      </div>`;
  }
  function ghConf() { return { repo: $("#ghRepo")?.value.trim() || load(GH, {}).repo, branch: ($("#ghBranch")?.value.trim() || load(GH, {}).branch || "main"), dir: ($("#ghDir")?.value.trim() ?? load(GH, {}).dir ?? "").replace(/^\/|\/$/g, ""), token: $("#ghToken")?.value.trim() || load(GH, {}).token }; }
  async function gh(c, method, path, body) {
    const r = await fetch(`https://api.github.com/repos/${c.repo}/contents/${path}${method === "GET" ? `?ref=${encodeURIComponent(c.branch)}` : ""}`, {
      method, headers: { Authorization: `Bearer ${c.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 404 && method === "GET") return null;
    if (!r.ok) throw new Error(`${r.status} ${(await r.json().catch(() => ({}))).message || ""}`.trim());
    return r.json();
  }
  const b64 = (s) => { const b = new TextEncoder().encode(s); let x = ""; for (let i = 0; i < b.length; i += 0x8000) x += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(x); };
  async function publish() {
    const c = ghConf();
    const out = $("#ghOut") || { set textContent(v) { N.toast(v); } };
    if (!c.repo || !c.token) { tab = "publish"; render(); N.toast(t("كمّل بيانات GitHub الأول.", "Fill in the GitHub details first.")); return; }
    const p = (x) => (c.dir ? `${c.dir}/${x}` : x);
    try {
      out.textContent = t("بينشر…", "Publishing…");
      // photos added from this panel travel inside the draft as data URLs — upload them as files first
      for (const pr of D.products) {
        for (let k = 0; k < pr.images.length; k++) {
          const s = pr.images[k];
          if (!s.startsWith("data:")) continue;
          const ext = s.startsWith("data:image/webp") ? "webp" : "jpg";
          const path = `assets/store/${slug(pr.id)}-${Date.now().toString(36)}${k}.${ext}`;
          out.textContent = t(`بيرفع صورة: ${pr.name.ar}`, `Uploading a photo: ${pr.name.en || pr.name.ar}`);
          await gh(c, "PUT", p(path), { message: `shop: photo for ${pr.id}`, content: s.split(",")[1], branch: c.branch });
          pr.images[k] = path;
        }
      }
      D.updated = new Date().toISOString();
      const cur = await gh(c, "GET", p("assets/store-data.json"));
      await gh(c, "PUT", p("assets/store-data.json"), { message: "shop: update from the control panel", content: b64(JSON.stringify(D, null, 1)), sha: cur?.sha, branch: c.branch });
      base = JSON.stringify(D); store.set(DRAFT, ""); save(PUB, Date.now());
      out.textContent = t("اتنشر ✓ — الموقع بيتحدّث خلال دقيقة تقريباً.", "Published ✓ — the site updates in about a minute.");
      N.toast(t("اتنشر على الموقع ✓", "Published ✓"));
      status();
    } catch (e) {
      save(DRAFT, D);
      out.textContent = t(`النشر ما نجحش: ${e.message}. اتأكد من اسم المستودع والفرع وصلاحية المفتاح. تعديلاتك محفوظة على الجهاز.`, `Publishing failed: ${e.message}. Check the repository, branch and token. Your edits are kept on this device.`);
    }
  }

  // ------------------------------------------------------------------ events
  document.addEventListener("DOMContentLoaded", () => {
    if (!$("#adm")) return;
    if (sessionStorage.getItem("novera-admin-ok") === "1" && store.get(PIN)) start(); else lock();
    const root = $("#adm");
    root.addEventListener("click", async (e) => {
      const tb = e.target.closest("[data-tab]"); if (tb) { tab = tb.dataset.tab; return render(); }
      const a = e.target.closest("[data-act]"); if (!a) return;
      const act = a.dataset.act, rowEl = a.closest("[data-i]"), i = rowEl ? +rowEl.dataset.i : null;
      if (act === "new") return openEditor(null);
      if (act === "edit") return openEditor(i);
      if (act === "up" || act === "down") { const j = i + (act === "up" ? -1 : 1); if (j < 0 || j >= D.products.length) return; [D.products[i], D.products[j]] = [D.products[j], D.products[i]]; return touch(true); }
      if (act === "bulk") {
        const pct = parseFloat($("#bpct").value); if (!isFinite(pct) || !pct) return N.toast(t("اكتب النسبة.", "Enter a percentage."));
        const cat = $("#bcat").value, rd = +$("#bround").value || 1; let n = 0;
        for (const p of D.products) if (p.price > 0 && (cat === "all" || p.cat === cat)) {
          p.price = Math.max(rd, Math.round((p.price * (1 + pct / 100)) / rd) * rd);
          if (p.old_price > 0) p.old_price = Math.max(rd, Math.round((p.old_price * (1 + pct / 100)) / rd) * rd);
          n++;
        }
        N.toast(t(`اتغيّر سعر ${n} منتج`, `${n} prices changed`)); return touch(true);
      }
      if (act === "addcat") { const ar = prompt(t("اسم القسم بالعربي", "Category name (Arabic)")); if (!ar) return; D.categories.push({ id: slug(prompt("English name") || ar) + "-" + Date.now().toString(36).slice(-3), ar, en: ar }); return touch(true); }
      if (act === "addfin") { D.finishes.push({ id: "f" + Date.now().toString(36), ar: t("تشطيب جديد", "New finish"), en: "New finish", pct: 10 }); return touch(true); }
      if (act === "ghsave") {
        const c = ghConf(); save(GH, c);
        try { const r = await fetch(`https://api.github.com/repos/${c.repo}`, { headers: { Authorization: `Bearer ${c.token}`, Accept: "application/vnd.github+json" } }); const j = await r.json();
          $("#ghOut").textContent = r.ok ? (j.permissions?.push ? t("الاتصال تمام ✓ والمفتاح يقدر ينشر.", "Connected ✓ — the token can publish.") : t("الاتصال تمام بس المفتاح مالوش صلاحية كتابة.", "Connected, but the token can't write.")) : t(`مش قادر يوصل: ${j.message}`, `Can't connect: ${j.message}`);
        } catch (er) { $("#ghOut").textContent = t(`مش قادر يوصل: ${er.message}`, `Can't connect: ${er.message}`); }
        return;
      }
      if (act === "publish") return publish();
      if (act === "export") { const b = new Blob([JSON.stringify(D, null, 1)], { type: "application/json" }); const u = URL.createObjectURL(b); const l = document.createElement("a"); l.href = u; l.download = "store-data.json"; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); return; }
      if (act === "discard") { if (!confirm(t("هترجع للنسخة المنشورة وتمسح تعديلاتك اللي على الجهاز. متأكد؟", "Go back to the published shop and drop your edits?"))) return; store.set(DRAFT, ""); D = await fetchPublished(); base = JSON.stringify(D); return render(); }
      if (act === "pin") { store.set(PIN, ""); sessionStorage.removeItem("novera-admin-ok"); return lock(); }
    });
    root.addEventListener("input", (e) => {
      const el = e.target;
      if (el.id === "aq") { q = el.value; const pos = el.selectionStart; products(); const n = $("#aq"); n.focus(); n.setSelectionRange(pos, pos); return; }
      const rowEl = el.closest("[data-i]");
      if (rowEl && el.dataset.f) {
        const p = D.products[+rowEl.dataset.i], f = el.dataset.f;
        if (f === "price" || f === "old_price") p[f] = num(el.value);
        else if (f === "visible" || f === "featured") { p[f] = el.checked; rowEl.classList.toggle("off", p.visible === false); }
        else p[f] = el.value;
        return touch();
      }
      const ci = el.closest("[data-ci]"); if (ci && el.dataset.c) { D.categories[+ci.dataset.ci][el.dataset.c] = el.value; return touch(); }
      const fi = el.closest("[data-fi]"); if (fi && el.dataset.fn) { const f = D.finishes[+fi.dataset.fi]; f[el.dataset.fn] = el.dataset.fn === "pct" ? (parseFloat(el.value) || 0) : el.value; return touch(); }
      if (el.dataset.s) { const v = el.dataset.s === "settings.deposit_pct" ? (parseFloat(el.value) || 0) : el.value; setPath(D, el.dataset.s, v); return touch(); }
    });
    root.addEventListener("change", async (e) => {
      if (e.target.id === "acat") { catF = e.target.value; return products(); }
      if (e.target.matches("[data-f='badge']")) return; // handled by input
      if (e.target.id === "impFile") {
        const f = e.target.files[0]; if (!f) return;
        try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.products)) throw 0; D = j; touch(true); N.toast(t("اتفتحت النسخة — راجعها وانشرها.", "Copy opened — review and publish.")); }
        catch { N.toast(t("الملف ده مش نسخة متجر.", "That file isn't a shop copy.")); }
      }
    });
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c-act],[data-f-act]"); if (!b) return;
      if (b.dataset.cAct) {
        const i = +b.closest("[data-ci]").dataset.ci;
        if (b.dataset.cAct === "up" && i > 0) [D.categories[i - 1], D.categories[i]] = [D.categories[i], D.categories[i - 1]];
        if (b.dataset.cAct === "del") { if (D.products.some((p) => p.cat === D.categories[i].id)) return N.toast(t("القسم فيه منتجات.", "This category has products.")); D.categories.splice(i, 1); }
      } else { const i = +b.closest("[data-fi]").dataset.fi; if (D.finishes.length <= 1) return; D.finishes.splice(i, 1); }
      touch(true);
    });
    // the product editor
    const ped = $("#ped");
    ped.addEventListener("input", (e) => {
      const k = e.target.dataset.e; if (!k) return;
      let v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      if (["price", "old_price", "dims.w", "dims.d", "dims.h", "lead_days"].includes(k)) v = num(v);
      setPath(editing.p, k, v);
    });
    ped.addEventListener("change", async (e) => {
      if (e.target.id !== "pedFiles") return;
      for (const f of e.target.files) { try { editing.p.images.push(await fitImage(f)); } catch { N.toast(t("صورة ما اتقرتش.", "A photo couldn't be read.")); } }
      drawEditor();
    });
    ped.addEventListener("click", (e) => {
      if (e.target === ped) return ped.close();
      const im = e.target.closest("[data-img]");
      if (im) { const [op, k0] = im.dataset.img.split(":"), k = +k0, a = editing.p.images;
        if (op === "del") a.splice(k, 1); else { const j = k + (op === "left" ? -1 : 1); if (j >= 0 && j < a.length) [a[k], a[j]] = [a[j], a[k]]; }
        return drawEditor(); }
      const b = e.target.closest("[data-pe]"); if (!b) return;
      const p = editing.p, err = $("#pedBody .form-err");
      if (b.dataset.pe === "cancel") return ped.close();
      if (b.dataset.pe === "del") { if (!confirm(t(`تمسح «${p.name.ar}»؟`, `Delete "${p.name.ar}"?`))) return; D.products.splice(editing.i, 1); ped.close(); return touch(true); }
      if (b.dataset.pe === "dup") { const c = JSON.parse(JSON.stringify(p)); c.id = slug(c.name.en || c.id) + "-" + Date.now().toString(36).slice(-4); c.name.ar += " (نسخة)"; D.products.splice(editing.i + 1, 0, c); ped.close(); return touch(true); }
      if (!p.name.ar.trim()) { err.hidden = false; err.textContent = t("اكتب اسم المنتج.", "Add the product name."); return; }
      if (!p.images.length) { err.hidden = false; err.textContent = t("ضيف صورة واحدة على الأقل.", "Add at least one photo."); return; }
      if (!p.name.en) p.name.en = p.name.ar;
      if (editing.i == null) { p.id = slug(p.name.en) + "-" + Date.now().toString(36).slice(-4); D.products.unshift(p); } else D.products[editing.i] = p;
      ped.close(); touch(true);
    });
  });
})();
