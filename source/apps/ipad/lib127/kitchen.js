// v127 library additions — area: kitchen. Plain data only (engine params), built with the helpers library.js passes in:
// h = { W, T, ACC, DC, M, P, FREE, b } (see library.js). Return any of { KITCHEN, DRESSING, PANEL, FREE, SMART }.
// English for every new Arabic string goes in lib127/kitchen.en.json (merged into i18n/en.json at ship).
//
// NOVERA sizes come from the app's defaults (withDefaults): a base unit without its own height = 88 (78 box + 10 plinth, counter 2 → 90),
// wall units written as `...W` (70 × 32) become 80 × 35 hung at 145, tall units `...T` (220) become 225 — so the rows here line up
// with every other unit in the project. Only sizes that differ on purpose are written out (bar 103 + 2 = 105, island backs 30–35 deep,
// ceiling units on the 226.8 line = 145 + 80 + the 1.8 LED board).
const ISL = "مطابخ — جزيرة وبار";
const FIN = "مطابخ — تشطيبات وجوانب";
const STO = "مطابخ — ترولي ومنظمات";
// a ceiling unit over the wall units / tall units: the wall row tops out at 225, a 1.8 LED board, then up to 1 cm under a 280 ceiling
const TOP = (o) => ({ unit_type: "wall", depth: 35, include_toe_kick: false, wall_mount_height: 226.8, height: 52.2, led_panel_below: true, led_sep_type: "board", include_shelves: false, shelf_count: 0, ...o });

