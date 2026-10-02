// NOVERA Studio (iPad web build) — UI on top of the engines ported from the SketchUp plugin.
// Units: kitchen units (the plugin's builders, identical to SketchUp), panel engine (bath / bedroom /
// reception / tables) and the dressing system.
// Projects save online per user (db), share to clients and the workshop by link.
import * as Schema from "./engine/panel/schema.js";
import * as Catalog from "./engine/panel/catalog.js";
import * as TableSpec from "./engine/panel/tableSpec.js";
import { LIST as PRESETS } from "./engine/panel/presets.js";
import { compute as panelCompute } from "./engine/panel/layout.js";
import * as D from "./engine/dressing/index.js";
import { optimize } from "./engine/cut/cutOptimizer.js";
import { computeKitchen } from "./engine/kitchen/app.js";
import * as KU from "./kitchen_ui.js";
import * as Room from "./room.js";
import * as Exp from "./export.js";
import * as Mat from "./materials.js";
import * as Render from "./render.js";

const APP_URL = "https://claude.ai/artifact/EP8c8LmBNS8d3EqLcDioXi";
const APP_VERSION = "1.0";
/** shown on the "about" page — phone / links appear as soon as they're filled in */
const DEVELOPER = { name: "م. عمرو عثمان", company: "NOVERA", phone: "", whatsapp: "", email: "", site: "" };

// ------------------------------------------------------------------ helpers
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const n1 = (v) => (Math.round(v * 10) / 10).toString();
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = (o) => JSON.parse(JSON.stringify(o));
const STORE = "novera-studio-v2";
const STAGES = ["قص", "حرف", "تخريم", "تجميع"];

const ICON = {
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  cycle: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  copy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  lib: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  folder: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6h6l2 2h10v11H3z"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 12l5 5 9-10"/></svg>',
  cube: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z"/></svg>',
};

const PANEL_MATS = {
  carcass: "الهيكل", front: "الضلف ووش الأدراج", shelf: "الأرفف", accent: "الخامة المميزة", back: "الظهر",
  drawer_box: "صندوق الدرج", plinth: "الوزرة", table_top: "سطح الترابيزة", table_base: "قاعدة الترابيزة",
};
const LIB_GROUPS = [
  ["HPL", (k) => k.startsWith("hpl_")], ["أكريليك", (k) => k.startsWith("acrylic_")],
  ["خشب", (k) => k.startsWith("wood_")], ["رخام وكوارتز", (k) => /^(marble_|quartz_|terrazzo|concrete_)/.test(k)],
  ["زجاج ومرايا", (k) => /^(glass_|mirror)/.test(k)], ["معادن", (k) => /^(alu_|stainless|copper)/.test(k)],
  ["أخرى", (k) => /^(mdf_raw|back_panel)/.test(k)],
];
const STONE = (k) => /^(marble_|quartz_|terrazzo|concrete_|glass_|mirror)/.test(k || "");
const hexRgb = (rgb) => "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("");

// ------------------------------------------------------------------ dressing starters
const DC = (o) => ({ height: "auto", content: "empty", shelf_count: 2, drawer_count: 3, divider_count: 1, sub_shelf_count: 0, door: "none", door_style: "default", drawer_front: true, led: "none", ...o });
const DRESSING = {
  d_classic3: { label: "دريسنج 3 أقسام قياسي", desc: "شماعة طويلة، أرفف، وأدراج تحت شماعة قصيرة — 6 ضلف.", params: {
    width: 180, height: 240, depth: 60,
    sections: [
      { width: "auto", compartments: [DC({ content: "rail", door: "double" })] },
      { width: "auto", compartments: [DC({ height: 70, content: "drawers", drawer_count: 3 }), DC({ content: "rail", door: "double" })] },
      { width: "auto", compartments: [DC({ content: "shelves", shelf_count: 5, door: "double" })] },
    ] } },
  d_glass_led: { label: "زجاج بفريم ألومنيوم + ليد", desc: "ضلف زجاج فيميه، ليد جوانب وتحت الأرفف، أدراج.", libs: { glass: "glass_smoked", door_frame_alu: "alu_black" }, params: {
    width: 200, height: 250, depth: 60, doors: { style: "glass_alu" }, handles: { type: "none" },
    materials: { glass: { name: "NOVERA - زجاج فيميه (مدخّن)" }, door_frame_alu: { name: "NOVERA - ألومنيوم أسود" } },
    sections: [
      { width: "auto", compartments: [DC({ height: 60, content: "drawers", drawer_count: 2 }), DC({ content: "rail", door: "double", led: "sides" })] },
      { width: "auto", compartments: [DC({ content: "shelves", shelf_count: 6, door: "double", led: "shelves" })] },
    ] } },
  d_corner_blind: { label: "ركنة بزاوية عمياء", desc: "قسم أعمى شمال بقايم مفصلات وأرفف متصلة.", params: {
    width: 160, height: 240, depth: 60,
    sections: [
      { width: 60, kind: "blind", blind_partition: "post", blind_through: true, compartments: [DC({})] },
      { width: "auto", compartments: [DC({ content: "shelves", shelf_count: 5, door: "single_left" })] },
      { width: "auto", compartments: [DC({ content: "rail", door: "single_right" })] },
    ] } },
  d_plinth_shaker: { label: "شيكر على سكلو برواز", desc: "ضلف فريم خشب + حشوة، قواطيع بأرفف، أدراج.", params: {
    width: 150, height: 245, depth: 58, doors: { style: "shaker" }, plinth: { enabled: true, style: "frame" },
    sections: [
      { width: "auto", compartments: [DC({ content: "dividers", divider_count: 1, sub_shelf_count: 4, door: "double" })] },
      { width: "auto", compartments: [DC({ height: 50, content: "drawers", drawer_count: 2 }), DC({ content: "rail", door: "double" })] },
    ] } },
  d_whole_front: { label: "واجهة كاملة 4 ضلف", desc: "ضلف مستقلة عن الأقسام على صفين.", params: {
    width: 200, height: 260, depth: 60, doors: { layout: "whole", rows: [{ height: "auto", type: "doors", leaves: 4 }, { height: 40, type: "doors", leaves: 4 }] },
    sections: [
      { width: "auto", compartments: [DC({ content: "rail" })] },
      { width: "auto", compartments: [DC({ content: "shelves", shelf_count: 5 })] },
    ] } },
};

// ------------------------------------------------------------------ state
const SAMPLE = () => ({
  id: uid(), name: "مشروع تجريبي",
  units: [
    { id: uid(), kind: "kitchen", name: "سفلية ضلفتين 60", params: { shelf_count: 2 }, libs: {} },
    { id: uid(), kind: "kitchen", name: "علوية ضلفتين 80", params: { unit_type: "wall", width: 80, height: 70, depth: 32, include_toe_kick: false, shelf_count: 2 }, libs: {} },
    { id: uid(), kind: "dressing", name: "دريسنج غرفة النوم", params: clone(DRESSING.d_classic3.params) },
    { id: uid(), kind: "panel", name: "ترابيزة انتريه", params: { preset: "coffee_waterfall_walnut" } },
    { id: uid(), kind: "panel", name: "وحدة شاشة", params: { preset: "tv_float_slats" } },
  ],
});
const defaults = () => ({ project: SAMPLE(), sel: null, tab: "design", xray: false, libOpen: false, cutOpts: { sheetW: 244, sheetH: 122, kerf: 0.4, trim: 1 }, labelFmt: "a4" });
let state = loadLocal() || defaults();
state.myMats ??= [];
for (const m of [...state.myMats, ...(state.project.mats || [])]) Mat.register(m);
for (const u of state.project.units) u.kind ??= "panel";
state.project.id ??= uid();
if (!state.sel || !state.project.units.find((u) => u.id === state.sel)) state.sel = state.project.units[0]?.id ?? null;
let ui = { matPick: null, pop: null, mode: "owner", sharedPid: null, sharedProject: null, approval: null, progress: {}, piece: null, cloud: "local", projects: [] };

function loadLocal() {
  try { const raw = localStorage.getItem(STORE); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

// cloud (db) — set up after the page renders
const cloud = { db: null, user: null, me: null, comments: null, downloads: null, saveT: 0, saving: false, dirty: false };
function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage unavailable */ }
  if (!cloud.db || !cloud.me || ui.mode !== "owner") return;
  cloud.dirty = true;
  clearTimeout(cloud.saveT);
  cloud.saveT = setTimeout(cloudSave, 1500);
  setCloud("pending");
}
let saveTimer = 0;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 250); }
async function cloudSave() {
  if (cloud.saving) { cloud.saveT = setTimeout(cloudSave, 800); return; }
  cloud.saving = true;
  cloud.dirty = false;
  const p = state.project;
  try {
    await cloud.db.doc(`data/users/${cloud.me}/p_${p.id}`).set({ name: p.name, units: p.units, room: p.room || null, mats: p.mats || [], updatedAt: new Date().toISOString() });
    setCloud(cloud.dirty ? "pending" : "saved");
  } catch (e) {
    setCloud(e?.code === "quota_exceeded" ? "full" : "error");
  }
  cloud.saving = false;
}
function setCloud(s) {
  ui.cloud = s;
  const el = $("#cloud");
  if (!el) return;
  const t = { local: "محفوظ على الجهاز ده", pending: "بيحفظ…", saved: "محفوظ أونلاين", error: "الحفظ أونلاين وقف — هيتحفظ على الجهاز", full: "المساحة الأونلاين اتملت" }[s];
  el.innerHTML = `${ICON.cloud}<span>${t}</span>`;
  el.dataset.s = s;
}

// ------------------------------------------------------------------ engines adapter
const cache = new Map();
function R(u) {
  const key = u.kind + JSON.stringify(u.params) + JSON.stringify(u.libs || {});
  if (cache.has(key)) return cache.get(key);
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  const out = u.kind === "dressing" ? adaptDressing(u) : u.kind === "kitchen" ? adaptKitchen(u) : adaptPanel(u);
  cache.set(key, out);
  return out;
}
function bandM(parts) {
  let t = 0;
  for (const pt of parts) {
    const lb = pt.label;
    if (!pt.cut_piece || !lb) continue;
    if (pt.band_len != null) t += pt.band_len;
    else if (pt.band_all_sides) t += 2 * (lb.w + lb.h);
    else { const b = lb.banded; t += (b.left ? lb.h : 0) + (b.right ? lb.h : 0) + (b.bottom ? lb.w : 0) + (b.top ? lb.w : 0); }
  }
  return Math.round(t) / 100;
}
/** doors/drawers of the box-part engines (panel, dressing) → movers like the kitchen engine's.
 * A door swings on the side its label/name says, a flap on its top edge, a drawer front pulls out with
 * every part of its group (box, bottom, handle). Front = −y. */
function partMovers(parts) {
  const movers = [], of = new Array(parts.length).fill(null), byGroup = new Map(), byName = [];
  parts.forEach((pt, i) => {
    const b = pt.box;
    if (!b) return;
    const isDrawer = pt.role === "drawer_front" || (pt.role === "door" && (/درج/.test(pt.name) || /drawer/.test(pt.group || "")));
    const isDoor = !isDrawer && pt.role === "door";
    if (!isDoor && !isDrawer) return;
    const zc = (b.z0 + b.z1) / 2, yf = b.y0;
    let mv;
    if (isDrawer) mv = { kind: "drawer", name: pt.name, hinge: [0, 0, 0], axis: [0, 0, 1], free: [0, 0, 0], normal: [0, -1, 0], slide: 0 };
    else {
      const side = pt.door_label?.hinge_side || (/قلاب/.test(pt.name) ? "top" : /يمين/.test(pt.name) ? "right" : "left");
      if (side === "top") mv = { kind: "door", name: pt.name, hinge: [b.x0, yf, b.z1], axis: [1, 0, 0], free: [b.x0, yf, b.z0], normal: [0, -1, 0], slide: 0 };
      else if (side === "right") mv = { kind: "door", name: pt.name, hinge: [b.x1, yf, zc], axis: [0, 0, 1], free: [b.x0, yf, zc], normal: [0, -1, 0], slide: 0 };
      else mv = { kind: "door", name: pt.name, hinge: [b.x0, yf, zc], axis: [0, 0, 1], free: [b.x1, yf, zc], normal: [0, -1, 0], slide: 0 };
    }
    movers.push(mv);
    of[i] = movers.length - 1;
    if (pt.group) byGroup.set(pt.group, movers.length - 1);
    byName.push([pt.name + " - ", movers.length - 1]);
  });
  byName.sort((a, b) => b[0].length - a[0].length);
  parts.forEach((pt, i) => {
    if (of[i] !== null) return;
    let m = pt.group != null && byGroup.has(pt.group) ? byGroup.get(pt.group) : null;
    if (m === null) for (const [pre, k] of byName) if (pt.name.startsWith(pre)) { m = k; break; }
    of[i] = m;
  });
  // drawers pull out by ~75% of their box depth (setOpen scales drawer slides by 1.4)
  movers.forEach((mv, k) => {
    if (mv.kind !== "drawer") return;
    let d = 0;
    parts.forEach((pt, i) => { if (of[i] === k && pt.box) d = Math.max(d, pt.box.y1 - pt.box.y0); });
    mv.slide = Math.max(15, (d * 0.75) / 1.4);
  });
  return { movers, of };
}
function adaptPanel(u) {
  const r = panelCompute(u.params);
  const base = { kind: "panel", raw: r, ok: r.ok, errors: r.errors, warnings: r.warnings || [], notes: r.notes || [], params: r.params, parts: r.parts || [], checks: r.checks || [] };
  if (!r.ok) return base;
  const pm = partMovers(base.parts);
  return { ...base, movers: pm.movers, partMover: pm.of, names: r.material_names, colors: r.material_colors, hardware: r.hardware,
    pieces: r.summary.piece_count, banding: r.summary.banding_m, doors: r.summary.door_count, drawers: r.summary.drawer_count,
    label: Schema.TEMPLATES[r.params.template]?.label, libOf: (k) => panelLib(r.params, k) };
}
function panelLib(params, key) {
  let k = key; const seen = new Set();
  while (k && !seen.has(k)) { seen.add(k); const lib = params.materials?.[k]?.lib; if (lib) return lib; k = Catalog.MATERIAL_KEYS[k]?.fallback; }
  return null;
}
function dNames(params) {
  const out = {};
  for (const k of Object.keys(D.MATERIAL_KEYS)) {
    let key = k, name = "";
    const seen = new Set();
    while (key && !seen.has(key) && !name) {
      seen.add(key);
      const m = params.materials?.[key] || {};
      name = (m.name || "").trim() || ((m.skm || "").trim() ? m.skm.split(/[\\/]/).pop().replace(/\.[^.]+$/, "") : "");
      key = D.MATERIAL_KEYS[key].fallback;
    }
    out[k] = name || D.MATERIAL_DEFAULT_NAMES[k] || D.MATERIAL_KEYS[k].label;
  }
  return out;
}
function adaptDressing(u) {
  const r = D.compute(u.params);
  const base = { kind: "dressing", raw: r, ok: r.ok, errors: r.errors, warnings: r.warnings || [], notes: [], params: r.params, parts: r.parts || [], checks: [] };
  if (!r.ok) return base;
  const names = dNames(r.params);
  const libs = u.libs || {};
  const libOf = (k) => { let key = k; const seen = new Set(); while (key && !seen.has(key)) { seen.add(key); if (libs[key]) return libs[key]; key = D.MATERIAL_KEYS[key]?.fallback; } return null; };
  const colors = {};
  for (const k of Object.keys(D.MATERIAL_KEYS)) { const l = libOf(k); colors[k] = l ? Catalog.LIB[l][2] : hexRgb(D.MATERIAL_KEYS[k].rgb); }
  let hardware = {};
  try { hardware = D.computeBom([[u.name, u.params]], (_p, k) => names[k] || k).hardware || {}; } catch { hardware = { ...r.summary.handle_hardware, ...r.summary.led_hardware, ...r.summary.plinth_hardware }; }
  const pm = partMovers(base.parts);
  return { ...base, movers: pm.movers, partMover: pm.of, names, colors, hardware, pieces: r.summary.piece_count, banding: bandM(r.parts), doors: r.summary.door_count, drawers: r.summary.drawer_count,
    label: "دريسنج", libOf };
}

function adaptKitchen(u) {
  const r = computeKitchen(u.params || {});
  const base = { kind: "kitchen", raw: r, ok: r.ok, errors: r.errors, warnings: r.warnings, notes: [], params: r.params, parts: r.parts, meshes: r.meshes, movers: r.movers || [], checks: [] };
  if (!r.ok) return base;
  const libs = u.libs || {};
  const libOf = (k) => libs[k] || null;
  const colors = {};
  for (const k of Object.keys(KU.K_DEFAULT_COLORS)) colors[k] = libs[k] ? Catalog.LIB[libs[k]][2] : KU.K_DEFAULT_COLORS[k];
  if (!libs.front && /^#?[0-9a-f]{6}$/i.test(String(r.params.door_color || ""))) colors.front = "#" + String(r.params.door_color).replace("#", "");
  const names = {};
  for (const [k, [, param]] of Object.entries(KU.K_MATS)) names[k] = String(r.params[param] || "").trim() || KU.K_DEFAULT_NAMES[k];
  const p = r.params;
  const kind = p.unit_category === "corner" ? `زاوية ${KU.K_CORNER[p.corner_style] || ""}` : KU.K_CATS[p.unit_category] || "وحدة مطبخ";
  return { ...base, names, colors, hardware: r.hardware, pieces: r.parts.length, banding: bandM(r.parts), doors: r.stats.doors, drawers: r.stats.drawers,
    label: `${kind} · ${KU.K_TYPES[p.unit_type] || ""}`, libOf };
}
/** width × height × depth of any unit (kitchen corners use their own size fields) */
function dimsText(u, r) {
  const p = r.params;
  if (u.kind === "kitchen") return KU.dimsFor(p).slice(0, 3).map(([k]) => n1(+p[k] || 0)).join(" × ");
  return `${n1(p.width)} × ${n1(p.height)} × ${n1(p.depth)}`;
}

const selUnit = () => state.project.units.find((u) => u.id === state.sel) || null;
function expanded(u) { const p = clone(R(u).params || {}); delete p.preset; return p; }
function setParams(u, mutate) { const p = expanded(u); mutate(p); u.params = p; save(); render(); }
const getPath = (p, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), p);
function setPath(p, path, v) { const ks = path.split("."); let o = p; for (const k of ks.slice(0, -1)) o = o[k] ??= {}; o[ks[ks.length - 1]] = v; }

// ------------------------------------------------------------------ layout
const app = $("#app");
app.innerHTML = `
<header class="bar">
  <div class="brand"><span class="mark" aria-hidden="true">N</span><b>NOVERA</b><span class="studio">Studio</span></div>
  <button id="projBtn" class="projbtn">${ICON.folder}<span id="projName"></span></button>
  <button id="expBtn" class="projbtn">${ICON.share}<span>تصدير</span></button>
  <button id="aboutBtn" class="projbtn" aria-label="عن التطبيق">ⓘ</button>
  <span id="cloud" class="cloud"></span>
  <nav class="tabs" role="tablist">
    <button data-tab="design" role="tab"><span class="tl">التصميم</span><span class="ts">تصميم</span></button>
    <button data-tab="cut" role="tab"><span class="tl">القص</span><span class="ts">قص</span></button>
    <button data-tab="parts" role="tab"><span class="tl">القطع والحصر</span><span class="ts">قطع</span></button>
    <button data-tab="shop" role="tab"><span class="tl">الورشة والعميل</span><span class="ts">ورشة</span></button>
  </nav>
</header>
<main id="views">
  <section id="v-design" class="design">
    <aside id="lib" class="lib"></aside>
    <div class="stage">
      <button id="fsBtn" class="fsbtn" aria-label="ملء الشاشة" title="ملء الشاشة">⛶</button>
      <div id="chips" class="chips"></div>
      <div id="scenep" class="scenep" hidden></div>
      <div id="movebar" class="movebar" hidden><span>وضع التحريك — اسحب الوحدة اللي عليها الإطار الدهبي. دوس على وحدة تانية عشان تختارها.</span><button data-moveoff>✕ خروج</button></div>
      <div id="view3d" class="view3d"><div id="fallback" class="fallback" hidden></div><div id="ptbar" class="ptbar" hidden></div>
        <div class="vctl" role="toolbar" aria-label="التحكم في العرض">
          <button data-vz="0.8" aria-label="قرّب">+</button><button data-vz="1.25" aria-label="بعّد">−</button>
          <button data-vr="-25" aria-label="لف الكاميرا شمال">⟲</button><button data-vr="25" aria-label="لف الكاميرا يمين">⟳</button>
          <button data-vp="top" aria-label="من فوق">فوق</button><button data-vp="front" aria-label="من قدام">قدام</button><button data-vp="fit" aria-label="ملء الشاشة">⤢</button>
        </div></div>
      <div id="plan" class="plan" hidden></div>
      <div id="errs" class="errs" hidden></div>
      <div class="units">
        <button id="libBtn" class="libbtn">${ICON.lib}<span>المكتبة</span></button>
        <div id="unitStrip" class="strip"></div>
      </div>
    </div>
    <aside id="props" class="props"></aside>
    <button id="sheetBtn" class="sheetbtn" aria-label="الخصائص"><i></i><span>الخصائص</span></button>
  </section>
  <section id="v-cut" class="cut" hidden></section>
  <section id="v-parts" class="parts" hidden></section>
  <section id="v-shop" class="parts" hidden></section>
  <section id="v-client" class="client" hidden></section>
  <section id="v-work" class="parts" hidden></section>
</main>
<div id="pop" class="pop" hidden></div>`;

$(".tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (!b) return;
  state.tab = b.dataset.tab;
  save();
  render(true);
});
$("#libBtn").addEventListener("click", () => { state.libOpen = !state.libOpen; render(); });
{
  // tap a unit to select it; drag the selected unit along the floor — it snaps to walls and neighbours
  let down = null, drag = null;
  const host = $("#view3d");
  let press = 0;
  const startDrag = (e, id) => {
    if (id !== state.sel) { state.sel = id; save(); renderStrip(); renderChips(); renderProps(); }
    const u = selUnit(), L = view.poses?.get(id), hit = view.floorAt(e.clientX, e.clientY);
    if (!u || !L || !hit) return;
    const box = localBox(R(u));
    const c = Room.centerOf(L, box);
    drag = { u, box, rot: L.rot, off: [c[0] - hit[0], c[1] - hit[1]], row: rowOf(u, R(u)), segs: roomSegs(state.project), pose: L,
      others: projectItems(state.project).filter((it) => it.id !== id).map((it) => ({ box: it.box, row: it.row, pose: view.poses.get(it.id) })).filter((o) => o.pose) };
    view.ctl.enabled = false;
    view.highlight(id, true);
    try { host.setPointerCapture(e.pointerId); } catch { /* pointer gone */ }
  };
  // orbiting never moves furniture: a unit moves only in "move" mode or after a long press on it
  // capture phase: runs before the orbit controls, so a move can claim the finger outright
  host.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".vctl, .movebar")) return;
    down = [e.clientX, e.clientY];
    clearTimeout(press);
    if (!wholeView() || ui.mode !== "owner" || !view.ready || !e.isPrimary) return;
    const id = view.pickAt(e.clientX, e.clientY);
    if (!id || id !== state.sel) return; // only the outlined (selected) unit ever moves
    if (ui.moveMode) { e.stopPropagation(); startDrag(e, id); return; }
    const ev = { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId };
    press = setTimeout(() => {
      if (!down || Math.hypot(down[2] ?? 0, down[3] ?? 0) > 8) return;
      view.ctl.enabled = false; view.ctl.enabled = true; // drop the orbit gesture that started
      startDrag(ev, id);
      navigator.vibrate?.(15);
    }, 450);
  }, true);
  host.addEventListener("pointermove", (e) => {
    if (down && !drag) { down[2] = e.clientX - down[0]; down[3] = e.clientY - down[1]; if (Math.hypot(down[2], down[3]) > 8) clearTimeout(press); }
    if (!drag) return;
    const hit = view.floorAt(e.clientX, e.clientY);
    if (!hit) return;
    drag.pose = Room.snapPose(drag.segs, drag.box, [hit[0] + drag.off[0], hit[1] + drag.off[1]], drag.rot, drag.others, drag.row);
    view.movePicked(drag.u.id, drag.pose);
  });
  const end = (e) => {
    clearTimeout(press);
    if (drag) {
      view.highlight(drag.u.id, false);
      const p = drag.pose;
      drag.u.pos = p.wall ? { wall: p.wall, s: p.s } : { x: p.x, z: p.z, rot: p.rot };
      drag = null;
      view.ctl.enabled = true;
      down = null;
      save();
      renderChips();
      view.update();
      return;
    }
    if (!down || !wholeView() || ui.mode !== "owner" || e.type !== "pointerup") { down = null; return; }
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
    down = null;
    if (moved > 6) return;
    const id = view.pickAt(e.clientX, e.clientY);
    if (id && id !== state.sel) { state.sel = id; save(); renderStrip(); renderChips(); renderProps(); renderErrs(); view.update(); }
  };
  host.addEventListener("pointerup", end);
  host.addEventListener("pointercancel", end);
}
document.querySelector("#view3d .vctl").addEventListener("pointerdown", (e) => e.stopPropagation());
document.querySelector("#view3d .vctl").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || !view.ready) return;
  if (b.dataset.vz) view.zoom(+b.dataset.vz);
  else if (b.dataset.vr) view.orbit(+b.dataset.vr);
  else if (b.dataset.vp) view.preset(b.dataset.vp);
});
// ---- scene & lighting panel, saved camera views, final (path-traced) render
function renderScene() {
  const el = $("#scenep");
  const on = !!(ui.sceneOpen && state.render && state.tab === "design" && !ui.planOn);
  el.hidden = !on;
  if (!on) return;
  const sc = Render.sceneOf(state);
  const views = state.project.views || [];
  el.innerHTML = `<div class="sph"><b>المشهد والإضاءة</b><button class="x" data-sclose aria-label="قفل">×</button></div>
    <div class="seg" role="group" aria-label="الوقت">${Object.entries(Render.TIMES).map(([k, t]) => `<button data-time="${k}" class="${sc.time === k ? "on" : ""}">${t.label}</button>`).join("")}</div>
    <label class="sl"><span>الإضاءة العامة</span><input type="range" min="0.4" max="2.2" step="0.05" data-sk="exposure" value="${sc.exposure}"></label>
    <label class="sl"><span>اتجاه الشمس</span><input type="range" min="0" max="360" step="5" data-sk="sunAz" value="${sc.sunAz}"></label>
    <div class="stogs">${[["spots", "سبوتات السقف"], ["led", "الليد"], ["ao", "ضل الأركان"], ["bloom", "توهّج الليد"]].map(([k, l]) => `<button class="chip tog ${sc[k] ? "on" : ""}" data-stog="${k}">${l}</button>`).join("")}</div>
    <h4>الكادرات المحفوظة</h4>
    <div class="vlist">${views.map((v) => `<span class="vrow"><button data-vgo="${v.id}">${esc(v.name)}</button><button class="x" data-vdel="${v.id}" aria-label="امسح ${esc(v.name)}">×</button></span>`).join("") || `<small class="hint">لفّ الكاميرا لحد ما الكادر يعجبك واحفظه، وارجع له في أي وقت.</small>`}</div>
    <button class="add" data-vsave>＋ احفظ الكادر ده</button>`;
}
$("#scenep").addEventListener("pointerdown", (e) => e.stopPropagation());
$("#scenep").addEventListener("input", (e) => {
  const k = e.target.dataset?.sk;
  if (!k) return;
  Render.sceneOf(state)[k] = +e.target.value;
  view.refreshScene();
  save();
});
$("#scenep").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset, sc = Render.sceneOf(state);
  if (b.hasAttribute("data-sclose")) { ui.sceneOpen = false; renderScene(); renderChips(); return; }
  if (d.time) { sc.time = d.time; save(); renderScene(); view.update(); return; }
  if (d.stog) { sc[d.stog] = !sc[d.stog]; save(); renderScene(); view.update(); return; }
  if (b.hasAttribute("data-vsave")) {
    const vs = (state.project.views ??= []);
    const c = view.cam.position, t = view.ctl.target;
    vs.push({ id: uid(), name: `كادر ${vs.length + 1}`, whole: wholeView(), p: [c.x, c.y, c.z], t: [t.x, t.y, t.z] });
    save(); renderScene(); return;
  }
  if (d.vdel) { state.project.views = (state.project.views || []).filter((v) => v.id !== d.vdel); save(); renderScene(); return; }
  if (d.vgo) {
    const v = (state.project.views || []).find((x) => x.id === d.vgo);
    if (!v) return;
    if (v.whole !== wholeView() && state.project.units.length) { state.whole = v.whole; save(); renderChips(); view.update(); }
    view.cam.position.set(...v.p); view.ctl.target.set(...v.t); view.cam.lookAt(view.ctl.target);
    view.dirty = true;
    if (view.final.active) view.final.camMoved = true;
  }
});
const fmtSecs = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
function renderPt() {
  const el = $("#ptbar"), p = ui.pt;
  el.hidden = !p;
  document.body.classList.toggle("ptrun", !!p && p.phase !== "setup");
  if (!p) return;
  const opt = (key, table) => Object.entries(table).map(([k, [l]]) => `<button data-pt${key}="${k}" class="${p[key] === k ? "on" : ""}">${l}</button>`).join("");
  if (p.phase === "setup") {
    el.innerHTML = `<div class="pth"><b>📸 ريندر نهائي</b><button class="x" data-ptx aria-label="قفل">×</button></div>
      <p class="hint">بيتتبّع مسار الضوء الحقيقي: ضل ناعم، انعكاسات، زجاج، وإضاءة الليد والسبوتات. كل ما يستنى أكتر الصورة تبقى أنضف. اختار الكادر الأول من الكاميرا.</p>
      <div class="ptrow"><span>الجودة</span><div class="seg">${opt("quality", Render.PT_QUALITY)}</div></div>
      <div class="ptrow"><span>المقاس</span><div class="seg">${opt("size", Render.PT_SIZES)}</div></div>
      <div class="ptrow"><button class="chip tog ${p.denoise ? "on" : ""}" data-ptden>تنعيم النويز</button></div>
      <button class="primary" data-ptgo>ابدأ الريندر</button>`;
    return;
  }
  const pc = p.target ? Math.min(100, Math.round((100 * (p.samples || 0)) / p.target)) : 0;
  const msg = p.phase === "load" ? "بيحمّل محرك الريندر…" : p.phase === "build" ? "بيجهّز المشهد…" : p.phase === "done" ? "خلص ✓" : p.phase === "paused" ? "متوقف مؤقتاً" : "بيرندر…";
  el.innerHTML = `<div class="pth"><b>${msg}</b><span class="num" dir="ltr">${p.samples || 0} / ${p.target || "…"} · ${fmtSecs(p.secs || 0)}${p.size ? ` · ${p.size[0]}×${p.size[1]}` : ""}</span></div>
    <div class="ptprog"><i style="width:${pc}%"></i></div>
    <div class="ptrow"><button class="primary" data-ptsave ${p.samples ? "" : "disabled"}>احفظ الصورة</button>
      ${p.phase === "done" ? "" : `<button class="ghost2" data-ptpause>${p.phase === "paused" ? "كمّل" : "وقّف مؤقتاً"}</button>`}
      <button class="ghost2" data-ptx>خروج</button></div>`;
}
function closeFinal() {
  if (view.final?.active) view.final.stop();
  ui.pt = null;
  renderPt();
}
$("#ptbar").addEventListener("pointerdown", (e) => e.stopPropagation());
$("#ptbar").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b || !ui.pt) return;
  const d = b.dataset, p = ui.pt;
  if (b.hasAttribute("data-ptx")) { closeFinal(); renderChips(); return; }
  if (d.ptquality) { p.quality = d.ptquality; renderPt(); return; }
  if (d.ptsize) { p.size = d.ptsize; renderPt(); return; }
  if (b.hasAttribute("data-ptden")) { p.denoise = !p.denoise; renderPt(); return; }
  if (b.hasAttribute("data-ptpause")) { view.final.paused = !view.final.paused; p.phase = view.final.paused ? "paused" : "run"; renderPt(); return; }
  if (b.hasAttribute("data-ptgo")) {
    ui.sceneOpen = false; renderScene();
    let last = "";
    try {
      await view.final.start({ quality: p.quality, size: p.size, denoise: p.denoise }, (st) => {
        if (!ui.pt) return;
        Object.assign(ui.pt, st);
        const key = st.phase + (st.phase === "run" ? "" : st.samples);
        if (key !== last || st.phase === "run") { last = key; renderPt(); }
      });
    } catch (err) {
      console.warn(err);
      closeFinal();
      alertBar("الريندر النهائي محتاج إنترنت أول مرة، أو الجهاز ده مش بيدعمه.");
    }
    return;
  }
  if (b.hasAttribute("data-ptsave")) {
    b.disabled = true;
    try {
      const url = view.final.grab();
      const bin = atob(url.split(",")[1]), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      await Exp.deliver(cloud.downloads, `${fileBase()} — ريندر.png`, bytes);
    } catch { alertBar("ما قدرتش أحفظ الصورة."); }
    b.disabled = false;
  }
});
// full-screen design view (the stage alone) and the phone's bottom sheet for the properties
function renderMoveBar() { $("#movebar").hidden = !(ui.moveMode && wholeView() && !ui.planOn && state.tab === "design"); }
$("#movebar").addEventListener("click", (e) => { if (e.target.closest("[data-moveoff]")) { ui.moveMode = false; renderMoveBar(); renderChips(); } });
$("#fsBtn").addEventListener("click", () => {
  const on = !document.body.classList.contains("fs");
  document.body.classList.toggle("fs", on);
  $("#fsBtn").textContent = on ? "✕" : "⛶";
  $("#fsBtn").setAttribute("aria-label", on ? "خروج من ملء الشاشة" : "ملء الشاشة");
  setTimeout(() => { view.resize(); plan.vb = null; plan.render(); }, 60);
});
$("#sheetBtn").addEventListener("click", () => {
  const order = ["min", "half", "full"];
  ui.sheet = order[(order.indexOf(ui.sheet || "min") + 1) % 3];
  document.body.dataset.sheet = ui.sheet;
  setTimeout(() => view.resize(), 260);
});
document.body.dataset.sheet = "min";
$("#projBtn").addEventListener("click", () => { ui.pop = "projects"; renderPop(); refreshProjects(); });
$("#expBtn").addEventListener("click", () => { ui.pop = "export"; renderPop(); });
$("#aboutBtn").addEventListener("click", () => { ui.pop = "about"; renderPop(); });

// ------------------------------------------------------------------ library
function swatches(colors) {
  return colors.filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 3).map((hex) => `<i style="background:${hex}"></i>`).join("");
}
function renderLib() {
  let h = `<div class="libhead"><h2>المكتبة</h2><button class="x" data-close aria-label="قفل المكتبة">×</button></div>
    <p class="hint">دوس على أي تصميم يتضاف للمشروع وتعدّله براحتك.</p><h3>المطابخ</h3><div class="cards">`;
  for (const [key, s] of Object.entries(KU.KITCHEN)) {
    const base = !s.params.unit_type || s.params.unit_type === "base";
    h += `<button class="card" data-kitchen="${key}"><span class="sw">${swatches([KU.K_DEFAULT_COLORS.front, KU.K_DEFAULT_COLORS.carcass, base ? KU.K_DEFAULT_COLORS.countertop : null])}</span><b>${esc(s.label)}</b><small>${esc(s.desc)}</small></button>`;
  }
  h += `</div><h3>الدريسنج</h3><div class="cards">`;
  for (const [key, s] of Object.entries(DRESSING)) {
    const r = R({ kind: "dressing", name: s.label, params: s.params, libs: s.libs });
    h += `<button class="card" data-dress="${key}"><span class="sw">${swatches([r.colors?.door, r.colors?.carcass, r.colors?.glass])}</span><b>${esc(s.label)}</b><small>${esc(s.desc)}</small></button>`;
  }
  h += `</div>`;
  const groups = {};
  for (const [key, pr] of Object.entries(PRESETS)) (groups[pr.group] ??= []).push([key, pr]);
  for (const [g, items] of Object.entries(groups)) {
    h += `<h3>${esc(g)}</h3><div class="cards">`;
    for (const [key, pr] of items) {
      const c = panelCompute({ preset: key }).material_colors || {};
      h += `<button class="card" data-preset="${key}"><span class="sw">${swatches([c.front, c.carcass, c.accent, c.table_top, c.table_base])}</span><b>${esc(pr.label)}</b><small>${esc(pr.desc)}</small></button>`;
    }
    h += "</div>";
  }
  h += `<h3>قوالب فاضية</h3><div class="tpls"><button class="tpl" data-kitchen="__blank">وحدة مطبخ<small>المطابخ</small></button><button class="tpl" data-dress="__blank">دريسنج فاضي<small>الدريسنج</small></button>`;
  for (const [key, t] of Object.entries(Schema.TEMPLATES)) {
    if (key === "free") continue;
    h += `<button class="tpl" data-template="${key}">${esc(t.label)}<small>${esc(t.group)}</small></button>`;
  }
  $("#lib").innerHTML = h + "</div>";
}
$("#lib").addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) { state.libOpen = false; render(); return; }
  const c = e.target.closest("[data-preset],[data-template],[data-dress],[data-kitchen]");
  if (!c) return;
  let u;
  if (c.dataset.kitchen) {
    const s = KU.KITCHEN[c.dataset.kitchen];
    u = { id: uid(), kind: "kitchen", name: s ? s.label : "وحدة مطبخ", params: clone(s ? s.params : {}), libs: {} };
  } else if (c.dataset.dress) {
    const s = DRESSING[c.dataset.dress];
    u = s ? { id: uid(), kind: "dressing", name: s.label, params: clone(s.params), libs: clone(s.libs || {}) } : { id: uid(), kind: "dressing", name: "دريسنج", params: {} };
  } else if (c.dataset.preset) u = { id: uid(), kind: "panel", name: PRESETS[c.dataset.preset].label, params: { preset: c.dataset.preset } };
  else u = { id: uid(), kind: "panel", name: Schema.TEMPLATES[c.dataset.template].label, params: { template: c.dataset.template } };
  state.project.units.push(u);
  state.sel = u.id;
  state.libOpen = false;
  save();
  render(true);
});

// ------------------------------------------------------------------ unit strip
function renderStrip() {
  $("#unitStrip").innerHTML = state.project.units.map((u) => {
    const r = R(u);
    return `<button class="uchip ${u.id === state.sel ? "on" : ""} ${r.ok ? "" : "bad"}" data-unit="${u.id}">
      <b><span class="ucode">${esc(unitCode(u))}</span>${esc(u.name)}</b><small>${r.ok ? `${r.pieces} قطعة` : "فيها أخطاء"}</small></button>`;
  }).join("") || `<span class="empty">المشروع فاضي — افتح المكتبة وضيف أول وحدة.</span>`;
}
$("#unitStrip").addEventListener("click", (e) => {
  const b = e.target.closest("[data-unit]");
  if (!b) return;
  if (state.sel === b.dataset.unit && matchMedia("(max-width: 640px), (max-height: 520px)").matches) { ui.sheet = ui.sheet === "min" ? "half" : "min"; document.body.dataset.sheet = ui.sheet; setTimeout(() => view.resize(), 260); }
  state.sel = b.dataset.unit;
  save();
  render(true);
});

