# 🛡 حماية المحركات — سيرفر NOVERA (Cloudflare Worker)

الفكرة في سطرين: أي كود بيشتغل على الآيباد ممكن يتطلّع منه — التشفير جوه التطبيق بيصعّبها بس، لأن مفتاح فك التشفير لازم يبقى جوه التطبيق نفسه.
الحماية الحقيقية إن المحرك **يشتغل على سيرفر بتاعك** ومايرجعش للجهاز غير النتيجة. ده اللي الفولدر ده بيعمله، والموديول «🛡 حماية المحركات» في التطبيق بيكلّمه.

---

## ⚠️ الأول خالص: الريبو عام

الريبو `donia679-glitch/amr-osman` **عام (Public)** — علشان GitHub Pages المجاني بيحتاج كده — وجواه فولدر `source/` فيه كود التطبيق كله (محرك القص، المطابخ، التسعير…) وفولدر `studio/` النسخة المبنية.
يعني النهارده أي حد يقدر يقرا كل المحركات من GitHub من غير ما يفك التطبيق أصلاً. **قبل أي حماية تانية:**
1. اعمل الريبو **Private** (GitHub → الريبو → Settings → General → آخر الصفحة «Change visibility»).
2. النسخة اللي على النت (`studio/`) تتنقل لمكان تاني: **Cloudflare Pages مجاني** وبيقبل ريبو Private (أو GitHub Pro ~4$ في الشهر يخلّي Pages يشتغل من ريبو Private — اتأكد من السعر الحالي).
3. الموقع (`website/`) نفس الكلام لما ترفعه.

---

## التكلفة (اتأكد من الأسعار الحالية على cloudflare.com/plans/developer-platform قبل ما تقرر)

| الخطة | السعر | بتغطي إيه | ينفع لإيه عندنا |
|---|---|---|---|
| **Workers مجاني** | 0 | حوالي 100 ألف طلب في اليوم، **حوالي 10 مللي ثانية معالجة (CPU) لكل طلب** | التأكد من الاشتراك والتراخيص، **التسعير**، رص قطع صغير. محرك تقيل (القص الذكي / التصميمات التلقائية / خطة قص مشروع كبير) هيتقطع في النص ← التطبيق يرجع للمحرك اللي على الجهاز لوحده |
| **Workers مدفوع** | حوالي **5$ في الشهر** | حوالي 10 مليون طلب في الشهر + وقت معالجة لحد 30 ثانية للطلب (ممكن يتزوّد) — اللي يزيد بيتحسب بالقطعة | كل المحركات التقيلة تشتغل على السيرفر فعلاً |
| عنوان `*.workers.dev` | مجاني | العنوان اللي بيتعمل لوحده | كفاية — مش محتاج دومين |
| دومين خاص (اختياري) | حسب الدومين | `api.novera…` | شكل أحسن بس |
| حساب Apple Developer | 99$ في السنة (إنت ناويه أصلاً) | الاشتراك على App Store | لازم للاشتراك نفسه، مش للسيرفر |

**البديل المجاني الأول:** ابدأ بالخطة المجانية. التسعير والتأكد من الاشتراك بيشتغلوا عليها كويس، والمحركات التقيلة بتكمّل على الجهاز زي النهارده. لما تحب تنقل القص الذكي للسيرفر فعلاً — اطلع للـ5$.

---

## إيه اللي بيتحمى وإيه لأ (بصراحة)

