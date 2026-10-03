// Kitchen engine vs the plugin. kitchen_sketchup.json was recorded inside REAL SketchUp 2025 by
// parity/ruby/kud_kitchen_run.rb running plugin v185 — the fake SketchUp API matched it 529/529.
// v186 fixed 6 plugin bugs, so the reference is now kitchen_v188.json: the same recorder running
// plugin v186 on the fake API (`npm run parity:kitchen` regenerates it; re-record in SketchUp to confirm).
import { test } from "node:test";
import { runCase } from "../src/kitchen/index.ts";
import { fixture, assertSame } from "./helpers.ts";

const inp = fixture<any>("kitchen_in.json").cases as any[];
const real = new Map<string, any>((fixture<any>(process.env.KITCHEN_REF ?? "kitchen_v191.json").cases as any[]).map((c) => [c.name, c]));
for (const c of inp) {
  test(`kitchen parity: ${c.name}`, () => {
    const exp = real.get(c.name);
    const got = runCase(c);
    for (const k of ["ok", "error", "unit", "joint_sets", "hardware", "labels", "assembly_marks", "divider_marks", "groups", "parts", "log"]) {
      assertSame(got[k] ?? null, exp[k] ?? null, `${c.name} .${k}`);
    }
  });
}
