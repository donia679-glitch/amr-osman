// NOVERA Studio — module «🛡 حماية المحركات» (v126, id "guard").
// When it is on, the smart engines (cutfitSearch, autogenRank, price, optimize, cutGroups) are provide()d to the
// registry as SERVER calls: registry.engine(name, local) runs them on the owner's Cloudflare Worker after the
// subscription / licence check, and falls back to the local function on ANY failure (no server set, no internet,
// timeout 8 s, refused subscription …). So offline the app works exactly as it does today.
// Server + setup: server/guard/README.md.
import { provide } from "../registry.js";
import * as G from "./client.js";
import { priceQuote } from "./price.js";
import { priceInput } from "./input.js";

const ID = "guard";
export const SERVER_ENGINES = ["cutfitSearch", "autogenRank", "price", "optimize", "cutGroups"];
let api = null, pop = null;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const day = (ms) => (ms ? new Date(ms).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "");
const money = (v) => Math.round(v).toLocaleString("ar-EG");

function stateLine() {
  const c = G.cfg(), S = G.status, t = G.tokenInfo();
  if (!c.url) return { cls: "off", txt: "⚪ مش متوصل بسيرفر — التطبيق شغال بالمحركات اللي على الجهاز (زي ما هو)." };
  if (S.state === "offline") return { cls: "warn", txt: `🟠 ${S.msg} — شغال بالمحركات اللي على الجهاز لحد ما النت يرجع.` };
  if (S.state === "error") return { cls: "bad", txt: `🔴 ${S.msg}` };
  if (t?.token && t.url === c.url && t.exp > Date.now()) return { cls: "ok", txt: `🟢 متوصل — ${t.kind === "appstore" ? "اشتراك App Store" : `ترخيص${t.name ? ` «${t.name}»` : ""}`} ساري لحد ${day(t.until)}` };
  return { cls: "idle", txt: "⚪ لسه ما اتصلش — دوس «اختبر الاتصال»." };
}

function html(note = "") {
  const c = G.cfg(), st = stateLine(), S = G.status;
  return `<p class="hint">القص الذكي والتسعير والتصميمات التلقائية بيشتغلوا على سيرفرك بعد التأكد من الاشتراك. لو مفيش نت أو السيرفر وقع، التطبيق بيكمّل بالمحرك اللي على الجهاز من غير ما يستنى أكتر من 8 ثواني.</p>
    <div class="gdstate ${st.cls}" style="padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);font-weight:600">${esc(st.txt)}${S.last ? `<small style="display:block;font-weight:400;color:var(--muted)">آخر طلب: ${esc(S.last.name)} في ${S.last.ms} مللي ثانية · طلبات السيرفر ${S.server}</small>` : ""}</div>
    ${note ? `<div class="hint" style="white-space:pre-wrap">${note}</div>` : ""}
    <label class="f"><span>عنوان السيرفر (Cloudflare Worker)</span><input id="gdUrl" type="url" inputmode="url" autocomplete="off" spellcheck="false" dir="ltr" placeholder="https://novera-guard.<اسمك>.workers.dev" value="${esc(c.url)}"></label>
    <label class="f"><span>مفتاح الترخيص ${G.hasNative() ? "(مش محتاجه على الآيباد ده — الاشتراك بيتأكد من Apple)" : "(للويب / ويندوز / أجهزتك)"}</span><input id="gdLic" type="text" autocomplete="off" spellcheck="false" dir="ltr" placeholder="NVL1.…" value="${esc(c.license)}"></label>
    <div class="btnrow"><button class="primary" data-g="save">💾 احفظ</button><button class="ghost2" data-g="test">🔌 اختبر الاتصال</button><button class="ghost2" data-g="price">💰 قارن السعر (سيرفر / جهاز)</button><button class="ghost2 sm" data-g="forget">↺ انسى الجلسة</button></div>
    <details><summary>🔑 اعمل مفتاح ترخيص لجهاز تاني (لصاحب السيرفر)</summary>
      <p class="hint">محتاج ADMIN_KEY اللي حطيته في Cloudflare — مش بيتحفظ على الجهاز.</p>
      <label class="f"><span>ADMIN_KEY</span><input id="gdAdm" type="password" autocomplete="off" dir="ltr"></label>
      <label class="f"><span>اسم الجهاز</span><input id="gdName" type="text" autocomplete="off" placeholder="كمبيوتر الورشة"></label>
      <label class="f"><span>عدد الأيام</span><input id="gdDays" type="text" inputmode="numeric" value="365" dir="ltr"></label>
      <div class="btnrow"><button class="ghost2" data-g="mint">🔑 اعمل المفتاح</button></div>
      <div id="gdKey"></div></details>
    <details><summary>إيه اللي بيتحمى وإيه لأ؟</summary><p class="hint">• اللي بيتبعت للسيرفر: أرقام ومقاسات بس (قطع، أسعار، كميات) — مش التصميم كله.<br>• المحركات اللي على السيرفر (${SERVER_ENGINES.join(" · ")}) بتشتغل هناك لما يكون فيه نت؛ نسختها اللي على الجهاز لسه موجودة علشان الشغل من غير نت — يعني الحماية الكاملة لمحرك معين = نشيل نسخته من التطبيق ويبقى محتاج نت.<br>• بناء الآيباد بـ --protect بيصعّب قراية الكود (تصغير + تغيير الأسماء) لكن مش بيمنعها.</p></details>`;
}
function redraw(note) { pop?.set(html(note)); }