// ------------------------------------------------------------------ live chips
const short = (s) => s.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s*—.*$/, "").trim();
const stepChip = (path, label, val, d = 5) => `<span class="chip step"><button data-step="${path}" data-d="${-d}" aria-label="${label} أقل">${ICON.minus}</button><span>${label} <b>${val}</b></span><button data-step="${path}" data-d="${d}" aria-label="${label} أكتر">${ICON.plus}</button></span>`;
const cycleChip = (path, label, table, v) => `<button class="chip" data-cyc="${path}" data-table="${table}">${esc(label)}: <b>${esc(short(TABLES[table][v] ?? String(v)))}</b>${ICON.cycle}</button>`;
const togChip = (path, label, v) => `<button class="chip tog ${v ? "on" : ""}" data-toggle="${path}">${esc(label)}</button>`;
const TABLES = { D_STYLES: D.DOOR_STYLES, D_LAYOUT: D.DOOR_LAYOUTS, D_HANDLES: D.HANDLE_TYPES, D_CONTENT: D.CONTENTS, D_DOORS: D.DOORS, D_CONSTR: D.CONSTRUCTIONS,
  K_DOORS: KU.K_DOORS, K_POS: KU.K_POS, K_HANDLES: KU.K_HANDLES };

function planChips() {
  const room = state.project.room, sel = ui.planSel;
  let h = `<button class="chip tog on" data-plan>${ICON.cube}3D</button>`;
  if (ui.planView === "elev") return h + `<button class="chip" data-elevback>رجوع للمسقط</button>`;
  if (ui.planTool === "draw") {
    const n = ui.draft?.length || 0;
    h += `<span class="chip hintchip">دوس على الأرض عشان تحط كل ركن — بيمسك على 5 سم وعلى الزوايا القايمة</span>`;
    if (n >= 2) h += `<button class="chip tog on" data-drawdone>خلّص</button>`;
    if (n >= 3) h += `<button class="chip tog" data-drawclose>اقفل الأوضة</button>`;
    if (n) h += `<button class="chip tog" data-drawundo>رجّع نقطة</button>`;
    return h + `<button class="chip tog" data-drawcancel>إلغاء</button>`;
  }
  h += `<button class="chip" data-roompop>أوضة جاهزة بالمقاسات</button><button class="chip" data-draw>ارسم حيطان</button>`;
  if (sel?.kind === "wall") h += `<button class="chip tog" data-addop="door">+ باب</button><button class="chip tog" data-addop="window">+ شباك</button><button class="chip tog" data-mepop>+ كهربا / سباكة / غاز</button><button class="chip tog" data-elev>واجهة الحيطة</button>`;
  if (room) h += `<button class="chip tog" data-addcol>+ عمود</button>`;
  if (sel?.kind === "unit" || (state.sel && !sel)) h += `<span class="chip step zone"><span class="zl">لف الوحدة</span><button data-rot="-90">↺90</button><button data-rot="-15">↺15</button><button data-rot="15">↻15</button><button data-rot="90">↻90</button></span>`;
  if (state.project.units.some((x) => x.pos)) h += `<button class="chip tog" data-autolay>رصّ تلقائي</button>`;
  { const n = designChecks().filter((c) => c.level !== "n").length; h += `<button class="chip tog ${n ? "warnchip" : ""}" data-checks>فحص التصميم${n ? ` (${n})` : " ✓"}</button>`; }
  return h + `<button class="chip tog" data-planfit>ملء الشاشة</button>`;
}
function renderChips() {
  const u = selUnit();
  const el = $("#chips");
  if (ui.planOn) { el.innerHTML = planChips(); return; }
  if (!u) { el.innerHTML = `<button class="chip tog" data-plan>المسقط والحيطان</button>`; return; }
  const r = R(u);
  const p = r.params;
  let h = "";
  if (u.kind === "kitchen") {
    for (const [path, label] of KU.dimsFor(p).slice(0, 3)) h += stepChip(path, label, n1(+p[path] || 0));
    h += cycleChip("door_type", "الضلف", "K_DOORS", p.door_type);
    if (p.door_type === "drawers" || p.door_type === "drawer_top_two_doors_bottom") h += stepChip("drawer_count", "أدراج", p.drawer_count, 1);
    if (p.include_shelves) h += stepChip("shelf_count", "أرفف", p.shelf_count, 1);
    h += cycleChip("door_position", "التركيب", "K_POS", p.door_position);
    h += cycleChip("kud_handles.type", "المقبض", "K_HANDLES", p.kud_handles?.type || "none");
    if (p.unit_type !== "wall") h += togChip("include_toe_kick", "سكلو", p.include_toe_kick);
    h += togChip("include_assembly_holes", "أليتا", p.include_assembly_holes);
  } else if (u.kind === "dressing") {
    h += stepChip("width", "العرض", n1(p.width)) + stepChip("height", "الارتفاع", n1(p.height));
    h += `<span class="chip step"><button data-dsec="-1" aria-label="قسم أقل">${ICON.minus}</button><span>أقسام <b>${p.sections?.length ?? 0}</b></span><button data-dsec="1" aria-label="قسم أكتر">${ICON.plus}</button></span>`;
    h += cycleChip("doors.style", "الضلف", "D_STYLES", p.doors?.style);
    h += cycleChip("handles.type", "المقبض", "D_HANDLES", p.handles?.type);
    h += togChip("plinth.enabled", "سكلو", p.plinth?.enabled);
    (p.sections || []).forEach((s, si) => {
      const big = s.compartments.reduce((a, c) => (c.height === "auto" ? c : a), s.compartments[s.compartments.length - 1]);
      const ci = s.compartments.indexOf(big);
      h += `<span class="chip zone"><span class="zl">قسم ${si + 1}</span><button data-dcc="${si}.${ci}">${esc(short(D.CONTENTS[big.content]))}${ICON.cycle}</button><button data-dcd="${si}.${ci}">${esc(short(D.DOORS[big.door]))}${ICON.cycle}</button></span>`;
    });
  } else {
    const tpl = p.template;
    const spec = Schema.SPECIAL[tpl];
    const hide = spec?.hide || [];
    if (!hide.includes("size") && tpl !== "free") h += stepChip("width", "العرض", n1(p.width)) + stepChip("height", "الارتفاع", n1(p.height));
    for (const [path, label, type, choices] of Schema.liveFields(tpl)) {
      const v = getPath(p, path);
      if (type === "choice") h += `<button class="chip" data-pcyc="${path}">${esc(short(label))}: <b>${esc(choices[v] ?? v)}</b>${ICON.cycle}</button>`;
      else if (type === "bool") h += togChip(path, short(label), v);
      else if (type === "int") h += stepChip(path, short(label), v, 1);
    }
    if (!hide.includes("fronts") && Array.isArray(p.fronts)) {
      p.fronts.forEach((z, i) => {
        h += `<span class="chip zone"><span class="zl">جزء ${i + 1}</span><button data-zt="${i}">${esc(Schema.FRONT_TYPES[z.type])}${ICON.cycle}</button>
          ${z.type === "doors" || z.type === "drawers" ? `<button data-zc="${i}" data-d="-1" aria-label="أقل">${ICON.minus}</button><b>${z.count}</b><button data-zc="${i}" data-d="1" aria-label="أكتر">${ICON.plus}</button>` : ""}
          ${z.type !== "drawers" ? `<span class="zl">أرفف</span><button data-zs="${i}" data-d="-1" aria-label="رف أقل">${ICON.minus}</button><b>${z.shelves}</b><button data-zs="${i}" data-d="1" aria-label="رف أكتر">${ICON.plus}</button>` : ""}</span>`;
      });
    }
  }
  h += `<button class="chip tog ${state.xray ? "on" : ""}" data-xray>${ICON.eye}شفاف</button>`;
  h += `<button class="chip tog ${state.render ? "on" : ""}" data-render>✦ ريندر واقعي</button>`;
  if (state.render) h += `<button class="chip tog ${ui.sceneOpen ? "on" : ""}" data-scene>☀ المشهد والإضاءة</button><button class="chip tog ${ui.pt ? "on" : ""}" data-final>📸 ريندر نهائي</button><button class="chip tog" data-shot>احفظ صورة</button>`;
  if (r.ok && (r.movers?.length || state.whole)) h += `<button class="chip tog ${ui.open ? "on" : ""}" data-open>${ui.open ? "اقفل الضلف" : "افتح الضلف"}</button>`;
  if (state.project.units.length > 1 || state.project.room) h += `<button class="chip tog ${state.whole ? "on" : ""}" data-whole>${ICON.lib}المشروع كله</button>`;
  h += `<button class="chip tog" data-plan>المسقط والحيطان</button>`;
  if (wholeView() || state.project.room) { const n = designChecks().filter((c) => c.level !== "n").length; h += `<button class="chip tog ${n ? "warnchip" : ""}" data-checks>فحص التصميم${n ? ` (${n})` : " ✓"}</button>`; }
  if (wholeView()) {
    const L = projectPoses(state.project).get(u.id);
    if (L?.wall) {
      const segs = roomSegs(state.project);
      const seg = segs.find((g) => g.id === L.wall);
      h += `<span class="chip step zone"><span class="zl">على الحيطة ${seg && !seg.virtual ? segs.indexOf(seg) + 1 : ""} · من أولها</span><button data-mv="-5" aria-label="5 سم لورا">${ICON.minus}</button><b>${n1(L.s)}</b><button data-mv="5" aria-label="5 سم لقدام">${ICON.plus}</button></span>`;
    }
    h += `<button class="chip tog ${ui.moveMode ? "on" : ""}" data-move>✋ ${ui.moveMode ? "بتحرّك الوحدات — دوس تاني للخروج" : "حرّك"}</button>`;
    h += `<span class="chip step zone"><span class="zl">لف</span><button data-rot="-90" aria-label="لف 90 شمال">↺90</button><button data-rot="-15" aria-label="لف 15 شمال">↺15</button><button data-rot="15" aria-label="لف 15 يمين">↻15</button><button data-rot="90" aria-label="لف 90 يمين">↻90</button></span>`;
    if (state.project.units.some((x) => x.pos)) h += `<button class="chip tog" data-autolay>رصّ تلقائي</button>`;
  }
  el.innerHTML = h;
}
const ZTYPES = ["doors", "drawers", "flap", "open"];
const nextKey = (table, v) => { const ks = Object.keys(table); return ks[(ks.indexOf(v) + 1) % ks.length]; };
$("#chips").addEventListener("click", (e) => {
  const u = selUnit();
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (b.hasAttribute("data-plan")) { ui.planOn = !ui.planOn; ui.planView = "plan"; ui.planTool = "select"; plan.vb = null; if (!ui.planOn) { state.whole = state.whole || !!state.project.room; } render(true); return; }
  if (b.hasAttribute("data-roompop")) { ui.pop = "room"; renderPop(); return; }
  if (b.hasAttribute("data-checks")) { ui.pop = "checks"; renderPop(); return; }
  if (b.hasAttribute("data-draw")) { ui.planTool = "draw"; const r = state.project.room; ui.draft = r && !r.closed ? [r.pts[r.pts.length - 1]] : []; renderChips(); renderProps(); plan.render(); return; }
  if (b.hasAttribute("data-drawdone")) { finishDraw(false); return; }
  if (b.hasAttribute("data-drawclose")) { finishDraw(true); return; }
  if (b.hasAttribute("data-drawundo")) { ui.draft?.pop(); renderChips(); renderProps(); plan.render(); return; }
  if (b.hasAttribute("data-drawcancel")) { ui.planTool = "select"; ui.draft = null; plan.hover = null; renderChips(); renderProps(); plan.render(); return; }
  if (b.hasAttribute("data-planfit")) { plan.vb = null; plan.render(); return; }
  if (d.addop) { const o = Room.addOpening(state.project.room, ui.planSel.id, d.addop); if (o) ui.planSel = { kind: "open", id: o.id }; save(); renderChips(); renderProps(); plan.render(); view.update(); return; }
  if (b.hasAttribute("data-elev")) { ui.planView = "elev"; renderChips(); plan.render(); return; }
  if (b.hasAttribute("data-mepop")) { ui.pop = "mep"; ui.mepWall = ui.planSel.id; renderPop(); return; }
  if (b.hasAttribute("data-addcol")) { const c = Room.addColumn(state.project.room); ui.planSel = { kind: "col", id: c.id }; save(); renderChips(); renderProps(); plan.render(); view.update(); return; }
  if (b.hasAttribute("data-elevback")) { ui.planView = "plan"; renderChips(); plan.render(); return; }
  if (!u) return;
  if (b.hasAttribute("data-xray")) { state.xray = !state.xray; save(); renderChips(); view.update(); return; }
  if (b.hasAttribute("data-open")) { ui.open = !ui.open; renderChips(); view.setOpen(ui.open); return; }
  if (b.hasAttribute("data-whole")) { state.whole = !state.whole; save(); renderChips(); view.update(true); return; }
  if (b.hasAttribute("data-render")) { state.render = !state.render; if (!state.render) { ui.sceneOpen = false; closeFinal(); } save(); renderChips(); renderScene(); view.update(); return; }
  if (b.hasAttribute("data-scene")) { ui.sceneOpen = !ui.sceneOpen; renderChips(); renderScene(); return; }
  if (b.hasAttribute("data-final")) { if (ui.pt) closeFinal(); else { ui.pt = { quality: "high", size: "hd", denoise: true, phase: "setup" }; renderPt(); } renderChips(); return; }
  if (b.hasAttribute("data-shot")) { b.disabled = true; exportImage().catch(() => alertBar("ما قدرتش أحفظ الصورة.")).finally(() => { b.disabled = false; }); return; }
  if (b.hasAttribute("data-move")) { ui.moveMode = !ui.moveMode; renderMoveBar(); renderChips(); return; }
  if (b.hasAttribute("data-autolay")) { for (const x of state.project.units) delete x.pos; save(); render(true); return; }
  if (d.mv || b.hasAttribute("data-rot")) {
    const poses = projectPoses(state.project);
    const L = poses.get(u.id);
    if (!L) return;
    const box = localBox(R(u));
    if (d.mv && L.wall) {
      const seg = roomSegs(state.project).find((g) => g.id === L.wall);
      u.pos = { wall: L.wall, s: Math.max(0, Math.min((seg?.L ?? 1e9) - (box.x1 - box.x0), L.s + +d.mv)) };
    } else if (b.hasAttribute("data-rot")) {
      // turn about the unit's centre and stand free
      const c = Room.centerOf(L, box);
      const rot = (L.rot || 0) - ((+d.rot || 90) * Math.PI) / 180;
      const pose = Room.snapPose([], box, c, rot, [], rowOf(u, R(u)));
      u.pos = { x: pose.x, z: pose.z, rot };
    }
    save();
    renderChips();
    view.update();
    if (ui.planOn) plan.render();
    return;
  }
  if (d.step) {
    const f = u.kind === "panel" ? Schema.SPECIAL[R(u).params.template]?.fields.find((x) => x[0] === d.step) : null;
    setParams(u, (p) => { let v = (+getPath(p, d.step) || 0) + +d.d; if (f && f[4] != null) v = Math.max(f[4], Math.min(f[5], v)); if (u.kind === "kitchen") v = Math.max(0, v); setPath(p, d.step, v); });
  } else if (d.cyc) setParams(u, (p) => setPath(p, d.cyc, nextKey(TABLES[d.table], getPath(p, d.cyc))));
  else if (d.pcyc) { const f = Schema.SPECIAL[R(u).params.template].fields.find((x) => x[0] === d.pcyc); setParams(u, (p) => setPath(p, d.pcyc, nextKey(f[3], getPath(p, d.pcyc)))); }
  else if (d.toggle) setParams(u, (p) => setPath(p, d.toggle, !getPath(p, d.toggle)));
  else if (d.dsec) setParams(u, (p) => {
    if (+d.dsec > 0 && p.sections.length < D.MAX_SECTIONS) { const last = clone(p.sections[p.sections.length - 1]); last.kind = "normal"; last.width = "auto"; p.sections.push(last); p.width += 50; }
    else if (+d.dsec < 0 && p.sections.length > 1) { p.sections.pop(); p.width = Math.max(40, p.width - 50); }
  });
  else if (d.dcc) { const [si, ci] = d.dcc.split(".").map(Number); setParams(u, (p) => { const c = p.sections[si].compartments[ci]; c.content = nextKey(D.CONTENTS, c.content); }); }
  else if (d.dcd) { const [si, ci] = d.dcd.split(".").map(Number); setParams(u, (p) => { const c = p.sections[si].compartments[ci]; c.door = nextKey(D.DOORS, c.door); }); }
  else if (d.zt) setParams(u, (p) => { const z = p.fronts[+d.zt]; z.type = ZTYPES[(ZTYPES.indexOf(z.type) + 1) % 4]; });
  else if (d.zc) setParams(u, (p) => { const z = p.fronts[+d.zc]; z.count = Math.max(1, Math.min(z.type === "drawers" ? 6 : 2, z.count + +d.d)); });
  else if (d.zs) setParams(u, (p) => { const z = p.fronts[+d.zs]; z.shelves = Math.max(0, Math.min(12, z.shelves + +d.d)); });
});

