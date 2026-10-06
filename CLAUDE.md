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
- v84: project safety net after Amr lost a saved project. `projects.js`: IndexedDB v2 adds store `b` (snapshots: one per 10 min of work or when the unit count changes, 12 per project, kept after deletion — `backups()`, `backupGet(k)`), localStorage index `novera-projects-idx` {id:{name,updatedAt,deleted}} maintained by put/del → `missing()` = known projects the DB no longer has;
  native vault: every put also posts `noveraVault {op:"put", id, name, updatedAt, json}` (debounced 3 s) → ios/WebView.swift writes `Documents/Projects/<id>.novera.json` (list/get answered through `window.noveraVaultResult(token, data)`; `vaultList()/vaultGet(id)/hasVault()`), ios/Info.plist (UIFileSharingEnabled + LSSupportsOpeningDocumentsInPlace via `additionalInfoPlistContentFilePath`) shows them in Files → On My iPad → NOVERA Studio → Projects.
  app.js: `recoverCheck()` at boot (navigator.storage.persist(), restores missing projects from the vault silently, else `ui.lost` → red banner `.hlost` on the home screen), «🛟 استرجاع مشروع» home button → pop "recover" (`recoverOpen/recoverPop/recoverDo`: vault files + snapshot groups, lost projects first; restore in place or as a "(مسترجع …)" copy when the id still exists). Test scratchpad/lib/p48.py.
