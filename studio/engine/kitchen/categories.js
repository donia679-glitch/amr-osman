// Port of the rectangular unit categories in lib/builders_categories.rb (+ bedroom_wardrobe_builder.rb):
// Standard, Wardrobe, Oven, Microwave, Fridge, Washing machine, Open shelf, Divided, Blind corner,
// Bedroom wardrobe.
import { COLORS } from "./config.js";
import { assignLayer, bandAllSideEdges, bandEdges, createBox, createHoleMarker, createHoleMarkerY, getOrCreateNamedMaterial, NO_BAND, tagDrawerSlide } from "./helpers.js";
import { CarcassBuilder, materialLabelName, TAGS, argError } from "./carcass.js";
import { strip, toF, toI, toS, truthy } from "./rb.js";
import { cm, rmax, rmin } from "./su/geom.js";
import { rround } from "../core/rubyMath.js";
import { Entities, Material } from "./su/model.js";
import { Vector3d } from "./su/geom.js";
const pcm = (v) => cm(toF(v));
export class StandardUnitBuilder extends CarcassBuilder {
    /** v110: a unit of drawers has no loose shelves (they ran through the drawer boxes when include_shelves stayed on) */
    shelvesEnabled() {
        return toS(this.p["door_type"]) !== "drawers" && super.shelvesEnabled();
    }
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
        if (this.slidingDoors())
            this.buildSlidingDoors(e);
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
        const room = o.x1 - o.x0 - dt * (n - 1);
        const colW = room / n;
        if (colW <= 0)
            return [[o.x0, o.x1, ""]];
        // NOVERA: each column can have its own width (wardrobe_colN_width, cm inside); 0 = shares what is left equally.
        // Typed widths that don't leave ≥ 10 cm for every auto column (or don't add up when all are typed) fall back to equal columns.
        const typed = [];
        for (let i = 0; i < n; i++) {
            const v = toF(this.p[`wardrobe_col${i + 1}_width`]);
            typed.push(v > 0 ? cm(v) : null);
        }
        const autoN = typed.filter((v) => v === null).length;
        const fixed = typed.reduce((a, v) => a + (v ?? 0), 0);
        let widths = typed.map((v) => v ?? (autoN ? (room - fixed) / autoN : 0));
        const bad = autoN ? (room - fixed) / autoN < cm(10.0) : Math.abs(fixed - room) > cm(0.5);
        if (fixed > 0 && bad) {
            this.ctx.puts(`[KitchenUnitDesigner] ⚠ عروض الأعمدة (${typed.map((v) => (v === null ? "تلقائي" : rround(v / cm(1.0), 1))).join(" + ")} سم) مش على قد الدولاب (جوّاه ${rround(room / cm(1.0), 1)} سم من غير القواطيع) — اتقسم بالتساوي.`);
            widths = typed.map(() => colW);
        }
        else if (!autoN && fixed > 0)
            widths = widths.map((w) => (w * room) / fixed); // within half a cm: scaled to fit exactly
        const cols = [];
        let x = o.x0;
        for (let i = 0; i < n; i++) {
            const prefix = i === 0 ? "" : `col${i + 1}_`;
            const x1 = x + widths[i];
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
            const name = columns.length > 2 ? `قاطوع رأسي بين الأعمدة ${i + 1}` : "قاطوع رأسي بين الأعمدة";
            const d = createBox(this.ctx, e, name, x1a, y0, o.z0, x2b, y1, o.z1, this.carcassMaterial());
            assignLayer(this.ctx, d, TAGS.carcass);
            if (this.edgeBandingEnabled())
                bandEdges(this.ctx, d, [new Vector3d(0, -1, 0)], this.edgeBandingMaterial());
            // v110: it was built in 3D but missing from the cut list — the front edge banded (v101), top / bottom / back join the carcass
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, y1 - y0, o.z1 - o.z0, x2b - x1a, {
                banded: { ...NO_BAND, left: this.edgeBandingEnabled() }, material: this.carcassMaterialName(),
            });
            this.ctx.labels.addDividerMark(this.unitId, this.unitGroupName(), name, (x1a + x2b) / 2.0 - o.x0);
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
        if (spec.front !== "none" && !this.slidingDoors())
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
        return this.slidingDoors() ? this.slidingDepth() : 0;
    }
    /** v190: dressing wardrobes can take sliding doors too (door_style "sliding", like the bedroom one) */
    slidingDoors() {
        return toS(this.p["door_style"]) === "sliding" || super.slidingDoors();
    }
    buildSlidingDoors(e) {
        const o = this.activeZone();
        const [z0, z1] = this.frontZClamp(o.z0, o.z1); // v110: clear of the valances
        this.buildSlidingPanels(e, o.x0, o.x1, z0, z1);
    }
    buildZoneDrawers(e, x0, x1, z0, z1, count, labelPrefix) {
        const overlay = this.doorPosition() === "overlay";
        const gap = overlay ? this.doorGapOverlay() : this.doorGapInset();
        [z0, z1] = this.frontZClamp(z0, z1); // v110: clear of the valances
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
            const fdz1 = i === count - 1 || this.golaMode() ? rmax(full - this.handleRecess(), dz0) : full;
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
        return this.once("fridge_z0", () => {
            // v110: the box over the fridge needs room for its bottom, top and at least 10 cm inside — a cavity taller than that
            // gave negative boards (the back came out −0.2 cm). Clamp it and say so.
            const want = pcm(this.p["fridge_cavity_height"]);
            const max = rmax(this.height() - 2 * this.panelT() - cm(10.0), 0);
            if (want > max) {
                this.ctx.puts(`[KitchenUnitDesigner] ⚠ تجويف الثلاجة (${rround(want / cm(1.0), 1)} سم) أعلى من اللي ارتفاع الوحدة (${rround(this.height() / cm(1.0), 1)} سم) يسمح بيه — اتظبط على ${rround(max / cm(1.0), 1)} سم عشان يفضل فوقه صندوق. زوّد ارتفاع الوحدة أو قلّل ارتفاع التجويف.`);
                return max;
            }
            return want;
        });
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
            // v98: visible edges only — the front edge, and the top when the panel is lower than 2 m (else it meets the ceiling / bridge)
            banded: { left: b, right: b, top: b, bottom: false }, material: materialLabelName(this.fridgeSideMaterial()), // v101: every edge but the one standing on the floor
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
/** NOVERA v54: a washing-machine slot in a base run — no box, just a head (solid or two rails) that joins the neighbouring
 *  units, and a side panel to carry it when the slot is at the end of the run (`washer_gap_side`: none/left/right/both).
 *  The countertop runs over it as usual; no plinth, no bottom, no back, no doors. */
export class WasherGapBuilder extends CarcassBuilder {
    gapSides() {
        const v = toS(this.p["washer_gap_side"]);
        return { left: v === "left" || v === "both", right: v === "right" || v === "both" };
    }
    toeKick() { return false; }
    shelvesEnabled() { return false; }
    verticalDividersEnabled() { return false; }
    buildBottom(_e) { }
    buildBackPanel(_e) { }
    buildFrontContent(_e) { }
    headX() {
        const pt = this.panelT(), g = this.gapSides();
        return [g.left ? pt : 0, g.right ? this.width() - pt : this.width()];
    }
    buildSides(e) {
        const pt = this.panelT(), g = this.gapSides(), d = this.depth();
        const note = "جنب يمسك الرأس — الفتحة في آخر الصف";
        if (g.left) {
            const l = createBox(this.ctx, e, "جنب شمال", 0, 0, 0, pt, d, this.height(), this.carcassMaterial());
            assignLayer(this.ctx, l, TAGS.carcass);
            this.bandSideAllEdges(l);
            this.ctx.labels.add(this.unitId, this.unitGroupName(), "جنب شمال", d, this.height(), pt, { banded: this.edgeBandingEnabled() ? { top: true, bottom: false, left: true, right: true } : { ...NO_BAND }, material: this.carcassMaterialName(), note }); // v110: the bottom edge stands on the floor (a joint)
        }
        if (g.right) {
            const r = createBox(this.ctx, e, "جنب يمين", this.width() - pt, 0, 0, this.width(), d, this.height(), this.carcassMaterial());
            assignLayer(this.ctx, r, TAGS.carcass);
            this.bandSideAllEdges(r);
            this.ctx.labels.add(this.unitId, this.unitGroupName(), "جنب يمين", d, this.height(), pt, { banded: this.edgeBandingEnabled() ? { top: true, bottom: false, left: true, right: true } : { ...NO_BAND }, material: this.carcassMaterialName(), note });
        }
    }
    headLabel(name, x0, x1, y0, y1) {
        const b = this.edgeBandingEnabled();
        this.ctx.labels.add(this.unitId, this.unitGroupName(), name, x1 - x0, y1 - y0, this.panelT(), {
            banded: { top: b, bottom: b, left: false, right: false }, material: this.carcassMaterialName(), note: "بتتثبت في أجناب الوحدات اللي جنبها (مسامير من جوه)",
        });
    }
    buildTop(e) {
        const pt = this.panelT(), [x0, x1] = this.headX(), z0 = this.height() - pt, z1 = this.height(), d = this.depth();
        if (this.topRails() && this.topRailW() > 0) {
            const by0 = rmax(d - this.topRailW(), 0);
            const bp = createBox(this.ctx, e, "شريط علوي خلفي", x0, by0, z0, x1, d, z1, this.carcassMaterial());
            assignLayer(this.ctx, bp, TAGS.carcass);
            this.bandFrontAndBack(bp);
            this.headLabel("شريط علوي خلفي", x0, x1, by0, d);
            const fy0 = rmax(this.topRailFrontInset(), 0), fy1 = rmin(fy0 + this.topRailW(), by0);
            if (fy1 > fy0) {
                const f = createBox(this.ctx, e, "شريط علوي أمامي", x0, fy0, z0, x1, fy1, z1, this.carcassMaterial());
                assignLayer(this.ctx, f, TAGS.carcass);
                this.bandFrontAndBack(f);
                this.headLabel("شريط علوي أمامي", x0, x1, fy0, fy1);
            }
        }
        else {
            const t = createBox(this.ctx, e, "رأس", x0, 0, z0, x1, d, z1, this.carcassMaterial());
            assignLayer(this.ctx, t, TAGS.carcass);
            this.bandFrontAndBack(t);
            this.headLabel("رأس", x0, x1, 0, d);
        }
    }
}
/** NOVERA v55: a freestanding cooker slot — an open gap in the base run with only a vented plinth-height base («قعدة»)
 *  for the cooker to stand on; no head, no countertop (the cooker's own top is the worktop there), a side when the slot ends the run. */
export class CookerGapBuilder extends WasherGapBuilder {
    baseH() {
        return this.once("cooker_base_h", () => rmin(rmax(pcm(this.p["cooker_base_height"]), 0), this.height() / 2.0));
    }
    buildTop(_e) { }
    buildCountertop(_e) { }
    buildFrontContent(e) {
        const bh = this.baseH();
        if (bh <= 0)
            return;
        const pt = this.panelT(), d = this.depth(), g = this.gapSides();
        const x0 = g.left ? pt : 0, x1 = g.right ? this.width() - pt : this.width();
        const mat = this.carcassMaterial(), b = this.edgeBandingEnabled();
        const banded = (o) => ({ ...NO_BAND, ...o });
        // the deck the cooker stands on — slots cut into it so the air under the cooker can move
        const top = createBox(this.ctx, e, "قعدة البوتجاز", x0, 0, bh - pt, x1, d, bh, mat);
        assignLayer(this.ctx, top, TAGS.carcass);
        if (b) bandAllSideEdges(this.ctx, top, this.edgeBandingMaterial());
        const slotNote = `تهوية: شقوق 2×12 سم كل 8 سم على عرض القعدة في النص (من ${rround((d / cm(1.0)) * 0.3, 0)} لـ ${rround((d / cm(1.0)) * 0.7, 0)} سم من قدام) — تتقص بالراوتر`;
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "قعدة البوتجاز", x1 - x0, d, pt, { banded: banded({ bottom: b, top: b }), material: this.carcassMaterialName(), note: `${slotNote} · البوتجاز بيقف عليها وبتتثبت في الوحدات اللي جنبها` });
        // vent slots drawn on the deck (markers only)
        const sw = cm(2.0), sl = cm(12.0), gap = cm(8.0), y0 = d * 0.3, y1 = d * 0.7;
        for (let x = x0 + gap; x + sw <= x1 - gap / 2; x += gap)
            for (let y = y0; y + sl <= y1 + 0.001; y += sl + cm(3.0)) {
                const m = createBox(this.ctx, e, "شق تهوية", x, y, bh - pt - cm(0.05), x + sw, y + sl, bh + cm(0.05), COLORS.assembly);
                assignLayer(this.ctx, m, TAGS.assembly);
            }
        // the base frame under the deck: front and back rails with round vent holes in the front one, side rails
        const rails = [["شريط أمامي للقعدة", x0, 0, x1, pt, true], ["شريط خلفي للقعدة", x0, d - pt, x1, d, false]];
        for (const [name, a0, b0, a1, b1, vent] of rails) {
            const r = createBox(this.ctx, e, name, a0, b0, 0, a1, b1, bh - pt, mat);
            assignLayer(this.ctx, r, TAGS.carcass);
            // v98: the front rail's edges are all hidden (deck on top, floor below, side rails / neighbours at the ends) — no banding
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, a1 - a0, bh - pt, pt, { banded: banded({}), material: this.carcassMaterialName(), note: vent ? `فتحات تهوية Ø3 سم كل 6 سم في النص (${rround((bh - pt) / cm(1.0) / 2, 1)} سم من تحت)` : "من ورا — ممكن من الفضلات" });
            if (vent) {
                const hr = cm(1.5), cz = (bh - pt) / 2.0;
                for (let x = a0 + cm(6.0); x <= a1 - cm(4.0); x += cm(6.0)) {
                    const h = createHoleMarkerY(this.ctx, e, "فتحة تهوية", x, b0 + pt / 2.0, cz, hr, pt + cm(0.2), COLORS.assembly);
                    assignLayer(this.ctx, h, TAGS.assembly);
                }
            }
        }
        for (const [name, a0, a1] of [["شريط جانبي شمال للقعدة", x0, x0 + pt], ["شريط جانبي يمين للقعدة", x1 - pt, x1]]) {
            const r = createBox(this.ctx, e, name, a0, pt, 0, a1, d - pt, bh - pt, mat);
            assignLayer(this.ctx, r, TAGS.carcass);
            this.ctx.labels.add(this.unitId, this.unitGroupName(), name, d - 2 * pt, bh - pt, pt, { banded: banded({}), material: this.carcassMaterialName(), note: "من الفضلات" });
        }
    }
}
/** NOVERA v56: a wooden pull-out («بول أوت») — one tall front, ONE full-height spine panel on one side, and shallow lipped trays
 *  cantilevered off the spine (the other side is open). A pair of drawer runners at the top tray and at the bottom tray:
 *  one runner on the spine's outer face, the other on the tray's outer wall — no metal cargo mechanism. Base or tall units, 15–45 cm wide. */
