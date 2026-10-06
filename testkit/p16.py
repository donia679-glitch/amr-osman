import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8814"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8814/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base_drawers'}); window.__dbg.libAdd({kitchen:'k_base2'})"); await W(2000)
    # oak fronts + carcass
    await ev("""(()=>{const U=window.__dbg.state.project.units; for(const u of U){u.libs={...(u.libs||{}), front:'wood_oak_natural', carcass:'wood_oak_light'}; window.__dbg.setParams(u,p=>{p.material_front_name='NOVERA - خشب أوك طبيعي'; p.material_carcass_name='NOVERA - خشب أوك فاتح';});} window.__dbg.render(true)})()"""); await W(1500)
    print("section:", await ev("!!document.querySelector('.grainbox')"), await ev("[...document.querySelectorAll('[data-grain]')].map(b=>b.dataset.grain+'='+b.dataset.gv+(b.classList.contains('on')?'*':'')).join(' ')"))
    await ev("window.__dbg.state.tab='cut'; window.__dbg.render(true)"); await ev("window.__dbg.cutReady()"); await W(500)
    r = await ev("""(()=>{const c=window.__dbg.cutData; const o={}; for(const g of c.groups){o[g.key]=g.parts.map(p=>p.name.split(': ')[1]+' '+Math.round(p.w)+'x'+Math.round(p.h)+(p.rotate===false?' lock':'')+(p.strip?' STRIP['+p.strip.map(s=>s.code).join(',')+']':''))} return JSON.stringify(o)})()""")
    print(r)
    await ev("document.querySelectorAll('.sheets')[2]?.scrollIntoView()"); await W(400)
    await pg.screenshot(path="cutgrain.png")
    # switch fronts to horizontal on unit 0 and re-check
    await ev("window.__dbg.state.tab='design'; window.__dbg.state.sel=window.__dbg.state.project.units[0].id; window.__dbg.render(true)"); await W(800)
    await ev("[...document.querySelectorAll('[data-grain]')].find(b=>b.dataset.grain==='fronts'&&b.dataset.gv==='h').click()"); await W(1000)
    await ev("window.__dbg.state.tab='cut'; window.__dbg.render(true)"); await ev("window.__dbg.cutReady()"); await W(500)
    print(await ev("""(()=>{const c=window.__dbg.cutData; return JSON.stringify(c.groups.map(g=>g.parts.filter(p=>/درج|الأدراج/.test(p.name)).map(p=>p.name.split(': ')[1]+' '+Math.round(p.w)+'x'+Math.round(p.h)+(p.strip?' STRIP':''))))})()"""))
    await ev("window.__dbg.state.tab='design'; window.__dbg.state.render=true; window.__dbg.render(true)"); await W(3000)
    await pg.screenshot(path="grain3d.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