| | الوضع |
|---|---|
| المحركات على السيرفر (`optimize` رص القطع، `cutGroups` خطة القص كاملة، `price` معادلات التسعير، `cutfitSearch` و `autogenRank` أول ما الموديولات بتاعتهم تتكتب) | بتشتغل على Cloudflare بعد التأكد من الاشتراك. اللي بيروح للسيرفر أرقام ومقاسات بس (قطع، أسعار، كميات) — مش التصميم. |
| نفس المحركات **جوه التطبيق** | لسه موجودة علشان الشغل من غير نت. يعني اللي يفك التطبيق لسه يلاقيها (وفي `--protect` بتبقى مصغّرة وأسماءها متغيرة). **الحماية الكاملة لمحرك معين = نشيل نسخته من التطبيق** ويبقى محتاج نت. اقتراحي: محرك القص العادي يفضل على الجهاز (الورشة لازم تشتغل من غير نت، وهو خوارزمية معروفة)، والتسعير + القص الذكي + التصميمات التلقائية يتشالوا من التطبيق بعد ما تجرّب السيرفر شهر. ده قرارك — قولّي وأنا أعمله. |
| أسعارك وهامش ربحك | النهارده متخزنين على الجهاز في الإعدادات (لازم علشان عرض السعر يطلع من غير نت). ممكن بعدين يتنقلوا للسيرفر بس. |
| `--protect` في بناء الآيباد | تصغير + تغيير أسماء المتغيرات الداخلية (esbuild). بيصعّب القراية بس مش بيمنعها. |
| شاشات التطبيق | دي الواجهة — بتتشاف في كل الأحوال. |

نقطة ضعف معروفة: إيصال الاشتراك (JWS) اللي Apple بتوقّعه ينفع يتنسخ من جهاز مفكوك ويتستخدم من مكان تاني لحد ما الاشتراك ده يخلص. علشان كده: حد الطلبات لكل اشتراك، وقايمة إيقاف `REVOKED`، وبعدين لو حبيت: التأكد المباشر من Apple (App Store Server API — مجاني، محتاج مفتاح In-App Purchase من App Store Connect).

---

## من غير نت إيه اللي بيحصل؟

ولا حاجة تتغير. كل طلب للسيرفر ليه **8 ثواني بالكتير**؛ لو مفيش نت أو السيرفر وقع أو الاشتراك مرفوض ← المحرك اللي على الجهاز بيشتغل على طول، والتطبيق مابيحاولش يكلّم السيرفر تاني لمدة دقيقة (علشان مايستناش 8 ثواني كل مرة). الجلسة (token) بتتحفظ على الجهاز ساعة، فالطلبات اللي بعدها مابتستناش التأكد من الاشتراك.

---

## خطوات التركيب (مرة واحدة)

### 1) حساب Cloudflare
1. ادخل **dash.cloudflare.com/sign-up** واعمل حساب بالإيميل (مجاني، مش محتاج كارت).
2. من القايمة: **Workers & Pages** ← هيطلب منك تختار اسم صغير للحساب (subdomain) — مثلاً `novera`. العنوان هيبقى `https://novera-guard.novera.workers.dev`.

### 2) نزّل السيرفر (الطريقة الأسهل — من الكمبيوتر)
محتاج **Node.js** (من nodejs.org، نسخة LTS) وفولدر الريبو على الكمبيوتر.
```
cd server/guard
npx wrangler login            ← بيفتح المتصفح، دوس Allow
npx wrangler deploy           ← بينسخ المحركات من التطبيق ويرفع السيرفر (أمر wrangler.toml [build] بيشغّل sync.mjs لوحده)
```
آخر سطر هيطبع العنوان `https://novera-guard.<اسمك>.workers.dev`.

**من غير كمبيوتر فيه Node؟** في جلسة Claude: `node server/guard/sync.mjs --bundle` بيطلّع ملف واحد `server/guard/dist/worker.js`. في Cloudflare: Workers & Pages ← Create ← Worker ← اسمه `novera-guard` ← Deploy ← Edit code ← امسح اللي فيه والزق الملف ← Deploy. وبعدين الـVariables من الداشبورد (الخطوة 3 و 4).

### 3) الأسرار (Secrets) — كل واحد كلام عشوائي طويل (32 حرف أو أكتر)
```
npx wrangler secret put SESSION_SECRET
npx wrangler secret put LICENSE_SECRET
npx wrangler secret put ADMIN_KEY          (اختياري — علشان تعمل مفاتيح ترخيص من التطبيق)
```
أو من الداشبورد: الـWorker ← **Settings ← Variables and Secrets ← Add** ← النوع **Secret**.
تعمل كلام عشوائي إزاي: `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"` — واحتفظ بـ LICENSE_SECRET و ADMIN_KEY في مكان آمن (مدير كلمات سر).

