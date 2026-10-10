// v127 library additions — area: rooms (living / reception, entry, office, bathroom & laundry, shops).
// Plain data only (engine params), built with the helpers library.js passes in: h = { W, T, ACC, DC, M, P, FREE, b }.
// English for every new Arabic string is in lib127/rooms.en.json (merged into i18n/en.json at ship).
//
// Two kinds of items:
//  • engine templates (desk, vanity, mirror_cabinet, bath_tall, cabinet, wall_comp, tv_wall) where the template fits;
//  • «free» boards (template "free") for pieces no template makes (sideboards with one top, counters, workstations,
//    glass displays, laundry towers …) — drawn with the small cabinet kit below so every board is real and buildable:
//    sides run full height, bottom / top / fixed shelves sit between them, a 6 mm back in a groove 18 mm from the back edge,
//    overlay fronts 3 mm apart, drawers = front + 16 mm box on a concealed runner as long as the depth allows (30–55),
//    glass doors = a 5 cm wood frame + 4 mm glass in its groove (one group → swings as one).
// Free-board coordinates: x → right, y → back (y = 0 = the carcass front, fronts stand at y −1.8…0), z up, all cm.

const R2 = (v) => Math.round(v * 100) / 100;
const T = 1.8, G = 0.3, FT = 1.8, BK = 0.6, BIN = 1.8, GR = 0.8; // board, front gap, front, back panel, back inset, groove
const SLIDES = [55, 50, 45, 40, 35, 30];

function kit(tag) {
  const out = [];
  let nDr = 0, nDo = 0;
  const add = (name, role, material, x, y, z, w, d, h, o = {}) => {
    const p = { name, role, material, x: R2(x), y: R2(y), z: R2(z), w: R2(w), d: R2(d), h: R2(h), ...o };
    out.push(p);
    return p;
  };
  const sfx = (l) => (l ? ` - ${l}` : "");
  const K = {
    out, add,
    /** a carcass box; returns its inside {x0,x1,y0,y1,z0,z1} (y1 = in front of the back panel) */
    box({ l = "", x = 0, y = 0, z = 0, w, d, h, mat = "carcass", top = true, bottom = true, back = true, left = true, right = true, topMat, backMat = "back", bottomMat }) {
      const s = sfx(l);
      if (left) add(`جنب شمال${s}`, "side", mat, x, y, z, T, d, h, { grain: "z" });
      if (right) add(`جنب يمين${s}`, "side", mat, x + w - T, y, z, T, d, h, { grain: "z" });
      const ix0 = x + (left ? T : 0), ix1 = x + w - (right ? T : 0);
      if (bottom) add(`قاعدة${s}`, "horizontal", bottomMat || mat, ix0, y, z, ix1 - ix0, d, T, { grain: "x" });
      if (top) add(`رأس${s}`, "horizontal", topMat || mat, ix0, y, z + h - T, ix1 - ix0, d, T, { grain: "x" });
      const iz0 = z + (bottom ? T : 0), iz1 = z + h - (top ? T : 0);
      let y1 = y + d;
      if (back) {
        y1 = y + d - BIN - BK;
        const bx0 = left ? ix0 - GR : ix0, bx1 = right ? ix1 + GR : ix1, bz0 = bottom ? iz0 - GR : iz0, bz1 = top ? iz1 + GR : iz1;
        add(`ظهر${s}`, "back", backMat, bx0, y1, bz0, bx1 - bx0, BK, bz1 - bz0, { band: [] });
      }
      return { x0: ix0, x1: ix1, y0: y, y1, z0: iz0, z1: iz1, ox0: x, ox1: x + w, oz0: z, oz1: z + h };
    },
    /** vertical dividers splitting an inside into bays of the given clear widths (null = share the rest); returns the bays,
     *  each with its clear span (x0..x1) and the front cover span (cx0..cx1: to the outer edge or the divider's centre) */
    bays(l, inn, widths, { mat = "carcass", y0, z0, z1 } = {}) {
      const n = widths.length, fixed = widths.reduce((a, v) => a + (v ?? 0), 0), autos = widths.filter((v) => v == null).length;
      const each = autos ? (inn.x1 - inn.x0 - (n - 1) * T - fixed) / autos : 0;
      const res = [];
      let x = inn.x0;
      widths.forEach((v, i) => {
        const bw = v ?? each;
        res.push({ x0: x, x1: x + bw, cx0: i === 0 ? inn.ox0 : x - T / 2, cx1: i === n - 1 ? inn.ox1 : x + bw + T / 2 });
        x += bw;
        if (i < n - 1) { add(`قاطوع ${i + 1}${sfx(l)}`, "divider", mat, x, y0 ?? inn.y0, z0 ?? inn.z0, T, inn.y1 - (y0 ?? inn.y0), (z1 ?? inn.z1) - (z0 ?? inn.z0), { grain: "z" }); x += T; }
      });
      return res;
    },
    /** a shelf across a bay: fixed (between boards, role fixed_shelf) or loose (on pins, 1 cm behind the front, 1 mm clear each end) */
    shelf(name, x0, x1, z, inn, { fixed = false, mat = "shelf", setback } = {}) {
      const sb = setback ?? (fixed ? 0 : 1);
      const a = fixed ? x0 : x0 + 0.1, b = fixed ? x1 : x1 - 0.1;
      return add(name, fixed ? "fixed_shelf" : "shelf", mat, a, inn.y0 + sb, z, b - a, inn.y1 - inn.y0 - sb - (fixed ? 0 : 0.2), T, { grain: "x" });
    },
    /** n loose shelves evenly spaced in a bay [z0, z1] */
    shelves(l, x0, x1, z0, z1, n, inn, o = {}) {
      const pitch = (z1 - z0 - n * T) / (n + 1);
      for (let k = 1; k <= n; k++) K.shelf(`رف ${k}${sfx(l)}`, x0, x1, z0 + pitch * k + T * (k - 1), inn, o);
    },
    /** overlay doors over the cover rectangle (1 or 2 leaves); glass = wood frame + 4 mm glass, mirror = board + glued mirror */
    doors(l, c, n = 1, { hinge = "left", mat = "front", glass = false, mirror = false, fw = 5 } = {}) {
      const spans = n === 1 ? [[c.x0 + G / 2, c.x1 - G / 2, hinge]] : [[c.x0 + G / 2, (c.x0 + c.x1) / 2 - G / 2, "left"], [(c.x0 + c.x1) / 2 + G / 2, c.x1 - G / 2, "right"]];
      for (const [x0, x1, side] of spans) {
        nDo++;
        const grp = `${tag}:door ${nDo}`, nm = `ضلفة ${nDo}${sfx(l)}`, z0 = c.z0 + G / 2, z1 = c.z1 - G / 2;
        if (!glass) {
          add(nm, "door", mat, x0, -FT, z0, x1 - x0, FT, z1 - z0, { group: grp, door_label: { hinge_side: side }, band: ["left", "right", "top", "bottom"], grain: "z" });
          if (mirror) add(`مراية ${nm}`, "door", "mirror", x0, -FT - 0.4, z0, x1 - x0, 0.4, z1 - z0, { group: grp, band: [] });
          continue;
        }
        const W = x1 - x0, H = z1 - z0, f = Math.min(fw, W / 4, H / 4);
        const mem = { left: ["شمال", x0, z0 + f, f, H - 2 * f, "z"], right: ["يمين", x1 - f, z0 + f, f, H - 2 * f, "z"], top: ["فوق", x0, z1 - f, W, f, "x"], bottom: ["تحت", x0, z0, W, f, "x"] };
        [side, ...["left", "right", "top", "bottom"].filter((k) => k !== side)].forEach((k, i) => {
          const [lb, a, zz, ww, hh, gr] = mem[k];
          add(`${nm} - فريم ${lb}`, "door", mat, a, -FT, zz, ww, FT, hh, { group: grp, grain: gr, band: ["left", "right", "top", "bottom"], ...(i === 0 ? { door_label: { hinge_side: side } } : {}) });
        });
        add(`${nm} - زجاج`, "door", "glass", x0 + f - GR, -FT / 2 - 0.2, z0 + f - GR, W - 2 * f + 2 * GR, 0.4, H - 2 * f + 2 * GR, { group: grp, band: [] });
      }
    },
    /** a lift-up flap over the cover rectangle */
    flap(l, c, { mat = "front" } = {}) {
      nDo++;
      add(`ضلفة قلاب ${nDo}${sfx(l)}`, "door", mat, c.x0 + G / 2, -FT, c.z0 + G / 2, c.x1 - c.x0 - G, FT, c.z1 - c.z0 - G, { group: `${tag}:door ${nDo}`, door_label: { hinge_side: "top" }, band: ["left", "right", "top", "bottom"], grain: "x" });
    },
    /** drawers stacked in a bay: c = front cover rect, bay = clear x span, inn = the box inside (floor / depth);
     *  hs = front heights bottom → top as weights (default equal) */
    drawers(l, c, bay, inn, n, { hs = null, mat = "front", top = null } = {}) {
      const ws = hs || Array(n).fill(1), sum = ws.reduce((a, v) => a + v, 0), span = c.z1 - c.z0;
      const slide = SLIDES.find((L) => L <= inn.y1 - inn.y0 - 1 + 1e-6);
      const ceil = top ?? inn.z1;
      let z = c.z0;
      ws.forEach((wv) => {
        const fh = (span * wv) / sum, f0 = z + G / 2, f1 = z + fh - G / 2;
        z += fh;
        nDr++;
        const grp = `${tag}:drawer ${nDr}`, nm = `درج ${nDr}${sfx(l)}`;
        add(`وش ${nm}`, "door", mat, c.x0 + G / 2, -FT, f0, c.x1 - c.x0 - G, FT, f1 - f0, { group: grp, band: ["left", "right", "top", "bottom"], grain: "x" });
        const bz0 = Math.max(f0 + 1, inn.z0 + 1), bz1 = Math.min(f1 - 2.5, ceil - 1.5), bx0 = bay.x0 + 1.3, bx1 = bay.x1 - 1.3, bt = 1.6;
        add(`جنب ${nm} شمال`, "other", "drawer_box", bx0, inn.y0, bz0, bt, slide, bz1 - bz0, { group: grp, band: ["top"], grain: "y" });
        add(`جنب ${nm} يمين`, "other", "drawer_box", bx1 - bt, inn.y0, bz0, bt, slide, bz1 - bz0, { group: grp, band: ["top"], grain: "y" });
        add(`أمامي صندوق ${nm}`, "other", "drawer_box", bx0 + bt, inn.y0, bz0, bx1 - bx0 - 2 * bt, bt, bz1 - bz0, { group: grp, band: ["top"], grain: "x" });
        add(`خلفي صندوق ${nm}`, "other", "drawer_box", bx0 + bt, inn.y0 + slide - bt, bz0, bx1 - bx0 - 2 * bt, bt, bz1 - bz0, { group: grp, band: ["top"], grain: "x" });
        add(`قاعدة ${nm}`, "drawer_bottom", "drawer_bottom", bx0 + bt - GR, inn.y0 + bt - GR, bz0 + 1, bx1 - bx0 - 2 * bt + 2 * GR, slide - 2 * bt + 2 * GR, BK, { group: grp, band: [] });
      });
    },
    /** a recessed plinth frame under a unit (front + back + ends + crosses ≤ 60 cm apart), set back sb from the front and the ends */
    plinth(l, x, w, d, h, { sb = 5, ends = 2, mat = "plinth", backAt } = {}) {
      const x0 = x + ends, x1 = x + w - ends, yb = backAt ?? d - T;
      add(`وزرة قدام${sfx(l)}`, "plinth", mat, x0, sb, 0, x1 - x0, T, h, { grain: "x" });
      add(`وزرة ورا${sfx(l)}`, "plinth", mat, x0, yb, 0, x1 - x0, T, h, { grain: "x" });
      const n = Math.max(0, Math.ceil((x1 - x0 - T) / 60) - 1);
      const xs = [x0, ...Array.from({ length: n }, (_, i) => x0 + ((x1 - x0 - T) * (i + 1)) / (n + 1)), x1 - T];
      xs.forEach((xx, i) => add(i === 0 || i === xs.length - 1 ? `وزرة جنب ${i === 0 ? "شمال" : "يمين"}${sfx(l)}` : `عرضية وزرة ${i}${sfx(l)}`, "plinth", mat, xx, sb + T, 0, T, yb - sb - T, h, { grain: "y" }));
    },
  };
  return K;
}
/** mirror boards front ↔ back about a depth D (y' = D − (y + d)) */
const flipY = (parts, D) => { for (const p of parts) p.y = R2(D - (p.y + p.d)); };
const free = (group, label, desc, panels, mats, extra = {}) => ({ group, label, desc, params: { template: "free", panels, materials: mats, ...extra } });

