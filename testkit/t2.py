import asyncio, subprocess, time, json
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3","-m","http.server","8792"],cwd="/home/claude/novera-app/dist/pwa",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
JS = """() => { const D=window.__dbg; const out={};
 for (const k of ['k_base2','k_corner_l','k_corner_diag','k_corner_blind','k_magic100','k_carousel90','k_wall2','k_corner_l_wall','k_corner_diag_wall','k_corner_blind_wall','k_corner_open']) {
   const ds={kitchen:k}; const u=D.libUnit(ds); const r=D.R(u);
   if(!r.ok){out[k]='ERR '+(r.error||'');continue}
   const bb=(f)=>{let b={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9,z0:1e9,z1:-1e9};for(const m of (r.meshes||[]))if(f(m)){b.x0=Math.min(b.x0,m.box.x0);b.x1=Math.max(b.x1,m.box.x1);b.y0=Math.min(b.y0,m.box.y0);b.y1=Math.max(b.y1,m.box.y1);b.z0=Math.min(b.z0,m.box.z0);b.z1=Math.max(b.z1,m.box.z1)}for(const k in b)b[k]=Math.round(b[k]*10)/10;return b};
   out[k]={all:bb(()=>1),door:bb(m=>m.door||m.drawer||m.layer==='Kitchen - Front'), names:[...new Set((r.meshes||[]).filter(m=>m.door||m.layer==='Kitchen - Front').map(m=>m.name+':'+[m.box.y0,m.box.y1].map(v=>Math.round(v*10)/10).join('..')))].slice(0,6), depth:u.params.depth, cd:u.params.corner_depth};
 }
 return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width":1180,"height":820})
        await pg.goto("http://localhost:8792/index.html")
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(5000)
        res = await pg.evaluate(JS)
        for k,v in res.items(): print(k, json.dumps(v, ensure_ascii=False))
        await b.close()
asyncio.run(main()); srv.kill()
