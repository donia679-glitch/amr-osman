// NOVERA Studio — the bigger library: more kitchen, wardrobe, dressing and furniture starters.
// Everything here is plain engine parameters (the same ones the SketchUp plugin reads), so a unit
// added from here rebuilds exactly the same in SketchUp. Nothing new in the engine itself.
import { EXTRA_PRESETS } from "./decor.js";

// ------------------------------------------------------------------ kitchen & wardrobes (kitchen engine)
const W = { unit_type: "wall", height: 70, depth: 32, include_toe_kick: false };
const T = { unit_type: "tall", height: 220, depth: 58 };
const ACC = (type, label, desc, o) => ({ label, desc, group: "مطابخ — إكسسوارات", params: { element_mode: "accessory", accessory_type: type, ...o } });
export const KITCHEN = {
  // v190: sliding (جرّار) fronts
  k_slide_base100: { label: "سفلية سحّاب 100", desc: "ضلفتين جرّار على سكتين، رف.", group: "سحّاب (جرّار)", params: { width: 100, door_type: "sliding", sliding_panel_count: 2, shelf_count: 1 } },
  k_slide_wall120: { label: "علوية سحّاب 120", desc: "ضلفتين جرّار علوية، رفين.", group: "سحّاب (جرّار)", params: { unit_type: "wall", width: 120, height: 70, depth: 32, include_toe_kick: false, door_type: "sliding", sliding_panel_count: 2, shelf_count: 2 } },
  k_slide_tall150: { label: "دولاب تخزين سحّاب 150", desc: "طويل 220 بـ3 ألواح جرّار.", group: "سحّاب (جرّار)", params: { unit_type: "tall", width: 150, height: 220, depth: 58, door_type: "sliding", sliding_panel_count: 3, shelf_count: 4 } },
  k_slide_dressing160: { label: "دولاب دريسنج سحّاب 160", desc: "أدراج تحت وشماعة فوق، ضلفتين جرّار.", group: "سحّاب (جرّار)", params: { unit_category: "wardrobe", unit_type: "tall", width: 160, height: 240, depth: 62, door_style: "sliding", sliding_panel_count: 2, wardrobe_zone_count: 2, wardrobe_zone1_type: "drawers", wardrobe_zone1_height: 70, wardrobe_zone1_count: 3, wardrobe_zone2_type: "rail_open" } },
  k_slide_bed240: { label: "دولاب نوم سحّاب 240", desc: "4 ألواح جرّار، شماعات وأرفف.", group: "سحّاب (جرّار)", params: { unit_category: "bedroom_wardrobe", unit_type: "tall", width: 240, height: 260, depth: 64, door_style: "sliding", sliding_panel_count: 4, wardrobe_column_count: 2, wardrobe_zone_count: 2, wardrobe_zone1_type: "shelves_open", wardrobe_zone1_height: 110, wardrobe_zone1_count: 3, wardrobe_zone2_type: "rail_open", wardrobe_col2_zone_count: 1, wardrobe_col2_zone1_type: "rail_open" } },
  // base
  k_base1_45: { label: "سفلية ضلفة 45", desc: "ضلفة واحدة ورف.", group: "مطابخ — سفلي", params: { width: 45, door_type: "single", shelf_count: 1 } },
  k_base_tray30: { label: "سفلية 30 صواني / مناشف", desc: "ضلفة ضيقة من غير رف — للصواني والألواح.", group: "مطابخ — سفلي", params: { width: 30, door_type: "single", include_shelves: false } },
  k_base_drawers4_40: { label: "4 أدراج 40", desc: "أدراج صغيرة للأدوات والتوابل.", group: "مطابخ — سفلي", params: { width: 40, door_type: "drawers", drawer_count: 4, include_drawer_boxes: true, include_shelves: false } },
  k_hob90: { label: "سفلية بوتجاز / مسطح 90", desc: "3 أدراج عريضة تحت المسطح.", group: "مطابخ — سفلي", params: { width: 90, door_type: "drawers", drawer_count: 3, include_drawer_boxes: true, include_shelves: false } },
  k_drawers2_80: { label: "درجين كبار 80 (حلل)", desc: "درجين عميقين للحلل والأطباق.", group: "مطابخ — سفلي", params: { width: 80, door_type: "drawers", drawer_count: 2, include_drawer_boxes: true, include_shelves: false } },
  k_sink100: { label: "وحدة حوض 100 دبل", desc: "حوض بحوضين، فتحة كونتر وسيفون.", group: "مطابخ — سفلي", params: { width: 100, include_sink_cutout: true, sink_cutout_width: 86, include_ptrap_opening: true, include_shelves: false } },
  k_divided90: { label: "سفلية مقسومة: ضلفة + أدراج 90", desc: "فاصل رأسي: ضلفة شمال و3 أدراج يمين.", group: "مطابخ — سفلي", params: { unit_category: "divided", width: 90, divider_position_pct: 50, left_door_type: "single", right_door_type: "drawers", drawer_count: 3, include_drawer_boxes: true } },
  k_oven_under: { label: "فرن بلت إن تحت الكونتر", desc: "تجويف فرن 60 ودرج تحته.", group: "مطابخ — سفلي", params: { unit_category: "oven", width: 60, include_microwave: false, oven_bottom_front_type: "drawers", drawer_count: 1, oven_cavity_bottom_offset: 14 } },
  k_base_open30: { label: "رفوف مفتوحة سفلية 30", desc: "نهاية كونتر برفين مفتوحين.", group: "مطابخ — سفلي", params: { unit_category: "open_shelf", width: 30, shelf_count: 2 } },
  k_base_led_drawers: { label: "3 أدراج بليد تحت 60", desc: "أدراج بصناديق وليد في السكلو.", group: "مطابخ — سفلي", params: { door_type: "drawers", drawer_count: 3, include_drawer_boxes: true, include_shelves: false, include_led_marker: true } },
  // wall
  k_wall1_40: { label: "علوية ضلفة 40", desc: "ضلفة واحدة ورفين.", group: "مطابخ — علوي", params: { ...W, width: 40, door_type: "single", shelf_count: 2 } },
  k_wall_hood90: { label: "علوية فوق الشفاط 90", desc: "قلاب دبل، ارتفاع 50.", group: "مطابخ — علوي", params: { ...W, width: 90, height: 50, wall_mount_height: 160, door_type: "flip_up_double", include_shelves: false } }, // top in line with the 70 cm wall units (140 + 70)
  k_wall_tall80: { label: "علوية عالية لحد السقف 80", desc: "ارتفاع 90، 3 أرفف.", group: "مطابخ — علوي", params: { ...W, width: 80, height: 90, shelf_count: 3 } },
  k_wall_flip_dbl: { label: "علوية قلاب دبل 80", desc: "ضلفتين قلاب فوق بعض.", group: "مطابخ — علوي", params: { ...W, width: 80, height: 80, door_type: "flip_up_double", include_shelves: false } },
  k_wall_glass1: { label: "علوية ضلفة زجاج 40", desc: "زجاج بفريم ألومنيوم.", group: "مطابخ — علوي", params: { ...W, width: 40, door_type: "single_glass_metal", shelf_count: 2 } },
  k_wall_glass_wood: { label: "علوية ضلفتين زجاج 80", desc: "زجاج بفريم من نفس الخامة.", group: "مطابخ — علوي", params: { ...W, width: 80, door_type: "double_glass", shelf_count: 2 } },
  k_wall_micro: { label: "علوية ميكروويف 60", desc: "تجويف ميكروويف وضلفة فوقه.", group: "مطابخ — علوي", params: { ...W, unit_category: "microwave", width: 60, height: 90, depth: 35, microwave_cavity_bottom_offset: 0 } },
  k_wall_open60: { label: "رفوف مفتوحة علوية 60", desc: "رفين مفتوحين للبهارات والديكور.", group: "مطابخ — علوي", params: { ...W, unit_category: "open_shelf", width: 60, shelf_count: 2 } },
  k_wall_led: { label: "علوية ضلفتين بليد تحت 80", desc: "ليد تحت الوحدة على الكونتر.", group: "مطابخ — علوي", params: { ...W, width: 80, shelf_count: 2, include_led_marker: true } },
  // tall
  k_pantry60: { label: "دولاب تموين 60", desc: "طويل 220، ضلفتين و5 أرفف.", group: "مطابخ — طويل", params: { ...T, width: 60, door_type: "double", shelf_count: 5 } },
  k_pantry40: { label: "دولاب تموين 40", desc: "ضلفة واحدة و5 أرفف.", group: "مطابخ — طويل", params: { ...T, width: 40, door_type: "single", shelf_count: 5 } },
  k_pantry_drawers: { label: "تموين: أدراج تحت وأرفف فوق", desc: "3 أدراج تحت، وضلفتين بأرفف فوق.", group: "مطابخ — طويل", params: { ...T, unit_category: "wardrobe", width: 60, wardrobe_zone_count: 2, wardrobe_zone1_type: "drawers", wardrobe_zone1_height: 75, wardrobe_zone1_count: 3, wardrobe_zone2_type: "shelves_double", wardrobe_zone2_count: 4 } },
  k_oven_only: { label: "عمود فرن بس", desc: "أدراج تحت، فرن، وضلف فوق.", group: "مطابخ — طويل", params: { ...T, unit_category: "oven", include_microwave: false, oven_bottom_front_type: "drawers", drawer_count: 2, oven_cavity_bottom_offset: 70 } },
  k_micro_tall: { label: "عمود ميكروويف وتخزين", desc: "ضلف تحت، ميكروويف في النص، ضلف فوق.", group: "مطابخ — طويل", params: { ...T, unit_category: "microwave", width: 60, microwave_cavity_bottom_offset: 110 } },
  k_broom40: { label: "دولاب مكانس 40", desc: "طويل فاضي برف فوق للمنظفات.", group: "مطابخ — طويل", params: { ...T, width: 40, door_type: "single", shelf_count: 1 } },
  k_fridge_wide: { label: "تجويف ثلاجة سايد باي سايد", desc: "تجويف 95 سم ووحدة فوقها.", group: "مطابخ — طويل", params: { unit_category: "fridge", unit_type: "tall", height: 220, depth: 65, width: 101.6, fridge_cavity_width: 95 } },
  // corners
  k_corner_l_wall: { label: "زاوية L علوية 60×60", desc: "علوية زاوية برجلين وضلفتين.", group: "مطابخ — زوايا", params: { unit_category: "corner", corner_style: "l_shape", ...W, corner_leg1_length: 60, corner_leg2_length: 60 } },
  k_corner_diag_wall: { label: "زاوية قطرية علوية 60×60", desc: "ضلفة قطرية فوق.", group: "مطابخ — زوايا", params: { unit_category: "corner", corner_style: "diagonal", ...W, corner_leg1: 60, corner_leg2: 60 } },
  k_corner_open: { label: "زاوية أرفف مفتوحة", desc: "ربع دايرة أرفف في آخر الصف.", group: "مطابخ — زوايا", params: { unit_category: "corner", corner_style: "open", ...W, corner_leg1_length: 30, corner_leg2_length: 30 } },
  k_corner_blind_wall: { label: "زاوية عمياء علوية 90", desc: "ضلفة 40 والباقي أعمى.", group: "مطابخ — زوايا", params: { unit_category: "corner", corner_style: "blind", ...W, corner_total_width: 90, corner_door_width: 40 } },
  // accessories
  k_acc_cutlery: ACC("tray_dividers", "فواصل درج معالق", "تقسيمة جوه درج 60.", { accessory_width: 52, accessory_depth: 45, accessory_height: 6, accessory_divider_count: 5 }),
  k_acc_utensil: ACC("utensil_tray", "درج أدوات شبكي", "خانات للأدوات الصغيرة.", { accessory_width: 52, accessory_depth: 45, accessory_height: 8, accessory_grid_cols: 4, accessory_grid_rows: 3 }),
  k_acc_spice: ACC("spice_rack", "رف بهارات", "أرفف ضيقة للبرطمانات.", { accessory_width: 20, accessory_depth: 45, accessory_height: 60, accessory_shelf_gap: 3 }),
  k_acc_basket: ACC("pullout_basket", "سلة سحب", "سلة جوه وحدة 30–40.", { accessory_width: 26, accessory_depth: 45, accessory_height: 50 }),
  k_acc_plates: ACC("plate_rack", "حامل أطباق", "مايل لتصفية الأطباق.", { accessory_width: 76, accessory_depth: 28, accessory_height: 30, accessory_rack_tilt: 15 }),
  k_acc_shelfdiv: ACC("shelf_dividers", "فواصل تحت رف", "للصواني والألواح.", { accessory_width: 76, accessory_depth: 45, accessory_height: 30, accessory_divider_count: 4 }),
  // pull-outs, corner systems and organised drawers (the fittings are listed as hardware)
  k_oil20: { label: "ترولي زيت 20", desc: "سحب كامل بـ 3 سلات للزيت والتوابل جنب البوتجاز.", group: "مطابخ — ترولي ومنظمات", org: "oil", params: { width: 20, door_type: "drawers", drawer_count: 1, include_drawer_boxes: false, include_shelves: false } },
  k_oil30: { label: "ترولي زيت 30 (4 أدوار)", desc: "زيت وخل تحت، توابل فوق، بفواصل.", group: "مطابخ — ترولي ومنظمات", org: "oil", orgOpts: { levels: 4, rows: ["bottles", "oil", "spice", "spice"], div: [0, 1, 2, 2] }, params: { width: 30, door_type: "drawers", drawer_count: 1, include_drawer_boxes: false, include_shelves: false } },
  k_oil40: { label: "ترولي زيت 40", desc: "دورين زجاجات كبيرة ودور توابل.", group: "مطابخ — ترولي ومنظمات", org: "oil", orgOpts: { levels: 3, rows: ["bottles", "oil", "spice"], div: [1, 1, 2] }, params: { width: 40, door_type: "drawers", drawer_count: 1, include_drawer_boxes: false, include_shelves: false } },
  k_oil15: { label: "ترولي زيت 15 (ضيق)", desc: "للمسافات الضيقة بين وحدتين.", group: "مطابخ — ترولي ومنظمات", org: "oil", params: { width: 15, door_type: "drawers", drawer_count: 1, include_drawer_boxes: false, include_shelves: false } },
  k_cargo40: { label: "عمود ترولي طويل 40 (كارجو)", desc: "5 سلات بتطلع مع الوش كله — تموين.", group: "مطابخ — ترولي ومنظمات", org: "cargo", params: { unit_type: "tall", height: 220, depth: 58, width: 40, door_type: "drawers", drawer_count: 1, include_drawer_boxes: false, include_shelves: false } },
  k_cargo30: { label: "عمود ترولي طويل 30", desc: "ضيق جنب التلاجة.", group: "مطابخ — ترولي ومنظمات", org: "cargo", params: { unit_type: "tall", height: 220, depth: 58, width: 30, door_type: "drawers", drawer_count: 1, include_drawer_boxes: false, include_shelves: false } },
  k_bin60: { label: "سلة زبالة سحب 60", desc: "صندوقين بيطلعوا مع الضلفة — تحت الحوض أو جنبه.", group: "مطابخ — ترولي ومنظمات", org: "bin", params: { width: 60, door_type: "double", include_shelves: false } },
  k_sort80: { label: "فرز زبالة 80 (3 صناديق)", desc: "عضوي · بلاستيك · ورق.", group: "مطابخ — ترولي ومنظمات", org: "binsort", params: { width: 80, door_type: "double", include_shelves: false } },
  k_baskets60: { label: "سفلية بسلتين سحب 60", desc: "سلال ستانلس بتطلع من ورا الضلف.", group: "مطابخ — ترولي ومنظمات", org: "baskets", params: { width: 60, door_type: "double", include_shelves: false } },
  k_magic100: { label: "زاوية عمياء بماجيك كورنر", desc: "سلال بتطلع من الركنة الميتة لبره.", group: "مطابخ — ترولي ومنظمات", org: "magic", params: { unit_category: "corner", corner_style: "blind", corner_total_width: 100 } },
  k_lemans100: { label: "زاوية عمياء بلي مانز", desc: "رفين شكل كلية بيلفّوا ويطلعوا.", group: "مطابخ — ترولي ومنظمات", org: "lemans", params: { unit_category: "corner", corner_style: "blind", corner_total_width: 100 } },
  k_carousel90: { label: "زاوية L بكاروسيل دوّار", desc: "رفين 3/4 دايرة بيلفّوا.", group: "مطابخ — ترولي ومنظمات", org: "carousel", params: { unit_category: "corner", corner_style: "l_shape" } },
  k_plates80: { label: "علوية مصفاة أطباق 80", desc: "مصفاة ستانلس دورين فوق الحوض.", group: "مطابخ — ترولي ومنظمات", org: "plates", params: { ...W, width: 80, include_shelves: false } },
  k_lift90: { label: "علوية برف ليفت 90", desc: "الرف بينزل لحد إيدك ويطلع تاني.", group: "مطابخ — ترولي ومنظمات", org: "lift", params: { ...W, width: 90, height: 80, include_shelves: false } },
  k_cutlery60: { label: "3 أدراج متقسمة 60", desc: "فوق: معالق وشوك وسكاكين · نص: أدوات طبخ · تحت: حلل.", group: "مطابخ — ترولي ومنظمات", ins: { 3: "cutlery", 2: "utensils", 1: "pots" }, params: { door_type: "drawers", drawer_count: 3, include_drawer_boxes: true, include_shelves: false } },
  k_knives30: { label: "3 أدراج 30: سكاكين وتوابل", desc: "فوق: سكاكين · نص: توابل · تحت: فويل وأكياس.", group: "مطابخ — ترولي ومنظمات", ins: { 3: "knives", 2: "spices", 1: "wraps" }, params: { width: 30, door_type: "drawers", drawer_count: 3, include_drawer_boxes: true, include_shelves: false } },
  k_spices40: { label: "4 أدراج 40 متقسمة", desc: "توابل · شاي وقهوة · لفايف · أدوات.", group: "مطابخ — ترولي ومنظمات", ins: { 4: "spices", 3: "tea", 2: "wraps", 1: "utensils" }, params: { width: 40, door_type: "drawers", drawer_count: 4, include_drawer_boxes: true, include_shelves: false } },
  k_plates_drw80: { label: "درجين 80: أطباق وحلل", desc: "فوق: أطباق واقفة · تحت: حلل وأغطية.", group: "مطابخ — ترولي ومنظمات", ins: { 2: "plates", 1: "pots" }, params: { width: 80, door_type: "drawers", drawer_count: 2, include_drawer_boxes: true, include_shelves: false } },
  // wardrobes
  k_wr_kids100: { label: "دولاب أطفال 100", desc: "شماعة واطية وأرفف ودرجين.", group: "دواليب غرف النوم", params: { unit_category: "bedroom_wardrobe", unit_type: "tall", width: 100, height: 200, depth: 55, wardrobe_zone_count: 3, wardrobe_zone1_type: "drawers", wardrobe_zone1_height: 40, wardrobe_zone1_count: 2, wardrobe_zone2_type: "rail_double", wardrobe_zone2_height: 110, wardrobe_zone3_type: "shelves_double", wardrobe_zone3_count: 1 } },
  k_wr_2col160: { label: "دولاب نوم 160 عمودين", desc: "عمود شماعة وعمود أرفف وأدراج.", group: "دواليب غرف النوم", params: { unit_category: "bedroom_wardrobe", unit_type: "tall", width: 160, height: 240, depth: 60, wardrobe_column_count: 2, wardrobe_zone_count: 1, wardrobe_zone1_type: "rail_double", wardrobe_col2_zone_count: 2, wardrobe_col2_zone1_type: "drawers", wardrobe_col2_zone1_height: 60, wardrobe_col2_zone1_count: 3, wardrobe_col2_zone2_type: "shelves_double", wardrobe_col2_zone2_count: 4 } },
  k_wr_3col240: { label: "دولاب نوم 240 تلات أعمدة", desc: "شماعة طويلة، أرفف، وشماعتين قصار.", group: "دواليب غرف النوم", params: { unit_category: "bedroom_wardrobe", unit_type: "tall", width: 240, height: 250, depth: 60, wardrobe_column_count: 3, wardrobe_zone_count: 1, wardrobe_zone1_type: "rail_double", wardrobe_col2_zone_count: 1, wardrobe_col2_zone1_type: "shelves_double", wardrobe_col2_zone1_count: 6, wardrobe_col3_zone_count: 2, wardrobe_col3_zone1_type: "rail_double", wardrobe_col3_zone1_height: 110, wardrobe_col3_zone2_type: "rail_double" } },
  k_wr_slide240: { label: "دولاب سحّاب 240 لوحين", desc: "لوحين سحّاب، شماعة وأرفف وأدراج.", group: "دواليب غرف النوم", params: { unit_category: "bedroom_wardrobe", unit_type: "tall", width: 240, height: 250, depth: 65, door_style: "sliding", sliding_panel_count: 2, wardrobe_zone_count: 3, wardrobe_zone1_type: "drawers", wardrobe_zone1_height: 50, wardrobe_zone1_count: 2, wardrobe_zone2_type: "rail_open", wardrobe_zone2_height: 140, wardrobe_zone3_type: "shelves_open", wardrobe_zone3_count: 1 } },
  k_wr_single50: { label: "دولاب ضلفة واحدة 50", desc: "عمود ضيق بشماعة وأرفف.", group: "دواليب غرف النوم", params: { unit_category: "bedroom_wardrobe", unit_type: "tall", width: 50, height: 220, depth: 58, wardrobe_zone_count: 2, wardrobe_zone1_type: "shelves_single", wardrobe_zone1_height: 80, wardrobe_zone1_count: 2, wardrobe_zone2_type: "rail_single" } },
};

