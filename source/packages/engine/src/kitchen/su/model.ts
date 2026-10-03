// Minimal Sketchup::* object model + geometry kernel for the kitchen builders.
// Port of parity/ruby/sketchup_fake/{model,fake_geom}.rb — the Ruby fake runs the plugin's own
// builders and matches real SketchUp 2025 on all 529 recorded cases; this file must behave
// exactly like that fake (same face order, normals, signed zeros, vertex snapping).
import { sum } from "../../core/rubyMath.ts";
import { BoundingBox, Point3d, TOL, Transformation, Vector3d } from "./geom.ts";

export type AttrValue = unknown;
export type RGB = [number, number, number];

let nextId = 1;
export function resetIds(): void {
  nextId = 1;
}

export class AttributeDictionary {
  h = new Map<string, AttrValue>();
  get(k: string): AttrValue {
    return this.h.get(k);
  }
  set(k: string, v: AttrValue): void {
    this.h.set(k, v);
  }
}

export class Entity {
  entityID = nextId++;
  dicts = new Map<string, AttributeDictionary>();
  parent: Entities | null = null;
  valid = true;

  attributeDictionary(name: string, create = false): AttributeDictionary | undefined {
    let d = this.dicts.get(name);
    if (!d && create) {
      d = new AttributeDictionary();
      this.dicts.set(name, d);
    }
    return d;
  }

  setAttribute(dict: string, key: string, value: AttrValue): AttrValue {
    this.attributeDictionary(dict, true)!.set(key, value);
    return value;
  }

  /** Ruby: d[key].nil? ? default : value */
  getAttribute(dict: string, key: string, dflt: AttrValue = null): AttrValue {
    const d = this.dicts.get(dict);
    if (!d) return dflt;
    const v = d.get(key);
    return v === undefined || v === null ? dflt : v;
  }
}

export class Material {
  name: string;
  color: RGB = [255, 255, 255];
  alpha = 1.0;
  constructor(name: string) {
    this.name = name;
  }
}

export class Materials {
  list: Material[] = [];
  get(name: string): Material | undefined {
    return this.list.find((m) => m.name === name);
  }
  add(name: string): Material {
    let n = name;
    if (this.get(n)) {
      let i = 1;
      while (this.get(`${n}${i}`)) i++;
      n = `${n}${i}`;
    }
    const m = new Material(n);
    this.list.push(m);
    return m;
  }
}

export class Layer {
  name: string;
  visible = true;
  constructor(name: string) {
    this.name = name;
  }
}

export class Layers {
  list: Layer[] = [new Layer("Layer0")];
  get(name: string): Layer | undefined {
    return this.list.find((l) => l.name === name);
  }
  add(name: string): Layer {
    const l = this.get(name);
    if (l) return l;
    const n = new Layer(name);
    this.list.push(n);
    return n;
  }
}

export class Model {
  materials = new Materials();
  layers = new Layers();
  definitions: ComponentDefinition[] = [];
  entities: Entities;
  defaults = new Map<string, string>();

  constructor() {
    this.entities = new Entities(this);
  }

  addDefinition(name: string): ComponentDefinition {
    let n = name;
    if (this.definitions.some((d) => d.name === n)) {
      let i = 1;
      while (this.definitions.some((d) => d.name === `${n}#${i}`)) i++;
      n = `${n}#${i}`;
    }
    const d = new ComponentDefinition(this, n);
    this.definitions.push(d);
    return d;
  }
}

export class Drawingelement extends Entity {
  material: Material | null = null;
  layer: Layer;
  visible = true;
  constructor(model: Model) {
    super();
    this.layer = model.layers.get("Layer0")!;
  }
}

// ---------------------------------------------------------------------------- geometry
export class Vertex extends Entity {
  position: Point3d;
  constructor(p: Point3d) {
    super();
    this.position = p;
  }
}

export interface Loop {
  outer: boolean;
  vertices: Vertex[];
}

export class Face extends Drawingelement {
  outerVs: Vertex[];
  innerVss: Vertex[][];
  normalV: Vector3d;
  backMaterial: Material | null = null;
  rawPts: Point3d[] | null = null;

