import { compute } from "/home/claude/novera-app/apps/ipad/engine/panel/layout.js";
for (const k of ["wc_tv","wc_wardrobe","wc_study","wc_closet_hang","wc_tv_niche"]) { const r = compute({ preset: k }); console.log(k, r.ok, r.parts.filter(p=>p.role!=="hole").length, JSON.stringify(r.errors), JSON.stringify((r.checks||[]).filter(c=>c.level==="error").map(c=>c.text)).slice(0,300)); }
