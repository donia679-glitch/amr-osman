// NOVERA Studio — the app's own number pad. On a touch screen every number field (data-numf, the survey's
// data-len fields, anything with data-keypad) opens this pad instead of the system keyboard: big keys,
// ± step, next field, done. It types into the field and fires the same input / change / Enter events
// the keyboard would, so the rest of the app does not know the difference.
const SEL = "input[data-numf], input[data-len], input[data-keypad]";
let on = () => true, pad = null, cur = null, fresh = false, pendingSel = null, closedAt = 0, lastDown = null;
/** true for a moment after the pad closed: the tap that closed it must not also hit what was under it */
export const justClosed = () => Date.now() - closedAt < 600;

const isTouch = () => matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
export const active = () => on() && isTouch();

export function init({ enabled } = {}) {
  if (enabled) on = enabled;
  // before the field takes focus: no system keyboard for it
  document.addEventListener("pointerdown", (e) => {
    lastDown = e.target;
    const t = e.target.closest?.(SEL);
    if (!t) return;
    t.inputMode = active() ? "none" : t.dataset.len !== undefined || t.hasAttribute("data-numf") ? "decimal" : t.inputMode;
  }, true);
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || !t.matches(SEL) || !active()) return;
    if (t.inputMode !== "none") t.inputMode = "none";
    show(t);
  });
  // a real button / link tapped while the pad is open: the typed number is saved and the pad closes before the button acts
  document.addEventListener("click", (e) => {
    if (!cur || !pad?.classList.contains("on") || e.target.closest?.(".kpad") || e.target.closest?.(SEL)) return;
    if (e.target.closest?.("button, a, select, summary, [role=button], [data-unit]")) hide();
  }, true);
  document.addEventListener("focusout", (e) => {
    if (e.target !== cur) return;
    const was = cur, sel = selOf(was);
    setTimeout(() => {
      const a = document.activeElement;
      if (a instanceof HTMLInputElement && a.matches(SEL)) return;
      if (!pad?.classList.contains("on")) return; // closed on purpose
      const want = pendingSel || (!was.isConnected ? sel : null); // the panel was re-drawn: the field we were going to
      pendingSel = null;
      if (want) { const again = document.querySelector(want); if (again) { again.focus(); again.select?.(); return; } }
      // v100 (Amr: the pad closed by itself as if he had tapped the background): a tap on empty space keeps the pad open on the same
      // field — only ✓ / ⌄ / «التالي», a real button or link, or another text field close it
      const d = lastDown;
      const real = d && d.isConnected && d.closest?.("button, a, select, textarea, input, label, summary, [role=button], [data-unit], [data-jump], canvas");
      if (!real && was.isConnected) { was.focus({ preventScroll: true }); return; }
      if (!real && !was.isConnected && sel) { const again = document.querySelector(sel); if (again) { again.focus({ preventScroll: true }); return; } }
      hide();
    }, 30);
  });
}