// ============================================================ living / reception
/** sideboard 200: walnut-veneer box on a recessed black plinth, 3 drawers · 2 doors · 3 drawers, one-piece top */
function sideboard200() {
  const K = kit("sb200"), W = 200, D = 45, PH = 10, H = 68;
  K.plinth("", 0, W, D, PH, { sb: 6, ends: 4 });
  const inn = K.box({ z: PH, w: W, d: D, h: H });
  const bays = K.bays("", inn, [null, null, null, null]);
  const cv = (b) => ({ x0: b.cx0, x1: b.cx1, z0: PH, z1: PH + H });
  K.drawers("شمال", cv(bays[0]), bays[0], inn, 3, { hs: [1.25, 1, 1] });
  K.doors("نص شمال", cv(bays[1]), 1, { hinge: "left" });
  K.doors("نص يمين", cv(bays[2]), 1, { hinge: "right" });
  K.shelf("رف نص شمال", bays[1].x0, bays[1].x1, inn.z0 + 28, inn);
  K.shelf("رف نص يمين", bays[2].x0, bays[2].x1, inn.z0 + 28, inn);
  K.drawers("يمين", cv(bays[3]), bays[3], inn, 3, { hs: [1.25, 1, 1] });
  return K.out;
}
/** wall-hung sideboard 160: a hanging rail behind the top, 2 drawers in the middle, a door each side */
function sideboardFloat160() {
  const K = kit("sb160"), W = 160, D = 42, Z = 30, H = 50;
  const inn = K.box({ z: Z, w: W, d: D, h: H });
  K.add("شريط تعليق (فرنش كليت)", "other", "carcass", inn.x0, D - BIN, inn.z1 - 8, inn.x1 - inn.x0, BIN, 8, { band: [], grain: "x" }); // in the 1.8 gap behind the back
  const bays = K.bays("", inn, [null, 60, null]);
  const cv = (b) => ({ x0: b.cx0, x1: b.cx1, z0: Z, z1: Z + H });
  K.doors("شمال", cv(bays[0]), 1, { hinge: "left" });
  K.shelf("رف شمال", bays[0].x0, bays[0].x1, inn.z0 + 20, inn);
  K.drawers("نص", cv(bays[1]), bays[1], { ...inn, z1: inn.z1 - 8 }, 2);
  K.doors("يمين", cv(bays[2]), 1, { hinge: "right" });
  K.shelf("رف يمين", bays[2].x0, bays[2].x1, inn.z0 + 20, inn);
  return K.out;
}
/** tall bar cabinet 100: a bottle-cubby column, lower doors, a mirror-backed bar niche with a glass shelf, upper doors for glasses */
function barCabinet() {
  const K = kit("bar"), W = 100, D = 45, PH = 8, H = 192;
  K.plinth("", 0, W, D, PH, { sb: 5, ends: 0 });
  const inn = K.box({ z: PH, w: W, d: D, h: H });
  const [col, bay] = K.bays("", inn, [30, null]);
  // bottle cubbies: 12 levels for bottles lying down (≈ 12.5 cm high, 42 deep)
  const n = 12, pitch = (inn.z1 - inn.z0 - (n - 1) * T) / n;
  for (let k = 1; k < n; k++) K.shelf(`رف أزايز ${k}`, col.x0, col.x1, inn.z0 + k * pitch + (k - 1) * T, inn, { fixed: true });
  const zLow = PH + 88, zHigh = PH + 145; // bar ledge at ~ 97, niche 55 high
  K.shelf("رف ثابت تحت النيش", bay.x0, bay.x1, zLow - T / 2, inn, { fixed: true });
  K.shelf("رف ثابت فوق النيش", bay.x0, bay.x1, zHigh - T / 2, inn, { fixed: true });
  K.doors("تحت", { x0: bay.cx0, x1: bay.cx1, z0: PH, z1: zLow }, 2);
  K.shelf("رف تحت", bay.x0, bay.x1, PH + 45, inn);
  K.add("مراية ضهر النيش", "other", "mirror", bay.x0, inn.y1 - 0.4, zLow + T / 2, bay.x1 - bay.x0, 0.4, zHigh - zLow - T, { band: [] });
  K.add("رف زجاج النيش", "other", "glass", bay.x0 + 0.1, inn.y0 + 8, zLow + 27, bay.x1 - bay.x0 - 0.2, inn.y1 - inn.y0 - 8.6, 0.6, { band: [] });
  K.doors("فوق", { x0: bay.cx0, x1: bay.cx1, z0: zHigh, z1: PH + H }, 2, { glass: true });
  K.shelf("رف كاسات", bay.x0, bay.x1, zHigh + 22, inn);
  return K.out;
}

// ============================================================ entry
/** entry corner: a 100 bench (4 shoe cubbies, oak seat) + a 60 shoe cabinet whose top is the console, mirror + hook rail on the wall */
function entryBench() {
  const K = kit("ent"), D = 38;
  // bench box 100 × 41.4 + oak seat 3.6 = 45
  const ib = K.box({ l: "البنش", x: 0, z: 0, w: 100, d: D, h: 41.4, top: false, bottom: false, back: false });
  K.add("قاعدة - البنش", "horizontal", "carcass", ib.x0, 0, 6, ib.x1 - ib.x0, D, T, { grain: "x" });
  K.add("وزرة - البنش", "plinth", "carcass", ib.x0, 3, 0, ib.x1 - ib.x0, T, 6, { grain: "x" });
  K.add("ضهر - البنش", "divider", "carcass", ib.x0, D - T, 6 + T, ib.x1 - ib.x0, T, 41.4 - 6 - T, { grain: "x" });
  const xm = 50 - T / 2;
  K.add("فاصل نص - البنش", "divider", "carcass", xm, 0, 6 + T, T, D - T, 41.4 - 6 - T, { grain: "z" });
  K.add("رف جزم شمال", "fixed_shelf", "shelf", ib.x0, 0, 22, xm - ib.x0, D - T, T, { grain: "x" });
  K.add("رف جزم يمين", "fixed_shelf", "shelf", xm + T, 0, 22, ib.x1 - xm - T, D - T, T, { grain: "x" });
  K.add("قعدة أوك", "horizontal", "accent", 0, 0, 41.4, 100, D, 3.6, { grain: "x", band: ["front", "left", "right"] });
  // shoe cabinet 60 × 110 on a plinth, 2 doors, 4 loose shelves
  const ic = K.box({ l: "الجزامة", x: 100, z: 8, w: 60, d: D, h: 102 });
  K.add("وزرة - الجزامة", "plinth", "plinth", 100, 4, 0, 60, T, 8, { grain: "x" });
  K.doors("الجزامة", { x0: 100, x1: 160, z0: 8, z1: 110 }, 2);
  K.shelves("الجزامة", ic.x0, ic.x1, ic.z0, ic.z1, 4, ic);
  // wall: hook rail over the bench, mirror over the shoe cabinet
  K.add("بانوه حيطة فوق البنش", "back", "carcass", 0, D, 45, 100, T, 155, { grain: "z", band: ["top", "left", "right"] });
  K.add("شريط شماعات", "other", "accent", 0, D - T, 150, 100, T, 10, { grain: "x", band: ["front", "top", "bottom", "left", "right"] });
  K.add("مراية حيطة", "other", "mirror", 105, D - 0.4, 120, 50, 0.4, 80, { band: [] });
  return K.out;
}

