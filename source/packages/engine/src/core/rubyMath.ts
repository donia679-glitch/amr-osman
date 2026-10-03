// Ruby-compatible numeric helpers so the TS engine matches the plugin's output.

/** Float#round(ndigits) — Ruby's round-half-up (away from zero) via round_half_up(). */
export function rround(x: number, nd = 0): number {
  if (!Number.isFinite(x)) return x;
  if (nd <= 0) {
    const s = Math.pow(10, -nd);
    return cRound(x / s) * s;
  }
  if (nd > 14) return x;
  const s = Math.pow(10, nd);
  let f = cRound(x * s);
  if (x > 0) {
    if ((f + 0.5) / s <= x) f += 1;
  } else if (x < 0) {
    if ((f - 0.5) / s >= x) f -= 1;
  }
  const r = f / s;
  return Number.isFinite(r) ? r : x;
}

/** C round(): half away from zero */
export function cRound(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

/** Ruby Float#ceil with no digits */
export const rceil = Math.ceil;

/** Stable sort by key (Ruby sort_by on [key, index] tuples is used where stability matters). */
export function sortBy<T>(arr: readonly T[], key: (v: T) => number | (number | string)[]): T[] {
  const withIdx = arr.map((v, i) => ({ v, i, k: key(v) }));
  withIdx.sort((a, b) => {
    const c = cmp(a.k, b.k);
    return c !== 0 ? c : a.i - b.i;
  });
  return withIdx.map((o) => o.v);
}

export function cmp(a: unknown, b: unknown): number {
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const c = cmp(a[i], b[i]);
      if (c !== 0) return c;
    }
    return a.length - b.length;
  }
  if (typeof a === "number" && typeof b === "number") return a < b ? -1 : a > b ? 1 : 0;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** Enumerable#min_by — first element with the minimal key */
export function minBy<T>(arr: readonly T[], key: (v: T) => number): T | undefined {
  let best: T | undefined;
  let bk = Infinity;
  let first = true;
  for (const v of arr) {
    const k = key(v);
    if (first || k < bk) {
      best = v;
      bk = k;
      first = false;
    }
  }
  return best;
}

export function maxBy<T>(arr: readonly T[], key: (v: T) => number): T | undefined {
  let best: T | undefined;
  let bk = -Infinity;
  let first = true;
  for (const v of arr) {
    const k = key(v);
    if (first || k > bk) {
      best = v;
      bk = k;
      first = false;
    }
  }
  return best;
}

/** Array#sum — Ruby uses Kahan-Babuska compensated summation for floats. */
export function sum(arr: readonly number[]): number {
  let f = 0;
  let c = 0;
  for (const x of arr) {
    if (Number.isNaN(f)) continue;
    if (Number.isNaN(x)) {
      f = x;
      continue;
    }
    if (!Number.isFinite(x)) {
      if (!Number.isFinite(f) && Math.sign(x) !== Math.sign(f)) f = NaN;
      else f = x;
      continue;
    }
    if (!Number.isFinite(f)) continue;
    const t = f + x;
    if (Math.abs(f) >= Math.abs(x)) c += f - t + x;
    else c += x - t + f;
    f = t;
  }
  return f + c;
}

/**
 * Ruby#sort_by as it behaves in SketchUp on Windows (Ruby x64-mswin64: MSVC qsort).
 * For small arrays (<= 8) MSVC uses "shortsort" (repeatedly move the first maximum to the end),
 * which reorders equal keys — e.g. two equal elements come out swapped. Larger arrays: stable.
 */
export function sortByWin<T>(arr: readonly T[], key: (v: T) => number): T[] {
  if (arr.length > 8) return sortBy(arr, key);
  const a = arr.map((v) => ({ v, k: key(v) }));
  for (let hi = a.length - 1; hi > 0; hi--) {
    let max = 0;
    for (let p = 1; p <= hi; p++) if (a[p].k > a[max].k) max = p;
    const t = a[max];
    a[max] = a[hi];
    a[hi] = t;
  }
  return a.map((o) => o.v);
}
