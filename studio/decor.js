// NOVERA Studio — soft furnishing for the 3D view: upholstered cushions (plain, buttoned or channel
// tufting), the mattress, pillows, duvet and throw on beds. They are only pictures: nothing here goes
// into the cut list, the barcodes or the SketchUp export.
// Engine coordinates are (x = width, y = length from the foot, z = height); three.js gets (x, z, -y).

export const TUFTS = { none: "سادة", buttons: "كابيتونيه (زراير)", channels: "قنوات رأسية" };
export const BEDDING = ["#f4f1ea", "#e9e4da", "#d8d0c4", "#c9c4bb", "#9aa3ad", "#5d6670", "#2f3136", "#c8b79e", "#a98f74", "#7f8f7a", "#3b4a63", "#8e3b3b"];

/** a soft box: thinner at the edges (puffed), with dimples where it is buttoned or stitched */
export function puffy(THREE, w, h, d, opts = {}) {
  const sx = Math.min(64, Math.max(6, Math.ceil(w / 2.2))), sy = Math.min(64, Math.max(6, Math.ceil(h / 2.2)));
  const geo = new THREE.BoxGeometry(w, h, d, sx, sy, 3);
  const pos = geo.attributes.position;
  const tufts = opts.tufts || [], channels = opts.channels || [];
  const edge = opts.edge ?? 0.35, sig = opts.sigma || 3.2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ux = (2 * x) / w, uy = (2 * y) / h;
    const bulge = (1 - Math.pow(Math.abs(ux), 6)) * (1 - Math.pow(Math.abs(uy), 6));
    let dim = 0;
    for (const [tx, ty] of tufts) dim = Math.max(dim, Math.exp(-((x - tx) ** 2 + (y - ty) ** 2) / (sig * sig)));
    for (const cx of channels) dim = Math.max(dim, Math.exp(-((x - cx) ** 2) / (sig * sig * 0.5)));
    let f = edge + (1 - edge) * bulge;
    if (z > 0) f *= 1 - 0.62 * dim; // dimples on the show face only
    pos.setZ(i, z * f);
    // round the outline a little so the corners are not sharp
    const pinch = 1 - 0.04 * Math.pow(Math.abs(uy), 4) * (z > 0 ? 1 : 0);
    pos.setX(i, x * pinch);
  }
  geo.computeVertexNormals();
  return geo;
}

/** button positions for a w×h face, diamond (capitonné) pattern */
export function tuftPoints(w, h, step = 17) {
  const nx = Math.max(1, Math.round(w / step)), ny = Math.max(1, Math.round(h / step));
  const pts = [];
  for (let j = 0; j < ny; j++) {
    const odd = j % 2 === 1;
    for (let i = 0; i < nx + (odd ? -1 : 0); i++) {
      const x = -w / 2 + ((i + (odd ? 1 : 0.5)) * w) / nx, y = -h / 2 + ((j + 0.5) * h) / ny;
      pts.push([x, y]);
    }
  }
  return pts;
}
export function channelLines(w, step = 15) {
  const n = Math.max(1, Math.round(w / step));
  return Array.from({ length: n - 1 }, (_, i) => -w / 2 + ((i + 1) * w) / n);
}

const plainFabric = new Map();
function cloth(THREE, Mat, spec, render) {
  if (render) return Mat.fabricMaterial(THREE, spec);
  const k = spec.color + spec.type;
  if (!plainFabric.has(k)) plainFabric.set(k, new THREE.MeshStandardMaterial({ color: spec.color, roughness: spec.type === "leather" ? 0.45 : 0.9 }));
  return plainFabric.get(k);
}

/**
 * the soft pieces for one panel unit. Returns [{ mesh, partIndex }] — partIndex is the part the piece
 * rides on (so a mattress opens with the lid), or null.
 */
