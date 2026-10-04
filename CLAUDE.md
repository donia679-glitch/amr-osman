# NOVERA Studio — handoff for a new session

Owner: Eng. Amr Osman (NOVERA factory, Egypt). **Always reply in Egyptian Arabic.**
He tests a lot on iPad and sends many issues in a row while you work: keep a task list and do not drop any of them.

## What this repo holds
- `source/` — the full app source (this is the only copy outside a session — always commit it).
  - `source/apps/ipad/` the web app: `app.js` (main UI, ~8.5k lines), `draw/studio.js` (ورشة الرسم, SketchUp-like 3D drawing), `draw/geom.js`,
    `room.js` (walls/openings/arrange), `library.js` (library presets + `SMART` bundles), `kitchen_ui.js`, `keypad.js`, `survey*.js`, `i18n.js` + `i18n/en.json`,
    `engine/kitchen/*` (port of the SketchUp plugin: carcass.js, corners.js, config.js), `index.html` (all CSS).
  - `source/ios/` Swift Playgrounds wrapper (WebView.swift …). `source/tools/build_pwa.py`, `build_ios.py`.
- `studio/` — the built PWA (= `dist/pwa`), what is served online.

## Set up a fresh session
```
cp -r /home/claude/amr-osman/source /home/claude/novera-app   # work here
cd /home/claude/novera-app && python3 tools/build_pwa.py && python3 tools/build_ios.py
```
(`parity/fixtures` was left out — 180 MB of plugin parity data, not needed to build.)

## Ship a version (same steps every time)
1. Edit in `/home/claude/novera-app/apps/ipad`, `node --check` the JS, build both.
2. Test with Playwright (Chromium is preinstalled): serve `dist/pwa` with `python3 -m http.server PORT`;
   boot: `localStorage.clear(); reload; wait 6s; window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]').click()`.
   Dev hooks on localhost: `window.__dbg` (state, ui, R, view, plan, render, checks, libUnit, libSet, thumbs, openStudio) and `window.__ds` in the studio (M(), ui, scr(P), setTool, G, pick).
3. New Arabic UI strings need English in `apps/ipad/i18n/en.json` (keys are Arabic text runs).
4. Zip: `dist/NOVERA-Studio-iPad-app.zip` → `/mnt/user-data/outputs/NOVERA-Studio-iPad-app-vNN.zip` (remove the old one), send with SendUserFile.
5. Git: `rm -rf studio source && cp -r /home/claude/novera-app/dist/pwa studio` + copy source (tar, excluding node_modules, dist, parity/fixtures),
   commit "vNN: …" and `git push origin main`.
6. Online artifact: https://claude.ai/artifact/EP8c8LmBNS8d3EqLcDioXi — republish `dist/pwa/index.html` with `root` = dist/pwa and a `files` map of the
   changed files (read the artifact first in a new session: `Artifact action read`, then publish with `url`).
7. Final reply in Egyptian Arabic: what changed, short.

## Coordinates / models
- Studio world is cm, z up; three.js `T3 = (x, z, -y)`. Room plan `[x, z]` ↔ studio `[x, -z, 0]`.
- Room: `{pts, closed, walls:[{id,t,h,flip,finish,color}], openings:[{id,wall,kind,w,h,sill,at}], points:[…], columns}`.
- Unit placement: `u.pos = {wall, s}` or `{x, z, rot}`; no pos → `Room.arrange` lays it out. `pinOthers()` before moving by hand.
- Kitchen units: base depth 58 includes the door (inset, face at y=0); corner units get their depth from `cornerFit()` in app.js unless set by hand.

## History (latest first)
- v65: worker mode text was faded in the dark theme (white cards inheriting light --ink/--muted) — .workerbar now pins its own --ink/--muted/--line and forces dark text on every card/label.
- v64: worker mode — new tab «🪚 من جوه» (asmLayout: elevation via unitElevSvg + rows per shelf/drawer/door/divider/rail with heights from the base top, runner height, front range, slide length, hinge cups; tap = voice),
  drawings tab front = unitElevSvg (projSvg has only plan/side), 3D size tags hidden in worker mode (they overlapped the panel).
