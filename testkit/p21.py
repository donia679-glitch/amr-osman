import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8821"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8821/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base_drawers'})"); await W(1500)
    await ev("window.__dbg.workerOn()"); await W(2000)
    await ev("document.querySelector('[data-wvset]').click()"); await W(600)
    print("pop", await ev("!!document.querySelector('.wvpop')"))
    await pg.screenshot(path="voicepop.png")
    # sayPrep samples through a worker say: capture utterances
    await ev("window.__said=[]; speechSynthesis.speak = (m)=>window.__said.push(m.text); speechSynthesis.cancel=()=>{}")
    await ev("document.querySelector('[data-wvtest]').click()"); await W(300)
    print(json.dumps(await ev("window.__said"), ensure_ascii=False))
    await ev("window.__said=[]; document.querySelector('[data-wvclose]').click()"); await W(300)
    await ev("document.querySelector('[data-wunit]').click()"); await W(600)
    await ev("document.querySelector('[data-wtab=\"inside\"]').click()"); await W(600)
    await ev("document.querySelectorAll('.wirow')[1]?.click()"); await W(300)
    print(json.dumps(await ev("window.__said"), ensure_ascii=False))
    await ev("window.__said=[]; document.querySelector('[data-wtab=\"pieces\"]').click()"); await W(500)
    await ev("document.querySelector('[data-wvoice]').click(); document.querySelector('[data-wpiece]').click()"); await W(500)
    print(json.dumps(await ev("window.__said"), ensure_ascii=False))
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
