// NOVERA Kitchen Studio — Windows desktop shell (Electron).
// Loads the same offline app as the iPad version from app://novera/ (a fixed origin, so projects stored in
// IndexedDB / localStorage survive updates), saves exports with a Save dialog, keeps a copy of every project as
// a file in Documents\NOVERA Studio\Projects (the same "vault" the iPad app keeps), opens web links in the browser.
"use strict";
const { app, BrowserWindow, protocol, shell, session, dialog, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "pwa");
const NAME = "NOVERA Studio";
app.setName(NAME);
app.setPath("userData", path.join(app.getPath("appData"), NAME));
if (process.platform === "win32") app.setAppUserModelId("com.novera.studio");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } },
]);

if (!app.requestSingleInstanceLock()) { app.quit(); }
// old PCs / remote desktops without GPU acceleration: let WebGL (the 3D view) fall back to software instead of failing
app.commandLine.appendSwitch("enable-unsafe-swiftshader");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8", ".pdf": "application/pdf", ".glb": "model/gltf-binary", ".hdr": "application/octet-stream",
};

let win = null;
const vaultDir = () => {
  const d = path.join(app.getPath("documents"), NAME, "Projects");
  try { fs.mkdirSync(d, { recursive: true }); } catch { /* */ }
  return d;
};
const safeId = (s) => String(s || "").replace(/[^A-Za-z0-9_-]/g, "");

function reply(wc, token, data) {
  if (!token || !wc || wc.isDestroyed()) return;
  wc.executeJavaScript(`window.noveraVaultResult && window.noveraVaultResult(${JSON.stringify(String(token))}, ${JSON.stringify(data)})`).catch(() => {});
}

ipcMain.on("vault", (e, b) => {
  if (!b || typeof b !== "object") return;
  const dir = vaultDir();
  try {
    if (b.op === "put" && b.id && typeof b.json === "string") {
      const f = path.join(dir, safeId(b.id) + ".novera.json");
      const tmp = f + ".tmp";
      fs.writeFileSync(tmp, b.json, "utf8");
      fs.renameSync(tmp, f);
    } else if (b.op === "list") {
      const items = [];
      for (const n of fs.readdirSync(dir)) {
        if (!n.endsWith(".novera.json")) continue;
        try {
          const s = fs.readFileSync(path.join(dir, n), "utf8");
          const r = JSON.parse(s);
          if (r && r.id) items.push({ id: r.id, name: r.name || "", updatedAt: r.updatedAt || "", size: Buffer.byteLength(s) });
        } catch { /* broken file */ }
      }
      reply(e.sender, b.token, items);
    } else if (b.op === "get") {
      const f = path.join(dir, safeId(b.id) + ".novera.json");
      reply(e.sender, b.token, fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
    }
  } catch { if (b.op !== "put") reply(e.sender, b.token, b.op === "list" ? [] : null); }
});

// exports (PDF, Excel, CNC zips …): a normal Windows "Save as" dialog, opening in Documents\NOVERA Studio
ipcMain.on("save", async (e, b) => {
  if (!b || !b.b64) return;
  const name = String(b.name || "NOVERA").replace(/[\\/:*?"<>|]+/g, "-");
  const base = path.join(app.getPath("documents"), NAME);
  try { fs.mkdirSync(base, { recursive: true }); } catch { /* */ }
  const ext = path.extname(name).slice(1);
  const r = await dialog.showSaveDialog(win, {
    title: "حفظ الملف", defaultPath: path.join(base, name),
    filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }, { name: "كل الملفات", extensions: ["*"] }] : [],
  });
  if (r.canceled || !r.filePath) return;
  try {
    fs.writeFileSync(r.filePath, Buffer.from(b.b64, "base64"));
    if (/\.(pdf|png|jpg|html)$/i.test(r.filePath)) shell.openPath(r.filePath);
    else shell.showItemInFolder(r.filePath);
  } catch (err) { dialog.showErrorBox("مقدرتش أحفظ الملف", String(err && err.message || err)); }
});

const isApp = (u) => u.startsWith("app://");
function external(u) {
  if (/^(https?:|mailto:|tel:|whatsapp:)/i.test(u)) shell.openExternal(u).catch(() => {});
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600, show: false,
    title: "NOVERA Kitchen Studio", backgroundColor: "#123f23",
    icon: path.join(__dirname, "icon.png"), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, spellcheck: false },
  });
  win.once("ready-to-show", () => { win.maximize(); win.show(); });
  win.on("page-title-updated", (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isApp(url) || url.startsWith("blob:") || url === "about:blank" || url.startsWith("data:")) {
      return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: path.join(__dirname, "icon.png"), webPreferences: { sandbox: true, contextIsolation: true } } };
    }
    external(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => { if (!isApp(url)) { e.preventDefault(); external(url); } });
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    const k = i.key, ctrl = i.control || i.meta, wc = win.webContents;
    if (k === "F11") { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (k === "F5" || (ctrl && k.toLowerCase() === "r")) { wc.reload(); e.preventDefault(); }
    else if (k === "F12" || (ctrl && i.shift && k.toLowerCase() === "i")) { wc.toggleDevTools(); e.preventDefault(); }
    else if (ctrl && (k === "=" || k === "+")) { wc.setZoomLevel(wc.getZoomLevel() + 0.5); e.preventDefault(); }
    else if (ctrl && k === "-") { wc.setZoomLevel(wc.getZoomLevel() - 0.5); e.preventDefault(); }
    else if (ctrl && k === "0") { wc.setZoomLevel(0); e.preventDefault(); }
  });
  win.loadURL("app://novera/index.html");
}

app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle("app", async (req) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url).pathname); } catch { return new Response("bad", { status: 400 }); }
    if (!p || p === "/") p = "/index.html";
    const f = path.normalize(path.join(ROOT, p));
    if (!f.startsWith(ROOT)) return new Response("no", { status: 403 });
    try {
      const buf = await fs.promises.readFile(f);
      return new Response(buf, { headers: { "content-type": MIME[path.extname(f).toLowerCase()] || "application/octet-stream" } });
    } catch { return new Response("not found", { status: 404 }); }
  });
  const ses = session.defaultSession;
  // camera (label QR / photos), microphone (voice notes), clipboard, full screen — it's our own offline page
  const ok = new Set(["media", "mediaKeySystem", "clipboard-read", "clipboard-sanitized-write", "fullscreen", "notifications", "pointerLock", "speaker-selection", "window-management"]);
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(ok.has(perm)));
  ses.setPermissionCheckHandler((wc, perm) => ok.has(perm));
  ses.on("will-download", (e, item) => {
    try { fs.mkdirSync(path.join(app.getPath("documents"), NAME), { recursive: true }); } catch { /* */ }
    item.setSaveDialogOptions({ title: "حفظ الملف", defaultPath: path.join(app.getPath("documents"), NAME, item.getFilename()) });
  });
  createWindow();
});

app.on("window-all-closed", () => app.quit());
