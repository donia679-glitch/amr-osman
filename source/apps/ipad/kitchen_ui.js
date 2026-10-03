// Kitchen units in the app: starters, option tables (labels from the plugin's design dialog),
// which fields each category shows, and the material roles.
import { TYPES as HANDLE_TYPES } from "./engine/handles/catalog.js";

export const K_CATS = {
  standard: "عادية (ضلف/أدراج)", oven: "وحدة فرن", microwave: "وحدة ميكروويف", open_shelf: "مفتوحة (رفوف)",
  divided: "مقسّمة (فاصل رأسي)", corner: "وحدة زاوية", corner_glass_display: "فاترينة زاوية زجاج",
  wardrobe: "دولاب دريسنج (مطبخ)", bedroom_wardrobe: "دولاب غرفة نوم", washing_machine: "وحدة غسالة", fridge: "تجويف ثلاجة",
};
export const K_TYPES = { base: "سفلية", wall: "حائط", tall: "دولاب طويل" };
export const K_DOORS = {
  single: "ضلفة واحدة", double: "ضلفتين", drawer_top_two_doors_bottom: "درج + ضلفتين", drawers: "أدراج",
  flip_up: "قلاب", flip_up_double: "قلاب ضلفتين", single_glass: "زجاج (إطار خشب)", double_glass: "ضلفتين زجاج (خشب)",
  single_glass_metal: "زجاج فريم معدن", double_glass_metal: "ضلفتين زجاج معدن", sliding: "سحّاب (جرّار)", none: "مفتوحة",
};
export const K_ZONE_DOORS = { single: "ضلفة واحدة", double: "ضلفتين", drawers: "أدراج", flip_up: "قلاب", none: "بدون" };
export const K_POS = { inset: "داخلية", overlay: "خارجية" };
export const K_CORNER = { blind: "عمياء", diagonal: "قطرية 45°", l_shape: "حرف L", open: "مفتوحة" };
export const K_HINGE = { left: "شمال", right: "يمين" };
export const K_ALIGN = { left: "شمال", center: "نص", right: "يمين" };
export const K_KICK = { segments: "قطع منفصلة", apron: "وزرة قطعة واحدة" };
export const K_FINISH = { wood: "خشبي", glossy: "لامع", matte: "مط", solid: "لون سادة" };
export const K_OPENING = { hinges: "مفصلات عادية", lift_arm: "أذرع رفع (قلاب)", touch_open: "تاتش (فتح باللمس)", none: "ثابتة" };
export const K_SIDE_GLASS = { none: "بدون — الجنبين صلب", left: "الجنب الشمال زجاج", right: "الجنب اليمين زجاج" };
export const K_INSERT = { none: "فاضي", dividers: "فواصل مستقيمة", cutlery: "تقسيمة أدوات", custom: "تقسيمة حرة" };
export const K_COLS = { 1: "عمود واحد", 2: "عمودين", 3: "3 أعمدة" };
export const K_TOP = { solid: "رأس كامل", rails: "شريطين (أمامي وخلفي)" };
export const K_SHELF_MODE = { continuous: "رف L متصل", alternating: "أرفف متبادلة" };
export const K_ZONE_TYPES = {
  shelves_double: "أرفف + ضلفتين", shelves_single: "أرفف + ضلفة", shelves_open: "أرفف مفتوحة",
  rail_double: "شماعة + ضلفتين", rail_single: "شماعة + ضلفة", rail_open: "شماعة مفتوحة", drawers: "أدراج",
};
export const K_HANDLES = Object.fromEntries(Object.entries(HANDLE_TYPES).map(([k, v]) => [k, v.label]));

/** material roles shown in the properties panel → [label, plugin param holding its name] */
export const K_MATS = {
  carcass: ["الهيكل (أجناب/قاعدة/رأس/أرفف)", "material_carcass_name"],
  front: ["الضلف ووش الأدراج", "material_front_name"],
  back: ["الظهر", "material_back_name"],
  countertop: ["الكونتر", "material_countertop_name"],
  glass: ["الزجاج", "material_glass_name"],
  frame: ["برواز الضلف المعدن", "material_metal_frame_name"],
};
export const K_DEFAULT_COLORS = {
  carcass: "#ded8cc", front: "#e2ded6", back: "#ebe5d8", countertop: "#5a5a5f", glass: "#d8eef0", frame: "#9a9da0",
  rail: "#bebec3", handle: "#46484c", led: "#ffd27a", groove: "#4682af", hole: "#e0402a", banding: "#d0c8b8",
};
export const K_DEFAULT_NAMES = {
  carcass: "خامة الهيكل", front: "خامة الضلف", back: "خامة الظهر", countertop: "الكونتر", glass: "زجاج", frame: "برواز ألومنيوم",
};

