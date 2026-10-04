// NOVERA Studio — built-in appliance catalog (Egypt market, generic sizes per appliance class).
// Every number is cm. `size` = the appliance itself (outer, front dimensions), `cavity` = the opening/niche
// the cabinet must leave for it, `params` = the kitchen-engine parameters that produce that cavity
// (plus app-level fields like hob_cutout_w/d), `width` = recommended cabinet width.
// Sizes are typical for the CLASS (not exact model numbers) — always check the datasheet of the model
// the client actually buys. Plain data + tiny pure helpers, no imports, never mutates its inputs.

const SIDE = 1.8;                       // one cabinet side panel (door thickness in the engine)
const r1 = (n) => Math.round(n * 10) / 10;
const uw = (cav) => r1(cav.w + 2 * SIDE);   // cabinet width that holds this cavity between two side panels
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export const CLASS_LABELS = {
  oven: "فرن",
  microwave: "ميكروويف",
  fridge: "تلاجة",
  washer: "غسالة / غسالة أطباق",
  sink: "حوض",
  hob: "بوتجاز / مسطح",
  cooker: "بوتجاز عادي (واقف)",
  hood: "شفاط",
};

const P16 = "كهربا 16 أمبير";
const P32 = "كهربا 32 أمبير";   // dedicated line (ceramic / induction 4-zone hobs)
const GAS = "غاز";
const BOTH = "كهربا + غاز";

const sz = (w, h, d) => ({ w, h, d });

// ---------------------------------------------------------------- oven
const oven = (id, label, size, cavity, width, brands, note, power) => ({
  id, label, size, cavity,
  params: { oven_cavity_height: cavity.h },
  width, brands, note, power,
});

const OVENS = [
  oven("oven60_std", "فرن بلت إن 60 قياسي كهربا", sz(59.5, 59.5, 55), sz(56, 59.5, 55), 60,
    ["Bosch", "Beko", "Zanussi", "Fresh", "Unionaire", "Tornado", "Glemgas", "Elba", "Kiriazi", "Samsung", "LG"],
    "الفتحة 56 عرض × 59.5 ارتفاع. البريزة 16 أمبير في دولاب جنب الفرن أو فوق الفتحة، مش ورا الفرن. سيب فتحة تهوية في الخلفية.",
    P16),
  oven("oven60_gas", "فرن بلت إن 60 غاز + كهربا", sz(59.5, 59.5, 55), sz(56, 59.5, 55), 60,
    ["Fresh", "Unionaire", "Tornado", "Glemgas", "Elba", "Kiriazi"],
    "نفس فتحة الفرن الكهربا. محتاج خرطوم غاز مرن + بريزة للإشعال والمروحة. وصلة الغاز تبقى بره الدولاب ويتركب لها محبس.",
    BOTH),
  oven("oven60_steam", "فرن بلت إن 60 بالبخار", sz(59.5, 59.5, 56), sz(56, 59.5, 55), 60,
    ["Bosch", "Zanussi", "Beko"],
    "نفس فتحة 60 القياسية. بريزة 16 أمبير. الفرن بيحتاج مية (خزان) فسيب مكان لتفريغ الخزان من الواجهة.",
    P16),
  oven("oven60_pyro", "فرن بلت إن 60 تنظيف ذاتي", sz(59.5, 59.5, 55), sz(56, 59.5, 55), 60,
    ["Bosch", "Zanussi"],
    "نفس فتحة 60. بيسخن جداً وقت التنظيف فاعمل تهوية كويسة وخلي الخشب حواليه بعيد عن الفتحة 0.5 سم على الأقل.",
    P16),
  oven("oven90", "فرن بلت إن 90 سم", sz(89.4, 59.5, 55), sz(86, 59.5, 55), 90,
    ["Glemgas", "Elba"],
    "الفتحة 86 عرض. بريزة 16 أمبير جنب الفرن. محتاج وحدة عرضها 90 وألواح جنب سميكة عشان الوزن.",
    P16),
  oven("oven45", "فرن بلت إن كمبكت 45 سم", sz(59.5, 45.5, 55), sz(56, 45.5, 55), 60,
    ["Bosch", "Zanussi", "Samsung"],
    "ارتفاع الفتحة 45.5 فقط. بيتركب جنب أو فوق فرن 60 أو فوق درج تسخين. بريزة 16 أمبير مخفية.",
    P16),
  oven("oven45_steam", "فرن بلت إن كمبكت 45 سم بالبخار", sz(59.5, 45.5, 55), sz(56, 45.5, 55), 60,
    ["Bosch", "Zanussi"],
    "ارتفاع الفتحة 45.5. بريزة 16 أمبير. خزان المية بيتملى من الواجهة فسيب مسافة قدامه.",
    P16),
];

