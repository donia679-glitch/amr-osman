// Port of parity/ruby/kud_kitchen_run.rb's recorder: turns a built unit into the JSON the parity
// fixtures hold (the same file runs inside real SketchUp), so TS output compares 1:1 with SketchUp.
import { rround, sum as rubySum } from "../core/rubyMath.ts";
import { scanHardware } from "./hardware.ts";
import type { Ctx } from "./helpers.ts";
import { BoundingBox, cm, type Point3d, Transformation } from "./su/geom.ts";
import { ComponentInstance, Entities, Face, Group, type Inst, Material } from "./su/model.ts";

const ATTR_SKIP = ["params_json", "label_data_json"];
const CAM_PREFIX = "ثقب تجميع (قفل كام)";

const in2cm = (v: number) => v / cm(1.0);

function r(v: number, nd = 6): number {
  const x = rround(Number(v), nd);
  return x === 0 ? 0.0 : x;
}

function deepRound(o: unknown): unknown {
  if (typeof o === "number") return r(o); // Integers are unchanged by r() too
  if (Array.isArray(o)) return o.map(deepRound);
  if (o && typeof o === "object") {
    const h: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) h[k] = deepRound(v);
    return h;
  }
  return o;
}

function kudAttrs(e: Inst, skip: string[] = []): Record<string, unknown> {
  const d = e.attributeDictionary("KUD");
  if (!d) return {};
  const keys = [...d.h.keys()].filter((k) => !skip.includes(k)).sort();
  const h: Record<string, unknown> = {};
  for (const k of keys) h[k] = deepRound(d.h.get(k));
  return h;
}

const layerName = (e: Inst) => e.layer?.name ?? "";
const matName = (m: Material | null) => (m ? m.name : "");

type V3 = [number, number, number];
function newell(pts: V3[]): V3 {
  let nx = 0.0;
  let ny = 0.0;
  let nz = 0.0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [nx, ny, nz];
}
const vlen = (v: V3) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
const vsub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vdot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function canonDir(n: V3): V3 {
  const m = Math.max(...n.map(Math.abs));
  const i = n.findIndex((c) => Math.abs(c) >= m - 1e-9);
  return n[i] < 0 ? (n.map((c) => -c) as V3) : n;
}

const worldPt = (tr: Transformation, p: Point3d): V3 => {
  const q = tr.applyPoint(p);
  return [in2cm(q.x), in2cm(q.y), in2cm(q.z)];
};

/** Ruby Array#<=> for the sort keys used below */
function cmpArr(a: unknown[], b: unknown[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    const c = typeof x === "number" && typeof y === "number" ? (x < y ? -1 : x > y ? 1 : 0) : String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0;
    if (c) return c;
  }
  return a.length - b.length;
}

/** Hash.new(0.0)-style accumulation that keeps insertion order (like Ruby) */
function addTo(m: Map<string, number>, k: string, v: number) {
  m.set(k, (m.get(k) ?? 0.0) + v);
}

interface FL {
  outer: V3[];
  all: V3[];
  n: V3;
  d: number;
  area: number;
  mat: string;
}

function analyze(faces: Face[], tr: Transformation): Record<string, unknown> {
  const fl: FL[] = faces.map((f) => {
    const loops = f.loops().map((l) => [l.outer, l.vertices.map((v) => worldPt(tr, v.position))] as [boolean, V3[]]);
    const outer = loops.find((l) => l[0])![1];
    const nv = newell(outer);
    let area = vlen(nv) / 2.0;
    for (const [o, pts] of loops) if (!o) area -= vlen(newell(pts)) / 2.0;
    const l = vlen(nv);
    const n: V3 = l > 0 ? (nv.map((c) => c / l) as V3) : [0.0, 0.0, 0.0];
    const cn = canonDir(n);
    return { outer, all: loops.flatMap((x) => x[1]), n: cn, d: vdot(cn, outer[0]), area, mat: matName(f.material) };
  });

  const verts = fl.flatMap((f) => f.all);
  const bb = [0, 1, 2].map((i) => Math.min(...verts.map((p) => p[i]))).concat([0, 1, 2].map((i) => Math.max(...verts.map((p) => p[i]))));

  const tot = new Map<string, number>();
  for (const f of fl) addTo(tot, f.mat, f.area);
  const best = Math.max(...tot.values());
  const dom = [...tot.keys()].filter((k) => tot.get(k)! >= best - 1e-6).sort()[0];

  const planes = new Map<string, { key: number[]; area: number; mats: Map<string, number> }>();
  for (const f of fl) {
    const key = [...f.n.map((c) => r(c)), r(f.d, 4)];
    const ks = JSON.stringify(key);
    let pl = planes.get(ks);
    if (!pl) {
      pl = { key, area: 0.0, mats: new Map() };
      planes.set(ks, pl);
    }
    pl.area += f.area;
    addTo(pl.mats, f.mat, f.area);
  }
  const sortedPlanes = [...planes.values()].sort((a, b) => cmpArr(a.key, b.key));
  const fm: unknown[] = [];
  for (const pl of sortedPlanes) {
    const other = [...pl.mats.entries()].filter(([m, a]) => !(m === dom || a < 1e-9));
    if (!other.length) continue;
    other.sort((a, b) => cmpArr(a, b));
    const o: Record<string, number> = {};
    for (const [m, a] of other) o[m] = r(a, 4);
    fm.push([...pl.key, o]);
  }

  const out: Record<string, unknown> = { bbox: bb.map((v) => r(v)), mat: dom };
  if (fm.length) out.fm = fm;
  const cyl = boxQ(fl, planes, bb) ? null : cylinder(fl);
  if (boxQ(fl, planes, bb)) out.kind = "box";
  else if (cyl) Object.assign(out, cyl);
  else {
    out.kind = "solid";
    out.planes = sortedPlanes.map((pl) => [...pl.key, r(pl.area, 4)]);
    const vs = verts.map((p) => p.map((c) => r(c)));
    const uniq: number[][] = [];
    const seen = new Set<string>();
    for (const v of vs) {
      const k = JSON.stringify(v);
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(v);
      }
    }
    out.verts = uniq.sort((a, b) => cmpArr(a, b));
  }
  return out;
}

