// v123 — accessories and mechanisms inside any unit (kitchen, dressing, wardrobe, TV, bed, bathroom…)
// Amr: «ضيف جميع الإكسسوار جوه الوحدات بس تكون واقعية جداً… وتزوّد كل الميكانيزمات… من أقدم حاجة لأحدث حاجة».
//
// Pure model + 3D pictures. The unit's empty spaces («خانات») are found from its own boards (cavities()), every accessory
// sits in one of them (u.acc = [{id, at: "x%_z%", o: {opts}}]), may add wooden parts (they go to the cut list + labels),
// hardware lines (purchase list + price), drop the loose shelves it replaces, shorten shelves for door-mounted racks,
// and pull out / drop down / turn / rise with the doors in the 3D (its own movers).
// Unit-wide mechanisms (u.mech = {open, hinge, drawer, flap, slide}) change the hardware list and add their parts to the picture.
// Frame: x → right, y → depth (0 = front), z ↑ (cm). three.js: (x, z, −y).

export const ERA = { old: "🕰 كلاسيك", std: "✔ منتشر", new: "✨ حديث", smart: "⚡ ذكي" };
export const GROUPS = [
  ["kb", "🍳 مطبخ — سفلي"], ["kw", "🍳 مطبخ — علوي"], ["kt", "🍳 مطبخ — طويل وتموين"],
  ["wd", "👔 دريسنج ودواليب"], ["sh", "👟 جزم وشنط"], ["lv", "📺 صالة ونوم ومكتب"], ["bt", "🛁 حمامات"],
];
const r1 = (v) => Math.round(v * 10) / 10;
const STD_RUN = [25, 30, 35, 40, 45, 50, 55, 60, 65];
/** the runner length you buy for a depth (the longest standard length that fits) */
export const runLen = (d) => STD_RUN.filter((L) => L <= d - 2).pop() || 25;

// ------------------------------------------------------------------------------------------------ the unit's empty spaces
/** cavities(r) → the empty boxes inside a unit, between its sides, dividers, bottom, top, fixed and loose shelves.
 *  boards = the unit's own fixed boards; movers = doors / drawers (what covers a cavity, what blocks it). */
export function cavities(r) {
  const fine = cavities0(r, false), col = cavities0(r, true);
  // the whole column (loose shelves ignored) when it differs from the cells between the shelves
  const same = (a, b) => Math.abs(a.x0 - b.x0) < 0.3 && Math.abs(a.x1 - b.x1) < 0.3 && Math.abs(a.z0 - b.z0) < 0.3 && Math.abs(a.z1 - b.z1) < 0.3;
  const extra = col.filter((c) => !fine.some((f) => same(f, c))).map((c) => ({ ...c, col: true }));
  const out = [...fine, ...extra];
  const ext = out[0]?.ext;
  if (!ext) return out;
  const W = ext.x1 - ext.x0 || 1, H = ext.z1 - ext.z0 || 1;
  out.sort((a, b) => (a.col ? 1 : 0) - (b.col ? 1 : 0) || b.z1 - a.z1 || a.x0 - b.x0);
  out.forEach((c, i) => { c.n = i + 1; c.key = `${c.col ? "c" : ""}${Math.round(((c.x0 + c.x1) / 2 - ext.x0) / W * 100)}_${Math.round(((c.z0 + c.z1) / 2 - ext.z0) / H * 100)}`; });
  return out;
}
const isLoose = (q) => (q.role === "shelf" || /^رف(?!.*ثابت)/.test(q.name || "")) && q.mat !== "fixed_shelf" && q.role !== "fixed_shelf";
function cavities0(r, skipLoose) {
  const meshes = r.meshes;
  const items = meshes
    ? meshes.map((m, i) => ({ b: m.box, mv: m.mover, name: m.name, mat: m.mat, role: "", i }))
    : (r.parts || []).map((p, i) => ({ b: p.box, mv: r.partMover?.[i] ?? null, name: p.name, mat: p.material, role: p.role, i }));
  const skipMat = new Set(["countertop", "hole", "__hole", "led", "__led", "handle", "gola", "rail", "glass", "mirror", "handle_profile", "frame"]);
  const fixed = items.filter((q) => q.b && q.mv == null && !skipMat.has(q.mat) && q.role !== "hole" && q.role !== "led" && q.role !== "handle" && !/^كونتر|^رخام|مقبض|بروفايل|ليد|شماعة|ثقب/.test(q.name || "")
    && Math.min(q.b.x1 - q.b.x0, q.b.y1 - q.b.y0, q.b.z1 - q.b.z0) >= 0.3 && !(skipLoose && isLoose(q)));
  const moving = items.filter((q) => q.b && q.mv != null);
  if (!fixed.length) return [];
  const ext = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  for (const q of fixed) for (const a of ["x", "y", "z"]) { ext[a + "0"] = Math.min(ext[a + "0"], q.b[a + "0"]); ext[a + "1"] = Math.max(ext[a + "1"], q.b[a + "1"]); }
  const dim = (b, a) => b[a + "1"] - b[a + "0"];
  const isV = (b) => dim(b, "x") <= 5 && dim(b, "z") >= 8 && dim(b, "y") >= 8;
  const isH = (b) => dim(b, "z") <= 5 && dim(b, "x") >= 8 && dim(b, "y") >= 8;
  const isBack = (b) => dim(b, "y") <= 2.6 && dim(b, "x") >= 10 && dim(b, "z") >= 10;
  const uniq = (arr) => [...new Set(arr.map((v) => Math.round(v * 100) / 100))].sort((a, b) => a - b);
  const xs = uniq([ext.x0, ext.x1, ...fixed.filter((q) => isV(q.b)).flatMap((q) => [q.b.x0, q.b.x1])]);
  const zs = uniq([ext.z0, ext.z1, ...fixed.filter((q) => isH(q.b)).flatMap((q) => [q.b.z0, q.b.z1])]);
  const ym = ext.y0 + (ext.y1 - ext.y0) * 0.55;
  const inside = (x, y, z) => fixed.some((q) => x > q.b.x0 + 0.05 && x < q.b.x1 - 0.05 && y > q.b.y0 + 0.05 && y < q.b.y1 - 0.05 && z > q.b.z0 + 0.05 && z < q.b.z1 - 0.05);
  // columns of empty z-intervals, merged when nothing separates them
  const cols = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const xa = xs[i], xb = xs[i + 1];
    if (xb - xa < 6) continue;
    const cx = (xa + xb) / 2;
    const runs = [];
    let cur = null;
    for (let j = 0; j + 1 < zs.length; j++) {
      const za = zs[j], zb = zs[j + 1];
      const empty = zb - za > 0.4 && !inside(cx, ym, (za + zb) / 2);
      if (empty) { if (cur) cur.z1 = zb; else cur = { z0: za, z1: zb }; } else if (cur) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    for (const rn of runs) if (rn.z1 - rn.z0 >= 6) cols.push({ x0: xa, x1: xb, ...rn });
  }
  // neighbouring columns with the same heights and nothing standing between them → one space
  cols.sort((a, b) => a.z0 - b.z0 || a.x0 - b.x0);
  const merged = [];
  for (const c of cols) {
    const m = merged.find((o) => Math.abs(o.z0 - c.z0) < 0.3 && Math.abs(o.z1 - c.z1) < 0.3 && Math.abs(o.x1 - c.x0) < 0.3 && !inside(o.x1, ym, (c.z0 + c.z1) / 2));
    if (m) m.x1 = c.x1; else merged.push({ ...c });
  }
  const out = [];
  for (const c of merged) {
    const w = c.x1 - c.x0, h = c.z1 - c.z0;
    if (w < 8 || h < 6) continue;
    const ov = (b) => Math.min(b.x1, c.x1) - Math.max(b.x0, c.x0) > Math.min(4, w * 0.3) && Math.min(b.z1, c.z1) - Math.max(b.z0, c.z0) > Math.min(3, h * 0.3);
    // what covers it in front, what stands inside it (drawer boxes)
    const fronts = moving.filter((q) => ov(q.b) && q.b.y0 < ext.y0 + 4);
    const frontY = fronts.length ? Math.max(ext.y0, ...fronts.map((q) => Math.min(q.b.y1, ext.y0 + 3))) : ext.y0;
    const deep = moving.filter((q) => ov(q.b) && q.b.y1 > frontY + 8 && !(q.b.y0 < ext.y0 + 4 && q.b.y1 < ext.y0 + 4));
    const backs = fixed.filter((q) => isBack(q.b) && ov(q.b) && q.b.y0 > frontY + 5);
    const y1 = backs.length ? Math.min(...backs.map((q) => q.b.y0)) : ext.y1;
    const y0 = frontY + 0.2;
    if (y1 - y0 < 8) continue;
    if (c.z0 <= ext.z0 + 0.5 && h < 16 && !fronts.length) continue; // the kick space under a floor unit
    let front = null;
    if (fronts.length) {
      const big = fronts.reduce((a, q) => ((q.b.x1 - q.b.x0) * (q.b.z1 - q.b.z0) > (a.b.x1 - a.b.x0) * (a.b.z1 - a.b.z0) ? q : a));
      const mv = r.movers?.[big.mv];
      front = { mover: big.mv, kind: mv?.kind || "door", flap: mv?.kind === "door" && Math.abs((mv.axis || [0, 0, 1])[2]) < 0.5, movers: [...new Set(fronts.map((q) => q.mv))], box: big.b };
    }
    out.push({ x0: r1(c.x0), x1: r1(c.x1), y0: r1(y0), y1: r1(y1), z0: r1(c.z0), z1: r1(c.z1), w: r1(w), h: r1(h), d: r1(y1 - y0), front, drawers: deep.length > 0, ext });
  }
  return out;
}
/** the cavity an accessory sits in: the same key, else the nearest centre that still fits */
export function cavityOf(cavs, at, def) {
  if (!cavs.length) return null;
  const [kx, kz] = String(at || "").replace(/^c/, "").split("_").map(Number);
  const ok = cavs.filter((c) => !def || fits(def, c).ok);
  const pool = ok.length ? ok : cavs;
  if (!Number.isFinite(kx)) return pool[0];
  const ext = cavs[0].ext, W = ext.x1 - ext.x0 || 1, H = ext.z1 - ext.z0 || 1;
  const dist = (c) => Math.hypot(((c.x0 + c.x1) / 2 - ext.x0) / W * 100 - kx, ((c.z0 + c.z1) / 2 - ext.z0) / H * 100 - kz);
  const exact = cavs.find((c) => c.key === at);
  if (exact && (!def || fits(def, exact).ok)) return exact;
  return pool.reduce((a, c) => (dist(c) < dist(a) ? c : a));
}
/** does accessory def fit cavity c? → {ok, why} */
export function fits(def, c) {
  const n = def.need || {};
  if (c.drawers && !def.drawerOk) return { ok: false, why: "الخانة فيها أدراج" };
  if (c.col && !def.clear && def.mv !== "door") return { ok: false, why: "العمود فيه رفوف — اختار خانة بين رفين" };
  if (def.mv === "door" && (!c.front || c.front.kind !== "door" || c.front.flap)) return { ok: false, why: "محتاج ضلفة بمفصلة جنب" };
  for (const [k, lab] of [["w", "العرض"], ["h", "الارتفاع"], ["d", "العمق"]]) {
    const v = c[k], [lo, hi] = n[k] || [0, 1e9];
    if (v < lo) return { ok: false, why: `${lab} ${r1(v)} — أقل من ${lo}` };
    if (v > hi) return { ok: false, why: `${lab} ${r1(v)} — أكبر من ${hi}` };
  }
  if (n.top && c.ext && c.z1 < c.ext.z1 - 8) return { ok: false, why: "لازم تبقى في أعلى خانة (تحت الرخامة على طول)" }; // v124
  if (n.zMin != null && c.z0 < n.zMin) return { ok: false, why: `محتاجة تبقى فوق ${n.zMin} سم من الأرض` };
  if (n.zMax != null && c.z1 > n.zMax + 5 && c.z0 > n.zMax) return { ok: false, why: `محتاجة تبقى تحت ${n.zMax} سم` };
  return { ok: true, why: "" };
}

