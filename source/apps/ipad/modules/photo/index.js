// NOVERA Studio — optional module «📷 صورة ← مطبخ» (v126).
// A kitchen photo (Pinterest, a client's WhatsApp) → a parametric design with the factory's own units,
// materials and standards → pieces + a first price, all editable afterwards with the normal tools.
//  • free path: the owner marks the photo by touch — the 4 corners of each wall's base row (floor line → counter top),
//    the joints between units, a type per unit, colour samples → catalogue materials.
//  • automatic path (optional): the photo goes to the Anthropic Messages API with HIS OWN key (kept on this
//    device only, off until he saves one) and the answer fills the same marks — he checks / fixes them on the same screen.
// Both give the same «spec» (spec.js) → build.js makes the units. The project is not touched until «🔨 اعمل التصميم»,
// and then the kitchen goes into a NEW variant (or a new project) so the current design stays as it was.
import * as G from "./geom.js";
import * as S from "./spec.js";
import * as B from "./build.js";

const KEY = "novera-photo-ai"; // {key, model} — on this device only
const MAXPX = 1568; // the long side sent to the model (and used on screen)
const UPV = [145 / 90, 225 / 90], TALLV = 225 / 90; // wall units / tall units on the base-front plane (v = cm / 90)
const COLS = { doors: "#3b82f6", drawers: "#8b5cf6", sink: "#06b6d4", hob: "#ef4444", oven: "#f97316", dish: "#14b8a6", open: "#a3a3a3", glass: "#38bdf8", corner: "#eab308", fridge: "#0ea5e9", toven: "#f97316", pantry: "#22c55e", flip: "#6366f1", hood: "#64748b", gap: "#94a3b8" };
const SLOTS = [["front", "الضلف", "front"], ["upper", "ضلف العلوي (لو لون تاني)", "front"], ["carcass", "الهيكل / الجنب", "carcass"], ["counter", "الرخامة (الكونتر)", "counter"]];

let api = null, pop = null, Bld = null;
const newWall = () => ({ q: [], len: null, lenAI: null, lower: { cuts: [], segs: [{ t: "doors", man: false }] }, upper: { cuts: [], segs: [] } });
const fresh = () => ({ img: null, src: "manual", step: "photo", walls: [newWall()], cur: 0, tool: "cut", sel: null, colors: {}, handle: "bar", sampling: null, ai: { busy: false, err: "", fixes: [], usage: null }, target: null, chainIx: null, result: null, lastVar: null, msg: "" });
let M = fresh();
const esc = (s) => api.esc(String(s ?? ""));
const n0 = (v) => Math.round(+v || 0);

function settings() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } }
function saveSettings(o) { try { if (o) localStorage.setItem(KEY, JSON.stringify(o)); else localStorage.removeItem(KEY); } catch { /* private mode */ } }

// ================================================================== the module
export default {
  init(a) { api = a; Bld = B.makeBuilder(api); css(true); },
  destroy() { pop?.close(); pop = null; css(false); },
  slots: {
    home: () => `<button class="htile" data-mod="photo:open"><b>📷 صورة ← مطبخ</b><small>صورة مطبخ (Pinterest مثلاً) ← تصميم بوحداتك وخاماتك وسعر مبدئي</small></button>`,
    menu: () => `<button class="mitem" data-mod="photo:open"><span class="mic">📷</span><span><b>صورة ← مطبخ</b><small>علّم على صورة مطبخ والبرنامج يعمله بوحداتك ومعاييرك</small></span></button>`,
  },
  cmd: () => [{ label: "📷 صورة ← مطبخ", run: () => open(), hint: "حوّل صورة مطبخ لتصميم" }],
  action(act) { if (act === "open") open(); },
  // tests / other modules
  _dbg: { get api() { return api; }, get M() { return M; }, set M(v) { M = v; }, G, S, B, render: () => render(), loadBlob: (b) => loadBlob(b), commit: () => commit(), aiRun: () => aiRun(), open: () => open() },
};

function css(on) {
  document.getElementById("photoCss")?.remove();
  if (!on) return;
  const st = document.createElement("style");
  st.id = "photoCss";
  st.textContent = `
.pop.phpop{padding:8px}
.pop.phpop .popbox{width:100%;max-width:1180px;height:100%;max-height:100%;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}
.pop.phpop .modbody{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px}
.phsteps{display:flex;gap:6px;flex-wrap:wrap}
.phsteps button{flex:1;min-width:92px;min-height:44px;border-radius:10px;border:1px solid var(--line);background:var(--panel2,transparent);color:var(--ink);font:inherit;font-size:14px}
.phsteps button.on{background:var(--brand);color:#fff;border-color:var(--brand)}
.phsteps button:disabled{opacity:.45}
.phmain{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:10px}
.phstage{position:relative;min-height:0;display:flex;align-items:center;justify-content:center;background:#16181a;border-radius:12px;overflow:hidden;touch-action:none}
.phwrap{position:relative;max-width:100%;max-height:100%;line-height:0}
.phwrap img{max-width:100%;max-height:calc(100vh - 170px);display:block;user-select:none;-webkit-user-drag:none;pointer-events:none}
.phwrap svg{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
.phside{overflow:auto;min-height:0;display:flex;flex-direction:column;gap:8px;padding-inline-end:2px}
.phside .card{border:1px solid var(--line);border-radius:12px;padding:10px;display:grid;gap:8px}
.phside .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.phside .chip{min-height:40px}
.phside .chip.on{background:var(--brand);color:#fff;border-color:var(--brand)}
.phside select,.phside input{min-height:40px;font:inherit;border-radius:8px;border:1px solid var(--line);background:var(--panel,#fff);color:var(--ink);padding:0 8px}
.phdrop{color:#e8e6df;text-align:center;padding:30px;display:grid;gap:12px;justify-items:center;line-height:1.6}
.phdrop .big{font-size:56px}
.phfile{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center}
.phfile input{position:absolute;inset:0;opacity:0;cursor:pointer}
.phseg{display:grid;grid-template-columns:28px 1fr 64px;gap:6px;align-items:center;padding:4px 6px;border-radius:8px}
.phseg.on{outline:2px solid var(--brand)}
.phseg i{width:22px;height:22px;border-radius:6px;display:inline-block}
.phsw{display:inline-block;width:30px;height:30px;border-radius:8px;border:1px solid var(--line);vertical-align:middle}
.phswg{display:flex;flex-wrap:wrap;gap:5px}
.phswg button{width:34px;height:34px;border-radius:8px;border:2px solid transparent;padding:0}
.phswg button.on{border-color:var(--brand);box-shadow:0 0 0 2px #fff inset}
.phlen{font-weight:700;min-height:40px}
.phplan{display:grid;gap:4px;font-size:13.5px}
.phplan .ph-u{display:flex;flex-wrap:wrap;gap:4px}
.phplan .ph-u span{border:1px solid var(--line);border-radius:6px;padding:2px 6px}
.phres td,.phres th{padding:4px 6px;border-bottom:1px solid var(--line);text-align:start}
.phtiles{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.phtiles div{border:1px solid var(--line);border-radius:10px;padding:8px}
.phtiles b{display:block;font-size:18px}
.phmsg{background:color-mix(in srgb,var(--brand) 14%,transparent);border-radius:10px;padding:8px 10px;font-size:13.5px;line-height:1.6}
.pherr{color:#c62828;font-weight:600}
.phhint{color:var(--muted);font-size:13px;line-height:1.6;margin:0}
@media (max-width:900px){.pop.phpop .popbox{overflow:auto}.pop.phpop .modbody{flex:none}.phmain{display:flex;flex-direction:column}.phstage{height:55vh;flex:none}.phside{overflow:visible}.phwrap img{max-height:55vh}}
`;
  document.head.appendChild(st);
}