// ------------------------------------------------------------------ properties
const numF = (path, label, v, step = 0.5) => `<label class="f"><span>${esc(label)}</span><input type="number" inputmode="decimal" step="${step}" data-num="${path}" value="${v ?? ""}"></label>`;
const autoF = (path, label, v) => `<label class="f"><span>${esc(label)}</span><input inputmode="decimal" placeholder="تلقائي" data-auto="${path}" value="${v === "auto" || v == null ? "" : v}"></label>`;
const selF = (path, label, opts, v) => `<label class="f"><span>${esc(label)}</span><select data-sel="${path}">${Object.entries(opts).map(([k, t]) => `<option value="${k}" ${k === String(v) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
const textF = (path, label, v, ph = "") => `<label class="f"><span>${esc(label)}</span><input data-text="${path}" placeholder="${esc(ph)}" value="${esc(v ?? "")}"></label>`;
const boolF = (path, label, v) => `<label class="f b"><input type="checkbox" data-bool="${path}" ${v ? "checked" : ""}><span>${esc(label)}</span></label>`;

/** drawing by numbers: type the next wall's length and pick its direction */
function drawProps() {
  const pts = ui.draft || [];
  const dirs = [["→", 0], ["↘", 45], ["↓", 90], ["↙", 135], ["←", 180], ["↖", 225], ["↑", 270], ["↗", 315]];
  return `<div class="ph"><h2 class="uname">رسم الحيطان</h2></div>
    <p class="hint">${pts.length ? `حطيت ${pts.length} ${pts.length === 1 ? "نقطة" : "نقط"}. اكتب طول الحيطة الجاية واختار اتجاهها، أو دوس على المسقط.` : "دوس على المسقط عشان تحط أول ركن، أو ابدأ من النص بالأرقام."}</p>
    <details open><summary>الحيطة الجاية بالمقاس</summary><div class="grid2"><label class="f"><span>الطول (سم)</span><input id="drawLen" type="number" inputmode="decimal" value="${ui.drawLen || 300}"></label></div>
    <div class="dirgrid">${dirs.map(([t, a]) => `<button class="ghost2" data-drawdir="${a}" aria-label="اتجاه ${a} درجة">${t}</button>`).join("")}</div>
    <p class="hint">المقاس من الوش الداخلي للحيطة. لما ترجع لأول نقطة الأوضة بتتقفل لوحدها.</p></details>`;
}
/** editor for a finish spec (wall, band or floor); attr = data attribute prefix */
function finishEditor(spec, attr, fallback, finishes = Mat.FINISHES) {
  const f = spec.finish || "paint";
  const mats = Mat.all();
  let h = `<div class="grid2"><label class="f"><span>التشطيب</span><select data-${attr}="finish">${Object.entries(finishes).map(([k, t]) => `<option value="${k}" ${k === f ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
  if (f !== "photo") h += `<label class="f"><span>اللون</span><input type="color" data-${attr}="color" value="${spec.color || fallback}"></label>`;
  if (f === "tile") h += `<label class="f"><span>مقاس البلاطة (سم)</span><input type="number" inputmode="decimal" data-${attr}="size" value="${spec.size || 60}"></label>`;
  if (f === "wood") h += `<label class="f"><span>طول اللوح (سم)</span><input type="number" inputmode="decimal" data-${attr}="size" value="${spec.size || 120}"></label>`;
  if (f === "photo") h += mats.length ? `<label class="f"><span>الخامة</span><select data-${attr}="mat"><option value="">— اختار —</option>${mats.map((m) => `<option value="${m.id}" ${m.id === spec.mat ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>` : `<p class="hint full">اعمل خامة من صورة الأول من أي وحدة (الخامات ← خامة جديدة من صورة).</p>`;
  h += `</div>`;
  if (f === "paint") h += `<div class="paints">${Mat.PAINTS.map((c) => `<button style="background:${c}" data-${attr}col="${c}" aria-label="${c}"></button>`).join("")}</div>`;
  return h;
}
function roomOverview() {
  const room = state.project.room;
  const segs = Room.segments(room);
  const per = segs.reduce((a, g) => a + g.L, 0);
  let area = 0;
  if (room.closed) { const p = room.pts; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; area += p[i][0] * q[1] - q[0] * p[i][1]; } area = Math.abs(area) / 2 / 10000; }
  return `<div class="ph"><h2 class="uname">الأوضة</h2></div>
    <div class="kv"><span>الحيطان</span><b>${segs.length}</b><span>المحيط</span><b>${n1(per / 100)} م</b>${room.closed ? `<span>المساحة</span><b>${n1(area)} م²</b>` : ""}
    <span>أبواب / شبابيك</span><b>${(room.openings || []).length}</b><span>نقط كهربا وسباكة</span><b>${(room.points || []).length}</b></div>
    <p class="hint">دوس على أي حيطة عشان تعدّلها، أو على وحدة عشان تختارها.</p>
    <details open><summary>كل الحيطان</summary>${finishEditor(room.wallAll || {}, "rall", "#f3f1ea")}<button class="add" data-rallapply>طبّق على كل الحيطان</button></details>
    ${room.closed ? `<details open><summary>الأرضية</summary>${finishEditor(room.floor || { finish: "tile", color: "#d9d4c8", size: 60 }, "rfl", "#d9d4c8", { tile: "بورسلين / سيراميك", wood: "باركيه خشب", paint: "لون سادة", photo: "خامة من صورة" })}</details>` : `<p class="hint">الأرضية بتتحدد لما الأوضة تبقى مقفولة.</p>`}`;
}
function roomProps() {
  const room = state.project.room, sel = ui.planSel;
  const segs = Room.segments(room);
  const rf = (k, label, v, step = 1) => `<label class="f"><span>${esc(label)}</span><input type="number" inputmode="decimal" step="${step}" data-rw="${k}" value="${v ?? ""}"></label>`;
  if (sel.kind === "wall") {
    const k = segs.findIndex((g) => g.id === sel.id), sg = segs[k];
    if (!sg) return "";
    const ops = (room.openings || []).filter((o) => o.wall === sg.id);
    return `<div class="ph"><h2 class="uname">حيطة ${k + 1}</h2><div class="pa"><button data-rwdel class="danger" title="امسح الحيطة" aria-label="امسح الحيطة">${ICON.trash}</button></div></div>
      <p class="tplname">المقاسات من الوش الداخلي — الحيطة اللي بعدها بتتحرك معاها</p>
      <details open><summary>المقاسات</summary><div class="grid3">${rf("L", "الطول", r1(sg.L))}${rf("t", "السمك", sg.t)}${rf("h", "الارتفاع", sg.h)}</div>
      <div class="bools"><label class="f b"><input type="checkbox" data-rwflip ${sg.wall.flip ? "checked" : ""}><span>اقلب ناحية الأوضة</span></label></div>
      <div class="grid2"><button class="add" data-rwsplit>قسّم الحيطة نصين</button></div></details>
      <details open><summary>اللون والتشطيب</summary>${finishEditor(sg.wall, "rwf", "#f3f1ea")}<button class="add" data-rwall>طبّق التشطيب ده على كل الحيطان</button></details>
      <details ${sg.wall.band?.on ? "open" : ""}><summary>تكسية جزء من الحيطة</summary><div class="bools"><label class="f b"><input type="checkbox" data-rwb="on" ${sg.wall.band?.on ? "checked" : ""}><span>فيه تكسية (زي اللي بين الكونتر والعلوي)</span></label></div>
        ${sg.wall.band?.on ? `<div class="grid2"><label class="f"><span>من ارتفاع</span><input type="number" inputmode="decimal" data-rwb="z0" value="${sg.wall.band.z0 ?? 90}"></label><label class="f"><span>لحد ارتفاع</span><input type="number" inputmode="decimal" data-rwb="z1" value="${sg.wall.band.z1 ?? 145}"></label></div>${finishEditor(sg.wall.band, "rwb", "#e7e2d6")}` : ""}</details>
      <details open><summary>الأبواب والشبابيك (${ops.length})</summary>${ops.map((o) => `<button class="mrow" data-selopen="${o.id}"><span><b>${o.kind === "door" ? "باب" : "شباك"} ${n1(o.w)} × ${n1(o.h)}</b><small>على بعد ${n1(o.at)} سم من أول الحيطة</small></span>${ICON.cycle}</button>`).join("")}
      <div class="grid2"><button class="add" data-roomop="door">${ICON.plus}باب</button><button class="add" data-roomop="window">${ICON.plus}شباك</button></div></details>`;
  }
  const nf = (k, label, v) => `<label class="f"><span>${esc(label)}</span><input type="number" inputmode="decimal" step="1" data-rp="${k}" value="${v ?? ""}"></label>`;
  if (sel.kind === "pt") {
    const pt = (room.points || []).find((x) => x.id === sel.id);
    if (!pt) return "";
    const k = Room.MEP_KINDS[pt.kind];
    const kinds = Object.fromEntries(Object.entries(Room.MEP_KINDS).map(([key, v]) => [key, `${Room.MEP_SYS[v[1]][0]} — ${v[0]}`]));
    const wi = segs.findIndex((g) => g.id === pt.wall);
    return `<div class="ph"><h2 class="uname">${esc(k[0])}</h2><div class="pa"><button data-rpdel class="danger" title="امسح" aria-label="امسح">${ICON.trash}</button></div></div>
      <p class="tplname">${esc(Room.MEP_SYS[k[1]][0])} · على حيطة ${wi + 1}</p>
      <details open><summary>المكان</summary><div class="grid2">${selF("__k", "النوع", kinds, pt.kind).replace('data-sel="__k"', 'data-rp="kind"')}${nf("z", "الارتفاع من الأرض", pt.z)}${nf("at", "البعد عن أول الحيطة", pt.at)}</div>
      <p class="hint">اسحب النقطة على الحيطة في المسقط، أو شوفها في "واجهة الحيطة".</p></details>`;
  }
  if (sel.kind === "col") {
    const c = (room.columns || []).find((x) => x.id === sel.id);
    if (!c) return "";
    return `<div class="ph"><h2 class="uname">عمود</h2><div class="pa"><button data-rcdel class="danger" title="امسح" aria-label="امسح">${ICON.trash}</button></div></div>
      <details open><summary>المقاسات</summary><div class="grid2">${nf("w", "العرض", c.w).replace("data-rp", "data-rc")}${nf("d", "العمق", c.d).replace("data-rp", "data-rc")}${nf("x", "مكانه X", c.x).replace("data-rp", "data-rc")}${nf("z", "مكانه Y", c.z).replace("data-rp", "data-rc")}</div>
      <p class="hint">لو العمود لازق في حيطة، الوحدات مش هتتحط قدامه في الرصّ التلقائي.</p></details>`;
  }
  const o = (room.openings || []).find((x) => x.id === sel.id);
  if (!o) return "";
  const of = (k, label, v) => `<label class="f"><span>${esc(label)}</span><input type="number" inputmode="decimal" step="1" data-ro="${k}" value="${v ?? ""}"></label>`;
  return `<div class="ph"><h2 class="uname">${o.kind === "door" ? "باب" : "شباك"}</h2><div class="pa"><button data-rodel class="danger" title="امسح" aria-label="امسح">${ICON.trash}</button></div></div>
    <details open><summary>المقاسات</summary><div class="grid2">${selF("__kind", "النوع", { door: "باب", window: "شباك" }, o.kind).replace('data-sel="__kind"', 'data-ro="kind"')}
    ${of("w", "العرض", o.w)}${of("h", "الارتفاع", o.h)}${o.kind === "window" ? of("sill", "ارتفاع الجلسة من الأرض", o.sill) : ""}${of("at", "البعد عن أول الحيطة", r1(o.at))}</div>
    <p class="hint">تقدر تسحبه على الحيطة في المسقط. الوحدات السفلية مش بتتحط قدام الأبواب، والعلوية مش بتتحط قدام الشبابيك.</p></details>`;
}
const r1 = Room.r1;
function renderProps() {
  const u = selUnit();
  const el = $("#props");
  if (ui.planOn && ui.planTool === "draw") { el.innerHTML = drawProps(); return; }
  if (ui.planOn && state.project.room && ["wall", "open", "pt", "col"].includes(ui.planSel?.kind)) { el.innerHTML = roomProps(); return; }
  if (ui.planOn && state.project.room && !ui.planSel) { el.innerHTML = roomOverview(); return; }
  if (!u) { el.innerHTML = `<div class="emptyp"><h2>ابدأ بوحدة</h2><p class="hint">افتح المكتبة واختار تصميم جاهز أو قالب فاضي.</p></div>`; return; }
  const r = R(u);
  const p = r.params;
  let h = `<div class="ph"><input id="unitName" class="uname" value="${esc(u.name)}" aria-label="اسم الوحدة">
    <div class="pa"><button data-dup title="نسخة" aria-label="نسخة">${ICON.copy}</button><button data-del class="danger" title="حذف" aria-label="حذف">${ICON.trash}</button></div></div>
    <div class="tplname"><span class="ucode">${esc(unitCode(u))}</span>${esc(r.label || (u.kind === "dressing" ? "دريسنج" : u.kind === "kitchen" ? "وحدة مطبخ" : ""))}</div>`;
  if (r.ok) h += `<div class="stats"><div><b>${r.pieces}</b><span>قطعة</span></div><div><b>${r.banding}</b><span>م شريط</span></div><div><b>${r.doors}</b><span>ضلفة</span></div><div><b>${r.drawers}</b><span>درج</span></div></div>`;
  if (ui.asm?.id === u.id) { el.innerHTML = asmProps(u); return; }
  if (r.ok) h += summaryHtml(u);
  h += u.kind === "dressing" ? dressingProps(p) : u.kind === "kitchen" ? kitchenProps(p) : panelProps(p, r);
  h += `<details open><summary>الخامات</summary><div class="mats">`;
  const keys = u.kind === "dressing" ? Object.keys(D.MATERIAL_KEYS) : u.kind === "kitchen" ? Object.keys(KU.K_MATS) : Object.keys(PANEL_MATS);
  const used = new Set([...r.parts.map((x) => x.material), ...(r.meshes || []).map((m) => m.mat)]);
  for (const k of keys) {
    if (r.ok && !used.has(k) && !(k === "front" && used.has("accent"))) continue;
    if (u.kind === "dressing" && ["rail", "handle", "handle_profile", "plinth_leg", "banding"].includes(k)) continue;
    const label = u.kind === "dressing" ? D.MATERIAL_KEYS[k].label : u.kind === "kitchen" ? KU.K_MATS[k][0] : PANEL_MATS[k];
    h += `<button class="mrow" data-mat="${k}"><i style="background:${r.colors?.[k] || "#ccc"}"></i><span><b>${esc(label)}</b><small>${esc(r.names?.[k] || "")}</small></span>${ICON.cycle}</button>`;
  }
  el.innerHTML = h + `</div></details>`;
}

function panelProps(p, r) {
  const tpl = p.template;
  const spec = Schema.SPECIAL[tpl];
  const hide = spec?.hide || [];
  let h = `<details open><summary>المقاسات</summary><div class="grid3">`;
  if (!hide.includes("size") && tpl !== "free") {
    h += numF("width", "العرض", p.width) + numF("height", "الارتفاع", p.height);
    if (!hide.includes("depth")) h += numF("depth", "العمق", p.depth);
  } else h += `<p class="hint full">المقاسات بتتحسب من الإعدادات: ${n1(p.width)} × ${n1(p.height)} × ${n1(p.depth)} سم</p>`;
  h += `</div><div class="grid2">` + selF("environment", "البيئة", Catalog.ENVIRONMENTS, p.environment);
  if (!TableSpec.isTable(tpl)) h += selF("mount", "التركيب", Schema.MOUNTS, p.mount) + selF("handle", "المقبض", Schema.HANDLES, p.handle);
  h += numF("thickness", "سمك الخشب", p.thickness) + `</div></details>`;
  if (spec) {
    h += `<details open><summary>إعدادات ${esc(Schema.TEMPLATES[tpl].label)}</summary><div class="grid2">`;
    for (const [path, label, type, choices] of spec.fields) {
      const v = getPath(p, path);
      if (type === "num" || type === "int") h += numF(path, label, v);
      else if (type === "choice") h += selF(path, label, choices, v);
    }
    h += `</div><div class="bools">`;
    for (const [path, label, type] of spec.fields) if (type === "bool") h += boolF(path, label, getPath(p, path));
    h += `</div></details>`;
  }
  if (!hide.includes("fronts")) {
    h += `<details open><summary>الواجهة (من تحت لفوق)</summary>`;
    (p.fronts || []).forEach((z, i) => {
      h += `<div class="zone-ed"><div class="zh"><b>جزء ${i + 1}</b><button data-zdel="${i}" class="danger sm" aria-label="شيل الجزء">${ICON.trash}</button></div><div class="grid2">
        ${selF(`fronts.${i}.type`, "النوع", Schema.FRONT_TYPES, z.type)}${autoF(`fronts.${i}.height`, "الارتفاع", z.height)}
        ${numF(`fronts.${i}.count`, "العدد", z.count, 1)}${numF(`fronts.${i}.shelves`, "الأرفف", z.shelves, 1)}
        ${selF(`fronts.${i}.hinge`, "المفصلة", { left: "شمال", right: "يمين" }, z.hinge)}${boolF(`fronts.${i}.led`, "ليد في الخانة", z.led)}</div></div>`;
    });
    h += `<button class="add" data-zadd>${ICON.plus}ضيف جزء</button></details>`;
  }
  return h + panelAdvanced(p, h);
}
/** the panel engine's construction settings (same keys as the plugin's panel dialog) */
function panelAdvanced(p, shown) {
  const has = (k) => getPath(p, k) !== undefined && !shown.includes(`"${k}"`);
  const N = (k, l, st = 0.1) => (has(k) ? numF(k, l, getPath(p, k), st) : "");
  const B = (k, l) => (has(k) ? boolF(k, l, getPath(p, k)) : "");
  const S = (k, l, o) => (has(k) ? selF(k, l, o, getPath(p, k)) : "");
  const sec = (t, grid, bools = "") => (grid.trim() || bools.trim() ? `<h4 class="advh">${t}</h4>${grid.trim() ? `<div class="grid2">${grid}</div>` : ""}${bools.trim() ? `<div class="bools">${bools}</div>` : ""}` : "");
  let h = `<details><summary>إعدادات متقدمة</summary><p class="hint">مقاسات التصنيع — سيبها زي ما هي لو مش متأكد.</p>`;
  h += sec("الهيكل", N("front_thickness", "سمك الضلف") + S("top", "الرأس", Schema.TOPS) + (getPath(p, "top") === "rails" ? N("rail_width", "عرض شريط الرأس", 0.5) : "") + N("hinge_edge", "بعد المفصلة عن الطرف"), B("edge_banding", "شريط حواف") + B("led_under", "ليد تحت الوحدة") + B("siphon_cut", "فتحة سيفون"));
  h += sec("الظهر", (getPath(p, "back.enabled") ? N("back.thickness", "سمك الظهر") + N("back.groove_depth", "عمق المفحار") + N("back.inset", "بعد الظهر عن الورا") : ""), B("back.enabled", "ظهر"));
  h += sec("الضلف", N("front_gap", "الفاصل بين الضلف") + S("front_style", "شكل الضلفة", Schema.FRONT_STYLES));
  h += sec("السكلو", N("plinth.height", "ارتفاع السكلو", 0.5) + N("plinth.setback", "رجوع السكلو"));
  h += sec("الأدراج", N("drawer.box_thickness", "سمك الصندوق") + N("drawer.bottom_thickness", "سمك القاعدة") + N("drawer.slide_clearance", "خلوص المجرى") + N("drawer.groove_depth", "دخول القاعدة"));
  h += sec("الأليتا (التجميع)", getPath(p, "joints.enabled") ? N("joints.hole_d", "قطر الدوبل") + N("joints.edge_distance", "البعد عن الحرف") + N("joints.spacing", "المسافة بين الأخرام") + N("joints.face_depth", "العمق في الوش") + N("joints.edge_depth", "العمق في الحرف") + N("joints.cam_d", "قطر الكام") + N("joints.cam_depth", "عمق الكام") : "", B("joints.enabled", "أخرام الأليتا والكام") + B("joints.middle_set_over", "طقم في النص للألواح الطويلة"));
  return h + "</details>";
}

function kitchenProps(p) {
  const f = ([path, label, type, choices]) => (type === "choice" ? selF(path, label, choices, getPath(p, path) ?? "") : type === "bool" ? boolF(path, label, getPath(p, path)) : type === "text" ? textF(path, label, getPath(p, path)) : numF(path, label, getPath(p, path), type === "int" ? 1 : 0.5));
  const dims = KU.dimsFor(p);
  let h = `<details open><summary>الوحدة</summary><div class="grid2">${selF("unit_category", "النوع", KU.K_CATS, p.unit_category)}${selF("unit_type", "المكان", KU.K_TYPES, p.unit_type)}</div>
    <div class="grid2">${textF("unit_label", "اسم/تعليق للوحدة (بيظهر في الملصقات)", p.unit_label)}</div>
    <div class="grid3">${dims.map(([k, l]) => numF(k, l, p[k])).join("")}</div>
    ${p.unit_type === "wall" ? `<div class="grid2">${numF("wall_mount_height", "التعليق من الأرض", p.wall_mount_height)}</div>` : ""}</details>`;
  const extra = KU.extraFields(p);
  if (extra.length) {
    h += `<details open><summary>إعدادات ${esc(KU.K_CATS[p.unit_category] || "")}</summary><div class="grid2">${extra.filter((x) => x[2] !== "bool").map(f).join("")}</div>
      <div class="bools">${extra.filter((x) => x[2] === "bool").map(f).join("")}</div></details>`;
  }
  const glassy = /glass/.test(p.door_type || "") || p.side_glass_door && p.side_glass_door !== "none";
  const drawersOn = ["drawers", "drawer_top_two_doors_bottom"].includes(p.door_type) || p.oven_bottom_front_type === "drawers";
  const singles = ["single", "single_glass", "single_glass_metal"];
  h += `<details open><summary>الواجهة</summary><div class="grid2">${selF("door_type", "الضلف", KU.K_DOORS, p.door_type)}${selF("door_position", "التركيب", KU.K_POS, p.door_position)}
    ${singles.includes(p.door_type) ? selF("single_door_hinge", "المفصلة", KU.K_HINGE, p.single_door_hinge) : ""}
    ${["drawers", "drawer_top_two_doors_bottom"].includes(p.door_type) || p.oven_bottom_front_type === "drawers" ? numF("drawer_count", "عدد الأدراج", p.drawer_count, 1) : ""}
    ${selF("kud_handles.type", "المقبض", KU.K_HANDLES, p.kud_handles?.type || "none")}${numF("door_handle_recess", "تخانة مقبض بلت إن", p.door_handle_recess)}</div>
    <div class="bools">${boolF("include_drawer_boxes", "صناديق الأدراج", p.include_drawer_boxes)}${boolF("include_hinge_cups", "كبب المفصلات", p.include_hinge_cups)}</div></details>`;
  h += `<details><summary>تفاصيل الضلف</summary><div class="grid2">${selF("door_finish", "التشطيب", KU.K_FINISH, p.door_finish)}${selF("opening_mechanism", "طريقة الفتح (الهاردوير)", KU.K_OPENING, p.opening_mechanism || "hinges")}
    ${p.door_position === "overlay" ? numF("door_gap_overlay", "خلوص الضلفة الخارجية", p.door_gap_overlay, 0.05) : numF("door_gap_inset", "خلوص الضلفة الداخلية", p.door_gap_inset, 0.05)}
    ${numF("door_bottom_extension", "نزول الضلفة لتحت (بدل المقبض)", p.door_bottom_extension, 0.5)}
    ${p.door_type === "drawer_top_two_doors_bottom" ? numF("top_drawer_height", "ارتفاع الدرج العلوي", p.top_drawer_height) : ""}
    ${selF("side_glass_door", "جنب زجاج بفريم", KU.K_SIDE_GLASS, p.side_glass_door || "none")}
    ${glassy ? numF("glass_frame_width", "عرض فريم الضلفة", p.glass_frame_width, 0.5) + numF("glass_thickness", "سمك الزجاج", p.glass_thickness, 0.1) : ""}</div></details>`;
  if (drawersOn) {
    const n = Math.max(1, Math.min(8, +p.drawer_count || 1));
    let dr = "";
    for (let i = 1; i <= n; i++) dr += `<div class="grid2">${numF(`drawer${i}_height`, `ارتفاع درج ${i} (0 = تلقائي)`, p[`drawer${i}_height`])}${selF(`drawer_insert_${i}`, `تقسيمة درج ${i}`, KU.K_INSERT, p[`drawer_insert_${i}`] || "none")}</div>
      ${p[`drawer_insert_${i}`] === "custom" ? `<div class="grid2">${textF(`drawer_insert_v_${i}`, "فواصل رأسية (سم من الشمال)", p[`drawer_insert_v_${i}`], "مثلاً 20, 45")}${textF(`drawer_insert_h_${i}`, "فواصل أفقية (سم من قدام)", p[`drawer_insert_h_${i}`], "مثلاً 15")}</div>` : ""}`;
    h += `<details><summary>الأدراج بالتفصيل</summary><div class="grid2">${numF("drawer_gap", "المسافة بين الأدراج", p.drawer_gap, 0.1)}${numF("drawer_slide_base", "فتح أول درج (للعرض)", p.drawer_slide_base)}</div>${dr}
      <div class="grid2">${numF("drawer_insert_height", "ارتفاع الفواصل", p.drawer_insert_height, 0.5)}${numF("drawer_insert_thickness", "سمك الفواصل", p.drawer_insert_thickness, 0.1)}${numF("drawer_insert_divider_count", "عدد الفواصل المستقيمة", p.drawer_insert_divider_count, 1)}</div>
      <p class="hint">سيب الارتفاع 0 والأدراج هتتقسم بالتساوي على المساحة الباقية.</p></details>`;
  }
  const customShelves = String(p.shelf_positions || "").trim() !== "";
  h += `<details open><summary>من جوه</summary><div class="grid2">${p.include_shelves && !customShelves ? numF("shelf_count", "عدد الأرفف", p.shelf_count, 1) : ""}${p.include_vertical_dividers ? numF("vertical_divider_count", "عدد القواطيع", p.vertical_divider_count, 1) : ""}</div>
    ${p.include_shelves ? `<div class="grid2">${textF("shelf_positions", "ارتفاعات الأرفف (سم، بفاصلة)", p.shelf_positions, "فاضي = بالتساوي · مثلاً 20, 45")}</div>
      <p class="hint">كل رقم = من أرضية الوحدة من جوه لحد تحت الرف (مكان الفرش). لو كتبت أرقام، عدد الأرفف بيبقى عددها.</p>` : ""}
    <div class="bools">${boolF("include_shelves", "أرفف", p.include_shelves)}${boolF("include_vertical_dividers", "قواطيع رأسية", p.include_vertical_dividers)}${boolF("include_led_marker", "مجرى ليد في الجنب", p.include_led_marker)}${boolF("assembly_shelves_fixed", "أرفف ثابتة بأليتا", p.assembly_shelves_fixed)}</div></details>`;
  h += `<details><summary>الهيكل والتجميع</summary><div class="grid2">${numF("panel_thickness", "سمك الخشب", p.panel_thickness, 0.1)}${numF("back_panel_thickness", "سمك الظهر", p.back_panel_thickness, 0.1)}
    ${numF("back_groove_depth", "دخول الظهر في المفحار", p.back_groove_depth, 0.1)}${numF("back_rear_offset", "بعد الظهر عن الآخر", p.back_rear_offset, 0.1)}${selF("top_style", "الرأس", KU.K_TOP, p.top_style)}
    ${p.include_toe_kick ? numF("toe_kick_height", "ارتفاع السكلو", p.toe_kick_height) + numF("toe_kick_setback", "رجوع السكلو", p.toe_kick_setback) + selF("toe_kick_style", "شكل السكلو", KU.K_KICK, p.toe_kick_style)
      + (p.toe_kick_style === "segments" ? numF("toe_kick_segment_width", "أقصى عرض لقطعة السكلو", p.toe_kick_segment_width) + numF("toe_kick_segment_gap", "الفاصل بين القطع", p.toe_kick_segment_gap, 0.1) : numF("toe_kick_apron_thickness", "سمك الوزرة", p.toe_kick_apron_thickness, 0.1)) : ""}
    ${p.top_style === "rails" ? numF("top_rail_width", "عرض شريط الرأس", p.top_rail_width) + numF("top_rail_front_inset", "رجوع الشريط الأمامي", p.top_rail_front_inset, 0.1) : ""}
    ${p.include_wall_cleat ? numF("wall_cleat_height", "ارتفاع الكليت", p.wall_cleat_height) : ""}${p.include_bottom_valance ? numF("bottom_valance_height", "ارتفاع وزرة الليد السفلية", p.bottom_valance_height) : ""}</div>
    <div class="bools">${boolF("include_toe_kick", "سكلو", p.include_toe_kick)}${boolF("include_edge_banding", "شريط حواف", p.include_edge_banding)}${boolF("include_assembly_holes", "أليتا (كام لوك)", p.include_assembly_holes)}
    ${boolF("include_end_panel", "تقفيلة نهاية", p.include_end_panel)}${boolF("include_top_valance", "أورزة علوية", p.include_top_valance)}${boolF("include_wall_cleat", "كليت تعليق", p.include_wall_cleat)}${boolF("include_bottom_valance", "وزرة ليد سفلية", p.include_bottom_valance)}</div></details>`;
  if (p.include_assembly_holes) {
    h += `<details open><summary>مقاسات الأليتا (سم)</summary><div class="grid2">${numF("assembly_hole_diameter", "قطر خرم الدوبل", p.assembly_hole_diameter, 0.1)}${numF("assembly_edge_distance", "البعد عن الحرف", p.assembly_edge_distance, 0.1)}
      ${numF("assembly_hole_spacing", "المسافة بين الأخرام", p.assembly_hole_spacing, 0.1)}${numF("assembly_side_depth", "عمق الخرم في الوش", p.assembly_side_depth, 0.1)}
      ${numF("assembly_base_depth", "عمق الخرم في الحرف", p.assembly_base_depth, 0.1)}${numF("assembly_cam_diameter", "قطر قفل الكام", p.assembly_cam_diameter, 0.1)}
      ${numF("assembly_cam_depth", "عمق قفل الكام", p.assembly_cam_depth, 0.1)}</div><p class="hint">الأخرام بتبان في العرض لما تشغّل "شفاف".</p></details>`;
  }
  if (p.include_hinge_cups) {
    h += `<details><summary>كبب المفصلات</summary><div class="grid2">${numF("hinge_cup_diameter", "قطر الكبة", p.hinge_cup_diameter, 0.1)}${numF("hinge_cup_edge_distance", "البعد عن الحرف", p.hinge_cup_edge_distance, 0.1)}${numF("hinge_cup_count", "عدد الكبب", p.hinge_cup_count, 1)}</div></details>`;
  }
  if (p.include_led_marker) h += `<details><summary>مجرى الليد</summary><div class="grid2">${numF("led_marker_offset", "البعد عن الحرف الأمامي", p.led_marker_offset, 0.1)}${numF("led_marker_width", "عرض المجرى", p.led_marker_width, 0.1)}</div></details>`;
  if (p.include_drawer_boxes) {
    h += `<details><summary>صناديق الأدراج</summary><div class="grid2">${numF("drawer_box_depth", "عمق الصندوق", p.drawer_box_depth)}${numF("drawer_box_side_clearance", "خلوص المجرى", p.drawer_box_side_clearance, 0.1)}
      ${numF("drawer_box_panel_thickness", "سمك الألواح", p.drawer_box_panel_thickness, 0.1)}${numF("drawer_box_wall_drop", "نزول الجوانب عن الوش", p.drawer_box_wall_drop, 0.1)}${numF("drawer_box_base_thickness", "سمك القاعدة", p.drawer_box_base_thickness, 0.1)}
      ${numF("drawer_box_base_setback", "نزول الجوانب (مكان القاعدة)", p.drawer_box_base_setback, 0.1)}${numF("drawer_box_base_groove", "دخول القاعدة في المفحار", p.drawer_box_base_groove, 0.1)}${numF("drawer_box_bottom_offset", "رفع الصندوق عن أسفل الوش", p.drawer_box_bottom_offset, 0.1)}</div></details>`;
  }
  if (p.include_top_valance || p.include_end_panel) {
    h += `<details><summary>الأورزة والتقفيلة</summary><div class="grid2">${p.include_top_valance ? numF("top_valance_height", "ارتفاع الأورزة", p.top_valance_height) : ""}
      ${p.include_end_panel ? selF("end_panel_side", "التقفيلة ناحية", KU.K_HINGE, p.end_panel_side) + numF("end_panel_thickness", "سمك التقفيلة", p.end_panel_thickness, 0.1) : ""}</div></details>`;
  }
  if (p.unit_type === "base") {
    h += `<details><summary>الكونتر والحوض</summary><div class="grid2">${numF("countertop_thickness", "سمك الكونتر", p.countertop_thickness, 0.1)}
      ${p.include_sink_cutout ? numF("sink_cutout_width", "عرض فتحة الحوض", p.sink_cutout_width) + numF("sink_cutout_depth", "عمق فتحة الحوض", p.sink_cutout_depth) + numF("sink_cutout_offset_x", "إزاحة عن النص (+يمين)", p.sink_cutout_offset_x) + numF("sink_cutout_offset_y", "البعد عن الحرف الأمامي", p.sink_cutout_offset_y) : ""}
      ${p.include_ptrap_opening ? numF("ptrap_width", "عرض فتحة السيفون", p.ptrap_width) + numF("ptrap_x_offset", "بعدها عن الجنب الشمال", p.ptrap_x_offset) + numF("ptrap_depth", "عمقها من الضهر", p.ptrap_depth) : ""}</div>
      <div class="bools">${boolF("include_sink_cutout", "فتحة حوض", p.include_sink_cutout)}${boolF("include_ptrap_opening", "فتحة سيفون في القاعدة", p.include_ptrap_opening)}</div></details>`;
  }
  return h;
}

/** every numeric dressing setting the panel above doesn't show yet, grouped like the plugin dialog
 * (labels and limits come from the engine's NUMERIC_RULES) + the remaining choice/bool settings */
const ADV_GROUPS = { "": "الهيكل", back: "الظهر", doors: "الضلف", drawers: "الأدراج", shelves: "الأرفف", handles: "المقابض", led: "الليد", plinth: "السكلو", rail: "الشماعة", assembly: "الأليتا (التجميع)" };
const ADV_CHOICES = [
  ["handles.door_orientation", "اتجاه مقبض الضلفة", { vertical: "رأسي", horizontal: "أفقي" }],
  ["handles.drawer_position", "مكان مقبض الدرج", { center: "في النص", top: "فوق" }],
  ["led.install", "تركيب الليد", null, "LED_INSTALLS"], ["led.sensor", "تشغيل الليد", null, "LED_SENSORS"],
  ["plinth.sides", "جوانب السكلو الظاهرة", null, "PLINTH_SIDES"],
];
function advancedFields(p, shown) {
  const groups = {};
  for (const [path, label, min] of D.NUMERIC_RULES) {
    const k = path.join(".");
    if (shown.includes(`data-num="${k}"`) || shown.includes(`data-auto="${k}"`)) continue;
    const g = path.length > 1 ? path[0] : "";
    (groups[g] ??= []).push(numF(k, label, getPath(p, k), min != null && min < 1 ? 0.1 : 0.5));
  }
  for (const [k, label, opts, tbl] of ADV_CHOICES) {
    const o = opts || D[tbl];
    if (!o || shown.includes(`data-sel="${k}"`) || getPath(p, k) === undefined) continue;
    (groups[k.split(".")[0]] ??= []).push(selF(k, label, o, getPath(p, k)));
  }
  let h = `<details><summary>إعدادات متقدمة</summary><p class="hint">كل مقاسات التصنيع زي البلجن بالظبط — سيبها زي ما هي لو مش متأكد.</p>`;
  for (const [g, label] of Object.entries(ADV_GROUPS)) {
    const fl = groups[g];
    if (g === "assembly") {
      h += `<h4 class="advh">${esc(label)}</h4><div class="bools">${boolF("assembly.enabled", "أخرام الأليتا والكام", getPath(p, "assembly.enabled"))}</div>`;
      if (getPath(p, "assembly.enabled") && fl?.length) h += `<div class="grid2">${fl.join("")}</div>`;
      continue;
    }
    if (!fl?.length) continue;
    h += `<h4 class="advh">${esc(label)}</h4><div class="grid2">${fl.join("")}</div>`;
  }
  return h + "</details>";
}

function dressingProps(p) {
  let h = `<details open><summary>المقاسات والنظام</summary><div class="grid3">${numF("width", "العرض", p.width)}${numF("height", "الارتفاع", p.height)}${numF("depth", "العمق", p.depth)}</div><div class="grid2">
    ${numF("panel_t", "سمك الخشب", p.panel_t, 0.1)}${selF("construction", "تركيب الأجناب", D.CONSTRUCTIONS, p.construction)}
    ${selF("doors.mode", "نظام الضلف", D.DOOR_MODES, p.doors.mode)}${selF("doors.style", "شكل الضلف", D.DOOR_STYLES, p.doors.style)}
    ${selF("doors.layout", "توزيع الضلف", D.DOOR_LAYOUTS, p.doors.layout)}${selF("handles.type", "المقبض", D.HANDLE_TYPES, p.handles.type)}
    </div><div class="bools">${boolF("plinth.enabled", "سكلو تحت الدولاب", p.plinth.enabled)}${boolF("edge_banding", "شريط حواف", p.edge_banding)}</div>
    ${p.plinth.enabled ? `<div class="grid2">${selF("plinth.style", "نوع السكلو", D.PLINTH_STYLES, p.plinth.style)}${numF("plinth.height", "ارتفاع السكلو", p.plinth.height)}${selF("plinth.side_apron", "وزرة جانبية", D.PLINTH_SIDES, p.plinth.side_apron)}</div>` : ""}
  </details>`;
  if (p.doors.layout === "whole") {
    h += `<details open><summary>صفوف الضلف (من تحت لفوق)</summary>`;
    p.doors.rows.forEach((row, i) => {
      h += `<div class="zone-ed"><div class="zh"><b>صف ${i + 1}</b><button data-rowdel="${i}" class="danger sm" aria-label="شيل الصف">${ICON.trash}</button></div><div class="grid2">
        ${autoF(`doors.rows.${i}.height`, "ارتفاع الضلفة", row.height)}${selF(`doors.rows.${i}.type`, "النوع", D.ROW_TYPES, row.type)}${numF(`doors.rows.${i}.leaves`, "عدد الضلف", row.leaves, 1)}</div></div>`;
    });
    h += `<button class="add" data-rowadd>${ICON.plus}ضيف صف</button></details>`;
  }
  h += `<details open><summary>الأقسام (من الشمال لليمين)</summary>`;
  p.sections.forEach((s, si) => {
    h += `<div class="sec-ed"><div class="zh"><b>قسم ${si + 1}</b><button data-secdel="${si}" class="danger sm" aria-label="شيل القسم">${ICON.trash}</button></div>
      <div class="grid2">${autoF(`sections.${si}.width`, "عرض القسم", s.width)}${selF(`sections.${si}.kind`, "النوع", D.SECTION_KINDS, s.kind)}
      ${s.kind === "blind" ? selF(`sections.${si}.blind_partition`, "الفاصل", D.BLIND_PARTITIONS, s.blind_partition) : ""}</div>
      ${s.kind === "blind" && s.blind_partition === "post" ? `<div class="bools">${boolF(`sections.${si}.blind_through`, "أرفف متصلة ورا القايم", s.blind_through)}</div>` : ""}
      <div class="comps">`;
    s.compartments.forEach((c, ci) => {
      const countKey = { shelves: "shelf_count", drawers: "drawer_count", dividers: "divider_count" }[c.content];
      h += `<div class="zone-ed"><div class="zh"><b>فراغ ${ci + 1}</b><button data-compdel="${si}.${ci}" class="danger sm" aria-label="شيل الفراغ">${ICON.trash}</button></div><div class="grid2">
        ${autoF(`sections.${si}.compartments.${ci}.height`, "الارتفاع", c.height)}${selF(`sections.${si}.compartments.${ci}.content`, "المحتوى", D.CONTENTS, c.content)}
        ${countKey ? numF(`sections.${si}.compartments.${ci}.${countKey}`, "العدد", c[countKey], 1) : ""}
        ${c.content === "dividers" ? numF(`sections.${si}.compartments.${ci}.sub_shelf_count`, "أرفف بين القواطيع", c.sub_shelf_count, 1) : ""}
        ${p.doors.layout === "per_section" ? selF(`sections.${si}.compartments.${ci}.door`, "الضلفة", D.DOORS, c.door) : ""}
        ${selF(`sections.${si}.compartments.${ci}.led`, "الليد", D.LED_MODES, c.led)}
        ${c.content === "drawers" ? boolF(`sections.${si}.compartments.${ci}.drawer_front`, "الأدراج بوش", c.drawer_front) : ""}</div></div>`;
    });
    h += `</div><button class="add sm2" data-compadd="${si}">${ICON.plus}ضيف فراغ (من فوق)</button></div>`;
  });
  h += `<button class="add" data-secadd>${ICON.plus}ضيف قسم</button></details>`;
  return h + advancedFields(p, h);
}

const props = $("#props");
props.addEventListener("change", (e) => {
  const t = e.target;
  const room = state.project.room;
  const fd = t.dataset;
  if (room && (fd.rwf || fd.rwb || fd.rall || fd.rfl)) {
    const segs = Room.segments(room);
    const sg = ui.planSel?.kind === "wall" ? segs.find((g) => g.id === ui.planSel.id) : null;
    const val = t.type === "checkbox" ? t.checked : t.type === "number" ? +t.value : t.value;
    if (fd.rwf && sg) room.walls[sg.i][fd.rwf] = val;
    else if (fd.rwb && sg) { const w = room.walls[sg.i]; w.band = { z0: 90, z1: 145, finish: "tile", color: "#e7e2d6", size: 30, ...(w.band || {}) }; w.band[fd.rwb] = val; }
    else if (fd.rall) { room.wallAll = { ...(room.wallAll || {}), [fd.rall]: val }; }
    else if (fd.rfl) { room.floor = { finish: "tile", color: "#d9d4c8", size: 60, ...(room.floor || {}), [fd.rfl]: val }; }
    save(); renderProps(); view.update(); plan.render();
    return;
  }
  if (room && (t.dataset.rp || t.dataset.rc)) {
    if (t.dataset.rp) {
      const pt = room.points.find((x) => x.id === ui.planSel.id);
      if (t.dataset.rp === "kind") { pt.kind = t.value; pt.z = Room.MEP_KINDS[t.value][2]; } else pt[t.dataset.rp] = +t.value || 0;
    } else { const c = room.columns.find((x) => x.id === ui.planSel.id); c[t.dataset.rc] = +t.value || 0; }
    save(); renderProps(); plan.render(); view.update();
    return;
  }
  if (room && (t.dataset.rw || t.dataset.ro || t.hasAttribute("data-rwflip"))) {
    const segs = Room.segments(room);
    if (t.dataset.rw) {
      const k = segs.findIndex((g) => g.id === ui.planSel.id), sg = segs[k];
      const v = +t.value;
      if (t.dataset.rw === "L") Room.setWallLength(room, sg.i, v);
      else if (v > 0) room.walls[sg.i][t.dataset.rw] = v;
    } else if (t.hasAttribute("data-rwflip")) { const sg = segs.find((g) => g.id === ui.planSel.id); room.walls[sg.i].flip = t.checked; }
    else {
      const o = room.openings.find((x) => x.id === ui.planSel.id);
      if (t.dataset.ro === "kind") { o.kind = t.value; if (o.kind === "window" && !o.sill) { o.sill = 100; o.h = 120; } if (o.kind === "door") { o.sill = 0; o.h = 210; } }
      else o[t.dataset.ro] = Math.max(0, +t.value || 0);
    }
    save(); renderProps(); plan.render(); view.update();
    return;
  }
  const u = selUnit();
  if (!u || t.id === "unitName") return;
  const d = t.dataset;
  if (d.num) setParams(u, (p) => setPath(p, d.num, t.value === "" ? 0 : +t.value));
  else if (d.auto) setParams(u, (p) => setPath(p, d.auto, t.value.trim() === "" ? "auto" : +t.value));
  else if (d.sel) setParams(u, (p) => setPath(p, d.sel, d.sel === "doors.layout" ? t.value : t.value));
  else if (d.bool) setParams(u, (p) => setPath(p, d.bool, t.checked));
  else if (d.text) setParams(u, (p) => setPath(p, d.text, t.value));
});
props.addEventListener("input", (e) => {
  if (e.target.id !== "unitName") return;
  selUnit().name = e.target.value;
  save();
  renderStrip();
});
props.addEventListener("click", (e) => {
  const rb = e.target.closest("button");
  const room = state.project.room;
  if (rb?.dataset.drawdir != null && ui.planTool === "draw") {
    const L = +$("#drawLen").value || 0;
    if (L <= 0) return;
    ui.drawLen = L;
    const pts = (ui.draft ??= []);
    if (!pts.length) pts.push([0, 0]);
    const a = (+rb.dataset.drawdir * Math.PI) / 180, p0 = pts[pts.length - 1];
    const q = [Math.round((p0[0] + Math.cos(a) * L) * 10) / 10, Math.round((p0[1] + Math.sin(a) * L) * 10) / 10];
    if (pts.length >= 3 && Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) < 1) { finishDraw(true); return; }
    pts.push(q);
    plan.vb = null; plan.fitPts = pts;
    renderChips(); renderProps(); plan.render();
    return;
  }
  if (rb && room && ui.planOn) {
    const d = rb.dataset;
    if (rb.hasAttribute("data-rwdel")) {
      if (d.armed !== "1") { d.armed = "1"; rb.classList.add("armed"); rb.textContent = "أكّد"; return; }
      const sg = Room.segments(room).find((g) => g.id === ui.planSel.id);
      Room.removeWall(room, sg.i);
      if (room.pts.length < 2) delete state.project.room;
      ui.planSel = null; save(); render(true); return;
    }
    const segsNow = Room.segments(room);
    const sgNow = ui.planSel?.kind === "wall" ? segsNow.find((g) => g.id === ui.planSel.id) : null;
    const colKey = Object.keys(d).find((k) => /^(rwf|rwb|rall|rfl)col$/.test(k));
    if (colKey) {
      const pre = colKey.replace(/col$/, ""), c = d[colKey];
      if (pre === "rwf" && sgNow) Object.assign(room.walls[sgNow.i], { finish: "paint", color: c });
      else if (pre === "rwb" && sgNow) room.walls[sgNow.i].band = { ...(room.walls[sgNow.i].band || {}), finish: "paint", color: c };
      else if (pre === "rall") room.wallAll = { ...(room.wallAll || {}), finish: "paint", color: c };
      else if (pre === "rfl") room.floor = { ...(room.floor || {}), finish: "paint", color: c };
      save(); renderProps(); view.update(); plan.render(); return;
    }
    if (rb.hasAttribute("data-rwall") && sgNow) {
      const src = room.walls[sgNow.i];
      for (const w of room.walls) Object.assign(w, { finish: src.finish, color: src.color, size: src.size, mat: src.mat });
      save(); view.update(); alertBar("اتطبّق على كل الحيطان."); return;
    }
    if (rb.hasAttribute("data-rallapply")) {
      const src = room.wallAll || { finish: "paint", color: "#f3f1ea" };
      for (const w of room.walls) Object.assign(w, { finish: src.finish || "paint", color: src.color, size: src.size, mat: src.mat });
      save(); view.update(); alertBar("اتطبّق على كل الحيطان."); return;
    }
    if (rb.hasAttribute("data-rwsplit") && sgNow) {
      const mid = [Room.r1(sgNow.A[0] + sgNow.d[0] * sgNow.L / 2), Room.r1(sgNow.A[1] + sgNow.d[1] * sgNow.L / 2)];
      room.pts.splice(sgNow.i + 1, 0, mid);
      const meta = { ...room.walls[sgNow.i], ...Room.newWallMeta(sgNow.t, sgNow.h) };
      for (const k of ["finish", "color", "size", "mat"]) meta[k] = room.walls[sgNow.i][k];
      room.walls.splice(sgNow.i + 1, 0, meta);
      // openings / points past the middle move to the new wall
      for (const o of [...(room.openings || []), ...(room.points || [])]) if (o.wall === sgNow.id && o.at >= sgNow.L / 2) { o.wall = meta.id; o.at = Room.r1(o.at - sgNow.L / 2); }
      save(); render(); return;
    }
    if (rb.hasAttribute("data-rpdel")) { room.points = room.points.filter((o) => o.id !== ui.planSel.id); ui.planSel = null; save(); render(); return; }
    if (rb.hasAttribute("data-rcdel")) { room.columns = room.columns.filter((o) => o.id !== ui.planSel.id); ui.planSel = null; save(); render(); return; }
    if (rb.hasAttribute("data-rodel")) { room.openings = room.openings.filter((o) => o.id !== ui.planSel.id); ui.planSel = null; save(); render(); return; }
    if (d.roomop) { const o = Room.addOpening(room, ui.planSel.id, d.roomop); if (o) ui.planSel = { kind: "open", id: o.id }; save(); render(); return; }
    if (d.selopen) { ui.planSel = { kind: "open", id: d.selopen }; renderProps(); renderChips(); plan.render(); return; }
  }
  const u = selUnit();
  const b = e.target.closest("button");
  if (!u || !b) return;
  const d = b.dataset;
  if (b.hasAttribute("data-asm")) { ui.asm = { id: u.id, step: 0 }; ui.planOn = false; render(true); return; }
  if (b.hasAttribute("data-asmclose")) { ui.asm = null; render(true); return; }
  if (d.asmgo || d.asmto != null) {
    const n = asmPlan(u).length;
    ui.asm.step = Math.max(0, Math.min(n - 1, d.asmto != null ? +d.asmto : ui.asm.step + +d.asmgo));
    renderProps(); view.update();
    return;
  }
  if (b.hasAttribute("data-dup")) {
    const c = { ...clone(u), id: uid(), name: u.name + " (نسخة)" };
    state.project.units.splice(state.project.units.indexOf(u) + 1, 0, c);
    state.sel = c.id;
    save();
    render(true);
  } else if (b.hasAttribute("data-del")) {
    if (d.armed !== "1") { d.armed = "1"; b.classList.add("armed"); b.textContent = "أكّد الحذف"; return; }
    const i = state.project.units.indexOf(u);
    state.project.units.splice(i, 1);
    state.sel = state.project.units[Math.max(0, i - 1)]?.id ?? null;
    save();
    render(true);
  } else if (d.zdel != null) setParams(u, (p) => p.fronts.splice(+d.zdel, 1));
  else if (b.hasAttribute("data-zadd")) setParams(u, (p) => p.fronts.push({ type: "open", count: 1, height: "auto", shelves: 1, hinge: "left", led: false }));
  else if (d.secdel != null) setParams(u, (p) => { if (p.sections.length > 1) p.sections.splice(+d.secdel, 1); });
  else if (b.hasAttribute("data-secadd")) setParams(u, (p) => { p.sections.push({ width: "auto", kind: "normal", compartments: [DC({ content: "shelves", shelf_count: 4, door: "single_left" })] }); p.width += 50; });
  else if (d.compdel) { const [si, ci] = d.compdel.split(".").map(Number); setParams(u, (p) => { if (p.sections[si].compartments.length > 1) p.sections[si].compartments.splice(ci, 1); }); }
  else if (d.compadd != null) setParams(u, (p) => p.sections[+d.compadd].compartments.push(DC({ height: 40, content: "shelves", shelf_count: 1, door: "continue" })));
  else if (d.rowdel != null) setParams(u, (p) => { if (p.doors.rows.length > 1) p.doors.rows.splice(+d.rowdel, 1); });
  else if (b.hasAttribute("data-rowadd")) setParams(u, (p) => p.doors.rows.push({ height: 40, type: "doors", leaves: 2 }));
  else if (d.mat) { ui.matPick = d.mat; ui.pop = "mat"; renderPop(); }
});

// ------------------------------------------------------------------ popovers (materials, projects)
/** give the selected unit's material role (ui.matPick) a catalogue or custom material ("" = default) */
function applyLib(lib) {
  const key = ui.matPick;
  const u = selUnit();
  ui.pop = null;
  renderPop();
  if (!u) return;
  if (lib && Mat.isCustom(lib)) { const m = Mat.get(lib); if (m) state.project.mats = [...(state.project.mats || []).filter((x) => x.id !== lib), m]; }
  const nm = (l) => (Mat.isCustom(l) ? Mat.get(l)?.name || "خامة" : Catalog.libName(l));
  if (u.kind === "kitchen") {
    u.libs ??= {};
    if (lib) u.libs[key] = lib; else delete u.libs[key];
    setParams(u, (p) => {
      p[KU.K_MATS[key][1]] = lib ? nm(lib) : "";
      if (key === "front") p.door_color = lib ? Catalog.LIB[lib][2] : "#D9C7A3";
    });
  } else if (u.kind === "dressing") {
    u.libs ??= {};
    if (lib) u.libs[key] = lib; else delete u.libs[key];
    setParams(u, (p) => { p.materials[key] = lib ? { name: nm(lib), skm: "" } : { name: "", skm: "" }; });
  } else setParams(u, (p) => { p.materials ??= {}; p.materials[key] = lib ? { lib } : {}; });
}
function renderPop() {
  const pop = $("#pop");
  if (!ui.pop) { pop.hidden = true; return; }
  let h = "";
  if (ui.pop === "mat") {
    const u = selUnit();
    const label = u?.kind === "dressing" ? D.MATERIAL_KEYS[ui.matPick]?.label : u?.kind === "kitchen" ? KU.K_MATS[ui.matPick]?.[0] : PANEL_MATS[ui.matPick];
    h = `<div class="popbox" role="dialog" aria-label="اختار خامة"><div class="libhead"><h2>${esc(label)}</h2><button class="x" data-close aria-label="قفل">×</button></div>`;
    h += `<h3>خاماتي (من الصور)</h3><div class="swgrid">${Mat.all().map((m) => `<span class="swwrap"><button class="swb" data-lib="${m.id}"><i style="background:url('${m.img}') center/cover"></i><span>${esc(m.name)}</span></button><button class="swedit" data-editmat="${m.id}" aria-label="عدّل ${esc(m.name)}">✎</button></span>`).join("")}
      <button class="swb addmat" data-newmat><i>＋</i><span>خامة جديدة من صورة</span></button></div>`;
    for (const [g, test] of LIB_GROUPS) {
      const keys = Object.keys(Catalog.LIB).filter(test);
      h += `<h3>${g}</h3><div class="swgrid">` + keys.map((k) => {
        const [name, , hex, op] = Catalog.LIB[k];
        return `<button class="swb" data-lib="${k}"><i style="background:${hex};opacity:${Math.max(op, 0.5)}"></i><span>${esc(name)}</span></button>`;
      }).join("") + "</div>";
    }
    h += `<button class="add" data-lib="">رجّع الافتراضي</button></div>`;
  } else if (ui.pop === "projects") {
    const online = !!(cloud.db && cloud.me);
    h = `<div class="popbox" role="dialog" aria-label="مشاريعي"><div class="libhead"><h2>مشاريعي</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <label class="f"><span>اسم المشروع الحالي</span><input id="pname" value="${esc(state.project.name)}"></label>
      <p class="hint">${online ? "المشاريع محفوظة أونلاين على حسابك — تفتحها من الآيباد أو الموبايل أو الكمبيوتر." : "الحفظ الأونلاين مش متاح في الفتحة دي — المشروع محفوظ على الجهاز ده بس."}</p>
      <button class="add" data-newproj>${ICON.plus}مشروع جديد</button><div class="plist">`;
    const list = online ? ui.projects : [{ id: state.project.id, name: state.project.name, updatedAt: "" }];
    for (const pr of list) {
      const cur = pr.id === state.project.id;
      h += `<div class="pitem ${cur ? "on" : ""}"><button data-openproj="${pr.id}"><b>${esc(pr.name)}</b><small>${cur ? "مفتوح دلوقتي" : pr.updatedAt ? new Date(pr.updatedAt).toLocaleString("ar-EG") : ""}</small></button>
        ${cur ? "" : `<button class="danger sm" data-delproj="${pr.id}" aria-label="امسح المشروع">${ICON.trash}</button>`}</div>`;
    }
    h += `</div></div>`;
  }
  else if (ui.pop === "newmat") {
    const m = ui.matDraft;
    h = `<div class="popbox" role="dialog" aria-label="خامة من صورة"><div class="libhead"><h2>${m.id && Mat.get(m.id) ? "عدّل الخامة" : "خامة جديدة من صورة"}</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <p class="hint">صوّر اللوح أو الرخام أو القماش من قريب وفي نور كويس (من غير ضل)، أو اختار صورة من الجهاز. الصورة بتتكرر على القطعة بالمقاس اللي تحدده.</p>
      <div class="matedit"><div class="matprev" style="${m.img ? `background-image:url('${m.img}');background-size:${Math.max(8, 260 * 60 / Math.max(5, m.tile))}px;filter:brightness(${1 + m.bright / 100});transform:rotate(0)` : ""}">${m.img ? `<span>عينة ${n1(m.tile)} سم</span>` : "<span>مفيش صورة لسه</span>"}</div>
      <div class="matform"><label class="add filebtn">${ICON.plus}${m.img ? "غيّر الصورة" : "اختار / صوّر"}<input type="file" id="matFile" accept="image/*" hidden></label>
        <label class="f"><span>الاسم (بيظهر في قايمة القطع)</span><input id="mName" value="${esc(m.name)}"></label>
        <label class="f"><span>النوع</span><select id="mKind">${Object.entries(Mat.KINDS).map(([k, t]) => `<option value="${k}" ${k === m.kind ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        <label class="f"><span>مقاس الصورة على الطبيعة: <b id="mTileV">${n1(m.tile)}</b> سم</span><input id="mTile" type="range" min="5" max="300" step="5" value="${m.tile}"></label>
        <label class="f"><span>اتجاه العروق: <b id="mRotV">${m.rot}</b>°</span><input id="mRot" type="range" min="0" max="180" step="15" value="${m.rot}"></label>
        <label class="f"><span>الإضاءة: <b id="mBrightV">${m.bright}</b></span><input id="mBright" type="range" min="-40" max="40" step="5" value="${m.bright}"></label>
        <label class="f"><span>اللمعة: <b id="mGlossV">${m.gloss}</b>%</span><input id="mGloss" type="range" min="0" max="100" step="5" value="${m.gloss}"></label></div></div>
      <div class="btnrow"><button class="primary" data-savemat ${m.img ? "" : "disabled"}>احفظ واستخدمها</button>${m.id && Mat.get(m.id) ? `<button class="ghost2 danger" data-delmat>امسح الخامة</button>` : ""}<button class="ghost2" data-back="mat">رجوع</button></div></div>`;
  }
  else if (ui.pop === "about") {
    const D = DEVELOPER;
    const contact = [
      D.phone && `<a class="ghost2" href="tel:${esc(D.phone.replace(/\s/g, ""))}">📞 ${esc(D.phone)}</a>`,
      (D.whatsapp || D.phone) && `<a class="ghost2" href="https://wa.me/${esc((D.whatsapp || D.phone).replace(/[^0-9]/g, "").replace(/^0/, "20"))}" target="_blank" rel="noopener">واتساب</a>`,
      D.email && `<a class="ghost2" href="mailto:${esc(D.email)}">✉ ${esc(D.email)}</a>`,
      D.site && `<a class="ghost2" href="${esc(D.site)}" target="_blank" rel="noopener">${esc(D.site)}</a>`,
    ].filter(Boolean).join("");
    h = `<div class="popbox about" role="dialog" aria-label="عن التطبيق"><div class="libhead"><h2>عن التطبيق</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <div class="abhead"><span class="mark big">N</span><div><b>NOVERA Studio</b><small>الإصدار ${APP_VERSION}</small></div></div>
      <p>تطبيق لتصميم وتصنيع المطابخ والدريسنج وغرف النوم ووحدات الأثاث من الألواح — من أول رسم الأوضة لحد القص والتجميع في الورشة.</p>
      <ul class="feat">
        <li>وحدات بمحرّك البلجن نفسه (Kitchen Unit Designer) — نفس القطع والمقاسات اللي في سكتش أب بالظبط.</li>
        <li>رسم الحيطان بالمقاسات أو بالإيد أو من مسح الكاميرا، أبواب وشبابيك، ونقط كهربا وسباكة وغاز.</li>
        <li>عرض 3D وريندر، فتح وقفل الضلف، خامات من الصور.</li>
        <li>خطة قص للألواح، أرقام لكل قطعة وملصقات بباركود، ودليل تجميع خطوة بخطوة.</li>
        <li>تصدير Excel وPDF وDXF وصور، وفتح التصميم في سكتش أب.</li>
        <li>عرض سعر للعميل، ومتابعة الورشة بالـQR.</li>
      </ul>
      <h3>المطوّر</h3><p class="dev"><b>${esc(D.name)}</b> — ${esc(D.company)}</p>
      ${contact ? `<div class="btnrow">${contact}</div>` : ""}
      <p class="hint">© ${new Date().getFullYear()} ${esc(D.company)}. كل الحقوق محفوظة. تصميماتك محفوظة على جهازك وعلى حسابك بس.</p></div>`;
  }
  else if (ui.pop === "checks") {
    const list = designChecks();
    h = `<div class="popbox" role="dialog" aria-label="فحص التصميم"><div class="libhead"><h2>فحص التصميم</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <p class="hint">بيراجع التداخل، والخلوص بين الحيطان، والأبواب والشبابيك، ونقط الكهربا والمياه والغاز جنب الوحدات اللي محتاجاها. دوس على أي ملاحظة عشان تروح للوحدة.</p><div class="chklist">${checksHtml(list)}</div></div>`;
  }
  else if (ui.pop === "export") {
    h = `<div class="popbox" role="dialog" aria-label="تصدير"><div class="libhead"><h2>تصدير — ${esc(state.project.name)}</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <p class="hint">كل ملف بيتعمل على الجهاز وتقدر تبعته لأي حد (واتساب، إيميل، Files). أرقام القطع واحدة في كل الملفات.</p><div class="explist">`;
    for (const [id, title, desc] of EXPORTS) h += `<button class="mrow" data-exp="${id}"><span><b>${esc(title)}</b><small class="wrap">${esc(desc)}</small></span><em class="expst" data-st="${id}"></em></button>`;
    h += `</div><div class="grid2"><label class="f"><span>مقاس الملصقات</span><select id="labelFmt2"><option value="a4" ${state.labelFmt === "a4" ? "selected" : ""}>A4 — 21 ملصق في الورقة</option><option value="roll" ${state.labelFmt === "roll" ? "selected" : ""}>رول 60×40 مم</option></select></label>
      <label class="f"><span>فتح نسخة مشروع</span><input type="file" id="impFile" accept=".json,application/json"></label></div></div>`;
  }
  else if (ui.pop === "mep") {
    h = `<div class="popbox" role="dialog" aria-label="نقطة كهربا أو سباكة"><div class="libhead"><h2>ضيف نقطة على الحيطة</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <p class="hint">الارتفاع بيتحط تلقائي من معايير NOVERA وتقدر تغيّره. اسحب النقطة على الحيطة في المسقط.</p>`;
    for (const [sys, [label, col]] of Object.entries(Room.MEP_SYS)) {
      const ks = Object.entries(Room.MEP_KINDS).filter(([, v]) => v[1] === sys);
      if (!ks.length) continue;
      h += `<h3><i class="dot" style="background:${col}"></i>${esc(label)}</h3><div class="mepgrid">${ks.map(([k, v]) => `<button class="swb" data-mepk="${k}"><b>${esc(v[0])}</b><small>${v[2]} سم من الأرض</small></button>`).join("")}</div>`;
    }
    h += `</div>`;
  }
  else if (ui.pop === "room") {
    const k = ui.roomKind || "rect";
    const pr = Room.PRESETS[k];
    h = `<div class="popbox" role="dialog" aria-label="أوضة جاهزة"><div class="libhead"><h2>أوضة جاهزة بالمقاسات</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <p class="hint">المقاسات من جوه (من وش الحيطة لوش الحيطة) بالسنتيمتر — تقدر تعدّل أي حيطة بعد كده أو تسحب أركانها.</p>
      <div class="roomkinds">${Object.entries(Room.PRESETS).map(([key, v]) => `<button class="rk ${key === k ? "on" : ""}" data-rk="${key}">${roomIcon(key)}<span>${esc(v.label)}</span></button>`).join("")}</div>
      <div class="grid2">${pr.fields.map(([f, l, dv]) => `<label class="f"><span>${esc(l)}</span><input type="number" inputmode="decimal" data-rf="${f}" value="${ui.roomDims?.[f] ?? dv}"></label>`).join("")}
      <label class="f"><span>سمك الحيطة</span><input type="number" inputmode="decimal" data-rf="t" value="${ui.roomDims?.t ?? Room.WALL_T}"></label>
      <label class="f"><span>ارتفاع الحيطة</span><input type="number" inputmode="decimal" data-rf="h" value="${ui.roomDims?.h ?? Room.WALL_H}"></label></div>
      ${state.project.room ? `<p class="hint">ده هيستبدل الحيطان الحالية.</p>` : ""}
      <div class="btnrow"><button class="primary" data-mkroom>اعمل الحيطان ورصّ الوحدات</button>${state.project.room ? `<button class="ghost2 danger" data-rmroom>امسح الحيطان</button>` : ""}</div>
      <h3>أو من مسح الأوضة بالكاميرا (LiDAR)</h3>
      <p class="hint">لو عندك آيباد برو أو آيفون برو: امسح الأوضة بأي تطبيق بيصدّر RoomPlan بصيغة JSON، وبعدين افتح الملف هنا — الحيطان والأبواب والشبابيك بتتحط بمقاساتها، وتقدر تصلّح أي مقاس بإيدك بعدها. (في نسخة الـApp Store هيبقى فيه زرار مسح مباشر.)</p>
      <label class="add filebtn">${ICON.plus}افتح ملف مسح (RoomPlan JSON)<input type="file" id="roomScan" accept=".json,application/json" hidden></label></div>`;
  }
  pop.innerHTML = h;
  pop.hidden = false;
}
function roomIcon(k) {
  const P = { line: "M3 6h18", corner: "M4 20V4h16", u: "M4 20V4h16v16", rect: "M4 4h16v16H4z", lroom: "M4 4h16v8h-8v8H4z" }[k];
  return `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><path d="${P}"/></svg>`;
}
$("#pop").addEventListener("input", (e) => {
  if (ui.pop !== "newmat") return;
  const m = ui.matDraft, t = e.target;
  const map = { mName: "name", mKind: "kind", mTile: "tile", mRot: "rot", mBright: "bright", mGloss: "gloss" };
  if (!map[t.id]) return;
  m[map[t.id]] = t.id === "mName" || t.id === "mKind" ? t.value : +t.value;
  const v = $(`#${t.id}V`);
  if (v) v.textContent = t.value;
  const pv = $(".matprev");
  if (pv && m.img) { pv.style.backgroundSize = `${Math.max(8, (260 * 60) / Math.max(5, m.tile))}px`; pv.style.filter = `brightness(${1 + m.bright / 100})`; }
});
$("#pop").addEventListener("change", async (e) => {
  if (e.target.id === "roomScan" && e.target.files?.[0]) {
    try {
      const room = Room.fromRoomPlan(JSON.parse(await e.target.files[0].text()));
      state.project.room = room;
      for (const u of state.project.units) delete u.pos;
      state.whole = true; ui.planOn = true; ui.planSel = null; plan.vb = null; ui.pop = null;
      renderPop(); save(); render(true);
      alertBar(`اتعملت ${room.walls.length} حيطة و${room.openings.length} باب/شباك من المسح — راجع المقاسات.`);
    } catch (err) { alertBar(err?.message?.length < 60 ? err.message : "الملف ده مش مسح RoomPlan."); }
    return;
  }
  if (e.target.id === "matFile" && e.target.files?.[0]) {
    try {
      const r = await Mat.fromFile(e.target.files[0]);
      Object.assign(ui.matDraft, r);
      renderPop();
    } catch { alertBar("الصورة دي مش بتتفتح — جرّب صورة تانية (JPG أو PNG)."); }
    return;
  }
  if (e.target.id === "labelFmt2") { state.labelFmt = e.target.value; save(); }
  if (e.target.id === "impFile" && e.target.files?.[0]) {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      const p = d.project || d;
      if (!Array.isArray(p.units)) throw new Error("bad");
      if (cloud.dirty) await cloudSave();
      state.project = { ...p, id: uid(), name: (p.name || "مشروع") + " (مستورد)" };
      state.sel = state.project.units[0]?.id ?? null;
      ui.pop = null; renderPop(); save(); render(true);
      alertBar("اتفتح المشروع المستورد.");
    } catch { alertBar("الملف ده مش نسخة مشروع من NOVERA Studio."); }
  }
});
$("#pop").addEventListener("input", (e) => {
  if (e.target.id !== "pname") return;
  state.project.name = e.target.value;
  $("#projName").textContent = state.project.name;
  save();
});
$("#pop").addEventListener("click", async (e) => {
  if (e.target.id === "pop" || e.target.closest("[data-close]")) { ui.pop = null; renderPop(); return; }
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (ui.pop === "mat" && (b.hasAttribute("data-newmat") || d.editmat)) {
    const ex = d.editmat ? Mat.get(d.editmat) : null;
    ui.matDraft = ex ? { ...ex } : { id: "c_" + uid(), name: "خامة " + (Mat.all().length + 1), img: "", avg: "#bbbbbb", ...Mat.DEFAULT };
    ui.pop = "newmat"; renderPop(); return;
  }
  if (ui.pop === "newmat") {
    if (d.back) { ui.pop = "mat"; renderPop(); return; }
    if (b.hasAttribute("data-delmat")) {
      const id = ui.matDraft.id;
      state.myMats = state.myMats.filter((x) => x.id !== id);
      for (const u of state.project.units) for (const [k, v] of Object.entries(u.libs || {})) if (v === id) delete u.libs[k];
      Mat.forget(id); save(); ui.pop = "mat"; renderPop(); render(); return;
    }
    if (b.hasAttribute("data-savemat")) {
      const m = { ...ui.matDraft };
      Mat.forget(m.id);
      Mat.register(m);
      state.myMats = [...state.myMats.filter((x) => x.id !== m.id), m];
      state.project.mats = [...(state.project.mats || []).filter((x) => x.id !== m.id), m];
      cache.clear();
      // use it for the role the picker was opened for
      const fake = document.createElement("button");
      fake.dataset.lib = m.id;
      ui.pop = "mat";
      applyLib(m.id);
      return;
    }
    return;
  }
  if (ui.pop === "checks" && d.chkunit) { state.sel = d.chkunit; ui.planSel = ui.planOn ? { kind: "unit", id: d.chkunit } : null; ui.pop = null; renderPop(); save(); render(); return; }
  if (ui.pop === "export" && d.exp) {
    const ex = EXPORTS.find((x) => x[0] === d.exp);
    const st = $(`[data-st="${d.exp}"]`);
    if (!ex || b.disabled) return;
    b.disabled = true;
    st.textContent = "بيجهّز…";
    try {
      const r = await ex[3]();
      st.textContent = r === "declined" ? "اتلغى" : "تم ✓";
    } catch (err) {
      st.textContent = err?.message && err.message.length < 60 ? err.message : "ما كملش";
      console.error(err);
    }
    b.disabled = false;
    return;
  }
  if (ui.pop === "mep" && d.mepk) {
    const pt = Room.addPoint(state.project.room, ui.mepWall, d.mepk);
    if (pt) ui.planSel = { kind: "pt", id: pt.id };
    ui.pop = null; renderPop(); save(); renderChips(); renderProps(); plan.render(); view.update();
    return;
  }
  if (ui.pop === "room") {
    const grab = () => { ui.roomDims = {}; $("#pop").querySelectorAll("[data-rf]").forEach((i) => { ui.roomDims[i.dataset.rf] = +i.value; }); };
    if (d.rk) { grab(); ui.roomKind = d.rk; renderPop(); return; }
    if (b.hasAttribute("data-mkroom")) {
      grab();
      state.project.room = Room.presetRoom(ui.roomKind || "rect", ui.roomDims);
      for (const u of state.project.units) delete u.pos;
      state.whole = true; ui.planSel = null; plan.vb = null; ui.pop = null;
      renderPop(); save(); render(true); return;
    }
    if (b.hasAttribute("data-rmroom")) { delete state.project.room; for (const u of state.project.units) delete u.pos; ui.pop = null; ui.planSel = null; plan.vb = null; renderPop(); save(); render(true); return; }
    return;
  }
  if (d.lib != null && ui.pop === "mat") { applyLib(d.lib); return; }
  if (b.hasAttribute("data-newproj")) {
    if (cloud.dirty) await cloudSave();
    state.project = { id: uid(), name: "مشروع جديد", units: [] };
    state.sel = null;
    state.libOpen = true;
    state.tab = "design";
    ui.pop = null;
    save();
    render(true);
    renderPop();
  } else if (d.openproj && d.openproj !== state.project.id) {
    if (cloud.dirty) await cloudSave();
    const snap = await cloud.db.doc(`data/users/${cloud.me}/p_${d.openproj}`).get();
    if (!snap.exists) return;
    const v = snap.data();
    state.project = { id: d.openproj, name: v.name, units: v.units || [], ...(v.room ? { room: v.room } : {}), mats: v.mats || [] };
    for (const m of state.project.mats) Mat.register(m);
    state.sel = state.project.units[0]?.id ?? null;
    ui.pop = null;
    save();
    render(true);
    renderPop();
  } else if (d.delproj) {
    if (d.armed !== "1") { d.armed = "1"; b.classList.add("armed"); b.textContent = "أكّد"; return; }
    await cloud.db.doc(`data/users/${cloud.me}/p_${d.delproj}`).delete();
    await refreshProjects();
  }
});
async function refreshProjects() {
  if (!cloud.db || !cloud.me) return;
  try {
    const qs = await cloud.db.collection(`data/users/${cloud.me}`).orderBy("updatedAt", "desc").limit(100).get();
    ui.projects = qs.docs.filter((s) => s.id.startsWith("p_")).map((s) => ({ id: s.id.slice(2), name: s.data().name, updatedAt: s.data().updatedAt }));
    if (!ui.projects.find((x) => x.id === state.project.id)) ui.projects.unshift({ id: state.project.id, name: state.project.name, updatedAt: "" });
  } catch { /* keep the old list */ }
  if (ui.pop === "projects") renderPop();
}

// ------------------------------------------------------------------ errors overlay
function renderErrs() {
  const u = selUnit();
  const el = $("#errs");
  if (!u) { el.hidden = true; return; }
  const r = R(u);
  const list = [...(r.ok ? [] : r.errors).map((t) => `<p class="e">${esc(t)}</p>`), ...r.checks.filter((c) => c.level === "error").map((c) => `<p class="e">${esc(c.text)}</p>`),
    ...(r.ok ? r.warnings : []).slice(0, 3).map((t) => `<p class="w">${esc(t)}</p>`)];
  el.hidden = !list.length;
  el.innerHTML = list.join("");
}

// ------------------------------------------------------------------ project layout (all units on the walls)
// Room frame: wall A is the line Y = 0 (room towards -Y), wall B the line X = 0 (room towards +X).
// A unit's own frame is the plugin's: front at y = 0 facing -y, back (wall side) at y = depth;
// corner units (L / diagonal / open / glass display) sit in the A-B corner.
const wholeView = () => (ui.mode === "client" ? !!ui.clientWhole : !!state.whole);
function localBox(r) {
  const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
  const add = (q) => { b.x0 = Math.min(b.x0, q.x0); b.x1 = Math.max(b.x1, q.x1); b.y0 = Math.min(b.y0, q.y0); b.y1 = Math.max(b.y1, q.y1); };
  if (r.meshes) for (const m of r.meshes) { if (m.mat !== "hole") add(m.box); }
  else for (const pt of r.parts) if (pt.box && pt.role !== "hole") add(pt.box);
  return b.x0 > b.x1 ? { x0: 0, x1: 60, y0: 0, y1: 60 } : b;
}
function cornerUnit(u, r) {
  const p = r.params || {};
  return u.kind === "kitchen" && ((p.unit_category === "corner" && p.corner_style !== "blind") || p.unit_category === "corner_glass_display");
}
function rowOf(u, r) {
  if (u.kind !== "kitchen") return TableSpec.isTable?.(r.params?.template) ? "free" : "tall";
  return r.params.unit_type === "wall" ? "upper" : r.params.unit_type === "tall" || ["fridge", "wardrobe", "bedroom_wardrobe"].includes(r.params.unit_category) ? "tall" : "lower";
}
/** where every unit of a project stands (room cm, rotation about the vertical) — see room.js arrange() */
function projectItems(project) {
  return (project?.units || []).map((u) => { const r = R(u); return r.ok ? { id: u.id, box: localBox(r), row: rowOf(u, r), corner: cornerUnit(u, r), pos: u.pos } : null; }).filter(Boolean);
}
function projectPoses(project) { return Room.arrange(project?.room || null, projectItems(project)); }
const roomSegs = (project) => (project?.room ? Room.segments(project.room) : Room.virtualSegments());

// ------------------------------------------------------------------ plan (top view) + wall elevations
const ROW_FILL = { lower: "#cfe3d3", upper: "#e9ddb8", tall: "#b9cdbf", free: "#dcd6ea" };
const plan = {
  vb: null, pointers: new Map(), act: null, hover: null,
  host: () => $("#plan"),
  room: () => state.project.room || null,
  /** cm point under a client point */
  toCm(e) {
    const svg = this.host().querySelector("svg");
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [q.x, q.y];
  },
  fit() {
    const room = this.room();
    const b = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 };
    const grow = (x, z) => { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z); };
    for (const p of room?.pts || []) grow(p[0], p[1]);
    for (const p of ui.draft || []) grow(p[0], p[1]);
    const poses = projectPoses(state.project);
    for (const it of projectItems(state.project)) { const L = poses.get(it.id); if (L) for (const q of Room.footprint(L, it.box)) grow(q[0], q[1]); }
    if (b.x0 > b.x1) { b.x0 = 0; b.x1 = 700; b.z0 = 0; b.z1 = 500; }
    const pad = Math.max(60, (b.x1 - b.x0 + b.z1 - b.z0) * 0.08);
    const host = this.host();
    const ar = (host.clientWidth || 800) / (host.clientHeight || 600);
    let w = b.x1 - b.x0 + 2 * pad, h = b.z1 - b.z0 + 2 * pad;
    if (w / h < ar) w = h * ar; else h = w / ar;
    this.vb = { x: (b.x0 + b.x1) / 2 - w / 2, y: (b.z0 + b.z1) / 2 - h / 2, w, h };
  },
  render() {
    const host = this.host();
    if (!ui.planOn) { host.hidden = true; return; }
    host.hidden = false;
    if (ui.planView === "elev") { host.innerHTML = this.elevSvg(ui.planSel?.id); return; }
    if (!this.vb) this.fit();
    host.innerHTML = this.svg();
  },
  svg() {
    const room = this.room(), vb = this.vb;
    const fs = vb.w / 70;
    const segs = room ? Room.segments(room) : [];
    const sel = ui.planSel;
    let h = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" class="plansvg" role="img" aria-label="المسقط">
      <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="var(--line)" stroke-width="${vb.w / 900}"/></pattern></defs>
      <rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="url(#grid)"/>`;
    if (room?.closed) h += `<polygon points="${room.pts.map((p) => p.join(",")).join(" ")}" class="pfloor"/>`;
    // walls
    if (room) for (const g of Room.wallGeom(room)) {
      const sg = g.seg;
      const poly = Room.piecePoly(g, 0, sg.L);
      const on = sel?.kind === "wall" && sel.id === sg.id;
      h += `<polygon points="${poly.map((p) => p.join(",")).join(" ")}" class="pwall ${on ? "on" : ""}" data-wall="${sg.id}"/>`;
      // interior dimension along the wall
      const mid = [sg.A[0] + sg.d[0] * sg.L / 2 - sg.n[0] * (sg.t + fs * 1.3), sg.A[1] + sg.d[1] * sg.L / 2 - sg.n[1] * (sg.t + fs * 1.3)];
      let ang = (Math.atan2(sg.d[1], sg.d[0]) * 180) / Math.PI;
      if (ang > 90 || ang < -90) ang += 180;
      h += `<text x="${mid[0]}" y="${mid[1]}" font-size="${fs}" class="pdim" transform="rotate(${ang} ${mid[0]} ${mid[1]})" text-anchor="middle" dominant-baseline="middle">${n1(sg.L)}</text>`;
    }
    // openings
    for (const o of room?.openings || []) {
      const sg = segs.find((x) => x.id === o.wall);
      if (!sg) continue;
      const a = [sg.A[0] + sg.d[0] * o.at, sg.A[1] + sg.d[1] * o.at], b = [a[0] + sg.d[0] * o.w, a[1] + sg.d[1] * o.w];
      const out = (p) => [p[0] - sg.n[0] * sg.t, p[1] - sg.n[1] * sg.t];
      const on = sel?.kind === "open" && sel.id === o.id;
      h += `<polygon points="${[a, b, out(b), out(a)].map((p) => p.join(",")).join(" ")}" class="popen ${on ? "on" : ""}" data-open="${o.id}"/>`;
      if (o.kind === "door") {
        const tip = [a[0] + sg.n[0] * o.w, a[1] + sg.n[1] * o.w];
        const sweep = (sg.d[0] * sg.n[1] - sg.d[1] * sg.n[0]) > 0 ? 0 : 1;
        h += `<path d="M${a.join(",")} L${tip.join(",")} A${o.w},${o.w} 0 0 ${sweep} ${b.join(",")}" class="pdoor"/>`;
      } else {
        const m1 = [(a[0] + out(a)[0]) / 2, (a[1] + out(a)[1]) / 2], m2 = [(b[0] + out(b)[0]) / 2, (b[1] + out(b)[1]) / 2];
        h += `<line x1="${m1[0]}" y1="${m1[1]}" x2="${m2[0]}" y2="${m2[1]}" class="pwin"/>`;
      }
    }
    // columns
    for (const c of room?.columns || []) {
      const on = sel?.kind === "col" && sel.id === c.id;
      h += `<rect x="${c.x}" y="${c.z}" width="${c.w}" height="${c.d}" class="pcol ${on ? "on" : ""}" data-col="${c.id}"/>`;
    }
    // units (wall units drawn last, dashed, since they hang above)
    const poses = projectPoses(state.project);
    const items = projectItems(state.project).sort((x, y) => (x.row === "upper") - (y.row === "upper"));
    for (const it of items) {
      const L = poses.get(it.id);
      if (!L) continue;
      const u = state.project.units.find((x) => x.id === it.id);
      const fp = Room.footprint(L, it.box);
      const on = state.sel === it.id;
      const c = Room.centerOf(L, it.box);
      const wpx = Math.max(1, it.box.x1 - it.box.x0);
      const tfs = Math.min(fs * 0.9, wpx / Math.max(4, u.name.length * 0.55));
      let ang = (-L.rot * 180) / Math.PI;
      while (ang > 90) ang -= 180;
      while (ang < -90) ang += 180;
      h += `<g class="punit ${it.row} ${on ? "on" : ""}" data-unit="${it.id}"><polygon points="${fp.map((p) => p.join(",")).join(" ")}" fill="${ROW_FILL[it.row]}"/>
        <line x1="${fp[3][0]}" y1="${fp[3][1]}" x2="${fp[2][0]}" y2="${fp[2][1]}" class="pfront"/>
        <text x="${c[0]}" y="${c[1]}" font-size="${tfs}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${ang} ${c[0]} ${c[1]})"><tspan font-weight="800">${esc(unitCode(u))}</tspan> ${esc(u.name)}</text></g>`;
    }
    // electrical / plumbing / gas points: a dot on the wall's inner face with its code
    for (const pt of room?.points || []) {
      const w = Room.pointWorld(room, pt);
      if (!w) continue;
      const k = Room.MEP_KINDS[pt.kind] || Room.MEP_KINDS.socket;
      const col = Room.MEP_SYS[k[1]][1];
      const on = sel?.kind === "pt" && sel.id === pt.id;
      const cx = w.x + w.n[0] * fs * 0.9, cz = w.z + w.n[1] * fs * 0.9;
      h += `<g class="pmep ${on ? "on" : ""}" data-mep="${pt.id}"><circle cx="${cx}" cy="${cz}" r="${fs * 0.75}" fill="${col}"/><text x="${cx}" y="${cz}" font-size="${fs * 0.62}" text-anchor="middle" dominant-baseline="central">${esc(k[3])}</text></g>`;
    }
    // rotate handle in front of the selected unit
    {
      const it = items.find((x) => x.id === state.sel), L = it && poses.get(it.id);
      if (L && ui.planTool !== "draw" && !plan.printing) {
        const c = Room.centerOf(L, it.box), f = Room.axisZ(L.rot);
        const dep = (it.box.y1 - it.box.y0) / 2 + fs * 2.4;
        const hx = c[0] + f[0] * dep, hz = c[1] + f[1] * dep;
        h += `<line x1="${c[0] + f[0] * ((it.box.y1 - it.box.y0) / 2)}" y1="${c[1] + f[1] * ((it.box.y1 - it.box.y0) / 2)}" x2="${hx}" y2="${hz}" class="prot-l"/><g class="prot" data-rot="1"><circle cx="${hx}" cy="${hz}" r="${fs * 1.1}"/><text x="${hx}" y="${hz}" font-size="${fs * 1.3}" text-anchor="middle" dominant-baseline="central">↻</text></g>`;
      }
    }
    // drawing preview + corner handles
    if (ui.planTool === "draw") {
      const pts = ui.draft || [];
      if (pts.length) h += `<polyline points="${[...pts, ...(this.hover ? [this.hover] : [])].map((p) => p.join(",")).join(" ")}" class="pdraft"/>`;
      if (pts.length && this.hover) {
        const p = pts[pts.length - 1], q = this.hover;
        h += `<text x="${(p[0] + q[0]) / 2}" y="${(p[1] + q[1]) / 2 - fs}" font-size="${fs * 1.1}" class="pdim live" text-anchor="middle">${n1(Math.hypot(q[0] - p[0], q[1] - p[1]))}</text>`;
      }
      for (const p of pts) h += `<circle cx="${p[0]}" cy="${p[1]}" r="${fs * 0.45}" class="phandle"/>`;
    } else if (room) {
      room.pts.forEach((p, i) => { h += `<circle cx="${p[0]}" cy="${p[1]}" r="${fs * 0.55}" class="phandle" data-pt="${i}"/>`; });
    }
    if (!room && ui.planTool !== "draw") h += `<text x="${vb.x + vb.w / 2}" y="${vb.y + fs * 3}" font-size="${fs * 1.2}" text-anchor="middle" class="phint">مفيش حيطان لسه — اختار "أوضة جاهزة" أو "ارسم حيطان"</text>`;
    return h + `</svg>`;
  },
  /** wall elevation: the wall, its openings and the fronts of every unit standing against it */
  elevSvg(wallId) {
    const room = this.room();
    const seg = room && Room.segments(room).find((x) => x.id === wallId);
    if (!seg) return `<p class="hint" style="padding:20px">اختار حيطة الأول.</p>`;
    const H = seg.h, Wd = seg.L;
    const pad = 40, fs = Math.max(8, Wd / 70);
    const vbw = Wd + pad * 2, vbh = H + pad * 2 + fs * 4;
    const Y = (z) => pad + H - z;
    let h = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} 0 ${vbw} ${vbh}" class="plansvg elev" role="img" aria-label="واجهة الحيطة">
      <rect x="0" y="${Y(H)}" width="${Wd}" height="${H}" class="ewall" ${seg.wall.color && seg.wall.finish !== "photo" ? `style="fill:${seg.wall.color}"` : ""}/>`;
    const bd = seg.wall.band;
    if (bd?.on && +bd.z1 > +bd.z0) h += `<rect x="0" y="${Y(+bd.z1)}" width="${Wd}" height="${bd.z1 - bd.z0}" fill="${bd.finish === "photo" ? "#d9d2c4" : bd.color || "#e7e2d6"}" stroke="#8a8578" stroke-width=".5"/><text x="${Wd - 4}" y="${Y(+bd.z1) + fs}" font-size="${fs * 0.8}" text-anchor="end" class="pdim">تكسية ${n1(bd.z0)}–${n1(bd.z1)}</text>`;
    for (const o of (room.openings || []).filter((x) => x.wall === seg.id)) {
      // elevation is seen from inside the room: x runs along the wall as the viewer sees it
      h += `<rect x="${o.at}" y="${Y(o.sill + o.h)}" width="${o.w}" height="${o.h}" class="eopen ${o.kind}"/>`;
    }
    for (const cb of Room.columnBlocks(room).filter((x) => x.wall === seg.id)) h += `<rect x="${cb.a}" y="${Y(H)}" width="${cb.b - cb.a}" height="${H}" class="ecol"/>`;
    // viewer looks at the wall from inside: their right-hand side is −n×up … map world points to "along" from A
    const poses = projectPoses(state.project);
    const along = (p) => (p[0] - seg.A[0]) * seg.d[0] + (p[1] - seg.A[1]) * seg.d[1];
    const off = (p) => (p[0] - seg.A[0]) * seg.n[0] + (p[1] - seg.A[1]) * seg.n[1];
    const dims = [];
    for (const it of projectItems(state.project)) {
      const L = poses.get(it.id);
      if (!L) continue;
      const fp = Room.footprint(L, it.box);
      if (L.wall !== seg.id && !fp.some((q) => Math.abs(off(q)) < 3 && along(q) > -1 && along(q) < seg.L + 1)) continue;
      const u = state.project.units.find((x) => x.id === it.id);
      const r = R(u);
      const ex = Room.axisX(L.rot);
      const flipX = ex[0] * seg.d[0] + ex[1] * seg.d[1] < 0;
      const a0 = along([L.x, L.z]);
      const X = (lx) => (flipX ? a0 - lx : a0 + lx);
      const zLift = 0; // kitchen meshes already stand at their mounting height
      const boxes = r.meshes ? r.meshes.filter((m) => m.mat !== "hole" && m.mat !== "led").map((m) => ({ b: m.box, front: m.door || m.drawer })) : r.parts.filter((pt) => pt.box && pt.role !== "hole" && pt.role !== "led").map((pt) => ({ b: pt.box, front: pt.layer === "front" }));
      // draw back-to-front: carcass first, fronts on top
      boxes.sort((x, y) => x.front - y.front);
      for (const { b, front } of boxes) {
        const xa = X(b.x0), xb = X(b.x1);
        h += `<rect x="${Math.min(xa, xb)}" y="${Y(b.z1 + zLift)}" width="${Math.abs(xb - xa)}" height="${Math.max(0.2, b.z1 - b.z0)}" class="${front ? "efront" : "ebody"}"/>`;
      }
      const xa = X(it.box.x0), xb = X(it.box.x1);
      dims.push([Math.min(xa, xb), Math.max(xa, xb), it.row]);
    }
    for (const pt of (room.points || []).filter((x) => x.wall === seg.id)) {
      const k = Room.MEP_KINDS[pt.kind] || Room.MEP_KINDS.socket;
      h += `<g class="emep"><rect x="${pt.at - 4}" y="${Y(pt.z) - 4}" width="8" height="8" rx="2" fill="${Room.MEP_SYS[k[1]][1]}"/><text x="${pt.at + 6}" y="${Y(pt.z)}" font-size="${fs * 0.8}" dominant-baseline="middle" class="pdim">${esc(k[0])} ${n1(pt.z)}</text></g>`;
    }
    // dimension chain under the wall: the gaps and every unit
    const lowers = dims.filter((d) => d[2] !== "upper").sort((a, b) => a[0] - b[0]);
    let cur = 0;
    const yD = Y(0) + fs * 2;
    const dimAt = (a, b, cls = "") => (b - a > 0.5 ? `<line x1="${a}" y1="${yD}" x2="${b}" y2="${yD}" class="edim"/><line x1="${a}" y1="${yD - fs * 0.5}" x2="${a}" y2="${yD + fs * 0.5}" class="edim"/><line x1="${b}" y1="${yD - fs * 0.5}" x2="${b}" y2="${yD + fs * 0.5}" class="edim"/><text x="${(a + b) / 2}" y="${yD - fs * 0.4}" font-size="${fs}" text-anchor="middle" class="pdim ${cls}">${n1(b - a)}</text>` : "");
    for (const [a, b] of lowers) { if (a > cur + 0.5) h += dimAt(cur, a, "gap"); h += dimAt(a, b); cur = Math.max(cur, b); }
    if (Wd > cur + 0.5) h += dimAt(cur, Wd, "gap");
    h += `<text x="${Wd / 2}" y="${yD + fs * 2}" font-size="${fs * 1.1}" text-anchor="middle" class="pdim">طول الحيطة ${n1(Wd)} — ارتفاع ${n1(H)}</text>`;
    return h + `</svg>`;
  },
};

