import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8832"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    await pg.goto("http://localhost:8832/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.cutOpts.sheetH=100; window.__dbg.state.libOpen=true; window.__dbg.render(true)"); await W(1500)
    print(await ev("(()=>{const L=window.__dbg.zwLibStore(); return {keys:Object.keys(L.st.items).length, sig:L.st.sig, shipped:L.st.shipped, ls: !!localStorage.getItem('novera-zwlib'), btn: document.querySelector('[data-zwcompute]').outerHTML}})()"))
    await b.close()
asyncio.run(main()); srv.terminate()
