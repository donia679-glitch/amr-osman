// NOVERA Studio — the drawing studio («ورشة الرسم»): SketchUp-style modelling of your own pieces.
// Draw lines / rectangles / circles / polygons / arcs on the ground or on any face, push/pull them into boards,
// cut holes, notches and pockets, round or bevel corners, move / rotate / scale / mirror / array, offset, follow-me,
// tape measure, protractor, dimensions, text, paint, eraser, groups, hide / isolate, section cut, x-ray, standard views.
// Every flat solid becomes a board in the cut list, the labels and the CNC files (its real outline, holes and pockets).
import * as THREE from "three";
import * as G from "./geom.js";
import * as Room from "../room.js";
import * as Cab from "./cabinet.js";

const WALL_PAINTS = ["#f3f1ea", "#ffffff", "#e9e2d0", "#d8cfc0", "#c9b9a3", "#e8d5c4", "#c9d3c6", "#a8b5a0", "#b7c7d3", "#8fa3b0", "#6f7d86", "#3f4a45"];
const wallSwatches = (cur, attr) => `<div class="dspaints">${WALL_PAINTS.map((c) => `<button class="dspaint ${String(cur || "").toLowerCase() === c ? "on" : ""}" style="background:${c}" data-${attr}="${c}" aria-label="${c}"></button>`).join("")}<label class="dspaint dspick" title="لون تاني"><input type="color" data-${attr}in value="${cur || "#e9e2d0"}"></label></div>`;
const MATS = { carcass: "الهيكل", front: "الضلف والواجهة", shelf: "الأرفف", accent: "الخامة المميزة", back: "الظهر" };
const MCOL = { carcass: "#d9cfbf", front: "#b98a5a", shelf: "#e6dccb", accent: "#5f7464", back: "#efe7da" };
const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], AXC = ["#e0413a", "#2f9e44", "#2f6fdf"], AXN = ["الأحمر", "الأخضر", "الأزرق"];
const TOOLS = [
  ["نظر", [["select", "⬚", "اختيار"], ["orbit", "⟳", "لف الكاميرا"], ["pan", "✋", "زحّك الكاميرا"]]],
  ["رسم", [["line", "╱", "خط"], ["rect", "▭", "مستطيل"], ["circle", "◯", "دايرة"], ["polygon", "⬡", "مضلّع"], ["arc", "◠", "قوس"]]],
  ["تشكيل", [["pushpull", "⇕", "سحب / زق"], ["offset", "⧈", "إزاحة"], ["follow", "➰", "اتبعني"], ["fillet", "◜", "تدوير ركن"], ["chamfer", "◸", "شطف ركن"]]],
  ["تعديل", [["move", "✥", "تحريك / نسخ"], ["rotate", "↻", "لف"], ["scale", "⇲", "تكبير / تصغير"]]],
  ["قياس", [["tape", "📏", "شريط قياس"], ["protractor", "∡", "منقلة"], ["dim", "↔", "أبعاد"], ["text", "T", "نص"], ["gpoint", "✚", "نقطة"]]],
  ["حوائط", [["wall", "🧱", "حيطة"], ["door", "🚪", "باب"], ["window", "🪟", "شباك"], ["mep", "🔌", "مرافق"]]],
  ["تاني", [["paint", "🪣", "دهان"], ["eraser", "⌫", "ممحاة"], ["trim", "✂", "قص عند التقاطع"]]],
];
const TOOLNAME = Object.fromEntries(TOOLS.flatMap(([, l]) => l.map(([k, , n]) => [k, n])));
/** the eight tools most hands reach for — always at the top; the groups under them fold (remembered per device) */
const FAV_TOOLS = ["select", "line", "rect", "pushpull", "move", "tape", "eraser", "paint"];
let toolGroups = null;
function toolGroupOpen(i) { if (!toolGroups) { try { toolGroups = JSON.parse(localStorage.getItem("ds-toolgroups") || "null") || {}; } catch { toolGroups = {}; } } return toolGroups[i] !== false; }
function toolGroupToggle(i) { toolGroupOpen(i); toolGroups[i] = toolGroups[i] === false; try { localStorage.setItem("ds-toolgroups", JSON.stringify(toolGroups)); } catch { /* private mode */ } const g = el?.querySelector(`[data-tg="${i}"]`); if (g) { g.classList.toggle("closed", !toolGroups[i] && toolGroups[i] === false); g.querySelector(".dstgh i").textContent = toolGroups[i] === false ? "▸" : "▾"; } }
function toolSearch(q) {
  const n = (t) => String(t || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  const w = n(q).trim();
  for (const b of el.querySelectorAll(".dstools .dst")) b.hidden = !!w && !n(b.title).includes(w);
  for (const g of el.querySelectorAll(".dstools .dstg")) { const any = [...g.querySelectorAll(".dst")].some((b) => !b.hidden); g.hidden = !any; if (w) g.classList.remove("closed"); else if (g.dataset.tg != null) g.classList.toggle("closed", !toolGroupOpen(+g.dataset.tg)); }
}
const HINT = {
  select: "دوس على أي حاجة تختارها · اسحب في الفاضي تلف الكاميرا · صباعين: زحّك وكبّر",
  orbit: "اسحب بصباع تلف حوالين التصميم", pan: "اسحب بصباع تزحّك الكاميرا",
  line: "دوس نقطة البداية وبعدين كل نقطة · ارجع لأول نقطة تقفل الشكل · اكتب الطول في خانة المقاس",
  rect: "دوس ركن وبعدين الركن اللي قصاده · أو اكتب «العرض,الطول»", circle: "دوس المركز وبعدين نص القطر · «24s» = عدد الأضلاع",
  polygon: "دوس المركز وبعدين الركن · «6s» = عدد الأضلاع", arc: "دوس أول القوس، آخره، وبعدين قد إيه يتقوّس",
  pushpull: "دوس على شكل مقفول أو وش لوح واسحب · اكتب المسافة · شكل جوه وش لوح: زقه لجوه يعمل تفريغ أو حفر",
  offset: "دوس على شكل أو وش واسحب لجوه أو لبره · اكتب المسافة", follow: "اختار البروفايل (شكل مقفول) وبعدين دوس على المسار",
  fillet: "دوس على ركن لوح أو شكل · نص القطر من خانة المقاس", chamfer: "دوس على ركن · مقاس الشطفة من خانة المقاس",
  move: "دوس على الحاجة (أو اختارها الأول) وبعدين المكان الجديد · «نسخة» تنسخ · بعدها «x5» = 5 نسخ · «/4» = تقسيم · دوس على ركن لوح يغيّر شكله",
  rotate: "دوس المركز، وبعدين اتجاه البداية، وبعدين الزاوية · اكتب الزاوية", scale: "دوس نقطة ثابتة، وبعدين نقطة، وبعدين المكان الجديد · أو اكتب النسبة",
  gpoint: "دوس مكان النقطة (بتلقط التقاطعات والأطراف والمراكز) — بتفضل علامة ترسم منها بعدين",
  tape: "دوس من نقطة لنقطة: بيقيس المسافة بس (الخط المساعد اختياري من الجنب)", protractor: "دوس المركز، البداية، وبعدين الزاوية: خط مساعد مايل",
  dim: "دوس نقطتين وبعدين مكان خط البعد", text: "دوس المكان واكتب النص في الخانة تحت", paint: "اختار الخامة من الجنب ودوس على اللوح",
  eraser: "دوس أو اسحب على اللي عايز تمسحه",
  trim: "دوس على الجزء اللي عايز تشيله من خط أو دايرة: بيتقص لحد أقرب تقاطع من الناحيتين (Trim)",
  wall: "دوس على الأرض نقطة نقطة (الوش الداخلي للحيطة) · اكتب الطول · ارجع لأول نقطة تقفل الأوضة · دوس نفس النقطة تاني أو ↵ تخلّص",
  door: "دوس على الحيطة مكان الباب — المقاسات من الجنب", window: "دوس على الحيطة مكان الشباك — المقاسات والجلسة من الجنب",
  mep: "اختار النوع من الجنب (بريزة، مفتاح، تغذية، صرف، غاز…) ودوس على الحيطة مكانه",
};
const POINT_R = 18, EDGE_R = 12, AXIS_R = 14;

let host = null, el = null, ctx = {};
let ren, scene, camP, camO, cam, ctl, world, solidsG, sketchG, extraG, overG, roomG, labelsEl, grid;
let startRoom = "null";
let M = null, mname = "";
let raf = 0, alive = false;
const objs = new Map(); // entity ref → three object(s), for picking and ghosts
const ui = { tool: "select", sel: new Set(), st: null, axis: null, plane: "auto", copy: false, xray: false, section: null, secPos: 0, ortho: false, mat: "carcass",
  segs: 32, sides: 6, filletR: 5, chamferD: 2, editGroup: null, face2d: null, info: null, addSel: false, lastPush: null, lastMove: null, thick: 1.8, panel: true, outline: false, msg: "",
  step: 1, boxSel: false, recent: [], face: null, wallT: Room.WALL_T, wallH: Room.WALL_H, mepKind: "socket", rsel: null, showWalls: true,
  snap: { on: true, end: true, mid: true, center: true, int: true, edge: true, face: true, axis: true, par: true, align: true, angle: true, strength: 1.3 }, dimEdit: null, clip: null, rdir: [1, 1], mvD: 10, arr: { n: 3, d: 40, ax: 0, pn: 6, pa: 360, px: 0, py: 0 }, alignAx: 0 };
const hist = { u: [], r: [] };

export const newModel = () => ({ v: 1, solids: [], sketches: [], paths: [], sweeps: [], guides: [], dims: [], texts: [], groups: [] });
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const f1 = (v) => (Math.round(v * 10) / 10).toLocaleString("en-US");
const T3 = (p) => new THREE.Vector3(p[0], p[2], -p[1]);
const W3 = (v) => [v.x, -v.z, v.y];
// ---- thick lines (WebGL draws every line 1 px wide): screen-space quads, `width` in CSS pixels
const fatMats = new Set();
function fatLine(pts, color, width = 3, closed = false, opts = {}) {
  const P = pts.map((p) => (p.isVector3 ? p : T3(p)));
  if (closed && P.length > 2) P.push(P[0]);
  const A = [], B = [], side = [], end = [];
  for (let i = 0; i + 1 < P.length; i++) {
    const a = P[i], b = P[i + 1];
    for (const [e, sd] of [[0, -1], [0, 1], [1, 1], [0, -1], [1, 1], [1, -1]]) { A.push(a.x, a.y, a.z); B.push(b.x, b.y, b.z); side.push(sd); end.push(e); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(A, 3));
  g.setAttribute("pB", new THREE.Float32BufferAttribute(B, 3));
  g.setAttribute("side", new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute("endp", new THREE.Float32BufferAttribute(end, 1));
  const v = ren?.domElement;
  const m = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: opts.opacity ?? 1 }, width: { value: width }, res: { value: new THREE.Vector2(v?.clientWidth || 800, v?.clientHeight || 600) } },
    vertexShader: `attribute vec3 pB; attribute float side; attribute float endp; uniform vec2 res; uniform float width;
      void main() {
        vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(pB, 1.0);
        vec4 cur = endp < 0.5 ? a : b;
        vec2 sa = a.xy / max(a.w, 1e-4) * res, sb = b.xy / max(b.w, 1e-4) * res;
        vec2 dir = sb - sa; float l = length(dir); dir = l > 1e-6 ? dir / l : vec2(1.0, 0.0);
        vec2 nrm = vec2(-dir.y, dir.x);
        cur.xy += nrm * side * width / res * cur.w;
        gl_Position = cur;
      }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; void main() { gl_FragColor = vec4(color, opacity); }`,
    transparent: (opts.opacity ?? 1) < 1, depthTest: opts.depthTest ?? true, depthWrite: false, side: THREE.DoubleSide,
  });
  fatMats.add(m);
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = opts.order ?? 5;
  mesh.onBeforeRender = () => { const c = ren.domElement; m.uniforms.res.value.set(c.clientWidth, c.clientHeight); };
  return mesh;
}
const matColor = (k) => ctx.matColor?.(k) || MCOL[k] || "#cccccc";
const libList = () => { try { return ctx.libs?.() || []; } catch { return []; } };
const solidColor = (s) => { if (s.lib) { const l = libList().find((x) => x[0] === s.lib); if (l) return l[2]; } return matColor(s.mat); };
const libSelect = (cur) => `<select data-sp="lib"><option value="">— خامة الدور (${esc(matName("carcass"))}…)</option>${libList().map(([k, n]) => `<option value="${esc(k)}" ${cur === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
const matName = (k) => ctx.matName?.(k) || MATS[k] || k;

// ================================================================== open / close
export function open(model, opts = {}) {
  ctx = opts;
  M = normalize(model ? G.clone(model) : newModel());
  M.room = opts.room ? G.clone(opts.room) : null;
  startRoom = JSON.stringify(M.room);
  if (M.room?.walls?.[0]) { ui.wallT = +M.room.walls[0].t || Room.WALL_T; ui.wallH = +M.room.walls[0].h || Room.WALL_H; }
  mname = opts.name || "تصميم حر";
  hist.u = []; hist.r = [];
  Object.assign(ui, { tool: opts.tool || "select", sel: new Set(), st: null, axis: null, plane: "auto", copy: false, editGroup: null, face2d: null, msg: "", panel: window.innerWidth > 900 || !!opts.tool, rsel: null,
    // nothing from the last opening carries over: section cut, the focused cabinet piece, a size being typed, picked faces / edges / corners
    section: null, secPos: 0, cab: null, cabFocus: null, dimEdit: null, face: null, edge: null, vertex: null, tapeLast: null, lastMove: null, lastPush: null });
  startJSON = JSON.stringify(M);
  if (!el) build();
  el.hidden = false;
  document.body.classList.add("indraw");
  alive = true;
  if (ui.ortho) { ui.ortho = false; swapCam(); }
  vcbNormal(); { const i = el.querySelector("#dsVcb"); i.value = ""; delete i.dataset.typed; el.querySelector("#dsVcbL").textContent = "المقاس"; }
  el.querySelector("#dsBoxSel").hidden = true; loupe = null;
  resize();
  rebuild();
  // the first opening: the orbit controls load a moment later — the view waits for them (else their own default view wins)
  const nonEmpty = !!(M.solids.length || M.sketches.length || M.room?.pts?.length);
  const fit = () => { if (opts.tool === "wall") { setView("top", nonEmpty ? undefined : 700); if (nonEmpty) zoomExtents(); } else if (nonEmpty) { if (!camSet) setView("iso"); zoomExtents(); } else setView("iso", 160); camSet = true; };
  if (ctl) fit(); else pendingView = fit;
  renderUI();
  loop();
}
let pendingView = null, camSet = false;
export function close() {
  if (!el) return;
  el.hidden = true; alive = false;
  document.body.classList.remove("indraw");
  cancelAnimationFrame(raf);
}
export const isOpen = () => !!el && !el.hidden;
if (typeof window !== "undefined" && location.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__ds = { cabAdd, cabRegen, curCab, Cab, M: () => M, ui, scr: (P) => scr(P), setTool: (t) => setTool(t), G, pick: (x, y) => { const h = pickAny(x, y); return h && { ref: h.ref, kind: h.face?.kind, sid: h.sid }; }, click: (x, y) => TOOL[ui.tool]?.click?.([x, y]), pickEdge, pickVertex, rebuild: () => { rebuild(); renderUI(); } };
function normalize(m) {
  for (const k of ["solids", "sketches", "paths", "sweeps", "guides", "dims", "texts", "groups", "cabs"]) if (!Array.isArray(m[k])) m[k] = [];
  for (const s of m.solids) { s.id ||= uid(); s.holes ||= []; s.pockets ||= []; s.mat ||= "carcass"; s.name ||= "لوح"; s.outer = G.ccw(s.outer); }
  return m;
}

// ================================================================== DOM
function build() {
  host = document.body;
  el = document.createElement("div");
  el.id = "drawStudio"; el.className = "ds"; el.hidden = true;
  el.innerHTML = `<header class="dsbar">
      <button class="dsb" data-ds="mylib" title="احفظ التصميم ده في مكتبتي">⭐ للمكتبة</button><button class="dsb primary" data-ds="done">✓ خلصت</button><button class="dsb" data-ds="cancel" title="اقفل من غير حفظ">✕</button>
      <input class="dsname" id="dsName" aria-label="اسم التصميم">
      <span class="dsgrp"><button class="dsb" data-ds="undo" title="تراجع">↶</button><button class="dsb" data-ds="redo" title="إعادة">↷</button></span>
      <span class="dsgrp dsviews"><button class="dsb primary" data-ds="home" title="رجّع الكاميرا للوضع الأساسي">🏠</button><button class="dsb" data-view="iso" title="منظور">⬢</button><button class="dsb" data-view="top" title="من فوق">فوق</button><button class="dsb" data-view="front" title="من قدام">قدام</button><button class="dsb" data-view="right" title="من الجنب">جنب</button><button class="dsb" data-view="back" title="من ورا">ورا</button><button class="dsb" data-view="left" title="من الشمال">شمال</button><button class="dsb" data-ds="zoomx" title="شوف الكل">⤢</button><button class="dsb" data-ds="ortho" title="منظور / مسطّح">⊡</button></span>
      <span class="dsgrp"><button class="dsb" data-ds="xray" title="شفاف">◐</button><button class="dsb" data-ds="section" title="قطاع">✂</button><button class="dsb" data-ds="panel" title="اللوحة الجانبية">☰</button><button class="dsb" data-ds="help" title="شرح">؟</button></span>
    </header>
    <div class="dsmain">
      <nav class="dstools" aria-label="أدوات الرسم"><input class="dstq" id="dsToolQ" type="search" placeholder="🔍 أداة" aria-label="دوّر على أداة">
        <div class="dstg fav"><small>⭐ الأكثر استخداماً</small>${FAV_TOOLS.map((k) => { const t = TOOLS.flatMap(([, l]) => l).find((x) => x[0] === k); return t ? `<button class="dst" data-tool="${t[0]}" title="${t[2]}" aria-label="${t[2]}"><span>${t[1]}</span><em>${t[2]}</em></button>` : ""; }).join("")}</div>
        ${TOOLS.map(([g, l], gi) => `<div class="dstg ${toolGroupOpen(gi) ? "" : "closed"}" data-tg="${gi}"><small><button class="dstgh" data-tgh="${gi}">${g} <i>${toolGroupOpen(gi) ? "▾" : "▸"}</i></button></small>${l.map(([k, ic, n]) => `<button class="dst" data-tool="${k}" title="${n}" aria-label="${n}"><span>${ic}</span><em>${n}</em></button>`).join("")}</div>`).join("")}</nav>
      <div class="dsview" id="dsView"><div class="dslabels" id="dsLabels"></div><div class="dshandles" id="dsHandles"></div><div class="dsboxsel" id="dsBoxSel" hidden></div><canvas class="dsloupe" id="dsLoupe" width="240" height="240" hidden></canvas><div class="dsmsg" id="dsMsg"></div><div class="dsconfirm" id="dsConfirm" hidden></div><div class="dssec" id="dsSec" hidden><input type="range" id="dsSecPos" min="-200" max="400" step="0.5" value="0"></div></div>
      <aside class="dsside" id="dsSide"></aside>
    </div>
    <footer class="dsfoot">
      <span class="dsgrp dsaxes"><button class="dsb ax0" data-axis="0" title="اقفل على المحور الأحمر (العرض)">X</button><button class="dsb ax1" data-axis="1" title="اقفل على المحور الأخضر (العمق)">Y</button><button class="dsb ax2" data-axis="2" title="اقفل على المحور الأزرق (الارتفاع)">Z</button></span>
      <select id="dsPlane" class="dssel" aria-label="سطح الرسم"><option value="auto">الرسم: على الوش اللي تحت صباعك</option><option value="ground">على الأرض</option><option value="front">حيطة قدام</option><option value="side">حيطة جنب</option></select>
      <button class="dsb snapbtn on" data-ds="snapmenu" title="المغناطيس (Snap)">🧲 مغناطيس</button>
      <select id="dsStep" class="dssel" aria-label="الشبكة"><option value="0">شبكة: من غير</option><option value="0.1">شبكة 1 مم</option><option value="0.5">شبكة 5 مم</option><option value="1">شبكة 1 سم</option><option value="5">شبكة 5 سم</option><option value="10">شبكة 10 سم</option></select>
      <span class="dshint" id="dsHint"></span>
      <label class="dsvcb"><span id="dsVcbL">المقاس</span><input id="dsVcb" data-keypad data-kpsolo data-kpextra data-neg autocomplete="off" placeholder="—"></label>
      <span class="dsgrp dskeys"><button class="dsb" data-vk=",">,</button><button class="dsb" data-vk="x">x</button><button class="dsb" data-vk="/">/</button><button class="dsb" data-vk="s">s</button><button class="dsb primary" data-vk="enter">↵</button><button class="dsb" data-ds="esc" title="الغي الخطوة">✕</button></span>
    </footer>`;
  host.appendChild(el);
  const view = el.querySelector("#dsView");
  labelsEl = el.querySelector("#dsLabels");
  ren = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
  ren.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  ren.localClippingEnabled = true;
  view.prepend(ren.domElement);
  ren.domElement.className = "dscanvas";
  scene = new THREE.Scene();
  scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--stage").trim() || "#eef0ea");
  camP = new THREE.PerspectiveCamera(40, 1, 1, 20000);
  camO = new THREE.OrthographicCamera(-100, 100, 100, -100, -10000, 10000);
  cam = camP;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a80, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.25); sun.position.set(300, 600, 400); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-400, 200, -300); scene.add(fill);
  world = new THREE.Group(); scene.add(world);
  solidsG = new THREE.Group(); sketchG = new THREE.Group(); extraG = new THREE.Group(); overG = new THREE.Group(); roomG = new THREE.Group();
  world.add(solidsG, sketchG, extraG, roomG); scene.add(overG);
  grid = new THREE.GridHelper(1000, 100, 0xc9ccc3, 0xe2e4dd); grid.material.transparent = true; grid.material.opacity = 0.45; grid.material.depthWrite = false; grid.renderOrder = -1; scene.add(grid);
  const axl = (d, c) => { const g = new THREE.BufferGeometry().setFromPoints([T3([0, 0, 0]), T3(G.mul(d, 600))]); return new THREE.Line(g, new THREE.LineBasicMaterial({ color: c })); };
  scene.add(axl([1, 0, 0], AXC[0]), axl([0, 1, 0], AXC[1]), axl([0, 0, 1], AXC[2]));
  import("three/addons/controls/OrbitControls.js").then(({ OrbitControls }) => {
    ctl = new OrbitControls(cam, ren.domElement);
    ctl.enableDamping = false; ctl.screenSpacePanning = true; ctl.zoomToCursor = true;
    ctl.addEventListener("change", () => { wallFade(); need(); });
    applyControls();
    if (pendingView) { const f = pendingView; pendingView = null; f(); } else setView("iso", 160);
  });
  // our own pointer handling runs first (capture on the view) so the tool decides before the orbit does
  view.addEventListener("pointerdown", onDown, true);
  el.querySelector("#dsHandles").addEventListener("pointerdown", handleDown);
  view.addEventListener("pointermove", onMove);
  view.addEventListener("pointerup", onUp);
  view.addEventListener("pointercancel", () => {
    downs.clear(); press = null; eraseDrag = false;
    el.querySelector("#dsBoxSel").hidden = true; // a box select cut short by the system
    if (loupe) { loupe = null; need(); }
    if (ui.tool === "select" && ctl) { ctl.touches.ONE = -1; ctl.mouseButtons.LEFT = -1; }
    rtDrop?.();
  });
  view.addEventListener("dblclick", (e) => { if (ui.tool === "line" && ui.st?.wpts?.length >= 2) { finishLine(false); e.preventDefault(); } if (ui.tool === "wall" && ui.st?.wpts?.length >= 2) { finishWall(false); e.preventDefault(); } });
  view.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("click", onClick);
  el.addEventListener("change", onChange);
  el.addEventListener("input", onInput);
  el.querySelector("#dsVcb").addEventListener("focus", (e) => { if (!e.target.dataset.typed) e.target.value = ""; });
  el.querySelector("#dsVcb").addEventListener("input", (e) => { e.target.dataset.typed = "1"; });
  el.querySelector("#dsVcb").addEventListener("blur", (e) => { delete e.target.dataset.typed; setTimeout(() => { if (document.activeElement !== e.target && ui.dimEdit != null) { ui.dimEdit = null; vcbSet("", "المقاس"); need(); } }, 400); });
  el.querySelector("#dsVcb").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); vcbEnter(); } else if (e.key === "Escape") { cancelStep(); } });
  window.addEventListener("resize", () => { if (alive) resize(); });
  window.addEventListener("keydown", (e) => {
    if (!alive || e.target.closest?.("input,select,textarea")) return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (k === "escape") { cancelStep(); return; }
    if (k === "enter") { TOOL[ui.tool]?.enter?.(); return; }
    if ((e.metaKey || e.ctrlKey) && k === "c") { copySel(); e.preventDefault(); return; }
    if ((e.metaKey || e.ctrlKey) && k === "x") { copySel(); delSel(); e.preventDefault(); return; }
    if ((e.metaKey || e.ctrlKey) && k === "v") { pasteClip(e.shiftKey); e.preventDefault(); return; }
    if ((e.metaKey || e.ctrlKey) && k === "a") { selectAll(); e.preventDefault(); return; }
    if ((e.metaKey || e.ctrlKey) && k === "d") { dupSel(); e.preventDefault(); return; }
    if (k === "delete" || k === "backspace") { delSel(); return; }
    if (k === "arrowright") { lockAxis(0); return; } if (k === "arrowleft") { lockAxis(1); return; } if (k === "arrowup") { lockAxis(2); return; }
    const keys = { " ": "select", l: "line", r: "rect", c: "circle", a: "arc", p: "pushpull", m: "move", q: "rotate", s: "scale", f: "offset", t: "tape", e: "eraser", b: "paint", o: "orbit", h: "pan" };
    if (keys[k]) { setTool(keys[k]); return; }
    if (/^[\d.,\-x/]$/.test(e.key)) { const v = el.querySelector("#dsVcb"); v.value = ""; v.focus(); }
  });
}
function resize() {
  const v = el.querySelector("#dsView"), w = Math.max(50, v.clientWidth), h = Math.max(50, v.clientHeight);
  ren.setSize(w, h);
  camP.aspect = w / h; camP.updateProjectionMatrix();
  const hh = (camO.top - camO.bottom) / 2 || 100;
  camO.left = (-hh * w) / h; camO.right = (hh * w) / h; camO.updateProjectionMatrix();
  need();
}
let dirty = true;
const need = () => { dirty = true; };
function loop() {
  if (!alive) return;
  raf = requestAnimationFrame(loop);
  if (!dirty) return;
  dirty = false;
  ren.render(scene, cam);
  drawLoupe();
  placeLabels();
}

// ================================================================== camera
function applyControls() {
  if (!ctl) return;
  ctl.object = cam;
  const nav = ui.tool === "orbit" ? THREE.TOUCH.ROTATE : ui.tool === "pan" ? THREE.TOUCH.PAN : -1;
  ctl.touches = { ONE: nav, TWO: THREE.TOUCH.DOLLY_PAN };
  ctl.mouseButtons = { LEFT: ui.tool === "orbit" ? THREE.MOUSE.ROTATE : ui.tool === "pan" ? THREE.MOUSE.PAN : -1, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN };
  ctl.enableRotate = !ui.face2d;
}
function modelBox() {
  const b = new THREE.Box3();
  for (const o of [solidsG, sketchG, extraG, roomG]) b.expandByObject(o);
  if (b.isEmpty()) b.set(new THREE.Vector3(-30, 0, -60), new THREE.Vector3(90, 15, 20));
  return b;
}
function setView(kind, distHint) {
  if (!ctl) return;
  const b = modelBox(), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
  const r = (distHint || Math.max(size.x, size.y, size.z, 60) * 1.9) * aspK();
  const dirs = { iso: [1, 0.85, 1.25], top: [0, 1, 0.0001], front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0] };
  const d = new THREE.Vector3(...dirs[kind]).normalize();
  if (kind !== "iso" && !ui.ortho) { ui.ortho = true; swapCam(); }
  if (kind === "iso" && ui.ortho && !ui.face2d) { ui.ortho = false; swapCam(); }
  cam.position.copy(c).addScaledVector(d, r);
  cam.up.set(0, 1, 0);
  if (kind === "top") cam.up.set(0, 0, -1);
  ctl.target.copy(c);
  fitOrtho(r);
  cam.lookAt(c); ctl.update(); need();
}
function fitOrtho(r) { const v = el.querySelector("#dsView"), a = v.clientWidth / Math.max(1, v.clientHeight), h = r * 0.42; camO.top = h; camO.bottom = -h; camO.left = -h * a; camO.right = h * a; camO.zoom = 1; camO.updateProjectionMatrix(); }
function swapCam() {
  const nc = ui.ortho ? camO : camP;
  nc.position.copy(cam.position); nc.up.copy(cam.up); nc.quaternion.copy(cam.quaternion);
  cam = nc;
  if (ctl) { ctl.object = cam; ctl.update(); }
  need();
}
/** a tall (portrait) view needs the camera further back for the same model to fit across */
function aspK() { const v = el?.querySelector("#dsView"); const a = v ? v.clientWidth / Math.max(1, v.clientHeight) : 1; return a < 1 ? Math.min(1.8, 1 / a) : 1; }
function zoomExtents() {
  if (!ctl) return;
  const b = modelBox(), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z, 40) * 1.8 * aspK();
  const d = cam.position.clone().sub(ctl.target).normalize();
  ctl.target.copy(c); cam.position.copy(c).addScaledVector(d, r); fitOrtho(r); cam.lookAt(c); ctl.update(); need();
}
/** look straight at one face of a solid (2D drawing of the piece's shape) */
function lookAtFace(s, face) {
  const pl = G.facePlane(s, face), n = G.nOf(pl);
  ui.face2d = { sid: s.id, kind: face.kind, plane: pl };
  ui.plane = "face2d";
  if (!ui.ortho) { ui.ortho = true; swapCam(); }
  const fo = face.outer || G.solidFaces(s).find((f) => f.kind === face.kind)?.outer || [];
  const fl = fo.map((P) => G.toPlane(pl, P).slice(0, 2)), b = G.bbox2(fl.length ? fl : s.outer);
  const c = G.toWorld(pl, [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], 0);
  const r = Math.max(b[2] - b[0], b[3] - b[1], 30) * 1.7;
  ctl.target.copy(T3(c));
  cam.position.copy(T3(G.add(c, G.mul(n, r))));
  cam.up.copy(T3(pl.v).sub(T3([0, 0, 0])).normalize());
  fitOrtho(r); cam.lookAt(T3(c)); ctl.update();
  applyControls(); need(); renderUI();
}
function exit2d() { ui.face2d = null; ui.plane = "auto"; applyControls(); setView("iso"); renderUI(); }

// ================================================================== building the scene from the model
function triFaces(faces) {
  const pos = [], tri2face = [];
  faces.forEach((f, fi) => {
    const o = f.outer[0], e1 = G.norm(G.sub(f.outer[1], f.outer[0])), e2 = G.norm(G.cross(f.n, e1));
    const to2 = (P) => new THREE.Vector2(G.dot(G.sub(P, o), e1), G.dot(G.sub(P, o), e2));
    let tris;
    try { tris = THREE.ShapeUtils.triangulateShape(f.outer.map(to2), (f.holes || []).map((h) => h.map(to2))); } catch { tris = []; }
    const all = [...f.outer, ...(f.holes || []).flat()];
    for (const [i, j, k] of tris) {
      let A = all[i], B = all[j], C = all[k];
      if (!A || !B || !C) continue;
      if (G.dot(G.cross(G.sub(B, A), G.sub(C, A)), f.n) < 0) [B, C] = [C, B];
      for (const P of [A, B, C]) pos.push(P[0], P[2], -P[1]);
      tri2face.push(fi);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return { geo, tri2face };
}
const edgeMat = new THREE.LineBasicMaterial({ color: 0x2b2f2a });
const selEdgeMat = new THREE.LineBasicMaterial({ color: 0x2f6fdf });
edgeMat.userData.shared = selEdgeMat.userData.shared = true; // module-wide: never disposed
function segGeo(segs) { const a = []; for (const [p, q] of segs) a.push(p[0], p[2], -p[1], q[0], q[2], -q[1]); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g; }
/** empty a group and free the GPU side of what it held (geometries and the per-rebuild materials — the iPad runs out of memory otherwise) */
function clear(g) {
  while (g.children.length) {
    const c = g.children.pop();
    c.traverse?.((o) => {
      o.geometry?.dispose?.();
      for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) { if (m.userData?.shared) continue; fatMats.delete(m); m.dispose?.(); }
    });
  }
}
function selected(ref) {
  if (ui.sel.has(ref)) return true;
  if (ref.startsWith("s:")) { const s = M.solids.find((x) => "s:" + x.id === ref); return !!(s?.group && ui.sel.has("G:" + s.group)); }
  return false;
}
function rebuild() {
  clear(solidsG); clear(sketchG); clear(extraG); clear(roomG); objs.clear();
  buildRoom();
  cabGhosts();
  const clip = clipPlanes();
  for (const s of M.solids) {
    if (s.hidden) continue;
    const ref = "s:" + s.id, faces = G.solidFaces(s), { geo, tri2face } = triFaces(faces);
    const sel = selected(ref), dim = ui.editGroup && s.group !== ui.editGroup;
    const mat = new THREE.MeshStandardMaterial({ color: solidColor(s), roughness: 0.75, metalness: 0, side: THREE.DoubleSide, transparent: ui.xray || dim, opacity: ui.xray ? 0.35 : dim ? 0.25 : 1,
      emissive: new THREE.Color(sel ? 0x2f6fdf : 0x000000), emissiveIntensity: sel ? 0.28 : 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, clippingPlanes: clip });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { ref, sid: s.id, tri2face, faces };
    const ln = new THREE.LineSegments(segGeo(G.solidEdges(s)), sel ? selEdgeMat : edgeMat);
    ln.material.clippingPlanes = clip;
    solidsG.add(mesh, ln);
    objs.set(ref, [mesh, ln]);
  }
  for (const w of M.sweeps) {
    if (w.hidden) continue;
    const ref = "w:" + w.id, faces = G.sweepFaces(w.profile, w.path, w.closed), { geo, tri2face } = triFaces(faces);
    const sel = selected(ref);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: matColor(w.mat), roughness: 0.6, side: THREE.DoubleSide, emissive: new THREE.Color(sel ? 0x2f6fdf : 0), emissiveIntensity: sel ? 0.3 : 0, transparent: ui.xray, opacity: ui.xray ? 0.35 : 1, clippingPlanes: clip }));
    mesh.userData = { ref, tri2face, faces };
    const eg = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), sel ? selEdgeMat : edgeMat);
    extraG.add(mesh, eg); objs.set(ref, [mesh, eg]);
  }
  for (const k of M.sketches) {
    const ref = "k:" + k.id, sel = selected(ref);
    const pts = k.pts.map((p) => T3(G.toWorld(k.plane, p)));
    if (k.closed) pts.push(pts[0].clone());
    const ln = fatLine(pts, sel ? 0x2f6fdf : 0x111511, sel ? 3.5 : 2.5, false, { order: 6 });
    sketchG.add(ln);
    const list = [ln];
    if (k.closed && k.pts.length >= 3) {
      const f = { n: G.nOf(k.plane), outer: G.ccw(k.pts).map((p) => G.toWorld(k.plane, p, 0.02)), holes: (k.holes || []).map((h) => h.map((p) => G.toWorld(k.plane, p, 0.02))) };
      if (G.area(k.pts) < 0) f.outer = G.ccw(k.pts).map((p) => G.toWorld(k.plane, p, 0.02));
      const { geo } = triFaces([f]);
      const fm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: sel ? 0x2f6fdf : 0x8fa5c9, transparent: true, opacity: sel ? 0.45 : 0.28, side: THREE.DoubleSide, depthWrite: false }));
      fm.userData = { ref, sketch: k.id };
      sketchG.add(fm); list.push(fm);
    }
    ln.userData = { ref, sketch: k.id };
    objs.set(ref, list);
  }
  for (const pa of M.paths) {
    const ref = "p:" + pa.id, sel = selected(ref);
    const pts = pa.pts.map(T3); if (pa.closed) pts.push(pts[0].clone());
    const ln = fatLine(pts, sel ? 0x2f6fdf : 0x111511, sel ? 3.5 : 2.5, false, { order: 6 });
    ln.userData = { ref }; sketchG.add(ln); objs.set(ref, [ln]);
  }
  // guides, dimensions
  for (const g of M.guides) {
    const ref = "g:" + g.id, sel = selected(ref);
    if (g.kind === "point") {
      const s = 1.5, p = g.a;
      const lg = segGeo([[G.add(p, [-s, 0, 0]), G.add(p, [s, 0, 0])], [G.add(p, [0, -s, 0]), G.add(p, [0, s, 0])], [G.add(p, [0, 0, -s]), G.add(p, [0, 0, s])]]);
      const o = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: sel ? 0x2f6fdf : 0x6b6f66 }));
      o.userData = { ref }; extraG.add(o); objs.set(ref, [o]);
    } else {
      const [A, B] = guideEnds(g);
      const o = new THREE.Line(new THREE.BufferGeometry().setFromPoints([T3(A), T3(B)]), new THREE.LineDashedMaterial({ color: sel ? 0x2f6fdf : 0x7d8278, dashSize: 3, gapSize: 2 }));
      o.computeLineDistances(); o.userData = { ref }; extraG.add(o); objs.set(ref, [o]);
    }
  }
  for (const d of M.dims) {
    const ref = "d:" + d.id, sel = selected(ref);
    const A = G.add(d.a, d.o), B = G.add(d.b, d.o);
    const o = new THREE.LineSegments(segGeo([[d.a, A], [d.b, B], [A, B]]), new THREE.LineBasicMaterial({ color: sel ? 0x2f6fdf : 0x3b4038 }));
    o.userData = { ref }; extraG.add(o); objs.set(ref, [o]);
  }
  const fsel = faceOf(ui.face);
  if (fsel) {
    const { geo } = triFaces([fsel.f]);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffc233, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.renderOrder = 4; extraG.add(m);
    extraG.add(fatLine([...fsel.f.outer, fsel.f.outer[0]], 0xd98b00, 3, false, { order: 7 }));
  }
  const esel = edgeOf(ui.edge);
  if (esel) { extraG.add(fatLine([esel.a, esel.b], 0xd98b00, 5, false, { order: 8 })); for (const P of [esel.a, esel.b]) { const d = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10), new THREE.MeshBasicMaterial({ color: 0xd98b00, depthTest: false })); d.position.copy(T3(P)); d.renderOrder = 9; extraG.add(d); } }
  const vsel = vertexOf(ui.vertex);
  if (vsel) { const d = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12), new THREE.MeshBasicMaterial({ color: 0xd98b00, depthTest: false })); d.position.copy(T3(vsel.p)); d.renderOrder = 9; extraG.add(d); }
  grid.visible = !ui.face2d;
  need();
  renderLabelsList();
}
/** a guide's drawn ends: a measured segment as it is; a guide line a little past the drawing (not 16 m long) */
function guideEnds(g) {
  if (g.kind === "seg") return [g.a, g.b];
  const d = G.norm(G.sub(g.b, g.a));
  let r = 120;
  for (const s of M.solids) { const b = G.solidBox(s); r = Math.max(r, Math.abs(b.x0 - g.a[0]), Math.abs(b.x1 - g.a[0]), Math.abs(b.y0 - g.a[1]), Math.abs(b.y1 - g.a[1]), Math.abs(b.z1 - g.a[2])); }
  r = Math.min(r * 1.15 + 20, 800);
  return [G.add(g.a, G.mul(d, -r)), G.add(g.a, G.mul(d, r))];
}
function clipPlanes() {
  if (!ui.section) return [];
  const n = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]][ui.section];
  const tn = T3(n);
  return [new THREE.Plane(tn.normalize(), ui.secPos)];
}

