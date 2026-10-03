// Columns / ledges / pipes in the wall (عمود / خلع / ماسورة) — the unit is cut around them.
// Same rules and the same params["obstacles"] list as the plugin's lib/obstacles.rb, so a design sent to
// SketchUp comes out the same:
//   every carcass piece that touches the obstacle + one board thickness (room for the closing panels)
//   is re-drawn as its outline minus the cut (L / U / shorter); a piece fully inside goes; closing
//   panels are added around the obstacle (front face, sides, cap); worktop and plinth are cut to the
//   obstacle itself; labels get the new size and a note with where and how big the cut is.
// Obstacle: { name, from: "left"|"right", x, width, depth (from the back), z (from the unit's bottom), height (empty = to the top) }
// All sizes in cm, unit coordinates: x width, y depth (front y = 0), z height.

const TOL = 0.05;
const r1 = (v) => Math.round(v * 10) / 10;
const fmt = (v) => String(r1(v)).replace(/\.0$/, "");

export function any(params) {
  const l = params?.obstacles;
  return Array.isArray(l) && l.some((o) => o && +o.width > 0 && +o.depth > 0);
}

export function obstacleBox(o, c) {
  const w = +o.width || 0, d = +o.depth || 0;
  if (w <= 0 || d <= 0) return null;
  const x = +o.x || 0;
  const x0 = o.from === "right" ? c.width - x - w : x;
  const z0 = (+o.z || 0) + c.zb;
  const z1 = +o.height > 0 ? z0 + +o.height : c.height + 500;
  const b = { x0: Math.max(x0, 0), x1: Math.min(x0 + w, c.width), y0: Math.max(c.depth - d, 0), y1: c.depth, z0, z1 };
  return b.x1 - b.x0 > TOL && b.y1 - b.y0 > TOL ? b : null;
}

function expanded(b, c) {
  const t = c.t;
  return {
    x0: b.x0 > TOL ? Math.max(b.x0 - t, 0) : b.x0,
    x1: b.x1 < c.width - TOL ? Math.min(b.x1 + t, c.width) : b.x1,
    y0: b.y0 > TOL ? Math.max(b.y0 - t, 0) : b.y0,
    y1: b.y1,
    z0: b.z0 > c.z0 + TOL ? Math.max(b.z0 - t, c.z0) : b.z0,
    z1: b.z1 < c.height - TOL ? Math.min(b.z1 + t, c.height) : b.z1,
  };
}
const overlap = (a, b) => a.x0 < b.x1 - TOL && a.x1 > b.x0 + TOL && a.y0 < b.y1 - TOL && a.y1 > b.y0 + TOL && a.z0 < b.z1 - TOL && a.z1 > b.z0 + TOL;
const inside = (a, b) => a.x0 >= b.x0 - TOL && a.x1 <= b.x1 + TOL && a.y0 >= b.y0 - TOL && a.y1 <= b.y1 + TOL && a.z0 >= b.z0 - TOL && a.z1 <= b.z1 + TOL;
const LO = (b) => [b.x0, b.y0, b.z0], HI = (b) => [b.x1, b.y1, b.z1];

