import asyncio, subprocess, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3","-m","http.server","8794"],cwd="/home/claude/novera-app/dist/pwa",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width":1180,"height":820})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://localhost:8794/index.html")
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(6000)
        await pg.evaluate("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]')?.click()")
        await pg.wait_for_timeout(1000)
        # whole view
        await pg.evaluate("window.__dbg.state.whole=true; window.__dbg.render(true)")
        await pg.wait_for_timeout(1500)
        units = await pg.evaluate("JSON.stringify(window.__dbg.state.project.units.map(u=>[u.id,u.name,u.pos]))")
        print(units)
        await pg.click("[data-vmode=units]"); await pg.wait_for_timeout(1500)
        info = await pg.evaluate("""(()=>{const D=window.__dbg,v=D.view,T=v.three;const sel=D.state.sel;const rc=v.ren.domElement.getBoundingClientRect();
          const scr=(p)=>{const q=p.clone().project(v.cam);return [rc.left+(q.x+1)/2*rc.width, rc.top+(1-q.y)/2*rc.height]};
          const out={sel,dots:[],others:[]};
          for(const ug of v.pickables){ug.updateMatrixWorld(true);const b=new T.Box3().setFromObject(ug);
            if(ug.userData.unitId===sel){ug.traverse(o=>{if(o.userData.grip){out.dots.push(scr(o.getWorldPosition(new T.Vector3())))}})}
            else out.others.push([ug.userData.unitId, scr(new T.Vector3(b.min.x,b.min.y,b.max.z)), scr(new T.Vector3(b.max.x,b.min.y,b.max.z))]);}
          return out})()""")
        print(json.dumps(info)[:900])
        await pg.screenshot(path="move.png")
        x0,y0 = info["dots"][4]
        print("pick", await pg.evaluate(f"window.__dbg.view.pickAt({x0},{y0})"), await pg.evaluate("window.__dbg.ui.moveMode"), await pg.evaluate(f"document.elementFromPoint({x0},{y0})?.className")); tx,ty = info["others"][1][1]
        await pg.evaluate("addEventListener('pointerdown',e=>{window.__pd=(e.target.tagName+'.'+e.target.className+'#'+e.target.id+' '+e.target.parentElement?.id)},true)")
        await pg.mouse.move(x0,y0); await pg.mouse.down()
        print("pd", await pg.evaluate("window.__pd"), await pg.evaluate("[window.__dbg.state.sel, document.querySelector(\"body > .toast\")?.textContent]"))
        for k in range(1,16):
            await pg.mouse.move(x0+(tx+4-x0)*k/15, y0+(ty+3-y0)*k/15); await pg.wait_for_timeout(40)
        await pg.wait_for_timeout(300); await pg.screenshot(path="move2.png")
        await pg.mouse.up(); await pg.wait_for_timeout(800)
        print(await pg.evaluate("JSON.stringify(window.__dbg.state.project.units.map(u=>[u.name,u.pos]))"))
        print(await pg.evaluate("document.querySelector('body > .toast')?.textContent"))
        print(errs)
        await b.close()
asyncio.run(main()); srv.kill()
