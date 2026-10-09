// Checks a StoreKit 2 signed transaction (the JWS the iOS app gets from Transaction.currentEntitlements →
// jwsRepresentation) with WebCrypto only:
//  1. header alg ES256 + x5c = [leaf, intermediate, root]
//  2. the root is Apple Root CA - G3 (its SHA-256 fingerprint is pinned; tests pass their own)
//  3. every certificate is signed by the next one, is inside its validity dates, the intermediate is a CA,
//     the leaf / intermediate carry Apple's marker OIDs (…6.11.1 / …6.2.1)
//  4. the JWS signature (ES256) with the leaf's key
//  5. the payload: bundleId, productId in the allowed list, not revoked, expiresDate in the future, environment
import { b64Decode, utf8, hex } from "./b64.js";
import { parseCert, signedBy, importKey, sameBytes } from "./x509.js";

/** Apple Root CA - G3, SHA-256 of the DER certificate (https://www.apple.com/certificateauthority/) */
export const APPLE_ROOT_G3_SHA256 = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";
export const OID_LEAF = "1.2.840.113635.100.6.11.1";
export const OID_INTERMEDIATE = "1.2.840.113635.100.6.2.1";

const fail = (code, msg) => { const e = new Error(msg); e.code = code; e.apple = true; throw e; };

/**
 * @param {string} jws
 * @param {{bundleId: string, productIds: string[], rootSha256?: string, environments?: string[], now?: number, checkOids?: boolean}} cfg
 * @returns {Promise<{productId, originalTransactionId, transactionId, expiresDate, environment, appAccountToken}>}
 */
export async function verifyTransaction(jws, cfg) {
  const now = cfg.now ?? Date.now();
  const parts = String(jws || "").split(".");
  if (parts.length !== 3) fail("jws", "مش JWS");
  let header, payload;
  try { header = JSON.parse(utf8(b64Decode(parts[0]))); payload = JSON.parse(utf8(b64Decode(parts[1]))); } catch { fail("jws", "JWS مش مقروء"); }
  if (header.alg !== "ES256") fail("jws", "alg لازم ES256");
  if (!Array.isArray(header.x5c) || header.x5c.length < 3) fail("chain", "سلسلة الشهادات ناقصة");
  let certs;
  try { certs = header.x5c.slice(0, 3).map((c) => parseCert(b64Decode(c))); } catch { fail("chain", "شهادات مش مقروءة"); }
  const [leaf, mid, root] = certs;
  // 2. pinned root
  const fp = hex(await crypto.subtle.digest("SHA-256", root.der));
  const want = String(cfg.rootSha256 || APPLE_ROOT_G3_SHA256).toLowerCase().replace(/[^0-9a-f]/g, "");
  if (fp !== want) fail("root", "الشهادة الأم مش بتاعة Apple");
  // 3. chain
  for (const c of certs) if (now < c.notBefore || now > c.notAfter) fail("chain", "شهادة منتهية أو لسه ما بدأتش");
  if (!sameBytes(leaf.issuer, mid.subject) || !sameBytes(mid.issuer, root.subject)) fail("chain", "السلسلة مش متوصلة");
  if (!mid.basicCA) fail("chain", "الشهادة الوسيطة مش CA");
  if (cfg.checkOids !== false) {
    if (!leaf.exts.includes(OID_LEAF)) fail("chain", "شهادة التوقيع مش بتاعة App Store");
    if (!mid.exts.includes(OID_INTERMEDIATE)) fail("chain", "الشهادة الوسيطة مش بتاعة Apple WWDR");
  }
  if (!(await signedBy(root, root))) fail("chain", "الشهادة الأم مش موقّعة صح");
  if (!(await signedBy(mid, root))) fail("chain", "الوسيطة مش موقّعة من الأم");
  if (!(await signedBy(leaf, mid))) fail("chain", "شهادة التوقيع مش موقّعة من الوسيطة");
  if (leaf.curve !== "P-256") fail("chain", "ES256 محتاج P-256");
  // 4. JWS signature
  const key = await importKey(leaf);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64Decode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) fail("sig", "التوقيع غلط");
  // 5. the transaction itself
  if (cfg.bundleId && payload.bundleId !== cfg.bundleId) fail("bundle", "bundleId مختلف");
  if (!(cfg.productIds || []).includes(payload.productId)) fail("product", "الاشتراك ده مش من اشتراكات التطبيق");
  if (payload.revocationDate) fail("revoked", "الاشتراك اتلغى (استرداد)");
  const envs = cfg.environments || ["Production"];
  if (payload.environment && !envs.includes(payload.environment)) fail("env", `بيئة ${payload.environment} مش مسموحة`);
  const exp = +payload.expiresDate || 0;
  if (!exp || exp <= now) fail("expired", "الاشتراك منتهي");
  return { productId: payload.productId, originalTransactionId: String(payload.originalTransactionId || ""), transactionId: String(payload.transactionId || ""), expiresDate: exp, environment: payload.environment || "", appAccountToken: payload.appAccountToken || "" };
}
