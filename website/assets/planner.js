/* NOVERA kitchen planner — lays a kitchen out on 1–3 walls by NOVERA's own standards and checks it.
   Standards (cm): base carcass 78 + plinth 10 + counter 2 = 90; base depth 58, counter 62; wall units 80 high at 145, depth 35;
   tall units on the wall-unit line (225) or to the ceiling; sink 80, hob 90, fridge cavity 90, dishwasher 60, drawer unit 60 (3 drawers);
   filler 5 at walls; 3 cm left on every wall for site tolerance; blind corner unit 100. */
(function () {
  "use strict";
  const N = window.NOVERA;
  const t = (a, e) => N.t(a, e);
  const $ = N.$, $$ = N.$$;

  const BASE_D = 58, CTR_D = 62, UP_D = 35, UP_Z = 145, UP_H = 80, PLINTH = 10, CTR_Z = 90, TOL = 3;
  const FINISHES = {
    novera: { ar: "NOVERA الأصلي", en: "NOVERA classic", sub: ["أكريليك كريمي وأوك", "Cream acrylic and oak"], base: "#ece3d1", upper: "#bf8a55", top: "#ece3d1", tall: "#ece3d1" },
    white: { ar: "أبيض كامل", en: "All white", sub: ["أكريليك أبيض لامع", "Gloss white acrylic"], base: "#f7f7f3", upper: "#f7f7f3", top: "#f7f7f3", tall: "#f7f7f3" },
    oak: { ar: "خشب كامل", en: "All oak", sub: ["HPL أوك طبيعي", "Natural oak HPL"], base: "#bf8a55", upper: "#bf8a55", top: "#bf8a55", tall: "#bf8a55" },
    dark: { ar: "رصاصي وأوك", en: "Graphite and oak", sub: ["HPL أنثراسايت وأوك", "Anthracite HPL and oak"], base: "#3d423f", upper: "#bf8a55", top: "#3d423f", tall: "#3d423f" },
  };
  const COUNTERS = { white: { ar: "بورسلين أبيض بعروق", en: "White veined porcelain", c: "#f2f1ec" }, dark: { ar: "بورسلين رمادي غامق", en: "Dark grey porcelain", c: "#5d605d" } };
  const NAMES = {
    F: ["فيلر", "Filler"], base1: ["سفلي ضلفة", "Base, 1 door"], base2: ["سفلي ضلفتين", "Base, 2 doors"], open: ["رف مفتوح", "Open shelf"],
    sink: ["وحدة حوض", "Sink unit"], dw: ["مكان غسالة أطباق", "Dishwasher space"], drw: ["وحدة 3 أدراج", "3-drawer unit"], hob: ["وحدة مسطح", "Hob unit"],
    corner: ["ركنة عمياء", "Blind corner"], tower: ["عمود فرن", "Oven tower"], fridge: ["تجويف تلاجة", "Fridge cavity"],
    up1: ["علوي ضلفة", "Wall unit, 1 door"], up2: ["علوي ضلفتين", "Wall unit, 2 doors"], hood: ["علوي الشفاط", "Hood unit"], upF: ["فيلر علوي", "Wall filler"], upC: ["علوي ركنة", "Corner wall unit"], topL: ["دور تاني لحد السقف", "Top layer to ceiling"],
  };
  const nm = (k) => t(NAMES[k][0], NAMES[k][1]);
  const TALL = new Set(["tower", "fridge"]);

  const S = { shape: "L", A: 400, B: 300, C: 300, W: 260, ceil: 290, fridge: true, tower: true, dw: true, drw: true, toCeil: false, finish: "novera", counter: "white", view: "plan", wall: "A" };
  try { Object.assign(S, JSON.parse(N.store.get("novera-planner") || "{}")); } catch { /* fresh */ }

  // ------------------------------------------------------------------ walls of each shape: origin, direction, inward normal, elevation mirror
  function wallsOf() {
    const A = +S.A, B = +S.B, C = +S.C, W = +S.W;
    if (S.shape === "I") return { A: { len: A, P: [0, 0], d: [1, 0], n: [0, 1], mirror: false } };
    if (S.shape === "L") return { A: { len: A, P: [0, 0], d: [1, 0], n: [0, 1], mirror: false }, B: { len: B, P: [0, 0], d: [0, 1], n: [1, 0], mirror: true } };
    if (S.shape === "U") return { B: { len: B, P: [0, 0], d: [0, 1], n: [1, 0], mirror: true }, A: { len: A, P: [0, 0], d: [1, 0], n: [0, 1], mirror: false }, C: { len: C, P: [A, 0], d: [0, 1], n: [-1, 0], mirror: false } };
    return { A: { len: A, P: [0, 0], d: [1, 0], n: [0, 1], mirror: false }, B: { len: B, P: [0, W], d: [1, 0], n: [0, -1], mirror: true } };
  }

  // ------------------------------------------------------------------ sequences per wall
  const it = (k, w, o = {}) => ({ k, w, ...o });
  const gap = (min, wt) => ({ gap: true, min, wt });
  // every shape has a few sensible arrangements; the planner tries them all and keeps the one that fits best
  function sequences() {
    const fr = () => S.fridge ? [it("fridge", 90, { opt: 3 })] : [], tw = () => S.tower ? [it("tower", 60, { opt: 2 })] : [];
    const dw = () => S.dw ? [it("dw", 60, { opt: 1 })] : [], drw = () => S.drw ? [it("drw", 60, { opt: 0 })] : [];
    const F = () => it("F", 5), sk = () => it("skip", BASE_D);
    const hobRun = (lead) => [...lead, gap(40, .5), ...drw(), it("hob", 90), gap(40, 1)];
    if (S.shape === "I") return [
      { A: [F(), ...fr(), ...tw(), gap(30, 1), it("sink", 80), ...dw(), gap(40, .6), ...drw(), it("hob", 90), gap(30, .8), F()] },
      { A: [F(), gap(30, .8), it("hob", 90), ...drw(), gap(40, .6), it("sink", 80), ...dw(), gap(30, 1), ...tw(), ...fr(), F()] },
    ];
    if (S.shape === "L") return [
      { A: [it("corner", 100), gap(0, 1), it("sink", 80), ...dw(), gap(30, .5), F()], B: [...hobRun([sk(), F()]), ...tw(), ...fr(), F()] },
      { A: [it("corner", 100), gap(0, 1), it("sink", 80), ...dw(), gap(30, .5), ...tw(), ...fr(), F()], B: [...hobRun([sk(), F()]), F()] },
      { A: [it("corner", 100), ...hobRun([]), ...tw(), ...fr(), F()], B: [sk(), F(), gap(0, 1), it("sink", 80), ...dw(), gap(30, .5), F()] },
    ];
    if (S.shape === "U") return [
      { B: [sk(), F(), gap(0, 1), ...tw(), ...fr(), F()], A: [it("corner", 100), gap(0, 1), it("sink", 80), ...dw(), gap(0, 1), it("corner", 100, { flip: true })], C: [...hobRun([sk(), F()]), F()] },
      { B: [...hobRun([sk(), F()]), F()], A: [it("corner", 100), gap(0, 1), it("sink", 80), ...dw(), gap(0, 1), it("corner", 100, { flip: true })], C: [sk(), F(), gap(0, 1), ...tw(), ...fr(), F()] },
      { B: [sk(), F(), gap(0, 1), ...fr(), F()], A: [it("corner", 100), gap(0, 1), it("sink", 80), ...dw(), gap(0, 1), it("corner", 100, { flip: true })], C: [...hobRun([sk(), F()]), ...tw(), F()] },
    ];
    return [
      { A: [F(), gap(30, 1), it("sink", 80), ...dw(), gap(30, 1), F()], B: [F(), ...fr(), ...tw(), gap(40, .6), ...drw(), it("hob", 90), gap(30, 1), F()] },
      { A: [F(), ...fr(), ...tw(), gap(30, 1), it("sink", 80), ...dw(), gap(30, 1), F()], B: [F(), gap(40, .6), ...drw(), it("hob", 90), gap(30, 1), F()] },
    ];
  }

  // fit one wall: drop optional items when it is too short, share the rest between the gaps
  function fitRun(seq, len, dropped) {
    let s = seq.slice();
    const avail = len - TOL;
    for (;;) {
      const fixed = s.filter((x) => !x.gap).reduce((a, x) => a + x.w, 0), mins = s.filter((x) => x.gap).reduce((a, x) => a + x.min, 0);
      if (fixed + mins <= avail) break;
      const opts = s.filter((x) => x.opt != null).sort((a, b) => a.opt - b.opt);
      if (!opts.length) { for (const g of s.filter((x) => x.gap)) g.min = 0; break; }
      dropped.push(opts[0].k); s = s.filter((x) => x !== opts[0]);
    }
    const fixed = s.filter((x) => !x.gap).reduce((a, x) => a + x.w, 0);
    const gaps = s.filter((x) => x.gap);
    let rest = avail - fixed - gaps.reduce((a, g) => a + g.min, 0);
    const over = rest < 0;
    const wsum = gaps.reduce((a, g) => a + g.wt, 0) || 1;
    for (const g of gaps) g.w = Math.max(0, g.min + Math.max(0, rest) * g.wt / wsum);
    // expand gaps into real units and lay everything out along the wall
    const out = []; let pos = 0;
    for (const x of s) {
      if (!x.gap) { out.push({ ...x, s: pos }); pos += x.w; continue; }
      for (const u of fillGap(x.w)) { out.push({ ...u, s: pos }); pos += u.w; }
    }
    // the wall's site tolerance goes into the last filler (cut on site)
    const last = [...out].reverse().find((u) => u.k === "F");
    return { items: out, over, used: pos };
  }
  function fillGap(g) {
    g = Math.round(g * 2) / 2;
    if (g < 0.5) return [];
    if (g <= 15) return [it("F", g)];
    if (g < 30) return [it("open", g)];
    const n = Math.ceil(g / 90), w = Math.floor((g / n) * 2) / 2, out = [];
    for (let i = 0; i < n; i++) { const ww = i === n - 1 ? Math.round((g - w * (n - 1)) * 2) / 2 : w; out.push(it(ww > 50 ? "base2" : "base1", ww)); }
    return out;
  }

  // wall units over a laid-out wall
  function uppersOf(run, key) {
    const ups = [];
    const items = run.items;
    // stretches of non-tall items
    let cur = null;
    const flush = () => { if (cur && cur.b - cur.a > 0.5 && cur.unit) stretches.push(cur); cur = null; };
    const stretches = [];
    for (const u of items) {
      if (TALL.has(u.k)) { flush(); continue; }
      let a = u.s, b = u.s + u.w;
      if (u.k === "skip") { a = u.s + u.w - (u.w - UP_D); a = UP_D; } // the other wall's wall units end at 35, not 58
      if (!cur) cur = { a, b, startF: u.k === "F", endF: u.k === "F", unit: u.k !== "F" && u.k !== "skip" }; else { cur.b = b; cur.endF = u.k === "F"; if (u.k !== "F" && u.k !== "skip") cur.unit = true; }
    }
    flush();
    const hob = items.find((u) => u.k === "hob");
    for (const st of stretches) {
      let a = st.a, b = st.b;
      const segs = [];
      if (st.startF && b - a > 10) { ups.push({ k: "upF", s: a, w: 5 }); a += 5; }
      let endF = null;
      if (st.endF && b - a > 10) { endF = { k: "upF", s: b - 5, w: 5 }; b -= 5; }
      if (hob && hob.s >= a - 0.1 && hob.s + hob.w <= b + 0.1) { segs.push([a, hob.s]); ups.push({ k: "hood", s: hob.s, w: hob.w }); segs.push([hob.s + hob.w, b]); }
      else segs.push([a, b]);
      for (const [x0, x1] of segs) {
        const L = Math.round((x1 - x0) * 2) / 2;
        if (L < 0.5) continue;
        if (L < 30) { ups.push({ k: "upF", s: x0, w: L }); continue; }
        const n = Math.ceil(L / 90), w = Math.floor((L / n) * 2) / 2;
        for (let i = 0; i < n; i++) { const ww = i === n - 1 ? Math.round((L - w * (n - 1)) * 2) / 2 : w; ups.push({ k: ww > 50 ? "up2" : "up1", s: x0 + w * i, w: ww }); }
      }
      if (endF) ups.push(endF);
    }
    ups.sort((p, q) => p.s - q.s);
    // the corner wall unit on wall A sits over the blind corner
    const c0 = items.find((u) => u.k === "corner" && !u.flip), c1 = items.find((u) => u.k === "corner" && u.flip);
    if (c0 && ups[0] && ups[0].s < 1) ups[0].k = "upC";
    if (c1 && ups.length && ups[ups.length - 1].s + ups[ups.length - 1].w > run.used - 1) ups[ups.length - 1].k = "upC";
    return ups;
  }

  // ------------------------------------------------------------------ the whole kitchen + its checks
  function plan() {
    const walls = wallsOf();
    let best = null;
    for (const seqs of sequences()) {
      const dropped = [], runs = {};
      let over = 0, tight = 0;
      for (const k of Object.keys(walls)) {
        const r = fitRun(seqs[k], walls[k].len, dropped);
        r.wall = walls[k]; r.key = k; r.ups = uppersOf(r, k);
        runs[k] = r; if (r.over) over++;
        // the shortest free counter stretch: more room around the work spots is better
        tight += r.items.filter((u) => u.k === "base1" || u.k === "base2").reduce((a, u) => a + u.w, 0);
      }
      // a work triangle outside 1.2–2.7 m per side counts against the arrangement (less than losing a unit)
      const pos = (k) => { for (const r of Object.values(runs)) { const u = r.items.find((x) => x.k === k); if (u) { const W = r.wall, m = u.s + u.w / 2; return [W.P[0] + W.d[0] * m + W.n[0] * BASE_D, W.P[1] + W.d[1] * m + W.n[1] * BASE_D]; } } return null; };
      const pts = ["sink", "hob", "fridge"].map(pos);
      let triBad = 0;
      if (pts.every(Boolean)) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const d = Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]); if (d < 120 || d > 270) triBad++; }
      const score = triBad * 5e3 + over * 1e6 + dropped.reduce((a, k) => a + ({ fridge: 4, tower: 3, dw: 2, drw: 1 }[k] || 1), 0) * 1e4 - tight;
      if (!best || score < best.score) best = { score, runs, dropped };
    }
    const { runs, dropped } = best;
    const tallTop = S.toCeil ? +S.ceil - 2 : UP_Z + UP_H;
    const topLayer = S.toCeil && +S.ceil - 2 - (UP_Z + UP_H) >= 30 ? +S.ceil - 2 - (UP_Z + UP_H) : 0;
    // world points (plan, cm) for the work triangle: middle of each front, 30 cm out (where you stand)
    const spot = (k) => { for (const r of Object.values(runs)) { const u = r.items.find((x) => x.k === k); if (u) { const W = r.wall, m = u.s + u.w / 2, o = (TALL.has(k) ? BASE_D : BASE_D) + 0; return [W.P[0] + W.d[0] * m + W.n[0] * o, W.P[1] + W.d[1] * m + W.n[1] * o, r.key]; } } return null; };
    const sink = spot("sink"), hob = spot("hob"), fridge = spot("fridge");
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const tri = sink && hob && fridge ? [["sink", "hob", dist(sink, hob)], ["hob", "fridge", dist(hob, fridge)], ["fridge", "sink", dist(fridge, sink)]] : null;
    const checks = [];
    const ok = (a, e) => checks.push({ ok: true, ar: a, en: e }), warn = (a, e) => checks.push({ ok: false, ar: a, en: e });
    if (tri) {
      const sum = tri.reduce((a, x) => a + x[2], 0);
      const bad = tri.filter((x) => x[2] < 120 || x[2] > 270);
      if (sum >= 400 && sum <= 790 && !bad.length) ok(`مثلث الشغل ${f1(sum / 100)} م — مظبوط (كل ضلع بين 1.2 و2.7 م).`, `Work triangle ${f1(sum / 100)} m — good (each side 1.2–2.7 m).`);
      else warn(`مثلث الشغل ${f1(sum / 100)} م — ${sum > 790 ? "طويل، هتمشي كتير وانت بتطبخ" : sum < 400 ? "ضيق، المطبخ هيبقى زحمة" : "ضلع منه خارج 1.2–2.7 م"}.`, `Work triangle ${f1(sum / 100)} m — ${sum > 790 ? "long, a lot of walking" : sum < 400 ? "tight, the kitchen will feel crowded" : "one side is outside 1.2–2.7 m"}.`);
    } else if (!S.fridge) warn("مفيش تلاجة في التصميم، فمثلث الشغل مش محسوب.", "No fridge in the layout, so the work triangle isn't measured.");
    for (const r of Object.values(runs)) {
      const h = r.items.findIndex((u) => u.k === "hob");
      if (h >= 0) {
        const hob = r.items[h];
        const side = (dir) => { let s = 0; for (let i = h + dir; i >= 0 && i < r.items.length; i += dir) { const u = r.items[i]; if (TALL.has(u.k) || u.k === "skip") break; if (u.k === "F") continue; s += u.w; } return s; };
        const l = side(-1), rr = side(1);
        if (Math.min(l, rr) >= 30) ok(`مساحة شغل جنب المسطح من الناحيتين (${f0(l)} و${f0(rr)} سم).`, `Counter space on both sides of the hob (${f0(l)} and ${f0(rr)} cm).`);
        else warn(`المسطح لازق في ${Math.min(l, rr) < 1 ? "عمود أو ركنة" : "مساحة صغيرة"} — سيب 30 سم على الأقل من كل ناحية.`, `The hob is too close to a tall unit or corner — leave at least 30 cm each side.`);
        const sk = r.items.find((u) => u.k === "sink");
        if (sk) { const g = sk.s < hob.s ? hob.s - (sk.s + sk.w) : sk.s - (hob.s + hob.w); if (g < 40) warn(`الحوض قريب من المسطح (${f0(g)} سم) — المية والزيت؛ الأحسن 40–60 سم.`, `The sink is close to the hob (${f0(g)} cm); 40–60 cm is better.`); }
      }
      if (r.over) warn(`حيطة ${wallName(r.key)} قصيرة على الوحدات الأساسية — زوّد الطول أو غيّر الشكل.`, `Wall ${r.key} is too short for the main units — lengthen it or change the shape.`);
    }
    if (S.dw && !dropped.includes("dw")) ok("غسالة الأطباق جنب الحوض على طول.", "The dishwasher sits right next to the sink.");
    for (const k of dropped) warn(`مفيش مكان لـ«${nm(k)}» فاتشال من التصميم.`, `No room for the ${nm(k).toLowerCase()}, so it was left out.`);
    if (S.shape === "G") { const aisle = +S.W - 2 * CTR_D; if (aisle < 100) warn(`الممر بين الصفين ${f0(aisle)} سم بس — المريح 120 سم.`, `The aisle is only ${f0(aisle)} cm — 120 cm is comfortable.`); else ok(`الممر بين الصفين ${f0(aisle)} سم.`, `Aisle between the runs: ${f0(aisle)} cm.`); }
    if (S.fridge && !dropped.includes("fridge")) ok("تجويف التلاجة 90 سم: 6 سم تهوية من كل ناحية.", "Fridge cavity 90 cm: 6 cm ventilation on every side.");
    ok("الشفاط على 65–70 سم فوق المسطح، والعلوي اللي فوقه مرفوع على نفس الخط.", "Hood at 65–70 cm above the hob, the wall unit above it raised on the same top line.");

    // quantities (rough, by NOVERA's box construction)
    let carc = 0, front = 0, back = 0, baseRun = 0, upRun = 0, count = { base: 0, upper: 0, tall: 0 };
    const iw = (w) => Math.max(0, w - 3.6);
    for (const r of Object.values(runs)) {
      for (const u of r.items) {
        if (u.k === "F" || u.k === "skip") continue;
        if (TALL.has(u.k)) {
          const H = tallTop - PLINTH; count.tall++; baseRun += u.w;
          carc += (2 * 56.2 * H + 4 * iw(u.w) * 56.2) / 1e4; front += (u.k === "fridge" ? u.w * (H - 185) : u.w * (H - 4)) / 1e4; back += u.w * H / 1e4;
          continue;
        }
        if (u.k === "dw") { baseRun += u.w; continue; }
        count.base++; baseRun += u.w;
        const w = u.k === "corner" ? u.w : u.w;
        carc += (2 * 56.2 * 78 + iw(w) * 56.2 + 2 * iw(w) * 10 + (u.k === "drw" || u.k === "sink" ? 0 : iw(w) * 54)) / 1e4;
        if (u.k === "drw") carc += 3 * (2 * 50 * 15 + iw(w) * 15) / 1e4;
        front += (u.k === "corner" ? (u.w - BASE_D) : u.w) * 74 / 1e4; back += w * 76 / 1e4;
      }
      for (const u of r.ups) {
        if (u.k === "upF") continue;
        count.upper++; upRun += u.w;
        const H = u.k === "hood" ? UP_H - 13 : UP_H;
        carc += (2 * 33.2 * H + 3 * iw(u.w) * 33.2) / 1e4; front += u.w * (H + 2) / 1e4; back += u.w * H / 1e4;
        if (topLayer) { carc += (2 * 33.2 * topLayer + 2 * iw(u.w) * 33.2) / 1e4; front += u.w * topLayer / 1e4; }
      }
    }
    const SHEET = 1.22 * 2.44, WASTE = 1.12;
    const sheets = { carc: Math.ceil((carc * WASTE) / SHEET), front: Math.ceil((front * WASTE) / SHEET), back: Math.ceil((back * WASTE) / SHEET) };
    const m = (baseRun + upRun) / 100;
    const pr = N.CONFIG.pricing?.[S.finish];
    const price = pr ? [Math.round((pr[0] * baseRun) / 100 / 500) * 500, Math.round((pr[1] * baseRun) / 100 / 500) * 500] : null;
    return { runs, tri, sink, hob, fridge, checks, sheets, count, baseRun, upRun, m, tallTop, topLayer, price, dropped };
  }
  const f0 = (v) => String(Math.round(v)), f1 = (v) => (Math.round(v * 10) / 10).toString();
  const wallName = (k) => t({ A: "أ", B: "ب", C: "ج" }[k], k);

  // ------------------------------------------------------------------ drawing: plan (top view)
  const SVGNS = "http://www.w3.org/2000/svg";
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function drawPlan(P) {
    const W = wallsOf(), A = +S.A;
    const pts = [];
    for (const w of Object.values(W)) { pts.push(w.P, [w.P[0] + w.d[0] * w.len, w.P[1] + w.d[1] * w.len]); }
    const depthY = S.shape === "I" ? 300 : S.shape === "L" ? +S.B : S.shape === "U" ? Math.max(+S.B, +S.C) : +S.W;
    const roomW = S.shape === "G" ? Math.max(A, +S.B) : A, roomH = depthY;
    const pad = 70, vw = roomW + pad * 2, vh = roomH + pad * 2;
    const ink = css("--ink"), muted = css("--muted"), brass = css("--brass"), line = css("--line"), fin = FINISHES[S.finish], ctr = COUNTERS[S.counter].c;
    let s = `<svg viewBox="${-pad} ${-pad} ${vw} ${vh}" direction="${N.lang() === "ar" ? "rtl" : "ltr"}" role="img" aria-label="${t("مسقط المطبخ", "Kitchen plan")}">`;
    s += `<rect x="0" y="0" width="${roomW}" height="${roomH}" fill="${css("--surface")}" stroke="${line}" stroke-width="2" stroke-dasharray="8 6"/>`;
    // walls
    for (const [k, w] of Object.entries(W)) {
      const x1 = w.P[0], y1 = w.P[1], x2 = x1 + w.d[0] * w.len, y2 = y1 + w.d[1] * w.len, ox = -w.n[0] * 6, oy = -w.n[1] * 6;
      s += `<line x1="${x1 + ox}" y1="${y1 + oy}" x2="${x2 + ox}" y2="${y2 + oy}" stroke="${ink}" stroke-width="12" stroke-linecap="square"/>`;
      // dimension outside the wall
      const dx = -w.n[0] * 36, dy = -w.n[1] * 36, mx = (x1 + x2) / 2 + dx, my = (y1 + y2) / 2 + dy;
      s += `<line x1="${x1 + dx}" y1="${y1 + dy}" x2="${x2 + dx}" y2="${y2 + dy}" stroke="${brass}" stroke-width="1.5"/>`;
      s += `<line x1="${x1 + dx - w.d[1] * 6}" y1="${y1 + dy - w.d[0] * 6}" x2="${x1 + dx + w.d[1] * 6}" y2="${y1 + dy + w.d[0] * 6}" stroke="${brass}" stroke-width="2"/><line x1="${x2 + dx - w.d[1] * 6}" y1="${y2 + dy - w.d[0] * 6}" x2="${x2 + dx + w.d[1] * 6}" y2="${y2 + dy + w.d[0] * 6}" stroke="${brass}" stroke-width="2"/>`;
      const rot = w.d[1] !== 0 ? -90 : 0;
      s += `<text x="${mx}" y="${my}" fill="${brass}" font-size="17" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot} ${mx} ${my})" paint-order="stroke" stroke="${css("--bg")}" stroke-width="6">${t("حيطة", "Wall")} ${wallName(k)} · ${f0(w.len)}</text>`;
    }
    const quad = (w, s0, len, d0, d1) => { const p = (a, b) => [w.P[0] + w.d[0] * a + w.n[0] * b, w.P[1] + w.d[1] * a + w.n[1] * b]; return [p(s0, d0), p(s0 + len, d0), p(s0 + len, d1), p(s0, d1)].map((q) => q.join(",")).join(" "); };
    // counters first, then units on top
    for (const r of Object.values(P.runs)) {
      const w = r.wall;
      for (const u of r.items) if (!TALL.has(u.k) && u.k !== "skip") s += `<polygon points="${quad(w, u.s, u.w, 0, CTR_D)}" fill="${ctr}" stroke="none"/>`;
    }
    for (const r of Object.values(P.runs)) {
      const w = r.wall;
      for (const u of r.items) {
        if (u.k === "skip") continue;
        const tall = TALL.has(u.k), fill = u.k === "F" ? line : tall ? (u.k === "fridge" ? "#9aa09c" : fin.tall) : u.k === "dw" ? "#cfd3cf" : fin.base;
        s += `<polygon points="${quad(w, u.s, u.w, 0, tall ? (u.k === "fridge" ? 66 : BASE_D) : BASE_D)}" fill="${fill}" stroke="${ink}" stroke-width="1.2"/>`;
        const c = [w.P[0] + w.d[0] * (u.s + u.w / 2) + w.n[0] * 29, w.P[1] + w.d[1] * (u.s + u.w / 2) + w.n[1] * 29];
        if (u.k === "sink") s += `<rect x="${c[0] - (w.d[0] ? 30 : 20)}" y="${c[1] - (w.d[0] ? 20 : 30)}" width="${w.d[0] ? 60 : 40}" height="${w.d[0] ? 40 : 60}" rx="5" fill="#4a4d4b" stroke="${ink}"/>`;
        if (u.k === "hob") for (const [a, b] of [[-20, -11], [20, -11], [-20, 11], [20, 11]]) { const x = c[0] + (w.d[0] ? a : b), y = c[1] + (w.d[0] ? b : a); s += `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${ink}" stroke-width="1.6"/>`; }
        if (u.w >= 20 && u.k !== "F") {
          const rot = w.d[1] !== 0 ? -90 : 0, lx = c[0], ly = c[1] + (u.k === "sink" || u.k === "hob" ? (w.d[0] ? 0 : 0) : 0);
          const label = u.k === "fridge" ? t("تلاجة", "Fridge") : u.k === "tower" ? t("فرن", "Oven") : u.k === "dw" ? t("غسالة", "DW") : f1(u.w);
          if (u.k !== "sink" && u.k !== "hob") s += `<text x="${lx}" y="${ly}" font-size="15" font-weight="600" fill="${tall && S.finish === "dark" ? "#fff" : ink}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot} ${lx} ${ly})">${label}</text>`;
        }
        // width under the counter edge
        if (u.k !== "F" && u.w >= 25) {
          const q = [w.P[0] + w.d[0] * (u.s + u.w / 2) + w.n[0] * (CTR_D + 12), w.P[1] + w.d[1] * (u.s + u.w / 2) + w.n[1] * (CTR_D + 12)], rot = w.d[1] !== 0 ? -90 : 0;
          if (u.k === "sink" || u.k === "hob") s += `<text x="${q[0]}" y="${q[1]}" font-size="13" fill="${muted}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot} ${q[0]} ${q[1]})">${nm(u.k)} ${f0(u.w)}</text>`;
        }
      }
    }
    // the work triangle, measured between where you stand at each front
    if (P.tri) {
      const pt = { sink: P.sink, hob: P.hob, fridge: P.fridge };
      for (const [a, b, d] of P.tri) {
        const p = pt[a], q = pt[b], good = d >= 120 && d <= 270, col = good ? css("--ok") : css("--warn");
        const off = (k) => { const pp = pt[k]; const w = P.runs[pp[2]].wall; return [pp[0] + w.n[0] * 28, pp[1] + w.n[1] * 28]; };
        const P1 = off(a), Q1 = off(b), mx = (P1[0] + Q1[0]) / 2, my = (P1[1] + Q1[1]) / 2;
        s += `<line x1="${P1[0]}" y1="${P1[1]}" x2="${Q1[0]}" y2="${Q1[1]}" stroke="${col}" stroke-width="3" stroke-dasharray="10 7"/>`;
        s += `<text x="${mx}" y="${my}" font-size="15" font-weight="700" fill="${col}" text-anchor="middle" dominant-baseline="middle" paint-order="stroke" stroke="${css("--surface")}" stroke-width="6">${f1(d / 100)} ${t("م", "m")}</text>`;
      }
      for (const k of ["sink", "hob", "fridge"]) { const pp = pt[k], w = P.runs[pp[2]].wall; s += `<circle cx="${pp[0] + w.n[0] * 28}" cy="${pp[1] + w.n[1] * 28}" r="7" fill="${brass}"/>`; }
    }
    return s + "</svg>";
  }

  // ------------------------------------------------------------------ drawing: elevation of one wall (front view, as you stand facing it)
  function drawElev(P, key) {
    const r = P.runs[key]; if (!r) return "";
    const W = r.wall, L = W.len, H = +S.ceil, fin = FINISHES[S.finish], ctr = COUNTERS[S.counter].c;
    const ink = css("--ink"), muted = css("--muted"), brass = css("--brass"), prof = "#232624";
    const X = (s0, w) => (W.mirror ? L - s0 - w : s0), Y = (z) => H - z;
    const pad = 60;
    let s = `<svg viewBox="${-pad - 30} ${-pad} ${L + pad * 2 + 30} ${H + pad * 2}" direction="${N.lang() === "ar" ? "rtl" : "ltr"}" role="img" aria-label="${t("واجهة الحيطة", "Wall elevation")} ${wallName(key)}">`;
    s += `<rect x="0" y="0" width="${L}" height="${H}" fill="${css("--surface")}" stroke="${muted}" stroke-width="1.5"/>`;
    s += `<line x1="-20" y1="${H}" x2="${L + 20}" y2="${H}" stroke="${ink}" stroke-width="3"/>`;
    const rect = (x, y, w, h, f, extra = "") => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${f}" stroke="${ink}" stroke-width="1" ${extra}/>`;
    // splashback between counter and wall units (same porcelain)
    for (const u of r.items) if (!TALL.has(u.k) && u.k !== "skip") s += `<rect x="${X(u.s, u.w)}" y="${Y(UP_Z)}" width="${u.w}" height="${UP_Z - CTR_Z}" fill="${ctr}" opacity=".7"/>`;
    for (const u of r.items) {
      const x = X(u.s, u.w);
      if (u.k === "skip") { s += `<rect x="${x}" y="${Y(CTR_Z)}" width="${u.w}" height="${CTR_Z}" fill="url(#hatch)" opacity=".5"/>`; continue; }
      if (u.k === "F") { s += rect(x, Y(CTR_Z - 2), u.w, CTR_Z - 2 - PLINTH, fin.base) + rect(x, Y(PLINTH), u.w, PLINTH, prof); continue; }
      if (TALL.has(u.k)) {
        const top = P.tallTop;
        s += rect(x, Y(top), u.w, top - PLINTH, fin.tall) + rect(x, Y(PLINTH), u.w, PLINTH, prof);
        if (u.k === "fridge") { s += rect(x + 6, Y(191), u.w - 12, 191 - 6, "#a6aca8") + `<line x1="${x + 6}" y1="${Y(120)}" x2="${x + u.w - 6}" y2="${Y(120)}" stroke="${ink}"/>`; s += rect(x, Y(top), u.w, top - 197, fin.tall); }
        else { s += rect(x + 2, Y(140), u.w - 4, 58, "#151716") + rect(x + 2, Y(178), u.w - 4, 36, "#2a2d2b") + `<line x1="${x}" y1="${Y(46)}" x2="${x + u.w}" y2="${Y(46)}" stroke="${prof}" stroke-width="4"/>`; }
        continue;
      }
      // plinth, carcass front, handle line, counter
      s += rect(x, Y(PLINTH), u.w, PLINTH, prof);
      if (u.k === "dw") { s += rect(x + 1, Y(CTR_Z - 2), u.w - 2, CTR_Z - 2, "#c9cdc9"); s += `<line x1="${x + 6}" y1="${Y(80)}" x2="${x + u.w - 6}" y2="${Y(80)}" stroke="${ink}" stroke-width="2"/>`; }
      else {
        const fz0 = PLINTH + .3, fz1 = CTR_Z - 2 - 4; // fronts stop 4 cm under the carcass top: the built-in handle
        if (u.k === "drw" || u.k === "hob") { const hs = [(fz1 - fz0) * .28, (fz1 - fz0) * .34, (fz1 - fz0) * .38]; let z = fz1; for (let i = 0; i < 3; i++) { const h = hs[i] - (i < 2 ? 4 : 0); s += rect(x + .3, Y(z), u.w - .6, h, fin.base); z -= h; if (i < 2) { s += `<rect x="${x}" y="${Y(z)}" width="${u.w}" height="4" fill="${prof}"/>`; z -= 4; } } }
        else if (u.k === "open") { s += rect(x, Y(fz1 + 4), u.w, fz1 + 4 - fz0, css("--surface-2")); s += `<line x1="${x}" y1="${Y(50)}" x2="${x + u.w}" y2="${Y(50)}" stroke="${ink}"/>`; }
        else {
          const doors = u.k === "base1" ? 1 : u.k === "corner" ? 1 : 2, fw = u.k === "corner" ? u.w - BASE_D : u.w, fx = u.k === "corner" ? (!!u.flip !== W.mirror ? x : x + BASE_D) : x;
          if (u.k === "corner") s += rect(!!u.flip !== W.mirror ? x + fw : x, Y(fz1), BASE_D, fz1 - fz0, css("--surface-2"), 'stroke-dasharray="4 4"');
          for (let i = 0; i < doors; i++) s += rect(fx + (fw / doors) * i + .3, Y(fz1), fw / doors - .6, fz1 - fz0, fin.base);
        }
        s += `<rect x="${x}" y="${Y(CTR_Z - 2)}" width="${u.w}" height="4" fill="${prof}"/>`;
      }
      s += rect(x, Y(CTR_Z), u.w, 2, ctr);
      if (u.k === "sink") s += `<path d="M${x + u.w / 2} ${Y(CTR_Z)} v-26 h10" fill="none" stroke="${prof}" stroke-width="2.5"/>`;
      if (u.k === "hob") s += `<rect x="${x + 8}" y="${Y(CTR_Z) - 1}" width="${u.w - 16}" height="1.6" fill="${prof}"/>`;
    }
    // wall units, the hood unit raised, and the top layer to the ceiling
    for (const u of r.ups) {
      const x = X(u.s, u.w), top = UP_Z + UP_H;
      if (u.k === "upF") { s += rect(x, Y(top), u.w, UP_H, fin.upper); if (P.topLayer) s += rect(x, Y(top + P.topLayer), u.w, P.topLayer, fin.top); continue; }
      const z0 = u.k === "hood" ? 158 : UP_Z, doors = u.k === "up1" ? 1 : 2;
      for (let i = 0; i < doors; i++) s += rect(x + (u.w / doors) * i + .3, Y(top), u.w / doors - .6, top - z0 + 2, fin.upper);
      if (u.k === "hood") s += rect(x + 4, Y(z0 - 2), u.w - 8, 5, "#8d918e");
      s += `<rect x="${x + 3}" y="${Y(z0 - 2) + (u.k === "hood" ? 5 : 0)}" width="${u.w - 6}" height="1.4" fill="#ffd77a"/>`;
      if (P.topLayer) for (let i = 0; i < doors; i++) s += rect(x + (u.w / doors) * i + .3, Y(top + P.topLayer), u.w / doors - .6, P.topLayer - .6, fin.top);
    }
    // dimensions: unit widths along the bottom, heights at the side
    const dimY = H + 30;
    s += `<line x1="0" y1="${dimY}" x2="${L}" y2="${dimY}" stroke="${brass}" stroke-width="1.2"/>`;
    for (const u of r.items) {
      const x = X(u.s, u.w);
      s += `<line x1="${x}" y1="${dimY - 6}" x2="${x}" y2="${dimY + 6}" stroke="${brass}" stroke-width="1.5"/>`;
      if (u.w >= 24 && u.k !== "skip") s += `<text x="${x + u.w / 2}" y="${dimY - 8}" font-size="13" font-weight="600" fill="${brass}" text-anchor="middle">${f1(u.w)}</text>`;
    }
    s += `<line x1="${L}" y1="${dimY - 6}" x2="${L}" y2="${dimY + 6}" stroke="${brass}" stroke-width="1.5"/>`;
    s += `<text x="${L / 2}" y="${dimY + 24}" font-size="14" font-weight="700" fill="${brass}" text-anchor="middle">${t("طول الحيطة", "Wall")} ${f0(L)}${TOL ? ` — ${t("منهم", "incl.")} ${TOL} ${t("سم خلوص للموقع", "cm site tolerance")}` : ""}</text>`;
    const zs = [0, PLINTH, CTR_Z, UP_Z, UP_Z + UP_H].concat(P.topLayer ? [UP_Z + UP_H + P.topLayer] : []), dx = -26;
    s += `<line x1="${dx}" y1="${Y(0)}" x2="${dx}" y2="${Y(zs[zs.length - 1])}" stroke="${brass}" stroke-width="1.2"/>`;
    for (let i = 0; i < zs.length; i++) {
      s += `<line x1="${dx - 6}" y1="${Y(zs[i])}" x2="${dx + 6}" y2="${Y(zs[i])}" stroke="${brass}" stroke-width="1.5"/>`;
      if (i) s += `<text x="${dx - 22}" y="${(Y(zs[i]) + Y(zs[i - 1])) / 2 + 4}" font-size="13" font-weight="600" fill="${brass}" text-anchor="middle">${zs[i] - zs[i - 1]}</text>`;
    }
    s += `<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="${muted}" stroke-width="1"/></pattern></defs>`;
    return s + "</svg>";
  }

  // ------------------------------------------------------------------ the summary people send us
  function summary(P) {
    const f = FINISHES[S.finish], c = COUNTERS[S.counter];
    const shapeName = { I: t("خطي (حيطة واحدة)", "Single wall"), L: t("حرف L", "L-shape"), U: t("حرف U", "U-shape"), G: t("صفين متقابلين", "Galley") }[S.shape];
    const walls = Object.entries(wallsOf()).map(([k, w]) => `${wallName(k)} ${f0(w.len)}`).join(t("، ", ", "));
    const lines = [
      t("تصميم من مخطط مطبخ NOVERA", "Layout from the NOVERA kitchen planner"),
      `${t("الشكل", "Shape")}: ${shapeName} — ${t("الحيطان (سم)", "walls (cm)")}: ${walls}${S.shape === "G" ? ` — ${t("المسافة بين الحيطتين", "between walls")} ${S.W}` : ""}`,
      `${t("ارتفاع السقف", "Ceiling")}: ${S.ceil} ${t("سم", "cm")}${S.toCeil ? t(" — العلوي لحد السقف", " — wall units to the ceiling") : ""}`,
      `${t("التشطيب", "Finish")}: ${t(f.ar, f.en)} (${t(f.sub[0], f.sub[1])}) — ${t("الكونتر", "counter")}: ${t(c.ar, c.en)}`,
      `${t("الوحدات", "Units")}: ${P.count.base} ${t("سفلي", "base")}، ${P.count.upper} ${t("علوي", "wall")}، ${P.count.tall} ${t("طويل", "tall")} — ${f1(P.baseRun / 100)} ${t("م طولي سفلي", "m of base run")}`,
    ];
    if (P.tri) lines.push(`${t("مثلث الشغل", "Work triangle")}: ${f1(P.tri.reduce((a, x) => a + x[2], 0) / 100)} ${t("م", "m")}`);
    return lines.join("\n");
  }

  // ------------------------------------------------------------------ UI
  let P = null;
  function render() {
    try { N.store.set("novera-planner", JSON.stringify(S)); } catch { /* ignore */ }
    P = plan();
    // inputs visibility
    $("#fB").hidden = S.shape === "I"; $("#fC").hidden = S.shape !== "U"; $("#fW").hidden = S.shape !== "G";
    $("#fBl").textContent = S.shape === "G" ? t("الحيطة المقابلة", "Opposite wall") : S.shape === "U" ? t("الحيطة الشمال", "Left wall") : t("الحيطة التانية", "Second wall");
    for (const b of $$("[data-shape]")) b.setAttribute("aria-pressed", String(b.dataset.shape === S.shape));
    for (const b of $$("[data-finish]")) b.setAttribute("aria-pressed", String(b.dataset.finish === S.finish));
    for (const b of $$("[data-counter]")) b.setAttribute("aria-pressed", String(b.dataset.counter === S.counter));
    // view tabs
    const keys = Object.keys(P.runs);
    if (S.view === "elev" && !keys.includes(S.wall)) S.wall = keys[0];
    let tabs = `<button type="button" class="chip" data-view="plan" aria-pressed="${S.view === "plan"}">${t("المسقط", "Plan")}</button>`;
    for (const k of ["B", "A", "C"].filter((k) => keys.includes(k))) tabs += `<button type="button" class="chip" data-view="elev" data-wall="${k}" aria-pressed="${S.view === "elev" && S.wall === k}">${t("واجهة حيطة", "Wall")} ${wallName(k)}</button>`;
    $("#viewTabs").innerHTML = tabs;
    $("#canvas").innerHTML = S.view === "plan" ? drawPlan(P) : drawElev(P, S.wall);
    // kpis
    const sum = P.tri ? f1(P.tri.reduce((a, x) => a + x[2], 0) / 100) : "—";
    $("#kpis").innerHTML = [
      [P.count.base + P.count.upper + P.count.tall, t("وحدة", "units")],
      [f1(P.baseRun / 100), t("متر طولي سفلي", "m base run")],
      [sum, t("م مثلث الشغل", "m work triangle")],
      [P.sheets.carc + P.sheets.front, t("لوح 122×244 تقريباً", "sheets 122×244, approx.")],
    ].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("");
    $("#checks").innerHTML = P.checks.map((c) => `<div class="check ${c.ok ? "ok" : "warn"}"><i aria-hidden="true">${c.ok ? "✓" : "!"}</i><span>${t(c.ar, c.en)}</span></div>`).join("");
    // unit list
    let rows = "";
    for (const k of ["B", "A", "C"].filter((k) => P.runs[k])) {
      const r = P.runs[k]; let i = 0;
      for (const u of r.items) { if (u.k === "skip") continue; i++; rows += `<tr><td>${wallName(k)}${i}</td><td>${nm(u.k)}</td><td class="n">${f1(u.w)}</td><td>${TALL.has(u.k) ? t("طويل", "Tall") : t("سفلي", "Base")}</td></tr>`; }
      let j = 0;
      for (const u of r.ups) { j++; rows += `<tr><td>${wallName(k)}${t("ع", "W")}${j}</td><td>${nm(u.k)}</td><td class="n">${f1(u.w)}</td><td>${t("علوي", "Wall")}</td></tr>`; }
    }
    $("#ulist tbody").innerHTML = rows;
    $("#sheets").textContent = t(`تقدير مبدئي: ${P.sheets.carc} لوح هيكل، ${P.sheets.front} لوح ضلف، ${P.sheets.back} لوح ظهر 6 مم (بهالك 12٪). العدد الدقيق بيطلع من خطة القص بعد المعاينة.`,
      `Rough estimate: ${P.sheets.carc} carcass sheets, ${P.sheets.front} front sheets, ${P.sheets.back} back sheets 6 mm (12% waste). The exact count comes from the cutting plan after the site visit.`);
    const pe = $("#priceOut");
    pe.textContent = P.price
      ? t(`سعر مبدئي: من ${P.price[0].toLocaleString("ar-EG")} لحد ${P.price[1].toLocaleString("ar-EG")} جنيه — السعر النهائي بعد المعاينة.`, `Starting estimate: EGP ${P.price[0].toLocaleString("en")} – ${P.price[1].toLocaleString("en")} — final price after the site visit.`)
      : t("السعر بيتحسب بعد المعاينة من مسطح كل خامة في تصميمك، وبيوصلك سعر كل وحدة والإجمالي.", "The price is worked out after the site visit from the area of each material, with a price for every unit and the total.");
  }

  function init() {
    const form = $("#plannerForm");
    if (!form) return;
    for (const id of ["A", "B", "C", "W", "ceil"]) { const el = $("#p" + id); el.value = S[id]; }
    for (const id of ["fridge", "tower", "dw", "drw", "toCeil"]) $("#o" + id).checked = !!S[id];
    form.addEventListener("input", (e) => {
      const el = e.target;
      if (el.id?.startsWith("p")) { const k = el.id.slice(1), v = parseFloat(String(el.value).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(",", ".")); const lim = k === "ceil" ? [220, 400] : k === "W" ? [180, 600] : [120, 900]; if (v >= lim[0] && v <= lim[1]) { S[k] = v; el.removeAttribute("aria-invalid"); render(); } else el.setAttribute("aria-invalid", "true"); }
      if (el.id?.startsWith("o")) { S[el.id.slice(1)] = el.checked; render(); }
    });
    form.addEventListener("submit", (e) => e.preventDefault());
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-shape],[data-finish],[data-counter],[data-view]");
      if (!b) return;
      if (b.dataset.shape) S.shape = b.dataset.shape;
      if (b.dataset.finish) S.finish = b.dataset.finish;
      if (b.dataset.counter) S.counter = b.dataset.counter;
      if (b.dataset.view) { S.view = b.dataset.view; if (b.dataset.wall) S.wall = b.dataset.wall; }
      render();
    });
    $("#sendPlan").addEventListener("click", () => {
      const text = summary(P);
      try { sessionStorage.setItem("novera-plan", text); } catch { /* ignore */ }
      N.handoff($("#planOut"), text + "\n\n" + t("عايز أحجز معاينة للتصميم ده.", "I'd like to book a site visit for this layout."));
    });
    $("#bookPlan2").addEventListener("click", () => { try { sessionStorage.setItem("novera-plan", summary(P)); } catch { /* ignore */ } });
    $("#resetPlan").addEventListener("click", () => {
      Object.assign(S, { shape: "L", A: 400, B: 300, C: 300, W: 260, ceil: 290, fridge: true, tower: true, dw: true, drw: true, toCeil: false, finish: "novera", counter: "white", view: "plan", wall: "A" });
      for (const id of ["A", "B", "C", "W", "ceil"]) $("#p" + id).value = S[id];
      for (const id of ["fridge", "tower", "dw", "drw", "toCeil"]) $("#o" + id).checked = !!S[id];
      render();
    });
    // swatch colours come from the finishes table
    for (const b of $$("[data-finish]")) { const f = FINISHES[b.dataset.finish]; b.querySelector("i").innerHTML = `<b style="background:${f.upper}"></b><b></b><b style="background:${f.base}"></b>`; }
    render();
    document.addEventListener("novera:lang", render);
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", render);
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.NOVERA.planner = { plan: () => plan(), S };
})();
