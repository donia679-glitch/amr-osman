import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8830"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8830/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.state.libOpen=true; window.__dbg.render(true)"); await W(2500)
    print("shipped", await ev("window.__dbg.zwLibStore().st.shipped"), "ready cards", await ev("document.querySelectorAll('[data-zwlib].ready').length"), "busy", await ev("window.__dbg.zwLibStore().busy"), "btn hidden", await ev("document.querySelector('[data-zwcompute]').hidden"))
    await ev("document.querySelector('#lib').scrollTop = document.querySelector('.zwlib').offsetTop - 120"); await W(800)
    await pg.screenshot(path="zwlib2.png")
    await ev("document.querySelector('[data-zwlib=\"k6\"]').click()"); await W(1500)
    print(await ev("[...document.querySelectorAll('.zwcard b')].map(b=>b.textContent)"))
    await pg.screenshot(path="zwlib2_pop.png")
    # different sheet size → button visible, nothing computes by itself
    await ev("document.querySelector('[data-close]').click()"); await W(300)
    await ev("window.__dbg.state.cutOpts.sheetH=100; window.__dbg.state.libOpen=true; window.__dbg.render(true)"); await W(1500)
    print("other sheet: shipped", await ev("window.__dbg.zwLibStore().st.shipped"), "btn", await ev("document.querySelector('[data-zwcompute]').hidden"), await ev("document.querySelector('[data-zwcompute]').textContent"))
    await W(4000); print("busy after 4s", await ev("window.__dbg.zwLibStore().busy"))
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