export function softFor(THREE, Mat, u, r, ctx) {
  const out = [];
  const p = r.params || {};
  const render = !!ctx.render;
  const fab = { type: "linen", color: r.colors?.accent || "#b9b0a3", tuft: "none", ...(u.fabric || {}) };
  const add = (geo, mat, x, y, z, partIndex = null, rot = null) => {
    if (mat.userData?.tile) Mat.planarUV(THREE, geo, mat.userData.tile);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, z, -y);
    if (rot) m.rotation.set(rot[0], rot[1] || 0, rot[2] || 0);
    m.castShadow = m.receiveShadow = render;
    m.userData.pname = ctx.name;
    m.userData.soft = true;
    out.push({ mesh: m, partIndex });
  };
  // 1) upholstered faces: a cushion in front of every part the engine marks "تنجيد"
  const uph = r.parts.map((pt, i) => [pt, i]).filter(([pt]) => /تنجيد/.test(pt.note || ""));
  for (const [pt, i] of uph) {
    const b = pt.box, w = b.x1 - b.x0 - 0.4, h = b.z1 - b.z0 - 0.4;
    if (w < 5 || h < 5) continue;
    const d = fab.type === "leather" ? 4 : 5.5;
    const opts = fab.tuft === "buttons" ? { tufts: tuftPoints(w, h) } : fab.tuft === "channels" ? { channels: channelLines(w) } : {};
    const geo = puffy(THREE, w, h, d * 2, { ...opts, edge: 0.3 });
    // centred on the board's face: the back half hides inside it, the show face (+z) looks at the foot
    add(geo, cloth(THREE, Mat, fab, render), (b.x0 + b.x1) / 2, b.y0, (b.z0 + b.z1) / 2, i, null);
    if (fab.tuft === "buttons") {
      const bm = cloth(THREE, Mat, { ...fab, color: shadeHex(fab.color, 0.8) }, render);
      for (const [tx, ty] of opts.tufts) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), bm);
        s.scale.z = 0.5;
        s.position.set((b.x0 + b.x1) / 2 + tx, (b.z0 + b.z1) / 2 + ty, -(b.y0) + d * (1 - 0.62) + 0.2);
        s.userData.pname = ctx.name; s.userData.soft = true;
        out.push({ mesh: s, partIndex: i });
      }
    }
  }
  // 2) beds: mattress, pillows, duvet and a throw
  if (p.template === "bed" && u.bedding?.show !== false) {
    const L = r.parts.find((x) => x.name === "جنب سرير شمال"), Rt = r.parts.find((x) => x.name === "جنب سرير يمين"), F = r.parts.find((x) => x.name === "لوح الرجلين");
    if (L && Rt && F) {
      const bd = p.bed || {};
      const x0 = L.box.x1 + 0.4, x1 = Rt.box.x0 - 0.4, y0 = F.box.y1 + 0.4, y1 = L.box.y1 - (L.box.x1 - L.box.x0) - 0.4;
      const zTop = L.box.z1, mw = x1 - x0, ml = y1 - y0, mt = 22;
      const lidI = r.parts.findIndex((x) => /^غطا صندوق/.test(x.name));
      const ride = lidI >= 0 ? lidI : null;
      const sheet = cloth(THREE, Mat, { type: "cotton", color: "#f6f4ef" }, render);
      const bed = { duvet: u.bedding?.duvet || "#e9e4da", throw: u.bedding?.throw || shadeHex(fab.color, 0.85) };
      // the mattress: sinks 3 cm into the box
      const mz = zTop - 3 + mt / 2;
      const mat = ctx.RBox ? new ctx.RBox(mw, mt, ml, 4, 4) : new THREE.BoxGeometry(mw, mt, ml);
      add(mat, sheet, (x0 + x1) / 2, (y0 + y1) / 2, mz, ride);
      const top = zTop - 3 + mt;
      // duvet over the foot two thirds, hanging a little over the sides
      const dl = ml * 0.68, dw = mw + 6;
      const duv = puffy(THREE, dw, dl, 7, { edge: 0.55 });
      add(duv, cloth(THREE, Mat, { type: "cotton", color: bed.duvet }, render), (x0 + x1) / 2, y0 + dl / 2 - 2, top + 2.5, ride, [-Math.PI / 2, 0, 0]);
      // the turned-back fold
      const fold = puffy(THREE, dw - 1, 22, 6, { edge: 0.5 });
      add(fold, cloth(THREE, Mat, { type: "cotton", color: shadeHex(bed.duvet, 1.04) }, render), (x0 + x1) / 2, y0 + dl - 9, top + 6.5, ride, [-Math.PI / 2, 0, 0]);
      // a throw across the foot
      const th = puffy(THREE, mw + 10, 42, 3.5, { edge: 0.6 });
      add(th, cloth(THREE, Mat, { type: fab.type === "leather" ? "linen" : fab.type === "boucle" ? "boucle" : "chenille", color: bed.throw }, render), (x0 + x1) / 2, y0 + 24, top + 7.5, ride, [-Math.PI / 2, 0, 0]);
      // pillows leaning on the headboard
      const n = mw >= 175 ? 3 : mw >= 115 ? 2 : 1, pw = Math.min(70, (mw - 6) / n - 3);
      for (let i = 0; i < n; i++) {
        const cx = x0 + (mw * (i + 0.5)) / n;
        const pg = puffy(THREE, pw, 42, 15, { edge: 0.25 });
        add(pg, sheet, cx, y1 - 12, top + 15, ride, [-0.42, 0, 0]);
        const cg = puffy(THREE, Math.min(45, pw * 0.72), 38, 13, fab.tuft === "buttons" ? { edge: 0.3, tufts: [[0, 0]], sigma: 2.5 } : { edge: 0.3 });
        add(cg, cloth(THREE, Mat, fab, render), cx, y1 - 25, top + 14, ride, [-0.3, 0, 0]);
      }
    }
  }
  return out;
}
function shadeHex(hex, f) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  const c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return "#" + [16, 8, 0].map((s) => c(s).toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------------------ more beds for the library
// Full parameters (no preset key) so the SketchUp plugin rebuilds them exactly.
const BED = (label, desc, mats, bed, fabric) => ({ label, desc, group: "غرف النوم", params: { template: "bed", materials: Object.fromEntries(Object.entries(mats).map(([k, v]) => [k, { lib: v }])), bed }, fabric });
export const EXTRA_PRESETS = {
  app_bed_king_tufted: BED("سرير كينج منجّد كابيتونيه بأجنحة", "200 سم، ضهر 3 بانوهات قطيفة بزراير، كومودينو معلّق، ليد.",
    { carcass: "hpl_offwhite", front: "hpl_greige", accent: "hpl_greige", shelf: "hpl_offwhite" },
    { mattress_width: 200, headboard_style: "panels", panel_rows: 3, headboard_height: 130, headboard_extra: 60, side_tables: true, upholstered: true, led: true },
    { type: "velvet", color: "#5d5a55", tuft: "buttons" }),
  app_bed_channel_tall: BED("سرير بضهر منجّد عالي (قنوات)", "180 سم، ضهر 160 سم بقنوات رأسية، بوكليه فاتح.",
    { carcass: "hpl_offwhite", front: "hpl_cream", accent: "hpl_cream" },
    { mattress_width: 180, headboard_style: "flat", headboard_height: 160, headboard_extra: 15, upholstered: true },
    { type: "boucle", color: "#e9e4da", tuft: "channels" }),
  app_bed_float_walnut: BED("سرير معلّق جوز برف وليد", "180 سم، قاعدة داخلة بليد، شرايح جوز ورف فوق الضهر.",
    { carcass: "hpl_anthracite", front: "wood_walnut_v", accent: "wood_walnut_v", shelf: "wood_walnut_v" },
    { mattress_width: 180, floating: true, led: true, headboard_style: "slats", headboard_height: 120, headboard_extra: 10, headboard_shelf: true },
    { type: "linen", color: "#8f8a82", tuft: "none" }),
  app_bed_black_minimal: BED("سرير مودرن أسود مط", "160 سم معلّق، ضهر لوح سادة أسود وجلد.",
    { carcass: "hpl_black", front: "hpl_black", accent: "hpl_black" },
    { mattress_width: 160, floating: true, led: true, headboard_height: 100, upholstered: true },
    { type: "leather", color: "#2f3136", tuft: "none" }),
  app_bed_japanese_low: BED("سرير ياباني واطي", "180 سم، صندوق 22 سم من غير تخزين، أوك فاتح.",
    { carcass: "wood_oak_light", front: "wood_oak_light_v", accent: "wood_oak_light_v" },
    { mattress_width: 180, height: 22, storage: "none", floating: true, float_height: 8, float_setback: 10, headboard_height: 70, headboard_extra: 20 },
    { type: "linen", color: "#d8d0c4", tuft: "none" }),
  app_bed_hotel_oak_wide: BED("ضهر فندقي أوك شرايح 3 متر", "180 سم، ضهر أعرض 55 سم من كل ناحية بكومودينو معلّق.",
    { carcass: "hpl_white", front: "wood_oak_natural_v", accent: "wood_oak_natural_v", shelf: "hpl_white" },
    { mattress_width: 180, headboard_style: "slats", headboard_height: 125, headboard_extra: 55, side_tables: true, led: true },
    { type: "linen", color: "#b9b0a3", tuft: "none" }),
  app_bed_teen_navy: BED("سرير شباب 140 كحلي برف", "140 سم، بانوهات منجّدة كحلي ورف فوق الضهر.",
    { carcass: "hpl_white", front: "hpl_navy", accent: "hpl_navy", shelf: "wood_oak_light_v" },
    { mattress_width: 140, headboard_style: "panels", panel_rows: 3, headboard_height: 105, upholstered: true, headboard_shelf: true },
    { type: "linen", color: "#3b4a63", tuft: "channels" }),
  app_bed_kids_120: BED("سرير أطفال 120 شرايح أبيض", "120 سم، صندوق بمكبس، ضهر شرايح أبيض.",
    { carcass: "hpl_white", front: "hpl_white", accent: "hpl_white" },
    { mattress_width: 120, mattress_length: 190, headboard_style: "slats", headboard_height: 95, slat_width: 8, slat_gap: 3 },
    { type: "linen", color: "#9aa3ad", tuft: "none" }),
  app_bed_single_90: BED("سرير فردي 90 بصندوق", "90 سم، ضهر سادة أوك طبيعي.",
    { carcass: "hpl_offwhite", front: "wood_oak_natural_v", accent: "wood_oak_natural_v" },
    { mattress_width: 90, headboard_height: 95 },
    { type: "linen", color: "#c9b49a", tuft: "none" }),
  app_bed_sage_slats: BED("سرير شرايح أخضر ساج", "160 سم، شرايح رأسية ساج ورف بليد.",
    { carcass: "hpl_offwhite", front: "hpl_sage", accent: "hpl_sage", shelf: "hpl_offwhite" },
    { mattress_width: 160, headboard_style: "slats", headboard_height: 120, headboard_shelf: true, led: true },
    { type: "linen", color: "#7f8f7a", tuft: "none" }),
  app_bed_classic_beige: BED("سرير كلاسيك بيج منجّد بالكامل", "180 سم، ضهر 140 سم كابيتونيه شانيل بيج.",
    { carcass: "hpl_beige", front: "hpl_beige", accent: "hpl_beige" },
    { mattress_width: 180, headboard_height: 140, headboard_extra: 10, upholstered: true },
    { type: "chenille", color: "#c8b79e", tuft: "buttons" }),
  app_bed_burgundy_velvet: BED("سرير قطيفة نبيتي بأجنحة", "160 سم، 4 بانوهات قطيفة نبيتي، ضهر أعرض 25 سم.",
    { carcass: "hpl_anthracite", front: "hpl_anthracite", accent: "hpl_anthracite" },
    { mattress_width: 160, headboard_style: "panels", panel_rows: 4, headboard_height: 125, headboard_extra: 25, upholstered: true },
    { type: "velvet", color: "#8e3b3b", tuft: "channels" }),
};
