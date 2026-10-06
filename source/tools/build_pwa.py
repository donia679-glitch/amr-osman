"""Build the installable, offline NOVERA Studio web app (PWA) from apps/ipad into dist/pwa.
Everything the app loads (three.js, the path tracer, the QR code library, the Arabic font) is copied in,
so it runs with no internet after the first open. Usage: python3 tools/build_pwa.py"""
import os, shutil, json, hashlib, time, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "apps/ipad")
OUT = os.path.join(ROOT, "dist/pwa")
# qrcode.js + the Arabic font live in tools/vendor_assets (a session scratchpad disappears between sessions)
SP = os.environ.get("VENDOR", os.path.join(ROOT, "tools/vendor_assets"))
THREE = os.path.join(SP, "three/repo")

shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(APP, OUT, ignore=shutil.ignore_patterns("APPSTORE.md", "*.map"))
V = os.path.join(OUT, "vendor")  # three.js + path tracer are already in apps/ipad/vendor (tools/vendor.py)
os.makedirs(V, exist_ok=True)
shutil.copy(os.path.join(SP, "qrcode.js"), os.path.join(V, "qrcode.js"))
os.makedirs(os.path.join(OUT, "fonts"))
css = ""
for w, n in [(400, "Regular"), (500, "Medium"), (600, "SemiBold"), (700, "Bold")]:
    shutil.copy(os.path.join(SP, f"gfonts/ofl/ibmplexsansarabic/IBMPlexSansArabic-{n}.ttf"), os.path.join(OUT, "fonts"))
    css += f'@font-face{{font-family:"IBM Plex Sans Arabic";font-weight:{w};font-display:swap;src:url("IBMPlexSansArabic-{n}.ttf") format("truetype")}}\n'
open(os.path.join(OUT, "fonts/fonts.css"), "w").write(css)

# keep only the library modules the app can actually reach (fewer files to upload and cache)
MAP = {"three": "vendor/three/build/three.module.js", "three/addons/": "vendor/three/examples/jsm/", "three/examples/jsm/": "vendor/three/examples/jsm/",
       "three-mesh-bvh": "vendor/three-mesh-bvh/src/index.js", "three-gpu-pathtracer": "vendor/three-gpu-pathtracer/src/index.js"}
def resolve(spec, frm):
    if spec.startswith("."): return os.path.normpath(os.path.join(os.path.dirname(frm), spec)).replace(os.sep, "/")
    if spec in MAP: return MAP[spec]
    for k, v in MAP.items():
        if k.endswith("/") and spec.startswith(k): return v + spec[len(k):]
    return None
IMP = re.compile(r"""(?:import|export)\s*(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)""")
seen, stack = set(), [f for f in os.listdir(OUT) if f.endswith(".js")]
while stack:
    f = stack.pop()
    fp = os.path.join(OUT, f)
    if f in seen or not os.path.exists(fp): continue
    seen.add(f)
    for m in IMP.finditer(open(fp, encoding="utf-8").read()):
        r = resolve(m.group(1) or m.group(2), f)
        if r: stack.append(r)
for dp, _, fs in os.walk(V):
    for f in fs:
        rel = os.path.relpath(os.path.join(dp, f), OUT).replace(os.sep, "/")
        if rel.endswith(".js") and rel not in seen and rel != "vendor/qrcode.js": os.remove(os.path.join(dp, f))
for dp, _, _ in sorted(os.walk(V), reverse=True):
    if not os.listdir(dp): os.rmdir(dp)

# icons: the NOVERA "N" mark
def icon(size, path, pad=0.0):
    im = Image.new("RGB", (size, size), "#123f23")
    d = ImageDraw.Draw(im)
    m = int(size * (0.16 + pad)); r = int(size * 0.14)
    d.rounded_rectangle([m, m, size - m, size - m], radius=r, fill="#d9a63a")
    try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size * (0.5 - pad)))
    except Exception: f = ImageFont.load_default()
    d.text((size / 2, size / 2 + size * 0.02), "N", fill="#123f23", font=f, anchor="mm")
    im.save(path)
os.makedirs(os.path.join(OUT, "icons"))
icon(180, os.path.join(OUT, "icons/apple-touch-icon.png"))
icon(192, os.path.join(OUT, "icons/icon-192.png"))
icon(512, os.path.join(OUT, "icons/icon-512.png"))
icon(512, os.path.join(OUT, "icons/icon-maskable-512.png"), pad=0.06)

