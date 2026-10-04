// @ts-nocheck — restored from the compiled app build (types to be re-added)
// Port of lib/dressing_system/schema.rb — every dressing parameter, its defaults, the allowed
// choices and strict normalization (explicit Arabic errors, no silent coercion). Units: cm.
import { deepDup, has, isHash, rArray, rs, fmt as coreFmt } from "../core/ruby.js";
import { rround } from "../core/rubyMath.js";
import * as Handles from "../handles/catalog.js";
export const SCHEMA_VERSION = 1;
export const CONSTRUCTIONS = {
    sides_outer: "الأجناب من بره — القاعدة والرأس بينهم",
    top_bottom_outer: "القاعدة والرأس من بره — الأجناب بينهم",
};
export const CONTENTS = {
    empty: "فاضي",
    shelves: "أرفف",
    rail: "شماعة",
    drawers: "وحدة أدراج",
    dividers: "قواطيع رأسية (+ أرفف اختياري)",
};
export const LED_MODES = {
    none: "من غير ليد",
    top: "من فوق (تحت سقف الفراغ)",
    sides: "جوانب رأسية (على الجنبين)",
    shelves: "تحت كل رف",
    top_sides: "فوق + جوانب",
};
export const LED_INSTALLS = {
    recessed: "مجرى محفور في الخشب (بروفايل غاطس)",
    surface: "بروفايل سطحي (من غير حفر)",
};
export const LED_SENSORS = {
    door: "حساس فتح الضلفة (لكل فراغ)",
    motion: "حساس حركة (لكل فراغ)",
    switch: "مفتاح واحد للوحدة",
    none: "من غير حساس/مفتاح",
};
export const PLINTH_STYLES = {
    legs: "رجول بلاستيك + وزرة قدام (بتتركب في الآخر)",
    frame: "برواز خشب (وزرة قدام + ورا + جوانب + عوارض)",
};
export const PLINTH_SIDES = {
    none: "من غير (الجنبين لازقين في حيطة/وحدة)",
    left: "الجنب الشمال ظاهر",
    right: "الجنب اليمين ظاهر",
    both: "الجنبين ظاهرين",
};
export const DOORS = {
    none: "من غير ضلفة",
    continue: "نفس ضلفة الفراغ اللي تحته (تكملة)",
    single_left: "ضلفة واحدة — مفصلة شمال",
    single_right: "ضلفة واحدة — مفصلة يمين",
    double: "ضلفتين",
    flip_up: "ضلفة قلاب (مفصلة فوق)",
};
export const DOOR_STYLES = {
    wood: "خشب — لوح واحد",
    shaker: "خشب — فريم + حشوة خشب",
    glass_wood: "زجاج بفريم خشب",
    glass_alu: "زجاج بفريم ألومنيوم",
    mirror_alu: "مراية بفريم ألومنيوم",
    panel_alu: "حشوة (خشب/HPL) بفريم ألومنيوم",
};
/** frame: null = single slab; insert = material key of the panel inside the frame */
export const DOOR_STYLE_SPECS = {
    wood: { frame: null, insert: null },
    shaker: { frame: "wood", insert: "door_panel" },
    glass_wood: { frame: "wood", insert: "glass" },
    glass_alu: { frame: "alu", insert: "glass" },
    mirror_alu: { frame: "alu", insert: "mirror" },
    panel_alu: { frame: "alu", insert: "door_panel" },
};
export const DOOR_LAYOUTS = {
    per_section: "ضلف لكل قسم (من الفراغات)",
    whole: "ضلف على الواجهة كلها (مستقلة عن الأقسام)",
    sliding: "ضلف سحّاب (جرّار) على الواجهة كلها",
};
export const ROW_TYPES = {
    doors: "ضلف",
    none: "من غير ضلف (مفتوح)",
};
export const LEAF_HINGES = {
    left: "مفصلة شمال",
    right: "مفصلة يمين",
    top: "قلاب (فوق)",
};
export const MAX_ROWS = 6;
export const MAX_LEAVES = 8;
export function autoHinges(n) {
    if (n === 1)
        return ["left"];
    const a = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? "left" : "right"));
    a[a.length - 1] = "right";
    return a;
}
export const DEFAULT_ROW = {
    height: "auto", type: "doors", leaves: 2, hinges: ["left", "right"], style: "default",
};
export const HANDLE_TYPES = Object.fromEntries(Object.entries(Handles.TYPES).map(([k, v]) => [k, v.label]));
export const DOOR_MODES = {
    overlay: "ضلف راكبة على الهيكل (Overlay)",
    inset: "ضلف جوه الهيكل (Inset)",
};
export const MATERIAL_KEYS = {
    carcass: { label: "الهيكل (أجناب/قاعدة/رأس)", fallback: null, rgb: [222, 184, 135] },
    divider: { label: "القواطيع الرأسية", fallback: "carcass", rgb: [222, 184, 135] },
    fixed_shelf: { label: "الأرفف الثابتة", fallback: "carcass", rgb: [222, 184, 135] },
    shelf: { label: "الأرفف المتحركة", fallback: "carcass", rgb: [222, 184, 135] },
    back: { label: "الظهر", fallback: null, rgb: [235, 220, 195] },
    door: { label: "الضلف (الخشب)", fallback: null, rgb: [240, 238, 232] },
    door_frame_wood: { label: "فريم الضلف الخشب", fallback: "door", rgb: [240, 238, 232] },
    door_frame_alu: { label: "فريم الضلف الألومنيوم", fallback: null, rgb: [145, 148, 150] },
    door_panel: { label: "حشوة الضلف", fallback: "door", rgb: [235, 232, 224] },
    glass: { label: "زجاج الضلف", fallback: null, rgb: [200, 225, 230] },
    mirror: { label: "مراية الضلف", fallback: null, rgb: [214, 226, 232] },
    drawer_front: { label: "وش الأدراج", fallback: "door", rgb: [240, 238, 232] },
    drawer_box: { label: "صندوق الدرج (جوانب/أمامي/خلفي)", fallback: "carcass", rgb: [222, 184, 135] },
    drawer_bottom: { label: "قاعدة الدرج", fallback: "back", rgb: [235, 220, 195] },
    rail: { label: "الشماعة", fallback: null, rgb: [190, 190, 195] },
    handle: { label: "المقابض", fallback: null, rgb: [70, 72, 76] },
    handle_profile: { label: "بروفايل المقابض / الجولا", fallback: null, rgb: [188, 192, 198] },
    handle_wood: { label: "مقبض خشب بلت إن", fallback: "door", rgb: [196, 160, 112] },
    banding: { label: "شريط الحواف", fallback: null, rgb: [224, 64, 42] },
    plinth: { label: "السكلو (الوزرة/البرواز)", fallback: "carcass", rgb: [222, 184, 135] },
    plinth_leg: { label: "رجول السكلو", fallback: null, rgb: [60, 62, 66] },
};
export const MATERIAL_DEFAULT_NAMES = {
    rail: "شماعة معدن",
    handle: "مقبض",
    handle_profile: "بروفايل ألومنيوم",
    door_frame_alu: "برواز ألومنيوم",
    glass: "زجاج",
    mirror: "مرايا",
    banding: "شريط حواف",
    plinth_leg: "رجل بلاستيك",
};
export const DEFAULT_COMPARTMENT = {
    height: "auto",
    content: "empty",
    shelf_count: 2,
    drawer_count: 3,
    divider_count: 1,
    sub_shelf_count: 0,
    door: "none",
    door_style: "default",
    drawer_front: true,
    drawer_glass: false,
    led: "none",
};
export const DEFAULTS = {
    schema_version: SCHEMA_VERSION,
    label: "",
    width: 120.0,
    height: 240.0,
    depth: 55.0,
    panel_t: 1.8,
    construction: "sides_outer",
    divider_t: 1.8,
    fixed_shelf_t: 1.8,
    back: { thickness: 0.6, groove_depth: 0.8, rear_offset: 1.8 },
    doors: {
        mode: "overlay",
        thickness: 1.8,
        gap: 0.3,
        edge_gap: 0.15,
        hinge_edge: 10.0,
        hinge_count: "auto",
        style: "wood",
        wood_frame_width: 7.0,
        alu_frame_width: 2.0,
        insert_engage: 0.6,
        glass_t: 0.4,
        mirror_t: 0.4,
        panel_t: 0.8,
        layout: "per_section",
        plate_setback: 3.7,
        plate_hole_spacing: 3.2,
        plate_hole_d: 0.5,
        rows: [{ ...DEFAULT_ROW, hinges: ["left", "right"] }],
    },
    drawers: {
        gap: 0.3,
        slide_clearance: 1.3,
        box_t: 1.2,
        bottom_t: 0.6,
        bottom_groove: 0.6,
        bottom_inset: 1.0,
        box_bottom_gap: 1.5,
        box_top_gap: 2.5,
        box_depth: "auto",
        internal_setback: 2.0,
        internal_side_clearance: 0.0,
        hinge_fix: true,
        hinge_spacer_t: 1.8,
        hinge_zone_depth: 6.0,
        hinge_front_gap: 0.3,
        slide_lengths: [25, 30, 35, 40, 45, 50, 55, 60],
    },
    shelves: { front_setback: 1.0, side_gap: 0.1, pin_d: 0.5, pin_setback: 3.7 },
    handles: { ...Handles.DEFAULTS, type: "bar", door_height: 100.0 },
    led: {
        offset: 3.0, width: 1.2, depth: 0.8, install: "recessed", watt_per_m: 9.6, sensor: "door", wire_hole_d: 0.8,
    },
    plinth: {
        enabled: false, height: 10.0, style: "legs", setback: 3.0, apron_t: 1.8, side_apron: "none",
        leg_spacing: 60.0, leg_inset: 5.0,
    },
    rail: { diameter: 2.5, top_offset: 6.0 },
    edge_banding: true,
    assembly: {
        enabled: true, hole_d: 0.8, edge_distance: 1.0, spacing: 2.8, face_depth: 0.8, edge_depth: 3.2, cam_d: 1.5,
        cam_depth: 1.4,
    },
    materials: Object.fromEntries(Object.keys(MATERIAL_KEYS).map((k) => [k, { name: "", skm: "" }])),
    sections: [
        {
            width: "auto",
            compartments: [
                { ...DEFAULT_COMPARTMENT, height: 40.0, content: "drawers", drawer_count: 2, door: "none" },
                { ...DEFAULT_COMPARTMENT, height: "auto", content: "rail", door: "single_left" },
            ],
        },
        {
            width: "auto",
            compartments: [
                { ...DEFAULT_COMPARTMENT, height: "auto", content: "shelves", shelf_count: 4, door: "single_right" },
            ],
        },
    ],
};
/** [path, Arabic name, min, max (null = no upper bound)] */
export const NUMERIC_RULES = [
    [["width"], "العرض الكلي", 20.0, 600.0],
    [["height"], "الارتفاع الكلي", 20.0, 300.0],
    [["depth"], "العمق الكلي", 20.0, 120.0],
    [["panel_t"], "سمك الخشب", 0.5, 10.0],
    [["divider_t"], "سمك القواطيع", 0.5, 10.0],
    [["fixed_shelf_t"], "سمك الأرفف الثابتة", 0.5, 10.0],
    [["back", "thickness"], "سمك الظهر", 0.2, 3.0],
    [["back", "groove_depth"], "عمق مفحار الظهر", 0.0, null],
    [["back", "rear_offset"], "بعد الظهر عن الورا", 0.0, null],
    [["doors", "thickness"], "سمك الضلف", 0.5, 10.0],
    [["doors", "gap"], "الفاصل بين الضلف", 0.0, null],
    [["doors", "edge_gap"], "خلوص حافة الضلف", 0.0, null],
    [["doors", "hinge_edge"], "بعد المفصلة عن الطرف", 1.0, null],
    [["doors", "wood_frame_width"], "عرض الفريم الخشب", 0.0, null],
    [["doors", "alu_frame_width"], "عرض بروفايل الألومنيوم", 0.0, null],
    [["doors", "insert_engage"], "دخول الحشوة في الفريم", 0.0, null],
    [["doors", "glass_t"], "سمك الزجاج", 0.2, 1.5],
    [["doors", "mirror_t"], "سمك المراية", 0.2, 1.5],
    [["doors", "panel_t"], "سمك الحشوة", 0.2, 10.0],
    [["drawers", "gap"], "الفاصل بين الأدراج", 0.0, null],
    [["drawers", "slide_clearance"], "خلوص المجرى", 0.0, null],
    [["drawers", "box_t"], "سمك صندوق الدرج", 0.5, 10.0],
    [["drawers", "bottom_t"], "سمك قاعدة الدرج", 0.2, 10.0],
    [["drawers", "bottom_groove"], "دخول قاعدة الدرج", 0.0, null],
    [["drawers", "bottom_inset"], "بعد مفحار القاعدة", 0.0, null],
    [["drawers", "box_bottom_gap"], "خلوص أسفل الصندوق", 0.0, null],
    [["drawers", "box_top_gap"], "خلوص فوق الصندوق", 0.0, null],
    [["drawers", "internal_setback"], "بعد الأدراج الداخلية", 0.0, null],
    [["drawers", "internal_side_clearance"], "خصم جوانب الأدراج الداخلية", 0.0, null],
    [["drawers", "hinge_spacer_t"], "سمك حشوة المجرى", 0.5, 10.0],
    [["drawers", "hinge_zone_depth"], "مكان بداية حشوة المجرى", 0.0, null],
    [["drawers", "hinge_front_gap"], "خلوص وش الدرج عن المفصلة", 0.0, null],
    [["shelves", "front_setback"], "بعد الرف عن الحرف", 0.0, null],
    [["shelves", "side_gap"], "خلوص جوانب الرف", 0.0, null],
    [["rail", "diameter"], "قطر الشماعة", 1.0, 6.0],
    [["assembly", "hole_d"], "قطر خرم الأليتا", 0.2, 3.0],
    [["doors", "plate_setback"], "مكان قاعدة المفصلة", 0.0, null],
    [["doors", "plate_hole_spacing"], "بين خرمين قاعدة المفصلة", 0.0, null],
    [["doors", "plate_hole_d"], "قطر خرم قاعدة المفصلة", 0.1, 3.0],
    [["shelves", "pin_d"], "قطر خرم البنز", 0.1, 2.0],
    [["shelves", "pin_setback"], "بعد البنز عن الحرف", 0.0, null],
    [["assembly", "edge_distance"], "بعد أول خرم أليتا عن الحرف", 0.0, null],
    [["assembly", "spacing"], "المسافة بين أخرام الأليتا", 0.5, null],
    [["assembly", "face_depth"], "عمق خرم الأليتا في الوش", 0.1, 5.0],
    [["assembly", "edge_depth"], "عمق خرم الأليتا في الحرف", 0.5, 10.0],
    [["assembly", "cam_d"], "قطر خرم قفل الكام", 0.5, 5.0],
    [["assembly", "cam_depth"], "عمق خرم قفل الكام", 0.2, 5.0],
    [["rail", "top_offset"], "بعد الشماعة عن السقف", 0.0, null],
    [["led", "offset"], "بعد قناة الليد عن الحرف", 0.0, null],
    [["led", "width"], "عرض قناة الليد", 0.3, 5.0],
    [["led", "depth"], "عمق حفر الليد", 0.1, 3.0],
    [["led", "watt_per_m"], "قدرة شريط الليد (وات/متر)", 0.5, 50.0],
    [["led", "wire_hole_d"], "قطر خرم سلك الليد", 0.2, 3.0],
    [["plinth", "height"], "ارتفاع السكلو", 3.0, 30.0],
    [["plinth", "setback"], "رجوع وزرة السكلو", 0.0, null],
    [["plinth", "apron_t"], "سمك وزرة السكلو", 0.5, 5.0],
    [["plinth", "leg_spacing"], "المسافة بين رجول السكلو", 20.0, 150.0],
    [["plinth", "leg_inset"], "بعد رجل السكلو عن الحرف", 1.0, null],
];
export const MAX_SECTIONS = 12;
export const SECTION_KINDS = {
    normal: "قسم عادي",
    blind: "زاوية عمياء",
};
export const BLIND_PARTITIONS = {
    full: "جنب سد (بعمق الوحدة كله — الحتة العمياء مقفولة)",
    post: "قايم مفصلات بس (الحتة العمياء مفتوحة من جوه)",
};
export const MAX_COMPARTMENTS = 12;
/** Returns [complete clean params, errors] */
export function normalize(raw) {
    const errors = [];
    // deep_stringify in Ruby builds a fresh copy — never mutate the caller's object
    const src = isHash(raw) ? deepDup(raw) : {};
    const rest = {};
    for (const [k, v] of Object.entries(src))
        if (k !== "sections")
            rest[k] = v;
    const p = deepMergeInto(deepDup(DEFAULTS), rest);
    p.schema_version = SCHEMA_VERSION;
    p.label = rs(p.label).trim();
    for (const [path, name, min, max] of NUMERIC_RULES) {
        const v = strictNumber(dig(p, path), name, errors);
        if (v === null)
            continue;
        if (max === null && v < min) {
            errors.push(`${name}: القيمة ${fmt(v)} لازم تكون ${fmt(min)} سم أو أكتر.`);
        }
        else if (max !== null && (v < min || v > max)) {
            errors.push(`${name}: القيمة ${fmt(v)} لازم تكون بين ${fmt(min)} و ${fmt(max)} سم.`);
        }
        set(p, path, v);
    }
    checkChoice(p, ["construction"], CONSTRUCTIONS, "نظام الأجناب", errors);
    checkChoice(p, ["doors", "mode"], DOOR_MODES, "نظام الضلف", errors);
    checkChoice(p, ["doors", "style"], DOOR_STYLES, "شكل الضلف", errors);
    checkChoice(p, ["doors", "layout"], DOOR_LAYOUTS, "توزيع الضلف", errors);
    checkChoice(p, ["led", "install"], LED_INSTALLS, "طريقة تركيب الليد", errors);
    checkChoice(p, ["led", "sensor"], LED_SENSORS, "تشغيل الليد", errors);
    checkChoice(p, ["plinth", "style"], PLINTH_STYLES, "نوع السكلو", errors);
    checkChoice(p, ["plinth", "side_apron"], PLINTH_SIDES, "وزرة السكلو الجانبية", errors);
    hashSet(p.plinth, "enabled", truthy(hashGet(p.plinth, "enabled")));
    hashSet(p.drawers, "hinge_fix", notFalse(hashGet(p.drawers, "hinge_fix")));
    hashSet(p.doors, "rows", normalizeRows(hashGet(p.doors, "rows"), errors));
    p.edge_banding = truthy(p.edge_banding);
    const [hcfg, herr] = Handles.normalize(p.handles);
    p.handles = hcfg;
    errors.push(...herr);
    hashSet(p.assembly, "enabled", notFalse(hashGet(p.assembly, "enabled")));
    const hc = hashGet(p.doors, "hinge_count");
    if (!isAuto(hc)) {
        const n = strictInteger(hc, "عدد المفصلات", errors);
        if (n !== null && (n < 2 || n > 6))
            errors.push("عدد المفصلات لازم يكون بين 2 و 6 (أو تلقائي).");
        p.doors.hinge_count = n ?? "auto";
    }
    else {
        p.doors.hinge_count = "auto";
    }
    const bd = hashGet(p.drawers, "box_depth");
    if (!isAuto(bd)) {
        const v = strictNumber(bd, "عمق صندوق الدرج", errors);
        if (v !== null && (v < 15 || v > 80))
            errors.push("عمق صندوق الدرج لازم يكون بين 15 و 80 سم (أو تلقائي).");
        p.drawers.box_depth = v ?? "auto";
    }
    else {
        p.drawers.box_depth = "auto";
    }
    const lens = rArray(p.drawers.slide_lengths)
        .map((x) => rubyFloat(x))
        .filter((x) => x !== null && x > 0)
        .sort((a, b) => a - b);
    p.drawers.slide_lengths = lens.length === 0 ? [...DEFAULTS.drawers.slide_lengths] : lens;
    normalizeMaterials(p);
    p.sections = normalizeSections(has(src, "sections") ? src.sections : deepDup(DEFAULTS.sections), errors);
    return [p, errors];
}
export function normalizeRows(rowsIn, errors) {
    let rows = Array.isArray(rowsIn) && rowsIn.length > 0 ? rowsIn : [{ ...DEFAULT_ROW }];
    if (rows.length > MAX_ROWS) {
        errors.push(`أقصى عدد صفوف ضلف ${MAX_ROWS}.`);
        rows = rows.slice(0, MAX_ROWS);
    }
    return rows.map((r0, i) => {
        const r = isHash(r0) ? { ...DEFAULT_ROW, ...r0 } : { ...DEFAULT_ROW };
        const tag = `صف ضلف ${i + 1}`;
        const out = { height: sizeValue(r.height, `${tag}: الارتفاع`, errors) };
        out.type = rs(r.type);
        if (!has(ROW_TYPES, out.type))
            errors.push(`${tag}: النوع '${out.type}' مش معروف.`);
        let n = strictInteger(r.leaves, `${tag}: عدد الضلف`, errors) ?? 1;
        if (n < 1 || n > MAX_LEAVES) {
            errors.push(`${tag}: عدد الضلف لازم يكون بين 1 و ${MAX_LEAVES}.`);
            n = Math.min(Math.max(n, 1), MAX_LEAVES);
        }
        out.leaves = n;
        const hinges = rArray(r.hinges).map((h) => rs(h));
        const auto = autoHinges(n);
        out.hinges = Array.from({ length: n }, (_, k) => (has(LEAF_HINGES, hinges[k]) ? hinges[k] : auto[k]));
        out.style = rs(r.style) === "" ? "default" : rs(r.style);
        if (!(out.style === "default" || has(DOOR_STYLES, out.style))) {
            errors.push(`${tag}: شكل الضلفة '${out.style}' مش معروف.`);
        }
        return out;
    });
}
export function normalizeMaterials(p) {
    const mats = isHash(p.materials) ? p.materials : {};
    const clean = {};
    for (const k of Object.keys(MATERIAL_KEYS)) {
        let m = has(mats, k) ? mats[k] : null;
        if (!isHash(m))
            m = { name: rs(m) };
        clean[k] = { name: rs(m.name).trim(), skm: rs(m.skm).trim() };
    }
    p.materials = clean;
}
export function normalizeSections(list, errors) {
    if (!(Array.isArray(list) && list.length > 0)) {
        errors.push("لازم يكون فيه قسم واحد على الأقل.");
        return [];
    }
    if (list.length > MAX_SECTIONS) {
        errors.push(`أقصى عدد أقسام ${MAX_SECTIONS}.`);
        list = list.slice(0, MAX_SECTIONS);
    }
    const arr = list;
    const secs = arr.map((s0, si) => {
        const sec = isHash(s0) ? s0 : {};
        const tag = `قسم ${si + 1}`;
        const width = sizeValue(sec.width, `${tag}: العرض`, errors);
        let comps = sec.compartments;
        if (!(Array.isArray(comps) && comps.length > 0)) {
            errors.push(`${tag}: لازم يكون فيه فراغ واحد على الأقل.`);
            comps = [{ ...DEFAULT_COMPARTMENT }];
        }
        let carr = comps;
        if (carr.length > MAX_COMPARTMENTS) {
            errors.push(`${tag}: أقصى عدد فراغات ${MAX_COMPARTMENTS}.`);
            carr = carr.slice(0, MAX_COMPARTMENTS);
        }
        const cleanComps = carr.map((c, ci) => normalizeCompartment(c, `${tag} / فراغ ${ci + 1}`, errors));
        const kind = rs(sec.kind) === "" ? "normal" : rs(sec.kind);
        if (!has(SECTION_KINDS, kind))
            errors.push(`${tag}: نوع القسم '${kind}' مش معروف.`);
        const out = { width, compartments: cleanComps, kind };
        if (kind === "blind") {
            const part = rs(sec.blind_partition) === "" ? "full" : rs(sec.blind_partition);
            if (!has(BLIND_PARTITIONS, part))
                errors.push(`${tag}: نوع فاصل الزاوية العمياء '${part}' مش معروف.`);
            const pdRaw = sec.post_depth;
            const pd = pdRaw === null || pdRaw === undefined || rubyStrip(rs(pdRaw)) === ""
                ? 10.0
                : strictNumber(pdRaw, `${tag}: عمق قايم المفصلات`, errors);
            if (pd !== null && (pd < 5.0 || pd > 60.0))
                errors.push(`${tag}: عمق قايم المفصلات لازم يكون بين 5 و 60 سم.`);
            out.blind_partition = part;
            out.post_depth = pd ?? 10.0;
            out.blind_front = notFalse(sec.blind_front);
            out.blind_through = truthy(sec.blind_through);
            if (out.blind_through && part !== "post") {
                errors.push(`${tag}: الأرفف المتصلة للزاوية محتاجة الفاصل يبقى "قايم مفصلات" (مش جنب سد).`);
            }
            if (si !== 0 && si !== arr.length - 1) {
                errors.push(`${tag}: الزاوية العمياء لازم تبقى أول قسم (شمال) أو آخر قسم (يمين).`);
            }
        }
        return out;
    });
    if (secs.length > 0 && secs.every((s) => s.kind === "blind")) {
        errors.push("لازم يكون فيه قسم عادي واحد على الأقل جنب الزاوية العمياء.");
    }
    return secs;
}
const COUNT_RULES = [
    ["shelf_count", "عدد الأرفف", 0, 20],
    ["drawer_count", "عدد الأدراج", 1, 10],
    ["divider_count", "عدد القواطيع", 1, 10],
    ["sub_shelf_count", "عدد الأرفف بين القواطيع", 0, 20],
];
export function normalizeCompartment(c0, tag, errors) {
    const c = isHash(c0) ? { ...DEFAULT_COMPARTMENT, ...c0 } : { ...DEFAULT_COMPARTMENT };
    const out = {};
    out.height = sizeValue(c.height, `${tag}: الارتفاع`, errors);
    out.content = rs(c.content);
    if (!has(CONTENTS, out.content))
        errors.push(`${tag}: نوع المحتوى '${out.content}' مش معروف.`);
    out.door = rs(c.door);
    if (!has(DOORS, out.door))
        errors.push(`${tag}: نوع الضلفة '${out.door}' مش معروف.`);
    out.drawer_front = notFalse(c.drawer_front);
    out.drawer_glass = c.drawer_glass === true || c.drawer_glass === "true";
    out.led = rs(c.led);
    if (out.led === "")
        out.led = "none";
    if (!has(LED_MODES, out.led))
        errors.push(`${tag}: نوع الليد '${out.led}' مش معروف.`);
    out.door_style = rs(c.door_style);
    if (out.door_style === "")
        out.door_style = "default";
    if (!(out.door_style === "default" || has(DOOR_STYLES, out.door_style))) {
        errors.push(`${tag}: شكل الضلفة '${out.door_style}' مش معروف.`);
    }
    for (const [key, name, min, max] of COUNT_RULES) {
        const n = strictInteger(c[key], `${tag}: ${name}`, errors);
        if (n !== null && (n < min || n > max))
            errors.push(`${tag}: ${name} لازم يكون بين ${min} و ${max}.`);
        out[key] = n ?? DEFAULT_COMPARTMENT[key];
    }
    return out;
}
// ----------------------------------------------------------- tools
export function sizeValue(v, name, errors) {
    if (isAuto(v))
        return "auto";
    const n = strictNumber(v, name, errors);
    if (n === null)
        return "auto";
    if (n <= 0) {
        errors.push(`${name}: لازم يكون أكبر من صفر (أو تلقائي).`);
        return "auto";
    }
    return n;
}
export function isAuto(v) {
    if (v === null || v === undefined)
        return true;
    const s = rubyStrip(rs(v));
    return s === "" || s.toLowerCase() === "auto";
}
/** Ruby String#strip (ASCII whitespace + NUL) */
function rubyStrip(s) {
    return s.replace(/^[\0\t\n\v\f\r ]+/, "").replace(/[\0\t\n\v\f\r ]+$/, "");
}
/**
 * Kernel#Float(x) for the inputs the schema can see: Numeric -> itself; String -> Ruby's strict
 * float grammar (surrounding whitespace, `_` between digits, `.5`, exponents, `0x` hex); else null.
 */
