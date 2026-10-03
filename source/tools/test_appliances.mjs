// Self-test for apps/ipad/appliances.js — run: node tools/test_appliances.mjs
import * as M from "../apps/ipad/appliances.js";
import assert from "node:assert/strict";

const { APPLIANCES, CLASS_LABELS, classOf, applyAppliance, fits } = M;
let fails = 0;
const fail = (m) => { fails++; console.error("FAIL:", m); };
const check = (c, m) => { if (!c) fail(m); };

const MIN = { oven: 5, microwave: 5, fridge: 7, washer: 5, sink: 6, hob: 5, hood: 5 };
const BRANDS = ["Bosch","Beko","Zanussi","Fresh","Unionaire","Tornado","Glemgas","Elba","Kiriazi","Sharp","LG","Samsung","Toshiba","Franke","Elleci"];
const POWER = ["كهربا 16 أمبير", "كهربا 32 أمبير", "غاز", "كهربا + غاز", ""];
const KEYS = {
  oven: ["oven_cavity_height"],
  microwave: ["microwave_cavity_height", "microwave_cavity_width"],
  fridge: ["fridge_cavity_width", "fridge_cavity_height", "depth"],
  washer: ["washer_cavity_width", "washer_cavity_height"],
  sink: ["include_sink_cutout", "sink_cutout_width", "sink_cutout_depth"],
  hob: ["hob_cutout_w", "hob_cutout_d"],
  hood: ["width"],
};
const dim = (o) => o && ["w", "h", "d"].every((k) => typeof o[k] === "number" && o[k] > 0);

check(JSON.stringify(Object.keys(CLASS_LABELS)) === JSON.stringify(Object.keys(MIN)), "CLASS_LABELS keys");
const ids = new Set();
const counts = {};
for (const cls of Object.keys(MIN)) {
  const list = APPLIANCES[cls];
  check(Array.isArray(list), `${cls} is an array`);
  counts[cls] = list.length;
  check(list.length >= MIN[cls], `${cls} needs >= ${MIN[cls]} entries, has ${list.length}`);
  for (const e of list) {
    const t = `${cls}/${e.id}`;
    check(typeof e.id === "string" && e.id && !ids.has(e.id), `${t} id unique`); ids.add(e.id);
    check(/[؀-ۿ]/.test(e.label || ""), `${t} Arabic label`);
    check(dim(e.size), `${t} size`);
    check(dim(e.cavity), `${t} cavity`);
    check(e.params && typeof e.params === "object", `${t} params`);
    for (const k of KEYS[cls]) check(k in e.params, `${t} params.${k}`);
    check(typeof e.width === "number" && e.width > 0, `${t} width`);
    check(Array.isArray(e.brands) && e.brands.every((b) => BRANDS.includes(b)), `${t} brands`);
    check(typeof e.note === "string" && /[؀-ۿ]/.test(e.note), `${t} Arabic note`);
    check(POWER.includes(e.power), `${t} power "${e.power}"`);
    if (cls !== "hood" && cls !== "hob") check(e.width + 1e-6 >= e.cavity.w + 3.6, `${t} width holds cavity`);
    if (cls === "fridge" && !e.id.includes("builtin")) {
      check(e.cavity.w === e.size.w + 5 && e.cavity.h === e.size.h + 5 && e.cavity.d === e.size.d + 2, `${t} cavity = size + clearance`);
    }
    if (cls === "hood") check(["chimney", "under", "builtin"].includes(e.hoodMount) && typeof e.minUnitHeight === "number", `${t} hood fields`);
    if (cls === "hob") check([40, 60, 90].includes(e.width), `${t} hob width`);
  }
}

// ---- 3 examples each
const fridge16 = APPLIANCES.fridge.find((e) => e.id === "fridge16");
const oven60 = APPLIANCES.oven.find((e) => e.id === "oven60_std");
const hob90 = APPLIANCES.hob.find((e) => e.id === "hob90_gas5");

