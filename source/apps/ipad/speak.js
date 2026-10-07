// NOVERA Studio — speak.js
// Rule-based parser: a short Egyptian-Arabic (or English) sentence about a kitchen -> a structured request.
// No imports, no network, no AI. Deliberately avoids regex look-behind (older iPad Safari throws on it at load).
//
//   parseDesign("مطبخ حرف L في أوضة 3 في 4، الحوض تحت الشباك، ضلف أبيض لامع، تشطيب عادي")
//   -> { shape:"L", room:{w:300,d:400}, tier:"std", front:{lib:"acrylic_white",label:"…"}, sinkUnderWindow:true, … }

const AL = "\\u0621-\\u064A"; // Arabic letter range (after normalisation)
const PFX = "(?:[وبلفك]?ال|لل|[وبلفك])?"; // و/ب/ل/ف/ك + ال  (والحوض، بالفرن، للباب …)
const A = (s) => PFX + "(?:" + s + ")";
const L = (s) => "\\b(?:" + s + ")\\b";
const alt = (ar, en) => [ar && A(ar), en && L(en)].filter(Boolean).join("|");
const mkRe = (src, g) => new RegExp("(^|[^" + AL + "])(?:" + src + ")(?![" + AL + "])", g ? "g" : "");

/** first whole-word match of `src` in t -> {i, e, s} | null */
function find(t, src) {
  const m = mkRe(src).exec(t);
  if (!m) return null;
  const i = m.index + m[1].length, e = m.index + m[0].length;
  return { i, e, s: t.slice(i, e) };
}
function findAll(t, src) {
  const r = mkRe(src, true), out = [];
  let m;
  while ((m = r.exec(t))) {
    const i = m.index + m[1].length, e = m.index + m[0].length;
    out.push({ i, e, s: t.slice(i, e) });
    if (m[0].length === 0) r.lastIndex++;
  }
  return out;
}

