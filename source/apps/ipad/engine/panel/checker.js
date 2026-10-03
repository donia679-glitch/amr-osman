// Port of lib/panel_engine/checker.rb — machine & material checks per cut piece.
import { fmt } from "../core/ruby.js";
import { sum } from "../core/rubyMath.js";
import * as Catalog from "./catalog.js";
import { AXES, Design } from "./design.js";
const EPS = 0.01;
export function run(design, params, materialNames) {
    const m = Catalog.machines();
    const saw = m.saw;
    const drill = m.drill;
    const thick = m.thicknesses.map(Number);
    const checks = [];
    const add = (level, text, part = null) => {
        checks.push({ level, text, part: part ? part.name : null });
        if (part)
            part.checks.push(text);
    };
    const longMax = Number(saw.sheet_length) - 2 * Number(saw.trim);
    const shortMax = Number(saw.sheet_width) - 2 * Number(saw.trim);
    for (const pt of design.cutParts()) {
        const b = pt.box;
        const thin = design.thinAxisOf(b);
        const tt = design.ext(b, thin);
        const faceAxes = AXES.filter((a) => a !== thin);
        const face = {};
        for (const a of faceAxes)
            face[a] = design.ext(b, a);
        const vals = faceAxes.map((a) => face[a]);
        const big = Math.max(...vals);
        const small = Math.min(...vals);
        if (pt.grain && faceAxes.includes(pt.grain)) {
            const along = face[pt.grain];
            const across = sum(vals) - along;
            if (along > longMax + EPS || across > shortMax + EPS) {
                add("error", `"${pt.name}" (${fmt(along)}×${fmt(across)}) أكبر من اللوح الخام بالعروق — قسّمها أو غيّر اتجاه العروق.`, pt);
            }
        }
        else if (big > longMax + EPS || small > shortMax + EPS) {
            add("error", `"${pt.name}" (${fmt(big)}×${fmt(small)}) أكبر من اللوح الخام ${fmt(saw.sheet_length)}×${fmt(saw.sheet_width)}.`, pt);
        }
        if (!thick.some((x) => Math.abs(x - tt) < EPS)) {
            const layers = Catalog.laminationFor(tt, thick);
            if (layers) {
                add("warn", `"${pt.name}" سمكها ${fmt(tt * 10)} مم — تتعمل ${layers.length} طبقات (${layers.map((x) => fmt(x * 10)).join(" + ")} مم) ملزوقين، والوش الظاهر برّه.`, pt);
            }
            else {
                add("error", `"${pt.name}" سمكها ${fmt(tt * 10)} مم ومش ممكن يتعمل من السماكات المتاحة.`, pt);
            }
        }
        if (small < Number(saw.min_piece) - EPS)
            add("warn", `"${pt.name}" عرضها ${fmt(small)} سم — صغيرة على المنشار، اقطعها من شريحة أعرض.`, pt);
        if (!pt.holes.length)
            continue;
        if (small < Number(drill.min_panel_width) - EPS)
            add("warn", `"${pt.name}" أضيق من أقل عرض السكوربيون يمسكه (${fmt(drill.min_panel_width)} سم) [يتأكد].`, pt);
        if (big > Number(drill.max_panel_length) + EPS)
            add("warn", `"${pt.name}" أطول من أقصى طول على السكوربيون (${fmt(drill.max_panel_length)} سم) [يتأكد].`, pt);
    }
    overlaps(design, add);
    wetMaterials(params, materialNames, design, add);
    shapes(design, add);
    return checks;
}
const SKIP_OVERLAP = ["back", "drawer_bottom"];
function overlaps(design, add) {
    const list = design.cutParts().filter((pt) => !SKIP_OVERLAP.includes(pt.role));
    list.forEach((a, i) => {
        for (const b of list.slice(i + 1)) {
            const v = AXES.map((ax) => Math.min(a.box[`${ax}1`], b.box[`${ax}1`]) - Math.max(a.box[`${ax}0`], b.box[`${ax}0`]));
            if (!v.every((x) => x > 0.05))
                continue;
            add("error", `"${a.name}" داخلة في "${b.name}" (تداخل ${v.map((x) => fmt(x)).join("×")} سم).`, a);
        }
    });
}
function wetMaterials(params, names, design, add) {
    if (params.environment !== "wet")
        return;
    const used = [...new Set(design.cutParts().map((pt) => pt.material))];
    if (params.edge_banding)
        used.push("banding");
    for (const k of used) {
        const nm = String(names[k] ?? "");
        if (Catalog.wetOk(nm))
            continue;
        const label = Catalog.MATERIAL_KEYS[k]?.label ?? k;
        add("warn", `خامة ${label} "${nm}" مش باين إنها مقاومة للرطوبة — في الحمام استخدم فوم بورد / PVC / أكريليك / HPL.`);
    }
}
function shapes(design, add) {
    if (Catalog.machines().cnc?.available)
        return;
    for (const pt of design.cutParts()) {
        if (pt.shape.type === "box")
            continue;
        if (pt.shape.router_ok)
            add("warn", `"${pt.name}" شكلها مقوّس — تتقص بالفريزة بفرجار (Trammel) أو بشبلونة، أو على CNC.`, pt);
        else
            add("error", `"${pt.name}" شكلها مش مستطيل — محتاجة CNC (مش متاحة).`, pt);
    }
}