export class PulloutBuilder extends CarcassBuilder {
    buildShelves(_e) { }
    buildFrontContent(e) {
        const zone = this.activeZone();
        const overlay = this.doorPosition() === "overlay";
        const gap = overlay ? this.doorGapOverlay() : this.doorGapInset();
        const fy0 = overlay ? -this.frontT() : 0, fy1 = overlay ? 0 : this.frontT();
        // the front: full zone height, its top lowered by the built-in handle recess (like every other base-unit front)
        const [vz0, vz1] = this.frontZClamp(zone.z0, zone.z1); // v110: clear of the valances
        const x0 = zone.x0 + gap, x1 = zone.x1 - gap, z0 = vz0 + gap, z1 = rmax(vz1 - gap - this.handleRecess(), z0);
        if (x1 <= x0 || z1 <= z0)
            return;
        const label = "بول أوت";
        const group = e.addGroup();
        group.name = label;
        const sub = group.entities;
        const f = createBox(this.ctx, sub, label, x0, fy0, z0, x1, fy1, z1, this.frontColor());
        assignLayer(this.ctx, f, TAGS.front);
        if (this.edgeBandingEnabled())
            bandAllSideEdges(this.ctx, f, this.edgeBandingMaterial());
        this.recordDoorLabel(label, x0, x1, z0, z1, null);
        const t = this.drawerBoxT(), clr = this.drawerBoxSideClearance(), eb = this.edgeBandingEnabled();
        const mat = this.carcassMaterial(), matName = this.carcassMaterialName();
        const warn = (m) => this.ctx.puts(`[KitchenUnitDesigner] ⚠ بول أوت: ${m}`);
        // v110: never deeper than the space in front of the back (it was forced to ≥ 20 cm even in a shallow unit)
        const depth = rmax(this.depth() - this.backT() - this.backRearOffset() - fy1 - cm(1.0), 0);
        const y0 = fy1, y1 = fy1 + depth;
        // v110: the spine / first tray stand ABOVE the carcass bottom (an overlay front starts below its top)
        const io0 = this.innerOpening();
        const bz0 = rmax(zone.z0, io0.z0) + cm(0.5), bz1 = z1 - cm(1.5);
        if (depth < cm(15.0) || bz1 - bz0 < cm(10.0)) {
            warn(`المكان جوه الوحدة صغير على البول أوت (عمق ${rround(depth / cm(1.0), 1)} سم، ارتفاع ${rround(rmax(bz1 - bz0, 0) / cm(1.0), 1)} سم) — اتعمل الوش بس. زوّد عمق / ارتفاع الوحدة.`);
            tagDrawerSlide(group, rmin(rmax(depth, cm(5.0)) * 0.9, this.drawerSlideBase() + cm(30.0)));
            this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
            this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
            return;
        }
        const spineRight = toS(this.p["pullout_spine_side"]) === "right";
        // the spine: one full-height panel on the runner side, screwed to the back of the front
        const io = this.innerOpening(), ox0 = rmax(x0, io.x0), ox1 = rmin(x1, io.x1); // v107: runners sit against the carcass sides
        const sx0 = spineRight ? ox1 - clr - t : ox0 + clr, sx1 = sx0 + t;
        const sp = createBox(this.ctx, sub, "جنب البول أوت (الضهر الرأسي)", sx0, y0, bz0, sx1, y1, bz1, mat);
        assignLayer(this.ctx, sp, TAGS.front);
        if (eb) bandAllSideEdges(this.ctx, sp, this.edgeBandingMaterial());
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "جنب البول أوت (الضهر الرأسي)", y1 - y0, bz1 - bz0, t, {
            banded: { top: eb, bottom: false, left: false, right: false }, material: matName, // v98: like a drawer box wall — the top edge
            note: "لوح رأسي واحد بارتفاع البول أوت: بيتثبت في ضهر الوش بدوبل ومسامير، والصواني بتتعلق فيه من جنب واحد، والمجرى بيتركب على وشه الخارجي",
        });
        // the trays: shallow open boxes hung off the spine (bottom + front, back and outer walls); the spine is the inner wall
        const nWant = Math.min(Math.max(toI(this.p["pullout_tray_count"]), 1), 8);
        const bt = rmin(this.drawerBoxBaseT(), t), tx0 = spineRight ? ox0 + clr : sx1, tx1 = spineRight ? sx0 : ox1 - clr;
        const lip = rmin(rmax(pcm(this.p["pullout_tray_lip"]), cm(3.0)), cm(20.0), rmax(bz1 - bz0 - bt, cm(1.0)));
        const trayH = bt + lip;
        const span = bz1 - bz0 - trayH;
        // v110: trays that do not fit (narrower than their walls, or stacked into each other) are dropped with a warning
        if (tx1 - tx0 < 2 * t + cm(3.0)) {
            warn(`العرض الداخلي (${rround(rmax(tx1 - tx0, 0) / cm(1.0), 1)} سم بعد الجنب والمجاري) ما يكفيش صواني — اتعمل الوش والجنب بس. وسّع الوحدة.`);
            tagDrawerSlide(group, rmin(depth * 0.9, this.drawerSlideBase() + cm(30.0)));
            this.buildTopValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
            this.buildBottomValancePanel(e, this.innerOpening().x0, this.innerOpening().x1);
            return;
        }
        const nFit = span > 0 ? Math.max(1, Math.floor(span / (trayH + cm(2.0))) + 1) : 1;
        const n = Math.min(nWant, nFit);
        if (n < nWant)
            warn(`${nWant} صواني مش هيدخلوا في الارتفاع — اتعملوا ${n}.`);
        const step = n > 1 ? span / (n - 1) : 0;
        for (let i = 0; i < n; i++) {
            const zt = bz0 + step * i, name = `صينية بول أوت ${i + 1}`;
            const base = createBox(this.ctx, sub, `${name} - قاعدة`, tx0, y0, zt, tx1, y1, zt + bt, this.backMaterial());
            assignLayer(this.ctx, base, TAGS.front);
            this.ctx.labels.add(this.unitId, this.unitGroupName(), `${name} - قاعدة`, tx1 - tx0, y1 - y0, bt, { banded: { ...NO_BAND }, material: materialLabelName(this.backMaterial()), note: "بتتثبت في جنب البول أوت (الضهر الرأسي) بمسامير من بره" });
            const walls = [[`${name} - حافة أمامية`, tx0, y0, tx1, y0 + t, "x"], [`${name} - حافة خلفية`, tx0, y1 - t, tx1, y1, "x"],
                [`${name} - حافة جانبية`, spineRight ? tx0 : tx1 - t, y0 + t, spineRight ? tx0 + t : tx1, y1 - t, "y"]];
            for (const [nm, a0, b0, a1, b1, ax] of walls) {
                const w = createBox(this.ctx, sub, nm, a0, b0, zt + bt, a1, b1, zt + trayH, mat);
                assignLayer(this.ctx, w, TAGS.front);
                if (eb) bandEdges(this.ctx, w, [new Vector3d(0, 0, 1)], this.edgeBandingMaterial());
                this.ctx.labels.add(this.unitId, this.unitGroupName(), nm, ax === "x" ? a1 - a0 : b1 - b0, lip, t, { banded: { top: eb, bottom: false, left: false, right: false }, material: matName, note: ax === "y" ? "الحافة الخارجية — المجرى بيتركب عليها في الصينية الأولى والأخيرة" : "حافة عشان الحاجة ما تقعش لما البول أوت يتسحب" });
            }
            if (i === 0 || i === n - 1)
                this.ctx.labels.addAssemblyMark(this.unitId, this.unitGroupName(), "drawer", `${name} (مجرى)`, zt + bt - this.z0Carcass());
        }
        tagDrawerSlide(group, rmin(depth * 0.9, this.drawerSlideBase() + cm(30.0)));
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
        // v110: the divider stops at the back panel (it ran through it), in the carcass material, its front edge banded
        const dy0 = 0; // flush with the sides' front edges (inset doors close between it and the sides)
        const dy1 = rmax(this.depth() - this.backRearOffset() - this.backT(), dy0 + this.panelT());
        const d = createBox(this.ctx, e, "فاصل رأسي", dx - half, dy0, io.z0, dx + half, dy1, io.z1 + extra, this.carcassMaterial());
        assignLayer(this.ctx, d, TAGS.carcass);
        if (this.edgeBandingEnabled())
            bandEdges(this.ctx, d, [new Vector3d(0, -1, 0)], this.edgeBandingMaterial());
        const dh = io.z1 + extra - io.z0;
        this.ctx.labels.add(this.unitId, this.unitGroupName(), "فاصل رأسي", dy1 - dy0, dh, this.panelT(), { banded: { ...NO_BAND, left: this.edgeBandingEnabled() }, material: this.carcassMaterialName() });
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
/** lib/bedroom_wardrobe_builder.rb — sliding doors now live in WardrobeUnitBuilder / CarcassBuilder (v190) */
export class BedroomWardrobeBuilder extends WardrobeUnitBuilder {
    unitGroupName() {
        const label = strip(toS(this.p["unit_label"]));
        return label === "" ? "دولاب غرفة نوم" : `دولاب غرفة نوم - ${label}`;
    }
}
