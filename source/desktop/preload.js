// the same bridge names the iPad app uses (window.webkit.messageHandlers.*), so the web code needs no Windows branch:
// noveraVault = a file per project in Documents\NOVERA Studio\Projects, noveraSave = "Save as" for exports.
"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const handler = (ch) => ({ postMessage: (body) => ipcRenderer.send(ch, body) });
contextBridge.exposeInMainWorld("webkit", { messageHandlers: { noveraVault: handler("vault"), noveraSave: handler("save") } });
contextBridge.exposeInMainWorld("noveraDesktop", { platform: process.platform });
