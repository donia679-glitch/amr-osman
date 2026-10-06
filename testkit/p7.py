import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8805"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8805/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    for k in ["d_glass_drawers90","d_glass_walkin240"]:
        r = await ev(f"(()=>{{const u=window.__dbg.libUnit({{dress:'{k}'}}); const R=window.__dbg.R(u); return JSON.stringify({{ok:R.ok, err:R.errors, warn:(R.warnings||[]).slice(0,3), pieces:R.pieces, glass:R.parts.filter(p=>p.material==='glass').length, frames:R.parts.filter(p=>/فريم/.test(p.name)).length, hw:R.hardware}})}})()")
        print(k, r[:700])
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({dress:'d_glass_drawers90'})"); await W(2500)
    await ev("window.__dbg.view.setOpen(true)"); await W(1500)
    await pg.screenshot(path="glassdr.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
