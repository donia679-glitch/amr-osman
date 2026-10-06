import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8813"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8813/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({dress:'d_mirror_doors'})"); await W(2500)
    await ev("window.__dbg.setParams(window.__dbg.state.project.units[0], p=>{const c=p.sections[1].compartments[0]; c.door='double'; c.drawer_front=false;})"); await W(1200)
    r = await ev("""(()=>{const u=window.__dbg.state.project.units[0], R=window.__dbg.R(u); return JSON.stringify({ok:R.ok, err:R.errors, warn:R.warnings, doors:u.params.doors, secs:u.params.sections.map(s=>s.compartments.map(c=>c.content+'/'+c.door+'/'+c.drawer_front)), parts:R.parts.filter(p=>/درج 1|حشوة|قاطوع رأسي 1 |^جنب|ضلفة/.test(p.name)).map(p=>p.name+' '+(p.label?Math.round(p.label.w*10)/10+'x'+Math.round(p.label.h*10)/10:'')+' x:'+Math.round(p.box.x0*10)/10+'-'+Math.round(p.box.x1*10)/10)})})()""")
    print(r)
    await ev("window.__dbg.setParams(window.__dbg.state.project.units[0], p=>{p.doors.layout='whole'; p.sections[1].compartments[0].door='none';})"); await W(1200)
    print(await ev("""(()=>{const u=window.__dbg.state.project.units[0], R=window.__dbg.R(u); return JSON.stringify({ok:R.ok, err:R.errors, warn:R.warnings, parts:R.parts.filter(p=>/درج 1|حشوة|ضلفة/.test(p.name)&&!/أليتا/.test(p.name)).map(p=>p.name+' x:'+Math.round(p.box.x0*10)/10+'-'+Math.round(p.box.x1*10)/10)})})()"""))
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
