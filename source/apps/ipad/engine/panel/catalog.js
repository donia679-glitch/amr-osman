// Port of lib/panel_engine/catalog.rb — static knowledge: materials, hardware rules, machines.
import { deepDup, deepMerge } from "../core/ruby.js";
import { rround } from "../core/rubyMath.js";
export const ENVIRONMENTS = {
    dry: "جاف (غرف نوم / ريسبشن / مكاتب)",
    wet: "رطب (حمامات / مطابخ غسيل / بلكونات)",
};
export const MATERIAL_KEYS = {
    carcass: { label: "الهيكل (أجناب/قاعدة/رأس)", fallback: null },
    shelf: { label: "الأرفف", fallback: "carcass" },
    back: { label: "الظهر", fallback: null },
    front: { label: "الضلف ووش الأدراج", fallback: null },
    drawer_box: { label: "صندوق الدرج", fallback: "carcass" },
    drawer_bottom: { label: "قاعدة الدرج", fallback: "back" },
    plinth: { label: "الوزرة (السكلو)", fallback: "carcass" },
    mirror: { label: "المراية", fallback: null },
    glass: { label: "زجاج وش الأدراج", fallback: null },
    accent: { label: "الخامة المميزة (شرايح/بانوه/ضهر)", fallback: "front" },
    table_top: { label: "سطح الترابيزة", fallback: "front" },
    table_base: { label: "قاعدة / رجول الترابيزة", fallback: "accent" },
    led: { label: "إضاءة الليد", fallback: null },
    banding: { label: "شريط الحواف", fallback: null },
};
export const DEFAULT_MATERIALS = {
    dry: {
        carcass: ["NOVERA - كونتر أبيض", [242, 240, 235]],
        back: ["NOVERA - ظهر أبيض", [236, 233, 226]],
        front: ["NOVERA - HPL وش", [226, 222, 214]],
        mirror: ["مرايا", [214, 226, 232]],
        glass: ["زجاج شفاف 4 مم", [205, 228, 238]],
        led: ["إضاءة LED", [255, 210, 122]],
        banding: ["شريط حواف", [224, 64, 42]],
    },
    wet: {
        carcass: ["NOVERA - فوم بورد PVC أبيض", [246, 246, 244]],
        back: ["NOVERA - فوم بورد PVC ظهر", [238, 238, 236]],
        front: ["NOVERA - أكريليك على فوم بورد", [240, 236, 228]],
        mirror: ["مرايا", [214, 226, 232]],
        glass: ["زجاج شفاف 4 مم", [205, 228, 238]],
        led: ["إضاءة LED", [255, 210, 122]],
        banding: ["شريط PVC", [210, 60, 40]],
    },
};
/** NOVERA material library: code => [Arabic name, SKM path, hex color, opacity] */
export const LIB = {
    hpl_white: ["HPL أبيض", "skm/hpl/hpl_white.skm", "#F4F4F2", 1.0],
    hpl_offwhite: ["HPL أوف وايت", "skm/hpl/hpl_offwhite.skm", "#EFEADF", 1.0],
    hpl_cream: ["HPL كريمي", "skm/hpl/hpl_cream.skm", "#E8DCC4", 1.0],
    hpl_beige: ["HPL بيج", "skm/hpl/hpl_beige.skm", "#D6CAB6", 1.0],
    hpl_greige: ["HPL جريج (رمادي بيج)", "skm/hpl/hpl_greige.skm", "#BDB5A8", 1.0],
    hpl_light_grey: ["HPL رمادي فاتح", "skm/hpl/hpl_light_grey.skm", "#C8C8C6", 1.0],
    hpl_grey: ["HPL رمادي", "skm/hpl/hpl_grey.skm", "#8E8F8F", 1.0],
    hpl_anthracite: ["HPL أنثراسيت", "skm/hpl/hpl_anthracite.skm", "#3B3D3F", 1.0],
    hpl_black: ["HPL أسود", "skm/hpl/hpl_black.skm", "#1E1E1E", 1.0],
    hpl_olive: ["HPL زيتي", "skm/hpl/hpl_olive.skm", "#5E6A57", 1.0],
    hpl_sage: ["HPL أخضر سيج", "skm/hpl/hpl_sage.skm", "#9AA592", 1.0],
    hpl_navy: ["HPL كحلي", "skm/hpl/hpl_navy.skm", "#26324A", 1.0],
    acrylic_white: ["أكريليك أبيض لامع", "skm/acrylic/acrylic_white.skm", "#FAFAFA", 1.0],
    acrylic_cream: ["أكريليك كريمي لامع", "skm/acrylic/acrylic_cream.skm", "#EFE6D2", 1.0],
    acrylic_grey: ["أكريليك رمادي لامع", "skm/acrylic/acrylic_grey.skm", "#9A9C9E", 1.0],
    acrylic_black: ["أكريليك أسود لامع", "skm/acrylic/acrylic_black.skm", "#121212", 1.0],
    acrylic_champagne: ["أكريليك شامبين لامع", "skm/acrylic/acrylic_champagne.skm", "#D8C3A0", 1.0],
    acrylic_burgundy: ["أكريليك نبيتي لامع", "skm/acrylic/acrylic_burgundy.skm", "#5A1E26", 1.0],
    wood_oak_light: ["خشب أوك فاتح", "skm/wood/wood_oak_light.skm", "#D2B284", 1.0],
    wood_oak_natural: ["خشب أوك طبيعي", "skm/wood/wood_oak_natural.skm", "#B08555", 1.0],
    wood_beech_zan: ["خشب زان", "skm/wood/wood_beech_zan.skm", "#D0A378", 1.0],
    wood_teak: ["خشب تيك", "skm/wood/wood_teak.skm", "#976537", 1.0],
    wood_walnut: ["خشب جوز", "skm/wood/wood_walnut.skm", "#6A4630", 1.0],
    wood_walnut_dark: ["خشب جوز غامق", "skm/wood/wood_walnut_dark.skm", "#472E1A", 1.0],
    wood_ash_grey: ["خشب رمادي (أش)", "skm/wood/wood_ash_grey.skm", "#98928A", 1.0],
    wood_white_washed: ["خشب أبيض مغسول", "skm/wood/wood_white_washed.skm", "#DED6CA", 1.0],
    wood_oak_light_v: ["خشب أوك فاتح - عروق رأسي", "skm/wood/wood_oak_light_v.skm", "#D2B284", 1.0],
    wood_oak_natural_v: ["خشب أوك طبيعي - عروق رأسي", "skm/wood/wood_oak_natural_v.skm", "#B08555", 1.0],
    wood_beech_zan_v: ["خشب زان - عروق رأسي", "skm/wood/wood_beech_zan_v.skm", "#D0A378", 1.0],
    wood_teak_v: ["خشب تيك - عروق رأسي", "skm/wood/wood_teak_v.skm", "#976537", 1.0],
    wood_walnut_v: ["خشب جوز - عروق رأسي", "skm/wood/wood_walnut_v.skm", "#6A4630", 1.0],
    wood_walnut_dark_v: ["خشب جوز غامق - عروق رأسي", "skm/wood/wood_walnut_dark_v.skm", "#472E1A", 1.0],
    wood_ash_grey_v: ["خشب رمادي (أش) - عروق رأسي", "skm/wood/wood_ash_grey_v.skm", "#98928A", 1.0],
    wood_white_washed_v: ["خشب أبيض مغسول - عروق رأسي", "skm/wood/wood_white_washed_v.skm", "#DED6CA", 1.0],
    marble_carrara: ["رخام كرارة", "skm/stone/marble_carrara.skm", "#E6E6E4", 1.0],
    marble_calacatta: ["رخام كالاكاتا", "skm/stone/marble_calacatta.skm", "#EEEBE5", 1.0],
    marble_nero_marquina: ["رخام نيرو ماركينا", "skm/stone/marble_nero_marquina.skm", "#222224", 1.0],
    marble_crema_marfil: ["رخام كريما مارفيل", "skm/stone/marble_crema_marfil.skm", "#E6D9C0", 1.0],
    marble_emperador: ["رخام إمبرادور", "skm/stone/marble_emperador.skm", "#6A5140", 1.0],
    quartz_white_sparkle: ["كوارتز أبيض لامع", "skm/stone/quartz_white_sparkle.skm", "#EFEEEA", 1.0],
    quartz_grey: ["كوارتز رمادي", "skm/stone/quartz_grey.skm", "#9A9A98", 1.0],
    terrazzo: ["تيرازو", "skm/stone/terrazzo.skm", "#E3DED5", 1.0],
    concrete_microcement: ["مايكرو سمنت فاتح", "skm/stone/concrete_microcement.skm", "#A8A49E", 1.0],
    concrete_dark: ["مايكرو سمنت غامق", "skm/stone/concrete_dark.skm", "#6E6C69", 1.0],
    glass_clear: ["زجاج شفاف", "skm/glass/glass_clear.skm", "#D8EEF0", 0.25],
    glass_frosted: ["زجاج سانفريز (مطفي)", "skm/glass/glass_frosted.skm", "#EEF3F3", 0.6],
    glass_smoked: ["زجاج فيميه (مدخّن)", "skm/glass/glass_smoked.skm", "#3A3F44", 0.45],
    glass_bronze: ["زجاج برونز", "skm/glass/glass_bronze.skm", "#7A5A3A", 0.45],
    mirror: ["مراية", "skm/glass/mirror.skm", "#C9D1D6", 1.0],
    alu_silver: ["ألومنيوم فضي", "skm/metal/alu_silver.skm", "#BFC3C7", 1.0],
    alu_black: ["ألومنيوم أسود", "skm/metal/alu_black.skm", "#202020", 1.0],
    alu_gold: ["ألومنيوم دهبي/شامبين", "skm/metal/alu_gold.skm", "#C6A667", 1.0],
    stainless: ["استانلس", "skm/metal/stainless.skm", "#A9ADB1", 1.0],
    copper: ["نحاسي", "skm/metal/copper.skm", "#B26E45", 1.0],
    mdf_raw: ["MDF خام", "skm/other/mdf_raw.skm", "#C7A77F", 1.0],
    back_panel: ["ظهر (6 مم)", "skm/other/back_panel.skm", "#D9D2C5", 1.0],
    led_light: ["إضاءة LED", "skm/other/led_light.skm", "#FFD27A", 1.0],
    wall_paint_white: ["دهان حيطة أبيض", "skm/other/wall_paint_white.skm", "#F2F0EB", 1.0],
};
export function libName(code) {
    const e = LIB[String(code ?? "")];
    return e ? `NOVERA - ${e[0]}` : String(code ?? "");
}
export function libColor(code) {
    return LIB[String(code ?? "")]?.[2];
}
export const WET_OK_WORDS = ["pvc", "فوم", "foam", "أكريليك", "اكريليك", "acrylic", "hpl", "مقاوم", "mr", "wbp", "بولي", "poly",
    "زجاج", "glass", "مراي", "mirror", "ألومنيوم", "الومنيوم", "alu", "ستانلس", "stainless", "كوارتز", "رخام", "بورسلين"];
