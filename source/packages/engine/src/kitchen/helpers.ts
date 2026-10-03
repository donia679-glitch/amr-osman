// Port of lib/label_data.rb + lib/helpers.rb (the builder-facing parts) for the kitchen engine.
import { rround } from "../core/rubyMath.ts";
import { fs } from "./rb.ts";
import { cm, Point3d, Transformation, Vector3d } from "./su/geom.ts";
import { ComponentDefinition, ComponentInstance, Entities, Face, Group, Material, Model, entsOf, type Inst, type RGB } from "./su/model.ts";

/** a piece colour: a plain RGB (→ material "KUD_r_g_b") or a real named material */
export type ColorOrMat = RGB | Material;

// ---------------------------------------------------------------------------- LabelData
export interface Banded {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}
export interface Hole {
  y_ratio: number;
  z_ratio: number;
  d: number;
}
export interface Piece {
  unit_id: number;
  unit: string;
  name: string;
  w: number;
  h: number;
  d: number;
  banded: Banded;
  groove: boolean;
  groove_axis: string | null;
  groove_ratio: number | null;
  led: boolean;
  led_ratio: number | null;
  hinge_ratios: number[];
  hinge_side: string | null;
  assembly_holes: Hole[];
  material: string | null;
  note: string | null;
}
export interface PieceOpts {
  banded?: Banded;
  groove?: boolean;
  groove_axis?: string | null;
  groove_ratio?: number | null;
  led?: boolean;
  led_ratio?: number | null;
  hinge_ratios?: number[];
  hinge_side?: string | null;
  assembly_holes?: Hole[];
  material?: string | null;
  note?: string | null;
}
export const NO_BAND: Banded = { top: false, bottom: false, left: false, right: false };

export class LabelData {
  pieces: Piece[] = [];
  assemblyMarks: { unit_id: number; unit: string; kind: string; name: string; z_from_base: number }[] = [];
  dividerMarks: { unit_id: number; unit: string; kind: string; name: string; x_from_left: number }[] = [];

  addAssemblyMark(unitId: number, unitLabel: string, kind: string, name: string, zFromBase: number): void {
    this.assemblyMarks.push({ unit_id: unitId, unit: unitLabel, kind, name, z_from_base: zFromBase / cm(1.0) });
  }

  addDividerMark(unitId: number, unitLabel: string, name: string, xFromLeft: number, kind = "divider"): void {
    this.dividerMarks.push({ unit_id: unitId, unit: unitLabel, kind, name, x_from_left: xFromLeft / cm(1.0) });
  }

  add(unitId: number, unitLabel: string, name: string, wIn: number, hIn: number, dIn: number, o: PieceOpts = {}): void {
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

  private last(unitId: number, name: string): Piece | undefined {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (p.unit_id === unitId && p.name === name) return p;
    }
    return undefined;
  }

  appendHoles(unitId: number, name: string, hole: Hole): void {
    this.last(unitId, name)?.assembly_holes.push(hole);
  }

  appendNote(unitId: number, name: string, note: string): void {
    const e = this.last(unitId, name);
    if (e) e.note = note;
  }
}

// ---------------------------------------------------------------------------- build context
/** Everything a build touches: the model, the label registry and the plugin's `puts` log */
export class Ctx {
  model = new Model();
  labels = new LabelData();
  log: string[] = [];
  puts(s: string): void {
    this.log.push(...s.split("\n"));
  }
}

