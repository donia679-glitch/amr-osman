// «📷 صورة ← مطبخ» — the one intermediate «spec» both paths produce, and the AI reader (owner's own key only).
//
// spec = { v: 1, src: "manual" | "ai", shape: 1 | 2 | 3 (walls: I / L / U, left → right as seen in the photo),
//   handle: "bar" | "knob" | "gola" | "edge_pull" | "none",
//   libs: { front, upper (wall units' fronts, null = same), carcass, counter } (catalogue codes),
//   colors: { front, upper, carcass, counter } ("#rrggbb" seen in the photo),
//   walls: [{ len: cm (the run along the floor, corner included),
//             lower: [{ t, w }] (base + tall units left → right, widths cm as seen),
//             upper: [{ t, x, w }] (wall units: x from the run's left end, cm) }] }
import * as G from "./geom.js";

/** unit types: [label, row(s) they belong to] — lower row = base + tall */
export const LOWER = {
  doors: "ضلف", drawers: "أدراج", sink: "حوض", hob: "بوتجاز", oven: "فرن تحت الرخامة", dish: "غسالة أطباق", open: "رف مفتوح", glass: "زجاج", corner: "ركنة",
  fridge: "تلاجة (طويل)", toven: "عمود فرن (طويل)", pantry: "دولاب طويل",
};
export const UPPER = { doors: "ضلف", glass: "زجاج", open: "رف مفتوح", flip: "قلاب", hood: "شفاط", corner: "ركنة", gap: "فاضي" };
export const TALL = new Set(["fridge", "toven", "pantry"]);
export const HANDLES = { bar: "مقبض بخرمين", knob: "زرار", gola: "بلت إن (جولا)", edge_pull: "مقبض حرف", none: "من غير مقبض" };
export const ICONS = { doors: "🚪", drawers: "🗄", sink: "🚰", hob: "🔥", oven: "♨️", dish: "🍽", open: "📚", glass: "🪟", corner: "📐", fridge: "🧊", toven: "♨️", pantry: "🥫", flip: "⤴", hood: "💨", gap: "▫" };

