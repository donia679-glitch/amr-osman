import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8851"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8851/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.openStudio(null)"); await W(2500)
    await ev("document.querySelector('[data-cab=\"add\"]').click()"); await W(800)
    await ev("window.__ds.setTool('select')"); await W(200)
    pt = await ev("""(()=>{const s=window.__ds.M().solids.find(x=>x.name==='جنب يمين'); const G=window.__ds.G; const b=G.solidBox(s); return window.__ds.scr([b.x1,(b.y0+b.y1)/2,(b.z0+b.z1)/2])})()""")
    await ev(f"window.__ds.click({pt[0]},{pt[1]})"); await W(600)
    print("sel present", await ev("!!document.querySelector('.dsbox.focus [data-sp=\"lib\"]')"))
    await ev("const s=document.querySelector('.dsbox.focus [data-sp=\"lib\"]'); s.value='hpl_white'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(600)
    print("lib", await ev("window.__ds.M().solids.find(x=>x.name==='جنب يمين').lib"))
    await ev("const s=document.querySelector('[data-cf=\"W\"]'); s.value='70'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(600)
    print("lib after regen", await ev("window.__ds.M().solids.find(x=>x.name==='جنب يمين').lib"))
    await ev("document.querySelector('[data-ds=\"done\"]').click()"); await W(2500)
    print("matOv", await ev("JSON.stringify(window.__dbg.state.project.units[0].matOv)"), await ev("window.__dbg.projectPieces().filter(p=>/جنب يمين/.test(p.pt.name)).map(p=>p.mname)"))
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
