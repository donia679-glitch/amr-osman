import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8862"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    await pg.goto("http://localhost:8862/index.html"); await W(3000)
    try: await ev("localStorage.clear()")
    except Exception: pass
    await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1000)
    out = await ev("""(()=>{const res=[]; for(const u of window.__dbg.state.project.units){const r=window.__dbg.R(u); const pts=r.parts.filter(p=>p.cut_piece&&p.label); res.push({kind:u.kind,name:u.name,keys:Object.keys(pts[0]||{}).join(','),sample:pts.slice(0,14).map(p=>({n:p.name,role:p.role,b:p.label.banded,all:p.band_all_sides,box:p.box&&[p.box.x0,p.box.y0,p.box.z0,p.box.x1,p.box.y1,p.box.z1].map(v=>Math.round(v*10)/10),axes:p.axes,w:p.label.w,h:p.label.h}))})} return res})()""")
    print(json.dumps(out, ensure_ascii=False, indent=0)[:9000])
    await b.close()
asyncio.run(main()); srv.terminate()
