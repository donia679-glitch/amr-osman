"""Makes _preview/: the same site shaped for the claude.ai online preview (the page wrapper adds its own <html>/<head>/<body>
to the main page, and the main page is served at "./" rather than "index.html"). The real site is the website/ folder itself."""
import os, re, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "_preview")
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
shutil.copytree(os.path.join(ROOT, "assets"), os.path.join(OUT, "assets"))
for f in ["site.webmanifest"]:
    shutil.copy(os.path.join(ROOT, f), OUT)
for name in os.listdir(ROOT):
    if not name.endswith(".html"):
        continue
    s = open(os.path.join(ROOT, name), encoding="utf-8").read()
    s = re.sub(r'href="index\.html(#[^"]*)?"', lambda m: f'href="./{m.group(1) or ""}"', s)
    if name == "index.html":
        s = re.sub(r"<!doctype html>\s*<html[^>]*>\s*<head>\s*", "", s, flags=re.I)
        s = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', "", s)
        s = s.replace("</head>\n<body>\n", "\n").replace("</body>\n</html>\n", "")
    open(os.path.join(OUT, name), "w", encoding="utf-8").write(s)
print("preview ready:", sorted(os.listdir(OUT)))