// ============================================================ office
/** L desk 160 × 150: main top along the wall, a 50-wide return on the left with a 3-drawer pedestal facing the room */
function deskL() {
  const K = kit("dskl"), DH = 75, TT = T, Y0 = 80, DD = 70;
  K.add("جنب طرف شمال", "side", "front", 0, 0, 0, T, Y0 + DD, DH - TT, { grain: "y" });
  K.add("جنب طرف يمين", "side", "front", 160 - T, Y0, 0, T, DD, DH - TT, { grain: "y" });
  K.add("جنب الرجوع (ناحية الرجلين)", "side", "front", 50 - T, 0, 0, T, Y0, DH - TT, { grain: "y" });
  K.add("سطح المكتب الأساسي", "horizontal", "accent", 0, Y0, DH - TT, 160, DD, TT, { grain: "x", band: ["front", "left", "right"] });
  K.add("سطح الرجوع", "horizontal", "accent", 0, 0, DH - TT, 50, Y0, TT, { grain: "y", band: ["front", "left", "right"] });
  K.add("لوح أمامي (Modesty)", "divider", "front", 50, Y0 + DD - 6 - T, DH - TT - 40, 160 - T - 50, T, 40, { grain: "x" });
  // pedestal between the two panels under the return: 3 drawers on a kick, own back
  const inn = { x0: T, x1: 50 - T, y0: 0, y1: 56, z0: 8 + T, z1: DH - TT, ox0: 0, ox1: 50, oz0: 8, oz1: DH - TT };
  K.add("قاعدة الأدراج", "horizontal", "carcass", T, 0, 8, 50 - 2 * T, 58, T, { grain: "x" });
  K.add("وزرة الأدراج", "plinth", "carcass", T, 3, 0, 50 - 2 * T, T, 8, { grain: "x" });
  K.add("ضهر الأدراج", "divider", "carcass", T, 56, 8 + T, 50 - 2 * T, T, DH - TT - 8 - T, { grain: "x" });
  K.drawers("", { x0: 0, x1: 50, z0: 8, z1: DH - TT }, inn, inn, 3, { hs: [1.6, 1, 1] });
  return K.out;
}
/** workstation for 2 or 4 (face to face): 120 × 70 tops on slab ends, a shared cable spine in the middle carrying the screens */
function workstation(rows) {
  const K = kit(`ws${rows}`), DH = 75, W1 = 120, DP = 70, SP = 14, cols = rows / 2;
  const L = cols * W1, Dtot = 2 * DP + SP;
  // the ends and the middle legs: full-depth panels; the spine: two boards + a lid (a cable channel) between the facing desks
  for (let c = 0; c <= cols; c++) {
    const x = c === 0 ? 0 : c === cols ? L - T : c * W1 - T / 2;
    K.add(c === 0 ? "رجل طرف شمال" : c === cols ? "رجل طرف يمين" : `رجل نص ${c}`, "side", "front", x, 0, 0, T, Dtot, DH - T, { grain: "y" });
  }
  for (let c = 0; c < cols; c++) {
    const x0 = c === 0 ? T : c * W1 + T / 2, x1 = c === cols - 1 ? L - T : (c + 1) * W1 - T / 2;
    K.add(`جنب قناة كابلات قدام ${c + 1}`, "divider", "carcass", x0, DP, DH - T - 25, x1 - x0, T, 25, { grain: "x" });
    K.add(`جنب قناة كابلات ورا ${c + 1}`, "divider", "carcass", x0, DP + SP - T, DH - T - 25, x1 - x0, T, 25, { grain: "x" });
    K.add(`قاع قناة الكابلات ${c + 1}`, "horizontal", "carcass", x0, DP + T, DH - T - 25, x1 - x0, SP - 2 * T, T, { grain: "x" });
    for (const [r, y] of [[1, 0], [2, DP + SP]]) {
      K.add(`سطح مكتب ${c + 1}-${r}`, "horizontal", "accent", c * W1 + (c ? T / 2 : 0), y, DH - T, W1 - (c ? T / 2 : 0) - (c < cols - 1 ? T / 2 : 0), DP, T, { grain: "x", band: ["front", "back", "left", "right"] });
    }
    K.add(`غطا قناة الكابلات ${c + 1}`, "horizontal", "carcass", x0, DP, DH - T, x1 - x0, SP, T, { grain: "x", band: ["left", "right"] });
    K.add(`ساتر بين المكاتب ${c + 1}`, "divider", "front", x0 + 2, DP + SP / 2 - T / 2, DH, x1 - x0 - 4, T, 40, { grain: "x", band: ["top", "left", "right"] });
  }
  return K.out;
}
/** reception counter 200: a raised transaction top (110) on a full front panel + ends, the receptionist's desk (75) behind it with a pedestal */
function reception({ W = 200, topX = 0, left = false } = {}) {
  const K = kit("rcp"), D = 75, TH = 110, DH = 75, TDp = 32;
  // the front: one panel along the counter (walnut), ends returning back to the desk depth, the transaction top on them
  // the front panel between the ends, in two pieces (grain upright → each ≤ 120 wide)
  for (const [i, a, b] of [[1, T, W / 2], [2, W / 2, W - T]]) K.add(`بانوه أمامي ${i}`, "divider", "accent", a, 0, 0, b - a, T, TH - 3.6, { grain: "z", band: ["top"] });
  K.add("جنب طرف شمال", "side", "accent", 0, 0, 0, T, D, TH - 3.6, { grain: "z" });
  K.add("جنب طرف يمين", "side", "accent", W - T, 0, 0, T, D, TH - 3.6, { grain: "z" });
  K.add("سطح الاستقبال (التعامل)", "horizontal", "table_top", 0, -4, TH - 3.6, W + topX, TDp, 3.6, { grain: "x", band: ["front", "back", "left", "right"] });
  K.add("حامل سطح الاستقبال", "horizontal", "carcass", T, T, TH - 3.6 - 15, W - 2 * T, TDp - 4 - T, T, { grain: "x" });
  K.add("ضهر حامل السطح", "divider", "carcass", T, TDp - 4 - T + T, TH - 3.6 - 15 + T, W - 2 * T, T, 15 - T, { grain: "x" });
  // the desk behind: top 75 from the front panel to the back, a 3-drawer pedestal on the right, a modesty board at the back
  K.add("سطح المكتب", "horizontal", "accent", T, TDp - 4, DH - T, W - 2 * T, D - TDp + 4, T, { grain: "x", band: ["back"] });
  // the pedestal (45 clear) at one end; its inner side board stands at the knee-space edge
  const PW = 45, sx = left ? T + PW : W - T - PW - T, ix0 = left ? T : sx + T, ix1 = left ? sx : W - T;
  K.add("جنب وحدة الأدراج", "side", "carcass", sx, TDp - 4, 0, T, D - TDp + 4, DH - T, { grain: "z" });
  const inn = { x0: ix0, x1: ix1, y0: TDp - 4, y1: D, z0: 8 + T, z1: DH - T };
  K.add("قاعدة وحدة الأدراج", "horizontal", "carcass", ix0, TDp - 4, 8, ix1 - ix0, D - TDp + 4 - 3, T, { grain: "x" });
  K.add("وزرة وحدة الأدراج", "plinth", "carcass", ix0, D - 4 - T, 0, ix1 - ix0, T, 8, { grain: "x" });
  // the drawers open to the receptionist (the back of the counter): built facing −y, then mirrored in y (y' = D − (y + d))
  const s = K.out.length;
  K.drawers("", { x0: left ? 0 : sx, x1: left ? sx + T : W, z0: 8, z1: DH - T }, inn, { ...inn, y0: 0, y1: D - TDp + 4 - 1.8 }, 3, { hs: [1.6, 1, 1] });
  for (const p of K.out.slice(s)) p.y = R2(D - (p.y + p.d));
  const mx0 = left ? sx + T + 6 : T + 6, mx1 = left ? W - T - 6 : sx - 6;
  K.add("ساتر خلفي تحت السطح", "divider", "carcass", mx0, TDp - 4 + 6, DH - T - 35, mx1 - mx0, T, 35, { grain: "x" });
  flipY(K.out, D); // the staff side is the unit's front (its doors / drawers open towards −y); the customer side is at the back
  return K.out;
}
/** L reception: the straight counter + a 100 return on the right (its own panel, end and transaction top), open on the left */
function receptionL() {
  const out = reception({ W: 200, topX: 4, left: true });
  const K = kit("rcpl"), D = 75, TH = 110, TDp = 32, zt = TH - 3.6;
  K.add("بانوه الرجوع", "side", "accent", 200 - T, D, 0, T, 100, zt, { grain: "z", band: ["top"] });
  K.add("جنب طرف الرجوع", "divider", "accent", 170, D + 100 - T, 0, 200 - T - 170, T, zt, { grain: "z", band: ["left", "top"] });
  K.add("سطح استقبال الرجوع", "horizontal", "table_top", 170, TDp - 4, zt, 34, D + 100 - TDp + 4, 3.6, { grain: "y", band: ["back", "left", "right"] });
  K.add("حامل سطح الرجوع", "horizontal", "carcass", 172, TDp - 4 + T, zt - 15, 200 - T - 172, D + 100 - T - (TDp - 4 + T), T, { grain: "y" });
  flipY(K.out, D);
  return [...out, ...K.out];
}

