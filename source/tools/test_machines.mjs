// Quick self-test for apps/ipad/machines.js — run: node tools/test_machines.mjs
import assert from "node:assert/strict";
import * as M from "../apps/ipad/machines.js";

const rect = {
  key: "K01-03", unit: "سفلية ضلفتين 60", name: "جنب شمال", mat: "HPL أبيض — 18 مم",
  W: 580, H: 720, T: 18, outline: null, cutouts: [], pockets: [],
  drills: [
    { x: 37, y: 32, d: 8, z: 12, kind: "sys" },
    { x: 37, y: 64, d: 8, z: 12, kind: "sys" },
    { x: 9, y: 100, d: 15, z: 13, kind: "cam" },
    { x: 20, y: 300, d: 8, z: 10, kind: "pin" },
  ],
  grooves: [{ x: 0, y: 8, w: 580, h: 6, z: 8 }],
  note: "", banded: { left: false, right: false, top: true, bottom: false }, bandAll: false, grain: true,
};
const shaped = {
  key: "K02-01", unit: "ركنة", name: "رف مشكّل", mat: "HPL أبيض — 18 مم",
  W: 600, H: 600, T: 18,
  outline: [[0, 0], [600, 0], [600, 300], [300, 600], [0, 600]],
  cutouts: [[[100, 100], [200, 100], [200, 200], [100, 200]]],
  pockets: [
    { loop: [[400, 50], [500, 50], [500, 120], [400, 120]], z: 12, face: "front" },
    { rect: [50, 400, 80, 40], z: 10, face: "back" },
    { loop: [[300, 300], [350, 300], [325, 350]], z: 6, face: "front" },
  ],
  drills: [], grooves: [], note: 'ملاحظة "تجربة"', banded: { left: true, right: true, top: false, bottom: true }, bandAll: false, grain: false,
};
const door = {
  key: "K01-07", unit: "سفلية ضلفتين 60", name: "ضلفة", mat: "MDF / أكريليك 18/مم",
  W: 297, H: 716, T: 18, outline: null, cutouts: [], pockets: [],
  drills: [{ x: 22.5, y: 100, d: 35, z: 12.5, kind: "cup" }, { x: 22.5, y: 616, d: 35, z: 12.5, kind: "cup" }],
  grooves: [], banded: {}, bandAll: true, grain: true,
};
const door2 = { ...door, key: "K01-08" };
const ops = [rect, shaped, door, door2];

const lines = (s, n) => s.split("\r\n").slice(0, n).join("\n");

// 1) normal inputs
for (const fn of ["mpr", "bpp"]) {
  for (const op of ops) {
    const s = M[fn](op);
    assert.equal(typeof s, "string");
    assert.ok(s.length > 50, `${fn} ${op.key} too short`);
    assert.ok(!/\n/.test(s.replace(/\r\n/g, "")), `${fn}: bare LF found`);
    assert.ok(!/NaN|undefined|Infinity/.test(s), `${fn}: bad number in ${op.key}`);
  }
}
const m = M.mpr(rect);
assert.ok(m.startsWith("[H\r\n") && m.includes('VERSION="4.0"') && m.includes("<100 \\BohrVert\\") && m.includes("<102 \\Nut\\") && m.trimEnd().endsWith("!"));
const ms = M.mpr(shaped);
assert.ok(ms.includes("<103 \\Konturfraesen\\") && ms.includes("<105 \\Tasche\\") && ms.includes("]3") && ms.includes("$E0"));
assert.equal((M.mpr(door).match(/<100 /g) || []).length, 2);
const b = M.bpp(shaped);
assert.ok(b.includes("[HEADER]") && b.includes("@ ROUT") && b.includes("@ ENDPATH") && b.includes("PAN=LPX|600.0"));
assert.equal((M.bpp(door).match(/@ BV/g) || []).length, 2);

