// Port of the parts of lib/hardware_bom.rb the recorder uses: HardwareBOM.empty_stats,
// add_leg_or_hanger_hardware and scan_entities (counts doors/hinges/drawers/… from the model).
import { localDimensionsCm } from "./helpers.js";
import { hingeCount } from "../handles/catalog.js";
import { ComponentInstance, Entities, Group } from "./su/model.js";
/** NOVERA: one hinge rule for every engine (handles/catalog.js hingeCount) — ≤ 90 → 2, ≤ 160 → 3, ≤ 200 → 4, else 5 */
export function hingesForHeightCm(h) {
    return hingeCount(h);
}
/** the user's own hinge count (the «عدد الكبب» field) — 0 / empty = by the door's length */
export function explicitHingeCount(params) {
    const n = parseInt(String(params?.["hinge_cup_count"] ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? Math.min(Math.max(n, 2), 6) : 0;
}
/** hinges of one door: the explicit count, else the rule on its height (a flip-up: on its width) */
export function hingesForDoor(lenCm, params) {
    return explicitHingeCount(params) || hingeCount(lenCm);
}
/** NOVERA concealed soft-close tandem runners come in 30 / 35 / 40 / 45 / 50 / 55 cm — the longest that fits the box */
export const RUNNER_LENGTHS = [30, 35, 40, 45, 50, 55];
export function runnerLength(depthCm) {
    return [...RUNNER_LENGTHS].reverse().find((L) => L <= depthCm + 0.5) ?? RUNNER_LENGTHS[0];
}
/** the hardware line of a runner pair (same wording as the dressing engine's bom) */
export function runnerName(L) {
    return `مجرى درج ${L} سم (زوج)`;
}
export const RUNNER_RE = /^مجرى درج (\d+) سم \(زوج\)$/;
/** a drawer group's box depth: its deepest side board («… جنب …») */
function drawerBoxDepthCm(e) {
    let best = 0;
    try {
        for (const c of e.definition.entities.list)
            if ((c instanceof Group || c instanceof ComponentInstance) && /جنب/.test(c.name) && c.name !== e.name)
                best = Math.max(best, localDimensionsCm(c).depth);
    }
    catch (_e) { }
    return best;
}
/** no box built (drawer boxes off): the box the unit would take — drawer_box_depth, else the inside depth less 8 cm */
function fallbackBoxDepth(params) {
    const p = params ?? {};
    const bd = Number(p["drawer_box_depth"]) || 0;
    const inside = (Number(p["depth"]) || 58) - 8;
    return bd > 0 ? Math.min(bd, inside) : inside;
}
export function emptyStats() {
    return { doors: 0, hinges: 0, lift_arms: 0, drawers: 0, assembly_sets: 0, shelves: 0, dividers: 0, legs: 0, wall_hangers: 0 };
}
function hiddenEntity(e) {
    return !e.visible || (e.layer && !e.layer.visible);
}
export function scanEntities(ctx, entities, stats, params = null) {
    try {
        for (const e of entities.list.slice()) {
            if (!(e instanceof Group || e instanceof ComponentInstance))
                continue;
            if (hiddenEntity(e))
                continue;
            if (e.getAttribute("KUD", "is_door", false)) {
                stats.doors += 1;
                // a flip-up turns about a horizontal axis: its hinges run along its width
                const flip = Math.abs(Number(e.getAttribute("KUD", "axis_z", 1)) || 0) < 0.5;
                const dims = localDimensionsCm(e);
                const len = flip ? Math.max(dims.width, dims.depth) : dims.height;
                const own = Number(e.getAttribute("KUD", "hinge_count", 0)) || 0;
                // v127: a flap zone's front names its own lift mechanism (an Aventos HL carries the flap on its arms — no hinges)
                const lift = String(e.getAttribute("KUD", "lift_kind", "") ?? "");
                if (lift) {
                    stats.lifts = stats.lifts ?? {};
                    stats.lifts[lift] = (stats.lifts[lift] ?? 0) + 1;
                    if (lift !== "aventos_hl")
                        stats.hinges += own > 0 ? own : hingesForDoor(len, params);
                }
                else {
                    stats.hinges += own > 0 ? own : hingesForDoor(len, params);
                    if (flip)
                        stats.lift_arms += 1;
                }
            }
            else if (e.getAttribute("KUD", "is_drawer", false)) {
                stats.drawers += 1;
                // NOVERA: the runner pair is bought by length — the longest standard one that fits the box (30–55)
                const L = runnerLength(drawerBoxDepthCm(e) || fallbackBoxDepth(params));
                stats.runners = stats.runners ?? {};
                stats.runners[L] = (stats.runners[L] ?? 0) + 1;
            }
            const name = e.name;
            if (name.includes("ثقب تجميع"))
                stats.assembly_sets += 1;
            if (name.includes("قاطوع رأسي"))
                stats.dividers += 1;
            // v186: "رف" as a whole word only ("(حرف)" in aleta hole names used to count as a shelf)
            if (name.split(/[\s\-–]+/).includes("رف") && !/^(ثقب|خرم|كبة)/.test(name))
                stats.shelves += 1;
            scanEntities(ctx, e.definition.entities, stats, params);
        }
    }
    catch (err) {
        ctx.puts(`[KitchenUnitDesigner] HardwareBOM scan warning: ${err.message}`);
    }
}
export function addLegOrHangerHardware(ctx, unit, stats) {
    const raw = unit.getAttribute("KUD", "params_json", null);
    if (!raw)
        return;
    try {
        const params = JSON.parse(String(raw));
        let ut = params["unit_type"] == null ? "" : String(params["unit_type"]);
        if (ut === "")
            ut = "base";
        if (ut === "wall")
            stats.wall_hangers += 2;
        else
            stats.legs += 4;
    }
    catch (err) {
        ctx.puts(`[KitchenUnitDesigner] add_leg_or_hanger_hardware warning: ${err.message}`);
    }
}
/** the recorder's `hardware(group)` */
export function scanHardware(ctx, group) {
    const stats = emptyStats();
    addLegOrHangerHardware(ctx, group, stats);
    let params = null;
    try {
        const raw = group.getAttribute("KUD", "params_json", null);
        params = raw ? JSON.parse(String(raw)) : null;
    }
    catch (_e) {
        params = null;
    }
    scanEntities(ctx, group.entities, stats, params);
    return stats;
}
/** v127: the flap-zone lift mechanisms (same wording as categories.js FLAP_LIFTS) */
export const LIFT_LABELS = { aventos_hk: "مكانيزم رفع قلاب Aventos HK (طقم)", aventos_hl: "مكانيزم رفع موازي Aventos HL (طقم)", gas: "مكبس غاز للقلاب (زوج)", stay: "ذراع قلاب ميكانيكي بفرامل (زوج)" };
/** HardwareBOM.hardware_rows (labels/quantities; prices live in the app) */
export function hardwareRows(stats) {
    const rows = [];
    const add = (k, label) => {
        if (stats[k] > 0)
            rows.push({ label, qty: stats[k] });
    };
    add("hinges", "مفصلات");
    add("lift_arms", "ذراع رفع قلاب (طقم)");
    for (const [k, q] of Object.entries(stats.lifts ?? {}))
        rows.push({ label: LIFT_LABELS[k] ?? "ذراع رفع قلاب (طقم)", qty: q });
    if (stats.drawers > 0) {
        const per = stats.runners ?? { [runnerLength(45)]: stats.drawers };
        for (const L of Object.keys(per).map(Number).sort((a, b) => a - b))
            rows.push({ label: runnerName(L), qty: per[L] });
    }
    add("assembly_sets", "أطقم أليتا/كام لوك");
    add("shelves", "أطقم فرشات رف");
    add("legs", "أرجل وحدات سفلية");
    add("wall_hangers", "تعليقات وحدات حائط");
    return rows;
}
