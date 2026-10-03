// NOVERA Studio — the drawing studio («ورشة الرسم»): SketchUp-style modelling of your own pieces.
// Draw lines / rectangles / circles / polygons / arcs on the ground or on any face, push/pull them into boards,
// cut holes, notches and pockets, round or bevel corners, move / rotate / scale / mirror / array, offset, follow-me,
// tape measure, protractor, dimensions, text, paint, eraser, groups, hide / isolate, section cut, x-ray, standard views.
// Every flat solid becomes a board in the cut list, the labels and the CNC files (its real outline, holes and pockets).
import * as THREE from "three";
import * as G from "./geom.js";

const MATS = { carcass: "الهيكل", front: "الضلف والواجهة", shelf: "الأرفف", accent: "الخامة المميزة", back: "الظهر" };
const MCOL = { carcass: "#d9cfbf", front: "#b98a5a", shelf: "#e6dccb", accent: "#5f7464", back: "#efe7da" };
const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], AXC = ["#e0413a", "#2f9e44", "#2f6fdf"], AXN = ["الأحمر", "الأخضر", "الأزرق"];
const TOOLS = [
  ["نظر", [["select", "⬚", "اختيار"], ["orbit", "⟳", "لف الكاميرا"], ["pan", "✋", "زحّك الكاميرا"]]],
  ["رسم", [["line", "╱", "خط"], ["rect", "▭", "مستطيل"], ["circle", "◯", "دايرة"], ["polygon", "⬡", "مضلّع"], ["arc", "◠", "قوس"]]],
  ["تشكيل", [["pushpull", "⇕", "سحب / زق"], ["offset", "⧈", "إزاحة"], ["follow", "➰", "اتبعني"], ["fillet", "◜", "تدوير ركن"], ["chamfer", "◸", "شطف ركن"]]],
  ["تعديل", [["move", "✥", "تحريك / نسخ"], ["rotate", "↻", "لف"], ["scale", "⇲", "تكبير / تصغير"]]],
  ["قياس", [["tape", "📏", "شريط قياس"], ["protractor", "∡", "منقلة"], ["dim", "↔", "أبعاد"], ["text", "T", "نص"]]],
  ["تاني", [["paint", "🪣", "دهان"], ["eraser", "⌫", "ممحاة"]]],
];
const TOOLNAME = Object.fromEntries(TOOLS.flatMap(([, l]) => l.map(([k, , n]) => [k, n])));
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
  tape: "دوس من نقطة لنقطة: بيقيس ويسيب خط مساعد", protractor: "دوس المركز، البداية، وبعدين الزاوية: خط مساعد مايل",
  dim: "دوس نقطتين وبعدين مكان خط البعد", text: "دوس المكان واكتب النص في الخانة تحت", paint: "اختار الخامة من الجنب ودوس على اللوح",
  eraser: "دوس أو اسحب على اللي عايز تمسحه",
};
const POINT_R = 18, EDGE_R = 12, AXIS_R = 14;

let host = null, el = null, ctx = {};
let ren, scene, camP, camO, cam, ctl, world, solidsG, sketchG, extraG, overG, labelsEl, grid;
let M = null, mname = "";
let raf = 0, alive = false;
const objs = new Map(); // entity ref → three object(s), for picking and ghosts
const ui = { tool: "select", sel: new Set(), st: null, axis: null, plane: "auto", copy: false, xray: false, section: null, secPos: 0, ortho: false, mat: "carcass",
  segs: 32, sides: 6, filletR: 5, chamferD: 2, editGroup: null, face2d: null, info: null, addSel: false, lastPush: null, lastMove: null, thick: 1.8, panel: true, outline: false, msg: "" };
const hist = { u: [], r: [] };

export const newModel = () => ({ v: 1, solids: [], sketches: [], paths: [], sweeps: [], guides: [], dims: [], texts: [], groups: [] });
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const f1 = (v) => (Math.round(v * 10) / 10).toLocaleString("en-US");
const T3 = (p) => new THREE.Vector3(p[0], p[2], -p[1]);
const W3 = (v) => [v.x, -v.z, v.y];
const matColor = (k) => ctx.matColor?.(k) || MCOL[k] || "#cccccc";
const matName = (k) => ctx.matName?.(k) || MATS[k] || k;

// ================================================================== open / close
export function open(model, opts = {}) {
  ctx = opts;
  M = normalize(model ? G.clone(model) : newModel());
  mname = opts.name || "تصميم حر";
  hist.u = []; hist.r = [];
  Object.assign(ui, { tool: "select", sel: new Set(), st: null, axis: null, plane: "auto", copy: false, editGroup: null, face2d: null, msg: "", panel: window.innerWidth > 900 });
  if (!el) build();
  el.hidden = false;
  document.body.classList.add("indraw");
  alive = true;
  resize();
  rebuild();
  if (M.solids.length || M.sketches.length) zoomExtents(); else setView("iso", 160);
  renderUI();
  loop();
}
export function close() {
  if (!el) return;
  el.hidden = true; alive = false;
  document.body.classList.remove("indraw");
  cancelAnimationFrame(raf);
}
export const isOpen = () => !!el && !el.hidden;
if (typeof window !== "undefined") window.__ds = { M: () => M, ui, scr: (P) => scr(P), setTool: (t) => setTool(t), G };
function normalize(m) {
  for (const k of ["solids", "sketches", "paths", "sweeps", "guides", "dims", "texts", "groups"]) if (!Array.isArray(m[k])) m[k] = [];
  for (const s of m.solids) { s.id ||= uid(); s.holes ||= []; s.pockets ||= []; s.mat ||= "carcass"; s.name ||= "لوح"; s.outer = G.ccw(s.outer); }
  return m;
}

