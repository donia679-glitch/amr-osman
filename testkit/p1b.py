import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8798"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8798/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1000)
    await ev("""import('./room.js').then(R=>{const s=window.__dbg.state; s.project.units=[]; s.project.room=R.presetRoom('rect',{w:420,d:320}); const segs=R.segments(s.project.room); s.project.room.openings=[{id:'o1',wall:segs[0].id,kind:'window',w:120,h:120,sill:95,at:150}]; R.addPoint(s.project.room, segs[0].id, 'gas', 20); R.addPoint(s.project.room, segs[0].id, 'socket_counter', 220).z=110; window.__dbg.render(true)})"""); await W(800)
    await pg.click("#libBtn"); await W(600); await pg.click("[data-smart=s_line300] [data-quick]"); await W(2500)
    chk = await ev("JSON.stringify(window.__dbg.checks().map(c=>c.level+' '+c.text))")
    for c in json.loads(chk): print(c[:130])
    await ev("window.__dbg.render(true)"); await W(500)
    print(await ev("[...document.querySelectorAll('#steps button')].map(b=>b.textContent.trim()).join(' | ')"))
    await pg.screenshot(path="steps.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