// ================================================================== open / close
function open() {
  if (pop) { pop.close(); pop = null; }
  if (api.ui.pop) { api.ui.pop = null; api.renderPop(); } // the ☰ menu / a pop it was opened from
  pop = api.popup({ title: "📷 صورة ← مطبخ", html: skeleton(), onClose: () => { pop = null; document.removeEventListener("paste", onPaste); } });
  pop.el.classList.add("phpop");
  bind();
  document.addEventListener("paste", onPaste);
  render();
}
function skeleton() { return `<div class="phsteps"></div><div class="phmain"><div class="phstage"></div><div class="phside"></div></div>`; }
const STEPS = [["photo", "① الصورة"], ["walls", "② الحيطان"], ["units", "③ الوحدات"], ["colors", "④ الألوان"], ["build", "⑤ التصميم"]];
const wallsReady = () => M.walls.every((w) => G.quadOk(w.q));

function render() {
  if (!pop) return;
  const el = pop.el;
  el.querySelector(".phsteps").innerHTML = STEPS.map(([k, l]) => `<button data-ph="step:${k}" class="${M.step === k ? "on" : ""}" ${!M.img && k !== "photo" ? "disabled" : ""} ${["units", "colors", "build"].includes(k) && !wallsReady() ? "disabled" : ""}>${l}</button>`).join("");
  const stage = el.querySelector(".phstage");
  if (!M.img) { stage.innerHTML = dropHtml(); stage.dataset.img = ""; }
  else if (stage.dataset.img !== M.img.id) {
    stage.innerHTML = `<div class="phwrap"><img src="${M.img.url}" alt="صورة المطبخ"><svg class="phsvg" viewBox="0 0 ${M.img.w} ${M.img.h}" preserveAspectRatio="none"></svg></div>`;
    stage.dataset.img = M.img.id;
  }
  drawSvg();
  el.querySelector(".phside").innerHTML = side();
}

// ================================================================== the photo
function dropHtml() {
  return `<div class="phdrop"><div class="big">📷</div><b>اختار صورة المطبخ</b><span class="phhint" style="color:#cfcac0">من الصور أو الكاميرا، أو الصقها (⌘V) — صورة من Pinterest أو واتساب العميل.<br>كل ما تكون الصورة واضحة والصف كله باين، كل ما التصميم يطلع أدق.</span>
    <label class="primary phfile">📂 اختار صورة<input type="file" accept="image/*" data-phfile aria-label="اختار صورة"></label></div>`;
}
function onPaste(e) {
  const it = [...(e.clipboardData?.items || [])].find((x) => x.type.startsWith("image/"));
  if (!it) return;
  e.preventDefault();
  loadBlob(it.getAsFile());
}
async function loadBlob(blob) {
  if (!blob) return;
  let bmp;
  try {
    bmp = await new Promise((res, rej) => { const im = new Image(); const u = URL.createObjectURL(blob); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("x")); }; im.src = u; });
  } catch { api.alertBar("الملف ده مش صورة أقدر أفتحها"); return; }
  const k = Math.min(1, MAXPX / Math.max(bmp.naturalWidth, bmp.naturalHeight));
  const w = Math.max(1, Math.round(bmp.naturalWidth * k)), h = Math.max(1, Math.round(bmp.naturalHeight * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, w, h);
  const keepAi = M.ai;
  M = fresh();
  M.ai = { ...keepAi, busy: false, err: "", fixes: [] };
  M.img = { id: Math.random().toString(36).slice(2), w, h, canvas: c, data: ctx.getImageData(0, 0, w, h), url: c.toDataURL("image/jpeg", 0.9) };
  M.step = "photo";
  M.msg = "الصورة جاهزة. علّم الحيطان بإيدك (مجاناً)" + (settings().key ? " أو خلّي 🤖 يقراها لوحده." : ".");
  render();
}

