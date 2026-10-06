import asyncio, base64, math, sys
from playwright.async_api import async_playwright
ROOM = "(() => { const s = window.__dbg.state; s.project.units = []; s.project.name = 'مطبخ — فيلا المنيا'; s.project.room = { pts: [[0,0],[460,0],[460,360],[0,360]], closed: true, walls: [1,2,3,4].map(i => ({ id: 'w'+i, t: 12, h: 290, flip: false })), openings: [{id:'o1', wall:'w4', kind:'door', w:90, h:220, sill:0, at:120}, {id:'o2', wall:'w2', kind:'window', w:120, h:120, sill:100, at:150}] }; window.__dbg.render(true); })()"
STYLE = """(() => { const s = window.__dbg.state; for (const u of s.project.units) { if (u.kind !== 'kitchen') continue; const t = (u.params||{}).unit_type; u.libs = { ...(u.libs||{}), front: t === 'wall' ? 'wood_oak_natural_v' : 'acrylic_cream' }; } s.whole = true; s.sel = null; s.render = true; window.__dbg.render(true); })()"""
async def shot(pg, name):
    await pg.screenshot(path=f"cap/{name}.png", timeout=90000); print("cap", name, flush=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width":1366,"height":1024})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://localhost:8795/"); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_selector('[data-hlast]', timeout=60000); await pg.wait_for_timeout(1500)
        await pg.evaluate("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]').click()"); await pg.wait_for_timeout(2500)
        await pg.evaluate(ROOM); await pg.wait_for_timeout(800)
        await pg.evaluate("window.__dbg.applyK(window.__dbg.ak('lux')[1].units)"); await pg.wait_for_timeout(1500)
        await pg.evaluate(STYLE); await pg.wait_for_timeout(3000)
        what = sys.argv[1] if len(sys.argv) > 1 else "all"
        if what in ("all", "screens"):
            await pg.click('[data-step0="room"]'); await pg.wait_for_timeout(3000); await shot(pg, "room")
            await pg.click('[data-step0="design"]'); await pg.wait_for_timeout(1500)
            await pg.evaluate("(() => { const s = window.__dbg.state; const u = s.project.units.find(x => /حوض/.test(x.name)); s.sel = u.id; s.whole = true; window.__dbg.render(true); })()"); await pg.wait_for_timeout(4000); await shot(pg, "design")
            await pg.evaluate("(() => { window.__dbg.ui.open = true; window.__dbg.render(true); })()"); await pg.wait_for_timeout(3500); await shot(pg, "design_open")
            await pg.evaluate("(() => { window.__dbg.ui.open = false; window.__dbg.render(true); })()")
            await pg.click('[data-step0="cut"]'); await pg.wait_for_timeout(7000); await shot(pg, "cut")
            await pg.click('[data-step0="price"]'); await pg.wait_for_timeout(4000); await shot(pg, "price")
            await pg.click('[data-step0="parts"]'); await pg.wait_for_timeout(4000); await shot(pg, "parts")
        if what in ("all", "screens", "rest"):
            await pg.click('[data-step0="design"]'); await pg.wait_for_timeout(2000)
            # assembly guide on the sink unit, step "top" (has joints)
            await pg.evaluate("(() => { const s = window.__dbg.state; const u = s.project.units.find(x => /حوض/.test(x.name)); s.sel = u.id; window.__dbg.ui.asm = { id: u.id, step: 0 }; window.__dbg.render(true); })()"); await pg.wait_for_timeout(4000)
            await pg.evaluate("document.querySelector('.jcard')?.scrollIntoView({block:'center'})"); await pg.wait_for_timeout(800); await shot(pg, "asm")
            el = pg.locator(".jcard").first
            if await el.count(): await el.screenshot(path="cap/jcard.png"); print("cap jcard")
            await pg.evaluate("(() => { window.__dbg.ui.asm = null; window.__dbg.render(true); window.__dbg.workerOn(); })()"); await pg.wait_for_timeout(4000); await shot(pg, "worker")
            # open a piece card in worker mode
            await pg.evaluate("(() => { const b = document.querySelector('#workerBar [data-wpart], #workerBar .wplist button, #workerBar li'); b && b.click(); })()"); await pg.wait_for_timeout(2500); await shot(pg, "worker_piece")
            await pg.evaluate("window.__dbg.workerOff()"); await pg.wait_for_timeout(1500)
            await pg.click('#menuBtn'); await pg.wait_for_timeout(800); await pg.click('[data-menu="survey"]'); await pg.wait_for_timeout(2500); await shot(pg, "survey")
        if what == "price":
            await pg.click('[data-step0="cut"]'); await pg.wait_for_timeout(7000)
            print(await pg.evaluate("""(() => { const P = window.__dbg.state.prices ??= {}; const cd = window.__dbg.cutData; const gs = cd.groups || cd.results || [];
              P.sheets = P.sheets || {}; const out = [];
              for (const g of gs) { const n = (g.name || g.label || g.lib || g.key || '') + ''; const v = /أكريليك|اكريليك/.test(n) ? 4200 : /6 مم|ظهر/.test(n) ? 450 : /(^|[^0-9])8 مم/.test(n) ? 650 : 1650; P.sheets[g.key] = v; out.push([g.key, n, v]); }
              Object.assign(P, { band: 14, laborUnit: 650, transport: 1500, install: 2500, margin: 35, waste: 10, defaultSheet: 1650 });
              return out; })()"""))
            await pg.click('[data-step0="price"]'); await pg.wait_for_timeout(5000); await shot(pg, "price")
            await pg.evaluate("window.scrollTo(0,0)")
        if what in ("all", "orbit"):
            n = 24; cx, cz = 230, 120
            for i in range(n):
                a = math.radians(205 + 50 * i / (n - 1))   # sweep around the L
                r = 330
                px, pz = cx + r * math.cos(a) * -1, cz + r * math.sin(a) * -1
                px, pz = 230 + 300 * math.sin(math.radians(-35 + 70 * i / (n - 1))), 330 + 10 * math.cos(math.radians(70 * i / (n - 1)))
                url = await pg.evaluate(f"""(() => {{ const v = window.__dbg.view, c = v.cam; c.fov = 50; c.position.set({px},{165 - 12 * i / n},{pz}); v.ctl.target.set(230, 105, 40); c.lookAt(v.ctl.target); c.near = 5; c.updateProjectionMatrix(); return v.snapshot(1440, 900, false, false); }})()""")
                open(f"orbit/o{i:03d}.png", "wb").write(base64.b64decode(url.split(",")[1]))
            print("orbit done", flush=True)
        print("errors", errs[:5]); await b.close()
asyncio.run(main())
