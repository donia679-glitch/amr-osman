// =============================================================================
// CutOptimizer — port of the plugin's lib/cut_optimizer.rb (v182).
// Guillotine multi-bin packing + deterministic local search. Same inputs give
// the same plan as the SketchUp plugin (RNG and rounding are Ruby-exact).
// =============================================================================
import { RubyRandom } from "../core/rubyRandom.js";
import { rround, sortBy, minBy, sum } from "../core/rubyMath.js";
const EPS = 1e-6;
export const FITS = ["bssf", "baf", "blsf", "bl"];
export const SPLITS = ["maxarea", "strips", "sas", "minarea", "las", "cols"];
const ORDERS = [
    (p) => -(p[0] * p[1]),
    (p) => -Math.max(p[0], p[1]) * 1e4 - Math.min(p[0], p[1]),
    (p) => -Math.min(p[0], p[1]) * 1e4 - Math.max(p[0], p[1]),
    (p) => -(p[0] + p[1]),
    (p) => -p[0] * 1e4 - p[1],
    (p) => -p[1] * 1e4 - p[0],
];
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
// ------------------------------------------------------------------ API
const memo = new Map();
export function optimize(parts, opts) {
    const { timeCap: _t, ...rest } = opts;
    const key = JSON.stringify([parts.map((p) => [String(p.name ?? ""), +p.w, +p.h, p.rotate ?? null]), rest]);
    const hit = memo.get(key);
    if (hit)
        return hit;
    const res = compute(parts, opts);
    while (memo.size > 30)
        memo.delete(memo.keys().next().value);
    memo.set(key, res);
    return res;
}
export function compute(parts, opts) {
    const t0 = now();
    const kerf = opts.kerf ?? 0.4;
    const trim = opts.trim ?? 0;
    const rotate = opts.rotate ?? true;
    const remnants = opts.remnants ?? [];
    const minOffcut = opts.minOffcut ?? [30, 10];
    const effort = opts.effort ?? 1.0;
    const timeCap = opts.timeCap ?? 12;
    const uw = opts.sheetW - 2 * trim;
    const uh = opts.sheetH - 2 * trim;
    const list = [];
    const oversized = [];
    parts.forEach((p, i) => {
        const w = +p.w;
        const h = +p.h;
        if (w <= EPS || h <= EPS)
            return;
        const rot = rotate && p.rotate !== false;
        let fits = (w <= uw + EPS && h <= uh + EPS) || (rot && h <= uw + EPS && w <= uh + EPS);
        fits ||= remnants.some((r) => (w <= r[0] + EPS && h <= r[1] + EPS) || (rot && h <= r[0] + EPS && w <= r[1] + EPS));
        if (fits)
            list.push([w, h, rot, i]);
        else
            oversized.push({ name: String(p.name ?? ""), w, h, index: i });
    });
    const ctx = {
        uw,
        uh,
        kerf,
        remnants: remnants.map((r) => [+r[0], +r[1]]),
        min_dim: list.length ? Math.min(...list.map((a) => Math.min(a[0], a[1]))) : 1.0,
    };
    let best = null;
    let runs = 0;
    const consider = (order, fit, split) => {
        const res = pack(list, order, fit, split, ctx);
        runs++;
        if (best === null || better(res, best))
            best = { ...res, order, fit, split };
        return res;
    };
    if (list.length) {
        const idx = list.map((_, i) => i);
        for (const key of ORDERS) {
            const order = sortBy(idx, (i) => [key(list[i]), i]);
            for (const f of FITS)
                for (const s of SPLITS)
                    consider(order, f, s);
            if (now() - t0 > timeCap * 0.4)
                break;
        }
        const rng = new RubyRandom(list.length * 7919 + rround(uw * 100));
        const budget = rround(effort * Math.min(Math.max(Math.trunc(60000 / Math.max(list.length, 1)), 60), 900));
        let cur = best;
        const lb = lowerBound(list, ctx);
        for (let it = 0; it < budget; it++) {
            if (now() - t0 > timeCap)
                break;
            if (best.full <= lb)
                break;
            const order = mutate(cur, rng);
            const fit = rng.float() < 0.85 ? cur.fit : FITS[rng.int(FITS.length)];
            const split = rng.float() < 0.85 ? cur.split : SPLITS[rng.int(SPLITS.length)];
            const res = { ...consider(order, fit, split), order, fit, split };
            if (better(res, cur) || !better(cur, res))
                cur = res;
            if (it % 40 === 0)
                cur = best;
        }
    }
    return finish(best, list, parts, oversized, ctx, trim, minOffcut, runs, now() - t0);
}
export function lowerBound(list, ctx) {
    const area = sum(list.map((a) => a[0] * a[1]));
    const rem = sum(ctx.remnants.map((r) => r[0] * r[1]));
    return Math.max(Math.ceil((area - rem) / (ctx.uw * ctx.uh) - 1e-9), 0);
}
function better(a, b) {
    // a plan that places more parts always wins (a part that only fits a remnant another part took is left out)
    if ((a.dropped?.length || 0) !== (b.dropped?.length || 0))
        return (a.dropped?.length || 0) < (b.dropped?.length || 0);
    if (a.full !== b.full)
        return a.full < b.full;
    if (a.remnants_used !== b.remnants_used)
        return a.remnants_used < b.remnants_used;
    return a.sq > b.sq + 1e-9;
}
// ------------------------------------------------------------------ search
function mutate(cur, rng) {
    let order = cur.order.slice();
    const n = order.length;
    if (n < 2)
        return order;
    const c = rng.int(10);
    if (c <= 2) {
        const weak = minBy(cur.bins, (b) => b.used / (b.w * b.h));
        if (weak) {
            const ids = weak.ids;
            const set = new Set(ids);
            order = [...rng.shuffle(ids), ...order.filter((x) => !set.has(x))];
        }
    }
    else if (c <= 5) {
        const i = rng.int(n);
        const j = rng.int(n);
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
    }
    else if (c <= 7) {
        const i = rng.int(n);
        const [el] = order.splice(i, 1);
        order.splice(rng.int(n), 0, el);
    }
    else {
        const i = rng.int(n);
        const len = Math.min(rng.range(1, Math.max(Math.trunc(n / 4), 2)), n - i);
        const blk = order.splice(i, len);
        order.splice(rng.int(order.length + 1), 0, ...blk);
    }
    return order;
}
// ------------------------------------------------------------------ packing
const node = (x, y, w, h) => ({ x, y, w, h, cut: null, kids: null, part: null });
function newBin(w, h, stock) {
    const root = node(0, 0, w, h);
    return { w, h, stock, root, free: [root], used: 0, ids: [] };
}
function pack(list, order, fit, split, ctx) {
    const kerf = ctx.kerf;
    const bins = [];
    const remLeft = ctx.remnants.slice();
    const dropped = [];
    for (const pi of order) {
        const [pw0, ph0, rot] = list[pi];
        let best = null;
        bins.forEach((b, bi) => {
            for (const r of b.free) {
                best = tryRect(r, pw0, ph0, false, fit, bi, best, b);
                if (rot)
                    best = tryRect(r, ph0, pw0, true, fit, bi, best, b);
            }
        });
        if (!best) {
            let cand;
            remLeft.forEach((r, i) => {
                const [rw, rh] = r;
                const ok = (pw0 <= rw + EPS && ph0 <= rh + EPS) || (rot && ph0 <= rw + EPS && pw0 <= rh + EPS);
                if (ok && (!cand || rw * rh < cand.r[0] * cand.r[1]))
                    cand = { r, i };
            });
            let b;
            if (cand) {
                const c = cand;
                remLeft.splice(c.i, 1);
                b = newBin(c.r[0], c.r[1], "remnant");
            }
            else {
                b = newBin(ctx.uw, ctx.uh, "sheet");
            }
            bins.push(b);
            best = tryRect(b.root, pw0, ph0, false, fit, bins.length - 1, null, b);
            if (rot)
                best = tryRect(b.root, ph0, pw0, true, fit, bins.length - 1, best, b);
            if (!best) {
                // fits nothing left (only a remnant that is already used): report it, never lose it silently
                bins.pop();
                if (b.stock === "remnant")
                    remLeft.push([b.w, b.h]);
                dropped.push(pi);
                continue;
            }
        }
        place(best, pi, split, kerf, ctx.min_dim);
    }
    const full = bins.filter((b) => b.stock === "sheet").length;
    const utils = bins.map((b) => b.used / (b.w * b.h));
    const sheetsU = bins.filter((b) => b.stock === "sheet").map((b) => b.used / (b.w * b.h));
    return {
        bins,
        dropped,
        full,
        remnants_used: bins.length - full,
        sq: sum(utils.map((u) => u * u)),
        last_util: sheetsU.length ? Math.min(...sheetsU) : 0,
    };
}
function tryRect(r, pw, ph, rotated, fit, bi, best, bin) {
    if (pw > r.w + EPS || ph > r.h + EPS)
        return best;
    const lw = r.w - pw;
    const lh = r.h - ph;
    const short = lw < lh ? lw : lh;
    const long = lw < lh ? lh : lw;
    let score;
    switch (fit) {
        case "bssf":
            score = short * 1e4 + long;
            break;
        case "blsf":
            score = long * 1e4 + short;
            break;
        case "baf":
            score = (r.w * r.h - pw * ph) * 1e3 + short;
            break;
        default: score = (r.y + ph) * 1e4 + r.x;
    }
    score += bi * 1e-3;
    if (best && best.score <= score)
        return best;
    return { score, rect: r, pw, ph, rotated, bin };
}
function splitHorizontalFirst(split, w, h, pw, ph, kerf) {
    const lw = w - pw;
    const lh = h - ph;
    switch (split) {
        case "strips": return true;
        case "cols": return false;
        case "sas": return lw < lh;
        case "las": return lw >= lh;
        default: {
            const hBig = Math.max(w * Math.max(lh - kerf, 0), Math.max(lw - kerf, 0) * ph);
            const vBig = Math.max(Math.max(lw - kerf, 0) * h, pw * Math.max(lh - kerf, 0));
            return split === "maxarea" ? hBig >= vBig : hBig < vBig;
        }
    }
}
function place(best, pi, split, kerf, minDim) {
    const r = best.rect;
    const b = best.bin;
    const { pw, ph } = best;
    b.free = b.free.filter((f) => f !== r);
    const fresh = [];
    let piece;
    if (splitHorizontalFirst(split, r.w, r.h, pw, ph, kerf)) {
        let strip = r;
        if (r.h - ph > kerf + EPS) {
            strip = node(r.x, r.y, r.w, ph);
            const rest = node(r.x, r.y + ph + kerf, r.w, r.h - ph - kerf);
            r.cut = ["h", r.y + ph];
            r.kids = [strip, rest];
            fresh.push(rest);
        }
        piece = strip;
        if (strip.w - pw > kerf + EPS) {
            piece = node(strip.x, strip.y, pw, ph);
            const right = node(strip.x + pw + kerf, strip.y, strip.w - pw - kerf, ph);
            strip.cut = ["v", strip.x + pw];
            strip.kids = [piece, right];
            fresh.push(right);
        }
    }
    else {
        let col = r;
        if (r.w - pw > kerf + EPS) {
            col = node(r.x, r.y, pw, r.h);
            const rest = node(r.x + pw + kerf, r.y, r.w - pw - kerf, r.h);
            r.cut = ["v", r.x + pw];
            r.kids = [col, rest];
            fresh.push(rest);
        }
        piece = col;
        if (col.h - ph > kerf + EPS) {
            piece = node(col.x, col.y, pw, ph);
            const below = node(col.x, col.y + ph + kerf, pw, col.h - ph - kerf);
            col.cut = ["h", col.y + ph];
            col.kids = [piece, below];
            fresh.push(below);
        }
    }
    piece.part = pi;
    piece.w = pw;
    piece.h = ph;
    piece.rotated = best.rotated;
    for (const f of fresh)
        if (f.w >= minDim - EPS && f.h >= minDim - EPS)
            b.free.push(f);
    b.used += pw * ph;
    b.ids.push(pi);
}
// ------------------------------------------------------------------ result
function finish(best, list, parts, oversized, ctx, trim, minOffcut, runs, secs) {
    const sheets = [];
    if (best?.dropped?.length) {
        oversized = oversized.slice();
        for (const li of best.dropped) {
            const it = list[li];
            oversized.push({ name: String(parts[it[3]].name ?? ""), w: it[0], h: it[1], index: it[3] });
        }
    }
    if (best) {
        for (const b of best.bins) {
            const places = [];
            walkParts(b.root, (n) => {
                const it = list[n.part];
                places.push({
                    name: String(parts[it[3]].name ?? ""),
                    x: rround(n.x + trim, 3), y: rround(n.y + trim, 3),
                    w: rround(n.w, 3), h: rround(n.h, 3),
                    rotated: !!n.rotated, orig_w: it[0], orig_h: it[1], index: it[3],
                });
            });
            const [lo, sh] = minOffcut.map(Number).sort((a, b) => b - a);
            const offcuts = [];
            walkLeaves(b.root, (n) => {
                if (n.part !== null)
                    return;
                const a = Math.max(n.w, n.h);
                const c = Math.min(n.w, n.h);
                if (a >= lo && c >= sh)
                    offcuts.push({ x: rround(n.x + trim, 2), y: rround(n.y + trim, 2), w: rround(n.w, 1), h: rround(n.h, 1) });
            });
            const extra = b.stock === "sheet" ? 2 * trim : 0;
            sheets.push({
                stock: b.stock,
                w: rround(b.w + extra, 2),
                h: rround(b.h + extra, 2),
                placements: places,
                offcuts: sortBy(offcuts, (o) => -(o.w * o.h)),
                cuts: cutSteps(b.root, trim),
                util: rround(b.used / (b.w * b.h), 4),
            });
        }
    }
    const area = sum(list.map((a) => a[0] * a[1]));
    const full = sheets.filter((s) => s.stock === "sheet").length;
    return {
        sheets,
        oversized,
        stats: {
            sheets: full,
            remnants_used: sheets.length - full,
            parts: list.length,
            lower_bound: list.length ? lowerBound(list, ctx) : 0,
            utilization: full > 0 ? rround(area / (full * ctx.uw * ctx.uh), 4) : 0,
            runs,
            ms: Math.round(secs * 1000),
            fit: best ? best.fit ?? null : null,
            split: best ? best.split ?? null : null,
        },
    };
}
function walkParts(n, cb) {
    if (n.kids)
        n.kids.forEach((k) => walkParts(k, cb));
    else if (n.part !== null)
        cb(n);
}
function walkLeaves(n, cb) {
    if (n.kids)
        n.kids.forEach((k) => walkLeaves(k, cb));
    else
        cb(n);
}
function cutSteps(root, trim) {
    const steps = [];
    const rec = (n, depth) => {
        if (!n.cut)
            return;
        const [dir, at] = n.cut;
        const size = dir === "h" ? at - n.y : at - n.x;
        steps.push({
            stage: depth, dir,
            from_w: rround(n.w, 1), from_h: rround(n.h, 1),
            size: rround(size, 1), at: rround(at + trim, 2),
            x: rround(n.x + trim, 2), y: rround(n.y + trim, 2),
        });
        n.kids.forEach((k) => rec(k, depth + 1));
    };
    rec(root, 1);
    return steps;
}
