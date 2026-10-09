// NOVERA Studio — module «guard»: talks to the engines server (server/guard/worker.js).
// Session: App Store subscription JWS from the iOS app (window.webkit.messageHandlers.noveraEntitlement)
// or the owner's licence key → a ~1 h token kept on the device. Every failure throws quickly so the
// caller (registry.engine) runs the local engine instead — the app never waits more than TIMEOUT.

const CFG_KEY = "novera-guard", TOK_KEY = "novera-guard-tok";
export const TIMEOUT = 8000;
const OFFLINE_PAUSE = 60000; // after a network failure don't try again for a minute (no 8 s waits in a row)

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
export const status = { state: "idle", msg: "", until: 0, kind: "", name: "", server: 0, local: 0, last: null };
let offlineUntil = 0;

export function cfg() { const c = ls.get(CFG_KEY) || {}; return { url: String(c.url || "").trim().replace(/\/+$/, ""), license: String(c.license || "").trim() }; }
export function setCfg(c) { ls.set(CFG_KEY, { ...cfg(), ...c }); forget(); }
export function forget() { ls.set(TOK_KEY, null); offlineUntil = 0; }
export const hasNative = () => !!(window.noveraNative?.entitlement && window.webkit?.messageHandlers?.noveraEntitlement);

/** the iOS app answers with the active subscription's signed transaction (or {ok:false}) */
function nativeEntitlement(ms = 5000) {
  return new Promise((res) => {
    const token = Math.random().toString(36).slice(2);
    const prev = window.noveraEntitlementResult;
    const done = (v) => { clearTimeout(t); window.noveraEntitlementResult = prev; res(v); };
    const t = setTimeout(() => done(null), ms);
    window.noveraEntitlementResult = (tk, v) => { if (tk === token) done(v); else prev?.(tk, v); };
    try { window.webkit.messageHandlers.noveraEntitlement.postMessage({ token }); } catch { done(null); }
  });
}

async function post(url, path, body, token, ms = TIMEOUT) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url + path, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: ac.signal, cache: "no-store" });
    let j = null;
    try { j = await res.json(); } catch { /* not JSON */ }
    return { status: res.status, j };
  } catch (e) {
    offlineUntil = Date.now() + OFFLINE_PAUSE;
    status.state = "offline"; status.msg = ac.signal.aborted ? "السيرفر ما ردّش في 8 ثواني" : "مفيش اتصال بالسيرفر";
    throw Object.assign(new Error(status.msg), { offline: true });
  } finally { clearTimeout(t); }
}

/** a valid session token (cached ~1 h), else throws */
export async function session(force = false) {
  const { url, license } = cfg();
  if (!url) throw new Error("مفيش عنوان سيرفر");
  const c = ls.get(TOK_KEY);
  if (!force && c?.token && c.url === url && c.exp - 60000 > Date.now()) {
    if (status.state !== "ok") Object.assign(status, { state: "ok", msg: "", until: c.until, kind: c.kind, name: c.name });
    return c;
  }
  let cred = null;
  if (hasNative()) {
    const e = await nativeEntitlement();
    if (e?.ok && e.jws) cred = { jws: e.jws };
  }
  if (!cred && license) cred = { license };
  if (!cred) { status.state = "error"; status.msg = hasNative() ? "مفيش اشتراك فعّال على الجهاز ده" : "حط مفتاح الترخيص"; throw new Error(status.msg); }
  const r = await post(url, "/v1/session", cred);
  if (r.status !== 200 || !r.j?.ok) { status.state = "error"; status.msg = r.j?.error || `السيرفر رد ${r.status}`; throw new Error(status.msg); }
  const tok = { token: r.j.token, exp: r.j.exp, until: r.j.until, kind: r.j.kind, name: r.j.name || "", url, engines: Array.isArray(r.j.engines) ? r.j.engines : null };
  ls.set(TOK_KEY, tok);
  Object.assign(status, { state: "ok", msg: "", until: tok.until, kind: tok.kind, name: tok.name });
  return tok;
}

/** run engine `name` on the server with JSON-able args → its result (throws on anything else) */
export async function call(name, args) {
  const { url } = cfg();
  if (!url) throw new Error("guard: no server");
  if (Date.now() < offlineUntil) throw new Error("guard: offline");
  const t0 = performance.now();
  const body = { args: JSON.parse(JSON.stringify(args ?? [])) }; // functions / DOM never leave the device
  let tok = await session();
  // an engine this server doesn't have (not deployed yet) → straight to the local one, no request
  if (tok.engines && !tok.engines.includes(name)) throw new Error(`guard: the server has no ${name}`);
  let r = await post(url, `/v1/engine/${name}`, body, tok.token);
  if (r.status === 401) { tok = await session(true); r = await post(url, `/v1/engine/${name}`, body, tok.token); }
  if (r.status !== 200 || !r.j?.ok) throw new Error(r.j?.error || `engine ${name}: ${r.status}`);
  status.server++; status.last = { name, ms: Math.round(performance.now() - t0), at: Date.now() };
  return r.j.result;
}

export async function health() {
  const { url } = cfg();
  if (!url) throw new Error("مفيش عنوان سيرفر");
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT);
  try {
    const res = await fetch(url + "/v1/health", { signal: ac.signal, cache: "no-store" });
    return await res.json();
  } catch { offlineUntil = Date.now() + OFFLINE_PAUSE; throw new Error(ac.signal.aborted ? "السيرفر ما ردّش في 8 ثواني" : "مش قادر أوصل للسيرفر (العنوان صح؟ فيه نت؟)"); } finally { clearTimeout(t); }
}
/** the owner makes a licence key from the app (ADMIN_KEY typed each time, never stored) */
export async function mint(adminKey, name, days) {
  const { url } = cfg();
  if (!url) throw new Error("مفيش عنوان سيرفر");
  const r = await post(url, "/v1/admin/license", { name, days }, adminKey);
  if (r.status !== 200 || !r.j?.ok) throw new Error(r.j?.error || `السيرفر رد ${r.status}`);
  return r.j;
}
export const tokenInfo = () => ls.get(TOK_KEY);
export const resetOffline = () => { offlineUntil = 0; };