### 4) القيم العادية (Variables) — موجودة في `wrangler.toml`
| الاسم | القيمة | منين |
|---|---|---|
| `BUNDLE_ID` | `com.novera.studio` | نفس `bundleIdentifier` في ios/Package.swift |
| `PRODUCT_IDS` | `novera.studio.monthly,novera.studio.yearly` | نفس Product IDs في App Store Connect و ios/Store.swift |
| `APPLE_ENVIRONMENTS` | `Production,Sandbox` وقت التجربة ← `Production` بس بعد النزول على الستور | |
| `RATE_PER_MIN` | `60` | أقصى طلبات في الدقيقة لكل اشتراك / ترخيص |
| `MAX_ENGINE_MS` | `8000` | أقصى وقت لمحرك تقيل (على المجاني هيتقطع قبلها) |
| `REVOKED` | فاضي | IDs مفاتيح ترخيص أو originalTransactionId توقفها (مفصولة بفاصلة) |
| `ALLOWED_ORIGINS` | فاضي | عناوين زيادة للتطبيق لو نقلته (مثلاً عنوان Cloudflare Pages) |

### 5) في التطبيق
☰ أو ⚙ ← **🧩 الموديولات** ← شغّل **🛡 حماية المحركات** ← ☰ ← «🛡 حماية المحركات»:
1. **عنوان السيرفر**: `https://novera-guard.<اسمك>.workers.dev`
2. على الآيباد اللي عليه الاشتراك: مش محتاج حاجة تانية — التطبيق بيسأل Apple عن الاشتراك ويبعته للسيرفر.
3. على الويب / ويندوز / أجهزتك من غير اشتراك: **مفتاح ترخيص** (الخطوة 6).
4. **🔌 اختبر الاتصال** ← لازم يطلع ✓ أربع مرات. **💰 قارن السعر** ← السيرفر = الجهاز.

### 6) مفاتيح الترخيص (للأجهزة اللي من غير App Store)
- من التطبيق: نفس الشاشة ← «🔑 اعمل مفتاح ترخيص» ← حط ADMIN_KEY + اسم الجهاز + عدد الأيام (ADMIN_KEY مابيتحفظش).
- أو من الكمبيوتر من غير سيرفر: `LICENSE_SECRET="…" node server/guard/tools/mint-license.mjs "كمبيوتر الورشة" 365`
- توقف مفتاح: حط الـid بتاعه في `REVOKED`.

### 7) تجربة على جهازك من غير Cloudflare
`node server/guard/sync.mjs && node server/guard/test/serve.mjs 8806` ← بيطبع مفتاح ترخيص تجريبي ← حط `http://localhost:8806` في التطبيق (من نفس الكمبيوتر). الاختبارات: `node server/guard/test/test.mjs` (46 اختبار: توقيع Apple بسلسلة شهادات تجريبية، التراخيص، انتهاء الجلسة، CORS، حد الطلبات، المحركات = نفس نتيجة الجهاز).

---

## تغيير الأسرار (Rotation)
- **SESSION_SECRET**: غيّره وقت ما تحب (`npx wrangler secret put SESSION_SECRET`) — كل الأجهزة بتطلب جلسة جديدة لوحدها (أقصى حاجة ساعة).
- **LICENSE_SECRET**: لو اتغير، **كل مفاتيح الترخيص القديمة بتقف** ← اعمل مفاتيح جديدة للأجهزة. غيّره بس لو اتسرّب. لإيقاف جهاز واحد استخدم `REVOKED` بدل كده.
- **ADMIN_KEY**: غيّره في أي وقت، مفيش حاجة بتقف.
- شهادة Apple الأم (Apple Root CA – G3) مثبّتة ببصمتها؛ لو Apple غيّرتها في يوم: حط البصمة الجديدة في `APPLE_ROOT_SHA256`.

