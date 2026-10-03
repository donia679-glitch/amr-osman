// Port of lib/panel_engine/design.rb — the "workbench" every template builds on:
// parts (axis boxes), label data, automatic aleta joints, lamination, hardware.
// Axes: X = width (0 = left), Y = depth (0 = front, grows backwards), Z = height.
import { fmt, inc, type Dict } from "../core/ruby.ts";
import { rround, sortByWin, minBy, sum } from "../core/rubyMath.ts";

export type Axis = "x" | "y" | "z";
export type End = "left" | "right" | "front" | "back" | "bottom" | "top";
export interface Box { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }

export interface Part {
  id: number;
  name: string;
  role: string;
  material: string;
  box: Box;
  shape: Dict;
  label: Dict | null;
  band: End[];
  band_all_sides: boolean;
  layer: string;
  mark: unknown;
  door_label: Dict | null;
  group: string | null;
  cut_piece: boolean;
  note: string | null;
  axes: [Axis, Axis] | null;
  holes: Dict[];
  grain: Axis | null;
  checks: string[];
  module: string | null;
  band_len?: number;
}

export interface PartOpts {
  label_axes?: [Axis, Axis] | null;
  band?: End[];
  groove?: Dict | null;
  layer?: string;
  door_label?: Dict | null;
  group?: string | null;
  band_all_sides?: boolean;
  cut_piece?: boolean;
  note?: string | null;
  grain?: Axis | null;
  shape?: Dict | null;
  mark?: unknown;
}

export const AXES: Axis[] = ["x", "y", "z"];
export const AXIS_ENDS: Record<Axis, [End, End]> = { x: ["left", "right"], y: ["front", "back"], z: ["bottom", "top"] };
const JOINT_ROLES = ["side", "horizontal", "fixed_shelf", "divider", "other"];

export const lo = (b: Box, a: Axis): number => (b as any)[`${a}0`];
export const hi = (b: Box, a: Axis): number => (b as any)[`${a}1`];

export class Design {
  static EPS = 0.01;
  p: Dict;
  parts: Part[] = [];
  groups: Dict[] = [];
  errors: string[] = [];
  warnings: string[] = [];
  notes: string[] = [];
  hardware: Dict = {};
  zone_marks: Dict[] = [];
  module_tag: string | null = null;
  private nextId = 0;
  private seq: Record<string, number> = {};

  constructor(params: Dict) {
    this.p = params;
  }

  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box {
    return { x0: rround(+x0, 4), y0: rround(+y0, 4), z0: rround(+z0, 4), x1: rround(+x1, 4), y1: rround(+y1, 4), z1: rround(+z1, 4) };
  }

  ext(b: Box, a: Axis): number {
    return rround(hi(b, a) - lo(b, a), 4);
  }

  thinAxisOf(b: Box): Axis {
    return minBy(AXES, (a) => this.ext(b, a))!;
  }

  private banding(): boolean {
    return !!this.p.edge_banding;
  }

  addPart(name: string, role: string, material: string, bx: Box, o: PartOpts = {}): Part {
    this.nextId++;
    const band = this.banding() ? (o.band ?? []) : [];
    let bandAll = o.band_all_sides ?? false;
    const cutPiece = o.cut_piece ?? true;
    const grain = o.grain ?? null;
    if (cutPiece && this.p.environment === "wet" && this.banding() && !["back", "drawer_bottom"].includes(role)) bandAll = true;
    let label: Dict | null = null;
    let axes: [Axis, Axis] | null = null;
    if (cutPiece) {
      axes = o.label_axes ?? this.labelAxesFor(bx, grain);
      const [wa, ha] = axes;
      const ta = AXES.find((a) => !axes!.includes(a))!;
      label = {
        w: this.ext(bx, wa), h: this.ext(bx, ha), t: this.ext(bx, ta),
        banded: {
          left: band.includes(AXIS_ENDS[wa][0]), right: band.includes(AXIS_ENDS[wa][1]),
          bottom: band.includes(AXIS_ENDS[ha][0]), top: band.includes(AXIS_ENDS[ha][1]),
        },
        groove: o.groove ?? null,
      };
    }
    const part: Part = {
      id: this.nextId, name, role, material, box: bx,
      shape: o.shape ?? { type: "box" }, label, band,
      band_all_sides: bandAll && this.banding(), layer: o.layer ?? "carcass", mark: o.mark ?? null,
      door_label: o.door_label ?? null, group: o.group ?? null, cut_piece: cutPiece, note: o.note ?? null,
      axes, holes: [], grain, checks: [], module: this.module_tag,
    };
    this.parts.push(part);
    return part;
  }

