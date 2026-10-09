// NOVERA Studio — «🛡 حماية المحركات» server (Cloudflare Worker, ES module).
// The smart engines (cut fitting, auto designs ranking, pricing, the cut optimizer) run HERE, after the caller
// proves a valid subscription (App Store JWS) or an owner licence key. The app falls back to its local engines
// whenever this server can't be reached — nothing in the app depends on it.
//
// Routes
//   GET  /v1/health                        → {ok, engines:[…], time}
//   POST /v1/session  {jws} | {license}     → {ok, token, exp, until, kind, name}   (token ≈ 1 h, HMAC)
//   POST /v1/engine/<name>  {args:[…]}      → {ok, result, ms}      header Authorization: Bearer <token>
//   POST /v1/admin/license {name, days}     → {ok, key, exp, id}    header Authorization: Bearer <ADMIN_KEY>
//
// Settings (wrangler.toml [vars] / dashboard → Settings → Variables; secrets with `wrangler secret put`):
//   SESSION_SECRET (secret)  LICENSE_SECRET (secret)  ADMIN_KEY (secret, optional — no admin route without it)
//   BUNDLE_ID  PRODUCT_IDS (comma list)  APPLE_ENVIRONMENTS ("Production" or "Production,Sandbox")
//   APPLE_ROOT_SHA256 (optional — only tests change it)  ALLOWED_ORIGINS (extra, comma list)
//   RATE_PER_MIN (default 60)  MAX_ENGINE_MS (default 8000; the free plan stops a request after ~10 ms of CPU)
//   REVOKED (comma list of licence ids / originalTransactionIds to refuse)   RL (optional Rate Limiting binding)
import { verifyTransaction } from "./lib/apple.js";
import { sign, open, SESSION, LICENSE, mintLicense } from "./lib/tokens.js";
import { ENGINES } from "./engines/index.js";

const VERSION = "guard-1";
const SESSION_MS = 60 * 60 * 1000;
const MAX_BODY = 4 * 1024 * 1024;

// ---------------------------------------------------------------- CORS
const BASE_ORIGINS = ["novera://localhost", "app://novera", "https://donia679-glitch.github.io", "https://claude.ai", "null"];
const ORIGIN_RX = [/^https:\/\/[a-z0-9-]+\.claudeusercontent\.com$/, /^https:\/\/[a-z0-9-]+\.claude\.ai$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
function allowedOrigin(origin, env) {
  if (!origin) return null;
  const extra = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (BASE_ORIGINS.includes(origin) || extra.includes(origin) || ORIGIN_RX.some((r) => r.test(origin))) return origin;
  return null;
}
function cors(req, env) {
  const o = allowedOrigin(req.headers.get("Origin"), env);
  return o ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "86400", Vary: "Origin" } : { Vary: "Origin" };
}
const json = (req, env, status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(req, env), ...extra } });
const err = (req, env, status, code, msg) => json(req, env, status, { ok: false, code, error: msg });

// ---------------------------------------------------------------- rate limit (per token / per IP for sessions)
// In-memory per Worker instance (best effort, free). For a hard limit add a Rate Limiting binding named RL.
const hits = new Map();
export function _resetRate() { hits.clear(); }
async function limited(env, key, perMin) {
  if (env.RL?.limit) { try { const { success } = await env.RL.limit({ key }); return !success; } catch { /* fall through */ } }
  const now = Date.now(), w = Math.floor(now / 60000);
  const h = hits.get(key);
  if (!h || h.w !== w) { hits.set(key, { w, n: 1 }); if (hits.size > 5000) for (const [k, v] of hits) if (v.w !== w) hits.delete(k); return false; }
  h.n++;
  return h.n > perMin;
}

// ---------------------------------------------------------------- helpers
const list = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
async function body(req) {
  const len = +req.headers.get("Content-Length") || 0;
  if (len > MAX_BODY) throw Object.assign(new Error("الطلب كبير قوي"), { status: 413 });
  const t = await req.text();
  if (t.length > MAX_BODY) throw Object.assign(new Error("الطلب كبير قوي"), { status: 413 });
  try { return t ? JSON.parse(t) : {}; } catch { throw Object.assign(new Error("JSON غلط"), { status: 400 }); }
}
const bearer = (req) => (/^Bearer\s+(.+)$/i.exec(req.headers.get("Authorization") || "") || [])[1] || "";

