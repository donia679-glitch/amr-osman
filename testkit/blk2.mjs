import { compute } from "/home/claude/novera-app/apps/ipad/engine/panel/layout.js";
for (const k of ["blk_coffee_glass_walnut","blk_night_drawer_frame","blk_coffee_plinth_slab","blk_coffee_float_dark"]) {
  const r = compute({ preset: k });
  console.log(k, JSON.stringify(r.warnings), JSON.stringify((r.checks||[]).slice(0,6)));
  console.log("  pieces:", r.parts.filter(p=>p.cut_piece).map(p=>`${p.name} ${p.label.w}×${p.label.h}×${p.label.t}`).join(" | ").slice(0,600));
}
