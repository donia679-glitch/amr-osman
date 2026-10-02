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
export function textureFor(THREE, key, renderMode) {
  if (!key) return null;
  const custom = get(key);
  const id = key + (renderMode ? "|r" : "");
  if (texCache.has(id)) return texCache.get(id);
  let tex = null, tile = 60, rot = 0;
  if (custom?.img) {
    tex = new THREE.TextureLoader().load(custom.img);
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