// ------------------------------------------------------------------------------------------------ the catalogue
// need: {w:[min,max], h:[min,max], d:[min,max]} of the cavity; mv: how it moves (pull | down | spin | up | door | lift | null)
// clear: drops the loose shelves inside the cavity · trim: shortens them by n cm at the front (door racks)
// opts: {key: {label, ch: [[value, text]…], def}} · hw(c, o) → {"line": qty} · wood(c, o) → [{name, x, y, z, w, d, h, material}] (moving with it)
// draw(k, c, o) → the picture; k.S = fixed group, k.M = moving group
const n2 = (lo, hi) => [lo, hi];
const cnt = (def, max = 4, min = 1, lab = "العدد") => ({ label: lab, ch: Array.from({ length: max - min + 1 }, (_, i) => [i + min, `${i + min}`]), def });
const SHOW = { label: "الحاجات جوه", ch: [[1, "اعرضها"], [0, "فاضي"]], def: 1 };
export const ACC = {
  // ---------------------------------------------------------------- kitchen — base
  k_wire: { g: "kb", icon: "🧺", label: "سلة سلك سحب داخلية", era: "old", desc: "سلة سلك كروم على مجرى بلي ورا الضلفة — أقدم حل لتنظيم الدولاب السفلي.", need: { w: n2(30, 120), h: n2(16, 200), d: n2(35, 70) }, mv: "pull", clear: true,
    opts: { n: cnt(2, 3, 1, "عدد السلال"), show: SHOW }, hw: (c, o) => ({ [`سلة سلك سحب داخلية عرض ${r1(c.w - 2.6)} سم`]: o.n, [`مجرى بلي ${runLen(c.d)} سم (زوج)`]: o.n }), draw: (k, c, o) => stackPull(k, c, o.n, (z, h) => { k.basket(...ix(c), k.y0f(c), k.y1f(c), z, Math.min(h - 3, 14), { mv: 1 }); if (o.show) k.goods("pots", ...ix(c), k.y0f(c), k.y1f(c), z, Math.min(h - 3, 14)); }) },
  k_rollout: { g: "kb", icon: "🪵", label: "رف سحب خشب (رول آوت)", era: "old", desc: "صينية خشب بحرف 8 سم على مجرى — القطع بتنزل في الكت ليست.", need: { w: n2(30, 120), h: n2(14, 220), d: n2(35, 70) }, mv: "pull", clear: true,
    opts: { n: cnt(2, 4, 1, "عدد الرفوف"), show: SHOW }, hw: (c, o) => ({ [`مجرى بلي ${runLen(c.d)} سم (زوج)`]: o.n }),
    wood: (c, o) => { const out = []; const span = (c.h - 2) / o.n; for (let i = 0; i < o.n; i++) out.push(...tray(c, c.z0 + 1.5 + i * span, 8, `رف سحب ${i + 1}`)); return out; },
    draw: (k, c, o) => { const span = (c.h - 2) / o.n; for (let i = 0; i < o.n; i++) { const z = c.z0 + 1.5 + i * span; k.runners(c, z + 3); if (o.show) k.goods(i % 2 ? "jars" : "pots", ...ix(c, 3.2), k.y0f(c) + 1.8, k.y1f(c) - 1.8, z + 1.8, Math.min(span - 4, 18)); } } },
  k_bottle: { g: "kb", icon: "🫒", label: "ترولي ضيق للزيت والتوابل", era: "std", desc: "إطار سحب كامل بسلتين أو تلاتة — للخانات الضيقة 15–45 سم.", need: { w: n2(14, 46), h: n2(40, 90), d: n2(40, 70) }, mv: "pull", clear: true,
    opts: { n: cnt(3, 3, 2, "الأدوار"), show: SHOW }, hw: (c, o) => ({ [`ترولي سحب ضيق ${Math.round(c.w)} سم ${o.n} أدوار + مجرى فتح كامل`]: 1 }),
    draw: (k, c, o) => { trolleyFrame(k, c, o.n, o.show, ["bottles", "oil", "spice"]); } },
  k_bin_door: { g: "kb", icon: "🗑", label: "سلة زبالة على ضهر الضلفة", era: "old", desc: "سطل بغطا بيتفتح لوحده مع فتح الضلفة — الحل الكلاسيك تحت الحوض.", need: { w: n2(30, 100), h: n2(35, 90), d: n2(35, 70) }, mv: "door", trim: 26,
    hw: () => ({ "سلة زبالة على الضلفة بغطا أوتوماتيك 12 لتر": 1 }), draw: (k, c) => doorBin(k, c) },
  k_bin_pull: { g: "kb", icon: "♻️", label: "زبالة سحب وفرز (2–4 صناديق)", era: "new", desc: "إطار سحب كامل بصناديق فرز وغطا — بيتسحب مع الضلفة أو لوحده.", need: { w: n2(30, 100), h: n2(40, 90), d: n2(42, 70) }, mv: "pull", clear: true,
    opts: { n: cnt(2, 4, 1, "الصناديق") }, hw: (c, o) => ({ [`نظام فرز زبالة سحب ${o.n} صناديق عرض ${Math.round(c.w)}`]: 1 }), draw: (k, c, o) => binFrame(k, c, o.n) },
  k_sink_u: { g: "kb", icon: "🚰", label: "درج تحت الحوض على شكل U", era: "new", desc: "درج بيلف حوالين السيفون والمواسير — مفيش مساحة ضايعة تحت الحوض.", need: { w: n2(50, 120), h: n2(25, 90), d: n2(40, 70) }, mv: "pull", clear: true,
    hw: (c) => ({ [`درج U تحت الحوض ${Math.round(c.w)} سم + مجرى مخفي سوفت كلوز`]: 1 }), draw: (k, c) => sinkU(k, c) },
  k_caddy: { g: "kb", icon: "🧴", label: "سلال منظفات سحب (تحت الحوض)", era: "std", desc: "سلتين سلك ضيقين على الجنبين بيسيبوا النص للمواسير.", need: { w: n2(50, 120), h: n2(30, 90), d: n2(40, 70) }, mv: "pull", clear: true,
    opts: { show: SHOW }, hw: () => ({ "سلة منظفات سحب ضيقة 15 سم": 2 }), draw: (k, c, o) => caddy(k, c, o.show) },
  k_trays: { g: "kb", icon: "🍕", label: "فواصل صواني وألواح تقطيع رأسية", era: "std", desc: "فواصل خشب رأسية لصواني الفرن وألواح التقطيع — القطع في الكت ليست.", need: { w: n2(15, 90), h: n2(30, 90), d: n2(35, 70) }, clear: true,
    opts: { n: cnt(3, 6, 1, "الفواصل"), show: SHOW }, hw: () => ({}),
    wood: (c, o) => Array.from({ length: o.n }, (_, i) => ({ name: `فاصل صواني ${i + 1}`, x: c.x0 + ((c.w - 1.8) * (i + 1)) / (o.n + 1), y: c.y0 + 2, z: c.z0, w: 1.8, d: c.d - 3, h: Math.min(c.h - 3, 45), material: "carcass" })),
    draw: (k, c, o) => { if (!o.show) return; const sp = (c.w - 1.8) / (o.n + 1); for (let i = 0; i <= o.n; i++) k.goods("trays", c.x0 + i * sp + (i ? 1.8 : 0) + 0.4, c.x0 + (i + 1) * sp - 0.4, c.y0 + 3, c.y1 - 2, c.z0, Math.min(c.h - 6, 40)); } },
  k_lazy: { g: "kb", icon: "🔄", label: "رف دوّار (لازي سوزان)", era: "old", desc: "رفين دايرة بيلفّوا على عمود — في الركن أو أي دولاب عميق.", need: { w: n2(45, 120), h: n2(45, 220), d: n2(45, 120) }, mv: "spin", clear: true,
    opts: { n: cnt(2, 3, 1, "الأدوار"), shape: { label: "الشكل", ch: [["full", "دايرة كاملة"], ["kidney", "كلية (3/4)"]], def: "full" }, show: SHOW }, hw: (c, o) => ({ [`رف دوّار ${o.shape === "full" ? "دايرة" : "3/4"} قطر ${Math.round(Math.min(c.w, c.d) - 4)} سم ${o.n} أدوار`]: 1 }), draw: (k, c, o) => lazy(k, c, o) },
  k_board: { g: "kb", icon: "🔪", label: "لوح تقطيع سحب تحت الرخامة", era: "old", desc: "لوح خشب صلب بيطلع من تحت الرخامة على مجرى — تقطّع عليه وترجّعه.", need: { w: n2(30, 100), h: n2(8, 200), d: n2(35, 70), top: true }, mv: "pull",
    hw: (c) => ({ [`مجرى بلي ${runLen(c.d)} سم (زوج) للوح التقطيع`]: 1 }),
    wood: (c) => [{ name: "لوح تقطيع سحب", x: c.x0 + 1.3, y: c.y0, z: c.z1 - 3.4, w: c.w - 2.6, d: c.d - 2, h: 2.5, material: "accent" }], draw: (k, c) => { k.runners(c, c.z1 - 2.2, 0.8); } },
  k_table: { g: "kb", icon: "🍽", label: "ترابيزة سحب مخفية", era: "std", desc: "سطح ترابيزة بيطلع على مجرى تقيل وبتنزل له رجل — للمطابخ الصغيرة.", need: { w: n2(50, 120), h: n2(10, 200), d: n2(45, 70) }, mv: "pull", travel: 1.6,
    hw: (c) => ({ [`طقم ترابيزة سحب (مجرى تقيل ${runLen(c.d)} سم + رجل قلاب)`]: 1 }),
    wood: (c) => [{ name: "سطح ترابيزة سحب", x: c.x0 + 1.6, y: c.y0, z: c.z1 - 4.2, w: c.w - 3.2, d: c.d - 2, h: 2.5, material: "accent" }], draw: (k, c) => table(k, c) },
  k_mixer: { g: "kb", icon: "🥣", label: "ليفت للخلاط والعجان", era: "new", desc: "رف على ميكانيزم بيطلع لحد ارتفاع الرخامة ويثبت — الجهاز التقيل من غير شيل.", need: { w: n2(45, 90), h: n2(45, 90), d: n2(45, 70) }, mv: "lift", clear: true,
    opts: { show: SHOW }, hw: (c) => ({ [`ميكانيزم ليفت خلاط (Mixer lift) لعرض ${Math.round(c.w)}`]: 1 }),
    wood: (c) => [{ name: "رف ليفت الخلاط", x: c.x0 + 4, y: c.y0 + 3, z: c.z0 + 6, w: c.w - 8, d: Math.min(c.d - 8, 45), h: 1.8, material: "carcass" }], draw: (k, c, o) => mixerLift(k, c, o.show) },
  k_towel: { g: "kb", icon: "🧻", label: "حامل فوط سحب", era: "std", desc: "إطار ضيق بتلات أعمدة بيطلع جنب الحوض أو الفرن.", need: { w: n2(10, 30), h: n2(30, 90), d: n2(35, 70) }, mv: "pull", clear: true,
    hw: () => ({ "حامل فوط سحب 3 أعمدة": 1 }), draw: (k, c) => towels(k, c) },
  k_wine: { g: "kb", icon: "🍷", label: "رف نبيت (خلايا الزجاجات)", era: "old", desc: "شبكة أعمدة كروم بتنام فيها الزجاجات — في خانة مفتوحة أو ورا ضلفة.", need: { w: n2(25, 120), h: n2(25, 220), d: n2(30, 70) }, clear: true,
    opts: { show: SHOW }, hw: (c) => ({ [`رف زجاجات كروم ${Math.floor((c.w - 2) / 10)}×${Math.floor((c.h - 2) / 10)} خلية`]: 1 }), draw: (k, c, o) => wine(k, c, o.show) },
  k_popup: { g: "kb", icon: "🔌", label: "بريزة منبثقة في الرخامة", era: "smart", desc: "عمود بريز + USB بيطلع من الرخامة بلمسة وينزل يستخبى — بيتخرم في الرخامة.", need: { w: n2(20, 200), h: n2(25, 220), d: n2(30, 80), top: true },
    mv: "up", hw: () => ({ "بريزة منبثقة للرخامة 3 بريز + USB-C (خرم 60 مم)": 1 }), draw: (k, c) => popup(k, c) },
  // ---------------------------------------------------------------- kitchen — wall
  k_drainer: { g: "kw", icon: "🍽", label: "مصفاة أطباق ستانلس دورين", era: "std", desc: "دورين ستانلس للأطباق والكوبايات + صينية تنقيط — في العلوي فوق الحوض.", need: { w: n2(45, 120), h: n2(40, 120), d: n2(22, 40) }, clear: true,
    opts: { show: SHOW }, hw: (c) => ({ [`مصفاة أطباق ستانلس دورين ${Math.round(c.w)} سم + صينية`]: 1 }), draw: (k, c, o) => drainer(k, c, o.show) },
  k_pulldown: { g: "kw", icon: "⤵", label: "رف نازل (Pull-down)", era: "new", desc: "سلتين على ميكانيزم مكبس بينزلوا لقدام لحد إيدك — العلوي العالي يبقى سهل.", need: { w: n2(45, 120), h: n2(50, 120), d: n2(26, 40) }, mv: "down", clear: true,
    opts: { show: SHOW }, hw: (c) => ({ [`ميكانيزم رف نازل بمكبس (Pull-down) لعرض ${Math.round(c.w)}`]: 1 }), draw: (k, c, o) => pullDown(k, c, o.show, "kitchen") },
  k_spice_door: { g: "kw", icon: "🧂", label: "رف توابل على ضهر الضلفة", era: "old", desc: "3–4 رفوف سلك صغيرة متركبة على ضهر الضلفة — الرفوف جوه بتقصر 8 سم.", need: { w: n2(25, 70), h: n2(40, 220), d: n2(22, 70) }, mv: "door", trim: 9,
    opts: { n: cnt(4, 5, 2, "الرفوف"), show: SHOW }, hw: (c, o) => ({ [`رف توابل للضلفة ${o.n} أدوار`]: 1 }), draw: (k, c, o) => doorRack(k, c, o.n, 7, o.show ? "spice" : null) },
  k_glasses: { g: "kw", icon: "🥂", label: "حامل كاسات معلّق", era: "std", desc: "مجاري ألومنيوم الكاسات بتتعلّق فيها من الرجل — تحت رف أو تحت العلوي.", need: { w: n2(25, 120), h: n2(22, 220), d: n2(22, 70) },
    opts: { show: SHOW }, hw: (c) => ({ [`حامل كاسات معلّق ${Math.max(2, Math.floor((c.w - 4) / 9))} مجاري`]: 1 }), draw: (k, c, o) => glassRack(k, c, o.show) },
  k_shutter: { g: "kw", icon: "🎚", label: "ستارة رول (جراج أجهزة)", era: "std", desc: "ستارة شرائح ألومنيوم أو خشب بتطلع لفوق — تخبي الأجهزة على الرخامة.", need: { w: n2(40, 150), h: n2(35, 120), d: n2(25, 70) }, mv: "up",
    opts: { mat: { label: "الشرائح", ch: [["alu", "ألومنيوم"], ["glass", "زجاج مصنفر"], ["wood", "خشب"]], def: "alu" } }, hw: (c, o) => ({ [`ستارة رول ${o.mat === "wood" ? "خشب" : o.mat === "glass" ? "زجاج" : "ألومنيوم"} ${Math.round(c.w)}×${Math.round(c.h)} + مجاري`]: 1 }), draw: (k, c, o) => shutter(k, c, o.mat) },
  // ---------------------------------------------------------------- kitchen — tall / pantry
  k_pantry: { g: "kt", icon: "🥫", label: "كارجو تموين طويل (تاندم)", era: "std", desc: "عمود سحب كامل بـ4–6 سلال — بيطلع بالكامل وتشوف كل حاجة من الجنبين.", need: { w: n2(15, 60), h: n2(100, 260), d: n2(45, 70) }, mv: "pull", clear: true,
    opts: { n: cnt(5, 6, 4, "السلال"), show: SHOW }, hw: (c, o) => ({ [`كارجو تموين طويل ${Math.round(c.w)} سم ${o.n} سلال + طقم مجاري`]: 1 }), draw: (k, c, o) => trolleyFrame(k, c, o.n, o.show, ["bottles", "cans", "cans", "jars", "spice", "spice"]) },
  k_twin: { g: "kt", icon: "🚪", label: "تاندم مزدوج (سلال على الضلفة + جوه)", era: "new", desc: "سلال على ضهر الضلفة + سلال جوه بتطلع معاها لما تفتح — زي كيسبومر.", need: { w: n2(40, 60), h: n2(120, 260), d: n2(45, 70) }, mv: "door", clear: true, trim: 0,
    opts: { n: cnt(5, 6, 3, "السلال"), show: SHOW }, hw: (c, o) => ({ [`تاندم مزدوج (ضلفة + داخلي) ${Math.round(c.w)} سم ${o.n}×2 سلال`]: 1 }), draw: (k, c, o) => twin(k, c, o.n, o.show) },
  k_larder: { g: "kt", icon: "🧺", label: "سلال على ضهر الضلفة (لاردر)", era: "old", desc: "4–6 سلال سلك على الضلفة — الرفوف جوه بتقصر 12 سم.", need: { w: n2(30, 70), h: n2(80, 260), d: n2(40, 70) }, mv: "door", trim: 13,
    opts: { n: cnt(5, 6, 3, "السلال"), show: SHOW }, hw: (c, o) => ({ [`سلال ضلفة لاردر ${o.n} سلال عرض ${Math.round(c.w - 10)}`]: 1 }), draw: (k, c, o) => doorRack(k, c, o.n, 11, o.show ? "jars" : null) },
  k_broom: { g: "kt", icon: "🧹", label: "حامل مكانس ومساحات", era: "old", desc: "مشابك على الجنب + خطافات للجردل والمقشة — لعمود المكانس.", need: { w: n2(25, 80), h: n2(90, 260), d: n2(25, 70) }, clear: true,
    opts: { show: SHOW }, hw: () => ({ "طقم مشابك مكانس 3 + خطافات": 1 }), draw: (k, c, o) => broom(k, c, o.show) },
  k_appl: { g: "kt", icon: "☕", label: "رف سحب لجهاز (قهوة / ميكروويف)", era: "std", desc: "رف تقيل على مجرى فتح كامل — تسحب المكنة لقدام وتشتغل عليها.", need: { w: n2(40, 90), h: n2(30, 80), d: n2(40, 70) }, mv: "pull",
    opts: { dev: { label: "الجهاز", ch: [["coffee", "مكنة قهوة"], ["micro", "ميكروويف"], ["none", "من غير"]], def: "coffee" } }, hw: (c) => ({ [`مجرى فتح كامل تقيل ${runLen(c.d)} سم (زوج) للرف`]: 1 }),
    wood: (c) => [{ name: "رف سحب الجهاز", x: c.x0 + 1.3, y: c.y0, z: c.z0 + 1, w: c.w - 2.6, d: c.d - 2, h: 1.8, material: "carcass" }], draw: (k, c, o) => applShelf(k, c, o.dev) },
  // ---------------------------------------------------------------- dressing / wardrobes
  w_rail: { g: "wd", icon: "👔", label: "شماعة بيضاوي بكتّافات", era: "std", desc: "ماسورة ألومنيوم بيضاوي 30×15 على كتّافات — للهدوم الطويلة أو القصيرة.", need: { w: n2(30, 130), h: n2(60, 260), d: n2(40, 70) },
    opts: { show: SHOW }, hw: (c) => ({ [`ماسورة شماعة بيضاوي ${Math.round(c.w)} سم + 2 كتّافة`]: 1 }), draw: (k, c, o) => rail(k, c, o.show, false) },
  w_rail_led: { g: "wd", icon: "💡", label: "شماعة بليد وحساس حركة", era: "smart", desc: "شماعة ألومنيوم فيها شريط ليد بينور لما تفتح الضلفة.", need: { w: n2(30, 130), h: n2(60, 260), d: n2(40, 70) },
    opts: { show: SHOW }, hw: (c) => ({ [`شماعة ليد ألومنيوم ${Math.round(c.w)} سم + حساس + محول`]: 1 }), draw: (k, c, o) => rail(k, c, o.show, true) },
  w_pulldown: { g: "wd", icon: "⤵", label: "شماعة نازلة (Pull-down)", era: "new", desc: "شماعة على ذراعين بمكبس — تشدها من المسكة تنزل لحد إيدك وترجع لوحدها.", need: { w: n2(45, 120), h: n2(60, 140), d: n2(45, 70), zMin: 110 }, mv: "down",
    opts: { show: SHOW }, hw: (c) => ({ [`شماعة نازلة بمكبس (Pull-down) ${Math.round(c.w)} سم`]: 1 }), draw: (k, c, o) => pullDown(k, c, o.show, "wardrobe") },
  w_trouser: { g: "wd", icon: "👖", label: "حامل بناطيل سحب", era: "new", desc: "إطار ألومنيوم بأعمدة عليها مطاط — 8 لـ14 بنطلون من غير كرمشة.", need: { w: n2(45, 100), h: n2(35, 200), d: n2(45, 70) }, mv: "pull",
    opts: { show: SHOW }, hw: (c) => ({ [`حامل بناطيل سحب ${Math.round(c.w)} سم (${Math.max(6, Math.floor((c.d - 8) / 3.6))} عمود)`]: 1 }), draw: (k, c, o) => trousers(k, c, o.show) },
  w_tie: { g: "wd", icon: "👔", label: "حامل كرافتات وأحزمة سحب", era: "new", desc: "لوح ضيق بيطلع من الجنب فيه خطافات للكرافتات والأحزمة.", need: { w: n2(20, 130), h: n2(40, 200), d: n2(40, 70) }, mv: "pull",
    opts: { show: SHOW }, hw: (c) => ({ [`حامل كرافتات/أحزمة سحب جانبي ${runLen(c.d)} سم`]: 1 }), draw: (k, c, o) => tieRack(k, c, o.show) },
  w_valet: { g: "wd", icon: "🪝", label: "شماعة سحب صغيرة (فاليت)", era: "std", desc: "ذراع بيطلع من تحت الرف تعلّق عليه لبس بكرة أو شنطة السفر.", need: { w: n2(20, 130), h: n2(25, 260), d: n2(30, 70) }, mv: "pull",
    hw: (c) => ({ [`شماعة فاليت سحب ${runLen(c.d)} سم`]: 1 }), draw: (k, c) => valet(k, c) },
  w_mirror: { g: "wd", icon: "🪞", label: "مراية سحب جوه الدولاب", era: "new", desc: "مراية طولية على مجرى من فوق — تسحبها وتلفّها لك.", need: { w: n2(30, 130), h: n2(100, 260), d: n2(40, 70) }, mv: "pull",
    hw: (c) => ({ [`مراية سحب ودوران ${Math.round(Math.min(c.h - 10, 120))} سم + مجرى علوي`]: 1 }), draw: (k, c) => mirror(k, c) },
  w_iron: { g: "wd", icon: "🧺", label: "مكوة مخفية سحب", era: "std", desc: "لوح كي بيتطبّق جوه درج وبيتفتح على 180° — ينفع في دريسنج أو مطبخ.", need: { w: n2(40, 100), h: n2(10, 200), d: n2(45, 70) }, mv: "pull",
    hw: () => ({ "طقم مكوة مخفية سحب (لوح + ميكانيزم)": 1 }), draw: (k, c) => ironing(k, c) },
  w_hamper: { g: "wd", icon: "🧺", label: "سلة غسيل سحب", era: "std", desc: "إطار سحب بشنطة أو اتنين قماش تتشال للغسيل.", need: { w: n2(30, 100), h: n2(45, 120), d: n2(40, 70) }, mv: "pull", clear: true,
    opts: { n: cnt(2, 2, 1, "الشنط"), mat: { label: "الخامة", ch: [["fab", "قماش"], ["wick", "خوص"]], def: "fab" } }, hw: (c, o) => ({ [`سلة غسيل سحب ${o.n === 2 ? "مزدوجة" : "مفردة"} ${o.mat === "wick" ? "خوص" : "قماش"}`]: 1 }), draw: (k, c, o) => hamper(k, c, o) },
  w_wire: { g: "wd", icon: "🧺", label: "أدراج سلك سحب للدريسنج", era: "old", desc: "سلال سلك على مجاري للتيشرتات والبلوفرات — تشوف اللي جوه من غير ما تفتح.", need: { w: n2(30, 120), h: n2(30, 220), d: n2(40, 70) }, mv: "pull", clear: true,
    opts: { n: cnt(3, 5, 1, "السلال"), show: SHOW }, hw: (c, o) => ({ [`سلة سلك دريسنج ${Math.round(c.w - 2.6)} سم + مجرى`]: o.n }), draw: (k, c, o) => stackPull(k, c, o.n, (z, h) => { k.basket(...ix(c), k.y0f(c), k.y1f(c), z, Math.min(h - 3, 18), { mv: 1 }); if (o.show) k.goods("folded", ...ix(c, 2), k.y0f(c) + 2, k.y1f(c) - 2, z + 0.6, Math.min(h - 5, 15)); }) },
  w_jewel: { g: "wd", icon: "💍", label: "درج مجوهرات بقطيفة", era: "new", desc: "صينية سحب قليلة الارتفاع بخانات قطيفة للخواتم والحلقان والساعات.", need: { w: n2(30, 120), h: n2(8, 220), d: n2(35, 70) }, mv: "pull",
    hw: (c) => ({ [`فرش قطيفة بخانات لدرج مجوهرات ${Math.round(c.w - 4)}×${Math.round(c.d - 6)}`]: 1, [`مجرى مخفي ${runLen(c.d)} سم`]: 1 }),
    wood: (c) => tray(c, c.z1 - 8, 6, "درج مجوهرات"), draw: (k, c) => jewel(k, c) },
  w_watch: { g: "wd", icon: "⌚", label: "درج ساعات + ونّاش", era: "smart", desc: "مخدات للساعات وعلبتين ونّاش بيلفّوا الساعات الأوتوماتيك — بريزة جوه.", need: { w: n2(40, 120), h: n2(12, 220), d: n2(40, 70) }, mv: "pull",
    hw: () => ({ "ونّاش ساعات مزدوج (Watch winder)": 1, "فرش قطيفة بمخدات ساعات": 1 }), wood: (c) => tray(c, c.z1 - 11, 9, "درج ساعات"), draw: (k, c) => watches(k, c) },
  w_safe: { g: "wd", icon: "🔐", label: "خزنة إلكترونية مخفية", era: "smart", desc: "خزنة صلب بكيباد/بصمة متثبتة في القاعدة — ورا ضلفة أو جوه درج.", need: { w: n2(35, 200), h: n2(25, 260), d: n2(35, 70) },
    hw: () => ({ "خزنة إلكترونية بكيباد وبصمة 35×25×30": 1 }), draw: (k, c) => safe(k, c) },
  w_carousel: { g: "wd", icon: "🎠", label: "دولاب دوّار (كاروسيل هدوم)", era: "new", desc: "عمود في النص عليه شماعات دايرية بتلف — للركنة اللي مش بتتطال.", need: { w: n2(80, 140), h: n2(150, 270), d: n2(80, 140) }, mv: "spin", clear: true,
    opts: { show: SHOW }, hw: () => ({ "كاروسيل هدوم دوّار دورين (عمود + 2 شماعة دايرية)": 1 }), draw: (k, c, o) => carousel(k, c, o.show) },
  w_boxes: { g: "wd", icon: "📦", label: "بوكسات قماش على الرف", era: "std", desc: "صناديق قماش بمسكة — للحاجات الصغيرة والإكسسوارات.", need: { w: n2(25, 130), h: n2(18, 220), d: n2(28, 70) },
    hw: (c) => ({ "بوكس قماش بمسكة 30×30×20": Math.max(1, Math.floor(c.w / 32)) }), draw: (k, c) => fabricBoxes(k, c) },
  // ---------------------------------------------------------------- shoes / bags
  sh_tilt: { g: "sh", icon: "👟", label: "رفوف جزم سلك مايلة", era: "old", desc: "رفوف مايلة 15° بحاجز للكعب — الجزم باينة كلها.", need: { w: n2(30, 130), h: n2(30, 260), d: n2(28, 70) }, clear: true,
    opts: { n: cnt(3, 6, 1, "الرفوف"), show: SHOW }, hw: (c, o) => ({ [`رف جزم سلك مايل ${Math.round(c.w - 2)} سم`]: o.n }), draw: (k, c, o) => shoeTilt(k, c, o) },
  sh_pull: { g: "sh", icon: "👞", label: "رف جزم سحب (صفين)", era: "new", desc: "إطار سحب فيه صفين أعمدة مايلة — الجزمة على العمود من الكعب.", need: { w: n2(40, 120), h: n2(20, 260), d: n2(40, 70) }, mv: "pull",
    opts: { n: cnt(2, 4, 1, "الأدوار"), show: SHOW }, hw: (c, o) => ({ [`رف جزم سحب صفين ${Math.round(c.w)} سم + مجرى`]: o.n }), draw: (k, c, o) => stackPull(k, c, o.n, (z, h) => shoePull(k, c, z, Math.min(h - 2, 22), o.show)) },
  sh_spin: { g: "sh", icon: "🎠", label: "كاروسيل جزم دوّار", era: "new", desc: "أدوار دايرية على عمود بيلف — من 12 لـ40 جوز في عمود واحد.", need: { w: n2(50, 120), h: n2(80, 270), d: n2(50, 120) }, mv: "spin", clear: true,
    opts: { show: SHOW }, hw: (c) => ({ [`كاروسيل جزم دوّار ${Math.max(3, Math.floor((c.h - 10) / 30))} أدوار`]: 1 }), draw: (k, c, o) => shoeSpin(k, c, o.show) },
  sh_hooks: { g: "sh", icon: "👜", label: "خطافات شنط وإيشاربات", era: "old", desc: "عمود ألومنيوم على الضهر عليه خطافات للشنط والإيشاربات والأحزمة.", need: { w: n2(30, 200), h: n2(40, 260), d: n2(25, 70) },
    opts: { show: SHOW }, hw: (c) => ({ [`عمود خطافات شنط ${Math.round(c.w - 4)} سم + ${Math.max(3, Math.floor(c.w / 15))} خطاف`]: 1 }), draw: (k, c, o) => bagHooks(k, c, o.show) },
  // ---------------------------------------------------------------- living / bedroom / office
  l_tvlift: { g: "lv", icon: "📺", label: "رفع شاشة كهربا (TV lift)", era: "smart", desc: "عمود كهربا بيطلّع الشاشة من جوه الوحدة بالريموت — والغطا بيتفتح لوحده.", need: { w: n2(70, 220), h: n2(35, 120), d: n2(18, 70) }, mv: "up",
    opts: { tv: { label: "الشاشة", ch: [[43, "43 بوصة"], [50, "50"], [55, "55"], [65, "65"]], def: 50 } }, hw: (c, o) => ({ [`ميكانيزم رفع شاشة كهربا لحد ${o.tv} بوصة + ريموت`]: 1 }), draw: (k, c, o) => tvLift(k, c, o.tv) },
  l_desk: { g: "lv", icon: "💻", label: "مكتب سحب", era: "std", desc: "سطح مكتب بيطلع على مجرى تقيل ورجل بتنزل — للأوض الصغيرة.", need: { w: n2(60, 140), h: n2(8, 200), d: n2(45, 70) }, mv: "pull", travel: 1.4,
    hw: (c) => ({ [`طقم مكتب سحب (مجرى تقيل ${runLen(c.d)} + رجل قلاب)`]: 1 }),
    wood: (c) => [{ name: "سطح مكتب سحب", x: c.x0 + 1.6, y: c.y0, z: c.z1 - 4, w: c.w - 3.2, d: c.d - 2, h: 2.5, material: "accent" }], draw: (k, c) => table(k, c, true) },
  l_keyboard: { g: "lv", icon: "⌨️", label: "رف كيبورد سحب", era: "old", desc: "رف رفيع تحت سطح المكتب على مجرى.", need: { w: n2(55, 140), h: n2(6, 200), d: n2(35, 70) }, mv: "pull",
    hw: (c) => ({ [`مجرى رف كيبورد ${runLen(c.d)} سم`]: 1 }), wood: (c) => [{ name: "رف كيبورد", x: c.x0 + 1.3, y: c.y0, z: c.z1 - 3.2, w: Math.min(c.w - 2.6, 70), d: Math.min(c.d - 4, 35), h: 1.8, material: "carcass" }],
    draw: (k, c) => { k.runners(c, c.z1 - 2.3, 0.8); k.goods("keyboard", c.x0 + 3, c.x0 + Math.min(c.w - 4, 68), c.y0 + 3, c.y0 + 20, c.z1 - 1.4, 2); } },
  l_cable: { g: "lv", icon: "🔌", label: "مجرى كابلات وفتحة سلك", era: "std", desc: "فتحة سلك ألومنيوم 60 مم + صينية كابلات تحت السطح + مشتركة.", need: { w: n2(30, 300), h: n2(6, 260), d: n2(20, 80) },
    hw: () => ({ "فتحة سلك ألومنيوم 60 مم": 1, "صينية كابلات معدن 60 سم": 1, "مشترك كهربا 4 بريز": 1 }), draw: (k, c) => cables(k, c) },
  l_charger: { g: "lv", icon: "🔋", label: "شاحن لاسلكي وبريزة USB جوه", era: "smart", desc: "شاحن لاسلكي مدفون في الرف + بريزة USB-C — الموبايل يتشحن من غير سلك باين.", need: { w: n2(20, 300), h: n2(8, 260), d: n2(20, 80) },
    hw: () => ({ "شاحن لاسلكي مدفون (Qi) للخشب": 1, "بريزة USB-A + USB-C للأثاث": 1 }), draw: (k, c) => charger(k, c) },
  l_bedlift: { g: "lv", icon: "🛏", label: "مكابس رفع سرير (جاك غاز)", era: "std", desc: "طقم مكبسين غاز وبرواز — المرتبة بتترفع وتلاقي التخزين تحتها.", need: { w: n2(70, 220), h: n2(15, 60), d: n2(150, 230) },
    hw: (c) => ({ [`طقم رفع سرير بمكبسين غاز ${c.w > 140 ? "1200N" : "800N"}`]: 1 }), draw: (k, c) => bedLift(k, c) },
  l_minibar: { g: "lv", icon: "🧊", label: "تلاجة ميني بار مدمجة", era: "std", desc: "تلاجة صغيرة 40–50 سم جوه الوحدة بضلفة الخشب — محتاجة تهوية ورا.", need: { w: n2(45, 70), h: n2(50, 90), d: n2(45, 70) }, clear: true,
    hw: () => ({ "ثلاجة ميني بار مدمجة 40 لتر": 1, "شبكة تهوية ألومنيوم": 1 }), draw: (k, c) => minibar(k, c) },
  // ---------------------------------------------------------------- bathrooms
  b_cosmetic: { g: "bt", icon: "💄", label: "منظّم مستحضرات سحب ضيق", era: "new", desc: "إطار ضيق بصواني أكريليك — للبرفانات والكريمات جنب الحوض.", need: { w: n2(12, 35), h: n2(40, 120), d: n2(35, 60) }, mv: "pull", clear: true,
    opts: { show: SHOW }, hw: () => ({ "منظّم مستحضرات سحب بصواني أكريليك": 1 }), draw: (k, c, o) => trolleyFrame(k, c, 3, o.show, ["cosm", "cosm", "cosm"], true) },
  b_dryer: { g: "bt", icon: "💨", label: "حامل سشوار ومكواة شعر على الضلفة", era: "std", desc: "حلقات ستانلس على ضهر الضلفة للسشوار والمكواة وفيشة.", need: { w: n2(30, 70), h: n2(40, 120), d: n2(25, 60) }, mv: "door", trim: 9,
    hw: () => ({ "حامل سشوار ومكواة شعر للضلفة": 1 }), draw: (k, c) => dryer(k, c) },
  b_hamper: { g: "bt", icon: "🧺", label: "سلة غسيل سحب (حمام)", era: "std", desc: "زي سلة الدريسنج — مقاسات الحمام.", need: { w: n2(30, 80), h: n2(40, 90), d: n2(35, 60) }, mv: "pull", clear: true,
    opts: { n: cnt(1, 2, 1, "الشنط"), mat: { label: "الخامة", ch: [["fab", "قماش"], ["wick", "خوص"]], def: "wick" } }, hw: (c, o) => ({ [`سلة غسيل سحب ${o.mat === "wick" ? "خوص" : "قماش"}`]: 1 }), draw: (k, c, o) => hamper(k, c, o) },
};
export const accOpts = (def, o = {}) => Object.fromEntries(Object.entries(def.opts || {}).map(([k, v]) => [k, o[k] ?? v.def]));