// ================================================================== labels (dimensions, text, live measurements)
let labelList = [];
function renderLabelsList() {
  labelList = [];
  for (const d of M.dims) labelList.push({ p: G.lerp(G.add(d.a, d.o), G.add(d.b, d.o), 0.5), t: f1(G.dist(d.a, d.b)), cls: "dim", ref: "d:" + d.id });
  for (const t of M.texts) labelList.push({ p: t.p, t: t.s, cls: "txt", ref: "t:" + t.id });
  roomLabels(labelList);
  placeLabels();
}
let live = []; // { p, t, cls }
function placeLabels() {
  if (!labelsEl) return;
  const v = ren.domElement, w = v.clientWidth, h = v.clientHeight;
  const all = [...labelList, ...live];
  let html = "";
  for (const L of all) {
    const q = T3(L.p).project(cam);
    if (q.z > 1 || q.z < -1) continue;
    const x = ((q.x + 1) / 2) * w, y = ((1 - q.y) / 2) * h;
    const on = L.ref && (ui.sel.has(L.ref) || (ui.rsel && L.ref === ui.rsel.ref));
    html += `<span class="dsl ${L.cls || ""} ${on ? "on" : ""}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px${L.bg ? `;background:${L.bg}` : ""}">${esc(L.t)}</span>`;
  }
  labelsEl.innerHTML = html;
  placeHandles();
}

// ================================================================== picking & inference
const ray = new THREE.Raycaster();
let lastXY = [0, 0];
function rayAt(cx, cy) {
  const r = ren.domElement.getBoundingClientRect();
  const nd = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(nd, cam);
  ray.params.Line.threshold = 1.5;
  return { o: W3(ray.ray.origin), d: W3(ray.ray.direction).map((v, i) => (i === 1 ? v : v)), rect: r, nd };
}
function scr(P) {
  const r = ren.domElement.getBoundingClientRect(), q = T3(P).project(cam);
  return [((q.x + 1) / 2) * r.width + r.left, ((1 - q.y) / 2) * r.height + r.top, q.z];
}
/** the mesh under the pointer. Cabinet cavity panes (see-through, at the cavity's front) only count with `panes`
 *  (the select tool) and only when no piece sits right there (a shelf / partition / drawer box just behind the pane wins);
 *  selection markers (no ref) never count */
function pickMesh(cx, cy, { panes = false } = {}) {
  rayAt(cx, cy);
  const list = [];
  solidsG.children.forEach((o) => { if (o.isMesh) list.push(o); });
  extraG.children.forEach((o) => { if (o.isMesh && o.userData?.ref && (panes || o.userData.cav == null)) list.push(o); });
  roomG.children.forEach((o) => { if (o.isMesh && o.userData.ref && o.visible && !(o.userData.wall && !o.userData.open && o.material.opacity < 0.5 && !ui.xray)) list.push(o); });
  const hits = ray.intersectObjects(list, false).filter((h) => !ui.section || clipPlanes()[0].distanceToPoint(h.point) >= -0.01);
  if (!hits.length) return null;
  const isPane = (x) => x.object.userData.cav != null;
  const solid = hits.find((x) => !isPane(x)), pane = hits.find(isPane);
  const h = pane && (!solid || solid.distance > pane.distance + 3) ? pane : solid;
  if (!h) return null;
  const ud = h.object.userData, fi = ud.tri2face?.[h.faceIndex];
  let n = null;
  if (ud.wall && !ud.open && h.face) {
    // a wall: the side of it facing the camera (walls are double sided)
    const wn = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (wn.dot(ray.ray.direction) > 0) wn.negate();
    n = G.norm([wn.x, -wn.z, wn.y]);
  }
  return { ref: ud.ref, sid: ud.sid, face: ud.faces?.[fi], p: W3(h.point), dist: h.distance, wallN: n };
}
function pickSketch(cx, cy) {
  rayAt(cx, cy);
  const fills = sketchG.children.filter((o) => o.isMesh && !o.material.isShaderMaterial);
  const h = ray.intersectObjects(fills, false)[0];
  if (h) return { ref: h.object.userData.ref, kid: h.object.userData.sketch, p: W3(h.point), dist: h.distance };
  // an open sketch: near its line on screen
  let best = null;
  for (const k of M.sketches) {
    const W = k.pts.map((p) => G.toWorld(k.plane, p));
    for (let i = 0; i + 1 < W.length + (k.closed ? 1 : 0); i++) {
      const a = scr(W[i]), b = scr(W[(i + 1) % W.length]);
      const d = segDist2([cx, cy], a, b);
      if (d.d < 10 && (!best || d.d < best.d)) best = { ref: "k:" + k.id, kid: k.id, d: d.d, p: G.lerp(W[i], W[(i + 1) % W.length], d.t) };
    }
  }
  for (const pa of M.paths) {
    for (let i = 0; i + 1 < pa.pts.length + (pa.closed ? 1 : 0); i++) {
      const A = pa.pts[i], B = pa.pts[(i + 1) % pa.pts.length], d = segDist2([cx, cy], scr(A), scr(B));
      if (d.d < 10 && (!best || d.d < best.d)) best = { ref: "p:" + pa.id, pid: pa.id, d: d.d, p: G.lerp(A, B, d.t) };
    }
  }
  return best;
}
/** v62: sub-entity picking — the nearest outline vertex / hard edge of a solid to the tap (screen distance), for the «ركن» / «حرف» pick modes */
function pickVertex(cx, cy, sid = null) {
  let best = null;
  for (const s of M.solids) {
    if ((sid && s.id !== sid) || s.hidden) continue;
    for (const q of G.solidPoints(s)) {
      const a = scr(q.p), d = Math.hypot(a[0] - cx, a[1] - cy);
      if (d < 18 && (!best || d < best.d)) best = { sid: s.id, d, p: q.p, vi: q.i, loop: q.loop, w: q.w };
    }
  }
  if (!best) return null;
  const s = M.solids.find((x) => x.id === best.sid);
  const loopIdx = best.loop === s.outer ? -1 : s.holes.indexOf(best.loop);
  if (loopIdx < -1 || (loopIdx === -1 && best.loop !== s.outer)) return null; // pocket corners: not editable here
  return { sid: s.id, loopIdx, vi: best.vi, p: best.p, level: best.w > s.depth / 2 ? "top" : "bottom" };
}
function pickEdge(cx, cy, sid = null) {
  let best = null;
  for (const s of M.solids) {
    if ((sid && s.id !== sid) || s.hidden) continue;
    const loops = [s.outer, ...(s.holes || [])];
    loops.forEach((L, li) => {
      for (let i = 0; i < L.length; i++) {
        const j = (i + 1) % L.length;
        for (const [lvl, w] of [["top", s.depth], ["bottom", 0]]) {
          const A = G.toWorld(s.plane, L[i], w), B = G.toWorld(s.plane, L[j], w), d = segDist2([cx, cy], scr(A), scr(B));
          if (d.d < 12 && (!best || d.d < best.d)) best = { sid: s.id, loopIdx: li - 1, i, j, level: lvl, a: A, b: B, d: d.d };
        }
        const A = G.toWorld(s.plane, L[i], 0), B = G.toWorld(s.plane, L[i], s.depth), d = segDist2([cx, cy], scr(A), scr(B));
        if (d.d < 12 && (!best || d.d < best.d)) best = { sid: s.id, loopIdx: li - 1, i, j: i, level: "vert", a: A, b: B, d: d.d };
      }
    });
  }
  return best;
}
function edgeOf(e) {
  if (!e) return null;
  const s = M.solids.find((x) => x.id === e.sid); if (!s) return null;
  const L = e.loopIdx < 0 ? s.outer : s.holes[e.loopIdx]; if (!L || !L[e.i]) return null;
  const w = e.level === "top" ? s.depth : 0;
  const a = e.level === "vert" ? G.toWorld(s.plane, L[e.i], 0) : G.toWorld(s.plane, L[e.i], w);
  const b = e.level === "vert" ? G.toWorld(s.plane, L[e.i], s.depth) : G.toWorld(s.plane, L[e.j], w);
  return { s, L, a, b };
}
function vertexOf(v) {
  if (!v) return null;
  const s = M.solids.find((x) => x.id === v.sid); if (!s) return null;
  const L = v.loopIdx < 0 ? s.outer : s.holes[v.loopIdx]; if (!L || !L[v.vi]) return null;
  return { s, L, p: G.toWorld(s.plane, L[v.vi], v.level === "top" ? s.depth : 0) };
}
function pickAny(cx, cy) {
  let m = pickMesh(cx, cy, { panes: true });
  // a tap on a wall near a socket / window / door means that thing, not the wall under it
  if (m?.ref?.startsWith("W:")) { const near = roomNearPick(cx, cy); if (near) m = near; }
  const k = pickSketch(cx, cy);
  // a text or a dimension label right under the finger beats the board behind it
  for (const L of labelList) { if (!L.ref || /^[EW]:/.test(L.ref)) continue; const a = scr(L.p); if (Math.hypot(a[0] - cx, a[1] - cy) < 16) return { ref: L.ref, d: 0 }; }
  if (k && (!m || k.dist == null || k.dist <= m.dist + 0.5 || k.d != null)) return k;
  if (m) return m;
  // guides / dims / texts near the pointer
  let best = null;
  for (const g of M.guides) {
    const a = scr(g.a), d = g.kind === "point" ? Math.hypot(a[0] - cx, a[1] - cy) : (() => { const [A, B] = guideEnds(g); return segDist2([cx, cy], scr(A), scr(B)).d; })();
    if (d < 10 && (!best || d < best.d)) best = { ref: "g:" + g.id, d };
  }
  for (const L of labelList) { const a = scr(L.p); const d = Math.hypot(a[0] - cx, a[1] - cy); if (d < 22 && (!best || d < best.d)) best = { ref: L.ref, d }; }
  return best;
}
function segDist2(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return { d: Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)), t };
}
/** closest point on the line (A + t·dir) to the pointer's ray */
function closestOnLine(A, dir, cx, cy) {
  const { o, d } = rayAt(cx, cy);
  const w0 = G.sub(A, o), a = G.dot(dir, dir), b = G.dot(dir, d), c = G.dot(d, d), dd = G.dot(dir, w0), e = G.dot(d, w0);
  const den = a * c - b * b;
  if (Math.abs(den) < 1e-9) return null;
  const t = (b * e - c * dd) / den;
  return { p: G.add(A, G.mul(dir, t)), t };
}
function snapPoints() {
  const pts = [];
  for (const s of M.solids) {
    if (s.hidden) continue;
    for (const q of G.solidPoints(s)) pts.push({ p: q.p, kind: "end", sid: s.id, vi: q.i, loop: q.loop, w: q.w });
    for (const [a, b] of G.solidEdges(s)) pts.push({ p: G.lerp(a, b, 0.5), kind: "mid", sid: s.id, seg: [a, b] });
  }
  for (const k of M.sketches) {
    const W = k.pts.map((p) => G.toWorld(k.plane, p));
    W.forEach((p, i) => { if (!k.smooth || i === 0 || i === W.length - 1) pts.push({ p, kind: "end", kid: k.id, vi: i }); });
    for (let i = 0; i + 1 < W.length + (k.closed ? 1 : 0); i++) if (!k.smooth) pts.push({ p: G.lerp(W[i], W[(i + 1) % W.length], 0.5), kind: "mid", kid: k.id });
    if (k.center) pts.push({ p: G.toWorld(k.plane, k.center), kind: "center", kid: k.id });
  }
  for (const g of M.guides) { pts.push({ p: g.a, kind: "guide" }); if (g.b) pts.push({ p: g.b, kind: "guide" }); }
  for (const w of M.sweeps) for (const p of w.path) pts.push({ p, kind: "end", wid: w.id });
  for (const pa of M.paths) { pa.pts.forEach((p) => pts.push({ p, kind: "end", pid: pa.id })); for (let i = 0; i + 1 < pa.pts.length; i++) pts.push({ p: G.lerp(pa.pts[i], pa.pts[i + 1], 0.5), kind: "mid", pid: pa.id }); }
  pts.push({ p: [0, 0, 0], kind: "origin" });
  for (const sg of roomSegs()) { pts.push({ p: P3(sg.A), kind: "end", room: true }, { p: P3(sg.B), kind: "end", room: true }, { p: P3(G.lerp([...sg.A, 0], [...sg.B, 0], 0.5)), kind: "mid", room: true }); }
  if (ui.st?.wpts) ui.st.wpts.forEach((p) => pts.push({ p, kind: "end", cur: true }));
  return pts;
}
/** where two circles (or arcs) drawn on the same plane cross — exactly, from their centres and radii */
function circleCrossings() {
  const C = M.sketches.filter((k) => k.center && k.smooth && k.closed && k.pts?.length > 2);
  const out = [];
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) {
    const a = C[i], b = C[j];
    if (!G.samePlane(a.plane, b.plane, 0.05)) continue;
    const c1 = a.center, c2 = G.toPlane(a.plane, G.toWorld(b.plane, b.center)).slice(0, 2);
    const r1 = Math.hypot(a.pts[0][0] - c1[0], a.pts[0][1] - c1[1]);
    const bp0 = G.toPlane(a.plane, G.toWorld(b.plane, b.pts[0])).slice(0, 2), r2 = Math.hypot(bp0[0] - c2[0], bp0[1] - c2[1]);
    const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy);
    if (d < 1e-6 || d > r1 + r2 + 1e-6 || d < Math.abs(r1 - r2) - 1e-6) continue;
    const t = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - t * t));
    const mx = c1[0] + (dx * t) / d, my = c1[1] + (dy * t) / d;
    for (const sg of h < 1e-6 ? [0] : [1, -1]) out.push({ p: G.toWorld(a.plane, [mx - (sg * dy * h) / d, my + (sg * dx * h) / d]), kind: "int", exact: true });
  }
  return out;
}
/** where two straight edges near the finger cross (lines, rectangles, board edges, walls, guides…) */
function edgeCrossings(cx, cy, pr) {
  const R = POINT_R * pr * 2.2, near = [];
  for (const e of snapEdges()) {
    const a = scr(e.a), b = scr(e.b);
    if (a[2] > 1 && b[2] > 1) continue;
    if (segDist2([cx, cy], a, b).d < R) near.push(e);
    if (near.length > 60) break;
  }
  const out = [];
  for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
    const A = near[i], B = near[j], u = G.sub(A.b, A.a), v = G.sub(B.b, B.a), w = G.sub(A.a, B.a);
    const aa = G.dot(u, u), bb = G.dot(u, v), cc = G.dot(v, v), dd = G.dot(u, w), ee = G.dot(v, w), den = aa * cc - bb * bb;
    if (den < 1e-9 * aa * cc) continue; // parallel
    const s = (bb * ee - cc * dd) / den, t = (aa * ee - bb * dd) / den;
    if (s < -1e-6 || s > 1 + 1e-6 || t < -1e-6 || t > 1 + 1e-6) continue;
    const P = G.add(A.a, G.mul(u, s)), Q = G.add(B.a, G.mul(v, t));
    if (G.dist(P, Q) > 0.05) continue;
    // a shared corner is already an "end" point
    if (Math.min(s, 1 - s) < 1e-4 && Math.min(t, 1 - t) < 1e-4) continue;
    out.push({ p: G.lerp(P, Q, 0.5), kind: "int" });
  }
  return out;
}
function snapEdges() {
  const segs = [];
  for (const s of M.solids) if (!s.hidden) for (const e of G.solidEdges(s)) segs.push({ a: e[0], b: e[1], sid: s.id });
  for (const k of M.sketches) { const W = k.pts.map((p) => G.toWorld(k.plane, p)); for (let i = 0; i + 1 < W.length + (k.closed ? 1 : 0); i++) segs.push({ a: W[i], b: W[(i + 1) % W.length], kid: k.id }); }
  for (const pa of M.paths) for (let i = 0; i + 1 < pa.pts.length + (pa.closed ? 1 : 0); i++) segs.push({ a: pa.pts[i], b: pa.pts[(i + 1) % pa.pts.length], pid: pa.id });
  for (const g of M.guides) if (g.kind !== "point") { const [A, B] = guideEnds(g); segs.push({ a: A, b: B, guide: true }); }
  for (const sg of roomSegs()) segs.push({ a: P3(sg.A), b: P3(sg.B), room: true });
  return segs;
}
const KLABEL = { end: "طرف", mid: "منتصف", center: "مركز", int: "تقاطع", guide: "خط مساعد", origin: "نقطة الأصل", edge: "على الحرف", face: "على الوش", plane: "", axis: "" };
/**
 * Where the pointer means, SketchUp-style: points first (end, middle, centre), then edges, faces, the drawing plane;
 * with an anchor, a direction along one of the three axes wins when the pointer is near it.
 * opts: { anchor, plane (stick to this plane), axes: allowed axis indices, noFace }
 */
function infer(cx, cy, opts = {}) {
  const r0 = inferCore(cx, cy, opts);
  if (r0 && /end|mid|center/.test(r0.kind)) { // remembered for "in line with a point" inference
    ui.recent = [r0.p, ...(ui.recent || []).filter((q) => G.dist(q, r0.p) > 0.05)].slice(0, 5);
  }
  return r0;
}
const SN = () => ui.snap;
function inferCore(cx, cy, opts = {}) {
  const sn = SN();
  const pr = (touchy ? 1.35 : 1) * (sn.on ? sn.strength : 0.0001);
  let best = null;
  // what surface is under the finger: corners hidden behind it (the far side of a board) don't snap
  const under = sn.on ? pickMesh(cx, cy) : null, rO = ray.ray.origin.clone(), rD = ray.ray.direction.clone();
  const hidden = (P) => { if (!under || ui.xray) return false; const v = T3(P).sub(rO); return v.dot(rD) > under.dist + 0.8; };
  const cands = sn.on ? snapPoints() : [];
  if (sn.on && sn.int !== false) cands.push(...circleCrossings(), ...edgeCrossings(cx, cy, pr));
  for (const q of cands) {
    if ((q.kind === "end" && !sn.end) || (q.kind === "mid" && !sn.mid) || (q.kind === "center" && !sn.center)) continue;
    const s = scr(q.p);
    if (s[2] > 1) continue;
    const d = Math.hypot(s[0] - cx, s[1] - cy);
    if (d >= POINT_R * pr || hidden(q.p)) continue;
    // a corner wins over a middle when they are about as close, but the one right under the finger wins
    const score = d + (q.exact ? -8 : q.kind === "int" ? -1 : q.kind === "end" ? 0 : q.kind === "center" ? 4 : q.kind === "mid" ? 7 : 10);
    if (!best || score < best.score) best = { ...q, d, score };
  }
  let res = null;
  if (best && (!opts.plane || Math.abs(G.toPlane(opts.plane, best.p)[2]) < 0.6)) res = { p: [...best.p], kind: best.kind, sid: best.sid, kid: best.kid, vi: best.vi, loop: best.loop, w: best.w, seg: best.seg };
  // an axis direction from the anchor
  if (opts.anchor && !res?.kind?.match(/end|center|int/) && (sn.on && sn.axis || ui.axis != null)) {
    const axes = ui.axis != null ? [ui.axis] : opts.axes || [0, 1, 2];
    let ab = null;
    for (const i of axes) {
      const c = closestOnLine(opts.anchor, AX[i], cx, cy);
      if (!c) continue;
      if (i === 2 && ui.axis == null && c.p[2] < -0.05 && opts.anchor[2] > -0.05) continue; // never "down through the floor" by accident
      const s = scr(c.p), d = Math.hypot(s[0] - cx, s[1] - cy);
      if ((ui.axis != null || d < AXIS_R * pr) && (!ab || d < ab.d)) ab = { p: c.p, d, axis: i };
    }
    if (ab && opts.plane) { const q = G.toPlane(opts.plane, ab.p); if (Math.abs(q[2]) > 0.05) ab = ui.axis != null ? { ...ab, p: G.toWorld(opts.plane, [q[0], q[1]]) } : null; }
    if (ab) {
      // the axis line meets the line through a remembered point (finishing a rectangle, lining up with a corner)
      if (sn.on && sn.align) for (const R of ui.recent || []) {
        const t = R[ab.axis] - opts.anchor[ab.axis];
        const P = G.add(opts.anchor, G.mul(AX[ab.axis], t)), q = scr(P), q0 = scr(ab.p);
        if (Math.abs(t) > 0.05 && Math.hypot(q[0] - q0[0], q[1] - q0[1]) < 12 * pr && G.dist(R, P) > 0.05) return { p: P, kind: "axis", axis: ab.axis, label: `على المحور ${AXN[ab.axis]} · على استقامة نقطة`, lines: [[R, P, 0xb05bd6]] };
      }
      if (ui.step > 0) { const tt = G.dot(G.sub(ab.p, opts.anchor), AX[ab.axis]); ab.p = G.add(opts.anchor, G.mul(AX[ab.axis], Math.round(tt / ui.step) * ui.step)); }
      return { p: ab.p, kind: "axis", axis: ab.axis, label: `على المحور ${AXN[ab.axis]}`, lines: [[opts.anchor, ab.p, [0xe0413a, 0x2f9e44, 0x2f6fdf][ab.axis]]] };
    }
    // parallel to an edge that is already drawn, or square to the last segment
    if (sn.on && sn.par && !res) {
      const dirs = [];
      const prev = ui.st?.wpts?.length >= 2 ? G.norm(G.sub(ui.st.wpts.at(-1), ui.st.wpts.at(-2))) : null;
      for (const e of snapEdges()) { if (e.guide) continue; const d = G.norm(G.sub(e.b, e.a)); if (AX.some((a) => Math.abs(Math.abs(G.dot(a, d)) - 1) < 1e-3)) continue; if (dirs.length < 80 && !dirs.some((x) => Math.abs(Math.abs(G.dot(x.d, d)) - 1) < 1e-3)) dirs.push({ d, e, kind: "par" }); }
      if (prev && opts.plane) { const n = G.nOf(opts.plane), pd = G.norm(G.cross(n, prev)); if (G.len(pd) > 0.5) dirs.push({ d: pd, kind: "perp" }); }
      let pb = null;
      for (const x of dirs) {
        if (opts.plane && Math.abs(G.dot(x.d, G.nOf(opts.plane))) > 1e-3) continue;
        const c = closestOnLine(opts.anchor, x.d, cx, cy); if (!c) continue;
        const q = scr(c.p), d = Math.hypot(q[0] - cx, q[1] - cy);
        if (d < 10 * pr && (!pb || d < pb.d)) pb = { ...x, p: c.p, d };
      }
      if (pb) return { p: pb.p, kind: "par", label: pb.kind === "perp" ? "عمودي على اللي قبله" : "موازي للحرف", lines: [[opts.anchor, pb.p, 0xd63aa0], ...(pb.e ? [[pb.e.a, pb.e.b, 0xd63aa0]] : [])] };
    }
  }
  if (res) return { ...res, label: KLABEL[res.kind] };
  // edges
  let eb = null;
  for (const e of sn.on && sn.edge ? snapEdges() : []) {
    const a = scr(e.a), b = scr(e.b);
    if (a[2] > 1 && b[2] > 1) continue;
    const sd = segDist2([cx, cy], a, b);
    if (sd.d < EDGE_R * pr && (!eb || sd.d < eb.d)) eb = { ...e, d: sd.d };
  }
  if (eb) {
    const c = closestOnLine(eb.a, G.norm(G.sub(eb.b, eb.a)), cx, cy);
    if (c) {
      const L = G.dist(eb.a, eb.b), t = Math.max(0, Math.min(L, G.dot(G.sub(c.p, eb.a), G.norm(G.sub(eb.b, eb.a)))));
      const p = G.add(eb.a, G.mul(G.norm(G.sub(eb.b, eb.a)), t));
      if (!opts.plane || Math.abs(G.toPlane(opts.plane, p)[2]) < 0.6) return { p, kind: "edge", label: eb.guide ? "على الخط المساعد" : KLABEL.edge, sid: eb.sid, kid: eb.kid };
    }
  }
  if (opts.plane) {
    const { o, d } = rayAt(cx, cy), t = G.rayPlane(o, d, opts.plane) ?? G.rayPlane(o, d, { ...opts.plane, u: opts.plane.v, v: opts.plane.u });
    if (t != null) return freePoint(stepIn(G.add(o, G.mul(d, t)), opts.plane), opts.plane, opts.anchor, cx, cy, pr);
  }
  if (!opts.noFace && sn.on && sn.face) {
    const m = pickMesh(cx, cy);
    if (m && m.face && m.sid) return { p: m.p, kind: "face", label: KLABEL.face, sid: m.sid, face: m.face, faceRef: m };
    // on a wall: drawing goes onto the wall's face (standing up), not onto the floor behind it
    if (m?.wallN && DRAWTOOLS_WALL.includes(ui.tool)) return { p: m.p, kind: "face", label: "على وش الحيطة", wallN: m.wallN };
  }
  const pl = basePlane(opts.anchor);
  const { o, d } = rayAt(cx, cy);
  let t = G.rayPlane(o, d, pl);
  if (t == null) { const alt = { o: pl.o, u: pl.u, v: pl.v }; t = G.rayPlane(o, d, { ...alt, v: G.mul(alt.v, -1) }); }
  if (t == null) t = 300;
  return freePoint(stepIn(G.add(o, G.mul(d, t)), pl), pl, opts.anchor, cx, cy, pr);
}
/** a point on the drawing plane: lined up with a remembered point, or at a round angle from the anchor */
function freePoint(P, pl, anchor, cx, cy, pr) {
  const sn = SN();
  if (!sn.on) return { p: P, kind: "plane", label: "" };
  if (sn.align) {
    const axes = inPlaneAxes(pl);
    let best = null;
    for (const R of ui.recent || []) for (const i of axes) {
      if (anchor && G.dist(R, anchor) < 0.05) continue; // lining up with the start point itself = a flat (zero) rectangle
      const q = [...P]; q[i] = R[i];
      const a = scr(q), d = Math.hypot(a[0] - cx, a[1] - cy);
      if (d < 9 * pr && (!best || d < best.d)) best = { q, R, d };
    }
    if (best) return { p: best.q, kind: "align", label: "على استقامة نقطة", lines: [[best.R, best.q, 0xb05bd6]] };
  }
  if (sn.angle && anchor) {
    const q = G.toPlane(pl, P), a0 = G.toPlane(pl, anchor), dx = q[0] - a0[0], dy = q[1] - a0[1], L = Math.hypot(dx, dy);
    if (L > 1) {
      const ang = Math.atan2(dy, dx), st = Math.PI / 12, sa = Math.round(ang / st) * st;
      if (Math.abs(ang - sa) < 0.035 * Math.max(1, pr)) {
        const R = G.toWorld(pl, [a0[0] + Math.cos(sa) * L, a0[1] + Math.sin(sa) * L], q[2]);
        return { p: R, kind: "angle", label: `زاوية ${Math.round((Math.abs(sa) * 180) / Math.PI)}°`, lines: [[anchor, R, 0x8a6d1f]] };
      }
    }
  }
  return { p: P, kind: "plane", label: "" };
}
function basePlane(anchor) {
  const at = anchor || [0, 0, 0];
  if (ui.face2d) return ui.face2d.plane;
  if (ui.plane === "front") return { ...G.FRONT, o: [0, at[1], 0] };
  if (ui.plane === "side") return { ...G.SIDE, o: [at[0], 0, 0] };
  return { ...G.GROUND, o: [0, 0, anchor ? at[2] : 0] };
}
/** the plane a new drawing starts on, from the first point's inference */
const DRAWTOOLS_WALL = ["line", "rect", "rect3", "circle", "arc", "arc3", "polygon", "ngon", "text", "gpoint"];
function drawPlaneFor(inf) {
  if (ui.face2d) return ui.face2d.plane;
  if (ui.plane === "ground") return { ...G.GROUND, o: [0, 0, inf.p[2]] };
  if (ui.plane === "front") return { ...G.FRONT, o: [0, inf.p[1], 0] };
  if (ui.plane === "side") return { ...G.SIDE, o: [inf.p[0], 0, 0] };
  if (inf.kind === "face" && inf.face) { const s = M.solids.find((x) => x.id === inf.sid); if (s) return G.facePlane(s, inf.face); }
  if (inf.wallN) { const v = [0, 0, 1]; return { o: [...inf.p], u: G.norm(G.cross(v, inf.wallN)), v }; }
  // a point on a solid: the face of that solid it is on, if any lies under the pointer
  const m = lastXY && pickMesh(lastXY[0], lastXY[1]);
  if (m?.face && m.sid && (inf.kind === "end" || inf.kind === "mid" || inf.kind === "edge")) {
    const s = M.solids.find((x) => x.id === m.sid), fp = s && G.facePlane(s, m.face);
    if (fp && Math.abs(G.toPlane(fp, inf.p)[2]) < 0.3) return fp;
  }
  return { ...G.GROUND, o: [0, 0, inf.p[2]] };
}
const inPlaneAxes = (pl) => [0, 1, 2].filter((i) => Math.abs(G.dot(AX[i], G.nOf(pl))) < 0.01);

// ================================================================== overlay (preview, markers)
let markerEl = null;
function overlay(fn) {
  clear(overG); live = [];
  if (fn) fn();
  need();
  renderConfirm();
}
/** while a line / wall is being drawn: big buttons to finish it, close it, take back a point or cancel */
function renderConfirm() {
  const box = el?.querySelector("#dsConfirm"); if (!box) return;
  const st = ui.st, n = st?.wpts?.length || 0, on = (ui.tool === "line" || ui.tool === "wall") && n >= 1;
  const key = on ? `${ui.tool}|${n}` : "";
  if (box.dataset.k === key) return;
  box.dataset.k = key; box.hidden = !on;
  if (!on) { box.innerHTML = ""; return; }
  box.innerHTML = `${n >= 2 ? `<button class="dsb primary" data-ds="cfdone">✓ تمام</button>` : `<span class="dscf-hint">دوس النقطة اللي بعدها</span>`}${n >= 3 ? `<button class="dsb" data-ds="cfclose">⬠ اقفل الشكل</button>` : ""}${n >= 2 ? `<button class="dsb" data-ds="cfback">↶ آخر نقطة</button>` : ""}<button class="dsb" data-ds="esc">✕ إلغاء</button>`;
}
function confirmAct(k) {
  const st = ui.st; if (!st?.wpts) return;
  const fin = ui.tool === "wall" ? finishWall : finishLine;
  if (k === "done") fin(false);
  else if (k === "close") { if (ui.tool === "wall") { st.wpts.push(st.from ? st.close : st.first); finishWall(true); } else finishLine(true); }
  else if (k === "back") { st.wpts.pop(); st.last = st.wpts.at(-1); if (!st.wpts.length) ui.st = null; ui.tool === "wall" ? overlayWall() : overlayLine(); }
}
function oLine(pts, color = 0x1d211c, dashed = false, w = 1) {
  if (!dashed) { const l = fatLine(pts, color === 0x1d211c ? 0xd94b16 : color, 3.5, false, { depthTest: false, order: 11 }); overG.add(l); return l; }
  const g = new THREE.BufferGeometry().setFromPoints(pts.map(T3));
  const m = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 2.5, gapSize: 1.6, depthTest: false }) : new THREE.LineBasicMaterial({ color, depthTest: false, linewidth: w });
  const l = new THREE.Line(g, m); if (dashed) l.computeLineDistances(); l.renderOrder = 10; overG.add(l); return l;
}
function oFill(pl, loop, color = 0x2f6fdf, op = 0.25) {
  if (!loop || loop.length < 3) return;
  const { geo } = triFaces([{ n: G.nOf(pl), outer: G.ccw(loop).map((p) => G.toWorld(pl, p, 0.05)), holes: [] }]);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, depthTest: false }));
  m.renderOrder = 9; overG.add(m);
}
function oGhost(faces, color = 0x2f6fdf) {
  if (!faces?.length) return;
  const { geo } = triFaces(faces);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
  overG.add(m);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color }));
  overG.add(e);
}
function oMarker(inf) {
  if (!inf) return;
  for (const [a, b, c] of inf.lines || []) if (G.dist(a, b) > 0.05) oLine([a, b], c, true);
  const col = inf.kind === "int" ? 0xe8590c : inf.kind === "end" ? 0x2f9e44 : inf.kind === "mid" ? 0x22a6b3 : inf.kind === "center" ? 0x9b59b6 : inf.kind === "edge" ? 0xe0413a : inf.kind === "face" ? 0x2f6fdf : inf.kind === "axis" ? [0xe0413a, 0x2f9e44, 0x2f6fdf][inf.axis] : inf.kind === "par" ? 0xd63aa0 : inf.kind === "align" ? 0xb05bd6 : inf.kind === "angle" ? 0x8a6d1f : 0x555555;
  const s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: col, depthTest: false }));
  const dpx = camDistAt(inf.p) * (touchy ? 0.012 : 0.008);
  s.scale.setScalar(dpx); s.position.copy(T3(inf.p)); s.renderOrder = 12; overG.add(s);
  if (inf.label) live.push({ p: inf.p, t: inf.label, cls: "tip" });
}
function camDistAt(P) { if (ui.ortho) return (camO.top - camO.bottom) / camO.zoom; return cam.position.distanceTo(T3(P)) * 0.9; }
function liveLen(a, b) { if (G.dist(a, b) > 0.05) live.push({ p: G.lerp(a, b, 0.5), t: f1(G.dist(a, b)), cls: "len" }); }

// ================================================================== pointer events
const downs = new Map();
let press = null, touchy = false, eraseDrag = false;
function infoXY(e) { lastXY = [e.clientX, e.clientY]; return [e.clientX, e.clientY]; }
function onDown(e) {
  if (e.target.closest?.(".dsh, .dsloupe, .dsconfirm, .dshelp, .dssec, .dssnap")) return; // the selection handles have their own drag
  touchy = e.pointerType === "touch";
  downs.set(e.pointerId, [e.clientX, e.clientY]);
  if (downs.size > 1) { press = null; return; } // two fingers: the camera
  if (e.button === 1 || e.button === 2) return;
  if (ui.tool === "orbit" || ui.tool === "pan") return;
  const xy = infoXY(e);
  // select tool on empty space → the orbit takes this drag
  if (ui.tool === "select") {
    const hit = pickAny(...xy);
    if (!hit && ui.boxSel) { if (ctl) { ctl.touches.ONE = -1; ctl.mouseButtons.LEFT = -1; } press = { xy, box: true }; return; }
    if (!hit && ctl) { ctl.touches.ONE = THREE.TOUCH.ROTATE; ctl.mouseButtons.LEFT = THREE.MOUSE.ROTATE; press = { xy, orbit: true }; return; }
    if (ctl) { ctl.touches.ONE = -1; ctl.mouseButtons.LEFT = -1; }
  }
  press = { xy, moved: false, consumed: false };
  if (ui.tool === "eraser") {
    press.consumed = true;
    if (e.pointerType === "touch") { press.eraseAt = xy; return; } // wait: a second finger means a pinch, not an erase
    eraseDrag = true; eraseAt(...xy); return;
  }
  const t = TOOL[ui.tool];
  if (t?.wantsDown && t.wantsDown()) {
    if (e.pointerType === "touch") press.pending = xy; // a second finger may still come (then it was a pinch)
    else { t.click(xy); press.consumed = true; }
  }
}
function onMove(e) {
  if (downs.has(e.pointerId)) downs.set(e.pointerId, [e.clientX, e.clientY]);
  if (downs.size > 1) return;
  const xy = infoXY(e);
  if (press && !press.orbit && Math.hypot(xy[0] - press.xy[0], xy[1] - press.xy[1]) > 8) press.moved = true;
  if (press?.orbit) return;
  if (press?.box) { boxDraw(press.xy, xy); return; }
  if (touchy && press && !["select", "orbit", "pan", "eraser", "paint"].includes(ui.tool)) { loupe = xy; need(); } else loupe = null;
  if (press?.pending && press.moved) { const t0 = TOOL[ui.tool]; t0?.click(press.pending); press.pending = null; press.consumed = true; }
  if (ui.tool === "eraser") {
    if (press?.eraseAt && press.moved && !eraseDrag) { eraseDrag = true; eraseAt(...press.eraseAt); press.eraseAt = null; }
    if (eraseDrag && press) eraseAt(...xy); else hoverErase(...xy); return;
  }
  if (e.pointerType === "touch" && !press) return;
  TOOL[ui.tool]?.hover?.(xy);
}
function onUp(e) {
  downs.delete(e.pointerId);
  const p = press; press = null; eraseDrag = false; if (loupe) { loupe = null; need(); }
  if (p?.eraseAt && downs.size === 0) { eraseAt(...p.eraseAt); return; }
  if (p?.box) { boxFinish(p.xy, [e.clientX, e.clientY]); return; }
  if (ui.tool === "select" && ctl) { ctl.touches.ONE = -1; ctl.mouseButtons.LEFT = -1; }
  if (!p || p.orbit) { if (p?.orbit && ui.tool === "select" && Math.hypot(e.clientX - p.xy[0], e.clientY - p.xy[1]) < 6) { ui.sel.clear(); ui.editGroup = null; rebuild(); renderUI(); } return; }
  const xy = infoXY(e);
  const t = TOOL[ui.tool];
  if (!t) return;
  if (p.pending) { t.click(p.pending); return; }
  if (p.moved || !p.consumed) { if (e.pointerType === "touch") t.hover?.(xy); t.click(xy, { drag: p.moved }); }
}

// ================================================================== tools
const TOOL = {};
const setMsg = (m) => { ui.msg = m || ""; const x = el?.querySelector("#dsMsg"); if (x) { x.textContent = ui.msg; x.classList.toggle("on", !!ui.msg); clearTimeout(setMsg.t); if (m) setMsg.t = setTimeout(() => x.classList.remove("on"), 4200); } };
const vcbSet = (v, label) => { const i = el.querySelector("#dsVcb"); if (document.activeElement !== i) i.value = v == null ? "" : typeof v === "number" ? f1(v) : v; if (label) el.querySelector("#dsVcbL").textContent = label; };