function boxQ(fl: FL[], planes: Map<string, { key: number[]; area: number }>, bb: number[]): boolean {
  if (!fl.every((f) => Math.max(...f.n.map(Math.abs)) > 1 - 1e-9)) return false;
  const want = new Map<string, number>();
  for (let a = 0; a < 3; a++) {
    const n = [0.0, 0.0, 0.0];
    n[a] = 1.0;
    const o = [0, 1, 2].filter((i) => i !== a);
    const rect = (bb[o[0] + 3] - bb[o[0]]) * (bb[o[1] + 3] - bb[o[1]]);
    want.set(JSON.stringify([...n, r(bb[a], 4)]), rect);
    want.set(JSON.stringify([...n, r(bb[a + 3], 4)]), rect);
  }
  const wk = [...want.keys()].sort();
  const pk = [...planes.keys()].sort();
  if (wk.length !== pk.length || wk.some((k, i) => k !== pk[i])) return false;
  for (const [k, a] of want) if (!(Math.abs(planes.get(k)!.area - a) <= 1e-6 * Math.max(a, 1.0))) return false;
  return fl.every((f) => f.all.every((p) => [0, 1, 2].some((i) => Math.abs(p[i] - bb[i]) < 1e-6 || Math.abs(p[i] - bb[i + 3]) < 1e-6)));
}

function cylinder(fl: FL[]): Record<string, unknown> | null {
  const caps = fl.filter((f) => f.outer.length >= 12);
  if (!(caps.length === 2 && fl.length === caps[0].outer.length + 2)) return null;
  if (caps[0].outer.length !== caps[1].outer.length) return null;
  if (!fl.filter((f) => !caps.includes(f)).every((f) => f.outer.length === 4)) return null;
  const centre = (c: FL): V3 => [0, 1, 2].map((i) => rubySum(c.outer.map((p) => p[i])) / c.outer.length) as V3;
  const c0 = centre(caps[0]);
  const c1 = centre(caps[1]);
  const axis = vsub(c1, c0);
  const len = vlen(axis);
  if (len <= 0) return null;
  const u = canonDir(axis.map((x) => x / len) as V3);
  const rad = rubySum(caps[0].outer.map((p) => vlen(vsub(p, c0)))) / caps[0].outer.length;
  return {
    kind: "cyl",
    c: [0, 1, 2].map((i) => r((c0[i] + c1[i]) / 2.0)),
    axis: u.map((x) => r(x)),
    r: r(rad),
    len: r(len),
    n: caps[0].outer.length,
  };
}

const isInst = (e: unknown): e is Inst => e instanceof Group || e instanceof ComponentInstance;

function walk(ents: Entities, tr: Transformation, path: string[], out: { parts: any[]; groups: any[] }) {
  for (const e of ents.list.slice()) {
    if (!isInst(e)) continue;
    const t = tr.mul(e.transformation);
    const sub = e.definition.entities;
    const faces = sub.faces();
    const kids = sub.insts();
    const name = e.name;
    if (faces.length || !kids.length) {
      const rec: Record<string, unknown> = { path, name, layer: layerName(e), attrs: kudAttrs(e) };
      if (!e.visible) rec.hidden = true;
      if (e.material) rec.imat = matName(e.material);
      Object.assign(rec, faces.length ? analyze(faces, t) : { kind: "empty" });
      out.parts.push(rec);
    }
    if (!kids.length) continue;
    const g: Record<string, unknown> = { path, name, layer: layerName(e), attrs: kudAttrs(e) };
    if (faces.length) g.has_faces = true;
    const bb = new BoundingBox();
    collectPoints(sub, t, bb);
    if (!bb.empty()) {
      const lo = bb.min();
      const hi = bb.max();
      g.bbox = [lo.x, lo.y, lo.z, hi.x, hi.y, hi.z].map((v) => r(in2cm(v)));
    }
    out.groups.push(g);
    walk(sub, t, [...path, name], out);
  }
}

function collectPoints(ents: Entities, tr: Transformation, bb: BoundingBox) {
  for (const e of ents.list) {
    if (e instanceof Face) for (const v of e.vertices()) bb.add(tr.applyPoint(v.position));
    else collectPoints(e.definition.entities, tr.mul(e.transformation), bb);
  }
}

function labelRows(list: { unit_id: number }[], unitId: number): unknown[] {
  return list
    .filter((p) => p.unit_id === unitId)
    .map((p) => {
      const { unit_id: _u, ...rest } = p as any;
      return deepRound(rest);
    });
}

export function record(ctx: Ctx, group: Group): Record<string, unknown> {
  const out = { parts: [] as any[], groups: [] as any[] };
  walk(group.entities, group.transformation, [], out);
  const uid = group.entityID;
  const ld = ctx.labels;
  return {
    unit: { name: group.name, layer: layerName(group), attrs: kudAttrs(group, ATTR_SKIP) },
    joint_sets: out.parts.filter((p) => String(p.name).startsWith(CAM_PREFIX)).length,
    hardware: scanHardware(ctx, group),
    labels: labelRows(ld.pieces, uid),
    assembly_marks: labelRows(ld.assemblyMarks, uid),
    divider_marks: labelRows(ld.dividerMarks, uid),
    groups: out.groups,
    parts: out.parts,
  };
}