  constructor(model: Model, outerVs: Vertex[], normal: Vector3d, innerVss: Vertex[][] = []) {
    super(model);
    this.outerVs = outerVs;
    this.innerVss = innerVss;
    this.normalV = normal;
  }

  normal(): Vector3d {
    return this.normalV.clone();
  }

  loops(): Loop[] {
    return [{ outer: true, vertices: this.outerVs }, ...this.innerVss.map((vs) => ({ outer: false, vertices: vs }))];
  }

  vertices(): Vertex[] {
    const out: Vertex[] = [];
    for (const v of [...this.outerVs, ...this.innerVss.flat()]) if (!out.includes(v)) out.push(v);
    return out;
  }

  area(): number {
    let a = polyArea(this.outerVs.map((v) => v.position));
    for (const vs of this.innerVss) a -= polyArea(vs.map((v) => v.position));
    return a;
  }

  reverseBang(): this {
    this.normalV = this.normalV.reverse();
    this.outerVs = reverseLoop(this.outerVs);
    this.innerVss = this.innerVss.map((vs) => reverseLoop(vs));
    return this;
  }

  pushpull(dist: number): void {
    pushpull(this.parent!, this, dist);
  }
}

export type Inst = Group | ComponentInstance;
export type Ent = Face | Inst;

export class Entities {
  model: Model;
  list: Ent[] = [];
  verts: Vertex[] = [];

  constructor(model: Model) {
    this.model = model;
  }

  add<T extends Ent>(e: T): T {
    e.parent = this;
    this.list.push(e);
    return e;
  }

  insertAt<T extends Ent>(i: number, e: T): T {
    e.parent = this;
    this.list.splice(i, 0, e);
    return e;
  }

  remove(e: Ent): void {
    const i = this.list.indexOf(e);
    if (i >= 0) this.list.splice(i, 1);
  }

  vertex(pt: Point3d): Vertex {
    for (const v of this.verts) if (v.position.distance(pt) < TOL) return v;
    const v = new Vertex(new Point3d(pt.x, pt.y, pt.z));
    this.verts.push(v);
    return v;
  }

  faces(): Face[] {
    return this.list.filter((e): e is Face => e instanceof Face);
  }

  insts(): Inst[] {
    return this.list.filter((e): e is Inst => e instanceof Group || e instanceof ComponentInstance);
  }

  addGroup(): Group {
    return this.add(new Group(this.model));
  }

  addInstance(def: ComponentDefinition, tr: Transformation): ComponentInstance {
    return this.add(new ComponentInstance(this.model, def, tr));
  }

  /** Entities#add_face — raises like SketchUp on bad input */
  addFace(pts: Point3d[]): Face {
    if (dupPoints(pts)) throw new RubyError("ArgumentError", "Duplicate points in array");
    if (!planar(pts)) throw new RubyError("ArgumentError", "Points are not planar");
    if (pts.length < 3) throw new RubyError("ArgumentError", "Not enough points");
    return addFaceImpl(this, pts);
  }

  /** Entities#transform_entities for faces: moves their (shared) vertices */
  transformEntities(tr: Transformation, ents: Ent[]): void {
    const vs: Vertex[] = [];
    for (const e of ents) if (e instanceof Face) for (const v of e.vertices()) if (!vs.includes(v)) vs.push(v);
    for (const v of vs) v.position = tr.applyPoint(v.position);
    for (const e of ents) if (!(e instanceof Face)) e.transformation = tr.mul(e.transformation);
  }

  /** ComponentDefinition#bounds (local) */
  bounds(): BoundingBox {
    const bb = new BoundingBox();
    for (const e of this.list) {
      if (e instanceof Face) for (const v of e.vertices()) bb.add(v.position);
      else bb.add(e.bounds());
    }
    return bb;
  }
}

export class ComponentDefinition extends Entity {
  name: string;
  entities: Entities;
  constructor(model: Model, name: string) {
    super();
    this.name = name;
    this.entities = new Entities(model);
  }
  bounds(): BoundingBox {
    return this.entities.bounds();
  }
}

export class ComponentInstance extends Drawingelement {
  name = "";
  definition: ComponentDefinition;
  transformation: Transformation;
  constructor(model: Model, def: ComponentDefinition, tr: Transformation) {
    super(model);
    this.definition = def;
    this.transformation = new Transformation(tr);
  }
  get entities(): Entities {
    return this.definition.entities;
  }
  transformBang(t: Transformation): this {
    this.transformation = t.mul(this.transformation);
    return this;
  }
  bounds(): BoundingBox {
    return transformedBounds(this.definition.entities, this.transformation);
  }
}

