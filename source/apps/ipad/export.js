// File writers with no outside libraries (works offline and inside the App Store build):
// ZIP (stored), XLSX (Office Open XML), PDF (pages as JPEG images, so Arabic text keeps its shaping),
// DXF (R12 ASCII), CSV — plus a delivery helper (the viewer's download capability, the share sheet, or a link).

// ------------------------------------------------------------------ bytes
const enc = new TextEncoder();
const u8 = (x) => (x instanceof Uint8Array ? x : typeof x === "string" ? enc.encode(x) : new Uint8Array(x));
let CRC_T = null;
function crc32(b) {
  if (!CRC_T) { CRC_T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function concat(parts) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// ------------------------------------------------------------------ ZIP (store)
/** files: [{name, data: string|Uint8Array}] → Uint8Array */
// the app's language for what we write (set by i18n when English is on)
let T = (x) => x, TM = (x) => x, LTR = false;
export function setTranslator(t, tm) { T = t; TM = tm; LTR = true; }
export function zip(files) {
  const local = [], central = [];
  let offset = 0;
  const d = new Date();
  const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  for (const f of files) {
    const name = enc.encode(f.name), data = u8(f.data), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    local.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cen = concat(central);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cen.length, true); e.setUint32(16, offset, true);
  return concat([...local, cen, new Uint8Array(e.buffer)]);
}

// ------------------------------------------------------------------ XLSX
const xe = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const colName = (i) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
/**
 * sheets: [{name, rows: [[cell…]…], widths?: [n…]}] — first row is the header (bold, frozen).
 * Numbers stay numbers; everything else is text. Sheets are right-to-left.
 */
export function xlsx(sheets) {
  const files = [];
  const ws = sheets.map((sh, si) => {
    const cols = (sh.widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
    const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
      const ref = colName(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : "";
      if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
      if (v == null || v === "") return `<c r="${ref}"${st}/>`;
      return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xe(T(v))}</t></is></c>`;
    }).join("")}</row>`).join("");
    files.push({ name: `xl/worksheets/sheet${si + 1}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="${LTR ? 0 : 1}"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${rows}</sheetData>${sh.rows.length > 1 ? `<autoFilter ref="A1:${colName(Math.max(0, (sh.rows[0] || []).length - 1))}${sh.rows.length}"/>` : ""}</worksheet>` });
    return sh;
  });
  const names = ws.map((sh, i) => xe(String(T(sh.name)).replace(/[\\/?*[\]:]/g, " ").slice(0, 31)) || `Sheet${i + 1}`);
  files.push(
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${ws.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${ws.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${ws.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123F23"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
  );
  return zip(files);
}

// ------------------------------------------------------------------ CSV (UTF-8 with BOM so Excel reads Arabic)
export function csv(rows) {
  const q = (v) => { const s = v == null ? "" : String(T(v)); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n");
}

// ------------------------------------------------------------------ PDF from page images
function b64bytes(dataUrl) {
  const bin = atob(dataUrl.split(",")[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/** pages: [{jpeg: dataURL, w, h (pixels), pw, ph (points)}] → PDF bytes */
export function pdfFromJpegs(pages, title = "NOVERA") {
  const objs = [];
  const add = (parts) => { objs.push(parts); return objs.length; };
  const catalog = add(null), pagesObj = add(null);
  const kids = [];
  for (const pg of pages) {
    const img = b64bytes(pg.jpeg);
    const imgId = add([`<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`, img, "\nendstream"]);
    const cs = `q ${pg.pw} 0 0 ${pg.ph} 0 0 cm /Im Do Q`;
    const csId = add([`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`]);
    kids.push(add([`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${pg.pw} ${pg.ph}] /Resources << /XObject << /Im ${imgId} 0 R >> >> /Contents ${csId} 0 R >>`]));
  }
  objs[catalog - 1] = [`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`];
  objs[pagesObj - 1] = [`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`];
  const info = add([`<< /Producer (NOVERA Studio) /Title <FEFF${Array.from({ length: String(title).length }, (_, i) => String(title).charCodeAt(i).toString(16).padStart(4, "0")).join("")}> >>`]);
  const chunks = [u8("%PDF-1.4\n%âãÏÓ\n")];
  let pos = chunks[0].length;
  const xref = [];
  objs.forEach((parts, i) => {
    xref.push(pos);
    const head = u8(`${i + 1} 0 obj\n`);
    chunks.push(head); pos += head.length;
    for (const p of parts) { const b = u8(p); chunks.push(b); pos += b.length; }
    const tail = u8("\nendobj\n");
    chunks.push(tail); pos += tail.length;
  });
  const xs = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${xref.map((x) => String(x).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${pos}\n%%EOF`;
  chunks.push(u8(xs));
  return concat(chunks);
}
/** draw an SVG string onto a canvas (white page) and return a JPEG data URL */
export function svgToJpeg(svg, w, h, quality = 0.9) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
      g.drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      const bad = new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("parsererror");
      console.error("page render failed", bad?.textContent?.slice(0, 300));
      rej(new Error("page render failed"));
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}
/** A4 pages (portrait or landscape) given as SVG strings in a 1000 × 1414 (or 1414 × 1000) viewBox */
export async function pdfFromSvgPages(svgs, { landscape = false, title, scale = 1.75 } = {}) {
  const vw = landscape ? 1414 : 1000, vh = landscape ? 1000 : 1414;
  const pw = landscape ? 842 : 595, ph = landscape ? 595 : 842;
  const pages = [];
  for (const s of svgs) {
    const w = Math.round(vw * scale), h = Math.round(vh * scale);
    pages.push({ jpeg: await svgToJpeg(TM(s), w, h), w, h, pw, ph });
  }
  return pdfFromJpegs(pages, title);
}

// ------------------------------------------------------------------ DXF (R12)
export class Dxf {
  /** units: DXF $INSUNITS (5 = cm, 4 = mm for CNC files) */
  constructor(units = 5) { this.ents = []; this.layers = new Set(["0"]); this.units = units; }
  layer(l) { this.layers.add(l); return l; }
  line(x1, y1, x2, y2, l = "0") { this.layer(l); this.ents.push(`0\nLINE\n8\n${l}\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0`); }
  rect(x, y, w, h, l = "0") { this.line(x, y, x + w, y, l); this.line(x + w, y, x + w, y + h, l); this.line(x + w, y + h, x, y + h, l); this.line(x, y + h, x, y, l); }
  poly(pts, l = "0", closed = true) { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; this.line(a[0], a[1], b[0], b[1], l); } }
  circle(x, y, r, l = "0") { this.layer(l); this.ents.push(`0\nCIRCLE\n8\n${l}\n10\n${x}\n20\n${y}\n30\n0\n40\n${r}`); }
  text(x, y, h, s, l = "0") { this.layer(l); this.ents.push(`0\nTEXT\n8\n${l}\n10\n${x}\n20\n${y}\n30\n0\n40\n${h}\n1\n${String(T(s)).replace(/\n/g, " ")}`); }
  toString() {
    const lay = [...this.layers].map((l, i) => `0\nLAYER\n2\n${l}\n70\n0\n62\n${(i % 7) + 1}\n6\nCONTINUOUS`).join("\n");
    return `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n${this.units}\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n${this.layers.size}\n${lay}\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${this.ents.join("\n")}\n0\nENDSEC\n0\nEOF\n`;
  }
}

// ------------------------------------------------------------------ delivery
const MIME = { pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", zip: "application/zip", png: "image/png", jpg: "image/jpeg", json: "application/json", svg: "image/svg+xml", html: "text/html", txt: "text/plain", usdz: "model/vnd.usdz+zip", mp4: "video/mp4", webm: "video/webm" };
/** hand a file to the viewer: the artifact download capability, else the share sheet, else a download link */
export async function deliver(downloads, filename, data) {
  filename = T(filename);
  const ext = filename.split(".").pop().toLowerCase();
  const blob = data instanceof Blob ? data : new Blob([u8(data)], { type: MIME[ext] || "application/octet-stream" });
  if (downloads) {
    try { await downloads.save({ filename, data: blob }); return "saved"; }
    catch (e) { if (e?.code === "declined") return "declined"; if (!["unavailable", "not_granted", "capability_disabled", "capability_removed"].includes(e?.code)) throw e; }
  }
  // inside the NOVERA iPad/iPhone app: hand the file to iOS (share sheet → Files, WhatsApp, AirDrop …)
  const native = window.webkit?.messageHandlers?.noveraSave;
  if (native) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    native.postMessage({ name: filename, mime: blob.type, b64: btoa(bin) });
    return "shared";
  }
  try {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return "shared"; }
  } catch (e) { if (e?.name === "AbortError") return "declined"; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return "saved";
}

// ------------------------------------------------------------------ COLLADA (.dae) — opens in SketchUp (File ‹ Import)
/**
 * nodes: [{name, parts: [{material: {name, color:[r,g,b] 0..1, opacity}, positions: Float32Array (triangles, cm, Y up)}]}]
 */
export function dae(nodes, title = "NOVERA") {
  const mats = new Map();
  const matId = (m) => {
    const k = `${m.name}|${m.color.map((c) => c.toFixed(3)).join(",")}|${m.opacity ?? 1}`;
    if (!mats.has(k)) mats.set(k, { id: "m" + mats.size, ...m });
    return mats.get(k).id;
  };
  let geoms = "", scene = "", gi = 0;
  for (const nd of nodes) {
    let inst = "";
    for (const p of nd.parts) {
      const n = p.positions.length / 9;
      if (!n) continue;
      const id = "g" + gi++, mid = matId(p.material);
      const pos = Array.from(p.positions, (v) => +v.toFixed(3)).join(" ");
      const idx = Array.from({ length: n * 3 }, (_, i) => i).join(" ");
      geoms += `<geometry id="${id}" name="${xe(nd.name)}"><mesh><source id="${id}-p"><float_array id="${id}-pa" count="${p.positions.length}">${pos}</float_array><technique_common><accessor source="#${id}-pa" count="${n * 3}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source><vertices id="${id}-v"><input semantic="POSITION" source="#${id}-p"/></vertices><triangles material="${mid}" count="${n}"><input semantic="VERTEX" source="#${id}-v" offset="0"/><p>${idx}</p></triangles></mesh></geometry>`;
      inst += `<instance_geometry url="#${id}"><bind_material><technique_common><instance_material symbol="${mid}" target="#${mid}"/></technique_common></bind_material></instance_geometry>`;
    }
    if (inst) scene += `<node name="${xe(nd.name)}">${inst}</node>`;
  }
  let fx = "", ml = "";
  for (const m of mats.values()) {
    const [r, g, b] = m.color;
    fx += `<effect id="${m.id}-fx"><profile_COMMON><technique sid="common"><lambert><diffuse><color>${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} 1</color></diffuse>${(m.opacity ?? 1) < 1 ? `<transparent opaque="A_ONE"><color>0 0 0 ${(m.opacity).toFixed(2)}</color></transparent><transparency><float>1</float></transparency>` : ""}</lambert></technique></profile_COMMON></effect>`;
    ml += `<material id="${m.id}" name="${xe(m.name)}"><instance_effect url="#${m.id}-fx"/></material>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"><asset><contributor><authoring_tool>NOVERA Studio</authoring_tool></contributor><title>${xe(title)}</title><unit name="centimeter" meter="0.01"/><up_axis>Y_UP</up_axis></asset>
<library_effects>${fx}</library_effects><library_materials>${ml}</library_materials><library_geometries>${geoms}</library_geometries>
<library_visual_scenes><visual_scene id="scene" name="${xe(title)}">${scene}</visual_scene></library_visual_scenes><scene><instance_visual_scene url="#scene"/></scene></COLLADA>`;
}
