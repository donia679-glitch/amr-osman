import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
I = json.load(open(sys.argv[1])); keys=list(I)
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8863"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1400, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8863/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1500)
    units=[{"id":f"n{i}","kind":"panel","name":I[k]["label"],"params":I[k]["params"]} for i,k in enumerate(keys)]
    await ev(f"window.__dbg.state.project.units={json.dumps(units, ensure_ascii=False)}; window.__dbg.state.sel='n0'")
    await ev("document.querySelector('#fsBtn')?.click()"); await W(500)
    DIRS=[[0.42,0.48,1],[-0.35,0.2,1],[0.3,0.12,1]]
    for i,k in enumerate(keys):
      await ev(f"window.__dbg.state.whole=false; window.__dbg.state.render=true; window.__dbg.state.sel='n{i}'; window.__dbg.render(true)"); await W(1300); await ev("document.querySelector('#errs') && (document.querySelector('#errs').style.visibility='hidden')")
      await ev("window.__dbg.view.preset('iso'); window.__dbg.view.preset('fit')"); await W(500)
      await ev("""(()=>{const v=window.__dbg.view, t=v.ctl.target, c=v.cam.position, d=c.distanceTo(t)*0.95; const dir="""+json.dumps(DIRS[i])+"""; const n=Math.hypot(...dir); c.set(t.x+dir[0]/n*d, t.y+dir[1]/n*d, t.z+dir[2]/n*d); v.cam.lookAt(t); v.ctl.update?.(); v.dirty=true;})()"""); await W(1100)
      box = await ev("(()=>{const r=document.querySelector('#view3d').getBoundingClientRect(); return [r.x,r.y,r.width,r.height]})()")
      await pg.screenshot(timeout=90000, path=f"new10/r_{i}.png", clip={"x":box[0],"y":box[1],"width":box[2],"height":box[3]})
    print(errs[:3])
    await b.close()
asyncio.run(main()); srv.terminate()
