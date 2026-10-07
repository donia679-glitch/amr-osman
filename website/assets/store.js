/* NOVERA — the shop: catalogue from assets/store-data.json (edited in admin.html), filters, product sheet, cart, order on WhatsApp. */
(function () {
  "use strict";
  const N = window.NOVERA;
  const { $, $$, t, lang, store } = N;
  const CART_KEY = "novera-cart", FAV_KEY = "novera-favs", DRAFT_KEY = "novera-store-draft";
  const preview = /[?&]preview\b/.test(location.search);
  let D = null;                       // the catalogue
  const S = { cat: "all", q: "", sort: "featured", favs: false };
  let cart = load(CART_KEY, []), favs = new Set(load(FAV_KEY, []));

  function load(k, d) { try { const v = JSON.parse(store.get(k) || "null"); return v ?? d; } catch { return d; } }
  function save(k, v) { store.set(k, JSON.stringify(v)); }
  const L = (o) => (o && typeof o === "object" ? o[lang()] || o.ar || "" : o || "");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (v) => `${Math.round(v).toLocaleString("en-US")} ${L(D.currency)}`;
  const prod = (id) => D.products.find((p) => p.id === id);
  const fin = (id) => D.finishes.find((f) => f.id === id) || D.finishes[0];
  const catName = (id) => L(D.categories.find((c) => c.id === id)) || "";
  const hasPrice = (p) => typeof p.price === "number" && p.price > 0;
  const unitWord = (p) => (p.unit === "meter" ? t("متر طولي", "running metre") : t("قطعة", "piece"));
  function priceOf(p, finId) {
    if (!hasPrice(p)) return null;
    const pct = p.finishes && finId ? Number(fin(finId).pct) || 0 : 0;
    return p.price * (1 + pct / 100);
  }
  const dimsText = (p) => {
    const d = p.dims || {};
    if (!d.w && !d.h) return p.unit === "meter" ? t("على مقاس مطبخك", "Made to your kitchen") : "";
    return `${[d.w, d.d, d.h].filter((x) => x).map((x) => +(+x).toFixed(1)).join(" × ")} ${t("سم", "cm")}`;
  };
  const BADGE = { new: ["جديد", "New"], best: ["الأكثر طلباً", "Best seller"], offer: ["عرض", "Offer"] };

  // ------------------------------------------------------------------ data
  async function boot() {
    let draft = null;
    if (preview) draft = load(DRAFT_KEY, null);
    try {
      D = draft || await (await fetch(`assets/store-data.json?v=${Date.now()}`, { cache: "no-store" })).json();
    } catch {
      $("#shopGrid").innerHTML = `<p class="shop-empty">${t("المتجر مش قادر يحمّل دلوقتي — جرّب تاني بعد شوية.", "The shop could not load right now — please try again shortly.")}</p>`;
      return;
    }
    if (draft) $("#previewBar").hidden = false;
    D.products = D.products.filter((p) => p.visible !== false);
    cart = cart.filter((c) => prod(c.id));
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get("c") && D.categories.some((c) => c.id === h.get("c"))) S.cat = h.get("c");
    renderAll();
    if (h.get("p") && prod(h.get("p"))) openProduct(h.get("p"));
    document.addEventListener("novera:lang", renderAll);
  }
  function renderAll() { renderChips(); renderGrid(); renderCartCount(); if ($("#cart").classList.contains("open")) renderCart(); renderNotes(); }
  function renderNotes() {
    for (const el of $$("[data-shop-note]")) el.textContent = L(D.settings?.[el.dataset.shopNote]);
  }

  // ------------------------------------------------------------------ filters
  function renderChips() {
    const counts = {};
    for (const p of D.products) counts[p.cat] = (counts[p.cat] || 0) + 1;
    const chip = (id, label, n) => `<button type="button" class="chip" data-cat="${id}" aria-pressed="${S.cat === id}">${esc(label)}<span class="cnt">${n}</span></button>`;
    $("#shopCats").innerHTML = chip("all", t("الكل", "All"), D.products.length) +
      D.categories.filter((c) => counts[c.id]).map((c) => chip(c.id, L(c), counts[c.id])).join("") +
      `<button type="button" class="chip" data-favs aria-pressed="${S.favs}">♥ ${t("المفضلة", "Saved")}<span class="cnt">${[...favs].filter(prod).length}</span></button>`;
  }
  function list() {
    const q = S.q.trim().toLowerCase();
    let r = D.products.filter((p) => (S.cat === "all" || p.cat === S.cat) && (!S.favs || favs.has(p.id)) &&
      (!q || [p.name.ar, p.name.en, p.desc?.ar, p.desc?.en, p.materials?.ar, p.materials?.en, catName(p.cat)].join(" ").toLowerCase().includes(q)));
    const pv = (p) => (hasPrice(p) ? p.price : null);
    if (S.sort === "low" || S.sort === "high") {
      const dir = S.sort === "low" ? 1 : -1;
      r = r.slice().sort((a, b) => (pv(a) == null) - (pv(b) == null) || dir * ((pv(a) ?? 0) - (pv(b) ?? 0)));
    } else if (S.sort === "new") r = r.slice().sort((a, b) => (b.badge === "new") - (a.badge === "new"));
    else r = r.slice().sort((a, b) => (b.featured === true) - (a.featured === true));
    return r;
  }
  function priceHtml(p, finId, big) {
    const v = priceOf(p, finId);
    if (v == null) return `<span class="ask">${t("السعر عند الطلب", "Price on request")}</span>`;
    const from = p.unit === "meter" || (p.finishes && !finId) ? `<small>${t("يبدأ من", "From")}</small> ` : "";
    const old = typeof p.old_price === "number" && p.old_price > p.price ? `<s>${money(p.old_price * (v / p.price))}</s>` : "";
    return `${big ? "" : from}<b>${money(v)}</b><small> / ${unitWord(p)}</small>${old}`;
  }
  function renderGrid() {
    const r = list();
    $("#shopCount").textContent = t(`${r.length} تصميم`, `${r.length} designs`);
    $("#shopGrid").innerHTML = r.length ? r.map((p) => {
      const b = BADGE[p.badge];
      const img2 = p.images[1] ? `<img class="alt" src="${esc(p.images[1])}" alt="" loading="lazy" decoding="async">` : "";
      return `<article class="pcard" data-id="${esc(p.id)}">
        <button type="button" class="pimg" data-open="${esc(p.id)}" aria-label="${esc(L(p.name))}">
          <img src="${esc(p.images[0] || "")}" alt="${esc(L(p.name))}" loading="lazy" decoding="async" width="1200" height="900">${img2}
          ${b ? `<span class="badge b-${esc(p.badge)}">${t(b[0], b[1])}</span>` : ""}
        </button>
        <button type="button" class="fav" data-fav="${esc(p.id)}" aria-pressed="${favs.has(p.id)}" aria-label="${t("احفظ في المفضلة", "Save")}">♥</button>
        <div class="pbody">
          <p class="pcat">${esc(catName(p.cat))}</p>
          <h3><button type="button" data-open="${esc(p.id)}">${esc(L(p.name))}</button></h3>
          <p class="pdim num">${esc(dimsText(p))}</p>
          <div class="prow"><p class="pprice num">${priceHtml(p)}</p>
            <button type="button" class="addbtn" data-add="${esc(p.id)}" aria-label="${t("أضف للسلة", "Add to cart")}">${hasPrice(p) ? "＋" : t("؟", "?")}</button></div>
        </div>
      </article>`;
    }).join("") : `<p class="shop-empty">${S.favs ? t("لسه ما حفظتش تصميمات — دوس ♥ على أي تصميم.", "Nothing saved yet — tap ♥ on any design.") : t("مفيش تصميمات بالبحث ده.", "No designs match this search.")}</p>`;
  }

  // ------------------------------------------------------------------ product sheet
  let cur = null;
  function openProduct(id) {
    const p = prod(id); if (!p) return;
    cur = { id, fin: p.finishes ? D.finishes[0].id : null, qty: p.unit === "meter" ? 3 : 1, img: 0 };
    drawProduct();
    const dlg = $("#pd");
    if (!dlg.open) dlg.showModal();
    history.replaceState(null, "", `#p=${encodeURIComponent(id)}`);
  }
  function drawProduct() {
    const p = prod(cur.id), b = BADGE[p.badge];
    const v = priceOf(p, cur.fin);
    const step = p.unit === "meter" ? 0.5 : 1;
    const specs = [
      [t("المقاس", "Size"), dimsText(p)],
      [t("الخامات", "Materials"), L(p.materials)],
      [t("مدة التنفيذ", "Lead time"), p.lead_days ? t(`حوالي ${p.lead_days} يوم من الاتفاق`, `About ${p.lead_days} days from order`) : ""],
      [t("بيتسعّر بالـ", "Priced per"), unitWord(p)],
    ].filter((x) => x[1]);
    $("#pdBody").innerHTML = `
      <div class="pd-gal">
        <div class="pd-main"><img src="${esc(p.images[cur.img] || p.images[0])}" alt="${esc(L(p.name))}" width="1200" height="900">${b ? `<span class="badge b-${esc(p.badge)}">${t(b[0], b[1])}</span>` : ""}</div>
        ${p.images.length > 1 ? `<div class="pd-thumbs">${p.images.map((s, i) => `<button type="button" data-img="${i}" aria-pressed="${i === cur.img}" aria-label="${t("صورة", "Photo")} ${i + 1}"><img src="${esc(s)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      </div>
      <div class="pd-info">
        <p class="pcat">${esc(catName(p.cat))}</p>
        <h2 id="pdTitle">${esc(L(p.name))}</h2>
        <p class="pd-price num">${priceHtml(p, cur.fin, true)}</p>
        <p class="muted">${esc(L(p.desc))}</p>
        ${p.finishes ? `<fieldset class="pd-fin"><legend>${t("التشطيب", "Finish")}</legend><div class="chips">${D.finishes.map((f) => `<button type="button" class="chip" data-fin="${esc(f.id)}" aria-pressed="${f.id === cur.fin}">${esc(L(f))}${hasPrice(p) && f.pct ? `<span class="cnt">+${f.pct}%</span>` : ""}</button>`).join("")}</div><small class="muted">${esc(L({ ar: fin(cur.fin).note_ar, en: fin(cur.fin).note_en }))}</small></fieldset>` : ""}
        <div class="pd-buy">
          <div class="qty" role="group" aria-label="${t("الكمية", "Quantity")}">
            <button type="button" data-q="-1" aria-label="${t("أقل", "Less")}">−</button>
            <output class="num">${cur.qty}</output><small>${p.unit === "meter" ? t("متر", "m") : ""}</small>
            <button type="button" data-q="1" aria-label="${t("أكتر", "More")}">+</button>
          </div>
          <p class="pd-total num">${v != null ? `${t("الإجمالي", "Total")} <b>${money(v * cur.qty)}</b>` : ""}</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn" data-addcur>${hasPrice(p) ? t("أضف للسلة", "Add to cart") : t("أضف للطلب واسأل عن السعر", "Add and ask for the price")}</button>
          <a class="btn ghost" target="_blank" rel="noopener" href="${N.waLink(t(`أهلاً NOVERA، عايز أسأل عن: ${L(p.name)}`, `Hello NOVERA, I'd like to ask about: ${L(p.name)}`))}">${N.WA_ICON}<span>${t("اسأل على واتساب", "Ask on WhatsApp")}</span></a>
        </div>
        <dl class="pd-specs">${specs.map(([k, x]) => `<div><dt>${k}</dt><dd>${esc(x)}</dd></div>`).join("")}</dl>
        <p class="note">${esc(L(D.settings?.note))}</p>
      </div>`;
    $("#pd").dataset.step = step;
  }

  // ------------------------------------------------------------------ cart
  function addToCart(id, finId, qty) {
    const p = prod(id); if (!p) return;
    const f = p.finishes ? finId || D.finishes[0].id : null;
    const ex = cart.find((c) => c.id === id && c.fin === f);
    if (ex) ex.qty = +(ex.qty + qty).toFixed(1); else cart.push({ id, fin: f, qty });
    save(CART_KEY, cart); renderCartCount();
    N.toast(t(`اتضاف للسلة: ${L(p.name)}`, `Added to cart: ${L(p.name)}`));
    const c = $("#cartBtn"); c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
  }
  function renderCartCount() {
    const n = cart.length;
    for (const el of $$("[data-cart-count]")) { el.textContent = n; el.hidden = !n; }
  }
  function totals() {
    let sum = 0, unknown = 0;
    for (const c of cart) { const v = priceOf(prod(c.id), c.fin); if (v == null) unknown++; else sum += v * c.qty; }
    return { sum, unknown };
  }
  function renderCart() {
    const box = $("#cartList");
    if (!cart.length) {
      box.innerHTML = `<p class="shop-empty">${t("السلة فاضية. اختار التصميمات اللي عجبتك وهنبعتلك عرض سعر نهائي بعد المعاينة.", "Your cart is empty. Pick the designs you like and we'll send a final quote after the site visit.")}</p>`;
      $("#cartFoot").hidden = true; return;
    }
    box.innerHTML = cart.map((c, i) => {
      const p = prod(c.id), v = priceOf(p, c.fin);
      return `<div class="citem">
        <img src="${esc(p.images[0])}" alt="" width="96" height="72">
        <div><b>${esc(L(p.name))}</b><small>${c.fin ? esc(L(fin(c.fin))) + " · " : ""}${esc(dimsText(p))}</small>
          <div class="qty sm"><button type="button" data-cq="${i}:-1" aria-label="${t("أقل", "Less")}">−</button><output class="num">${c.qty}</output><small>${p.unit === "meter" ? t("متر", "m") : ""}</small><button type="button" data-cq="${i}:1" aria-label="${t("أكتر", "More")}">+</button></div></div>
        <div class="cend"><span class="num">${v != null ? money(v * c.qty) : t("بعد التأكيد", "To confirm")}</span><button type="button" class="linkbtn" data-crm="${i}">${t("شيل", "Remove")}</button></div>
      </div>`;
    }).join("");
    const { sum, unknown } = totals();
    $("#cartSum").textContent = sum ? money(sum) : t("يتأكد معاك", "To confirm");
    $("#cartUnknown").hidden = !unknown || !sum;
    $("#cartUnknown").textContent = t(`+ ${unknown} تصميم سعره هيتأكد معاك`, `+ ${unknown} item(s) priced with you`);
    const dep = Number(D.settings?.deposit_pct) || 0;
    $("#cartDeposit").textContent = dep && sum ? t(`مقدم ${dep}% عند التعاقد: ${money(sum * dep / 100)}`, `${dep}% deposit on order: ${money(sum * dep / 100)}`) : "";
    $("#cartFoot").hidden = false;
  }
  function openCart() { renderCart(); $("#cart").classList.add("open"); $("#cart").setAttribute("aria-hidden", "false"); $("#cartScrim").hidden = false; $("#cartClose").focus(); }
  function closeCart() { $("#cart").classList.remove("open"); $("#cart").setAttribute("aria-hidden", "true"); $("#cartScrim").hidden = true; }
  function checkout(e) {
    e.preventDefault();
    const f = e.target, err = $(".form-err", f);
    const name = $("#coName", f).value.trim(), phone = $("#coPhone", f).value.trim();
    if (!name || phone.replace(/\D/g, "").length < 8) {
      err.hidden = false; err.textContent = !name ? t("اكتب اسمك.", "Add your name.") : t("اكتب رقم موبايل صحيح.", "Add a valid mobile number.");
      (!name ? $("#coName", f) : $("#coPhone", f)).focus(); return;
    }
    err.hidden = true;
    const d = new Date(), no = `NV-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { sum, unknown } = totals();
    const lines = [t(`طلب من متجر NOVERA — ${no}`, `NOVERA shop order — ${no}`), ""];
    cart.forEach((c, i) => {
      const p = prod(c.id), v = priceOf(p, c.fin);
      lines.push(`${i + 1}. ${L(p.name)}${c.fin ? ` — ${L(fin(c.fin))}` : ""}`);
      lines.push(`   ${c.qty} ${p.unit === "meter" ? t("متر", "m") : t("قطعة", "pc")} × ${v != null ? money(v) : t("السعر يتأكد", "price to confirm")}${v != null ? ` = ${money(v * c.qty)}` : ""}`);
    });
    lines.push("", sum ? `${t("الإجمالي التقريبي", "Estimated total")}: ${money(sum)}${unknown ? t(` + ${unknown} تصميم سعره يتأكد`, ` + ${unknown} to price`) : ""}` : t("الأسعار: تتأكد معايا", "Prices: please confirm"), "");
    lines.push(`${t("الاسم", "Name")}: ${name}`, `${t("الموبايل", "Mobile")}: ${phone}`, `${t("المكان", "Location")}: ${$("#coCity", f).value.trim() || "—"}`);
    lines.push(`${t("التركيب", "Installation")}: ${$("#coInstall", f).checked ? t("عايز تركيب", "Yes, install") : t("استلام بس", "Pick-up only")}`);
    const n = $("#coNotes", f).value.trim(); if (n) lines.push(`${t("ملاحظات", "Notes")}: ${n}`);
    N.handoff($(".form-out", f), lines.join("\n"));
  }

  // ------------------------------------------------------------------ events
  // the home page strip: the featured designs, each opening its sheet in the shop
  async function homeStrip() {
    const box = $("#homeShop");
    try { D = await (await fetch(`assets/store-data.json?v=${Date.now()}`, { cache: "no-store" })).json(); } catch { box.closest("section").hidden = true; return; }
    const draw = () => {
      const r = D.products.filter((p) => p.visible !== false).sort((a, b) => (b.featured === true) - (a.featured === true)).slice(0, 4);
      box.innerHTML = r.map((p) => `<a class="pcard" href="store.html#p=${encodeURIComponent(p.id)}">
        <span class="pimg"><img src="${esc(p.images[0])}" alt="${esc(L(p.name))}" loading="lazy" width="1200" height="900">${p.images[1] ? `<img class="alt" src="${esc(p.images[1])}" alt="" loading="lazy">` : ""}</span>
        <span class="pbody"><span class="pcat">${esc(catName(p.cat))}</span><b class="hs-name">${esc(L(p.name))}</b><span class="pprice num">${priceHtml(p)}</span></span></a>`).join("");
    };
    draw(); document.addEventListener("novera:lang", draw);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if ($("#homeShop")) homeStrip();
    if (!$("#shopGrid")) return;
    boot();
    $("#shopQ").addEventListener("input", (e) => { S.q = e.target.value; renderGrid(); });
    $("#shopSort").addEventListener("change", (e) => { S.sort = e.target.value; renderGrid(); });
    $("#shopCats").addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      if (b.hasAttribute("data-favs")) { S.favs = !S.favs; }
      else { S.cat = b.dataset.cat; S.favs = false; history.replaceState(null, "", S.cat === "all" ? location.pathname + location.search : `#c=${S.cat}`); }
      renderChips(); renderGrid();
    });
    $("#shopGrid").addEventListener("click", (e) => {
      const o = e.target.closest("[data-open]"); if (o) return openProduct(o.dataset.open);
      const a = e.target.closest("[data-add]");
      if (a) { const p = prod(a.dataset.add); return hasPrice(p) ? addToCart(p.id, null, p.unit === "meter" ? 3 : 1) : openProduct(p.id); }
      const f = e.target.closest("[data-fav]");
      if (f) { const id = f.dataset.fav; favs.has(id) ? favs.delete(id) : favs.add(id); save(FAV_KEY, [...favs]); f.setAttribute("aria-pressed", String(favs.has(id))); renderChips(); if (S.favs) renderGrid(); }
    });
    const dlg = $("#pd");
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.closest("[data-pdclose]")) return dlg.close();
      const im = e.target.closest("[data-img]"); if (im) { cur.img = +im.dataset.img; return drawProduct(); }
      const fn = e.target.closest("[data-fin]"); if (fn) { cur.fin = fn.dataset.fin; return drawProduct(); }
      const q = e.target.closest("[data-q]");
      if (q) { const st = +dlg.dataset.step || 1; cur.qty = Math.max(st === 1 ? 1 : 1, +(cur.qty + st * +q.dataset.q).toFixed(1)); return drawProduct(); }
      if (e.target.closest("[data-addcur]")) { addToCart(cur.id, cur.fin, cur.qty); dlg.close(); openCart(); }
    });
    dlg.addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search + (S.cat !== "all" ? `#c=${S.cat}` : "")));
    $("#cartBtn").addEventListener("click", openCart);
    $("#cartClose").addEventListener("click", closeCart);
    $("#cartScrim").addEventListener("click", closeCart);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#cart").classList.contains("open")) closeCart(); });
    $("#cartList").addEventListener("click", (e) => {
      const q = e.target.closest("[data-cq]");
      if (q) { const [i, d] = q.dataset.cq.split(":").map(Number); const p = prod(cart[i].id), st = p.unit === "meter" ? 0.5 : 1; cart[i].qty = Math.max(st === 1 ? 1 : 1, +(cart[i].qty + st * d).toFixed(1)); save(CART_KEY, cart); return renderCart(); }
      const r = e.target.closest("[data-crm]");
      if (r) { cart.splice(+r.dataset.crm, 1); save(CART_KEY, cart); renderCartCount(); renderCart(); }
    });
    $("#coForm").addEventListener("submit", checkout);
  });
})();
