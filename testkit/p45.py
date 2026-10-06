import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8850"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    await pg.goto("http://localhost:8850/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.openStudio(null)"); await W(2500)
    await ev("document.querySelector('[data-cab=\"add\"]').click()"); await W(800)
    await ev("const s=document.querySelector('[data-cf=\"cav.0:0\"]'); s.value='drawers'; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(600)
    await ev("document.querySelector('[data-ds=\"done\"]').click()"); await W(2500)
    print("checks", await ev("(()=>{const u=window.__dbg.state.project.units[0]; const r=window.__dbg.R(u); return (r.checks||[]).map(c=>c.text||c).slice(0,5)})()"))
    await b.close()
asyncio.run(main()); srv.terminate()