export class Group extends Drawingelement {
  name = "";
  definition: ComponentDefinition;
  transformation = new Transformation();
  constructor(model: Model) {
    super(model);
    // the group's definition is not registered in the model's definition list (as in the fake)
    this.definition = new ComponentDefinition(model, "Group");
  }
  get entities(): Entities {
    return this.definition.entities;
  }
  transformBang(t: Transformation): this {
    this.transformation = t.mul(this.transformation);
    return this;
  }
  bounds(): BoundingBox {
    return transformedBounds(this.definition.entities, this.transformation);
  }
}

export function entsOf(e: Inst): Entities {
  return e.definition.entities;
}

/** A Ruby exception carried through the TS port (class + message, like `#{e.class}: #{e.message}`) */
export class RubyError extends Error {
  rubyClass: string;
  constructor(rubyClass: string, message: string) {
    super(message);
    this.rubyClass = rubyClass;
  }
}

// ---------------------------------------------------------------------------- kernel
export function newell(pts: Point3d[]): Vector3d {
  let nx = 0.0;
  let ny = 0.0;
  let nz = 0.0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    nx += (a.y - b.y) * (a.z + b.z);
    ny += (a.z - b.z) * (a.x + b.x);
    nz += (a.x - b.x) * (a.y + b.y);
  }
  return new Vector3d(nx, ny, nz);
}

export function polyArea(pts: Point3d[]): number {
  return newell(pts).length() / 2.0;
}

function dupPoints(pts: Point3d[]): boolean {
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (pts[i].distance(pts[j]) < TOL) return true;
  return false;
}

function planar(pts: Point3d[]): boolean {
  const n = newell(pts);
  if (n.length() < 1e-12) return false;
  const nn = n.normalize();
  const d = nn.dot(pts[0]);
  return pts.every((p) => Math.abs(nn.dot(p) - d) < TOL);
}

/** SketchUp's Face#reverse! keeps the first edge (reversed): [p1, p0, pn-1, ..., p2] */
export function reverseLoop<T>(vs: T[]): T[] {
  return [vs[1], vs[0], ...vs.slice(2).reverse()];
}

export function transformedBounds(entities: Entities, tr: Transformation): BoundingBox {
  const lb = entities.bounds();
  const bb = new BoundingBox();
  if (lb.empty()) return bb;
  for (let i = 0; i < 8; i++) bb.add(tr.applyPoint(lb.corner(i)));
  return bb;
}

const neg0 = (n: Vector3d) => new Vector3d(-n.x + 0.0, -n.y + 0.0, -n.z + 0.0);
const pos0 = (n: Vector3d) => new Vector3d(n.x + 0.0, n.y + 0.0, n.z + 0.0);

/** face normal from the loop; tiny round-off components snap to an exact +0.0 */
function unitNormal(pts: Point3d[]): Vector3d {
  const n = newell(pts).normalize();
  return new Vector3d(...(n.toA().map((c) => (Math.abs(c) < 1e-12 ? 0.0 : c)) as [number, number, number]));
}

function addFaceImpl(ents: Entities, ptsIn: Point3d[]): Face {
  let pts = ptsIn;
  let n = unitNormal(pts);
  // faces drawn on the ground plane face down
  if (pts.every((p) => Math.abs(p.z) < TOL) && n.z > 0) {
    pts = reverseLoop(pts);
    n = n.reverse();
  }
  const hits = ents.faces().filter((f) => coplanar(f, n, pts[0]));
  if (hits.length) return splitAdd(ents, hits, pts, n);

  const clean = despike(pts);
  const f = new Face(
    ents.model,
    clean.map((p) => ents.vertex(p)),
    n,
  );
  if (clean.length !== pts.length) f.rawPts = pts;
  return ents.add(f);
}