export function rubyFloat(v) {
    if (typeof v === "number")
        return v;
    if (typeof v !== "string")
        return null;
    const s = rubyStrip(v);
    if (/^[+-]?0[xX][0-9a-fA-F]+$/.test(s)) {
        const neg = s.startsWith("-");
        const n = parseInt(s.replace(/^[+-]?0[xX]/, ""), 16);
        return neg ? -n : n;
    }
    const m = /^[+-]?(\d+(?:_\d+)*)?(?:\.(\d+(?:_\d+)*))?(?:[eE][+-]?\d+(?:_\d+)*)?$/.exec(s);
    if (!m || (m[1] === undefined && m[2] === undefined))
        return null;
    return parseFloat(s.replace(/_/g, ""));
}
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export function strictNumber(v, name, errors) {
    if (typeof v === "number" && Number.isFinite(v))
        return v;
    const s = rubyStrip(rs(v)).replace(/[٠-٩٫]/g, (ch) => (ch === "٫" ? "." : String(AR_DIGITS.indexOf(ch))));
    const f = rubyFloat(s);
    if (f === null || !Number.isFinite(f)) {
        errors.push(`${name}: القيمة '${rs(v)}' مش رقم صحيح.`);
        return null;
    }
    return f;
}
export function strictInteger(v, name, errors) {
    const f = strictNumber(v, name, errors);
    if (f === null)
        return null;
    if (Math.abs(f - rround(f)) > 1e-9) {
        errors.push(`${name}: لازم يكون رقم صحيح (من غير كسور).`);
        return null;
    }
    return rround(f);
}
function checkChoice(p, path, allowed, name, errors) {
    const v = rs(dig(p, path));
    if (!has(allowed, v))
        errors.push(`${name}: الاختيار '${v}' مش معروف.`);
    set(p, path, v);
}
/** Schema.truthy — only true / "true" / "1" */
export function truthy(v) {
    return v === true || rs(v) === "true" || rs(v) === "1";
}
const notFalse = (v) => !(v === false || rs(v) === "false");
export function fmt(v) {
    return coreFmt(v);
}
export function dig(h, path) {
    let acc = h;
    for (const k of path)
        acc = isHash(acc) ? acc[k] : null;
    return acc;
}
function set(h, path, value) {
    let target = h;
    for (const k of path.slice(0, -1)) {
        if (target[k] === null || target[k] === undefined || target[k] === false)
            target[k] = {};
        target = target[k];
    }
    if (!isHash(target))
        throw new TypeError("no implicit conversion (nested value is not a Hash)");
    target[path[path.length - 1]] = value;
}
function hashGet(h, k) {
    if (!isHash(h))
        throw new TypeError(`undefined method '[]' (nested value is not a Hash)`);
    return h[k];
}
function hashSet(h, k, v) {
    if (!isHash(h))
        throw new TypeError(`undefined method '[]=' (nested value is not a Hash)`);
    h[k] = v;
}
/** Schema.deep_merge — mutates base; hashes merge recursively, anything else from over wins */
function deepMergeInto(base, over) {
    for (const [k, v] of Object.entries(over)) {
        base[k] = isHash(base[k]) && isHash(v) ? deepMergeInto(base[k], v) : v;
    }
    return base;
}
