// NOVERA Studio — the projects kept on this device (IndexedDB; localStorage when IndexedDB is not available).
// Every project is stored whole: { id, name, updatedAt, project }.

const DB = "novera-projects", STORE = "p", BK = "b", LS = "novera-projects-ls", IDX = "novera-projects-idx";
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    try {
      const r = indexedDB.open(DB, 2);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "id" }); if (!d.objectStoreNames.contains(BK)) d.createObjectStore(BK, { keyPath: "k" }); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    } catch (e) { reject(e); }
  });
  return dbp;
}
async function run(mode, make, store = STORE) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = make(t.objectStore(store));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
const lsAll = () => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } };
const lsSave = (m) => { try { localStorage.setItem(LS, JSON.stringify(m)); } catch { /* full */ } };

/** survey state for the home list: measured, still measuring (something typed), or none */
export const srvOf = (sv) => (sv?.status === "measured" ? "measured" : sv?.draft?.walls?.some((w) => +w.L > 0) ? "measuring" : null);
const summary = (r) => ({ id: r.id, name: r.name, updatedAt: r.updatedAt || "", units: r.project?.units?.length || 0, room: !!r.project?.room, stages: r.project?.stages || null, total: r.project?.quoteTotal || 0, variants: r.project?.variants?.length || 0, srv: srvOf(r.project?.survey) });

/** newest first */
export async function list() {
  let all;
  try { all = await run("readonly", (s) => s.getAll()); } catch { all = Object.values(lsAll()); }
  return (all || []).map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function get(id) {
  try { const r = await run("readonly", (s) => s.get(id)); if (r) return r; } catch { /* fall through */ }
  return lsAll()[id] || null;
}
export async function put(project, updatedAt = new Date().toISOString()) {
  const rec = { id: project.id, name: project.name, updatedAt, project: JSON.parse(JSON.stringify(project)) };
  try { await run("readwrite", (s) => s.put(rec)); }
  catch { const m = lsAll(); m[rec.id] = rec; lsSave(m); }
  idxSet(rec.id, rec.name, updatedAt);
  backup(rec).catch(() => {});
  vaultPut(rec);
  return rec;
}
export async function del(id) {
  try { await run("readwrite", (s) => s.delete(id)); } catch { /* fall through */ }
  const m = lsAll();
  if (m[id]) { delete m[id]; lsSave(m); }
  idxDel(id);
}

// ------------------------------------------------------------------ safety net
// 1) an index of the projects this device knows (localStorage) — at start-up it tells if the database lost something
const idxAll = () => { try { return JSON.parse(localStorage.getItem(IDX) || "{}"); } catch { return {}; } };
const idxSave = (m) => { try { localStorage.setItem(IDX, JSON.stringify(m)); } catch { /* full */ } };
function idxSet(id, name, updatedAt) { const m = idxAll(); m[id] = { name, updatedAt }; idxSave(m); }
function idxDel(id) { const m = idxAll(); if (m[id]) { m[id].deleted = new Date().toISOString(); idxSave(m); } }
/** projects the index remembers but the database no longer has (not ones the user deleted) */
export async function missing() {
  const m = idxAll(), have = new Set((await list().catch(() => [])).map((x) => x.id));
  return Object.entries(m).filter(([id, v]) => !v.deleted && !have.has(id)).map(([id, v]) => ({ id, ...v }));
}

// 2) snapshots inside the database: one every 10 minutes of work (and whenever the units count changes), 12 per project; deleted projects keep theirs
const KEEP = 12, EVERY = 10 * 60 * 1000;
const lastBk = {};
async function backup(rec) {
  const n = rec.project?.units?.length || 0, prev = lastBk[rec.id], now = Date.now();
  if (prev && now - prev.t < EVERY && prev.n === n) return;
  lastBk[rec.id] = { t: now, n };
  const k = `${rec.id}|${rec.updatedAt}`;
  await run("readwrite", (s) => s.put({ k, id: rec.id, name: rec.name, updatedAt: rec.updatedAt, units: n, project: rec.project }), BK);
  const mine = (await backupsOf(rec.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  for (const b of mine.slice(KEEP)) await run("readwrite", (s) => s.delete(b.k), BK).catch(() => {});
}
async function backupsOf(id) {
  const all = await run("readonly", (s) => s.getAll(), BK).catch(() => []);
  return (all || []).filter((b) => b.id === id).map(({ project, ...b }) => b);
}
/** every snapshot on this device, newest first (without the project bodies) */
export async function backups() {
  const all = await run("readonly", (s) => s.getAll(), BK).catch(() => []);
  return (all || []).map(({ project, ...b }) => b).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function backupGet(k) { return run("readonly", (s) => s.get(k), BK).catch(() => null); }

// 3) the native vault: inside the iPad/iPhone app every save also goes to a file in the app's Documents folder
//    (Files app → On My iPad → NOVERA Studio → Projects) — it survives WebKit clearing its storage.
const vault = window.webkit?.messageHandlers?.noveraVault || null;
export const hasVault = () => !!vault;
const vaultT = {};
function vaultPut(rec) {
  if (!vault) return;
  clearTimeout(vaultT[rec.id]);
  vaultT[rec.id] = setTimeout(() => { try { vault.postMessage({ op: "put", id: rec.id, name: rec.name, updatedAt: rec.updatedAt, json: JSON.stringify(rec) }); } catch { /* */ } }, 3000);
}
const pending = {};
function ask(op, extra = {}) {
  if (!vault) return Promise.resolve(null);
  const token = Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    pending[token] = resolve;
    setTimeout(() => { if (pending[token]) { delete pending[token]; resolve(null); } }, 8000);
    try { vault.postMessage({ op, token, ...extra }); } catch { delete pending[token]; resolve(null); }
  });
}
window.noveraVaultResult = (token, data) => { const r = pending[token]; if (r) { delete pending[token]; r(data); } };
/** files in the vault: [{id, name, updatedAt, size}] newest first */
export async function vaultList() {
  const r = await ask("list");
  const arr = Array.isArray(r) ? r : [];
  return arr.map((f) => ({ id: f.id, name: f.name, updatedAt: f.updatedAt || "", size: f.size || 0 })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function vaultGet(id) {
  const r = await ask("get", { id });
  try { return typeof r === "string" ? JSON.parse(r) : r || null; } catch { return null; }
}