export function wetOk(name) {
    const n = String(name ?? "").toLowerCase();
    return WET_OK_WORDS.some((w) => n.includes(w.toLowerCase()));
}
/** hinges by door length (NOVERA standard) */
export function hingeCount(len) {
    if (len <= 90)
        return 2;
    if (len <= 160)
        return 3;
    if (len <= 200)
        return 4;
    return 5;
}
export const SLIDE_LENGTHS = [30, 35, 40, 45, 50, 55];
export function slideFor(depthAvailable) {
    const ok = SLIDE_LENGTHS.filter((l) => l <= depthAvailable + 1e-6);
    return ok.length ? Math.max(...ok) : null;
}
export const DEFAULT_MACHINES = {
    saw: { sheet_length: 244.0, sheet_width: 122.0, trim: 1.0, kerf: 0.3, min_piece: 5.0 },
    thicknesses: [0.6, 0.8, 1.0, 1.2, 1.6, 1.8],
    drill: { name: "AS-WOOD SCORPION-3", heads: 3, min_panel_width: 7.0, max_panel_length: 250.0, min_edge_distance: 1.0 },
    cnc: { available: false },
};
let machinesCache = null;
/** Workshop machines (the plugin reads Documents/.../machines.json; the app passes its own settings). */
export function machines() {
    return (machinesCache ??= deepDup(DEFAULT_MACHINES));
}
export function setMachines(over) {
    machinesCache = over ? deepMerge(deepDup(DEFAULT_MACHINES), over) : null;
}
/** fewest layers (max 4) that make `thickness` from available sheets (prefers 18 mm) */
export function laminationFor(thickness, available = machines().thicknesses) {
    const target = rround(thickness * 10);
    const avail = [...new Set(available.map((t) => rround(Number(t) * 10)))].sort((a, b) => a - b).reverse();
    let best = null;
    const count18 = (a) => a.filter((x) => x === 18).length;
    const combos = (remaining, start, acc) => {
        if (acc.length > 4)
            return;
        if (remaining === 0) {
            if (best === null || acc.length < best.length || (acc.length === best.length && count18(acc) > count18(best)))
                best = acc.slice();
            return;
        }
        avail.forEach((t, i) => {
            if (i < start || t > remaining)
                return;
            combos(remaining - t, i, [...acc, t]);
        });
    };
    combos(target, 0, []);
    return best ? best.map((mm) => mm / 10.0) : null;
}
