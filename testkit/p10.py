import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8808"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8808/index.html"); await ev("localStorage.clear()"); await ev("caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({preset:'app_chest_double'})"); await W(2000)
    print("chips", await ev("[...document.querySelectorAll('[data-dglass]')].map(b=>b.textContent).join(' | ')"))
    await ev("[...document.querySelectorAll('[data-dglass]')].find(b=>b.dataset.dgv==='4').click()"); await W(900)
    await ev("[...document.querySelectorAll('[data-dglass]')].find(b=>b.dataset.dgv==='2').click()"); await W(1200)
    r = await ev("(u=>{const R=window.__dbg.R(u);return JSON.stringify({g:u.params.fronts[0].glass, ok:R.ok, err:R.errors, warn:R.warnings, glass:R.parts.filter(p=>/زجاج/.test(p.name)).map(p=>p.name+' '+p.label.w+'x'+p.label.h+'x'+p.label.t), frames:R.parts.filter(p=>/فريم/.test(p.name)).map(p=>p.name+' '+p.label.w+'x'+p.label.h), front:R.parts.filter(p=>/أمامي/.test(p.name)).map(p=>p.name), hw:R.hardware, checks:(R.checks||[]).map(c=>c.text)})})(window.__dbg.state.project.units[0])")
    print(r)
    await ev("window.__dbg.view.setOpen(true)"); await W(1200); await pg.screenshot(path="pglass.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
