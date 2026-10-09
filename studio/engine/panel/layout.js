// Port of lib/panel_engine/layout.rb — the single compute entry point:
//   compute(params) -> { ok, errors, warnings, checks, notes, zones, parts, groups, hardware, summary, ... }
import { basenameNoExt, fmt, has } from "../core/ruby.js";
import { rround } from "../core/rubyMath.js";
import * as Catalog from "./catalog.js";
import * as Schema from "./schema.js";
import * as Checker from "./checker.js";
import { AXES, Design } from "./design.js";
import { TemplateBuilder } from "./templates.js";
export function compute(raw) {
    let params;
    try {
        const [p, errors] = Schema.normalize(raw);
        params = p;
        if (errors.length)
            return failure(p, errors);
        const design = new Design(p);
        new TemplateBuilder(design, p).run();
        if (design.errors.length)
            return failure(p, design.errors, design.warnings);
        sanity(design);
        if (design.errors.length)
            return failure(p, design.errors, design.warnings);
        design.finishLed();
        design.buildJoints();
        const names = materialNames(p);
        const checks = Checker.run(design, p, names);
        const hardware = {};
        for (const [k, v] of Object.entries(design.hardware))
            if (Number(v) !== 0)
                hardware[k] = v;
        return {
            ok: true,
            errors: [],
            warnings: [...new Set(design.warnings)],
            checks,
            notes: [...new Set(design.notes)],
            zones: design.zone_marks,
            parts: design.parts,
            groups: design.groups,
            hardware,
            summary: summary(design, p, names),
            material_names: names,
            material_colors: materialColors(p),
            params: p,
        };
    }
    catch (e) {
        return failure(params ?? {}, [`خطأ داخلي في الحسابات: ${e.message}`]);
    }
}
function failure(params, errors, warnings = []) {
    return { ok: false, errors, warnings, checks: [], notes: [], parts: [], groups: [], hardware: {}, summary: {},
        material_names: {}, material_colors: {}, params };
}
function sanity(design) {
    for (const pt of design.parts) {
        const b = pt.box;
        if (!AXES.some((a) => b[`${a}1`] - b[`${a}0`] <= 0.001))
            continue;
        design.errors.push(`القطعة "${pt.name}" طلعت بمقاس صفر أو سالب — راجع المقاسات.`);
    }
}
const rootKey = (key) => {
    let root = key;
    while (Catalog.MATERIAL_KEYS[root]?.fallback)
        root = Catalog.MATERIAL_KEYS[root].fallback;
    return root;
};
/** material name per key: typed name -> library -> SKM file -> parent key -> environment default */
export function materialNames(params) {
    const env = params.environment;
    const cfg = params.materials ?? {};
    const out = {};
    for (const key of Object.keys(Catalog.MATERIAL_KEYS)) {
        let k = key;
        const seen = [];
        let name = null;
        while (k && !seen.includes(k)) {
            seen.push(k);
            const e = cfg[k] ?? {};
            name = String(e.name ?? "").trim();
            if (name === "" && String(e.lib ?? "").trim() !== "")
                name = Catalog.libName(e.lib);
            if (name === "" && String(e.skm ?? "").trim() !== "")
                name = basenameNoExt(String(e.skm));
            if (name !== "")
                break;
            k = Catalog.MATERIAL_KEYS[k]?.fallback ?? null;
        }
        if (name === null || name === "") {
            name = Catalog.DEFAULT_MATERIALS[env]?.[rootKey(key)]?.[0] ?? Catalog.DEFAULT_MATERIALS[env]?.[key]?.[0] ?? "خامة افتراضية";
        }
        out[key] = name;
    }
    return out;
}
export function materialColors(params) {
    const env = params.environment;
    const cfg = params.materials ?? {};
    const out = {};
    for (const key of Object.keys(Catalog.MATERIAL_KEYS)) {
        let k = key;
        const seen = [];
        let hex;
        while (k && !seen.includes(k) && hex === undefined) {
            seen.push(k);
            const e = cfg[k] ?? {};
            if (String(e.lib ?? "") !== "")
                hex = Catalog.libColor(e.lib);
            k = Catalog.MATERIAL_KEYS[k]?.fallback ?? null;
        }
        if (!hex) {
            const rgb = Catalog.DEFAULT_MATERIALS[env]?.[rootKey(key)]?.[1] ?? Catalog.DEFAULT_MATERIALS[env]?.[key]?.[1] ?? [220, 214, 200];
            hex = "#" + rgb.map((c) => c.toString(16).toUpperCase().padStart(2, "0")).join("");
        }
        out[key] = hex;
    }
    return out;
}
function summary(design, params, names) {
    const cut = design.cutParts();
    const mats = {};
    for (const pt of cut) {
        const lb = pt.label;
        const key = `${names[pt.material] ?? pt.material} — ${fmt(lb.t * 10)} مم`;
        if (!has(mats, key))
            mats[key] = { count: 0, area: 0.0 };
        mats[key].count += 1;
        mats[key].area += (lb.w * lb.h) / 10000.0;
    }
    const sheet = Catalog.machines().saw;
    const sheetArea = (Number(sheet.sheet_length) * Number(sheet.sheet_width)) / 10000.0;
    for (const v of Object.values(mats)) {
        v.area = rround(v.area, 2);
        v.sheets = Math.ceil(v.area / (sheetArea * 0.85));
    }
    return {
        template: params.template,
        template_label: Schema.TEMPLATES[params.template]?.label ?? null,
        outer: { width: params.width, height: params.height, depth: params.depth },
        environment: params.environment,
        piece_count: cut.length,
        // + the doors / drawers of a studio cabinet (template "free": parts, no groups — templates.js freeHardware)
        door_count: design.groups.filter((g) => g.kind === "door").length + (design.free_counts?.doors ?? 0),
        drawer_count: design.groups.filter((g) => g.kind === "drawer").length + (design.free_counts?.drawers ?? 0),
        banding_m: design.bandingMeters(),
        materials: mats,
        cut_list: cut.map((pt) => {
            const lb = pt.label;
            return { name: pt.name, material: names[pt.material] ?? pt.material, w: lb.w, h: lb.h, t: lb.t,
                banded: lb.banded, all_band: pt.band_all_sides, holes: pt.holes.length, note: pt.note, checks: pt.checks };
        }),
    };
}
