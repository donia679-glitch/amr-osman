import { test } from "node:test";
import { compute, type CutOptions } from "../src/cut/cutOptimizer.ts";
import { fixture, assertSame } from "./helpers.ts";

const cases = fixture<any[]>("cut.json");

// Offcuts with equal area may come out in any order from Ruby's (unstable) sort_by.
const canonOffcuts = (r: any) => {
  for (const s of r.sheets) s.offcuts.sort((a: any, b: any) => b.w * b.h - a.w * a.h || a.x - b.x || a.y - b.y);
  return r;
};

for (const c of cases) {
  test(`cut parity: ${c.name}`, () => {
    const o = c.opts;
    const opts: CutOptions = {
      sheetW: o.sheet_w, sheetH: o.sheet_h, kerf: o.kerf, trim: o.trim, rotate: o.rotate,
      remnants: o.remnants, minOffcut: o.min_offcut, effort: o.effort, timeCap: Infinity,
    };
    const res: any = compute(c.parts, opts);
    delete res.stats.ms;
    assertSame(canonOffcuts(res), canonOffcuts(c.result), c.name);
  });
}
