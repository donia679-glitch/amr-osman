// NOVERA Studio — the app's own number pad. On a touch screen every number field (data-numf, the survey's
// data-len fields, anything with data-keypad) opens this pad instead of the system keyboard: big keys,
// ± step, next field, done. It types into the field and fires the same input / change / Enter events
// the keyboard would, so the rest of the app does not know the difference.
const SEL = "input[data-numf], input[data-len], input[data-keypad]";
let on = () => true, pad = null, cur = null, fresh = false, pendingSel = null;

const isTouch = () => matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
export const active = () => on() && isTouch();

export function init({ enabled } = {}) {
  if (enabled) on = enabled;
  // before the field takes focus: no system keyboard for it
  document.addEventListener("pointerdown", (e) => {
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
  pad.innerHTML = `<div class="kpbar"><span class="kplabel"></span><b class="kpval" dir="ltr"></b><button type="button" data-k="close" class="kpx" aria-label="قفل">⌄</button></div>
    <div class="kpkeys">
      ${K("7", "7")}${K("8", "8")}${K("9", "9")}${K("back", "⌫", "kfn")}
      ${K("4", "4")}${K("5", "5")}${K("6", "6")}${K("minus", "−", "kfn")}
      ${K("1", "1")}${K("2", "2")}${K("3", "3")}${K("plus", "+", "kfn")}
      ${K(".", ".", "")}${K("0", "0")}${K("clear", "مسح", "kfn")}${K("next", "التالي ↵", "kgo")}
    </div>`;
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
  cur = t; fresh = true;
  pad.querySelector(".kplabel").textContent = labelOf(t);
  sync();
  pad.classList.add("on");
  document.body.classList.add("kpad-on");
  document.documentElement.style.setProperty("--kpad-h", pad.offsetHeight + "px");
  setTimeout(() => t.scrollIntoView?.({ block: "center", behavior: "smooth" }), 60);
}
function hide() {
  if (!pad) return;
  pad.classList.remove("on");
  document.body.classList.remove("kpad-on");
  if (cur) cur.dispatchEvent(new Event("change", { bubbles: true }));
  cur = null;
}
function sync() { if (pad && cur) pad.querySelector(".kpval").textContent = cur.value || "—"; }
function put(v) {
  cur.value = v;
  cur.dispatchEvent(new Event("input", { bubbles: true }));
  sync();
}
function step(dir) {
  const inc = +cur.dataset.inc || 1;
  const n = parseFloat(String(cur.value).replace(/[^\d.\-]/g, "")) || 0;
  const v = Math.round((n + dir * inc) * 100) / 100;
  put(String(Math.max(cur.dataset.neg !== undefined ? -1e9 : 0, v)));
  cur.dispatchEvent(new Event("change", { bubbles: true }));
  fresh = false;
}
function fields() {
  const root = cur.closest(".svbody, .props, .popbox, .svpopbox, #props, .cl-side, main, section") || document;
  return [...root.querySelectorAll("input:not([type=checkbox]):not([type=file]):not([type=range]):not([type=color]), textarea")]
    .filter((x) => x.offsetParent !== null && !x.disabled && !x.closest("details:not([open])"));
}
const KEYS = ["data-num", "data-sv", "data-auto", "data-rw", "data-ro", "data-rp", "data-rc", "data-rf", "data-xnum", "id"];
function selOf(x) {
  for (const k of KEYS) { const v = x.getAttribute(k); if (v) return k === "id" ? `#${CSS.escape(v)}` : `input[${k}="${CSS.escape(v)}"]`; }
  return null;
}
function press(k, b) {
  if (!cur) return;
  b?.classList.add("hit"); setTimeout(() => b?.classList.remove("hit"), 120);
  if (k === "close") { cur.blur(); hide(); return; }
  if (k === "next") {
    const t = cur;
    const all = t.closest("#survey") ? [] : fields(), i = all.indexOf(t); // before the change re-draws the panel
    const nx = all[i + 1], sel = nx && selOf(nx);
    t.dispatchEvent(new Event("change", { bubbles: true }));
    // the survey moves on itself on Enter; elsewhere: the next field, or close
    if (t.hasAttribute("data-kpsolo")) { t.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); hide(); return; }
    if (t.closest("#survey")) { t.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); return; }
    if (!nx) { t.blur(); hide(); return; }
    pendingSel = sel;
    const live = nx.isConnected ? nx : sel && document.querySelector(sel);
    if (live) { live.focus(); live.select?.(); }
    // the change may have re-drawn the panel: find the same next field again and keep going
    setTimeout(() => { pendingSel = null; if (!nx.isConnected && sel) { const again = document.querySelector(sel); if (again && document.activeElement !== again) { again.focus(); again.select?.(); } } }, 80);
    return;
  }
  if (k === "plus" || k === "minus") { step(k === "plus" ? 1 : -1); return; }
  let v = String(cur.value ?? "");
  if (fresh && /^[\d.]$/.test(k)) { v = ""; fresh = false; } // the first key replaces the old number
  fresh = false;
  if (k === "back") v = v.slice(0, -1);
  else if (k === "clear") v = "";
  else if (k === ".") { if (!v.includes(".")) v = (v || "0") + "."; }
  else v += k;
  put(v);
}
