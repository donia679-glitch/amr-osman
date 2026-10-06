import { compute } from "/home/claude/novera-app/apps/ipad/engine/panel/layout.js";
import { LIST as PRESETS } from "/home/claude/novera-app/apps/ipad/engine/panel/presets.js";
for (const [k, pr] of Object.entries(PRESETS)) {
  if (!k.startsWith("blk_")) continue;
  const r = compute({ preset: k });
  const warns = (r.warnings || []).concat(r.checks?.map?.((c) => c.msg) || []);
  console.log(k, "ok=" + r.ok, "parts=" + (r.parts || []).length, "errors=" + JSON.stringify(r.errors || []), "warn=" + JSON.stringify(warns).slice(0, 300));
}
