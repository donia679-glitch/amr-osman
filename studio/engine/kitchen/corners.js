// Port of the non-rectangular builders in lib/builders_categories.rb (Diagonal / Open / L-shape
// corners, accessories) and lib/corner_glass_display_unit_builder.rb.
import { COLORS, FRONT_THICKNESS_CM } from "./config.js";
import { addColoredMarkerFace, adjustForFinish, assignLayer, bandAllSideEdges, bandEdge, bandEdges, createAngledPanel, createBox, createFlatSlab, getOrCreateNamedMaterial, hexToRgb, tagDoorHinge, NO_BAND, } from "./helpers.js";
import { argError, materialLabelName, TAGS } from "./carcass.js";
import { clamp, strip, toF, toI, toS, truthy } from "./rb.js";
import { cm, degrees, Point3d, rmax, rmin, Transformation, Vector3d } from "./su/geom.js";
import { Entities, Group, Material } from "./su/model.js";
const pcm = (v) => cm(toF(v));
const ALL = { top: true, bottom: true, left: true, right: true };
/** the helper methods every stand-alone builder in the plugin repeats */
class PlainBuilder {
    ctx;
    params;
    unitId = null;
    memo = new Map();
    constructor(ctx, params) {
        this.ctx = ctx;
        this.params = params;
        this.validate();
    }
    get p() {
        return this.params;
    }
    once(k, f) {
        if (!this.memo.has(k))
            this.memo.set(k, f());
        return this.memo.get(k);
    }
    newUnit(parent) {
        const g = parent.addGroup();
        g.name = this.unitGroupName();
        g.setAttribute("KUD", "is_kitchen_unit", true);
        this.unitId = g.entityID;
        return g;
    }
    finish(g, xOffsetCm) {
        const x = cm(xOffsetCm);
        if (x !== 0)
            g.transformBang(Transformation.translation([x, 0, 0]));
        return g;
    }
    label(name, w, h, d, o = {}) {
        this.ctx.labels.add(this.unitId, this.unitGroupName(), name, w, h, d, o);
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
    glassMaterial() {
        return this.once("glass_material", () => {
            const name = strip(toS(this.p["material_glass_name"]));
            return getOrCreateNamedMaterial(this.ctx, name === "" ? "زجاج" : name, [200, 225, 230]);
        });
    }
    edgeBandingEnabled() {
        return truthy(this.p["include_edge_banding"]);
    }
    doorBottomExtension() {
        return pcm(toF(this.p["door_bottom_extension"]));
    }
    edgeBandingMaterial() {
        return this.once("edge_banding_material", () => {
            let name = strip(toS(this.p["edge_banding_material_name"]));
            if (name === "")
                name = "شريط حواف";
            return getOrCreateNamedMaterial(this.ctx, name, COLORS.assembly);
        });
    }
    /** the plinth (سكلو) under a corner unit: one apron behind each open front edge, set back like the straight
     *  units' kick. edges: [[start, end, inward normal, entities?]] on the floor */
    buildCornerKick(e, edges) {
        const p = this.p;
        if (!truthy(p["include_toe_kick"]) || toS(p["unit_type"]) === "wall")
            return;
        const kh = pcm(p["toe_kick_height"]);
        if (kh <= 0)
            return;
        const sb = pcm(p["toe_kick_setback"]);
        const t = pcm(p["panel_thickness"]);
        const mat = this.carcassMaterial(), cname = materialLabelName(mat);
        edges.forEach(([A, B, inward, ents], i) => {
            const n = inward.clone().normalizeBang();
            const a = A.offset(n, sb), b = B.offset(n, sb);
            const L = a.distance(b);
            if (L < cm(1))
                return;
            const name = edges.length > 1 ? `وزرة سكلو ${i + 1}` : "وزرة سكلو";
            const k = createAngledPanel(this.ctx, ents || e, name, a, b, n, t, 0, kh, mat);
            assignLayer(this.ctx, k, TAGS.kick);
            this.label(name, L, kh, t, { banded: { ...NO_BAND, top: true }, material: cname });
        });
    }
    positive(keys) {
        for (const k of keys)
            if (toF(this.p[k]) <= 0)
                throw argError(`الحقل '${k}' يجب أن يكون أكبر من صفر.`);
    }
}
// ---------------------------------------------------------------------------- diagonal
export class DiagonalCornerUnitBuilder extends PlainBuilder {
    unitGroupName() {
        const l = strip(toS(this.p["unit_label"]));
        return l === "" ? "Kitchen Unit - Corner" : `Kitchen Unit - ${l}`;
    }
    validate() {
        this.positive(["corner_leg1", "corner_leg2", "corner_diagonal_cut", "height", "panel_thickness"]);
        if (toF(this.p["corner_diagonal_cut"]) >= rmin(toF(this.p["corner_leg1"]), toF(this.p["corner_leg2"]))) {
            throw argError("طول القطع القطري كبير جداً مقارنة بأضلاع الزاوية.");
        }
    }
    build(parent, xOffsetCm = 0) {
        const group = this.newUnit(parent);
        const e = group.entities;
        const p = this.p;
        const leg1 = pcm(p["corner_leg1"]);
        const leg2 = pcm(p["corner_leg2"]);
        const cut = pcm(p["corner_diagonal_cut"]);
        const t = pcm(p["panel_thickness"]);
        const h = pcm(p["height"]);
        const z0 = truthy(p["include_toe_kick"]) ? pcm(p["toe_kick_height"]) : 0;
        const cmat = this.carcassMaterial();
        const cname = materialLabelName(cmat);
        const nb = () => ({ ...NO_BAND });
        const p1 = new Point3d(0, 0, 0);
        const p2 = new Point3d(leg1, 0, 0);
        const p3 = new Point3d(leg1, leg2 - cut, 0);
        const p4 = new Point3d(leg1 - cut, leg2, 0);
        const p5 = new Point3d(0, leg2, 0);
        const inner = [new Point3d(t, t, 0), new Point3d(leg1 - t, t, 0), new Point3d(leg1 - t, leg2 - cut, 0), new Point3d(leg1 - cut, leg2 - t, 0), new Point3d(t, leg2 - t, 0)];
        createAngledPanel(this.ctx, e, "جنب حيطة أ", p1, p2, new Vector3d(0, 1, 0), t, z0, h, cmat);
        this.label("جنب حيطة أ", leg1, h - z0, t, { banded: nb(), material: cname });
        // v189: side B butts against side A at the wall corner (it used to run through it — 1.8 cm too long)
        createAngledPanel(this.ctx, e, "جنب حيطة ب", new Point3d(0, t, 0), p5, new Vector3d(1, 0, 0), t, z0, h, cmat);
        this.label("جنب حيطة ب", leg2 - t, h - z0, t, { banded: nb(), material: cname });
        const e1a = new Point3d(leg1, t, 0);
        const e1b = new Point3d(leg1, leg2 - cut, 0);
        if (e1b.distance(e1a) > 0) {
            createAngledPanel(this.ctx, e, "جنب نهاية الرجل الأولى", e1a, e1b, new Vector3d(-1, 0, 0), t, z0, h, cmat);
            this.label("جنب نهاية الرجل الأولى", e1b.distance(e1a), h - z0, t, { banded: nb(), material: cname });
        }
        const e2a = new Point3d(leg1 - cut, leg2, 0);
        const e2b = new Point3d(t, leg2, 0);
        if (e2b.distance(e2a) > 0) {
            createAngledPanel(this.ctx, e, "جنب نهاية الرجل الثانية", e2a, e2b, new Vector3d(0, -1, 0), t, z0, h, cmat);
            this.label("جنب نهاية الرجل الثانية", e2b.distance(e2a), h - z0, t, { banded: nb(), material: cname });
        }
        const eb = this.edgeBandingEnabled();
        // v189: the inner pentagon runs from t to leg − t, so the board is leg − 2t (was labelled leg − t)
        const base = createFlatSlab(this.ctx, e, "قاعدة", inner, z0, z0 + t, cmat);
        this.label("قاعدة", leg1 - 2 * t, leg2 - 2 * t, t, { banded: { top: eb, bottom: eb, left: false, right: false }, material: cname });
        const top = createFlatSlab(this.ctx, e, "رأس", inner, h - t, h, cmat);
        this.label("رأس", leg1 - 2 * t, leg2 - 2 * t, t, { banded: { top: eb, bottom: eb, left: false, right: false }, material: cname });
        if (eb) {
            bandEdges(this.ctx, base, [new Vector3d(1, 0, 0), new Vector3d(0, 1, 0)], this.edgeBandingMaterial());
            bandEdges(this.ctx, top, [new Vector3d(1, 0, 0), new Vector3d(0, 1, 0)], this.edgeBandingMaterial());
        }
        if (truthy(p["include_shelves"])) {
            const count = Math.min(Math.max(toI(p["shelf_count"]), 0), 30);
            if (count > 0) {
                const iz0 = z0 + t;
                const iz1 = h - t;
                const total = iz1 - iz0;
                if (total > 0) {
                    const step = total / (count + 1);
                    for (let i = 0; i < count; i++) {
                        const sz = iz0 + step * (i + 1);
                        const name = `رف ${i + 1}`;
                        createFlatSlab(this.ctx, e, name, inner, sz - t / 2.0, sz + t / 2.0, cmat);
                        this.label(name, leg1 - 2 * t, leg2 - 2 * t, t, { banded: nb(), material: cname });
                    }
                }
            }
        }
        if (toS(p["door_type"]) !== "none") {
            const gap = pcm(p["door_gap_inset"]);
            const dir = new Vector3d(p4.x - p3.x, p4.y - p3.y, 0).normalizeBang();
            const normal = new Vector3d(dir.y, -dir.x, 0);
            const ft = cm(FRONT_THICKNESS_CM);
            const ps = p3.offset(dir, gap);
            const pe = p4.offset(dir, -gap);
            const recess = toS(p["unit_type"]) === "base" ? cm(toF(p["door_handle_recess"])) : 0;
            const dz0 = z0 + t + gap - this.doorBottomExtension();
            const dz1 = h - t - gap - recess;
            if (dz1 > dz0 && pe.distance(ps) > 0) {
                const door = createAngledPanel(this.ctx, e, "ضلفة قطرية", ps, pe, normal, ft, dz0, dz1, this.frontColor());
                tagDoorHinge(door, ps.x, ps.y, pe.x, pe.y, normal.x, normal.y);
                if (eb)
                    bandAllSideEdges(this.ctx, door, this.edgeBandingMaterial());
                this.label("ضلفة قطرية", pe.distance(ps), dz1 - dz0, ft, { banded: { ...ALL }, material: materialLabelName(this.frontColor()) });
            }
        }
        if (toS(p["unit_type"]) === "base") {
            const ct = pcm(p["countertop_thickness"]);
            createFlatSlab(this.ctx, e, "كونتر", [p1, p2, p3, p4, p5], h, h + ct, this.countertopMaterial());
        }
        this.buildCornerKick(e, [[p3, p4, new Vector3d(-1, -1, 0)]]);
        return this.finish(group, xOffsetCm);
    }
}
// ---------------------------------------------------------------------------- open corner
export class OpenCornerUnitBuilder extends PlainBuilder {
    unitGroupName() {
        const l = strip(toS(this.p["unit_label"]));
        return l === "" ? "Kitchen Unit - Corner Open" : `Kitchen Unit - ${l}`;
    }
    validate() {
        this.positive(["corner_leg1_length", "corner_leg2_length", "height", "panel_thickness", "back_panel_thickness"]);
    }
    build(parent, xOffsetCm = 0) {
        const group = this.newUnit(parent);
        const e = group.entities;
        const p = this.p;
        const leg1 = pcm(p["corner_leg1_length"]);
        const leg2 = pcm(p["corner_leg2_length"]);
        const t = pcm(p["panel_thickness"]);
        const bt = pcm(p["back_panel_thickness"]);
        const h = pcm(p["height"]);
        const z0 = truthy(p["include_toe_kick"]) ? pcm(p["toe_kick_height"]) : 0;
        const cmat = this.carcassMaterial();
        const cname = materialLabelName(cmat);
        const eb = this.edgeBandingEnabled();
        createBox(this.ctx, e, "جنب حيطة أ", 0, 0, z0, leg1, bt, h, cmat);
        this.label("جنب حيطة أ", leg1, h - z0, bt, { banded: { ...NO_BAND }, material: cname });
        createBox(this.ctx, e, "جنب حيطة ب", 0, 0, z0, bt, leg2, h, cmat);
        this.label("جنب حيطة ب", leg2, h - z0, bt, { banded: { ...NO_BAND }, material: cname });
        const base = createBox(this.ctx, e, "قاعدة", bt, bt, z0, leg1, leg2, z0 + t, cmat);
        this.label("قاعدة", leg1 - bt, leg2 - bt, t, { banded: { top: eb, bottom: eb, left: false, right: false }, material: cname });
        const top = createBox(this.ctx, e, "رأس", bt, bt, h - t, leg1, leg2, h, cmat);
        this.label("رأس", leg1 - bt, leg2 - bt, t, { banded: { top: eb, bottom: eb, left: false, right: false }, material: cname });
        if (eb) {
            bandEdges(this.ctx, base, [new Vector3d(1, 0, 0), new Vector3d(0, 1, 0)], this.edgeBandingMaterial());
            bandEdges(this.ctx, top, [new Vector3d(1, 0, 0), new Vector3d(0, 1, 0)], this.edgeBandingMaterial());
        }
        this.buildDoors(e, leg1, leg2, t, z0, h);
        this.buildCornerKick(e, [[new Point3d(leg1, 0, 0), new Point3d(leg1, leg2, 0), new Vector3d(-1, 0, 0)], [new Point3d(leg1 - pcm(p["toe_kick_setback"]) - t, leg2, 0), new Point3d(0, leg2, 0), new Vector3d(0, -1, 0)]]);
        if (toS(p["unit_type"]) === "base") {
            const ct = pcm(p["countertop_thickness"]);
            createBox(this.ctx, e, "كونتر", 0, 0, h, leg1, leg2, h + ct, this.countertopMaterial());
        }
        return this.finish(group, xOffsetCm);
    }
    buildDoors(e, leg1, leg2, t, z0, h) {
        const p = this.p;
        if (toS(p["door_type"]) === "none")
            return;
        const gap = pcm(p["door_gap_inset"]);
        const ft = cm(FRONT_THICKNESS_CM);
        const recess = toS(p["unit_type"]) === "base" ? cm(toF(p["door_handle_recess"])) : 0;
        const dz0 = z0 + t + gap - this.doorBottomExtension();
        const dz1 = h - t - gap - recess;
        if (dz1 <= dz0)
            return;
        const fc = this.frontColor();
        const eb = this.edgeBandingEnabled();
        const ay0 = gap;
        const ay1 = leg2 - gap;
        if (ay1 > ay0) {
            const a = createBox(this.ctx, e, "ضلفة أ", leg1 - ft, ay0, dz0, leg1, ay1, dz1, fc);
            tagDoorHinge(a, leg1, ay0, leg1, ay1, 1.0, 0.0);
            if (eb)
                bandAllSideEdges(this.ctx, a, this.edgeBandingMaterial());
            this.label("ضلفة أ", ay1 - ay0, dz1 - dz0, ft, { banded: { ...ALL }, material: materialLabelName(fc) });
        }
        const bx0 = gap;
        const bx1 = leg1 - ft - gap; // v189: stops at door A's face (the two doors used to overlap in the corner)
        if (bx1 > bx0) {
            const b = createBox(this.ctx, e, "ضلفة ب", bx0, leg2 - ft, dz0, bx1, leg2, dz1, fc);
            tagDoorHinge(b, bx0, leg2, bx1, leg2, 0.0, 1.0);
            if (eb)
                bandAllSideEdges(this.ctx, b, this.edgeBandingMaterial());
            this.label("ضلفة ب", bx1 - bx0, dz1 - dz0, ft, { banded: { ...ALL }, material: materialLabelName(fc) });
        }
    }
}
// ---------------------------------------------------------------------------- L-shape
export class LShapeCornerUnitBuilder extends PlainBuilder {
    unitGroupName() {
        const l = strip(toS(this.p["unit_label"]));
        return l === "" ? "Kitchen Unit - Corner L" : `Kitchen Unit - ${l}`;
    }
    validate() {
        this.positive(["corner_leg1_length", "corner_leg2_length", "corner_depth", "height", "panel_thickness", "back_panel_thickness"]);
        if (toF(this.p["corner_depth"]) >= rmin(toF(this.p["corner_leg1_length"]), toF(this.p["corner_leg2_length"]))) {
            throw argError("عمق وحدة الزاوية كبير جداً مقارنة بأطوال الأرجل.");
        }
    }
    metalFrameMaterial() {
        return this.once("metal_frame_material", () => {
            const name = strip(toS(this.p["material_metal_frame_name"]));
            return getOrCreateNamedMaterial(this.ctx, name === "" ? "برواز معدن" : name, [130, 130, 135]);
        });
    }
    build(parent, xOffsetCm = 0) {
        const group = this.newUnit(parent);
        const p = this.p;
        const leg1 = pcm(p["corner_leg1_length"]);
        const leg2 = pcm(p["corner_leg2_length"]);
        const cd = pcm(p["corner_depth"]);
        const t = pcm(p["panel_thickness"]);
        const bt = pcm(p["back_panel_thickness"]);
        const bg = rmin(pcm(p["back_groove_depth"]), t);
        const bro = pcm(p["back_rear_offset"]);
        const h = pcm(p["height"]);
        const z0 = truthy(p["include_toe_kick"]) ? pcm(p["toe_kick_height"]) : 0;
        let angle = toF(p["corner_angle"]);
        if (angle <= 0)
            angle = 90.0;
        angle = clamp(angle, 45.0, 150.0);
        const notch = cm(toF(p["corner_notch_size"]));
        const origin = new Point3d(0, 0, 0);
        const zAxis = new Vector3d(0, 0, 1);
        const dir1 = new Vector3d(1, 0, 0);
        const dir2 = new Vector3d(Math.cos(degrees(angle)), Math.sin(degrees(angle)), 0);
        const leg1G = group.entities.addGroup();
        leg1G.name = "رجل 1";
        const leg2G = group.entities.addGroup();
        leg2G.name = "رجل 2";
        const shared = group.entities.addGroup();
        shared.name = "قاعدة وسقف";
        const [hexInner, hexShelves, back1, back2] = this.footprints(leg1, leg2, cd, t, bt, bro, notch);
        this.buildLeg1EndAndBack(leg1G.entities, leg1, cd, t, bt, bg, bro, z0, h);
        this.buildLeg2EndAndBack(leg2G.entities, leg2, cd, t, bt, bg, bro, z0, h);
        this.buildSharedSlab(shared.entities, "قاعدة", hexInner, z0, z0 + t, leg1, leg2, t);
        this.buildSharedSlab(shared.entities, "رأس", hexInner, h - t, h, leg1, leg2, t);
        if (truthy(p["include_shelves"]))
            this.buildShelves(shared.entities, leg1G.entities, leg2G.entities, hexShelves, leg1, leg2, cd, t, z0, h, back1, back2);
        this.buildDoorA(leg1G.entities, leg1, cd, t, z0, h);
        this.buildDoorB(leg2G.entities, leg2, cd, t, z0, h);
        {
            const sb = pcm(p["toe_kick_setback"]);
            this.buildCornerKick(group.entities, [
                [new Point3d(leg1, cd, 0), new Point3d(cd - sb - t, cd, 0), new Vector3d(0, -1, 0), leg1G.entities],
                [new Point3d(cd, cd, 0), new Point3d(cd, leg2, 0), new Vector3d(-1, 0, 0), leg2G.entities],
            ]);
        }
        if (toS(p["unit_type"]) === "base") {
            const ct = pcm(p["countertop_thickness"]);
            const outer = [
                new Point3d(0, 0, 0), new Point3d(leg1, 0, 0), new Point3d(leg1, cd, 0),
                new Point3d(cd, cd, 0), new Point3d(cd, leg2, 0), new Point3d(0, leg2, 0),
            ];
            createFlatSlab(this.ctx, shared.entities, "كونتر", outer, h, h + ct, this.countertopMaterial());
        }
        if (Math.abs(angle - 90.0) > 0.01) {
            const shear = Transformation.axes(origin, dir1, dir2, zAxis);
            leg2G.transformBang(shear);
            shared.transformBang(shear);
        }
        return this.finish(group, xOffsetCm);
    }
    footprints(leg1, leg2, cd, t, bt, bro, notch) {
        let hexInner = [
            new Point3d(0, 0, 0), new Point3d(leg1 - t, 0, 0), new Point3d(leg1 - t, cd, 0),
            new Point3d(cd, cd, 0), new Point3d(cd, leg2 - t, 0), new Point3d(0, leg2 - t, 0),
        ];
        const back1 = t;
        const back2 = rmax(bro + bt, t);
        let hexShelves = [
            new Point3d(back2, back1, 0), new Point3d(leg1 - t, back1, 0), new Point3d(leg1 - t, cd, 0),
            new Point3d(cd, cd, 0), new Point3d(cd, leg2 - t, 0), new Point3d(back2, leg2 - t, 0),
        ];
        if (notch > 0) {
            const bis = new Vector3d(1, 1, 0).normalizeBang();
            const cut = new Point3d(0, 0, 0).offset(bis, notch);
            hexInner = [cut, ...hexInner.slice(1)];
            hexShelves = [new Point3d(rmax(back2, cut.x), rmax(back1, cut.y), 0), ...hexShelves.slice(1)];
        }
        return [hexInner, hexShelves, back1, back2];
    }
    buildSharedSlab(e, name, hex, zlo, zhi, leg1, leg2, t) {
        createFlatSlab(this.ctx, e, name, hex, zlo, zhi, this.carcassMaterial());
        this.label(name, leg1 - t, leg2 - t, t, { banded: { ...NO_BAND }, material: materialLabelName(this.carcassMaterial()) });
    }
    buildLeg1EndAndBack(e, leg1, cd, t, bt, bg, bro, z0, h) {
        const endA = createBox(this.ctx, e, "جنب الرجل الأولى", leg1 - t, 0, z0, leg1, cd, h, this.carcassMaterial());
        this.label("جنب الرجل الأولى", cd, h - z0, t, { banded: { ...NO_BAND }, material: materialLabelName(this.carcassMaterial()) });
        this.buildBackPanel(e, endA, leg1, t, bt, bg, bro, z0, h, "along_x");
    }
    buildLeg2EndAndBack(e, leg2, cd, t, bt, bg, bro, z0, h) {
        const endB = createBox(this.ctx, e, "جنب الرجل الثانية", 0, leg2 - t, z0, cd, leg2, h, this.carcassMaterial());
        this.label("جنب الرجل الثانية", cd, h - z0, t, { banded: { ...NO_BAND }, material: materialLabelName(this.carcassMaterial()) });
        this.buildBackPanel(e, endB, leg2, t, bt, bg, bro, z0, h, "along_y");
    }
    buildBackPanel(e, endPanel, legLen, t, bt, bg, bro, z0, h, orientation) {
        const z0b = z0 + t;
        const z1b = h - t;
        if (z1b <= z0b)
            return;
        const bm0 = this.backMaterial();
        // leg 1's back is a full-thickness board (leg 2's back butts into its groove): cut it from the carcass
        // board, not from an 18 mm sheet of the back material (that made a whole extra sheet group)
        const bm = orientation === "along_x" ? this.carcassMaterial() : bm0;
        if (orientation === "along_x") {
            const x0 = 0;
            const x1 = legLen - t + bg;
            const y0 = 0;
            const y1 = t;
            if (x1 <= x0)
                return;
            const nx0 = bro;
            const nx1 = bro + bt;
            const nd = rmin(bg, y1 - y0 - cm(0.1));
            if (nd > 0 && nx1 > nx0 && nx0 >= x0 && nx1 <= x1) {
                const pts = [
                    new Point3d(x0, y0, 0), new Point3d(x0, y1, 0), new Point3d(x1, y1, 0), new Point3d(x1, y0, 0),
                    new Point3d(nx1, y0, 0), new Point3d(nx1, y0 + nd, 0), new Point3d(nx0, y0 + nd, 0), new Point3d(nx0, y0, 0),
                ];
                createFlatSlab(this.ctx, e, "ظهر الرجل الأولى", pts, z0b, z1b, bm);
            }
            else {
                createBox(this.ctx, e, "ظهر الرجل الأولى", x0, y0, z0b, x1, y1, z1b, bm);
            }
            this.label("ظهر الرجل الأولى", x1 - x0, z1b - z0b, t, { banded: { ...NO_BAND }, material: materialLabelName(bm) });
            if (bg > 0) {
                addColoredMarkerFace(this.ctx, endPanel, [
                    new Point3d(legLen - t, y0, z0b), new Point3d(legLen - t, y1, z0b), new Point3d(legLen - t, y1, z1b), new Point3d(legLen - t, y0, z1b),
                ], COLORS.groove);
            }
        }
        else {
            const x0 = bro;
            const x1 = bro + bt;
            const y0 = 0;
            const y1 = legLen - t + bg;
            if (x1 <= x0 || y1 <= y0)
                return;
            createBox(this.ctx, e, "ظهر الرجل الثانية", x0, y0, z0b, x1, y1, z1b, bm);
            this.label("ظهر الرجل الثانية", y1 - y0, z1b - z0b, bt, { banded: { ...NO_BAND }, material: materialLabelName(bm) });
            if (bg > 0) {
                addColoredMarkerFace(this.ctx, endPanel, [
                    new Point3d(x0, legLen - t, z0b), new Point3d(x1, legLen - t, z0b), new Point3d(x1, legLen - t, z1b), new Point3d(x0, legLen - t, z1b),
                ], COLORS.groove);
            }
        }
    }
    buildShelves(shared, l1, l2, hexShelves, leg1, leg2, cd, t, z0, h, back1, back2) {
        const count = Math.min(Math.max(toI(this.p["shelf_count"]), 0), 30);
        if (count <= 0)
            return;
        const iz0 = z0 + t;
        const iz1 = h - t;
        const total = iz1 - iz0;
        if (total <= 0)
            return;
        const step = total / (count + 1);
        const cm0 = this.carcassMaterial();
        const cname = materialLabelName(cm0);
        if (toS(this.p["corner_shelf_mode"]) === "alternating") {
            for (let i = 0; i < count; i++) {
                const sz = iz0 + step * (i + 1);
                if (i % 2 === 0) {
                    const pts = [new Point3d(0, back1, 0), new Point3d(leg1 - t, back1, 0), new Point3d(leg1 - t, cd, 0), new Point3d(0, cd, 0)];
                    const name = `رف الرجل الأولى ${i + 1}`;
                    createFlatSlab(this.ctx, l1, name, pts, sz - t / 2.0, sz + t / 2.0, cm0);
                    this.label(name, leg1 - t, cd - back1, t, { banded: { ...NO_BAND }, material: cname });
                }
                else {
                    const pts = [new Point3d(back2, 0, 0), new Point3d(cd, 0, 0), new Point3d(cd, leg2 - t, 0), new Point3d(back2, leg2 - t, 0)];
                    const name = `رف الرجل الثانية ${i + 1}`;
                    createFlatSlab(this.ctx, l2, name, pts, sz - t / 2.0, sz + t / 2.0, cm0);
                    this.label(name, cd - back2, leg2 - t, t, { banded: { ...NO_BAND }, material: cname });
                }
            }
        }
        else {
            for (let i = 0; i < count; i++) {
                const sz = iz0 + step * (i + 1);
                const name = `رف ${i + 1}`;
                createFlatSlab(this.ctx, shared, name, hexShelves, sz - t / 2.0, sz + t / 2.0, cm0);
                // v189: the shelf starts behind the two backs (back2, back1), so it is that much smaller than the base
                this.label(name, leg1 - t - back2, leg2 - t - back1, t, { banded: { ...NO_BAND }, material: cname });
            }
        }
    }
    doorZRange(overlay, gap, recess, z0, t, h) {
        return overlay ? [z0 + gap - this.doorBottomExtension(), h - gap - recess] : [z0 + t + gap - this.doorBottomExtension(), h - t - gap - recess];
    }
    glassDoor() {
        return toS(this.p["door_type"]).includes("glass");
    }
    doorCommon(t, z0, h) {
        const p = this.p;
        const overlay = toS(p["door_position"]) === "overlay";
        const inset = pcm(p["door_gap_inset"]);
        const outer = pcm(p["door_gap_overlay"]);
        const gap = overlay ? outer : inset;
        const ft = cm(FRONT_THICKNESS_CM);
        const recess = toS(p["unit_type"]) === "base" ? cm(toF(p["door_handle_recess"])) : 0;
        const [dz0, dz1] = this.doorZRange(overlay, gap, recess, z0, t, h);
        return { overlay, inset, gap, ft, dz0, dz1 };
    }
    buildDoorA(e, leg1, cd, t, z0, h) {
        if (toS(this.p["door_type"]) === "none")
            return;
        const c = this.doorCommon(t, z0, h);
        if (c.dz1 <= c.dz0)
            return;
        // v189: door A stops in front of door B's face (they used to overlap 1.6 cm in the corner and hit each other)
        const ax0 = cd + c.ft + c.inset;
        const ax1 = c.overlay ? leg1 - c.gap : leg1 - t - c.gap;
        if (!(ax1 > ax0))
            return;
        const door = this.buildLegDoor(e, "ضلفة الرجل الأولى", ax0, ax1, cd, cd + c.ft, c.dz0, c.dz1);
        tagDoorHinge(door, ax1, cd, ax0, cd, 0.0, 1.0);
        if (this.edgeBandingEnabled() && !this.glassDoor())
            bandAllSideEdges(this.ctx, door, this.edgeBandingMaterial());
    }
    buildDoorB(e, leg2, cd, t, z0, h) {
        if (toS(this.p["door_type"]) === "none")
            return;
        const c = this.doorCommon(t, z0, h);
        if (c.dz1 <= c.dz0)
            return;
        const ay0 = cd + c.inset;
        const ay1 = c.overlay ? leg2 - c.gap : leg2 - t - c.gap;
        if (!(ay1 > ay0))
            return;
        const door = this.buildLegDoor(e, "ضلفة الرجل الثانية", cd, cd + c.ft, ay0, ay1, c.dz0, c.dz1, true);
        tagDoorHinge(door, cd, ay1, cd, ay0, 1.0, 0.0);
        if (this.edgeBandingEnabled() && !this.glassDoor())
            bandAllSideEdges(this.ctx, door, this.edgeBandingMaterial(), "x");
    }
    buildLegDoor(e, label, x0, x1, y0, y1, z0, z1, swap = false) {
        if (!this.glassDoor()) {
            const door = createBox(this.ctx, e, label, x0, y0, z0, x1, y1, z1, this.frontColor());
            // v186: the second-leg door is wide along Y and thick along X
            const [lw, lt] = swap ? [Math.abs(y1 - y0), Math.abs(x1 - x0)] : [x1 - x0, Math.abs(y1 - y0)];
            this.label(label, lw, z1 - z0, lt, { banded: { ...ALL }, material: materialLabelName(this.frontColor()) });
            return door;
        }
        const [w0, w1] = swap ? [y0, y1] : [x0, x1];
        const [th0, th1] = swap ? [x0, x1] : [y0, y1];
        const fm = this.metalFrameMaterial();
        const group = e.addGroup();
        group.name = label;
        const sub = group.entities;
        const railW = rmin(cm(toF(this.p["glass_frame_width"])), (w1 - w0) / 2.5, (z1 - z0) / 2.5);
        if (railW > 0 && w1 - railW > w0 + railW && z1 - railW > z0 + railW) {
            const ftk = Math.abs(th1 - th0);
            const fmn = materialLabelName(fm);
            const parts = [
                [w0, z0, w1, z0 + railW, "إطار تحت"], [w0, z1 - railW, w1, z1, "إطار فوق"],
                [w0, z0 + railW, w0 + railW, z1 - railW, "إطار شمال"], [w1 - railW, z0 + railW, w1, z1 - railW, "إطار يمين"],
            ];
            for (const [wx0, wz0, wx1, wz1, part] of parts) {
                const [bx0, bx1] = swap ? [th0, th1] : [wx0, wx1];
                const [by0, by1] = swap ? [wx0, wx1] : [th0, th1];
                if (bx1 <= bx0 || by1 <= by0)
                    continue;
                createBox(this.ctx, sub, `${label} - ${part}`, bx0, by0, wz0, bx1, by1, wz1, fm);
                this.label(`${label} - ${part}`, Math.abs(bx1 - bx0) + Math.abs(by1 - by0) - ftk, wz1 - wz0, ftk, { banded: { ...NO_BAND }, material: fmn });
            }
            const gt = rmax(rmin(cm(toF(this.p["glass_thickness"])), ftk - cm(0.2)), cm(0.2));
            const mid = (th0 + th1) / 2.0;
            const [gx0, gx1] = swap ? [mid - gt / 2.0, mid + gt / 2.0] : [w0 + railW, w1 - railW];
            const [gy0, gy1] = swap ? [w0 + railW, w1 - railW] : [mid - gt / 2.0, mid + gt / 2.0];
            createBox(this.ctx, sub, `${label} - زجاج`, gx0, gy0, z0 + railW, gx1, gy1, z1 - railW, this.glassMaterial());
            this.label(`${label} - زجاج`, w1 - railW - (w0 + railW), z1 - railW - (z0 + railW), gt, { banded: { ...NO_BAND }, material: materialLabelName(this.glassMaterial()) });
        }
        else {
            createBox(this.ctx, sub, label, x0, y0, z0, x1, y1, z1, fm);
            this.label(label, x1 - x0, z1 - z0, Math.abs(y1 - y0), { banded: { ...ALL }, material: materialLabelName(fm) });
        }
        return group;
    }
}
// ---------------------------------------------------------------------------- accessories
const ACCESSORY_LABELS = {
    tray_dividers: "تقسيمات رأسية للصواني",
    spice_rack: "تقسيمة توابل",
    pullout_basket: "سلة أدراج بالسكة",
    plate_rack: "حامل أطباق مائل",
    shelf_dividers: "تقسيمة تحت رف أفقي",
    utensil_tray: "درج أدوات بفواصل شبكية",
};
export class AccessoryBuilder extends PlainBuilder {
    unitGroupName() {
        const l = strip(toS(this.p["unit_label"]));
        const base = ACCESSORY_LABELS[toS(this.p["accessory_type"])] ?? "إكسسوار";
        return l === "" ? base : `${base} - ${l}`;
    }
    validate() {
        this.positive(["accessory_width", "accessory_depth", "accessory_height", "panel_thickness"]);
    }
    build(parent, xOffsetCm = 0) {
        const group = this.newUnit(parent);
        const e = group.entities;
        switch (toS(this.p["accessory_type"])) {
            case "spice_rack":
                this.spiceRack(e);
                break;
            case "pullout_basket":
                this.pulloutBasket(e);
                break;
            case "plate_rack":
                this.plateRack(e);
                break;
            case "shelf_dividers":
                this.shelfDividers(e);
                break;
            case "utensil_tray":
                this.utensilTray(e);
                break;
            default:
                this.trayDividers(e);
        }
        return this.finish(group, xOffsetCm);
    }
    dims() {
        const p = this.p;
        return { w: pcm(p["accessory_width"]), d: pcm(p["accessory_depth"]), h: pcm(p["accessory_height"]), t: pcm(p["panel_thickness"]) };
    }
    nm() {
        return materialLabelName(this.carcassMaterial());
    }
    trayDividers(e) {
        const { w, d, h, t } = this.dims();
        const count = Math.min(Math.max(toI(this.p["accessory_divider_count"]), 1), 20);
        createBox(this.ctx, e, "قاعدة", 0, 0, 0, w, d, t, this.carcassMaterial());
        this.label("قاعدة", w, d, t, { banded: { ...NO_BAND }, material: this.nm() });
        const step = w / (count + 1);
        const eb = this.edgeBandingEnabled();
        for (let i = 0; i < count; i++) {
            const x = step * (i + 1);
            const name = `فاصل ${i + 1}`;
            const pc = createBox(this.ctx, e, name, x - t / 2.0, 0, t, x + t / 2.0, d, h, this.carcassMaterial());
            if (eb)
                bandEdge(this.ctx, pc, new Vector3d(0, -1, 0), this.edgeBandingMaterial());
            // v189: the divider stands on the base, so it is h − t high (was labelled h)
            this.label(name, d, h - t, t, { banded: { top: false, bottom: false, left: eb, right: false }, material: this.nm() });
        }
    }
    spiceRack(e) {
        const { w, d, h, t } = this.dims();
        const gap = rmax(pcm(this.p["accessory_shelf_gap"]), cm(1.0));
        createBox(this.ctx, e, "جنب شمال", 0, 0, 0, t, d, h, this.carcassMaterial());
        this.label("جنب شمال", d, h, t, { banded: { ...NO_BAND }, material: this.nm() });
        createBox(this.ctx, e, "جنب يمين", w - t, 0, 0, w, d, h, this.carcassMaterial());
        this.label("جنب يمين", d, h, t, { banded: { ...NO_BAND }, material: this.nm() });
        let count = 0;
        let z = t;
        const eb = this.edgeBandingEnabled();
        while (z + t <= h && count < 30) {
            const name = `رف ${count + 1}`;
            const s = createBox(this.ctx, e, name, t, 0, z, w - t, d, z + t, this.carcassMaterial());
            if (eb)
                bandEdge(this.ctx, s, new Vector3d(0, -1, 0), this.edgeBandingMaterial());
            this.label(name, w - t * 2, d, t, { banded: { top: false, bottom: false, left: eb, right: false }, material: this.nm() });
            z += gap + t;
            count += 1;
        }
    }
    pulloutBasket(e) {
        const { w, d, h, t } = this.dims();
        const railT = cm(1.2);
        const mn = this.nm();
        const cm0 = this.carcassMaterial();
        const nb = () => ({ ...NO_BAND });
        createBox(this.ctx, e, "قاعدة السلة", 0, 0, 0, w, d, t, cm0);
        this.label("قاعدة السلة", w, d, t, { banded: nb(), material: mn });
        createBox(this.ctx, e, "جنب السلة شمال", 0, 0, t, t, d, h, cm0);
        this.label("جنب السلة شمال", d, h - t, t, { banded: nb(), material: mn });
        createBox(this.ctx, e, "جنب السلة يمين", w - t, 0, t, w, d, h, cm0);
        this.label("جنب السلة يمين", d, h - t, t, { banded: nb(), material: mn });
        // v189: front and back sit between the two sides (they used to run the full width through them)
        createBox(this.ctx, e, "جنب السلة أمامي", t, 0, t, w - t, t, h, cm0);
        this.label("جنب السلة أمامي", w - 2 * t, h - t, t, { banded: nb(), material: mn });
        createBox(this.ctx, e, "جنب السلة خلفي", t, d - t, t, w - t, d, h, cm0);
        this.label("جنب السلة خلفي", w - 2 * t, h - t, t, { banded: nb(), material: mn });
        createBox(this.ctx, e, "سكة شمال", -railT, 0, 0, 0, d, railT, COLORS.assembly);
        createBox(this.ctx, e, "سكة يمين", w, 0, 0, w + railT, d, railT, COLORS.assembly);
    }
    plateRack(e) {
        const { w, d, h, t } = this.dims();
        const count = Math.min(Math.max(toI(this.p["accessory_divider_count"]), 3), 30);
        const tilt = toF(this.p["accessory_rack_tilt"]);
        const mn = this.nm();
        const cm0 = this.carcassMaterial();
        createBox(this.ctx, e, "قاعدة الحامل", 0, 0, 0, w, d, t, cm0);
        this.label("قاعدة الحامل", w, d, t, { banded: { ...NO_BAND }, material: mn });
        const backH = rmax(h * 0.3, t);
        createBox(this.ctx, e, "حافة خلفية", 0, d - t, t, w, d, backH, cm0);
        this.label("حافة خلفية", w, backH - t, t, { banded: { ...NO_BAND }, material: mn });
        const step = w / (count + 1);
        for (let i = 0; i < count; i++) {
            const x = step * (i + 1);
            const name = `سن ${i + 1}`;
            const sd = rmax(d * 0.6, t);
            const slat = createBox(this.ctx, e, name, x - t / 2.0, 0, t, x + t / 2.0, sd, h, cm0);
            this.label(name, sd, h - t, t, { banded: { ...NO_BAND }, material: mn });
            if (tilt === 0)
                continue;
            slat.transformBang(Transformation.rotation(new Point3d(x, 0, t), new Vector3d(1, 0, 0), degrees(tilt)));
        }
    }
    shelfDividers(e) {
        const { w, d, h, t } = this.dims();
        const count = Math.min(Math.max(toI(this.p["accessory_divider_count"]), 1), 20);
        const mn = this.nm();
        const cm0 = this.carcassMaterial();
        createBox(this.ctx, e, "شريط علوي", 0, 0, h - t, w, d, h, cm0);
        this.label("شريط علوي", w, d, t, { banded: { ...NO_BAND }, material: mn });
        const step = w / (count + 1);
        const eb = this.edgeBandingEnabled();
        for (let i = 0; i < count; i++) {
            const x = step * (i + 1);
            const name = `فاصل ${i + 1}`;
            const pc = createBox(this.ctx, e, name, x - t / 2.0, 0, 0, x + t / 2.0, d, h - t, cm0);
            if (eb)
                bandEdge(this.ctx, pc, new Vector3d(0, -1, 0), this.edgeBandingMaterial());
            this.label(name, d, h - t, t, { banded: { top: false, bottom: false, left: eb, right: false }, material: mn });
        }
    }
    utensilTray(e) {
        const { w, d, h, t } = this.dims();
        const rows = Math.min(Math.max(toI(this.p["accessory_grid_rows"]), 1), 10);
        const cols = Math.min(Math.max(toI(this.p["accessory_grid_cols"]), 1), 10);
        const mn = this.nm();
        const cm0 = this.carcassMaterial();
        createBox(this.ctx, e, "قاعدة الدرج", 0, 0, 0, w, d, t, cm0);
        this.label("قاعدة الدرج", w, d, t, { banded: { ...NO_BAND }, material: mn });
        const lap = cols > 1 && rows > 1 ? { note: "تعشيقة نص بنص: شق بعرض السمك ونص الارتفاع عند كل تقاطع" } : {};
        const cs = w / cols;
        for (let i = 1; i < cols; i++) {
            const x = cs * i;
            const name = `فاصل رأسي ${i}`;
            createBox(this.ctx, e, name, x - t / 2.0, 0, t, x + t / 2.0, d, h, cm0);
            this.label(name, d, h - t, t, { banded: { ...NO_BAND }, material: mn, ...lap });
        }
        const rs = d / rows;
        for (let i = 1; i < rows; i++) {
            const y = rs * i;
            const name = `فاصل أفقي ${i}`;
            createBox(this.ctx, e, name, 0, y - t / 2.0, t, w, y + t / 2.0, h, cm0);
            this.label(name, w, h - t, t, { banded: { ...NO_BAND }, material: mn, ...lap });
        }
    }
}
// ---------------------------------------------------------------------------- corner glass display
export class CornerGlassDisplayUnitBuilder extends PlainBuilder {
    unitGroupName() {
        const l = strip(toS(this.p["unit_label"]));
        return l === "" ? "Kitchen Unit - Corner Glass Display" : `Kitchen Unit - ${l}`;
    }
    validate() {
        this.positive(["corner_leg1_length", "corner_leg2_length", "corner_depth", "height", "panel_thickness"]);
        if (toF(this.p["corner_depth"]) >= rmin(toF(this.p["corner_leg1_length"]), toF(this.p["corner_leg2_length"]))) {
            throw argError("عمق الفاترينة كبير جداً مقارنة بأطوال الأرجل.");
        }
    }
    metalFrameMaterial() {
        return this.once("metal_frame_material", () => {
            const name = strip(toS(this.p["material_metal_frame_name"]));
            return getOrCreateNamedMaterial(this.ctx, name === "" ? "برواز معدن" : name, [40, 40, 42]);
        });
    }
    build(parent, xOffsetCm = 0) {
        const group = this.newUnit(parent);
        const e = group.entities;
        const p = this.p;
        const leg1 = pcm(p["corner_leg1_length"]);
        const leg2 = pcm(p["corner_leg2_length"]);
        const cd = pcm(p["corner_depth"]);
        const t = pcm(p["panel_thickness"]);
        const h = pcm(p["height"]);
        const z0 = toS(p["unit_type"]) === "base" && truthy(p["include_toe_kick"]) ? pcm(p["toe_kick_height"]) : 0;
        const cm0 = this.carcassMaterial();
        const cn = materialLabelName(cm0);
        const hex = [
            new Point3d(0, 0, 0), new Point3d(leg1 - t, 0, 0), new Point3d(leg1 - t, cd, 0),
            new Point3d(cd, cd, 0), new Point3d(cd, leg2 - t, 0), new Point3d(0, leg2 - t, 0),
        ];
        createBox(this.ctx, e, "جنب الرجل الأولى", leg1 - t, 0, z0, leg1, cd, h, cm0);
        this.label("جنب الرجل الأولى", cd, h - z0, t, { banded: { ...NO_BAND }, material: cn });
        createBox(this.ctx, e, "جنب الرجل الثانية", 0, leg2 - t, z0, cd, leg2, h, cm0);
        this.label("جنب الرجل الثانية", cd, h - z0, t, { banded: { ...NO_BAND }, material: cn });
        createFlatSlab(this.ctx, e, "قاعدة", hex, z0, z0 + t, cm0);
        this.label("قاعدة", leg1 - t, leg2 - t, t, { banded: { ...NO_BAND }, material: cn });
        createFlatSlab(this.ctx, e, "رأس", hex, h - t, h, cm0);
        this.label("رأس", leg1 - t, leg2 - t, t, { banded: { ...NO_BAND }, material: cn });
        if (truthy(p["include_shelves"]))
            this.buildShelves(e, leg1, leg2, cd, t, z0, h);
        this.buildDoorFront(e, leg1, cd, t, z0, h);
        this.buildDoorSide(e, leg2, cd, t, z0, h);
        {
            const sb = pcm(p["toe_kick_setback"]);
            this.buildCornerKick(e, [[new Point3d(leg1, cd, 0), new Point3d(cd - sb - t, cd, 0), new Vector3d(0, -1, 0)], [new Point3d(cd, cd, 0), new Point3d(cd, leg2, 0), new Vector3d(-1, 0, 0)]]);
        }
        return this.finish(group, xOffsetCm);
    }
    buildShelves(e, leg1, leg2, cd, t, z0, h) {
        const count = Math.min(Math.max(toI(this.p["shelf_count"]), 0), 20);
        if (count <= 0)
            return;
        const iz0 = z0 + t;
        const iz1 = h - t;
        const total = iz1 - iz0;
        if (total <= 0)
            return;
        const step = total / (count + 1);
        const cl = t + cm(0.5);
        const hex = [
            new Point3d(cl, cl, 0), new Point3d(leg1 - t, cl, 0), new Point3d(leg1 - t, cd, 0),
            new Point3d(cd, cd, 0), new Point3d(cd, leg2 - t, 0), new Point3d(cl, leg2 - t, 0),
        ];
        for (let i = 0; i < count; i++) {
            const sz = iz0 + step * (i + 1);
            const name = `رف ${i + 1}`;
            createFlatSlab(this.ctx, e, name, hex, sz - t / 2.0, sz + t / 2.0, this.carcassMaterial());
            this.label(name, leg1 - t - cl, leg2 - t - cl, t, { banded: { ...NO_BAND }, material: materialLabelName(this.carcassMaterial()) });
        }
    }
    buildDoorFront(e, leg1, cd, t, z0, h) {
        if (toS(this.p["door_type"]) === "none")
            return;
        const gap = pcm(this.p["door_gap_inset"]);
        const ft = cm(FRONT_THICKNESS_CM);
        const dz0 = z0 + t + gap;
        const dz1 = h - t - gap;
        if (dz1 <= dz0)
            return;
        const ax0 = cd + ft + gap; // v189: clear of the side door's face
        const ax1 = leg1 - t - gap;
        if (!(ax1 > ax0))
            return;
        const railW = rmin(cm(toF(this.p["glass_frame_width"])), (ax1 - ax0) / 2.5, (dz1 - dz0) / 2.5);
        const group = e.addGroup();
        group.name = "ضلفة أمامية (زجاج)";
        const sub = group.entities;
        if (railW > 0 && ax1 - railW > ax0 + railW && dz1 - railW > dz0 + railW) {
            const fm = this.metalFrameMaterial();
            const fn = materialLabelName(fm);
            createBox(this.ctx, sub, "ضلفة أمامية - إطار تحت", ax0, cd, dz0, ax1, cd + ft, dz0 + railW, fm);
            createBox(this.ctx, sub, "ضلفة أمامية - إطار فوق", ax0, cd, dz1 - railW, ax1, cd + ft, dz1, fm);
            createBox(this.ctx, sub, "ضلفة أمامية - إطار شمال", ax0, cd, dz0 + railW, ax0 + railW, cd + ft, dz1 - railW, fm);
            createBox(this.ctx, sub, "ضلفة أمامية - إطار يمين", ax1 - railW, cd, dz0 + railW, ax1, cd + ft, dz1 - railW, fm);
            const parts = [
                ["تحت", ax1 - ax0, railW], ["فوق", ax1 - ax0, railW], ["شمال", dz1 - dz0 - 2 * railW, railW], ["يمين", dz1 - dz0 - 2 * railW, railW],
            ];
            for (const [part, len, wid] of parts)
                this.label(`ضلفة أمامية - إطار ${part}`, len, wid, ft, { banded: { ...NO_BAND }, material: fn });
            const gt = rmax(rmin(cm(toF(this.p["glass_thickness"])), ft - cm(0.2)), cm(0.2));
            const mid = cd + ft / 2.0;
            createBox(this.ctx, sub, "ضلفة أمامية - زجاج", ax0 + railW, mid - gt / 2.0, dz0 + railW, ax1 - railW, mid + gt / 2.0, dz1 - railW, this.glassMaterial());
            this.label("ضلفة أمامية - زجاج", ax1 - ax0 - 2 * railW, dz1 - dz0 - 2 * railW, gt, { banded: { ...NO_BAND }, material: materialLabelName(this.glassMaterial()) });
        }
        else {
            createBox(this.ctx, sub, "ضلفة أمامية", ax0, cd, dz0, ax1, cd + ft, dz1, this.metalFrameMaterial());
            this.label("ضلفة أمامية", ax1 - ax0, dz1 - dz0, ft, { banded: { ...ALL }, material: materialLabelName(this.metalFrameMaterial()) });
        }
        tagDoorHinge(group, ax1, cd, ax0, cd, 0.0, 1.0);
        assignLayer(this.ctx, group, TAGS.front);
    }
    buildDoorSide(e, leg2, cd, t, z0, h) {
        if (toS(this.p["door_type"]) === "none")
            return;
        const gap = pcm(this.p["door_gap_inset"]);
        const ft = cm(FRONT_THICKNESS_CM);
        const dz0 = z0 + t + gap;
        const dz1 = h - t - gap;
        if (dz1 <= dz0)
            return;
        const by0 = cd + gap;
        const by1 = leg2 - t - gap;
        if (!(by1 > by0))
            return;
        const railW = rmin(cm(toF(this.p["glass_frame_width"])), (by1 - by0) / 2.5, (dz1 - dz0) / 2.5);
        const group = e.addGroup();
        group.name = "ضلفة جانبية (زجاج)";
        const sub = group.entities;
        if (railW > 0 && by1 - railW > by0 + railW && dz1 - railW > dz0 + railW) {
            const fm = this.metalFrameMaterial();
            const fn = materialLabelName(fm);
            createBox(this.ctx, sub, "ضلفة جانبية - إطار تحت", cd, by0, dz0, cd + ft, by1, dz0 + railW, fm);
            createBox(this.ctx, sub, "ضلفة جانبية - إطار فوق", cd, by0, dz1 - railW, cd + ft, by1, dz1, fm);
            createBox(this.ctx, sub, "ضلفة جانبية - إطار قريب", cd, by0, dz0 + railW, cd + ft, by0 + railW, dz1 - railW, fm);
            createBox(this.ctx, sub, "ضلفة جانبية - إطار بعيد", cd, by1 - railW, dz0 + railW, cd + ft, by1, dz1 - railW, fm);
            const parts = [
                ["تحت", by1 - by0, railW], ["فوق", by1 - by0, railW], ["قريب", dz1 - dz0 - 2 * railW, railW], ["بعيد", dz1 - dz0 - 2 * railW, railW],
            ];
            for (const [part, len, wid] of parts)
                this.label(`ضلفة جانبية - إطار ${part}`, len, wid, ft, { banded: { ...NO_BAND }, material: fn });
            const gt = rmax(rmin(cm(toF(this.p["glass_thickness"])), ft - cm(0.2)), cm(0.2));
            const mid = cd + ft / 2.0;
            createBox(this.ctx, sub, "ضلفة جانبية - زجاج", mid - gt / 2.0, by0 + railW, dz0 + railW, mid + gt / 2.0, by1 - railW, dz1 - railW, this.glassMaterial());
            this.label("ضلفة جانبية - زجاج", by1 - by0 - 2 * railW, dz1 - dz0 - 2 * railW, gt, { banded: { ...NO_BAND }, material: materialLabelName(this.glassMaterial()) });
        }
        else {
            createBox(this.ctx, sub, "ضلفة جانبية", cd, by0, dz0, cd + ft, by1, dz1, this.metalFrameMaterial());
            this.label("ضلفة جانبية", by1 - by0, dz1 - dz0, ft, { banded: { ...ALL }, material: materialLabelName(this.metalFrameMaterial()) });
        }
        tagDoorHinge(group, cd, by1, cd, by0, 1.0, 0.0);
        assignLayer(this.ctx, group, TAGS.front);
    }
}