// ---------------------------------------------------------------- microwave
const mw = (id, label, size, cavity, brands, note, power) => ({
  id, label, size, cavity,
  params: { microwave_cavity_height: cavity.h, microwave_cavity_width: cavity.w },
  width: 60, brands, note, power,
});

const MICROWAVES = [
  mw("mw_solo36", "ميكروويف بلت إن سولو 36 سم", sz(59.5, 36, 32), sz(56, 36, 55),
    ["Bosch", "Beko", "Zanussi", "Samsung", "LG", "Sharp"],
    "فتحة 56×36. بريزة 16 أمبير جوه الدولاب أو فوق الفتحة. الجهاز مش محتاج أكتر من 32 سم عمق بس سيب 55 للسلك والتهوية.",
    P16),
  mw("mw_std38", "ميكروويف بلت إن 38 سم مع جريل", sz(59.5, 38, 32), sz(56, 38, 55),
    ["Bosch", "Beko", "Zanussi", "Samsung", "LG", "Sharp", "Elba"],
    "فتحة 56×38. بريزة 16 أمبير مخفية. محتاج تهوية من فوق ومن ورا، متحطوش جنب مصدر حرارة.",
    P16),
  mw("mw_combi38", "ميكروويف بلت إن كومبي 38 سم (هوا ساخن + جريل)", sz(59.5, 38, 40), sz(56, 38, 55),
    ["Bosch", "Beko", "Samsung", "LG"],
    "نفس فتحة 56×38. بيسخن أكتر من العادي فاعمل تهوية خلفية 5 سم على الأقل. بريزة 16 أمبير.",
    P16),
  mw("mw_compact45", "ميكروويف بلت إن كمبكت 45 سم", sz(59.5, 45, 45), sz(56, 45, 55),
    ["Bosch", "Beko", "Zanussi", "Samsung"],
    "فتحة 56×45. بيتحط في عمود طويل مع الفرن (الميكروويف فوق الفرن). بريزة 16 أمبير مفصولة عن بريزة الفرن.",
    P16),
  mw("mw_compact45_combi", "ميكروويف بلت إن كمبكت 45 سم كومبي", sz(59.5, 45, 50), sz(56, 45, 55),
    ["Bosch", "Zanussi", "Samsung"],
    "فتحة 56×45. مناسب لعمود فرن + ميكروويف. بريزة 16 أمبير مخفية وتهوية من فوق.",
    P16),
  mw("mw_freestanding", "ميكروويف عادي 25–30 لتر في نيش", sz(51, 30, 40), sz(55, 34, 50),
    ["Sharp", "LG", "Samsung", "Toshiba", "Fresh", "Unionaire", "Tornado", "Kiriazi"],
    "نيش 55×34 للميكروويف العادي (مش بلت إن). سيب 10 سم من فوق و5 من الجنب للتهوية. بريزة 16 أمبير جنب النيش.",
    P16),
];

// ---------------------------------------------------------------- fridge
// free-standing: cavity = appliance + 5 wide, + 5 high, depth + 2 ; unit width = cavity w + 2 side panels
const fr = (id, label, size, brands, note, cavity) => {
  const cav = cavity || sz(size.w + 5, size.h + 5, size.d + 2);
  return {
    id, label, size, cavity: cav,
    params: { fridge_cavity_width: cav.w, fridge_cavity_height: cav.h, depth: cav.d },
    width: uw(cav), brands, note, power: P16,
  };
};

