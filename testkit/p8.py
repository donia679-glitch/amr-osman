import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8806"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8806/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({dress:'d_glass_drawers90'})"); await W(2000)
    await ev("window.__dbg.state.propsAdv=true; window.__dbg.render()"); await W(800)
    print("chips", await ev("[...document.querySelectorAll('[data-dglass]')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(' | ')"))
    await ev("[...document.querySelectorAll('[data-dglass]')].find(b=>b.dataset.dgv==='2').click()"); await W(1200)
    print("after unticking 2", await ev("JSON.stringify(window.__dbg.state.project.units[0].params.sections[0].compartments[0].drawer_glass)"), await ev("(R=>R.ok+' glass='+R.parts.filter(p=>p.material==='glass').length+' fronts='+R.parts.filter(p=>p.role==='drawer_front'&&!/فريم/.test(p.name)).length)(window.__dbg.R(window.__dbg.state.project.units[0]))"))
    await ev("[...document.querySelectorAll('[data-dglass]')].find(b=>b.dataset.dgv==='none').click()"); await W(1000)
    print("none", await ev("JSON.stringify(window.__dbg.state.project.units[0].params.sections[0].compartments[0].drawer_glass)"))
    await ev("[...document.querySelectorAll('[data-dglass]')].find(b=>b.dataset.dgv==='4').click()"); await W(1200)
    print("only 4", await ev("JSON.stringify(window.__dbg.state.project.units[0].params.sections[0].compartments[0].drawer_glass)"))
    await ev("window.__dbg.view.setOpen(true)"); await W(1200); await pg.screenshot(path="glass4.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
