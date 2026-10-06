import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8809"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8809/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: print("ctx", e)
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    # a run: base2 | washer gap | base drawers  (added in order along the wall)
    await ev("import('./room.js').then(R=>{const s=window.__dbg.state; s.project.room=R.presetRoom('rect',{w:400,d:300}); window.__dbg.render(true)})"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base2'}); window.__dbg.libAdd({kitchen:'k_washer_gap'}); window.__dbg.libAdd({kitchen:'k_base_drawers'})"); await W(2500)
    r = await ev("""(()=>{const U=window.__dbg.state.project.units, u=U[1], R=window.__dbg.R(u);return JSON.stringify({ok:R.ok,err:R.errors,parts:R.parts.map(p=>p.name+' '+p.label.w+'x'+p.label.h+'x'+p.label.t), n:U.length, checks:window.__dbg.checks().filter(c=>/غسالة|الرأس/.test(c.text)).map(c=>c.level+' '+c.text)})})()""")
    print(r)
    # select the gap unit and screenshot
    await ev("window.__dbg.state.sel=window.__dbg.state.project.units[1].id; window.__dbg.render(true)"); await W(1500)
    await pg.screenshot(path="wgap.png")
    # now remove the last unit so the gap is at the end → expect a warning; then set the side
    await ev("window.__dbg.state.project.units.pop(); window.__dbg.render(true)"); await W(1200)
    print("end:", await ev("JSON.stringify(window.__dbg.checks().filter(c=>/غسالة|الرأس/.test(c.text)).map(c=>c.level+' '+c.text))"))
    await ev("window.__dbg.setParams(window.__dbg.state.project.units[1], p=>{p.washer_gap_side='right'})"); await W(1200)
    print("right:", await ev("JSON.stringify(window.__dbg.checks().filter(c=>/غسالة|الرأس/.test(c.text)).map(c=>c.level+' '+c.text))"))
    await ev("window.__dbg.setParams(window.__dbg.state.project.units[1], p=>{p.washer_gap_side='left'})"); await W(1200)
    print("left:", await ev("JSON.stringify(window.__dbg.checks().filter(c=>/غسالة|الرأس/.test(c.text)).map(c=>c.level+' '+c.text))"))
    print(await ev("(u=>{const R=window.__dbg.R(u);return R.parts.map(p=>p.name).join(' | ')})(window.__dbg.state.project.units[1])"))
    await ev("window.__dbg.setParams(window.__dbg.state.project.units[1], p=>{p.top_style='solid'})"); await W(1200)
    print(await ev("(u=>{const R=window.__dbg.R(u);return R.parts.map(p=>p.name+' '+p.label.w+'x'+p.label.h).join(' | ')})(window.__dbg.state.project.units[1])"))
    await ev("window.__dbg.setParams(window.__dbg.state.project.units[1], p=>{p.washer_gap_side='right'})"); await W(600)
    await ev("window.__dbg.state.whole=false; window.__dbg.render(true)"); await W(300)
    await ev("window.__dbg.state.sel=window.__dbg.state.project.units[1].id; window.__dbg.render(true)"); await W(1500)
    await ev("""(()=>{const v=window.__dbg.view, THREE=v.THREE||window.THREE; const m=v.scene?.children||[]; let b=null; v.scene?.traverse?.(o=>{if(o.isMesh&&o.userData?.unitId){o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); b=b?b.union(bb):bb;}}); if(b){const c=b.getCenter(new THREE.Vector3()); v.ctl.target.copy(c); v.cam.position.set(c.x+140,c.y+110,c.z+200); v.ctl.update();}})()"""); await W(1200)
    await pg.screenshot(path="wgap2.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
