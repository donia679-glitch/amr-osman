import { test } from "node:test";
import { compute } from "../src/panel/layout.ts";
import { fixture, assertSame } from "./helpers.ts";

const cases = fixture<any[]>("panel.json");
for (const c of cases) {
  test(`panel parity: ${c.name}`, () => {
    assertSame(compute(c.params), c.result, c.name);
  });
}
