// v127 library additions — area: sleep (bedrooms · wardrobes · dressing rooms · kids rooms). Plain data only (engine params), built with the helpers
// library.js passes in: h = { W, T, ACC, DC, M, P, FREE, b }. English for every new Arabic string is in lib127/sleep.en.json.
//
// Buildability first (every board fits a 244×122 sheet):
// - the dressing / kitchen wardrobe engines make ONE carcass with one back, top and bottom across the whole width, so they are only used here up to
//   120 wide (back ≤ 118). Wider wardrobes are «قسّم الحيطة» (panel wall_comp): every column is its own box (≤ 90 wide, back ≤ 88), a column taller
//   than a board is a box + a complement box on top with its own doors (250 / 270 to the ceiling).
// - beds: the bed template (lift / platform), free boards for beds with drawers (length > 120 deep), panel blocks for the stair bunk and small pieces.
import { libName } from "../engine/panel/catalog.js";

// dressing materials: the same lib ids as the panel engine, written both as libs (app colours) and as material names (engine / plugin)
const DRS = (label, desc, libs, params) => ({ label, desc, libs, params: { ...params, materials: Object.fromEntries(Object.entries(libs).map(([k, v]) => [k, { name: libName(v) }])) } });
const PL = { enabled: true, height: 8, style: "frame", side_apron: "none" }; // NOVERA wardrobe plinth (8 cm frame)

// ------------------------------------------------------------------ wall_comp helpers
const V = (...parts) => ({ dir: "v", parts });
const Hh = (...parts) => ({ dir: "h", parts }); // parts listed TOP → BOTTOM
const S = (size, node) => ({ size, node });
/** a column: a box (≤ 240) + a complement box on top (its own doors, or open for a walk-in) */
const col = (w, top, node, tDoors = 1) => S(w, Hh(S(top, tDoors ? { kind: "doors", count: tDoors, shelves: 0, ...(node.hinge ? { hinge: node.hinge } : {}) } : { kind: "open", shelves: 0 }), S(null, node)));
const WRD = (rods, hinge, count = 1) => ({ kind: "wardrobe", count, rods, ...(hinge ? { hinge } : {}) });
const SHV = (shelves, hinge) => ({ kind: "doors", count: 1, shelves, ...(hinge ? { hinge } : {}) });
const CMB = (dh, shelves, hinge) => ({ kind: "combo", dcount: 3, dh, count: 1, shelves, ...(hinge ? { hinge } : {}) });

// ------------------------------------------------------------------ blocks helpers
const sl = (name, x, y, z, w, d, h, mat = "carcass", o = {}) => ({ k: "slab", name, x, y, z, w, d, h, mat, ...o });
const bx = (name, x, y, z, w, d, h, faces, o = {}) => ({ k: "box", name, x, y, z, w, d, h, faces, mat: "carcass", ...o });
const dw = (name, x, y, z, w, d, h, faces, o = {}) => ({ k: "drawer", name, x, y, z, w, d, h, faces, mat: "carcass", front_mat: "front", ...o });

// ------------------------------------------------------------------ free-board helpers (beds longer than the blocks' 120 cm depth limit)
const fb = (name, role, material, x, y, z, w, d, h, o = {}) => ({ name, role, material, x, y, z, w, d, h, ...o });
/** a drawer made of free boards: an overlay front F = [x0, x1, z0, z1] in front of y = 0, and a 1.6 box on a concealed runner of length `run`
 *  in the opening O = [x0, x1, z0, z1] (1.3 runner clearance each side, 1 cm over the floor of the opening, 2.5 under its top). */
function fDrawer(nm, grp, F, O, run) {
  const bt = 1.6, sc = 1.3, x0 = O[0] + sc, x1 = O[1] - sc, z0 = O[2] + 1, z1 = O[3] - 2.5, y0 = 0.5, y1 = y0 + run, g = { group: grp };
  return [
    fb(`وش ${nm}`, "door", "front", F[0], -1.8, F[2], F[1] - F[0], 1.8, F[3] - F[2], { ...g, band: ["left", "right", "top", "bottom"] }),
    fb(`جنب ${nm} شمال`, "other", "drawer_box", x0, y0, z0, bt, run, z1 - z0, { ...g, band: ["top"], grain: "y" }),
    fb(`جنب ${nm} يمين`, "other", "drawer_box", x1 - bt, y0, z0, bt, run, z1 - z0, { ...g, band: ["top"], grain: "y" }),
    fb(`أمامي صندوق ${nm}`, "other", "drawer_box", x0 + bt, y0, z0, x1 - x0 - 2 * bt, bt, z1 - z0, { ...g, band: ["top"], grain: "x" }),
    fb(`خلفي صندوق ${nm}`, "other", "drawer_box", x0 + bt, y1 - bt, z0, x1 - x0 - 2 * bt, bt, z1 - z0, { ...g, band: ["top"], grain: "x" }),
    fb(`قاعدة ${nm}`, "drawer_bottom", "drawer_bottom", x0 + bt - 0.6, y0 + bt - 0.6, z0 + 1, x1 - x0 - 2 * bt + 1.2, run - 2 * bt + 1.2, 0.6, { ...g, band: [] }),
  ];
}

/** a double bed whose foot end is a bank of n drawers (55 deep, 50 runners); behind them ribs under every board joint + cross ribs every ≤ 60 cm.
 *  x = bed width, y = bed length (0 = the foot / room, the head board at the wall), z up. */
