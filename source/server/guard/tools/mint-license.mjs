#!/usr/bin/env node
// Makes a licence key on YOUR computer (no server call). Same LICENSE_SECRET as the Worker:
//   LICENSE_SECRET="…" node server/guard/tools/mint-license.mjs "ورشة عمرو - ويندوز" 365
// prints the key → paste it in the app: ⚙ «🧩 الموديولات» → 🛡 → «مفتاح الترخيص».
import { mintLicense } from "../lib/tokens.js";
const [name = "", days = "365"] = process.argv.slice(2);
const secret = process.env.LICENSE_SECRET;
if (!secret) { console.error("حط LICENSE_SECRET في الـ environment الأول (نفس اللي في Cloudflare)."); process.exit(1); }
const L = await mintLicense({ name, days: +days || 365 }, secret);
console.log(L.key);
console.error(`id: ${L.i} · لحد: ${new Date(L.e).toISOString().slice(0, 10)} · (لو عايز توقفه: ضيف ${L.i} في REVOKED)`);
