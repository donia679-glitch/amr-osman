import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8825"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8825/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.state.libOpen=true; window.__dbg.render(true)"); await W(1000)
    print("cards", await ev("document.querySelectorAll('[data-zwlib]').length"))
    # wait for the first 2 library items
    t0=time.time()
    for _ in range(90):
      await W(1000)
      n = await ev("Object.keys(window.__dbg.ui.zwLib?.st?.items||{}).length")
      if n>=2: break
    print("lib items", n, "secs", round(time.time()-t0,1))
    items = await ev("window.__dbg.ui.zwLib.st.items")
    for k,v in items.items():
      print(k, [(round(x['waste']*100,1), x['used'], [q['k']+':'+str(q['w'])+'+'+str(q['sh']) for q in x['set']]) for x in v['list'][:2]], v.get('secs'))
    await ev("document.querySelector('#lib').scrollTop = document.querySelector('.zwlib').offsetTop - 80"); await W(500)
    await pg.screenshot(path="zwlib.png")
    await ev("document.querySelector('[data-zwlib=\"k2\"]').click()"); await W(1500)
    await pg.screenshot(path="zwlib_pop.png")
    print(await ev("[...document.querySelectorAll('.zwcard b')].map(b=>b.textContent)"))
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