/** the size fields of each category: [param, label] (first three drive the width/height/depth chips) */
export function dimsFor(p) {
  const cat = p.unit_category;
  if (cat === "corner") {
    if (p.corner_style === "diagonal") return [["corner_leg1", "الضلع الأول"], ["height", "الارتفاع"], ["corner_leg2", "الضلع التاني"], ["corner_diagonal_cut", "عرض القطع القطري"]];
    if (p.corner_style === "l_shape" || p.corner_style === "open") return [["corner_leg1_length", "الرجل الأولى"], ["height", "الارتفاع"], ["corner_leg2_length", "الرجل التانية"], ...(p.corner_style === "l_shape" ? [["corner_depth", "عمق الرجل"]] : [])];
    return [["corner_total_width", "العرض الكلي"], ["height", "الارتفاع"], ["depth", "العمق"], ["corner_door_width", "عرض الضلفة"]];
  }
  if (cat === "corner_glass_display") return [["corner_leg1_length", "الرجل الأولى"], ["height", "الارتفاع"], ["corner_leg2_length", "الرجل التانية"], ["corner_depth", "العمق"]];
  if (cat === "fridge") return [["fridge_cavity_width", "عرض الثلاجة"], ["height", "الارتفاع"], ["depth", "العمق"], ["fridge_cavity_height", "ارتفاع الثلاجة"]];
  return [["width", "العرض"], ["height", "الارتفاع"], ["depth", "العمق"]];
}

const APPLIANCE_ZONES = [["bottom_zone_height", "ارتفاع الحيز السفلي (0 = تلقائي)", "num"], ["bottom_vent_panel_height", "قطعة تهوية فوقه (0 = بدون)", "num"],
  ["below_zone_shelf_count", "أرفف في الحيز السفلي", "int"], ["above_zone_shelf_count", "أرفف في الجزء العلوي", "int"]];

