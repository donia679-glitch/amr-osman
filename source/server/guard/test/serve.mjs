// Run the Worker on your own computer (no Cloudflare): node server/guard/test/serve.mjs [port]
// Uses test secrets unless SESSION_SECRET / LICENSE_SECRET / ADMIN_KEY are set in the environment;
// prints a licence key you can paste in the app. Only for trying things out.
import http from "node:http";
import worker from "../worker.js";
import { mintLicense } from "../lib/tokens.js";
const port = +process.argv[2] || 8806;
const env = {
  SESSION_SECRET: process.env.SESSION_SECRET || "local-session-secret-0123456789",
  LICENSE_SECRET: process.env.LICENSE_SECRET || "local-license-secret-0123456789",
  ADMIN_KEY: process.env.ADMIN_KEY || "local-admin-key-0123456789",
  APPLE_ENVIRONMENTS: "Production,Sandbox", RATE_PER_MIN: process.env.RATE_PER_MIN || "600",
};
http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const r = await worker.fetch(new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }), env, {});
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, async () => {
  const L = await mintLicense({ name: "local test", days: 30 }, env.LICENSE_SECRET);
  console.log(`guard on http://localhost:${port}\nlicence: ${L.key}`);
});