function footDrawerBed({ mw = 160, ml = 200, n = 2, hb = 110, ex = 0, bh = 34 } = {}) {
  const t = 1.8, W = mw + 2 + 2 * t, L = ml + 2 + 2 * t, zb = bh - t, dd = 55, zf = 8; // zb = underside of the mattress boards, zf = drawer floor
  const xi = (i) => t + ((W - 2 * t) * i) / n; // drawer / board / rib lines
  const out = [
    fb("جنب سرير شمال", "side", "front", 0, 0, 0, t, L, bh, { band: ["front", "top"], grain: "y" }), fb("جنب سرير يمين", "side", "front", W - t, 0, 0, t, L, bh, { band: ["front", "top"], grain: "y" }),
    fb("لوح الراس الداخلي", "side", "carcass", t, L - t, 0, W - 2 * t, t, zb, { band: [] }),
    fb("وزرة الأدراج", "plinth", "carcass", t, 4, 0, W - 2 * t, t, zf, { band: [] }),
    fb("أرضية الأدراج", "horizontal", "carcass", t, 0, zf, W - 2 * t, dd + t, t, { band: ["front"] }),
    fb("ضهر الأدراج", "divider", "carcass", t, dd, zf + t, W - 2 * t, t, zb - zf - t, { band: [] }),
  ];
  for (let i = 1; i < n; i++) {
    out.push(fb(`فاصل أدراج ${i}`, "divider", "carcass", xi(i) - t / 2, 0, zf + t, t, dd, zb - zf - t, { band: ["front"] }));
    out.push(fb(`ضلع طولي ${i}`, "divider", "carcass", xi(i) - t / 2, dd + t, 0, t, L - dd - 3 * t, zb, { band: [] }));
  }
  const run = L - t - (dd + t), nr = Math.max(1, Math.ceil(run / 60) - 1);
  for (let r = 1; r <= nr; r++) {
    const y = dd + t + (run * r) / (nr + 1) - t / 2;
    for (let i = 0; i < n; i++) out.push(fb(`عرضية ${r}-${i + 1}`, "divider", "carcass", xi(i) + (i ? t / 2 : 0), y, zb - 12, xi(i + 1) - xi(i) - (i ? t / 2 : 0) - (i < n - 1 ? t / 2 : 0), t, 12, { band: [] }));
  }
  for (let i = 0; i < n; i++) {
    const ox0 = xi(i) + (i ? t / 2 : 0), ox1 = xi(i + 1) - (i < n - 1 ? t / 2 : 0);
    out.push(...fDrawer(`درج سرير ${i + 1}`, `bed:drawer ${i + 1}`, [xi(i) + 0.15, xi(i + 1) - 0.15, zf + 0.3, zb - 0.3], [ox0, ox1, zf + t, zb], 50));
    out.push(fb(n > 1 ? `قاعدة مرتبة ${i + 1}` : "قاعدة مرتبة", "horizontal", "carcass", xi(i), 0, zb, xi(i + 1) - xi(i), L - t, t, { band: [], grain: "y" }));
  }
  out.push(fb("ضهر السرير", "other", "accent", -ex, L, 0, W + 2 * ex, 3.6, hb, { band: ["left", "right", "top"], grain: "x" }));
  return ex ? out.map((q) => ({ ...q, x: q.x + ex })) : out;
}

/** a captain bed against the wall: the long side faces the room with n drawers, raised head / foot boards (day-bed look).
 *  x = mattress length, y = mattress width (0 = the room side), z up. */
function captainBed({ mw = 90, ml = 200, n = 3, he = 75, fe = 55, bh = 34 } = {}) {
  const t = 1.8, L = ml + 2, W = L + 2 * t, D = mw + 2 + 2 * t, zb = bh - t, dd = 55, zf = 8;
  const xi = (i) => t + (L * i) / n;
  const out = [
    fb("جنب الراس", "side", "front", 0, 0, 0, t, D, he, { band: ["front", "top"], grain: "z" }), fb("جنب الرجلين", "side", "front", W - t, 0, 0, t, D, fe, { band: ["front", "top"], grain: "z" }),
    fb("طولية ناحية الحيطة", "side", "carcass", t, D - t, 0, L, t, zb, { band: [] }),
    fb("وزرة الأدراج", "plinth", "carcass", t, 4, 0, L, t, zf, { band: [] }),
    fb("أرضية الأدراج", "horizontal", "carcass", t, 0, zf, L, dd + t, t, { band: ["front"] }),
    fb("ضهر الأدراج", "divider", "carcass", t, dd, zf + t, L, t, zb - zf - t, { band: [] }),
  ];
  for (let i = 1; i < n; i++) out.push(fb(`فاصل أدراج ${i}`, "divider", "carcass", xi(i) - t / 2, 0, zf + t, t, dd, zb - zf - t, { band: ["front"] }));
  // behind the drawers: cross ribs every ≤ 60 cm (and under the board joint) from the floor to the mattress boards
  const nb = L > 120 ? 2 : 1, ribs = new Set([...Array(Math.max(1, Math.ceil(L / 60) - 1)).keys()].map((k) => t + (L * (k + 1)) / (Math.ceil(L / 60))));
  if (nb > 1) ribs.add(t + L / 2);
  [...ribs].sort((a, c) => a - c).forEach((x, k) => out.push(fb(`عرضية ${k + 1}`, "divider", "carcass", x - t / 2, dd + t, 0, t, D - dd - 3 * t, zb, { band: [] })));
  for (let i = 0; i < n; i++) {
    const ox0 = xi(i) + (i ? t / 2 : 0), ox1 = xi(i + 1) - (i < n - 1 ? t / 2 : 0);
    out.push(...fDrawer(`درج سرير ${i + 1}`, `bed:drawer ${i + 1}`, [xi(i) + 0.15, xi(i + 1) - 0.15, zf + 0.3, zb - 0.3], [ox0, ox1, zf + t, zb], 50));
  }
  for (let i = 0; i < nb; i++) out.push(fb(nb > 1 ? `قاعدة مرتبة ${i + 1}` : "قاعدة مرتبة", "horizontal", "carcass", t + (L * i) / nb, 0, zb, L / nb, D - t, t, { band: ["front"] }));
  return out;
}

/** kids' loft bed 90×190 (base top 165, guard 32 over a 16 cm mattress): under it a 60 cm single-door wardrobe (hat shelf + hanging space)
 *  and a 3.6 desk spanning to the other end board; a ladder of 3.6 × 8 rungs every 28 cm in front of the desk's far end (desk knee width ≥ 80). */
