import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8852"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8852/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.openStudio(null)"); await W(2500)
    # rect tool → plane buttons visible
    await ev("window.__ds.setTool('rect')"); await W(300)
    print("planes", await ev("document.querySelectorAll('[data-plane]').length"), "rectgo", await ev("!!document.querySelector('[data-ds=\"rectgo\"]')"))
    await ev("document.querySelector('[data-plane=\"front\"]').click()"); await W(300)
    print("plane", await ev("window.__ds.ui.plane"), await ev("document.querySelector('#dsPlane').value"))
    await ev("document.querySelector('#dsRw').value='60'; document.querySelector('#dsRh').value='72'; document.querySelector('[data-ds=\"rectgo\"]').click()"); await W(600)
    k = await ev("JSON.stringify(window.__ds.M().sketches.map(k=>({pl:k.plane, pts:k.pts})))"); print("sketch", k)
    await pg.screenshot(path="lib/p47a.png")
    # now rect from a tapped first corner on ground: tap at world point then type
    await ev("document.querySelector('[data-plane=\"ground\"]').click(); window.__ds.setTool('rect')"); await W(300)
    pt = await ev("window.__ds.scr([30,-20,0])"); await ev(f"window.__ds.click({pt[0]},{pt[1]})"); await W(400)
    print("after corner box:", await ev("document.querySelector('.dsdraw small')?.textContent"))
    await ev("document.querySelector('[data-rdir=\"1\"]').click()"); await W(200)
    await ev("document.querySelector('#dsRw').value='40'; document.querySelector('#dsRh').value='30'; document.querySelector('[data-ds=\"rectgo\"]').click()"); await W(600)
    print("sketch2", await ev("JSON.stringify(window.__ds.M().sketches.at(-1).pts)"))
    # extrude first sketch into a board, then move by distance
    await ev("window.__ds.ui.sel=new Set(['k:'+window.__ds.M().sketches[0].id]); window.__ds.setTool('select'); window.__ds.rebuild()"); await W(300)
    await ev("document.querySelector('[data-ds=\"extrude\"]')?.click()"); await W(600)
    print("solids", await ev("window.__ds.M().solids.length"))
    await ev("const s=window.__ds.M().solids[0]; window.__ds.ui.sel=new Set(['s:'+s.id]); window.__ds.rebuild()"); await W(300)
    before = await ev("JSON.stringify(window.__ds.G.solidBox(window.__ds.M().solids[0]))")
    print("mv box", await ev("!!document.querySelector('.dsmv')"))
    await ev("document.querySelector('#dsMvD').value='15'; document.querySelector('[data-mv=\"0,1\"]').click()"); await W(500)
    after = await ev("JSON.stringify(window.__ds.G.solidBox(window.__ds.M().solids[0]))")
    print("before", before); print("after ", after)
    # copy mode
    await ev("window.__ds.ui.copy=true; document.querySelector('[data-mv=\"2,1\"]').click()"); await W(500)
    print("solids after copy", await ev("window.__ds.M().solids.length"), await ev("document.querySelector('#dsMsg').textContent"))
    # move tool + typed distance in VCB
    await ev("window.__ds.ui.copy=false; window.__ds.setTool('move'); window.__ds.ui.sel=new Set(['s:'+window.__ds.M().solids[0].id]); window.__ds.rebuild()"); await W(300)
    b0 = await ev("window.__ds.G.solidBox(window.__ds.M().solids[0]).z0")
    pt = await ev("(()=>{const b=window.__ds.G.solidBox(window.__ds.M().solids[0]); return window.__ds.scr([(b.x0+b.x1)/2,b.y0,(b.z0+b.z1)/2])})()")
    await ev(f"window.__ds.click({pt[0]},{pt[1]})"); await W(400)
    print("holding:", await ev("document.querySelector('.dsmv small')?.textContent"))
    await ev("document.querySelector('#dsMvD').value='20'; document.querySelector('[data-mv=\"2,1\"]').click()"); await W(500)
    print("z0", b0, "→", await ev("window.__ds.G.solidBox(window.__ds.M().solids[0]).z0"))
    await pg.screenshot(path="lib/p47b.png")
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