// plan interactions: select / drag units, corners, doors & windows; draw walls; pan & pinch-zoom
{
  const host = $("#plan");
  const room = () => state.project.room;
  const after = (full = false) => { save(); plan.render(); if (full) { renderChips(); renderProps(); } };
  host.addEventListener("pointerdown", (e) => {
    if (ui.planView === "elev") return;
    host.setPointerCapture(e.pointerId);
    plan.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (plan.pointers.size === 2) { plan.act = { kind: "pinch", vb: { ...plan.vb }, pts: [...plan.pointers.values()] }; return; }
    const p = plan.toCm(e);
    if (ui.planTool === "draw") {
      const pts = (ui.draft ??= []);
      const q = Room.snapDraw(pts[pts.length - 1], p);
      if (pts.length >= 3 && Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) < plan.vb.w / 60) { finishDraw(true); return; }
      if (pts.length && Math.hypot(q[0] - pts[pts.length - 1][0], q[1] - pts[pts.length - 1][1]) < 1) return;
      pts.push(q);
      renderChips(); renderProps(); plan.render();
      return;
    }
    const t = e.target.closest("[data-rot],[data-pt],[data-open],[data-mep],[data-col],[data-unit],[data-wall]");
    const d = t?.dataset || {};
    if (d.pt != null) plan.act = { kind: "pt", i: +d.pt };
    else if (d.mep) { ui.planSel = { kind: "pt", id: d.mep }; plan.act = { kind: "mep", id: d.mep, p0: p, at0: room().points.find((o) => o.id === d.mep).at }; after(true); }
    else if (d.col) { ui.planSel = { kind: "col", id: d.col }; const c = room().columns.find((o) => o.id === d.col); plan.act = { kind: "col", c, off: [c.x - p[0], c.z - p[1]] }; after(true); }
    else if (d.open) { ui.planSel = { kind: "open", id: d.open }; plan.act = { kind: "open", id: d.open, p0: p, at0: room().openings.find((o) => o.id === d.open).at }; after(true); }
    else if (d.unit) {
      if (state.sel !== d.unit) { state.sel = d.unit; renderStrip(); }
      ui.planSel = { kind: "unit", id: d.unit };
      const u = selUnit(), L = projectPoses(state.project).get(u.id), box = localBox(R(u));
      const c = Room.centerOf(L, box);
      plan.act = { kind: "unit", u, box, rot: L.rot, off: [c[0] - p[0], c[1] - p[1]], row: rowOf(u, R(u)), segs: roomSegs(state.project), pose: L,
        others: projectItems(state.project).filter((it) => it.id !== u.id).map((it) => ({ box: it.box, row: it.row, pose: projectPoses(state.project).get(it.id) })).filter((o) => o.pose) };
      after(true);
    } else if (d.wall) {
      // tap selects the wall; dragging pushes it in or out (its neighbours stretch with it)
      ui.planSel = { kind: "wall", id: d.wall };
      const segs = Room.segments(room());
      const sg = segs.find((g) => g.id === d.wall);
      const n = room().pts.length;
      plan.act = { kind: "wall", sg, p0: p, i: sg.i, j: (sg.i + 1) % n, A0: [...sg.A], B0: [...sg.B] };
      after(true);
    } else if (d.rot) {
      const u = selUnit(), L = projectPoses(state.project).get(u.id), box = localBox(R(u));
      plan.act = { kind: "rot", u, box, c: Room.centerOf(L, box), rot0: L.rot, a0: null };
    }
    else { if (ui.planSel) { ui.planSel = null; after(true); } plan.act = { kind: "pan", c0: [e.clientX, e.clientY], vb: { ...plan.vb } }; }
  });
  host.addEventListener("pointermove", (e) => {
    if (ui.planView === "elev") return;
    if (plan.pointers.has(e.pointerId)) plan.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    const a = plan.act;
    if (ui.planTool === "draw" && !a) { const pts = ui.draft || []; plan.hover = Room.snapDraw(pts[pts.length - 1], plan.toCm(e)); plan.render(); return; }
    if (!a) return;
    if (a.kind === "pinch" && plan.pointers.size === 2) {
      const [p1, p2] = [...plan.pointers.values()];
      const d0 = Math.hypot(a.pts[0][0] - a.pts[1][0], a.pts[0][1] - a.pts[1][1]), d1 = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
      const k = d0 / Math.max(1, d1);
      const vb = a.vb, cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
      plan.vb = { x: cx - (vb.w * k) / 2, y: cy - (vb.h * k) / 2, w: vb.w * k, h: vb.h * k };
      plan.render();
      return;
    }
    const p = plan.toCm(e);
    if (a.kind === "pan") {
      const sc = a.vb.w / host.clientWidth;
      plan.vb = { ...a.vb, x: a.vb.x - (e.clientX - a.c0[0]) * sc, y: a.vb.y - (e.clientY - a.c0[1]) * sc };
      plan.render();
    } else if (a.kind === "pt") {
      const pts = room().pts;
      const prev = pts[a.i - 1] ?? (room().closed ? pts[pts.length - 1] : null);
      pts[a.i] = Room.snapDraw(prev, p);
      a.moved = true;
      plan.render();
    } else if (a.kind === "open") {
      const o = room().openings.find((x) => x.id === a.id);
      const seg = Room.segments(room()).find((x) => x.id === o.wall);
      const da = (p[0] - a.p0[0]) * seg.d[0] + (p[1] - a.p0[1]) * seg.d[1];
      o.at = Math.max(0, Math.min(seg.L - o.w, Math.round((a.at0 + da) * 2) / 2));
      plan.render();
    } else if (a.kind === "wall") {
      const off = Math.round((p[0] - a.p0[0]) * a.sg.n[0] + (p[1] - a.p0[1]) * a.sg.n[1]);
      if (!a.moved && Math.abs(off) < 2) return;
      const pts = room().pts;
      pts[a.i] = [a.A0[0] + a.sg.n[0] * off, a.A0[1] + a.sg.n[1] * off];
      pts[a.j] = [a.B0[0] + a.sg.n[0] * off, a.B0[1] + a.sg.n[1] * off];
      a.moved = true;
      plan.render();
    } else if (a.kind === "rot") {
      const ang = Math.atan2(p[0] - a.c[0], p[1] - a.c[1]);
      // the handle sits in front of the unit: pointing direction = the unit's front
      let rot = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
      const pose = Room.snapPose([], a.box, a.c, rot, [], "free");
      a.u.pos = { x: pose.x, z: pose.z, rot };
      a.moved = true;
      plan.render();
    } else if (a.kind === "mep") {
      const o = room().points.find((x) => x.id === a.id);
      const seg = Room.segments(room()).find((x) => x.id === o.wall);
      const da = (p[0] - a.p0[0]) * seg.d[0] + (p[1] - a.p0[1]) * seg.d[1];
      o.at = Math.max(0, Math.min(seg.L, Math.round(a.at0 + da)));
      a.moved = true;
      plan.render();
    } else if (a.kind === "col") {
      a.c.x = Math.round(p[0] + a.off[0]); a.c.z = Math.round(p[1] + a.off[1]);
      a.moved = true;
      plan.render();
    } else if (a.kind === "unit") {
      a.pose = Room.snapPose(a.segs, a.box, [p[0] + a.off[0], p[1] + a.off[1]], a.rot, a.others, a.row);
      a.u.pos = a.pose.wall ? { wall: a.pose.wall, s: a.pose.s } : { x: a.pose.x, z: a.pose.z, rot: a.pose.rot };
      a.moved = true;
      plan.render();
    }
  });
  const up = (e) => {
    plan.pointers.delete(e.pointerId);
    const a = plan.act;
    if (!a) return;
    if (a.kind === "pinch" && plan.pointers.size) return;
    plan.act = null;
    if (["unit", "pt", "open", "mep", "col", "wall", "rot"].includes(a.kind)) { after(true); view.update(); }
  };
  host.addEventListener("pointerup", up);
  host.addEventListener("pointercancel", up);
  host.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = plan.toCm(e), k = Math.exp(e.deltaY * 0.0015), vb = plan.vb;
    plan.vb = { x: p[0] - (p[0] - vb.x) * k, y: p[1] - (p[1] - vb.y) * k, w: vb.w * k, h: vb.h * k };
    plan.render();
  }, { passive: false });
}
function finishDraw(close) {
  const pts = ui.draft || [];
  ui.planTool = "select";
  ui.draft = null;
  plan.hover = null;
  if (pts.length >= 2) {
    const cur = state.project.room;
    if (cur && !cur.closed && !close && cur.pts.length && Math.hypot(pts[0][0] - cur.pts[cur.pts.length - 1][0], pts[0][1] - cur.pts[cur.pts.length - 1][1]) < 1) {
      // continuing the open chain
      for (const q of pts.slice(1)) { cur.pts.push(q); cur.walls.push(Room.newWallMeta()); }
    } else {
      state.project.room = { pts, closed: !!close && pts.length >= 3, walls: [], openings: [] };
      const n = state.project.room.closed ? pts.length : pts.length - 1;
      for (let i = 0; i < n; i++) state.project.room.walls.push(Room.newWallMeta());
      state.whole = true;
    }
  }
  plan.vb = null;
  save();
  render(true);
}