  seqName(base: string): string {
    this.seq[base] = (this.seq[base] ?? 0) + 1;
    return `${base} ${this.seq[base]}`;
  }

  grooveFor(bx: Box, axes: [Axis, Axis] | null, runAxis: Axis, at: number): Dict | null {
    if (!axes) return null;
    const [wa, ha] = axes;
    if (runAxis === ha) return { axis: "vertical", ratio: this.ratio(bx, wa, at) };
    if (runAxis === wa) return { axis: "horizontal", ratio: this.ratio(bx, ha, at) };
    return null;
  }

  labelAxesFor(bx: Box, grain: Axis | null = null): [Axis, Axis] {
    const thin = this.thinAxisOf(bx);
    const rest = AXES.filter((a) => a !== thin);
    if (grain && rest.includes(grain)) return [rest.find((a) => a !== grain)!, grain];
    // the plugin runs on Windows Ruby: equal sides come out swapped (see sortByWin)
    return sortByWin(rest, (a) => this.ext(bx, a)) as [Axis, Axis];
  }

  ratio(bx: Box, a: Axis, v: number): number {
    const e = this.ext(bx, a);
    if (!(e > 0)) return 0.5;
    const r = (v - lo(bx, a)) / e;
    return rround(r < 0 ? 0 : r > 1 ? 1 : r, 4);
  }

  attachHole(part: Part, pos: Partial<Record<Axis, number>>, d: number, kind: string | null = null): void {
    if (!part.axes) return;
    const [wa, ha] = part.axes;
    const b = part.box;
    part.holes.push({ w: this.ratio(b, wa, pos[wa]!), h: this.ratio(b, ha, pos[ha]!), d, kind });
  }

  addGroup(g: Dict): Dict {
    this.groups.push(g);
    return g;
  }

  addHoleMarker(name: string, axis: Axis, center: [number, number, number], r: number, len: number): Part {
    const [cx, cy, cz] = center;
    const half: Record<Axis, number> = { x: r, y: r, z: r };
    half[axis] = len / 2.0;
    const bx = this.box(cx - half.x, cy - half.y, cz - half.z, cx + half.x, cy + half.y, cz + half.z);
    return this.addPart(name, "hole", "__hole", bx, {
      shape: { type: `cylinder_${axis}`, cx, cy, cz, r, length: len },
      layer: "assembly", cut_piece: false,
    });
  }

  // ================================================================ joints
  buildJoints(): void {
    const a = this.p.joints;
    if (!a.enabled) return;
    const pieces = this.parts.filter((pt) => pt.cut_piece && JOINT_ROLES.includes(pt.role));
    const center = this.assemblyCenter(pieces);
    const laminated = new Set<string>();
    for (const fp of pieces) {
      const fb = fp.box;
      const k = this.thinAxisOf(fb);
      for (const ep of pieces) {
        if (ep === fp) continue;
        if (fp.module !== ep.module) continue;
        const eb = ep.box;
        const ek = this.thinAxisOf(eb);
        if (ek === k) {
          if (fp.id < ep.id) this.checkLamination(fp, ep, k, laminated);
          continue;
        }
        const line = AXES.find((x) => x !== k && x !== ek)!;
        let plane: number | null = null;
        let inward = 0;
        if (Math.abs(lo(eb, k) - hi(fb, k)) < 0.001) {
          plane = hi(fb, k);
          inward = 1.0;
        } else if (Math.abs(hi(eb, k) - lo(fb, k)) < 0.001) {
          plane = lo(fb, k);
          inward = -1.0;
        }
        if (plane === null) continue;
        const o0 = Math.max(lo(eb, ek), lo(fb, ek));
        const o1 = Math.min(hi(eb, ek), hi(fb, ek));
        if (!(o1 - o0 > this.ext(eb, ek) - 0.01)) continue;
        const l0 = Math.max(lo(eb, line), lo(fb, line));
        const l1 = Math.min(hi(eb, line), hi(fb, line));
        if (!(l1 - l0 > 0.5)) continue;
        this.drillJoint(a, fp, ep, k, ek, line, plane, inward, l0, l1, center);
      }
    }
  }

