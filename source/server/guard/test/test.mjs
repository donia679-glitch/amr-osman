// Local test of the Worker with Node 18+ (Request / Response / crypto.subtle are built in) — no Cloudflare needed.
//   node server/guard/sync.mjs && node server/guard/test/test.mjs
// Makes its own certificate chain with openssl (root P-384 → intermediate P-384 → leaf P-256, Apple's marker OIDs),
// signs StoreKit-like JWS with the leaf key and pins the TEST root's fingerprint (APPLE_ROOT_SHA256).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPrivateKey, sign as nodeSign, createHash, X509Certificate } from "node:crypto";
import worker, { _resetRate } from "../worker.js";
import { sign as hsign, mintLicense } from "../lib/tokens.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "../../../apps/ipad");
const { optimize } = await import(join(APP, "engine/cut/cutOptimizer.js"));
const { priceQuote } = await import(join(APP, "modules/guard/price.js"));

let pass = 0, failN = 0;
const ok = (c, msg) => { if (c) { pass++; console.log("  ✓", msg); } else { failN++; console.log("  ✗", msg); } };

// ---------------------------------------------------------------- a test certificate chain
const D = mkdtempSync(join(tmpdir(), "guard-"));
const ossl = (...a) => execFileSync("openssl", a, { cwd: D, stdio: ["ignore", "pipe", "pipe"] });
writeFileSync(join(D, "ext.cnf"), `[ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
[mid]
basicConstraints = critical,CA:TRUE,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
1.2.840.113635.100.6.2.1 = ASN1:NULL
[leaf]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
1.2.840.113635.100.6.11.1 = ASN1:NULL
[leafNoOid]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
`);
function chain(tag, { leafExt = "leaf", leafDays = 30 } = {}) {
  ossl("ecparam", "-name", "secp384r1", "-genkey", "-noout", "-out", `${tag}root.key`);
  ossl("req", "-x509", "-new", "-key", `${tag}root.key`, "-sha384", "-days", "3650", "-subj", `/CN=Test Root ${tag}/O=Test`, "-extensions", "ca", "-config", join(D, "ext.cnf"), "-out", `${tag}root.pem`);
  ossl("ecparam", "-name", "secp384r1", "-genkey", "-noout", "-out", `${tag}mid.key`);
  ossl("req", "-new", "-key", `${tag}mid.key`, "-subj", `/CN=Test WWDR ${tag}/O=Test`, "-out", `${tag}mid.csr`);
  ossl("x509", "-req", "-in", `${tag}mid.csr`, "-CA", `${tag}root.pem`, "-CAkey", `${tag}root.key`, "-CAcreateserial", "-sha384", "-days", "1800", "-extfile", join(D, "ext.cnf"), "-extensions", "mid", "-out", `${tag}mid.pem`);
  ossl("ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", `${tag}leaf.key`);
  ossl("req", "-new", "-key", `${tag}leaf.key`, "-subj", `/CN=Test StoreKit ${tag}/O=Test`, "-out", `${tag}leaf.csr`);
  ossl("x509", "-req", "-in", `${tag}leaf.csr`, "-CA", `${tag}mid.pem`, "-CAkey", `${tag}mid.key`, "-CAcreateserial", "-sha256", "-days", String(leafDays), "-extfile", join(D, "ext.cnf"), "-extensions", leafExt, "-out", `${tag}leaf.pem`);
  const der = (f) => new X509Certificate(readFileSync(join(D, f))).raw;
  return { x5c: [der(`${tag}leaf.pem`), der(`${tag}mid.pem`), der(`${tag}root.pem`)].map((b) => b.toString("base64")), key: createPrivateKey(readFileSync(join(D, `${tag}leaf.key`))), rootFp: createHash("sha256").update(der(`${tag}root.pem`)).digest("hex") };
}
const A = chain("a"), B = chain("b"), C = chain("c", { leafExt: "leafNoOid" });
const noMs = (r) => JSON.stringify({ ...r, stats: { ...r.stats, ms: 0, runs: 0 } }); // timing differs, the plan doesn't
const b64u = (x) => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");
function jws(ch, payload, { alg = "ES256", x5c = ch.x5c, key = ch.key } = {}) {
  const h = b64u({ alg, x5c }), p = b64u(payload);
  const s = nodeSign("sha256", Buffer.from(`${h}.${p}`), { key, dsaEncoding: "ieee-p1363" });
  return `${h}.${p}.${s.toString("base64url")}`;
}
const now = Date.now();
const goodTx = { bundleId: "com.novera.studio", productId: "novera.studio.monthly", originalTransactionId: "2000000111", transactionId: "2000000222", expiresDate: now + 20 * 86400000, environment: "Sandbox", type: "Auto-Renewable Subscription" };

