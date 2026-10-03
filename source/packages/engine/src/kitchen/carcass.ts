// Port of lib/builders_core.rb — CarcassBuilder, the shared pipeline of every rectangular
// kitchen unit (sides with back groove, bottom/top, back, shelves, dividers, countertop, cleat,
// end panel, fillers, door/drawer fronts, drawer boxes and inserts). Method for method, same
// order of operations, same inch arithmetic — the parity tests compare with real SketchUp.
import { rround, sum as rsumF } from "../core/rubyMath.ts";
import { COLORS, FRONT_THICKNESS_CM, MIN_DIMENSION_CM } from "./config.ts";
import {
  addColoredMarkerFace, adjustForFinish, assignLayer, bandAllSideEdges, bandEdge, bandEdges, createBox, createFlatSlab,
  createHoleMarker, createHoleMarkerY, createHoleMarkerZ, createSlabAlongX, getOrCreateNamedMaterial, hexToRgb,
  tagDoorHinge, tagDoorHinge3d, tagDrawerSlide, NO_BAND, type Banded, type ColorOrMat, type Ctx,
} from "./helpers.ts";
import { fs, strictFloat, strip, toF, toI, toS, truthy, type Params } from "./rb.ts";
import { cm, Point3d, rmax, rmin, Transformation, Vector3d } from "./su/geom.ts";
import { Entities, Group, Material, RubyError, type Inst } from "./su/model.ts";

export const TAGS = {
  carcass: "Kitchen - Carcass",
  back: "Kitchen - Back Panel",
  countertop: "Kitchen - Countertop",
  front: "Kitchen - Front",
  kick: "Kitchen - Toe Kick",
  shelf: "Kitchen - Shelves",
  assembly: "Kitchen - Assembly Points",
} as const;

export const HINGED_DOOR_TYPES = [
  "single", "double", "flip_up", "flip_up_double",
  "single_glass", "double_glass", "single_glass_metal", "double_glass_metal",
];
export const MAX_CUSTOM_DRAWERS = 8;

export interface Zone {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const argError = (msg: string) => new RubyError("ArgumentError", msg);
const pcm = (v: unknown) => cm(toF(v));
const all = (b: boolean): Banded => ({ top: b, bottom: b, left: b, right: b });

/** material_label_name */
export function materialLabelName(m: ColorOrMat): string {
  return m instanceof Material ? m.name : "خامة افتراضية";
}

/** every kitchen builder: build(parent, xOffsetCm) → the unit group */
export interface UnitBuilder {
  params: Params;
  unitId: number | null;
  build(parent: Entities, xOffsetCm?: number): Group;
}

export class CarcassBuilder implements UnitBuilder {
  ctx: Ctx;
  params: Params;
  unitId: number | null = null;
  protected xOffset = 0;
  private memo = new Map<string, unknown>();

  constructor(ctx: Ctx, params: Params) {
    this.ctx = ctx;
    this.params = params;
    this.validateCommon();
  }

  protected once<T>(k: string, f: () => T): T {
    if (!this.memo.has(k)) this.memo.set(k, f());
    return this.memo.get(k) as T;
  }

  build(parent: Entities, xOffsetCm = 0): Group {
    this.xOffset = cm(xOffsetCm);
    const group = parent.addGroup();
    group.name = this.unitGroupName();
    group.setAttribute("KUD", "is_kitchen_unit", true);
    this.unitId = group.entityID;
    const e = group.entities;

    if (this.toeKick()) {
      if (this.kickDrawer()) this.buildKickDrawer(e);
      else this.buildKick(e);
    }
    this.buildSides(e);
    this.buildBottom(e);
    this.buildTop(e);
    this.buildBackPanel(e);
    if (this.shelvesEnabled()) this.buildShelves(e);
    if (this.verticalDividersEnabled()) this.buildVerticalDividers(e);
    if (this.baseUnit()) this.buildCountertop(e);
    if (this.wallCleatEnabled()) this.buildWallCleat(e);
    if (this.endPanelEnabled()) this.buildEndPanel(e);
    if (this.outerFillerEnabled()) this.buildOuterFiller(e);
    this.buildFrontContent(e);
    this.applyObstacles(e);

    if (this.xOffset !== 0) group.transformBang(Transformation.translation([this.xOffset, 0, 0]));
    return group;
  }

  /** columns / ledges / pipes are cut by the app on the built meshes (apps/ipad/obstacles.js, same rules as lib/obstacles.rb) */
  applyObstacles(_e: Entities): void {}

  buildFrontContent(_e: Entities): void {
    throw new RubyError("NotImplementedError", "يجب تنفيذ build_front_content في الفئة الفرعية");
  }

  // ---------------------------------------------------------------- names & basic dims
  unitGroupName(): string {
    const label = strip(toS(this.params["unit_label"]));
    return label === "" ? "Kitchen Unit" : `Kitchen Unit - ${label}`;
  }

  get p(): Params {
    return this.params;
  }

  width(): number {
    return this.once("width", () => pcm(this.p["width"]));
  }
  depth(): number {
    return this.once("depth", () => pcm(this.p["depth"]));
  }
  height(): number {
    return this.once("height", () => pcm(this.p["height"]));
  }
  panelT(): number {
    return this.once("panel_t", () => pcm(this.p["panel_thickness"]));
  }
  backT(): number {
    return this.once("back_t", () => pcm(this.p["back_panel_thickness"]));
  }
  backRearOffset(): number {
    return this.once("back_rear_offset", () => pcm(this.p["back_rear_offset"]));
  }
  backGroove(): number {
    return this.once("back_groove", () => pcm(this.p["back_groove_depth"]));
  }
  countertopT(): number {
    return this.once("countertop_t", () => pcm(this.p["countertop_thickness"]));
  }
  frontT(): number {
    return cm(FRONT_THICKNESS_CM);
  }

  unitType(): string {
    return toS(this.p["unit_type"]);
  }
  baseUnit(): boolean {
    return this.unitType() === "base";
  }
  doorPosition(): string {
    return toS(this.p["door_position"]);
  }
  doorGapInset(): number {
    return pcm(this.p["door_gap_inset"]);
  }
  doorGapOverlay(): number {
    return pcm(this.p["door_gap_overlay"]);
  }
  drawerGap(): number {
    return pcm(this.p["drawer_gap"]);
  }
  drawerCount(): number {
    return Math.min(Math.max(toI(this.p["drawer_count"]), 1), 15);
  }
  handleRecess(): number {
    return pcm(this.p["door_handle_recess"] ?? 0);
  }
  doorBottomExtension(): number {
    return pcm(toF(this.p["door_bottom_extension"]));
  }

  shelvesEnabled(): boolean {
    return truthy(this.p["include_shelves"]);
  }
  shelfCount(): number {
    return Math.min(Math.max(toI(this.p["shelf_count"]), 0), 30);
  }
  frameShelvesEnabled(): boolean {
    return truthy(this.p["include_appliance_frame_shelves"]);
  }
  belowZoneShelfCount(): number {
    return Math.min(Math.max(toI(this.p["below_zone_shelf_count"]), 0), 20);
  }
  aboveZoneShelfCount(): number {
    return Math.min(Math.max(toI(this.p["above_zone_shelf_count"]), 0), 20);
  }

  toeKick(): boolean {
    return truthy(this.p["include_toe_kick"]);
  }
  kickH(): number {
    return this.once("kick_h", () => (this.toeKick() ? pcm(this.p["toe_kick_height"]) : 0));
  }
  kickSetback(): number {
    return pcm(this.p["toe_kick_setback"]);
  }
  kickSegmentW(): number {
    return pcm(this.p["toe_kick_segment_width"]);
  }
  kickSegmentGap(): number {
    return pcm(this.p["toe_kick_segment_gap"]);
  }
  toeKickStyle(): string {
    return toS(this.p["toe_kick_style"]);
  }
  kickApronT(): number {
    return pcm(this.p["toe_kick_apron_thickness"]);
  }
  /** v191: a drawer in the plinth space instead of the kick (base / tall units with a kick) */
  kickDrawer(): boolean {
    return this.toeKick() && this.unitType() !== "wall" && truthy(this.p["toe_kick_drawer"]);
  }
  kickDrawerFloorGap(): number {
    return cm(rmax(toF(this.p["toe_kick_drawer_floor_gap"] ?? 1.0), 0));
  }

  topValance(): boolean {
    return truthy(this.p["include_top_valance"]);
  }
  valanceH(): number {
    return this.topValance() ? pcm(this.p["top_valance_height"]) : 0;
  }
  bottomValance(): boolean {
    return truthy(this.p["include_bottom_valance"]);
  }
  bottomValanceH(): number {
    return this.bottomValance() ? pcm(this.p["bottom_valance_height"]) : 0;
  }

  topRails(): boolean {
    return toS(this.p["top_style"]) === "rails";
  }
  topRailW(): number {
    return pcm(this.p["top_rail_width"]);
  }
  topRailFrontInset(): number {
    return pcm(this.p["top_rail_front_inset"]);
  }

  assemblyHoles(): boolean {
    return truthy(this.p["include_assembly_holes"]);
  }
  assemblyHoleD(): number {
    return pcm(this.p["assembly_hole_diameter"]);
  }
  assemblyEdgeDist(): number {
    return pcm(this.p["assembly_edge_distance"]);
  }
  assemblyHoleSpacing(): number {
    return pcm(toF(this.p["assembly_hole_spacing"]));
  }
  assemblySideDepth(): number {
    return pcm(toF(this.p["assembly_side_depth"]));
  }
  assemblyBaseDepth(): number {
    return pcm(toF(this.p["assembly_base_depth"]));
  }
  assemblyCamD(): number {
    return pcm(toF(this.p["assembly_cam_diameter"]));
  }
  assemblyCamDepth(): number {
    return pcm(toF(this.p["assembly_cam_depth"]));
  }

  z0Carcass(): number {
    return this.kickH();
  }

  frontColor(): ColorOrMat {
    return this.once("front_color", () => {
      const rgb = adjustForFinish(hexToRgb(this.p["door_color"]), toS(this.p["door_finish"]));
      const name = strip(toS(this.p["material_front_name"]));
      return name === "" ? rgb : getOrCreateNamedMaterial(this.ctx, name, rgb);
    });
  }

  carcassMaterial(): ColorOrMat {
    return this.once("carcass_material", () => {
      const name = strip(toS(this.p["material_carcass_name"]));
      return name === "" ? COLORS.carcass : getOrCreateNamedMaterial(this.ctx, name, COLORS.carcass);
    });
  }

  backMaterial(): ColorOrMat {
    return this.once("back_material", () => {
      const name = strip(toS(this.p["material_back_name"]));
      return name === "" ? COLORS.back_panel : getOrCreateNamedMaterial(this.ctx, name, COLORS.back_panel);
    });
  }

  countertopMaterial(): ColorOrMat {
    return this.once("countertop_material", () => {
      const name = strip(toS(this.p["material_countertop_name"]));
      return name === "" ? COLORS.countertop : getOrCreateNamedMaterial(this.ctx, name, COLORS.countertop);
    });
  }

  edgeBandingEnabled(): boolean {
    return truthy(this.p["include_edge_banding"]);
  }

  edgeBandingMaterial(): Material {
    return this.once("edge_banding_material", () => {
      let name = strip(toS(this.p["edge_banding_material_name"]));
      if (name === "") name = "شريط حواف";
      return getOrCreateNamedMaterial(this.ctx, name, COLORS.assembly);
    });
  }

