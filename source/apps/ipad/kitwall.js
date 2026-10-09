// NOVERA Studio v118 — «🍳 مطبخ الحيطة»: a kitchen wall composed column by column, seen from the front.
// Every column is either a base unit + a wall unit over it, or one tall unit (fridge / oven / pantry). Tap a cell to choose what it is
// (sink, hob, cooker gap, washer, drawers, oven, hood, glass, microwave…), every width is a button, drag the line between two columns
// with the finger. «✓ خلصت» makes / updates REAL kitchen units (the kitchen engine) standing on the wall at their places.
// The model lives on the project per wall: project.kwalls[wallId] = {s0, wallZ, wallH, tallH, cols: [{w, tall, base, wall, ids}]}.

/** what each row can hold: preset id (kitchen_ui / library KITCHEN) → [icon, short name, its natural width or null] */
export const KW_BASE = [
  ["k_base2", "🚪", "ضلفتين", null], ["k_base1_45", "🚪", "ضلفة", null], ["k_base_drawers", "🗄", "3 أدراج", null], ["k_drawers2_80", "🗄", "درجين حلل", null],
  ["k_drawer_doors", "🗃", "درج + ضلف", null], ["k_sink", "🚰", "حوض", 80], ["k_sink100", "🚰", "حوض دبل", 100], ["k_hob90", "🔥", "مسطح بوتجاز", 90],
  ["k_cooker_gap", "🍳", "بوتجاز عادي (فتحة)", 60], ["k_cooker_gap90", "🍳", "بوتجاز 90 (فتحة)", 90], ["k_oven_under", "♨", "فرن تحت الرخامة", 60],
  ["k_washer_gap", "🧺", "غسالة (فتحة)", 60], ["k_pullout20", "▯", "بول أوت", 20], ["k_oil30", "🫙", "ترولي زيت", 30], ["k_bin60", "🗑", "سلة زبالة", 60],
  ["k_baskets60", "🧺", "سلتين سحب", 60], ["k_base_open30", "📚", "رفوف مفتوحة", null], ["", "⬚", "فاضي", null],
];
export const KW_WALL = [
  ["k_wall2", "🚪", "ضلفتين", null], ["k_wall1_40", "🚪", "ضلفة", null], ["k_wall_flip", "⬆", "قلاب", null], ["k_wall_flip_dbl", "⬆", "قلاب دبل", null],
  ["k_wall_glass_wood", "🪟", "ضلف زجاج", null], ["k_wall_hood_in", "💨", "شفاط مدمج", 60], ["k_wall_hood90", "💨", "فوق الشفاط", 90],
  ["k_wall_micro", "♨", "ميكروويف", 60], ["k_plates80", "🍽", "مصفاة أطباق", 80], ["k_lift90", "⇡", "رف ليفت", 90], ["k_wall_led", "💡", "ضلفتين + ليد", null],
  ["k_wall_open60", "📚", "رفوف مفتوحة", null], ["", "⬚", "فاضي", null],
];
export const KW_TALL = [
  ["k_fridge", "🧊", "تلاجة", null], ["k_fridge_wide", "🧊", "تلاجة سايد باي سايد", 101.6], ["k_oven", "♨", "فرن + ميكروويف", 60], ["k_oven_only", "♨", "فرن بس", 60],
  ["k_micro_tall", "♨", "ميكروويف + تخزين", 60], ["k_pantry60", "🥫", "تموين", null], ["k_pantry_drawers", "🥫", "تموين بأدراج", null],
  ["k_cargo40", "▯", "كارجو", 40], ["k_broom40", "🧹", "مكانس", 40],
];
const LIST = { base: KW_BASE, wall: KW_WALL, tall: KW_TALL };
const info = (row, id) => LIST[row].find((k) => k[0] === id) || ["", "⬚", "فاضي", null];
const ROWN = { base: "السفلي", wall: "العلوي", tall: "الطويل" };
let ctx = null, K = null, sel = { col: 0, row: "base" }, hist = [], el = null, view = null, grip = null, gripMoved = false;
const clone = (o) => JSON.parse(JSON.stringify(o));
const f1 = (v) => String(Math.round(v * 10) / 10);
const BASE_TOP = 86, KICK = 10;

