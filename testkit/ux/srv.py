import os, time, traceback, io, contextlib, sys
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__)); Q=os.path.join(D,"q")
os.makedirs(Q,exist_ok=True)
for f in os.listdir(Q): os.remove(os.path.join(Q,f))
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
    ctx=b.new_context(viewport={"width":1180,"height":820}, has_touch=True, device_scale_factor=1)
    pg=ctx.new_page(); errs=[]
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:"+m.text) if m.type=="error" else None)
    pg.set_default_timeout(5000)
    cdp=ctx.new_cdp_session(pg)
    def boot():
        pg.goto("http://localhost:8795/index.html"); pg.wait_for_timeout(4000)
        pg.evaluate("localStorage.clear(); indexedDB.databases && indexedDB.databases().then(l=>l.forEach(d=>indexedDB.deleteDatabase(d.name)))"); pg.wait_for_timeout(500); pg.reload(); pg.wait_for_timeout(6000)
        pg.evaluate("window.__dbg && (window.__dbg.state.tourDone=true)")
    boot()
    def shot(n, full=False): pg.screenshot(path=os.path.join(D,n+".png"), full_page=full); print("shot",n)
    def tapxy(x,y,w=500): pg.touchscreen.tap(x,y); pg.wait_for_timeout(w)
    def tap(sel, i=0, w=600):
        el=pg.locator(sel).nth(i); bb=el.bounding_box(); pg.touchscreen.tap(bb["x"]+bb["width"]/2, bb["y"]+bb["height"]/2); pg.wait_for_timeout(w)
    def taptext(t, i=0): tap(f"button:visible:has-text('{t}')", i)
    def kp(s):
        for ch in s: tap(f".kpad.on button:text-is('{ch}')", w=120)
    def kpok(): tap(".kpad.on .kpok", w=500)
    def tdrag(x0,y0,x1,y1,steps=14,hold=0,end=True):
        cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x0,"y":y0}]})
        if hold: pg.wait_for_timeout(hold)
        for i in range(1,steps+1):
            cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x0+(x1-x0)*i/steps,"y":y0+(y1-y0)*i/steps}]}); pg.wait_for_timeout(30)
        if end: cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]}); pg.wait_for_timeout(600)
    def tend(): cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]}); pg.wait_for_timeout(600)
    def vis(sel="button"):
        return pg.evaluate(f"[...document.querySelectorAll('{sel}')].filter(b=>b.offsetParent&&b.getBoundingClientRect().width>0).map(b=>{{const r=b.getBoundingClientRect();return b.textContent.trim().replace(/\\s+/g,' ').slice(0,28)+' @'+Math.round(r.x)+','+Math.round(r.y)+' '+Math.round(r.width)+'x'+Math.round(r.height)}})")
    G=globals()
    while True:
        fs=sorted(f for f in os.listdir(Q) if f.endswith(".py"))
        if not fs: time.sleep(0.2); continue
        f=os.path.join(Q,fs[0]); code=open(f).read(); os.remove(f)
        if code.strip()=="quit": break
        buf=io.StringIO()
        with contextlib.redirect_stdout(buf):
            try: exec(code,G)
            except Exception: traceback.print_exc(file=buf)
            if errs: print("PAGEERR",errs[:4]); errs.clear()
        open(f[:-3]+".out","w").write(buf.getvalue())
