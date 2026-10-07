#!/usr/bin/env python3
"""NOVERA Studio for Windows (outside the Microsoft Store) — run after build_pwa.py.

dist/pwa + desktop/ (Electron shell) → dist/win/NOVERA Studio/ (portable folder)
                                      → dist/NOVERA-Studio-Setup.exe (NSIS installer, per-user, no admin rights)

Downloads (GitHub releases only — the sandbox allows nothing else), cached in ~/.cache/novera-win:
  electron-v{EV}-win32-x64.zip, NSIS 3.0.4.1 (has a Linux makensis) + 7-Zip for Linux to unpack it.
The exe gets the NOVERA icon + name written into its resources here (no rcedit / wine needed).
"""
import io, json, os, re, shutil, struct, subprocess, sys, tarfile, urllib.request, zipfile
from PIL import Image

EV = "33.2.1"
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
DIST = os.path.join(SRC, "dist")
PWA = os.path.join(DIST, "pwa")
CACHE = os.path.expanduser("~/.cache/novera-win")
OUT = os.path.join(DIST, "win", "NOVERA Studio")
EXE = "NOVERA Studio.exe"
SETUP = os.path.join(DIST, "NOVERA-Studio-Setup.exe")


def fetch(url, name):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        print("download", url)
        with urllib.request.urlopen(url) as r, open(p + ".part", "wb") as f:
            shutil.copyfileobj(r, f)
        os.replace(p + ".part", p)
    return p


def tools():
    z7 = os.path.join(CACHE, "7z", "7zz")
    if not os.path.exists(z7):
        t = fetch("https://github.com/ip7z/7zip/releases/download/24.08/7z2408-linux-x64.tar.xz", "7z.tar.xz")
        with tarfile.open(t) as tf:
            tf.extractall(os.path.join(CACHE, "7z"), filter="data")
    nsis = os.path.join(CACHE, "nsis")
    if not os.path.exists(os.path.join(nsis, "linux", "makensis")):
        a = fetch("https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-3.0.4.1/nsis-3.0.4.1.7z", "nsis.7z")
        subprocess.run([z7, "x", "-y", "-o" + nsis, a], check=True, stdout=subprocess.DEVNULL)
    os.chmod(os.path.join(nsis, "linux", "makensis"), 0o755)
    return nsis


# ---------------------------------------------------------------- PE resources: icon + names, patched in place
def pe_sections(b):
    pe = struct.unpack_from("<I", b, 0x3C)[0]
    nsec, optsz = struct.unpack_from("<H", b, pe + 6)[0], struct.unpack_from("<H", b, pe + 20)[0]
    opt = pe + 24
    dd = opt + (112 if struct.unpack_from("<H", b, opt)[0] == 0x20B else 96)
    rsrc_rva = struct.unpack_from("<I", b, dd + 16)[0]
    secs = []
    for i in range(nsec):
        o = opt + optsz + 40 * i
        vsize, va, rsize, raw = struct.unpack_from("<IIII", b, o + 8)
        secs.append((va, max(vsize, rsize), raw))
    return rsrc_rva, secs


def rva2off(secs, rva):
    for va, sz, raw in secs:
        if va <= rva < va + sz:
            return rva - va + raw
    raise ValueError("rva")


def res_entries(b, base, off):
    named, ids = struct.unpack_from("<HH", b, off + 12)
    for i in range(named + ids):
        name, child = struct.unpack_from("<II", b, off + 16 + 8 * i)
        yield name, child


def res_data(b, rsrc_rva, secs, rtype):
    """[(id, data_entry_offset)] for a resource type (first language of each)"""
    base = rva2off(secs, rsrc_rva)
    out = []
    for name, child in res_entries(b, base, base):
        if name != rtype or not child & 0x80000000:
            continue
        for nid, c2 in res_entries(b, base, base + (child & 0x7FFFFFFF)):
            for _, c3 in res_entries(b, base, base + (c2 & 0x7FFFFFFF)):
                out.append((nid, base + (c3 & 0x7FFFFFFF)))
                break
    return out


