export const GROUP = "الترابيزات";
export const TEMPLATES = {
    coffee_table: { label: "ترابيزة انتريه (وسط)", group: GROUP },
    side_table: { label: "ترابيزة جانبية (ركنة)", group: GROUP },
    dining_table: { label: "ترابيزة سفرة", group: GROUP },
    office_table: { label: "ترابيزة مكتب", group: GROUP },
    meeting_table: { label: "ترابيزة اجتماعات", group: GROUP },
    console_table: { label: "كونسول (ترابيزة مدخل)", group: GROUP },
};
export const KEYS = Object.keys(TEMPLATES);
export const SHAPES = {
    rect: "مستطيل",
    rounded: "مستطيل بأركان مدوّرة",
    round: "دايرة",
    oval: "بيضاوي",
    stadium: "كبسولة (أطراف نص دايرة)",
    boat: "قارب (جوانب مقوّسة)",
};
export const BASES = {
    slab: "لوحين جانبيين (Slab)",
    waterfall: "الحرف النازل (Waterfall)",
    box: "قاعدة صندوق",
    cross: "قاعدة صليب +",
    pedestals: "أعمدة صندوق",
    frame: "رجول برواز",
    legs4: "4 رجول مربعة + برواز",
};
export const STRETCHERS = { center: "في النص", back: "ورا", none: "من غير" };
export const HEIGHT_RANGE = {
    coffee_table: [33, 48], side_table: [42, 66], dining_table: [72, 78],
    office_table: [70, 78], meeting_table: [72, 78], console_table: [74, 92],
};
export const BASE = {
    shape: "rect", corner_radius: 6.0, top_thickness: 3.6,
    base: "slab", leg_thickness: 3.6, overhang_x: 10.0, overhang_y: 6.0,
    base_width: 0.0, base_depth: 0.0,
    columns: 2, column_size: 40.0, frame_width: 6.0, leg_size: 7.2,
    stretcher: "center", stretcher_height: 12.0, modesty: false,
    shelf: false, shelf_height: 12.0,
    drawer: false, drawer_height: 14.0,
    grommets: 0, power_box: false, led: false,
};
function defaults(w, d, h, table) {
    return {
        environment: "dry", width: w, height: h, depth: d, mount: "floor",
        handle: "bar", fronts: [], back: { enabled: false },
        table: { ...BASE, ...table },
    };
}
export const TEMPLATE_DEFAULTS = {
    coffee_table: defaults(120.0, 60.0, 40.0, { base: "waterfall", shelf: true, shelf_height: 10.0, stretcher: "none" }),
    side_table: defaults(50.0, 50.0, 55.0, { shape: "round", base: "pedestals", columns: 1, column_size: 28.0, stretcher: "none" }),
    dining_table: defaults(180.0, 90.0, 75.0, { base: "slab", overhang_x: 20.0 }),
    office_table: defaults(150.0, 70.0, 76.0, { base: "slab", overhang_x: 3.0, overhang_y: 3.0, stretcher: "back", modesty: true, grommets: 1, drawer: true }),
    meeting_table: defaults(300.0, 120.0, 75.0, { shape: "stadium", base: "pedestals", columns: 3, column_size: 45.0, overhang_x: 45.0,
        stretcher: "center", stretcher_height: 35.0, grommets: 3, power_box: true }),
    console_table: defaults(120.0, 35.0, 80.0, { base: "waterfall", shelf: true, shelf_height: 15.0, stretcher: "back", stretcher_height: 10.0, top_thickness: 3.6 }),
};
export const FIELDS = [
    ["table.shape", "شكل السطح", "choice", SHAPES],
    ["table.corner_radius", "تدوير الأركان (للمدوّر)", "num", undefined, 0, 60],
    ["table.top_thickness", "سمك السطح", "num", undefined, 1.6, 7.2],
    ["table.base", "القاعدة", "choice", BASES],
    ["table.leg_thickness", "سمك ألواح القاعدة", "num", undefined, 1.6, 7.2],
    ["table.overhang_x", "بروز السطح يمين/شمال", "num", undefined, 0, 80],
    ["table.overhang_y", "بروز السطح قدام/ورا", "num", undefined, 0, 60],
    ["table.base_width", "عرض القاعدة (0 = تلقائي)", "num", undefined, 0, 400],
    ["table.base_depth", "عمق القاعدة (0 = تلقائي)", "num", undefined, 0, 200],
    ["table.columns", "عدد الأعمدة", "int", undefined, 1, 4],
    ["table.column_size", "مقاس العمود", "num", undefined, 15, 90],
    ["table.frame_width", "عرض شريحة البرواز", "num", undefined, 3, 15],
    ["table.leg_size", "مقاس الرجل المربعة (مصمتة)", "num", undefined, 5, 12],
    ["table.stretcher", "العارضة تحت السطح", "choice", STRETCHERS],
    ["table.stretcher_height", "ارتفاع العارضة / البرواز", "num", undefined, 5, 50],
    ["table.modesty", "لوح ساتر (Modesty) بارتفاع 40", "bool"],
    ["table.shelf", "رف تحت", "bool"],
    ["table.shelf_height", "ارتفاع الرف من الأرض", "num", undefined, 3, 60],
    ["table.drawer", "درج تحت السطح", "bool"],
    ["table.drawer_height", "ارتفاع الدرج", "num", undefined, 14, 25],
    ["table.grommets", "فتحات كابلات Ø6", "int", undefined, 0, 6],
    ["table.power_box", "علبة كهرباء/داتا في السطح", "bool"],
    ["table.led", "ليد تحت السطح", "bool"],
];
export const LIVE = ["table.shape", "table.base", "table.shelf", "table.drawer", "table.led", "table.columns", "table.grommets"];
export const SPECIAL = Object.fromEntries(KEYS.map((k) => [k, { hide: ["fronts", "plinth"], fields: FIELDS, live: LIVE }]));
export const isTable = (template) => KEYS.includes(String(template ?? ""));
