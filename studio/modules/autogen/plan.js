// «🏠 5 تصميمات تلقائية» — a small top plan (SVG) of a room and, optionally, a kitchen standing in it.
let A = null;
export const setApi = (api) => { A = api; };
const f1 = (v) => Math.round(v * 10) / 10;
const pts = (P) => P.map((p) => `${f1(p[0])},${f1(p[1])}`).join(" ");
const MEP_COL = { drain: "#5f5f5f", cold: "#2a6ed2", hot: "#d23228", gas: "#8c50c8", elec: "#d9a514", acd: "#3aa7c9" };

/** room (+ units with poses) → svg. opts: {units, poses, tri, numbers (wall numbers + start marks), h} */
export function planSvg(room, opts = {}) {
  const R = A.Room, segs = R.segments(room);
  if (!segs.length) return "";
  const geo = R.wallGeom(room);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const g of geo) for (const p of [g.seg.A, g.seg.B, g.outerStart, g.outerEnd]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const pad = 30, vb = [x0 - pad, z0 - pad, x1 - x0 + 2 * pad, z1 - z0 + 2 * pad];
  const k = Math.max(vb[2], vb[3]) / 400; // stroke / text scale
  let s = `<svg class="agplan" viewBox="${vb.map(f1).join(" ")}" xmlns="http://www.w3.org/2000/svg" style="height:${opts.h || 190}px">`;
  s += `<rect x="${f1(vb[0])}" y="${f1(vb[1])}" width="${f1(vb[2])}" height="${f1(vb[3])}" fill="var(--agbg)"/>`;
  if (room.closed) s += `<polygon points="${pts(room.pts)}" fill="var(--agfloor)"/>`;
  for (const g of geo) s += `<polygon points="${pts(R.piecePoly(g, 0, g.seg.L))}" fill="var(--agwall)"/>`;
  for (const o of room.openings || []) {
    if (o.id === "agfake") continue;
    const g = geo.find((q) => q.seg.id === o.wall);
    if (!g) continue;
    const P = R.piecePoly(g, +o.at, +o.at + +o.w);
    s += `<polygon points="${pts(P)}" fill="var(--agbg)"/>`;
    if (o.kind === "door") {
      const sg = g.seg, a = [sg.A[0] + sg.d[0] * o.at, sg.A[1] + sg.d[1] * o.at], w = +o.w;
      const tip = [a[0] + sg.n[0] * w, a[1] + sg.n[1] * w], end = [a[0] + sg.d[0] * w, a[1] + sg.d[1] * w];
      s += `<path d="M${f1(a[0])},${f1(a[1])} L${f1(tip[0])},${f1(tip[1])} A${w},${w} 0 0 ${sweep(sg)} ${f1(end[0])},${f1(end[1])}" fill="none" stroke="var(--agdoor)" stroke-width="${f1(1.6 * k)}"/>`;
    } else s += `<polygon points="${pts(P)}" fill="none" stroke="var(--agwin)" stroke-width="${f1(2 * k)}"/><line x1="${f1((P[0][0] + P[3][0]) / 2)}" y1="${f1((P[0][1] + P[3][1]) / 2)}" x2="${f1((P[1][0] + P[2][0]) / 2)}" y2="${f1((P[1][1] + P[2][1]) / 2)}" stroke="var(--agwin)" stroke-width="${f1(1.5 * k)}"/>`;
  }
  // units: tall dark, base light, uppers dashed on top; the work spots coloured
  const items = (opts.items || []).filter((it) => it.pose);
  const order = { tall: 0, lower: 1, free: 1, upper: 2 };
  for (const it of [...items].sort((a, b) => (order[a.row] ?? 1) - (order[b.row] ?? 1))) {
    const P = R.footprint(it.pose, it.box), p = it.u?.params || {};
    const spot = p.include_sink_cutout === true || p.include_sink_cutout === "true" ? "sink" : p.unit_label === "بوتجاز" ? "hob" : p.unit_category === "fridge" ? "fridge" : p.unit_category === "washer_gap" ? "gap" : "";
    const cls = it.row === "upper" ? "u" : it.row === "tall" ? "t" : "b";
    s += `<polygon class="ag${cls} ${spot ? "ag" + spot : ""}" points="${pts(P)}" stroke-width="${f1((it.row === "upper" ? 1.2 : 0.9) * k)}" ${it.row === "upper" ? `stroke-dasharray="${f1(4 * k)} ${f1(3 * k)}"` : ""}/>`;
  }
  if (opts.tri && opts.spots) {
    const c = opts.spots.map((it) => A.frontCenter(it, 12));
    s += `<polygon points="${pts(c)}" fill="var(--agtri)" fill-opacity=".14" stroke="var(--agtri)" stroke-width="${f1(1.6 * k)}" stroke-linejoin="round"/>`;
    for (const p of c) s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(4 * k)}" fill="var(--agtri)"/>`;
  }
  for (const p of room.points || []) {
    const w = R.pointWorld(room, p);
    if (!w) continue;
    const sys = R.MEP_KINDS[p.kind]?.[1] || "elec";
    s += `<circle cx="${f1(w.x + w.n[0] * 6)}" cy="${f1(w.z + w.n[1] * 6)}" r="${f1(5 * k)}" fill="${MEP_COL[sys] || "#888"}" stroke="#fff" stroke-width="${f1(1 * k)}"/>`;
  }
  if (opts.numbers) segs.forEach((g, i) => {
    const m = [(g.A[0] + g.B[0]) / 2 + g.n[0] * 22 * k, (g.A[1] + g.B[1]) / 2 + g.n[1] * 22 * k];
    s += `<circle cx="${f1(m[0])}" cy="${f1(m[1])}" r="${f1(11 * k)}" fill="var(--agnum)"/><text x="${f1(m[0])}" y="${f1(m[1] + 4.2 * k)}" font-size="${f1(12 * k)}" text-anchor="middle" fill="#fff" font-weight="700">${i + 1}</text>`;
    const st = [g.A[0] + g.n[0] * 7 * k + g.d[0] * 7 * k, g.A[1] + g.n[1] * 7 * k + g.d[1] * 7 * k];
    s += `<circle cx="${f1(st[0])}" cy="${f1(st[1])}" r="${f1(4 * k)}" fill="var(--agnum)"/>`;
  });
  return s + `</svg>`;
}
// the door leaf swings into the room: the arc from the leaf tip back to the wall
function sweep(sg) { return sg.d[0] * sg.n[1] - sg.d[1] * sg.n[0] > 0 ? 0 : 1; }
