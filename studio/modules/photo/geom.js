// «📷 صورة ← مطبخ» — pure maths (no DOM): perspective (homography), width fitting, colour matching.
// The base row's front is a flat rectangle in the photo's 3D world: floor line (v = 0) up to the counter top
// (v = 1 → 90 cm). Its 4 corners tapped on the photo give a homography H: (u, v) in the unit square → image px.
// Any tap on that front (a joint between two units, a wall unit above it — same wall plane) goes back through
// H⁻¹ to u = how far along the run it is (0…1), whatever the perspective. The real length comes from what the
// owner types; when he types nothing it is estimated from the counter height (90) and a guessed focal length.

/** unit square → quad (p0 floor-left, p1 floor-right, p2 counter-right, p3 counter-left), Heckbert's closed form */
export function homography(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, c, d, e, f, g, h;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    a = x1 - x0; b = x2 - x1; c = x0; d = y1 - y0; e = y2 - y1; f = y0; g = 0; h = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(den) < 1e-9) return null;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
    a = x1 - x0 + g * x1; b = x3 - x0 + h * x3; c = x0;
    d = y1 - y0 + g * y1; e = y3 - y0 + h * y3; f = y0;
  }
  return [a, b, c, d, e, f, g, h, 1];
}
export function apply(H, u, v) {
  const w = H[6] * u + H[7] * v + H[8];
  return [(H[0] * u + H[1] * v + H[2]) / w, (H[3] * u + H[4] * v + H[5]) / w];
}
export function invert(H) {
  const [a, b, c, d, e, f, g, h, i] = H;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
/** image point → (u, v) on the base-row front */
export function toUV(Hi, x, y) { return apply(Hi, x, y); }
/** a quad is usable when it is convex and not tiny */
export function quadOk(q) {
  if (!q || q.length !== 4) return false;
  let sgn = 0;
  for (let i = 0; i < 4; i++) {
    const p = q[i], a = q[(i + 1) % 4], b = q[(i + 2) % 4];
    const cr = (a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0]);
    if (Math.abs(cr) < 1e-6) return false;
    if (!sgn) sgn = Math.sign(cr); else if (Math.sign(cr) !== sgn) return false;
  }
  return Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) > 8 && Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]) > 4;
}
/**
 * the run's real length estimated from its known height (90 cm floor → counter top). The plane's two axes
 * through K⁻¹ must be perpendicular (gives the focal length when the run is seen at an angle) and their lengths'
 * ratio is length / height. imgW/imgH: the picture's size (principal point in the middle).
 */
export function estimateLength(q, imgW, imgH, height = 90, fKnown = null) {
  const H = homography(q);
  if (!H) return null;
  const cx = imgW / 2, cy = imgH / 2;
  const [a, b, , d, e, , g, h] = H;
  const h1 = [a - cx * g, d - cy * g, g], h2 = [b - cx * h, e - cy * h, h];
  let f2 = Math.abs(g * h) > 1e-12 ? -(h1[0] * h2[0] + h1[1] * h2[1]) / (g * h) : NaN;
  const long = Math.max(imgW, imgH);
  if (fKnown > 0) f2 = fKnown * fKnown;
  else if (!(f2 > (0.45 * long) ** 2 && f2 < (3.5 * long) ** 2)) f2 = (0.9 * long) ** 2; // a phone's usual lens (≈ 26 mm)
  const f = Math.sqrt(f2);
  const n1 = Math.hypot(h1[0] / f, h1[1] / f, h1[2]), n2 = Math.hypot(h2[0] / f, h2[1] / f, h2[2]);
  if (!(n2 > 0)) return null;
  return { len: height * (n1 / n2), f };
}

// ------------------------------------------------------------------ widths → the factory's sizes
export const STEP = 5;
/** appliance slots have standard sizes; the rest follow the factory's 5 cm steps */
export const STD = { sink: [60, 80, 90, 100, 120], hob: [60, 90], fridge: [75, 90, 95], dish: [45, 60], oven: [60], toven: [60], micro: [60] };
export const MINW = { drawers: 30, doors: 20, open: 15, glass: 30, pantry: 30, flip: 40, hood: 60 };
const snap5 = (w) => Math.max(STEP, Math.round(w / STEP) * STEP);
export function snapOne(t, w) {
  const s = STD[t];
  if (s) return s.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), s[0]);
  return Math.max(MINW[t] || 20, snap5(w));
}
/**
 * fit a row (left → right) into `total` cm: appliances on their standard size, the others on 5 cm steps, then the
 * difference shared out 5 cm at a time over the units that are furthest from what the photo showed. Units wider
 * than `maxW` are split. Returns { items:[{t, w, w0, src}], left } — `left` = what is left at the end (< 5 cm,
 * or more when nothing could take it).
 */