- v83: studio drawing made findable on the iPad: side box «📐 بترسم على إيه؟» (`PLANES`, data-plane buttons = `ui.plane` auto/ground/front/side, synced with #dsPlane) + «⬜ مستطيل بالمقاس» (`drawHtml`: inputs #dsRw/#dsRh, direction chips `ui.rdir` data-rdir, `rectGo()` → TOOL.rect.vcb({list}) from the tapped first corner or the plane origin; twoClick's first tap re-renders the panel + hint with `planeName`);
  «↔ حرّك بمقاس» (`moveByHtml`: #dsMvD + six axis buttons data-mv="ax,sign" → `moveSelBy(dv)`: commitMove when the move tool holds a piece, else xform the selection, honours ui.copy); the move tool re-renders the panel when it grabs a piece. CSS .dsplanes/.dsmvbtns. Test scratchpad/lib/p47.py.
- v82: a piece's own material in the studio too: solids carry `s.lib` (select `data-sp="lib"` in the board panel and in the focused cabinet piece; `libSelect`, `solidColor` for the 3D colour, ctx.libs() from app.js), `cabRegen` keeps libs by name, studio onDone turns them into `u.matOv`; «🎨 خامة لكل قطعة» is a basic-level section.
- v81: free-model (studio) pieces keep their cabinet role: adaptModel reads `s.role` (door/drawer_front → role door with explicit `door_label.hinge_side` from the name, whatever material the door is painted with; drawer_box → side/other; drawer_bottom) and gives drawer parts a `group` "<cab>:drawer N" so the box rides its front's mover;
  panel schema normalizePanel keeps `group` + `door_label`, ROLES gains drawer_bottom (overlap check skips the box bottom in its groove), templates buildFree passes group/door_label through.
- v80: (1) material per piece on any unit: `u.matOv = { [pieceName]: libId }` applied in R(u) by `withMatOv` (parts get material key "ov:<lib>", names/colors/libOf extended, kitchen meshes' faces remapped) → cut plan groups by that sheet, 3D colour, label name; props section «🎨 خامة لكل قطعة» (`matOvProps`, selects data-matov per cut piece: project materials / my materials / catalogue, data-matovreset); R cache key includes matOv.
  (2) worker «من جوه» dividers: asmLayout dividers carry x (from the left side), xr (from the right), z0/z1 from the bottom top, h, d, horiz (قاطوع أفقي) → rows with all of them + voice; advanced table and text lines extended.
- v79: save to my library from the studio: top-bar «⭐ للمكتبة» (data-ds mylib, asks a name) and «⭐ احفظ العلبة في المكتبة» in the cabinet editor (data-ds cablib: a model with just that cab at the origin). app.js saveLib re-renders the library; libSet handles `myunit` so my-library cards get 3D thumbnails (data-th "m:<id>"). A saved cabinet reopens in the studio with its editor (model.cabs kept).
- v78: cabinet inner upright partitions `c.vparts [{band, col, x, setback}]` («فاصل رأسي N», role partition, cabRef {k:"vpart", i}; like a shelf but vertical, never splits the cavity) — in the focused cavity and the full editor (addvpart:band:col / delvpart:i). Panel contrast: .dsbox.focus/.dscav/.dscol use theme vars (color-mix on --panel2, color --ink, inputs themed) instead of fixed light colours.
- v77: cabinet builder focus mode — every generated solid carries `cabRef` ({k: div|hdiv|shelf, i} or {k: zone, path, key}); tapping a piece in the 3D sets `ui.cabFocus = {kind:"piece", sid}`, tapping a cavity pane (`cabGhosts()` in rebuild: translucent panes in extraG with ref "C:<cab>|<key>") sets `{kind:"cav", key}`;
  `cabFocusHtml` renders only that piece's / cavity's settings (joints for carcass pieces, the divider/shelf row, the front's fields, the cavity's front + shelves + join), «☰ كل إعدادات العلبة» (data-cab="unfocus") returns to the full editor. CSS .dsbox.focus.
- v76: cabinet fronts — per-front details (`recess` + `recessAt` top|bottom for built-in handles, `trim {l,r,t,b}`, `inset`) and zone kind `split` ({dir h|v, parts:[{size, kind, …}]} — sub-fronts inside one cavity with no board, last part takes the rest, recursive `renderFront`/`frontRect` with edge kinds outerX|board|virt).
  studio: `cabFrontFields` (shared by zones and parts), `cabZoneHtml`, `cabPath`, actions partadd:path / partdel:path:i. SUB_KINDS for parts.
- v75: cabinet cavities = cells only (between sides, vertical + horizontal dividers, bottom, top; key "band:col") — shelves live inside a cavity and never split it (a door covers the shelves behind it).
- v74: cabinet builder — horizontal dividers `c.hdividers [{from bottom|top, at}]` (full-width structural boards «قاطوع أفقي N», `hdividerBoxes/bands`), vertical dividers get `band` ("" = full height → one board per band «قاطوع 1 (حزام k)»), `columns(c, band)`, `cells(c)` (band × column),
  shelves carry `band` + `col`, cavity keys "band:col:row", fronts treat a horizontal divider like a shared board. Banding per role: `s.bandEdges` on every cabinet solid (carcass front edge, fronts all four, back/drawer bottom/back rail none, drawer box walls top) honoured by app.js free-model pipeline (also for pocketed boards) → labels show the right edges.
- v73: cabinet fronts as zones over one or more cavities: `c.fronts = [{id, cavs:[keys], kind, hinge, n, hs}]` (legacy `fills` read by `frontZones`), `setZone(c, keys, kind)` (takes the cavities out of other zones), `rectZone` (a zone must be one rectangle — no L shapes),
  `zoneOf`; drawer boxes only when the zone sits in one column. Studio UI: per-cavity select (`data-cf="cav.<key>"`), ☑ join checkboxes (`data-cavpick`) + join:kind buttons, whole:kind (the whole box one door / two doors / flap), each:kind, zones list with hinge / drawer count / heights, split ⇵ and ✕.
- v72: studio «🧰 مصمّم الوحدات بالقطع» — `draw/cabinet.js` (pure: `newCab`, `inner`, `dividerBoxes`, `columns`, `cavities`, `cabSolids(c)` → studio solids tagged `cab`/`role`, joint options BOTTOM_JOINTS between|under, TOP_JOINTS between|over|rails|none,
  BACK_KINDS groove|rabbet|overlay|none (groove/rabbet become real `pockets` on sides/bottom/top), dividers {from left|right, at}, shelves {col, z from the bottom top, fixed, setback}, fills per cavity key "col:row" {kind open|door1|door2|flap|drawers, hinge, n, hs} —
  overlay fronts cover shared boards by half minus gap/2 and outer boards by t − reveal; drawers get wooden boxes when ≥5 cm high). studio.js: `M.cabs`, `cabHtml` (top of the panel when a cab is current, else collapsed near the quick box), `cabAction` (data-cab add/close/del/regen/detach/adddiv/deldiv:i/addshelf:col/delshelf:i/fill:key:kind/fillall:kind),
  `cabChange` (data-cf dotted paths), `cabRegen` (replaces the cab's solids, keeps the group), `cabSyncPos` (follows a moved group). CSS .dscol/.dscav/details.dsbox. __ds exposes cabAdd/cabRegen/curCab/Cab. Test scratchpad/lib/p32.py.
- v71: NO background computing any more (it made the iPad heavy). The zero-waste library ships precomputed in `apps/ipad/zwlib.js` (`export default {sig, items}`, re-exported as `More.ZW_PRE`;
  built by `tools/zwpre.py` = Playwright run of zwSolve for every ZW_LIB preset with budget 45 s, default sheet 244×122/kerf 0.4/trim 1/NOVERA shelf rules — re-run it after changing the solver or presets).
  `zwLibStore()` uses ZW_PRE when `zwSig()` matches (zwSig seeds defaults first), else localStorage, else empty; computing happens only via the «🧮 احسب…» button (`L.want` toggles the pump) or by tapping an uncomputed card (solved once, saved).
  `zwLibPaint` skips cards whose state key is unchanged (no thumbnail re-shoots), called on render while the library is open. Presets with front sheets rebalanced to 4+1 / 6+2 / 8+2; solver: random restarts while time remains, stale<4, stronger penalties for >2 of a kind / >2 drawer units, narrower starts for ≤2 sheets.
- v70: zero waste rebuilt as a real solver + ready library. `zwSolve({mode, counts, budget, onProgress})`: stage 1 grow from 3 seeds (5-cm widths, moves widen/add/swap/narrow+add), stage 2 fine-tune every width ±1–4 cm (`zwUnit(c, w, sh)` any integer width),
  stage 3 fill the real offcuts (optimizer `minOffcut [8,5]`, untouched sheets count as whole offcuts) with extra loose shelves (`sh` extra shelves per candidate cap `shelves`) and ZW_FILLERS accessories (diffParts for the added pieces), stage 4 distinct results;
  judged by `score` = waste + composition penalty (kitchen needs base + wall (+ sink from 3 units), >2 of a kind, drawers-heavy). Worker calls serialised (`zwCall` queue). Results carry `leftovers`.
  Library section «♻️ مكتبة صفر هدر» (ZW_LIB 15 presets: kitchens 2/3/4/5/6/8 sheets, 3+2/4+2/6+3 carcass+front, base 2/3/4, wall 1/2/3) computed in the background while the library is open (`zwLibPump`, 9 s each, sequential),
  cached in localStorage `novera-zwlib` keyed by `zwSig()` (sheet/kerf/trim/shelf rules); cards repainted by `zwLibPaint` (⏳ progress → thumbnail + waste); tap → `zwLibOpen` loads the result into the «zero» pop (`zwLibResult` rebuilds units from {k,w,sh}). __dbg exposes zwSolve/zwLibPump/zwLibStore/zwLibPaint.
- v69: (1) «♻️ صفر هدر» library card → `ui.pop = "zero"` (zw*: ZW_CANDS kitchen presets × 5-cm widths, zwUnit cache via scrapUnit/scrapGroups into pools carcass/front/back, zwPools from sheet counts,
  zwRun = 3 seeds grown by widen/add/swap/narrow+add moves evaluated in the cut worker (zwEval, timeCap 0.18–0.25, budget 14 s), results sorted by waste, thumbnails via thumbs.shot, zwAdd lines units up on the wall with the pools' libs; CSS .zwrow/.zwgrid).
  (2) illustrated minifix/dowel drilling guide: `alitaNums(u)` (assembly_* params), `alitaSvg` (joint section + 3-hole set plan, numbers in mm), `alitaGuideHtml` (6 steps, tap = voice) — in worker «التجميع» (data-walita), the assembly guide steps side1/top/side2, and the «مقاسات الأليتا» props section. CSS .alita/.alstep.
- v68: unit props open collapsed — `collapseProps(el)` on a fresh unit render (renderProps `!same`, not in shop mode) closes every top-level details except the size section (`DIMS_SEC`: المقاسات / المقاسات والنظام / الوحدة / 🍳 مقاسات); the open state still survives edits of the same unit.
- v67: (1) assembly order the NOVERA way: ASM_STEPS = first side + bottom → top → dividers → back slides in → second side closes the box → shelves → drawers → doors → finish;
  named indices `ASM.{side1,top,dividers,back,side2,shelves,drawers,doors,finish}` used by asmStep/layoutTables/asmProps; `lastSide(tail)` = شمال / حيطة ب / الثانية; STEP_ICON indexed by st.i.
  (2) speech: `sayPrep` (Egyptian number words `arWords/arNum` — 57.4 → «سبعة وخمسين وأربعة من عشرة», .5 → «ونص», 0.3 → «تلاتة ملي»; codes K01-08 → «كيه واحد، قطعة تمانية»; `AR_WORDS` vocalised workshop words with و/ب/ل prefixes),
  `sayAr(text, lang)` splits into sentences, `pickVoice` (saved name → ar-EG → enhanced/premium → ar-SA), prefs in localStorage `novera-voice` {name, rate, pitch}; worker bar 🎙️ pop `voicePopHtml` (voice select, speed, pitch, test, reset; CSS .wvpop); presentTell uses sayAr.
- v66: runner height follows `drawer_runner`: asmLayout drawers carry `runner` + `box0` (box bottom) and `run` = middle of the box side for side runners / box bottom for bottom runners;
  elevation label «مجرى جانبي/سفلي ↥N», worker «من جوه» row «↥ المجرى الجانبي (نص الجنب)» (+ «↥ تحت الصندوق») or «↥ المجرى السفلي (تحت الجنب)», voice + advanced table + text lines say which.
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
