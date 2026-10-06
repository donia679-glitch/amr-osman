import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8803"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
KEYS="['back_rear_offset','door_position','top_style','top_rail_front_inset','door_handle_recess','door_bottom_extension','shelf_count','include_assembly_holes','include_hinge_cups','drawer_box_panel_thickness','drawer_box_base_thickness','drawer_box_side_clearance','drawer_runner','include_drawer_boxes']"
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8803/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    print("defaults", await ev("JSON.stringify(window.__dbg.state.defaults)"))
    for k in ["k_base2","k_base_drawers","k_wall2","k_pantry60","k_wr_2col160","k_corner_l","k_wall_open60"]:
        r = await ev(f"(()=>{{const u=window.__dbg.libUnit({{kitchen:'{k}'}}); const R=window.__dbg.R(u); const p=R.params; return JSON.stringify({{ok:R.ok, err:(R.errors||[])[0], pieces:R.pieces, ...Object.fromEntries({KEYS}.map(x=>[x,p[x]]))}})}})()")
        print(k, r)
    # apply to current project units
    await ev("window.__dbg.ui.pop='defaults'; window.__dbg.renderPop()"); await W(300)
    await ev("document.querySelector('[data-defapply]').click()"); await W(1500)
    print("applied", await ev("JSON.stringify(window.__dbg.state.project.units.filter(u=>u.kind==='kitchen').map(u=>[u.name, u.params.top_style, u.params.door_position, u.params.shelf_count, u.params.drawer_box_side_clearance, window.__dbg.R(u).ok]))"))
    # change a value in the pop and check a new unit picks it up
    await ev("window.__dbg.ui.pop='defaults'; window.__dbg.renderPop()"); await W(300)
    await ev("const i=document.querySelector('[data-def=\"rules.shelves.base\"]'); i.value='2'; i.dispatchEvent(new Event('change',{bubbles:true}))"); await W(300)
    print("shelf2", await ev("window.__dbg.R(window.__dbg.libUnit({kitchen:'k_base2'})).params.shelf_count"), await ev("JSON.stringify(window.__dbg.state.defaults.rules.shelves)"))
    # runner select in props
    await ev("window.__dbg.ui.pop=null; window.__dbg.renderPop(); window.__dbg.libAdd({kitchen:'k_base_drawers'})"); await W(1500)
    await ev("const s=document.querySelector('[data-runner]'); s.value='side'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(800)
    print("runner", await ev("JSON.stringify([window.__dbg.state.project.units.at(-1).params.drawer_runner, window.__dbg.state.project.units.at(-1).params.drawer_box_side_clearance])"))
    await pg.screenshot(path="defs.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