// ------------------------------------------------------------------ 3D view
const view = {
  three: null, ready: false, last: null, host: null,
  async init(hostSel) {
    this.host = $(hostSel);
    try {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
      this.three = THREE;
      this.ren = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.ren.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.host.appendChild(this.ren.domElement);
      this.scene = new THREE.Scene();
      this.cam = new THREE.PerspectiveCamera(35, 1, 1, 5000);
      this.ctl = new OrbitControls(this.cam, this.ren.domElement);
      this.ctl.enableDamping = true;
      this.ctl.maxPolarAngle = Math.PI * 0.52;
      this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f86, 1.6);
      this.scene.add(this.hemi);
      const sun = (this.sun = new THREE.DirectionalLight(0xffffff, 1.4));
      sun.position.set(-150, 300, 260);
      this.scene.add(sun, sun.target);
      const fill = (this.fill = new THREE.DirectionalLight(0xffffff, 0.7));
      fill.position.set(260, 220, -240);
      this.scene.add(fill);
      this.floor = new THREE.Mesh(new THREE.CircleGeometry(700, 64), new THREE.MeshLambertMaterial({ color: 0xdedfd8 }));
      this.floor.rotation.x = -Math.PI / 2;
      this.floor.position.y = -0.05;
      this.scene.add(this.floor);
      new ResizeObserver(() => this.resize()).observe(this.host);
      this.resize();
      this.ready = true;
      // render only when something changed and the view is on screen (saves the iPad's battery)
      this.postFx = new Render.Post(this);
      this.final = new Render.FinalRender(this);
      const loop = () => {
        requestAnimationFrame(loop);
        if (!this.host.offsetParent) return;
        if (this.final.active) { this.final.tick(); return; }
        const moved = this.ctl.update();
        if (!moved && !this.dirty) return;
        this.dirty = false;
        this.cutaway();
        if (this.usePost()) this.postFx.render(); else this.ren.render(this.scene, this.cam);
      };
      this.ctl.addEventListener("change", () => { this.dirty = true; });
      loop();
      this.update(true);
    } catch {
      const f = this.host.querySelector(".fallback");
      if (f) { f.hidden = false; f.textContent = "العرض 3D محتاج إنترنت أول مرة يفتح — باقي التطبيق شغال عادي."; }
    }
  },
  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h || !this.ren) return;
    this.dirty = true;
    if (this.final?.active) { this.final.resize(); this.final.camMoved = true; return; }
    this.ren.setSize(w, h);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.postFx?.resize();
  },
  usePost() { return !!(state.render && this.postFx?.ready); },
  /** slider changes (exposure, sun direction): no rebuild, just relight */
  refreshScene() {
    if (!this.ready || !state.render || !this.group) return;
    const sc = Render.sceneOf(state), root = document.documentElement;
    const dark = root.dataset.theme === "dark" || (root.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    Render.placeSun(this, sc, new this.three.Box3().setFromObject(this.group));
    Render.applyTime(this, sc, dark);
    this.postFx.configure(sc);
    this.dirty = true;
  },
  unit: () => (ui.mode === "client" ? ui.clientUnit : selUnit()),
  /** a door/drawer pivot inside a unit group (its matrix is driven by setOpen) */
  moverGroup(g, r, i) {
    g.userData.movers ??= {};
    let mg = g.userData.movers[i];
    if (!mg) {
      mg = new this.three.Group();
      mg.matrixAutoUpdate = false;
      mg.userData.mv = r.movers[i];
      g.userData.movers[i] = mg;
      g.add(mg);
      this.movers.push(mg);
    }
    return mg;
  },
  /** open (1) / close (0) every door and drawer, animated */
  setOpen(open, animate = true) {
    const THREE = this.three;
    if (!THREE) return;
    const target = open ? 1 : 0;
    const from = this.openT ?? 0;
    const t0 = performance.now();
    const T = (v) => new THREE.Vector3(v[0], v[2], -v[1]);
    const apply = (k) => {
      for (const mg of this.movers) {
        const mv = mg.userData.mv;
        const m = new THREE.Matrix4();
        if (mv.kind === "door") {
          const h = T(mv.hinge), a = T(mv.axis).normalize(), f = T(mv.free), n = T(mv.normal);
          const sign = new THREE.Vector3().crossVectors(a, f.clone().sub(h)).dot(n) >= 0 ? 1 : -1;
          const flip = Math.abs(mv.axis[2]) < 0.5;
          const ang = sign * (flip ? 1.35 : 1.75) * k;
          m.makeTranslation(h.x, h.y, h.z).multiply(new THREE.Matrix4().makeRotationAxis(a, ang)).multiply(new THREE.Matrix4().makeTranslation(-h.x, -h.y, -h.z));
        } else {
          const n = T(mv.normal).multiplyScalar((mv.kind === "slide" ? mv.slide : Math.max(mv.slide, 20) * 1.4) * k);
          m.makeTranslation(n.x, n.y, n.z);
        }
        mg.matrix.copy(m);
        mg.matrixWorldNeedsUpdate = true;
      }
      this.dirty = true;
      this.openT = k;
    };
    cancelAnimationFrame(this.openRaf);
    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) { apply(target); return; }
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / 450);
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      apply(from + (target - from) * e);
      if (p < 1) this.openRaf = requestAnimationFrame(step);
    };
    step();
  },
  /** "render" look: time of day, soft shadows, image-based lighting, ceiling spots, LED light, AO + bloom, filmic tone mapping */
  async applyRender(box, dark) {
    const THREE = this.three, on = !!state.render, r = this.ren;
    const sc = (this.sceneSettings = Render.sceneOf(state));
    r.shadowMap.enabled = on;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = on ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    r.toneMappingExposure = 1;
    this.sun.castShadow = on;
    this.floor.receiveShadow = on;
    if (!on) {
      if (this.rig) { this.scene.remove(this.rig); this.rig = null; }
      this.hemi.intensity = 1.6; this.sun.intensity = 1.4; this.sun.color.set(0xffffff); this.sun.visible = true; this.fill.intensity = 0.7;
      this.sun.position.set(-150, 300, 260); this.sun.target.position.set(0, 0, 0);
      this.scene.environment = null;
      this.scene.background = null;
      this.floor.material = new THREE.MeshLambertMaterial({ color: dark ? 0x26302a : 0xdedfd8 });
      this.floor.position.y = -0.05;
      this.dirty = true;
      return;
    }
    if (!box.isEmpty()) Render.placeSun(this, sc, box);
    if (!this.envTex) {
      try {
        const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
        const roomEnv = new RoomEnvironment();
        const pm = new THREE.PMREMGenerator(r);
        this.envTex = pm.fromScene(roomEnv, 0.04).texture;
        // the same studio as a cube map for the path tracer (it needs a plain environment, not PMREM)
        const crt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
        new THREE.CubeCamera(0.1, 100, crt).update(r, roomEnv);
        this.envCube = crt.texture;
      } catch { this.envTex = null; }
    }
    this.scene.environment = this.envTex;
    if (!this.floorTex) {
      this.floorTex = new THREE.CanvasTexture(Mat.tileCanvas(dark ? "#5a5650" : "#d9d4c8"));
      this.floorTex.wrapS = this.floorTex.wrapT = THREE.RepeatWrapping;
      this.floorTex.colorSpace = THREE.SRGBColorSpace;
      this.floorTex.repeat.set(1400 / 60, 1400 / 60);
    }
    // inside a closed room the room's own floor shows; the ground outside stays plain and quiet
    const T = Render.TIMES[sc.time] || Render.TIMES.day;
    const proj = ui.mode === "client" ? ui.sharedProject : state.project;
    const closedRoom = !!(proj?.room?.closed && wholeView() && proj.room.floor?.finish !== "none");
    this.floor.position.y = closedRoom ? -0.5 : -0.05;
    this.floor.material = closedRoom ? new THREE.MeshStandardMaterial({ color: dark ? T.bgDark : T.bg, roughness: 0.9 }) : new THREE.MeshStandardMaterial({ map: this.floorTex, roughness: 0.35 });
    this.group?.traverse((o) => {
      if (!o.isMesh || o === this.floor) return;
      o.castShadow = !o.userData.wall && !o.material?.transparent && !o.userData.led;
      o.receiveShadow = true;
    });
    const project = ui.mode === "client" ? ui.sharedProject : state.project;
    const wallH = project?.room && wholeView() ? Math.max(...Room.segments(project.room).map((g) => +g.h || 0), 0) : 0;
    await this.postFx.init(); // also sets up the area-light tables the LED lights need
    if (!state.render) return;
    Render.lightRig(this, sc, box, wallH);
    Render.applyTime(this, sc, dark);
    r.toneMappingExposure = sc.exposure;
    this.postFx.configure(sc);
    this.postFx.resize();
    this.dirty = true;
  },
  /** walls (with door/window openings) and the floor of the project's room */
  buildRoom(g, room, dark) {
    const THREE = this.three;
    this.walls = [];
    const capMat = new THREE.MeshStandardMaterial({ color: dark ? 0x222924 : 0xb9b6ac, roughness: 0.95 });
    for (const geo of Room.wallGeom(room)) {
      const seg = geo.seg;
      const wg = new THREE.Group();
      const fin = Mat.finishMaterial(THREE, seg.wall, dark ? "#3a423c" : "#f3f1ea");
      for (const sp of Room.wallSpans(seg, room.openings || [])) {
        const poly = Room.piecePoly(geo, sp.a, sp.b);
        const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
        const eg = new THREE.ExtrudeGeometry(shape, { depth: sp.z1 - sp.z0, bevelEnabled: false });
        const m = new THREE.Mesh(eg, [capMat, fin.mat]);
        m.userData.wall = true;
        m.rotation.x = -Math.PI / 2;
        m.position.y = sp.z0;
        Mat.wallUV(THREE, m, seg, fin.tile);
        wg.add(m);
      }
      // a cladding band (backsplash …) in front of the wall face
      const band = seg.wall.band;
      if (band?.on && +band.z1 > +band.z0) {
        const bf = Mat.finishMaterial(THREE, band, "#e7e2d6");
        for (const sp of Room.wallSpans(seg, room.openings || [])) {
          const z0 = Math.max(sp.z0, +band.z0), z1 = Math.min(sp.z1, +band.z1);
          if (z1 - z0 < 0.5 || sp.b - sp.a < 0.5) continue;
          const len = sp.b - sp.a, bt = 1;
          const bm = new THREE.Mesh(new THREE.BoxGeometry(len, z1 - z0, bt), bf.mat);
          const mid = sp.a + len / 2;
          bm.position.set(seg.A[0] + seg.d[0] * mid + seg.n[0] * bt / 2, (z0 + z1) / 2, seg.A[1] + seg.d[1] * mid + seg.n[1] * bt / 2);
          bm.rotation.y = Room.rotFor(seg.n);
          bm.userData.wall = true;
          Mat.wallUV(THREE, bm, seg, bf.tile);
          wg.add(bm);
        }
      }
      for (const pt of (room.points || []).filter((x) => x.wall === seg.id)) {
        const k = Room.MEP_KINDS[pt.kind] || Room.MEP_KINDS.socket;
        const m = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 1.5), new THREE.MeshStandardMaterial({ color: Room.MEP_SYS[k[1]][1], roughness: 0.5 }));
        const x = seg.A[0] + seg.d[0] * pt.at + seg.n[0] * 0.8, z = seg.A[1] + seg.d[1] * pt.at + seg.n[1] * 0.8;
        m.position.set(x, pt.z, z);
        m.rotation.y = Room.rotFor(seg.n);
        wg.add(m);
      }
      const mid = Room.piecePoly(geo, seg.L / 2, seg.L / 2)[0];
      wg.userData = { n: seg.n, mid, wallId: seg.id };
      g.add(wg);
      this.walls.push(wg);
    }
    const floorSpec = room.floor || { finish: "tile", color: "#d9d4c8", size: 60 }; // same default the floor editor shows
    if (room.closed && floorSpec.finish !== "none") {
      const ff = Mat.finishMaterial(THREE, floorSpec, "#d8d2c4");
      const fgeo = new THREE.ShapeGeometry(new THREE.Shape(room.pts.map(([x, z]) => new THREE.Vector2(x, -z))));
      const pa = fgeo.attributes.position, uv = new Float32Array(pa.count * 2), tl = ff.tile || 100;
      for (let i = 0; i < pa.count; i++) { uv[i * 2] = pa.getX(i) / tl; uv[i * 2 + 1] = pa.getY(i) / tl; }
      fgeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      const fl = new THREE.Mesh(fgeo, ff.mat);
      fl.rotation.x = -Math.PI / 2;
      fl.position.y = -0.1;
      fl.userData.wall = true;
      g.add(fl);
    }
  },
  /** columns of the room (full height boxes) */
  buildColumns(g, room, dark) {
    const THREE = this.three;
    for (const c of room.columns || []) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h || 280, c.d), new THREE.MeshStandardMaterial({ color: dark ? 0x4a524c : 0xe4e1d8, roughness: 0.9 }));
      m.position.set(c.x + c.w / 2, (c.h || 280) / 2, c.z + c.d / 2);
      g.add(m);
    }
  },
  /** hide the walls standing between the camera and the room (like a cut-away doll's house) */
  cutaway() {
    if (!this.walls?.length) return;
    const c = this.cam.position;
    for (const w of this.walls) {
      const { n, mid } = w.userData;
      w.visible = (c.x - mid[0]) * n[0] + (c.z - mid[1]) * n[1] > -5;
    }
  },
  buildUnit(g, u, r, edgeMat) {
    const THREE = this.three;
    const vis = asmVisibility(u);
    const hiMat = (m) => { const c = m.clone(); c.emissive = new THREE.Color(0xd9a63a); c.emissiveIntensity = 0.45; return c; };
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
    if (r.meshes) {
      const mats = {};
      const matFor = (key, front) => {
        const see = state.xray && front;
        const id = key + (see ? "~x" : "");
        if (mats[id]) return mats[id];
        const led = key === "led", glass = key === "glass";
        const lib = r.libOf?.(key), tx = Mat.textureFor(THREE, lib, !!state.render), sf = Mat.surface(lib);
        const m = new THREE.MeshStandardMaterial({ color: tx ? new THREE.Color(1, 1, 1).multiplyScalar(sf.bright) : r.colors[key] || "#cccccc", map: tx?.tex || null,
          roughness: state.render || lib ? sf.rough : 0.7, metalness: ["frame", "rail", "handle"].includes(key) ? 0.5 : sf.metal,
          transparent: see || glass, opacity: see ? 0.16 : glass ? 0.4 : 1, side: THREE.DoubleSide,
          emissive: new THREE.Color(led ? "#ffcf6a" : "#000000"), emissiveIntensity: led ? 0.9 : 0 });
        m.userData.tile = tx?.tile || 0;
        m.userData.glass = glass && !see;
        m.userData.mirror = key === "mirror";
        return (mats[id] = m);
      };
      const T = ([x, y, z]) => [x, z, -y];
      for (const m of r.meshes) {
        if ((m.mat === "hole" && !state.xray) || m.name === "كبة مفصلة" || m.name === "خرم مقبض") continue;
        const vs = vis ? vis(m.name, null) : "done";
        if (vs === "hide") continue;
        const front = m.door || m.drawer || m.layer === "Kitchen - Front";
        const byMat = new Map();
        const all = [];
        for (const f of m.faces) {
          const arr = byMat.get(f.mat) || [];
          byMat.set(f.mat, arr);
          const n = f.n;
          const ax = Math.abs(n[0]) >= Math.abs(n[1]) && Math.abs(n[0]) >= Math.abs(n[2]) ? 0 : Math.abs(n[1]) >= Math.abs(n[2]) ? 1 : 2;
          const [a, b] = [[1, 2], [0, 2], [0, 1]][ax];
          const v2 = (p) => new THREE.Vector2(p[a], p[b]);
          const contour = f.outer.map(v2);
          const holes = f.holes.map((h) => h.map(v2));
          const pts3 = [...f.outer, ...f.holes.flat()];
          let tris;
          try { tris = THREE.ShapeUtils.triangulateShape(contour, holes); } catch { tris = []; }
          const tn = T(n);
          for (const [i, j, k] of tris) {
            let A = T(pts3[i]), B = T(pts3[j]), C = T(pts3[k]);
            const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
            const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
            if (cx * tn[0] + cy * tn[1] + cz * tn[2] < 0) [B, C] = [C, B];
            arr.push(...A, ...B, ...C);
            all.push(...A, ...B, ...C);
          }
        }
        for (const [key, arr] of byMat) {
          if (!arr.length) continue;
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
          geo.computeVertexNormals();
          const mm = matFor(key, front);
          if (mm.userData.tile) Mat.planarUV(THREE, geo, mm.userData.tile);
          const mesh = new THREE.Mesh(geo, vs === "cur" ? hiMat(mm) : mm);
          mesh.userData.led = key === "led";
          mesh.castShadow = mesh.receiveShadow = !!state.render;
          (m.mover !== null ? this.moverGroup(g, r, m.mover) : g).add(mesh);
        }
        if (all.length && m.faces.length <= 16 && m.mat !== "led" && !state.render) {
          const eg = new THREE.BufferGeometry();
          eg.setAttribute("position", new THREE.Float32BufferAttribute(all, 3));
          const ln = new THREE.LineSegments(new THREE.EdgesGeometry(eg, 30), edgeMat);
          eg.dispose();
          (m.mover !== null ? this.moverGroup(g, r, m.mover) : g).add(ln);
        }
        const b = m.box;
        minX = Math.min(minX, b.x0); maxX = Math.max(maxX, b.x1); minY = Math.min(minY, b.z0); maxY = Math.max(maxY, b.z1);
        minZ = Math.min(minZ, -b.y1); maxZ = Math.max(maxZ, -b.y0);
      }
    }
    for (const [pi, pt] of (r.meshes ? [] : r.parts).entries()) {
      const vs = vis ? vis(pt.name, pt.role) : "done";
      if (vs === "hide") continue;
      const mvI = r.partMover?.[pi] ?? null;
      const tgt = mvI !== null ? this.moverGroup(g, r, mvI) : g;
      if (pt.role === "hole" || pt.material === "__hole") continue;
      const b = pt.box;
      const isFront = pt.layer === "front";
      const led = pt.material === "led" || pt.material === "__led" || pt.role === "led";
      let color = led ? "#ffd27a" : r.colors?.[pt.material] || "#cccccc";
      if (pt.material === "mirror") color = "#c9d1d6";
      const glassy = pt.material === "glass";
      const see = state.xray && isFront;
      const plib = r.libOf?.(pt.material), ptx = led ? null : Mat.textureFor(THREE, plib, !!state.render), psf = Mat.surface(plib);
      const mat = new THREE.MeshStandardMaterial({ color: ptx ? new THREE.Color(1, 1, 1).multiplyScalar(psf.bright) : color, map: ptx?.tex || null,
        roughness: state.render || plib ? psf.rough : 0.72, metalness: pt.material === "mirror" || pt.material === "rail" ? 0.45 : psf.metal,
        transparent: see || glassy, opacity: see ? 0.16 : glassy ? 0.45 : 1,
        emissive: new THREE.Color(led ? "#ffcf6a" : vs === "cur" ? "#d9a63a" : "#000000"), emissiveIntensity: led ? 0.9 : vs === "cur" ? 0.45 : 0 });
      mat.userData.glass = glassy && !see;
      mat.userData.mirror = pt.material === "mirror";
      const s = pt.shape || {};
      let geo, mesh;
      if ((s.type === "poly_z" || s.type === "profile_z") && s.points?.length > 2) {
        geo = new THREE.ExtrudeGeometry(new THREE.Shape(s.points.map(([x, y]) => new THREE.Vector2(x, y))), { depth: s.z1 - s.z0, bevelEnabled: false });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, s.z0, 0);
      } else if (s.type === "profile_x" && s.points?.length > 2) {
        geo = new THREE.ExtrudeGeometry(new THREE.Shape(s.points.map(([y, z]) => new THREE.Vector2(y, z))), { depth: s.x1 - s.x0, bevelEnabled: false });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(s.x0, 0, 0);
      } else if (s.type === "cylinder_x" || s.type === "cylinder_z" || s.type === "cylinder_y") {
        geo = new THREE.CylinderGeometry(s.r, s.r, s.length, 20);
        mesh = new THREE.Mesh(geo, mat);
        if (s.type === "cylinder_x") mesh.rotation.z = Math.PI / 2;
        if (s.type === "cylinder_y") mesh.rotation.x = Math.PI / 2;
        mesh.position.set(s.cx, s.cz, -s.cy);
      } else {
        geo = new THREE.BoxGeometry(Math.max(b.x1 - b.x0, 0.05), Math.max(b.z1 - b.z0, 0.05), Math.max(b.y1 - b.y0, 0.05));
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, -(b.y0 + b.y1) / 2);
      }
      if (ptx) Mat.planarUV(THREE, geo, ptx.tile);
      mesh.userData.led = led;
      mesh.castShadow = mesh.receiveShadow = !!state.render;
      tgt.add(mesh);
      if (!led && !s.type?.startsWith("cylinder") && !state.render) {
        const ln = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
        ln.position.copy(mesh.position);
        ln.rotation.copy(mesh.rotation);
        tgt.add(ln);
      }
      minX = Math.min(minX, b.x0); maxX = Math.max(maxX, b.x1); minY = Math.min(minY, b.z0); maxY = Math.max(maxY, b.z1);
      minZ = Math.min(minZ, -b.y1); maxZ = Math.max(maxZ, -b.y0);
    }
  },
  update(refit = false) {
    if (!this.ready) return;
    const THREE = this.three;
    if (this.final?.active) { this.final.stop(); if (ui.pt) { ui.pt.phase = "setup"; renderPt(); } }
    if (this.group) { this.scene.remove(this.group); this.group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); }
    const g = (this.group = new THREE.Group());
    this.scene.add(g);
    this.dirty = true;
    this.movers = [];
    this.pickables = [];
    this.walls = [];
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" || (root.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (!state.render) this.floor.material.color?.set(dark ? 0x26302a : 0xdedfd8);
    const edgeMat = new THREE.LineBasicMaterial({ color: dark ? 0x0c0f0d : 0x3b3f38, transparent: true, opacity: 0.5 });
    const whole = wholeView();
    const project = ui.mode === "client" ? ui.sharedProject : state.project;
    const one = this.unit();
    const asmU = ui.asm && project?.units.find((x) => x.id === ui.asm.id);
    const units = asmU ? [asmU] : whole ? (project?.units || []) : one ? [one] : [];
    const layout = whole && !asmU ? projectPoses(project) : null;
    this.poses = layout;
    if (layout && project?.room) { this.buildRoom(g, project.room, dark); this.buildColumns(g, project.room, dark); }
    let selBox = null;
    for (const u of units) {
      const r = R(u);
      if (!r.ok) continue;
      const ug = new THREE.Group();
      ug.userData.unitId = u.id;
      this.buildUnit(ug, u, r, edgeMat);
      if (layout) {
        const L = layout.get(u.id);
        if (!L) continue;
        ug.position.set(L.x, 0, L.z);
        ug.rotation.y = L.rot;
      }
      g.add(ug);
      this.pickables.push(ug);
      if (whole && u.id === (ui.mode === "client" ? ui.clientUnit?.id : state.sel) && ui.mode === "owner") selBox = ug;
    }
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    if (selBox) {
      // a gold glass box + footprint around the selected unit: this is the one that moves
      const sb = new THREE.Box3().setFromObject(selBox);
      const bs = sb.getSize(new THREE.Vector3()).addScalar(4), bc = sb.getCenter(new THREE.Vector3());
      const bx = new THREE.Mesh(new THREE.BoxGeometry(bs.x, bs.y, bs.z), new THREE.MeshBasicMaterial({ color: 0xd9a63a, transparent: true, opacity: ui.moveMode ? 0.16 : 0.08, depthWrite: false }));
      bx.position.copy(bc);
      const be = new THREE.LineSegments(new THREE.EdgesGeometry(bx.geometry), new THREE.LineBasicMaterial({ color: 0xd9a63a }));
      be.position.copy(bc);
      g.add(bx, be);
      this.selGlass = [bx, be];
      const fp = new THREE.Mesh(new THREE.PlaneGeometry(sb.max.x - sb.min.x + 8, sb.max.z - sb.min.z + 8), new THREE.MeshBasicMaterial({ color: 0xd9a63a, transparent: true, opacity: ui.moveMode ? 0.55 : 0.32, depthWrite: false }));
      fp.rotation.x = -Math.PI / 2;
      fp.position.set((sb.min.x + sb.max.x) / 2, 0.4, (sb.min.z + sb.max.z) / 2);
      fp.userData.selFoot = true;
      g.add(fp);
      this.selFoot = fp;
    } else { this.selFoot = null; this.selGlass = null; }
    this.setOpen(!!ui.open, false);
    this.applyRender(box, dark);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    this.floor.position.x = c.x;
    this.floor.position.z = c.z;
    const key = asmU ? "asm:" + asmU.id : whole ? "whole:" + (project?.id || "") : one?.id;
    if (refit || this.last !== key) {
      const size = Math.max(sz.x, sz.y, sz.z);
      // fit the bounding sphere into the narrower field of view
      const rad = sz.length() / 2;
      const fovV = (this.cam.fov * Math.PI) / 180;
      const fovH = 2 * Math.atan(Math.tan(fovV / 2) * this.cam.aspect);
      const fitDist = rad / Math.sin(Math.min(fovV, fovH) / 2);
      const dist = whole ? fitDist * 1.02 : Math.max(size * 2.1 + 60, fitDist);
      const p = !whole && one ? R(one).params || {} : {};
      const corner = !whole && one?.kind === "kitchen" && ((p.unit_category === "corner" && p.corner_style !== "blind") || p.unit_category === "corner_glass_display");
      this.ctl.target.set(c.x, c.y * 0.96, c.z);
      if (corner) this.cam.position.set(c.x + dist * 0.62, c.y + dist * 0.38, c.z - dist * 0.62);
      else if (whole && project?.room) {
        // look at the wall carrying the most units, from the far side of the room (that wall gets cut away)
        const segs = Room.segments(project.room);
        const count = new Map();
        for (const L of layout.values()) if (L.wall) count.set(L.wall, (count.get(L.wall) || 0) + 1);
        const main = segs.slice().sort((a, b) => (count.get(b.id) || 0) - (count.get(a.id) || 0) || b.L - a.L)[0];
        const n = main ? main.n : [0, 1];
        const sideV = main ? main.d : [1, 0];
        this.cam.position.set(c.x + (n[0] * 0.9 - sideV[0] * 0.25) * dist, c.y + dist * 0.45, c.z + (n[1] * 0.9 - sideV[1] * 0.25) * dist);
      }
      else if (whole && layout && [...layout.values()].some((L) => L.wall === "B")) this.cam.position.set(c.x + dist * 0.7, c.y + dist * 0.36, c.z + dist * 0.62);
      else if (whole) this.cam.position.set(c.x + dist * 0.18, c.y + dist * 0.32, c.z + dist * 0.92);
      else this.cam.position.set(c.x - dist * 0.42, c.y + dist * 0.38, c.z + dist * 0.85);
      this.cam.far = dist * 10;
      this.cam.near = Math.max(1, dist / 150);
      this.cam.updateProjectionMatrix();
      this.last = key;
    }
  },
  /** tap a unit in the whole-project view to select it */
  pickAt(clientX, clientY) {
    if (!this.ready || !this.pickables?.length) return null;
    const THREE = this.three;
    const rc = this.ren.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((clientX - rc.left) / rc.width) * 2 - 1, -((clientY - rc.top) / rc.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.cam);
    const hit = ray.intersectObjects(this.pickables, true).find((h) => h.object.isMesh);
    let o = hit?.object;
    while (o && !o.userData.unitId) o = o.parent;
    return o?.userData.unitId ?? null;
  },
  /** camera buttons (for anyone who'd rather tap than pinch) */
  zoom(k) { const t = this.ctl.target, c = this.cam.position; c.sub(t).multiplyScalar(k).add(t); this.dirty = true; },
  orbit(deg) {
    const t = this.ctl.target, c = this.cam.position, a = (deg * Math.PI) / 180;
    const x = c.x - t.x, z = c.z - t.z;
    c.x = t.x + x * Math.cos(a) - z * Math.sin(a); c.z = t.z + x * Math.sin(a) + z * Math.cos(a);
    this.dirty = true;
  },
  preset(kind) {
    if (kind === "fit") { this.update(true); return; }
    const t = this.ctl.target, c = this.cam.position, d = c.distanceTo(t);
    if (kind === "top") c.set(t.x + 0.01, t.y + d, t.z + 0.01);
    else { const v = c.clone().sub(t); v.y = 0; v.normalize(); c.set(t.x + v.x * d * 0.95, t.y + d * 0.18, t.z + v.z * d * 0.95); }
    this.dirty = true;
  },
  /** lift a unit a little and tint it while it is being moved */
  highlight(id, on) {
    const ug = this.pickables?.find((o) => o.userData.unitId === id);
    if (!ug) return;
    ug.position.y = on ? 1.5 : 0;
    ug.traverse((o) => { if (o.isMesh && o.material?.emissive && !o.userData.led) { o.material.emissive.set(on ? 0x2a4d33 : 0x000000); o.material.emissiveIntensity = on ? 0.35 : 0; } });
    this.dirty = true;
  },
  /** a still image of the current view at w × h pixels (PNG data URL) */
  snapshot(w, h, refit = false, frame = true) {
    const r = this.ren, c = this.cam;
    const old = r.getSize(new this.three.Vector2()), pr = r.getPixelRatio(), asp = c.aspect;
    const keepPos = c.position.clone(), keepT = this.ctl.target.clone(), keepNF = [c.near, c.far];
    r.setPixelRatio(1);
    r.setSize(w, h, false);
    c.aspect = w / h; c.updateProjectionMatrix();
    if (refit) { this.update(true); c.aspect = w / h; c.updateProjectionMatrix(); }
    const hide = [...(this.selGlass || []), this.selFoot].filter(Boolean);
    for (const o of hide) o.visible = false;
    if (frame) this.fitTight(w / h, 0.05, frame.isBox3 ? frame : null);
    this.cutaway();
    this.usePost() ? this.postFx.renderTo(w, h) : r.render(this.scene, c);
    const url = r.domElement.toDataURL("image/png");
    for (const o of hide) o.visible = true;
    r.setPixelRatio(pr);
    r.setSize(old.x, old.y, false);
    c.position.copy(keepPos); this.ctl.target.copy(keepT); c.lookAt(keepT);
    [c.near, c.far] = keepNF;
    c.aspect = asp; c.updateProjectionMatrix();
    this.postFx?.resize();
    this.dirty = true;
    return url;
  },
  /** aim the camera so the whole design fills the picture (same viewing direction, tight margins) */
  fitTight(aspect, margin = 0.05, fixed = null) {
    const THREE = this.three, c = this.cam;
    if (!this.group) return;
    const box = fixed ? fixed.clone() : new THREE.Box3();
    if (!fixed) this.group.traverse((o) => { if ((o.isMesh || o.isLineSegments) && o.visible && !o.userData.selFoot && !(this.selGlass || []).includes(o) && o.geometry) { o.geometry.computeBoundingBox?.(); const b = o.geometry.boundingBox; if (b) box.union(b.clone().applyMatrix4(o.matrixWorld)); } });
    if (box.isEmpty()) return;
    this.frameBox = box.clone();
    const ctr = box.getCenter(new THREE.Vector3());
    const dir = c.position.clone().sub(this.ctl.target);
    if (dir.lengthSq() < 1e-6) dir.set(-0.42, 0.38, 0.85);
    dir.normalize();
    c.aspect = aspect; c.updateProjectionMatrix();
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    let dist = box.getSize(new THREE.Vector3()).length() * 1.5 + 10;
    const tgt = ctr.clone();
    for (let it = 0; it < 6; it++) {
      c.position.copy(tgt).addScaledVector(dir, dist);
      c.lookAt(tgt); c.updateMatrixWorld(true);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of corners) { const q = p.clone().project(c); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      const k = Math.max((x1 - x0) / 2, (y1 - y0) / 2) / (1 - margin);
      // re-centre in the picture plane, then scale the distance
      const tanV = Math.tan((c.fov * Math.PI) / 360), tanH = tanV * c.aspect;
      const right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
      tgt.addScaledVector(right, ((x0 + x1) / 2) * dist * tanH * 0.8).addScaledVector(up, ((y0 + y1) / 2) * dist * tanV * 0.8);
      dist *= k;
    }
    c.position.copy(tgt).addScaledVector(dir, dist);
    c.lookAt(tgt);
    c.near = Math.max(1, dist / 200); c.far = dist * 20; c.updateProjectionMatrix();
    this.ctl.target.copy(tgt);
  },
  /** the floor point (room cm x/z) under the pointer */
  floorAt(clientX, clientY) {
    const THREE = this.three;
    const rc = this.ren.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((clientX - rc.left) / rc.width) * 2 - 1, -((clientY - rc.top) / rc.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.cam);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? [p.x, p.z] : null;
  },
  movePicked(id, pose) {
    const ug = this.pickables?.find((o) => o.userData.unitId === id);
    if (!ug) return;
    ug.position.set(pose.x, 0, pose.z);
    ug.rotation.y = pose.rot;
    this.dirty = true;
    if (this.selFoot) {
      ug.updateMatrixWorld(true);
      const sb = new this.three.Box3().setFromObject(ug);
      this.selFoot.geometry.dispose();
      this.selFoot.geometry = new this.three.PlaneGeometry(sb.max.x - sb.min.x + 8, sb.max.z - sb.min.z + 8);
      this.selFoot.position.set((sb.min.x + sb.max.x) / 2, 0.4, (sb.min.z + sb.max.z) / 2);
      this.selFoot.material.opacity = 0.7;
      const bc = sb.getCenter(new this.three.Vector3());
      for (const o of this.selGlass || []) o.position.copy(bc);
    }
    this.group?.children.forEach((o) => { if (o.type === "BoxHelper") o.update(); });
  },
};

// ------------------------------------------------------------------ production: pieces & cut
/** every sheet piece of a project with a stable key (unit index + part id) */
/** unit codes: K = kitchen, D = dressing, P = other furniture + a running number (K01, K02, D01 …).
 * Stored on the unit, so editing or deleting another unit never renumbers it. */
const CODE_PREFIX = { kitchen: "K", dressing: "D", panel: "P" };
function ensureCodes(project) {
  if (!project?.units) return;
  const used = new Set(project.units.map((u) => u.code).filter(Boolean));
  for (const u of project.units) {
    if (u.code) continue;
    const pre = CODE_PREFIX[u.kind] || "P";
    let n = 1;
    while (used.has(pre + String(n).padStart(2, "0"))) n++;
    u.code = pre + String(n).padStart(2, "0");
    used.add(u.code);
  }
}
const unitCode = (u) => u.code || "";
/** every sheet piece of a project; key = the piece number printed everywhere (K01-07) */
function projectPieces(project) {
  ensureCodes(project);
  const out = [];
  project.units.forEach((u, ui_) => {
    const r = R(u);
    if (!r.ok) return;
    let n = 0;
    for (const pt of r.parts) {
      if (!pt.cut_piece || !pt.label) continue;
      const key = `${u.code}-${String(++n).padStart(2, "0")}`;
      out.push({ key, code: key, ucode: u.code, unit: u.name, unitIdx: ui_, pt, lb: pt.label, mname: r.names[pt.material] || pt.material,
        color: r.colors?.[pt.material] || "#ccc", lib: r.libOf(pt.material) });
    }
  });
  return out;
}
/** piece number of part `pt` of unit `u` (same numbering as projectPieces) */
function partCodes(u, r) {
  const m = new Map();
  let n = 0;
  for (const pt of r.parts) if (pt.cut_piece && pt.label) m.set(pt, `${u.code}-${String(++n).padStart(2, "0")}`);
  return m;
}
function cutGroups(project) {
  const thick = Catalog.machines().thicknesses;
  const groups = new Map();
  const outside = [];
  for (const pc of projectPieces(project)) {
    const { lb } = pc;
    if (STONE(pc.lib) || ["glass", "mirror"].includes(pc.pt.material)) { outside.push(pc); continue; }
    const layers = thick.some((t) => Math.abs(t - lb.t) < 0.01) ? [lb.t] : Catalog.laminationFor(lb.t) || [lb.t];
    const wood = (pc.lib || "").startsWith("wood_");
    layers.forEach((t, li) => {
      const key = `${pc.mname} — ${Math.round(t * 10)} مم`;
      if (!groups.has(key)) groups.set(key, { key, color: pc.color, parts: [] });
      const name = `${pc.unit}: ${pc.pt.name}${layers.length > 1 ? ` (طبقة ${li + 1})` : ""}`;
      groups.get(key).parts.push(wood ? { name, w: lb.h, h: lb.w, rotate: false, key: pc.key, code: pc.key + (layers.length > 1 ? `/${li + 1}` : "") } : { name, w: lb.w, h: lb.h, key: pc.key, code: pc.key + (layers.length > 1 ? `/${li + 1}` : "") });
    });
  }
  return { groups: [...groups.values()], outside };
}

