import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8811"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8811/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: print("ctx", e)
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_pullout30'}); window.__dbg.libAdd({kitchen:'k_turbo_drawers'}); window.__dbg.libAdd({kitchen:'k_pullout_tall'})"); await W(2500)
    r = await ev("""(()=>{const U=window.__dbg.state.project.units; const o={}; for(const u of U){const R=window.__dbg.R(u); o[u.name]={ok:R.ok,err:R.errors,hw:R.hardware, movers:(R.movers||[]).map(m=>m.name+':'+m.kind), parts:R.parts.map(p=>p.name+' '+Math.round(p.label.w*10)/10+'x'+Math.round(p.label.h*10)/10)};} return JSON.stringify(o)})()""")
    print(r)
    for i,nm in [(0,'pullout.png')]:
      await ev(f"window.__dbg.state.sel=window.__dbg.state.project.units[{i}].id; window.__dbg.render(true)"); await W(600)
      await ev("window.__dbg.view.setOpen(true); window.__dbg.view.preset('iso')"); await W(1500)
      await pg.screenshot(path=nm)
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