export default (h) => {
  const { W, T } = h;
  const KITCHEN = {
    // ---------------------------------------------------------------- islands & bars
    k7_isl_drawers120: { label: "جزيرة: أدراج 120 (عمودين)", desc: "وش الجزيرة ناحية الشغل: فاصل في النص و3 أدراج عريضة في كل ناحية — عمق 58 زي باقي السفلي.", group: ISL,
      params: { unit_category: "divided", width: 120, divider_position_pct: 50, left_door_type: "drawers", right_door_type: "drawers", drawer_count: 3, include_drawer_boxes: true, include_shelves: false, unit_label: "جزيرة" } },
    k7_isl_cook90: { label: "جزيرة: مسطح 90 بأدراج حلل", desc: "مكان المسطح في الجزيرة: درجين عميقين للحلل وفي الفوقاني درج داخلي للمغارف.", group: ISL,
      params: { width: 90, door_type: "drawers", drawer_count: 2, include_drawer_boxes: true, include_shelves: false, drawer_inner_2: true, unit_label: "جزيرة - مسطح" } },
    k7_isl_back_doors120: { label: "ظهر جزيرة بضلفتين 120 (عمق 30)", desc: "بيتلزق ضهر لضهر ورا وحدات الجزيرة: ضلفتين 60 ورف — تخزين من ناحية القعدة. الجزيرة كلها 58 + 30 = 88.", group: ISL,
      params: { width: 120, depth: 30, door_type: "double", shelf_count: 1 } },
    k7_isl_back_mix120: { label: "ظهر جزيرة 120: مفتوح + ضلفة (عمق 30)", desc: "نص مفتوح برف لكتب الطبخ والديكور، ونص بضلفة — ضهر لضهر مع وحدات الجزيرة.", group: ISL,
      params: { unit_category: "divided", width: 120, depth: 30, divider_position_pct: 50, left_door_type: "none", right_door_type: "single", shelf_count: 1 } },
    k7_isl_seat120: { label: "مكان قعدة جزيرة 120 (عمق 30)", desc: "بروز الكونتر للركب 30 سم: جنبين ورأس وظهر بيتلزق في ضهر الجزيرة، والوش مفتوح للرجلين — لكرسيين. من غير سكلو.", group: ISL,
      params: { width: 120, depth: 30, door_type: "none", include_shelves: false, include_toe_kick: false, unit_label: "قعدة جزيرة" } },
    k7_isl_seat_end60: { label: "قعدة جزيرة 60 بجنب ووترفول", desc: "آخر الجزيرة: مكان كرسي واحد وجنب تقفيلة بلون الضلف نازل للأرض زي الووترفول.", group: ISL,
      params: { width: 60, depth: 30, door_type: "none", include_shelves: false, include_toe_kick: false, include_end_panel: true, end_panel_side: "right", unit_label: "قعدة جزيرة" } },
    k7_isl_end_open88: { label: "نهاية جزيرة أو برنينسولا برفوف مفتوحة 88", desc: "بعرض الجزيرة كلها (58 + 30) وعمق 30: لفّها 90° ولزقها في آخر الجزيرة — خانتين ورفين مفتوحين للكتب والسلال بيقفلوا الجنب بشكل حلو.", group: ISL,
      params: { unit_category: "open_shelf", width: 88, depth: 30, shelf_count: 2, include_vertical_dividers: true, vertical_divider_count: 1 } },
    k7_bar105_open120: { label: "بار 105 برفوف مفتوحة 120 (عمق 30)", desc: "ضهر برنينسولا أو جزيرة على ارتفاع بار 105: خانات مفتوحة من ناحية القعدة وكونتر البار فوقها.", group: ISL,
      params: { unit_category: "open_shelf", width: 120, height: 103, depth: 30, shelf_count: 1, include_vertical_dividers: true, vertical_divider_count: 2, unit_label: "بار" } },
    k7_bar105_doors90: { label: "بار 105 بضلفتين 90 (عمق 35)", desc: "وحدة بار مقفولة على ارتفاع 105: ضلفتين 45 ورفين — تحت كونتر البار.", group: ISL,
      params: { width: 90, height: 103, depth: 35, door_type: "double", shelf_count: 2, unit_label: "بار" } },

    // ---------------------------------------------------------------- integrated appliances (they show in the 🔌 group)
    k7_dw60: { label: "فتحة غسالة أطباق مدمجة 60", desc: "نيش 60 × 86 تحت الكونتر بشريطين رأس بيتربطوا في الوحدات اللي جنبها. باب الغسالة بيتكسي بلوح بنفس خامة الضلف (بيتطلب مع الوحدة). جنب الحوض عشان المية والصرف.",
      params: { unit_category: "washer_gap", width: 60, include_toe_kick: false, include_shelves: false, door_type: "none", top_style: "rails", washer_cavity_height: 82, washer_cavity_width: 60, unit_label: "غسالة أطباق" } },
    k7_dw45: { label: "فتحة غسالة أطباق مدمجة 45", desc: "للمطابخ الصغيرة: نيش 45 × 86 بشريطين رأس، ولوح باب بخامة الضلف على باب الغسالة.",
      params: { unit_category: "washer_gap", width: 45, include_toe_kick: false, include_shelves: false, door_type: "none", top_style: "rails", washer_cavity_height: 82, washer_cavity_width: 45, unit_label: "غسالة أطباق" } },
    k7_oven_under90: { label: "فرن 90 تحت المسطح بدرج", desc: "تجويف فرن 90 (فتحة 86) تحت مسطح 90، ودرج للصواني تحته.",
      params: { unit_category: "oven", width: 90, include_microwave: false, oven_bottom_front_type: "drawers", drawer_count: 1, oven_cavity_bottom_offset: 14 } },
    k7_wall_micro_flip60: { label: "علوية ميكروويف 60 بقلاب فوقه", desc: "على خط العلوي (80): نيش ميكروويف بلت إن 38 تحت، وقلاب فوقه للتخزين.",
      params: { ...W, unit_category: "microwave", width: 60, microwave_cavity_height: 38, microwave_cavity_width: 56, microwave_cavity_bottom_offset: 0, door_type: "flip_up" } },
    k7_fridge_int60: { label: "عمود تلاجة بلت إن 60 (باب مدمج)", desc: "تلاجة بلت إن 178 جوه العمود: ضلفة 180 بتتربط في باب التلاجة، وضلفة فوقها. سيب فتحة تهوية في القاعدة والرأس.",
      params: { ...T, unit_category: "wardrobe", width: 60, wardrobe_zone_count: 2, wardrobe_zone1_type: "shelves_single", wardrobe_zone1_height: 180, wardrobe_zone1_count: 0, wardrobe_zone2_type: "shelves_single", wardrobe_zone2_count: 0, unit_label: "تلاجة بلت إن" } },
    k7_tall_oven_combi60: { label: "عمود فرن + كومبي + درج تسخين 60", desc: "درج حلل تحت، فرن 60 على مستوى الإيد، وفوقه نيش 59: ميكروويف كومبي 45 ودرج تسخين 14 — وضلفة فوق.",
      params: { ...T, unit_category: "oven", width: 60, include_microwave: true, oven_bottom_front_type: "drawers", drawer_count: 1, oven_cavity_bottom_offset: 38, microwave_cavity_height: 59, microwave_cavity_width: 56, microwave_cavity_bottom_offset: 98 } },
    k7_wine15: { label: "رف زجاجات سفلي 15", desc: "خانات مفتوحة ضيقة: زجاجة نايمة في كل خانة — آخر الصف أو جنب التلاجة.",
      params: { unit_category: "open_shelf", width: 15, shelf_count: 5, unit_label: "زجاجات" } },
    k7_wine30: { label: "رف زجاجات سفلي 30 (شبكة)", desc: "شبكة 2 × 6 خانات مفتوحة للزجاجات والعصاير — فاصل في النص و5 أرفف.",
      params: { unit_category: "open_shelf", width: 30, shelf_count: 5, include_vertical_dividers: true, vertical_divider_count: 1, unit_label: "زجاجات" } },

    // ---------------------------------------------------------------- sinks
    k7_sink120: { label: "وحدة حوض 120 بحوضين وديب", desc: "حوض 100 × 50 بحوضين وديب تنشيف: فتحة كونتر 98 × 48، سيفون، وضلفتين 60.",
      params: { width: 120, include_sink_cutout: true, sink_cutout_width: 98, sink_cutout_depth: 48, include_ptrap_opening: true, include_shelves: false } },
    k7_sink90: { label: "وحدة حوض 90 بحوض ونص", desc: "حوض 80 × 48 (حوض ونص): فتحة كونتر 78 × 46 وسيفون، ضلفتين.",
      params: { width: 90, include_sink_cutout: true, sink_cutout_width: 78, sink_cutout_depth: 46, include_ptrap_opening: true, include_shelves: false } },
    k7_sink60: { label: "وحدة حوض صغير 60", desc: "حوض واحد 50 × 40 (فتحة 48 × 38) للمطابخ الصغيرة والستوديو، ضلفتين.",
      params: { width: 60, include_sink_cutout: true, sink_cutout_width: 48, sink_cutout_depth: 38, include_ptrap_opening: true, include_shelves: false } },

    // ---------------------------------------------------------------- display & open wall units
    k7_tall_vitrine60: { label: "عمود فاترينة زجاج 60", desc: "طويل لحد خط العلوي: ضلفتين زجاج بفريم خشب و4 أرفف وليد — للأطباق والكاسات.", group: "مطابخ — طويل",
      params: { ...T, width: 60, door_type: "double_glass", shelf_count: 4, include_led_marker: true } },
    k7_wall_glass100: { label: "علوية ضلفتين زجاج 100 بليد", desc: "فريم خشب بنفس لون الضلف، ضلفتين 50 ورفين وليد جوه.", group: "مطابخ — علوي",
      params: { ...W, width: 100, door_type: "double_glass", shelf_count: 2, include_led_marker: true } },
    k7_wall_shelfbox120: { label: "رف علبة معلّق 120 بليد", desc: "علبة مفتوحة 120 × 35 بعمق 30 وفاصل — رف للبهارات والديكور تحت العلوي أو لوحده، بليد تحتها.", group: "مطابخ — علوي",
      params: { ...W, unit_category: "open_shelf", width: 120, height: 35, depth: 30, wall_mount_height: 145, shelf_count: 0, include_vertical_dividers: true, vertical_divider_count: 1, include_led_marker: true } },
    k7_wall_cubes90: { label: "علوية مكعبات مفتوحة 90", desc: "6 خانات مفتوحة (فاصلين ورف) على خط العلوي — بين وحدتين مقفولين.", group: "مطابخ — علوي",
      params: { ...W, unit_category: "open_shelf", width: 90, shelf_count: 1, include_vertical_dividers: true, vertical_divider_count: 2 } },

    // ---------------------------------------------------------------- finishing pieces
    k7_base_end60: { label: "سفلية 60 آخر الصف بجنب تقفيلة", desc: "ضلفتين، وجنب تقفيلة بلون الضلف من فوق السكلو لحد الكونتر بيغطي الجنب الظاهر وحرف الضلفة.", group: FIN,
      params: { width: 60, door_type: "double", include_end_panel: true, end_panel_side: "right" } },
    k7_wall_end60: { label: "علوية 60 آخر الصف بجنب تقفيلة", desc: "جنب تقفيلة بلون الضلف بيغطي حرف الضلفة والجنب الظاهر.", group: FIN,
      params: { ...W, width: 60, door_type: "double", include_end_panel: true, end_panel_side: "right" } },
    k7_tall_end60: { label: "تموين 60 بجنب تقفيلة", desc: "دولاب طويل 225 بضلفتين وأرفف، وجنب تقفيلة بلون الضلف لآخر الصف.", group: FIN,
      params: { ...T, width: 60, door_type: "double", shelf_count: 4, include_end_panel: true, end_panel_side: "right" } },
    k7_base_filler60: { label: "3 أدراج 60 + فيلر حيطة 5", desc: "فيلر 5 سم بلون الضلف على ناحية الحيطة عشان الأدراج والمقابض تفتح من غير ما تخبط.", group: FIN,
      params: { door_type: "drawers", drawer_count: 3, include_drawer_boxes: true, include_shelves: false, include_outer_filler: true, outer_filler_position: "start", outer_filler_width: 5 } },
    k7_wall_filler60: { label: "علوية 60 + فيلر حيطة 5", desc: "فيلر 5 سم في الركنة أو جنب الحيطة عشان الضلفة تفتح على آخرها.", group: FIN,
      params: { ...W, width: 60, door_type: "double", include_outer_filler: true, outer_filler_position: "start", outer_filler_width: 5 } },
    k7_tall_filler60: { label: "دولاب طويل 60 + فيلر 5", desc: "تموين بضلفتين وفيلر 5 سم طول الدولاب جنب الحيطة.", group: FIN,
      params: { ...T, width: 60, door_type: "double", shelf_count: 4, include_outer_filler: true, outer_filler_position: "start", outer_filler_width: 5 } },
    k7_wall_pelmet80: { label: "علوية 80 بوزرة ليد تحت", desc: "وزرة 6 سم في وش الوحدة من تحت بتخبي شريط الليد اللي بينوّر الكونتر.", group: FIN,
      params: { ...W, width: 80, door_type: "double", include_bottom_valance: true, bottom_valance_height: 6, include_led_marker: true } },
    k7_wall_cornice80: { label: "علوية 80 بأورزة فوق", desc: "أورزة 6 سم في وش الوحدة من فوق — بتقفل لحد البلاطة أو السقف المعلّق.", group: FIN,
      params: { ...W, width: 80, door_type: "double", include_top_valance: true, top_valance_height: 6 } },
    k7_top60: { label: "علوية سقف 60 قلاب", desc: "فوق العلوي لحد السقف (280): لوح ليد 1.8 وقلاب 52 للتخزين الموسمي — غيّر الارتفاع على قد السقف.", group: FIN,
      params: TOP({ width: 60, door_type: "flip_up" }) },
    k7_top90: { label: "علوية سقف 90 قلاب دبل", desc: "فوق العلوي أو فوق الشفاط لحد السقف: قلابين جنب بعض.", group: FIN,
      params: TOP({ width: 90, door_type: "flip_up_double" }) },
    k7_top40: { label: "علوية سقف 40 ضلفة", desc: "فوق العمود الطويل أو العلوي الضيق لحد السقف: ضلفة واحدة.", group: FIN,
      params: TOP({ width: 40, door_type: "single" }) },

    // ---------------------------------------------------------------- storage
    k7_tray_div30: { label: "سفلية صواني 30 بفواصل", desc: "ضلفة و3 خانات واقفة بفاصلين: صواني الفرن وألواح التقطيع والشبك.", group: STO,
      params: { width: 30, door_type: "single", include_shelves: false, include_vertical_dividers: true, vertical_divider_count: 2 } },
    k7_pan90: { label: "درجين حلل 90 بدرج داخلي", desc: "درجين عميقين عرض 90 للحلل الكبيرة، وفي الفوقاني درج داخلي مخفي للأغطية.", group: STO,
      params: { width: 90, door_type: "drawers", drawer_count: 2, include_drawer_boxes: true, include_shelves: false, drawer_inner_2: true } },
    k7_pan100: { label: "3 أدراج حلل 100", desc: "تحت: درج 32 للحلل الكبيرة · نص: 22 للأطباق · فوق: درج أدوات.", group: STO,
      params: { width: 100, door_type: "drawers", drawer_count: 3, drawer1_height: 32, drawer2_height: 22, include_drawer_boxes: true, include_shelves: false } },
    k7_pan120: { label: "أدراج حلل 120 (عمودين)", desc: "عرض 120 متقسم بفاصل: درجين عميقين في كل ناحية — أقوى من درج 120 واحد.", group: STO,
      params: { unit_category: "divided", width: 120, divider_position_pct: 50, left_door_type: "drawers", right_door_type: "drawers", drawer_count: 2, include_drawer_boxes: true, include_shelves: false } },
    k7_bin45: { label: "سلة زبالة سحب 45", desc: "صندوقين بيطلعوا مع الضلفة — للمطابخ الضيقة جنب الحوض.", group: STO, org: "bin",
      params: { width: 45, door_type: "single", include_shelves: false } },

    // ---------------------------------------------------------------- corners
    k7_blind110_filler: { label: "زاوية عمياء 110 بفيلر", desc: "ضلفة 50 وفيلر 5 بين الضلفة والجزء الأعمى عشان المقابض ما تخبطش في الضلع التاني.", group: "مطابخ — زوايا",
      params: { unit_category: "corner", corner_style: "blind", corner_total_width: 110, corner_door_width: 50, door_type: "single", include_edge_filler: true, edge_filler_width: 5 } },
    k7_blind_tall100: { label: "دولاب ركنة طويل أعمى 100", desc: "عمود 225 في الركنة: ضلفة 50 وأرفف بتوصل للجزء الأعمى — للتخزين اللي مش بيتطلب كتير.", group: "مطابخ — زوايا",
      params: { ...T, unit_category: "corner", corner_style: "blind", corner_total_width: 100, corner_door_width: 50, door_type: "single", shelf_count: 4 } },
    k7_diag100: { label: "زاوية قطرية سفلية 100×100", desc: "ضلفة قطرية أعرض للركنات الكبيرة، ورف.", group: "مطابخ — زوايا",
      params: { unit_category: "corner", corner_style: "diagonal", corner_leg1: 100, corner_leg2: 100 } },
  };

  // ---------------------------------------------------------------- smart sets — one wall run each (at = cm along the run; base and wall rows share it).
  // A set is pinned along one wall, so corner units are NOT inside a set: add the corner unit first (it takes the room corner by itself),
  // then the set — its first base unit lands after the corner leg and the rest keep their places.
  const SMART = {
    s7_L_sink: { label: "مطبخ L — ضلع الحوض 230", desc: "بعد زاوية L 90: 3 أدراج متقسمة 60 (الأدراج ما بتخبطش في ضلفة الزاوية) · حوض 80 · غسالة أطباق 60 · صواني 30 — وفوق: علوي بليد، مصفاة فوق الحوض، وعلوي. ضيف «زاوية L 90×90» و«زاوية L علوية» الأول، وكمّل الـ30 سم اللي بين زاوية العلوي (60) وأول علوية بـ«رفوف مفتوحة علوية» 30.", tier: "std", items: [
      { k: "k_cutlery60", at: 0 }, { k: "k_sink", at: 60 }, { k: "k7_dw60", at: 140 }, { k: "k7_tray_div30", at: 200 },
      { k: "k_wall_led", at: 0, p: { width: 60 } }, { k: "k_plates80", at: 60 }, { k: "k_wall2", at: 140, p: { width: 60 } }, { k: "k_wall1_40", at: 200, p: { width: 30 } },
    ] },
    s7_L_cook: { label: "مطبخ L — ضلع البوتجاز 240", desc: "الضلع التاني بعد الزاوية: درجين حلل 90 · مسطح 90 بأدراج · ترولي زيت 20 · نهاية 40 بجنب تقفيلة — وفوق: علوي، قلاب فوق الشفاط على 70 من الكونتر، رف مفتوح، ونهاية بجنب.", tier: "std", items: [
      { k: "k7_pan90", at: 0 }, { k: "k_hob90", at: 90 }, { k: "k_oil20", at: 180 }, { k: "k7_base_end60", at: 200, p: { width: 40, door_type: "single" } },
      { k: "k_wall2", at: 0, p: { width: 90 } }, { k: "k_wall_hood90", at: 90 }, { k: "k_wall_open60", at: 180, p: { width: 20 } }, { k: "k7_wall_end60", at: 200, p: { width: 40, door_type: "single" } },
    ] },
    s7_U_mid: { label: "مطبخ U — الضلع الوسطاني 240", desc: "بين زاويتين: 3 أدراج 60 · حوض 120 تحت الشباك · 3 أدراج 60 — وعلوي على الجنبين بس (الشباك فوق الحوض فاضي). الضلعين التانيين من «مطبخ L».", tier: "std", items: [
      { k: "k_cutlery60", at: 0 }, { k: "k7_sink120", at: 60 }, { k: "k_base_drawers", at: 180 },
      { k: "k_wall_led", at: 0, p: { width: 60 } }, { k: "k_wall_led", at: 180, p: { width: 60 } },
    ] },
    s7_island: { label: "جزيرة 210 — ناحية الشغل", desc: "أدراج 120 عمودين · مسطح 90 بأدراج حلل. بتتضاف على حيطة — حرّكهم مع بعض لنص المطبخ، وضيف «جزيرة 210 — ناحية القعدة» ضهر لضهر.", tier: "lux", items: [
      { k: "k7_isl_drawers120", at: 0 }, { k: "k7_isl_cook90", at: 120 },
    ] },
    s7_island_seat: { label: "جزيرة 210 — ناحية القعدة", desc: "ظهر بضلفتين 90 · مكان قعدة 120 لكرسيين بجنب ووترفول — بيتلزقوا ضهر لضهر في «ناحية الشغل» (الجزيرة كلها 210 × 88).", tier: "lux", items: [
      { k: "k7_isl_back_doors120", at: 0, p: { width: 90 } }, { k: "k7_isl_seat120", at: 90, p: { include_end_panel: true, end_panel_side: "right" } },
    ] },
    s7_galley_sink: { label: "مطبخ ممر — صف الحوض 300", desc: "الصف الأول: صواني 30 · حوض 90 · غسالة أطباق 60 · 3 أدراج 60 · سلة زبالة 60 — وعلوي متصل بليد. الصف التاني قصاده «صف البوتجاز».", tier: "std", items: [
      { k: "k7_tray_div30", at: 0 }, { k: "k7_sink90", at: 30 }, { k: "k7_dw60", at: 120 }, { k: "k_cutlery60", at: 180 }, { k: "k_bin60", at: 240 },
      { k: "k_wall1_40", at: 0, p: { width: 30 } }, { k: "k_plates80", at: 30, p: { width: 90 } }, { k: "k7_wall_pelmet80", at: 120, p: { width: 60 } }, { k: "k7_wall_pelmet80", at: 180, p: { width: 60 } }, { k: "k7_wall_pelmet80", at: 240, p: { width: 60 } },
    ] },
    s7_galley_cook: { label: "مطبخ ممر — صف البوتجاز 300", desc: "قصاد صف الحوض: عمود تلاجة بلت إن 60 · عمود فرن وكومبي 60 · درجين حلل 50 · مسطح 90 · 4 أدراج توابل 40 — وفوق: علوي، قلاب فوق الشفاط، وعلوية 40.", tier: "std", items: [
      { k: "k7_fridge_int60", at: 0 }, { k: "k7_tall_oven_combi60", at: 60 }, { k: "k_drawers2_80", at: 120, p: { width: 50 } }, { k: "k_hob90", at: 170 }, { k: "k_spices40", at: 260 },
      { k: "k_wall2", at: 120, p: { width: 50 } }, { k: "k_wall_hood90", at: 170 }, { k: "k_wall1_40", at: 260 },
    ] },
    s7_studio180: { label: "مطبخ ستوديو 180", desc: "حوض 60 · غسالة أطباق 45 · مسطح 60 بأدراج · صواني 15 — وفوق: مصفاة، علوية، قلاب فوق الشفاط، ورف ضيق. لشقة ستوديو أو أوضة سطح.", tier: "eco", items: [
      { k: "k7_sink60", at: 0 }, { k: "k7_dw45", at: 60 }, { k: "k_hob90", at: 105, p: { width: 60 } }, { k: "k_base_tray30", at: 165, p: { width: 15 } },
      { k: "k_plates80", at: 0, p: { width: 60 } }, { k: "k_wall1_40", at: 60, p: { width: 45 } }, { k: "k_wall_hood90", at: 105, p: { width: 60 } }, { k: "k_wall_open60", at: 165, p: { width: 15 } },
    ] },
    s7_appliance_wall: { label: "حيطة أجهزة لحد السقف 220", desc: "تلاجة بلت إن 60 · فرن وكومبي ودرج تسخين 60 · كارجو 40 · تموين 60 — وفوقهم علوي سقف بلوح ليد لحد 280.", tier: "lux", items: [
      { k: "k7_fridge_int60", at: 0 }, { k: "k7_tall_oven_combi60", at: 60 }, { k: "k_cargo40", at: 120 }, { k: "k7_tall_end60", at: 160 },
      { k: "k7_top60", at: 0 }, { k: "k7_top60", at: 60 }, { k: "k7_top40", at: 120 }, { k: "k7_top60", at: 160, p: { include_end_panel: true, end_panel_side: "right" } },
    ] },
  };
  return { KITCHEN, DRESSING: {}, PANEL: {}, FREE: {}, SMART };
};
