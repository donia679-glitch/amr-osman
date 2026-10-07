// Port of lib/builders_core.rb — CarcassBuilder, the shared pipeline of every rectangular
// kitchen unit (sides with back groove, bottom/top, back, shelves, dividers, countertop, cleat,
// end panel, fillers, door/drawer fronts, drawer boxes and inserts). Method for method, same
// order of operations, same inch arithmetic — the parity tests compare with real SketchUp.
import { rround, sum as rsumF } from "../core/rubyMath.js";
import { COLORS, FRONT_THICKNESS_CM, MIN_DIMENSION_CM } from "./config.js";
import { addColoredMarkerFace, adjustForFinish, assignLayer, bandAllSideEdges, bandEdge, bandEdges, createBox, createFlatSlab, createHoleMarker, createHoleMarkerY, createHoleMarkerZ, createSlabAlongX, getOrCreateNamedMaterial, hexToRgb, tagDoorHinge, tagDoorHinge3d, tagDrawerSlide, NO_BAND, } from "./helpers.js";
import { fs, strictFloat, strip, toF, toI, toS, truthy } from "./rb.js";
import { cm, Point3d, rmax, rmin, Transformation, Vector3d } from "./su/geom.js";
import { Entities, Group, Material, RubyError } from "./su/model.js";
import { hingesForDoor } from "./hardware.js";
export const TAGS = {
    carcass: "Kitchen - Carcass",
    back: "Kitchen - Back Panel",
    countertop: "Kitchen - Countertop",
    front: "Kitchen - Front",
    kick: "Kitchen - Toe Kick",
    shelf: "Kitchen - Shelves",
    assembly: "Kitchen - Assembly Points",
};
export const HINGED_DOOR_TYPES = [
    "single", "double", "flip_up", "flip_up_double",
    "single_glass", "double_glass", "single_glass_metal", "double_glass_metal",
];
export const MAX_CUSTOM_DRAWERS = 8;
export const argError = (msg) => new RubyError("ArgumentError", msg);
const pcm = (v) => cm(toF(v));
const all = (b) => ({ top: b, bottom: b, left: b, right: b });
/** cup centres along a hinge edge of length len: first/last `edge` from the ends, the rest evenly between */
export function hingeCupPositionsAlong(z0, z1, edge, count) {
    const first = z0 + edge;
    const last = z1 - edge;
    if (count <= 2)
        return [first, last];
    const step = (last - first) / (count - 1);
    const out = [];
    for (let i = 0; i < count; i++)
        out.push(first + step * i);
    return out;
}
/** NOVERA: how many hinges a door of this length (inches) gets — the user's «عدد الكبب» or the shared rule (hardware.js) */
export function hingeCountIn(p, lenIn) {
    return hingesForDoor(lenIn / cm(1.0), p);
}
/** the cup positions as ratios of the hinge edge's length (the label's hinge_ratios), [] when cups are off */
export function hingeRatiosFor(p, lenIn) {
    if (!truthy(p["include_hinge_cups"]))
        return [];
    const edge = pcm(p["hinge_cup_edge_distance"]);
    if (!(lenIn > 2 * edge))
        return [];
    return hingeCupPositionsAlong(0, lenIn, edge, hingeCountIn(p, lenIn)).filter((c) => c > 0 && c < lenIn).map((c) => rround(c / lenIn, 4));
}
/** material_label_name */
export function materialLabelName(m) {
    return m instanceof Material ? m.name : "خامة افتراضية";
}
export class CarcassBuilder {
    ctx;
    params;
    unitId = null;
    xOffset = 0;
    memo = new Map();
    constructor(ctx, params) {
        this.ctx = ctx;
        this.params = params;
        this.validateCommon();
    }
    once(k, f) {
        if (!this.memo.has(k))
            this.memo.set(k, f());
        return this.memo.get(k);
    }
    build(parent, xOffsetCm = 0) {
        this.xOffset = cm(xOffsetCm);
        const group = parent.addGroup();
        group.name = this.unitGroupName();
        group.setAttribute("KUD", "is_kitchen_unit", true);
        this.unitId = group.entityID;
        const e = group.entities;
        if (this.toeKick()) {
            if (this.kickDrawer())
                this.buildKickDrawer(e);
            else
                this.buildKick(e);
        }
        this.buildSides(e);
        this.buildBottom(e);
        this.buildTop(e);
        this.buildBackPanel(e);
        if (this.shelvesEnabled())
            this.buildShelves(e);
        if (this.verticalDividersEnabled())
            this.buildVerticalDividers(e);
        if (this.baseUnit())
            this.buildCountertop(e);
        if (this.ledPanelBelow())
            this.buildLedPanel(e);
        if (this.wallCleatEnabled())
            this.buildWallCleat(e);
        if (this.endPanelEnabled())
            this.buildEndPanel(e);
        if (this.outerFillerEnabled())
            this.buildOuterFiller(e);
        this.buildFrontContent(e);
        this.applyObstacles(e);
        if (this.xOffset !== 0)
            group.transformBang(Transformation.translation([this.xOffset, 0, 0]));
        return group;
    }
    /** columns / ledges / pipes are cut by the app on the built meshes (apps/ipad/obstacles.js, same rules as lib/obstacles.rb) */
    applyObstacles(_e) { }
    buildFrontContent(_e) {
        throw new RubyError("NotImplementedError", "يجب تنفيذ build_front_content في الفئة الفرعية");
    }
    // ---------------------------------------------------------------- names & basic dims
    unitGroupName() {
        const label = strip(toS(this.params["unit_label"]));
        return label === "" ? "Kitchen Unit" : `Kitchen Unit - ${label}`;
    }
    get p() {
        return this.params;
    }
    width() {
        return this.once("width", () => pcm(this.p["width"]));
    }
    depth() {
        return this.once("depth", () => pcm(this.p["depth"]));
    }
    height() {
        return this.once("height", () => pcm(this.p["height"]));
    }
    panelT() {
        return this.once("panel_t", () => pcm(this.p["panel_thickness"]));
    }
    backT() {
        return this.once("back_t", () => pcm(this.p["back_panel_thickness"]));
    }
    backRearOffset() {
        return this.once("back_rear_offset", () => pcm(this.p["back_rear_offset"]));
    }
    backGroove() {
        return this.once("back_groove", () => pcm(this.p["back_groove_depth"]));
    }
    countertopT() {
        return this.once("countertop_t", () => pcm(this.p["countertop_thickness"]));
    }
    frontT() {
        return cm(FRONT_THICKNESS_CM);
    }
    unitType() {
        return toS(this.p["unit_type"]);
    }
    baseUnit() {
        return this.unitType() === "base";
    }
    doorPosition() {
        return toS(this.p["door_position"]);
    }
    doorGapInset() {
        return pcm(this.p["door_gap_inset"]);
    }
    doorGapOverlay() {
        return pcm(this.p["door_gap_overlay"]);
    }
    drawerGap() {
        return pcm(this.p["drawer_gap"]);
    }
    drawerCount() {
        return Math.min(Math.max(toI(this.p["drawer_count"]), 1), 15);
    }
    handleRecess() {
        return pcm(this.p["door_handle_recess"] ?? 0);
    }
    /** v107 (NOVERA): a base unit with a handle gap and no other handle gets the built-in aluminium profile (handles.js effectiveCfg) —
     *  then EVERY drawer front leaves the gap at its top (a C profile between drawers, the L under the counter) and the boxes stay under it */
    golaMode() {
        if (toS(this.p["unit_type"]) !== "base" || !(this.handleRecess() > 0))
            return false;
        const h = this.p["kud_handles"];
        const t = h && typeof h === "object" && !Array.isArray(h) ? toS(h["type"]) : "";
        return t === "" || t === "none" || t === "gola";
    }
    doorBottomExtension() {
        return pcm(toF(this.p["door_bottom_extension"]));
    }
    shelvesEnabled() {
        return truthy(this.p["include_shelves"]);
    }
    shelfCount() {
        return Math.min(Math.max(toI(this.p["shelf_count"]), 0), 30);
    }
    frameShelvesEnabled() {
        return truthy(this.p["include_appliance_frame_shelves"]);
    }
    belowZoneShelfCount() {
        return Math.min(Math.max(toI(this.p["below_zone_shelf_count"]), 0), 20);
    }
    aboveZoneShelfCount() {
        return Math.min(Math.max(toI(this.p["above_zone_shelf_count"]), 0), 20);
    }
    toeKick() {
        return truthy(this.p["include_toe_kick"]);
    }
    kickH() {
        return this.once("kick_h", () => (this.toeKick() ? pcm(this.p["toe_kick_height"]) : 0));
    }
    kickSetback() {
        return pcm(this.p["toe_kick_setback"]);
    }
    kickSegmentW() {
        return pcm(this.p["toe_kick_segment_width"]);
    }
    kickSegmentGap() {
        return pcm(this.p["toe_kick_segment_gap"]);
    }
    toeKickStyle() {
        return toS(this.p["toe_kick_style"]);
    }
    kickApronT() {
        return pcm(this.p["toe_kick_apron_thickness"]);
    }
    /** v191: a drawer in the plinth space instead of the kick (base / tall units with a kick) */
    kickDrawer() {
        return this.toeKick() && this.unitType() !== "wall" && truthy(this.p["toe_kick_drawer"]);
    }
    kickDrawerFloorGap() {
        return cm(rmax(toF(this.p["toe_kick_drawer_floor_gap"] ?? 1.0), 0));
    }
    topValance() {
        return truthy(this.p["include_top_valance"]);
    }
    valanceH() {
        return this.topValance() ? pcm(this.p["top_valance_height"]) : 0;
    }
    bottomValance() {
        return truthy(this.p["include_bottom_valance"]);
    }
    bottomValanceH() {
        return this.bottomValance() ? pcm(this.p["bottom_valance_height"]) : 0;
    }
    topRails() {
        return toS(this.p["top_style"]) === "rails";
    }
    topRailW() {
        return pcm(this.p["top_rail_width"]);
    }
    topRailFrontInset() {
        return pcm(this.p["top_rail_front_inset"]);
    }
    assemblyHoles() {
        return truthy(this.p["include_assembly_holes"]);
    }
    assemblyHoleD() {
        return pcm(this.p["assembly_hole_diameter"]);
    }
    assemblyEdgeDist() {
        return pcm(this.p["assembly_edge_distance"]);
    }
    assemblyHoleSpacing() {
        return pcm(toF(this.p["assembly_hole_spacing"]));
    }
    assemblySideDepth() {
        return pcm(toF(this.p["assembly_side_depth"]));
    }
    assemblyBaseDepth() {
        return pcm(toF(this.p["assembly_base_depth"]));
    }
    assemblyCamD() {
        return pcm(toF(this.p["assembly_cam_diameter"]));
    }
    assemblyCamDepth() {
        return pcm(toF(this.p["assembly_cam_depth"]));
    }
    z0Carcass() {
        return this.kickH();
    }
    frontColor() {
        return this.once("front_color", () => {
            const rgb = adjustForFinish(hexToRgb(this.p["door_color"]), toS(this.p["door_finish"]));
            const name = strip(toS(this.p["material_front_name"]));
            return name === "" ? rgb : getOrCreateNamedMaterial(this.ctx, name, rgb);
        });
    }
    carcassMaterial() {
        return this.once("carcass_material", () => {
            const name = strip(toS(this.p["material_carcass_name"]));
            return name === "" ? COLORS.carcass : getOrCreateNamedMaterial(this.ctx, name, COLORS.carcass);
        });
    }
    backMaterial() {
        return this.once("back_material", () => {
            const name = strip(toS(this.p["material_back_name"]));
            return name === "" ? COLORS.back_panel : getOrCreateNamedMaterial(this.ctx, name, COLORS.back_panel);
        });
    }
    countertopMaterial() {
        return this.once("countertop_material", () => {
            const name = strip(toS(this.p["material_countertop_name"]));
            return name === "" ? COLORS.countertop : getOrCreateNamedMaterial(this.ctx, name, COLORS.countertop);
        });
    }
    edgeBandingEnabled() {
        return truthy(this.p["include_edge_banding"]);
    }
    edgeBandingMaterial() {
        return this.once("edge_banding_material", () => {
            let name = strip(toS(this.p["edge_banding_material_name"]));
            if (name === "")
                name = "شريط حواف";
            return getOrCreateNamedMaterial(this.ctx, name, COLORS.assembly);
        });
    }
    // ---------------------------------------------------------------- validation
    validateCommon() {
        const p = this.p;
        for (const k of ["width", "depth", "height", "panel_thickness", "back_panel_thickness", "countertop_thickness"]) {
            if (toF(p[k]) <= 0)
                throw argError(`الحقل '${k}' يجب أن يكون أكبر من صفر.`);
        }
        if (toF(p["width"]) < MIN_DIMENSION_CM || toF(p["depth"]) < MIN_DIMENSION_CM || toF(p["height"]) < MIN_DIMENSION_CM) {
            throw argError(`الأبعاد صغيرة جداً (الحد الأدنى ${fs(MIN_DIMENSION_CM)} سم).`);
        }
        if (toF(p["width"]) <= 2 * toF(p["panel_thickness"]))
            throw argError("العرض أقل من ضعف سمك الأجناب — لا توجد مساحة داخلية.");
        if (toF(p["back_groove_depth"]) > toF(p["panel_thickness"]))
            throw argError("عمق دخول الظهرية داخل المفحار أكبر من سمك الجنب.");
        if (truthy(p["include_toe_kick"]) && toF(p["toe_kick_height"]) >= toF(p["height"]))
            throw argError("ارتفاع السكلو السفلي أكبر من أو يساوي ارتفاع الوحدة.");
        if (truthy(p["include_top_valance"]) && toF(p["top_valance_height"]) >= toF(p["height"]))
            throw argError("ارتفاع الأورزة العلوية كبير جداً مقارنة بارتفاع الوحدة.");
        if (truthy(p["include_assembly_holes"]) && toF(p["assembly_edge_distance"]) * 2 >= toF(p["depth"])) {
            throw argError("بُعد ثقب التجميع عن الحافة كبير جداً مقارنة بعمق الوحدة.");
        }
        if (toI(p["repeat_count"]) < 1)
            throw argError("عدد الوحدات المكررة يجب أن يكون واحداً على الأقل.");
    }
    // ---------------------------------------------------------------- kick
    buildKick(e) {
        if (this.toeKickStyle() === "apron")
            this.buildKickApron(e);
        else
            this.buildKickSegments(e);
    }
    buildKickSegments(e) {
        if (this.kickSegmentW() <= 0)
            return;
        let count = Math.ceil(this.width() / (this.kickSegmentW() + this.kickSegmentGap()));
        if (count < 1)
            count = 1;
        const segW = (this.width() - this.kickSegmentGap() * (count - 1)) / count;
        if (segW <= 0)
            return;
        for (let i = 0; i < count; i++) {
            const x0 = i * (segW + this.kickSegmentGap());
            const x1 = x0 + segW;
            const name = `سكلو ${i + 1}`;
            const k = createBox(this.ctx, e, name, x0, this.kickSetback(), 0, x1, this.depth(), this.kickH(), this.carcassMaterial());
            assignLayer(this.ctx, k, TAGS.kick);
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, x1 - x0, this.depth() - this.kickSetback(), this.kickH(), {
                banded: { ...NO_BAND }, material: this.carcassMaterialName(),
            });
        }
    }
    buildKickApron(e) {
        if (this.kickApronT() <= 0)
            return;
        const y0 = this.kickSetback();
        const y1 = rmin(y0 + this.kickApronT(), this.depth());
        if (y1 <= y0)
            return;
        const k = createBox(this.ctx, e, "وزرة سكلو", 0, y0, 0, this.width(), y1, this.kickH(), this.carcassMaterial());
        assignLayer(this.ctx, k, TAGS.kick);
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "وزرة سكلو", this.width(), this.kickH(), y1 - y0, {
            banded: { ...NO_BAND }, material: this.carcassMaterialName(),
        });
    }
    /**
     * درج الوزرة: بدل السكلو، جنبين سكلو (بيشيلوا المجرى) + وش درج على مستوى الضلف + علبة درج واطية
     * تحت قاعدة الوحدة. لو المسافة صغيرة على درج (أقل من 6 سم وش) بيرجع للسكلو العادي.
     */
    buildKickDrawer(e) {
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
        for (const [nm, x0] of [["جنب سكلو شمال", pt], ["جنب سكلو يمين", this.width() - 2 * pt]]) {
            const k = createBox(this.ctx, e, nm, x0, ry0, 0, x0 + pt, this.depth(), kh, this.carcassMaterial());
            assignLayer(this.ctx, k, TAGS.carcass);
            L.add(this.unitId, ug, nm, this.depth() - ry0, kh, pt, { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
        }
        const label = "درج وزرة";
        const group = e.addGroup();
        group.name = label;
        const sub = group.entities;
        const f = createBox(this.ctx, sub, label, fx0, fy0, fz0, fx1, fy1, fz1, this.frontColor());
        assignLayer(this.ctx, f, TAGS.front);
        if (this.edgeBandingEnabled())
            bandAllSideEdges(this.ctx, f, this.edgeBandingMaterial());
        this.recordDoorLabel(label, fx0, fx1, fz0, fz1, null);
        // the plinth drawer always gets its box (a front alone is no drawer); its depth can be set on its own
        const kd = toF(this.p["toe_kick_drawer_depth"]);
        this.buildDrawerBox(sub, 2 * pt, this.width() - 2 * pt, fy1, fz0, rmax(kh - cm(0.5), fz0 + cm(2.0)), label, kd > 0 ? cm(kd) : null);
        tagDrawerSlide(group, this.drawerSlideBase());
    }
    // ---------------------------------------------------------------- sides
    buildSides(e) {
        const sideGlass = toS(this.p["side_glass_door"]);
        // v110: a glass side stands the full carcass height like a solid side (the bottom / top / rails join it the same way)
        const sideTop = this.height();
        const sideBottom = this.z0Carcass();
        const pt = this.panelT();
        let l;
        if (sideGlass === "left") {
            l = this.buildFramedGlassDoorSide(e, 0, this.depth(), sideBottom, sideTop, 0, pt, "جنب شمال (زجاج)", this.metalFrameMaterial());
            tagDoorHinge(l, pt / 2.0, this.depth(), pt / 2.0, 0, -1.0, 0.0);
            if (this.edgeBandingEnabled())
                bandAllSideEdges(this.ctx, l, this.edgeBandingMaterial());
        }
        else {
            l = this.buildGroovedSide(e, "جنب شمال", 0, pt, true);
            this.bandSideAllEdges(l);
            this.markLedChannel(l, pt);
        }
        assignLayer(this.ctx, l, TAGS.carcass);
        if (sideGlass !== "left")
            this.recordSideLabel("جنب شمال"); // a glass side's frame rails + glass were labelled by buildFramedGlassDoorSide
        let r;
        if (sideGlass === "right") {
            r = this.buildFramedGlassDoorSide(e, 0, this.depth(), sideBottom, sideTop, this.width() - pt, this.width(), "جنب يمين (زجاج)", this.metalFrameMaterial());
            tagDoorHinge(r, this.width() - pt / 2.0, this.depth(), this.width() - pt / 2.0, 0, 1.0, 0.0);
            if (this.edgeBandingEnabled())
                bandAllSideEdges(this.ctx, r, this.edgeBandingMaterial());
        }
        else {
            r = this.buildGroovedSide(e, "جنب يمين", this.width() - pt, this.width(), false);
            this.bandSideAllEdges(r);
            this.markLedChannel(r, this.width() - pt);
        }
        assignLayer(this.ctx, r, TAGS.carcass);
        if (sideGlass !== "right")
            this.recordSideLabel("جنب يمين");
    }
    sideGroovePresent() {
        const [gy0, gy1] = this.grooveYRange();
        return this.backGroove() > 0 && gy1 > gy0;
    }
    carcassMaterialName() {
        return materialLabelName(this.carcassMaterial());
    }
    frontMaterialName() {
        const name = strip(toS(this.p["material_front_name"]));
        return name === "" ? "خامة الضلف" : name;
    }
    recordDoorLabel(name, x0, x1, z0, z1, hingeSide) {
        const bandedAll = this.edgeBandingEnabled();
        let ratios = [];
        if (truthy(this.p["include_hinge_cups"]) && hingeSide) {
            const edge = pcm(this.p["hinge_cup_edge_distance"]);
            // v110: the same count the hardware list buys (explicit «عدد الكبب», else the NOVERA rule on the hinge edge)
            const count = hingeCountIn(this.p, hingeSide === "top" ? x1 - x0 : z1 - z0);
            if (hingeSide === "top") {
                const w = x1 - x0;
                if (w > 2 * edge) {
                    const pos = this.hingeCupPositions(x0, x1, edge, count).filter((cx) => cx > x0 && cx < x1);
                    ratios = pos.map((cx) => rround((cx - x0) / w, 4));
                }
            }
            else {
                const h = z1 - z0;
                if (h > 2 * edge) {
                    const pos = this.hingeCupPositions(z0, z1, edge, count).filter((cz) => cz > z0 && cz < z1);
                    ratios = pos.map((cz) => rround((cz - z0) / h, 4));
                }
            }
        }
        this.ctx.labels.add(this.unitId, this.unitGroupName(), name, x1 - x0, z1 - z0, this.frontT(), {
            banded: all(bandedAll), hinge_ratios: ratios, hinge_side: hingeSide, material: this.frontMaterialName(),
        });
    }
    recordSideLabel(name) {
        const bandedAll = this.edgeBandingEnabled();
        let grooveRatio = null;
        if (this.sideGroovePresent()) {
            const [gy0, gy1] = this.grooveYRange();
            grooveRatio = rmin((gy0 + gy1) / 2.0 / rmax(this.depth(), 0.001), 1.0);
        }
        let ledRatio = null;
        if (this.ledMarkerEnabled()) {
            const y0 = rmax(this.ledOffset(), 0);
            const y1 = rmin(y0 + this.ledWidth(), this.depth());
            if (y1 > y0)
                ledRatio = rmin((y0 + y1) / 2.0 / rmax(this.depth(), 0.001), 1.0);
        }
        this.ctx.labels.add(this.unitId, this.unitGroupName(), name, this.depth(), this.height() - this.z0Carcass(), this.panelT(), {
            // NOVERA v101 (Amr): every edge is banded except where it joins another board. The sides stand outside (bottom, top / rails between
            // them), so a side has no joint on its edges: all four are banded (the top end under the counter, the bottom end over the legs too)
            banded: { left: bandedAll, right: bandedAll, top: bandedAll, bottom: bandedAll }, groove: grooveRatio !== null, groove_axis: "vertical", groove_ratio: grooveRatio,
            led: ledRatio !== null, led_ratio: ledRatio, material: this.carcassMaterialName(),
        });
    }
    // ---------------------------------------------------------------- LED board under a wall / ceiling unit
    /** a horizontal board fixed under the unit, flush with the doors' face, with the LED strip in a groove
     *  near its front edge (the board between the wall units and the units up to the ceiling) */
    ledPanelBelow() {
        return this.unitType() === "wall" && truthy(this.p["led_panel_below"]);
    }
    buildLedPanel(e) {
        const t = this.panelT();
        const overlay = this.doorPosition() === "overlay";
        const y0 = (overlay ? -this.frontT() : 0) + rmax(pcm(this.p["led_panel_setback"] ?? 0), 0);
        const y1 = this.depth();
        if (y1 <= y0)
            return;
        const color = truthy(this.p["led_panel_front_color"] ?? true) ? this.frontColor() : this.carcassMaterial();
        const pnl = createBox(this.ctx, e, "لوح ليد", 0, y0, -t, this.width(), y1, 0, color);
        assignLayer(this.ctx, pnl, TAGS.carcass);
        if (this.edgeBandingEnabled())
            bandEdges(this.ctx, pnl, [new Vector3d(0, -1, 0), new Vector3d(-1, 0, 0), new Vector3d(1, 0, 0)], this.edgeBandingMaterial());
        // the LED groove on its underside, behind the front edge
        const ly0 = y0 + rmax(this.ledOffset(), 0), ly1 = rmin(ly0 + rmax(this.ledWidth(), cm(1)), y1);
        if (ly1 > ly0)
            addColoredMarkerFace(this.ctx, pnl, [new Point3d(cm(1), ly0, -t), new Point3d(this.width() - cm(1), ly0, -t), new Point3d(this.width() - cm(1), ly1, -t), new Point3d(cm(1), ly1, -t)], COLORS.led);
        const b = this.edgeBandingEnabled();
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "لوح ليد", this.width(), y1 - y0, t, {
            banded: { top: false, bottom: b, left: b, right: b }, led: true, led_ratio: rmin((ly0 + ly1) / 2 / rmax(y1 - y0, 0.001), 1), material: color === this.frontColor() ? this.frontMaterialName() : this.carcassMaterialName(),
        });
    }
    ledMarkerEnabled() {
        return truthy(this.p["include_led_marker"]);
    }
    ledOffset() {
        return pcm(this.p["led_marker_offset"]);
    }
    ledWidth() {
        return pcm(this.p["led_marker_width"]);
    }
    markLedChannel(piece, innerX) {
        if (!this.ledMarkerEnabled())
            return;
        const z0 = this.innerOpening().z0;
        const z1 = this.innerOpening().z1;
        if (z1 <= z0)
            return;
        const y0 = rmax(this.ledOffset(), 0);
        const y1 = rmin(y0 + this.ledWidth(), this.depth());
        if (y1 <= y0)
            return;
        const pts = [new Point3d(innerX, y0, z0), new Point3d(innerX, y1, z0), new Point3d(innerX, y1, z1), new Point3d(innerX, y0, z1)];
        addColoredMarkerFace(this.ctx, piece, pts, COLORS.led);
    }
    // ---------------------------------------------------------------- bottom
    buildBottom(e) {
        const pt = this.panelT();
        if (this.hoodLift() > 0)
            return this.buildHoodShelf(e);
        const piece = this.ptrapEnabled()
            ? this.buildBottomWithPtrap(e)
            : this.buildGroovedHorizontal(e, "قاعدة", pt, this.width() - pt, this.z0Carcass(), this.z0Carcass() + pt, "notch_at_top");
        this.bandFrontAndBack(piece);
        this.recordHorizontalLabel("قاعدة", pt, this.width() - pt, 0, this.depth());
    }
    ptrapEnabled() {
        return truthy(this.p["include_ptrap_opening"]);
    }
    /** the raised bottom over the hood body, with the duct cut-out (and the matching hole in the head) */
    buildHoodShelf(e) {
        const pt = this.panelT(), z0 = this.z0Carcass() + this.hoodLift();
        const piece = this.buildGroovedHorizontal(e, "جلسة الشفاط", pt, this.width() - pt, z0, z0 + pt, "notch_at_top");
        this.bandFrontAndBack(piece);
        this.recordHorizontalLabel("جلسة الشفاط", pt, this.width() - pt, 0, this.depth());
        const r = this.hoodDuctR();
        const last = this.ctx.labels.last(this.unitId, "جلسة الشفاط");
        const ductNote = this.hoodDuctNote();
        const note = `جلسة الشفاط: جسم الشفاط بيتعلق تحتها (ارتفاع الفراغ ${rround(this.hoodLift() / cm(1.0), 1)} سم) ومسامير التثبيت من جوه الوحدة · ${ductNote} · بريزة الشفاط جوه الوحدة فوق الجلسة`;
        if (last) last.note = last.note ? `${last.note} | ${note}` : note;
        if (r > 0) {
            const cx = this.width() / 2.0, cy = this.depth() / 2.0 + cm(2.0);
            const m1 = createHoleMarkerZ(this.ctx, e, "فتحة مجرى الشفاط (الجلسة)", cx, cy, z0 + pt / 2.0, r, pt + cm(0.2), COLORS.assembly);
            assignLayer(this.ctx, m1, TAGS.assembly);
            const m2 = createHoleMarkerZ(this.ctx, e, "فتحة مجرى الشفاط (الرأس)", cx, cy, this.height() - pt / 2.0, r, pt + cm(0.2), COLORS.assembly);
            assignLayer(this.ctx, m2, TAGS.assembly);
        }
    }
    hoodDuctNote() {
        const r = this.hoodDuctR();
        return r > 0 ? `فتحة مجرى الشفاط Ø${rround(r * 2 / cm(1.0), 0)} سم في النص على بعد ${rround(this.depth() / cm(1.0) / 2 + 2, 0)} سم من الحرف الأمامي` : "";
    }
    buildBottomWithPtrap(e) {
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
    wallCleatEnabled() {
        return truthy(this.p["include_wall_cleat"]);
    }
    buildWallCleat(e) {
        const cleatH = cm(rmax(toF(this.p["wall_cleat_height"]), 4.0));
        const cleatW = this.width();
        if (cleatW <= 0)
            return;
        const cz0 = rmax(this.height() - cm(6.0) - cleatH, this.z0Carcass());
        const cz1 = cz0 + cleatH;
        const backY = this.depth() - this.backT();
        const pt = this.panelT();
        const a = createBox(this.ctx, e, "كليت الوحدة (يتقطع 45°)", 0, backY - pt, cz0, cleatW, backY, cz1, this.carcassMaterial());
        assignLayer(this.ctx, a, TAGS.carcass);
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "كليت الوحدة (يتقطع 45°)", cleatW, cleatH, pt, {
            banded: { ...NO_BAND }, material: materialLabelName(this.carcassMaterial()),
            note: "⚠ يتقطع بزاوية 45° على طول القطعة — النص العلوي يتثبت في ظهر الوحدة، النص السفلي بيتعلّق على كليت الحيطة",
        });
        const b = createBox(this.ctx, e, "كليت الحيطة (يتقطع 45°)", 0, backY - pt * 2, cz0, cleatW, backY - pt, cz1, this.carcassMaterial());
        assignLayer(this.ctx, b, TAGS.carcass);
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "كليت الحيطة (يتقطع 45°)", cleatW, cleatH, pt, {
            banded: { ...NO_BAND }, material: materialLabelName(this.carcassMaterial()),
            note: "⚠ يتقطع بزاوية 45° مكمّلة لكليت الوحدة — بيتثبت في الحيطة أولاً، وبعدين الوحدة تتعلّق عليه",
        });
    }
    endPanelEnabled() {
        return truthy(this.p["include_end_panel"]);
    }
    outerFillerEnabled() {
        return truthy(this.p["include_outer_filler"]);
    }
    outerFillerPosition() {
        return toS(this.p["outer_filler_position"]);
    }
    outerFillerWidth() {
        return rmax(cm(toF(this.p["outer_filler_width"])), cm(1.0));
    }
    outerFillerBottomOffset() {
        return cm(rmax(toF(this.p["outer_filler_bottom_offset"]), 0));
    }
    buildOuterFiller(e) {
        if (!this.outerFillerEnabled())
            return;
        const zone = this.activeZone();
        const fw = this.outerFillerWidth();
        const pos = this.outerFillerPosition();
        if (pos === "start" || pos === "both") {
            this.buildEdgeFillerStrip(e, -fw, 0, zone, "فيلر خارجي شمال", this.outerFillerBottomOffset());
            this.ctx.labels.addDividerMark(this.unitId, this.unitGroupName(), "فيلر خارجي شمال", -fw / 2.0 - this.innerOpening().x0, "filler");
        }
        if (pos === "end" || pos === "both") {
            this.buildEdgeFillerStrip(e, this.width(), this.width() + fw, zone, "فيلر خارجي يمين", this.outerFillerBottomOffset());
            this.ctx.labels.addDividerMark(this.unitId, this.unitGroupName(), "فيلر خارجي يمين", this.width() + fw / 2.0 - this.innerOpening().x0, "filler");
        }
    }
    buildEndPanel(e) {
        let side = toS(this.p["end_panel_side"]);
        if (side !== "left" && side !== "right")
            side = "left";
        const t = rmax(cm(toF(this.p["end_panel_thickness"])), cm(0.3));
        const [x0, x1] = side === "left" ? [-t, 0] : [this.width(), this.width() + t];
        const z0 = this.z0Carcass() - this.doorBottomExtension();
        const overlay = this.doorPosition() === "overlay";
        const y0 = overlay ? -this.frontT() : 0;
        const y1 = this.depth();
        const pnl = createBox(this.ctx, e, "تقفيلة نهاية", x0, y0, z0, x1, y1, this.height(), this.frontColor());
        assignLayer(this.ctx, pnl, TAGS.front);
        if (this.edgeBandingEnabled())
            bandAllSideEdges(this.ctx, pnl, this.edgeBandingMaterial());
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "تقفيلة نهاية", y1 - y0, this.height() - z0, t, {
            banded: all(this.edgeBandingEnabled()), material: materialLabelName(this.frontColor()),
        });
        this.ctx.labels.addDividerMark(this.unitId, this.unitGroupName(), `تقفيلة نهاية (${side === "left" ? "شمال" : "يمين"})`, (x0 + x1) / 2.0 - this.innerOpening().x0, "filler");
    }
    // ---------------------------------------------------------------- top
    buildTop(e) {
        if (this.topRails())
            this.buildTopRails(e);
        else {
            const pt = this.panelT();
            const piece = this.buildGroovedHorizontal(e, "رأس", pt, this.width() - pt, this.height() - pt, this.height(), "notch_at_bottom");
            this.bandFrontAndBack(piece);
            this.recordHorizontalLabel("رأس", pt, this.width() - pt, 0, this.depth());
        }
        if (this.hoodLift() > 0 && this.hoodDuctR() > 0) {
            const head = this.ctx.labels.last(this.unitId, this.topRails() ? "شريط علوي خلفي" : "رأس");
            if (head) head.note = [head.note, `${this.hoodDuctNote()} (لو التفريغ لفوق)`].filter(Boolean).join(" | ");
        }
    }
    recordHorizontalLabel(name, x0, x1, y0, y1) {
        const bandedAll = this.edgeBandingEnabled();
        let [gy0, gy1] = this.grooveYRange();
        gy0 = rmax(gy0, y0);
        gy1 = rmin(gy1, y1);
        const hasGroove = this.backGroove() > 0 && gy1 > gy0;
        const span = rmax(y1 - y0, 0.001);
        const grooveRatio = hasGroove ? rmin(((gy0 + gy1) / 2.0 - y0) / span, 1.0) : null;
        this.ctx.labels.add(this.unitId, this.unitGroupName(), name, x1 - x0, y1 - y0, this.panelT(), {
            // v101: a board between the sides — its ends join the sides, its front and back edges are banded (the back rail's inner edge too)
            banded: { top: bandedAll, bottom: bandedAll, left: false, right: false },
            groove: hasGroove, groove_axis: "horizontal", groove_ratio: grooveRatio, material: this.carcassMaterialName(),
        });
    }
    buildTopRails(e) {
        if (this.topRailW() <= 0)
            return;
        const pt = this.panelT();
        const backY1 = this.depth();
        const backY0 = rmax(this.depth() - this.topRailW(), 0);
        const bp = this.buildGroovedHorizontal(e, "شريط علوي خلفي", pt, this.width() - pt, this.height() - pt, this.height(), "notch_at_bottom", backY0, backY1);
        this.bandFrontAndBack(bp);
        this.recordHorizontalLabel("شريط علوي خلفي", pt, this.width() - pt, backY0, backY1);
        const fy0 = rmax(this.topRailFrontInset(), 0);
        const fy1 = rmin(fy0 + this.topRailW(), backY0);
        if (!(fy1 > fy0))
            return;
        const f = createBox(this.ctx, e, "شريط علوي أمامي", pt, fy0, this.height() - pt, this.width() - pt, fy1, this.height(), this.carcassMaterial());
        assignLayer(this.ctx, f, TAGS.carcass);
        this.bandFrontAndBack(f);
        this.recordHorizontalLabel("شريط علوي أمامي", pt, this.width() - pt, fy0, fy1);
    }
    bandSideAllEdges(piece) {
        if (!this.edgeBandingEnabled())
            return;
        bandEdges(this.ctx, piece, [new Vector3d(0, -1, 0), new Vector3d(0, 1, 0), new Vector3d(0, 0, 1), new Vector3d(0, 0, -1)], this.edgeBandingMaterial());
    }
    bandFrontAndBack(piece) {
        if (!this.edgeBandingEnabled())
            return;
        bandEdges(this.ctx, piece, [new Vector3d(0, -1, 0), new Vector3d(0, 1, 0)], this.edgeBandingMaterial());
    }
    grooveYRange() {
        const gy0 = rmax(this.depth() - this.backRearOffset() - this.backT(), 0);
        const gy1 = rmin(this.depth() - this.backRearOffset(), this.depth());
        return [gy0, gy1];
    }
    buildGroovedSide(e, name, x0, x1, innerAtX1) {
        const [gy0, gy1] = this.grooveYRange();
        const z0 = this.z0Carcass();
        const d = this.depth();
        if (this.backGroove() <= 0 || gy1 <= gy0)
            return createBox(this.ctx, e, name, x0, 0, z0, x1, d, this.height(), this.carcassMaterial());
        let pts;
        if (innerAtX1) {
            const deep = x1 - this.backGroove();
            pts = [
                new Point3d(x0, 0, 0), new Point3d(x1, 0, 0), new Point3d(x1, gy0, 0), new Point3d(deep, gy0, 0),
                new Point3d(deep, gy1, 0), new Point3d(x1, gy1, 0), new Point3d(x1, d, 0), new Point3d(x0, d, 0),
            ];
        }
        else {
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
    buildGroovedHorizontal(e, name, x0, x1, z0, z1, notchSide, y0 = 0, y1In = null) {
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
        let yz;
        if (notchSide === "notch_at_top") {
            const nz = z1 - this.backGroove();
            const tf = Math.abs(gy0 - y0) < tol;
            const tb = Math.abs(gy1 - y1) < tol;
            if (tf && tb)
                yz = [[y0, z0], [y0, nz], [y1, nz], [y1, z0]];
            else if (tb)
                yz = [[y0, z0], [y0, z1], [gy0, z1], [gy0, nz], [y1, nz], [y1, z0]];
            else if (tf)
                yz = [[y0, nz], [gy1, nz], [gy1, z1], [y1, z1], [y1, z0], [y0, z0]];
            else
                yz = [[y0, z0], [y0, z1], [gy0, z1], [gy0, nz], [gy1, nz], [gy1, z1], [y1, z1], [y1, z0]];
        }
        else {
            const nz = z0 + this.backGroove();
            const tf = Math.abs(gy0 - y0) < tol;
            const tb = Math.abs(gy1 - y1) < tol;
            if (tf && tb)
                yz = [[y0, nz], [y0, z1], [y1, z1], [y1, nz]];
            else if (tb)
                yz = [[y0, z1], [y0, z0], [gy0, z0], [gy0, nz], [y1, nz], [y1, z1]];
            else if (tf)
                yz = [[y0, nz], [gy1, nz], [gy1, z0], [y1, z0], [y1, z1], [y0, z1]];
            else
                yz = [[y0, z1], [y0, z0], [gy0, z0], [gy0, nz], [gy1, nz], [gy1, z0], [y1, z0], [y1, z1]];
        }
        const piece = createSlabAlongX(this.ctx, e, name, x0, x1, yz, this.carcassMaterial());
        this.tagGrooveInfo(piece);
        assignLayer(this.ctx, piece, TAGS.carcass);
        return piece;
    }
    tagGrooveInfo(piece) {
        piece.setAttribute("KUD", "has_back_groove", true);
        piece.setAttribute("KUD", "groove_depth_cm", toF(this.p["back_groove_depth"]));
    }
    buildBackPanel(e) {
        const pt = this.panelT();
        const bg = this.backGroove();
        const x0 = pt - bg;
        const x1 = this.width() - pt + bg;
        const z0 = this.z0Carcass() + this.hoodLift() + pt - bg; // v110: over the raised hood shelf, not through it
        const z1 = this.height() - pt + bg;
        const y1 = this.depth() - this.backRearOffset();
        const y0 = y1 - this.backT();
        const b = createBox(this.ctx, e, "ظهر", x0, y0, z0, x1, y1, z1, this.backMaterial());
        assignLayer(this.ctx, b, TAGS.back);
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "ظهر", x1 - x0, z1 - z0, this.backT(), {
            banded: { ...NO_BAND }, material: materialLabelName(this.backMaterial()),
        });
    }
    buildCountertop(e) {
        if (this.sinkCutoutEnabled())
            this.buildCountertopWithSinkCutout(e);
        else {
            const c = createBox(this.ctx, e, "كونتر", 0, 0, this.height(), this.width(), this.depth(), this.height() + this.countertopT(), this.countertopMaterial());
            assignLayer(this.ctx, c, TAGS.countertop);
        }
    }
    sinkCutoutEnabled() {
        return truthy(this.p["include_sink_cutout"]);
    }
    buildCountertopWithSinkCutout(e) {
        const W = this.width();
        const D = this.depth();
        const cw = rmin(cm(toF(this.p["sink_cutout_width"])), W - cm(4));
        const cd = rmin(cm(toF(this.p["sink_cutout_depth"])), D - cm(4));
        if (cw <= 0 || cd <= 0)
            return this.buildCountertopSolidFallback(e);
        const offX = cm(toF(this.p["sink_cutout_offset_x"]));
        const offY = cm(toF(this.p["sink_cutout_offset_y"]));
        const cx0 = rmin(rmax(W / 2.0 - cw / 2.0 + offX, cm(2)), W - cw - cm(2));
        const cy0 = rmin(rmax(offY, cm(2)), D - cd - cm(2));
        const cx1 = cx0 + cw;
        const cy1 = cy0 + cd;
        if (cx1 >= W || cy1 >= D || cx0 <= 0 || cy0 <= 0)
            return this.buildCountertopSolidFallback(e);
        const z0 = this.height();
        const z1 = this.height() + this.countertopT();
        const m = this.countertopMaterial();
        const parts = [
            createBox(this.ctx, e, "كونتر - أمامي", 0, 0, z0, W, cy0, z1, m),
            createBox(this.ctx, e, "كونتر - خلفي", 0, cy1, z0, W, D, z1, m),
            createBox(this.ctx, e, "كونتر - شمال", 0, cy0, z0, cx0, cy1, z1, m),
            createBox(this.ctx, e, "كونتر - يمين", cx1, cy0, z0, W, cy1, z1, m),
        ];
        for (const pc of parts)
            assignLayer(this.ctx, pc, TAGS.countertop);
    }
    buildCountertopSolidFallback(e) {
        const c = createBox(this.ctx, e, "كونتر", 0, 0, this.height(), this.width(), this.depth(), this.height() + this.countertopT(), this.countertopMaterial());
        assignLayer(this.ctx, c, TAGS.countertop);
    }
    // ---------------------------------------------------------------- shelves & dividers
    interiorDepthStart() {
        if (this.slidingDoors())
            return this.slidingDepth();
        return this.doorPosition() === "overlay" ? 0 : this.frontT();
    }
    // ---------------------------------------------------------------- v190: sliding doors (any unit)
    /** door_type "sliding": the front is 2–4 panels on two tracks instead of hinged doors */
    slidingDoors() {
        return toS(this.p["door_type"]) === "sliding";
    }
    /** behind sliding doors the inside starts after both tracks (+0.5 cm), so shelves never touch the doors */
    slidingDepth() {
        if (this.doorPosition() === "overlay")
            return cm(0.5);
        return 2 * this.frontT() + cm(0.6) + cm(0.5);
    }
    slidingPanelCount() {
        return Math.min(Math.max(toI(this.p["sliding_panel_count"]), 2), 4);
    }
    slidingOverlap() {
        return cm(2.0);
    }
    /** n panels across x0..x1 overlapping 2 cm; every other one runs in the back track,
     *  a full door thickness + 0.6 cm behind (in front of it when the doors are overlay) */
    buildSlidingPanels(e, x0, x1, z0, z1, labelPrefix = "") {
        const n = this.slidingPanelCount();
        const totalW = x1 - x0;
        if (totalW <= 0 || z1 <= z0)
            return;
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
            if (this.edgeBandingEnabled())
                bandAllSideEdges(this.ctx, pnl, this.edgeBandingMaterial());
            const b = this.edgeBandingEnabled();
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, px1 - px0, z1 - z0, this.frontT(), {
                banded: { top: b, bottom: b, left: b, right: b }, material: materialLabelName(this.frontColor()),
                note: "⚠ باب سحّاب — هيتركّب على سكة علوية/سفلية، مش مفصلات",
            });
        }
    }
    shelfDepthEnd(y0) {
        return rmax(this.depth() - this.backT() - this.backRearOffset(), y0 + this.panelT());
    }
    /** v188: custom shelf heights — cm from the unit's inner bottom to the underside of each shelf, comma separated */
    shelfPositions() {
        const tr = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "٫": ".", "،": "," };
        const raw = toS(this.p["shelf_positions"]).replace(/[٠-٩٫،]/g, (c) => tr[c] ?? c);
        if (raw.trim() === "")
            return [];
        return raw.split(/[,;\s]+/).filter((x) => x !== "").map((x) => toF(x)).filter((v) => v >= 0).slice(0, 30);
    }
    buildShelves(e) {
        const positions = this.shelfPositions();
        const count = this.shelfCount();
        if (count <= 0 && positions.length === 0)
            return;
        const o = this.innerOpening();
        const total = o.z1 - o.z0;
        if (total <= 0)
            return;
        const y0 = this.interiorDepthStart();
        const sde = this.shelfDepthEnd(y0);
        const columns = this.shelfColumns(o.x0, o.x1);
        let zs;
        if (positions.length) {
            const pt = this.panelT(), lo = o.z0 + pt / 2.0, hi = o.z1 - pt / 2.0;
            zs = positions.map((q) => Math.min(Math.max(o.z0 + cm(q) + pt / 2.0, lo), hi)).sort((a, b) => a - b);
        }
        else {
            const step = total / (count + 1);
            zs = [];
            for (let i = 1; i <= count; i++)
                zs.push(o.z0 + step * i);
        }
        zs.forEach((sz, i) => this.buildShelfRow(e, columns, y0, sde, sz, `رف ${i + 1}`));
    }
    buildSingleShelfAt(e, z, label = "رف", align = "center") {
        const o = this.innerOpening();
        const y0 = this.interiorDepthStart();
        const sde = this.shelfDepthEnd(y0);
        if (sde <= y0)
            return null;
        const pt = this.panelT();
        const [sz0, sz1] = align === "below" ? [z - pt, z] : align === "above" ? [z, z + pt] : [z - pt / 2.0, z + pt / 2.0];
        const s = createBox(this.ctx, e, label, o.x0, y0, sz0, o.x1, sde, sz1, this.carcassMaterial());
        assignLayer(this.ctx, s, TAGS.shelf);
        if (this.edgeBandingEnabled())
            bandEdge(this.ctx, s, new Vector3d(0, -1, 0), this.edgeBandingMaterial());
        this.recordShelfLabel(label, o.x1 - o.x0, sde - y0, sz0);
        return s;
    }
    buildShelvesInRange(e, z0, z1, count, x0In = null, x1In = null, positions = []) {
        const o = this.innerOpening();
        const x0 = x0In ?? o.x0;
        const x1 = x1In ?? o.x1;
        const total = z1 - z0;
        if (total <= 0)
            return;
        const y0 = this.interiorDepthStart();
        const sde = this.shelfDepthEnd(y0);
        const columns = this.shelfColumns(x0, x1);
        let zs;
        if (positions.length)
            zs = positions.map((pp) => rmin(rmax(z0 + cm(pp), z0), z1));
        else {
            if (count <= 0)
                return;
            const step = total / (count + 1);
            zs = [];
            for (let i = 1; i <= count; i++)
                zs.push(z0 + step * i);
        }
        zs.forEach((sz, i) => this.buildShelfRow(e, columns, y0, sde, sz, `رف ${i + 1}`));
    }
    buildShelfRow(e, columns, y0, sde, sz, baseLabel) {
        const pt = this.panelT();
        columns.forEach(([cx0, cx1], i) => {
            const label = columns.length > 1 ? `${baseLabel} - ${i + 1}` : baseLabel;
            const s = createBox(this.ctx, e, label, cx0, y0, sz - pt / 2.0, cx1, sde, sz + pt / 2.0, this.carcassMaterial());
            assignLayer(this.ctx, s, TAGS.shelf);
            if (this.edgeBandingEnabled())
                bandEdge(this.ctx, s, new Vector3d(0, -1, 0), this.edgeBandingMaterial());
            this.recordShelfLabel(label, cx1 - cx0, sde - y0, sz - pt / 2.0);
        });
    }
    recordShelfLabel(name, xSpan, ySpan, zBottom = null) {
        const bandedFront = this.edgeBandingEnabled();
        this.ctx.labels.add(this.unitId, this.unitGroupName(), name, xSpan, ySpan, this.panelT(), {
            banded: { top: false, bottom: bandedFront, left: false, right: false }, material: this.carcassMaterialName(),
        });
        if (zBottom !== null)
            this.ctx.labels.addAssemblyMark(this.unitId, this.unitGroupName(), "shelf", name, zBottom - this.z0Carcass());
    }
    shelfColumns(x0, x1) {
        if (!this.verticalDividersEnabled())
            return [[x0, x1]];
        const count = this.verticalDividerCount();
        const total = x1 - x0;
        if (count <= 0 || total <= 0)
            return [[x0, x1]];
        const step = total / (count + 1);
        const pt = this.panelT();
        const bounds = [x0];
        for (let i = 0; i < count; i++) {
            const dx = x0 + step * (i + 1);
            bounds.push(dx - pt / 2.0, dx + pt / 2.0);
        }
        bounds.push(x1);
        const columns = [];
        for (let i = 0; i < bounds.length; i += 2) {
            const a = bounds[i];
            const b = bounds[i + 1];
            if (b !== undefined && b > a)
                columns.push([a, b]);
        }
        return columns;
    }
    verticalDividersEnabled() {
        return truthy(this.p["include_vertical_dividers"]);
    }
    verticalDividerCount() {
        return Math.min(Math.max(toI(this.p["vertical_divider_count"]), 0), 10);
    }
    buildVerticalDividers(e) {
        const count = this.verticalDividerCount();
        if (count <= 0)
            return;
        const o = this.innerOpening();
        const total = o.x1 - o.x0;
        if (total <= 0)
            return;
        const y0 = this.interiorDepthStart();
        const dde = this.shelfDepthEnd(y0);
        const step = total / (count + 1);
        const pt = this.panelT();
        for (let i = 0; i < count; i++) {
            const dx = o.x0 + step * (i + 1);
            const name = `قاطوع رأسي ${i + 1}`;
            const d = createBox(this.ctx, e, name, dx - pt / 2.0, y0, o.z0, dx + pt / 2.0, dde, o.z1, this.carcassMaterial());
            assignLayer(this.ctx, d, TAGS.carcass);
            if (this.edgeBandingEnabled())
                bandEdge(this.ctx, d, new Vector3d(0, -1, 0), this.edgeBandingMaterial());
            // v110 (v101 rule): the front edge is free → banded; top / bottom / back join the carcass
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, dde - y0, o.z1 - o.z0, pt, { banded: { ...NO_BAND, left: this.edgeBandingEnabled() }, material: this.carcassMaterialName() });
            this.ctx.labels.addDividerMark(this.unitId, this.unitGroupName(), name, dx - o.x0);
        }
    }
    // ---------------------------------------------------------------- openings
    innerOpening() {
        const pt = this.panelT();
        return { x0: pt, x1: this.width() - pt, z0: this.z0Carcass() + this.hoodLift() + pt, z1: this.height() - pt - this.valanceH() };
    }
    outerOpening() {
        return { x0: 0, x1: this.width(), z0: this.z0Carcass() + this.hoodLift(), z1: this.height() - this.valanceH() };
    }
    /** NOVERA v55: a hood built into a wall unit — the bottom is raised by the hood body's height, the hood hangs in the open zone under it */
    hoodEnabled() {
        return this.unitType() === "wall" && truthy(this.p["include_hood"]);
    }
    hoodLift() {
        return this.once("hood_lift", () => (this.hoodEnabled() ? rmin(rmax(pcm(this.p["hood_height"]), 0), rmax(this.height() - 3 * this.panelT(), 0)) : 0));
    }
    hoodDuctR() {
        return rmax(pcm(this.p["hood_duct_diameter"]), 0) / 2.0;
    }
    activeZone() {
        return this.doorPosition() === "overlay" ? this.outerOpening() : this.innerOpening();
    }
    edgeFillerEnabled() {
        return truthy(this.p["include_edge_filler"]);
    }
    edgeFillerWidth() {
        return rmax(cm(toF(this.p["edge_filler_width"])), cm(1.0));
    }
    edgeFillerBottomOffset() {
        return cm(rmax(toF(this.p["edge_filler_bottom_offset"]), 0));
    }
    buildEdgeFillerStrip(e, x0, x1, zone, label = "فيلر", bottomOffset = null) {
        if (x1 <= x0)
            return;
        const z0 = zone.z0 - this.doorBottomExtension() + (bottomOffset ?? this.edgeFillerBottomOffset());
        const z1 = zone.z1 - this.handleRecess();
        if (z1 <= z0)
            return;
        const overlay = this.doorPosition() === "overlay";
        const fy0 = overlay ? -this.frontT() : 0;
        const fy1 = overlay ? 0 : this.frontT();
        const pnl = createBox(this.ctx, e, label, x0, fy0, z0, x1, fy1, z1, this.frontColor());
        assignLayer(this.ctx, pnl, TAGS.front);
        if (this.edgeBandingEnabled())
            bandAllSideEdges(this.ctx, pnl, this.edgeBandingMaterial());
        this.ctx.labels.add(this.unitId, this.unitGroupName(), label, x1 - x0, z1 - z0, this.frontT(), {
            banded: all(this.edgeBandingEnabled()), material: materialLabelName(this.frontColor()),
        });
    }
    // ---------------------------------------------------------------- fronts
    buildFrontZone(e, x0, x1, z0, z1, type, labelPrefix = "", forcedHinge = null) {
        if (type === null || type === undefined || type === "none")
            return;
        if (x1 <= x0 || z1 <= z0)
            return;
        const overlay = this.doorPosition() === "overlay";
        const edgeGap = overlay ? this.doorGapOverlay() : this.doorGapInset();
        const fy0 = overlay ? -this.frontT() : 0;
        const fy1 = overlay ? 0 : this.frontT();
        const isBottom = Math.abs(z0 - this.innerOpening().z0) < cm(0.5) || Math.abs(z0 - this.outerOpening().z0) < cm(0.5);
        // v110: the fronts stop at the valances (the bottom one used to sit behind the doors, the top one behind overlay doors)
        const [cz0, cz1] = this.frontZClamp(z0, z1);
        const valanceBelow = cz0 > z0 + 1e-6;
        z0 = cz0;
        z1 = cz1;
        if (z1 <= z0)
            return;
        const bottomExt = isBottom && !valanceBelow && HINGED_DOOR_TYPES.includes(type) ? this.doorBottomExtension() : 0;
        const zoneRecess = isBottom ? this.handleRecess() : 0;
        const zx0 = x0 + edgeGap;
        const zx1 = x1 - edgeGap;
        const zz0 = z0 + edgeGap - bottomExt;
        const zz1 = z1 - edgeGap;
        if (zx1 <= zx0 || zz1 <= zz0)
            return;
        const fc = this.frontColor();
        const eb = this.edgeBandingEnabled();
        const ebm = () => this.edgeBandingMaterial();
        const singleHinge = () => {
            let hinge = forcedHinge ?? toS(this.p["single_door_hinge"]);
            if (hinge !== "left" && hinge !== "right")
                hinge = "left";
            return hinge;
        };
        switch (type) {
            case "single": {
                const top = rmax(zz1 - zoneRecess, zz0);
                if (top > zz0) {
                    let f = createBox(this.ctx, e, `${labelPrefix}ضلفة`, zx0, fy0, zz0, zx1, fy1, top, fc);
                    const hinge = singleHinge();
                    const [hx, fx] = hinge === "left" ? [zx0, zx1] : [zx1, zx0];
                    const direction = hinge === "left" ? 1.0 : -1.0;
                    f = this.drillHingeCups(e, f, hx, direction, zz0, top, fy1);
                    assignLayer(this.ctx, f, TAGS.front);
                    tagDoorHinge(f, hx, fy0, fx, fy0, 0.0, -1.0);
                    if (eb)
                        bandAllSideEdges(this.ctx, f, ebm());
                    this.recordDoorLabel(`${labelPrefix}ضلفة`, zx0, zx1, zz0, top, hinge);
                }
                break;
            }
            case "double": {
                const top = rmax(zz1 - zoneRecess, zz0);
                if (top > zz0) {
                    const mid = (zx0 + zx1) / 2.0;
                    const half = edgeGap / 2.0;
                    let f1 = createBox(this.ctx, e, `${labelPrefix}ضلفة شمال`, zx0, fy0, zz0, mid - half, fy1, top, fc);
                    let f2 = createBox(this.ctx, e, `${labelPrefix}ضلفة يمين`, mid + half, fy0, zz0, zx1, fy1, top, fc);
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
                    if (eb)
                        bandAllSideEdges(this.ctx, f, ebm());
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
                    this.recordGlassDoorHinge(f, name, zx0, zx1, zz0, top, hinge);
                }
                break;
            }
            case "sliding": {
                const top = rmax(zz1 - zoneRecess, zz0);
                if (top > zz0)
                    this.buildSlidingPanels(e, zx0, zx1, zz0, top, labelPrefix);
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
                    this.recordGlassDoorHinge(f1, `${labelPrefix}${base} شمال`, zx0, mid - half, zz0, top, "left");
                    this.recordGlassDoorHinge(f2, `${labelPrefix}${base} يمين`, mid + half, zx1, zz0, top, "right");
                }
                break;
            }
        }
    }
    glassMaterial() {
        return this.once("glass_material", () => {
            const name = strip(toS(this.p["material_glass_name"]));
            const mat = getOrCreateNamedMaterial(this.ctx, name === "" ? "زجاج" : name, [200, 225, 230]);
            mat.alpha = 0.25;
            return mat;
        });
    }
    metalFrameMaterial() {
        return this.once("metal_frame_material", () => {
            const name = strip(toS(this.p["material_metal_frame_name"]));
            return getOrCreateNamedMaterial(this.ctx, name === "" ? "برواز ألومنيوم" : name, [145, 148, 150]);
        });
    }
    buildFramedGlassDoorSide(e, y0, y1, z0, z1, fx0, fx1, label, frameMatIn = null) {
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
            L.add(this.unitId, ug, `${label} - إطار تحت`, y1 - y0, railW, ft, { banded: { ...NO_BAND }, material: fmn });
            createBox(this.ctx, sub, `${label} - إطار فوق`, fx0, y0, z1 - railW, fx1, y1, z1, frameMat);
            L.add(this.unitId, ug, `${label} - إطار فوق`, y1 - y0, railW, ft, { banded: { ...NO_BAND }, material: fmn });
            createBox(this.ctx, sub, `${label} - إطار قريب`, fx0, y0, z0 + railW, fx1, y0 + railW, z1 - railW, frameMat);
            L.add(this.unitId, ug, `${label} - إطار قريب`, z1 - z0 - 2 * railW, railW, ft, { banded: { ...NO_BAND }, material: fmn });
            createBox(this.ctx, sub, `${label} - إطار بعيد`, fx0, y1 - railW, z0 + railW, fx1, y1, z1 - railW, frameMat);
            L.add(this.unitId, ug, `${label} - إطار بعيد`, z1 - z0 - 2 * railW, railW, ft, { banded: { ...NO_BAND }, material: fmn });
            const gt = rmax(rmin(cm(toF(this.p["glass_thickness"])), ft - cm(0.2)), cm(0.2));
            const mid = (fx0 + fx1) / 2.0;
            createBox(this.ctx, sub, `${label} - زجاج`, mid - gt / 2.0, y0 + railW, z0 + railW, mid + gt / 2.0, y1 - railW, z1 - railW, this.glassMaterial());
            L.add(this.unitId, ug, `${label} - زجاج`, y1 - y0 - 2 * railW, z1 - z0 - 2 * railW, gt, { banded: { ...NO_BAND }, material: materialLabelName(this.glassMaterial()) });
        }
        else {
            createBox(this.ctx, sub, label, fx0, y0, z0, fx1, y1, z1, frameMat);
            L.add(this.unitId, ug, label, y1 - y0, z1 - z0, Math.abs(fx1 - fx0), { banded: all(true), material: materialLabelName(frameMat) });
        }
        assignLayer(this.ctx, group, TAGS.front);
        return group;
    }
    buildFramedGlassDoor(e, x0, x1, z0, z1, fy0, fy1, label, frameMatIn = null, railWIn = null) {
        const frameMat = frameMatIn ?? this.frontColor();
        const group = e.addGroup();
        group.name = label;
        const sub = group.entities;
        const L = this.ctx.labels;
        const ug = this.unitGroupName();
        const railW = rmin(railWIn ?? cm(toF(this.p["glass_frame_width"])), (x1 - x0) / 2.5, (z1 - z0) / 2.5);
        if (railW > 0 && x1 - railW > x0 + railW && z1 - railW > z0 + railW) {
            const ft = Math.abs(fy1 - fy0);
            const fmn = materialLabelName(frameMat);
            createBox(this.ctx, sub, `${label} - إطار تحت`, x0, fy0, z0, x1, fy1, z0 + railW, frameMat);
            L.add(this.unitId, ug, `${label} - إطار تحت`, x1 - x0, railW, ft, { banded: { ...NO_BAND }, material: fmn });
            createBox(this.ctx, sub, `${label} - إطار فوق`, x0, fy0, z1 - railW, x1, fy1, z1, frameMat);
            L.add(this.unitId, ug, `${label} - إطار فوق`, x1 - x0, railW, ft, { banded: { ...NO_BAND }, material: fmn });
            createBox(this.ctx, sub, `${label} - إطار شمال`, x0, fy0, z0 + railW, x0 + railW, fy1, z1 - railW, frameMat);
            L.add(this.unitId, ug, `${label} - إطار شمال`, z1 - railW - (z0 + railW), railW, ft, { banded: { ...NO_BAND }, material: fmn });
            createBox(this.ctx, sub, `${label} - إطار يمين`, x1 - railW, fy0, z0 + railW, x1, fy1, z1 - railW, frameMat);
            L.add(this.unitId, ug, `${label} - إطار يمين`, z1 - railW - (z0 + railW), railW, ft, { banded: { ...NO_BAND }, material: fmn });
            const gt = rmax(rmin(cm(toF(this.p["glass_thickness"])), Math.abs(fy1 - fy0) - cm(0.2)), cm(0.2));
            const gm = (fy0 + fy1) / 2.0;
            createBox(this.ctx, sub, `${label} - زجاج`, x0 + railW, gm - gt / 2.0, z0 + railW, x1 - railW, gm + gt / 2.0, z1 - railW, this.glassMaterial());
            L.add(this.unitId, ug, `${label} - زجاج`, x1 - railW - (x0 + railW), z1 - railW - (z0 + railW), gt, {
                banded: { ...NO_BAND }, material: materialLabelName(this.glassMaterial()),
            });
        }
        else {
            createBox(this.ctx, sub, label, x0, fy0, z0, x1, fy1, z1, frameMat);
            L.add(this.unitId, ug, label, x1 - x0, z1 - z0, Math.abs(fy1 - fy0), { banded: all(true), material: materialLabelName(frameMat) });
        }
        assignLayer(this.ctx, group, TAGS.front);
        return group;
    }
    drillHingeCups(e, door, hingeX, direction, z0, z1, entryY) {
        if (!truthy(this.p["include_hinge_cups"]))
            return door;
        try {
            const d = pcm(this.p["hinge_cup_diameter"]);
            const edge = pcm(this.p["hinge_cup_edge_distance"]);
            const count = hingeCountIn(this.p, z1 - z0);
            door.setAttribute("KUD", "hinge_count", count);
            if (z1 - z0 <= 2 * edge)
                return door;
            const cupX = hingeX + direction * edge;
            const positions = this.hingeCupPositions(z0, z1, edge, count);
            const actual = [];
            for (const cz of positions) {
                if (cz <= z0 || cz >= z1)
                    continue;
                createHoleMarkerY(this.ctx, e, "كبة مفصلة", cupX, entryY, cz, d / 2.0, this.frontT(), COLORS.assembly);
                actual.push(cz);
            }
            this.tagHingeCupPositions(door, z0, z1, actual, direction);
            return door;
        }
        catch (err) {
            this.ctx.puts(`[KitchenUnitDesigner] Hinge cup warning: ${err.message}`);
            return door;
        }
    }
    tagHingeCupPositions(door, z0, z1, positionsZ, direction) {
        if (!positionsZ.length)
            return;
        const h = z1 - z0;
        if (h <= 0)
            return;
        const ratios = positionsZ.map((cz) => rround((cz - z0) / h, 4));
        door.setAttribute("KUD", "hinge_cup_ratios", ratios.map(fs).join(","));
        door.setAttribute("KUD", "hinge_side", direction > 0 ? "left" : "right");
    }
    hingeCupPositions(z0, z1, edge, count) {
        return hingeCupPositionsAlong(z0, z1, edge, count);
    }
    /** v110: a glass door is labelled as its frame rails + the glass (buildFramedGlassDoor) — no extra whole-door label.
     *  The hinge data goes on the hinge-side rail (stood up: its length along h, like a door's height). */
    recordGlassDoorHinge(door, name, x0, x1, z0, z1, hingeSide) {
        const len = hingeSide === "top" ? x1 - x0 : z1 - z0;
        door.setAttribute("KUD", "hinge_count", hingeCountIn(this.p, len));
        const L = this.ctx.labels;
        const railName = `${name} - إطار ${hingeSide === "right" ? "يمين" : hingeSide === "top" ? "فوق" : "شمال"}`;
        const rail = L.last(this.unitId, railName);
        const lab = rail ?? L.last(this.unitId, name);
        if (!lab)
            return;
        if (rail && hingeSide !== "top") {
            // both upright stiles are labelled the same way round (length on h), so their grain locks the same way in the cut plan
            for (const sn of ["شمال", "يمين"]) {
                const st = L.last(this.unitId, `${name} - إطار ${sn}`);
                if (st && st.w > st.h)
                    [st.w, st.h] = [st.h, st.w];
            }
        }
        const span = hingeSide === "top" ? lab.w : lab.h;
        lab.hinge_ratios = hingeRatiosFor(this.p, cm(span));
        lab.hinge_side = hingeSide;
    }
    // ---------------------------------------------------------------- drawers
    drawerHeightsFor(count, total) {
        const explicit = [];
        for (let i = 1; i <= count; i++) {
            const v = i <= MAX_CUSTOM_DRAWERS ? toF(this.p[`drawer${i}_height`]) : 0;
            explicit.push(v > 0 ? cm(v) : null);
        }
        let explicitSum = rsumF(explicit.filter((v) => v !== null));
        const autoCount = explicit.filter((v) => v === null).length;
        // v110: typed heights (+ the gaps, + 12 cm for every drawer left on «auto») bigger than the opening are scaled down to fit, with a warning
        const room = total - this.drawerGap() * (count - 1) - autoCount * cm(12.0);
        if (explicitSum > 0 && explicitSum > room + cm(0.05) && room > 0) {
            const f = room / explicitSum;
            for (let i = 0; i < explicit.length; i++)
                if (explicit[i] !== null)
                    explicit[i] *= f;
            explicitSum = room;
            this.ctx.puts(`[KitchenUnitDesigner] ⚠ ارتفاعات الأدراج أكبر من الفتحة — اتظبطت على قد الفتحة (${explicit.map((v) => (v === null ? "تلقائي" : rround(v / cm(1.0), 1))).join(" + ")} سم).`);
        }
        const available = total - this.drawerGap() * (count - 1) - explicitSum;
        const autoH = autoCount > 0 ? available / autoCount : 0;
        return explicit.map((v) => v ?? autoH);
    }
    buildDrawersZone(e, x0, x1, z0, z1, fy0, fy1, labelPrefix) {
        const count = this.drawerCount();
        const total = z1 - z0;
        const heights = this.drawerHeightsFor(count, total);
        if (heights.some((h) => h <= 0))
            return;
        let z = z0;
        heights.forEach((h, i) => {
            const dz0 = z;
            const full = z + h;
            const isTop = i === heights.length - 1;
            const fdz1 = isTop || this.golaMode() ? rmax(full - this.handleRecess(), dz0) : full;
            this.buildSingleDrawer(e, x0, x1, fy0, fy1, dz0, fdz1, full, i, heights.length, `${labelPrefix}درج ${i + 1}`);
            z = full + this.drawerGap();
        });
    }
    /** which drawers get a glass front (NOVERA v53): "" none · "all" · "1,3" (1 = the bottom drawer) */
    drawerGlassAt(index) {
        const v = strip(toS(this.p["drawer_glass"])).toLowerCase();
        if (v === "" || v === "none" || v === "false")
            return false;
        if (v === "all" || v === "true")
            return true;
        return v.split(/[,\s،]+/).map((x) => parseInt(x, 10)).includes(index + 1);
    }
    buildSingleDrawer(e, x0, x1, fy0, fy1, dz0, frontDz1, boxDz1, index, _total, label) {
        if (frontDz1 <= dz0)
            return;
        const group = e.addGroup();
        group.name = label;
        const sub = group.entities;
        const glass = this.drawerGlassAt(index);
        if (glass) {
            // a wood frame with a glass panel; the frame is the box's front wall (no wood wall behind the glass)
            // drawer frames are 4 cm (narrower on a low front) — the door setting's 6 cm would leave almost no glass
            this.buildFramedGlassDoor(sub, x0, x1, dz0, frontDz1, fy0, fy1, label, this.frontColor(), rmin(cm(4.0), (frontDz1 - dz0) / 3.0));
        }
        else {
            const f = createBox(this.ctx, sub, label, x0, fy0, dz0, x1, fy1, frontDz1, this.frontColor());
            assignLayer(this.ctx, f, TAGS.front);
            if (this.edgeBandingEnabled())
                bandAllSideEdges(this.ctx, f, this.edgeBandingMaterial());
        }
        if (!glass)
            this.recordDoorLabel(label, x0, x1, dz0, frontDz1, null); // the glass front's frame rails and glass were labelled by buildFramedGlassDoor
        // an inner (hidden) drawer behind a tall front: the main box takes the lower half, the inner box with its own small front sits above it
        const inner = this.drawerBoxesEnabled() && this.drawerInnerAt(index) && frontDz1 - dz0 >= cm(24.0);
        // v107: with the built-in profile the box follows its own front (its top stays under the C / L profile)
        const gola = this.golaMode() && boxDz1 > frontDz1 + cm(0.01);
        const mainDz1 = inner ? dz0 + (frontDz1 - dz0) * 0.5 - cm(0.5) : gola ? frontDz1 : boxDz1;
        const drop = inner ? cm(1.0) : gola ? (this.drawerTurbo() ? cm(1.5) : rmax(this.drawerBoxWallDrop() - (boxDz1 - frontDz1), cm(1.0))) : null;
        const [floorTop, floorBottom] = this.drawerBoxesEnabled() && mainDz1 > dz0 ? this.buildDrawerBox(sub, x0, x1, fy1, dz0, mainDz1, label, null, glass, drop) : [dz0, dz0];
        this.buildDrawerInsertFor(sub, index, x0, x1, fy1, dz0, floorTop);
        if (inner) {
            const t = this.drawerBoxT(), ig = e.addGroup();
            ig.name = `${label} - درج داخلي`;
            const ie = ig.entities;
            const iz0 = mainDz1 + cm(1.0), iz1 = frontDz1 - cm(1.5), ify0 = fy1 + cm(1.0), ify1 = ify0 + t;
            const io = this.innerOpening(), ix0 = rmax(x0, io.x0) + this.drawerBoxSideClearance(), ix1 = rmin(x1, io.x1) - this.drawerBoxSideClearance();
            if (iz1 - iz0 >= cm(6.0) && ix1 > ix0) {
                const f = createBox(this.ctx, ie, `${label} - وش داخلي`, ix0, ify0, iz0, ix1, ify1, iz1, this.carcassMaterial());
                assignLayer(this.ctx, f, TAGS.front);
                if (this.edgeBandingEnabled())
                    bandAllSideEdges(this.ctx, f, this.edgeBandingMaterial());
                this.ctx.labels.add(this.unitId, this.unitGroupName(), `${label} - وش داخلي`, ix1 - ix0, iz1 - iz0, t, {
                    banded: { top: true, bottom: true, left: true, right: true }, material: this.carcassMaterialName(),
                    note: "درج داخلي مخفي ورا الوش الكبير — بيتسحب لوحده على مجاريه بعد ما الدرج الكبير يتفتح؛ قصّة إيد في الحرف العلوي",
                });
                this.buildDrawerBox(ie, ix0, ix1, ify1, iz0, iz1, `${label} - داخلي`, rmax(this.drawerBoxDepthCm() - cm(3.0), cm(20.0)), false, cm(1.0));
                this.ctx.labels.addAssemblyMark(this.unitId, this.unitGroupName(), "drawer", `${label} - داخلي`, iz0 - this.drawerSlideClearance() - this.z0Carcass());
                tagDrawerSlide(ig, this.drawerSlideBase() + index * this.drawerSlideStep() + cm(8.0));
            }
        }
        this.ctx.labels.addAssemblyMark(this.unitId, this.unitGroupName(), "drawer", label, floorBottom - this.drawerSlideClearance() - this.z0Carcass());
        const openDistance = this.drawerSlideBase() + index * this.drawerSlideStep();
        tagDrawerSlide(group, openDistance);
    }
    buildDrawerInsertFor(e, index, x0, x1, fy1, _dz0, boxFloorZ) {
        const type = toS(this.p[`drawer_insert_${index + 1}`]);
        if (type === "" || type === "none")
            return;
        const boxes = this.drawerBoxesEnabled();
        const io = this.innerOpening(), ox0 = rmax(x0, io.x0), ox1 = rmin(x1, io.x1);
        const ix0 = boxes ? ox0 + this.drawerBoxSideClearance() + this.drawerBoxT() : ox0 + cm(1.0);
        const ix1 = boxes ? ox1 - this.drawerBoxSideClearance() - this.drawerBoxT() : ox1 - cm(1.0);
        if (ix1 <= ix0)
            return;
        const iy0 = fy1 + (boxes ? this.drawerBoxT() : 0);
        const iy1 = boxes ? iy0 + rmax(this.drawerBoxDepthCm() - this.drawerBoxT() * 2, cm(10.0)) : iy0 + cm(30.0);
        const iz0 = boxFloorZ;
        if (type === "dividers")
            this.buildInsertDividers(e, ix0, ix1, iy0, iy1, iz0);
        else if (type === "cutlery")
            this.buildInsertCutlery(e, ix0, ix1, iy0, iy1, iz0);
        else if (type === "custom") {
            const v = this.parsePositionList(this.p[`drawer_insert_v_${index + 1}`]);
            const h = this.parsePositionList(this.p[`drawer_insert_h_${index + 1}`]);
            this.buildInsertCustom(e, ix0, ix1, iy0, iy1, iz0, v, h);
        }
    }
    parsePositionList(raw) {
        return toS(raw)
            .split(",")
            .map((s) => strip(s))
            .filter((s) => s !== "")
            .map((s) => strictFloat(s))
            .filter((v) => v !== null);
    }
    drawerInsertHeight() {
        return cm(rmax(toF(this.p["drawer_insert_height"]), 1.0));
    }
    drawerInsertThickness() {
        return cm(rmax(toF(this.p["drawer_insert_thickness"]), 0.3));
    }
    drawerInsertDividerCount() {
        return Math.min(Math.max(toI(this.p["drawer_insert_divider_count"]), 1), 10);
    }
    buildInsertDividers(e, x0, x1, y0, y1, z0) {
        const count = this.drawerInsertDividerCount();
        const t = this.drawerInsertThickness();
        const h = this.drawerInsertHeight();
        const w = x1 - x0;
        if (w <= 0)
            return;
        const step = w / (count + 1);
        for (let i = 0; i < count; i++) {
            const x = x0 + step * (i + 1);
            const name = `فاصل تقسيمة ${i + 1}`;
            createBox(this.ctx, e, name, x - t / 2.0, y0, z0, x + t / 2.0, y1, z0 + h, this.carcassMaterial());
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, y1 - y0, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
        }
    }
    buildInsertCustom(e, x0, x1, y0, y1, z0, vs, hs) {
        const t = this.drawerInsertThickness();
        const h = this.drawerInsertHeight();
        if (x1 - x0 <= 0 || y1 - y0 <= 0)
            return;
        // v189: when dividers cross, both run the full length and are half-lapped into each other
        const lap = vs.length && hs.length ? { note: "تعشيقة نص بنص: شق بعرض السمك ونص الارتفاع عند كل تقاطع" } : {};
        vs.forEach((pos, i) => {
            const x = x0 + cm(pos);
            if (!(x > x0 && x < x1))
                return;
            const name = `فاصل مخصص رأسي ${i + 1}`;
            createBox(this.ctx, e, name, x - t / 2.0, y0, z0, x + t / 2.0, y1, z0 + h, this.carcassMaterial());
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, y1 - y0, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName(), ...lap });
        });
        hs.forEach((pos, i) => {
            const y = y0 + cm(pos);
            if (!(y > y0 && y < y1))
                return;
            const name = `فاصل مخصص أفقي ${i + 1}`;
            createBox(this.ctx, e, name, x0, y - t / 2.0, z0, x1, y + t / 2.0, z0 + h, this.carcassMaterial());
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, x1 - x0, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName(), ...lap });
        });
    }
    buildInsertCutlery(e, x0, x1, y0, y1, z0) {
        const t = this.drawerInsertThickness();
        const h = this.drawerInsertHeight();
        const w = x1 - x0;
        if (w <= 0)
            return;
        const mid = x0 + w * 0.5;
        createBox(this.ctx, e, "فاصل أدوات - رأسي", mid - t / 2.0, y0, z0, mid + t / 2.0, y1, z0 + h, this.carcassMaterial());
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "فاصل أدوات - رأسي", y1 - y0, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
        const my = y0 + (y1 - y0) / 2.0;
        createBox(this.ctx, e, "فاصل أدوات - أفقي", mid, my - t / 2.0, z0, x1, my + t / 2.0, z0 + h, this.carcassMaterial());
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "فاصل أدوات - أفقي", x1 - mid, h, t, { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
    }
    drawerSlideBase() {
        return pcm(this.p["drawer_slide_base"]);
    }
    drawerSlideStep() {
        return pcm(this.p["drawer_slide_step"]);
    }
    drawerSlideClearance() {
        return cm(rmax(toF(this.p["drawer_slide_clearance"]), 0));
    }
    drawerBoxesEnabled() {
        return truthy(this.p["include_drawer_boxes"]);
    }
    drawerBoxSideClearance() {
        return pcm(this.p["drawer_box_side_clearance"]);
    }
    drawerBoxDepthCm() {
        return pcm(this.p["drawer_box_depth"]);
    }
    drawerBoxBottomOffset() {
        return pcm(this.p["drawer_box_bottom_offset"]);
    }
    drawerBoxT() {
        return pcm(this.p["drawer_box_panel_thickness"]);
    }
    drawerBoxWallDrop() {
        return pcm(this.p["drawer_box_wall_drop"]);
    }
    drawerBoxBaseSetback() {
        return pcm(this.p["drawer_box_base_setback"]);
    }
    drawerBoxBaseT() {
        return pcm(this.p["drawer_box_base_thickness"]);
    }
    drawerBoxBaseGroove() {
        return pcm(this.p["drawer_box_base_groove"]);
    }
    /** NOVERA v56: «درج تيربو» in wood — the box walls rise almost to the front's top (like a metal turbo box), on side runners */
    drawerTurbo() {
        return truthy(this.p["drawer_turbo"]);
    }
    drawerInnerAt(index) {
        return truthy(this.p[`drawer_inner_${index + 1}`]);
    }
    buildDrawerBox(e, fx0, fx1, fby, dz0, dz1, label, depthOverride = null, glassFront = false, wallDropOverride = null) {
        // v107: the runner clearance is measured from the carcass side, not from the overlay front's edge (the box sat inside the side)
        const io = this.innerOpening();
        const bx0 = rmax(fx0, io.x0) + this.drawerBoxSideClearance();
        const bx1 = rmin(fx1, io.x1) - this.drawerBoxSideClearance();
        if (bx1 <= bx0)
            return [dz0, dz0];
        const by0 = fby;
        const maxDepth = rmax(this.depth() - this.backT() - this.backRearOffset() - by0, 0);
        const by1 = by0 + rmin(depthOverride ?? this.drawerBoxDepthCm(), maxDepth);
        if (by1 <= by0)
            return [dz0, dz0];
        const t = rmin(this.drawerBoxT(), (bx1 - bx0) / 2.5);
        if (t <= 0)
            return [dz0, dz0];
        const fh = dz1 - dz0;
        const wallH = rmin(rmax(fh - (wallDropOverride ?? (this.drawerTurbo() ? cm(1.5) : this.drawerBoxWallDrop())), cm(1)), fh);
        let sz0 = rmin(dz0 + this.drawerBoxBottomOffset(), dz0 + wallH - cm(1));
        const sz1 = dz0 + wallH;
        // v110: an overlay bottom front starts below the carcass bottom's top — the box itself must stand clear ABOVE the bottom board
        // (it sat 1.5 cm inside it). The plinth drawer's box (wholly under the carcass) is left alone.
        if (sz1 > io.z0 + cm(1.0) && sz0 < io.z0 + cm(0.5))
            sz0 = io.z0 + cm(0.5);
        if (sz1 <= sz0)
            return [dz0, dz0];
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
        if (eb)
            bandEdge(this.ctx, sl, up, this.edgeBandingMaterial());
        const sideSpan = rmax(sz1 - sz0, 0.001);
        const sgr = bz1 > bz0 ? rmin(((bz0 + bz1) / 2.0 - sz0) / sideSpan, 1.0) : null;
        L.add(this.unitId, ug, `${label} - جنب شمال`, by1 - by0, sz1 - sz0, t, {
            banded: { top: true, bottom: false, left: false, right: false }, groove: sgr !== null, groove_axis: "vertical", groove_ratio: sgr, material: this.carcassMaterialName(),
        });
        const sr = createBox(this.ctx, e, `${label} - جنب يمين`, bx1 - t, by0, sz0, bx1, by1, sz1, this.carcassMaterial());
        assignLayer(this.ctx, sr, TAGS.front);
        if (eb)
            bandEdge(this.ctx, sr, up, this.edgeBandingMaterial());
        L.add(this.unitId, ug, `${label} - جنب يمين`, by1 - by0, sz1 - sz0, t, {
            banded: { top: true, bottom: false, left: false, right: false }, groove: sgr !== null, groove_axis: "vertical", groove_ratio: sgr, material: this.carcassMaterialName(),
        });
        if (bz1 <= sz1) {
            const groove = rmin(rmax(this.drawerBoxBaseGroove(), 0), t - cm(0.1));
            const bsx0 = bx0 + t - groove;
            const bsx1 = bx1 - t + groove;
            if (bsx1 > bsx0) {
                const base = createBox(this.ctx, e, `${label} - قاعدة`, bsx0, by0, bz0, bsx1, by1, bz1, this.backMaterial());
                assignLayer(this.ctx, base, TAGS.front);
                L.add(this.unitId, ug, `${label} - قاعدة`, bsx1 - bsx0, by1 - by0, baseT, { banded: { ...NO_BAND }, material: materialLabelName(this.backMaterial()) });
            }
        }
        const fbz0 = rmin(bz1, sz1);
        const fbz1 = sz1;
        if (!(fbz1 > fbz0))
            return [bz1, bz0];
        if (!glassFront) {
            const fw = createBox(this.ctx, e, `${label} - جدار أمامي`, bx0 + t, by0, fbz0, bx1 - t, by0 + t, fbz1, this.carcassMaterial());
            assignLayer(this.ctx, fw, TAGS.front);
            if (eb)
                bandEdge(this.ctx, fw, up, this.edgeBandingMaterial());
            L.add(this.unitId, ug, `${label} - جدار أمامي`, bx1 - t - (bx0 + t), fbz1 - fbz0, t, {
                banded: { top: true, bottom: false, left: false, right: false }, material: this.carcassMaterialName(),
            });
        }
        const bw = createBox(this.ctx, e, `${label} - ظهر`, bx0 + t, by1 - t, fbz0, bx1 - t, by1, fbz1, this.carcassMaterial());
        assignLayer(this.ctx, bw, TAGS.front);
        if (eb)
            bandEdge(this.ctx, bw, up, this.edgeBandingMaterial());
        L.add(this.unitId, ug, `${label} - ظهر`, bx1 - t - (bx0 + t), fbz1 - fbz0, t, {
            banded: { top: true, bottom: false, left: false, right: false }, material: this.carcassMaterialName(),
        });
        if (this.assemblyHoles()) {
            const zc = (bz0 + bz1) / 2.0;
            this.markDrawerBoxJoint(e, "left", bx0, bx1, by0, by1, fbz0, fbz1, zc, t, `${label} - شمال`, glassFront);
            this.markDrawerBoxJoint(e, "right", bx0, bx1, by0, by1, fbz0, fbz1, zc, t, `${label} - يمين`, glassFront);
        }
        return [bz1, bz0];
    }
    /** v110: the box joints the way they are drilled — the front and back walls sit between the box sides, so each joint is a
     *  column of holes up the side (drilled through the side's face, on the wall's centre line) and the cam lock in the wall's
     *  inner face, `assembly_base_depth` in from its end. 3 holes per joint (2 on a low box), the cam on the middle one. */
    markDrawerBoxJoint(e, side, bx0, bx1, by0, by1, z0, z1, _camZc, wallT, label, glassFront = false) {
        const inward = side === "left" ? 1.0 : -1.0;
        const edgeX = side === "left" ? bx0 + wallT : bx1 - wallT; // the side's inner face
        const h = z1 - z0;
        if (h <= cm(1.0) || by1 - by0 <= 2 * wallT)
            return;
        const ed = rmin(this.assemblyEdgeDist(), h / 4.0);
        const zs = h >= cm(8.0) ? [z0 + ed, (z0 + z1) / 2.0, z1 - ed] : [z0 + ed, z1 - ed];
        const camIdx = zs.length === 3 ? 1 : 0;
        const sideDepth = rmin(this.assemblySideDepth(), wallT);
        const camDepth = rmin(this.assemblyCamDepth(), wallT - cm(0.1));
        const camR = rmin(this.assemblyCamD() / 2.0, (h - cm(0.2)) / 2.0);
        const sets = [["قدام", by0 + wallT / 2.0, by0 + wallT, 1.0], ["ورا", by1 - wallT / 2.0, by1 - wallT, -1.0]];
        for (const [setLabel, wy, faceY, into] of sets) {
            if (setLabel === "قدام" && glassFront)
                continue; // a glass front has no wooden front wall (its frame is the box front)
            zs.forEach((z, i) => {
                const scx = edgeX - inward * (sideDepth / 2.0);
                const m1 = createHoleMarker(this.ctx, e, `ثقب أليتا - ${label} - ${setLabel} - جنب - ${i + 1}`, scx, wy, z, this.assemblyHoleD() / 2.0, sideDepth, COLORS.assembly);
                assignLayer(this.ctx, m1, TAGS.assembly);
                if (i !== camIdx || camDepth <= 0 || camR <= 0)
                    return;
                const camX = edgeX + inward * this.assemblyBaseDepth();
                // drilled into the wall from its inner face (towards the front for the front wall, towards the back for the back wall)
                const m3 = createHoleMarkerY(this.ctx, e, `ثقب قفل كام - ${label} - ${setLabel}`, camX, faceY - into * (camDepth / 2.0), z, camR, camDepth, COLORS.assembly);
                assignLayer(this.ctx, m3, TAGS.assembly);
            });
        }
    }
    // ---------------------------------------------------------------- stacks, fixed panels, cavities
    bottomStackBounds(zone, legacyParam) {
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
    buildBottomStack(e, zone, b, belowType, labelPrefix) {
        if (b.bottom_z1 > zone.z0)
            this.buildFrontZone(e, zone.x0, zone.x1, zone.z0, b.bottom_z1, belowType, labelPrefix);
        if (!(b.vent_z1 !== null && b.vent_z1 > b.vent_z0))
            return;
        this.buildFixedPanel(e, zone.x0, zone.x1, b.vent_z0, b.vent_z1, `${labelPrefix}تهوية`);
    }
    buildFixedPanel(e, x0, x1, z0, z1, name, material = null) {
        if (x1 <= x0 || z1 <= z0)
            return;
        const pm = material ?? this.frontColor();
        const overlay = this.doorPosition() === "overlay";
        const fy0 = overlay ? -this.frontT() : 0;
        const fy1 = overlay ? 0 : this.frontT();
        const pnl = createBox(this.ctx, e, name, x0, fy0, z0, x1, fy1, z1, pm);
        assignLayer(this.ctx, pnl, TAGS.front);
        if (this.edgeBandingEnabled())
            bandAllSideEdges(this.ctx, pnl, this.edgeBandingMaterial());
        this.ctx.labels.add(this.unitId, this.unitGroupName(), name, x1 - x0, z1 - z0, this.frontT(), {
            banded: all(this.edgeBandingEnabled()), material: materialLabelName(pm),
        });
    }
    /** the front zone between the valances: above the bottom «وزرة ليد» and below the top «أورزة» (both stand in the door plane) */
    frontZClamp(z0, z1) {
        let a = z0, b = z1;
        if (this.bottomValance() && this.bottomValanceH() > 0)
            a = rmax(a, this.z0Carcass() + this.panelT() + this.bottomValanceH());
        if (this.topValance() && this.valanceH() > 0)
            b = rmin(b, this.height() - this.panelT() - this.valanceH());
        return [a, b];
    }
    buildTopValancePanel(e, x0, x1) {
        if (!this.topValance())
            return;
        const z1 = this.height() - this.panelT();
        const z0 = z1 - this.valanceH();
        this.buildFixedPanel(e, x0 + this.doorGapInset(), x1 - this.doorGapInset(), z0, z1, "أورزة علوية");
    }
    buildBottomValancePanel(e, x0, x1) {
        if (!this.bottomValance())
            return;
        const z0 = this.z0Carcass() + this.panelT();
        const z1 = z0 + this.bottomValanceH();
        this.buildFixedPanel(e, x0 + this.doorGapInset(), x1 - this.doorGapInset(), z0, z1, "وزرة ليد سفلية");
    }
    buildCavityWithFillers(e, zone, z0, z1, cavityWidthCm, align, label) {
        if (z1 <= z0)
            return { x0: zone.x0, x1: zone.x1, z0, z1 };
        const available = zone.x1 - zone.x0;
        const w = rmin(pcm(cavityWidthCm), available);
        let cx0;
        let cx1;
        const a = toS(align);
        if (a === "left") {
            cx0 = zone.x0;
            cx1 = cx0 + w;
        }
        else if (a === "right") {
            cx1 = zone.x1;
            cx0 = cx1 - w;
        }
        else {
            cx0 = zone.x0 + (available - w) / 2.0;
            cx1 = cx0 + w;
        }
        // v186: a filler thinner than half a millimetre (rounding when the cavity spans the whole
        // opening) produced "Duplicate points in array" — snap it away
        const tol = cm(0.05);
        if (cx0 - zone.x0 < tol)
            cx0 = zone.x0;
        if (zone.x1 - cx1 < tol)
            cx1 = zone.x1;
        if (cx0 > zone.x0)
            this.buildFixedPanel(e, zone.x0, cx0, z0, z1, `${label} فيلر شمال`);
        if (cx0 > zone.x0)
            this.ctx.labels.addDividerMark(this.unitId, this.unitGroupName(), `${label} فيلر شمال`, (zone.x0 + cx0) / 2.0 - this.innerOpening().x0, "filler");
        if (zone.x1 > cx1)
            this.buildFixedPanel(e, cx1, zone.x1, z0, z1, `${label} فيلر يمين`);
        if (zone.x1 > cx1)
            this.ctx.labels.addDividerMark(this.unitId, this.unitGroupName(), `${label} فيلر يمين`, (cx1 + zone.x1) / 2.0 - this.innerOpening().x0, "filler");
        return { x0: cx0, x1: cx1, z0, z1 };
    }
}
