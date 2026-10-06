import asyncio, subprocess, sys, time, json, os, shutil
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8801"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = await b.new_context(viewport={"width": 1180, "height": 820}, accept_downloads=True)
    pg = await ctx.new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8801/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true")
    await ev("document.querySelector('[data-hspeak]').click()"); await W(800)
    print("pop", await ev("!!document.querySelector('#speakText')"))
    await ev("document.querySelector('#speakText').value='مطبخ حرف L في أوضة 3 في 4، الحوض تحت الشباك، فرن وميكروويف، ضلف أبيض لامع، تشطيب فاخر، ليد تحت العلوي'")
    await ev("document.querySelector('[data-speakgo]').click()"); await W(4000)
    print("units", await ev("window.__dbg.state.project.units.length"), await ev("JSON.stringify(window.__dbg.state.project.room.pts)"), await ev("window.__dbg.state.project.room.openings.length"))
    print("fronts", await ev("JSON.stringify([...new Set(window.__dbg.state.project.units.map(u=>u.libs?.front))])"))
    print("toast", await ev("document.querySelector('body > .toast')?.textContent"))
    await pg.screenshot(path="speak.png")
    # appliance field on fridge / oven
    oid = await ev("window.__dbg.state.project.units.find(u=>/فرن/.test(u.name))?.id")
    if oid:
        await ev(f"window.__dbg.state.sel='{oid}'; window.__dbg.render()"); await W(800)
        print("appl selects", await ev("[...document.querySelectorAll('[data-appl]')].map(s=>s.dataset.appl+':'+s.options.length).join(' ')"))
        await ev("const s=document.querySelector('[data-appl=oven]'); s.value=s.options[1].value; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(800)
        print("after", await ev(f"JSON.stringify(window.__dbg.state.project.units.find(u=>u.id=='{oid}').appliance)"), await ev("document.querySelector('.applinfo')?.textContent.slice(0,120)"))
    async with pg.expect_download(timeout=90000) as dl:
        await ev("window.__dbg.exportMachines()")
    d = await dl.value; shutil.copy(await d.path(), "mach.zip"); print("mach", os.path.getsize("mach.zip"))
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
