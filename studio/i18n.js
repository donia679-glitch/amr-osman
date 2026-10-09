// NOVERA Studio — the app's language. Arabic is the source; English is a translation layer over the live
// page: every text node, placeholder, title and label is looked up in i18n/en.json as it appears (whole
// string first, then each Arabic run, then the longest known word runs), digits become Latin, and the page
// turns left-to-right. Exported files go through the same tr() before they are written.
const KEY = "novera-lang";
const AR = "؀-ۿݐ-ݿ";
const RUN = new RegExp(`[${AR}](?:[${AR}\\s\\u200c\\u200f،؛؟:«»\\-–—.,()/!?%٪]*[${AR}?!.)»:؟])?`, "g");
const HAS = new RegExp(`[${AR}]`);
let dict = null;
const cache = new Map();
// what the user typed (project names, unit names they gave, notes) is never translated: the app hands a
// function that lists them; inside a longer text they are kept aside while the rest is translated
let userFn = null, userList = [], userSig = "", userTick = false;
export function setUserTexts(fn) { userFn = fn; }
function users() {
  if (!userFn || userTick) return userList; // read once per batch of DOM changes
  userTick = true; queueMicrotask(() => { userTick = false; });
  let l = [];
  try { l = (userFn() || []).map((x) => String(x ?? "").trim()).filter((x) => x.length > 1 && HAS.test(x) && dict?.[x] == null); } catch { l = []; }
  l = [...new Set(l)].sort((a, b) => b.length - a.length);
  const sig = l.join("\u0001");
  if (sig !== userSig) { userSig = sig; userList = l; cache.clear(); }
  return userList;
}
export let lang = (() => { try { return localStorage.getItem(KEY) || "ar"; } catch { return "ar"; } })();
export const isEn = () => lang === "en" && !!dict;
export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch { /* */ }
  try { window.webkit?.messageHandlers?.noveraLang?.postMessage(l); } catch { /* not in the app */ }
  location.reload();
}
const digits = (s) => s.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/٬/g, ",").replace(/٫/g, ".").replace(/٪/g, "%");
function words(run) {
  const w = run.split(/\s+/), out = [];
  let miss = 0;
  for (let i = 0; i < w.length;) {
    let hit = 0;
    for (let j = w.length; j > i; j--) {
      const c = w.slice(i, j).join(" ");
      if (dict[c] != null) { out.push(dict[c]); hit = j; break; }
      // brackets / quotes / punctuation around the words: «(فراغ» → «(» + فراغ
      const lead = c.match(/^[(«"]+/)?.[0] || "", rest = c.slice(lead.length), trail = rest.match(/[.,:،؛؟!)»"]+$/)?.[0] || "", core = rest.slice(0, rest.length - trail.length);
      const v = core && (lead || trail) ? dict[core] : null;
      if (v != null) { out.push(lead + v + trail.replace("،", ",").replace("؛", ";").replace("؟", "?")); hit = j; break; }
    }
    if (hit) i = hit; else { if (/[ء-ي]/.test(w[i])) miss++; out.push(w[i]); i++; }
  }
  // a sentence the dictionary only knows some words of stays whole in Arabic — word-by-word it came out
  // as half English, half Arabic («Box Walnut on Bottom بيضا بسطح High»)
  if (miss) return null;
  return out.join(" ");
}
// "10 Part" → "10 parts" (Arabic counts its nouns in the singular after 11+)
const PL = { part: "parts", unit: "units", door: "doors", drawer: "drawers", sheet: "sheets", wall: "walls", board: "boards", shelf: "shelves", point: "points", piece: "pieces", hole: "holes", copy: "copies", leaf: "leaves", item: "items", week: "weeks", day: "days", month: "months", year: "years", project: "projects", panel: "panels", hinge: "hinges", handle: "handles", offcut: "offcuts", label: "labels", cut: "cuts", side: "sides", window: "windows" };
function plural(s) {
  return s.replace(/(^|[^\w.])(\d+(?:[.,]\d+)?)(\s+(?:\/\s*\d+\s+)?)([A-Z]?[a-z]+)\b/g, (m, pre, n, sp, w) => {
    const k = w.toLowerCase(), p = PL[k];
    if (!p || +n.replace(",", ".") === 1) return m;
    return pre + n + sp + (w[0] === w[0].toUpperCase() && sp.includes("/") ? p : p);
  });
}
/** translate one string (Arabic → English); returns it unchanged in Arabic mode */
export function tr(s) {
  if (!dict || s == null) return s;
  s = String(s);
  if (!HAS.test(s)) return /[٠-٩٬٫]/.test(s) ? digits(s) : s;
  const U = users(); // first: a new name of the user's clears what was cached
  const c = cache.get(s);
  if (c != null) return c;
  const t0 = s.trim();
  let out;
  const own = U.length ? U.filter((x) => s.includes(x)) : [];
  if (own.includes(t0)) out = s;
  else if (dict[t0] != null) out = s.replace(t0, dict[t0]);
  else {
    // the user's own words inside the text: set aside (private-use marks, never part of an Arabic run)
    out = own.reduce((a, x, i) => a.split(x).join(`\ue000${i}\ue001`), s);
    // clock times only (10:30 م) — a bare "م" after a number is metres (2.7 م², 11.6 م شريط)
    out = out.replace(/([0-9٠-٩]{1,2}:[0-9٠-٩]{2})\s*م(?![؀-ۿ²])/g, "$1 PM").replace(/([0-9٠-٩]{1,2}:[0-9٠-٩]{2})\s*ص(?![؀-ۿ])/g, "$1 AM");
    // "وPDF" / "عبرQR" / "الـ3D": an Arabic word glued to a Latin one
    out = out.replace(/(^|[\s(])و(?=[A-Za-z])/g, "$1and ").replace(/([ء-يـ])([A-Za-z0-9])/g, "$1 $2").replace(/([A-Za-z])([؀-ۿ])/g, "$1 $2");
    out = out.replace(RUN, (r) => { const k = r.trim(); return dict[k] ?? words(k) ?? r; });
    out = out.replace(/[،]/g, ",").replace(/؛/g, ";").replace(/؟/g, "?").replace(/[«»]/g, '"');
    if (own.length) out = out.replace(/\ue000(\d+)\ue001/g, (m, i) => own[+i]);
  }
  out = plural(digits(out).replace(/←/g, "→"));
  if (cache.size > 20000) cache.clear();
  cache.set(s, out);
  return out;
}
/** text inside markup (an SVG page, an HTML document) — tags and attributes other than visible text stay */
export function trMarkup(m) {
  if (!dict) return m;
  // translations can bring a bare & or < (e.g. "Warranty & maintenance") — keep the markup valid
  const safe = (t) => t.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;");
  return String(m).replace(/>([^<]+)</g, (a, t) => ">" + safe(tr(t)) + "<").replace(/(aria-label|title|placeholder|alt)="([^"]*)"/g, (a, k, v) => `${k}="${safe(tr(v)).replace(/"/g, "&quot;")}"`);
}
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE"]);
function skipEl(el) { return !el || SKIP.has(el.nodeName) || el.closest?.("[data-noi18n],[contenteditable=true]"); }
// a text of brackets and digits only («(0)») next to text that was just translated kept its right-to-left
// layout (shown «)0(») — a left-to-right mark makes it lay out again, left to right
const BRK = /^[^A-Za-z\u0600-\u06ff]*[()[\]{}][^A-Za-z\u0600-\u06ff]*$/;
function doText(n) { if (skipEl(n.parentElement)) return; const t = tr(n.data); if (t !== n.data) n.data = t; else if (dict && n.data[0] !== "\u200e" && BRK.test(n.data)) n.data = "\u200e" + n.data; }
function doAttrs(el) { for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v && HAS.test(v)) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } } }
function walk(root) {
  if (root.nodeType === 3) { doText(root); return; }
  if (root.nodeType !== 1 || skipEl(root)) return;
  doAttrs(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.nextNode(); n; n = it.nextNode()) { if (n.nodeType === 3) doText(n); else if (!skipEl(n)) doAttrs(n); }
}
export async function init() {
  try { window.webkit?.messageHandlers?.noveraLang?.postMessage(lang); } catch { /* not in the app */ }
  if (lang !== "en") return;
  try { dict = await (await fetch(new URL("./i18n/en.json", import.meta.url))).json(); } catch { dict = null; return; }
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.documentElement.classList.add("lang-en");
  document.title = "NOVERA Studio";
  walk(document.body);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === "childList") m.addedNodes.forEach(walk);
      else if (m.type === "characterData") { if (HAS.test(m.target.data) || /[٠-٩]/.test(m.target.data)) doText(m.target); }
      else if (m.type === "attributes") { const el = m.target, v = el.getAttribute(m.attributeName); if (v && HAS.test(v)) doAttrs(el); }
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // dialogs the app raises
  const c0 = window.confirm?.bind(window), p0 = window.prompt?.bind(window), a0 = window.alert?.bind(window);
  if (c0) window.confirm = (m) => c0(tr(m));
  if (p0) window.prompt = (m, d) => p0(tr(m), d);
  if (a0) window.alert = (m) => a0(tr(m));
}