async function session(req, env) {
  const b = await body(req);
  const now = Date.now();
  const revoked = list(env.REVOKED);
  let sub, kind, until, name = "";
  if (b.jws) {
    const t = await verifyTransaction(b.jws, {
      bundleId: env.BUNDLE_ID || "com.novera.studio",
      productIds: list(env.PRODUCT_IDS || "novera.studio.monthly,novera.studio.yearly"),
      environments: list(env.APPLE_ENVIRONMENTS || "Production"),
      rootSha256: env.APPLE_ROOT_SHA256 || undefined,
      now,
    });
    if (revoked.includes(t.originalTransactionId)) return err(req, env, 403, "revoked", "الاشتراك ده متوقف");
    sub = `as:${t.originalTransactionId || t.transactionId}`; kind = "appstore"; until = t.expiresDate; name = t.productId;
  } else if (b.license) {
    const L = await open(LICENSE, b.license, env.LICENSE_SECRET);
    if (!L) return err(req, env, 401, "license", "مفتاح الترخيص غلط");
    if (!(L.e > now)) return err(req, env, 401, "expired", "مفتاح الترخيص منتهي");
    if (revoked.includes(L.i)) return err(req, env, 403, "revoked", "مفتاح الترخيص ده متوقف");
    sub = `lk:${L.i}`; kind = "license"; until = L.e; name = L.n || "";
  } else return err(req, env, 400, "missing", "ابعت jws أو license");
  const exp = Math.min(now + SESSION_MS, until);
  const token = await sign(SESSION, { sub, kind, exp, until, name }, env.SESSION_SECRET);
  return json(req, env, 200, { ok: true, token, exp, until, kind, name, engines: Object.keys(ENGINES) });
}

async function runEngine(req, env, name, ctx) {
  const t = bearer(req);
  const S = t && (await open(SESSION, t, env.SESSION_SECRET));
  if (!S) return err(req, env, 401, "auth", "محتاج تسجيل (session)");
  if (!(S.exp > Date.now())) return err(req, env, 401, "expired", "الجلسة خلصت — اطلب واحدة جديدة");
  if (list(env.REVOKED).includes(S.sub.slice(3))) return err(req, env, 403, "revoked", "متوقف");
  if (await limited(env, `e:${S.sub}`, +env.RATE_PER_MIN || 60)) return err(req, env, 429, "rate", "طلبات كتير — استنى دقيقة");
  const E = Object.prototype.hasOwnProperty.call(ENGINES, name) ? ENGINES[name] : null;
  if (!E) return err(req, env, 404, "engine", `مفيش محرك اسمه ${name}`);
  const b = await body(req);
  const args = Array.isArray(b.args) ? b.args : [];
  const t0 = Date.now();
  const result = await E.run(args, { maxMs: +env.MAX_ENGINE_MS || 8000, sub: S.sub });
  return json(req, env, 200, { ok: true, result, ms: Date.now() - t0 });
}

async function admin(req, env) {
  if (!env.ADMIN_KEY || String(env.ADMIN_KEY).length < 16) return err(req, env, 404, "off", "مقفول");
  const t = bearer(req);
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([t, env.ADMIN_KEY].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  const same = new Uint8Array(a).every((v, i) => v === new Uint8Array(b)[i]);
  if (!same) { await limited(env, `adm:${req.headers.get("CF-Connecting-IP") || ""}`, 10); return err(req, env, 401, "auth", "مفتاح الإدارة غلط"); }
  const q = await body(req);
  const L = await mintLicense({ name: q.name || "", days: Math.max(1, Math.min(3660, +q.days || 365)) }, env.LICENSE_SECRET);
  return json(req, env, 200, { ok: true, ...L, exp: L.e, id: L.i });
}

export default {
  async fetch(req, env = {}, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, env) });
    try {
      if (url.pathname === "/" || url.pathname === "/v1/health") return json(req, env, 200, { ok: true, v: VERSION, engines: Object.keys(ENGINES), time: Date.now() });
      if (req.method !== "POST") return err(req, env, 405, "method", "POST بس");
      if (url.pathname === "/v1/session") {
        const ip = req.headers.get("CF-Connecting-IP") || "local";
        if (await limited(env, `s:${ip}`, Math.max(10, Math.round((+env.RATE_PER_MIN || 60) / 2)))) return err(req, env, 429, "rate", "طلبات كتير — استنى دقيقة");
        return await session(req, env);
      }
      const m = /^\/v1\/engine\/([A-Za-z0-9_]{1,40})$/.exec(url.pathname);
      if (m) return await runEngine(req, env, m[1], ctx);
      if (url.pathname === "/v1/admin/license") return await admin(req, env);
      return err(req, env, 404, "route", "مش موجود");
    } catch (e) {
      if (e.apple) return err(req, env, 401, e.code, e.message); // a refused App Store transaction
      return err(req, env, e.status || 500, "server", e.status ? e.message : "حصلت مشكلة في السيرفر");
    }
  },
};
