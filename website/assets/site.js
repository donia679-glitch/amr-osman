/* NOVERA — shared site script: settings, language (Arabic ⇄ English), theme, menu, WhatsApp hand-off, booking form, FAQ search. */
(function () {
  "use strict";

  // ------------------------------------------------------------------ settings — fill these before going live
  const CONFIG = (window.NOVERA_CONFIG = {
    whatsapp: "",            // international format without + or spaces, e.g. "2010XXXXXXXX"
    phone: "",               // shown as text, e.g. "+20 10 XXXX XXXX"
    email: "",               // e.g. "hello@novera.example"
    address: { ar: "محافظة المنيا، مصر", en: "Minya Governorate, Egypt" },
    hours: { ar: "السبت – الخميس، 10ص – 8م", en: "Sat – Thu, 10am – 8pm" },
    social: { facebook: "", instagram: "", tiktok: "", youtube: "" },
    appStore: "",            // App Store link once the app is live
    // starting prices per running metre of kitchen (base + upper), in EGP: [from, to]. Leave null to hide prices.
    pricing: null,           // e.g. { novera: [18000, 24000], white: [15000, 20000], oak: [17000, 23000], dark: [19000, 26000] }
  });

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const lang = () => document.documentElement.lang === "en" ? "en" : "ar";
  window.NOVERA = { CONFIG, $, $$, lang, store };

  // ------------------------------------------------------------------ language
  function applyLang(l) {
    const root = document.documentElement;
    root.lang = l; root.dir = l === "en" ? "ltr" : "rtl";
    for (const el of $$("[data-en]")) {
      if (el.dataset.ar == null) el.dataset.ar = el.innerHTML;
      el.innerHTML = l === "en" ? el.dataset.en : el.dataset.ar;
    }
    for (const el of $$("[data-en-ph]")) {
      if (el.dataset.arPh == null) el.dataset.arPh = el.placeholder;
      el.placeholder = l === "en" ? el.dataset.enPh : el.dataset.arPh;
    }
    for (const el of $$("[data-en-label]")) {
      if (el.dataset.arLabel == null) el.dataset.arLabel = el.getAttribute("aria-label") || "";
      el.setAttribute("aria-label", l === "en" ? el.dataset.enLabel : el.dataset.arLabel);
    }
    const t = $("title");
    if (t?.dataset.en) { if (t.dataset.ar == null) t.dataset.ar = t.textContent; document.title = l === "en" ? t.dataset.en : t.dataset.ar; }
    for (const b of $$("[data-lang]")) b.textContent = l === "en" ? "ع" : "EN";
    fillContacts();
    document.dispatchEvent(new CustomEvent("novera:lang", { detail: l }));
  }
  function t(ar, en) { return lang() === "en" ? en : ar; }
  window.NOVERA.t = t;

  // ------------------------------------------------------------------ theme
  function applyTheme(th) {
    if (th === "dark" || th === "light") document.documentElement.dataset.theme = th;
    else delete document.documentElement.dataset.theme;
  }
  function currentDark() {
    const th = document.documentElement.dataset.theme;
    return th ? th === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  }

  // ------------------------------------------------------------------ contacts (one place to fill them)
  function fillContacts() {
    const todo = t("يتحط قبل النشر", "added before launch");
    const map = {
      phone: CONFIG.phone, whatsapp: CONFIG.whatsapp ? "+" + CONFIG.whatsapp : "", email: CONFIG.email,
      address: CONFIG.address[lang()], hours: CONFIG.hours[lang()],
    };
    for (const el of $$("[data-contact]")) {
      const v = map[el.dataset.contact];
      el.textContent = v || todo;
      el.classList.toggle("todo", !v);
    }
    for (const a of $$("[data-wa]")) a.href = waLink(a.dataset.wa ? t(a.dataset.wa, a.dataset.waEn || a.dataset.wa) : "");
    for (const a of $$("[data-social]")) { const u = CONFIG.social[a.dataset.social]; a.hidden = !u; if (u) a.href = u; }
    for (const a of $$("[data-appstore]")) { if (CONFIG.appStore) { a.href = CONFIG.appStore; a.removeAttribute("aria-disabled"); } }
  }
  function waLink(text) {
    const q = text ? "?text=" + encodeURIComponent(text) : "";
    return CONFIG.whatsapp ? `https://wa.me/${CONFIG.whatsapp}${q}` : `https://wa.me/${q}`;
  }
  window.NOVERA.waLink = waLink;

  function toast(msg) {
    let el = $(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2600);
  }
  window.NOVERA.toast = toast;
  async function copy(text, sel) {
    try { await navigator.clipboard.writeText(text); toast(t("اتنسخ", "Copied")); }
    catch {
      if (sel) { const r = document.createRange(); r.selectNodeContents(sel); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      toast(t("علّم النص وانسخه", "Select the text and copy it"));
    }
  }
  window.NOVERA.copy = copy;

  // ------------------------------------------------------------------ the hand-off box (WhatsApp + copy) used by every form
  function handoff(box, text) {
    box.hidden = false;
    box.innerHTML = "";
    const pre = document.createElement("pre"); pre.textContent = text;
    const row = document.createElement("div"); row.className = "hero-actions";
    const a = document.createElement("a"); a.className = "btn"; a.target = "_blank"; a.rel = "noopener"; a.href = waLink(text);
    a.innerHTML = WA_ICON + `<span>${t("ابعتها على واتساب", "Send on WhatsApp")}</span>`;
    const c = document.createElement("button"); c.type = "button"; c.className = "btn ghost"; c.textContent = t("انسخ الرسالة", "Copy the message");
    c.addEventListener("click", () => copy(text, pre));
    row.append(a, c);
    const hint = document.createElement("p"); hint.className = "note";
    hint.textContent = CONFIG.whatsapp
      ? t("هيفتح واتساب والرسالة جاهزة — دوس إرسال وهنرد عليك.", "WhatsApp opens with the message ready — tap send and we'll reply.")
      : t("رقم واتساب NOVERA هيتحط هنا قبل النشر؛ لحد ما يتحط، انسخ الرسالة وابعتها.", "NOVERA's WhatsApp number is added before launch; until then, copy the message.");
    box.append(pre, row, hint);
    box.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }
  window.NOVERA.handoff = handoff;
  const WA_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
  window.NOVERA.WA_ICON = WA_ICON;

  // ------------------------------------------------------------------ booking form (home + support)
  function initBooking() {
    const f = $("#bookForm");
    if (!f) return;
    for (const g of $$("[data-chips]", f)) {
      const multi = g.dataset.chips === "multi";
      g.addEventListener("click", (e) => {
        const b = e.target.closest(".chip"); if (!b) return;
        if (!multi) for (const x of $$(".chip", g)) x.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-pressed", String(!(multi && b.getAttribute("aria-pressed") === "true")));
      });
    }
    const plan = (() => { try { return sessionStorage.getItem("novera-plan"); } catch { return null; } })();
    const pl = $("#bookPlan", f);
    if (plan && pl) { pl.hidden = false; $("pre", pl).textContent = plan; }
    const d = $("#bkDate", f);
    if (d) { const x = new Date(); x.setDate(x.getDate() + 1); d.min = x.toISOString().slice(0, 10); }
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const err = $(".form-err", f);
      const name = $("#bkName", f).value.trim(), phone = $("#bkPhone", f).value.trim();
      if (!name || phone.replace(/\D/g, "").length < 8) {
        err.hidden = false;
        err.textContent = !name ? t("اكتب اسمك عشان نعرف نكلّم مين.", "Add your name so we know who to call.") : t("اكتب رقم موبايل صحيح (11 رقم) عشان نتواصل معاك.", "Add a valid mobile number so we can reach you.");
        (!name ? $("#bkName", f) : $("#bkPhone", f)).focus();
        return;
      }
      err.hidden = true;
      const types = $$("[data-chips] .chip[aria-pressed='true']", f).map((b) => b.textContent.trim());
      const lines = [
        t("طلب معاينة — NOVERA", "Site visit request — NOVERA"),
        `${t("الاسم", "Name")}: ${name}`,
        `${t("الموبايل", "Mobile")}: ${phone}`,
        `${t("المكان", "Location")}: ${$("#bkCity", f).value.trim() || "—"}`,
        `${t("الشغل", "Work")}: ${types.join("، ") || "—"}`,
        `${t("الميعاد المناسب", "Preferred date")}: ${$("#bkDate", f).value || t("أي ميعاد", "any")} · ${$("#bkTime", f).selectedOptions[0].textContent}`,
      ];
      const notes = $("#bkNotes", f).value.trim();
      if (notes) lines.push(`${t("ملاحظات", "Notes")}: ${notes}`);
      if (plan && pl && !pl.hidden) lines.push("", plan);
      handoff($(".form-out", f), lines.join("\n"));
    });
  }

  // ------------------------------------------------------------------ FAQ search
  function initFaq() {
    const q = $("#faqQ");
    if (!q) return;
    const items = $$(".faq details");
    q.addEventListener("input", () => {
      const s = q.value.trim().toLowerCase();
      let shown = 0;
      for (const d of items) { const hit = !s || d.textContent.toLowerCase().includes(s); d.hidden = !hit; if (hit) shown++; if (s && hit) d.open = true; }
      $("#faqNone").hidden = shown > 0;
    });
  }

  // ------------------------------------------------------------------ boot
  document.addEventListener("DOMContentLoaded", () => {
    const savedL = store.get("novera-lang");
    applyLang(savedL === "en" ? "en" : "ar");
    applyTheme(store.get("novera-theme"));
    for (const b of $$("[data-lang]")) b.addEventListener("click", () => { const l = lang() === "en" ? "ar" : "en"; store.set("novera-lang", l); applyLang(l); });
    for (const b of $$("[data-theme-toggle]")) b.addEventListener("click", () => { const th = currentDark() ? "light" : "dark"; store.set("novera-theme", th); applyTheme(th); });
    const mb = $(".menu-btn"), nav = $(".nav");
    mb?.addEventListener("click", () => { const o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", String(o)); });
    nav?.addEventListener("click", (e) => { if (e.target.closest("a")) { nav.classList.remove("open"); mb?.setAttribute("aria-expanded", "false"); } });
    for (const y of $$("[data-year]")) y.textContent = new Date().getFullYear();
    initBooking(); initFaq();
  });
})();
