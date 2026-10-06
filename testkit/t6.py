import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8796"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8796/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true")
    await ev("document.querySelector('#homeName').value='تجربة 2'; document.querySelector('#homeName').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))"); await W(1500)
    cur = await ev("window.__dbg.state.project.id"); print("cur", cur, await ev("window.__dbg.state.project.name"))
    await ev("document.querySelector('#homeBtn').click()"); await W(1500)
    print("home visible", await ev("!document.querySelector('#home').hidden"), await ev("document.querySelectorAll('.hcard').length"))
    sel = f"[data-hdel='{cur}']"
    await pg.click(sel); await W(300); await pg.click(sel); await W(2000)
    print("after", await ev("window.__dbg.state.project.id"), await ev("window.__dbg.state.project.name"), await ev("document.querySelectorAll('.hcard').length"), await ev("document.querySelector('body > .toast')?.textContent"))
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