function loftCombo({ mw = 90, ml = 190 } = {}) {
  const t = 1.8, Lm = ml + 2, Dm = mw + 2, L = Lm + 2 * t, D = Dm + 2 * t, H = 213, r0 = 147, zt = 165, ww = 60, wd = 60, dz = 75;
  const out = [
    fb("جنب طرف شمال", "side", "front", 0, 0, 0, t, D, H, { band: ["front", "top"], grain: "z" }), fb("جنب طرف يمين", "side", "front", L - t, 0, 0, t, D, H, { band: ["front", "top"], grain: "z" }),
    fb("حلق قدام", "horizontal", "front", t, 0, r0, Lm, t, zt - r0, { band: ["top", "bottom"] }), fb("حلق ورا", "horizontal", "front", t, D - t, r0, Lm, t, zt - r0, { band: ["top"] }),
  ];
  for (let i = 0; i <= 4; i++) {
    const x = i === 0 ? t : i === 4 ? L - 2 * t : t + (Lm * i) / 4 - t / 2;
    out.push(fb(`عرضية مرتبة ${i + 1}`, "divider", "carcass", x, t, zt - t - 8, t, Dm, 8, { band: [] }));
  }
  out.push(fb("قاعدة مرتبة 1", "horizontal", "carcass", t, t, zt - t, Lm / 2, Dm, t, { band: [] }), fb("قاعدة مرتبة 2", "horizontal", "carcass", t + Lm / 2, t, zt - t, Lm / 2, Dm, t, { band: [] }));
  out.push(fb("حماية ورا", "other", "front", t, D - t, zt, Lm, t, H - zt, { band: ["top"] }), fb("حماية قدام", "other", "front", t, 0, zt, Lm - 50, t, H - zt, { band: ["top", "right"] }));
  // the wardrobe under the bed (left): the end board is its left side
  const xr = t + ww;
  out.push(fb("دولاب - جنب يمين", "side", "carcass", xr - t, 0, 0, t, wd, r0, { band: ["front"] }),
    fb("دولاب - وزرة", "plinth", "carcass", t, 3, 0, ww - t, t, 8, { band: [] }),
    fb("دولاب - قاعدة", "horizontal", "carcass", t, 0, 8, ww - t, wd, t, { band: ["front"] }),
    fb("دولاب - رأس", "horizontal", "carcass", t, 0, r0 - t, ww - t, wd, t, { band: ["front"] }),
    fb("دولاب - رف فوق الشماعة", "fixed_shelf", "shelf", t, 1, 122, ww - t, wd - 1.6, t, { band: ["front"] }),
    fb("دولاب - ضهر", "back", "back", t, wd - 0.6, 8 + t, ww - t, 0.6, r0 - 8 - 2 * t, { band: [] }),
    fb("دولاب - ضلفة", "door", "front", t + 0.15, -1.8, 8.3, ww - 0.3, 1.8, r0 - 8.6, { band: ["left", "right", "top", "bottom"], door_label: { hinge_side: "left" } }));
  // the desk to the right end board, modesty board behind the knees
  out.push(fb("سطح المكتب", "horizontal", "accent", xr, 0, dz - 3.6, L - t - xr, wd, 3.6, { band: ["front"], grain: "x" }),
    fb("ساتر المكتب", "divider", "carcass", xr, wd - t, dz - 3.6 - 30, L - t - xr, t, 30, { band: ["bottom"] }));
  // ladder (front, right end): two 3.6 × 8 stiles to 195, rungs every 28 cm
  const lx0 = L - t - 48, lx1 = L - t - 4;
  out.push(fb("قايم سلم شمال", "side", "accent", lx0, -8, 0, 3.6, 8, 195, { band: ["front", "top"] }), fb("قايم سلم يمين", "side", "accent", lx1 - 3.6, -8, 0, 3.6, 8, 195, { band: ["front", "top"] }));
  for (let i = 1; i <= 5; i++) out.push(fb(`درجة سلم ${i}`, "other", "accent", lx0 + 3.6, -8, i * 28 - 3.6, lx1 - lx0 - 7.2, 8, 3.6, { band: ["front"] }));
  return out;
}

/** kids' bunk 90×190 with a staircase of drawer boxes at its foot end (blocks). Two full end boards (95.6 × 180) carry front / back rails at both
 *  levels; mattress boards on 5 cross ribs per level (≤ 48 apart); the upper guard 33 cm over a 15 cm mattress, open 50 cm at the stairs.
 *  Stairs: 4 boxes 32 wide × 50 deep, rise 31 (step tops 31 · 62 · 93 · 124): each tread = the top of a drawer box, open cubbies below. */
function stairBunk({ mw = 90, ml = 190 } = {}) {
  const t = 1.8, Lm = ml + 2, Dm = mw + 2, L = Lm + 2 * t, D = Dm + 2 * t, H = 180;
  const out = [sl("جنب طرف شمال", 0, 0, 0, t, D, H, "front"), sl("جنب طرف يمين", L - t, 0, 0, t, D, H, "front")];
  for (const [lvl, r0, zb] of [["تحت", 12, 28.2], ["فوق", 113.8, 130]]) {
    out.push(sl(`حلق قدام ${lvl}`, t, 0, r0, Lm, t, zb + t - r0, "front"), sl(`حلق ورا ${lvl}`, t, D - t, r0, Lm, t, zb + t - r0, "front"));
    for (let i = 0; i <= 4; i++) {
      const x = i === 0 ? t : i === 4 ? L - 2 * t : t + (Lm * i) / 4 - t / 2;
      out.push(sl(`عرضية ${lvl} ${i + 1}`, x, t, zb - 8, t, Dm, 8));
    }
    out.push(sl(`قاعدة مرتبة ${lvl} 1`, t, t, zb, Lm / 2, Dm, t), sl(`قاعدة مرتبة ${lvl} 2`, t + Lm / 2, t, zb, Lm / 2, Dm, t));
  }
  out.push(sl("حماية ورا فوق", t, D - t, 131.8, Lm, t, H - 131.8, "front"), sl("حماية قدام فوق", t, 0, 131.8, Lm - 50, t, H - 131.8, "front"));
  const sw = 32, sd = 50, dh = 28;
  [124, 93, 62, 31].forEach((Hk, k) => {
    const x = L + k * sw, low = Hk > dh + 5;
    if (low) out.push(bx(`صندوق سلم ${k + 1}`, x, 0, 0, sw, sd, Hk - dh, ["left", "right", "bottom", "back"], { mat: "accent", shelves: Hk - dh > 50 ? 1 : 0 }));
    out.push(dw(`درجة سلم ${k + 1}`, x, 0, low ? Hk - dh : 0, sw, sd, low ? dh : Hk, ["left", "right", "top", "bottom", "back"], { mat: "accent", front_mat: "accent", front_cover: "inset", handle: "none" }));
  });
  return { W: L + 4 * sw, D, H, blocks: out };
}

