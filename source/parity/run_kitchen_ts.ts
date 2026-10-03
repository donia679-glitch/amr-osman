// Runs every kitchen case through the TS engine → JSON in the recorder's format.
// usage: node parity/run_kitchen_ts.ts [out.json] [nameFilter]
import { readFileSync, writeFileSync } from "node:fs";
import { runCase } from "../packages/engine/src/kitchen/index.ts";

const inp = JSON.parse(readFileSync(new URL("./fixtures/kitchen_in.json", import.meta.url), "utf8"));
const out = process.argv[2] ?? "/tmp/kitchen_ts.json";
const only = process.argv[3];
const t0 = Date.now();
const cases = inp.cases.filter((c: any) => !only || c.name.includes(only)).map((c: any) => runCase(c));
writeFileSync(out, JSON.stringify({ engine: "ts", secs: (Date.now() - t0) / 1000, cases }));
console.log(`${cases.length} cases, ${cases.filter((c: any) => c.ok).length} ok, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