let worker = null;
try { worker = new Worker(new URL("./cutworker.js", import.meta.url), { type: "module" }); } catch { worker = null; }
let cutReq = 0, cutData = null, cutKey = "";
function runCut(after) {
  const { groups, outside } = cutGroups(state.project);
  const o = state.cutOpts;
  const opts = { sheetW: +o.sheetW, sheetH: +o.sheetH, kerf: +o.kerf, trim: +o.trim };
  const key = JSON.stringify([groups.map((g) => [g.key, g.parts]), opts]);
  if (key === cutKey && cutData && !cutData.busy) { after ? after() : drawCut(); return; }
  cutKey = key;
  const id = ++cutReq;
  cutData = { busy: true, groups, outside, opts, results: null };
  if (!after) drawCut();
  const plain = () => groups.map((g) => ({ key: g.key, result: optimize(g.parts.map(({ name, w, h, rotate }) => ({ name, w, h, rotate })), { ...opts, timeCap: 6 }) }));
  const done = (out) => {
    if (id !== cutReq) return;
    cutData = { busy: false, groups, outside, opts, results: Object.fromEntries(out.map((x) => [x.key, x.result])) };
    after ? after() : state.tab === "cut" && drawCut();
  };
  if (worker) {
    worker.onmessage = (e) => { if (e.data.id === id) done(e.data.out); };
    worker.onerror = () => { worker = null; setTimeout(() => done(plain()), 30); };
    worker.postMessage({ id, groups: groups.map((g) => ({ key: g.key, parts: g.parts.map(({ name, w, h, rotate }) => ({ name, w, h, rotate })) })), opts });
  } else setTimeout(() => done(plain()), 30);
}
/** piece key -> "لوح n — material" from the current cut plan */
function sheetIndex() {
  const m = {};
  if (!cutData?.results) return m;
  for (const g of cutData.groups) {
    const res = cutData.results[g.key];
    res?.sheets.forEach((s, si) => s.placements.forEach((pl) => { const k = g.parts[pl.index]?.key; if (k && !m[k]) m[k] = `لوح ${si + 1} · ${g.key}`; }));
  }
  return m;
}

function drawCut() {
  const el = $("#v-cut");
  const o = state.cutOpts;
  let h = `<div class="cuthead"><div><h2>خطة القص — ${esc(state.project.name)}</h2><p class="hint">كل خامة وسمك لوحدها، بنفس محرك القص بتاع البلاجن (قصات جيلوتين تتنفذ على المنشار).</p></div>
    <div class="cutopts">${[["sheetW", "طول اللوح", 1], ["sheetH", "عرض اللوح", 1], ["kerf", "سلاح المنشار", 0.05], ["trim", "تشذيب الحرف", 0.5]].map(([k, l, s]) => `<label class="f"><span>${l}</span><input type="number" step="${s}" data-co="${k}" value="${o[k]}"></label>`).join("")}</div></div>`;
  if (!cutData || cutData.busy) { el.innerHTML = h + `<div class="busy"><span class="spin" aria-hidden="true"></span>بيحسب أحسن توزيع للقطع…</div>`; return; }
  const { groups, outside, results } = cutData;
  let sheets = 0, lb = 0;
  for (const g of groups) { sheets += results[g.key].stats.sheets; lb += results[g.key].stats.lower_bound; }
  h += `<div class="kpis"><div><b>${sheets}</b><span>لوح كامل</span></div><div><b>${lb}</b><span>أقل عدد نظري</span></div><div><b>${groups.length}</b><span>خامة/سمك</span></div><div><b>${groups.reduce((a, g) => a + g.parts.length, 0)}</b><span>قطعة على المنشار</span></div></div>`;
  for (const g of groups) {
    const res = results[g.key];
    const st = res.stats;
    h += `<section class="mgroup"><div class="mg-h"><i style="background:${g.color}"></i><h3>${esc(g.key)}</h3><span class="pill">${st.sheets} لوح</span><span class="pill">استغلال ${Math.round(st.utilization * 100)}%</span><span class="pill soft">${st.parts} قطعة</span></div>`;
    if (res.oversized.length) h += `<p class="e">قطع أكبر من اللوح: ${res.oversized.map((x) => esc(x.name)).join("، ")}</p>`;
    h += `<div class="sheets">${res.sheets.map((s, si) => sheetSvg(s, si, g)).join("")}</div></section>`;
  }
  if (outside.length) {
    h += `<section class="mgroup"><div class="mg-h"><h3>بتتطلب من المورّد (رخام / زجاج / مرايا)</h3></div><div class="tblwrap"><table class="tbl"><thead><tr><th>الرقم</th><th>الوحدة</th><th>القطعة</th><th>الخامة</th><th>المقاس</th></tr></thead><tbody>`;
    for (const x of outside) h += `<tr><td class="num"><b>${esc(x.key)}</b></td><td>${esc(x.unit)}</td><td>${esc(x.pt.name)}</td><td>${esc(x.mname)}</td><td class="num">${n1(x.lb.w)} × ${n1(x.lb.h)} × ${n1(x.lb.t)}</td></tr>`;
    h += `</tbody></table></div></section>`;
  }
  if (!groups.length && !outside.length) h += `<p class="hint">مفيش قطع للقص — ضيف وحدات في التصميم.</p>`;
  el.innerHTML = h;
}
function sheetSvg(s, si, g) {
  let svg = `<svg viewBox="-2 -2 ${s.w + 4} ${s.h + 4}" role="img" aria-label="لوح ${si + 1}"><rect x="0" y="0" width="${s.w}" height="${s.h}" class="sh"/>`;
  for (const o of s.offcuts) svg += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" class="off"/>`;
  for (const pl of s.placements) {
    const fs = Math.max(2.6, Math.min(5.5, Math.min(pl.w, pl.h) / 4.2));
    const label = pl.name.split(": ").pop();
    const code = g.parts[pl.index]?.code || "";
    const maxCh = Math.max(3, Math.floor(pl.w / (fs * 0.62)));
    const txt = label.length > maxCh ? label.slice(0, maxCh - 1) + "…" : label;
    svg += `<rect x="${pl.x}" y="${pl.y}" width="${pl.w}" height="${pl.h}" class="pc" style="fill:${g.color}"/>`;
    const dims = `${n1(pl.rotated ? pl.orig_h : pl.orig_w)}×${n1(pl.rotated ? pl.orig_w : pl.orig_h)}`;
    if (pl.w > 14 && pl.h > 10) svg += `<text x="${pl.x + pl.w / 2}" y="${pl.y + pl.h / 2 - fs * 1.1}" font-size="${fs * 1.1}" text-anchor="middle" dominant-baseline="middle" class="pcode">${esc(code)}</text><text x="${pl.x + pl.w / 2}" y="${pl.y + pl.h / 2 + fs * 0.1}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle">${esc(txt)}<tspan x="${pl.x + pl.w / 2}" dy="${fs * 1.15}" class="dim">${dims}</tspan></text>`;
    else if (pl.w > 8 && pl.h > 5) svg += `<text x="${pl.x + pl.w / 2}" y="${pl.y + pl.h / 2}" font-size="${Math.min(fs, pl.h / 2)}" text-anchor="middle" dominant-baseline="middle" class="pcode">${esc(code)}</text>`;
  }
  svg += "</svg>";
  const steps = s.cuts.slice(0, 40).map((c) => `<li><b>${c.dir === "h" ? "قصة بالعرض" : "قصة بالطول"}</b> ${n1(c.size)} سم <small>من جزء ${n1(c.from_w)}×${n1(c.from_h)}</small></li>`).join("");
  return `<figure class="sheet"><figcaption><b>لوح ${si + 1}</b>${s.stock === "remnant" ? '<span class="pill gold">باقي مخزن</span>' : ""}<span>${s.w}×${s.h}</span><span>${Math.round(s.util * 100)}%</span></figcaption>${svg}
    <details><summary>خطوات القص (${s.cuts.length})</summary><ol>${steps}</ol>${s.offcuts.length ? `<p class="hint">بواقي تتشال: ${s.offcuts.map((o) => `${o.w}×${o.h}`).join("، ")}</p>` : ""}</details></figure>`;
}
$("#v-cut").addEventListener("change", (e) => {
  const k = e.target.dataset.co;
  if (!k) return;
  state.cutOpts[k] = +e.target.value;
  save();
  runCut();
});

// ------------------------------------------------------------------ parts & BOM
function drawParts() {
  const el = $("#v-parts");
  const hw = {};
  let h = `<div class="cuthead"><div><h2>القطع والحصر — ${esc(state.project.name)}</h2><p class="hint">قايمة القطع لكل وحدة، والهاردوير مجمّع للمشروع كله.</p></div></div><div class="pcols"><div class="pmain">`;
  for (const u of state.project.units) {
    const r = R(u);
    h += `<section class="mgroup"><div class="mg-h"><span class="ucode">${esc(unitCode(u))}</span><h3>${esc(u.name)}</h3><span class="pill soft">${esc(r.label || "")}</span>${r.ok ? `<span class="pill">${r.pieces} قطعة</span><span class="pill soft">${r.banding} م شريط</span>` : '<span class="pill bad">فيها أخطاء</span>'}</div>`;
    if (!r.ok) { h += r.errors.map((t) => `<p class="e">${esc(t)}</p>`).join("") + "</section>"; continue; }
    for (const [k, v] of Object.entries(r.hardware)) hw[k] = Math.round(((hw[k] || 0) + v) * 100) / 100;
    const codes = partCodes(u, r);
    h += `<div class="tblwrap"><table class="tbl"><thead><tr><th>الرقم</th><th>القطعة</th><th>الخامة</th><th>عرض</th><th>طول</th><th>سمك</th><th>شريط</th><th>أخرام</th></tr></thead><tbody>`;
    for (const pt of r.parts) {
      if (!pt.cut_piece || !pt.label) continue;
      const lb = pt.label, b = lb.banded;
      const band = pt.band_all_sides ? "كل الحروف" : ["left", "right", "bottom", "top"].filter((k) => b[k]).length + " حرف";
      const chk = pt.checks?.[0];
      h += `<tr><td class="num"><b>${esc(codes.get(pt) || "")}</b></td><td>${esc(pt.name)}${chk ? `<small class="w">${esc(chk)}</small>` : ""}</td><td>${esc(r.names[pt.material] || pt.material)}</td><td class="num">${n1(lb.w)}</td><td class="num">${n1(lb.h)}</td><td class="num">${n1(lb.t)}</td><td class="nw">${band}</td><td class="num">${pt.holes?.length || ""}</td></tr>`;
    }
    h += `</tbody></table></div>`;
    const notes = [...r.warnings.map((t) => `<p class="w">${esc(t)}</p>`), ...r.notes.map((t) => `<p class="n">${esc(t)}</p>`)];
    if (notes.length) h += `<details><summary>ملاحظات الورشة (${notes.length})</summary>${notes.join("")}</details>`;
    h += `</section>`;
  }
  h += `</div><aside class="pside"><section class="mgroup"><div class="mg-h"><h3>الهاردوير</h3></div><table class="tbl"><tbody>`;
  for (const [k, v] of Object.entries(hw)) if (v) h += `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`;
  el.innerHTML = h + `</tbody></table></section></aside></div>`;
}

