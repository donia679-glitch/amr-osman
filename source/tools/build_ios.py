"""Package the iPad / iPhone app as a Swift Playgrounds project: dist/NOVERA Studio.swiftpm (+ a zip).
It holds the Swift wrapper (ios/) and the offline web app (dist/pwa) in Web/. Run tools/build_pwa.py first."""
import os, shutil, zipfile, sys, subprocess
# v126 guard: `python3 tools/build_ios.py --protect` (or NOVERA_PROTECT=1) minifies + renames the local names in the
# app's own JS inside Web/ (esbuild, no bundling, top-level / exported names and every string kept). OFF by default.
PROTECT = "--protect" in sys.argv or os.environ.get("NOVERA_PROTECT") == "1"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dist", "NOVERA Studio.swiftpm")
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
for f in ["Package.swift", "MyApp.swift", "WebView.swift", "Store.swift", "RoomScan.swift", "ARView.swift", "QRScan.swift", "PrivacyInfo.xcprivacy"]:
    shutil.copy(os.path.join(ROOT, "ios", f), OUT)
# the App Store icon: 1024 × 1024, opaque, full bleed (iOS rounds the corners)
import json
from PIL import Image, ImageDraw, ImageFont
ic = os.path.join(OUT, "Assets.xcassets", "AppIcon.appiconset")
os.makedirs(ic)
def novera_mark(size, pad=0.0):
    """the NOVERA mark, same as the website: deep green square, two cream panels, the brass profile between them, the brass base line"""
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (size, size), "#0f2e1c")
    d = ImageDraw.Draw(im)
    s = size * (1 - 2 * pad) / 40.0; o = size * pad
    P = lambda x, y: (o + x * s, o + y * s)
    d.rectangle([P(9, 9), P(16, 31)], fill="#e9d9b0")
    d.rectangle([P(24, 9), P(31, 31)], fill="#e9d9b0")
    d.polygon([P(16, 9), P(19, 9), P(24, 31), P(21, 31)], fill="#b98d34")
    d.rectangle([P(6, 33), P(34, 35)], fill="#b98d34")
    return im
S = 1024
im = novera_mark(S)
im.save(os.path.join(ic, "icon-1024.png"))
json.dump({"images": [{"filename": "icon-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}], "info": {"author": "xcode", "version": 1}}, open(os.path.join(ic, "Contents.json"), "w"), indent=1)
json.dump({"info": {"author": "xcode", "version": 1}}, open(os.path.join(OUT, "Assets.xcassets", "Contents.json"), "w"), indent=1)
shutil.copytree(os.path.join(ROOT, "dist", "pwa"), os.path.join(OUT, "Web"), ignore=shutil.ignore_patterns("sw.js", "manifest.webmanifest"))
def protect(web):
    """v126 guard — the honest second layer: anything on the device can be read, this only makes it much harder.
    Minify (whitespace, comments, local names) every app JS file in Web/ except vendor/ (three.js etc.)."""
    cands = [os.environ.get("ESBUILD"), shutil.which("esbuild"), "/opt/npm-tools/node_modules/esbuild/bin/esbuild"]
    eb = next((c for c in cands if c and os.path.exists(c)), None)
    if not eb:
        print("--protect: esbuild not found (set ESBUILD=/path/to/esbuild) — Web/ left as is"); return False
    files = []
    for dp, _, fs in os.walk(web):
        if os.path.relpath(dp, web).replace(os.sep, "/").split("/")[0] == "vendor": continue
        files += [os.path.join(dp, f) for f in fs if f.endswith((".js", ".mjs"))]
    before = sum(os.path.getsize(f) for f in files)
    # no --format and no --bundle: each file stays the same kind of script / module, top-level names are kept
    subprocess.run([eb, *files, "--minify", "--charset=utf8", "--legal-comments=none", f"--outdir={web}", f"--outbase={web}", "--allow-overwrite", "--log-level=warning"], check=True)
    after = sum(os.path.getsize(f) for f in files)
    print(f"--protect: {len(files)} JS files minified {before // 1024} KB → {after // 1024} KB")
    return True
if PROTECT:
    protect(os.path.join(OUT, "Web"))
z = os.path.join(ROOT, "dist", "NOVERA-Studio-iPad-app.zip")
with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
    for dp, _, fs in os.walk(OUT):
        for f in fs:
            p = os.path.join(dp, f)
            zf.write(p, os.path.relpath(p, os.path.dirname(OUT)))
print(sum(len(fs) for _, _, fs in os.walk(OUT)), "files →", z, os.path.getsize(z) // 1024, "KB")
