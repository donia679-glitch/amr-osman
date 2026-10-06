"""Render the stage frame by frame. python3 render.py [h|v] [fps] [from] [to]"""
import asyncio, sys, json, os
from playwright.async_api import async_playwright
fmt = sys.argv[1] if len(sys.argv) > 1 else "h"; FPS = int(sys.argv[2]) if len(sys.argv) > 2 else 25
W, H = (1920, 1080) if fmt == "h" else (1080, 1920)
out = f"frames_{fmt}"; os.makedirs(out, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": W, "height": H})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(f"http://localhost:8797/stage.html{'?v=1' if fmt == 'v' else ''}")
        await pg.evaluate("window.READY"); await pg.wait_for_timeout(500)
        total = await pg.evaluate("window.TOTAL")
        tl = await pg.evaluate("(() => { let s = 0; return window.SCRIPT.scenes.map(x => { const r = { kind: x.kind, start: s, dur: x.dur, pdur: x.pdur || 0 }; s += x.dur; return r; }); })()")
        json.dump(tl, open("timeline.json", "w"))
        n = int(total * FPS)
        a = int(sys.argv[3]) if len(sys.argv) > 3 else 0; z = int(sys.argv[4]) if len(sys.argv) > 4 else n
        for i in range(a, min(z, n)):
            await pg.evaluate(f"window.renderAt({i / FPS})")
            await pg.screenshot(path=f"{out}/f{i:05d}.jpg", type="jpeg", quality=92)
            if i % 100 == 0: print(fmt, i, "/", n, flush=True)
        print("done", fmt, n, errs[:3]); await b.close()
asyncio.run(main())
