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
import * as Lib from "./projects.js";
import * as Decor from "./decor.js";
import * as More from "./library.js";
import * as Obs from "./obstacles.js";
import * as SurveyUI from "./survey_ui.js";
import * as Media from "./media.js";
import * as Keypad from "./keypad.js";
import * as Studio from "./draw/studio.js";
import * as I18n from "./i18n.js";
await I18n.init();
if (I18n.isEn()) Exp.setTranslator(I18n.tr, I18n.trMarkup);
import * as DG from "./draw/geom.js";

const APP_URL = "https://claude.ai/artifact/EP8c8LmBNS8d3EqLcDioXi";
const APP_VERSION = "1.0";
/** shown on the "about" page — phone / links appear as soon as they're filled in */
const DEVELOPER = { name: "م. عمرو عثمان", company: "NOVERA", phone: "", whatsapp: "", email: "", site: "" };

// ------------------------------------------------------------------ helpers
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const n1 = (v) => (Math.round(v * 10) / 10).toString();
/** a number typed in any keyboard: Arabic-Indic digits, Arabic/European decimal comma */
const AR_DIG = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9", "٫": ".", "،": ".", ",": "." };
// every number field is a text field that turns Arabic-Indic digits and commas into plain numbers as you type
document.addEventListener("input", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement) || !t.hasAttribute("data-numf")) return;
  const v = t.value, nv = v.replace(/[٠-٩۰-۹٫،]/g, (c) => AR_DIG[c]).replace(/,/g, ".");
  if (nv !== v) { const at = t.selectionStart; t.value = nv; try { t.setSelectionRange(at, at); } catch { /* not focused */ } }
}, true);
const toNum = (v) => { const t = String(v ?? "").trim().replace(/[٠-٩۰-۹٫،,]/g, (c) => AR_DIG[c]).replace(/[^0-9.\-]/g, ""); const n = parseFloat(t); return Number.isFinite(n) ? n : 0; };
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

Object.assign(DRESSING, More.DRESSING);
Object.assign(KU.KITCHEN, More.KITCHEN);

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
state.myUnits ??= [];
state.myDel ??= [];
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
  histTrack();
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage unavailable */ }
  if (ui.mode === "owner" && state.project) Lib.put(state.project).then(() => { ui.savedAt = Date.now(); }).catch(() => {});
  if (!cloud.db || !cloud.me || ui.mode !== "owner") {
    // no cloud: still show that the work was just kept, for a moment
    if (ui.mode === "owner") { const el = $("#cloud"); if (el) { el.innerHTML = `${ICON.check || "✓"}<span>اتحفظ ✓</span>`; el.dataset.s = "saved"; clearTimeout(persist.t); persist.t = setTimeout(() => setCloud("local"), 1600); } }
    return;
  }
  cloud.dirty = true;
  clearTimeout(cloud.saveT);
  cloud.saveT = setTimeout(cloudSave, 1500);
  setCloud("pending");
}
let saveTimer = 0;
// ---- undo / redo: a snapshot of the project after every change (custom material images are not copied)
const hist = { undo: [], redo: [], last: null, pid: null, busy: false };
const snapOf = (p) => JSON.stringify({ ...p, mats: undefined });
function histTrack() {
  const p = state.project;
  if (!p || ui.mode !== "owner") return;
  const cur = snapOf(p);
  if (hist.pid !== p.id) { hist.pid = p.id; hist.undo = []; hist.redo = []; hist.last = cur; histUI(); return; }
  if (hist.busy) { hist.last = cur; hist.busy = false; histUI(); return; }
  if (cur === hist.last) return;
  if (hist.last) hist.undo.push(hist.last);
  if (hist.undo.length > 80) hist.undo.shift();
  hist.redo = [];
  hist.last = cur;
  histUI();
}
function histGo(dir) {
  clearTimeout(saveTimer);
  histTrack(); // anything still waiting to be saved becomes a step first
  const from = dir < 0 ? hist.undo : hist.redo, to = dir < 0 ? hist.redo : hist.undo;
  if (!from.length) return;
  to.push(hist.last);
  const snap = from.pop();
  const mats = state.project.mats;
  state.project = { ...JSON.parse(snap), ...(mats ? { mats } : {}) };
  hist.last = snap; hist.busy = true;
  if (!state.project.units.find((u) => u.id === state.sel)) state.sel = state.project.units[0]?.id ?? null;
  ui.multi = null; ui.asm = null; ui.planSel = null;
  persist(); render(true); if (ui.planOn) plan.render();
  alertBar(dir < 0 ? "↶ رجعت خطوة" : "↷ رجعت الخطوة تاني");
  histUI();
}
function histUI() {
  const u = $("#undoBtn"), r = $("#redoBtn");
  if (u) u.disabled = !hist.undo.length;
  if (r) r.disabled = !hist.redo.length;
}
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 250); }
async function cloudSave() {
  if (cloud.saving) { cloud.saveT = setTimeout(cloudSave, 800); return; }
  cloud.saving = true;
  cloud.dirty = false;
  const p = state.project;
  try {
    await cloud.db.doc(`data/users/${cloud.me}/p_${p.id}`).set({ name: p.name, units: p.units, room: p.room || null, mats: p.mats || [], stages: p.stages || null, survey: p.survey || null, updatedAt: new Date().toISOString() });
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
  const key = u.kind + JSON.stringify(u.params) + JSON.stringify(u.libs || {}) + (u.org || "") + (u.orgOpts ? JSON.stringify(u.orgOpts) : "") + (u.extra?.length ? JSON.stringify(u.extra) : "");
  if (cache.has(key)) return cache.get(key);
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  let out = u.kind === "dressing" ? adaptDressing(u) : u.kind === "kitchen" ? adaptKitchen(u) : u.kind === "pieces" ? adaptPieces(u) : u.params?.model ? adaptModel(u) : adaptPanel(u);
  if (out.ok && (u.kind === "dressing" || u.kind === "panel") && Obs.any(u.params)) {
    const ob = Obs.applyParts(out, u.params, out.partMover || []);
    if (ob) out = { ...out, parts: ob.parts, partMover: out.partMover ? ob.partMover : undefined, warnings: [...(out.warnings || []), ...ob.warnings], obstacles: true,
      pieces: (out.pieces || 0) + ob.parts.length - out.parts.length, banding: bandM(ob.parts) };
  }
  if (u.extra?.length && out.ok) out = withExtra(u, out);
  cache.set(key, out);
  return out;
}
// ---- extra pieces drawn onto / merged into any unit: boards in the unit's own frame, cut-listed like the rest
const EXTRA_MATS = { kitchen: { carcass: "الهيكل", front: "الواجهة", back: "الظهر" }, dressing: { carcass: "الهيكل", door: "الضلف", shelf: "الأرفف", back: "الظهر" },
  panel: { carcass: "الهيكل", front: "الضلف", shelf: "الأرفف", accent: "المميزة", back: "الظهر" } };
const extraMats = (u) => EXTRA_MATS[u.kind] || EXTRA_MATS.panel;
const AXN = { 0: ["شمال", "يمين"], 1: ["قدام", "ورا"], 2: ["تحت", "فوق"] };
/** corner names of a board's big face (u, v = its two long axes) */
function cutCorners(q) {
  const s = Obs.slabOf({ x0: 0, y0: 0, z0: 0, x1: +q.w || 1, y1: +q.d || 1, z1: +q.h || 1 });
  const o = {};
  for (const a of [0, 1]) for (const b of [0, 1]) o[`${a}${b}`] = `${AXN[s.v][b]} ${AXN[s.u][a]}`;
  return { s, o };
}
function withExtra(u, out) {
  const mats = extraMats(u);
  const panels = u.extra.map((q) => ({ ...q, material: mats[q.material] ? q.material : "carcass", role: q.role || "other" }));
  let fr;
  try { fr = panelCompute({ template: "free", panels: panels.map((q) => ({ ...q, material: ["carcass", "front", "shelf", "accent", "back"].includes(q.material) ? q.material : q.material === "door" ? "front" : "carcass" })) }); } catch { return out; }
  if (!fr?.ok) return out;
  const res = { ...out, parts: [...out.parts], extraCount: panels.length, hardware: { ...(out.hardware || {}) } };
  if (u.kind === "kitchen") res.meshes = [...out.meshes];
  // what the pieces join onto: the unit's own boards (before the pieces were added)
  const base = solidBoxes(u, out);
  let cams = 0;
  fr.parts.forEach((pt, i) => {
    const q = panels[i] || panels[panels.length - 1];
    const mat = q.material, name = q.name || `قطعة إضافية ${i + 1}`;
    const checks = ["➕ قطعة مضافة"];
    const b = pt.box;
    // a corner cut out of the board (L shape)
    let faces = null;
    const sl = Obs.slabOf(b);
    if (q.cut && +q.cut.a > 0 && +q.cut.b > 0) {
      const [u0, v0, u1, v1] = sl.rect, a = Math.min(+q.cut.a, u1 - u0 - 0.5), c = Math.min(+q.cut.b, v1 - v0 - 0.5);
      const cu = q.cut.c?.[0] === "1" ? [u1 - a, u1] : [u0, u0 + a], cv = q.cut.c?.[1] === "1" ? [v1 - c, v1] : [v0, v0 + c];
      if (a > 0 && c > 0) {
        sl.cuts.push([cu[0], cv[0], cu[1], cv[1]]);
        faces = Obs.slabFaces(sl, mat)?.faces || null;
        checks.push(`✂ قصة ركن ${Math.round(a * 10) / 10}×${Math.round(c * 10) / 10} سم — ${cutCorners(q).o[q.cut.c || "00"]}`);
      }
    }
    // joints: every edge that butts against a board of the unit gets 2 cam + dowel sets
    const L = [b.x0, b.y0, b.z0], H = [b.x1, b.y1, b.z1];
    const holes = [];
    const axes = (pt.axes || ["x", "y"]).map((k) => AXK.indexOf(k));
    const ratio = (P) => ({ w: Math.max(0, Math.min(1, (P[axes[0]] - L[axes[0]]) / Math.max(H[axes[0]] - L[axes[0]], 0.01))), h: Math.max(0, Math.min(1, (P[axes[1]] - L[axes[1]]) / Math.max(H[axes[1]] - L[axes[1]], 0.01))) });
    let edges = 0;
    for (const ea of [sl.u, sl.v]) for (const side of [0, 1]) {
      const at = side ? H[ea] : L[ea];
      const other = ea === sl.u ? sl.v : sl.u;
      const touch = base.some((x) => {
        const xl = [x.x0, x.y0, x.z0], xh = [x.x1, x.y1, x.z1];
        const face = side ? xl[ea] : xh[ea];
        return Math.abs(face - at) < 0.2 && xl[other] < H[other] - 1 && xh[other] > L[other] + 1 && xl[sl.axis] <= L[sl.axis] + 0.1 && xh[sl.axis] >= H[sl.axis] - 0.1;
      });
      if (!touch) continue;
      edges++;
      const len = H[other] - L[other], e0 = Math.min(5, len / 4);
      for (const pos of [L[other] + e0, H[other] - e0]) {
        const P = [0, 0, 0];
        P[ea] = side ? at - 3.4 : at + 3.4; P[other] = pos; P[sl.axis] = (L[sl.axis] + H[sl.axis]) / 2;
        holes.push({ kind: "cam", ...ratio(P), d: 1.5 });
        cams++;
      }
    }
    if (edges) checks.push(`🔩 ${edges * 2} طقم أليتا (كام + مسمار) — ${edges} ناحية، واخرم القطعة المقابلة`);
    if (u.kind === "kitchen") {
      res.parts.push({ id: `x${i}`, name, material: mat, cut_piece: true, label: { ...pt.label, led: null }, holes, door_label: null, checks, material_name: null, extra: i });
      res.meshes.push({ id: `xm${i}`, name, layer: mat === "front" ? "Kitchen - Front" : "Kitchen - Carcass", mat, door: false, drawer: false, mover: null, faces: faces || Obs.boxFaces(b, mat), box: { ...b }, extra: i });
    } else res.parts.push({ ...pt, id: 90000 + i, name, material: mat, checks, holes, extra: i, ...(faces ? { shape: { type: "faces", faces } } : {}), ...(u.kind === "dressing" ? { layer: "carcass" } : {}) });
  });
  if (cams) res.hardware["طقم أليتا (كام + مسمار) للقطع المضافة"] = (res.hardware["طقم أليتا (كام + مسمار) للقطع المضافة"] || 0) + cams;
  if (Array.isArray(out.partMover)) res.partMover = [...out.partMover, ...panels.map(() => null)];
  res.pieces = (out.pieces || 0) + panels.length;
  res.banding = bandM(res.parts);
  return res;
}
/** solid boxes of a unit (engine frame) — what a drawn piece snaps between */
function solidBoxes(u, r) {
  const list = r.meshes ? r.meshes.filter((m) => m.mat !== "hole").map((m) => m.box) : r.parts.filter((p) => p.box && p.role !== "hole").map((p) => p.box);
  return list.filter((b) => Math.min(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0) >= 0.3);
}
const AXK = ["x", "y", "z"];
/** the free stretch along `ax` through point q between the solid boxes around it (null when q is inside one) */
function freeSpan(boxes, q, ax, lim) {
  let lo = lim[0], hi = lim[1];
  const o = [0, 1, 2].filter((i) => i !== ax);
  for (const b of boxes) {
    const L = [b.x0, b.y0, b.z0], H = [b.x1, b.y1, b.z1];
    if (!o.every((i) => q[i] > L[i] + 0.05 && q[i] < H[i] - 0.05)) continue;
    if (H[ax] <= q[ax] + 0.05) lo = Math.max(lo, H[ax]);
    else if (L[ax] >= q[ax] - 0.05) hi = Math.min(hi, L[ax]);
    else return null;
  }
  return hi - lo > 0.5 ? [lo, hi] : null;
}
/** the span along ax through q, intersected over a few neighbouring probes (gaps between doors don't count) */
function spanNear(all, q, ax, lim, side) {
  let lo = -Infinity, hi = Infinity, any = false;
  for (const dv of [-3, 0, 3]) {
    const pq = [...q]; pq[side] += dv;
    const s = freeSpan(all, pq, ax, lim);
    if (!s) continue;
    any = true; lo = Math.max(lo, s[0]); hi = Math.min(hi, s[1]);
  }
  return any && hi - lo > 0.5 ? [lo, hi] : null;
}
/** a shelf / divider / board fitted at q (engine cm) inside unit u; n = the tapped face's normal.
 * When q falls inside a board (or between two), nearby points are tried. */
function fitPiece(u, r, kind, q, n = [0, 0, 1]) {
  if (kind === "board") return fitPiece1(u, r, kind, q, n);
  const offs = [0, 3, -3, 6, -6, 10, -10, 15, -15];
  const ax = kind === "shelf" ? 2 : 0;
  for (const o of offs) for (const o2 of [0, 4, -4, 8, -8]) {
    const qq = [...q]; qq[ax] += o; qq[ax === 2 ? 0 : 2] += o2;
    const pc = fitPiece1(u, r, kind, qq, n);
    if (pc) return pc;
  }
  return null;
}
function fitPiece1(u, r, kind, q, n = [0, 0, 1]) {
  const t = +r.params?.panel_thickness || +r.params?.thickness || 1.8;
  const bb = localBox(r);
  const all = solidBoxes(u, r);
  const zs = all.reduce((a, b) => [Math.min(a[0], b.z0), Math.max(a[1], b.z1)], [Infinity, -Infinity]);
  const lim = [[bb.x0, bb.x1], [bb.y0, bb.y1], zs];
  const p = q.map((v, i) => v + (n[i] || 0) * 0.3);
  const k = (extraOf(u).filter((x) => x.kind === kind).length || 0) + 1;
  const r1 = (v) => Math.round(v * 10) / 10;
  if (kind === "shelf") {
    const zc = p[2] + t / 2, at = [p[0], p[1], zc];
    const xs = freeSpan(all, at, 0, lim[0]);
    if (!xs) return null;
    const ys = spanNear(all, [(xs[0] + xs[1]) / 2, p[1], zc], 1, lim[1], 0);
    if (!ys) return null;
    return { kind, name: `رف إضافي ${k}`, role: "shelf", material: u.kind === "dressing" ? "shelf" : "carcass", x: r1(xs[0]), y: r1(ys[0] + 0.2), z: r1(p[2]), w: r1(xs[1] - xs[0]), d: r1(ys[1] - ys[0] - 0.2), h: t };
  }
  if (kind === "divider") {
    const zs2 = freeSpan(all, [p[0], p[1], p[2]], 2, lim[2]);
    if (!zs2) return null;
    const ys = spanNear(all, [p[0], p[1], (zs2[0] + zs2[1]) / 2], 1, lim[1], 0);
    if (!ys || freeSpan(all, [p[0] - t / 2 + 0.06, p[1], (zs2[0] + zs2[1]) / 2], 0, lim[0]) === null || freeSpan(all, [p[0] + t / 2 - 0.06, p[1], (zs2[0] + zs2[1]) / 2], 0, lim[0]) === null) return null;
    return { kind, name: `قاطوع إضافي ${k}`, role: "divider", material: "carcass", x: r1(p[0] - t / 2), y: r1(ys[0] + 0.2), z: r1(zs2[0]), w: t, d: r1(ys[1] - ys[0] - 0.2), h: r1(zs2[1] - zs2[0]) };
  }
  // a free board laid on the tapped face, thickness along its normal
  const ax = [0, 1, 2].reduce((a, i) => (Math.abs(n[i]) > Math.abs(n[a]) ? i : a), 2);
  const size = [60, 40, 60];
  const box = [0, 1, 2].map((i) => (i === ax ? (n[i] >= 0 ? [q[i], q[i] + t] : [q[i] - t, q[i]]) : [q[i] - size[i] / 2, q[i] + size[i] / 2]));
  return { kind: "board", name: `لوح إضافي ${k}`, role: "other", material: "carcass", x: r1(box[0][0]), y: r1(box[1][0]), z: r1(box[2][0]), w: r1(box[0][1] - box[0][0]), d: r1(box[1][1] - box[1][0]), h: r1(box[2][1] - box[2][0]) };
}
const extraOf = (u) => (Array.isArray(u.extra) ? u.extra : []);
function setExtra(u, fn) { u.extra = clone(extraOf(u)); fn(u.extra); if (!u.extra.length) delete u.extra; save(); render(); }
function drawPieceAt(cx, cy) {
  const hit = view.pickLocal(cx, cy);
  if (!hit) { alertBar("دوس على جنب أو قاعدة أو رف جوه الوحدة."); return; }
  const u = state.project.units.find((x) => x.id === hit.unitId);
  if (!u) return;
  if (u.id !== state.sel) { state.sel = u.id; }
  const r = R(u);
  if (ui.xdraw !== "board") {
    const bb = localBox(r), q = hit.p.map((v, i) => v + hit.n[i] * 0.3);
    if (q[0] < bb.x0 || q[0] > bb.x1 || q[1] < bb.y0 || q[1] > bb.y1) { alertBar("دوس جوه الوحدة — على الجنب من جوه أو على القاعدة/الرف (الضلف اتفتحت عشان تشوف جوه)."); return; }
  }
  const pc = fitPiece(u, r, ui.xdraw, hit.p, hit.n);
  if (!pc) { alertBar(ui.xdraw === "shelf" ? "مفيش مكان لرف هنا — دوس على الجنب من جوه عند الارتفاع اللي عايزه." : "مفيش مكان لقاطوع هنا — دوس على القاعدة أو رف من جوه."); return; }
  setExtra(u, (l) => l.push(pc));
  alertBar(`اتضاف ${pc.name} — ${pc.w}×${pc.d}×${pc.h} سم. تقدر تظبط مقاسه ومكانه من "رسم قطع وتجميعها".`);
}
const XKIND = { shelf: "🟫 رف", divider: "▮ قاطوع", board: "▭ لوح حر" };
function extraProps(u, r) {
  const list = extraOf(u);
  const mats = extraMats(u);
  let h = `<details ${list.length || ui.xdraw ? "open" : ""}><summary>✏️ رسم قطع وتجميعها${list.length ? ` · ${list.length}` : ""}</summary>
    <p class="hint">اختار نوع القطعة وبعدين دوس في الـ3D على المكان: الرف بيتظبط بين الجنبين عند الارتفاع اللي دوست عليه، والقاطوع بين القاعدة واللي فوقه، واللوح الحر بيتحط على الوش اللي دوست عليه. كل قطعة بتدخل الكت ليست والملصقات.</p>
    <div class="btnrow">${Object.entries(XKIND).map(([k, l]) => `<button class="chip ${ui.xdraw === k ? "on" : ""}" data-xdraw="${k}">${l}</button>`).join("")}${ui.xdraw ? `<button class="ghost2" data-xdraw="">✓ خلصت رسم</button>` : ""}</div>
    <div class="btnrow"><button class="ghost2" data-xauto="shelf">+ رف في النص</button><button class="ghost2" data-xauto="divider">+ قاطوع في النص</button><button class="ghost2" data-xauto="board">+ لوح حر</button></div>`;
  list.forEach((q, i) => {
    const N = (f, l) => `<label class="f"><span>${l}</span><input type="text" inputmode="decimal" data-numf step="0.5" data-xnum="${i}.${f}" value="${q[f] ?? 0}"></label>`;
    h += `<div class="zone-ed"><div class="zh"><input data-xtext="${i}.name" value="${esc(q.name || "")}" aria-label="اسم القطعة"><button data-xdup="${i}" class="sm" aria-label="نسخة">${ICON.copy}</button><button data-xdel="${i}" class="danger sm" aria-label="شيل القطعة">${ICON.trash}</button></div>
      <div class="grid3">${N("w", "العرض (س)")}${N("d", "العمق (ص)")}${N("h", "الارتفاع (ع)")}${N("x", "مكانها س")}${N("y", "مكانها ص")}${N("z", "مكانها ع")}</div>
      <div class="nudge">${["x", "y", "z"].map((a) => `<span>${{ x: "⇆", y: "⇅ عمق", z: "↕" }[a]}<button class="sm" data-xnudge="${i},${a},-1">−1</button><button class="sm" data-xnudge="${i},${a},1">+1</button></span>`).join("")}
      <label class="f inl"><span>الخامة</span><select data-xsel="${i}.material">${Object.entries(mats).map(([k, l]) => `<option value="${k}" ${k === q.material ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label></div>
      <div class="nudge"><button class="sm" data-xrot="${i},w,d" title="لف القطعة أفقي 90°">↻ لف أفقي</button><button class="sm" data-xrot="${i},d,h" title="وقّفها أو نيّمها على العمق">⤒ قلب على العمق</button><button class="sm" data-xrot="${i},w,h" title="وقّفها أو نيّمها على العرض">⇱ قلب على العرض</button></div>
      <div class="grid3"><label class="f"><span>✂ قصة ركن (شكل L)</span><select data-xcut="${i}.c"><option value="">من غير</option>${Object.entries(cutCorners(q).o).map(([k, l]) => `<option value="${k}" ${q.cut?.c === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      ${q.cut?.c ? `<label class="f"><span>طول القصة</span><input type="text" inputmode="decimal" data-numf step="0.5" data-xcut="${i}.a" value="${q.cut.a ?? 10}"></label><label class="f"><span>عرض القصة</span><input type="text" inputmode="decimal" data-numf step="0.5" data-xcut="${i}.b" value="${q.cut.b ?? 10}"></label>` : ""}</div></div>`;
  });
  if (list.length) h += `<div class="btnrow"><button class="chip ${ui.xmove ? "on" : ""}" data-xmove>✋ حرّك القطع بالصباع في الـ3D</button>${ui.xmove ? `<select id="xmoveAx" class="chip"><option value="">اتجاه: تلقائي (على سمكها)</option><option value="0" ${ui.xmoveAx === "0" ? "selected" : ""}>⇆ شمال/يمين</option><option value="2" ${ui.xmoveAx === "2" ? "selected" : ""}>↕ فوق/تحت</option><option value="1" ${ui.xmoveAx === "1" ? "selected" : ""}>⇅ قدام/ورا</option></select>` : ""}</div>`;
  // free-board units can be merged into another unit (their boards become its extra pieces)
  const others = state.project.units.filter((x) => x.id !== u.id && x.kind !== "pieces");
  if ((u.kind === "panel" && r.params?.template === "free" || list.length) && others.length) {
    h += `<div class="mergebox"><label class="f"><span>🔗 ادمج ${u.kind === "panel" && r.params?.template === "free" ? "الألواح دي" : "القطع الإضافية"} مع وحدة</span><select id="xmergeTo">${others.map((x) => `<option value="${x.id}">${esc(unitCode(x) + " " + x.name)}</option>`).join("")}</select></label><button class="ghost2" data-xmerge>ادمج</button></div>`;
  }
  return h + `</details>`;
}
/** move boards (free-panel unit's panels or this unit's extra pieces) into another unit, keeping where they stand */
function mergeInto(u, target) {
  const r = R(u), boards = u.kind === "panel" && r.params?.template === "free" ? clone(r.params.panels || []).map((q) => ({ ...q, kind: "board" })) : clone(extraOf(u));
  if (!boards.length) return 0;
  // carry every board from u's frame into the target's through the room (any rotation; 90° steps stay exact)
  const poses = projectPoses(state.project), A = poses.get(u.id), B = poses.get(target.id);
  const r1 = (v) => Math.round(v * 10) / 10;
  const toT = (lx, ly) => {
    if (!A || !B) return [lx, ly];
    const ea = Room.axisX(A.rot), za = Room.axisZ(A.rot), eb = Room.axisX(B.rot), zb = Room.axisZ(B.rot);
    const w = [A.x + ea[0] * lx - za[0] * ly - B.x, A.z + ea[1] * lx - za[1] * ly - B.z];
    return [w[0] * eb[0] + w[1] * eb[1], -(w[0] * zb[0] + w[1] * zb[1])];
  };
  const dz = (+u.lift || 0) - (+target.lift || 0);
  const mats = extraMats(target);
  let skew = false;
  const moved = boards.map((q) => {
    const x0 = +q.x || 0, y0 = +q.y || 0, w = +q.w || 0, d = +q.d || 0;
    const pts = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]].map(([a, b]) => toT(a, b));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const nx0 = Math.min(...xs), nx1 = Math.max(...xs), ny0 = Math.min(...ys), ny1 = Math.max(...ys);
    if (Math.abs((nx1 - nx0) * (ny1 - ny0) - w * d) > 0.5) skew = true;
    const swap = Math.abs(nx1 - nx0 - w) > 0.5 && Math.abs(nx1 - nx0 - d) < 0.5;
    const out = { ...q, x: r1(nx0), y: r1(ny0), z: r1((+q.z || 0) + dz), w: r1(swap ? d : nx1 - nx0), d: r1(swap ? w : ny1 - ny0), material: mats[q.material] ? q.material : "carcass" };
    if (swap) delete out.cut;
    return out;
  });
  target.extra = [...extraOf(target), ...moved];
  if (skew) alertBar("الوحدتين مش على نفس الزاوية — القطع اتحطت بأقرب مقاس، راجع مقاساتها.");
  return boards.length;
}
/** engine-frame polygons ({n, outer, holes}) → one three.js geometry in the unit group's frame */
function facesGeometry(THREE, faces) {
  const T = ([x, y, z]) => [x, z, -y];
  const arr = [];
  for (const f of faces) {
    const n = f.n;
    const ax = Math.abs(n[0]) >= Math.abs(n[1]) && Math.abs(n[0]) >= Math.abs(n[2]) ? 0 : Math.abs(n[1]) >= Math.abs(n[2]) ? 1 : 2;
    const [a, b] = [[1, 2], [0, 2], [0, 1]][ax];
    const v2 = (p) => new THREE.Vector2(p[a], p[b]);
    let tris;
    try { tris = THREE.ShapeUtils.triangulateShape(f.outer.map(v2), (f.holes || []).map((h) => h.map(v2))); } catch { tris = []; }
    const pts = [...f.outer, ...(f.holes || []).flat()], tn = T(n);
    for (const [i, j, k] of tris) {
      let A = T(pts[i]), B = T(pts[j]), C = T(pts[k]);
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      if ((uy * vz - uz * vy) * tn[0] + (uz * vx - ux * vz) * tn[1] + (ux * vy - uy * vx) * tn[2] < 0) [B, C] = [C, B];
      arr.push(...A, ...B, ...C);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  geo.computeVertexNormals();
  return geo;
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
    if (pt.role === "sliding_door") {
      // every second panel slides over its neighbour (towards -x)
      const n = +(/(\d+)$/.exec(pt.name)?.[1] || 1);
      movers.push({ kind: "slide", name: pt.name, hinge: [0, 0, 0], axis: [0, 0, 1], free: [0, 0, 0], normal: [-1, 0, 0], slide: n % 2 === 0 ? (b.x1 - b.x0) * 0.92 : 0 });
      of[i] = movers.length - 1;
      return;
    }
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
// ---- free pieces: a cut list typed in by hand (no design) → cut plan, labels, barcodes like any unit
const PIECE_DEF = () => ({ name: "", l: 60, w: 40, t: 1.8, qty: 1, lib: "hpl_white", band: { l1: true, l2: false, w1: false, w2: false }, grain: false });
function adaptPieces(u) {
  const rows = (u.params?.pieces || []).filter((r) => +r.l > 0 && +r.w > 0 && +r.t > 0 && +r.qty > 0);
  const names = {}, colors = {}, libs = {};
  const parts = [];
  let x = 0, y = 0, rowD = 0;
  // lay them out like on a workbench: rows about as wide as the whole lot is deep
  const area = rows.reduce((a, r) => a + +r.l * +r.w * Math.min(500, Math.round(+r.qty)), 0);
  const rowMax = Math.max(...rows.map((r) => +r.l), Math.sqrt(area) * 1.5, 120);
  rows.forEach((r, ri) => {
    const key = "m_" + (r.lib || "custom") + "_" + Math.round(+r.t * 10);
    const lib = r.lib && Catalog.LIB[r.lib] ? r.lib : null;
    names[key] = lib ? Catalog.libName(lib) : (r.mat || "خامة");
    colors[key] = lib ? Catalog.LIB[lib][2] : "#d9cfbf";
    libs[key] = lib;
    const q = Math.min(500, Math.round(+r.qty));
    for (let i = 0; i < q; i++) {
      const L = +r.l, W = +r.w, T = +r.t;
      if (x + L > rowMax && x > 0) { x = 0; y += rowD + 6; rowD = 0; }
      parts.push({ name: (r.name || `قطعة ${ri + 1}`) + (q > 1 ? ` (${i + 1}/${q})` : ""), material: key, cut_piece: true, role: "panel", row: ri,
        label: { w: L, h: W, t: T, banded: { bottom: !!r.band?.l1, top: !!r.band?.l2, left: !!r.band?.w1, right: !!r.band?.w2 }, grain: !!r.grain },
        box: { x0: x, x1: x + L, y0: y, y1: y + W, z0: 0, z1: T } });
      x += L + 6; rowD = Math.max(rowD, W);
    }
  });
  const ok = parts.length > 0;
  return { kind: "pieces", ok, errors: ok ? [] : ["ضيف قطعة واحدة على الأقل بمقاساتها."], warnings: [], notes: [], params: u.params || {}, parts, checks: [],
    movers: [], partMover: [], names, colors, hardware: {}, pieces: parts.length, banding: bandM(parts), doors: 0, drawers: 0, label: "قطع حرة (كت ليست)", libOf: (k) => libs[k] || null };
}
// ---- units drawn in the drawing studio: every flat solid → a board (free template: joints, banding, materials);
// shaped boards keep their real outline, cut-outs and pockets for the 3D, the labels and the CNC files
const axisOf = (v) => [0, 1, 2].find((i) => Math.abs(v[i]) > 0.999) ?? -1;
function modelOffset(m) {
  const lo = [Infinity, Infinity, Infinity];
  for (const s of m.solids || []) { const b = DG.solidBox(s); lo[0] = Math.min(lo[0], b.x0); lo[1] = Math.min(lo[1], b.y0); lo[2] = Math.min(lo[2], b.z0); }
  for (const w of m.sweeps || []) for (const P of w.path) for (let i = 0; i < 3; i++) lo[i] = Math.min(lo[i], P[i]);
  return lo.map((v) => (isFinite(v) ? -v : 0));
}
/** a stored (Arabic) text shown inside an input: translated in English mode (input values aren't translated by the page layer) */
const trv = (v) => (I18n.isEn() ? I18n.tr(v) : v);
function adaptModel(u) {
  const m = u.params.model || {};
  const fail = (e) => ({ kind: "panel", ok: false, errors: [e], warnings: [], notes: [], params: u.params, parts: [], checks: [] });
  if (!(m.solids || []).length && !(m.sweeps || []).length) return fail("الرسمة فاضية — افتحها في ورشة الرسم وارسم ألواح.");
  const off = modelOffset(m);
  const ALL = (m.solids || []).map((s) => ({ ...s, plane: { ...s.plane, o: DG.add(s.plane.o, off) } }));
  // thick blocks (a wall, a plinth block, a counter…) aren't boards: they show in the model but never go to the cut list
  const S = ALL.filter((s) => DG.isBoard(s)), blocks = ALL.filter((s) => !DG.isBoard(s));
  const panels = S.map((s, i) => {
    const b = DG.solidBox(s), ax = axisOf(DG.nOf(s.plane));
    const role = s.mat === "back" ? "back" : ax === 2 ? "horizontal" : ax === 0 ? "side" : ax === 1 && s.mat === "front" ? "door" : "other";
    const ends = [["left", "right"], ["front", "back"], ["bottom", "top"]];
    const band = s.band === false || s.mat === "back" ? [] : [0, 1, 2].filter((k) => k !== (ax >= 0 ? ax : 1)).flatMap((k) => ends[k]);
    return { name: s.name || `لوح ${i + 1}`, role, material: s.mat || "carcass", x: b.x0, y: b.y0, z: b.z0, w: Math.max(0.1, b.x1 - b.x0), d: Math.max(0.1, b.y1 - b.y0), h: Math.max(0.1, b.z1 - b.z0), band };
  });
  let base;
  if (panels.length) {
    base = adaptPanel({ ...u, params: { template: "free", panels, materials: u.params.materials || {}, ...(u.params.joints ? { joints: u.params.joints } : {}) } });
    if (!base.ok) return base;
  } else base = { ...adaptPanel({ ...u, params: { template: "free", panels: [{ name: "x", role: "other", material: "carcass", x: 0, y: 0, z: 0, w: 1, d: 1, h: 1 }], materials: u.params.materials || {} } }), parts: [], pieces: 0, banding: 0 };
  let ci = 0;
  const parts = base.parts.map((pt) => {
    if (pt.role === "hole" || !pt.cut_piece) return pt;
    const s = S[ci++];
    if (!s) return pt;
    const aligned = axisOf(DG.nOf(s.plane)) >= 0 && axisOf(s.plane.u) >= 0;
    const plain = aligned && DG.plainRect(s);
    const out = { ...pt, label: { ...pt.label }, checks: [...(pt.checks || [])], model_sid: s.id };
    if (!DG.isBoard(s)) out.checks.push(`⚠ ده مجسّم سمكه ${n1(s.depth)} سم — مش لوح بيتقص من الشيت`);
    if (plain) return out;
    out.shape = { type: "faces", faces: DG.solidFaces(s).map((f) => ({ n: f.n, outer: f.outer, holes: f.holes, mat: s.mat })) };
    let toL;
    if (aligned && pt.axes) {
      const a0 = AXK.indexOf(pt.axes[0]), a1 = AXK.indexOf(pt.axes[1]), L0 = [pt.box.x0, pt.box.y0, pt.box.z0];
      toL = (P) => [Math.round((P[a0] - L0[a0]) * 100) / 100, Math.round((P[a1] - L0[a1]) * 100) / 100];
    } else {
      const bs = DG.boardSize(s);
      out.label.w = bs.w; out.label.h = bs.h; out.label.t = bs.t; out.holes = [];
      out.checks.push("📐 لوح مايل — الأخرام والأليتا بتتعلّم في الورشة");
      toL = (P) => { const q = DG.toPlane(s.plane, P); return bs.alongU ? [q[0] - bs.b[0], q[1] - bs.b[1]] : [q[1] - bs.b[1], q[0] - bs.b[0]]; };
    }
    const W = (l) => l.map((p) => toL(DG.toWorld(s.plane, p, 0)));
    out.cnc = { outline: W(s.outer), holes: (s.holes || []).map(W), pockets: (s.pockets || []).map((pk) => ({ loop: W(pk.loop), depth: pk.depth, face: pk.face || "top" })) };
    out.band_len = s.band === false ? 0 : Math.round(DG.perimeter(s.outer) * 10) / 10;
    if (s.band !== false) out.label.banded = { left: true, right: true, top: true, bottom: true };
    const notes = [];
    if (DG.clean(s.outer).length > 4 || !aligned) notes.push("✂ قطعة مشكّلة — القص بالراوتر/CNC على شكلها");
    if ((s.holes || []).length) notes.push(`⭕ ${s.holes.length} تفريغة`);
    if ((s.pockets || []).length) notes.push(`⬚ ${s.pockets.length} حفر: ${s.pockets.map((pk) => `عمق ${n1(pk.depth)} سم ${pk.face === "bottom" ? "من الضهر" : "من الوش"}`).join("، ")}`);
    out.checks.push(...notes);
    return out;
  });
  const hardware = { ...(base.hardware || {}) };
  blocks.forEach((s, i) => {
    const faces = DG.solidFaces(s), b = DG.solidBox(s);
    parts.push({ id: 94000 + i, name: s.name || `مجسّم ${i + 1}`, role: "solid", material: s.mat || "carcass", cut_piece: false, label: null, box: b, shape: { type: "faces", faces: faces.map((f) => ({ n: f.n, outer: f.outer, holes: f.holes, mat: s.mat })) }, holes: [], checks: [`🧱 مجسّم سمكه ${n1(s.depth)} سم — بيظهر في الرسم بس ومش بيدخل القص (للحيطان استعمل أداة «حيطة» في ورشة الرسم)`] });
  });
  (m.sweeps || []).forEach((w, i) => {
    const path = w.path.map((P) => DG.add(P, off));
    const faces = DG.sweepFaces(w.profile, path, w.closed);
    const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
    for (const f of faces) for (const P of f.outer) { b.x0 = Math.min(b.x0, P[0]); b.y0 = Math.min(b.y0, P[1]); b.z0 = Math.min(b.z0, P[2]); b.x1 = Math.max(b.x1, P[0]); b.y1 = Math.max(b.y1, P[1]); b.z1 = Math.max(b.z1, P[2]); }
    const L = DG.pathLength(path, w.closed);
    parts.push({ id: 95000 + i, name: w.name || `بروفايل ${i + 1}`, role: "profile", material: w.mat || "accent", cut_piece: false, label: null, box: b, shape: { type: "faces", faces: faces.map((f) => ({ ...f, mat: w.mat })) }, holes: [], checks: [`➰ بروفايل طوله ${n1(L)} سم`] });
    const key = `بروفايل «${w.name || i + 1}» (متر طولي)`;
    hardware[key] = Math.round(((hardware[key] || 0) + L / 100) * 100) / 100;
  });
  return { ...base, parts, hardware, banding: bandM(parts), pieces: S.length, label: "تصميم من ورشة الرسم", params: { ...u.params, template: "free" }, model: true };
}
function modelProps(u, r) {
  const m = u.params.model || {};
  const shaped = r.parts?.filter((p) => p.cnc).length || 0;
  return `<details open><summary>✏️ ورشة الرسم</summary>
    <p class="hint">${(m.solids || []).length} لوح${(m.sweeps || []).length ? ` · ${m.sweeps.length} بروفايل` : ""}${shaped ? ` · ${shaped} قطعة مشكّلة (CNC)` : ""}. كل لوح بيدخل القص والملصقات والأليتا وملفات الـCNC بشكله.</p>
    <div class="btnrow"><button class="primary" data-studio>✏️ افتح في ورشة الرسم</button></div></details>`;
}
function openStudio(u, extra = {}) {
  const libs = (k) => panelLib(R(u).params || {}, k);
  Studio.open(u?.params?.model || null, {
    name: u?.name || I18n.tr("تصميم حر"),
    room: state.project.room || null,
    tool: extra.tool,
    matColor: (k) => { const l = u && libs(k); return l && Catalog.LIB[l] ? Catalog.LIB[l][2] : null; },
    matName: (k) => PANEL_MATS[k] || k,
    onDone: (model, name, x = {}) => {
      // walls, doors, windows and MEP points drawn in the studio are the project's room
      if (x.roomChanged) { state.project.room = x.room && x.room.pts?.length >= 2 ? x.room : null; if (state.project.room) { state.whole = true; ui.planOn = false; plan.vb = null; } }
      const empty = !model.solids.length && !model.sweeps.length && !model.sketches.length;
      if (u && state.project.units.includes(u)) { u.params = { ...u.params, model, template: "free" }; u.name = name || u.name; }
      else if (!empty) { const nu = { id: uid(), kind: "panel", name: name || "تصميم حر", params: { template: "free", model, materials: {} } }; state.project.units.push(nu); state.sel = nu.id; }
      state.libOpen = false; save(); render(true);
      if (empty && !u) { if (x.roomChanged) alertBar("اتحفظت الحيطان ✓ — بقت حيطان المشروع في المسقط والواجهات والـ3D"); }
      else alertBar(x.roomChanged ? "اتحفظ التصميم والحيطان ✓ — الألواح في القص والملصقات، والحيطان في المسقط" : "اتحفظ التصميم ✓ — ألواحه في القص والملصقات وملفات الـCNC");
    },
    saveLib: (model, name) => {
      const tmp = { id: uid(), kind: "panel", name: name || "تصميم حر", params: { template: "free", model, materials: u?.params?.materials || {} } };
      state.myUnits ||= [];
      state.myUnits.push(myUnitFrom(tmp, tmp.name, "من ورشة الرسم"));
      save(); myLibPush?.();
      alertBar("اتحفظ في مكتبتي ⭐");
    },
  });
}
/** any unit → a drawing you can edit freely (its boards as solids) */
function unitToModel(u) {
  const r = R(u);
  const m = Studio.newModel();
  const src = r.meshes ? r.meshes.filter((x) => x.box && x.mat !== "hole" && !/handle|hinge|leg|rail|led/i.test(x.mat || "")).map((x) => ({ name: x.name, box: x.box, material: /Front/.test(x.layer || "") ? "front" : x.mat === "countertop" ? "accent" : "carcass" }))
    : (r.parts || []).filter((pt) => pt.cut_piece && pt.box && pt.role !== "hole");
  for (const pt of src) {
    const b = pt.box, d = [b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0], ax = d.indexOf(Math.min(...d));
    const pl = ax === 2 ? { o: [b.x0, b.y0, b.z0], u: [1, 0, 0], v: [0, 1, 0] } : ax === 0 ? { o: [b.x0, b.y0, b.z0], u: [0, 1, 0], v: [0, 0, 1] } : { o: [b.x0, b.y1, b.z0], u: [1, 0, 0], v: [0, 0, 1] };
    const [w, h] = ax === 2 ? [d[0], d[1]] : ax === 0 ? [d[1], d[2]] : [d[0], d[2]];
    const mat = ["carcass", "front", "shelf", "accent", "back"].includes(pt.material) ? pt.material : /door|front/.test(pt.material) ? "front" : pt.material === "back" ? "back" : "carcass";
    m.solids.push({ id: Math.random().toString(36).slice(2, 9), name: pt.name, mat, plane: pl, outer: DG.rect(0, 0, w, h), holes: [], pockets: [], depth: Math.round(d[ax] * 100) / 100 });
  }
  return m;
}
function piecesProps(u) {
  const rows = (u.params.pieces ||= []);
  const libOpts = (v) => LIB_GROUPS.map(([g, test]) => `<optgroup label="${esc(g)}">${Object.keys(Catalog.LIB).filter(test).map((k) => `<option value="${k}" ${k === v ? "selected" : ""}>${esc(Catalog.LIB[k][0])}</option>`).join("")}</optgroup>`).join("");
  const total = rows.reduce((a, r) => a + (+r.qty || 0), 0);
  return `<details open><summary>القطع (${rows.length} صنف · ${total} قطعة)</summary>
    <p class="hint">المقاسات بالسم. الطول هو اتجاه الألياف. علّم على الحروف اللي عليها شريط: ط١ ط٢ = حرفين الطول، ع١ ع٢ = حرفين العرض.</p>
    <div class="pcs">${rows.map((r, i) => `<div class="pcrow" data-pi="${i}">
      <div class="pchead"><b class="num">${i + 1}</b><input data-pf="name" value="${esc(trv(r.name || ""))}" placeholder="اسم القطعة (جنب، رف، باب…)"><button class="danger sm" data-pdel="${i}" aria-label="امسح القطعة">${ICON.trash}</button></div>
      <div class="pcgrid">
        <label><span>الطول</span><input type="text" inputmode="decimal" data-numf step="0.1" data-pf="l" value="${r.l}"></label>
        <label><span>العرض</span><input type="text" inputmode="decimal" data-numf step="0.1" data-pf="w" value="${r.w}"></label>
        <label><span>السمك</span><input type="text" inputmode="decimal" data-numf step="0.1" data-pf="t" value="${r.t}"></label>
        <label><span>العدد</span><input type="text" inputmode="decimal" data-numf inputmode="numeric" step="1" min="1" data-pf="qty" value="${r.qty}"></label>
      </div>
      <label class="pcmat"><span>الخامة</span><select data-pf="lib">${libOpts(r.lib)}</select></label>
      <div class="pcband">${[["l1", "ط١"], ["l2", "ط٢"], ["w1", "ع١"], ["w2", "ع٢"]].map(([k, l]) => `<label><input type="checkbox" data-pb="${k}" ${r.band?.[k] ? "checked" : ""}>${l}</label>`).join("")}<label><input type="checkbox" data-pf="grain" ${r.grain ? "checked" : ""}>ألياف (ما تلفّش)</label></div>
    </div>`).join("")}</div>
    <div class="btnrow"><button class="add" data-padd>${ICON.plus}قطعة جديدة</button><button class="ghost2" data-pdup>نسخ آخر قطعة</button></div></details>
    <details><summary>لزق من Excel أو ملف CSV</summary>
      <p class="hint">كل سطر قطعة: الاسم، الطول، العرض، العدد (والسمك اختياري). من Excel انسخ الأعمدة وألزقها هنا.</p>
      <textarea id="pcPaste" rows="5" placeholder="جنب, 72, 58, 2&#10;رف, 56.4, 54, 3, 1.8"></textarea>
      <div class="btnrow"><button class="ghost2" data-ppaste>ضيف القطع دي</button></div></details>
    <p class="hint">خطة القص والملصقات بالباركود في تبويب <b>القص</b>، والجدول في <b>القطع والحصر</b>، وكل التصديرات (Excel، PDF، الملصقات) شغالة عادي.</p>`;
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
  return { ...base, movers: pm.movers, partMover: pm.of, names, colors, hardware, pieces: r.summary.piece_count, banding: bandM(r.parts), doors: r.summary.door_count + (r.summary.sliding?.panels || 0), drawers: r.summary.drawer_count,
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
  const hw = { ...(r.hardware || {}) };
  for (const [k, q] of Object.entries(orgHardware(u) || {})) hw[k] = (hw[k] || 0) + q;
  doorSwing(r, p);
  let meshes = r.meshes, parts = r.parts, warnings = r.warnings;
  if (Obs.any(u.params)) {
    const ob = Obs.applyKitchen(r, u.params);
    if (ob) { meshes = ob.meshes; parts = ob.parts; warnings = [...(r.warnings || []), ...ob.warnings]; }
  }
  const slides = (r.movers || []).filter((m) => m.kind === "slide").length;
  if (slides) {
    // one top + bottom track per run of sliding panels, as long as the run
    const runs = new Map();
    (r.movers || []).forEach((m, i) => {
      if (m.kind !== "slide") return;
      const pre = m.name.replace(/باب سحاب \d+$/, "");
      const bs = r.meshes.filter((x) => x.mover === i).map((x) => x.box);
      const run = runs.get(pre) || [Infinity, -Infinity];
      for (const b of bs) { run[0] = Math.min(run[0], b.x0); run[1] = Math.max(run[1], b.x1); }
      runs.set(pre, run);
    });
    for (const [, [a, b]] of runs) { const k = `طقم سكة سحّاب (علوي + سفلي) ${Math.round((b - a)) / 100} م`; hw[k] = (hw[k] || 0) + 1; }
    hw["عجل/بكر سحّاب"] = (hw["عجل/بكر سحّاب"] || 0) + slides * 2;
  }
  return { ...base, meshes, parts, warnings, obstacles: Obs.any(u.params), names, colors, hardware: hw, pieces: parts.length, banding: bandM(parts), doors: r.stats.doors + slides, drawers: r.stats.drawers,
    label: `${kind} · ${KU.K_TYPES[p.unit_type] || ""}`, libOf };
}
/** how far each door may swing, and around which edge: a normal door stops at 90° so neighbours
 * never run into each other; corner doors take 170° hinges (diagonal 130° — any more and it hits the
 * next run). The pivot sits on the door's outer face, like a real hinge, so a wide-opening door folds
 * in front of its neighbour instead of through it. */
function doorSwing(r, p) {
  if (r.__swing) return;
  r.__swing = true;
  const cat = p.unit_category, cs = p.corner_style || "blind";
  const wide = cat === "corner_glass_display" || (cat === "corner" && (cs === "l_shape" || cs === "open")) ? (170 * Math.PI) / 180
    : cat === "corner" && cs === "diagonal" ? (130 * Math.PI) / 180 : null;
  r.movers.forEach((mv, i) => {
    if (mv.kind !== "door") return;
    if (Math.abs(mv.axis[2]) >= 0.5 && wide) mv.maxAng = wide;
    let out = -Infinity;
    for (const m of r.meshes) {
      if (m.mover !== i || !m.box) continue;
      const b = m.box;
      for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) out = Math.max(out, x * mv.normal[0] + y * mv.normal[1] + z * mv.normal[2]);
    }
    if (!isFinite(out)) return;
    const d = out - (mv.hinge[0] * mv.normal[0] + mv.hinge[1] * mv.normal[1] + mv.hinge[2] * mv.normal[2]);
    if (d > 0.05) {
      mv.hinge = mv.hinge.map((v, k) => v + mv.normal[k] * d);
      mv.free = mv.free.map((v, k) => v + mv.normal[k] * d);
    }
  });
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
  <button id="homeBtn" class="projbtn" aria-label="الشاشة الرئيسية" title="المشاريع">🏠</button>
  <button id="projBtn" class="projbtn">${ICON.folder}<span id="projName"></span></button>
  <span class="undogrp"><button id="undoBtn" class="projbtn" aria-label="تراجع" title="تراجع (⌘Z)" disabled>↶</button><button id="redoBtn" class="projbtn" aria-label="إعادة" title="إعادة (⇧⌘Z)" disabled>↷</button></span>
  <button id="saveBtn" class="projbtn savebtn" aria-label="حفظ">💾<span>حفظ</span></button>
  <button id="drawBtn" class="projbtn drawbtn" title="ورشة الرسم" aria-label="ورشة الرسم">✏️<span>ورشة الرسم</span></button>
  <button id="expBtn" class="projbtn">${ICON.share}<span>تصدير</span></button>
  <button id="menuBtn" class="projbtn" aria-label="القائمة">☰<span>القائمة</span></button>
  <span id="cloud" class="cloud"></span>
  <nav class="tabs" role="tablist">
    <button data-tab="design" role="tab"><span class="tl">التصميم</span><span class="ts">تصميم</span></button>
    <button data-tab="cut" role="tab"><span class="tl">القص</span><span class="ts">قص</span></button>
    <button data-tab="parts" role="tab"><span class="tl">القطع والحصر</span><span class="ts">قطع</span></button>
    <button data-tab="shop" role="tab"><span class="tl">الورشة والعميل</span><span class="ts">ورشة</span></button>
  </nav>
</header>
<nav id="steps" class="steps" aria-label="خطوات الشغل"></nav>
<main id="views">
  <section id="v-design" class="design">
    <aside id="lib" class="lib"></aside>
    <div class="stage">
      <button id="fsBtn" class="fsbtn" aria-label="ملء الشاشة" title="ملء الشاشة">⛶</button>
      <div id="chips" class="chips"></div>
      <div id="scenep" class="scenep" hidden></div>
      <div id="inspp" class="scenep" hidden></div>
      <div id="multibar" class="movebar multibar" hidden></div>
      <div id="movebar" class="movebar" hidden><span>وضع التحريك — اسحب الوحدة اللي عليها الإطار الدهبي. دوس على وحدة تانية عشان تختارها.</span><button data-moveoff>✕ خروج</button></div>
      <div id="view3d" class="view3d"><div id="fallback" class="fallback" hidden></div><div id="ptbar" class="ptbar" hidden></div>
        <div class="vctl" role="toolbar" aria-label="التحكم في العرض">
          <span class="vmode" role="group" aria-label="اللمس بيحرّك إيه"><button data-vmode="scene" title="السحب بيلف المشهد كله">🌍 المشهد</button><button data-vmode="units" title="السحب بيحرّك الوحدة المختارة">✋ الوحدات</button></span>
          <button data-vz="0.8" aria-label="قرّب">+</button><button data-vz="1.25" aria-label="بعّد">−</button>
          <button data-vr="-25" aria-label="لف الكاميرا شمال">⟲</button><button data-vr="25" aria-label="لف الكاميرا يمين">⟳</button>
          <button data-vp="fit" aria-label="شوف الكل">⤢</button>
        </div>
        <div class="vcube" role="toolbar" aria-label="المناظير والمساقط">
          <button data-vp="home" class="vhome" title="رجّع الكاميرا للوضع الأساسي">🏠<small>الأساسي</small></button>
          <button data-vp="iso" title="منظور">⬢<small>منظور</small></button>
          <button data-vp="top" title="مسقط أفقي (من فوق)">⬒<small>فوق</small></button>
          <button data-vp="front" title="واجهة قدام">▣<small>قدام</small></button>
          <button data-vp="back" title="واجهة ورا">▣<small>ورا</small></button>
          <button data-vp="right" title="جنب يمين">◧<small>يمين</small></button>
          <button data-vp="left" title="جنب شمال">◨<small>شمال</small></button>
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
<div id="pop" class="pop" hidden></div>
<div id="home" class="home" hidden></div>
<section id="survey" class="sv" hidden></section>`;

$(".tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (!b) return;
  state.tab = b.dataset.tab;
  save();
  render(true);
});
// ---- first-run tour: a few cards pointing at the real buttons
const TOUR = [
  ["#steps", "أهلاً بيك في NOVERA Studio 👋", "الشريط ده هو خريطة الشغل كله بالترتيب: الأوضة ← التصميم ← الخامات ← القص ← القطع ← السعر ← العميل ← الورشة. دوس على أي خطوة توديك عليها، و✓ معناها إنها خلصت."],
  ['#steps [data-step0="room"]', "① الأوضة", "ارسم الحيطان، أو اختار أوضة جاهزة بالمقاسات، أو امسحها بالكاميرا. الأبواب والشبابيك والأعمدة بتتحط عليها."],
  ["#libBtn", "② التصميم", "من «المكتبة» ضيف أي وحدة جاهزة — أو من الأوضة دوس «✨ صمّملي المطبخ»."],
  ["#view3d", "✋ عدّل بصباعك", "دوس على الوحدة: مقاساتها بتظهر جنبها — دوس على أي رقم وغيّره. وكل الإعدادات في اللوحة اللي على الجنب (أساسي / كل الإعدادات + بحث)."],
  [".undogrp", "↶ غلطت؟ ولا يهمك", "التراجع بيرجّع أي خطوة — أو المس الشاشة بصباعين."],
  ["#menuBtn", "☰ القائمة", "كل الباقي هنا: مشاريعي، التصدير، رفع المقاسات، الإعدادات الافتراضية، والمظهر. وتقدر ترجع للجولة دي من هنا."],
];
function startTour(i = 0) {
  let el = $("#tour");
  if (!el) { el = document.createElement("div"); el.id = "tour"; document.body.appendChild(el); }
  const st = TOUR[i];
  if (!st) { el.remove(); state.tourDone = true; save(); return; }
  const [sel, title, text] = st;
  const tg = document.querySelector(sel);
  const r = tg && tg.offsetParent !== null ? tg.getBoundingClientRect() : null;
  const pad = 6;
  const ring = r ? `<div class="tring" style="left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px"></div>` : "";
  const below = !r || r.top < innerHeight / 2;
  const cy = r ? (below ? Math.min(r.bottom + 14, innerHeight - 230) : Math.max(r.top - 220, 10)) : innerHeight / 2 - 110;
  el.innerHTML = `${ring}<div class="tcard" role="dialog" aria-label="${esc(title)}" style="top:${cy}px"><b>${esc(title)}</b><p>${esc(text)}</p>
    <div class="trow"><span>${i + 1} / ${TOUR.length}</span><button class="ghost2" data-tskip>تخطّي</button><button class="primary" data-tnext>${i === TOUR.length - 1 ? "يلا نبدأ" : "التالي ←"}</button></div></div>`;
  el.onclick = (e) => {
    if (e.target.closest("[data-tnext]")) startTour(i + 1);
    else if (e.target.closest("[data-tskip]")) startTour(TOUR.length);
  };
}
document.addEventListener("click", (e) => { if (e.target.closest("[data-tour]")) { ui.pop = null; renderPop(); startTour(0); } });
// ---- the job, step by step: ① room ② design ③ materials ④ price ⑤ client ⑥ workshop
const STEPS = [["room", "📐 الأوضة"], ["design", "🎨 التصميم"], ["mats", "🪵 الخامات"], ["cut", "✂ القص"], ["parts", "📋 القطع"], ["price", "💰 السعر"], ["client", "🤝 العميل"], ["shop", "🏭 الورشة"]];
function stepNow() {
  if (state.tab === "cut") return "cut";
  if (state.tab === "parts") return "parts";
  if (state.tab === "shop") return ui.stepAt === "client" ? "client" : ui.stepAt === "shop" ? "shop" : "price";
  if (ui.planOn) return "room";
  return ui.stepAt === "mats" ? "mats" : "design";
}
function stepDone(k) {
  const p = state.project;
  if (k === "room") return !!p.room?.pts?.length;
  if (k === "design") return p.units.length > 0;
  if (k === "mats") return p.units.some((u) => Object.keys(u.libs || {}).length);
  if (k === "price") return !!(state.prices && Object.keys(state.prices.sheets || {}).length);
  if (k === "client") return !!(ui.sharedAt || p.sharedAt || p.approval);
  if (k === "cut" || k === "parts") return !!p.stockTaken || !!p.stages?.cut?.done;
  return !!p.stockTaken || (p.stages && Object.keys(p.stages).length > 1);
}
function renderSteps() {
  const el = $("#steps");
  if (!el) return;
  el.hidden = ui.mode !== "owner";
  const now = stepNow();
  el.innerHTML = STEPS.map(([k, l], i) => `<button data-step0="${k}" class="${k === now ? "on" : ""} ${stepDone(k) ? "done" : ""}"><b>${stepDone(k) && k !== now ? "✓" : i + 1}</b><span>${l}</span></button>`).join('<i aria-hidden="true"></i>');
  const on = el.querySelector(".on");
  if (on && el.scrollWidth > el.clientWidth) { const r = on.getBoundingClientRect(), b = el.getBoundingClientRect(); if (r.left < b.left || r.right > b.right) on.scrollIntoView({ inline: "center", block: "nearest" }); }
}
$("#steps").addEventListener("click", (e) => {
  const b = e.target.closest("[data-step0]");
  if (!b) return;
  const k = b.dataset.step0;
  ui.stepAt = k;
  const scrollTo = (sel, txt) => setTimeout(() => {
    const host = $(sel);
    const want = [txt, I18n.tr(txt)];
    const h = [...(host?.querySelectorAll("h3, summary") || [])].find((x) => want.some((w) => x.textContent.includes(w)));
    const box = h?.closest("details, section") || h;
    if (box?.tagName === "DETAILS") box.open = true;
    box?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, 120);
  if (k === "room") { state.tab = "design"; ui.planOn = true; ui.planView = "plan"; state.libOpen = false; }
  else if (k === "design") { state.tab = "design"; ui.planOn = false; state.whole = true; }
  else if (k === "mats") {
    state.tab = "design"; ui.planOn = false;
    if (!state.sel && state.project.units[0]) state.sel = state.project.units[0].id;
    scrollTo("#props", "الخامات");
    if (state.project.units.length) alertBar("اختار وحدة ودوس على أي خامة تغيّرها — وتقدر تطبّقها على كل الوحدات من نفس المكان.");
  }
  else if (k === "price") { state.tab = "shop"; scrollTo("#v-shop", "الأسعار"); }
  else if (k === "client") { state.tab = "shop"; scrollTo("#v-shop", "العميل"); }
  else if (k === "cut") state.tab = "cut";
  else if (k === "parts") state.tab = "parts";
  else { state.tab = "shop"; scrollTo("#v-shop", "الورشة"); }
  save(); render(true);
});
$("#libBtn").addEventListener("click", () => { state.libOpen = !state.libOpen; render(); });
{
  // tap a unit to select it; drag the selected unit along the floor — it snaps to walls and neighbours
  let down = null, drag = null, ptDrag = null;
  const host = $("#view3d");
  let press = 0;
  // ---- two-finger tap = undo, three-finger tap = redo (like the drawing apps on iPad)
  const taps = new Map();
  let tapT = 0;
  host.addEventListener("pointerdown", (e) => { if (e.pointerType !== "touch") return; if (!taps.size) tapT = performance.now(); taps.set(e.pointerId, [e.clientX, e.clientY, 0]); }, true);
  host.addEventListener("pointermove", (e) => { const t = taps.get(e.pointerId); if (t) t[2] = Math.max(t[2], Math.hypot(e.clientX - t[0], e.clientY - t[1])); }, true);
  const tapEnd = (e) => {
    if (!taps.has(e.pointerId)) return;
    const n = taps.size, still = [...taps.values()].every((t) => t[2] < 12), quick = performance.now() - tapT < 320;
    if (n >= 2 && still && quick && ui.mode === "owner") { taps.clear(); histGo(n === 2 ? -1 : 1); return; }
    taps.delete(e.pointerId);
  };
  host.addEventListener("pointerup", tapEnd, true);
  host.addEventListener("pointercancel", (e) => taps.delete(e.pointerId), true);
  // ---- drag a drawn/merged piece with the finger (along its thickness, or the axis picked)
  let xdrag = null;
  host.addEventListener("pointerdown", (e) => {
    if (!ui.xmove || ui.mode !== "owner" || !view.ready || !e.isPrimary || e.target.closest(".vctl, .movebar")) return;
    const T = view.three, rc = view.ren.domElement.getBoundingClientRect(), ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1), view.cam);
    const h = ray.intersectObjects(view.pickables || [], true).find((x) => x.object.isMesh && x.object.visible);
    if (!h || h.object.userData.xi == null) return;
    let g = h.object; while (g && !g.userData.unitId) g = g.parent;
    const u = g && state.project.units.find((x) => x.id === g.userData.unitId);
    const xi = h.object.userData.xi, q = u?.extra?.[xi];
    if (!q) return;
    e.stopPropagation();
    const dims = [+q.w || 0, +q.d || 0, +q.h || 0];
    const ax = ui.xmoveAx !== "" && ui.xmoveAx != null ? +ui.xmoveAx : dims.indexOf(Math.min(...dims));
    const c = new T.Vector3((+q.x || 0) + dims[0] / 2, (+q.z || 0) + dims[2] / 2, -((+q.y || 0) + dims[1] / 2));
    const dirL = [new T.Vector3(1, 0, 0), new T.Vector3(0, 0, -1), new T.Vector3(0, 1, 0)][ax];
    const s0 = g.localToWorld(c.clone()).project(view.cam), s1 = g.localToWorld(c.clone().addScaledVector(dirL, 10)).project(view.cam);
    const px = (v) => [(v.x + 1) / 2 * rc.width, (1 - v.y) / 2 * rc.height];
    const a0 = px(s0), a1 = px(s1), dv = [a1[0] - a0[0], a1[1] - a0[1]], len = Math.hypot(...dv);
    if (len < 2) { alertBar("القطعة دي مش باينة في الاتجاه ده من الزاوية دي — لف المشهد أو اختار اتجاه تاني."); return; }
    const objs = [];
    g.traverse((o) => { if (o.userData.xi === xi) objs.push([o, o.position.clone()]); });
    xdrag = { pid: e.pointerId, u, xi, ax, dir: [dv[0] / len, dv[1] / len], ppc: len / 10, xy: [e.clientX, e.clientY], v0: +q[AXK[ax]] || 0, d: 0, objs, dirL };
    if (u.id !== state.sel) { state.sel = u.id; renderStrip(); }
    view.ctl.enabled = false;
    try { host.setPointerCapture(e.pointerId); } catch { /* gone */ }
  }, true);
  host.addEventListener("pointermove", (e) => {
    if (!xdrag || e.pointerId !== xdrag.pid) return;
    e.stopPropagation();
    const d = ((e.clientX - xdrag.xy[0]) * xdrag.dir[0] + (e.clientY - xdrag.xy[1]) * xdrag.dir[1]) / xdrag.ppc;
    xdrag.d = Math.round(d * 2) / 2;
    for (const [o, p0] of xdrag.objs) o.position.copy(p0).addScaledVector(xdrag.dirL, xdrag.d);
    view.dirty = true;
    const lab = { 0: "من الشمال", 1: "من قدام", 2: "من تحت" }[xdrag.ax];
    alertBar(`${xdrag.u.extra[xdrag.xi].name}: ${Math.round((xdrag.v0 + xdrag.d) * 10) / 10} سم ${lab}`);
  }, true);
  const xend = (e) => {
    if (!xdrag || e.pointerId !== xdrag.pid) return;
    e.stopPropagation();
    const { u, xi, ax, v0, d } = xdrag;
    xdrag = null;
    view.ctl.enabled = true;
    down = null;
    if (d) setExtra(u, (l) => { if (l[xi]) l[xi][AXK[ax]] = Math.round((v0 + d) * 10) / 10; });
  };
  host.addEventListener("pointerup", xend, true);
  host.addEventListener("pointercancel", (e) => { if (xdrag && e.pointerId === xdrag.pid) { for (const [o, p0] of xdrag.objs) o.position.copy(p0); xdrag = null; view.ctl.enabled = true; view.dirty = true; } }, true);
  const startDrag = (e, id) => {
    if (id !== state.sel) { state.sel = id; save(); renderStrip(); renderChips(); renderProps(); }
    const u = selUnit(), L = view.poses?.get(id), hit = view.floorAt(e.clientX, e.clientY);
    if (!u || !L || !hit) return;
    const box = localBox(R(u));
    const c = Room.centerOf(L, box);
    drag = { pid: e.pointerId, t: performance.now(), xy: [e.clientX, e.clientY], start: L, u, box, rot: L.rot, off: [c[0] - hit[0], c[1] - hit[1]], row: rowOf(u, R(u)), segs: roomSegs(state.project), pose: L,
      others: projectItems(state.project).filter((it) => it.id !== id).map((it) => ({ box: it.box, row: it.row, pose: view.poses.get(it.id) })).filter((o) => o.pose) };
    view.ctl.enabled = false;
    view.highlight(id, true);
    try { host.setPointerCapture(e.pointerId); } catch { /* pointer gone */ }
  };
  // orbiting never moves furniture: a unit moves only in "units" (move) mode
  // capture phase: runs before the orbit controls, so a move can claim the finger outright
  /** stop a move half-way and put the unit back (a second finger, the app going to the background …) */
  const cancelDrag = () => {
    if (drag) { view.highlight(drag.u.id, false); view.movePicked(drag.u.id, drag.start); drag = null; }
    ptDrag = null;
    down = null;
    clearTimeout(press);
    if (view.ready && !(view.final?.active && view.final.locked !== false)) view.ctl.enabled = true;
  };
  host.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".vctl, .movebar") || view.final?.active) return;
    if (drag && e.pointerId !== drag.pid) cancelDrag(); // a second finger means zoom / turn, never "move further"
    if (!drag && !ptDrag) view.ctl.enabled = true;
    down = [e.clientX, e.clientY];
    clearTimeout(press);
    // move mode + a selected electrical/plumbing point under the finger: slide it over its wall
    if (ui.moveMode && ui.room3d && ui.planSel?.kind === "pt" && state.project.room) {
      const h = view.pickAny(e.clientX, e.clientY);
      const pt = (state.project.room.points || []).find((x) => x.id === ui.planSel.id);
      const seg = pt && Room.segments(state.project.room).find((g) => g.id === pt.wall);
      if (h?.kind === "pt" && h.id === pt?.id && seg) {
        e.stopPropagation();
        ptDrag = { pt, seg };
        view.ctl.enabled = false;
        try { host.setPointerCapture(e.pointerId); } catch { /* gone */ }
        return;
      }
    }
    if (!wholeView() || ui.mode !== "owner" || !view.ready || !e.isPrimary) return;
    const id = view.pickAt(e.clientX, e.clientY);
    if (!id || id !== state.sel) return; // only the outlined (selected) unit ever moves
    if (ui.moveMode) { e.stopPropagation(); startDrag(e, id); return; }
    // "scene" mode: nothing ever moves — a drag only turns the camera
  }, true);
  host.addEventListener("pointermove", (e) => {
    if (drag && e.pointerId !== drag.pid) return;
    if ((drag || ptDrag) && e.pointerType === "mouse" && e.buttons === 0) { end(e); return; }
    if (drag) {
      // after a slow frame the finger may already be far away: take the new place as the start, don't jump there
      const now = performance.now(), jump = Math.hypot(e.clientX - drag.xy[0], e.clientY - drag.xy[1]);
      const late = now - drag.t > 300 && jump > 90;
      drag.t = now; drag.xy = [e.clientX, e.clientY];
      if (late) { const hit = view.floorAt(e.clientX, e.clientY); const c = Room.centerOf(drag.pose, drag.box); if (hit) drag.off = [c[0] - hit[0], c[1] - hit[1]]; return; }
    }
    if (ptDrag) {
      const T = view.three, { pt, seg } = ptDrag;
      const rc = view.ren.domElement.getBoundingClientRect();
      const ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1), view.cam);
      const plane = new T.Plane(new T.Vector3(seg.n[0], 0, seg.n[1]), -(seg.n[0] * seg.A[0] + seg.n[1] * seg.A[1]));
      const q = new T.Vector3();
      if (!ray.ray.intersectPlane(plane, q)) return;
      pt.at = Math.round(Math.max(5, Math.min(seg.L - 5, (q.x - seg.A[0]) * seg.d[0] + (q.z - seg.A[1]) * seg.d[1])));
      pt.z = Math.round(Math.max(5, Math.min(seg.h - 5, q.y)));
      view.group?.traverse((o) => { if (o.userData.pt === pt.id) o.position.set(seg.A[0] + seg.d[0] * pt.at + seg.n[0] * 0.8, pt.z, seg.A[1] + seg.d[1] * pt.at + seg.n[1] * 0.8); });
      view.dirty = true;
      return;
    }
    if (down && !drag) { down[2] = e.clientX - down[0]; down[3] = e.clientY - down[1]; if (Math.hypot(down[2], down[3]) > 8) clearTimeout(press); }
    if (!drag) return;
    const hit = view.floorAt(e.clientX, e.clientY);
    if (!hit) return;
    drag.pose = Room.snapPose(drag.segs, drag.box, [hit[0] + drag.off[0], hit[1] + drag.off[1]], drag.rot, drag.others, drag.row);
    view.movePicked(drag.u.id, drag.pose);
  });
  const end = (e) => {
    clearTimeout(press);
    if (ptDrag) { ptDrag = null; view.ctl.enabled = true; down = null; save(); renderProps(); view.update(); return; }
    if (view.final?.active && !drag) { down = null; return; } // taps never change the selection while the final render runs
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
    if (!down || ui.mode !== "owner" || e.type !== "pointerup" || (!wholeView() && !(ui.tapHide && ui.inspOpen) && !ui.xdraw)) { down = null; return; }
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
    down = null;
    if (moved > 6) return;
    if (ui.xdraw) { drawPieceAt(e.clientX, e.clientY); return; }
    if (ui.tapHide && ui.inspOpen) {
      const T = view.three, rc = view.ren.domElement.getBoundingClientRect(), ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1), view.cam);
      const h = ray.intersectObjects(view.pickables || [], true).find((x) => x.object.isMesh && x.object.userData.pname);
      if (h) {
        let o = h.object; while (o && !o.userData.unitId) o = o.parent;
        if (o) { ui.hidePart.add(o.userData.unitId + "|" + h.object.userData.pname); renderInsp(); view.update(); }
      }
      return;
    }
    const hit = view.pickAny(e.clientX, e.clientY);
    if (!hit && ui.moveMode) { sceneMode(); alertBar("رجعت للوضع العادي — السحب بيلف المشهد كله."); return; }
    if (hit?.kind === "unit") {
      if (ui.multi) { ui.multi.has(hit.id) ? ui.multi.delete(hit.id) : ui.multi.add(hit.id); renderMulti(); renderStrip(); view.update(); return; }
      ui.room3d = false; ui.planSel = null;
      if (hit.id !== state.sel) { state.sel = hit.id; save(); renderStrip(); renderChips(); renderProps(); renderErrs(); view.update(); }
      else renderProps();
    } else if (hit && state.project.room) {
      // a wall, an electrical/plumbing point or a column: its settings open on the side, like in the plan
      ui.room3d = true; ui.planSel = { kind: hit.kind, id: hit.id };
      renderProps(); renderChips();
      if (matchMedia("(max-width: 640px), (max-height: 520px)").matches && ui.sheet !== "full") { ui.sheet = "half"; document.body.dataset.sheet = "half"; }
    }
  };
  host.addEventListener("pointerup", end);
  host.addEventListener("pointercancel", end);
  host.addEventListener("lostpointercapture", (e) => { if (drag || ptDrag) end(e); });
  // the orbit controls must never keep a finger that already lifted (a lift lost during a slow frame keeps the
  // camera turning with every later touch): every finger that goes down on the 3D view is matched with its lift
  const live = new Set();
  const cv = () => view.ren?.domElement;
  host.addEventListener("pointerdown", (e) => live.add(e.pointerId), true);
  const release = (e) => {
    if (!live.has(e.pointerId)) return;
    live.delete(e.pointerId);
    const c = cv();
    if (c && e.target !== c && !c.contains(e.target)) c.dispatchEvent(new PointerEvent("pointerup", { pointerId: e.pointerId, pointerType: e.pointerType, clientX: e.clientX, clientY: e.clientY, bubbles: true }));
  };
  addEventListener("pointerup", release, true);
  addEventListener("pointercancel", release, true);
  const dropAll = () => {
    cancelDrag();
    const c = cv();
    for (const id of live) c?.dispatchEvent(new PointerEvent("pointercancel", { pointerId: id, bubbles: true }));
    live.clear();
  };
  addEventListener("blur", dropAll);
  document.addEventListener("visibilitychange", () => { if (document.hidden) dropAll(); });
}
document.querySelector("#view3d .vctl").addEventListener("pointerdown", (e) => e.stopPropagation());
document.querySelector("#view3d .vctl").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b?.dataset.vmode) { if (b.dataset.vmode === "scene") sceneMode(); else { ui.moveMode = true; renderMoveBar(); renderChips(); if (!state.sel) alertBar("اختار وحدة الأول (دوس عليها) وبعدين اسحبها."); } return; }
  if (!b || !view.ready) return;
  if (b.dataset.vz) view.zoom(+b.dataset.vz);
  else if (b.dataset.vr) view.orbit(+b.dataset.vr);
  else if (b.dataset.vp) view.preset(b.dataset.vp);
});
// ---- inspect a unit: exploded view, cut it open, hide kinds of pieces or single pieces
const PART_KINDS = { door: "الضلف", drawer: "وشوش الأدراج", drawerBox: "صناديق الأدراج", shelf: "الأرفف", side: "الأجناب", top: "الرأس", base: "القاعدة", back: "الظهر", divider: "القواطيع", counter: "الكونتر", plinth: "السكلو", handle: "المقابض", rail: "الشماعات", led: "الليد", filler: "الفيلرات", other: "باقي القطع" };
function renderInsp() {
  const el = $("#inspp");
  const u = selUnit();
  const on = !!(ui.inspOpen && u && state.tab === "design" && !ui.planOn);
  el.hidden = !on;
  if (!on) return;
  const r = R(u);
  const have = new Set((r.meshes || r.parts || []).filter((x) => x.role !== "hole" && x.mat !== "hole").map((x) => partClass(x.name, x.role)));
  ui.hideCls ??= new Set(); ui.hidePart ??= new Set();
  const hidden = [...ui.hidePart].filter((k) => k.startsWith(u.id + "|")).length;
  el.innerHTML = `<div class="sph"><b>فك وشوف من جوه</b><button class="x" data-iclose aria-label="قفل">×</button></div>
    <label class="sl"><span>تفكيك الوحدة <b class="num">${Math.round((ui.explode || 0) * 100)}%</b></span><input type="range" min="0" max="120" step="5" data-iexp value="${Math.round((ui.explode || 0) * 100)}"></label>
    <h4>اقطعها وشوف جواها</h4>
    <div class="seg">${[["", "من غير"], ["front", "من قدام"], ["top", "من فوق"], ["side", "من الجنب"]].map(([k, l]) => `<button data-icut="${k}" class="${(ui.cut || "") === k ? "on" : ""}">${l}</button>`).join("")}</div>
    ${ui.cut ? `<label class="sl"><span>مكان القطع</span><input type="range" min="2" max="98" step="1" data-icutt value="${Math.round((ui.cutT ?? 0.5) * 100)}"></label>` : ""}
    <h4>اخفي</h4>
    <div class="stogs">${Object.entries(PART_KINDS).filter(([k]) => have.has(k)).map(([k, l]) => `<button class="chip tog ${ui.hideCls.has(k) ? "" : "on"}" data-ihide="${k}">${ui.hideCls.has(k) ? "◌" : "●"} ${l}</button>`).join("")}</div>
    <button class="chip tog ${ui.tapHide ? "on" : ""}" data-itap>👆 ${ui.tapHide ? "دوس على أي قطعة في العرض تختفي…" : "اخفي قطعة بالضغط عليها"}</button>
    ${hidden ? `<p class="hint">مخفي ${hidden} قطعة بالضغط.</p>` : ""}
    <button class="add" data-ireset>رجّع كل حاجة زي ما كانت</button>`;
}
const inspUpdate = () => { clearTimeout(ui.inspT); ui.inspT = setTimeout(() => view.update(), 60); };
$("#inspp").addEventListener("pointerdown", (e) => e.stopPropagation());
$("#inspp").addEventListener("input", (e) => {
  const t = e.target;
  if (t.hasAttribute("data-iexp")) { ui.explode = +t.value / 100; const b = t.closest("label").querySelector("b"); if (b) b.textContent = t.value + "%"; inspUpdate(); }
  if (t.hasAttribute("data-icutt")) { ui.cutT = +t.value / 100; inspUpdate(); }
});
$("#inspp").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (b.hasAttribute("data-iclose")) { ui.inspOpen = false; ui.tapHide = false; renderInsp(); renderChips(); return; }
  if (d.icut !== undefined) { ui.cut = d.icut || null; if (!ui.cut) view.ren.localClippingEnabled = false; renderInsp(); view.update(); return; }
  if (d.ihide) { ui.hideCls.has(d.ihide) ? ui.hideCls.delete(d.ihide) : ui.hideCls.add(d.ihide); renderInsp(); view.update(); return; }
  if (b.hasAttribute("data-itap")) { ui.tapHide = !ui.tapHide; renderInsp(); return; }
  if (b.hasAttribute("data-ireset")) { ui.explode = 0; ui.cut = null; ui.cutT = 0.5; ui.hideCls = new Set(); ui.hidePart = new Set(); ui.tapHide = false; view.ren.localClippingEnabled = false; renderInsp(); renderChips(); view.update(); }
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
    <label class="sl"><span>شطف / كسر الحواف <b class="num">${sc.bevel} مم</b></span><input type="range" min="0" max="10" step="0.5" data-sk="bevel" value="${sc.bevel}"></label>
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
  if (k === "bevel") {
    const lab = e.target.closest("label")?.querySelector("b");
    if (lab) lab.textContent = `${+e.target.value} مم`;
    clearTimeout(ui.bevT);
    ui.bevT = setTimeout(() => { save(); view.update(); }, 220);
    return;
  }
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
    el.dataset.sig = "";
    el.innerHTML = `<div class="pth"><b>📸 ريندر نهائي</b><button class="x" data-ptx aria-label="قفل">×</button></div>
      <p class="hint">بيتتبّع مسار الضوء الحقيقي: ضل ناعم، انعكاسات، زجاج، وإضاءة الليد والسبوتات. كل ما يستنى أكتر الصورة تبقى أنضف. ظبّط الكادر الأول — وانت بترندر الكاميرا بتتقفل، فلمس الشاشة مش هيبوّظ الصورة.</p>
      <div class="ptrow"><span>الجودة</span><div class="seg">${opt("quality", Render.PT_QUALITY)}</div></div>
      <div class="ptrow"><span>المقاس</span><div class="seg">${opt("size", Render.PT_SIZES)}</div></div>
      <div class="ptrow"><button class="chip tog ${p.denoise ? "on" : ""}" data-ptden>تنعيم النويز</button></div>
      <button class="primary" data-ptgo>ابدأ الريندر</button>`;
    return;
  }
  const pc = p.target ? Math.min(100, Math.round((100 * (p.samples || 0)) / p.target)) : 0;
  const stat = `${p.samples || 0} / ${p.target || "…"} · ${fmtSecs(p.secs || 0)}${p.size ? ` · ${p.size[0]}×${p.size[1]}` : ""}`;
  // while it runs only the counter and the bar change — rebuilding the buttons would swallow taps
  const sig = p.phase + "|" + (p.samples ? 1 : 0) + "|" + (view.final?.locked === false ? 0 : 1);
  if (el.dataset.sig === sig && el.querySelector(".ptprog")) {
    el.querySelector(".pth .num").textContent = stat;
    el.querySelector(".ptprog i").style.width = pc + "%";
    return;
  }
  el.dataset.sig = sig;
  const msg = p.phase === "load" ? "بيحمّل محرك الريندر…" : p.phase === "build" ? "بيجهّز المشهد…" : p.phase === "done" ? "خلص ✓" : p.phase === "paused" ? "متوقف مؤقتاً" : "بيرندر…";
  el.innerHTML = `<div class="pth"><b>${msg}</b><span class="num" dir="ltr">${stat}</span></div>
    <div class="ptprog"><i style="width:${pc}%"></i></div>
    <div class="ptrow"><button class="primary" data-ptsave ${p.samples ? "" : "disabled"}>احفظ الصورة</button>
      ${p.phase === "done" ? "" : `<button class="ghost2" data-ptpause>${p.phase === "paused" ? "كمّل" : "وقّف مؤقتاً"}</button>`}
      <button class="ghost2" data-ptcam>${view.final?.locked === false ? "🔒 ثبّت الكادر" : "🔓 حرّك الكادر"}</button>
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
  if (b.hasAttribute("data-ptcam")) { view.final.setLocked(view.final.locked === false); renderPt(); if (view.final.locked === false) alertBar("حرّك الكاميرا براحتك — الريندر هيبدأ من الأول مع كل حركة. دوس \"ثبّت الكادر\" لما تخلص."); return; }
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
function renderMoveBar() {
  $("#movebar").hidden = !(ui.moveMode && wholeView() && !ui.planOn && state.tab === "design");
  const vm = document.querySelector("#view3d .vmode");
  if (vm) {
    vm.hidden = !wholeView() || ui.mode !== "owner";
    for (const b of vm.querySelectorAll("button")) b.classList.toggle("on", (b.dataset.vmode === "units") === !!ui.moveMode);
  }
}
/** back to the normal touch: every drag turns the whole scene, nothing moves */
function sceneMode() {
  ui.moveMode = false;
  if (view.ready && !(view.final?.active && view.final.locked !== false)) view.ctl.enabled = true;
  renderMoveBar(); renderChips();
}
addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.moveMode && !e.target.closest?.("input,textarea,select")) sceneMode(); });
$("#movebar").addEventListener("click", (e) => { if (e.target.closest("[data-moveoff]")) sceneMode(); });
$("#fsBtn").addEventListener("click", () => {
  const on = !document.body.classList.contains("fs");
  document.body.classList.toggle("fs", on);
  $("#fsBtn").textContent = on ? "✕ رجّع القوايم" : "⛶";
  $("#fsBtn").classList.toggle("on", on);
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
$("#saveBtn").addEventListener("click", () => saveNow());
$("#homeBtn").addEventListener("click", () => showHome());
$("#home").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (b.hasAttribute("data-hnew")) { await newProject($("#homeName").value); return; }
  if (b.hasAttribute("data-hlast")) { closeHome(); render(true); return; }
  if (b.hasAttribute("data-hlang")) { I18n.setLang(I18n.lang === "en" ? "ar" : "en"); return; }
  if (b.hasAttribute("data-hstudio")) { closeHome(); render(true); openStudio(null); return; }
  if (b.hasAttribute("data-hcut")) {
    await newProject(($("#homeName").value || "").trim() || "كت ليست");
    const u = { id: uid(), kind: "pieces", name: "قطع حرة", params: { pieces: [{ ...PIECE_DEF(), name: "قطعة 1" }] } };
    state.project.units.push(u); state.sel = u.id; state.libOpen = false; save(); render(true);
    return;
  }
  if (b.hasAttribute("data-hsurvey")) { svFrom = "home"; SurveyUI.open("list"); return; }
  if (d.hsv) { svFrom = "home"; await openProject(d.hsv, true); SurveyUI.open("steps"); return; }
  if (b.hasAttribute("data-hdefs")) { ui.pop = "defaults"; renderPop(); return; }
  if (d.hf) { ui.homeF = d.hf; showHome(); return; }
  if (b.hasAttribute("data-hlook")) { ui.pop = "look"; renderPop(); return; }
  if (b.hasAttribute("data-habout")) { ui.pop = "about"; renderPop(); return; }
  if (d.hopen) { await openProject(d.hopen); return; }
  if (d.hdel) {
    if (d.armed !== "1") { d.armed = "1"; b.classList.add("armed"); b.textContent = "أكّد المسح"; return; }
    if (d.hdel === state.project.id) { alertBar("ده المشروع المفتوح — افتح مشروع تاني الأول عشان تمسحه."); return; }
    await Lib.del(d.hdel);
    if (cloud.db && cloud.me) { try { await cloud.db.doc(`data/users/${cloud.me}/p_${d.hdel}`).delete(); } catch { /* offline */ } }
    showHome();
  }
});
$("#home").addEventListener("input", (e) => { if (e.target.id !== "homeQ") return; ui.homeQ = e.target.value; clearTimeout(ui.hqT); ui.hqT = setTimeout(async () => { const at = e.target.selectionStart; await showHome(); const q = $("#homeQ"); if (q) { q.focus(); try { q.setSelectionRange(at, at); } catch { /* */ } } }, 350); });
$("#home").addEventListener("keydown", (e) => { if (e.target.id === "homeName" && e.key === "Enter") newProject(e.target.value); });
$("#home").addEventListener("change", async (e) => {
  if (e.target.id !== "homeImp" || !e.target.files?.[0]) return;
  try {
    const d = JSON.parse(await e.target.files[0].text());
    const p = d.project || d;
    if (!Array.isArray(p.units)) throw new Error("bad");
    for (const [mid, m] of Object.entries(d.media || {})) await Media.put(m.d, { id: mid, type: m.t, dur: m.dur, pid: p.id });
    await Lib.put(state.project).catch(() => {});
    state.project = { ...p, id: uid(), name: (p.name || "مشروع") + " (مستورد)" };
    for (const m of state.project.mats || []) Mat.register(m);
    state.sel = state.project.units[0]?.id ?? null; state.tab = "design";
    closeHome(); save(); render(true);
    alertBar("اتفتح المشروع المستورد.");
  } catch { alertBar("الملف ده مش نسخة مشروع من NOVERA Studio."); }
});
$("#undoBtn").addEventListener("click", () => histGo(-1));
$("#redoBtn").addEventListener("click", () => histGo(1));
addEventListener("keydown", (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z" || e.target.closest?.("input,textarea,select")) return;
  e.preventDefault(); histGo(e.shiftKey ? 1 : -1);
});
$("#projBtn").addEventListener("click", async () => { ui.pop = "projects"; renderPop(); ui.projects = (await allProjects()).map((x) => ({ id: x.id, name: x.name, updatedAt: x.updatedAt })); if (ui.pop === "projects") renderPop(); });
$("#expBtn").addEventListener("click", () => { ui.pop = "export"; renderPop(); });
$("#menuBtn").addEventListener("click", () => { ui.pop = "menu"; renderPop(); });
$("#drawBtn").addEventListener("click", () => { const su = selUnit(); openStudio(su?.params?.model ? su : null); });

// ------------------------------------------------------------------ library
function swatches(colors) {
  return colors.filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 3).map((hex) => `<i style="background:${hex}"></i>`).join("");
}
function kitchenGroup(s) {
  const p = s.params || {};
  if (["fridge", "oven", "microwave", "washing_machine"].includes(p.unit_category) || /hob90|sink/.test(s.key || "")) return "🔌 أجهزة وتجاويف (تلاجة · فرن · ميكروويف · غسالة)";
  if (s.group) return s.group;
  if (p.element_mode === "accessory") return "مطابخ — إكسسوارات";
  if (p.unit_category === "bedroom_wardrobe") return "دواليب غرف النوم";
  if (p.unit_category === "corner" || p.unit_category === "corner_glass_display") return "مطابخ — زوايا";
  if (p.unit_type === "wall") return "مطابخ — علوي";
  if (p.unit_type === "tall") return "مطابخ — طويل";
  return "مطابخ — سفلي";
}
/** hide the library cards that don't match the search, and the headings left empty */
function filterLib() {
  const q = (ui.libQ || "").trim().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  const norm = (t) => t.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  const lib = $("#lib");
  for (const c of lib.querySelectorAll(".card, .tpl")) c.hidden = !!q && !q.split(/\s+/).every((w) => norm(c.textContent).includes(w));
  for (const h3 of lib.querySelectorAll("h3")) {
    const box = h3.nextElementSibling;
    const any = box && [...box.children].some((c) => !c.hidden);
    h3.hidden = box.hidden = !any;
  }
  let none = lib.querySelector(".libnone");
  if (q && ![...lib.querySelectorAll(".card, .tpl")].some((c) => !c.hidden)) {
    if (!none) { none = document.createElement("p"); none.className = "hint libnone"; lib.querySelector(".libq").after(none); }
    none.textContent = "مفيش حاجة بالاسم ده — جرّب كلمة تانية، أو ابدأ من قالب فاضي.";
  } else none?.remove();
}
// ------------------------------------------------------------------ my library: units saved with all their settings
const MY_KEYS = ["kind", "name", "params", "libs", "fabric", "org", "inserts", "insertOpts", "bedding", "fin", "appliance", "lift"];
/** a saved copy of a unit (no id, position or code) + the custom materials it uses, so it opens the same in any project */
function myUnitFrom(u, label, group) {
  const it = { id: uid(), label: label || u.name, group: group || "", at: Date.now() };
  for (const k of MY_KEYS) if (u[k] !== undefined) it[k] = clone(u[k]);
  it.name = it.label;
  const js = JSON.stringify(it);
  it.mats = [...state.myMats, ...(state.project.mats || [])].filter((m, i, a) => js.includes(`"${m.id}"`) && a.findIndex((x) => x.id === m.id) === i).map(clone);
  try { const r = R(u); it.dims = r.ok ? dimsText(u, r) : ""; it.pieces = r.pieces || 0; } catch { it.dims = ""; }
  return it;
}
// my library follows the user to every device through the cloud store (when the app has one):
// one doc with the list + the ids deleted anywhere, merged both ways
let myLibT = 0;
function myLibMerge(remote) {
  const del = new Set([...(state.myDel || []), ...(remote?.del || [])]);
  const byId = new Map();
  for (const it of [...(remote?.units || []), ...(state.myUnits || [])]) {
    if (!it?.id || del.has(it.id)) continue;
    const o = byId.get(it.id);
    if (!o || (it.at || 0) >= (o.at || 0)) byId.set(it.id, it);
  }
  state.myUnits = [...byId.values()];
  state.myDel = [...del].slice(-500);
  for (const it of state.myUnits) for (const m of it.mats || []) Mat.register(m);
}
function myLibPush() {
  if (!cloud.db || !cloud.me) return;
  clearTimeout(myLibT);
  myLibT = setTimeout(async () => {
    try { await cloud.db.doc(`data/users/${cloud.me}/mylib`).set({ units: state.myUnits, del: state.myDel || [], savedAt: new Date().toISOString() }); }
    catch (e) { if (e?.code === "quota_exceeded") alertBar("مكتبتك كبرت على مساحة الحفظ أونلاين — اتحفظت على الجهاز ده بس. صدّرها ملف عشان متضيعش."); }
  }, 600);
}
async function myLibPull() {
  if (!cloud.db || !cloud.me) return;
  try {
    const s = await cloud.db.doc(`data/users/${cloud.me}/mylib`).get();
    const before = JSON.stringify(state.myUnits || []);
    myLibMerge(s.exists ? s.data() : null);
    if (JSON.stringify(state.myUnits) !== before) { save(); renderLib(); }
    myLibPush();
  } catch { /* offline: the local copy stays */ }
}
function myLibHtml() {
  const list = state.myUnits || [];
  let h = `<h3>⭐ مكتبتي <small class="hint" style="font-weight:400">(${list.length})</small></h3><div class="cards mycards">`;
  if (!list.length) h += `<p class="hint" style="grid-column:1/-1;margin:0">احفظ أي وحدة ظبطتها بزرار ⭐ فوق إعداداتها، وتلاقيها هنا في أي مشروع بنفس كل الإعدادات والخامات.</p>`;
  const groups = {};
  for (const it of list) (groups[it.group || ""] ??= []).push(it);
  for (const [g, items] of Object.entries(groups)) {
    if (g) h += `<div class="mygroup" style="grid-column:1/-1">${esc(g)}</div>`;
    for (const it of items.sort((a, b) => b.at - a.at)) {
      const icon = it.kind === "kitchen" ? "🍳" : it.kind === "dressing" ? "👔" : it.kind === "pieces" ? "✂" : "🪑";
      h += `<div class="card mycard" data-myunit="${it.id}" role="button" tabindex="0"><span class="sw" style="font-size:22px">${icon}</span><b>${esc(it.label)}</b><small>${esc(it.dims ? it.dims + " سم" : "")}${it.pieces ? ` · ${it.pieces} قطعة` : ""}</small>
        <span class="myact"><button class="sm" data-myren="${it.id}" aria-label="غيّر الاسم">✎</button><button class="sm danger" data-mydel="${it.id}" aria-label="امسحها من مكتبتي">${ICON.trash}</button></span></div>`;
    }
  }
  h += `</div><div class="mytools"><button class="sm" data-myexport ${list.length ? "" : "disabled"}>⬇ صدّر مكتبتي</button><label class="sm btnlike">⬆ استورد<input type="file" id="myImp" accept=".json,application/json" hidden></label></div>`;
  return h;
}
function myLibClick(e) {
  const t = e.target;
  const del = t.closest("[data-mydel]");
  if (del) {
    if (del.dataset.armed !== "1") { del.dataset.armed = "1"; del.classList.add("armed"); del.textContent = "أكّد"; return true; }
    state.myDel = [...new Set([...(state.myDel || []), del.dataset.mydel])];
    state.myUnits = state.myUnits.filter((x) => x.id !== del.dataset.mydel); save(); myLibPush(); renderLib(); return true;
  }
  const ren = t.closest("[data-myren]");
  if (ren) { ui.pop = "mysave"; ui.mysaveId = null; ui.myrenId = ren.dataset.myren; renderPop(); return true; }
  if (t.closest("[data-myexport]")) {
    const data = JSON.stringify({ novera: "my-units", v: 1, units: state.myUnits }, null, 1);
    Exp.deliver(cloud.downloads, "مكتبتي — NOVERA Studio.json", new TextEncoder().encode(data)).catch(() => alertBar("ما قدرتش أصدّر الملف."));
    return true;
  }
  if (t.closest("label.btnlike") || t.id === "myImp") return true;
  const card = t.closest("[data-myunit]");
  if (!card) return false;
  const it = state.myUnits.find((x) => x.id === card.dataset.myunit);
  if (!it) return true;
  for (const m of it.mats || []) { Mat.register(m); if (!(state.project.mats || []).some((x) => x.id === m.id)) state.project.mats = [...(state.project.mats || []), m]; }
  const u = { id: uid() };
  for (const k of MY_KEYS) if (it[k] !== undefined) u[k] = clone(it[k]);
  u.name = it.label;
  state.project.units.push(u);
  state.sel = u.id; state.libOpen = false;
  save(); render(true);
  return true;
}
$("#lib").addEventListener("change", async (e) => {
  if (e.target.id !== "myImp" || !e.target.files?.[0]) return;
  try {
    const d = JSON.parse(await e.target.files[0].text());
    const list = Array.isArray(d) ? d : d.units;
    if (!Array.isArray(list) || !list.every((x) => x && x.kind && x.params)) throw new Error("bad");
    let n = 0;
    for (const it of list) { if (state.myUnits.some((x) => x.id === it.id)) continue; state.myUnits.push(it); n++; }
    save(); myLibPush(); renderLib();
    alertBar(n ? `اتضاف ${n} وحدة لمكتبتك.` : "كل الوحدات دي موجودة عندك بالفعل.");
  } catch { alertBar("الملف ده مش مكتبة وحدات من NOVERA Studio."); }
});
function renderLib() {
  let h = `<div class="libhead"><h2>المكتبة</h2><button class="x" data-close aria-label="قفل المكتبة">×</button></div>
    <p class="hint">دوس على أي تصميم يتضاف للمشروع وتعدّله براحتك.</p>
    <input id="libq" class="libq" type="search" placeholder="🔍 دوّر: تسريحة، تموين، حوض، دولاب…" aria-label="دوّر في المكتبة" value="${esc(ui.libQ || "")}">
    <button class="card cutcard" data-studio-new="1"><span class="sw" style="font-size:26px">✏️</span><b>ورشة الرسم — صمّم حاجتك من الصفر</b><small>رسم 3D حر: خطوط ومستطيلات ودواير وأقواس، اسحبها ألواح، فرّغ وقص واحفر، ولف وانسخ — وكل لوح يطلع في القص والـCNC بشكله.</small></button>
    <button class="card cutcard" data-pieces="1"><span class="sw" style="font-size:26px">✂</span><b>قطع حرة — كت ليست بمقاساتك</b><small>اكتب مقاسات القطع (أو الزقها من Excel) ويطلعلك خطة القص والملصقات بالباركود من غير تصميم.</small></button>
`;
  h += myLibHtml();
  const kg = {};
  for (const [key, s] of Object.entries(KU.KITCHEN)) (kg[kitchenGroup({ ...s, key })] ??= []).push([key, s]);
  for (const g of ["🔌 أجهزة وتجاويف (تلاجة · فرن · ميكروويف · غسالة)", "مطابخ — سفلي", "مطابخ — علوي", "مطابخ — طويل", "مطابخ — زوايا", "سحّاب (جرّار)", "مطابخ — ترولي ومنظمات", "مطابخ — إكسسوارات", "دواليب غرف النوم", ...Object.keys(kg)].filter((g, i, a) => kg[g] && a.indexOf(g) === i)) {
    h += `<h3>${esc(g)}</h3><div class="cards">`;
    for (const [key, s] of kg[g]) {
      const base = !s.params.unit_type || s.params.unit_type === "base";
      h += `<button class="card" data-kitchen="${key}"><span class="sw">${swatches([KU.K_DEFAULT_COLORS.front, KU.K_DEFAULT_COLORS.carcass, base ? KU.K_DEFAULT_COLORS.countertop : null])}</span><b>${esc(s.label)}</b><small>${esc(s.desc)}</small></button>`;
    }
    h += `</div>`;
  }
  h += `<h3>الدريسنج</h3><div class="cards">`;
  for (const [key, s] of Object.entries(DRESSING)) {
    const r = R({ kind: "dressing", name: s.label, params: s.params, libs: s.libs });
    h += `<button class="card" data-dress="${key}"><span class="sw">${swatches([r.colors?.door, r.colors?.carcass, r.colors?.glass])}</span><b>${esc(s.label)}</b><small>${esc(s.desc)}</small></button>`;
  }
  h += `</div>`;
  const groups = {};
  for (const [key, pr] of Object.entries({ ...PRESETS, ...Decor.EXTRA_PRESETS })) (groups[pr.group] ??= []).push([key, pr]);
  for (const [g, items] of Object.entries(groups)) {
    h += `<h3>${esc(g)}</h3><div class="cards">`;
    for (const [key, pr] of items) {
      const c = panelCompute(Decor.EXTRA_PRESETS[key] ? clone(pr.params) : { preset: key }).material_colors || {};
      h += `<button class="card" data-preset="${key}"><span class="sw">${swatches([c.front, c.carcass, c.accent, c.table_top, c.table_base])}</span><b>${esc(pr.label)}</b><small>${esc(pr.desc)}</small></button>`;
    }
    h += "</div>";
  }
  h += `<h3>قوالب فاضية</h3><div class="tpls"><button class="tpl" data-kitchen="__blank">وحدة مطبخ<small>المطابخ</small></button><button class="tpl" data-dress="__blank">دريسنج فاضي<small>الدريسنج</small></button><button class="tpl" data-pieces="1">✂ قطع حرة<small>كت ليست وباركود بمقاساتك</small></button>`;
  for (const [key, t] of Object.entries(Schema.TEMPLATES)) {
    if (key === "free") continue;
    h += `<button class="tpl" data-template="${key}">${esc(t.label)}<small>${esc(t.group)}</small></button>`;
  }
  $("#lib").innerHTML = h + "</div>";
  filterLib();
}
$("#lib").addEventListener("input", (e) => { if (e.target.id !== "libq") return; ui.libQ = e.target.value; filterLib(); });
$("#lib").addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) { state.libOpen = false; render(); return; }
  if (myLibClick(e)) return;
  if (e.target.closest("[data-studio-new]")) { state.libOpen = false; render(); openStudio(null); return; }
  const c = e.target.closest("[data-preset],[data-template],[data-dress],[data-kitchen],[data-pieces]");
  if (!c) return;
  let u;
  if (c.dataset.kitchen) {
    const s = KU.KITCHEN[c.dataset.kitchen];
    u = { id: uid(), kind: "kitchen", name: s ? s.label : "وحدة مطبخ", params: withDefaults(clone(s ? s.params : {})), libs: {}, ...(s?.org ? { org: s.org } : {}), ...(s?.orgOpts ? { orgOpts: clone(s.orgOpts) } : {}) };
    if (s?.ins) {
      const d0 = unitDrawers(u, R(u));
      u.inserts = {};
      for (const [i, k] of Object.entries(s.ins)) {
        const d = d0.find((x) => x.i === +i);
        if (!d) continue;
        const { v, h } = insertLayout(k, d.W, d.D);
        u.inserts[i] = k;
        Object.assign(u.params, { [`drawer_insert_${i}`]: "custom", [`drawer_insert_v_${i}`]: v.join(","), [`drawer_insert_h_${i}`]: h.join(",") });
      }
      u.params.drawer_insert_height = Math.max(4, ...Object.values(u.inserts).map((k) => INSERTS[k]?.ht || 5));
    }
  } else if (c.dataset.dress) {
    const s = DRESSING[c.dataset.dress];
    u = s ? { id: uid(), kind: "dressing", name: s.label, params: clone(s.params), libs: clone(s.libs || {}) } : { id: uid(), kind: "dressing", name: "دريسنج", params: {} };
  } else if (c.dataset.pieces) u = { id: uid(), kind: "pieces", name: "قطع حرة", params: { pieces: [{ ...PIECE_DEF(), name: "قطعة 1" }] } };
  else if (Decor.EXTRA_PRESETS[c.dataset.preset]) { const x = Decor.EXTRA_PRESETS[c.dataset.preset]; u = { id: uid(), kind: "panel", name: x.label, params: clone(x.params), fabric: clone(x.fabric || {}) }; }
  else if (c.dataset.preset) u = { id: uid(), kind: "panel", name: PRESETS[c.dataset.preset].label, params: { preset: c.dataset.preset } };
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
    return `<button class="uchip ${u.id === state.sel ? "on" : ""} ${ui.multi?.has(u.id) ? "multi" : ""} ${r.ok ? "" : "bad"}" data-unit="${u.id}">
      <b><span class="ucode">${esc(unitCode(u))}</span>${esc(u.name)}</b><small>${r.ok ? `${r.pieces} قطعة` : "فيها أخطاء"}</small></button>`;
  }).join("") || `<span class="empty">المشروع فاضي — افتح المكتبة وضيف أول وحدة.</span>`;
}
$("#unitStrip").addEventListener("click", (e) => {
  const b = e.target.closest("[data-unit]");
  if (!b) return;
  if (ui.multi) { const id = b.dataset.unit; ui.multi.has(id) ? ui.multi.delete(id) : ui.multi.add(id); if (!state.sel) state.sel = id; renderMulti(); renderStrip(); view.update(); return; }
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
  h += `<button class="chip" data-roompop>أوضة جاهزة بالمقاسات</button><button class="chip" data-draw>ارسم حيطان</button><button class="chip" data-wallstudio>🧱 ارسمها 3D في ورشة الرسم</button>`;
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
  if (ui.planOn) { el.innerHTML = `<div class="cbody">${planChips()}</div>`; return; }
  if (!u) { el.innerHTML = `<div class="cbody"><button class="chip tog" data-plan>المسقط والحيطان</button><button class="chip tog" data-roompop>📐 أوضة بالمقاسات · 📷 مسح</button><button class="chip tog gold" data-autok>✨ صمملي المطبخ</button>${state.project.variants?.length > 1 ? `<button class="chip tog" data-varpop>🗂 النسخ</button>` : ""}</div>`; return; }
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
    if (p.unit_type !== "wall") h += togChip("include_toe_kick", "سكلو", p.include_toe_kick) + (p.include_toe_kick ? (p.toe_kick_drawer ? `<span class="chip step"><button data-step="toe_kick_height" data-d="-1" aria-label="درج الوزرة أوطى">${ICON.minus}</button><button class="chipin" data-toggle="toe_kick_drawer" title="اقفل درج الوزرة">درج وزرة <b>${n1(kickFrontOf(p))}</b></button><button data-step="toe_kick_height" data-d="1" aria-label="درج الوزرة أعلى">${ICON.plus}</button></span>` : togChip("toe_kick_drawer", "درج وزرة", false)) : "");
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
  } else if (u.kind === "pieces") {
    h += `<span class="chip"><b>${r.pieces || 0}</b> قطعة · <b>${r.banding || 0}</b> م شريط</span><button class="chip tog" data-gotocut>✂ خطة القص والملصقات</button>`;
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
  // the chips are grouped in tabs so the stage stays calm: the unit · the view · arranging · the room
  const whole = wholeView();
  const tabs = [["unit", "الوحدة"], ["view", "العرض والريندر"], ...(whole ? [["arr", "الترتيب"]] : []), ["room", "الأوضة"]];
  if (!tabs.some(([k]) => k === ui.chipTab)) ui.chipTab = "unit";
  let v = "";
  v += `<button class="chip tog ${state.xray ? "on" : ""}" data-xray>${ICON.eye}شفاف</button>`;
  if (r.ok && (r.movers?.length || state.whole)) v += `<button class="chip tog ${ui.open ? "on" : ""}" data-open>${ui.open ? "اقفل الضلف" : "افتح الضلف"}</button>`;
  if (state.project.units.length > 1 || state.project.room) v += `<button class="chip tog ${state.whole ? "on" : ""}" data-whole>${ICON.lib}المشروع كله</button>`;
  v += `<button class="chip tog ${ui.inspOpen || ui.explode || ui.cut || ui.hideCls?.size || ui.hidePart?.size ? "on" : ""}" data-insp>🔍 فك وشوف من جوه</button>`;
  v += `<button class="chip tog ${state.render ? "on" : ""}" data-render>✦ ريندر واقعي</button>`;
  if (state.render) v += `<button class="chip tog ${ui.sceneOpen ? "on" : ""}" data-scene>☀ المشهد والإضاءة</button><button class="chip tog ${ui.pt ? "on" : ""}" data-final>📸 ريندر نهائي</button>`;
  v += `<button class="chip tog" data-shot>احفظ صورة</button>`;
  v += `<button class="chip tog" data-ar>📱 شوفها في الأوضة (AR)</button><button class="chip tog" data-video>🎬 فيديو</button>`;
  let a = "";
  if (whole) {
    const L = projectPoses(state.project).get(u.id);
    a += `<button class="chip tog ${ui.moveMode ? "on" : ""}" data-move>✋ ${ui.moveMode ? "بتحرّك — دوس للخروج" : "حرّك"}</button>`;
    a += `<button class="chip tog ${ui.multi ? "on" : ""}" data-multi>☑ ${ui.multi ? `مختار ${ui.multi.size}` : "اختار أكتر من وحدة"}</button>`;
    a += `<button class="chip tog" data-alignpop>⇹ محاذاة مع وحدة</button>`;
    if (L?.wall) {
      const segs = roomSegs(state.project);
      const seg = segs.find((g) => g.id === L.wall);
      a += `<span class="chip step zone"><span class="zl">على الحيطة ${seg && !seg.virtual ? segs.indexOf(seg) + 1 : ""} · من أولها</span><button data-mv="-5" aria-label="5 سم لورا">${ICON.minus}</button><b>${n1(L.s)}</b><button data-mv="5" aria-label="5 سم لقدام">${ICON.plus}</button></span>`;
    }
    a += `<span class="chip step zone"><span class="zl">↕ من الأرض</span><button data-lift="-5" aria-label="نزّل 5 سم">${ICON.minus}</button><b>${n1(+u.lift || 0)}</b><button data-lift="5" aria-label="ارفع 5 سم">${ICON.plus}</button></span>`;
    a += `<span class="chip step zone"><span class="zl">لف</span><button data-rot="-90" aria-label="لف 90 شمال">↺90</button><button data-rot="-15" aria-label="لف 15 شمال">↺15</button><button data-rot="15" aria-label="لف 15 يمين">↻15</button><button data-rot="90" aria-label="لف 90 يمين">↻90</button></span>`;
    if (state.project.units.some((x) => x.pos)) a += `<button class="chip tog" data-autolay>رصّ تلقائي</button>`;
  }
  let rm = `<button class="chip tog" data-plan>المسقط والحيطان</button><button class="chip tog" data-roompop>📐 أوضة بالمقاسات · 📷 مسح بالكاميرا</button><button class="chip tog gold" data-autok>✨ صمملي المطبخ</button>`;
  rm += `<button class="chip tog" data-varpop>🗂 النسخ${state.project.variants?.length > 1 ? ` (${state.project.variants.length})` : ""}</button>`;
  if (whole || state.project.room) { const n = designChecks().filter((c) => c.level !== "n").length; rm += `<button class="chip tog ${n ? "warnchip" : ""}" data-checks>فحص التصميم${n ? ` (${n})` : " ✓"}</button>`; }
  if (state.project.room) rm += `<p class="chiphint">في العرض 3D: دوس على حيطة أو بريزة أو عمود عشان تعدّله. البريزة تتسحب على الحيطة من "الترتيب ← حرّك".</p>`;
  const body = { unit: h, view: v, arr: a, room: rm }[ui.chipTab];
  h = `<div class="ctabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${ui.chipTab === k}" data-ctab="${k}">${l}</button>`).join("")}</div><div class="cbody">${body}</div>`;
  el.innerHTML = h;
}
const ZTYPES = ["doors", "drawers", "flap", "open"];
const nextKey = (table, v) => { const ks = Object.keys(table); return ks[(ks.indexOf(v) + 1) % ks.length]; };
$("#chips").addEventListener("click", async (e) => {
  const u = selUnit();
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.ctab) { ui.chipTab = d.ctab; renderChips(); return; }
  if (b.hasAttribute("data-gotocut")) { state.tab = "cut"; save(); render(true); return; }
  if (b.hasAttribute("data-multi")) { ui.multi = ui.multi ? null : new Set([state.sel].filter(Boolean)); renderMulti(); renderChips(); renderStrip(); view.update(); return; }
  if (b.hasAttribute("data-alignpop")) { ui.pop = "align"; renderPop(); return; }
  if (b.hasAttribute("data-plan")) { ui.planOn = !ui.planOn; ui.planView = "plan"; ui.planTool = "select"; plan.vb = null; if (!ui.planOn) { state.whole = state.whole || !!state.project.room; } render(true); return; }
  if (b.hasAttribute("data-roompop")) { ui.pop = "room"; renderPop(); return; }
  if (b.hasAttribute("data-autok")) { ui.pop = "auto"; renderPop(); return; }
  if (b.hasAttribute("data-varpop")) { ui.pop = "variants"; renderPop(); return; }
  if (b.hasAttribute("data-ar") || b.hasAttribute("data-video")) {
    const ar = b.hasAttribute("data-ar"), old = b.textContent;
    b.disabled = true; b.textContent = ar ? "بيجهّز الـAR…" : "بيسجّل الفيديو… (9 ثواني)";
    try { const r = await (ar ? exportAR() : exportVideo()); if (r !== "declined" && !ar) alertBar("الفيديو جاهز ✓"); } catch (err) { alertBar(err?.message?.length < 70 ? err.message : "ما كملش — جرّب تاني."); console.error(err); }
    b.disabled = false; b.textContent = old;
    return;
  }
  if (b.hasAttribute("data-checks")) { ui.pop = "checks"; renderPop(); return; }
  if (b.hasAttribute("data-wallstudio")) { openStudio(null, { tool: "wall" }); return; }
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
  if (b.hasAttribute("data-insp")) { ui.inspOpen = !ui.inspOpen; ui.sceneOpen = false; renderScene(); renderInsp(); renderChips(); return; }
  if (b.hasAttribute("data-scene")) { ui.inspOpen = false; renderInsp(); ui.sceneOpen = !ui.sceneOpen; renderChips(); renderScene(); return; }
  if (b.hasAttribute("data-final")) { if (ui.pt) closeFinal(); else { ui.pt = { quality: "high", size: "hd", denoise: true, phase: "setup" }; renderPt(); } renderChips(); return; }
  if (b.hasAttribute("data-shot")) { b.disabled = true; exportImage().catch(() => alertBar("ما قدرتش أحفظ الصورة.")).finally(() => { b.disabled = false; }); return; }
  if (b.hasAttribute("data-move")) { ui.moveMode = !ui.moveMode; renderMoveBar(); renderChips(); return; }
  if (d.lift) { u.lift = Math.max(0, Math.round(((+u.lift || 0) + +d.lift) * 10) / 10); save(); renderChips(); renderProps(); view.update(); if (ui.planOn) plan.render(); return; }
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
const numF = (path, label, v, step = 0.5) => `<label class="f"><span>${esc(label)}</span><input type="text" inputmode="decimal" autocomplete="off" data-inc="${step}" data-numf data-num="${path}" value="${v ?? ""}"></label>`;
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
    <details open><summary>الحيطة الجاية بالمقاس</summary><div class="grid2"><label class="f"><span>الطول (سم)</span><input id="drawLen" type="text" inputmode="decimal" data-numf value="${ui.drawLen || 300}"></label></div>
    ${pts.length >= 2 ? `<div class="grid2"><label class="f"><span>الزاوية مع الحيطة اللي قبلها (°)</span><input id="drawAng" type="text" inputmode="decimal" data-numf data-inc="5" value="${ui.drawAng ?? 90}"></label></div>
      <div class="angpre">${[90, 120, 135, 150, 60, 45].map((a) => `<button class="chip tog ${+(ui.drawAng ?? 90) === a ? "on" : ""}" data-drawangp="${a}">${a}°</button>`).join("")}</div>
      <div class="grid2"><button class="primary" data-drawturn="1">↱ لف يمين وضيف</button><button class="ghost2" data-drawturn="-1">↰ لف شمال وضيف</button></div>
      <p class="hint">90 = ركن عادي. أكبر من 90 = ركن مفتوح (زي 135 في الحيطان المايلة). اليمين = الأوضة جوه على إيدك اليمين.</p>` : `<p class="hint">أول حيطة: اختار اتجاهها.</p>`}
    <div class="dirgrid">${dirs.map(([t, a]) => `<button class="ghost2" data-drawdir="${a}" aria-label="اتجاه ${a} درجة">${t}</button>`).join("")}</div>
    <p class="hint">المقاس من الوش الداخلي للحيطة. لما ترجع لأول نقطة الأوضة بتتقفل لوحدها.</p></details>
    <details open><summary>الرسم بالقلم</summary><p class="hint">الخط بيمسك على زوايا كل:</p>
      <div class="seg">${[[90, "90°"], [45, "45°"], [15, "15°"], [0, "حر"]].map(([v, l]) => `<button data-drawsnap="${v}" class="${(ui.drawSnap ?? 45) === v ? "on" : ""}">${l}</button>`).join("")}</div>
      <p class="hint">وانت بترسم، الزاوية مع الحيطة اللي قبلها بتظهر على المسقط. وبعد الرسم تقدر تكتب أي زاوية بالظبط من الحيطة نفسها.</p></details>`;
}
/** editor for a finish spec (wall, band or floor); attr = data attribute prefix */
function finishEditor(spec, attr, fallback, finishes = Mat.FINISHES) {
  const f = spec.finish || "paint";
  const mats = Mat.all();
  let h = `<div class="grid2"><label class="f"><span>التشطيب</span><select data-${attr}="finish">${Object.entries(finishes).map(([k, t]) => `<option value="${k}" ${k === f ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
  if (f !== "photo") h += `<label class="f"><span>اللون</span><input type="color" data-${attr}="color" value="${spec.color || fallback}"></label>`;
  if (f === "tile") h += `<label class="f"><span>مقاس البلاطة (سم)</span><input type="text" inputmode="decimal" data-numf data-${attr}="size" value="${spec.size || 60}"></label>`;
  if (f === "wood") h += `<label class="f"><span>طول اللوح (سم)</span><input type="text" inputmode="decimal" data-numf data-${attr}="size" value="${spec.size || 120}"></label>`;
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
  const rf = (k, label, v, step = 1) => `<label class="f"><span>${esc(label)}</span><input type="text" inputmode="decimal" data-numf step="${step}" data-rw="${k}" value="${v ?? ""}"></label>`;
  if (sel.kind === "wall") {
    const k = segs.findIndex((g) => g.id === sel.id), sg = segs[k];
    if (!sg) return "";
    const ops = (room.openings || []).filter((o) => o.wall === sg.id);
    return `<div class="ph"><h2 class="uname">حيطة ${k + 1}</h2><div class="pa"><button data-rwdel class="danger" title="امسح الحيطة" aria-label="امسح الحيطة">${ICON.trash}</button></div></div>
      <p class="tplname">المقاسات من الوش الداخلي — الحيطة اللي بعدها بتتحرك معاها</p>
      <details open><summary>المقاسات</summary><div class="grid3">${rf("L", "الطول", r1(sg.L))}${rf("t", "السمك", sg.t)}${rf("h", "الارتفاع", sg.h)}</div>
      ${(() => { const a = Room.cornerAngle(room, sg.i); return a == null ? "" : `<div class="grid2">${rf("ang", "زاوية الركن عند أول الحيطة (°)", a, 5)}</div>
        <div class="angpre">${[90, 120, 135, 150, 60, 45].map((v) => `<button class="chip tog ${Math.abs(a - v) < 0.2 ? "on" : ""}" data-rwang="${v}">${v}°</button>`).join("")}</div>
        <p class="hint">الحيطة دي واللي بعدها بيلفّوا حوالين الركن${room.closed ? "، وآخر حيطة بتتمد أو تقصر عشان الأوضة تفضل مقفولة" : ""}.</p>`; })()}
      <div class="bools"><label class="f b"><input type="checkbox" data-rwflip ${sg.wall.flip ? "checked" : ""}><span>اقلب ناحية الأوضة</span></label></div>
      <div class="grid2"><button class="add" data-rwsplit>قسّم الحيطة نصين</button></div></details>
      <details open><summary>اللون والتشطيب</summary>${finishEditor(sg.wall, "rwf", "#f3f1ea")}<button class="add" data-rwall>طبّق التشطيب ده على كل الحيطان</button></details>
      <details ${sg.wall.band?.on ? "open" : ""}><summary>تكسية جزء من الحيطة</summary><div class="bools"><label class="f b"><input type="checkbox" data-rwb="on" ${sg.wall.band?.on ? "checked" : ""}><span>فيه تكسية (زي اللي بين الكونتر والعلوي)</span></label></div>
        ${sg.wall.band?.on ? `<div class="grid2"><label class="f"><span>من ارتفاع</span><input type="text" inputmode="decimal" data-numf data-rwb="z0" value="${sg.wall.band.z0 ?? 90}"></label><label class="f"><span>لحد ارتفاع</span><input type="text" inputmode="decimal" data-numf data-rwb="z1" value="${sg.wall.band.z1 ?? 145}"></label></div>${finishEditor(sg.wall.band, "rwb", "#e7e2d6")}` : ""}</details>
      <details open><summary>الأبواب والشبابيك (${ops.length})</summary>${ops.map((o) => `<button class="mrow" data-selopen="${o.id}"><span><b>${o.kind === "door" ? "باب" : "شباك"} ${n1(o.w)} × ${n1(o.h)}</b><small>على بعد ${n1(o.at)} سم من أول الحيطة</small></span>${ICON.cycle}</button>`).join("")}
      <div class="grid2"><button class="add" data-roomop="door">${ICON.plus}باب</button><button class="add" data-roomop="window">${ICON.plus}شباك</button></div></details>`;
  }
  const nf = (k, label, v) => `<label class="f"><span>${esc(label)}</span><input type="text" inputmode="decimal" data-numf step="1" data-rp="${k}" value="${v ?? ""}"></label>`;
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
  const of = (k, label, v) => `<label class="f"><span>${esc(label)}</span><input type="text" inputmode="decimal" data-numf step="1" data-ro="${k}" value="${v ?? ""}"></label>`;
  return `<div class="ph"><h2 class="uname">${o.kind === "door" ? "باب" : "شباك"}</h2><div class="pa"><button data-rodel class="danger" title="امسح" aria-label="امسح">${ICON.trash}</button></div></div>
    <details open><summary>المقاسات</summary><div class="grid2">${selF("__kind", "النوع", { door: "باب", window: "شباك" }, o.kind).replace('data-sel="__kind"', 'data-ro="kind"')}
    ${of("w", "العرض", o.w)}${of("h", "الارتفاع", o.h)}${o.kind === "window" ? of("sill", "ارتفاع الجلسة من الأرض", o.sill) : ""}${of("at", "البعد عن أول الحيطة", r1(o.at))}</div>
    <p class="hint">تقدر تسحبه على الحيطة في المسقط. الوحدات السفلية مش بتتحط قدام الأبواب، والعلوية مش بتتحط قدام الشبابيك.</p></details>`;
}
const r1 = Room.r1;
/** the settings panel is re-drawn after every change: keep the place — the same scroll, the sections the
 *  user opened or closed, the field being edited at the same height on screen, and the focus */
const FIELD_KEYS = ["data-num", "data-sel", "data-bool", "data-text", "data-auto", "data-toggle", "data-rw", "data-ro", "data-rp", "data-rc", "data-rwb", "data-mat", "data-xnum", "data-xtext", "data-xsel", "data-xcut", "data-zone", "data-step", "id"];
function fieldSel(x) {
  for (const k of FIELD_KEYS) { const v = x?.getAttribute?.(k); if (v) return k === "id" ? `#${CSS.escape(v)}` : `[${k}="${CSS.escape(v)}"]`; }
  return null;
}
const secKey = (sm) => sm.textContent.replace(/\(\d+\)|\d+/g, "").replace(/\s+/g, " ").trim();
let propsLater = 0;
function renderProps() {
  const el = $("#props");
  if (!el) return;
  // a change fired while leaving a field (Tab / next / tapping another field): let the focus land first,
  // then re-draw and keep it there
  if (window.event?.type === "change" && el.contains(window.event.target)) { clearTimeout(propsLater); propsLater = setTimeout(renderProps, 0); return; }
  clearTimeout(propsLater);
  const key = `${state.sel || ""}|${ui.planSel?.kind || ""}:${ui.planSel?.id || ""}|${ui.planTool || ""}|${ui.asm?.id || ""}`;
  const same = el.dataset.pkey === key;
  let st = 0, opens = null, anchor = null, aoff = 0, focus = null, caret = null;
  if (same) {
    st = el.scrollTop;
    opens = new Map([...el.querySelectorAll("details > summary")].map((sm) => [secKey(sm), sm.parentElement.open]));
    const a = document.activeElement && el.contains(document.activeElement) ? document.activeElement : null;
    const ref = a || (ui.lastField && el.querySelector(ui.lastField));
    anchor = ref ? fieldSel(ref.closest("[data-step]") || ref) || ui.lastField : null;
    if (ref && anchor) aoff = ref.getBoundingClientRect().top - el.getBoundingClientRect().top;
    if (a && a.matches("input, textarea, select")) { focus = fieldSel(a); try { caret = [a.selectionStart, a.selectionEnd]; } catch { caret = null; } }
    else if (ui.nextFocus && performance.now() - ui.nextFocus.t < 400) focus = ui.nextFocus.sel; // moving on (Tab / next) while the change re-draws
  }
  renderProps0(); propsMode(el);
  el.dataset.pkey = key;
  if (!same) { el.scrollTop = 0; return; }
  for (const sm of el.querySelectorAll("details > summary")) { const o = opens.get(secKey(sm)); if (o !== undefined && sm.parentElement.open !== o) sm.parentElement.open = o; }
  el.scrollTop = st;
  const b = anchor && el.querySelector(anchor);
  if (b) el.scrollTop += b.getBoundingClientRect().top - el.getBoundingClientRect().top - aoff;
  if (focus) { const f = el.querySelector(focus); if (f && document.activeElement !== f) { f.focus({ preventScroll: true }); if (caret && caret[0] != null) try { f.setSelectionRange(caret[0], caret[1]); } catch { /* not a text field */ } } }
}
// remember the last field touched in the panel (the change re-draws it after the field lost focus)
document.addEventListener("pointerdown", (e) => { const p = $("#props"); if (p && p.contains(e.target)) { const t = e.target.closest("input, select, textarea, button, label"); const q = t && (fieldSel(t) || fieldSel(t.querySelector?.("input, select"))); if (q) ui.lastField = q; } }, true);
document.addEventListener("focusin", (e) => { const p = $("#props"); if (p && p.contains(e.target)) { const q = fieldSel(e.target); if (q) ui.lastField = q; } });
document.addEventListener("focusout", (e) => {
  const p = $("#props"), n = e.relatedTarget;
  if (!p || !n || !n.matches?.("input, textarea, select")) { ui.nextFocus = null; return; }
  const sel = fieldSel(n);
  ui.nextFocus = { sel, t: performance.now() };
  // the change already re-drew the panel: the field we are going to is gone — focus its new copy
  if (!n.isConnected && sel) setTimeout(() => { const f = p.querySelector(sel); if (f && document.activeElement !== f) { f.focus({ preventScroll: true }); f.select?.(); } }, 0);
});
function renderProps0() {
  const u = selUnit();
  const el = $("#props");
  if (ui.planOn && ui.planTool === "draw") { el.innerHTML = drawProps(); return; }
  if ((ui.planOn || ui.room3d) && state.project.room && ["wall", "open", "pt", "col"].includes(ui.planSel?.kind)) { el.innerHTML = roomProps(); return; }
  if (ui.planOn && state.project.room && !ui.planSel) { el.innerHTML = roomOverview(); return; }
  if (!u) { el.innerHTML = `<div class="emptyp"><h2>ابدأ بوحدة</h2><p class="hint">افتح المكتبة واختار تصميم جاهز أو قالب فاضي.</p></div>`; return; }
  const r = R(u);
  const p = r.params;
  let h = `<div class="ph"><input id="unitName" class="uname" value="${esc(trv(u.name))}" aria-label="اسم الوحدة">
    <div class="pa"><button data-mysave title="احفظها في مكتبتي" aria-label="احفظها في مكتبتي">⭐</button><button data-dup title="نسخة" aria-label="نسخة">${ICON.copy}</button><button data-del class="danger" title="حذف" aria-label="حذف">${ICON.trash}</button></div></div>
    <div class="tplname"><span class="ucode">${esc(unitCode(u))}</span>${esc(r.label || (u.kind === "dressing" ? "دريسنج" : u.kind === "kitchen" ? "وحدة مطبخ" : ""))}</div>`;
  if (r.ok) h += `<div class="stats"><div><b>${r.pieces}</b><span>قطعة</span></div><div><b>${r.banding}</b><span>م شريط</span></div><div><b>${r.doors}</b><span>ضلفة</span></div><div><b>${r.drawers}</b><span>درج</span></div></div>`;
  if (ui.asm?.id === u.id) { el.innerHTML = asmProps(u); return; }
  if (r.ok && wholeView()) h += `<div class="grid2"><label class="f"><span>↕ رفع الوحدة من الأرض (سم)</span><input type="text" inputmode="decimal" data-numf step="1" min="0" data-ulift value="${+u.lift || 0}"></label></div>
    <p class="hint">زيادة على ارتفاعها العادي — مثلاً وحدة على قاعدة أو رف معلّق. الوحدات العلوية للمطبخ ارتفاعها من "التعليق من الأرض".</p>`;
  if (u.kind === "pieces") { el.innerHTML = h + (r.ok ? summaryHtml(u) : "") + piecesProps(u); return; }
  if (u.params?.model) {
    h += modelProps(u, r) + (r.ok ? summaryHtml(u) : `<p class="hint">${esc(r.errors?.[0] || "")}</p>`);
    h += `<details open><summary>الخامات</summary><div class="mats">`;
    const used = new Set((u.params.model.solids || []).map((x) => x.mat).concat((u.params.model.sweeps || []).map((x) => x.mat)));
    for (const k of ["carcass", "front", "shelf", "accent", "back"].filter((k) => used.has(k))) h += `<button class="mrow" data-mat="${k}"><i style="background:${r.colors?.[k] || "#ccc"}"></i><span><b>${esc(PANEL_MATS[k])}</b><small>${esc(r.names?.[k] || "")}</small></span>${ICON.cycle}</button>`;
    h += `</div></details>`;
    el.innerHTML = h; return;
  }
  if (u.kind === "kitchen" && r.ok) h += applianceField(u, p) + organizerField(u, r);
  if (r.ok) h += summaryHtml(u);
  if (r.ok) h += `<div class="btnrow"><button class="ghost2" data-tostudio title="نسخة من الوحدة كألواح تعدّلها بحرية">✏️ عدّلها بحرية في ورشة الرسم</button></div>`;
  h += u.kind === "dressing" ? dressingProps(p) : u.kind === "kitchen" ? kitchenProps(p) : panelProps(p, r);
  if (u.kind === "panel" && r.ok) h += softProps(u, r);
  if (r.ok && (u.kind === "dressing" || u.kind === "panel") && r.params?.template !== "free") h += obstaclesProps(p);
  if (r.ok) h += extraProps(u, r);

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

// ---- upholstery & bedding (pictures only — the cut list is not touched)
function softProps(u, r) {
  const bed = r.params?.template === "bed", uph = r.parts.some((x) => /تنجيد/.test(x.note || ""));
  if (!bed && !uph) return "";
  const f = { type: "linen", color: r.colors?.accent || "#b9b0a3", tuft: "none", ...(u.fabric || {}) };
  const bd = { show: true, duvet: "#e9e4da", throw: "", ...(u.bedding || {}) };
  const sw = (attr, list, cur) => `<div class="fabsw">${list.map((c) => `<button class="${c.toLowerCase() === String(cur).toLowerCase() ? "on" : ""}" ${attr}="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")}<label class="fabpick" aria-label="لون تاني"><input type="color" ${attr}-pick value="${/^#[0-9a-f]{6}$/i.test(cur) ? cur : "#b9b0a3"}"></label></div>`;
  let h = `<details class="softbox" open><summary>🛋 التنجيد والمفروشات</summary>`;
  if (uph) {
    h += `<h4>قماش الضهر المنجّد</h4><div class="seg">${Object.entries(Mat.FABRICS).map(([k, l]) => `<button data-fabt="${k}" class="${f.type === k ? "on" : ""}">${l}</button>`).join("")}</div>
      ${sw("data-fabc", Mat.FABRIC_COLORS, f.color)}
      <h4>شكل التنجيد</h4><div class="seg">${Object.entries(Decor.TUFTS).map(([k, l]) => `<button data-tuft="${k}" class="${f.tuft === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
  } else h += `<p class="hint">علشان يبان تنجيد حقيقي على الضهر فعّل "ضهر منجّد" فوق.</p>`;
  if (bed) {
    h += `<label class="softchk"><input type="checkbox" data-bshow ${bd.show !== false ? "checked" : ""}> مرتبة ومخدات ولحاف في المعاينة</label>`;
    if (bd.show !== false) h += `<h4>لون اللحاف</h4>${sw("data-bduvet", Decor.BEDDING, bd.duvet)}<h4>لون البطانية على الرجلين</h4>${sw("data-bthrow", Decor.BEDDING, bd.throw || f.color)}`;
  }
  return h + `<p class="hint">ده للمعاينة والريندر بس — مش بيدخل في الكت ليست. القماش بيبان بملمسه في "ريندر واقعي".</p></details>`;
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
  if (tpl === "free") {
    const ROLE_AR = { side: "جنب", horizontal: "قاعدة/رأس", fixed_shelf: "رف ثابت", divider: "قاطوع", shelf: "رف", back: "ظهر", door: "ضلفة/غطا", plinth: "وزرة", other: "تاني" };
    const mats = Object.fromEntries(Object.entries(PANEL_MATS).filter(([k]) => !k.startsWith("table")));
    h += `<details open><summary>الألواح (${(p.panels || []).length})</summary><p class="hint">كل لوح: مكانه من الركن الشمال قدام تحت (س عرض، ص عمق، ع ارتفاع) ومقاسه. التعديل بيتحسب في الكت ليست على طول.</p>`;
    (p.panels || []).forEach((q, i) => {
      h += `<div class="zone-ed"><div class="zh">${textF(`panels.${i}.name`, `لوح ${i + 1}`, q.name)}<button data-fpdup="${i}" class="sm" aria-label="نسخة">${ICON.copy}</button><button data-fpdel="${i}" class="danger sm" aria-label="شيل اللوح">${ICON.trash}</button></div>
        <div class="grid3">${numF(`panels.${i}.w`, "العرض", q.w)}${numF(`panels.${i}.d`, "العمق", q.d)}${numF(`panels.${i}.h`, "الارتفاع", q.h)}
        ${numF(`panels.${i}.x`, "س", q.x)}${numF(`panels.${i}.y`, "ص", q.y)}${numF(`panels.${i}.z`, "ع", q.z)}</div>
        <div class="grid2">${selF(`panels.${i}.material`, "الخامة", mats, q.material)}${selF(`panels.${i}.role`, "نوعه", ROLE_AR, q.role)}</div></div>`;
    });
    h += `<button class="add" data-fpadd>${ICON.plus}ضيف لوح</button></details>`;
  }
  if (!hide.includes("fronts") && tpl !== "free") {
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

// ---- default settings (الإعدادات الافتراضية): what every NEW unit / room / quote starts from
const DEF_DIMS = { base: { height: 72, depth: 58 }, wall: { height: 70, depth: 32, wall_mount_height: 140 }, tall: { height: 220, depth: 58 } };
const DEF_KEYS = [ // construction settings a new kitchen unit takes (the unit's own preset still wins where it sets them)
  ["panel_thickness", "سمك خشب الهيكل (سم)", "n"], ["back_panel_thickness", "سمك الظهر (سم)", "n"], ["back_groove_depth", "دخول الظهر في المفحار (سم)", "n"],
  ["countertop_thickness", "سمك الكونتر (سم)", "n"], ["door_position", "تركيب الضلف", "s", { overlay: "خارجية (أوفرلاي)", inset: "داخلية (إنسيت)" }],
  ["door_gap_overlay", "خلوص الضلف الخارجية (سم)", "n"], ["door_gap_inset", "خلوص الضلف الداخلية (سم)", "n"], ["drawer_gap", "الفاصل بين الأدراج (سم)", "n"],
  ["door_handle_recess", "خلوص المقبض البلت إن (سم)", "n"], ["toe_kick_height", "ارتفاع السكلو (سم)", "n"], ["toe_kick_setback", "رجوع السكلو (سم)", "n"],
  ["toe_kick_style", "شكل السكلو", "s", { apron: "وزرة قطعة واحدة", segments: "قطع منفصلة" }], ["drawer_box_depth", "عمق صناديق الأدراج (سم)", "n"],
  ["include_edge_banding", "شريط حواف", "b"], ["include_assembly_holes", "أليتا (كام لوك)", "b"], ["include_hinge_cups", "كبب المفصلات", "b"], ["include_drawer_boxes", "صناديق الأدراج", "b"],
];
const userDefs = () => (state.defaults ??= { k: {}, dims: {}, handle: "", room: {} });
/** a new kitchen unit's params with the user's defaults under the preset (dims only where the preset kept the standard) */
function withDefaults(params) {
  const D0 = userDefs(), out = { ...D0.k, ...params };
  if (D0.handle && !params.kud_handles) out.kud_handles = { type: D0.handle };
  const ut = params.unit_type || "base", std = DEF_DIMS[ut], mine = D0.dims[ut] || {};
  if (std) for (const k of Object.keys(std)) if (mine[k] && (params[k] == null || +params[k] === std[k])) out[k] = +mine[k];
  return out;
}
function defaultsPop() {
  const D0 = userDefs(), P = priceDefaults(), o = state.cutOpts || {};
  const dv = (k) => D0.k[k];
  const nf = (attr, label, v, ph = "") => `<label class="f"><span>${esc(label)}</span><input type="text" inputmode="decimal" data-numf data-def="${attr}" value="${v ?? ""}" placeholder="${esc(String(ph))}"></label>`;
  let h = `<div class="popbox defbox" role="dialog" aria-label="الإعدادات الافتراضية"><div class="libhead"><h2>⚙ الإعدادات الافتراضية</h2><button class="x" data-close aria-label="قفل">×</button></div>
    <p class="hint">اللي تكتبه هنا بيبقى البداية لأي وحدة أو أوضة أو عرض سعر جديد — مش هتحتاج تدخله كل مرة. الخانة الفاضية = إعداد البرنامج العادي (الرقم الباهت).</p>
    <details open><summary>🍳 مقاسات وحدات المطبخ</summary><div class="grid3">
      ${nf("dims.base.height", "ارتفاع السفلي", D0.dims.base?.height, 72)}${nf("dims.base.depth", "عمق السفلي", D0.dims.base?.depth, 58)}<span></span>
      ${nf("dims.wall.height", "ارتفاع العلوي", D0.dims.wall?.height, 70)}${nf("dims.wall.depth", "عمق العلوي", D0.dims.wall?.depth, 32)}${nf("dims.wall.wall_mount_height", "تعليق العلوي من الأرض", D0.dims.wall?.wall_mount_height, 140)}
      ${nf("dims.tall.height", "ارتفاع الطويل", D0.dims.tall?.height, 220)}${nf("dims.tall.depth", "عمق الطويل", D0.dims.tall?.depth, 58)}</div></details>
    <details open><summary>🔩 التصنيع والتجميع</summary><div class="grid2">${DEF_KEYS.filter((x) => x[2] !== "b").map(([k, l, t, ch]) => t === "s"
      ? `<label class="f"><span>${esc(l)}</span><select data-def="k.${k}"><option value="">— زي البرنامج —</option>${Object.entries(ch).map(([v, lb]) => `<option value="${v}" ${dv(k) === v ? "selected" : ""}>${esc(lb)}</option>`).join("")}</select></label>`
      : nf(`k.${k}`, l, dv(k), DEF_PH[k] ?? "")).join("")}
      <label class="f"><span>نوع المقبض</span><select data-def="handle"><option value="">— زي البرنامج —</option>${Object.entries(HANDLE_TYPES_UI).map(([v, lb]) => `<option value="${v}" ${D0.handle === v ? "selected" : ""}>${esc(lb)}</option>`).join("")}</select></label></div>
      <div class="bools">${DEF_KEYS.filter((x) => x[2] === "b").map(([k, l]) => `<label class="f b"><input type="checkbox" data-defb="k.${k}" ${dv(k) === true ? "checked" : ""} ${dv(k) === undefined ? 'data-unset="1"' : ""}><span>${esc(l)}${dv(k) === undefined ? " <small>(زي البرنامج)</small>" : ""}</span></label>`).join("")}</div>
      <div class="btnrow"><button class="ghost2" data-defapply>طبّقها على وحدات المطبخ في المشروع ده</button></div></details>
    <details><summary>🧱 الأوضة والحيطان</summary><div class="grid2">${nf("room.t", "سمك الحيطة", D0.room.t, Room.WALL_T)}${nf("room.h", "ارتفاع السقف", D0.room.h, Room.WALL_H)}</div></details>
    <details><summary>💰 التسعير</summary><div class="grid2"><label class="f"><span>حساب الخامة</span><select data-def="price.mode"><option value="area" ${P.mode === "area" ? "selected" : ""}>بمسطح القطع (م²) لكل وحدة</option><option value="sheets" ${P.mode !== "area" ? "selected" : ""}>بعدد الألواح من خطة القص</option></select></label>${nf("price.waste", "نسبة الهالك % (بالمسطح)", P.waste)}${nf("price.defaultSheet", "سعر اللوح (أي خامة ملهاش سعر)", P.defaultSheet)}${nf("price.band", "سعر متر الشريط", P.band)}
      ${nf("price.laborUnit", "مصنعية الوحدة", P.laborUnit)}${nf("price.laborM2", "مصنعية المتر المربع", P.laborM2)}${nf("price.install", "التركيب للمشروع", P.install)}${nf("price.margin", "نسبة المكسب %", P.margin)}
      ${nf("price.validity", "صلاحية عرض السعر (يوم)", P.validity)}<label class="f"><span>مدة التنفيذ</span><input data-deft="price.delivery" value="${esc(trv(P.delivery || ""))}"></label>
      <label class="f full"><span>الضمان</span><input data-deft="price.warranty" value="${esc(trv(P.warranty || ""))}"></label><label class="f full"><span>شروط ثابتة في كل عرض سعر</span><input data-deft="price.notes" value="${esc(P.notes || "")}"></label></div>
      <p class="hint">أسعار كل خامة وكل بند هاردوير بتتظبط من «الورشة والعميل» وبتفضل محفوظة لكل المشاريع.</p></details>
    <details><summary>✂ القص والملصقات</summary><div class="grid2">${nf("cut.sheetW", "طول اللوح", o.sheetW, 244)}${nf("cut.sheetH", "عرض اللوح", o.sheetH, 122)}${nf("cut.kerf", "سلاح المنشار", o.kerf, 0.4)}${nf("cut.trim", "تشذيب الحرف", o.trim, 1)}${nf("cut.leftMin", "أقل باقي يتحسب", o.leftMin, 30)}
      <label class="f"><span>مقاس الملصقات</span><select data-def="labelFmt"><option value="a4" ${state.labelFmt !== "roll" ? "selected" : ""}>A4 — 21 ملصق</option><option value="roll" ${state.labelFmt === "roll" ? "selected" : ""}>رول 60×40 مم</option></select></label></div></details>
    <p class="hint">الإعدادات دي محفوظة على الجهاز${cloud.db && cloud.me ? " ومع حسابك (بتوصل لأي جهاز تفتح منه)" : ""}، ومش بتغيّر المشاريع القديمة غير لو دوست «طبّقها».</p></div>`;
  return h;
}
const HANDLE_TYPES_UI = { bar: "مقبض بخرمين", knob: "زرار", edge_pull: "مقبض حرف (تاب)", profile: "بروفايل ألومنيوم", builtin_routed: "بلت إن محفور (CNC)", builtin_strip: "شريحة خشب بلت إن", gola: "جولا", push: "بوش (تكة ضغط)" };
const DEF_PH = { panel_thickness: 1.8, back_panel_thickness: 0.6, back_groove_depth: 0.8, countertop_thickness: 3.8, door_gap_overlay: 0.3, door_gap_inset: 0.2, drawer_gap: 0.3, door_handle_recess: 0, toe_kick_height: 10, toe_kick_setback: 3, drawer_box_depth: 45 };
/** the defaults, prices and cut settings follow the account (one small document) */
let setT = 0;
function settingsPush() {
  if (!cloud.db || !cloud.me) return;
  clearTimeout(setT);
  setT = setTimeout(() => { cloud.db.doc(`data/users/${cloud.me}/settings`).set({ defaults: state.defaults || null, prices: state.prices || null, cutOpts: state.cutOpts || null, labelFmt: state.labelFmt || "a4", at: new Date().toISOString() }).catch(() => {}); }, 800);
}
async function settingsPull() {
  if (!cloud.db || !cloud.me) return;
  try {
    const sn = await cloud.db.doc(`data/users/${cloud.me}/settings`).get();
    if (!sn.exists) { if (state.defaults || state.prices) settingsPush(); return; }
    const v = sn.data();
    if ((v.at || "") > (state.settingsAt || "")) { if (v.defaults) state.defaults = v.defaults; if (v.prices) state.prices = v.prices; if (v.cutOpts) state.cutOpts = v.cutOpts; if (v.labelFmt) state.labelFmt = v.labelFmt; state.settingsAt = v.at; save(); }
  } catch { /* offline */ }
}
function setDefault(path, v) {
  state.settingsAt = new Date().toISOString();
  const D0 = userDefs(), [a, ...rest] = path.split(".");
  if (a === "price") { const P = priceDefaults(); P[rest[0]] = v; return; }
  if (a === "cut") { state.cutOpts ??= {}; if (v === "" || v == null) delete state.cutOpts[rest[0]]; else state.cutOpts[rest[0]] = v; cutKey = ""; return; }
  if (a === "labelFmt") { state.labelFmt = v; return; }
  if (a === "handle") { D0.handle = v; return; }
  let o = D0;
  const ks = [a, ...rest];
  for (const k of ks.slice(0, -1)) o = o[k] ??= {};
  if (v === "" || v == null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
}
/** the plinth drawer's front height from the unit's settings (kick height − floor gap − gaps) */
function kickFrontOf(p) {
  const ov = p.door_position === "overlay", eg = +(ov ? p.door_gap_overlay : p.door_gap_inset) || 0;
  return Math.round(((+p.toe_kick_height || 10) + eg - (+p.door_bottom_extension || 0) - (+p.drawer_gap || 0) - (+(p.toe_kick_drawer_floor_gap ?? 1)) - (p.toe_kick_drawer_handle === "gap" ? +(p.toe_kick_drawer_handle_size ?? 3) : 0)) * 10) / 10;
}
function kickDrawerSection(p) {
  if (p.unit_type === "wall" || !p.include_toe_kick) return "";
  const on = !!p.toe_kick_drawer, fh = kickFrontOf(p);
  return `<details open><summary>درج الوزرة</summary><div class="bools">${boolF("toe_kick_drawer", "درج مكان الوزرة (السكلو)", on)}</div>
    ${on ? `<div class="grid2">${numF("__kickfront", "ارتفاع وش الدرج", fh, 0.5)}${numF("toe_kick_height", "ارتفاع السكلو كله", p.toe_kick_height, 0.5)}
      ${numF("toe_kick_drawer_setback", "رجوع الوش لورا (زي رجوع السكلو)", p.toe_kick_drawer_setback ?? 0, 0.5)}${numF("toe_kick_drawer_depth", "عمق علبة الدرج (0 = تلقائي)", p.toe_kick_drawer_depth ?? 0, 1)}${numF("toe_kick_drawer_floor_gap", "خلوص عن الأرض", p.toe_kick_drawer_floor_gap ?? 1, 0.1)}</div>
      <div class="grid2">${selF("toe_kick_drawer_handle", "مقبض درج الوزرة (لوحده)", { none: "بدون مقبض (بوش / تاتش)", routed: "حفر مقبض بلت إن (CNC)", gap: "فتحة صباع فوق الوش", same: "زي باقي الوحدة" }, p.toe_kick_drawer_handle || "none")}
        ${["routed", "gap"].includes(p.toe_kick_drawer_handle) ? numF("toe_kick_drawer_handle_size", p.toe_kick_drawer_handle === "gap" ? "ارتفاع الفتحة" : "عرض الحفر", p.toe_kick_drawer_handle_size ?? 3, 0.5) : ""}</div>
      <p class="hint">مقبض درج الوزرة مستقل: مقابض الوحدة وخلوص المقبض البلت إن ما بيأثروش عليه. الحفر بيتعمل في الحرف اللي فوق من ورا (CNC)، والفتحة بتقصّر الوش وتسيب مكان صباع تحت الوحدة.</p>
      <p class="hint">العرض = عرض الوحدة. لما تكبّر وش الدرج، السكلو والوحدة كلها بتعلى معاه (الكونتر بيعلى). ${fh < 6 ? `<b class="danger">الوش أقل من 6 سم — هيتعمل سكلو عادي بدل الدرج. كبّر السكلو.</b>` : ""}</p>` : `<p class="hint">درج واطي مكان السكلو، وشه على مستوى الضلف — مكان زيادة للصواني والحاجات المسطحة.</p>`}</details>`;
}
function kitchenProps(p) {
  const f = ([path, label, type, choices]) => (type === "choice" ? selF(path, label, choices, getPath(p, path) ?? "") : type === "bool" ? boolF(path, label, getPath(p, path)) : type === "text" ? textF(path, label, getPath(p, path)) : numF(path, label, getPath(p, path), type === "int" ? 1 : 0.5));
  const dims = KU.dimsFor(p);
  let h = `<details open><summary>الوحدة</summary><div class="grid2">${selF("unit_category", "النوع", KU.K_CATS, p.unit_category)}${selF("unit_type", "المكان", KU.K_TYPES, p.unit_type)}</div>
    <div class="grid2">${textF("unit_label", "اسم/تعليق للوحدة (بيظهر في الملصقات)", p.unit_label)}</div>
    <div class="grid3">${dims.map(([k, l]) => numF(k, l, p[k])).join("")}</div>
    ${p.unit_type === "wall" ? `<div class="grid2">${numF("wall_mount_height", "التعليق من الأرض", p.wall_mount_height)}</div>` : ""}</details>`;
  h += kickDrawerSection(p);
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
    ${p.include_toe_kick && !(p.toe_kick_drawer && p.unit_type !== "wall") ? numF("toe_kick_height", "ارتفاع السكلو", p.toe_kick_height) + numF("toe_kick_setback", "رجوع السكلو", p.toe_kick_setback) + selF("toe_kick_style", "شكل السكلو", KU.K_KICK, p.toe_kick_style)
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
  h += obstaclesProps(p);
  return h;
}
/** columns / ledges / pipes behind the unit: the carcass is cut around them (same list as the plugin) */
const OBS_PRESETS = {
  col_left: ["🧱 عمود شمال", { name: "عمود", from: "left", x: 0, width: 20, depth: 15 }],
  col_right: ["🧱 عمود يمين", { name: "عمود", from: "right", x: 0, width: 20, depth: 15 }],
  ledge: ["▭ خلع تحت", { name: "خلع", from: "left", x: 0, width: 0, depth: 10, z: 0, height: 15 }],
  pipe: ["◉ ماسورة", { name: "ماسورة", from: "left", x: 20, width: 8, depth: 8, z: 0, height: 40 }],
};
function obstaclesProps(p) {
  const list = Array.isArray(p.obstacles) ? p.obstacles : [];
  let h = `<details ${list.length ? "open" : ""}><summary>🧱 خلع العمود (عمود / خلع / ماسورة)${list.length ? ` · ${list.length}` : ""}</summary>
    <p class="hint">لو فيه عمود أو خلع أو ماسورة في الحيطة ورا الوحدة: العلبة بتتقص حواليه (الجنب والقاعدة والرأس والأرفف والظهر) وبيتضاف ألواح تقفيل، والكونتر والوزرة بيتقصوا على مقاسه. المقاسات الجديدة والتفريغة بتتكتب في الكت ليست والملصقات.</p>`;
  list.forEach((o, i) => {
    h += `<div class="zone-ed"><div class="zh">${textF(`obstacles.${i}.name`, `عائق ${i + 1}`, o.name, "عمود")}<button data-obsdel="${i}" class="danger sm" aria-label="شيل العائق">${ICON.trash}</button></div>
      <div class="grid3">${selF(`obstacles.${i}.from`, "من جنب", { left: "شمال", right: "يمين" }, o.from || "left")}${numF(`obstacles.${i}.x`, "بعده عن الجنب", o.x)}${numF(`obstacles.${i}.width`, "العرض", o.width)}
      ${numF(`obstacles.${i}.depth`, "داخل في العمق من ورا", o.depth)}${numF(`obstacles.${i}.z`, "يبدأ من تحت", o.z)}${numF(`obstacles.${i}.height`, "الارتفاع (0 = لفوق)", o.height)}</div></div>`;
  });
  h += `<div class="btnrow">${Object.entries(OBS_PRESETS).map(([k, [l]]) => `<button class="ghost2" data-obsadd="${k}">${l}</button>`).join("")}</div>`;
  if (state.project.room?.columns?.length) h += `<button class="add" data-obsroom>📐 خد أعمدة الأوضة اللي ورا الوحدة دي</button>`;
  return h + `</details>`;
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
  if (p.doors.layout === "sliding") h += `<div class="grid2">${numF("doors.sliding_panels", "عدد ألواح السحّاب (2–4)", p.doors.sliding_panels ?? 2, 1)}</div><p class="hint">الألواح بتغطي الواجهة كلها وبتتزحلق على سكتين — الأرفف والأدراج جوه بترجع لورا السكة لوحدها.</p>`;
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
  if (t.hasAttribute?.("data-tlev")) { const u = selUnit(), T = u && trolleyOpts(u); if (T) { u.orgOpts = { ...T, levels: +t.value }; save(); render(); } return; }
  const prow = t.closest?.(".pcrow");
  if (prow) {
    const u = selUnit(), i = +prow.dataset.pi, r = u?.params?.pieces?.[i];
    if (!r) return;
    if (t.dataset.pb) { r.band ??= {}; r.band[t.dataset.pb] = t.checked; }
    else if (t.dataset.pf === "grain") r.grain = t.checked;
    else if (t.dataset.pf === "name" || t.dataset.pf === "lib") r[t.dataset.pf] = t.value;
    else if (t.dataset.pf) r[t.dataset.pf] = Math.max(0, +t.value || 0);
    u.params = { ...u.params, pieces: [...u.params.pieces] };
    save(); render();
    return;
  }
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
      else if (t.dataset.rw === "ang") Room.setCornerAngle(room, sg.i, toNum(t.value));
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
  if (d.insc || d.insr) {
    const i = +(d.insc || d.insr);
    u.insertOpts ??= {}; u.insertOpts[i] ??= {};
    u.insertOpts[i][d.insc ? "cols" : "rows"] = Math.max(1, Math.min(8, Math.round(+t.value || 1)));
    applyInsert(u, i, "grid");
    return;
  }
  if (d.appl) {
    u.appliance ??= {};
    if (t.value) u.appliance[d.appl] = t.value; else delete u.appliance[d.appl];
    const a = APPLIANCES[t.value];
    if (a) setParams(u, (p) => Object.assign(p, a.set)); else { save(); renderProps(); }
    return;
  }
  if (d.bshow !== undefined || d.fabcPick !== undefined || d.bduvetPick !== undefined || d.bthrowPick !== undefined) {
    u.fabric ??= {}; u.bedding ??= {};
    if (d.bshow !== undefined) u.bedding.show = t.checked;
    if (d.fabcPick !== undefined) u.fabric.color = t.value;
    if (d.bduvetPick !== undefined) u.bedding.duvet = t.value;
    if (d.bthrowPick !== undefined) u.bedding.throw = t.value;
    save(); renderProps(); view.update();
    return;
  }
  if (d.ulift !== undefined) { u.lift = Math.max(0, toNum(t.value)); save(); renderChips(); view.update(); if (ui.planOn) plan.render(); return; }
  if (t.id === "xmoveAx") { ui.xmoveAx = t.value; return; }
  if (d.xcut) {
    const [i, f] = d.xcut.split(".");
    setExtra(u, (l) => { const q = l[+i]; if (!q) return; if (f === "c") { if (!t.value) delete q.cut; else q.cut = { a: 10, b: 10, ...(q.cut || {}), c: t.value }; } else { q.cut = { ...(q.cut || {}), [f]: Math.max(0, toNum(t.value)) }; } });
    return;
  }
  if (d.xnum || d.xtext || d.xsel) {
    const [i, f] = (d.xnum || d.xtext || d.xsel).split(".");
    setExtra(u, (l) => { if (!l[+i]) return; l[+i][f] = d.xnum ? Math.max(f === "w" || f === "d" || f === "h" ? 0.1 : -1e4, toNum(t.value)) : t.value; });
    return;
  }
  if (d.num === "__kickfront") { const rp = R(u).params || u.params, cur = kickFrontOf(rp), v = toNum(t.value); if (v > 0) setParams(u, (p) => { p.toe_kick_height = Math.max(4, Math.round(((+rp.toe_kick_height || 10) + v - cur) * 10) / 10); }); return; }
  if (d.num) setParams(u, (p) => setPath(p, d.num, t.value === "" ? 0 : toNum(t.value)));
  else if (d.auto) setParams(u, (p) => setPath(p, d.auto, t.value.trim() === "" ? "auto" : toNum(t.value)));
  else if (d.sel) setParams(u, (p) => setPath(p, d.sel, d.sel === "doors.layout" ? t.value : t.value));
  else if (d.bool) setParams(u, (p) => setPath(p, d.bool, t.checked));
  else if (d.text) setParams(u, (p) => setPath(p, d.text, t.value));
});
props.addEventListener("input", (e) => { if (e.target.id === "propQ") { ui.propQ = e.target.value; filterProps(); } }, true);
props.addEventListener("click", (e) => {
  const b = e.target.closest("[data-padv]");
  if (!b) return;
  e.stopImmediatePropagation();
  state.propsAdv = b.dataset.padv === "1"; save(); renderProps();
  if (state.propsAdv && b.classList.contains("advmore")) $("#props").querySelector("details.advhid, details[data-basic='0']")?.scrollIntoView({ block: "start", behavior: "smooth" });
}, true);
props.addEventListener("input", (e) => {
  if (e.target.id !== "unitName") return;
  selUnit().name = e.target.value;
  save();
  renderStrip();
});
props.addEventListener("click", (e) => {
  const rb = e.target.closest("button");
  const pu = selUnit();
  if (pu && rb && rb.dataset.ins) { const [i, k] = rb.dataset.ins.split("|"); applyInsert(pu, +i, k); return; }
  if (pu && rb && rb.dataset.org !== undefined) { applyOrg(pu, rb.dataset.org); return; }
  if (pu && rb && (rb.dataset.trow || rb.dataset.tdiv)) {
    const T = trolleyOpts(pu); if (!T) return;
    const [i, v] = (rb.dataset.trow || rb.dataset.tdiv).split("|");
    pu.orgOpts = { levels: T.levels, rows: [...T.rows], div: [...T.div] };
    if (rb.dataset.trow) pu.orgOpts.rows[+i] = v; else pu.orgOpts.div[+i] = +v;
    save(); render(); return;
  }
  if (pu && rb && (rb.dataset.fabt || rb.dataset.fabc || rb.dataset.tuft || rb.dataset.bduvet || rb.dataset.bthrow)) {
    const same = targetUnits().filter((x) => x.kind === "panel");
    for (const x of same.length ? same : [pu]) {
      x.fabric ??= {}; x.bedding ??= {};
      if (rb.dataset.fabt) x.fabric.type = rb.dataset.fabt;
      if (rb.dataset.fabc) x.fabric.color = rb.dataset.fabc;
      if (rb.dataset.tuft) x.fabric.tuft = rb.dataset.tuft;
      if (rb.dataset.bduvet) x.bedding.duvet = rb.dataset.bduvet;
      if (rb.dataset.bthrow) x.bedding.throw = rb.dataset.bthrow;
    }
    save(); renderProps(); view.update();
    return;
  }
  if (pu?.kind === "pieces" && rb && (rb.hasAttribute("data-padd") || rb.hasAttribute("data-pdup") || rb.dataset.pdel || rb.hasAttribute("data-ppaste"))) {
    const list = [...(pu.params.pieces || [])];
    if (rb.hasAttribute("data-padd")) list.push({ ...PIECE_DEF(), name: `قطعة ${list.length + 1}`, lib: list[list.length - 1]?.lib || "hpl_white", t: list[list.length - 1]?.t || 1.8 });
    else if (rb.hasAttribute("data-pdup") && list.length) list.push(JSON.parse(JSON.stringify(list[list.length - 1])));
    else if (rb.dataset.pdel) list.splice(+rb.dataset.pdel, 1);
    else {
      const txt = $("#pcPaste")?.value || "";
      let n = 0;
      for (const line of txt.split(/\r?\n/)) {
        const c = line.split(/\t|,|،|;/).map((x) => x.trim());
        if (c.length < 3) continue;
        const num = (v) => +String(v).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace("٫", ".");
        const [name, L, W, q, T] = [c[0], num(c[1]), num(c[2]), num(c[3] || 1), num(c[4] || 0)];
        if (!(L > 0 && W > 0)) continue;
        list.push({ ...PIECE_DEF(), name, l: L, w: W, qty: q > 0 ? Math.round(q) : 1, t: T > 0 ? T : list[list.length - 1]?.t || 1.8, lib: list[list.length - 1]?.lib || "hpl_white" });
        n++;
      }
      alertBar(n ? `اتضاف ${n} صنف.` : "مالقيتش قطع في الكلام ده — كل سطر: الاسم، الطول، العرض، العدد.");
    }
    pu.params = { ...pu.params, pieces: list };
    save(); render();
    return;
  }
  const room = state.project.room;
  if (ui.planTool === "draw" && (rb?.dataset.drawsnap != null || rb?.dataset.drawangp || rb?.dataset.drawturn)) {
    if (rb.dataset.drawsnap != null) { ui.drawSnap = +rb.dataset.drawsnap; renderProps(); return; }
    if (rb.dataset.drawangp) { ui.drawAng = +rb.dataset.drawangp; renderProps(); return; }
    const L = toNum($("#drawLen").value) || 0, A = toNum($("#drawAng")?.value) || 90;
    if (L <= 0 || A <= 0 || A >= 360) return;
    ui.drawLen = L; ui.drawAng = A;
    const pts = (ui.draft ??= []);
    const q = Room.nextPoint(pts, L, A, +rb.dataset.drawturn);
    if (pts.length >= 3 && Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) < 1) { finishDraw(true); return; }
    pts.push(q);
    plan.vb = null; plan.fitPts = pts;
    renderChips(); renderProps(); plan.render();
    return;
  }
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
    if (d.rwang) {
      const sg = Room.segments(room).find((g) => g.id === ui.planSel?.id);
      if (sg && Room.setCornerAngle(room, sg.i, +d.rwang)) { save(); renderProps(); plan.render(); view.update(); }
      return;
    }
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
  if (b.hasAttribute("data-mysave")) { ui.pop = "mysave"; ui.mysaveId = u.id; renderPop(); return; }
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
  else if (d.fpdel != null) setParams(u, (p) => p.panels.splice(+d.fpdel, 1));
  else if (d.fpdup != null) setParams(u, (p) => { const q = clone(p.panels[+d.fpdup]); q.name += " (نسخة)"; q.x += q.w + 2; p.panels.splice(+d.fpdup + 1, 0, q); });
  else if (d.xdraw !== undefined) { ui.xdraw = d.xdraw || null; if (ui.xdraw) ui.xmove = false; renderProps(); if (ui.xdraw && ui.xdraw !== "board") { ui.open = true; view.setOpen(true); renderChips(); } if (ui.xdraw) alertBar(`دوس في الـ3D على المكان اللي عايز فيه ${XKIND[ui.xdraw].replace(/^\S+\s/, "")}`); }
  else if (d.xauto) {
    const r = R(u), bb = localBox(r);
    const zs = solidBoxes(u, r).reduce((a, b) => [Math.min(a[0], b.z0), Math.max(a[1], b.z1)], [Infinity, -Infinity]);
    const q = [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2, (zs[0] + zs[1]) / 2];
    let pc = fitPiece(u, r, d.xauto, q, d.xauto === "board" ? [0, -1, 0] : [0, 0, 1]);
    if (d.xauto === "board") pc = { ...pc, y: Math.round((bb.y0 - 1.8) * 10) / 10, d: 1.8, h: 60, z: Math.round((zs[0] + 10) * 10) / 10 };
    if (!pc) { alertBar("مفيش مكان فاضي في نص الوحدة — ارسمها بالضغط على المكان اللي عايزه."); return; }
    setExtra(u, (l) => l.push(pc));
  }
  else if (d.xrot) {
    const [i, a, c] = d.xrot.split(",");
    const ax = { w: "x", d: "y", h: "z" };
    setExtra(u, (l) => {
      const q = l[+i]; if (!q) return;
      const ca = (+q[ax[a]] || 0) + (+q[a] || 0) / 2, cc = (+q[ax[c]] || 0) + (+q[c] || 0) / 2;
      [q[a], q[c]] = [q[c], q[a]];
      q[ax[a]] = Math.round((ca - q[a] / 2) * 10) / 10; q[ax[c]] = Math.round((cc - q[c] / 2) * 10) / 10;
      delete q.cut;
    });
  }
  else if (b.hasAttribute("data-xmove")) { ui.xmove = !ui.xmove; if (ui.xmove) { ui.xdraw = null; ui.open = true; view.setOpen(true); renderChips(); } renderProps(); if (ui.xmove) alertBar("اسحب أي قطعة مضافة بصباعك — بتتحرك على سمكها (الرف لفوق وتحت، القاطوع يمين وشمال)."); }
  else if (d.xdel != null) setExtra(u, (l) => l.splice(+d.xdel, 1));
  else if (d.xdup != null) setExtra(u, (l) => { const c = clone(l[+d.xdup]); c.name = (c.name || "قطعة") + " (نسخة)"; c.z = (+c.z || 0) + (c.kind === "shelf" ? 20 : 0); c.x = (+c.x || 0) + (c.kind === "divider" ? 20 : 0); l.splice(+d.xdup + 1, 0, c); });
  else if (d.xnudge) { const [i, a, s1] = d.xnudge.split(","); setExtra(u, (l) => { if (l[+i]) l[+i][a] = Math.round(((+l[+i][a] || 0) + +s1) * 10) / 10; }); }
  else if (b.hasAttribute("data-xmerge")) {
    const target = state.project.units.find((x) => x.id === $("#xmergeTo")?.value);
    if (!target) return;
    const n = mergeInto(u, target);
    if (!n) return;
    const wasFree = u.kind === "panel" && R(u).params?.template === "free";
    if (wasFree) state.project.units = state.project.units.filter((x) => x !== u); else delete u.extra;
    state.sel = target.id; save(); render(true);
    alertBar(`اتدمجت ${n} قطعة في ${target.name} — هتلاقيها في "رسم قطع وتجميعها" بتاعتها وفي الكت ليست.`);
  }
  else if (d.obsadd) setParams(u, (p) => { const o = clone(OBS_PRESETS[d.obsadd][1]); if (!o.width) o.width = +p.width || 60; (p.obstacles = Array.isArray(p.obstacles) ? p.obstacles : []).push(o); });
  else if (d.obsdel != null) setParams(u, (p) => { p.obstacles.splice(+d.obsdel, 1); if (!p.obstacles.length) delete p.obstacles; });
  else if (b.hasAttribute("data-obsroom")) {
    const found = roomObstacles(u);
    if (!found.length) { alertBar("مفيش عمود من أعمدة الأوضة ورا الوحدة دي — اتأكد إنها لازقة في الحيطة جنب العمود."); return; }
    setParams(u, (p) => { p.obstacles = [...(Array.isArray(p.obstacles) ? p.obstacles.filter((o) => !o.fromRoom) : []), ...found]; });
    alertBar(`اتضاف ${found.length} عمود من الأوضة — الوحدة اتقصّت حواليه.`);
  }
  else if (b.hasAttribute("data-fpadd")) setParams(u, (p) => { (p.panels ??= []).push({ name: `لوح ${p.panels.length + 1}`, role: "other", material: "carcass", x: 0, y: 0, z: 0, w: 60, d: 40, h: 1.8 }); });
  else if (b.hasAttribute("data-zadd")) setParams(u, (p) => p.fronts.push({ type: "open", count: 1, height: "auto", shelves: 1, hinge: "left", led: false }));
  else if (d.secdel != null) setParams(u, (p) => { if (p.sections.length > 1) p.sections.splice(+d.secdel, 1); });
  else if (b.hasAttribute("data-secadd")) setParams(u, (p) => { p.sections.push({ width: "auto", kind: "normal", compartments: [DC({ content: "shelves", shelf_count: 4, door: "single_left" })] }); p.width += 50; });
  else if (d.compdel) { const [si, ci] = d.compdel.split(".").map(Number); setParams(u, (p) => { if (p.sections[si].compartments.length > 1) p.sections[si].compartments.splice(ci, 1); }); }
  else if (d.compadd != null) setParams(u, (p) => p.sections[+d.compadd].compartments.push(DC({ height: 40, content: "shelves", shelf_count: 1, door: "continue" })));
  else if (d.rowdel != null) setParams(u, (p) => { if (p.doors.rows.length > 1) p.doors.rows.splice(+d.rowdel, 1); });
  else if (b.hasAttribute("data-rowadd")) setParams(u, (p) => p.doors.rows.push({ height: 40, type: "doors", leaves: 2 }));
  else if (d.mat) { ui.matPick = d.mat; ui.pop = "mat"; renderPop(); }
  else if (b.hasAttribute("data-studio")) openStudio(u);
  else if (b.hasAttribute("data-tostudio")) {
    const nu = { id: uid(), kind: "panel", name: u.name + " (رسم حر)", params: { template: "free", model: unitToModel(u), materials: {} }, ...(u.pos ? { pos: clone(u.pos) } : {}) };
    state.project.units.push(nu); state.sel = nu.id; save(); render(true); openStudio(nu);
  }
});

// ------------------------------------------------------------------ popovers (materials, projects)
/** give the selected unit's material role (ui.matPick) a catalogue or custom material ("" = default) */
// ---- look: light / dark / automatic, the accent colour, the 3D background
const ACCENTS = {
  green: ["أخضر NOVERA", "#1f6d3d", "#123f23", "#4caf72", "#0b1d11"],
  blue: ["أزرق", "#1f5a8f", "#11314f", "#5aa0e0", "#0b1622"],
  brown: ["بني خشبي", "#8a5a2b", "#4a2f16", "#d29a5e", "#1d140b"],
  gray: ["رمادي", "#4a5560", "#22282e", "#9fb0c0", "#121619"],
  purple: ["بنفسجي", "#5b3f8f", "#2e2050", "#a98ae0", "#170f26"],
};
const STAGE_BGS = { "": "افتراضي", "#ffffff": "أبيض", "#ecebe6": "رمادي فاتح", "#efe6d8": "بيج", "#7d8288": "رمادي", "#3a3f44": "رمادي غامق", "#141618": "أسود" };
function isDark() { const root = document.documentElement; return root.dataset.theme === "dark" || (root.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); }
function applyLook() {
  const L = (state.look ??= { mode: "auto", accent: "green", stage: "" });
  const root = document.documentElement;
  if (L.mode === "auto") delete root.dataset.theme; else root.dataset.theme = L.mode;
  const a = ACCENTS[L.accent] || ACCENTS.green, dark = isDark();
  root.style.setProperty("--brand", dark ? a[3] : a[1]);
  root.style.setProperty("--bar", dark ? a[4] : a[2]);
  if (L.stage) root.style.setProperty("--stage", L.stage); else root.style.removeProperty("--stage");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? a[4] : a[2]);
  view.stageBg = L.stage || null;
}
// ---- several units at once: the selected unit plus the ones ticked in "اختار أكتر من وحدة"
function targetUnits() {
  const u = selUnit();
  if (!ui.multi?.size) return u ? [u] : [];
  const list = state.project.units.filter((x) => ui.multi.has(x.id));
  return u && !list.includes(u) ? [u, ...list] : list;
}
function renderMulti() {
  const el = $("#multibar");
  if (!ui.multi || state.tab !== "design" || ui.planOn) { el.hidden = true; return; }
  const n = targetUnits().length;
  el.hidden = false;
  el.innerHTML = `<span>دوس على الوحدات (في العرض أو تحت) عشان تضيفها أو تشيلها · <b>مختار ${n}</b></span>
    <button data-mm="mat">🎨 الخامات</button><button data-mm="up">↑ 5</button><button data-mm="down">↓ 5</button><button data-mm="all">الكل</button><button data-mm="off">✕ خلاص</button>`;
}
$("#multibar").addEventListener("pointerdown", (e) => e.stopPropagation());
$("#multibar").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mm]");
  if (!b) return;
  const k = b.dataset.mm;
  if (k === "off") { ui.multi = null; renderMulti(); renderChips(); renderStrip(); view.update(); return; }
  if (k === "all") { ui.multi = new Set(state.project.units.map((x) => x.id)); renderMulti(); renderStrip(); view.update(); return; }
  if (k === "up" || k === "down") { for (const x of targetUnits()) x.lift = Math.max(0, (+x.lift || 0) + (k === "up" ? 5 : -5)); save(); renderChips(); view.update(); return; }
  if (k === "mat") { ui.pop = "mkeys"; renderPop(); }
});
/** line a unit up with another one: its left edges, centres or right edges (as you face the units) */
function alignUnit(u, o, mode) {
  const poses = projectPoses(state.project);
  const Lu = poses.get(u.id), Lo = poses.get(o.id);
  if (!Lu || !Lo) return;
  const bu = localBox(R(u)), bo = localBox(R(o));
  const wu = bu.x1 - bu.x0, wo = bo.x1 - bo.x0;
  if (Lu.wall && Lu.wall === Lo.wall) {
    const sv = mode === "start" ? Lo.s : mode === "end" ? Lo.s + wo - wu : Lo.s + (wo - wu) / 2;
    u.pos = { wall: Lu.wall, s: Math.max(0, Math.round(sv * 10) / 10) };
    return;
  }
  const ax = Room.axisX(Lo.rot), cu = Room.centerOf(Lu, bu), co = Room.centerOf(Lo, bo);
  const want = mode === "start" ? -(wo - wu) / 2 : mode === "end" ? (wo - wu) / 2 : 0;
  const now = (cu[0] - co[0]) * ax[0] + (cu[1] - co[1]) * ax[1];
  const c = [cu[0] + ax[0] * (want - now), cu[1] + ax[1] * (want - now)];
  const pose = Room.snapPose([], bu, c, Lo.rot, [], rowOf(u, R(u)));
  u.pos = { x: pose.x, z: pose.z, rot: Lo.rot };
}
// ---- surface finish per material of a unit: gloss, metal, reflection strength, clear lacquer
const FIN_PRESETS = {
  matte: ["مط", { gloss: 12, metal: 0, refl: 60, coat: 0 }],
  satin: ["ساتان", { gloss: 45, metal: 0, refl: 100, coat: 0 }],
  gloss: ["لامع", { gloss: 72, metal: 0, refl: 130, coat: 0 }],
  hgloss: ["هاي جلوس", { gloss: 88, metal: 0, refl: 160, coat: 100 }],
  brushed: ["معدن مط", { gloss: 50, metal: 100, refl: 100, coat: 0 }],
  chrome: ["كروم / مرايا", { gloss: 97, metal: 100, refl: 150, coat: 0 }],
};
function finOf(u, key) {
  const f = u?.fin || {};
  let k = key; const seen = new Set();
  while (k && !seen.has(k)) {
    seen.add(k);
    if (f[k]) return f[k];
    k = u.kind === "dressing" ? D.MATERIAL_KEYS[k]?.fallback : u.kind === "panel" ? Catalog.MATERIAL_KEYS[k]?.fallback : null;
  }
  return null;
}
/** a material for one finish (MeshPhysical when it has a clear lacquer coat) */
function finMaterial(THREE, f, opts) {
  if (!f) return new THREE.MeshStandardMaterial(opts);
  const m = f.coat > 0 ? new THREE.MeshPhysicalMaterial({ ...opts, clearcoat: f.coat / 100, clearcoatRoughness: 0.06 }) : new THREE.MeshStandardMaterial(opts);
  m.roughness = Math.max(0.02, 1 - (f.gloss / 100) * 0.98);
  m.metalness = f.metal / 100;
  m.userData.refl = f.refl / 100;
  return m;
}

// ------------------------------------------------------------------ smart inner fittings
// 1) drawer organisers: each one becomes the engine's own "custom" insert (dividers at measured positions),
//    so the cut list, the labels and the SketchUp plugin all get the same pieces.
const INSERTS = {
  none: { label: "من غير", icon: "▢" },
  cutlery: { label: "معالق وشوك وسكاكين", icon: "🍴", ht: 5 },
  knives: { label: "سكاكين (شقوق)", icon: "🔪", ht: 6 },
  spices: { label: "توابل وبرطمانات", icon: "🧂", ht: 4 },
  wraps: { label: "فويل وأكياس ولفايف", icon: "🧻", ht: 6 },
  utensils: { label: "أدوات طبخ (مغارف…)", icon: "🥄", ht: 6 },
  pots: { label: "حلل وأغطية", icon: "🍲", ht: 10 },
  plates: { label: "أطباق واقفة", icon: "🍽", ht: 9 },
  tea: { label: "شاي وقهوة وأكياس", icon: "☕", ht: 6 },
  grid: { label: "شبكة بمقاساتك", icon: "▦", ht: 5 },
};
const r1_ = (v) => Math.round(v * 10) / 10;
function insertLayout(kind, W, D, o = {}) {
  const v = [], h = [];
  const steps = (len, step, from = step) => { const a = []; for (let x = from; x < len - step * 0.6; x += step) a.push(r1_(x)); return a; };
  if (kind === "cutlery") {
    let x = 0;
    for (const w of [7.5, 9, 9, 7.5]) { if (x + w > W - 12) break; x += w; v.push(r1_(x)); }
    if (D > 38) h.push(r1_(D - 12));
  } else if (kind === "knives") {
    const n = Math.min(14, Math.floor((W - 6) / 3.4));
    for (let i = 1; i <= n; i++) v.push(r1_(i * 3.4));
  } else if (kind === "spices") {
    h.push(...steps(D, 8));
    if (W > 50) v.push(r1_(W / 2));
  } else if (kind === "wraps") {
    h.push(...steps(D, Math.max(8, D / 4)));
  } else if (kind === "utensils") {
    v.push(r1_(W * 0.36));
    if (D > 30) h.push(r1_(D * 0.5));
  } else if (kind === "pots") {
    if (W > 45) v.push(r1_(W * 0.72));
  } else if (kind === "plates") {
    for (let y = D * 0.22; y < D * 0.8; y += 3.6) h.push(r1_(y));
  } else if (kind === "tea") {
    v.push(...steps(W, W / Math.max(2, Math.round(W / 14))));
    if (D > 36) h.push(r1_(D / 2));
  } else if (kind === "grid") {
    const c = Math.max(1, Math.min(8, +o.cols || 3)), rr = Math.max(1, Math.min(8, +o.rows || 2));
    for (let i = 1; i < c; i++) v.push(r1_((W * i) / c));
    for (let i = 1; i < rr; i++) h.push(r1_((D * i) / rr));
  }
  return { v, h };
}
/** the drawers of a kitchen unit with their inside sizes (cm), bottom drawer first */
function unitDrawers(u, r) {
  const p = r.params || {};
  const clr = +p.drawer_box_side_clearance || 1.2, bt = +p.drawer_box_panel_thickness || 1.2;
  const D = Math.max(10, (+p.drawer_box_depth || 45) - 2 * bt);
  const out = [];
  for (const m of r.meshes || []) {
    const mm = /درج (\d+)$/.exec(m.name);
    if (!mm || !(m.drawer || m.layer === "Kitchen - Front")) continue;
    const i = +mm[1];
    if (out.some((x) => x.i === i)) continue;
    out.push({ i, W: r1_(m.box.x1 - m.box.x0 - 2 * (clr + bt)), D: r1_(D), H: r1_(m.box.z1 - m.box.z0) });
  }
  return out.sort((a, b) => a.i - b.i);
}
function insertSvg(W, D, v, h) {
  const s = 120 / Math.max(W, D), w = W * s, d = D * s;
  return `<svg class="insv" viewBox="-2 -2 ${w + 4} ${d + 4}" width="${w + 4}" height="${d + 4}" aria-hidden="true"><rect x="0" y="0" width="${w}" height="${d}" rx="2" class="ib"/>
    ${v.map((x) => `<line x1="${x * s}" y1="0" x2="${x * s}" y2="${d}"/>`).join("")}${h.map((y) => `<line x1="0" y1="${d - y * s}" x2="${w}" y2="${d - y * s}"/>`).join("")}</svg>`;
}
// 2) pull-out fittings and corner systems: hardware the workshop buys (it goes into the hardware list and
//    the price) and a picture inside the unit.
const ORGS = {
  oil: { label: "ترولي زيت وتوابل (سحب كامل)", fit: (p) => (!p.unit_type || p.unit_type === "base") && +p.width <= 45 && (p.unit_category || "standard") === "standard", set: { door_type: "drawers", drawer_count: 1, include_drawer_boxes: false, include_shelves: false }, hw: { "ترولي زيت 3 أدوار + مجرى فتح كامل": 1 }, levels: 3, bottles: true },
  cargo: { label: "عمود ترولي طويل (كارجو / تاندم)", fit: (p) => p.unit_type === "tall" && (p.unit_category || "standard") === "standard" && +p.width <= 60, set: { door_type: "drawers", drawer_count: 1, include_drawer_boxes: false, include_shelves: false }, hw: { "طقم ترولي طويل 5 سلات (تاندم)": 1 }, levels: 5 },
  baskets: { label: "سلال سحب داخلية (2)", fit: (p) => (!p.unit_type || p.unit_type === "base") && (p.unit_category || "standard") === "standard" && +p.width >= 40 && !String(p.door_type).includes("drawer"), set: { include_shelves: false }, hw: { "سلة سحب داخلية ستانلس": 2 }, levels: 2, inner: true },
  bin: { label: "سلة زبالة سحب (صندوقين)", fit: (p) => (!p.unit_type || p.unit_type === "base") && +p.width >= 40, set: {}, hw: { "سلة زبالة سحب — صندوقين": 1 }, bins: 2 },
  binsort: { label: "فرز زبالة (3 صناديق)", fit: (p) => (!p.unit_type || p.unit_type === "base") && +p.width >= 60, set: {}, hw: { "سلة فرز زبالة — 3 صناديق": 1 }, bins: 3 },
  magic: { label: "ماجيك كورنر", fit: (p) => p.unit_category === "corner" && (p.corner_style || "blind") === "blind", set: {}, hw: { "ماجيك كورنر 4 سلات": 1 }, corner: "magic" },
  lemans: { label: "لي مانز (رفين كلية بيلفّوا)", fit: (p) => p.unit_category === "corner" && (p.corner_style || "blind") === "blind", set: {}, hw: { "لي مانز — رفين": 1 }, corner: "lemans" },
  carousel: { label: "كاروسيل دوّار 3/4", fit: (p) => p.unit_category === "corner" && p.corner_style === "l_shape", set: {}, hw: { "كاروسيل دوّار 3/4 — دورين": 1 }, corner: "carousel" },
  plates: { label: "مصفاة أطباق وكوبايات ستانلس", fit: (p) => p.unit_type === "wall" && +p.width >= 50, set: { include_shelves: false }, hw: { "مصفاة أطباق ستانلس دورين": 1 }, rack: true },
  lift: { label: "رف طالع ونازل (ليفت)", fit: (p) => p.unit_type === "wall" && +p.width >= 60, set: { include_shelves: false }, hw: { "ميكانيزم رف ليفت للعلوي": 1 }, levels: 2, inner: true },
};
/** what a trolley level holds (bottom level first) — the picture and the hardware text follow it */
const TROLLEY_ROWS = {
  oil: { label: "🫒 زيت وخل", h: 28, r: 3.1, gap: 7.5 }, bottles: { label: "🍾 زجاجات كبيرة", h: 32, r: 4, gap: 9.5 },
  spice: { label: "🧂 برطمانات توابل", h: 10, r: 2.4, gap: 5.8 }, cans: { label: "🥫 علب وكانز", h: 12, r: 3.6, gap: 8 },
  cloth: { label: "🧽 منظفات وفوط", h: 22, r: 3.6, gap: 9 }, empty: { label: "فاضي", h: 0 },
};
const TROLLEY_DEF = { oil: { levels: 3, rows: ["bottles", "oil", "spice"], div: [0, 1, 1] }, cargo: { levels: 5, rows: ["bottles", "cans", "cans", "spice", "spice"], div: [0, 0, 1, 1, 1] } };
function trolleyOpts(u) {
  const d = TROLLEY_DEF[u.org];
  if (!d) return null;
  const o = u.orgOpts || {}, n = Math.max(2, Math.min(u.org === "oil" ? 4 : 6, +o.levels || d.levels));
  const rows = Array.from({ length: n }, (_, i) => (TROLLEY_ROWS[o.rows?.[i]] ? o.rows[i] : d.rows[Math.min(i, d.rows.length - 1)]));
  const div = Array.from({ length: n }, (_, i) => Math.max(0, Math.min(3, Math.round(o.div?.[i] ?? d.div[Math.min(i, d.div.length - 1)] ?? 0))));
  return { levels: n, rows, div };
}
function orgHardware(u) {
  const t = trolleyOpts(u), o = ORGS[u.org];
  if (!o) return null;
  if (!t) return o.hw;
  const w = Math.round(+u.params?.width || 0); // (not R(u): this runs while R builds the unit)
  const what = [...new Set(t.rows.filter((k) => k !== "empty").map((k) => TROLLEY_ROWS[k].label.replace(/^\S+\s/, "")))].join(" / ");
  return { [`${u.org === "oil" ? "ترولي زيت" : "ترولي طويل (كارجو)"} ${w} سم — ${t.levels} أدوار (${what}) + مجرى فتح كامل`]: 1, ...(t.div.some((x) => x) ? { "فواصل ترولي ستانلس": t.div.reduce((a, b) => a + b, 0) } : {}) };
}
function organizerField(u, r) {
  const p = r.params || {};
  let h = `<details open class="appbox orgbox"><summary>🧩 التقسيمات الداخلية</summary>`;
  const drs = unitDrawers(u, r);
  if (drs.length && !ORGS[u.org]?.set?.drawer_count) {
    h += `<p class="hint">لكل درج: اختار التقسيمة والفواصل بتتحسب على مقاس الدرج من جوه، وبتنزل في الكت ليست والملصقات وفي البلجن.</p>`;
    for (const d of drs) {
      const cur = u.inserts?.[d.i] || (p[`drawer_insert_${d.i}`] && p[`drawer_insert_${d.i}`] !== "none" ? "eng" : "none");
      const lay = cur !== "none" && cur !== "eng" ? insertLayout(cur, d.W, d.D, u.insertOpts?.[d.i]) : { v: [], h: [] };
      h += `<div class="drw"><div class="drwh"><b>درج ${d.i}${d.i === 1 ? " (تحت)" : d.i === drs.length ? " (فوق)" : ""}</b><small>من جوه ${n1(d.W)}×${n1(d.D)} · ارتفاع الوش ${n1(d.H)}</small></div>
        <div class="drwb">${insertSvg(d.W, d.D, lay.v, lay.h)}<div class="inschips">${Object.entries(INSERTS).map(([k, x]) => `<button class="chip ${cur === k ? "on" : ""}" data-ins="${d.i}|${k}">${x.icon} ${esc(x.label)}</button>`).join("")}</div></div>
        ${cur === "grid" ? `<div class="grid2"><label class="f"><span>عدد الخانات بالعرض</span><input type="text" inputmode="decimal" data-numf min="1" max="8" data-insc="${d.i}" value="${u.insertOpts?.[d.i]?.cols || 3}"></label><label class="f"><span>بالعمق</span><input type="text" inputmode="decimal" data-numf min="1" max="8" data-insr="${d.i}" value="${u.insertOpts?.[d.i]?.rows || 2}"></label></div>` : ""}</div>`;
    }
  } else if (!drs.length && !ORGS[u.org]) h += `<p class="hint">الوحدة دي ملهاش أدراج. خلّي "الضلف" أدراج عشان تقسّمها، أو اختار منظّم سحب تحت.</p>`;
  const fits = Object.entries(ORGS).filter(([, o]) => o.fit(p));
  if (fits.length || u.org) {
    h += `<h4>ترولي ومنظمات سحب</h4><div class="inschips"><button class="chip ${!u.org ? "on" : ""}" data-org="">من غير</button>${fits.map(([k, o]) => `<button class="chip ${u.org === k ? "on" : ""}" data-org="${k}">${esc(o.label)}</button>`).join("")}</div>`;
    const T = trolleyOpts(u);
    if (T) {
      h += `<h4>تقسيمة الترولي</h4><div class="grid2"><label class="f"><span>عدد الأدوار</span><select data-tlev>${Array.from({ length: (u.org === "oil" ? 4 : 6) - 1 }, (_, i) => i + 2).map((n) => `<option value="${n}" ${n === T.levels ? "selected" : ""}>${n} أدوار</option>`).join("")}</select></label></div>`;
      for (let i = T.levels - 1; i >= 0; i--) {
        h += `<div class="drw"><div class="drwh"><b>الدور ${i + 1}${i === 0 ? " (تحت)" : i === T.levels - 1 ? " (فوق)" : ""}</b><small>فواصل: ${[0, 1, 2, 3].map((k) => `<button class="chip ${T.div[i] === k ? "on" : ""}" data-tdiv="${i}|${k}">${k ? k + 1 + " خانات" : "من غير"}</button>`).join("")}</small></div>
          <div class="inschips">${Object.entries(TROLLEY_ROWS).map(([k, x]) => `<button class="chip ${T.rows[i] === k ? "on" : ""}" data-trow="${i}|${k}">${esc(x.label)}</button>`).join("")}</div></div>`;
      }
      h += `<p class="hint">الترولي بيتشترى جاهز — التقسيمة دي بتظهر في الـ3D وبتتكتب في طلب الهاردوير عشان المورّد يجيب المقاس والأدوار الصح. الوحدة نفسها بتبقى وش واحد بيسحب الترولي كله.</p>`;
    }
    if (u.org && ORGS[u.org]) h += `<p class="hint">اتضاف للهاردوير: ${Object.entries(orgHardware(u) || {}).map(([k, q]) => `${esc(k)} × ${q}`).join("، ")}. حط سعره في الورشة والعميل.</p>`;
  }
  return h + `</details>`;
}
function applyInsert(u, i, kind) {
  u.inserts ??= {};
  if (kind === "none") delete u.inserts[i]; else u.inserts[i] = kind;
  const r = R(u), d = unitDrawers(u, r).find((x) => x.i === i);
  setParams(u, (p) => {
    if (kind === "none" || !d) { p[`drawer_insert_${i}`] = "none"; p[`drawer_insert_v_${i}`] = ""; p[`drawer_insert_h_${i}`] = ""; return; }
    p.include_drawer_boxes = true;
    const { v, h } = insertLayout(kind, d.W, d.D, u.insertOpts?.[i]);
    p[`drawer_insert_${i}`] = "custom";
    p[`drawer_insert_v_${i}`] = v.join(",");
    p[`drawer_insert_h_${i}`] = h.join(",");
    const hts = Object.values(u.inserts).map((k) => INSERTS[k]?.ht || 5);
    p.drawer_insert_height = Math.max(4, ...hts);
  });
}
function applyOrg(u, key) {
  const o = ORGS[key];
  u.org = o ? key : null;
  if (o && Object.keys(o.set).length) setParams(u, (p) => Object.assign(p, o.set)); else { save(); render(); }
}
/** pictures of the pull-out fittings inside a kitchen unit */
function organizerMeshes(THREE, u, r, view_, g) {
  const o = ORGS[u.org];
  if (!o) return;
  const ms = r.meshes;
  const sides = ms.filter((m) => /^جنب/.test(m.name) && m.box.z1 - m.box.z0 > 20);
  const W0 = Math.min(...ms.map((m) => m.box.x0)), W1 = Math.max(...ms.map((m) => m.box.x1));
  const mid = (W0 + W1) / 2;
  const x0 = Math.max(W0, ...sides.filter((m) => (m.box.x0 + m.box.x1) / 2 < mid).map((m) => m.box.x1)) + 1.5;
  const x1 = Math.min(W1, ...sides.filter((m) => (m.box.x0 + m.box.x1) / 2 >= mid).map((m) => m.box.x0)) - 1.5;
  const base = ms.find((m) => /^قاعدة/.test(m.name)), top = ms.find((m) => /^رأس/.test(m.name));
  const z0 = (base ? base.box.z1 : Math.min(...sides.map((m) => m.box.z0))) + 2, z1 = (top ? top.box.z0 : Math.max(...sides.map((m) => m.box.z1))) - 3;
  const y0 = 4, y1 = Math.max(...ms.filter((m) => m.mat === "back").map((m) => m.box.y0), 40) - 3;
  const drawerFront = ms.find((m) => /درج 1$/.test(m.name) && m.mover != null);
  const host = o.set.drawer_count && drawerFront ? view_.moverGroup(g, r, drawerFront.mover) : g;
  const chrome = apMat(THREE, "chrome"), dark = apMat(THREE, "dark");
  const add = (geo, mat, x, y, z, rot) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, z, -y); if (rot) m.rotation.set(...rot); m.castShadow = !!state.render; m.userData.pname = "منظّم"; m.userData.appl = true; host.add(m); return m; };
  const rod = (len, x, y, z, axis) => add(new THREE.CylinderGeometry(0.35, 0.35, len, 8), chrome, x, y, z, axis === "x" ? [0, 0, Math.PI / 2] : axis === "y" ? [Math.PI / 2, 0, 0] : null);
  const basket = (bx0, bx1, by0, by1, bz, hh) => {
    add(new THREE.BoxGeometry(bx1 - bx0, 0.4, by1 - by0), dark, (bx0 + bx1) / 2, (by0 + by1) / 2, bz);
    for (const zz of [bz + hh * 0.5, bz + hh]) {
      rod(bx1 - bx0, (bx0 + bx1) / 2, by0, zz, "x"); rod(bx1 - bx0, (bx0 + bx1) / 2, by1, zz, "x");
      rod(by1 - by0, bx0, (by0 + by1) / 2, zz, "y"); rod(by1 - by0, bx1, (by0 + by1) / 2, zz, "y");
    }
    for (const [xx, yy] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) rod(hh, xx, yy, bz + hh / 2, "z");
  };
  const T = trolleyOpts(u);
  if (T) {
    const n = T.levels, span = (z1 - z0) / n;
    for (let i = 0; i < n; i++) {
      const bz = z0 + i * span + 1, hh = Math.min(12, span * 0.45), row = TROLLEY_ROWS[T.rows[i]];
      basket(x0, x1, y0, y1, bz, hh);
      const nd = T.div[i], cw = (x1 - x0) / (nd + 1);
      for (let k = 1; k <= nd; k++) { const xx = x0 + k * cw; rod(y1 - y0, xx, (y0 + y1) / 2, bz + hh * 0.6, "y"); rod(hh * 0.6, xx, y0, bz + hh * 0.3, "z"); rod(hh * 0.6, xx, y1, bz + hh * 0.3, "z"); }
      if (!row.h) continue;
      const COLORS = T.rows[i] === "spice" ? [0xb5651d, 0xc23b22, 0x7a8b3a, 0xd9a520] : T.rows[i] === "cans" ? [0xb8bcc0, 0xc23b22, 0x2f6f9f] : T.rows[i] === "cloth" ? [0x3a7bd5, 0x2fa36b, 0xf2c94c] : [0x6b7f2a, 0x8a5a1c, 0x2d4f2f, 0xb88a2a];
      const bh = Math.min(span * 0.8, row.h), rr = row.r;
      for (let c = 0; c <= nd; c++) {
        const cx0 = x0 + c * cw + rr + 0.6, cx1 = x0 + (c + 1) * cw - rr - 0.6;
        const cols = Math.max(1, Math.floor((cx1 - cx0) / row.gap) + 1), rows = Math.max(1, Math.floor((y1 - y0 - 2 * rr - 2) / row.gap) + 1);
        for (let a = 0; a < cols; a++) for (let b2 = 0; b2 < Math.min(rows, 6); b2++) {
          const mat = new THREE.MeshPhysicalMaterial({ color: COLORS[(a + b2 + i) % COLORS.length], roughness: 0.2, ...(T.rows[i] === "oil" || T.rows[i] === "bottles" ? { transmission: 0.3, thickness: 1 } : { metalness: T.rows[i] === "cans" ? 0.6 : 0 }) });
          add(new THREE.CylinderGeometry(rr, rr, bh, 14), mat, cols > 1 ? cx0 + a * ((cx1 - cx0) / (cols - 1)) : (cx0 + cx1) / 2, y0 + rr + 1 + b2 * row.gap, bz + bh / 2 + 0.4);
        }
      }
    }
  } else if (o.levels) {
    const n = o.levels, span = (z1 - z0) / n;
    for (let i = 0; i < n; i++) {
      const bz = z0 + i * span + 1, hh = Math.min(12, span * 0.45);
      basket(x0, x1, y0 + (o.inner ? 2 : 0), y1, bz, hh);
      if (o.bottles) {
        const cols = Math.max(1, Math.floor((x1 - x0) / 7)), rows = Math.max(1, Math.floor((y1 - y0) / 9));
        const COLORS = [0x6b7f2a, 0x8a5a1c, 0x2d4f2f, 0xb88a2a];
        for (let a = 0; a < cols; a++) for (let b = 0; b < Math.min(rows, 4); b++) {
          const bh = Math.min(span * 0.8, 26 - i * 4), rr = 2.6;
          const mat = new THREE.MeshPhysicalMaterial({ color: COLORS[(a + b + i) % 4], roughness: 0.15, transmission: 0.3, thickness: 1 });
          add(new THREE.CylinderGeometry(rr, rr, bh, 14), mat, x0 + 3.5 + a * ((x1 - x0 - 7) / Math.max(1, cols - 1) || 0), y0 + 5 + b * 9, bz + bh / 2 + 0.4);
        }
      }
    }
  }
  if (o.bins) {
    const n = o.bins, w = (x1 - x0 - (n - 1) * 1) / n;
    for (let i = 0; i < n; i++) add(new THREE.BoxGeometry(w, 30, y1 - y0 - 6), new THREE.MeshStandardMaterial({ color: [0x5a5f63, 0x3f6f4a, 0x2f5f8a][i % 3], roughness: 0.6 }), x0 + w / 2 + i * (w + 1), (y0 + y1) / 2, z0 + 15);
  }
  if (o.rack) {
    for (const [zz, ny] of [[z0 + 6, 0.55], [z0 + (z1 - z0) * 0.55, 0.45]]) {
      const yb = y0 + (y1 - y0) * ny;
      for (let x = x0 + 2; x < x1 - 1; x += 2.5) rod(14, x, yb, zz + 7, "z");
      rod(x1 - x0, (x0 + x1) / 2, yb - 4, zz, "x"); rod(x1 - x0, (x0 + x1) / 2, yb + 4, zz, "x");
    }
    add(new THREE.BoxGeometry(x1 - x0, 0.5, y1 - y0), dark, (x0 + x1) / 2, (y0 + y1) / 2, z0);
  }
  if (o.corner) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R0 = Math.min(x1 - x0, y1 - y0) * 0.42;
    for (const zz of [z0 + 4, z0 + (z1 - z0) * 0.55]) {
      if (o.corner === "magic") { basket(x0, cx - 1, y0, y1, zz, 9); basket(cx + 1, x1, y0, cy, zz, 9); }
      else {
        const seg = o.corner === "lemans" ? Math.PI * 1.1 : Math.PI * 1.5;
        add(new THREE.CylinderGeometry(R0, R0, 0.8, 32, 1, false, 0, seg), dark, cx, cy, zz);
        add(new THREE.TorusGeometry(R0, 0.4, 6, 32, seg), chrome, cx, cy, zz + 3, [Math.PI / 2, 0, 0]);
      }
    }
    if (o.corner === "carousel") rod(z1 - z0, cx, cy, (z0 + z1) / 2, "z");
  }
}
// ---- appliances drawn in their cavities (pictures only — never in the cut list)
const APM = {};
function apMat(THREE, k) {
  if (APM[k]) return APM[k];
  const S = { steel: [0xc9cbcd, 0.85, 0.3], glass: [0x0d0f10, 0.25, 0.08], white: [0xf1f1ee, 0, 0.45], chrome: [0xe3e6e9, 1, 0.16], dark: [0x2a2c2e, 0.4, 0.5], basin: [0xb9bcbf, 0.9, 0.38] }[k];
  const m = new THREE.MeshStandardMaterial({ color: S[0], metalness: S[1], roughness: S[2] });
  if (k === "glass") m.envMapIntensity = 1.4;
  return (APM[k] = m);
}
/** the appliance pictures for a kitchen unit: cavities are the heights no front covers */
function applianceMeshes(THREE, u, r) {
  const out = [];
  const p = r.params || {}, cat = p.unit_category || "standard";
  const box = (k, x0, x1, y0, y1, z0, z1, name = "جهاز") => {
    if (x1 - x0 < 0.05 || y1 - y0 < 0.05 || z1 - z0 < 0.05) return null;
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, z1 - z0, y1 - y0), apMat(THREE, k));
    m.position.set((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2);
    m.castShadow = m.receiveShadow = !!state.render;
    m.userData.pname = name; m.userData.appl = true;
    out.push(m);
    return m;
  };
  const cyl = (k, r0, len, x, y, z, axis = "x") => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, len, 16), apMat(THREE, k));
    if (axis === "x") m.rotation.z = Math.PI / 2; else if (axis === "y") m.rotation.x = Math.PI / 2;
    m.position.set(x, z, -y);
    m.userData.pname = "جهاز"; m.userData.appl = true;
    out.push(m);
  };
  const ms = r.meshes;
  const W0 = Math.min(...ms.map((m) => m.box.x0)), W1 = Math.max(...ms.map((m) => m.box.x1));
  const D1 = Math.max(...ms.filter((m) => m.mat !== "countertop").map((m) => m.box.y1));
  const label = `${p.unit_label || ""} ${u.name}`;
  // free heights between the fronts → the cavities
  const appl = ["fridge", "oven", "microwave", "washing_machine"].includes(cat);
  if (appl) {
    const sides = ms.filter((m) => /^جنب/.test(m.name));
    const zLo = Math.min(...sides.map((m) => m.box.z0)), zHi = Math.max(...sides.map((m) => m.box.z1));
    const wide = (m) => m.box.x1 - m.box.x0 > (W1 - W0) * 0.5;
    const blocks = ms.filter((m) => wide(m) && (m.layer === "Kitchen - Front" || m.door || m.drawer || /قاعدة|رأس|رف/.test(m.name) && m.box.z1 - m.box.z0 < 4)).map((m) => [m.box.z0, m.box.z1]).sort((a, b) => a[0] - b[0]);
    const gaps = [];
    let z = zLo;
    for (const [a, b] of blocks) { if (a - z >= 25) gaps.push([z, a]); z = Math.max(z, b); }
    if (zHi - z >= 25) gaps.push([z, zHi]);
    const xIn = (z0, z1) => {
      const mid = (W0 + W1) / 2, sd = sides.filter((m) => m.box.z0 < z1 - 1 && m.box.z1 > z0 + 1);
      const L = Math.max(W0, ...sd.filter((m) => (m.box.x0 + m.box.x1) / 2 < mid).map((m) => m.box.x1));
      const R_ = Math.min(W1, ...sd.filter((m) => (m.box.x0 + m.box.x1) / 2 >= mid).map((m) => m.box.x0));
      return [L, R_];
    };
    const kinds = cat === "oven" ? (p.include_microwave ? ["oven", "microwave"] : ["oven"]) : cat === "microwave" ? ["microwave"] : cat === "fridge" ? ["fridge"] : ["washer"];
    const used = cat === "fridge" ? [gaps.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a), gaps[0])].filter(Boolean) : gaps.slice(0, kinds.length);
    used.forEach(([z0, z1], i) => {
      const kind = kinds[i] || kinds[0];
      const [x0, x1] = xIn(z0, z1);
      const a0 = x0 + 0.3, a1 = x1 - 0.3, y0 = 0.4, y1 = Math.min(D1 - 4, 56);
      if (kind === "fridge") {
        const top = z1 - 1.5, split = z0 + (top - z0) * 0.36;
        box("steel", a0, a1, 2, y1, z0 + 1, top, "تلاجة");
        box("steel", a0, a1, -1.5, 2, split + 0.3, top, "تلاجة");
        box("steel", a0, a1, -1.5, 2, z0 + 1, split - 0.3, "تلاجة");
        box("chrome", a1 - 5, a1 - 3.6, -4.5, -1.5, split + 8, split + 58, "تلاجة");
        box("chrome", a1 - 5, a1 - 3.6, -4.5, -1.5, split - 30, split - 5, "تلاجة");
      } else if (kind === "oven" || kind === "microwave") {
        const h = z1 - z0;
        box("steel", a0, a1, y0 + 1, y1, z0 + 0.3, z1 - 0.3, kind === "oven" ? "فرن" : "ميكروويف");
        box("glass", a0, a1, y0, y0 + 1, z0 + 0.3, z1 - Math.min(9, h * 0.22), kind === "oven" ? "فرن" : "ميكروويف");
        box("steel", a0, a1, y0 - 0.2, y0 + 1, z1 - Math.min(9, h * 0.22), z1 - 0.3, "لوحة تحكم");
        box("dark", a0 + (a1 - a0) * 0.42, a0 + (a1 - a0) * 0.58, y0 - 0.4, y0, z1 - Math.min(6.5, h * 0.17), z1 - Math.min(3.5, h * 0.09), "شاشة");
        if (kind === "oven") cyl("chrome", 0.7, (a1 - a0) * 0.78, (a0 + a1) / 2, -2.2, z1 - Math.min(12, h * 0.28));
        else box("chrome", a1 - 5, a1 - 3.8, -2.6, y0, z0 + 3, z1 - 10, "مقبض");
      } else {
        const h = Math.min(z1 - z0 - 1, 85), top = z0 + h;
        box("white", a0 + 1, a1 - 1, y0 + 1, y1, z0 + 0.5, top, "غسالة");
        box("white", a0 + 1, a1 - 1, y0, y0 + 1, z0 + 0.5, top, "غسالة");
        box("dark", a0 + 3, a1 - 3, y0 - 0.3, y0, top - 9, top - 3, "لوحة تحكم");
        const cx = (a0 + a1) / 2, cz = z0 + h * 0.44, rr = Math.min((a1 - a0) * 0.3, h * 0.3);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 2.2, 10, 32), apMat(THREE, "chrome"));
        ring.position.set(cx, cz, 1.2); ring.userData.pname = "غسالة"; ring.userData.appl = true; out.push(ring);
        const gl = new THREE.Mesh(new THREE.CircleGeometry(rr - 1, 32), apMat(THREE, "glass"));
        gl.position.set(cx, cz, 1.1); gl.userData.pname = "غسالة"; gl.userData.appl = true; out.push(gl);
      }
    });
  }
  // on the counter: a hob on the hob unit, a basin and a tap in the sink cut-out
  const ct = ms.filter((m) => m.mat === "countertop");
  if (ct.length) {
    const top = Math.max(...ct.map((m) => m.box.z1));
    if (p.include_sink_cutout && ct.length >= 3) {
      const fr = ct.find((m) => /أمامي/.test(m.name)), bk = ct.find((m) => /خلفي/.test(m.name)), lf = ct.find((m) => /شمال/.test(m.name)), rt = ct.find((m) => /يمين/.test(m.name));
      if (fr && bk && lf && rt) {
        const x0 = lf.box.x1, x1 = rt.box.x0, y0 = fr.box.y1, y1 = bk.box.y0, dz = 18;
        box("basin", x0, x1, y0, y1, top - dz, top - dz + 0.8, "حوض");
        box("basin", x0, x0 + 0.8, y0, y1, top - dz, top, "حوض"); box("basin", x1 - 0.8, x1, y0, y1, top - dz, top, "حوض");
        box("basin", x0, x1, y0, y0 + 0.8, top - dz, top, "حوض"); box("basin", x0, x1, y1 - 0.8, y1, top - dz, top, "حوض");
        box("basin", x0 - 1.5, x1 + 1.5, y0 - 1.5, y1 + 1.5, top, top + 0.3, "حوض");
        const tx = (x0 + x1) / 2, ty = y1 + 5;
        cyl("chrome", 1.6, 28, tx, ty, top + 14, "z");
        cyl("chrome", 1.1, 20, tx, ty - 9, top + 27, "y");
      }
    } else if (/بوتجاز|مسطح|hob/i.test(label)) {
      const x0 = W0 + 5, x1 = W1 - 5, y0 = 6, y1 = Math.min(54, D1 - 4);
      box("glass", x0, x1, y0, y1, top, top + 0.6, "بوتجاز");
      const n = x1 - x0 > 75 ? 5 : 4;
      const pts = n === 5 ? [[0.2, 0.3], [0.2, 0.75], [0.5, 0.5], [0.8, 0.3], [0.8, 0.75]] : [[0.27, 0.3], [0.27, 0.72], [0.73, 0.3], [0.73, 0.72]];
      for (const [fx, fy] of pts) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(n === 5 && fx === 0.5 ? 6 : 4.5, 0.7, 8, 24), apMat(THREE, "dark"));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x0 + (x1 - x0) * fx, top + 0.9, -(y0 + (y1 - y0) * fy));
        ring.userData.pname = "بوتجاز"; ring.userData.appl = true;
        out.push(ring);
      }
    }
  }
  // a hood under the wall unit over the hob
  if (p.unit_type === "wall" && /شفاط/.test(label)) {
    const z0 = Math.min(...ms.map((m) => m.box.z0));
    box("steel", W0 + 3, W1 - 3, 0, Math.min(32, D1), z0 - 7, z0, "شفاط");
    box("dark", W0 + 6, W1 - 6, 3, Math.min(29, D1 - 3), z0 - 7.4, z0 - 7, "شفاط");
  }
  return out;
}
// a label lying on each free piece in 3D: a coloured frame per row + name + size, so they read from above
const ROW_TINTS = ["#1f6e3d", "#b07c12", "#2f5f8a", "#8e3b3b", "#6a4c93", "#3d7f7a", "#a4733f", "#5d6670"];
function pieceTag(THREE, pt, ucode) {
  const L = pt.box.x1 - pt.box.x0, W = pt.box.y1 - pt.box.y0;
  const k = 6, cw = Math.max(64, Math.min(1024, Math.round(L * k))), ch = Math.max(48, Math.min(1024, Math.round(W * k)));
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const g = c.getContext("2d"), tint = ROW_TINTS[(pt.row || 0) % ROW_TINTS.length];
  g.fillStyle = tint; g.globalAlpha = 0.16; g.fillRect(0, 0, cw, ch);
  g.globalAlpha = 1; g.strokeStyle = tint; g.lineWidth = Math.max(3, Math.min(cw, ch) * 0.04); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, cw - g.lineWidth, ch - g.lineWidth);
  const dims = `${n1(pt.label.w)}×${n1(pt.label.h)}`;
  let fs = Math.min(ch / 3.6, cw / (Math.max(dims.length, 6) * 0.6));
  g.fillStyle = "#14201a"; g.textAlign = "center"; g.textBaseline = "middle"; g.direction = "rtl";
  g.font = `700 ${fs}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
  let nm = I18n.tr(pt.name);
  if (I18n.isEn()) g.direction = "ltr";
  const fit = (cw * 0.9) / Math.max(1, g.measureText(nm).width);
  if (fit < 1) { const f2 = Math.max(fs * 0.6, fs * fit); g.font = `700 ${f2}px "IBM Plex Sans Arabic", system-ui, sans-serif`; }
  while (nm.length > 3 && g.measureText(nm).width > cw * 0.9) nm = nm.slice(0, -2) + "…";
  g.fillText(nm, cw / 2, ch / 2 - fs * 0.6);
  g.font = `500 ${fs * 0.9}px system-ui, sans-serif`; g.direction = "ltr";
  g.fillText(dims, cw / 2, ch / 2 + fs * 0.65);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set((pt.box.x0 + pt.box.x1) / 2, pt.box.z1 + 0.06, -(pt.box.y0 + pt.box.y1) / 2);
  m.userData.pname = pt.name;
  m.userData.tag = true;
  return m;
}
/** the rounded-edge (chamfer) size for a board whose thinnest side is `thin` cm, in render mode */
function bevelFor(thin) {
  if (!state.render || !view.RBox || thin < 0.5) return null;
  const mm = +(state.scene?.bevel ?? Render.SCENE_DEF.bevel);
  if (!(mm > 0)) return null;
  const r = Math.min(mm / 10, thin * 0.45);
  return { r, seg: r >= 0.4 ? 4 : r > 0.2 ? 3 : 2 };
}
/** relief from the material's own picture (wood grain, stone, weave) as a normal map */
function addRelief(THREE, m, tex, rel) {
  if (!(rel > 0) || !tex) return;
  const n = Mat.normalFor(THREE, tex);
  if (!n) return;
  m.normalMap = n;
  m.normalScale = new THREE.Vector2(1, 1).multiplyScalar((rel / 100) * 1.6);
  m.needsUpdate = true;
}
addEventListener("novera-tex", () => { if (!state.render) return; clearTimeout(ui.texT); ui.texT = setTimeout(() => view.update(), 300); });
function applyLib(lib) {
  const key = ui.matPick;
  const first = selUnit();
  ui.pop = null;
  renderPop();
  if (!first) return;
  if (lib && Mat.isCustom(lib)) { const m = Mat.get(lib); if (m) state.project.mats = [...(state.project.mats || []).filter((x) => x.id !== lib), m]; }
  for (const u of targetUnits().filter((x) => x.kind === first.kind)) applyLibTo(u, key, lib);
}
function applyLibTo(u, key, lib) {
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
// ---- the settings panel: "basic" shows only what most units need, search finds any field
const BASIC_SECTIONS = ["✏️ ورشة الرسم", "درج الوزرة", "الحيطة الجاية بالمقاس", "الرسم بالقلم", "الأبواب والشبابيك", "المكان", "المقاسات", "المقاسات والنظام", "الوحدة", "الواجهة", "من جوه", "الخامات", "الأقسام (من الشمال لليمين)", "الواجهة (من تحت لفوق)", "الألواح", "اللون والتشطيب", "🧩 التقسيمات الداخلية", "الأوضة", "كل الحيطان"];
const normAr = (t) => String(t || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ًٌٍَُِّْـ]/g, "");
function propsMode(el) {
  if (!el || !selUnit() || el.querySelector(".emptyp")) return;
  const adv = !!state.propsAdv;
  const bar = document.createElement("div");
  bar.className = "propsbar";
  bar.innerHTML = `<input id="propQ" type="search" placeholder="🔍 دوّر في الإعدادات: مفصلة، سكلو، ليد…" aria-label="دوّر في الإعدادات" value="${esc(ui.propQ || "")}">
    <div class="seg"><button data-padv="0" class="${adv ? "" : "on"}">أساسي</button><button data-padv="1" class="${adv ? "on" : ""}">كل الإعدادات</button></div>`;
  const head = el.querySelector(".stats") || el.querySelector(".tplname");
  (head ? head.after(bar) : el.prepend(bar));
  const top = [...el.children].filter((x) => x.tagName === "DETAILS");
  let hidden = 0;
  for (const d of top) {
    const t = d.querySelector(":scope > summary")?.textContent.trim() || "";
    const basic = BASIC_SECTIONS.some((k) => t === k || t.startsWith(k + " ") || t.startsWith("إعدادات "));
    d.dataset.basic = basic ? "1" : "0";
    if (!adv && !basic) { d.classList.add("advhid"); hidden++; }
  }
  if (!adv && hidden) {
    const more = document.createElement("button");
    more.className = "add advmore"; more.dataset.padv = "1";
    more.textContent = `⚙ كل الإعدادات (${hidden} قسم كمان: الكبب، الأليتا، الليد، الأورزة، خلع العمود، رسم القطع…)`;
    el.append(more);
  }
  filterProps(el);
}
function filterProps(el = $("#props")) {
  const q = normAr(ui.propQ || "").trim();
  // loose Arabic match: "مفصلة" finds "المفصلات", "درج" finds "الأدراج"
  const words = q.split(/\s+/).filter(Boolean).map((w) => (w.length > 3 ? w.replace(/^ال/, "").replace(/(ه|ات|ين|ون)$/, "") : w)).map((w) => (w === "درج" ? "در" : w));
  const fields = el.querySelectorAll("label.f, .bools > label, .bools > .b, .zone-ed, .btnrow, .mrow");
  el.classList.toggle("searching", !!words.length);
  let found = 0;
  for (const f of fields) {
    const hit = !words.length || words.every((w) => normAr(f.textContent).includes(w));
    f.classList.toggle("qhid", !hit);
    if (hit && words.length) found++;
  }
  for (const d of el.querySelectorAll("details")) {
    const sumHit = words.length && words.every((w) => normAr(d.querySelector(":scope > summary")?.textContent).includes(w));
    if (sumHit) d.querySelectorAll(".qhid").forEach((x) => x.classList.remove("qhid"));
    const any = !words.length || sumHit || [...d.querySelectorAll("label.f, .bools > label, .bools > .b, .zone-ed, .btnrow, .mrow")].some((x) => !x.classList.contains("qhid"));
    d.classList.toggle("qhid", !any);
    if (words.length && any) { if (!d.dataset.wasOpen) d.dataset.wasOpen = d.open ? "1" : "0"; d.open = true; }
    else if (!words.length && d.dataset.wasOpen) { d.open = d.dataset.wasOpen === "1"; delete d.dataset.wasOpen; }
  }
  let none = el.querySelector(".qnone");
  if (words.length && !found && ![...el.querySelectorAll("details")].some((d) => !d.classList.contains("qhid"))) {
    if (!none) { none = document.createElement("p"); none.className = "hint qnone"; el.querySelector(".propsbar")?.after(none); }
    none.textContent = "مفيش إعداد بالاسم ده للوحدة دي.";
  } else none?.remove();
}
// ---- direct editing in 3D: the selected unit's sizes float next to it — tap one to type a new value,
// or drag the round handle on its side to make it wider / narrower
const dimTags = {
  el: null, drag: null,
  dims(u, r) {
    const p = r.params || {};
    if (u.kind === "kitchen") return KU.dimsFor(p).slice(0, 3);
    if (u.kind === "pieces" || p.template === "free") return [];
    return [["width", "العرض"], ["height", "الارتفاع"], ["depth", "العمق"]];
  },
  target() {
    const u = selUnit();
    if (!u || ui.mode !== "owner" || state.tab !== "design" || ui.planOn || ui.asm || ui.xdraw || ui.xmove || view.final?.active || document.body.classList.contains("fs")) return null;
    const r = R(u);
    if (!r.ok) return null;
    const d = this.dims(u, r);
    if (d.length < 3) return null;
    const g = (view.pickables || []).find((o) => o.userData.unitId === u.id);
    return g ? { u, r, d, g } : null;
  },
  place(v) {
    const host = v.host;
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "dimtags";
      host.appendChild(this.el);
      this.el.addEventListener("pointerdown", (e) => this.down(e));
      this.el.addEventListener("click", (e) => this.click(e));
    }
    if (this.editing) return;
    const t = this.target();
    if (!t) { this.el.innerHTML = ""; this.cur = null; return; }
    const { u, r, d, g } = t;
    const T = v.three, b = localBox(r);
    const bs = r.meshes ? r.meshes.map((m) => m.box) : r.parts.filter((x) => x.box).map((x) => x.box);
    const z0 = Math.min(...bs.map((x) => x.z0)), z1 = Math.max(...bs.map((x) => x.z1));
    const rc = v.ren.domElement.getBoundingClientRect(), hr = host.getBoundingClientRect();
    const scr = (x, y, z) => { const q = g.localToWorld(new T.Vector3(x, z, -y)).project(v.cam); return q.z > 1 ? null : [rc.left - hr.left + (q.x + 1) / 2 * rc.width, rc.top - hr.top + (1 - q.y) / 2 * rc.height]; };
    const xm = (b.x0 + b.x1) / 2, ym = (b.y0 + b.y1) / 2, zm = (z0 + z1) / 2;
    const pts = [scr(xm, b.y0, z1 + 4), scr(b.x0 - 5, b.y0, zm), scr(b.x1 + 3, ym, z1 + 2)];
    const hd = scr(b.x1, b.y0, zm), hd0 = scr(b.x0, b.y0, zm);
    const p = r.params || {};
    const key = JSON.stringify([u.id, pts.map((x) => x && x.map(Math.round)), d.map(([k]) => p[k])]);
    if (key === this.cur) return;
    this.cur = key;
    this.t = { u, d, hd, hd0 };
    let h = "";
    d.forEach(([k, l], i) => { const q = pts[i]; if (q) h += `<button class="dtag" data-dk="${k}" style="left:${q[0]}px;top:${q[1]}px" title="${esc(l)} — دوس عشان تغيّره">${esc(n1(+p[k] || 0))}<small>${esc(l)}</small></button>`; });
    if (hd && hd0 && Math.hypot(hd[0] - hd0[0], hd[1] - hd0[1]) > 40) h += `<span class="dhandle" style="left:${hd[0]}px;top:${hd[1]}px" title="اسحب عشان تغيّر ${esc(d[0][1])}">⇔</span>`;
    this.el.innerHTML = h;
  },
  click(e) {
    const b = e.target.closest(".dtag");
    if (!b || !this.t) return;
    const k = b.dataset.dk, u = this.t.u, p = R(u).params;
    this.editing = true;
    b.innerHTML = `<input type="text" inputmode="${Keypad.active() ? "none" : "decimal"}" data-keypad data-kpsolo value="${n1(+p[k] || 0)}" aria-label="${esc(b.title)}">`;
    const inp = b.querySelector("input");
    inp.focus(); inp.select();
    const done = (ok) => {
      if (!this.editing) return;
      this.editing = false; this.cur = null;
      const v = toNum(inp.value);
      if (ok && v > 0 && v !== +p[k]) setParams(u, (q) => { q[k] = v; });
      else view.dirty = true;
    };
    inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") done(true); if (ev.key === "Escape") done(false); });
    inp.addEventListener("blur", () => done(true));
  },
  down(e) {
    const hdl = e.target.closest(".dhandle");
    if (!hdl || !this.t) return;
    e.preventDefault(); e.stopPropagation();
    const { u, d, hd, hd0 } = this.t, k = d[0][0], p = R(u).params, w0 = +p[k] || 0;
    const L = Math.hypot(hd[0] - hd0[0], hd[1] - hd0[1]), dir = [(hd[0] - hd0[0]) / L, (hd[1] - hd0[1]) / L], ppc = L / Math.max(w0, 1);
    const x0 = e.clientX, y0 = e.clientY;
    view.ctl.enabled = false;
    const tag = this.el.querySelector(`[data-dk="${k}"]`);
    let w = w0;
    const mv = (ev) => {
      w = Math.max(10, Math.round(w0 + ((ev.clientX - x0) * dir[0] + (ev.clientY - y0) * dir[1]) / ppc));
      if (tag) tag.firstChild.textContent = n1(w);
      hdl.style.transform = `translate(calc(-50% + ${(w - w0) * ppc * dir[0]}px), calc(-50% + ${(w - w0) * ppc * dir[1]}px))`;
    };
    const up = () => {
      removeEventListener("pointermove", mv, true); removeEventListener("pointerup", up, true); removeEventListener("pointercancel", up, true);
      view.ctl.enabled = true; this.cur = null;
      if (w !== w0) setParams(u, (q) => { q[k] = w; }); else view.dirty = true;
    };
    addEventListener("pointermove", mv, true); addEventListener("pointerup", up, true); addEventListener("pointercancel", up, true);
  },
};
function mySavePop() {
  const it = ui.myrenId ? state.myUnits.find((x) => x.id === ui.myrenId) : null;
  const u = it ? null : state.project.units.find((x) => x.id === ui.mysaveId);
  const name = it ? it.label : u?.name || "";
  const groups = [...new Set(state.myUnits.map((x) => x.group).filter(Boolean))];
  const same = u ? state.myUnits.find((x) => x.label === u.name) : null;
  return `<div class="popbox" role="dialog" aria-label="${it ? "تعديل" : "حفظ في مكتبتي"}"><div class="libhead"><h2>⭐ ${it ? "تعديل الاسم" : "احفظ في مكتبتي"}</h2><button class="x" data-close aria-label="قفل">×</button></div>
    ${u ? `<p class="hint">هتتحفظ بكل إعداداتها: المقاسات والضلف والأدراج والتقسيمات والخامات. بعد كده تضيفها لأي مشروع من المكتبة ← مكتبتي.</p>` : ""}
    <label class="f"><span>الاسم</span><input id="myName" value="${esc(name)}" placeholder="مثلاً: سفلية حوض 80 — مصنع"></label>
    <label class="f"><span>القسم (اختياري)</span><input id="myGroup" list="myGroups" value="${esc(it?.group || "")}" placeholder="مطابخ عملاء · دواليب · …"><datalist id="myGroups">${groups.map((g) => `<option value="${esc(g)}">`).join("")}</datalist></label>
    <div class="btnrow">${same && !it ? `<button class="ghost2" data-myreplace="${same.id}">حدّث "${esc(same.label)}"</button>` : ""}<button class="primary" data-myok>${it ? "حفظ" : "احفظ"}</button></div></div>`;
}
function renderPop() {
  const pop = $("#pop");
  if (!ui.pop) { pop.hidden = true; return; }
  let h = "";
  if (ui.pop === "mat") {
    const u = selUnit();
    const label = u?.kind === "dressing" ? D.MATERIAL_KEYS[ui.matPick]?.label : u?.kind === "kitchen" ? KU.K_MATS[ui.matPick]?.[0] : PANEL_MATS[ui.matPick];
    h = `<div class="popbox" role="dialog" aria-label="اختار خامة"><div class="libhead"><h2>${esc(label)}</h2><button class="x" data-close aria-label="قفل">×</button></div>`;
    const f = u?.fin?.[ui.matPick];
    const fv = { gloss: 30, metal: 0, refl: 100, coat: 0, ...(f || {}) };
    fv.relief ??= Mat.defaultRelief(u ? R(u).libOf?.(ui.matPick) : null);
    h += `<details class="finbox" ${f ? "open" : ""}><summary>✦ اللمعة والانعكاس${f ? " · متعدّلة" : ""}</summary>
      <div class="finpre">${Object.entries(FIN_PRESETS).map(([k, [l]]) => `<button class="chip" data-finpre="${k}">${l}</button>`).join("")}</div>
      ${[["gloss", "اللمعة", 0, 100], ["refl", "قوة الانعكاس", 0, 200], ["metal", "معدني", 0, 100], ["coat", "ورنيش / لاكيه (طبقة لامعة فوق الخامة)", 0, 100], ["relief", "بروز الملمس (العروق والمسام)", 0, 100]].map(([k, l, a, z]) => `<label class="sl"><span>${l} <b class="num">${fv[k]}${k === "refl" ? "%" : ""}</b></span><input type="range" min="${a}" max="${z}" step="1" data-fin="${k}" value="${fv[k]}"></label>`).join("")}
      <div class="btnrow">${f ? `<button class="ghost2" data-finreset>رجّع الطبيعي</button>` : ""}<button class="ghost2" data-finall>طبّقها على نفس الخامة في كل الوحدات</button></div>
      <p class="hint">بتبان أكتر في "ريندر واقعي" و"الريندر النهائي".</p></details>`;
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
      <p class="hint">${online ? "المشاريع محفوظة أونلاين على حسابك — تفتحها من الآيباد أو الموبايل أو الكمبيوتر." : "المشاريع محفوظة على الجهاز ده (مش متوصل بحساب أونلاين)."}</p>
      <button class="add" data-newproj>${ICON.plus}مشروع جديد</button><div class="plist">`;
    const list = ui.projects?.length ? ui.projects : [{ id: state.project.id, name: state.project.name, updatedAt: "" }];
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
  else if (ui.pop === "look") {
    const L = (state.look ??= { mode: "auto", accent: "green", stage: "" });
    h = `<div class="popbox" role="dialog" aria-label="الألوان والمظهر"><div class="libhead"><h2>الألوان والمظهر</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <h3>الوضع</h3><div class="seg">${[["auto", "تلقائي (زي الجهاز)"], ["light", "فاتح"], ["dark", "غامق"]].map(([k, l]) => `<button data-lmode="${k}" class="${L.mode === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <h3>لون التطبيق</h3><div class="swgrid">${Object.entries(ACCENTS).map(([k, a]) => `<button class="swb ${L.accent === k ? "on" : ""}" data-laccent="${k}"><i style="background:linear-gradient(135deg, ${a[2]} 50%, ${a[1]} 50%)"></i><span>${a[0]}</span></button>`).join("")}</div>
      <h3>خلفية شاشة التصميم</h3><div class="swgrid">${Object.entries(STAGE_BGS).map(([k, l]) => `<button class="swb ${L.stage === k ? "on" : ""}" data-lstage="${k}"><i style="background:${k || "var(--stage)"}"></i><span>${l}</span></button>`).join("")}
        <label class="swb"><i style="background:${L.stage || "#cccccc"}"></i><span>لون تاني</span><input type="color" id="lookColor" value="${L.stage || "#cccccc"}" style="width:100%;height:28px;border:0;background:none"></label></div>
      <p class="hint">الخلفية دي بتبان ورا التصميم في العرض العادي والريندر.</p>
      <div class="btnrow"><button class="primary" data-opendefs>⚙ الإعدادات الافتراضية (الوحدات · التسعير · القص)</button></div>
      <h3>كيبورد الأرقام</h3><div class="seg"><button data-lkpad="on" class="${state.kpad !== false ? "on" : ""}">🔢 كيبورد NOVERA</button><button data-lkpad="off" class="${state.kpad === false ? "on" : ""}">⌨ كيبورد الجهاز</button></div>
      <p class="hint">على الآيباد والموبايل، خانات الأرقام بتفتح لوحة أرقام كبيرة خاصة بالتطبيق (فيها + و− والتالي) بدل كيبورد الجهاز. الكتابة العادية (الأسماء والملاحظات) بتفضل بكيبورد الجهاز.</p></div>`;
  }
  else if (ui.pop === "mkeys") {
    const u = selUnit();
    const keys = u?.kind === "kitchen" ? Object.entries(KU.K_MATS).map(([k, v]) => [k, v[0]]) : u?.kind === "dressing" ? Object.entries(D.MATERIAL_KEYS).map(([k, v]) => [k, v.label]) : Object.entries(PANEL_MATS);
    const n = targetUnits().filter((x) => x.kind === u?.kind).length;
    h = `<div class="popbox" role="dialog" aria-label="خامات الوحدات المختارة"><div class="libhead"><h2>خامات ${n} وحدة</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <p class="hint">اختار الجزء، وبعدين الخامة أو اللمعة — هتتطبّق على كل الوحدات المختارة من نفس النوع.</p>
      <div class="mkeys">${keys.map(([k, l]) => `<button class="mrow" data-mkey="${k}"><b>${esc(l)}</b></button>`).join("")}</div></div>`;
  }
  else if (ui.pop === "align") {
    const u = selUnit(), poses = projectPoses(state.project), Lu = poses.get(u?.id);
    const cu = Lu ? Room.centerOf(Lu, localBox(R(u))) : [0, 0];
    const others = state.project.units.filter((x) => x.id !== u?.id && poses.get(x.id) && R(x).ok)
      .map((x) => { const c = Room.centerOf(poses.get(x.id), localBox(R(x))); return [x, Math.hypot(c[0] - cu[0], c[1] - cu[1])]; })
      .sort((a, b) => a[1] - b[1]).slice(0, 8);
    const n = targetUnits().length;
    h = `<div class="popbox" role="dialog" aria-label="محاذاة"><div class="libhead"><h2>محاذاة ${n > 1 ? `${n} وحدات` : esc(u?.name || "")}</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <p class="hint">اختار الوحدة اللي هتتظبط عليها (مثلاً العلوية على السفلية اللي تحتها). الشمال واليمين وانت باصص على وش الوحدات.</p>
      <div class="alist">${others.map(([x]) => `<div class="arow"><span><span class="ucode">${esc(unitCode(x))}</span>${esc(x.name)}</span>
        <span class="aopts"><button class="chip" data-al="${x.id}" data-am="start">⇤ الشمال</button><button class="chip" data-al="${x.id}" data-am="mid">⇹ السنتر</button><button class="chip" data-al="${x.id}" data-am="end">⇥ اليمين</button></span></div>`).join("") || `<p class="hint">مفيش وحدات تانية في المشروع.</p>`}</div></div>`;
  }
  else if (ui.pop === "mysave") h = mySavePop();
  else if (ui.pop === "variants") h = variantsPop();
  else if (ui.pop === "auto") h = autoPop();
  else if (ui.pop === "about") {
    const D = DEVELOPER;
    const contact = [
      D.phone && `<a class="ghost2" href="tel:${esc(D.phone.replace(/\s/g, ""))}">📞 ${esc(D.phone)}</a>`,
      (D.whatsapp || D.phone) && `<a class="ghost2" href="https://wa.me/${esc((D.whatsapp || D.phone).replace(/[^0-9]/g, "").replace(/^0/, "20"))}" target="_blank" rel="noopener">واتساب</a>`,
      D.email && `<a class="ghost2" href="mailto:${esc(D.email)}">✉ ${esc(D.email)}</a>`,
      D.site && `<a class="ghost2" href="${esc(D.site)}" target="_blank" rel="noopener">${esc(D.site)}</a>`,
    ].filter(Boolean).join("");
    h = `<div class="popbox about" role="dialog" aria-label="عن التطبيق"><div class="libhead"><h2>عن التطبيق</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <div class="abhead"><span class="mark big">N</span><div><b>NOVERA Studio</b><small>الإصدار ${APP_VERSION}${window.NOVERA_BUILD ? ` · تحديث ${window.NOVERA_BUILD}` : ""}</small></div></div>
      <p>تطبيق لتصميم وتصنيع المطابخ والدريسنج وغرف النوم ووحدات الأثاث من الألواح — من أول رسم الأوضة لحد القص والتجميع في الورشة.</p>
      <div class="btnrow"><button class="primary" data-tour>▶ الجولة التعريفية (دقيقة)</button></div>
      <ul class="feat">
        <li>وحدات بمحرّك البلجن نفسه (Kitchen Unit Designer) — نفس القطع والمقاسات اللي في سكتش أب بالظبط.</li>
        <li>رسم الحيطان بالمقاسات أو بالإيد أو من مسح الكاميرا، أبواب وشبابيك، ونقط كهربا وسباكة وغاز.</li>
        <li>عرض 3D وريندر، فتح وقفل الضلف، خامات من الصور.</li>
        <li>خطة قص للألواح، أرقام لكل قطعة وملصقات بباركود، ودليل تجميع خطوة بخطوة.</li>
        <li>تصدير Excel وPDF وDXF وصور، وفتح التصميم في سكتش أب.</li>
        <li>عرض سعر للعميل، ومتابعة الورشة بالـQR.</li>
      </ul>
      <h3>المطوّر</h3><p class="dev"><b>${esc(D.name)}</b> — ${esc(D.company)}</p>
      <p class="hint"><a href="https://donia679-glitch.github.io/amr-osman/studio/legal/privacy.html" target="_blank" rel="noopener">سياسة الخصوصية</a> · <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener">شروط الاستخدام</a></p>
      <details><summary>مكتبات مفتوحة المصدر</summary><p class="hint" dir="ltr" style="text-align:left">three.js (MIT) · three-gpu-pathtracer (MIT) · three-mesh-bvh (MIT) · qrcode-generator by Kazuhiko Arase (MIT) · IBM Plex Sans Arabic (SIL Open Font License 1.1)</p></details>
      ${contact ? `<div class="btnrow">${contact}</div>` : ""}
      <p class="hint">© ${new Date().getFullYear()} ${esc(D.company)}. كل الحقوق محفوظة. تصميماتك محفوظة على جهازك وعلى حسابك بس.</p></div>`;
  }
  else if (ui.pop === "checks") {
    const list = designChecks();
    h = `<div class="popbox" role="dialog" aria-label="فحص التصميم"><div class="libhead"><h2>فحص التصميم</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <p class="hint">بيراجع التداخل، والخلوص بين الحيطان، والأبواب والشبابيك، ونقط الكهربا والمياه والغاز جنب الوحدات اللي محتاجاها. دوس على أي ملاحظة عشان تروح للوحدة.</p><div class="chklist">${checksHtml(list)}</div></div>`;
  }
  else if (ui.pop === "defaults") h = defaultsPop();
  else if (ui.pop === "menu") {
    const it = (k, ic, t, d) => `<button class="mitem" data-menu="${k}"><span class="mic">${ic}</span><span><b>${t}</b><small>${d}</small></span></button>`;
    h = `<div class="popbox menubox" role="dialog" aria-label="القائمة"><div class="libhead"><h2>القائمة</h2><button class="x" data-close aria-label="قفل">×</button></div>
      <h3>المشروع</h3>${it("projects", "📁", "مشاريعي", "افتح مشروع تاني أو ابدأ جديد")}${it("export", "⬆", "تصدير وطباعة", "الملصقات، خطة القص، CNC، عرض السعر، سكتش أب")}${it("survey", "📐", "رفع مقاسات", "شاشة الرفع في الموقع خطوة بخطوة")}${it("studio", "✏️", "ورشة الرسم", "صمّم أي قطعة أو وحدة من الصفر برسم 3D حر")}
      <h3>الإعدادات</h3>${it("defaults", "⚙", "الإعدادات الافتراضية", "مقاسات الوحدات، التصنيع، التسعير، القص — مرة واحدة لكل المشاريع")}${it("look", "🎨", "الألوان والمظهر والكيبورد", "فاتح/غامق، لون التطبيق، كيبورد الأرقام")}
      <h3>مساعدة</h3>${it("lang", "🌐", I18n.lang === "en" ? "اللغة: عربي" : "Language: English", I18n.lang === "en" ? "التطبيق كله بالعربي" : "Switch the whole app to English")}${it("tour", "🧭", "الجولة التعريفية", "شرح سريع لكل جزء في الشاشة")}${it("about", "ⓘ", "عن التطبيق", "الإصدار والتواصل")}</div>`;
  }
  else if (ui.pop === "ar") {
    const f = ui.arFile || {};
    const direct = f.ar && !f.standalone && !f.framed;
    h = `<div class="popbox" role="dialog" aria-label="شوفها في الأوضة"><div class="libhead"><h2>شوفها في الأوضة (AR)</h2><button class="x" data-close aria-label="قفل">×</button></div>
      ${direct ? `<a class="arlink" rel="ar" href="${f.url}#allowsContentScaling=0">${f.img ? `<img src="${f.img}" alt="التصميم">` : `<img alt="">`}<span>👆 دوس هنا — والكاميرا تفتح والتصميم يقف على الأرض بمقاسه</span></a>` : f.img ? `<img class="arprev" src="${f.img}" alt="التصميم">` : ""}
      <p class="hint">${direct ? "وجّه الكاميرا على الأرض وحرّك الجهاز شوية لحد ما يلاقيها، والتصميم هيتحط بمقاسه الحقيقي. تقدر تلف حواليه وتحرّكه بصباعك." : f.ar ? "الـAR مش بيفتح من جوه التطبيق المثبّت على الشاشة أو من صفحة جوه صفحة. احفظ الملف، وبعدين افتحه من تطبيق «الملفات»، وهيفتح على طول بالكاميرا." : "الـAR بيشتغل على الآيباد والآيفون. احفظ الملف وابعته للجهاز، وافتحه من «الملفات»."}</p>
      <div class="btnrow"><button class="${direct ? "ghost2" : "primary"}" data-arsave>💾 احفظ ملف AR (USDZ)</button></div><p class="hint" id="arMsg"></p></div>`;
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
      <button class="primary big svfromroom" data-svroom>📐 رفع المقاسات خطوة بخطوة (في الموقع)</button>
      <p class="hint">المقاسات من جوه (من وش الحيطة لوش الحيطة) بالسنتيمتر — تقدر تعدّل أي حيطة بعد كده أو تسحب أركانها.</p>
      <div class="roomkinds">${Object.entries(Room.PRESETS).map(([key, v]) => `<button class="rk ${key === k ? "on" : ""}" data-rk="${key}">${roomIcon(key)}<span>${esc(v.label)}</span></button>`).join("")}</div>
      <div class="grid2">${pr.fields.map(([f, l, dv]) => `<label class="f"><span>${esc(l)}</span><input type="text" inputmode="decimal" data-numf data-rf="${f}" value="${ui.roomDims?.[f] ?? dv}"></label>`).join("")}
      <label class="f"><span>سمك الحيطة</span><input type="text" inputmode="decimal" data-numf data-rf="t" value="${ui.roomDims?.t ?? (+userDefs().room.t || Room.WALL_T)}"></label>
      <label class="f"><span>ارتفاع الحيطة</span><input type="text" inputmode="decimal" data-numf data-rf="h" value="${ui.roomDims?.h ?? (+userDefs().room.h || Room.WALL_H)}"></label></div>
      ${state.project.room ? `<p class="hint">ده هيستبدل الحيطان الحالية.</p>` : ""}
      <div class="btnrow"><button class="primary" data-mkroom>اعمل الحيطان ورصّ الوحدات</button>${state.project.room ? `<button class="ghost2 danger" data-rmroom>امسح الحيطان</button>` : ""}</div>
      <h3>أو من مسح الأوضة بالكاميرا (LiDAR)</h3>
      ${window.webkit?.messageHandlers?.noveraScan ? (window.noveraNative?.scan ? `<button class="primary" data-nscan>📷 امسح الأوضة بالكاميرا دلوقتي</button><p class="hint">لف بالجهاز ببطء على كل الحيطان والأبواب والشبابيك، وبعدين دوس «خلصت المسح» ← «استخدم المسح».</p>` : `<p class="hint">الجهاز ده مفيهوش حساس LiDAR، فالمسح المباشر مش متاح عليه — المسح محتاج آيباد برو أو آيفون برو. تقدر ترسم بالمقاسات فوق.</p>`) : ""}
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
  if (e.target.id === "lookColor") { (state.look ??= { mode: "auto", accent: "green", stage: "" }).stage = e.target.value; applyLook(); save(); view.update(); return; }
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
  if (ui.pop === "defaults") {
    const t = e.target, d = t.dataset;
    if (d.def) { const num = t.tagName === "INPUT"; setDefault(d.def, num ? (t.value.trim() === "" ? "" : toNum(t.value)) : t.value); }
    else if (d.deft) setDefault(d.deft, t.value);
    else if (d.defb) setDefault(d.defb, t.checked);
    else return;
    save(); settingsPush(); return;
  }
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
      for (const [mid, m] of Object.entries(d.media || {})) await Media.put(m.d, { id: mid, type: m.t, dur: m.dur, pid: p.id });
      if (cloud.dirty) await cloudSave();
      state.project = { ...p, id: uid(), name: (p.name || "مشروع") + " (مستورد)" };
      state.sel = state.project.units[0]?.id ?? null;
      ui.pop = null; renderPop(); save(); render(true);
      alertBar("اتفتح المشروع المستورد.");
    } catch { alertBar("الملف ده مش نسخة مشروع من NOVERA Studio."); }
  }
});
$("#pop").addEventListener("input", (e) => {
  if (e.target.dataset?.vname) { const v = variants().find((x) => x.id === e.target.dataset.vname); if (v) { v.name = e.target.value; save(); } return; }
  const fk = e.target.dataset?.fin;
  if (fk && ui.pop === "mat") {
    const u = selUnit();
    if (!u) return;
    u.fin ??= {};
    const cur = (u.fin[ui.matPick] ??= { gloss: 30, metal: 0, refl: 100, coat: 0, relief: Mat.defaultRelief(R(u).libOf?.(ui.matPick)) });
    cur[fk] = +e.target.value;
    for (const x of targetUnits()) if (x !== u && x.kind === u.kind) { x.fin ??= {}; x.fin[ui.matPick] = { ...cur }; }
    const lab = e.target.closest("label")?.querySelector("b");
    if (lab) lab.textContent = cur[fk] + (fk === "refl" ? "%" : "");
    clearTimeout(ui.finT);
    ui.finT = setTimeout(() => { save(); view.update(); }, 120);
    return;
  }
  if (e.target.id !== "pname") return;
  state.project.name = e.target.value;
  $("#projName").textContent = state.project.name;
  save();
});
$("#pop").addEventListener("click", (e) => {
  const ok = e.target.closest("[data-myok],[data-myreplace]");
  if (!ok || ui.pop !== "mysave") return;
  e.stopImmediatePropagation();
  const name = ($("#myName")?.value || "").trim(), group = ($("#myGroup")?.value || "").trim();
  if (ui.myrenId) {
    const it = state.myUnits.find((x) => x.id === ui.myrenId);
    if (it) { it.label = it.name = name || it.label; it.group = group; it.at = Date.now(); }
    ui.myrenId = null;
  } else {
    const u = state.project.units.find((x) => x.id === ui.mysaveId);
    if (!u) return;
    const it = myUnitFrom(u, name || u.name, group);
    const rep = ok.dataset.myreplace;
    if (rep) state.myUnits = state.myUnits.map((x) => (x.id === rep ? { ...it, id: rep } : x));
    else state.myUnits.push(it);
    alertBar(rep ? "اتحدّثت في مكتبتك ⭐" : `اتحفظت في مكتبتك ⭐ — هتلاقيها في المكتبة ← مكتبتي`);
  }
  ui.pop = null; renderPop(); save(); myLibPush();
  renderLib();
}, true);
$("#pop").addEventListener("keydown", (e) => { if (ui.pop === "mysave" && e.key === "Enter" && e.target.matches("#myName,#myGroup")) $("#pop [data-myok]")?.click(); });
// the backdrop closes the pop only for a real tap on it: finger down AND up on the backdrop itself, with no
// field in use — so a tap that closes the number pad, a picker, or the system keyboard never closes the pop too
let popDownBg = false, popDownAt = 0;
$("#pop").addEventListener("pointerdown", (e) => { popDownBg = e.target.id === "pop"; popDownAt = Date.now(); }, true);
$("#pop").addEventListener("click", async (e) => {
  if (e.target.id === "pop") {
    const busy = document.body.classList.contains("kpad-on") || Keypad.justClosed?.() || (document.activeElement && document.activeElement !== document.body && $("#pop").contains(document.activeElement) && document.activeElement.matches("input,select,textarea"));
    const real = popDownBg && Date.now() - popDownAt < 1500;
    popDownBg = false;
    if (busy || !real) { document.activeElement?.blur?.(); return; }
    ui.pop = null; renderPop(); return;
  }
  if (e.target.closest("[data-close]")) { ui.pop = null; renderPop(); return; }
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (b.hasAttribute("data-opendefs")) { ui.pop = "defaults"; renderPop(); return; }
  if (ui.pop === "menu" && d.menu) {
    const m = d.menu;
    ui.pop = null; renderPop();
    if (m === "projects") { showHome(); return; }
    if (m === "export") { $("#expBtn").click(); return; }
    if (m === "survey") { svFrom = "design"; SurveyUI.open("steps"); return; }
    if (m === "studio") { const su = selUnit(); openStudio(su?.params?.model ? su : null); return; }
    if (m === "tour") { state.tourDone = false; startTour(); return; }
    if (m === "lang") { await Lib.put(state.project).catch(() => {}); I18n.setLang(I18n.lang === "en" ? "ar" : "en"); return; }
    ui.pop = m; renderPop(); return;
  }
  if (ui.pop === "look" && d.lkpad) { state.kpad = d.lkpad === "on"; save(); renderPop(); return; }
  if (ui.pop === "look" && (d.lmode || d.laccent || d.lstage !== undefined)) {
    const L = (state.look ??= { mode: "auto", accent: "green", stage: "" });
    if (d.lmode) L.mode = d.lmode; else if (d.laccent) L.accent = d.laccent; else L.stage = d.lstage;
    applyLook(); save(); renderPop(); view.update();
    return;
  }
  if (ui.pop === "mkeys" && d.mkey) { ui.matPick = d.mkey; ui.pop = "mat"; renderPop(); return; }
  if (ui.pop === "variants") {
    if (d.vopen) { switchVariant(d.vopen); renderPop(); return; }
    if (d.vdup) { const v = variants().find((x) => x.id === d.vdup); addVariant(variantUnits(v), `${v.name} (معدّلة)`); save(); renderPop(); return; }
    if (d.vdel) {
      const vs = variants();
      if (d.vdel === state.project.variant) { const other = vs.find((x) => x.id !== d.vdel); switchVariant(other.id); }
      state.project.variants = variants().filter((x) => x.id !== d.vdel); save(); renderPop(); return;
    }
    if (b.hasAttribute("data-vcompare")) {
      b.disabled = true; b.textContent = "بيجهّز الصور…";
      const shots = await variantShots();
      $("#vcomp").innerHTML = `<div class="vcomp">${shots.map((x) => `<figure><img src="${x.img}" alt=""><figcaption><b>${esc(x.v.name)}</b><span>${priceText(x.q)}</span><small>${x.q.units} وحدة · ${x.q.pieces} قطعة</small>${x.v.id === state.project.variant ? "" : `<button class="ghost2" data-vopen="${x.v.id}">افتح</button>`}</figcaption></figure>`).join("")}</div>`;
      b.disabled = false; b.textContent = "قارن بالصور";
      return;
    }
    if (b.hasAttribute("data-vcomppdf")) { b.disabled = true; try { await exportCompare(); } catch (err) { alertBar(err?.message || "ما كملش"); } b.disabled = false; return; }
  }
  if (ui.pop === "auto") {
    if (d.aktier) { ui.akTier = d.aktier; renderPop(); return; }
    if (b.hasAttribute("data-roompop")) { ui.pop = "room"; renderPop(); return; }
    if (d.akuse != null) { const pr = ui.akProps[+d.akuse]; ui.pop = null; renderPop(); applyKitchen(pr.units, null); alertBar(`اتعمل ${pr.name} — ${pr.q.units} وحدة. عدّل أي وحدة براحتك.`); return; }
    if (b.hasAttribute("data-akall")) {
      const tier = AK_TIERS[ui.akTier || "std"].label;
      const first = ui.akProps[0];
      ui.akProps.forEach((pr, i) => { if (i) { const keep = state.project.units.filter((u) => u.kind !== "kitchen"); addVariant([...keep, ...pr.units], `${pr.name.split(" — ")[0]} · ${tier}`); } });
      const cur = variants().find((v) => v.id === state.project.variant);
      cur.name = `${first.name.split(" — ")[0]} · ${tier}`;
      applyKitchen(first.units, null);
      ui.pop = "variants"; renderPop();
      return;
    }
  }
  if (ui.pop === "align" && d.al) {
    const o = state.project.units.find((x) => x.id === d.al);
    for (const x of targetUnits()) if (x.id !== o.id) alignUnit(x, o, d.am);
    ui.pop = null; renderPop(); save(); renderChips(); view.update(); if (ui.planOn) plan.render();
    return;
  }
  if (ui.pop === "mat" && (d.finpre || b.hasAttribute("data-finreset") || b.hasAttribute("data-finall"))) {
    const u = selUnit();
    if (!u) return;
    u.fin ??= {};
    const same = targetUnits().filter((x) => x.kind === u.kind);
    if (d.finpre) for (const x of same) { x.fin ??= {}; x.fin[ui.matPick] = { ...FIN_PRESETS[d.finpre][1] }; }
    else if (b.hasAttribute("data-finreset")) for (const x of same) delete x.fin?.[ui.matPick];
    else {
      const f = u.fin[ui.matPick];
      for (const x of state.project.units) if (x.kind === u.kind) { x.fin ??= {}; if (f) x.fin[ui.matPick] = { ...f }; else delete x.fin[ui.matPick]; }
      alertBar("اتطبّقت على كل الوحدات اللي من نفس النوع.");
    }
    save(); renderPop(); view.update();
    return;
  }
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
  if (ui.pop === "defaults" && b.hasAttribute("data-defapply")) {
    const D0 = userDefs();
    let n = 0;
    for (const u of state.project.units) if (u.kind === "kitchen") { const p = expanded(u); Object.assign(p, D0.k); if (D0.handle) p.kud_handles = { ...(p.kud_handles || {}), type: D0.handle }; u.params = p; n++; }
    save(); render(true); alertBar(`اتطبّقت الإعدادات على ${n} وحدة مطبخ (المقاسات زي ما هي).`); return;
  }
  if (ui.pop === "ar" && b.hasAttribute("data-arsave")) {
    const f = ui.arFile; if (!f) return;
    b.disabled = true;
    try { const r = await Exp.deliver(cloud.downloads, f.name, f.blob); $("#arMsg").textContent = r === "declined" ? "" : "اتحفظ ✓ — افتحه من «الملفات»."; } catch { $("#arMsg").textContent = "ما اتحفظش — جرّب تاني."; }
    b.disabled = false; return;
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
      const known = err?.message && err.message.length < 60;
      st.textContent = known ? err.message : "ما كملش";
      if (!known) console.error(err); // a short message is an expected stop ("draw the walls first"), not a crash
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
  if (ui.pop === "room" && b.hasAttribute("data-svroom")) { ui.pop = null; renderPop(); svFrom = "design"; SurveyUI.open("steps"); return; }
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
    if (b.hasAttribute("data-nscan")) { window.webkit?.messageHandlers?.noveraScan?.postMessage({}); return; }
  if (b.hasAttribute("data-rmroom")) { delete state.project.room; for (const u of state.project.units) delete u.pos; ui.pop = null; ui.planSel = null; plan.vb = null; renderPop(); save(); render(true); return; }
    return;
  }
  if (d.lib != null && ui.pop === "mat") { applyLib(d.lib); return; }
  if (b.hasAttribute("data-newproj")) { await newProject(""); return; }
  else if (d.openproj && d.openproj !== state.project.id) { await openProject(d.openproj); return; }
  else if (d.openproj === "__never") {
    if (cloud.dirty) await cloudSave();
    const snap = await cloud.db.doc(`data/users/${cloud.me}/p_${d.openproj}`).get();
    if (!snap.exists) return;
    const v = snap.data();
    state.project = { id: d.openproj, name: v.name, units: v.units || [], ...(v.room ? { room: v.room } : {}), mats: v.mats || [], ...(v.stages ? { stages: v.stages } : {}), ...(v.survey ? { survey: v.survey } : {}) };
    for (const m of state.project.mats) Mat.register(m);
    state.sel = state.project.units[0]?.id ?? null;
    ui.pop = null;
    save();
    render(true);
    renderPop();
  } else if (d.delproj) {
    if (d.armed !== "1") { d.armed = "1"; b.classList.add("armed"); b.textContent = "أكّد"; return; }
    await Lib.del(d.delproj);
    if (cloud.db && cloud.me) { try { await cloud.db.doc(`data/users/${cloud.me}/p_${d.delproj}`).delete(); } catch { /* offline */ } }
    ui.projects = (await allProjects()).map((x) => ({ id: x.id, name: x.name, updatedAt: x.updatedAt }));
    renderPop();
  }
});
/** save button: this device right away, and the account too when signed in */
async function saveNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage unavailable */ }
  try { await Lib.put(state.project); } catch { alertBar("ما قدرتش أحفظ على الجهاز."); return; }
  if (cloud.db && cloud.me) await cloudSave();
  const t = new Date().toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
  alertBar(`اتحفظ ✓ «${state.project.name}» — ${t}`);
  const b = $("#saveBtn"); b.classList.add("ok"); setTimeout(() => b.classList.remove("ok"), 1500);
}
/** switch to another project (from this device, or the account when it is newer there) */
async function openProject(id, quiet = false) {
  if (id === state.project.id) { if (!quiet) closeHome(); return; }
  await Lib.put(state.project).catch(() => {});
  if (cloud.dirty) await cloudSave();
  let rec = await Lib.get(id).catch(() => null), p = rec?.project || null;
  if (cloud.db && cloud.me) {
    try {
      const snap = await cloud.db.doc(`data/users/${cloud.me}/p_${id}`).get();
      if (snap.exists && (!rec || (snap.data().updatedAt || "") > (rec.updatedAt || ""))) { const v = snap.data(); p = { id, name: v.name, units: v.units || [], ...(v.room ? { room: v.room } : {}), mats: v.mats || [], ...(v.stages ? { stages: v.stages } : {}), ...(v.survey ? { survey: v.survey } : {}) }; }
    } catch { /* offline: keep the local copy */ }
  }
  if (!p) { alertBar("المشروع ده مش موجود."); return; }
  state.project = p;
  for (const m of state.project.mats || []) Mat.register(m);
  state.sel = state.project.units[0]?.id ?? null;
  state.tab = "design";
  ui.planSel = null; ui.multi = null; ui.asm = null;
  closeHome();
  ui.pop = null; renderPop();
  save(); render(true);
}
async function newProject(name) {
  await Lib.put(state.project).catch(() => {});
  if (cloud.dirty) await cloudSave();
  state.project = { id: uid(), name: (name || "").trim() || "مشروع جديد", units: [] };
  state.sel = null; state.libOpen = false; state.tab = "design";
  ui.planSel = null; ui.multi = null; ui.asm = null;
  closeHome();
  ui.pop = null; renderPop();
  save(); render(true);
}
/** the iPad app's camera scan arrives here (RoomPlan CapturedRoom as JSON) */
window.noveraRoomScan = (data) => {
  try {
    const room = Room.fromRoomPlan(data);
    state.project.room = room;
    for (const u of state.project.units) delete u.pos;
    state.whole = true; ui.planOn = true; ui.planSel = null; plan.vb = null; ui.pop = null;
    closeHome(); renderPop(); save(); render(true);
    alertBar(`اتعملت ${room.walls.length} حيطة و${room.openings.length} باب/شباك من المسح — راجع المقاسات وعدّل أي حيطة بالضغط عليها.`);
  } catch (err) { alertBar(err?.message?.length < 80 ? err.message : "ما قدرتش أقرا المسح — جرّب تمسح تاني ببطء."); }
};
window.noveraScanError = (msg) => alertBar(msg);
function closeHome() { $("#home").hidden = true; document.body.classList.remove("athome"); setTimeout(() => view.resize?.(), 50); renderSteps(); if (!state.tourDone && ui.mode === "owner") setTimeout(() => { if (!document.body.classList.contains("insurvey") && !document.body.classList.contains("indraw")) startTour(); }, 900); }
async function allProjects() {
  const local = await Lib.list().catch(() => []);
  const map = new Map(local.map((x) => [x.id, { ...x, where: "device" }]));
  if (cloud.db && cloud.me) {
    await refreshProjects();
    for (const c of ui.projects || []) { const l = map.get(c.id); if (!l) map.set(c.id, { ...c, units: null, where: "cloud" }); else if ((c.updatedAt || "") > l.updatedAt) map.set(c.id, { ...l, updatedAt: c.updatedAt, srv: c.srv ?? l.srv, stages: c.stages ?? l.stages, where: "both" }); else l.where = "both"; }
  }
  return [...map.values()].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}
async function showHome() {
  const el = $("#home");
  el.hidden = false;
  document.body.classList.add("athome");
  el.innerHTML = `<div class="homein"><div class="homehead"><span class="mark big">N</span><div><b>NOVERA Studio</b><small>تصميم وتصنيع المطابخ والأثاث</small></div></div><p class="hint">بيحمّل المشاريع…</p></div>`;
  await Lib.put(state.project).catch(() => {});
  const list = await allProjects();
  const when = (t) => (t ? new Date(t).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
  const waiting = list.filter((x) => x.srv === "measured" && !x.stages?.design?.done).length;
  const f = ui.homeF || "all", q = (ui.homeQ || "").trim();
  const shown = list.filter((x) => (f === "all" || (f === "wait" ? x.srv === "measured" && !x.stages?.design?.done : f === "srv" ? x.srv === "measuring" : true)) && (!q || String(x.name).includes(q)));
  el.innerHTML = `<div class="homein">
    <div class="homehead"><span class="mark big">N</span><div><b>NOVERA Studio</b><small>تصميم وتصنيع المطابخ والأثاث</small></div></div>
    <h3 class="hsec">ابدأ</h3>
    <div class="htiles">
      <div class="htile main"><b>🎨 مشروع تصميم جديد</b><small>أوضة ← تصميم ← سعر ← قص ← ورشة</small><div class="homenew"><input id="homeName" placeholder="اسم المشروع (مثلاً: مطبخ أ. محمد — التجمع)" aria-label="اسم المشروع الجديد"><button class="primary" data-hnew>ابدأ ←</button></div></div>
      <button class="htile" data-hsurvey><b>📐 رفع مقاسات</b><small>في الموقع، خطوة بخطوة، والمصمم يستلم الأوضة جاهزة</small></button>
      <button class="htile" data-hstudio><b>✏️ ورشة الرسم</b><small>ارسم وحدتك أو قطعتك من الصفر برسم 3D حر</small></button>
      <button class="htile" data-hcut><b>✂ كت ليست سريع</b><small>اكتب مقاسات القطع وخد خطة القص والملصقات</small></button>
    </div>
    <button class="hcont" data-hlast><span>↩</span><span><b>كمّل «${esc(state.project.name)}»</b><small>${state.project.units.length} وحدة · آخر حاجة كنت شغال عليها</small></span></button>
    <div class="hprojhead"><h3 class="hsec">مشاريعي</h3><input id="homeQ" class="libq" placeholder="🔍 دوّر باسم المشروع" value="${esc(ui.homeQ || "")}">
      <div class="seg hfilt">${[["all", "الكل"], ["wait", `📐 مستني تصميم${waiting ? ` (${waiting})` : ""}`], ["srv", "بيترفع"]].map(([k, l]) => `<button data-hf="${k}" class="${f === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
    <div class="homelist">${shown.map((x) => `<div class="hcard ${x.id === state.project.id ? "cur" : ""}"><button class="hopen" data-hopen="${x.id}"><b>${esc(x.name)}</b>
      ${x.srv === "measured" && !x.stages?.design?.done ? `<span class="hstage svwait">📐 اترفع — مستني تصميم</span>` : x.srv === "measuring" ? `<span class="hstage">📐 الرفع لسه شغال</span>` : x.stages && Object.values(x.stages).some((v) => v?.done) ? `<span class="hstage">🧭 ${esc(stageNow({ stages: x.stages }).cur)}</span>` : ""}
      <small>${x.units != null ? `${x.units} وحدة · ` : ""}${x.variants > 1 ? `${x.variants} نسخ · ` : ""}${when(x.updatedAt)}${x.where === "cloud" ? " · أونلاين" : x.where === "both" ? " · على الجهاز وأونلاين" : ""}</small></button>
      ${x.srv ? `<button class="hdel sm" data-hsv="${x.id}" title="شاشة الرفع" aria-label="شاشة الرفع">📐</button>` : ""}<button class="hdel danger sm" data-hdel="${x.id}" aria-label="امسح ${esc(x.name)}">${ICON.trash}</button></div>`).join("") || `<p class="hint">${q || f !== "all" ? "مفيش مشاريع بالبحث ده." : "مفيش مشاريع لسه — ابدأ مشروع جديد."}</p>`}</div>
    <h3 class="hsec">أدوات</h3>
    <div class="homeacts"><label class="ghost2 filebtn">📂 افتح ملف مشروع<input type="file" id="homeImp" accept=".json,application/json" hidden></label><button class="ghost2" data-hdefs>⚙ الإعدادات الافتراضية</button><button class="ghost2" data-hlook>🎨 المظهر والكيبورد</button><button class="ghost2" data-habout>ⓘ عن التطبيق</button><button class="ghost2" data-hlang data-noi18n>🌐 ${I18n.lang === "en" ? "عربي" : "English"}</button></div>
    <p class="hint">المشاريع بتتحفظ لوحدها وانت شغال. خد نسخة احتياطي من ☰ ← تصدير ← نسخة من المشروع.</p></div>`;
}
async function refreshProjects() {
  if (!cloud.db || !cloud.me) return;
  try {
    const qs = await cloud.db.collection(`data/users/${cloud.me}`).orderBy("updatedAt", "desc").limit(100).get();
    ui.projects = qs.docs.filter((s) => s.id.startsWith("p_")).map((s) => { const v = s.data(); return { id: s.id.slice(2), name: v.name, updatedAt: v.updatedAt, srv: Lib.srvOf(v.survey), stages: v.stages || null, room: !!v.room }; });
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
  return (project?.units || []).filter((u) => u.kind !== "pieces").map((u) => { const r = R(u); return r.ok ? { id: u.id, box: localBox(r), row: rowOf(u, r), corner: cornerUnit(u, r), pos: u.pos } : null; }).filter(Boolean);
}
/** room columns that stand behind a unit, as obstacles in its own frame (the carcass gets cut around them) */
function roomObstacles(u) {
  const cols = state.project.room?.columns || [];
  const pose = projectPoses(state.project).get(u.id);
  const r = R(u);
  if (!pose || !r.ok || !cols.length) return [];
  const box = localBox(r);
  const ex = Room.axisX(pose.rot), ez = Room.axisZ(pose.rot);
  const out = [];
  for (const c of cols) {
    const pts = [[c.x, c.z], [c.x + c.w, c.z], [c.x + c.w, c.z + c.d], [c.x, c.z + c.d]].map(([x, z]) => {
      const q = [x - pose.x, z - pose.z];
      return [q[0] * ex[0] + q[1] * ex[1], -(q[0] * ez[0] + q[1] * ez[1])];
    });
    const lx0 = Math.min(...pts.map((p) => p[0])), lx1 = Math.max(...pts.map((p) => p[0]));
    const ly0 = Math.min(...pts.map((p) => p[1])), ly1 = Math.max(...pts.map((p) => p[1]));
    const x0 = Math.max(box.x0, lx0), x1 = Math.min(box.x1, lx1);
    if (x1 - x0 < 0.5 || ly1 < box.y1 - 2 || ly0 >= box.y1 - 0.5) continue;
    const depth = Math.round((box.y1 - Math.max(box.y0, ly0)) * 10) / 10;
    if (depth <= 0.5) continue;
    out.push({ name: "عمود", from: "left", x: Math.round((x0 - box.x0) * 10) / 10, width: Math.round((x1 - x0) * 10) / 10, depth, fromRoom: true });
  }
  return out;
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
    // corners that are not square: their inside angle
    let angH = "";
    if (room) segs.forEach((sg, k) => {
      const a = Room.cornerAngle(room, sg.i);
      if (a == null || Math.abs(a - 90) < 0.4) return;
      const prev = k > 0 ? segs[k - 1] : segs[segs.length - 1];
      let bx = prev.n[0] + sg.n[0], bz = prev.n[1] + sg.n[1]; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
      angH += `<text x="${sg.A[0] + bx * fs * 2.4}" y="${sg.A[1] + bz * fs * 2.4}" font-size="${fs * 1.05}" class="pdim pang" text-anchor="middle" dominant-baseline="middle">${n1(a)}°</text>`;
    });
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
    h += angH; // on top of the units
    // drawing preview + corner handles
    if (ui.planTool === "draw") {
      const pts = ui.draft || [];
      if (pts.length) h += `<polyline points="${[...pts, ...(this.hover ? [this.hover] : [])].map((p) => p.join(",")).join(" ")}" class="pdraft"/>`;
      if (pts.length && this.hover) {
        const p = pts[pts.length - 1], q = this.hover;
        h += `<text x="${(p[0] + q[0]) / 2}" y="${(p[1] + q[1]) / 2 - fs}" font-size="${fs * 1.1}" class="pdim live" text-anchor="middle">${n1(Math.hypot(q[0] - p[0], q[1] - p[1]))}</text>`;
        if (pts.length >= 2) {
          const o = pts[pts.length - 2], a1 = Math.atan2(p[1] - o[1], p[0] - o[0]), a2 = Math.atan2(q[1] - p[1], q[0] - p[0]);
          let t = ((a2 - a1) * 180) / Math.PI; while (t > 180) t -= 360; while (t < -180) t += 360;
          h += `<text x="${p[0]}" y="${p[1] - fs * 1.4}" font-size="${fs}" class="pdim live pang" text-anchor="middle">${n1(180 - Math.abs(t))}°</text>`;
        }
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
      const zLift = +u.lift || 0; // kitchen meshes already stand at their mounting height; this is the extra lift
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
      const q = Room.snapDraw(pts[pts.length - 1], p, 5, ui.drawSnap ?? 45);
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
    if (ui.planTool === "draw" && !a) { const pts = ui.draft || []; plan.hover = Room.snapDraw(pts[pts.length - 1], plan.toCm(e), 5, ui.drawSnap ?? 45); plan.render(); return; }
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
      pts[a.i] = Room.snapDraw(prev, p, 5, ui.drawSnap ?? 45);
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
      this.ctl.dampingFactor = 0.16; // a short glide: no long drift after the finger lifts (or after a slow frame)
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
      // rounded panel edges for the realistic look (the 1–2 mm radius that catches the light on real boards)
      import("three/addons/geometries/RoundedBoxGeometry.js").then((m) => { this.RBox = m.RoundedBoxGeometry; if (state.render) this.update(); }).catch(() => {});
      this.final = new Render.FinalRender(this);
      const loop = () => {
        requestAnimationFrame(loop);
        if (!this.host.offsetParent) return;
        if (this.final.active) { this.final.tick(); return; }
        if (this.recording) return;
        const moved = this.ctl.update();
        if (!moved && !this.dirty && !this.camDirty) return;
        // shadows only change with the scene, never with the camera: re-draw the shadow map only then
        if (this.dirty) this.ren.shadowMap.needsUpdate = true;
        this.dirty = false; this.camDirty = false;
        this.cutaway();
        // while a finger turns the camera: skip the heavy ambient-occlusion pass, add it back when it stops
        if (this.usePost() && !this.interacting) this.postFx.render(); else this.ren.render(this.scene, this.cam);
        dimTags.place(this);
      };
      this.ren.shadowMap.autoUpdate = false;
      this.ren.shadowMap.needsUpdate = true;
      this.ctl.addEventListener("change", () => { this.camDirty = true; });
      this.ctl.addEventListener("start", () => { clearTimeout(this.calmT); this.interacting = true; });
      this.ctl.addEventListener("end", () => { clearTimeout(this.calmT); this.calmT = setTimeout(() => { this.interacting = false; this.camDirty = true; }, 220); });
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
          const ang = sign * (mv.maxAng ?? (flip ? 1.35 : Math.PI / 2)) * k;
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
        m.userData.pt = pt.id;
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
      m.userData.col = c.id;
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
  /** hidden in "inspect": a whole kind of piece, or one piece tapped away */
  hiddenPart(u, name, role) { return !!(ui.hideCls?.has(partClass(name, role)) || ui.hidePart?.has(u.id + "|" + name)); },
  /** pull every piece away from the unit's middle (exploded view) */
  explode(ug, k) {
    if (!k) return;
    const THREE = this.three;
    ug.updateMatrixWorld(true);
    const c = new THREE.Box3().setFromObject(ug).getCenter(new THREE.Vector3());
    ug.traverse((o) => {
      if (!o.geometry || !(o.isMesh || o.isLineSegments)) return;
      o.geometry.computeBoundingBox();
      const pc = o.geometry.boundingBox.getCenter(new THREE.Vector3()).add(o.position);
      o.position.addScaledVector(pc.sub(c), k);
    });
  },
  /** cut the unit open to look inside (front / top / side), with clipping on its own materials only */
  cutUnit(ug, mode, t) {
    const THREE = this.three;
    if (!mode || !ug) return;
    this.ren.localClippingEnabled = true;
    ug.updateMatrixWorld(true);
    const lb = new THREE.Box3();
    ug.traverse((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); lb.union(o.geometry.boundingBox.clone().translate(o.position)); } });
    const nLoc = mode === "front" ? new THREE.Vector3(0, 0, -1) : mode === "top" ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(1, 0, 0);
    const pLoc = mode === "front" ? new THREE.Vector3(0, 0, lb.max.z - (lb.max.z - lb.min.z) * t) : mode === "top" ? new THREE.Vector3(0, lb.max.y - (lb.max.y - lb.min.y) * t, 0) : new THREE.Vector3(lb.min.x + (lb.max.x - lb.min.x) * t, 0, 0);
    const n = nLoc.transformDirection(ug.matrixWorld), p = pLoc.applyMatrix4(ug.matrixWorld);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
    const seen = new Set();
    ug.traverse((o) => { for (const m of [].concat(o.material || [])) if (m && !seen.has(m)) { seen.add(m); m.clippingPlanes = [plane]; m.clipShadows = true; } });
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
        const m = finMaterial(THREE, led || glass ? null : finOf(u, key), { color: tx ? new THREE.Color(1, 1, 1).multiplyScalar(sf.bright) : r.colors[key] || "#cccccc", map: tx?.tex || null,
          roughness: state.render || lib ? sf.rough : 0.7, metalness: ["frame", "rail", "handle"].includes(key) ? 0.5 : sf.metal,
          transparent: see || glass, opacity: see ? 0.16 : glass ? 0.4 : 1, side: THREE.DoubleSide,
          emissive: new THREE.Color(led ? "#ffcf6a" : "#000000"), emissiveIntensity: led ? 0.9 : 0 });
        m.userData.tile = tx?.tile || 0;
        if (tx && state.render) addRelief(THREE, m, tx.tex, finOf(u, key)?.relief ?? Mat.defaultRelief(lib));
        m.userData.glass = glass && !see;
        m.userData.mirror = key === "mirror";
        return (mats[id] = m);
      };
      const T = ([x, y, z]) => [x, z, -y];
      for (const m of r.meshes) {
        if ((m.mat === "hole" && !state.xray) || m.name === "كبة مفصلة" || m.name === "خرم مقبض") continue;
        if (this.hiddenPart(u, m.name, null)) continue;
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
        const bx = m.box, bmin = Math.min(bx.x1 - bx.x0, bx.y1 - bx.y0, bx.z1 - bx.z0);
        const bev = bevelFor(bmin);
        const rounded = bev && m.faces.length === 6 && byMat.size === 1;
        for (const [key, arr] of byMat) {
          if (!arr.length) continue;
          let geo;
          if (rounded) {
            geo = new this.RBox(bx.x1 - bx.x0, bx.z1 - bx.z0, bx.y1 - bx.y0, bev.seg, bev.r);
            geo.translate((bx.x0 + bx.x1) / 2, (bx.z0 + bx.z1) / 2, -(bx.y0 + bx.y1) / 2);
          } else {
            geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
            geo.computeVertexNormals();
          }
          const mm = matFor(key, front);
          if (mm.userData.tile) Mat.planarUV(THREE, geo, mm.userData.tile);
          const mesh = new THREE.Mesh(geo, vs === "cur" ? hiMat(mm) : mm);
          mesh.userData.led = key === "led";
          mesh.castShadow = mesh.receiveShadow = !!state.render;
          mesh.userData.pname = m.name;
          if (m.extra != null) mesh.userData.xi = m.extra;
          (m.mover !== null ? this.moverGroup(g, r, m.mover) : g).add(mesh);
        }
        if (all.length && m.faces.length <= 16 && m.mat !== "led" && !state.render) {
          const eg = new THREE.BufferGeometry();
          eg.setAttribute("position", new THREE.Float32BufferAttribute(all, 3));
          const ln = new THREE.LineSegments(new THREE.EdgesGeometry(eg, 30), edgeMat);
          eg.dispose();
          if (m.extra != null) ln.userData.xi = m.extra;
          (m.mover !== null ? this.moverGroup(g, r, m.mover) : g).add(ln);
        }
        const b = m.box;
        minX = Math.min(minX, b.x0); maxX = Math.max(maxX, b.x1); minY = Math.min(minY, b.z0); maxY = Math.max(maxY, b.z1);
        minZ = Math.min(minZ, -b.y1); maxZ = Math.max(maxZ, -b.y0);
      }
    }
    if (r.meshes && u.kind === "kitchen" && !vis && !state.xray && !ui.hideCls?.has("appl")) { for (const m of applianceMeshes(THREE, u, r)) g.add(m); organizerMeshes(THREE, u, r, this, g); }
    for (const [pi, pt] of (r.meshes ? [] : r.parts).entries()) {
      const vs = vis ? vis(pt.name, pt.role) : "done";
      if (vs === "hide" || this.hiddenPart(u, pt.name, pt.role)) continue;
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
      const mat = finMaterial(THREE, led || glassy ? null : finOf(u, pt.material), { color: ptx ? new THREE.Color(1, 1, 1).multiplyScalar(psf.bright) : color, map: ptx?.tex || null,
        roughness: state.render || plib ? psf.rough : 0.72, metalness: pt.material === "mirror" || pt.material === "rail" ? 0.45 : psf.metal,
        transparent: see || glassy, opacity: see ? 0.16 : glassy ? 0.45 : 1,
        emissive: new THREE.Color(led ? "#ffcf6a" : vs === "cur" ? "#d9a63a" : "#000000"), emissiveIntensity: led ? 0.9 : vs === "cur" ? 0.45 : 0 });
      mat.userData.glass = glassy && !see;
      mat.userData.mirror = pt.material === "mirror";
      if (ptx && state.render) addRelief(THREE, mat, ptx.tex, finOf(u, pt.material)?.relief ?? Mat.defaultRelief(plib));
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
      } else if (s.type === "faces" && s.faces?.length) {
        geo = facesGeometry(THREE, s.faces);
        mesh = new THREE.Mesh(geo, mat);
      } else if (s.type === "cylinder_x" || s.type === "cylinder_z" || s.type === "cylinder_y") {
        geo = new THREE.CylinderGeometry(s.r, s.r, s.length, 20);
        mesh = new THREE.Mesh(geo, mat);
        if (s.type === "cylinder_x") mesh.rotation.z = Math.PI / 2;
        if (s.type === "cylinder_y") mesh.rotation.x = Math.PI / 2;
        mesh.position.set(s.cx, s.cz, -s.cy);
      } else {
        const sx = Math.max(b.x1 - b.x0, 0.05), sy = Math.max(b.z1 - b.z0, 0.05), sz = Math.max(b.y1 - b.y0, 0.05), mn = Math.min(sx, sy, sz);
        const bev = bevelFor(mn);
        geo = bev ? new this.RBox(sx, sy, sz, bev.seg, bev.r) : new THREE.BoxGeometry(sx, sy, sz);
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, -(b.y0 + b.y1) / 2);
      }
      if (ptx) Mat.planarUV(THREE, geo, ptx.tile);
      mesh.userData.led = led;
      mesh.castShadow = mesh.receiveShadow = !!state.render;
      mesh.userData.pname = pt.name;
      if (pt.extra != null) mesh.userData.xi = pt.extra;
      tgt.add(mesh);
      if (!led && !s.type?.startsWith("cylinder") && !state.render) {
        const ln = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
        ln.position.copy(mesh.position);
        ln.rotation.copy(mesh.rotation);
        if (pt.extra != null) ln.userData.xi = pt.extra;
        tgt.add(ln);
      }
      minX = Math.min(minX, b.x0); maxX = Math.max(maxX, b.x1); minY = Math.min(minY, b.z0); maxY = Math.max(maxY, b.z1);
      minZ = Math.min(minZ, -b.y1); maxZ = Math.max(maxZ, -b.y0);
    }
    if (u.kind === "pieces") for (const pt of r.parts) g.add(pieceTag(THREE, pt, unitCode(u)));
    if (!r.meshes && !vis && !state.xray && !ui.hideCls?.has("soft")) {
      for (const { mesh, partIndex } of Decor.softFor(THREE, Mat, u, r, { render: !!state.render, RBox: this.RBox, name: "مفروشات" })) {
        const mvI = partIndex !== null ? r.partMover?.[partIndex] ?? null : null;
        (mvI !== null ? this.moverGroup(g, r, mvI) : g).add(mesh);
      }
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
      const ug = new THREE.Group();
      ug.userData.unitId = u.id;
      if (!r.ok) {
        // a unit that can't be built stays visible as a red box (instead of disappearing), so it can be found and fixed
        const P = u.params || {}, w = +P.width || 60, h = +P.height || 72, d = +P.depth || 58;
        const bx = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: 0xd23228, transparent: true, opacity: 0.22, depthWrite: false }));
        bx.position.set(w / 2, h / 2, -d / 2);
        const be = new THREE.LineSegments(new THREE.EdgesGeometry(bx.geometry), new THREE.LineBasicMaterial({ color: 0xd23228 }));
        be.position.copy(bx.position);
        ug.add(bx, be);
      } else this.buildUnit(ug, u, r, edgeMat);
      const inspected = !whole || u.id === state.sel;
      if (inspected && ui.explode && r.ok) this.explode(ug, ui.explode);
      if (layout) {
        const L = layout.get(u.id);
        if (!L) continue;
        ug.position.set(L.x, +u.lift || 0, L.z);
        ug.rotation.y = L.rot;
      }
      g.add(ug);
      this.pickables.push(ug);
      if (inspected && ui.cut && r.ok) { ug.updateMatrixWorld(true); this.cutUnit(ug, ui.cut, ui.cutT ?? 0.5); }
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
    // the other units ticked in multi-select get a gold outline too
    if (ui.multi?.size && whole) {
      for (const ug of this.pickables) {
        if (!ui.multi.has(ug.userData.unitId) || ug === selBox) continue;
        const mb = new THREE.Box3().setFromObject(ug), ms = mb.getSize(new THREE.Vector3()).addScalar(3);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(ms.x, ms.y, ms.z)), new THREE.LineBasicMaterial({ color: 0xd9a63a }));
        e.position.copy(mb.getCenter(new THREE.Vector3()));
        g.add(e);
        (this.selGlass ??= []).push(e);
      }
    }
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
  /** the point and face normal under the finger, in the engine frame of the unit it hits */
  pickLocal(clientX, clientY) {
    if (!this.ready || !this.pickables?.length) return null;
    const THREE = this.three;
    const rc = this.ren.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((clientX - rc.left) / rc.width) * 2 - 1, -((clientY - rc.top) / rc.height) * 2 + 1), this.cam);
    const hit = ray.intersectObjects(this.pickables, true).find((h) => h.object.isMesh && h.object.visible && h.face);
    if (!hit) return null;
    let o = hit.object;
    while (o && !o.userData.unitId) o = o.parent;
    if (!o) return null;
    const lp = o.worldToLocal(hit.point.clone());
    const wn = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (wn.dot(ray.ray.direction) > 0) wn.negate();
    const inv = new THREE.Matrix4().copy(o.matrixWorld).invert();
    const ln = wn.transformDirection(inv);
    return { unitId: o.userData.unitId, p: [lp.x, -lp.z, lp.y], n: [ln.x, -ln.z, ln.y] };
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
  /** what is under the finger: a unit, or a wall / electrical point / column of the room */
  pickAny(clientX, clientY) {
    if (!this.ready) return null;
    const THREE = this.three;
    const rc = this.ren.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((clientX - rc.left) / rc.width) * 2 - 1, -((clientY - rc.top) / rc.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.cam);
    const cols = [];
    this.group?.traverse((o) => { if (o.userData.col) cols.push(o); });
    const hits = ray.intersectObjects([...(this.pickables || []), ...(this.walls || []).filter((w) => w.visible), ...cols], true).filter((h) => h.object.isMesh && h.object.visible);
    for (const h of hits) {
      let o = h.object;
      if (o.userData.pt) return { kind: "pt", id: o.userData.pt, hit: h.point };
      if (o.userData.col) return { kind: "col", id: o.userData.col, hit: h.point };
      while (o && !o.userData.unitId && !o.userData.wallId) o = o.parent;
      if (o?.userData.unitId) return { kind: "unit", id: o.userData.unitId };
      if (o?.userData.wallId) return { kind: "wall", id: o.userData.wallId, hit: h.point };
    }
    return null;
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
    const cam = this.cam;
    this.baseFov ??= cam.fov;
    // the elevations and the plan look like true projections: a long lens far away (almost no perspective)
    const flat = ["top", "front", "back", "right", "left"].includes(kind), fov = flat ? 10 : this.baseFov;
    const scale = Math.tan((cam.fov * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360);
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    this.flatView = flat;
    if (kind === "fit" || kind === "home") { this.update(true); return; }
    const t = this.ctl.target, c = this.cam.position, d = c.distanceTo(t) * scale;
    if (cam.far < d * 4) { cam.far = d * 10; cam.updateProjectionMatrix(); }
    // standard views around what the camera looks at (x → right, z → towards the viewer, y up)
    const dirs = { top: [0.0001, 1, 0.0001], front: [0, 0.06, 1], back: [0, 0.06, -1], right: [1, 0.06, 0], left: [-1, 0.06, 0], iso: [0.62, 0.5, 0.78] };
    const v = dirs[kind];
    if (!v) return;
    const n = Math.hypot(...v);
    c.set(t.x + (v[0] / n) * d, t.y + (v[1] / n) * d, t.z + (v[2] / n) * d);
    this.cam.up.set(0, 1, 0);
    this.cam.lookAt(t); this.ctl.update?.();
    this.dirty = true;
  },
  /** lift a unit a little and tint it while it is being moved */
  highlight(id, on) {
    const ug = this.pickables?.find((o) => o.userData.unitId === id);
    if (!ug) return;
    const lu = (ui.mode === "client" ? ui.sharedProject : state.project)?.units.find((x) => x.id === id);
    ug.position.y = (+lu?.lift || 0) + (on ? 1.5 : 0);
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
    ug.position.set(pose.x, ug.position.y, pose.z);
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
const CODE_PREFIX = { kitchen: "K", dressing: "D", panel: "P", pieces: "C" };
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
      const base = { ucode: u.code, unit: u.name, unitIdx: ui_, mname: r.names[pt.material] || pt.material, color: r.colors?.[pt.material] || "#ccc", lib: r.libOf(pt.material) };
      const parts = splitBack(pt);
      if (parts.length === 1) { out.push({ ...base, key, code: key, pt, lb: pt.label }); continue; }
      const plinth = pt.role === "plinth" || /سكلو|وزرة/.test(pt.name || "");
      parts.forEach((lb, i) => out.push({ ...base, key: `${key}/${i + 1}`, code: `${key}/${i + 1}`, pt: { ...pt, name: `${pt.name} (جزء ${i + 1} من ${parts.length})`, note: plinth ? "السكلو متقسّم عشان يطلع من اللوح — الوصلة تيجي على رجل." : "الضهر متقسّم عشان يطلع من اللوح — الوصلة تيجي ورا رف ثابت أو قاطوع (أو على مرينة)." }, lb }));
    }
  });
  return out;
}
/** a back panel bigger than a 244 × 183 sheet is cut in pieces (equal parts, joined behind a shelf or a rail) */
const BACK_MAX = [242, 181];
function splitBack(pt) {
  const lb = pt.label;
  const isBack = pt.role === "back" || /^ظهر|^ضهر/.test(pt.name || "");
  const isPlinth = pt.role === "plinth" || /سكلو|وزرة/.test(pt.name || "");
  if (isPlinth && Math.max(lb.w, lb.h) > BACK_MAX[0]) {
    // a plinth longer than a board is two (or more) strips butted behind a leg
    const along = lb.w >= lb.h ? "w" : "h", n = Math.ceil(lb[along] / BACK_MAX[0]);
    return Array.from({ length: n }, () => ({ ...lb, [along]: Math.round((lb[along] / n) * 10) / 10 }));
  }
  if (!isBack) return [lb];
  const L = Math.max(lb.w, lb.h), S = Math.min(lb.w, lb.h);
  if (L <= BACK_MAX[0] && S <= BACK_MAX[1]) return [lb];
  let nw = Math.ceil(lb.w / BACK_MAX[0]), nh = Math.ceil(lb.h / BACK_MAX[0]);
  const fits = () => { const a = lb.w / nw, b = lb.h / nh; return Math.max(a, b) <= BACK_MAX[0] && Math.min(a, b) <= BACK_MAX[1]; };
  while (!fits() && nw * nh < 12) { if (lb.w / nw >= lb.h / nh) nw++; else nh++; }
  const out = [];
  for (let i = 0; i < nw * nh; i++) out.push({ ...lb, w: Math.round((lb.w / nw) * 10) / 10, h: Math.round((lb.h / nh) * 10) / 10 });
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
    if (STONE(pc.lib) || /^(alu_|stainless|copper)/.test(pc.lib || "") || ["glass", "mirror", "frame", "door_frame_alu", "rail"].includes(pc.pt.material) || /ألومنيوم|المونيوم|معدن/.test(pc.mname || "")) { outside.push(pc); continue; }
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

const SHEETS = [[244, 122], [244, 183], [280, 207], [305, 122], [366, 183]];
/** the sheet a material group is cut from: the user's choice, else the default — or the smallest standard
 *  sheet every piece fits on when the default is too small */
function groupSheet(g) {
  const o = state.cutOpts, trim = 2 * (+o.trim || 0);
  const pick = o.sheetFor?.[g.key];
  if (pick) return { w: pick[0], h: pick[1], auto: false };
  const fits = ([W, H]) => g.parts.every((p) => (p.w <= W - trim && p.h <= H - trim) || (p.rotate !== false && p.h <= W - trim && p.w <= H - trim));
  const def = [+o.sheetW || 244, +o.sheetH || 122];
  if (fits(def)) return { w: def[0], h: def[1], auto: false };
  const s = SHEETS.find(fits);
  return s ? { w: s[0], h: s[1], auto: true } : { w: def[0], h: def[1], auto: false };
}
let worker = null;
try { worker = new Worker(new URL("./cutworker.js", import.meta.url), { type: "module" }); } catch { worker = null; }
let cutReq = 0, cutData = null, cutKey = "";
function runCut(after) {
  const { groups, outside } = cutGroups(state.project);
  const o = state.cutOpts;
  const opts = { sheetW: +o.sheetW, sheetH: +o.sheetH, kerf: +o.kerf, trim: +o.trim };
  for (const g of groups) { g.remnants = o.useStock === false ? [] : (state.stock?.[g.key]?.remnants || []).map((r) => [+r.w, +r.h]); g.sheet = groupSheet(g); }
  const key = JSON.stringify([groups.map((g) => [g.key, g.parts, g.remnants, g.sheet]), opts]);
  if (key === cutKey && cutData && !cutData.busy) { after ? after() : drawCut(); return; }
  cutKey = key;
  const id = ++cutReq;
  cutData = { busy: true, groups, outside, opts, results: null };
  if (!after) drawCut();
  const plain = () => groups.map((g) => ({ key: g.key, result: optimize(g.parts.map(({ name, w, h, rotate }) => ({ name, w, h, rotate })), { ...opts, sheetW: g.sheet.w, sheetH: g.sheet.h, remnants: g.remnants, timeCap: 6 }) }));
  const done = (out) => {
    if (id !== cutReq) return;
    cutData = { busy: false, groups, outside, opts, results: Object.fromEntries(out.map((x) => [x.key, x.result])) };
    after ? after() : state.tab === "cut" && drawCut();
  };
  if (worker) {
    worker.onmessage = (e) => { if (e.data.id === id) done(e.data.out); };
    worker.onerror = () => { worker = null; setTimeout(() => done(plain()), 30); };
    worker.postMessage({ id, groups: groups.map((g) => ({ key: g.key, remnants: g.remnants, sheetW: g.sheet.w, sheetH: g.sheet.h, parts: g.parts.map(({ name, w, h, rotate }) => ({ name, w, h, rotate })) })), opts });
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
    <div class="cutopts">${[["sheetW", "طول اللوح", 1], ["sheetH", "عرض اللوح", 1], ["kerf", "سلاح المنشار", 0.05], ["trim", "تشذيب الحرف", 0.5]].map(([k, l, s]) => `<label class="f"><span>${l}</span><input type="text" inputmode="decimal" data-numf step="${s}" data-co="${k}" value="${o[k]}"></label>`).join("")}</div></div>`;
  if (!cutData || cutData.busy) { el.innerHTML = h + `<div class="busy"><span class="spin" aria-hidden="true"></span>بيحسب أحسن توزيع للقطع…</div>`; return; }
  const { groups, outside, results } = cutData;
  let sheets = 0, lb = 0;
  for (const g of groups) { sheets += results[g.key].stats.sheets; lb += results[g.key].stats.lower_bound; }
  h += `<div class="kpis"><div><b>${sheets}</b><span>لوح كامل</span></div><div><b>${lb}</b><span>أقل عدد نظري</span></div><div><b>${groups.length}</b><span>خامة/سمك</span></div><div><b>${groups.reduce((a, g) => a + g.parts.length, 0)}</b><span>قطعة على المنشار</span></div></div>`;
  h += leftoversHtml();
  for (const g of groups) {
    const res = results[g.key];
    const st = res.stats;
    const sh = g.sheet || { w: o.sheetW, h: o.sheetH };
    const pick = o.sheetFor?.[g.key];
    h += `<section class="mgroup"><div class="mg-h"><i style="background:${g.color}"></i><h3>${esc(g.key)}</h3><span class="pill">${st.sheets} لوح ${sh.w}×${sh.h}</span><span class="pill">استغلال ${Math.round(st.utilization * 100)}%</span><span class="pill soft">${st.parts} قطعة</span>
      <label class="sheetpick"><span>مقاس اللوح</span><select data-gsheet="${esc(g.key)}"><option value="">تلقائي${!pick ? ` (${sh.w}×${sh.h})` : ""}</option>${SHEETS.map(([w, hh]) => `<option value="${w}x${hh}" ${pick && pick[0] === w && pick[1] === hh ? "selected" : ""}>${w}×${hh}</option>`).join("")}</select></label></div>`;
    if (sh.auto) h += `<p class="hint">اللوح اتظبط ${sh.w}×${sh.h} لوحده عشان فيه قطع أطول من ${o.sheetW}×${o.sheetH} — غيّره لو الخامة دي بتيجي بمقاس تاني.</p>`;
    if (res.oversized.length) h += `<p class="e">⚠ قطع أكبر من أي لوح متاح — لازم تتقسم أو الوحدة تتقسم لوحدتين: ${res.oversized.map((x) => `${esc(x.name)} (${n1(x.w)}×${n1(x.h)})`).join("، ")}</p>`;
    h += `<div class="sheets">${res.sheets.map((s, si) => sheetSvg(s, si, g)).join("")}</div></section>`;
  }
  if (outside.length) {
    h += `<section class="mgroup"><div class="mg-h"><h3>بتتطلب من المورّد (رخام / زجاج / مرايا / ألومنيوم)</h3></div><div class="tblwrap"><table class="tbl"><thead><tr><th>الرقم</th><th>الوحدة</th><th>القطعة</th><th>الخامة</th><th>المقاس</th></tr></thead><tbody>`;
    for (const x of outside) h += `<tr><td class="num"><b>${esc(x.key)}</b></td><td>${esc(x.unit)}</td><td>${esc(x.pt.name)}</td><td>${esc(x.mname)}</td><td class="num">${n1(x.lb.w)} × ${n1(x.lb.h)} × ${n1(x.lb.t)}</td></tr>`;
    h += `</tbody></table></div></section>`;
  }
  if (!groups.length && !outside.length) h += `<p class="hint">مفيش قطع للقص — ضيف وحدات في التصميم.</p>`;
  el.innerHTML = h;
}
/** the text inside one piece on a sheet: sized to fit, turned along long narrow pieces, never spilling out */
function pieceLabel(pl, code, name, dims) {
  const vert = pl.h > pl.w * 1.25;
  const W = (vert ? pl.h : pl.w) * 0.9, H = (vert ? pl.w : pl.h) * 0.88;
  const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
  const rot = vert ? ` transform="rotate(-90 ${cx} ${cy})"` : "";
  const cw = 0.6; // average glyph width in em
  const t = (y, fs, txt, cls = "") => `<text x="${cx}" y="${y}" font-size="${fs.toFixed(2)}" text-anchor="middle" dominant-baseline="middle"${cls ? ` class="${cls}"` : ""}${rot}>${esc(txt)}</text>`;
  let fs = Math.min(6, W / (Math.max(code.length, dims.length, 6) * cw), H / 3.5);
  if (fs >= 2.1) {
    const maxCh = Math.max(3, Math.floor(W / (fs * cw)));
    const nmT = trv(name), nm = nmT.length > maxCh ? nmT.slice(0, maxCh - 1) + "…" : nmT;
    return t(cy - fs * 1.15, fs * 1.05, code, "pcode") + t(cy, fs, nm) + t(cy + fs * 1.15, fs * 0.95, dims, "dim");
  }
  fs = Math.min(5, W / (Math.max(code.length, dims.length) * cw), H / 2.3);
  if (fs >= 1.6) return t(cy - fs * 0.6, fs, code, "pcode") + t(cy + fs * 0.6, fs * 0.9, dims, "dim");
  fs = Math.min(5, W / (Math.max(code.length, 2) * cw), H * 0.8);
  return fs >= 1.3 ? t(cy, fs, code, "pcode") : "";
}
function sheetSvg(s, si, g) {
  let svg = `<svg viewBox="-2 -2 ${s.w + 4} ${s.h + 4}" role="img" aria-label="لوح ${si + 1}"><rect x="0" y="0" width="${s.w}" height="${s.h}" class="sh"/>`;
  for (const o of s.offcuts) svg += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" class="off"/>`;
  for (const pl of s.placements) {
    const label = pl.name.split(": ").pop();
    const code = g.parts[pl.index]?.code || "";
    svg += `<rect x="${pl.x}" y="${pl.y}" width="${pl.w}" height="${pl.h}" class="pc" style="fill:${g.color}"/>`;
    svg += pieceLabel(pl, code, label, `${n1(pl.rotated ? pl.orig_h : pl.orig_w)}×${n1(pl.rotated ? pl.orig_w : pl.orig_h)}`);
  }
  svg += "</svg>";
  const steps = s.cuts.slice(0, 40).map((c) => `<li><b>${c.dir === "h" ? "قصة بالعرض" : "قصة بالطول"}</b> ${n1(c.size)} سم <small>من جزء ${n1(c.from_w)}×${n1(c.from_h)}</small></li>`).join("");
  return `<figure class="sheet"><figcaption><b>لوح ${si + 1}</b>${s.stock === "remnant" ? '<span class="pill gold">باقي مخزن</span>' : ""}<span>${s.w}×${s.h}</span><span>${Math.round(s.util * 100)}%</span></figcaption>${svg}
    <details><summary>خطوات القص (${s.cuts.length})</summary><ol>${steps}</ol>${s.offcuts.length ? `<p class="hint">بواقي تتشال: ${s.offcuts.map((o) => `${o.w}×${o.h}`).join("، ")}</p>` : ""}</details></figure>`;
}
/** the usable pieces left on the boards after cutting this project (≥ the minimum size), per material */
function leftovers(min = +(state.cutOpts?.leftMin ?? 30)) {
  if (!cutData?.results) return [];
  return cutData.groups.map((g) => {
    const res = cutData.results[g.key];
    const list = [];
    res.sheets.forEach((sh, i) => { for (const o of sh.offcuts || []) if (Math.min(o.w, o.h) >= min) list.push({ w: Math.round(Math.max(o.w, o.h) * 10) / 10, h: Math.round(Math.min(o.w, o.h) * 10) / 10, sheet: i + 1 }); });
    list.sort((a, b) => b.w * b.h - a.w * a.h);
    const area = list.reduce((a, o) => a + (o.w * o.h) / 10000, 0);
    const sheetA = res.sheets.reduce((a, sh) => a + (sh.w * sh.h) / 10000, 0);
    return { key: g.key, list, area: Math.round(area * 100) / 100, sheetA, util: res.stats.utilization };
  }).filter((x) => x.list.length);
}
function leftoversHtml() {
  const L = leftovers(), min = +(state.cutOpts?.leftMin ?? 30);
  const total = L.reduce((a, x) => a + x.list.length, 0), area = Math.round(L.reduce((a, x) => a + x.area, 0) * 100) / 100;
  let h = `<section class="mgroup leftbox"><div class="mg-h"><h3>♻ ملخص بواقي الألواح — ${esc(state.project.name)}</h3><span class="pill">${total} قطعة باقية</span><span class="pill soft">${area} م²</span></div>
    <div class="btnrow"><label class="f"><span>أقل مقاس يتحسب باقي (سم)</span><input type="text" inputmode="decimal" data-numf id="leftMin" value="${min}"></label>
      <button class="ghost2" data-leftcopy>📋 انسخ الملخص</button><button class="ghost2" data-leftstock>📦 خزّنها في المخزن</button></div>`;
  if (!L.length) return h + `<p class="hint">مفيش بواقي ${min}×${min} سم أو أكبر — الألواح متقصة كويس.</p></section>`;
  h += `<div class="tblwrap"><table class="tbl"><thead><tr><th>الخامة</th><th>العدد</th><th>المساحة م²</th><th>المقاسات (طول × عرض سم · رقم اللوح)</th></tr></thead><tbody>`;
  for (const x of L) h += `<tr><td>${esc(x.key)}</td><td class="num">${x.list.length}</td><td class="num">${x.area}</td><td>${x.list.slice(0, 14).map((o) => `<span class="rem">${n1(o.w)}×${n1(o.h)} <small>${I18n.isEn() ? "S" : "ل"}${o.sheet}</small></span>`).join(" ")}${x.list.length > 14 ? ` <small>+${x.list.length - 14}</small>` : ""}</td></tr>`;
  return h + `</tbody></table></div><p class="hint">البواقي دي بتتعلّم على رسمة كل لوح تحت (المربعات المتقطّعة). «خزّنها في المخزن» بتضيفها لبواقي كل خامة، وخطة القص الجاية بتستخدمها الأول.</p></section>`;
}
function leftoversText() {
  const L = leftovers();
  return [`بواقي الألواح — ${state.project.name}`, ...L.map((x) => `${x.key}: ${x.list.length} قطعة (${x.area} م²) — ${x.list.map((o) => `${n1(o.w)}×${n1(o.h)}`).join("، ")}`)].join("\n");
}
$("#v-cut").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-leftcopy")) { try { await navigator.clipboard.writeText(leftoversText()); b.textContent = "اتنسخ ✓"; } catch { alertBar("ما قدرتش أنسخ — صدّر Excel وفيه شيت البواقي."); } return; }
  if (b.hasAttribute("data-leftstock")) {
    let n = 0;
    for (const x of leftovers()) { const st = stockOf(x.key); for (const o of x.list) { st.remnants.push({ id: uid(), w: Math.round(o.w), h: Math.round(o.h) }); n++; } }
    save(); alertBar(`اتضاف ${n} باقي للمخزن (الورشة والعميل ← المخزن).`); return;
  }
});
$("#v-cut").addEventListener("change", (e) => {
  if (e.target.id === "leftMin") { state.cutOpts ??= {}; state.cutOpts.leftMin = Math.max(5, toNum(e.target.value) || 30); save(); runCut(); return; }
  if (e.target.dataset.gsheet !== undefined) {
    const o = state.cutOpts; o.sheetFor ??= {};
    const v = e.target.value;
    if (v) o.sheetFor[e.target.dataset.gsheet] = v.split("x").map(Number); else delete o.sheetFor[e.target.dataset.gsheet];
    save(); runCut();
    return;
  }
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
      const gi = grooveInfo({ lb, pt, unitIdx: state.project.units.indexOf(u) });
      h += `<tr><td class="num"><b>${esc(codes.get(pt) || "")}</b></td><td>${esc(pt.name)}${gi ? `<small class="blk" style="color:#8a5a00">${esc(gi.text)}</small>` : ""}${chk ? `<small class="w">${esc(chk)}</small>` : ""}</td><td>${esc(r.names[pt.material] || pt.material)}</td><td class="num">${n1(lb.w)}</td><td class="num">${n1(lb.h)}</td><td class="num">${n1(lb.t)}</td><td class="nw">${band}</td><td class="num">${pt.holes?.length || ""}</td></tr>`;
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
/** a piece's groove (مفحار) in workshop terms: its length, which edge it is measured from and how far,
 *  and its width × depth (the board that slides in + 1 mm). null when the piece has none */
function grooveInfo(pc) {
  const lb = pc.lb, g = lb?.groove;
  if (!g || g.ratio == null) return null;
  const u = state.project.units[pc.unitIdx], p = (u && R(u).params) || {};
  const drawer = /درج/.test(pc.pt.name || "");
  const board = drawer ? +p.drawer_box_base_thickness || 0.6 : +p.back_panel_thickness || +p.back?.thickness || 0.6;
  const gw = Math.round((board * 10 + 1) * 10) / 10;
  const gz = Math.round((drawer ? +p.drawer_box_base_groove || 0.8 : +p.back_groove_depth || +p.back?.groove_depth || 0.8) * 100) / 10;
  const vert = g.axis === "vertical";
  const len = vert ? lb.h : lb.w, across = vert ? lb.w : lb.h;
  const a = g.ratio * across, b = across - a, near = a <= b;
  const from = vert ? (near ? "الشمال" : "اليمين") : near ? "تحت" : "فوق";
  // measured to the groove's near side (the saw/router fence), not its centre
  const dist = Math.max(0, Math.round(((near ? a : b) - gw / 20) * 10) / 10);
  const where = dist < 0.05 ? `على الحرف ${from} (رابيت)` : `على ${n1(dist)} سم من ${from}`;
  return { len: Math.round(len * 10) / 10, dist, from, gw, gz, vert,
    text: `مفحار بطول ${n1(len)} سم · ${where} · ${gw}×${gz} مم`,
    short: `مفحار ${n1(len)} · ${dist < 0.05 ? `على حرف ${from}` : `${n1(dist)} من ${from}`} · ${gw}×${gz}مم` };
}
function pieceSvg(pc, size = 1) {
  const { lb, pt } = pc;
  const W = 120, H = 70;
  const s = Math.min((W - 16) / lb.w, (H - 16) / lb.h);
  const w = lb.w * s, hh = lb.h * s, x0 = (W - w) / 2, y0 = (H - hh) / 2;
  const b = lb.banded;
  const all = pt.band_all_sides;
  let g = `<rect x="${x0}" y="${y0}" width="${w}" height="${hh}" fill="#f4f4f2" stroke="#111" stroke-width="0.8"/>`;
  if (pt.cnc?.outline?.length) {
    const path = (l) => "M" + l.map(([x, y]) => `${(x0 + x * s).toFixed(1)} ${(y0 + (lb.h - y) * s).toFixed(1)}`).join("L") + "Z";
    g = `<rect x="${x0}" y="${y0}" width="${w}" height="${hh}" fill="none" stroke="#bbb" stroke-width="0.5" stroke-dasharray="2 2"/><path d="${path(pt.cnc.outline)}${(pt.cnc.holes || []).map(path).join("")}" fill="#f4f4f2" fill-rule="evenodd" stroke="#111" stroke-width="0.8"/>`;
    for (const pk of pt.cnc.pockets || []) g += `<path d="${path(pk.loop)}" fill="#e3d6b8" stroke="#8a5a00" stroke-width="0.6" stroke-dasharray="2 1.5"/>`;
  }
  const edge = (on, x1, y1, x2, y2) => (on || all ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1f6d3d" stroke-width="3"/>` : "");
  if (!pt.cnc) g += edge(b.left, x0, y0, x0, y0 + hh) + edge(b.right, x0 + w, y0, x0 + w, y0 + hh) + edge(b.bottom, x0, y0 + hh, x0 + w, y0 + hh) + edge(b.top, x0, y0, x0 + w, y0);
  if (lb.groove) {
    const gr = lb.groove, gi = grooveInfo(pc);
    g += gr.axis === "vertical" ? `<line x1="${x0 + gr.ratio * w}" y1="${y0}" x2="${x0 + gr.ratio * w}" y2="${y0 + hh}" stroke="#b07d12" stroke-width="1.4" stroke-dasharray="3 2"/>`
      : `<line x1="${x0}" y1="${y0 + (1 - gr.ratio) * hh}" x2="${x0 + w}" y2="${y0 + (1 - gr.ratio) * hh}" stroke="#b07d12" stroke-width="1.4" stroke-dasharray="3 2"/>`;
    if (gi) {
      const gx = gr.axis === "vertical" ? x0 + gr.ratio * w : x0 + w / 2, gy = gr.axis === "vertical" ? y0 + hh / 2 : y0 + (1 - gr.ratio) * hh;
      const tx = gr.axis === "vertical" ? gx + (gr.ratio < 0.5 ? 5 : -5) : gx, ty = gr.axis === "vertical" ? gy : gy + (gr.ratio < 0.5 ? -3 : 7);
      g += `<text x="${tx}" y="${ty}" font-size="7" font-weight="700" fill="#8a5a00" text-anchor="middle" ${gr.axis === "vertical" ? `transform="rotate(-90 ${tx} ${ty})"` : ""} font-family="Arial, sans-serif" paint-order="stroke" stroke="#fff" stroke-width="2">${n1(gi.len)}</text>`;
    }
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
// ---- the client picks the look himself: finishes the owner allows, each with its price difference
const FRONT_KEY = { kitchen: "front", dressing: "door", panel: "front" };
function clientOpts() { return (state.project.clientOpts ??= { finishes: [], show: true }); }
function clientOptsHtml(appr) {
  const o = state.project.clientOpts || { finishes: [], show: true };
  const libs = [...Object.entries(Catalog.LIB).map(([k, v]) => [k, v[0]]), ...Mat.all().map((m) => [m.id, m.name])];
  let h = `<details ${o.finishes.length ? "open" : ""}><summary>🎨 العميل يختار لون الضلف بنفسه${o.finishes.length ? ` · ${o.finishes.length}` : ""}</summary>
    <p class="hint">ضيف الألوان/الخامات اللي تقبل تشتغلها، وفرق سعر كل واحدة عن التصميم الحالي. العميل بيقلّب بينهم في اللينك، الـ3D والسعر بيتغيروا قدامه، ولما يعتمد اختياره بيوصلك هنا.</p>`;
  o.finishes.forEach((f, i) => {
    h += `<div class="zone-ed"><div class="grid3"><label class="f"><span>الاسم</span><input data-cof="${i}.name" value="${esc(f.name || "")}" placeholder="أبيض مط"></label>
      <label class="f"><span>الخامة</span><select data-cof="${i}.lib">${libs.map(([k, l]) => `<option value="${k}" ${k === f.lib ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      <label class="f"><span>فرق السعر (ج.م، + أو −)</span><input type="text" inputmode="decimal" data-numf data-cof="${i}.delta" value="${f.delta ?? 0}"></label></div>
      <button class="danger sm" data-cofdel="${i}" aria-label="شيل">${ICON.trash}</button></div>`;
  });
  h += `<div class="btnrow"><button class="ghost2" data-cofadd>+ لون/خامة</button><label class="chk"><input type="checkbox" data-cofshow ${o.show !== false ? "checked" : ""}> اعرض السعر الإجمالي للعميل</label></div>`;
  if (appr?.finish) {
    const f = o.finishes.find((x) => x.id === appr.finish);
    h += `<p class="okmsg">${ICON.check} العميل اختار: <b>${esc(appr.finishName || f?.name || "")}</b>${appr.total ? ` — ${money(appr.total)} ج.م` : ""}</p>${f ? `<button class="primary" data-cofapply="${f.id}">طبّق اختياره على التصميم</button>` : ""}`;
  }
  return h + `</details>`;
}
function applyFinish(units, lib) {
  return units.map((u) => { const k = FRONT_KEY[u.kind]; return k ? { ...u, libs: { ...(u.libs || {}), [k]: lib } } : u; });
}
/** production at a glance: every stage's count and every unit's progress, from the workers' QR scans */
function prodBoard(pieces, prog) {
  if (!pieces.length) return "";
  const st = STAGES.map((_, i) => pieces.filter((pc) => (prog[pc.key] || 0) > i).length);
  let h = `<div class="prodst">${STAGES.map((l, i) => `<div><b>${st[i]}</b><span>${l}</span><i style="--p:${Math.round((st[i] / pieces.length) * 100)}%"></i></div>`).join("")}</div><div class="produ">`;
  const by = new Map();
  for (const pc of pieces) { const k = pc.ucode + " " + pc.unit; const a = by.get(k) || []; a.push(pc); by.set(k, a); }
  for (const [k, list] of by) {
    const sum = list.reduce((a, pc) => a + Math.min(4, prog[pc.key] || 0), 0), pct = Math.round((sum / (list.length * 4)) * 100);
    const slow = list.filter((pc) => (prog[pc.key] || 0) === 0).length;
    h += `<div class="pu"><span>${esc(k)}</span><i style="--p:${pct}%"></i><b>${pct}%</b>${slow && pct > 0 ? `<small>${slow} قطعة لسه ما اتقصتش</small>` : ""}</div>`;
  }
  return h + `</div>`;
}
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
    <section class="mgroup"><div class="mg-h"><h3>العميل</h3>${appr?.status === "approved" ? `<span class="pill">${ICON.check} اتعمد ${appr.at ? new Date(appr.at).toLocaleDateString("ar-EG") : ""}${appr.variantName ? ` — اختار «${esc(appr.variantName)}»` : ""}</span>` : `<span class="pill soft">لسه ما اتعمدش</span>`}</div>
      <p class="hint">بيتبعت نسخة من التصميم دلوقتي. لو عدّلت بعد كده دوس "حدّث النسخة المبعوتة".</p>
      ${clientOptsHtml(appr)}
      ${online ? `<div class="btnrow"><button class="primary" data-publish="client">${ICON.share}${ui.sharedAt ? "حدّث النسخة المبعوتة" : "جهّز لينك العميل"}</button></div>
      ${ui.sharedAt ? linkBox(`${APP_URL}#c-${pid}`) : ""}` : `<p class="e">لينك العميل واختيار اللون بالسعر شغالين من نسخة NOVERA أونلاين بس (عشان العميل يفتح نفس التصميم من موبايله). افتحها من هنا وانت مسجّل دخول، وانقل المشروع بـ«تصدير ← نسخة من المشروع» لو مش موجود هناك.</p>${window.noveraNative ? "" : `<div class="btnrow"><a class="primary" style="text-decoration:none" href="${APP_URL}" target="_blank" rel="noopener">افتح NOVERA أونلاين</a></div>`}`}
    </section>
    <section class="mgroup"><div class="mg-h"><h3>الورشة</h3><span class="pill soft">${doneN} / ${pieces.length} قطعة خلصت</span></div>
      <p class="hint">كل ملصق عليه QR. العامل يصوّره بكاميرا الموبايل، تفتحله القطعة ويعلّم المرحلة اللي خلصها.</p>
      ${prodBoard(pieces, prog)}
      <div class="btnrow"><label class="f"><span>مقاس الملصقات</span><select id="labelFmt"><option value="a4" ${state.labelFmt === "a4" ? "selected" : ""}>A4 — 21 ملصق في الورقة</option><option value="roll" ${state.labelFmt === "roll" ? "selected" : ""}>رول 60×40 مم</option></select></label>
      <button class="primary" data-labels>ملف الملصقات PDF</button></div>
      ${online ? `<div class="btnrow"><button class="ghost2" data-publish="work">${ICON.share}${ui.sharedAt ? "حدّث نسخة الورشة" : "جهّز لينك الورشة"}</button></div>${ui.sharedAt ? linkBox(`${APP_URL}#w-${pid}`) : ""}` : ""}
      <p class="hint" id="labelMsg"></p>
    </section>
  </div>
  ${stagesHtml()}
  ${quoteHtml()}
  ${stockHtml()}
  <section class="mgroup"><div class="mg-h"><h3>معاينة الملصقات</h3><span class="pill soft">${pieces.length} ملصق</span></div><div class="labprev">`;
  const sheets = sheetIndex();
  for (const pc of pieces.slice(0, 24)) {
    const st = prog[pc.key] || 0;
    h += `<div class="labcard"><div class="lt"><span class="ucode">${esc(pc.key)}</span><b>${esc(pc.pt.name)}</b><span class="num">${n1(pc.lb.w)}×${n1(pc.lb.h)}</span></div><div class="lm">${pieceSvg(pc, 1)}<span class="qr">${qrSvg(pieceUrl(pid, pc.key), 56)}</span></div>
      ${(() => { const gi = grooveInfo(pc); return gi ? `<div class="lgr">${esc(gi.short)}</div>` : ""; })()}
      <div class="lb"><span>${esc(pc.unit)}</span><span>${esc(sheets[pc.key] || pc.mname)}</span></div><div class="stg">${STAGES.map((s, i) => `<i class="${i < st ? "on" : ""}">${s}</i>`).join("")}</div></div>`;
  }
  if (pieces.length > 24) h += `<p class="hint">… و${pieces.length - 24} ملصق تاني في الملف.</p>`;
  el.innerHTML = h + `</div></section>`;
}
const linkBox = (url) => `<div class="linkbox"><input readonly value="${esc(url)}" aria-label="اللينك"><button class="ghost2" data-copy="${esc(url)}">انسخ</button></div>`;

$("#v-shop").addEventListener("change", (e) => {
  setTimeout(settingsPush, 0); // prices are account settings too
  const t = e.target;
  if (t.id === "labelFmt") { state.labelFmt = t.value; save(); return; }
  if (t.id === "useStock") { state.cutOpts.useStock = t.checked; save(); runCut(() => drawShop()); return; }
  if (t.dataset.stsheets) { stockOf(t.dataset.stsheets).sheets = Math.max(0, Math.round(+t.value || 0)); save(); drawShop(); return; }
  const sk = t.dataset.stg || t.dataset.stgdate || t.dataset.stgby;
  if (sk) {
    const st = stagesOf(), s = (st[sk] ??= {});
    if (t.dataset.stg) s.done = t.checked ? new Date().toISOString() : null;
    else if (t.dataset.stgdate) { if (s.done) s.done = t.value ? new Date(t.value).toISOString() : s.done; else s.plan = t.value; }
    else s.by = t.value;
    save(); drawShop(); syncShared();
    return;
  }
  if (t.dataset.cof) {
    const [i, f] = t.dataset.cof.split(".");
    const o = clientOpts(), it = o.finishes[+i];
    if (it) { it[f] = f === "delta" ? toNum(t.value) : t.value; if (f === "lib" && !it.name) it.name = Catalog.LIB[t.value]?.[0] || Mat.get(t.value)?.name || ""; }
    save(); syncShared(); drawShop(); return;
  }
  if (t.hasAttribute?.("data-cofshow")) { clientOpts().show = t.checked; save(); syncShared(); return; }
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
  if (b.dataset.pmode) { priceDefaults().mode = b.dataset.pmode; save(); settingsPush(); drawShop(); return; }
  if (b.dataset.remadd) {
    const k = b.dataset.remadd, w = +document.querySelector(`[data-remw="${CSS.escape(k)}"]`)?.value, hh = +document.querySelector(`[data-remh="${CSS.escape(k)}"]`)?.value;
    if (w > 5 && hh > 5) { stockOf(k).remnants.push({ id: uid(), w, h: hh }); save(); runCut(() => drawShop()); }
    return;
  }
  if (b.dataset.remdel) { const [k, id] = b.dataset.remdel.split("|"); const st = stockOf(k); st.remnants = st.remnants.filter((r) => r.id !== id); save(); runCut(() => drawShop()); return; }
  if (b.hasAttribute("data-buywa")) {
    const P = priceDefaults(), ph = String(P.supplier || "").replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${ph}?text=${encodeURIComponent(purchaseText())}`, "_blank");
    return;
  }
  if (b.hasAttribute("data-stocktake")) { takeStock(!!state.project.stockTaken); alertBar(state.project.stockTaken ? "اتخصم من المخزن واتضافت البواقي الجديدة." : "رجعت الكميات زي ما كانت."); runCut(() => drawShop()); return; }
  if (b.dataset.copy) {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "اتنسخ"; } catch { b.previousElementSibling.select(); }
  } else if (b.hasAttribute("data-cofadd")) {
    const o = clientOpts(), u0 = state.project.units[0];
    const cur = u0 ? R(u0).libOf?.(FRONT_KEY[u0.kind]) : null;
    o.finishes.push({ id: uid(), name: cur ? (Catalog.LIB[cur]?.[0] || "") : "", lib: cur || "hpl_white", delta: 0 });
    save(); syncShared(); drawShop();
  } else if (b.dataset.cofdel != null) {
    clientOpts().finishes.splice(+b.dataset.cofdel, 1); save(); syncShared(); drawShop();
  } else if (b.dataset.cofapply) {
    const f = clientOpts().finishes.find((x) => x.id === b.dataset.cofapply);
    if (f) { state.project.units = applyFinish(state.project.units, f.lib); save(); render(true); alertBar(`اتطبّق «${f.name}» على ضلف كل الوحدات.`); }
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
    const vs = (p.variants || []).length > 1 ? p.variants.map((v) => ({ id: v.id, name: v.name, units: variantUnits(v) })) : null;
    await cloud.db.doc(`shared/${p.id}`).set({ name: p.name, units: p.units, room: p.room || null, mats: p.mats || [], variants: vs, variant: p.variant || null, stages: p.stages || {}, sharedAt: new Date().toISOString(),
      clientOpts: p.clientOpts?.finishes?.length ? { finishes: p.clientOpts.finishes, show: p.clientOpts.show !== false, base: Math.round(quoteCalc()?.total || 0) } : null });
    ui.sharedAt = new Date().toISOString();
  } catch { alertBar("ما قدرتش أبعت النسخة — جرّب تاني."); }
}
/** keep the client's copy up to date when the stages change (only once it was shared) */
function syncShared() { if (!cloud.db || !ui.sharedAt) return; clearTimeout(ui.syncT); ui.syncT = setTimeout(() => publishShared(), 800); }
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
  let h = `<p class="hint">تصميم من NOVERA</p><h2>${esc(sp.name)}</h2>`;
  if (sp.stages && Object.values(sp.stages).some((x) => x?.done)) {
    const n = stageNow(sp);
    h += `<div class="clstage"><small>المشروع دلوقتي: <b>${esc(n.cur)}</b> (${n.done} من ${n.total})</small><div class="stbar">${PSTAGES.map(([k, l]) => `<i class="${sp.stages[k]?.done ? "on" : ""}" title="${l}"></i>`).join("")}</div></div>`;
  }
  if (sp.variants?.length > 1) {
    ui.clientVar ??= sp.variant || sp.variants[0].id;
    h += `<h3 class="sub">اختار النسخة</h3><div class="seg cvars">${sp.variants.map((v) => `<button data-cvar="${v.id}" class="${v.id === ui.clientVar ? "on" : ""}">${esc(v.name)}</button>`).join("")}</div>`;
  }
  h += `<div class="strip col">`;
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
  const co = sp.clientOpts;
  if (co?.finishes?.length) {
    ui.clientFinish ??= appr?.finish || null;
    const f = co.finishes.find((x) => x.id === ui.clientFinish);
    h += `<h3 class="sub">اختار لون الضلف</h3><div class="cfin">${co.finishes.map((x) => { const L = Catalog.LIB[x.lib], m = !L && Mat.get(x.lib);
      return `<button data-cfin="${x.id}" class="${x.id === ui.clientFinish ? "on" : ""}"><i style="background:${m ? `url('${m.img}') center/cover` : L?.[2] || "#ccc"}"></i><span>${esc(x.name || L?.[0] || "")}</span>${co.show && +x.delta ? `<small>${+x.delta > 0 ? "+" : "−"}${money(Math.abs(+x.delta))}</small>` : ""}</button>`; }).join("")}</div>`;
    if (co.show && co.base) h += `<p class="ctotal">الإجمالي: <b>${money(co.base + (+f?.delta || 0))} ج.م</b></p>`;
  }
  h += `<div class="approve">${appr?.status === "approved" ? `<p class="okmsg">${ICON.check} التصميم اتعمد. شكراً!</p>` : `<button class="primary big" data-approve>اعتماد التصميم</button>`}
    <button class="ghost2 big" data-note>عندي ملاحظة</button><p class="hint" id="clMsg"></p></div>`;
  $(".cl-side").innerHTML = h;
}
$("#v-client").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.cfin) {
    const sp = ui.sharedProject, f = sp.clientOpts?.finishes?.find((x) => x.id === b.dataset.cfin);
    if (!f) return;
    ui.clientFinish = f.id;
    sp.__base ??= sp.units;
    sp.units = applyFinish(sp.__base, f.lib);
    ui.clientUnit = sp.units.find((x) => x.id === ui.clientUnit?.id) || sp.units[0];
    clientSide(); view.update(true);
    return;
  }
  if (b.dataset.cvar) {
    const sp = ui.sharedProject, v = sp.variants.find((x) => x.id === b.dataset.cvar);
    if (!v) return;
    ui.clientVar = v.id; sp.units = v.units; sp.__base = v.units;
    const cf = sp.clientOpts?.finishes?.find((x) => x.id === ui.clientFinish);
    if (cf) sp.units = applyFinish(v.units, cf.lib);
    ui.clientUnit = sp.units[0] || null; ui.clientWhole = sp.units.length > 1;
    clientSide(); view.update(true);
    return;
  }
  if (b.hasAttribute("data-cwhole")) { ui.clientWhole = true; clientSide(); view.update(true); }
  else if (b.dataset.cunit) { ui.clientWhole = false; ui.clientUnit = ui.sharedProject.units.find((x) => x.id === b.dataset.cunit); clientSide(); view.update(true); }
  else if (b.hasAttribute("data-approve")) {
    try {
      const cv = ui.sharedProject.variants?.find((x) => x.id === ui.clientVar);
      const co = ui.sharedProject.clientOpts, cf = co?.finishes?.find((x) => x.id === ui.clientFinish);
      await cloud.db.doc(`approvals/${ui.sharedPid}`).set({ status: "approved", by: cloud.me || null, at: new Date().toISOString(), ...(cv ? { variant: cv.id, variantName: cv.name } : {}),
        ...(cf ? { finish: cf.id, finishName: cf.name, total: co.base ? co.base + (+cf.delta || 0) : null } : {}) });
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
      <span>الأخرام</span><b>${(pc.pt.holes || []).length}</b>${(() => { const gi = grooveInfo(pc); return gi ? `<span>المفحار</span><b>${esc(gi.text.replace(/^مفحار /, ""))}</b>` : ""; })()}<span>الكود</span><b class="num">${esc(pc.key)}</b></div>
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
// ---- doors and drawers opening into each other, into the next unit, a wall or a column
const segX = (p1, p2, q1, q2) => {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(q1, q2, p1), d2 = d(q1, q2, p2), d3 = d(p1, p2, q1), d4 = d(p1, p2, q2);
  return ((d1 > 0.01 && d2 < -0.01) || (d1 < -0.01 && d2 > 0.01)) && ((d3 > 0.01 && d4 < -0.01) || (d3 < -0.01 && d4 > 0.01));
};
const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
const segHitsPoly = (a, b, poly) => inPoly(a, poly) || inPoly(b, poly) || poly.some((p, i) => segX(a, b, p, poly[(i + 1) % poly.length]));
const shrink = (poly, e) => { const c = poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]); return poly.map(([x, y]) => { const dx = x - c[0], dy = y - c[1], l = Math.hypot(dx, dy) || 1; return [x - (dx / l) * e, y - (dy / l) * e]; }); };
/** where each unit's doors (every 15° of their swing) and pulled-out drawers go, in room plan coords */
function openPaths(it) {
  const r = R(it.u);
  if (!r.ok) return [];
  const lift = +it.u.lift || 0;
  const ex = Room.axisX(it.pose.rot), ez = Room.axisZ(it.pose.rot);
  const W = ([x, y]) => [it.pose.x + ex[0] * x - ez[0] * y, it.pose.z + ex[1] * x - ez[1] * y];
  const boxes = new Map();
  const addB = (k, b) => { const o = boxes.get(k); boxes.set(k, o ? { x0: Math.min(o.x0, b.x0), x1: Math.max(o.x1, b.x1), y0: Math.min(o.y0, b.y0), y1: Math.max(o.y1, b.y1), z0: Math.min(o.z0, b.z0), z1: Math.max(o.z1, b.z1) } : { ...b }); };
  if (r.meshes) r.meshes.forEach((m) => { if (m.mover != null) addB(m.mover, m.box); });
  else r.parts.forEach((p, i) => { const k = r.partMover?.[i]; if (k != null && p.box) addB(k, p.box); });
  const out = [];
  (r.movers || []).forEach((mv, k) => {
    const b = boxes.get(k);
    if (!b) return;
    const z = [b.z0 + lift, b.z1 + lift];
    if (mv.kind === "door") {
      if (Math.abs(mv.axis[2]) < 0.5) return; // flaps open upwards
      const h = mv.hinge, f = mv.free, a = mv.axis[2] >= 0 ? 1 : -1;
      const v = [f[0] - h[0], f[1] - h[1]];
      const cr = [a * -v[1] * 0, 0];
      void cr;
      // sign: same rule as the 3D view (axis × (free − hinge) · normal)
      const cx = [-a * v[1], a * v[0]];
      const sign = cx[0] * mv.normal[0] + cx[1] * mv.normal[1] >= 0 ? 1 : -1;
      const max = mv.maxAng ?? Math.PI / 2;
      const segs = [];
      for (let ang = Math.PI / 12; ang <= max + 1e-6; ang += Math.PI / 12) {
        const t = sign * a * ang, c = Math.cos(t), s2 = Math.sin(t);
        const e = [h[0] + v[0] * c - v[1] * s2, h[1] + v[0] * s2 + v[1] * c];
        segs.push([W([h[0], h[1]]), W(e)]);
      }
      out.push({ kind: "door", name: mv.name, segs, z });
    } else if (mv.kind === "drawer") {
      const d = Math.max(mv.slide, 20) * 1.4, n = mv.normal;
      const poly = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map(([x, y]) => W([x + n[0] * d, y + n[1] * d]));
      out.push({ kind: "drawer", name: mv.name, poly, z });
    }
  });
  return out;
}
function swingChecks(items, add, room, label) {
  const zr = (it) => { const r = R(it.u), lift = +it.u.lift || 0; const bs = r.meshes ? r.meshes.map((m) => m.box) : r.parts.filter((p) => p.box).map((p) => p.box); return [Math.min(...bs.map((b) => b.z0)) + lift, Math.max(...bs.map((b) => b.z1)) + lift]; };
  const zo = (a, b) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 1;
  const paths = new Map(items.map((it) => [it.id, openPaths(it)]));
  const said = new Set(), both = [];
  const once = (key, lvl, txt, id) => { if (said.has(key)) return; said.add(key); add(lvl, txt, id); };
  const walls = room ? Room.segments(room).map((sg) => [sg.A, sg.B]) : [];
  const cols = (room?.columns || []).map((c) => [[c.x, c.z], [c.x + c.w, c.z], [c.x + c.w, c.z + c.d], [c.x, c.z + c.d]]);
  for (const A of items) {
    for (const p of paths.get(A.id)) {
      const pSegs = p.kind === "door" ? p.segs : p.poly.map((q, i) => [q, p.poly[(i + 1) % p.poly.length]]);
      // the other units' bodies
      for (const B of items) {
        if (B.id === A.id || !zo(p.z, zr(B))) continue;
        const fp = shrink(Room.footprint(B.pose, B.box), 0.6);
        if (pSegs.some(([a, b]) => segHitsPoly(a, b, fp))) once(`${A.id}|${p.name}|${B.id}`, "w", `${label(A)}: ${p.name} لما ${p.kind === "door" ? "تتفتح بتخبط" : "يتفتح بيخبط"} في ${label(B)}.`, A.id);
        // both open at once
        for (const q of paths.get(B.id) || []) {
          if (!zo(p.z, q.z)) continue;
          const qSegs = q.kind === "door" ? q.segs : q.poly.map((x, i) => [x, q.poly[(i + 1) % q.poly.length]]);
          const pair = [A.id, B.id].sort().join("|");
          if (!said.has(pair) && pSegs.some(([a, b]) => qSegs.some(([c, d]) => segX(a, b, c, d)))) {
            said.add(pair);
            both.push({ id: A.id, txt: `${label(A)} و${label(B)}: ${p.name} و${q.name} بيخبطوا في بعض لو اتفتحوا في نفس الوقت — افتح واحدة بس في المرة أو حط فيلر بينهم.`, short: `${A.u.code}↔${B.u.code}` });
          }
        }
      }
      // walls and columns
      if (walls.some(([a, b]) => pSegs.some(([c, d]) => segX(a, b, c, d)))) once(`${A.id}|${p.name}|wall`, "w", `${label(A)}: ${p.name} ${p.kind === "door" ? "بتخبط في الحيطة قبل ما تفتح للآخر" : "بيخبط في الحيطة"} — سيب فيلر جنبها أو غيّر اتجاه المفصلة.`, A.id);
      if (cols.some((c) => pSegs.some(([a, b]) => segHitsPoly(a, b, shrink(c, 0.5))))) once(`${A.id}|${p.name}|col`, "w", `${label(A)}: ${p.name} بيخبط في العمود وهو بيتفتح.`, A.id);
    }
  }
  if (both.length <= 3) for (const x of both) add("n", x.txt, x.id);
  else add("n", `${both.length} أماكن فيها ضلف أو أدراج بيخبطوا في بعض لو اتفتحوا في نفس الوقت (أغلبها جنب الزوايا): ${both.map((x) => x.short).join("، ")} — عادي في المطابخ، بس الأحسن تحط فيلر 3–5 سم جنب الزوايا.`, both[0].id);
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
  // pieces the workshop can't cut: longer than the biggest board, or thinner than a strip the saw can hold
  for (const u of project.units) {
    const r = R(u);
    if (!r.ok) continue;
    const big = [], thin = [];
    for (const pt of r.parts) {
      if (!pt.cut_piece || !pt.label || ["glass", "mirror", "frame", "door_frame_alu", "rail"].includes(pt.material)) continue;
      if (/^(alu_|stainless|copper)/.test(r.libOf?.(pt.material) || "")) continue;
      const L = Math.max(pt.label.w, pt.label.h), S = Math.min(pt.label.w, pt.label.h);
      const back = pt.role === "back" || /^ظهر|^ضهر/.test(pt.name);
      if (!back && (L > 364 || S > 205 || (L > 278 && S > 181))) big.push(`${pt.name} ${n1(pt.label.w)}×${n1(pt.label.h)}`);
      if (S < 1.5 && pt.label.t >= 1) thin.push(`${pt.name} (${n1(S)} سم)`);
    }
    if (big.length) add("e", `${u.code} ${u.name}: ${big.slice(0, 3).join("، ")} — أكبر من أي لوح (لحد 366×183 أو 280×207). قسّم الوحدة لوحدتين أو صغّر المقاس.`, u.id);
    if (thin.length) add("w", `${u.code} ${u.name}: شرايح رفيعة قوي ${thin.slice(0, 2).join("، ")} — صعب تتقص على المنشار، الأحسن بروفايل أو تزوّد الفيلر.`, u.id);
  }
  swingChecks(items, add, room, label);
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
    // in front of a door / window from another wall (near a corner) or a corner unit in one
    for (const it of items) {
      const o = Room.keepoutHit(room, Room.footprint(it.pose, it.box), it.row);
      if (!o || o.wall === it.pose.wall) continue;
      const sg = segs.find((g) => g.id === o.wall);
      add(o.kind === "door" ? "e" : "w", `${label(it)} واقفة قدام ${o.kind === "door" ? "باب" : "شباك"} حيطة ${(sg?.i ?? 0) + 1} (جنب الركن) — ${o.kind === "door" ? "الباب مش هيفتح" : "هتقفل الشباك"}.`, it.id);
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
    // ---- kitchen ergonomics: the work triangle, the hob's neighbours, hood height, corners, walkways
    const kit = items.filter((it) => it.u.kind === "kitchen");
    const prm = (it) => R(it.u).params || {};
    const isHob = (it) => /بوتجاز|مسطح|hob/i.test(`${prm(it).unit_label || ""} ${it.u.name}`);
    const ctr = (it) => Room.centerOf(it.pose, it.box);
    const dist = (a, b) => Math.hypot(ctr(a)[0] - ctr(b)[0], ctr(a)[1] - ctr(b)[1]);
    const sinkIt = kit.find((it) => prm(it).include_sink_cutout), hobIt = kit.find(isHob), frIt = kit.find((it) => prm(it).unit_category === "fridge");
    if (sinkIt && hobIt && frIt) {
      const sum = dist(sinkIt, hobIt) + dist(hobIt, frIt) + dist(frIt, sinkIt);
      if (sum > 790) add("w", `مثلث الشغل (حوض ↔ بوتجاز ↔ تلاجة) ${n1(sum / 100)} م — طويل، الأحسن بين 4 و7.9 م.`);
      else if (sum < 400) add("w", `مثلث الشغل ${n1(sum / 100)} م بس — المطبخ هيبقى زحمة وانت بتشتغل.`);
      else add("n", `مثلث الشغل ${n1(sum / 100)} م — مظبوط ✓`);
    }
    const gapOn = (a, b) => {
      if (!a.pose.wall || a.pose.wall !== b.pose.wall || a.pose.s == null || b.pose.s == null) return null;
      const wa = a.box.x1 - a.box.x0, wb = b.box.x1 - b.box.x0;
      return Math.max(b.pose.s - (a.pose.s + wa), a.pose.s - (b.pose.s + wb));
    };
    if (hobIt) {
      for (const o of kit) {
        if (o === hobIt || o.row === "upper") continue;
        const g = gapOn(hobIt, o);
        if (g == null || g > 25) continue;
        if (prm(o).unit_category === "fridge") add("w", `${label(hobIt)} جنب التلاجة على طول — الحرارة بتبوّظها؛ سيب وحدة 30 سم على الأقل بينهم.`, hobIt.id);
        if (prm(o).include_sink_cutout && g < 25) add("w", `${label(hobIt)} قريب قوي من الحوض (${n1(Math.max(0, g))} سم) — سيب 30–60 سم للمية والزيت.`, hobIt.id);
      }
      const sg = segs.find((x) => x.id === hobIt.pose.wall);
      if (sg && hobIt.pose.s != null) {
        const w = hobIt.box.x1 - hobIt.box.x0, endGap = Math.min(hobIt.pose.s, sg.L - hobIt.pose.s - w);
        const tallNear = kit.some((o) => o.row === "tall" && (gapOn(hobIt, o) ?? 99) < 25);
        if (endGap < 25 || tallNear) add("w", `${label(hobIt)} لازق في ${tallNear ? "وحدة طويلة" : "الحيطة"} — سيب 30 سم على الأقل عشان يد الحلل والمقابض.`, hobIt.id);
      }
      for (const o of kit) {
        if (o.row !== "upper" || o.pose.wall !== hobIt.pose.wall) continue;
        const g = gapOn(hobIt, o);
        if (g == null || g > -5) continue;
        const clear = (+prm(o).wall_mount_height || 140) - ((+prm(hobIt).height || 72) + (+prm(hobIt).toe_kick_height || 10) + (+prm(hobIt).countertop_thickness || 3.8));
        if (clear < 65) add("w", `${label(o)} فوق البوتجاز على ${n1(clear)} سم بس — الشفاط محتاج 65 سم على الأقل (غاز 75).`, o.id);
      }
    }
    // inner corners with units on both walls and no corner unit → doors and handles clash
    for (let i = 0; i < segs.length; i++) {
      const inc = segs[i], out = segs[(i + 1) % segs.length];
      if (!room.closed && i === segs.length - 1) continue;
      if (Math.hypot(inc.B[0] - out.A[0], inc.B[1] - out.A[1]) > 1) continue;
      const nearC = (it) => Room.footprint(it.pose, it.box).some((q) => Math.hypot(q[0] - inc.B[0], q[1] - inc.B[1]) < 70);
      for (const row of ["lower", "upper"]) {
        const a = items.find((it) => it.row === row && it.pose.wall === inc.id && nearC(it)), b = items.find((it) => it.row === row && it.pose.wall === out.id && nearC(it));
        const corner = items.some((it) => (it.row === row || it.row === "tall") && !it.pose.wall && nearC(it));
        if (a && b && !corner) add("w", `ركنة حيطة ${inc.i + 1}/${out.i + 1}${row === "upper" ? " (العلوي)" : ""} من غير وحدة زاوية — سيب فيلر 5–10 سم عشان الضلف والمقابض ما يخبطوش في بعض.`, a.id);
      }
    }
    // walkway between two opposite runs
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const A = segs[i], B = segs[j];
      if (A.d[0] * B.d[0] + A.d[1] * B.d[1] > -0.95) continue;
      const da = items.filter((it) => it.pose.wall === A.id && it.row !== "upper"), db = items.filter((it) => it.pose.wall === B.id && it.row !== "upper");
      if (!da.length || !db.length) continue;
      const gap = Math.abs((B.A[0] - A.A[0]) * A.n[0] + (B.A[1] - A.A[1]) * A.n[1]) - Math.max(...da.map((x) => x.box.y1 - x.box.y0)) - Math.max(...db.map((x) => x.box.y1 - x.box.y0));
      if (gap < 100) add("w", `الممر بين حيطة ${A.i + 1} وحيطة ${B.i + 1} ${n1(gap)} سم — أقل من 100 سم ضيق (الأدراج والضلف هتقفل الممر).`);
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
  if (/^جنب سكلو/.test(n)) return 0; // the plinth drawer's runners go under the bottom with the carcass
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
  if (r.parts.some((pt) => /^جنب سكلو/.test(pt.name))) {
    const kp = r.params || {};
    steps[0].d += ` درج الوزرة: ثبّت جنبي السكلو تحت القاعدة من جوه الأجناب بالأليتا (الأخرام متعلّمة)، على بعد ${n1(+kp.toe_kick_drawer_setback || 0)} سم من قدام.`;
    steps[5].d += ` درج الوزرة: المجرى بيتركب على جنبي السكلو من جوه، على ارتفاع قاعدة صندوقه من الأرض (في جدول مقاسات التركيب)، والوش بيتظبط على خلوص ${n1(+(kp.toe_kick_drawer_floor_gap ?? 1))} سم من الأرض.`;
  }
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
/** what kind of piece a part is, from its name (and role when the engine gives one) */
function partClass(name, role) {
  const n = String(name || ""), tail = n.split(" - ").pop().trim();
  const e = { role };
  let cls = "other";
  if (e.role === "led" || /ليد/.test(tail)) cls = "led";
  else if (/مقبض/.test(tail) || e.role === "handle") cls = "handle";
  else if (/^درج وزرة$/.test(tail) && !n.includes(" - ")) cls = "drawer"; // the plinth drawer: front …
  else if (/^درج وزرة - /.test(n)) cls = "drawerBox"; // … and its box
  else if (/^جنب سكلو/.test(tail)) cls = "other"; // its runners: part of the carcass
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
  return cls;
}
/** the unit's elements with their boxes (unit cm: x across, y depth (front = small y), z up) and a class */
function unitElems(r) {
  const src = r.meshes ? r.meshes.map((m) => ({ name: m.name, role: null, box: m.box, drawer: m.drawer, door: m.door }))
    : (r.parts || []).filter((p) => p.box).map((p) => ({ name: p.name, role: p.role, box: p.box, group: p.group, part: p }));
  const out = [];
  for (const e of src) {
    const n = String(e.name || ""), tail = n.split(" - ").pop().trim();
    if (e.role === "hole" || /كبة|خرم|ثقب|أليتا|دوبل|مينيفكس|فرش/.test(n)) continue;
    const cls = partClass(n, e.role);
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
    const ref = /^درج وزرة/.test(e.name) ? 0 : refOf(e); // the plinth drawer is measured from the floor
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
  if (want(5) && L.drawers.length) h += `<h4 class="advh">الأدراج — المجرى وتحت الصندوق على</h4>` + t(["الدرج", "المجرى على", "الصندوق", "المجرى"], L.drawers.map((d) => [nm(d) + `<small class="blk">${/^درج وزرة/.test(d.name) ? "من الأرض · " : ""}الوش ${n1(d.f0)} ← ${n1(d.f1)}</small>`, d.run === null ? "—" : `<b>${n1(d.run)}</b>`, d.bh === null ? "—" : `${n1(d.bh)}×${n1(d.depth)}`, d.slide ? `${d.slide} سم` : "—"]));
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
  state.prices.mode ??= "area"; state.prices.waste ??= 10; state.prices.m2 ??= {};
  return state.prices;
}
/** costs of the current project from the cut plan, hardware and labour; null until the cut plan is ready */
/** price of one m² of a material group: typed, else its sheet price over the sheet's area */
function m2Price(g, P = priceDefaults()) {
  if (+P.m2?.[g.key] > 0) return +P.m2[g.key];
  const sh = g.sheet || groupSheet(g), sp = +P.sheets[g.key] || +P.defaultSheet || 0;
  return sp ? sp / ((sh.w * sh.h) / 10000) : 0;
}
function quoteCalc() {
  if (!cutData?.results) return null;
  const P = priceDefaults();
  const byArea = P.mode === "area", wf = 1 + (+P.waste || 0) / 100;
  const lines = [];
  let mat = 0;
  // material per unit (area mode): every piece's own surface × its material's m² price (+ waste)
  ensureCodes(state.project);
  const codeOf = new Map(state.project.units.map((u) => [u.code, u.id]));
  const unitMat = new Map();
  for (const g of cutData.groups) {
    if (byArea) {
      const pm = m2Price(g, P);
      let a = 0;
      for (const p of g.parts) {
        const pa = (p.w * p.h) / 10000;
        a += pa;
        const uid0 = codeOf.get(String(p.key).split("-")[0]);
        if (uid0) unitMat.set(uid0, (unitMat.get(uid0) || 0) + pa * wf * pm);
      }
      const q = Math.round(a * wf * 100) / 100;
      lines.push({ k: "m2", key: g.key, label: `${g.key} (${n1(a)} م² + ${+P.waste || 0}% هالك)`, qty: q, unit: "م²", price: Math.round(pm), total: q * pm });
      mat += q * pm;
    } else {
      const n = cutData.results[g.key].sheets.filter((s) => s.stock !== "remnant").length, pr = +P.sheets[g.key] || +P.defaultSheet || 0;
      lines.push({ k: "sheet", key: g.key, label: `ألواح ${g.key}`, qty: n, unit: "لوح", price: pr, total: n * pr });
      mat += n * pr;
    }
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
  let usedA = 0, sheetA = 0;
  for (const g of cutData.groups) for (const sh of cutData.results[g.key].sheets) { sheetA += sh.w * sh.h; usedA += (sh.util || 0) * sh.w * sh.h; }
  const waste = sheetA ? Math.round((1 - usedA / sheetA) * 100) : null;
  // the client sees one price per unit
  let perUnit;
  if (byArea) {
    // each unit from its own pieces: their surface, its banding, its hardware, its labour (+ its share of the install by area)
    perUnit = state.project.units.filter((u) => unitArea.has(u.id)).map((u) => {
      const r = R(u);
      let hwU = 0;
      for (const [k, q] of Object.entries(r.hardware || {})) hwU += q * (+P.hw[k] || 0);
      const a = unitArea.get(u.id) || 0;
      const c = (unitMat.get(u.id) || 0) + r.banding * (+P.band || 0) + hwU + (+P.laborUnit || 0) + a * (+P.laborM2 || 0) + (area ? ((+P.install || 0) * a) / area : 0);
      return { u, price: c * (1 + (+P.margin || 0) / 100), cost: c, area: a };
    });
  } else perUnit = state.project.units.filter((u) => unitArea.has(u.id)).map((u) => ({ u, price: area ? (total * unitArea.get(u.id)) / area : total / Math.max(1, units), area: unitArea.get(u.id) }));
  return { lines, mat, band, hwT, labor, cost, total, perUnit, area, waste, byArea };
}
function quoteHtml() {
  const P = priceDefaults(), Q = quoteCalc();
  if (!Q) return `<section class="mgroup"><div class="mg-h"><h3>الأسعار وعرض السعر</h3></div><div class="busy"><span class="spin" aria-hidden="true"></span>بيحسب الألواح…</div></section>`;
  const pin = (k, v, label, step = 1) => `<label class="f"><span>${esc(label)}</span><input type="text" inputmode="decimal" data-numf step="${step}" data-price="${esc(k)}" value="${v ?? ""}"></label>`;
  let h = `<section class="mgroup"><div class="mg-h"><h3>الأسعار وعرض السعر</h3><span class="pill">${money(Q.total)} ج.م</span></div>
    <div class="seg pmode"><button data-pmode="area" class="${Q.byArea ? "on" : ""}">📐 بمسطح القطع (م²)</button><button data-pmode="sheets" class="${Q.byArea ? "" : "on"}">🪵 بعدد الألواح</button></div>
    <p class="hint">${Q.byArea ? "كل وحدة بتتسعّر من مسطح قطعها هي: طول × عرض كل قطعة × سعر المتر من خامتها + نسبة الهالك، وشريطها وهاردويرها ومصنعيتها. سعر المتر = سعر اللوح ÷ مساحته، أو اكتبه بنفسك." : "الخامة بعدد الألواح الكاملة من خطة القص، والإجمالي بيتوزّع على الوحدات حسب مسطح كل وحدة."} الأسعار بتتحفظ لكل المشاريع.</p>
    ${Q.byArea ? `<div class="grid3">${pin("waste", P.waste, "نسبة الهالك %")}</div>` : ""}
    <div class="tblwrap"><table class="tbl"><thead><tr><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>`;
  for (const L of Q.lines) {
    const k = L.k === "sheet" ? `sheets.${L.key}` : L.k === "m2" ? `m2.${L.key}` : L.k === "hw" ? `hw.${L.key}` : "band";
    const typed = L.k === "m2" ? +P.m2?.[L.key] > 0 : true;
    h += `<tr><td>${esc(L.label)}${L.k === "m2" ? `<br><small class="hint">سعر اللوح <input class="pin sm" type="text" inputmode="decimal" data-numf data-price="sheets.${esc(L.key)}" value="${P.sheets[L.key] || ""}" placeholder="${P.defaultSheet || 0}"></small>` : ""}</td><td class="num">${L.qty} ${L.unit}</td><td><input class="pin" type="text" inputmode="decimal" data-numf data-price="${esc(k)}" value="${typed ? L.price || "" : ""}" placeholder="${L.k === "m2" ? L.price || 0 : 0}"></td><td class="num">${money(L.total)}</td></tr>`;
  }
  h += `</tbody></table></div><div class="grid3">${pin("laborUnit", P.laborUnit, "مصنعية لكل وحدة")}${pin("laborM2", P.laborM2, "مصنعية لكل م² خشب")}${pin("install", P.install, "تركيب ونقل (مقطوعية)")}</div>
    <div class="kv"><span>خامات</span><b>${money(Q.mat + Q.band)}</b><span>هاردوير</span><b>${money(Q.hwT)}</b><span>مصنعية وتركيب</span><b>${money(Q.labor)}</b><span>التكلفة</span><b>${money(Q.cost)}</b><span>سعر البيع</span><b>${money(Q.total)}</b><span>مكسبك</span><b class="profit">${money(Q.total - Q.cost)}${Q.total ? ` (${Math.round(((Q.total - Q.cost) / Q.total) * 100)}%)` : ""}</b>${Q.waste != null ? `<span>هالك الألواح</span><b>${Q.waste}%</b>` : ""}</div>
    <details ${Q.byArea ? "open" : ""}><summary>سعر كل وحدة${Q.byArea ? " (من مسطح قطعها)" : ""}</summary><div class="tblwrap"><table class="tbl"><thead><tr><th>الوحدة</th><th>المسطح</th>${Q.byArea ? "<th>التكلفة</th>" : ""}<th>السعر</th><th>سعر المتر</th></tr></thead><tbody>
      ${Q.perUnit.map(({ u, price, cost, area }) => `<tr><td><b>${esc(u.code || "")}</b> ${esc(u.name)}</td><td class="num">${n1(area || 0)} م²</td>${Q.byArea ? `<td class="num">${money(cost)}</td>` : ""}<td class="num"><b>${money(price)}</b></td><td class="num">${area ? money(price / area) : "—"}</td></tr>`).join("")}</tbody></table></div></details>
    <div class="grid3">${pin("defaultSheet", P.defaultSheet, "سعر اللوح لأي خامة مش متسعّرة")}<label class="f"><span>اسم المصنع (في العروض والفيديو والضمان)</span><input data-pricet="factory" value="${esc(P.factory || "")}" placeholder="NOVERA"></label><label class="f"><span>رقم التليفون / واتساب</span><input data-pricet="phone" inputmode="tel" value="${esc(P.phone || "")}" placeholder="010xxxxxxxx"></label></div>
    <div class="grid3">${pin("margin", P.margin, "هامش الربح %")}<label class="f"><span>اسم العميل</span><input data-pricet="client" value="${esc(P.client)}"></label>${pin("validity", P.validity, "العرض ساري (يوم)")}</div>
    <div class="grid2"><label class="f"><span>مدة التنفيذ</span><input data-pricet="delivery" value="${esc(trv(P.delivery))}"></label><label class="f"><span>الضمان</span><input data-pricet="warranty" value="${esc(trv(P.warranty))}"></label></div>
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
    const gi = grooveInfo(pc);
    rows.push([pc.key, pc.ucode, pc.unit, pc.pt.name, pc.mname, +n1(pc.lb.h), +n1(pc.lb.w), +n1(pc.lb.t), edgesText(pc.pt), (pc.pt.holes || []).length || "", sheets[pc.key] || "", [gi?.text, pc.pt.checks?.[0]].filter(Boolean).join(" | ")]);
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
    { name: "بواقي الألواح", rows: [["الخامة", "الطول (سم)", "العرض (سم)", "المساحة (م²)", "رقم اللوح"], ...leftovers().flatMap((x) => x.list.map((o) => [x.key, o.w, o.h, Math.round((o.w * o.h) / 100) / 100, o.sheet]))], widths: [30, 10, 10, 12, 10] },
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
      <text x="${W - 25 * s}" y="${6.4 * s}" font-size="${2.9 * s}" font-weight="700" text-anchor="end">${esc(trv(pc.pt.name).length > (I18n.isEn() ? 22 : 15) ? trv(pc.pt.name).slice(0, I18n.isEn() ? 21 : 14) + "…" : trv(pc.pt.name))}</text>
      <text x="${2 * s}" y="${12 * s}" font-size="${3.1 * s}" font-weight="700" direction="ltr">${n1(pc.lb.h)} × ${n1(pc.lb.w)} × ${n1(pc.lb.t)}</text>
      ${(() => { const gi = grooveInfo(pc); return gi ? `${nest(dia, 3 * s, 13 * s, 36 * s, 14.5 * s)}<text x="${W - 2 * s}" y="${29.6 * s}" font-size="${2.35 * s}" font-weight="800" fill="#8a5a00" text-anchor="end">${esc(gi.short)}</text>` : nest(dia, 3 * s, 13 * s, 36 * s, 17 * s); })()}
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
/**
 * CNC: one DXF per board in millimetres, as most nesting / CAM software reads them (Homag woodWOP DXF import,
 * Biesse bSolid, Alphacam, Chinese routers): the outline on OUTLINE, every drill on a layer that carries its
 * diameter and depth (DRILL_V_D8_Z12 = vertical, Ø8, 12 deep), hinge cups on DRILL_V_D35_Z13, back grooves
 * as a closed pocket on GROOVE_W7_Z8, the piece number on TEXT. + one CSV listing the operations per piece.
 */
async function exportCnc() {
  const pieces = projectPieces(state.project);
  const files = [], rows = [["رقم القطعة", "الوحدة", "القطعة", "الخامة", "الطول مم", "العرض مم", "السمك مم", "أخرام", "كبب مفصلات", "مفاحير", "ملاحظات"]];
  const mm = (v) => Math.round(v * 100) / 10;
  for (const pc of pieces) {
    const { pt, lb } = pc;
    if (["glass", "mirror", "frame", "door_frame_alu", "rail", "led"].includes(pt.material)) continue;
    if (/^(alu_|stainless|copper|glass_|mirror)/.test(pc.lib || "")) continue;
    const u = state.project.units[pc.unitIdx], p = R(u).params || {};
    const W = mm(lb.w), H = mm(lb.h), T = mm(lb.t);
    const d = new Exp.Dxf(4);
    let nh = 0, nc = 0, ng = 0;
    if (pt.cnc?.outline?.length) {
      // a shaped board from the drawing studio: its real outline, cut-outs and pockets
      const P = (l) => l.map(([x, y]) => [mm(x), mm(y)]);
      d.poly(P(pt.cnc.outline), "OUTLINE");
      for (const h of pt.cnc.holes || []) { d.poly(P(h), "CUTOUT"); ng++; }
      for (const pk of pt.cnc.pockets || []) { d.poly(P(pk.loop), `POCKET_${pk.face === "bottom" ? "BACK" : "FRONT"}_Z${mm(pk.depth)}`); ng++; }
    } else d.rect(0, 0, W, H, "OUTLINE");
    for (const ho of pt.holes || []) {
      const dia = mm(ho.d || (ho.kind === "cam" ? 1.5 : ho.kind === "pin" ? 0.5 : 0.8));
      const z = ho.kind === "cam" ? 13 : ho.kind === "pin" || dia <= 5 ? 10 : Math.min(12, Math.max(8, Math.round(T * 0.65)));
      d.circle(Math.round(ho.w * W * 10) / 10, Math.round(ho.h * H * 10) / 10, dia / 2, `DRILL_V_D${dia}_Z${z}`);
      nh++;
    }
    const dl = pt.door_label;
    if (dl?.hinge_ratios?.length) {
      const e = mm(+p.hinge_cup_edge_distance || 2.2);
      for (const r of dl.hinge_ratios) {
        const [x, y] = dl.hinge_side === "top" ? [r * W, H - e] : [dl.hinge_side === "right" ? W - e : e, r * H];
        d.circle(Math.round(x * 10) / 10, Math.round(y * 10) / 10, 17.5, "DRILL_V_D35_Z13");
        // the two screw holes of the hinge arm (45 mm apart, 9.5 mm behind the cup centre)
        nc++;
      }
    }
    if (lb.groove) {
      const gi = grooveInfo(pc), gw = gi ? gi.gw : Math.round(((+p.back_panel_thickness || 0.6) * 10 + 1) * 10) / 10, gz = gi ? gi.gz : Math.round((+p.back_groove_depth || 0.8) * 10 * 10) / 10;
      const g = lb.groove;
      if (g.axis === "vertical") { const x = g.ratio * W; d.rect(Math.round((x - gw / 2) * 10) / 10, 0, gw, H, `GROOVE_W${gw}_Z${gz}`); }
      else { const y = g.ratio * H; d.rect(0, Math.round((y - gw / 2) * 10) / 10, W, gw, `GROOVE_W${gw}_Z${gz}`); }
      ng++;
    }
    // routed built-in handle (from the back): the handle system writes it in the piece's note
    const rm = /حفر CNC مقبض بلت إن من الضهر على (الحرف اللي فوق|الحرف اللي تحت|الحرف الشمال|الحرف اليمين): طول ([\d.]+) × عرض ([\d.]+) × عمق ([\d.]+)/.exec([pt.note, lb.note, ...(pt.checks || [])].filter(Boolean).join(" | "));
    if (rm) {
      const L = mm(+rm[2]), Wd = mm(+rm[3]), Z = mm(+rm[4]), lay = `POCKET_BACK_Z${Z}`;
      if (rm[1] === "الحرف اللي فوق") d.rect(Math.round((W - L) / 2 * 10) / 10, Math.round((H - Wd) * 10) / 10, L, Wd, lay);
      else if (rm[1] === "الحرف اللي تحت") d.rect(Math.round((W - L) / 2 * 10) / 10, 0, L, Wd, lay);
      else if (rm[1] === "الحرف الشمال") d.rect(0, Math.round((H - L) / 2 * 10) / 10, Wd, L, lay);
      else d.rect(Math.round((W - Wd) * 10) / 10, Math.round((H - L) / 2 * 10) / 10, Wd, L, lay);
      ng++;
    }
    d.text(4, H + 6, 8, `${pc.key}  ${pt.name}  ${W}x${H}x${T}`, "TEXT");
    const note = [pt.note, ...(pt.checks || [])].filter(Boolean).join(" | ");
    if (/تفريغة|قصة ركن|اتقصّت/.test(note)) d.text(4, -12, 6, "CUT-OUT: see label / شوف الملصق", "TEXT");
    const safe = (t) => String(t).replace(/[\\/:*?"<>|]+/g, " ").trim();
    files.push({ name: `${safe(pc.mname)} ${T}mm/${safe(pc.key)}.dxf`, data: d.toString() });
    rows.push([pc.key, pc.unit, pt.name, pc.mname, W, H, T, nh, nc, ng, note]);
  }
  if (!files.length) throw new Error("مفيش قطع خشب في المشروع");
  files.push({ name: "عمليات CNC.csv", data: Exp.csv(rows) });
  files.push({ name: "اقراني.txt", data: "NOVERA Studio — ملفات CNC\r\n\r\nكل قطعة في ملف DXF لوحدها بالمليمتر، مقسومة فولدرات حسب الخامة والسمك.\r\n" +
    "الطبقات (Layers):\r\n  OUTLINE  حدود القطعة (الطول على X والعرض على Y زي الملصق)\r\n  DRILL_V_D8_Z12  خرم رأسي قطره 8 وعمقه 12 مم (الرقمين في اسم الطبقة)\r\n" +
    "  DRILL_V_D35_Z13  كبة مفصلة\r\n  GROOVE_W7_Z8  مفحار عرضه 7 وعمقه 8 مم\r\n  POCKET_BACK_Z12  حفر مقبض بلت إن من ضهر الوش (العمق في الاسم بالمم)\r\n  POCKET_FRONT_Z8  حفر من وش القطعة بالعمق ده (من ورشة الرسم)\r\n  CUTOUT  تفريغة جوه القطعة (قص كامل)\r\n  TEXT  رقم القطعة (مش للتشغيل)\r\n\r\nفي برنامج المكنة: اربط كل طبقة بالعدة المناسبة مرة واحدة واحفظها كقالب.\r\n" });
  return Exp.deliver(cloud.downloads, `${fileBase()} — CNC.zip`, Exp.zip(files));
}
async function exportImage() {
  if (!view.ready) throw new Error("العرض 3D مش جاهز");
  const url = view.snapshot(1920, 1080);
  const bin = atob(url.split(",")[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return Exp.deliver(cloud.downloads, `${fileBase()} — صورة.png`, bytes);
}
async function exportProject() {
  const sv = state.project.survey;
  const ids = sv ? [...(sv.photos || []), ...(sv.draft?.walls || []).flatMap((w) => w.photos || []), ...(sv.notes || []).map((n) => n.audio), sv.sign?.client, sv.sign?.tech, ...Object.values(sv.meta || {}).map((m) => m.orig)].filter(Boolean) : [];
  const media = {};
  for (const id of new Set(ids)) { const r = await Media.get(id, cloud); if (r) media[id] = { d: r.data, t: r.type, dur: r.dur || 0 }; }
  const data = { app: "NOVERA Studio", version: 1, exportedAt: new Date().toISOString(), project: state.project, ...(ids.length ? { media } : {}) };
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
    out.units.push({ code: u.code, name: u.name, kind: u.kind, params: expanded(u), ...(u.extra?.length ? { extra: clone(u.extra) } : {}), x: Room.r1(L.x), y: Room.r1(-L.z), z: Room.r1(+u.lift || 0), rot_deg: Math.round(((L.rot * 180) / Math.PI) * 100) / 100 });
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
// ================================================================== NOVERA Pro features
// AR · automatic kitchen · variants · pricing estimate · stock & purchasing · promo video ·
// warranty QR · project stages · appliance catalogue · (design checks are in designChecks)

// ------------------------------------------------------------------ 1) AR: the design in the real room
const arSupported = () => !!window.webkit?.messageHandlers?.noveraAR || (() => { try { return document.createElement("a").relList.supports("ar"); } catch { return false; } })();
async function exportAR() {
  if (!view.ready) throw new Error("العرض 3D مش جاهز");
  const THREE = view.three;
  const wasRender = state.render, wasWhole = state.whole;
  if (!wasRender) state.render = true;
  if (state.project.units.length > 1 && !state.whole) state.whole = true; // the whole design stands in the room
  view.update(state.whole !== wasWhole);
  try {
    const { USDZExporter } = await import("three/addons/exporters/USDZExporter.js");
    const root = new THREE.Group();
    for (const ug of view.pickables || []) {
      ug.updateMatrixWorld(true);
      const c = ug.clone(true);
      ug.matrixWorld.decompose(c.position, c.quaternion, c.scale);
      // only real surfaces (no outlines, labels or selection boxes) — and only materials Quick Look reads
      c.traverse((o) => { if (o.isLineSegments || o.userData.tag || o.userData.selFoot || (o.isMesh && !o.material?.isMeshStandardMaterial)) o.visible = false; });
      root.add(c);
    }
    if (!root.children.length) throw new Error("مفيش وحدات تتعرض");
    // centimetres → metres, standing on the floor, centred
    const box = new THREE.Box3().setFromObject(root);
    const ctr = box.getCenter(new THREE.Vector3());
    const wrap = new THREE.Group();
    root.position.set(-ctr.x, -box.min.y, -ctr.z);
    wrap.add(root);
    wrap.scale.setScalar(0.01);
    wrap.updateMatrixWorld(true);
    const bytes = await new USDZExporter().parse(wrap, { quickLookCompatible: true, ar: { anchoring: { type: "plane" }, planeAnchoring: { alignment: "horizontal" } } });
    const name = `${fileBase()} — AR.usdz`;
    const nat = window.webkit?.messageHandlers?.noveraAR;
    if (nat) {
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      nat.postMessage({ name, b64: btoa(bin) });
      return "shared";
    }
    // Quick Look opens only from a real tap on an <a rel="ar"> (an automatic click after the export is
    // ignored, and inside a Home-Screen app or an embedded page it never opens) → a page with that button
    const blob = new Blob([bytes], { type: "model/vnd.usdz+zip" });
    if (ui.arFile?.url) URL.revokeObjectURL(ui.arFile.url);
    let img = "";
    try { img = view.snapshot(640, 420, true); } catch { img = ""; }
    ui.arFile = { blob, name, url: URL.createObjectURL(blob), img, ar: !!document.createElement("a").relList?.supports?.("ar"), standalone: !!(navigator.standalone || matchMedia("(display-mode: standalone)").matches), framed: window.top !== window };
    ui.pop = "ar"; renderPop();
    return "shared";
  } finally {
    if (!wasRender) state.render = false;
    if (state.whole !== wasWhole) state.whole = wasWhole;
    view.update(true);
  }
}

// ------------------------------------------------------------------ 9) appliances (standard built-in sizes)
// Typical European built-in sizes — always check the appliance's own installation sheet.
const APPLIANCES = {
  oven60: { kind: "oven", label: "فرن بلت إن 60 (قياسي)", dims: "59.5×59.5×56", set: { oven_cavity_height: 59.5 }, note: "فتحة التركيب 56–56.8 × 58.5–60 سم، وتهوية 5 سم ورا." },
  oven45: { kind: "oven", label: "فرن كومباكت 45", dims: "59.5×45.5×56", set: { oven_cavity_height: 45.5 }, note: "فتحة 45 سم ارتفاع." },
  mw38: { kind: "microwave", label: "ميكروويف بلت إن 38", dims: "59.4×38.2×32", set: { microwave_cavity_height: 38, microwave_cavity_width: 56 } },
  mw45: { kind: "microwave", label: "ميكروويف / فرن كومبي 45", dims: "59.5×45.5×56", set: { microwave_cavity_height: 45.5, microwave_cavity_width: 56 } },
  fr60: { kind: "fridge", label: "تلاجة 60 (فري ستاندنج)", dims: "60×185×65", set: { fridge_cavity_width: 64, fridge_cavity_height: 190 }, note: "سيب 2 سم من كل جنب و5 سم فوق للتهوية." },
  fr70: { kind: "fridge", label: "تلاجة 70", dims: "70×190×68", set: { fridge_cavity_width: 74, fridge_cavity_height: 195 } },
  fr80: { kind: "fridge", label: "تلاجة 80 (دبل دور)", dims: "80×190×70", set: { fridge_cavity_width: 84, fridge_cavity_height: 195 } },
  frsbs: { kind: "fridge", label: "تلاجة سايد باي سايد", dims: "91×178×70", set: { fridge_cavity_width: 95, fridge_cavity_height: 182 } },
  frbi: { kind: "fridge", label: "تلاجة بلت إن 178", dims: "54×177×55", set: { fridge_cavity_width: 56, fridge_cavity_height: 178 }, note: "بتتركب بضلفة على مفصلات الجهاز." },
  wm60: { kind: "washing_machine", label: "غسالة هدوم 60", dims: "60×85×60", set: { washer_cavity_width: 62, washer_cavity_height: 86 } },
  wmtop: { kind: "washing_machine", label: "غسالة فوق تحميل علوي", dims: "40×90×60", set: { washer_cavity_width: 44, washer_cavity_height: 92 }, note: "سيب فوقها 50 سم فاضي عشان الغطا." },
};
function applianceField(u, p) {
  const cat = p.unit_category;
  const list = Object.entries(APPLIANCES).filter(([, a]) => a.kind === cat || (cat === "oven" && a.kind === "microwave" && p.include_microwave));
  if (!list.length) return "";
  const groups = {};
  for (const [k, a] of list) (groups[a.kind] ??= []).push([k, a]);
  let h = `<details open class="appbox"><summary>🔌 الجهاز اللي هيتركب</summary><p class="hint">اختار الجهاز والتجويف يتظبط على مقاسه. المقاسات قياسية — راجع ورقة تركيب الجهاز نفسه.</p>`;
  for (const [kind, items] of Object.entries(groups)) {
    const cur = u.appliance?.[kind] || "";
    h += `<label class="f"><span>${kind === "microwave" ? "الميكروويف" : kind === "oven" ? "الفرن" : kind === "fridge" ? "التلاجة" : "الغسالة"}</span><select data-appl="${kind}"><option value="">— مقاس يدوي —</option>${items.map(([k, a]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(a.label)} (${a.dims})</option>`).join("")}</select></label>`;
    if (cur && APPLIANCES[cur]?.note) h += `<p class="hint">${esc(APPLIANCES[cur].note)}</p>`;
  }
  return h + `</details>`;
}

// ------------------------------------------------------------------ 4) a quick price (no cut plan needed)
function quickEstimate(units) {
  const P = priceDefaults();
  const o = state.cutOpts;
  const sheetA = (+o.sheetW || 244) * (+o.sheetH || 122);
  const { groups } = cutGroups({ ...state.project, units: clone(units) });
  let mat = 0, missing = 0, sheets = 0;
  for (const g of groups) {
    const a = g.parts.reduce((s, x) => s + x.w * x.h, 0);
    const gs = groupSheet(g);
    const n = Math.max(1, Math.ceil(a / ((gs.w * gs.h || sheetA) * 0.8)));
    sheets += n;
    const pr = +P.sheets[g.key] || +P.defaultSheet || 0;
    if (!pr) missing++;
    mat += n * pr;
  }
  let band = 0, area = 0, ok = 0, pieces = 0;
  const hw = {};
  for (const u of units) {
    const r = R(u);
    if (!r.ok) continue;
    ok++; pieces += r.pieces || 0; band += r.banding;
    for (const pt of r.parts) if (pt.cut_piece && pt.label) area += (pt.label.w * pt.label.h) / 10000;
    for (const [k, q] of Object.entries(r.hardware || {})) hw[k] = (hw[k] || 0) + (+q || 0);
  }
  const hwT = Object.entries(hw).reduce((s, [k, q]) => s + q * (+P.hw[k] || 0), 0);
  const labor = ok * (+P.laborUnit || 0) + area * (+P.laborM2 || 0) + (ok ? +P.install || 0 : 0);
  const cost = mat + band * (+P.band || 0) + hwT + labor;
  const total = cost * (1 + (+P.margin || 0) / 100);
  return { total, cost, profit: total - cost, sheets, pieces, units: ok, area, priced: missing === 0 && total > 0 };
}
const priceText = (q) => (q.total > 0 ? `≈ ${money(q.total)} ج.م` : "حط أسعارك في الورشة والعميل");

// ------------------------------------------------------------------ 3) variants A / B / C
const VAR_NAMES = ["أ", "ب", "ج", "د", "هـ", "و"];
function variants() {
  const p = state.project;
  if (!p.variants?.length) { p.variants = [{ id: uid(), name: "نسخة أ", units: null }]; p.variant = p.variants[0].id; }
  if (!p.variants.some((v) => v.id === p.variant)) p.variant = p.variants[0].id;
  return p.variants;
}
/** the units of a variant (the open one lives in project.units) */
const variantUnits = (v) => (v.id === state.project.variant ? state.project.units : v.units || []);
function switchVariant(id) {
  const p = state.project, vs = variants();
  const cur = vs.find((v) => v.id === p.variant), nx = vs.find((v) => v.id === id);
  if (!nx || nx === cur) return;
  cur.units = clone(p.units);
  p.units = clone(nx.units || []);
  nx.units = null;
  p.variant = nx.id;
  state.sel = p.units[0]?.id ?? null;
  save(); render(true);
}
function addVariant(units, name) {
  const vs = variants();
  const v = { id: uid(), name: name || `نسخة ${VAR_NAMES[vs.length] || vs.length + 1}`, units: clone(units) };
  vs.push(v);
  return v;
}
function variantsPop() {
  const vs = variants();
  let h = `<div class="popbox" role="dialog" aria-label="النسخ"><div class="libhead"><h2>نسخ التصميم (أ / ب / ج)</h2><button class="x" data-close aria-label="قفل">×</button></div>
    <p class="hint">اعمل أكتر من شكل لنفس المشروع (اقتصادي وعادي وفاخر، أو ألوان مختلفة). العميل بيقارنهم ويختار من لينك الموافقة.</p><div class="varlist">`;
  for (const v of vs) {
    const q = quickEstimate(variantUnits(v));
    const on = v.id === state.project.variant;
    h += `<div class="varrow ${on ? "on" : ""}"><input data-vname="${v.id}" value="${esc(v.name)}" aria-label="اسم النسخة">
      <span class="vmeta">${q.units} وحدة · ${q.pieces} قطعة · <b>${priceText(q)}</b></span>
      <span class="vbtns">${on ? `<span class="pill">مفتوحة</span>` : `<button class="ghost2" data-vopen="${v.id}">افتح</button>`}<button class="ghost2" data-vdup="${v.id}">نسخة منها</button>${vs.length > 1 ? `<button class="danger sm" data-vdel="${v.id}" aria-label="امسح">${ICON.trash}</button>` : ""}</span></div>`;
  }
  h += `</div><div class="btnrow"><button class="primary" data-vcompare ${vs.length < 2 ? "disabled" : ""}>قارن بالصور</button><button class="ghost2" data-vcomppdf ${vs.length < 2 ? "disabled" : ""}>مقارنة PDF للعميل</button></div><div id="vcomp"></div></div>`;
  return h;
}
/** a picture of every variant (built one after the other in the 3D view) */
async function variantShots(w = 640, h = 400) {
  const p = state.project, keep = { units: p.units, whole: state.whole, sel: state.sel };
  const out = [];
  try {
    for (const v of variants()) {
      p.units = variantUnits(v);
      state.whole = p.units.length > 1; state.sel = p.units[0]?.id ?? null;
      view.update(true);
      await new Promise((r) => setTimeout(r, 60));
      out.push({ v, img: view.snapshot(w, h, true), q: quickEstimate(p.units) });
    }
  } finally {
    p.units = keep.units; state.whole = keep.whole; state.sel = keep.sel;
    view.update(true);
  }
  return out;
}
async function exportCompare() {
  const shots = await variantShots(900, 560);
  let t = `<text x="940" y="110" font-size="28" font-weight="800" text-anchor="end">قارن واختار</text>
    <text x="940" y="142" font-size="16" fill="#555" text-anchor="end">${esc(state.project.name)} · ${shots.length} نسخ · الأسعار تقريبية لحد عرض السعر النهائي</text>`;
  let y = 170;
  const pages = [];
  shots.forEach((s, i) => {
    if (i && i % 2 === 0) { pages.push({ title: "مقارنة النسخ", svg: t }); t = ""; y = 110; }
    t += `<image href="${s.img}" x="60" y="${y}" width="880" height="547" preserveAspectRatio="xMidYMid slice"/>
      <rect x="60" y="${y + 547}" width="880" height="56" fill="#123f23"/>
      <text x="920" y="${y + 584}" font-size="22" font-weight="800" fill="#fff" text-anchor="end">${esc(s.v.name)}</text>
      <text x="80" y="${y + 584}" font-size="20" font-weight="700" fill="#e8bd55">${s.q.total > 0 ? money(s.q.total) + " ج.م" : ""}</text>
      <text x="500" y="${y + 584}" font-size="15" fill="#cfe0d4" text-anchor="middle">${s.q.units} وحدة · ${s.q.pieces} قطعة</text>`;
    y += 640;
  });
  pages.push({ title: "مقارنة النسخ", svg: t });
  return pdfOut(pages, "مقارنة النسخ");
}

// ------------------------------------------------------------------ 2) "design my kitchen"
const AK_TIERS = {
  eco: { label: "اقتصادي", front: "hpl_white", carcass: "hpl_white", counter: "quartz_grey", handle: "bar", sink: 80, hob: 60, uppersGlass: false, led: false, tall: false },
  std: { label: "عادي", front: "wood_oak_natural_v", carcass: "hpl_offwhite", counter: "quartz_white_sparkle", handle: "bar", sink: 80, hob: 90, uppersGlass: false, led: false, tall: true },
  lux: { label: "فاخر", front: "acrylic_champagne", carcass: "hpl_offwhite", counter: "marble_calacatta", handle: "gola", sink: 100, hob: 90, uppersGlass: true, led: true, tall: true },
};
/** chains of walls that meet at right angles: [[seg], [seg, seg], [seg, seg, seg]] */
function wallChains(room) {
  const segs = Room.segments(room).filter((s) => s.L >= 100);
  const meets = (a, b) => Math.hypot(a.B[0] - b.A[0], a.B[1] - b.A[1]) < 1 && Math.abs(a.d[0] * b.d[0] + a.d[1] * b.d[1]) < 0.2;
  const chains = [];
  for (const s of segs) {
    chains.push([s]);
    const n1_ = segs.find((x) => x !== s && meets(s, x));
    if (n1_) {
      chains.push([s, n1_]);
      const n2_ = segs.find((x) => x !== s && x !== n1_ && meets(n1_, x));
      if (n2_) chains.push([s, n1_, n2_]);
    }
  }
  return chains;
}
/** blocked spans on a wall, measured from its A end: { all: [[a,b]], upper: [[a,b]] } */
function wallBlocks(room, seg) {
  const all = [], upper = [], windows = [];
  for (const o of room.openings || []) {
    if (o.wall !== seg.id) continue;
    if (o.kind === "door") all.push([o.at - 5, o.at + o.w + 5]);
    else { upper.push([o.at, o.at + o.w]); windows.push(o); if ((+o.sill || 0) < 88) all.push([o.at, o.at + o.w]); }
  }
  for (const cb of Room.columnBlocks(room)) if (cb.wall === seg.id) all.push([cb.a, cb.b]);
  // doors / windows on the next wall that reach onto this one near the corner
  all.push(...Room.crossBlocks(room, seg, "lower", 62));
  upper.push(...Room.crossBlocks(room, seg, "upper", 36), ...Room.crossBlocks(room, seg, "tall", 62));
  return { all, upper, windows };
}
const minus = (span, blocks) => {
  let parts = [span];
  for (const [a, b] of blocks) parts = parts.flatMap(([x, y]) => (b <= x || a >= y ? [[x, y]] : [[x, Math.min(y, a)], [Math.max(x, b), y]].filter(([p, q]) => q - p > 0.5)));
  return parts;
};
/** widths that fill `len` with units between 30 and 90 cm (half-centimetre steps) */
function fillWidths(len, max = 90) {
  if (len < 29.5) return [];
  const n = Math.ceil(len / max);
  const w = Math.floor((len / n) * 2) / 2;
  return Array.from({ length: n }, () => w);
}
function kitchenUnit(tier, params, name, libs = {}) {
  const T = AK_TIERS[tier];
  const p = withDefaults({ ...params, kud_handles: { type: T.handle } });
  const u = { id: uid(), kind: "kitchen", name, params: p, libs: {} };
  const L = { front: T.front, carcass: T.carcass, ...(p.unit_type !== "wall" && p.unit_type !== "tall" ? { countertop: T.counter } : {}), ...libs };
  for (const [k, lib] of Object.entries(L)) {
    if (!lib || !KU.K_MATS[k]) continue;
    u.libs[k] = lib;
    p[KU.K_MATS[k][1]] = Catalog.libName(lib);
    if (k === "front") p.door_color = Catalog.LIB[lib][2];
  }
  return u;
}
/** organised drawers, bottom drawer first (e.g. pots · utensils · cutlery) */
function withInserts(u, kinds) {
  const drs = unitDrawers(u, R(u));
  u.inserts = {};
  drs.forEach((d, i) => {
    const k = kinds[Math.min(i, kinds.length - 1)] || "none";
    if (k === "none") return;
    const { v, h } = insertLayout(k, d.W, d.D);
    u.inserts[d.i] = k;
    Object.assign(u.params, { include_drawer_boxes: true, [`drawer_insert_${d.i}`]: "custom", [`drawer_insert_v_${d.i}`]: v.join(","), [`drawer_insert_h_${d.i}`]: h.join(",") });
  });
  u.params.drawer_insert_height = Math.max(4, ...Object.values(u.inserts).map((k) => INSERTS[k]?.ht || 5));
  return u;
}
/** a whole kitchen along one, two or three walls. Returns null when the walls are too short. */
function autoKitchen(room, chain, tier) {
  const T = AK_TIERS[tier];
  const units = [];
  const pin = (u, seg, a, w) => { // a, w: from the wall's A end
    const s = Room.segments(room).find((g) => g.id === seg.id);
    const e = Room.axisX(Room.rotFor(s.n));
    const fromA = e[0] * s.d[0] + e[1] * s.d[1] > 0;
    u.pos = { wall: seg.id, s: Math.round((fromA ? a : s.L - a - w) * 2) / 2 };
    units.push(u);
  };
  // corners
  const cornerB = kitchenUnit(tier, { ...KU.KITCHEN.k_corner_l.params }, "زاوية L سفلية");
  const cornerU = kitchenUnit(tier, { ...More.KITCHEN.k_corner_l_wall.params, ...(T.led ? { include_led_marker: true } : {}) }, "زاوية L علوية");
  const cbB = localBox(R(cornerB)), cbU = localBox(R(cornerU));
  const runs = chain.map((seg, i) => {
    const lo = i > 0 ? cbB.y1 : 3, hi = seg.L - (i < chain.length - 1 ? cbB.x1 : 3);
    const loU = i > 0 ? cbU.y1 : 3, hiU = seg.L - (i < chain.length - 1 ? cbU.x1 : 3);
    const bl = wallBlocks(room, seg);
    return { seg, lo, hi, loU, hiU, bl, free: minus([lo, hi], bl.all), tall: [] };
  });
  for (let i = 0; i < chain.length - 1; i++) {
    const inc = chain[i], out = chain[i + 1];
    for (const [cu, cb, row] of [[cornerB, cbB, "lower"], [cornerU, cbU, "upper"]]) {
      const pose = Room.poseInCorner(inc, out);
      if (Room.keepoutHit(room, Room.footprint(pose, cb), row)) { if (row === "lower") return null; continue; } // a door / window in this corner: no base corner → no L here; a window over it → no wall corner
      const c = clone(cu); c.id = uid(); c.pos = { ...pose }; delete c.pos.corner; units.push(c);
    }
  }
  // the sink first: under a window when there is one, else a third of the way along the longest wall
  const sinkW = T.sink;
  let sinkRun = runs.find((r) => r.bl.windows.some((o) => r.free.some(([a, b]) => o.at + o.w / 2 - sinkW / 2 >= a && o.at + o.w / 2 + sinkW / 2 <= b))) || null;
  let sinkA;
  if (sinkRun) { const o = sinkRun.bl.windows.find((w) => sinkRun.free.some(([a, b]) => w.at + w.w / 2 - sinkW / 2 >= a && w.at + w.w / 2 + sinkW / 2 <= b)); sinkA = o.at + o.w / 2 - sinkW / 2; }
  else {
    sinkRun = runs.reduce((a, b) => (b.free.reduce((s, [x, y]) => s + y - x, 0) > a.free.reduce((s, [x, y]) => s + y - x, 0) ? b : a));
    const big = sinkRun.free.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a), sinkRun.free[0] || [0, 0]);
    if (big[1] - big[0] < sinkW) return null;
    sinkA = big[0] + Math.min(big[1] - big[0] - sinkW, Math.max(0, (big[1] - big[0]) / 3 - sinkW / 2));
  }
  sinkA = Math.round(sinkA * 2) / 2;
  pin(kitchenUnit(tier, { ...KU.KITCHEN.k_sink.params, width: sinkW, ...(sinkW >= 100 ? { sink_cutout_width: 86 } : {}), unit_label: "حوض" }, `وحدة حوض ${sinkW}`), sinkRun.seg, sinkA, sinkW);
  sinkRun.used = [[sinkA, sinkA + sinkW]];
  const at = (seg, x) => [seg.A[0] + seg.d[0] * x + seg.n[0] * 30, seg.A[1] + seg.d[1] * x + seg.n[1] * 30];
  const sinkC = at(sinkRun.seg, sinkA + sinkW / 2);
  const D = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  // the fridge (and in better kitchens a tall oven column) at the open end of the run nearest the sink —
  // never in front of a window
  const last = runs[runs.length - 1], first = runs[0];
  const tallList = [kitchenUnit(tier, { ...KU.KITCHEN.k_fridge.params }, "تجويف تلاجة")];
  if (T.tall) tallList.push(kitchenUnit(tier, { ...More.KITCHEN.k_oven_only.params }, "عمود فرن"));
  const tallW = tallList.map((u) => localBox(R(u)).x1 - localBox(R(u)).x0);
  const tallFree = (r) => minus([r.lo, r.hi], [...r.bl.all, ...r.bl.upper, ...(r.used || [])]);
  const ends = [];
  const lf = tallFree(last), ff = tallFree(first);
  if (lf.length && lf[lf.length - 1][1] >= last.hi - 0.5) ends.push({ r: last, span: lf[lf.length - 1], atEnd: true });
  if (ff.length && ff[0][0] <= first.lo + 0.5 && !(first === last && ends.length && ends[0].span === ff[0] && runs.length === 1 && false)) ends.push({ r: first, span: ff[0], atEnd: false });
  ends.sort((a, b) => D(at(a.r.seg, a.atEnd ? a.span[1] : a.span[0]), sinkC) - D(at(b.r.seg, b.atEnd ? b.span[1] : b.span[0]), sinkC));
  let need = tallW.reduce((a, b) => a + b, 0);
  let pick = ends.find((x) => x.span[1] - x.span[0] >= need + 60);
  if (!pick || pick.span[1] - pick.span[0] < need + 120) { tallList.splice(1); need = tallW[0]; pick = ends.find((x) => x.span[1] - x.span[0] >= need + 60); }
  if (pick) {
    const endRun = pick.r, span = pick.span;
    let a = pick.atEnd ? span[1] - need : span[0];
    tallList.forEach((u, k) => {
      const w = tallW[k];
      const x = pick.atEnd ? span[1] - tallW.slice(0, k + 1).reduce((p, q) => p + q, 0) : a;
      pin(u, endRun.seg, x, w);
      endRun.tall.push([x, x + w]);
      if (!pick.atEnd) a += w;
    });
  }
  for (const r of runs) r.free = minus([r.lo, r.hi], [...r.bl.all, ...r.tall, ...(r.used || [])]);
  const endRun = pick ? pick.r : first;
  // the hob: on another wall when there is one (the work triangle), at least 60 cm from the sink and 30 from a tall unit / end
  const hobW = T.hob;
  // candidates on every free span (30 cm clear of tall units, walls and the sink); keep the one whose work
  // triangle (sink – hob – fridge) is closest to ~5.5 m
  const frC = endRun.tall.length ? at(endRun.seg, (endRun.tall[0][0] + endRun.tall[0][1]) / 2) : null;
  let hob = null, bestS = Infinity;
  for (const r of runs) for (const [a, b] of r.free) {
    const lo = a + 30, hi = b - 30 - hobW;
    if (hi < lo) continue;
    const xs = [lo, hi, (lo + hi) / 2, ...Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * (i + 1)) / 6)];
    for (const x of xs) {
      if (r === sinkRun) { const g = x + hobW <= sinkA ? sinkA - x - hobW : x - sinkA - sinkW; if (g < 30) continue; }
      const c = at(r.seg, x + hobW / 2);
      const tri = D(c, sinkC) + (frC ? D(c, frC) + D(frC, sinkC) : D(c, sinkC) + 200);
      const score = Math.abs(tri - 550) + (tri > 790 ? (tri - 790) * 3 : 0) + (r === sinkRun && chain.length > 1 ? 40 : 0);
      if (score < bestS) { bestS = score; hob = { r, a: Math.round(x * 2) / 2 }; }
    }
  }
  if (hob) {
    pin(kitchenUnit(tier, { ...More.KITCHEN.k_hob90.params, width: hobW, unit_label: "بوتجاز" }, `وحدة بوتجاز ${hobW}`), hob.r.seg, hob.a, hobW);
    hob.r.free = minus([hob.r.lo, hob.r.hi], [...hob.r.bl.all, ...hob.r.tall, ...(hob.r === sinkRun ? [[sinkA, sinkA + sinkW]] : []), [hob.a, hob.a + hobW]]);
  }
  // fill the rest of the base row
  for (const r of runs) for (const [a, b] of r.free) {
    let x = a;
    fillWidths(b - a).forEach((w, k) => {
      const nextToHob = hob && hob.r === r && (Math.abs(x + w - hob.a) < 1 || Math.abs(x - hob.a - hobW) < 1);
      const prm = nextToHob ? { ...KU.KITCHEN.k_base_drawers.params, width: w } : w >= 50 ? { ...KU.KITCHEN.k_base2.params, width: w } : { ...More.KITCHEN.k_base1_45.params, width: w };
      const ku = kitchenUnit(tier, prm, nextToHob ? `أدراج ${w}` : `سفلية ${w}`);
      if (nextToHob && tier !== "eco") withInserts(ku, ["pots", "utensils", "cutlery"]);
      pin(ku, r.seg, x, w);
      x += w; void k;
    });
  }
  // wall units: over the base row, not over windows / doors / tall units; a hood unit over the hob
  for (const r of runs) {
    const blocks = [...r.bl.all, ...r.bl.upper, ...r.tall];
    if (hob && hob.r === r) {
      pin(kitchenUnit(tier, { ...More.KITCHEN.k_wall_hood90.params, width: hobW, wall_mount_height: 155 }, `علوية شفاط ${hobW}`), r.seg, hob.a, hobW);
      blocks.push([hob.a, hob.a + hobW]);
    }
    let glassLeft = T.uppersGlass ? 1 : 0;
    for (const [a, b] of minus([r.loU, r.hiU], blocks)) {
      let x = a;
      for (const w of fillWidths(b - a)) {
        const glass = glassLeft > 0 && w >= 60 && w <= 90;
        if (glass) glassLeft--;
        const base = glass ? More.KITCHEN.k_wall_glass_wood.params : w >= 50 ? KU.KITCHEN.k_wall2.params : More.KITCHEN.k_wall1_40.params;
        pin(kitchenUnit(tier, { ...base, width: w, ...(T.led ? { include_led_marker: true } : {}) }, glass ? `علوية زجاج ${w}` : `علوية ${w}`), r.seg, x, w);
        x += w;
      }
    }
  }
  // last check: nothing may stand in front of a door, or a wall / tall unit in front of a window
  const segById = new Map(Room.segments(room).map((g) => [g.id, g]));
  const ok = units.filter((u) => {
    const r = R(u), box = localBox(r), row = rowOf(u, r);
    const pose = u.pos.wall ? Room.poseOnWall(segById.get(u.pos.wall), u.pos.s, box) : u.pos;
    return !Room.keepoutHit(room, Room.footprint(pose, box), row);
  });
  return ok.length > 3 ? ok : null;
}
/** the proposals for this room: one per shape (one wall, L, U), best walls first */
function kitchenProposals(tier) {
  const room = state.project.room;
  if (!room) return [];
  const usable = (seg) => minus([0, seg.L], wallBlocks(room, seg).all).reduce((s, [a, b]) => s + b - a, 0);
  const cands = {};
  for (const ch of wallChains(room)) {
    const k = ch.length;
    const score = ch.reduce((s, g) => s + usable(g), 0) + (ch.some((g) => wallBlocks(room, g).windows.length) ? 60 : 0);
    (cands[k] ??= []).push({ ch, score });
  }
  const NAMES = { 1: "خطي — حيطة واحدة", 2: "حرف L — حيطتين", 3: "حرف U — تلات حيطان" };
  const out = [];
  for (const k of [1, 2, 3]) {
    // best walls first; when a corner there is taken by a door, the next best walls
    for (const c of (cands[k] || []).sort((a, b) => b.score - a.score)) {
      const units = autoKitchen(room, c.ch, tier);
      if (!units) continue;
      out.push({ k, name: NAMES[k], walls: c.ch.map((g) => g.i + 1), units, q: quickEstimate(units) });
      break;
    }
  }
  return out;
}
function autoPop() {
  const tier = ui.akTier || "std";
  let h = `<div class="popbox" role="dialog" aria-label="صمملي المطبخ"><div class="libhead"><h2>✨ صمملي المطبخ</h2><button class="x" data-close aria-label="قفل">×</button></div>`;
  if (!state.project.room) return h + `<p class="hint">محتاج الأوضة الأول: ارسمها بالمقاسات أو امسحها بالكاميرا، وحط الشبابيك والأبواب.</p><div class="btnrow"><button class="primary" data-roompop>📐 الأوضة بالمقاسات · 📷 المسح</button></div></div>`;
  h += `<p class="hint">بيملا الحيطان لوحده: الحوض تحت الشباك، البوتجاز بعيد عن الحوض والتلاجة، زوايا في الأركان، علويات مع شفاط، وفيلرات 3 سم عند الحيطان. بعد ما تختار تقدر تعدّل أي وحدة.</p>
    <div class="seg">${Object.entries(AK_TIERS).map(([k, t]) => `<button data-aktier="${k}" class="${k === tier ? "on" : ""}">${t.label}</button>`).join("")}</div><div class="aklist">`;
  ui.akProps = kitchenProposals(tier);
  if (!ui.akProps.length) h += `<p class="e">الحيطان قصيرة أو مقفولة بأبواب — محتاج حيطة 1.5 متر فاضية على الأقل.</p>`;
  ui.akProps.forEach((pr, i) => {
    h += `<div class="akcard"><b>${esc(pr.name)}</b><small>حيطة ${pr.walls.join(" + ")} · ${pr.q.units} وحدة · ${pr.q.pieces} قطعة</small><span class="akprice">${priceText(pr.q)}</span>
      <button class="primary" data-akuse="${i}">استخدم ده</button></div>`;
  });
  h += `</div>`;
  if (ui.akProps.length > 1) h += `<div class="btnrow"><button class="ghost2" data-akall>اعمل الكل كنسخ أ / ب / ج وقارن</button></div>`;
  h += `<p class="hint">الوحدات المطبخ الحالية هتتشال من النسخة دي (الدريسنج والأثاث بيفضلوا). تقدر ترجع بـ "النسخ".</p></div>`;
  return h;
}
function applyKitchen(units, asNew) {
  const keep = state.project.units.filter((u) => u.kind !== "kitchen");
  const next = [...keep.map((u) => clone(u)), ...units.map((u) => clone(u))];
  if (asNew) { const v = addVariant(next, asNew); switchVariant(v.id); }
  else { state.project.units = next; ensureCodes(state.project); state.whole = true; state.sel = next.find((u) => u.kind === "kitchen")?.id ?? null; save(); render(true); }
}

// ------------------------------------------------------------------ 5) board stock, remnants, purchase order
function stockOf(key) { state.stock ??= {}; return (state.stock[key] ??= { sheets: 0, remnants: [] }); }
function stockHtml() {
  if (!cutData?.results) return "";
  const P = priceDefaults();
  let h = `<section class="mgroup"><div class="mg-h"><h3>📦 المخزن والمشتريات</h3></div>
    <p class="hint">سجّل الألواح الكاملة والبواقي اللي عندك. خطة القص بتستخدم البواقي الأول${state.cutOpts.useStock === false ? " (مقفول دلوقتي)" : ""}، وبيطلعلك المحتاج تشتريه.</p>
    <label class="f b"><input type="checkbox" id="useStock" ${state.cutOpts.useStock === false ? "" : "checked"}><span>استخدم البواقي في خطة القص</span></label>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>الخامة</th><th>محتاج</th><th>عندي ألواح</th><th>اشتري</th><th>البواقي</th></tr></thead><tbody>`;
  const buy = [];
  for (const g of cutData.groups) {
    const st = stockOf(g.key), res = cutData.results[g.key];
    const need = res.stats.sheets - (res.stats.remnants_used || 0) * 0;
    const fullNeed = res.sheets.filter((s) => s.stock !== "remnant").length;
    const b = Math.max(0, fullNeed - (+st.sheets || 0));
    if (b) buy.push([g.key, b, +P.sheets[g.key] || 0]);
    h += `<tr><td>${esc(g.key)}</td><td class="num">${fullNeed}</td><td><input class="pin" type="text" inputmode="decimal" data-numf min="0" inputmode="numeric" data-stsheets="${esc(g.key)}" value="${st.sheets || 0}"></td><td class="num"><b>${b}</b></td>
      <td><div class="remlist">${st.remnants.map((r) => `<span class="rem">${r.w}×${r.h}<button data-remdel="${esc(g.key)}|${r.id}" aria-label="شيل">×</button></span>`).join("")}
      <span class="remadd"><input type="text" inputmode="decimal" data-numf placeholder="طول" data-remw="${esc(g.key)}"><input type="text" inputmode="decimal" data-numf placeholder="عرض" data-remh="${esc(g.key)}"><button class="ghost2" data-remadd="${esc(g.key)}">＋</button></span></div></td></tr>`;
    void need;
  }
  h += `</tbody></table></div>`;
  const used = cutData.groups.reduce((s, g) => s + (cutData.results[g.key].stats.remnants_used || 0), 0);
  if (used) h += `<p class="okmsg">${ICON.check}خطة القص بتستخدم ${used} بواقي من المخزن.</p>`;
  h += `<label class="f"><span>رقم واتساب المورّد (اختياري)</span><input data-pricet="supplier" inputmode="tel" value="${esc(P.supplier || "")}" placeholder="2010xxxxxxxx"></label>
    <div class="btnrow"><button class="primary" data-buywa>🛒 طلب شرا على واتساب</button><button class="ghost2" data-stocktake>${state.project.stockTaken ? "↺ رجّع اللي اتخصم" : "✓ خصم من المخزن (بعد القص)"}</button></div>
    <p class="hint">الخصم بيشيل الألواح والبواقي اللي اتقصت، ويضيف البواقي الجديدة (أكبر من 30×30) للمخزن.</p></section>`;
  ui.buyList = buy;
  return h;
}
function purchaseText() {
  const P = priceDefaults();
  const lines = [`طلب خامات — ${state.project.name} — ${today()}`, ""];
  for (const [k, n] of ui.buyList || []) lines.push(`• ${k}: ${n} لوح`);
  let band = 0;
  for (const u of state.project.units) { const r = R(u); if (r.ok) band += r.banding; }
  if (band) lines.push(`• شريط حواف: ${Math.ceil(band * 1.1)} م (شامل 10% هالك)`);
  const hw = hardwareTotals();
  if (Object.keys(hw).length) { lines.push("", "الهاردوير:"); for (const [k, q] of Object.entries(hw)) lines.push(`• ${k}: ${q}`); }
  if (!(ui.buyList || []).length) lines.splice(2, 0, "(الألواح متوفرة في المخزن)");
  lines.push("", P.factory || "NOVERA");
  return lines.join("\n");
}
function takeStock(undo) {
  const p = state.project;
  if (!cutData?.results) return;
  const sign = undo ? -1 : 1;
  if (!undo && p.stockTaken) return;
  if (undo && !p.stockTaken) return;
  const rec = undo ? p.stockTaken : { at: new Date().toISOString(), moves: [] };
  if (undo) {
    for (const m of rec.moves) {
      const st = stockOf(m.key);
      st.sheets = (+st.sheets || 0) + m.sheets;
      st.remnants = st.remnants.filter((r) => !m.added.includes(r.id)).concat(m.removed);
    }
    p.stockTaken = null;
  } else {
    for (const g of cutData.groups) {
      const st = stockOf(g.key), res = cutData.results[g.key];
      const full = res.sheets.filter((s) => s.stock !== "remnant").length;
      const take = Math.min(+st.sheets || 0, full);
      st.sheets = (+st.sheets || 0) - take;
      const removed = [];
      for (const s of res.sheets.filter((x) => x.stock === "remnant")) {
        const i = st.remnants.findIndex((r) => (Math.abs(r.w - s.w) < 0.6 && Math.abs(r.h - s.h) < 0.6) || (Math.abs(r.w - s.h) < 0.6 && Math.abs(r.h - s.w) < 0.6));
        if (i >= 0) removed.push(...st.remnants.splice(i, 1));
      }
      const added = [];
      for (const s of res.sheets) for (const o of s.offcuts || []) if (Math.min(o.w, o.h) >= 30) { const r = { id: uid(), w: Math.round(o.w), h: Math.round(o.h) }; st.remnants.push(r); added.push(r.id); }
      rec.moves.push({ key: g.key, sheets: take, removed, added });
    }
    p.stockTaken = rec;
  }
  void sign;
  save();
}

// ------------------------------------------------------------------ 8) project stages
const PSTAGES = [["measure", "القياس"], ["design", "التصميم"], ["approve", "موافقة العميل"], ["deposit", "العربون"], ["cut", "القص"], ["build", "التجميع"], ["install", "التركيب"], ["handover", "التسليم"]];
function stagesOf(p = state.project) { return (p.stages ??= {}); }
function stageNow(p) {
  const st = p.stages || {};
  const done = PSTAGES.filter(([k]) => st[k]?.done).length;
  return { done, total: PSTAGES.length, cur: PSTAGES.find(([k]) => !st[k]?.done)?.[1] || "خلص ✓" };
}
function stagesHtml() {
  const st = stagesOf();
  if (ui.ownerApproval?.status === "approved" && !st.approve?.done) st.approve = { done: ui.ownerApproval.at || new Date().toISOString(), by: "العميل" };
  const n = stageNow(state.project);
  let h = `<section class="mgroup"><div class="mg-h"><h3>🧭 مراحل المشروع</h3><span class="pill soft">${n.done} / ${n.total} · دلوقتي: ${esc(n.cur)}</span></div>
    <div class="stbar">${PSTAGES.map(([k]) => `<i class="${st[k]?.done ? "on" : ""}"></i>`).join("")}</div><div class="stlist">`;
  for (const [k, l] of PSTAGES) {
    const s = st[k] || {};
    h += `<div class="strow ${s.done ? "on" : ""}"><label class="f b"><input type="checkbox" data-stg="${k}" ${s.done ? "checked" : ""}><span>${l}</span></label>
      <input type="date" data-stgdate="${k}" value="${s.done ? s.done.slice(0, 10) : s.plan || ""}" aria-label="التاريخ"><input data-stgby="${k}" value="${esc(s.by || "")}" placeholder="مين" aria-label="المسؤول"></div>`;
  }
  return h + `</div><p class="hint">العميل بيشوف المرحلة اللي المشروع وصلها من نفس لينك الموافقة${cloud.db ? "" : " (لما يكون فيه حساب أونلاين)"}.</p></section>`;
}

// ------------------------------------------------------------------ 7) warranty QR per unit
const WARRANTY_URL = "https://donia679-glitch.github.io/amr-osman/studio/warranty.html";
const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function warrantyUrl(u) {
  const P = priceDefaults(), r = R(u);
  const care = u.kind === "kitchen" ? "k" : u.kind === "dressing" ? "d" : r.params?.environment === "wet" ? "b" : "f";
  const d = { f: P.factory || "NOVERA", p: P.phone || "", pr: state.project.name, c: u.code, n: u.name, dm: dimsText(u, r), dt: (stagesOf().install?.done || new Date().toISOString()).slice(0, 10), w: P.warranty || "", k: care, m: Object.values(r.names || {}).filter(Boolean).slice(0, 3).join(" · ") };
  return `${WARRANTY_URL}#d=${b64url(JSON.stringify(d))}`;
}
async function exportWarranty() {
  const units = state.project.units.filter((u) => R(u).ok);
  if (!units.length) throw new Error("مفيش وحدات");
  const P = priceDefaults();
  const pages = [];
  const per = 8;
  for (let i = 0; i < units.length; i += per) {
    let t = `<text x="940" y="104" font-size="22" font-weight="800" text-anchor="end">ملصقات الضمان — تتلزق جوه كل وحدة</text>`;
    units.slice(i, i + per).forEach((u, j) => {
      const col = j % 2, row = Math.floor(j / 2), x = 60 + col * 450, y = 130 + row * 300;
      const qr = qrSvg(warrantyUrl(u), 200);
      t += `<rect x="${x}" y="${y}" width="430" height="280" rx="16" fill="#fff" stroke="#123f23" stroke-width="2"/>
        <rect x="${x}" y="${y}" width="430" height="48" rx="16" fill="#123f23"/><rect x="${x}" y="${y + 30}" width="430" height="18" fill="#123f23"/>
        <text x="${x + 410}" y="${y + 32}" font-size="18" font-weight="800" fill="#fff" text-anchor="end">${esc(P.factory || "NOVERA")} — ضمان وصيانة</text>
        ${qr ? nest(qr, x + 16, y + 64, 200, 200) : ""}
        <text x="${x + 410}" y="${y + 92}" font-size="26" font-weight="800" text-anchor="end">${esc(u.code)}</text>
        <text x="${x + 410}" y="${y + 124}" font-size="16" text-anchor="end">${esc(u.name.slice(0, 22))}</text>
        <text x="${x + 410}" y="${y + 154}" font-size="13" fill="#555" text-anchor="end">${esc(state.project.name.slice(0, 26))}</text>
        <text x="${x + 410}" y="${y + 200}" font-size="14" font-weight="700" fill="#123f23" text-anchor="end">صوّر الكود بالموبايل:</text>
        <text x="${x + 410}" y="${y + 222}" font-size="13" text-anchor="end">الضمان · طريقة الاستعمال</text>
        <text x="${x + 410}" y="${y + 242}" font-size="13" text-anchor="end">طلب صيانة · اطلب وحدة زيها</text>
        ${P.phone ? `<text x="${x + 410}" y="${y + 266}" font-size="14" font-weight="700" text-anchor="end" direction="ltr">${esc(P.phone)}</text>` : ""}`;
    });
    pages.push({ title: "ملصقات الضمان", svg: t });
  }
  return pdfOut(pages, "ملصقات الضمان");
}

// ------------------------------------------------------------------ 6) promo video
async function exportVideo() {
  if (!view.ready) throw new Error("العرض 3D مش جاهز");
  if (typeof MediaRecorder === "undefined") throw new Error("الجهاز ده مش بيسجّل فيديو");
  const W = 1280, H = 720, FPS = 30, SECS = 9;
  const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const mime = types.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
  const r = view.ren, c = view.cam, THREE = view.three;
  const keep = { size: r.getSize(new THREE.Vector2()), pr: r.getPixelRatio(), asp: c.aspect, pos: c.position.clone(), t: view.ctl.target.clone(), open: ui.open };
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const stream = cv.captureStream(FPS);
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise((res) => { rec.onstop = res; });
  view.recording = true;
  const P = priceDefaults();
  const sb = view.scene.background;
  const cssBg = (el) => { const c = el && getComputedStyle(el).backgroundColor; return c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) ? c : null; };
  const bgCss = sb?.isColor ? `#${sb.getHexString()}` : view.stageBg || cssBg(view.host) || cssBg(view.host.parentElement) || getComputedStyle(document.documentElement).getPropertyValue("--stage").trim() || (isDark() ? "#1f2622" : "#e9ece6");
  try {
    r.setPixelRatio(1); r.setSize(W, H, false);
    c.aspect = W / H; c.updateProjectionMatrix();
    view.fitTight(W / H, 0.12);
    const tgt = view.ctl.target.clone(), off = c.position.clone().sub(tgt);
    const rad = Math.hypot(off.x, off.z), y0 = off.y, a0 = Math.atan2(off.x, off.z);
    var hideSel = [...(view.selGlass || []), view.selFoot].filter(Boolean);
    for (const o of hideSel) o.visible = false;
    rec.start(250);
    const t0 = performance.now();
    let opened = false, closed = false;
    await new Promise((resolve) => {
      const frame = () => {
        const t = (performance.now() - t0) / 1000;
        if (t > SECS) { resolve(); return; }
        const k = Math.min(1, t / (SECS - 1.6));
        const ang = a0 - 0.9 + 1.8 * (0.5 - 0.5 * Math.cos(Math.PI * k));
        const zoom = 1.08 - 0.12 * Math.sin(Math.PI * k);
        c.position.set(tgt.x + Math.sin(ang) * rad * zoom, tgt.y + y0 * (zoom + 0.05 * Math.sin(Math.PI * k)), tgt.z + Math.cos(ang) * rad * zoom);
        c.lookAt(tgt);
        if (!opened && t > 2.2) { opened = true; view.setOpen(true); }
        if (!closed && t > 5.6) { closed = true; view.setOpen(false); }
        view.cutaway();
        view.usePost() ? view.postFx.renderTo(W, H) : r.render(view.scene, c);
        g.fillStyle = bgCss; g.fillRect(0, 0, W, H);
        g.drawImage(r.domElement, 0, 0, W, H);
        // the logo card at the end, a small mark all along
        const end = Math.max(0, Math.min(1, (t - (SECS - 1.6)) / 0.5));
        if (end > 0) { g.fillStyle = `rgba(14,42,24,${0.86 * end})`; g.fillRect(0, 0, W, H); }
        g.save(); g.globalAlpha = end > 0 ? end : 0.9;
        g.textAlign = "center"; g.direction = "rtl";
        if (end > 0) {
          g.fillStyle = "#d9a63a"; g.beginPath(); g.roundRect?.(W / 2 - 46, H / 2 - 130, 92, 92, 20); g.fill();
          g.fillStyle = "#123f23"; g.font = "800 64px system-ui, sans-serif"; g.fillText("N", W / 2, H / 2 - 62);
          g.fillStyle = "#fff"; g.font = `800 52px "IBM Plex Sans Arabic", system-ui, sans-serif`; g.fillText(P.factory || "NOVERA", W / 2, H / 2 + 20);
          g.fillStyle = "#e8bd55"; g.font = `600 28px "IBM Plex Sans Arabic", system-ui, sans-serif`; g.fillText(state.project.name, W / 2, H / 2 + 70);
          if (P.phone) { g.fillStyle = "#cfe0d4"; g.font = "600 26px system-ui"; g.direction = "ltr"; g.fillText(P.phone, W / 2, H / 2 + 118); }
        } else {
          g.fillStyle = "rgba(14,42,24,.75)"; g.fillRect(W - 230, H - 66, 210, 46);
          g.fillStyle = "#fff"; g.font = `700 22px "IBM Plex Sans Arabic", system-ui`; g.fillText(P.factory || "NOVERA", W - 125, H - 35);
        }
        g.restore();
        requestAnimationFrame(frame);
      };
      frame();
    });
    rec.stop();
    await done;
  } finally {
    for (const o of hideSel || []) o.visible = true;
    view.recording = false;
    r.setPixelRatio(keep.pr); r.setSize(keep.size.x, keep.size.y, false);
    c.aspect = keep.asp; c.updateProjectionMatrix();
    c.position.copy(keep.pos); view.ctl.target.copy(keep.t); c.lookAt(keep.t);
    view.setOpen(!!keep.open, false);
    view.postFx?.resize();
    view.dirty = true;
  }
  const type = (rec.mimeType || mime || "video/webm").split(";")[0];
  const blob = new Blob(chunks, { type });
  return Exp.deliver(cloud.downloads, `${fileBase()} — فيديو.${type.includes("mp4") ? "mp4" : "webm"}`, blob);
}

const EXPORTS = [
  ["ar", "شوفها في الأوضة (AR)", "على الآيباد/الآيفون: التصميم بيقف في الأوضة بمقاسه الحقيقي بالكاميرا — تلف حواليه مع العميل.", exportAR],
  ["video", "فيديو عرض التصميم", "فيديو 9 ثواني: الكاميرا بتلف حوالين التصميم والضلف بتتفتح، وفي الآخر لوجو المصنع — للعميل والسوشيال.", exportVideo],
  ["warranty", "ملصقات الضمان (QR) PDF", "ملصق لكل وحدة يتلزق جواها: العميل يصوّره يلاقي الضمان وطريقة الاستعمال وطلب الصيانة.", exportWarranty],
  ["compare", "مقارنة النسخ PDF", "صورة وسعر كل نسخة (أ / ب / ج) جنب بعض عشان العميل يختار.", exportCompare],
  ["xlsx", "قايمة القطع Excel", "كل القطع بأرقامها ومقاساتها وشريطها ولوحها + الوحدات والخامات والألواح والهاردوير ونقط الكهربا — في شيتات منفصلة.", exportXlsx],
  ["csv", "قايمة القطع CSV", "ملف بسيط يتفتح في أي برنامج تقطيع (OpenCutList / CutList Optimizer) أو Excel.", exportCsv],
  ["cutpdf", "خطة القص PDF", "رسمة كل لوح بأرقام القطع، وقايمة القطع اللي عليه وترتيب القص — للورشة.", exportCutPdf],
  ["labels", "الملصقات PDF", "ملصق لكل قطعة: الرقم الكبير، الرسمة بالشريط والأخرام، QR وباركود بنفس الرقم.", exportLabelsPdf],
  ["drawings", "المساقط والواجهات PDF", "المسقط الأفقي بالمقاسات، وواجهة كل حيطة بالوحدات والشبابيك ونقط الكهربا، وجدول النقط.", exportDrawingsPdf],
  ["asm", "ملخص الوحدات ودليل التجميع PDF", "لكل وحدة: صفحة ملخص (مقاسات، خامات، هاردوير، وزن) وصفحة لكل خطوة تجميع بصورة وأرقام القطع.", () => exportAssemblyPdf()],
  ["cnc", "ملفات CNC بالتخريم (DXF لكل قطعة)", "كل قطعة في ملف بالمليمتر: الحدود، والأخرام والكبب والمفاحير على طبقات باسم القطر والعمق — بتتفتح في برامج المكن (woodWOP · bSolid · Alphacam · الراوتر الصيني) + جدول العمليات.", exportCnc],
  ["dxf", "ملفات DXF (CNC / أوتوكاد)", "كل لوح بقطعه وأرقامها كرسمة DXF، والمسقط — في ملف ZIP.", exportDxf],
  ["skp", "سكتش أب (موديل + ملف البلجن)", "ملف ZIP فيه موديل .dae يتفتح في أي سكتش أب، وملف للبلجن (187) يبني الوحدات الحقيقية بإعداداتها والحيطان ونقط الكهربا — عشان تكمّل شغل عليه.", exportSketchUp],
  ["png", "صورة التصميم", "صورة 1920×1080 من العرض 3D الحالي.", exportImage],
  ["quote", "عرض سعر للعميل PDF", "بالأسعار اللي كاتبها في تاب الورشة والعميل: صورة التصميم، سعر كل وحدة، الإجمالي، والشروط.", exportQuotePdf],
  ["json", "نسخة من المشروع", "ملف المشروع كامل — تفتحه على أي جهاز تاني أو تحتفظ بيه كنسخة احتياطية.", exportProject],
];

// ------------------------------------------------------------------ render
function render(refit = false) {
  ensureCodes(state.project);
  if (hist.pid !== state.project?.id) histTrack();
  renderSteps();
  $("#projName").textContent = state.project.name;
  document.querySelectorAll(".tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === state.tab)));
  for (const t of ["design", "cut", "parts", "shop"]) $(`#v-${t}`).hidden = ui.mode !== "owner" || state.tab !== t;
  $("#v-design").classList.toggle("lib-open", !!state.libOpen);
  if (ui.mode !== "owner") return;
  if (state.tab === "design") {
    $("#view3d").hidden = !!ui.planOn;
    renderStrip(); renderChips(); renderProps(); renderErrs(); renderMoveBar(); renderScene(); renderMulti(); renderInsp();
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
    showHome();
  }
  // the splash stays at least a moment so the logo is seen, then fades into the start screen
  const sp = document.getElementById("splash");
  if (sp) { const wait = Math.max(0, 1900 - performance.now()); setTimeout(() => { sp.classList.add("out"); setTimeout(() => sp.remove(), 600); }, wait); }
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
      const cvx = s.exists && ui.clientVar && ui.sharedProject.variants?.find((x) => x.id === ui.clientVar);
      if (cvx) ui.sharedProject.units = cvx.units;
      if (ui.mode === "client" && s.exists) ui.clientUnit = ui.clientUnit ? ui.sharedProject.units.find((x) => x.id === ui.clientUnit.id) || ui.sharedProject.units[0] : ui.sharedProject.units[0];
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
  myLibPull();
  settingsPull();
  // owner: pull the newest copy of this project from the cloud, else upload the local one
  try {
    const ref = db.doc(`data/users/${cloud.me}/p_${state.project.id}`);
    const s = await ref.get();
    if (s.exists && s.data().updatedAt) {
      const v = s.data();
      const localAt = state.savedAt || "";
      if (!localAt || v.updatedAt > localAt) { state.project = { id: state.project.id, name: v.name, units: v.units || [], ...(v.room ? { room: v.room } : {}), mats: v.mats || [], ...(v.stages ? { stages: v.stages } : {}), ...(v.survey ? { survey: v.survey } : {}) }; if (!state.project.units.find((u) => u.id === state.sel)) state.sel = state.project.units[0]?.id ?? null; render(true); }
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
  await refreshProjects();
  if (!$("#home").hidden) showHome(); // the account's projects join the list once signed in
}
const _persist = persist;
persist = function () { state.savedAt = new Date().toISOString(); _persist(); };
const _render = render;
let lastPid = state.project.id;
render = function (refit) { _render(refit); if (state.project.id !== lastPid) { lastPid = state.project.id; watchOwnerShared(); } };
Keypad.init({ enabled: () => state.kpad !== false });
// ---- the surveyor's own screen (survey_ui.js) — separate from the design screen
let svFrom = "home";
SurveyUI.init({
  get state() { return state; }, get cloud() { return cloud; },
  save, saveNow, alertBar, pdfOut,
  newProject: (n) => newProject(n), openProject: (id, q) => openProject(id, q),
  listProjects: () => allProjects(),
  getProject: async (id) => { if (id === state.project.id) return state.project; const r = await Lib.get(id).catch(() => null); if (r?.project) return r.project;
    if (cloud.db && cloud.me) { try { const sn = await cloud.db.doc(`data/users/${cloud.me}/p_${id}`).get(); if (sn.exists) return { id, ...sn.data() }; } catch { /* offline */ } } return null; },
  elevSvg: (id) => { const e = plan.elevSvg(id); if (!e) return ""; const i = e.indexOf(">", e.indexOf("<svg")); return e.slice(0, i + 1).replace(/<svg (?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg" ') + `<style>${PLAN_PRINT_CSS}</style>` + e.slice(i + 1); },
  roomChanged: () => { ui.planSel = null; plan.vb = null; state.whole = true; },
  cloudSync: () => { if (cloud.db && cloud.me) { cloudSave(); Media.sync(cloud); } },
  openDesign: () => { closeHome(); state.tab = "design"; ui.planOn = true; render(true); },
  onExit: () => { if (svFrom === "home") showHome(); else render(true); },
  onFinish: () => showHome(),
});
// back online: send what waited (the project and the survey photos / voice notes)
addEventListener("online", () => { if (cloud.db && cloud.me) { if (cloud.dirty || ui.cloud === "error") cloudSave(); Media.sync(cloud); } });
boot();
if (location.hash === "#survey") { svFrom = "home"; SurveyUI.open("list"); }
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { applyLook(); view.update(); });
applyLook();
const DEV = location.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
if (DEV) window.__dbg = { view, plan, R, render: (x) => render(x), ak: (t) => kitchenProposals(t), applyK: (u) => applyKitchen(u, null), checks: () => designChecks(), merge: (a, b) => mergeInto(a, b), get ui() { return ui; }, layout: asmLayout, elev: (u) => unitElevSvg(u), get state() { return state; } };