// English / loose words the AI (or an old spec) may use → our types
const SYN = {
  door: "doors", doors: "doors", cabinet: "doors", cupboard: "doors", base: "doors", wall: "doors", ضلف: "doors", ضلفة: "doors",
  drawer: "drawers", drawers: "drawers", أدراج: "drawers", درج: "drawers",
  sink: "sink", حوض: "sink", hob: "hob", cooktop: "hob", stove: "hob", cooker: "hob", range: "hob", بوتجاز: "hob",
  oven: "oven", built_in_oven: "oven", فرن: "oven", tall_oven: "toven", oven_column: "toven", oven_tower: "toven", toven: "toven",
  dishwasher: "dish", dish: "dish", غسالة: "dish", open: "open", open_shelf: "open", shelf: "open", shelves: "open", رف: "open",
  glass: "glass", glass_door: "glass", vitrine: "glass", زجاج: "glass", corner: "corner", ركنة: "corner",
  fridge: "fridge", refrigerator: "fridge", تلاجة: "fridge", pantry: "pantry", tall: "pantry", tall_cabinet: "pantry", larder: "pantry",
  flip: "flip", lift_up: "flip", liftup: "flip", flip_up: "flip", قلاب: "flip", hood: "hood", extractor: "hood", range_hood: "hood", شفاط: "hood",
  gap: "gap", empty: "gap", none: "gap", فاضي: "gap", microwave: "doors",
};
export function typeOf(s, row) {
  const k = String(s ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  let t = SYN[k] || SYN[k.replace(/s$/, "")] || null;
  if (!t) for (const [w, v] of Object.entries(SYN)) if (k.includes(w)) { t = v; break; }
  const ok = row === "upper" ? UPPER : LOWER;
  if (t && ok[t]) return t;
  if (row === "upper" && (t === "drawers" || t === "pantry")) return "doors";
  if (row !== "upper" && (t === "flip" || t === "hood")) return "doors";
  return row === "upper" && t === "gap" ? "gap" : "doors";
}

// ------------------------------------------------------------------ the AI reader
export const DEFAULT_MODEL = "claude-sonnet-5-5";
export const PROMPT = `You are reading a photo of a fitted kitchen for a carpentry factory that will rebuild it with its own standard cabinets (base units 90 cm to the counter top, wall units 145–225 cm, tall units 225 cm).
Return ONLY one JSON object, no prose, no markdown fences, exactly this shape:
{
 "shape": "I" | "L" | "U",
 "walls": [
  {
   "quad": [[x,y],[x,y],[x,y],[x,y]],
   "length_cm": number or null,
   "lower": [ { "type": "doors|drawers|sink|hob|oven|dishwasher|open|glass|corner|fridge|tall_oven|pantry", "w": number } ],
   "upper": [ { "type": "doors|glass|open|flip|hood|corner", "from": number, "to": number } ]
  }
 ],
 "colors": { "front": "#rrggbb", "upper_front": "#rrggbb or null", "carcass": "#rrggbb", "counter": "#rrggbb" },
 "handle": "bar|knob|gola|edge_pull|none"
}
Rules:
- walls: the runs of cabinets as seen in the photo, ordered LEFT to RIGHT (1 wall = I, 2 = L, 3 = U). Units on each wall also left to right.
- quad: the front face of that wall's base row as 4 image points in fractions of the image (0..1, x from the left, y from the top): floor-left, floor-right, counter-top-right, counter-top-left. Floor = bottom of the plinth; counter top = top edge of the worktop. For an L/U the corner is the shared end.
- lower: every unit standing on the floor (base units AND tall units such as fridge housings, oven towers, pantries), with "w" = its width as a fraction of that wall's run (corrected for perspective; the w values of a wall add up to 1). Use "corner" for the corner unit of an L/U. A freestanding cooker or range = "hob".
- upper: wall cabinets and the hood, "from"/"to" = fractions of the same run (0 = run's left end, 1 = right end); leave gaps (windows, open wall) out.
- length_cm: your best guess of the run length in cm along the floor, or null.
- colors: the dominant colour of the door fronts, of the wall units' fronts if different (else null), of the cabinet sides/carcass, and of the worktop.
- If something is unclear, make the most likely choice; never add fields or comments.`;

/** the model's text → an object (code fences, chatter around it, trailing commas, single quotes, bare keys repaired) */
export function parseLoose(text) {
  let s = String(text ?? "").trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0) throw new Error("الرد مافيهوش JSON");
  s = b > a ? s.slice(a, b + 1) : s.slice(a);
  const tries = [
    (x) => x,
    (x) => x.replace(/,\s*([}\]])/g, "$1"),
    (x) => x.replace(/,\s*([}\]])/g, "$1").replace(/'/g, '"').replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":').replace(/\/\/[^\n]*/g, ""),
    (x) => closeBrackets(x.replace(/,\s*([}\]])/g, "$1").replace(/,\s*$/, "")),
  ];
  for (const f of tries) { try { return JSON.parse(f(s)); } catch { /* next repair */ } }
  throw new Error("الرد مش JSON سليم حتى بعد التصليح");
}
function closeBrackets(s) {
  const st = [];
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === "\\") i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === "{" || c === "[") st.push(c); else if (c === "}" || c === "]") st.pop();
  }
  if (inStr) s += '"';
  s = s.replace(/,\s*$/, "");
  while (st.length) s += st.pop() === "{" ? "}" : "]";
  return s;
}
const num = (v) => (Number.isFinite(+v) ? +v : null);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
/**
 * the AI's object → checked marks for the editing screen (same as the free path): per wall the 4-point quad (px),
 * joints u (0…1) with their types, the upper segments, colours, handle. Throws a clear Arabic message when nothing usable.
 */