const ENV = { SESSION_SECRET: "test-session-secret-0123456789", LICENSE_SECRET: "test-license-secret-0123456789", ADMIN_KEY: "admin-key-0123456789abcdef", APPLE_ROOT_SHA256: A.rootFp, APPLE_ENVIRONMENTS: "Production,Sandbox", RATE_PER_MIN: "1000", REVOKED: "2000000999,badlic01" };
async function call(path, { method = "POST", body, token, origin = "novera://localhost", env = ENV } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (origin) headers.Origin = origin;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await worker.fetch(new Request(`https://guard.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env, {});
  let j = null;
  try { j = await res.clone().json(); } catch { /* empty */ }
  return { res, j, status: res.status };
}

console.log("health + CORS");
{
  const r = await call("/v1/health", { method: "GET" });
  ok(r.status === 200 && r.j.engines.includes("optimize") && r.j.engines.includes("price"), `health → engines ${r.j.engines.join(",")}`);
  ok(r.res.headers.get("Access-Control-Allow-Origin") === "novera://localhost", "CORS: the iOS app origin novera://localhost allowed");
  for (const o of ["app://novera", "https://donia679-glitch.github.io", "https://abc123.claudeusercontent.com", "null"]) ok((await call("/v1/health", { method: "GET", origin: o })).res.headers.get("Access-Control-Allow-Origin") === o, `CORS: ${o} allowed`);
  ok(!(await call("/v1/health", { method: "GET", origin: "https://evil.example" })).res.headers.get("Access-Control-Allow-Origin"), "CORS: other origins get no Allow-Origin");
  const pre = await call("/v1/engine/optimize", { method: "OPTIONS", origin: "app://novera" });
  ok(pre.status === 204 && /Authorization/.test(pre.res.headers.get("Access-Control-Allow-Headers")), "CORS preflight 204 + Authorization allowed");
}

console.log("App Store JWS");
let asToken;
{
  const r = await call("/v1/session", { body: { jws: jws(A, goodTx) } });
  ok(r.status === 200 && r.j.kind === "appstore" && r.j.until === goodTx.expiresDate && r.j.exp <= now + 3600e3 + 5000, "valid JWS → session token (≤ 1 h, until = expiresDate)");
  asToken = r.j.token;
  const bad = async (label, j, env = ENV, code) => { const x = await call("/v1/session", { body: { jws: j }, env }); ok(x.status === 401 && (!code || x.j.code === code), `${label} → ${x.status} ${x.j?.code}`); };
  const t = jws(A, goodTx).split(".");
  await bad("payload changed after signing", `${t[0]}.${b64u({ ...goodTx, expiresDate: now + 999e9 })}.${t[2]}`, ENV, "sig");
  await bad("wrong bundleId", jws(A, { ...goodTx, bundleId: "com.other.app" }), ENV, "bundle");
  await bad("product not ours", jws(A, { ...goodTx, productId: "other.product" }), ENV, "product");
  await bad("expired subscription", jws(A, { ...goodTx, expiresDate: now - 1000 }), ENV, "expired");
  await bad("refunded (revocationDate)", jws(A, { ...goodTx, revocationDate: now - 5 }), ENV, "revoked");
  await bad("Sandbox when only Production allowed", jws(A, goodTx), { ...ENV, APPLE_ENVIRONMENTS: "Production" }, "env");
  await bad("real Apple root pinned (test chain refused)", jws(A, goodTx), { ...ENV, APPLE_ROOT_SHA256: "" }, "root");
  await bad("another CA's chain", jws(B, goodTx), ENV, "root");
  await bad("leaf from another chain under our root", jws(A, goodTx, { x5c: [B.x5c[0], A.x5c[1], A.x5c[2]], key: B.key }), ENV, "chain");
  await bad("leaf without Apple's marker OID", jws(C, goodTx), { ...ENV, APPLE_ROOT_SHA256: C.rootFp }, "chain");
  await bad("alg none", jws(A, goodTx, { alg: "none" }), ENV, "jws");
  await bad("garbage", "abc.def.ghi", ENV);
  const rv = await call("/v1/session", { body: { jws: jws(A, { ...goodTx, originalTransactionId: "2000000999" }) } });
  ok(rv.status === 403, "originalTransactionId in REVOKED → 403");
}

console.log("licence keys");
let lkToken;
{
  const L = await mintLicense({ name: "Windows PC", days: 30 }, ENV.LICENSE_SECRET);
  const r = await call("/v1/session", { body: { license: L.key } });
  ok(r.status === 200 && r.j.kind === "license" && r.j.name === "Windows PC", "minted licence → session");
  lkToken = r.j.token;
  const forged = await mintLicense({ name: "x", days: 30 }, "another-secret-0123456789");
  ok((await call("/v1/session", { body: { license: forged.key } })).status === 401, "licence signed with another secret → 401");
  const old = await mintLicense({ name: "x", days: 1, now: now - 3 * 86400000 }, ENV.LICENSE_SECRET);
  ok((await call("/v1/session", { body: { license: old.key } })).j.code === "expired", "expired licence → 401 expired");
  const rv = await mintLicense({ name: "x", days: 30, id: "badlic01" }, ENV.LICENSE_SECRET);
  ok((await call("/v1/session", { body: { license: rv.key } })).status === 403, "revoked licence id → 403");
  ok((await call("/v1/session", { body: { license: asToken } })).status === 401, "a session token can't pass as a licence");
  ok((await call("/v1/session", { body: {} })).status === 400, "no credentials → 400");
}

console.log("admin route");
{
  ok((await call("/v1/admin/license", { body: { name: "a" }, token: "wrong-admin-key-xxxxxxxx" })).status === 401, "wrong admin key → 401");
  const r = await call("/v1/admin/license", { body: { name: "iPad 2", days: 10 }, token: ENV.ADMIN_KEY });
  ok(r.status === 200 && /^NVL1\./.test(r.j.key), "admin key → new licence");
  ok((await call("/v1/session", { body: { license: r.j.key } })).status === 200, "that licence works");
  ok((await call("/v1/admin/license", { body: {}, token: ENV.ADMIN_KEY, env: { ...ENV, ADMIN_KEY: "" } })).status === 404, "no ADMIN_KEY set → admin route off");
}

console.log("tokens + engines");
{
  ok((await call("/v1/engine/hello", { body: { args: [{ a: 2, b: 3 }] } })).status === 401, "no token → 401");
  ok((await call("/v1/engine/hello", { body: { args: [{}] }, token: asToken + "x" })).status === 401, "tampered token → 401");
  const expired = await hsign("s1", { sub: "lk:x", kind: "license", exp: now - 1, until: now + 1e9 }, ENV.SESSION_SECRET);
  const e = await call("/v1/engine/hello", { body: { args: [{}] }, token: expired });
  ok(e.status === 401 && e.j.code === "expired", "expired session token → 401 expired");
  const h = await call("/v1/engine/hello", { body: { args: [{ a: 2, b: 3 }] }, token: asToken });
  ok(h.status === 200 && h.j.result.sum === 5, "hello engine (App Store token)");
  ok((await call("/v1/engine/nope", { body: { args: [] }, token: lkToken })).status === 404, "unknown engine → 404");
  ok((await call("/v1/engine/__proto__", { body: { args: [] }, token: lkToken })).status === 404, "__proto__ isn't an engine");
  // the cut optimizer: same input → same plan as the device
  const parts = [];
  const sizes = [[72, 56], [72, 56], [80, 56], [80, 56], [76.4, 56], [76.4, 56], [57.4, 39.7], [57.4, 39.7], [70, 30], [70, 30], [88, 58], [58, 30], [120, 45], [45, 33], [33, 20], [200, 58], [200, 58]];
  sizes.forEach(([w, h], i) => parts.push({ name: `P${i}`, w, h }));
  const opts = { sheetW: 244, sheetH: 122, kerf: 0.4, trim: 1, timeCap: 2 };
  const local = optimize(parts, opts);
  const o = await call("/v1/engine/optimize", { body: { args: [parts, opts] }, token: lkToken });
  ok(o.status === 200 && noMs(o.j.result) === noMs(JSON.parse(JSON.stringify(local))), `optimize on the server = local (${local.sheets.length} sheets)`);
  const g = await call("/v1/engine/cutGroups", { body: { args: [[{ key: "MDF 18", parts }], opts] }, token: lkToken });
  ok(g.status === 200 && noMs(g.j.result[0].result) === noMs(JSON.parse(JSON.stringify(local))), "cutGroups (cutworker contract) = local");
  // the price math
  const inp = { P: { waste: 10, margin: 35, band: 12, laborUnit: 300, laborM2: 50, install: 1000, transport: 500, ctr: 2500, out: { "زجاج": 900 }, hw: { "مفصلة": 25, "مجرى درج 45 سم (زوج)": 180 } }, qcut: false,
    groups: [{ key: "MDF 18", m2: 400, sheet: { w: 244, h: 122 }, parts: [{ w: 72, h: 56, kind: "body", unit: "u1" }, { w: 72, h: 56, kind: "front", unit: "u1" }, { w: 80, h: 58, kind: "back", unit: "u2" }] }],
    units: [{ id: "u1", banding: 6.2, area: 0.8, hw: { "مفصلة": 4 }, ctrM: 0.8 }, { id: "u2", banding: 3, area: 0.46, hw: { "مجرى درج 45 سم (زوج)": 3 }, ctrM: 0 }],
    outside: [{ name: "زجاج", a: 0.3, unit: "u2" }], sheets: [{ w: 244, h: 122, used: 12700 }] };
  const pq = await call("/v1/engine/price", { body: { args: [inp] }, token: lkToken });
  const lq = priceQuote(inp);
  ok(pq.status === 200 && JSON.stringify(pq.j.result) === JSON.stringify(lq), `price on the server = local (total ${Math.round(lq.total)})`);
  ok(Math.abs(lq.perUnit.reduce((a, x) => a + x.price, 0) - lq.total) < 1e-6, "units' prices add up to the total");
}

console.log("rate limit");
{
  _resetRate();
  const env = { ...ENV, RATE_PER_MIN: "5" };
  const st = [];
  for (let i = 0; i < 7; i++) st.push((await call("/v1/engine/hello", { body: { args: [{}] }, token: lkToken, env })).status);
  ok(st.slice(0, 5).every((s) => s === 200) && st[5] === 429 && st[6] === 429, `5 per minute → ${st.join(" ")}`);
  ok((await call("/v1/engine/hello", { body: { args: [{}] }, token: asToken, env })).status === 200, "another token still has its own quota");
  let called = 0;
  const rl = { ...env, RL: { limit: async () => { called++; return { success: false }; } } };
  ok((await call("/v1/engine/hello", { body: { args: [{}] }, token: asToken, env: rl })).status === 429 && called === 1, "a Rate Limiting binding (RL) is used when present");
}
console.log("misconfigured server");
{
  const r = await call("/v1/session", { body: { license: (await mintLicense({ name: "x" }, ENV.LICENSE_SECRET)).key }, env: { ...ENV, LICENSE_SECRET: "" } });
  ok(r.status === 500 && /LICENSE_SECRET/.test(r.j.error), "missing secret → 500 with a clear message");
}
console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