// 2) CSVs
const cut = M.cutriteParts(ops, { projectName: "Proj" });
const cutRows = cut.trim().split("\r\n");
assert.equal(cutRows[0], "Part code,Description,Material,Length,Width,Quantity,Grain,Edge L1,Edge L2,Edge W1,Edge W2");
assert.equal(cutRows.length, 4, "doors must be grouped");
assert.ok(cutRows.some((r) => r.includes(",2,Y,Y,Y,Y,Y")), "grouped door row qty 2");
const ard = M.ardisParts(ops);
assert.equal(ard.trim().split("\r\n").length, 4);
assert.equal(ard.split("\r\n")[0], "Code;Material;Length;Width;Quantity;Grain;Description");
const band = M.bandList(ops);
assert.ok(band.includes("\r\n\r\nMaterial,Total m\r\n"));
// rect: top 580 | shaped: left 600 + right 600 + bottom 600 | HPL total 2.38 m
assert.ok(band.includes("2.38"), "HPL total");
// doors: 2 * (2*716 + 2*297) = 4052 -> 4.05
assert.ok(band.includes("4.05"), "MDF total");

// 3) zips
const mz = M.mprZip(ops), bz = M.bppZip(ops);
assert.equal(mz.length, 4); assert.equal(bz.length, 4);
assert.ok(mz.every((e) => e.name.endsWith(".mpr") && !/[\\:*?"<>|]/.test(e.name) && e.name.split("/").length === 2), mz.map((e) => e.name).join("|"));
assert.ok(bz.every((e) => e.name.endsWith(".bpp")));
assert.equal(new Set(mz.map((e) => e.name.toLowerCase())).size, 4);
// duplicate keys must not collide
assert.equal(new Set(M.mprZip([door, door]).map((e) => e.name)).size, 2);

// 4) formats
assert.deepEqual(M.MACHINE_FORMATS.map((f) => f[0]), ["mpr", "bpp", "cutrite", "ardis", "band"]);
assert.ok(M.MACHINE_FORMATS.every((f) => f.length === 3 && f.every((x) => typeof x === "string" && x)));

// 5) robustness: nothing may throw
const weird = [undefined, null, 0, "x", [], {}, { W: "abc", H: NaN, outline: "no", cutouts: 5, pockets: [null, {}, { loop: [[1]] }, { rect: [1, 2] }],
  drills: [null, { x: NaN }, { x: 1, y: 2 }], grooves: [{}, { x: 1, y: 1, w: 0, h: 5 }], banded: null, key: { toString() { return "k"; } } },
  { outline: [[0, 0], [10, 0], [10, 10]], W: 0, H: 0 }];
for (const w of weird) {
  for (const fn of ["mpr", "bpp"]) assert.equal(typeof M[fn](w), "string");
}
for (const w of [undefined, null, [], {}, "str", 5, weird]) {
  for (const fn of ["cutriteParts", "ardisParts", "bandList"]) assert.equal(typeof M[fn](w), "string", fn);
  assert.ok(Array.isArray(M.mprZip(w)) && Array.isArray(M.bppZip(w)));
}
assert.equal(M.cutriteParts([]).trim().split("\r\n").length, 1);
assert.equal(M.bandList([]), "Piece,Part,Material,Edge,Length mm,Thickness mm\r\n\r\nMaterial,Total m\r\n");

// Report
console.log("lengths: mpr", ops.map((o) => M.mpr(o).length), "bpp", ops.map((o) => M.bpp(o).length));
console.log("cutrite", cut.length, "ardis", ard.length, "band", band.length, "mprZip", mz.length, "bppZip", bz.length);
console.log("zip names:", mz.map((e) => e.name));
console.log("\n--- MPR (shaped, first 25 lines) ---\n" + lines(ms, 25));
console.log("\n--- BPP (shaped, first 25 lines) ---\n" + lines(b, 25));
console.log("\n--- cutrite ---\n" + cut);
console.log("--- band ---\n" + band);
console.log("ALL OK");