// ------------------------------------------------------------------------------------------------ unit mechanisms
// a = the counts read from the unit: doors (side hinged), flaps, drawers, sliders, doorH (each door's height), flapW
export const MECH = {
  open: { label: "طريقة الفتح", items: {
    "": { label: "بالمقبض", era: "old" },
    tipon: { label: "كبسة (Push / Tip-On)", era: "std", hw: (a) => ({ "كبّاس فتح Tip-On للضلفة": a.doors + a.flaps, ...(a.drawers ? a.sys ? { "وحدة Tip-On Blumotion للدرج": a.drawers } : { "مجرى أدراج Tip-On Blumotion (زوج)": a.drawers } : {}) }), note: "شيل المقابض — الضلفة بتتفتح بالضغط عليها" },
    servo: { label: "فتح كهربا بلمسة (Servo-Drive)", era: "smart", hw: (a) => ({ ...(a.drawers ? { "وحدة Servo-Drive للأدراج": a.drawers } : {}), ...(a.flaps ? { "Servo-Drive للقلاب (Aventos)": a.flaps } : {}), ...(a.doors ? { "كبّاس كهربا للضلفة": a.doors } : {}), "محول + كابل Servo-Drive": 1 }), note: "محتاجة بريزة ورا الوحدة" },
  } },
  hinge: { label: "المفصلات", items: {
    "": { label: "سوفت كلوز 35 (زي الوحدة)", era: "std" }, // v124: NOVERA's own hinge — the unit's hinge lines stay as they are
    spring: { label: "مفصلة عادية 110° (من غير سوفت)", era: "old", hw: (a) => ({ "مفصلة سوستة 110° (بكبة 35)": a.hinges }) },
    soft: { label: "مفصلة سوفت كلوز (بتقفل بهدوء)", era: "std", hw: (a) => ({ "مفصلة سوفت كلوز 110° Blumotion": a.hinges }) },
    wide: { label: "مفصلة 155°/170° (فتح واسع)", era: "std", hw: (a) => ({ "مفصلة فتح واسع 155° سوفت كلوز": a.hinges }), note: "للضلف اللي جنب حيطة أو اللي جواها أدراج/سلال" },
    zero: { label: "زيرو بروتريشن (السلال تطلع من غير ما تخبط)", era: "new", hw: (a) => ({ "مفصلة زيرو بروتريشن 155°": a.hinges }) },
    glass: { label: "مفصلة زجاج (من غير خرم)", era: "std", hw: (a) => ({ "مفصلة ضلفة زجاج 110°": a.hinges }) },
    pivot: { label: "مفصلة محور للضلف الكبيرة (Pivot)", era: "new", hw: (a) => ({ "طقم مفصلة محور فوق وتحت": a.doors }), note: "للضلف من الأرض للسقف — حتى 80 كجم" },
    piano: { label: "مفصلة بيانو (قديمة)", era: "old", hw: (a) => ({ "مفصلة بيانو (متر طولي)": Math.round(a.doorHsum) / 100 }) },
  } },
  drawer: { label: "مجاري الأدراج", items: {
    "": { label: "حسب الوحدة", era: "std" },
    roller: { label: "مجرى عجل أبيض (قديم)", era: "old", hw: (a) => ({ [`مجرى عجل أبيض ${runLen(a.dd)} سم (زوج)`]: a.drawers }) },
    ball: { label: "مجرى بلي 3 مراحل", era: "std", hw: (a) => ({ [`مجرى بلي فتح كامل ${runLen(a.dd)} سم (زوج)`]: a.drawers }) },
    soft: { label: "مجرى مخفي سوفت كلوز (Tandem)", era: "new", hw: (a) => ({ [`مجرى مخفي سوفت كلوز ${runLen(a.dd)} سم (زوج)`]: a.drawers }) },
    metal: { label: "درج معدن جاهز (Tandembox / Antaro)", era: "new", hw: (a) => ({ [`طقم درج معدن (جوانب + مجرى) ${runLen(a.dd)} سم`]: a.drawers }), note: "الجوانب معدن — من الخشب بيتقص القاع والضهر والوش بس" },
    legra: { label: "درج نحيف (Legrabox)", era: "smart", hw: (a) => ({ [`طقم درج ليجرا بوكس ${runLen(a.dd)} سم`]: a.drawers }) },
  } },
  flap: { label: "ميكانيزم القلاب", items: {
    "": { label: "حسب الوحدة", era: "std" },
    stay: { label: "كتيفة قلاب (ذراع بفرملة)", era: "old", hw: (a) => ({ "كتيفة قلاب بفرملة": a.flaps * 2 }) },
    gas: { label: "جاك غاز (مكبس)", era: "std", hw: (a) => ({ "جاك غاز للقلاب 80N": a.flaps * 2 }) },
    hk: { label: "Aventos HK (بيقف في أي ارتفاع)", era: "new", hw: (a) => ({ "طقم Aventos HK-top": a.flaps }) },
    hl: { label: "Aventos HL (بيطلع لفوق موازي)", era: "new", hw: (a) => ({ "طقم Aventos HL": a.flaps }) },
    hf: { label: "Aventos HF (بيتطبّق نصين)", era: "new", hw: (a) => ({ "طقم Aventos HF (قلاب مطبّق)": a.flaps }), note: "الضلفة بتتقسم نصين بمفصلات بينهم" },
    hs: { label: "Aventos HS (بيطلع ويلف فوق)", era: "new", hw: (a) => ({ "طقم Aventos HS": a.flaps }) },
  } },
  slide: { label: "نظام الضلف الجرار", items: {
    "": { label: "حسب الوحدة", era: "std" },
    bottom: { label: "عجل تحت + دليل فوق", era: "old", hw: (a) => ({ "طقم عجل جرار سفلي (لكل ضلفة)": a.sliders, [`مسار ألومنيوم فوق وتحت ${a.W} سم`]: 1 }) },
    top: { label: "معلّق من فوق", era: "std", hw: (a) => ({ "طقم عجل جرار معلّق (لكل ضلفة)": a.sliders, [`مسار تعليق ألومنيوم ${a.W} سم`]: 1 }) },
    soft: { label: "جرار سوفت كلوز (بيقفل لوحده)", era: "new", hw: (a) => ({ "طقم جرار سوفت كلوز (لكل ضلفة)": a.sliders, [`مسار جرار فوق وتحت ${a.W} سم`]: 1 }) },
    pocket: { label: "ضلف جيب (بتدخل جوه الجنب)", era: "new", hw: (a) => ({ "طقم ضلف جيب (Pocket door) لكل ضلفة": Math.max(1, a.sliders || a.doors) }), note: "محتاجة فراغ 6–8 سم في الجنب لكل ضلفة" },
    fold: { label: "أكورديون (فولدنج)", era: "std", hw: (a) => ({ "طقم ضلف فولدنج (مفصلات + مسار)": 1 }) },
  } },
};
/** counts the mechanism hardware needs, from the unit's movers and boxes */
export function mechCounts(r) {
  const mv = r.movers || [];
  const boxesOf = (i) => (r.meshes ? r.meshes.filter((m) => m.mover === i).map((m) => m.box) : (r.parts || []).filter((p, j) => r.partMover?.[j] === i && p.box).map((p) => p.box));
  const a = { doors: 0, flaps: 0, drawers: 0, sliders: 0, hinges: 0, doorHsum: 0, dd: 45, W: Math.round(+r.params?.width || 0) };
  mv.forEach((m, i) => {
    if (m.acc) return;
    const bs = boxesOf(i);
    if (!bs.length) return;
    const z0 = Math.min(...bs.map((b) => b.z0)), z1 = Math.max(...bs.map((b) => b.z1)), x0 = Math.min(...bs.map((b) => b.x0)), x1 = Math.max(...bs.map((b) => b.x1)), y1 = Math.max(...bs.map((b) => b.y1)), y0 = Math.min(...bs.map((b) => b.y0));
    if (m.kind === "slide") a.sliders++;
    else if (m.kind === "drawer") { a.drawers++; a.dd = Math.max(a.dd, y1 - y0); }
    else if (Math.abs((m.axis || [0, 0, 1])[2]) < 0.5) { a.flaps++; a.hinges += (x1 - x0) > 90 ? 3 : 2; }
    else { a.doors++; const h = z1 - z0; a.doorHsum += h; a.hinges += h <= 90 ? 2 : h <= 160 ? 3 : h <= 200 ? 4 : 5; }
  });
  return a;
}