  // ---------------------------------------------------------------- validation
  validateCommon(): void {
    const p = this.p;
    for (const k of ["width", "depth", "height", "panel_thickness", "back_panel_thickness", "countertop_thickness"]) {
      if (toF(p[k]) <= 0) throw argError(`الحقل '${k}' يجب أن يكون أكبر من صفر.`);
    }
    if (toF(p["width"]) < MIN_DIMENSION_CM || toF(p["depth"]) < MIN_DIMENSION_CM || toF(p["height"]) < MIN_DIMENSION_CM) {
      throw argError(`الأبعاد صغيرة جداً (الحد الأدنى ${fs(MIN_DIMENSION_CM)} سم).`);
    }
    if (toF(p["width"]) <= 2 * toF(p["panel_thickness"])) throw argError("العرض أقل من ضعف سمك الأجناب — لا توجد مساحة داخلية.");
    if (toF(p["back_groove_depth"]) > toF(p["panel_thickness"])) throw argError("عمق دخول الظهرية داخل المفحار أكبر من سمك الجنب.");
    if (truthy(p["include_toe_kick"]) && toF(p["toe_kick_height"]) >= toF(p["height"])) throw argError("ارتفاع السكلو السفلي أكبر من أو يساوي ارتفاع الوحدة.");
    if (truthy(p["include_top_valance"]) && toF(p["top_valance_height"]) >= toF(p["height"])) throw argError("ارتفاع الأورزة العلوية كبير جداً مقارنة بارتفاع الوحدة.");
    if (truthy(p["include_assembly_holes"]) && toF(p["assembly_edge_distance"]) * 2 >= toF(p["depth"])) {
      throw argError("بُعد ثقب التجميع عن الحافة كبير جداً مقارنة بعمق الوحدة.");
    }
    if (toI(p["repeat_count"]) < 1) throw argError("عدد الوحدات المكررة يجب أن يكون واحداً على الأقل.");
  }

  // ---------------------------------------------------------------- kick
  buildKick(e: Entities): void {
    if (this.toeKickStyle() === "apron") this.buildKickApron(e);
    else this.buildKickSegments(e);
  }

  buildKickSegments(e: Entities): void {
    if (this.kickSegmentW() <= 0) return;
    let count = Math.ceil(this.width() / (this.kickSegmentW() + this.kickSegmentGap()));
    if (count < 1) count = 1;
    const segW = (this.width() - this.kickSegmentGap() * (count - 1)) / count;
    if (segW <= 0) return;
    for (let i = 0; i < count; i++) {
      const x0 = i * (segW + this.kickSegmentGap());
      const x1 = x0 + segW;
      const name = `سكلو ${i + 1}`;
      const k = createBox(this.ctx, e, name, x0, this.kickSetback(), 0, x1, this.depth(), this.kickH(), this.carcassMaterial());
      assignLayer(this.ctx, k, TAGS.kick);
      this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, x1 - x0, this.depth() - this.kickSetback(), this.kickH(), {
        banded: { ...NO_BAND }, material: this.carcassMaterialName(),
      });
    }
  }