// ------------------------------------------------------------------ dressing rooms
const DC = (o) => ({ height: "auto", content: "empty", shelf_count: 2, drawer_count: 3, divider_count: 1, sub_shelf_count: 0, door: "none", door_style: "default", drawer_front: true, drawer_glass: false, led: "none", ...o });
export const DRESSING = {
  d_open_led: { label: "دريسنج مفتوح بليد 240", desc: "من غير ضلف: شماعات وأرفف وأدراج، ليد في كل فراغ.", params: {
    width: 240, height: 250, depth: 55,
    sections: [
      { width: "auto", compartments: [DC({ content: "rail", led: "top" })] },
      { width: "auto", compartments: [DC({ height: 75, content: "drawers", drawer_count: 3 }), DC({ content: "shelves", shelf_count: 4, led: "shelves" })] },
      { width: "auto", compartments: [DC({ height: 110, content: "rail", led: "top" }), DC({ content: "rail", led: "top" })] },
    ] } },
  d_shoes: { label: "دريسنج جزم وشنط", desc: "أرفف جزم كتير وفراغ شنط بليد، ضلف زجاج.", libs: { glass: "glass_smoked", door_frame_alu: "alu_black" }, params: {
    width: 120, height: 240, depth: 40, doors: { style: "glass_alu" }, handles: { type: "none" },
    materials: { glass: { name: "NOVERA - زجاج فيميه (مدخّن)" }, door_frame_alu: { name: "NOVERA - ألومنيوم أسود" } },
    sections: [
      { width: "auto", compartments: [DC({ content: "shelves", shelf_count: 9, door: "single_left", led: "shelves" })] },
      { width: "auto", compartments: [DC({ content: "shelves", shelf_count: 5, door: "single_right", led: "sides" })] },
    ] } },
  d_small120: { label: "دريسنج صغير 120", desc: "قسمين: شماعة، وأرفف بأدراج تحت.", params: {
    width: 120, height: 230, depth: 58,
    sections: [
      { width: "auto", compartments: [DC({ content: "rail", door: "single_left" })] },
      { width: "auto", compartments: [DC({ height: 60, content: "drawers", drawer_count: 3 }), DC({ content: "shelves", shelf_count: 4, door: "single_right" })] },
    ] } },
  d_mirror_doors: { label: "دريسنج بضلف مراية 200", desc: "ضلف مراية بفريم ألومنيوم، 4 ضلف.", libs: { door_frame_alu: "alu_silver" }, params: {
    width: 200, height: 250, depth: 60, doors: { style: "mirror_alu" }, handles: { type: "none" },
    materials: { door_frame_alu: { name: "NOVERA - ألومنيوم فضي" } },
    sections: [
      { width: "auto", compartments: [DC({ content: "rail", door: "double" })] },
      { width: "auto", compartments: [DC({ height: 70, content: "drawers", drawer_count: 3 }), DC({ content: "shelves", shelf_count: 4, door: "double" })] },
    ] } },
  d_double_hang: { label: "شماعتين فوق بعض 160", desc: "قمصان وبناطيل: شماعة فوق وشماعة تحت.", params: {
    width: 160, height: 240, depth: 60,
    sections: [
      { width: "auto", compartments: [DC({ height: 110, content: "rail", door: "double" }), DC({ content: "rail", door: "continue" })] },
      { width: "auto", compartments: [DC({ content: "dividers", divider_count: 1, sub_shelf_count: 5, door: "double" })] },
    ] } },
  d_glass_drawers90: { label: "عمود أدراج بوش زجاج 90", desc: "زي الصورة: 4 أدراج بفريم خشب وزجاج، فراغ مفتوح بليد تحت الرف، ورف فوق.", libs: { glass: "glass_clear", carcass: "wood_oak_natural_v", drawer_front: "wood_oak_natural_v", back: "wood_oak_natural_v" }, params: {
    width: 90, materials: { carcass: { name: "NOVERA - خشب أوك طبيعي - عروق رأسي" }, drawer_front: { name: "NOVERA - خشب أوك طبيعي - عروق رأسي" }, back: { name: "NOVERA - خشب أوك طبيعي - عروق رأسي" }, glass: { name: "NOVERA - زجاج شفاف" } }, height: 240, depth: 58, handles: { type: "none" },
    sections: [
      { width: "auto", compartments: [DC({ height: 95, content: "drawers", drawer_count: 4, drawer_glass: true }), DC({ height: 110, content: "empty", led: "top" }), DC({ content: "shelves", shelf_count: 0 })] },
    ] } },
  d_glass_walkin240: { label: "دريسنج مفتوح بأدراج زجاج 240", desc: "شماعتين على الجنبين وعمود أدراج زجاج في النص، ليد تحت كل رف.", libs: { glass: "glass_clear", carcass: "wood_oak_natural_v", drawer_front: "wood_oak_natural_v", back: "wood_oak_natural_v" }, params: {
    width: 240, materials: { carcass: { name: "NOVERA - خشب أوك طبيعي - عروق رأسي" }, drawer_front: { name: "NOVERA - خشب أوك طبيعي - عروق رأسي" }, back: { name: "NOVERA - خشب أوك طبيعي - عروق رأسي" }, glass: { name: "NOVERA - زجاج شفاف" } }, height: 250, depth: 58, handles: { type: "none" },
    sections: [
      { width: 70, compartments: [DC({ height: 120, content: "rail", led: "top" }), DC({ content: "rail", led: "top" })] },
      { width: "auto", compartments: [DC({ height: 95, content: "drawers", drawer_count: 4, drawer_glass: true }), DC({ height: 115, content: "empty", led: "top" }), DC({ content: "shelves", shelf_count: 0 })] },
      { width: 70, compartments: [DC({ content: "shelves", shelf_count: 5, led: "shelves" })] },
    ] } },
  d_wall_long: { label: "حيطة دريسنج كاملة 360", desc: "5 أقسام: شماعات، أرفف، أدراج، ركن جزم.", params: {
    width: 360, height: 260, depth: 60, plinth: { enabled: true, style: "legs" },
    sections: [
      { width: "auto", compartments: [DC({ content: "rail", door: "double" })] },
      { width: "auto", compartments: [DC({ height: 100, content: "rail", door: "double" }), DC({ content: "rail", door: "double" })] },
      { width: "auto", compartments: [DC({ height: 80, content: "drawers", drawer_count: 4 }), DC({ content: "shelves", shelf_count: 4, door: "double", led: "shelves" })] },
      { width: "auto", compartments: [DC({ content: "rail", door: "double" })] },
      { width: "auto", compartments: [DC({ content: "shelves", shelf_count: 8, door: "double" })] },
    ] } },
};