// ============================================================ bathroom & laundry
/** double vanity 140: wall-hung, two 60 basin bays each with a big drawer (U cut for the siphon) + a 20 towel column in the middle */
function vanityDouble140() {
  const K = kit("vd140"), W = 140, D = 48, Z = 31.2, H = 52; // + 1.8 top = 85
  const inn = K.box({ z: Z, w: W, d: D, h: H, top: false });
  K.add("شريط علوي أمامي", "horizontal", "carcass", inn.x0, 0, Z + H - T, inn.x1 - inn.x0, 10, T, { grain: "x" });
  K.add("شريط علوي خلفي (تعليق)", "horizontal", "carcass", inn.x0, D - 10, Z + H - T, inn.x1 - inn.x0, 10, T, { grain: "x", band: [] });
  const bays = K.bays("", inn, [null, 18, null], { z1: Z + H - T });
  K.add("سطح الحوض (قص فتحتين للأحواض بالشبلونة)", "horizontal", "accent", 0, -FT, Z + H, W, D + FT, T, { grain: "x", band: ["front", "left", "right"] });
  const cv = (b) => ({ x0: b.cx0, x1: b.cx1, z0: Z, z1: Z + H });
  K.drawers("حوض شمال - قص السيفون", cv(bays[0]), bays[0], { ...inn, z1: Z + H - T }, 1);
  K.drawers("حوض يمين - قص السيفون", cv(bays[2]), bays[2], { ...inn, z1: Z + H - T }, 1);
  K.shelf("رف فوط نص", bays[1].x0, bays[1].x1, inn.z0 + 22, inn, { fixed: true, setback: 0 });
  return K.out;
}
/** floor-standing frame over the toilet: two 25-deep sides, a 2-door cabinet on top, an open shelf, wall fixed */
function overToilet() {
  const K = kit("owc"), W = 70, D = 25, H = 200;
  K.add("جنب شمال", "side", "carcass", 0, 0, 0, T, D, H, { grain: "z" });
  K.add("جنب يمين", "side", "carcass", W - T, 0, 0, T, D, H, { grain: "z" });
  K.add("رأس", "horizontal", "carcass", T, 0, H - T, W - 2 * T, D, T, { grain: "x" });
  K.add("قاعدة الدولاب", "horizontal", "carcass", T, 0, 140, W - 2 * T, D, T, { grain: "x" });
  K.add("ظهر الدولاب", "back", "back", T - GR, D - BIN - BK, 140 + T - GR, W - 2 * T + 2 * GR, BK, H - 140 - 2 * T + 2 * GR, { band: [] });
  K.add("رف مفتوح", "fixed_shelf", "shelf", T, 0, 112, W - 2 * T, D, T, { grain: "x" });
  K.add("عرضية ربط تحت الرف (تثبيت في الحيطة)", "divider", "carcass", T, D - T, 100, W - 2 * T, T, 12, { grain: "x", band: [] });
  K.add("عرضية ربط فوق (تثبيت في الحيطة)", "divider", "carcass", T, D - T, 128, W - 2 * T, T, 12, { grain: "x", band: [] });
  K.doors("", { x0: 0, x1: W, z0: 140, z1: H }, 2);
  K.shelf("رف الدولاب", T, W - T, 140 + T + 28, { y0: 0, y1: D - BIN - BK });
  return K.out;
}
/** mirror cabinet 100: a 60 cabinet with two mirror doors between two 20 open shelf columns */
function mirrorOpenSides() {
  const K = kit("mos"), W = 100, D = 15, Z = 120, H = 70;
  const inn = K.box({ z: Z, w: W, d: D, h: H });
  const bays = K.bays("", inn, [18.2, null, 18.2]);
  K.doors("", { x0: bays[1].cx0, x1: bays[1].cx1, z0: Z, z1: Z + H }, 2, { mirror: true });
  K.shelves("الدولاب", bays[1].x0, bays[1].x1, inn.z0, inn.z1, 2, inn);
  for (const [i, nm] of [[0, "شمال"], [2, "يمين"]]) K.shelves(`مفتوح ${nm}`, bays[i].x0, bays[i].x1, inn.z0, inn.z1, 2, inn, { fixed: true, setback: 0 });
  return K.out;
}
/** mirror cabinet 120: a middle divider (shelves stay under 60), one mirror door per bay opening outwards, 2 shelves each side */
function mirrorCab120() {
  const K = kit("m120"), W = 120, D = 15, Z = 120, H = 75;
  const inn = K.box({ z: Z, w: W, d: D, h: H });
  const [a, b] = K.bays("", inn, [null, null]);
  K.doors("شمال", { x0: a.cx0, x1: a.cx1, z0: Z, z1: Z + H }, 1, { hinge: "left", mirror: true });
  K.doors("يمين", { x0: b.cx0, x1: b.cx1, z0: Z, z1: Z + H }, 1, { hinge: "right", mirror: true });
  K.shelves("شمال", a.x0, a.x1, inn.z0, inn.z1, 2, inn);
  K.shelves("يمين", b.x0, b.x1, inn.z0, inn.z1, 2, inn);
  return K.out;
}
/** washer + dryer stacked (stacking kit) in a 70 column, a 45 storage column beside it, a cabinet over the machines */
function laundryTower() {
  const K = kit("lt"), D = 65, H = 225, CW = 70, SW = 45;
  K.add("جنب شمال", "side", "carcass", 0, 0, 0, T, D, H, { grain: "z" });
  K.add("قاطوع نص", "side", "carcass", CW - T, 0, 0, T, D, H, { grain: "z" });
  K.add("جنب يمين", "side", "carcass", CW + SW - T, 0, 0, T, D, H, { grain: "z" });
  // over the machines: a cabinet from 185 (washer 85 + dryer 85 + kit 3 + 12 clear) to the top
  const zc = 185;
  K.add("رأس الأجهزة", "horizontal", "carcass", T, 0, H - T, CW - 2 * T, D, T, { grain: "x" });
  K.add("قاعدة الدولاب فوق الأجهزة", "horizontal", "carcass", T, 0, zc, CW - 2 * T, D, T, { grain: "x" });
  K.add("ظهر الدولاب فوق الأجهزة", "back", "back", T - GR, D - BIN - BK, zc + T - GR, CW - 2 * T + 2 * GR, BK, H - zc - 2 * T + 2 * GR, { band: [] });
  K.add("عرضية ربط ورا (تحت)", "divider", "carcass", T, D - T, 0, CW - 2 * T, T, 8, { grain: "x", band: [] });
  K.doors("فوق الأجهزة", { x0: 0, x1: CW - T / 2, z0: zc, z1: H }, 2);
  // storage column: plinth, 2 doors (lower 100, upper rest), shelves
  const inn = { x0: CW, x1: CW + SW - T, y0: 0, y1: D - BIN - BK, z0: 8 + T, z1: H - T };
  K.add("قاعدة عمود التخزين", "horizontal", "carcass", inn.x0, 0, 8, inn.x1 - inn.x0, D, T, { grain: "x" });
  K.add("وزرة عمود التخزين", "plinth", "plinth", inn.x0, 4, 0, inn.x1 - inn.x0, T, 8, { grain: "x" });
  K.add("رأس عمود التخزين", "horizontal", "carcass", inn.x0, 0, H - T, inn.x1 - inn.x0, D, T, { grain: "x" });
  K.add("رف ثابت عمود التخزين", "fixed_shelf", "carcass", inn.x0, 0, 108, inn.x1 - inn.x0, inn.y1, T, { grain: "x" });
  K.add("ظهر عمود التخزين", "back", "back", inn.x0 - GR, inn.y1, inn.z0 - GR, inn.x1 - inn.x0 + 2 * GR, BK, inn.z1 - inn.z0 + 2 * GR, { band: [] });
  K.doors("تخزين تحت", { x0: CW - T / 2, x1: CW + SW, z0: 8, z1: 108 + T / 2 }, 1, { hinge: "right" });
  K.doors("تخزين فوق", { x0: CW - T / 2, x1: CW + SW, z0: 108 + T / 2, z1: H }, 1, { hinge: "right" });
  K.shelves("تحت", inn.x0, inn.x1, inn.z0, 108, 2, inn);
  K.shelves("فوق", inn.x0, inn.x1, 108 + T, inn.z1, 3, inn);
  return K.out;
}
/** laundry counter 180: washer + dryer side by side under a 3.6 top (90), a 50 cabinet with a basket shelf, 2 wall shelves above */
function laundryCounter() {
  const K = kit("lc"), D = 62, TOP = 90, TT = 3.6, W = 2 * 63 + 3 * T + 50;
  const hz = TOP - TT;
  K.add("جنب شمال", "side", "carcass", 0, 0, 0, T, D, hz, { grain: "z" });
  K.add("قاطوع بين الغسالة والنشافة", "side", "carcass", T + 63, 0, 0, T, D, hz, { grain: "z" });
  K.add("قاطوع جنب الدولاب", "side", "carcass", 2 * T + 126, 0, 0, T, D, hz, { grain: "z" });
  K.add("جنب يمين", "side", "carcass", W - T, 0, 0, T, D, hz, { grain: "z" });
  for (const [i, x] of [[1, T], [2, 2 * T + 63]]) {
    K.add(`شريط ربط قدام ${i}`, "horizontal", "carcass", x, 0, hz - T, 63, 10, T, { grain: "x" });
    K.add(`شريط ربط ورا ${i}`, "horizontal", "carcass", x, D - 10, hz - T, 63, 10, T, { grain: "x", band: [] });
  }
  K.add("سطح الغسيل", "horizontal", "accent", 0, -2, hz, W, D + 2, TT, { grain: "x", band: ["front", "left", "right"] });
  // the 50 cabinet: bottom on a plinth, back, 2 doors, a shelf
  const x0 = 3 * T + 126, x1 = W - T, inn = { x0, x1, y0: 0, y1: D - BIN - BK, z0: 10 + T, z1: hz - T };
  K.add("قاعدة الدولاب", "horizontal", "carcass", x0, 0, 10, x1 - x0, D, T, { grain: "x" });
  K.add("رأس الدولاب", "horizontal", "carcass", x0, 0, hz - T, x1 - x0, D, T, { grain: "x" });
  K.add("وزرة الدولاب", "plinth", "plinth", x0, 5, 0, x1 - x0, T, 10, { grain: "x" });
  K.add("ظهر الدولاب", "back", "back", x0 - GR, inn.y1, inn.z0 - GR, x1 - x0 + 2 * GR, BK, inn.z1 - inn.z0 + 2 * GR, { band: [] });
  K.doors("", { x0: x0 - T / 2, x1: W, z0: 10, z1: hz }, 1, { hinge: "right" });
  K.shelves("", x0, x1, inn.z0, inn.z1, 1, inn);
  K.add("بانوه حيطة فوق الأجهزة", "back", "carcass", 0, D, hz + TT, W, T, 190 - hz - TT, { grain: "x", band: ["top", "left", "right"] });
  // wall shelves over the machines (hidden brackets)
  for (const [i, z] of [[1, 140], [2, 175]]) K.add(`رف حيطة ${i}`, "shelf", "accent", 0, D - 28, z, 2 * T + 126 + T, 28, TT, { grain: "x", band: ["front", "left", "right"] });
  return K.out;
}
/** broom / utility cupboard 60: a 25 tall open side for the broom, mop and vacuum, shelves on the other side, 2 doors */
function broomCupboard() {
  const K = kit("brm"), W = 60, D = 50, PH = 8, H = 212;
  K.plinth("", 0, W, D, PH, { sb: 4, ends: 0 });
  const inn = K.box({ z: PH, w: W, d: D, h: H });
  const [a, b] = K.bays("", inn, [25, null]);
  K.add("شماعة أدوات (شريط)", "other", "accent", a.x0, inn.y1 - T, PH + 150, a.x1 - a.x0, T, 8, { band: ["front", "top", "bottom"] });
  K.shelf("رف فوق المكنسة", a.x0, a.x1, PH + 175, inn, { fixed: true });
  K.shelves("المنظفات", b.x0, b.x1, inn.z0, inn.z1, 5, inn);
  K.doors("", { x0: 0, x1: W, z0: PH, z1: PH + H }, 2);
  return K.out;
}