// ---- select
TOOL.select = {
  click(xy) {
    const hit = pickAny(...xy);
    let ref = hit?.ref || null;
    const rawRef = ref; // the board itself (before a group takes its place)
    // a cabinet: tapping a piece opens that piece's own settings; tapping a cavity pane opens that cavity
    if (ref?.startsWith("C:")) { const [cid, key] = ref.slice(2).split("|"); ui.cab = cid; ui.cabFocus = { kind: "cav", key }; ui.sel = new Set(["G:" + cid]); ui.face = null; rebuild(); renderUI(); setMsg("الفراغ ده — إعداداته في اللوحة"); return; }
    if (ref?.startsWith("s:") && !ui.addSel) { const s = M.solids.find((x) => "s:" + x.id === ref); if (s?.cab) { ui.cab = s.cab; ui.cabFocus = { kind: "piece", sid: s.id }; } else if (ui.cabFocus) ui.cabFocus = null; }
    if (ref?.startsWith("s:") && !ui.editGroup) { const s = M.solids.find((x) => "s:" + x.id === ref); if (s?.group) ref = "G:" + s.group; }
    if (ref?.startsWith("s:") && ui.editGroup) { const s = M.solids.find((x) => "s:" + x.id === ref); if (s?.group !== ui.editGroup) { ui.editGroup = null; if (s?.group) ref = "G:" + s.group; } }
    ui.rsel = null;
    if (ref && /^[WOE]:/.test(ref)) { ui.sel.clear(); ui.face = null; ui.rsel = { ref, kind: ref[0], id: ref.slice(2) }; rebuild(); renderUI(); return; }
    const prevFace = ui.face; ui.face = null; ui.edge = null; ui.vertex = null;
    // v62: pick modes — one tap picks a face / edge / corner straight away
    if (ui.pickMode === "vertex") { const v = pickVertex(...xy); if (v) { ui.vertex = v; ui.sel.clear(); ui.sel.add("s:" + v.sid); rebuild(); renderUI(); setMsg("اتختار الركن — حرّكه بأداة التحريك، أو امسحه بالممحاة"); return; } }
    if (ui.pickMode === "edge") { const e = pickEdge(...xy); if (e) { ui.edge = e; ui.sel.clear(); ui.sel.add("s:" + e.sid); rebuild(); renderUI(); setMsg("اتختار الحرف — حرّكه بأداة التحريك، أو اكتب طوله في اللوحة"); return; } }
    if (ui.pickMode === "face" && rawRef?.startsWith("s:") && hit.face) { ui.face = { sid: hit.sid, kind: hit.face.kind, ref: hit.face.ref }; ui.sel.clear(); ui.sel.add(rawRef); rebuild(); renderUI(); setMsg("اتختار الوش — من اللوحة: إزاحة، سحب/زق، أو ارسم عليه"); return; }
    if (ref?.startsWith("s:") && hit.face && ui.sel.size === 1 && ui.sel.has(ref) && !ui.addSel) {
      // a second tap on the selected board: that one face
      const same = prevFace && prevFace.sid === hit.sid && prevFace.kind === hit.face.kind && JSON.stringify(prevFace.ref) === JSON.stringify(hit.face.ref);
      if (!same) { ui.face = { sid: hit.sid, kind: hit.face.kind, ref: hit.face.ref }; rebuild(); renderUI(); setMsg("اتختار الوش ده لوحده — من الجنب: إزاحة، سحب/زق، أو ارسم عليه"); return; }
    }
    if (!ref) { if (!ui.addSel) ui.sel.clear(); }
    else if (ui.addSel) { ui.sel.has(ref) ? ui.sel.delete(ref) : ui.sel.add(ref); }
    else if (ui.sel.size === 1 && ui.sel.has(ref) && ref.startsWith("G:")) { ui.editGroup = ref.slice(2); ui.sel.clear(); ui.sel.add(hit.ref); setMsg("جوه المجموعة — دوس برّه عشان تخرج"); }
    else { ui.sel.clear(); ui.sel.add(ref); }
    rebuild(); renderUI();
  },
};
// ---- polyline
// lines are free in 3D (the blue axis takes you up); a flat run of them becomes a drawing on its plane
TOOL.line = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.last } : {});
    if (!st) { const pl = drawPlaneFor(inf); ui.st = { plane: pl, wpts: [inf.p], last: inf.p, first: inf.p }; overlayLine(); return; }
    if (st.wpts.length >= 3 && G.dist(inf.p, st.first) < 0.05) { finishLine(true); return; }
    if (G.dist(inf.p, st.last) < 0.05) { if (st.wpts.length >= 2) finishLine(false); return; }
    st.wpts.push(inf.p); st.last = inf.p;
    // the line ends on another open drawing: join and stop
    if (st.wpts.length >= 2 && inf.kind === "end" && (inf.kid || inf.pid)) { finishLine(false); return; }
    overlayLine();
  },
  hover(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.last } : {});
    if (st) st.hover = inf.p;
    overlayLine(inf);
  },
  vcb(v) {
    const st = ui.st;
    if (!st || v.v == null) return;
    const d = typedDir(st.hover, st.last, st.wpts);
    const P = G.add(st.last, G.mul(d, v.v));
    st.wpts.push(P); st.last = P; st.hover = null; overlayLine();
  },
  enter() { if (ui.st?.wpts.length >= 2) finishLine(false); },
};
function overlayLine(inf) {
  const st = ui.st;
  overlay(() => {
    if (inf) oMarker(inf);
    if (!st) return;
    const W = st.wpts;
    if (W.length > 1) oLine(W, 0x1d211c);
    if (st.hover) { oLine([st.last, st.hover], inf?.kind === "axis" ? [0xe0413a, 0x2f9e44, 0x2f6fdf][inf.axis] : 0x1d211c, false); liveLen(st.last, st.hover); vcbSet(G.dist(st.last, st.hover), "الطول"); }
  });
}
function finishLine(closed) {
  const st = ui.st;
  ui.st = null;
  if (!st || st.wpts.length < 2) { overlay(); return; }
  const W = st.wpts;
  // which plane holds every point: the one it started on, or the one through its first three corners
  let pl = W.every((P) => Math.abs(G.toPlane(st.plane, P)[2]) < 0.05) ? st.plane : null;
  if (!pl) {
    for (let i = 2; i < W.length && !pl; i++) {
      const n = G.cross(G.sub(W[1], W[0]), G.sub(W[i], W[0]));
      if (G.len(n) > 1e-3) { const c = G.planeFromNormal(W[0], n); if (W.every((P) => Math.abs(G.toPlane(c, P)[2]) < 0.05)) pl = c; }
    }
    if (!pl && W.length === 2) pl = null;
  }
  edit(() => {
    if (pl) addSketch({ plane: pl, pts: W.map((P) => G.toPlane(pl, P).slice(0, 2)), closed: closed && W.length >= 3 });
    else { const pa = { id: uid(), pts: W.map((P) => P.map(G.r2)), closed }; M.paths.push(pa); ui.sel = new Set(["p:" + pa.id]); }
  });
  overlay();
}
/** the direction a typed length goes: towards the finger / pointer if it has moved, else the locked axis,
 *  else straight on from the last segment, else along the red axis (on a touch screen there is no hover) */
function typedDir(hover, last, pts, flat = false) {
  if (hover && G.dist(hover, last) > 0.05) { const d = G.norm(G.sub(hover, last)); if (flat) d[2] = 0; if (G.len(d) > 1e-6) return G.norm(d); }
  if (ui.axis != null && !(flat && ui.axis === 2)) return AX[ui.axis];
  if (pts?.length >= 2) { const d = G.sub(pts.at(-1), pts.at(-2)); if (flat) d[2] = 0; if (G.len(d) > 1e-6) return G.norm(d); }
  setMsg("الطول راح على المحور الأحمر — عشان اتجاه تاني اقفل محور (X / Y / Z تحت) أو اسحب صباعك ناحية الاتجاه");
  return [1, 0, 0];
}
/** add a drawing; open ones whose ends meet join up, and a chain that closes becomes a closed shape */
function addSketch(k) {
  k.id = uid();
  k.pts = k.pts.map((p) => [G.r2(p[0]), G.r2(p[1])]);
  if (!k.closed) {
    for (let guard = 0; guard < 8; guard++) {
      const other = M.sketches.find((o) => !o.closed && o !== k && G.samePlane(o.plane, k.plane) && [o.pts[0], o.pts.at(-1)].some((e) => [k.pts[0], k.pts.at(-1)].some((f) => near2(e, f, o.plane, k.plane))));
      if (!other) break;
      const op = other.pts.map((p) => G.toPlane(k.plane, G.toWorld(other.plane, p)).slice(0, 2));
      const ka = k.pts[0], kb = k.pts.at(-1), oa = op[0], ob = op.at(-1);
      const eq = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05;
      let pts;
      if (eq(kb, oa)) pts = [...k.pts, ...op.slice(1)];
      else if (eq(kb, ob)) pts = [...k.pts, ...op.slice(0, -1).reverse()];
      else if (eq(ka, ob)) pts = [...op, ...k.pts.slice(1)];
      else pts = [...[...op].reverse(), ...k.pts.slice(1)];
      M.sketches = M.sketches.filter((x) => x !== other);
      k.pts = pts; k.smooth = false;
    }
    if (k.pts.length >= 4 && Math.hypot(k.pts[0][0] - k.pts.at(-1)[0], k.pts[0][1] - k.pts.at(-1)[1]) < 0.05) { k.pts.pop(); k.closed = true; }
  }
  if (k.closed) k.pts = G.ccw(G.clean(k.pts));
  // a closed drawing inside another one on the same plane: it becomes its hole (like SketchUp's face in a face)
  M.sketches.push(k);
  ui.sel.clear(); ui.sel.add("k:" + k.id);
  return k;
}
function near2(a, b, pa, pb) { return G.dist(G.toWorld(pa, a), G.toWorld(pb, b)) < 0.05; }
// ---- rectangle / circle / polygon (two clicks on a plane)
function twoClick(make, label) {
  return {
    wantsDown: () => !ui.st,
    click(xy) {
      const st = ui.st;
      const inf = infer(...xy, st ? { anchor: st.a, plane: st.plane, axes: ui.tool === "rect" ? [] : inPlaneAxes(st.plane) } : {});
      if (!st) {
        const pl = drawPlaneFor(inf); ui.st = { plane: pl, a: inf.p, a2: G.toPlane(pl, inf.p).slice(0, 2) };
        overlay(() => oMarker({ ...inf, kind: inf.kind === "free" || !inf.kind ? "end" : inf.kind, label: "الركن الأول" })); // v117: show where the first corner landed
        if (ui.tool === "rect") { setMsg(`الركن الأول اتحدد (${planeName(pl)}) — دوس الركن التاني، أو اكتب العرض والطول في الجنب ودوس «ارسم»`); renderUI(); }
        return;
      }
      const b2 = G.toPlane(st.plane, inf.p).slice(0, 2);
      if (Math.hypot(b2[0] - st.a2[0], b2[1] - st.a2[1]) < 0.2) return;
      const sh = make(st.a2, b2);
      if (!sh) { setMsg("الشكل طالع خط (عرضه أو طوله صفر) — دوس الركن التاني بعيد شوية، أو اكتب «العرض,الطول»"); return; } // keep the first corner
      commitShape(sh, st.plane);
    },
    hover(xy) {
      const st = ui.st;
      const inf = infer(...xy, st ? { anchor: st.a, plane: st.plane, axes: ui.tool === "rect" ? [] : inPlaneAxes(st.plane) } : {});
      overlay(() => {
        oMarker(inf);
        if (!st) return;
        const b2 = G.toPlane(st.plane, inf.p).slice(0, 2), sh = make(st.a2, b2);
        st.hb = b2;
        if (!sh) return;
        oLine([...sh.pts, sh.pts[0]].map((p) => G.toWorld(st.plane, p)), 0x2f6fdf);
        oFill(st.plane, sh.pts);
        label(st, b2);
      });
    },
    vcb(v) {
      const st = ui.st;
      if (v.sides) { if (ui.tool === "circle") ui.segs = Math.max(6, Math.min(128, v.sides)); else ui.sides = Math.max(3, Math.min(64, v.sides)); setMsg(`عدد الأضلاع: ${v.sides}`); return; }
      if (!st) return;
      if (ui.tool === "rect") {
        const [w, h] = v.list || [v.v, v.v];
        if (!(w > 0) || !(h > 0)) return;
        let sy0 = ui.rdir[1];
        if (!ui.rdirSet) { const cp = cam.position, cw = [cp.x, -cp.z, cp.y], cv = G.toPlane(st.plane, cw)[1] - st.a2[1]; if (Math.abs(cv) > 1) sy0 = Math.sign(cv); }
        const sx = st.hb ? Math.sign(st.hb[0] - st.a2[0]) || 1 : ui.rdir[0], sy = st.hb ? Math.sign(st.hb[1] - st.a2[1]) || 1 : sy0;
        commitShape(make(st.a2, [st.a2[0] + sx * w, st.a2[1] + sy * h]), st.plane);
      } else if (v.v > 0) {
        const ang = st.hb ? Math.atan2(st.hb[1] - st.a2[1], st.hb[0] - st.a2[0]) : 0;
        commitShape(make(st.a2, [st.a2[0] + Math.cos(ang) * v.v, st.a2[1] + Math.sin(ang) * v.v]), st.plane);
      }
    },
  };
}
function commitShape(sh, plane) {
  ui.st = null;
  if (!sh) return;
  edit(() => { const k = addSketch({ plane, pts: sh.pts, closed: true }); if (sh.center) k.center = sh.center; if (sh.smooth) k.smooth = true; });
  overlay();
  showIfHidden(sh.pts.map((p) => G.toWorld(plane, p)));
}
/** v117: something was just drawn where the camera can't see it (behind the view, off screen): frame the drawing */
function showIfHidden(W) {
  if (!cam || !W?.length) return;
  cam.updateMatrixWorld(true);
  const out = W.some((P) => { const q = T3(P).project(cam); return q.z > 1 || Math.abs(q.x) > 1.02 || Math.abs(q.y) > 1.02; });
  if (out) { zoomExtents(); setMsg("الشكل اترسم بره الكادر — الكاميرا راحت له"); }
}
/** v117: «✓ خلصت» with flat shapes only (no board has a thickness yet): offer to make them boards first */
function flatSheet() {
  el.querySelector(".dsleave")?.remove();
  const n = M.sketches.filter((k) => k.closed).length;
  const p = document.createElement("div"); p.className = "dsleave";
  p.innerHTML = `<div class="dsleavebox"><b>الرسمة لسه أشكال مسطّحة</b><p>${n} شكل من غير سُمك — عشان يبقوا ألواح تتقص لازم يبقى ليهم سُمك (سحب / زق).</p>
    <div class="dsbtns"><button class="dsb primary" data-ds="flatmake">▤ اعملهم ألواح 1.8 سم وخلّص</button><button class="dsb" data-ds="leaveback">ارجع للرسم</button><button class="dsb" data-ds="flatdone">احفظ زي ما هي</button></div></div>`;
  el.appendChild(p);
}
function flatMake(t = 1.8) {
  const cp = cam.position, cw = [cp.x, -cp.z, cp.y];
  edit(() => {
    for (const k of M.sketches.filter((x) => x.closed && x.pts.length >= 3)) {
      const toward = G.dot(G.nOf(k.plane), G.sub(cw, G.toWorld(k.plane, k.pts[0]))) >= 0 ? 1 : -1; // the board grows towards the viewer (off the wall it was drawn on)
      const s = solidFromLoop(k.plane, k.pts, toward * t, k.holes);
      if (s) { M.solids.push(s); M.sketches = M.sketches.filter((x) => x !== k); }
    }
  });
}
TOOL.rect = twoClick((a, b) => (Math.abs(a[0] - b[0]) < 0.05 || Math.abs(a[1] - b[1]) < 0.05 ? null : { pts: G.rect(a[0], a[1], b[0], b[1]) }), (st, b) => {
  st.hb = b; const w = Math.abs(b[0] - st.a2[0]), h = Math.abs(b[1] - st.a2[1]);
  live.push({ p: G.toWorld(st.plane, [(st.a2[0] + b[0]) / 2, b[1]]), t: f1(w), cls: "len" }, { p: G.toWorld(st.plane, [b[0], (st.a2[1] + b[1]) / 2]), t: f1(h), cls: "len" });
  vcbSet(`${f1(w)},${f1(h)}`, "العرض,الطول");
});
TOOL.circle = twoClick((a, b) => { const r = Math.hypot(b[0] - a[0], b[1] - a[1]); return r < 0.1 ? null : { pts: G.circle(a, r, ui.segs, Math.atan2(b[1] - a[1], b[0] - a[0])), center: a, smooth: true }; }, (st, b) => {
  st.hb = b; const r = Math.hypot(b[0] - st.a2[0], b[1] - st.a2[1]); live.push({ p: G.toWorld(st.plane, b), t: `نق ${f1(r)}`, cls: "len" }); vcbSet(r, `نص القطر (${ui.segs} ضلع)`);
});
TOOL.polygon = twoClick((a, b) => { const r = Math.hypot(b[0] - a[0], b[1] - a[1]); return r < 0.1 ? null : { pts: G.ngon(a, r, ui.sides, Math.atan2(b[1] - a[1], b[0] - a[0])), center: a }; }, (st, b) => {
  st.hb = b; const r = Math.hypot(b[0] - st.a2[0], b[1] - st.a2[1]); live.push({ p: G.toWorld(st.plane, b), t: `نق ${f1(r)}`, cls: "len" }); vcbSet(r, `نص القطر (${ui.sides} أضلاع)`);
});
// ---- arc: start, end, bulge
TOOL.arc = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.a, plane: st.plane, axes: ui.tool === "rect" ? [] : inPlaneAxes(st.plane) } : {});
    if (!st) { const pl = drawPlaneFor(inf); ui.st = { plane: pl, a: inf.p, a2: G.toPlane(pl, inf.p).slice(0, 2) }; return; }
    const q = G.toPlane(st.plane, inf.p).slice(0, 2);
    if (!st.b2) { if (Math.hypot(q[0] - st.a2[0], q[1] - st.a2[1]) < 0.2) return; st.b2 = q; st.b = inf.p; return; }
    commitArc(G.arc3(st.a2, st.b2, q));
  },
  hover(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.b || st.a, plane: st.plane, axes: inPlaneAxes(st.plane) } : {});
    overlay(() => {
      oMarker(inf);
      if (!st) return;
      const q = G.toPlane(st.plane, inf.p).slice(0, 2);
      if (!st.b2) { oLine([st.a, inf.p], 0x2f6fdf, true); liveLen(st.a, inf.p); vcbSet(G.dist(st.a, inf.p), "طول الوتر"); return; }
      st.hq = q;
      const pts = G.arc3(st.a2, st.b2, q);
      oLine(pts.map((p) => G.toWorld(st.plane, p)), 0x2f6fdf);
      const m = [(st.a2[0] + st.b2[0]) / 2, (st.a2[1] + st.b2[1]) / 2], d = [st.b2[0] - st.a2[0], st.b2[1] - st.a2[1]], l = Math.hypot(d[0], d[1]) || 1;
      const h = ((q[0] - m[0]) * -d[1] + (q[1] - m[1]) * d[0]) / l;
      st.h = h; vcbSet(Math.abs(h), "التقويس");
    });
  },
  vcb(v) {
    const st = ui.st;
    if (!st || v.v == null) return;
    if (!st.b2) { const d = G.norm(G.sub(st.hover || G.add(st.a, [1, 0, 0]), st.a)); const B = G.add(st.a, G.mul(d, v.v)); st.b = B; st.b2 = G.toPlane(st.plane, B).slice(0, 2); return; }
    commitArc(G.arc3(st.a2, st.b2, G.bulgePoint(st.a2, st.b2, Math.sign(st.h || 1) * v.v)));
  },
};
function commitArc(pts) { const st = ui.st; ui.st = null; edit(() => { const k = addSketch({ plane: st.plane, pts, closed: false }); k.smooth = true; }); overlay(); }

// ---- push / pull
TOOL.pushpull = {
  wantsDown: () => !ui.st,
  click(xy, o = {}) {
    const st = ui.st;
    if (!st) {
      const k = pickSketch(...xy), m = pickMesh(...xy);
      const sk = k && M.sketches.find((x) => x.id === k.kid);
      if (sk?.closed && (!m || k.dist <= m.dist + 0.3)) { ui.st = { kind: "sketch", k: sk, plane: sk.plane, n: G.nOf(sk.plane), a: k.p }; return; }
      if (m?.sid && m.face) {
        const s = M.solids.find((x) => x.id === m.sid), fp = G.facePlane(s, m.face);
        ui.st = { kind: "face", s, face: m.face, plane: fp, n: G.nOf(fp), a: m.p };
        return;
      }
      setMsg("دوس على شكل مقفول أو على وش لوح");
      return;
    }
    if (o.drag === false && st.d == null) return;
    commitPush(st.d ?? 0);
  },
  hover(xy) {
    const st = ui.st;
    if (!st) { const m = pickMesh(...xy), k = pickSketch(...xy); overlay(() => { if (k) { const sk = M.sketches.find((x) => x.id === k.kid); if (sk?.closed) oFill(sk.plane, sk.pts, 0x2f6fdf, 0.4); } else if (m?.face) oGhost([m.face], 0x2f6fdf); }); return; }
    const c = closestOnLine(st.a, st.n, ...xy);
    if (!c) return;
    let d = c.t;
    // snap the distance to a point under the pointer (push up to another board's face)
    const inf = infer(...xy, { noFace: true });
    if (inf && /end|mid|edge/.test(inf.kind)) d = G.dot(G.sub(inf.p, st.a), st.n);
    st.d = G.r1(d);
    overlay(() => { previewPush(st, st.d); live.push({ p: G.add(st.a, G.mul(st.n, st.d)), t: f1(st.d), cls: "len" }); oLine([st.a, G.add(st.a, G.mul(st.n, st.d))], 0x2f6fdf, true); });
    vcbSet(st.d, "المسافة");
  },
  vcb(v) { if (v.v == null) return; if (!ui.st && ui.lastPush) return; if (ui.st) commitPush(v.v); },
};
function previewPush(st, d) {
  if (st.kind === "sketch") { const s = solidFromLoop(st.k.plane, st.k.pts, d, st.k.holes); if (s) oGhost(G.solidFaces(s)); return; }
  const s2 = G.clone(st.s);
  pushFace(s2, st.face, d, true);
  oGhost(G.solidFaces(s2));
}
function solidFromLoop(plane, loop, d, holes = []) {
  if (Math.abs(d) < 0.05) return null;
  const n = G.nOf(plane);
  const pl = d >= 0 ? G.clone(plane) : { o: G.add(plane.o, G.mul(n, d)), u: [...plane.u], v: [...plane.v] };
  return { id: uid(), name: "لوح", mat: ui.mat, plane: pl, outer: G.ccw(loop), holes: (holes || []).map(G.cw), pockets: [], depth: Math.abs(d) };
}
/** push/pull a face of solid s by d along the face normal; returns false when it cannot */
function pushFace(s, face, d, dry = false) {
  if (face.kind === "top") { const nd = s.depth + d; if (nd < 0.05) return false; s.depth = G.r2(nd); return true; }
  if (face.kind === "bottom") { const nd = s.depth + d; if (nd < 0.05) return false; s.plane.o = G.add(s.plane.o, G.mul(G.nOf(s.plane), -d)); s.depth = G.r2(nd); return true; }
  if (face.kind === "pfloor") { const pk = s.pockets[face.ref.pocket]; const nd = pk.depth - d; if (nd <= 0.05) { s.pockets.splice(face.ref.pocket, 1); return true; } if (nd >= s.depth - 1e-3) { s.pockets.splice(face.ref.pocket, 1); s.holes.push(G.cw(pk.loop)); return true; } pk.depth = G.r2(nd); return true; }
  if (face.kind === "side") {
    const L = face.ref.loop === "o" ? s.outer : s.holes[face.ref.loop];
    const i = face.ref.i, n = L.length, p = L[i], q = L[(i + 1) % n];
    const dx = q[0] - p[0], dy = q[1] - p[1], ll = Math.hypot(dx, dy) || 1, nx = dy / ll, ny = -dx / ll;
    // move the edge; when its neighbours are not square to it, slide the end points along them (keeps the shape)
    const slide = (ai, bi) => { const a = L[ai], b = L[bi], ex = b[0] - a[0], ey = b[1] - a[1], k = ex * nx + ey * ny; return Math.abs(k) > 0.2 * Math.hypot(ex, ey) ? [ex * d / k, ey * d / k] : [nx * d, ny * d]; };
    const mp = slide((i - 1 + n) % n, i), mq = slide((i + 2) % n, (i + 1) % n);
    void dry;
    const a0 = G.area(L);
    L[i] = [G.r2(p[0] + mp[0]), G.r2(p[1] + mp[1])];
    L[(i + 1) % n] = [G.r2(q[0] + mq[0]), G.r2(q[1] + mq[1])];
    // pushed past the opposite edge: the outline turns inside out (signed area flips) — refuse and put the edge back
    const a1 = G.area(L);
    if (Math.abs(a1) < 0.5 || Math.sign(a1) !== Math.sign(a0)) { L[i] = p; L[(i + 1) % n] = q; return false; }
    return true;
  }
  return false;
}
function commitPush(d) {
  const st = ui.st; ui.st = null;
  if (!st || Math.abs(d) < 0.05) { overlay(); return; }
  ui.lastPush = d;
  edit(() => {
    if (st.kind === "face") { if (!pushFace(st.s, st.face, d)) setMsg("مش هينفع بالمسافة دي"); return; }
    const k = st.k;
    // a closed drawing lying on a board's top / bottom face: cut into it (hole / notch / pocket) or build on it
    const host = M.solids.find((s) => ["top", "bottom"].some((fk) => G.samePlane(G.facePlane(s, { kind: fk }), k.plane, 0.05) && G.dot(G.nOf(G.facePlane(s, { kind: fk })), G.nOf(k.plane)) > 0.99));
    const into = host && d < 0;
    if (into) {
      const fk = G.samePlane(G.facePlane(host, { kind: "top" }), k.plane, 0.05) ? "top" : "bottom";
      const loop = G.ccw(k.pts.map((p) => G.toPlane(host.plane, G.toWorld(k.plane, p)).slice(0, 2)));
      const depth = -d;
      if (depth >= host.depth - 1e-3) cutThrough(host, loop);
      else {
        const inside = G.offset(loop, -0.05).every((p) => G.inside(p, host.outer));
        if (inside) host.pockets.push({ loop, depth: G.r2(depth), face: fk });
        else setMsg("الحفر لازم يكون جوه اللوح — لو عايز تقص من الحرف زقه لآخر اللوح");
      }
      M.sketches = M.sketches.filter((x) => x !== k);
      return;
    }
    const s = solidFromLoop(k.plane, k.pts, d, k.holes);
    if (!s) return;
    s.depth = G.r2(s.depth);
    if (host) s.mat = host.mat;
    s.name = `لوح ${M.solids.length + 1}`;
    M.solids.push(s);
    M.sketches = M.sketches.filter((x) => x !== k);
    ui.sel.clear(); ui.sel.add("s:" + s.id);
  });
  overlay();
  const big = M.solids.find((x) => ui.sel.has("s:" + x.id) && !G.isBoard(x));
  if (big) setMsg(`ده بقى مجسّم سمكه ${f1(big.depth)} سم مش لوح (مش هيدخل القص) — لو دي حيطة دوس «🧱 حوّله حيطة» من الجنب أو ارسمها بأداة «حيطة»`);
}
/** cut a loop all the way through a board: a hole when inside, a notch / split when it crosses the edge */
function cutThrough(s, loop) {
  const grown = G.offset(loop, 0.05); // a loop touching the edge is a notch, not a hole
  if (grown.every((p) => G.inside(p, s.outer)) && !s.holes.some((h) => loop.some((p) => G.inside(p, G.ccw(h))))) { s.holes.push(G.cw(loop)); return; }
  const r = G.boolean(s.outer, G.offset(loop, 0.02), "diff");
  // the cutter was grown a hair to cross clean: put its edges back on its own lines
  const xs = loop.map((p) => p[0]), ys = loop.map((p) => p[1]);
  const back = (v, list) => { for (const q of list) if (Math.abs(v - q) < 0.035) return q; return v; };
  r.outers = r.outers.map((o) => G.clean(o.map(([x, y]) => [G.r2(back(x, xs)), G.r2(back(y, ys))])));
  r.holes = r.holes.map((o) => o.map(([x, y]) => [G.r2(back(x, xs)), G.r2(back(y, ys))]));
  if (!r.outers.length) { M.solids = M.solids.filter((x) => x !== s); setMsg("اللوح اتشال كله"); return; }
  const [first, ...rest] = r.outers;
  const keepHoles = (o) => [...s.holes.filter((h) => G.inside(h[0], o)), ...r.holes.filter((h) => G.inside(h[0], o))];
  const allHoles = keepHoles(first);
  for (const o of rest) {
    const c = G.clone(s); c.id = uid(); c.outer = G.ccw(o); c.holes = keepHoles(o); c.pockets = s.pockets.filter((pk) => pk.loop.every((p) => G.inside(p, o))); c.name = s.name + " (ب)";
    M.solids.push(c);
  }
  s.pockets = s.pockets.filter((pk) => pk.loop.every((p) => G.inside(p, first)));
  s.outer = G.ccw(first); s.holes = allHoles;
}
// ---- offset
TOOL.offset = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st;
    if (!st) {
      const k = pickSketch(...xy), m = pickMesh(...xy);
      const sk = k && M.sketches.find((x) => x.id === k.kid);
      if (sk?.closed) { ui.st = { plane: sk.plane, loop: sk.pts, a: k.p, src: "k:" + sk.id }; return; }
      if (m?.sid && m.face) { const s = M.solids.find((x) => x.id === m.sid), fp = G.facePlane(s, m.face); ui.st = { plane: fp, loop: G.ccw(m.face.outer.map((P) => G.toPlane(fp, P).slice(0, 2))), a: m.p }; return; }
      setMsg("دوس على شكل مقفول أو على وش لوح"); return;
    }
    if (st.d == null) return;
    commitOffset(st.d);
  },
  hover(xy) {
    const st = ui.st;
    if (!st) return;
    const inf = infer(...xy, { plane: st.plane });
    const q = G.toPlane(st.plane, inf.p).slice(0, 2), a = G.toPlane(st.plane, st.a).slice(0, 2), c = G.centroid2(st.loop);
    let d = Math.hypot(q[0] - c[0], q[1] - c[1]) - Math.hypot(a[0] - c[0], a[1] - c[1]);
    st.d = G.r1(d);
    overlay(() => { const L = G.offset(st.loop, st.d); oLine([...L, L[0]].map((p) => G.toWorld(st.plane, p)), 0x2f6fdf); live.push({ p: inf.p, t: f1(st.d), cls: "len" }); });
    vcbSet(st.d, "الإزاحة (+ لبره)");
  },
  vcb(v) { if (ui.st && v.v != null) commitOffset(v.v); },
};
function commitOffset(d) { const st = ui.st; ui.st = null; if (!st || Math.abs(d) < 0.05) { overlay(); return; } edit(() => addSketch({ plane: st.plane, pts: G.offset(st.loop, d), closed: true })); overlay(); }
// ---- follow me
TOOL.follow = {
  click(xy) {
    const prof = [...ui.sel].map((r) => r.startsWith("k:") && M.sketches.find((k) => "k:" + k.id === r)).find((k) => k?.closed);
    if (!prof) { const k = pickSketch(...xy), sk = k && M.sketches.find((x) => x.id === k.kid); if (sk?.closed) { ui.sel.clear(); ui.sel.add("k:" + sk.id); rebuild(); setMsg("تمام — دوس دلوقتي على المسار (خط مفتوح أو وش لوح)"); } else setMsg("اختار البروفايل الأول: شكل مقفول مرسوم على أول المسار وعمودي عليه"); return; }
    let path = null, closed = false;
    const k = pickSketch(...xy), sk = k && M.sketches.find((x) => x.id === k.kid && x !== prof), pa = k?.pid && M.paths.find((x) => x.id === k.pid);
    if (pa) { path = pa.pts.map((p) => [...p]); closed = !!pa.closed; }
    else if (sk) { path = sk.pts.map((p) => G.toWorld(sk.plane, p)); closed = !!sk.closed; }
    else { const m = pickMesh(...xy); if (m?.sid && m.face && ["top", "bottom"].includes(m.face.kind)) { const s = M.solids.find((x) => x.id === m.sid); path = s.outer.map((p) => G.toWorld(s.plane, p, m.face.kind === "top" ? s.depth : 0)); closed = true; } }
    if (!path || path.length < 2) { setMsg("دوس على خط مفتوح أو على وش لوح كمسار"); return; }
    // start the path at its point nearest to the profile
    const pc = G.toWorld(prof.plane, G.centroid2(prof.pts));
    if (!closed && G.dist(path.at(-1), pc) < G.dist(path[0], pc)) path.reverse();
    if (closed) { let bi = 0; path.forEach((p, i) => { if (G.dist(p, pc) < G.dist(path[bi], pc)) bi = i; }); path = [...path.slice(bi), ...path.slice(0, bi)]; }
    const t = G.norm(G.sub(path[1], path[0])), up0 = Math.abs(t[2]) > 0.95 ? [0, 1, 0] : [0, 0, 1], side = G.norm(G.cross(t, up0)), up = G.norm(G.cross(side, t));
    let profile;
    if (Math.abs(G.dot(G.nOf(prof.plane), t)) > 0.7) profile = prof.pts.map((p) => { const W = G.sub(G.toWorld(prof.plane, p), path[0]); return [G.r2(G.dot(W, side)), G.r2(G.dot(W, up))]; });
    else {
      // the profile isn't square to the path: take its shape as drawn, set on the path's start
      const q0 = G.toPlane(prof.plane, path[0]).slice(0, 2);
      profile = prof.pts.map(([a, b]) => [G.r2(a - q0[0]), G.r2(b - q0[1])]);
    }
    // a flat path (on the floor or on a board's face): the profile stands ON it, never below it (under the grid)
    const flat = path.every((q) => Math.abs(q[2] - path[0][2]) < 0.05);
    const minY = Math.min(...profile.map((q) => q[1]));
    let lifted = false;
    if (flat && minY < -0.01) { profile = profile.map(([a, b]) => [a, G.r2(b - minY)]); lifted = true; }
    edit(() => {
      M.sweeps.push({ id: uid(), name: `بروفايل ${M.sweeps.length + 1}`, mat: ui.mat, profile, path, closed });
      M.sketches = M.sketches.filter((x) => x !== prof && (!sk || x !== sk || sk.closed));
      if (pa) M.paths = M.paths.filter((x) => x !== pa);
      ui.sel.clear();
    });
    setMsg(lifted ? "اتعمل البروفايل ✓ — اترفع عشان يقف على المسار اللي اخترته (مش تحت الأرض)" : "اتعمل البروفايل ✓");
  },
};
// ---- fillet / chamfer
function cornerTool(kind) {
  return {
    click(xy) {
      const inf = infer(...xy, { noFace: true });
      if (inf.kind !== "end") { setMsg("دوس بالظبط على ركن"); return; }
      const r = kind === "fillet" ? ui.filletR : ui.chamferD;
      edit(() => {
        if (inf.sid) {
          const s = M.solids.find((x) => x.id === inf.sid);
          const L = inf.loop === s.outer ? "outer" : null, hi = s.holes.indexOf(inf.loop);
          const src = L ? s.outer : hi >= 0 ? s.holes[hi] : null;
          if (!src) return;
          const out = kind === "fillet" ? G.fillet(src, inf.vi, r) : G.chamfer(src, inf.vi, r);
          if (!out) { setMsg("الركن ده صغير على المقاس ده"); return; }
          if (L) s.outer = G.ccw(out); else s.holes[hi] = G.cw(out);
        } else if (inf.kid) {
          const k = M.sketches.find((x) => x.id === inf.kid);
          if (!k?.closed) return;
          const out = kind === "fillet" ? G.fillet(k.pts, inf.vi, r) : G.chamfer(k.pts, inf.vi, r);
          if (!out) { setMsg("الركن ده صغير على المقاس ده"); return; }
          k.pts = out;
        }
      });
    },
    hover(xy) { const inf = infer(...xy, { noFace: true }); overlay(() => { if (inf.kind === "end") oMarker(inf); }); vcbSet(kind === "fillet" ? ui.filletR : ui.chamferD, kind === "fillet" ? "نص القطر" : "الشطفة"); },
    vcb(v) { if (v.v > 0) { if (kind === "fillet") ui.filletR = v.v; else ui.chamferD = v.v; setMsg(`${kind === "fillet" ? "نص القطر" : "الشطفة"}: ${f1(v.v)} سم — دوس على الركن`); } },
  };
}
TOOL.fillet = cornerTool("fillet");
TOOL.chamfer = cornerTool("chamfer");

// ---- move / copy (+ array), and reshaping by dragging a corner or an edge
function selRefs() {
  const out = new Set();
  for (const r of ui.sel) {
    if (r.startsWith("G:")) M.solids.filter((s) => s.group === r.slice(2)).forEach((s) => out.add("s:" + s.id));
    else out.add(r);
  }
  return [...out];
}
function ent(ref) {
  const [k, id] = [ref[0], ref.slice(2)];
  const list = { s: M.solids, k: M.sketches, p: M.paths, w: M.sweeps, g: M.guides, d: M.dims, t: M.texts }[k];
  return list?.find((x) => x.id === id) || null;
}
function xform(ref, fn) {
  const e = ent(ref);
  if (!e) return;
  const k = ref[0];
  if (k === "s" || k === "k") { const pl = e.plane; const o2 = fn.p(pl.o); const u2 = G.sub(fn.p(G.add(pl.o, pl.u)), o2), v2 = G.sub(fn.p(G.add(pl.o, pl.v)), o2); e.plane = { o: o2, u: G.norm(u2), v: G.norm(v2) }; if (fn.scale) fn.scale(e, u2, v2); }
  else if (k === "w") { e.path = e.path.map(fn.p); }
  else if (k === "p") { e.pts = e.pts.map(fn.p); }
  else if (k === "g") { e.a = fn.p(e.a); if (e.b) e.b = fn.p(e.b); }
  else if (k === "d") { e.a = fn.p(e.a); e.b = fn.p(e.b); }
  else if (k === "t") e.p = fn.p(e.p);
}
/** copy several entities; boards copied out of a group land in a new group of their own */
function copyRefs(refs) {
  const gmap = new Map();
  const made = refs.map((r) => {
    const c = copyRef(r);
    if (c && c[0] === "s") { const e = ent(c); if (e.group) { if (!gmap.has(e.group)) { const g0 = M.groups.find((g) => g.id === e.group); const ng = { id: uid(), name: (g0?.name || "مجموعة") + " (نسخة)" }; M.groups.push(ng); gmap.set(e.group, ng.id); } e.group = gmap.get(e.group); } }
    return c;
  }).filter(Boolean);
  const copies = made.filter((r) => r[0] === "s").map(ent).filter(Boolean);
  cabCopies(copies, M.cabs || [], (id) => M.solids.filter((s) => s.cab === id).length - copies.filter((s) => s.cab === id).length);
  return made;
}
/** copied cabinet boards must not stay tied to the original (its next rebuild would delete them):
 *  a whole cabinet becomes a new cabinet of its own (its description cloned, new id = its group); single pieces become plain boards */
