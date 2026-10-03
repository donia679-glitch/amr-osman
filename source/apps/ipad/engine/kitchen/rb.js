// Ruby value semantics the kitchen builders rely on (params come from JSON, like params_json).
import { RubyError } from "./su/model.js";
/** Ruby truthiness: only nil and false are false (0 and "" are true) */
export const truthy = (v) => v !== null && v !== undefined && v !== false;
function noMethod(name, v) {
    const cls = v === true ? "true:TrueClass" : v === false ? "false:FalseClass" : `an instance of ${Array.isArray(v) ? "Array" : "Hash"}`;
    throw new RubyError("NoMethodError", `undefined method \`${name}' for ${cls}`);
}
/** #to_f — Numeric, nil (0.0) and String (leading number, else 0.0) */
export function toF(v) {
    if (typeof v === "number")
        return v;
    if (v === null || v === undefined)
        return 0.0;
    if (typeof v === "string") {
        const m = /^[ \t\n\v\f\r]*([+-]?(?:\d+(?:_\d+)*)?(?:\.\d+(?:_\d+)*)?(?:[eE][+-]?\d+)?)/.exec(v);
        const s = m ? m[1].replace(/_/g, "") : "";
        const f = parseFloat(s);
        return Number.isFinite(f) ? f : 0.0;
    }
    return noMethod("to_f", v);
}
/** #to_i — Float truncates, String takes the leading integer, nil → 0 */
export function toI(v) {
    if (typeof v === "number")
        return Math.trunc(v);
    if (v === null || v === undefined)
        return 0;
    if (typeof v === "string") {
        const m = /^[ \t\n\v\f\r]*([+-]?\d+(?:_\d+)*)/.exec(v);
        return m ? parseInt(m[1].replace(/_/g, ""), 10) : 0;
    }
    return noMethod("to_i", v);
}
/** #to_s for the values the builders stringify (strings, nil, booleans, integers) */
export function toS(v) {
    if (v === null || v === undefined)
        return "";
    if (typeof v === "string")
        return v;
    if (typeof v === "boolean")
        return v ? "true" : "false";
    if (typeof v === "number")
        return Number.isInteger(v) ? String(v) : fs(v);
    return String(v);
}
/** Float#to_s: shortest round-trip digits, always with a decimal part, Ruby's exponent rules */
export function fs(x) {
    if (Number.isNaN(x))
        return "NaN";
    if (!Number.isFinite(x))
        return x > 0 ? "Infinity" : "-Infinity";
    if (x === 0)
        return Object.is(x, -0) ? "-0.0" : "0.0";
    const ax = Math.abs(x);
    if (ax >= 1e16 || ax < 1e-4) {
        // Ruby: 1.0e+16, 1.0e-05
        let [mant, exp] = x.toExponential().split("e");
        if (!mant.includes("."))
            mant += ".0";
        const e = parseInt(exp, 10);
        return `${mant}e${e < 0 ? "-" : "+"}${String(Math.abs(e)).padStart(2, "0")}`;
    }
    const s = String(x);
    return s.includes(".") ? s : `${s}.0`;
}
/** String#strip (ASCII whitespace + NUL, like Ruby) */
export const strip = (s) => s.replace(/^[\0\t\n\v\f\r ]+|[\0\t\n\v\f\r ]+$/g, "");
/** Kernel#Float(s) — strict; null when Ruby would raise */
export function strictFloat(s) {
    const t = strip(s);
    if (!/^[+-]?(\d+(_\d+)*)(\.\d+(_\d+)*)?([eE][+-]?\d+)?$/.test(t) && !/^[+-]?\.\d+$/.test(t))
        return null;
    if (/^[+-]?\.\d+$/.test(t))
        return null; // Float(".5") raises in Ruby
    return parseFloat(t.replace(/_/g, ""));
}
/** [[v, lo].max, hi].min for Integers */
export const clampI = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
/** Comparable#clamp */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