- Tour video (v63): scratchpad/tour/{capture.py (Playwright 1920×1080 frames per shot, __dbg hooks), cards.py (IBM Plex Arabic captions/chapter cards via Chromium), music.py (numpy pad), assemble.py + final.py (ffmpeg zoompan/xfade, run final.py in the background — the 50-input xfade takes ~5 min)} → outputs/NOVERA-Studio-tour-v63.mp4 (1:53, 14 chapters). Re-run capture+cards+assemble after big UI changes.
- v63: worker mode «👷 وضع العمال» (menu item + command palette; app.js workerOn/workerOff/renderWorker/workerTap/workerIsolate/sayAr, `ui.worker`, body.worker, #workerBar on the stage):
  unit chips by code, icon tabs — pieces (list + big card: pieceSvg, L/W/T big digits, «لوحدها» isolate via ui.hidePart, «اسمع» speech ar-EG), drawings (projSvg front/side/plan), hardware (HW_ICON emoji + counts),
  steps (asmPlan with ui.asm driving the 3D), install (unit dims, wall mount height, counter height, kick, hood clearance, distance along the wall); tapping a piece in the 3D opens its card. CSS .workerbar*.
- v62: studio pick modes «بتختار إيه؟» (ui.pickMode solid|face|edge|vertex, buttons data-pmode in the side panel; select tool picks a face directly, `pickEdge`/`pickVertex` nearest on screen,
  `edgeOf`/`vertexOf`, highlights in rebuild, panels `edgeHtml` (length, set length by moving the far corner, split mid-edge, move) / `vertexHtml` (plane x/y, move, delete), `subAction`;
  move tool starts from a picked edge (`moveEdge`, both corners slide in-plane) or vertex; eraser in vertex mode deletes a corner (≥3 kept). __ds exposes click/pickEdge/pickVertex/rebuild.
- v61: wood grain direction system. app.js: `GRAIN_DEF/grainPolicy(u)` (project default `userDefs().grain` + `state.project.grain` + `u.grain` {fronts v|h|free, carcass std|free, match, applies wood|all}),
  `grainKind(pt)` (front/vert/horiz/box/back/none by role+name), `grainOf(u, pt, lib)` → "h"|"w"|null with per-piece override `u.grainOv[name]`; projectPieces carries grain/kind/uid;
  cutGroups locks grained pieces (h → laid along the sheet length, w → along width) and merges a unit's drawer fronts of equal width into one strip «وشوش الأدراج 1+2+3 (عروق متتالية)» (strip dividers + grain arrows in sheetSvg);
  pieceSvg (labels) draws grain lines + arrow; Mat.textureFor(THREE, key, render, grain) rotates wood textures per piece (h → 0, w → π/2) in both mesh paths;
  UI: grainProps() section «🪵 اتجاه ثمرة الخشب» in unit props (chips + per-piece override list, data-grain/data-grainov/data-grainmatch/data-grainreset), defaults pop section (data-defgrain). __dbg exposes cutReady/cutData/projectPieces.
  Keypad fix: `.kpad:not(.on)` visibility hidden (+ bigger translate for the studio's floating pad) — it used to stay partly visible after closing.
- v60: pull-out front honours `door_handle_recess` at its TOP (was wrongly applied at the bottom) — same 57.4 cm front as a base door.
- v59: drawers behind hinged doors — the dressing engine already narrows them (hinge_fix: spacer `drawers.hinge_spacer_t` 1.8 on hinge sides, box in by spacer + slide clearance, inner front narrower by spacer + hinge_front_gap);
  now exposed in the dressing «إعدادات متقدمة → الأدراج» as a toggle + a NOVERA-rule hint with the numbers. Kitchen/panel engines have no drawers behind doors (zone drawers are external).
- v58: fix — glass drawer fronts (dressing + panel engines) opened without their frame: `partMovers()` now gives every drawer part of the same `group` the first rail's mover (one drawer, not one mover per rail).
- v57: pull-out rebuilt after Amr's photos: one front + ONE full-height spine panel (`pullout_spine_side` left/right) + shallow lipped trays («صينية بول أوت N»: back-material base + front/back/outer lips of `pullout_tray_lip` 8)
  hung off the spine, open on the other side; runner pairs only at the first and last tray (hardware = min(2, trays)). No closed box any more.
- v56: wooden turbo drawers + inner drawers + wooden pull-out (no metal mechanisms). carcass.js: `drawer_turbo` (box walls to 1.5 under the front top, `buildDrawerBox(..., wallDropOverride)`),
  `drawer_inner_N` (main box takes the lower half, an inner box with a carcass-material «وش داخلي» sits above it in a sibling group tagged as a drawer, slide +8); hardware labels renamed for turbo (side full-extension).
  Kitchen category `pullout` → `PulloutBuilder` (one tall front + full-height box via buildDrawerBox + N «صينية بول أوت» trays with front/back lips, two runner pairs; `pullout_tray_count`, `pullout_tray_lip`;
  engine/kitchen/app.js replaces the slide count with «مجاري فول إكستنشن L سم للبول أوت (زوج)» ×2). Presets k_pullout20/30, k_pullout_tall, k_turbo_drawers; props: «أدراج تيربو خشب» bool + per-drawer «درج داخلي مخفي»; chips.
- v55: freestanding cooker gap + built-in hood. Kitchen category `cooker_gap` → `CookerGapBuilder extends WasherGapBuilder` (no head/countertop; vented deck «قعدة البوتجاز»
  of `cooker_base_height` (10): deck board with vent-slot markers + front rail with Ø3 hole markers (createHoleMarkerY) + back/side rails; side via `washer_gap_side`; presets k_cooker_gap/k_cooker_gap90).
  Wall units: `include_hood` + `hood_height` (18) + `hood_duct_diameter` (15) in config.js; carcass.js `hoodEnabled/hoodLift/hoodDuctR`, inner/outerOpening z0 += hoodLift, `buildBottom` → `buildHoodShelf`
  («جلسة الشفاط» raised, duct hole markers in shelf + head, notes); presets k_wall_hood_in/90; extraFields adds the hood fields to any wall unit; chips «شفاط مدمج» + «فراغ الشفاط».
  appliances.js: class `cooker` (COOKERS 55/60/80/90), classOf cooker_gap→cooker, include_hood→hood, under/builtin hoods set `hood_height` via params, fits() for cooker.
  app.js: 3D cooker in the gap + hood body under the raised shelf (+ duct), purchase list, compact props/chips, checks (gas near cooker, finishing side note, hob top for cooker = base + 85, hood detection via include_hood).
- v54: washer gap unit (NOVERA practice: the washer stands in an open slot in the base run). Kitchen category `washer_gap` → `WasherGapBuilder` (engine/kitchen/categories.js):
  no kick/bottom/back/doors, head = solid «رأس» or two rails (`top_style`, rails from the base defaults) spanning the slot and screwed into the neighbours, optional side `washer_gap_side`
  (none/left/right/both, config.js) carrying the head when the slot ends the run; countertop as usual. kitchen_ui.js K_CATS/K_GAP_SIDE/extraFields/preset `k_washer_gap`; library SMART `s_washer_run`;
  app.js: compact props + chips row for washer_gap, washer drawn in the slot (3D appliance gaps handle no sides), purchase list, classOf washer, «اوصفلي» adds k_washer_gap,
  design checks: clearance under the head vs `washer_cavity_height` (85), and "gap at the end of the run with no side" (projects footprint on the wall to map the unit's left/right).
- v53: glass-front drawers on every engine. Kitchen: param `drawer_glass` ("" | "all" | "1,3" bottom-first, chips `kglassField` at the end of «الأدراج بالتفصيل», handler `data-kglass`);
  carcass.js `drawerGlassAt`, `buildSingleDrawer` → `buildFramedGlassDoor(..., railWIn=min(4, h/3))`, `buildDrawerBox(..., glassFront)` omits the front wall, no solid door label.
  Panel furniture (chests/nightstands/vanities…): zone field `fronts[i].glass` (true | [1,3] | false, schema.js normalizeZone), catalog MATERIAL_KEYS `glass` (+ DEFAULT_MATERIALS "زجاج شفاف 4 مم"),
  templates.js buildDrawers builds 4 frame rails (material front, 4 cm) + 0.4 glass + no "أمامي" wall, bottom into the bottom rail; checker.js skips glass/mirror in board/overlap checks.
  app.js: generic `glassChips(path, value, n)` (data-dglass + data-dgn) used by dglassField and the panel zone editor (shown when zone type = drawers).
- v50–v52: glass-front drawers (per-drawer choice: `drawer_glass` = true | [1,3] bottom-first, chips in the compartment editor via dglassField) in the dressing engine (compartment flag `drawer_glass`: 4 rails 4 cm + 4 mm glass 8 mm in a groove, the frame is the box front wall (no wood front), bottom runs into the bottom rail, no handle; engine/dressing/layout.js buildDrawers, schema.js);
  library presets d_glass_drawers90 / d_glass_walkin240 (oak + clear glass); toggle «وش زجاج بفريم خشب» in the dressing compartment editor.
- v49: offcut wizard «♻️ أعمل إيه من الفضلات؟» (scrap*, SCRAP_CANDIDATES, pools by material+thickness from stock keys or typed rows with lib/thickness,
  role→pool assignments tried via the cut worker with timeCap 0.08, results with plan text, thumbnails, add with the pools' materials via scrapWithPlan). cutworker.js honours opts.timeCap.
- v48: NOVERA factory defaults. `NOVERA_DEFAULTS` + `seedDefaults()` (seeded once per install, flag `defaults.seeded`), per-type defaults `defaults.by.{base,wall,tall}`,
  rules `defaults.rules` (shelves per type, drawerBoxLikeCarcass, runner + runnerClr), applied by `applyTypeDefaults()` inside `withDefaults()` and by the «طبّق» button (force).
  Values: back_rear_offset 1.8 · doors overlay · base top = rails with front rail inset 2.5 · base door_handle_recess 4 · wall door_bottom_extension 2 · shelves base/wall 1, tall 4 (preset counts ≤3 are overridden) ·
  assembly holes + hinge cups on · drawer box thickness = panel, base = back thickness · runners: bottom 0.6 cm/side, side 2.6 cm/side (new app param `drawer_runner`, select in the drawer-boxes section).
- v46 (phase 1+2 of the "strongest app" plan): brand identity pop (logo/name/phone/terms → every PDF via brandHead/brandFoot); shop drawings per unit (exportUnitDrawings, projSvg);
  purchase list by supplier (purchaseData/purchaseHtml, suppliers in prices, WhatsApp/PDF/Excel); extra clash checks (hob vs window/door/hood/gas, socket near sink, reach, fridge corner, oven height, tall vs window);
  step bar status lines (stepStatus); timeline (autoSchedule, P.lead, projectPulse) + home dashboard tiles (homeDash) + pulse strip on cards; hardware stock (state.hwStock, takeStock);
  assembly booklet PDF (exportAsmBooklet, snapshots per asm step); client e-signature (sigPad*, project.approval, sigBlockSvg in quote); presentation mode (presentOn/Off, #presentBar, finishes, price, sign).
- v47 (phase 3): new modules `speak.js` (parseDesign: Arabic sentence → shape/room/tier/front/openings/appliances; UI speakPop/speakRun), `appliances.js` (53-entry catalog, classOf/applyAppliance/fits; applianceField in props + purchase list),
  `machines.js` (woodWOP MPR, Biesse BPP, Cutrite/Ardis CSV, bander list; exportMachines; built on the neutral `cncOps(pc)` that the DXF export now shares);
  ergonomics (ergo(), ergoData, renderErgo panel #ergop, view.buildErgo figure + work triangle); lighting plan (lightingPlan/applyLighting, room.lights, plan + 3D + drawings table);
  live board hint while editing (wasteBaseline/wasteHint, #wasteHint); finish compare pop (fincmp*, exportFinishCompare); in-app label scanner (scanOpen, BarcodeDetector → jsQR from cdnjs → typed code; progress kept in project.progress);
  command palette (cmdOpen, ⌘K, #cmdBtn); props level «🏭 للورشة» (state.propsAdv === "shop", SHOP_SECTIONS); studio: favourite tools row, collapsible groups (localStorage ds-toolgroups), tool search #dsToolQ; presentation mode: unit stories + voice (unitStory/presentTell).
  Not done (needs vision/ML): photo → room. Tests: scratchpad/lib/{t1,p1,p2,p3,p4}.py.
- v45: library 3D thumbnails + preview popup (turn, open doors, size/pieces) + quick "＋"; «✨ تصميمات ذكية» sets (library.js `SMART`, added lined up);
  corner unit depth matches the straight units (L legs = depth − door, diagonal cut = leg − depth; L counter/kick to the door face);
  move a unit by holding a gold corner dot (snaps corner-to-corner / wall corners); wall paint in the studio (paint tool + swatches) and "all walls" applies at once;
  drawing on a wall face in the studio goes onto the wall (vertical plane); the open project can be deleted (switches to the last other one).
- v44 offcut stock modes · v43 ceiling unit with LED board, trim tool, stand-up board · v42 intersection snaps · v41 big audit (~45 fixes) · v34–v40 walls in the studio, views, multi-select, corner plinths, tape.

## Still waiting on Amr
Support email/phone for privacy.html · Apple Developer account · subscription Group ID (then `required = true`) · real iPad test · English spelling of his name (Osman).
Known, not fixed: side banding on the rabbet edge, hinge cups off by default, laminated-layer labels, Arabic folder names in CNC/DXF zips,
auto-kitchen corner wall-unit warnings.

## SketchUp plugin sync — later, all at once, ONLY when Amr asks
Amr wants the plugin updated in one go after all app edits are done. Pending for that sync:
- corners: L-corner counter + plinth to the door face (engine/kitchen/corners.js v45), and the corner depth defaults (app.js `cornerFit()`:
  L corner_depth = depth − 1.8, diagonal cut = leg − depth) so corner units line up with the straight units.
- dressing: compartment `drawer_glass` (glass drawer fronts: 4 frame rails + glass insert, v50) — port to the plugin's dressing layout + schema.
- kitchen: `pullout` category (PulloutBuilder), `drawer_turbo`, `drawer_inner_N` (carcass.js buildSingleDrawer/buildDrawerBox wallDropOverride, v56) — port to the plugin.
- kitchen: `cooker_gap` category + `include_hood`/`hood_height`/`hood_duct_diameter` on wall units (carcass hoodLift + buildHoodShelf, v55) — port to builders/config/dialog.
- kitchen: `washer_gap` category (WasherGapBuilder + `washer_gap_side` param, v54) — port to the plugin's builders_categories.rb + config/dialog.
- kitchen: `drawer_glass` param + carcass.js `drawerGlassAt`/`buildSingleDrawer`/`buildDrawerBox(glassFront)` (v53); panel: zone `glass` + catalog `glass` material + templates buildDrawers + checker skips (v53).