const FRIDGES = [
  fr("fridge14", "تلاجة 14 قدم نوفروست", sz(59, 146, 66),
    ["Fresh", "Unionaire", "Tornado", "Toshiba", "Sharp", "Beko", "LG"],
    "بريزة 16 أمبير على الحيطة جنب التلاجة وليس ورا ضهرها. سيب فتحة تهوية فوق التلاجة (دولاب علوي مفتوح من ورا)."),
  fr("fridge16", "تلاجة 16 قدم نوفروست (قياسية)", sz(63, 165, 68),
    ["Fresh", "Unionaire", "Tornado", "Toshiba", "Sharp", "Beko", "LG", "Samsung", "Zanussi"],
    "بريزة 16 أمبير جنب التلاجة. سيب 5 سم تهوية فوق وعلى الجنب، ودولاب فوق التلاجة يكون مفتوح من الخلف."),
  fr("fridge18", "تلاجة 18 قدم نوفروست", sz(67, 172, 69),
    ["Fresh", "Unionaire", "Tornado", "Toshiba", "Sharp", "Beko", "LG", "Samsung", "Zanussi"],
    "بريزة 16 أمبير جنب التلاجة. تهوية 5 سم فوق وجنب. الباب بيفتح 90 درجة ومحتاج مسافة من الحيطة الجانبية."),
  fr("fridge20", "تلاجة 20 قدم نوفروست", sz(70, 178, 71),
    ["Fresh", "Unionaire", "Tornado", "Toshiba", "Sharp", "Beko", "LG", "Samsung"],
    "بريزة 16 أمبير جنب التلاجة. تهوية 5 سم فوق وجنب. افحص ارتفاع الدولاب العلوي فوقها."),
  fr("fridge24_sbs", "تلاجة سايد باي سايد 24 قدم", sz(91, 177, 73),
    ["Samsung", "LG", "Toshiba", "Sharp", "Fresh", "Beko", "Bosch"],
    "بريزة 16 أمبير جنب التلاجة. لو فيها ديسبنسر مية محتاج خط مية صغير في الحيطة. سيب 5 سم تهوية فوق وجنب وبلاش دواليب ملاصقة للباب."),
  fr("fridge28_fd", "تلاجة فرينش دور 28 قدم", sz(91, 180, 75),
    ["Samsung", "LG", "Bosch", "Beko", "Toshiba"],
    "بريزة 16 أمبير جنب التلاجة وخط مية للثلج لو موجود. الأبواب بتفتح بعرض كبير فسيب مسافة جانبية 5 سم على الأقل."),
  fr("fridge_builtin178", "تلاجة بلت إن 178 سم", sz(54, 177.5, 54.5),
    ["Bosch", "Beko", "Zanussi"],
    "الفتحة 56×178 (مقاس النيش الفعلي من الشركة المصنعة). الباب بيتركب على باب الدولاب. بريزة 16 أمبير في أعلى النيش والتهوية من الأسفل ومن الأعلى.",
    sz(56, 178, 55)),
  fr("fridge_builtin140", "تلاجة بلت إن 140 سم", sz(54, 139.5, 54.5),
    ["Bosch", "Beko", "Zanussi"],
    "الفتحة 56×140. الباب بيتركب على باب الدولاب. بريزة 16 أمبير في أعلى النيش وفتحة تهوية سفلية وعلوية.",
    sz(56, 140, 55)),
];

// ---------------------------------------------------------------- washer / dishwasher
const wm = (id, label, size, cavity, brands, note) => ({
  id, label, size, cavity,
  params: { washer_cavity_width: cavity.w, washer_cavity_height: cavity.h },
  width: uw(cavity), brands, note, power: P16,
});

