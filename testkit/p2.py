import asyncio, subprocess, sys, time, json, os, shutil
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8799"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = await b.new_context(viewport={"width": 1180, "height": 820}, accept_downloads=True)
    pg = await ctx.new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8799/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1000)
    # shop tab: stages auto schedule, hw stock, signature
    await ev("Object.assign(window.__dbg.state.prices ?? (window.__dbg.state.prices={sheets:{},hw:{}}), {defaultSheet:1200, laborUnit:500, mode:'sheets', margin:30})")
    await ev("document.querySelector('[data-step0=shop]').click()"); await W(3500)
    await ev("document.querySelector('[data-autosched]').click()"); await W(600)
    print("stages", (await ev("JSON.stringify(window.__dbg.state.project.stages)"))[:300])
    print("hwstock rows", await ev("document.querySelectorAll('[data-hwstock]').length"))
    await ev("const i=document.querySelector('[data-hwstock]'); i.value='5'; i.dispatchEvent(new Event('change',{bubbles:true}))"); await W(500)
    print("hwstock", await ev("JSON.stringify(window.__dbg.state.hwStock)"))
    # signature: draw
    await ev("document.querySelector('details:has(#sigPad)').open=true"); await W(300)
    box = await ev("JSON.stringify(document.querySelector('#v-shop #sigPad').getBoundingClientRect())"); r=json.loads(box)
    await pg.mouse.move(r['x']+20,r['y']+100); await pg.mouse.down(); await pg.mouse.move(r['x']+200,r['y']+60, steps=10); await pg.mouse.move(r['x']+300,r['y']+140, steps=10); await pg.mouse.up()
    await ev("document.querySelector('[data-sigok]').click()"); await W(800)
    print("approval", await ev("JSON.stringify({...window.__dbg.state.project.approval, sig: window.__dbg.state.project.approval?.sig?.length})"))
    await pg.screenshot(path="sig.png")
    # quote pdf with signature
    async with pg.expect_download(timeout=60000) as dl:
        await ev("window.__dbg.exportQuotePdf()")
    d = await dl.value; shutil.copy(await d.path(), "quote.pdf"); print("quote", os.path.getsize("quote.pdf"))
    # booklet
    async with pg.expect_download(timeout=120000) as dl:
        await ev("window.__dbg.exportAsmBooklet(window.__dbg.state.project.units[0].id)")
    d = await dl.value; shutil.copy(await d.path(), "asm.pdf"); print("asm", os.path.getsize("asm.pdf"))
    # home dashboard
    await ev("document.querySelector('#homeBtn').click()"); await W(1500)
    print("dash", await ev("[...document.querySelectorAll('.dtile')].map(x=>x.textContent.trim().replace(/\\s+/g,' ')).join(' | ')"))
    print("pulse", await ev("document.querySelectorAll('.pulse').length"))
    await pg.screenshot(path="home.png")
    await ev("document.querySelector('[data-hlast]').click()"); await W(800)
    # presentation mode
    await ev("window.__dbg.presentOn()"); await W(1500)
    print("present", await ev("document.body.classList.contains('present')"), await ev("document.querySelectorAll('#presentBar button').length"))
    await pg.screenshot(path="present.png")
    await ev("document.querySelector('[data-pprice]').click()"); await W(300)
    print("price", await ev("document.querySelector('[data-pprice]').textContent"))
    print("bar", await ev("document.querySelector('#presentBar')?.innerHTML.slice(0,200)"), await ev("!!window.__dbg.ui.present"))
    print("err", await ev("(()=>{try{window.__dbg.renderPresent();return 'ok'}catch(e){return e.stack.slice(0,300)}})()"))
    await ev("document.querySelector('[data-psign]')?.click()"); await W(400)
    print("sign overlay", await ev("!document.querySelector('#presentSign').hidden"))
    await pg.keyboard.press("Escape"); await W(300)
    await ev("document.querySelector('[data-pexit]').click()"); await W(800)
    print("exited", await ev("!document.body.classList.contains('present')"), await ev("!!document.querySelector('#presentBar')"))
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