function cabCopies(copies, cabs, countOf) {
  const by = new Map();
  for (const s of copies) if (s.cab) { if (!by.has(s.cab)) by.set(s.cab, []); by.get(s.cab).push(s); }
  for (const [id, list] of by) {
    const src = cabs.find((c) => c.id === id);
    if (src && list.length >= countOf(id) && list.some((s) => s.cabKey === "sideL" || (s.role === "side" && s.name === "جنب شمال"))) {
      const nc = G.clone(src); nc.id = uid(); nc.name = `${src.name} (نسخة)`;
      const oldG = list[0].group;
      for (const s of list) { s.cab = nc.id; s.group = nc.id; }
      M.groups.push({ id: nc.id, name: nc.name });
      if (oldG && !M.solids.some((s) => s.group === oldG)) M.groups = M.groups.filter((g) => g.id !== oldG);
      (M.cabs ||= []).push(nc);
      const fr = Cab.cabFrame(nc, list.find((s) => s.cabKey === "sideL") || list.find((s) => s.role === "side" && s.name === "جنب شمال"));
      if (fr) Object.assign(nc, fr);
    } else for (const s of list) { delete s.cab; delete s.cabRef; delete s.cabKey; }
  }
}
/** after a turn / mirror: every cabinet reads its new placement from its boards; one tipped off the floor becomes plain boards */
function cabAfterXf() {
  let broke = false;
  for (const c of [...(M.cabs || [])]) {
    const left = M.solids.find((s) => s.cab === c.id && s.cabKey === "sideL") || M.solids.find((s) => s.cab === c.id && s.role === "side" && s.name === "جنب شمال");
    if (!left) continue;
    const fr = Cab.cabFrame(c, left);
    if (fr) { Object.assign(c, fr); continue; }
    for (const s of M.solids) if (s.cab === c.id) { delete s.cab; delete s.cabRef; delete s.cabKey; }
    M.cabs = M.cabs.filter((x) => x !== c); if (ui.cab === c.id) { ui.cab = null; ui.cabFocus = null; }
    broke = true;
  }
  if (broke) setMsg("العلبة اتفكت لقطع عشان اتلفت");
}
function copyRef(ref) {
  const e = ent(ref); if (!e) return null;
  const c = G.clone(e); c.id = uid();
  const list = { s: M.solids, k: M.sketches, p: M.paths, w: M.sweeps, g: M.guides, d: M.dims, t: M.texts }[ref[0]];
  list.push(c);
  return ref[0] + ":" + c.id;
}
TOOL.move = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st;
    if (!st) {
      const inf = infer(...xy, {});
      // v62: a picked corner / edge moves as such (in the board's plane)
      if (ui.vertex && vertexOf(ui.vertex)) { const v = vertexOf(ui.vertex); ui.st = { mode: "vertex", s: v.s, loopIdx: ui.vertex.loopIdx, vi: ui.vertex.vi, a: inf.p }; return; }
      if (ui.edge && edgeOf(ui.edge)) { const e = edgeOf(ui.edge); ui.st = ui.edge.level === "vert" ? { mode: "vertex", s: e.s, loopIdx: ui.edge.loopIdx, vi: ui.edge.i, a: inf.p } : { mode: "edge", s: e.s, loopIdx: ui.edge.loopIdx, i: ui.edge.i, j: ui.edge.j, a: inf.p }; return; }
      // a corner or the middle of an edge of an unselected board: reshape it
      if ((inf.kind === "end" || inf.kind === "mid") && inf.sid && !selected("s:" + inf.sid)) {
        const s = M.solids.find((x) => x.id === inf.sid);
        if (inf.kind === "end" && (inf.loop === s.outer || s.holes.includes(inf.loop))) { ui.st = { mode: "vertex", s, loopIdx: inf.loop === s.outer ? -1 : s.holes.indexOf(inf.loop), vi: inf.vi, a: inf.p }; return; }
      }
      const rh = pickAny(...xy);
      if (rh?.ref && /^[WOE]:/.test(rh.ref)) ui.sel.clear(); // walls, doors, sockets move on their own
      if (rh?.ref?.startsWith("W:") && ui.rsel?.ref !== rh.ref) { ui.rsel = { ref: rh.ref, kind: "W", id: rh.ref.slice(2) }; rebuild(); renderUI(); setMsg("اتختارت الحيطة — اسحبها تاني عشان تحرّكها. عشان تحرّك بريزة أو شباك دوس عليه هو نفسه"); return; }
      if (rh?.ref && /^[WOE]:/.test(rh.ref)) { ui.rsel = { ref: rh.ref, kind: rh.ref[0], id: rh.ref.slice(2) }; ui.st = { mode: "room", ref: rh.ref, a: inf.p, snap: JSON.stringify(M) }; rebuild(); renderUI(); return; }
      if (!ui.sel.size) {
        const hit = pickAny(...xy);
        if (!hit) { setMsg("اختار حاجة أو دوس عليها"); return; }
        let ref = hit.ref;
        const s = ref.startsWith("s:") && M.solids.find((x) => "s:" + x.id === ref);
        if (s?.group) ref = "G:" + s.group;
        ui.sel.add(ref); rebuild();
      }
      ui.st = { mode: "move", a: inf.p, refs: selRefs() };
      setMsg("ماسكها — حرّك صباعك ودوس المكان الجديد، أو اكتب المسافة تحت ↵ (في اتجاه صباعك) أو من «↔ حرّك بمقاس» في الجنب");
      renderUI();
      return;
    }
    const inf = infer(...xy, { anchor: st.a });
    commitMove(G.sub(inf.p, st.a));
  },
  hover(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.a } : {});
    if (st?.mode === "room") {
      M = JSON.parse(st.snap); st.dv = roomMove(st.ref, G.sub(inf.p, st.a)); rebuild();
      overlay(() => { oMarker(inf); oLine([st.a, inf.p], 0x2f6fdf, true); if (st.dv && G.len(st.dv) > 0.05) live.push({ p: inf.p, t: f1(G.len(st.dv)), cls: "len" }); });
      vcbSet(st.dv ? G.len(st.dv) : 0, "المسافة"); return;
    }
    overlay(() => {
      oMarker(inf);
      if (!st) return;
      const dv = G.sub(inf.p, st.a);
      st.dv = dv;
      oLine([st.a, inf.p], inf.kind === "axis" ? [0xe0413a, 0x2f9e44, 0x2f6fdf][inf.axis] : 0x2f6fdf, true);
      liveLen(st.a, inf.p);
      if (st.mode === "vertex") { const s2 = G.clone(st.s); moveVertex(s2, st, dv); oGhost(G.solidFaces(s2)); }
      else if (st.mode === "edge") { const s2 = G.clone(st.s); moveEdge(s2, st, dv); oGhost(G.solidFaces(s2)); }
      else for (const r of st.refs) ghostOf(r, (P) => G.add(P, dv));
    });
    if (st) vcbSet(G.len(G.sub(inf.p, st.a)), ui.copy ? "مسافة النسخ" : "المسافة");
  },
  vcb(v) {
    const st = ui.st;
    if (st && v.v != null) { const dv = st.dv && G.len(st.dv) > 1e-6 ? G.norm(st.dv) : typedDir(null, st.a, null); commitMove(G.mul(dv, v.v)); return; }
    if (st && v.list && v.list.length === 3) { commitMove(v.list); return; }
    // after a copy: "x5" more copies, "/5" divide the distance
    const lm = ui.lastMove;
    if (!st && lm?.copy && (v.times || v.div)) {
      edit(() => {
        for (const r of lm.made) delEnt(r);
        const n = v.times || v.div, step = v.div ? G.mul(lm.dv, 1 / v.div) : lm.dv;
        const made = [];
        for (let i = 1; i <= n; i++) for (const c of copyRefs(lm.refs)) { xform(c, { p: (P) => G.add(P, G.mul(step, i)) }); made.push(c); }
        ui.lastMove = { ...lm, made };
      });
      setMsg(v.times ? `اتعمل ${v.times} نسخ` : `اتقسمت على ${v.div}`);
    }
  },
};
/** slide one outline edge in the board's plane: both its corners move by the in-plane part of dv */
function moveEdge(s, st, dv) {
  const L = st.loopIdx < 0 ? s.outer : s.holes[st.loopIdx];
  for (const k of [st.i, st.j]) { const q = G.toPlane(s.plane, G.add(G.toWorld(s.plane, L[k]), dv)); L[k] = [G.r2(q[0]), G.r2(q[1])]; }
}
function moveVertex(s, st, dv) {
  const L = st.loopIdx < 0 ? s.outer : s.holes[st.loopIdx];
  const q = G.toPlane(s.plane, G.add(G.toWorld(s.plane, L[st.vi]), dv));
  L[st.vi] = [G.r2(q[0]), G.r2(q[1])];
}
function ghostOf(ref, P) {
  const e = ent(ref); if (!e) return;
  if (ref[0] === "s") { oGhost(G.solidFaces(e).map((f) => ({ ...f, outer: f.outer.map(P), holes: f.holes.map((h) => h.map(P)) }))); }
  else if (ref[0] === "k") { const W = e.pts.map((p) => P(G.toWorld(e.plane, p))); oLine(e.closed ? [...W, W[0]] : W, 0x2f6fdf); }
  else if (ref[0] === "w") { oGhost(G.sweepFaces(e.profile, e.path.map(P), e.closed)); }
  else if (ref[0] === "p") { const W = e.pts.map(P); oLine(e.closed ? [...W, W[0]] : W, 0x2f6fdf); }
}
function commitMove(dv) {
  const st = ui.st; ui.st = null;
  if (st?.mode === "room") { M = JSON.parse(st.snap); if (G.len(dv) > 0.01) edit(() => roomMove(st.ref, dv)); else rebuild(); overlay(); return; }
  if (!st || G.len(dv) < 0.01) { overlay(); return; }
  edit(() => {
    if (st.mode === "vertex") { moveVertex(st.s, st, dv); st.s.outer = G.ccw(st.s.outer); return; }
    if (st.mode === "edge") { moveEdge(st.s, st, dv); st.s.outer = G.ccw(st.s.outer); return; }
    let refs = st.refs, made = [];
    if (ui.copy) { refs = copyRefs(st.refs); made = refs; }
    for (const r of refs) xform(r, { p: (P) => G.add(P, dv) });
    ui.lastMove = { dv, copy: ui.copy, refs: st.refs, made };
    if (ui.copy) setMsg("اتنسخت — اكتب «x5» تعمل 5 نسخ بنفس المسافة، أو «/5» تقسم المسافة");
  });
  overlay();
}
// ---- rotate
TOOL.rotate = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.c, plane: st.plane } : {});
    if (!st) {
      if (!ui.sel.size) { const hit = pickAny(...xy) || (inf.sid ? { ref: "s:" + inf.sid } : inf.kid ? { ref: "k:" + inf.kid } : null); if (!hit) { setMsg("اختار اللي عايز تلفه الأول"); return; } let ref = hit.ref; const s = ref.startsWith("s:") && M.solids.find((x) => "s:" + x.id === ref); if (s?.group) ref = "G:" + s.group; ui.sel.add(ref); rebuild(); }
      const k = ui.axis != null ? AX[ui.axis] : inf.kind === "face" && inf.face ? G.norm(inf.face.n) : [0, 0, 1];
      ui.st = { c: inf.p, k, plane: G.planeFromNormal(inf.p, k), refs: selRefs() };
      return;
    }
    const v = G.sub(inf.p, st.c);
    if (!st.r) { if (G.len(v) < 0.2) return; st.r = G.norm(v); return; }
    commitRotate(st.ang ?? 0);
  },
  hover(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.c, plane: st.plane } : {});
    overlay(() => {
      oMarker(inf);
      if (!st) return;
      const v = G.sub(inf.p, st.c);
      // protractor circle
      const R = Math.max(8, G.len(v));
      oLine(G.circle([0, 0], R, 48).map((p) => G.toWorld(st.plane, p)).concat([G.toWorld(st.plane, [R, 0])]), 0x8a8f86, true);
      if (!st.r) { oLine([st.c, inf.p], 0x2f6fdf, true); return; }
      let ang = Math.atan2(G.dot(G.cross(st.r, G.norm(v)), st.k), G.dot(st.r, G.norm(v)));
      const deg = (ang * 180) / Math.PI, snapDeg = Math.round(deg / 15) * 15;
      if (Math.abs(deg - snapDeg) < 3) ang = (snapDeg * Math.PI) / 180;
      st.ang = ang;
      oLine([G.add(st.c, G.mul(st.r, R)), st.c, G.add(st.c, G.mul(G.rotV(st.r, st.k, ang), R))], 0x2f6fdf);
      for (const r of st.refs) ghostOf(r, (P) => G.rotP(P, st.c, st.k, ang));
      live.push({ p: G.add(st.c, G.mul(G.rotV(st.r, st.k, ang / 2), R * 0.6)), t: `${f1((ang * 180) / Math.PI)}°`, cls: "len" });
      vcbSet((ang * 180) / Math.PI, "الزاوية");
    });
  },
  vcb(v) { if (ui.st?.r && v.v != null) commitRotate((v.v * Math.PI) / 180); },
};
function commitRotate(ang) {
  const st = ui.st; ui.st = null;
  if (!st || Math.abs(ang) < 1e-4) { overlay(); return; }
  edit(() => {
    let refs = st.refs;
    if (ui.copy) refs = copyRefs(st.refs);
    for (const r of refs) xform(r, { p: (P) => G.rotP(P, st.c, st.k, ang) });
    cabAfterXf();
  });
  overlay();
}
// ---- scale
TOOL.scale = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.c } : {});
    if (!st) {
      if (!ui.sel.size) { const hit = pickAny(...xy) || (inf.sid ? { ref: "s:" + inf.sid } : inf.kid ? { ref: "k:" + inf.kid } : null); if (!hit) { setMsg("اختار اللي عايز تكبّره الأول"); return; } let ref = hit.ref; const s = ref.startsWith("s:") && M.solids.find((x) => "s:" + x.id === ref); if (s?.group) ref = "G:" + s.group; ui.sel.add(ref); rebuild(); }
      ui.st = { c: inf.p, refs: selRefs() }; return;
    }
    if (!st.r) { if (G.dist(inf.p, st.c) < 0.2) return; st.r = inf.p; return; }
    commitScale(st.k ?? [1, 1, 1]);
  },
  hover(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.c } : {});
    overlay(() => {
      oMarker(inf);
      if (!st?.r) { if (st) oLine([st.c, inf.p], 0x2f6fdf, true); return; }
      const f = G.dist(inf.p, st.c) / Math.max(0.01, G.dist(st.r, st.c));
      const k = ui.axis != null ? [0, 1, 2].map((i) => (i === ui.axis ? f : 1)) : [f, f, f];
      st.k = k;
      for (const r of st.refs) ghostOf(r, (P) => [0, 1, 2].map((i) => st.c[i] + (P[i] - st.c[i]) * k[i]));
      live.push({ p: inf.p, t: `×${(Math.round(f * 100) / 100).toLocaleString("en-US")}`, cls: "len" });
      vcbSet(Math.round(f * 100) / 100, "النسبة");
    });
  },
  vcb(v) {
    if (!ui.st) return;
    if (v.list?.length === 3) { commitScale(v.list); return; }
    if (v.v > 0) commitScale(ui.axis != null ? [0, 1, 2].map((i) => (i === ui.axis ? v.v : 1)) : [v.v, v.v, v.v]);
  },
};
function scaleSolid(s, c, k) {
  // only exact for boards square to the world axes or for uniform scales
  const pl = s.plane, n = G.nOf(pl);
  const fu = Math.hypot(...pl.u.map((x, i) => x * k[i])), fv = Math.hypot(...pl.v.map((x, i) => x * k[i])), fn = Math.hypot(...n.map((x, i) => x * k[i]));
  s.outer = s.outer.map(([a, b]) => [G.r2(a * fu), G.r2(b * fv)]);
  s.holes = s.holes.map((h) => h.map(([a, b]) => [G.r2(a * fu), G.r2(b * fv)]));
  s.pockets = s.pockets.map((pk) => ({ ...pk, loop: pk.loop.map(([a, b]) => [G.r2(a * fu), G.r2(b * fv)]), depth: G.r2(pk.depth * fn) }));
  s.depth = G.r2(s.depth * fn);
  s.plane = { o: [0, 1, 2].map((i) => c[i] + (pl.o[i] - c[i]) * k[i]), u: pl.u, v: pl.v };
}
function commitScale(k) {
  const st = ui.st; ui.st = null;
  if (!st || k.some((x) => !(x > 0))) { overlay(); return; }
  edit(() => {
    for (const r of st.refs) {
      const e = ent(r);
      if (r[0] === "s") scaleSolid(e, st.c, k);
      else if (r[0] === "k") { const pl = e.plane, fu = Math.hypot(...pl.u.map((x, i) => x * k[i])), fv = Math.hypot(...pl.v.map((x, i) => x * k[i])); e.pts = e.pts.map(([a, b]) => [a * fu, b * fv]); if (e.center) e.center = [e.center[0] * fu, e.center[1] * fv]; e.plane = { ...pl, o: [0, 1, 2].map((i) => st.c[i] + (pl.o[i] - st.c[i]) * k[i]) }; }
      else xform(r, { p: (P) => [0, 1, 2].map((i) => st.c[i] + (P[i] - st.c[i]) * k[i]) });
    }
  });
  overlay();
}
// ---- tape measure / protractor / dimension / text
TOOL.tape = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st, inf = infer(...xy, st ? { anchor: st.a } : {});
    if (!st) { ui.st = { a: inf.p }; return; }
    tapeDone(st.a, inf.p);
  },
  hover(xy) {
    const st = ui.st, inf = infer(...xy, st ? { anchor: st.a } : {});
    overlay(() => {
      oMarker(inf);
      if (st) { oLine([st.a, inf.p], 0x2f6fdf, false); liveLen(st.a, inf.p); st.h = inf.p; }
      else if (ui.tapeLast) { oLine([ui.tapeLast.a, ui.tapeLast.b], 0x2f6fdf, false); liveLen(ui.tapeLast.a, ui.tapeLast.b); }
    });
    if (st) vcbSet(G.dist(st.a, inf.p), "المسافة");
  },
  vcb(v) { const st = ui.st; if (!st?.h || v.v == null) return; tapeDone(st.a, G.add(st.a, G.mul(G.norm(G.sub(st.h, st.a)), v.v))); },
};
/** the tape only measures (the result stays on screen until the next measure); a guide is left only when asked */
function tapeDone(a, b) {
  ui.st = null;
  if (G.dist(a, b) < 0.05) { overlay(); return; }
  ui.tapeLast = { a, b };
  if (ui.tapeGuide) edit(() => { M.guides.push({ id: uid(), kind: "seg", a, b }); M.guides.push({ id: uid(), kind: "point", a: b }); });
  const d = G.sub(b, a);
  const parts = [["عرض", d[0]], ["عمق", d[1]], ["ارتفاع", d[2]]].filter(([, v]) => Math.abs(v) > 0.05);
  setMsg(`المسافة ${f1(G.dist(a, b))} سم${parts.length > 1 ? "  ·  " + parts.map(([k, v]) => `${k} ${f1(Math.abs(v))}`).join(" · ") : ""}`);
  overlay(() => { oLine([a, b], 0x2f6fdf, false); liveLen(a, b); });
}
TOOL.protractor = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st, inf = infer(...xy, st ? { anchor: st.c, plane: st.plane } : {});
    if (!st) { const pl = drawPlaneFor(inf); ui.st = { c: inf.p, plane: { ...pl, o: inf.p } }; return; }
    if (!st.r) { st.r = G.norm(G.sub(inf.p, st.c)); return; }
    commitProt(st.ang || 0);
  },
  hover(xy) {
    const st = ui.st, inf = infer(...xy, st ? { anchor: st.c, plane: st.plane } : {});
    overlay(() => {
      oMarker(inf);
      if (!st) return;
      const k = G.nOf(st.plane), v = G.norm(G.sub(inf.p, st.c));
      oLine(G.circle([0, 0], 15, 40).map((p) => G.toWorld(st.plane, p)), 0x8a8f86, true);
      if (!st.r) { oLine([st.c, inf.p], 0x6b6f66, true); return; }
      let ang = Math.atan2(G.dot(G.cross(st.r, v), k), G.dot(st.r, v));
      const sd = Math.round((ang * 180) / Math.PI / 5) * 5; ang = (sd * Math.PI) / 180;
      st.ang = ang; st.k = k;
      oLine([G.add(st.c, G.mul(st.r, 20)), st.c, G.add(st.c, G.mul(G.rotV(st.r, k, ang), 40))], 0x6b6f66, true);
      live.push({ p: inf.p, t: `${sd}°`, cls: "len" }); vcbSet(sd, "الزاوية");
    });
  },
  vcb(v) { if (ui.st?.r && v.v != null) { ui.st.k = G.nOf(ui.st.plane); commitProt((v.v * Math.PI) / 180); } },
};
function commitProt(ang) { const st = ui.st; ui.st = null; const d = G.rotV(st.r, st.k || G.nOf(st.plane), ang); edit(() => M.guides.push({ id: uid(), kind: "line", a: st.c, b: G.add(st.c, G.mul(d, 50)) })); overlay(); }
TOOL.dim = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st, inf = infer(...xy, st ? { anchor: st.b || st.a } : {});
    if (!st) { ui.st = { a: inf.p }; return; }
    if (!st.b) { if (G.dist(inf.p, st.a) < 0.05) return; st.b = inf.p; return; }
    const o = offsetFor(st, inf.p); ui.st = null;
    edit(() => M.dims.push({ id: uid(), a: st.a, b: st.b, o }));
    overlay();
  },
  hover(xy) {
    const st = ui.st, inf = infer(...xy, st ? { anchor: st.b || st.a } : {});
    overlay(() => {
      oMarker(inf);
      if (!st) return;
      if (!st.b) { oLine([st.a, inf.p], 0x3b4038); liveLen(st.a, inf.p); return; }
      const o = offsetFor(st, inf.p), A = G.add(st.a, o), B = G.add(st.b, o);
      oLine([st.a, A, B, st.b], 0x3b4038); live.push({ p: G.lerp(A, B, 0.5), t: f1(G.dist(st.a, st.b)), cls: "dim" });
    });
  },
};
function offsetFor(st, P) { const d = G.norm(G.sub(st.b, st.a)), v = G.sub(P, st.a); return G.sub(v, G.mul(d, G.dot(v, d))); }
// ---- trim: take away the piece of a drawn line / circle between the crossings either side of the tap
TOOL.trim = {
  click(xy) {
    const hit = pickSketchEdge(...xy);
    const k = hit?.kid && M.sketches.find((x) => x.id === hit.kid);
    if (!k) { setMsg("دوس على خط أو دايرة مرسومة (مش لوح) — الجزء اللي تحت صباعك بيتشال لحد التقاطعات"); return; }
    const res = trimSketch(k, hit.p);
    if (!res) { setMsg("مفيش تقاطع على الخط ده — لو عايز تشيله كله استعمل الممحاة"); return; }
    edit(() => { M.sketches = M.sketches.filter((x) => x.id !== k.id); for (const n of res) M.sketches.push(n); ui.sel.clear(); });
    setMsg("اتقص ✓ — ↶ لو عايز ترجّعه");
    overlay();
  },
  hover(xy) {
    const hit = pickSketchEdge(...xy), k = hit?.kid && M.sketches.find((x) => x.id === hit.kid);
    overlay(() => {
      if (!k) return;
      const piece = trimSketch(k, hit.p, true);
      if (piece) oLine(piece.map((q) => G.toWorld(k.plane, q)), 0xe0413a, false);
    });
  },
};
/** the drawn line nearest the finger on screen (its edges, not the filled face inside a closed shape) */
function pickSketchEdge(cx, cy) {
  let best = null;
  for (const k of M.sketches) {
    const W = k.pts.map((p) => G.toWorld(k.plane, p));
    for (let i = 0; i + 1 < W.length + (k.closed ? 1 : 0); i++) {
      const A = W[i], B = W[(i + 1) % W.length], d = segDist2([cx, cy], scr(A), scr(B));
      if (d.d < (touchy ? 22 : 14) && (!best || d.d < best.d)) best = { kid: k.id, d: d.d, p: G.lerp(A, B, d.t) };
    }
  }
  return best;
}
/** cut a sketch at every crossing (other drawings, board edges and guides on its plane, and itself); returns the
 *  remaining pieces as new sketches, or (preview) the piece that would go; null when nothing crosses it */
function trimSketch(k, tapW, preview = false) {
  const P = k.pts.map((q) => [q[0], q[1]]), closed = !!k.closed, n = P.length;
  const segs = []; for (let i = 0; i + 1 < n + (closed ? 1 : 0); i++) segs.push([P[i], P[(i + 1) % n]]);
  const cum = [0]; for (const [a, b] of segs) cum.push(cum.at(-1) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  const total = cum.at(-1); if (total < 1e-6) return null;
  // cutters on the same plane, in this sketch's 2D frame
  const cutters = [];
  const on = (W) => { const q = G.toPlane(k.plane, W); return Math.abs(q[2]) < 0.05 ? [q[0], q[1]] : null; };
  for (const e of snapEdges()) { if (e.kid === k.id) continue; const a = on(e.a), b = on(e.b); if (a && b) cutters.push([a, b]); }
  const X = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], q = [d[0] - c[0], d[1] - c[1]], den = r[0] * q[1] - r[1] * q[0]; if (Math.abs(den) < 1e-12) return null; const w = [c[0] - a[0], c[1] - a[1]], t = (w[0] * q[1] - w[1] * q[0]) / den, u = (w[0] * r[1] - w[1] * r[0]) / den; return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? t : null; };
  const cuts = [];
  segs.forEach(([a, b], i) => {
    const L = cum[i + 1] - cum[i];
    for (const [c, d] of cutters) { const t = X(a, b, c, d); if (t != null) cuts.push(cum[i] + t * L); }
    segs.forEach(([c, d], j) => { if (Math.abs(i - j) <= 1 || (closed && Math.abs(i - j) === segs.length - 1)) return; const t = X(a, b, c, d); if (t != null) cuts.push(cum[i] + t * L); });
  });
  // where the finger is along the line
  const tp2 = G.toPlane(k.plane, tapW); let tp = 0, best = Infinity;
  segs.forEach(([a, b], i) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((tp2[0] - a[0]) * dx + (tp2[1] - a[1]) * dy) / l2)), q = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - tp2[0], q[1] - tp2[1]); if (d < best) { best = d; tp = cum[i] + t * Math.sqrt(l2); } });
  const cs = [...new Set(cuts.map((c) => Math.round(c * 1000) / 1000))].filter((c) => c > 1e-3 && c < total - 1e-3).sort((a, b) => a - b);
  if (closed ? cs.length < 2 : !cs.length) return null;
  let lo, hi;
  if (closed) { hi = cs.find((c) => c > tp); lo = [...cs].reverse().find((c) => c < tp); if (hi == null) hi = cs[0] + total; if (lo == null) lo = cs.at(-1) - total; }
  else { lo = [...cs].reverse().find((c) => c < tp) ?? 0; hi = cs.find((c) => c > tp) ?? total; }
  // the polyline between two distances along it (wrapping round a closed loop)
  const at = (d) => { d = closed ? ((d % total) + total) % total : Math.max(0, Math.min(total, d)); let i = cum.findIndex((c, j) => j < segs.length && d <= cum[j + 1] + 1e-9); if (i < 0) i = segs.length - 1; const [a, b] = segs[i], L = cum[i + 1] - cum[i] || 1, t = (d - cum[i]) / L; return { i, p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }; };
  const sub = (d0, d1) => {
    if (d1 - d0 < 1e-3) return null;
    const A = at(d0), out = [A.p];
    let d = d0, i = A.i;
    for (let guard = 0; guard < segs.length * 2 + 2; guard++) {
      const end = (closed ? Math.floor(d / total) * total : 0) + cum[i + 1];
      if (end >= d1 - 1e-9) break;
      out.push(segs[i][1]); d = end; i = (i + 1) % segs.length;
    }
    out.push(at(d1).p);
    return out.map((q) => [G.r2(q[0]), G.r2(q[1])]);
  };
  if (preview) return sub(lo, hi);
  const keep = closed ? [sub(hi, lo + total)] : [sub(0, lo), sub(hi, total)];
  return keep.filter((q) => q && q.length >= 2).map((pts) => ({ id: uid(), plane: k.plane, pts, closed: false, ...(k.smooth ? { smooth: true } : {}), ...(k.center ? { center: k.center } : {}) }));
}
// ---- a guide point: mark a spot (the crossing of two circles, a centre …) to draw from later
TOOL.gpoint = {
  click(xy) {
    const inf = infer(...xy, {});
    edit(() => M.guides.push({ id: uid(), kind: "point", a: inf.p.map(G.r2) }));
    setMsg(`اتحطت نقطة${inf.kind === "int" ? " على التقاطع" : inf.label ? " — " + inf.label : ""}`);
    overlay();
  },
  hover(xy) { const inf = infer(...xy, {}); overlay(() => oMarker(inf)); },
};
TOOL.text = {
  click(xy) { const inf = infer(...xy, {}); ui.st = { p: inf.p }; const i = el.querySelector("#dsVcb"); i.removeAttribute("data-keypad"); i.inputMode = "text"; i.value = ""; i.placeholder = "اكتب النص واضغط ↵"; el.querySelector("#dsVcbL").textContent = "النص"; i.focus(); /* now, inside the tap: iPadOS opens the keyboard only then */ overlay(() => oMarker(inf)); },
  raw(txt) { const st = ui.st; ui.st = null; const i = el.querySelector("#dsVcb"); i.setAttribute("data-keypad", ""); i.placeholder = "—"; i.inputMode = "decimal"; if (!st || !txt.trim()) return; edit(() => M.texts.push({ id: uid(), p: st.p, s: txt.trim() })); overlay(); },
};
// ---- paint / eraser
TOOL.paint = {
  click(xy) {
    const hit = pickAny(...xy);
    if (!hit?.ref) return;
    edit(() => {
      const s = hit.ref.startsWith("s:") && ent(hit.ref);
      if (s?.group && !ui.editGroup) M.solids.filter((x) => x.group === s.group).forEach((x) => (x.mat = ui.mat));
      else if (s) s.mat = ui.mat;
      else if (hit.ref.startsWith("w:")) ent(hit.ref).mat = ui.mat;
      else if (hit.ref.startsWith("W:")) { const w = M.room?.walls?.find((x) => "W:" + x.id === hit.ref); if (w) Object.assign(w, { finish: "paint", color: ui.wallPaint || "#e9e2d0" }); }
    });
    if (hit.ref.startsWith("W:")) { rebuild(); renderUI(); }
  },
};
function eraseAt(cx, cy) {
  // v62: in «ركن» mode the eraser removes one corner of the outline (the board keeps its other corners)
  if (ui.pickMode === "vertex") {
    const v = pickVertex(cx, cy); const vv = vertexOf(v);
    if (vv && vv.L.length > 3) { edit(() => { vv.L.splice(v.vi, 1); }); ui.vertex = null; setMsg("اتمسح الركن"); }
    else if (vv) setMsg("اللوح لازم يفضل فيه 3 أركان على الأقل");
    return;
  }
  const hit = pickAny(cx, cy);
  if (!hit?.ref) return;
  edit(() => delEnt(hit.ref));
}
function hoverErase(cx, cy) { const hit = pickAny(cx, cy); overlay(() => { if (hit?.ref) ghostOf(hit.ref, (P) => P); }); }
function delEnt(ref) {
  if (ref.startsWith("G:")) { M.solids = M.solids.filter((s) => s.group !== ref.slice(2)); M.groups = M.groups.filter((g) => g.id !== ref.slice(2)); pruneCabs(); return; }
  if (/^[WOE]:/.test(ref)) { delRoomRef(ref); return; }
  const k = ref[0], id = ref.slice(2);
  const key = { s: "solids", k: "sketches", p: "paths", w: "sweeps", g: "guides", d: "dims", t: "texts" }[k];
  if (key) M[key] = M[key].filter((x) => x.id !== id);
  ui.sel.delete(ref);
  if (k === "s") pruneCabs();
}
/** a cabinet with none of its boards left is gone too (no ghost panes, no button, nothing to bring back on the next edit) */
function pruneCabs() {
  if (!M.cabs?.length) return;
  M.cabs = M.cabs.filter((c) => M.solids.some((s) => s.cab === c.id));
  if (ui.cab && !cabOf(ui.cab)) { ui.cab = null; ui.cabFocus = null; }
  if (ui.cabFocus?.sid && !M.solids.some((s) => s.id === ui.cabFocus.sid)) ui.cabFocus = null;
}

// ================================================================== edit / undo
function edit(fn) {
  const snap = JSON.stringify(M);
  fn();
  if (JSON.stringify(M) === snap) return;
  hist.u.push(snap); if (hist.u.length > 120) hist.u.shift();
  hist.r = [];
  for (const r of [...ui.sel]) if (!r.startsWith("G:") && !ent(r)) ui.sel.delete(r);
  if (ui.rsel && !roomEnt(ui.rsel)) ui.rsel = null;
  rebuild(); renderUI();
}
function undo() {
  // a line / wall being drawn: ↶ takes back its last point (and the drawing in progress) — never a finished step
  if (ui.st) { if (ui.st.wpts?.length > 1) confirmAct("back"); else cancelStep(); return; }
  if (!hist.u.length) return; hist.r.push(JSON.stringify(M)); M = JSON.parse(hist.u.pop()); ui.st = null; keepSel(); rebuild(); overlay(); renderUI();
}
/** after undo / redo: keep what is still there selected */
function keepSel() { for (const r of [...ui.sel]) if (!(r.startsWith("G:") ? M.groups.some((g) => "G:" + g.id === r) : ent(r))) ui.sel.delete(r); if (ui.rsel && !roomEnt(ui.rsel)) ui.rsel = null; }
function redo() { if (!hist.r.length) return; hist.u.push(JSON.stringify(M)); M = JSON.parse(hist.r.pop()); ui.st = null; keepSel(); rebuild(); overlay(); renderUI(); }
function vcbNormal() { const i = el?.querySelector("#dsVcb"); if (i && !i.hasAttribute("data-keypad")) { i.setAttribute("data-keypad", ""); i.placeholder = "—"; i.inputMode = "decimal"; } }
function cancelStep() { restoreRoomDrag(); ui.st = null; ui.dimEdit = null; vcbNormal(); overlay(); vcbSet(""); }
function delSel() { if (ui.rsel) { const r = ui.rsel.ref; edit(() => delRoomRef(r)); return; } if (!ui.sel.size) return; edit(() => { for (const r of [...ui.sel]) delEnt(r); ui.sel.clear(); }); }
function setTool(t) {
  if (ui.tool === "text" && ui.st) TOOL.text.raw("");
  if (ui.tool === "line" && ui.st?.wpts?.length >= 2) finishLine(false);
  if (ui.tool === "wall" && ui.st?.wpts?.length >= 2) finishWall(false);
  restoreRoomDrag();
  ui.tool = t; ui.st = null; ui.dimEdit = null; vcbNormal(); ui.tapeLast = null;
  overlay(); applyControls(); vcbSet("", "المقاس"); renderLabelsList();
  if (t === "wall" && !M.room && !M.solids.length && !M.sketches.length) setView("top", 900);
  if (t === "wall" && !M.room) setMsg("دوس أول ركن على الأرض، وبعدين كل ركن — أو اكتب الطول بعد ما تحدد الاتجاه");
  if (t === "follow" && ![...ui.sel].some((r) => r.startsWith("k:"))) setMsg("اختار البروفايل الأول (شكل مقفول)");
  renderUI();
}
function lockAxis(i) { ui.axis = ui.axis === i ? null : i; renderUI(); }
function vcbEnter() {
  const i = el.querySelector("#dsVcb"), txt = i.value;
  if (ui.tool === "text") { TOOL.text.raw(txt); i.value = ""; return; }
  const v = G.parseVcb(txt);
  i.value = ""; i.blur();
  const t = TOOL[ui.tool];
  if (ui.dimEdit != null && v?.v > 0) { setSize(ui.dimEdit, v.v); ui.dimEdit = null; vcbSet("", "المقاس"); return; }
  if (!v) { if (txt.trim()) setMsg("مش فاهم المقاس ده — اكتب رقم بالسم (أو 600mm أو 1.2m)"); else t?.enter?.(); return; }
  if (t?.vcb) t.vcb(v);
  else if (t?.enter) t.enter();
}

// ================================================================== actions on the selection
function selSolids() { return selRefs().filter((r) => r[0] === "s").map(ent).filter(Boolean); }
function selCenter() {
  const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  const addP = (P) => { b.x0 = Math.min(b.x0, P[0]); b.y0 = Math.min(b.y0, P[1]); b.z0 = Math.min(b.z0, P[2]); b.x1 = Math.max(b.x1, P[0]); b.y1 = Math.max(b.y1, P[1]); b.z1 = Math.max(b.z1, P[2]); };
  for (const r of selRefs()) {
    const e = ent(r); if (!e) continue;
    if (r[0] === "s") { const x = G.solidBox(e); addP([x.x0, x.y0, x.z0]); addP([x.x1, x.y1, x.z1]); }
    else if (r[0] === "k") e.pts.forEach((p) => addP(G.toWorld(e.plane, p)));
    else if (r[0] === "w") e.path.forEach(addP);
    else if (r[0] === "p") e.pts.forEach(addP);
  }
  return isFinite(b.x0) ? [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2] : [0, 0, 0];
}
function mirrorSel(ax) {
  const c = selCenter();
  edit(() => {
    for (const r of selRefs()) {
      const e = ent(r);
      const P = (p) => p.map((v, i) => (i === ax ? 2 * c[i] - v : v));
      const V = (v) => v.map((x, i) => (i === ax ? -x : x));
      if (r[0] === "s" || r[0] === "k") {
        // mirror the frame, then flip v back to keep it right-handed (and the profile with it)
        const pl = e.plane;
        e.plane = { o: P(pl.o), u: V(pl.u), v: G.mul(V(pl.v), -1) };
        const flip = (l) => l.map(([a, b]) => [a, -b]);
        if (r[0] === "s") {
          // the normal flipped too (mirror) — move the origin to the other face so the board stays where it was mirrored to
          const n2 = G.nOf(e.plane), nOld = V(G.nOf(pl));
          if (G.dot(n2, nOld) < 0) { e.plane.o = G.add(e.plane.o, G.mul(nOld, e.depth)); }
          e.outer = G.ccw(flip(e.outer)); e.holes = e.holes.map((h) => G.cw(flip(h))); e.pockets = e.pockets.map((pk) => ({ ...pk, loop: G.ccw(flip(pk.loop)) }));
        } else { e.pts = flip(e.pts); if (e.center) e.center = [e.center[0], -e.center[1]]; }
      } else xform(r, { p: P });
    }
    cabAfterXf();
  });
}
/** stand the selected board(s) up — facing the front, facing the side — or lay them flat, staying where they were
 *  (same lowest corner), like turning a real board in your hands */