  buildKickApron(e: Entities): void {
    if (this.kickApronT() <= 0) return;
    const y0 = this.kickSetback();
    const y1 = rmin(y0 + this.kickApronT(), this.depth());
    if (y1 <= y0) return;
    const k = createBox(this.ctx, e, "وزرة سكلو", 0, y0, 0, this.width(), y1, this.kickH(), this.carcassMaterial());
    assignLayer(this.ctx, k, TAGS.kick);
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), "وزرة سكلو", this.width(), this.kickH(), y1 - y0, {
      banded: { ...NO_BAND }, material: this.carcassMaterialName(),
    });
  }

  /**
   * درج الوزرة: بدل السكلو، جنبين سكلو (بيشيلوا المجرى) + وش درج على مستوى الضلف + علبة درج واطية
   * تحت قاعدة الوحدة. لو المسافة صغيرة على درج (أقل من 6 سم وش) بيرجع للسكلو العادي.
   */
  buildKickDrawer(e: Entities): void {
    const pt = this.panelT();
    const kh = this.kickH();
    const overlay = this.doorPosition() === "overlay";
    const edgeGap = overlay ? this.doorGapOverlay() : this.doorGapInset();
    // v191: the front can sit back from the doors' line (like the kick's setback)
    const sb = cm(rmin(rmax(toF(this.p["toe_kick_drawer_setback"]), 0), rmax(toF(this.p["depth"]) - 25, 0)));
    const fy0 = (overlay ? -this.frontT() : 0) + sb;
    const fy1 = (overlay ? 0 : this.frontT()) + sb;
    const fx0 = overlay ? edgeGap : pt + edgeGap;
    const fx1 = overlay ? this.width() - edgeGap : this.width() - pt - edgeGap;
    const fz0 = this.kickDrawerFloorGap();
    // "gap" handle: the front stops lower, leaving a finger gap under the carcass
    const kgap = toS(this.p["toe_kick_drawer_handle"]) === "gap" ? cm(rmax(toF(this.p["toe_kick_drawer_handle_size"] ?? 3.0), 0)) : 0;
    const fz1 = kh + edgeGap - this.doorBottomExtension() - this.drawerGap() - kgap;
    if (fz1 - fz0 < cm(6.0) || fx1 - fx0 < cm(15.0) || this.width() <= 4 * pt + cm(15.0)) {
      this.buildKick(e);
      return;
    }
    const L = this.ctx.labels;
    const ug = this.unitGroupName();
    // the two plinth runners stand under the bottom, just inside the sides: they carry the slides and are
    // fixed to the bottom with aleta (carcass layer → the joint system drills them like any carcass joint)
    const ry0 = (overlay ? 0 : fy1 - sb) + sb;
    for (const [nm, x0] of [["جنب سكلو شمال", pt], ["جنب سكلو يمين", this.width() - 2 * pt]] as [string, number][]) {
      const k = createBox(this.ctx, e, nm, x0, ry0, 0, x0 + pt, this.depth(), kh, this.carcassMaterial());
      assignLayer(this.ctx, k, TAGS.carcass);
      L.add(this.unitId!, ug, nm, this.depth() - ry0, kh, pt, { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
    }
    const label = "درج وزرة";
    const group = e.addGroup();
    group.name = label;
    const sub = group.entities;
    const f = createBox(this.ctx, sub, label, fx0, fy0, fz0, fx1, fy1, fz1, this.frontColor());
    assignLayer(this.ctx, f, TAGS.front);
    if (this.edgeBandingEnabled()) bandAllSideEdges(this.ctx, f, this.edgeBandingMaterial());
    this.recordDoorLabel(label, fx0, fx1, fz0, fz1, null);
    // the plinth drawer always gets its box (a front alone is no drawer); its depth can be set on its own
    const kd = toF(this.p["toe_kick_drawer_depth"]);
    this.buildDrawerBox(sub, 2 * pt, this.width() - 2 * pt, fy1, fz0, rmax(kh - cm(0.5), fz0 + cm(2.0)), label, kd > 0 ? cm(kd) : null);
    tagDrawerSlide(group, this.drawerSlideBase());
  }

  // ---------------------------------------------------------------- sides
  buildSides(e: Entities): void {
    const sideGlass = toS(this.p["side_glass_door"]);
    const sideRecess = toS(this.p["unit_type"]) === "base" ? this.handleRecess() : 0;
    const sideTop = rmax(this.height() - sideRecess, this.z0Carcass());
    const sideBottom = this.z0Carcass() - this.doorBottomExtension();
    const pt = this.panelT();

    let l: Inst;
    if (sideGlass === "left") {
      l = this.buildFramedGlassDoorSide(e, 0, this.depth(), sideBottom, sideTop, 0, pt, "جنب شمال (زجاج)", this.metalFrameMaterial());
      tagDoorHinge(l, pt / 2.0, this.depth(), pt / 2.0, 0, -1.0, 0.0);
      if (this.edgeBandingEnabled()) bandAllSideEdges(this.ctx, l, this.edgeBandingMaterial());
    } else {
      l = this.buildGroovedSide(e, "جنب شمال", 0, pt, true);
      this.bandSideAllEdges(l);
      this.markLedChannel(l, pt);
    }
    assignLayer(this.ctx, l, TAGS.carcass);
    this.recordSideLabel("جنب شمال");

    let r: Inst;
    if (sideGlass === "right") {
      r = this.buildFramedGlassDoorSide(e, 0, this.depth(), sideBottom, sideTop, this.width() - pt, this.width(), "جنب يمين (زجاج)", this.metalFrameMaterial());
      tagDoorHinge(r, this.width() - pt / 2.0, this.depth(), this.width() - pt / 2.0, 0, 1.0, 0.0);
      if (this.edgeBandingEnabled()) bandAllSideEdges(this.ctx, r, this.edgeBandingMaterial());
    } else {
      r = this.buildGroovedSide(e, "جنب يمين", this.width() - pt, this.width(), false);
      this.bandSideAllEdges(r);
      this.markLedChannel(r, this.width() - pt);
    }
    assignLayer(this.ctx, r, TAGS.carcass);
    this.recordSideLabel("جنب يمين");
  }

  sideGroovePresent(): boolean {
    const [gy0, gy1] = this.grooveYRange();
    return this.backGroove() > 0 && gy1 > gy0;
  }

  carcassMaterialName(): string {
    return materialLabelName(this.carcassMaterial());
  }

  frontMaterialName(): string {
    const name = strip(toS(this.p["material_front_name"]));
    return name === "" ? "خامة الضلف" : name;
  }

  recordDoorLabel(name: string, x0: number, x1: number, z0: number, z1: number, hingeSide: string | null): void {
    const bandedAll = this.edgeBandingEnabled();
    let ratios: number[] = [];
    if (truthy(this.p["include_hinge_cups"]) && hingeSide) {
      const edge = pcm(this.p["hinge_cup_edge_distance"]);
      const count = Math.min(Math.max(toI(this.p["hinge_cup_count"]), 2), 4);
      if (hingeSide === "top") {
        const w = x1 - x0;
        if (w > 2 * edge) {
          const pos = this.hingeCupPositions(x0, x1, edge, count).filter((cx) => cx > x0 && cx < x1);
          ratios = pos.map((cx) => rround((cx - x0) / w, 4));
        }
      } else {
        const h = z1 - z0;
        if (h > 2 * edge) {
          const pos = this.hingeCupPositions(z0, z1, edge, count).filter((cz) => cz > z0 && cz < z1);
          ratios = pos.map((cz) => rround((cz - z0) / h, 4));
        }
      }
    }
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, x1 - x0, z1 - z0, this.frontT(), {
      banded: all(bandedAll), hinge_ratios: ratios, hinge_side: hingeSide, material: this.frontMaterialName(),
    });
  }

  recordSideLabel(name: string): void {
    const bandedAll = this.edgeBandingEnabled();
    let grooveRatio: number | null = null;
    if (this.sideGroovePresent()) {
      const [gy0, gy1] = this.grooveYRange();
      grooveRatio = rmin((gy0 + gy1) / 2.0 / rmax(this.depth(), 0.001), 1.0);
    }
    let ledRatio: number | null = null;
    if (this.ledMarkerEnabled()) {
      const y0 = rmax(this.ledOffset(), 0);
      const y1 = rmin(y0 + this.ledWidth(), this.depth());
      if (y1 > y0) ledRatio = rmin((y0 + y1) / 2.0 / rmax(this.depth(), 0.001), 1.0);
    }
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, this.depth(), this.height() - this.z0Carcass(), this.panelT(), {
      banded: all(bandedAll), groove: grooveRatio !== null, groove_axis: "vertical", groove_ratio: grooveRatio,
      led: ledRatio !== null, led_ratio: ledRatio, material: this.carcassMaterialName(),
    });
  }

  ledMarkerEnabled(): boolean {
    return truthy(this.p["include_led_marker"]);
  }
  ledOffset(): number {
    return pcm(this.p["led_marker_offset"]);
  }
  ledWidth(): number {
    return pcm(this.p["led_marker_width"]);
  }

  markLedChannel(piece: Inst, innerX: number): void {
    if (!this.ledMarkerEnabled()) return;
    const z0 = this.innerOpening().z0;
    const z1 = this.innerOpening().z1;
    if (z1 <= z0) return;
    const y0 = rmax(this.ledOffset(), 0);
    const y1 = rmin(y0 + this.ledWidth(), this.depth());
    if (y1 <= y0) return;
    const pts = [new Point3d(innerX, y0, z0), new Point3d(innerX, y1, z0), new Point3d(innerX, y1, z1), new Point3d(innerX, y0, z1)];
    addColoredMarkerFace(this.ctx, piece, pts, COLORS.led);
  }

  // ---------------------------------------------------------------- bottom
  buildBottom(e: Entities): void {
    const pt = this.panelT();
    const piece = this.ptrapEnabled()
      ? this.buildBottomWithPtrap(e)
      : this.buildGroovedHorizontal(e, "قاعدة", pt, this.width() - pt, this.z0Carcass(), this.z0Carcass() + pt, "notch_at_top");
    this.bandFrontAndBack(piece);
    this.recordHorizontalLabel("قاعدة", pt, this.width() - pt, 0, this.depth());
  }

  ptrapEnabled(): boolean {
    return truthy(this.p["include_ptrap_opening"]);
  }

  buildBottomWithPtrap(e: Entities): Inst {
    const x0 = this.panelT();
    const x1 = this.width() - this.panelT();
    const y0 = 0;
    const y1 = this.depth();
    const pw = cm(rmin(toF(this.p["ptrap_width"]), (x1 - x0) / cm(1.0) - 2));
    const pxOffset = cm(toF(this.p["ptrap_x_offset"]));
    const pd = cm(rmin(toF(this.p["ptrap_depth"]), (y1 - y0) / cm(1.0) - 1));
    const px0 = x0 + pxOffset;
    const px1 = px0 + pw;
    const py0 = y1 - pd;
    const z0 = this.z0Carcass();
    if (!(pw > 0 && pd > 0 && px0 > x0 && px1 < x1 && py0 > y0)) {
      return createBox(this.ctx, e, "قاعدة", x0, y0, z0, x1, y1, z0 + this.panelT(), this.carcassMaterial());
    }
    const pts = [
      new Point3d(x0, y0, 0), new Point3d(x1, y0, 0), new Point3d(x1, y1, 0), new Point3d(px1, y1, 0),
      new Point3d(px1, py0, 0), new Point3d(px0, py0, 0), new Point3d(px0, y1, 0), new Point3d(x0, y1, 0),
    ];
    return createFlatSlab(this.ctx, e, "قاعدة", pts, z0, z0 + this.panelT(), this.carcassMaterial());
  }

  wallCleatEnabled(): boolean {
    return truthy(this.p["include_wall_cleat"]);
  }

  buildWallCleat(e: Entities): void {
    const cleatH = cm(rmax(toF(this.p["wall_cleat_height"]), 4.0));
    const cleatW = this.width();
    if (cleatW <= 0) return;
    const cz0 = rmax(this.height() - cm(6.0) - cleatH, this.z0Carcass());
    const cz1 = cz0 + cleatH;
    const backY = this.depth() - this.backT();
    const pt = this.panelT();
    const a = createBox(this.ctx, e, "كليت الوحدة (يتقطع 45°)", 0, backY - pt, cz0, cleatW, backY, cz1, this.carcassMaterial());
    assignLayer(this.ctx, a, TAGS.carcass);
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), "كليت الوحدة (يتقطع 45°)", cleatW, cleatH, pt, {
      banded: { ...NO_BAND }, material: materialLabelName(this.carcassMaterial()),
      note: "⚠ يتقطع بزاوية 45° على طول القطعة — النص العلوي يتثبت في ظهر الوحدة، النص السفلي بيتعلّق على كليت الحيطة",
    });
    const b = createBox(this.ctx, e, "كليت الحيطة (يتقطع 45°)", 0, backY - pt * 2, cz0, cleatW, backY - pt, cz1, this.carcassMaterial());
    assignLayer(this.ctx, b, TAGS.carcass);
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), "كليت الحيطة (يتقطع 45°)", cleatW, cleatH, pt, {
      banded: { ...NO_BAND }, material: materialLabelName(this.carcassMaterial()),
      note: "⚠ يتقطع بزاوية 45° مكمّلة لكليت الوحدة — بيتثبت في الحيطة أولاً، وبعدين الوحدة تتعلّق عليه",
    });
  }

  endPanelEnabled(): boolean {
    return truthy(this.p["include_end_panel"]);
  }
  outerFillerEnabled(): boolean {
    return truthy(this.p["include_outer_filler"]);
  }
  outerFillerPosition(): string {
    return toS(this.p["outer_filler_position"]);
  }
  outerFillerWidth(): number {
    return rmax(cm(toF(this.p["outer_filler_width"])), cm(1.0));
  }
  outerFillerBottomOffset(): number {
    return cm(rmax(toF(this.p["outer_filler_bottom_offset"]), 0));
  }

  buildOuterFiller(e: Entities): void {
    if (!this.outerFillerEnabled()) return;
    const zone = this.activeZone();
    const fw = this.outerFillerWidth();
    const pos = this.outerFillerPosition();
    if (pos === "start" || pos === "both") {
      this.buildEdgeFillerStrip(e, -fw, 0, zone, "فيلر خارجي شمال", this.outerFillerBottomOffset());
      this.ctx.labels.addDividerMark(this.unitId!, this.unitGroupName(), "فيلر خارجي شمال", -fw / 2.0 - this.innerOpening().x0, "filler");
    }
    if (pos === "end" || pos === "both") {
      this.buildEdgeFillerStrip(e, this.width(), this.width() + fw, zone, "فيلر خارجي يمين", this.outerFillerBottomOffset());
      this.ctx.labels.addDividerMark(this.unitId!, this.unitGroupName(), "فيلر خارجي يمين", this.width() + fw / 2.0 - this.innerOpening().x0, "filler");
    }
  }

  buildEndPanel(e: Entities): void {
    let side = toS(this.p["end_panel_side"]);
    if (side !== "left" && side !== "right") side = "left";
    const t = rmax(cm(toF(this.p["end_panel_thickness"])), cm(0.3));
    const [x0, x1] = side === "left" ? [-t, 0] : [this.width(), this.width() + t];
    const z0 = this.z0Carcass() - this.doorBottomExtension();
    const overlay = this.doorPosition() === "overlay";
    const y0 = overlay ? -this.frontT() : 0;
    const y1 = this.depth();
    const pnl = createBox(this.ctx, e, "تقفيلة نهاية", x0, y0, z0, x1, y1, this.height(), this.frontColor());
    assignLayer(this.ctx, pnl, TAGS.front);
    if (this.edgeBandingEnabled()) bandAllSideEdges(this.ctx, pnl, this.edgeBandingMaterial());
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), "تقفيلة نهاية", y1 - y0, this.height() - z0, t, {
      banded: all(this.edgeBandingEnabled()), material: materialLabelName(this.frontColor()),
    });
    this.ctx.labels.addDividerMark(this.unitId!, this.unitGroupName(), `تقفيلة نهاية (${side === "left" ? "شمال" : "يمين"})`, (x0 + x1) / 2.0 - this.innerOpening().x0, "filler");
  }

  // ---------------------------------------------------------------- top
  buildTop(e: Entities): void {
    if (this.topRails()) this.buildTopRails(e);
    else {
      const pt = this.panelT();
      const piece = this.buildGroovedHorizontal(e, "رأس", pt, this.width() - pt, this.height() - pt, this.height(), "notch_at_bottom");
      this.bandFrontAndBack(piece);
      this.recordHorizontalLabel("رأس", pt, this.width() - pt, 0, this.depth());
    }
  }

  recordHorizontalLabel(name: string, x0: number, x1: number, y0: number, y1: number): void {
    const bandedAll = this.edgeBandingEnabled();
    let [gy0, gy1] = this.grooveYRange();
    gy0 = rmax(gy0, y0);
    gy1 = rmin(gy1, y1);
    const hasGroove = this.backGroove() > 0 && gy1 > gy0;
    const span = rmax(y1 - y0, 0.001);
    const grooveRatio = hasGroove ? rmin(((gy0 + gy1) / 2.0 - y0) / span, 1.0) : null;
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, x1 - x0, y1 - y0, this.panelT(), {
      banded: { top: bandedAll, bottom: bandedAll, left: false, right: false },
      groove: hasGroove, groove_axis: "horizontal", groove_ratio: grooveRatio, material: this.carcassMaterialName(),
    });
  }

  buildTopRails(e: Entities): void {
    if (this.topRailW() <= 0) return;
    const pt = this.panelT();
    const backY1 = this.depth();
    const backY0 = rmax(this.depth() - this.topRailW(), 0);
    const bp = this.buildGroovedHorizontal(e, "شريط علوي خلفي", pt, this.width() - pt, this.height() - pt, this.height(), "notch_at_bottom", backY0, backY1);
    this.bandFrontAndBack(bp);
    this.recordHorizontalLabel("شريط علوي خلفي", pt, this.width() - pt, backY0, backY1);
    const fy0 = rmax(this.topRailFrontInset(), 0);
    const fy1 = rmin(fy0 + this.topRailW(), backY0);
    if (!(fy1 > fy0)) return;
    const f = createBox(this.ctx, e, "شريط علوي أمامي", pt, fy0, this.height() - pt, this.width() - pt, fy1, this.height(), this.carcassMaterial());
    assignLayer(this.ctx, f, TAGS.carcass);
    this.bandFrontAndBack(f);
    this.recordHorizontalLabel("شريط علوي أمامي", pt, this.width() - pt, fy0, fy1);
  }

  bandSideAllEdges(piece: Inst): void {
    if (!this.edgeBandingEnabled()) return;
    bandEdges(this.ctx, piece, [new Vector3d(0, -1, 0), new Vector3d(0, 1, 0), new Vector3d(0, 0, 1), new Vector3d(0, 0, -1)], this.edgeBandingMaterial());
  }

  bandFrontAndBack(piece: Inst): void {
    if (!this.edgeBandingEnabled()) return;
    bandEdges(this.ctx, piece, [new Vector3d(0, -1, 0), new Vector3d(0, 1, 0)], this.edgeBandingMaterial());
  }

  grooveYRange(): [number, number] {
    const gy0 = rmax(this.depth() - this.backRearOffset() - this.backT(), 0);
    const gy1 = rmin(this.depth() - this.backRearOffset(), this.depth());
    return [gy0, gy1];
  }

  buildGroovedSide(e: Entities, name: string, x0: number, x1: number, innerAtX1: boolean): Inst {
    const [gy0, gy1] = this.grooveYRange();
    const z0 = this.z0Carcass();
    const d = this.depth();
    if (this.backGroove() <= 0 || gy1 <= gy0) return createBox(this.ctx, e, name, x0, 0, z0, x1, d, this.height(), this.carcassMaterial());
    let pts: Point3d[];
    if (innerAtX1) {
      const deep = x1 - this.backGroove();
      pts = [
        new Point3d(x0, 0, 0), new Point3d(x1, 0, 0), new Point3d(x1, gy0, 0), new Point3d(deep, gy0, 0),
        new Point3d(deep, gy1, 0), new Point3d(x1, gy1, 0), new Point3d(x1, d, 0), new Point3d(x0, d, 0),
      ];
    } else {
      const deep = x0 + this.backGroove();
      pts = [
        new Point3d(x0, 0, 0), new Point3d(x1, 0, 0), new Point3d(x1, d, 0), new Point3d(x0, d, 0),
        new Point3d(x0, gy1, 0), new Point3d(deep, gy1, 0), new Point3d(deep, gy0, 0), new Point3d(x0, gy0, 0),
      ];
    }
    const piece = createFlatSlab(this.ctx, e, name, pts, z0, this.height(), this.carcassMaterial());
    this.tagGrooveInfo(piece);
    return piece;
  }

  buildGroovedHorizontal(e: Entities, name: string, x0: number, x1: number, z0: number, z1: number, notchSide: string, y0 = 0, y1In: number | null = null): Inst {
    const y1 = y1In ?? this.depth();
    let [gy0, gy1] = this.grooveYRange();
    gy0 = rmax(gy0, y0);
    gy1 = rmin(gy1, y1);
    if (this.backGroove() <= 0 || gy1 <= gy0) {
      const piece = createBox(this.ctx, e, name, x0, y0, z0, x1, y1, z1, this.carcassMaterial());
      assignLayer(this.ctx, piece, TAGS.carcass);
      return piece;
    }
    const tol = 0.001;
    let yz: [number, number][];
    if (notchSide === "notch_at_top") {
      const nz = z1 - this.backGroove();
      const tf = Math.abs(gy0 - y0) < tol;
      const tb = Math.abs(gy1 - y1) < tol;
      if (tf && tb) yz = [[y0, z0], [y0, nz], [y1, nz], [y1, z0]];
      else if (tb) yz = [[y0, z0], [y0, z1], [gy0, z1], [gy0, nz], [y1, nz], [y1, z0]];
      else if (tf) yz = [[y0, nz], [gy1, nz], [gy1, z1], [y1, z1], [y1, z0], [y0, z0]];
      else yz = [[y0, z0], [y0, z1], [gy0, z1], [gy0, nz], [gy1, nz], [gy1, z1], [y1, z1], [y1, z0]];
    } else {
      const nz = z0 + this.backGroove();
      const tf = Math.abs(gy0 - y0) < tol;
      const tb = Math.abs(gy1 - y1) < tol;
      if (tf && tb) yz = [[y0, nz], [y0, z1], [y1, z1], [y1, nz]];
      else if (tb) yz = [[y0, z1], [y0, z0], [gy0, z0], [gy0, nz], [y1, nz], [y1, z1]];
      else if (tf) yz = [[y0, nz], [gy1, nz], [gy1, z0], [y1, z0], [y1, z1], [y0, z1]];
      else yz = [[y0, z1], [y0, z0], [gy0, z0], [gy0, nz], [gy1, nz], [gy1, z0], [y1, z0], [y1, z1]];
    }
    const piece = createSlabAlongX(this.ctx, e, name, x0, x1, yz, this.carcassMaterial());
    this.tagGrooveInfo(piece);
    assignLayer(this.ctx, piece, TAGS.carcass);
    return piece;
  }

  tagGrooveInfo(piece: Inst): void {
    piece.setAttribute("KUD", "has_back_groove", true);
    piece.setAttribute("KUD", "groove_depth_cm", toF(this.p["back_groove_depth"]));
  }

  buildBackPanel(e: Entities): void {
    const pt = this.panelT();
    const bg = this.backGroove();
    const x0 = pt - bg;
    const x1 = this.width() - pt + bg;
    const z0 = this.z0Carcass() + pt - bg;
    const z1 = this.height() - pt + bg;
    const y1 = this.depth() - this.backRearOffset();
    const y0 = y1 - this.backT();
    const b = createBox(this.ctx, e, "ظهر", x0, y0, z0, x1, y1, z1, this.backMaterial());
    assignLayer(this.ctx, b, TAGS.back);
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), "ظهر", x1 - x0, z1 - z0, this.backT(), {
      banded: { ...NO_BAND }, material: materialLabelName(this.backMaterial()),
    });
  }

  buildCountertop(e: Entities): void {
    if (this.sinkCutoutEnabled()) this.buildCountertopWithSinkCutout(e);
    else {
      const c = createBox(this.ctx, e, "كونتر", 0, 0, this.height(), this.width(), this.depth(), this.height() + this.countertopT(), this.countertopMaterial());
      assignLayer(this.ctx, c, TAGS.countertop);
    }
  }

  sinkCutoutEnabled(): boolean {
    return truthy(this.p["include_sink_cutout"]);
  }

  buildCountertopWithSinkCutout(e: Entities): void {
    const W = this.width();
    const D = this.depth();
    const cw = rmin(cm(toF(this.p["sink_cutout_width"])), W - cm(4));
    const cd = rmin(cm(toF(this.p["sink_cutout_depth"])), D - cm(4));
    if (cw <= 0 || cd <= 0) return this.buildCountertopSolidFallback(e);
    const offX = cm(toF(this.p["sink_cutout_offset_x"]));
    const offY = cm(toF(this.p["sink_cutout_offset_y"]));
    const cx0 = rmin(rmax(W / 2.0 - cw / 2.0 + offX, cm(2)), W - cw - cm(2));
    const cy0 = rmin(rmax(offY, cm(2)), D - cd - cm(2));
    const cx1 = cx0 + cw;
    const cy1 = cy0 + cd;
    if (cx1 >= W || cy1 >= D || cx0 <= 0 || cy0 <= 0) return this.buildCountertopSolidFallback(e);
    const z0 = this.height();
    const z1 = this.height() + this.countertopT();
    const m = this.countertopMaterial();
    const parts = [
      createBox(this.ctx, e, "كونتر - أمامي", 0, 0, z0, W, cy0, z1, m),
      createBox(this.ctx, e, "كونتر - خلفي", 0, cy1, z0, W, D, z1, m),
      createBox(this.ctx, e, "كونتر - شمال", 0, cy0, z0, cx0, cy1, z1, m),
      createBox(this.ctx, e, "كونتر - يمين", cx1, cy0, z0, W, cy1, z1, m),
    ];
    for (const pc of parts) assignLayer(this.ctx, pc, TAGS.countertop);
  }

  buildCountertopSolidFallback(e: Entities): void {
    const c = createBox(this.ctx, e, "كونتر", 0, 0, this.height(), this.width(), this.depth(), this.height() + this.countertopT(), this.countertopMaterial());
    assignLayer(this.ctx, c, TAGS.countertop);
  }

  // ---------------------------------------------------------------- shelves & dividers
  interiorDepthStart(): number {
    if (this.slidingDoors()) return this.slidingDepth();
    return this.doorPosition() === "overlay" ? 0 : this.frontT();
  }

  // ---------------------------------------------------------------- v190: sliding doors (any unit)
  /** door_type "sliding": the front is 2–4 panels on two tracks instead of hinged doors */
  slidingDoors(): boolean {
    return toS(this.p["door_type"]) === "sliding";
  }
  /** behind sliding doors the inside starts after both tracks (+0.5 cm), so shelves never touch the doors */
  slidingDepth(): number {
    if (this.doorPosition() === "overlay") return cm(0.5);
    return 2 * this.frontT() + cm(0.6) + cm(0.5);
  }
  slidingPanelCount(): number {
    return Math.min(Math.max(toI(this.p["sliding_panel_count"]), 2), 4);
  }
  slidingOverlap(): number {
    return cm(2.0);
  }
  /** n panels across x0..x1 overlapping 2 cm; every other one runs in the back track,
   *  a full door thickness + 0.6 cm behind (in front of it when the doors are overlay) */
  buildSlidingPanels(e: Entities, x0: number, x1: number, z0: number, z1: number, labelPrefix = ""): void {
    const n = this.slidingPanelCount();
    const totalW = x1 - x0;
    if (totalW <= 0 || z1 <= z0) return;
    const ov = this.slidingOverlap();
    const pw = (totalW + (n - 1) * ov) / n;
    const overlay = this.doorPosition() === "overlay";
    for (let i = 0; i < n; i++) {
      const px0 = x0 + i * (pw - ov);
      const px1 = rmin(px0 + pw, x1 + (i === n - 1 ? 0 : ov));
      const track = (this.frontT() + cm(0.6)) * (i % 2);
      const fy0 = overlay ? -this.frontT() - track : track;
      const fy1 = fy0 + this.frontT();
      const name = `${labelPrefix}باب سحاب ${i + 1}`;
      const pnl = createBox(this.ctx, e, name, px0, fy0, z0, px1, fy1, z1, this.frontColor());
      assignLayer(this.ctx, pnl, TAGS.front);
      if (this.edgeBandingEnabled()) bandAllSideEdges(this.ctx, pnl, this.edgeBandingMaterial());
      const b = this.edgeBandingEnabled();
      this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, px1 - px0, z1 - z0, this.frontT(), {
        banded: { top: b, bottom: b, left: b, right: b }, material: materialLabelName(this.frontColor()),
        note: "⚠ باب سحّاب — هيتركّب على سكة علوية/سفلية، مش مفصلات",
      });
    }
  }

  shelfDepthEnd(y0: number): number {
    return rmax(this.depth() - this.backT() - this.backRearOffset(), y0 + this.panelT());
  }

  /** v188: custom shelf heights — cm from the unit's inner bottom to the underside of each shelf, comma separated */
  shelfPositions(): number[] {
    const tr: Record<string, string> = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "٫": ".", "،": "," };
    const raw = toS(this.p["shelf_positions"]).replace(/[٠-٩٫،]/g, (c) => tr[c] ?? c);
    if (raw.trim() === "") return [];
    return raw.split(/[,;\s]+/).filter((x) => x !== "").map((x) => toF(x)).filter((v) => v >= 0).slice(0, 30);
  }

  buildShelves(e: Entities): void {
    const positions = this.shelfPositions();
    const count = this.shelfCount();
    if (count <= 0 && positions.length === 0) return;
    const o = this.innerOpening();
    const total = o.z1 - o.z0;
    if (total <= 0) return;
    const y0 = this.interiorDepthStart();
    const sde = this.shelfDepthEnd(y0);
    const columns = this.shelfColumns(o.x0, o.x1);
    let zs: number[];
    if (positions.length) {
      const pt = this.panelT(), lo = o.z0 + pt / 2.0, hi = o.z1 - pt / 2.0;
      zs = positions.map((q) => Math.min(Math.max(o.z0 + cm(q) + pt / 2.0, lo), hi)).sort((a, b) => a - b);
    } else {
      const step = total / (count + 1);
      zs = [];
      for (let i = 1; i <= count; i++) zs.push(o.z0 + step * i);
    }
    zs.forEach((sz, i) => this.buildShelfRow(e, columns, y0, sde, sz, `رف ${i + 1}`));
  }

  buildSingleShelfAt(e: Entities, z: number, label = "رف", align = "center"): Inst | null {
    const o = this.innerOpening();
    const y0 = this.interiorDepthStart();
    const sde = this.shelfDepthEnd(y0);
    if (sde <= y0) return null;
    const pt = this.panelT();
    const [sz0, sz1] = align === "below" ? [z - pt, z] : align === "above" ? [z, z + pt] : [z - pt / 2.0, z + pt / 2.0];
    const s = createBox(this.ctx, e, label, o.x0, y0, sz0, o.x1, sde, sz1, this.carcassMaterial());
    assignLayer(this.ctx, s, TAGS.shelf);
    if (this.edgeBandingEnabled()) bandEdge(this.ctx, s, new Vector3d(0, -1, 0), this.edgeBandingMaterial());
    this.recordShelfLabel(label, o.x1 - o.x0, sde - y0, sz0);
    return s;
  }

  buildShelvesInRange(e: Entities, z0: number, z1: number, count: number, x0In: number | null = null, x1In: number | null = null, positions: number[] = []): void {
    const o = this.innerOpening();
    const x0 = x0In ?? o.x0;
    const x1 = x1In ?? o.x1;
    const total = z1 - z0;
    if (total <= 0) return;
    const y0 = this.interiorDepthStart();
    const sde = this.shelfDepthEnd(y0);
    const columns = this.shelfColumns(x0, x1);
    let zs: number[];
    if (positions.length) zs = positions.map((pp) => rmin(rmax(z0 + cm(pp), z0), z1));
    else {
      if (count <= 0) return;
      const step = total / (count + 1);
      zs = [];
      for (let i = 1; i <= count; i++) zs.push(z0 + step * i);
    }
    zs.forEach((sz, i) => this.buildShelfRow(e, columns, y0, sde, sz, `رف ${i + 1}`));
  }

  buildShelfRow(e: Entities, columns: [number, number][], y0: number, sde: number, sz: number, baseLabel: string): void {
    const pt = this.panelT();
    columns.forEach(([cx0, cx1], i) => {
      const label = columns.length > 1 ? `${baseLabel} - ${i + 1}` : baseLabel;
      const s = createBox(this.ctx, e, label, cx0, y0, sz - pt / 2.0, cx1, sde, sz + pt / 2.0, this.carcassMaterial());
      assignLayer(this.ctx, s, TAGS.shelf);
      if (this.edgeBandingEnabled()) bandEdge(this.ctx, s, new Vector3d(0, -1, 0), this.edgeBandingMaterial());
      this.recordShelfLabel(label, cx1 - cx0, sde - y0, sz - pt / 2.0);
    });
  }

  recordShelfLabel(name: string, xSpan: number, ySpan: number, zBottom: number | null = null): void {
    const bandedFront = this.edgeBandingEnabled();
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, xSpan, ySpan, this.panelT(), {
      banded: { top: false, bottom: bandedFront, left: false, right: false }, material: this.carcassMaterialName(),
    });
    if (zBottom !== null) this.ctx.labels.addAssemblyMark(this.unitId!, this.unitGroupName(), "shelf", name, zBottom - this.z0Carcass());
  }

  shelfColumns(x0: number, x1: number): [number, number][] {
    if (!this.verticalDividersEnabled()) return [[x0, x1]];
    const count = this.verticalDividerCount();
    const total = x1 - x0;
    if (count <= 0 || total <= 0) return [[x0, x1]];
    const step = total / (count + 1);
    const pt = this.panelT();
    const bounds = [x0];
    for (let i = 0; i < count; i++) {
      const dx = x0 + step * (i + 1);
      bounds.push(dx - pt / 2.0, dx + pt / 2.0);
    }
    bounds.push(x1);
    const columns: [number, number][] = [];
    for (let i = 0; i < bounds.length; i += 2) {
      const a = bounds[i];
      const b = bounds[i + 1];
      if (b !== undefined && b > a) columns.push([a, b]);
    }
    return columns;
  }

  verticalDividersEnabled(): boolean {
    return truthy(this.p["include_vertical_dividers"]);
  }
  verticalDividerCount(): number {
    return Math.min(Math.max(toI(this.p["vertical_divider_count"]), 0), 10);
  }

  buildVerticalDividers(e: Entities): void {
    const count = this.verticalDividerCount();
    if (count <= 0) return;
    const o = this.innerOpening();
    const total = o.x1 - o.x0;
    if (total <= 0) return;
    const y0 = this.interiorDepthStart();
    const dde = this.shelfDepthEnd(y0);
    const step = total / (count + 1);
    const pt = this.panelT();
    for (let i = 0; i < count; i++) {
      const dx = o.x0 + step * (i + 1);
      const name = `قاطوع رأسي ${i + 1}`;
      const d = createBox(this.ctx, e, name, dx - pt / 2.0, y0, o.z0, dx + pt / 2.0, dde, o.z1, this.carcassMaterial());
      assignLayer(this.ctx, d, TAGS.carcass);
      this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, dde - y0, o.z1 - o.z0, pt, { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
      this.ctx.labels.addDividerMark(this.unitId!, this.unitGroupName(), name, dx - o.x0);
    }
  }

  // ---------------------------------------------------------------- openings
  innerOpening(): Zone {
    const pt = this.panelT();
    return { x0: pt, x1: this.width() - pt, z0: this.z0Carcass() + pt, z1: this.height() - pt - this.valanceH() };
  }

  outerOpening(): Zone {
    return { x0: 0, x1: this.width(), z0: this.z0Carcass(), z1: this.height() - this.valanceH() };
  }

  activeZone(): Zone {
    return this.doorPosition() === "overlay" ? this.outerOpening() : this.innerOpening();
  }

  edgeFillerEnabled(): boolean {
    return truthy(this.p["include_edge_filler"]);
  }
  edgeFillerWidth(): number {
    return rmax(cm(toF(this.p["edge_filler_width"])), cm(1.0));
  }
  edgeFillerBottomOffset(): number {
    return cm(rmax(toF(this.p["edge_filler_bottom_offset"]), 0));
  }

  buildEdgeFillerStrip(e: Entities, x0: number, x1: number, zone: Zone, label = "فيلر", bottomOffset: number | null = null): void {
    if (x1 <= x0) return;
    const z0 = zone.z0 - this.doorBottomExtension() + (bottomOffset ?? this.edgeFillerBottomOffset());
    const z1 = zone.z1 - this.handleRecess();
    if (z1 <= z0) return;
    const overlay = this.doorPosition() === "overlay";
    const fy0 = overlay ? -this.frontT() : 0;
    const fy1 = overlay ? 0 : this.frontT();
    const pnl = createBox(this.ctx, e, label, x0, fy0, z0, x1, fy1, z1, this.frontColor());
    assignLayer(this.ctx, pnl, TAGS.front);
    if (this.edgeBandingEnabled()) bandAllSideEdges(this.ctx, pnl, this.edgeBandingMaterial());
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), label, x1 - x0, z1 - z0, this.frontT(), {
      banded: all(this.edgeBandingEnabled()), material: materialLabelName(this.frontColor()),
    });
  }

  // ---------------------------------------------------------------- fronts
  buildFrontZone(e: Entities, x0: number, x1: number, z0: number, z1: number, type: unknown, labelPrefix = "", forcedHinge: string | null = null): void {
    if (type === null || type === undefined || type === "none") return;
    if (x1 <= x0 || z1 <= z0) return;
    const overlay = this.doorPosition() === "overlay";
    const edgeGap = overlay ? this.doorGapOverlay() : this.doorGapInset();
    const fy0 = overlay ? -this.frontT() : 0;
    const fy1 = overlay ? 0 : this.frontT();
    const isBottom = Math.abs(z0 - this.innerOpening().z0) < cm(0.5) || Math.abs(z0 - this.outerOpening().z0) < cm(0.5);
    const bottomExt = isBottom && HINGED_DOOR_TYPES.includes(type as string) ? this.doorBottomExtension() : 0;
    const zoneRecess = isBottom ? this.handleRecess() : 0;
    const zx0 = x0 + edgeGap;
    const zx1 = x1 - edgeGap;
    const zz0 = z0 + edgeGap - bottomExt;
    const zz1 = z1 - edgeGap;
    if (zx1 <= zx0 || zz1 <= zz0) return;
    const fc = this.frontColor();
    const eb = this.edgeBandingEnabled();
    const ebm = () => this.edgeBandingMaterial();
    const singleHinge = () => {
      let hinge = forcedHinge ?? toS(this.p["single_door_hinge"]);
      if (hinge !== "left" && hinge !== "right") hinge = "left";
      return hinge;
    };

    switch (type) {
      case "single": {
        const top = rmax(zz1 - zoneRecess, zz0);
        if (top > zz0) {
          let f: Inst = createBox(this.ctx, e, `${labelPrefix}ضلفة`, zx0, fy0, zz0, zx1, fy1, top, fc);
          const hinge = singleHinge();
          const [hx, fx] = hinge === "left" ? [zx0, zx1] : [zx1, zx0];
          const direction = hinge === "left" ? 1.0 : -1.0;
          f = this.drillHingeCups(e, f, hx, direction, zz0, top, fy1);
          assignLayer(this.ctx, f, TAGS.front);
          tagDoorHinge(f, hx, fy0, fx, fy0, 0.0, -1.0);
          if (eb) bandAllSideEdges(this.ctx, f, ebm());
          this.recordDoorLabel(`${labelPrefix}ضلفة`, zx0, zx1, zz0, top, hinge);
        }
        break;
      }
      case "double": {
        const top = rmax(zz1 - zoneRecess, zz0);
        if (top > zz0) {
          const mid = (zx0 + zx1) / 2.0;
          const half = edgeGap / 2.0;
          let f1: Inst = createBox(this.ctx, e, `${labelPrefix}ضلفة شمال`, zx0, fy0, zz0, mid - half, fy1, top, fc);
          let f2: Inst = createBox(this.ctx, e, `${labelPrefix}ضلفة يمين`, mid + half, fy0, zz0, zx1, fy1, top, fc);
          f1 = this.drillHingeCups(e, f1, zx0, 1.0, zz0, top, fy1);
          f2 = this.drillHingeCups(e, f2, zx1, -1.0, zz0, top, fy1);
          assignLayer(this.ctx, f1, TAGS.front);
          assignLayer(this.ctx, f2, TAGS.front);
          tagDoorHinge(f1, zx0, fy0, mid - half, fy0, 0.0, -1.0);
          tagDoorHinge(f2, zx1, fy0, mid + half, fy0, 0.0, -1.0);
          if (eb) {
            bandAllSideEdges(this.ctx, f1, ebm());
            bandAllSideEdges(this.ctx, f2, ebm());
          }
          this.recordDoorLabel(`${labelPrefix}ضلفة شمال`, zx0, mid - half, zz0, top, "left");
          this.recordDoorLabel(`${labelPrefix}ضلفة يمين`, mid + half, zx1, zz0, top, "right");
        }
        break;
      }
      case "drawers":
        this.buildDrawersZone(e, zx0, zx1, zz0, zz1, fy0, fy1, labelPrefix);
        break;
      case "flip_up": {
        if (zz1 > zz0) {
          const f = createBox(this.ctx, e, `${labelPrefix}ضلفة قلاب`, zx0, fy0, zz0, zx1, fy1, zz1, fc);
          assignLayer(this.ctx, f, TAGS.front);
          const mx = (zx0 + zx1) / 2.0;
          tagDoorHinge3d(f, new Point3d(mx, fy0, zz1), new Vector3d(1, 0, 0), new Point3d(mx, fy0, zz0), new Vector3d(0, -1, 0));
          if (eb) bandAllSideEdges(this.ctx, f, ebm());
          this.recordDoorLabel(`${labelPrefix}ضلفة قلاب`, zx0, zx1, zz0, zz1, "top");
        }
        break;
      }
      case "flip_up_double": {
        if (zz1 > zz0) {
          const mid = (zx0 + zx1) / 2.0;
          const half = edgeGap / 2.0;
          const f1 = createBox(this.ctx, e, `${labelPrefix}ضلفة قلاب شمال`, zx0, fy0, zz0, mid - half, fy1, zz1, fc);
          const f2 = createBox(this.ctx, e, `${labelPrefix}ضلفة قلاب يمين`, mid + half, fy0, zz0, zx1, fy1, zz1, fc);
          assignLayer(this.ctx, f1, TAGS.front);
          assignLayer(this.ctx, f2, TAGS.front);
          const m1 = (zx0 + (mid - half)) / 2.0;
          const m2 = (mid + half + zx1) / 2.0;
          tagDoorHinge3d(f1, new Point3d(m1, fy0, zz1), new Vector3d(1, 0, 0), new Point3d(m1, fy0, zz0), new Vector3d(0, -1, 0));
          tagDoorHinge3d(f2, new Point3d(m2, fy0, zz1), new Vector3d(1, 0, 0), new Point3d(m2, fy0, zz0), new Vector3d(0, -1, 0));
          if (eb) {
            bandAllSideEdges(this.ctx, f1, ebm());
            bandAllSideEdges(this.ctx, f2, ebm());
          }
          this.recordDoorLabel(`${labelPrefix}ضلفة قلاب شمال`, zx0, mid - half, zz0, zz1, "top");
          this.recordDoorLabel(`${labelPrefix}ضلفة قلاب يمين`, mid + half, zx1, zz0, zz1, "top");
        }
        break;
      }
      case "single_glass":
      case "single_glass_metal": {
        const metal = type === "single_glass_metal";
        const top = rmax(zz1 - zoneRecess, zz0);
        if (top > zz0) {
          const name = `${labelPrefix}${metal ? "ضلفة زجاج معدن" : "ضلفة زجاج"}`;
          const f = this.buildFramedGlassDoor(e, zx0, zx1, zz0, top, fy0, fy1, name, metal ? this.metalFrameMaterial() : null);
          const hinge = singleHinge();
          const [hx, fx] = hinge === "left" ? [zx0, zx1] : [zx1, zx0];
          tagDoorHinge(f, hx, fy0, fx, fy0, 0.0, -1.0);
          this.recordDoorLabel(name, zx0, zx1, zz0, top, hinge);
        }
        break;
      }
      case "sliding": {
        const top = rmax(zz1 - zoneRecess, zz0);
        if (top > zz0) this.buildSlidingPanels(e, zx0, zx1, zz0, top, labelPrefix);
        break;
      }
      case "double_glass":
      case "double_glass_metal": {
        const metal = type === "double_glass_metal";
        const top = rmax(zz1 - zoneRecess, zz0);
        if (top > zz0) {
          const mid = (zx0 + zx1) / 2.0;
          const half = edgeGap / 2.0;
          const base = metal ? "ضلفة زجاج معدن" : "ضلفة زجاج";
          const fm = metal ? this.metalFrameMaterial() : null;
          const f1 = this.buildFramedGlassDoor(e, zx0, mid - half, zz0, top, fy0, fy1, `${labelPrefix}${base} شمال`, fm);
          const f2 = this.buildFramedGlassDoor(e, mid + half, zx1, zz0, top, fy0, fy1, `${labelPrefix}${base} يمين`, metal ? this.metalFrameMaterial() : null);
          tagDoorHinge(f1, zx0, fy0, mid - half, fy0, 0.0, -1.0);
          tagDoorHinge(f2, zx1, fy0, mid + half, fy0, 0.0, -1.0);
          this.recordDoorLabel(`${labelPrefix}${base} شمال`, zx0, mid - half, zz0, top, "left");
          this.recordDoorLabel(`${labelPrefix}${base} يمين`, mid + half, zx1, zz0, top, "right");
        }
        break;
      }
    }
  }

  glassMaterial(): Material {
    return this.once("glass_material", () => {
      const name = strip(toS(this.p["material_glass_name"]));
      const mat = getOrCreateNamedMaterial(this.ctx, name === "" ? "زجاج" : name, [200, 225, 230]);
      mat.alpha = 0.25;
      return mat;
    });
  }

  metalFrameMaterial(): Material {
    return this.once("metal_frame_material", () => {
      const name = strip(toS(this.p["material_metal_frame_name"]));
      return getOrCreateNamedMaterial(this.ctx, name === "" ? "برواز ألومنيوم" : name, [145, 148, 150]);
    });
  }

  buildFramedGlassDoorSide(e: Entities, y0: number, y1: number, z0: number, z1: number, fx0: number, fx1: number, label: string, frameMatIn: ColorOrMat | null = null): Group {
    const frameMat = frameMatIn ?? this.frontColor();
    const group = e.addGroup();
    group.name = label;
    const sub = group.entities;
    const L = this.ctx.labels;
    const ug = this.unitGroupName();
    const railW = rmin(cm(toF(this.p["glass_frame_width"])), (y1 - y0) / 2.5, (z1 - z0) / 2.5);
    if (railW > 0 && y1 - railW > y0 + railW && z1 - railW > z0 + railW) {
      const ft = Math.abs(fx1 - fx0);
      const fmn = materialLabelName(frameMat);
      createBox(this.ctx, sub, `${label} - إطار تحت`, fx0, y0, z0, fx1, y1, z0 + railW, frameMat);
      L.add(this.unitId!, ug, `${label} - إطار تحت`, y1 - y0, railW, ft, { banded: { ...NO_BAND }, material: fmn });
      createBox(this.ctx, sub, `${label} - إطار فوق`, fx0, y0, z1 - railW, fx1, y1, z1, frameMat);
      L.add(this.unitId!, ug, `${label} - إطار فوق`, y1 - y0, railW, ft, { banded: { ...NO_BAND }, material: fmn });
      createBox(this.ctx, sub, `${label} - إطار قريب`, fx0, y0, z0 + railW, fx1, y0 + railW, z1 - railW, frameMat);
      L.add(this.unitId!, ug, `${label} - إطار قريب`, z1 - z0 - 2 * railW, railW, ft, { banded: { ...NO_BAND }, material: fmn });
      createBox(this.ctx, sub, `${label} - إطار بعيد`, fx0, y1 - railW, z0 + railW, fx1, y1, z1 - railW, frameMat);
      L.add(this.unitId!, ug, `${label} - إطار بعيد`, z1 - z0 - 2 * railW, railW, ft, { banded: { ...NO_BAND }, material: fmn });
      const gt = rmax(rmin(cm(toF(this.p["glass_thickness"])), ft - cm(0.2)), cm(0.2));
      const mid = (fx0 + fx1) / 2.0;
      createBox(this.ctx, sub, `${label} - زجاج`, mid - gt / 2.0, y0 + railW, z0 + railW, mid + gt / 2.0, y1 - railW, z1 - railW, this.glassMaterial());
      L.add(this.unitId!, ug, `${label} - زجاج`, y1 - y0 - 2 * railW, z1 - z0 - 2 * railW, gt, { banded: { ...NO_BAND }, material: materialLabelName(this.glassMaterial()) });
    } else {
      createBox(this.ctx, sub, label, fx0, y0, z0, fx1, y1, z1, frameMat);
      L.add(this.unitId!, ug, label, y1 - y0, z1 - z0, Math.abs(fx1 - fx0), { banded: all(true), material: materialLabelName(frameMat) });
    }
    assignLayer(this.ctx, group, TAGS.front);
    return group;
  }

  buildFramedGlassDoor(e: Entities, x0: number, x1: number, z0: number, z1: number, fy0: number, fy1: number, label: string, frameMatIn: ColorOrMat | null = null): Group {
    const frameMat = frameMatIn ?? this.frontColor();
    const group = e.addGroup();
    group.name = label;
    const sub = group.entities;
    const L = this.ctx.labels;
    const ug = this.unitGroupName();
    const railW = rmin(cm(toF(this.p["glass_frame_width"])), (x1 - x0) / 2.5, (z1 - z0) / 2.5);
    if (railW > 0 && x1 - railW > x0 + railW && z1 - railW > z0 + railW) {
      const ft = Math.abs(fy1 - fy0);
      const fmn = materialLabelName(frameMat);
      createBox(this.ctx, sub, `${label} - إطار تحت`, x0, fy0, z0, x1, fy1, z0 + railW, frameMat);
      L.add(this.unitId!, ug, `${label} - إطار تحت`, x1 - x0, railW, ft, { banded: { ...NO_BAND }, material: fmn });
      createBox(this.ctx, sub, `${label} - إطار فوق`, x0, fy0, z1 - railW, x1, fy1, z1, frameMat);
      L.add(this.unitId!, ug, `${label} - إطار فوق`, x1 - x0, railW, ft, { banded: { ...NO_BAND }, material: fmn });
      createBox(this.ctx, sub, `${label} - إطار شمال`, x0, fy0, z0 + railW, x0 + railW, fy1, z1 - railW, frameMat);
      L.add(this.unitId!, ug, `${label} - إطار شمال`, z1 - railW - (z0 + railW), railW, ft, { banded: { ...NO_BAND }, material: fmn });
      createBox(this.ctx, sub, `${label} - إطار يمين`, x1 - railW, fy0, z0 + railW, x1, fy1, z1 - railW, frameMat);
      L.add(this.unitId!, ug, `${label} - إطار يمين`, z1 - railW - (z0 + railW), railW, ft, { banded: { ...NO_BAND }, material: fmn });
      const gt = rmax(rmin(cm(toF(this.p["glass_thickness"])), Math.abs(fy1 - fy0) - cm(0.2)), cm(0.2));
      const gm = (fy0 + fy1) / 2.0;
      createBox(this.ctx, sub, `${label} - زجاج`, x0 + railW, gm - gt / 2.0, z0 + railW, x1 - railW, gm + gt / 2.0, z1 - railW, this.glassMaterial());
      L.add(this.unitId!, ug, `${label} - زجاج`, x1 - railW - (x0 + railW), z1 - railW - (z0 + railW), gt, {
        banded: { ...NO_BAND }, material: materialLabelName(this.glassMaterial()),
      });
    } else {
      createBox(this.ctx, sub, label, x0, fy0, z0, x1, fy1, z1, frameMat);
      L.add(this.unitId!, ug, label, x1 - x0, z1 - z0, Math.abs(fy1 - fy0), { banded: all(true), material: materialLabelName(frameMat) });
    }
    assignLayer(this.ctx, group, TAGS.front);
    return group;
  }

  drillHingeCups(e: Entities, door: Inst, hingeX: number, direction: number, z0: number, z1: number, entryY: number): Inst {
    if (!truthy(this.p["include_hinge_cups"])) return door;
    try {
      const d = pcm(this.p["hinge_cup_diameter"]);
      const edge = pcm(this.p["hinge_cup_edge_distance"]);
      const count = Math.min(Math.max(toI(this.p["hinge_cup_count"]), 2), 4);
      if (z1 - z0 <= 2 * edge) return door;
      const cupX = hingeX + direction * edge;
      const positions = this.hingeCupPositions(z0, z1, edge, count);
      const actual: number[] = [];
      for (const cz of positions) {
        if (cz <= z0 || cz >= z1) continue;
        createHoleMarkerY(this.ctx, e, "كبة مفصلة", cupX, entryY, cz, d / 2.0, this.frontT(), COLORS.assembly);
        actual.push(cz);
      }
      this.tagHingeCupPositions(door, z0, z1, actual, direction);
      return door;
    } catch (err) {
      this.ctx.puts(`[KitchenUnitDesigner] Hinge cup warning: ${(err as Error).message}`);
      return door;
    }
  }

  tagHingeCupPositions(door: Inst, z0: number, z1: number, positionsZ: number[], direction: number): void {
    if (!positionsZ.length) return;
    const h = z1 - z0;
    if (h <= 0) return;
    const ratios = positionsZ.map((cz) => rround((cz - z0) / h, 4));
    door.setAttribute("KUD", "hinge_cup_ratios", ratios.map(fs).join(","));
    door.setAttribute("KUD", "hinge_side", direction > 0 ? "left" : "right");
  }

  hingeCupPositions(z0: number, z1: number, edge: number, count: number): number[] {
    const first = z0 + edge;
    const last = z1 - edge;
    if (count <= 2) return [first, last];
    const step = (last - first) / (count - 1);
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(first + step * i);
    return out;
  }

  // ---------------------------------------------------------------- drawers
  drawerHeightsFor(count: number, total: number): number[] {
    const explicit: (number | null)[] = [];
    for (let i = 1; i <= count; i++) {
      const v = i <= MAX_CUSTOM_DRAWERS ? toF(this.p[`drawer${i}_height`]) : 0;
      explicit.push(v > 0 ? cm(v) : null);
    }
    const explicitSum = rsumF(explicit.filter((v): v is number => v !== null));
    const autoCount = explicit.filter((v) => v === null).length;
    const available = total - this.drawerGap() * (count - 1) - explicitSum;
    const autoH = autoCount > 0 ? available / autoCount : 0;
    return explicit.map((v) => v ?? autoH);
  }

  buildDrawersZone(e: Entities, x0: number, x1: number, z0: number, z1: number, fy0: number, fy1: number, labelPrefix: string): void {
    const count = this.drawerCount();
    const total = z1 - z0;
    const heights = this.drawerHeightsFor(count, total);
    if (heights.some((h) => h <= 0)) return;
    let z = z0;
    heights.forEach((h, i) => {
      const dz0 = z;
      const full = z + h;
      const isTop = i === heights.length - 1;
      const fdz1 = isTop ? rmax(full - this.handleRecess(), dz0) : full;
      this.buildSingleDrawer(e, x0, x1, fy0, fy1, dz0, fdz1, full, i, heights.length, `${labelPrefix}درج ${i + 1}`);
      z = full + this.drawerGap();
    });
  }

  buildSingleDrawer(e: Entities, x0: number, x1: number, fy0: number, fy1: number, dz0: number, frontDz1: number, boxDz1: number, index: number, _total: number, label: string): void {
    if (frontDz1 <= dz0) return;
    const group = e.addGroup();
    group.name = label;
    const sub = group.entities;
    const f = createBox(this.ctx, sub, label, x0, fy0, dz0, x1, fy1, frontDz1, this.frontColor());
    assignLayer(this.ctx, f, TAGS.front);
    if (this.edgeBandingEnabled()) bandAllSideEdges(this.ctx, f, this.edgeBandingMaterial());
    this.recordDoorLabel(label, x0, x1, dz0, frontDz1, null);
    const [floorTop, floorBottom] = this.drawerBoxesEnabled() && boxDz1 > dz0 ? this.buildDrawerBox(sub, x0, x1, fy1, dz0, boxDz1, label) : [dz0, dz0];
    this.buildDrawerInsertFor(sub, index, x0, x1, fy1, dz0, floorTop);
    this.ctx.labels.addAssemblyMark(this.unitId!, this.unitGroupName(), "drawer", label, floorBottom - this.drawerSlideClearance() - this.z0Carcass());
    const openDistance = this.drawerSlideBase() + index * this.drawerSlideStep();
    tagDrawerSlide(group, openDistance);
  }

  buildDrawerInsertFor(e: Entities, index: number, x0: number, x1: number, fy1: number, _dz0: number, boxFloorZ: number): void {
    const type = toS(this.p[`drawer_insert_${index + 1}`]);
    if (type === "" || type === "none") return;
    const boxes = this.drawerBoxesEnabled();
    const ix0 = boxes ? x0 + this.drawerBoxSideClearance() + this.drawerBoxT() : x0 + cm(1.0);
    const ix1 = boxes ? x1 - this.drawerBoxSideClearance() - this.drawerBoxT() : x1 - cm(1.0);
    if (ix1 <= ix0) return;
    const iy0 = fy1 + (boxes ? this.drawerBoxT() : 0);
    const iy1 = boxes ? iy0 + rmax(this.drawerBoxDepthCm() - this.drawerBoxT() * 2, cm(10.0)) : iy0 + cm(30.0);
    const iz0 = boxFloorZ;
    if (type === "dividers") this.buildInsertDividers(e, ix0, ix1, iy0, iy1, iz0);
    else if (type === "cutlery") this.buildInsertCutlery(e, ix0, ix1, iy0, iy1, iz0);
    else if (type === "custom") {
      const v = this.parsePositionList(this.p[`drawer_insert_v_${index + 1}`]);
      const h = this.parsePositionList(this.p[`drawer_insert_h_${index + 1}`]);
      this.buildInsertCustom(e, ix0, ix1, iy0, iy1, iz0, v, h);
    }
  }

  parsePositionList(raw: unknown): number[] {
    return toS(raw)
      .split(",")
      .map((s) => strip(s))
      .filter((s) => s !== "")
      .map((s) => strictFloat(s))
      .filter((v): v is number => v !== null);
  }

  drawerInsertHeight(): number {
    return cm(rmax(toF(this.p["drawer_insert_height"]), 1.0));
  }
  drawerInsertThickness(): number {
    return cm(rmax(toF(this.p["drawer_insert_thickness"]), 0.3));
  }
  drawerInsertDividerCount(): number {
    return Math.min(Math.max(toI(this.p["drawer_insert_divider_count"]), 1), 10);
  }

  buildInsertDividers(e: Entities, x0: number, x1: number, y0: number, y1: number, z0: number): void {
    const count = this.drawerInsertDividerCount();
    const t = this.drawerInsertThickness();
    const h = this.drawerInsertHeight();
    const w = x1 - x0;
    if (w <= 0) return;
    const step = w / (count + 1);
    for (let i = 0; i < count; i++) {
      const x = x0 + step * (i + 1);
      const name = `فاصل تقسيمة ${i + 1}`;
      createBox(this.ctx, e, name, x - t / 2.0, y0, z0, x + t / 2.0, y1, z0 + h, this.carcassMaterial());
      this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, y1 - y0, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
    }
  }

  buildInsertCustom(e: Entities, x0: number, x1: number, y0: number, y1: number, z0: number, vs: number[], hs: number[]): void {
    const t = this.drawerInsertThickness();
    const h = this.drawerInsertHeight();
    if (x1 - x0 <= 0 || y1 - y0 <= 0) return;
    // v189: when dividers cross, both run the full length and are half-lapped into each other
    const lap = vs.length && hs.length ? { note: "تعشيقة نص بنص: شق بعرض السمك ونص الارتفاع عند كل تقاطع" } : {};
    vs.forEach((pos, i) => {
      const x = x0 + cm(pos);
      if (!(x > x0 && x < x1)) return;
      const name = `فاصل مخصص رأسي ${i + 1}`;
      createBox(this.ctx, e, name, x - t / 2.0, y0, z0, x + t / 2.0, y1, z0 + h, this.carcassMaterial());
      this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, y1 - y0, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName(), ...lap });
    });
    hs.forEach((pos, i) => {
      const y = y0 + cm(pos);
      if (!(y > y0 && y < y1)) return;
      const name = `فاصل مخصص أفقي ${i + 1}`;
      createBox(this.ctx, e, name, x0, y - t / 2.0, z0, x1, y + t / 2.0, z0 + h, this.carcassMaterial());
      this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, x1 - x0, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName(), ...lap });
    });
  }

  buildInsertCutlery(e: Entities, x0: number, x1: number, y0: number, y1: number, z0: number): void {
    const t = this.drawerInsertThickness();
    const h = this.drawerInsertHeight();
    const w = x1 - x0;
    if (w <= 0) return;
    const mid = x0 + w * 0.5;
    createBox(this.ctx, e, "فاصل أدوات - رأسي", mid - t / 2.0, y0, z0, mid + t / 2.0, y1, z0 + h, this.carcassMaterial());
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), "فاصل أدوات - رأسي", y1 - y0, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
    const my = y0 + (y1 - y0) / 2.0;
    createBox(this.ctx, e, "فاصل أدوات - أفقي", mid, my - t / 2.0, z0, x1, my + t / 2.0, z0 + h, this.carcassMaterial());
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), "فاصل أدوات - أفقي", x1 - mid, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
  }

  drawerSlideBase(): number {
    return pcm(this.p["drawer_slide_base"]);
  }
  drawerSlideStep(): number {
    return pcm(this.p["drawer_slide_step"]);
  }
  drawerSlideClearance(): number {
    return cm(rmax(toF(this.p["drawer_slide_clearance"]), 0));
  }
  drawerBoxesEnabled(): boolean {
    return truthy(this.p["include_drawer_boxes"]);
  }
  drawerBoxSideClearance(): number {
    return pcm(this.p["drawer_box_side_clearance"]);
  }
  drawerBoxDepthCm(): number {
    return pcm(this.p["drawer_box_depth"]);
  }
  drawerBoxBottomOffset(): number {
    return pcm(this.p["drawer_box_bottom_offset"]);
  }
  drawerBoxT(): number {
    return pcm(this.p["drawer_box_panel_thickness"]);
  }
  drawerBoxWallDrop(): number {
    return pcm(this.p["drawer_box_wall_drop"]);
  }
  drawerBoxBaseSetback(): number {
    return pcm(this.p["drawer_box_base_setback"]);
  }
  drawerBoxBaseT(): number {
    return pcm(this.p["drawer_box_base_thickness"]);
  }
  drawerBoxBaseGroove(): number {
    return pcm(this.p["drawer_box_base_groove"]);
  }

  buildDrawerBox(e: Entities, fx0: number, fx1: number, fby: number, dz0: number, dz1: number, label: string, depthOverride: number | null = null): [number, number] {
    const bx0 = fx0 + this.drawerBoxSideClearance();
    const bx1 = fx1 - this.drawerBoxSideClearance();
    if (bx1 <= bx0) return [dz0, dz0];
    const by0 = fby;
    const maxDepth = rmax(this.depth() - this.backT() - this.backRearOffset() - by0, 0);
    const by1 = by0 + rmin(depthOverride ?? this.drawerBoxDepthCm(), maxDepth);
    if (by1 <= by0) return [dz0, dz0];
    const t = rmin(this.drawerBoxT(), (bx1 - bx0) / 2.5);
    if (t <= 0) return [dz0, dz0];
    const fh = dz1 - dz0;
    const wallH = rmin(rmax(fh - this.drawerBoxWallDrop(), cm(1)), fh);
    const sz0 = rmin(dz0 + this.drawerBoxBottomOffset(), dz0 + wallH - cm(1));
    const sz1 = dz0 + wallH;
    if (sz1 <= sz0) return [dz0, dz0];
    const span = sz1 - sz0;
    const setback = rmin(rmax(this.drawerBoxBaseSetback(), 0), span - cm(0.3));
    const baseT = rmin(rmax(this.drawerBoxBaseT(), cm(0.3)), span - setback);
    const bz0 = sz0 + setback;
    const bz1 = bz0 + baseT;
    const L = this.ctx.labels;
    const ug = this.unitGroupName();
    const eb = this.edgeBandingEnabled();
    const up = new Vector3d(0, 0, 1);

    const sl = createBox(this.ctx, e, `${label} - جنب شمال`, bx0, by0, sz0, bx0 + t, by1, sz1, this.carcassMaterial());
    assignLayer(this.ctx, sl, TAGS.front);
    if (eb) bandEdge(this.ctx, sl, up, this.edgeBandingMaterial());
    const sideSpan = rmax(sz1 - sz0, 0.001);
    const sgr = bz1 > bz0 ? rmin(((bz0 + bz1) / 2.0 - sz0) / sideSpan, 1.0) : null;
    L.add(this.unitId!, ug, `${label} - جنب شمال`, by1 - by0, sz1 - sz0, t, {
      banded: { top: true, bottom: false, left: false, right: false }, groove: sgr !== null, groove_axis: "vertical", groove_ratio: sgr, material: this.carcassMaterialName(),
    });
    const sr = createBox(this.ctx, e, `${label} - جنب يمين`, bx1 - t, by0, sz0, bx1, by1, sz1, this.carcassMaterial());
    assignLayer(this.ctx, sr, TAGS.front);
    if (eb) bandEdge(this.ctx, sr, up, this.edgeBandingMaterial());
    L.add(this.unitId!, ug, `${label} - جنب يمين`, by1 - by0, sz1 - sz0, t, {
      banded: { top: true, bottom: false, left: false, right: false }, groove: sgr !== null, groove_axis: "vertical", groove_ratio: sgr, material: this.carcassMaterialName(),
    });

    if (bz1 <= sz1) {
      const groove = rmin(rmax(this.drawerBoxBaseGroove(), 0), t - cm(0.1));
      const bsx0 = bx0 + t - groove;
      const bsx1 = bx1 - t + groove;
      if (bsx1 > bsx0) {
        const base = createBox(this.ctx, e, `${label} - قاعدة`, bsx0, by0, bz0, bsx1, by1, bz1, this.backMaterial());
        assignLayer(this.ctx, base, TAGS.front);
        L.add(this.unitId!, ug, `${label} - قاعدة`, bsx1 - bsx0, by1 - by0, baseT, { banded: { ...NO_BAND }, material: materialLabelName(this.backMaterial()) });
      }
    }

    const fbz0 = rmin(bz1, sz1);
    const fbz1 = sz1;
    if (!(fbz1 > fbz0)) return [bz1, bz0];
    const fw = createBox(this.ctx, e, `${label} - جدار أمامي`, bx0 + t, by0, fbz0, bx1 - t, by0 + t, fbz1, this.carcassMaterial());
    assignLayer(this.ctx, fw, TAGS.front);
    if (eb) bandEdge(this.ctx, fw, up, this.edgeBandingMaterial());
    L.add(this.unitId!, ug, `${label} - جدار أمامي`, bx1 - t - (bx0 + t), fbz1 - fbz0, t, {
      banded: { top: true, bottom: false, left: false, right: false }, material: this.carcassMaterialName(),
    });
    const bw = createBox(this.ctx, e, `${label} - ظهر`, bx0 + t, by1 - t, fbz0, bx1 - t, by1, fbz1, this.carcassMaterial());
    assignLayer(this.ctx, bw, TAGS.front);
    if (eb) bandEdge(this.ctx, bw, up, this.edgeBandingMaterial());
    L.add(this.unitId!, ug, `${label} - ظهر`, bx1 - t - (bx0 + t), fbz1 - fbz0, t, {
      banded: { top: true, bottom: false, left: false, right: false }, material: this.carcassMaterialName(),
    });

    if (this.assemblyHoles()) {
      const zc = (bz0 + bz1) / 2.0;
      this.markDrawerBoxJoint(e, "left", bx0, bx1, by0, by1, sz0, sz1, zc, t, `${label} - شمال`);
      this.markDrawerBoxJoint(e, "right", bx0, bx1, by0, by1, sz0, sz1, zc, t, `${label} - يمين`);
    }
    return [bz1, bz0];
  }

  markDrawerBoxJoint(e: Entities, side: string, bx0: number, bx1: number, by0: number, by1: number, _z0: number, _z1: number, camZc: number, wallT: number, label: string): void {
    const inward = side === "left" ? 1.0 : -1.0;
    const edgeX = side === "left" ? bx0 + wallT : bx1 - wallT;
    const boxDepth = by1 - by0;
    const ed = this.assemblyEdgeDist();
    const sp = this.assemblyHoleSpacing();
    const frontSet = [ed, ed + sp, ed + 2 * sp];
    const backSet = [boxDepth - ed, boxDepth - ed - sp, boxDepth - ed - 2 * sp];
    for (const [setLabel, offs] of [["قدام", frontSet], ["ورا", backSet]] as [string, number[]][]) {
      if (setLabel === "ورا" && rmin(...offs) <= rmax(...frontSet) + sp) continue;
      offs.forEach((yOff, i) => {
        if (yOff < 0 || yOff > boxDepth) return;
        const y = by0 + yOff;
        const scx = edgeX - inward * (this.assemblySideDepth() / 2.0);
        const m1 = createHoleMarker(this.ctx, e, `ثقب أليتا - ${label} - ${setLabel} - جنب - ${i + 1}`, scx, y, camZc, this.assemblyHoleD() / 2.0, this.assemblySideDepth(), COLORS.assembly);
        assignLayer(this.ctx, m1, TAGS.assembly);
        if (i !== 1) return;
        const camX = edgeX + inward * this.assemblyBaseDepth();
        const camZ = camZc - cm(0.5);
        const m3 = createHoleMarkerZ(this.ctx, e, `ثقب قفل كام - ${label} - ${setLabel}`, camX, y, camZ, this.assemblyCamD() / 2.0, this.assemblyCamDepth(), COLORS.assembly);
        assignLayer(this.ctx, m3, TAGS.assembly);
      });
    }
  }

  // ---------------------------------------------------------------- stacks, fixed panels, cavities
  bottomStackBounds(zone: Zone, legacyParam: string): { bottom_z1: number; vent_z0: number | null; vent_z1: number | null; cavity_z0: number } {
    const ventH = cm(toF(this.p["bottom_vent_panel_height"]));
    if (ventH <= 0) {
      const cz0 = rmin(zone.z0 + cm(toF(this.p[legacyParam])), zone.z1);
      return { bottom_z1: cz0, vent_z0: null, vent_z1: null, cavity_z0: cz0 };
    }
    const bhp = toF(this.p["bottom_zone_height"]);
    const bh = bhp > 0 ? cm(bhp) : rmax(cm(toF(this.p[legacyParam])) - ventH, 0);
    const bz1 = rmin(zone.z0 + bh, zone.z1);
    const vz0 = bz1;
    const vz1 = rmin(vz0 + ventH, zone.z1);
    return { bottom_z1: bz1, vent_z0: vz0, vent_z1: vz1, cavity_z0: vz1 };
  }

  buildBottomStack(e: Entities, zone: Zone, b: ReturnType<CarcassBuilder["bottomStackBounds"]>, belowType: unknown, labelPrefix: string): void {
    if (b.bottom_z1 > zone.z0) this.buildFrontZone(e, zone.x0, zone.x1, zone.z0, b.bottom_z1, belowType, labelPrefix);
    if (!(b.vent_z1 !== null && b.vent_z1 > b.vent_z0!)) return;
    this.buildFixedPanel(e, zone.x0, zone.x1, b.vent_z0!, b.vent_z1, `${labelPrefix}تهوية`);
  }

  buildFixedPanel(e: Entities, x0: number, x1: number, z0: number, z1: number, name: string, material: ColorOrMat | null = null): void {
    if (x1 <= x0 || z1 <= z0) return;
    const pm = material ?? this.frontColor();
    const overlay = this.doorPosition() === "overlay";
    const fy0 = overlay ? -this.frontT() : 0;
    const fy1 = overlay ? 0 : this.frontT();
    const pnl = createBox(this.ctx, e, name, x0, fy0, z0, x1, fy1, z1, pm);
    assignLayer(this.ctx, pnl, TAGS.front);
    if (this.edgeBandingEnabled()) bandAllSideEdges(this.ctx, pnl, this.edgeBandingMaterial());
    this.ctx.labels.add(this.unitId!, this.unitGroupName(), name, x1 - x0, z1 - z0, this.frontT(), {
      banded: all(this.edgeBandingEnabled()), material: materialLabelName(pm),
    });
  }

  buildTopValancePanel(e: Entities, x0: number, x1: number): void {
    if (!this.topValance()) return;
    const z1 = this.height() - this.panelT();
    const z0 = z1 - this.valanceH();
    this.buildFixedPanel(e, x0 + this.doorGapInset(), x1 - this.doorGapInset(), z0, z1, "أورزة علوية");
  }

  buildBottomValancePanel(e: Entities, x0: number, x1: number): void {
    if (!this.bottomValance()) return;
    const z0 = this.z0Carcass() + this.panelT();
    const z1 = z0 + this.bottomValanceH();
    this.buildFixedPanel(e, x0 + this.doorGapInset(), x1 - this.doorGapInset(), z0, z1, "وزرة ليد سفلية");
  }

  buildCavityWithFillers(e: Entities, zone: Zone, z0: number, z1: number, cavityWidthCm: unknown, align: unknown, label: string): Zone {
    if (z1 <= z0) return { x0: zone.x0, x1: zone.x1, z0, z1 };
    const available = zone.x1 - zone.x0;
    const w = rmin(pcm(cavityWidthCm), available);
    let cx0: number;
    let cx1: number;
    const a = toS(align);
    if (a === "left") {
      cx0 = zone.x0;
      cx1 = cx0 + w;
    } else if (a === "right") {
      cx1 = zone.x1;
      cx0 = cx1 - w;
    } else {
      cx0 = zone.x0 + (available - w) / 2.0;
      cx1 = cx0 + w;
    }
    // v186: a filler thinner than half a millimetre (rounding when the cavity spans the whole
    // opening) produced "Duplicate points in array" — snap it away
    const tol = cm(0.05);
    if (cx0 - zone.x0 < tol) cx0 = zone.x0;
    if (zone.x1 - cx1 < tol) cx1 = zone.x1;
    if (cx0 > zone.x0) this.buildFixedPanel(e, zone.x0, cx0, z0, z1, `${label} فيلر شمال`);
    if (cx0 > zone.x0) this.ctx.labels.addDividerMark(this.unitId!, this.unitGroupName(), `${label} فيلر شمال`, (zone.x0 + cx0) / 2.0 - this.innerOpening().x0, "filler");
    if (zone.x1 > cx1) this.buildFixedPanel(e, cx1, zone.x1, z0, z1, `${label} فيلر يمين`);
    if (zone.x1 > cx1) this.ctx.labels.addDividerMark(this.unitId!, this.unitGroupName(), `${label} فيلر يمين`, (cx1 + zone.x1) / 2.0 - this.innerOpening().x0, "filler");
    return { x0: cx0, x1: cx1, z0, z1 };
  }
}
