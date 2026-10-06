import asyncio, subprocess, sys, time, json, os, shutil
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8802"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = await b.new_context(viewport={"width": 1180, "height": 820}, accept_downloads=True)
    pg = await ctx.new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8802/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(800)
    # describe kitchen to get a full room
    await ev("window.__dbg.ui.pop='speak'; window.__dbg.renderPop()"); await W(300)
    await ev("document.querySelector('#speakText').value='مطبخ حرف L في أوضة 3.5 في 4، الحوض تحت الشباك، تشطيب عادي'"); await ev("document.querySelector('[data-speakgo]').click()"); await W(3500)
    # ergo
    await ev("window.__dbg.ui.chipTab='view'; window.__dbg.state.whole=true; window.__dbg.render()"); await W(300)
    print("ergo chip", await ev("!!document.querySelector('[data-ergo]')"))
    await ev("document.querySelector('[data-ergo]').click()"); await W(1500)
    print("ergo panel", await ev("!document.querySelector('#ergop').hidden"), (await ev("document.querySelector('#ergop')?.textContent.replace(/\\s+/g,' ').slice(0,260)")))
    await pg.screenshot(path="ergo.png")
    await ev("document.querySelector('[data-eclose]').click()"); await W(300)
    # lighting
    await ev("window.__dbg.applyLighting(true)"); await W(1500)
    print("lights", await ev("JSON.stringify(window.__dbg.state.project.room.lights?.map(l=>[l.kind,l.x,l.z]))"))
    await ev("window.__dbg.ui.planOn=true; window.__dbg.render(true)"); await W(1200)
    print("plan lights", await ev("document.querySelectorAll('#plan .plight').length"))
    await pg.screenshot(path="plan_lights.png")
    await ev("window.__dbg.ui.planOn=false; window.__dbg.render(true)"); await W(800)
    # waste hint: select a base unit and change width
    uid_ = await ev("window.__dbg.state.project.units.find(u=>u.kind==='kitchen' && (R=window.__dbg.R(u)).params.unit_type!=='wall' && R.params.unit_category!=='corner')?.id")
    await ev(f"window.__dbg.state.sel='{uid_}'; window.__dbg.render()"); await W(2500)
    print("base", await ev("JSON.stringify(window.__dbg.ui.wasteBase)"))
    await ev(f"const u=window.__dbg.state.project.units.find(x=>x.id=='{uid_}'); window.__dbg.setParams(u, p=>{{p.width=+p.width+15}})"); await W(2500)
    print("hint", await ev("document.querySelector('#wasteHint')?.textContent"))
    # finish compare
    await ev("window.__dbg.ui.pop='fincmp'; window.__dbg.renderPop()"); await W(300)
    await ev("document.querySelector('[data-fclib=hpl_white]').click()"); await W(200); await ev("document.querySelector('[data-fclib=acrylic_black]').click()"); await W(200)
    await ev("document.querySelector('[data-fcgo]').click()"); await W(3500)
    print("fincmp", await ev("document.querySelectorAll('.fccard').length"), await ev("[...document.querySelectorAll('.fcinfo')].map(x=>x.textContent.replace(/\\s+/g,' ')).join(' | ')"))
    await pg.screenshot(path="fincmp.png")
    await ev("window.__dbg.ui.pop=null; window.__dbg.renderPop()")
    # command palette
    await ev("document.querySelector('#cmdBtn').click()"); await W(400)
    await pg.keyboard.type("حوض"); await W(300)
    print("cmd", await ev("[...document.querySelectorAll('.cmdit b')].slice(0,4).map(x=>x.textContent).join(' | ')"))
    await pg.keyboard.press("Escape"); await W(200)
    # props shop level
    await ev("document.querySelector('[data-padv=shop]').click()"); await W(500)
    print("shop level", await ev("[...document.querySelectorAll('#props details:not(.advhid) > summary')].map(x=>x.textContent.trim()).join(' | ')"))
    # scanner (no camera)
    await ev("document.querySelector('[data-step0=shop]').click()"); await W(3000)
    await ev("document.querySelector('[data-scan]').click()"); await W(1500)
    print("scan", await ev("document.querySelector('.scanmsg')?.textContent"))
    key = await ev("window.__dbg.state.project.units[0].code+'-01'")
    await ev(f"const f=document.querySelector('[data-scanform]'); f.code.value='{key}'; f.dispatchEvent(new Event('submit',{{bubbles:true,cancelable:true}}))"); await W(500)
    print("piece", await ev("document.querySelector('.scpiece .lt')?.textContent.replace(/\\s+/g,' ')"))
    await ev("document.querySelector('[data-scstage=\"2\"]').click()"); await W(500)
    print("prog", await ev("JSON.stringify(window.__dbg.state.project.progress)"))
    await pg.screenshot(path="scan.png")
    await ev("document.querySelector('[data-scx]').click()"); await W(300)
    # studio tool groups
    await ev("window.__dbg.openStudio(null)"); await W(2500)
    print("studio groups", await ev("document.querySelectorAll('.dstg').length"), await ev("document.querySelectorAll('.dstg.fav .dst').length"))
    await ev("const q=document.querySelector('#dsToolQ'); q.value='قوس'; q.dispatchEvent(new Event('input',{bubbles:true}))"); await W(200)
    print("tool search", await ev("[...document.querySelectorAll('.dstools .dst')].filter(b=>!b.hidden).map(b=>b.title).join(',')"))
    await pg.screenshot(path="studio_tools.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
