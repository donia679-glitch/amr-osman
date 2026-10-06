import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8864"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8864/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception: pass
    await W(1000); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1000)
    for k in ["blk_coffee_two_tubes","blk_shelf_zigzag","blk_shelf_black_rings"]: await ev(f"window.__dbg.libAdd({{preset:'{k}'}})")
    await W(800)
    out = await ev("""(()=>{const E=(b)=>['left','right','bottom','top'].filter(k=>b[k]).join('+')||'—'; return window.__dbg.state.project.units.map(u=>{const r=window.__dbg.R(u); return u.name+' | شريط '+r.banding+' م\\n  '+r.parts.filter(p=>p.cut_piece&&p.label).slice(0,12).map(p=>p.name+': '+(p.band_all_sides?'ALL':E(p.label.banded))).join('\\n  ')}).join('\\n')})()""")
    print(out); print(errs[:3])
    await b.close()
asyncio.run(main()); srv.terminate()
