import asyncio, subprocess, sys, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8795"], cwd="/home/claude/novera-app/dist/pwa", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = await (await b.new_context(viewport={"width": 1180, "height": 820})).new_page(); ev = pg.evaluate; W = pg.wait_for_timeout
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto("http://localhost:8795/index.html"); await ev("localStorage.clear()"); await pg.reload(); await W(6000)
    await ev("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()"); await W(1200)
    await ev("import('./room.js').then(R=>{const s=window.__dbg.state; s.project.room=R.presetRoom('rect',{w:400,d:300}); window.__dbg.render(true)})"); await W(1200)
    print("chip", await ev("!!document.querySelector('[data-wallstudio]')"))
    await ev("window.__dbg.openStudio(null)"); await W(3000)
    await ev("window.__ds.setTool('rect')"); await W(300)
    M = await ev("JSON.stringify(window.__ds.M().room.pts)"); print(M)
    # far wall: room pts in plan [x,z] -> studio [x,-z,0]; pick mid of each wall at h=120, find one that picks a W ref
    cand = await ev("""(()=>{const D=window.__ds,r=D.M().room,out=[];for(let i=0;i<r.pts.length;i++){const a=r.pts[i],b=r.pts[(i+1)%r.pts.length];const m=[(a[0]+b[0])/2,-(a[1]+b[1])/2,120];const s=D.scr(m);out.push([i,s,D.pick(s[0],s[1])])}return JSON.stringify(out)})()""")
    print(cand)
    c = [x for x in json.loads(cand) if x[2] and str(x[2].get('ref','')).startswith('W:')]
    if c:
      x,y = c[0][1][0], c[0][1][1]
      await pg.mouse.click(x-30,y-20); await W(200); await pg.mouse.click(x+30,y+25); await W(500)
      print(await ev("JSON.stringify(window.__ds.M().sketches.map(k=>[k.plane,k.pts.length]))"))
      await pg.screenshot(path="wallrect.png")
      # paint
      await ev("window.__ds.setTool('paint')"); await W(300)
      await ev("document.querySelector('[data-wpaint=\"#8fa3b0\"]')?.click()"); await W(200)
      print("pk", await ev(f"JSON.stringify(window.__ds.pick({x-70},{y+70}))"), await ev("window.__ds.ui.tool"), await ev("window.__ds.ui.wallPaint"))
      await pg.mouse.click(x-70,y+70); await W(500)
      print("walls", await ev("JSON.stringify(window.__ds.M().room.walls.map(w=>[w.finish,w.color]))"))
      await pg.screenshot(path="wallpaint.png")
    print(errs)
    await b.close()
asyncio.run(main()); srv.terminate()
