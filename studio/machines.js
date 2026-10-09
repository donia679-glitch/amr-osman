// machines.js — machine / optimiser export formats for NOVERA Studio.
//
// Pure data formatting, no imports, no DOM. Every function takes the neutral
// machining object `op` (all numbers in millimetres, origin bottom-left of the
// piece, X = width, Y = length, Z = thickness) and returns text / entries.
//
// Formats:
//   mpr(op)          HOMAG woodWOP MPR 4.0 program (one piece)
//   bpp(op)          Biesse BiesseWorks BPP program (one piece)
//   cutriteParts()   Cutrite / Magi-Cut part list (CSV)
//   ardisParts()     Ardis Optimizer part list (CSV, semicolon)
//   bandList()       edge-bander list (CSV) + per-material metre summary
//   mprZip()/bppZip() [{name, data}] entries ready for a zip writer
//
// The MPR / BPP writers are best-effort: the macro names and parameter sets
// follow the real formats as closely as known, but the files are meant to be
// opened in woodWOP / BiesseWorks and adjusted there.
//
// All functions are defensive: bad input never throws.

const CRLF = "\r\n";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Parse a finite number from a number or numeric string, else NaN. */
function toNum(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

/** Finite number or fallback. */
const num = (v, d = 0) => {
  const n = toNum(v);
  return Number.isFinite(n) ? n : d;
};

/** Positive finite number or 0. */
const pos = (v) => {
  const n = toNum(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** One-decimal fixed string, never "-0.0". */
function f1(v) {
  const s = (Math.round(num(v) * 10) / 10).toFixed(1);
  return s === "-0.0" ? "0.0" : s;
}

/** Compact dimension for CSV: 720 / 720.5 (no trailing .0). */
const dim = (v) => String(Math.round(num(v) * 10) / 10);

/** Text safe for a one-line quoted value in MPR / BPP (no CR/LF, no double quotes). */
function txt(s) {
  try {
    return String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/"/g, "'").trim();
  } catch {
    return "";
  }
}

/** CSV cell with quoting when needed. */
function csvCell(v, sep = ",") {
  const s = txt0(v);
  return s.includes(sep) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function txt0(v) {
  try {
    return String(v ?? "").replace(/[\r\n]+/g, " ");
  } catch {
    return "";
  }
}

/** Sanitise a file / folder name segment. */
function sanitize(s, fallback = "unnamed") {
  let out = txt0(s)
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/[\x00-\x1f]+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "") // no "..", no trailing dot (Windows)
    .trim();
  return out || fallback;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Clean a polygon: finite points only, drop repeats and closing duplicate; null if < 3 points. */
function cleanLoop(loop) {
  if (!Array.isArray(loop)) return null;
  const out = [];
  for (const p of loop) {
    if (!Array.isArray(p)) continue;
    const x = toNum(p[0]);
    const y = toNum(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const l = out[out.length - 1];
    if (l && Math.abs(l[0] - x) < 1e-6 && Math.abs(l[1] - y) < 1e-6) continue;
    out.push([x, y]);
  }
  if (out.length > 1) {
    const a = out[0];
    const b = out[out.length - 1];
    if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) out.pop();
  }
  return out.length >= 3 ? out : null;
}

function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

/** Signed area (positive = counter-clockwise in a y-up frame). */
function area(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Return the loop oriented counter-clockwise (copy). */
function ccw(pts) {
  return area(pts) < 0 ? pts.slice().reverse() : pts.slice();
}

/** If the loop is an axis-aligned rectangle return [x,y,w,h], else null. */
function asRect(pts) {
  if (pts.length !== 4) return null;
  const b = bbox(pts);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  if (!(w > 0 && h > 0)) return null;
  const eps = 1e-6;
  for (const [x, y] of pts) {
    const onX = Math.abs(x - b.x0) < eps || Math.abs(x - b.x1) < eps;
    const onY = Math.abs(y - b.y0) < eps || Math.abs(y - b.y1) < eps;
    if (!onX || !onY) return null;
  }
  if (Math.abs(Math.abs(area(pts)) - w * h) > 1e-3) return null;
  return [b.x0, b.y0, w, h];
}

// ---------------------------------------------------------------------------
// Input normalisation
// ---------------------------------------------------------------------------

/**
 * Turn an arbitrary `op` into a safe, fully-populated object (or null if it is
 * not an object at all). Never throws.
 */
function norm(op) {
  if (!op || typeof op !== "object") return null;
  try {
    const outline = cleanLoop(op.outline);
    const cutouts = (Array.isArray(op.cutouts) ? op.cutouts : []).map(cleanLoop).filter(Boolean);

    let W = pos(op.W);
    let H = pos(op.H);
    if ((!W || !H) && outline) {
      const b = bbox(outline);
      if (!W) W = b.x1 - b.x0;
      if (!H) H = b.y1 - b.y0;
    }
    const T = pos(op.T) || 18;

    const drills = [];
    for (const d of Array.isArray(op.drills) ? op.drills : []) {
      if (!d || typeof d !== "object") continue;
      const x = toNum(d.x);
      const y = toNum(d.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const kind = typeof d.kind === "string" ? d.kind : "sys";
      const dia = pos(d.d) || (kind === "cup" ? 35 : 8);
      drills.push({ x, y, d: dia, z: Math.max(0, num(d.z, 12)), kind });
    }

    const hdrills = []; // edge (horizontal) bores: face left|right|bottom|top, the point on that edge, zc = height from the face
    for (const d of Array.isArray(op.hdrills) ? op.hdrills : []) {
      if (!d || typeof d !== "object" || !["left", "right", "bottom", "top"].includes(d.face)) continue;
      const x = toNum(d.x), y = toNum(d.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      hdrills.push({ face: d.face, x, y, zc: num(d.zc, T / 2), d: pos(d.d) || 8, z: Math.max(0, num(d.z, 32)), kind: typeof d.kind === "string" ? d.kind : "sys" });
    }

    const grooves = [];
    for (const g of Array.isArray(op.grooves) ? op.grooves : []) {
      if (!g || typeof g !== "object") continue;
      const x = toNum(g.x), y = toNum(g.y), w = toNum(g.w), h = toNum(g.h);
      if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) continue;
      grooves.push({ x, y, w, h, z: Math.max(0, num(g.z, 8)) });
    }

    const pockets = []; // each: {rect:[x,y,w,h]} or {loop:[...]}, plus z, face
    for (const p of Array.isArray(op.pockets) ? op.pockets : []) {
      if (!p || typeof p !== "object") continue;
      const z = Math.max(0, num(p.z, 6));
      const face = p.face === "back" ? "back" : "front";
      if (Array.isArray(p.rect)) {
        const [x, y, w, h] = p.rect.map(toNum);
        if ([x, y, w, h].every(Number.isFinite) && w > 0 && h > 0) pockets.push({ rect: [x, y, w, h], z, face });
        continue;
      }
      const loop = cleanLoop(p.loop);
      if (!loop) continue;
      const r = asRect(loop);
      pockets.push(r ? { rect: r, z, face } : { loop, z, face });
    }

    const b = op.banded && typeof op.banded === "object" ? op.banded : {};
    const all = op.bandAll === true;
    const edges = {
      left: all || b.left === true,
      right: all || b.right === true,
      top: all || b.top === true,
      bottom: all || b.bottom === true,
    };

    return {
      key: txt0(op.key),
      unit: txt0(op.unit),
      name: txt0(op.name),
      mat: txt0(op.mat),
      W, H, T,
      outline, cutouts, pockets, drills, hdrills, grooves,
      note: txt0(op.note),
      edges,
      grain: op.grain === true,
    };
  } catch {
    return null;
  }
}

/** Normalise a list; non-array -> []; non-object entries skipped. */
function normList(ops) {
  if (!Array.isArray(ops)) return [];
  const out = [];
  for (const op of ops) {
    const o = norm(op);
    if (o) out.push(o);
  }
  return out;
}

// ---------------------------------------------------------------------------
// HOMAG woodWOP MPR 4.0
// ---------------------------------------------------------------------------

// Macro ids as requested by the app spec. (Check in woodWOP: if your version
// numbers them differently, only these constants need changing.)
// woodWOP macro numbers: 100 WerkStck · 102 BohrVert · 103 BohrHoriz · 105 Konturfraesen · 109 Nut · 112 Tasche
const MPR_ID = { piece: 100, drill: 102, hdrill: 103, contour: 105, groove: 109, pocket: 112 };

/** `<100 \BohrVert\` + parameter lines + blank line. */
function mprMacro(id, name, params) {
  const lines = [`<${id} \\${name}\\`];
  for (const [k, v] of params) lines.push(`${k}="${v}"`);
  lines.push("");
  return lines.join(CRLF);
}

/** Contour block `]n` with `$E0` KP start point and `$E1..` KL line elements (closed). */
function mprContour(n, pts) {
  const lines = [`]${n}`];
  const pt = (i, type, p) => {
    lines.push(`$E${i}`, type, `X=${f1(p[0])}`, `Y=${f1(p[1])}`, "Z=0.0", "KO=00");
  };
  pt(0, "KP ", pts[0]);
  for (let i = 1; i < pts.length; i++) pt(i, "KL ", pts[i]);
  pt(pts.length, "KL ", pts[0]); // close the loop
  lines.push("");
  return { text: lines.join(CRLF), elements: pts.length };
}

function buildMpr(o) {
  const B = o.W; // woodWOP: L along X (our length H), B along Y (our width W)
  const L = o.H;
  const D = o.T;
  // Rotate 90 deg clockwise (handedness preserved): piece (x, y) -> woodWOP (y, W - x).
  const tx = (x, y) => [y, B - x];

  const out = [];
  const push = (s) => out.push(s);

  // [H header
  push("[H");
  for (const [k, v] of [
    ["VERSION", "4.0"], ["OP", "1"], ["HP", "1"], ["IN", "1"], ["GX", "0"], ["BS", "0"],
    ["GY", "0"], ["GXY", "0"], ["UP", "0"], ["FM", "1"], ["FW", "0"], ["HS", "0"],
    ["OSZI", "0"], ["GRAD", "0"], ["FNX", "0"], ["FNY", "0"], ["ZBX", "0"], ["ZBY", "0"],
    ["WRK2", "1"],
  ]) push(`${k}="${v}"`);
  push(`KM="Piece: ${txt(o.key)}"`);
  push(`KM="Unit: ${txt(o.unit)}"`);
  push(`KM="Part: ${txt(o.name)}"`);
  push(`KM="Material: ${txt(o.mat)}"`);
  if (o.note) push(`KM="Note: ${txt(o.note)}"`);
  push("");

  // [001 variables
  push("[001");
  push(`L="${f1(L)}"`);
  push('KM="Length"');
  push(`B="${f1(B)}"`);
  push('KM="Width"');
  push(`D="${f1(D)}"`);
  push('KM="Thickness"');
  push("");


  // Contours (outline, cutouts, non-rectangular pockets) first, macros afterwards.
  const contours = []; // {text, elements}
  const addContour = (pts) => {
    const pp = ccw(pts.map(([x, y]) => tx(x, y)));
    contours.push(mprContour(contours.length + 1, pp));
    return contours.length;
  };
  const through = D + 0.5;

  const pocketLoops = [];
  for (const p of o.pockets) {
    if (p.loop) {
      const n = addContour(p.loop);
      pocketLoops.push({ n, depth: p.z, face: p.face });
    }
  }
  const cutN = o.cutouts.map((c) => addContour(c));
  const outN = o.outline ? addContour(o.outline) : 0;
  for (const c of contours) push(c.text);
  // the workpiece itself (raw size = finished size, no overhang) — after the contour blocks, before the operations
  push(mprMacro(MPR_ID.piece, "WerkStck", [["LA", "L"], ["BR", "B"], ["DI", "D"], ["FNX", "0"], ["FNY", "0"], ["AX", "0"], ["AY", "0"]]));

  // Vertical drilling
  for (const d of o.drills) {
    const [xa, ya] = tx(d.x, d.y);
    push(mprMacro(MPR_ID.drill, "BohrVert", [
      ["XA", f1(xa)], ["YA", f1(ya)], ["BM", "LS"], ["TI", f1(d.z)], ["DU", f1(d.d)],
      ["AN", "1"], ["MI", "0"], ["S_", "1"], ["AB", "32"], ["ZT", "0"],
      ["KM", txt(d.kind)], ["KO", "00"],
    ]));
  }

  // Horizontal (edge) drilling — the bore direction turns with the piece: left edge → −Y, right → +Y, bottom → +X, top → −X
  for (const d of o.hdrills) {
    const [xa, ya] = tx(d.x, d.y);
    const bm = { left: "YM", right: "YP", bottom: "XP", top: "XM" }[d.face];
    push(mprMacro(MPR_ID.hdrill, "BohrHoriz", [
      ["XA", f1(xa)], ["YA", f1(ya)], ["ZA", f1(d.zc)], ["BM", bm], ["TI", f1(d.z)], ["DU", f1(d.d)],
      ["AN", "1"], ["MI", "0"], ["AB", "32"], ["KM", txt(`${d.kind} edge ${d.face}`)], ["KO", "00"],
    ]));
  }

  // Grooves (dado): milled along the centre line, width = the thin side
  for (const g of o.grooves) {
    const horiz = g.w >= g.h; // runs along piece X
    const [x1, y1] = horiz ? [g.x, g.y + g.h / 2] : [g.x + g.w / 2, g.y];
    const [x2, y2] = horiz ? [g.x + g.w, g.y + g.h / 2] : [g.x + g.w / 2, g.y + g.h];
    const [xa, ya] = tx(x1, y1);
    const [xe, ye] = tx(x2, y2);
    push(mprMacro(MPR_ID.groove, "Nut", [
      ["XA", f1(xa)], ["YA", f1(ya)], ["XE", f1(xe)], ["YE", f1(ye)],
      ["TI", f1(g.z)], ["NB", f1(horiz ? g.h : g.w)], ["RK", "NOWRK"], ["KO", "00"],
    ]));
  }

  // Rectangular pockets
  for (const p of o.pockets) {
    if (!p.rect) continue;
    const [x, y, w, h] = p.rect;
    const a = tx(x, y);
    const b = tx(x + w, y + h);
    const params = [
      ["XA", f1(Math.min(a[0], b[0]))], ["YA", f1(Math.min(a[1], b[1]))],
      ["XE", f1(Math.max(a[0], b[0]))], ["YE", f1(Math.max(a[1], b[1]))],
      ["TI", f1(p.z)],
    ];
    if (p.face === "back") params.push(["KM", "BACK FACE - flip piece"]);
    params.push(["KO", "00"]);
    push(mprMacro(MPR_ID.pocket, "Tasche", params));
  }

  // Contour milling macro
  const contourMacro = (n, rk, depth, comment) => {
    const els = contours[n - 1].elements;
    const params = [
      ["EA", `${n}:1`], ["EE", `${n}:${els + 1}`], ["MDA", "SEQ"], ["RK", rk],
      ["TI", f1(depth)],
    ];
    if (comment) params.push(["KM", comment]);
    params.push(["KO", "00"]);
    return mprMacro(MPR_ID.contour, "Konturfraesen", params);
  };

  // Free-form pockets: contour trace only (no clearing)
  for (const p of pocketLoops) {
    push(contourMacro(p.n, "WRKL", p.depth, `free-form pocket (trace only)${p.face === "back" ? " BACK FACE" : ""}`));
  }
  // Through cut-outs: tool inside the hole (left of a CCW path)
  for (const n of cutN) push(contourMacro(n, "WRKL", through, "cut-out"));
  // Outer shape last: tool outside (right of a CCW path)
  if (outN) push(contourMacro(outN, "WRKR", through, "outline"));

  push("!");
  push("");
  return out.join(CRLF);
}

/** HOMAG woodWOP MPR 4.0 program for one piece. */
export function mpr(op) {
  try {
    return buildMpr(norm(op) || norm({}));
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Biesse BPP (BiesseWorks ASCII)
// ---------------------------------------------------------------------------

const q = (s) => `"${txt(s)}"`;

function bppRout(label, side, depth, dia, crc, pts, closed) {
  const rows = [
    `@ ROUT, ${q(label)}, "", SIDE=${side}, CRN="1", DP=${f1(depth)}, DIA=${f1(dia)}, CRC=${crc}`,
    `@ START_POINT, "", "", X=${f1(pts[0][0])}, Y=${f1(pts[0][1])}`,
  ];
  for (let i = 1; i < pts.length; i++) {
    rows.push(`@ LINE_EP, "", "", X=${f1(pts[i][0])}, Y=${f1(pts[i][1])}`);
  }
  if (closed) rows.push(`@ LINE_EP, "", "", X=${f1(pts[0][0])}, Y=${f1(pts[0][1])}`);
  rows.push('@ ENDPATH, "", ""');
  return rows;
}

function buildBpp(o) {
  const out = [];
  const push = (s) => out.push(s);
  const through = o.T + 0.5;
  // Biesse routing side: 0 = top face, 5 = bottom face (back).
  const sideOf = (face) => (face === "back" ? 5 : 0);

  push("[HEADER]");
  push("TYPE=BPP");
  push("VER=150");
  push("");
  push("[DESCRIPTION]");
  push(`Piece: ${txt(o.key)}`);
  push(`Unit: ${txt(o.unit)}`);
  push(`Part: ${txt(o.name)}`);
  push(`Material: ${txt(o.mat)}`);
  if (o.note) push(`Note: ${txt(o.note)}`);
  push("");
  push("[VARIABLES]");
  push(`PAN=LPX|${f1(o.W)}|||4|`);
  push(`PAN=LPY|${f1(o.H)}|||4|`);
  push(`PAN=LPZ|${f1(o.T)}|||4|`);
  push("");
  push("[PROGRAM]");

  // Vertical bores
  for (const d of o.drills) {
    push(`@ BV, ${q(d.kind)}, "", SIDE=0, CRN="1", X=${f1(d.x)}, Y=${f1(d.y)}, DP=${f1(d.z)}, DIA=${f1(d.d)}`);
  }

  // Horizontal bores into the edges: SIDE 1 = front edge (Y=0), 2 = right (X=LPX), 3 = back (Y=LPY), 4 = left (X=0)
  for (const d of o.hdrills) {
    const side = { bottom: 1, right: 2, top: 3, left: 4 }[d.face];
    push(`@ BH, ${q(d.kind)}, "", SIDE=${side}, CRN="1", X=${f1(d.x)}, Y=${f1(d.y)}, Z=${f1(d.zc)}, DP=${f1(d.z)}, DIA=${f1(d.d)}`);
  }

  // Grooves: centre-line pass with a tool as wide as the groove
  for (const g of o.grooves) {
    const horiz = g.w >= g.h;
    const pts = horiz
      ? [[g.x, g.y + g.h / 2], [g.x + g.w, g.y + g.h / 2]]
      : [[g.x + g.w / 2, g.y], [g.x + g.w / 2, g.y + g.h]];
    out.push(...bppRout("groove", 0, g.z, horiz ? g.h : g.w, 0, pts, false));
  }

  // Pockets: boundary path (tool inside, CCW + left compensation). No clearing passes.
  for (const p of o.pockets) {
    const loop = p.rect
      ? [[p.rect[0], p.rect[1]], [p.rect[0] + p.rect[2], p.rect[1]],
         [p.rect[0] + p.rect[2], p.rect[1] + p.rect[3]], [p.rect[0], p.rect[1] + p.rect[3]]]
      : p.loop;
    out.push(...bppRout("pocket", sideOf(p.face), p.z, 12, 1, ccw(loop), true));
  }

  // Through cut-outs: tool inside the hole
  for (const c of o.cutouts) out.push(...bppRout("cutout", 0, through, 12, 1, ccw(c), true));

  // Outer shape last: tool outside
  if (o.outline) out.push(...bppRout("outline", 0, through, 12, 2, ccw(o.outline), true));

  push("");
  return out.join(CRLF);
}

/** Biesse BPP program for one piece. */
export function bpp(op) {
  try {
    return buildBpp(norm(op) || norm({}));
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Part lists (Cutrite / Ardis)
// ---------------------------------------------------------------------------

/** Group identical parts (same mat, W, H, grain, edges) keeping first-seen order. */
function groupParts(list) {
  const map = new Map();
  for (const o of list) {
    const e = o.edges;
    const id = [o.mat, dim(o.W), dim(o.H), o.grain ? 1 : 0, +e.left, +e.right, +e.top, +e.bottom].join("|");
    let g = map.get(id);
    if (!g) {
      g = { o, keys: [], qty: 0 };
      map.set(id, g);
    }
    g.qty++;
    if (o.key) g.keys.push(o.key);
  }
  return [...map.values()];
}

const yn = (b) => (b ? "Y" : "N");

/** Cutrite / Magi-Cut part list CSV (CRLF; the caller adds the BOM). */
export function cutriteParts(ops, opts) {
  try {
    const project = txt0(opts && typeof opts === "object" ? opts.projectName : "").trim();
    const rows = [["Part code", "Description", "Material", "Length", "Width", "Quantity", "Grain", "Edge L1", "Edge L2", "Edge W1", "Edge W2"]];
    groupParts(normList(ops)).forEach((g, i) => {
      const o = g.o;
      const keys = g.keys.join(" ");
      rows.push([
        g.keys[0] || `P${i + 1}`,
        project ? `${project} | ${keys}` : keys,
        o.mat,
        dim(o.H),
        dim(o.W),
        g.qty,
        yn(o.grain),
        yn(o.edges.left),
        yn(o.edges.right),
        yn(o.edges.top),
        yn(o.edges.bottom),
      ]);
    });
    return rows.map((r) => r.map((c) => csvCell(c, ",")).join(",")).join(CRLF) + CRLF;
  } catch {
    return "";
  }
}

/** Ardis Optimizer part list CSV (semicolon separated, CRLF). */
export function ardisParts(ops) {
  try {
    const rows = [["Code", "Material", "Length", "Width", "Quantity", "Grain", "Description"]];
    groupParts(normList(ops)).forEach((g, i) => {
      const o = g.o;
      rows.push([g.keys[0] || `P${i + 1}`, o.mat, dim(o.H), dim(o.W), g.qty, yn(o.grain), g.keys.join(" ")]);
    });
    return rows.map((r) => r.map((c) => csvCell(c, ";")).join(";")).join(CRLF) + CRLF;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Edge-bander list
// ---------------------------------------------------------------------------

/** One row per banded edge (left, right, top, bottom per piece) + per-material metre totals. */
export function bandList(ops) {
  try {
    const rows = [["Piece", "Part", "Material", "Edge", "Length mm", "Thickness mm"]];
    const totals = new Map(); // material -> mm
    for (const o of normList(ops)) {
      for (const edge of ["left", "right", "top", "bottom"]) {
        if (!o.edges[edge]) continue;
        const len = edge === "left" || edge === "right" ? o.H : o.W;
        rows.push([o.key, o.name, o.mat, edge, dim(len), dim(o.T)]);
        totals.set(o.mat, (totals.get(o.mat) || 0) + len);
      }
    }
    const lines = rows.map((r) => r.map((c) => csvCell(c, ",")).join(","));
    lines.push("");
    lines.push("Material,Total m");
    for (const [m, mm] of totals) lines.push(`${csvCell(m, ",")},${(mm / 1000).toFixed(2)}`);
    return lines.join(CRLF) + CRLF;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Zip entries
// ---------------------------------------------------------------------------

function zipEntries(ops, ext, make) {
  const out = [];
  try {
    const used = new Set();
    for (const o of normList(ops)) {
      let data;
      try {
        data = make(o);
      } catch {
        continue;
      }
      const folder = sanitize(o.mat, "no-material");
      const base = sanitize(o.key, "piece");
      let name = `${folder}/${base}.${ext}`;
      for (let n = 2; used.has(name.toLowerCase()); n++) name = `${folder}/${base}_${n}.${ext}`;
      used.add(name.toLowerCase());
      out.push({ name, data });
    }
  } catch {
    /* return what we have */
  }
  return out;
}

/** One `.mpr` per piece, named `<material>/<key>.mpr`. */
export function mprZip(ops) {
  return zipEntries(ops, "mpr", buildMpr);
}

/** One `.bpp` per piece, named `<material>/<key>.bpp`. */
export function bppZip(ops) {
  return zipEntries(ops, "bpp", buildBpp);
}

// ---------------------------------------------------------------------------
// UI list
// ---------------------------------------------------------------------------

/** [id, label, description] for the export picker (Egyptian Arabic descriptions). */
export const MACHINE_FORMATS = [
  ["mpr", "HOMAG woodWOP (MPR)", "ملف برنامج لكل قطعة لماكينات HOMAG — تخريم وجروف وقطع مشكّل (ملف .mpr جوه zip)"],
  ["bpp", "Biesse (BPP)", "ملف برنامج لكل قطعة لماكينات Biesse (BiesseWorks) — تخريم وفريزة (ملف .bpp جوه zip)"],
  ["cutrite", "Cutrite / Magi-Cut (CSV)", "قايمة القطع لمقص Cutrite أو Magi-Cut: الطول والعرض والكمية واتجاه العرق والشريط"],
  ["ardis", "Ardis (CSV)", "قايمة القطع لبرنامج Ardis Optimizer بنفس التجميع (قطع متشابهة في صف واحد)"],
  ["band", "قايمة ماكينة الشريط (CSV)", "كل حرف متشرّط بطوله وسُمك اللوح، وفي الآخر إجمالي الأمتار لكل خامة"],
];
