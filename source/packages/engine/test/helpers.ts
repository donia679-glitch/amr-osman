import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function fixture<T = any>(name: string): T {
  const p = fileURLToPath(new URL(`../../../parity/fixtures/${name}`, import.meta.url));
  return JSON.parse(readFileSync(p, "utf8"));
}

/** Deep-compare plain JSON values; numbers within tol. Reports the first differing path. */
export function diff(a: unknown, b: unknown, path = "$", tol = 1e-9): string | null {
  if (typeof a === "number" && typeof b === "number") {
    if (a === b || Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b))) return null;
    return `${path}: ${a} != ${b}`;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}: length ${a.length} != ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = diff(a[i], b[i], `${path}[${i}]`, tol);
      if (d) return d;
    }
    return null;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object).filter((k) => (a as any)[k] !== undefined).sort();
    const kb = Object.keys(b as object).filter((k) => (b as any)[k] !== undefined).sort();
    const d0 = diff(ka, kb, `${path}{keys}`, tol);
    if (d0) return d0;
    for (const k of ka) {
      const d = diff((a as any)[k], (b as any)[k], `${path}.${k}`, tol);
      if (d) return d;
    }
    return null;
  }
  if (a === b) return null;
  return `${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
}

export function assertSame(actual: unknown, expected: unknown, label: string): void {
  const d = diff(JSON.parse(JSON.stringify(actual)), expected);
  assert.equal(d, null, `${label}: ${d}`);
}
