import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8853"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("C:"+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8853/index.html"); await W(3000)
    try: await ev("localStorage.clear(); indexedDB.deleteDatabase('novera-projects'); caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))")
    except Exception as e: pass
    await W(1500); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true"); await W(500)
    # new project from home
    await ev("document.querySelector('#homeName').value='مطبخ اختبار'; document.querySelector('[data-hnew]').click()"); await W(1500)
    await ev("window.__dbg.libAdd ? null : null; window.__dbg.state.project.units.push({id:'u1', kind:'kitchen', name:'سفلية', params:{}, libs:{}}); window.__dbg.render(true)"); await W(1000)
    await ev("document.querySelector('[data-hlast]')?.click()"); await W(300)
    pid = await ev("window.__dbg.state.project.id"); print("pid", pid)
    await ev("document.querySelector('#projBtn')?.click()"); await W(500)
    # force persist + wait for backup
    await ev("window.__dbg.save?.(); 0"); await W(1500)
    idx = await ev("localStorage.getItem('novera-projects-idx')"); print("idx", idx)
    bk = await ev("""new Promise(r=>{const q=indexedDB.open('novera-projects',2); q.onsuccess=()=>{const t=q.result.transaction('b','readonly').objectStore('b').getAll(); t.onsuccess=()=>r(t.result.map(x=>[x.id,x.name,x.units]))}})""")
    print("backups", bk)
    # simulate storage loss: delete project record only
    await ev(f"""new Promise(r=>{{const q=indexedDB.open('novera-projects',2); q.onsuccess=()=>{{const t=q.result.transaction('p','readwrite'); t.objectStore('p').delete('{pid}'); t.oncomplete=()=>r(1)}}}})""")
    await ev("window.__dbg.state.project={id:'tmpx', name:'تاني', units:[]}; localStorage.removeItem('novera-studio-v2')")
    await pg.reload(); await W(7000)
    await ev("window.__dbg.state.tourDone=true"); await W(500)
    print("banner", await ev("document.querySelector('.hlost')?.textContent?.slice(0,80)"))
    await pg.screenshot(path="lib/p48a.png")
    await ev("document.querySelector('[data-hrecover]').click()"); await W(1200)
    print("pop rows", await ev("document.querySelectorAll('[data-recb]').length"), await ev("document.querySelector('.recgrp summary')?.textContent"))
    await pg.screenshot(path="lib/p48b.png")
    await ev("document.querySelector('[data-recb]').click()"); await W(1500)
    print("after restore cards:", await ev("[...document.querySelectorAll('.hcard b')].map(x=>x.textContent)"), "banner", await ev("!!document.querySelector('.hlost')"))
    print(errs[:5])
    await b.close()
asyncio.run(main()); srv.terminate()
