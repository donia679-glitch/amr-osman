import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8823"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8823/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.state.libOpen=true; window.__dbg.render(true)"); await W(1000)
    print("card", await ev("!!document.querySelector('[data-zero-lib]')"))
    await ev("document.querySelector('[data-zero-lib]').click()"); await W(800)
    await pg.screenshot(path="zw0.png")
    await ev("const i=document.querySelector('[data-zwn=\"carcass\"]'); i.value='2'; i.dispatchEvent(new Event('change',{bubbles:true}))"); await W(200)
    t0=time.time()
    await ev("document.querySelector('[data-zwrun]').click()")
    for _ in range(60):
      await W(1000)
      if await ev("!!window.__dbg.ui.zw?.res"): break
    print("secs", round(time.time()-t0,1))
    res = await ev("(()=>{const R=window.__dbg.ui.zw.res; return {tried:R.tried, secs:R.secs, list:R.list.map(x=>({waste:x.waste, used:x.used, n:x.set.length, names:x.set.map(i=>i.u.name)}))}})()")
    print(json.dumps(res, ensure_ascii=False, indent=1))
    await W(1500); await pg.screenshot(path="zw1.png", full_page=False)
    await ev("document.querySelector('[data-zwadd]').click()"); await W(2500)
    print("units", await ev("window.__dbg.state.project.units.length"))
    await pg.screenshot(path="zw2.png")
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
