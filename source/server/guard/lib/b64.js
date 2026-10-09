// base64 / base64url helpers that work in Cloudflare Workers and Node 18+ (no Buffer)
export function b64urlEncode(bytes) {
  if (typeof bytes === "string") bytes = new TextEncoder().encode(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function b64Decode(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const bin = atob(s + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export const b64urlDecode = b64Decode;
export const utf8 = (bytes) => new TextDecoder().decode(bytes);
export const hex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