// ================================================================== the overlay
const Hof = (w) => (G.quadOk(w.q) ? G.homography(w.q) : null);
const BACK = 23; // wall units' fronts stand this much behind the base fronts (58 vs 35 deep)
/** the frame of the wall units' fronts (their own plane, BACK cm behind) */
function Hup(w, L) { return G.quadOk(w.q) ? G.shifted(w.q, L, M.img.w, M.img.h, BACK, B.focal(M)) || G.homography(w.q) : null; }
function poly(H, u0, u1, v0, v1) { return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => G.apply(H, u, v).map((x) => x.toFixed(1)).join(",")).join(" "); }
function drawSvg() {
  const svg = pop?.el.querySelector(".phsvg");
  if (!svg || !M.img) return;
  const W = M.img.w, sw = Math.max(1.5, W / 450), fs = Math.max(11, W / 48), rr = Math.max(9, W / 70);
  const Ls = B.lengths(M);
  let h = "";
  M.walls.forEach((w, i) => {
    const on = i === M.cur;
    const H = Hof(w);
    if (H) {
      const S0 = B.segsOf(w), HU = Hup(w, Ls[i].len);
      if (M.step !== "walls") {
        S0.lower.forEach((s, k) => {
          const tall = S.TALL.has(s.t), sel = M.sel && M.sel.w === i && M.sel.row === "lower" && M.sel.k === k;
          h += `<polygon points="${poly(H, s.a, s.b, 0, tall ? TALLV : 1)}" fill="${COLS[s.t] || "#888"}" fill-opacity="${sel ? 0.5 : 0.28}" stroke="${sel ? "#fff" : COLS[s.t] || "#888"}" stroke-width="${sel ? sw * 2.2 : sw}" data-seg="${i}|lower|${k}"/>`;
          const c = G.apply(H, (s.a + s.b) / 2, tall ? 1.5 : 0.5);
          h += `<text x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}" font-size="${fs}" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="${fs / 7}" paint-order="stroke" pointer-events="none">${S.ICONS[s.t] || ""} ${n0((s.b - s.a) * Ls[i].len)}</text>`;
        });
        S0.upper.forEach((s, k) => {
          const sel = M.sel && M.sel.w === i && M.sel.row === "upper" && M.sel.k === k, gap = s.t === "gap";
          h += `<polygon points="${poly(HU, s.a, s.b, UPV[0], UPV[1])}" fill="${gap ? "none" : COLS[s.t] || "#888"}" fill-opacity="${sel ? 0.5 : 0.28}" stroke="${sel ? "#fff" : COLS[s.t] || "#888"}" stroke-width="${sel ? sw * 2.2 : sw}" ${gap ? `stroke-dasharray="${sw * 4} ${sw * 3}"` : ""} data-seg="${i}|upper|${k}"/>`;
          const c = G.apply(HU, (s.a + s.b) / 2, (UPV[0] + UPV[1]) / 2);
          h += `<text x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}" font-size="${fs}" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="${fs / 7}" paint-order="stroke" pointer-events="none">${S.ICONS[s.t] || ""} ${gap ? "" : n0((s.b - s.a) * Ls[i].len)}</text>`;
        });
        for (const u of w.lower.cuts) h += `<polyline points="${poly(H, u, u, 0, 1).split(" ").slice(0, 3).join(" ")}" stroke="#ffd54a" stroke-width="${sw * 1.6}" fill="none" pointer-events="none"/>`;
        for (const u of w.upper.cuts) h += `<polyline points="${poly(HU, u, u, UPV[0], UPV[1]).split(" ").slice(0, 3).join(" ")}" stroke="#ffd54a" stroke-width="${sw * 1.6}" fill="none" pointer-events="none"/>`;
      }
      h += `<polygon points="${poly(H, 0, 1, 0, 1)}" fill="none" stroke="${on ? "#ffd54a" : "#fff"}" stroke-width="${sw * (on ? 1.6 : 1)}" stroke-dasharray="${sw * 5} ${sw * 3}" pointer-events="none"/>`;
      if (M.step === "walls" || M.step === "units") {
        const top = G.apply(H, 0.5, M.step === "units" ? UPV[1] + 0.12 : 1.15);
        h += `<text x="${top[0].toFixed(1)}" y="${top[1].toFixed(1)}" font-size="${fs * 1.1}" text-anchor="middle" fill="#ffd54a" stroke="#000" stroke-width="${fs / 6}" paint-order="stroke" pointer-events="none">حيطة ${i + 1} · ${n0(Ls[i].len)} سم</text>`;
      }
    }
    if (M.step === "walls" || !H) {
      w.q.forEach((p, k) => {
        h += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${rr * (on ? 1.6 : 1.2)}" fill="${on ? "#ffd54a" : "#fff"}" fill-opacity="0.35" stroke="${on ? "#ffd54a" : "#fff"}" stroke-width="${sw}" data-qh="${i},${k}"/>`;
        h += `<text x="${p[0].toFixed(1)}" y="${(p[1] + fs * 0.35).toFixed(1)}" font-size="${fs * 0.9}" text-anchor="middle" fill="#000" pointer-events="none">${k + 1}</text>`;
      });
      if (w.q.length > 1 && !H) h += `<polyline points="${w.q.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#ffd54a" stroke-width="${sw}" pointer-events="none"/>`;
    }
  });
  for (const [k, c] of Object.entries(M.colors)) if (c?.at) h += `<circle cx="${c.at[0]}" cy="${c.at[1]}" r="${rr}" fill="${c.hex}" stroke="#fff" stroke-width="${sw * 1.5}" pointer-events="none"/><text x="${c.at[0]}" y="${c.at[1] - rr * 1.4}" font-size="${fs * 0.8}" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="${fs / 8}" paint-order="stroke" pointer-events="none">${esc(SLOTS.find((s) => s[0] === k)?.[1].split(" ")[0] || "")}</text>`;
  svg.innerHTML = h;
}

