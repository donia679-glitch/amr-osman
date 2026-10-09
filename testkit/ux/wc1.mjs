import { compute } from "/home/claude/novera-app/apps/ipad/engine/panel/layout.js";
const r = compute({ template: "wall_comp" });
console.log("ok", r.ok, "parts", r.parts.length, "errors", JSON.stringify(r.errors), "\nwarn", JSON.stringify(r.warnings).slice(0,400));
console.log("checks", JSON.stringify((r.checks||[]).filter(c=>c.level==="error")).slice(0,600));
const names = r.parts.map(p=>p.name); console.log(names.slice(0,60).join(" | "));
console.log(JSON.stringify(r.notes).slice(0,600));
console.log("W/H/D", r.params?.width, r.params?.height, r.params?.depth);
const r2 = compute({ template: "wall_comp", width: 300, height: 280, wc: { root: { dir: "v", parts: [ {size: 100, node: {kind: "doors"}}, {size: null, node: {kind: "niche", led: true}}, {size: 80, node: {kind: "solid"}} ] } } });
console.log("ok2", r2.ok, r2.parts.length, JSON.stringify(r2.errors), JSON.stringify((r2.checks||[]).filter(c=>c.level==="error")).slice(0,400));