function build() {
  pad = document.createElement("div");
  pad.className = "kpad";
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", "لوحة الأرقام");
  const K = (k, label, cls = "") => `<button type="button" data-k="${k}" class="${cls}">${label}</button>`;
  pad.innerHTML = `<div class="kpbar"><span class="kplabel"></span><b class="kpval" dir="ltr"></b><button type="button" data-k="ok" class="kpok">✓ تأكيد</button><button type="button" data-k="close" class="kpx" aria-label="قفل">⌄</button></div>
    <div class="kpkeys">
      ${K("7", "7")}${K("8", "8")}${K("9", "9")}${K("back", "⌫", "kfn")}
      ${K("4", "4")}${K("5", "5")}${K("6", "6")}${K("minus", "−", "kfn")}
      ${K("1", "1")}${K("2", "2")}${K("3", "3")}${K("plus", "+", "kfn")}
      ${K(".", ".", "")}${K("0", "0")}${K("clear", "مسح", "kfn")}${K("next", "التالي ↵", "kgo")}
    </div>
    <div class="kpkeys kpextra">${K("neg", "± سالب", "kfn")}${K(",", ",", "kfn")}${K("x", "× نسخ", "kfn")}${K("/", "÷ قسّم", "kfn")}${K("s", "أضلاع s", "kfn")}</div>`;
  // keep the focus in the field: keys never take it
  pad.addEventListener("pointerdown", (e) => { e.preventDefault(); const b = e.target.closest("button"); if (b) press(b.dataset.k, b); });
  pad.addEventListener("click", (e) => e.preventDefault());
  document.body.appendChild(pad);
}
function labelOf(t) {
  const l = t.closest("label")?.querySelector("span")?.textContent || t.getAttribute("aria-label") || t.placeholder || "";
  return l.trim();
}
function show(t) {
  if (!pad) build();
  const same = t === cur && pad.classList.contains("on"); // the same field taking the focus back (a tap on the background): keep what is typed
  if (cur && cur !== t && dirty) commit(cur); // tapped straight into another field: the number typed so far still counts
  if (!same) { cur = t; fresh = true; dirty = false; startVal = t.value; }
  pad.querySelector(".kplabel").textContent = labelOf(t);
  // the drawing studio's size box: sizes like 60,40 · x5 · /4 · 24s · −2 (a cut), and the pad off to the side
  const ex = t.hasAttribute("data-kpextra") || t.hasAttribute("data-kpcomma");
  pad.classList.toggle("extra", ex);
  pad.classList.toggle("comma", t.hasAttribute("data-kpcomma")); // v118: a list of sizes — only the comma key is added
  pad.classList.toggle("side", !!t.closest("#drawStudio"));
  sync();
  pad.classList.add("on");
  document.body.classList.add("kpad-on");
  document.documentElement.style.setProperty("--kpad-h", pad.offsetHeight + "px");
  if (!same) setTimeout(() => t.scrollIntoView?.({ block: "center", behavior: "smooth" }), 60);
}
function hide(fromKey = false) {
  if (!pad) return;
  pad.classList.remove("on");
  document.body.classList.remove("kpad-on");
  if (fromKey) closedAt = Date.now();
  // swallow the click that WebKit sends to whatever is under the finger once the pad is gone
  if (fromKey) {
  const eat = (e) => { if (Date.now() - closedAt < 600 && !e.target.closest?.(".kpad")) { e.preventDefault(); e.stopImmediatePropagation(); } document.removeEventListener("click", eat, true); };
  document.addEventListener("click", eat, true);
  setTimeout(() => document.removeEventListener("click", eat, true), 650);
  }
  if (cur) commit(cur);
  cur = null;
}
function sync() { if (pad && cur) pad.querySelector(".kpval").textContent = cur.value || "—"; }
let dirty = false, startVal = null;
/** live = tell the app on every key (the survey's live notes); elsewhere the number waits for ✓ */
const live = (t) => !!t?.closest?.("#survey");
function put(v) {
  cur.value = v;
  if (live(cur)) cur.dispatchEvent(new Event("input", { bubbles: true }));
  else dirty = true;
  sync();
}
/** hand the typed number to the app (input + change), once */
function commit(t = cur) {
  if (!t) return;
  // nothing typed and the value is what the field showed: no change event (a «change» with the shown value would
  // overwrite every multi-selected unit with it)
  const changed = dirty || (t === cur && t.value !== startVal);
  if (!changed) return;
  // v124: «60+7.5» typed with the + / − keys is worked out before the app gets it
  if (/^-?\d*\.?\d+([+\-]\d*\.?\d+)+$/.test(String(t.value))) { const m = String(t.value).match(/-?\d*\.?\d+|[+\-]\d*\.?\d+/g) || []; t.value = String(Math.round(m.reduce((a, x) => a + parseFloat(x), 0) * 100) / 100); if (t === cur) sync(); }
  if (dirty && !live(t)) t.dispatchEvent(new Event("input", { bubbles: true }));
  dirty = false;
  if (t === cur) startVal = t.value;
  t.dispatchEvent(new Event("change", { bubbles: true }));
}
function step(dir) {
  const inc = +cur.dataset.inc || 1;
  const n = parseFloat(String(cur.value).replace(/[^\d.\-]/g, "")) || 0;
  const v = Math.round((n + dir * inc) * 100) / 100;
  put(String(Math.max(cur.dataset.neg !== undefined ? -1e9 : 0, v)));
  commit();
  fresh = false;
}
function fields() {
  const root = cur.closest(".svbody, .props, .popbox, .svpopbox, #props, .cl-side, main, section") || document;
  return [...root.querySelectorAll("input:not([type=checkbox]):not([type=file]):not([type=range]):not([type=color]), textarea")]
    .filter((x) => x.offsetParent !== null && !x.disabled && !x.closest("details:not([open])") && (x === cur || x.matches(SEL)));
}
const KEYS = ["data-num", "data-sv", "data-auto", "data-rw", "data-ro", "data-rp", "data-rc", "data-rf", "data-xnum", "id"];
const NOT_KEY = new Set(["data-numf", "data-kpextra", "data-kpsolo", "data-inc", "data-neg", "data-keypad"]);
/** a selector that finds the same field again after the panel is re-drawn — scoped by the nearest row
 *  container (data-pi="3", data-qi …) when several rows share the same field attribute (data-pf="w") */
