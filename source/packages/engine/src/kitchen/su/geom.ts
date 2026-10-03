// Minimal Geom::* (SketchUp) for the kitchen builders — port of parity/ruby/sketchup_fake/geom.rb.
// Internal units are inches, exactly like SketchUp, so every number matches the plugin bit for bit.

export const TOL = 0.001; // inch — SketchUp's point tolerance

/** Numeric#cm (SketchUp): centimetres → inches */
export const cm = (v: number): number => v / 2.54;
export const degrees = (v: number): number => (v * Math.PI) / 180.0;

/** Ruby [a, b, ...].min / .max: the first extreme wins on ties (matters for -0.0) */
export function rmin(...xs: number[]): number {
  let v = xs[0];
  for (let i = 1; i < xs.length; i++) if (xs[i] < v) v = xs[i];
  return v;
}
export function rmax(...xs: number[]): number {
  let v = xs[0];
  for (let i = 1; i < xs.length; i++) if (xs[i] > v) v = xs[i];
  return v;
}

export type XYZ = readonly [number, number, number];
export type PointLike = Point3d | Vector3d | XYZ | number[];

export function coords(o: PointLike): [number, number, number] {
  if (o instanceof Point3d || o instanceof Vector3d) return [o.x, o.y, o.z];
  return [Number(o[0]), Number(o[1]), Number(o[2] ?? 0)];
}

export class Point3d {
  x: number;
  y: number;
  z: number;

  constructor(x: number | PointLike = 0, y = 0, z = 0) {
    if (typeof x === "number") {
      this.x = x;
      this.y = y;
      this.z = z;
    } else {
      [this.x, this.y, this.z] = coords(x);
    }
  }

