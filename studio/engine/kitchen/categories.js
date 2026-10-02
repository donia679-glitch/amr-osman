// Port of the rectangular unit categories in lib/builders_categories.rb (+ bedroom_wardrobe_builder.rb):
// Standard, Wardrobe, Oven, Microwave, Fridge, Washing machine, Open shelf, Divided, Blind corner,
// Bedroom wardrobe.
import { COLORS } from "./config.js";
import { assignLayer, bandAllSideEdges, createBox, createHoleMarker, getOrCreateNamedMaterial, NO_BAND } from "./helpers.js";
import { CarcassBuilder, materialLabelName, TAGS, argError } from "./carcass.js";
import { strip, toF, toI, toS, truthy } from "./rb.js";
import { cm, rmax, rmin } from "./su/geom.js";
import { Entities, Material } from "./su/model.js";
const pcm = (v) => cm(toF(v));
export class StandardUnitBuilder extends CarcassBuilder {
    buildFrontContent(e) {
        const zone = this.activeZone();
        const dt = toS(this.p["door_type"]);
        if (dt === "drawer_top_two_doors_bottom") {
            const drawerH = cm(rmax(toF(this.p["top_drawer_height"]), 10.0));
            const splitZ = rmax(zone.z1 - drawerH, zone.z0);
            if (splitZ > zone.z0)
                this.buildFrontZone(e, zone.x0, zone.x1, zone.z0, splitZ, "double");
            if (zone.z1 > splitZ)
                this.buildFrontZone(e, zone.x0, zone.x1, splitZ, zone.z1, "drawers");
        }
        else {
            this.buildFrontZone(e, zone.x0, zone.x1, zone.z0, zone.z1, dt);
        }
        this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
    }
}
export const ZONE_TYPES = {
    shelves_double: { content: "shelves", front: "double" },
    shelves_single: { content: "shelves", front: "single" },
    shelves_open: { content: "shelves", front: "none" },
    rail_double: { content: "rail", front: "double" },
    rail_single: { content: "rail", front: "single" },
    rail_open: { content: "rail", front: "none" },
    drawers: { content: "drawers", front: null },
};
export class WardrobeUnitBuilder extends StandardUnitBuilder {
    buildFrontContent(e) {
        this.buildWardrobeZones(e);
        this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
    }
    buildShelves(_e) { }
    unitGroupName() {
        const label = strip(toS(this.p["unit_label"]));
        return label === "" ? "دولاب دريسنج" : `دولاب دريسنج - ${label}`;
    }
    zoneCount(prefix = "") {
        return Math.min(Math.max(toI(this.p[`wardrobe_${prefix}zone_count`]), 1), 3);
    }
    zoneRanges(prefix = "") {
        const o = this.innerOpening();
        const n = this.zoneCount(prefix);
        if (n === 1)
            return [[o.z0, o.z1]];
        const bounds = [o.z0];
        for (let i = 1; i < n; i++) {
            const h = cm(toF(this.p[`wardrobe_${prefix}zone${i}_height`]));
            bounds.push(rmin(rmax(bounds[bounds.length - 1] + h, o.z0), o.z1));
        }
        bounds.push(o.z1);
        const out = [];
        for (let i = 0; i < n; i++)
            out.push([bounds[i], bounds[i + 1]]);
        return out;
    }
    wardrobeColumnCount() {
        return Math.min(Math.max(toI(this.p["wardrobe_column_count"]), 1), 3);
    }
    wardrobeColumns() {
        const o = this.innerOpening();
        const n = this.wardrobeColumnCount();
        if (n === 1)
            return [[o.x0, o.x1, ""]];
        const dt = this.panelT();
        const colW = (o.x1 - o.x0 - dt * (n - 1)) / n;
        if (colW <= 0)
            return [[o.x0, o.x1, ""]];
        const cols = [];
        let x = o.x0;
        for (let i = 0; i < n; i++) {
            const prefix = i === 0 ? "" : `col${i + 1}_`;
            const x1 = x + colW;
            cols.push([x, x1, prefix]);
            x = x1 + dt;
        }
        return cols;
    }
    buildWardrobeZones(e) {
        const columns = this.wardrobeColumns();
        for (const [cx0, cx1, prefix] of columns) {
            this.zoneRanges(prefix).forEach(([z0, z1], i) => {
                if (z1 <= z0)
                    return;
                this.buildZone(e, i + 1, z0, z1, cx0, cx1, prefix);
            });
        }
        if (columns.length > 1)
            this.buildColumnDividers(e, columns);
    }
    buildColumnDividers(e, columns) {
        const o = this.innerOpening();
        const y0 = this.interiorDepthStart();
        const y1 = rmax(this.depth() - this.backT() - this.backRearOffset(), y0 + this.panelT());
        for (let i = 0; i + 1 < columns.length; i++) {
            const x1a = columns[i][1];
            const x2b = columns[i + 1][0];
            if (x2b <= x1a)
                continue;
            const d = createBox(this.ctx, e, "قاطوع رأسي بين الأعمدة", x1a, y0, o.z0, x2b, y1, o.z1, this.carcassMaterial());
            assignLayer(this.ctx, d, TAGS.carcass);
        }
    }
    buildZone(e, n, z0, z1, x0, x1, prefix = "") {
        const spec = ZONE_TYPES[toS(this.p[`wardrobe_${prefix}zone${n}_type`])] ?? ZONE_TYPES.shelves_double;
        const label = `منطقة ${n} - `;
        const count = Math.min(Math.max(toI(this.p[`wardrobe_${prefix}zone${n}_count`]), 0), 20);
        const positions = this.parseCustomPositions(this.p[`wardrobe_${prefix}zone${n}_positions`]);
        if (spec.content === "drawers") {
            this.buildZoneDrawers(e, x0, x1, z0, z1, Math.max(count, 1), label);
            return;
        }
        if (spec.front !== "none")
            this.buildFrontZone(e, x0, x1, z0, z1, spec.front, label);
        if (spec.content === "shelves")
            this.buildShelvesInRange(e, z0, z1, count, x0, x1, positions);
        else if (spec.content === "rail")
            this.buildZoneRail(e, z0, z1, x0, x1, positions);
    }
    parseCustomPositions(raw) {
        return toS(raw)
            .split(",")
            .map((s) => toF(strip(s)))
            .filter((v) => v > 0)
            .sort((a, b) => a - b);
    }
    /** how far the drawer fronts of a zone sit back from the front edge (0 = flush, like the doors) */
    zoneDrawerSetback() {
        return 0;
    }
    buildZoneDrawers(e, x0, x1, z0, z1, count, labelPrefix) {
        const overlay = this.doorPosition() === "overlay";
        const gap = overlay ? this.doorGapOverlay() : this.doorGapInset();
        const zx0 = x0 + gap;
        const zx1 = x1 - gap;
        const zz0 = z0 + gap;
        const zz1 = z1 - gap;
        if (zx1 <= zx0 || zz1 <= zz0)
            return;
        const total = zz1 - zz0;
        const eachH = (total - this.drawerGap() * (count - 1)) / count;
        if (eachH <= 0)
            return;
        const sb = this.zoneDrawerSetback();
        const fy0 = (overlay && sb === 0 ? -this.frontT() : 0) + sb;
        const fy1 = fy0 + this.frontT();
        let z = zz0;
        for (let i = 0; i < count; i++) {
            const dz0 = z;
            const full = z + eachH;
            const fdz1 = i === count - 1 ? rmax(full - this.handleRecess(), dz0) : full;
            this.buildSingleDrawer(e, zx0, zx1, fy0, fy1, dz0, fdz1, full, i, count, `${labelPrefix}درج ${i + 1}`);
            z = full + this.drawerGap();
        }
    }
    railRadius() {
        return pcm(this.p["wardrobe_rail_diameter"]) / 2.0;
    }
    railMaterial() {
        return this.once("rail_material", () => {
            let name = strip(toS(this.p["wardrobe_rail_material_name"]));
            if (name === "")
                name = "شماعة معدن";
            return getOrCreateNamedMaterial(this.ctx, name, [190, 190, 195]);
        });
    }
    buildZoneRail(e, z0, z1, x0, x1, positions = []) {
        const ry = rmax(this.depth() - this.backT() - this.backRearOffset() - pcm(this.p["wardrobe_rail_depth_offset"]), cm(2));
        const midX = (x0 + x1) / 2.0;
        const span = x1 - x0;
        if (span <= 0 || this.railRadius() <= 0)
            return;
        const zs = positions.length
            ? positions.map((pp) => rmin(rmax(z0 + cm(pp), z0 + cm(3)), z1 - cm(3)))
            : [rmax(z1 - cm(6), z0 + cm(3))];
        zs.forEach((rz, i) => {
            const label = zs.length > 1 ? `شماعة ${i + 1}` : "شماعة";
            createHoleMarker(this.ctx, e, label, midX, ry, rz, this.railRadius(), span, this.railMaterial());
        });
    }
}
export class OvenHousingBuilder extends CarcassBuilder {
    /** v186: no general shelves through the appliance cavity (zones build their own) */
    buildShelves(_e) { }
    buildFrontContent(e) {
        const zone = this.activeZone();
        const ovenH = pcm(this.p["oven_cavity_height"]);
        const b = this.bottomStackBounds(zone, "oven_cavity_bottom_offset");
        const oz0 = b.cavity_z0;
        const oz1 = rmin(oz0 + ovenH, zone.z1);
        const frame = this.frameShelvesEnabled();
        if (oz0 > zone.z0) {
            let below = toS(this.p["oven_bottom_front_type"]);
            if (below === "")
                below = toS(this.p["door_type"]);
            this.buildBottomStack(e, zone, b, below, "أسفل الفرن - ");
            if (b.bottom_z1 > zone.z0)
                this.buildShelvesInRange(e, zone.z0, b.bottom_z1, this.belowZoneShelfCount());
            if (frame)
                this.buildSingleShelfAt(e, oz0, "رف جلسة الفرن", "below");
        }
        let cursor = oz1;
        if (truthy(this.p["include_microwave"])) {
            const mwH = pcm(this.p["microwave_cavity_height"]);
            const mwB = pcm(this.p["microwave_cavity_bottom_offset"]);
            const mz0 = rmax(rmin(zone.z0 + mwB, zone.z1), cursor);
            const mz1 = rmin(mz0 + mwH, zone.z1);
            if (mz0 > cursor)
                this.buildFrontZone(e, zone.x0, zone.x1, cursor, mz0, this.p["door_type"], "بين الفرن والميكروويف - ");
            if (frame) {
                if (Math.abs(mz0 - oz1) < cm(0.5))
                    this.buildSingleShelfAt(e, oz1, "رف فاصل بين الفرن والميكروويف", "center");
                else {
                    if (oz1 < mz0)
                        this.buildSingleShelfAt(e, oz1, "رف أعلى الفرن", "above");
                    if (mz0 > oz1)
                        this.buildSingleShelfAt(e, mz0, "رف جلسة الميكروويف", "below");
                }
            }
            if (mz1 > mz0) {
                this.buildCavityWithFillers(e, zone, mz0, mz1, this.p["microwave_cavity_width"], this.p["microwave_h_align"], "ميكروويف");
                cursor = mz1;
            }
            if (frame && mz1 < zone.z1)
                this.buildSingleShelfAt(e, mz1, "رف أعلى الميكروويف", "above");
        }
        else if (frame && oz1 < zone.z1) {
            this.buildSingleShelfAt(e, oz1, "رف أعلى الفرن", "above");
        }
        if (zone.z1 > cursor) {
            this.buildFrontZone(e, zone.x0, zone.x1, cursor, zone.z1, this.p["door_type"], "أعلى - ");
            this.buildShelvesInRange(e, cursor, zone.z1, this.aboveZoneShelfCount());
        }
        this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
    }
}
export class MicrowaveHousingBuilder extends CarcassBuilder {
    /** v186: no general shelves through the appliance cavity (zones build their own) */
    buildShelves(_e) { }
    buildFrontContent(e) {
        const zone = this.activeZone();
        const mwH = pcm(this.p["microwave_cavity_height"]);
        const b = this.bottomStackBounds(zone, "microwave_cavity_bottom_offset");
        const mz0 = b.cavity_z0;
        const mz1 = rmin(mz0 + mwH, zone.z1);
        const frame = this.frameShelvesEnabled();
        if (mz0 > zone.z0) {
            this.buildBottomStack(e, zone, b, this.p["door_type"], "أسفل الميكروويف - ");
            if (b.bottom_z1 > zone.z0)
                this.buildShelvesInRange(e, zone.z0, b.bottom_z1, this.belowZoneShelfCount());
            if (frame)
                this.buildSingleShelfAt(e, mz0, "رف جلسة الميكروويف", "below");
        }
        let cursor = mz0;
        if (mz1 > mz0) {
            this.buildCavityWithFillers(e, zone, mz0, mz1, this.p["microwave_cavity_width"], this.p["microwave_h_align"], "ميكروويف");
            cursor = mz1;
        }
        if (frame && mz1 < zone.z1)
            this.buildSingleShelfAt(e, mz1, "رف أعلى الميكروويف", "above");
        if (zone.z1 > cursor) {
            this.buildFrontZone(e, zone.x0, zone.x1, cursor, zone.z1, this.p["door_type"], "أعلى الميكروويف - ");
            this.buildShelvesInRange(e, cursor, zone.z1, this.aboveZoneShelfCount());
        }
        this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
    }
}
export class FridgeHousingBuilder extends CarcassBuilder {
    buildFrontContent(e) {
        const z = this.activeZone();
        this.buildFrontZone(e, z.x0, z.x1, z.z0, z.z1, this.p["door_type"]);
        this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        this.buildFridgeFlankingPanels(e);
    }
    width() {
        return this.once("fridge_width", () => pcm(this.p["fridge_cavity_width"]));
    }
    toeKick() {
        return false;
    }
    z0Carcass() {
        return this.once("fridge_z0", () => rmin(pcm(this.p["fridge_cavity_height"]), this.height() - this.panelT()));
    }
    buildCountertop(_e) { }
    buildFridgeFlankingPanels(e) {
        const pt = this.panelT();
        if (truthy(this.p["fridge_include_left_side"])) {
            const l = createBox(this.ctx, e, "جنب شمال - تجويف ثلاجة", -pt, 0, 0, 0, this.depth(), this.height(), this.fridgeSideMaterial());
            assignLayer(this.ctx, l, TAGS.carcass);
            if (this.edgeBandingEnabled())
                this.bandSideAllEdges(l);
            this.recordFridgeSideLabel("جنب شمال - تجويف ثلاجة");
        }
        if (truthy(this.p["fridge_include_right_side"])) {
            const r = createBox(this.ctx, e, "جنب يمين - تجويف ثلاجة", this.width(), 0, 0, this.width() + pt, this.depth(), this.height(), this.fridgeSideMaterial());
            assignLayer(this.ctx, r, TAGS.carcass);
            if (this.edgeBandingEnabled())
                this.bandSideAllEdges(r);
            this.recordFridgeSideLabel("جنب يمين - تجويف ثلاجة");
        }
    }
    recordFridgeSideLabel(name) {
        const b = this.edgeBandingEnabled();
        this.ctx.labels.add(this.unitId, this.unitGroupName(), name, this.depth(), this.height(), this.panelT(), {
            banded: { top: b, bottom: b, left: b, right: b }, material: materialLabelName(this.fridgeSideMaterial()),
        });
    }
    fridgeSideMaterial() {
        return this.once("fridge_side_material", () => {
            const name = strip(toS(this.p["fridge_side_material_name"]));
            return name === "" ? this.carcassMaterial() : getOrCreateNamedMaterial(this.ctx, name, COLORS.carcass);
        });
    }
}
export class WashingMachineHousingBuilder extends CarcassBuilder {
    /** v186: no general shelves through the appliance cavity (zones build their own) */
    buildShelves(_e) { }
    buildFrontContent(e) {
        const zone = this.activeZone();
        const frame = this.frameShelvesEnabled();
        const wmH = pcm(this.p["washer_cavity_height"]);
        const wz0 = zone.z0;
        const wz1 = rmin(wz0 + wmH, zone.z1);
        let cursor = wz0;
        if (wz1 > wz0) {
            this.buildCavityWithFillers(e, zone, wz0, wz1, this.p["washer_cavity_width"], this.p["washer_h_align"], "غسالة");
            cursor = wz1;
        }
        if (frame && wz1 < zone.z1)
            this.buildSingleShelfAt(e, wz1, "رف أعلى الغسالة", "above");
        if (zone.z1 > cursor) {
            this.buildFrontZone(e, zone.x0, zone.x1, cursor, zone.z1, this.p["door_type"], "أعلى الغسالة - ");
            this.buildShelvesInRange(e, cursor, zone.z1, this.aboveZoneShelfCount());
        }
        this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
    }
}
export class OpenShelfBuilder extends CarcassBuilder {
    buildFrontContent(e) {
        this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
    }
}
export class DividedUnitBuilder extends CarcassBuilder {
    buildFrontContent(e) {
        const zone = this.activeZone();
        const pct = rmin(rmax(toF(this.p["divider_position_pct"]), 1.0), 99.0) / 100.0;
        const dx = zone.x0 + (zone.x1 - zone.x0) * pct;
        const half = this.panelT() / 2.0;
        const io = this.innerOpening();
        const extra = this.topValance() ? this.valanceH() : 0;
        const d = createBox(this.ctx, e, "فاصل رأسي", dx - half, 0, io.z0, dx + half, this.depth(), io.z1 + extra, COLORS.carcass);
        assignLayer(this.ctx, d, TAGS.carcass);
        const dh = io.z1 + extra - io.z0;
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "فاصل رأسي", this.depth(), dh, this.panelT(), { banded: { ...NO_BAND }, material: this.carcassMaterialName() });
        this.buildFrontZone(e, zone.x0, dx - half, zone.z0, zone.z1, this.p["left_door_type"], "يسار - ", "left");
        this.buildFrontZone(e, dx + half, zone.x1, zone.z0, zone.z1, this.p["right_door_type"], "يمين - ", "right");
        this.buildTopValancePanel(e, io.x0, io.x1);
        this.buildBottomValancePanel(e, io.x0, io.x1);
    }
    /** v189: shelves stop at the vertical divider, and the side with drawers gets none
     *  (they used to run the full width — through the divider and the drawer boxes) */
    shelfColumns(x0, x1) {
        const zone = this.activeZone();
        const pct = rmin(rmax(toF(this.p["divider_position_pct"]), 1.0), 99.0) / 100.0;
        const dx = zone.x0 + (zone.x1 - zone.x0) * pct;
        const half = this.panelT() / 2.0;
        const drawers = (v) => toS(v).includes("drawer");
        const cols = [];
        if (!drawers(this.p["left_door_type"]) && dx - half > x0)
            cols.push([x0, dx - half]);
        if (!drawers(this.p["right_door_type"]) && x1 > dx + half)
            cols.push([dx + half, x1]);
        return cols;
    }
}
export class BlindCornerUnitBuilder extends CarcassBuilder {
    width() {
        return this.once("blind_width", () => pcm(this.p["corner_total_width"]));
    }
    buildFrontContent(e) {
        const zone = this.activeZone();
        const doorW = rmin(pcm(this.p["corner_door_width"]), zone.x1 - zone.x0);
        const side = toS(this.p["corner_door_side"]) === "left" ? "left" : "right";
        const fw = this.edgeFillerEnabled() ? this.edgeFillerWidth() : 0;
        const hf = fw / 2.0;
        let bx0, bx1, dx0, dx1, hinge;
        if (side === "right") {
            [bx0, bx1] = [zone.x0, zone.x1 - doorW];
            [dx0, dx1] = [zone.x1 - doorW, zone.x1];
            hinge = "right";
        }
        else {
            [bx0, bx1] = [zone.x0 + doorW, zone.x1];
            [dx0, dx1] = [zone.x0, zone.x0 + doorW];
            hinge = "left";
        }
        if (fw > 0) {
            const j = side === "right" ? bx1 : bx0;
            const fx0 = j - hf;
            const fx1 = j + hf;
            if (side === "right") {
                bx1 = fx0;
                dx0 = fx1;
            }
            else {
                bx0 = fx1;
                dx1 = fx0;
            }
            this.buildEdgeFillerStrip(e, fx0, fx1, zone, "فيلر زاوية عمياء");
            this.ctx.labels.addDividerMark(this.unitId, this.unitGroupName(), "فيلر زاوية عمياء", (fx0 + fx1) / 2.0 - this.innerOpening().x0, "filler");
        }
        if (bx1 > bx0)
            this.buildFixedPanel(e, bx0, bx1, zone.z0, zone.z1, "لوح أعمى", this.carcassMaterial());
        if (bx1 > bx0)
            this.ctx.labels.addDividerMark(this.unitId, this.unitGroupName(), "لوح أعمى", (bx0 + bx1) / 2.0 - this.innerOpening().x0, "blind_panel");
        this.buildFrontZone(e, dx0, dx1, zone.z0, zone.z1, this.p["door_type"], "", hinge);
        this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
    }
}
/** lib/bedroom_wardrobe_builder.rb — note: its build_zone takes 4 arguments while the inherited
 *  zone loop passes 7, so the plugin raises ArgumentError for every bedroom wardrobe (kept as is). */