function orientSel(kind) {
  const ss = selSolids(); if (!ss.length) return;
  const want = kind === "v" ? [0, 1, 0] : kind === "s" ? [1, 0, 0] : [0, 0, 1];
  const n = G.norm(G.nOf(ss[0].plane));
  if (Math.abs(Math.abs(G.dot(n, want)) - 1) < 1e-3) { setMsg(kind === "h" ? "هو نايم أصلاً" : "هو واقف كده أصلاً"); return; }
  let axis = G.cross(n, want);
  if (G.len(axis) < 1e-6) return;
  axis = G.norm(axis);
  const ang = Math.acos(Math.max(-1, Math.min(1, G.dot(n, want))));
  const before = selBox(), c = selCenter();
  edit(() => {
    for (const r of selRefs()) xform(r, { p: (P) => G.rotP(P, c, axis, ang) });
    const after = selBox(); if (!before || !after) { cabAfterXf(); return; }
    const dv = [before.x0 - after.x0, before.y0 - after.y0, before.z0 - after.z0];
    for (const r of selRefs()) xform(r, { p: (P) => G.add(P, dv) });
    cabAfterXf();
  });
  setMsg(kind === "v" ? "اتوقّف رأسي ووشه لقدام" : kind === "s" ? "اتوقّف رأسي ووشه للجنب" : "اتنيّم");
}
function rotSel90(ax) { const c = selCenter(); edit(() => { for (const r of selRefs()) xform(r, { p: (P) => G.rotP(P, c, AX[ax], Math.PI / 2) }); cabAfterXf(); }); }
function dupSel() { edit(() => { const made = copyRefs(selRefs()); for (const r of made) xform(r, { p: (P) => G.add(P, [10, 10, 0]) }); ui.sel = new Set(made); }); }
function groupSel() {
  const ss = selSolids(); if (ss.length < 2) { setMsg("اختار أكتر من لوح (زرار «+» للاختيار المتعدد)"); return; }
  edit(() => { const g = { id: uid(), name: `مجموعة ${M.groups.length + 1}` }; M.groups.push(g); ss.forEach((s) => (s.group = g.id)); ui.sel = new Set(["G:" + g.id]); });
}
function ungroupSel() { edit(() => { for (const r of [...ui.sel]) if (r.startsWith("G:")) { const gid = r.slice(2); M.solids.forEach((s) => { if (s.group === gid) delete s.group; }); M.groups = M.groups.filter((g) => g.id !== gid); } ui.sel.clear(); }); }
function hideSel() { edit(() => { for (const r of selRefs()) { const e = ent(r); if (e) e.hidden = true; } ui.sel.clear(); }); }
function unhideAll() { edit(() => { for (const k of ["solids", "sweeps"]) M[k].forEach((e) => delete e.hidden); }); }
function isolateSel() { const keep = new Set(selRefs()); edit(() => { M.solids.forEach((s) => { if (!keep.has("s:" + s.id)) s.hidden = true; }); M.sweeps.forEach((w) => { if (!keep.has("w:" + w.id)) w.hidden = true; }); }); }
/** quick adds: a board or a carcass box with its parts in place */
function addBoard(w, h, t, orient) {
  edit(() => {
    const pl = orient === "v" ? { o: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1] } : orient === "s" ? { o: [0, 0, 0], u: [0, 1, 0], v: [0, 0, 1] } : { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0] };
    // vertical boards: normal −y / +x — place them so they stand on the ground at the origin
    const s = { id: uid(), name: `لوح ${M.solids.length + 1}`, mat: ui.mat, plane: orient === "v" ? { ...pl, o: [0, t, 0] } : pl, outer: G.rect(0, 0, w, h), holes: [], pockets: [], depth: t };
    s.plane.o = G.add(s.plane.o, [freeX(), 0, 0]);
    M.solids.push(s); ui.sel = new Set(["s:" + s.id]);
  });
  zoomExtents();
}
/** quick adds go beside what is already drawn, never inside it */
function freeX() { let x = -Infinity; for (const s of M.solids) x = Math.max(x, G.solidBox(s).x1); return isFinite(x) ? Math.ceil(x + 10) : 0; }
function addBox(W, H, D, t, back) {
  edit(() => {
    const gid = uid(), x0 = freeX(); M.groups.push({ id: gid, name: `صندوق ${f1(W)}×${f1(H)}×${f1(D)}` });
    const S = (name, mat, plane, w, h, d) => ({ id: uid(), name, mat, plane, outer: G.rect(0, 0, w, h), holes: [], pockets: [], depth: d, group: gid });
    const inD = back ? D - 0.6 : D;
    M.solids.push(
      S("جنب شمال", "carcass", { o: [0, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, inD, H, t),
      S("جنب يمين", "carcass", { o: [W - t, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, inD, H, t),
      S("قاعدة", "carcass", { o: [t, 0, 0], u: [1, 0, 0], v: [0, 1, 0] }, W - 2 * t, inD, t),
      S("سقف", "carcass", { o: [t, 0, H - t], u: [1, 0, 0], v: [0, 1, 0] }, W - 2 * t, inD, t),
    );
    if (back) M.solids.push(S("ظهر", "back", { o: [0, D, 0], u: [1, 0, 0], v: [0, 0, 1] }, W, H, 0.6));
    if (x0) for (const s of M.solids) if (s.group === gid) s.plane.o = G.add(s.plane.o, [x0, 0, 0]);
    ui.sel = new Set(["G:" + gid]);
  });
  zoomExtents();
}

/** translucent panes at the front of the current cabinet's cavities — tap one to work inside that cavity */
function cabGhosts() {
  const c = curCab(); if (!c) return;
  const xf = Cab.cabXf({ ...c, ...(Cab.cabFrame(c, cabLeft(c)) || {}) }); // where the boards are now (moved / turned since the last rebuild)
  for (const cv of Cab.cavities(c)) {
    const on = ui.cabFocus?.kind === "cav" && ui.cabFocus.key === cv.key;
    const loop = [[cv.x0 + 0.3, cv.z0 + 0.3], [cv.x1 - 0.3, cv.z0 + 0.3], [cv.x1 - 0.3, cv.z1 - 0.3], [cv.x0 + 0.3, cv.z1 - 0.3]].map(([x, z]) => xf.P([x, 0.6, z]));
    const { geo } = triFaces([{ n: G.norm(G.cross(G.sub(loop[1], loop[0]), G.sub(loop[3], loop[0]))), outer: loop, holes: [] }]);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: on ? 0x2e7d4f : 0x2f6fdf, transparent: true, opacity: on ? 0.35 : 0.08, side: THREE.DoubleSide, depthWrite: false }));
    m.userData = { ref: `C:${c.id}|${cv.key}`, cav: cv.key }; m.renderOrder = 2;
    extraG.add(m);
  }
}
// ================================================================== مصمّم الوحدات بالقطع (v72): a cabinet by roles and joints → boards
function cabOf(id) { return (M.cabs || []).find((c) => c.id === id) || null; }
/** the cabinet being edited: the chosen one, else the one the selected board belongs to */
function curCab() {
  if (ui.cab) { const c = cabOf(ui.cab); if (c) return c; ui.cab = null; }
  const r = selRefs()[0]; if (!r) return null;
  if (r.startsWith("G:")) return cabOf(r.slice(2));
  const e = ent(r); return e?.cab ? cabOf(e.cab) : null;
}
/** rebuild a cabinet's boards from its description (keeps the group, replaces the boards) */
function cabRegen(c) {
  const libs = new Map(M.solids.filter((s) => s.cab === c.id && s.lib).map((s) => [s.name, s.lib])); // a piece's own material survives a rebuild (by name)
  M.solids = M.solids.filter((s) => s.cab !== c.id);
  let g = M.groups.find((x) => x.id === c.id); if (!g) { g = { id: c.id, name: c.name }; M.groups.push(g); } g.name = c.name;
  for (const s of Cab.cabSolids(c)) { if (libs.has(s.name)) s.lib = libs.get(s.name); M.solids.push(s); }
}
function cabAdd() {
  edit(() => { const c = Cab.newCab((M.cabs?.length || 0) + 1, freeX()); (M.cabs ||= []).push(c); cabRegen(c); ui.cab = c.id; ui.sel = new Set(["G:" + c.id]); });
  zoomExtents(); setMsg("علبة جديدة — غيّر المقاسات والوصلات من اللوحة، وكل قطعة بتتحدث لوحدها");
}
function cabDel(c) { edit(() => { M.solids = M.solids.filter((s) => s.cab !== c.id); M.groups = M.groups.filter((g) => g.id !== c.id); M.cabs = M.cabs.filter((x) => x.id !== c.id); ui.cab = null; ui.sel.clear(); }); }
/** the position the group is at now (the user may have moved it) → keep it as the cabinet's origin before regenerating */
function cabSyncPos(c) {
  const fr = Cab.cabFrame(c, cabLeft(c));
  if (fr) Object.assign(c, fr); // position + turn about z + mirror, read from the left side as it stands
}
function cabLeft(c) { return M.solids.find((s) => s.cab === c.id && s.cabKey === "sideL") || M.solids.find((s) => s.cab === c.id && s.role === "side" && s.name === "جنب شمال") || null; }
/** walk a dotted path into the cabinet ("fronts.0.parts.1") */
function cabPath(c, path) { let o = c; for (const k of path.split(".")) { if (o == null) return null; o = o[k]; } return o ?? null; }
const cabNum = (v, d) => { const n = parseFloat(String(v).replace(/[^\d.\-]/g, "")); return Number.isFinite(n) ? n : d; };
function cabChange(t) {
  const c = curCab(); if (!c) return;
  const path = t.dataset.cf.split("."), v = t.type === "checkbox" ? t.checked : t.value;
  if (path[0] === "cav") { edit(() => { cabSyncPos(c); const z = Cab.zoneOf(c, path[1]); Cab.setZone(c, [path[1]], v, z && z.cavs.length === 1 ? { hinge: z.hinge, n: z.n, hs: z.hs } : {}); cabRegen(c); }); return; }
  edit(() => {
    cabSyncPos(c);
    // moving / re-banding a divider can reorder the cavities: zones, shelves and partitions stay with their physical cavity
    const geo = path[0] === "dividers" || path[0] === "hdividers";
    (geo ? (fn) => Cab.remapCavities(c, fn) : (fn) => fn())(() => {
    let o = c; for (let i = 0; i < path.length - 1; i++) { const k = path[i]; o = o[k] ??= {}; }
    const k = path[path.length - 1], cur = o[k];
    if (k === "hs") o[k] = String(v).split(/[،,\s]+/).map(Number).filter((x) => x > 0);
    else if (typeof cur === "number" || /^(W|H|D|t|tb|kick|insetF|insetB|railW|railInset|off|groove|rabbet|gap|reveal|clr|boxT|baseT|drop|lowerFront|at|z|x|n|setback|recess|size|l|r|b)$/.test(k) || (k === "t" )) o[k] = Math.max(k === "n" ? 1 : 0, cabNum(v, cur ?? 0));
    else if (typeof cur === "boolean" || t.type === "checkbox") o[k] = !!v;
    else o[k] = v;
    if (k === "name") { o[k] = String(v).trim() || cur; }
    // a fill that becomes drawers starts with 3 equal drawers
    if (path[0] === "fronts" && k === "kind" && v === "drawers") { o.n ??= 3; }
    if (path[0] === "fronts" && k === "kind" && v === "split") { o.dir ||= "h"; if (!(o.parts || []).length) o.parts = [{ kind: "drawers", n: 1, size: 20 }, { kind: "door1", hinge: "left" }]; }
    });
    cabRegen(c);
  });
}
function cabAction(kind, b) {
  if (kind === "add") { cabAdd(); return; }
  const c = curCab();
  if (kind === "close") { ui.cab = null; ui.cabFocus = null; rebuild(); renderUI(); return; }
  if (kind === "unfocus") { ui.cabFocus = null; rebuild(); renderUI(); return; }
  if (!c) return;
  if (kind === "del") { if (confirm(`تمسح «${c.name}» بكل قطعها؟`)) cabDel(c); return; }
  if (kind === "regen") { edit(() => { cabSyncPos(c); cabRegen(c); }); setMsg("اتجدّدت القطع"); return; }
  if (kind === "detach") { edit(() => { for (const s of M.solids) if (s.cab === c.id) { delete s.cab; delete s.role; } M.cabs = M.cabs.filter((x) => x.id !== c.id); ui.cab = null; }); setMsg("بقت ألواح حرة — عدّلها بأدوات الرسم"); return; }
  const I = Cab.inner(c);
  edit(() => {
    cabSyncPos(c);
    const run = (fn) => (/^(adddiv|addhdiv|deldiv:|delhdiv:)/.test(kind) ? Cab.remapCavities(c, fn) : fn());
    run(() => {
    if (kind === "adddiv") { const col = Cab.columns(c, 0).sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0))[0]; if (col) c.dividers.push({ id: uid(), from: "left", at: Math.round(col.x0 - I.x0 + (col.x1 - col.x0 - c.t) / 2), band: "" }); }
    else if (kind === "addhdiv") { const bd = Cab.bands(c).sort((a, b) => (b.z1 - b.z0) - (a.z1 - a.z0))[0]; (c.hdividers ||= []); if (bd) c.hdividers.push({ id: uid(), from: "bottom", at: Math.round(bd.z0 - I.z0 + (bd.z1 - bd.z0 - c.t) / 2) }); }
    else if (kind.startsWith("delhdiv:")) c.hdividers.splice(+kind.split(":")[1], 1);
    else if (kind.startsWith("deldiv:")) c.dividers.splice(+kind.split(":")[1], 1);
    else if (kind.startsWith("addshelf:")) { const [, bs, cs] = kind.split(":"); const band = +bs || 0, col = +cs || 0; const cell = Cab.cells(c).find((q) => q.band === band && q.col === col); const ns = c.shelves.filter((x) => (x.band || 0) === band && x.col === col).length; if (cell) c.shelves.push({ id: uid(), band, col, z: Math.round(((cell.z1 - cell.z0) * (ns + 1)) / (ns + 2)), fixed: false, setback: 1 }); }
    else if (kind.startsWith("delshelf:")) c.shelves.splice(+kind.split(":")[1], 1);
    else if (kind.startsWith("addvpart:")) { const [, bs, cs] = kind.split(":"); const band = +bs || 0, col = +cs || 0; const cell = Cab.cells(c).find((q) => q.band === band && q.col === col); (c.vparts ||= []); const n = c.vparts.filter((x) => (x.band || 0) === band && x.col === col).length; if (cell) c.vparts.push({ id: uid(), band, col, x: Math.round(((cell.x1 - cell.x0) * (n + 1)) / (n + 2) - c.t / 2), setback: 1 }); }
    else if (kind.startsWith("delvpart:")) c.vparts.splice(+kind.split(":")[1], 1);
    else if (kind.startsWith("each:")) { const fk = kind.split(":")[1]; for (const cv of Cab.cavities(c)) Cab.setZone(c, [cv.key], fk); } // every cavity on its own
    else if (kind.startsWith("whole:")) { const fk = kind.split(":")[1]; Cab.setZone(c, Cab.cavities(c).map((cv) => cv.key), fk); } // the whole box behind one zone
    else if (kind.startsWith("join:")) { const fk = kind.split(":")[1], keys = [...el.querySelectorAll("[data-cavpick]:checked")].map((x) => x.dataset.cavpick); if (!keys.length) setMsg("علّم الفراغات اللي عايز تضمها الأول (☑ ضم)"); else if (!Cab.rectZone(c, keys)) setMsg("الفراغات دي مش بتعمل مستطيل واحد — الضلفة لازم تكون مستطيلة (اختار فراغات فوق بعض أو جنب بعض)"); else Cab.setZone(c, keys, fk); }
    else if (kind.startsWith("partadd:")) { const o = cabPath(c, kind.slice(8)); if (o) { o.parts ||= []; o.parts.push({ kind: "door1", hinge: "left", size: 20 }); } }
    else if (kind.startsWith("partdel:")) { const [, path, pi] = kind.split(":"); const o = cabPath(c, path); if (o?.parts) o.parts.splice(+pi, 1); }
    else if (kind.startsWith("zonedel:")) { const id = kind.slice(8); c.fronts = (c.fronts || []).filter((z) => z.id !== id); }
    else if (kind.startsWith("zonesplit:")) { const id = kind.slice(10); const z = (c.fronts || []).find((x) => x.id === id); if (z) { const keys = z.cavs; c.fronts = c.fronts.filter((x) => x.id !== id); for (const k of keys) Cab.setZone(c, [k], z.kind, { hinge: z.hinge, n: z.n }); } }
    });
    cabRegen(c);
  });
}
const cabSel = (path, v, opts) => `<select data-cf="${path}">${Object.entries(opts).map(([k, l]) => `<option value="${k}" ${k === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const cabNumIn = (path, label, v, step = 0.1) => `<label><span>${label}</span><input type="text" inputmode="decimal" data-numf data-cf="${path}" value="${f1(v)}"></label>`;
/** one front's details: kind, hinge, drawer count/heights, handle recess, trims, inset — and the sub-fronts of a split */
function cabFrontFields(path, f, { sub = false } = {}) {
  const kinds = sub ? Cab.SUB_KINDS : Cab.FILL_KINDS;
  let h = `<div class="dsrow">${sub ? `<input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="${path}.size" value="${f.size != null ? f1(f.size) : ""}" placeholder="المقاس" title="مقاس الجزء (الأخير بياخد الباقي)">` : ""}${cabSel(`${path}.kind`, f.kind, kinds)}${f.kind === "door1" ? cabSel(`${path}.hinge`, f.hinge || "left", { left: "مفصلات شمال", right: "مفصلات يمين" }) : ""}${f.kind === "drawers" ? `<input class="dsin sm" type="text" inputmode="numeric" data-numf data-cf="${path}.n" value="${f.n || 3}" title="عدد الأدراج"><input class="dsin" type="text" inputmode="decimal" data-cf="${path}.hs" value="${(f.hs || []).map(f1).join("، ")}" placeholder="ارتفاعات من تحت، مثلاً 20، 20، 30">` : ""}</div>`;
  if (f.kind === "split") {
    h += `<div class="dscol"><div class="dsrow"><b>تقسيم الفراغ</b>${cabSel(`${path}.dir`, f.dir || "h", { h: "فوق بعض (من تحت لفوق)", v: "جنب بعض (من الشمال لليمين)" })}</div>
      ${(f.parts || []).map((p, pi) => `<div class="dscav"><div class="dsrow"><b>جزء ${pi + 1}</b><button class="dsb" data-cab="partdel:${path}:${pi}">✕</button></div>${cabFrontFields(`${path}.parts.${pi}`, p, { sub: true })}</div>`).join("")}
      <button class="dsb" data-cab="partadd:${path}">＋ جزء</button><p class="hint">كل جزء له مقاسه بالسنتي (الأخير بياخد الباقي) ونوعه: أدراج فوق وضلفة تحت مثلاً — من غير أي لوح في العلبة.</p></div>`;
  } else if (f.kind !== "open") {
    const tr = f.trim || {};
    h += `<details class="dsdet"><summary>⚙ تفاصيل الضلفة</summary><div class="dsgrid">
      <label><span>خلوص مقبض بلت إن</span><input type="text" inputmode="decimal" data-numf data-cf="${path}.recess" value="${f1(+f.recess || 0)}"></label>
      <label><span>الخلوص فين</span>${cabSel(`${path}.recessAt`, f.recessAt || "top", { top: "فوق", bottom: "تحت" })}</label>
      <label><span>قصّ من الشمال</span><input type="text" inputmode="decimal" data-numf data-cf="${path}.trim.l" value="${f1(+tr.l || 0)}"></label>
      <label><span>قصّ من اليمين</span><input type="text" inputmode="decimal" data-numf data-cf="${path}.trim.r" value="${f1(+tr.r || 0)}"></label>
      <label><span>قصّ من فوق</span><input type="text" inputmode="decimal" data-numf data-cf="${path}.trim.t" value="${f1(+tr.t || 0)}"></label>
      <label><span>قصّ من تحت</span><input type="text" inputmode="decimal" data-numf data-cf="${path}.trim.b" value="${f1(+tr.b || 0)}"></label></div>
      <label class="dschk"><input type="checkbox" data-cf="${path}.inset" ${f.inset ? "checked" : ""}> ضلفة داخلية (جوه الفراغ بدل ما تغطي الجنب)</label>
      <p class="hint">الخلوص بيقصّر الضلفة من الناحية دي علشان المقبض البلت إن. القصّ بيصغّر الضلفة من الجهة اللي تختارها (الفراغ بين الضلفتين ثابت ${f1(cur_gap())} سم).</p></details>`;
  }
  return h;
}
const cur_gap = () => curCab()?.front?.gap ?? 0.3;
function cabZoneHtml(c, z, zi, cavs) {
  return `<div class="dscav"><div class="dsrow"><span>${esc(Cab.FILL_KINDS[z.kind] || z.kind)} — ${z.cavs.map((k) => "فراغ " + (cavs.findIndex((q) => q.key === k) + 1)).join(" + ")}</span>${z.cavs.length > 1 ? `<button class="dsb" data-cab="zonesplit:${z.id}" title="فكّها لكل فراغ لوحده">⇵</button>` : ""}<button class="dsb" data-cab="zonedel:${z.id}">✕</button></div>${cabFrontFields(`fronts.${zi}`, z)}</div>`;
}
/** the settings of one piece / one cavity only (after a tap in the 3D) */
function cabFocusHtml(c, cavs, bands, cellsL) {
  const F = ui.cabFocus; if (!F) return null;
  const back = `<div class="dsbtns"><button class="dsb primary" data-cab="unfocus">☰ كل إعدادات العلبة</button></div>`;
  const cavRow = (cv) => { const z = Cab.zoneOf(c, cv.key), i = cavs.findIndex((q) => q.key === cv.key), zi = z ? (c.fronts || []).indexOf(z) : -1;
    return `<div class="dscav"><div class="dsrow"><b>فراغ ${i + 1}</b><small dir="ltr">${f1(cv.x1 - cv.x0)} × ${f1(cv.z1 - cv.z0)}</small>${z && z.cavs.length > 1 ? `<small>مضموم مع ${z.cavs.filter((k) => k !== cv.key).map((k) => "فراغ " + (cavs.findIndex((q) => q.key === k) + 1)).join("، ")}</small>` : cabSel(`cav.${cv.key}`, z ? z.kind : "open", Cab.FILL_KINDS)}</div>${z && zi >= 0 ? cabFrontFields(`fronts.${zi}`, z) : ""}</div>`; };
  if (F.kind === "cav") {
    const cv = cavs.find((q) => q.key === F.key); if (!cv) { ui.cabFocus = null; return null; }
    const cell = cellsL.find((q) => q.band === cv.band && q.col === cv.col);
    let h = `<div class="dsbox focus"><b>🔎 الفراغ ${cavs.indexOf(cv) + 1}</b> <small dir="ltr">${f1(cv.x1 - cv.x0)} × ${f1(cv.z1 - cv.z0)}</small>${back}
      <h4>🚪 الوش بتاعه</h4>${cavRow(cv)}
      <h4>▤ الأرفف جواه</h4>${c.shelves.map((sh, i) => (sh.band || 0) === cv.band && sh.col === cv.col ? `<div class="dsrow"><span>رف</span><input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="shelves.${i}.z" value="${f1(sh.z)}" aria-label="الارتفاع من تحت"><label class="dschk"><input type="checkbox" data-cf="shelves.${i}.fixed" ${sh.fixed ? "checked" : ""}> ثابت</label><button class="dsb" data-cab="delshelf:${i}">✕</button></div>` : "").join("")}
      <button class="dsb" data-cab="addshelf:${cv.band}:${cv.col}">＋ رف</button><p class="hint">الرقم = ارتفاع تحت الرف من قاع الفراغ (${cell ? f1(cell.z1 - cell.z0) : ""} سم).</p>
      <h4>▥ فواصل رأسية جواه</h4>${(c.vparts || []).map((v, i) => (v.band || 0) === cv.band && v.col === cv.col ? `<div class="dsrow"><span>فاصل</span><input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="vparts.${i}.x" value="${f1(v.x)}" aria-label="المسافة من شمال الفراغ"><label><span>داخل من قدام</span><input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="vparts.${i}.setback" value="${f1(v.setback ?? 1)}"></label><button class="dsb" data-cab="delvpart:${i}">✕</button></div>` : "").join("")}
      <button class="dsb" data-cab="addvpart:${cv.band}:${cv.col}">＋ فاصل رأسي</button><p class="hint">لوح واقف جوه الفراغ من قاعه لسقفه (زي الرف بس رأسي) — الرقم = المسافة من وش الفراغ الشمال. مش بيقسم الفراغ للضلف (${cell ? f1(cell.x1 - cell.x0) : ""} سم).</p>
      <h4>☑ ضمّه مع فراغات تانية</h4><div class="dsrow">${cavs.filter((q) => q.key !== cv.key).map((q) => `<label class="dschk"><input type="checkbox" data-cavpick="${q.key}"> فراغ ${cavs.indexOf(q) + 1}</label>`).join("")}<input type="checkbox" data-cavpick="${cv.key}" checked hidden></div>
      <div class="dsbtns"><button class="dsb" data-cab="join:door1">ضلفة واحدة</button><button class="dsb" data-cab="join:door2">ضلفتين</button><button class="dsb" data-cab="join:flap">قلاب</button><button class="dsb" data-cab="join:drawers">أدراج</button></div></div>`;
    return h;
  }
  const s = M.solids.find((x) => x.id === F.sid); if (!s || s.cab !== c.id) { ui.cabFocus = null; return null; }
  const r = s.cabRef || {}, head = `<div class="dsbox focus"><b>🔎 ${esc(s.name)}</b> <small dir="ltr">${f1(G.boardSize(s).w)} × ${f1(G.boardSize(s).h)} × ${f1(s.depth)}</small>${back}
    <label class="dsf"><span>🎨 خامة القطعة دي</span>${libSelect(s.lib || "")}</label><p class="hint">سيبها «خامة الدور» تاخد خامة الوحدة، أو اختار خامة بعينها تتقطع منها القطعة دي بس.</p>`;
  if (r.k === "div" && c.dividers[r.i]) { const d = c.dividers[r.i], i = r.i; return head + `<h4>▥ القاطوع الرأسي</h4><div class="dsrow">${cabSel(`dividers.${i}.from`, d.from, { left: "من الجنب الشمال", right: "من الجنب اليمين" })}<input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="dividers.${i}.at" value="${f1(d.at)}" aria-label="المسافة">${bands.length > 1 ? cabSel(`dividers.${i}.band`, d.band == null ? "" : String(d.band), { "": "كل الارتفاع", ...Object.fromEntries(bands.map((b, bi) => [String(bi), `حزام ${bi + 1} بس`])) }) : ""}<button class="dsb" data-cab="deldiv:${i}">✕ امسحه</button></div><p class="hint">المسافة من وش الجنب من جوه لحد القاطوع.</p></div>`; }
  if (r.k === "hdiv" && c.hdividers?.[r.i]) { const d = c.hdividers[r.i], i = r.i; return head + `<h4>▬ القاطوع الأفقي</h4><div class="dsrow">${cabSel(`hdividers.${i}.from`, d.from, { bottom: "من القاعدة", top: "من الرأس" })}<input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="hdividers.${i}.at" value="${f1(d.at)}" aria-label="المسافة"><button class="dsb" data-cab="delhdiv:${i}">✕ امسحه</button></div></div>`; }
  if (r.k === "vpart" && c.vparts?.[r.i]) { const v = c.vparts[r.i], i = r.i; return head + `<h4>▥ الفاصل الرأسي</h4><div class="dsrow"><span>من شمال الفراغ</span><input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="vparts.${i}.x" value="${f1(v.x)}"><label><span>داخل من قدام</span><input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="vparts.${i}.setback" value="${f1(v.setback ?? 1)}"></label><button class="dsb" data-cab="delvpart:${i}">✕ امسحه</button></div></div>`; }
  if (r.k === "shelf" && c.shelves[r.i]) { const sh = c.shelves[r.i], i = r.i; return head + `<h4>▤ الرف</h4><div class="dsrow"><span>ارتفاع تحته</span><input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="shelves.${i}.z" value="${f1(sh.z)}"><label class="dschk"><input type="checkbox" data-cf="shelves.${i}.fixed" ${sh.fixed ? "checked" : ""}> ثابت</label><label><span>داخل من قدام</span><input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="shelves.${i}.setback" value="${f1(sh.setback ?? 1)}"></label><button class="dsb" data-cab="delshelf:${i}">✕ امسحه</button></div></div>`; }
  if (r.k === "zone" && r.path) { const f = cabPath(c, r.path); if (f) { const zi = +r.path.split(".")[1], z = c.fronts?.[zi]; return head + `<h4>🚪 ${esc(Cab.FILL_KINDS[f.kind] || f.kind)}${z ? ` — ${z.cavs.map((k) => "فراغ " + (cavs.findIndex((q) => q.key === k) + 1)).join(" + ")}` : ""}</h4>${cabFrontFields(r.path, f, { sub: r.path.includes(".parts.") })}${z ? `<div class="dsbtns">${z.cavs.length > 1 ? `<button class="dsb" data-cab="zonesplit:${z.id}">⇵ فكّها لكل فراغ</button>` : ""}<button class="dsb" data-cab="zonedel:${z.id}">✕ شيل الوش</button></div>` : ""}</div>`; } }
  // carcass pieces: the joints
  return head + `<h4>🔩 الوصلات والمقاسات</h4><div class="dsgrid">${cabNumIn("W", "العرض", c.W)}${cabNumIn("H", "الارتفاع", c.H)}${cabNumIn("D", "العمق", c.D)}${cabNumIn("t", "سمك اللوح", c.t)}${cabNumIn("tb", "سمك الظهر", c.tb)}${cabNumIn("bottom.kick", "ارتفاع السكلو", c.bottom.kick)}</div>
    ${s.role === "bottom" || s.role === "side" ? `<label><span>القاعدة</span>${cabSel("bottom.joint", c.bottom.joint, Cab.BOTTOM_JOINTS)}</label><div class="dsgrid">${cabNumIn("bottom.insetF", "القاعدة داخلة من قدام", c.bottom.insetF)}${cabNumIn("bottom.insetB", "القاعدة داخلة من ورا", c.bottom.insetB)}</div>` : ""}
    ${s.role === "top" || s.role === "rail" || s.role === "side" ? `<label><span>الرأس</span>${cabSel("top.joint", c.top.joint, Cab.TOP_JOINTS)}</label>${c.top.joint === "rails" ? `<div class="dsgrid">${cabNumIn("top.railW", "عرض الشريط", c.top.railW)}${cabNumIn("top.railInset", "الشريط الأمامي داخل", c.top.railInset)}</div>` : ""}` : ""}
    ${s.role === "back" || s.role === "side" ? `<label><span>الظهر</span>${cabSel("back.kind", c.back.kind, Cab.BACK_KINDS)}</label>${c.back.kind === "groove" ? `<div class="dsgrid">${cabNumIn("back.off", "الظهر داخل عن الحرف الخلفي", c.back.off)}${cabNumIn("back.groove", "عمق المفحار", c.back.groove)}</div>` : c.back.kind === "rabbet" ? `<div class="dsgrid">${cabNumIn("back.rabbet", "عمق الأورزة", c.back.rabbet)}</div>` : ""}` : ""}
    ${s.role === "drawer_box" || s.role === "drawer_bottom" ? `<div class="dsgrid">${cabNumIn("drawers.clr", "خلوص المجرى (كل جنب)", c.drawers.clr)}${cabNumIn("drawers.boxT", "سمك صندوق الدرج", c.drawers.boxT)}${cabNumIn("drawers.drop", "الصندوق تحت وش الدرج بـ", c.drawers.drop)}${cabNumIn("drawers.lowerFront", "الصندوق فوق حرف الوش بـ", c.drawers.lowerFront)}</div>` : ""}</div>`;
}
function cabHtml() {
  const c = curCab();
  let h = `<details class="dsbox" ${c ? "open" : ""}><summary>🧰 مصمّم الوحدات بالقطع</summary>
    <p class="hint">اوصف العلبة بالأدوار: جنب، قاعدة، رأس، ظهر، قواطيع، أرفف — واختار الوصلات (القاعدة بين الجنبين ولا تحتهم، الظهر في مفحار…) والمقاسات بالسنتي، وكل فراغ يطلع تختار يبقى أدراج أو ضلفة أو قلاب أو ضلفتين. القطع بتتحدث لوحدها وبتدخل القص والملصقات والـCNC (المفحار بيطلع كجيب).</p>
    <div class="dsbtns"><button class="dsb primary" data-cab="add">＋ علبة جديدة</button>${(M.cabs || []).filter((x) => !c || x.id !== c.id).map((x) => `<button class="dsb" data-pick="G:${x.id}">${esc(x.name)}</button>`).join("")}</div>`;
  if (!c) return h + `</details>`;
  const I = Cab.inner(c), cavs = Cab.cavities(c), bands = Cab.bands(c), cellsL = Cab.cells(c);
  h += `<div class="dsrow"><input class="dsin" data-cf="name" value="${esc(c.name)}" aria-label="اسم العلبة"><button class="dsb" data-cab="close" title="قفل">✕</button></div>`;
  const focus = cabFocusHtml(c, cavs, bands, cellsL);
  if (focus) return h + focus + `</details>`;
  h += `<p class="hint">💡 دوس على أي قطعة في الـ3D تفتح إعداداتها هي بس، أو على الفراغ الفاضي (اللوح الشفاف) تشتغل جواه.</p>
    <div class="dsgrid">${cabNumIn("W", "العرض", c.W)}${cabNumIn("H", "الارتفاع", c.H)}${cabNumIn("D", "العمق", c.D)}${cabNumIn("t", "سمك اللوح", c.t)}${cabNumIn("tb", "سمك الظهر", c.tb)}${cabNumIn("bottom.kick", "ارتفاع السكلو (القاعدة من الأرض)", c.bottom.kick)}</div>
    <details open><summary>🔩 الوصلات</summary>
      <label><span>القاعدة</span>${cabSel("bottom.joint", c.bottom.joint, Cab.BOTTOM_JOINTS)}</label>
      <div class="dsgrid">${cabNumIn("bottom.insetF", "القاعدة داخلة من قدام", c.bottom.insetF)}${cabNumIn("bottom.insetB", "القاعدة داخلة من ورا", c.bottom.insetB)}</div>
      <label><span>الرأس</span>${cabSel("top.joint", c.top.joint, Cab.TOP_JOINTS)}</label>
      ${c.top.joint === "rails" ? `<div class="dsgrid">${cabNumIn("top.railW", "عرض الشريط", c.top.railW)}${cabNumIn("top.railInset", "الشريط الأمامي داخل", c.top.railInset)}</div>` : ""}
      <label><span>الظهر</span>${cabSel("back.kind", c.back.kind, Cab.BACK_KINDS)}</label>
      ${c.back.kind === "groove" ? `<div class="dsgrid">${cabNumIn("back.off", "الظهر داخل عن الحرف الخلفي", c.back.off)}${cabNumIn("back.groove", "عمق المفحار", c.back.groove)}</div>` : c.back.kind === "rabbet" ? `<div class="dsgrid">${cabNumIn("back.rabbet", "عمق الأورزة", c.back.rabbet)}</div>` : ""}
    </details>
    <details open><summary>▬ القواطيع الأفقية (${(c.hdividers || []).length})</summary>
      ${(c.hdividers || []).map((d, i) => `<div class="dsrow"><span>قاطوع أفقي ${i + 1}</span>${cabSel(`hdividers.${i}.from`, d.from, { bottom: "من القاعدة", top: "من الرأس" })}<input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="hdividers.${i}.at" value="${f1(d.at)}" aria-label="المسافة"><button class="dsb" data-cab="delhdiv:${i}">✕</button></div>`).join("")}
      <p class="hint">لوح أفقي بعرض العلبة كلها بيقسمها أحزمة (مش رف): المسافة من فوق القاعدة من جوه لحد تحته (أو من تحت الرأس). القواطيع الرأسية بتتقطع عنده.</p><button class="dsb" data-cab="addhdiv">＋ قاطوع أفقي</button>
    </details>
    <details open><summary>▥ القواطيع الرأسية (${c.dividers.length})</summary>
      ${c.dividers.map((d, i) => `<div class="dsrow"><span>قاطوع ${i + 1}</span>${cabSel(`dividers.${i}.from`, d.from, { left: "من الجنب الشمال", right: "من الجنب اليمين" })}<input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="dividers.${i}.at" value="${f1(d.at)}" aria-label="المسافة">${bands.length > 1 ? cabSel(`dividers.${i}.band`, d.band == null ? "" : String(d.band), { "": "كل الارتفاع", ...Object.fromEntries(bands.map((b, bi) => [String(bi), `حزام ${bi + 1} بس`])) }) : ""}<button class="dsb" data-cab="deldiv:${i}">✕</button></div>`).join("")}
      <p class="hint">المسافة من وش الجنب من جوه لحد القاطوع. الفراغ من جوه ${f1(I.x1 - I.x0)} سم.</p><button class="dsb" data-cab="adddiv">＋ قاطوع</button>
    </details>
    <details open><summary>▤ الأرفف (${c.shelves.length})</summary>
      ${cellsL.map((cell) => `<div class="dscol"><b>${bands.length > 1 ? `حزام ${cell.band + 1} · ` : ""}${Cab.columns(c, cell.band).length > 1 ? `عمود ${cell.col + 1}` : "الفراغ"} (${f1(cell.x1 - cell.x0)} × ${f1(cell.z1 - cell.z0)})</b>
        ${c.shelves.map((sh, i) => (sh.band || 0) === cell.band && sh.col === cell.col ? `<div class="dsrow"><span>رف</span><input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="shelves.${i}.z" value="${f1(sh.z)}" aria-label="الارتفاع من تحت"><label class="dschk"><input type="checkbox" data-cf="shelves.${i}.fixed" ${sh.fixed ? "checked" : ""}> ثابت</label><button class="dsb" data-cab="delshelf:${i}">✕</button></div>` : "").join("")}
        ${(c.vparts || []).map((v, i) => (v.band || 0) === cell.band && v.col === cell.col ? `<div class="dsrow"><span>فاصل رأسي</span><input class="dsin sm" type="text" inputmode="decimal" data-numf data-cf="vparts.${i}.x" value="${f1(v.x)}" aria-label="من الشمال"><button class="dsb" data-cab="delvpart:${i}">✕</button></div>` : "").join("")}
        <button class="dsb" data-cab="addshelf:${cell.band}:${cell.col}">＋ رف</button><button class="dsb" data-cab="addvpart:${cell.band}:${cell.col}">＋ فاصل رأسي</button></div>`).join("")}
      <p class="hint">الرقم = ارتفاع تحت الرف من فوق القاعدة من جوه (أو من فوق القاطوع الأفقي). الرف المتحرك بيدخل 1 سم من قدام و1.5 مم من كل جنب.</p>
    </details>
    <details open><summary>🚪 الفراغات (${cavs.length}) — أدراج / ضلف</summary>
      <p class="hint">الفراغ = اللي بين الجنبين والقواطيع (الرأسية والأفقية) — الأرفف جواه مش بتقسمه. كل فراغ اختاره لوحده، أو علّم كذا فراغ (☑ ضم) واعملهم ضلفة واحدة / ضلفتين / قلاب — أو العلبة كلها ضلفة واحدة.</p>
      ${cavs.map((cv, i) => { const z = Cab.zoneOf(c, cv.key); const shared = z && z.cavs.length > 1; return `<div class="dscav ${shared ? "shared" : ""}"><div class="dsrow"><label class="dschk" title="ضم"><input type="checkbox" data-cavpick="${cv.key}"></label><b>فراغ ${i + 1}</b><small dir="ltr">${f1(cv.x1 - cv.x0)} × ${f1(cv.z1 - cv.z0)}</small>${shared ? `<small>مع ${z.cavs.map((k) => cavs.findIndex((q) => q.key === k) + 1).filter((n) => n && n !== i + 1).map((n) => "فراغ " + n).join("، ")} → ${esc(Cab.FILL_KINDS[z.kind])}</small>` : cabSel(`cav.${cv.key}`, z ? z.kind : "open", Cab.FILL_KINDS)}</div></div>`; }).join("")}
      <div class="dsbtns"><small>المعلّمين ☑ →</small><button class="dsb" data-cab="join:door1">ضلفة واحدة</button><button class="dsb" data-cab="join:door2">ضلفتين</button><button class="dsb" data-cab="join:flap">قلاب</button><button class="dsb" data-cab="join:drawers">أدراج</button></div>
      <div class="dsbtns"><small>العلبة كلها →</small><button class="dsb" data-cab="whole:door1">ضلفة واحدة</button><button class="dsb" data-cab="whole:door2">ضلفتين</button><button class="dsb" data-cab="whole:flap">قلاب</button></div>
      <div class="dsbtns"><small>كل فراغ لوحده →</small><button class="dsb" data-cab="each:door2">ضلفتين</button><button class="dsb" data-cab="each:door1">ضلفة</button><button class="dsb" data-cab="each:drawers">أدراج</button><button class="dsb" data-cab="each:open">فاضي</button></div>
      ${(c.fronts || []).length ? `<div class="dscol"><b>الضلف والأدراج (${c.fronts.length}) — دوس ⚙ لتفاصيل كل ضلفة</b>${c.fronts.map((z, zi) => cabZoneHtml(c, z, zi, cavs)).join("")}</div>` : ""}
      <p class="hint">الضلف أوفرلاي: بتغطي الجنب ما عدا ${f1(c.front.reveal)} سم، وبين كل ضلفتين ${f1(c.front.gap)} سم. الأدراج: صندوق خشب بخلوص ${f1(c.drawers.clr)} سم لكل مجرى (الصندوق بيتعمل لما الدرج في عمود واحد).</p>
    </details>
    <details><summary>⚙ تفاصيل الضلف والأدراج</summary><div class="dsgrid">${cabNumIn("front.gap", "الفراغ بين الضلف", c.front.gap)}${cabNumIn("front.reveal", "الباين من الجنب", c.front.reveal)}${cabNumIn("drawers.clr", "خلوص المجرى (كل جنب)", c.drawers.clr)}${cabNumIn("drawers.boxT", "سمك صندوق الدرج", c.drawers.boxT)}${cabNumIn("drawers.drop", "الصندوق تحت وش الدرج بـ", c.drawers.drop)}${cabNumIn("drawers.lowerFront", "الصندوق فوق حرف الوش بـ", c.drawers.lowerFront)}</div></details>
    <div class="dsbtns"><button class="dsb primary" data-ds="cablib">⭐ احفظ العلبة في المكتبة</button><button class="dsb" data-cab="regen">↻ جدّد القطع</button><button class="dsb" data-cab="detach">🔓 فكّها ألواح حرة</button><button class="dsb danger" data-cab="del">🗑 امسح العلبة</button></div>
    <p class="hint">${M.solids.filter((s) => s.cab === c.id).length} قطعة. لو حرّكت العلبة كلها بأداة التحريك بتفضل متجمّعة؛ أي تعديل من هنا بيعيد بناء القطع في مكانها.</p></details>`;
  return h;
}
// ================================================================== side panel + bars
function renderUI() {
  if (!el) return;
  el.querySelectorAll("[data-tool]").forEach((b) => b.classList.toggle("on", b.dataset.tool === ui.tool));
  el.querySelectorAll("[data-axis]").forEach((b) => b.classList.toggle("on", +b.dataset.axis === ui.axis));
  el.querySelector('[data-ds="xray"]').classList.toggle("on", ui.xray);
  el.querySelector('[data-ds="ortho"]').classList.toggle("on", ui.ortho);
  el.querySelector('[data-ds="section"]').classList.toggle("on", ui.section != null);
  el.querySelector('[data-ds="undo"]').disabled = !hist.u.length;
  el.querySelector('[data-ds="redo"]').disabled = !hist.r.length;
  el.querySelector("#dsSec").hidden = ui.section == null;
  el.querySelector("#dsPlane").value = ui.face2d ? "auto" : ui.plane;
  el.querySelector("#dsStep").value = String(ui.step);
  el.querySelector('[data-ds="snapmenu"]').classList.toggle("on", !!ui.snap.on);
  el.querySelector("#dsHint").textContent = (ui.face2d ? "✏️ رسم 2D على وش القطعة · " : "") + (HINT[ui.tool] || "");
  const nm = el.querySelector("#dsName"); if (document.activeElement !== nm) nm.value = mname;
  el.classList.toggle("noside", !ui.panel);
  el.querySelector("#dsSide").innerHTML = sideHtml();
}
const PLANES = [["auto", "🖐 تلقائي (الوش اللي تحت صباعك)"], ["ground", "▭ نايم على الأرض"], ["front", "▯ واقف — وشه لقدام"], ["side", "◫ واقف — وشه للجنب"]];
function planeName(pl) { const n = G.norm(G.nOf(pl)); return Math.abs(n[2]) > 0.9 ? "نايم" : Math.abs(n[1]) > 0.9 ? "واقف وشه لقدام" : Math.abs(n[0]) > 0.9 ? "واقف وشه للجنب" : "مايل"; }
/** drawing tools: pick the plane with one tap, and type the rectangle's size */
function drawHtml() {
  if (ui.face2d || !DRAWTOOLS_WALL.includes(ui.tool)) return "";
  const st = ui.st, vert = st ? Math.abs(G.norm(G.nOf(st.plane))[2]) < 0.5 : ui.plane === "front" || ui.plane === "side";
  let h = `<div class="dsbox dsdraw"><b>📐 بترسم على إيه؟</b><div class="dsseg dsplanes">${PLANES.map(([k, l]) => `<button class="dsb ${ui.plane === k ? "on" : ""}" data-plane="${k}">${l}</button>`).join("")}</div>
    <p class="hint">«واقف» = الشكل بيطلع رأسي (زي جنب أو ظهر بين دولابين) · «نايم» = على الأرض زي رف. ارسم من ركن الدولاب: المغناطيس بيمسك الركن.</p>`;
  if (ui.tool === "rect") h += `<div class="dsrow"><b>⬜ مستطيل بالمقاس</b><small class="hint">${st ? "✅ الركن الأول اتحدد" : "دوس الركن الأول في الرسم الأول (أو ابدأ من نقطة الأصل)"}</small></div>
    <div class="dsgrid"><label><span>العرض</span><input type="text" inputmode="decimal" data-numf id="dsRw" value="${ui.rw ?? 60}"></label><label><span>${vert ? "الارتفاع" : "الطول"}</span><input type="text" inputmode="decimal" data-numf id="dsRh" value="${ui.rh ?? 40}"></label></div>
    <div class="dsrow"><span>اتجاهه من الركن</span><span class="dsgrp"><button class="dsb ${ui.rdir[0] > 0 ? "on" : ""}" data-rdir="0">→ يمين</button><button class="dsb ${ui.rdir[0] < 0 ? "on" : ""}" data-rdir="1">← شمال</button><button class="dsb ${ui.rdir[1] > 0 ? "on" : ""}" data-rdir="2">${vert ? "↑ فوق" : "↑ لورا"}</button><button class="dsb ${ui.rdir[1] < 0 ? "on" : ""}" data-rdir="3">${vert ? "↓ تحت" : "↓ لقدام"}</button></span></div>
    <button class="dsb primary" data-ds="rectgo">⬜ ارسم بالمقاس ده</button>
    <p class="hint">أو بعد الركن الأول اكتب تحت «العرض,الطول» (مثلاً 60,72) واضغط ↵.</p>`;
  return h + `</div>`;
}
/** move / copy the selection by an exact typed distance along one axis */
function moveByHtml() {
  if (!ui.sel.size && ui.tool !== "move") return "";
  const busy = ui.tool === "move" && ui.st;
  return `<div class="dsbox dsmv"><b>↔ حرّك بمقاس</b><small class="hint">${busy ? "القطعة ماسكها — اكتب المسافة ودوس الاتجاه" : ui.sel.size ? `${ui.sel.size} مختار — اكتب المسافة ودوس الاتجاه` : "اختار القطعة الأول (أو دوس عليها بأداة التحريك)"}</small>
    <div class="dsgrid"><label><span>المسافة (سم)</span><input type="text" inputmode="decimal" data-numf id="dsMvD" value="${f1(ui.mvD)}"></label></div>
    <div class="dsgrp dsmvbtns"><button class="dsb ax0" data-mv="0,1">+X ←</button><button class="dsb ax0" data-mv="0,-1">−X →</button><button class="dsb ax1" data-mv="1,1">+Y لورا</button><button class="dsb ax1" data-mv="1,-1">−Y لقدام</button><button class="dsb ax2" data-mv="2,1">+Z فوق</button><button class="dsb ax2" data-mv="2,-1">−Z تحت</button></div>
    <p class="hint">X = العرض (أحمر) · Y = العمق (أخضر) · Z = الارتفاع (أزرق). علّم «نسخة» فوق تعمل نسخة على المسافة دي بدل ما تحرّك. وفي أداة التحريك: امسك القطعة واكتب الرقم تحت ↵ يحرّكها على المسافة دي في اتجاه صباعك.</p></div>`;
}
function rectGo() {
  const w = +el.querySelector("#dsRw").value, hh = +el.querySelector("#dsRh").value;
  if (!(w > 0) || !(hh > 0)) { setMsg("اكتب العرض والطول الأول"); return; }
  ui.rw = w; ui.rh = hh;
  if (ui.tool !== "rect") setTool("rect");
  if (!ui.st) { const pl = basePlane(null); ui.st = { plane: pl, a: [...pl.o], a2: [0, 0] }; setMsg("اترسم من نقطة الأصل — دوس الركن الأول بعد كده لو عايزه في مكان تاني"); }
  ui.st.hb = null;
  TOOL.rect.vcb({ list: [w, hh] });
  renderUI();
}
function moveSelBy(dv) {
  if (ui.tool === "move" && ui.st) { commitMove(dv); renderUI(); return; }
  const refs = selRefs(); if (!refs.length) { setMsg("اختار القطعة الأول"); return; }
  edit(() => {
    let rs = refs, made = [];
    if (ui.copy) { rs = copyRefs(refs); made = rs; ui.sel = new Set(rs); }
    for (const r of rs) xform(r, { p: (P) => G.add(P, dv) });
    ui.lastMove = { dv, copy: ui.copy, refs, made };
  });
  const ax = dv.findIndex((v) => v); setMsg(`${ui.copy ? "اتنسخت" : "اتحرّكت"} ${f1(Math.abs(dv[ax]))} سم على ${AXN[ax]}`);
  renderUI();
}
function sideHtml() {
  let h = "";
  if (ui.face2d) h += `<div class="dsbox on2d"><b>✏️ بترسم شكل القطعة 2D</b><p class="hint">ارسم خطوط وأقواس ودواير على وشها، وبعدين بـ«سحب/زق» زق الشكل لجوه: تفريغ أو قصة من الحرف أو حفر. «تدوير ركن» و«شطف ركن» على أركانها.</p><button class="dsb" data-ds="exit2d">↩ رجوع للـ3D</button></div>`;
  const refs = selRefs(), solids = refs.filter((r) => r[0] === "s").map(ent).filter(Boolean);
  h += faceHtml();
  if (curCab()) h += cabHtml();
  if (ui.tool === "tape") h += `<div class="dsbox"><b>📏 شريط القياس</b><p class="hint">دوس نقطتين: بيقيس المسافة بينهم (والفرق في العرض والطول والارتفاع) من غير ما يرسم حاجة.</p><label class="dschk"><input type="checkbox" data-ds="tapeguide" ${ui.tapeGuide ? "checked" : ""}> سيب خط مساعد مكان القياس</label></div>`;
  if (ui.tool === "paint" && M.room?.pts?.length) h += `<div class="dsbox"><b>🎨 لون دهان الحيطان</b><p class="hint">دوس على أي حيطة تتدهن باللون ده (ويظهر في التصميم والريندر). للألواح: اختار الخامة تحت ودوس على اللوح.</p>${wallSwatches(ui.wallPaint || "#e9e2d0", "wpaint")}</div>`;
  h += roomHtml();
  const pal = Object.keys(MATS).map((k) => `<button class="dsmat ${ui.mat === k ? "on" : ""}" data-mat="${k}" title="${esc(matName(k))}"><i style="background:${matColor(k)}"></i><span>${esc(matName(k))}</span></button>`).join("");
  h += edgeHtml() + vertexHtml();
  h += drawHtml() + moveByHtml();
  const PM = [["solid", "⬚ لوح"], ["face", "🟨 وش"], ["edge", "— حرف"], ["vertex", "• ركن"]];
  h += `<div class="dsbox"><div class="dsrow"><b>بتختار إيه؟</b></div><div class="dsseg">${PM.map(([k, l]) => `<button class="dsb ${(ui.pickMode || "solid") === k ? "on" : ""}" data-pmode="${k}">${l}</button>`).join("")}</div>
    <p class="hint">لوح = القطعة كلها · وش = وش واحد (إزاحة / سحب) · حرف = ضلع واحد تحرّكه أو تكتب طوله · ركن = نقطة واحدة تحرّكها أو تمسحها.</p></div>`;
  h += `<div class="dsbox"><div class="dsrow"><b>الاختيار</b><label class="dschk"><input type="checkbox" data-ds="addsel" ${ui.addSel ? "checked" : ""}> + اختيار متعدد</label></div>
    <div class="dsrow"><label class="dschk"><input type="checkbox" data-ds="copy" ${ui.copy ? "checked" : ""}> نسخة (مع التحريك واللف)</label></div>
    <div class="dsrow"><label class="dschk"><input type="checkbox" data-ds="boxsel" ${ui.boxSel ? "checked" : ""}> ⬚ اختيار بالسحب (مربع)</label></div>
    <div class="dsbtns"><button class="dsb" data-ds="selall">الكل</button><button class="dsb" data-ds="selnone">ولا حاجة</button><button class="dsb" data-ds="selmat" ${ui.sel.size ? "" : "disabled"}>نفس الخامة</button><button class="dsb" data-ds="selinv">اعكس الاختيار</button>
      <button class="dsb" data-ds="copyc" ${ui.sel.size ? "" : "disabled"}>📋 نسخ</button><button class="dsb" data-ds="paste" ${ui.clip ? "" : "disabled"}>لزق</button><button class="dsb" data-ds="pastein" ${ui.clip ? "" : "disabled"}>لزق في نفس المكان</button></div></div>`;
  if (refs.length === 1 && solids.length === 1) {
    const s = solids[0], bs = G.boardSize(s), bx = G.solidBox(s);
    h += `<div class="dsbox"><input class="dsin" data-sp="name" value="${esc(s.name)}" aria-label="اسم اللوح">
      <div class="dsrow"><span>المقاس</span><b dir="ltr">${f1(bs.w)} × ${f1(bs.h)} × ${f1(s.depth)}</b></div>
      ${G.isBoard(s) ? "" : `<p class="hint">ده مجسّم مش لوح (سمكه أكتر من 6 سم) — بيظهر في الرسم بس ومش بيدخل القص.</p><button class="dsb primary" data-ds="towall">🧱 حوّله حيطة</button>`}
      <div class="dsgrid">
        <label><span>السمك</span><input type="text" inputmode="decimal" data-numf data-sp="depth" value="${f1(s.depth)}"></label>
        <label><span>س</span><input type="text" inputmode="decimal" data-numf data-sp="x" value="${f1(bx.x0)}"></label>
        <label><span>ص</span><input type="text" inputmode="decimal" data-numf data-sp="y" value="${f1(bx.y0)}"></label>
        <label><span>ع</span><input type="text" inputmode="decimal" data-numf data-sp="z" value="${f1(bx.z0)}"></label>
        ${G.plainRect(s) ? `<label><span>الطول</span><input type="text" inputmode="decimal" data-numf data-sp="w" value="${f1(G.bbox2(s.outer)[2] - G.bbox2(s.outer)[0])}"></label><label><span>العرض</span><input type="text" inputmode="decimal" data-numf data-sp="h" value="${f1(G.bbox2(s.outer)[3] - G.bbox2(s.outer)[1])}"></label>` : ""}
      </div>
      <label class="dsf"><span>الخامة</span><select data-sp="mat">${Object.keys(MATS).map((k) => `<option value="${k}" ${s.mat === k ? "selected" : ""}>${esc(matName(k))}</option>`).join("")}</select></label>
      <label class="dsf"><span>🎨 خامة بعينها للوح ده</span>${libSelect(s.lib || "")}</label>
      <div class="dsrow"><label class="dschk"><input type="checkbox" data-sp="band" ${s.band !== false ? "checked" : ""}> شريط حرف على كل الحروف</label></div>
      <label class="dsf"><span>اتجاه الألياف</span><select data-sp="grain"><option value="">تلقائي (على الطول)</option><option value="u" ${s.grain === "u" ? "selected" : ""}>على المحور الأول</option><option value="v" ${s.grain === "v" ? "selected" : ""}>على المحور التاني</option></select></label>
      ${s.holes.length || s.pockets.length ? `<p class="hint">${s.holes.length ? `${s.holes.length} تفريغة` : ""}${s.holes.length && s.pockets.length ? " · " : ""}${s.pockets.length ? `${s.pockets.length} حفر` : ""} — بتطلع في ملفات الـCNC.</p>` : ""}
      <div class="dsbtns"><button class="dsb" data-ds="face2d">✏️ ارسم شكلها 2D</button>${s.pockets.length ? `<button class="dsb" data-ds="clrpk">شيل الحفر</button>` : ""}${s.holes.length ? `<button class="dsb" data-ds="clrholes">شيل التفريغات</button>` : ""}</div></div>`;
  } else if (refs.length === 1 && refs[0][0] === "k") {
    const k = ent(refs[0]);
    h += `<div class="dsbox"><b>${k.closed ? "شكل مقفول" : "خط مفتوح"}</b><div class="dsrow"><span>${k.closed ? "المساحة" : "الطول"}</span><b>${k.closed ? (Math.round(Math.abs(G.area(k.pts)) / 100) / 100).toLocaleString("en-US") + " م²" : f1(G.perimeter(k.pts) - (k.closed ? 0 : Math.hypot(k.pts[0][0] - k.pts.at(-1)[0], k.pts[0][1] - k.pts.at(-1)[1]))) + " سم"}</b></div>
      ${k.closed ? `<div class="dsgrid"><label><span>السمك</span><input type="text" inputmode="decimal" data-numf id="dsQuickT" value="${f1(ui.thick)}"></label></div><button class="dsb primary" data-ds="extrude">⇕ اعمله لوح بالسمك ده</button>` : ""}</div>`;
  } else if (refs.length === 1 && refs[0][0] === "w") {
    const w = ent(refs[0]);
    h += `<div class="dsbox"><input class="dsin" data-wp="name" value="${esc(w.name)}"><div class="dsrow"><span>الطول</span><b>${f1(G.pathLength(w.path, w.closed))} سم</b></div>
      <label class="dsf"><span>الخامة</span><select data-wp="mat">${Object.keys(MATS).map((k) => `<option value="${k}" ${w.mat === k ? "selected" : ""}>${esc(matName(k))}</option>`).join("")}</select></label></div>`;
  }
  if (refs.length === 1 && refs[0][0] === "p") {
    const pa = ent(refs[0]);
    if (pa) h += `<div class="dsbox"><b>خط في الفراغ (مسار)</b><div class="dsrow"><span>الطول</span><b>${f1(G.pathLength(pa.pts, pa.closed))} سم</b></div><p class="hint">استعمله مسار لـ«اتبعني» (بروفايل، كرنيشة، مقبض).</p></div>`;
  }
  if (ui.sel.size) {
    const grp = [...ui.sel].find((r) => r.startsWith("G:")), g = grp && M.groups.find((x) => "G:" + x.id === grp);
    h += `<div class="dsbox">${g ? `<input class="dsin" data-gp="${g.id}" value="${esc(g.name)}" aria-label="اسم المجموعة">` : ""}<div class="dsrow"><span>${refs.length} حاجة مختارة</span></div>
      ${moreSelHtml(solids)}
      <div class="dsbtns"><button class="dsb" data-ds="dup">⧉ نسخة</button><button class="dsb" data-ds="del">🗑 امسح</button><button class="dsb" data-ds="hide">🙈 اخفي</button><button class="dsb" data-ds="isolate">👁 لوحده</button>
      ${solids.length > 1 && !grp ? `<button class="dsb" data-ds="group">▣ اعمل مجموعة</button>` : ""}${grp ? `<button class="dsb" data-ds="ungroup">▢ فك المجموعة</button><button class="dsb" data-ds="entergrp">ادخل جواها</button>` : ""}</div>
      ${solids.length ? `<div class="dsrow dsorient"><span>وقّفه</span><span class="dsgrp"><button class="dsb" data-orient="v" title="رأسي — وشه لقدام (زي ضلفة أو ظهر)">▯ رأسي قدام</button><button class="dsb" data-orient="s" title="رأسي — وشه للجنب (زي جنب الدولاب)">◫ رأسي جنب</button><button class="dsb" data-orient="h" title="نايم (زي رف أو قاعدة)">▭ نايم</button></span></div>` : ""}
      <div class="dsrow"><span>لف 90°</span><span class="dsgrp"><button class="dsb ax0" data-rot90="0">X</button><button class="dsb ax1" data-rot90="1">Y</button><button class="dsb ax2" data-rot90="2">Z</button></span></div>
      <div class="dsrow"><span>اعكس</span><span class="dsgrp"><button class="dsb ax0" data-mirror="0">X</button><button class="dsb ax1" data-mirror="1">Y</button><button class="dsb ax2" data-mirror="2">Z</button></span></div></div>`;
  }
  h += `<div class="dsbox"><b>الخامة (للدهان واللي جاي)</b><div class="dsmats">${pal}</div></div>`;
  h += `<details class="dsbox"><summary>⬆ استورد شكل</summary><p class="hint">ملف DXF (من أوتوكاد أو أي برنامج CNC): الخطوط والأقواس والدواير بتبقى أشكال مقفولة تسحبها ألواح على طول.</p><label class="dsb filelike">📂 اختار ملف DXF<input type="file" id="dsDxf" accept=".dxf,application/dxf,image/vnd.dxf" hidden></label></details>`;
  h += `<details class="dsbox"><summary>➕ ضيف بسرعة</summary>
    <div class="dsgrid"><label><span>الطول</span><input type="text" inputmode="decimal" data-numf id="qbW" value="60"></label><label><span>العرض</span><input type="text" inputmode="decimal" data-numf id="qbH" value="40"></label><label><span>السمك</span><input type="text" inputmode="decimal" data-numf id="qbT" value="${f1(ui.thick)}"></label></div>
    <div class="dsbtns"><button class="dsb" data-qb="h">▭ لوح نايم</button><button class="dsb" data-qb="v">▯ لوح واقف</button><button class="dsb" data-qb="s">◫ جنب</button></div>
    <div class="dsgrid"><label><span>عرض الصندوق</span><input type="text" inputmode="decimal" data-numf id="qxW" value="60"></label><label><span>ارتفاع</span><input type="text" inputmode="decimal" data-numf id="qxH" value="72"></label><label><span>عمق</span><input type="text" inputmode="decimal" data-numf id="qxD" value="58"></label></div>
    <div class="dsbtns"><label class="dschk"><input type="checkbox" id="qxB" checked> بظهر</label><button class="dsb" data-ds="qbox">▣ صندوق (هيكل)</button></div></details>`;
  if (!curCab()) h += cabHtml();
  const hid = M.solids.filter((s) => s.hidden).length + M.sweeps.filter((w) => w.hidden).length;
  const list = [...M.groups.map((g) => ({ ref: "G:" + g.id, n: `▣ ${g.name}`, sub: M.solids.filter((s) => s.group === g.id).length + " لوح" })), ...M.solids.filter((s) => !s.group).map((s) => ({ ref: "s:" + s.id, n: `${s.hidden ? "🙈 " : ""}${s.name}`, sub: `${f1(G.boardSize(s).w)}×${f1(G.boardSize(s).h)}×${f1(s.depth)}` })), ...M.sweeps.map((w) => ({ ref: "w:" + w.id, n: `➰ ${w.name}`, sub: f1(G.pathLength(w.path, w.closed)) + " سم" }))];
  h += `<details class="dsbox" ${ui.outline ? "open" : ""} data-ds-outline><summary>📋 كل اللي في الرسمة (${M.solids.length} لوح${M.sweeps.length ? ` · ${M.sweeps.length} بروفايل` : ""})</summary>
    <div class="dsol">${list.map((x) => `<button class="dsolr ${ui.sel.has(x.ref) ? "on" : ""}" data-pick="${x.ref}"><span>${esc(x.n)}</span><small dir="ltr">${esc(x.sub)}</small></button>`).join("") || `<p class="hint">لسه مفيش — ارسم مستطيل واسحبه، أو ضيف بسرعة من فوق.</p>`}</div>
    ${hid ? `<button class="dsb" data-ds="unhide">👁 اظهر المخفي (${hid})</button>` : ""}</details>`;
  h += `<div class="dsbox"><div class="dsbtns"><button class="dsb" data-ds="mylib">⭐ احفظ في مكتبتي</button><button class="dsb" data-ds="clrguides" ${M.guides.length ? "" : "disabled"}>امسح الخطوط المساعدة</button></div></div>`;
  return h;
}
const HELP = `<b>إزاي ترسم</b><ol>
  <li>اختار «مستطيل» ودوس ركن وبعدين الركن التاني (أو اكتب 60,40 في خانة المقاس).</li>
  <li>اختار «سحب / زق» ودوس على المستطيل واسحب لفوق — أو اكتب 1.8 — بقى لوح.</li>
  <li>ارسم على وش أي لوح: الشكل بيلزق على الوش. زقه لجوه لآخر اللوح = تفريغة أو قصة من الحرف، لنص اللوح = حفر (CNC).</li>
  <li>«تحريك» مع «نسخة» وبعدين اكتب x5 = خمس نسخ ورا بعض. دوس على ركن لوح بالتحريك يغيّر شكله.</li>
  <li>الأسهم (أو X Y Z تحت) بتقفل الاتجاه على محور. صباعين: زحّك وكبّر. في «اختيار» اسحب في الفاضي تلف.</li>
  <li>«✏️ ارسم شكلها 2D» من جنب اللوح بيبصلك على وشه على طول عشان ترسم شكل القطعة بالظبط.</li>
  <li>اختار لوح أو مجموعة: الأسهم الملوّنة بتحرّك، المربعات الصغيرة بتمط وتقصّر، والأرقام دوس عليها واكتب المقاس الجديد.</li>
  <li>من الجنب: مصفوفة (نسخ منتظمة أو دائرية)، رص ووزّع، قص لوح بلوح تاني (تعشيق/تفريغ)، دمج، نسخ ولزق، واستيراد شكل DXF.</li>
  <li>«شبكة» تحت بتخلّي الرسم يمشي على خطوات (1 سم، 5 سم…). على الآيباد بيظهر مكبّر فوق صباعك وانت بترسم.</li>
  <li>لما تخلص دوس «✓ خلصت»: كل لوح بيدخل القص والملصقات وملفات الـCNC بشكله الحقيقي.</li></ol>`;

function onClick(e) {
  const b = e.target.closest("button, [data-pick]");
  if (!b) return;
  const d = b.dataset;
  if (d.tgh != null) { toolGroupToggle(+d.tgh); return; }
  if (d.cab) { cabAction(d.cab, b); return; }
  if (d.tool) { setTool(d.tool); return; }
  if (d.pmode) { ui.pickMode = d.pmode; ui.face = null; ui.edge = null; ui.vertex = null; setTool("select"); rebuild(); renderUI(); setMsg({ solid: "دوس على لوح", face: "دوس على وش من اللوح", edge: "دوس قريب من حرف", vertex: "دوس قريب من ركن" }[ui.pickMode]); return; }
  if (d.view) { setView(d.view); renderUI(); return; }
  if (d.axis != null) { lockAxis(+d.axis); return; }
  if (d.room) { roomAction(d.room, b); return; }
  if (d.wpaint) { ui.wallPaint = d.wpaint; renderUI(); return; }
  if (d.wcol || d.wallall) {
    const e = roomEnt(ui.rsel); if (!e || ui.rsel.kind !== "W") return;
    const c = d.wcol || e.color || "#e9e2d0";
    edit(() => { for (const w of d.wallall ? M.room.walls : [e]) Object.assign(w, { finish: "paint", color: c }); });
    ui.wallPaint = c; rebuild(); renderUI(); return;
  }
  if (d.mat) { ui.mat = d.mat; renderUI(); if (ui.sel.size) edit(() => selRefs().forEach((r) => { const x = ent(r); if (x && (r[0] === "s" || r[0] === "w")) x.mat = d.mat; })); return; }
  if (d.rot90 != null) { rotSel90(+d.rot90); return; }
  if (d.orient) { orientSel(d.orient); return; }
  if (d.plane) { ui.plane = d.plane; if (ui.face2d) { ui.face2d = null; applyControls(); } if (ui.st && DRAWTOOLS_WALL.includes(ui.tool)) ui.st = null; renderUI(); setMsg(d.plane === "auto" ? "الرسم على الوش اللي تحت صباعك" : `الرسم ${PLANES.find((x) => x[0] === d.plane)[1].replace(/^\S+ /, "")}`); return; }
  if (d.rdir != null) { const i = +d.rdir; if (i < 2) ui.rdir[0] = i === 0 ? 1 : -1; else { ui.rdir[1] = i === 2 ? 1 : -1; ui.rdirSet = true; } renderUI(); return; }
  if (d.mv) { const [ax, sg] = d.mv.split(",").map(Number); const dist = +el.querySelector("#dsMvD").value; if (!(dist > 0)) { setMsg("اكتب المسافة الأول"); return; } ui.mvD = dist; moveSelBy(G.mul(AX[ax], sg * dist)); return; }
  if (d.align != null) { alignSel(+el.querySelector("#dsAlAx").value, d.align); return; }
  if (d.mirror != null) { mirrorSel(+d.mirror); return; }
  if (d.pick) { ui.sel = new Set([d.pick]); ui.outline = true; ui.cabFocus = null; if (d.pick.startsWith("G:") && cabOf(d.pick.slice(2))) ui.cab = d.pick.slice(2); else if (ui.cab) ui.cab = null; rebuild(); renderUI(); return; }
  if (d.qb) { addBoard(+el.querySelector("#qbW").value || 60, +el.querySelector("#qbH").value || 40, +el.querySelector("#qbT").value || 1.8, d.qb); return; }
  if (d.vk) {
    const i = el.querySelector("#dsVcb");
    if (d.vk === "enter") { vcbEnter(); return; }
    if (document.activeElement !== i) { i.value = ""; }
    i.dataset.typed = "1"; i.value += d.vk; i.focus(); return;
  }
  switch (d.ds) {
    case "rectgo": rectGo(); break;
    case "done": if (!M.solids.length && !M.sweeps.length && M.sketches.some((k) => k.closed)) flatSheet(); else finishDone(); break;
    case "flatmake": el.querySelector(".dsleave")?.remove(); flatMake(); finishDone(); break;
    case "flatdone": el.querySelector(".dsleave")?.remove(); finishDone(); break;
    case "cancel": if (!changed()) { ctx.onCancel?.(); close(); } else leaveSheet(); break;
    case "leavesave": el.querySelector(".dsleave")?.remove(); finishDone(); break;
    case "leavedrop": el.querySelector(".dsleave")?.remove(); ctx.onCancel?.(); close(); break;
    case "leaveback": el.querySelector(".dsleave")?.remove(); break;
    case "undo": undo(); break;
    case "redo": redo(); break;
    case "zoomx": zoomExtents(); break;
    case "home": if (ui.face2d) { ui.face2d = null; ui.plane = "auto"; applyControls(); } ui.section = null; if (ui.ortho) { ui.ortho = false; swapCam(); } setView("iso"); rebuild(); renderUI(); break;
    case "ortho": ui.ortho = !ui.ortho; swapCam(); renderUI(); break;
    case "xray": ui.xray = !ui.xray; rebuild(); renderUI(); break;
    case "section": ui.section = ui.section == null ? 2 : ui.section === 2 ? 0 : ui.section === 0 ? 1 : null; if (ui.section != null) { const b0 = modelBox(); const c = b0.getCenter(new THREE.Vector3()); ui.secPos = [c.x, -c.z, c.y][ui.section]; const r = el.querySelector("#dsSecPos"); r.value = ui.secPos; } rebuild(); renderUI(); setMsg(ui.section == null ? "" : `قطاع على المحور ${AXN[ui.section]} — حرّك المؤشر`); break;
    case "panel": ui.panel = !ui.panel; renderUI(); setTimeout(resize, 30); break;
    case "help": setMsg(""); showHelp(); break;
    case "esc": cancelStep(); break;
    case "dup": dupSel(); break;
    case "del": delSel(); break;
    case "hide": hideSel(); break;
    case "isolate": isolateSel(); break;
    case "unhide": unhideAll(); break;
    case "group": groupSel(); break;
    case "ungroup": ungroupSel(); break;
    case "entergrp": { const g = [...ui.sel].find((r) => r.startsWith("G:")); if (g) { ui.editGroup = g.slice(2); ui.sel.clear(); rebuild(); renderUI(); setMsg("جوه المجموعة: كل لوح لوحده"); } break; }
    case "face2d": { const s = selSolids()[0]; if (s) lookAtFace(s, { kind: "top" }); break; }
    case "exit2d": exit2d(); break;
    case "clrpk": edit(() => selSolids().forEach((s) => (s.pockets = []))); break;
    case "clrholes": edit(() => selSolids().forEach((s) => (s.holes = []))); break;
    case "clrguides": edit(() => { M.guides = []; }); break;
    case "extrude": { const k = ent(selRefs()[0]); const t = +el.querySelector("#dsQuickT").value || ui.thick; ui.thick = t; ui.st = { kind: "sketch", k, plane: k.plane, n: G.nOf(k.plane), a: G.toWorld(k.plane, k.pts[0]) }; commitPush(t); break; }
    case "qbox": addBox(+el.querySelector("#qxW").value || 60, +el.querySelector("#qxH").value || 72, +el.querySelector("#qxD").value || 58, ui.thick, el.querySelector("#qxB").checked); break;
    case "mylib": { if (!M.solids.length && !M.sweeps.length) { setMsg("مفيش حاجة مرسومة لسه"); break; } const nm = prompt("اسم التصميم في المكتبة:", mname || "تصميم"); if (nm === null) break; mname = nm.trim() || mname; ctx.saveLib?.(G.clone(M), mname); setMsg("اتحفظ في مكتبتي ⭐ — هتلاقيه في المكتبة تحت «مكتبتي»"); break; }
    case "cablib": { const c = curCab(); if (!c) break; const nm = prompt("اسم العلبة في المكتبة:", c.name); if (nm === null) break; cabSyncPos(c); const sub = Cab.newCab(); Object.assign(sub, G.clone(c), { pos: [0, 0, 0], rot: 0, name: nm.trim() || c.name }); const m = newModel(); m.cabs = [sub]; m.groups = [{ id: sub.id, name: sub.name }]; m.solids = Cab.cabSolids(sub); ctx.saveLib?.(m, sub.name); setMsg("اتحفظت العلبة في مكتبتي ⭐"); break; }
    case "selall": selectAll(); break;
    case "facex": faceAction("x"); break;
    case "edgex": case "edgelen": case "edgesplit": case "edgemove": case "vertexx": case "vertexset": case "vertexmove": case "vertexdel": subAction(d.ds); break;
    case "faceoff": faceAction("off"); break;
    case "facepush": faceAction("push"); break;
    case "face2dsel": faceAction("2d"); break;
    case "snapmenu": snapMenu(); break;
    case "cfdone": confirmAct("done"); break;
    case "cfclose": confirmAct("close"); break;
    case "cfback": confirmAct("back"); break;
    case "towall": solidToWall(selSolids()[0]); break;
    case "selnone": ui.sel.clear(); ui.editGroup = null; rebuild(); renderUI(); break;
    case "selinv": invertSel(); break;
    case "selmat": selSameMat(); break;
    case "copyc": copySel(); renderUI(); break;
    case "paste": pasteClip(false); break;
    case "pastein": pasteClip(true); break;
    case "arr": readArr(); arrayLinear(); break;
    case "parr": readArr(); arrayPolar(); break;
    case "subtract": subtractSel(); break;
    case "union": unionSel(); break;
  }
}
// closing with ✕: our own sheet (a web view inside the iPad app shows no confirm() box, so the old one never closed)
let startJSON = "";
const changed = () => JSON.stringify(M) !== startJSON;
function leaveSheet() {
  el.querySelector(".dsleave")?.remove();
  const p = document.createElement("div"); p.className = "dsleave";
  p.innerHTML = `<div class="dsleavebox"><b>تقفل ورشة الرسم؟</b><p>فيه تعديلات لسه ما اتحفظتش.</p>
    <div class="dsbtns"><button class="dsb primary" data-ds="leavesave">💾 احفظ واقفل</button><button class="dsb danger" data-ds="leavedrop">اقفل من غير حفظ</button><button class="dsb" data-ds="leaveback">ارجع للرسم</button></div></div>`;
  el.appendChild(p);
}
function finishDone() {
  const m = G.clone(M), room = m.room || null; delete m.room;
  ctx.onDone?.(m, mname, { room, roomChanged: JSON.stringify(room) !== startRoom });
  close();
}
function showHelp() {
  let p = el.querySelector(".dshelp");
  if (p) { p.remove(); return; }
  p = document.createElement("div"); p.className = "dshelp"; p.innerHTML = HELP + `<button class="dsb" data-ds="help">تمام</button>`;
  el.querySelector("#dsView").appendChild(p);
}
function onChange(e) {
  const t = e.target, d = t.dataset;
  if (t.id === "dsToolQ") { toolSearch(t.value); return; }
  if (t.id === "dsStep") { ui.step = +t.value || 0; return; }
  if (t.id === "dsRw") { ui.rw = +t.value || ui.rw; return; } if (t.id === "dsRh") { ui.rh = +t.value || ui.rh; return; } if (t.id === "dsMvD") { ui.mvD = +t.value || ui.mvD; return; }
  if (d.rp || d.rset) { roomChange(t); return; }
  if (d.cf) { cabChange(t); return; }
  if (t.hasAttribute?.("data-wpaintin")) { ui.wallPaint = t.value; renderUI(); return; }
  if (t.hasAttribute?.("data-wcolin")) { const e = roomEnt(ui.rsel); if (e && ui.rsel.kind === "W") { edit(() => Object.assign(e, { finish: "paint", color: t.value })); ui.wallPaint = t.value; rebuild(); renderUI(); } return; }
  if (t.dataset.snap) { const k = t.dataset.snap; ui.snap[k] = k === "strength" ? +t.value : t.checked; renderUI(); return; }
  if (t.id === "dsDxf" && t.files?.[0]) { importDxf(t.files[0]); t.value = ""; return; }
  if (t.dataset.ds === "boxsel") { ui.boxSel = t.checked; setMsg(ui.boxSel ? "اسحب في الفاضي: من الشمال لليمين = اللي جوه المربع كله · من اليمين للشمال = أي حاجة بيلمسها" : ""); return; }
  if (t.id === "dsStep") return;
  if (t.id === "dsPlane") { ui.plane = t.value; if (ui.face2d) { ui.face2d = null; applyControls(); } renderUI(); return; }
  if (t.dataset.ds === "tapeguide") { ui.tapeGuide = t.checked; return; }
  if (t.dataset.ds === "addsel") { ui.addSel = t.checked; return; }
  if (t.dataset.ds === "copy") { ui.copy = t.checked; return; }
  if (t.id === "dsName") { mname = t.value.trim() || mname; return; }
  if (d.gp) { edit(() => { const g = M.groups.find((x) => x.id === d.gp); if (g) g.name = t.value.trim() || g.name; }); return; }
  if (d.wp) { const w = ent(selRefs()[0]); if (w) edit(() => { w[d.wp] = t.value; }); return; }
  if (d.sp) {
    // a focused cabinet piece first (a whole cabinet is selected then — its first board would be the left side)
    const fp = ui.cabFocus?.kind === "piece" ? M.solids.find((x) => x.id === ui.cabFocus.sid) : null;
    const s = (fp && selected("s:" + fp.id) ? fp : null) || selSolids()[0] || fp;
    if (!s) return;
    const v = t.type === "checkbox" ? t.checked : t.value;
    edit(() => {
      const num = +String(v).replace(/[^\d.\-]/g, "");
      if (d.sp === "name") s.name = String(v).trim() || s.name;
      else if (d.sp === "mat") s.mat = v;
      else if (d.sp === "lib") { if (v) s.lib = v; else delete s.lib; }
      else if (d.sp === "band") s.band = !!v;
      else if (d.sp === "grain") { if (v) s.grain = v; else delete s.grain; }
      else if (d.sp === "depth" && num > 0.05) s.depth = num;
      else if (["x", "y", "z"].includes(d.sp) && String(v).trim() !== "" && isFinite(num)) { const b = G.solidBox(s), i = "xyz".indexOf(d.sp), cur = [b.x0, b.y0, b.z0][i], dv = [0, 0, 0]; dv[i] = num - cur; s.plane.o = G.add(s.plane.o, dv); }
      else if ((d.sp === "w" || d.sp === "h") && num > 0.1) { const b = G.bbox2(s.outer); s.outer = d.sp === "w" ? G.rect(b[0], b[1], b[0] + num, b[3]) : G.rect(b[0], b[1], b[2], b[1] + num); }
    });
  }
}
function onInput(e) {
  if (e.target.id === "dsToolQ") { toolSearch(e.target.value); return; }
  if (e.target.id === "dsSecPos") { ui.secPos = +e.target.value; rebuild(); }
}


// ================================================================== more: handles, box select, inline sizes, array, align, booleans, clipboard, DXF, loupe
/** round a free point to the grid on its plane */
function stepIn(P, pl) {
  if (!(ui.step > 0) || !pl) return P;
  const q = G.toPlane(pl, P), k = ui.step;
  return G.toWorld(pl, [Math.round(q[0] / k) * k, Math.round(q[1] / k) * k], q[2]);
}
function selBox(refs = selRefs()) {
  const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  const add = (P) => { b.x0 = Math.min(b.x0, P[0]); b.y0 = Math.min(b.y0, P[1]); b.z0 = Math.min(b.z0, P[2]); b.x1 = Math.max(b.x1, P[0]); b.y1 = Math.max(b.y1, P[1]); b.z1 = Math.max(b.z1, P[2]); };
  for (const r of refs) {
    const e = ent(r); if (!e) continue;
    if (r[0] === "s") { const x = G.solidBox(e); add([x.x0, x.y0, x.z0]); add([x.x1, x.y1, x.z1]); }
    else if (r[0] === "k") e.pts.forEach((p) => add(G.toWorld(e.plane, p)));
    else if (r[0] === "w") for (const f of G.sweepFaces(e.profile, e.path, e.closed)) f.outer.forEach(add);
    else if (r[0] === "p") e.pts.forEach(add);
  }
  return isFinite(b.x0) ? b : null;
}
const BL = (b) => [b.x0, b.y0, b.z0], BH = (b) => [b.x1, b.y1, b.z1];

// ---- handles on the selection: arrows move it along an axis, squares stretch it, labels type its size
let hdrag = null, rtDrop = null; // rtDrop: takes the ↻ handle's window listeners off (a cancelled touch)
function placeHandles() {
  const H = el?.querySelector("#dsHandles");
  if (!H) return;
  if (hdrag) return; // keep the element under the finger while it drags (a touch is tied to it)
  const refs = ui.tool === "select" && !ui.st ? selRefs() : [];
  const b = refs.length ? selBox(refs) : null;
  if (!b) { if (H.innerHTML) H.innerHTML = ""; return; }
  const r = ren.domElement.getBoundingClientRect(), vr = el.querySelector("#dsView").getBoundingClientRect();
  const S = (P) => { const q = T3(P).project(cam); return [((q.x + 1) / 2) * r.width + (r.left - vr.left), ((1 - q.y) / 2) * r.height + (r.top - vr.top), q.z]; };
  const L = BL(b), Hh = BH(b), c = L.map((v, i) => (v + Hh[i]) / 2), size = Hh.map((v, i) => v - L[i]);
  const span = Math.max(...size, 10);
  let h = "";
  const at = (P, cls, data, txt, title) => { const q = S(P); if (q[2] > 1 || q[2] < -1) return ""; return `<button class="dsh ${cls}" ${data} style="left:${q[0].toFixed(0)}px;top:${q[1].toFixed(0)}px" title="${title}">${txt}</button>`; };
  // move arrows: a fixed distance on screen from the centre, along each axis as it looks on screen
  const sc = S(c), atPx = (x, y, cls, data, txt, title) => `<button class="dsh ${cls}" ${data} style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px" title="${title}">${txt}</button>`;
  if (sc[2] <= 1 && sc[2] >= -1) {
    let red = [1, 0];
    for (const a of [0, 1, 2]) {
      const P = [...c]; P[a] += span * 0.5;
      const q = S(P); let dx = q[0] - sc[0], dy = q[1] - sc[1]; const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      if (a === 0) red = [dx, dy];
      h += atPx(sc[0] + dx * 62, sc[1] + dy * 62, `mv ax${a}`, `data-hmv="${a}"`, ["⇆", "⤢", "⇅"][a], `اسحب تحرّك على المحور ${AXN[a]}`);
    }
    h += atPx(sc[0] - red[0] * 62, sc[1] - red[1] * 62, "rt", `data-hrt="2"`, "↻", "لف 90° حوالين الأزرق");
  }
  // stretch squares on the six faces
  for (const a of [0, 1, 2]) for (const sd of [0, 1]) {
    if (size[a] < 0.05) continue;
    const P = [...c]; P[a] = sd ? Hh[a] : L[a];
    h += at(P, `rs ax${a}`, `data-hrs="${a},${sd}"`, "", "اسحب تمط / تقصّر");
  }
  // the three sizes, tap to type
  const dimAt = [[c[0], L[1], L[2]], [Hh[0], c[1], L[2]], [Hh[0], L[1], c[2]]];
  for (const a of [0, 1, 2]) if (size[a] >= 0.05) h += at(dimAt[a], `dm ax${a} ${ui.dimEdit === a ? "on" : ""}`, `data-hdm="${a}"`, f1(size[a]), "دوس واكتب المقاس");
  H.innerHTML = h;
}
function handleDown(e) {
  const b = e.target.closest(".dsh");
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const d = b.dataset;
  if (d.hdm != null) { ui.dimEdit = +d.hdm; const i = el.querySelector("#dsVcb"); i.value = ""; el.querySelector("#dsVcbL").textContent = ["العرض (X)", "العمق (Y)", "الارتفاع (Z)"][ui.dimEdit]; i.focus(); need(); return; }
  if (d.hrt != null) {
    // turn on lift, and only for a clean single tap (a pinch that starts here must not turn the board)
    const pid = e.pointerId, x0 = e.clientX, y0 = e.clientY; let spoiled = false;
    rtDrop?.();
    const drop = () => { window.removeEventListener("pointerup", lift, true); window.removeEventListener("pointerdown", other, true); window.removeEventListener("pointercancel", cancel, true); if (rtDrop === drop) rtDrop = null; };
    const other = (ev) => { if (ev.pointerId !== pid) spoiled = true; };
    const cancel = (ev) => { if (ev.pointerId === pid) drop(); };
    const lift = (ev) => { if (ev.pointerId !== pid) return; drop(); if (!spoiled && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) rotSel90(+d.hrt); };
    window.addEventListener("pointerdown", other, true); window.addEventListener("pointerup", lift, true); window.addEventListener("pointercancel", cancel, true);
    rtDrop = drop;
    return;
  }
  const box = selBox(); if (!box) return;
  const ax = d.hmv != null ? +d.hmv : +d.hrs.split(",")[0], side = d.hrs != null ? +d.hrs.split(",")[1] : null;
  const L = BL(box), Hh = BH(box), c = L.map((v, i) => (v + Hh[i]) / 2);
  const base = [...c]; if (side != null) base[ax] = side ? Hh[ax] : L[ax];
  const c0 = closestOnLine(base, AX[ax], e.clientX, e.clientY);
  if (!c0) return;
  try { b.setPointerCapture(e.pointerId); } catch { /* */ }
  b.classList.add("drag");
  hdrag = { kind: d.hmv != null ? "move" : "size", ax, side, base, t0: c0.t, snap: JSON.stringify(M), refs: selRefs(), box, d: 0, labelAt: base, pid: e.pointerId };
  // a second finger = the camera (pinch): the handle lets go and the board goes back
  const second = (ev) => { if (!hdrag || ev.pointerId === hdrag.pid) return; hdrag.d = 0; up({ pointerId: hdrag.pid }); };
  window.addEventListener("pointerdown", second, true);
  const mv = (ev) => {
    if (ev.pointerId !== hdrag?.pid) return;
    const q = closestOnLine(hdrag.base, AX[hdrag.ax], ev.clientX, ev.clientY);
    if (!q) return;
    let dd = q.t - hdrag.t0;
    const k = ui.step > 0 ? ui.step : 0.5;
    dd = Math.round(dd / k) * k;
    if (dd === hdrag.d) return;
    hdrag.d = dd;
    M = JSON.parse(hdrag.snap);
    applyHandle(hdrag, dd);
    hdrag.label = hdrag.kind === "move" ? `${dd > 0 ? "+" : ""}${f1(dd)}` : f1(Math.max(0.1, (hdrag.box[["x1", "y1", "z1"][hdrag.ax]] - hdrag.box[["x0", "y0", "z0"][hdrag.ax]]) + (hdrag.side ? dd : -dd)));
    hdrag.labelAt = G.add(hdrag.base, G.mul(AX[hdrag.ax], dd));
    live = [{ p: hdrag.labelAt, t: hdrag.label, cls: "len" }];
    rebuild();
  };
  const up = (ev) => {
    if (!hdrag || (ev && ev.pointerId !== hdrag.pid)) return;
    window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); window.removeEventListener("pointerdown", second, true);
    const st = hdrag; hdrag = null; live = [];
    if (st.d) { hist.u.push(st.snap); hist.r = []; } else M = JSON.parse(st.snap);
    // a tap (no drag) on a stretch square of one board picks that face
    if (!st.d && st.kind === "size" && st.refs.length === 1 && st.refs[0][0] === "s") {
      const sld = ent(st.refs[0]), want = G.mul(AX[st.ax], st.side ? 1 : -1);
      const f = sld && G.solidFaces(sld).filter((q) => q.kind === "top" || q.kind === "bottom" || q.kind === "side").sort((p2, q2) => G.dot(G.norm(q2.n), want) - G.dot(G.norm(p2.n), want))[0];
      if (f && G.dot(G.norm(f.n), want) > 0.9) { ui.face = { sid: sld.id, kind: f.kind, ref: f.ref }; setMsg("اتختار الوش ده لوحده — من الجنب: إزاحة، سحب/زق، أو ارسم عليه"); }
    }
    rebuild(); renderUI();
  };
  window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
}
function applyHandle(st, d) {
  if (st.kind === "move") { const v = G.mul(AX[st.ax], d); for (const r of st.refs) xform(r, { p: (P) => G.add(P, v) }); return; }
  const lo = st.box[["x0", "y0", "z0"][st.ax]], hi = st.box[["x1", "y1", "z1"][st.ax]], len0 = hi - lo;
  const len1 = Math.max(0.1, len0 + (st.side ? d : -d));
  const fixed = [0, 0, 0]; fixed[st.ax] = st.side ? lo : hi;
  stretchRefs(st.refs, st.ax, fixed[st.ax], len0 > 0.01 ? len1 / len0 : 1);
}
/** stretch the selection along one world axis about a fixed coordinate */
function stretchRefs(refs, ax, at, k) {
  const kk = [1, 1, 1]; kk[ax] = k;
  const c = [0, 0, 0]; c[ax] = at;
  // several boards (a box): a board lying across the stretch keeps its thickness and only moves — flush with the end it
  // touched, else with its middle scaled (one board on its own: its thickness is what the handle changes)
  const multi = refs.filter((r) => r[0] === "s").length > 1, all = multi ? selBox(refs) : null;
  const lo = all ? [all.x0, all.y0, all.z0][ax] : 0, hi = all ? [all.x1, all.y1, all.z1][ax] : 0;
  const S = (v) => at + (v - at) * k;
  for (const r of refs) {
    const e = ent(r); if (!e) continue;
    if (r[0] === "s") {
      const n = G.nOf(e.plane);
      if (multi && Math.abs(n[ax]) > 0.999) {
        const b = G.solidBox(e), b0 = [b.x0, b.y0, b.z0][ax], b1 = [b.x1, b.y1, b.z1][ax];
        const nb0 = Math.abs(b1 - hi) < 0.05 ? S(b1) - (b1 - b0) : Math.abs(b0 - lo) < 0.05 ? S(b0) : S((b0 + b1) / 2) - (b1 - b0) / 2;
        const dv = [0, 0, 0]; dv[ax] = G.r2(nb0 - b0);
        e.plane = { ...e.plane, o: G.add(e.plane.o, dv) };
        continue;
      }
      if (Math.abs(n[ax]) > 0.999 || Math.abs(e.plane.u[ax]) > 0.999 || Math.abs(e.plane.v[ax]) > 0.999) scaleSolid(e, c, kk);
      else { // a slanted board: scale it uniformly in its plane along the projected axis
        const pc = [...c]; for (let i = 0; i < 3; i++) if (i !== ax) pc[i] = e.plane.o[i];
        scaleSolid(e, pc, kk);
      }
    } else if (r[0] === "k") { const pl = e.plane, fu = Math.hypot(...pl.u.map((x, i) => x * kk[i])), fv = Math.hypot(...pl.v.map((x, i) => x * kk[i])); e.pts = e.pts.map(([a, b]) => [a * fu, b * fv]); if (e.center) e.center = [e.center[0] * fu, e.center[1] * fv]; e.plane = { ...pl, o: pl.o.map((v, i) => c[i] + (v - c[i]) * kk[i] + (i === ax ? 0 : 0)) }; e.plane.o = pl.o.map((v, i) => (i === ax ? c[i] + (v - c[i]) * k : v)); }
    else xform(r, { p: (P) => P.map((v, i) => (i === ax ? at + (v - at) * k : v)) });
  }
}
/** a typed size for the selection along an axis (its low side stays put) */
function setSize(ax, v) {
  const b = selBox(); if (!b) return;
  const lo = BL(b)[ax], len0 = BH(b)[ax] - lo;
  if (len0 < 0.01) return;
  edit(() => stretchRefs(selRefs(), ax, lo, v / len0));
}

