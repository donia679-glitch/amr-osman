import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8833"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8833/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.openStudio(null)"); await W(2500)
    print("ds", await ev("!!window.__ds && !!window.__ds.cabAdd"))
    await ev("document.querySelector('[data-cab=\"add\"]').click()"); await W(1200)
    print("solids", await ev("window.__ds.M().solids.length"), await ev("window.__ds.M().solids.map(s=>s.name+' '+s.outer.map(p=>p.join(',')).join('|')+' d'+s.depth).slice(0,8)"))
    await pg.screenshot(path="cab1.png")
    # add divider + shelf + fills
    await ev("document.querySelector('[data-cab=\"adddiv\"]').click()"); await W(600)
    await ev("document.querySelector('[data-cab=\"addshelf:0\"]').click()"); await W(600)
    print("cavs", await ev("window.__ds.Cab.cavities(window.__ds.curCab()).map(c=>c.key+' '+(c.x1-c.x0).toFixed(1)+'x'+(c.z1-c.z0).toFixed(1))"))
    await ev("const s=document.querySelector('[data-cf=\"fills.0:0.kind\"]'); s.value='drawers'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(600)
    await ev("const s=document.querySelector('[data-cf=\"fills.1:0.kind\"]'); s.value='door1'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(600)
    await ev("const s=document.querySelector('[data-cf=\"fills.0:1.kind\"]'); s.value='flap'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(600)
    await ev("const s=document.querySelector('[data-cf=\"back.kind\"]'); s.value='groove'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(600)
    await ev("const s=document.querySelector('[data-cf=\"bottom.joint\"]'); s.value='under'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(800)
    names = await ev("window.__ds.M().solids.map(s=>s.name)")
    print(len(names), json.dumps(names, ensure_ascii=False))
    print("pockets", await ev("window.__ds.M().solids.filter(s=>s.pockets.length).map(s=>s.name+':'+JSON.stringify(s.pockets[0]))"))
    await pg.screenshot(path="cab2.png")
    # finish → unit → cut list count
    await ev("document.querySelector('#dsDone')?.click() || document.querySelector('[data-ds=\"done\"]')?.click()"); await W(2000)
    print("units", await ev("window.__dbg.state.project.units.map(u=>u.name+':'+u.kind)"), "pieces", await ev("(()=>{const u=window.__dbg.state.project.units[0]; const r=window.__dbg.R(u); return r.ok ? r.pieces + ' ok ' + (r.errors||[]).join(';') : 'ERR '+r.errors.join(';')})()"))
    await pg.screenshot(path="cab3.png")
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
