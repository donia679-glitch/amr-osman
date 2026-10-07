// NOVERA Studio — survey media (wall photos, voice notes, signatures) kept outside the project JSON:
// IndexedDB on the device, and — when the online copy is open — one small cloud document per file,
// so the office sees what the surveyor shot. The project only stores the ids.
const DB = "novera-media", ST = "m";
const MAX_CLOUD = 240000; // a cloud document holds up to 256 KiB
const mem = new Map();
let dbp = null;
const uid = () => Math.random().toString(36).slice(2, 10);

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: "id" });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return dbp;
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(ST, mode);
    const q = fn(t.objectStore(ST));
    t.oncomplete = () => res(q?.result);
    t.onerror = () => rej(t.error);
  });
}

/** the data URL if it is already loaded (for drawing straight away) */
export const cached = (id) => mem.get(id)?.data || null;
export const info = (id) => mem.get(id) || null;

export async function put(data, meta = {}) {
  const rec = { id: meta.id || "m" + uid(), data, type: meta.type || (data.slice(5, data.indexOf(";")) || "application/octet-stream"), pid: meta.pid || "", at: new Date().toISOString(), synced: false, size: data.length, dur: meta.dur || 0 };
  mem.set(rec.id, rec);
  try { await tx("readwrite", (s) => s.put(rec)); } catch { /* memory only */ }
  return rec;
}
export async function get(id, cloud) {
  if (mem.has(id)) return mem.get(id);
  try { const r = await tx("readonly", (s) => s.get(id)); if (r) { mem.set(id, r); return r; } } catch { /* fall through */ }
  if (cloud?.db && cloud?.me) {
    try {
      const s = await cloud.db.doc(`data/users/${cloud.me}/${id}`).get();
      if (s.exists) {
        const v = s.data();
        const rec = { id, data: v.d, type: v.t, pid: v.p || "", at: v.at || "", synced: true, size: (v.d || "").length, dur: v.dur || 0 };
        mem.set(id, rec);
        try { await tx("readwrite", (st) => st.put(rec)); } catch { /* keep in memory */ }
        return rec;
      }
    } catch { /* offline */ }
  }
  return null;
}
/** load every id into memory; returns how many are still missing */
export async function preload(ids, cloud) {
  let miss = 0;
  await Promise.all([...new Set(ids)].map(async (id) => { if (!(await get(id, cloud))) miss++; }));
  return miss;
}
export async function del(id) {
  mem.delete(id);
  try { await tx("readwrite", (s) => s.delete(id)); } catch { /* gone anyway */ }
}
/** push what was not sent yet; files over the cloud limit stay on the device (flag big) */
export async function sync(cloud) {
  if (!cloud?.db || !cloud?.me) return { sent: 0, left: 0 };
  let all = [];
  try { all = await tx("readonly", (s) => s.getAll()); } catch { all = [...mem.values()]; }
  let sent = 0, left = 0;
  for (const r of all) {
    if (r.synced) continue;
    if (r.size > MAX_CLOUD) { if (!r.big) { r.big = true; try { await tx("readwrite", (s) => s.put(r)); } catch { /* */ } } continue; }
    try {
      await cloud.db.doc(`data/users/${cloud.me}/${r.id}`).set({ d: r.data, t: r.type, p: r.pid, at: r.at, dur: r.dur || 0 });
      r.synced = true; sent++;
      mem.set(r.id, r);
      await tx("readwrite", (s) => s.put(r));
    } catch { left++; }
  }
  return { sent, left };
}
export async function pendingCount() {
  try { const all = await tx("readonly", (s) => s.getAll()); return all.filter((r) => !r.synced && !r.big).length; } catch { return 0; }
}

/** photo file → JPEG data URL (long side ≤ max) small enough for one cloud document */
export function imageFile(file, max = 1600) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      res(fitJpeg(img, img.naturalWidth, img.naturalHeight, max));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("الصورة مش بتتفتح")); };
    img.src = url;
  });
}
/** draw any image/canvas into a JPEG, shrinking until it fits the cloud limit */
export function fitJpeg(src, w, h, max = 1600) {
  let s = Math.min(1, max / Math.max(w, h)), q = 0.72, out = "";
  for (let k = 0; k < 7; k++) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, 0, c.width, c.height);
    out = c.toDataURL("image/jpeg", q);
    if (out.length <= MAX_CLOUD) break;
    if (q > 0.5) q -= 0.1; else s *= 0.8;
  }
  return out;
}
export function blobToData(blob) {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); });
}

// ---- voice notes
let rec = null;
export const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
/** start recording; resolves once the microphone is open. stopRecord() gives { data, dur }.
 *  At maxSec the recording stops by itself and its result goes to onAuto(result) — once, nothing is restarted. */
export async function startRecord(maxSec = 60, onTick, onAuto) {
  if (rec) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported?.(t));
  const mr = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24000 });
  const chunks = [];
  const t0 = Date.now();
  const me = { mr, stream, chunks, t0, done: null, auto: false, tick: 0 };
  me.tick = setInterval(() => {
    if (rec !== me) { clearInterval(me.tick); return; }
    const s = (Date.now() - t0) / 1000;
    onTick?.(Math.min(s, maxSec));
    if (s >= maxSec && !me.auto) { me.auto = true; stopRecord().then((r) => { try { onAuto?.(r); } catch (err) { console.error(err); } }); }
  }, 250);
  rec = me;
  rec.done = new Promise((res) => {
    mr.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mr.mimeType || mimeType || "audio/mp4" });
      res({ data: await blobToData(blob), dur: Math.round((Date.now() - t0) / 1000) });
    };
  });
  mr.start(500);
}
export async function stopRecord() {
  if (!rec) return null;
  const r = rec;
  rec = null;
  clearInterval(r.tick);
  if (r.mr.state !== "inactive") r.mr.stop();
  return r.done;
}
export const recording = () => !!rec;