// ---- box select
function boxDraw(a, b) {
  const x = el.querySelector("#dsBoxSel"), vr = el.querySelector("#dsView").getBoundingClientRect();
  x.hidden = false;
  x.classList.toggle("cross", b[0] < a[0]);
  Object.assign(x.style, { left: Math.min(a[0], b[0]) - vr.left + "px", top: Math.min(a[1], b[1]) - vr.top + "px", width: Math.abs(b[0] - a[0]) + "px", height: Math.abs(b[1] - a[1]) + "px" });
}
function boxFinish(a, b) {
  el.querySelector("#dsBoxSel").hidden = true;
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 6) { if (!ui.addSel) { ui.sel.clear(); rebuild(); renderUI(); } return; }
  const cross = b[0] < a[0];
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  const inn = (P) => { const q = scr(P); return q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1 && q[2] < 1; };
  const test = (pts) => (cross ? pts.some(inn) : pts.length && pts.every(inn));
  if (!ui.addSel) ui.sel.clear();
  const groups = new Map();
  for (const sld of M.solids) {
    if (sld.hidden) continue;
    const bx = G.solidBox(sld), corners = [];
    for (const X of [bx.x0, bx.x1]) for (const Y of [bx.y0, bx.y1]) for (const Z of [bx.z0, bx.z1]) corners.push([X, Y, Z]);
    if (!test(corners)) continue;
    if (sld.group && !ui.editGroup) groups.set(sld.group, true); else ui.sel.add("s:" + sld.id);
  }
  for (const g of groups.keys()) ui.sel.add("G:" + g);
  for (const k of M.sketches) if (test(k.pts.map((p) => G.toWorld(k.plane, p)))) ui.sel.add("k:" + k.id);
  for (const pa of M.paths) if (test(pa.pts)) ui.sel.add("p:" + pa.id);
  for (const w of M.sweeps) if (!w.hidden && test(w.path)) ui.sel.add("w:" + w.id);
  rebuild(); renderUI();
  setMsg(`اتختار ${ui.sel.size}`);
}
function selectAll() {
  ui.sel.clear();
  const gs = new Set();
  for (const sld of M.solids) { if (sld.hidden) continue; if (sld.group) gs.add(sld.group); else ui.sel.add("s:" + sld.id); }
  gs.forEach((g) => ui.sel.add("G:" + g));
  M.sketches.forEach((k) => ui.sel.add("k:" + k.id)); M.paths.forEach((x) => ui.sel.add("p:" + x.id)); M.sweeps.forEach((w) => { if (!w.hidden) ui.sel.add("w:" + w.id); });
  rebuild(); renderUI();
}
function invertSel() {
  const had = new Set(selRefs());
  ui.sel.clear();
  for (const sld of M.solids) if (!sld.hidden && !had.has("s:" + sld.id)) ui.sel.add("s:" + sld.id);
  for (const k of M.sketches) if (!had.has("k:" + k.id)) ui.sel.add("k:" + k.id);
  rebuild(); renderUI();
}
function selSameMat() {
  const mats = new Set(selSolids().map((x) => x.mat));
  if (!mats.size) return;
  ui.sel.clear();
  for (const sld of M.solids) if (!sld.hidden && mats.has(sld.mat)) ui.sel.add("s:" + sld.id);
  rebuild(); renderUI(); setMsg(`اتختار ${ui.sel.size} لوح من نفس الخامة`);
}

