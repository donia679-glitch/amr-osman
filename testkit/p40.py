import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8842"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    pg.on("dialog", lambda d: asyncio.ensure_future(d.accept("علبة")))
    await pg.goto("http://localhost:8842/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.openStudio(null)"); await W(2500)
    await ev("document.querySelector('[data-cab=\"add\"]').click()"); await W(800)
    await ev("document.querySelector('[data-cab=\"adddiv\"]').click()"); await W(500)
    await ev("document.querySelector('[data-cab=\"addhdiv\"]').click()"); await W(500)
    await ev("document.querySelector('[data-ds=\"done\"]').click()"); await W(2500)
    await ev("window.__dbg.workerOn()"); await W(1500)
    await ev("document.querySelector('[data-wunit]').click()"); await W(600)
    await ev("document.querySelector('[data-wtab=\"inside\"]').click()"); await W(800)
    print(json.dumps(await ev("[...document.querySelectorAll('.wirow')].map(r=>r.textContent.replace(/\\s+/g,' ')).filter(t=>/قاطوع/.test(t))"), ensure_ascii=False))
    await ev("document.querySelector('.wb-body').scrollTop=600"); await W(300)
    await pg.screenshot(path="worker_div.png")
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
