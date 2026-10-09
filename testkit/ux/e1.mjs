import { compute } from "/home/claude/novera-app/apps/ipad/engine/panel/layout.js";
const cell = (kind, o = {}) => ({ kind, ...o });
const P = (size, node) => ({ size, node });
const root = { dir: "v", parts: [
  P(60, cell("doors", { glass: true, count: 1, hinge: "right" })),
  P(80, cell("combo", { glass: true, dcount: 3 })),
  P(100, cell("wardrobe", { rods: 2, depth: 60 })),
  P(120, cell("sliding", { count: 3, depth: 60 })),
  P(null, { dir: "h", parts: [P(null, cell("solid", { hole: { w: 60, h: 40, z: 150, shelves: 1, led: true } })), P(90, cell("device", { dev: "oven" }))] }),
  P(70, cell("flap", { glass: true, mount: "flat" })),
] };
const r = compute({ template: "wall_comp", width: 600, height: 250, wc: { depth: 60, root } });
console.log(r.ok, r.parts.filter(p => p.role !== "hole").length, JSON.stringify(r.errors), JSON.stringify(r.warnings));
console.log(JSON.stringify((r.checks || []).filter((c) => c.level === "error").map((c) => c.text)).slice(0, 800));
console.log(r.parts.filter(p=>/زجاج|ماسورة|جرار|تجويف|فريم/.test(p.name)).map(p=>p.name+" "+p.module).join("\n"));
console.log(Object.keys(r.hardware||{}).filter(k=>/جرار|ماسورة|دوبل/.test(k)));