// ---- clipboard
function copySel() {
  const refs = selRefs(); if (!refs.length) return;
  ui.clip = { items: refs.map((r) => ({ k: r[0], e: G.clone(ent(r)) })).filter((x) => x.e), groups: G.clone(M.groups), cabs: G.clone(M.cabs || []) };
  ui.clip.cabN = Object.fromEntries((M.cabs || []).map((c) => [c.id, M.solids.filter((s) => s.cab === c.id).length]));
  setMsg(`اتنسخ ${ui.clip.items.length} — «لزق» تحطهم`);
}
function pasteClip(inPlace) {
  const cb = ui.clip; if (!cb?.items.length) return;
  edit(() => {
    const key = { s: "solids", k: "sketches", p: "paths", w: "sweeps", g: "guides", d: "dims", t: "texts" };
    const gmap = new Map(), made = [];
    const dv = inPlace ? [0, 0, 0] : [15, 15, 0];
    for (const it of cb.items) {
      const c = G.clone(it.e); c.id = uid();
      if (c.group) { if (!gmap.has(c.group)) { const g0 = cb.groups.find((g) => g.id === c.group); const ng = { id: uid(), name: (g0?.name || "مجموعة") + " (لزق)" }; M.groups.push(ng); gmap.set(c.group, ng.id); } c.group = gmap.get(c.group); }
      M[key[it.k]].push(c);
      const ref = it.k + ":" + c.id;
      xform(ref, { p: (P) => G.add(P, dv) });
      made.push(ref);
    }
    const copies = made.filter((r) => r[0] === "s").map(ent).filter(Boolean);
    cabCopies(copies, cb.cabs || [], (id) => cb.cabN?.[id] ?? Infinity);
    ui.sel = new Set(made.map((r) => { const e = ent(r); return r[0] === "s" && e.group ? "G:" + e.group : r; }));
  });
}

// ---- arrays, align, distribute
function moreSelHtml(solids) {
  const a = ui.arr;
  const axSel = (id, v) => `<select id="${id}" class="dssel sm">${["X", "Y", "Z"].map((n, i) => `<option value="${i}" ${v === i ? "selected" : ""}>${n} ${["الأحمر", "الأخضر", "الأزرق"][i]}</option>`).join("")}</select>`;
  let h = `<details class="dssub"><summary>▦ مصفوفة (نسخ منتظمة)</summary>
    <div class="dsgrid"><label><span>العدد</span><input type="text" inputmode="decimal" data-numf id="arN" value="${a.n}"></label><label><span>المسافة بين كل نسخة</span><input type="text" inputmode="decimal" data-numf id="arD" value="${a.d}"></label><label><span>الاتجاه</span>${axSel("arAx", a.ax)}</label></div>
    <div class="dsbtns"><button class="dsb" data-ds="arr">▦ اعمل المصفوفة</button></div>
    <div class="dsgrid"><label><span>عدد دائري</span><input type="text" inputmode="decimal" data-numf id="prN" value="${a.pn}"></label><label><span>الزاوية الكلية°</span><input type="text" inputmode="decimal" data-numf id="prA" value="${a.pa}"></label><label><span>المركز س,ص</span><input type="text" id="prC" value="${a.px},${a.py}"></label></div>
    <div class="dsbtns"><button class="dsb" data-ds="parr">◌ مصفوفة دائرية</button></div></details>`;
  if (selRefs().length > 1) h += `<details class="dssub"><summary>⇹ رصّ ووزّع</summary><div class="dsrow"><span>على</span>${axSel("dsAlAx", ui.alignAx)}</div>
    <div class="dsbtns"><button class="dsb" data-align="min">⇤ أول</button><button class="dsb" data-align="mid">⇹ النص</button><button class="dsb" data-align="max">⇥ آخر</button><button class="dsb" data-align="dist">↔ وزّع بالتساوي</button><button class="dsb" data-align="stack">▤ ورا بعض لازقين</button></div></details>`;
  if (solids.length > 1) h += `<details class="dssub"><summary>✂ قص ودمج الألواح</summary><p class="hint">أول لوح اخترته هو اللي بيتقص. «اقطع» = شكل الباقي بيتشال منه (لو عدّى سمكه كله: قصة أو تفريغة، لو من وش واحد: حفر). «ادمج» = ألواح في نفس المستوى ونفس السمك بتبقى لوح واحد.</p>
    <div class="dsbtns"><button class="dsb" data-ds="subtract">✂ اقطع الأول بالباقي</button><button class="dsb" data-ds="union">⊕ ادمج</button></div></details>`;
  return h;
}
function readArr() {
  const g = (id) => el.querySelector("#" + id)?.value;
  const a = ui.arr;
  a.n = Math.max(1, Math.min(200, Math.round(+g("arN") || a.n))); a.d = +g("arD") || a.d; a.ax = +g("arAx") || 0;
  a.pn = Math.max(2, Math.min(200, Math.round(+g("prN") || a.pn))); a.pa = +g("prA") || 360;
  const pc = String(g("prC") || "").split(/[,،]/).map(Number); if (pc.length === 2 && pc.every(isFinite)) { a.px = pc[0]; a.py = pc[1]; }
}
function arrayLinear() {
  const a = ui.arr, refs = selRefs(); if (!refs.length) return;
  edit(() => { for (let i = 1; i < a.n; i++) for (const c of copyRefs(refs)) xform(c, { p: (P) => G.add(P, G.mul(AX[a.ax], a.d * i)) }); });
  setMsg(`اتعمل ${a.n - 1} نسخة كل ${f1(a.d)} سم`);
}
function arrayPolar() {
  const a = ui.arr, refs = selRefs(); if (!refs.length) return;
  const full = Math.abs(Math.abs(a.pa) - 360) < 0.01, step = ((a.pa / (full ? a.pn : Math.max(1, a.pn - 1))) * Math.PI) / 180;
  const c = [a.px, a.py, selCenter()[2]];
  edit(() => { for (let i = 1; i < a.pn; i++) for (const cp of copyRefs(refs)) xform(cp, { p: (P) => G.rotP(P, c, [0, 0, 1], step * i) }); });
  setMsg(`اتعمل ${a.pn - 1} نسخة حوالين (${f1(a.px)}, ${f1(a.py)})`);
}
function alignSel(ax, how) {
  ui.alignAx = ax;
  const units = []; // each selected item (a group moves as one)
  for (const r of ui.sel) { const refs = r.startsWith("G:") ? M.solids.filter((x) => x.group === r.slice(2)).map((x) => "s:" + x.id) : [r]; const b = selBox(refs); if (b) units.push({ refs, b }); }
  if (units.length < 2) return;
  const lo = (b) => BL(b)[ax], hi = (b) => BH(b)[ax], mid = (b) => (lo(b) + hi(b)) / 2;
  const all = units.map((u) => u.b), L = Math.min(...all.map(lo)), H = Math.max(...all.map(hi)), Mi = (L + H) / 2;
  edit(() => {
    if (how === "dist" || how === "stack") {
      const sorted = [...units].sort((p, q) => lo(p.b) - lo(q.b));
      const total = sorted.reduce((s, u) => s + hi(u.b) - lo(u.b), 0);
      const gap = how === "stack" ? 0 : (H - L - total) / Math.max(1, sorted.length - 1);
      let at = lo(sorted[0].b);
      for (const u of sorted) { const dv = [0, 0, 0]; dv[ax] = at - lo(u.b); for (const r of u.refs) xform(r, { p: (P) => G.add(P, dv) }); at += hi(u.b) - lo(u.b) + gap; }
      return;
    }
    for (const u of units) {
      const dv = [0, 0, 0];
      dv[ax] = how === "min" ? L - lo(u.b) : how === "max" ? H - hi(u.b) : Mi - mid(u.b);
      for (const r of u.refs) xform(r, { p: (P) => G.add(P, dv) });
    }
  });
}