// ------------------------------------------------------------ a board as a 2D outline × thickness
/** a flat board (thin along `axis`) whose outline is its rectangle minus `cuts` (rects in its u/v plane) */
function slabOf(box) {
  const lo = LO(box), hi = HI(box), d = [0, 1, 2].map((i) => hi[i] - lo[i]);
  const axis = d.indexOf(Math.min(...d));
  const [u, v] = [0, 1, 2].filter((i) => i !== axis);
  return { axis, u, v, a0: lo[axis], a1: hi[axis], rect: [lo[u], lo[v], hi[u], hi[v]], cuts: [] };
}
/** the cells left after the cuts on the grid of every cut edge */
function cells(s) {
  const [u0, v0, u1, v1] = s.rect;
  const us = [...new Set([u0, u1, ...s.cuts.flatMap((c) => [c[0], c[2]])].filter((q) => q >= u0 - 1e-9 && q <= u1 + 1e-9))].sort((a, b) => a - b);
  const vs = [...new Set([v0, v1, ...s.cuts.flatMap((c) => [c[1], c[3]])].filter((q) => q >= v0 - 1e-9 && q <= v1 + 1e-9))].sort((a, b) => a - b);
  const keep = [];
  for (let i = 0; i + 1 < us.length; i++) for (let j = 0; j + 1 < vs.length; j++) {
    const cu = (us[i] + us[i + 1]) / 2, cv = (vs[j] + vs[j + 1]) / 2;
    if (us[i + 1] - us[i] < 1e-6 || vs[j + 1] - vs[j] < 1e-6) continue;
    if (!s.cuts.some((c) => cu > c[0] && cu < c[2] && cv > c[1] && cv < c[3])) keep.push([us[i], vs[j], us[i + 1], vs[j + 1]]);
  }
  return keep;
}
/** boundary loops of a set of grid cells (outer loops counter-clockwise, holes clockwise) */
function loops(cs) {
  const key = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
  const edges = new Map();
  const add = (a, b) => {
    const k = key(b) + ">" + key(a);
    if (edges.has(k)) edges.delete(k);
    else edges.set(key(a) + ">" + key(b), [a, b]);
  };
  // split every cell edge at the grid points so neighbouring cells cancel exactly
  const xs = [...new Set(cs.flatMap((c) => [c[0], c[2]]))].sort((a, b) => a - b);
  const ys = [...new Set(cs.flatMap((c) => [c[1], c[3]]))].sort((a, b) => a - b);
  const seg = (a, b) => {
    const pts = [a];
    if (a[1] === b[1]) for (const x of (a[0] < b[0] ? xs : [...xs].reverse())) { if ((x - a[0]) * (x - b[0]) < 0) pts.push([x, a[1]]); }
    else for (const y of (a[1] < b[1] ? ys : [...ys].reverse())) { if ((y - a[1]) * (y - b[1]) < 0) pts.push([a[0], y]); }
    pts.push(b);
    for (let i = 0; i + 1 < pts.length; i++) add(pts[i], pts[i + 1]);
  };
  for (const [a, b, c, d] of cs) { seg([a, b], [c, b]); seg([c, b], [c, d]); seg([c, d], [a, d]); seg([a, d], [a, b]); }
  const from = new Map();
  for (const [k, e] of edges) (from.get(key(e[0])) || from.set(key(e[0]), []).get(key(e[0]))).push(k);
  const out = [];
  const used = new Set();
  for (const [k0] of edges) {
    if (used.has(k0)) continue;
    const loop = [];
    let k = k0;
    while (k && !used.has(k)) {
      used.add(k);
      const [a, b] = edges.get(k);
      loop.push(a);
      const nx = (from.get(key(b)) || []).filter((q) => !used.has(q));
      k = nx[0];
    }
    // drop collinear points
    const clean = loop.filter((p, i) => {
      const a = loop[(i - 1 + loop.length) % loop.length], b = loop[(i + 1) % loop.length];
      return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 1e-9;
    });
    if (clean.length >= 3) out.push(clean);
  }
  return out;
}
const area2 = (l) => l.reduce((s, p, i) => { const q = l[(i + 1) % l.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);

/** faces of a cut board in the mesh format ({n, outer, holes, mat}) */
function slabFaces(s, mat) {
  const cs = cells(s);
  if (!cs.length) return null;
  const ls = loops(cs);
  const outers = ls.filter((l) => area2(l) > 0), holes = ls.filter((l) => area2(l) < 0);
  const P = (p, a) => { const q = [0, 0, 0]; q[s.axis] = a; q[s.u] = p[0]; q[s.v] = p[1]; return q; };
  const N = (k) => { const n = [0, 0, 0]; n[s.axis] = k; return n; };
  const inLoop = (pt, l) => { let c = false; for (let i = 0, j = l.length - 1; i < l.length; j = i++) { const [xi, yi] = l[i], [xj, yj] = l[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const faces = [];
  for (const o of outers) {
    const hs = holes.filter((h) => inLoop(h[0], o));
    for (const [a, k] of [[s.a0, -1], [s.a1, 1]]) faces.push({ n: N(k), outer: o.map((p) => P(p, a)), holes: hs.map((h) => h.map((p) => P(p, a))), mat });
  }
  for (const l of ls) {
    const ccw = area2(l) > 0;
    for (let i = 0; i < l.length; i++) {
      const p = l[i], q = l[(i + 1) % l.length];
      // outward normal of an edge: right of the direction for a ccw loop
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const len = Math.hypot(dx, dy) || 1;
      const n2 = ccw ? [dy / len, -dx / len] : [dy / len, -dx / len];
      const n = [0, 0, 0]; n[s.u] = n2[0]; n[s.v] = n2[1];
      faces.push({ n, outer: [P(p, s.a0), P(q, s.a0), P(q, s.a1), P(p, s.a1)], holes: [], mat });
    }
  }
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const c of cs) { lo[0] = Math.min(lo[0], c[0]); lo[1] = Math.min(lo[1], c[1]); hi[0] = Math.max(hi[0], c[2]); hi[1] = Math.max(hi[1], c[3]); }
  const box = {};
  const b0 = [0, 0, 0], b1 = [0, 0, 0];
  b0[s.axis] = s.a0; b1[s.axis] = s.a1; b0[s.u] = lo[0]; b1[s.u] = hi[0]; b0[s.v] = lo[1]; b1[s.v] = hi[1];
  Object.assign(box, { x0: b0[0], y0: b0[1], z0: b0[2], x1: b1[0], y1: b1[1], z1: b1[2] });
  return { faces, box, pieces: outers.length, notched: outers.length > 1 || cs.length > 1 && (hi[0] - lo[0] > s.rect[2] - s.rect[0] - TOL && hi[1] - lo[1] > s.rect[3] - s.rect[1] - TOL), size: [hi[0] - lo[0], hi[1] - lo[1]] };
}

export function boxFaces(b, mat) {
  const s = slabOf(b);
  return slabFaces(s, mat).faces;
}

// ------------------------------------------------------------ apply to a kitchen engine result
/**
 * res: { meshes, parts, movers } from the kitchen engine (cm). Returns a new { meshes, parts, warnings, report }
 * — the input is left untouched (it is cached).
 */
export function applyKitchen(res, params) {
  if (!any(params)) return null;
  const carc = res.meshes.filter((m) => m.layer === "Kitchen - Carcass");
  const src = carc.length ? carc : res.meshes;
  const bb = src.reduce((a, m) => ({ x1: Math.max(a.x1, m.box.x1), y1: Math.max(a.y1, m.box.y1), z0: Math.min(a.z0, m.box.z0), z1: Math.max(a.z1, m.box.z1) }), { x1: 0, y1: 0, z0: Infinity, z1: 0 });
  const c = { width: bb.x1, depth: bb.y1, height: bb.z1, z0: bb.z0, zb: 0, t: +params.panel_thickness || 1.8 };
  let meshes = res.meshes.map((m) => ({ ...m }));
  let parts = res.parts.map((p) => ({ ...p, label: { ...p.label }, checks: [...(p.checks || [])] }));
  const warnings = [], report = [];
  const slabs = new Map(); // mesh id → slab being cut
  const partOf = (name) => parts.find((p) => p.name === name);
  let added = 0;
  params.obstacles.forEach((o, idx) => {
    const box = obstacleBox(o, c);
    if (!box) return;
    const ebox = expanded(box, c);
    const label = String(o.name || "").trim() || (+o.height > 0 ? "خلع" : "عمود");
    const rep = { obstacle: label, cut: [], removed: [], added: [] };
    for (const m of [...meshes]) {
      const b = m.box;
      const inCarcass = b.z0 >= c.z0 - TOL && b.z1 <= c.height + TOL;
      const cutter = inCarcass ? ebox : box;
      if (!overlap(b, cutter)) continue;
      if (m.mover != null) { const w = `⚠ ${m.name} بيخبط في ${label} — قلّل عمقه أو غيّر مكانه`; if (!warnings.includes(w)) warnings.push(w); continue; }
      if (m.faces.length > 14 && !inside(b, cutter)) continue; // round parts (rails, hole markers) stay as they are
      if (inside(b, cutter)) {
        meshes = meshes.filter((x) => x !== m);
        const p = partOf(m.name);
        if (p && !meshes.some((x) => x.name === m.name)) parts = parts.filter((x) => x !== p);
        rep.removed.push(m.name);
        continue;
      }
      const s = slabs.get(m.id) || slabOf(b);
      const lo = LO(cutter), hi = HI(cutter);
      const cu0 = Math.max(lo[s.u], s.rect[0]), cu1 = Math.min(hi[s.u], s.rect[2]);
      const cv0 = Math.max(lo[s.v], s.rect[1]), cv1 = Math.min(hi[s.v], s.rect[3]);
      if (cu1 - cu0 <= TOL || cv1 - cv0 <= TOL) continue;
      const oldU = s.rect[2] - s.rect[0], oldV = s.rect[3] - s.rect[1];
      const before = slabs.has(m.id) ? cells(s).length : 1;
      s.cuts.push([cu0, cv0, cu1, cv1]);
      const out = slabFaces(s, m.mat);
      if (!out) {
        meshes = meshes.filter((x) => x !== m);
        const p = partOf(m.name);
        if (p) parts = parts.filter((x) => x !== p);
        rep.removed.push(m.name);
        continue;
      }
      if (cells(s).length === before && before === 1 && out.size[0] === oldU && out.size[1] === oldV) { s.cuts.pop(); continue; }
      slabs.set(m.id, s);
      const nm = { ...m, faces: out.faces, box: out.box, cutBy: label };
      meshes = meshes.map((x) => (x === m ? nm : x));
      const p = partOf(m.name);
      if (p) {
        const [nu, nv] = out.size;
        const L = p.label;
        if (Math.abs(L.w - oldU) < 0.3 && Math.abs(L.h - oldV) < 0.3) { L.w = r1(nu); L.h = r1(nv); }
        else if (Math.abs(L.w - oldV) < 0.3 && Math.abs(L.h - oldU) < 0.3) { L.w = r1(nv); L.h = r1(nu); }
        const notched = Math.abs(nu - oldU) < TOL && Math.abs(nv - oldV) < TOL || out.pieces > 1;
        const su = Math.abs(cu0 - s.rect[0]) < TOL ? "من البداية" : Math.abs(cu1 - s.rect[2]) < TOL ? "من النهاية" : `على بعد ${fmt(cu0 - s.rect[0])} من البداية`;
        const sv = Math.abs(cv0 - s.rect[1]) < TOL ? "من تحت/قدام" : Math.abs(cv1 - s.rect[3]) < TOL ? "من فوق/ورا" : `على بعد ${fmt(cv0 - s.rect[1])}`;
        p.checks.push(notched ? `✂ تفريغة ${label} ${fmt(cu1 - cu0)}×${fmt(cv1 - cv0)} سم — ${su}، ${sv}` : `✂ اتقصّت بسبب ${label} (المقاس الأصلي ${fmt(oldU)}×${fmt(oldV)})`);
        p.notch = { ...(p.notch || {}), shape: out.faces };
      }
      rep.cut.push(m.name);
    }
    // closing panels around the obstacle
    const zc0 = Math.max(ebox.z0, c.z0), zc1 = Math.min(ebox.z1, c.height);
    if (zc1 - zc0 > TOL) {
      const suf = idx > 0 ? ` ${idx + 1}` : "";
      const slab = (name, x0, y0, z0, x1, y1, z1) => {
        if (x1 - x0 <= TOL || y1 - y0 <= TOL || z1 - z0 <= TOL) return;
        const b = { x0, y0, z0, x1, y1, z1 };
        meshes.push({ id: `ob${idx}_${added++}`, name, layer: "Kitchen - Carcass", mat: "carcass", door: false, drawer: false, mover: null, faces: boxFaces(b, "carcass"), box: b, wrap: true });
        const dims = [x1 - x0, y1 - y0, z1 - z0].sort((a, q) => a - q);
        parts.push({ id: `kob${idx}_${added}`, name, material: "carcass", cut_piece: true,
          label: { w: r1(dims[2]), h: r1(dims[1]), t: r1(dims[0]), banded: { top: false, bottom: false, left: false, right: false }, groove: null, led: null },
          holes: [], door_label: null, checks: ["لوح تقفيل حوالين العائق"], material_name: null });
        rep.added.push(name);
      };
      const t = c.t;
      if (box.y0 > TOL) slab(`وش قدام ${label}${suf}`, ebox.x0, box.y0 - t, zc0, ebox.x1, box.y0, zc1);
      if (box.x0 > TOL) slab(`جنب ${label} شمال${suf}`, box.x0 - t, box.y0, zc0, box.x0, box.y1, zc1);
      if (box.x1 < c.width - TOL) slab(`جنب ${label} يمين${suf}`, box.x1, box.y0, zc0, box.x1 + t, box.y1, zc1);
      if (box.z1 < c.height - TOL && box.z1 > c.z0) slab(`غطا ${label}${suf}`, box.x0, box.y0, box.z1, box.x1, box.y1, box.z1 + t);
      if (box.z0 > c.z0 + TOL && box.z0 < c.height) slab(`قاعدة ${label}${suf}`, box.x0, box.y0, box.z0 - t, box.x1, box.y1, box.z0);
    }
    report.push(rep);
  });
  return { meshes, parts, warnings, report, ctx: c };
}