json.dump({
    "name": "NOVERA Studio", "short_name": "NOVERA", "description": "تصميم وتصنيع المطابخ والأثاث — خطة القص والملصقات ودليل التجميع",
    "lang": "ar", "dir": "rtl", "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any",
    "background_color": "#f1f2ec", "theme_color": "#123f23",
    "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    "shortcuts": [{"name": "رفع مقاسات", "short_name": "رفع", "url": "./#survey", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]}],
}, open(os.path.join(OUT, "manifest.webmanifest"), "w"), ensure_ascii=False, indent=1)

# index.html: local libraries, a full document head, the service worker
p = os.path.join(OUT, "index.html")
s = open(p, encoding="utf-8").read()
s = s.replace('<link rel="preconnect" href="https://fonts.googleapis.com">\n', "")
s = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^"]*">', '<link rel="stylesheet" href="fonts/fonts.css">', s)
s = s.replace('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', 'vendor/qrcode.js')
s = s.replace('https://cdn.jsdelivr.net/npm/three@0.160.0/', './vendor/three/')
s = s.replace('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.7.8/', './vendor/three-mesh-bvh/')
s = s.replace('https://cdn.jsdelivr.net/npm/three-gpu-pathtracer@0.0.23/', './vendor/three-gpu-pathtracer/')
assert "cdn.jsdelivr" not in s and "googleapis" not in s and "cdnjs" not in s
head = ('<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
        '<style>html,body{margin:0;padding:0}body{min-height:100vh;min-height:100dvh}</style>\n'
        f'<script>window.NOVERA_BUILD = "{time.strftime("%Y-%m-%d %H:%M", time.gmtime(time.time() + 3 * 3600))}";</script>\n</head>\n<body>\n')
sw = ('\n<script>\n'
      'if ("serviceWorker" in navigator) {\n'
      '  // look for a new version on every open and whenever the app comes back to the screen; reload once it is in\n'
      '  let reloaded = false;\n'
      '  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });\n'
      '  addEventListener("load", () => navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => {\n'
      '    r.update().catch(() => {});\n'
      '    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") r.update().catch(() => {}); });\n'
      '  }).catch(() => {}));\n'
      '}\n</script>\n'
      '</body>\n</html>\n')
open(p, "w", encoding="utf-8").write(head + s + sw)

# service worker: precache every file, serve from the cache, refresh in the background
files = []
for dp, _, fs in os.walk(OUT):
    for f in fs:
        rel = os.path.relpath(os.path.join(dp, f), OUT).replace(os.sep, "/")
        if rel != "sw.js": files.append(rel)
h = hashlib.sha1()
for f in sorted(files): h.update(f.encode()); h.update(open(os.path.join(OUT, f), "rb").read())
ver = h.hexdigest()[:10]
open(os.path.join(OUT, "sw.js"), "w").write(f"""// NOVERA Studio offline cache — generated by tools/build_pwa.py
const VERSION = "novera-{ver}";
const FILES = {json.dumps(["./"] + sorted(files))};
self.addEventListener("install", (e) => {{ e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener("activate", (e) => {{
  e.waitUntil(caches.keys().then(async (ks) => {{
    const old = ks.filter((k) => k !== VERSION);
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    // pages opened with an older version reload themselves onto this one (not on the very first install)
    if (old.length) (await self.clients.matchAll({{ type: "window" }})).forEach((c) => c.navigate(c.url).catch(() => {{}}));
  }}));
}});
// online: always the newest file (and keep a copy); offline: the copy
self.addEventListener("fetch", (e) => {{
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {{
    const cache = await caches.open(VERSION);
    try {{
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
      const res = await fetch(e.request, {{ cache: "no-cache", signal: ctl.signal }});
      clearTimeout(t);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }} catch {{
      return (await cache.match(e.request, {{ ignoreSearch: true }})) || (await caches.match(e.request, {{ ignoreSearch: true }})) || Response.error();
    }}
  }})());
}});
""")
total = sum(os.path.getsize(os.path.join(OUT, f)) for f in files)
print(f"{len(files)} files, {total/1e6:.1f} MB, cache {ver}")