const WASHERS = [
  wm("wash_7_8", "غسالة ملابس فول أوتوماتيك 7–8 كجم (60×85×60)", sz(60, 85, 60), sz(62, 87, 62),
    ["Bosch", "Beko", "Zanussi", "LG", "Samsung", "Toshiba", "Fresh", "Unionaire", "Sharp", "Kiriazi"],
    "محتاج مية داخلة + صرف + بريزة 16 أمبير جنب النيش. سيب 5 سم ورا للخراطيم. الغسالة بتتحرك فخلي الأرضية ثابتة."),
  wm("wash_9_10", "غسالة ملابس فول أوتوماتيك 9–10 كجم (60×85×65)", sz(60, 85, 65), sz(62, 87, 67),
    ["Bosch", "Beko", "Zanussi", "LG", "Samsung", "Toshiba", "Fresh"],
    "أعمق من العادية 5 سم. مية + صرف + بريزة 16 أمبير. سيب 5 سم ورا للخراطيم."),
  wm("wash_slim", "غسالة ملابس سليم 6 كجم (60×85×45)", sz(60, 85, 45), sz(62, 87, 47),
    ["Bosch", "Beko", "LG", "Samsung"],
    "مناسبة للأماكن الضيقة (عمق 45). مية + صرف + بريزة 16 أمبير."),
  wm("wash_builtin", "غسالة ملابس بلت إن 60 سم", sz(59.5, 81.5, 57.5), sz(60, 82, 58),
    ["Bosch", "Beko", "Zanussi"],
    "بتتركب تحت الكاونتر ويتحط عليها باب الدولاب. نيش 60×82. مية + صرف + بريزة 16 أمبير في دولاب جنبها."),
  wm("dish60", "غسالة أطباق 60 سم (حرة)", sz(60, 85, 60), sz(61, 86, 60),
    ["Bosch", "Beko", "Zanussi", "Fresh", "Unionaire", "Samsung"],
    "محتاج مية داخلة + صرف + بريزة 16 أمبير. اعمل الخراطيم في دولاب الحوض المجاور. رجلين الغسالة بتتضبط بين 82 و87 سم."),
  wm("dish60_builtin", "غسالة أطباق 60 سم بلت إن (مدمجة)", sz(59.8, 81.5, 55), sz(60, 82, 57),
    ["Bosch", "Beko", "Zanussi"],
    "نيش 60×82 تحت الكاونتر ويتركب عليها باب الدولاب. مية + صرف + بريزة 16 أمبير في دولاب الحوض، قريبة من الحوض."),
  wm("dish45", "غسالة أطباق 45 سم (حرة)", sz(45, 85, 60), sz(46, 86, 60),
    ["Bosch", "Beko", "Zanussi", "Fresh"],
    "للمطابخ الصغيرة. مية + صرف + بريزة 16 أمبير. نفس التوصيلات بتاعة 60 سم."),
  wm("dish45_builtin", "غسالة أطباق 45 سم بلت إن", sz(44.8, 81.5, 55), sz(45, 82, 57),
    ["Bosch", "Beko", "Zanussi"],
    "نيش 45×82 تحت الكاونتر. مية + صرف + بريزة 16 أمبير جنب الحوض."),
];

// ---------------------------------------------------------------- sink (inset unless stated)
// size = {w, h: bowl depth, d}; cavity = the countertop cut-out (rim overlaps ~1 cm each side)
const sk = (id, label, size, cavity, width, brands, note) => ({
  id, label, size, cavity,
  params: { include_sink_cutout: true, sink_cutout_width: cavity.w, sink_cutout_depth: cavity.d },
  width, brands, note, power: "",
});