// ---------------------------------------------------------------- normalise
function normalize(raw) {
  let s = String(raw == null ? "" : raw);
  s = s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660));
  s = s.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0));
  s = s.replace(/[ً-ٰٟـ]/g, ""); // tashkeel + tatweel
  s = s.replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ئ/g, "ي").replace(/ؤ/g, "و");
  s = s.replace(/²/g, "2").replace(/[×✕✖]/g, "x").replace(/٫/g, ".").replace(/٬/g, "");
  s = s.toLowerCase();
  for (let k = 0; k < 3; k++) s = s.replace(/(\d),(\d{3})(?!\d)/g, "$1$2"); // 80,000
  s = s.replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2"); // 3,5
  s = s.replace(/(\d)\.(\d)/g, "$1§$2");
  s = s.replace(/[،,;؛\n\r.!?؟:]+/g, " | ");
  s = s.replace(/§/g, ".");
  s = s.replace(/[^\w\s|.ء-ي*]/g, " ").replace(/_/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ---------------------------------------------------------------- vocab
const NUM = "(\\d+(?:\\.\\d+)?)";
const NUMB = NUM + "(?!\\d|\\.\\d)";
const UNIT = "(?:متر|امتار|متار|م|سم|cm|mt|meters?|metres?|m)(?![" + AL + "a-z])";
const SEPX = "\\s*(?:x|\\*|by|في|ف)\\s*";

const NEGW = /^(?:و)?(?:غير|بدون|بلا|مفيش|مافيش|ماليش|مش|مو|لا|no|without|not|dont|skip|remove)$/;
function negBefore(t, idx, n) {
  const head = t.slice(0, idx);
  const seg = head.slice(head.lastIndexOf("|") + 1);
  const toks = seg.split(/\s+/).filter(Boolean).slice(-(n || 2));
  return toks.some((k) => NEGW.test(k));
}
function prevToken(t, idx) {
  const head = t.slice(0, idx);
  const seg = head.slice(head.lastIndexOf("|") + 1).trim();
  if (!seg) return "";
  const toks = seg.split(/\s+/);
  return toks[toks.length - 1];
}

const FRONTS = {
  hpl_white: "أبيض", hpl_offwhite: "أوف وايت", hpl_grey: "رمادي", hpl_black: "أسود", hpl_beige: "بيج",
  acrylic_white: "أكريليك أبيض لامع", acrylic_champagne: "شامبين", acrylic_grey: "أكريليك رمادي",
  wood_oak_natural_v: "خشب أوك", wood_walnut_v: "خشب جوز", wood_beech: "زان",
  lacquer_white: "لاكيه أبيض", lacquer_green: "لاكيه أخضر", lacquer_blue: "لاكيه أزرق", lacquer_red: "لاكيه أحمر",
  pvc_white: "PVC أبيض", pvc_wood: "PVC خشبي",
};

// colour words, in blanking priority order (off-white before white, champagne before others)
const COLORS = [
  ["offwhite", alt("اوف\\s*(?:وايت|ابيض|وايط)|كريمي|كريم", "off\\s*white|offwhite|cream")],
  ["champagne", alt("شامبين|شمبانيا|شامبانيا|ذهبي|دهبي", "champagne|golden|gold")],
  ["white", alt("ابيض|ابيضه|بيضا|بيضاء|بيضه|بيض|وايت", "white")],
  ["grey", alt("رمادي|رماديه|جريه|جري|جراي|رصاصي|رصاصيه", "grey|gray")],
  ["black", alt("اسود|اسوده|سوداء|سودا|سوده|بلاك", "black")],
  ["beige", alt("بيج|بيجي", "beige")],
  ["wood", alt("خشب|خشبي|خشبيه|اوك|جوز|زان|تيك|بلوط", "wood|wooden|oak|walnut|beech|teak")],
  ["green", alt("اخضر|اخضره|خضرا|خضراء|خضره|زيتي|مينت", "green|mint")],
  ["blue", alt("ازرق|ازرقه|زرقا|زرقاء|زرقه|كحلي", "blue|navy")],
  ["red", alt("احمر|احمره|حمرا|حمراء|حمره|بوردو|عنابي", "red|burgundy")],
];
// a colour word right after one of these is about something else (marble, floor, fridge …), not the doors
const NOT_FRONT = new RegExp(
  "^" + PFX + "(?:رخام|ارضي|باركيه|بلاط|سيراميك|حيط|حايط|جدار|دهان|سقف|ستاره|ستاير|تلاج|ثلاج|فرن|شفاط|هود|غساله|ميكرو|بوتاجاز|بوتجاز|موقد|مسطح|حوض|مجلي|شباك|نافذ|باب|ترابيز|سفره|كرسي|كراسي|كاونتر|كونتر|سطح|ظهر|marble|floor|wall|ceiling|counter|countertop|sink|fridge|oven|hood|window|door|backsplash)"
);
const M_ACRYLIC = alt("اكريليك|اكليريك|اكريلك|اكرليك|اكريلي", "acrylic");
const M_GLOSS = alt("لامع|لميع|لامعه|جلوس|جلوسي", "gloss|glossy|shiny|high\\s*gloss");
const M_LACQUER = alt("لاكيه|لاكي|لاك|دوكو|دوكوه", "lacquer|lacquered|duco");
const M_PVC = alt("بي\\s*في\\s*سي|بيفيسي", "pvc");
const M_HPL = alt("ميلامين|فورميكا", "hpl|melamine|formica");

function parseFront(t) {
  // candidate colours with their positions (blank each match so "اوف وايت" is not also "وايت")
  let work = t;
  const cands = [];
  for (const [k, src] of COLORS) {
    for (const m of findAll(work, src)) {
      work = work.slice(0, m.i) + " ".repeat(m.e - m.i) + work.slice(m.e);
      if (NOT_FRONT.test(prevToken(t, m.i))) continue;
      cands.push({ k, i: m.i, s: m.s });
    }
  }
  cands.sort((a, b) => a.i - b.i);
  const base = cands.length ? cands[0].k : null;
  const mats = (src) => findAll(t, src).some((m) => !NOT_FRONT.test(prevToken(t, m.i)));
  const acrylic = mats(M_ACRYLIC), gloss = mats(M_GLOSS), lacquer = mats(M_LACQUER), pvc = mats(M_PVC), hpl = mats(M_HPL);
  const shiny = acrylic || gloss;
  let lib = null;
  if (base === null) {
    if (shiny) lib = "acrylic_white";
    else if (lacquer) lib = "lacquer_white";
    else if (pvc) lib = "pvc_white";
    else if (hpl) lib = "hpl_white";
  } else if (base === "white") {
    lib = lacquer ? "lacquer_white" : shiny ? "acrylic_white" : pvc ? "pvc_white" : "hpl_white";
  } else if (base === "offwhite") lib = "hpl_offwhite";
  else if (base === "grey") lib = shiny || lacquer ? "acrylic_grey" : "hpl_grey";
  else if (base === "black") lib = "hpl_black";
  else if (base === "beige") lib = shiny ? "acrylic_champagne" : "hpl_beige";
  else if (base === "champagne") lib = "acrylic_champagne";
  else if (base === "green") lib = "lacquer_green";
  else if (base === "blue") lib = "lacquer_blue";
  else if (base === "red") lib = "lacquer_red";
  else if (base === "wood") {
    const w = cands.filter((c) => c.k === "wood").map((c) => c.s).join(" ");
    if (pvc) lib = "pvc_wood";
    else if (/جوز|walnut/.test(w)) lib = "wood_walnut_v";
    else if (/زان|beech/.test(w)) lib = "wood_beech";
    else lib = "wood_oak_natural_v";
  }
  return lib ? { lib, label: FRONTS[lib] } : null;
}

// ---------------------------------------------------------------- keyword sources
const WIN = alt("شباك|شباكين|شبابيك|نافذه|نوافذ", "windows?");
const DOOR = alt("باب", "door");
const SINK = alt("حوض|مجلي|مغسله", "sink");
const FRIDGE = alt("[تث]لاج[ء-ي]*|فريزر|براد", "fridge|refrigerator|freezer");
const HOB = alt("بوتاجاز|بوتجاز|بوتاغاز|موقد|مسطح|هوب|وابور|شعلات|شعله|غاز", "hob|cooktop|stove|cooker");
const ENT = "(?:" + [
  WIN, DOOR, SINK, FRIDGE, HOB,
  alt("فرن|شفاط|هود|غساله|ميكرو[ء-ي]*|ضلف|تشطيب|ميزاني[ء-ي]*|دولاب|علو[ء-ي]*|ليد|اضاءه", "oven|hood|finish|budget|led"),
].join("|") + ")";
const ENT_RE = mkRe(ENT);
/** text after the keyword up to the next entity keyword / clause break */
function segAfter(t, src) {
  const f = find(t, src);
  if (!f) return null;
  const rest = t.slice(f.e);
  const bar = rest.indexOf("|");
  const r1 = bar < 0 ? rest : rest.slice(0, bar);
  const m = ENT_RE.exec(r1);
  return m ? r1.slice(0, m.index) : r1;
}

const ORD = [["اول", 1], ["تاني", 2], ["ثاني", 2], ["تالت", 3], ["ثالث", 3], ["رابع", 4]];
function ordNum(s) {
  for (const [w, n] of ORD) if (s.indexOf(w) >= 0) return n;
  return null;
}
function wallOf(seg) {
  let m = /(?:حيط|حايط|جدار|wall)[ء-ي]*\s*(?:رقم\s*)?(\d)(?!\d)/.exec(seg);
  if (m) return +m[1];
  m = /(?:حيط|حايط|جدار)[ء-ي]*\s+(?:ال)?(اول|تاني|ثاني|تالت|ثالث|رابع)/.exec(seg);
  if (m) return ordNum(m[1]);
  m = /(?:ال)?(اول|تاني|ثاني|تالت|ثالث|رابع)[ء-ي]*\s+(?:حيط|حايط|جدار)/.exec(seg);
  if (m) return ordNum(m[1]);
  m = /\b(first|second|third|fourth)\s+wall|\bwall\s*(\d)\b/.exec(seg);
  if (m) return m[2] ? +m[2] : { first: 1, second: 2, third: 3, fourth: 4 }[m[1]];
  return null;
}
function sideOf(seg) {
  const c = find(seg, alt("نص|وسط|منتصف", "middle|center|centre"));
  const l = find(seg, alt("شمال|يسار", "left"));
  const r = find(seg, alt("يمين", "right"));
  const list = [c && { k: "center", i: c.i }, l && { k: "left", i: l.i }, r && { k: "right", i: r.i }].filter(Boolean);
  list.sort((a, b) => a.i - b.i);
  return list.length ? list[0].k : null;
}

// ---------------------------------------------------------------- shape
const S_U = [
  "\\bu\\b", "(?:حرف|شكل)\\s*يو",
  "(?:تلات|ثلاث|تلاته|ثلاثه|3)\\s*(?:حيطان|حيط|حوايط|حوايط|جدران|walls?)", "three\\s*walls?",
].join("|");
const S_PAR = alt("متوازي|متوازيه|متقابل|متقابلين|متقابله|متواجه", "parallel|galley|facing") + "|face\\s*to\\s*face";
const S_L = [
  "\\bl\\b", "(?:حرف|شكل)\\s*(?:ل|ال|ايل)",
  A("حيطتين|حايطين|حيطين|حيطتان|جدارين|حايطتين"), "(?:two|2)\\s*walls?",
  "مطبخ\\s*(?:ب|ع)?ركن(?:ه|ي)?",
].join("|");
const S_LINE = [
  A("مستقيم|مستقيمه|خطي|خطيه"),
  "(?:حيط|حايط|جدار)[ء-ي]*\\s*واحد[ء-ي]*", "(?:خط|صف)\\s*واحد",
  "\\b(?:straight|linear)\\b", "(?:single|one|1)\\s*(?:wall|row|run)", "in\\s*a\\s*line",
].join("|");
const S_ISLAND = alt("جزير[ء-ي]*|ايلاند", "island");

function parseShape(t) {
  if (find(t, S_U)) return "U";
  if (find(t, S_PAR)) return "parallel";
  if (find(t, S_L)) return "L";
  const z = find(t, A("زاويه"));
  if (z && !/(?:في|ف)\s*$/.test(t.slice(0, z.i))) return "L";
  if (find(t, S_LINE)) return "line";
  return null;
}

// ---------------------------------------------------------------- helpers for numbers
const toCm = (v) => Math.round((v <= 20 ? v * 100 : v) * 100) / 100;
const rnd = (v) => Math.round(v);
const fmtMoney = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function scanBudget(w) {
  const tries = [
    [new RegExp("نص\\s*مليون"), () => 500000],
    [new RegExp(NUMB + "\\s*(?:مليون|million)(?![" + AL + "a-z])"), (m) => +m[1] * 1e6],
    [new RegExp(NUMB + "\\s*(?:الف|الاف|k)(?![" + AL + "a-z])"), (m) => +m[1] * 1000],
    [
      new RegExp(
        "(?:ميزاني[" + AL + "]*|budget|مبلغ|تكلفه|سعر|بسعر)(?:\\s+[^\\d\\s|]+){0,2}\\s*" + NUMB +
        "(?!\\s*(?:x|\\*|في|by)\\b|\\s*" + UNIT + ")(\\s*(?:الف|الاف|k)(?![" + AL + "a-z]))?(?:\\s*(?:جنيه|جنيها|egp|le)(?![" + AL + "a-z]))?"
      ),
      (m) => (m[2] || +m[1] < 1000 ? +m[1] * 1000 : +m[1]),
    ],
    [new RegExp(NUMB + "\\s*(?:جنيه|جنيها|egp|le|pounds?|ج)(?![" + AL + "a-z])"), (m) => (+m[1] < 1000 ? +m[1] * 1000 : +m[1])],
  ];
  for (const [re, fn] of tries) {
    const m = re.exec(w);
    if (m) return { value: Math.round(fn(m)), start: m.index, end: m.index + m[0].length };
  }
  return null;
}

// words that look like a request we do not model yet
const UNKV = alt(
  "رخام|رخامه|جرانيت|كوريان|سيراميك|ارضي[ء-ي]*|باركيه|بلاط|دهان|سقف|ستاره|ستاير|تكييف|ترابيز[ء-ي]*|سفره|كراسي|كرسي|بار|كاونتر|كونتر|امريكاني|اوبن|مفتوح|ريسبشن|درج|ادراج|سحاب|مفصلات|هاندل|مقابض|ستانلس|بانيو|حوضين",
  "marble|granite|floor|ceiling|handles?|counter|countertop|bar"
);
const STOPW = /^(?:و|في|ف|من|على|علي|مع|عن|ب|بس|ضلف|شباك|باب|حوض|تشطيب|ميزانيه|ليد|علوي|دولاب|ال|the|and|with|in|on)$/;

// ---------------------------------------------------------------- main
export function parseDesign(text) {
  const out = {
    shape: null, room: null, wallLen: null, tier: null, front: null,
    sinkUnderWindow: false, window: null, door: null, fridge: null, hobNear: null,
    appliances: [], island: false, wallUnits: null, led: false, glass: false, budget: null,
    understood: [], unknown: [],
  };
  const t = normalize(text);
  if (!t) return out;
  const U = out.understood, UNK = out.unknown;
  const clauses = t.split("|").map((c) => c.trim()).filter(Boolean);

  // ---- numbers: consume them from a working copy so nothing is counted twice
  let w = t;
  const blank = (re, fn) => {
    w = w.replace(re, function () {
      if (fn) fn(Array.prototype.slice.call(arguments));
      return " ";
    });
  };

  const bud = scanBudget(w);
  if (bud) {
    out.budget = bud.value;
    w = w.slice(0, bud.start) + " " + w.slice(bud.end);
  }

  // area ("مساحة 12 متر", "12 متر مربع") — not modelled: say so
  blank(new RegExp(NUM + "\\s*(?:متر\\s*مربع|متر\\s*2|م\\s*2|m\\s*2|sqm|sq\\s*m|sq\\s*meters?)(?![" + AL + "a-z])", "g"), (a) => UNK.push("مساحة " + a[1] + " متر مربع"));
  blank(new RegExp("(?:مساح[" + AL + "]*|area)\\s*(?:ال[" + AL + "]+\\s*)?" + NUMB + "(?:\\s*" + UNIT + ")?", "g"), (a) => UNK.push("مساحة " + a[1]));

  // window / door widths ("شباك 120 في النص", "عرض الشباك 1.2 متر", "باب 90")
  let winW = null;
  const widthOf = (n, unitGiven) => {
    const v = +n;
    if (unitGiven || v > 20 || n.indexOf(".") >= 0) return toCm(v);
    return null; // a plain small integer is a count, not a width
  };
  w = w.replace(new RegExp("عرض\\s*(?:ال)?(?:شباك|نافذه)\\s*" + NUMB + "(\\s*" + UNIT + ")?", "g"), (m0, n, u) => {
    const v = widthOf(n, !!u);
    if (v && winW === null) winW = v;
    return " شباك ";
  });
  w = w.replace(
    new RegExp("(^|[^" + AL + "])((?:ال)?(?:شباك|شبابيك|نافذه|window)(?:\\s*عرض)?)\\s*" + NUMB + "(\\s*" + UNIT + ")?(?:" + SEPX + NUM + "(?:\\s*" + UNIT + ")?)?", "g"),
    (m0, lead, kw, n, u) => {
      const v = widthOf(n, !!u);
      if (v && winW === null) winW = v;
      return lead + kw + " ";
    }
  );
  w = w.replace(new RegExp("عرض\\s*(?:ال)?باب\\s*" + NUMB + "(?:\\s*" + UNIT + ")?", "g"), " باب ");
  w = w.replace(
    new RegExp("(^|[^" + AL + "])((?:ال)?(?:باب|door)(?:\\s*عرض)?)\\s*" + NUMB + "(?:\\s*" + UNIT + ")?(?:" + SEPX + NUM + "(?:\\s*" + UNIT + ")?)?", "g"),
    (m0, lead, kw) => lead + kw + " "
  );
  blank(new RegExp("(?:ارتفاع|height)\\s*(?:ال[" + AL + "]+\\s*)?" + NUMB + "(?:\\s*" + UNIT + ")?", "g"));

  // "3 متر و 50 سم" -> 3.5 ; "3 متر ونص" -> 3.5
  w = w.replace(new RegExp(NUMB + "\\s*(?:متر|م|m|meters?|metres?)(?![" + AL + "a-z])\\s*و?\\s*" + NUMB + "\\s*(?:سم|cm)(?![" + AL + "a-z])", "g"), (m0, a, b) => " " + (+a + +b / 100) + " متر ");
  w = w.replace(new RegExp(NUMB + "\\s*(?:متر|م|m)(?![" + AL + "a-z])\\s*و\\s*نص(?![" + AL + "])", "g"), (m0, a) => " " + (+a + 0.5) + " متر ");

  // labelled lengths: طول / عرض / عمق (and length / width / depth)
  const lab = (src) => {
    const m = new RegExp("(?:" + src + ")\\s*(?:ال?(?:اوضه|غرفه|مطبخ|حيطه|حايط|جدار)\\s*)?" + NUMB + "(?:\\s*" + UNIT + ")?").exec(w);
    return m ? { v: +m[1], s: m.index, e: m.index + m[0].length } : null;
  };
  const cut = (x) => { w = w.slice(0, x.s) + " " + w.slice(x.e); };
  const labL = lab("طول|length"), labW = lab("عرض|width"), labD = lab("عمق|depth");
  const isEn = /length/.test(t);
  if (labL && (labW || labD)) {
    const second = isEn ? labW || labD : labW || labD;
    out.room = { w: toCm(labL.v), d: toCm(second.v) };
    [labL, labW, labD].filter(Boolean).sort((a, b) => b.s - a.s).forEach(cut);
  } else if (!labL && labW && labD) {
    out.room = { w: toCm(labW.v), d: toCm(labD.v) };
    [labW, labD].sort((a, b) => b.s - a.s).forEach(cut);
  } else if (labL || labW) {
    const one = labL || labW;
    out.wallLen = toCm(one.v);
    cut(one);
  }

  // "3 في 4" / "3×4 متر" / "400 x 300" / "3 by 4 meters" / "3 متر و 4 متر"
  if (!out.room && out.wallLen === null) {
    const optU = "(?:\\s*" + UNIT + ")?";
    const rd = [
      new RegExp(NUMB + optU + SEPX + NUMB + optU),
      new RegExp(NUMB + "\\s*" + UNIT + "\\s*و\\s*" + NUMB + optU),
      new RegExp(NUMB + "\\s*و\\s*" + NUMB + "\\s*" + UNIT),
    ];
    for (const re of rd) {
      const m = re.exec(w);
      if (m) {
        out.room = { w: toCm(+m[1]), d: toCm(+m[2]) };
        w = w.slice(0, m.index) + " " + w.slice(m.index + m[0].length);
        break;
      }
    }
  }

  // one length left ("حيطة 3 متر", "4 متر"): the wall length; more -> unknown
  {
    const re = new RegExp(NUMB + "(\\s*" + UNIT + ")?", "g");
    let m;
    const found = [];
    while ((m = re.exec(w))) {
      const before = w.slice(Math.max(0, m.index - 25), m.index);
      const labelled = /(?:حيط|حايط|جدار|wall|طول|عرض)[ء-ي]*\s*(?:ال[ء-ي]+\s*)?$/.test(before);
      // «الحيطة 2» / «حيطة 3» with no unit is the wall's number, not its length
      const wallNo = !m[2] && /(?:حيط|حايط|جدار|wall)[ء-ي]*\s*$/.test(before) && Number.isInteger(+m[1]) && +m[1] >= 1 && +m[1] <= 8;
      if (wallNo) continue;
      if (m[2] || labelled) found.push({ v: +m[1], txt: m[0].trim() });
    }
    if (!out.room && out.wallLen === null && found.length) out.wallLen = toCm(found.shift().v);
    for (const f of found) if (UNK.length < 6) UNK.push(f.txt);
  }
  if (out.room) out.wallLen = null;

  // ---- tier
  {
    const tiers = [
      ["lux", alt("فاخر|فاخره|لوكس|راقي|راقيه|غالي|غاليه|سوبر\\s*لوكس", "luxury|lux|premium|high\\s*end|deluxe")],
      ["eco", alt("اقتصادي|اقتصاديه|رخيص|رخيصه|ارخص|بسيط|بسيطه", "economy|economic|eco|cheap|basic|low\\s*cost")],
      ["std", alt("عادي|عاديه|متوسط|متوسطه|ستاندرد|مقبول", "standard|std|medium|regular|normal|average|mid\\s*range|midrange")],
    ];
    let best = null;
    for (const [k, src] of tiers) {
      const f = find(t, src);
      if (f && (!best || f.i < best.i)) best = { k, i: f.i };
    }
    if (best) out.tier = best.k;
  }

  // ---- front / material
  out.front = parseFront(t);

  // ---- shape + island
  out.shape = parseShape(t);
  {
    const f = find(t, S_ISLAND);
    if (f && !negBefore(t, f.i)) out.island = true;
    if (out.island && !out.shape) out.shape = "island";
  }

  // ---- window / door
  // «بدون شباك / مفيش شباك / من غير باب»: nothing is added
  const winM0 = find(t, WIN), winNo = !!(winM0 && negBefore(t, winM0.i, 1));
  const winM = winNo ? null : winM0;
  if (winM || (winW !== null && !winNo)) {
    const seg = segAfter(t, WIN) || "";
    out.window = { wall: wallOf(seg), at: sideOf(seg), w: winW };
  }
  const doorM = find(t, DOOR);
  if (doorM && !negBefore(t, doorM.i, 1)) {
    const seg = segAfter(t, DOOR) || "";
    out.door = { wall: wallOf(seg), at: sideOf(seg) };
  }

  // ---- sink under window (default true when a window is mentioned)
  if (out.window) {
    let under = true, explicit = false;
    for (const c of clauses) {
      const s = find(c, SINK), wi = find(c, WIN);
      if (!s || !wi) continue;
      const a = Math.min(s.i, wi.i), b = Math.max(s.e, wi.e);
      const between = c.slice(a, b);
      const near = c.slice(Math.max(0, a - 12), b);
      if (/(?:^|\s)(?:مش|مو|مب|ليس|غير|بعيد|بعيده|not|away|no)(?:\s|$)/.test(near)) { under = false; explicit = true; break; }
      if (s.i < wi.i ? /(?:تحت|علي|على|عند|under|below|beneath|\sat\s)|\sع\s/.test(between) : /(?:فوق|above|over)/.test(between)) explicit = true;
    }
    out.sinkUnderWindow = under;
    out._sinkExplicit = explicit;
  }

  // ---- fridge position
  const NEAR = "(?:جنب|بجنب|قريب(?:ه)?(?:\\s*من)?|عند|قدام|جوار|بجوار|ناحيه|علي|على|مع|\\sع(?=\\s*ال)|near|next\\s+to|beside|by|at)";
  const FR = "(?:[تث]لاج|fridge|refrigerator)";
  const DR = "(?:ال|the\\s+)?(?:باب|door)";
  for (const c of clauses) {
    if (!find(c, FRIDGE)) continue;
    let pos = null;
    if (new RegExp(FR + "[^|]{0,25}?" + NEAR + "\\s*" + DR).test(c) || new RegExp("(?:باب|door)[^|]{0,12}?" + NEAR + "\\s*(?:ال|the\\s+)?" + FR).test(c)) pos = "nearDoor";
    else if (find(c, alt("ركنه|ركن|زاويه|كورنر", "corner"))) pos = "corner";
    else if (find(c, alt("اخر|اخره|اخرها|نهايه", "end|last"))) pos = "end";
    if (pos) { out.fridge = pos; break; }
  }

  // ---- hob near window / sink
  {
    const NH = "(?:جنب|بجنب|قريب(?:ه)?(?:\\s*من)?|عند|قدام|جوار|بجوار|ناحيه|مع|تحت|علي|على|near|next\\s+to|beside|by|under|at)";
    const E = "\\s*(?:ال|the\\s+)?(?:(شباك|شبابيك|نافذه|window)|(حوض|مجلي|مغسله|sink))";
    for (const c of clauses) {
      const h = find(c, HOB);
      if (!h) continue;
      const after = c.slice(h.e, h.e + 32);
      let m = new RegExp("^[^|]{0,14}?" + NH + E).exec(after);
      if (!m) m = new RegExp("(?:(?:ال)?(شباك|شبابيك|نافذه|window)|(?:ال)?(حوض|مجلي|مغسله|sink))[^|]{0,10}?" + NH + "\\s*(?:ال)?(?:بوتاجاز|بوتجاز|موقد|مسطح|هوب|غاز|hob|cooktop|stove)").exec(c);
      if (m) { out.hobNear = m[1] ? "window" : "sink"; break; }
    }
    if (out.hobNear === "window" && !out.window) out.window = { wall: null, at: null, w: null };
  }

  // ---- appliances
  const APP = [
    ["oven", alt("فرن|بلت\\s*ان", "oven")],
    ["microwave", alt("ميكروويف|ميكرويف|ميكرو\\s*ويف|مايكرويف|مايكروويف|ميكرو", "microwave")],
    ["dishwasher", alt("غساله\\s*(?:ال)?(?:اطباق|صحون)|غسالات\\s*اطباق", "dish\\s*washer|dishwasher")],
    ["washer", alt("غساله|غسالات", "washer|washing\\s*machine")],
    ["hood", alt("شفاط|شفاطه|هود", "hood|extractor")],
    ["fridge", FRIDGE],
    ["tall", alt("دولاب\\s*(?:ال)?تموين|دولاب\\s*طويل|تموين|عمود|بانتري", "pantry|tall\\s*(?:unit|cabinet)")],
  ];
  {
    let work = t;
    for (const [k, src] of APP) {
      const hits = findAll(work, src);
      for (const m of hits) work = work.slice(0, m.i) + " ".repeat(m.e - m.i) + work.slice(m.e);
      const ok = hits.some((m) => !negBefore(t, m.i));
      if (ok && out.appliances.indexOf(k) < 0) out.appliances.push(k);
    }
    const order = APP.map((a) => a[0]);
    out.appliances.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  // ---- wall units / led / glass
  {
    const f = find(t, alt("علو[ء-ي]{0,3}|علويات", "upper|top\\s*cabinets?|wall\\s*(?:units?|cabinets?)"));
    if (f) out.wallUnits = !negBefore(t, f.i);
    const l = find(t, alt("ليد|ليدات|اضاءه|اناره", "led|lights?|lighting"));
    if (l && !negBefore(t, l.i)) out.led = true;
    const g = find(t, alt("زجاج|زجاجي|زجاجيه|جلاس|فتري[ء-ي]*", "glass"));
    if (g && !negBefore(t, g.i)) out.glass = true;
  }

  // ---- unknown: things that look like requests but are not modelled
  for (const m of findAll(t, UNKV)) {
    if (UNK.length >= 6) break;
    const rest = t.slice(m.e).trim().split(/\s+/)[0] || "";
    const head = t.slice(m.e).trim();
    const next = head && head[0] !== "|" && !/^[\d|]/.test(rest) && !STOPW.test(rest) && /^[ء-ي]{2,}$|^[a-z]{2,}$/.test(rest) ? " " + rest : "";
    const ph = (m.s + next).trim();
    if (UNK.indexOf(ph) < 0) UNK.push(ph);
  }
  out.unknown = UNK.filter((v, i) => UNK.indexOf(v) === i).slice(0, 6);

  // ---- what we understood, in Egyptian Arabic
  const SHAPE_AR = { line: "مطبخ مستقيم (حيطة واحدة)", L: "مطبخ حرف L", U: "مطبخ حرف U", parallel: "مطبخ متوازي", island: "مطبخ بجزيرة" };
  if (out.shape) U.push(SHAPE_AR[out.shape]);
  if (out.island && out.shape !== "island") U.push("جزيرة");
  if (out.room) U.push("أوضة " + rnd(out.room.w) + "×" + rnd(out.room.d));
  else if (out.wallLen !== null) U.push("طول الحيطة " + rnd(out.wallLen) + " سم");
  if (out.tier) U.push({ eco: "تشطيب اقتصادي", std: "تشطيب عادي", lux: "تشطيب فاخر" }[out.tier]);
  if (out.front) U.push("ضلف " + out.front.label);
  const SIDE_AR = { center: "في النص", left: "ع الشمال", right: "ع اليمين" };
  const place = (name, o, wd) => name + (wd ? " " + rnd(wd) + " سم" : "") + (o.wall ? " على حيطة " + o.wall : "") + (o.at ? " " + SIDE_AR[o.at] : "");
  if (out.window) U.push(place("شباك", out.window, out.window.w));
  if (out.sinkUnderWindow) U.push(out._sinkExplicit ? "الحوض تحت الشباك" : "الحوض تحت الشباك (تلقائي)");
  delete out._sinkExplicit;
  if (out.door) U.push(place("باب", out.door, 0));
  if (out.fridge) U.push({ nearDoor: "التلاجة جنب الباب", end: "التلاجة في آخر الصف", corner: "التلاجة في الركنة" }[out.fridge]);
  if (out.hobNear) U.push(out.hobNear === "window" ? "البوتاجاز جنب الشباك" : "البوتاجاز جنب الحوض");
  const APP_AR = { oven: "فرن", microwave: "ميكروويف", dishwasher: "غسالة أطباق", washer: "غسالة", hood: "شفاط", fridge: "تلاجة", tall: "دولاب تموين" };
  for (const a of out.appliances) if (!(a === "fridge" && out.fridge)) U.push(APP_AR[a]);
  if (out.wallUnits === true) U.push("بدواليب علوية");
  if (out.wallUnits === false) U.push("من غير علوي");
  if (out.led) U.push("إضاءة LED");
  if (out.glass) U.push("ضلف زجاج");
  if (out.budget !== null) U.push("ميزانية " + fmtMoney(out.budget) + " جنيه");
  return out;
}

/** example sentences the UI shows as chips */
export const examples = [
  "مطبخ حرف L في أوضة 3 في 4، الحوض تحت الشباك، التلاجة جنب الباب، ضلف أبيض لامع، تشطيب عادي",
  "مطبخ مستقيم على حيطة 3.5 متر، ضلف خشب أوك، من غير علوي، ميزانية 80 ألف",
  "مطبخ حرف U في أوضة 4×3، تشطيب فاخر، ضلف لاكيه أخضر، فرن وميكروويف وشفاط، ليد تحت العلوي",
  "مطبخ متوازي أوضة 2.5 في 4 متر، غسالة أطباق، دولاب تموين، ضلف رمادي، تشطيب اقتصادي",
  "مطبخ بجزيرة في أوضة 4 في 5، شباك 120 في النص، البوتاجاز جنب الشباك، ضلف جوز، تشطيب لوكس",
  "مطبخ على شكل L، شباك على الحيطة التانية، الباب على الشمال، التلاجة في الركنة، ضلف بيج، علوي بضلف زجاج",
];
