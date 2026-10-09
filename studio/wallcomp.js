// NOVERA Studio v118 — «قسّم الحيطة»: a wall seen from the front, divided into cells with the finger and with numbers.
// Tap a cell to pick it · split it into columns (⇹) or rows (⇵) by typed sizes or equally · drag any split line with the finger ·
// every size on the drawing is a button: tap it and type · each cell gets what it is (cabinet with doors / glass doors, open shelves,
// drawers, drawers + doors, wardrobe with a hanging rail, sliding doors, flap, decorative niche, solid built-out face with its own
// niche, a place for an appliance, nothing) · copy / paste / duplicate / swap cells · pick several cells and set them together ·
// its own catalogue materials · split around the room's windows and doors. «✓ خلصت» writes it all back into the unit
// (template wall_comp) and the engine turns every cell into real boards.
import { wallCompLayout, WC_KINDS, WC_DEVICES, wcHoleRect, wcModules, wcDoorsPer } from "./engine/panel/templatesRooms.js";
import { KW_BASE, KW_WALL, KW_TALL, kwArt, proposeKitchen } from "./kitwall.js";
// v119: kitchen cells — each one becomes a REAL kitchen unit (kitchen engine) standing in that place; `kit` = the kitchen preset
const KIT = { base: KW_BASE.filter((x) => x[0]), wall: KW_WALL.filter((x) => x[0]), tall: KW_TALL.filter((x) => x[0]) };
const kitRow = (id) => (KIT.tall.some((x) => x[0] === id) ? "tall" : KIT.wall.some((x) => x[0] === id) ? "wall" : "base");
const kitInfo = (id) => [...KIT.base, ...KIT.wall, ...KIT.tall].find((x) => x[0] === id) || ["", "🍳", "وحدة مطبخ", null];
const KIT_ROWN = { base: "⬇ سفلي (تحت الرخامة)", wall: "⬆ علوي (معلّق)", tall: "▮ طويل (من الأرض)" };

const KIND_ICON = { doors: "🚪", open: "📚", drawers: "🗄", combo: "🗃", wardrobe: "👔", sliding: "↔", flap: "⬆", niche: "◫", solid: "▮", device: "📺", kitchen: "🍳", empty: "⬚" };
const KIND_FILL = { doors: "#d7c4a3", open: "#efe6d4", drawers: "#d3c09d", combo: "#d5c2a0", wardrobe: "#d9c7a6", sliding: "#d2c3a7", flap: "#dccbab", niche: "#c9d8cf", solid: "#b7a58a", device: "#2b2f2c", kitchen: "#e3d5bb", empty: "transparent" };
const DEV_ICON = { tv: "📺", fridge: "🧊", oven: "🔥", micro: "♨", washer: "🧺", dish: "🍽", other: "🔌" };
const BOX = new Set(["doors", "open", "drawers", "flap", "niche", "combo", "wardrobe", "sliding"]);
const FRONTED = new Set(["doors", "drawers", "flap", "combo", "wardrobe", "sliding"]);
const GLASSY = new Set(["doors", "flap", "combo", "wardrobe"]);
let ctx = null, P = null, sel = [], hist = [], el = null, view = null;
let multiOn = false, multi = [], clip = null, grip = null, gripMoved = false, tab = "box", showStart = false;
const clone = (o) => JSON.parse(JSON.stringify(o));
const f1 = (v) => String(Math.round(v * 10) / 10);
const key = (p) => p.join(".");
const unkey = (s) => (s === "" ? [] : s.split(".").map(Number));

