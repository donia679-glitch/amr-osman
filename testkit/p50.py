import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8855"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8855/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1500)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.state.sel=null")
    keys = ["blk_side_c_interlock","blk_coffee_glass_walnut","blk_coffee_nested","blk_night_drawer_frame","blk_coffee_float_dark","blk_coffee_plinth_slab","blk_tv_stepped","blk_tv_long_nested","blk_side_cube","blk_night_float_open","blk_coffee_two_L","blk_console_offset"]
    for k in keys:
      await ev(f"window.__dbg.libAdd({{preset:'{k}'}})"); await W(300)
    print("units", await ev("window.__dbg.state.project.units.length"))
    await ev("window.__dbg.state.whole=false; window.__dbg.render(true)"); await W(500)
    for i,k in enumerate(keys):
      await ev(f"window.__dbg.state.sel=window.__dbg.state.project.units[{i}].id; window.__dbg.render(true)"); await W(900)
      r = await ev("(()=>{const u=window.__dbg.state.project.units.find(x=>x.id===window.__dbg.state.sel); const r=window.__dbg.R(u); return {ok:r.ok, parts:r.parts.filter(p=>p.cut_piece).length, movers:(r.movers||[]).length, err:r.errors, w:(r.checks||[]).filter(c=>c.level==='error').length}})()")
      print(k, r)
      await ev("window.__dbg.view.setOpen?.(true)"); await W(400)
      await pg.screenshot(path=f"lib/p50_{i}.png", clip={"x":340,"y":100,"width":660,"height":720})
      await ev("window.__dbg.view.setOpen?.(false)")
    # library group present?
    await ev("window.__dbg.state.libOpen=true; window.__dbg.render(true)"); await W(1500)
    print("lib group", await ev("[...document.querySelectorAll('#lib h3, #lib summary, #lib .lgh')].map(x=>x.textContent).filter(t=>/كتل/.test(t))"))
    print(errs[:6])
    await b.close()
asyncio.run(main()); srv.terminate()