// ------------------------------------------------------------------ furniture (panel engine)
const M = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { lib: v }]));
const P = (group, label, desc, params) => ({ group, label, desc, params });
export const PANEL = {
  // dressing tables
  app_dresser_corner80: P("غرف النوم", "تسريحة صغيرة 80 بدرجين", "مراية مستطيلة فوقها، رجول.", { template: "dresser", width: 80, depth: 40, plinth: { height: 15, style: "legs" }, fronts: [{ type: "drawers", count: 2 }],
    materials: M({ carcass: "hpl_white", front: "hpl_cream", accent: "wood_oak_light_v", shelf: "hpl_white" }), dresser: { base_height: 75, mirror_width: 60, mirror_height: 80, mirror_gap: 10 } }),
  app_dresser_led120: P("غرف النوم", "تسريحة 120 بمراية ليد", "3 أدراج جولا، مراية عريضة بليد من ورا.", { template: "dresser", width: 120, depth: 45, handle: "gola", fronts: [{ type: "drawers", count: 3 }],
    materials: M({ carcass: "hpl_offwhite", front: "acrylic_champagne", accent: "acrylic_champagne", shelf: "hpl_offwhite" }), dresser: { base_height: 78, mirror_width: 100, mirror_height: 90, mirror_gap: 8, mirror_led: true } }),
  app_dresser_vanity_desk: P("غرف النوم", "تسريحة مكتب معلّقة 140", "سطح معلّق بدرج جولا ومراية طويلة.", { template: "dresser", width: 140, depth: 45, mount: "wall", handle: "gola", led_under: true, fronts: [{ type: "drawers", count: 1 }],
    materials: M({ carcass: "hpl_white", front: "wood_walnut_v", accent: "wood_walnut_v", shelf: "hpl_white" }), dresser: { base_height: 18, float_height: 72, mirror_width: 70, mirror_height: 110, mirror_gap: 12, mirror_led: true } }),
  app_dresser_tall_mirror: P("غرف النوم", "تسريحة بمراية طويلة لحد الأرض", "وحدة أدراج واطية ومراية 150 سم.", { template: "dresser", width: 100, depth: 40, fronts: [{ type: "drawers", count: 2 }],
    materials: M({ carcass: "hpl_greige", front: "hpl_greige", accent: "wood_oak_natural_v", shelf: "hpl_greige" }), dresser: { base_height: 45, mirror_width: 60, mirror_height: 150, mirror_gap: 5 } }),
  // nightstands & chests
  app_night_open: P("غرف النوم", "كومودينو مفتوح بدرج", "درج فوق ونيش مفتوح تحت.", { template: "nightstand", width: 45, height: 50, fronts: [{ type: "open", height: 22, shelves: 0 }, { type: "drawers", count: 1 }],
    materials: M({ carcass: "wood_oak_natural_v", front: "wood_oak_natural_v", shelf: "wood_oak_natural_v" }) }),
  app_night_3drawers: P("غرف النوم", "كومودينو 3 أدراج", "رجول، 3 أدراج.", { template: "nightstand", width: 50, height: 65, plinth: { height: 12, style: "legs" }, fronts: [{ type: "drawers", count: 3 }],
    materials: M({ carcass: "hpl_white", front: "hpl_greige", drawer_box: "hpl_white" }) }),
  app_chest_double: P("غرف النوم", "شيفونيرة 4 أدراج عريضة 70", "4 أدراج كبار على قاعدة.", { template: "chest", width: 70, height: 95, fronts: [{ type: "drawers", count: 4 }],
    materials: M({ carcass: "hpl_offwhite", front: "wood_walnut_v", accent: "wood_walnut_v" }) }),
  app_chest_tall: P("غرف النوم", "شيفونيرة عالية 7 أدراج", "60 عرض، 140 ارتفاع، جولا.", { template: "chest", width: 60, height: 140, handle: "gola", fronts: [{ type: "drawers", count: 7 }],
    materials: M({ carcass: "hpl_white", front: "hpl_sage", accent: "hpl_sage" }) }),
  app_desk_double: P("غرف النوم", "مكتب طالب مع أرفف 120", "أدراج شمال ورفين فوق المكتب.", { template: "desk", width: 120, depth: 55, materials: M({ carcass: "hpl_white", front: "hpl_navy", accent: "wood_oak_light_v" }), desk: { pedestal: "left", pedestal_drawers: 3, wall_shelves: 2, led: true } }),
  app_desk_simple: P("غرف النوم", "مكتب بسيط من غير أدراج", "سطح وجنبين وساتر.", { template: "desk", width: 100, depth: 55, materials: M({ carcass: "wood_oak_natural_v", front: "wood_oak_natural_v", accent: "wood_oak_natural_v" }), desk: { pedestal: "none", modesty: true } }),
  // bathroom
  app_vanity60: P("الحمام", "حوض 60 ضلفة", "معلّق، ضلفة واحدة push.", { template: "vanity", width: 60, handle: "push", fronts: [{ type: "doors", count: 1, shelves: 0 }], materials: M({ front: "hpl_white", accent: "hpl_greige" }) }),
  app_vanity100_drawers: P("الحمام", "حوض 100 بدرجين جولا", "درجين عراض وليد تحت.", { template: "vanity", width: 100, height: 55, handle: "gola", led_under: true, fronts: [{ type: "drawers", count: 2 }], materials: M({ front: "wood_walnut_v", accent: "hpl_anthracite" }) }),
  app_vanity_floor: P("الحمام", "حوض أرضي برجول 80", "على رجول، ضلفتين ونيش.", { template: "vanity", width: 80, height: 85, mount: "floor", plinth: { height: 15, style: "legs" }, fronts: [{ type: "open", height: 20, shelves: 0 }, { type: "doors", count: 2, shelves: 0 }], materials: M({ front: "wood_oak_natural_v", accent: "wood_oak_natural_v" }) }),
  app_mirror90: P("الحمام", "دولاب مراية 90 تلات ضلف", "ضلف مراية push بأرفف.", { template: "mirror_cabinet", width: 90, height: 75, fronts: [{ type: "doors", count: 3, shelves: 2 }], materials: M({ carcass: "hpl_white" }) }),
  app_bath_tall2: P("الحمام", "عمود حمام 40 بضلفتين", "ضلفة تحت وضلفة فوق ونيش.", { template: "bath_tall", width: 40, height: 180, fronts: [{ type: "doors", count: 1, height: 80, shelves: 2 }, { type: "open", height: 30, shelves: 0, led: true }, { type: "doors", count: 1, shelves: 2 }], materials: M({ front: "hpl_greige" }) }),
  app_bath_over_wc: P("الحمام", "دولاب فوق التواليت", "معلّق 60×60 بضلفتين.", { template: "cabinet", environment: "wet", width: 60, height: 60, depth: 22, mount: "wall", handle: "push", fronts: [{ type: "doors", count: 2, shelves: 1 }], materials: M({ carcass: "hpl_white", front: "hpl_white" }) }),
  // living, dining & entrance
  app_buffet180: P("الريسبشن", "بوفيه سفرة 180", "4 ضلف على رجول.", { template: "cabinet", width: 180, height: 85, depth: 45, plinth: { height: 15, style: "legs" }, fronts: [{ type: "doors", count: 4, shelves: 0 }], materials: M({ carcass: "hpl_offwhite", front: "wood_walnut_v", accent: "wood_walnut_v" }) }),
  app_buffet_drawers: P("الريسبشن", "بوفيه أدراج وضلف 160", "درجين فوق وضلف تحت.", { template: "cabinet", width: 160, height: 85, depth: 45, fronts: [{ type: "doors", count: 4, shelves: 0 }, { type: "drawers", count: 1 }], materials: M({ carcass: "hpl_black", front: "wood_oak_natural_v", accent: "wood_oak_natural_v" }) }),
  app_vitrine: P("الريسبشن", "نيش / فاترينة سفرة", "ضلف تحت وأرفف مفتوحة بليد فوق.", { template: "open_shelf", width: 90, height: 200, depth: 40, fronts: [{ type: "doors", count: 2, height: 85, shelves: 1 }, { type: "open", shelves: 0, led: true }, { type: "open", shelves: 0, led: true }], materials: M({ carcass: "hpl_white", front: "acrylic_cream", shelf: "hpl_white" }) }),
  app_coffee_bar: P("الريسبشن", "ركن قهوة / بار 120", "ضلف تحت، نيش مفتوح بليد فوق.", { template: "cabinet", width: 120, height: 95, depth: 45, handle: "push", fronts: [{ type: "doors", count: 2, shelves: 0 }, { type: "open", height: 25, shelves: 0, led: true }], materials: M({ carcass: "hpl_anthracite", front: "wood_walnut_v", accent: "wood_walnut_v" }) }),
  app_bookcase_wide: P("الريسبشن", "مكتبة 90 بستة مستويات", "مفتوحة، 220 ارتفاع.", { template: "open_shelf", width: 90, height: 220, depth: 32, fronts: [{ type: "open", shelves: 5 }], materials: M({ carcass: "wood_oak_light_v", shelf: "wood_oak_light_v" }) }),
  app_lowshelf: P("الريسبشن", "مكتبة واطية تحت الشباك", "90×60، مستويين.", { template: "open_shelf", width: 90, height: 60, depth: 30, fronts: [{ type: "open", shelves: 1 }], materials: M({ carcass: "hpl_white", shelf: "hpl_white" }) }),
  app_shoe_tall: P("الريسبشن", "جزامة عالية 60", "ضلفتين و6 أرفف ونيش للمفاتيح.", { template: "shoe_cabinet", width: 60, height: 180, fronts: [{ type: "doors", count: 2, shelves: 6 }, { type: "open", height: 20, shelves: 0 }], materials: M({ carcass: "hpl_white", front: "hpl_beige" }) }),
  app_shoe_bench: P("الريسبشن", "بنش مدخل بجزامة", "قعدة 45 ارتفاع بضلفتين.", { template: "shoe_cabinet", width: 90, height: 45, depth: 38, fronts: [{ type: "doors", count: 2, shelves: 1 }], materials: M({ carcass: "wood_oak_natural_v", front: "wood_oak_natural_v" }) }),
  app_tv_low: P("الريسبشن", "شاشة أرضي بس 180", "أرضي معلّق بقلابات، من غير بانوه.", { template: "tv_unit", width: 180, tv: { panel: false, columns: "none", base_fronts: "flap", base_float: 25 }, materials: M({ carcass: "hpl_white", front: "wood_oak_light_v", accent: "wood_oak_light_v" }) }),
  app_tv_marble: P("الريسبشن", "شاشة ببانوه شرايح وأعمدة أرفف", "شرايح جوز، أعمدة مفتوحة، أدراج تحت.", { template: "tv_unit", width: 300, tv: { panel_style: "slats", base_fronts: "drawers", column_doors: false, column_shelves: 5 }, materials: M({ carcass: "hpl_anthracite", front: "hpl_anthracite", accent: "wood_walnut_v" }) }),
  // general storage
  app_storage_tall: P("عام", "دولاب تخزين / ملايات 80", "ضلفتين طول و5 أرفف.", { template: "cabinet", width: 80, height: 220, depth: 55, fronts: [{ type: "doors", count: 2, shelves: 5 }], materials: M({ carcass: "hpl_white", front: "hpl_white" }) }),
  app_laundry: P("عام", "دولاب غسيل / منظفات", "ضلفتين تحت وقلاب فوق.", { template: "cabinet", environment: "wet", width: 80, height: 200, depth: 45, fronts: [{ type: "doors", count: 2, height: 120, shelves: 2 }, { type: "flap", count: 1, shelves: 1 }], materials: M({ carcass: "hpl_white", front: "hpl_light_grey" }) }),
  app_wall_flap: P("عام", "وحدة حيطة قلاب 120", "معلّقة 40 ارتفاع، قلاب.", { template: "cabinet", width: 120, height: 40, depth: 35, mount: "wall", handle: "push", fronts: [{ type: "flap", count: 1, shelves: 0 }], materials: M({ carcass: "hpl_white", front: "wood_oak_light_v" }) }),
};

