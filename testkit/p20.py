import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8820"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8820/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base_drawers'}); window.__dbg.libAdd({kitchen:'k_base2'}); window.__dbg.libAdd({dress:'d_basic'})"); await W(1500)
    print(await ev("window.__dbg.state.project.units.map(u=>u.name)"))
    await ev("window.__dbg.workerOn()"); await W(2000)
    for ui in range(3):
      await ev(f"document.querySelectorAll('[data-wunit]')[{ui}].click()"); await W(700)
      await ev("document.querySelector('[data-wtab=\"steps\"]').click()"); await W(600)
      st = await ev("[...document.querySelectorAll('.wstep')].map(b=>b.querySelector('small').textContent+' ['+b.querySelector('em').textContent+']')")
      print(ui, json.dumps(st, ensure_ascii=False))
      if ui==1:
        for k in range(5):
          await ev(f"document.querySelector('[data-wstep=\"{k}\"]').click()"); await W(900)
          print("  step",k, json.dumps(await ev("[...document.querySelectorAll('.wcodeb')].map(b=>b.textContent)"), ensure_ascii=False))
          await pg.screenshot(path=f"asm_{k}.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
