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