/** category-specific settings: [param, label, type, choices?] */
export function extraFields(p) {
  const cat = p.unit_category;
  const f = [];
  if (cat === "oven") {
    f.push(["oven_cavity_height", "ارتفاع الفرن", "num"], ["oven_cavity_bottom_offset", "ارتفاع جلسة الفرن", "num"],
      ["oven_bottom_front_type", "اللي تحت الفرن", "choice", { "": "زي الضلف العامة", ...K_ZONE_DOORS }],
      ["include_microwave", "ميكروويف فوق الفرن", "bool"]);
    if (p.include_microwave) f.push(["microwave_cavity_height", "ارتفاع الميكروويف", "num"], ["microwave_cavity_bottom_offset", "ارتفاع جلسة الميكروويف", "num"], ["microwave_cavity_width", "عرض الميكروويف", "num"], ["microwave_h_align", "مكان الميكروويف", "choice", K_ALIGN]);
    f.push(["include_appliance_frame_shelves", "رف جلسة وسقف للأجهزة", "bool"], ...APPLIANCE_ZONES);
  } else if (cat === "microwave") {
    f.push(["microwave_cavity_height", "ارتفاع الميكروويف", "num"], ["microwave_cavity_bottom_offset", "ارتفاع الجلسة", "num"], ["microwave_cavity_width", "عرض الميكروويف", "num"], ["microwave_h_align", "مكان الميكروويف", "choice", K_ALIGN], ["include_appliance_frame_shelves", "رف جلسة وسقف", "bool"], ...APPLIANCE_ZONES);
  } else if (cat === "washing_machine") {
    f.push(["washer_cavity_width", "عرض الغسالة", "num"], ["washer_cavity_height", "ارتفاع الغسالة", "num"], ["washer_h_align", "مكان الغسالة", "choice", K_ALIGN], ["include_appliance_frame_shelves", "رف فوق الغسالة", "bool"], ["above_zone_shelf_count", "أرفف في الجزء العلوي", "int"]);
  } else if (cat === "fridge") {
    f.push(["fridge_include_left_side", "جنب طويل شمال", "bool"], ["fridge_include_right_side", "جنب طويل يمين", "bool"]);
  } else if (cat === "divided") {
    f.push(["divider_position_pct", "مكان الفاصل (%)", "num"], ["left_door_type", "الناحية الشمال", "choice", K_ZONE_DOORS], ["right_door_type", "الناحية اليمين", "choice", K_ZONE_DOORS]);
  } else if (cat === "corner") {
    f.push(["corner_style", "نوع الزاوية", "choice", K_CORNER]);
    if (p.corner_style === "l_shape") f.push(["corner_angle", "الزاوية بين الرجلين", "num"], ["corner_notch_size", "قصة الركن (عمود)", "num"], ["corner_shelf_mode", "الأرفف", "choice", K_SHELF_MODE]);
    if (p.corner_style === "blind" || !p.corner_style) f.push(["corner_door_side", "مكان الضلفة", "choice", K_HINGE], ["include_edge_filler", "فيلر بين الضلفة والأعمى", "bool"]);
  } else if (cat === "wardrobe" || cat === "bedroom_wardrobe") {
    f.push(["door_style", "نوع الأبواب", "choice", { hinged: "مفصلات", sliding: "سحّاب (جرّار)" }]);
    if (p.door_style === "sliding") f.push(["sliding_panel_count", "عدد ألواح السحّاب (2–4)", "int"]);
    f.push(["wardrobe_column_count", "عدد الأعمدة", "choice", K_COLS]);
    const cols = Math.max(1, Math.min(3, +p.wardrobe_column_count || 1));
    for (let c = 1; c <= cols; c++) {
      const pre = c === 1 ? "" : `col${c}_`;
      const tag = cols > 1 ? `عمود ${c} · ` : "";
      f.push([`wardrobe_${pre}zone_count`, `${tag}عدد المناطق`, "int"]);
      const n = Math.max(1, Math.min(3, +p[`wardrobe_${pre}zone_count`] || 1));
      for (let i = 1; i <= n; i++) {
        f.push([`wardrobe_${pre}zone${i}_type`, `${tag}منطقة ${i}`, "choice", K_ZONE_TYPES]);
        if (i < n) f.push([`wardrobe_${pre}zone${i}_height`, `${tag}ارتفاع منطقة ${i}`, "num"]);
        f.push([`wardrobe_${pre}zone${i}_count`, `${tag}عدد الأرفف/الشماعات ${i}`, "int"]);
        f.push([`wardrobe_${pre}zone${i}_positions`, `${tag}أماكن مخصصة ${i} (سم، بفاصلة)`, "text"]);
      }
    }
    f.push(["wardrobe_rail_diameter", "قطر الشماعة", "num"], ["wardrobe_rail_depth_offset", "بعد الشماعة عن الظهر", "num"]);
  }
  if (p.door_type === "sliding" && p.door_style !== "sliding" && !f.some((x) => x[0] === "sliding_panel_count")) f.push(["sliding_panel_count", "عدد ألواح السحّاب (2–4)", "int"]);
  return f;
}

