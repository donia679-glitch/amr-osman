import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8854"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8854/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1500)
    await ev("document.querySelector('[data-vmat]').click()"); await W(800)
    print("matp", await ev("!document.querySelector('#matp').hidden"), await ev("[...document.querySelectorAll('#matp .mqrow b')].map(x=>x.textContent)"))
    await pg.screenshot(path="lib/p49a.png")
    u = await ev("window.__dbg.state.sel")
    await ev("const s=document.querySelector('#matp [data-qmat=\"front\"]'); const o=[...s.options].find(o=>/بلوط|oak/i.test(o.textContent))||s.options[3]; s.value=o.value; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(1200)
    print("front lib", await ev("JSON.stringify(window.__dbg.state.project.units.find(u=>u.id===window.__dbg.state.sel).libs)"))
    # nudge
    await ev("document.querySelector('[data-vnudge]').click()"); await W(1500)
    print("nudge", await ev("!document.querySelector('#matp').hidden"), await ev("document.querySelector('#matp .sph b')?.textContent"), await ev("document.querySelectorAll('#matp .ndb').length"))
    pos0 = await ev("JSON.stringify(window.__dbg.state.project.units.find(u=>u.id===window.__dbg.state.sel).pos||null)")
    await ev("document.querySelector('#nudgeD').value='12.5'; document.querySelector('[data-nd=\"+s\"], [data-nd=\"right\"]').click()"); await W(800)
    pos1 = await ev("JSON.stringify(window.__dbg.state.project.units.find(u=>u.id===window.__dbg.state.sel).pos||null)")
    await ev("document.querySelector('[data-nd=\"out\"], [data-nd=\"fwd\"]').click()"); await W(800)
    pos2 = await ev("JSON.stringify(window.__dbg.state.project.units.find(u=>u.id===window.__dbg.state.sel).pos||null)")
    await ev("document.querySelector('[data-nd=\"up\"]').click()"); await W(500)
    print(pos0, "->", pos1, "->", pos2, "lift", await ev("window.__dbg.state.project.units.find(u=>u.id===window.__dbg.state.sel).lift"))
    await ev("document.querySelector('[data-nd=\"snap\"]').click()"); await W(800)
    print("snap", await ev("JSON.stringify(window.__dbg.state.project.units.find(u=>u.id===window.__dbg.state.sel).pos||null)"))
    await pg.screenshot(path="lib/p49b.png")
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
