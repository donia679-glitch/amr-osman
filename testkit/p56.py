import asyncio, subprocess, sys, time
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8860"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
shots = [("blk_coffee_glass_walnut", [0.8, 0.72, 0.6], 0.85), ("blk_coffee_glass_walnut", [-0.8, 0.72, 0.6], 0.85), ("blk_coffee_glass_walnut", [0.6, 0.72, -0.8], 0.85), ("blk_coffee_glass_walnut", [-0.6, 0.72, -0.8], 0.85)]
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1400, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    await pg.goto("http://localhost:8860/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1500)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.state.sel=null")
    for k,_,_ in shots: await ev(f"window.__dbg.libAdd({{preset:'{k}'}})"); await W(200)
    await ev("document.querySelector('#fsBtn')?.click()"); await W(500)
    for i,(k,d,zm) in enumerate(shots):
      await ev(f"window.__dbg.state.whole=false; window.__dbg.state.render=true; window.__dbg.state.sel=window.__dbg.state.project.units[0].id; window.__dbg.render(true)"); await W(1500)
      await ev("window.__dbg.view.preset('iso'); window.__dbg.view.preset('fit')"); await W(600)
      await ev(f"""(()=>{{const v=window.__dbg.view, t=v.ctl.target, c=v.cam.position, d=c.distanceTo(t)*{zm}; const dir=[{d[0]},{d[1]},{d[2]}]; const n=Math.hypot(...dir); c.set(t.x+dir[0]/n*d, t.y+dir[1]/n*d, t.z+dir[2]/n*d); v.cam.lookAt(t); v.ctl.update?.(); v.dirty=true;}})()"""); await W(1200)
      box = await ev("(()=>{const r=document.querySelector('#view3d').getBoundingClientRect(); return [r.x,r.y,r.width,r.height]})()")
      await pg.screenshot(path=f"lib/p56_{i}.png", clip={"x":box[0],"y":box[1],"width":box[2],"height":box[3]})
    await b.close()
asyncio.run(main()); srv.terminate()
