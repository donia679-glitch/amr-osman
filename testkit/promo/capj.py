import asyncio
from playwright.async_api import async_playwright
exec(open('capture.py').read().split('async def shot')[0])  # ROOM, STYLE
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width":1366,"height":1024}, device_scale_factor=2)
        await pg.goto("http://localhost:8795/"); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_selector('[data-hlast]', timeout=90000); await pg.wait_for_timeout(1500)
        await pg.evaluate("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]').click()"); await pg.wait_for_timeout(2500)
        await pg.evaluate(ROOM); await pg.wait_for_timeout(800)
        await pg.evaluate("window.__dbg.applyK(window.__dbg.ak('lux')[1].units)"); await pg.wait_for_timeout(1500)
        await pg.evaluate(STYLE); await pg.wait_for_timeout(2000)
        await pg.evaluate("(() => { const s = window.__dbg.state; s.render = false; const u = s.project.units.find(x => /حوض/.test(x.name)); s.sel = u.id; s.whole = false; window.__dbg.ui.asm = { id: u.id, step: 0 }; window.__dbg.render(true); })()"); await pg.wait_for_timeout(4000)
        await pg.evaluate("document.querySelector('.jcard')?.scrollIntoView({block:'start'})"); await pg.wait_for_timeout(800)
        await pg.evaluate("document.querySelectorAll('canvas').forEach(c => c.style.display='none')"); await pg.wait_for_timeout(500)
        el = pg.locator(".jcard").first
        bb = await el.bounding_box(); print(bb)
        await pg.screenshot(path="cap/jcard2.png", clip={"x": bb["x"], "y": bb["y"], "width": bb["width"], "height": min(bb["height"], 1024 - bb["y"])}, timeout=120000); print("ok")
        await b.close()
asyncio.run(main())