// ================================================================== DOM
function build() {
  host = document.body;
  el = document.createElement("div");
  el.id = "drawStudio"; el.className = "ds"; el.hidden = true;
  el.innerHTML = `<header class="dsbar">
      <button class="dsb primary" data-ds="done">✓ خلصت</button><button class="dsb" data-ds="cancel" title="اقفل من غير حفظ">✕</button>
      <input class="dsname" id="dsName" aria-label="اسم التصميم">
      <span class="dsgrp"><button class="dsb" data-ds="undo" title="تراجع">↶</button><button class="dsb" data-ds="redo" title="إعادة">↷</button></span>
      <span class="dsgrp dsviews"><button class="dsb" data-view="iso" title="منظور">⬢</button><button class="dsb" data-view="top" title="من فوق">فوق</button><button class="dsb" data-view="front" title="من قدام">قدام</button><button class="dsb" data-view="right" title="من الجنب">جنب</button><button class="dsb" data-view="back" title="من ورا">ورا</button><button class="dsb" data-ds="zoomx" title="شوف الكل">⤢</button><button class="dsb" data-ds="ortho" title="منظور / مسطّح">⊡</button></span>
      <span class="dsgrp"><button class="dsb" data-ds="xray" title="شفاف">◐</button><button class="dsb" data-ds="section" title="قطاع">✂</button><button class="dsb" data-ds="panel" title="اللوحة الجانبية">☰</button><button class="dsb" data-ds="help" title="شرح">؟</button></span>
    </header>
    <div class="dsmain">
      <nav class="dstools" aria-label="أدوات الرسم">${TOOLS.map(([g, l]) => `<div class="dstg"><small>${g}</small>${l.map(([k, ic, n]) => `<button class="dst" data-tool="${k}" title="${n}" aria-label="${n}"><span>${ic}</span><em>${n}</em></button>`).join("")}</div>`).join("")}</nav>
      <div class="dsview" id="dsView"><div class="dslabels" id="dsLabels"></div><div class="dsmsg" id="dsMsg"></div><div class="dssec" id="dsSec" hidden><input type="range" id="dsSecPos" min="-200" max="400" step="0.5" value="0"></div></div>
      <aside class="dsside" id="dsSide"></aside>
    </div>
    <footer class="dsfoot">
      <span class="dsgrp dsaxes"><button class="dsb ax0" data-axis="0" title="اقفل على المحور الأحمر (العرض)">X</button><button class="dsb ax1" data-axis="1" title="اقفل على المحور الأخضر (العمق)">Y</button><button class="dsb ax2" data-axis="2" title="اقفل على المحور الأزرق (الارتفاع)">Z</button></span>
      <select id="dsPlane" class="dssel" aria-label="سطح الرسم"><option value="auto">الرسم: على الوش اللي تحت صباعك</option><option value="ground">على الأرض</option><option value="front">حيطة قدام</option><option value="side">حيطة جنب</option></select>
      <span class="dshint" id="dsHint"></span>
      <label class="dsvcb"><span id="dsVcbL">المقاس</span><input id="dsVcb" data-keypad data-kpsolo autocomplete="off" placeholder="—"></label>
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
  solidsG = new THREE.Group(); sketchG = new THREE.Group(); extraG = new THREE.Group(); overG = new THREE.Group();
  world.add(solidsG, sketchG, extraG); scene.add(overG);
  grid = new THREE.GridHelper(1000, 100, 0xb9bdb3, 0xd8dbd3); grid.material.transparent = true; grid.material.opacity = 0.6; scene.add(grid);
  const axl = (d, c) => { const g = new THREE.BufferGeometry().setFromPoints([T3([0, 0, 0]), T3(G.mul(d, 600))]); return new THREE.Line(g, new THREE.LineBasicMaterial({ color: c })); };
  scene.add(axl([1, 0, 0], AXC[0]), axl([0, 1, 0], AXC[1]), axl([0, 0, 1], AXC[2]));
  import("three/addons/controls/OrbitControls.js").then(({ OrbitControls }) => {
    ctl = new OrbitControls(cam, ren.domElement);
    ctl.enableDamping = false; ctl.screenSpacePanning = true; ctl.zoomToCursor = true;
    ctl.addEventListener("change", () => need());
    applyControls();
    setView("iso", 160);
  });
  // our own pointer handling runs first (capture on the view) so the tool decides before the orbit does
  view.addEventListener("pointerdown", onDown, true);
  view.addEventListener("pointermove", onMove);
  view.addEventListener("pointerup", onUp);
  view.addEventListener("pointercancel", () => { downs.clear(); press = null; });
  view.addEventListener("dblclick", (e) => { if (ui.tool === "line" && ui.st?.pts?.length >= 2) { finishLine(false); e.preventDefault(); } });
  view.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("click", onClick);
  el.addEventListener("change", onChange);
  el.addEventListener("input", onInput);
  el.querySelector("#dsVcb").addEventListener("focus", (e) => { if (!e.target.dataset.typed) e.target.value = ""; });
  el.querySelector("#dsVcb").addEventListener("input", (e) => { e.target.dataset.typed = "1"; });
  el.querySelector("#dsVcb").addEventListener("blur", (e) => { delete e.target.dataset.typed; });
  el.querySelector("#dsVcb").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); vcbEnter(); } else if (e.key === "Escape") { cancelStep(); } });
  window.addEventListener("resize", () => { if (alive) resize(); });
  window.addEventListener("keydown", (e) => {
    if (!alive || e.target.closest?.("input,select,textarea")) return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (k === "escape") { cancelStep(); return; }
    if (k === "enter") { TOOL[ui.tool]?.enter?.(); return; }
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
  for (const o of [solidsG, sketchG, extraG]) b.expandByObject(o);
  if (b.isEmpty()) b.set(new THREE.Vector3(-60, 0, -60), new THREE.Vector3(60, 80, 60));
  return b;
}
function setView(kind, distHint) {
  if (!ctl) return;
  const b = modelBox(), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
  const r = distHint || Math.max(size.x, size.y, size.z, 60) * 1.9;
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
function zoomExtents() {
  if (!ctl) return;
  const b = modelBox(), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z, 40) * 1.8;
  const d = cam.position.clone().sub(ctl.target).normalize();
  ctl.target.copy(c); cam.position.copy(c).addScaledVector(d, r); fitOrtho(r); cam.lookAt(c); ctl.update(); need();
}
/** look straight at one face of a solid (2D drawing of the piece's shape) */
function lookAtFace(s, face) {
  const pl = G.facePlane(s, face), n = G.nOf(pl);
  ui.face2d = { sid: s.id, kind: face.kind, plane: pl };
  ui.plane = "face2d";
  if (!ui.ortho) { ui.ortho = true; swapCam(); }
  const b = G.bbox2(s.outer), c = G.toWorld(pl, [(b[0] + b[2]) / 2, face.kind === "bottom" ? -(b[1] + b[3]) / 2 : (b[1] + b[3]) / 2], 0);
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
function segGeo(segs) { const a = []; for (const [p, q] of segs) a.push(p[0], p[2], -p[1], q[0], q[2], -q[1]); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g; }
function clear(g) { while (g.children.length) { const c = g.children.pop(); c.traverse?.((o) => { o.geometry?.dispose?.(); }); } }
function selected(ref) {
  if (ui.sel.has(ref)) return true;
  if (ref.startsWith("s:")) { const s = M.solids.find((x) => "s:" + x.id === ref); return !!(s?.group && ui.sel.has("G:" + s.group)); }
  return false;
}
function rebuild() {
  clear(solidsG); clear(sketchG); clear(extraG); objs.clear();
  const clip = clipPlanes();
  for (const s of M.solids) {
    if (s.hidden) continue;
    const ref = "s:" + s.id, faces = G.solidFaces(s), { geo, tri2face } = triFaces(faces);
    const sel = selected(ref), dim = ui.editGroup && s.group !== ui.editGroup;
    const mat = new THREE.MeshStandardMaterial({ color: matColor(s.mat), roughness: 0.75, metalness: 0, side: THREE.DoubleSide, transparent: ui.xray || dim, opacity: ui.xray ? 0.35 : dim ? 0.25 : 1,
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
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: sel ? 0x2f6fdf : 0x1d211c }));
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
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: sel ? 0x2f6fdf : 0x1d211c }));
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
      const d = G.norm(G.sub(g.b, g.a)), A = G.add(g.a, G.mul(d, -800)), B = G.add(g.a, G.mul(d, 800));
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
  grid.visible = !ui.face2d;
  need();
  renderLabelsList();
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
    html += `<span class="dsl ${L.cls || ""} ${L.ref && ui.sel.has(L.ref) ? "on" : ""}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px">${esc(L.t)}</span>`;
  }
  labelsEl.innerHTML = html;
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
function pickMesh(cx, cy) {
  rayAt(cx, cy);
  const list = [];
  solidsG.children.forEach((o) => { if (o.isMesh) list.push(o); });
  extraG.children.forEach((o) => { if (o.isMesh) list.push(o); });
  const hits = ray.intersectObjects(list, false).filter((h) => !ui.section || clipPlanes()[0].distanceToPoint(h.point) >= -0.01);
  if (!hits.length) return null;
  const h = hits[0], ud = h.object.userData, fi = ud.tri2face?.[h.faceIndex];
  return { ref: ud.ref, sid: ud.sid, face: ud.faces?.[fi], p: W3(h.point), dist: h.distance };
}
function pickSketch(cx, cy) {
  rayAt(cx, cy);
  const fills = sketchG.children.filter((o) => o.isMesh);
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
function pickAny(cx, cy) {
  const m = pickMesh(cx, cy), k = pickSketch(cx, cy);
  if (k && (!m || k.dist == null || k.dist <= m.dist + 0.5 || k.d != null)) return k;
  if (m) return m;
  // guides / dims / texts near the pointer
  let best = null;
  for (const g of M.guides) {
    const a = scr(g.a), d = g.kind === "point" ? Math.hypot(a[0] - cx, a[1] - cy) : segDist2([cx, cy], scr(G.add(g.a, G.mul(G.norm(G.sub(g.b, g.a)), -800))), scr(G.add(g.a, G.mul(G.norm(G.sub(g.b, g.a)), 800)))).d;
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
  if (ui.st?.wpts) ui.st.wpts.forEach((p) => pts.push({ p, kind: "end", cur: true }));
  return pts;
}
function snapEdges() {
  const segs = [];
  for (const s of M.solids) if (!s.hidden) for (const e of G.solidEdges(s)) segs.push({ a: e[0], b: e[1], sid: s.id });
  for (const k of M.sketches) { const W = k.pts.map((p) => G.toWorld(k.plane, p)); for (let i = 0; i + 1 < W.length + (k.closed ? 1 : 0); i++) segs.push({ a: W[i], b: W[(i + 1) % W.length], kid: k.id }); }
  for (const pa of M.paths) for (let i = 0; i + 1 < pa.pts.length + (pa.closed ? 1 : 0); i++) segs.push({ a: pa.pts[i], b: pa.pts[(i + 1) % pa.pts.length], pid: pa.id });
  for (const g of M.guides) if (g.kind !== "point") { const d = G.norm(G.sub(g.b, g.a)); segs.push({ a: G.add(g.a, G.mul(d, -800)), b: G.add(g.a, G.mul(d, 800)), guide: true }); }
  return segs;
}
const KLABEL = { end: "طرف", mid: "منتصف", center: "مركز", guide: "خط مساعد", origin: "نقطة الأصل", edge: "على الحرف", face: "على الوش", plane: "", axis: "" };
/**
 * Where the pointer means, SketchUp-style: points first (end, middle, centre), then edges, faces, the drawing plane;
 * with an anchor, a direction along one of the three axes wins when the pointer is near it.
 * opts: { anchor, plane (stick to this plane), axes: allowed axis indices, noFace }
 */
function infer(cx, cy, opts = {}) {
  const pr = touchy ? 1.35 : 1;
  let best = null;
  for (const q of snapPoints()) {
    const s = scr(q.p);
    if (s[2] > 1) continue;
    const d = Math.hypot(s[0] - cx, s[1] - cy);
    const pri = q.kind === "end" ? 0 : q.kind === "center" ? 1 : q.kind === "mid" ? 2 : 3;
    if (d < POINT_R * pr && (!best || pri < best.pri || (pri === best.pri && d < best.d))) best = { ...q, d, pri };
  }
  let res = null;
  if (best && (!opts.plane || Math.abs(G.toPlane(opts.plane, best.p)[2]) < 0.6)) res = { p: [...best.p], kind: best.kind, sid: best.sid, kid: best.kid, vi: best.vi, loop: best.loop, w: best.w, seg: best.seg };
  // an axis direction from the anchor
  if (opts.anchor && !res?.kind?.match(/end|center/)) {
    const axes = ui.axis != null ? [ui.axis] : opts.axes || [0, 1, 2];
    let ab = null;
    for (const i of axes) {
      const c = closestOnLine(opts.anchor, AX[i], cx, cy);
      if (!c) continue;
      const s = scr(c.p), d = Math.hypot(s[0] - cx, s[1] - cy);
      if ((ui.axis != null || d < AXIS_R * pr) && (!ab || d < ab.d)) ab = { p: c.p, d, axis: i };
    }
    if (ab && opts.plane) { const q = G.toPlane(opts.plane, ab.p); if (Math.abs(q[2]) > 0.05) ab = ui.axis != null ? { ...ab, p: G.toWorld(opts.plane, [q[0], q[1]]) } : null; }
    if (ab) return { p: ab.p, kind: "axis", axis: ab.axis, label: `على المحور ${AXN[ab.axis]}` };
  }
  if (res) return { ...res, label: KLABEL[res.kind] };
  // edges
  let eb = null;
  for (const e of snapEdges()) {
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
    if (t != null) return { p: G.add(o, G.mul(d, t)), kind: "plane", label: "" };
  }
  if (!opts.noFace) {
    const m = pickMesh(cx, cy);
    if (m && m.face && m.sid) return { p: m.p, kind: "face", label: KLABEL.face, sid: m.sid, face: m.face, faceRef: m };
  }
  const pl = basePlane(opts.anchor);
  const { o, d } = rayAt(cx, cy);
  let t = G.rayPlane(o, d, pl);
  if (t == null) { const alt = { o: pl.o, u: pl.u, v: pl.v }; t = G.rayPlane(o, d, { ...alt, v: G.mul(alt.v, -1) }); }
  if (t == null) t = 300;
  return { p: G.add(o, G.mul(d, t)), kind: "plane", label: "" };
}
function basePlane(anchor) {
  const at = anchor || [0, 0, 0];
  if (ui.face2d) return ui.face2d.plane;
  if (ui.plane === "front") return { ...G.FRONT, o: [0, at[1], 0] };
  if (ui.plane === "side") return { ...G.SIDE, o: [at[0], 0, 0] };
  return { ...G.GROUND, o: [0, 0, anchor ? at[2] : 0] };
}
/** the plane a new drawing starts on, from the first point's inference */
function drawPlaneFor(inf) {
  if (ui.face2d) return ui.face2d.plane;
  if (ui.plane === "ground") return { ...G.GROUND, o: [0, 0, inf.p[2]] };
  if (ui.plane === "front") return { ...G.FRONT, o: [0, inf.p[1], 0] };
  if (ui.plane === "side") return { ...G.SIDE, o: [inf.p[0], 0, 0] };
  if (inf.kind === "face" && inf.face) { const s = M.solids.find((x) => x.id === inf.sid); if (s) return G.facePlane(s, inf.face); }
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
}
function oLine(pts, color = 0x1d211c, dashed = false, w = 1) {
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
  const col = inf.kind === "end" ? 0x2f9e44 : inf.kind === "mid" ? 0x22a6b3 : inf.kind === "center" ? 0x9b59b6 : inf.kind === "edge" ? 0xe0413a : inf.kind === "face" ? 0x2f6fdf : inf.kind === "axis" ? [0xe0413a, 0x2f9e44, 0x2f6fdf][inf.axis] : 0x555555;
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
  touchy = e.pointerType === "touch";
  downs.set(e.pointerId, [e.clientX, e.clientY]);
  if (downs.size > 1) { press = null; return; } // two fingers: the camera
  if (e.button === 1 || e.button === 2) return;
  if (ui.tool === "orbit" || ui.tool === "pan") return;
  const xy = infoXY(e);
  // select tool on empty space → the orbit takes this drag
  if (ui.tool === "select") {
    const hit = pickAny(...xy);
    if (!hit && ctl) { ctl.touches.ONE = THREE.TOUCH.ROTATE; ctl.mouseButtons.LEFT = THREE.MOUSE.ROTATE; press = { xy, orbit: true }; return; }
    if (ctl) { ctl.touches.ONE = -1; ctl.mouseButtons.LEFT = -1; }
  }
  press = { xy, moved: false, consumed: false };
  if (ui.tool === "eraser") { eraseDrag = true; eraseAt(...xy); press.consumed = true; return; }
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
  if (press?.pending && press.moved) { const t0 = TOOL[ui.tool]; t0?.click(press.pending); press.pending = null; press.consumed = true; }
  if (ui.tool === "eraser") { if (eraseDrag && press) eraseAt(...xy); else hoverErase(...xy); return; }
  if (e.pointerType === "touch" && !press) return;
  TOOL[ui.tool]?.hover?.(xy);
}
function onUp(e) {
  downs.delete(e.pointerId);
  const p = press; press = null; eraseDrag = false;
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
    if (ref?.startsWith("s:") && !ui.editGroup) { const s = M.solids.find((x) => "s:" + x.id === ref); if (s?.group) ref = "G:" + s.group; }
    if (ref?.startsWith("s:") && ui.editGroup) { const s = M.solids.find((x) => "s:" + x.id === ref); if (s?.group !== ui.editGroup) { ui.editGroup = null; if (s?.group) ref = "G:" + s.group; } }
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
    if (!st || !st.hover || v.v == null) return;
    const d = G.norm(G.sub(st.hover, st.last)); if (!isFinite(d[0])) return;
    const P = G.add(st.last, G.mul(d, v.v));
    st.wpts.push(P); st.last = P; overlayLine();
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
      const inf = infer(...xy, st ? { anchor: st.a, plane: st.plane, axes: inPlaneAxes(st.plane) } : {});
      if (!st) { const pl = drawPlaneFor(inf); ui.st = { plane: pl, a: inf.p, a2: G.toPlane(pl, inf.p).slice(0, 2) }; return; }
      const b2 = G.toPlane(st.plane, inf.p).slice(0, 2);
      if (Math.hypot(b2[0] - st.a2[0], b2[1] - st.a2[1]) < 0.2) return;
      commitShape(make(st.a2, b2), st.plane);
    },
    hover(xy) {
      const st = ui.st;
      const inf = infer(...xy, st ? { anchor: st.a, plane: st.plane, axes: inPlaneAxes(st.plane) } : {});
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
        const sx = Math.sign((st.hb?.[0] ?? st.a2[0] + 1) - st.a2[0]) || 1, sy = Math.sign((st.hb?.[1] ?? st.a2[1] + 1) - st.a2[1]) || 1;
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
    const inf = infer(...xy, st ? { anchor: st.a, plane: st.plane, axes: inPlaneAxes(st.plane) } : {});
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
    L[i] = [G.r2(p[0] + mp[0]), G.r2(p[1] + mp[1])];
    L[(i + 1) % n] = [G.r2(q[0] + mq[0]), G.r2(q[1] + mq[1])];
    if (Math.abs(G.area(L)) < 0.5) return false;
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
}
/** cut a loop all the way through a board: a hole when inside, a notch / split when it crosses the edge */
function cutThrough(s, loop) {
  const grown = G.offset(loop, 0.05); // a loop touching the edge is a notch, not a hole
  if (grown.every((p) => G.inside(p, s.outer)) && !s.holes.some((h) => loop.some((p) => G.inside(p, G.ccw(h))))) { s.holes.push(G.cw(loop)); return; }
  const r = G.boolean(s.outer, G.offset(loop, 0.02), "diff");
  r.outers = r.outers.map((o) => G.clean(o.map(([x, y]) => [G.r2(x), G.r2(y)])));
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
      if (m?.sid && m.face && ["top", "bottom"].includes(m.face.kind)) { const s = M.solids.find((x) => x.id === m.sid), fp = G.facePlane(s, m.face); ui.st = { plane: fp, loop: s.outer.map((p) => G.toPlane(fp, G.toWorld(s.plane, p, m.face.kind === "top" ? s.depth : 0)).slice(0, 2)), a: m.p }; return; }
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
    edit(() => {
      M.sweeps.push({ id: uid(), name: `بروفايل ${M.sweeps.length + 1}`, mat: ui.mat, profile, path, closed });
      M.sketches = M.sketches.filter((x) => x !== prof && (!sk || x !== sk || sk.closed));
      if (pa) M.paths = M.paths.filter((x) => x !== pa);
      ui.sel.clear();
    });
    setMsg("اتعمل البروفايل ✓");
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
  return refs.map((r) => {
    const c = copyRef(r);
    if (c && c[0] === "s") { const e = ent(c); if (e.group) { if (!gmap.has(e.group)) { const g0 = M.groups.find((g) => g.id === e.group); const ng = { id: uid(), name: (g0?.name || "مجموعة") + " (نسخة)" }; M.groups.push(ng); gmap.set(e.group, ng.id); } e.group = gmap.get(e.group); } }
    return c;
  }).filter(Boolean);
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
      // a corner or the middle of an edge of an unselected board: reshape it
      if ((inf.kind === "end" || inf.kind === "mid") && inf.sid && !selected("s:" + inf.sid)) {
        const s = M.solids.find((x) => x.id === inf.sid);
        if (inf.kind === "end" && (inf.loop === s.outer || s.holes.includes(inf.loop))) { ui.st = { mode: "vertex", s, loopIdx: inf.loop === s.outer ? -1 : s.holes.indexOf(inf.loop), vi: inf.vi, a: inf.p }; return; }
      }
      if (!ui.sel.size) {
        const hit = pickAny(...xy);
        if (!hit) { setMsg("اختار حاجة أو دوس عليها"); return; }
        let ref = hit.ref;
        const s = ref.startsWith("s:") && M.solids.find((x) => "s:" + x.id === ref);
        if (s?.group) ref = "G:" + s.group;
        ui.sel.add(ref); rebuild();
      }
      ui.st = { mode: "move", a: inf.p, refs: selRefs() };
      return;
    }
    const inf = infer(...xy, { anchor: st.a });
    commitMove(G.sub(inf.p, st.a));
  },
  hover(xy) {
    const st = ui.st;
    const inf = infer(...xy, st ? { anchor: st.a } : {});
    overlay(() => {
      oMarker(inf);
      if (!st) return;
      const dv = G.sub(inf.p, st.a);
      st.dv = dv;
      oLine([st.a, inf.p], inf.kind === "axis" ? [0xe0413a, 0x2f9e44, 0x2f6fdf][inf.axis] : 0x2f6fdf, true);
      liveLen(st.a, inf.p);
      if (st.mode === "vertex") { const s2 = G.clone(st.s); moveVertex(s2, st, dv); oGhost(G.solidFaces(s2)); }
      else for (const r of st.refs) ghostOf(r, (P) => G.add(P, dv));
    });
    if (st) vcbSet(G.len(G.sub(inf.p, st.a)), ui.copy ? "مسافة النسخ" : "المسافة");
  },
  vcb(v) {
    const st = ui.st;
    if (st && v.v != null && st.dv) { commitMove(G.mul(G.norm(st.dv), v.v)); return; }
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
  if (!st || G.len(dv) < 0.01) { overlay(); return; }
  edit(() => {
    if (st.mode === "vertex") { moveVertex(st.s, st, dv); st.s.outer = G.ccw(st.s.outer); return; }
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
      if (!ui.sel.size) { const hit = pickAny(...xy); if (!hit) { setMsg("اختار اللي عايز تلفه الأول"); return; } let ref = hit.ref; const s = ref.startsWith("s:") && M.solids.find((x) => "s:" + x.id === ref); if (s?.group) ref = "G:" + s.group; ui.sel.add(ref); rebuild(); }
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
      if (!ui.sel.size) { const hit = pickAny(...xy); if (!hit) { setMsg("اختار اللي عايز تكبّره الأول"); return; } let ref = hit.ref; const s = ref.startsWith("s:") && M.solids.find((x) => "s:" + x.id === ref); if (s?.group) ref = "G:" + s.group; ui.sel.add(ref); rebuild(); }
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
      else if (r[0] === "k") { const pl = e.plane, fu = Math.hypot(...pl.u.map((x, i) => x * k[i])), fv = Math.hypot(...pl.v.map((x, i) => x * k[i])); e.pts = e.pts.map(([a, b]) => [a * fu, b * fv]); e.plane = { ...pl, o: [0, 1, 2].map((i) => st.c[i] + (pl.o[i] - st.c[i]) * k[i]) }; }
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
    const b = inf.p; ui.st = null;
    if (G.dist(st.a, b) < 0.05) return;
    edit(() => { M.guides.push({ id: uid(), kind: "line", a: st.a, b }); M.guides.push({ id: uid(), kind: "point", a: b }); });
    setMsg(`المسافة ${f1(G.dist(st.a, b))} سم`);
    overlay();
  },
  hover(xy) { const st = ui.st, inf = infer(...xy, st ? { anchor: st.a } : {}); overlay(() => { oMarker(inf); if (st) { oLine([st.a, inf.p], 0x6b6f66, true); liveLen(st.a, inf.p); st.h = inf.p; } }); if (st) vcbSet(G.dist(st.a, inf.p), "المسافة"); },
  vcb(v) { const st = ui.st; if (!st?.h || v.v == null) return; const b = G.add(st.a, G.mul(G.norm(G.sub(st.h, st.a)), v.v)); ui.st = null; edit(() => { M.guides.push({ id: uid(), kind: "line", a: st.a, b }); M.guides.push({ id: uid(), kind: "point", a: b }); }); overlay(); },
};
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
TOOL.text = {
  click(xy) { const inf = infer(...xy, {}); ui.st = { p: inf.p }; const i = el.querySelector("#dsVcb"); i.removeAttribute("data-keypad"); i.value = ""; i.placeholder = "اكتب النص واضغط ↵"; el.querySelector("#dsVcbL").textContent = "النص"; setTimeout(() => i.focus(), 30); overlay(() => oMarker(inf)); },
  raw(txt) { const st = ui.st; ui.st = null; const i = el.querySelector("#dsVcb"); i.setAttribute("data-keypad", ""); i.placeholder = "—"; if (!st || !txt.trim()) return; edit(() => M.texts.push({ id: uid(), p: st.p, s: txt.trim() })); overlay(); },
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
    });
  },
};
function eraseAt(cx, cy) {
  const hit = pickAny(cx, cy);
  if (!hit?.ref) return;
  edit(() => delEnt(hit.ref));
}
function hoverErase(cx, cy) { const hit = pickAny(cx, cy); overlay(() => { if (hit?.ref) ghostOf(hit.ref, (P) => P); }); }
function delEnt(ref) {
  if (ref.startsWith("G:")) { M.solids = M.solids.filter((s) => s.group !== ref.slice(2)); M.groups = M.groups.filter((g) => g.id !== ref.slice(2)); return; }
  const k = ref[0], id = ref.slice(2);
  const key = { s: "solids", k: "sketches", p: "paths", w: "sweeps", g: "guides", d: "dims", t: "texts" }[k];
  if (key) M[key] = M[key].filter((x) => x.id !== id);
  ui.sel.delete(ref);
}

// ================================================================== edit / undo
function edit(fn) {
  const snap = JSON.stringify(M);
  fn();
  if (JSON.stringify(M) === snap) return;
  hist.u.push(snap); if (hist.u.length > 120) hist.u.shift();
  hist.r = [];
  for (const r of [...ui.sel]) if (!r.startsWith("G:") && !ent(r)) ui.sel.delete(r);
  rebuild(); renderUI();
}
function undo() { if (!hist.u.length) return; hist.r.push(JSON.stringify(M)); M = JSON.parse(hist.u.pop()); ui.st = null; ui.sel.clear(); rebuild(); overlay(); renderUI(); }
function redo() { if (!hist.r.length) return; hist.u.push(JSON.stringify(M)); M = JSON.parse(hist.r.pop()); ui.st = null; ui.sel.clear(); rebuild(); overlay(); renderUI(); }
function cancelStep() { ui.st = null; overlay(); vcbSet(""); }
function delSel() { if (!ui.sel.size) return; edit(() => { for (const r of [...ui.sel]) delEnt(r); ui.sel.clear(); }); }
function setTool(t) {
  if (ui.tool === "text" && ui.st) TOOL.text.raw("");
  if (ui.tool === "line" && ui.st?.wpts?.length >= 2) finishLine(false);
  ui.tool = t; ui.st = null;
  overlay(); applyControls(); vcbSet("", "المقاس");
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
        } else e.pts = flip(e.pts);
      } else xform(r, { p: P });
    }
  });
}
function rotSel90(ax) { const c = selCenter(); edit(() => { for (const r of selRefs()) xform(r, { p: (P) => G.rotP(P, c, AX[ax], Math.PI / 2) }); }); }
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
    M.solids.push(s); ui.sel = new Set(["s:" + s.id]);
  });
  zoomExtents();
}
function addBox(W, H, D, t, back) {
  edit(() => {
    const gid = uid(); M.groups.push({ id: gid, name: `صندوق ${f1(W)}×${f1(H)}×${f1(D)}` });
    const S = (name, mat, plane, w, h, d) => ({ id: uid(), name, mat, plane, outer: G.rect(0, 0, w, h), holes: [], pockets: [], depth: d, group: gid });
    const inD = back ? D - 0.6 : D;
    M.solids.push(
      S("جنب شمال", "carcass", { o: [0, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, inD, H, t),
      S("جنب يمين", "carcass", { o: [W - t, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, inD, H, t),
      S("قاعدة", "carcass", { o: [t, 0, 0], u: [1, 0, 0], v: [0, 1, 0] }, W - 2 * t, inD, t),
      S("سقف", "carcass", { o: [t, 0, H - t], u: [1, 0, 0], v: [0, 1, 0] }, W - 2 * t, inD, t),
    );
    if (back) M.solids.push(S("ظهر", "back", { o: [0, D, 0], u: [1, 0, 0], v: [0, 0, 1] }, W, H, 0.6));
    ui.sel = new Set(["G:" + gid]);
  });
  zoomExtents();
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
  el.querySelector("#dsHint").textContent = (ui.face2d ? "✏️ رسم 2D على وش القطعة · " : "") + (HINT[ui.tool] || "");
  const nm = el.querySelector("#dsName"); if (document.activeElement !== nm) nm.value = mname;
  el.classList.toggle("noside", !ui.panel);
  el.querySelector("#dsSide").innerHTML = sideHtml();
}
function sideHtml() {
  let h = "";
  if (ui.face2d) h += `<div class="dsbox on2d"><b>✏️ بترسم شكل القطعة 2D</b><p class="hint">ارسم خطوط وأقواس ودواير على وشها، وبعدين بـ«سحب/زق» زق الشكل لجوه: تفريغ أو قصة من الحرف أو حفر. «تدوير ركن» و«شطف ركن» على أركانها.</p><button class="dsb" data-ds="exit2d">↩ رجوع للـ3D</button></div>`;
  const refs = selRefs(), solids = refs.filter((r) => r[0] === "s").map(ent).filter(Boolean);
  const pal = Object.keys(MATS).map((k) => `<button class="dsmat ${ui.mat === k ? "on" : ""}" data-mat="${k}" title="${esc(matName(k))}"><i style="background:${matColor(k)}"></i><span>${esc(matName(k))}</span></button>`).join("");
  h += `<div class="dsbox"><div class="dsrow"><b>الاختيار</b><label class="dschk"><input type="checkbox" data-ds="addsel" ${ui.addSel ? "checked" : ""}> + اختيار متعدد</label></div>
    <div class="dsrow"><label class="dschk"><input type="checkbox" data-ds="copy" ${ui.copy ? "checked" : ""}> نسخة (مع التحريك واللف)</label></div></div>`;
  if (refs.length === 1 && solids.length === 1) {
    const s = solids[0], bs = G.boardSize(s), bx = G.solidBox(s);
    h += `<div class="dsbox"><input class="dsin" data-sp="name" value="${esc(s.name)}" aria-label="اسم اللوح">
      <div class="dsrow"><span>المقاس</span><b dir="ltr">${f1(bs.w)} × ${f1(bs.h)} × ${f1(s.depth)}</b></div>
      ${G.isBoard(s) ? "" : `<p class="hint">ده مجسّم مش لوح (سمكه أكتر من 6 سم) — هيتحسب قطعة لكن مش هيتقص من لوح.</p>`}
      <div class="dsgrid">
        <label><span>السمك</span><input type="text" inputmode="decimal" data-numf data-sp="depth" value="${f1(s.depth)}"></label>
        <label><span>س</span><input type="text" inputmode="decimal" data-numf data-sp="x" value="${f1(bx.x0)}"></label>
        <label><span>ص</span><input type="text" inputmode="decimal" data-numf data-sp="y" value="${f1(bx.y0)}"></label>
        <label><span>ع</span><input type="text" inputmode="decimal" data-numf data-sp="z" value="${f1(bx.z0)}"></label>
        ${G.plainRect(s) ? `<label><span>الطول</span><input type="text" inputmode="decimal" data-numf data-sp="w" value="${f1(G.bbox2(s.outer)[2] - G.bbox2(s.outer)[0])}"></label><label><span>العرض</span><input type="text" inputmode="decimal" data-numf data-sp="h" value="${f1(G.bbox2(s.outer)[3] - G.bbox2(s.outer)[1])}"></label>` : ""}
      </div>
      <label class="dsf"><span>الخامة</span><select data-sp="mat">${Object.keys(MATS).map((k) => `<option value="${k}" ${s.mat === k ? "selected" : ""}>${esc(matName(k))}</option>`).join("")}</select></label>
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
      <div class="dsbtns"><button class="dsb" data-ds="dup">⧉ نسخة</button><button class="dsb" data-ds="del">🗑 امسح</button><button class="dsb" data-ds="hide">🙈 اخفي</button><button class="dsb" data-ds="isolate">👁 لوحده</button>
      ${solids.length > 1 && !grp ? `<button class="dsb" data-ds="group">▣ اعمل مجموعة</button>` : ""}${grp ? `<button class="dsb" data-ds="ungroup">▢ فك المجموعة</button><button class="dsb" data-ds="entergrp">ادخل جواها</button>` : ""}</div>
      <div class="dsrow"><span>لف 90°</span><span class="dsgrp"><button class="dsb ax0" data-rot90="0">X</button><button class="dsb ax1" data-rot90="1">Y</button><button class="dsb ax2" data-rot90="2">Z</button></span></div>
      <div class="dsrow"><span>اعكس</span><span class="dsgrp"><button class="dsb ax0" data-mirror="0">X</button><button class="dsb ax1" data-mirror="1">Y</button><button class="dsb ax2" data-mirror="2">Z</button></span></div></div>`;
  }
  h += `<div class="dsbox"><b>الخامة (للدهان واللي جاي)</b><div class="dsmats">${pal}</div></div>`;
  h += `<details class="dsbox"><summary>➕ ضيف بسرعة</summary>
    <div class="dsgrid"><label><span>الطول</span><input type="text" inputmode="decimal" data-numf id="qbW" value="60"></label><label><span>العرض</span><input type="text" inputmode="decimal" data-numf id="qbH" value="40"></label><label><span>السمك</span><input type="text" inputmode="decimal" data-numf id="qbT" value="${f1(ui.thick)}"></label></div>
    <div class="dsbtns"><button class="dsb" data-qb="h">▭ لوح نايم</button><button class="dsb" data-qb="v">▯ لوح واقف</button><button class="dsb" data-qb="s">◫ جنب</button></div>
    <div class="dsgrid"><label><span>عرض الصندوق</span><input type="text" inputmode="decimal" data-numf id="qxW" value="60"></label><label><span>ارتفاع</span><input type="text" inputmode="decimal" data-numf id="qxH" value="72"></label><label><span>عمق</span><input type="text" inputmode="decimal" data-numf id="qxD" value="58"></label></div>
    <div class="dsbtns"><label class="dschk"><input type="checkbox" id="qxB" checked> بظهر</label><button class="dsb" data-ds="qbox">▣ صندوق (هيكل)</button></div></details>`;
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
  <li>لما تخلص دوس «✓ خلصت»: كل لوح بيدخل القص والملصقات وملفات الـCNC بشكله الحقيقي.</li></ol>`;

function onClick(e) {
  const b = e.target.closest("button, [data-pick]");
  if (!b) return;
  const d = b.dataset;
  if (d.tool) { setTool(d.tool); return; }
  if (d.view) { setView(d.view); renderUI(); return; }
  if (d.axis != null) { lockAxis(+d.axis); return; }
  if (d.mat) { ui.mat = d.mat; renderUI(); if (ui.sel.size) edit(() => selRefs().forEach((r) => { const x = ent(r); if (x && (r[0] === "s" || r[0] === "w")) x.mat = d.mat; })); return; }
  if (d.rot90 != null) { rotSel90(+d.rot90); return; }
  if (d.mirror != null) { mirrorSel(+d.mirror); return; }
  if (d.pick) { ui.sel = new Set([d.pick]); ui.outline = true; rebuild(); renderUI(); return; }
  if (d.qb) { addBoard(+el.querySelector("#qbW").value || 60, +el.querySelector("#qbH").value || 40, +el.querySelector("#qbT").value || 1.8, d.qb); return; }
  if (d.vk) {
    const i = el.querySelector("#dsVcb");
    if (d.vk === "enter") { vcbEnter(); return; }
    if (document.activeElement !== i) { i.value = ""; }
    i.dataset.typed = "1"; i.value += d.vk; i.focus(); return;
  }
  switch (d.ds) {
    case "done": ctx.onDone?.(G.clone(M), mname); close(); break;
    case "cancel": if (!hist.u.length || confirmLeave()) { ctx.onCancel?.(); close(); } break;
    case "undo": undo(); break;
    case "redo": redo(); break;
    case "zoomx": zoomExtents(); break;
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
    case "mylib": ctx.saveLib?.(G.clone(M), mname); break;
  }
}
function confirmLeave() { return window.confirm ? window.confirm("هتقفل من غير ما تحفظ التعديلات؟") : true; }
function showHelp() {
  let p = el.querySelector(".dshelp");
  if (p) { p.remove(); return; }
  p = document.createElement("div"); p.className = "dshelp"; p.innerHTML = HELP + `<button class="dsb" data-ds="help">تمام</button>`;
  el.querySelector("#dsView").appendChild(p);
}
function onChange(e) {
  const t = e.target, d = t.dataset;
  if (t.id === "dsPlane") { ui.plane = t.value; if (ui.face2d) { ui.face2d = null; applyControls(); } renderUI(); return; }
  if (t.dataset.ds === "addsel") { ui.addSel = t.checked; return; }
  if (t.dataset.ds === "copy") { ui.copy = t.checked; return; }
  if (t.id === "dsName") { mname = t.value.trim() || mname; return; }
  if (d.gp) { edit(() => { const g = M.groups.find((x) => x.id === d.gp); if (g) g.name = t.value.trim() || g.name; }); return; }
  if (d.wp) { const w = ent(selRefs()[0]); if (w) edit(() => { w[d.wp] = t.value; }); return; }
  if (d.sp) {
    const s = selSolids()[0];
    if (!s) return;
    const v = t.type === "checkbox" ? t.checked : t.value;
    edit(() => {
      const num = +String(v).replace(/[^\d.\-]/g, "");
      if (d.sp === "name") s.name = String(v).trim() || s.name;
      else if (d.sp === "mat") s.mat = v;
      else if (d.sp === "band") s.band = !!v;
      else if (d.sp === "grain") { if (v) s.grain = v; else delete s.grain; }
      else if (d.sp === "depth" && num > 0.05) s.depth = num;
      else if (["x", "y", "z"].includes(d.sp) && isFinite(num)) { const b = G.solidBox(s), i = "xyz".indexOf(d.sp), cur = [b.x0, b.y0, b.z0][i], dv = [0, 0, 0]; dv[i] = num - cur; s.plane.o = G.add(s.plane.o, dv); }
      else if ((d.sp === "w" || d.sp === "h") && num > 0.1) { const b = G.bbox2(s.outer); s.outer = d.sp === "w" ? G.rect(b[0], b[1], b[0] + num, b[3]) : G.rect(b[0], b[1], b[2], b[1] + num); }
    });
  }
}
function onInput(e) {
  if (e.target.id === "dsSecPos") { ui.secPos = +e.target.value; rebuild(); }
}
