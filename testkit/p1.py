import asyncio, subprocess, sys, time, json, base64
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8797"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = await b.new_context(viewport={"width": 1180, "height": 820}, accept_downloads=True)
    pg = await ctx.new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8797/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    # smart set so there is a kitchen
    await ev("window.__dbg.libAdd ? 0 : 0")
    await pg.click("#libBtn"); await W(800); await pg.click("[data-smart=s_line300] [data-quick]"); await W(2500)
    # shop tab
    await ev("document.querySelector('[data-step0=shop]').click()"); await W(4000)
    print("purchase section", await ev("!!document.querySelector('.purch')"), await ev("[...document.querySelectorAll('.purcat')].map(x=>x.querySelector('b').textContent+':'+x.querySelectorAll('tbody tr').length).join(' | ')"))
    # add supplier
    await ev("document.querySelector('[data-supadd]').click()"); await W(500)
    await ev("const i=document.querySelector('[data-supn]'); i.value='شركة الألواح'; i.dispatchEvent(new Event('change',{bubbles:true}))"); await W(500)
    await ev("const s=document.querySelector('[data-supby=boards]'); s.value=s.options[1].value; s.dispatchEvent(new Event('change',{bubbles:true}))"); await W(500)
    print("sup", await ev("JSON.stringify(window.__dbg.state.prices.suppliers)"), await ev("JSON.stringify(window.__dbg.state.prices.supBy)"))
    await pg.screenshot(path="purch.png", full_page=False)
    # exports via direct call (deliver downloads)
    for fn in ["exportUnitDrawings", "exportPurchasePdf", "exportPurchaseXlsx"]:
        async with pg.expect_download(timeout=60000) as dl:
            await ev(f"window.__dbg.{fn}()")
        d = await dl.value; path = await d.path(); import os
        print(fn, d.suggested_filename, os.path.getsize(path))
        if fn=="exportUnitDrawings": import shutil; shutil.copy(path, "unitdwg.pdf")
    # brand pop
    await ev("window.__dbg.ui.pop='brand'; window.__dbg.renderPop()"); await W(500)
    await ev("const i=document.querySelector('[data-brand=address]'); i.value='المنصورة — شارع الجيش'; i.dispatchEvent(new Event('change',{bubbles:true}))"); await W(300)
    print("brand", await ev("JSON.stringify(window.__dbg.state.prices.brand)"))
    await pg.screenshot(path="brand.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