const SINKS = [
  sk("sink_single50", "حوض بحوض واحد 50×40", sz(50, 18, 40), sz(48, 18, 38), 60,
    ["Franke", "Elleci"],
    "للمطابخ الصغيرة. قطع الرخام 48×38. وصلة صرف 1.5 بوصة ومياه ساخنة وباردة في الدولاب."),
  sk("sink_15_80", "حوض بحوض ونص 80×48", sz(80, 18, 48), sz(78, 18, 46), 90,
    ["Franke", "Elleci"],
    "قطع 78×46 ويحتاج دولاب 90 عشان ألواح الجنب. الحوض الصغير بتاع التجفيف على اليمين أو اليسار حسب الاتجاه."),
  sk("sink_double86", "حوض بحوضين 86×48", sz(86, 18, 48), sz(84, 18, 46), 90,
    ["Franke", "Elleci"],
    "قطع 84×46 في دولاب 90. صرف مزدوج (سيفون ثنائي). سيب مكان لسلة المخلفات."),
  sk("sink_100_drainer", "حوض 100×50 مع ديب (ناشف الأطباق)", sz(100, 18, 50), sz(98, 18, 48), 120,
    ["Franke", "Elleci"],
    "قطع 98×48 ويحتاج دولاب 120 (مش هيدخل في 100 مع ألواح الجنب). صرف في الحوض والديب بيصرف ناحية الحوض."),
  sk("sink_under60", "حوض أندر ماونت 60×45", sz(60, 20, 45), sz(56, 20, 41), 60,
    ["Franke", "Elleci"],
    "بيتركب من تحت الرخام أو الجرانيت وحافة القطع لازم تتلمع. قطع 56×41. ضروري تثبيت من تحت بمسامير مخصوصة."),
  sk("sink_corner50", "حوض ركنة 50×50", sz(50, 18, 50), sz(48, 18, 48), 90,
    ["Franke", "Elleci"],
    "للوحدة الركنية (عادة 90×90). القطع 48×48 مع الحفاظ على مسافة من الركنة 5 سم. صرف في الركنة ومحتاج مكان للسيفون."),
  sk("sink_granite78", "حوض جرانيت بحوض واحد مع ديب 78×50", sz(78, 19, 50), sz(76, 19, 48), 80,
    ["Franke", "Elleci"],
    "قطع 76×48. جرانيت تقيل فمحتاج ألواح جنب سميكة وتدعيم في الدولاب. صرف واحد."),
];

// ---------------------------------------------------------------- hob
// size.h = body height below the worktop ; cavity = worktop cut-out (w × well depth × d)
const hob = (id, label, size, cavity, width, brands, note, power) => ({
  id, label, size, cavity,
  params: { hob_cutout_w: cavity.w, hob_cutout_d: cavity.d },
  width, brands, note, power,
});

const HOBS = [
  hob("hob60_gas4", "بوتجاز مسطح 60 سم غاز 4 شعلات (استانلس)", sz(60, 10, 52), sz(56, 10, 48), 60,
    ["Glemgas", "Elba", "Fresh", "Unionaire", "Tornado", "Kiriazi", "Beko", "Bosch"],
    "قطع 56×48. وصلة الغاز جنب أو ورا الدولاب بمحبس يسهل الوصول له. سيب تهوية في الدولاب اللي تحته ومتحطش درج مباشر تحت الشعلات.",
    GAS),
  hob("hob60_gas4_glass", "بوتجاز مسطح 60 سم غاز 4 شعلات (زجاج)", sz(60, 10, 51), sz(56, 10, 48), 60,
    ["Glemgas", "Elba", "Fresh", "Unionaire", "Tornado", "Beko", "Bosch"],
    "قطع 56×48. بيشتغل غاز + بريزة صغيرة للإشعال الأوتوماتيك. وصلة الغاز في الدولاب بمحبس.",
    BOTH),
  hob("hob90_gas5", "بوتجاز مسطح 90 سم غاز 5 شعلات (استانلس)", sz(90, 10, 52), sz(86, 10, 48), 90,
    ["Glemgas", "Elba", "Fresh", "Unionaire", "Tornado", "Kiriazi", "Beko", "Bosch"],
    "قطع 86×48. يحتاج دولاب 90. وصلة الغاز على الجنب بمحبس. تأكد من الشفاط 90 فوقه.",
    GAS),
  hob("hob90_gas5_glass", "بوتجاز مسطح 90 سم غاز 5 شعلات (زجاج)", sz(90, 10, 51), sz(86, 10, 48), 90,
    ["Glemgas", "Elba", "Fresh", "Unionaire", "Bosch"],
    "قطع 86×48. غاز + بريزة إشعال. دولاب 90 وشفاط 90 فوقه.",
    BOTH),
  hob("hob60_ceramic", "مسطح سيراميك كهربا 60 سم", sz(59, 5.5, 52), sz(56, 5.5, 49), 60,
    ["Bosch", "Beko", "Zanussi"],
    "قطع 56×49. محتاج خط كهربا مخصوص 32 أمبير من اللوحة (مش بريزة عادية). سيب 5 سم تهوية تحته وبلاش درج ملاصق.",
    P32),
  hob("hob60_induction", "مسطح induction كهربا 60 سم", sz(59, 6, 52), sz(56, 6, 49), 60,
    ["Bosch", "Beko", "Zanussi", "Samsung", "LG"],
    "قطع 56×49. خط كهربا 32 أمبير مخصوص. محتاج تهوية من تحت (5 سم) ولازم أدوات طبخ مناسبة induction.",
    P32),
  hob("hob30_domino_gas", "دومينو 30 سم غاز (شعلتين)", sz(30, 10, 52), sz(27, 10, 49), 40,
    ["Glemgas", "Elba", "Fresh", "Bosch", "Beko"],
    "قطع 27×49. وصلة غاز + إشعال أوتوماتيك بريزة. بيتحط مع مسطح تاني أو لوحده في دولاب 40.",
    BOTH),
  hob("hob30_domino_induction", "دومينو 30 سم induction (منطقتين)", sz(30, 6, 52), sz(27, 6, 49), 40,
    ["Bosch", "Beko", "Zanussi"],
    "قطع 27×49. بريزة 16 أمبير. سيب تهوية تحته.",
    P16),
];