// ---------------------------------------------------------------------------- Helpers
export function hexToRgb(hex: unknown): RGB {
  const h = String(hex ?? "").replace(/#/g, "");
  if (h.length !== 6) return [217, 199, 163];
  const p = (s: string) => {
    const m = /^[0-9a-fA-F]*/.exec(s)![0];
    return m ? parseInt(m, 16) : 0;
  };
  return [p(h.slice(0, 2)), p(h.slice(2, 4)), p(h.slice(4, 6))];
}

/** adjust_for_finish — integers in, Ruby Integer/Float arithmetic preserved */
export function adjustForFinish(rgb: RGB, finish: string): RGB {
  const [r, g, b] = rgb;
  if (finish === "glossy") return [r, g, b].map((c) => Math.min(c + 25, 255)) as RGB;
  if (finish === "matte") {
    const gray = (r + g + b) / 3.0;
    return [r, g, b].map((c) => rround(c * 0.8 + gray * 0.2)) as RGB;
  }
  return [r, g, b];
}

export function newNamedDefinition(ents: Entities, name: string): ComponentDefinition {
  return ents.model.addDefinition(name);
}

export function placeInstance(ctx: Ctx, parent: Entities, def: ComponentDefinition, name: string, isPiece = true): ComponentInstance {
  const inst = parent.addInstance(def, new Transformation());
  inst.name = name;
  if (isPiece) inst.setAttribute("KUD", "is_cut_piece", true);
  return inst;
}

function extrude(ctx: Ctx, parent: Entities, name: string, pts: Point3d[], axis: "x" | "y" | "z", dist: number, color: ColorOrMat | null, isPiece = true): ComponentInstance {
  const def = newNamedDefinition(parent, name);
  const face = def.entities.addFace(pts);
  if (face) {
    if (face.normal()[axis] < 0) face.reverseBang();
    face.pushpull(dist);
    if (color) applyColor(ctx, def, color);
  }
  return placeInstance(ctx, parent, def, name, isPiece);
}

export function createBox(ctx: Ctx, parent: Entities, name: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: ColorOrMat | null = null): ComponentInstance {
  const pts = [new Point3d(x0, y0, z0), new Point3d(x1, y0, z0), new Point3d(x1, y1, z0), new Point3d(x0, y1, z0)];
  return extrude(ctx, parent, name, pts, "z", z1 - z0, color);
}

export function createAngledPanel(ctx: Ctx, parent: Entities, name: string, pStart: Point3d, pEnd: Point3d, normal: Vector3d, thickness: number, z0: number, z1: number, color: ColorOrMat | null = null): ComponentInstance {
  const n = normal.clone().normalizeBang();
  const p1 = new Point3d(pStart.x, pStart.y, z0);
  const p2 = new Point3d(pEnd.x, pEnd.y, z0);
  const p3 = p2.offset(n, thickness);
  const p4 = p1.offset(n, thickness);
  return extrude(ctx, parent, name, [p1, p2, p3, p4], "z", z1 - z0, color);
}

export function dedupePolygonPoints(points: Point3d[]): Point3d[] {
  const result: Point3d[] = [];
  for (const p of points) if (!(result.length && result[result.length - 1].distance(p) < 0.001)) result.push(p);
  if (result.length > 2 && result[0].distance(result[result.length - 1]) < 0.001) result.pop();
  return result;
}

export function createFlatSlab(ctx: Ctx, parent: Entities, name: string, pointsXy: Point3d[], z0: number, z1: number, color: ColorOrMat | null = null): ComponentInstance {
  const pts = dedupePolygonPoints(pointsXy.map((p) => new Point3d(p.x, p.y, z0)));
  return extrude(ctx, parent, name, pts, "z", z1 - z0, color);
}

export function createSlabAlongX(ctx: Ctx, parent: Entities, name: string, x0: number, x1: number, yz: [number, number][], color: ColorOrMat | null = null): ComponentInstance {
  const pts = dedupePolygonPoints(yz.map(([y, z]) => new Point3d(x0, y, z)));
  return extrude(ctx, parent, name, pts, "x", x1 - x0, color);
}

function circle(n: number, f: (ang: number) => Point3d): Point3d[] {
  const pts: Point3d[] = [];
  for (let i = 0; i < n; i++) pts.push(f((2 * Math.PI * i) / n));
  return pts;
}

export function createHoleMarker(ctx: Ctx, parent: Entities, name: string, cx: number, cy: number, cz: number, radius: number, thickness: number, color: ColorOrMat | null = null): ComponentInstance {
  const pts = circle(16, (a) => new Point3d(cx - thickness / 2.0, cy + radius * Math.cos(a), cz + radius * Math.sin(a)));
  return extrude(ctx, parent, name, pts, "x", thickness, color, false);
}

export function createHoleMarkerY(ctx: Ctx, parent: Entities, name: string, cx: number, cy: number, cz: number, radius: number, thickness: number, color: ColorOrMat | null = null): ComponentInstance {
  const pts = circle(16, (a) => new Point3d(cx + radius * Math.cos(a), cy - thickness / 2.0, cz + radius * Math.sin(a)));
  return extrude(ctx, parent, name, pts, "y", thickness, color, false);
}

export function createHoleMarkerZ(ctx: Ctx, parent: Entities, name: string, cx: number, cy: number, cz: number, radius: number, thickness: number, color: ColorOrMat | null = null): ComponentInstance {
  const pts = circle(16, (a) => new Point3d(cx + radius * Math.cos(a), cy + radius * Math.sin(a), cz - thickness / 2.0));
  return extrude(ctx, parent, name, pts, "z", thickness, color, false);
}

export function addColoredMarkerFace(ctx: Ctx, target: Inst, points: Point3d[], rgb: RGB): void {
  try {
    const face = entsOf(target).addFace(points);
    if (!face) return;
    const name = `KUD_${rgb.join("_")}`;
    const m = ctx.model.materials.get(name) ?? ctx.model.materials.add(name);
    m.color = rgb;
    face.material = m;
    face.backMaterial = m;
  } catch (e) {
    ctx.puts(`[KitchenUnitDesigner] Marker face warning: ${(e as Error).message}`);
  }
}

export function resolveMaterial(ctx: Ctx, c: ColorOrMat | null): Material | null {
  if (c instanceof Material) return c;
  if (!c) return null;
  const name = `KUD_${c.join("_")}`;
  const m = ctx.model.materials.get(name) ?? ctx.model.materials.add(name);
  m.color = c;
  return m;
}

export function applyColor(ctx: Ctx, def: ComponentDefinition | Group, c: ColorOrMat): void {
  const m = resolveMaterial(ctx, c);
  if (!m) return;
  const ents = def instanceof Group ? def.entities : def.entities;
  for (const f of ents.faces()) {
    f.material = m;
    f.backMaterial = m;
  }
}

export function getOrCreateNamedMaterial(ctx: Ctx, name: string, rgb: RGB | null = null): Material {
  const ex = ctx.model.materials.get(name);
  if (ex) return ex;
  const m = ctx.model.materials.add(name);
  if (rgb) m.color = rgb;
  return m;
}

const rr3 = (v: number) => fs(rround(v, 3));

export function tagBandedDirection(piece: Inst, dir: Vector3d): void {
  const existing = String(piece.getAttribute("KUD", "banded_dirs", "") ?? "");
  const entry = `${rr3(dir.x)},${rr3(dir.y)},${rr3(dir.z)}`;
  if (!existing.split(";").includes(entry)) piece.setAttribute("KUD", "banded_dirs", existing === "" ? entry : `${existing};${entry}`);
}

export function bandEdge(ctx: Ctx, piece: Inst | null, direction: Vector3d, material: Material | null): void {
  if (!piece || !material) return;
  const dir = direction.clone().normalizeBang();
  const cands = entsOf(piece)
    .faces()
    .filter((f) => f.normal().dot(dir) > 0.9);
  if (!cands.length) return;
  let target: Face = cands[0];
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

export function bandEdges(ctx: Ctx, piece: Inst | null, dirs: Vector3d[], material: Material | null): void {
  for (const d of dirs) bandEdge(ctx, piece, d, material);
}

export function bandAllSideEdges(ctx: Ctx, piece: Inst | null, material: Material | null, skipAxis: "x" | "y" = "y"): void {
  if (!piece || !material) return;
  for (const face of entsOf(piece).faces()) {
    const n = face.normal();
    const skip = skipAxis === "x" ? Math.abs(n.x) : Math.abs(n.y);
    if (skip > 0.9) continue;
    face.material = material;
    face.backMaterial = material;
    tagBandedDirection(piece, n);
  }
}

export function assignLayer(ctx: Ctx, e: Inst | null, name: string): void {
  if (!e) return;
  e.layer = ctx.model.layers.get(name) ?? ctx.model.layers.add(name);
}

export function tagDoorHinge3d(door: Inst, hinge: Point3d, axis: Vector3d, free: Point3d, normal: Vector3d): void {
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

export function tagDoorHinge(door: Inst, hx: number, hy: number, fx: number, fy: number, nx: number, ny: number): void {
  tagDoorHinge3d(door, new Point3d(hx, hy, 0), new Vector3d(0, 0, 1), new Point3d(fx, fy, 0), new Vector3d(nx, ny, 0));
}

export function tagDrawerSlide(g: Inst, openDistance: number): void {
  g.setAttribute("KUD", "is_drawer", true);
  g.setAttribute("KUD", "slide_distance", openDistance);
  g.setAttribute("KUD", "open", false);
}

/** Helpers.local_dimensions_cm */
export function localDimensionsCm(e: Inst): { width: number; depth: number; height: number } {
  const b = e.bounds();
  const inv = e.transformation.inverse();
  const cs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => inv.applyPoint(b.corner(i)));
  const span = (k: "x" | "y" | "z") => Math.max(...cs.map((p) => p[k])) - Math.min(...cs.map((p) => p[k]));
  return { width: span("x") / cm(1.0), depth: span("y") / cm(1.0), height: span("z") / cm(1.0) };
}
