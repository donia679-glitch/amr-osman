import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8839"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8839/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.openStudio(null)"); await W(2500)
    await ev("document.querySelector('[data-cab=\"add\"]').click()"); await W(1000)
    await ev("document.querySelector('[data-cab=\"adddiv\"]').click()"); await W(600)
    await ev("window.__ds.setTool('select')"); await W(300)
    # tap the right side piece: project the centre of its outer face
    pt = await ev("""(()=>{const s=window.__ds.M().solids.find(x=>x.name==='جنب يمين'); const G=window.__ds.G; const b=G.solidBox(s); const P=[b.x1, (b.y0+b.y1)/2, (b.z0+b.z1)/2]; return window.__ds.scr(P)})()""")
    await ev(f"window.__ds.click({pt[0]},{pt[1]})"); await W(700)
    print("focus", await ev("JSON.stringify(window.__ds.ui.cabFocus)"), "panel", await ev("document.querySelector('.dsbox.focus b')?.textContent"))
    await pg.screenshot(path="focus1.png")
    # tap the cavity pane of cavity 0:1 (right column)
    pt = await ev("""(()=>{const c=window.__ds.curCab(); const cv=window.__ds.Cab.cavities(c).find(q=>q.key==='0:1'); const P=[c.pos[0]+(cv.x0+cv.x1)/2, c.pos[1]+0.6, c.pos[2]+(cv.z0+cv.z1)/2]; return window.__ds.scr(P)})()""")
    await ev(f"window.__ds.click({pt[0]},{pt[1]})"); await W(700)
    await ev("document.documentElement.dataset.theme='dark'"); await W(200)
    await ev("document.querySelector('[data-cab=\"addvpart:0:1\"]').click()"); await W(700)
    print("vparts", await ev("JSON.stringify(window.__ds.curCab().vparts)"), await ev("window.__ds.M().solids.filter(s=>s.role==='partition').map(s=>s.name)"))
    print("focus2", await ev("JSON.stringify(window.__ds.ui.cabFocus)"), "panel", await ev("document.querySelector('.dsbox.focus b')?.textContent"))
    await pg.screenshot(path="focus2.png")
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