// ---------------------------------------------------------------- hood
// width = cabinet/hood width the hood needs; hoodMount "chimney" (wall chimney or hanging island) | "under" | "builtin"
// minUnitHeight = minimum height of the wall unit that carries it (0 = no wall unit needed)
const hood = (id, label, size, cavity, width, hoodMount, minUnitHeight, brands, note) => ({
  id, label, size, cavity,
  params: hoodMount === "chimney" ? { width } : { width, hood_height: size.h },
  hoodMount, minUnitHeight,
  width, brands, note, power: P16,
});

const HOODS = [
  hood("hood_chimney60", "شفاط شيمني 60 سم", sz(60, 80, 50), sz(60, 80, 50), 60, "chimney", 0,
    ["Fresh", "Unionaire", "Tornado", "Glemgas", "Elba", "Kiriazi", "Beko", "Zanussi", "Bosch"],
    "بيتعلق على الحيطة فوق البوتجاز بارتفاع 65–75 سم من الغاز. بريزة 16 أمبير جنب الشيمني، وماسورة تفريغ قطر 15 سم لبره المطبخ."),
  hood("hood_chimney90", "شفاط شيمني 90 سم", sz(90, 80, 50), sz(90, 80, 50), 90, "chimney", 0,
    ["Fresh", "Unionaire", "Tornado", "Glemgas", "Elba", "Kiriazi", "Beko", "Zanussi", "Bosch"],
    "للبوتجاز 90. ارتفاع التركيب 65–75 سم من الغاز. ماسورة تفريغ 15 سم وبريزة 16 أمبير."),
  hood("hood_slim60", "شفاط سلايم 60 سم تحت الدولاب", sz(60, 14, 48), sz(60, 14, 48), 60, "under", 35,
    ["Fresh", "Unionaire", "Tornado", "Glemgas", "Elba", "Beko", "Zanussi"],
    "بيتثبت تحت الدولاب العلوي (ارتفاعه 35 سم على الأقل). تفريغ الهوا لبره أو فلتر كربون، وبريزة جوه الدولاب."),
  hood("hood_slim90", "شفاط سلايم 90 سم تحت الدولاب", sz(90, 14, 48), sz(90, 14, 48), 90, "under", 35,
    ["Fresh", "Unionaire", "Tornado", "Glemgas", "Elba", "Beko", "Zanussi"],
    "للدولاب العلوي 90 (ارتفاعه 35 سم على الأقل). تفريغ لبره وبريزة جوه الدولاب."),
  hood("hood_telescopic60", "شفاط مسحوب (تليسكوبي) 60 سم", sz(60, 18, 48), sz(60, 18, 48), 60, "under", 50,
    ["Fresh", "Unionaire", "Glemgas", "Elba", "Beko", "Zanussi", "Bosch"],
    "بيدخل في دولاب علوي ارتفاعه 50 سم على الأقل (جسم الشفاط بياخد 18 سم من الداخل). بريزة جوه الدولاب وتفريغ لبره."),
  hood("hood_telescopic90", "شفاط مسحوب (تليسكوبي) 90 سم", sz(90, 18, 48), sz(90, 18, 48), 90, "under", 50,
    ["Fresh", "Unionaire", "Glemgas", "Elba", "Beko", "Zanussi", "Bosch"],
    "للدولاب العلوي 90 (ارتفاعه 50 سم على الأقل). بريزة جوه الدولاب وتفريغ لبره."),
  hood("hood_island90", "شفاط جزيرة 90 سم (معلق من السقف)", sz(90, 100, 50), sz(90, 100, 50), 90, "chimney", 0,
    ["Fresh", "Unionaire", "Glemgas", "Elba", "Beko", "Bosch"],
    "بيتعلق من السقف فوق الجزيرة بارتفاع 65–75 سم من المسطح. محتاج ماسورة تفريغ من السقف وبريزة على السقف قريبة من الشفاط."),
  hood("hood_builtin52", "شفاط بلت إن 52 سم (مدمج في دولاب علوي)", sz(52, 28, 29), sz(52, 28, 29), 60, "builtin", 40,
    ["Fresh", "Unionaire", "Glemgas", "Elba", "Beko", "Zanussi"],
    "بيتدمج داخل دولاب علوي 60 ارتفاعه 40 سم على الأقل. بريزة جوه الدولاب وماسورة تفريغ 12–15 سم."),
  hood("hood_builtin70", "شفاط بلت إن 70 سم (مدمج في دولاب علوي)", sz(70, 28, 29), sz(70, 28, 29), 90, "builtin", 40,
    ["Fresh", "Unionaire", "Glemgas", "Elba", "Beko", "Zanussi"],
    "بيتدمج داخل دولاب علوي 90 ارتفاعه 40 سم على الأقل. بريزة جوه الدولاب وماسورة تفريغ 12–15 سم."),
];

