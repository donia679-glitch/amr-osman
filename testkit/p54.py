import asyncio, subprocess, sys, time
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8858"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
keys = ["blk_side_c_interlock","blk_coffee_glass_walnut","blk_coffee_z_frame","blk_coffee_nested","blk_night_drawer_frame","blk_coffee_float_dark","blk_coffee_plinth_slab","blk_tv_stepped","blk_tv_long_nested","blk_side_cube","blk_night_float_open","blk_coffee_two_L","blk_console_offset"]
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1400, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8858/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1500)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.state.sel=null")
    for k in keys: await ev(f"window.__dbg.libAdd({{preset:'{k}'}})"); await W(200)
    await ev("document.querySelector('#fsBtn')?.click()"); await W(500)
    for i,k in enumerate(keys):
      await ev(f"window.__dbg.state.whole=false; window.__dbg.state.render=true; window.__dbg.state.sel=window.__dbg.state.project.units[{i}].id; window.__dbg.render(true)"); await W(2200)
      await ev("window.__dbg.view.preset('iso'); window.__dbg.view.preset('fit'); window.__dbg.view.zoom(1.15)"); await W(1200)
      box = await ev("(()=>{const r=document.querySelector('#view3d').getBoundingClientRect(); return [r.x,r.y,r.width,r.height]})()")
      await pg.screenshot(path=f"lib/p54_{i}.png", clip={"x":box[0],"y":box[1],"width":box[2],"height":box[3]})
    print(errs[:3])
    await b.close()
asyncio.run(main()); srv.terminate()