  private assemblyCenter(pieces: Part[]): Record<Axis, number> {
    if (!pieces.length) return { x: 0, y: 0, z: 0 };
    const c = {} as Record<Axis, number>;
    for (const ax of AXES) {
      const l = Math.min(...pieces.map((pt) => lo(pt.box, ax)));
      const h = Math.max(...pieces.map((pt) => hi(pt.box, ax)));
      c[ax] = (l + h) / 2.0;
    }
    return c;
  }

  private checkLamination(fp: Part, ep: Part, k: Axis, done: Set<string>): void {
    const fb = fp.box;
    const eb = ep.box;
    const touching = Math.abs(lo(eb, k) - hi(fb, k)) < 0.001 || Math.abs(hi(eb, k) - lo(fb, k)) < 0.001;
    if (!touching) return;
    const others = AXES.filter((a) => a !== k);
    const overlap = others.map((ax) => Math.max(Math.min(hi(eb, ax), hi(fb, ax)) - Math.max(lo(eb, ax), lo(fb, ax)), 0));
    if (!overlap.every((o) => o > 1.0)) return;
    const key = `${fp.id}:${ep.id}`;
    if (done.has(key)) return;
    done.add(key);
    const area = rround((overlap[0] * overlap[1]) / 10000.0, 3);
    const hk = "غراء لزق طبقات (م²)";
    this.hardware[hk] = rround((this.hardware[hk] ?? 0) + area, 3);
    fp.note = [fp.note, `لزق طبقات مع "${ep.name}"`].filter((x) => x != null).join(" | ");
    ep.note = [ep.note, `لزق طبقات مع "${fp.name}"`].filter((x) => x != null).join(" | ");
  }

  // a set = 3 holes in a row (dowel – cam bolt – dowel) = one press on the Scorpion (3 heads)
  private drillJoint(a: Dict, fp: Part, ep: Part, k: Axis, ek: Axis, line: Axis, plane: number, inward: number,
    l0: number, l1: number, center: Record<Axis, number>): void {
    const e = a.edge_distance;
    const s = a.spacing;
    const span = l1 - l0;
    const setLen = 2 * s;
    const eb = ep.box;
    const ec = (lo(eb, ek) + hi(eb, ek)) / 2.0;
    const et = this.ext(eb, ek);
    const r = a.hole_d / 2.0;
    const base = `أليتا - ${fp.name} × ${ep.name}`;

    if (span < 2 * e + setLen - 0.001) {
      const mid = (l0 + l1) / 2.0;
      this.placeDowel(a, fp, ep, k, ek, line, plane, inward, ec, mid, r, `${base} - دوبل`);
      inc(this.hardware, "دوبل (خابور)", 1);
      this.warnings.push(`الوصلة بين "${fp.name}" و"${ep.name}" قصيرة (${fmt(span)} سم) — اتحط دوبل واحد بس، ثبّتها بغراء.`);
      return;
    }

    let starts = [l0 + e, l1 - e - setLen];
    if (span > a.middle_set_over) starts.splice(1, 0, (l0 + l1) / 2.0 - s);
    const seen = new Set<number>();
    starts = starts.filter((v) => {
      const kk = rround(v, 2);
      if (seen.has(kk)) return false;
      seen.add(kk);
      return true;
    });
    if (starts.length === 2 && starts[1] < starts[0] + setLen + s - 0.001) starts.pop();

    starts.forEach((st, si) => {
      const setName = `طقم ${si + 1}`;
      [st, st + s, st + 2 * s].forEach((pos, i) => {
        this.placeDowel(a, fp, ep, k, ek, line, plane, inward, ec, pos, r, `${base} - ${setName} - ${i + 1}`);
        if (i !== 1) return;
        const camK = plane + inward * a.edge_depth;
        const dir = ec < center[ek] ? 1.0 : -1.0;
        const camC = ec + dir * (et / 2.0 - a.cam_depth / 2.0);
        const pos3 = { [k]: camK, [ek]: camC, [line]: pos } as Record<Axis, number>;
        this.addHoleMarker(`${base} - ${setName} - قفل كام`, ek, [pos3.x, pos3.y, pos3.z], a.cam_d / 2.0, a.cam_depth);
        this.attachHole(ep, { [k]: camK, [ek]: ec, [line]: pos }, a.cam_d, "cam");
      });
      inc(this.hardware, "أليتا — قفل كام", 1);
      inc(this.hardware, "أليتا — مسمار كام", 1);
      inc(this.hardware, "دوبل (خابور)", 2);
    });
  }