// ------------------------------------------------------------------------------------------------ geometry helpers (pure)
/** a wooden tray (bottom + 4 low sides) in a cavity at height z, lip h — for the cut list */
function tray(c, z, lip, name) {
  const T = 1.6, x0 = c.x0 + 1.3, x1 = c.x1 - 1.3, y0 = c.y0 + 0.5, y1 = c.y1 - 1.5, B = 1.2;
  return [
    { name: `${name} — قاع`, x: x0 + T, y: y0 + T, z, w: x1 - x0 - 2 * T, d: y1 - y0 - 2 * T, h: B, material: "back" },
    { name: `${name} — جنب شمال`, x: x0, y: y0, z, w: T, d: y1 - y0, h: lip, material: "carcass" },
    { name: `${name} — جنب يمين`, x: x1 - T, y: y0, z, w: T, d: y1 - y0, h: lip, material: "carcass" },
    { name: `${name} — قدام`, x: x0 + T, y: y0, z, w: x1 - x0 - 2 * T, d: T, h: lip, material: "carcass" },
    { name: `${name} — ورا`, x: x0 + T, y: y1 - T, z, w: x1 - x0 - 2 * T, d: T, h: lip, material: "carcass" },
  ];
}
const ix = (c, inset = 1.3) => [c.x0 + inset, c.x1 - inset];
function stackPull(k, c, n, one) {
  const span = (c.h - 2) / n;
  for (let i = 0; i < n; i++) { const z = c.z0 + 1.5 + i * span; k.runners(c, z + 4); one(z, span); }
}