/** remove back-tracking vertices (a spike: prev→p and p→next collinear, opposite) */
function despike(ptsIn: Point3d[]): Point3d[] {
  let pts = ptsIn.slice();
  for (;;) {
    const sz = pts.length;
    let idx = -1;
    for (let k = 0; k < sz; k++) {
      const a = pts[(k - 1 + sz) % sz];
      const p = pts[k];
      const b = pts[(k + 1) % sz];
      const u = p.minus(a);
      const w = b.minus(p);
      if (u.cross(w).length() < 1e-9 * Math.max(u.length() * w.length(), 1e-300) && u.dot(w) < 0) {
        idx = k;
        break;
      }
    }
    if (idx < 0) break;
    pts.splice(idx, 1);
    const prev = pts;
    pts = prev.filter((p, k) => !(k > 0 && p.distance(prev[k - 1]) < TOL));
    if (pts.length > 1 && pts[0].distance(pts[pts.length - 1]) < TOL) pts.pop();
  }
  return pts;
}

type Seg = [Point3d, Point3d, boolean];

/** side segments of a base loop: every edge split at the loop's points lying on it; overlapping
 *  duplicates ("fins") kept once — from the split edge — and placed before the other sides */
function sideSegments(raw: Point3d[]): [Point3d, Point3d][] {
  const m = raw.length;
  const segs: Seg[] = [];
  for (let i = 0; i < m; i++) {
    const a = raw[i];
    const b = raw[(i + 1) % m];
    const e = b.minus(a);
    const len = e.length();
    const cuts: number[] = [];
    raw.forEach((p, k) => {
      if (k === i || k === (i + 1) % m) return;
      const t = p.minus(a).dot(e) / (len * len);
      if (!(t > 1e-9 && t < 1 - 1e-9)) return;
      const q = a.offset(e, len * t);
      if (q.distance(p) < TOL && !cuts.includes(t)) cuts.push(t);
    });
    cuts.sort((x, y) => x - y);
    const ts = [0.0, ...cuts, 1.0];
    for (let j = 0; j + 1 < ts.length; j++) {
      const t0 = ts[j];
      const t1 = ts[j + 1];
      const p0 = t0 === 0.0 ? a : a.offset(e, len * t0);
      const p1 = t1 === 1.0 ? b : a.offset(e, len * t1);
      segs.push([p0, p1, cuts.length > 0]);
    }
  }
  const same = (s: Seg, t: Seg) =>
    (s[0].distance(t[0]) < TOL && s[1].distance(t[1]) < TOL) || (s[0].distance(t[1]) < TOL && s[1].distance(t[0]) < TOL);
  const out: Seg[] = [];
  const fins: Seg[] = [];
  for (const sg of segs) {
    const dups = segs.filter((t) => same(sg, t));
    if (dups.length === 1) out.push(sg);
    else if (!fins.some((f) => same(f, sg))) fins.push(dups.find((t) => t[2]) ?? sg);
  }
  return [...fins, ...out].map(([p0, p1]) => [p0, p1]);
}

function coplanar(f: Face, n: Vector3d, p: Point3d): boolean {
  const fn = f.normalV;
  if (!(fn.cross(n).length() < 1e-9)) return false;
  return Math.abs(fn.dot(p) - fn.dot(f.outerVs[0].position)) < TOL;
}

/** A lone face extruded by dist along its normal. Entity order (as in SketchUp):
 *  [cap at the original position (outward), far cap, sides (fins first, then base-loop order)] */
function pushpull(ents: Entities, face: Face, dist: number): void {
  const faces0 = ents.faces();
  if (!(faces0.length === 1 && faces0[0] === face)) throw new Error("pushpull: only a lone face is supported");
  if (face.innerVss.length) throw new Error("pushpull: face with holes");

  const n = face.normalV;
  const v = new Vector3d(n.x * dist, n.y * dist, n.z * dist);
  const base = face.outerVs.map((x) => x.position);
  const top = base.map((p) => p.plus(v));
  const segs = sideSegments(face.rawPts ?? base);
  ents.remove(face);
  const model = ents.model;
  const mk = (pts: Point3d[], nn: Vector3d) =>
    new Face(
      model,
      pts.map((p) => ents.vertex(p)),
      nn,
    );
  const faces: Face[] = [];
  if (dist > 0) {
    faces.push(mk(reverseLoop(base), neg0(n)), mk(top, pos0(n)));
    for (const [a, b] of segs) {
      const aa = a.plus(v);
      const bb = b.plus(v);
      const nn = a.minus(aa).cross(b.minus(a));
      faces.push(mk([aa, a, b, bb], nn.normalize()));
    }
  } else {
    faces.push(mk(base, pos0(n)), mk(reverseLoop(top), neg0(n)));
    for (const [a, b] of segs) {
      const aa = a.plus(v);
      const bb = b.plus(v);
      const nn = b.minus(bb).cross(a.minus(b));
      faces.push(mk([bb, b, a, aa], nn.normalize()));
    }
  }
  for (const f of faces) ents.add(f);
}

