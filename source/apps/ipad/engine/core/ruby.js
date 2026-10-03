// Small Ruby-semantics helpers shared by the ported engines.
import { rround } from "./rubyMath.js";
export const isHash = (v) => !!v && typeof v === "object" && !Array.isArray(v);
/** Ruby #to_s for the values the engine sees (nil -> "", Float 72.0 -> "72.0" when marked float). */
export function rs(v) {
    if (v === null || v === undefined)
        return "";
    return String(v);
}
/** Float#to_s (always shows a decimal part, like Ruby). */
export function fs(v) {
    if (Number.isInteger(v) && Math.abs(v) < 1e16)
        return `${v}.0`;
    return String(v);
}
/** Schema.fmt — 2 decimals max, integers without ".0" */
export function fmt(v) {
    const x = rround(Number(v) || 0, 2);
    return x === rround(x) ? String(rround(x)) : fs(x);
}
export function deepDup(o) {
    if (Array.isArray(o))
        return o.map((v) => deepDup(v));
    if (isHash(o)) {
        const h = {};
        for (const [k, v] of Object.entries(o))
            h[k] = deepDup(v);
        return h;
    }
    return o;
}
/** Catalog.deep_merge — hashes merge recursively, anything else from `over` wins (not copied). */
export function deepMerge(base, over) {
    const out = { ...base };
    for (const [k, b] of Object.entries(over)) {
        const a = out[k];
        out[k] = has(base, k) && isHash(a) && isHash(b) ? deepMerge(a, b) : b;
    }
    return out;
}
/** Kernel#Array */
export function rArray(v) {
    if (v === null || v === undefined)
        return [];
    if (Array.isArray(v))
        return v;
    if (isHash(v))
        return Object.entries(v);
    return [v];
}
export function truthy(v) {
    return v === true || ["true", "1", "yes", "on"].includes(rs(v).toLowerCase());
}
/** Schema.to_f — numbers, or numeric strings (Arabic digits ok); else null */
export function toF(v) {
    if (typeof v === "number")
        return v;
    const s = rs(v)
        .trim()
        .replace(/[٠-٩٫]/g, (c) => (c === "٫" ? "." : String("٠١٢٣٤٥٦٧٨٩".indexOf(c))))
        .replace(/,/g, ".");
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
}
/** Schema.int */
export function toI(v, d) {
    const f = toF(v);
    return f === null ? d : rround(f);
}
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
/** Hash.new(0)-style counter add */
export function inc(h, k, v) {
    h[k] = (h[k] ?? 0) + v;
}
/** File.basename(path, ".*") as on Windows (both separators) */
export function basenameNoExt(p) {
    const b = p.split(/[\\/]/).filter((s) => s.length).pop() ?? "";
    const i = b.lastIndexOf(".");
    return i > 0 ? b.slice(0, i) : b;
}
/** Hash#key? (own keys only) */
export const has = (o, k) => !!o && typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k);