// ------------------------------------------------------------------------------------------------ the 3D kit
/** kit(THREE, mats, S, M) — S = fixed group, M = the moving group (same frame) */
export function kit(THREE, mats, S, Mv, ctx = {}) {
  const P = (x, y, z) => new THREE.Vector3(x, z, -y);
  const up = new THREE.Vector3(0, 1, 0);
  const geoCache = ctx.geoCache || new Map();
  const g = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
  const put = (geo, mat, pos, quat, mv, name) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    if (quat) m.quaternion.copy(quat);
    m.castShadow = !!ctx.shadows; m.receiveShadow = !!ctx.shadows;
    m.userData.pname = name || ctx.name || "إكسسوار"; m.userData.appl = true;
    (mv ? Mv : S).add(m);
    ctx.made?.push(m);
    return m;
  };
  const K = {
    THREE, M: mats, P,
    y0f: (c) => c.y0 + 1, y1f: (c) => c.y1 - 2,
    box(x0, y0, z0, x1, y1, z1, mat, mv = 0, name) {
      const sx = Math.max(0.05, x1 - x0), sy = Math.max(0.05, z1 - z0), sz = Math.max(0.05, y1 - y0);
      return put(new THREE.BoxGeometry(sx, sy, sz), mat, P((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), null, mv, name);
    },
    rbox(x0, y0, z0, x1, y1, z1, mat, mv = 0, rad = 0.6) {
      const sx = Math.max(0.1, x1 - x0), sy = Math.max(0.1, z1 - z0), sz = Math.max(0.1, y1 - y0);
      const geo = ctx.RBox ? new ctx.RBox(sx, sy, sz, 2, Math.min(rad, sx / 2.2, sy / 2.2, sz / 2.2)) : new THREE.BoxGeometry(sx, sy, sz);
      return put(geo, mat, P((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), null, mv);
    },
    /** a round bar from a to b ([x, y, z]) */
    rod(a, b, rad, mat, mv = 0, seg = 8) {
      const A = P(...a), B = P(...b), d = B.clone().sub(A), L = d.length();
      if (L < 0.05) return null;
      const geo = g(`c${rad}_${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg));
      const m = put(geo, mat, A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, d.normalize()), mv);
      m.scale.set(rad, L, rad);
      return m;
    },
    cyl(x, y, z0, h, rad, mat, mv = 0, seg = 16) { return K.rod([x, y, z0], [x, y, z0 + h], rad, mat, mv, seg); },
    ball(x, y, z, rad, mat, mv = 0) { const m = put(g("sph", () => new THREE.SphereGeometry(1, 14, 10)), mat, P(x, y, z), null, mv); m.scale.setScalar(rad); return m; },
    torus(x, y, z, R, rad, mat, mv = 0, axis = "z", arc = Math.PI * 2) {
      const m = put(new THREE.TorusGeometry(R, rad, 8, 32, arc), mat, P(x, y, z), null, mv);
      if (axis === "z") m.rotation.x = Math.PI / 2; else if (axis === "x") m.rotation.y = Math.PI / 2;
      return m;
    },
    disc(x, y, z, R, t, mat, mv = 0, arc = Math.PI * 2, a0 = 0) {
      const m = put(new THREE.CylinderGeometry(R, R, t, 40, 1, false, a0, arc), mat, P(x, y, z + t / 2), null, mv);
      return m;
    },
    /** wire basket: frame rods (6 mm) round the top + a middle rail, posts, bottom wires every 2.5 cm (front to back) */
    basket(x0, x1, y0, y1, z0, h, o = {}) {
      const mv = o.mv ? 1 : 0, m = o.mat || mats.chrome, R = 0.3, r = 0.18;
      for (const zz of [z0 + 0.3, z0 + h * 0.55, z0 + h]) {
        K.rod([x0, y0, zz], [x1, y0, zz], zz === z0 + h ? R : r, m, mv); K.rod([x0, y1, zz], [x1, y1, zz], zz === z0 + h ? R : r, m, mv);
        K.rod([x0, y0, zz], [x0, y1, zz], zz === z0 + h ? R : r, m, mv); K.rod([x1, y0, zz], [x1, y1, zz], zz === z0 + h ? R : r, m, mv);
      }
      const nx = Math.max(2, Math.round((x1 - x0) / 2.5));
      for (let i = 1; i < nx; i++) { const x = x0 + ((x1 - x0) * i) / nx; K.rod([x, y0, z0 + 0.3], [x, y1, z0 + 0.3], r, m, mv, 6); }
      if (!o.noSidePosts) {
        const ny = Math.max(1, Math.round((y1 - y0) / 6)), nf = Math.max(1, Math.round((x1 - x0) / 6));
        for (let j = 0; j <= ny; j++) { const y = y0 + ((y1 - y0) * j) / ny; K.rod([x0, y, z0 + 0.3], [x0, y, z0 + h], r, m, mv, 6); K.rod([x1, y, z0 + 0.3], [x1, y, z0 + h], r, m, mv, 6); }
        for (let j = 1; j < nf; j++) { const x = x0 + ((x1 - x0) * j) / nf; K.rod([x, y0, z0 + 0.3], [x, y0, z0 + h], r, m, mv, 6); K.rod([x, y1, z0 + 0.3], [x, y1, z0 + h], r, m, mv, 6); }
      }
    },
    /** a pair of telescopic ball-bearing runners at height z (fixed member on the cavity sides, inner member moving) */
    runners(c, z, hh = 2.2) {
      const L = Math.min(c.d - 2, runLen(c.d)), y0 = c.y0 + 0.5;
      for (const [xa, xb] of [[c.x0, c.x0 + 1.27], [c.x1 - 1.27, c.x1]]) {
        K.box(xa, y0, z - hh, xb, y0 + L, z + hh, mats.zinc, 0, "مجرى");
        K.box(xa + 0.15, y0, z - hh * 0.72, xb - 0.15, y0 + L - 1, z + hh * 0.72, mats.zinc, 1, "مجرى");
      }
    },
    goods(kind, x0, x1, y0, y1, z0, h) { goods(K, kind, x0, x1, y0, y1, z0, h); },
  };
  return K;
}

// ------------------------------------------------------------------------------------------------ what goes inside (pictures)
const COLS = { bottles: [0x355e2a, 0x7a3e12, 0x1d3b2a, 0xb88a2a, 0x5e1f1f], spice: [0xb5651d, 0xc23b22, 0x7a8b3a, 0xd9a520, 0x6b4226], cans: [0xb8bcc0, 0xc23b22, 0x2f6f9f, 0xe0b030], cloth: [0x3a7bd5, 0x2fa36b, 0xf2c94c, 0xe85d75], fold: [0x2f3e5c, 0xd8d2c4, 0x7b2d26, 0x48607a, 0xb7a58c, 0x222222], shirt: [0xf2f2f0, 0x9fb8d6, 0x2f3e5c, 0xd8c3a5, 0x6e7f5e, 0x8b2f39] };
const matCache = new Map();
function cmat(K, hex, o = {}) {
  const key = hex + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new K.THREE.MeshStandardMaterial({ color: hex, roughness: o.rough ?? 0.5, metalness: o.metal ?? 0, transparent: !!o.op, opacity: o.op ?? 1 }));
  return matCache.get(key);
}
function goods(K, kind, x0, x1, y0, y1, z0, h) {
  const mv = 1, W = x1 - x0, D = y1 - y0;
  if (W < 4 || D < 4 || h < 2) return;
  const grid = (sx, sy, fn) => { const nx = Math.max(1, Math.floor(W / sx)), ny = Math.max(1, Math.floor(D / sy)); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) fn(x0 + (W / nx) * (i + 0.5), y0 + (D / ny) * (j + 0.5), i, j); };
  if (kind === "bottles" || kind === "oil") grid(kind === "oil" ? 7.5 : 9.5, 9, (x, y, i, j) => { const r = kind === "oil" ? 3 : 3.8, hh = Math.min(h * 2.2, kind === "oil" ? 28 : 32), m = cmat(K, COLS.bottles[(i + j * 3) % 5], { rough: 0.12, op: 0.85 }); K.cyl(x, y, z0, hh * 0.75, r, m, mv); K.rod([x, y, z0 + hh * 0.75], [x, y, z0 + hh * 0.9], r * 0.45, m, mv); K.cyl(x, y, z0 + hh * 0.9, hh * 0.08, r * 0.38, K.M.dark, mv); });
  else if (kind === "spice" || kind === "jars") grid(kind === "jars" ? 9 : 5.8, kind === "jars" ? 9 : 6, (x, y, i, j) => { const r = kind === "jars" ? 3.6 : 2.4, hh = Math.min(h * 0.9, kind === "jars" ? 14 : 10); K.cyl(x, y, z0, hh, r, cmat(K, COLS.spice[(i + j) % 5], { rough: 0.3, op: 0.9 }), mv); K.cyl(x, y, z0 + hh, 1.2, r * 1.02, cmat(K, kind === "jars" ? 0xd6d0c4 : 0x222222, { metal: 0.3 }), mv); });
  else if (kind === "cans") grid(8, 8, (x, y, i, j) => K.cyl(x, y, z0, Math.min(h * 0.9, 12), 3.6, cmat(K, COLS.cans[(i + j) % 4], { metal: 0.6, rough: 0.3 }), mv));
  else if (kind === "cosm") grid(5, 6, (x, y, i, j) => { const tall = (i + j) % 3 === 0; K.cyl(x, y, z0, Math.min(h * 0.9, tall ? 14 : 8), tall ? 1.8 : 2.4, cmat(K, [0xf3d3c8, 0xe8e2d8, 0xc8a2c8, 0x9fd3c7][(i + j) % 4], { rough: 0.2 }), mv); });
  else if (kind === "pots") {
    const n = Math.max(1, Math.floor(W / 24)); for (let i = 0; i < n; i++) { const x = x0 + (W / n) * (i + 0.5), r = Math.min(10, W / n / 2 - 1, D / 2 - 1), hh = Math.min(h * 0.9, 12); K.cyl(x, y0 + D / 2, z0 + 0.3, hh, r, K.M.steel, mv, 24); K.cyl(x, y0 + D / 2, z0 + 0.3 + hh, 0.5, r * 0.98, K.M.dark, mv, 24); }
  } else if (kind === "trays") {
    const n = Math.max(1, Math.floor(W / 2.2)); for (let i = 0; i < Math.min(n, 4); i++) { const x = x0 + 0.6 + i * 2.2; K.box(x, y0 + 2, z0 + 0.5, x + 0.4, y1 - 2, z0 + h * (0.75 + 0.06 * (i % 3)), i % 2 ? K.M.dark : cmat(K, 0xb08550, { rough: 0.6 }), 0); }
  } else if (kind === "folded") {
    const n = Math.max(1, Math.floor(W / 28)), m = Math.max(1, Math.floor(D / 32)); let q = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const cx = x0 + (W / n) * (i + 0.5), cy = y0 + (D / m) * (j + 0.5), lay = Math.max(1, Math.floor(h / 2.6)); for (let l = 0; l < lay; l++) K.rbox(cx - 12, cy - 14, z0 + l * 2.5, cx + 12, cy + 14, z0 + l * 2.5 + 2.4, cmat(K, COLS.fold[(q++) % 6], { rough: 0.95 }), mv, 0.9); }
  } else if (kind === "keyboard") { K.rbox(x0, y0, z0, x1, y1, z0 + h, cmat(K, 0x2a2b2d, { rough: 0.6 }), mv, 0.5); }
}
/** a hanger with a garment (shirt, jacket or dress), its hook on the rail at (x, y, z) */
function garment(K, x, y, z, len, col, mv, ang = 0) {
  // built round its own hook in a small group, turned by ang about the vertical (a carousel turns them round)
  const T = K.THREE, grp = new T.Group(), m = cmat(K, col, { rough: 0.95 }), wood = K.M.hanger;
  const sub = kit(T, K.M, grp, grp, { name: "هدوم" });
  sub.torus(0, 0, 0.2, 1.2, 0.18, K.M.chrome, 0, "x", Math.PI * 1.3);
  sub.rod([0, 0, -1], [0, 0, -2.6], 0.2, K.M.chrome);
  sub.rod([0, -21, -7], [0, 0, -2.6], 0.6, wood); sub.rod([0, 0, -2.6], [0, 21, -7], 0.6, wood);
  sub.rbox(-1.4, -23, -len, 1.4, 23, -6.5, m, 0, 1);
  grp.position.copy(K.P(x, y, z));
  grp.rotation.y = ang;
  (mv ? K.Mv : K.S).add(grp);
}
function shoe(K, x, y, z, tilt, col, mv, along = "y") {
  const m = cmat(K, col, { rough: 0.55 }), L = 27, W = 9.5;
  // sole + upper + heel as rounded boxes (stylised), along y (toe to the front)
  const g = new K.THREE.Group();
  const mk = (sx, sy, sz, px, py, pz, mat) => { const geo = new K.THREE.BoxGeometry(sx, sy, sz); const me = new K.THREE.Mesh(geo, mat); me.position.set(px, py, pz); me.userData.pname = "جزمة"; me.userData.appl = true; g.add(me); };
  mk(W, 1.2, L, 0, 0.6, 0, cmat(K, 0x1d1d1d, { rough: 0.8 }));
  mk(W * 0.92, 7, L * 0.62, 0, 4.4, L * 0.16, m);
  mk(W * 0.86, 4, L * 0.38, 0, 3.2, -L * 0.3, m);
  mk(W * 0.5, 3, 4, 0, 1.5, L * 0.42, cmat(K, 0x1d1d1d, { rough: 0.8 }));
  g.position.copy(K.P(x, y, z));
  g.rotation.x = -tilt;
  if (along === "x") g.rotation.y = Math.PI / 2;
  (mv ? K.Mv : K.S).add(g);
}

// ------------------------------------------------------------------------------------------------ the pictures, one per kind
function trolleyFrame(k, c, n, show, rows, acryl) {
  const x0 = c.x0 + 1.5, x1 = c.x1 - 1.5, y0 = k.y0f(c) + 1, y1 = k.y1f(c), z0 = c.z0 + 1.5, z1 = c.z1 - 1.5, M = k.M;
  // the rear and front posts of the frame + the runner at the bottom (full extension under the frame) and the guide at the top
  for (const y of [y0 + 0.6, y1 - 0.6]) { k.box(x0 + (x1 - x0) / 2 - 1.2, y - 0.6, z0, x0 + (x1 - x0) / 2 + 1.2, y + 0.6, z1, M.alu, 1); }
  k.box(x0, y0, z0 - 1.2, x1, y1, z0, M.anth, 1);
  k.box(c.x0 + (c.w - 4) / 2, c.y0 + 0.5, c.z0, c.x0 + (c.w + 4) / 2, c.y0 + runLen(c.d), c.z0 + 1.2, M.zinc, 0, "مجرى سفلي");
  k.box(c.x0 + (c.w - 3) / 2, c.y0 + 0.5, z1, c.x0 + (c.w + 3) / 2, c.y0 + runLen(c.d), z1 + 1.2, M.zinc, 0, "دليل علوي");
  const span = (z1 - z0 - 2) / n;
  for (let i = 0; i < n; i++) {
    const z = z0 + 1 + i * span, hh = Math.min(10, span * 0.4);
    if (acryl) { k.box(x0, y0, z, x1, y1, z + 0.5, M.acryl, 1); k.box(x0, y0, z, x1, y0 + 0.4, z + hh * 0.6, M.acryl, 1); k.box(x0, y1 - 0.4, z, x1, y1, z + hh * 0.6, M.acryl, 1); }
    else k.basket(x0, x1, y0, y1, z, hh, { mv: 1 });
    if (show) k.goods(rows[Math.min(i, rows.length - 1)], x0 + 0.6, x1 - 0.6, y0 + 0.6, y1 - 0.6, z + 0.5, Math.min(span - 2, 18));
  }
}
function doorBin(k, c) {
  // on the door's back: a bracket + a 12 l bin whose lid lifts when the door opens
  const M = k.M, cx = c.x0 + c.w / 2, y0 = c.y0 + 0.4, z0 = c.z0 + Math.max(4, c.h * 0.2), W = Math.min(28, c.w - 8), D = 22, H = Math.min(36, c.h - 10);
  k.box(cx - W / 2 - 1, y0, z0 + H - 4, cx + W / 2 + 1, y0 + 1, z0 + H + 1, M.anth, 1);
  k.rbox(cx - W / 2, y0 + 1.2, z0, cx + W / 2, y0 + 1.2 + D, z0 + H, M.binGray, 1, 2.5);
  k.rbox(cx - W / 2 - 0.4, y0 + 1, z0 + H, cx + W / 2 + 0.4, y0 + 1.6 + D, z0 + H + 1.2, M.white, 1, 0.5);
}
function binFrame(k, c, n) {
  const M = k.M, x0 = c.x0 + 1.4, x1 = c.x1 - 1.4, y0 = c.y0 + 1, y1 = c.y1 - 2, z0 = c.z0 + 1, H = Math.min(38, c.h - 6);
  k.runners(c, z0 + 2.5);
  k.box(x0, y0, z0, x1, y1, z0 + 0.8, M.anth, 1); k.box(x0, y0, z0, x0 + 0.8, y1, z0 + 6, M.anth, 1); k.box(x1 - 0.8, y0, z0, x1, y1, z0 + 6, M.anth, 1);
  const w = (x1 - x0 - 1 - (n - 1)) / n, cols = [0x5a5f63, 0x3f6f4a, 0x2f5f8a, 0x8a6f2f];
  for (let i = 0; i < n; i++) {
    const a = x0 + 0.5 + i * (w + 1);
    k.rbox(a, y0 + 1, z0 + 0.8, a + w, y1 - 1, z0 + H, cmat(k, cols[i % 4], { rough: 0.55 }), 1, 1.5);
    k.box(a + w * 0.3, y0 + 1.5, z0 + H - 3, a + w * 0.7, y0 + 2.5, z0 + H - 1.5, M.dark, 1);
  }
  k.box(x0, y0 + 0.5, z0 + H + 1.2, x1, y1, z0 + H + 2, M.white, 0, "غطا الصناديق");
}
function sinkU(k, c) {
  const M = k.M, x0 = c.x0 + 1.5, x1 = c.x1 - 1.5, y0 = c.y0 + 1, y1 = c.y1 - 2, z0 = c.z0 + 1, H = Math.min(18, c.h - 4);
  const notch = Math.min(26, (x1 - x0) * 0.4), cx = (x0 + x1) / 2, ny = y0 + (y1 - y0) * 0.45;
  k.runners(c, z0 + 3);
  // the U: two arms + the front part, anthracite plastic, with the siphon notch at the back middle
  k.box(x0, y0, z0, x1, ny, z0 + 0.8, M.anth, 1);
  k.box(x0, ny, z0, cx - notch / 2, y1, z0 + 0.8, M.anth, 1); k.box(cx + notch / 2, ny, z0, x1, y1, z0 + 0.8, M.anth, 1);
  for (const [a, b, c0, d0] of [[x0, x0 + 0.8, y0, y1], [x1 - 0.8, x1, y0, y1], [x0, x1, y0, y0 + 0.8], [x0, cx - notch / 2, y1 - 0.8, y1], [cx + notch / 2, x1, y1 - 0.8, y1], [cx - notch / 2 - 0.8, cx - notch / 2, ny, y1], [cx + notch / 2, cx + notch / 2 + 0.8, ny, y1], [cx - notch / 2, cx + notch / 2, ny, ny + 0.8]]) k.box(a, c0, z0, b, d0, z0 + H, M.anth, 1);
  // the siphon + pipes (fixed)
  k.cyl(cx, (ny + y1) / 2 + 2, c.z0 + H + 2, c.z1 - c.z0 - H - 2, 2.2, M.pvc);
  k.rod([cx, (ny + y1) / 2 + 2, c.z0 + H + 4], [cx, c.y1 - 1, c.z0 + H + 4], 2, M.pvc);
  k.goods("cosm", x0 + 1.5, cx - notch / 2 - 1.5, y0 + 1.5, y1 - 1.5, z0 + 1, H - 2);
}
function caddy(k, c, show) {
  const W = Math.min(16, (c.w - 30) / 2), z = c.z0 + 1.5, H = Math.min(30, c.h - 6);
  for (const [a, b] of [[c.x0 + 1.3, c.x0 + 1.3 + W], [c.x1 - 1.3 - W, c.x1 - 1.3]]) {
    k.box(a + W / 2 - 1.5, c.y0 + 0.5, c.z0, a + W / 2 + 1.5, c.y0 + runLen(c.d), c.z0 + 1, k.M.zinc);
    k.basket(a, b, c.y0 + 1, c.y1 - 2, z, H * 0.45, { mv: 1 });
    k.basket(a, b, c.y0 + 1, c.y1 - 2, z + H * 0.55, H * 0.4, { mv: 1 });
    if (show) { k.goods("cosm", a + 0.5, b - 0.5, c.y0 + 2, c.y1 - 3, z + 0.4, H * 0.42); k.goods("cosm", a + 0.5, b - 0.5, c.y0 + 2, c.y1 - 3, z + H * 0.55 + 0.4, H * 0.38); }
  }
  k.cyl(c.x0 + c.w / 2, c.y1 - 10, c.z0 + 15, c.h - 15, 2.2, k.M.pvc);
}
function lazy(k, c, o) {
  const M = k.M, cx = c.x0 + c.w / 2, cy = c.y0 + c.d / 2, R = Math.min(c.w, c.d) / 2 - 2.5, n = o.n, span = (c.h - 4) / n;
  k.cyl(cx, cy, c.z0, c.h, 1.2, M.chrome, 0);
  const arc = o.shape === "full" ? Math.PI * 2 : Math.PI * 1.5;
  for (let i = 0; i < n; i++) {
    const z = c.z0 + 2 + i * span;
    k.disc(cx, cy, z, R, 0.8, M.white, 1, arc, Math.PI * 0.25);
    k.torus(cx, cy, z + 3, R, 0.35, M.chrome, 1, "z", arc);
    if (o.show) for (let a = 0; a < (o.shape === "full" ? 7 : 5); a++) { const ang = a * (arc / (o.shape === "full" ? 7 : 5.5)) + Math.PI * 0.4, rr = R * 0.65; k.cyl(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, z + 0.8, Math.min(span - 4, 14), 3.4, cmat(k, COLS.cans[a % 4], { metal: 0.5, rough: 0.3 }), 1); }
  }
}
function table(k, c, desk) {
  const M = k.M;
  k.runners(c, c.z1 - 2.8, 1.4);
  // the folding leg under the front edge (aluminium tube + foot), hinged under the top
  const lx = c.x0 + c.w / 2, ly = c.y0 + 3, lz = c.z1 - 4.2;
  k.box(lx - 4, ly - 1, lz - 1, lx + 4, ly + 3, lz, M.alu, 1);
  if (desk) k.goods("keyboard", c.x0 + 6, c.x0 + Math.min(c.w - 6, 50), c.y0 + 6, c.y0 + 22, c.z1 - 1.7, 1.6);
  else for (const dx of [-0.25, 0.25]) { k.cyl(c.x0 + c.w * (0.5 + dx), c.y0 + c.d * 0.5, c.z1 - 1.7, 0.5, 11, M.white, 1, 30); }
}
function mixerLift(k, c, show) {
  const M = k.M, x0 = c.x0 + 2, x1 = c.x1 - 2, y0 = c.y0 + 4, y1 = Math.min(c.y1 - 4, c.y0 + 50), z = c.z0 + 6;
  for (const x of [x0, x1 - 1.5]) {
    // the spring housing stays on the side panel; the shelf rides on two brackets
    k.box(x, y1 - 16, c.z0 + 3, x + 1.5, y1 - 2, c.z0 + 20, M.anth, 0, "ميكانيزم الليفت");
    k.rod([x + 0.75, y1 - 9, c.z0 + 11], [x + 0.75, y1 - 20, c.z0 + 6], 0.9, M.anth, 0);
    k.box(x, y0 + 4, z - 3, x + 1.5, y0 + 30, z, M.anth, 1, "كتيفة الرف");
  }
  if (show) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    k.rbox(cx - 9, cy - 13, z + 1.8, cx + 9, cy + 13, z + 6, M.red, 1, 1.5);
    k.rbox(cx - 4, cy + 5, z + 6, cx + 4, cy + 13, z + 30, M.red, 1, 2);
    k.rbox(cx - 7, cy - 18, z + 24, cx + 4, cy + 13, z + 33, M.red, 1, 3);
    k.cyl(cx, cy - 4, z + 6, 14, 8, M.steel, 1, 28);
  }
}
function towels(k, c) {
  const M = k.M, x0 = c.x0 + 1.5, x1 = c.x1 - 1.5, y0 = c.y0 + 1, y1 = c.y1 - 2, zt = c.z1 - 2;
  k.box((x0 + x1) / 2 - 1, c.y0 + 0.5, zt, (x0 + x1) / 2 + 1, c.y0 + runLen(c.d), zt + 1.5, M.zinc, 0);
  k.box((x0 + x1) / 2 - 0.8, y0, zt - 1, (x0 + x1) / 2 + 0.8, y1, zt, M.alu, 1);
  for (let i = 0; i < 3; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / 3;
    k.rod([x, y0 + 1, zt - 1], [x, y0 + 1, zt - 4], 0.3, M.chrome, 1); k.rod([x, y1 - 1, zt - 1], [x, y1 - 1, zt - 4], 0.3, M.chrome, 1);
    k.rod([x, y0 + 1, zt - 4], [x, y1 - 1, zt - 4], 0.4, M.chrome, 1);
    const tw = Math.min(28, y1 - y0 - 6), ty = y0 + 3 + ((y1 - y0 - 6 - tw) * i) / 3, td = Math.min(22, c.h - 12);
    k.box(x - 0.9, ty, zt - 4 - td, x - 0.3, ty + tw, zt - 4, cmat(k, COLS.cloth[i % 4], { rough: 1 }), 1);
    k.box(x + 0.3, ty, zt - 4 - td * 0.8, x + 0.9, ty + tw, zt - 4, cmat(k, COLS.cloth[i % 4], { rough: 1 }), 1);
  }
}
function wine(k, c, show) {
  const M = k.M, n = Math.max(1, Math.floor((c.w - 2) / 10)), m = Math.max(1, Math.floor((c.h - 2) / 10)), cw = (c.w - 2) / n, ch = (c.h - 2) / m;
  for (let i = 0; i <= n; i++) for (const y of [c.y0 + 3, c.y1 - 3]) k.rod([c.x0 + 1 + i * cw, y, c.z0 + 1], [c.x0 + 1 + i * cw, y, c.z1 - 1], 0.3, M.chrome, 0);
  for (let j = 0; j <= m; j++) for (const y of [c.y0 + 3, c.y1 - 3]) k.rod([c.x0 + 1, y, c.z0 + 1 + j * ch], [c.x1 - 1, y, c.z0 + 1 + j * ch], 0.3, M.chrome, 0);
  if (show) for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    if ((i * 7 + j * 3) % 4 === 3) continue;
    const x = c.x0 + 1 + (i + 0.5) * cw, z = c.z0 + 1 + (j + 0.5) * ch, r = Math.min(3.8, cw / 2 - 0.6, ch / 2 - 0.6), L = Math.min(c.d - 4, 30), mm = cmat(k, COLS.bottles[(i + j) % 5], { rough: 0.12, op: 0.9 });
    k.rod([x, c.y0 + 2 + L * 0.25, z], [x, c.y0 + 2 + L, z], r, mm, 0, 14); k.rod([x, c.y0 + 2, z], [x, c.y0 + 2 + L * 0.25, z], r * 0.4, mm, 0, 10);
  }
}
function popup(k, c) {
  // a stainless tower in the counter above the unit: drawn above the unit's top, rising when open
  const M = k.M, ext = c.ext, x = ext.x0 + (ext.x1 - ext.x0) * 0.82, y = ext.y0 + (ext.y1 - ext.y0) * 0.78, z = ext.z1;
  k.cyl(x, y, z + 3.6, 0.4, 3.5, M.steel, 0, 28);
  k.cyl(x, y, z - 18, 22, 3, M.steel, 1, 28);
  for (const zz of [z - 2, z - 9]) k.box(x - 1.6, y - 3.2, zz - 2.4, x + 1.6, y - 2.6, zz + 2.4, M.dark, 1);
}
function drainer(k, c, show) {
  const M = k.M, x0 = c.x0 + 1, x1 = c.x1 - 1, y0 = c.y0 + 2, y1 = c.y1 - 2;
  const lv = [[c.z0 + 4, 0.55, "plates"], [c.z0 + Math.min(c.h * 0.58, 40), 0.5, "cups"]];
  for (const [z, ny, kind] of lv) {
    // the rails on the sides + the wire frame
    for (const x of [c.x0, c.x1 - 1.2]) k.box(x, y0, z - 1, x + 1.2, y1, z + 1, M.steel, 0);
    k.rod([x0, y0, z], [x1, y0, z], 0.3, M.steel); k.rod([x0, y1, z], [x1, y1, z], 0.3, M.steel);
    if (kind === "plates") {
      const yb = y0 + (y1 - y0) * ny;
      for (let x = x0 + 1.5; x < x1 - 1; x += 2.6) { k.rod([x, yb - 4, z], [x, yb - 4, z + 11], 0.2, M.steel); k.rod([x, yb + 4, z], [x, yb + 4, z + 14], 0.2, M.steel); }
      if (show) for (let x = x0 + 3; x < x1 - 3; x += 5.2) k.disc(x, yb, z + 12, 12.5, 0.6, M.porcelain, 0).rotation.set(0, 0, Math.PI / 2);
    } else {
      for (let y = y0 + 2; y < y1; y += 3) k.rod([x0, y, z], [x1, y, z], 0.18, M.steel);
      if (show) for (let x = x0 + 5; x < x1 - 4; x += 9) for (let y = y0 + 5; y < y1 - 4; y += 9) k.cyl(x, y, z + 0.3, 10, 3.6, M.glassCup, 0, 18);
    }
  }
  k.box(x0, y0, c.z0 + 0.4, x1, y1, c.z0 + 1.2, M.drip);
}
function pullDown(k, c, show, kind) {
  // a pantograph lift: two side housings at the back top, two arms each, the basket / rail hangs in front and comes down when open
  const M = k.M, x0 = c.x0 + 1.5, x1 = c.x1 - 1.5, yb = c.y1 - 3, zt = c.z1 - 2;
  for (const x of [c.x0, c.x1 - 1.6]) {
    k.box(x, yb - 16, zt - 18, x + 1.6, yb, zt, M.white, 0, "ميكانيزم النازل");
    k.cyl(x + 0.8, yb - 8, zt - 30, 12, 0.8, M.anth, 0);
    k.rod([x + 0.8, yb - 8, zt - 9], [x + 0.8, c.y0 + 6, zt - (c.h * 0.55)], 0.8, M.alu, 1);
  }
  if (kind === "wardrobe") {
    const z = zt - c.h * 0.55;
    k.rod([x0, c.y0 + 6, z], [x1, c.y0 + 6, z], 1, M.alu, 1);
    k.rod([(x0 + x1) / 2, c.y0 + 6, z - 1], [(x0 + x1) / 2, c.y0 - 4, z - 14], 0.5, M.alu, 1);
    if (show) for (let x = x0 + 4; x < x1 - 3; x += 5.5) garment(k, x, c.y0 + 6 + 0.01, z, Math.min(70, c.h * 0.9), COLS.shirt[Math.round(x) % 6], 1);
  } else {
    const h = (c.h - 10) / 2;
    for (let i = 0; i < 2; i++) { const z = c.z0 + 4 + i * (h + 2); k.basket(x0 + 1, x1 - 1, c.y0 + 1.5, c.y1 - 6, z, Math.min(9, h * 0.6), { mv: 1 }); if (show) k.goods(i ? "spice" : "jars", x0 + 2, x1 - 2, c.y0 + 3, c.y1 - 8, z + 0.4, Math.min(h - 3, 12)); }
    k.rod([x0 + 3, c.y0 + 1, c.z0 + 2], [x1 - 3, c.y0 + 1, c.z0 + 2], 0.6, M.alu, 1);
  }
}
function doorRack(k, c, n, depth, what) {
  // racks fixed on the back of the door (they swing with it): two side posts + n wire trays
  const M = k.M, x0 = c.x0 + 3.5, x1 = c.x1 - 3.5, y0 = c.y0 + 0.6, y1 = y0 + depth, z0 = c.z0 + 3, z1 = c.z1 - 3, span = (z1 - z0) / n;
  for (const x of [x0, x1]) k.box(x - 0.6, y0, z0, x + 0.6, y0 + 1, z1, M.alu, 1);
  for (let i = 0; i < n; i++) {
    const z = z0 + i * span + 1.5;
    k.basket(x0, x1, y0 + 0.6, y1, z, Math.min(6, span * 0.4), { mv: 1, noSidePosts: true });
    if (what) k.goods(what, x0 + 0.8, x1 - 0.8, y0 + 1, y1 - 0.6, z + 0.4, Math.min(span - 3, what === "jars" ? 14 : 10));
  }
}
function glassRack(k, c, show) {
  const M = k.M, n = Math.max(2, Math.floor((c.w - 4) / 9)), sp = (c.w - 4) / n, z = c.z1 - 0.2;
  for (let i = 0; i < n; i++) {
    const x = c.x0 + 2 + sp * (i + 0.5);
    k.box(x - 3.5, c.y0 + 2, z - 0.4, x - 2.5, c.y1 - 2, z, M.alu); k.box(x + 2.5, c.y0 + 2, z - 0.4, x + 3.5, c.y1 - 2, z, M.alu); k.box(x - 3.5, c.y0 + 2, z - 1, x + 3.5, c.y1 - 2, z - 0.4, M.alu);
    if (show) for (let y = c.y0 + 6; y < c.y1 - 5; y += 9) { k.disc(x, y, z - 1.6, 3.4, 0.3, M.glassCup); k.cyl(x, y, z - 13, 11.6, 0.3, M.glassCup, 0, 8); k.cyl(x, y, z - 21, 8, 3.6, M.glassCup, 0, 18); }
  }
}
function shutter(k, c, mat) {
  const M = k.M, sl = mat === "wood" ? M.woodSlat : mat === "glass" ? M.frost : M.aluSlat, y = c.y0 - 0.3, n = Math.max(4, Math.floor(c.h / 2.5));
  for (const x of [c.x0, c.x1 - 1.2]) k.box(x, c.y0 - 1, c.z0, x + 1.2, c.y0 + 1.5, c.z1, M.alu, 0, "مجرى الستارة");
  for (let i = 0; i < n; i++) { const z = c.z0 + (c.h * i) / n; k.box(c.x0 + 1.2, y - 0.4, z + 0.15, c.x1 - 1.2, y + 0.4, z + c.h / n - 0.15, sl, 1); }
  k.box(c.x0 + c.w * 0.35, y - 1.6, c.z0 + 1, c.x0 + c.w * 0.65, y - 0.4, c.z0 + 2.4, M.alu, 1);
}
function twin(k, c, n, show) {
  // door baskets (on the door) + inner baskets on a frame that comes out with the door
  doorRack(k, c, n, 9, show ? "jars" : null);
  const x0 = c.x0 + 2, x1 = c.x1 - 2, y0 = c.y0 + 11, y1 = c.y1 - 3, span = (c.h - 6) / n;
  for (const x of [x0, x1 - 1.5]) k.box(x, y0, c.z0 + 2, x + 1.5, y0 + 1.5, c.z1 - 2, M_(k).alu, 0);
  k.box(c.x0, c.y0 + 8, c.z1 - 6, c.x0 + 2, c.y0 + 14, c.z1 - 3, M_(k).anth, 0, "ذراع التاندم");
  for (let i = 0; i < n; i++) { const z = c.z0 + 3 + i * span; k.basket(x0 + 1.5, x1 - 1.5, y0 + 2, y1, z, Math.min(9, span * 0.4), { mv: 0 }); if (show) k.goods(["bottles", "cans", "jars", "spice", "spice", "cans"][i % 6], x0 + 2.5, x1 - 2.5, y0 + 3, y1 - 1, z + 0.4, Math.min(span - 3, 16)); }
}
const M_ = (k) => k.M;
function broom(k, c, show) {
  const M = k.M, x = c.x0 + 0.5;
  for (const z of [c.z0 + c.h * 0.55, c.z0 + c.h * 0.8]) for (let i = 0; i < 3; i++) { const y = c.y0 + 8 + i * Math.min(12, (c.d - 12) / 3); k.box(x, y - 1.5, z - 2, x + 2.5, y + 1.5, z + 2, M.anth); }
  if (show) {
    for (let i = 0; i < 3; i++) { const y = c.y0 + 8 + i * Math.min(12, (c.d - 12) / 3); k.cyl(x + 3.5, y, c.z0 + 2, c.h * 0.85, 1.1, cmat(k, [0x2f6f9f, 0xd9a520, 0x6e7f5e][i], { rough: 0.5 }), 0); }
    k.box(x + 1.5, c.y0 + 7, c.z0 + 2, x + 5.5, c.y0 + 30, c.z0 + 3, cmat(k, 0x2f6f9f, { rough: 0.5 }));
    k.cyl(c.x1 - 15, c.y0 + c.d / 2, c.z0, 26, 12, cmat(k, 0x3f6f4a, { rough: 0.6 }), 0, 24);
  }
}
function applShelf(k, c, dev) {
  const M = k.M; k.runners(c, c.z0 + 3, 1.4);
  const cx = c.x0 + c.w / 2, cy = c.y0 + Math.min(c.d, 45) / 2 + 1, z = c.z0 + 2.8;
  if (dev === "coffee") { k.rbox(cx - 14, cy - 18, z, cx + 14, cy + 18, z + Math.min(36, c.h - 6), M.coffee, 1, 2); k.box(cx - 8, cy - 18.6, z + 6, cx + 8, cy - 18, z + 18, M.dark, 1); k.cyl(cx, cy - 12, z + 1, 9, 3.5, M.porcelain, 1, 18); }
  else if (dev === "micro") { k.rbox(cx - 24, cy - 18, z, cx + 24, cy + 18, z + Math.min(28, c.h - 6), M.steel, 1, 1); k.box(cx - 22, cy - 18.6, z + 3, cx + 10, cy - 18, z + Math.min(25, c.h - 9), M.glassBlack, 1); }
}
// ---------------------------------------------------------------- wardrobes
function rail(k, c, show, led) {
  const M = k.M, z = c.z1 - 6, y = c.y0 + c.d / 2;
  for (const x of [c.x0, c.x1 - 1.5]) k.box(x, y - 2, z - 2, x + 1.5, y + 2, z + 1.5, M.alu, 0, "كتّافة شماعة");
  const r = k.box(c.x0 + 1.5, y - 1.5, z - 0.8, c.x1 - 1.5, y + 1.5, z + 0.8, M.alu, 0, "شماعة");
  if (led) { k.box(c.x0 + 1.5, y - 0.9, z - 1.1, c.x1 - 1.5, y + 0.9, z - 0.8, M.led, 0, "ليد الشماعة"); k.box(c.x0 + 1, c.y0 + 2, c.z0 + 1, c.x0 + 4, c.y0 + 4, c.z0 + 3, M.dark, 0, "حساس حركة"); }
  if (show) { const L = Math.min(c.h - 12, c.h > 140 ? 105 : 70); for (let x = c.x0 + 5; x < c.x1 - 4; x += 4.8) garment(k, x, y, z + 0.9, L * (0.75 + 0.25 * ((Math.round(x) * 7) % 3 === 0 ? 1 : 0.6)), COLS.shirt[Math.round(x / 4.8) % 6], 0); }
  return r;
}
function trousers(k, c, show) {
  const M = k.M, x0 = c.x0 + 1.5, x1 = c.x1 - 1.5, zt = Math.min(c.z1 - 3, c.z0 + 75);
  // top-mounted frame: two side bars on runners, rods across (rubber sleeves) every 3.6 cm front to back
  for (const x of [x0, x1 - 1.4]) { k.box(x, c.y0 + 0.5, zt, x + 1.4, c.y0 + runLen(c.d), zt + 3, M.zinc, 0); k.box(x, c.y0 + 1, zt - 2.5, x + 1.4, c.y1 - 2, zt, M.alu, 1); }
  const n = Math.max(6, Math.floor((c.d - 8) / 3.6));
  for (let i = 0; i < n; i++) { const y = c.y0 + 4 + i * ((c.d - 8) / n); k.rod([x0 + 1.4, y, zt - 1.2], [x1 - 1.4, y, zt - 1.2], 0.5, M.rubber, 1); if (show && i % 1 === 0) k.box(x0 + 4, y - 0.4, zt - 1.2 - Math.min(48, zt - c.z0 - 4), x1 - 4, y + 0.4, zt - 0.6, cmat(k, COLS.fold[i % 6], { rough: 1 }), 1); }
}
function tieRack(k, c, show) {
  const M = k.M, x = c.x0 + 2, z0 = c.z0 + 4, z1 = Math.min(c.z1 - 3, c.z0 + 80);
  k.box(x - 1.5, c.y0 + 0.5, z1, x, c.y0 + runLen(c.d), z1 + 2.5, M.zinc, 0);
  k.box(x, c.y0 + 1, z0, x + 1, c.y1 - 2, z1, M.anth, 1);
  const n = Math.floor((c.d - 6) / 3.2);
  for (let i = 0; i < n; i++) { const y = c.y0 + 3 + i * 3.2; k.rod([x + 1, y, z1 - 4], [x + 6, y, z1 - 4], 0.25, M.chrome, 1); if (show) k.box(x + 2, y - 0.2, z1 - 4 - 45, x + 6.5, y + 0.2, z1 - 3.6, cmat(k, [0x7b2d26, 0x2f3e5c, 0x6e7f5e, 0x8b6f2f, 0x222222][i % 5], { rough: 0.6 }), 1); }
}
function valet(k, c) {
  const M = k.M, x = c.x0 + c.w / 2, z = c.z1 - 1.5;
  k.box(x - 1.2, c.y0 + 0.5, z - 1.4, x + 1.2, c.y0 + 30, z, M.chrome, 0);
  k.box(x - 0.9, c.y0 + 0.2, z - 1.2, x + 0.9, c.y0 + 30, z - 0.2, M.chrome, 1);
  k.ball(x, c.y0 + 0.2, z - 0.7, 1, M.chrome, 1);
}
function mirror(k, c) {
  const M = k.M, x = c.x0 + 3, h = Math.min(c.h - 10, 120), z1 = c.z1 - 2;
  k.box(x - 1, c.y0 + 0.5, z1, x + 1.5, c.y0 + runLen(c.d), z1 + 1.5, M.zinc, 0);
  k.box(x - 0.8, c.y0 + 1, z1 - h, x + 0.8, c.y1 - 4, z1, M.alu, 1);
  k.box(x + 0.8, c.y0 + 1.5, z1 - h + 1, x + 1.2, c.y1 - 4.5, z1 - 1, M.mirror, 1, "مراية");
}
function ironing(k, c) {
  const M = k.M; k.runners(c, c.z1 - 4, 1.8);
  // folded board on the frame; when pulled out (the moving group) the board reads as stretched out
  k.rbox(c.x0 + 3, c.y0 + 2, c.z1 - 6.5, c.x1 - 3, c.y1 - 4, c.z1 - 4.5, cmat(k, 0x9fb8d6, { rough: 1 }), 1, 1);
  k.box(c.x0 + 2, c.y0 + 1, c.z1 - 7.5, c.x1 - 2, c.y1 - 3, c.z1 - 6.5, M.anth, 1);
  k.rbox(c.x0 + c.w / 2 - 6, c.y0 + 4, c.z1 - 4.5, c.x0 + c.w / 2 + 6, c.y0 + 20, c.z1 - 1.5, M.white, 1, 1);
}
function hamper(k, c, o) {
  const M = k.M, n = o.n || 1, x0 = c.x0 + 1.5, x1 = c.x1 - 1.5, y0 = c.y0 + 1, y1 = c.y1 - 2, z0 = c.z0 + 2, H = Math.min(55, c.h - 6);
  k.runners(c, z0 + 3);
  k.box(x0, y0, z0, x1, y1, z0 + 0.8, M.anth, 1);
  for (const x of [x0, x1 - 0.8]) k.box(x, y0, z0, x + 0.8, y1, z0 + H, M.anth, 1);
  const w = (x1 - x0 - 2) / n, mt = o.mat === "wick" ? M.wicker : cmat(k, 0xbdb6a8, { rough: 1 });
  for (let i = 0; i < n; i++) { const a = x0 + 1 + i * w; k.rbox(a + 0.5, y0 + 1, z0 + 1, a + w - 0.5, y1 - 1, z0 + H - 1, mt, 1, 3); }
}
function jewel(k, c) {
  const M = k.M, x0 = c.x0 + 2.9, x1 = c.x1 - 2.9, y0 = c.y0 + 2.1, y1 = c.y1 - 3.1, z = c.z1 - 8 + 1.2, cols = Math.max(2, Math.floor((x1 - x0) / 12)), rows = 2;
  k.box(x0, y0, z, x1, y1, z + 0.4, M.velvet, 1);
  for (let i = 1; i < cols; i++) k.box(x0 + ((x1 - x0) * i) / cols - 0.3, y0, z, x0 + ((x1 - x0) * i) / cols + 0.3, y1, z + 4, M.velvet, 1);
  k.box(x0, (y0 + y1) / 2 - 0.3, z, x1, (y0 + y1) / 2 + 0.3, z + 4, M.velvet, 1);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const cx = x0 + ((x1 - x0) * (i + 0.5)) / cols, cy = y0 + ((y1 - y0) * (j + 0.5)) / rows;
    if ((i + j) % 3 === 0) for (let q = 0; q < 4; q++) k.torus(cx - 3 + q * 2, cy, z + 1.2, 0.8, 0.14, M.gold, 1, "x");
    else if ((i + j) % 3 === 1) { k.torus(cx, cy, z + 0.6, 2.5, 0.15, M.gold, 1, "z"); k.torus(cx + 1, cy - 1, z + 0.7, 2, 0.15, M.chrome, 1, "z"); }
    else { k.ball(cx - 1.5, cy, z + 1, 0.6, M.pearl, 1); k.ball(cx + 1.5, cy, z + 1, 0.6, M.pearl, 1); }
  }
}
function watches(k, c) {
  const M = k.M, x0 = c.x0 + 2.9, x1 = c.x1 - 2.9, y0 = c.y0 + 2.1, y1 = c.y1 - 3.1, z = c.z1 - 11 + 1.2;
  k.box(x0, y0, z, x1, y1, z + 0.4, M.velvet, 1);
  const n = Math.max(2, Math.floor((x1 - x0 - 30) / 8));
  for (let i = 0; i < n; i++) { const cx = x0 + 3 + i * 8; k.rbox(cx, y0 + 2, z + 0.4, cx + 6, y0 + 10, z + 4, M.velvet, 1, 1.5); k.torus(cx + 3, y0 + 6, z + 4.2, 2.1, 0.5, i % 2 ? M.gold : M.chrome, 1, "y"); }
  for (const dx of [0, 13]) { const a = x1 - 27 + dx; k.rbox(a, y1 - 14, z + 0.4, a + 12, y1 - 2, z + 9, M.dark, 1, 1); k.cyl(a + 6, y1 - 14.1, z + 4.6, 0.1, 4, M.glassCup, 1, 20).rotation.set(Math.PI / 2, 0, 0); }
}
function safe(k, c) {
  const M = k.M, W = Math.min(35, c.w - 4), D = Math.min(30, c.d - 4), H = Math.min(25, c.h - 3), x0 = c.x0 + (c.w - W) / 2, y0 = c.y0 + 1.5, z0 = c.z0;
  k.rbox(x0, y0, z0, x0 + W, y0 + D, z0 + H, M.safe, 0, 0.4);
  k.box(x0 + 2, y0 - 0.2, z0 + 2, x0 + W - 2, y0, z0 + H - 2, M.safe);
  k.box(x0 + W * 0.6, y0 - 0.5, z0 + H * 0.35, x0 + W * 0.85, y0 - 0.2, z0 + H * 0.75, M.dark);
  k.cyl(x0 + W * 0.3, y0 - 1.2, z0 + H / 2, 0.1, 2.2, M.chrome, 0, 20).rotation.set(Math.PI / 2, 0, 0);
}
function carousel(k, c, show) {
  const M = k.M, cx = c.x0 + c.w / 2, cy = c.y0 + c.d / 2, R = Math.min(c.w, c.d) / 2 - 8;
  k.cyl(cx, cy, c.z0, c.h, 2, M.alu, 0, 20);
  for (const z of [c.z1 - 10, c.z0 + (c.h - 10) * 0.5]) {
    for (let a = 0; a < 4; a++) k.rod([cx, cy, z], [cx + Math.cos(a * Math.PI / 2) * R, cy + Math.sin(a * Math.PI / 2) * R, z], 0.6, M.alu, 1);
    k.torus(cx, cy, z, R, 0.8, M.alu, 1, "z");
    if (show) for (let a = 0; a < 12; a++) { const ang = (a / 12) * Math.PI * 2, x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R; garment(k, x, y, z + 0.8, Math.min(60, c.h * 0.4), COLS.shirt[a % 6], 1, ang); }
  }
}
function fabricBoxes(k, c) {
  const n = Math.max(1, Math.floor((c.w - 2) / 32)), w = (c.w - 2) / n, H = Math.min(22, c.h - 3);
  for (let i = 0; i < n; i++) { const a = c.x0 + 1 + i * w; k.rbox(a + 1, c.y0 + 1, c.z0, a + w - 1, Math.min(c.y1 - 1, c.y0 + 32), c.z0 + H, cmat(k, [0xbdb6a8, 0x8a8f86, 0x5f6b70][i % 3], { rough: 1 }), 0, 1.5); k.box(a + w / 2 - 4, c.y0 + 0.6, c.z0 + H - 6, a + w / 2 + 4, c.y0 + 1, c.z0 + H - 4, cmat(k, 0x6b4f2f, { rough: 0.7 })); }
}
// ---------------------------------------------------------------- shoes
function shoeTilt(k, c, o) {
  const M = k.M, n = o.n, span = (c.h - 2) / n, tilt = 0.27;
  for (let i = 0; i < n; i++) {
    const z = c.z0 + 2 + i * span, d = Math.min(c.d - 3, 32), y0 = c.y0 + 1.5, y1 = y0 + d, rise = Math.sin(tilt) * d;
    for (const x of [c.x0, c.x1 - 1]) k.box(x, y0, z, x + 1, y1, z + rise + 2, M.alu, 0);
    const nr = Math.max(4, Math.round(d / 4));
    for (let j = 0; j <= nr; j++) { const y = y0 + (d * j) / nr; k.rod([c.x0 + 1, y, z + (rise * j) / nr], [c.x1 - 1, y, z + (rise * j) / nr], 0.25, M.chrome); }
    k.rod([c.x0 + 1, y0 + 1, z + 4.5], [c.x1 - 1, y0 + 1, z + 4.5], 0.3, M.chrome);
    if (o.show) for (let x = c.x0 + 6; x < c.x1 - 5; x += 11) shoe(k, x, y0 + 15, z + 1.2 + rise * 0.45, tilt, COLS.fold[(Math.round(x) + i) % 6], 0);
  }
}
function shoePull(k, c, z, h, show) {
  const M = k.M, x0 = c.x0 + 1.4, x1 = c.x1 - 1.4;
  k.box(x0, c.y0 + 1, z, x0 + 1, c.y1 - 2, z + 2, M.anth, 1); k.box(x1 - 1, c.y0 + 1, z, x1, c.y1 - 2, z + 2, M.anth, 1);
  for (const [y, hh] of [[c.y0 + c.d * 0.3, 4], [c.y0 + c.d * 0.75, 10]]) k.rod([x0, y, z + hh], [x1, y, z + hh], 0.6, M.chrome, 1);
  if (show) for (let x = x0 + 6; x < x1 - 5; x += 11) { shoe(k, x, c.y0 + c.d * 0.25, z + 4, 0.35, COLS.fold[Math.round(x) % 6], 1); shoe(k, x, c.y0 + c.d * 0.72, z + 9, 0.35, COLS.fold[(Math.round(x) + 3) % 6], 1); }
}
function shoeSpin(k, c, show) {
  const M = k.M, cx = c.x0 + c.w / 2, cy = c.y0 + c.d / 2, R = Math.min(c.w, c.d) / 2 - 2.5, n = Math.max(3, Math.floor((c.h - 10) / 30));
  k.cyl(cx, cy, c.z0, c.h, 1.6, M.alu, 0, 20);
  for (let i = 0; i < n; i++) {
    const z = c.z0 + 4 + i * ((c.h - 10) / n);
    k.disc(cx, cy, z, R, 0.8, M.white, 1);
    k.torus(cx, cy, z + 2, R, 0.3, M.chrome, 1, "z");
    if (show) for (let a = 0; a < 6; a++) { const ang = (a / 6) * Math.PI * 2, x = cx + Math.cos(ang) * R * 0.55, y = cy + Math.sin(ang) * R * 0.55; shoe(k, x, y, z + 0.8, 0, COLS.fold[(a + i) % 6], 1, a % 2 ? "x" : "y"); }
  }
}
function bagHooks(k, c, show) {
  const M = k.M, z = c.z1 - 8, y = c.y1 - 3;
  k.rod([c.x0 + 2, y, z], [c.x1 - 2, y, z], 0.8, M.alu);
  const n = Math.max(3, Math.floor(c.w / 15));
  for (let i = 0; i < n; i++) {
    const x = c.x0 + 4 + ((c.w - 8) * i) / Math.max(1, n - 1);
    k.rod([x, y, z], [x, y - 5, z], 0.3, M.chrome); k.rod([x, y - 5, z], [x, y - 6, z + 2], 0.3, M.chrome);
    if (show) { if (i % 2) k.rbox(x - 9, y - 12, z - 28, x + 9, y - 3, z - 8, cmat(k, [0x6b3a2a, 0x2f2f2f, 0xc9a77c][i % 3], { rough: 0.5 }), 0, 2); else k.box(x - 6, y - 5.6, z - 55, x + 6, y - 4.6, z - 1, cmat(k, COLS.cloth[i % 4], { rough: 1 })); }
  }
}
// ---------------------------------------------------------------- living / office / bed
function tvLift(k, c, inch) {
  const M = k.M, W = Math.min(c.w - 6, inch * 2.214), H = W * 0.5625, cx = c.x0 + c.w / 2, y = c.y0 + Math.min(c.d / 2, 10), zt = c.z1 - 1;
  // the column (fixed) and the screen (rises): drawn down inside the cabinet; open = up through the top
  k.box(cx - 6, y + 1, c.z0, cx + 6, y + 9, c.z0 + Math.min(c.h - 3, 60), M.alu, 0, "عمود الرفع");
  k.box(cx - 3, y + 2, c.z0 + 10, cx + 3, y + 8, zt - 1, M.alu, 1);
  const z0 = Math.max(c.z0 + 4, zt - H - 2);
  k.box(cx - W / 2, y - 3, z0, cx + W / 2, y, z0 + H, M.tv, 1, "شاشة");
  k.box(cx - W / 2 + 0.6, y - 3.05, z0 + 0.6, cx + W / 2 - 0.6, y - 3, z0 + H - 0.6, M.glassBlack, 1, "شاشة");
}
function cables(k, c) {
  const M = k.M, ext = c.ext;
  k.cyl(c.x1 - 8, c.y1 - 8, ext.z1 - 0.2, 0.4, 3.2, M.alu, 0, 24);
  k.box(c.x0 + 4, c.y1 - 14, c.z1 - 6, c.x1 - 4, c.y1 - 2, c.z1 - 5.6, M.anth);
  k.box(c.x0 + 4, c.y1 - 14, c.z1 - 6, c.x1 - 4, c.y1 - 13.6, c.z1 - 1, M.anth);
  k.rbox(c.x0 + 8, c.y1 - 12, c.z1 - 5.6, c.x0 + 38, c.y1 - 6, c.z1 - 1.6, M.white, 0, 0.6);
  for (let i = 0; i < 3; i++) k.rod([c.x0 + 40 + i * 6, c.y1 - 9, c.z1 - 4], [c.x1 - 8, c.y1 - 8 - i, c.z1 - 4], 0.35, M.dark);
}
function charger(k, c) {
  const M = k.M, x = c.x0 + Math.min(18, c.w / 2), y = c.y0 + Math.min(15, c.d / 2);
  k.cyl(x, y, c.z0 - 0.1, 0.25, 4.5, M.dark, 0, 28);
  k.rbox(x - 3.6, y - 7.4, c.z0 + 0.15, x + 3.6, y + 7.4, c.z0 + 1, M.glassBlack, 0, 0.8);
  k.box(c.x1 - 9, c.y1 - 1.2, c.z0 + 3, c.x1 - 3, c.y1 - 0.6, c.z0 + 7, M.white, 0, "بريزة USB");
}
function bedLift(k, c) {
  const M = k.M;
  for (const x of [c.x0 + 3, c.x1 - 6]) {
    k.box(x, c.y0 + 2, c.z1 - 4, x + 3, c.y1 - 2, c.z1 - 1, M.anth, 0, "برواز الرفع");
    k.rod([x + 1.5, c.y0 + 30, c.z0 + 2], [x + 1.5, c.y0 + c.d * 0.55, c.z1 - 4], 1.1, M.dark);
    k.rod([x + 1.5, c.y0 + c.d * 0.42, c.z0 + 5.5], [x + 1.5, c.y0 + c.d * 0.55, c.z1 - 4], 0.5, M.chrome);
  }
}
function minibar(k, c) {
  const M = k.M, W = Math.min(c.w - 2, 48), x0 = c.x0 + (c.w - W) / 2;
  k.rbox(x0, c.y0 + 2, c.z0, x0 + W, c.y1 - 3, c.z0 + Math.min(c.h - 3, 51), M.white, 0, 0.8);
  k.box(c.x0 + 2, c.y1 - 1, c.z1 - 8, c.x1 - 2, c.y1 - 0.5, c.z1 - 2, M.alu, 0, "تهوية");
}
function dryer(k, c) {
  const M = k.M, x = c.x0 + c.w / 2, y = c.y0 + 4, z = c.z0 + c.h * 0.7;
  k.box(x - 10, c.y0 + 0.5, z - 3, x + 10, c.y0 + 1.2, z + 3, M.steel, 1);
  k.torus(x - 5, y, z, 3.2, 0.35, M.steel, 1, "z"); k.torus(x + 5.5, y, z, 2, 0.35, M.steel, 1, "z");
  k.rbox(x - 9, y - 3, z - 2, x - 1, y + 3, z + 12, M.dark, 1, 2.5); k.cyl(x - 5, y, z - 18, 18, 1.6, M.dark, 1, 14);
}

// ------------------------------------------------------------------------------------------------ hardware + parts + movers for one unit
/** the model work for R(): what each accessory adds / removes. Returns {list, hw, panels, drops, trims, movers, notes} */
export function plan(u, r) {
  const list = Array.isArray(u.acc) ? u.acc : [];
  const mech = u.mech || {};
  const out = { list: [], hw: {}, panels: [], drops: [], trims: [], movers: [], notes: [], warn: [], cavs: null };
  const addHw = (o) => { for (const [k, q] of Object.entries(o || {})) if (q) out.hw[k] = Math.round(((out.hw[k] || 0) + q) * 100) / 100; };
  if (list.length) {
    const cavs = cavities(r);
    out.cavs = cavs;
    const used = new Map();
    list.forEach((e, i) => {
      const def = ACC[e.id];
      if (!def) return;
      const o = accOpts(def, e.o);
      let c = cavityOf(cavs, e.at, def);
      if (!c) { out.warn.push(`${def.label}: مفيش خانة فاضية في الوحدة`); return; }
      const f = fits(def, c);
      if (!f.ok) out.warn.push(`${def.label}: الخانة ${c.n} — ${f.why}`);
      const k = `${c.key}|${def.mv === "door" ? "door" : "in"}`;
      if (used.has(k) && def.mv !== "door" && ACC[used.get(k)]?.mv !== "door") out.warn.push(`${def.label}: الخانة ${c.n} فيها «${ACC[used.get(k)].label}» كمان — اختار خانة تانية`);
      used.set(k, e.id);
      const c0 = c;
      // v124 (NOVERA rule): anything that slides out behind a hinged door is narrower, so it clears the open hinges
      if (def.mv === "pull" && c0.front?.kind === "door" && !c0.front.flap) {
        const sp = 2.5;
        c = { ...c0, x0: c0.x0 + sp, x1: c0.x1 - sp, w: c0.w - 2 * sp };
        out.notes.push(`${def.label}: اتضيّق ${sp} سم من كل جنب عشان يعدّي من المفصلات وهي مفتوحة`);
      }
      let mover = null;
      if (def.mv && def.mv !== "door") {
        const travel = Math.min(c.d - 4, runLen(c.d)) * (def.travel || 1);
        const mv = def.mv === "pull" ? { kind: "slide", normal: [0, -1, 0], slide: travel }
          : def.mv === "down" ? { kind: "slide", normal: [0, -0.55, -0.835], slide: Math.min(c.h * 0.75, 70) }
          : def.mv === "up" ? (e.id === "k_shutter" ? { kind: "slide", normal: [0, 0.6, 0.8], slide: c.h * 0.9 } : { kind: "slide", normal: [0, 0, 1], slide: e.id === "l_tvlift" ? Math.min(c.h, 90) : e.id === "k_popup" ? 20 : c.h - 4 })
          : def.mv === "lift" ? (() => { const dy = Math.min(c.d - 8, 45) + 4, dz = Math.max(8, c.z1 + 5 - (c.z0 + 7.8)), L = Math.hypot(dy, dz); return { kind: "slide", normal: [0, -dy / L, dz / L], slide: L }; })()
          : def.mv === "spin" ? { kind: "spin", hinge: [c.x0 + c.w / 2, c.y0 + c.d / 2, c.z0], axis: [0, 0, 1], ang: Math.PI * 0.6, slide: 0 } : null;
        if (mv) { mover = (r.movers || []).length + out.movers.length; out.movers.push({ ...mv, name: def.label, hinge: mv.hinge || [0, 0, 0], axis: mv.axis || [0, 0, 1], free: [0, 0, 0], acc: true }); }
      } else if (def.mv === "door" && c.front?.kind === "door") mover = c.front.mover;
      out.list.push({ i, id: e.id, def, o, c, ok: f.ok, mover });
      addHw(def.hw?.(c, o));
      if (def.clear && !c.drawers) out.drops.push(c0);
      if (def.trim) out.trims.push({ c: c0, by: def.trim });
      for (const p of def.wood?.(c, o) || []) out.panels.push({ ...p, x: r1(p.x), y: r1(p.y), z: r1(p.z), w: r1(p.w), d: r1(p.d), h: r1(p.h), accMover: mover, acc: i });
    });
  }
  const a = Object.keys(mech).some((k) => mech[k]) ? { ...mechCounts(r), sys: mech.drawer || "" } : null;
  for (const [cat, key] of Object.entries(mech)) {
    const it = MECH[cat]?.items?.[key];
    if (!key || !it) continue;
    addHw(it.hw?.(a));
    if (it.note) out.notes.push(`${MECH[cat].label}: ${it.label} — ${it.note}`);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ 3D for one unit
const MATS = {};
export function mats(THREE, woodColor) {
  if (!MATS.chrome) {
    const S = (c, m, r, o = {}) => Object.assign(new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r }), o);
    Object.assign(MATS, {
      chrome: S(0xe6e9ec, 1, 0.14), steel: S(0xc9ccce, 0.85, 0.32), alu: S(0xb9bdc1, 0.8, 0.38), zinc: S(0xaeb3b6, 0.75, 0.42), anth: S(0x3b3e41, 0.45, 0.5), dark: S(0x232526, 0.3, 0.55),
      white: S(0xf1f0ec, 0, 0.45), binGray: S(0x8e9396, 0.1, 0.55), pvc: S(0xe9e9e6, 0, 0.5), rubber: S(0x2a2a2a, 0, 0.85), red: S(0xb3262b, 0.25, 0.35), coffee: S(0x2e2f31, 0.6, 0.35),
      porcelain: S(0xf7f6f2, 0, 0.18), drip: S(0x9aa0a4, 0.6, 0.35), velvet: S(0x4b2338, 0, 1), gold: S(0xd8b04a, 1, 0.22), pearl: S(0xf3efe6, 0.1, 0.25), safe: S(0x4a4f52, 0.6, 0.45),
      wicker: S(0xb98b52, 0, 0.9), led: S(0xfff1c7, 0, 0.3, { emissive: new THREE.Color(0xffe2a0), emissiveIntensity: 1.2 }), mirror: S(0xd9e2e6, 1, 0.04),
      tv: S(0x141516, 0.4, 0.4), aluSlat: S(0xc5c8ca, 0.7, 0.35), woodSlat: S(0xb48a5a, 0, 0.6), hanger: S(0x9a6b3f, 0, 0.55),
      glassCup: S(0xe9f2f4, 0, 0.05, { transparent: true, opacity: 0.35 }), frost: S(0xe4ecee, 0, 0.4, { transparent: true, opacity: 0.6 }), acryl: S(0xf4f7f8, 0, 0.1, { transparent: true, opacity: 0.45 }), glassBlack: S(0x0c0e10, 0.3, 0.06),
    });
  }
  return MATS;
}
/** draw(THREE, u, r, view, g, extra) — every accessory + the visible mechanism parts of the unit into group g (unit frame) */
export function draw(THREE, u, r, view, g, ctx = {}) {
  const P = r.accPlan;
  if (!P) return;
  const M = mats(THREE);
  for (const it of P.list) {
    const S = new THREE.Group(), Mv = it.mover != null ? view.moverGroup(g, r, it.mover) : S;
    S.userData.acc = it.id;
    g.add(S);
    const made = [];
    const k = kit(THREE, M, S, Mv, { ...ctx, name: it.def.label, made });
    k.S = S; k.Mv = Mv;
    try { it.def.draw?.(k, it.c, it.o); } catch (e) { console.warn("acc draw", it.id, e); }
    mergeMade(THREE, made, it.def.label);
  }
  drawMech(THREE, u, r, view, g, M, ctx);
}
/** many small rods / bottles → one mesh per (parent group, material): an iPad draws a kitchen full of baskets without stutter */
function mergeMade(THREE, made, name) {
  const by = new Map();
  for (const m of made) {
    if (!m.parent || m.userData.keep) continue;
    const k = m.parent.uuid + "|" + m.material.uuid;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(m);
  }
  for (const list of by.values()) {
    if (list.length < 3) continue;
    const parent = list[0].parent, mat = list[0].material;
    let n = 0;
    const parts = list.map((m) => { m.updateMatrix(); const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(m.matrix); n += g.attributes.position.count; return g; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const g of parts) {
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      o += g.attributes.position.count;
      g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow;
    mesh.userData.pname = list[0].userData.pname || name; mesh.userData.appl = true;
    for (const m of list) parent.remove(m);
    parent.add(mesh);
  }
}
function drawMech(THREE, u, r, view, g, M, ctx) {
  const mech = u.mech || {};
  if (!Object.values(mech).some(Boolean)) return;
  const S = new THREE.Group(); g.add(S);
  const k = kit(THREE, M, S, S, { ...ctx, name: "ميكانيزم" });
  const boxesOf = (i) => (r.meshes ? r.meshes.filter((m) => m.mover === i).map((m) => m.box) : (r.parts || []).filter((p, j) => r.partMover?.[j] === i && p.box).map((p) => p.box));
  (r.movers || []).forEach((mv, i) => {
    if (mv.acc) return;
    const bs = boxesOf(i);
    if (!bs.length) return;
    const B = { x0: Math.min(...bs.map((b) => b.x0)), x1: Math.max(...bs.map((b) => b.x1)), y0: Math.min(...bs.map((b) => b.y0)), y1: Math.max(...bs.map((b) => b.y1)), z0: Math.min(...bs.map((b) => b.z0)), z1: Math.max(...bs.map((b) => b.z1)) };
    const flap = mv.kind === "door" && Math.abs((mv.axis || [0, 0, 1])[2]) < 0.5;
    const yb = Math.max(B.y0 + 1.9, 1.9);
    if (mv.kind === "door" && !flap) {
      const freeX = mv.free?.[0] ?? B.x1, x = freeX > (B.x0 + B.x1) / 2 ? B.x1 - 3 : B.x0 + 3;
      if (mech.open === "tipon") k.cyl(x, yb + 0.1, B.z1 - 8, 0.1, 1, M.dark).rotation.set(Math.PI / 2, 0, 0), k.rod([x, yb + 0.2, B.z1 - 8], [x, yb + 6, B.z1 - 8], 0.9, M.anth);
      if (mech.hinge === "pivot") for (const z of [B.z0 + 0.5, B.z1 - 0.5]) k.cyl(mv.hinge?.[0] ?? B.x0, yb + 2, z - 0.5, 1, 1.2, M.steel);
    }
    if (flap) {
      const kind = mech.flap || (mech.open === "servo" ? "hk" : "");
      if (kind) for (const x of [B.x0 + 1.8, B.x1 - 3.4]) {
        if (kind === "stay") k.rod([x + 0.8, yb + 1, B.z1 - 3], [x + 0.8, yb + 18, B.z1 - 26], 0.5, M.steel);
        else if (kind === "gas") { k.rod([x + 0.8, yb + 2, B.z1 - 4], [x + 0.8, yb + 16, B.z1 - 22], 1, M.dark); k.rod([x + 0.8, yb + 16, B.z1 - 22], [x + 0.8, yb + 24, B.z1 - 32], 0.4, M.chrome); }
        else { k.box(x, yb + 1, B.z1 - (kind === "hl" ? 30 : 21), x + 1.6, yb + (kind === "hs" ? 26 : 19), B.z1 - 2, M.white); k.rod([x + 0.8, yb + 2, B.z1 - 6], [x + 0.8, yb + 0.3, B.z1 - 10], 0.5, M.anth); }
      }
    }
    if (mv.kind === "drawer") {
      const sys = mech.drawer;
      const dg = view.moverGroup(g, r, i), kd = kit(THREE, M, dg, dg, { ...ctx, name: "درج" });
      const y0 = yb + 0.5, y1 = B.y1 - 1, hh = Math.min(B.z1 - B.z0 - 2, sys === "legra" ? 9 : 12);
      if (sys === "metal" || sys === "legra") for (const x of [B.x0 + 1.3, B.x1 - 2.9]) kd.box(x, y0, B.z0 + 0.5, x + 1.6, y1, B.z0 + 0.5 + hh, sys === "legra" ? M.anth : M.white);
      if (sys === "roller") for (const x of [B.x0 + 0.6, B.x1 - 1.6]) { kd.box(x, y0, B.z0 + 0.2, x + 1, y1, B.z0 + 1.2, M.white); k.box(x - 0.6, y0, B.z0 - 0.6, x + 1.6, y1, B.z0 + 0.2, M.white); }
      if (sys === "ball") for (const x of [B.x0 + 0.4, B.x1 - 1.6]) { kd.box(x, y0, B.z0 + 3, x + 1.2, y1, B.z0 + 7.5, M.zinc); }
      if (mech.open === "servo") k.box((B.x0 + B.x1) / 2 - 4, B.y1 - 6, B.z0 - 1.5, (B.x0 + B.x1) / 2 + 4, B.y1 - 1, B.z0, M.white);
      if (mech.open === "tipon" && !sys) k.box(B.x0 + 1, B.y1 - 4, B.z0 + 1, B.x0 + 3, B.y1 - 1, B.z0 + 3, M.anth);
    }
  });
}
/** the elevation picture of a unit's cavities for the props panel (tap one to aim the next accessory at it) */
export function cavSvg(cavs, sel, list) {
  if (!cavs.length) return "";
  const ext = cavs[0].ext, W = ext.x1 - ext.x0, H = ext.z1 - ext.z0, s = Math.min(240 / W, 200 / H);
  const X = (x) => (x - ext.x0) * s + 2, Y = (z) => (ext.z1 - z) * s + 2;
  let h = `<svg class="accsvg" viewBox="0 0 ${W * s + 4} ${H * s + 4}" width="${W * s + 4}" height="${H * s + 4}" role="img" aria-label="خانات الوحدة"><rect x="2" y="2" width="${W * s}" height="${H * s}" class="ab"/>`;
  for (const c of [...cavs].sort((a, b) => (b.col ? 1 : 0) - (a.col ? 1 : 0))) {
    const inn = list.filter((it) => it.c.key === c.key);
    if (c.col) { h += `<g class="ac col ${c.key === sel ? "on" : ""}" data-acccav="${c.key}"><rect x="${X(c.x0) + 2}" y="${Y(c.z1) + 2}" width="${(c.x1 - c.x0) * s - 4}" height="${(c.z1 - c.z0) * s - 4}"/><text x="${X(c.x1) - 6}" y="${Y(c.z1) + 13}" text-anchor="end" class="ct">⬍${c.n}${inn.length ? " " + inn.map((it) => it.def.icon).join("") : ""}</text></g>`; continue; }
    h += `<g class="ac ${c.key === sel ? "on" : ""} ${c.drawers ? "dr" : ""}" data-acccav="${c.key}"><rect x="${X(c.x0)}" y="${Y(c.z1)}" width="${(c.x1 - c.x0) * s}" height="${(c.z1 - c.z0) * s}"/>
      <text x="${X((c.x0 + c.x1) / 2)}" y="${Y((c.z0 + c.z1) / 2) + 4}" text-anchor="middle">${inn.length ? inn.map((it) => it.def.icon).join("") : c.drawers ? "▤" : c.n}</text></g>`;
  }
  return h + `</svg>`;
}
