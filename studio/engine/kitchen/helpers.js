// Port of lib/label_data.rb + lib/helpers.rb (the builder-facing parts) for the kitchen engine.
import { rround } from "../core/rubyMath.js";
import { fs } from "./rb.js";
import { cm, Point3d, Transformation, Vector3d } from "./su/geom.js";
import { ComponentDefinition, ComponentInstance, Entities, Face, Group, Material, Model, entsOf } from "./su/model.js";
export const NO_BAND = { top: false, bottom: false, left: false, right: false };
export class LabelData {
    pieces = [];
    assemblyMarks = [];
    dividerMarks = [];
    addAssemblyMark(unitId, unitLabel, kind, name, zFromBase) {
        this.assemblyMarks.push({ unit_id: unitId, unit: unitLabel, kind, name, z_from_base: zFromBase / cm(1.0) });
    }
    addDividerMark(unitId, unitLabel, name, xFromLeft, kind = "divider") {
        this.dividerMarks.push({ unit_id: unitId, unit: unitLabel, kind, name, x_from_left: xFromLeft / cm(1.0) });
    }
    add(unitId, unitLabel, name, wIn, hIn, dIn, o = {}) {
        this.pieces.push({
            unit_id: unitId,
            unit: unitLabel,
            name,
            w: wIn / cm(1.0),
            h: hIn / cm(1.0),
            d: dIn / cm(1.0),
            banded: o.banded ?? { ...NO_BAND },
            groove: !!o.groove,
            groove_axis: o.groove_axis ?? null,
            groove_ratio: o.groove_ratio ?? null,
            led: !!o.led,
            led_ratio: o.led_ratio ?? null,
            hinge_ratios: o.hinge_ratios ?? [],
            hinge_side: o.hinge_side ?? null,
            assembly_holes: o.assembly_holes ?? [],
            material: o.material ?? null,
            note: o.note ?? null,
        });
    }
    last(unitId, name) {
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const p = this.pieces[i];
            if (p.unit_id === unitId && p.name === name)
                return p;
        }
        return undefined;
    }
    appendHoles(unitId, name, hole) {
        this.last(unitId, name)?.assembly_holes.push(hole);
    }
    appendNote(unitId, name, note) {
        const e = this.last(unitId, name);
        if (e)
            e.note = note;
    }
}
// ---------------------------------------------------------------------------- build context
/** Everything a build touches: the model, the label registry and the plugin's `puts` log */
export class Ctx {
    model = new Model();
    labels = new LabelData();
    log = [];
    puts(s) {
        this.log.push(...s.split("\n"));
    }
}
// ---------------------------------------------------------------------------- Helpers
export function hexToRgb(hex) {
    const h = String(hex ?? "").replace(/#/g, "");
    if (h.length !== 6)
        return [217, 199, 163];
    const p = (s) => {
        const m = /^[0-9a-fA-F]*/.exec(s)[0];
        return m ? parseInt(m, 16) : 0;
    };
    return [p(h.slice(0, 2)), p(h.slice(2, 4)), p(h.slice(4, 6))];
}
/** adjust_for_finish — integers in, Ruby Integer/Float arithmetic preserved */
export function adjustForFinish(rgb, finish) {
    const [r, g, b] = rgb;
    if (finish === "glossy")
        return [r, g, b].map((c) => Math.min(c + 25, 255));
    if (finish === "matte") {
        const gray = (r + g + b) / 3.0;
        return [r, g, b].map((c) => rround(c * 0.8 + gray * 0.2));
    }
    return [r, g, b];
}
export function newNamedDefinition(ents, name) {
    return ents.model.addDefinition(name);
}
export function placeInstance(ctx, parent, def, name, isPiece = true) {
    const inst = parent.addInstance(def, new Transformation());
    inst.name = name;
    if (isPiece)
        inst.setAttribute("KUD", "is_cut_piece", true);
    return inst;
}
function extrude(ctx, parent, name, pts, axis, dist, color, isPiece = true) {
    const def = newNamedDefinition(parent, name);
    const face = def.entities.addFace(pts);
    if (face) {
        if (face.normal()[axis] < 0)
            face.reverseBang();
        face.pushpull(dist);
        if (color)
            applyColor(ctx, def, color);
    }
    return placeInstance(ctx, parent, def, name, isPiece);
}
export function createBox(ctx, parent, name, x0, y0, z0, x1, y1, z1, color = null) {
    const pts = [new Point3d(x0, y0, z0), new Point3d(x1, y0, z0), new Point3d(x1, y1, z0), new Point3d(x0, y1, z0)];
    return extrude(ctx, parent, name, pts, "z", z1 - z0, color);
}
export function createAngledPanel(ctx, parent, name, pStart, pEnd, normal, thickness, z0, z1, color = null) {
    const n = normal.clone().normalizeBang();
    const p1 = new Point3d(pStart.x, pStart.y, z0);
    const p2 = new Point3d(pEnd.x, pEnd.y, z0);
    const p3 = p2.offset(n, thickness);
    const p4 = p1.offset(n, thickness);
    return extrude(ctx, parent, name, [p1, p2, p3, p4], "z", z1 - z0, color);
}
export function dedupePolygonPoints(points) {
    const result = [];
    for (const p of points)
        if (!(result.length && result[result.length - 1].distance(p) < 0.001))
            result.push(p);
    if (result.length > 2 && result[0].distance(result[result.length - 1]) < 0.001)
        result.pop();
    return result;
}
export function createFlatSlab(ctx, parent, name, pointsXy, z0, z1, color = null) {
    const pts = dedupePolygonPoints(pointsXy.map((p) => new Point3d(p.x, p.y, z0)));
    return extrude(ctx, parent, name, pts, "z", z1 - z0, color);
}
export function createSlabAlongX(ctx, parent, name, x0, x1, yz, color = null) {
    const pts = dedupePolygonPoints(yz.map(([y, z]) => new Point3d(x0, y, z)));
    return extrude(ctx, parent, name, pts, "x", x1 - x0, color);
}
function circle(n, f) {
    const pts = [];
    for (let i = 0; i < n; i++)
        pts.push(f((2 * Math.PI * i) / n));
    return pts;
}
export function createHoleMarker(ctx, parent, name, cx, cy, cz, radius, thickness, color = null) {
    const pts = circle(16, (a) => new Point3d(cx - thickness / 2.0, cy + radius * Math.cos(a), cz + radius * Math.sin(a)));
    return extrude(ctx, parent, name, pts, "x", thickness, color, false);
}
export function createHoleMarkerY(ctx, parent, name, cx, cy, cz, radius, thickness, color = null) {
    const pts = circle(16, (a) => new Point3d(cx + radius * Math.cos(a), cy - thickness / 2.0, cz + radius * Math.sin(a)));
    return extrude(ctx, parent, name, pts, "y", thickness, color, false);
}
export function createHoleMarkerZ(ctx, parent, name, cx, cy, cz, radius, thickness, color = null) {
    const pts = circle(16, (a) => new Point3d(cx + radius * Math.cos(a), cy + radius * Math.sin(a), cz - thickness / 2.0));
    return extrude(ctx, parent, name, pts, "z", thickness, color, false);
}
export function addColoredMarkerFace(ctx, target, points, rgb) {
    try {
        const face = entsOf(target).addFace(points);
        if (!face)
            return;
        const name = `KUD_${rgb.join("_")}`;
        const m = ctx.model.materials.get(name) ?? ctx.model.materials.add(name);
        m.color = rgb;
        face.material = m;
        face.backMaterial = m;
    }
    catch (e) {
        ctx.puts(`[KitchenUnitDesigner] Marker face warning: ${e.message}`);
    }
}
export function resolveMaterial(ctx, c) {
    if (c instanceof Material)
        return c;
    if (!c)
        return null;
    const name = `KUD_${c.join("_")}`;
    const m = ctx.model.materials.get(name) ?? ctx.model.materials.add(name);
    m.color = c;
    return m;
}
export function applyColor(ctx, def, c) {
    const m = resolveMaterial(ctx, c);
    if (!m)
        return;
    const ents = def instanceof Group ? def.entities : def.entities;
    for (const f of ents.faces()) {
        f.material = m;
        f.backMaterial = m;
    }
}
export function getOrCreateNamedMaterial(ctx, name, rgb = null) {
    const ex = ctx.model.materials.get(name);
    if (ex)
        return ex;
    const m = ctx.model.materials.add(name);
    if (rgb)
        m.color = rgb;
    return m;
}
const rr3 = (v) => fs(rround(v, 3));
export function tagBandedDirection(piece, dir) {
    const existing = String(piece.getAttribute("KUD", "banded_dirs", "") ?? "");
    const entry = `${rr3(dir.x)},${rr3(dir.y)},${rr3(dir.z)}`;
    if (!existing.split(";").includes(entry))
        piece.setAttribute("KUD", "banded_dirs", existing === "" ? entry : `${existing};${entry}`);
}
export function bandEdge(ctx, piece, direction, material) {
    if (!piece || !material)
        return;
    const dir = direction.clone().normalizeBang();
    const cands = entsOf(piece)
        .faces()
        .filter((f) => f.normal().dot(dir) > 0.9);
    if (!cands.length)
        return;
    let target = cands[0];
    let best = target.area();
    for (const f of cands.slice(1)) {
        const a = f.area();
        if (a > best) {
            best = a;
            target = f;
        }
    }
    target.material = material;
    target.backMaterial = material;
    tagBandedDirection(piece, dir);
}
export function bandEdges(ctx, piece, dirs, material) {
    for (const d of dirs)
        bandEdge(ctx, piece, d, material);
}
export function bandAllSideEdges(ctx, piece, material, skipAxis = "y") {
    if (!piece || !material)
        return;
    for (const face of entsOf(piece).faces()) {
        const n = face.normal();
        const skip = skipAxis === "x" ? Math.abs(n.x) : Math.abs(n.y);
        if (skip > 0.9)
            continue;
        face.material = material;
        face.backMaterial = material;
        tagBandedDirection(piece, n);
    }
}
export function assignLayer(ctx, e, name) {
    if (!e)
        return;
    e.layer = ctx.model.layers.get(name) ?? ctx.model.layers.add(name);
}
export function tagDoorHinge3d(door, hinge, axis, free, normal) {
    door.setAttribute("KUD", "is_door", true);
    door.setAttribute("KUD", "hinge_x", hinge.x);
    door.setAttribute("KUD", "hinge_y", hinge.y);
    door.setAttribute("KUD", "hinge_z", hinge.z);
    door.setAttribute("KUD", "axis_x", axis.x);
    door.setAttribute("KUD", "axis_y", axis.y);
    door.setAttribute("KUD", "axis_z", axis.z);
    door.setAttribute("KUD", "free_x", free.x);
    door.setAttribute("KUD", "free_y", free.y);
    door.setAttribute("KUD", "free_z", free.z);
    door.setAttribute("KUD", "normal_x", normal.x);
    door.setAttribute("KUD", "normal_y", normal.y);
    door.setAttribute("KUD", "normal_z", normal.z);
    door.setAttribute("KUD", "open", false);
}
export function tagDoorHinge(door, hx, hy, fx, fy, nx, ny) {
    tagDoorHinge3d(door, new Point3d(hx, hy, 0), new Vector3d(0, 0, 1), new Point3d(fx, fy, 0), new Vector3d(nx, ny, 0));
}
export function tagDrawerSlide(g, openDistance) {
    g.setAttribute("KUD", "is_drawer", true);
    g.setAttribute("KUD", "slide_distance", openDistance);
    g.setAttribute("KUD", "open", false);
}
/** Helpers.local_dimensions_cm */
export function localDimensionsCm(e) {
    const b = e.bounds();
    const inv = e.transformation.inverse();
    const cs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => inv.applyPoint(b.corner(i)));
    const span = (k) => Math.max(...cs.map((p) => p[k])) - Math.min(...cs.map((p) => p[k]));
    return { width: span("x") / cm(1.0), depth: span("y") / cm(1.0), height: span("z") / cm(1.0) };
}
