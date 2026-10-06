"""Package the iPad / iPhone app as a Swift Playgrounds project: dist/NOVERA Studio.swiftpm (+ a zip).
It holds the Swift wrapper (ios/) and the offline web app (dist/pwa) in Web/. Run tools/build_pwa.py first."""
import os, shutil, zipfile
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
S = 1024
im = Image.new("RGB", (S, S), "#0e2a18")
d = ImageDraw.Draw(im)
for i in range(S // 2, 0, -4):  # soft radial light behind the mark
    t = i / (S / 2)
    c = tuple(int(a + (b - a) * (1 - t)) for a, b in zip((14, 42, 24), (27, 90, 51)))
    d.ellipse([S / 2 - i * 1.25, S * 0.42 - i * 1.1, S / 2 + i * 1.25, S * 0.42 + i * 1.1], fill=c)
m = int(S * 0.2)
d.rounded_rectangle([m, m, S - m, S - m], radius=int(S * 0.16), fill="#d9a63a")
try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(S * 0.44))
except Exception: f = ImageFont.load_default()
d.text((S / 2, S / 2 + S * 0.015), "N", fill="#0e2a18", font=f, anchor="mm")
im.save(os.path.join(ic, "icon-1024.png"))
json.dump({"images": [{"filename": "icon-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}], "info": {"author": "xcode", "version": 1}}, open(os.path.join(ic, "Contents.json"), "w"), indent=1)
json.dump({"info": {"author": "xcode", "version": 1}}, open(os.path.join(OUT, "Assets.xcassets", "Contents.json"), "w"), indent=1)
shutil.copytree(os.path.join(ROOT, "dist", "pwa"), os.path.join(OUT, "Web"), ignore=shutil.ignore_patterns("sw.js", "manifest.webmanifest"))
z = os.path.join(ROOT, "dist", "NOVERA-Studio-iPad-app.zip")
with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
    for dp, _, fs in os.walk(OUT):
        for f in fs:
            p = os.path.join(dp, f)
            zf.write(p, os.path.relpath(p, os.path.dirname(OUT)))
print(sum(len(fs) for _, _, fs in os.walk(OUT)), "files →", z, os.path.getsize(z) // 1024, "KB")
