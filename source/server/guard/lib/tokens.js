// HMAC-SHA256 signed tokens (WebCrypto): short session tokens and the owner's licence keys.
//   session: "s1.<payload>.<sig>"   payload {sub, kind: "appstore"|"license", exp (ms), until (ms), name?}
//   licence: "NVL1.<payload>.<sig>" payload {i: id, n: name, e: expiry (ms), d?: note}
// Different secrets for each (SESSION_SECRET / LICENSE_SECRET) so a session token can never pass as a licence.
import { b64urlEncode, b64Decode, utf8 } from "./b64.js";

const keys = new Map();
async function hmacKey(secret) {
  if (!secret || String(secret).length < 16) throw Object.assign(new Error("السيرفر مش متظبط: SESSION_SECRET / LICENSE_SECRET ناقص أو أقصر من 16 حرف"), { status: 500 });
  let k = keys.get(secret);
  if (!k) { k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); keys.set(secret, k); }
  return k;
}
export async function sign(prefix, payload, secret) {
  const body = `${prefix}.${b64urlEncode(JSON.stringify(payload))}`;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(body)));
  return `${body}.${b64urlEncode(sig)}`;
}
/** → payload, or null when the token is malformed / forged (constant-time check by WebCrypto) */
export async function open(prefix, token, secret) {
  const p = String(token || "").trim().split(".");
  if (p.length !== 3 || p[0] !== prefix) return null;
  let sig;
  try { sig = b64Decode(p[2]); } catch { return null; }
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), sig, new TextEncoder().encode(`${p[0]}.${p[1]}`));
  if (!ok) return null;
  try { return JSON.parse(utf8(b64Decode(p[1]))); } catch { return null; }
}
export const SESSION = "s1", LICENSE = "NVL1";
/** a licence key for a device that has no App Store subscription (web / Windows / the owner's own devices) */
export async function mintLicense({ name = "", days = 365, id, now = Date.now() }, secret) {
  const payload = { i: id || b64urlEncode(crypto.getRandomValues(new Uint8Array(6))), n: String(name).slice(0, 60), e: now + Math.round(days * 86400000) };
  return { key: await sign(LICENSE, payload, secret), ...payload };
}