  toA(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  clone(): Point3d {
    return new Point3d(this.x, this.y, this.z);
  }

  plus(v: PointLike): Point3d {
    const a = coords(v);
    return new Point3d(this.x + a[0], this.y + a[1], this.z + a[2]);
  }

  /** Point - Point → Vector (Point - Vector → Point, as in SketchUp) */
  minus(o: Point3d | XYZ | number[]): Vector3d {
    const a = coords(o);
    return new Vector3d(this.x - a[0], this.y - a[1], this.z - a[2]);
  }

  minusV(v: Vector3d): Point3d {
    return new Point3d(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  offset(v: PointLike, len?: number): Point3d {
    let a = coords(v);
    if (len !== undefined) {
      const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
      a = [(a[0] * len) / l, (a[1] * len) / l, (a[2] * len) / l];
    }
    return new Point3d(this.x + a[0], this.y + a[1], this.z + a[2]);
  }

  distance(o: PointLike): number {
    const a = coords(o);
    return Math.sqrt((this.x - a[0]) ** 2 + (this.y - a[1]) ** 2 + (this.z - a[2]) ** 2);
  }

  eq(o: PointLike): boolean {
    return this.distance(o) < TOL;
  }
}

export class Vector3d {
  x: number;
  y: number;
  z: number;

  constructor(x: number | PointLike = 0, y = 0, z = 0) {
    if (typeof x === "number") {
      this.x = x;
      this.y = y;
      this.z = z;
    } else {
      [this.x, this.y, this.z] = coords(x);
    }
  }

  toA(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  clone(): Vector3d {
    return new Vector3d(this.x, this.y, this.z);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vector3d {
    const l = this.length();
    return new Vector3d(this.x / l, this.y / l, this.z / l);
  }

  normalizeBang(): this {
    const l = this.length();
    this.x /= l;
    this.y /= l;
    this.z /= l;
    return this;
  }

  reverse(): Vector3d {
    return new Vector3d(-this.x, -this.y, -this.z);
  }

  dot(o: PointLike): number {
    const a = coords(o);
    return this.x * a[0] + this.y * a[1] + this.z * a[2];
  }

  cross(o: PointLike): Vector3d {
    const a = coords(o);
    return new Vector3d(this.y * a[2] - this.z * a[1], this.z * a[0] - this.x * a[2], this.x * a[1] - this.y * a[0]);
  }

  transform(t: Transformation): Vector3d {
    return t.applyVector(this);
  }
}

/** 4x4 matrix stored row-major m[r][c]; p' = M · [x y z 1] */
export class Transformation {
  m: number[][];

  static identityM(): number[][] {
    return [
      [1.0, 0.0, 0.0, 0.0],
      [0.0, 1.0, 0.0, 0.0],
      [0.0, 0.0, 1.0, 0.0],
      [0.0, 0.0, 0.0, 1.0],
    ];
  }

  constructor(arg?: Transformation | number[][]) {
    if (arg instanceof Transformation) this.m = arg.m.map((r) => r.slice());
    else if (arg) this.m = arg;
    else this.m = Transformation.identityM();
  }

  static translation(v: PointLike): Transformation {
    const o = coords(v);
    const m = Transformation.identityM();
    m[0][3] = o[0];
    m[1][3] = o[1];
    m[2][3] = o[2];
    return new Transformation(m);
  }

  /** rotation(point, axis, angle) — Rodrigues (same formula as the fake used for the fixtures) */
  static rotation(pt: PointLike, axis: PointLike, angle: number): Transformation {
    const o = coords(pt);
    const a = new Vector3d(axis).normalize();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    const { x, y, z } = a;
    const r = [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
    ];
    const m = Transformation.identityM();
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) m[i][j] = r[i][j];
      m[i][3] = o[i] - (r[i][0] * o[0] + r[i][1] * o[1] + r[i][2] * o[2]);
    }
    return new Transformation(m);
  }

  /** axes(origin, xaxis, yaxis, zaxis) — columns are the axes (not orthogonalised) */
  static axes(origin: PointLike, xa: PointLike, ya: PointLike, za?: PointLike): Transformation {
    const o = coords(origin);
    const xv = coords(xa);
    const yv = coords(ya);
    const zv = za ? coords(za) : new Vector3d(xv).cross(yv).toA();
    const m = Transformation.identityM();
    for (let i = 0; i < 3; i++) {
      m[i][0] = xv[i];
      m[i][1] = yv[i];
      m[i][2] = zv[i];
      m[i][3] = o[i];
    }
    return new Transformation(m);
  }

  applyPoint(p: PointLike): Point3d {
    const a = coords(p);
    const m = this.m;
    const w = m[3][0] * a[0] + m[3][1] * a[1] + m[3][2] * a[2] + m[3][3];
    let r = [0, 1, 2].map((i) => m[i][0] * a[0] + m[i][1] * a[1] + m[i][2] * a[2] + m[i][3]);
    if (w !== 1.0) r = r.map((c) => c / w);
    return new Point3d(r[0], r[1], r[2]);
  }

  applyVector(v: PointLike): Vector3d {
    const a = coords(v);
    const m = this.m;
    return new Vector3d(
      m[0][0] * a[0] + m[0][1] * a[1] + m[0][2] * a[2],
      m[1][0] * a[0] + m[1][1] * a[1] + m[1][2] * a[2],
      m[2][0] * a[0] + m[2][1] * a[1] + m[2][2] * a[2],
    );
  }

  mul(o: Transformation): Transformation {
    const r = [0, 1, 2, 3].map(() => [0.0, 0.0, 0.0, 0.0]);
    const a = this.m;
    const b = o.m;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j] + a[i][3] * b[3][j];
    return new Transformation(r);
  }

  /** general 4x4 inverse (Gauss-Jordan with partial pivoting), as in the fake */
  inverse(): Transformation {
    const a = this.m.map((r) => r.slice());
    const inv = Transformation.identityM();
    for (let c = 0; c < 4; c++) {
      let p = c;
      for (let r = c + 1; r < 4; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      [a[c], a[p]] = [a[p], a[c]];
      [inv[c], inv[p]] = [inv[p], inv[c]];
      const d = a[c][c];
      for (let j = 0; j < 4; j++) {
        a[c][j] /= d;
        inv[c][j] /= d;
      }
      for (let r = 0; r < 4; r++) {
        if (r === c) continue;
        const f = a[r][c];
        if (f === 0) continue;
        for (let j = 0; j < 4; j++) {
          a[r][j] -= f * a[c][j];
          inv[r][j] -= f * inv[c][j];
        }
      }
    }
    return new Transformation(inv);
  }
}

export class BoundingBox {
  private lo: number[] | null = null;
  private hi: number[] | null = null;

  add(...pts: (PointLike | BoundingBox)[]): this {
    for (const p of pts) {
      if (p instanceof BoundingBox) {
        if (!p.empty()) this.add(p.min(), p.max());
        continue;
      }
      const a = coords(p);
      if (this.lo && this.hi) {
        this.lo = [rmin(this.lo[0], a[0]), rmin(this.lo[1], a[1]), rmin(this.lo[2], a[2])];
        this.hi = [rmax(this.hi[0], a[0]), rmax(this.hi[1], a[1]), rmax(this.hi[2], a[2])];
      } else {
        this.lo = a.slice();
        this.hi = a.slice();
      }
    }
    return this;
  }

  empty(): boolean {
    return this.lo === null;
  }

  min(): Point3d {
    return this.lo ? new Point3d(this.lo[0], this.lo[1], this.lo[2]) : new Point3d(1e30, 1e30, 1e30);
  }

  max(): Point3d {
    return this.hi ? new Point3d(this.hi[0], this.hi[1], this.hi[2]) : new Point3d(-1e30, -1e30, -1e30);
  }

  width(): number {
    return this.lo && this.hi ? this.hi[0] - this.lo[0] : 0;
  }

  height(): number {
    return this.lo && this.hi ? this.hi[1] - this.lo[1] : 0;
  }

  depth(): number {
    return this.lo && this.hi ? this.hi[2] - this.lo[2] : 0;
  }

  center(): Point3d {
    const lo = this.lo!;
    const hi = this.hi!;
    return new Point3d((lo[0] + hi[0]) / 2.0, (lo[1] + hi[1]) / 2.0, (lo[2] + hi[2]) / 2.0);
  }

  /** SketchUp corner order: bit0 = x, bit1 = y, bit2 = z */
  corner(i: number): Point3d {
    const lo = this.lo!;
    const hi = this.hi!;
    return new Point3d(i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]);
  }
}
