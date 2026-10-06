import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8810"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8810/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: print("ctx", e)
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    await ev("import('./room.js').then(R=>{const s=window.__dbg.state; s.project.room=R.presetRoom('rect',{w:400,d:300}); window.__dbg.render(true)})"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base2'}); window.__dbg.libAdd({kitchen:'k_cooker_gap'}); window.__dbg.libAdd({kitchen:'k_base_drawers'}); window.__dbg.libAdd({kitchen:'k_wall_hood_in'})"); await W(2500)
    r = await ev("""(()=>{const U=window.__dbg.state.project.units; const o={}; for(const i of [1,3]){const u=U[i], R=window.__dbg.R(u); o[u.name]={ok:R.ok,err:R.errors,parts:R.parts.map(p=>p.name+' '+p.label.w+'x'+p.label.h+'x'+p.label.t+(p.label.note?' ['+p.label.note.slice(0,60)+']':''))};} o.checks=window.__dbg.checks().filter(c=>/بوتجاز|شفاط|غاز/.test(c.text)).map(c=>c.level+' '+c.text); return JSON.stringify(o)})()""")
    print(r)
    await ev("window.__dbg.state.whole=false; window.__dbg.state.sel=window.__dbg.state.project.units[1].id; window.__dbg.render(true)"); await W(1500)
    await pg.screenshot(path="cooker.png")
    await ev("window.__dbg.state.sel=window.__dbg.state.project.units[3].id; window.__dbg.render(true)"); await W(600)
    await ev("window.__dbg.state.xray=false; window.__dbg.render(true); window.__dbg.view.preset('front')"); await W(1500)
    await pg.screenshot(path="hoodin.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