export class BedroomWardrobeBuilder extends WardrobeUnitBuilder {
    buildFrontContent(e) {
        if (this.slidingDoors()) {
            this.buildWardrobeZones(e);
            this.buildSlidingDoors(e);
            this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
            this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
        }
        else
            super.buildFrontContent(e);
    }
    /** v186: same signature as the parent (columns + prefix) — v185 had 4 parameters and always raised */
    buildZone(e, n, z0, z1, x0, x1, prefix = "") {
        if (!this.slidingDoors())
            return super.buildZone(e, n, z0, z1, x0, x1, prefix);
        const spec = ZONE_TYPES[toS(this.p[`wardrobe_${prefix}zone${n}_type`])] ?? ZONE_TYPES.shelves_double;
        const count = Math.min(Math.max(toI(this.p[`wardrobe_${prefix}zone${n}_count`]), 0), 20);
        const positions = this.parseCustomPositions(this.p[`wardrobe_${prefix}zone${n}_positions`]);
        if (spec.content === "drawers") {
            this.buildZoneDrawers(e, x0, x1, z0, z1, Math.max(count, 1), `منطقة ${n} - `);
            return;
        }
        if (spec.content === "shelves")
            this.buildShelvesInRange(e, z0, z1, count, x0, x1, positions);
        else if (spec.content === "rail")
            this.buildZoneRail(e, z0, z1, x0, x1, positions);
    }
    slidingDoors() {
        return toS(this.p["door_style"]) === "sliding";
    }
    /** v189: behind sliding doors the inside starts after both door tracks (+0.5 cm), so shelves and
     *  drawers never touch the doors — they used to sit in the same plane as the first door */
    slidingDepth() {
        if (this.doorPosition() === "overlay")
            return cm(0.5);
        return 2 * this.frontT() + cm(0.6) + cm(0.5);
    }
    interiorDepthStart() {
        return this.slidingDoors() ? this.slidingDepth() : super.interiorDepthStart();
    }
    zoneDrawerSetback() {
        return this.slidingDoors() ? this.slidingDepth() : 0;
    }
    slidingPanelCount() {
        return Math.min(Math.max(toI(this.p["sliding_panel_count"]), 2), 4);
    }
    slidingOverlap() {
        return cm(2.0);
    }
    unitGroupName() {
        const label = strip(toS(this.p["unit_label"]));
        return label === "" ? "دولاب غرفة نوم" : `دولاب غرفة نوم - ${label}`;
    }
    buildSlidingDoors(e) {
        const o = this.activeZone();
        const n = this.slidingPanelCount();
        const totalW = o.x1 - o.x0;
        if (totalW <= 0)
            return;
        const ov = this.slidingOverlap();
        const pw = (totalW + (n - 1) * ov) / n;
        const overlay = this.doorPosition() === "overlay";
        for (let i = 0; i < n; i++) {
            const x0 = o.x0 + i * (pw - ov);
            const x1 = rmin(x0 + pw, o.x1 + (i === n - 1 ? 0 : ov));
            // v189: every other panel runs in its own track, a full door thickness + 0.6 cm further back
            // (they used to be 0.6 apart only, so two 1.8 cm doors shared the same space)
            const track = (this.frontT() + cm(0.6)) * (i % 2);
            const fy0 = overlay ? -this.frontT() - track : track;
            const fy1 = fy0 + this.frontT();
            const name = `باب سحاب ${i + 1}`;
            const pnl = createBox(this.ctx, e, name, x0, fy0, o.z0, x1, fy1, o.z1, this.frontColor());
            assignLayer(this.ctx, pnl, TAGS.front);
            if (this.edgeBandingEnabled())
                bandAllSideEdges(this.ctx, pnl, this.edgeBandingMaterial());
            const b = this.edgeBandingEnabled();
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, x1 - x0, o.z1 - o.z0, this.frontT(), {
                banded: { top: b, bottom: b, left: b, right: b }, material: materialLabelName(this.frontColor()),
                note: "⚠ باب سحّاب — هيتركّب على سكة علوية/سفلية، مش مفصلات",
            });
        }
    }
}
