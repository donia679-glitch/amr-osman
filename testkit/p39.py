import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8841"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8841/index.html"); await W(3000)
    try: await ev("localStorage.clear(); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("window.__dbg.state.project.units=[]; window.__dbg.libAdd({kitchen:'k_base2'})"); await W(1500)
    await ev("document.querySelector('[data-padv=\"1\"]').click()"); await W(500)
    print("section", await ev("!!document.querySelector('.matovbox')"), "selects", await ev("document.querySelectorAll('[data-matov]').length"))
    opts = await ev("[...document.querySelector('[data-matov=\"ضلفة يمين\"]').options].map(o=>o.value).filter(Boolean).slice(0,6)")
    print("opts", opts)
    lib = [o for o in opts if o.startswith('wood') or o.startswith('lam') or o][0]
    await ev(f"const s=document.querySelector('[data-matov=\"ضلفة يمين\"]'); s.value='{lib}'; s.dispatchEvent(new Event('change',{{bubbles:true}}))"); await W(1200)
    print("matOv", await ev("JSON.stringify(window.__dbg.state.project.units[0].matOv)"))
    print("pieces", await ev("window.__dbg.projectPieces().filter(p=>/ضلفة/.test(p.pt.name)).map(p=>p.pt.name+' → '+p.mname+' '+p.lib)"))
    await ev("window.__dbg.state.tab='cut'; window.__dbg.render(true)"); await W(2500)
    print("cut groups", await ev("(window.__dbg.cutData?.groups||[]).map(g=>g.name||g.key||g.mat)"))
    await ev("window.__dbg.state.tab='design'; window.__dbg.render(true)"); await W(1500)
    await pg.screenshot(path="matov.png")
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
