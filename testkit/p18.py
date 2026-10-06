import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8816"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8816/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base_drawers'}); window.__dbg.libAdd({kitchen:'k_wall2'})"); await W(1500)
    await ev("document.documentElement.dataset.theme='dark'"); await W(300)
    await ev("window.__dbg.workerOn()"); await W(2500)
    print("bar", await ev("!!document.querySelector('#workerBar')"), await ev("document.body.classList.contains('worker')"))
    await pg.screenshot(path="worker1.png")
    await ev("document.querySelector('[data-wunit]').click()"); await W(1000)
    await ev("document.querySelector('[data-wpiece]').click()"); await W(800)
    await pg.screenshot(path="worker2.png")
    for tab in ["inside","drawings","hardware","steps","install"]:
      await ev(f"document.querySelector('[data-wtab=\"{tab}\"]').click()"); await W(700)
      if tab=="steps": await ev("document.querySelector('[data-wstep=\"1\"]').click()"); await W(1200)
      if tab=="inside": await ev("document.querySelector('.wb-body').scrollTop=520"); await W(300)
      await pg.screenshot(path=f"worker_{tab}.png")
    # tap a piece in 3D: center of the view
    await ev("document.querySelector('[data-wtab=\"pieces\"]').click()"); await W(500)
    rc = await ev("(()=>{const r=document.querySelector('#view3d canvas').getBoundingClientRect(); return [r.left+r.width*0.5, r.top+r.height*0.55]})()")
    await pg.mouse.click(rc[0], rc[1]); await W(900)
    print("piece after tap:", await ev("window.__dbg.ui.worker?.piece"))
    await ev("document.querySelector('[data-wexit]').click()"); await W(800)
    print("exit", await ev("document.body.classList.contains('worker')"), await ev("!!document.querySelector('#workerBar')"))
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
