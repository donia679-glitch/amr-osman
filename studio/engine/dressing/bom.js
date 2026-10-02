// @ts-nocheck — restored from the compiled app build (types to be re-added)
// Port of the pure part of lib/dressing_system/bom.rb — BOM.compute: the dressing supply order
// (hardware, material pieces/area per material+thickness, edge-banding meters, glass/mirror list)
// recomputed live from each unit's params. The HTML/SketchUp parts are not ported.
import { inc } from "../core/ruby.js";
import { rround, sum } from "../core/rubyMath.js";
import { compute as layoutCompute } from "./layout.js";
import { fmt } from "./schema.js";
export function compute(entries, labelName) {
    const hw = {};
    const mats = {};
    let bandingM = 0.0;
    const glass = {};
    const units = [];
    const errors = [];
    for (const [uname, params] of entries) {
        const res = layoutCompute(params);
        if (!res.ok) {
            errors.push(`${uname}: ${res.errors[0] ?? ""}`);
            continue;
        }
        const p = res.params;
        const parts = res.parts;
        const doors = res.groups.filter((g) => g.kind === "door");
        const drawers = res.groups.filter((g) => g.kind === "drawer");
        const hingeN = sum(parts.map((pt) => (pt.door_label ? pt.door_label.hinge_ratios.length : 0)));
        const flips = doors.filter((g) => g.hinge_side === "top").length;
        const verticalHinges = sum(parts.filter((pt) => pt.door_label && pt.door_label.hinge_side !== "top")
            .map((pt) => pt.door_label.hinge_ratios.length));
        inc(hw, "مفصلة ضلفة", verticalHinges);
        inc(hw, "مفصلة قلاب", hingeN - verticalHinges);
        inc(hw, "ذراع رفع ضلفة قلاب (طقم)", flips);
        const glassDoors = doors.filter((g) => ["glass_wood", "glass_alu", "mirror_alu"].includes(g.style)).length;
        if (glassDoors > 0)
            inc(hw, "ضلف زجاج/مراية (اتأكد من نوع المفصلة المناسبة)", glassDoors);
        for (const dg of drawers)
            inc(hw, `مجرى درج ${fmt(dg.slide_len ?? 0)} سم (زوج)`, 1);
        const cams = parts.filter((pt) => pt.role === "hole" && String(pt.name).includes("قفل كام")).length;
        inc(hw, "أليتا — قفل كام", cams);
        inc(hw, "أليتا — مسمار/برغي كام", cams);
        inc(hw, "أليتا — دويلين (خابور)", cams * 2);
        const pins = sum(parts.map((pt) => (pt.holes ?? []).filter((hl) => hl.kind === "pin").length));
        inc(hw, "بنز رف", pins);
        for (const r of parts.filter((pt) => pt.role === "rail")) {
            const len = rround(r.box.x1 - r.box.x0, 1);
            inc(hw, `شماعة ${fmt(len)} سم`, 1);
            inc(hw, "حامل شماعة", 2);
        }
        for (const key of ["handle_hardware", "led_hardware", "plinth_hardware"]) {
            for (const [k, v] of Object.entries(res.summary[key] ?? {}))
                hw[k] = rround((hw[k] ?? 0) + v, 3);
        }
        const spacers = parts.filter((pt) => pt.role === "spacer").length;
        if (spacers > 0)
            inc(hw, "حشوة مجرى (قطعة خشب — موجودة في قايمة القص)", spacers);
        for (const pt of parts) {
            if (!(pt.cut_piece && pt.label))
                continue;
            const lb = pt.label;
            if (pt.material === "glass" || pt.material === "mirror") {
                const kind = pt.material === "glass" ? "زجاج" : "مراية";
                inc(glass, `${kind} ${fmt(lb.w)} × ${fmt(lb.h)} سم (سمك ${fmt(lb.t * 10)} مم)`, 1);
                continue;
            }
            const key = `${labelName(p, pt.material)} — سمك ${fmt(lb.t)} سم`;
            mats[key] ??= { count: 0, area: 0.0 };
            mats[key].count += 1;
            mats[key].area += (lb.w * lb.h) / 10_000.0;
            const bd = lb.banded;
            bandingM += ((bd.top ? lb.w : 0) + (bd.bottom ? lb.w : 0) + (bd.left ? lb.h : 0) + (bd.right ? lb.h : 0)) / 100.0;
        }
        units.push({
            name: uname, size: `${fmt(p.width)} × ${fmt(p.height)} × ${fmt(p.depth)}`,
            doors: doors.length, drawers: drawers.length, pieces: parts.filter((pt) => pt.cut_piece).length,
        });
    }
    for (const k of Object.keys(hw))
        if (hw[k] === 0)
            delete hw[k];
    return { units, hardware: hw, materials: mats, banding_m: rround(bandingM, 2), glass, errors };
}