// ------------------------------------------------------------------ made from free boards (template "free")
// Furniture the engine has no template for, drawn as plain boards. Sizes can be changed from the
// boards list afterwards. Each board: name, role, material, x (width), y (depth), z (height), w, d, h.
const b = (name, role, material, x, y, z, w, d, h) => ({ name, role, material, x, y, z, w, d, h });
function bunkBed({ mw = 90, ml = 190, t = 1.8 } = {}) {
  const W = mw + 2 * t + 2, L = ml + 2, H = 165, lo = 25, hi = 125;
  const out = [b("رجل قدام شمال", "side", "carcass", 0, 0, 0, 7, 7, H), b("رجل قدام يمين", "side", "carcass", W - 7, 0, 0, 7, 7, H),
    b("رجل ورا شمال", "side", "carcass", 0, L - 7, 0, 7, 7, H), b("رجل ورا يمين", "side", "carcass", W - 7, L - 7, 0, 7, 7, H)];
  for (const [lvl, z] of [["تحت", lo], ["فوق", hi]]) {
    out.push(b(`جنب طويل شمال ${lvl}`, "horizontal", "front", 0, 7, z, t, L - 14, 18), b(`جنب طويل يمين ${lvl}`, "horizontal", "front", W - t, 7, z, t, L - 14, 18),
      b(`عرضية رجلين ${lvl}`, "horizontal", "front", 7, 0, z, W - 14, t, 18), b(`عرضية راس ${lvl}`, "horizontal", "front", 7, L - t, z, W - 14, t, 18),
      b(`قاعدة مرتبة ${lvl}`, "shelf", "carcass", t, 7, z, W - 2 * t, L - 14, t));
  }
  out.push(b("حماية فوق", "other", "front", W - t, 30, hi + 18, t, L - 60, 22));
  for (let i = 0; i < 4; i++) out.push(b(`درجة سلم ${i + 1}`, "other", "accent", -2 - t, 10, 30 + i * 28, t + 2, 40, 6));
  out.push(b("جنب سلم 1", "side", "accent", -2 - t * 2, 8, 0, t, 4, hi + 18), b("جنب سلم 2", "side", "accent", -2 - t * 2, 48, 0, t, 4, hi + 18));
  return out;
}
function slatWall({ w = 240, h = 260, sw = 6, gap = 2 } = {}) {
  const out = [b("لوح خلفي للتجليد", "back", "carcass", 0, 1.8, 0, w, 1.8, h)];
  const n = Math.floor((w + gap) / (sw + gap)), used = n * sw + (n - 1) * gap, x0 = (w - used) / 2;
  for (let i = 0; i < n; i++) out.push(b(`شريحة ${i + 1}`, "other", "accent", x0 + i * (sw + gap), 0, 0, sw, 1.8, h));
  return out;
}
function floatShelves({ n = 3, w = 90, d = 22, gap = 35, t = 3.6 } = {}) {
  return Array.from({ length: n }, (_, i) => b(`رف عائم ${i + 1}`, "shelf", "shelf", (i % 2) * 20, 0, i * gap, w, d, t));
}
function benchStorage({ w = 120, d = 45, h = 45, t = 1.8 } = {}) {
  return [b("جنب شمال", "side", "carcass", 0, 0, 0, t, d, h - t), b("جنب يمين", "side", "carcass", w - t, 0, 0, t, d, h - t),
    b("قاعدة", "horizontal", "carcass", t, 0, 5, w - 2 * t, d, t), b("وش قدام", "other", "front", t, 0, 5 + t, w - 2 * t, t, h - 2 * t - 5),
    b("ضهر", "back", "carcass", t, d - t, 5 + t, w - 2 * t, t, h - 2 * t - 5), b("وزرة", "plinth", "carcass", t, 3, 0, w - 2 * t, t, 5),
    b("غطا قعدة (بمفصلات)", "door", "accent", 0, 0, h - t, w, d, t), b("فاصل نص", "divider", "carcass", w / 2 - t / 2, t, 5 + t, t, d - 2 * t, h - 2 * t - 5)];
}
function wallPanelNiche({ w = 180, h = 240 } = {}) {
  const t = 1.8, out = [b("بانوه شمال", "back", "accent", 0, 0, 0, (w - 60) / 2, t, h), b("بانوه يمين", "back", "accent", (w + 60) / 2, 0, 0, (w - 60) / 2, t, h),
    b("ضهر النيش", "back", "carcass", (w - 60) / 2, 12, 0, 60, t, h)];
  out.push(b("جنب نيش شمال", "side", "carcass", (w - 60) / 2, 0, 0, t, 12, h), b("جنب نيش يمين", "side", "carcass", (w + 60) / 2 - t, 0, 0, t, 12, h));
  for (let i = 1; i <= 4; i++) out.push(b(`رف نيش ${i}`, "shelf", "shelf", (w - 60) / 2 + t, 0, i * (h / 5), 60 - 2 * t, 12, t));
  return out;
}
function ladderShelf({ w = 60, h = 180, t = 1.8 } = {}) {
  const out = [b("جنب سلم شمال", "side", "accent", 0, 0, 0, t, 35, h), b("جنب سلم يمين", "side", "accent", w - t, 0, 0, t, 35, h)];
  for (let i = 0; i < 5; i++) { const d = 35 - i * 6; out.push(b(`رف ${i + 1}`, "shelf", "shelf", t, 35 - d, 8 + i * ((h - 20) / 4), w - 2 * t, d, t)); }
  return out;
}
function floatingDesk({ w = 120, d = 50, t = 1.8 } = {}) {
  return [b("سطح المكتب", "horizontal", "accent", 0, 0, 74, w, d, t * 2), b("بانوه حيطة ورا", "back", "carcass", 0, d, 74 + t * 2, w, t, 60),
    b("رف فوق المكتب", "shelf", "shelf", 0, d - 22, 74 + t * 2 + 40, w, 22, t), b("درج تحت السطح (وش)", "other", "front", w - 50, 0, 60, 45, t, 13)];
}
const FREE = (label, desc, panels, mats) => ({ group: "تصميمات من ألواح", label, desc, params: { template: "free", panels, materials: M(mats) } });
export const FREE_PANELS = {
  app_free_bunk: FREE("سرير دورين 90×190 بسلم", "دورين بحماية فوق وسلم جنب.", bunkBed(), { carcass: "hpl_white", front: "wood_oak_light_v", accent: "wood_oak_light_v" }),
  app_free_slatwall: FREE("تجليد حيطة شرايح 240", "شرايح 6 سم بمسافة 2 على لوح خلفي.", slatWall(), { carcass: "hpl_anthracite", accent: "wood_walnut_v" }),
  app_free_float_shelves: FREE("3 أرفف عائمة 90", "أرفف سميكة 3.6 مخفية الحامل.", floatShelves(), { shelf: "wood_oak_natural_v" }),
  app_free_bench: FREE("بنش تخزين بغطا 120", "قعدة بتفتح لفوق وفاصل جوه.", benchStorage(), { carcass: "hpl_white", front: "hpl_greige", accent: "wood_oak_natural_v" }),
  app_free_niche_wall: FREE("بانوه حيطة بنيش أرفف", "بانوهين جوز ونيش 60 بأرفف في النص.", wallPanelNiche(), { carcass: "hpl_white", accent: "wood_walnut_v", shelf: "hpl_white" }),
  app_free_ladder: FREE("مكتبة سلم 60", "أرفف بتصغر لفوق.", ladderShelf(), { accent: "wood_oak_light_v", shelf: "wood_oak_light_v" }),
  app_free_float_desk: FREE("مكتب معلّق برف 120", "سطح دبل وبانوه حيطة ورف.", floatingDesk(), { carcass: "hpl_white", accent: "wood_oak_natural_v", shelf: "wood_oak_natural_v", front: "hpl_white" }),
};