// ---------------------------------------------------------------- freestanding cookers (stand in a gap in the base run, NOVERA v55)
// size = the cooker body (w × h to the hob top × d); cavity = the slot it needs (w + 1 cm each side)
const cooker = (id, label, size, width, brands, note, power) => ({
  id, label, size, cavity: sz(size.w + 2, size.h, size.d),
  params: { width },
  width, brands, note, power,
});
const COOKERS = [
  cooker("cooker60_gas", "بوتجاز عادي 60×60 غاز 4 شعلات بفرن", sz(60, 85, 60), 62,
    ["Unionaire", "Fresh", "Kiriazi", "Tornado", "Glemgas", "Elba", "Zanussi"],
    "فتحة 62 سم (سنتي كل جنب). ارتفاعه 85 — المسطح أعلى من الكونتر 82 بشوية، سيب القعدة 0 لو عايز نفس المستوى. محبس غاز ورا البوتجاز وتهوية تحته.", GAS),
  cooker("cooker80_gas", "بوتجاز عادي 80×60 غاز 5 شعلات بفرن", sz(80, 85, 60), 82,
    ["Unionaire", "Fresh", "Kiriazi", "Tornado", "Glemgas"],
    "فتحة 82 سم. محبس غاز وبريزة 16 أمبير للإشعال والشواية.", BOTH),
  cooker("cooker90_gas", "بوتجاز عادي 90×60 غاز 5 شعلات بفرن", sz(90, 85, 60), 92,
    ["Unionaire", "Fresh", "Kiriazi", "Glemgas", "Elba", "Zanussi", "Bosch"],
    "فتحة 92 سم. محبس غاز وبريزة 16 أمبير.", BOTH),
  cooker("cooker55_gas", "بوتجاز عادي 55×55 غاز 4 شعلات", sz(55, 85, 55), 57,
    ["Unionaire", "Fresh", "Kiriazi", "Tornado"],
    "فتحة 57 سم للمطابخ الصغيرة.", GAS),
];

// ---------------------------------------------------------------- export (deep-frozen so callers cannot mutate the catalog)
const deepFreeze = (o) => {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
};

