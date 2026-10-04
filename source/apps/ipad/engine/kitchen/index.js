// Kitchen engine — public API. Port of BuilderFactory (+ the KitchenJoints and Handles hooks the
// plugin installs on it) and of the parity recorder's build/run_case.
import { AccessoryBuilder, CornerGlassDisplayUnitBuilder, DiagonalCornerUnitBuilder, LShapeCornerUnitBuilder, OpenCornerUnitBuilder } from "./corners.js";
import { BedroomWardrobeBuilder, BlindCornerUnitBuilder, DividedUnitBuilder, FridgeHousingBuilder, MicrowaveHousingBuilder, OpenShelfBuilder, OvenHousingBuilder, StandardUnitBuilder, WardrobeUnitBuilder, WashingMachineHousingBuilder, WasherGapBuilder, CookerGapBuilder, PulloutBuilder, } from "./categories.js";
import { CarcassBuilder } from "./carcass.js";
import { applicable as handlesApplicable, applyHandles } from "./handles.js";
import { Ctx } from "./helpers.js";
import { applyJoints } from "./joints.js";
import { record } from "./record.js";
import { toF, toS } from "./rb.js";
import { cm, Transformation } from "./su/geom.js";
import { Group, RubyError } from "./su/model.js";
export { DEFAULTS, COLORS, EXTENSION_VERSION } from "./config.js";
export { Ctx } from "./helpers.js";
const MAP = {
    standard: StandardUnitBuilder,
    oven: OvenHousingBuilder,
    microwave: MicrowaveHousingBuilder,
    open_shelf: OpenShelfBuilder,
    divided: DividedUnitBuilder,
    wardrobe: WardrobeUnitBuilder,
    washing_machine: WashingMachineHousingBuilder,
    washer_gap: WasherGapBuilder,
    cooker_gap: CookerGapBuilder,
    pullout: PulloutBuilder,
    fridge: FridgeHousingBuilder,
    corner_glass_display: CornerGlassDisplayUnitBuilder,
};
const CORNER_MAP = {
    blind: BlindCornerUnitBuilder,
    diagonal: DiagonalCornerUnitBuilder,
    l_shape: LShapeCornerUnitBuilder,
    open: OpenCornerUnitBuilder,
};
/** builders the plugin prepends KitchenJoints::Hook to */
const JOINT_HOOKED = [CarcassBuilder, DiagonalCornerUnitBuilder, OpenCornerUnitBuilder, LShapeCornerUnitBuilder, CornerGlassDisplayUnitBuilder];
export function builderFor(ctx, params) {
    if (toS(params["element_mode"]) === "accessory")
        return new AccessoryBuilder(ctx, params);
    const cat = toS(params["unit_category"]);
    if (cat === "corner")
        return new (CORNER_MAP[toS(params["corner_style"])] ?? BlindCornerUnitBuilder)(ctx, params);
    if (cat === "bedroom_wardrobe")
        return new BedroomWardrobeBuilder(ctx, params);
    if (cat === "bed")
        throw new RubyError("NotImplementedError", "السرير لسه مش متاح في التطبيق");
    return new (MAP[cat] ?? StandardUnitBuilder)(ctx, params);
}
/** BuilderFactory.for(params).build(model.entities, 0) with the joints + handles hooks */
export function buildRaw(ctx, params, opts = {}) {
    const b = builderFor(ctx, params);
    const hookHandles = handlesApplicable(params, opts.handlesDefault ?? null);
    const g = b.build(ctx.model.entities, 0);
    if (JOINT_HOOKED.some((k) => b instanceof k))
        applyJoints(ctx, g, params, b.unitId);
    if (hookHandles) {
        try {
            applyHandles(ctx, g, params, opts.handlesDefault ?? null);
        }
        catch (e) {
            ctx.puts(`[KitchenUnitDesigner] Handles apply error: ${e.message}`);
        }
    }
    return g;
}
/** what Runner.run does to one unit (as the recorder does it): build at x=0, wall lift, attributes */
export function buildUnit(ctx, params, opts = {}) {
    const group = buildRaw(ctx, params, opts);
    let ut = toS(params["unit_type"]);
    if (ut === "")
        ut = "base";
    const zOff = ut === "wall" ? toF(params["wall_mount_height"]) : 0.0;
    if (zOff !== 0)
        group.transformation = group.transformation.mul(Transformation.translation([0, 0, cm(zOff)]));
    group.setAttribute("KUD", "is_kitchen_unit", true);
    group.setAttribute("KUD", "category", toS(params["unit_category"]));
    group.setAttribute("KUD", "params_json", JSON.stringify(params));
    const pieces = ctx.labels.pieces.filter((p) => p.unit_id === group.entityID);
    if (pieces.length)
        group.setAttribute("KUD", "label_data_json", JSON.stringify(pieces));
    return group;
}
export function errorText(e) {
    if (e instanceof RubyError)
        return `${e.rubyClass}: ${e.message}`;
    const err = e;
    return `TS${err?.name ?? "Error"}: ${err?.message ?? String(e)}`;
}
/** the parity recorder's run_case: same JSON shape as parity/fixtures/kitchen.json */
export function runCase(c, opts = {}) {
    const params = JSON.parse(JSON.stringify(c.params));
    const ctx = new Ctx();
    const res = { name: c.name, params, ok: true, error: null };
    try {
        const g = buildUnit(ctx, params, opts);
        Object.assign(res, record(ctx, g));
    }
    catch (e) {
        res.ok = false;
        res.error = errorText(e);
    }
    res.log = ctx.log;
    return res;
}
