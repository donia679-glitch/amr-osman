// NOVERA Studio — optional modules (v126). Each module lives in its own folder, is OFF by default and is only
// loaded (dynamic import) when its switch in ⚙ «🧩 الموديولات» is on — a module that is off costs nothing and
// touches nothing. A module's default export:
//   { init(api), destroy?(), slots?: { cut, home, menu, unit(u), export, cutopts }, cmd?(): [{label, run, hint}], action?(act, el) }
// slots return HTML; buttons inside use data-mod="<id>:<action>" and land in action(). The app talks to a module only here.
export const MODULES = [
  { id: "cutfit", dir: "cutfit", icon: "🎯", name: "التصميم الواعي بالقص", desc: "بعد ما التصميم يخلص يجرب تعديلات صغيرة بالمللي في حدود سماحية تحددها علشان القطع ترص أحسن والهالك يقل — وإنت توافق على كل تعديل." },
  { id: "autogen", dir: "autogen", icon: "🏠", name: "5 تصميمات تلقائية", desc: "مقاسات المكان + أماكن المرافق + الميزانية ← 5 تصميمات مختلفة مترتبة بالتكلفة ومثلث الشغل والهالك، وتختار واحد تكمّل عليه." },
  { id: "twin", dir: "twin", icon: "🔗", name: "النسخة الرقمية للمطبخ", desc: "QR يتلزق جوه الدولاب: العميل يلاقي تصميم مطبخه وقطعه وخاماته بعد سنين، ويطلب صيانة أو قطعة أو إضافة." },
  { id: "guard", dir: "guard", icon: "🛡", name: "حماية المحركات (سيرفر)", desc: "القص الذكي والتسعير يشتغلوا على سيرفرك (Cloudflare) بعد التأكد من الاشتراك — ومن غير نت التطبيق بيكمّل بالمحرك العادي." },
  { id: "photo", dir: "photo", icon: "📷", name: "صورة ← مطبخ", desc: "صورة مطبخ (Pinterest مثلاً) ← تصميم بوحداتك وخاماتك وقايمة قطع وسعر مبدئي. مجاني بالتعليم على الصورة، أو أوتوماتيك بمفتاح API بتاعك." },
];
const loaded = new Map();
let API = null;
export const isOn = (state, id) => !!state?.modules?.[id];
export function setApi(api) { API = api; }
export async function load(id) {
  if (loaded.has(id)) return loaded.get(id);
  const m = MODULES.find((x) => x.id === id);
  if (!m) return null;
  try {
    const mod = (await import(`./${m.dir}/index.js`)).default;
    await mod.init?.(API, m);
    loaded.set(id, mod);
    return mod;
  } catch (err) {
    console.error("module", id, err);
    API?.alertBar?.(`الموديول «${m.name}» ما اشتغلش: ${err.message || err}`);
    return null;
  }
}
export function unload(id) {
  const mod = loaded.get(id);
  try { mod?.destroy?.(); } catch (err) { console.error(err); }
  unprovide(id);
  loaded.delete(id);
}
export async function loadAll(state) {
  for (const m of MODULES) if (isOn(state, m.id)) await load(m.id);
}
/** the HTML every running module puts in one place of the app ("" when none) */
export function slot(name, ...args) {
  let h = "";
  for (const [id, mod] of loaded) {
    const f = mod.slots?.[name];
    if (!f) continue;
    try { h += f(...args) || ""; } catch (err) { console.error("slot", id, name, err); }
  }
  return h;
}
export function cmd() {
  const out = [];
  for (const [id, mod] of loaded) { try { for (const it of mod.cmd?.() || []) out.push({ ...it, mod: id }); } catch (err) { console.error(err); } }
  return out;
}
export async function action(spec, el) {
  const i = spec.indexOf(":"), id = i < 0 ? spec : spec.slice(0, i), act = i < 0 ? "" : spec.slice(i + 1);
  const mod = loaded.get(id) || (API?.state && isOn(API.state, id) ? await load(id) : null);
  if (!mod) { API?.alertBar?.("الموديول ده مقفول — شغّله من ⚙ «🧩 الموديولات»"); return; }
  try { await mod.action?.(act, el); } catch (err) { console.error(err); API?.alertBar?.(err.message || "ما كملش"); }
}
export const running = () => [...loaded.keys()];
// engines a module can provide for the others (the «guard» module routes the smart engines through the server):
// provide("cutEval", fn) · engine("cutEval", localFn)(…args) → the provided one when its module is on, else the local one
const engines = new Map();
export function provide(name, fn, owner) { engines.set(name, { fn, owner }); }
export function unprovide(owner) { for (const [k, v] of engines) if (v.owner === owner) engines.delete(k); }
export function engine(name, local) {
  const e = engines.get(name);
  if (!e || !loaded.has(e.owner)) return local;
  return async (...args) => { try { return await e.fn(...args); } catch (err) { console.warn("engine", name, "→ local", err); return local(...args); } };
}