// ---------------------------------------------------------------------------- coplanar faces
// A face added onto an existing coplanar face (the plugin's marker faces), as SketchUp does it:
// strictly inside → cuts a hole (the new face fills it); touching the boundary → merged the same
// way when both face the same way, otherwise a separate overlapping face.
function splitAdd(ents: Entities, hits: Face[], pts: Point3d[], n: Vector3d): Face {
  const host = hits.find((f) => strictlyInside(f, pts)) ?? hits.find((f) => f.normalV.dot(n) > 0 && overlaps(f, pts));
  const nf = new Face(
    ents.model,
    pts.map((p) => ents.vertex(p)),
    n,
  );
  if (host) {
    host.innerVss.push(reverseLoop(nf.outerVs));
    nf.material = host.material;
    nf.backMaterial = host.backMaterial;
  }
  return ents.add(nf);
}

type P2 = [number, number];

function planeAxes(n: Vector3d): [Vector3d, Vector3d] {
  const a = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
  const mx = Math.max(...a);
  const i = a.indexOf(mx);
  if (i === 0) return [new Vector3d(0, 1, 0), new Vector3d(0, 0, 1)];
  if (i === 1) return [new Vector3d(1, 0, 0), new Vector3d(0, 0, 1)];
  return [new Vector3d(1, 0, 0), new Vector3d(0, 1, 0)];
}

function faceLoops2(f: Face): [P2[][], (p: Point3d) => P2] {
  const [u, w] = planeAxes(f.normalV);
  const to2 = (p: Point3d): P2 => [u.dot(p), w.dot(p)];
  const loops = [f.outerVs.map((v) => to2(v.position)), ...f.innerVss.map((vs) => vs.map((v) => to2(v.position)))];
  return [loops, to2];
}

function edges2(l: P2[]): [P2, P2][] {
  return l.map((a, i) => [a, l[(i + 1) % l.length]]);
}

function pointInPoly(l: P2[], c: P2): boolean {
  let inside = false;
  for (const [a, b] of edges2(l)) {
    if (a[1] > c[1] !== b[1] > c[1]) {
      const x = a[0] + ((c[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
      if (c[0] < x) inside = !inside;
    }
  }
  return inside;
}

function insideLoops(loops: P2[][], c: P2): boolean {
  return pointInPoly(loops[0], c) && !loops.slice(1).some((h) => pointInPoly(h, c));
}

function segDist(e: [P2, P2], c: P2): number {
  const [a, b] = e;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.min(Math.max(((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / l2, 0.0), 1.0) : 0.0;
  return Math.hypot(c[0] - (a[0] + t * dx), c[1] - (a[1] + t * dy));
}

function segsIntersect(e1: [P2, P2], e2: [P2, P2]): boolean {
  const [a, b] = e1;
  const [c, d] = e2;
  const o = (p: P2, q: P2, r: P2) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function strictlyInside(f: Face, pts: Point3d[]): boolean {
  const [loops, to2] = faceLoops2(f);
  const m = pts.map(to2);
  const fedges = loops.flatMap((l) => edges2(l));
  if (!m.every((c) => insideLoops(loops, c) && !fedges.some((e) => segDist(e, c) < TOL))) return false;
  return !edges2(m).some((me) => fedges.some((e) => segsIntersect(me, e)));
}

/** M's centre inside F (enough for the plugin's rectangles that touch F's border) */
function overlaps(f: Face, pts: Point3d[]): boolean {
  const [loops, to2] = faceLoops2(f);
  const m = pts.map(to2);
  return insideLoops(loops, [sum(m.map((q) => q[0])) / m.length, sum(m.map((q) => q[1])) / m.length]);
}
