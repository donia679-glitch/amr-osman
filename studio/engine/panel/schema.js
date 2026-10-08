// Port of lib/panel_engine/schema.rb — templates, defaults and validation (all cm).
import { deepDup, deepMerge, fmt, has, isHash, rArray, rs, toF, toI, truthy, clamp } from "../core/ruby.js";
import * as Catalog from "./catalog.js";
import * as TableSpec from "./tableSpec.js";
import { paramsFor } from "./presets.js";
export const SCHEMA_VERSION = 1;
export const TEMPLATES = {
    vanity: { label: "وحدة حوض حمام", group: "الحمام" },
    mirror_cabinet: { label: "دولاب مراية حمام", group: "الحمام" },
    bath_tall: { label: "عمود حمام طويل", group: "الحمام" },
    washer_tower: { label: "وحدة غسالة (غسالة تحت + دولاب فوق)", group: "الحمام" },
    bed: { label: "سرير بصندوق + ضهر", group: "غرف النوم" },
    nightstand: { label: "كومودينو", group: "غرف النوم" },
    chest: { label: "شيفونيرة (أدراج)", group: "غرف النوم" },
    dresser: { label: "تسريحة بمراية", group: "غرف النوم" },
    desk: { label: "مكتب", group: "غرف النوم" },
    tv_unit: { label: "وحدة شاشة (أرضي + بانوه + أعمدة)", group: "الريسبشن" },
    tv_wall: { label: "وحدة شاشة مرنة (دولابين + وحدة وسط + تجويف)", group: "الريسبشن" },
    shoe_cabinet: { label: "جزامة", group: "الريسبشن" },
    open_shelf: { label: "مكتبة / أرفف مفتوحة", group: "الريسبشن" },
    cabinet: { label: "وحدة عامة (أي علبة بضلف/أدراج)", group: "عام" },
    free: { label: "ألواح حرة (أي تصميم من ألواح)", group: "عام" },
    blocks: { label: "ترابيزة كتل (ألواح وصناديق متداخلة)", group: "الترابيزات" },
    ...TableSpec.TEMPLATES,
};
export const FRONT_TYPES = { doors: "ضلف", drawers: "أدراج", flap: "ضلفة قلاب (بتفتح لفوق)", open: "مفتوح (من غير ضلف)" };
export const MOUNTS = { floor: "على الأرض (رجول + وزرة)", wall: "معلّقة على الحيطة" };
export const TOPS = { full: "رأس كامل", rails: "شريطين (قدام وورا)" };
export const HANDLES = { bar: "مقبض عادي", push: "Push (تاتش)", gola: "بروفايل بلت إن (الضلفة ناقصة 4 سم)", none: "من غير" };
export const FRONT_STYLES = { wood: "لوح عادي", mirror: "لوح عليه مراية" };
export const ROLES = ["side", "horizontal", "fixed_shelf", "divider", "shelf", "back", "door", "plinth", "drawer_bottom", "other"];
export const DEFAULT_ZONE = { type: "doors", count: 2, height: "auto", shelves: 1, hinge: "left", glass: false };
export const BASE_DEFAULTS = {
    schema_version: SCHEMA_VERSION,
    template: "cabinet",
    label: "",
    environment: "dry",
    width: 60.0,
    height: 75.0,
    depth: 45.0,
    thickness: 1.8,
    front_thickness: 1.8,
    mount: "floor",
    plinth: { height: 10.0, setback: 5.0, style: "apron" },
    led_under: false,
    top: "full",
    rail_width: 10.0,
    back: { enabled: true, thickness: 0.6, groove_depth: 0.8, inset: 1.8 },
    front_gap: 0.3,
    handle: "bar",
    front_style: "wood",
    edge_banding: true,
    fronts: [{ type: "doors", count: 2, height: "auto", shelves: 1, hinge: "left" }],
    drawer: { box_thickness: 1.6, bottom_thickness: 0.6, slide_clearance: 1.3, groove_depth: 0.8 },
    hinge_edge: 10.0,
    siphon_cut: false,
    washer: { gap_height: 88.0 },
    joints: {
        enabled: true, hole_d: 0.8, edge_distance: 1.0, spacing: 2.8,
        face_depth: 0.8, edge_depth: 3.2, cam_d: 1.5, cam_depth: 1.4,
        middle_set_over: 70.0,
    },
    materials: {},
    panels: [],
};
export const TEMPLATE_DEFAULTS = {
    cabinet: {
        environment: "dry", width: 60.0, height: 60.0, depth: 45.0, mount: "floor", top: "full",
        fronts: [{ type: "drawers", count: 3, height: "auto" }],
    },
    open_shelf: {
        environment: "dry", width: 90.0, height: 200.0, depth: 30.0, mount: "floor", top: "full",
        handle: "none", fronts: [{ type: "open", shelves: 4, height: "auto" }],
    },
    vanity: {
        environment: "wet", width: 80.0, height: 50.0, depth: 46.0, mount: "wall", top: "rails",
        siphon_cut: true, fronts: [{ type: "doors", count: 2, height: "auto", shelves: 0 }],
    },
    mirror_cabinet: {
        environment: "wet", width: 70.0, height: 70.0, depth: 15.0, mount: "wall", top: "full",
        handle: "push", front_style: "mirror",
        fronts: [{ type: "doors", count: 2, height: "auto", shelves: 2 }],
    },
    bath_tall: {
        environment: "wet", width: 35.0, height: 170.0, depth: 30.0, mount: "floor", top: "full",
        fronts: [{ type: "doors", count: 1, height: "auto", shelves: 4, hinge: "left" }],
    },
    washer_tower: {
        environment: "wet", width: 65.6, height: 200.0, depth: 65.0, mount: "floor", top: "full",
        fronts: [{ type: "doors", count: 2, height: "auto", shelves: 1 }],
    },
    nightstand: {
        environment: "dry", width: 50.0, height: 55.0, depth: 40.0, mount: "floor", top: "full",
        fronts: [{ type: "drawers", count: 2, height: "auto" }, { type: "open", height: 15.0, shelves: 0 }],
    },
    chest: {
        environment: "dry", width: 80.0, height: 110.0, depth: 45.0, mount: "floor", top: "full",
        fronts: [{ type: "drawers", count: 5, height: "auto" }],
    },
    shoe_cabinet: {
        environment: "dry", width: 90.0, height: 100.0, depth: 35.0, mount: "floor", top: "full",
        fronts: [{ type: "doors", count: 2, height: "auto", shelves: 4 }],
    },
    dresser: {
        environment: "dry", width: 100.0, height: 175.0, depth: 40.0, mount: "floor", top: "full",
        fronts: [{ type: "drawers", count: 3, height: "auto" }],
        dresser: { base_height: 75.0, mirror_width: 70.0, mirror_height: 90.0, mirror_gap: 5.0, mirror_led: false, float_height: 40.0 },
    },
    desk: {
        environment: "dry", width: 120.0, height: 75.0, depth: 60.0, fronts: [],
        desk: { height: 75.0, pedestal: "right", pedestal_width: 40.0, pedestal_drawers: 3, modesty: true, wall_shelves: 0, led: false },
    },
    tv_unit: {
        environment: "dry", width: 240.0, height: 220.0, depth: 40.0, fronts: [],
        tv: {
            base_height: 40.0, base_depth: 40.0, base_float: 20.0, base_fronts: "flap",
            panel: true, panel_height: 140.0, panel_thickness: 1.8, cable_hole: true,
            columns: "both", column_width: 40.0, column_depth: 35.0, column_shelves: 4, column_doors: true,
            panel_style: "flat", slat_width: 5.0, slat_gap: 2.0, panel_shelves: 0, shelf_depth: 22.0,
            shelf_width: 60.0, shelf_thickness: 1.8, shelves_side: "right", led: false,
        },
    },
    tv_wall: {
        environment: "dry", width: 300.0, height: 240.0, depth: 45.0, fronts: [], handle: "push",
        tvw: {
            left: { on: true, width: 60.0, height: 240.0, depth: 40.0, z: 0.0, led: false,
                fronts: [{ type: "drawers", count: 2, height: 40.0 }, { type: "doors", count: 1, height: "auto", shelves: 4, hinge: "left" }] },
            right: { on: true, width: 60.0, height: 240.0, depth: 40.0, z: 0.0, led: false,
                fronts: [{ type: "drawers", count: 2, height: 40.0 }, { type: "doors", count: 1, height: "auto", shelves: 4, hinge: "right" }] },
            mid: { width: 200.0, low: true, height: 45.0, depth: 45.0, z: 15.0, led: true, module_max: 90.0,
                fronts: [{ type: "flap", count: 1, height: "auto", shelves: 0 }] },
            clad: { on: true, gap: 0.0, z0: 0.0, top: 240.0, depth: 12.0, mat: "accent", style: "flat", slat_width: 4.0, slat_gap: 1.5, slat_mat: "carcass", led: false },
            niches: [{ on: true, x: "center", z: 150.0, w: 150.0, h: 50.0, depth: 12.0, shelves: 0, led: true, lining: "accent", back: "front" }],
        },
    },
    bed: {
        environment: "dry", width: 0.0, height: 0.0, depth: 0.0, fronts: [],
        bed: {
            mattress_width: 160.0, mattress_length: 200.0, clearance: 1.0, height: 35.0,
            storage: "lift", headboard: true, headboard_height: 120.0, headboard_extra: 0.0,
            headboard_thickness: 1.8, upholstered: false,
            headboard_style: "flat", slat_width: 6.0, slat_gap: 2.0, panel_rows: 3,
            headboard_shelf: false, side_tables: false,
            floating: false, float_height: 12.0, float_setback: 15.0, led: false,
        },
    },
    blocks: {
        environment: "dry", width: 120.0, height: 40.0, depth: 60.0, mount: "floor", fronts: [], blocks: [],
        back: { enabled: false, thickness: 0.6, groove_depth: 0.8, inset: 1.8 }, plinth: { height: 0.0, setback: 0.0, style: "apron" },
    },
    free: {
        environment: "dry", width: 0.0, height: 0.0, depth: 0.0,
        fronts: [],
        panels: [
            { name: "جنب شمال", role: "side", material: "carcass", x: 0, y: 0, z: 0, w: 1.8, d: 30, h: 180 },
            { name: "جنب يمين", role: "side", material: "carcass", x: 78.2, y: 0, z: 0, w: 1.8, d: 30, h: 180 },
            { name: "قاعدة", role: "horizontal", material: "carcass", x: 1.8, y: 0, z: 0, w: 76.4, d: 30, h: 1.8 },
            { name: "رأس", role: "horizontal", material: "carcass", x: 1.8, y: 0, z: 178.2, w: 76.4, d: 30, h: 1.8 },
            { name: "رف ثابت", role: "fixed_shelf", material: "shelf", x: 1.8, y: 0, z: 89.1, w: 76.4, d: 30, h: 1.8 },
        ],
    },
    ...TableSpec.TEMPLATE_DEFAULTS,
};
const U = undefined;
export const SPECIAL = {
    tv_wall: { hide: ["size", "fronts"], fields: [] },
    tv_unit: { hide: ["fronts", "depth"], fields: [
            ["tv.base_height", "ارتفاع الأرضي", "num", U, 20, 120], ["tv.base_depth", "عمق الأرضي", "num", U, 20, 70],
            ["tv.base_float", "الأرضي معلّق على ارتفاع (0 = على الأرض)", "num", U, 0, 100],
            ["tv.base_fronts", "واجهة الأرضي", "choice", { flap: "قلاب", drawers: "أدراج", doors: "ضلف" }],
            ["tv.panel", "بانوه خلف الشاشة", "bool"], ["tv.panel_height", "ارتفاع البانوه", "num", U, 10, 250],
            ["tv.panel_thickness", "سمك البانوه", "num", U, 0.6, 5.4], ["tv.cable_hole", "فتحة كابلات", "bool"],
            ["tv.columns", "الأعمدة", "choice", { both: "يمين وشمال", left: "شمال بس", right: "يمين بس", none: "من غير" }],
            ["tv.column_width", "عرض العمود", "num", U, 20, 80], ["tv.column_depth", "عمق العمود", "num", U, 20, 60],
            ["tv.column_shelves", "أرفف العمود", "int", U, 0, 10], ["tv.column_doors", "ضلف على الأعمدة", "bool"],
            ["tv.panel_style", "شكل البانوه", "choice", { flat: "لوح سادة", slats: "شرايح خشب رأسية" }],
            ["tv.slat_width", "عرض الشريحة", "num", U, 2, 20], ["tv.slat_gap", "المسافة بين الشرايح", "num", U, 0.5, 10],
            ["tv.panel_shelves", "أرفف عائمة", "int", U, 0, 5],
            ["tv.shelves_side", "الأرفف ناحية", "choice", { right: "يمين", left: "شمال" }],
            ["tv.shelf_width", "عرض الرف العائم", "num", U, 20, 150], ["tv.shelf_depth", "عمق الرف العائم", "num", U, 10, 40],
            ["tv.shelf_thickness", "سمك الرف العائم", "num", U, 1.6, 6], ["tv.led", "إضاءة ليد", "bool"],
        ] },
    bed: { hide: ["size", "fronts"], fields: [
            ["bed.mattress_width", "عرض المرتبة", "num", U, 80, 220], ["bed.mattress_length", "طول المرتبة", "num", U, 180, 220],
            ["bed.clearance", "خلوص حوالين المرتبة", "num", U, 0, 5], ["bed.height", "ارتفاع الصندوق", "num", U, 15, 60],
            ["bed.storage", "التخزين", "choice", { lift: "صندوق بغطا بمكبس", none: "من غير تخزين" }],
            ["bed.headboard", "ضهر سرير", "bool"], ["bed.headboard_height", "ارتفاع الضهر من الأرض", "num", U, 40, 250],
            ["bed.headboard_extra", "الضهر أعرض من السرير (كل ناحية)", "num", U, 0, 80],
            ["bed.headboard_thickness", "سمك الضهر", "num", U, 0.6, 5.4], ["bed.upholstered", "ضهر منجّد", "bool"],
            ["bed.headboard_style", "شكل الضهر", "choice", { flat: "لوح سادة", slats: "شرايح رأسية", panels: "بانوهات أفقية (شكل منجّد)" }],
            ["bed.slat_width", "عرض شريحة الضهر", "num", U, 2, 20], ["bed.slat_gap", "المسافة بين الشرايح", "num", U, 0.5, 10],
            ["bed.panel_rows", "عدد بانوهات الضهر", "int", U, 2, 6],
            ["bed.headboard_shelf", "رف فوق الضهر", "bool"], ["bed.side_tables", "كومودينو معلّق في الضهر", "bool"],
            ["bed.floating", "سرير معلّق (قاعدة داخلة)", "bool"], ["bed.float_height", "ارتفاع القاعدة المعلّقة", "num", U, 5, 25],
            ["bed.float_setback", "دخول القاعدة لجوه", "num", U, 5, 40], ["bed.led", "إضاءة ليد", "bool"],
        ] },
    dresser: { hide: [], fields: [
            ["dresser.base_height", "ارتفاع وحدة الأدراج", "num", U, 15, 110], ["dresser.mirror_width", "عرض المراية", "num", U, 20, 200],
            ["dresser.mirror_height", "ارتفاع المراية", "num", U, 20, 200], ["dresser.mirror_gap", "المراية فوق الوحدة بـ", "num", U, 0, 60],
            ["dresser.mirror_led", "مراية بليد من ورا (Backlit)", "bool"],
            ["dresser.float_height", "ارتفاع الوحدة المعلّقة من الأرض", "num", U, 0, 100],
        ] },
    desk: { hide: ["fronts"], fields: [
            ["desk.height", "ارتفاع المكتب", "num", U, 60, 110],
            ["desk.pedestal", "وحدة الأدراج", "choice", { right: "يمين", left: "شمال", none: "من غير" }],
            ["desk.pedestal_width", "عرض وحدة الأدراج", "num", U, 30, 60], ["desk.pedestal_drawers", "عدد الأدراج", "int", U, 1, 5],
            ["desk.modesty", "لوح أمامي تحت السطح", "bool"],
            ["desk.wall_shelves", "أرفف حيطة فوق المكتب", "int", U, 0, 4], ["desk.led", "ليد تحت أول رف", "bool"],
        ] },
    ...TableSpec.SPECIAL,
    blocks: { hide: ["fronts", "plinth", "back", "top", "mount"], fields: [] },
};
export const LIVE_SPECIAL = {
    bed: ["bed.storage", "bed.headboard_style", "bed.headboard_shelf", "bed.side_tables", "bed.floating", "bed.led"],
    tv_unit: ["tv.base_fronts", "tv.columns", "tv.column_shelves", "tv.panel_style", "tv.panel_shelves", "tv.led"],
    dresser: ["dresser.mirror_led"],
    desk: ["desk.pedestal", "desk.pedestal_drawers", "desk.wall_shelves", "desk.modesty", "desk.led"],
};
export function liveFields(template) {
    const spec = SPECIAL[template];
    if (!spec)
        return [];
    const paths = spec.live ?? LIVE_SPECIAL[template] ?? [];
    return spec.fields.filter((f) => paths.includes(f[0]));
}
function validateSpecial(p, errors) {
    const spec = SPECIAL[p.template];
    if (!spec)
        return;
    for (const [path, name, type, choices, lo, hi] of spec.fields) {
        const keys = path.split(".");
        if (!p[keys[0]])
            p[keys[0]] = {};
        const h = p[keys[0]];
        const k = keys[1];
        switch (type) {
            case "num":
                num(p, keys, name, lo, hi, errors);
                break;
            case "int": {
                const v = toI(h[k], lo);
                if (v < lo || v > hi)
                    errors.push(`${name} لازم يكون بين ${lo} و ${hi}.`);
                h[k] = clamp(v, lo, hi);
                break;
            }
            case "bool":
                h[k] = truthy(h[k]);
                break;
            case "choice":
                if (!has(choices, rs(h[k]))) {
                    errors.push(`${name}: قيمة مش معروفة (${rs(h[k])}).`);
                    h[k] = Object.keys(choices)[0];
                }
                break;
        }
    }
}
export function defaultsFor(template) {
    const t = has(TEMPLATES, String(template ?? "")) ? String(template) : "cabinet";
    const d = deepMerge(deepDup(BASE_DEFAULTS), deepDup(TEMPLATE_DEFAULTS[t] ?? {}));
    d.template = t;
    return d;
}
/** returns [clean params, errors] */
export function normalize(rawIn) {
    let raw = isHash(rawIn) ? deepDup(rawIn) : {};
    const errors = [];
    const preset = rs(raw.preset);
    if (preset !== "") {
        const base = paramsFor(preset);
        if (base) {
            raw = deepMerge(base, raw);
            for (const k of ["fronts", "panels"])
                if (has(raw, k) && raw[k] == null)
                    delete raw[k];
        }
        else {
            errors.push(`التصميم الجاهز "${preset}" مش موجود.`);
        }
    }
    let tpl = rs(raw.template);
    if (!has(TEMPLATES, tpl))
        tpl = "cabinet";
    const p = deepMerge(defaultsFor(tpl), raw);
    p.template = tpl;
    p.schema_version = SCHEMA_VERSION;
    p.fronts = has(raw, "fronts") ? rArray(raw.fronts) : defaultsFor(tpl).fronts;
    p.panels = has(raw, "panels") ? rArray(raw.panels) : defaultsFor(tpl).panels;
    if (tpl === "blocks") p.blocks = has(raw, "blocks") ? rArray(raw.blocks) : [];
    if (!has(Catalog.ENVIRONMENTS, p.environment))
        p.environment = "dry";
    choice(p, "mount", MOUNTS, errors, "طريقة التركيب");
    choice(p, "top", TOPS, errors, "نوع الرأس");
    choice(p, "handle", HANDLES, errors, "المقبض");
    choice(p, "front_style", FRONT_STYLES, errors, "شكل الضلف");
    p.edge_banding = truthy(p.edge_banding);
    p.siphon_cut = truthy(p.siphon_cut);
    p.led_under = truthy(p.led_under);
    if (!["apron", "legs"].includes(p.plinth.style))
        p.plinth.style = "apron";
    p.back.enabled = truthy(p.back.enabled);
    p.joints.enabled = truthy(p.joints.enabled);
    validateSpecial(p, errors);
    if (tpl === "tv_wall") normalizeTvWall(p, raw, errors);
    if (tpl === "bed") {
        // bed dimensions come from the mattress
    }
    else if (tpl !== "free") {
        num(p, ["width"], "العرض", 10, tpl === "tv_wall" ? 800 : 400, errors);
        num(p, ["height"], "الارتفاع", 10, 300, errors);
        num(p, ["depth"], "العمق", 5, TableSpec.isTable(tpl) ? 200 : 120, errors);
    }
    num(p, ["thickness"], "سمك الخشب", 0.6, 5.4, errors);
    num(p, ["front_thickness"], "سمك الضلف", 0.6, 5.4, errors);
    num(p, ["plinth", "height"], "ارتفاع السكلو", 0, 30, errors);
    num(p, ["plinth", "setback"], "رجوع الوزرة", 0, 15, errors);
    num(p, ["rail_width"], "عرض الشريط العلوي", 3, 30, errors);
    num(p, ["back", "thickness"], "سمك الظهر", 0.3, 2.0, errors);
    num(p, ["back", "groove_depth"], "عمق مفحار الظهر", 0, 1.5, errors);
    num(p, ["back", "inset"], "بعد الظهر عن الورا", 0, 10, errors);
    num(p, ["front_gap"], "الخلوص بين الضلف", 0, 2, errors);
    num(p, ["hinge_edge"], "بعد المفصلة عن الطرف", 3, 30, errors);
    num(p, ["drawer", "box_thickness"], "سمك صندوق الدرج", 0.8, 2.0, errors);
    num(p, ["drawer", "bottom_thickness"], "سمك قاعدة الدرج", 0.3, 1.8, errors);
    num(p, ["drawer", "slide_clearance"], "خلوص المجرى", 0, 3, errors);
    num(p, ["drawer", "groove_depth"], "عمق مفحار قاعدة الدرج", 0, 1.2, errors);
    num(p, ["washer", "gap_height"], "ارتفاع مكان الغسالة", 60, 150, errors);
    for (const k of ["hole_d", "edge_distance", "spacing", "face_depth", "edge_depth", "cam_d", "cam_depth", "middle_set_over"]) {
        num(p, ["joints", k], `الأليتا (${k})`, 0, 500, errors);
    }
    p.fronts = p.fronts.map((z, i) => normalizeZone(z, i, errors)).filter((z) => z !== null);
    if (tpl === "free")
        p.panels = p.panels.map((pn, i) => normalizePanel(pn, i, errors)).filter((z) => z !== null);
    p.materials = normalizeMaterials(p.materials);
    if (tpl === "free" && p.panels.length === 0)
        errors.push("مفيش ولا لوح في التصميم الحر.");
    return [p, errors];
}
function normalizeZone(zIn, i, errors) {
    if (!isHash(zIn))
        return null;
    const z = deepMerge(deepDup(DEFAULT_ZONE), zIn);
    const tag = `الجزء ${i + 1} من الواجهة`;
    if (!has(FRONT_TYPES, z.type)) {
        errors.push(`${tag}: نوع مش معروف (${rs(z.type)}).`);
        z.type = "open";
    }
    const h = z.height;
    if (rs(h).trim() === "" || rs(h) === "auto") {
        z.height = "auto";
    }
    else {
        const v = toF(h);
        if (v === null || v < 5) {
            errors.push(`${tag}: الارتفاع لازم يكون رقم أكبر من 5 أو auto.`);
            z.height = "auto";
        }
        else {
            z.height = v;
        }
    }
    z.count = toI(z.count, 1);
    z.count = clamp(z.count, 1, z.type === "drawers" ? 6 : 2);
    z.shelves = clamp(toI(z.shelves, 0), 0, 12);
    z.hinge = ["left", "right"].includes(z.hinge) ? z.hinge : "left";
    z.led = truthy(z.led);
    // NOVERA v53: glass-front drawers — true (all), a list of 1-based drawer numbers (bottom first, "1,3" or [1,3]), or false
    const gl = z.glass;
    if (gl === true || rs(gl).toLowerCase() === "all" || rs(gl).toLowerCase() === "true")
        z.glass = true;
    else if (Array.isArray(gl) || (typeof gl === "string" && gl.trim() !== ""))
        z.glass = (Array.isArray(gl) ? gl : gl.split(/[,\s،]+/)).map((x) => toI(x, 0)).filter((x) => x >= 1 && x <= 6);
    else
        z.glass = false;
    if (Array.isArray(z.glass) && !z.glass.length)
        z.glass = false;
    return z;
}
const PANEL_KEYS = ["x", "y", "z", "w", "d", "h"];
const BAND_SIDES = ["left", "right", "front", "back", "bottom", "top"];
function normalizePanel(pn, i, errors) {
    if (!isHash(pn))
        return null;
    let name = rs(pn.name).trim();
    if (name === "")
        name = `لوح ${i + 1}`;
    const out = { name };
    for (const k of PANEL_KEYS) {
        let v = toF(pn[k]);
        if (v === null) {
            errors.push(`اللوح "${name}": ${k} لازم يكون رقم.`);
            v = 0.0;
        }
        out[k] = v;
    }
    for (const k of ["w", "d", "h"])
        if (out[k] <= 0)
            errors.push(`اللوح "${name}": المقاس ${k} لازم يكون أكبر من صفر.`);
    out.role = ROLES.includes(rs(pn.role)) ? rs(pn.role) : "other";
    out.material = has(Catalog.MATERIAL_KEYS, rs(pn.material)) ? rs(pn.material) : "carcass";
    const bands = rArray(pn.band).map((b) => rs(b));
    out.band = [...new Set(bands.filter((b) => BAND_SIDES.includes(b)))];
    if (pn.band == null)
        out.band = ["front"];
    out.grain = ["x", "y", "z"].includes(rs(pn.grain)) ? rs(pn.grain) : null;
    if (pn.group != null && pn.group !== "")
        out.group = rs(pn.group); // parts that move together (a drawer front and its box)
    if (isHash(pn.door_label))
        out.door_label = { hinge_side: ["left", "right", "top"].includes(rs(pn.door_label.hinge_side)) ? rs(pn.door_label.hinge_side) : null };
    return out;
}
function normalizeMaterials(mIn) {
    const m = isHash(mIn) ? mIn : {};
    const out = {};
    for (const k of Object.keys(Catalog.MATERIAL_KEYS)) {
        const e = isHash(m[k]) ? m[k] : {};
        out[k] = { name: rs(e.name).trim(), skm: rs(e.skm).trim() };
        const lib = rs(e.lib).trim();
        if (has(Catalog.LIB, lib))
            out[k].lib = lib;
    }
    return out;
}
function choice(p, key, allowed, errors, name) {
    if (has(allowed, rs(p[key])))
        return;
    errors.push(`${name}: قيمة مش معروفة (${rs(p[key])}).`);
    p[key] = Object.keys(allowed)[0];
}
function num(p, path, name, lo, hi, errors) {
    let h = p;
    for (const k of path.slice(0, -1)) {
        if (!h[k])
            h[k] = {};
        h = h[k];
    }
    const last = path[path.length - 1];
    const v = toF(h[last]);
    if (v === null) {
        errors.push(`${name} لازم يكون رقم.`);
        return;
    }
    if (v < lo - 1e-9 || v > hi + 1e-9)
        errors.push(`${name} لازم يكون بين ${fmt(lo)} و ${fmt(hi)}.`);
    h[last] = v;
}

