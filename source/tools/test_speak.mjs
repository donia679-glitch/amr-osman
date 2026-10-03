// Self-test for apps/ipad/speak.js — run: node tools/test_speak.mjs
import assert from "node:assert/strict";
import { parseDesign, examples } from "../apps/ipad/speak.js";

const cases = [
  ["1 chips sentence (L, 3x4, acrylic, fridge near door)", examples[0], {
    shape: "L", room: { w: 300, d: 400 }, tier: "std", front: "acrylic_white", fridge: "nearDoor", sinkUnderWindow: true,
  }],
  ["2 straight, wall length, oak, no wall units, 80 الف", "مطبخ مستقيم على حيطة 3.5 متر، ضلف خشب أوك، من غير علوي، ميزانية 80 ألف", {
    shape: "line", room: null, wallLen: 350, front: "wood_oak_natural_v", wallUnits: false, budget: 80000,
  }],
  ["3 U, Arabic-Indic dims, lux, green lacquer, appliances, led", "مطبخ حرف U في أوضة ٤×٣ متر، تشطيب فاخر، ضلف لاكيه أخضر، فرن وميكروويف وشفاط، ليد تحت العلوي", {
    shape: "U", room: { w: 400, d: 300 }, tier: "lux", front: "lacquer_green", appliances: ["oven", "microwave", "hood"], led: true, wallUnits: true,
  }],
  ["4 parallel, dishwasher is not washer, tall unit, grey, eco", examples[3], {
    shape: "parallel", room: { w: 250, d: 400 }, tier: "eco", front: "hpl_grey", appliances: ["dishwasher", "tall"],
  }],
  ["5 with tashkeel + Arabic-Indic digits, beige, window centre, ٨٠ ألف", "مَطبَخ على شَكل حَرف L في أُوضَة ٣ في ٤، الشُّبّاك في النّص، ضُلَف بِيج، ميزانية ٨٠ ألف", {
    shape: "L", room: { w: 300, d: 400 }, front: "hpl_beige", budget: 80000, windowAt: "center",
  }],
  ["6 English", "L-shaped kitchen, 3 by 4 meters, white cabinets, luxury finish, budget 120k, with dishwasher and oven, fridge near the door", {
    shape: "L", room: { w: 300, d: 400 }, tier: "lux", front: "hpl_white", budget: 120000, appliances: ["oven", "dishwasher", "fridge"], fridge: "nearDoor",
  }],
  ["7 two walls, cm dims, hob near window, PVC wood", "عايز مطبخ على حيطتين اوضه 400 × 300 سم بوتاجاز جنب الشباك وفرن، ضلف pvc خشبي", {
    shape: "L", room: { w: 400, d: 300 }, front: "pvc_wood", appliances: ["oven"], hobNear: "window",
  }],
  ["8 island, window 120 centre, walnut, lux", examples[4], {
    shape: "island", room: { w: 400, d: 500 }, tier: "lux", front: "wood_walnut_v", island: true, windowAt: "center", windowW: 120, hobNear: "window",
  }],
  ["9 three walls, wall length, fridge+washer, black, no glass", "مطبخ على 3 حيطان بدون زجاج، ثلاجة، غسالة ملابس، 4 متر، ضلف اسود", {
    shape: "U", room: null, wallLen: 400, front: "hpl_black", appliances: ["washer", "fridge"], glass: false,
  }],
  ["10 L, glass, glossy white, led, door left, fridge corner, window wall 2", "مطبخ L ٤٥٠×٢٨٠ ضلف زجاج لامع ابيض ليد، الباب على الشمال، التلاجة في الركنة، شباك على الحيطة التانية", {
    shape: "L", room: { w: 450, d: 280 }, front: "acrylic_white", glass: true, led: true, fridge: "corner", doorAt: "left", windowWall: 2,
  }],
  ["11 'room 3 * 4', beech, std, no wall units", "اوضة 3 * 4 مطبخ زان عادي من غير علوي ولا ليد", {
    shape: null, room: { w: 300, d: 400 }, tier: "std", front: "wood_beech", wallUnits: false, led: false,
  }],
  ["12 length/width labels, off-white, sink not under window, 60000 جنيه", "طول 3.5 متر وعرض 3 تشطيب اقتصادي ضلف اوف وايت الحوض مش تحت الشباك ميزانية 60000 جنيه", {
    room: { w: 350, d: 300 }, tier: "eco", front: "hpl_offwhite", sinkUnderWindow: false, budget: 60000,
  }],
];

let n = 0;
for (const [name, text, exp] of cases) {
  const r = parseDesign(text);
  const ctx = (k) => `[${name}] ${k}\n  got: ${JSON.stringify(r)}`;
  for (const [k, v] of Object.entries(exp)) {
    if (k === "front") assert.equal(r.front && r.front.lib, v, ctx(k));
    else if (k === "windowAt") assert.equal(r.window && r.window.at, v, ctx(k));
    else if (k === "windowW") assert.equal(r.window && r.window.w, v, ctx(k));
    else if (k === "windowWall") assert.equal(r.window && r.window.wall, v, ctx(k));
    else if (k === "doorAt") assert.equal(r.door && r.door.at, v, ctx(k));
    else assert.deepEqual(r[k], v, ctx(k));
  }
  assert.ok(Array.isArray(r.understood) && Array.isArray(r.unknown), ctx("arrays"));
  n++;
  console.log("ok  " + name + "  ->  " + r.understood.join(" | "));
}

// the 6 chips must all be understood well
assert.equal(examples.length, 6);
for (const ex of examples) assert.ok(parseDesign(ex).understood.length >= 5, "weak example: " + ex);

// robustness
assert.equal(parseDesign("").shape, null);
assert.equal(parseDesign(null).room, null);
assert.deepEqual(parseDesign("مطبخ بسيط").tier, "eco");
assert.equal(parseDesign("مطبخ فيه رخام اسود").front, null);        // marble is not a door colour
assert.ok(parseDesign("مطبخ فيه رخام اسود").unknown.length >= 1);
assert.equal(parseDesign("مطبخ 3 متر و 50 سم").wallLen, 350);
assert.deepEqual(parseDesign("اوضه 3 متر و 4 متر").room, { w: 300, d: 400 });
assert.equal(parseDesign("U shape kitchen").shape, "U");
assert.equal(parseDesign("straight kitchen oak").front.lib, "wood_oak_natural_v");

console.log(`\nall ${n} sentence tests + chips + robustness passed`);
