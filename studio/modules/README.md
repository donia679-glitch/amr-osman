# NOVERA Studio — optional modules (v126)

Every feature here is a separate folder `modules/<dir>/` with an `index.js` whose **default export** is:

```js
export default {
  init(api, meta) {},          // called once when the switch is turned on (or at boot when it was on)
  destroy() {},                // switch turned off: remove anything you added to the DOM / timers
  slots: {                     // HTML strings dropped into the app (return "" when nothing to show)
    cut(),                     // the cut-plan screen, under the totals
    home(),                    // a tile in the home screen «ابدأ» grid  (<button class="htile" data-mod="id:act"><b>..</b><small>..</small></button>)
    menu(),                    // ☰ menu items (<button class="mitem" data-mod="id:act"><span class="mic">ic</span><span><b>t</b><small>d</small></span></button>)
    unit(u, r),                // the selected unit's settings panel (a <details> box)
    export(),                  // the export pop list (<button class="mrow" data-mod="id:act"><span><b>t</b><small class="wrap">d</small></span></button>)
  },
  cmd() { return [{ label, run, hint }]; },   // ⌘ command palette entries
  action(act, el) {},          // any element with data-mod="<id>:<act>" anywhere in the app lands here
};
```

Rules: a module never edits app.js or other modules; it reads/changes the project only through `api`
(see `modApi()` in app.js: state, R, setParams, save, render, cutGroups, runCut, cutCall (the cut worker),
quoteCalc, quickEstimate, libUnit, kitchenProposals, autoKitchen, applyKitchen, addVariant, designChecks,
ergoData, roomSegs, projectPoses, projectItems, wallSpan, crossSpans, qrSvg, warrantyUrl, deliver(file), popup({title, html}) …).
Registry helpers: `provide(name, fn, owner)` / `engine(name, localFn)` — the guard module serves engines from the server.
Module switches live in `state.modules[id]`; English for new strings goes in `modules/<dir>/en.add.json` (merged into i18n/en.json at release).
