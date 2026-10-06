import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8828"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type in("error","warning") else None)
    await pg.goto("http://localhost:8828/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.state.libOpen=true; window.__dbg.render(true)"); await W(1500)
    r = await ev("""(async()=>{ try { const p = window.__dbg.zwLibPump(); await new Promise(r=>setTimeout(r,500)); const st=window.__dbg.zwLibStore(); const b1=st.busy; await p; return {b1, items:Object.keys(st.st.items), rec: st.st.items.k2 && {n:st.st.items.k2.list.length, w:st.st.items.k2.list[0]?.waste}}; } catch(e){ return 'ERR '+e.message+' '+e.stack.slice(0,400);} })()""")
    print(r)
    print("card:", await ev("document.querySelector('[data-zwlib=\"k2\"]').textContent"))
    print(errs[:8])
    await b.close()
asyncio.run(main()); srv.terminate()
