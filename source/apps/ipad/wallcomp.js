// NOVERA Studio v118 — «قسّم الحيطة»: a wall seen from the front, divided into cells with the finger and with numbers.
// Tap a cell to pick it · split it into columns (⇹) or rows (⇵) by typed sizes or equally · every size on the drawing is a
// button: tap it and type · each cell gets what it is (cabinet with doors, open shelves, drawers, flap, decorative niche,
// solid built-out face, a place for an appliance / TV, nothing). «✓ خلصت» writes it all back into the unit (template wall_comp)
// and the engine turns every cell into real boards.
import { wallCompLayout, WC_KINDS } from "./engine/panel/templatesRooms.js";

const KIND_ICON = { doors: "🚪", open: "📚", drawers: "🗄", flap: "⬆", niche: "◫", solid: "▮", device: "📺", empty: "⬚" };
const KIND_FILL = { doors: "#d7c4a3", open: "#efe6d4", drawers: "#d3c09d", flap: "#dccbab", niche: "#c9d8cf", solid: "#b7a58a", device: "#2b2f2c", empty: "transparent" };
const BOX = new Set(["doors", "open", "drawers", "flap", "niche"]);
let ctx = null, P = null, sel = [], hist = [], el = null, view = null;
const clone = (o) => JSON.parse(JSON.stringify(o));
const f1 = (v) => String(Math.round(v * 10) / 10);