// ============================================================ shops
/** cash desk 150: customer side 105 high with a front panel and a raised top, cashier desk at 90 behind with 2 drawers (cash + keys) and an open shelf */
function cashDesk() {
  const K = kit("cash"), W = 150, D = 65, TH = 105, WH = 90;
  K.add("بانوه أمامي", "divider", "accent", T, 0, 8, W - 2 * T, T, TH - 3.6 - 8, { grain: "x", band: ["top", "left", "right"] });
  K.add("وزرة غاطسة قدام", "plinth", "plinth", T, 5, 0, W - 2 * T, T, 8, { grain: "x" });
  K.add("جنب شمال", "side", "carcass", 0, 0, 0, T, D, TH - 3.6, { grain: "z" });
  K.add("جنب يمين", "side", "carcass", W - T, 0, 0, T, D, TH - 3.6, { grain: "z" });
  K.add("سطح العميل", "horizontal", "table_top", 0, -3, TH - 3.6, W, 28, 3.6, { grain: "x", band: ["front", "back", "left", "right"] });
  K.add("حامل سطح العميل", "horizontal", "carcass", T, T, TH - 3.6 - 12, W - 2 * T, 25 - 3 - T, T, { grain: "x" });
  K.add("ضهر حامل السطح", "divider", "carcass", T, 25 - 3, TH - 3.6 - 12, W - 2 * T, T, 12 - 3.6 + 3.6, { grain: "x" });
  K.add("سطح الكاشير", "horizontal", "accent", T, 25 - 3 + T, WH - T, W - 2 * T, D - 25 + 3 - T, T, { grain: "x", band: ["back"] });
  K.add("قاعدة", "horizontal", "carcass", T, T, 8, W - 2 * T, D - T - 4, T, { grain: "x" });
  K.add("وزرة ورا", "plinth", "plinth", T, D - 4 - T, 0, W - 2 * T, T, 8, { grain: "x" });
  // the cashier's side (back, y = D): a drawer column 45 wide on the right; drawers face the cashier → built facing −y then mirrored
  const px0 = W - T - 45;
  K.add("جنب عمود الأدراج", "side", "carcass", px0, 25 - 3 + T, 8 + T, T, D - 25 + 3 - T, WH - T - 8 - T, { grain: "z" });
  K.add("رف مفتوح للكاشير", "fixed_shelf", "shelf", T, 25 - 3 + T, 40, px0 - T, D - 25 + 3 - T, T, { grain: "x" });
  const s = K.out.length;
  const inn = { x0: px0 + T, x1: W - T, y0: 0, y1: D - 25 + 3 - T - 1, z0: 8 + T, z1: WH - T, ox0: px0, ox1: W - T / 2, oz0: 8 + T, oz1: WH - T };
  K.drawers("", { x0: px0 + T / 2, x1: W - T / 2, z0: 8 + T, z1: WH - T }, inn, inn, 2, { hs: [1.6, 1] });
  for (const p of K.out.slice(s)) p.y = R2(D - (p.y + p.d));
  flipY(K.out, D); // the staff side is the unit's front (its doors / drawers open towards −y); the customer side is at the back
  return K.out;
}
/** tall glass display 80: wood box, 4 glass shelves, 2 framed glass doors, a 40 storage base with doors */
function displayTall() {
  const K = kit("dt"), W = 80, D = 45, PH = 8, H = 202, ZB = PH + 40;
  K.plinth("", 0, W, D, PH, { sb: 4, ends: 0 });
  const inn = K.box({ z: PH, w: W, d: D, h: H });
  K.shelf("رف ثابت فوق الدولاب", inn.x0, inn.x1, ZB - T / 2, inn, { fixed: true });
  K.doors("تحت", { x0: 0, x1: W, z0: PH, z1: ZB }, 2);
  K.doors("فاترينة", { x0: 0, x1: W, z0: ZB, z1: PH + H }, 2, { glass: true });
  const z0 = ZB + T / 2, z1 = inn.z1, n = 4, pitch = (z1 - z0) / (n + 1);
  for (let k = 1; k <= n; k++) K.add(`رف زجاج ${k}`, "other", "glass", inn.x0 + 0.2, 2, z0 + pitch * k, inn.x1 - inn.x0 - 0.4, inn.y1 - 2.2, 0.6, { band: [] });
  return K.out;
}
/** counter-height display 120: glass top 1.0 and a glass front band (display zone 25 high), storage doors on the staff side */
function displayCounter() {
  const K = kit("dc"), W = 120, D = 55, H = 95, PH = 8, ZD = H - 1 - 25; // display floor at 69
  K.add("جنب شمال", "side", "carcass", 0, 0, 0, T, D, H - 1, { grain: "z" });
  K.add("جنب يمين", "side", "carcass", W - T, 0, 0, T, D, H - 1, { grain: "z" });
  K.add("قاعدة", "horizontal", "carcass", T, 0, PH, W - 2 * T, D, T, { grain: "x" });
  K.add("وزرة قدام", "plinth", "plinth", T, 4, 0, W - 2 * T, T, PH, { grain: "x" });
  K.add("وزرة ورا", "plinth", "plinth", T, D - 4 - T, 0, W - 2 * T, T, PH, { grain: "x" });
  K.add("أرضية العرض", "fixed_shelf", "accent", T, 0, ZD - T, W - 2 * T, D, T, { grain: "x" });
  K.add("بانوه أمامي", "divider", "front", T, 0, PH + T, W - 2 * T, T, ZD - T - PH - T, { grain: "x", band: ["left", "right"] });
  K.add("شريط علوي قدام", "horizontal", "carcass", T, 0, H - 1 - T, W - 2 * T, 8, T, { grain: "x" });
  K.add("زجاج أمامي", "other", "glass", T, 0.5, ZD, W - 2 * T, 0.6, H - 1 - T - ZD, { band: [] });
  K.add("زجاج سطح", "other", "glass", 0, 0, H - 1, W, D, 1.0, { band: [] });
  // staff side (back): two doors over the storage under the display floor, a fixed shelf
  const inn = { x0: T, x1: W - T, y0: T, y1: D, z0: PH + T, z1: ZD - T };
  K.shelf("رف التخزين", inn.x0, inn.x1, PH + T + 28, { y0: T + 1, y1: D - 1 });
  const s = K.out.length;
  K.doors("ناحية البايع", { x0: 0, x1: W, z0: PH, z1: ZD - T / 2 }, 2);
  for (const p of K.out.slice(s)) p.y = R2(D - (p.y + p.d));
  K.add("شريط علوي ورا", "horizontal", "carcass", T, D - 8, H - 1 - T, W - 2 * T, 8, T, { grain: "x" });
  flipY(K.out, D); // the staff side is the unit's front (its doors / drawers open towards −y); the customer side is at the back
  return { panels: K.out, inn };
}
/** café counter 240: customer front 110 with a ledge, work top 90 behind, under-counter cabinets (doors · drawers · open machine bay) */
function cafeCounter() {
  const K = kit("cafe"), W = 240, D = 70, TH = 110, WH = 90, TT = 3.6;
  for (const [a, b, i] of [[0, 120, 1], [120, 240, 2]]) K.add(`بانوه أمامي ${i}`, "divider", "accent", a + (a ? 0 : T), 0, 8, b - a - T, T, TH - TT - 8, { grain: "z", band: ["top"] });
  K.add("وزرة غاطسة قدام", "plinth", "plinth", T, 5, 0, W - 2 * T, T, 8, { grain: "x" });
  K.add("جنب شمال", "side", "carcass", 0, 0, 0, T, D, TH - TT, { grain: "z" });
  K.add("جنب يمين", "side", "carcass", W - T, 0, 0, T, D, TH - TT, { grain: "z" });
  K.add("سطح العميل (بار)", "horizontal", "table_top", 0, -10, TH - TT, W / 2, 30, TT, { grain: "x", band: ["front", "back", "left"] });
  K.add("سطح العميل (بار) 2", "horizontal", "table_top", W / 2, -10, TH - TT, W / 2, 30, TT, { grain: "x", band: ["front", "back", "right"] });
  K.add("حامل سطح البار", "divider", "carcass", T, 18, WH, W - 2 * T, T, TH - TT - WH, { grain: "x" });
  // work top 90 (two pieces) over a cabinet run 50 deep facing the barista (back side)
  K.add("سطح الشغل", "horizontal", "table_top", T, 18 + T, WH - TT, (W - 2 * T) / 2, D - 18 - T, TT, { grain: "x", band: ["back"] });
  K.add("سطح الشغل 2", "horizontal", "table_top", T + (W - 2 * T) / 2, 18 + T, WH - TT, (W - 2 * T) / 2, D - 18 - T, TT, { grain: "x", band: ["back"] });
  const y0 = 18 + T, zt = WH - TT;
  K.add("قاعدة", "horizontal", "carcass", T, y0, 10, W - 2 * T, D - y0, T, { grain: "x" });
  K.add("وزرة ورا", "plinth", "plinth", T, D - 5 - T, 0, W - 2 * T, T, 10, { grain: "x" });
  K.add("ضهر الدواليب", "back", "back", T, y0, 10 + T, W - 2 * T, BK, zt - 10 - T, { band: [] });
  // bays (barista side, left → right as seen from the front): doors 60 · drawers 60 · open 60 (machine / fridge) · doors 54.6
  const bw = [60, 60, 60, null], xs = [];
  let x = T;
  bw.forEach((v, i) => { const w = v ?? W - T - x; xs.push([x, x + w]); x += w; if (i < 3) { K.add(`قاطوع ${i + 1}`, "divider", "carcass", x, y0 + BK, 10 + T, T, D - y0 - BK, zt - 10 - T, { grain: "z" }); x += T; } });
  const inn = (i) => ({ x0: xs[i][0], x1: xs[i][1], y0: 0, y1: D - y0 - BK - 1, z0: 10 + T, z1: zt });
  const s = K.out.length;
  K.doors("دولاب 1", { x0: xs[0][0] - T, x1: xs[0][1] + T / 2, z0: 10, z1: zt }, 1, { hinge: "left" });
  K.drawers("دولاب 2", { x0: xs[1][0] - T / 2, x1: xs[1][1] + T / 2, z0: 10, z1: zt }, inn(1), inn(1), 3);
  K.doors("دولاب 4", { x0: xs[3][0] - T / 2, x1: xs[3][1] + T, z0: 10, z1: zt }, 1, { hinge: "right" });
  for (const p of K.out.slice(s)) p.y = R2(D - (p.y + p.d));
  K.add("رف دولاب 1", "shelf", "shelf", xs[0][0] + 0.1, y0 + BK + 0.2, 45, xs[0][1] - xs[0][0] - 0.2, D - y0 - BK - 1.2, T, { grain: "x" });
  K.add("رف دولاب 4", "shelf", "shelf", xs[3][0] + 0.1, y0 + BK + 0.2, 45, xs[3][1] - xs[3][0] - 0.2, D - y0 - BK - 1.2, T, { grain: "x" });
  flipY(K.out, D); // the staff side is the unit's front (its doors / drawers open towards −y); the customer side is at the back
  return K.out;
}

