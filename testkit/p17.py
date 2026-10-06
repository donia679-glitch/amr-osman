import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8815"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8815/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base2'})"); await W(1500)
    await ev("window.__dbg.state.sel=window.__dbg.state.project.units[0].id; window.__dbg.render(true)"); await W(600); await ev("document.querySelector('[data-tostudio]').click()"); await W(3000)
    print("solids", await ev("window.__ds.M().solids.length"))
    # pick mode buttons exist?
    print("pick btns", await ev("[...document.querySelectorAll('[data-pmode]')].map(b=>b.dataset.pmode).join(',')"))
    # vertex mode: find a solid's top corner on screen and click near it
    r = await ev("""(()=>{const s=window.__ds.M().solids[0]; const G=window.__ds.G; const P=G.toWorld(s.plane, s.outer[0], s.depth); const sc=window.__ds.scr(P); return JSON.stringify({sc, outer:s.outer})})()""")
    print(r); d=json.loads(r); x,y=d["sc"][0],d["sc"][1]
    await ev("document.querySelector('[data-pmode=\"vertex\"]').click()"); await W(300)
    await ev(f"window.__ds.click({x},{y})"); await W(500)
    print("vertex", await ev("JSON.stringify(window.__ds.ui.vertex)"), "panel", await ev("!!document.querySelector('#vxX')"))
    # move the vertex by typing coordinates
    await ev("document.querySelector('#vxX').value=String((+document.querySelector('#vxX').value)+5); document.querySelector('[data-ds=\"vertexset\"]').click()"); await W(500)
    print("outer after", await ev("JSON.stringify(window.__ds.M().solids[0].outer)"))
    # edge mode
    await ev("document.querySelector('[data-pmode=\"edge\"]').click()"); await W(300)
    r = await ev("""(()=>{const s=window.__ds.M().solids[0]; const G=window.__ds.G; const A=G.toWorld(s.plane, s.outer[0], s.depth), B=G.toWorld(s.plane, s.outer[1], s.depth); const m=[(A[0]+B[0])/2,(A[1]+B[1])/2,(A[2]+B[2])/2]; return JSON.stringify(window.__ds.scr(m))})()""")
    x,y=json.loads(r)[:2]
    await ev(f"window.__ds.click({x},{y})"); await W(500)
    print("edge", await ev("JSON.stringify(window.__ds.ui.edge && {i:window.__ds.ui.edge.i, level:window.__ds.ui.edge.level})"), "len", await ev("document.querySelector('#edgeLen')?.value"))
    await ev("document.querySelector('#edgeLen').value='40'; document.querySelector('[data-ds=\"edgelen\"]').click()"); await W(500)
    print("outer after len", await ev("JSON.stringify(window.__ds.M().solids[0].outer)"))
    await pg.screenshot(path="studio_pick.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