// ---- booleans between boards
/** the outline (in s's plane) and the depth range (along s's normal) that solid c covers */
function footprintOn(s, c) {
  const pts = [], ws = [];
  for (const f of G.solidFaces(c)) for (const P of f.outer) { const q = G.toPlane(s.plane, P); pts.push([q[0], q[1]]); ws.push(q[2]); }
  const nS = G.nOf(s.plane), nC = G.nOf(c.plane);
  let loop;
  if (Math.abs(Math.abs(G.dot(nS, nC)) - 1) < 1e-4) loop = c.outer.map((p) => G.toPlane(s.plane, G.toWorld(c.plane, p)).slice(0, 2));
  else loop = hull(pts);
  return { loop: G.ccw(G.clean(loop)), w0: Math.min(...ws), w1: Math.max(...ws) };
}
function hull(P) {
  const p = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (up.length >= 2 && cr(up.at(-2), up.at(-1), q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function subtractSel() {
  const ss = selSolids(); if (ss.length < 2) return;
  const [target, ...cutters] = ss;
  let done = 0, skipped = 0;
  edit(() => {
    for (const c of cutters) {
      const fp = footprintOn(target, c), D = target.depth;
      if (fp.loop.length < 3 || fp.w1 <= 0.01 || fp.w0 >= D - 0.01) { skipped++; continue; }
      if (fp.w0 <= 0.01 && fp.w1 >= D - 0.01) { cutThrough(target, fp.loop); done++; }
      else if (fp.w1 >= D - 0.01) { target.pockets.push({ loop: fp.loop, depth: G.r2(D - fp.w0), face: "top" }); done++; }
      else if (fp.w0 <= 0.01) { target.pockets.push({ loop: fp.loop, depth: G.r2(fp.w1), face: "bottom" }); done++; }
      else skipped++;
    }
  });
  setMsg(done ? `اتقص «${target.name}» بـ ${done}${skipped ? ` · ${skipped} مالمسوش` : ""}` : "الألواح التانية مش داخلة في اللوح الأول");
}
function unionSel() {
  const ss = selSolids(); if (ss.length < 2) return;
  const [a, ...rest] = ss;
  let merged = 0;
  edit(() => {
    for (const b of rest) {
      if (!G.samePlane(a.plane, b.plane, 0.05) || G.dot(G.nOf(a.plane), G.nOf(b.plane)) < 0.99 || Math.abs(a.depth - b.depth) > 0.05) continue;
      const lb = b.outer.map((p) => G.toPlane(a.plane, G.toWorld(b.plane, p)).slice(0, 2));
      const r = G.boolean(G.offset(a.outer, 0.02), G.offset(lb, 0.02), "union");
      if (r.outers.length !== 1) continue;
      a.outer = G.ccw(G.clean(G.offset(r.outers[0], -0.02).map(([x, y]) => [G.r2(x), G.r2(y)])));
      a.holes = [...a.holes, ...r.holes, ...b.holes.map((h) => h.map((p) => G.toPlane(a.plane, G.toWorld(b.plane, p)).slice(0, 2)))];
      a.pockets = [...a.pockets, ...b.pockets.map((pk) => ({ ...pk, loop: pk.loop.map((p) => G.toPlane(a.plane, G.toWorld(b.plane, p)).slice(0, 2)) }))];
      M.solids = M.solids.filter((x) => x !== b);
      merged++;
    }
    ui.sel = new Set(["s:" + a.id]);
  });
  setMsg(merged ? `اتدمج ${merged + 1} ألواح في لوح واحد` : "الدمج محتاج ألواح في نفس المستوى ونفس السمك ولازقة في بعض");
}

// ---- DXF import (LINE, LWPOLYLINE with bulges, POLYLINE/VERTEX, CIRCLE, ARC) → closed drawings on the ground
async function importDxf(file) {
  const txt = await file.text();
  const lines = txt.split(/\r?\n/);
  const pairs = []; for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([lines[i].trim(), lines[i + 1].trim()]);
  let units = 4; // mm unless the header says otherwise
  for (let i = 0; i < pairs.length; i++) if (pairs[i][1] === "$INSUNITS" && pairs[i + 1]) units = +pairs[i + 1][1] || 4;
  const k = units === 5 ? 1 : units === 6 ? 100 : units === 1 ? 2.54 : 0.1; // → cm
  const segs = [], loops = [];
  let i = pairs.findIndex((p) => p[0] === "2" && p[1] === "ENTITIES");
  if (i < 0) i = 0;
  const ent0 = () => { const e = { type: pairs[i][1], g: [] }; i++; while (i < pairs.length && pairs[i][0] !== "0") { e.g.push(pairs[i]); i++; } return e; };
  const val = (e, c) => { const x = e.g.find((p) => p[0] === c); return x ? +x[1] : 0; };
  const bulgeArc = (a, b, bu) => { if (!bu) return [a, b]; const ch = Math.hypot(b[0] - a[0], b[1] - a[1]), h = -(bu * ch) / 2; /* + bulge = counter-clockwise = bulges right of a→b */ return G.arc3(a, b, G.bulgePoint(a, b, h)); };
  while (i < pairs.length) {
    if (pairs[i][0] !== "0") { i++; continue; }
    const t = pairs[i][1];
    if (t === "EOF" || t === "ENDSEC") break;
    if (t === "LINE") { const e = ent0(); segs.push([[val(e, "10") * k, val(e, "20") * k], [val(e, "11") * k, val(e, "21") * k]]); }
    else if (t === "CIRCLE") { const e = ent0(); loops.push(G.circle([val(e, "10") * k, val(e, "20") * k], val(e, "40") * k, 48)); }
    else if (t === "ARC") {
      const e = ent0(), c = [val(e, "10") * k, val(e, "20") * k], r = val(e, "40") * k; let a0 = (val(e, "50") * Math.PI) / 180, a1 = (val(e, "51") * Math.PI) / 180;
      if (a1 <= a0) a1 += Math.PI * 2;
      const n = Math.max(4, Math.ceil(((a1 - a0) / (Math.PI / 2)) * 8)), pts = [];
      for (let j = 0; j <= n; j++) { const a = a0 + ((a1 - a0) * j) / n; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
      for (let j = 0; j + 1 < pts.length; j++) segs.push([pts[j], pts[j + 1]]);
    } else if (t === "LWPOLYLINE") {
      const e = ent0(), closed = (val(e, "70") & 1) === 1, vs = [];
      for (const [c, v] of e.g) { if (c === "10") vs.push({ p: [+v * k, 0], b: 0 }); else if (c === "20" && vs.length) vs.at(-1).p[1] = +v * k; else if (c === "42" && vs.length) vs.at(-1).b = +v; }
      const pts = [];
      for (let j = 0; j < vs.length - (closed ? 0 : 1); j++) { const A = vs[j], B = vs[(j + 1) % vs.length]; const arc = bulgeArc(A.p, B.p, A.b); pts.push(...arc.slice(0, -1)); }
      if (!closed && vs.length) pts.push(vs.at(-1).p);
      if (closed && pts.length >= 3) loops.push(pts); else for (let j = 0; j + 1 < pts.length; j++) segs.push([pts[j], pts[j + 1]]);
    } else if (t === "POLYLINE") {
      const e = ent0(), closed = (val(e, "70") & 1) === 1, vs = [];
      while (i < pairs.length && pairs[i][1] === "VERTEX") { const v = ent0(); vs.push({ p: [val(v, "10") * k, val(v, "20") * k], b: val(v, "42") }); }
      if (pairs[i]?.[1] === "SEQEND") ent0();
      const pts = [];
      for (let j = 0; j < vs.length - (closed ? 0 : 1); j++) { const A = vs[j], B = vs[(j + 1) % vs.length]; pts.push(...bulgeArc(A.p, B.p, A.b).slice(0, -1)); }
      if (!closed && vs.length) pts.push(vs.at(-1).p);
      if (closed && pts.length >= 3) loops.push(pts); else for (let j = 0; j + 1 < pts.length; j++) segs.push([pts[j], pts[j + 1]]);
    } else i++;
  }
  // chain loose segments into loops
  const eq = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.02;
  const open = [];
  const pool = segs.map((s2) => s2.map((p) => [...p]));
  while (pool.length) {
    let chain = pool.shift();
    let grew = true;
    while (grew) {
      grew = false;
      for (let j = 0; j < pool.length; j++) {
        const [a, b] = pool[j];
        if (eq(chain.at(-1), a)) { chain.push(b); } else if (eq(chain.at(-1), b)) { chain.push(a); } else if (eq(chain[0], b)) { chain.unshift(a); } else if (eq(chain[0], a)) { chain.unshift(b); } else continue;
        pool.splice(j, 1); grew = true; break;
      }
    }
    if (chain.length >= 4 && eq(chain[0], chain.at(-1))) { chain.pop(); loops.push(chain); } else open.push(chain);
  }
  if (!loops.length && !open.length) { setMsg("الملف مفيهوش خطوط أو أشكال نقدر نقراها"); return; }
  // put it next to what is already drawn, its lower-left corner on the origin
  const all = [...loops.flat(), ...open.flat()];
  const bx = G.bbox2(all), b0 = selBox(M.solids.map((x) => "s:" + x.id)) || { x1: -10 };
  const ox = (isFinite(b0.x1) ? b0.x1 + 20 : 0) - bx[0], oy = -bx[1];
  edit(() => {
    // loops inside other loops become their holes
    const L = loops.map((l) => G.ccw(G.clean(l.map(([x, y]) => [x + ox, y + oy])))).filter((l) => l.length >= 3).sort((p, q) => Math.abs(G.area(q)) - Math.abs(G.area(p)));
    const used = new Set();
    L.forEach((outer, a) => {
      if (used.has(a)) return;
      const holes = [];
      L.forEach((inner, b) => { if (b > a && !used.has(b) && inner.every((p) => G.inside(p, outer))) { holes.push(G.cw(inner)); used.add(b); } });
      M.sketches.push({ id: uid(), plane: G.clone(G.GROUND), pts: outer.map((p) => p.map(G.r2)), closed: true, holes, smooth: outer.length > 24 });
    });
    for (const o of open) if (o.length >= 2) M.sketches.push({ id: uid(), plane: G.clone(G.GROUND), pts: o.map(([x, y]) => [G.r2(x + ox), G.r2(y + oy)]), closed: false });
  });
  zoomExtents();
  setMsg(`اتقرا ${loops.length} شكل مقفول${open.length ? ` و${open.length} خط مفتوح` : ""} — اختار «سحب / زق» واعمله لوح`);
}

// ---- the loupe: what is under the finger, bigger, above it
let loupe = null;
function drawLoupe() {
  const c = el.querySelector("#dsLoupe");
  if (!loupe) { if (!c.hidden) c.hidden = true; return; }
  const cv = ren.domElement, r = cv.getBoundingClientRect(), vr = el.querySelector("#dsView").getBoundingClientRect();
  const sx = cv.width / r.width, R = 45; // css px around the finger
  const g = c.getContext("2d");
  c.hidden = false;
  const lx = loupe[0] - vr.left, ly = loupe[1] - vr.top;
  c.style.left = Math.max(0, Math.min(vr.width - 124, lx - 60)) + "px";
  c.style.top = Math.max(0, ly - 190) + "px";
  g.save(); g.clearRect(0, 0, 240, 240);
  g.beginPath(); g.arc(120, 120, 118, 0, Math.PI * 2); g.clip();
  g.fillStyle = "#fff"; g.fillRect(0, 0, 240, 240);
  try { g.drawImage(cv, (loupe[0] - r.left - R) * sx, (loupe[1] - r.top - R) * sx, 2 * R * sx, 2 * R * sx, 0, 0, 240, 240); } catch { /* not ready */ }
  g.strokeStyle = "#2f6fdf"; g.lineWidth = 2; g.beginPath(); g.moveTo(120, 96); g.lineTo(120, 144); g.moveTo(96, 120); g.lineTo(144, 120); g.stroke();
  g.restore();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 3; g.beginPath(); g.arc(120, 120, 117, 0, Math.PI * 2); g.stroke();
}


// ---- one face of a board on its own
function faceOf(fs) {
  if (!fs) return null;
  const s = M.solids.find((x) => x.id === fs.sid);
  if (!s) return null;
  const f = G.solidFaces(s).find((q) => q.kind === fs.kind && JSON.stringify(q.ref) === JSON.stringify(fs.ref));
  return f ? { s, f } : null;
}
function edgeHtml() {
  const e = edgeOf(ui.edge); if (!e) return "";
  const len = G.dist(e.a, e.b), vert = ui.edge.level === "vert";
  return `<div class="dsbox on2d"><div class="dsrow"><b>— حرف ${vert ? "رأسي (السمك)" : ui.edge.level === "top" ? "على الوش العلوي" : "على الوش السفلي"}</b><button class="dsb" data-ds="edgex">✕</button></div>
    <div class="dsrow"><span>الطول</span><b dir="ltr">${f1(len)}</b></div>
    ${vert ? `<p class="hint">ده حرف السمك — طوله هو سمك اللوح (${f1(e.s.depth)}). حرّكه بأداة التحريك يتحرّك الركن كله.</p>` : `<div class="dsgrid"><label><span>طول جديد (الطرف التاني يتحرّك)</span><input type="text" inputmode="decimal" data-numf id="edgeLen" value="${f1(len)}"></label></div>
    <div class="dsbtns"><button class="dsb" data-ds="edgelen">↔ طبّق الطول</button><button class="dsb" data-ds="edgesplit">✚ ضيف ركن في النص</button><button class="dsb" data-ds="edgemove">✥ حرّك الحرف</button></div>`}
    <p class="hint">أداة التحريك وأنت ماسك الحرف بتزحلقه في مستوى اللوح (الركنين بتوعه مع بعض).</p></div>`;
}
function vertexHtml() {
  const v = vertexOf(ui.vertex); if (!v) return "";
  const q = G.toPlane(v.s.plane, v.p);
  return `<div class="dsbox on2d"><div class="dsrow"><b>• ركن ${ui.vertex.vi + 1}${ui.vertex.loopIdx >= 0 ? ` (فتحة ${ui.vertex.loopIdx + 1})` : ""}</b><button class="dsb" data-ds="vertexx">✕</button></div>
    <div class="dsgrid"><label><span>س (في مستوى اللوح)</span><input type="text" inputmode="decimal" data-numf id="vxX" value="${f1(q[0])}"></label><label><span>ص</span><input type="text" inputmode="decimal" data-numf id="vxY" value="${f1(q[1])}"></label></div>
    <div class="dsbtns"><button class="dsb" data-ds="vertexset">✓ طبّق المكان</button><button class="dsb" data-ds="vertexmove">✥ حرّكه</button><button class="dsb danger" data-ds="vertexdel" ${v.L.length <= 3 ? "disabled" : ""}>⌫ امسح الركن</button></div>
    <p class="hint">الركن بيتحرّك في مستوى اللوح (فوق وتحت مع بعض عشان اللوح يفضل بسمك واحد).</p></div>`;
}
function subAction(kind) {
  if (kind === "edgex") { ui.edge = null; rebuild(); renderUI(); return; }
  if (kind === "vertexx") { ui.vertex = null; rebuild(); renderUI(); return; }
  const e = edgeOf(ui.edge), v = vertexOf(ui.vertex);
  if (kind === "edgemove" && e) { setTool("move"); setMsg("دوس على نقطة وبعدين على مكانها الجديد — الحرف هيتزحلق"); return; }
  if (kind === "vertexmove" && v) { setTool("move"); setMsg("دوس على نقطة وبعدين على مكانها الجديد — الركن هيتحرّك"); return; }
  if (kind === "edgelen" && e && ui.edge.level !== "vert") {
    const nl = +String(el.querySelector("#edgeLen").value).replace(/[^\d.]/g, "");
    if (!(nl > 0.1)) return;
    edit(() => { const L = e.L, a = L[ui.edge.i], b = L[ui.edge.j]; const dx = b[0] - a[0], dy = b[1] - a[1], ll = Math.hypot(dx, dy) || 1; L[ui.edge.j] = [G.r2(a[0] + (dx / ll) * nl), G.r2(a[1] + (dy / ll) * nl)]; });
    return;
  }
  if (kind === "edgesplit" && e && ui.edge.level !== "vert") {
    edit(() => { const L = e.L, a = L[ui.edge.i], b = L[ui.edge.j]; L.splice(ui.edge.i + 1, 0, [G.r2((a[0] + b[0]) / 2), G.r2((a[1] + b[1]) / 2)]); });
    ui.vertex = { sid: e.s.id, loopIdx: ui.edge.loopIdx, vi: ui.edge.i + 1, level: ui.edge.level }; ui.edge = null; ui.pickMode = "vertex"; rebuild(); renderUI(); setMsg("اتضاف ركن في نص الحرف وهو مختار — حرّكه بأداة التحريك");
    return;
  }
  if (kind === "vertexset" && v) {
    const x = +String(el.querySelector("#vxX").value).replace(/[^\d.\-]/g, ""), y = +String(el.querySelector("#vxY").value).replace(/[^\d.\-]/g, "");
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    edit(() => { v.L[ui.vertex.vi] = [G.r2(x), G.r2(y)]; if (ui.vertex.loopIdx < 0) v.s.outer = G.ccw(v.s.outer); });
    return;
  }
  if (kind === "vertexdel" && v && v.L.length > 3) { edit(() => { v.L.splice(ui.vertex.vi, 1); }); ui.vertex = null; rebuild(); renderUI(); return; }
}
function faceHtml() {
  const fs = faceOf(ui.face);
  if (!fs) return "";
  const pl = G.facePlane(fs.s, fs.f), loop = fs.f.outer.map((P) => G.toPlane(pl, P).slice(0, 2)), b = G.bbox2(loop);
  const KN = { top: "الوش اللي فوق", bottom: "الوش اللي تحت", side: "حرف / جنب", pfloor: "قاع حفرة", pwall: "جنب حفرة" };
  return `<div class="dsbox on2d"><div class="dsrow"><b>🟨 ${KN[fs.f.kind] || "وش"}</b><button class="dsb" data-ds="facex">✕</button></div>
    <div class="dsrow"><span>المقاس</span><b dir="ltr">${f1(b[2] - b[0])} × ${f1(b[3] - b[1])}</b><span>المساحة</span><b>${(Math.round(Math.abs(G.area(loop)) / 100) / 100).toLocaleString("en-US")} م²</b></div>
    <div class="dsgrid"><label><span>إزاحة (+ لبره)</span><input type="text" inputmode="decimal" data-numf id="fcOff" value="-2"></label><label><span>سحب / زق</span><input type="text" inputmode="decimal" data-numf id="fcPush" value="1"></label></div>
    <div class="dsbtns"><button class="dsb" data-ds="faceoff">⧈ اعمل إزاحة للوش ده</button><button class="dsb" data-ds="facepush">⇕ اسحب / زق الوش</button><button class="dsb" data-ds="face2dsel">✏️ ارسم عليه 2D</button></div>
    <p class="hint">الإزاحة بتعمل شكل جوه الوش (أو حواليه) — بعدها «سحب / زق» تحفر بيه أو تطلّع منه. دوس تاني على وش تاني في نفس اللوح تختاره.</p></div>`;
}
function faceAction(kind) {
  const fs = faceOf(ui.face); if (!fs) return;
  if (kind === "x") { ui.face = null; rebuild(); renderUI(); return; }
  if (kind === "2d") { lookAtFace(fs.s, fs.f); return; }
  if (kind === "off") {
    const d = +String(el.querySelector("#fcOff").value).replace(/[^\d.\-]/g, "");
    if (!d) return;
    const pl = G.facePlane(fs.s, fs.f), loop = G.ccw(fs.f.outer.map((P) => G.toPlane(pl, P).slice(0, 2)));
    edit(() => addSketch({ plane: pl, pts: G.offset(loop, d), closed: true }));
    setMsg("اتعمل شكل الإزاحة على الوش — اختار «سحب / زق» ودوس عليه تحفر أو تطلّع");
    return;
  }
  if (kind === "push") {
    const d = +String(el.querySelector("#fcPush").value).replace(/[^\d.\-]/g, "");
    if (!d) return;
    edit(() => { if (!pushFace(fs.s, fs.f, d)) setMsg("مش هينفع بالمسافة دي"); });
    ui.face = null; rebuild(); renderUI();
  }
}

// ---- the snap (magnet) menu
function snapMenu() {
  let p = el.querySelector(".dssnap");
  if (p) { p.remove(); return; }
  p = document.createElement("div"); p.className = "dssnap";
  const sn = ui.snap, ck = (k, l, c) => `<label class="dschk"><input type="checkbox" data-snap="${k}" ${sn[k] ? "checked" : ""}><i style="background:${c}"></i> ${l}</label>`;
  p.innerHTML = `<div class="dsrow"><b>🧲 المغناطيس (Snap)</b><label class="dschk"><input type="checkbox" data-snap="on" ${sn.on ? "checked" : ""}> شغّال</label></div>
    ${ck("end", "أطراف الخطوط والأركان", "#2f9e44")}${ck("mid", "منتصف الخطوط", "#22a6b3")}${ck("center", "مراكز الدواير", "#9b59b6")}${ck("int", "تقاطع الخطوط والدواير", "#e8590c")}${ck("edge", "على الحروف", "#e0413a")}${ck("face", "على الوشوش", "#2f6fdf")}
    ${ck("axis", "اتجاه المحاور (أحمر · أخضر · أزرق)", "#888")}${ck("par", "موازي / عمودي على اللي مرسوم", "#d63aa0")}${ck("align", "على استقامة نقطة لمستها قبل كده", "#b05bd6")}${ck("angle", "زوايا كل 15°", "#8a6d1f")}
    <label class="dsf"><span>قوة الجذب</span><select data-snap="strength"><option value="0.8" ${sn.strength < 1 ? "selected" : ""}>خفيف</option><option value="1.3" ${sn.strength >= 1 && sn.strength < 1.8 ? "selected" : ""}>عادي</option><option value="2" ${sn.strength >= 1.8 ? "selected" : ""}>قوي (للصوابع)</option></select></label>
    <p class="hint">المس ركن أو منتصف أي خط الأول، وبعدين اتحرك: هيظهر خط بنفسجي لما تبقى على استقامته. الشبكة تحت بتخلي النقط الحرة تمشي بالسم.</p>`;
  el.querySelector("#dsView").appendChild(p);
}

// ================================================================== walls, doors, windows, MEP points (the project's room)
// Plan coordinates are the app's room (x → right, z → towards the viewer); in the studio z_plan = −y, on the floor (z = 0).
const P3 = (p, h = 0) => [p[0], -p[1], h];
const P2 = (P) => [P[0], -P[1]];
const FLOOR = () => ({ ...G.GROUND, o: [0, 0, 0] });
const ROOMTOOLS = ["wall", "door", "window", "mep"];
const wallEdgeMat = new THREE.LineBasicMaterial({ color: 0x6f6a5f, transparent: true });
wallEdgeMat.userData.shared = true;
function roomSegs() { return M?.room?.pts?.length >= 2 ? Room.segments(M.room) : []; }
const segById = (id) => roomSegs().find((s) => s.id === id);
function roomEnt(rs) {
  const r = M.room; if (!r || !rs) return null;
  const list = rs.kind === "W" ? r.walls : rs.kind === "O" ? r.openings : r.points;
  return (list || []).find((x) => x.id === rs.id) || null;
}
function delRoomRef(ref) {
  const r = M.room; if (!r) return;
  const k = ref[0], id = ref.slice(2);
  if (k === "W") {
    const i = r.walls.findIndex((w) => w.id === id); if (i < 0) return;
    Room.removeWall(r, i);
    r.points = (r.points || []).filter((p) => p.wall !== id);
    if (!r.pts || r.pts.length < 2) M.room = null;
  } else if (k === "O") r.openings = (r.openings || []).filter((o) => o.id !== id);
  else if (k === "E") r.points = (r.points || []).filter((p) => p.id !== id);
  if (ui.rsel?.ref === ref) ui.rsel = null;
}
/** a plan polygon between two heights → faces */
function prism(poly2, z0, z1) {
  const B = poly2.map((p) => P3(p, z0)), H = z1 - z0;
  if (Math.abs(G.area(poly2)) < 0.01) return [];
  const faces = [{ n: [0, 0, 1], outer: B.map((P) => G.add(P, [0, 0, H])) }, { n: [0, 0, -1], outer: B }];
  const c = G.mul(B.reduce((a, P) => G.add(a, P), [0, 0, 0]), 1 / B.length);
  for (let i = 0; i < B.length; i++) {
    const a = B[i], b = B[(i + 1) % B.length];
    if (G.dist(a, b) < 1e-3) continue;
    let n = G.norm(G.cross(G.sub(b, a), [0, 0, 1]));
    if (G.dot(n, G.sub(G.lerp(a, b, 0.5), c)) < 0) n = G.mul(n, -1);
    faces.push({ n, outer: [a, b, G.add(b, [0, 0, H]), G.add(a, [0, 0, H])] });
  }
  return faces;
}
function wallFaces(room) {
  const out = [];
  for (const g of Room.wallGeom(room)) {
    const faces = [];
    for (const sp of Room.wallSpans(g.seg, room.openings || [])) if (sp.b - sp.a > 0.05 && sp.z1 - sp.z0 > 0.05) faces.push(...prism(Room.piecePoly(g, sp.a, sp.b), sp.z0, sp.z1));
    out.push({ seg: g.seg, faces });
  }
  return out;
}
const onWall = (sg, x, z, off = 0) => P3([sg.A[0] + sg.d[0] * x + sg.n[0] * off, sg.A[1] + sg.d[1] * x + sg.n[1] * off], z);
function buildRoom() {
  const room = M.room;
  if (!room?.pts?.length || !ui.showWalls) return;
  const clip = clipPlanes();
  for (const { seg: sg, faces } of wallFaces(room)) {
    if (!faces.length) continue;
    const ref = "W:" + sg.id, on = ui.rsel?.ref === ref;
    const { geo } = triFaces(faces);
    const wm = room.walls?.find((x) => x.id === sg.id), painted = wm?.color && wm.finish !== "photo";
    const mat = new THREE.MeshStandardMaterial({ color: on ? 0xc9d8f3 : painted ? wm.color : 0xebe7de, roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: ui.xray ? 0.3 : 1,
      emissive: new THREE.Color(on ? 0x2f6fdf : painted ? wm.color : 0x5a5650), emissiveIntensity: on ? 0.15 : painted ? 0.25 : 0.55, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, clippingPlanes: clip });
    const mesh = new THREE.Mesh(geo, mat);
    const eg = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), on ? selEdgeMat : wallEdgeMat.clone());
    mesh.userData = { ref, wall: sg.id, A: sg.A, n: sg.n, edges: eg };
    roomG.add(mesh, eg);
  }
  for (const o of room.openings || []) {
    const sg = segById(o.wall); if (!sg) continue;
    const ref = "O:" + o.id, on = ui.rsel?.ref === ref;
    const a = Math.max(0, o.at), b = Math.min(sg.L, o.at + o.w); if (b - a < 1) continue;
    const z0 = +o.sill || 0, z1 = Math.min(sg.h, z0 + o.h);
    const rect = [onWall(sg, a, z0, 0.4), onWall(sg, b, z0, 0.4), onWall(sg, b, z1, 0.4), onWall(sg, a, z1, 0.4)];
    const col = o.kind === "door" ? 0x8a6a3c : 0x2f86c4;
    const { geo } = triFaces([{ n: G.norm([sg.n[0], -sg.n[1], 0]), outer: rect }]);
    const pane = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: o.kind === "door" ? 0xd9c49c : 0x9fd0f0, transparent: true, opacity: on ? 0.75 : 0.45, side: THREE.DoubleSide, depthWrite: false }));
    pane.userData = { ref, open: o.id, wall: sg.id };
    roomG.add(pane, fatLine([...rect, rect[0]], on ? 0x2f6fdf : col, on ? 3.5 : 2.5, false, { order: 6 }));
    if (o.kind === "door") {
      const r = b - a, arc = [onWall(sg, a, 0.3, 0)];
      for (let i = 0; i <= 14; i++) { const t = (i / 14) * (Math.PI / 2); arc.push(onWall(sg, a + Math.cos(t) * r, 0.3, Math.sin(t) * r)); }
      arc.push(onWall(sg, a, 0.3, 0));
      roomG.add(fatLine(arc, col, 1.6, false, { order: 6, opacity: 0.85 }));
    }
  }
  for (const pt of room.points || []) {
    const w = Room.pointWorld(room, pt); if (!w) continue;
    const k = Room.MEP_KINDS[pt.kind] || Room.MEP_KINDS.socket, col = Room.MEP_SYS[k[1]][1], on = ui.rsel?.ref === "E:" + pt.id;
    const m = new THREE.Mesh(new THREE.SphereGeometry(on ? 4.2 : 3.2, 14, 10), new THREE.MeshBasicMaterial({ color: on ? 0x2f6fdf : col }));
    m.position.copy(T3(P3([w.x + w.n[0] * 1.5, w.z + w.n[1] * 1.5], pt.z)));
    m.userData = { ref: "E:" + pt.id };
    roomG.add(m);
  }
  wallFade();
}
function roomLabels(list) {
  const room = M?.room; if (!room?.pts?.length || !ui.showWalls) return;
  for (const pt of room.points || []) {
    const w = Room.pointWorld(room, pt); if (!w) continue;
    const k = Room.MEP_KINDS[pt.kind] || Room.MEP_KINDS.socket;
    list.push({ p: P3([w.x + w.n[0] * 2, w.z + w.n[1] * 2], pt.z + 5), t: k[3], cls: "mep", ref: "E:" + pt.id, bg: Room.MEP_SYS[k[1]][1] });
  }
  if (ROOMTOOLS.includes(ui.tool) || ui.rsel) for (const sg of roomSegs()) {
    const m = [(sg.A[0] + sg.B[0]) / 2 + sg.n[0] * 12, (sg.A[1] + sg.B[1]) / 2 + sg.n[1] * 12];
    list.push({ p: P3(m, 1), t: f1(sg.L), cls: "dim", ref: "W:" + sg.id });
  }
}
/** walls between the camera and the room turn see-through (a cut-away doll's house) */
function wallFade() {
  if (!roomG || !cam) return;
  const C = P2(W3(cam.position)), top = cam.position.y > 0 && Math.abs(cam.getWorldDirection(new THREE.Vector3()).y) > 0.92;
  for (const o of roomG.children) {
    const u = o.userData; if (!u?.wall || !u.n || !o.isMesh || u.open) continue;
    const outside = !top && (C[0] - u.A[0]) * u.n[0] + (C[1] - u.A[1]) * u.n[1] < -1;
    const op = ui.xray ? 0.3 : outside ? 0.16 : 1;
    o.material.opacity = op; o.material.depthWrite = op > 0.5;
    if (u.edges?.material && u.edges.material !== selEdgeMat) { u.edges.material.opacity = outside ? 0.35 : 1; }
  }
}
// ---- the wall tool: click corners on the floor
function wallInfer(xy, st) {
  const inf = infer(...xy, st ? { anchor: st.last, plane: FLOOR(), axes: [0, 1] } : { plane: FLOOR() });
  inf.p = [inf.p[0], inf.p[1], 0];
  return inf;
}
const near2d = (a, b, r = 1) => Math.hypot(a[0] - b[0], a[1] - b[1]) < r;
TOOL.wall = {
  wantsDown: () => !ui.st,
  click(xy) {
    const st = ui.st, inf = wallInfer(xy, st);
    if (!st) {
      const room = M.room?.pts?.length >= 2 ? M.room : null;
      let p2 = P2(inf.p), from = null, close = null;
      if (room && room.closed) { setMsg("الأوضة مقفولة — اختار أي حيطة وعدّلها من الجنب، أو امسح حيطة وكمّل من طرفها"); return; }
      if (room) {
        if (near2d(p2, room.pts.at(-1), 2)) { from = "end"; p2 = room.pts.at(-1); close = room.pts[0]; }
        else if (near2d(p2, room.pts[0], 2)) { from = "start"; p2 = room.pts[0]; close = room.pts.at(-1); }
        else { setMsg("كمّل من طرف الحيطان الموجودة (أول أو آخر نقطة) — الحيطان كلها سلسلة واحدة"); return; }
      }
      ui.st = { wpts: [P3(p2)], last: P3(p2), first: P3(p2), from, close: close && P3(close) };
      overlayWall(inf); return;
    }
    const p = inf.p, target = st.from ? st.close : st.wpts.length >= 3 ? st.first : null;
    if (target && G.dist(p, target) < 1 && st.wpts.length >= (st.from ? 2 : 3)) { st.wpts.push(target); finishWall(true); return; }
    if (G.dist(p, st.last) < 0.5) { if (st.wpts.length >= 2) finishWall(false); return; }
    st.wpts.push(p); st.last = p; overlayWall(inf);
  },
  hover(xy) { const st = ui.st, inf = wallInfer(xy, st); if (st) st.hover = inf.p; overlayWall(inf); },
  vcb(v) {
    const st = ui.st;
    if (!st || !(v.v > 0)) return;
    const d = typedDir(st.hover, st.last, st.wpts, true);
    const P = G.add(st.last, G.mul(d, v.v)); P[2] = 0;
    st.wpts.push(P); st.last = P; st.hover = null; overlayWall();
  },
  enter() { if (ui.st?.wpts.length >= 2) finishWall(false); },
};
function overlayWall(inf) {
  const st = ui.st;
  overlay(() => {
    if (inf) oMarker(inf);
    if (!st) return;
    const W = st.hover ? [...st.wpts, st.hover] : st.wpts;
    if (W.length > 1) {
      oLine(W, 0x1d211c);
      const pts = W.map(P2), tmp = { pts, closed: false, walls: pts.slice(1).map(() => Room.newWallMeta(ui.wallT, ui.wallH)), openings: [] };
      oGhost(wallFaces(tmp).flatMap((x) => x.faces), 0x9a8c70);
    }
    if (st.hover) { liveLen(st.last, st.hover); vcbSet(G.dist(st.last, st.hover), "طول الحيطة"); }
  });
}
function finishWall(closed) {
  const st = ui.st; ui.st = null; overlay();
  if (!st || st.wpts.length < 2) return;
  const raw = st.wpts.map((P) => [Room.r1(P[0]), Room.r1(-P[1])]);
  const pts2 = raw.filter((p, i) => i === 0 || Math.hypot(p[0] - raw[i - 1][0], p[1] - raw[i - 1][1]) > 0.5);
  if (pts2.length < 2) return;
  const meta = () => Room.newWallMeta(ui.wallT, ui.wallH);
  edit(() => {
    if (!st.from) {
      if (closed) pts2.pop();
      const isClosed = closed && pts2.length >= 3;
      M.room = { pts: pts2, closed: isClosed, walls: Array.from({ length: isClosed ? pts2.length : pts2.length - 1 }, meta), openings: [], points: [], columns: M.room?.columns || [] };
    } else {
      const r = M.room, add = pts2.slice(1);
      if (closed) add.pop();
      if (st.from === "end") { r.pts.push(...add); r.walls.push(...Array.from({ length: add.length + (closed ? 1 : 0) }, meta)); }
      else { r.pts = [...add.reverse(), ...r.pts]; r.walls = [...Array.from({ length: add.length }, meta), ...r.walls, ...(closed ? [meta()] : [])]; }
      r.closed = !!closed && r.pts.length >= 3;
    }
  });
  setMsg(closed ? "اتقفلت الأوضة ✓ — ضيف أبواب وشبابيك ومرافق من «حوائط»" : "اتعملت الحيطان ✓ — دوس على أي حيطة تعدّل طولها وسمكها");
}
// ---- doors, windows, MEP points: tap a wall
function wallHit(xy) {
  rayAt(...xy);
  const meshes = roomG.children.filter((o) => o.isMesh && o.userData.wall && !o.userData.open && (o.material.opacity >= 0.5 || ui.xray));
  const h = ray.intersectObjects(meshes, false)[0]; if (!h) return null;
  const sg = segById(h.object.userData.wall); if (!sg) return null;
  const P = W3(h.point), p2 = P2(P);
  const at = (p2[0] - sg.A[0]) * sg.d[0] + (p2[1] - sg.A[1]) * sg.d[1];
  return { sg, at: Math.max(0, Math.min(sg.L, at)), z: Math.max(0, P[2]), P };
}
const OPEN_DEF = { door: { w: 90, h: 210, sill: 0 }, window: { w: 120, h: 120, sill: 100 } };
function openTool(kind) {
  return {
    click(xy) {
      const hh = wallHit(xy);
      if (!hh) { setMsg(M.room ? "دوس على حيطة" : "ارسم الحيطان الأول بأداة «حيطة»"); return; }
      edit(() => {
        M.room.openings ||= [];
        const o = Room.addOpening(M.room, hh.sg.id, kind); if (!o) return;
        o.at = Room.r1(Math.max(0, Math.min(hh.sg.L - o.w, hh.at - o.w / 2)));
        ui.rsel = { ref: "O:" + o.id, kind: "O", id: o.id };
      });
      setMsg(kind === "door" ? "اتحط باب — عدّل عرضه وارتفاعه ومكانه من الجنب" : "اتحط شباك — عدّل مقاسه والجلسة من الجنب");
    },
    hover(xy) {
      const hh = wallHit(xy);
      overlay(() => {
        if (!hh) return;
        const d = OPEN_DEF[kind], a = Math.max(0, Math.min(hh.sg.L - d.w, hh.at - d.w / 2)), b = a + d.w;
        const r = [onWall(hh.sg, a, d.sill, 0.6), onWall(hh.sg, b, d.sill, 0.6), onWall(hh.sg, b, d.sill + d.h, 0.6), onWall(hh.sg, a, d.sill + d.h, 0.6)];
        oLine([...r, r[0]], 0x2f6fdf);
        live.push({ p: onWall(hh.sg, a, d.sill + d.h + 6, 1), t: `${f1(a)} من أول الحيطة`, cls: "tip" });
      });
    },
  };
}
TOOL.door = openTool("door");
TOOL.window = openTool("window");
TOOL.mep = {
  click(xy) {
    const hh = wallHit(xy);
    if (!hh) { setMsg(M.room ? "دوس على حيطة" : "ارسم الحيطان الأول بأداة «حيطة»"); return; }
    edit(() => { const p = Room.addPoint(M.room, hh.sg.id, ui.mepKind, Room.r1(hh.at)); if (p) ui.rsel = { ref: "E:" + p.id, kind: "E", id: p.id }; });
    const k = Room.MEP_KINDS[ui.mepKind];
    setMsg(`اتحطت ${k[0]} على ارتفاع ${k[2]} سم — غيّر الارتفاع والمكان من الجنب`);
  },
  hover(xy) {
    const hh = wallHit(xy), k = Room.MEP_KINDS[ui.mepKind];
    overlay(() => {
      if (!hh) return;
      const P = onWall(hh.sg, hh.at, k[2], 1.5);
      oLine([onWall(hh.sg, hh.at, 0, 1), P], 0x2f6fdf, true);
      const s = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 8), new THREE.MeshBasicMaterial({ color: Room.MEP_SYS[k[1]][1], depthTest: false }));
      s.position.copy(T3(P)); s.renderOrder = 12; overG.add(s);
      live.push({ p: P, t: `${k[0]} · ${f1(hh.at)} من أول الحيطة · ارتفاع ${k[2]}`, cls: "tip" });
    });
  },
};
/** the door / window / service point closest to the pointer on screen (within a finger's width) */
function roomNearPick(cx, cy) {
  const room = M?.room; if (!room) return null;
  let best = null;
  const tryP = (ref, P, r) => { const q = scr(P); if (q[2] > 1) return; const d = Math.hypot(q[0] - cx, q[1] - cy); if (d < r && (!best || d < best.d)) best = { ref, d, p: P }; };
  for (const pt of room.points || []) { const w = Room.pointWorld(room, pt); if (w) tryP("E:" + pt.id, P3([w.x + w.n[0] * 1.5, w.z + w.n[1] * 1.5], pt.z), touchy ? 40 : 28); }
  for (const o of room.openings || []) {
    const sg = segById(o.wall); if (!sg) continue;
    // inside the opening's outline on screen counts too
    const z0 = +o.sill || 0, corners = [onWall(sg, o.at, z0), onWall(sg, o.at + o.w, z0), onWall(sg, o.at + o.w, z0 + o.h), onWall(sg, o.at, z0 + o.h)].map(scr);
    const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
    if (cx > Math.min(...xs) - 10 && cx < Math.max(...xs) + 10 && cy > Math.min(...ys) - 10 && cy < Math.max(...ys) + 10) { const d = 1; if (!best || d < best.d) best = { ref: "O:" + o.id, d, p: onWall(sg, o.at + o.w / 2, z0 + o.h / 2) }; }
  }
  return best && { ref: best.ref, p: best.p, dist: 0 };
}
// ---- dragging walls / openings / points with «تحريك»
function roomMove(ref, dv) {
  const r = M.room; if (!r) return null;
  const k = ref[0], id = ref.slice(2), dp = [dv[0], -dv[1]];
  if (k === "W") {
    const i = r.walls.findIndex((w) => w.id === id), sg = roomSegs().find((s) => s.id === id); if (i < 0 || !sg) return null;
    const pr = dp[0] * sg.n[0] + dp[1] * sg.n[1], j = (i + 1) % r.pts.length;
    for (const q of [i, j]) r.pts[q] = [Room.r1(r.pts[q][0] + sg.n[0] * pr), Room.r1(r.pts[q][1] + sg.n[1] * pr)];
    return [sg.n[0] * pr, -sg.n[1] * pr, 0];
  }
  const e = (k === "O" ? r.openings : r.points)?.find((x) => x.id === id); if (!e) return null;
  const sg = segById(e.wall); if (!sg) return null;
  const al = dp[0] * sg.d[0] + dp[1] * sg.d[1];
  e.at = Room.r1(Math.max(0, Math.min(sg.L - (k === "O" ? e.w : 0), e.at + al)));
  if (k === "E") { e.z = Room.r1(Math.max(0, Math.min(sg.h, e.z + dv[2]))); return [sg.d[0] * al, -sg.d[1] * al, dv[2]]; }
  return [sg.d[0] * al, -sg.d[1] * al, 0];
}
function restoreRoomDrag() { if (ui.st?.mode === "room") { M = JSON.parse(ui.st.snap); rebuild(); } }
// ---- side panel
const mepOpts = (v) => Object.entries(Room.MEP_SYS).map(([sys, [sn]]) => `<optgroup label="${esc(sn)}">${Object.entries(Room.MEP_KINDS).filter(([, k]) => k[1] === sys).map(([key, k]) => `<option value="${key}" ${key === v ? "selected" : ""}>${esc(k[0])} — ${k[2]} سم</option>`).join("")}</optgroup>`).join("");
const numIn = (label, rp, v) => `<label><span>${label}</span><input type="text" inputmode="decimal" data-numf data-rp="${rp}" value="${f1(v)}"></label>`;
function roomHtml() {
  const room = M.room;
  let h = "";
  const rs = ui.rsel, e = roomEnt(rs);
  if (rs && e) {
    if (rs.kind === "W") {
      const sg = segById(e.id);
      if (sg) h += `<div class="dsbox"><div class="dsrow"><b>🧱 حيطة ${sg.i + 1}</b><button class="dsb" data-room="x">✕</button></div>
        <div class="dsgrid">${numIn("الطول", "L", sg.L)}${numIn("السمك", "t", sg.t)}${numIn("الارتفاع", "h", sg.h)}</div>
        <div class="dsrow"><label class="dschk"><input type="checkbox" data-rp="flip" ${e.flip ? "checked" : ""}> السمك للناحية التانية</label></div>
        <div class="dsrow"><span>🎨 دهان الحيطة</span><button class="dsb" data-wallall="1">على كل الحيطان</button></div>${wallSwatches(e.color, "wcol")}
        <div class="dsbtns"><button class="dsb" data-room="adddoor">🚪 + باب</button><button class="dsb" data-room="addwin">🪟 + شباك</button><button class="dsb" data-room="addpt">🔌 + ${esc(Room.MEP_KINDS[ui.mepKind][0])}</button><button class="dsb danger" data-room="del">🗑 امسح الحيطة</button></div>
        <p class="hint">الطول بيتغيّر من آخر الحيطة. بأداة «تحريك» اسحب الحيطة كلها لقدام أو لورا والحيطان اللي جنبها بتمشي معاها.</p></div>`;
    } else if (rs.kind === "O") {
      const sg = segById(e.wall);
      h += `<div class="dsbox"><div class="dsrow"><b>${e.kind === "door" ? "🚪 باب" : "🪟 شباك"}${sg ? ` — حيطة ${sg.i + 1}` : ""}</b><button class="dsb" data-room="x">✕</button></div>
        <label class="dsf"><span>النوع</span><select data-rp="kind"><option value="door" ${e.kind === "door" ? "selected" : ""}>باب</option><option value="window" ${e.kind === "window" ? "selected" : ""}>شباك</option></select></label>
        <div class="dsgrid">${numIn("العرض", "w", e.w)}${numIn("الارتفاع", "h", e.h)}${numIn("الجلسة", "sill", e.sill || 0)}${numIn("من أول الحيطة", "at", e.at)}</div>
        ${sg ? `<p class="hint">من آخر الحيطة: ${f1(sg.L - e.at - e.w)} سم · اسحبه على الحيطة بأداة «تحريك».</p>` : ""}
        <div class="dsbtns"><button class="dsb danger" data-room="del">🗑 امسحه</button></div></div>`;
    } else {
      const sg = segById(e.wall);
      h += `<div class="dsbox"><div class="dsrow"><b>🔌 ${esc((Room.MEP_KINDS[e.kind] || Room.MEP_KINDS.socket)[0])}${sg ? ` — حيطة ${sg.i + 1}` : ""}</b><button class="dsb" data-room="x">✕</button></div>
        <label class="dsf"><span>النوع</span><select data-rp="kind">${mepOpts(e.kind)}</select></label>
        <div class="dsgrid">${numIn("من أول الحيطة", "at", e.at)}${numIn("الارتفاع من الأرض", "z", e.z)}</div>
        <div class="dsbtns"><button class="dsb danger" data-room="del">🗑 امسحها</button></div></div>`;
    }
  }
  const tools = ROOMTOOLS.includes(ui.tool);
  if (tools || room?.pts?.length) {
    const nW = roomSegs().length, nO = (room?.openings || []).length, nP = (room?.points || []).length;
    h += `<details class="dsbox" ${tools ? "open" : ""}><summary>🧱 الحوائط والمرافق${nW ? ` (${nW} حيطة · ${nO} باب/شباك · ${nP} نقطة)` : ""}</summary>
      <div class="dsgrid"><label><span>سمك الحيطان الجديدة</span><input type="text" inputmode="decimal" data-numf data-rset="wallT" value="${f1(ui.wallT)}"></label><label><span>الارتفاع</span><input type="text" inputmode="decimal" data-numf data-rset="wallH" value="${f1(ui.wallH)}"></label></div>
      <label class="dsf"><span>نقطة المرافق</span><select data-rset="mepKind">${mepOpts(ui.mepKind)}</select></label>
      <div class="dsbtns"><button class="dsb ${ui.tool === "wall" ? "on" : ""}" data-tool="wall">🧱 ارسم حيطان</button><button class="dsb" data-tool="door">🚪 باب</button><button class="dsb" data-tool="window">🪟 شباك</button><button class="dsb" data-tool="mep">🔌 مرافق</button></div>
      ${nW ? "" : `<div class="dsgrid"><label><span>عرض الأوضة</span><input type="text" inputmode="decimal" data-numf id="rqW" value="400"></label><label><span>عمقها</span><input type="text" inputmode="decimal" data-numf id="rqD" value="350"></label></div><button class="dsb" data-room="rect">▭ أوضة مستطيلة بسرعة</button>`}
      <div class="dsrow"><label class="dschk"><input type="checkbox" data-rset="showWalls" ${ui.showWalls ? "checked" : ""}> اظهر الحيطان</label>${nW ? `<button class="dsb danger" data-room="clear">امسح كل الحيطان</button>` : ""}</div>
      <p class="hint">دي حيطان المشروع نفسها: بتظهر في المسقط والواجهات والـ3D، والمطبخ بيترص عليها. الحيطة اللي بينك وبين الأوضة بتبقى شفافة عشان تشوف جوه.</p></details>`;
  }
  return h;
}
function roomAction(kind) {
  const rs = ui.rsel;
  if (kind === "x") { ui.rsel = null; rebuild(); renderUI(); return; }
  if (kind === "del") { delSel(); return; }
  if (kind === "clear") { edit(() => { M.room = null; ui.rsel = null; }); setMsg("اتمسحت الحيطان — ↶ لو عايز ترجّعها"); return; }
  if (kind === "rect") {
    const w = +String(el.querySelector("#rqW")?.value).replace(/[^\d.]/g, "") || 400, d = +String(el.querySelector("#rqD")?.value).replace(/[^\d.]/g, "") || 350;
    edit(() => { M.room = { ...Room.presetRoom("rect", { w, d, t: ui.wallT, h: ui.wallH }), points: [], columns: [] }; });
    zoomExtents(); return;
  }
  if (!rs || rs.kind !== "W") return;
  edit(() => {
    if (kind === "adddoor" || kind === "addwin") { M.room.openings ||= []; const o = Room.addOpening(M.room, rs.id, kind === "adddoor" ? "door" : "window"); if (o) ui.rsel = { ref: "O:" + o.id, kind: "O", id: o.id }; }
    else if (kind === "addpt") { const p = Room.addPoint(M.room, rs.id, ui.mepKind); if (p) ui.rsel = { ref: "E:" + p.id, kind: "E", id: p.id }; }
  });
}
function roomChange(t) {
  const d = t.dataset, v = t.type === "checkbox" ? t.checked : t.value, num = +String(v).replace(/[^\d.\-]/g, "");
  if (d.rset) {
    if (d.rset === "showWalls") { ui.showWalls = !!v; rebuild(); }
    else if (d.rset === "mepKind") ui.mepKind = v;
    else if (num > 0) ui[d.rset] = num;
    renderUI(); return;
  }
  const rs = ui.rsel, e = roomEnt(rs); if (!e) return;
  edit(() => {
    if (rs.kind === "W") {
      const i = M.room.walls.indexOf(e);
      if (d.rp === "L" && num > 1) Room.setWallLength(M.room, i, num);
      else if (d.rp === "flip") e.flip = !!v;
      else if ((d.rp === "t" || d.rp === "h") && num > 0) e[d.rp] = num;
    } else if (rs.kind === "O") {
      if (d.rp === "kind") { e.kind = v; Object.assign(e, { h: OPEN_DEF[v].h, sill: OPEN_DEF[v].sill }); }
      else if ((d.rp === "w" || d.rp === "h") && num > 1) e[d.rp] = num;
      else if ((d.rp === "sill" || d.rp === "at") && isFinite(num) && num >= 0) e[d.rp] = num;
      Room.clampOpening(M.room, e);
    } else {
      if (d.rp === "kind" && Room.MEP_KINDS[v]) { e.kind = v; e.z = Room.MEP_KINDS[v][2]; }
      else if ((d.rp === "at" || d.rp === "z") && isFinite(num) && num >= 0) e[d.rp] = num;
      Room.clampPoint(M.room, e);
    }
  });
}

/** a thick block drawn by hand (rectangle + push/pull) → a real wall of the room */
function solidToWall(sd) {
  if (!sd) return;
  const b = G.solidBox(sd), dx = b.x1 - b.x0, dy = b.y1 - b.y0, h = Room.r1(b.z1);
  const alongX = dx >= dy, t = Room.r1(alongX ? dy : dx);
  if (t > 60 || h < 10) { setMsg("الشكل ده مش شبه حيطة — ارسمها بأداة «حيطة»"); return; }
  // the inner face is the room side; the thickness grows outwards (same rule as the room's walls)
  const A = alongX ? [Room.r1(b.x0), Room.r1(-b.y0)] : [Room.r1(b.x1), Room.r1(-b.y0)];
  const B = alongX ? [Room.r1(b.x1), Room.r1(-b.y0)] : [Room.r1(b.x1), Room.r1(-b.y1)];
  const r = M.room?.pts?.length >= 2 ? M.room : null;
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 20;
  if (r && (r.closed || ![r.pts[0], r.pts.at(-1)].some((e) => near(e, A) || near(e, B)))) { setMsg("فيه حيطان تانية مش لازقة فيها — ارسم دي بأداة «حيطة» من طرف الحيطان الموجودة"); return; }
  edit(() => {
    const meta = Room.newWallMeta(t, h);
    if (!r) M.room = { pts: [A, B], closed: false, walls: [meta], openings: [], points: [], columns: [] };
    else if (near(r.pts.at(-1), A)) { r.pts.push(B); r.walls.push(meta); }
    else if (near(r.pts.at(-1), B)) { r.pts.push(A); r.walls.push(meta); }
    else if (near(r.pts[0], B)) { r.pts.unshift(A); r.walls.unshift(meta); }
    else { r.pts.unshift(B); r.walls.unshift(meta); }
    M.solids = M.solids.filter((x) => x !== sd); ui.sel.clear();
    const w = M.room.walls.find((x) => x.id === meta.id); if (w) ui.rsel = { ref: "W:" + w.id, kind: "W", id: w.id };
  });
  setMsg("اتحوّلت حيطة ✓ — اتأكد من ناحية السمك («السمك للناحية التانية» لو محتاج)");
}