export function aiToMarks(o, imgW, imgH) {
  if (!o || typeof o !== "object") throw new Error("الرد فاضي");
  let walls = Array.isArray(o.walls) ? o.walls : Array.isArray(o.runs) ? o.runs : [];
  walls = walls.filter((w) => w && typeof w === "object").slice(0, 3);
  if (!walls.length) throw new Error("ما لقاش وحدات في الصورة");
  const n = walls.length;
  const out = { shape: n, walls: [], colors: {}, handle: HANDLES[o.handle] ? o.handle : typeOfHandle(o.handle), fixes: [] };
  walls.forEach((w, i) => {
    // the quad: fractions (or px when the numbers are big) → px; a bad one → a default band across the picture
    let q = Array.isArray(w.quad) && w.quad.length === 4 ? w.quad.map((p) => (Array.isArray(p) ? [num(p[0]), num(p[1])] : [num(p?.x), num(p?.y)])) : null;
    if (q && q.every((p) => p[0] != null && p[1] != null)) {
      const big = q.some((p) => p[0] > 1.5 || p[1] > 1.5);
      q = q.map(([x, y]) => (big ? [x, y] : [clamp01(x) * imgW, clamp01(y) * imgH]));
    } else q = null;
    if (!G.quadOk(q)) { q = defaultQuad(i, n, imgW, imgH); out.fixes.push(`حيطة ${i + 1}: مكان الصف اتحط تقريبي — ظبّطه`); }
    const lowerIn = (Array.isArray(w.lower) ? w.lower : Array.isArray(w.base) ? w.base : []).filter((x) => x && typeof x === "object");
    let ws = lowerIn.map((x) => Math.max(0, num(x.w ?? x.width ?? x.rel) ?? 0));
    if (!ws.some((v) => v > 0)) ws = lowerIn.map(() => 1);
    const sum = ws.reduce((a, b) => a + b, 0) || 1;
    const cuts = [], segs = [];
    let acc = 0;
    lowerIn.forEach((x, k) => { if (ws[k] <= 0) return; segs.push({ t: typeOf(x.type, "lower"), man: true }); acc += ws[k] / sum; if (k < lowerIn.length - 1) cuts.push(+acc.toFixed(4)); });
    if (Math.abs(sum - 1) > 0.15 && lowerIn.length && sum > 1.5) out.fixes.push(`حيطة ${i + 1}: العروض اتظبطت على طول الصف`);
    // upper: from / to → cut points; holes between units become «فاضي»
    const up = (Array.isArray(w.upper) ? w.upper : Array.isArray(w.wall) ? w.wall : []).filter((x) => x && typeof x === "object")
      .map((x) => ({ t: typeOf(x.type, "upper"), a: clamp01(num(x.from) ?? 0), b: clamp01(num(x.to) ?? 0) })).filter((x) => x.b - x.a > 0.02).sort((p, r) => p.a - r.a);
    const ucuts = [], usegs = [];
    for (const x of up) {
      const last = ucuts[ucuts.length - 1];
      if (last == null) ucuts.push(x.a);
      else if (x.a > last + 0.01) { usegs.push({ t: "gap", man: true }); ucuts.push(x.a); }
      const a = ucuts[ucuts.length - 1];
      ucuts.push(Math.max(a + 0.02, x.b));
      usegs.push({ t: x.t, man: true });
    }
    out.walls.push({ q, len: null, lenAI: num(w.length_cm ?? w.length) > 50 ? Math.round(num(w.length_cm ?? w.length)) : null, lower: { cuts, segs: segs.length ? segs : [{ t: "doors", man: false }] }, upper: { cuts: ucuts.map((v) => +v.toFixed(4)), segs: usegs } });
  });
  const c = o.colors || {};
  for (const [k, src] of [["front", c.front], ["upper", c.upper_front ?? c.upper], ["carcass", c.carcass], ["counter", c.counter ?? c.countertop]]) {
    const rgb = G.hexRgb(src);
    if (rgb) out.colors[k] = G.rgbHex(rgb);
  }
  return out;
}
function typeOfHandle(h) {
  const k = String(h || "").toLowerCase();
  if (/gola|handleless|integrated|j.?pull|channel/.test(k)) return "gola";
  if (/knob/.test(k)) return "knob";
  if (/edge|tab|lip/.test(k)) return "edge_pull";
  if (/none|push|tip/.test(k)) return "none";
  return "bar";
}
/** a band across the lower part of the picture, one slice per wall */
export function defaultQuad(i, n, W, H) {
  const x0 = W * (0.06 + (0.88 * i) / n), x1 = W * (0.06 + (0.88 * (i + 1)) / n);
  return [[x0, H * 0.86], [x1, H * 0.86], [x1, H * 0.6], [x0, H * 0.6]];
}

/** the owner's key → the Messages API (his tap only) → the model's text */
export async function askAI({ key, model, jpegB64, fetchFn = fetch, signal }) {
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: 2500,
    messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpegB64 } }, { type: "text", text: PROMPT }] }],
  };
  let res;
  try {
    res = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch { throw new Error("مفيش نت أو الخدمة مش راضية ترد — جرّب تاني أو علّم الصورة بإيدك"); }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) {
    const m = data?.error?.message || "";
    if (res.status === 401 || res.status === 403) throw new Error("المفتاح مرفوض — اتأكد إنك نسخته صح");
    if (res.status === 404 && /model/i.test(m)) throw new Error(`اسم الموديل مش موجود (${model}) — صحّحه في الإعدادات`);
    if (res.status === 429 || res.status === 529) throw new Error("الخدمة زحمة أو الرصيد خلص — جرّب كمان شوية");
    if (res.status === 400 && /credit|balance|billing/i.test(m)) throw new Error("الرصيد في حساب Anthropic خلص");
    throw new Error(`الخدمة رجّعت خطأ ${res.status}${m ? ": " + m.slice(0, 120) : ""}`);
  }
  const text = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  if (!text) throw new Error("الرد فاضي");
  return { text, usage: data.usage || null };
}