export function open(unit, c) {
  ctx = c;
  const p = c.params(unit);
  P = { width: +p.width || 360, height: +p.height || 260, wc: clone(p.wc || {}) };
  if (!P.wc.root) P.wc.root = { kind: "open" };
  P.wc.depth ??= 35; P.wc.max_board ??= 240; P.wc.module_max ??= 90;
  hist = []; multiOn = false; multi = []; grip = null; tab = "box";
  sel = c.startPath && nodeAt(c.startPath) && !nodeAt(c.startPath).dir ? c.startPath : firstLeaf(P.wc.root, []);
  el = document.createElement("div");
  el.id = "wcomp"; el.className = "wcomp";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "قسّم الحيطة");
  document.body.appendChild(el);
  document.body.classList.add("inwcomp");
  el.addEventListener("click", onClick);
  el.addEventListener("change", onChange);
  el.addEventListener("pointerdown", (e) => { e.stopPropagation(); gripDown(e); });
  el.addEventListener("pointermove", gripMove);
  el.addEventListener("pointerup", gripUp);
  el.addEventListener("pointercancel", gripUp);
  addEventListener("resize", draw);
  draw();
}
function close(apply) {
  if (apply) ctx.apply(clone(P));
  removeEventListener("resize", draw);
  document.querySelector(".numask")?.remove();
  el?.remove(); el = null;
  document.body.classList.remove("inwcomp");
  ctx.closed?.();
}
// ---------------------------------------------------------------- the tree
function nodeAt(path, root = P.wc.root) { let n = root; for (const i of path) n = n?.parts?.[i]?.node; return n; }
function firstLeaf(n, path) { return n?.dir ? firstLeaf(n.parts[0].node, [...path, 0]) : path; }
function leaves(n, path, out = []) { if (!n) return out; if (n.dir) n.parts.forEach((q, i) => leaves(q.node, [...path, i], out)); else out.push(path); return out; }
function setNode(path, node) {
  if (!path.length) { P.wc.root = node; return; }
  const parent = nodeAt(path.slice(0, -1));
  parent.parts[path.at(-1)].node = node;
}
function remember() { hist.push(clone(P)); if (hist.length > 60) hist.shift(); }
function cells() { const errs = []; const c = wallCompLayout(P.wc, P.width, P.height, errs); return { c, errs }; }
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
/** the picked cells: the multi-selection, else the one picked cell */
function targets() { const t = multiOn && multi.length ? multi.map(unkey) : [sel]; return t.filter((p) => { const n = nodeAt(p); return n && !n.dir; }); }
/** change every picked cell (one undo step) */
function edit(fn) { remember(); for (const p of targets()) fn(nodeAt(p), p); draw(); }
/** the computed size of a part (the auto ones share what is left) */
function partSizes(node, total) {
  const sizes = node.parts.map((q) => (q.size == null ? null : +q.size));
  let autos = sizes.filter((v) => v == null).length;
  if (!autos) { sizes[sizes.length - 1] = null; autos = 1; }
  const each = (total - sizes.reduce((t, v) => t + (v ?? 0), 0)) / autos;
  return sizes.map((v) => v ?? each);
}
function rectOf(path) {
  let r = { x0: 0, x1: P.width, z0: 0, z1: P.height }, n = P.wc.root;
  for (const i of path) {
    const s = partSizes(n, n.dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0);
    if (n.dir === "v") { const a = r.x0 + s.slice(0, i).reduce((t, v) => t + v, 0); r = { ...r, x0: a, x1: a + s[i] }; }
    else { const b = r.z1 - s.slice(0, i).reduce((t, v) => t + v, 0); r = { ...r, z0: b - s[i], z1: b }; }
    n = n.parts[i].node;
  }
  return r;
}
/** give part i of split `path` the size v (somebody else takes up the difference); false + a message when it can't */
function setPart(path, i, v, quiet = false) {
  const n = nodeAt(path), r = rectOf(path), total = n.dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0, s = partSizes(n, total);
  const others = 5 * (s.length - 1);
  if (v < 5 || v > total - others + 0.01) { if (!quiet) ctx.alertBar(`المقاس هنا من 5 لـ ${f1(total - others)} سم`); return false; }
  n.parts[i].size = Math.round(v * 10) / 10;
  const j = i + 1 < n.parts.length ? i + 1 : i - 1;
  if (!n.parts.some((q, jj) => jj !== i && q.size == null) && n.parts[j]) n.parts[j].size = null;
  return true;
}
/** size of a cell along a direction ("v" = its width, "h" = its height): set in the nearest split of that direction */
function setCellSize(path, dir, v) {
  for (let d = path.length - 1; d >= 0; d--) { const par = path.slice(0, d); if (nodeAt(par).dir === dir) return setPart(par, path[d], v); }
  return null;
}
function holeHits(r) {
  return (ctx.holes || []).filter((o) => o.kind !== "pt" && Math.min(r.x1, o.x1) - Math.max(r.x0, o.x0) > 1 && Math.min(r.z1, o.z1) - Math.max(r.z0, o.z0) > 1);
}
const holeName = (o) => (o.kind === "window" ? "الشباك" : "الباب");
// ---------------------------------------------------------------- drawing
function draw() {
  if (!el) return;
  const { c, errs } = cells();
  const leaf = nodeAt(sel) || {};
  const wl = ctx.wallLen, wh = ctx.wallH;
  const par = sel.length ? nodeAt(sel.slice(0, -1)) : null, idx = sel.at(-1);
  const holesBig = (ctx.holes || []).some((o) => o.kind !== "pt");
  el.innerHTML = `
    <div class="wchead">
      <b>🧩 قسّم الحيطة</b>
      <button class="wcsz" data-wcsize="width">العرض <b>${f1(P.width)}</b></button>
      <button class="wcsz" data-wcsize="height">الارتفاع <b>${f1(P.height)}</b></button>
      <button class="wcsz" data-wcsize="depth">العمق <b>${f1(P.wc.depth)}</b></button>
      <button class="wcsz" data-wcsize="module" title="أي خانة أعرض من كده بتتعمل كذا علبة جنب بعض">العلبة لحد <b>${f1(P.wc.module_max)}</b></button>
      ${wl && Math.abs(wl - P.width) > 0.5 ? `<button class="wcsz fit" data-wc="fitw" title="العرض = طول الحيطة">↔ قد الحيطة <b>${f1(wl)}</b></button>` : ""}
      ${wh && Math.abs(wh - P.height) > 0.5 ? `<button class="wcsz fit" data-wc="fith" title="الارتفاع = لحد السقف">↕ لحد السقف <b>${f1(wh)}</b></button>` : ""}
      <span class="wcsp"></span>
      <button class="wcb" data-wc="undo" ${hist.length ? "" : "disabled"} title="تراجع">↶</button>
      <button class="wcb primary" data-wc="done">✓ خلصت</button>
      <button class="wcb" data-wc="cancel" aria-label="اقفل من غير حفظ">✕</button>
    </div>
    <div class="wcbody">
      <div class="wcstage"><svg class="wcsvg" role="img" aria-label="واجهة الحيطة مقسومة"></svg>${errs.length ? `<p class="wcerr">⛔ ${ctx.esc(errs[0])}</p>` : ""}<div class="wcgtag" hidden></div></div>
      <aside class="wcside">${sideHtml(leaf)}</aside>
    </div>
    <div class="wcfoot">
      <button class="wcb" data-wc="splitv">⇹ قسّمها طولي<small>أعمدة جنب بعض</small></button>
      <button class="wcb" data-wc="splith">⇵ قسّمها عرضي<small>صفوف فوق بعض</small></button>
      <button class="wcb" data-wc="merge" ${sel.length ? "" : "disabled"}>⊟ شيل التقسيم<small>ترجع خانة واحدة</small></button>
      <button class="wcb" data-wc="dup">⧉ نسخة<small>خانة زيها جنبها</small></button>
      <button class="wcb" data-wc="swapa" ${par && idx > 0 ? "" : "disabled"} aria-label="بدّلها مع اللي قبلها">${par?.dir === "h" ? "⇡" : "⇠"}<small>بدّل</small></button>
      <button class="wcb" data-wc="swapb" ${par && idx < par.parts.length - 1 ? "" : "disabled"} aria-label="بدّلها مع اللي بعدها">${par?.dir === "h" ? "⇣" : "⇢"}<small>بدّل</small></button>
      <button class="wcb ${showStart ? "on2" : ""}" data-wc="starters">⚡ قوالب<small>مطبخ · دولاب · تلفزيون…</small></button>
      ${holesBig ? `<button class="wcb" data-wc="suggest">🪟 حوالين الفتحات<small>قسّم حوالين الشباك والباب</small></button>` : ""}
      <span class="wchint">دوس على خانة تختارها · اسحب أي خط تقسيم بصباعك · دوس على أي مقاس تكتبه</span>
    </div>`;
  drawSvg(c);
}
function stepper(f, label, v, lo, hi) {
  return `<div class="wcrow"><span>${label}</span><span class="wcstep"><button data-wcstep="${f}" data-d="-1" data-lo="${lo}" data-hi="${hi}" data-cur="${v}" ${v <= lo ? "disabled" : ""}>−</button><b>${v}</b><button data-wcstep="${f}" data-d="1" data-lo="${lo}" data-hi="${hi}" data-cur="${v}" ${v >= hi ? "disabled" : ""}>+</button></span></div>`;
}
const seg = (f, cur, opts) => `<span class="wcseg">${opts.map(([v, l]) => `<button data-wcset="${f}" data-v="${v}" class="${String(cur ?? "") === String(v) ? "on" : ""}">${l}</button>`).join("")}</span>`;
const row = (label, inner) => `<div class="wcrow"><span>${label}</span>${inner}</div>`;
const tog = (f, on, label) => `<label class="wcchk"><input type="checkbox" data-wctog="${f}" ${on ? "checked" : ""}> ${label}</label>`;
function libSel(f, cur, label) {
  const L = ctx.libs;
  if (!L) return "";
  const o = (k) => `<option value="${ctx.esc(k)}" ${cur === k ? "selected" : ""}>${ctx.esc(L.name(k))}</option>`;
  return `<label class="wclib"><span>${label}${cur ? `<i style="background:${ctx.esc(L.color(cur))}"></i>` : ""}</span><select data-wclib="${f}"><option value="">— زي باقي الوحدة</option>${L.own.length ? `<optgroup label="خامات المشروع">${L.own.map(o).join("")}</optgroup>` : ""}${L.mine.length ? `<optgroup label="خاماتي">${L.mine.map(o).join("")}</optgroup>` : ""}<optgroup label="الكتالوج">${L.cat.map(o).join("")}</optgroup></select></label>`;
}
function sideHtml(n) {
  const T = targets(), many = multiOn && T.length > 1;
  const tools = `<div class="wctools">
      <button data-wc="copy" title="انسخ إعدادات الخانة">📋 انسخ</button>
      <button data-wc="paste" ${clip ? "" : "disabled"} title="الصق الإعدادات على الخانات المختارة">📥 الصق${clip ? ` <small>${KIND_ICON[clip.kind] || ""}</small>` : ""}</button>
      <button data-wc="multi" class="${multiOn ? "on" : ""}" title="اختار أكتر من خانة وغيّرهم مع بعض">☑ أكتر من خانة</button>
      <button data-wc="row" ${sel.length ? "" : "disabled"} title="اختار كل الخانات اللي معاها في نفس الصف / العمود">▦ اللي معاها</button>
    </div>`;
  if (!n || n.dir) return tools;
  const k = n.kind || "empty", r = rectOf(sel), h = r.z1 - r.z0, w = r.x1 - r.x0;
  const chip = (kk) => `<button class="wckind ${k === kk && !many ? "on" : ""}" data-wckind="${kk}"><i>${KIND_ICON[kk]}</i>${WC_KINDS[kk]}</button>`;
  if (k === "kitchen" && !many) tab = "kitchen";
  const kitChip = ([id, ic, nm, nw]) => `<button class="wckind ${k === "kitchen" && n.kit === id && !many ? "on" : ""}" data-wckit="${id}"><i>${ic}</i>${nm}${nw ? `<small>${f1(nw)}</small>` : ""}</button>`;
  const kinds = tab === "kitchen"
    ? `<p class="wcnote">كل خانة هنا بتطلع <b>وحدة مطبخ حقيقية</b> (رخامة، وزرة، مفصلات، أدراج…) بعرض الخانة وفي مكانها.</p>${["base", "wall", "tall"].map((rw) => `<h4 class="wckh">${KIT_ROWN[rw]}</h4><div class="wckinds">${KIT[rw].map(kitChip).join("")}</div>`).join("")}`
    : `<div class="wckinds">${Object.keys(WC_KINDS).filter((x) => x !== "kitchen").map(chip).join("")}</div>`;
  const tabs = `<div class="wctabs"><button data-wctab="box" class="${tab === "box" ? "on" : ""}">🗄 دواليب ومكتبات</button><button data-wctab="kitchen" class="${tab === "kitchen" ? "on" : ""}">🍳 مطبخ</button></div>`;
  const start = !P.wc.root.dir || showStart ? `<div class="wcstart"><b>⚡ ابدأ بسرعة — الحيطة كلها:</b><div>${STARTERS.map(([id, ic, nm]) => `<button data-wcstart="${id}"><i>${ic}</i>${nm}</button>`).join("")}</div><small>بيقسّمها لوحده على مقاسها (وحوالين الشباك والباب) — وبعدين غيّر أي خانة.</small></div>` : "";
  let h2 = "";
  const hits = many ? [] : holeHits(r);
  if (hits.length && k !== "empty" && k !== "device") h2 += `<p class="wcwarn">⚠ الخانة دي راكبة على ${hits.map(holeName).join(" و")} — خليها «فاضي» أو قسّمها حواليه (🪟).</p>`;
  if (!many) {
    const nM = wcModules(w, P.wc), per = wcDoorsPer(n, w, P.wc), dLab = nM > 1 ? `الضلف <small>(لكل علبة من ${nM})</small>` : "الضلف";
    if (k === "doors" || k === "combo") { h2 += row(dLab, seg("count", per * nM, [[nM, "ضلفة"], [2 * nM, "ضلفتين"]])); if (per === 1) h2 += row("المفصلة", seg("hinge", n.hinge || "left", [["left", "شمال"], ["right", "يمين"]])); }
    if (k === "doors") h2 += stepper("shelves", "الأرفف جوه", n.shelves ?? 2, 0, 12);
    if (k === "combo") {
      h2 += stepper("dcount", "الأدراج تحت", n.dcount ?? 2, 1, 4);
      const dh = n.dh ?? Math.min(18 * (n.dcount ?? 2), h * 0.45);
      h2 += row("ارتفاع الأدراج", `<button class="wcnum" data-wcfield="dh">${f1(dh)}${n.dh == null ? " <small>تلقائي</small>" : ""}</button>`);
      h2 += stepper("shelves", "أرفف فوق", n.shelves ?? 1, 0, 8);
    }
    if (k === "wardrobe") { h2 += row(dLab, seg("count", n.count === 0 ? 0 : per * nM, [[0, "مفتوح"], [nM, "ضلفة"], [2 * nM, "ضلفتين"]])); h2 += row("الشماعة", seg("rods", n.rods ?? 1, [[1, "واحدة (طويلة)"], [2, "اتنين (فوق وتحت)"]])); }
    if (k === "sliding") { h2 += row("الضلف الجرار", seg("count", n.count ?? 2, [[2, "2"], [3, "3"]])); h2 += stepper("shelves", "الأرفف", n.shelves ?? Math.max(0, Math.round(h / 40) - 1), 0, 12); }
    if (k === "open") h2 += stepper("shelves", "الأرفف", n.shelves ?? Math.max(0, Math.round(h / 35) - 1), 0, 12);
    if (k === "niche" || k === "flap") h2 += stepper("shelves", "أرفف", n.shelves ?? 0, 0, 6);
    if (k === "drawers") h2 += stepper("count", "عدد الأدراج", n.count ?? Math.max(1, Math.min(6, Math.round(h / 22))), 1, 6);
    if (GLASSY.has(k)) h2 += tog("glass", n.glass, "🪟 ضلف زجاج بفريم خشب");
    if (k === "sliding") h2 += tog("glass", n.glass, "ضلف زجاج / مراية (من الزجاجاتي)");
    if (k === "open" || k === "niche" || k === "solid") h2 += tog("led", n.led, `ليد ${k === "solid" ? "ورا التكسية" : "تحت كل رف"}`);
    if (k === "solid") {
      h2 += tog("hole", !!n.hole, "◫ تجويف جوه التكسية");
      if (n.hole) {
        const q = wcHoleRect(r, n.hole);
        const nb = (f, label, v, auto) => `<button class="wcnum" data-wchole="${f}">${f1(v)}${auto ? " <small>في النص</small>" : ""}</button>`;
        h2 += `<div class="wcholebox">${row("مقاس الفتحة", `<span>${nb("w", "", n.hole.w ?? 60)} × ${nb("h", "", n.hole.h ?? 40)}</span>`)}
          ${row("من شمال الخانة", nb("x", "", q.x0 - r.x0, n.hole.x === "center" || n.hole.x == null))}${row("ارتفاعها من الأرض", nb("z", "", q.z0, n.hole.z === "center" || n.hole.z == null))}
          ${row("العمق", nb("depth", "", n.hole.depth ?? (n.depth ?? Math.min(30, P.wc.depth)), n.hole.depth == null).replace(" <small>في النص</small>", " <small>لحد الحيطة</small>"))}
          ${stepper("hshelves", "أرفف جوه", n.hole.shelves ?? 0, 0, 6)}${tog("hled", n.hole.led, "ليد في سقف التجويف")}
          <div class="wcbtns"><button data-wc="holec">⊕ في النص</button></div></div>`;
      }
    }
    if (k === "kitchen") {
      const kr = kitRow(n.kit), inf = kitInfo(n.kit);
      h2 += `<p class="wcnote">🍳 ${inf[2]} — ${kr === "base" ? "وحدة سفلية بالرخامة والوزرة" : kr === "wall" ? `علوية معلّقة، ارتفاعها = ارتفاع الخانة (${f1(h)}) وبتبدأ من ${f1(r.z0)} من الأرض` : `دولاب طويل ارتفاعه ${f1(h)}`}. بعد «✓ خلصت» تقدر تدوس عليها وتعدّل كل تفاصيلها زي أي وحدة مطبخ.</p>`;
      if (inf[3] && Math.abs(inf[3] - w) > 0.5) h2 += `<div class="wcbtns"><button data-wc="kitw">📐 خلّي الخانة ${f1(inf[3])} (مقاسها)</button></div>`;
      if (kr === "base" && Math.abs(h - (ctx.kdef?.baseTop || 90)) > 3) h2 += `<p class="wcwarn">الوحدة السفلية بالكونتر ارتفاعها ${f1(ctx.kdef?.baseTop || 90)} — الخانة ${f1(h)}. <button class="dclink" data-wc="kith">خليها ${f1(ctx.kdef?.baseTop || 90)}</button></p>`;
    }
    if (k === "device") {
      const dv = n.dev || (n.tv ? "tv" : "other");
      h2 += `<div class="wcdevs">${Object.entries(WC_DEVICES).map(([d, [nm, dw, dh]]) => `<button class="${dv === d ? "on" : ""}" data-wcdev="${d}"><i>${DEV_ICON[d]}</i>${nm}${dw ? `<small>${dw}×${dh}</small>` : ""}</button>`).join("")}</div>`;
      const D = WC_DEVICES[dv];
      if (D?.[1] && (Math.abs(w - D[1]) > 0.5 || Math.abs(h - D[2]) > 0.5)) h2 += `<div class="wcbtns"><button data-wc="devsize">📐 خلّي الخانة ${D[1]}×${D[2]}</button></div>`;
      if (dv === "tv") h2 += `<p class="wcnote">حامل الشاشة بيتحط في الهاردوير — منتصف الشاشة المعتاد 110–120 سم من الأرض.</p>`;
    }
  }
  if (BOX.has(k) || k === "solid" || many) h2 += row("العمق", `<button class="wcnum" data-wcfield="depth">${n.depth != null ? f1(n.depth) : `${f1(k === "solid" ? Math.min(30, P.wc.depth) : P.wc.depth)} <small>زي الباقي</small>`}</button>`);
  if (!many && BOX.has(k) && r.z0 < 0.5) h2 += row("على الأرض", seg("mount", n.mount === "flat" ? "flat" : "", [["", "رجول + وزرة"], ["flat", "على الأرض على طول"]]));
  if (BOX.has(k) || k === "solid" || many) {
    const so = k === "solid" || k === "niche";
    h2 += row("الخامة", seg("mat", n.mat || "", [["", so ? "المميزة" : "الهيكل"], ...(so ? [["carcass", "الهيكل"]] : [["accent", "المميزة"]]), ["front", "زي الضلف"]]));
    h2 += `<div class="wclibs"><b>🎨 من الكتالوج</b>${libSel("lib", n.lib, k === "solid" ? "الوش والجسم" : "الجسم والأرفف")}${FRONTED.has(k) || many ? libSel("flib", n.flib, "الضلف والوشوش") : ""}</div>`;
  }
  return `${start}${tools}<h3>${many ? `${T.length} خانات مختارة <small>أي حاجة تغيّرها بتتطبّق عليهم كلهم</small>` : `الخانة المختارة <small>${f1(w)} × ${f1(h)} سم · على ارتفاع ${f1(r.z0)}</small>`}</h3>
    ${tabs}${kinds}${h2}
    ${!many && BOX.has(k) && wcModules(w, P.wc) > 1 ? `<p class="wcnote">أعرض من علبة (${f1(P.wc.module_max)}) — هتتعمل ${wcModules(w, P.wc)} علب جنب بعض كل واحدة ${f1(w / wcModules(w, P.wc))} سم.</p>` : ""}
    ${!many && r.z1 - r.z0 > P.wc.max_board + 0.01 && BOX.has(k) ? `<p class="wcnote">أطول من لوح (${f1(P.wc.max_board)}) — هتتعمل علبة + تكملة فوقها أوتوماتيك.</p>` : ""}`;
}
function drawSvg(list) {
  const svg = el.querySelector(".wcsvg"), host = el.querySelector(".wcstage");
  const Wpx = host.clientWidth || 700, Hpx = host.clientHeight || 500;
  const mL = 46, mR = 64, mT = 56, mB = 46;
  const k = Math.max(0.05, Math.min((Wpx - mL - mR) / P.width, (Hpx - mT - mB) / P.height)); // never ≤ 0 (a squeezed stage)
  const ox = mL + ((Wpx - mL - mR) - P.width * k) / 2, oy = mT + ((Hpx - mT - mB) - P.height * k) / 2;
  const X = (x) => ox + x * k, Y = (z) => oy + (P.height - z) * k;
  view = { X, Y, k };
  svg.setAttribute("viewBox", `0 0 ${Wpx} ${Hpx}`);
  const picked = new Set(multiOn ? multi : [key(sel)]);
  let h = `<defs><pattern id="wchatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="rgba(0,0,0,.18)" stroke-width="2"/></pattern></defs>
    <rect x="${X(0)}" y="${Y(P.height)}" width="${P.width * k}" height="${P.height * k}" class="wcwall"/>`;
  for (const c of list) {
    const n = c.node, kk = n.kind || "empty", x = X(c.x0), y = Y(c.z1), w = (c.x1 - c.x0) * k, hh = (c.z1 - c.z0) * k, on = picked.has(key(c.path));
    const clash = kk !== "empty" && kk !== "device" && holeHits(c).length;
    const fill = (n.flib && FRONTED.has(kk) ? ctx.libs?.color(n.flib) : n.lib && (kk === "solid" || kk === "open" || kk === "niche") ? ctx.libs?.color(n.lib) : null) || KIND_FILL[kk];
    h += `<g class="wccell ${kk} ${on ? "on" : ""} ${clash ? "clash" : ""}" data-wcpath="${key(c.path)}"><rect x="${x + 1}" y="${y + 1}" width="${Math.max(0, w - 2)}" height="${Math.max(0, hh - 2)}" fill="${fill}" rx="2"/>`;
    if (kk === "kitchen") { const kr = kitRow(n.kit); h += kwArt(n.kit || "", x + 1, y + 1, w - 2, hh - 2, k, kr); if (kr === "base") h += `<rect x="${x}" y="${y}" width="${w}" height="${4 * k}" class="kwctr"/><rect x="${x + 2}" y="${y + hh - 10 * k}" width="${Math.max(0, w - 4)}" height="${10 * k}" class="kwkick"/>`; }
    else h += cellArt(kk, n, x + 1, y + 1, w - 2, hh - 2, c, k);
    const icon = kk === "device" ? DEV_ICON[n.dev || (n.tv ? "tv" : "other")] : kk === "kitchen" ? kitInfo(n.kit)[1] : KIND_ICON[kk];
    const big = w > 70 && hh > 34 && (kk !== "empty" || on), inv = kk === "device" ? "inv" : "";
    let lab = `${kk === "device" ? WC_DEVICES[n.dev || (n.tv ? "tv" : "other")][0] : kk === "kitchen" ? kitInfo(n.kit)[2] : WC_KINDS[kk]}${n.glass ? " · زجاج" : ""}`;
    if (lab.length * 7.4 + 24 > w) lab = lab.replace(/ \(.*\)/, ""); // a narrow cell: the short name, else the icon alone
    if (lab.length * 7.4 + 24 > w) lab = "";
    if (big) h += `<text x="${x + w / 2}" y="${y + hh / 2 - 2}" class="wclab ${inv}" text-anchor="middle">${icon} ${lab}</text><text x="${x + w / 2}" y="${y + hh / 2 + 14}" class="wclab sm ${inv}" text-anchor="middle">${f1(c.x1 - c.x0)}×${f1(c.z1 - c.z0)}</text>`;
    else if (w > 26 && hh > 18 && (kk !== "empty" || on)) h += `<text x="${x + w / 2}" y="${y + hh / 2 + 5}" class="wclab ${inv}" text-anchor="middle">${icon}</text>`;
    if (on && multiOn) h += `<circle cx="${x + 14}" cy="${y + 14}" r="9" class="wctick"/><text x="${x + 14}" y="${y + 18}" text-anchor="middle" class="wctickt">✓</text>`;
    h += `</g>`;
  }
  // the room's doors / windows / sockets on this wall, over the cells (see-through), so the cells can be planned around them
  for (const o of ctx.holes || []) {
    const x0 = Math.max(0, o.x0), x1 = Math.min(P.width, o.x1), z0 = Math.max(0, o.z0), z1 = Math.min(P.height, o.z1);
    if (x1 - x0 < 0.5 || z1 - z0 < 0.5) continue;
    const lab = o.kind === "window" ? "شباك" : o.kind === "door" ? "باب" : o.label || "";
    h += `<g class="wchole ${o.kind}"><rect x="${X(x0)}" y="${Y(z1)}" width="${(x1 - x0) * k}" height="${(z1 - z0) * k}"/>${o.kind !== "pt" ? `<text x="${X((x0 + x1) / 2)}" y="${Y(z1) + 16}" text-anchor="middle">${lab} ${f1(o.x1 - o.x0)}×${f1(o.z1 - o.z0)}</text>` : `<text x="${X((x0 + x1) / 2)}" y="${Y((z0 + z1) / 2) + 4}" text-anchor="middle" class="pt">${lab}</text>`}</g>`;
  }
  // every split line is a handle: drag it with the finger
  const walk = (n, path) => {
    if (!n?.dir) return;
    const r = rectOf(path), s = partSizes(n, n.dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0);
    let a = n.dir === "v" ? r.x0 : r.z1;
    for (let i = 0; i < s.length - 1; i++) {
      a += n.dir === "v" ? s[i] : -s[i];
      const act = grip && same(grip.path, path) && grip.i === i ? "act" : "";
      if (n.dir === "v") { const gx = X(a), y0 = Y(r.z1), y1 = Y(r.z0); h += `<g class="wcgrip v ${act}" data-wcgrip="${key(path)}|${i}"><rect x="${gx - 11}" y="${y0}" width="22" height="${y1 - y0}"/><line x1="${gx}" y1="${y0 + 4}" x2="${gx}" y2="${y1 - 4}"/><rect class="knob" x="${gx - 5}" y="${(y0 + y1) / 2 - 16}" width="10" height="32" rx="5"/></g>`; }
      else { const gy = Y(a), x0 = X(r.x0), x1 = X(r.x1); h += `<g class="wcgrip h ${act}" data-wcgrip="${key(path)}|${i}"><rect x="${x0}" y="${gy - 11}" width="${x1 - x0}" height="22"/><line x1="${x0 + 4}" y1="${gy}" x2="${x1 - 4}" y2="${gy}"/><rect class="knob" x="${(x0 + x1) / 2 - 16}" y="${gy - 5}" width="32" height="10" rx="5"/></g>`; }
    }
    n.parts.forEach((q, i) => walk(q.node, [...path, i]));
  };
  walk(P.wc.root, []);
  // dimension chains: the whole wall outside (width under it, height on the left), every split on the way to the picked cell
  h += chainH(0, P.width, Y(0) + 24, "W", [], -1, "total");
  h += chainV(0, P.height, X(0) - 24, "H", [], -1, "total");
  const chainTo = grip ? [...grip.path, grip.i] : sel;
  let n = P.wc.root;
  for (let d = 0; d <= chainTo.length && n?.dir; d++) {
    const path = chainTo.slice(0, d), r = rectOf(path), s = partSizes(n, n.dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0);
    if (n.dir === "v") { let a = r.x0; s.forEach((v, i) => { h += chainH(a, a + v, d === 0 ? Y(P.height) - 22 : Y(r.z1) + 16, "P", path, i, n.parts[i].size == null ? "auto" : ""); a += v; }); }
    else { let b = r.z1; s.forEach((v, i) => { h += chainV(b - v, b, d === 0 ? X(P.width) + 26 : X(r.x0) + 18, "P", path, i, n.parts[i].size == null ? "auto" : ""); b -= v; }); }
    if (d < chainTo.length) n = n.parts[chainTo[d]]?.node;
  }
  svg.innerHTML = h.replace(/(width|height|r)="-[\d.e+-]*"/g, '$1="0"'); // a squeezed / tiny cell never draws a negative box
}
function cellArt(kk, n, x, y, w, h, c, k) {
  const L = (x1, y1, x2, y2, cls = "wcln") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
  const H = c.z1 - c.z0, Wc = c.x1 - c.x0;
  const glassR = (gx, gy, gw, gh) => (n.glass ? `<rect x="${gx + 7}" y="${gy + 7}" width="${Math.max(0, gw - 14)}" height="${Math.max(0, gh - 14)}" class="wcglass"/>` : "");
  const doorsArt = (dx, dy, dw, dh, cnt) => {
    let s = "";
    if (cnt === 2) { s += L(dx + dw / 2, dy + 3, dx + dw / 2, dy + dh - 3) + glassR(dx, dy, dw / 2, dh) + glassR(dx + dw / 2, dy, dw / 2, dh); s += `<circle cx="${dx + dw / 2 - 6}" cy="${dy + dh / 2}" r="2.5" class="wchd"/><circle cx="${dx + dw / 2 + 6}" cy="${dy + dh / 2}" r="2.5" class="wchd"/>`; }
    else { s += glassR(dx, dy, dw, dh) + `<circle cx="${n.hinge === "right" ? dx + 8 : dx + dw - 8}" cy="${dy + dh / 2}" r="2.5" class="wchd"/>`; }
    return s;
  };
  let s = "";
  const nMod = BOX.has(kk) ? wcModules(Wc, P.wc) : 1, per = wcDoorsPer(n, Wc, P.wc);
  const doorsRow = (dy, dh) => { let q = ""; for (let m = 0; m < nMod; m++) q += doorsArt(x + (w * m) / nMod, dy, w / nMod, dh, per); return q; };
  if (kk === "doors") s += doorsRow(y, h);
  if (kk === "combo") {
    const dc = n.dcount ?? 2, dhp = Math.min(n.dh ?? Math.min(18 * dc, H * 0.45), H - 30) * k, top = y + h - dhp;
    s += L(x + 2, top, x + w - 2, top);
    for (let i = 1; i < dc; i++) s += L(x + 2, top + (dhp * i) / dc, x + w - 2, top + (dhp * i) / dc);
    for (let i = 0; i < dc; i++) s += L(x + w / 2 - 10, top + (dhp * (i + 0.5)) / dc, x + w / 2 + 10, top + (dhp * (i + 0.5)) / dc, "wchd2");
    s += doorsRow(y, h - dhp);
  }
  if (kk === "wardrobe") {
    const cnt = n.count === 0 ? 0 : per, rods = n.rods ?? 1;
    const ry = y + Math.min(35, H * 0.2) * k + 8;
    s += L(x + 6, ry - 6, x + w - 6, ry - 6, "wcsh") + L(x + 8, ry, x + w - 8, ry, "wcrod");
    if (rods === 2) { const my = y + h / 2 + 4; s += L(x + 6, my - 6, x + w - 6, my - 6, "wcsh") + L(x + 8, my, x + w - 8, my, "wcrod"); }
    for (let i = 0; i < 3; i++) { const hx = x + (w * (i + 1)) / 4; s += `<path d="M${hx} ${ry} l-9 12 h18 z" class="wchang"/>`; }
    if (cnt > 0) s += doorsRow(y, h);
  }
  if (kk === "sliding") {
    const cnt = n.count ?? 2, wp = w / cnt;
    for (let i = 0; i < cnt; i++) s += `<rect x="${x + i * wp + (i % 2 ? 0 : 2)}" y="${y + (i % 2 ? 2 : 5)}" width="${wp}" height="${h - (i % 2 ? 4 : 10)}" class="wcslide ${i % 2 ? "f" : ""} ${n.glass ? "g" : ""}"/>`;
    s += L(x + w / 2 - 14, y + h - 10, x + w / 2 + 14, y + h - 10, "wchd2");
  }
  if (kk === "open" || kk === "niche" || kk === "flap") { const sh = n.shelves ?? (kk === "open" ? Math.max(0, Math.round(H / 35) - 1) : 0); for (let i = 1; i <= sh; i++) s += L(x + 3, y + (h * i) / (sh + 1), x + w - 3, y + (h * i) / (sh + 1), "wcsh"); }
  if (kk === "niche") s += `<rect x="${x + 5}" y="${y + 5}" width="${Math.max(0, w - 10)}" height="${Math.max(0, h - 10)}" class="wcin"/>`;
  if (kk === "drawers") { const cnt = n.count ?? Math.max(1, Math.min(6, Math.round(H / 22))); for (let i = 1; i < cnt; i++) s += L(x + 2, y + (h * i) / cnt, x + w - 2, y + (h * i) / cnt); for (let i = 0; i < cnt; i++) s += L(x + w / 2 - 10, y + (h * (i + 0.5)) / cnt, x + w / 2 + 10, y + (h * (i + 0.5)) / cnt, "wchd2"); }
  if (kk === "flap") s += glassR(x, y, w, h) + L(x + w / 2 - 12, y + h - 8, x + w / 2 + 12, y + h - 8, "wchd2");
  if (kk === "solid") {
    s += `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="url(#wchatch)"/>`;
    if (n.hole) { const q = wcHoleRect(c, n.hole), hx = view.X(q.x0), hy = view.Y(q.z1); s += `<rect x="${hx}" y="${hy}" width="${(q.x1 - q.x0) * k}" height="${(q.z1 - q.z0) * k}" class="wcniche"/>`; const ns = n.hole.shelves || 0; for (let i = 1; i <= ns; i++) { const yy = hy + ((q.z1 - q.z0) * k * i) / (ns + 1); s += L(hx + 2, yy, hx + (q.x1 - q.x0) * k - 2, yy, "wcsh"); } if (n.hole.led) s += L(hx + 3, hy + 2, hx + (q.x1 - q.x0) * k - 3, hy + 2, "wcled"); }
  }
  if (kk === "empty") s += `<rect x="${x + 2}" y="${y + 2}" width="${Math.max(0, w - 4)}" height="${Math.max(0, h - 4)}" class="wcempty"/>`;
  if (n.led && (kk === "open" || kk === "niche")) s += L(x + 4, y + 3, x + w - 4, y + 3, "wcled");
  for (let m = 1; m < nMod; m++) s += L(x + (w * m) / nMod, y + 1, x + (w * m) / nMod, y + h - 1, "wcmod");
  if (BOX.has(kk) && c.z0 < 0.5 && n.mount !== "flat") s += `<rect x="${x + 3}" y="${y + h - 10 * k}" width="${Math.max(0, w - 6)}" height="${10 * k}" class="wckick"/>`;
  return s;
}
function pill(cx, cy, txt, attrs, cls) {
  const tw = 10 + 7.6 * txt.length;
  return `<g class="wcdim ${cls}" ${attrs}><rect x="${cx - tw / 2}" y="${cy - 11}" width="${tw}" height="22" rx="11"/><text x="${cx}" y="${cy + 4.5}" text-anchor="middle">${txt}</text></g>`;
}
function chainH(a, b, y, kind, path, i, cls) {
  const { X } = view, x0 = X(a), x1 = X(b);
  if (x1 - x0 < 6) return "";
  return `<g class="wcchain"><line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/><line x1="${x0}" y1="${y - 5}" x2="${x0}" y2="${y + 5}"/><line x1="${x1}" y1="${y - 5}" x2="${x1}" y2="${y + 5}"/></g>` + pill((x0 + x1) / 2, y, f1(b - a), kind === "P" ? `data-wcdim="${key(path)}|${i}"` : `data-wcsize="width"`, cls);
}
function chainV(a, b, x, kind, path, i, cls) {
  const { Y } = view, y0 = Y(b), y1 = Y(a);
  if (y1 - y0 < 6) return "";
  return `<g class="wcchain"><line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/><line x1="${x - 5}" y1="${y0}" x2="${x + 5}" y2="${y0}"/><line x1="${x - 5}" y1="${y1}" x2="${x + 5}" y2="${y1}"/></g>` + pill(x, (y0 + y1) / 2, f1(b - a), kind === "P" ? `data-wcdim="${key(path)}|${i}"` : `data-wcsize="height"`, cls);
}
// ---------------------------------------------------------------- dragging a split line
function gripDown(e) {
  const g = e.target.closest?.("[data-wcgrip]");
  if (!g || !view) return;
  const [ps, is] = g.dataset.wcgrip.split("|"), path = unkey(ps), i = +is, n = nodeAt(path);
  if (!n?.dir) return;
  const r = rectOf(path), s = partSizes(n, n.dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0);
  grip = { path, i, dir: n.dir, s, x: e.clientX, y: e.clientY, pid: e.pointerId, snap: clone(P) };
  gripMoved = false;
  try { el.querySelector(".wcsvg").setPointerCapture(e.pointerId); } catch { /* gone */ }
  e.preventDefault();
}
function gripMove(e) {
  if (!grip || e.pointerId !== grip.pid) return;
  const dx = e.clientX - grip.x, dy = e.clientY - grip.y;
  if (!gripMoved && Math.hypot(dx, dy) < 6) return;
  gripMoved = true;
  const { path, i, s } = grip, n = nodeAt(path);
  if (!n?.parts?.[i + 1]) { grip = null; return; }
  const delta = (grip.dir === "v" ? dx : dy) / view.k;
  const pair = s[i] + s[i + 1];
  const a = Math.max(5, Math.min(pair - 5, Math.round(s[i] + delta)));
  n.parts[i].size = a; n.parts[i + 1].size = Math.round((pair - a) * 10) / 10;
  drawSvg(cells().c);
  const tag = el.querySelector(".wcgtag");
  tag.hidden = false;
  tag.textContent = `${f1(a)} | ${f1(pair - a)}`;
  const rc = el.querySelector(".wcstage").getBoundingClientRect();
  tag.style.left = `${e.clientX - rc.left + 18}px`; tag.style.top = `${e.clientY - rc.top - 44}px`;
}
function gripUp(e) {
  if (!grip || (e.pointerId !== undefined && e.pointerId !== grip.pid)) return;
  const g = grip;
  grip = null;
  if (gripMoved) { hist.push(g.snap); if (hist.length > 60) hist.shift(); draw(); setTimeout(() => { gripMoved = false; }, 0); }
  else { el.querySelector(".wcgtag")?.setAttribute("hidden", ""); }
}
// ---------------------------------------------------------------- actions
function onChange(e) {
  const t = e.target;
  if (t.dataset?.wclib) { const f = t.dataset.wclib, v = t.value; edit((n) => { if (v) n[f] = v; else delete n[f]; }); }
}
function onClick(e) {
  if (gripMoved) return;
  const t = e.target.closest("[data-wc],[data-wcpath],[data-wcdim],[data-wcsize],[data-wckind],[data-wcstep],[data-wcset],[data-wcfield],[data-wctog],[data-wchole],[data-wcdev],[data-wckit],[data-wctab],[data-wcstart]");
  if (!t) return;
  const d = t.dataset;
  if (d.wctog) {
    const on = t.checked, f = d.wctog;
    if (f === "hole") { edit((n, p) => { if (n.kind !== "solid") return; const r = rectOf(p); if (on) n.hole = { w: Math.max(5, Math.min(60, Math.floor(r.x1 - r.x0 - 10))), h: Math.max(5, Math.min(40, Math.floor(r.z1 - r.z0 - 10))), x: "center", z: "center", shelves: 0 }; else delete n.hole; }); return; }
    if (f === "hled") { edit((n) => { if (n.hole) { if (on) n.hole.led = true; else delete n.hole.led; } }); return; }
    edit((n) => { if (on) n[f] = true; else delete n[f]; });
    return;
  }
  if (d.wcpath != null) {
    const p = unkey(d.wcpath);
    if (multiOn) { const kk = d.wcpath, i = multi.indexOf(kk); if (i >= 0 && multi.length > 1) multi.splice(i, 1); else if (i < 0) multi.push(kk); sel = unkey(multi.at(-1)); }
    else sel = p;
    draw(); return;
  }
  if (d.wctab) { tab = d.wctab; draw(); return; }
  if (d.wcstart) { starter(d.wcstart); return; }
  if (d.wckit) {
    edit((n0, p) => { if (n0.kind === "kitchen" && n0.kit === d.wckit) return; const keep = { kind: "kitchen", kit: d.wckit }; if (n0.kind === "kitchen" && n0.kuid && kitRow(n0.kit) === kitRow(d.wckit)) keep.kuid = n0.kuid; setNode(p, keep); });
    return;
  }
  if (d.wckind) {
    let deep = false;
    edit((n, p) => {
      if (n.kind === d.wckind) return;
      const keep = { kind: d.wckind };
      for (const f of ["depth", "lib", "flib", "mat"]) if (n[f] != null) keep[f] = n[f];
      if (d.wckind === "device") keep.dev = "tv";
      // clothes need ~58–60 cm inside: a wardrobe / sliding cell gets that depth unless one was typed
      if ((d.wckind === "wardrobe" || d.wckind === "sliding") && (keep.depth ?? P.wc.depth) < 50) { keep.depth = 60; deep = true; }
      setNode(p, keep);
    });
    if (deep) ctx.alertBar("👔 العمق بقى 60 سم علشان الهدوم تاخد راحتها — تقدر تغيّره من «العمق»");
    return;
  }
  if (d.wcstep) {
    const f = d.wcstep, v = Math.max(+d.lo, Math.min(+d.hi, +d.cur + +d.d));
    if (f === "hshelves") { edit((n) => { if (n.hole) n.hole.shelves = v; }); return; }
    const k0 = nodeAt(sel)?.kind;
    edit((n) => { if (n.kind === k0) n[f] = v; });
    return;
  }
  if (d.wcset) { const k0 = nodeAt(sel)?.kind, num = ["count", "rods"].includes(d.wcset); edit((n) => { if (["count", "rods", "hinge"].includes(d.wcset) && n.kind !== k0) return; if (d.v === "") delete n[d.wcset]; else n[d.wcset] = num ? +d.v : d.v; }); return; }
  if (d.wcdev) { remember(); for (const p of targets()) { const n = nodeAt(p); if (n.kind !== "device") continue; n.dev = d.wcdev; delete n.tv; } const D = WC_DEVICES[d.wcdev]; if (D[1] && !multiOn) sizeTo(D[1], D[2], true); draw(); return; }
  if (d.wcfield) {
    const n = nodeAt(sel), f = d.wcfield;
    if (f === "depth") ctx.numAsk(t, "عمق الخانة", n.depth ?? P.wc.depth, (v) => edit((m) => { if (m.kind !== "device" && m.kind !== "empty") m.depth = Math.max(2, Math.min(80, v)); }), { min: 2 });
    if (f === "dh") { const r = rectOf(sel); ctx.numAsk(t, "ارتفاع الأدراج كلها", n.dh ?? Math.min(18 * (n.dcount ?? 2), (r.z1 - r.z0) * 0.45), (v) => edit((m) => { if (m.kind === "combo") m.dh = Math.max(10, Math.min(150, v)); }), { min: 10 }); }
    return;
  }
  if (d.wchole) {
    const n = nodeAt(sel), r = rectOf(sel), f = d.wchole;
    if (!n.hole) return;
    const q = wcHoleRect(r, n.hole);
    const cur = f === "x" ? q.x0 - r.x0 : f === "z" ? q.z0 : f === "depth" ? n.hole.depth ?? (n.depth ?? Math.min(30, P.wc.depth)) : n.hole[f];
    const lab = { w: "عرض فتحة التجويف", h: "ارتفاع فتحة التجويف", x: "بعده عن شمال الخانة", z: "ارتفاعه من الأرض", depth: "عمق التجويف" }[f];
    ctx.numAsk(t, lab, cur, (v) => { remember(); n.hole[f] = Math.round(v * 10) / 10; draw(); }, { min: f === "x" || f === "z" ? 0 : 2 });
    return;
  }
  if (d.wcsize) {
    const k = d.wcsize, cur = k === "depth" ? P.wc.depth : k === "module" ? P.wc.module_max : P[k];
    ctx.numAsk(t, { width: "عرض الحيطة كلها", height: "ارتفاعها", depth: "عمق الدواليب", module: "أقصى عرض للعلبة الواحدة" }[k], cur, (v) => { remember(); if (k === "depth") P.wc.depth = Math.max(5, Math.min(80, v)); else if (k === "module") P.wc.module_max = Math.max(40, Math.min(240, v)); else P[k] = Math.max(20, Math.min(k === "width" ? 1200 : 400, v)); draw(); }, { min: 5 });
    return;
  }
  if (d.wcdim) {
    const [ps, is] = d.wcdim.split("|"), path = unkey(ps), i = +is, n = nodeAt(path);
    const r = rectOf(path), s = partSizes(n, n.dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0);
    ctx.numAsk(t, n.dir === "v" ? "عرض الخانة" : "ارتفاع الخانة", s[i], (v) => { const snap = clone(P); if (setPart(path, i, v)) { hist.push(snap); draw(); } }, { min: 5 });
    return;
  }
  const a = d.wc;
  if (a === "done") {
    const { c, errs } = cells();
    if (errs.length) { ctx.alertBar("ظبّط المقاسات الأول: " + errs[0]); return; }
    // a niche must stay inside its solid cell with a frame around it
    const bad = c.find((x) => x.node.kind === "solid" && x.node.hole && (() => { const q = wcHoleRect(x, x.node.hole); return q.x0 < x.x0 + 3.6 || q.x1 > x.x1 - 3.6 || q.z0 < x.z0 + 3.6 || q.z1 > x.z1 - 3.6; })());
    const tiny = c.find((x) => (BOX.has(x.node.kind) || x.node.kind === "solid") && (x.x1 - x.x0 < 12 || x.z1 - x.z0 < 12));
    if (tiny) { sel = tiny.path; multiOn = false; draw(); ctx.alertBar(`الخانة دي ${f1(tiny.x1 - tiny.x0)}×${f1(tiny.z1 - tiny.z0)} صغيرة قوي على «${WC_KINDS[tiny.node.kind]}» — كبّرها أو خليها «فاضي»`); return; }
    if (bad) { sel = bad.path; multiOn = false; draw(); ctx.alertBar(`التجويف طالع برا التكسية (${f1(bad.x1 - bad.x0)}×${f1(bad.z1 - bad.z0)}) — صغّره أو حرّكه (يبعد 3.6 سم على الأقل عن أطرافها)`); return; }
    close(true); return;
  }
  if (a === "cancel") { close(false); return; }
  if (a === "undo") { const prev = hist.pop(); if (prev) { P = prev; fixSel(); draw(); } return; }
  if (a === "fitw") { remember(); P.width = ctx.wallLen; draw(); ctx.alertBar(`العرض بقى ${f1(P.width)} سم = طول الحيطة — الخانات «تلقائي» هي اللي اتمطّت`); return; }
  if (a === "fith") { remember(); P.height = Math.min(400, ctx.wallH); draw(); return; }
  if (a === "merge") { if (!sel.length) return; remember(); const leaf = nodeAt(sel); const pp = sel.slice(0, -1); setNode(pp, clone(leaf)); sel = pp; multi = []; multiOn = false; draw(); return; }
  if (a === "splitv" || a === "splith") { askSplit(t, a === "splitv" ? "v" : "h"); return; }
  if (a === "dup") { dupCell(); return; }
  if (a === "swapa" || a === "swapb") { swapCell(a === "swapa" ? -1 : 1); return; }
  if (a === "copy") { const n = nodeAt(sel); if (n && !n.dir) { clip = clone(n); ctx.alertBar(`📋 اتنسخت إعدادات «${WC_KINDS[n.kind]}» — اختار خانة (أو أكتر) ودوس «الصق»`); draw(); } return; }
  if (a === "paste") { if (!clip) return; edit((n, p) => setNode(p, clone(clip))); return; }
  if (a === "multi") { multiOn = !multiOn; multi = multiOn ? [key(sel)] : []; draw(); if (multiOn) ctx.alertBar("☑ دوس على الخانات اللي عايزها — أي حاجة تغيّرها بتتطبّق عليهم كلهم"); return; }
  if (a === "row") { if (!sel.length) return; const par = sel.slice(0, -1); multi = leaves(nodeAt(par), par).map(key); multiOn = true; draw(); return; }
  if (a === "holec") { const n = nodeAt(sel); if (n.hole) { remember(); n.hole.x = "center"; n.hole.z = "center"; draw(); } return; }
  if (a === "devsize") { const n = nodeAt(sel), D = WC_DEVICES[n.dev || "other"]; if (D?.[1]) { remember(); sizeTo(D[1], D[2]); draw(); } return; }
  if (a === "suggest") { suggest(); return; }
  if (a === "starters") { showStart = !showStart; draw(); if (showStart) el.querySelector(".wcside").scrollTop = 0; return; }
  if (a === "kitw") { const n = nodeAt(sel), w = kitInfo(n.kit)[3]; if (w) { const snap = clone(P); const ok = setCellSize(sel, "v", w); if (ok) { hist.push(snap); draw(); } else if (ok === null) ctx.alertBar("قسّم الحيطة طولي الأول علشان العرض يتظبط"); } return; }
  if (a === "kith") { const snap = clone(P); const ok = setCellSize(sel, "h", ctx.kdef?.baseTop || 90); if (ok) { hist.push(snap); draw(); } else if (ok === null) ctx.alertBar("قسّمها عرضي الأول (صفوف) علشان الارتفاع يتظبط"); return; }
}
function fixSel() {
  if (!nodeAt(sel) || nodeAt(sel).dir) sel = firstLeaf(P.wc.root, []);
  multi = multi.filter((k) => { const n = nodeAt(unkey(k)); return n && !n.dir; });
  if (!multi.length) multiOn = false;
}
/** make the picked cell w × h (each only when a split of that direction holds it) */
function sizeTo(w, h, quiet = false) {
  const okW = setCellSize(sel, "v", w), okH = setCellSize(sel, "h", h);
  if (!quiet && (okW === null || okH === null)) ctx.alertBar("علشان تظبط مقاسها لازم تكون الخانة جوه تقسيم (قسّمها طولي وعرضي الأول)");
}
/** a copy of the picked cell right after it: takes its size from the cells that share the rest, else the cell is halved */
function dupCell() {
  const n = nodeAt(sel);
  if (!n || n.dir) return;
  remember();
  if (!sel.length) { P.wc.root = { dir: "v", parts: [{ size: null, node: clone(n) }, { size: null, node: clone(n) }] }; sel = [0]; draw(); return; }
  const pp = sel.slice(0, -1), par = nodeAt(pp), i = sel.at(-1), r = rectOf(pp), total = par.dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0, s = partSizes(par, total);
  if (par.parts.length >= 12) { hist.pop(); ctx.alertBar("أقصى 12 خانة في التقسيم الواحد"); return; }
  const autosOther = par.parts.map((q, j) => (j !== i && q.size == null ? s[j] : 0)).reduce((t, v) => t + v, 0);
  const nAuto = par.parts.filter((q, j) => j !== i && q.size == null).length;
  if (nAuto && autosOther - s[i] >= 5 * nAuto) {
    par.parts[i].size = Math.round(s[i] * 10) / 10;
    par.parts.splice(i + 1, 0, { size: Math.round(s[i] * 10) / 10, node: clone(n) });
    ctx.alertBar(`⧉ اتعملت نسخة ${f1(s[i])} سم — خدت مكانها من الخانات التلقائي`);
  } else {
    const half = Math.round((s[i] / 2) * 10) / 10;
    par.parts[i].size = par.parts[i].size == null ? null : half;
    par.parts.splice(i + 1, 0, { size: par.parts[i].size == null ? null : Math.round((s[i] - half) * 10) / 10, node: clone(n) });
    ctx.alertBar(`⧉ مفيش مكان فاضي — الخانة اتقسمت نصين زي بعض (${f1(half)} سم)`);
  }
  sel = [...pp, i + 1];
  draw();
}
function swapCell(dir) {
  if (!sel.length) return;
  const pp = sel.slice(0, -1), par = nodeAt(pp), i = sel.at(-1), j = i + dir;
  if (j < 0 || j >= par.parts.length) return;
  remember();
  [par.parts[i], par.parts[j]] = [par.parts[j], par.parts[i]];
  sel = [...pp, j];
  multi = []; multiOn = false;
  draw();
}
/** split the whole wall around the room's windows and doors: a column over each opening (cabinet under the sill, the opening empty,
 *  a cabinet over it), the rest as cabinets */