// applyAppliance: raises width, keeps bigger width, never mutates
{
  const inp = { width: 60, unit_category: "fridge", height: 210 };
  const snap = JSON.stringify(inp);
  const out = applyAppliance(inp, fridge16);
  check(JSON.stringify(inp) === snap, "applyAppliance mutated its input");
  check(out !== inp && out.width === fridge16.width && out.fridge_cavity_width === 68 && out.fridge_cavity_height === 170 && out.depth === 70, "applyAppliance fridge");
  check(out.unit_category === "fridge" && out.height === 210, "applyAppliance keeps other params");
  const out2 = applyAppliance({ width: "90" }, oven60);
  check(out2.width === "90" && out2.oven_cavity_height === 59.5, "applyAppliance keeps wider width");
  const out3 = applyAppliance({ width: 60 }, hob90);
  check(out3.width === 90 && out3.hob_cutout_w === 86 && out3.hob_cutout_d === 48, "applyAppliance hob 90");
  check(applyAppliance(undefined, oven60).width === 60, "applyAppliance undefined params");
  try { APPLIANCES.oven[0].label = "x"; check(APPLIANCES.oven[0].label !== "x", "catalog is frozen"); } catch { /* strict-mode throw is fine */ }
}

// fits
{
  const a = fits({ width: 71.6, height: 210, depth: 70 }, fridge16);
  check(a.ok === true && typeof a.why === "string" && a.why, "fits fridge ok");
  const b = fits({ width: 60, height: 175, depth: 58 }, fridge16);
  check(b.ok === false && /[؀-ۿ]/.test(b.why) && b.why.includes("عرض") && b.why.includes("ارتفاع") && b.why.includes("عمق"), `fits fridge bad: ${b.why}`);
  const c = fits({ width: 60, height: 72, depth: 58 }, oven60);
  check(c.ok === true, `fits oven base 60: ${c.why}`);
  const d = fits({ width: 60, height: 60, depth: 58 }, oven60);
  check(d.ok === false && d.why.includes("ارتفاع"), "fits oven too short");
  const slim = APPLIANCES.hood.find((e) => e.id === "hood_slim60");
  check(fits({ width: 60, height: 30 }, slim).ok === false && fits({ width: 60, height: 70 }, slim).ok === true, "fits hood under");
  check(fits({ width: 60, depth: 58 }, hob90).ok === false && fits({ width: 90, depth: 58 }, hob90).ok === true, "fits hob 90");
}

// classOf
{
  check(classOf({ unit_category: "fridge" }) === "fridge", "classOf fridge");
  check(classOf({ unit_category: "oven", include_microwave: true }) === "oven", "classOf oven primary");
  check(classOf({ unit_category: "microwave" }) === "microwave", "classOf microwave");
  check(classOf({ unit_category: "washing_machine" }) === "washer", "classOf washer");
  check(classOf({ include_sink_cutout: true }) === "sink" && classOf({ include_sink_cutout: "true" }) === "sink", "classOf sink");
  check(classOf({ unit_label: "وحدة بوتجاز 60" }) === "hob" && classOf({}, "مسطح 90") === "hob" && classOf({}, "Hob unit") === "hob", "classOf hob");
  check(classOf({}, "شفاط 90") === "hood" && classOf({ unit_label: "Hood" }) === "hood", "classOf hood");
  check(classOf({ unit_category: "standard" }, "دولاب عادي") === null && classOf() === null && classOf(null, null) === null, "classOf null");
  check(classOf({ include_sink_cutout: false, unit_category: "standard" }, "x") === null, "classOf sink false");
}

console.log("exports:", Object.keys(M).join(", "));
console.log("counts:", JSON.stringify(counts), "total", Object.values(counts).reduce((a, b) => a + b, 0));
if (fails) { console.error(`${fails} failure(s)`); process.exit(1); }
console.log("OK — all appliance checks passed");