export function fitRow(list, total, { maxW = 100, fixed = (t) => !!STD[t] } = {}) {
  const items = list.map((x, i) => ({ ...x, w0: +x.w || 0, w: snapOne(x.t, +x.w || 0), src: i }));
  if (!items.length) return { items, left: total };
  let R = total - items.reduce((s, x) => s + x.w, 0);
  // too long even with nothing flexible left: appliances step down to a smaller standard size
  const flex = () => items.filter((x) => !fixed(x.t));
  for (let guard = 0; guard < 400 && Math.abs(R) >= STEP; guard++) {
    const sg = Math.sign(R);
    const cand = flex().filter((x) => (sg > 0 ? x.w + STEP <= 200 : x.w - STEP >= (MINW[x.t] || 20)));
    if (!cand.length) break;
    // the one that lost most against the photo when growing (or gained most when shrinking); wider first on ties
    cand.sort((a, b) => sg * (b.w0 - b.w) - sg * (a.w0 - a.w) || b.w - a.w);
    cand[0].w += sg * STEP;
    R -= sg * STEP;
  }
  if (R <= -STEP) { // still too long: appliances one standard size down, then drop the last flexible unit
    for (const x of items.filter((y) => fixed(y.t)).sort((a, b) => b.w - a.w)) {
      const s = STD[x.t] || [];
      const smaller = s.filter((v) => v < x.w).pop();
      if (smaller != null && R < 0) { R += x.w - smaller; x.w = smaller; }
    }
    while (R < 0 && items.length) { const x = items.pop(); R += x.w; }
  }
  // split wide flexible units (a door unit wider than ~100 is two units in the workshop)
  const out = [];
  for (const x of items) {
    if (fixed(x.t) || x.w <= maxW) { out.push(x); continue; }
    const n = Math.ceil(x.w / 90), base = Math.floor(x.w / n / STEP) * STEP;
    let rest = x.w;
    for (let k = 0; k < n; k++) { const w = k === n - 1 ? rest : base; out.push({ ...x, w, w0: (x.w0 * w) / x.w }); rest -= w; }
  }
  return { items: out, left: Math.round(R * 10) / 10 };
}

