// Materials made from photos (the user's own boards, stones, fabrics) and the textures the 3D view
// paints with: photo textures, and drawn wood / stone grain for the catalogue materials in render mode.
import * as Catalog from "./engine/panel/catalog.js";

export const KINDS = { wood: "خشب / HPL خشبي", stone: "رخام / حجر", solid: "لون سادة", fabric: "قماش / جلد", metal: "معدن", other: "تاني" };
export const DEFAULT = { tile: 60, rot: 0, bright: 0, gloss: 30, kind: "wood" };
const registry = new Map();

/** make a custom material known everywhere a catalogue key is (colour, name, cut list) */
export function register(m) {
  if (!m?.id) return;
  registry.set(m.id, m);
  Catalog.LIB[m.id] = [m.name || "خامة", "", m.avg || "#bbbbbb", 1];
}
export const get = (key) => registry.get(key) || null;
export const isCustom = (key) => typeof key === "string" && key.startsWith("c_");
export const all = () => [...registry.values()];

/** photo file → square JPEG (max 640 px) + its average colour */
export function fromFile(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const n = Math.min(640, s);
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const g = c.getContext("2d");
      g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, n, n);
      const d = g.getImageData(0, 0, n, n).data;
      let r = 0, gg = 0, b = 0, k = 0;
      for (let i = 0; i < d.length; i += 16) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; k++; }
      const hex = "#" + [r, gg, b].map((v) => Math.round(v / k).toString(16).padStart(2, "0")).join("");
      URL.revokeObjectURL(url);
      res({ img: c.toDataURL("image/jpeg", 0.82), avg: hex });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("الصورة مش بتتفتح")); };
    img.src = url;
  });
}