/** a first proposal for an empty wall: the sink under the window, a cooker away from it, the rest base + wall units (60–90), doors kept clear */
export function proposeKitchen(L, holes) {
  const lo = 3, hi = L - 3, cols = [];
  const doors = holes.filter((o) => o.kind === "door").map((o) => [o.x0 - 2, o.x1 + 2]).sort((a, b) => a[0] - b[0]);
  const free = [];
  let a = lo;
  for (const [p, q] of doors) { if (p > a + 30) free.push([a, Math.min(p, hi)]); a = Math.max(a, q); }
  if (hi > a + 30) free.push([a, hi]);
  if (!free.length) return { s0: lo, cols: [] };
  const run = free.reduce((x, y) => (y[1] - y[0] > x[1] - x[0] ? y : x));
  const len = run[1] - run[0];
  const win = holes.find((o) => o.kind === "window" && o.x0 + (o.x1 - o.x0) / 2 > run[0] + 40 && o.x0 + (o.x1 - o.x0) / 2 < run[1] - 40);
  const fill = (w) => { const out = []; if (w < 19.5) return out; const n = Math.ceil(w / 90); const each = Math.floor((w / n) * 2) / 2; for (let i = 0; i < n; i++) out.push(each); return out; };
  const slots = [];
  // the sink: under the window when there is one, else a third of the way along
  const sinkW = 80, sinkX = win ? Math.max(run[0], Math.min(run[1] - sinkW, (win.x0 + win.x1) / 2 - sinkW / 2)) : run[0] + Math.round(len / 3 - sinkW / 2);
  const fridge = len >= 300;
  let x = run[0];
  if (fridge) { slots.push({ w: 75, tall: "k_fridge" }); x += 75; }
  const leftW = sinkX - x;
  // the cooker: in the longer stretch beside the sink, ~60 cm of counter away from it
  const rightW = run[1] - (sinkX + sinkW);
  const cookOnRight = rightW >= leftW;
  const part = (w, withCook) => {
    const out = [];
    if (withCook && w >= 120) {
      // ~60 cm of counter between the sink and the cooker; no sliver under 30 cm on either side
      let before = cookOnRight ? 60 : w - 60 - 60, after = w - before - 60;
      if (before < 30) { after += before; before = 0; }
      if (after < 30) { before += after; after = 0; }
      for (const v of fill(before)) out.push({ w: v, base: "k_base_drawers", wall: "k_wall2" });
      out.push({ w: 60, base: "k_cooker_gap", wall: "k_wall_hood_in" });
      for (const v of fill(after)) out.push({ w: v, base: "k_base2", wall: "k_wall2" });
      return out;
    }
    for (const v of fill(w)) out.push({ w: v, base: "k_base2", wall: "k_wall2" });
    return out;
  };
  slots.push(...part(leftW, !cookOnRight));
  slots.push({ w: sinkW, base: "k_sink", wall: win ? "" : "k_plates80" });
  slots.push(...part(rightW, cookOnRight));
  // units under a window get no wall unit over them
  let at = run[0];
  for (const c of slots) {
    if (!c.tall && holes.some((o) => o.kind === "window" && Math.min(at + c.w, o.x1) - Math.max(at, o.x0) > 2)) c.wall = "";
    at += c.w;
    cols.push({ w: Math.round(c.w * 10) / 10, tall: c.tall || "", base: c.base || "", wall: c.wall || "", ids: {} });
  }
  return { s0: Math.round(run[0] * 10) / 10, cols };
}
export function open(model, c) {
  ctx = c;
  K = clone(model);
  K.wallZ ??= 145; K.wallH ??= 70; K.tallH ??= K.wallZ + K.wallH; K.s0 ??= 3; K.cols ??= [];
  hist = []; grip = null;
  sel = { col: 0, row: K.cols[0]?.tall ? "tall" : "base" };
  el = document.createElement("div");
  el.id = "kwall"; el.className = "wcomp kwall";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "مطبخ الحيطة");
  document.body.appendChild(el);
  document.body.classList.add("inwcomp");
  el.addEventListener("click", onClick);
  el.addEventListener("pointerdown", (e) => { e.stopPropagation(); gripDown(e); });
  el.addEventListener("pointermove", gripMove);
  el.addEventListener("pointerup", gripUp);
  el.addEventListener("pointercancel", gripUp);
  addEventListener("resize", draw);
  draw();
}
function close(apply) {
  if (apply) ctx.apply(clone(K));
  removeEventListener("resize", draw);
  document.querySelector(".numask")?.remove();
  el?.remove(); el = null;
  document.body.classList.remove("inwcomp");
  ctx.closed?.();
}
function remember() { hist.push(clone(K)); if (hist.length > 60) hist.shift(); }
const used = () => K.cols.reduce((t, c) => t + +c.w, 0);
const avail = () => ctx.wallLen - K.s0;
const colX = (i) => K.s0 + K.cols.slice(0, i).reduce((t, c) => t + +c.w, 0);
function rectOf(i, row) {
  const c = K.cols[i], x0 = colX(i), x1 = x0 + +c.w;
  if (row === "tall") return { x0, x1, z0: 0, z1: K.tallH };
  if (row === "wall") return { x0, x1, z0: K.wallZ, z1: K.wallZ + K.wallH };
  return { x0, x1, z0: 0, z1: BASE_TOP };
}
const hitsOf = (r) => (ctx.holes || []).filter((o) => o.kind !== "pt" && Math.min(r.x1, o.x1) - Math.max(r.x0, o.x0) > 1 && Math.min(r.z1, o.z1) - Math.max(r.z0, o.z0) > 1);
/** what the column problems are, for the side panel / the badge */
function problems() {
  const out = [];
  K.cols.forEach((c, i) => {
    const rows = c.tall ? [["tall", c.tall]] : [["base", c.base], ["wall", c.wall]];
    for (const [row, id] of rows) { if (!id) continue; const h = hitsOf(rectOf(i, row)); if (h.length) out.push({ i, row, text: `العمود ${i + 1} (${info(row, id)[2]}) راكب على ${h[0].kind === "door" ? "باب" : "شباك"}` }); }
  });
  if (used() > avail() + 0.5) out.push({ i: -1, text: `الأعمدة ${f1(used())} سم أطول من الحيطة (${f1(avail())} سم من البداية)` });
  return out;
}
// ---------------------------------------------------------------- drawing
function draw() {
  if (!el) return;
  const pr = problems(), left = avail() - used();
  const c = K.cols[sel.col];
  el.innerHTML = `
    <div class="wchead">
      <b>🍳 مطبخ الحيطة</b>
      <span class="kwlen">الحيطة ${f1(ctx.wallLen)} سم</span>
      <button class="wcsz" data-kwsize="s0">البداية من أول الحيطة <b>${f1(K.s0)}</b></button>
      <button class="wcsz" data-kwsize="wallZ">العلوي من الأرض <b>${f1(K.wallZ)}</b></button>
      <button class="wcsz" data-kwsize="wallH">ارتفاع العلوي <b>${f1(K.wallH)}</b></button>
      <button class="wcsz" data-kwsize="tallH">ارتفاع الطويل <b>${f1(K.tallH)}</b></button>
      <span class="wcsp"></span>
      <button class="wcb" data-kw="undo" ${hist.length ? "" : "disabled"} title="تراجع">↶</button>
      <button class="wcb primary" data-kw="done">✓ خلصت</button>
      <button class="wcb" data-kw="cancel" aria-label="اقفل من غير حفظ">✕</button>
    </div>
    <div class="wcbody">
      <div class="wcstage"><svg class="wcsvg" role="img" aria-label="واجهة المطبخ على الحيطة"></svg>
        <p class="kwsum ${left < -0.5 ? "bad" : ""}">${K.cols.length} عمود · مستخدم ${f1(used())} سم من ${f1(avail())} — ${left >= -0.5 ? `فاضل ${f1(Math.max(0, left))} سم` : `زيادة ${f1(-left)} سم`}${pr.length ? ` · ⚠ ${pr.length}` : ""}</p>
        <div class="wcgtag" hidden></div></div>
      <aside class="wcside">${c ? sideHtml(c, pr) : `<p class="wcnote">مفيش أعمدة لسه — دوس «＋ عمود» أو «✨ اقترح مطبخ».</p>`}</aside>
    </div>
    <div class="wcfoot">
      <button class="wcb" data-kw="add">＋ عمود<small>بعد المختار</small></button>
      <button class="wcb" data-kw="dup" ${c ? "" : "disabled"}>⧉ نسخة<small>عمود زيه جنبه</small></button>
      <button class="wcb" data-kw="swapa" ${sel.col > 0 ? "" : "disabled"}>⇠<small>بدّل</small></button>
      <button class="wcb" data-kw="swapb" ${sel.col < K.cols.length - 1 ? "" : "disabled"}>⇢<small>بدّل</small></button>
      <button class="wcb" data-kw="del" ${c ? "" : "disabled"}>🗑<small>شيل العمود</small></button>
      <button class="wcb" data-kw="fill" ${left >= 19.5 ? "" : "disabled"}>↔ املا الباقي<small>${left >= 19.5 ? `${f1(left)} سم` : "مفيش مكان"}</small></button>
      <button class="wcb" data-kw="propose">✨ اقترح مطبخ<small>من الأول على الحيطة</small></button>
      <span class="wchint">دوس على خانة تختار نوعها · اسحب الخط بين عمودين · دوس على أي مقاس تكتبه</span>
    </div>`;
  drawSvg();
}
function sideHtml(c, pr) {
  const i = sel.col, row = c.tall ? "tall" : sel.row === "tall" ? "base" : sel.row, id = c.tall ? c.tall : c[row];
  const cur = info(row, id);
  const mine = pr.filter((p) => p.i === i);
  const nat = cur[3];
  return `<h3>العمود ${i + 1} <small>${f1(c.w)} سم · ${c.tall ? "عمود طويل" : "سفلي + علوي"}</small></h3>
    <div class="wcrow"><span>العرض</span><button class="wcnum" data-kwfield="w">${f1(c.w)}</button></div>
    ${nat && Math.abs(nat - c.w) > 0.5 ? `<div class="wcbtns"><button data-kw="nat">📐 خليه ${f1(nat)} (مقاس ${cur[2]})</button></div>` : ""}
    <div class="wcrow"><span>نوع العمود</span><span class="wcseg"><button data-kw="split" class="${c.tall ? "" : "on"}">سفلي + علوي</button><button data-kw="tall" class="${c.tall ? "on" : ""}">طويل</button></span></div>
    ${mine.map((p) => `<p class="wcwarn">⚠ ${p.text}</p>`).join("")}
    ${c.tall ? "" : `<div class="wcrow"><span>بتختار</span><span class="wcseg"><button data-kwrow="base" class="${row === "base" ? "on" : ""}">⬇ السفلي</button><button data-kwrow="wall" class="${row === "wall" ? "on" : ""}">⬆ العلوي</button></span></div>`}
    <h3 class="kwh">${ROWN[row]}: <small>${cur[1]} ${cur[2]}</small></h3>
    <div class="wckinds">${LIST[row].map(([k, ic, nm, w]) => `<button class="wckind ${k === id ? "on" : ""}" data-kwkind="${k}"><i>${ic}</i>${nm}${w ? `<small>${f1(w)}</small>` : ""}</button>`).join("")}</div>`;
}
function drawSvg() {
  const svg = el.querySelector(".wcsvg"), host = el.querySelector(".wcstage");
  const Wpx = host.clientWidth || 700, Hpx = host.clientHeight || 500;
  const W = Math.max(ctx.wallLen, 50), H = Math.max(ctx.wallH || 270, K.tallH + 10, K.wallZ + K.wallH + 10);
  const mL = 30, mR = 30, mT = 60, mB = 70;
  const k = Math.max(0.05, Math.min((Wpx - mL - mR) / W, (Hpx - mT - mB) / H));
  const ox = mL + ((Wpx - mL - mR) - W * k) / 2, oy = mT + ((Hpx - mT - mB) - H * k) / 2;
  const X = (x) => ox + x * k, Y = (z) => oy + (H - z) * k;
  view = { X, Y, k };
  svg.setAttribute("viewBox", `0 0 ${Wpx} ${Hpx}`);
  let h = `<rect x="${X(0)}" y="${Y(H)}" width="${W * k}" height="${H * k}" class="wcwall"/>`;
  for (const o of ctx.holes || []) {
    if (o.kind === "pt") continue;
    h += `<g class="wchole ${o.kind}"><rect x="${X(o.x0)}" y="${Y(o.z1)}" width="${(o.x1 - o.x0) * k}" height="${(o.z1 - o.z0) * k}"/><text x="${X((o.x0 + o.x1) / 2)}" y="${Y(o.z1) + 16}" text-anchor="middle">${o.kind === "window" ? "شباك" : "باب"} ${f1(o.x1 - o.x0)}</text></g>`;
  }
  const pr = problems();
  // the counter over the base units (one strip per run of base units)
  K.cols.forEach((c, i) => {
    const rows = c.tall ? ["tall"] : ["base", "wall"];
    for (const row of rows) {
      const id = c.tall ? c.tall : c[row], r = rectOf(i, row), on = sel.col === i && (c.tall || sel.row === row);
      const [, ic, nm] = info(row, id), x = X(r.x0), y = Y(r.z1), w = (r.x1 - r.x0) * k, hh = (r.z1 - r.z0) * k;
      const bad = pr.some((p) => p.i === i && p.row === row);
      h += `<g class="wccell kw ${id ? row : "empty"} ${on ? "on" : ""} ${bad ? "clash" : ""}" data-kwcell="${i}|${row}"><rect x="${x + 1}" y="${y + 1}" width="${Math.max(0, w - 2)}" height="${Math.max(0, hh - 2)}" rx="2" class="kwbox ${id ? "" : "none"}"/>`;
      if (id && row === "base") h += `<rect x="${x}" y="${Y(BASE_TOP)}" width="${w}" height="${4 * k}" class="kwctr"/><rect x="${x + 2}" y="${Y(KICK)}" width="${Math.max(0, w - 4)}" height="${KICK * k}" class="kwkick"/>`;
      if (id) h += kwArt(id, x, y, w, hh, k, row);
      if (w > 34) h += `<text x="${x + w / 2}" y="${y + hh / 2 - (w > 70 ? 2 : -5)}" class="wclab" text-anchor="middle">${ic}${w > 70 ? ` ${nm}` : ""}</text>`;
      h += `</g>`;
    }
  });
  // drag handles between columns + after the last one
  K.cols.forEach((c, i) => {
    const gx = X(colX(i) + +c.w), y0 = Y(Math.max(K.tallH, K.wallZ + K.wallH)), y1 = Y(0);
    const act = grip && grip.i === i ? "act" : "";
    h += `<g class="wcgrip v ${act}" data-kwgrip="${i}"><rect x="${gx - 11}" y="${y0}" width="22" height="${y1 - y0}"/><line x1="${gx}" y1="${y0 + 4}" x2="${gx}" y2="${y1 - 4}"/><rect class="knob" x="${gx - 5}" y="${Y(BASE_TOP + 20) - 16}" width="10" height="32" rx="5"/></g>`;
  });
  // widths under the units (each a button) + the whole wall
  K.cols.forEach((c, i) => { const a = colX(i), b = a + +c.w; h += chain(X(a), X(b), Y(0) + 22, f1(c.w), `data-kwdim="${i}"`, sel.col === i ? "sel" : ""); });
  h += chain(X(0), X(ctx.wallLen), Y(0) + 50, f1(ctx.wallLen), "", "total");
  if (K.s0 > 0.5) h += chain(X(0), X(K.s0), Y(0) + 22, f1(K.s0), `data-kwsize="s0"`, "auto");
  svg.innerHTML = h.replace(/(width|height|r)="-[\d.e+-]*"/g, '$1="0"'); // a squeezed / tiny cell never draws a negative box
}
function kwArt(id, x, y, w, h, k, row) {
  const L = (x1, y1, x2, y2, cls = "wcln") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
  let s = "";
  if (/drawers|drw|cutlery|knives|spices/.test(id)) { const n = /2_80|plates_drw/.test(id) ? 2 : 3, top = y + 4 * k, hh = h - (KICK + 4) * k; for (let i = 1; i < n; i++) s += L(x + 2, top + (hh * i) / n, x + w - 2, top + (hh * i) / n); }
  else if (id === "k_drawer_doors") { const top = y + 4 * k, d = 18 * k; s += L(x + 2, top + d, x + w - 2, top + d) + L(x + w / 2, top + d, x + w / 2, y + h - KICK * k); }
  else if (/sink/.test(id)) { s += `<rect x="${x + w * 0.2}" y="${y + 1}" width="${Math.max(0, w * 0.6)}" height="${Math.max(0, 4 * k)}" class="kwsink"/>` + L(x + w / 2, y + 4 * k, x + w / 2, y + h - KICK * k); }
  else if (/cooker_gap|hob/.test(id)) { s += `<circle cx="${x + w * 0.3}" cy="${y + 2 * k}" r="${Math.min(6, w / 10)}" class="kwburner"/><circle cx="${x + w * 0.7}" cy="${y + 2 * k}" r="${Math.min(6, w / 10)}" class="kwburner"/>`; if (/gap/.test(id)) s += `<rect x="${x + 4}" y="${y + 8 * k}" width="${Math.max(0, w - 8)}" height="${Math.max(0, h - 20 * k)}" class="kwappl"/>`; }
  else if (/washer/.test(id)) s += `<circle cx="${x + w / 2}" cy="${y + h * 0.5}" r="${Math.min(w, h) * 0.28}" class="kwappl"/>`;
  else if (/fridge/.test(id)) s += L(x + 3, y + h * 0.35, x + w - 3, y + h * 0.35) + `<rect x="${x + 4}" y="${y + 4}" width="${Math.max(0, w - 8)}" height="${Math.max(0, h - 8)}" class="kwappl t"/>`;
  else if (/oven|micro/.test(id)) s += `<rect x="${x + 6}" y="${y + (row === "tall" ? h * 0.42 : h * 0.25)}" width="${Math.max(0, w - 12)}" height="${Math.max(0, Math.min(h * 0.3, 60 * k))}" class="kwappl"/>`;
  else if (/hood/.test(id)) s += `<path d="M${x + w * 0.2} ${y + h} L${x + w * 0.35} ${y + h * 0.55} L${x + w * 0.65} ${y + h * 0.55} L${x + w * 0.8} ${y + h} Z" class="kwappl"/>`;
  else if (/glass/.test(id)) s += L(x + w / 2, y + 2, x + w / 2, y + h - 2) + `<rect x="${x + 6}" y="${y + 6}" width="${Math.max(0, w / 2 - 10)}" height="${Math.max(0, h - 12)}" class="wcglass"/><rect x="${x + w / 2 + 4}" y="${y + 6}" width="${Math.max(0, w / 2 - 10)}" height="${Math.max(0, h - 12)}" class="wcglass"/>`;
  else if (/open/.test(id)) { for (let i = 1; i <= 2; i++) s += L(x + 3, y + (h * i) / 3, x + w - 3, y + (h * i) / 3, "wcsh"); }
  else if (/flip|lift/.test(id)) s += L(x + 3, y + h / 2, x + w - 3, y + h / 2);
  else if (w >= 50 && !/1_40|45|20|30|40|15/.test(id)) s += L(x + w / 2, y + (row === "base" ? 4 * k : 2), x + w / 2, y + h - (row === "base" ? KICK * k : 2));
  return s;
}
function chain(x0, x1, y, txt, attrs, cls) {
  if (x1 - x0 < 6) return "";
  const tw = 10 + 7.6 * txt.length, cx = (x0 + x1) / 2;
  return `<g class="wcchain"><line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/><line x1="${x0}" y1="${y - 5}" x2="${x0}" y2="${y + 5}"/><line x1="${x1}" y1="${y - 5}" x2="${x1}" y2="${y + 5}"/></g><g class="wcdim ${cls}" ${attrs}><rect x="${cx - tw / 2}" y="${y - 11}" width="${tw}" height="22" rx="11"/><text x="${cx}" y="${y + 4.5}" text-anchor="middle">${txt}</text></g>`;
}
// ---------------------------------------------------------------- dragging the line after a column
function gripDown(e) {
  const g = e.target.closest?.("[data-kwgrip]");
  if (!g || !view) return;
  const i = +g.dataset.kwgrip;
  grip = { i, w: K.cols.map((c) => +c.w), x: e.clientX, pid: e.pointerId, snap: clone(K) };
  gripMoved = false;
  try { el.querySelector(".wcsvg").setPointerCapture(e.pointerId); } catch { /* gone */ }
  e.preventDefault();
}
function gripMove(e) {
  if (!grip || e.pointerId !== grip.pid) return;
  const dx = e.clientX - grip.x;
  if (!gripMoved && Math.abs(dx) < 6) return;
  gripMoved = true;
  const { i, w } = grip, d = dx / view.k;
  let txt;
  if (i < K.cols.length - 1) {
    // between two columns: one grows, the other shrinks (whole cm, at least 15 each)
    const pair = w[i] + w[i + 1], a = Math.max(15, Math.min(pair - 15, Math.round(w[i] + d)));
    K.cols[i].w = a; K.cols[i + 1].w = Math.round((pair - a) * 10) / 10;
    txt = `${f1(a)} | ${f1(pair - a)}`;
  } else { const a = Math.max(15, Math.round(w[i] + d)); K.cols[i].w = a; txt = `${f1(a)} · فاضل ${f1(avail() - used())}`; }
  drawSvg();
  const tag = el.querySelector(".wcgtag"), rc = el.querySelector(".wcstage").getBoundingClientRect();
  tag.hidden = false; tag.textContent = txt;
  tag.style.left = `${e.clientX - rc.left + 18}px`; tag.style.top = `${e.clientY - rc.top - 44}px`;
}
function gripUp(e) {
  if (!grip || (e.pointerId !== undefined && e.pointerId !== grip.pid)) return;
  const g = grip;
  grip = null;
  if (gripMoved) { hist.push(g.snap); draw(); setTimeout(() => { gripMoved = false; }, 0); }
}
// ---------------------------------------------------------------- actions
function onClick(e) {
  if (gripMoved) return;
  const t = e.target.closest("[data-kw],[data-kwcell],[data-kwkind],[data-kwrow],[data-kwsize],[data-kwfield],[data-kwdim]");
  if (!t) return;
  const d = t.dataset, c = K.cols[sel.col];
  if (d.kwcell) { const [i, row] = d.kwcell.split("|"); sel = { col: +i, row }; draw(); return; }
  if (d.kwrow) { sel.row = d.kwrow; draw(); return; }
  if (d.kwkind != null) {
    if (!c) return;
    remember();
    const row = c.tall ? "tall" : sel.row === "tall" ? "base" : sel.row;
    if (c.tall) c.tall = d.kwkind; else c[row] = d.kwkind;
    draw(); return;
  }
  if (d.kwsize) {
    const f = d.kwsize, lab = { s0: "أول عمود يبدأ من أول الحيطة على", wallZ: "تحت العلوي من الأرض", wallH: "ارتفاع الوحدات العلوي", tallH: "ارتفاع الدواليب الطويلة" }[f];
    ctx.numAsk(t, lab, K[f], (v) => {
      remember();
      const lim = { s0: [0, ctx.wallLen - 20], wallZ: [100, 220], wallH: [30, 130], tallH: [150, 300] }[f];
      const linked = f !== "tallH" && Math.abs(K.tallH - (K.wallZ + K.wallH)) < 0.5;
      K[f] = Math.max(lim[0], Math.min(lim[1], Math.round(v * 10) / 10));
      if (linked) K.tallH = Math.min(300, K.wallZ + K.wallH); // tall units keep lining up with the wall units' tops
      draw();
    }, { min: 0 });
    return;
  }
  if (d.kwfield === "w" || d.kwdim != null) {
    const i = d.kwdim != null ? +d.kwdim : sel.col, col = K.cols[i];
    ctx.numAsk(t, `عرض العمود ${i + 1}`, col.w, (v) => { if (v < 15 || v > 300) { ctx.alertBar("العرض من 15 لـ 300 سم"); return; } remember(); col.w = Math.round(v * 10) / 10; sel.col = i; draw(); }, { min: 15 });
    return;
  }
  const a = d.kw;
  if (a === "cancel") { close(false); return; }
  if (a === "undo") { const p = hist.pop(); if (p) { K = p; sel.col = Math.min(sel.col, Math.max(0, K.cols.length - 1)); draw(); } return; }
  if (a === "done") {
    if (used() > avail() + 0.5) { ctx.alertBar(`الأعمدة أطول من الحيطة بـ ${f1(used() - avail())} سم — صغّر عمود أو شيله`); return; }
    close(true); return;
  }
  if (a === "split" && c?.tall) { remember(); c.base = "k_base2"; c.wall = "k_wall2"; c.tall = ""; sel.row = "base"; draw(); return; }
  if (a === "tall" && c && !c.tall) { remember(); c.tall = "k_pantry60"; sel.row = "tall"; draw(); return; }
  if (a === "nat" && c) { const row = c.tall ? "tall" : sel.row, w = info(row, c.tall || c[row])[3]; if (w) { remember(); c.w = w; draw(); } return; }
  if (a === "add") {
    remember();
    const left = avail() - used(), w = left >= 30 ? Math.min(60, Math.floor(left)) : 60;
    const at = K.cols.length ? sel.col + 1 : 0;
    K.cols.splice(at, 0, { w, tall: "", base: "k_base2", wall: "k_wall2", ids: {} });
    sel = { col: at, row: "base" };
    if (left < 30) ctx.alertBar("مفيش مكان فاضي على الحيطة — صغّر عمود تاني أو غيّر البداية");
    draw(); return;
  }
  if (a === "dup" && c) { remember(); const n = clone(c); n.ids = {}; K.cols.splice(sel.col + 1, 0, n); sel.col++; draw(); return; }
  if (a === "del" && c) { remember(); K.cols.splice(sel.col, 1); sel.col = Math.max(0, Math.min(sel.col, K.cols.length - 1)); draw(); return; }
  if ((a === "swapa" || a === "swapb") && c) { const j = sel.col + (a === "swapa" ? -1 : 1); if (j < 0 || j >= K.cols.length) return; remember(); [K.cols[sel.col], K.cols[j]] = [K.cols[j], K.cols[sel.col]]; sel.col = j; draw(); return; }
  if (a === "fill") {
    const left = avail() - used();
    if (left < 19.5) return;
    remember();
    const n = Math.ceil(left / 90), each = Math.floor((left / n) * 2) / 2;
    for (let i = 0; i < n; i++) K.cols.push({ w: each, tall: "", base: "k_base2", wall: "k_wall2", ids: {} });
    sel = { col: K.cols.length - 1, row: "base" };
    draw(); return;
  }
  if (a === "propose") {
    remember();
    const p = proposeKitchen(ctx.wallLen, ctx.holes || []);
    const old = K.cols;
    K.s0 = p.s0; K.cols = p.cols;
    // keep the units already made for the same place where the kind is unchanged (their own settings stay)
    K.cols.forEach((c2, i) => { const o = old[i]; if (o) c2.ids = o.ids || {}; });
    sel = { col: 0, row: K.cols[0]?.tall ? "tall" : "base" };
    draw();
    ctx.alertBar("✨ ده اقتراح: الحوض تحت الشباك، البوتجاز بعيد عنه، والتلاجة في الأول — غيّر أي عمود، أو ↶ ترجع");
  }
}