export default (h) => {
  const { DC, M, P, FREE, ACC } = h;
  const WR = "دواليب غرف النوم", WR2 = "دواليب نوم 150–300 (علبة لكل عمود)", KIDS = "غرف الأطفال", BED = "غرف النوم", CEIL = "دواليب لحد السقف (250–270)", WALK = "الدريسنج — غرف ملابس", DACC = "الدريسنج — وحدات مساعدة";
  const FR = (group, label, desc, panels, mats) => ({ ...FREE(label, desc, panels, mats), group });
  const WC = (group, label, desc, W0, H0, root, mats, o = {}) => P(group, label, desc, { template: "wall_comp", width: W0, height: H0, depth: o.depth || 60, handle: o.handle || "bar", wc: { max_board: 240, depth: o.depth || 60, ...(o.mm ? { module_max: o.mm } : {}), root }, materials: M(mats) });

  // ================================================================ DRESSING engine (≤ 120 wide)
  const DRESSING = {
    n7_wr2d100: DRS("دولاب ضلفتين 100 بضلفة مراية", "ضلفة مراية بفريم ألومنيوم على الشماعة الطويلة، وضلفة أرفف بدرجين داخليين — 100×240×60.", { carcass: "hpl_white", door: "hpl_greige", drawer_front: "hpl_white", door_frame_alu: "alu_silver", mirror: "mirror" }, {
      width: 100, height: 240, depth: 60, plinth: PL, handles: { type: "bar" },
      sections: [
        { width: "auto", compartments: [DC({ content: "rail", door: "single_left", door_style: "mirror_alu" }), DC({ height: 38, content: "shelves", shelf_count: 0, door: "continue" })] },
        { width: "auto", compartments: [DC({ height: 45, content: "drawers", drawer_count: 2, door: "single_right" }), DC({ content: "shelves", shelf_count: 4, door: "continue" })] },
      ] }),
    n7_wr2d120: DRS("دولاب ضلفتين 120 (ارتفاع 220)", "للأوض اللي سقفها واطي: شماعتين فوق بعض شمال، و3 أدراج بره وأرفف يمين — ضلف 60.", { carcass: "hpl_offwhite", door: "wood_oak_natural_v", drawer_front: "wood_oak_natural_v" }, {
      width: 120, height: 220, depth: 60, plinth: PL, handles: { type: "edge_pull" },
      sections: [
        { width: "auto", compartments: [DC({ height: 100, content: "rail", door: "single_left" }), DC({ content: "rail", door: "continue" })] },
        { width: "auto", compartments: [DC({ height: 60, content: "drawers", drawer_count: 3 }), DC({ content: "shelves", shelf_count: 3, door: "single_right" })] },
      ] }),
    n7_sl120: DRS("دولاب سحّاب صغير 120", "لوحين جرّار للأوض اللي مفيهاش مكان لفتح ضلفة: شماعة طويلة، وأدراج وأرفف.", { carcass: "hpl_white", door: "wood_oak_light_v", drawer_front: "hpl_white" }, {
      width: 120, height: 240, depth: 64, plinth: PL, handles: { type: "none" }, doors: { layout: "sliding", sliding_panels: 2 },
      sections: [
        { width: "auto", compartments: [DC({ content: "rail" }), DC({ height: 38, content: "shelves", shelf_count: 0 })] },
        { width: "auto", compartments: [DC({ height: 60, content: "drawers", drawer_count: 3 }), DC({ content: "shelves", shelf_count: 4 })] },
      ] }),
    n7_shoe_tower60: DRS("برج جزم مفتوح 60", "عمق 35: 10 أرفف جزم بليد تحت كل رف — عمود جنب الدريسنج أو في المدخل.", { carcass: "hpl_anthracite", back: "hpl_anthracite", shelf: "wood_oak_natural_v" }, {
      width: 60, height: 240, depth: 35, plinth: PL, handles: { type: "none" },
      sections: [{ width: "auto", compartments: [DC({ content: "shelves", shelf_count: 10, led: "shelves" })] }] }),
    n7_mirror_col45: DRS("عمود مراية طولية 45", "ضلفة مراية كاملة بفريم ألومنيوم دهبي، وجواها 6 أرفف للإكسسوار والشنط الصغيرة.", { carcass: "hpl_white", door_frame_alu: "alu_gold", mirror: "mirror" }, {
      width: 45, height: 240, depth: 40, plinth: PL, handles: { type: "none" }, doors: { style: "mirror_alu" },
      sections: [{ width: "auto", compartments: [DC({ content: "shelves", shelf_count: 6, door: "single_left" })] }] }),
    n7_kid_wr80: DRS("دولاب أطفال 80 شماعة واطية", "ارتفاع 170: شماعة على حوالي 120 تطولها إيد الطفل، ودرجين بره وأرفف — ضلف 40 بزرار.", { carcass: "hpl_white", door: "hpl_sage", drawer_front: "wood_beech_zan_v" }, {
      width: 80, height: 170, depth: 55, plinth: PL, handles: { type: "knob" },
      sections: [
        { width: "auto", compartments: [DC({ content: "rail", door: "single_left" }), DC({ height: 38, content: "shelves", shelf_count: 0, door: "continue" })] },
        { width: "auto", compartments: [DC({ height: 40, content: "drawers", drawer_count: 2 }), DC({ content: "shelves", shelf_count: 3, door: "single_right" })] },
      ] }),
  };

  // ================================================================ PANEL engine
  const PANEL = {
    // ---------------- hinged wardrobes 240 (wall_comp: one box per column, plinth 10 inside the 240)
    n7_cw150: WC(WR2, "دولاب 3 ضلف 150", "عمود شماعة طويلة 50، وعمودين 50 بـ3 أدراج بره وأرفف — كل عمود علبة لوحدها.", 150, 240,
      V(S(50, WRD(1)), S(50, CMB(60, 3)), S(50, CMB(60, 3, "right"))), { carcass: "hpl_white", front: "hpl_greige", shelf: "hpl_white" }),
    n7_cw180: WC(WR2, "دولاب 3 ضلف 180", "3 أعمدة 60: شماعة طويلة، 5 أرفف، وشماعتين فوق بعض — مقبض بار.", 180, 240,
      V(S(60, WRD(1)), S(60, SHV(5)), S(60, WRD(2, "right"))), { carcass: "hpl_offwhite", front: "wood_oak_natural_v", shelf: "hpl_offwhite" }),
    n7_cw200: WC(WR2, "دولاب 4 ضلف 200", "4 أعمدة 50: شماعة طويلة · أدراج وأرفف · أرفف · شماعتين — Push من غير مقابض.", 200, 240,
      V(S(50, WRD(1)), S(50, CMB(60, 3, "right")), S(50, SHV(5)), S(50, WRD(2, "right"))), { carcass: "hpl_white", front: "hpl_white", shelf: "hpl_white" }, { handle: "push" }),
    n7_cw240: WC(WR2, "دولاب 4 ضلف 240 جوز", "4 أعمدة 60: شماعتين، أدراج وأرفف، 6 أرفف، وشماعة طويلة — ضلف جوز على هيكل أوف وايت.", 240, 240,
      V(S(60, WRD(2)), S(60, CMB(66, 3, "right")), S(60, SHV(6)), S(60, WRD(1, "right"))), { carcass: "hpl_offwhite", front: "wood_walnut_v", shelf: "hpl_offwhite" }),
    n7_cw270: WC(WR2, "دولاب 5 ضلف 270", "5 أعمدة 54 بلون كريمي: شماعة طويلة، شماعتين، أدراج وأرفف، أرفف، وشماعة — Push من غير مقابض.", 270, 240,
      V(S(54, WRD(1)), S(54, WRD(2, "right")), S(54, CMB(60, 3)), S(54, SHV(5, "right")), S(54, WRD(1, "right"))), { carcass: "hpl_white", front: "acrylic_cream", shelf: "hpl_white" }, { handle: "push" }),
    n7_cw300: WC(WR2, "دولاب 6 ضلف 300", "عمودين 90 بضلفتين (شماعة طويلة وشماعتين) وفي النص أدراج وأرفف — ضلف رمادي فاتح.", 300, 240,
      V(S(90, WRD(1, null, 2)), S(60, CMB(66, 3)), S(60, SHV(5, "right")), S(90, WRD(2, null, 2))), { carcass: "hpl_white", front: "hpl_light_grey", shelf: "hpl_white" }),
    // ---------------- up to the ceiling: box + complement with its own doors
    n7_cw150_270: WC(CEIL, "دولاب 3 ضلف 150 لحد السقف 270", "علب 230 + تكملة 40 فوقها بضلف لوحدها (الجناب كلها جوه اللوح): شماعة طويلة، وأدراج وأرفف.", 150, 270,
      V(col(50, 40, WRD(1)), col(50, 40, CMB(60, 3)), col(50, 40, CMB(60, 3, "right"))), { carcass: "hpl_white", front: "hpl_greige", shelf: "hpl_white" }),
    n7_cw200_250: WC(CEIL, "دولاب 4 ضلف 200 لحد السقف 250", "4 أعمدة 50: علب 210 + تكملة 40 — شماعة، أرفف، أدراج وأرفف، وشماعتين.", 200, 250,
      V(col(50, 40, WRD(1)), col(50, 40, SHV(5, "right")), col(50, 40, CMB(60, 3)), col(50, 40, WRD(2, "right"))), { carcass: "hpl_white", front: "wood_oak_light_v", shelf: "hpl_white" }, { handle: "push" }),
    n7_cw240_270: WC(CEIL, "دولاب 4 ضلف 240 لحد السقف 270", "4 أعمدة 60: علب 230 + تكملة 40 — شماعتين، أدراج وأرفف، أرفف، وشماعة طويلة.", 240, 270,
      V(col(60, 40, WRD(2)), col(60, 40, CMB(66, 3, "right")), col(60, 40, SHV(6)), col(60, 40, WRD(1, "right"))), { carcass: "hpl_offwhite", front: "wood_walnut_v", shelf: "hpl_offwhite" }),
    n7_cw300_270: WC(CEIL, "دولاب 6 ضلف 300 لحد السقف 270", "6 أعمدة 50 أبيض لامع: علب 230 + تكملة 40 — شماعات طويلة وقصيرة، أرفف، وأدراج.", 300, 270,
      V(col(50, 40, WRD(1)), col(50, 40, WRD(2, "right")), col(50, 40, CMB(60, 3)), col(50, 40, SHV(5, "right")), col(50, 40, WRD(2)), col(50, 40, WRD(1, "right"))), { carcass: "hpl_white", front: "acrylic_white", shelf: "hpl_white" }, { handle: "push" }),
    // ---------------- sliding (wall_comp: boxes behind, panels over the whole width)
    n7_csl200: WC(WR2, "دولاب سحّاب 200 لوحين (تخزين)", "لوحين جرّار 100 قدام 3 علب 66 بأرفف — للملايات والهدوم المطبقة (الشماعة تتضاف من 🧰).", 200, 240,
      { kind: "sliding", count: 2, shelves: 4 }, { carcass: "hpl_white", front: "hpl_greige", shelf: "hpl_white" }, { depth: 62, mm: 70 }),
    n7_csl270: WC(CEIL, "دولاب سحّاب 270 لحد السقف", "3 ألواح جرّار على علب 230، وتكملة 40 بقلابات فوق — أرفف تخزين.", 270, 270,
      Hh(S(40, { kind: "flap", shelves: 0 }), S(null, { kind: "sliding", count: 3, shelves: 4 })), { carcass: "hpl_white", front: "wood_oak_natural_v", shelf: "hpl_white" }, { depth: 62, mm: 90, handle: "push" }),
    // ---------------- walk-in dressing rooms (open, LED): one unit per wall, the second wall's unit stands against the first one's face
    n7_walk_l300: WC(WALK, "دريسنج L — الضلع الطويل 300", "مفتوح بليد، علب 210 + خانات شنط 40 فوق: أرفف، شماعة طويلة، أدراج وأرفف، شماعتين — الضلع التاني بيلزق في وشه.", 300, 250,
      V(col(60, 40, { kind: "open", shelves: 5, led: true }, 0), col(90, 40, WRD(1, null, 0), 0), S(60, Hh(S(40, { kind: "open", shelves: 0 }), S(null, Hh(S(null, { kind: "open", shelves: 3, led: true }), S(70, { kind: "drawers", count: 3 }))))), col(90, 40, WRD(2, null, 0), 0)),
      { carcass: "hpl_greige", front: "wood_oak_natural_v", shelf: "wood_oak_natural_v" }, { depth: 55, handle: "push" }),
    n7_walk_l180: WC(WALK, "دريسنج L — الضلع القصير 180", "بيكمّل الضلع الطويل على الحيطة التانية: شماعتين، وعمود أدراج وأرفف بليد.", 180, 250,
      V(col(90, 40, WRD(2, null, 0), 0), S(90, Hh(S(40, { kind: "open", shelves: 0 }), S(null, Hh(S(null, { kind: "open", shelves: 3, led: true }), S(90, { kind: "drawers", count: 4 })))))),
      { carcass: "hpl_greige", front: "wood_oak_natural_v", shelf: "wood_oak_natural_v" }, { depth: 55, handle: "push" }),
    n7_walk_u240: WC(WALK, "دريسنج U — الحيطة اللي في النص 240", "أرفف بليد على الطرفين وشماعة طويلة فوق أدراج في النص — الضلعين الجانبيين («الضلع القصير») بيلزقوا في وشها.", 240, 250,
      V(col(60, 40, { kind: "open", shelves: 5, led: true }, 0), S(120, Hh(S(40, { kind: "open", shelves: 0 }), S(null, WRD(1, null, 0)), S(72, { kind: "drawers", count: 3 }))), col(60, 40, { kind: "open", shelves: 5, led: true }, 0)),
      { carcass: "hpl_white", front: "wood_walnut_v", shelf: "wood_walnut_v" }, { depth: 55, handle: "push" }),
    // ---------------- dressing helpers
    n7_luggage120: P(DACC, "صندوق شنط فوق الدولاب 120", "معلّق فوق دولاب عمقه 60: ضلفتين Push لشنط السفر والبطاطين.", {
      template: "cabinet", width: 120, height: 40, depth: 60, mount: "wall", handle: "push", back: { enabled: true },
      fronts: [{ type: "doors", count: 2, shelves: 0 }], materials: M({ carcass: "hpl_white", front: "hpl_white" }) }),
    n7_island150: P(DACC, "جزيرة دريسنج 150 بسطح زجاج", "6 أدراج عميقة بوش مستخبي، وفوقها صينية عرض قطيفة للساعات والإكسسوار تحت زجاج 8 مم — على وزرة داخلة.", {
      template: "blocks", width: 150, depth: 60, height: 92, thickness: 1.8,
      blocks: [
        bx("وزرة داخلة", 6, 6, 0, "W-12", "D-12", 8, ["left", "right", "front", "back"], { joint: "sides", mat: "plinth" }),
        ...[0, 1].flatMap((c2) => [0, 1, 2].map((r) => dw(`درج ${c2 ? "يمين" : "شمال"} ${r + 1}`, c2 ? "W/2" : 0, 0, 8 + r * 22, "W/2", "D", 22, ["left", "right", "bottom", "back"], { front_cover: "inset", handle: "none" }))),
        bx("صينية العرض", 0, 0, 74, "W", "D", 17.2, ["left", "right", "bottom", "back", "front"], { dividers: 3 }),
        sl("قاعدة قطيفة", 1.8, 1.8, 75.8, 146.4, 56.4, 0.6, "accent"),
        { k: "glass", name: "سطح زجاج", x: 0, y: 0, z: "H-0.8", w: "W", d: "D", h: 0.8, t: 0.8 },
      ],
      materials: M({ carcass: "wood_walnut_v", front: "wood_walnut_v", drawer_box: "hpl_white", accent: "hpl_anthracite", plinth: "hpl_black", glass: "glass_bronze" }) }),
    // ---------------- beds (bed template)
    n7_bed100_platform: P(BED, "سرير فردي 100 قاعدة سادة", "100×200 من غير تخزين — قاعدة مرتبة ولوح ضهر شرايح أوك 95 سم.", {
      template: "bed", bed: { mattress_width: 100, mattress_length: 200, storage: "none", height: 32, headboard_style: "slats", headboard_height: 95, slat_width: 7, slat_gap: 2 },
      materials: M({ carcass: "hpl_offwhite", front: "wood_oak_natural_v", accent: "wood_oak_natural_v" }) }),
    n7_bed100_lift: { ...P(BED, "سرير فردي 100 بمكبس وضهر منجّد", "100×200 صندوق بغطا بمكبس غاز، ضهر 3 بانوهات منجّدة لينن رمادي.", {
      template: "bed", bed: { mattress_width: 100, mattress_length: 200, storage: "lift", headboard_style: "panels", panel_rows: 3, headboard_height: 105, upholstered: true },
      materials: M({ carcass: "hpl_white", front: "hpl_light_grey", accent: "hpl_light_grey" }) }), fabric: { type: "linen", color: "#9a9b98", tuft: "channels" } },
    n7_bed160_platform: P(BED, "سرير 160 قاعدة واطية بضهر جوز سميك", "منصة 30 سم من غير تخزين، ضهر جوز 3.6 أعرض 15 سم من كل ناحية برف وليد.", {
      template: "bed", bed: { mattress_width: 160, mattress_length: 200, storage: "none", height: 30, headboard_height: 100, headboard_extra: 15, headboard_thickness: 3.6, headboard_shelf: true, led: true },
      materials: M({ carcass: "hpl_anthracite", front: "wood_walnut_v", accent: "wood_walnut_v" }) }),
    n7_bed160_wall_float: { ...P(BED, "سرير 160 بحيطة منجّدة وكومودينو معلّق", "ضهر 4 بانوهات أفقية منجّدة أعرض 55 سم من كل ناحية، فيه كومودينو معلّق بدرج في كل جناح وليد — صندوق بمكبس.", {
      template: "bed", bed: { mattress_width: 160, mattress_length: 200, storage: "lift", headboard_style: "panels", panel_rows: 4, headboard_height: 120, headboard_extra: 55, side_tables: true, upholstered: true, led: true },
      handle: "gola", materials: M({ carcass: "hpl_offwhite", front: "hpl_greige", accent: "hpl_greige", shelf: "hpl_offwhite" }) }), fabric: { type: "boucle", color: "#d9d2c6", tuft: "none" } },
    n7_bed120_japandi: P(BED, "سرير 120 ياباني واطي عائم", "قاعدة 22 سم طايرة على وزرة داخلة بليد، من غير تخزين، وضهر أوك فاتح واطي 75 — للأوض الصغيرة.", {
      template: "bed", bed: { mattress_width: 120, mattress_length: 200, storage: "none", height: 22, floating: true, float_height: 8, float_setback: 10, led: true, headboard_height: 75, headboard_extra: 10, headboard_thickness: 3.6 },
      materials: M({ carcass: "hpl_offwhite", front: "wood_oak_light_v", accent: "wood_oak_light_v" }) }),
    // ---------------- nightstands, chests, dressers
    n7_night_float2: P(BED, "كومودينو معلّق بدرجين جوز", "50×36 معلّق على شريط تعليق: درجين جولا وليد تحت — من غير رجول.", {
      template: "nightstand", width: 50, height: 36, depth: 38, mount: "wall", handle: "gola", led_under: true, fronts: [{ type: "drawers", count: 2 }],
      materials: M({ carcass: "wood_walnut_v", front: "wood_walnut_v", accent: "wood_walnut_v", drawer_box: "hpl_white" }) }),
    n7_night_open2: P(BED, "كومودينو درجين ونيش برجول 55", "نيش مفتوح فوق للكتب والتليفون، ودرجين تحت — على رجول معدن 15 سم.", {
      template: "nightstand", width: 55, height: 58, depth: 40, plinth: { height: 15, style: "legs" }, handle: "bar",
      fronts: [{ type: "drawers", count: 2 }, { type: "open", height: 14, shelves: 0 }],
      materials: M({ carcass: "hpl_greige", front: "wood_oak_natural_v", shelf: "hpl_greige", drawer_box: "hpl_white" }) }),
    n7_chest5_legs: P(BED, "شيفونيرة 5 أدراج 90 برجول", "90×115: 5 أدراج عريضة أوك على هيكل أوف وايت ورجول 15 سم.", {
      template: "chest", width: 90, height: 115, depth: 48, plinth: { height: 15, style: "legs" }, fronts: [{ type: "drawers", count: 5 }],
      materials: M({ carcass: "hpl_offwhite", front: "wood_oak_natural_v", accent: "wood_oak_natural_v", drawer_box: "hpl_white" }) }),
    n7_chest6_slim: P(BED, "شيفونيرة رفيعة 6 أدراج 50", "50×135 جولا: للأوض الصغيرة جنب الدولاب — كحلي.", {
      template: "chest", width: 50, height: 135, depth: 45, handle: "gola", fronts: [{ type: "drawers", count: 6 }],
      materials: M({ carcass: "hpl_white", front: "hpl_navy", accent: "hpl_navy", drawer_box: "hpl_white" }) }),
    n7_dresser_wide120: P(BED, "تسريحة 120 بأدراج ومراية عريضة", "وحدة 3 أدراج 78 سم ومراية 100×80 بليد من ورا — أوك وكريمي.", {
      template: "dresser", width: 120, depth: 45, handle: "bar", fronts: [{ type: "drawers", count: 3 }],
      materials: M({ carcass: "hpl_cream", front: "wood_oak_natural_v", accent: "wood_oak_natural_v", shelf: "hpl_cream", drawer_box: "hpl_white" }), dresser: { base_height: 78, mirror_width: 100, mirror_height: 80, mirror_gap: 12, mirror_led: true } }),
    // ---------------- kids
    n7_kid_dresser: P(KIDS, "تسريحة بنات صغيرة 80", "وحدة درجين 60 سم على قد الطفل، ومراية 50×65 — شامبين وأبيض.", {
      template: "dresser", width: 80, depth: 38, handle: "bar", fronts: [{ type: "drawers", count: 2 }],
      materials: M({ carcass: "hpl_white", front: "acrylic_champagne", accent: "hpl_white", shelf: "hpl_white" }), dresser: { base_height: 60, mirror_width: 50, mirror_height: 65, mirror_gap: 10 } }),
    n7_kid_bunk_stairs: P(KIDS, "سرير دورين 90×190 بسلم أدراج", "دورين بجنبين كاملين، حماية فوق 33 سم فوق المرتبة، وسلم 4 درجات كل درجة درج وتحتها خانات.", (() => {
      const q = stairBunk();
      return { template: "blocks", width: q.W, depth: q.D, height: q.H, thickness: 1.8, blocks: q.blocks, materials: M({ carcass: "hpl_white", front: "hpl_white", accent: "wood_beech_zan_v", drawer_box: "hpl_white" }) };
    })()),
    n7_kid_toys: P(KIDS, "مكتبة لعب 9 خانات بصناديق", "105×105 واطية على قد الطفل: 9 خانات 33 سم لصناديق قماش، وسطح أوك 3.6.", {
      template: "blocks", width: 105, depth: 38, height: 111.6, thickness: 1.8,
      blocks: [
        bx("وزرة داخلة", 4, 4, 0, "W-8", "D-8", 8, ["left", "right", "front", "back"], { joint: "sides", mat: "plinth" }),
        ...[0, 1, 2].map((r) => bx(`صف خانات ${r + 1}`, 0, 0, 8 + r * 100 / 3, "W", "D", 100 / 3, ["left", "right", "bottom", "back"], { dividers: 2 })),
        sl("سطح أوك", 0, 0, 108, 105, 38, 3.6, "accent"),
      ],
      materials: M({ carcass: "hpl_white", accent: "wood_oak_natural_v", plinth: "hpl_sage" }) }),
    n7_kid_desk_tower: P(KIDS, "مكتب مذاكرة 120 بمكتبة جنبه", "سطح 3.6 على عمود كتب مفتوح شمال وجنب يمين، ومكتبة 3 أرفف فوق العمود — مساحة رجلين 78 سم.", {
      template: "blocks", width: 120, depth: 60, height: 180, thickness: 1.8,
      blocks: [
        bx("عمود كتب", 0, 0, 0, 40, 60, 71.4, ["left", "right", "bottom", "back"], { shelves: 1 }),
        sl("جنب يمين", 118.2, 0, 0, 1.8, 60, 71.4),
        sl("ساتر ورا", 40, 58.2, 41.4, 78.2, 1.8, 30),
        sl("سطح المكتب", 0, 0, 71.4, 120, 60, 3.6, "accent"),
        bx("مكتبة فوق", 0, 30, 75, 40, 30, 105, ["left", "right", "top", "back"], { shelves: 3 }),
      ],
      materials: M({ carcass: "hpl_white", accent: "wood_beech_zan_v" }) }),
  };

  // ================================================================ free boards: beds with drawers, kids' loft
  const FREE_ = {
    n7_bed160_drawers: FR(BED, "سرير 160 بدرجين في الرجلين", "160×200: درجين عراض بعمق 55 تحت الرجلين، قاعدة مرتبة على ضلع طولي وعرضيات كل 50 سم، وضهر أوك 110.", footDrawerBed({ mw: 160, n: 2, hb: 110 }),
      { carcass: "hpl_white", front: "wood_oak_natural_v", accent: "wood_oak_natural_v", drawer_box: "hpl_white" }),
    n7_bed180_drawers: FR(BED, "سرير 180 بـ3 أدراج وضهر عريض", "180×200: 3 أدراج تحت الرجلين، وضهر جريج 120 أعرض 20 سم من كل ناحية.", footDrawerBed({ mw: 180, n: 3, hb: 120, ex: 20 }),
      { carcass: "hpl_offwhite", front: "hpl_greige", accent: "hpl_greige", drawer_box: "hpl_white" }),
    n7_kid_captain90: FR(KIDS, "سرير أطفال 90 بـ3 أدراج (كابتن)", "90×200 بيلزق بطوله في الحيطة: 3 أدراج ناحية الأوضة، جنب راس 75 وجنب رجلين 55.", captainBed({ mw: 90, n: 3 }),
      { carcass: "hpl_white", front: "hpl_sage", plinth: "hpl_white", drawer_box: "hpl_white" }),
    n7_kid_captain120: FR(KIDS, "سرير شباب 120 بـ3 أدراج (كابتن)", "120×200 بطول الحيطة: 3 أدراج كبار وجنبين أوك 70 — ينفع كنبة بالنهار.", captainBed({ mw: 120, n: 3, he: 70, fe: 70 }),
      { carcass: "hpl_white", front: "wood_oak_natural_v", plinth: "hpl_white", drawer_box: "hpl_white" }),
    n7_kid_loft_combo: FR(KIDS, "سرير علوي 90×190 بدولاب ومكتب تحته", "المرتبة على 165 وحماية 32 سم فوقها، تحتها دولاب ضلفة 60 (رف وفراغ شماعة — الماسورة من 🧰) ومكتب 3.6، وسلم درجاته كل 28 سم.", loftCombo(),
      { carcass: "hpl_white", front: "hpl_white", accent: "wood_beech_zan_v", shelf: "hpl_white" }),
  };

  // ================================================================ kitchen engine: an L corner wardrobe + drawer organisers (accessory elements)
  const KITCHEN = {
    n7_corner_l110: { label: "دولاب ركنة L 110×110", desc: "يستغل الركنة كلها: رجلين 110 عمق 60 وأرفف L متصلة بضلفتين — يكمّل أي دولاب على الحيطتين.", group: WR,
      params: { unit_category: "corner", corner_style: "l_shape", unit_type: "tall", height: 240, depth: 60, corner_leg1_length: 110, corner_leg2_length: 110, shelf_count: 6, door_color: "#BDB5A8", material_front_name: libName("hpl_greige") } },
    n7_acc_jewel: { ...ACC("utensil_tray", "تقسيمة درج مجوهرات", "خانات صغيرة 6×4 لدرج دريسنج 50 — خواتم وحلقان وساعات (بطّنها قطيفة).", { accessory_width: 44, accessory_depth: 45, accessory_height: 5, accessory_grid_cols: 6, accessory_grid_rows: 4 }), group: "الدريسنج — تقسيمات أدراج" },
    n7_acc_ties: { ...ACC("tray_dividers", "فواصل درج كرافتات وأحزمة", "9 فواصل طولية: كل كرافتة أو حزام ملفوف في خانة.", { accessory_width: 44, accessory_depth: 45, accessory_height: 8, accessory_divider_count: 9 }), group: "الدريسنج — تقسيمات أدراج" },
    n7_acc_socks: { ...ACC("utensil_tray", "تقسيمة شرابات وملابس داخلية", "خانات 4×3 لدرج 50 — كل حاجة متطبقة في خانتها.", { accessory_width: 44, accessory_depth: 45, accessory_height: 10, accessory_grid_cols: 4, accessory_grid_rows: 3 }), group: "الدريسنج — تقسيمات أدراج" },
  };

  return { KITCHEN, DRESSING, PANEL, FREE: FREE_, SMART: {} };
};