def patch_exe(path, png512):
    b = bytearray(open(path, "rb").read())
    rsrc_rva, secs = pe_sections(b)
    icons = {i: e for i, e in res_data(b, rsrc_rva, secs, 3)}
    groups = res_data(b, rsrc_rva, secs, 14)
    src = Image.open(png512).convert("RGBA")
    pngs = []
    for s in (256, 48, 32, 16, 128, 64, 24):  # the exe has 4 icon slots: the sizes Windows uses most go first
        bio = io.BytesIO()
        src.resize((s, s), Image.LANCZOS).save(bio, "PNG", optimize=True)
        pngs.append((s, bio.getvalue()))
    for gid, ge in groups[:1]:
        g_rva, g_size = struct.unpack_from("<II", b, ge)
        go = rva2off(secs, g_rva)
        n = struct.unpack_from("<H", b, go + 4)[0]
        slots = []  # (size, icon id)
        for k in range(n):
            iid = struct.unpack_from("<H", b, go + 6 + 14 * k + 12)[0]
            if iid in icons:
                slots.append((struct.unpack_from("<I", b, icons[iid] + 4)[0], iid))
        slots.sort(reverse=True)
        used, entries = set(), []
        for s, data in pngs:  # biggest image → biggest free slot
            for sz, iid in slots:
                if iid not in used and sz >= len(data):
                    used.add(iid)
                    de = icons[iid]
                    o = rva2off(secs, struct.unpack_from("<I", b, de)[0])
                    b[o:o + sz] = data + b"\0" * (sz - len(data))
                    struct.pack_into("<I", b, de + 4, len(data))
                    entries.append((s, len(data), iid))
                    break
        grp = struct.pack("<HHH", 0, 1, len(entries)) + b"".join(
            struct.pack("<BBBBHHIH", s % 256, s % 256, 0, 0, 1, 32, ln, iid) for s, ln, iid in entries)
        assert len(grp) <= g_size
        b[go:go + g_size] = grp + b"\0" * (g_size - len(grp))
        struct.pack_into("<I", b, ge + 4, len(grp))
        print("exe icon:", [e[0] for e in entries])
    # version strings (Task Manager / Properties): same byte length, padded with NULs
    for vid, ve in res_data(b, rsrc_rva, secs, 16):
        v_rva, v_size = struct.unpack_from("<II", b, ve)
        o = rva2off(secs, v_rva)
        blob = bytes(b[o:o + v_size])
        for old, new in (("GitHub, Inc.", "NOVERA"), ("Electron", "NOVERA"), ("electron.exe", "NOVERA.exe")):
            ob = (old + "\0").encode("utf-16-le")
            nb = (new + "\0").encode("utf-16-le")
            nb = nb + b"\0" * (len(ob) - len(nb))
            blob = blob.replace(ob, nb[:len(ob)])
        b[o:o + v_size] = blob
    open(path, "wb").write(bytes(b))


def main():
    if not os.path.exists(os.path.join(PWA, "index.html")):
        sys.exit("build_pwa.py first")
    nsis = tools()
    ez = fetch(f"https://github.com/electron/electron/releases/download/v{EV}/electron-v{EV}-win32-x64.zip", f"electron-v{EV}-win32-x64.zip")
    shutil.rmtree(os.path.dirname(OUT), ignore_errors=True)
    os.makedirs(OUT)
    with zipfile.ZipFile(ez) as z:
        z.extractall(OUT)
    os.rename(os.path.join(OUT, "electron.exe"), os.path.join(OUT, EXE))
    for f in os.listdir(os.path.join(OUT, "locales")):
        if f not in ("ar.pak", "en-US.pak", "en-GB.pak"):
            os.remove(os.path.join(OUT, "locales", f))
    res = os.path.join(OUT, "resources")
    for f in os.listdir(res):
        if f.startswith("default_app"):
            os.remove(os.path.join(res, f))
    appd = os.path.join(res, "app")
    os.makedirs(appd)
    for f in ("main.js", "preload.js"):
        shutil.copy(os.path.join(SRC, "desktop", f), appd)
    ver = version()
    json.dump({"name": "novera-studio", "productName": "NOVERA Studio", "version": f"1.{ver}.0", "main": "main.js",
               "description": "NOVERA Kitchen Studio", "author": "NOVERA"}, open(os.path.join(appd, "package.json"), "w"), indent=1)
    shutil.copytree(PWA, os.path.join(appd, "pwa"), ignore=shutil.ignore_patterns("sw.js"))
    png = os.path.join(PWA, "icons", "icon-512.png")
    shutil.copy(png, os.path.join(appd, "icon.png"))
    ico = os.path.join(OUT, "NOVERA.ico")
    Image.open(png).convert("RGBA").save(ico, sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])
    patch_exe(os.path.join(OUT, EXE), png)
    # installer
    nsi = open(os.path.join(SRC, "desktop", "installer.nsi"), encoding="utf-8").read()
    nsi = nsi.replace("@VERSION@", f"1.{ver}.0").replace("@VNN@", f"v{ver}")
    nsi_path = os.path.join(DIST, "win", "installer.nsi")
    open(nsi_path, "w", encoding="utf-8-sig").write(nsi)
    if os.path.exists(SETUP):
        os.remove(SETUP)
    env = dict(os.environ, NSISDIR=nsis)
    subprocess.run([os.path.join(nsis, "linux", "makensis"), "-V2", f"-DSRC={OUT}", f"-DOUTFILE={SETUP}", nsi_path], check=True, env=env)
    print("->", SETUP, round(os.path.getsize(SETUP) / 1e6, 1), "MB")


def version():
    # desktop/version.txt holds the app version number (vNN) — bump it with every shipped version
    return int(open(os.path.join(SRC, "desktop", "version.txt")).read().strip())


if __name__ == "__main__":
    main()
