// Port of lib/panel_engine/templates_rooms.rb — bed, TV unit, dresser, desk.
// Composite products: each box module is built by the generic cabinet template (subUnit).
import { deepDup, deepMerge, fmt, inc } from "../core/ruby.js";
import { rround } from "../core/rubyMath.js";
import * as Schema from "./schema.js";
import { Design } from "./design.js";
import { TemplateBuilder } from "./templates.js";
export const MAX_STRIP = 120.0;
const INHERIT = ["environment", "materials", "edge_banding", "handle", "thickness", "front_thickness", "front_gap", "joints",
    "drawer", "back", "hinge_edge", "rail_width", "plinth"];
export function subUnit(tb, overrides, offset, prefix, tag) {
    let raw = {};
    for (const k of INHERIT)
        raw[k] = deepDup(tb.p[k]);
    raw.template = "cabinet";
    raw = deepMerge(raw, overrides);
    const [sp, errs] = Schema.normalize(raw);
    if (errs.length) {
        for (const e of errs)
            tb.d.errors.push(`${prefix}: ${e}`);
        return null;
    }
    const sd = new Design(sp);
    sd.module_tag = tag;
    new TemplateBuilder(sd, sp).run(false);
    tb.d.import(sd, offset, prefix, tag);
    return sp;
}
/** split a length into equal strips each <= max */
export function strips(total, max = MAX_STRIP) {
    let n = Math.ceil(total / max);
    if (n < 1)
        n = 1;
    return Array.from({ length: n }, (_, i) => [(total * i) / n, (total * (i + 1)) / n]);
}
export function withModule(tb, tag, fn) {
    const old = tb.d.module_tag;
    tb.d.module_tag = tag;
    try {
        fn();
    }
    finally {
        tb.d.module_tag = old;
    }
}
// ================================================================ TV unit
export function buildTv(tb) {
    const { d, p, t, w, h } = tb;
    const tv = p.tv;
    const cols = tv.columns;
    const cw = cols === "none" ? 0.0 : tv.column_width;
    const cd = tv.column_depth;
    const bd = tv.base_depth;
    const bh = tv.base_height;
    const fl = tv.base_float;
    const dmax = Math.max(bd, cols === "none" ? 0.0 : cd);
    p.depth = dmax;
    const left = ["both", "left"].includes(cols);
    const right = ["both", "right"].includes(cols);
    const bx0 = left ? cw : 0.0;
    const bx1 = right ? w - cw : w;
    const bw = bx1 - bx0;
    if (bw < 30) {
        d.errors.push(`مفيش مكان للوحدة الأرضية بين الأعمدة (${fmt(bw)} سم).`);
        return;
    }
    const baseTop = (fl > 0 ? fl : 0.0) + bh;
    if (cols !== "none" && h < baseTop + 20) {
        d.errors.push(`الارتفاع الكلي (${fmt(h)}) أقل من الوحدة الأرضية — كبّره أو شيل الأعمدة.`);
        return;
    }
    const fronts = tv.base_fronts === "drawers" ? [{ type: "drawers", count: 1 }]
        : tv.base_fronts === "doors" ? [{ type: "doors", count: 2, shelves: 0 }] : [{ type: "flap" }];
    const mods = strips(bw, 100.0);
    mods.forEach(([a, b], i) => {
        const ov = { width: b - a, height: bh, depth: bd, fronts, top: "full", mount: fl > 0 ? "wall" : "floor", led_under: tv.led && fl > 0 };
        subUnit(tb, ov, [bx0 + a, dmax - bd, fl > 0 ? fl : 0.0], mods.length > 1 ? `أرضي ${i + 1}` : "أرضي", `base${i}`);
    });
    if (mods.length > 1)
        inc(d.hardware, "مسمار ربط وحدات", 2 * (mods.length - 1));
    const colFronts = (hinge) => tv.column_doors ? [{ type: "doors", count: 1, hinge, shelves: tv.column_shelves }] : [{ type: "open", shelves: tv.column_shelves }];
    for (const [side, on, x, hinge] of [["left", left, 0.0, "left"], ["right", right, w - cw, "right"]]) {
        if (!on)
            continue;
        const cf = colFronts(hinge);
        if (tv.led && !tv.column_doors)
            cf[0].led = true;
        subUnit(tb, { width: cw, height: h, depth: cd, mount: "floor", top: "full", fronts: cf }, [x, dmax - cd, 0.0], side === "left" ? "عمود شمال" : "عمود يمين", `col_${side}`);
    }
    if (!tv.panel)
        return;
    const pt = tv.panel_thickness;
    const pz0 = baseTop;
    const pz1 = Math.min(baseTop + tv.panel_height, cols === "none" ? baseTop + tv.panel_height : h);
    if (pz1 - pz0 < 10) {
        d.warnings.push("البانوه طلع ارتفاعه أقل من 10 سم — اتشال.");
        return;
    }
    const list = strips(bw);
    const mid = Math.trunc(list.length / 2);
    withModule(tb, "panel", () => {
        list.forEach(([a, b], i) => {
            const note = i === mid && tv.cable_hole ? "فتحة كابلات Ø8 خلف الشاشة (تتخرم في الموقع على مكان الحامل)" : null;
            tb.add(list.length > 1 ? `بانوه شاشة ${i + 1}` : "بانوه شاشة", "other", tv.panel_style === "slats" ? "carcass" : "accent", tb.box(bx0 + a, dmax - pt, pz0, bx0 + b, dmax, pz1), { band: ["left", "right", "top", "bottom"], grain: "z", layer: "front", note });
        });
    });
    inc(d.hardware, "زد تعليق بانوه (طقم)", 2 * list.length);
    inc(d.hardware, "حامل شاشة حيطة", 1);
    let faceY = dmax - pt;
    if (tv.panel_style === "slats") {
        const sw = tv.slat_width;
        const gap = tv.slat_gap;
        const n = Math.floor((bw + gap) / (sw + gap));
        const used = n * sw + (n - 1) * gap;
        const start = bx0 + (bw - used) / 2.0;
        const fy = faceY;
        withModule(tb, "slats", () => {
            for (let i = 0; i < n; i++) {
                const x = start + i * (sw + gap);
                tb.add(`شريحة بانوه ${i + 1}`, "other", "accent", tb.box(x, fy - t, pz0, x + sw, fy, pz1), { band: ["left", "right", "top", "bottom"], grain: "z", layer: "front" });
            }
        });
        faceY -= t;
        d.notes.push(`شرايح البانوه ${n} × ${fmt(sw)} سم بمسافة ${fmt(gap)} سم — بتتلزق وتتسمر من ورا.`);
    }
    const ns = Math.trunc(Number(tv.panel_shelves));
    if (ns > 0) {
        const sdp = tv.shelf_depth;
        const swid = Math.min(tv.shelf_width, bw - 10);
        const sx0 = tv.shelves_side === "right" ? bx1 - 5 - swid : bx0 + 5;
        const fy = faceY;
        withModule(tb, "shelves", () => {
            for (let i = 0; i < ns; i++) {
                const z = pz0 + ((pz1 - pz0) * (i + 1)) / (ns + 1);
                tb.add(d.seqName("رف عائم"), "other", "accent", tb.box(sx0, fy - sdp, z, sx0 + swid, fy, z + tv.shelf_thickness), { band: ["front", "left", "right"], grain: "x" });
                if (tv.led)
                    d.addLed(d.seqName("ليد رف عائم"), tb.box(sx0 + 2, fy - sdp + 1.5, z - 0.5, sx0 + swid - 2, fy - sdp + 3.1, z));
            }
        });
        inc(d.hardware, "حامل رف مخفي", 2 * ns);
        d.notes.push(`الأرفف العائمة سمكها ${fmt(tv.shelf_thickness)} سم — بتتركب على حوامل مخفية في الحيطة قبل البانوه.`);
    }
    if (tv.led)
        d.addLed("ليد ورا البانوه", tb.box(bx0 + 3, dmax, pz1 - 3.0, bx1 - 3, dmax + 0.8, pz1 - 1.4));
    d.notes.push("منتصف الشاشة المعتاد 110–120 سم من الأرض (قعدة) — ثبّت الحامل في الحيطة نفسها مش في البانوه.");
    if (list.length > 1)
        d.notes.push(`البانوه ${list.length} شرايح — الفواصل بينهم بتبان؛ لو عايزها مخفية اعمل حليات أو شريط ألومنيوم.`);
}
// ================================================================ bed
export function buildBed(tb) {
    const { d, p, t } = tb;
    const b = p.bed;
    const c = b.clearance;
    const win = b.mattress_width + 2 * c;
    const lin = b.mattress_length + 2 * c;
    const bw = win + 2 * t;
    const bl = lin + 2 * t;
    const bh = b.height;
    const storage = b.storage;
    if (bh < 15) {
        d.errors.push(`ارتفاع السرير ${fmt(bh)} سم صغير قوي.`);
        return;
    }
    let spineX = null;
    withModule(tb, "frame", () => {
        for (const [nm, x0, x1] of [["جنب سرير شمال", 0.0, t], ["جنب سرير يمين", bw - t, bw]]) {
            tb.add(nm, "side", "front", tb.box(x0, 0.0, 0.0, x1, bl, bh), { band: ["top", "front", "back"], grain: "y" });
        }
        tb.add("لوح الرجلين", "side", "front", tb.box(t, 0.0, 0.0, bw - t, t, bh), { band: ["top"], grain: "x" });
        tb.add("لوح الراس (داخلي)", "side", "carcass", tb.box(t, bl - t, 0.0, bw - t, bl, bh), { band: ["top"], grain: "x" });
        const xs = strips(win);
        const split = xs.length > 1;
        spineX = split ? t + xs[0][1] : null;
        const zBottom = storage === "lift" ? t : 0.0;
        if (storage === "lift") {
            xs.forEach(([a, e], i) => {
                tb.add(split ? `قاعدة صندوق ${i + 1}` : "قاعدة صندوق", "horizontal", "carcass", tb.box(t + a, t, 0.0, t + e, bl - t, t), { band: [], grain: "y" });
            });
        }
        if (spineX !== null) {
            tb.add("ضلع أوسط", "divider", "carcass", tb.box(spineX - t / 2, t, zBottom, spineX + t / 2, bl - t, bh - t), { band: [], grain: "y" });
        }
    });
    if (storage === "lift") {
        withModule(tb, "cleats", () => {
            const cz0 = bh - t - 5.0;
            const cz1 = bh - t;
            [[t, t + t], [bw - t - t, bw - t]].forEach(([x0, x1], i) => {
                tb.add(`مسند غطا جنب ${i + 1}`, "cleat", "carcass", tb.box(x0, t + t, cz0, x1, bl - t - t, cz1), { band: [], grain: "y", note: "لزق + مسامير على الجنب" });
            });
            [[t, t + t], [bl - t - t, bl - t]].forEach(([y0, y1], i) => {
                const xsGap = spineX !== null
                    ? [[t + t, spineX - t / 2], [spineX + t / 2, bw - t - t]] : [[t + t, bw - t - t]];
                xsGap.forEach(([x0, x1], j) => {
                    tb.add(`مسند غطا ${i === 0 ? "رجلين" : "راس"} ${j + 1}`, "cleat", "carcass", tb.box(x0, y0, cz0, x1, y1, cz1), { band: [], grain: "x", note: "لزق + مسامير" });
                });
            });
        });
        const key = "lid";
        d.addGroup({ key, kind: "door", name: "غطا السرير", hinge_side: "top",
            hinge: { point: [bw / 2.0, bl - t, bh], axis: [1, 0, 0], free: [bw / 2.0, t, bh], normal: [0, 0, 1] },
            box: tb.box(t, t, bh - t, bw - t, bl - t, bh) });
        withModule(tb, "lid", () => {
            strips(win).forEach(([a, e], i) => {
                tb.add(strips(win).length > 1 ? `غطا صندوق ${i + 1}` : "غطا صندوق", "door", "carcass", tb.box(t + a, t, bh - t, t + e, bl - t, bh), { band: [], group: key, grain: "y", layer: "front" });
            });
        });
        inc(d.hardware, "مكبس غاز سرير + مكانيزم رفع (طقم)", 1);
        d.notes.push("مكانيزم الرفع بيتركب على الجنبين من جوه قرب الراس — اتأكد من طوله حسب طول السرير.");
    }
    else {
        withModule(tb, "frame", () => {
            strips(win).forEach(([a, e], i) => {
                tb.add(strips(win).length > 1 ? `قاعدة مرتبة ${i + 1}` : "قاعدة مرتبة", "horizontal", "carcass", tb.box(t + a, t, bh - t, t + e, bl - t, bh), { band: [], grain: "y" });
            });
        });
    }
    if (b.floating)
        floatBed(tb, bw, bl);
    if (b.headboard)
        buildHeadboard(tb, bw, bl);
    if (!b.floating)
        inc(d.hardware, "لباد تحت الشاسيه", 6);
    p.width = rround(bw + 2 * (b.headboard ? b.headboard_extra : 0.0), 2);
    p.depth = rround(Math.max(...d.parts.map((pt) => pt.box.y1)), 2);
    p.height = rround(Math.max(...d.parts.map((pt) => pt.box.z1)), 2);
    d.notes.push(`المرتبة ${fmt(b.mattress_width)}×${fmt(b.mattress_length)} — الصندوق من جوه ${fmt(win)}×${fmt(lin)} (خلوص ${fmt(c)} سم من كل ناحية).`);
}
function floatBed(tb, bw, bl) {
    const { d, p, t } = tb;
    const b = p.bed;
    const fh = b.float_height;
    const sb = b.float_setback;
    for (const pt of d.parts) {
        if (!["frame", "cleats", "lid"].includes(pt.module ?? ""))
            continue;
        pt.box = { ...pt.box, z0: rround(pt.box.z0 + fh, 4), z1: rround(pt.box.z1 + fh, 4) };
    }
    for (const g of d.groups) {
        if (g.key !== "lid")
            continue;
        g.hinge = { ...g.hinge, point: [g.hinge.point[0], g.hinge.point[1], g.hinge.point[2] + fh], free: [g.hinge.free[0], g.hinge.free[1], g.hinge.free[2] + fh] };
        g.box = { ...g.box, z0: g.box.z0 + fh, z1: g.box.z1 + fh };
    }
    const x0 = sb;
    const x1 = bw - sb;
    const y0 = sb;
    const y1 = bl - sb;
    withModule(tb, "float_base", () => {
        tb.add("قاعدة معلّقة جنب شمال", "side", "carcass", tb.box(x0, y0, 0.0, x0 + t, y1, fh), { band: [], grain: "y" });
        tb.add("قاعدة معلّقة جنب يمين", "side", "carcass", tb.box(x1 - t, y0, 0.0, x1, y1, fh), { band: [], grain: "y" });
        tb.add("قاعدة معلّقة قدام", "side", "carcass", tb.box(x0 + t, y0, 0.0, x1 - t, y0 + t, fh), { band: [], grain: "x" });
        tb.add("قاعدة معلّقة ورا", "side", "carcass", tb.box(x0 + t, y1 - t, 0.0, x1 - t, y1, fh), { band: [], grain: "x" });
    });
    inc(d.hardware, "رجل تسوية للقاعدة", 6);
    if (b.led) {
        d.addLed("ليد تحت السرير قدام", tb.box(3.0, 3.0, fh - 0.5, bw - 3.0, 4.6, fh));
        d.addLed("ليد تحت السرير شمال", tb.box(3.0, 5.0, fh - 0.5, 4.6, bl - 5.0, fh));
        d.addLed("ليد تحت السرير يمين", tb.box(bw - 4.6, 5.0, fh - 0.5, bw - 3.0, bl - 5.0, fh));
    }
    d.notes.push(`السرير المعلّق: القاعدة داخلة ${fmt(sb)} سم وارتفاعها ${fmt(fh)} سم — ثبّت الصندوق عليها بزوايا من جوه.`);
}
function buildHeadboard(tb, bw, bl) {
    const { d, p, t } = tb;
    const b = p.bed;
    const ex = b.headboard_extra;
    const ht = b.headboard_thickness;
    const hh = b.headboard_height;
    const style = b.headboard_style;
    const hx0 = -ex;
    const hx1 = bw + ex;
    const width = hx1 - hx0;
    const uph = b.upholstered ? "تنجيد: فوم 5 سم + قماش على الوش (يتعمل بره الورشة)" : null;
    let frontY = bl;
    withModule(tb, "headboard", () => {
        if (style === "slats") {
            const sw = b.slat_width;
            const gap = b.slat_gap;
            const n = Math.floor((width + gap) / (sw + gap));
            const used = n * sw + (n - 1) * gap;
            const start = hx0 + (width - used) / 2.0;
            for (let i = 0; i < n; i++) {
                const x = start + i * (sw + gap);
                tb.add(`شريحة ضهر ${i + 1}`, "other", "accent", tb.box(x, bl, 0.0, x + sw, bl + t, hh), { band: ["left", "right", "top"], grain: "z", layer: "front" });
            }
            frontY = bl + t;
            backParts(tb, hx0, width, frontY, ht, hh, "ضهر خلفي للشرايح", "carcass", null);
            d.notes.push(`الشرايح ${n} شريحة × ${fmt(sw)} سم بمسافة ${fmt(gap)} سم — بتتلزق وتتسمر من ورا على اللوح الخلفي.`);
        }
        else if (style === "panels") {
            backParts(tb, hx0, width, frontY + t, ht, hh, "ضهر خلفي للبانوهات", "carcass", null);
            const bands = b.panel_rows;
            const gap = 0.6;
            const bhEach = (hh - (bands - 1) * gap) / bands;
            for (let i = 0; i < bands; i++) {
                const z0 = i * (bhEach + gap);
                strips(width).forEach(([a, e], j) => {
                    tb.add(`بانوه ضهر ${i + 1}-${j + 1}`, "other", "accent", tb.box(hx0 + a, bl, z0, hx0 + e, bl + t, z0 + bhEach), {
                        band: ["left", "right", "top", "bottom"], grain: "x", layer: "front", note: uph,
                    });
                });
            }
            frontY = bl + t;
        }
        else {
            backParts(tb, hx0, width, bl, ht, hh, "ضهر سرير", "accent", uph);
        }
    });
    if (b.headboard_shelf) {
        const sd = 12.0;
        withModule(tb, "hb_shelf", () => {
            strips(width, 240.0).forEach(([a, e], i) => {
                tb.add(strips(width, 240.0).length > 1 ? `رف فوق الضهر ${i + 1}` : "رف فوق الضهر", "other", "accent", tb.box(hx0 + a, frontY - sd, hh, hx0 + e, bl + ht + (frontY - bl), hh + t), { band: ["front", "left", "right"], grain: "x" });
            });
        });
        inc(d.hardware, "حامل رف مخفي", 3);
        if (b.led)
            d.addLed("ليد تحت رف الضهر", tb.box(hx0 + 3, frontY - sd + 1.5, hh - 0.5, hx1 - 3, frontY - sd + 3.1, hh));
    }
    else if (b.led) {
        const backY = Math.max(...d.parts.filter((pt) => pt.module === "headboard").map((pt) => pt.box.y1));
        d.addLed("ليد ورا الضهر", tb.box(hx0 + 3, backY, hh - 3.0, hx1 - 3, backY + 0.8, hh - 1.4));
    }
    if (b.side_tables) {
        if (ex < 48) {
            d.warnings.push("الكومودينو المعلّق محتاج الضهر يبقى أعرض من السرير بـ 48 سم على الأقل من كل ناحية — زوّد \"الضهر أعرض من السرير\".");
        }
        else {
            const tw = Math.min(ex - 5.0, 55.0);
            [["كومودينو شمال", -tw - 3.0], ["كومودينو يمين", bw + 3.0]].forEach(([nm, x], i) => {
                subUnit(tb, { width: tw, height: 22.0, depth: 38.0, mount: "wall", top: "full", led_under: b.led, back: { enabled: true },
                    fronts: [{ type: "drawers", count: 1 }] }, [x, bl - 38.0, 38.0], nm, `table${i}`);
            });
        }
    }
    inc(d.hardware, "مسامير ربط ضهر السرير بالشاسيه", 4);
    inc(d.hardware, "زد تعليق ضهر سرير (طقم)", 1);
}
function backParts(tb, x0, width, y0, th, hh, name, mat, note) {
    let list = hh > MAX_STRIP && width > MAX_STRIP ? strips(width) : [[0.0, width]];
    if (width > 240)
        list = strips(width);
    list.forEach(([a, e], i) => {
        tb.add(list.length > 1 ? `${name} ${i + 1}` : name, "other", mat, tb.box(x0 + a, y0, 0.0, x0 + e, y0 + th, hh), {
            band: ["left", "right", "top"], grain: list.length > 1 ? "z" : "x", layer: "front", note,
        });
    });
}
// ================================================================ dresser
export function buildDresser(tb) {
    const { d, p, t, w, dp } = tb;
    const r = p.dresser;
    let bh = r.base_height;
    const zf = p.mount === "wall" ? r.float_height : 0.0;
    subUnit(tb, { width: w, height: bh, depth: dp, mount: p.mount, top: "full", led_under: p.led_under, fronts: p.fronts }, [0.0, 0.0, zf], "وحدة التسريحة", "base");
    bh += zf;
    const mw = Math.min(r.mirror_width, w);
    const mh = r.mirror_height;
    const x0 = (w - mw) / 2.0;
    const z0 = bh + r.mirror_gap;
    withModule(tb, "mirror", () => {
        tb.add("لوح المراية", "other", "front", tb.box(x0, dp - t, z0, x0 + mw, dp, z0 + mh), { band: ["left", "right", "top", "bottom"], grain: "z", layer: "front" });
        tb.add("مراية التسريحة", "mirror", "mirror", tb.box(x0 + 2, dp - t - 0.4, z0 + 2, x0 + mw - 2, dp - t, z0 + mh - 2), { layer: "front", cut_piece: false });
    });
    if (r.mirror_led) {
        d.addLed("ليد ورا المراية فوق", tb.box(x0 + 3, dp, z0 + mh - 4, x0 + mw - 3, dp + 0.8, z0 + mh - 2.4));
        d.addLed("ليد ورا المراية تحت", tb.box(x0 + 3, dp, z0 + 2.4, x0 + mw - 3, dp + 0.8, z0 + 4));
        d.addLed("ليد ورا المراية شمال", tb.box(x0 + 2.4, dp, z0 + 5, x0 + 4, dp + 0.8, z0 + mh - 5));
        d.addLed("ليد ورا المراية يمين", tb.box(x0 + mw - 4, dp, z0 + 5, x0 + mw - 2.4, dp + 0.8, z0 + mh - 5));
        d.notes.push("المراية Backlit: لوح المراية بيتركب على دبل 2 سم بعيد عن الحيطة عشان النور يطلع حواليه.");
    }
    inc(d.hardware, `مراية ${fmt(mw - 4)}×${fmt(mh - 4)} سم`, 1);
    inc(d.hardware, "زد تعليق لوح المراية (طقم)", 1);
    d.notes.push("المراية بتتلزق على اللوح بسيليكون مرايات، واللوح بيتعلّق على الحيطة.");
    p.height = rround(z0 + mh, 2);
}
// ================================================================ desk
export function buildDesk(tb) {
    const { d, p, t, w, dp } = tb;
    const k = p.desk;
    const dh = k.height;
    const ped = k.pedestal;
    const pw = k.pedestal_width;
    withModule(tb, "desk", () => {
        tb.add("سطح المكتب", "horizontal", "front", tb.box(0.0, 0.0, dh - t, w, dp, dh), { band: ["front", "left", "right"], grain: "x" });
    });
    let innerL = t;
    let innerR = w - t;
    for (const [side, x] of [["left", 0.0], ["right", w - pw]]) {
        if (ped === side) {
            subUnit(tb, { width: pw, height: dh - t, depth: dp - 2.0, mount: "floor", top: "full",
                fronts: [{ type: "drawers", count: k.pedestal_drawers }] }, [x, 2.0, 0.0], "وحدة أدراج", "ped");
            if (side === "left")
                innerL = pw;
            else
                innerR = w - pw;
            inc(d.hardware, "مسامير تثبيت السطح على وحدة الأدراج", 4);
        }
        else {
            withModule(tb, "desk", () => {
                const sx = side === "left" ? 0.0 : w - t;
                tb.add(`جنب مكتب ${side === "left" ? "شمال" : "يمين"}`, "side", "front", tb.box(sx, 0.0, 0.0, sx + t, dp, dh - t), { band: ["front"], grain: "z" });
            });
        }
    }
    if (k.modesty && innerR - innerL > 10) {
        withModule(tb, "desk", () => {
            tb.add("لوح أمامي (Modesty)", "divider", "front", tb.box(innerL, dp - 5.0 - t, dh - t - 40.0, innerR, dp - 5.0, dh - t), { band: ["bottom"], grain: "x" });
        });
    }
    const ns = Math.trunc(Number(k.wall_shelves));
    if (ns > 0) {
        const swid = Math.min(w - 20.0, 120.0);
        const sx0 = (w - swid) / 2.0;
        withModule(tb, "wall_shelves", () => {
            for (let i = 0; i < ns; i++) {
                const z = dh + 35.0 + i * 35.0;
                tb.add(d.seqName("رف حيطة"), "other", "front", tb.box(sx0, dp - 25.0, z, sx0 + swid, dp, z + t), { band: ["front", "left", "right"], grain: "x" });
                if (k.led && i === 0)
                    d.addLed(d.seqName("ليد رف حيطة"), tb.box(sx0 + 2, dp - 23.5, z - 0.5, sx0 + swid - 2, dp - 21.9, z));
            }
        });
        inc(d.hardware, "حامل رف مخفي", 2 * ns);
        p.height = dh + 35.0 * ns + t;
    }
    d.notes.push("اعمل فتحة كابلات Ø6 في السطح ورا الشاشة (Grommet).");
    if (!(ns > 0))
        p.height = dh;
}
// ================================================================ v113 — flexible TV wall
// left cabinet · middle (low unit + a wall cladding built out from the wall, with decorative niches) · right cabinet.
// y = 0 is the front of the deepest part, y = D is the wall. Every size comes from p.tvw (see schema TEMPLATE_DEFAULTS.tv_wall).
/** rectangles of [x0, x1] × [z0, z1] minus the holes → pieces (rows split at every hole edge, equal neighbours merged upward) */
export function rectMinus(x0, x1, z0, z1, holes) {
    const zs = [...new Set([z0, z1, ...holes.flatMap((h) => [h.z0, h.z1])].filter((z) => z >= z0 && z <= z1))].sort((a, b) => a - b);
    const rows = [];
    for (let i = 0; i + 1 < zs.length; i++) {
        const a = zs[i], b = zs[i + 1];
        if (b - a < 0.05) continue;
        const cut = holes.filter((h) => h.z0 < b - 0.01 && h.z1 > a + 0.01).map((h) => [Math.max(x0, h.x0), Math.min(x1, h.x1)]).filter(([p, q]) => q > p).sort((u, v) => u[0] - v[0]);
        const segs = [];
        let x = x0;
        for (const [p, q] of cut) { if (p > x + 0.05) segs.push([x, p]); x = Math.max(x, q); }
        if (x1 > x + 0.05) segs.push([x, x1]);
        rows.push({ z0: a, z1: b, segs });
    }
    const out = [];
    let open = [];
    for (const r of rows) {
        const next = [];
        for (const [p, q] of r.segs) {
            const m = open.find((o) => Math.abs(o.x0 - p) < 0.01 && Math.abs(o.x1 - q) < 0.01 && Math.abs(o.z1 - r.z0) < 0.01);
            if (m) { m.z1 = r.z1; next.push(m); } else { const o = { x0: p, x1: q, z0: r.z0, z1: r.z1 }; out.push(o); next.push(o); }
        }
        open = next;
    }
    return out;
}
/** heights of a stack that fits the boards: the main part (splitAt, else as tall as a board leaving ≥ 25 cm on top), then complements ≤ one board */
export function stackHeights(H, maxB, splitAt = 0) {
    if (H <= maxB + 0.01) return [H];
    const first = splitAt > 0 ? Math.min(splitAt, maxB, H - 10) : Math.min(maxB, H - 25);
    const out = [first];
    let rest = H - first;
    while (rest > maxB + 0.01) { out.push(maxB); rest -= maxB; }
    out.push(rest);
    return out;
}
/** cut a face piece into equal columns / rows that fit a board (grain up) */
function splitRect(f, maxW, maxH) {
    const nx = Math.max(1, Math.ceil((f.x1 - f.x0) / maxW - 1e-6)), nz = Math.max(1, Math.ceil((f.z1 - f.z0) / maxH - 1e-6));
    if (nx === 1 && nz === 1) return [f];
    const out = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++)
        out.push({ x0: f.x0 + ((f.x1 - f.x0) * i) / nx, x1: f.x0 + ((f.x1 - f.x0) * (i + 1)) / nx, z0: f.z0 + ((f.z1 - f.z0) * j) / nz, z1: f.z0 + ((f.z1 - f.z0) * (j + 1)) / nz, split: true });
    return out;
}
export function tvWallDims(q) {
    const L = q.left, R = q.right, M = q.mid, C = q.clad;
    const lw = L.on ? +L.width : 0, rw = R.on ? +R.width : 0, mw = +M.width;
    const lowTop = M.low ? +M.z + +M.height : 0;
    const D = Math.max(L.on ? +L.depth : 0, R.on ? +R.depth : 0, M.low ? +M.depth : 0, C.on ? +C.depth + (+C.offset || 0) : 0, 5);
    const H = Math.max(L.on ? +L.z + +L.height : 0, R.on ? +R.z + +R.height : 0, lowTop, C.on ? +C.top : 0, 10);
    return { lw, rw, mw, W: lw + mw + rw, D, H, lowTop };
}
export function buildTvWall(tb) {
    const { d, p, t } = tb;
    const q = p.tvw, L = q.left, R = q.right, M = q.mid, C = q.clad;
    const { lw, mw, W, D, lowTop } = tvWallDims(q);
    p.width = W; p.depth = D;
    // 1) the side cabinets — each one a full cabinet (its own fronts: doors / drawers / flaps / open, heights, shelves, glass)
    // v116: a cabinet taller than one board (q.max_board, 240) is made as the main cabinet + a complement box on top of it (تكملة)
    const maxB = Math.max(100, +q.max_board || 240);
    const sideJoints = [];
    for (const [S, x, nm, tag] of [[L, 0.0, "دولاب شمال", "col_left"], [R, lw + mw, "دولاب يمين", "col_right"]]) {
        if (!S.on) continue;
        const float = +S.z > 0;
        const segs = stackHeights(+S.height, maxB, +S.split_at || 0);
        let z = +S.z;
        segs.forEach((hh, k) => {
            const first = k === 0;
            subUnit(tb, { width: +S.width, height: hh, depth: +S.depth, mount: first && !float ? "floor" : "wall", top: "full",
                fronts: first ? S.fronts : (S.top_fronts?.length ? S.top_fronts : [{ type: "open", count: 1, height: "auto", shelves: 0 }]),
                led_under: first && !!S.led && float }, [x, D - +S.depth, z], first ? nm : `${nm} - تكملة${segs.length > 2 ? ` ${k}` : ""}`, `${tag}${k ? `_t${k}` : ""}`);
            z += hh;
            if (!first) sideJoints.push(z - hh);
        });
        if (segs.length > 1) {
            inc(d.hardware, "مسمار ربط وحدات", 4 * (segs.length - 1));
            d.notes.push(`${nm} ارتفاعه ${fmt(+S.height)} سم أطول من لوح (${fmt(maxB)}) — اتعمل دولاب ${fmt(segs[0])} سم + تكملة ${segs.slice(1).map(fmt).join(" + ")} سم فوقه، بيتربطوا ببعض بمسامير ربط.`);
        }
    }
    // 2) the low middle unit (split into modules of at most 120 cm)
    if (M.low) {
        const mods = strips(mw, Math.max(40, +M.module_max || 120));
        const float = +M.z > 0;
        mods.forEach(([a, b], i) => {
            subUnit(tb, { width: b - a, height: +M.height, depth: +M.depth, mount: float ? "wall" : "floor", top: "full", fronts: M.fronts, led_under: !!M.led && float },
                [lw + a, D - +M.depth, +M.z], mods.length > 1 ? `الوحدة الوسطانية ${i + 1}` : "الوحدة الوسطانية", `mid${i}`);
        });
        if (mods.length > 1) inc(d.hardware, "مسمار ربط وحدات", 2 * (mods.length - 1));
    }
    // 3) the cladding: a face built out from the wall by C.depth over the middle, with the niches cut through it
    if (!C.on) return;
    const cx0 = lw, cx1 = lw + mw;
    const cz0 = M.low ? lowTop + +C.gap : +C.z0, cz1 = +C.top;
    if (cz1 - cz0 < 10) { d.warnings.push("الوحدة المصمتة ارتفاعها أقل من 10 سم — اتشالت."); return; }
    // v116: the solid unit can stand forward of the wall by C.offset (a column / pipe behind it) — its frame either runs back to the wall
    // (closed, default) or keeps its own depth with the gap behind it hidden
    const off = Math.max(0, +C.offset || 0);
    const cd = Math.max(+C.depth, t + 0.6), fy0 = D - cd - off, fy1 = fy0 + t, mat = C.mat || "accent";
    const BK = off > 0 && C.close_back === false ? fy0 + cd : D;
    if (off > 0) d.notes.push(C.close_back === false ? `الوحدة المصمتة طالعة ${fmt(off)} سم عن الحيطة ومفتوحة من ورا — بتتعلّق على كمر/زوايا مخفية في الحيطة.` : `الوحدة المصمتة طالعة ${fmt(off)} سم لقدام وجنابها راجعة لحد الحيطة (بتداري العمود أو الماسورة اللي ورا).`);
    const niches = [];
    (q.niches || []).forEach((n, i) => {
        if (!n || n.on === false) return;
        const w = +n.w, h = +n.h;
        const x0 = n.x === "center" || n.x === "" || n.x == null ? cx0 + (mw - w) / 2 : cx0 + +n.x;
        const z0 = n.z === "center" || n.z === "" || n.z == null ? cz0 + (cz1 - cz0 - h) / 2 : +n.z;
        // w × h = the clear opening; the hole in the face is one board thickness bigger all round (the lining sits in it)
        const r = { i, x0, x1: x0 + w, z0, z1: z0 + h, hx0: x0 - t, hx1: x0 + w + t, hz0: z0 - t, hz1: z0 + h + t, n };
        if (w < 5 || h < 5) { d.warnings.push(`التجويف ${i + 1}: مقاسه صغير قوي — اتشال.`); return; }
        if (r.hx0 < cx0 + t - 0.01 || r.hx1 > cx1 - t + 0.01 || r.hz0 < cz0 + t - 0.01 || r.hz1 > cz1 - t + 0.01) {
            d.errors.push(`التجويف ${i + 1} (${fmt(w)}×${fmt(h)}) طالع برا الوحدة المصمتة — لازم يبعد ${fmt(2 * t)} سم على الأقل عن أطرافها (الوحدة المصمتة من ${fmt(cz0)} لـ ${fmt(cz1)} سم ارتفاع، وعرضها ${fmt(mw)}).`);
            return;
        }
        if (niches.some((o) => o.hx0 < r.hx1 + 3 && r.hx0 < o.hx1 + 3 && o.hz0 < r.hz1 + 3 && r.hz0 < o.hz1 + 3)) {
            d.errors.push(`التجويف ${i + 1} راكب على تجويف تاني — سيب بينهم ${fmt(2 * t + 3)} سم على الأقل.`);
            return;
        }
        niches.push(r);
    });
    // the horizontal joints of a solid unit taller than one board: at the side cabinets' joint when there is one, else by the same rule
    const joints = [];
    if (cz1 - cz0 > maxB + 0.01) {
        const sj = [...new Set(sideJoints.map((z) => rround(z, 2)))].sort((a, b) => a - b).filter((z) => z > cz0 + 30 && z < cz1 - 20);
        let a = cz0;
        for (const z of sj) if (z - a <= maxB + 0.01) { joints.push(z); a = z; }
        while (cz1 - a > maxB + 0.01) { const step = stackHeights(cz1 - a, maxB, 0)[0]; a += step; joints.push(a); }
        d.notes.push(`الوحدة المصمتة ارتفاعها ${fmt(cz1 - cz0)} سم أطول من لوح — اتقسمت على ${joints.length + 1} أجزاء فوق بعض عند ${joints.map(fmt).join(" و ")} سم، وعند كل فاصل لوح أفقي بيربط الجزئين.`);
    }
    const bands = [cz0, ...joints, cz1].map((z, i, arr) => (i + 1 < arr.length ? [z, arr[i + 1]] : null)).filter(Boolean);
    withModule(tb, "clad", () => {
        // the face, cut around the niches
        const holes = niches.map((r) => ({ x0: r.hx0, x1: r.hx1, z0: r.hz0, z1: r.hz1 }));
        // every piece fits a board with its grain standing up: at most 118 wide and one board high (equal columns / rows, joints noted)
        const face = bands.flatMap(([a, b]) => rectMinus(cx0, cx1, a, b, holes)).flatMap((f) => splitRect(f, 118, maxB));
        if (face.some((f) => f.split)) d.notes.push("وش الوحدة المصمتة متقسّم على أكتر من لوح (أقصى لوح 118×240 بالعروق رأسي) — خلّي الفواصل على خط واحد أو اعمل بينهم شريط/حلية.");
        face.forEach((f, i) => tb.add(face.length > 1 ? `وش الوحدة المصمتة ${i + 1}` : "وش الوحدة المصمتة", "other", mat, tb.box(f.x0, fy0, f.z0, f.x1, fy1, f.z1),
            { band: ["left", "right", "top", "bottom"], grain: "z", layer: "front", note: i === 0 ? "بيتربط على الفريم من ورا (مسامير مخفية/لزق) — الفواصل بين الألواح على حروف التجاويف" : null }));
        // the frame behind the face (returns at its ends, top and bottom) holding it off the wall
        const rd = BK - fy1;
        if (rd > 0.5) {
            bands.forEach(([a, b], k) => {
                const sfx = bands.length > 1 ? ` ${k + 1}` : "";
                tb.add(`جنب الوحدة المصمتة شمال${sfx}`, "side", "carcass", tb.box(cx0, fy1, a, cx0 + t, BK, b), { band: [], grain: "z", note: "بيتثبت في الحيطة بزوايا" });
                tb.add(`جنب الوحدة المصمتة يمين${sfx}`, "side", "carcass", tb.box(cx1 - t, fy1, a, cx1, BK, b), { band: [], grain: "z", note: "بيتثبت في الحيطة بزوايا" });
            });
            for (const j of joints)
                for (const [a, b] of strips(mw - 2 * t, maxB))
                    tb.add(d.seqName("عرضية ربط الوحدة المصمتة"), "horizontal", "carcass", tb.box(cx0 + t + a, fy1, j - t, cx0 + t + b, BK, j), { band: [], grain: "x", note: "بتربط الجزء اللي تحت باللي فوق" });
            for (const [a, b] of strips(mw - 2 * t, 240)) {
                const two = mw - 2 * t > 240;
                tb.add(d.seqName(two ? "رأس الوحدة المصمتة" : "رأس الوحدة المصمتة "), "horizontal", "carcass", tb.box(cx0 + t + a, fy1, cz1 - t, cx0 + t + b, BK, cz1), { band: [], grain: "x" });
                tb.add(d.seqName(two ? "قاعدة الوحدة المصمتة" : "قاعدة الوحدة المصمتة "), "horizontal", "carcass", tb.box(cx0 + t + a, fy1, cz0, cx0 + t + b, BK, cz0 + t), { band: [], grain: "x" });
            }
            // a stud every 60 cm keeps a wide face flat
            const n = Math.floor((mw - 2 * t) / 60);
            for (let k = 1; k <= n; k++) {
                const x = cx0 + (mw * k) / (n + 1);
                if (niches.some((r) => x > r.hx0 - t && x < r.hx1 + t)) continue;
                for (const [a, b] of bands)
                    tb.add(d.seqName("عرق الوحدة المصمتة"), "divider", "carcass", tb.box(x - t / 2, fy1, a + (a === cz0 ? t : 0), x + t / 2, BK, b - t), { band: [], grain: "z" });
            }
        }
        inc(d.hardware, "زاوية تثبيت الوحدة المصمتة في الحيطة", 4 + 2 * Math.floor(mw / 60));
        // slats on the face, interrupted by the niches
        if (C.style === "slats") {
            const sw = +C.slat_width, gap = +C.slat_gap;
            const n = Math.floor((mw + gap) / (sw + gap));
            const start = cx0 + (mw - (n * sw + (n - 1) * gap)) / 2;
            let k = 0;
            for (let i = 0; i < n; i++) {
                const x = start + i * (sw + gap);
                for (const f of bands.flatMap(([a, b]) => rectMinus(x, x + sw, a, b, holes.map((h) => ({ ...h, x0: h.x0 - 0.01, x1: h.x1 + 0.01 })))))
                    if (f.x1 - f.x0 > sw - 0.1) tb.add(`شريحة كسوة ${++k}`, "other", C.slat_mat || "carcass", tb.box(f.x0, fy0 - t, f.z0, f.x1, fy0, f.z1), { band: ["left", "right", "top", "bottom"], grain: "z", layer: "front" });
            }
            d.notes.push(`شرايح الوحدة المصمتة ${k} قطعة × ${fmt(sw)} سم بمسافة ${fmt(gap)} سم — بتتلزق وتتسمر من ورا على وش الوحدة المصمتة، ومقطوعة عند التجاويف.`);
        }
        if (C.led) d.addLed("ليد ورا الوحدة المصمتة", tb.box(cx0 + 3, BK - 0.8, cz1 - 3.0, cx1 - 3, BK, cz1 - 1.4));
    });
    // the niches: four lining boards from the face back to the niche back, a back panel, optional shelves + LED
    niches.forEach((r) => {
        const n = r.n, nm = `تجويف ${r.i + 1}`;
        // depth from the face to the niche back (the back board sits on the wall when the niche is as deep as the cladding)
        const by1 = Math.min(fy0 + Math.max(+n.depth || cd, t + 1), BK - t);
        withModule(tb, `niche${r.i}`, () => {
            const lm = n.lining || "accent";
            tb.add(`${nm} - سقف`, "horizontal", lm, tb.box(r.hx0, fy0, r.z1, r.hx1, by1, r.hz1), { band: ["front"], grain: "x" });
            tb.add(`${nm} - قاعدة`, "horizontal", lm, tb.box(r.hx0, fy0, r.hz0, r.hx1, by1, r.z0), { band: ["front"], grain: "x" });
            tb.add(`${nm} - جنب شمال`, "side", lm, tb.box(r.hx0, fy0, r.z0, r.x0, by1, r.z1), { band: ["front"], grain: "z" });
            tb.add(`${nm} - جنب يمين`, "side", lm, tb.box(r.x1, fy0, r.z0, r.hx1, by1, r.z1), { band: ["front"], grain: "z" });
            tb.add(`${nm} - ضهر`, "back", n.back || "accent", tb.box(r.x0, by1, r.z0, r.x1, by1 + t, r.z1), { band: [], grain: r.x1 - r.x0 >= r.z1 - r.z0 ? "x" : "z", note: "ضهر التجويف — لون/خامة مختلفة بتدّيه عمق" });
            const ns = Math.max(0, Math.min(6, Math.trunc(+n.shelves || 0)));
            for (let k = 1; k <= ns; k++) {
                const z = r.z0 + ((r.z1 - r.z0) * k) / (ns + 1) - t / 2;
                tb.add(`${nm} - رف ${k}`, "fixed_shelf", n.shelf_mat || lm, tb.box(r.x0, fy0 + 1, z, r.x1, by1, z + t), { band: ["front"], grain: "x" });
            }
            if (n.led) d.addLed(`ليد ${nm}`, tb.box(r.x0 + 1, fy0 + 1.5, r.z1 - 0.6, r.x1 - 1, fy0 + 3.1, r.z1));
        });
    });
    if (niches.length) d.notes.push(`التجاويف: ${niches.map((r) => `${fmt(r.x1 - r.x0)}×${fmt(r.z1 - r.z0)} على ارتفاع ${fmt(r.z0)} سم`).join(" · ")} — حروف وش الوحدة المصمتة حواليها بتتشرّط.`);
    inc(d.hardware, "حامل شاشة حيطة", 1);
    d.notes.push("حامل الشاشة يتثبت في الحيطة نفسها (أو عرق جوه الوحدة المصمتة) مش في وش الوحدة المصمتة. منتصف الشاشة المعتاد 110–120 سم من الأرض.");
}
// ================================================================ v117/v118 — «قسّم الحيطة»: a wall divided into cells
// p.wc.root is a tree: a split {dir: "v" (columns, left → right) | "h" (rows, top → bottom), parts: [{size: cm | null (shares the rest), node}]}
// or a cell {kind, depth, shelves, count, led, mat, glass, mount, …}. Every cell becomes real boards: a cabinet (doors / open shelves / drawers /
// flap / drawers + doors / wardrobe with a hanging rail / sliding doors), a decorative niche, a solid built-out face (with its own niche),
// a place for an appliance, or nothing.
export const WC_KINDS = { doors: "دولاب ضلف", open: "أرفف مفتوحة", drawers: "أدراج", combo: "أدراج + ضلف", wardrobe: "دولاب هدوم (شماعة)", sliding: "ضلف جرار", flap: "قلاب", niche: "تجويف ديكور", solid: "تكسية مصمتة", device: "مكان جهاز / شاشة", kitchen: "وحدة مطبخ", empty: "فاضي" };
export const WC_BOX = new Set(["doors", "open", "drawers", "flap", "niche", "combo", "wardrobe", "sliding"]);
/** appliances a «device» cell can hold, with their usual opening (w × h) */
export const WC_DEVICES = { tv: ["شاشة", null, null], fridge: ["تلاجة", 75, 185], oven: ["فرن بلت إن", 60, 60], micro: ["ميكرويف بلت إن", 60, 40], washer: ["غسالة", 62, 85], dish: ["غسالة أطباق", 60, 82], other: ["جهاز", null, null] };
/** every cell of the tree with its rectangle (x0..x1 from the left, z0..z1 from the floor); bad sizes → errors */
export function wallCompLayout(wc, W, H, errors = []) {
    const cells = [];
    const walk = (node, x0, x1, z0, z1, path) => {
        if (!node) return;
        if (node.dir === "v" || node.dir === "h") {
            const total = node.dir === "v" ? x1 - x0 : z1 - z0, parts = node.parts || [];
            const fixed = parts.reduce((t, q) => t + (q.size != null && q.size !== "" ? +q.size : 0), 0);
            let autos = parts.filter((q) => q.size == null || q.size === "").length;
            const sizes = parts.map((q) => (q.size == null || q.size === "" ? null : +q.size));
            if (!autos && parts.length && Math.abs(fixed - total) > 0.05) { sizes[sizes.length - 1] = null; autos = 1; } // the last part takes what is left
            const fx = sizes.reduce((t, v) => t + (v ?? 0), 0), each = autos ? (total - fx) / autos : 0;
            if (autos && each < 4.99) errors.push(`المقاسات (${sizes.filter((v) => v != null).join(" + ")}) أكبر من المساحة (${fmt(total)} سم).`);
            let at = node.dir === "v" ? x0 : z1;
            parts.forEach((q, i) => {
                const s = Math.max(0, sizes[i] ?? each);
                if (node.dir === "v") { walk(q.node, at, at + s, z0, z1, [...path, i]); at += s; }
                else { walk(q.node, x0, x1, at - s, at, [...path, i]); at -= s; }
            });
            return;
        }
        cells.push({ x0, x1, z0, z1, node, path });
    };
    walk(wc.root, 0, W, 0, H, []);
    return cells;
}
/** where a solid cell's niche sits (clear opening) — x from the cell's left or centred, z from the floor or centred */
export function wcHoleRect(c, hole) {
    const w = +hole.w || 60, h = +hole.h || 40;
    const x0 = hole.x === "center" || hole.x == null || hole.x === "" ? c.x0 + (c.x1 - c.x0 - w) / 2 : c.x0 + +hole.x;
    const z0 = hole.z === "center" || hole.z == null || hole.z === "" ? c.z0 + (c.z1 - c.z0 - h) / 2 : +hole.z;
    return { x0, x1: x0 + w, z0, z1: z0 + h };
}
/** a solid face built out from the wall by `dd` over [x0, x1] × [z0, z1]: face boards (≤ 118 × one board, grain up) + a frame behind it,
 *  optionally with a niche cut through it (lined, with a back, shelves, LED) */