Object.assign(EXTRA_PRESETS, PANEL, FREE_PANELS);

// ------------------------------------------------------------------ smart designs: several units that work together
// each item: k = a KITCHEN key, at = cm from the start of the run (lower and wall rows share the same start),
// p = overrides. tier = the finish set (eco · std · lux) so the whole set matches.
export const SMART = {
  s_line300: { label: "مطبخ مستقيم 300 متكامل", desc: "أدراج متقسمة · حوض 80 · ترولي زيت · بوتجاز 90 · وعلوي بليد ومصفاة وشفاط.", tier: "std", items: [
    { k: "k_cutlery60", at: 0 }, { k: "k_sink", at: 60 }, { k: "k_oil20", at: 140 }, { k: "k_hob90", at: 160 }, { k: "k_base2", at: 250, p: { width: 50 } },
    { k: "k_wall_led", at: 0, p: { width: 60 } }, { k: "k_plates80", at: 60 }, { k: "k_wall_open60", at: 140, p: { width: 20 } }, { k: "k_wall_hood90", at: 160 }, { k: "k_wall1_40", at: 250, p: { width: 50 } },
  ] },
  s_line240: { label: "مطبخ اقتصادي 240", desc: "4 وحدات تحت و4 فوق — أقل تكلفة لمطبخ كامل.", tier: "eco", items: [
    { k: "k_base_drawers", at: 0 }, { k: "k_sink", at: 60 }, { k: "k_hob90", at: 140, p: { width: 60 } }, { k: "k_base1_45", at: 200, p: { width: 40 } },
    { k: "k_wall2", at: 0, p: { width: 60 } }, { k: "k_plates80", at: 60 }, { k: "k_wall_hood90", at: 140, p: { width: 60 } }, { k: "k_wall1_40", at: 200 },
  ] },
  s_lux360: { label: "مطبخ فاخر 360 بعمود فرن", desc: "تموين كارجو · أدراج · حوض دبل · زيت · بوتجاز 90 · عمود فرن — وعلوي زجاج وليد.", tier: "lux", items: [
    { k: "k_cargo40", at: 0 }, { k: "k_cutlery60", at: 40 }, { k: "k_sink100", at: 100 }, { k: "k_oil20", at: 200 }, { k: "k_hob90", at: 220 }, { k: "k_oven_only", at: 310, p: { width: 60 } },
    { k: "k_wall_glass_wood", at: 40, p: { width: 60, include_led_marker: true } }, { k: "k_plates80", at: 100, p: { width: 100 } }, { k: "k_wall_open60", at: 200, p: { width: 20, include_led_marker: true } }, { k: "k_wall_hood90", at: 220 },
  ] },
  s_hob150: { label: "منطقة بوتجاز ذكية 150", desc: "ترولي زيت 20 · بوتجاز 90 بأدراج حلل · أدراج توابل 40 · وشفاط وعلوية.", tier: "std", items: [
    { k: "k_oil20", at: 0 }, { k: "k_hob90", at: 20 }, { k: "k_spices40", at: 110 },
    { k: "k_wall_hood90", at: 20 }, { k: "k_wall1_40", at: 110 },
  ] },
  s_sink170: { label: "منطقة حوض ذكية 170", desc: "حوض 80 · سلة زبالة سحب 60 · صواني 30 — ومصفاة أطباق فوق الحوض.", tier: "std", items: [
    { k: "k_sink", at: 0 }, { k: "k_bin60", at: 80 }, { k: "k_base_tray30", at: 140 },
    { k: "k_plates80", at: 0 }, { k: "k_wall_led", at: 80, p: { width: 90 } },
  ] },
  s_coffee120: { label: "ركن قهوة 120 بليد", desc: "أدراج شاي وقهوة متقسمة · درج وضلفتين · رفوف مفتوحة بليد بين ضلفتين زجاج.", tier: "lux", items: [
    { k: "k_spices40", at: 0 }, { k: "k_drawer_doors", at: 40 },
    { k: "k_wall_glass1", at: 0 }, { k: "k_wall_open60", at: 40, p: { width: 40, include_led_marker: true } }, { k: "k_wall_glass1", at: 80 },
  ] },
  s_tall_wall: { label: "حيطة أجهزة: تلاجة + فرن + تموين", desc: "تجويف تلاجة · عمود فرن وميكروويف · تموين 60 · كارجو 30 — كلهم 220.", tier: "std", items: [
    { k: "k_fridge", at: 0, p: { width: 70 } }, { k: "k_oven", at: 70, p: { width: 60 } }, { k: "k_pantry60", at: 130 }, { k: "k_cargo30", at: 190 },
  ] },
  s_oven_micro: { label: "عمودين فرن وميكروويف + كارجو", desc: "عمود فرن · عمود ميكروويف وتخزين · ترولي طويل 40.", tier: "std", items: [
    { k: "k_oven_only", at: 0, p: { width: 60 } }, { k: "k_micro_tall", at: 60 }, { k: "k_cargo40", at: 120 },
  ] },
  s_laundry: { label: "ركن غسالة ومكانس 140", desc: "وحدة غسالة · دولاب مكانس 40 · تموين 40.", tier: "eco", items: [
    { k: "k_washer", at: 0, p: { width: 60 } }, { k: "k_broom40", at: 60 }, { k: "k_pantry40", at: 100 },
  ] },
  s_bedroom: { label: "حيطة نوم 290: دولاب + ضلفة", desc: "دولاب 3 أعمدة 240 وضلفة 50 جنبه.", tier: "std", items: [
    { k: "k_wr_3col240", at: 0 }, { k: "k_wr_single50", at: 240, p: { height: 250, depth: 60 } },
  ] },
};
