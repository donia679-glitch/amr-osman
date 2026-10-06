import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8812"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8812/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({dress:'d_glass_drawers90'}); window.__dbg.libAdd({preset:'app_chest_double'})"); await W(2500)
    await ev("window.__dbg.setParams(window.__dbg.state.project.units[1], p=>{p.fronts[0].glass=true})"); await W(1000)
    r = await ev("""(()=>{const U=window.__dbg.state.project.units; const o={}; for(const u of U){const R=window.__dbg.R(u); const mv=R.movers||[]; const of=R.of||R.partMover||null; o[u.name]={movers:mv.map(m=>m.kind+':'+m.name+':'+Math.round(m.slide)), frames:R.parts.filter(p=>/فريم|زجاج/.test(p.name)).map(p=>p.name+'→'+(p.mover??p.mv??'?'))};} return JSON.stringify(o)})()""")
    print(r)
    await ev("window.__dbg.state.sel=window.__dbg.state.project.units[0].id; window.__dbg.render(true)"); await W(600)
    await ev("window.__dbg.view.setOpen(true)"); await W(1500); await pg.screenshot(path="glassopen.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