function wcSolid(tb, c, dd, D, mat, nm, maxB, hole) {
    const { d, t } = tb;
    const fy0 = D - dd, fy1 = fy0 + t, w = c.x1 - c.x0;
    const bands = [];
    { let a = c.z0; for (const hh of stackHeights(c.z1 - c.z0, maxB, 0)) { bands.push([a, a + hh]); a += hh; } }
    let r = null;
    if (hole) {
        const q = wcHoleRect(c, hole);
        r = { ...q, hx0: q.x0 - t, hx1: q.x1 + t, hz0: q.z0 - t, hz1: q.z1 + t };
        if (q.x1 - q.x0 < 5 || q.z1 - q.z0 < 5) { d.warnings.push(`${nm}: التجويف صغير قوي — اتشال.`); r = null; }
        else if (r.hx0 < c.x0 + t - 0.01 || r.hx1 > c.x1 - t + 0.01 || r.hz0 < c.z0 + t - 0.01 || r.hz1 > c.z1 - t + 0.01) {
            d.errors.push(`${nm}: التجويف (${fmt(q.x1 - q.x0)}×${fmt(q.z1 - q.z0)}) طالع برا الخانة — لازم يبعد ${fmt(2 * t)} سم على الأقل عن أطرافها.`);
            r = null;
        }
    }
    const holes = r ? [{ x0: r.hx0, x1: r.hx1, z0: r.hz0, z1: r.hz1 }] : [];
    const face = bands.flatMap(([a, b]) => rectMinus(c.x0, c.x1, a, b, holes)).flatMap((f) => splitRect(f, 118, maxB));
    face.forEach((f, i) => tb.add(face.length > 1 ? `${nm} - وش ${i + 1}` : `${nm} - وش`, "other", mat, tb.box(f.x0, fy0, f.z0, f.x1, fy1, f.z1), { band: ["left", "right", "top", "bottom"], grain: "z", layer: "front" }));
    if (D - fy1 > 0.5 && w > 2 * t + 1) {
        for (const [a, b] of bands) {
            tb.add(`${nm} - جنب شمال`, "side", "carcass", tb.box(c.x0, fy1, a, c.x0 + t, D, b), { band: [], grain: "z", note: "بيتثبت في الحيطة بزوايا" });
            tb.add(`${nm} - جنب يمين`, "side", "carcass", tb.box(c.x1 - t, fy1, a, c.x1, D, b), { band: [], grain: "z", note: "بيتثبت في الحيطة بزوايا" });
        }
        for (const [a, b] of strips(w - 2 * t, maxB)) {
            tb.add(d.seqName(`${nm} - رأس`), "horizontal", "carcass", tb.box(c.x0 + t + a, fy1, c.z1 - t, c.x0 + t + b, D, c.z1), { band: [], grain: "x" });
            tb.add(d.seqName(`${nm} - قاعدة`), "horizontal", "carcass", tb.box(c.x0 + t + a, fy1, c.z0, c.x0 + t + b, D, c.z0 + t), { band: [], grain: "x" });
        }
        for (const [a] of bands.slice(1))
            for (const [p0, p1] of strips(w - 2 * t, maxB)) tb.add(d.seqName(`${nm} - عرضية ربط`), "horizontal", "carcass", tb.box(c.x0 + t + p0, fy1, a - t, c.x0 + t + p1, D, a), { band: [], grain: "x", note: "بتربط الجزء اللي تحت باللي فوق" });
        const n = Math.floor((w - 2 * t) / 60);
        for (let k = 1; k <= n; k++) {
            const x = c.x0 + (w * k) / (n + 1);
            if (r && x > r.hx0 - t && x < r.hx1 + t) continue; // never through the niche
            for (const [a, b] of bands) tb.add(d.seqName(`${nm} - عرق`), "divider", "carcass", tb.box(x - t / 2, fy1, a + (a === c.z0 ? t : 0), x + t / 2, D, b - t), { band: [], grain: "z" });
        }
        inc(d.hardware, "زاوية تثبيت في الحيطة", 4 + 2 * n);
    }
    if (!r) return;
    // the niche: four lining boards from the face back, a back panel (contrast material), shelves, LED in its ceiling
    const lm = hole.lining || "accent";
    const by1 = Math.min(fy0 + Math.max(+hole.depth || dd, t + 1), D - t);
    tb.add(`${nm} - تجويف سقف`, "horizontal", lm, tb.box(r.hx0, fy0, r.z1, r.hx1, by1, r.hz1), { band: ["front"], grain: "x" });
    tb.add(`${nm} - تجويف قاعدة`, "horizontal", lm, tb.box(r.hx0, fy0, r.hz0, r.hx1, by1, r.z0), { band: ["front"], grain: "x" });
    tb.add(`${nm} - تجويف جنب شمال`, "side", lm, tb.box(r.hx0, fy0, r.z0, r.x0, by1, r.z1), { band: ["front"], grain: "z" });
    tb.add(`${nm} - تجويف جنب يمين`, "side", lm, tb.box(r.x1, fy0, r.z0, r.hx1, by1, r.z1), { band: ["front"], grain: "z" });
    tb.add(`${nm} - تجويف ضهر`, "back", hole.back || "accent", tb.box(r.x0, by1, r.z0, r.x1, by1 + t, r.z1), { band: [], grain: r.x1 - r.x0 >= r.z1 - r.z0 ? "x" : "z", note: "ضهر التجويف — لون/خامة مختلفة بتدّيه عمق" });
    const ns = Math.max(0, Math.min(6, Math.trunc(+hole.shelves || 0)));
    for (let k = 1; k <= ns; k++) {
        const z = r.z0 + ((r.z1 - r.z0) * k) / (ns + 1) - t / 2;
        tb.add(`${nm} - تجويف رف ${k}`, "fixed_shelf", lm, tb.box(r.x0, fy0 + 1, z, r.x1, by1, z + t), { band: ["front"], grain: "x" });
    }
    if (hole.led) d.addLed(`ليد ${nm} - تجويف`, tb.box(r.x0 + 1, fy0 + 1.5, r.z1 - 0.6, r.x1 - 1, fy0 + 3.1, r.z1));
    d.notes.push(`${nm}: تجويف ${fmt(r.x1 - r.x0)}×${fmt(r.z1 - r.z0)} على ارتفاع ${fmt(r.z0)} سم — حروف الوش حواليه بتتشرّط.`);
}
/** glass doors: every hinged door of the box becomes a frame (4 members) + a 4 mm glass in a groove (same group → opens as one) */
function wcGlassify(tb, parts) {
    const { d } = tb;
    let n = 0;
    for (const pt of parts) {
        if (pt.role !== "door" || /درج/.test(pt.name) || pt.material === "glass" || !pt.box) continue;
        const b = pt.box, W = b.x1 - b.x0, H = b.z1 - b.z0, fw = Math.min(6, W / 4, H / 4), eng = 0.8, gt = 0.4, ym = (b.y0 + b.y1) / 2;
        d.parts.splice(d.parts.indexOf(pt), 1);
        const side = pt.door_label?.hinge_side || "left";
        const note = `فريم ضلفة زجاج: مفحار ${fmt(gt * 10 + 1)} مم × 8 مم في نص السمك على الحرف الداخلي، الزجاج بيتركب أثناء تجميع الفريم (دويلين في كل ركن)`;
        const mem = { left: ["شمال", b.x0, b.z0 + fw, b.x0 + fw, b.z1 - fw, "z"], right: ["يمين", b.x1 - fw, b.z0 + fw, b.x1, b.z1 - fw, "z"], top: ["فوق", b.x0, b.z1 - fw, b.x1, b.z1, "x"], bottom: ["تحت", b.x0, b.z0, b.x1, b.z0 + fw, "x"] };
        const order = [side, ...["left", "right", "top", "bottom"].filter((k) => k !== side)];
        withModule(tb, pt.module, () => {
            order.forEach((k, i) => {
                const [lbl, x0, z0, x1, z1, gr] = mem[k];
                tb.add(`${pt.name} - فريم ${lbl}`, "door", pt.material, tb.box(x0, b.y0, z0, x1, b.y1, z1), {
                    label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true, layer: "front", group: pt.group, grain: gr,
                    door_label: i === 0 ? pt.door_label : null, note: i === 0 ? note : null,
                });
            });
            tb.add(`${pt.name} - زجاج`, "door", "glass", tb.box(b.x0 + fw - eng, ym - gt / 2, b.z0 + fw - eng, b.x1 - fw + eng, ym + gt / 2, b.z1 - fw + eng), { label_axes: ["x", "z"], band: [], layer: "front", group: pt.group });
        });
        inc(d.hardware, "دوبل خشب 8 مم (فريم زجاج)", 8);
        n++;
    }
    return n;
}
/** the inside of a box just imported: between its sides, over its bottom, under its top, in front of its back */
function wcInner(parts, c) {
    const hz = parts.filter((p) => p.role === "horizontal" && p.box).sort((a, b) => a.box.z0 - b.box.z0);
    const sides = parts.filter((p) => p.role === "side" && p.box);
    const back = parts.filter((p) => p.role === "back" && p.box).sort((a, b) => a.box.y0 - b.box.y0)[0];
    return {
        x0: sides.length ? Math.min(...sides.map((p) => p.box.x1)) : c.x0, x1: sides.length ? Math.max(...sides.map((p) => p.box.x0)) : c.x1,
        z0: hz.length ? hz[0].box.z1 : c.z0, z1: hz.length ? hz[hz.length - 1].box.z0 : c.z1,
        zb: hz.length ? hz[0].box.z0 : c.z0, zt: hz.length ? hz[hz.length - 1].box.z1 : c.z1, yb: back ? back.box.y0 : null,
    };
}
export function buildWallComp(tb) {
    const { d, p, t } = tb;
    const wc = p.wc, W = +p.width, H = +p.height, maxB = Math.max(100, +wc.max_board || 240);
    const errors = [];
    const cells = wallCompLayout(wc, W, H, errors);
    for (const e of errors) d.errors.push(e);
    if (errors.length) return;
    const depthOf = (n) => (n.depth != null && n.depth !== "" ? +n.depth : n.kind === "solid" ? Math.min(30, +wc.depth || 35) : +wc.depth || 35);
    const D = Math.max(5, ...cells.filter((c) => !["device", "empty", "kitchen"].includes(c.node.kind)).map((c) => depthOf(c.node)));
    p.depth = D;
    const ft = +p.front_thickness || 1.8;
    const count = {};
    cells.forEach((c, i) => {
        const n = c.node, k = n.kind, w = c.x1 - c.x0, h = c.z1 - c.z0;
        count[k] = (count[k] || 0) + 1;
        const nm = `${WC_KINDS[k] || k} ${count[k]}`;
        if (k === "empty") return;
        // v119: a kitchen cell is a real kitchen unit made by the kitchen engine (app.js wcSyncKitchen) — nothing is built here
        if (k === "kitchen") { d.notes.push(`${nm}: ${fmt(w)}×${fmt(h)} سم على ارتفاع ${fmt(c.z0)} — وحدة مطبخ لوحدها (كود خاص بيها).`); return; }
        if (k === "device") {
            const dv = WC_DEVICES[n.dev || (n.tv ? "tv" : "other")] || WC_DEVICES.other;
            d.notes.push(`${nm}: مكان ${dv[0]} ${fmt(w)}×${fmt(h)} سم على ارتفاع ${fmt(c.z0)} — فاضي للجهاز${dv[1] && (w < dv[1] - 0.5 || h < dv[2] - 0.5) ? ` ⚠ أصغر من المقاس المعتاد (${dv[1]}×${dv[2]})` : ""}.`);
            if (dv[1] && (w < dv[1] - 0.5 || h < dv[2] - 0.5)) d.warnings.push(`${nm}: مكان ${dv[0]} ${fmt(w)}×${fmt(h)} أصغر من المعتاد (${dv[1]}×${dv[2]} سم) — اتأكد من مقاس الجهاز.`);
            if (n.dev === "tv" || (!n.dev && n.tv)) inc(d.hardware, "حامل شاشة حيطة", 1);
            if (n.dev === "oven" || n.dev === "micro") d.notes.push(`${nm}: سيب فتحة تهوية 5 سم ورا الجهاز وفيشة كهربا في الخانة اللي جنبه.`);
            return;
        }
        if (w < 2 * t + 5 || h < 2 * t + 5) { d.errors.push(`${nm} (${fmt(w)}×${fmt(h)}) صغيرة قوي على إنها تتعمل.`); return; }
        const dd = Math.min(D, Math.max(t + 1, depthOf(n)));
        if (k === "solid") { withModule(tb, `wc${i}`, () => { wcSolid(tb, c, dd, D, n.mat || "accent", nm, maxB, n.hole || null); if (n.led) d.addLed(`ليد ${nm}`, tb.box(c.x0 + 3, D - 0.8, c.z1 - 3, c.x1 - 3, D, c.z1 - 1.4)); }); return; }
        const dCnt = Math.max(1, Math.min(4, Math.round(+n.dcount || 2)));
        const zones = k === "doors" ? [{ type: "doors", count: n.count ?? (w >= 70 ? 2 : 1), height: "auto", shelves: n.shelves ?? 2, hinge: n.hinge || "left" }]
            : k === "drawers" ? [{ type: "drawers", count: n.count ?? Math.max(1, Math.min(6, Math.round(h / 22))), height: "auto", shelves: 0 }]
            : k === "combo" ? [{ type: "drawers", count: dCnt, height: Math.min(+n.dh || Math.min(18 * dCnt, h * 0.45), h - 30) }, { type: "doors", count: n.count ?? (w >= 70 ? 2 : 1), height: "auto", shelves: n.shelves ?? 1, hinge: n.hinge || "left" }]
            : k === "wardrobe" ? [(n.count ?? (w >= 70 ? 2 : 1)) > 0 ? { type: "doors", count: n.count ?? (w >= 70 ? 2 : 1), height: "auto", shelves: 0, hinge: n.hinge || "left" } : { type: "open", count: 1, height: "auto", shelves: 0 }]
            : k === "sliding" ? [{ type: "open", count: 1, height: "auto", shelves: n.shelves ?? Math.max(0, Math.round(h / 40) - 1) }]
            : k === "flap" ? [{ type: "flap", count: 1, height: "auto", shelves: n.shelves ?? 0 }]
            : [{ type: "open", count: 1, height: "auto", shelves: n.shelves ?? (k === "niche" ? 0 : Math.max(0, Math.round(h / 35) - 1)), led: !!n.led }];
        const segs = stackHeights(h, maxB, 0);
        const onFloor = c.z0 < 0.5;
        const mount = onFloor && n.mount !== "flat" ? "floor" : "wall";
        // v118: a cell wider than one box (wc.module_max, 90) is made of equal boxes side by side (shelves don't sag, backs fit a board)
        const nMod = wcModules(w, wc), mw = w / nMod;
        const zonesFor = () => zones.map((zn) => (zn.type === "doors" ? { ...zn, count: wcDoorsPer(n, w, wc) } : zn));
        let innFirst = null;
        for (let m = 0; m < nMod; m++) {
            const mx = c.x0 + m * mw, mNm = nMod > 1 ? `${nm} (${m + 1})` : nm;
            let z = c.z0;
            segs.forEach((hh, j) => {
                const first = j === 0, n0 = d.parts.length, tag = `wc${i}${j ? `_t${j}` : ""}${m ? `_m${m}` : ""}`;
                subUnit(tb, { width: mw, height: hh, depth: dd, mount: first ? mount : "wall", top: "full",
                    fronts: first ? zonesFor(mw) : [{ type: "open", count: 1, height: "auto", shelves: 0 }], led_under: false },
                    [mx, D - dd, z], first ? mNm : `${mNm} - تكملة`, tag);
                const mine = d.parts.slice(n0);
                if (k === "niche" || n.mat) for (const pt of mine) if (["carcass", "shelf", "back"].includes(pt.material)) pt.material = n.mat || "accent";
                if (first && n.glass && (k === "doors" || k === "combo" || k === "wardrobe" || k === "flap")) wcGlassify(tb, mine);
                if (first && k === "wardrobe") withModule(tb, tag, () => wcWardrobe(tb, wcInner(mine, { ...c, x0: mx, x1: mx + mw, z1: c.z0 + hh }), D - dd, n, mNm));
                if (first) innFirst ??= wcInner(mine, { ...c, z1: c.z0 + hh });
                z += hh;
            });
        }
        // sliding doors run over the whole cell, whatever boxes stand behind them
        if (k === "sliding" && innFirst) withModule(tb, `wc${i}`, () => wcSliding(tb, { ...c, z1: c.z0 + segs[0] }, innFirst, D - dd, n, nm, ft));
        if (nMod > 1) { inc(d.hardware, "مسمار ربط وحدات", 3 * (nMod - 1) * segs.length); d.notes.push(`${nm} عرضها ${fmt(w)} سم — اتعملت ${nMod} علب جنب بعض كل واحدة ${fmt(mw)} سم (أقصى علبة ${fmt(+wc.module_max || 90)}) بتتربط ببعض بمسامير ربط.`); }
        if (segs.length > 1) { inc(d.hardware, "مسمار ربط وحدات", 4 * (segs.length - 1) * nMod); d.notes.push(`${nm} ارتفاعها ${fmt(h)} سم أطول من لوح — اتعملت ${segs.map(fmt).join(" + ")} فوق بعض.`); }
        if (!onFloor && n.mount === "floor") d.warnings.push(`${nm} مش على الأرض — اتعملت معلّقة (من غير رجول).`);
    });
    const boxes = cells.filter((c) => WC_BOX.has(c.node.kind));
    if (boxes.length > 1) inc(d.hardware, "مسمار ربط وحدات", 2 * (boxes.length - 1));
    d.notes.push(`الحيطة ${fmt(W)}×${fmt(H)} سم مقسومة على ${cells.length} خانة — كل علبة لوحدها بتتربط في اللي جنبها.`);
}
/** doors on each box of a cell: the typed count is for the whole cell (shared by its boxes), else 2 on a box ≥ 70 wide */
export function wcDoorsPer(n, w, wc) {
    const m = wcModules(w, wc), mw = w / m;
    if (n.count == null || n.count === "") return mw >= 70 ? 2 : 1;
    return m > 1 ? Math.max(1, Math.min(2, Math.round(+n.count / m))) : Math.max(1, Math.min(2, +n.count));
}
/** how many equal boxes a cell of width w is made of (each ≤ wc.module_max, default 120) */
export function wcModules(w, wc) { return Math.max(1, Math.ceil(w / Math.max(40, +wc?.module_max || 90) - 1e-6)); }
/** a wardrobe: a hat shelf + a hanging rail under it (two levels: a middle shelf + a second rail) */
function wcWardrobe(tb, inn, yF, n, nm) {
    const { d, t } = tb;
    const ih = inn.z1 - inn.z0, yb = inn.yb ?? yF + 50, yc = (yF + yb) / 2, len = inn.x1 - inn.x0;
    const two = (+n.rods || 1) >= 2 && ih >= 175;
    if ((+n.rods || 1) >= 2 && !two) d.warnings.push(`${nm}: الارتفاع الداخلي ${fmt(ih)} سم ميكفيش شماعتين (محتاج 175) — اتعملت شماعة واحدة.`);
    if (ih < 95) { d.warnings.push(`${nm}: الارتفاع الداخلي ${fmt(ih)} سم صغير على شماعة.`); return; }
    if (yb - yF < 50) d.warnings.push(`${nm}: العمق الداخلي ${fmt(yb - yF)} سم — أقل من 50، الهدوم مش هتاخد راحتها (خليه 58–60).`);
    const shelf = (z, lbl) => tb.add(`${nm} - ${lbl}`, "fixed_shelf", "shelf", tb.box(inn.x0, yF + 1, z, inn.x1, yb, z + t), { label_axes: ["x", "y"], band: ["front"], grain: "x" });
    const rod = (z, i) => {
        tb.add(`${nm} - ماسورة${two ? ` ${i}` : ""}`, "handle", "handle", tb.box(inn.x0, yc - 1.25, z - 1.25, inn.x1, yc + 1.25, z + 1.25), { cut_piece: false, layer: "shelf", shape: { type: "cylinder_x", cx: (inn.x0 + inn.x1) / 2, cy: yc, cz: z, r: 1.25, length: len } });
        inc(d.hardware, `ماسورة دولاب Ø25 طول ${fmt(len)} سم + 2 حامل`, 1);
    };
    const zs = inn.z1 - Math.min(35, ih * 0.2) - t; // the hat shelf, ~35 cm under the top
    shelf(zs, "رف فوق الشماعة");
    rod(zs - 6, 1);
    if (two) { const zm = inn.z0 + (zs - inn.z0) / 2 - t / 2; shelf(zm, "رف نص"); rod(zm - 6, 2); d.notes.push(`${nm}: شماعتين — فوق وتحت الرف اللي في النص (هدوم قصيرة: قمصان / جاكتات).`); }
    else d.notes.push(`${nm}: شماعة تحت الرف اللي فوق على ${fmt(zs - 6)} سم من أول الدولاب (فساتين / بالطو).`);
}
/** sliding doors in front of an open box: n panels on two tracks overlapping 3 cm (every second panel on the front track) */
function wcSliding(tb, c, inn, yF, n, nm, ft) {
    const { d } = tb;
    const cnt = Math.max(2, Math.min(3, Math.round(+n.count || 2))), ov = 3, W = c.x1 - c.x0, wp = (W + (cnt - 1) * ov) / cnt;
    for (let j = 0; j < cnt; j++) {
        const x0 = c.x0 + j * (wp - ov), front = j % 2 === 1;
        const y1 = front ? yF - ft - 0.9 : yF - 0.4;
        tb.add(`${nm} - ضلفة جرار ${j + 1}`, "sliding_door", "front", tb.box(x0, y1 - ft, inn.zb, x0 + wp, y1, inn.zt), { label_axes: ["x", "z"], band: ["left", "right", "top", "bottom"], band_all_sides: true, layer: "front", grain: "z" });
    }
    if (n.glass) d.notes.push(`${nm}: الضلف الجرار زجاج/مراية — اطلبها من الزجاجاتي بالمقاس ${fmt(wp)}×${fmt(inn.zt - inn.zb)} سم.`);
    inc(d.hardware, `طقم مجرى ضلف جرار (فوق + تحت) ${fmt(W)} سم`, 1);
    inc(d.hardware, "طقم عجل ضلفة جرار", cnt);
    d.notes.push(`${nm}: ${cnt} ضلف جرار ${fmt(wp)} سم عرض، راكبين على بعض 3 سم، على مجريين — المجرى بياخد حوالي ${fmt(2 * ft + 1.3)} سم قدام الدولاب.`);
}
