// v127 library additions — area: engine. Presets that show the new kitchen-engine features (engine/kitchen/fluted.js,
// the flap zone of StandardUnitBuilder, undermount runners on the pull-out). Plain data only (engine params).
// h = { W, T, ACC, DC, M, P, FREE, b } (see library.js). English for every new Arabic string: lib127/engine.en.json.
const G = "مطابخ — فلوتد · قلاب · بول أوت ضيق";
// fluted MDF is painted after the CNC (matte lacquer) — the colours below are the paint
const SAGE = { door_color: "#A7AD95", door_finish: "matte" };
const GREIGE = { door_color: "#CBBFAE", door_finish: "matte" };
const GREEN = { door_color: "#3E4D43", door_finish: "matte" };
const CREAM = { door_color: "#ECE6DA", door_finish: "matte" };
const FL = { front_style: "fluted", front_flute_dir: "v", front_flute_groove: 1.0, front_flute_rib: 1.5, front_flute_depth: 0.4, front_flute_margin: 0, front_flute_on: "all" };
const WALL = { unit_type: "wall", height: 80, depth: 35, wall_mount_height: 145, include_toe_kick: false };
const TALL = { unit_type: "tall", height: 225, depth: 58 };

export default () => ({
  KITCHEN: {
    e7_fl_drawers60: { label: "3 أدراج فلوتد 60", desc: "وشوش MDF بمجاري رأسية 10 مم كل 2.5 سم (CNC) بتكمل من درج لدرج، جولا بين الأدراج، دهان مط سيج.", group: G,
      params: { width: 60, door_type: "drawers", drawer_count: 3, include_drawer_boxes: true, include_shelves: false, ...FL, ...SAGE } },
    e7_fl_doors80: { label: "سفلية ضلفتين فلوتد 80", desc: "ضلفتين 40 فلوتد رأسي من حرف لحرف، رف، جولا L تحت الكونتر.", group: G,
      params: { width: 80, door_type: "double", shelf_count: 1, ...FL, ...GREIGE } },
    e7_fl_h_drawers90: { label: "درجين حلل 90 فلوتد أفقي", desc: "تحت البوتجاز 90: درجين عميقين بمجاري أفقية موقوفة 4 سم من الأطراف (برواز سادة حواليها).", group: G,
      params: { width: 90, door_type: "drawers", drawer_count: 2, include_drawer_boxes: true, include_shelves: false, ...FL, front_flute_dir: "h", front_flute_margin: 4, front_flute_rib: 2.0, ...CREAM } },
    e7_fl_wall80: { label: "علوية فلوتد 80", desc: "علوية 80×80×35 على 145: ضلفتين فلوتد رأسي نازلين 2 سم تحت الوحدة بدل المقبض.", group: G,
      params: { ...WALL, width: 80, door_type: "double", shelf_count: 1, ...FL, ...SAGE } },
    e7_fl_tall_pantry60: { label: "تموين طويل 60 فلوتد ببرواز", desc: "دولاب 225 بضلفتين: مجاري رأسية جوه برواز سادة 5 سم (CNC مجاري موقوفة)، 5 أرفف، مقبض حرف.", group: G,
      params: { ...TALL, width: 60, door_type: "double", shelf_count: 5, ...FL, front_flute_margin: 5, kud_handles: { type: "edge_pull" }, ...GREEN } },
    e7_flap_tall60: { label: "تموين طويل 60 بقلاب فوق", desc: "قلاب Aventos HK فوق (جزء 38 سم على رف ثابت) وضلفتين تحته بأرفف — الحاجات الخفيفة فوق في متناول الإيد.", group: G,
      params: { ...TALL, width: 60, door_type: "double", shelf_count: 4, flap_zone: "top", flap_zone_height: 38, flap_lift: "aventos_hk", kud_handles: { type: "edge_pull" }, ...GREIGE } },
    e7_flap_wall_niche90: { label: "علوية 90: نيش مفتوح بليد + قلاب", desc: "تحت: نيش مفتوح 30 سم بمجرى ليد في الجنبين للبن والتوابل · فوق: قلاب Aventos HL بيطلع لفوق موازي (من غير مفصلات).", group: G,
      params: { ...WALL, width: 90, door_type: "none", include_shelves: false, include_led_marker: true, flap_zone: "top", flap_zone_height: 44, flap_lift: "aventos_hl", ...CREAM } },
    e7_flap_base_drawers90: { label: "سفلية 90: درجين + قلاب فوق", desc: "قلاب واطي 28 سم على رف ثابت تحت الكونتر (للصواني والألواح) ودرجين حلل تحته، جولا L وC.", group: G,
      params: { width: 90, door_type: "drawers", drawer_count: 2, include_drawer_boxes: true, include_shelves: false, flap_zone: "top", flap_zone_height: 28, flap_lift: "aventos_hk", ...SAGE } },
    e7_po15: { label: "بول أوت 15 على مجرى سفلي", desc: "بول أوت بهارات 15 سم: قاعدة لوح كامل على مجرى سفلي مخفي (خلوص 6 مم كل جنب) والضهر الرأسي واقف عليها، 3 صواني بحافة.", group: G,
      params: { unit_category: "pullout", width: 15, include_shelves: false, include_drawer_boxes: true, pullout_tray_count: 3, pullout_tray_lip: 8, pullout_runner: "bottom", ...GREIGE } },
    e7_po15_fl: { label: "بول أوت زيوت 15 فلوتد", desc: "نفس البول أوت الضيق 15 على مجرى سفلي — صينيتين بحافة 12 للزجاجات، والوش فلوتد.", group: G,
      params: { unit_category: "pullout", width: 15, include_shelves: false, include_drawer_boxes: true, pullout_tray_count: 2, pullout_tray_lip: 12, pullout_runner: "bottom", ...FL, ...SAGE } },
  },
  SMART: {
    e7_s_fluted235: { label: "مطبخ فلوتد 235 بقلاب فوق الحوض", desc: "أدراج فلوتد 60 · بول أوت زيوت 15 · حوض 80 فلوتد · ضلفتين 80 — وفوق: علويتين فلوتد ونيش ليد بقلاب فوق الحوض. كله سيج مط.", items: [
      { k: "e7_fl_drawers60", at: 0 }, { k: "e7_po15_fl", at: 60 }, { k: "k_sink", at: 75, p: { ...FL, ...SAGE } }, { k: "e7_fl_doors80", at: 155, p: { ...SAGE } },
      { k: "e7_fl_wall80", at: 0, p: { width: 75 } }, { k: "e7_flap_wall_niche90", at: 75, p: { width: 80, ...SAGE } }, { k: "e7_fl_wall80", at: 155 },
    ] },
  },
});
