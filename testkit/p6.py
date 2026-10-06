import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8804"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8804/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    # manual mode
    await ev("""window.__dbg.ui.scrap={src:'manual',keys:[],manual:[{w:120,h:60,n:3,t:1.8,lib:'hpl_white'},{w:100,h:50,n:2,t:1.8,lib:'wood_oak_natural_v'},{w:244,h:40,n:1,t:1.8,lib:''}],res:null,busy:false}; window.__dbg.ui.pop='scrap'; window.__dbg.renderPop()"""); await W(300)
    t0=time.time(); await ev("document.querySelector('[data-scrun]').click()")
    for i in range(60):
        await W(1000)
        if await ev("!!window.__dbg.ui.scrap.res"): break
    print("took", round(time.time()-t0,1), "s")
    r = await ev("JSON.stringify({ok: window.__dbg.ui.scrap.res.ok.map(x=>[x.u.name, x.pieces, Math.round(x.util*100), x.plan.map(p=>p.role+'<'+p.pool.name)]), near: window.__dbg.ui.scrap.res.near.map(x=>x.u.name), tried: window.__dbg.ui.scrap.res.tried, jobs: window.__dbg.ui.scrap.res.jobs})")
    print(r[:1500])
    await W(1500); await pg.screenshot(path="scrap.png", full_page=False)
    n0 = await ev("window.__dbg.state.project.units.length")
    await ev("document.querySelector('[data-scadd2]')?.click()"); await W(1500)
    print("added", await ev("window.__dbg.state.project.units.length") - n0, await ev("JSON.stringify((u=>[u.name,u.libs,u.params.carcass_material_name||u.params.materials])(window.__dbg.state.project.units.at(-1)))"))
    # stock mode
    await ev("""window.__dbg.state.stock={'NOVERA - HPL أبيض — 18 مم':{sheets:0,remnants:[{id:'a',w:120,h:60},{id:'b',w:90,h:45},{id:'c',w:200,h:35}]},'NOVERA - HPL رمادي — 18 مم':{sheets:0,remnants:[{id:'d',w:70,h:70},{id:'e',w:60,h:40}]}}""")
    await ev("window.__dbg.ui.scrap={src:'stock',keys:['NOVERA - HPL أبيض — 18 مم','NOVERA - HPL رمادي — 18 مم'],manual:[],res:null,busy:false}; window.__dbg.ui.pop='scrap'; window.__dbg.renderPop()"); await W(300)
    await ev("document.querySelector('[data-scrun]').click()")
    for i in range(60):
        await W(1000)
        if await ev("!!window.__dbg.ui.scrap.res"): break
    print((await ev("JSON.stringify(window.__dbg.ui.scrap.res.ok.map(x=>[x.u.name, x.plan.map(p=>p.role+'<'+p.pool.name+'/'+p.pool.lib)]))"))[:800])
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