// ------------------------------------------------------------------ colours → the catalogue
export function hexRgb(h) {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(h || "").trim());
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
export const rgbHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export function lab([r, g, b]) {
  const lin = (v) => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
/** catalogue codes a slot may take, in the catalogue's order */
export function candidates(LIB, slot) {
  const keys = Object.keys(LIB);
  const is = (re) => keys.filter((k) => re.test(k));
  if (slot === "counter") return [...is(/^(marble|quartz|terrazzo|concrete)/), ...is(/^wood_[a-z_]+$/).filter((k) => !k.endsWith("_v")), "hpl_white", "hpl_black", "hpl_anthracite"];
  if (slot === "carcass") return [...is(/^hpl_/), ...is(/^wood_/).filter((k) => !k.endsWith("_v"))];
  return [...is(/^hpl_/), ...is(/^acrylic_/), ...is(/^wood_.*_v$/)]; // fronts: wood with the grain standing up
}
/** the nearest catalogue material to a colour (lightness counts half: photos are lit unevenly) */
export function nearestLib(LIB, slot, hex) {
  const c = hexRgb(hex);
  if (!c) return null;
  const L = lab(c);
  let best = null, bd = Infinity;
  for (const k of candidates(LIB, slot)) {
    const m = hexRgb(LIB[k]?.[2]);
    if (!m) continue;
    const M = lab(m);
    const dd = ((L[0] - M[0]) / 2) ** 2 + (L[1] - M[1]) ** 2 + (L[2] - M[2]) ** 2;
    if (dd < bd) { bd = dd; best = k; }
  }
  return best;
}
/** the average colour of a square around (x, y) of an ImageData-like {data, width, height}, the brightest / darkest 15 % left out */
export function sampleAvg(img, x, y, r = 6) {
  const px = [];
  for (let j = Math.max(0, Math.round(y - r)); j <= Math.min(img.height - 1, Math.round(y + r)); j++)
    for (let i = Math.max(0, Math.round(x - r)); i <= Math.min(img.width - 1, Math.round(x + r)); i++) {
      const o = (j * img.width + i) * 4;
      px.push([img.data[o], img.data[o + 1], img.data[o + 2]]);
    }
  if (!px.length) return null;
  px.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const cut = Math.floor(px.length * 0.15), use = px.slice(cut, px.length - cut || px.length);
  const s = use.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
  return rgbHex(s.map((v) => v / use.length));
}

/**
 * the same (u, v) frame on a plane parallel to the base front, `back` cm further from the camera — the wall units'
 * fronts stand ~23 cm behind the base fronts (58 vs 35 deep). Uses the run's length L and the camera estimated from
 * the quad (focal length, principal point in the middle). Falls back to the base plane when the pose can't be found.
 */
export function shifted(q, L, imgW, imgH, back, fKnown = null) {
  const H = homography(q);
  if (!H || !back) return H;
  const e = estimateLength(q, imgW, imgH, 90, fKnown);
  if (!e || !(L > 0)) return H;
  const f = e.f, cx = imgW / 2, cy = imgH / 2;
  const Ki = (x, y, z) => [(x - cx * z) / f, (y - cy * z) / f, z];
  // columns of H for metric (X cm, Y cm): H · diag(1/L, 1/90, 1)
  const c1 = Ki(H[0] / L, H[3] / L, H[6] / L), c2 = Ki(H[1] / 90, H[4] / 90, H[7] / 90), c3 = Ki(H[2], H[5], H[8]);
  const n1 = Math.hypot(...c1), n2 = Math.hypot(...c2);
  if (!(n1 > 0 && n2 > 0)) return H;
  let s = (n1 + n2) / 2;
  if (c3[2] / s < 0) s = -s;
  const r1 = c1.map((v) => v / s), r2 = c2.map((v) => v / s), t = c3.map((v) => v / s);
  let n = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
  const nl = Math.hypot(...n) || 1; n = n.map((v) => v / nl);
  if (n[0] * t[0] + n[1] * t[1] + n[2] * t[2] > 0) n = n.map((v) => -v); // n points at the camera
  const t2 = [t[0] - back * n[0], t[1] - back * n[1], t[2] - back * n[2]];
  const K = (v) => [f * v[0] + cx * v[2], f * v[1] + cy * v[2], v[2]];
  const a = K(r1.map((v) => v * L)), b = K(r2.map((v) => v * 90)), c = K(t2);
  const k = c[2] || 1;
  return [a[0] / k, b[0] / k, c[0] / k, a[1] / k, b[1] / k, c[1] / k, a[2] / k, b[2] / k, 1];
}

/** where a wall's floor line and counter line meet (its horizontal vanishing point), null when they are parallel */
export function vanish(q) {
  const l1 = cross([...q[0], 1], [...q[1], 1]), l2 = cross([...q[3], 1], [...q[2], 1]);
  const v = cross(l1, l2);
  if (Math.abs(v[2]) < 1e-9) return null;
  const p = [v[0] / v[2], v[1] / v[2]];
  return Math.hypot(...p) > 1e6 ? null : p;
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** two walls at right angles (an L / U) give the camera's focal length: their vanishing directions are perpendicular */
export function focalFromWalls(qs, imgW, imgH) {
  const cx = imgW / 2, cy = imgH / 2, long = Math.max(imgW, imgH), out = [];
  for (let i = 0; i + 1 < qs.length; i++) {
    if (!quadOk(qs[i]) || !quadOk(qs[i + 1])) continue;
    const a = vanish(qs[i]), b = vanish(qs[i + 1]);
    if (!a || !b) continue;
    const f2 = -((a[0] - cx) * (b[0] - cx) + (a[1] - cy) * (b[1] - cy));
    if (f2 > (0.3 * long) ** 2 && f2 < (4 * long) ** 2) out.push(Math.sqrt(f2));
  }
  return out.length ? out.reduce((x, y) => x + y, 0) / out.length : null;
}