// ============================================================ the library entries
export default (h) => {
  const { M, P } = h;
  const L = "الريسبشن", SH = "مكتبات", EN = "المدخل", OF = "المكاتب", BA = "الحمام", LA = "الغسيل والخدمات", CO = "محلات وتجاري";
  // wall_comp helpers: a cell, a split
  const c = (kind, o = {}) => ({ kind, ...o });
  const v = (...parts) => ({ dir: "v", parts: parts.map(([size, node]) => ({ size, node })) });
  const hz = (...parts) => ({ dir: "h", parts: parts.map(([size, node]) => ({ size, node })) });
  const WC = (group, label, desc, W, H, depth, root, mats, extra = {}) => P(group, label, desc, { template: "wall_comp", width: W, height: H, handle: "push", wc: { depth, root, ...(extra.wc || {}) }, materials: M(mats), ...extra.p });
  const lockers = (cols, rows, cw, H) => v(...Array.from({ length: cols }, () => [cw, hz(...Array.from({ length: rows }, () => [null, c("doors", { count: 1, shelves: rows === 1 ? 1 : 0, hinge: "left" })]))]));
  const dc = displayCounter();
  const PANEL = {
    // ---------------------------------------------------------------- living / reception
    r7_sideboard200: free(L, "بوفيه 200 جوز على قاعدة غاطسة", "3 أدراج · ضلفتين برف · 3 أدراج، سطح واحد 200، وزرة سودا داخلة 6 سم — فتح Push.", sideboard200(),
      M({ carcass: "wood_walnut_v", front: "wood_walnut_v", shelf: "wood_walnut_v", plinth: "hpl_black", drawer_box: "hpl_white" })),
    r7_sideboard160_float: free(L, "بوفيه معلّق 160 بدرجين", "معلّق على شريط تعليق (فرنش كليت) 30 سم من الأرض: ضلفة · درجين · ضلفة، أوك وأبيض.", sideboardFloat160(),
      M({ carcass: "hpl_white", front: "wood_oak_natural_v", shelf: "hpl_white", drawer_box: "hpl_white" })),
    r7_buffet180_sliding: WC(L, "كريدنزا 180 بضلف جرار على رجول", "علبتين 90 جوه، ضلفتين جرار ماشيين على الطول كله، رف في كل علبة، رجول معدن 15.", 180, 80, 45,
      c("sliding", { count: 2, shelves: 1 }), { carcass: "wood_oak_natural_v", front: "hpl_sage", shelf: "wood_oak_natural_v" }, { p: { plinth: { height: 15, setback: 5, style: "legs" } } }),
    r7_vitrine100_glass: WC(L, "فاترينة 100 ضلف زجاج ونيش ليد", "فوق: ضلفتين زجاج بفريم و3 أرفف · نيش عرض مفتوح بليد · تحت: درجين على وزرة.", 100, 205, 40,
      hz([null, c("doors", { count: 2, shelves: 3, glass: true })], [32, c("niche", { led: true, depth: 38 })], [50, c("drawers", { count: 2 })]),
      { carcass: "hpl_anthracite", front: "wood_walnut_v", accent: "wood_walnut_v", shelf: "hpl_anthracite" }),
    r7_bar_cabinet100: free(L, "دولاب بار 100 بخانات أزايز", "عمود 30 خانات أزايز نايمة · ضلفتين تحت · نيش بار بضهر مراية ورف زجاج على 97 سم · ضلفتين زجاج فوق للكاسات.", barCabinet(),
      M({ carcass: "hpl_black", front: "wood_walnut_dark_v", shelf: "hpl_black", plinth: "hpl_black" })),
    r7_clad_slats_niche: P(L, "تجليد حيطة شرايح بتجويف ليد", "شرايح جوز 5 سم على وحدة مصمتة 260×240 طالعة 15 سم، تجويف طولي 30×150 بليد ورفين.", { template: "tv_wall", handle: "push",
      tvw: { left: { on: false }, right: { on: false }, mid: { width: 260, low: false }, clad: { on: true, match: false, z0: 0, top: 240, depth: 15, style: "slats", slat_width: 5, slat_gap: 1.5, slat_mat: "accent", mat: "carcass" },
        niches: [{ on: true, x: "center", z: 60, w: 30, h: 150, depth: 13, shelves: 2, led: true, lining: "carcass", back: "carcass" }] },
      materials: M({ carcass: "hpl_anthracite", accent: "wood_walnut_v", front: "hpl_anthracite" }) }),
    r7_clad_flat_shelves: WC(L, "تجليد حيطة سادة 300 بنيش أرفف", "3 بانوهات مصمتة طالعة 20 سم: جنبين رمادي ونص أوك فيه نيش 80×150 بـ3 أرفف وليد.", 300, 260, 20,
      v([100, c("solid", { mat: "front" })], [null, c("solid", { mat: "accent", hole: { w: 80, h: 150, x: "center", z: 70, depth: 18, shelves: 3, led: true, lining: "carcass", back: "carcass" } })], [100, c("solid", { mat: "front" })]),
      { carcass: "hpl_white", front: "hpl_greige", accent: "wood_oak_natural_v" }),
    r7_bookcase_doors240: WC(SH, "مكتبة 240 بضلف تحت وليد", "3 أعمدة 80: ضلف تحت (عمق 40، رف) وفوقهم أرفف مفتوحة عمق 30 بليد — الرف السفلي بيطلع كونسول.", 240, 240, 40,
      v(...[0, 1, 2].map(() => [80, hz([null, c("open", { shelves: 3, led: true, depth: 30 })], [85, c("doors", { count: 2, shelves: 1, depth: 40 })])])),
      { carcass: "hpl_offwhite", front: "hpl_greige", shelf: "hpl_offwhite", accent: "wood_oak_natural_v" }),
    r7_shelf_wall300: WC(SH, "حيطة أرفف موديولات 300", "مربعات مفتوحة ومقفولة متبادلة: أرفف · نيشات أوك بليد · ضلف · أدراج — كل علبة لوحدها.", 300, 220, 35,
      v([60, hz([null, c("open", { shelves: 3 })], [70, c("doors", { count: 1, shelves: 1, hinge: "left" })])],
        [180, hz([45, c("open", { shelves: 0, led: true, mat: "accent" })], [null, c("open", { shelves: 1, depth: 30 })], [70, c("drawers", { count: 2 })])],
        [60, hz([70, c("niche", { shelves: 1 })], [null, c("open", { shelves: 2 })], [70, c("doors", { count: 1, shelves: 1, hinge: "right" })])]),
      { carcass: "hpl_white", front: "hpl_white", shelf: "hpl_white", accent: "wood_oak_natural_v" }),
    // ---------------------------------------------------------------- entry
    r7_entry_bench160: free(EN, "ركن مدخل: بنش + جزامة + مراية", "بنش 100 بقعدة أوك 3.6 و4 خانات جزم، جزامة 60 بضلفتين سطحها كونسول 110، مراية وشريط شماعات على الحيطة.", entryBench(),
      M({ carcass: "hpl_white", front: "hpl_white", shelf: "hpl_white", accent: "wood_oak_natural_v", plinth: "hpl_white" })),
    r7_entry_wardrobe180: WC(EN, "دولاب مدخل 180 بنيش شماعات وبنش", "دولاب بالطو 60 بشماعة · نيش أوك للشماعات فوق بنش بدرج 45 · جزامة 60 بـ6 أرفف عمق 35.", 180, 240, 55,
      v([60, c("wardrobe", { count: 1, rods: 1, hinge: "left" })],
        [60, hz([50, c("doors", { count: 1, shelves: 0, depth: 35 })], [null, c("niche", { depth: 35 })], [45, c("drawers", { count: 1, depth: 45 })])],
        [60, c("doors", { count: 1, shelves: 6, depth: 35, hinge: "right" })]),
      { carcass: "hpl_offwhite", front: "hpl_beige", shelf: "hpl_offwhite", accent: "wood_oak_natural_v" }),
    r7_entry_mirror_cab80: P(EN, "دولاب مدخل معلّق بضلف مراية ونيش مفاتيح", "80×100 عمق 22: ضلفتين مراية Push بـ3 أرفف، ونيش 18 تحت بليد للمفاتيح.", { template: "cabinet", width: 80, height: 100, depth: 22, mount: "wall", handle: "push", front_style: "mirror",
      fronts: [{ type: "open", height: 18, shelves: 0, led: true }, { type: "doors", count: 2, shelves: 3 }], materials: M({ carcass: "wood_oak_natural_v", front: "wood_oak_natural_v", shelf: "wood_oak_natural_v" }) }),
    // ---------------------------------------------------------------- office
    r7_desk120: P(OF, "مكتب 120 بوحدة أدراج", "120×60، وحدة 3 أدراج يمين، ساتر أمامي، فتحة كابلات.", { template: "desk", width: 120, depth: 60, handle: "bar",
      materials: M({ carcass: "hpl_white", front: "hpl_white", accent: "wood_oak_light_v" }), desk: { pedestal: "right", pedestal_width: 40, pedestal_drawers: 3, modesty: true } }),
    r7_desk140: P(OF, "مكتب 140 أوك بأدراج جولا", "140×70، وحدة أدراج 45 شمال بـ3 أدراج جولا، سطح وجنب أوك.", { template: "desk", width: 140, depth: 70, handle: "gola",
      materials: M({ carcass: "hpl_anthracite", front: "wood_oak_natural_v", accent: "wood_oak_natural_v" }), desk: { pedestal: "left", pedestal_width: 45, pedestal_drawers: 3, modesty: true } }),
    r7_desk160_exec: P(OF, "مكتب مدير 160 جوز", "160×75، وحدة 4 أدراج 45 يمين، ساتر أمامي، رفين حيطة بليد.", { template: "desk", width: 160, depth: 75, handle: "bar",
      materials: M({ carcass: "wood_walnut_v", front: "wood_walnut_v", accent: "wood_walnut_v" }), desk: { pedestal: "right", pedestal_width: 45, pedestal_drawers: 4, modesty: true, wall_shelves: 2, led: true } }),
    r7_desk_L160: free(OF, "مكتب L 160×150 بأدراج", "سطح 160×70 على الحيطة + رجوع 50×80 شمال تحته 3 أدراج، ساتر أمامي، مكان رجلين 108.", deskL(),
      M({ carcass: "hpl_white", front: "hpl_white", accent: "wood_oak_natural_v", drawer_box: "hpl_white" })),
    r7_pedestal_mobile: P(OF, "وحدة أدراج متحركة بدرج ملفات", "42×55×65 على 4 عجل 6 سم (مكان الرجول): درجين أقلام + درج ملفات معلّقة A4 تحت — بتدخل تحت المكتب.", { template: "cabinet", width: 42, height: 65, depth: 55, handle: "bar",
      plinth: { height: 6, setback: 0, style: "legs" }, fronts: [{ type: "drawers", count: 1, height: 33 }, { type: "drawers", count: 2 }], materials: M({ carcass: "hpl_white", front: "hpl_anthracite" }) }),
    r7_office_files80: P(OF, "دولاب ملفات 80 بضلفتين", "80×200×42، ضلفتين طول بقفل، 4 أرفف = 5 أدوار كلاسير.", { template: "cabinet", width: 80, height: 200, depth: 42, handle: "bar",
      fronts: [{ type: "doors", count: 2, shelves: 4 }], materials: M({ carcass: "hpl_light_grey", front: "hpl_light_grey" }) }),
    r7_office_bookcase160: WC(OF, "مكتبة مكتب 160 زجاج فوق وخشب تحت", "عمودين 80: ضلف زجاج بفريم فوق بـ3 أرفف، ضلف خشب تحت 80 بقفل.", 160, 210, 40,
      v([80, hz([null, c("doors", { count: 2, shelves: 3, glass: true, depth: 35 })], [80, c("doors", { count: 2, shelves: 1 })])], [80, hz([null, c("doors", { count: 2, shelves: 3, glass: true, depth: 35 })], [80, c("doors", { count: 2, shelves: 1 })])]),
      { carcass: "hpl_anthracite", front: "wood_walnut_v", shelf: "hpl_anthracite" }, { p: { handle: "bar" } }),
    r7_reception200: free(OF, "كاونتر استقبال 200", "الصورة من ناحية الموظف: مكتب 75 بوحدة 3 أدراج وساتر، وناحية العميل بانوه جوز 110 وسطح تعامل 32 سم — لفّها حسب المكان.", reception(),
      M({ carcass: "hpl_white", front: "hpl_white", accent: "wood_walnut_v", table_top: "hpl_white", drawer_box: "hpl_white" })),
    r7_reception_L: free(OF, "كاونتر استقبال L 200 + 100", "الكاونتر المستقيم 200 + رجوع يمين 100 بسطح تعامل تاني ومكتب — للزاوية.", receptionL(),
      M({ carcass: "hpl_white", front: "hpl_white", accent: "wood_oak_natural_v", table_top: "hpl_black", drawer_box: "hpl_white" })),
    r7_workstation2: free(OF, "وورك ستيشن فردين وش لوش", "مكتبين 120×70 قصاد بعض، قناة كابلات 14 سم في النص بغطا، ساتر 40 فوق السطح، رجول ألواح.", workstation(2),
      M({ carcass: "hpl_light_grey", front: "hpl_white", accent: "hpl_white" })),
    r7_workstation4: free(OF, "وورك ستيشن 4 أفراد", "4 مكاتب 120×70 (2 قصاد 2) على رجول ألواح، قناة كابلات مشتركة بغطا وساتر بين كل اتنين.", workstation(4),
      M({ carcass: "hpl_light_grey", front: "hpl_white", accent: "wood_oak_light_v" })),
    r7_lockers4: WC(OF, "لوكر 4 أبواب", "عمودين 40 × دورين، كل باب بقفل، على وزرة، عمق 45.", 80, 190, 45, lockers(2, 2, 40, 190), { carcass: "hpl_light_grey", front: "hpl_navy" }, { p: { handle: "bar" } }),
    r7_lockers6: WC(OF, "لوكر 6 أبواب", "3 أعمدة 40 × دورين، كل باب بقفل، عمق 45.", 120, 190, 45, lockers(3, 2, 40, 190), { carcass: "hpl_light_grey", front: "hpl_grey" }, { p: { handle: "bar" } }),
    r7_lockers9: WC(OF, "لوكر 9 أبواب", "3 أعمدة 40 × 3 أدوار، كل باب بقفل، عمق 45.", 120, 190, 45, lockers(3, 3, 40, 190), { carcass: "hpl_white", front: "wood_oak_light_v" }, { p: { handle: "bar" } }),
    r7_meeting_credenza200: WC(OF, "كريدنزا غرفة اجتماعات 200", "دولابين بدرج وضلف على الأطراف ونيش أجهزة 80 بليد في النص، على رجول.", 200, 75, 48,
      v([60, c("combo", { dcount: 1, dh: 18, count: 1, shelves: 1, hinge: "left" })], [null, c("open", { shelves: 1, led: true })], [60, c("combo", { dcount: 1, dh: 18, count: 1, shelves: 1, hinge: "right" })]),
      { carcass: "hpl_anthracite", front: "wood_walnut_v", shelf: "hpl_anthracite" }, { p: { plinth: { height: 12, setback: 5, style: "legs" } } }),
    // ---------------------------------------------------------------- bathroom
    r7_vanity_double140: free(BA, "حوض دبل 140 بدرجين", "معلّق، سطح تيرازو بفتحتين لحوضين على 85، درجين 60 (قص U للسيفون في الصندوق والظهر) وعمود فوط 18 في النص.", vanityDouble140(),
      M({ carcass: "hpl_white", front: "hpl_olive", shelf: "hpl_white", accent: "terrazzo", drawer_box: "hpl_white" }), { environment: "wet" }),
    r7_bath_tall60: P(BA, "دولاب حمام 60 بضلفتين ورجول", "60×190×35 على رجول 15: ضلفتين بـ4 أرفف ونيش سلال مفتوح تحت.", { template: "bath_tall", width: 60, height: 190, depth: 35, handle: "push",
      plinth: { height: 15, setback: 0, style: "legs" }, fronts: [{ type: "open", height: 32, shelves: 0 }, { type: "doors", count: 2, shelves: 4 }], materials: M({ carcass: "hpl_white", front: "hpl_greige" }) }),
    r7_over_wc_frame: free(BA, "دولاب فوق التواليت أرضي 70", "جنبين 200 عمق 25 حوالين التواليت، رف مفتوح على 112 ودولاب بضلفتين من 140 لفوق — بيتثبت في الحيطة.", overToilet(),
      M({ carcass: "hpl_white", front: "hpl_sage", shelf: "hpl_white" }), { environment: "wet" }),
    r7_mirror_cab100_open: free(BA, "دولاب مراية 100 بأرفف جنب", "دولاب 60 بضلفتين مراية في النص وعمودين أرفف مفتوحين 18 على الجنبين.", mirrorOpenSides(),
      M({ carcass: "hpl_greige", front: "hpl_greige", shelf: "hpl_greige" }), { environment: "wet" }),
    r7_mirror_cab40_tall: P(BA, "دولاب مراية 40 طولي", "40×90×15 ضلفة مراية واحدة Push، 4 أرفف — للحمامات الضيقة.", { template: "mirror_cabinet", width: 40, height: 90, depth: 15,
      fronts: [{ type: "doors", count: 1, shelves: 4, hinge: "right" }], materials: M({ carcass: "hpl_white" }) }),
    r7_mirror_cab120: free(BA, "دولاب مراية 120 بقاطوع نص", "120×75×15: ضلفتين مراية 60 بيفتحوا للجناب، قاطوع في النص و2 رف كل ناحية — الرف مايقوّسش.", mirrorCab120(),
      M({ carcass: "hpl_anthracite", front: "hpl_anthracite", shelf: "hpl_anthracite" }), { environment: "wet" }),
    // ---------------------------------------------------------------- laundry & services
    r7_laundry_tower: free(LA, "برج غسالة + نشافة وعمود تخزين", "عمود 70 للغسالة والنشافة فوق بعض (طقم تركيب) ودولاب فوقهم، وعمود تخزين 45 بضلفتين وأرفف — ارتفاع 225 عمق 65.", laundryTower(),
      M({ carcass: "hpl_white", front: "hpl_light_grey", shelf: "hpl_white", plinth: "hpl_white" }), { environment: "wet" }),
    r7_laundry_counter: free(LA, "كونتر غسيل فوق غسالة ونشافة", "غسالة ونشافة جنب بعض تحت سطح 3.6 على 90، دولاب 50 بضلفة ورف، ورفين حيطة فوق الأجهزة.", laundryCounter(),
      M({ carcass: "hpl_white", front: "hpl_white", shelf: "hpl_white", accent: "hpl_anthracite", plinth: "hpl_white" }), { environment: "wet" }),
    r7_broom_cupboard60: free(LA, "دولاب مكانس ومنظفات 60", "220×60×50 بضلفتين: خانة 25 للمكنسة والمساحة والمكنسة الكهربا وشريط شماعات، وجنبها 5 أرفف منظفات.", broomCupboard(),
      M({ carcass: "hpl_white", front: "hpl_greige", shelf: "hpl_white", accent: "hpl_greige", plinth: "hpl_white" }), { environment: "wet" }),
    // ---------------------------------------------------------------- shops
    r7_cash_desk150: free(CO, "كاشير محل 150", "الصورة من ناحية الكاشير: سطح 90 بدرج فلوس ودرج تحته ورف مفتوح، وناحية العميل بانوه وسطح بارز على 105.", cashDesk(),
      M({ carcass: "hpl_white", front: "hpl_white", accent: "wood_oak_natural_v", table_top: "hpl_black", plinth: "hpl_black", drawer_box: "hpl_white" })),
    r7_display_tall80: free(CO, "فاترينة عرض طولية 80 زجاج", "ضلفتين زجاج بفريم و4 أرفف زجاج 6 مم فوق، ودولاب تخزين 40 بضلفتين تحت.", displayTall(),
      M({ carcass: "hpl_black", front: "hpl_black", plinth: "hpl_black" })),
    r7_display_counter120: free(CO, "فاترينة كاونتر 120 بسطح زجاج", "ارتفاع 95: سطح زجاج 10 مم وزجاج ناحية العميل على منطقة عرض 25 سم، وتحتها تخزين بضلفتين ناحية البايع (الصورة من ناحيته).", dc.panels,
      M({ carcass: "hpl_white", front: "wood_walnut_v", accent: "acrylic_champagne", plinth: "hpl_black" })),
    r7_jewelry_wall300: WC(CO, "حيطة عرض مجوهرات بنيشات مضيئة", "3 أعمدة 100: تحت دولاب ضلف 75 وأدراج 30 (عمق 50 = رف 105)، وفوقهم وحدة مصمتة بنيش مضيء 70×55 لكل عمود.", 300, 260, 50,
      v(...[0, 1, 2].map(() => [100, hz([null, c("solid", { mat: "accent", depth: 30, hole: { w: 70, h: 55, x: "center", z: 125, depth: 25, shelves: 0, led: true, lining: "front", back: "front" } })], [30, c("drawers", { count: 1 })], [75, c("doors", { count: 2, shelves: 1 })])])),
      { carcass: "hpl_black", front: "hpl_black", accent: "wood_walnut_dark_v", shelf: "hpl_black" }, { p: { handle: "gola" } }),
    r7_pharmacy_wall360: WC(CO, "أرفف صيدلية / سوبر ماركت 360", "4 أعمدة 90 أرفف متحركة (5 أرفف عمق 35)، أدراج تحت عمق 45، وهيدر مصمت 30 فوق لليافطة والليد.", 360, 240, 45,
      hz([30, c("solid", { mat: "accent", depth: 35, led: true })], [null, v(...[0, 1, 2, 3].map(() => [90, c("open", { shelves: 5, depth: 35 })]))], [60, v(...[0, 1, 2, 3].map(() => [90, c("drawers", { count: 2 })]))]),
      { carcass: "hpl_white", front: "hpl_white", shelf: "hpl_white", accent: "hpl_sage" }),
    r7_clothing_wall360: WC(CO, "حيطة محل هدوم 360", "شماعة طويلة · شماعتين فوق بعض · مربعات للمطبقات · شماعة واجهة، أدراج تحت، وهيدر مصمت — عمق الشماعات 58.", 360, 260, 58,
      hz([25, c("solid", { mat: "accent", depth: 35 })],
        [null, v([90, c("wardrobe", { count: 0, rods: 1 })], [90, c("wardrobe", { count: 0, rods: 2 })], [90, c("open", { shelves: 4, depth: 40 })], [90, c("wardrobe", { count: 0, rods: 2 })])],
        [45, v(...[0, 1, 2, 3].map(() => [90, c("drawers", { count: 1, depth: 50 })]))]),
      { carcass: "wood_oak_natural_v", front: "wood_oak_natural_v", shelf: "wood_oak_natural_v", accent: "hpl_black" }),
    r7_cafe_counter240: free(CO, "كاونتر كافيه 240", "الصورة من ناحية الباريستا: سطح شغل 90 ودواليب: ضلفة · 3 أدراج · مكان ماكينة/تلاجة 60 · ضلفة، وناحية العميل بانوه 110 بسطح بار بارز.", cafeCounter(),
      M({ carcass: "hpl_white", front: "hpl_white", shelf: "hpl_white", accent: "wood_oak_natural_v", table_top: "quartz_white_sparkle", plinth: "hpl_black", drawer_box: "hpl_white" })),
    r7_cafe_backbar300: WC(CO, "باك بار كافيه 300", "تحت: ضلف وأدراج عمق 60 لحد 90 (سطح الشغل كوارتز بيتركب فوقهم)، وفوق: مكان ماكينة القهوة 80 ورفوف مفتوحة بليد للفناجين والمنتجات.", 300, 240, 60,
      v([110, hz([null, c("open", { shelves: 3, led: true, depth: 30 })], [55, c("empty")], [90, c("doors", { count: 2, shelves: 1 })])],
        [80, hz([null, c("open", { shelves: 1, led: true, depth: 30 })], [55, c("device", { dev: "other" })], [90, c("drawers", { count: 3 })])],
        [110, hz([null, c("open", { shelves: 3, led: true, depth: 30 })], [55, c("empty")], [90, c("doors", { count: 2, shelves: 1 })])]),
      { carcass: "hpl_white", front: "hpl_anthracite", shelf: "wood_oak_natural_v", accent: "wood_oak_natural_v" }),
  };
  return { KITCHEN: {}, DRESSING: {}, PANEL, FREE: {}, SMART: {} };
};