// v113: the flexible TV wall — each part's numbers clamped, its fronts normalised like a cabinet's, the overall size computed
function normalizeTvWall(p, raw, errors) {
    const D = TEMPLATE_DEFAULTS.tv_wall.tvw;
    const q = p.tvw = isHash(p.tvw) ? p.tvw : deepDup(D);
    const N = (o, k, lo, hi, name) => { const v = toF(o[k]); o[k] = v === null ? lo : clamp(v, lo, hi); if (v !== null && (v < lo || v > hi)) errors.push(`${name} لازم يكون بين ${lo} و ${hi}.`); };
    const B = (o, k) => { o[k] = truthy(o[k]); };
    for (const [k, nm] of [["left", "الدولاب الشمال"], ["right", "الدولاب اليمين"]]) {
        const S = q[k] = isHash(q[k]) ? deepMerge(deepDup(D[k]), q[k]) : deepDup(D[k]);
        B(S, "on"); B(S, "led");
        N(S, "width", 15, 150, `عرض ${nm}`); N(S, "height", 20, 300, `ارتفاع ${nm}`); N(S, "depth", 10, 80, `عمق ${nm}`); N(S, "z", 0, 200, `${nm} مرفوع عن الأرض`);
        S.fronts = rArray(raw?.tvw?.[k]?.fronts ?? S.fronts).map((z, i) => normalizeZone(z, i, errors)).filter((z) => z !== null);
    }
    const M = q.mid = isHash(q.mid) ? deepMerge(deepDup(D.mid), q.mid) : deepDup(D.mid);
    B(M, "low"); B(M, "led");
    N(M, "width", 30, 500, "عرض الوسط"); N(M, "height", 10, 120, "ارتفاع الوحدة الوسطانية"); N(M, "depth", 10, 80, "عمق الوحدة الوسطانية");
    N(M, "z", 0, 150, "الوحدة الوسطانية مرفوعة عن الأرض"); N(M, "module_max", 40, 150, "أقصى عرض لكل علبة في الوسط");
    M.fronts = rArray(raw?.tvw?.mid?.fronts ?? M.fronts).map((z, i) => normalizeZone(z, i, errors)).filter((z) => z !== null);
    const C = q.clad = isHash(q.clad) ? deepMerge(deepDup(D.clad), q.clad) : deepDup(D.clad);
    B(C, "on"); B(C, "led");
    N(C, "gap", 0, 100, "المسافة بين الوحدة والكسوة"); N(C, "z0", 0, 250, "بداية الكسوة"); N(C, "top", 20, 320, "نهاية الكسوة من الأرض");
    N(C, "depth", 2.4, 60, "بروز الكسوة عن الحيطة"); N(C, "slat_width", 1, 20, "عرض الشريحة"); N(C, "slat_gap", 0.3, 15, "المسافة بين الشرايح");
    if (!["flat", "slats"].includes(C.style)) C.style = "flat";
    q.niches = rArray(raw?.tvw?.niches ?? q.niches).filter(isHash).map((n0, i) => {
        const n = deepMerge(deepDup(D.niches[0]), n0);
        B(n, "on"); B(n, "led");
        N(n, "w", 5, 400, `عرض التجويف ${i + 1}`); N(n, "h", 5, 250, `ارتفاع التجويف ${i + 1}`); N(n, "depth", 1, 60, `عمق التجويف ${i + 1}`);
        N(n, "shelves", 0, 6, `أرفف التجويف ${i + 1}`);
        for (const k of ["x", "z"]) if (!(n[k] === "center" || n[k] === "" || n[k] == null)) { const v = toF(n[k]); n[k] = v === null ? "center" : clamp(v, 0, 500); }
        return n;
    });
    const lw = q.left.on ? q.left.width : 0, rw = q.right.on ? q.right.width : 0;
    p.width = lw + M.width + rw;
    p.depth = Math.max(q.left.on ? q.left.depth : 0, q.right.on ? q.right.depth : 0, M.low ? M.depth : 0, C.on ? C.depth : 0, 5);
    p.height = Math.max(q.left.on ? q.left.z + q.left.height : 0, q.right.on ? q.right.z + q.right.height : 0, M.low ? M.z + M.height : 0, C.on ? C.top : 0, 10);
}
