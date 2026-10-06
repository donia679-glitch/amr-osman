import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8822"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8822/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base_drawers'}); window.__dbg.libAdd({dress:'d_basic'})"); await W(1500)
    for i in range(2):
      await ev(f"window.__dbg.state.sel = window.__dbg.state.project.units[{i}].id; window.__dbg.render(true)"); await W(800)
      print(json.dumps(await ev("[...document.querySelectorAll('#props > details')].filter(d=>!d.classList.contains('advhid')).map(d=>(d.open?'▼ ':'▶ ')+d.querySelector(':scope>summary').textContent.trim().slice(0,30))"), ensure_ascii=False))
      if i==0:
        await pg.screenshot(path="props_collapsed.png")
        # open a section, edit a field, check it stays open
        await ev("[...document.querySelectorAll('#props > details')].find(d=>/الواجهة/.test(d.querySelector('summary').textContent)).open=true"); await W(200)
        await ev("const u=window.__dbg.state.project.units[0]; window.__dbg.setParams(u,p=>{p.width=80}); window.__dbg.render(true)"); await W(800)
        print("after edit:", json.dumps(await ev("[...document.querySelectorAll('#props > details')].filter(d=>d.open).map(d=>d.querySelector(':scope>summary').textContent.trim().slice(0,20))"), ensure_ascii=False))
        await ev("document.querySelector('[data-padv=\"1\"]').click()"); await W(600)
        print("all mode:", json.dumps(await ev("[...document.querySelectorAll('#props > details')].filter(d=>d.open).map(d=>d.querySelector(':scope>summary').textContent.trim().slice(0,20))"), ensure_ascii=False))
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