// ------------------------------------------------------------------ drawn textures (no photo)
const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const shade = (hex, f) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${c.join(",")})`;
};
/** wood grain along the canvas height (vertical) */
export function woodCanvas(hex, seed = 7) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d"), R = rnd(seed);
  g.fillStyle = hex; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 140; i++) {
    const x = R() * 512, w = 0.6 + R() * 2.6, f = 0.82 + R() * 0.26;
    g.strokeStyle = shade(hex, f); g.globalAlpha = 0.25 + R() * 0.35; g.lineWidth = w;
    g.beginPath();
    let xx = x;
    g.moveTo(xx, 0);
    for (let y = 0; y <= 512; y += 32) { xx += (R() - 0.5) * 5; g.lineTo(xx, y); }
    g.stroke();
  }
  for (let i = 0; i < 6; i++) { // knots / cathedral arcs
    const x = R() * 512, y = R() * 512;
    g.strokeStyle = shade(hex, 0.8); g.globalAlpha = 0.18;
    for (let k = 1; k < 7; k++) { g.beginPath(); g.ellipse(x, y, 4 + k * 5, 18 + k * 16, 0, 0, Math.PI * 2); g.stroke(); }
  }
  g.globalAlpha = 1;
  return c;
}
/** marble veins */
export function stoneCanvas(hex, seed = 11) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d"), R = rnd(seed);
  g.fillStyle = hex; g.fillRect(0, 0, 512, 512);
  const dark = parseInt(hex.slice(1), 16) < 0x777777;
  for (let i = 0; i < 18; i++) {
    g.strokeStyle = dark ? "rgba(235,235,235,0.35)" : `rgba(90,90,95,${0.12 + R() * 0.25})`;
    g.lineWidth = 0.6 + R() * 2.4;
    g.beginPath();
    let x = R() * 512, y = R() * 512;
    g.moveTo(x, y);
    const a = R() * Math.PI;
    for (let k = 0; k < 24; k++) { x += Math.cos(a) * 26 + (R() - 0.5) * 28; y += Math.sin(a) * 26 + (R() - 0.5) * 28; g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}
/** porcelain floor tiles (60 × 60 by default) */
export function tileCanvas(hex = "#d9d4c8") {
  const c = stoneCanvas(hex, 3);
  const g = c.getContext("2d");
  g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 3;
  g.strokeRect(0, 0, 512, 512);
  return c;
}

// ------------------------------------------------------------------ three.js textures
const texCache = new Map();
/** the texture for a material key (custom photo, or drawn grain in render mode) — null for plain colours */
export function textureFor(THREE, key, renderMode, grain = null) {
  if (!key) return null;
  const custom = get(key);
  const id = key + (renderMode ? "|r" : "") + (grain ? "|g" + grain : "");
  if (texCache.has(id)) return texCache.get(id);
  let tex = null, tile = 60, rot = 0;
  if (custom?.img) {
    tex = new THREE.TextureLoader().load(custom.img, () => { try { window.dispatchEvent(new Event("novera-tex")); } catch { /* no window */ } });
    tile = +custom.tile || 60; rot = ((+custom.rot || 0) * Math.PI) / 180;
  } else if (renderMode) {
    const e = Catalog.LIB[key];
    if (!e) { texCache.set(id, null); return null; }
    if (key.startsWith("wood_")) { tex = new THREE.CanvasTexture(woodCanvas(e[2], key.length * 13)); tile = 70; rot = key.endsWith("_v") ? 0 : Math.PI / 2; }
    else if (/^(marble_|quartz_|terrazzo|concrete_)/.test(key)) { tex = new THREE.CanvasTexture(stoneCanvas(e[2], key.length * 7)); tile = 120; }
  }
  if (!tex) { texCache.set(id, null); return null; }
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.center.set(0.5, 0.5);
  // v61: a known grain direction overrides the library's own orientation — "h" = along the piece's height (vertical on fronts), "w" = along its width
  if (grain && (key.startsWith("wood_") || custom?.img)) rot = grain === "h" ? 0 : Math.PI / 2;
  tex.rotation = rot;
  const out = { tex, tile };
  texCache.set(id, out);
  return out;
}
export function forget(key) { for (const k of [...texCache.keys()]) if (k.split("|")[0] === key) texCache.delete(k); }
/** surface look of a key: roughness/metalness/brightness */
export function surface(key) {
  const c = get(key);
  if (c) return { rough: 1 - (+c.gloss || 0) / 110, metal: c.kind === "metal" ? 0.6 : 0, bright: 1 + (+c.bright || 0) / 100 };
  if (/^acrylic_/.test(key || "")) return { rough: 0.12, metal: 0, bright: 1 };
  if (/^(marble_|quartz_)/.test(key || "")) return { rough: 0.25, metal: 0, bright: 1 };
  if (/^(alu_|stainless|copper)/.test(key || "")) return { rough: 0.35, metal: 0.8, bright: 1 };
  if (/^mirror/.test(key || "")) return { rough: 0.02, metal: 1, bright: 1 };
  return { rough: 0.6, metal: 0.02, bright: 1 };
}
/** world-scaled planar UVs (cm / tile) — grain runs up the height on fronts and sides */
export function planarUV(THREE, geo, tile) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  if (!pos || !nor) return;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u, v;
    if (ny >= nx && ny >= nz) { u = x; v = z; }
    else if (nx >= nz) { u = z; v = y; }
    else { u = x; v = y; }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// ------------------------------------------------------------------ wall / floor finishes
export const FINISHES = { paint: "دهان", tile: "سيراميك / بورسلين", wood: "باركيه / خشب", photo: "خامة من صورة (ورق حائط، حجر …)" };
export const PAINTS = ["#f3f1ea", "#ffffff", "#ece4d6", "#d9cfbf", "#c9c3b8", "#b8b2a6", "#9aa592", "#7f8c8d", "#5e6a57", "#3b3d3f", "#e7d3c1", "#c8a98b", "#a7b8c8", "#2f3b4d"];
function tileGridCanvas(hex, grout = "#bdb6a8") {
  const c = stoneCanvas(hex, 5);
  const g = c.getContext("2d");
  g.strokeStyle = grout; g.lineWidth = 6;
  g.strokeRect(0, 0, 512, 512);
  return c;
}
function parquetCanvas(hex) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  const R = rnd(21);
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) * 256;
    for (let k = -1; k < 3; k++) {
      const x = off + k * 256;
      const w = woodCanvas(shade(hex, 0.9 + R() * 0.2).replace(/rgb\((\d+),(\d+),(\d+)\)/, (_, a, b, cc) => "#" + [a, b, cc].map((v) => (+v).toString(16).padStart(2, "0")).join("")), 30 + row * 7 + k);
      g.save(); g.translate(x, row * 128); g.rotate(0); g.drawImage(w, 0, 0, 512, 512, 0, 0, 256, 128); g.restore();
      g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 2; g.strokeRect(x, row * 128, 256, 128);
    }
  }
  return c;
}
const finCache = new Map();
/** a three.js material for a wall / floor finish spec {finish, color, size, mat}; returns {mat, tile} */
export function finishMaterial(THREE, spec = {}, fallback = "#f3f1ea") {
  const f = spec.finish || "paint", color = spec.color || fallback;
  const key = JSON.stringify([f, color, spec.size, spec.mat]);
  if (finCache.has(key)) return finCache.get(key);
  let mat, tile = 0;
  if (f === "photo" && spec.mat && get(spec.mat)) {
    const t = textureFor(THREE, spec.mat, false);
    const sf = surface(spec.mat);
    mat = new THREE.MeshStandardMaterial({ map: t.tex, color: new THREE.Color(1, 1, 1).multiplyScalar(sf.bright), roughness: sf.rough, side: THREE.DoubleSide });
    tile = t.tile;
  } else if (f === "tile" || f === "wood") {
    const cv = f === "tile" ? tileGridCanvas(color) : parquetCanvas(color);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    mat = new THREE.MeshStandardMaterial({ map: tex, roughness: f === "tile" ? 0.3 : 0.55, side: THREE.DoubleSide });
    tile = f === "tile" ? +spec.size || 60 : (+spec.size || 120) * 2; // the parquet canvas holds 2 plank lengths
  } else mat = new THREE.MeshStandardMaterial({ color, roughness: 0.92, side: THREE.DoubleSide });
  const out = { mat, tile };
  finCache.set(key, out);
  return out;
}
/** UVs for a wall piece: u = cm along the wall, v = height (both / tile) */
export function wallUV(THREE, mesh, seg, tile) {
  if (!tile) return;
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry, pos = geo.attributes.position, uv = new Float32Array(pos.count * 2), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const along = (v.x - seg.A[0]) * seg.d[0] + (v.z - seg.A[1]) * seg.d[1];
    uv[i * 2] = along / tile; uv[i * 2 + 1] = v.y / tile;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// ------------------------------------------------------------------ relief (normal maps) and fabrics
const nrmCache = new Map();
/** a normal map made from the texture's own picture (bright = raised), so wood grain, stone and weave show relief */
export function normalFor(THREE, tex) {
  const img = tex?.image;
  if (!img || !(img.width || img.naturalWidth)) return null;
  if (img.complete === false) return null;
  const key = tex.uuid;
  if (nrmCache.has(key)) return nrmCache.get(key);
  const S = 256, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true });
  try { g.drawImage(img, 0, 0, S, S); } catch { nrmCache.set(key, null); return null; }
  const src = g.getImageData(0, 0, S, S).data, out = g.createImageData(S, S), d = out.data;
  const lum = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) lum[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
  const at = (x, y) => lum[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -dx * 2, ny = -dy * 2, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * S + x) * 4;
    d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const n = new THREE.CanvasTexture(c);
  n.wrapS = n.wrapT = THREE.RepeatWrapping;
  n.center.copy(tex.center); n.rotation = tex.rotation;
  nrmCache.set(key, n);
  return n;
}
/** how much relief a library key gets by default (0–100) */
export function defaultRelief(key) {
  if (!key) return 0;
  if (get(key)) return get(key).kind === "fabric" ? 60 : get(key).kind === "stone" ? 25 : 35;
  if (key.startsWith("wood_")) return 35;
  if (/^(marble_|quartz_)/.test(key)) return 12;
  if (/^(terrazzo|concrete_)/.test(key)) return 40;
  return 0;
}

export const FABRICS = { linen: "كتان", chenille: "شانيل", velvet: "قطيفة", boucle: "بوكليه", leather: "جلد" };
export const FABRIC_COLORS = ["#b9b0a3", "#d8d0c4", "#8f8a82", "#5d5a55", "#2f3136", "#2f4a3a", "#3b4a63", "#7a5b45", "#a4733f", "#c9b49a", "#8e3b3b", "#e9e4da"];
const fabCache = new Map();
/** a fabric picture: woven threads (linen), soft nap (velvet), loops (bouclé) or grain (leather) */
function fabricCanvas(hex, type) {
  const S = 512, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  g.fillStyle = hex; g.fillRect(0, 0, S, S);
  const r = rnd(type.length * 97 + 13);
  if (type === "linen") {
    for (let y = 0; y < S; y += 3) { g.fillStyle = shade(hex, 0.86 + r() * 0.2); g.globalAlpha = 0.55; g.fillRect(0, y, S, 1.6); }
    for (let x = 0; x < S; x += 3) { g.fillStyle = shade(hex, 0.86 + r() * 0.2); g.globalAlpha = 0.45; g.fillRect(x, 0, 1.6, S); }
    g.globalAlpha = 0.25;
    for (let i = 0; i < 260; i++) { g.fillStyle = shade(hex, 0.75 + r() * 0.4); g.fillRect(r() * S, r() * S, 1 + r() * 30, 1.2); }
  } else if (type === "chenille") {
    for (let y = 0; y < S; y += 6) { g.globalAlpha = 0.5; g.fillStyle = shade(hex, 0.8 + r() * 0.12); g.fillRect(0, y, S, 2.4); g.fillStyle = shade(hex, 1.08 + r() * 0.08); g.fillRect(0, y + 3, S, 1.6); }
    g.globalAlpha = 0.2;
    for (let i = 0; i < 2200; i++) { g.fillStyle = shade(hex, 0.85 + r() * 0.35); g.fillRect(r() * S, r() * S, 2, 1.5); }
  } else if (type === "velvet" || type === "cotton") {
    g.globalAlpha = 0.18;
    for (let i = 0; i < 3500; i++) { g.fillStyle = shade(hex, 0.85 + r() * 0.3); g.fillRect(r() * S, r() * S, 2, 2); }
  } else if (type === "boucle") {
    g.globalAlpha = 0.5;
    for (let i = 0; i < 2600; i++) { g.strokeStyle = shade(hex, 0.7 + r() * 0.55); g.lineWidth = 1.4; g.beginPath(); g.arc(r() * S, r() * S, 1.5 + r() * 2.5, 0, Math.PI * 2); g.stroke(); }
  } else {
    g.globalAlpha = 0.35;
    for (let i = 0; i < 1800; i++) { g.fillStyle = shade(hex, 0.8 + r() * 0.3); const x = r() * S, y = r() * S, w = 3 + r() * 9; g.beginPath(); g.ellipse(x, y, w, w * 0.6, r() * 3, 0, Math.PI * 2); g.fill(); }
  }
  g.globalAlpha = 1;
  return c;
}
export function fabricMaterial(THREE, spec = {}) {
  const type = FABRICS[spec.type] || spec.type === "cotton" ? spec.type : "linen", color = spec.color || "#b9b0a3";
  const key = type + color;
  if (fabCache.has(key)) return fabCache.get(key);
  const tex = new THREE.CanvasTexture(fabricCanvas(color, type));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const nrm = normalFor(THREE, tex);
  const m = new THREE.MeshPhysicalMaterial({ map: tex, normalMap: nrm, color: 0xffffff,
    roughness: type === "leather" ? 0.42 : type === "velvet" ? 0.95 : 0.88,
    sheen: type === "velvet" ? 1 : type === "cotton" ? 0.15 : type === "chenille" ? 0.7 : type === "leather" ? 0 : 0.35, sheenRoughness: type === "velvet" ? 0.35 : 0.8,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35),
    clearcoat: type === "leather" ? 0.25 : 0, clearcoatRoughness: 0.3 });
  m.normalScale = new THREE.Vector2(1, 1).multiplyScalar(type === "boucle" ? 1.6 : type === "linen" ? 0.9 : type === "chenille" ? 1.1 : type === "leather" ? 0.5 : type === "cotton" ? 0.15 : 0.25);
  m.userData.tile = type === "linen" ? 12 : type === "boucle" ? 18 : type === "chenille" ? 14 : 25;
  fabCache.set(key, m);
  return m;
}
