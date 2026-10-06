import asyncio, subprocess, time, json, sys
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3","-m","http.server","8793"],cwd="/home/claude/novera-app/dist/pwa",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
JS = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width":1180,"height":820})
        await pg.goto("http://localhost:8793/index.html")
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(5000)
        print(await pg.evaluate(JS))
        await b.close()
asyncio.run(main()); srv.kill()
