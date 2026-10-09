# v118: monkey-click inside the new full-screen editors: «مطبخ الحيطة», «قسّم الحيطة», «كلّم المطوّر»
import json, random, re
from playwright.sync_api import sync_playwright
random.seed(118)
SKIP = re.compile(r"data-wc=\"?(done|cancel)|data-kw=\"?(done|cancel)|data-dc=\"?(close|send|test|sync|forget)|github\.com")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={"width": 1180, "height": 820}, has_touch=True); pg = ctx.new_page(); errs = []; cur = {"k": "boot"}
    pg.on("pageerror", lambda e: errs.append([cur["k"], "PAGE", str(e)[:300]]))
    pg.on("console", lambda m: errs.append([cur["k"], "CONSOLE", m.text[:300]]) if m.type == "error" and "Failed to load resource" not in m.text and "ERR_" not in m.text else None)
    pg.route("https://api.github.com/**", lambda r: r.fulfill(status=404, body="{}"))
    pg.goto("http://localhost:8795/index.html"); pg.wait_for_timeout(8000)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_selector("[data-hlast]", timeout=60000); pg.wait_for_timeout(1500)
    pg.evaluate("window.__dbg.state.tourDone=true; document.querySelector('[data-hlast]').click()"); pg.wait_for_timeout(3000)
    has_room = pg.evaluate("!!window.__dbg.state.project.room")
    print("room", has_room, flush=True)
    if not has_room:
        pg.evaluate("""(()=>{const D=window.__dbg; D.state.project.room={pts:[[0,0],[420,0],[420,330],[0,330]],closed:true,walls:[{id:'w1',t:15,h:270},{id:'w2',t:15,h:270},{id:'w3',t:15,h:270},{id:'w4',t:15,h:270}],openings:[{id:'o1',wall:'w1',kind:'window',w:120,h:110,sill:100,at:150}],points:[],columns:[]}; D.render(true)})()""")
        pg.wait_for_timeout(1500)
    def monkey(root, n, key):
        cur["k"] = key
        for i in range(n):
            if not pg.evaluate(f"!!document.querySelector('{root}')"): print(key, "closed at", i); return
            cand = pg.evaluate(f"""() => {{ const R=document.querySelector('{root}'); const vis=(e)=>{{const r=e.getBoundingClientRect();return r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight;}};
              return [...R.querySelectorAll('button:not([disabled]), [data-wcpath], [data-kwcell], [data-wcdim], [data-kwdim], [data-wcsize], [data-kwsize], input[type=checkbox], select')].filter(vis).map((e,i)=>{{e.dataset.mk='q'+i;return ['q'+i, e.outerHTML.slice(0,140)];}}); }}""")
            cand = [c for c in cand if not SKIP.search(c[1])]
            if not cand: break
            mk, html = random.choice(cand)
            try:
                if html.startswith("<select"): pg.select_option(f"[data-mk={mk}]", index=random.randint(0, 4))
                else: pg.locator(f"[data-mk={mk}]").first.click(timeout=2000, force=True)
            except Exception as e: pass
            pg.wait_for_timeout(120)
            # answer any number box / split box
            if pg.evaluate("!!document.querySelector('.numask')"):
                pg.evaluate("(()=>{const i=document.querySelector('.numask input'); if(i){i.value=String(20+Math.floor(Math.random()*90)); i.dispatchEvent(new Event('input',{bubbles:true}));} const b=document.querySelector('.kpad.on .kpok')||document.querySelector('.numask button.primary, .numask [data-ok]'); b&&b.click();})()")
                pg.wait_for_timeout(100)
            if pg.evaluate("!!document.querySelector('.wcask')"):
                pg.evaluate("document.querySelector('.wcask [data-eq]')?.click()"); pg.wait_for_timeout(100)
        print(key, "done", flush=True)
    # 1) kitchen wall
    pg.evaluate("window.__dbg.state.sel=null; window.__dbg.render(true)"); pg.wait_for_timeout(800)
    pg.locator("[data-kwnew]").first.click(); pg.wait_for_timeout(1200)
    monkey("#kwall", 250, "kwall")
    if pg.evaluate("!!document.querySelector('#kwall')"):
        pg.evaluate("document.querySelector('[data-kw=done]').click()"); pg.wait_for_timeout(2500)
        if pg.evaluate("!!document.querySelector('#kwall')"): pg.evaluate("document.querySelector('[data-kw=cancel]').click()")
    print("units", pg.evaluate("window.__dbg.state.project.units.length"), flush=True)
    # 2) wall composer on every wc preset
    for k in ["wc_tv", "wc_wardrobe", "wc_study", "wc_closet_hang", "wc_tv_niche"]:
        pg.evaluate(f"(()=>{{const D=window.__dbg,u=D.libUnit({{preset:'{k}'}});D.state.project.units.push(u);D.state.sel=u.id;D.render(true)}})()"); pg.wait_for_timeout(1500)
        pg.locator("[data-wcopen]").first.click(); pg.wait_for_timeout(1000)
        monkey("#wcomp", 150, "wcomp:" + k)
        if pg.evaluate("!!document.querySelector('#wcomp')"):
            pg.evaluate("document.querySelector('[data-wc=done]').click()"); pg.wait_for_timeout(2000)
            if pg.evaluate("!!document.querySelector('#wcomp')"): pg.evaluate("document.querySelector('[data-wc=cancel]').click()")
        bad = pg.evaluate("(()=>{const D=window.__dbg,u=D.state.project.units.at(-1),r=D.R(u);return r.ok?'':JSON.stringify(r.errors).slice(0,200)})()")
        print(k, "ok" if not bad else "ENGINE " + bad, flush=True)
    # 3) dev chat
    pg.evaluate("document.querySelector('#devBtn').click()"); pg.wait_for_timeout(800)
    pg.fill("#dcText", "تجربة"); pg.evaluate("document.querySelector('[data-dc=add]').click()"); pg.wait_for_timeout(400)
    monkey("#dchat", 60, "dchat")
    pg.screenshot(path="sw6.png")
    print("ERRORS", len(errs)); from collections import Counter; print(Counter((e[0],e[2][:140]) for e in errs).most_common(30)); print(json.dumps(errs[:5], ensure_ascii=False, indent=1))