export function open(unit, c) {
  ctx = c;
  const p = c.params(unit);
  P = { width: +p.width || 360, height: +p.height || 260, wc: clone(p.wc || {}) };
  if (!P.wc.root) P.wc.root = { kind: "open" };
  P.wc.depth ??= 35; P.wc.max_board ??= 240;
  hist = [];
  sel = firstLeaf(P.wc.root, []);
  el = document.createElement("div");
  el.id = "wcomp"; el.className = "wcomp";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "قسّم الحيطة");
  document.body.appendChild(el);
  document.body.classList.add("inwcomp");
  el.addEventListener("click", onClick);
  el.addEventListener("pointerdown", (e) => e.stopPropagation());
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
function setNode(path, node) {
  if (!path.length) { P.wc.root = node; return; }
  const parent = nodeAt(path.slice(0, -1));
  parent.parts[path.at(-1)].node = node;
}
function remember() { hist.push(clone(P)); if (hist.length > 60) hist.shift(); }
function cells() { const errs = []; const c = wallCompLayout(P.wc, P.width, P.height, errs); return { c, errs }; }
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
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
// ---------------------------------------------------------------- drawing
function draw() {
  if (!el) return;
  const { c, errs } = cells();
  const leaf = nodeAt(sel) || {};
  el.innerHTML = `
    <div class="wchead">
      <b>🧩 قسّم الحيطة</b>
      <button class="wcsz" data-wcsize="width">العرض <b>${f1(P.width)}</b></button>
      <button class="wcsz" data-wcsize="height">الارتفاع <b>${f1(P.height)}</b></button>
      <button class="wcsz" data-wcsize="depth">العمق <b>${f1(P.wc.depth)}</b></button>
      <span class="wcsp"></span>
      <button class="wcb" data-wc="undo" ${hist.length ? "" : "disabled"} title="تراجع">↶</button>
      <button class="wcb primary" data-wc="done">✓ خلصت</button>
      <button class="wcb" data-wc="cancel" aria-label="اقفل من غير حفظ">✕</button>
    </div>
    <div class="wcbody">
      <div class="wcstage"><svg class="wcsvg" role="img" aria-label="واجهة الحيطة مقسومة"></svg>${errs.length ? `<p class="wcerr">⛔ ${ctx.esc(errs[0])}</p>` : ""}</div>
      <aside class="wcside">${sideHtml(leaf)}</aside>
    </div>
    <div class="wcfoot">
      <button class="wcb" data-wc="splitv">⇹ قسّمها طولي<small>أعمدة جنب بعض</small></button>
      <button class="wcb" data-wc="splith">⇵ قسّمها عرضي<small>صفوف فوق بعض</small></button>
      <button class="wcb" data-wc="merge" ${sel.length ? "" : "disabled"}>⊟ شيل التقسيم<small>ترجع خانة واحدة</small></button>
      <span class="wchint">دوس على خانة تختارها · دوس على أي مقاس تكتبه</span>
    </div>`;
  drawSvg(c);
}
function sideHtml(n) {
  if (!n || n.dir) return "";
  const k = n.kind || "empty", r = rectOf(sel), h = r.z1 - r.z0, w = r.x1 - r.x0;
  const chip = (kk) => `<button class="wckind ${k === kk ? "on" : ""}" data-wckind="${kk}"><i>${KIND_ICON[kk]}</i>${WC_KINDS[kk]}</button>`;
  const stepper = (f, label, v, lo, hi) => `<div class="wcrow"><span>${label}</span><span class="wcstep"><button data-wcstep="${f}" data-d="-1" ${v <= lo ? "disabled" : ""}>−</button><b>${v}</b><button data-wcstep="${f}" data-d="1" ${v >= hi ? "disabled" : ""}>+</button></span></div>`;
  let h2 = "";
  if (BOX.has(k) || k === "solid") h2 += `<div class="wcrow"><span>العمق</span><button class="wcnum" data-wcfield="depth">${n.depth != null ? f1(n.depth) : `${f1(k === "solid" ? Math.min(30, P.wc.depth) : P.wc.depth)} <small>زي الباقي</small>`}</button></div>`;
  if (k === "doors") { h2 += `<div class="wcrow"><span>الضلف</span><span class="wcseg">${[1, 2].map((x) => `<button data-wcset="count" data-v="${x}" class="${(n.count ?? (w >= 70 ? 2 : 1)) === x ? "on" : ""}">${x === 1 ? "ضلفة" : "ضلفتين"}</button>`).join("")}</span></div>`; h2 += stepper("shelves", "الأرفف جوه", n.shelves ?? 2, 0, 12); }
  if (k === "open") h2 += stepper("shelves", "الأرفف", n.shelves ?? Math.max(0, Math.round(h / 35) - 1), 0, 12);
  if (k === "niche" || k === "flap") h2 += stepper("shelves", "أرفف", n.shelves ?? 0, 0, 6);
  if (k === "drawers") h2 += stepper("count", "عدد الأدراج", n.count ?? Math.max(1, Math.min(6, Math.round(h / 22))), 1, 6);
  if (k === "open" || k === "niche" || k === "solid") h2 += `<label class="wcchk"><input type="checkbox" data-wctog="led" ${n.led ? "checked" : ""}> ليد ${k === "solid" ? "ورا التكسية" : "تحت كل رف"}</label>`;
  if (k === "device") h2 += `<label class="wcchk"><input type="checkbox" data-wctog="tv" ${n.tv ? "checked" : ""}> شاشة (حامل شاشة في الهاردوير)</label>`;
  if (BOX.has(k) || k === "solid") h2 += `<div class="wcrow"><span>الخامة</span><span class="wcseg">${[["", k === "solid" || k === "niche" ? "المميزة" : "الهيكل"], ...(k === "solid" || k === "niche" ? [["carcass", "الهيكل"]] : [["accent", "المميزة"]]), ["front", "زي الضلف"]].map(([v, l]) => `<button data-wcset="mat" data-v="${v}" class="${(n.mat || "") === v ? "on" : ""}">${l}</button>`).join("")}</span></div>`;
  return `<h3>الخانة المختارة <small>${f1(w)} × ${f1(h)} سم · على ارتفاع ${f1(r.z0)}</small></h3>
    <div class="wckinds">${Object.keys(WC_KINDS).map(chip).join("")}</div>${h2}
    ${r.z1 - r.z0 > P.wc.max_board + 0.01 && BOX.has(k) ? `<p class="wcnote">أطول من لوح (${f1(P.wc.max_board)}) — هتتعمل علبة + تكملة فوقها أوتوماتيك.</p>` : ""}`;
}
function drawSvg(list) {
  const svg = el.querySelector(".wcsvg"), host = el.querySelector(".wcstage");
  const Wpx = host.clientWidth || 700, Hpx = host.clientHeight || 500;
  const mL = 46, mR = 64, mT = 56, mB = 46;
  const k = Math.min((Wpx - mL - mR) / P.width, (Hpx - mT - mB) / P.height);
  const ox = mL + ((Wpx - mL - mR) - P.width * k) / 2, oy = mT + ((Hpx - mT - mB) - P.height * k) / 2;
  const X = (x) => ox + x * k, Y = (z) => oy + (P.height - z) * k;
  view = { X, Y, k };
  svg.setAttribute("viewBox", `0 0 ${Wpx} ${Hpx}`);
  let h = `<defs><pattern id="wchatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="rgba(0,0,0,.18)" stroke-width="2"/></pattern></defs>
    <rect x="${X(0)}" y="${Y(P.height)}" width="${P.width * k}" height="${P.height * k}" class="wcwall"/>`;
  for (const c of list) {
    const n = c.node, kk = n.kind || "empty", x = X(c.x0), y = Y(c.z1), w = (c.x1 - c.x0) * k, hh = (c.z1 - c.z0) * k, on = same(c.path, sel);
    h += `<g class="wccell ${kk} ${on ? "on" : ""}" data-wcpath="${c.path.join(".")}"><rect x="${x + 1}" y="${y + 1}" width="${Math.max(0, w - 2)}" height="${Math.max(0, hh - 2)}" fill="${KIND_FILL[kk]}" rx="2"/>`;
    h += cellArt(kk, n, x + 1, y + 1, w - 2, hh - 2, c);
    const big = w > 70 && hh > 34;
    if (big) h += `<text x="${x + w / 2}" y="${y + hh / 2 - 2}" class="wclab ${kk === "device" ? "inv" : ""}" text-anchor="middle">${KIND_ICON[kk]} ${WC_KINDS[kk]}</text><text x="${x + w / 2}" y="${y + hh / 2 + 14}" class="wclab sm ${kk === "device" ? "inv" : ""}" text-anchor="middle">${f1(c.x1 - c.x0)}×${f1(c.z1 - c.z0)}</text>`;
    else if (w > 26 && hh > 18) h += `<text x="${x + w / 2}" y="${y + hh / 2 + 5}" class="wclab ${kk === "device" ? "inv" : ""}" text-anchor="middle">${KIND_ICON[kk]}</text>`;
    h += `</g>`;
  }
  // the room's doors / windows / sockets on this wall, over the cells (see-through), so the cells can be planned around them
  for (const o of ctx.holes || []) {
    const x0 = Math.max(0, o.x0), x1 = Math.min(P.width, o.x1), z0 = Math.max(0, o.z0), z1 = Math.min(P.height, o.z1);
    if (x1 - x0 < 0.5 || z1 - z0 < 0.5) continue;
    const lab = o.kind === "window" ? "شباك" : o.kind === "door" ? "باب" : o.label || "";
    h += `<g class="wchole ${o.kind}"><rect x="${X(x0)}" y="${Y(z1)}" width="${(x1 - x0) * k}" height="${(z1 - z0) * k}"/>${o.kind !== "pt" ? `<text x="${X((x0 + x1) / 2)}" y="${Y(z1) + 16}" text-anchor="middle">${lab} ${f1(o.x1 - o.x0)}×${f1(o.z1 - o.z0)}</text>` : `<text x="${X((x0 + x1) / 2)}" y="${Y((z0 + z1) / 2) + 4}" text-anchor="middle" class="pt">${lab}</text>`}</g>`;
  }
  // dimension chains: the whole wall outside (width under it, height on the left), every split on the way to the picked cell
  h += chainH(0, P.width, Y(0) + 24, "W", [], -1, "total");
  h += chainV(0, P.height, X(0) - 24, "H", [], -1, "total");
  let n = P.wc.root;
  for (let d = 0; d <= sel.length && n?.dir; d++) {
    const path = sel.slice(0, d), r = rectOf(path), s = partSizes(n, n.dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0);
    if (n.dir === "v") { let a = r.x0; s.forEach((v, i) => { h += chainH(a, a + v, d === 0 ? Y(P.height) - 22 : Y(r.z1) + 16, "P", path, i, n.parts[i].size == null ? "auto" : ""); a += v; }); }
    else { let b = r.z1; s.forEach((v, i) => { h += chainV(b - v, b, d === 0 ? X(P.width) + 26 : X(r.x0) + 18, "P", path, i, n.parts[i].size == null ? "auto" : ""); b -= v; }); }
    if (d < sel.length) n = n.parts[sel[d]].node;
  }
  svg.innerHTML = h;
}
function cellArt(kk, n, x, y, w, h, c) {
  const L = (x1, y1, x2, y2, cls = "wcln") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
  let s = "";
  if (kk === "doors") { const cnt = n.count ?? ((c.x1 - c.x0) >= 70 ? 2 : 1); if (cnt === 2) s += L(x + w / 2, y + 3, x + w / 2, y + h - 3); s += `<circle cx="${cnt === 2 ? x + w / 2 - 6 : x + w - 8}" cy="${y + h / 2}" r="2.5" class="wchd"/>${cnt === 2 ? `<circle cx="${x + w / 2 + 6}" cy="${y + h / 2}" r="2.5" class="wchd"/>` : ""}`; }
  if (kk === "open" || kk === "niche" || kk === "flap") { const sh = n.shelves ?? (kk === "open" ? Math.max(0, Math.round((c.z1 - c.z0) / 35) - 1) : 0); for (let i = 1; i <= sh; i++) s += L(x + 3, y + (h * i) / (sh + 1), x + w - 3, y + (h * i) / (sh + 1), "wcsh"); }
  if (kk === "niche") s += `<rect x="${x + 5}" y="${y + 5}" width="${Math.max(0, w - 10)}" height="${Math.max(0, h - 10)}" class="wcin"/>`;
  if (kk === "drawers") { const cnt = n.count ?? Math.max(1, Math.min(6, Math.round((c.z1 - c.z0) / 22))); for (let i = 1; i < cnt; i++) s += L(x + 2, y + (h * i) / cnt, x + w - 2, y + (h * i) / cnt); for (let i = 0; i < cnt; i++) s += L(x + w / 2 - 10, y + (h * (i + 0.5)) / cnt, x + w / 2 + 10, y + (h * (i + 0.5)) / cnt, "wchd2"); }
  if (kk === "flap") s += L(x + w / 2 - 12, y + h - 8, x + w / 2 + 12, y + h - 8, "wchd2");
  if (kk === "solid") s += `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="url(#wchatch)"/>`;
  if (kk === "empty") s += `<rect x="${x + 2}" y="${y + 2}" width="${Math.max(0, w - 4)}" height="${Math.max(0, h - 4)}" class="wcempty"/>`;
  if (n.led && (kk === "open" || kk === "niche")) s += L(x + 4, y + 3, x + w - 4, y + 3, "wcled");
  return s;
}
function pill(cx, cy, txt, attrs, cls) {
  const tw = 10 + 7.6 * txt.length;
  return `<g class="wcdim ${cls}" ${attrs}><rect x="${cx - tw / 2}" y="${cy - 11}" width="${tw}" height="22" rx="11"/><text x="${cx}" y="${cy + 4.5}" text-anchor="middle">${txt}</text></g>`;
}
function chainH(a, b, y, kind, path, i, cls) {
  const { X } = view, x0 = X(a), x1 = X(b);
  if (x1 - x0 < 6) return "";
  return `<g class="wcchain"><line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/><line x1="${x0}" y1="${y - 5}" x2="${x0}" y2="${y + 5}"/><line x1="${x1}" y1="${y - 5}" x2="${x1}" y2="${y + 5}"/></g>` + pill((x0 + x1) / 2, y, f1(b - a), kind === "P" ? `data-wcdim="${path.join(".")}|${i}"` : `data-wcsize="width"`, cls);
}
function chainV(a, b, x, kind, path, i, cls) {
  const { Y } = view, y0 = Y(b), y1 = Y(a);
  if (y1 - y0 < 6) return "";
  return `<g class="wcchain"><line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/><line x1="${x - 5}" y1="${y0}" x2="${x + 5}" y2="${y0}"/><line x1="${x - 5}" y1="${y1}" x2="${x + 5}" y2="${y1}"/></g>` + pill(x, (y0 + y1) / 2, f1(b - a), kind === "P" ? `data-wcdim="${path.join(".")}|${i}"` : `data-wcsize="height"`, cls);
}
// ---------------------------------------------------------------- actions
function onClick(e) {
  const t = e.target.closest("[data-wc],[data-wcpath],[data-wcdim],[data-wcsize],[data-wckind],[data-wcstep],[data-wcset],[data-wcfield],[data-wctog],[data-wcsplit]");
  if (!t) return;
  const d = t.dataset;
  if (d.wctog) { const n = nodeAt(sel); remember(); if (t.checked) n[d.wctog] = true; else delete n[d.wctog]; draw(); return; }
  if (d.wcpath != null) { sel = d.wcpath === "" ? [] : d.wcpath.split(".").map(Number); draw(); return; }
  if (d.wckind) { const n = nodeAt(sel); if (!n || n.dir) return; remember(); const keep = n.kind === d.wckind ? n : { kind: d.wckind }; if (d.wckind === "device" && n.kind !== "device") keep.tv = true; setNode(sel, keep); draw(); return; }
  if (d.wcstep) { const n = nodeAt(sel), r = rectOf(sel); remember(); const cur = n[d.wcstep] ?? (d.wcstep === "count" ? Math.max(1, Math.min(6, Math.round((r.z1 - r.z0) / 22))) : n.kind === "open" ? Math.max(0, Math.round((r.z1 - r.z0) / 35) - 1) : n.kind === "doors" ? 2 : 0); n[d.wcstep] = Math.max(d.wcstep === "count" ? 1 : 0, Math.min(d.wcstep === "count" ? 6 : 12, cur + +d.d)); draw(); return; }
  if (d.wcset) { const n = nodeAt(sel); remember(); if (d.v === "") delete n[d.wcset]; else n[d.wcset] = d.wcset === "count" ? +d.v : d.v; draw(); return; }
  if (d.wcfield === "depth") { const n = nodeAt(sel); ctx.numAsk(t, "عمق الخانة", n.depth ?? P.wc.depth, (v) => { remember(); n.depth = Math.max(2, Math.min(80, v)); draw(); }, { min: 2 }); return; }
  if (d.wcsize) {
    const key = d.wcsize, cur = key === "depth" ? P.wc.depth : P[key];
    ctx.numAsk(t, { width: "عرض الحيطة كلها", height: "ارتفاعها", depth: "عمق الدواليب" }[key], cur, (v) => { remember(); if (key === "depth") P.wc.depth = Math.max(5, Math.min(80, v)); else P[key] = Math.max(20, Math.min(key === "width" ? 1200 : 400, v)); draw(); }, { min: 5 });
    return;
  }
  if (d.wcdim) {
    const [ps, is] = d.wcdim.split("|"), path = ps === "" ? [] : ps.split(".").map(Number), i = +is, n = nodeAt(path);
    const r = rectOf(path), total = n.dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0, s = partSizes(n, total);
    ctx.numAsk(t, n.dir === "v" ? "عرض الخانة" : "ارتفاع الخانة", s[i], (v) => {
      const others = s.reduce((a, x, j) => a + (j === i ? 0 : 5), 0);
      if (v > total - others) { ctx.alertBar(`أقصى مقاس هنا ${f1(total - others)} سم`); return; }
      remember();
      n.parts[i].size = Math.round(v * 10) / 10;
      // somebody has to take up the difference: the auto parts do; if none is left, the neighbour (after, else before) becomes auto
      if (!n.parts.some((q, j) => j !== i && q.size == null)) n.parts[i + 1 < n.parts.length ? i + 1 : i - 1].size = null;
      draw();
    }, { min: 5 });
    return;
  }
  const a = d.wc;
  if (a === "done") { const { errs } = cells(); if (errs.length) { ctx.alertBar("ظبّط المقاسات الأول: " + errs[0]); return; } close(true); return; }
  if (a === "cancel") { close(false); return; }
  if (a === "undo") { const prev = hist.pop(); if (prev) { P = prev; if (!nodeAt(sel) || nodeAt(sel).dir) sel = firstLeaf(P.wc.root, []); draw(); } return; }
  if (a === "merge") { if (!sel.length) return; remember(); const leaf = nodeAt(sel); const pp = sel.slice(0, -1); setNode(pp, clone(leaf)); sel = pp; draw(); return; }
  if (a === "splitv" || a === "splith") { askSplit(t, a === "splitv" ? "v" : "h"); return; }
}
/** how to split the picked cell: 2 / 3 / 4 equal, or typed sizes (60,200,60 — the last one may be left out: it takes the rest) */
function askSplit(btn, dir) {
  const n = nodeAt(sel), r = rectOf(sel), total = dir === "v" ? r.x1 - r.x0 : r.z1 - r.z0;
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
    const base = clone(n.dir ? { kind: "open" } : n);
    setNode(sel, { dir, parts: parts.map((q) => ({ size: q.size, node: clone(base) })) });
    sel = [...sel, 0];
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
