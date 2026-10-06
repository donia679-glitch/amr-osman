import asyncio, subprocess, sys, time
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8856"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    await pg.goto("http://localhost:8856/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1500)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.state.sel=null; window.__dbg.libAdd({preset:'blk_coffee_glass_walnut'}); window.__dbg.libAdd({preset:'blk_coffee_z_frame'})"); await W(500)
    await ev("window.__dbg.state.whole=false; window.__dbg.state.render=true; window.__dbg.render(true)"); await W(2500)
    await ev("window.__dbg.view.preset('iso')"); await W(1200)
    await pg.screenshot(path='lib/p51.png', clip={'x':340,'y':100,'width':660,'height':720}); await ev("window.__dbg.state.sel=window.__dbg.state.project.units[1].id; window.__dbg.render(true)"); await W(2500); await ev("window.__dbg.view.preset('iso')"); await W(1200); await pg.screenshot(path='lib/p52.png', clip={'x':340,'y':100,'width':660,'height':720})
    await b.close()
asyncio.run(main()); srv.terminate()
