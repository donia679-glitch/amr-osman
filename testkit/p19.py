import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8819"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8819/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base_drawers'})"); await W(1500)
    await ev("document.documentElement.dataset.theme='dark'"); await W(300)
    for mode in ["bottom","side"]:
      await ev(f"const u=window.__dbg.state.project.units[0]; window.__dbg.setParams(u, p=>{{ p.drawer_runner='{mode}'; p.drawer_box_side_clearance={0.6 if mode=='bottom' else 2.6}; }})"); await W(1200)
      await ev("window.__dbg.workerOn()"); await W(2000)
      await ev("document.querySelector('[data-wunit]').click()"); await W(800)
      await ev("document.querySelector('[data-wtab=\"inside\"]').click()"); await W(800)
      txt = await ev("[...document.querySelectorAll('.wirow')].map(r=>r.textContent.replace(/\\s+/g,' ')).filter(t=>/المجرى|الصندوق/.test(t)).slice(0,6)")
      print(mode, json.dumps(txt, ensure_ascii=False))
      await ev("document.querySelector('.wb-body').scrollTop=0"); await pg.screenshot(path=f"runner_{mode}.png")
      await ev("document.querySelector('[data-wtab=\"drawings\"]').click()"); await W(800)
      print(" svg labels:", json.dumps(await ev("[...document.querySelectorAll('.wb-body svg text')].map(t=>t.textContent).filter(t=>/مجرى/.test(t))"), ensure_ascii=False))
      await ev("document.querySelector('[data-wexit]').click()"); await W(800)
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