const B = (o) => ({ ...o });
export const KITCHEN = {
  k_base2: { label: "سفلية ضلفتين 60", desc: "60×72 سم، رفين، سكلو وكونتر.", params: B({ shelf_count: 2 }) },
  k_base_drawers: { label: "سفلية 3 أدراج", desc: "أدراج بصناديق ومجاري، 60 سم.", params: B({ door_type: "drawers", drawer_count: 3, include_drawer_boxes: true, include_shelves: false }) },
  k_base_kick_drawer: { label: "سفلية ضلفتين + درج وزرة", desc: "60 سم، درج واطي مكان السكلو (سكلو 12 سم).", params: B({ shelf_count: 1, toe_kick_height: 12, toe_kick_drawer: true, include_drawer_boxes: true }) },
  k_drawer_doors: { label: "درج + ضلفتين 80", desc: "درج علوي وضلفتين تحت.", params: B({ width: 80, door_type: "drawer_top_two_doors_bottom", drawer_count: 1, shelf_count: 1 }) },
  k_sink: { label: "وحدة حوض 80", desc: "فتحة حوض في الكونتر وفتحة سيفون في القاعدة.", params: B({ width: 80, include_sink_cutout: true, include_ptrap_opening: true, include_shelves: false }) },
  k_wall2: { label: "علوية ضلفتين 80", desc: "حائط 70 سم، عمق 32، رفين.", params: B({ unit_type: "wall", width: 80, height: 70, depth: 32, include_toe_kick: false, shelf_count: 2 }) },
  k_wall_flip: { label: "علوية قلاب 60", desc: "ضلفة بتفتح لفوق، 40 سم.", params: B({ unit_type: "wall", width: 60, height: 40, depth: 32, include_toe_kick: false, door_type: "flip_up", include_shelves: false }) },
  k_wall_glass: { label: "علوية زجاج بفريم معدن", desc: "ضلفتين زجاج شفاف بفريم ألومنيوم.", params: B({ unit_type: "wall", width: 80, height: 70, depth: 32, include_toe_kick: false, door_type: "double_glass_metal", shelf_count: 2 }) },
  k_oven: { label: "دولاب فرن + ميكروويف", desc: "طويل 220 سم: أدراج، فرن، ميكروويف، ضلف فوق.", params: B({ unit_category: "oven", unit_type: "tall", height: 220, include_microwave: true, oven_bottom_front_type: "drawers", drawer_count: 2, oven_cavity_bottom_offset: 52, microwave_cavity_bottom_offset: 116 }) },
  k_fridge: { label: "تجويف ثلاجة", desc: "جنبين طوال حوالين الثلاجة ووحدة فوقها.", params: B({ unit_category: "fridge", unit_type: "tall", height: 220, depth: 60 }) },
  k_washer: { label: "وحدة غسالة", desc: "تجويف غسالة بفيلرات ووحدة فوقها.", params: B({ unit_category: "washing_machine", unit_type: "tall", height: 200 }) },
  k_bedroom_wr: { label: "دولاب غرفة نوم 120", desc: "طويل 220 سم، شماعة فوق وأرفف تحت، ضلفتين.", params: B({ unit_category: "bedroom_wardrobe", unit_type: "tall", width: 120, height: 220, depth: 60, wardrobe_zone_count: 2, wardrobe_zone1_type: "shelves_double", wardrobe_zone1_height: 90, wardrobe_zone1_count: 2, wardrobe_zone2_type: "rail_double" }) },
  k_bedroom_slide: { label: "دولاب نوم سحّاب 180", desc: "3 ألواح سحّاب، شماعة وأرفف.", params: B({ unit_category: "bedroom_wardrobe", unit_type: "tall", width: 180, height: 240, depth: 62, door_style: "sliding", sliding_panel_count: 3, wardrobe_zone_count: 2, wardrobe_zone1_type: "shelves_open", wardrobe_zone1_height: 100, wardrobe_zone1_count: 3, wardrobe_zone2_type: "rail_open" }) },
  k_corner_l: { label: "زاوية L 90×90", desc: "رجلين وضلفتين، رف L متصل.", params: B({ unit_category: "corner", corner_style: "l_shape" }) },
  k_corner_diag: { label: "زاوية قطرية 90×90", desc: "ضلفة قطرية 45°.", params: B({ unit_category: "corner", corner_style: "diagonal" }) },
  k_corner_blind: { label: "زاوية عمياء 100", desc: "ضلفة 45 والباقي لوح أعمى.", params: B({ unit_category: "corner", corner_style: "blind", corner_total_width: 100 }) },
  k_open: { label: "رفوف مفتوحة 40", desc: "وحدة حائط مفتوحة.", params: B({ unit_category: "open_shelf", unit_type: "wall", width: 40, height: 70, depth: 32, include_toe_kick: false, shelf_count: 2 }) },
  k_glass_corner: { label: "فاترينة زاوية زجاج", desc: "جنبين وضلفتين زجاج بفريم.", params: B({ unit_category: "corner_glass_display", unit_type: "wall", height: 70, corner_depth: 32, corner_leg1_length: 70, corner_leg2_length: 70, include_toe_kick: false }) },
};
