import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8824"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8824/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base2'})"); await W(1500)
    await ev("window.__dbg.workerOn()"); await W(1500)
    await ev("document.querySelector('[data-wunit]').click()"); await W(600)
    await ev("document.querySelector('[data-wtab=\"steps\"]').click()"); await W(600)
    await ev("document.querySelector('[data-walita]').click()"); await W(800)
    await ev("document.querySelector('.wb-body').scrollTop=330"); await W(300)
    await pg.screenshot(path="alita1.png")
    await ev("document.querySelector('.wb-body').scrollTop=820"); await W(300)
    await pg.screenshot(path="alita2.png")
    await ev("document.querySelector('[data-wexit]').click()"); await W(600)
    # props section
    await ev("document.querySelector('[data-padv=\"1\"]').click()"); await W(500)
    ok = await ev("(()=>{const d=[...document.querySelectorAll('#props details')].find(x=>/شرح مصور لخرم/.test(x.querySelector('summary')?.textContent)); if(!d) return 'none'; d.open=true; d.closest('details').open=true; return !!d.querySelector('svg')})()")
    print("props guide", ok)
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
