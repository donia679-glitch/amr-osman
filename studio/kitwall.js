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
const LIST = { base: KW_BASE, wall: KW_WALL, tall: KW_TALL, top: KW_WALL };
// v119: any item of the library can stand in a cell — kitchen preset ids as they are, "d:<id>" dressing, "p:<id>" furniture preset,
// "wc" a free divided unit («قسّم الحيطة» inside the cell). ctx.info(id) → [id, icon, name, natural width, natural height]
const isKit = (id) => !!id && !id.includes(":") && id !== "wc";
const info = (row, id) => (id ? LIST[row].find((k) => k[0] === id) || LIST.base.find((k) => k[0] === id) || LIST.wall.find((k) => k[0] === id) || LIST.tall.find((k) => k[0] === id) || ctx?.info?.(id) : null) || ["", "⬚", "فاضي", null, null];
const ROWN_K = { base: "السفلي", wall: "العلوي", tall: "الطويل", top: "العلوي التاني (لحد السقف)" };
const ROWN_G = { base: "تحت (على الأرض)", wall: "فوق (معلّق)", tall: "من الأرض لفوق", top: "فوقها لحد السقف" };
/** v120 (Amr #12): a second row of wall units over the wall units / tall units, up to the ceiling */
const idOf = (c, row) => (row === "tall" ? c.tall : c[row]);
const curRow = (c) => (sel.row === "top" ? "top" : c.tall ? "tall" : sel.row === "tall" ? "base" : sel.row);
// v120: what the wall is — a kitchen is not a dressing is not a living-room wall (Amr: «مش كل حاجة مطبخ علوي وسفلي»)
export const WALL_TYPES = {
  kitchen: { icon: "🍳", label: "مطبخ", desc: "سفلي برخامة + علوي + أعمدة طويلة (تلاجة، فرن، تموين)", def: { base: "k_base2", wall: "k_wall2", tall: "" }, tab: "kitchen", prop: "✨ اقترح مطبخ" },
  dressing: { icon: "👔", label: "دريسنج ودواليب", desc: "أعمدة من الأرض للسقف: شماعات، أرفف، أدراج، جزامة", def: { base: "", wall: "", tall: "wc:wardrobe1" }, tab: "t:dressing", prop: "✨ اقترح دولاب" },
  living: { icon: "📺", label: "صالة وتلفزيون", desc: "وحدة أرضي تحت الشاشة، مكتبات جنبها، أرفف معلّقة، تكسية", def: { base: "wc:low", wall: "", tall: "" }, tab: "t:living", prop: "✨ اقترح حيطة تلفزيون" },
  bedroom: { icon: "🛏", label: "أوضة نوم", desc: "سرير في النص وكومودينو جنبه، أو حيطة دواليب", def: { base: "", wall: "", tall: "wc:wardrobe1" }, tab: "t:bedroom", prop: "✨ اقترح حيطة سرير" },
  free: { icon: "🧩", label: "حر", desc: "أي حاجة من المكتبة في أي مكان", def: { base: "", wall: "", tall: "" }, tab: "free", prop: "" },
};
const kitType = () => (K?.type || "kitchen") === "kitchen";
const ROWN = new Proxy({}, { get: (_, k) => (kitType() ? ROWN_K : ROWN_G)[k] });
let ctx = null, K = null, sel = { col: 0, row: "base" }, hist = [], el = null, view = null, grip = null, gripMoved = false, ctab = "kitchen";
const clone = (o) => JSON.parse(JSON.stringify(o));
const f1 = (v) => String(Math.round(v * 10) / 10);
const BASE_TOP = 86, KICK = 10;

/** a first proposal for an empty wall: the sink under the window, a cooker away from it, the rest base + wall units (60–90), doors kept clear */
/** v120: where the room's services say each appliance goes (Amr #11: «نقط المرافق مش بتتاخد في الحسبان»):
 *  sink drain / water → the sink, washer drain / feed / socket → a washer slot, gas → the cooker, fridge socket → the fridge */
