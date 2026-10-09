// A minimal DER / X.509 reader — just what checking Apple's StoreKit 2 certificate chain needs:
// the signed part (tbsCertificate), the signature, the public key, the validity dates, issuer / subject
// and the extension OIDs. WebCrypto only (works in Cloudflare Workers and Node 18+).

function tlv(buf, off) {
  const tag = buf[off];
  let len = buf[off + 1], hdr = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n < 1 || n > 4) throw new Error("der: bad length");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[off + 2 + i];
    hdr = 2 + n;
  }
  const start = off + hdr, end = start + len;
  if (end > buf.length) throw new Error("der: truncated");
  return { tag, start, end, off, hdr };
}
function children(buf, node) {
  const out = [];
  for (let o = node.start; o < node.end;) { const c = tlv(buf, o); out.push(c); o = c.end; }
  return out;
}
export function oidString(bytes) {
  const parts = [];
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v = v * 128 + (bytes[i] & 0x7f);
    if (!(bytes[i] & 0x80)) { parts.push(v); v = 0; }
  }
  const first = parts.shift();
  return [Math.min(2, Math.floor(first / 40)), first - 40 * Math.min(2, Math.floor(first / 40)), ...parts].join(".");
}
function parseTime(buf, n) {
  const s = new TextDecoder().decode(buf.subarray(n.start, n.end));
  let y, rest;
  if (n.tag === 0x17) { y = +s.slice(0, 2); y += y < 50 ? 2000 : 1900; rest = s.slice(2); }
  else if (n.tag === 0x18) { y = +s.slice(0, 4); rest = s.slice(4); }
  else throw new Error("der: bad time");
  const m = /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/.exec(rest);
  if (!m) throw new Error("der: time format");
  return Date.UTC(y, +m[1] - 1, +m[2], +m[3], +m[4], +(m[5] || 0));
}
const SIG_ALGS = { "1.2.840.10045.4.3.2": "SHA-256", "1.2.840.10045.4.3.3": "SHA-384", "1.2.840.10045.4.3.4": "SHA-512" };
const CURVES = { "1.2.840.10045.3.1.7": "P-256", "1.3.132.0.34": "P-384", "1.3.132.0.35": "P-521" };
const CURVE_BYTES = { "P-256": 32, "P-384": 48, "P-521": 66 };

/** parse one DER certificate (Uint8Array) */
export function parseCert(der) {
  const root = tlv(der, 0);
  const [tbs, sigAlg, sigVal] = children(der, root);
  const t = children(der, tbs);
  let i = 0;
  if (t[0].tag === 0xa0) i++; // [0] version
  const serial = t[i++], tbsAlg = t[i++], issuer = t[i++], validity = t[i++], subject = t[i++], spki = t[i++];
  const exts = [];
  let basicCA = false;
  for (; i < t.length; i++) {
    if (t[i].tag !== 0xa3) continue;
    const seq = children(der, t[i])[0];
    for (const e of children(der, seq)) {
      const ec = children(der, e);
      const oid = oidString(der.subarray(ec[0].start, ec[0].end));
      exts.push(oid);
      if (oid === "2.5.29.19") { // basicConstraints: OCTET STRING { SEQUENCE { BOOLEAN cA? } }
        const oct = ec[ec.length - 1];
        const bc = tlv(der, oct.start);
        const inner = children(der, bc);
        if (inner[0] && inner[0].tag === 0x01) basicCA = der[inner[0].start] !== 0;
      }
    }
  }
  const [nb, na] = children(der, validity);
  const algOid = oidString(der.subarray(children(der, sigAlg)[0].start, children(der, sigAlg)[0].end));
  const spkiAlg = children(der, children(der, spki)[0]);
  const curve = spkiAlg[1] ? CURVES[oidString(der.subarray(spkiAlg[1].start, spkiAlg[1].end))] : null;
  return {
    der,
    tbs: der.subarray(tbs.off, tbs.end),
    sigHash: SIG_ALGS[algOid] || null,
    sig: der.subarray(sigVal.start + 1, sigVal.end), // BIT STRING: skip the "unused bits" byte
    issuer: der.subarray(issuer.off, issuer.end),
    subject: der.subarray(subject.off, subject.end),
    spki: der.subarray(spki.off, spki.end),
    curve,
    notBefore: parseTime(der, nb),
    notAfter: parseTime(der, na),
    exts,
    basicCA,
    serial: der.subarray(serial.start, serial.end),
  };
}
/** DER ECDSA-Sig-Value {r, s} → raw r‖s (what WebCrypto verifies) */
export function derSigToRaw(sig, size) {
  const seq = tlv(sig, 0);
  const [r, s] = children(sig, seq);
  const fix = (n) => {
    let b = sig.subarray(n.start, n.end);
    while (b.length > size && b[0] === 0) b = b.subarray(1);
    if (b.length > size) throw new Error("ecdsa: bad integer");
    const o = new Uint8Array(size); o.set(b, size - b.length); return o;
  };
  const out = new Uint8Array(size * 2); out.set(fix(r), 0); out.set(fix(s), size);
  return out;
}
export async function importKey(cert) {
  if (!cert.curve) throw new Error("cert: not an EC key");
  return crypto.subtle.importKey("spki", cert.spki, { name: "ECDSA", namedCurve: cert.curve }, false, ["verify"]);
}
/** does `parent` sign `child`? */
export async function signedBy(child, parent) {
  if (!child.sigHash) throw new Error("cert: unsupported signature algorithm");
  const key = await importKey(parent);
  const raw = derSigToRaw(child.sig, CURVE_BYTES[parent.curve]);
  return crypto.subtle.verify({ name: "ECDSA", hash: child.sigHash }, key, raw, child.tbs);
}
export const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
