import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8837"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8837/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.openStudio(null)"); await W(2500)
    await ev("document.querySelector('[data-cab=\"add\"]').click()"); await W(1000)
    await ev("document.querySelector('[data-cab=\"adddiv\"]').click()"); await W(600)
    sel = lambda q, v: f"const s=document.querySelector('[data-cf=\"{q}\"]'); s.value='{v}'; s.dispatchEvent(new Event('change',{{bubbles:true}}))"
    await ev(sel("cav.0:0","split")); await W(800)
    print("zone", await ev("JSON.stringify(window.__ds.curCab().fronts)"))
    await ev(sel("cav.0:1","door1")); await W(600)
    await ev(sel("fronts.1.recess","4")); await W(600)
    await ev(sel("fronts.0.parts.0.size","25")); await W(600)
    print("fronts", await ev("window.__ds.M().solids.filter(s=>s.mat==='front').map(s=>s.name+' '+s.outer[2].map(v=>v.toFixed(1)).join('x')+' z'+s.plane.o[2].toFixed(1))"))
    await pg.screenshot(path="cab_split.png")
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