export const MEP_FOR = {
  sink: ["drain", "cold", "hot", "floor_drain"], washer: ["washer_drain", "washer_cold", "washer"], cooker: ["gas"], fridge: ["fridge"], hood: ["hood"],
};
const mepAt = (holes, what, run) => {
  const xs = holes.filter((o) => o.kind === "pt" && MEP_FOR[what].includes(o.mep)).map((o) => (o.x0 + o.x1) / 2).filter((x) => x >= run[0] - 5 && x <= run[1] + 5);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
};
export function proposeKitchen(L, holes) {
  const lo = 3, hi = L - 3, cols = [];
  const doors = holes.filter((o) => o.kind === "door").map((o) => [o.x0 - 2, o.x1 + 2]).sort((a, b) => a[0] - b[0]);
  const free = [];
  let a = lo;
  for (const [p, q] of doors) { if (p > a + 30) free.push([a, Math.min(p, hi)]); a = Math.max(a, q); }
  if (hi > a + 30) free.push([a, hi]);
  if (!free.length) return { s0: lo, cols: [], used: [] };
  // the run: the one with the sink's water if there is one, else the longest
  const wet = holes.filter((o) => o.kind === "pt" && MEP_FOR.sink.includes(o.mep)).map((o) => (o.x0 + o.x1) / 2);
  const run = free.find((r) => wet.some((x) => x >= r[0] && x <= r[1])) || free.reduce((x, y) => (y[1] - y[0] > x[1] - x[0] ? y : x));
  const len = run[1] - run[0];
  const win = holes.find((o) => o.kind === "window" && o.x0 + (o.x1 - o.x0) / 2 > run[0] + 40 && o.x0 + (o.x1 - o.x0) / 2 < run[1] - 40);
  const fill = (w) => { const out = []; if (w < 19.5) return out; const n = Math.ceil(w / 90); const each = Math.floor((w / n) * 2) / 2; for (let i = 0; i < n; i++) out.push(each); return out; };
  const used = [];
  // fixed pieces first (x0 = where it starts), then the rest is filled with plain base units
  const fixed = [];
  const put = (w, x0, c, why) => { fixed.push({ w, x0: Math.max(run[0], Math.min(run[1] - w, x0)), c, hard: !!why }); if (why) used.push(why); };
  const pf = mepAt(holes, "fridge", run);
  if (pf != null) put(75, pf - run[0] < run[1] - pf ? (pf - run[0] < 110 ? run[0] : pf - 37.5) : (run[1] - pf < 110 ? run[1] - 75 : pf - 37.5), { tall: "k_fridge" }, "التلاجة عند بريزة التلاجة");
  else if (len >= 300) put(75, run[0], { tall: "k_fridge" });
  const ps = mepAt(holes, "sink", run), sinkW = 80;
  const sinkX = ps != null ? ps - sinkW / 2 : win ? (win.x0 + win.x1) / 2 - sinkW / 2 : run[0] + Math.round(len / 3 - sinkW / 2);
  put(sinkW, sinkX, { base: "k_sink", wall: "k_plates80" }, ps != null ? "الحوض على الصرف والتغذية" : "");
  const pw = mepAt(holes, "washer", run);
  if (pw != null) put(60, pw - 30, { base: "k_washer_gap", wall: "k_wall2" }, "الغسالة عند صرف وتغذية الغسالة");
  const pg = mepAt(holes, "cooker", run) ?? mepAt(holes, "hood", run);
  if (pg != null) put(60, pg - 30, { base: "k_cooker_gap", wall: "k_wall_hood_in" }, mepAt(holes, "cooker", run) != null ? "البوتجاز عند مخرج الغاز" : "البوتجاز تحت مخرج الشفاط");
  // pieces must not overlap: keep their order, push to the right, then back from the end if they ran out of the wall
  fixed.sort((p, q) => p.x0 - q.x0);
  for (let i = 1; i < fixed.length; i++) fixed[i].x0 = Math.max(fixed[i].x0, fixed[i - 1].x0 + fixed[i - 1].w);
  for (let i = fixed.length - 1; i >= 0; i--) { const lim = i === fixed.length - 1 ? run[1] : fixed[i + 1].x0; if (fixed[i].x0 + fixed[i].w > lim) fixed[i].x0 = lim - fixed[i].w; }
  if (fixed[0] && fixed[0].x0 < run[0]) return proposeKitchen(L, holes.filter((o) => o.kind !== "pt")); // too much for this wall: the plain layout
  // no cooker point: the cooker in the longest free stretch, ~60 cm of counter away from the sink
  if (pg == null) {
    const gaps = [];
    let x = run[0];
    for (const f of fixed) { gaps.push([x, f.x0, f]); x = f.x0 + f.w; }
    gaps.push([x, run[1], null]);
    const sink = fixed.find((f) => f.c.base === "k_sink");
    const g = gaps.filter((q) => q[1] - q[0] >= 60).sort((p, q) => {
      const near = (r) => (sink && (Math.abs(r[0] - (sink.x0 + sink.w)) < 1 || Math.abs(r[1] - sink.x0) < 1) ? 0 : 1);
      const rank = (r) => (r[1] - r[0] >= 120 ? 0 : 2) + near(r); // room for 60 cm of counter beside the sink first
      return rank(p) - rank(q) || q[1] - q[0] - (p[1] - p[0]);
    })[0];
    if (g) {
      const afterSink = sink && Math.abs(g[0] - (sink.x0 + sink.w)) < 1;
      let cx = afterSink ? g[0] + 60 : g[1] - 60 - 60;
      if (cx - g[0] < 30) cx = g[0];
      if (g[1] - (cx + 60) < 30) cx = g[1] - 60;
      if (g[1] - g[0] < 120 && sink) cx = afterSink ? g[1] - 60 : g[0]; // a short stretch: the cooker at its far end, the counter by the sink
      fixed.push({ w: 60, x0: cx, c: { base: "k_cooker_gap", wall: "k_wall_hood_in" } });
      fixed.sort((p, q) => p.x0 - q.x0);
    }
  }
  // fill between the fixed pieces; a sliver under 20 cm widens the piece before it
  const slots = [];
  let x = run[0];
  const cook = (c) => c?.base === "k_cooker_gap";
  const gap = (w, next) => {
    if (w <= 0.05) return;
    if (w < 30) {
      // a sliver: slide a piece that isn't tied to a service into it, else widen a neighbour (never the fridge)
      if (next && !next.hard) { next.x0 -= w; return; }
      const prev = slots[slots.length - 1];
      if (prev && !prev.tall) prev.w += w; else if (next) { next.x0 -= w; next.w += w; } else slots.push({ w, base: "k_base2", wall: "k_wall2" });
      return;
    }
    // drawers on both sides of the cooker (pots and pans), plain doors elsewhere
    fill(w).forEach((v, i, arr) => slots.push({ w: i === arr.length - 1 ? w - v * (arr.length - 1) : v, base: (i === 0 && cook(slots[slots.length - 1])) || (i === arr.length - 1 && cook(next?.c)) ? "k_base_drawers" : "k_base2", wall: "k_wall2" }));
  };
  for (const f of fixed) { gap(f.x0 - x, f); slots.push({ w: f.w, ...f.c }); x = f.x0 + f.w; }
  gap(run[1] - x, null);
  // units under a window get no wall unit over them
  let at = run[0];
  for (const c of slots) {
    if (!c.tall && holes.some((o) => o.kind === "window" && Math.min(at + c.w, o.x1) - Math.max(at, o.x0) > 2)) c.wall = "";
    at += c.w;
    cols.push({ w: Math.round(c.w * 10) / 10, tall: c.tall || "", base: c.base || "", wall: c.wall || "", ids: {} });
  }
  return { s0: Math.round(run[0] * 10) / 10, cols, used: used.filter(Boolean) };
}
export function open(model, c) {
  ctx = c;
  K = clone(model);
  K.wallZ ??= 145; K.wallH ??= 70; K.ceilH ??= ctx?.wallH || c?.wallH || 270; K.tallH ??= K.wallZ + K.wallH; K.s0 ??= 3; K.cols ??= [];
  hist = []; grip = null; ctab = WALL_TYPES[K.type]?.tab || "kitchen";
  sel = { col: 0, row: K.cols[0]?.tall ? "tall" : "base" };
  el = document.createElement("div");
  el.id = "kwall"; el.className = "wcomp kwall";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "حيطة بحيطة");
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
/** a cell's place: kitchen units follow the wall's heights; any other item its own height (or the one typed for that cell) */
export function topZ0(K, c, infoFn) {
  return c.tall ? cellHeight(K, c, "tall", infoFn?.("tall", c.tall)) : (c.wz ?? K.wallZ) + cellHeight(K, c, "wall", infoFn?.("wall", c.wall));
}
export const ceilOf = (K) => +K.ceilH || 270;
export function cellHeight(K, c, row, inf, infoFn) {
  const id = row === "tall" ? c.tall : c[row], kit = isKit(id) || !id, o = c.hz?.[row];
  if (o != null) return +o;
  if (row === "top") return Math.max(0, Math.round((ceilOf(K) - topZ0(K, c, infoFn)) * 10) / 10);
  if (row === "tall") return kit ? K.tallH : +inf?.[4] || K.tallH;
  if (row === "wall") return kit ? K.wallH : Math.min(+inf?.[4] || K.wallH, 150);
  return kit ? BASE_TOP : +inf?.[4] || BASE_TOP;
}
function rectOf(i, row) {
  const c = K.cols[i], x0 = colX(i), x1 = x0 + +c.w, id = row === "tall" ? c.tall : c[row], h = cellHeight(K, c, row, info(row, id));
  if (row === "tall") return { x0, x1, z0: 0, z1: h };
  if (row === "wall") { const z0 = c.wz ?? K.wallZ; return { x0, x1, z0, z1: z0 + h }; }
  if (row === "top") { const z0 = topZ0(K, c, info), hh = c.hz?.top != null ? +c.hz.top : Math.max(0, ceilOf(K) - z0); return { x0, x1, z0, z1: z0 + hh }; }
  return { x0, x1, z0: 0, z1: h };
}
const hitsOf = (r) => (ctx.holes || []).filter((o) => o.kind !== "pt" && Math.min(r.x1, o.x1) - Math.max(r.x0, o.x0) > 1 && Math.min(r.z1, o.z1) - Math.max(r.z0, o.z0) > 1);
/** what the column problems are, for the side panel / the badge */
function problems() {
  const out = [];
  K.cols.forEach((c, i) => {
    const rows = c.tall ? [["tall", c.tall], ["top", c.top]] : [["base", c.base], ["wall", c.wall], ["top", c.top]];
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
      <b>🧱 حيطة بحيطة</b>
      ${K.type ? `<button class="wcsz fit" data-kw="type">${WALL_TYPES[K.type].icon} ${WALL_TYPES[K.type].label} <b>⇄</b></button>` : ""}
      <span class="kwlen">الحيطة ${f1(ctx.wallLen)} سم</span>
      <button class="wcsz" data-kwsize="s0">البداية من أول الحيطة <b>${f1(K.s0)}</b></button>
      <button class="wcsz" data-kwsize="wallZ">${kitType() ? "العلوي" : "المعلّق"} من الأرض <b>${f1(K.wallZ)}</b></button>
      ${kitType() ? `<button class="wcsz" data-kwsize="wallH">ارتفاع العلوي <b>${f1(K.wallH)}</b></button>` : ""}
      <button class="wcsz" data-kwsize="ceilH">السقف <b>${f1(ceilOf(K))}</b></button>
      <button class="wcsz" data-kwsize="tallH">${kitType() ? "ارتفاع الطويل" : "ارتفاع الدواليب"} <b>${f1(K.tallH)}</b></button>
      <span class="wcsp"></span>
      <button class="wcb" data-kw="undo" ${hist.length ? "" : "disabled"} title="تراجع">↶</button>
      <button class="wcb primary" data-kw="done">✓ خلصت</button>
      <button class="wcb" data-kw="cancel" aria-label="اقفل من غير حفظ">✕</button>
    </div>
    <div class="wcbody">
      <div class="wcstage"><svg class="wcsvg" role="img" aria-label="واجهة المطبخ على الحيطة"></svg>
        <p class="kwsum ${left < -0.5 ? "bad" : ""}">${K.cols.length} عمود · مستخدم ${f1(used())} سم من ${f1(avail())} — ${left >= -0.5 ? `فاضل ${f1(Math.max(0, left))} سم` : `زيادة ${f1(-left)} سم`}${pr.length ? ` · ⚠ ${pr.length}` : ""}</p>
        <div class="wcgtag" hidden></div></div>
      <aside class="wcside">${!K.type || pickType ? typeHtml() : c ? sideHtml(c, pr) : `<p class="wcnote">مفيش أعمدة لسه — دوس «＋ عمود»${WALL_TYPES[K.type].prop ? ` أو «${WALL_TYPES[K.type].prop}»` : ""}.</p>`}</aside>
    </div>
    <div class="wcfoot">
      <button class="wcb" data-kw="add">＋ عمود<small>بعد المختار</small></button>
      <button class="wcb" data-kw="dup" ${c ? "" : "disabled"}>⧉ نسخة<small>عمود زيه جنبه</small></button>
      <button class="wcb" data-kw="swapa" ${sel.col > 0 ? "" : "disabled"}>⇠<small>بدّل</small></button>
      <button class="wcb" data-kw="swapb" ${sel.col < K.cols.length - 1 ? "" : "disabled"}>⇢<small>بدّل</small></button>
      <button class="wcb" data-kw="del" ${c ? "" : "disabled"}>🗑<small>شيل العمود</small></button>
      <button class="wcb" data-kw="fill" ${left >= 19.5 ? "" : "disabled"}>↔ املا الباقي<small>${left >= 19.5 ? `${f1(left)} سم` : "مفيش مكان"}</small></button>
      ${K.type && WALL_TYPES[K.type].prop ? `<button class="wcb" data-kw="propose">${WALL_TYPES[K.type].prop}<small>من الأول على الحيطة</small></button>` : ""}
      <span class="wchint">دوس على خانة تختار نوعها · اسحب الخط بين عمودين · دوس على أي مقاس تكتبه</span>
    </div>`;
  drawSvg();
}
let pickType = false;
function typeHtml() {
  return `<div class="kwtypes"><h3>الحيطة دي إيه؟ <small>كل نوع ليه طريقته ووحداته — وتقدر تغيّره بعدين</small></h3>
    ${Object.entries(WALL_TYPES).map(([k, t]) => `<button data-kwtype="${k}" class="${K.type === k ? "on" : ""}"><i>${t.icon}</i><b>${t.label}</b><small>${t.desc}</small></button>`).join("")}</div>`;
}
function sideHtml(c, pr) {
  const i = sel.col, row = curRow(c), id = idOf(c, row);
  const cur = info(row, id), r = rectOf(i, row);
  const mine = pr.filter((p) => p.i === i);
  const nat = cur[3];
  return `<h3>العمود ${i + 1} <small>${f1(c.w)} سم · ${c.tall ? (kitType() ? "عمود طويل" : "من الأرض لفوق") : kitType() ? "سفلي + علوي" : "تحت + فوق"}</small></h3>
    <div class="wcrow"><span>العرض</span><button class="wcnum" data-kwfield="w">${f1(c.w)}</button></div>
    ${nat && Math.abs(nat - c.w) > 0.5 ? `<div class="wcbtns"><button data-kw="nat">📐 خليه ${f1(nat)} (مقاس ${cur[2]})</button></div>` : ""}
    <div class="wcrow"><span>نوع العمود</span><span class="wcseg"><button data-kw="split" class="${c.tall ? "" : "on"}">${kitType() ? "سفلي + علوي" : "تحت + فوق"}</button><button data-kw="tall" class="${c.tall ? "on" : ""}">${kitType() ? "طويل" : "من الأرض لفوق"}</button></span></div>
    ${mine.map((p) => `<p class="wcwarn">⚠ ${p.text}</p>`).join("")}
    <div class="wcrow"><span>بتختار</span><span class="wcseg">${c.tall ? `<button data-kwrow="tall" class="${row === "tall" ? "on" : ""}">▮ ${kitType() ? "الطويل" : "الدولاب"}</button>` : `<button data-kwrow="base" class="${row === "base" ? "on" : ""}">⬇ ${kitType() ? "السفلي" : "تحت"}</button><button data-kwrow="wall" class="${row === "wall" ? "on" : ""}">⬆ ${kitType() ? "العلوي" : "فوق"}</button>`}<button data-kwrow="top" class="${row === "top" ? "on" : ""}">⏫ لحد السقف</button></span></div>
    ${row === "top" ? `<p class="wcnote">صف وحدات فوق ${c.tall ? "العمود الطويل" : "العلوي"} لحد السقف (السقف على <button class="dclink" data-kwsize="ceilH">${f1(ceilOf(K))} سم</button>) — اختار وحدة علوي من تحت${id ? ` أو <button class="dclink" data-kw="topclear">🗑 شيلها</button>` : ""}.</p><div class="wcbtns"><button data-kw="topall">⏫ حط علوي لحد السقف فوق كل الأعمدة</button></div>` : ""}
    <h3 class="kwh">${ROWN[row]}: <small>${cur[1]} ${cur[2]}</small></h3>
    ${id ? `<div class="wcrow"><span>ارتفاع الخانة</span><span><button class="wcnum" data-kwfield="h">${f1(r.z1 - r.z0)}${c.hz?.[row] == null ? " <small>تلقائي</small>" : ""}</button>${c.hz?.[row] != null ? ` <button class="dclink" data-kw="hauto">رجّعه تلقائي</button>` : ""}</span></div>` : ""}
    ${row === "wall" ? `<div class="wcrow"><span>بتبدأ من الأرض</span><span><button class="wcnum" data-kwfield="wz">${f1(r.z0)}${c.wz == null ? " <small>زي الباقي</small>" : ""}</button>${c.wz != null ? ` <button class="dclink" data-kw="wzauto">زي الباقي</button>` : ""}</span></div>` : ""}
    ${id === "wc" ? `<p class="wcnote">🧩 «تقسيم حر»: بعد «✓ خلصت» دوس على الوحدة دي و«🧩 قسّم» وقسّمها زي ما تحب (أرفف، ضلف، أدراج، تجاويف…).</p>` : ""}
    <div class="kwtabs">${tabsFor().map((t) => `<button data-kwtab="${t.id}" class="${ctab === t.id ? "on" : ""}">${t.label}</button>`).join("")}</div>
    <div class="wckinds">${(ctab === "kitchen" ? LIST[row] : (ctx.catalog || []).find((t) => t.id === ctab)?.items || []).map(([k, ic, nm, w]) => `<button class="wckind ${k === id ? "on" : ""}" data-kwkind="${k}"><i>${ic}</i>${nm}${w ? `<small>${f1(w)}</small>` : ""}</button>`).join("")}</div>
    ${ctab === "kitchen" ? "" : `<p class="wcnote">أي حاجة من المكتبة بتتحط في الخانة بعرضها${row === "wall" ? " ومعلّقة على ارتفاعها" : ""} — وبعد «خلصت» كل وحدة بتتعدّل لوحدها.</p>`}`;
}
/** the catalogue tabs this kind of wall shows first (all of them stay reachable under «كل المكتبة») */
function tabsFor() {
  const all = [{ id: "kitchen", label: "🍳 مطبخ", types: ["kitchen"] }, ...(ctx.catalog || [])];
  const ty = K.type || "kitchen";
  const mine = all.filter((t) => !t.types || t.types.includes(ty));
  if (showAll || ty === "free") return all.filter((t) => t.id !== "kitchen" || ty === "kitchen");
  return [...mine, { id: "__all", label: "📚 كل المكتبة" }];
}
let showAll = false;
function drawSvg() {
  const svg = el.querySelector(".wcsvg"), host = el.querySelector(".wcstage");
  const Wpx = host.clientWidth || 700, Hpx = host.clientHeight || 500;
  const tops = K.cols.flatMap((c, i) => (c.tall ? [rectOf(i, "tall").z1] : [rectOf(i, "wall").z1, rectOf(i, "base").z1]).concat(c.top ? [rectOf(i, "top").z1] : []));
  const W = Math.max(ctx.wallLen, 50), H = Math.max(ctx.wallH || 270, ceilOf(K), K.tallH + 10, K.wallZ + K.wallH + 10, ...tops.map((z) => z + 10));
  const mL = 30, mR = 30, mT = 60, mB = 70;
  const k = Math.max(0.05, Math.min((Wpx - mL - mR) / W, (Hpx - mT - mB) / H));
  const ox = mL + ((Wpx - mL - mR) - W * k) / 2, oy = mT + ((Hpx - mT - mB) - H * k) / 2;
  const X = (x) => ox + x * k, Y = (z) => oy + (H - z) * k;
  view = { X, Y, k };
  svg.setAttribute("viewBox", `0 0 ${Wpx} ${Hpx}`);
  let h = `<rect x="${X(0)}" y="${Y(H)}" width="${W * k}" height="${H * k}" class="wcwall"/>`;
  for (const o of ctx.holes || []) {
    if (o.kind === "pt") { h += `<g class="wchole pt"><rect x="${X(o.x0)}" y="${Y(o.z1)}" width="${(o.x1 - o.x0) * k}" height="${(o.z1 - o.z0) * k}"/><text x="${X((o.x0 + o.x1) / 2)}" y="${Y(o.z1) - 3}" text-anchor="middle" class="pt">${o.label || ""}</text></g>`; continue; }
    h += `<g class="wchole ${o.kind}"><rect x="${X(o.x0)}" y="${Y(o.z1)}" width="${(o.x1 - o.x0) * k}" height="${(o.z1 - o.z0) * k}"/><text x="${X((o.x0 + o.x1) / 2)}" y="${Y(o.z1) + 16}" text-anchor="middle">${o.kind === "window" ? "شباك" : "باب"} ${f1(o.x1 - o.x0)}</text></g>`;
  }
  const pr = problems();
  // the counter over the base units (one strip per run of base units)
  K.cols.forEach((c, i) => {
    const rows = (c.tall ? ["tall"] : ["base", "wall"]).concat(c.top || rectOf(i, "top").z1 - rectOf(i, "top").z0 >= 15 ? ["top"] : []);
    for (const row of rows) {
      const id = idOf(c, row), r = rectOf(i, row), on = sel.col === i && curRow(c) === row;
      const [, ic, nm] = info(row, id), x = X(r.x0), y = Y(r.z1), w = (r.x1 - r.x0) * k, hh = (r.z1 - r.z0) * k;
      const bad = pr.some((p) => p.i === i && p.row === row);
      h += `<g class="wccell kw ${id ? row : "empty"} ${on ? "on" : ""} ${bad ? "clash" : ""}" data-kwcell="${i}|${row}"><rect x="${x + 1}" y="${y + 1}" width="${Math.max(0, w - 2)}" height="${Math.max(0, hh - 2)}" rx="2" class="kwbox ${id ? "" : "none"}"/>`;
      if (id && row === "base" && isKit(id)) h += `<rect x="${x}" y="${y}" width="${w}" height="${4 * k}" class="kwctr"/><rect x="${x + 2}" y="${Y(KICK)}" width="${Math.max(0, w - 4)}" height="${KICK * k}" class="kwkick"/>`;
      if (id) h += kwArt(id, x, y, w, hh, k, row);
      if (w > 34) h += `<text x="${x + w / 2}" y="${y + hh / 2 - (w > 70 ? 2 : -5)}" class="wclab" text-anchor="middle">${ic}${w > 70 && nm.length * 7.4 + 24 <= w ? ` ${nm}` : w > 70 && nm.replace(/ \(.*\)/, "").length * 7.4 + 24 <= w ? ` ${nm.replace(/ \(.*\)/, "")}` : ""}</text>`;
      h += `</g>`;
    }
  });
  // drag handles between columns + after the last one
  K.cols.forEach((c, i) => {
    const top = c.tall ? rectOf(i, "tall").z1 : Math.max(rectOf(i, "wall").z1, rectOf(i, "base").z1);
    const gx = X(colX(i) + +c.w), y0 = Y(Math.max(top, BASE_TOP + 40)), y1 = Y(0);
    const act = grip && grip.i === i ? "act" : "";
    h += `<g class="wcgrip v ${act}" data-kwgrip="${i}"><rect x="${gx - 11}" y="${y0}" width="22" height="${y1 - y0}"/><line x1="${gx}" y1="${y0 + 4}" x2="${gx}" y2="${y1 - 4}"/><rect class="knob" x="${gx - 5}" y="${Y(BASE_TOP + 20) - 16}" width="10" height="32" rx="5"/></g>`;
  });
  // widths under the units (each a button) + the whole wall
  K.cols.forEach((c, i) => { const a = colX(i), b = a + +c.w; h += chain(X(a), X(b), Y(0) + 22, f1(c.w), `data-kwdim="${i}"`, sel.col === i ? "sel" : ""); });
  h += chain(X(0), X(ctx.wallLen), Y(0) + 50, f1(ctx.wallLen), "", "total");
  if (K.s0 > 0.5) h += chain(X(0), X(K.s0), Y(0) + 22, f1(K.s0), `data-kwsize="s0"`, "auto");
  svg.innerHTML = h.replace(/(width|height|r)="-[\d.e+-]*"/g, '$1="0"'); // a squeezed / tiny cell never draws a negative box
}
export function kwArt(id, x, y, w, h, k, row) {
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
  const t = e.target.closest("[data-kw],[data-kwcell],[data-kwkind],[data-kwrow],[data-kwsize],[data-kwfield],[data-kwdim],[data-kwtab],[data-kwtype]");
  if (!t) return;
  const d = t.dataset, c = K.cols[sel.col];
  if (d.kwcell) { const [i, row] = d.kwcell.split("|"); sel = { col: +i, row }; draw(); return; }
  if (d.kwrow) { sel.row = d.kwrow; draw(); return; }
  if (d.kwtype) { remember(); const first = !K.type; K.type = d.kwtype; pickType = false; showAll = false; ctab = WALL_TYPES[K.type].tab; if (first && K.type !== "kitchen") K.tallH = Math.min(240, ctx.wallH || 260); if (first && !K.cols.length) propose(); if (first && K.type !== "kitchen") K.tallH = Math.min(240, ctx.wallH || 260); draw(); return; }
  if (d.kwtab === "__all") { showAll = true; draw(); return; }
  if (d.kwtab) { ctab = d.kwtab; draw(); el.querySelector(".kwtabs")?.scrollIntoView({ block: "nearest" }); return; }
  if (d.kwkind != null) {
    if (!c) return;
    remember();
    const row = curRow(c), id = d.kwkind;
    if (row === "top") { c.top = id; if (c.hz) delete c.hz.top; draw(); return; }
    // a kitchen unit goes to its own row (a tall one makes the column tall, a wall one goes up); anything else where you are
    const nat = isKit(id) ? ctx.kitRow?.(id) : null;
    if (nat === "tall") { c.tall = id; sel.row = "tall"; }
    else if (c.tall) { if (nat === "wall") { c.tall = ""; c.wall = id; c.base = c.base || "k_base2"; sel.row = "wall"; } else if (nat === "base") { c.tall = ""; c.base = id; c.wall = c.wall || ""; sel.row = "base"; } else c.tall = id; }
    else if (nat && nat !== row) { c[nat] = id; sel.row = nat; ctx.alertBar(`اتحطت في ${ROWN[nat]} — دي وحدة ${ROWN[nat]}`); }
    else c[row] = id;
    if (c.hz) delete c.hz[c.tall ? "tall" : sel.row];
    draw(); return;
  }
  if (d.kwsize) {
    const f = d.kwsize, lab = { ceilH: "السقف من الأرض", s0: "أول عمود يبدأ من أول الحيطة على", wallZ: "تحت العلوي من الأرض", wallH: "ارتفاع الوحدات العلوي", tallH: "ارتفاع الدواليب الطويلة" }[f];
    ctx.numAsk(t, lab, K[f], (v) => {
      remember();
      const lim = { ceilH: [150, 450], s0: [0, ctx.wallLen - 20], wallZ: [100, 220], wallH: [30, 130], tallH: [150, 300] }[f];
      const linked = f !== "tallH" && Math.abs(K.tallH - (K.wallZ + K.wallH)) < 0.5;
      K[f] = Math.max(lim[0], Math.min(lim[1], Math.round(v * 10) / 10));
      if (linked) K.tallH = Math.min(300, K.wallZ + K.wallH); // tall units keep lining up with the wall units' tops
      draw();
    }, { min: 0 });
    return;
  }
  if (d.kwfield === "h" || d.kwfield === "wz") {
    const row = curRow(c), r = rectOf(sel.col, row);
    if (d.kwfield === "h") ctx.numAsk(t, "ارتفاع الخانة", r.z1 - r.z0, (v) => { remember(); c.hz = { ...(c.hz || {}), [row]: Math.max(10, Math.min(400, Math.round(v * 10) / 10)) }; draw(); }, { min: 10 });
    else ctx.numAsk(t, "بتبدأ من الأرض على", r.z0, (v) => { remember(); c.wz = Math.max(0, Math.min(350, Math.round(v * 10) / 10)); draw(); }, { min: 0 });
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
  if (a === "hauto" && c) { remember(); delete c.hz?.[curRow(c)]; draw(); return; }
  if (a === "topclear" && c) { remember(); c.top = ""; delete c.hz?.top; draw(); return; }
  if (a === "topall") { remember(); let n = 0; K.cols.forEach((q, i) => { if (!q.top && rectOf(i, "top").z1 - rectOf(i, "top").z0 >= 15) { q.top = kitType() || isKit(q.wall) ? "k_wall2" : "wc:shelves"; n++; } }); ctx.alertBar(n ? `⏫ اتحط علوي لحد السقف فوق ${n} عمود` : "مفيش مكان فاضي لحد السقف (أو كله متحط)"); draw(); return; }
  if (a === "wzauto" && c) { remember(); delete c.wz; draw(); return; }
  if (a === "type") { pickType = !pickType; draw(); return; }
  if (a === "split" && c?.tall) { remember(); const df = WALL_TYPES[K.type || "kitchen"].def; c.base = df.base || ""; c.wall = df.wall || ""; c.tall = ""; sel.row = "base"; draw(); return; }
  if (a === "tall" && c && !c.tall) { remember(); c.tall = kitType() ? "k_pantry60" : WALL_TYPES[K.type].def.tall || "wc:wardrobe1"; sel.row = "tall"; draw(); return; }
  if (a === "nat" && c) { const row = curRow(c), w = info(row, idOf(c, row))[3]; if (w) { remember(); c.w = w; draw(); } return; }
  if (a === "add") {
    remember();
    const left = avail() - used(), w = left >= 30 ? Math.min(60, Math.floor(left)) : 60;
    const at = K.cols.length ? sel.col + 1 : 0;
    const df = WALL_TYPES[K.type || "kitchen"].def;
    K.cols.splice(at, 0, { w, tall: df.tall || "", base: df.base || "", wall: df.wall || "", ids: {} });
    sel = { col: at, row: df.tall ? "tall" : "base" };
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
    const df = WALL_TYPES[K.type || "kitchen"].def;
    for (let i = 0; i < n; i++) K.cols.push({ w: each, tall: df.tall || "", base: df.base || "", wall: df.wall || "", ids: {} });
    sel = { col: K.cols.length - 1, row: "base" };
    draw(); return;
  }
  if (a === "propose") { remember(); propose(); }
}
/** the longest stretch of the wall clear of doors */
function freeRun(L, holes) {
  const lo = 3, hi = L - 3, free = [];
  let a = lo;
  for (const [p, q] of holes.filter((o) => o.kind === "door").map((o) => [o.x0 - 2, o.x1 + 2]).sort((x, y) => x[0] - y[0])) { if (p > a + 30) free.push([a, Math.min(p, hi)]); a = Math.max(a, q); }
  if (hi > a + 30) free.push([a, hi]);
  return free.length ? free.reduce((x, y) => (y[1] - y[0] > x[1] - x[0] ? y : x)) : null;
}
const spreadW = (w, each) => { const n = Math.max(1, Math.round(w / each)), a = Math.floor((w / n) * 2) / 2; return Array.from({ length: n }, () => a); };
/** a first layout for this kind of wall */
function propose() {
  const ty = K.type || "kitchen", old = K.cols, holes = ctx.holes || [];
  let msg = "";
  if (ty === "kitchen") {
    const p = proposeKitchen(ctx.wallLen, holes);
    K.s0 = p.s0; K.cols = p.cols;
    msg = p.used.length ? `✨ ده اقتراح على نقط المرافق: ${p.used.join("، ")} — غيّر أي عمود، أو ↶ ترجع` : "✨ ده اقتراح: الحوض تحت الشباك، البوتجاز بعيد عنه، والتلاجة في الأول — غيّر أي عمود، أو ↶ ترجع";
  } else {
    const run = freeRun(ctx.wallLen, holes);
    if (!run) { ctx.alertBar("الحيطة مفيهاش مكان فاضي كفاية (باب في نصها؟)"); return; }
    const len = run[1] - run[0], col = (w, o) => ({ w, tall: "", base: "", wall: "", ids: {}, ...o });
    let cols = [];
    if (ty === "dressing") {
      const kinds = ["wc:wardrobe1", "wc:drawers_shelves", "wc:wardrobe2", "wc:shelves"];
      cols = spreadW(len, 90).map((w, i, arr) => col(w, { tall: arr.length >= 3 && i === arr.length - 1 ? "wc:shoes" : kinds[i % 3] }));
      msg = "✨ دولاب حيطة: شماعة طويلة، أدراج + أرفف، شماعتين، وجزامة في الآخر — غيّر أي عمود من التبويبات";
    } else if (ty === "living") {
      const side = len >= 300 ? 60 : len >= 220 ? 45 : 0, mid = Math.min(240, len - 2 * side), pad = (len - mid - 2 * side) / 2;
      if (side) cols.push(col(side, { tall: "wc:shelves_led" }));
      cols.push(col(mid, { base: "wc:low", wall: "wc:shelf" }));
      if (side) cols.push(col(side, { tall: "wc:shelves_led" }));
      K.s0 = Math.round((run[0] + pad) * 10) / 10;
      msg = "✨ حيطة تلفزيون: وحدة أرضي تحت الشاشة، رف معلّق فوقها، ومكتبات بليد جنبها";
    } else if (ty === "bedroom") {
      const bed = ctx.bedId || "", bw = Math.min(200, Math.max(120, len - 110)), ns = Math.min(55, Math.max(40, (len - bw) / 2)), pad = (len - bw - 2 * ns) / 2;
      cols = [col(ns, { base: "wc:night" }), col(bw, { base: bed, wall: "wc:shelf" }), col(ns, { base: "wc:night" })];
      K.s0 = Math.round((run[0] + Math.max(0, pad)) * 10) / 10;
      msg = "✨ حيطة سرير: السرير في النص، كومودينو يمين وشمال، ورف معلّق فوقه — أو اختار «👔 دواليب» لحيطة دواليب";
    } else { ctx.alertBar("النوع الحر: ضيف أعمدة وحط فيها اللي انت عايزه"); return; }
    if (ty !== "living" && ty !== "bedroom") K.s0 = Math.round(run[0] * 10) / 10;
    // never a tall unit in front of a window: a low chest under the sill instead (and nothing over it)
    let x = K.s0;
    for (const c of cols) {
      const w = holes.find((o) => o.kind === "window" && Math.min(x + c.w, o.x1) - Math.max(x, o.x0) > 2);
      if (w && c.tall) { c.tall = ""; c.wall = ""; c.base = "wc:dresser"; c.hz = { base: Math.max(30, Math.min(90, Math.round(w.z0 - 3))) }; }
      x += c.w;
    }
    K.cols = cols;
  }
  K.cols.forEach((c2, i) => { const o = old[i]; if (o) c2.ids = o.ids || {}; });
  sel = { col: 0, row: K.cols[0]?.tall ? "tall" : "base" };
  draw();
  if (msg) ctx.alertBar(msg);
}