async function act(a) {
  const val = (id) => pop?.el.querySelector(id)?.value?.trim() ?? "";
  if (a === "save" || a === "test") {
    G.setCfg({ url: val("#gdUrl"), license: val("#gdLic") });
    G.resetOffline();
    if (a === "save") { api?.alertBar?.("🛡 اتحفظ"); return redraw(); }
  }
  if (a === "forget") { G.forget(); G.status.state = "idle"; return redraw("الجلسة اتمسحت — هيطلب واحدة جديدة أول ما يحتاج."); }
  if (a === "test") {
    redraw("⏳ بيتصل…");
    const out = [];
    try {
      const h = await G.health();
      out.push(`✓ السيرفر شغال — المحركات: ${(h.engines || []).join("، ")}`);
      const t = await G.session(true);
      out.push(`✓ ${t.kind === "appstore" ? "الاشتراك اتأكد من Apple" : "مفتاح الترخيص سليم"} — لحد ${day(t.until)}`);
      const r = await G.call("hello", [{ a: 2, b: 3 }]);
      out.push(r?.sum === 5 ? "✓ تشغيل محرك على السيرفر نجح" : "✗ المحرك رد برد غريب");
      if (api?.optimize) {
        const parts = [[72, 56], [80, 56], [57.4, 39.7], [200, 58], [45, 33], [120, 45]].map(([w, h], i) => ({ name: `T${i}`, w, h }));
        const opts = { sheetW: 244, sheetH: 122, kerf: 0.4, trim: 1, timeCap: 1 };
        const s = await G.call("optimize", [parts, opts]), l = api.optimize(parts, opts);
        out.push(s?.sheets?.length === l?.sheets?.length ? `✓ رص القطع على السيرفر = الجهاز (${l.sheets.length} لوح)` : `✗ رص القطع مختلف: سيرفر ${s?.sheets?.length} / جهاز ${l?.sheets?.length}`);
      }
    } catch (e) { out.push(`✗ ${e.message || e}`); }
    return redraw(esc(out.join("\n")));
  }
  if (a === "price") {
    redraw("⏳ بيحسب…");
    try {
      if (api.runCut) await new Promise((res) => api.runCut(() => res()));
      const local = api.quoteCalc();
      if (!local) throw new Error("خطة القص لسه ما خلصتش");
      const inp = priceInput(api);
      const mine = priceQuote(inp);
      const srv = await G.call("price", [inp]);
      const lu = new Map(local.perUnit.map((x) => [x.u.id, x.price]));
      const du = Math.max(0, ...srv.perUnit.map((x) => Math.abs(x.price - (lu.get(x.id) ?? Infinity))));
      const same = Math.abs(srv.total - local.total) < 0.5 && Math.abs(mine.total - local.total) < 0.5 && du < 0.5 && srv.lines.length === local.lines.length;
      return redraw(esc(`${same ? "✓" : "✗"} سعر البيع: السيرفر ${money(srv.total)} · الجهاز ${money(local.total)} ج.م\nالتكلفة: السيرفر ${money(srv.cost)} · الجهاز ${money(local.cost)} · الهالك ${srv.waste ?? "—"}%\n${du < 0.5 ? "✓" : "✗"} سعر كل وحدة (${srv.perUnit.length}) · ${srv.lines.length} بند`));
    } catch (e) { return redraw(esc(`✗ ${e.message || e}`)); }
  }
  if (a === "mint") {
    const box = pop?.el.querySelector("#gdKey");
    try {
      G.setCfg({ url: val("#gdUrl"), license: val("#gdLic") });
      const r = await G.mint(val("#gdAdm"), val("#gdName"), +val("#gdDays") || 365);
      if (box) box.innerHTML = `<label class="f"><span>المفتاح (انسخه وحطه في الجهاز التاني) — لحد ${esc(day(r.exp))} · id ${esc(r.id)}</span><input readonly dir="ltr" value="${esc(r.key)}" onfocus="this.select()"></label>`;
    } catch (e) { if (box) box.innerHTML = `<p class="hint">✗ ${esc(e.message || e)}</p>`; }
  }
}

function open() {
  if (pop) { pop.close(); pop = null; }
  pop = api.popup({ title: "🛡 حماية المحركات (السيرفر)", html: html(), onClose: () => { pop = null; } });
  pop.el.addEventListener("click", (e) => { const b = e.target.closest("[data-g]"); if (b) { e.preventDefault(); act(b.dataset.g); } });
}

export default {
  init(a) {
    api = a;
    // the engines the other modules / the app ask for through registry.engine(name, local)
    for (const name of SERVER_ENGINES) provide(name, (...args) => G.call(name, args), ID);
  },
  destroy() { pop?.close(); pop = null; },
  slots: {
    menu: () => `<button class="mitem" data-mod="guard:open"><span class="mic">🛡</span><span><b>حماية المحركات</b><small>${esc(stateLine().txt)}</small></span></button>`,
  },
  cmd: () => [{ label: "🛡 حماية المحركات (السيرفر)", run: open, hint: "عنوان السيرفر · الاشتراك · اختبار" }],
  action(a) { if (a === "open") open(); },
  // for tests / other modules
  _G: G,
};