  private placeDowel(a: Dict, fp: Part, ep: Part, k: Axis, ek: Axis, line: Axis, plane: number, inward: number,
    ec: number, pos: number, r: number, name: string): void {
    const faceC = plane - (inward * a.face_depth) / 2.0;
    const edgeC = plane + (inward * a.edge_depth) / 2.0;
    const p1 = { [k]: faceC, [ek]: ec, [line]: pos } as Record<Axis, number>;
    const p2 = { [k]: edgeC, [ek]: ec, [line]: pos } as Record<Axis, number>;
    this.addHoleMarker(`${name} (وش)`, k, [p1.x, p1.y, p1.z], r, a.face_depth);
    this.addHoleMarker(`${name} (حرف)`, k, [p2.x, p2.y, p2.z], r, a.edge_depth);
    this.attachHole(fp, { [k]: plane, [ek]: ec, [line]: pos }, a.hole_d);
    this.attachHole(ep, { [k]: plane, [ek]: ec, [line]: pos }, a.hole_d);
  }

  // ================================================================ LED
  addLed(name: string, bx: Box): Part {
    return this.addPart(name, "led", "led", bx, { layer: "shelf", cut_piece: false });
  }

  finishLed(): void {
    const leds = this.parts.filter((pt) => pt.role === "led");
    if (!leds.length) return;
    const m = sum(leds.map((pt) => Math.max(...AXES.map((a) => this.ext(pt.box, a))))) / 100.0;
    this.hardware["شريط ليد (متر)"] = rround(m * 1.1, 1);
    this.hardware["بروفايل ليد ألومنيوم + غطا (متر)"] = rround(m * 1.1, 1);
    this.hardware["درايفر ليد"] = Math.max(Math.ceil(m / 5.0), 1);
    this.notes.push("الليد: سيب خرم سلك Ø8 عند أول كل شريط، والدرايفر في مكان يتفتح (جوه وحدة أو ورا بانوه).");
  }

  // ================================================================ merge a module
  import(sub: Design, offset: [number, number, number], prefix: string, tag: string): void {
    const [dx, dy, dz] = offset;
    const mv = (b: Box): Box => ({
      x0: rround(b.x0 + dx, 4), y0: rround(b.y0 + dy, 4), z0: rround(b.z0 + dz, 4),
      x1: rround(b.x1 + dx, 4), y1: rround(b.y1 + dy, 4), z1: rround(b.z1 + dz, 4),
    });
    const mvp = (a: number[]) => [a[0] + dx, a[1] + dy, a[2] + dz];
    const keymap: Record<string, string> = {};
    for (const g of sub.groups) {
      const ng: Dict = { ...g };
      ng.key = `${tag}_${g.key}`;
      ng.name = prefix === "" ? g.name : `${prefix} - ${g.name}`;
      if (g.box) ng.box = mv(g.box);
      if (g.hinge) ng.hinge = { ...g.hinge, point: mvp(g.hinge.point), free: mvp(g.hinge.free) };
      keymap[g.key] = ng.key;
      this.groups.push(ng);
    }
    for (const pt of sub.parts) {
      this.nextId++;
      const np: Part = { ...pt };
      np.id = this.nextId;
      np.box = mv(pt.box);
      np.name = prefix === "" ? pt.name : `${prefix} - ${pt.name}`;
      if (pt.group) np.group = keymap[pt.group] ?? null;
      np.module = tag;
      this.parts.push(np);
    }
    for (const [k, v] of Object.entries(sub.hardware)) this.hardware[k] = rround((this.hardware[k] ?? 0) + v, 2);
    this.notes.push(...sub.notes);
    this.warnings.push(...sub.warnings.map((w) => (prefix === "" ? w : `${prefix}: ${w}`)));
    this.errors.push(...sub.errors.map((e) => (prefix === "" ? e : `${prefix}: ${e}`)));
  }

  // ================================================================ summary
  cutParts(): Part[] {
    return this.parts.filter((pt) => pt.cut_piece);
  }

  bandingMeters(): number {
    let total = 0.0;
    for (const pt of this.cutParts()) {
      const lb = pt.label;
      if (!lb) continue;
      if (pt.band_len != null) total += pt.band_len;
      else if (pt.band_all_sides) total += 2 * (lb.w + lb.h);
      else {
        const b = lb.banded;
        if (b.left) total += lb.h;
        if (b.right) total += lb.h;
        if (b.bottom) total += lb.w;
        if (b.top) total += lb.w;
      }
    }
    return rround(total / 100.0, 2);
  }
}
