import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8831"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8831/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.state.libOpen=true; window.__dbg.render(true)"); await W(2500)
    print(await ev("(()=>{const L=window.__dbg.zwLibStore(); return {keys:Object.keys(L.st.items), sig:L.st.sig, card:document.querySelector('[data-zwlib=\"k2\"]').outerHTML.slice(0,300)}})()"))
    await b.close()
asyncio.run(main()); srv.terminate()