function suggest() {
  const W = P.width, H = P.height;
  const hs = (ctx.holes || []).filter((o) => o.kind !== "pt" && o.x1 > 0.5 && o.x0 < W - 0.5).map((o) => ({ ...o, x0: Math.max(0, o.x0), x1: Math.min(W, o.x1), z0: Math.max(0, o.z0), z1: Math.min(H, o.z1) })).sort((a, b) => a.x0 - b.x0);
  if (!hs.length) { ctx.alertBar("مفيش شبابيك ولا أبواب على الحيطة دي"); return; }
  // openings that overlap along the wall make one column
  const groups = [];
  for (const o of hs) { const g = groups.at(-1); if (g && o.x0 < g.x1 + 5) { g.x1 = Math.max(g.x1, o.x1); g.z0 = Math.min(g.z0, o.z0); g.z1 = Math.max(g.z1, o.z1); g.kind = g.kind === "door" || o.kind === "door" ? "door" : "window"; } else groups.push({ ...o }); }
  const cols = [];
  let x = 0;
  const box = (w) => ({ kind: w >= 30 ? "doors" : "open" });
  for (const g of groups) {
    if (g.x0 - x >= 5) cols.push({ size: g.x0 - x, node: box(g.x0 - x) });
    else if (cols.length && g.x0 > x) cols.at(-1).size += g.x0 - x;
    const rows = [];
    const above = H - g.z1, below = g.z0;
    if (above >= 15) rows.push({ size: above, node: { kind: "doors" } });
    rows.push({ size: (above >= 15 ? g.z1 : H) - (below >= 15 ? g.z0 : 0), node: { kind: "empty" } });
    if (below >= 15) rows.push({ size: below, node: { kind: below > 100 ? "doors" : below > 45 ? "drawers" : "open" } });
    rows[rows.length - 1].size = null;
    cols.push({ size: g.x1 - g.x0, node: rows.length > 1 ? { dir: "h", parts: rows } : rows[0].node });
    x = g.x1;
  }
  if (W - x >= 5) cols.push({ size: null, node: box(W - x) }); else if (cols.length) cols.at(-1).size = null;
  cols.forEach((c) => { if (c.size != null) c.size = Math.round(c.size * 10) / 10; });
  if (!cols.some((c) => c.size == null)) cols.at(-1).size = null;
  remember();
  P.wc.root = cols.length > 1 ? { dir: "v", parts: cols.slice(0, 12) } : cols[0].node;
  sel = firstLeaf(P.wc.root, []); multi = []; multiOn = false;
  draw();
  ctx.alertBar(`🪟 اتقسمت حوالين ${groups.length} ${groups.length > 1 ? "فتحات" : "فتحة"} — غيّر أي خانة، أو ↶ ترجع زي ما كانت`);
}
// ---------------------------------------------------------------- quick starters: the whole wall in one tap
const STARTERS = [["kitchen", "🍳", "مطبخ"], ["closet", "👔", "دولاب هدوم"], ["dressing", "🚪", "دريسنج مفتوح"], ["tv", "📺", "حيطة تلفزيون"], ["study", "📚", "مكتبة ومكتب"], ["shelves", "🗄", "مكتبة حيطة"]];
const part = (size, node) => ({ size, node });
const rows = (...p) => ({ dir: "h", parts: p });
const cols = (...p) => ({ dir: "v", parts: p });
/** columns of about `each` cm filling w (equal, whole cm; the last takes the rest) */
function spread(w, each, mk) { const n = Math.max(1, Math.round(w / each)), a = Math.floor(w / n); return Array.from({ length: n }, (_, i) => part(i === n - 1 ? null : a, mk(i, n))); }
function starter(id) {
  const W = P.width, H = P.height;
  let root;
  if (id === "kitchen") {
    // NOVERA heights: base 86 with the counter, wall units 145 → 215, tall 215; the sink under the window, the cooker away from it
    const KD = ctx.kdef || { baseTop: 90, wallZ: 145, wallH: 80 }; // v124: the same heights as everywhere else (defaults ⚙)
    const pr = proposeKitchen(W, ctx.holes || []), wallTop = Math.min(KD.wallZ + KD.wallH, H), top = H - wallTop;
    const col = (c) => {
      if (c.tall) return top >= 5 ? rows(part(null, { kind: "empty" }), part(wallTop, { kind: "kitchen", kit: c.tall })) : { kind: "kitchen", kit: c.tall };
      const p = [];
      if (top >= 5) p.push(part(top, { kind: "empty" }));
      p.push(part(KD.wallH, c.wall ? { kind: "kitchen", kit: c.wall } : { kind: "empty" }));
      p.push(part(null, { kind: "empty" }));
      p.push(part(KD.baseTop, { kind: "kitchen", kit: c.base || "k_base2" }));
      return rows(...p);
    };
    const ps = [];
    if (pr.s0 >= 5) ps.push(part(pr.s0, { kind: "empty" }));
    for (const c of pr.cols) ps.push(part(c.w, col(c)));
    const used = pr.s0 + pr.cols.reduce((t, c) => t + c.w, 0);
    if (W - used >= 5) ps.push(part(null, { kind: "empty" })); else if (ps.length) ps[ps.length - 1].size = null;
    if (!pr.cols.length) { ctx.alertBar("الحيطة قصيرة على مطبخ (أو باب في نصها) — قسّمها بإيدك من تبويب 🍳"); return; }
    root = ps.length > 1 ? cols(...ps.slice(0, 12)) : ps[0].node;
  } else if (id === "closet") {
    P.wc.depth = Math.max(P.wc.depth, 60);
    root = cols(...spread(W, 90, (i, n) => (i === Math.floor(n / 2) && n >= 3 ? { kind: "combo", dcount: 3, dh: 60, shelves: 2 } : { kind: "wardrobe", rods: i % 2 ? 2 : 1 })));
  } else if (id === "dressing") {
    P.wc.depth = Math.max(P.wc.depth, 55);
    root = cols(...spread(W, 80, (i) => (i % 3 === 1 ? rows(part(null, { kind: "open", shelves: 4 }), part(70, { kind: "drawers", count: 3 })) : { kind: "wardrobe", rods: i % 3 === 2 ? 2 : 1, count: 0 })));
  } else if (id === "tv") {
    const side = W >= 300 ? 60 : Math.max(30, Math.round(W * 0.18));
    root = cols(part(side, { kind: "open", led: true }), part(null, rows(part(Math.max(20, H - 175), { kind: "solid" }), part(null, { kind: "device", dev: "tv" }), part(50, { kind: "drawers", count: 2, depth: 45 }))), part(side, { kind: "open", led: true }));
  } else if (id === "study") {
    const side = Math.min(90, Math.round(W * 0.3));
    root = cols(part(side, rows(part(null, { kind: "open" }), part(80, { kind: "doors" }))), part(null, rows(part(Math.min(60, H * 0.25), { kind: "doors", shelves: 0 }), part(60, { kind: "niche", led: true, depth: 25 }), part(null, { kind: "empty" }))), part(side, rows(part(null, { kind: "open" }), part(80, { kind: "doors" }))));
  } else {
    root = cols(...spread(W, 80, () => rows(part(null, { kind: "open", led: true }), part(85, { kind: "doors" }))));
  }
  remember();
  P.wc.root = root;
  sel = firstLeaf(P.wc.root, []); multi = []; multiOn = false; tab = id === "kitchen" ? "kitchen" : "box"; showStart = false;
  draw();
  ctx.alertBar(id === "kitchen" ? "🍳 ده اقتراح مطبخ: كل خانة 🍳 هتطلع وحدة مطبخ حقيقية — دوس على أي خانة وغيّر نوعها من تبويب «🍳 مطبخ»" : "✓ اتقسمت — دوس على أي خانة وغيّرها، أو ↶ ترجع");
}
/** how to split the picked cell: 2 / 3 / 4 equal, or typed sizes (60,200,60 — the last one may be left out: it takes the rest) */
function askSplit(btn, dir) {
  const n = nodeAt(sel), r = rectOf(sel), total = dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0;
  if (n?.dir) return;
  document.querySelector(".wcask")?.remove();
  const box = document.createElement("div");
  box.className = "wcask";
  box.innerHTML = `<b>${dir === "v" ? "⇹ أعمدة جنب بعض" : "⇵ صفوف فوق بعض"} <small>(${f1(total)} سم)</small></b>
    <div class="wceq">${[2, 3, 4, 5].map((k) => `<button data-eq="${k}">${k} متساوي<small>${f1(total / k)}</small></button>`).join("")}</div>
    <label>أو اكتب المقاسات ${dir === "v" ? "من الشمال" : "من فوق"} بفصلة<input type="text" inputmode="decimal" data-keypad data-kpcomma placeholder="${dir === "v" ? "60,200,60" : "80,130"}"></label>
    <div class="wcaskb"><button class="wcb primary" data-go>قسّم</button><button class="wcb" data-x>إلغاء</button></div>`;
  el.appendChild(box);
  const inp = box.querySelector("input");
  const go = (sizes) => {
    if (!sizes || sizes.length < 1) return;
    let parts;
    if (sizes.length === 1 && Number.isInteger(sizes[0]) && sizes[0] >= 2 && sizes[0] <= 12) parts = Array.from({ length: sizes[0] }, () => ({ size: null }));
    else {
      const sum = sizes.reduce((t, v) => t + v, 0);
      if (sizes.some((v) => !(v >= 5))) { ctx.alertBar("كل مقاس لازم 5 سم على الأقل"); return; }
      if (sum > total + 0.05) { ctx.alertBar(`المقاسات (${f1(sum)}) أكبر من الخانة (${f1(total)})`); return; }
      parts = sizes.map((v) => ({ size: v }));
      if (total - sum >= 5) parts.push({ size: null }); else parts[parts.length - 1].size = null; // the rest (or the last typed one) fills up exactly
    }
    if (parts.length < 2) { ctx.alertBar("محتاج خانتين على الأقل"); return; }
    remember();
    const base = clone(n);
    delete base.hole;
    setNode(sel, { dir, parts: parts.map((q) => ({ size: q.size, node: clone(base) })) });
    sel = [...sel, 0]; multi = []; multiOn = false;
    box.remove(); draw();
  };
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.eq) go([+b.dataset.eq]);
    else if (b.hasAttribute("data-go")) go(String(inp.value).split(/[,،+\s]+/).map((x) => parseFloat(x)).filter((x) => Number.isFinite(x)));
    else if (b.hasAttribute("data-x")) box.remove();
  });
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") box.querySelector("[data-go]").click(); });
}
