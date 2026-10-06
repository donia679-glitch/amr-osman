import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8840"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    pg.on("dialog", lambda d: asyncio.ensure_future(d.accept("علبة مطبخ 60")))
    await pg.goto("http://localhost:8840/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.openStudio(null)"); await W(2500)
    await ev("document.querySelector('[data-cab=\"add\"]').click()"); await W(1000)
    await ev("document.querySelector('[data-cab=\"whole:door2\"]').click()"); await W(600)
    await ev("document.querySelector('[data-ds=\"cablib\"]').click()"); await W(1200)
    print("myUnits", await ev("(window.__dbg.state.myUnits||[]).map(u=>u.label+' '+u.pieces+' cabs:'+(u.params?.model?.cabs||[]).length)"))
    await ev("document.querySelector('[data-ds=\"cancel\"]').click()"); await W(800)
    await ev("window.__dbg.state.libOpen=true; window.__dbg.render(true)"); await W(2500)
    print("card", await ev("!!document.querySelector('[data-myunit]')"), "thumb", await ev("!!document.querySelector('[data-myunit] img.th')?.src"))
    await pg.screenshot(path="mylib.png")
    await ev("document.querySelector('[data-myunit]').click()"); await W(1500)
    print("units", await ev("window.__dbg.state.project.units.map(u=>u.name+' '+(window.__dbg.R(u).pieces))"))
    # reopen in studio: the cab editor should come back
    await ev("document.querySelector('#drawBtn').click()"); await W(2500)
    print("cabs in studio", await ev("window.__ds.M().cabs.length"), await ev("!!document.querySelector('[data-cab=\"regen\"]') || !!document.querySelector('[data-cab=\"add\"]')"))
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
