// Cut optimizer, panel engine and dressing system vs REAL SketchUp 2025 (parity_run2.rb ran the
// installed plugin on sketchup_in.json inside SketchUp and wrote sketchup_out.json).
import { test } from "node:test";
import { compute as cut } from "../src/cut/cutOptimizer.ts";
import { compute as panel } from "../src/panel/layout.ts";
import { setMachines } from "../src/panel/catalog.ts";
import { compute as dressing } from "../src/dressing/index.ts";
import { fixture, assertSame } from "./helpers.ts";

const inp = fixture<any>("sketchup_in.json");
const win = fixture<any>("sketchup_out.json");
setMachines(win.machines);
const canon = (r: any) => {
  for (const s of r.sheets) s.offcuts.sort((a: any, b: any) => b.w * b.h - a.w * a.h || a.x - b.x || a.y - b.y);
  return r;
};
inp.cut.forEach((c: any, i: number) => {
  test(`sketchup cut: ${c.name}`, () => {
    const o = c.opts;
    const r: any = cut(c.parts, { sheetW: o.sheet_w, sheetH: o.sheet_h, kerf: o.kerf, trim: o.trim, rotate: o.rotate, remnants: o.remnants, minOffcut: o.min_offcut, effort: o.effort, timeCap: Infinity });
    delete r.stats.ms;
    assertSame(canon(JSON.parse(JSON.stringify(r))), canon(win.cut[i].result), c.name);
  });
});
inp.panel.forEach((c: any, i: number) => {
  test(`sketchup panel: ${c.name}`, () => assertSame(panel(c.params), win.panel[i].result, c.name));
});
(inp.dressing ?? []).forEach((c: any, i: number) => {
  test(`sketchup dressing: ${c.name}`, () => assertSame(dressing(c.params), win.dressing[i].result, c.name));
});
