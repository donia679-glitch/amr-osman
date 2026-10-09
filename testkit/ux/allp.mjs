import { compute } from "/home/claude/novera-app/apps/ipad/engine/panel/layout.js";
import { LIST } from "/home/claude/novera-app/apps/ipad/engine/panel/presets.js";
let bad = 0, n = 0;
for (const k of Object.keys(LIST)) { n++; try { const r = compute({ preset: k }); if (!r.ok) { bad++; console.log("NOTOK", k, JSON.stringify(r.errors).slice(0,200)); } } catch (e) { bad++; console.log("THROW", k, e.message); } }
console.log("presets", n, "bad", bad);