---

## ✅ المطلوب منك (Checklist)
- [ ] تخلّي ريبو GitHub **Private** وتنقل `studio/` لـ Cloudflare Pages (أهم خطوة).
- [ ] حساب Cloudflare (مجاني) + اسم الـsubdomain.
- [ ] Node.js على الكمبيوتر ← `npx wrangler login` ← `npx wrangler deploy`.
- [ ] 3 أسرار: SESSION_SECRET، LICENSE_SECRET، ADMIN_KEY — محفوظين عندك في مكان آمن.
- [ ] من App Store Connect: تتأكد إن **Bundle ID** = `com.novera.studio` و **Product IDs** = اللي في `PRODUCT_IDS` (لو غيرتهم هناك غيّرهم في الاتنين: Store.swift و wrangler.toml).
- [ ] وقت التجربة: `APPLE_ENVIRONMENTS = "Production,Sandbox"` + حساب Sandbox tester من App Store Connect. ⚠️ اختبار الاشتراك المحلي في Xcode / Playgrounds (StoreKit configuration file) **مش موقّع من Apple** والسيرفر هيرفضه — جرّب بـ Sandbox / TestFlight.
- [ ] بعد النزول على الستور: `APPLE_ENVIRONMENTS = "Production"`.
- [ ] عنوان السيرفر في التطبيق + «اختبر الاتصال» على الآيباد نفسه (الاتصال من جوه تطبيق الآيباد `novera://localhost` لسه ماتجربش على جهاز حقيقي).
- [ ] تقرر: الخطة المجانية الأول، ولا 5$ علشان المحركات التقيلة؟ وأنهي محركات تتشال من التطبيق خالص؟

---

## للمطوّر (Contract)
- **Endpoints:** `GET /v1/health` · `POST /v1/session {jws}|{license}` ← `{token, exp, until, kind, name, engines}` · `POST /v1/engine/<name> {args:[…]}` (Bearer token) ← `{ok, result, ms}` · `POST /v1/admin/license {name, days}` (Bearer ADMIN_KEY).
- **محرك جديد:** دالة **pure** (JSON داخل ← JSON خارج، من غير document/window/state، imports نسبية لملفات pure بس). موديول 1: `apps/ipad/modules/cutfit/engine.js` يصدّر `cutfitSearch(...args)`؛ موديول 3: `apps/ipad/modules/autogen/engine.js` يصدّر `autogenRank(...args)`. `sync.mjs` بينسخهم (وكل اللي بيستوردوه) لـ `engines/app/` وبيضيفهم في `engines/index.js` لوحده؛ لو الملف مش موجود بيتساب. آخر argument على السيرفر = `{maxMs}` (الوقت المسموح). أي callback (onProgress) مابيروحش للسيرفر.
- **في التطبيق:** الموديول التاني بيستدعي `engine("cutfitSearch", localFn)(...args)` من `modules/registry.js` — لو «🛡» شغال وفيه سيرفر بيروح هناك، وأي فشل يرجع لـ localFn.
- **التسعير:** `apps/ipad/modules/guard/price.js` (`priceQuote(input)`) = نفس حساب `quoteCalc()` في app.js بالظبط (اتجرب على مشروع فيه 5 وحدات وكونتر وهاردوير: السيرفر = الجهاز لحد آخر جنيه، وسعر كل وحدة). المدخل بيتعمل من `modules/guard/input.js` ومحتاج سطر واحد في app.js: **`hwNorm` في `modApi()`** (اللي لسه هيتنقل). علشان التسعير الحقيقي في شاشة السعر يعدّي على السيرفر لازم app.js يستدعي `engine("price", priceQuote)(priceInput(api))` (async) بدل `quoteCalc()` — ده تغيير في app.js مش في الموديول.
- **iOS:** `WebView.swift` فيه رسالة `noveraEntitlement` بترجع `window.noveraEntitlementResult(token, {ok, jws, product, expires})` من `Transaction.currentEntitlements` (أحدث اشتراك ساري).
