# NOVERA Studio

Standalone iOS-first app (Android later) built from the NOVERA *Kitchen Unit Designer* SketchUp plugin.

## Rule #1 — the plugin is the source of truth
The SketchUp plugin keeps evolving. The app's engine is a line-by-line TypeScript port
that must produce **identical** results. `parity/` runs the plugin's own Ruby code on
hundreds of cases and stores the results; the TypeScript tests compare against them.

```
npm run parity:gen   # run the plugin's Ruby (KUD_SRC=<plugin dir>) -> parity/fixtures/*.json
npm test             # TS engine must match the fixtures exactly
npm run typecheck
```

After changing the plugin: `parity:gen`, then `npm test`. Every failing case points to the
exact field that changed, i.e. what must be ported next.

## Engine status
| Module | Plugin source | Port | Parity |
|---|---|---|---|
| Cut optimizer (guillotine, remnants, cut steps) | `lib/cut_optimizer.rb` | `src/cut/` | 47/47 cases (also verified inside SketchUp 2025) |
| Panel engine (bath, bedroom, reception, tables, free panels, aleta joints, checker) | `lib/panel_engine/*` (no SketchUp parts) | `src/panel/` | 664/664 cases (also verified inside SketchUp 2025) |
| Dressing system | `lib/dressing_system/` | `src/dressing/` (restored from the app build, types to re-add) | verified inside SketchUp 2025 |
| Kitchen units (all categories, corners, accessories, aleta joints, handles, hardware) | `builders_*.rb`, `kitchen_joints.rb`, `handles/kitchen.rb` | `src/kitchen/` + a small SketchUp object model in `src/kitchen/su/` | **529/529 identical to real SketchUp 2025** (36 485 parts, 7 459 labels) |

### Kitchen parity
`parity/ruby/sketchup_fake/` is a tiny fake of the SketchUp API that runs the plugin's builders
unmodified (`npm run parity:kitchen`); `parity/ruby/kud_kitchen_run.rb` is the recorder — the same
file runs inside real SketchUp (copy it + `kitchen_in.json` into the plugin and `dev_reload` it).
`kitchen_sketchup.json` is that real recording; the TS engine is tested against it directly.
Known plugin bugs kept on purpose (the app must match the plugin): bedroom_wardrobe always raises
`wrong number of arguments (given 7, expected 4)`.

No runtime dependencies: Node 22 runs the `.ts` files directly (type stripping), tests use `node:test`.
Ruby-exact helpers live in `src/core/` (Mersenne Twister RNG, Float#round, Kahan sum).
