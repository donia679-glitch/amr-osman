import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8844"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8844/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.openStudio(null)"); await W(2500)
    await ev("document.querySelector('[data-cab=\"add\"]').click()"); await W(800)
    await ev("document.querySelector('[data-cab=\"adddiv\"]').click()"); await W(500)
    await ev("document.querySelector('[data-cab=\"addhdiv\"]').click()"); await W(500)
    await ev("document.querySelector('[data-cab=\"each:door1\"]').click()"); await W(600)
    await ev("const s=document.querySelector('[data-cf=\"cav.0:0\"]'); s.value='drawers'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(600)
    await ev("document.querySelector('[data-ds=\"done\"]').click()"); await W(2500)
    r = await ev("""(()=>{const u=window.__dbg.state.project.units[0]; const r=window.__dbg.R(u); return {movers:r.movers.map(m=>m.kind+':'+m.name), parts:r.parts.filter(p=>p.cut_piece).map((p,i)=>p.name+'/'+p.role+'/'+(r.partMover[r.parts.indexOf(p)])).filter(x=>/ضلفة|درج/.test(x))}})()""")
    print(json.dumps(r, ensure_ascii=False))
    await ev("window.__dbg.view.setOpen(true, false)"); await W(500)
    print("view movers", await ev("window.__dbg.view.movers.map(g=>g.userData.mv.name+':'+g.children.length+':'+(g.matrix.elements.map(v=>Math.round(v*100)/100).join(',')!=='1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1'))"))
    await pg.screenshot(path="open.png")
    await b.close()
asyncio.run(main()); srv.terminate()