// ------------------------------------------------------------------ labels
function pieceSvg(pc, size = 1) {
  const { lb, pt } = pc;
  const W = 120, H = 70;
  const s = Math.min((W - 16) / lb.w, (H - 16) / lb.h);
  const w = lb.w * s, hh = lb.h * s, x0 = (W - w) / 2, y0 = (H - hh) / 2;
  const b = lb.banded;
  const all = pt.band_all_sides;
  let g = `<rect x="${x0}" y="${y0}" width="${w}" height="${hh}" fill="#f4f4f2" stroke="#111" stroke-width="0.8"/>`;
  const edge = (on, x1, y1, x2, y2) => (on || all ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1f6d3d" stroke-width="3"/>` : "");
  g += edge(b.left, x0, y0, x0, y0 + hh) + edge(b.right, x0 + w, y0, x0 + w, y0 + hh) + edge(b.bottom, x0, y0 + hh, x0 + w, y0 + hh) + edge(b.top, x0, y0, x0 + w, y0);
  if (lb.groove) {
    const gr = lb.groove;
    g += gr.axis === "vertical" ? `<line x1="${x0 + gr.ratio * w}" y1="${y0}" x2="${x0 + gr.ratio * w}" y2="${y0 + hh}" stroke="#b07d12" stroke-width="1" stroke-dasharray="3 2"/>`
      : `<line x1="${x0}" y1="${y0 + (1 - gr.ratio) * hh}" x2="${x0 + w}" y2="${y0 + (1 - gr.ratio) * hh}" stroke="#b07d12" stroke-width="1" stroke-dasharray="3 2"/>`;
  }
  for (const ho of pt.holes || []) {
    const cx = x0 + ho.w * w, cy = y0 + (1 - ho.h) * hh;
    g += ho.kind === "cam" ? `<circle cx="${cx}" cy="${cy}" r="2.2" fill="none" stroke="#111" stroke-width="0.8"/>`
      : ho.kind === "pin" ? `<rect x="${cx - 1}" y="${cy - 1}" width="2" height="2" fill="#555"/>` : `<circle cx="${cx}" cy="${cy}" r="1.3" fill="#111"/>`;
  }
  for (const r of pt.door_label?.hinge_ratios || []) {
    const side = pt.door_label.hinge_side;
    if (side === "top") g += `<circle cx="${x0 + r * w}" cy="${y0 + 5}" r="3" fill="none" stroke="#a32a2a" stroke-width="1"/>`;
    else g += `<circle cx="${side === "left" ? x0 + 5 : x0 + w - 5}" cy="${y0 + (1 - r) * hh}" r="3" fill="none" stroke="#a32a2a" stroke-width="1"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="${W * size}" height="${H * size}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}
function qrSvg(text, px) {
  if (typeof qrcode !== "function") return "";
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true }).replace("<svg ", `<svg width="${px}" height="${px}" `);
}
const pieceUrl = (pid, key) => `${APP_URL}#w-${pid}.${key}`;
/** Code 128-B barcode of `text` as SVG bars (readable by any workshop scanner) */
const C128 = ["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"];
function barcodeSvg(text, wmm = 40, hmm = 6) {
  const codes = [104];
  for (const ch of String(text)) { const c = ch.charCodeAt(0) - 32; if (c >= 0 && c < 95) codes.push(c); }
  let sum = 104;
  codes.slice(1).forEach((c, i) => { sum += c * (i + 1); });
  codes.push(sum % 103, 106);
  let x = 10, bars = "";
  for (const c of codes) {
    const pat = C128[c];
    for (let i = 0; i < pat.length; i++) { const w = +pat[i]; if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="40"/>`; x += w; }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 10} 40" width="${wmm}mm" height="${hmm}mm" preserveAspectRatio="none" fill="#000">${bars}</svg>`;
}

function labelsHtml(pieces, pid, sheets, fmt) {
  const a4 = fmt === "a4";
  const card = (pc) => {
    const b = pc.lb.banded;
    const bands = pc.pt.band_all_sides ? "شريط: كل الحروف" : `شريط: ${["left", "right", "bottom", "top"].filter((k) => b[k]).length} حرف`;
    const holes = (pc.pt.holes || []).length;
    return `<div class="lab"><div class="top"><span class="big">${esc(pc.key)}</span><b>${esc(pc.pt.name)}</b><span class="dim">${n1(pc.lb.w)} × ${n1(pc.lb.h)} × ${n1(pc.lb.t)}</span></div>
      <div class="mid"><div class="dia">${pieceSvg(pc, 1)}</div><div class="side">${qrSvg(pieceUrl(pid, pc.key), 62)}</div></div>
      <div class="bc">${barcodeSvg(pc.key, 38, 5)}</div>
      <div class="bot"><span><b>${esc(pc.ucode)}</b> ${esc(pc.unit)}</span><span>${esc(pc.mname)}</span><span>${bands}${holes ? ` · ${holes} خرم` : ""}</span><span>${esc(sheets[pc.key] || "")}</span></div></div>`;
  };
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ملصقات ${esc(state.project.name)}</title><style>
  @page { size: ${a4 ? "A4" : "60mm 40mm"}; margin: ${a4 ? "8mm 6mm" : "0"}; }
  body { margin: 0; font-family: "Segoe UI", Tahoma, "Geeza Pro", sans-serif; color: #111; }
  .wrap { display: ${a4 ? "grid" : "block"}; grid-template-columns: repeat(3, 63mm); gap: 2mm 3mm; justify-content: center; }
  .lab { width: 60mm; height: 40mm; box-sizing: border-box; padding: 1.5mm 2mm; border: ${a4 ? "0.2mm dashed #999" : "0"}; display: flex; flex-direction: column; gap: 0.8mm; overflow: hidden; break-inside: avoid; ${a4 ? "" : "page-break-after: always;"} }
  .top { display: flex; justify-content: space-between; gap: 2mm; font-size: 8.5pt; line-height: 1.15; }
  .top b { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .dim { font-weight: 700; white-space: nowrap; direction: ltr; }
  .mid { flex: 1; display: flex; gap: 1.5mm; min-height: 0; align-items: center; }
  .dia { flex: 1; min-width: 0; } .dia svg { width: 100%; height: auto; max-height: 21mm; }
  .side svg { width: 16mm; height: 16mm; }
  .bot { display: flex; flex-wrap: wrap; gap: 0 2mm; font-size: 6.2pt; line-height: 1.25; color: #333; }
  .code { direction: ltr; color: #777; }
  .big { font-size: 11pt; font-weight: 800; direction: ltr; background: #111; color: #fff; padding: 0 1.5mm; border-radius: 1mm; }
  .bc { display: flex; justify-content: center; height: 5mm; } .bc svg { display: block; }
  </style></head><body><div class="wrap">${pieces.map(card).join("")}</div></body></html>`;
}

// ------------------------------------------------------------------ shop tab (owner): share + labels + progress
function drawShop() {
  const el = $("#v-shop");
  const pid = state.project.id;
  const online = !!(cloud.db && cloud.me);
  const pieces = projectPieces(state.project);
  const prog = ui.ownerProgress || {};
  const doneN = pieces.filter((pc) => (prog[pc.key] || 0) >= 4).length;
  const appr = ui.ownerApproval;
  let h = `<div class="cuthead"><div><h2>الورشة والعميل — ${esc(state.project.name)}</h2><p class="hint">ابعت التصميم للعميل يعتمده، واطبع الملصقات، وتابع كل قطعة في الورشة.</p></div></div>
  <div class="shopgrid">
    <section class="mgroup"><div class="mg-h"><h3>العميل</h3>${appr?.status === "approved" ? `<span class="pill">${ICON.check} اتعمد ${appr.at ? new Date(appr.at).toLocaleDateString("ar-EG") : ""}</span>` : `<span class="pill soft">لسه ما اتعمدش</span>`}</div>
      <p class="hint">بيتبعت نسخة من التصميم دلوقتي. لو عدّلت بعد كده دوس "حدّث النسخة المبعوتة".</p>
      ${online ? `<div class="btnrow"><button class="primary" data-publish="client">${ICON.share}${ui.sharedAt ? "حدّث النسخة المبعوتة" : "جهّز لينك العميل"}</button></div>
      ${ui.sharedAt ? linkBox(`${APP_URL}#c-${pid}`) : ""}` : `<p class="e">المشاركة محتاجة تفتح التطبيق وانت مسجّل دخول.</p>`}
    </section>
    <section class="mgroup"><div class="mg-h"><h3>الورشة</h3><span class="pill soft">${doneN} / ${pieces.length} قطعة خلصت</span></div>
      <p class="hint">كل ملصق عليه QR. العامل يصوّره بكاميرا الموبايل، تفتحله القطعة ويعلّم المرحلة اللي خلصها.</p>
      <div class="btnrow"><label class="f"><span>مقاس الملصقات</span><select id="labelFmt"><option value="a4" ${state.labelFmt === "a4" ? "selected" : ""}>A4 — 21 ملصق في الورقة</option><option value="roll" ${state.labelFmt === "roll" ? "selected" : ""}>رول 60×40 مم</option></select></label>
      <button class="primary" data-labels>ملف الملصقات PDF</button></div>
      ${online ? `<div class="btnrow"><button class="ghost2" data-publish="work">${ICON.share}${ui.sharedAt ? "حدّث نسخة الورشة" : "جهّز لينك الورشة"}</button></div>${ui.sharedAt ? linkBox(`${APP_URL}#w-${pid}`) : ""}` : ""}
      <p class="hint" id="labelMsg"></p>
    </section>
  </div>
  ${quoteHtml()}
  <section class="mgroup"><div class="mg-h"><h3>معاينة الملصقات</h3><span class="pill soft">${pieces.length} ملصق</span></div><div class="labprev">`;
  const sheets = sheetIndex();
  for (const pc of pieces.slice(0, 24)) {
    const st = prog[pc.key] || 0;
    h += `<div class="labcard"><div class="lt"><span class="ucode">${esc(pc.key)}</span><b>${esc(pc.pt.name)}</b><span class="num">${n1(pc.lb.w)}×${n1(pc.lb.h)}</span></div><div class="lm">${pieceSvg(pc, 1)}<span class="qr">${qrSvg(pieceUrl(pid, pc.key), 56)}</span></div>
      <div class="lb"><span>${esc(pc.unit)}</span><span>${esc(sheets[pc.key] || pc.mname)}</span></div><div class="stg">${STAGES.map((s, i) => `<i class="${i < st ? "on" : ""}">${s}</i>`).join("")}</div></div>`;
  }
  if (pieces.length > 24) h += `<p class="hint">… و${pieces.length - 24} ملصق تاني في الملف.</p>`;
  el.innerHTML = h + `</div></section>`;
}
const linkBox = (url) => `<div class="linkbox"><input readonly value="${esc(url)}" aria-label="اللينك"><button class="ghost2" data-copy="${esc(url)}">انسخ</button></div>`;

$("#v-shop").addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "labelFmt") { state.labelFmt = t.value; save(); return; }
  if (t.dataset.price || t.dataset.pricet) {
    const P = priceDefaults();
    if (t.dataset.pricet) P[t.dataset.pricet] = t.value;
    else { const [a, b] = t.dataset.price.split(/\.(.+)/); if (b) { P[a] ??= {}; P[a][b] = +t.value || 0; } else P[a] = +t.value || 0; }
    save();
    drawShop();
  }
});
$("#v-shop").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.copy) {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "اتنسخ"; } catch { b.previousElementSibling.select(); }
  } else if (b.dataset.publish) {
    b.disabled = true;
    await publishShared();
    b.disabled = false;
    drawShop();
  } else if (b.hasAttribute("data-labels")) {
    const msg = $("#labelMsg");
    msg.textContent = "بيجهّز الملصقات…";
    b.disabled = true;
    try { const r = await exportLabelsPdf(); msg.textContent = r === "declined" ? "" : "افتح الملف واطبعه."; } catch { msg.textContent = "ما كملش — جرّب تاني."; }
    b.disabled = false;
  } else if (b.hasAttribute("data-quote")) {
    const msg = $("#quoteMsg");
    msg.textContent = "بيجهّز العرض…";
    b.disabled = true;
    try { const r = await exportQuotePdf(); msg.textContent = r === "declined" ? "" : "تم ✓"; } catch (err) { msg.textContent = err?.message?.length < 50 ? err.message : "ما كملش."; }
    b.disabled = false;
  }
});
async function publishShared() {
  if (!cloud.db) return;
  const p = state.project;
  try {
    await cloud.db.doc(`shared/${p.id}`).set({ name: p.name, units: p.units, room: p.room || null, mats: p.mats || [], sharedAt: new Date().toISOString() });
    ui.sharedAt = new Date().toISOString();
  } catch { alertBar("ما قدرتش أبعت النسخة — جرّب تاني."); }
}
function alertBar(t) {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = t;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}
let ownerSubs = [];
function watchOwnerShared() {
  ownerSubs.forEach((f) => f());
  ownerSubs = [];
  ui.ownerApproval = null; ui.ownerProgress = {}; ui.sharedAt = null;
  if (!cloud.db) return;
  const pid = state.project.id;
  ownerSubs.push(cloud.db.doc(`approvals/${pid}`).onSnapshot((s) => { ui.ownerApproval = s.exists ? s.data() : null; if (state.tab === "shop") drawShop(); }, () => {}));
  ownerSubs.push(cloud.db.doc(`progress/${pid}`).onSnapshot((s) => { ui.ownerProgress = s.exists ? s.data().stages || {} : {}; if (state.tab === "shop") drawShop(); }, () => {}));
  ownerSubs.push(cloud.db.doc(`shared/${pid}`).onSnapshot((s) => { ui.sharedAt = s.exists ? s.data().sharedAt : null; if (state.tab === "shop") drawShop(); }, () => {}));
}

// ------------------------------------------------------------------ client view (#c-<pid>)
function drawClient() {
  const el = $("#v-client");
  const sp = ui.sharedProject;
  if (!sp) { el.innerHTML = `<div class="busy"><span class="spin" aria-hidden="true"></span>بيفتح التصميم…</div>`; return; }
  if (sp === "missing") { el.innerHTML = `<div class="emptyp"><h2>التصميم مش متاح</h2><p class="hint">اللينك ده لسه ما اتبعتش أو اتشال. اطلب من NOVERA لينك جديد.</p></div>`; return; }
  if (!$("#cl3d")) {
    el.innerHTML = `<div class="cl-stage"><div id="cl3d" class="view3d"><div class="fallback" hidden></div></div></div><aside class="cl-side" data-comment-target></aside>`;
    view.init("#cl3d");
  }
  clientSide();
  view.update(true);
}
function clientSide() {
  const sp = ui.sharedProject;
  const u = ui.clientUnit;
  const appr = ui.approval;
  let h = `<p class="hint">تصميم من NOVERA</p><h2>${esc(sp.name)}</h2><div class="strip col">`;
  if (sp.units.length > 1) h += `<button class="uchip ${ui.clientWhole ? "on" : ""}" data-cwhole><b>التصميم كله</b><small>${sp.units.length} وحدات مع بعض</small></button>`;
  for (const x of sp.units) {
    const r = R(x);
    h += `<button class="uchip ${x.id === u?.id && !ui.clientWhole ? "on" : ""}" data-cunit="${x.id}"><b>${esc(x.name)}</b><small>${r.ok ? `${dimsText(x, r)} سم` : ""}</small></button>`;
  }
  h += `</div>`;
  if (u) {
    const r = R(u);
    if (r.ok) {
      h += `<h3 class="sub">الخامات</h3><div class="mats ro">`;
      const used = new Set(r.parts.filter((x) => x.cut_piece).map((x) => x.material));
      for (const k of used) h += `<div class="mrow"><i style="background:${r.colors[k]}"></i><span><b>${esc((u.kind === "dressing" ? D.MATERIAL_KEYS[k]?.label : u.kind === "kitchen" ? KU.K_MATS[k]?.[0] : PANEL_MATS[k]) || k)}</b><small>${esc(r.names[k] || "")}</small></span></div>`;
      h += `</div>`;
    }
  }
  h += `<div class="approve">${appr?.status === "approved" ? `<p class="okmsg">${ICON.check} التصميم اتعمد. شكراً!</p>` : `<button class="primary big" data-approve>اعتماد التصميم</button>`}
    <button class="ghost2 big" data-note>عندي ملاحظة</button><p class="hint" id="clMsg"></p></div>`;
  $(".cl-side").innerHTML = h;
}
$("#v-client").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-cwhole")) { ui.clientWhole = true; clientSide(); view.update(true); }
  else if (b.dataset.cunit) { ui.clientWhole = false; ui.clientUnit = ui.sharedProject.units.find((x) => x.id === b.dataset.cunit); clientSide(); view.update(true); }
  else if (b.hasAttribute("data-approve")) {
    try {
      await cloud.db.doc(`approvals/${ui.sharedPid}`).set({ status: "approved", by: cloud.me || null, at: new Date().toISOString() });
    } catch { $("#clMsg").textContent = "الاعتماد محتاج صلاحية \"مساهم\" على اللينك — اكتب ملاحظة بالموافقة بدل كده."; }
  } else if (b.hasAttribute("data-note")) {
    const r = cloud.comments ? await cloud.comments.openComposer({ element: $(".cl-side") }).catch(() => null) : null;
    if (!r?.opened) $("#clMsg").textContent = "استخدم زرار التعليقات في الصفحة واكتب ملاحظتك.";
  }
});

// ------------------------------------------------------------------ workshop view (#w-<pid>[.<key>])
function drawWork() {
  const el = $("#v-work");
  const sp = ui.sharedProject;
  if (!sp) { el.innerHTML = `<div class="busy"><span class="spin" aria-hidden="true"></span>بيفتح المشروع…</div>`; return; }
  if (sp === "missing") { el.innerHTML = `<div class="emptyp"><h2>المشروع مش متاح</h2><p class="hint">لسه ما اتبعتش للورشة.</p></div>`; return; }
  const pieces = projectPieces(sp);
  const prog = ui.progress;
  const canWrite = ui.canWrite !== false;
  if (ui.piece) {
    const pc = pieces.find((x) => x.key === ui.piece);
    if (!pc) { el.innerHTML = `<div class="emptyp"><h2>القطعة مش موجودة</h2><p class="hint">ممكن التصميم اتعدّل بعد ما الملصق اتطبع.</p><button class="add" data-back>كل القطع</button></div>`; return; }
    const st = prog[pc.key] || 0;
    const b = pc.lb.banded;
    el.innerHTML = `<div class="wk-piece"><button class="ghost2" data-back>${ICON.cycle} كل القطع</button>
      <section class="mgroup"><div class="mg-h"><h3>${esc(pc.pt.name)}</h3><span class="pill">${n1(pc.lb.w)} × ${n1(pc.lb.h)}</span></div>
      <div class="kv"><span>الوحدة</span><b>${esc(pc.unit)}</b><span>الخامة</span><b>${esc(pc.mname)}</b><span>السمك</span><b>${n1(pc.lb.t * 10)} مم</b>
      <span>الشريط</span><b>${pc.pt.band_all_sides ? "كل الحروف" : ["left", "right", "bottom", "top"].filter((k) => b[k]).map((k) => ({ left: "شمال", right: "يمين", bottom: "تحت", top: "فوق" })[k]).join("، ") || "من غير"}</b>
      <span>الأخرام</span><b>${(pc.pt.holes || []).length}</b><span>الكود</span><b class="num">${esc(pc.key)}</b></div>
      <div class="wk-dia">${pieceSvg(pc, 2.6)}</div>${pc.pt.note ? `<p class="n">${esc(pc.pt.note)}</p>` : ""}</section>
      <div class="stages">${STAGES.map((s, i) => `<button class="stage-b ${i < st ? "done" : i === st ? "cur" : ""}" data-stage="${i + 1}" ${canWrite ? "" : "disabled"}>${i < st ? ICON.check : ""}${s}</button>`).join("")}</div>
      ${canWrite ? "" : `<p class="hint">تعليم المراحل محتاج صلاحية "مساهم" على اللينك.</p>`}</div>`;
    return;
  }
  const done = pieces.filter((pc) => (prog[pc.key] || 0) >= 4).length;
  let h = `<div class="cuthead"><div><h2>الورشة — ${esc(sp.name)}</h2><p class="hint">صوّر QR الملصق، أو اختار القطعة من هنا.</p></div><span class="pill">${done} / ${pieces.length} خلصت</span></div><div class="wk-list">`;
  for (const pc of pieces) {
    const st = prog[pc.key] || 0;
    h += `<button class="wk-row" data-piece="${pc.key}"><span><b><span class="ucode">${esc(pc.key)}</span>${esc(pc.pt.name)}</b><small>${esc(pc.unit)} · ${esc(pc.mname)}</small></span><span class="num">${n1(pc.lb.w)}×${n1(pc.lb.h)}</span><span class="stg">${STAGES.map((s, i) => `<i class="${i < st ? "on" : ""}">${s}</i>`).join("")}</span></button>`;
  }
  el.innerHTML = h + `</div>`;
}
$("#v-work").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-back")) { ui.piece = null; history.replaceState(null, "", `#w-${ui.sharedPid}`); drawWork(); }
  else if (b.dataset.piece) { ui.piece = b.dataset.piece; history.replaceState(null, "", `#w-${ui.sharedPid}.${ui.piece}`); drawWork(); }
  else if (b.dataset.stage) {
    const n = +b.dataset.stage;
    const cur = ui.progress[ui.piece] || 0;
    const val = n === cur ? n - 1 : n;
    ui.progress[ui.piece] = val;
    drawWork();
    const ref = cloud.db.doc(`progress/${ui.sharedPid}`);
    try {
      const s = await ref.get();
      if (s.exists) await ref.update({ stages: { [ui.piece]: val } });
      else await ref.set({ stages: { [ui.piece]: val } });
    } catch { ui.canWrite = false; drawWork(); }
  }
});

// ------------------------------------------------------------------ design check (smart warnings)
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(a) / 2; }
/** overlap area of two convex quads (cm²) — Sutherland–Hodgman clip */
function overlapArea(a, b) {
  let out = a;
  for (let i = 0; i < b.length && out.length; i++) {
    const A = b[i], B = b[(i + 1) % b.length];
    const side = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
    const sgn = side(b[(i + 2) % b.length]) >= 0 ? 1 : -1;
    const inp = out; out = [];
    for (let k = 0; k < inp.length; k++) {
      const P = inp[k], Q = inp[(k + 1) % inp.length], sp = side(P) * sgn, sq = side(Q) * sgn;
      if (sp >= 0) out.push(P);
      if (sp * sq < 0) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
  }
  return out.length > 2 ? polyArea(out) : 0;
}
function designChecks(project = state.project) {
  const out = [];
  const add = (level, text, unitId = null) => out.push({ level, text, unitId });
  const room = project.room;
  const poses = projectPoses(project);
  const items = projectItems(project).map((it) => ({ ...it, u: project.units.find((x) => x.id === it.id), pose: poses.get(it.id) })).filter((x) => x.pose);
  const label = (it) => `${it.u.code} ${it.u.name}`;
  // engine errors
  for (const u of project.units) { const r = R(u); if (!r.ok) add("e", `${u.code} ${u.name}: ${r.errors[0] || "فيها أخطاء"}`, u.id); }
  // overlaps (same height band)
  const band = (it) => (it.row === "upper" ? [140, 230] : it.row === "lower" ? [0, 90] : it.row === "free" ? [0, 80] : [0, 240]);
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const A = items[i], B = items[j], [a0, a1] = band(A), [b0, b1] = band(B);
    if (Math.min(a1, b1) <= Math.max(a0, b0)) continue;
    const ov = overlapArea(Room.footprint(A.pose, A.box), Room.footprint(B.pose, B.box));
    if (ov > 30) add("e", `${label(A)} داخلة في ${label(B)} — حرّك واحدة منهم.`, A.id);
  }
  if (room) {
    const segs = Room.segments(room);
    // install clearance on each wall that runs between two walls (NOVERA: leave ~3 cm)
    for (const sg of segs) {
      const on = items.filter((it) => it.pose.wall === sg.id && it.row !== "upper");
      if (!on.length) continue;
      const used = on.reduce((a, it) => a + (it.box.x1 - it.box.x0), 0);
      if (used > sg.L + 0.5) add("e", `حيطة ${sg.i + 1}: الوحدات السفلية ${n1(used)} سم أطول من الحيطة (${n1(sg.L)} سم).`);
      else if (room.closed && sg.L - used < 3 && sg.L - used >= 0) add("w", `حيطة ${sg.i + 1}: الخلوص ${n1(sg.L - used)} سم بس — سيب 3 سم على الأقل للتركيب (فيلر يتقص في الموقع).`);
    }
    // doors / windows
    for (const o of room.openings || []) {
      const sg = segs.find((g) => g.id === o.wall);
      if (!sg) continue;
      for (const it of items.filter((x) => x.pose.wall === sg.id)) {
        const { s } = it.pose, w = it.box.x1 - it.box.x0;
        const a0 = sg.d[0] * (Room.footprint(it.pose, it.box)[0][0] - sg.A[0]) + sg.d[1] * (Room.footprint(it.pose, it.box)[0][1] - sg.A[1]);
        const fp = Room.footprint(it.pose, it.box).map((q) => (q[0] - sg.A[0]) * sg.d[0] + (q[1] - sg.A[1]) * sg.d[1]);
        const lo = Math.min(...fp), hi = Math.max(...fp);
        if (hi <= o.at + 0.5 || lo >= o.at + o.w - 0.5) continue;
        if (o.kind === "door") add("e", `${label(it)} قدام باب على حيطة ${sg.i + 1}.`, it.id);
        else if (it.row !== "lower") add("w", `${label(it)} قدام شباك على حيطة ${sg.i + 1}.`, it.id);
        else if (o.sill < 92) add("w", `جلسة الشباك ${o.sill} سم أوطى من الكونتر — ${label(it)} هيخبط فيها.`, it.id);
        void s; void w; void a0;
      }
    }
    // services next to the units that need them
    const pts = (room.points || []).map((p) => ({ ...p, w: Room.pointWorld(room, p) })).filter((p) => p.w);
    const near = (it, kinds, dist = 90) => pts.some((p) => kinds.includes(p.kind) && Math.hypot(p.w.x - Room.centerOf(it.pose, it.box)[0], p.w.z - Room.centerOf(it.pose, it.box)[1]) < dist);
    for (const it of items) {
      const p = R(it.u).params || {};
      if (it.u.kind !== "kitchen") continue;
      if (p.include_sink_cutout) {
        if (!near(it, ["drain"])) add("w", `${label(it)}: مفيش صرف قريب من الحوض.`, it.id);
        if (!near(it, ["cold", "hot"])) add("w", `${label(it)}: مفيش تغذية مياه قريبة من الحوض.`, it.id);
      }
      if (p.unit_category === "oven" && !near(it, ["oven", "socket", "gas"], 120)) add("w", `${label(it)}: مفيش بريزة فرن (خلف الفرن) أو مخرج غاز قريب.`, it.id);
      if (p.unit_category === "fridge") {
        if (!near(it, ["fridge", "socket"], 120)) add("w", `${label(it)}: مفيش بريزة تلاجة قريبة.`, it.id);
        add("n", `${label(it)}: سيب تهوية 6 سم على الأقل حوالين التلاجة.`, it.id);
      }
      if (p.unit_category === "washing_machine" && (!near(it, ["washer_cold", "cold"]) || !near(it, ["washer_drain", "drain"]))) add("w", `${label(it)}: الغسالة محتاجة تغذية على 90 وصرف على 70.`, it.id);
    }
    // sockets / switches hidden behind units
    for (const p of pts) {
      if (Room.MEP_KINDS[p.kind]?.[1] !== "elec" || p.kind === "light" || p.kind === "spot") continue;
      for (const it of items) {
        if (it.pose.wall !== p.wall) continue;
        const fp = Room.footprint(it.pose, it.box).map((q) => (q[0] - p.w.seg.A[0]) * p.w.seg.d[0] + (q[1] - p.w.seg.A[1]) * p.w.seg.d[1]);
        const [z0, z1] = it.row === "upper" ? [+(R(it.u).params?.wall_mount_height || 140), +(R(it.u).params?.wall_mount_height || 140) + it.box.y1 * 0 + (R(it.u).params?.height || 70)] : it.row === "lower" ? [0, 88] : [0, 220];
        if (p.at > Math.min(...fp) + 2 && p.at < Math.max(...fp) - 2 && p.z > z0 && p.z < z1 && !["fridge", "oven", "washer"].includes(p.kind))
          add("w", `${Room.MEP_KINDS[p.kind][0]} على ارتفاع ${p.z} مقفول عليها ورا ${label(it)}.`, it.id);
      }
    }
    if (!(room.points || []).length && items.some((it) => it.u.kind === "kitchen")) add("n", "لسه مفيش نقط كهربا أو سباكة — ضيفها من المسقط (دوس على حيطة ← كهربا / سباكة / غاز).");
  } else if (items.length > 1) add("n", "ارسم الحيطان (المسقط والحيطان) عشان الفحص يشمل الأبواب والشبابيك والخلوص.");
  return out;
}
function checksHtml(list) {
  if (!list.length) return `<p class="okmsg">${ICON.check}مفيش ملاحظات — التصميم سليم.</p>`;
  const cls = { e: "e", w: "w", n: "n" };
  return list.map((c) => `<button class="chk ${cls[c.level]}" ${c.unitId ? `data-chkunit="${c.unitId}"` : ""}>${esc(c.text)}</button>`).join("");
}

// ------------------------------------------------------------------ unit summary + assembly guide
const ASM_STEPS = [
  { t: "القاعدة والأجناب", d: "ركّب الأجناب على القاعدة بالمينيفكس والدوبل (الأخرام متعلّمة في الملصق). اتأكد إن الحروف الأمامية على خط واحد والعلبة مربعة (قيس القطرين — لازم يبقوا زي بعض).", hw: /أليتا|كام|مينيفكس|دوبل|دويل/ },
  { t: "الرأس", d: "ركّب الرأس (أو الشريطين الأمامي والخلفي) بين الأجناب بنفس الطريقة. الشريط الأمامي مرجّع لورا عشان بروفايل المقبض لو موجود." },
  { t: "القواطيع والفيلرات", d: "ركّب القواطيع الرأسية والأرفف الثابتة والفيلرات في أماكنها المعلّمة، وثبّتها بالدوبل والمينيفكس." },
  { t: "الظهر", d: "زحلق الظهر في المفحار من ورا قبل ما تقفل آخر قطعة، أو ثبّته بالدبابيس لو مفيش مفحار. الظهر بيقفل العلبة على زاوية قايمة." },
  { t: "الأرفف", d: "حط فرش الأرفف في الأخرام وركّب الأرفف المتحركة.", hw: /فرش|رف/ },
  { t: "الأدراج", d: "جمّع صناديق الأدراج (الجنبين والأمامي والخلفي ثم القاعدة في المفحار)، ركّب المجاري على الأجناب وعلى الصناديق، ودخّل الأدراج وبعدها ركّب الوشوش.", hw: /سك|مجر|درج/ },
  { t: "الضلف", d: "ركّب المفصلات في الكبب (35 مم) وعلّق الضلف، واظبط الخلوص 3 مم من مسامير المفصلة (فوق/تحت، يمين/شمال، لقدام/لورا).", hw: /مفصل|ذراع|قلاب/ },
  { t: "التشطيب والتركيب", d: "ركّب الأرجل والسكلو والمقابض والليد، وبعدين الكونتر لو موجود. علّق الوحدات العلوية بالتعليقات واتأكد إنها على ميزان.", hw: /أرجل|تعليق|مقبض|ليد|سكلو|بروفايل|براغي|محول/ },
];
function asmStep(name, role) {
  const n = String(name || "");
  const tail = n.split(" - ").pop();
  if (role === "drawer_box" || role === "drawer_bottom" || role === "drawer_front" || /درج/.test(n)) return 5;
  if (/سكلو|وزرة|كونتر|مقبض|شماعة|ليد|تقفيلة|أورزة|كليت|رجل بلاستيك|برواز ألومنيوم/.test(n) || role === "led" || role === "handle" || role === "plinth") return 7;
  if (role === "door" || role === "mirror" || /ضلفة|باب|مراية/.test(n)) return 6;
  if (role === "back" || /ظهر|ضهر/.test(tail)) return 3;
  if (/رأس|راس|شريط علوي/.test(tail)) return 1;
  if (role === "divider" || role === "fixed_shelf" || /قاطوع|ضلع|رف ثابت|عارضة|فيلر|لوح أعمى|بانوه|جلسة|فاصل/.test(n)) return 2;
  if (role === "shelf" || /رف/.test(tail)) return 4;
  return 0;
}
/** steps of one unit: for each step its pieces (with numbers) and the hardware that goes in then */
function asmPlan(u) {
  const r = R(u);
  if (!r.ok) return [];
  const codes = partCodes(u, r);
  const steps = ASM_STEPS.map((s, i) => ({ ...s, i, pieces: [], hardware: [] }));
  for (const pt of r.parts) if (pt.cut_piece && pt.label) steps[asmStep(pt.name, pt.role)].pieces.push({ code: codes.get(pt), name: pt.name, lb: pt.label });
  for (const [k, v] of Object.entries(r.hardware || {})) {
    const st = steps.find((s) => s.hw?.test(k)) || steps[7];
    st.hardware.push([k, v]);
  }
  return steps.filter((s) => s.pieces.length || s.hardware.length || (r.meshes || r.parts).some((m) => asmStep(m.name, m.role) === s.i));
}
/** a unit's summary: sizes, pieces per material (with area), banding, weight estimate, hardware */
function unitSummary(u) {
  const r = R(u);
  if (!r.ok) return null;
  const mats = new Map();
  let kg = 0;
  for (const pt of r.parts) {
    if (!pt.cut_piece || !pt.label) continue;
    const lb = pt.label, key = `${r.names[pt.material] || pt.material} — ${Math.round(lb.t * 10)} مم`;
    const m = mats.get(key) || { n: 0, area: 0 };
    const a = (lb.w * lb.h) / 10000;
    m.n++; m.area += a;
    mats.set(key, m);
    kg += a * lb.t * 0.72 * 10; // particle/MDF board ≈ 720 kg/m³
  }
  return { r, mats: [...mats.entries()], kg: Math.round(kg) };
}
function summaryHtml(u) {
  const S = unitSummary(u);
  if (!S) return "";
  const { r, mats, kg } = S;
  return `<details><summary>ملخص الوحدة</summary><div class="kv">
      <span>الكود</span><b class="num">${esc(unitCode(u))}</b><span>المقاس</span><b class="num">${dimsText(u, r)} سم</b>
      <span>القطع</span><b>${r.pieces} قطعة</b><span>الشريط</span><b>${r.banding} م</b><span>الوزن التقريبي</span><b>${kg} كجم</b></div>
    <table class="tbl"><thead><tr><th>الخامة</th><th>قطع</th><th>م²</th></tr></thead><tbody>${mats.map(([k, m]) => `<tr><td>${esc(k)}</td><td class="num">${m.n}</td><td class="num">${Math.round(m.area * 100) / 100}</td></tr>`).join("")}</tbody></table>
    ${Object.keys(r.hardware || {}).length ? `<table class="tbl"><thead><tr><th>الهاردوير</th><th>العدد</th></tr></thead><tbody>${Object.entries(r.hardware).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`).join("")}</tbody></table>` : ""}
    <button class="add" data-asm>${ICON.cube}دليل التجميع خطوة بخطوة</button></details>
    <details class="elevbox"><summary>📐 مقاسات التركيب (الأرفف والأدراج والضلف)</summary>${(() => { const L = asmLayout(u); return unitElevSvg(u, L) + layoutTables(L); })()}</details>`;
}
function asmProps(u) {
  const steps = asmPlan(u);
  const k = Math.min(ui.asm.step, steps.length - 1);
  const s = steps[k];
  const L = asmLayout(u);
  return `<div class="ph"><h2 class="uname">دليل التجميع</h2><div class="pa"><button data-asmclose class="ghost2">قفل</button></div></div>
    <p class="tplname"><span class="ucode">${esc(unitCode(u))}</span>${esc(u.name)}</p>
    <div class="asmnav"><button class="ghost2" data-asmgo="-1" ${k <= 0 ? "disabled" : ""}>السابق</button><b>خطوة ${k + 1} من ${steps.length}</b><button class="primary" data-asmgo="1" ${k >= steps.length - 1 ? "disabled" : ""}>التالي</button></div>
    <div class="asmdots">${steps.map((x, i) => `<button class="${i === k ? "on" : i < k ? "done" : ""}" data-asmto="${i}" aria-label="${esc(x.t)}">${i + 1}</button>`).join("")}</div>
    <h3 class="asmt">${esc(s.t)}</h3><p class="hint">${esc(s.d)}</p>
    ${layoutTables(L, s.i)}
    <details class="elevbox" ${[2, 4, 5, 6, 7].includes(s.i) ? "open" : ""}><summary>📐 الواجهة بالمقاسات</summary>${unitElevSvg(u, L)}</details>
    ${s.pieces.length ? `<table class="tbl"><thead><tr><th>الرقم</th><th>القطعة</th><th>المقاس</th></tr></thead><tbody>${s.pieces.map((p) => `<tr><td class="num"><b>${esc(p.code)}</b></td><td>${esc(p.name)}</td><td class="num">${n1(p.lb.h)}×${n1(p.lb.w)}</td></tr>`).join("")}</tbody></table>` : ""}
    ${s.hardware.length ? `<h4 class="advh">الهاردوير في الخطوة دي</h4><table class="tbl"><tbody>${s.hardware.map(([a, v]) => `<tr><td>${esc(a)}</td><td class="num">${v}</td></tr>`).join("")}</tbody></table>` : ""}
    <p class="hint">القطع اللي في الخطوة دي متلوّنة في العرض، واللي قبلها متركّبة.</p>`;
}
/** step filter for the 3D view while the guide is open: hidden / done / current */
function asmVisibility(u) {
  if (!ui.asm || ui.asm.id !== u.id) return null;
  const steps = asmPlan(u);
  const cur = steps[Math.min(ui.asm.step, steps.length - 1)]?.i ?? 99;
  return (name, role) => { const s = asmStep(name, role); return s > cur ? "hide" : s === cur ? "cur" : "done"; };
}
// ---- where everything goes inside the unit (heights of shelves, drawer runners, doors, hinges, rails)
const SLIDES = [25, 30, 35, 40, 45, 50, 55, 60, 65];
/** the unit's elements with their boxes (unit cm: x across, y depth (front = small y), z up) and a class */
function unitElems(r) {
  const src = r.meshes ? r.meshes.map((m) => ({ name: m.name, role: null, box: m.box, drawer: m.drawer, door: m.door }))
    : (r.parts || []).filter((p) => p.box).map((p) => ({ name: p.name, role: p.role, box: p.box, group: p.group, part: p }));
  const out = [];
  for (const e of src) {
    const n = String(e.name || ""), tail = n.split(" - ").pop().trim();
    if (e.role === "hole" || /كبة|خرم|ثقب|أليتا|دوبل|مينيفكس|فرش/.test(n)) continue;
    let cls = "other";
    if (/مقبض/.test(tail) || e.role === "handle") cls = "handle";
    else if (/وزرة|سكلو/.test(n) || e.role === "plinth") cls = "plinth";
    else if (/كونتر/.test(n)) cls = "counter";
    else if (/^درج \d+$/.test(tail) || e.role === "drawer_front" || (e.role === "door" && /درج/.test(tail))) cls = "drawer";
    else if (/درج/.test(n) || e.role === "drawer_box" || e.role === "drawer_bottom") cls = "drawerBox";
    else if (e.role === "door" || /^(ضلفة|باب)/.test(tail) || / - (ضلفة|باب)/.test(" - " + tail)) cls = /فريم|زجاج/.test(tail) ? "other" : "door";
    else if (/شماعة/.test(tail) || e.role === "rail") cls = "rail";
    else if (/ظهر|ضهر/.test(tail) || e.role === "back") cls = "back";
    else if (/قاطوع|ضلع|فاصل/.test(tail) || e.role === "divider") cls = "divider";
    else if (e.role === "shelf" || e.role === "fixed_shelf" || /^رف/.test(tail)) cls = "shelf";
    else if (/^قاعدة$/.test(tail)) cls = "base";
    else if (/^(رأس|راس|شريط)/.test(tail)) cls = "top";
    else if (/^جنب/.test(tail) || e.role === "side") cls = "side";
    else if (/فيلر/.test(tail)) cls = "filler";
    const b = e.box;
    out.push({ ...e, tail, cls, x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, y0: b.y0, y1: b.y1, sec: n.includes(" - ") ? n.split(" - ")[0] : "" });
  }
  return out;
}
const overlapX = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 * Math.min(a.x1 - a.x0, b.x1 - b.x0);
/** the assembly measurements of one unit: every height is from the top of the unit's bottom (القاعدة من جوه) */
function asmLayout(u) {
  const r = R(u);
  if (!r.ok) return null;
  const E = unitElems(r);
  const codes = partCodes(u, r), byName = new Map();
  for (const pt of r.parts) if (codes.has(pt)) { const l = byName.get(pt.name) || []; l.push(pt); byName.set(pt.name, l); }
  const used = new Set();
  const partOf = (e) => { if (e.part) return e.part; const l = byName.get(e.name) || []; const p = l.find((x) => !used.has(x)) || l[0]; if (p) used.add(p); return p; };
  const codeOf = (e) => { const p = partOf(e); return p ? codes.get(p) || "" : ""; };
  let carc = E.filter((e) => ["side", "base", "top", "shelf", "divider", "back", "filler", "other"].includes(e.cls));
  if (!carc.length) carc = E;
  if (!carc.length) return null;
  const zMin = Math.min(...carc.map((e) => e.z0)), zMax = Math.max(...carc.map((e) => e.z1));
  const bases = E.filter((e) => e.cls === "base");
  const horiz = E.filter((e) => e.cls === "base" || e.cls === "shelf" || e.cls === "top");
  const refOf = (e) => { let z = -1e9; for (const b of bases) if (overlapX(b, e) && b.z1 <= e.z0 + 0.1 && b.z1 > z) z = b.z1; return z > -1e9 ? z : zMin; };
  const below = (e) => { let z = -1e9; for (const h of horiz) if (h !== e && overlapX(h, e) && h.z1 <= e.z0 + 0.05 && h.z1 > z) z = h.z1; return z > -1e9 ? z : null; };
  const above = (e) => { let z = 1e9; for (const h of horiz) if (h !== e && overlapX(h, e) && h.z0 >= e.z1 - 0.05 && h.z0 < z) z = h.z0; return z < 1e9 ? z : null; };
  const sides = E.filter((e) => e.cls === "side");
  const leftIn = sides.length ? Math.min(...sides.map((s) => s.x1)) : 0;
  const r1 = (v) => Math.round(v * 10) / 10;
  const shelves = E.filter((e) => e.cls === "shelf").sort((a, b) => a.x0 - b.x0 || a.z0 - b.z0).map((e) => {
    const ref = refOf(e), lo = below(e), hi = above(e);
    return { name: e.name, code: codeOf(e), sec: e.sec, fixed: /ثابت|جلسة/.test(e.name) || e.role === "fixed_shelf", t: r1(e.z1 - e.z0),
      bottom: r1(e.z0 - ref), top: r1(e.z1 - ref), gapBelow: lo === null ? null : r1(e.z0 - lo), gapAbove: hi === null ? null : r1(hi - e.z1), floor: r1(e.z0), e };
  });
  const drawers = E.filter((e) => e.cls === "drawer").sort((a, b) => a.x0 - b.x0 || a.z0 - b.z0).map((e) => {
    const ref = refOf(e);
    const box = E.filter((x) => x.cls === "drawerBox" && (e.group ? x.group === e.group : x.name.startsWith(e.name + " - ")));
    const side = box.find((x) => /جنب/.test(x.tail)) || box[0];
    const depth = side ? side.y1 - side.y0 : 0;
    return { name: e.name, code: codeOf(e), sec: e.sec, f0: r1(e.z0 - ref), f1: r1(e.z1 - ref), fh: r1(e.z1 - e.z0), fw: r1(e.x1 - e.x0),
      run: side ? r1(side.z0 - ref) : null, bh: side ? r1(side.z1 - side.z0) : null, depth: r1(depth), slide: side ? SLIDES.filter((s) => s <= depth + 0.5).pop() || null : null,
      floor: r1(e.z0), e };
  });
  const p = r.params || {}, edge = +p.hinge_cup_edge_distance || 2.2;
  const doors = E.filter((e) => e.cls === "door").sort((a, b) => a.x0 - b.x0 || a.z0 - b.z0).map((e) => {
    const pt = partOf(e), dl = pt?.door_label || null, code = pt ? codes.get(pt) || "" : "";
    const side = dl?.hinge_side || (/قلاب/.test(e.name) ? "top" : /يمين/.test(e.name) ? "right" : /شمال/.test(e.name) ? "left" : null);
    const h = e.z1 - e.z0, w = e.x1 - e.x0;
    const span = side === "top" ? w : h;
    // the plugin's cup positions when it drilled them; otherwise the usual rule: 10 cm from each end, more hinges on tall doors
    let hinges = (dl?.hinge_ratios || []).map((q) => r1(q * span)), sugg = false;
    if (!hinges.length && side) {
      const n = span < 90 ? 2 : span < 150 ? 3 : span < 200 ? 4 : 5, a = 10, z = span - 10;
      hinges = Array.from({ length: n }, (_, i) => r1(a + ((z - a) * i) / (n - 1)));
      sugg = true;
    }
    return { name: e.name, code, sec: e.sec, w: r1(w), h: r1(h), z0: r1(e.z0 - refOf(e)), floor: r1(e.z0), side, hinges, sugg, edge, e };
  });
  const dividers = E.filter((e) => e.cls === "divider" && (/قاطوع|ضلع|فاصل/.test(e.tail) || e.z1 - e.z0 > 0.6 * (zMax - zMin))).sort((a, b) => a.x0 - b.x0).map((e) => ({ name: e.name, code: codeOf(e), x: r1(e.x0 - leftIn), t: r1(e.x1 - e.x0), e }));
  const backY = Math.max(...E.filter((e) => e.cls === "back" || e.cls === "side").map((e) => e.y1), 0);
  const rails = E.filter((e) => e.cls === "rail").map((e) => ({ name: e.name, sec: e.sec, z: r1((e.z0 + e.z1) / 2 - refOf(e)), floor: r1((e.z0 + e.z1) / 2), back: r1(backY - (e.y0 + e.y1) / 2), e }));
  const kitchen = u.kind === "kitchen";
  return { E, shelves, drawers, doors, dividers, rails, zMin: r1(zMin), zMax: r1(zMax), kitchen, wall: kitchen && p.unit_type === "wall", baseTop: bases.length ? r1(Math.min(...bases.map((b) => b.z1))) : r1(zMin) };
}
const SIDE_AR = { left: "شمال", right: "يمين", top: "فوق", bottom: "تحت" };
/** the front elevation of a unit with the assembly heights written on it (SVG string) */
function unitElevSvg(u, L = asmLayout(u), { W = 440, H = 520, print = false } = {}) {
  if (!L) return "";
  const all = L.E.filter((e) => e.cls !== "back" && e.cls !== "handle");
  if (!all.length) return "";
  const x0 = Math.min(...all.map((e) => e.x0)), x1 = Math.max(...all.map((e) => e.x1));
  const z0 = Math.min(...all.map((e) => e.z0)), z1 = Math.max(...all.map((e) => e.z1));
  const padL = 96, padR = 96, padT = 40, padB = 56;
  const s = Math.min((W - padL - padR) / Math.max(x1 - x0, 1), (H - padT - padB) / Math.max(z1 - z0, 1));
  const ox = padL + ((W - padL - padR) - (x1 - x0) * s) / 2;
  const X = (x) => ox + (x - x0) * s, Z = (z) => padT + (z1 - z) * s;
  const ink = print ? "#222" : "var(--ink, #222)", mute = print ? "#666" : "var(--muted, #666)";
  const rect = (e, fill, extra = "") => `<rect x="${X(e.x0).toFixed(1)}" y="${Z(e.z1).toFixed(1)}" width="${Math.max((e.x1 - e.x0) * s, 0.8).toFixed(1)}" height="${Math.max((e.z1 - e.z0) * s, 0.8).toFixed(1)}" fill="${fill}" ${extra}/>`;
  let g = "";
  for (const e of all) {
    if (e.cls === "plinth" || e.cls === "counter") g += rect(e, "#cfcac0", `stroke="#8a857b" stroke-width="0.6"`);
    else if (e.cls === "side" || e.cls === "base" || e.cls === "top" || e.cls === "divider" || e.cls === "filler" || e.cls === "other") g += rect(e, "#ece5d6", `stroke="#6b6458" stroke-width="0.8"`);
    else if (e.cls === "shelf") g += rect(e, "#c9a96e", `stroke="#7a5f2e" stroke-width="0.8"`);
    else if (e.cls === "drawerBox" && /جنب/.test(e.tail)) g += rect(e, "rgba(31,109,61,.10)", `stroke="#1f6d3d" stroke-width="0.6"`);
    else if (e.cls === "rail") g += `<line x1="${X(e.x0)}" x2="${X(e.x1)}" y1="${Z((e.z0 + e.z1) / 2)}" y2="${Z((e.z0 + e.z1) / 2)}" stroke="#707070" stroke-width="3" stroke-linecap="round"/>`;
  }
  // fronts: dashed outlines so the inside stays readable
  for (const e of all) if (e.cls === "door" || e.cls === "drawer") g += rect(e, "none", `stroke="${e.cls === "door" ? "#1f6d3d" : "#b07d12"}" stroke-width="1.2" stroke-dasharray="6 4"`);
  // hinge cups on the doors
  for (const d of L.doors) for (const hz of d.hinges) {
    const e = d.e, cx = d.side === "top" ? e.x0 + hz : d.side === "right" ? e.x1 - d.edge : e.x0 + d.edge, cz = d.side === "top" ? e.z1 - d.edge : e.z0 + hz;
    g += `<circle cx="${X(cx)}" cy="${Z(cz)}" r="4" fill="none" stroke="#1f6d3d" stroke-width="1.2"/>`;
  }
  // labels in two margins: shelves/rails on the right, drawers on the left — pushed apart so they never overlap
  const place = (items, side) => {
    const fs = 13, out = [];
    items.sort((a, b) => b.zc - a.zc);
    let last = -1e9;
    for (const it of items) { let y = Z(it.zc) + 4; if (y < last + fs + 2) y = last + fs + 2; last = y; out.push({ ...it, y }); }
    return out.map((it) => {
      const xe = side === "r" ? X(it.e.x1) : X(it.e.x0), xt = side === "r" ? W - 8 : 8;
      return `<line x1="${xe}" y1="${Z(it.zc)}" x2="${side === "r" ? W - padR + 6 : padL - 6}" y2="${it.y - 4}" stroke="#999" stroke-width="0.6" stroke-dasharray="2 2"/>
        <text x="${xt}" y="${it.y}" font-size="${fs}" fill="${it.color || ink}" text-anchor="${side === "r" ? "end" : "start"}" direction="ltr">${it.t}</text>`;
    }).join("");
  };
  const right = L.shelves.map((sh) => ({ e: sh.e, zc: sh.e.z0, t: `${esc(sh.code || "")} ↥${n1(sh.bottom)}`, color: "#7a5f2e" }))
    .concat(L.rails.map((rl) => ({ e: rl.e, zc: (rl.e.z0 + rl.e.z1) / 2, t: `شماعة ↥${n1(rl.z)}`, color: "#555" })));
  const left = L.drawers.filter((d) => d.run !== null).map((d) => ({ e: d.e, zc: d.e.z0 + (d.run - d.f0), t: `مجرى ↥${n1(d.run)}`, color: "#b07d12" }));
  g += place(right, "r") + place(left, "l");
  // overall sizes
  const yb = H - padB + 22;
  g += `<line x1="${X(x0)}" x2="${X(x1)}" y1="${yb}" y2="${yb}" stroke="${ink}" stroke-width="0.8"/><line x1="${X(x0)}" x2="${X(x0)}" y1="${yb - 5}" y2="${yb + 5}" stroke="${ink}"/><line x1="${X(x1)}" x2="${X(x1)}" y1="${yb - 5}" y2="${yb + 5}" stroke="${ink}"/>
    <text x="${(X(x0) + X(x1)) / 2}" y="${yb + 17}" font-size="13" text-anchor="middle" fill="${ink}" direction="ltr">${n1(x1 - x0)}</text>
    <text x="${W / 2}" y="16" font-size="11.5" text-anchor="middle" fill="${mute}">↥ الارتفاع من فوق القاعدة من جوه (سم) · ○ مفصلة</text>
    <text x="${W / 2}" y="31" font-size="11.5" text-anchor="middle" fill="${mute}">المتقطع الأخضر: ضلفة · المتقطع الدهبي: وش درج</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="elevu" role="img" aria-label="واجهة الوحدة بالمقاسات">${g}</svg>`;
}
/** the measurement tables for a guide step (or every table when step is null) */
function layoutTables(L, step = null) {
  if (!L) return "";
  const t = (head, rows) => rows.length ? `<div class="tblwrap"><table class="tbl lay"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? "num" : ""}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  const nm = (x) => `${x.code ? `<b class="nw">${esc(x.code)}</b> ` : ""}${esc(x.name)}`;
  let h = "";
  const want = (i) => step === null || step === i;
  if (want(0) && L.kitchen) h += `<p class="hint">${L.wall ? `الوحدة بتتعلّق وتحتها على <b>${n1(L.zMin)} سم</b> من الأرض.` : `قاعدة الوحدة من جوه على <b>${n1(L.baseTop)} سم</b> من الأرض (بالسكلو).`} كل الارتفاعات تحت من فوق القاعدة من جوه.</p>`;
  if (want(2) && L.dividers.length) h += `<h4 class="advh">أماكن القواطيع (من الجنب الشمال من جوه)</h4>` + t(["القطعة", "مكانه", "التخانة"], L.dividers.map((d) => [nm(d), `${n1(d.x)} سم`, n1(d.t)]));
  const fixed = L.shelves.filter((s) => s.fixed), loose = L.shelves.filter((s) => !s.fixed);
  if (want(2) && fixed.length) h += `<h4 class="advh">الأرفف الثابتة</h4>` + t(["القطعة", "تحت الرف", "فوق الرف", "الفراغ تحته"], fixed.map((s) => [nm(s), `${n1(s.bottom)}`, `${n1(s.top)}`, s.gapBelow === null ? "—" : n1(s.gapBelow)]));
  if (want(4) && loose.length) h += `<h4 class="advh">ارتفاعات الأرفف — الفرش تحت الرف على</h4>` + t(["القطعة", "تحت الرف", "فوق الرف", "الفراغ تحته", "الفراغ فوقه"], loose.map((s) => [nm(s), `<b>${n1(s.bottom)}</b>`, n1(s.top), s.gapBelow === null ? "—" : n1(s.gapBelow), s.gapAbove === null ? "—" : n1(s.gapAbove)]));
  if (want(5) && L.drawers.length) h += `<h4 class="advh">الأدراج — المجرى وتحت الصندوق على</h4>` + t(["الدرج", "المجرى على", "الصندوق", "المجرى"], L.drawers.map((d) => [nm(d) + `<small class="blk">الوش ${n1(d.f0)} ← ${n1(d.f1)}</small>`, d.run === null ? "—" : `<b>${n1(d.run)}</b>`, d.bh === null ? "—" : `${n1(d.bh)}×${n1(d.depth)}`, d.slide ? `${d.slide} سم` : "—"]));
  if (want(6) && L.doors.length) h += `<h4 class="advh">الضلف والمفصلات</h4>` + t(["الضلفة", "المقاس", "من تحت على", "المفصلات", "أماكن الكبب"], L.doors.map((d) => [nm(d), `${n1(d.h)} × ${n1(d.w)}`, n1(d.z0), d.side ? SIDE_AR[d.side] || d.side : "—",
    d.hinges.length ? `${d.hinges.map(n1).join(" · ")}<small> ${d.side === "top" ? "من الشمال" : "من تحت"} · ${n1(d.edge)} من الحرف${d.sugg ? " · مقترح" : ""}</small>` : "—"]));
  if (want(7) && L.rails.length) h += `<h4 class="advh">الشماعات</h4>` + t(["القطعة", "الارتفاع", "من الأرض", "بعدها عن الظهر"], L.rails.map((r) => [esc(r.name), `<b>${n1(r.z)}</b>`, n1(r.floor), n1(r.back)]));
  return h;
}
/** PDF page(s) with the unit's front elevation and every assembly height, written as lines */
function layoutPages(u) {
  const L = asmLayout(u);
  if (!L) return [];
  const lines = [];
  const H = (t) => lines.push({ h: true, t });
  const nm = (x) => `${x.name}${x.code ? ` (${x.code})` : ""}`;
  if (L.kitchen) lines.push({ t: L.wall ? `الوحدة بتتعلّق وتحتها على ${n1(L.zMin)} سم من الأرض.` : `القاعدة من جوه على ${n1(L.baseTop)} سم من الأرض.` + " كل الارتفاعات من فوق القاعدة من جوه." });
  else lines.push({ t: "كل الارتفاعات من فوق القاعدة من جوه (سم)." });
  if (L.dividers.length) { H("القواطيع — من الجنب الشمال من جوه"); for (const d of L.dividers) lines.push({ t: `${nm(d)}: على ${n1(d.x)} سم` }); }
  if (L.shelves.length) { H("الأرفف — الفرش تحت الرف على"); for (const s of L.shelves) lines.push({ t: `${nm(s)}${s.fixed ? " (ثابت)" : ""}: تحت الرف ${n1(s.bottom)} · فوقه ${n1(s.top)}${s.gapBelow !== null ? ` · الفراغ تحته ${n1(s.gapBelow)}` : ""}${s.gapAbove !== null ? ` · فوقه ${n1(s.gapAbove)}` : ""}` }); }
  if (L.drawers.length) { H("الأدراج — المجرى (تحت جنب الصندوق) على"); for (const d of L.drawers) lines.push({ t: `${nm(d)}: المجرى ${d.run === null ? "—" : n1(d.run)}${d.bh !== null ? ` · الصندوق ${n1(d.bh)} × ${n1(d.depth)}` : ""}${d.slide ? ` · مجرى ${d.slide} سم` : ""} · الوش ${n1(d.f0)} → ${n1(d.f1)}` }); }
  if (L.doors.length) { H("الضلف والمفصلات"); for (const d of L.doors) lines.push({ t: `${nm(d)}: ${n1(d.h)} × ${n1(d.w)} · من تحت ${n1(d.z0)}${d.side ? ` · مفصلات ${SIDE_AR[d.side] || d.side}` : ""}${d.hinges.length ? ` · الكبب على ${d.hinges.map(n1).join(" و ")} ${d.side === "top" ? "من الشمال" : "من تحت"} (${n1(d.edge)} من الحرف)${d.sugg ? " — مقترح" : ""}` : ""}` }); }
  if (L.rails.length) { H("الشماعات"); for (const r of L.rails) lines.push({ t: `${r.name}: على ${n1(r.z)} (من الأرض ${n1(r.floor)}) · بعدها عن الظهر ${n1(r.back)}` }); }
  const pages = [];
  const elev = unitElevSvg(u, L, { W: 640, H: 520, print: true });
  let q = `<text x="940" y="104" font-size="26" font-weight="800" text-anchor="end">${esc(unitCode(u))} — مقاسات التركيب</text>` + nest(elev, 50, 120, 900, 731);
  let y = 890;
  for (const ln of lines) {
    if (y > 1370) { pages.push({ title: "مقاسات التركيب", svg: q }); q = `<text x="940" y="104" font-size="24" font-weight="800" text-anchor="end">${esc(unitCode(u))} — مقاسات التركيب (تابع)</text>`; y = 150; }
    q += ln.h ? `<text x="940" y="${y + 6}" font-size="18" font-weight="800" fill="#123f23" text-anchor="end">${esc(ln.t)}</text>` : `<text x="940" y="${y}" font-size="15" text-anchor="end">${esc(ln.t)}</text>`;
    y += ln.h ? 32 : 24;
  }
  pages.push({ title: "مقاسات التركيب", svg: q });
  return pages;
}
/** the guide as a PDF: summary page + one page per step with a 3D picture */
async function exportAssemblyPdf(units = state.project.units) {
  if (!view.ready) throw new Error("العرض 3D مش جاهز");
  const keep = { asm: ui.asm, sel: state.sel, whole: state.whole, open: ui.open, plan: ui.planOn };
  const pages = [];
  try {
    ui.planOn = false; state.whole = false; ui.open = false;
    $("#view3d").hidden = false;
    for (const u of units) {
      const S = unitSummary(u);
      if (!S) continue;
      const steps = asmPlan(u);
      state.sel = u.id;
      ui.asm = { id: u.id, step: steps.length - 1 };
      view.update(true);
      const full = view.snapshot(900, 640);
      const frameBox = view.frameBox?.clone();
      let t = `<text x="940" y="110" font-size="30" font-weight="800" text-anchor="end">${esc(unitCode(u))} — ${esc(u.name)}</text>
        <text x="940" y="146" font-size="18" fill="#555" text-anchor="end">${esc(S.r.label || "")} · ${dimsText(u, S.r)} سم · ${S.r.pieces} قطعة · ${S.r.banding} م شريط · ≈ ${S.kg} كجم</text>
        <image href="${full}" x="50" y="170" width="900" height="640"/>`;
      let y = 850;
      t += `<text x="940" y="${y}" font-size="19" font-weight="700" text-anchor="end">الخامات</text>`;
      for (const [k, m] of S.mats) { y += 26; t += `<text x="940" y="${y}" font-size="16" text-anchor="end">${esc(k)} — ${m.n} قطعة — ${Math.round(m.area * 100) / 100} م²</text>`; }
      y += 40;
      t += `<text x="940" y="${y}" font-size="19" font-weight="700" text-anchor="end">الهاردوير</text>`;
      for (const [k, v] of Object.entries(S.r.hardware || {})) { y += 26; if (y > 1360) break; t += `<text x="940" y="${y}" font-size="16" text-anchor="end">${esc(k)}: ${v}</text>`; }
      pages.push({ title: "ملخص الوحدة", svg: t });
      pages.push(...layoutPages(u));
      for (let k = 0; k < steps.length; k++) {
        ui.asm.step = k;
        view.update(false);
        const img = view.snapshot(900, 600, false, frameBox || true);
        const s = steps[k];
        let q = `<text x="940" y="110" font-size="26" font-weight="800" text-anchor="end">${esc(unitCode(u))} · خطوة ${k + 1} من ${steps.length}: ${esc(s.t)}</text>
          <foreignObject x="60" y="125" width="880" height="80"><div xmlns="http://www.w3.org/1999/xhtml" style="direction:rtl;font:17px Geeza Pro,Arial,sans-serif;color:#333;line-height:1.6">${esc(s.d)}</div></foreignObject>
          <image href="${img}" x="50" y="210" width="900" height="600"/>`;
        let yy = 850;
        if (s.pieces.length) {
          q += `<text x="940" y="${yy}" font-size="18" font-weight="700" text-anchor="end">القطع</text>`;
          s.pieces.slice(0, 30).forEach((p, i) => { const col = i % 2, row = Math.floor(i / 2); q += `<text x="${940 - col * 460}" y="${yy + 28 + row * 24}" font-size="15" text-anchor="end"><tspan font-weight="800">${esc(p.code)}</tspan>  ${esc(p.name)}  ${n1(p.lb.h)}×${n1(p.lb.w)}</text>`; });
          yy += 28 + Math.ceil(Math.min(30, s.pieces.length) / 2) * 24 + 20;
        }
        if (s.hardware.length && yy < 1330) {
          q += `<text x="940" y="${yy}" font-size="18" font-weight="700" text-anchor="end">الهاردوير</text>`;
          s.hardware.forEach(([a, v], i) => { if (yy + 28 + i * 24 < 1380) q += `<text x="940" y="${yy + 28 + i * 24}" font-size="15" text-anchor="end">${esc(a)}: ${v}</text>`; });
        }
        pages.push({ title: "دليل التجميع", svg: q });
      }
    }
  } finally {
    ui.asm = keep.asm; state.sel = keep.sel; state.whole = keep.whole; ui.open = keep.open; ui.planOn = keep.plan;
    render(true);
  }
  if (!pages.length) throw new Error("مفيش وحدات");
  const bytes = await Exp.pdfFromSvgPages(pages.map((p, i) => pageFrame(p.svg, { title: p.title, page: i + 1, pages: pages.length })), { title: `${state.project.name} — دليل التجميع` });
  return Exp.deliver(cloud.downloads, `${fileBase()} — دليل التجميع.pdf`, bytes);
}

// ------------------------------------------------------------------ prices + client quote
const money = (v) => Math.round(v).toLocaleString("ar-EG");
function priceDefaults() {
  state.prices ??= { sheets: {}, band: 0, hw: {}, laborUnit: 0, laborM2: 0, install: 0, margin: 35, client: "", validity: 15, delivery: "4 أسابيع", warranty: "سنتين على الهيكل والهاردوير", notes: "" };
  return state.prices;
}
/** costs of the current project from the cut plan, hardware and labour; null until the cut plan is ready */
function quoteCalc() {
  if (!cutData?.results) return null;
  const P = priceDefaults();
  const lines = [];
  let mat = 0;
  for (const g of cutData.groups) {
    const n = cutData.results[g.key].stats.sheets, pr = +P.sheets[g.key] || 0;
    lines.push({ k: "sheet", key: g.key, label: `ألواح ${g.key}`, qty: n, unit: "لوح", price: pr, total: n * pr });
    mat += n * pr;
  }
  let bandM = 0, area = 0;
  const unitArea = new Map();
  for (const u of state.project.units) {
    const r = R(u);
    if (!r.ok) continue;
    bandM += r.banding;
    let a = 0;
    for (const pt of r.parts) if (pt.cut_piece && pt.label) a += (pt.label.w * pt.label.h) / 10000;
    unitArea.set(u.id, a);
    area += a;
  }
  const band = bandM * (+P.band || 0);
  lines.push({ k: "band", label: "شريط حواف", qty: Math.round(bandM * 10) / 10, unit: "م", price: +P.band || 0, total: band });
  const hw = hardwareTotals();
  let hwT = 0;
  for (const [k, q] of Object.entries(hw)) { const pr = +P.hw[k] || 0; lines.push({ k: "hw", key: k, label: k, qty: q, unit: "", price: pr, total: q * pr }); hwT += q * pr; }
  const units = state.project.units.filter((u) => R(u).ok).length;
  const labor = units * (+P.laborUnit || 0) + area * (+P.laborM2 || 0) + (+P.install || 0);
  const cost = mat + band + hwT + labor;
  const total = cost * (1 + (+P.margin || 0) / 100);
  // the client sees one price per unit: the total shared out by each unit's board area
  const perUnit = state.project.units.filter((u) => unitArea.has(u.id)).map((u) => ({ u, price: area ? (total * unitArea.get(u.id)) / area : total / Math.max(1, units) }));
  return { lines, mat, band, hwT, labor, cost, total, perUnit, area };
}
function quoteHtml() {
  const P = priceDefaults(), Q = quoteCalc();
  if (!Q) return `<section class="mgroup"><div class="mg-h"><h3>الأسعار وعرض السعر</h3></div><div class="busy"><span class="spin" aria-hidden="true"></span>بيحسب الألواح…</div></section>`;
  const pin = (k, v, label, step = 1) => `<label class="f"><span>${esc(label)}</span><input type="number" inputmode="decimal" step="${step}" data-price="${esc(k)}" value="${v ?? ""}"></label>`;
  let h = `<section class="mgroup"><div class="mg-h"><h3>الأسعار وعرض السعر</h3><span class="pill">${money(Q.total)} ج.م</span></div>
    <p class="hint">اكتب أسعارك مرة واحدة وهتتحفظ لكل المشاريع. عدد الألواح من خطة القص، والشريط والهاردوير من التصميم.</p>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>`;
  for (const L of Q.lines) {
    const k = L.k === "sheet" ? `sheets.${L.key}` : L.k === "hw" ? `hw.${L.key}` : "band";
    h += `<tr><td>${esc(L.label)}</td><td class="num">${L.qty} ${L.unit}</td><td><input class="pin" type="number" inputmode="decimal" data-price="${esc(k)}" value="${L.price || ""}" placeholder="0"></td><td class="num">${money(L.total)}</td></tr>`;
  }
  h += `</tbody></table></div><div class="grid3">${pin("laborUnit", P.laborUnit, "مصنعية لكل وحدة")}${pin("laborM2", P.laborM2, "مصنعية لكل م² خشب")}${pin("install", P.install, "تركيب ونقل (مقطوعية)")}</div>
    <div class="kv"><span>خامات</span><b>${money(Q.mat + Q.band)}</b><span>هاردوير</span><b>${money(Q.hwT)}</b><span>مصنعية وتركيب</span><b>${money(Q.labor)}</b><span>التكلفة</span><b>${money(Q.cost)}</b></div>
    <div class="grid3">${pin("margin", P.margin, "هامش الربح %")}<label class="f"><span>اسم العميل</span><input data-pricet="client" value="${esc(P.client)}"></label>${pin("validity", P.validity, "العرض ساري (يوم)")}</div>
    <div class="grid2"><label class="f"><span>مدة التنفيذ</span><input data-pricet="delivery" value="${esc(P.delivery)}"></label><label class="f"><span>الضمان</span><input data-pricet="warranty" value="${esc(P.warranty)}"></label></div>
    <label class="f"><span>ملاحظات تظهر في العرض</span><input data-pricet="notes" value="${esc(P.notes)}"></label>
    <div class="btnrow"><button class="primary" data-quote>عرض سعر PDF للعميل</button><span class="hint" id="quoteMsg"></span></div></section>`;
  return h;
}
async function exportQuotePdf() {
  await cutReady();
  const P = priceDefaults(), Q = quoteCalc();
  if (!Q.total) throw new Error("اكتب الأسعار الأول");
  const no = `Q-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${state.project.id.slice(0, 4).toUpperCase()}`;
  let t = `<text x="940" y="112" font-size="30" font-weight="800" text-anchor="end">عرض سعر</text>
    <text x="940" y="146" font-size="16" fill="#555" text-anchor="end">رقم ${esc(no)} · ${today()} · ساري ${P.validity} يوم</text>
    <text x="60" y="112" font-size="18" font-weight="700">${esc(P.client || "")}</text>
    <text x="60" y="140" font-size="15" fill="#555">${esc(state.project.name)}</text>`;
  let view3 = "";
  try { if (view.ready && state.project.units.length) { const keep = state.whole; state.whole = true; view3 = view.snapshot(900, 480, true); state.whole = keep; view.update(true); } } catch { view3 = ""; }
  let y = 170;
  if (view3) { t += `<image href="${view3}" x="50" y="${y}" width="900" height="480"/>`; y += 500; }
  t += `<rect x="50" y="${y}" width="900" height="36" fill="#123f23"/><text x="935" y="${y + 24}" font-size="15" font-weight="700" fill="#fff" text-anchor="end">الوحدة</text><text x="520" y="${y + 24}" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">المقاس (سم)</text><text x="70" y="${y + 24}" font-size="15" font-weight="700" fill="#fff">السعر (ج.م)</text>`;
  y += 36;
  Q.perUnit.forEach(({ u, price }, i) => {
    if (y > 1250) return;
    const r = R(u);
    t += `<rect x="50" y="${y}" width="900" height="30" fill="${i % 2 ? "#f4f5f0" : "#fff"}"/><text x="935" y="${y + 20}" font-size="14" text-anchor="end"><tspan font-weight="800">${esc(u.code)}</tspan>  ${esc(u.name)}</text><text x="520" y="${y + 20}" font-size="14" text-anchor="middle" direction="ltr">${dimsText(u, r)}</text><text x="70" y="${y + 20}" font-size="14" font-weight="700">${money(price)}</text>`;
    y += 30;
  });
  y += 14;
  t += `<rect x="50" y="${y}" width="900" height="44" fill="#d9a63a"/><text x="935" y="${y + 29}" font-size="19" font-weight="800" text-anchor="end">الإجمالي</text><text x="70" y="${y + 29}" font-size="20" font-weight="800">${money(Q.total)} ج.م</text>`;
  y += 70;
  const terms = [`مدة التنفيذ: ${P.delivery}`, `الضمان: ${P.warranty}`, "الأسعار شاملة الخامات والهاردوير والتصنيع والتركيب حسب التصميم المرفق.", ...(P.notes ? [P.notes] : [])];
  terms.forEach((x, i) => { t += `<text x="940" y="${y + i * 24}" font-size="14" text-anchor="end">• ${esc(x)}</text>`; });
  const bytes = await Exp.pdfFromSvgPages([pageFrame(t, { title: "عرض سعر" })], { title: `عرض سعر — ${state.project.name}` });
  return Exp.deliver(cloud.downloads, `${fileBase()} — عرض سعر.pdf`, bytes);
}

// ------------------------------------------------------------------ exports (Excel, CSV, PDF, DXF, images, project)
const PFONT = `font-family="Geeza Pro, 'IBM Plex Sans Arabic', Arial, Tahoma, sans-serif"`;
const today = () => new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
const fileBase = () => `${state.project.name || "مشروع"} — NOVERA`.replace(/[\\/:*?"<>|]+/g, " ");
const edgesText = (pt) => {
  const lb = pt.label, b = lb.banded || {};
  if (pt.band_all_sides) return "الأربع حروف";
  const names = { top: "فوق", bottom: "تحت", left: "شمال", right: "يمين" };
  const on = Object.keys(names).filter((k) => b[k]);
  return on.length ? on.map((k) => names[k]).join(" + ") : "—";
};
/** the whole cut list as rows (header first) */
function cutRows() {
  const sheets = sheetIndex();
  const rows = [["رقم القطعة", "كود الوحدة", "الوحدة", "القطعة", "الخامة", "الطول (سم)", "العرض (سم)", "السمك (سم)", "الشريط", "أخرام", "اللوح", "ملاحظة"]];
  for (const pc of projectPieces(state.project)) {
    rows.push([pc.key, pc.ucode, pc.unit, pc.pt.name, pc.mname, +n1(pc.lb.h), +n1(pc.lb.w), +n1(pc.lb.t), edgesText(pc.pt), (pc.pt.holes || []).length || "", sheets[pc.key] || "", pc.pt.checks?.[0] || ""]);
  }
  return rows;
}
function hardwareTotals() {
  const hw = {};
  for (const u of state.project.units) { const r = R(u); if (!r.ok) continue; for (const [k, v] of Object.entries(r.hardware || {})) hw[k] = Math.round(((hw[k] || 0) + v) * 100) / 100; }
  return hw;
}
function mepRows() {
  const room = state.project.room;
  const rows = [["#", "النوع", "النظام", "الحيطة", "البعد من أول الحيطة (سم)", "الارتفاع من الأرض (سم)"]];
  if (!room) return rows;
  const segs = Room.segments(room);
  (room.points || []).forEach((p, i) => {
    const k = Room.MEP_KINDS[p.kind] || Room.MEP_KINDS.socket;
    rows.push([i + 1, k[0], Room.MEP_SYS[k[1]][0], segs.findIndex((g) => g.id === p.wall) + 1, p.at, p.z]);
  });
  return rows;
}
async function exportXlsx() {
  await cutReady();
  const units = [["كود", "الوحدة", "النوع", "المقاس (ع × ط × ع)", "قطع", "شريط (م)", "ضلف", "أدراج"]];
  for (const u of state.project.units) { const r = R(u); if (r.ok) units.push([unitCode(u), u.name, r.label || "", dimsText(u, r), r.pieces, r.banding, r.doors, r.drawers]); }
  const mats = new Map();
  for (const pc of projectPieces(state.project)) {
    const k = `${pc.mname}|${pc.lb.t}`;
    const m = mats.get(k) || { name: pc.mname, t: pc.lb.t, n: 0, area: 0 };
    m.n++; m.area += (pc.lb.w * pc.lb.h) / 10000;
    mats.set(k, m);
  }
  const sheetsN = cutData?.results ? Object.fromEntries(cutData.groups.map((g) => [g.key, cutData.results[g.key].stats.sheets])) : {};
  const matRows = [["الخامة", "السمك (مم)", "عدد القطع", "المساحة (م²)"], ...[...mats.values()].map((m) => [m.name, Math.round(m.t * 10), m.n, Math.round(m.area * 100) / 100])];
  const sheetRows = [["الخامة والسمك", "عدد الألواح"], ...Object.entries(sheetsN)];
  const hwRows = [["البند", "العدد"], ...Object.entries(hardwareTotals())];
  const bytes = Exp.xlsx([
    { name: "قايمة القطع", rows: cutRows(), widths: [11, 9, 22, 26, 22, 10, 10, 9, 18, 7, 24, 30] },
    { name: "الوحدات", rows: units, widths: [8, 26, 26, 22, 7, 9, 7, 7] },
    { name: "الخامات", rows: matRows, widths: [28, 10, 10, 12] },
    { name: "الألواح", rows: sheetRows, widths: [34, 12] },
    { name: "الهاردوير", rows: hwRows, widths: [34, 10] },
    { name: "كهربا وسباكة", rows: mepRows(), widths: [5, 22, 14, 8, 20, 20] },
  ]);
  return Exp.deliver(cloud.downloads, `${fileBase()} — قايمة القطع.xlsx`, bytes);
}
async function exportCsv() {
  await cutReady();
  // one row per piece, columns most cut-list optimisers (OpenCutList, CutList Optimizer) can map
  const rows = [["Label", "Length", "Width", "Thickness", "Qty", "Material", "Unit", "Part", "Edges"]];
  for (const pc of projectPieces(state.project)) rows.push([pc.key, n1(pc.lb.h), n1(pc.lb.w), n1(pc.lb.t), 1, pc.mname, `${pc.ucode} ${pc.unit}`, pc.pt.name, edgesText(pc.pt)]);
  return Exp.deliver(cloud.downloads, `${fileBase()} — قايمة القطع.csv`, Exp.csv(rows));
}
/** wait for the cut plan (it runs in a worker) */
function cutReady() { return new Promise((res) => runCut(() => res())); }

// ---- PDF pages (SVG, A4)
function pageFrame(inner, { landscape = false, title = "", page = 0, pages = 0 } = {}) {
  const W = landscape ? 1414 : 1000, H = landscape ? 1000 : 1414;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${PFONT}>
    <rect width="${W}" height="${H}" fill="#fff"/>
    <rect x="0" y="0" width="${W}" height="64" fill="#123f23"/>
    <rect x="${W - 60}" y="14" width="36" height="36" rx="8" fill="#d9a63a"/><text x="${W - 42}" y="40" font-size="22" font-weight="700" text-anchor="middle" fill="#123f23">N</text>
    <text x="${W - 72}" y="40" font-size="20" font-weight="700" fill="#fff" text-anchor="end">NOVERA <tspan fill="#d9a63a">Studio</tspan></text>
    <text x="${W / 2}" y="40" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">${esc(title)}</text>
    <text x="24" y="40" font-size="15" fill="#cfe0d4" text-anchor="start">${esc(state.project.name)} · ${today()}</text>
    ${inner}
    <text x="${W / 2}" y="${H - 18}" font-size="13" fill="#777" text-anchor="middle">${pages ? `صفحة ${page} من ${pages}` : ""}</text></svg>`;
}
async function pdfOut(pages, name, landscape) {
  const svgs = pages.map((inner, i) => pageFrame(inner.svg, { landscape, title: inner.title, page: i + 1, pages: pages.length }));
  const bytes = await Exp.pdfFromSvgPages(svgs, { landscape, title: `${state.project.name} — ${name}` });
  return Exp.deliver(cloud.downloads, `${fileBase()} — ${name}.pdf`, bytes);
}
/** nest an SVG string at x,y with width w (keeps its own viewBox) */
function nest(svg, x, y, w, h) {
  const i = svg.indexOf("<svg"), j = svg.indexOf(">", i);
  const tag = svg.slice(i, j).replace(/\s(width|height|x|y|xmlns)="[^"]*"/g, "");
  return tag.replace("<svg", `<svg x="${x}" y="${y}" width="${w}"${h ? ` height="${h}"` : ""}`) + svg.slice(j);
}
async function exportCutPdf() {
  await cutReady();
  const pages = [];
  const { groups, results, outside } = cutData;
  for (const g of groups) {
    const res = results[g.key];
    res.sheets.forEach((s, si) => {
      const svg = sheetSvg(s, si, g).match(/<svg[\s\S]*?<\/svg>/)[0].replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" `);
      const W = 1414, boxW = 980, boxH = (boxW * (s.h + 4)) / (s.w + 4);
      let t = `<text x="${W - 30}" y="104" font-size="22" font-weight="700" text-anchor="end">${esc(g.key)} — لوح ${si + 1} من ${res.sheets.length}</text>
        <text x="${W - 30}" y="134" font-size="15" fill="#555" text-anchor="end">${s.w} × ${s.h} سم · استغلال ${Math.round(s.util * 100)}% · ${s.placements.length} قطعة</text>`;
      t += nest(svg.replace(/class="sh"/g, 'fill="#fff" stroke="#111" stroke-width=".6"').replace(/class="off"/g, 'fill="#e6e6e0" stroke="#999" stroke-width=".3" stroke-dasharray="2 1.5"').replace(/class="pc"/g, 'stroke="#123f23" stroke-width=".5" fill-opacity=".85"').replace(/class="pcode"/g, 'font-weight="800"').replace(/class="dim"/g, ""), 1414 - 30 - boxW, 160, boxW, boxH);
      // list of the pieces on this sheet
      let y = 170;
      t += `<text x="380" y="${y}" font-size="15" font-weight="700" text-anchor="end">القطع على اللوح</text>`;
      for (const pl of s.placements.slice(0, 44)) {
        y += 18;
        const pp = g.parts[pl.index];
        t += `<text x="380" y="${y}" font-size="12.5" text-anchor="end"><tspan font-weight="700">${esc(pp?.code || "")}</tspan>  ${esc(pl.name.split(": ").pop())}  <tspan fill="#555">${n1(pl.orig_w)}×${n1(pl.orig_h)}</tspan></text>`;
      }
      // the cut sequence
      y = 160 + boxH + 40;
      if (y < 900) {
        t += `<text x="${W - 30}" y="${y}" font-size="15" font-weight="700" text-anchor="end">ترتيب القص</text>`;
        const cuts = s.cuts.slice(0, 24);
        cuts.forEach((c, i) => { const col = i % 3, row = Math.floor(i / 3); t += `<text x="${W - 30 - col * 330}" y="${y + 24 + row * 20}" font-size="12.5" text-anchor="end">${i + 1}. ${c.dir === "h" ? "بالعرض" : "بالطول"} ${n1(c.size)} سم</text>`; });
      }
      pages.push({ title: "خطة القص", svg: t });
    });
  }
  if (outside.length) {
    let t = `<text x="1384" y="110" font-size="22" font-weight="700" text-anchor="end">بتتطلب من المورّد (رخام / زجاج / مرايا)</text>`;
    outside.forEach((x, i) => { t += `<text x="1384" y="${150 + i * 24}" font-size="15" text-anchor="end"><tspan font-weight="700">${esc(x.key)}</tspan>  ${esc(x.unit)} — ${esc(x.pt.name)} — ${esc(x.mname)} — ${n1(x.lb.w)} × ${n1(x.lb.h)} × ${n1(x.lb.t)}</text>`; });
    pages.push({ title: "طلبيات المورّد", svg: t });
  }
  if (!pages.length) throw new Error("مفيش قطع");
  return pdfOut(pages, "خطة القص", true);
}
/** labels: A4 sheets of 3 × 7 (60 × 40 mm) or one label per page for a roll printer */
async function exportLabelsPdf() {
  await cutReady();
  const sheets = sheetIndex(), pid = state.project.id;
  const pieces = projectPieces(state.project);
  const mm = 1000 / 210; // A4 width in page units
  const label = (pc, x, y, s = mm) => {
    const W = 60 * s, H = 40 * s;
    const qr = qrSvg(pieceUrl(pid, pc.key), 62);
    const dia = pieceSvg(pc, 1);
    return `<g transform="translate(${x} ${y})"><rect width="${W}" height="${H}" fill="#fff" stroke="#bbb" stroke-dasharray="3 3"/>
      <rect x="${W - 2 * s - 21 * s}" y="${2 * s}" width="${21 * s}" height="${6 * s}" rx="${1 * s}" fill="#111"/>
      <text x="${W - 2 * s - 10.5 * s}" y="${6.6 * s}" font-size="${4.2 * s}" font-weight="800" fill="#fff" text-anchor="middle" direction="ltr">${esc(pc.key)}</text>
      <text x="${W - 25 * s}" y="${6.4 * s}" font-size="${2.9 * s}" font-weight="700" text-anchor="end">${esc(pc.pt.name.length > 15 ? pc.pt.name.slice(0, 14) + "…" : pc.pt.name)}</text>
      <text x="${2 * s}" y="${12 * s}" font-size="${3.1 * s}" font-weight="700" direction="ltr">${n1(pc.lb.h)} × ${n1(pc.lb.w)} × ${n1(pc.lb.t)}</text>
      ${nest(dia, 3 * s, 13 * s, 36 * s, 17 * s)}
      ${qr ? nest(qr, W - 19 * s, 10 * s, 16 * s, 16 * s) : ""}
      ${nest(barcodeSvg(pc.key, 38, 5), 11 * s, 30.5 * s, 38 * s, 4.5 * s)}
      <text x="${W - 2 * s}" y="${38.2 * s}" font-size="${2.2 * s}" text-anchor="end" fill="#333">${esc(`${pc.ucode} ${pc.unit} · ${pc.mname}${sheets[pc.key] ? " · " + sheets[pc.key].split(" · ")[0] : ""}`.slice(0, 52))}</text></g>`;
  };
  const pages = [];
  if (state.labelFmt === "roll") {
    for (const pc of pieces) pages.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400" ${PFONT}><rect width="600" height="400" fill="#fff"/>${label(pc, 0, 0, 10)}</svg>`);
    const bytes = Exp.pdfFromJpegs(await Promise.all(pages.map(async (s) => ({ jpeg: await Exp.svgToJpeg(s, 1200, 800), w: 1200, h: 800, pw: 170.08, ph: 113.39 }))), "ملصقات");
    return Exp.deliver(cloud.downloads, `${fileBase()} — ملصقات 60x40.pdf`, bytes);
  }
  for (let i = 0; i < pieces.length; i += 21) {
    let t = "";
    pieces.slice(i, i + 21).forEach((pc, k) => {
      const col = k % 3, row = Math.floor(k / 3);
      t += label(pc, (6 + col * 66) * mm, (12 + row * 41) * mm);
    });
    pages.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1414" width="1000" height="1414" ${PFONT}><rect width="1000" height="1414" fill="#fff"/>${t}</svg>`);
  }
  const bytes = await Exp.pdfFromSvgPages(pages, { title: "ملصقات", scale: 2.2 });
  return Exp.deliver(cloud.downloads, `${fileBase()} — ملصقات.pdf`, bytes);
}
/** plan + an elevation per wall + the electrical/plumbing schedule */
async function exportDrawingsPdf() {
  const room = state.project.room;
  if (!room) throw new Error("ارسم الحيطان الأول");
  const savedVb = plan.vb;
  plan.vb = null;
  const fitHost = { clientWidth: 1414, clientHeight: 880 };
  const oldHost = plan.host;
  plan.host = () => fitHost;
  plan.fit();
  plan.printing = true;
  const planSvg = plan.svg().replace(/class="(\w+)([^"]*)"/g, (m) => m); // styles inlined below
  plan.printing = false;
  plan.host = oldHost;
  plan.vb = savedVb;
  const style = `<style>${PLAN_PRINT_CSS}</style>`;
  const pages = [{ title: "المسقط الأفقي", svg: style + nest(planSvg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '), 20, 80, 1374, 880) }];
  for (const seg of Room.segments(room)) {
    const e = plan.elevSvg(seg.id).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    pages.push({ title: `واجهة حيطة ${seg.i + 1}`, svg: style + nest(e, 40, 90, 1334, 860) });
  }
  const mr = mepRows();
  if (mr.length > 1) {
    let t = `<text x="1384" y="110" font-size="22" font-weight="700" text-anchor="end">جدول نقط الكهربا والسباكة والغاز</text>`;
    mr.forEach((r, i) => { t += `<text x="1384" y="${150 + i * 24}" font-size="${i ? 15 : 14}" ${i ? "" : 'font-weight="700"'} text-anchor="end">${r.map((c) => esc(String(c))).join("   ·   ")}</text>`; });
    pages.push({ title: "كهربا وسباكة", svg: t });
  }
  return pdfOut(pages, "المساقط والواجهات", true);
}
const PLAN_PRINT_CSS = `
.pfloor{fill:#fff}.pwall{fill:#5e6259;stroke:#3a3d36;stroke-width:.6}.popen{fill:#fff;stroke:#3a3d36;stroke-width:.6}.pdoor{fill:none;stroke:#777;stroke-width:.8;stroke-dasharray:3 2}
.pwin{stroke:#4d8fb8;stroke-width:2.2}.pdim{font-weight:600;fill:#111}.pdim.gap{fill:#777;font-weight:400}.punit polygon{stroke:#2f4a36;stroke-width:.8}.punit.upper polygon{fill-opacity:.55;stroke-dasharray:4 3}
.punit .pfront{stroke:#1f6d3d;stroke-width:2.2}.punit text{font-weight:600;fill:#17301f}.phandle{display:none}.phint{display:none}.pcol{fill:#8c8f86;stroke:#3a3d36;stroke-width:.6}
.pmep circle{stroke:#fff;stroke-width:.8}.pmep text{fill:#fff;font-weight:700}.ewall{fill:#fff;stroke:#3a3d36;stroke-width:1}.eopen{fill:#dfeaf1;stroke:#4d8fb8;stroke-width:1}.eopen.door{fill:#ece6da;stroke:#8a7a5c}
.ebody{fill:#e7e2d6;stroke:#6d6a60;stroke-width:.4}.efront{fill:#d9c7a3;stroke:#3b3f38;stroke-width:.7}.edim{stroke:#777;stroke-width:.7}.ecol{fill:#d4d1c7;stroke:#6d6a60;stroke-width:.6}
.punit.on polygon{stroke:#2f4a36;stroke-width:.8}.pwall.on{fill:#5e6259}`;
/** DXF: every cut sheet (with piece numbers) + the plan, zipped */
async function exportDxf() {
  await cutReady();
  const files = [];
  const { groups, results } = cutData;
  groups.forEach((g, gi) => {
    const d = new Exp.Dxf();
    const res = results[g.key];
    res.sheets.forEach((s, si) => {
      const ox = si * (s.w + 30);
      d.rect(ox, 0, s.w, s.h, "SHEET");
      d.text(ox, s.h + 6, 4, `${si + 1}`, "SHEET");
      for (const pl of s.placements) {
        const y = s.h - pl.y - pl.h; // DXF y goes up
        d.rect(ox + pl.x, y, pl.w, pl.h, "PARTS");
        const pp = g.parts[pl.index];
        d.text(ox + pl.x + 1.5, y + pl.h / 2, Math.max(1.5, Math.min(4, pl.h / 5)), pp?.code || "", "LABELS");
      }
    });
    files.push({ name: `${String(gi + 1).padStart(2, "0")} ${g.key.replace(/[\\/:*?"<>|]+/g, " ")}.dxf`, data: d.toString() });
  });
  const room = state.project.room;
  if (room) {
    const d = new Exp.Dxf();
    for (const geo of Room.wallGeom(room)) d.poly(Room.piecePoly(geo, 0, geo.seg.L).map(([x, z]) => [x, -z]), "WALLS");
    const poses = projectPoses(state.project);
    for (const it of projectItems(state.project)) {
      const L = poses.get(it.id);
      if (!L) continue;
      const u = state.project.units.find((x) => x.id === it.id);
      d.poly(Room.footprint(L, it.box).map(([x, z]) => [x, -z]), it.row === "upper" ? "UNITS-WALL" : "UNITS");
      const c = Room.centerOf(L, it.box);
      d.text(c[0] - 10, -c[1], 6, unitCode(u), "UNITS");
    }
    for (const p of room.points || []) { const w = Room.pointWorld(room, p); if (w) d.circle(w.x, -w.z, 4, "MEP"); }
    files.push({ name: "المسقط.dxf", data: d.toString() });
  }
  return Exp.deliver(cloud.downloads, `${fileBase()} — DXF.zip`, Exp.zip(files));
}
async function exportImage() {
  if (!view.ready) throw new Error("العرض 3D مش جاهز");
  const url = view.snapshot(1920, 1080);
  const bin = atob(url.split(",")[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return Exp.deliver(cloud.downloads, `${fileBase()} — صورة.png`, bytes);
}
function exportProject() {
  const data = { app: "NOVERA Studio", version: 1, exportedAt: new Date().toISOString(), project: state.project };
  return Exp.deliver(cloud.downloads, `${fileBase()} — مشروع.json`, JSON.stringify(data, null, 1));
}
/** what the SketchUp plugin needs to rebuild the design (v187: Extensions ‹ استيراد تصميم من تطبيق NOVERA) */
function sketchupData() {
  const project = state.project, room = project.room;
  const out = { walls: null, units: [], mep_points: [] };
  if (room) {
    const segs = Room.segments(room);
    let pts = room.pts.map(([x, z]) => [Room.r1(x), Room.r1(-z)]);
    const rev = !room.closed;
    if (rev) pts = pts.reverse();
    const n = segs.length;
    const openings = (room.openings || []).map((o) => {
      const k = segs.findIndex((g) => g.id === o.wall);
      if (k < 0) return null;
      const sg = segs[k];
      return { wall: rev ? n - 1 - k : k, type: o.kind === "door" ? "door" : "window", offset: Room.r1(rev ? sg.L - o.at - o.w : o.at), width: o.w, height: o.h, sill: o.sill || 0 };
    }).filter(Boolean);
    const hs = new Set(segs.map((g) => g.h)), ts = new Set(segs.map((g) => g.t));
    out.walls = { points: pts, closed: !!room.closed, height: segs[0]?.h || 280, thickness: segs[0]?.t || 12, openings, mixed: hs.size > 1 || ts.size > 1 };
    for (const p of room.points || []) {
      const w = Room.pointWorld(room, p);
      if (!w) continue;
      const k = Room.MEP_KINDS[p.kind] || Room.MEP_KINDS.socket;
      out.mep_points.push({ id: `${k[0]} ${out.mep_points.length + 1}`, sys: k[1], kind: p.kind, x: Room.r1(w.x), y: Room.r1(-w.z), z: p.z });
    }
  }
  const poses = projectPoses(project);
  ensureCodes(project);
  for (const u of project.units) {
    const r = R(u), L = poses.get(u.id);
    if (!r.ok || !L) continue;
    out.units.push({ code: u.code, name: u.name, kind: u.kind, params: expanded(u), x: Room.r1(L.x), y: Room.r1(-L.z), rot_deg: Math.round(((L.rot * 180) / Math.PI) * 100) / 100 });
  }
  return out;
}
/** the whole design as triangles (cm, Y up) grouped by unit, for the .dae */
function sceneNodes() {
  const THREE = view.three, nodes = [];
  const keep = { whole: state.whole, open: ui.open, render: state.render, xray: state.xray, plan: ui.planOn, asm: ui.asm };
  state.whole = true; ui.open = false; state.render = false; state.xray = false; ui.planOn = false; ui.asm = null;
  $("#view3d").hidden = false;
  view.update(true);
  view.group.updateMatrixWorld(true);
  const grab = (root, name) => {
    const parts = new Map();
    root.traverse((o) => {
      if (!o.isMesh || o.userData.selFoot || o.material?.type === "MeshBasicMaterial") return;
      const g = o.geometry, pos = g.attributes.position, idx = g.index;
      const mats = [].concat(o.material);
      const groups = g.groups?.length ? g.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];
      for (const gr of groups) {
        const m = mats[gr.materialIndex] || mats[0];
        const c = m.color || new THREE.Color(0.8, 0.8, 0.8);
        const key = m.uuid;
        const e = parts.get(key) || { material: { name: m.name || name, color: [c.r, c.g, c.b], opacity: m.transparent ? m.opacity : 1 }, arr: [] };
        const v = new THREE.Vector3();
        for (let i = gr.start; i < gr.start + gr.count; i++) {
          const k = idx ? idx.getX(i) : i;
          v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
          e.arr.push(v.x, v.y, v.z);
        }
        parts.set(key, e);
      }
    });
    nodes.push({ name, parts: [...parts.values()].map((e) => ({ material: e.material, positions: new Float32Array(e.arr) })) });
  };
  for (const ch of view.group.children) {
    if (ch.userData.unitId) { const u = state.project.units.find((x) => x.id === ch.userData.unitId); grab(ch, `${u?.code || ""} ${u?.name || ""}`.trim()); }
    else if (ch.userData.wallId) grab(ch, "حيطان");
  }
  Object.assign(state, { whole: keep.whole, render: keep.render, xray: keep.xray });
  Object.assign(ui, { open: keep.open, planOn: keep.plan, asm: keep.asm });
  render(true);
  return nodes;
}
async function exportSketchUp() {
  if (!view.ready) throw new Error("العرض 3D مش جاهز");
  const base = fileBase();
  const data = { app: "NOVERA Studio", version: 1, exportedAt: new Date().toISOString(), project: state.project, sketchup: sketchupData() };
  const readme = `NOVERA Studio — ${state.project.name}

في الملف ده حاجتين:

1) ${base}.novera.json — للبلجن (Kitchen Unit Designer 187 أو أحدث):
   Extensions ← Kitchen Unit Designer ← 📲 استيراد تصميم من تطبيق NOVERA
   الوحدات بتتبني بالبلجن نفسه بنفس الإعدادات (وحدات حية تتعدّل وتطلع ملصقات وقايمة قطع)،
   ومعاها الحيطان والأبواب والشبابيك ونقط الكهربا والسباكة.

2) ${base}.dae — موديل 3D عادي لأي نسخة سكتش أب (أو أي برنامج 3D):
   File ← Import ← اختار الملف. كل وحدة جروب لوحدها بكودها.
`;
  const files = [
    { name: `${base}.novera.json`, data: JSON.stringify(data, null, 1) },
    { name: `${base}.dae`, data: Exp.dae(sceneNodes(), state.project.name) },
    { name: "اقرأني.txt", data: readme },
  ];
  return Exp.deliver(cloud.downloads, `${base} — SketchUp.zip`, Exp.zip(files));
}
const EXPORTS = [
  ["xlsx", "قايمة القطع Excel", "كل القطع بأرقامها ومقاساتها وشريطها ولوحها + الوحدات والخامات والألواح والهاردوير ونقط الكهربا — في شيتات منفصلة.", exportXlsx],
  ["csv", "قايمة القطع CSV", "ملف بسيط يتفتح في أي برنامج تقطيع (OpenCutList / CutList Optimizer) أو Excel.", exportCsv],
  ["cutpdf", "خطة القص PDF", "رسمة كل لوح بأرقام القطع، وقايمة القطع اللي عليه وترتيب القص — للورشة.", exportCutPdf],
  ["labels", "الملصقات PDF", "ملصق لكل قطعة: الرقم الكبير، الرسمة بالشريط والأخرام، QR وباركود بنفس الرقم.", exportLabelsPdf],
  ["drawings", "المساقط والواجهات PDF", "المسقط الأفقي بالمقاسات، وواجهة كل حيطة بالوحدات والشبابيك ونقط الكهربا، وجدول النقط.", exportDrawingsPdf],
  ["asm", "ملخص الوحدات ودليل التجميع PDF", "لكل وحدة: صفحة ملخص (مقاسات، خامات، هاردوير، وزن) وصفحة لكل خطوة تجميع بصورة وأرقام القطع.", () => exportAssemblyPdf()],
  ["dxf", "ملفات DXF (CNC / أوتوكاد)", "كل لوح بقطعه وأرقامها كرسمة DXF، والمسقط — في ملف ZIP.", exportDxf],
  ["skp", "سكتش أب (موديل + ملف البلجن)", "ملف ZIP فيه موديل .dae يتفتح في أي سكتش أب، وملف للبلجن (187) يبني الوحدات الحقيقية بإعداداتها والحيطان ونقط الكهربا — عشان تكمّل شغل عليه.", exportSketchUp],
  ["png", "صورة التصميم", "صورة 1920×1080 من العرض 3D الحالي.", exportImage],
  ["quote", "عرض سعر للعميل PDF", "بالأسعار اللي كاتبها في تاب الورشة والعميل: صورة التصميم، سعر كل وحدة، الإجمالي، والشروط.", exportQuotePdf],
  ["json", "نسخة من المشروع", "ملف المشروع كامل — تفتحه على أي جهاز تاني أو تحتفظ بيه كنسخة احتياطية.", exportProject],
];

// ------------------------------------------------------------------ render
function render(refit = false) {
  ensureCodes(state.project);
  $("#projName").textContent = state.project.name;
  document.querySelectorAll(".tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === state.tab)));
  for (const t of ["design", "cut", "parts", "shop"]) $(`#v-${t}`).hidden = ui.mode !== "owner" || state.tab !== t;
  $("#v-design").classList.toggle("lib-open", !!state.libOpen || !state.project.units.length);
  if (ui.mode !== "owner") return;
  if (state.tab === "design") {
    $("#view3d").hidden = !!ui.planOn;
    renderStrip(); renderChips(); renderProps(); renderErrs(); renderMoveBar(); renderScene();
    plan.render();
    if (!ui.planOn) view.update(refit);
  }
  else if (state.tab === "cut") runCut();
  else if (state.tab === "parts") drawParts();
  else { drawShop(); runCut(drawShop); }
}

// ------------------------------------------------------------------ boot
async function boot() {
  const hash = location.hash.slice(1);
  const m = hash.match(/^([cw])-([a-z0-9]+)(?:\.([0-9]+-[0-9]+))?$/);
  if (m) {
    ui.mode = m[1] === "c" ? "client" : "work";
    ui.sharedPid = m[2];
    ui.piece = m[3] || null;
    document.body.classList.add("guest");
    $(".tabs").hidden = true;
    $("#projBtn").hidden = true;
    $(`#v-${ui.mode === "client" ? "client" : "work"}`).hidden = false;
    render();
    ui.mode === "client" ? drawClient() : drawWork();
  } else {
    renderLib();
    render(true);
    view.init("#view3d");
  }
  setCloud("local");
  const [db, user, comments, downloads] = await Promise.all(["db", "user", "comments", "downloads"].map((n) => window.claude?.use?.(n) ?? Promise.resolve(null)));
  Object.assign(cloud, { db, user, comments, downloads });
  if (user) { try { cloud.me = await user.id(); } catch { cloud.me = null; } }
  if (ui.mode !== "owner") {
    if (!db) { ui.sharedProject = "missing"; ui.mode === "client" ? drawClient() : drawWork(); return; }
    try { if (user && (await user.can("data.write")) === false) ui.canWrite = false; } catch { /* unknown */ }
    db.doc(`shared/${ui.sharedPid}`).onSnapshot((s) => {
      ui.sharedProject = s.exists ? s.data() : "missing";
      for (const m of ui.sharedProject?.mats || []) Mat.register(m);
      if (ui.mode === "client" && s.exists) ui.clientUnit = ui.clientUnit ? s.data().units.find((x) => x.id === ui.clientUnit.id) || s.data().units[0] : s.data().units[0];
      ui.mode === "client" ? drawClient() : drawWork();
      $("#projName").textContent = s.exists ? s.data().name : "";
    }, () => { ui.sharedProject = "missing"; ui.mode === "client" ? drawClient() : drawWork(); });
    const sub = ui.mode === "client" ? `approvals/${ui.sharedPid}` : `progress/${ui.sharedPid}`;
    db.doc(sub).onSnapshot((s) => {
      if (ui.mode === "client") { ui.approval = s.exists ? s.data() : null; if ($(".cl-side")) clientSide(); }
      else { ui.progress = s.exists ? s.data().stages || {} : {}; drawWork(); }
    }, () => {});
    return;
  }
  if (!db || !cloud.me) { setCloud("local"); return; }
  // owner: pull the newest copy of this project from the cloud, else upload the local one
  try {
    const ref = db.doc(`data/users/${cloud.me}/p_${state.project.id}`);
    const s = await ref.get();
    if (s.exists && s.data().updatedAt) {
      const v = s.data();
      const localAt = state.savedAt || "";
      if (!localAt || v.updatedAt > localAt) { state.project = { id: state.project.id, name: v.name, units: v.units || [] }; if (!state.project.units.find((u) => u.id === state.sel)) state.sel = state.project.units[0]?.id ?? null; render(true); }
      setCloud("saved");
    } else {
      const qs = await db.collection(`data/users/${cloud.me}`).orderBy("updatedAt", "desc").limit(1).get();
      if (!qs.empty && state.project.name === "مشروع تجريبي") {
        const d0 = qs.docs[0];
        state.project = { id: d0.id.replace(/^p_/, ""), name: d0.data().name, units: d0.data().units || [] };
        state.sel = state.project.units[0]?.id ?? null;
        render(true);
        setCloud("saved");
      } else { await cloudSave(); }
    }
  } catch { setCloud("error"); }
  watchOwnerShared();
  refreshProjects();
}
const _persist = persist;
persist = function () { state.savedAt = new Date().toISOString(); _persist(); };
const _render = render;
let lastPid = state.project.id;
render = function (refit) { _render(refit); if (state.project.id !== lastPid) { lastPid = state.project.id; watchOwnerShared(); } };
boot();
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => view.update());
window.__dbg = { view, plan, R, layout: asmLayout, elev: (u) => unitElevSvg(u), get state() { return state; } };