// ================================================================== touch on the photo
let down = null;
function imgPt(e) {
  const svg = pop.el.querySelector(".phsvg");
  const r = svg.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * M.img.w, ((e.clientY - r.top) / r.height) * M.img.h];
}
function bind() {
  const el = pop.el;
  el.addEventListener("click", onClick);
  el.addEventListener("change", onChange);
  el.addEventListener("pointerdown", (e) => {
    if (!e.target.closest?.(".phsvg") || !M.img) return;
    e.preventDefault();
    const qh = e.target.closest("[data-qh]");
    const h0 = qh ? qh.dataset.qh.split(",").map(Number) : null;
    // a corner shared by two walls (L / U) moves as one point
    const links = [];
    if (h0) { const p0 = M.walls[h0[0]].q[h0[1]], tol = Math.max(4, M.img.w / 250); M.walls.forEach((w, i) => w.q.forEach((p, k) => { if (Math.hypot(p[0] - p0[0], p[1] - p0[1]) <= tol) links.push([i, k]); })); }
    down = { x: e.clientX, y: e.clientY, pt: imgPt(e), qh: h0, links, moved: false, id: e.pointerId };
    try { e.target.setPointerCapture?.(e.pointerId); } catch { /* */ }
  });
  el.addEventListener("pointermove", (e) => {
    if (!down || e.pointerId !== down.id) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true;
    if (down.qh && down.moved) {
      const p = imgPt(e), np = [Math.max(0, Math.min(M.img.w, p[0])), Math.max(0, Math.min(M.img.h, p[1]))];
      for (const [i, k] of down.links) M.walls[i].q[k] = [...np];
      M.cur = down.qh[0];
      drawSvg();
    }
  });
  const up = (e) => {
    if (!down || e.pointerId !== down.id) return;
    const d = down; down = null;
    if (d.qh && d.moved) { render(); return; }
    if (!d.moved) photoTap(d.pt, e.target);
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", () => { down = null; });
}
function photoTap(pt, target) {
  if (M.step === "photo") { M.step = "walls"; }
  if (M.step === "walls") return tapWall(pt);
  if (M.step === "units") return tapUnits(pt, target);
  if (M.step === "colors") return tapColor(pt);
}
function tapWall(pt) {
  let w = M.walls[M.cur];
  if (w.q.length >= 4) { const nx = M.walls.findIndex((x) => x.q.length < 4); if (nx < 0) return; M.cur = nx; w = M.walls[nx]; }
  // the shared corner of an L / U: a tap close to another wall's point lands exactly on it
  const tol = Math.max(10, M.img.w / 70);
  for (const x of M.walls) if (x !== w) for (const p of x.q) if (Math.hypot(p[0] - pt[0], p[1] - pt[1]) < tol) pt = [...p];
  w.q.push(pt);
  if (w.q.length === 4) {
    if (!G.quadOk(w.q)) { M.msg = "⚠ النقط الأربعة مش عاملة شكل سليم — اسحبها بصباعك أو «↺ علّم تاني». الترتيب: تحت شمال، تحت يمين، فوق يمين، فوق شمال."; }
    else { const nx = M.walls.findIndex((x) => x.q.length < 4); if (nx >= 0) M.cur = nx; M.msg = nx >= 0 ? `✓ حيطة ${M.walls.indexOf(w) + 1} اتعلّمت — كمّل حيطة ${nx + 1}.` : "✓ الحيطان اتعلّمت. اكتب طول تعرفه (لو تعرف) وبعدين «③ الوحدات»."; }
    B.autoTypes(M);
  }
  render();
}
/** which wall a tap belongs to, and where on it (u along the run, v height in 90 cm units) */
function locate(pt) {
  let best = null;
  M.walls.forEach((w, i) => {
    const H = Hof(w); if (!H) return;
    let [u, v] = G.toUV(G.invert(H), pt[0], pt[1]);
    if (v > 1.3) { const HU = Hup(w, B.lengths(M)[i].len); const r = G.toUV(G.invert(HU), pt[0], pt[1]); u = r[0]; v = Math.max(1.31, r[1]); }
    if (!(u > -0.03 && u < 1.03 && v > -0.4 && v < UPV[1] + 0.5)) return;
    const d = Math.max(0, -u, u - 1) + (i === M.cur ? 0 : 0.001);
    if (!best || d < best.d) best = { i, u: Math.max(0, Math.min(1, u)), v, d };
  });
  return best;
}
function tapUnits(pt, target) {
  const L = locate(pt);
  if (!L) { M.msg = "الدوسة برّه الصف — دوس على الوحدات نفسها."; render(); return; }
  M.cur = L.i;
  const w = M.walls[L.i], row = L.v > 1.3 ? "upper" : "lower";
  if (M.tool === "pick") {
    const seg = target?.closest?.("[data-seg]")?.dataset.seg?.split("|");
    if (seg) M.sel = { w: +seg[0], row: seg[1], k: +seg[2] };
    else { const S0 = B.segsOf(w)[row]; const k = S0.findIndex((s) => L.u >= s.a && L.u <= s.b); M.sel = k >= 0 ? { w: L.i, row, k } : null; }
    render(); return;
  }
  // a joint: a tap next to an existing one takes it away
  const R = w[row];
  const near = R.cuts.findIndex((c) => Math.abs(c - L.u) < 0.018);
  const before = B.segsOf(w)[row];
  if (near >= 0) R.cuts.splice(near, 1);
  else if (row === "lower" && (L.u < 0.015 || L.u > 0.985)) { M.msg = "ده طرف الصف — الفواصل بتبقى بين الوحدات."; render(); return; }
  else R.cuts.push(+L.u.toFixed(4));
  R.cuts.sort((a, b) => a - b);
  // keep the types the owner picked: each new segment takes the type of the old one under its middle
  const segs = B.segsOf({ ...w, [row]: { cuts: R.cuts, segs: [] } })[row];
  R.segs = segs.map((s) => { const m = (s.a + s.b) / 2; const o = before.find((x) => m >= x.a && m <= x.b); return o && o.man ? { t: o.t, man: true } : { t: row === "upper" ? "doors" : "doors", man: false }; });
  M.sel = null;
  B.autoTypes(M);
  render();
}
function tapColor(pt) {
  const slot = M.sampling || "front";
  const hex = G.sampleAvg(M.img.data, pt[0], pt[1], Math.max(3, M.img.w / 320));
  if (!hex) return;
  const cand = SLOTS.find((s) => s[0] === slot)[2];
  M.colors[slot] = { hex, lib: G.nearestLib(api.Catalog.LIB, cand, hex), at: [Math.round(pt[0]), Math.round(pt[1])] };
  const order = ["front", "carcass", "counter"];
  M.sampling = order.find((k) => !M.colors[k]) || null;
  render();
}

// ================================================================== the side panel
function side() {
  let h = M.msg ? `<div class="phmsg">${esc(M.msg)}</div>` : "";
  if (M.step === "photo") h += sidePhoto();
  else if (M.step === "walls") h += sideWalls();
  else if (M.step === "units") h += sideUnits();
  else if (M.step === "colors") h += sideColors();
  else h += sideBuild();
  return h;
}
function sidePhoto() {
  const st = settings();
  let h = `<div class="card"><b>الطريقة المجانية: علّم بإيدك</b><p class="phhint">4 خطوات قصيرة: تعلّم أطراف الصف، تدوس على الفواصل بين الوحدات، تختار نوع كل وحدة، وتاخد الألوان من الصورة. البرنامج يصلّح المنظور ويقرّب المقاسات لمقاسات المصنع (كل 5 سم، حوض 80، بوتجاز 90، تلاجة 90، غسالة أطباق 60…).</p>
    <div class="row"><label class="ghost2 phfile">📂 ${M.img ? "صورة تانية" : "اختار صورة"}<input type="file" accept="image/*" data-phfile aria-label="اختار صورة"></label>${M.img ? `<button class="primary" data-ph="step:walls">ابدأ التعليم ←</button>` : ""}</div></div>`;
  h += `<div class="card"><b>🤖 القراءة الأوتوماتيك (اختياري)</b>`;
  if (st.key) {
    h += `<p class="phhint">الصورة بتتبعت لـ Anthropic بمفتاحك إنت، وبيرجع نفس العلامات تراجعها وتعدّلها قبل أي تصميم. بيتحسب على كل صورة — سنتات قليلة حسب أسعار Anthropic.</p>
      <button class="primary" data-ph="ai" ${!M.img || M.ai.busy ? "disabled" : ""}>${M.ai.busy ? "⏳ بيقرا الصورة…" : "🤖 خليه يقرأ الصورة لوحده"}</button>`;
    if (M.ai.err) h += `<p class="pherr">${esc(M.ai.err)}</p>`;
  } else h += `<p class="phhint">مقفولة لحد ما تحط مفتاح API بتاعك من Anthropic (console.anthropic.com). المفتاح بيتحفظ على الجهاز ده بس، ومحدش غيرك بيشوفه.</p>`;
  h += `<details ${st.key ? "" : "open"}><summary>⚙ إعدادات المفتاح</summary><div style="display:grid;gap:6px;margin-top:6px">
      <label class="f"><span>مفتاح API</span><input type="password" data-phset="key" value="${esc(st.key || "")}" placeholder="sk-ant-…" autocomplete="off" aria-label="مفتاح API"></label>
      <label class="f"><span>اسم الموديل</span><input data-phset="model" value="${esc(st.model || S.DEFAULT_MODEL)}" aria-label="اسم الموديل"></label>
      <p class="phhint">💰 بيتحسب على كل صورة — سنتات قليلة حسب أسعار Anthropic (الصورة بتتصغّر لـ 1568 بكسل قبل ما تتبعت). مفيش حاجة بتتبعت غير لما تدوس الزرار.</p>
      <div class="row"><button class="ghost2" data-ph="savekey">💾 احفظ</button><button class="ghost2" data-ph="testkey" ${st.key ? "" : "disabled"}>🔌 جرّب المفتاح</button>${st.key ? `<button class="danger sm" data-ph="delkey">امسح المفتاح</button>` : ""}</div>
      ${M.ai.test ? `<p class="${M.ai.test.ok ? "" : "pherr"}">${esc(M.ai.test.text)}</p>` : ""}</div></details></div>`;
  return h;
}
function sideWalls() {
  const Ls = B.lengths(M);
  const n = M.walls.length;
  const names = ["أول نقطة: تحت على الشمال (الأرضية عند أول الصف)", "تاني نقطة: تحت على اليمين (آخر الصف عند الأرضية)", "تالت نقطة: فوق على اليمين (حرف الرخامة)", "رابع نقطة: فوق على الشمال (حرف الرخامة)"];
  const w = M.walls[M.cur];
  let h = `<div class="card"><b>كام حيطة فيها وحدات في الصورة؟</b><div class="row">${[[1, "حيطة واحدة (I)"], [2, "حيطتين (L)"], [3, "تلاتة (U)"]].map(([k, l]) => `<button class="chip ${n === k ? "on" : ""}" data-ph="shape:${k}">${l}</button>`).join("")}</div>
    <p class="phhint">الحيطان بالترتيب من الشمال لليمين زي ما هي في الصورة. لو L أو U، الركنة هي آخر الحيطة الأولى وأول اللي بعدها.</p></div>`;
  h += `<div class="card"><b>علّم وش الصف السفلي لكل حيطة</b><p class="phhint">${w.q.length < 4 ? `حيطة ${M.cur + 1} — ${esc(names[w.q.length])}` : "تقدر تسحب أي نقطة بصباعك عشان تظبطها."}</p>
    <p class="phhint">الأربع نقط بيعملوا مستطيل وش الوحدات من الأرض لحد سطح الرخامة (90 سم) — منه البرنامج بيصلّح ميل الصورة.</p>`;
  M.walls.forEach((x, i) => {
    const L = Ls[i];
    const why = { typed: "إنت كتبته", ai: "تقدير 🤖", scaled: "محسوب من الحيطة اللي كتبتها", est: "تقدير من ارتفاع الرخامة", none: "" }[L.why];
    h += `<div class="row" style="justify-content:space-between"><button class="chip ${i === M.cur ? "on" : ""}" data-ph="cur:${i}">حيطة ${i + 1} ${G.quadOk(x.q) ? "✓" : `(${x.q.length}/4)`}</button>
      <button class="ghost2 phlen" data-ph="len:${i}" ${G.quadOk(x.q) || x.len ? "" : "disabled"}>📏 ${G.quadOk(x.q) || x.len ? `${n0(L.len)} سم` : "الطول"}</button><button class="ghost2" data-ph="redo:${i}">↺ علّم تاني</button></div>
      ${G.quadOk(x.q) || x.len ? `<small class="phhint">${esc(why)}${L.why !== "typed" ? " — لو تعرف الطول الحقيقي دوس عليه واكتبه" : ""}</small>` : ""}`;
  });
  h += `</div><p class="phhint">مش عارف ولا طول؟ عادي — البرنامج بيقدّره من ارتفاع الرخامة (90 سم)، وبعدين بيقرّب كل وحدة لأقرب مقاس من مقاسات المصنع. لو تعرف طول واحد بس (حيطة واحدة) اكتبه، والباقي بيتظبط عليه.</p>`;
  h += `<div class="row"><button class="primary" data-ph="step:units" ${wallsReady() ? "" : "disabled"}>التالي: الوحدات ←</button></div>`;
  return h;
}
function segRows(i, row) {
  const w = M.walls[i], Ls = B.lengths(M), list = B.segsOf(w)[row], T = row === "upper" ? S.UPPER : S.LOWER;
  if (!list.length) return `<p class="phhint">${row === "upper" ? "مفيش علوي متعلّم — دوس على أول العلوي وآخره وبين كل وحدتين." : ""}</p>`;
  return list.map((s, k) => {
    const on = M.sel && M.sel.w === i && M.sel.row === row && M.sel.k === k;
    return `<div class="phseg ${on ? "on" : ""}"><i style="background:${COLS[s.t]}"></i><select data-phtype="${i}|${row}|${k}" aria-label="نوع الوحدة">${Object.entries(T).map(([v, l]) => `<option value="${v}" ${v === s.t ? "selected" : ""}>${S.ICONS[v] || ""} ${esc(l)}</option>`).join("")}</select><span>${n0((s.b - s.a) * Ls[i].len)} سم</span></div>`;
  }).join("");
}
function sideUnits() {
  let h = `<div class="card"><div class="row"><button class="chip ${M.tool === "cut" ? "on" : ""}" data-ph="tool:cut">✂ الفواصل</button><button class="chip ${M.tool === "pick" ? "on" : ""}" data-ph="tool:pick">👆 نوع الوحدة</button></div>
    <p class="phhint">${M.tool === "cut" ? "دوس على الخط اللي بين كل وحدتين: في الصف السفلي (تحت الرخامة) وفي العلوي (فوق). في العلوي دوس كمان على أوله وآخره. دوسة على فاصل موجود بتشيله." : "دوس على أي وحدة في الصورة واختار نوعها — أو من القايمة تحت."}</p></div>`;
  if (M.sel) {
    const T = M.sel.row === "upper" ? S.UPPER : S.LOWER;
    const cur = B.segsOf(M.walls[M.sel.w])[M.sel.row][M.sel.k]?.t;
    h += `<div class="card"><b>الوحدة المختارة</b><div class="row">${Object.entries(T).map(([v, l]) => `<button class="chip ${v === cur ? "on" : ""}" data-ph="settype:${v}">${S.ICONS[v] || ""} ${esc(l)}</button>`).join("")}</div></div>`;
  }
  M.walls.forEach((w, i) => {
    h += `<div class="card"><b>حيطة ${i + 1}</b><small class="phhint">تحت (سفلي + طويل)</small>${segRows(i, "lower")}<small class="phhint">فوق (علوي)</small>${segRows(i, "upper")}
      <div class="row"><button class="ghost2 sm" data-ph="clearcuts:${i}">امسح فواصل الحيطة دي</button></div></div>`;
  });
  h += `<div class="row"><button class="ghost2" data-ph="autotypes">✨ رجّع الأنواع التلقائية</button><button class="primary" data-ph="step:colors">التالي: الألوان ←</button></div>`;
  return h;
}
function libOpts(slot, cur) {
  const LIB = api.Catalog.LIB;
  return G.candidates(LIB, slot).map((k) => `<button style="background:${LIB[k][2]}" class="${k === cur ? "on" : ""}" title="${esc(LIB[k][0])}" aria-label="${esc(LIB[k][0])}" data-phlib="${k}"></button>`).join("");
}
function sideColors() {
  const LIB = api.Catalog.LIB;
  let h = `<div class="card"><b>الخامات من ألوان الصورة</b><p class="phhint">اختار الجزء، ودوس على مكانه في الصورة — البرنامج بياخد اللون ويختار أقرب خامة من مكتبتك. تقدر تغيّرها بالدوس على أي لون تحت.</p></div>`;
  for (const [k, l, cand] of SLOTS) {
    const c = M.colors[k];
    h += `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(l)}</b><button class="chip ${M.sampling === k ? "on" : ""}" data-ph="sample:${k}">🎯 ${M.sampling === k ? "دوس على الصورة…" : "خد اللون من الصورة"}</button></div>
      ${c ? `<div class="row"><span class="phsw" style="background:${c.hex}" title="من الصورة"></span><span>←</span><span class="phsw" style="background:${LIB[c.lib]?.[2] || "#fff"}"></span><b>${esc(LIB[c.lib]?.[0] || "—")}</b>${k === "upper" ? `<button class="ghost2 sm" data-ph="unupper">زي السفلي</button>` : ""}</div>` : `<small class="phhint">${k === "upper" ? "فاضي = نفس لون الضلف" : "لسه — هيتحط الافتراضي (عادي)"}</small>`}
      <div class="phswg" data-phslot="${k}">${libOpts(cand, c?.lib)}</div></div>`;
  }
  h += `<div class="card"><b>المقبض</b><div class="row">${Object.entries(S.HANDLES).map(([k, l]) => `<button class="chip ${M.handle === k ? "on" : ""}" data-ph="handle:${k}">${esc(l)}</button>`).join("")}</div></div>
    <div class="row"><button class="primary" data-ph="step:build">التالي: التصميم ←</button></div>`;
  return h;
}

// ================================================================== build
const DEF_LIBS = { front: "wood_oak_natural_v", carcass: "hpl_offwhite", counter: "quartz_white_sparkle" }; // the «عادي» tier when nothing was sampled
function specNow() {
  const sp = B.marksToSpec(M);
  for (const [k, v] of Object.entries(DEF_LIBS)) if (!sp.libs[k]) sp.libs[k] = v;
  return sp;
}
function chainsNow() {
  const P = api.state.project;
  if (!P.room) return [];
  return B.wallChains(api.Room, P.room).filter((c) => c.length === M.walls.length);
}
const anyUnits = () => { const P = api.state.project; return P.units.length > 0 || (P.variants || []).some((v) => v.units?.length); };
function targets() {
  const P = api.state.project, ch = chainsNow();
  const out = [];
  if (P.room && ch.length) out.push(["variant", `نسخة جديدة في «${P.name}» (على حيطان الأوضة)`]);
  else if (!P.room) out.push(["variant", anyUnits() ? `نسخة جديدة في «${P.name}» (وأوضة بمقاسات الصورة للمشروع)` : `في «${P.name}» (أوضة بمقاسات الصورة)`]);
  out.push(["project", "مشروع جديد (أوضة بمقاسات الصورة)"]);
  // a project with units and no room: the new room would re-lay its other variants → a new project is the safe default
  if (!P.room && anyUnits()) out.reverse();
  return out;
}
function preview() {
  const T = targets();
  if (!M.target || !T.some((t) => t[0] === M.target)) M.target = T[0][0];
  const spec = specNow();
  const P = api.state.project;
  const keep = P.units.filter((u) => u.kind !== "kitchen");
  const errsOf = (room, units) => { try { return api.designChecks({ ...P, room, units: [...keep, ...units] }).filter((c) => c.level === "e"); } catch { return []; } };
  let ctx, res;
  if (M.target === "variant" && P.room) {
    const ch = chainsNow();
    if (M.chainIx == null) { // not picked by hand: the walls where it fits with the fewest clashes (doors, the units that stay…)
      let best = null;
      ch.forEach((c, i) => { const r = Bld.make(spec, { room: P.room, chain: c, fresh: false }); const e = errsOf(P.room, r.units).length; if (!best || e < best.e) best = { i, e }; });
      M.chainAuto = best ? best.i : 0;
    }
    ctx = { room: P.room, chain: ch[Math.min(M.chainIx ?? M.chainAuto ?? 0, ch.length - 1)], fresh: false };
  } else ctx = { ...B.roomFor(api.Room, spec), fresh: true };
  res = Bld.make(spec, ctx);
  // a new project holds only the kitchen; a variant keeps the project's other units (dressing, furniture…)
  let errs = [];
  try { errs = api.designChecks({ ...P, room: ctx.room, units: M.target === "variant" ? [...keep, ...res.units] : res.units }).filter((c) => c.level === "e"); } catch { /* checks are advice only */ }
  return { spec, ctx, errs, ...res };
}
function sideBuild() {
  if (M.result) return sideResult();
  let pv;
  try { pv = preview(); } catch (err) { console.error(err); return `<p class="pherr">ما عرفتش أحسب التصميم: ${esc(err.message)}</p>`; }
  const LIB = api.Catalog.LIB, T = targets();
  let h = `<div class="card"><b>هيتعمل فين؟</b>${T.map(([k, l]) => `<label class="row"><input type="radio" name="phtarget" data-phtarget="${k}" ${M.target === k ? "checked" : ""}> ${esc(l)}</label>`).join("")}`;
  if (M.target === "variant" && api.state.project.room) {
    const ch = chainsNow();
    h += `<label class="f"><span>على أنهي حيطان</span><select data-phchain>${ch.map((c, i) => `<option value="${i}" ${i === (M.chainIx ?? M.chainAuto) ? "selected" : ""}>حيطة ${c.map((s) => s.i + 1).join(" + ")} (${c.map((s) => n0(s.L)).join(" + ")} سم)</option>`).join("")}</select></label>`;
  }
  if (M.target === "variant" && !api.state.project.room && anyUnits()) h += `<p class="phhint">⚠ المشروع ده مافيهوش أوضة: الأوضة الجديدة هتبقى للمشروع كله، ووحدات النسخ التانية هتترص على حيطانها (الوحدات نفسها مش هتتغيّر).</p>`;
  h += `<p class="phhint">التصميم الحالي مش هيتغيّر — المطبخ بيتعمل في نسخة جديدة${M.target === "project" ? " (في مشروع لوحده)" : ""} وتقدر ترجع للقديم من «🗂 النسخ».</p></div>`;
  h += `<div class="card"><b>اللي هيتعمل</b><div class="phplan">`;
  for (const p of pv.plan) {
    h += `<div><b>حيطة ${p.wall}</b> · ${n0(p.len)} سم <small class="phhint">(${esc({ typed: "مكتوب", ai: "تقدير 🤖", scaled: "محسوب", est: "تقدير", none: "" }[p.lenWhy] || "")})</small></div>
      <div class="ph-u">${p.lower.map((x) => `<span>${S.ICONS[x.t] || ""} ${n0(x.w)}</span>`).join("")}</div>
      ${p.upper.length ? `<div class="ph-u">⬆ ${p.upper.map((x) => `<span>${S.ICONS[x.t] || ""} ${n0(x.w)}</span>`).join("")}</div>` : ""}`;
  }
  const corners = pv.units.filter((u) => !u.pos?.wall).length;
  if (corners) h += `<div class="ph-u"><span>📐 ${corners} ${corners === 1 ? "ركنة" : "ركن"}</span></div>`;
  h += `</div>${pv.notes.length ? `<p class="phhint">⚠ ${pv.notes.map(esc).join(" · ")}</p>` : ""}
    <div class="row"><span class="phsw" style="background:${LIB[pv.spec.libs.front]?.[2]}"></span>${esc(LIB[pv.spec.libs.front]?.[0] || "")}${pv.spec.libs.upper ? ` · <span class="phsw" style="background:${LIB[pv.spec.libs.upper]?.[2]}"></span>${esc(LIB[pv.spec.libs.upper]?.[0])}` : ""} · ${esc(S.HANDLES[pv.spec.handle] || "")}</div>
    ${pv.errs.length ? `<p class="pherr">⚠ فحص التصميم: ${pv.errs.length} مشكلة — ${pv.errs.slice(0, 2).map((c) => esc(c.text)).join(" · ")}</p>` : `<p>✓ فحص التصميم: مفيش أخطاء</p>`}
    <p class="phhint">${pv.units.length} وحدة. كل وحدة من مكتبتك بمعايير المصنع (سفلي 88 + رخامة = 90، علوي 80 على 145، طويل 225).</p></div>
    <div class="row"><button class="primary" data-ph="commit">🔨 اعمل التصميم</button><button class="ghost2" data-ph="step:units">رجوع للوحدات</button></div>`;
  return h;
}
async function commit() {
  const pv = preview();
  const asVariant = M.target === "variant";
  if (!asVariant) {
    await api.newProject("مطبخ من صورة");
    const ctx = { ...B.roomFor(api.Room, pv.spec), fresh: true };
    const res = Bld.make(pv.spec, ctx);
    api.state.project.room = ctx.room;
    api.applyKitchen(res.units, null);
    M.lastVar = null;
    return done(res, "مشروع جديد");
  }
  const P = api.state.project;
  if (pv.ctx.fresh) P.room = pv.ctx.room;
  // a second «اعمل» while its own variant is still open replaces it instead of piling up variants
  const again = M.lastVar && P.variant === M.lastVar && P.variants?.some((v) => v.id === M.lastVar);
  const fill = !anyUnits() || again;
  api.applyKitchen(pv.units, fill ? null : "📷 من الصورة");
  M.lastVar = api.state.project.variant || null;
  done(pv, fill && !again ? "التصميم" : (P.variants || []).find((v) => v.id === P.variant)?.name || "نسخة جديدة");
}
function done(res, where) {
  const P = api.state.project;
  const units = P.units.filter((u) => u.kind === "kitchen");
  const q = api.quickEstimate(units);
  const checks = api.designChecks();
  M.result = { where, units: units.map((u) => ({ code: u.code || "", name: u.name })), q, errs: checks.filter((c) => c.level === "e").map((c) => c.text), warns: checks.filter((c) => c.level !== "e").map((c) => c.text), notes: res.notes || [] };
  M.msg = "";
  render();
}
function sideResult() {
  const r = M.result, q = r.q;
  const money = (v) => Math.round(v).toLocaleString("en-US");
  return `<div class="phmsg">✅ اتعمل في «${esc(r.where)}» — ${r.units.length} وحدة. التصميم القديم زي ما هو.</div>
    <div class="row"><button class="primary" data-ph="opendesign">افتحه في التصميم</button><button class="ghost2" data-ph="back">رجوع للصورة</button></div>
    <div class="phtiles"><div><small>السعر المبدئي</small><b>${q.total > 0 ? `${money(q.total)} ج.م` : "—"}</b>${q.total > 0 ? "" : `<small class="phhint">حط أسعارك في الورشة والعميل</small>`}</div><div><small>القطع</small><b>${q.pieces}</b></div><div><small>ألواح (تقريبي)</small><b>${q.sheets}</b></div><div><small>مساحة الخشب</small><b>${q.area.toFixed(1)} م²</b></div></div>
    <div class="card"><b>فحص التصميم</b>${r.errs.length ? `<p class="pherr">${r.errs.length} مشكلة: ${r.errs.slice(0, 3).map(esc).join(" · ")}</p>` : `<p>✓ مفيش أخطاء</p>`}${r.warns.length ? `<p class="phhint">${r.warns.length} ملاحظة: ${r.warns.slice(0, 2).map(esc).join(" · ")}</p>` : ""}</div>
    <div class="card"><table class="phres"><thead><tr><th>الكود</th><th>الوحدة</th></tr></thead><tbody>${r.units.map((u) => `<tr><td>${esc(u.code)}</td><td>${esc(u.name)}</td></tr>`).join("")}</tbody></table></div>
    <p class="phhint">أي وحدة تتعدل بعد كده بأدوات التطبيق العادية (المقاس، النوع، الخامة…).</p>`;
}

// ================================================================== the automatic path
function jpegB64() { return M.img.canvas.toDataURL("image/jpeg", 0.85).split(",")[1]; }
async function aiRun() {
  const st = settings();
  if (!st.key || !M.img || M.ai.busy) return;
  M.ai.busy = true; M.ai.err = ""; render();
  try {
    const { text, usage } = await S.askAI({ key: st.key, model: st.model, jpegB64: jpegB64() });
    const obj = S.parseLoose(text);
    const mk = S.aiToMarks(obj, M.img.w, M.img.h);
    M.walls = mk.walls; M.cur = 0; M.sel = null; M.src = "ai";
    M.handle = mk.handle || "bar";
    M.colors = {};
    const LIB = api.Catalog.LIB;
    for (const [k, hex] of Object.entries(mk.colors)) { const cand = SLOTS.find((s) => s[0] === k)?.[2]; if (cand) M.colors[k] = { hex, lib: G.nearestLib(LIB, cand, hex) }; }
    if (M.colors.upper && M.colors.front && M.colors.upper.lib === M.colors.front.lib) delete M.colors.upper;
    B.autoTypes(M); // fills only what the AI left open
    M.ai.usage = usage;
    M.step = "units"; M.tool = "pick";
    M.msg = `🤖 قريت ${mk.walls.length === 1 ? "حيطة واحدة" : `${mk.walls.length} حيطان`} — راجع الأماكن والأنواع والأطوال واظبطها قبل ما تعمل التصميم.${mk.fixes.length ? " " + mk.fixes.join(" · ") : ""}`;
  } catch (err) {
    M.ai.err = `🤖 ${err.message || "ما كملش"} — تقدر تعلّم الصورة بإيدك (مجاناً).`;
  }
  M.ai.busy = false;
  render();
}
async function testKey() {
  const st = settings();
  M.ai.test = { ok: false, text: "⏳ بيجرّب…" }; render();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": st.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "content-type": "application/json" }, body: JSON.stringify({ model: st.model || S.DEFAULT_MODEL, max_tokens: 1, messages: [{ role: "user", content: "ok" }] }) });
    let d = null; try { d = await res.json(); } catch { /* */ }
    M.ai.test = res.ok ? { ok: true, text: "✓ المفتاح شغّال" } : { ok: false, text: res.status === 401 ? "المفتاح مرفوض" : `خطأ ${res.status}: ${(d?.error?.message || "").slice(0, 100)}` };
  } catch { M.ai.test = { ok: false, text: "مفيش نت أو الخدمة مش بترد" }; }
  render();
}

// ================================================================== buttons
function onChange(e) {
  const t = e.target;
  if (t.matches("[data-phfile]")) { const f = t.files?.[0]; if (f) loadBlob(f); return; }
  if (t.matches("[data-phtype]")) {
    const [i, row, k] = t.dataset.phtype.split("|");
    const R = M.walls[+i][row];
    const n = B.segsOf(M.walls[+i])[row].length;
    while (R.segs.length < n) R.segs.push({ t: "doors", man: false });
    R.segs[+k] = { t: t.value, man: true };
    M.sel = { w: +i, row, k: +k };
    B.autoTypes(M); render(); return;
  }
  if (t.matches("[data-phtarget]")) { M.target = t.dataset.phtarget; render(); return; }
  if (t.matches("[data-phchain]")) { M.chainIx = +t.value; render(); return; }
}
function onClick(e) {
  const lib = e.target.closest("[data-phlib]");
  if (lib) { const k = lib.closest("[data-phslot]").dataset.phslot; M.colors[k] = { ...(M.colors[k] || { hex: api.Catalog.LIB[lib.dataset.phlib][2] }), lib: lib.dataset.phlib }; render(); return; }
  const b = e.target.closest("[data-ph]");
  if (!b) return;
  const [a, v] = b.dataset.ph.split(":");
  M.msg = M.msg && a === "step" ? "" : M.msg;
  if (a === "step") { M.step = v; M.sel = null; if (v !== "build") M.result = null; if (v === "colors" && !M.sampling && !M.colors.front) M.sampling = "front"; if (v === "units") B.autoTypes(M); }
  else if (a === "shape") { const n = +v; while (M.walls.length < n) M.walls.push(newWall()); M.walls.length = n; M.cur = Math.min(M.cur, n - 1); B.autoTypes(M); }
  else if (a === "cur") M.cur = +v;
  else if (a === "redo") { const i = +v; M.walls[i] = { ...newWall(), len: M.walls[i].len }; M.cur = i; }
  else if (a === "len") {
    const i = +v, L = B.lengths(M)[i];
    api.numAsk(b, `طول صف حيطة ${i + 1}`, Math.round(L.len), (x) => { M.walls[i].len = x > 30 ? x : null; render(); }, { min: 0, max: 2000 });
    return;
  } else if (a === "tool") { M.tool = v; M.sel = null; }
  else if (a === "settype" && M.sel) {
    const w = M.walls[M.sel.w], R = w[M.sel.row], n = B.segsOf(w)[M.sel.row].length;
    while (R.segs.length < n) R.segs.push({ t: "doors", man: false });
    R.segs[M.sel.k] = { t: v, man: true };
    B.autoTypes(M);
  } else if (a === "clearcuts") { const w = M.walls[+v]; w.lower = { cuts: [], segs: [{ t: "doors", man: false }] }; w.upper = { cuts: [], segs: [] }; M.sel = null; B.autoTypes(M); }
  else if (a === "autotypes") { for (const w of M.walls) for (const R of [w.lower, w.upper]) R.segs = R.segs.map((s) => ({ ...s, man: false })); B.autoTypes(M); }
  else if (a === "sample") M.sampling = v;
  else if (a === "unupper") delete M.colors.upper;
  else if (a === "handle") M.handle = v;
  else if (a === "ai") { aiRun(); return; }
  else if (a === "savekey") {
    const key = pop.el.querySelector("[data-phset=key]")?.value.trim() || "", model = pop.el.querySelector("[data-phset=model]")?.value.trim() || S.DEFAULT_MODEL;
    saveSettings(key ? { key, model } : null); M.ai.test = null;
    M.msg = key ? "💾 المفتاح اتحفظ على الجهاز ده بس." : "المفتاح اتمسح.";
  } else if (a === "delkey") { saveSettings(null); M.ai.test = null; M.msg = "المفتاح اتمسح من الجهاز."; }
  else if (a === "testkey") { testKey(); return; }
  else if (a === "commit") { commit().catch((err) => { console.error(err); api.alertBar(err.message || "ما كملش"); }); return; }
  else if (a === "back") { M.result = null; M.step = "units"; }
  else if (a === "opendesign") {
    pop.close(); pop = null;
    api.closeHome?.();
    api.ui.planOn = false; api.state.tab = "design"; api.state.whole = true;
    api.render(true);
    return;
  }
  render();
}
