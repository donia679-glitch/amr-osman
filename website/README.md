# موقع NOVERA

موقع ثابت (HTML + CSS + JS، من غير سيرفر ولا قاعدة بيانات)، بيترفع على أي استضافة.

## الصفحات
| الملف | الصفحة |
|---|---|
| `index.html` | الرئيسية: المصنع، الخدمات، مراحل الشغل، قطاع الوحدة بالمقاسات، التصميمات، أسئلة، حجز معاينة |
| `planner.html` | مخطط المطبخ الذكي (الشكل + أطوال الحيطان ← وحدات بمعايير NOVERA، مسقط، واجهات، مثلث الشغل، تقدير الألواح، ابعت التصميم) |
| `app.html` | صفحة تطبيق NOVERA Kitchen Studio |
| `support.html` | الدعم — **ده لينك Support URL في App Store Connect** |
| `privacy.html` | سياسة الخصوصية — **ده لينك Privacy Policy URL في App Store Connect** |
| `terms.html` | الشروط |
| `404.html` | صفحة مش موجودة |

`index.html` و`planner.html` بيتعدّلوا بإيدك؛ الباقي بيتعمل من `tools/pages.py` (`python3 tools/pages.py`).

## قبل النشر (مرة واحدة)
1. **بيانات التواصل** في أول `assets/site.js` (`CONFIG`): رقم الواتساب بالصيغة الدولية من غير + (مثلاً `2010XXXXXXXX`)، التليفون، الإيميل، لينكات السوشيال، ولينك App Store لما التطبيق ينزل. أي خانة فاضية بتظهر «يتحط قبل النشر».
2. **الأسعار المبدئية في المخطط** (اختياري): `CONFIG.pricing` — سعر المتر الطولي من/إلى لكل تشطيب. لو سبتها `null` المخطط مش بيعرض أسعار.
3. **الدومين**: غيّر `https://novera.example` للدومين الحقيقي في `index.html` و`planner.html` و`tools/pages.py` (`DOMAIN`) و`sitemap.xml` و`robots.txt`، وبعدين `python3 tools/pages.py`.

## الاستضافة على GitHub Pages بدومين حقيقي
1. ارفع محتوى فولدر `website/` في ريبو (أو فرع) GitHub Pages.
2. اعمل ملف `CNAME` جواه فيه الدومين بس (مثلاً `novera-eg.com`).
3. عند شركة الدومين: سجلات `A` لـ `185.199.108.153` و`185.199.109.153` و`185.199.110.153` و`185.199.111.153`، و`CNAME` لـ `www` على `<username>.github.io`.
4. في إعدادات Pages فعّل **Enforce HTTPS**.

## المعاينة أونلاين
`python3 tools/preview.py` بيعمل `_preview/` بنفس الموقع بشكل يناسب صفحة claude.ai (الصفحة الرئيسية من غير `<html>/<head>`). الموقع الحقيقي هو الفولدر نفسه، مش `_preview`.

## الصور
كل الصور في `assets/img/` رندر حقيقي من تطبيق NOVERA Studio (نفس الخامات والمقاسات). صور الشغل المنفّذ تتحط مكانها أو جنبها في قسم «تصميمات».

## The shop (store.html) and its control panel (admin.html)
- The catalogue is one file: `assets/store-data.json` (products, prices, categories, finishes, notes). Photos live in `assets/store/`.
- `admin.html` is the control panel (not linked from the site, `noindex`, blocked in robots.txt). First visit asks for a PIN that locks it on that device.
  Edit prices (empty = «السعر عند الطلب»), old price (shows the discount), badge, shown / featured, order, bulk % change, full product editor with photo upload,
  categories, finishes (+% on the price), deposit %, notes. Edits stay as a draft on the device; «معاينة المتجر» = `store.html?preview`.
- «انشر على الموقع» writes the file (and any new photos) to the site's GitHub repo through the GitHub API. One-time setup in the panel:
  repository `owner/repo`, branch, the site folder inside the repo (empty if the site is the repo root), and a fine-grained token with
  **Contents: Read and write** on that repository only. GitHub Pages republishes in about a minute.
  Without GitHub: «نزّل نسخة» downloads store-data.json — upload it over `assets/store-data.json` on any host.
- Orders: the cart builds a WhatsApp message (order number NV-YYMMDD-xxxx) to `CONFIG.whatsapp` in assets/site.js — no online payment.
- `tools/store_seed.py` wrote the first catalogue (product renders from the app: scratchpad scripts shots.py → crop.py); don't re-run it (`--force` overwrites the panel's work).
