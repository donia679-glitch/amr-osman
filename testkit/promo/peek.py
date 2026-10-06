import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    fmt = sys.argv[1]; ts = [float(x) for x in sys.argv[2:]]
    W, H = (1920, 1080) if fmt == "h" else (1080, 1920)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": W, "height": H}); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(f"http://localhost:8797/stage.html{'?v=1' if fmt == 'v' else ''}"); await pg.evaluate("window.READY")
        for t in ts:
            await pg.evaluate(f"window.renderAt({t})"); await pg.screenshot(path=f"peek_{fmt}_{t}.jpg", type="jpeg", quality=80)
        print(errs); await b.close()
asyncio.run(main())
