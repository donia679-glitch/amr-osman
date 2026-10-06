import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8807"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8807/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base_drawers'})"); await W(2000)
    await ev("window.__dbg.state.propsAdv=true; window.__dbg.render()"); await W(800)
    print("chips", await ev("[...document.querySelectorAll('[data-kglass]')].map(b=>b.textContent).join(' | ')"))
    await ev("[...document.querySelectorAll('[data-kglass]')].find(b=>b.dataset.kglass==='3').click()"); await W(1200)
    r = await ev("(u=>{const R=window.__dbg.R(u);return JSON.stringify({dg:u.params.drawer_glass, ok:R.ok, err:R.errors, glass:R.parts.filter(p=>/زجاج/.test(p.name)).map(p=>p.name+' '+p.label.w+'x'+p.label.h+'x'+p.label.t), frames:R.parts.filter(p=>/إطار/.test(p.name)).length, names:R.parts.filter(p=>/درج 3/.test(p.name)).map(p=>p.name), walls:R.parts.filter(p=>/جدار أمامي/.test(p.name)).length})})(window.__dbg.state.project.units[0])")
    print(r)
    await ev("window.__dbg.view.setOpen(true)"); await W(1200); await pg.screenshot(path="kglass.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
