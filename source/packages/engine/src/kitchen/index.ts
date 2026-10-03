// Kitchen engine — public API. Port of BuilderFactory (+ the KitchenJoints and Handles hooks the
// plugin installs on it) and of the parity recorder's build/run_case.
import { AccessoryBuilder, CornerGlassDisplayUnitBuilder, DiagonalCornerUnitBuilder, LShapeCornerUnitBuilder, OpenCornerUnitBuilder } from "./corners.ts";
import {
  BedroomWardrobeBuilder, BlindCornerUnitBuilder, DividedUnitBuilder, FridgeHousingBuilder, MicrowaveHousingBuilder,
  OpenShelfBuilder, OvenHousingBuilder, StandardUnitBuilder, WardrobeUnitBuilder, WashingMachineHousingBuilder,
} from "./categories.ts";
import { CarcassBuilder, type UnitBuilder } from "./carcass.ts";
import { applicable as handlesApplicable, applyHandles } from "./handles.ts";
import { Ctx } from "./helpers.ts";
import { applyJoints } from "./joints.ts";
import { record } from "./record.ts";
import { toF, toS, type Params } from "./rb.ts";
import { cm, Transformation } from "./su/geom.ts";
import { Group, RubyError } from "./su/model.ts";

export { DEFAULTS, COLORS, EXTENSION_VERSION } from "./config.ts";
export { Ctx } from "./helpers.ts";
export type { Piece } from "./helpers.ts";

type Klass = new (ctx: Ctx, p: Params) => UnitBuilder;
const MAP: Record<string, Klass> = {
  standard: StandardUnitBuilder,
  oven: OvenHousingBuilder,
  microwave: MicrowaveHousingBuilder,
  open_shelf: OpenShelfBuilder,
  divided: DividedUnitBuilder,
  wardrobe: WardrobeUnitBuilder,
  washing_machine: WashingMachineHousingBuilder,
  fridge: FridgeHousingBuilder,
  corner_glass_display: CornerGlassDisplayUnitBuilder,
};
const CORNER_MAP: Record<string, Klass> = {
  blind: BlindCornerUnitBuilder,
  diagonal: DiagonalCornerUnitBuilder,
  l_shape: LShapeCornerUnitBuilder,
  open: OpenCornerUnitBuilder,
};
/** builders the plugin prepends KitchenJoints::Hook to */
const JOINT_HOOKED = [CarcassBuilder, DiagonalCornerUnitBuilder, OpenCornerUnitBuilder, LShapeCornerUnitBuilder, CornerGlassDisplayUnitBuilder];

export function builderFor(ctx: Ctx, params: Params): UnitBuilder {
  if (toS(params["element_mode"]) === "accessory") return new AccessoryBuilder(ctx, params);
  const cat = toS(params["unit_category"]);
  if (cat === "corner") return new (CORNER_MAP[toS(params["corner_style"])] ?? BlindCornerUnitBuilder)(ctx, params);
  if (cat === "bedroom_wardrobe") return new BedroomWardrobeBuilder(ctx, params);
  if (cat === "bed") throw new RubyError("NotImplementedError", "السرير لسه مش متاح في التطبيق");
  return new (MAP[cat] ?? StandardUnitBuilder)(ctx, params);
}

export interface BuildOptions {
  /** app-wide handle default (the plugin's "handles_default_json" preference) */
  handlesDefault?: Record<string, unknown> | null;
}

/** BuilderFactory.for(params).build(model.entities, 0) with the joints + handles hooks */
export function buildRaw(ctx: Ctx, params: Params, opts: BuildOptions = {}): Group {
  const b = builderFor(ctx, params);
  const hookHandles = handlesApplicable(params, opts.handlesDefault ?? null);
  const g = b.build(ctx.model.entities, 0);
  if (JOINT_HOOKED.some((k) => b instanceof k)) applyJoints(ctx, g, params, b.unitId);
  if (hookHandles) {
    try {
      applyHandles(ctx, g, params, opts.handlesDefault ?? null);
    } catch (e) {
      ctx.puts(`[KitchenUnitDesigner] Handles apply error: ${(e as Error).message}`);
    }
  }
  return g;
}

/** what Runner.run does to one unit (as the recorder does it): build at x=0, wall lift, attributes */
export function buildUnit(ctx: Ctx, params: Params, opts: BuildOptions = {}): Group {
  const group = buildRaw(ctx, params, opts);
  let ut = toS(params["unit_type"]);
  if (ut === "") ut = "base";
  const zOff = ut === "wall" ? toF(params["wall_mount_height"]) : 0.0;
  if (zOff !== 0) group.transformation = group.transformation.mul(Transformation.translation([0, 0, cm(zOff)]));
  group.setAttribute("KUD", "is_kitchen_unit", true);
  group.setAttribute("KUD", "category", toS(params["unit_category"]));
  group.setAttribute("KUD", "params_json", JSON.stringify(params));
  const pieces = ctx.labels.pieces.filter((p) => p.unit_id === group.entityID);
  if (pieces.length) group.setAttribute("KUD", "label_data_json", JSON.stringify(pieces));
  return group;
}

export function errorText(e: unknown): string {
  if (e instanceof RubyError) return `${e.rubyClass}: ${e.message}`;
  const err = e as Error;
  return `TS${err?.name ?? "Error"}: ${err?.message ?? String(e)}`;
}

/** the parity recorder's run_case: same JSON shape as parity/fixtures/kitchen.json */
export function runCase(c: { name: string; params: Params }, opts: BuildOptions = {}): Record<string, unknown> {
  const params = JSON.parse(JSON.stringify(c.params));
  const ctx = new Ctx();
  const res: Record<string, unknown> = { name: c.name, params, ok: true, error: null };
  try {
    const g = buildUnit(ctx, params, opts);
    Object.assign(res, record(ctx, g));
  } catch (e) {
    res.ok = false;
    res.error = errorText(e);
  }
  res.log = ctx.log;
  return res;
}