function selOf(x) {
  const base = selBase(x);
  if (!base || !x.isConnected) return base;
  const hits = document.querySelectorAll(base);
  if (hits.length <= 1 && (!hits.length || hits[0] === x)) return base;
  for (let a = x.parentElement; a && a !== document.body; a = a.parentElement) {
    const at = [...a.attributes].find((q) => (q.name.startsWith("data-") || q.name === "id") && q.value);
    if (!at) continue;
    const scope = at.name === "id" ? `#${CSS.escape(at.value)}` : `[${at.name}="${CSS.escape(at.value)}"]`;
    const sel = `${scope} ${base}`;
    if (document.querySelector(sel) === x) return sel;
  }
  return base;
}
function selBase(x) {
  for (const k of KEYS) { const v = x.getAttribute(k); if (v) return k === "id" ? `#${CSS.escape(v)}` : `input[${k}="${CSS.escape(v)}"]`; }
  // any other data-* attribute with a value (data-price="sheets.X", data-co, data-def …), plus a second one when there is (data-gsz + data-gkey)
  const ds = [...x.attributes].filter((a) => a.name.startsWith("data-") && a.value && !NOT_KEY.has(a.name)).slice(0, 2);
  return ds.length ? "input" + ds.map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join("") : null;
}
function press(k, b) {
  if (!cur) return;
  b?.classList.add("hit"); setTimeout(() => b?.classList.remove("hit"), 120);
  if (k === "ok" && cur.hasAttribute("data-kpsolo")) { // the studio's size box applies its value on Enter only
    const t = cur;
    commit(t);
    t.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    closedAt = Date.now(); hide(true); t.blur(); return;
  }
  if (k === "close" || k === "ok") { closedAt = Date.now(); const t = cur; hide(true); t.blur(); return; }
  if (k === "next") {
    const t = cur;
    const all = t.closest("#survey") ? [] : fields(), i = all.indexOf(t); // before the change re-draws the panel
    const nx = all[i + 1], sel = nx && selOf(nx);
    commit(t);
    // the survey moves on itself on Enter; elsewhere: the next field, or close
    if (t.hasAttribute("data-kpsolo")) { t.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); hide(true); return; }
    if (t.closest("#survey")) { t.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); return; }
    if (!nx) { closedAt = Date.now(); t.blur(); hide(true); return; }
    pendingSel = sel;
    const live = nx.isConnected ? nx : sel && document.querySelector(sel);
    if (live) { live.focus(); live.select?.(); }
    // the change may have re-drawn the panel: find the same next field again and keep going
    setTimeout(() => { pendingSel = null; if (!nx.isConnected && sel) { const again = document.querySelector(sel); if (again && document.activeElement !== again) { again.focus(); again.select?.(); } } }, 80);
    return;
  }
  if ((k === "plus" || k === "minus") && cur.hasAttribute("data-kpextra")) { // typing a sign, not stepping
    let v = String(cur.value ?? ""); if (fresh) { v = ""; fresh = false; }
    put(k === "minus" ? (v.startsWith("-") ? v : "-" + v) : v.replace(/^-/, "")); return;
  }
  // v124: after typing a number, + / − write an addition («60+7.5» = 67.5); on a number not touched yet they step it by 1
  if ((k === "plus" || k === "minus") && !fresh && dirty && /\d$/.test(String(cur.value ?? ""))) { put(String(cur.value) + (k === "plus" ? "+" : "-")); return; }
  if (k === "plus" || k === "minus") { step(k === "plus" ? 1 : -1); return; }
  if (k === "neg") { let v = String(cur.value ?? ""); if (fresh) { v = ""; fresh = false; } put(v.startsWith("-") ? v.slice(1) : "-" + v); return; }
  if (k === "," || k === "x" || k === "/" || k === "s") { let v = String(cur.value ?? ""); if (fresh && k !== ",") { v = ""; } fresh = false; put(v + k); return; }
  let v = String(cur.value ?? "");
  if (fresh && /^[\d.]$/.test(k)) { v = ""; fresh = false; } // the first key replaces the old number
  fresh = false;
  if (k === "back") v = v.slice(0, -1);
  else if (k === "clear") v = "";
  else if (k === ".") { if (!v.includes(".")) v = (v || "0") + "."; }
  else v += k;
  put(v);
}
