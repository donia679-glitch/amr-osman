// NOVERA Studio — the projects kept on this device (IndexedDB; localStorage when IndexedDB is not available).
// Every project is stored whole: { id, name, updatedAt, project }.

const DB = "novera-projects", STORE = "p", LS = "novera-projects-ls";
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    } catch (e) { reject(e); }
  });
  return dbp;
}
async function run(mode, make) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = make(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
const lsAll = () => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } };
const lsSave = (m) => { try { localStorage.setItem(LS, JSON.stringify(m)); } catch { /* full */ } };

const summary = (r) => ({ id: r.id, name: r.name, updatedAt: r.updatedAt || "", units: r.project?.units?.length || 0, room: !!r.project?.room });

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
  return rec;
}
export async function del(id) {
  try { await run("readwrite", (s) => s.delete(id)); } catch { /* fall through */ }
  const m = lsAll();
  if (m[id]) { delete m[id]; lsSave(m); }
}
