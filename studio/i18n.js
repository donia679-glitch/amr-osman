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
  for (let i = 0; i < w.length;) {
    let hit = 0;
    for (let j = w.length; j > i; j--) { const c = w.slice(i, j).join(" "); const v = dict[c] ?? dict[c.replace(/[.,:،؛؟!)]+$/, "")]; if (v != null) { out.push(v + (dict[c] == null ? c.match(/[.,:،؛؟!)]+$/)?.[0].replace("،", ",").replace("؛", ";").replace("؟", "?") || "" : "")); hit = j; break; } }
    if (hit) i = hit; else { out.push(w[i]); i++; }
  }
  return out.join(" ");
}
/** translate one string (Arabic → English); returns it unchanged in Arabic mode */
export function tr(s) {
  if (!dict || s == null) return s;
  s = String(s);
  if (!HAS.test(s)) return /[٠-٩٬٫]/.test(s) ? digits(s) : s;
  const c = cache.get(s);
  if (c != null) return c;
  const t0 = s.trim();
  let out;
  if (dict[t0] != null) out = s.replace(t0, dict[t0]);
  else {
    out = s.replace(/(\d[\d:٠-٩]*)\s*م(?=$|\s|[^؀-ۿ])/g, "$1 PM").replace(/(\d[\d:٠-٩]*)\s*ص(?=$|\s|[^؀-ۿ])/g, "$1 AM");
    out = out.replace(RUN, (r) => { const k = r.trim(); return dict[k] ?? words(k); });
    out = out.replace(/[،]/g, ",").replace(/؛/g, ";").replace(/؟/g, "?").replace(/[«»]/g, '"');
  }
  out = digits(out).replace(/←/g, "→");
  if (cache.size > 20000) cache.clear();
  cache.set(s, out);
  return out;
}
/** text inside markup (an SVG page, an HTML document) — tags and attributes other than visible text stay */
export function trMarkup(m) {
  if (!dict) return m;
  return String(m).replace(/>([^<]+)</g, (a, t) => ">" + tr(t) + "<").replace(/(aria-label|title|placeholder|alt)="([^"]*)"/g, (a, k, v) => `${k}="${tr(v).replace(/"/g, "&quot;")}"`);
}
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE"]);
function skipEl(el) { return !el || SKIP.has(el.nodeName) || el.closest?.("[data-noi18n],[contenteditable=true]"); }
function doText(n) { if (skipEl(n.parentElement)) return; const t = tr(n.data); if (t !== n.data) n.data = t; }
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