const BUILD = { oven: OVENS, microwave: MICROWAVES, fridge: FRIDGES, washer: WASHERS, sink: SINKS, hob: HOBS, cooker: COOKERS, hood: HOODS };
Object.keys(BUILD).forEach((cls) => BUILD[cls].forEach((e) => { e.cls = cls; }));

export const APPLIANCES = deepFreeze(BUILD);

/** an entry by id (any class) or null */
export function findEntry(id) {
  for (const cls of Object.keys(APPLIANCES)) {
    const e = APPLIANCES[cls].find((x) => x.id === id);
    if (e) return e;
  }
  return null;
}

/** the appliance class a kitchen unit belongs to (primary class only), or null */
export function classOf(params, name) {
  const p = params || {};
  switch (p.unit_category) {
    case "fridge": return "fridge";
    case "oven": return "oven";
    case "microwave": return "microwave";
    case "washing_machine": return "washer";
    case "washer_gap": return "washer";
    case "cooker_gap": return "cooker";
    default: break;
  }
  if (p.include_hood === true || p.include_hood === "true") return "hood";
  if (p.include_sink_cutout === true || p.include_sink_cutout === "true") return "sink";
  const text = `${name == null ? "" : name} ${p.unit_label == null ? "" : p.unit_label}`;
  if (/بوتجاز|مسطح|hob/i.test(text)) return "hob";
  if (/شفاط|hood/i.test(text)) return "hood";
  return null;
}

/** a NEW params object: entry.params merged in, and `width` raised to entry.width when that is larger */
export function applyAppliance(params, entry) {
  const out = { ...(params || {}), ...((entry && entry.params) || {}) };
  if (entry && Number.isFinite(entry.width)) {
    const cur = num((params || {}).width);
    if (cur == null || entry.width > cur) out.width = entry.width;
  }
  return out;
}

/** does the unit (params.width/height/depth) hold the appliance cavity? -> { ok, why } */
export function fits(params, entry) {
  if (!entry || !entry.cavity) return { ok: false, why: "مفيش جهاز متحدد للفحص" };
  const p = params || {};
  const cav = entry.cavity;
  const cls = entry.cls;
  const W = num(p.width), H = num(p.height), D = num(p.depth);
  const EPS = 1e-6;
  const bad = [];

  if (cls === "cooker") {
    if (W != null && W < entry.width - EPS) bad.push(`عرض الفتحة ${r1(W)} أقل من المطلوب ${entry.width} سم (البوتجاز ${entry.size.w} + سنتي كل جنب)`);
  } else if (cls === "hood") {
    if (W != null && W < entry.width - EPS) bad.push(`عرض الوحدة ${r1(W)} أقل من عرض الشفاط ${entry.width} سم`);
    if (entry.hoodMount !== "chimney" && H != null && H < entry.minUnitHeight - EPS) {
      bad.push(`ارتفاع الدولاب ${r1(H)} أقل من المطلوب للشفاط ده (${entry.minUnitHeight} سم)`);
    }
  } else {
    const needW = r1(cav.w + 2 * SIDE);
    if (W != null && W < needW - EPS) bad.push(`عرض الوحدة ${r1(W)} أقل من المطلوب ${needW} سم (الفتحة ${cav.w} + ألواح الجنب)`);

    let needH = null;
    if (cls === "fridge" || cls === "oven") needH = r1(cav.h + 10);
    else if (cls === "microwave") needH = r1(cav.h + 2 * SIDE);
    else if (cls === "washer") needH = cav.h;
    if (needH != null && H != null && H < needH - EPS) bad.push(`ارتفاع الوحدة ${r1(H)} أقل من المطلوب ${needH} سم`);

    if (cls === "fridge" && D != null && D < cav.d - 2 - EPS) {
      bad.push(`عمق الوحدة ${r1(D)} أقل من المطلوب ${r1(cav.d - 2)} سم`);
    }
    if ((cls === "hob" || cls === "sink") && D != null && D < cav.d + 4 - EPS) {
      bad.push(`عمق الوحدة ${r1(D)} مش كفاية لقطع ${cav.d} سم (محتاج ${r1(cav.d + 4)} سم)`);
    }
  }

  return bad.length ? { ok: false, why: bad.join(" — ") } : { ok: true, why: "القياسات مناسبة" };
}
