"""Builds the inner pages (app, support, privacy, terms, 404) from one shared head / header / footer.
Run from the website folder:  python3 tools/pages.py
index.html and planner.html are edited by hand."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAIN = "https://novera.example"   # change to the real domain once it is bought (also in index/planner, sitemap.xml, robots.txt)

MARK = '<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="3" fill="#0f2e1c"/><rect x="9" y="9" width="7" height="22" fill="#e9d9b0"/><rect x="24" y="9" width="7" height="22" fill="#e9d9b0"/><path d="M16 9h3l5 22h-3z" fill="#b98d34"/><rect x="6" y="33" width="28" height="2" fill="#b98d34"/></svg>'
WA = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>'
APPLE = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6s1.7-.8 3.3-.8 2 .8 3.4.8 2.2-1.3 3-2.5a10.6 10.6 0 0 0 1.4-2.8 4.4 4.4 0 0 1-2.4-4.2ZM13.9 5a4.3 4.3 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1 3.7 3.7 0 0 0 2.9-1.4Z"/></svg>'


def head(title_ar, title_en, desc, path, image="assets/img/hero-kitchen.webp", noindex=False):
    return f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title data-en="{title_en}">{title_ar}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0f2e1c">
{'<meta name="robots" content="noindex">' if noindex else f'<link rel="canonical" href="{DOMAIN}/{path}">'}
<meta property="og:type" content="website">
<meta property="og:title" content="{title_ar}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{DOMAIN}/{image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/mark.svg" type="image/svg+xml">
<link rel="manifest" href="site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Reem+Kufi:wght@500;600;700&display=swap">
<link rel="stylesheet" href="assets/site.css">
<script src="assets/site.js" defer></script>
</head>
<body>
<a class="skip" href="#main" data-en="Skip to content">انتقل للمحتوى</a>
"""


NAV = [("index.html#services", "بنعمل إيه", "What we make"), ("index.html#how", "إزاي بنشتغل", "How we work"), ("planner.html", "مخطط المطبخ", "Kitchen planner"),
       ("index.html#work", "تصميمات", "Designs"), ("app.html", "التطبيق", "The app"), ("support.html", "الدعم", "Support")]


def header(current):
    links = "\n".join(f'      <a href="{h}"{" aria-current=\"page\"" if h == current else ""} data-en="{en}">{ar}</a>' for h, ar, en in NAV)
    return f"""<header class="top">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="NOVERA">
      {MARK}
      <span><b>NOVERA</b><small data-en="Kitchens &amp; furniture">مطابخ وأثاث</small></span>
    </a>
    <nav class="nav" id="nav" aria-label="القائمة" data-en-label="Menu">
{links}
    </nav>
    <div class="tools">
      <button class="iconbtn" type="button" data-lang aria-label="English / عربي">EN</button>
      <button class="iconbtn" type="button" data-theme-toggle aria-label="الوضع الليلي" data-en-label="Dark mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg></button>
      <button class="iconbtn menu-btn" type="button" aria-controls="nav" aria-expanded="false" aria-label="القائمة" data-en-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      <a class="btn brass" href="index.html#book" data-en="Book a site visit">احجز معاينة</a>
    </div>
  </div>
</header>
"""


def page_head(crumb_ar, crumb_en, h1_ar, h1_en, p_ar, p_en):
    return f"""<section class="page-head">
    <div class="wrap">
      <p class="crumbs"><a href="index.html">NOVERA</a> / <span data-en="{crumb_en}">{crumb_ar}</span></p>
      <h1 data-en="{h1_en}">{h1_ar}</h1>
      <p data-en="{p_en}">{p_ar}</p>
    </div>
  </section>
"""


FOOTER = f"""<footer class="foot">
  <div class="wrap">
    <div class="cols">
      <div>
        <a class="brand" href="index.html" aria-label="NOVERA">
          {MARK.replace('#0f2e1c', '#17402a')}
          <span><b>NOVERA</b><small data-en="Founded and run by Eng. Amr Osman">تأسيس وإدارة م. عمرو عثمان</small></span>
        </a>
        <p style="margin-top:14px;max-width:36ch" data-en="Kitchens, wardrobes and furniture, designed in 3D and made in our workshop in Minya.">مطابخ ودريسنج وأثاث، بتتصمم 3D وتتصنع في ورشتنا في المنيا.</p>
      </div>
      <div><h4 data-en="Factory">المصنع</h4><ul><li><a href="index.html#services" data-en="What we make">بنعمل إيه</a></li><li><a href="index.html#how" data-en="How we work">إزاي بنشتغل</a></li><li><a href="index.html#work" data-en="Designs">تصميمات</a></li><li><a href="index.html#book" data-en="Book a site visit">احجز معاينة</a></li></ul></div>
      <div><h4 data-en="Tools">أدوات</h4><ul><li><a href="planner.html" data-en="Kitchen planner">مخطط المطبخ</a></li><li><a href="app.html">NOVERA Kitchen Studio</a></li><li><a href="support.html" data-en="App support">دعم التطبيق</a></li></ul></div>
      <div><h4 data-en="Follow">تابعنا</h4><ul><li><a data-social="facebook" hidden>Facebook</a></li><li><a data-social="instagram" hidden>Instagram</a></li><li><a data-social="tiktok" hidden>TikTok</a></li><li><a data-social="youtube" hidden>YouTube</a></li><li><a href="#" data-wa="أهلاً NOVERA، عندي سؤال" data-wa-en="Hello NOVERA, I have a question" target="_blank" rel="noopener">WhatsApp</a></li></ul></div>
    </div>
    <div class="legal">
      <span>© <span data-year>2026</span> NOVERA</span>
      <span><a href="privacy.html" data-en="Privacy">الخصوصية</a> · <a href="terms.html" data-en="Terms">الشروط</a> · <a href="support.html" data-en="Support">الدعم</a></span>
    </div>
  </div>
</footer>
</body>
</html>
"""


def write(name, html):
    with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", name)


# ------------------------------------------------------------------ app.html
APP = head("NOVERA Kitchen Studio — تطبيق تصميم وتصنيع المطابخ", "NOVERA Kitchen Studio — kitchen design &amp; manufacturing app",
           "تطبيق آيباد وآيفون لورش ومصانع الأثاث: تصميم مطابخ ودريسنج 3D، خطة قص بأقل هالك، ملصقات QR، دليل تجميع مصوّر، وعرض سعر.", "app.html", "assets/img/app-design.webp") + header("app.html") + f"""
<main id="main">
  <section class="hero" aria-labelledby="h-app">
    <div class="hero-grid">
      <div class="hero-copy">
        <p class="kicker" data-en="For iPad and iPhone">للآيباد والآيفون</p>
        <h1 id="h-app">NOVERA Kitchen Studio</h1>
        <p class="lead" data-en="Design a kitchen or a wardrobe on the iPad and get the cutting plan, labels, assembly guide and quotation in minutes. Built in our own factory, for workshops like ours.">صمّم المطبخ أو الدريسنج على الآيباد، وطلّع خطة القص والملصقات ودليل التجميع وعرض السعر في دقايق. اتعمل في مصنعنا، لورش زي ورشتنا.</p>
        <div class="hero-actions">
          <a class="store-badge" data-appstore aria-disabled="true" href="#plans">{APPLE}<span><small data-en="Coming soon on the">قريباً على</small><b>App Store</b></span></a>
          <a class="btn ghost light" href="#" data-wa="أهلاً، عايز أعرف أكتر عن تطبيق NOVERA Kitchen Studio لورشتي" data-wa-en="Hello, I'd like to know more about NOVERA Kitchen Studio for my workshop" target="_blank" rel="noopener" data-en="Ask about the app">اسأل عن التطبيق</a>
        </div>
      </div>
      <figure class="hero-figure" style="display:grid;place-items:center;padding:clamp(20px,4vw,48px)">
        <div class="device" style="position:relative;z-index:2;width:100%;max-width:760px"><img src="assets/img/app-design.webp" width="1366" height="1024" alt="شاشة التصميم: مطبخ L بالمقاسات وإعدادات الوحدة"></div>
      </figure>
    </div>
    <div class="hero-strip"><div class="wrap">
      <span data-en="Works <b>offline</b>">بيشتغل <b>من غير نت</b></span>
      <span data-en="Projects stay <b>on your device</b>">المشاريع <b>على جهازك</b></span>
      <span data-en="<b>Arabic</b> and English">عربي و<b>English</b></span>
      <span data-en="iPadOS and iOS <b>17+</b>">iPadOS وiOS <b>17+</b></span>
    </div></div>
  </section>

  <section class="section" aria-labelledby="h-feat">
    <div class="wrap">
      <div class="head">
        <h2 id="h-feat" data-en="From the site visit to the last screw">من المعاينة لآخر مسمار</h2>
        <p data-en="Every piece gets one number that stays the same on the cutting plan, the label, the barcode and the assembly guide.">كل قطعة ليها رقم واحد ثابت في خطة القص والملصق والباركود ودليل التجميع.</p>
      </div>
      <div class="feat">
        <div><h3 data-en="Design">صمّم</h3><ul>
          <li data-en="Kitchens: base, wall, tall, corners, oven, fridge, washer and sink units">مطابخ: سفلي وعلوي وطويل وزوايا وفرن وتلاجة وغسالة وحوض</li>
          <li data-en="Wardrobes, bedrooms, TV walls and tables">دريسنج وغرف نوم ووحدات شاشة وترابيزات</li>
          <li data-en="A 3D drawing studio for any piece">ورشة رسم 3D لأي قطعة</li>
          <li data-en="Every manufacturing setting: thickness, back groove, plinth, minifix, hinge cups, drawer boxes, banding">كل إعدادات التصنيع: السمك، الظهر والمفحار، الوزرة، الأليتا، الكبب، صناديق الأدراج، الشريط</li></ul></div>
        <div><h3 data-en="Measure">ارفع المقاسات</h3><ul>
          <li data-en="Step-by-step survey screen">شاشة رفع مقاسات خطوة بخطوة</li>
          <li data-en="Room scan with the camera on LiDAR devices">مسح الأوضة بالكاميرا على أجهزة LiDAR</li>
          <li data-en="Doors, windows, columns, power, water and gas at their heights">أبواب وشبابيك وأعمدة ونقط كهربا ومية وغاز بارتفاعاتها</li></ul></div>
        <div><h3 data-en="Manufacture">صنّع</h3><ul>
          <li data-en="Cutting plan with the least waste, sheet size per board type">خطة قص بأقل هالك، ومقاس لوح لكل نوع خامة</li>
          <li data-en="PDF labels with QR and barcode; scan them in the app">ملصقات PDF بالـQR والباركود، وتقراها من التطبيق</li>
          <li data-en="Worker mode: big numbers, pictures and voice">وضع العمال: أرقام كبيرة وصور وصوت</li>
          <li data-en="Illustrated assembly guide with every minifix joint">دليل تجميع مصوّر بكل وصلة أليتا</li></ul></div>
        <div><h3 data-en="Price &amp; share">سعّر وشارك</h3><ul>
          <li data-en="Price from each material's real area, hardware, labour, transport and your margin">السعر من مسطح كل خامة، والهاردوير والمصنعية والنقل وهامش ربحك</li>
          <li data-en="Client quotation PDF with signature">عرض سعر PDF للعميل بالتوقيع</li>
          <li data-en="Excel, CSV, PDF, DXF, CNC files and a 3D model">Excel وCSV وPDF وDXF وملفات CNC وموديل 3D</li></ul></div>
      </div>
    </div>
  </section>

  <section class="section dark" aria-labelledby="h-shots">
    <div class="wrap">
      <div class="head"><h2 id="h-shots" data-en="Inside the app">من جوه التطبيق</h2><p data-en="Real screens from a kitchen designed in the app. Swipe to see more.">شاشات حقيقية من مطبخ متصمم على التطبيق. اسحب تشوف الباقي.</p></div>
      <div class="shots" tabindex="0" aria-label="صور من التطبيق" data-en-label="App screens">
        <figure><div class="device"><img src="assets/img/app-design.webp" width="1366" height="1024" loading="lazy" alt="شاشة التصميم"></div><figcaption data-en="Design: the kitchen in the room, every unit editable">التصميم: المطبخ في الأوضة، وكل وحدة بإعداداتها</figcaption></figure>
        <figure><div class="device"><img src="assets/img/app-cut.webp" width="1366" height="1024" loading="lazy" alt="خطة القص"></div><figcaption data-en="Cutting plan: sheets, offcuts and the saw order">خطة القص: الألواح والبواقي وترتيب القص على المنشار</figcaption></figure>
        <figure><div class="device"><img src="assets/img/app-parts.webp" width="1366" height="1024" loading="lazy" alt="قايمة القطع"></div><figcaption data-en="Parts and hardware for every unit">القطع والهاردوير لكل وحدة</figcaption></figure>
        <figure><div class="device"><img src="assets/img/app-worker.webp" width="1366" height="1024" loading="lazy" alt="وضع العمال"></div><figcaption data-en="Worker mode: tap a piece, see it and hear its size">وضع العمال: دوس على القطعة تشوفها وتسمع مقاسها</figcaption></figure>
      </div>
    </div>
  </section>

  <section class="section" id="plans" aria-labelledby="h-plans">
    <div class="wrap">
      <div class="head"><h2 id="h-plans" data-en="Subscription">الاشتراك</h2><p data-en="Try every feature free for 3 days. Payment, renewal and cancellation are handled by Apple through your Apple account.">جرّب كل حاجة مجاناً 3 أيام. الدفع والتجديد والإلغاء بيتمّوا عن طريق Apple من حسابك.</p></div>
      <div class="plans">
        <div class="plan"><h3 data-en="Free trial">تجربة مجانية</h3><p class="price" data-en="3 days">3 أيام</p><p class="muted" data-en="Every feature, then it renews on the plan you choose unless you cancel.">كل المميزات، وبعدها بيتجدد على الباقة اللي اخترتها لو ما لغيتش.</p></div>
        <div class="plan main"><h3 data-en="Yearly">سنوي</h3><p class="price" data-en="Price in the App Store">السعر في App Store</p><ul><li data-en="Everything in the app">كل حاجة في التطبيق</li><li data-en="Updates as they come">التحديثات أول بأول</li><li data-en="Cancel any time from Apple settings">إلغاء في أي وقت من إعدادات Apple</li></ul></div>
        <div class="plan"><h3 data-en="Monthly">شهري</h3><p class="price" data-en="Price in the App Store">السعر في App Store</p><p class="muted" data-en="Same features, paid month by month.">نفس المميزات، بتدفع شهر بشهر.</p></div>
      </div>
      <p class="note" data-en="Restore a subscription on a new device with “Restore Purchases” in the app.">لو غيّرت الجهاز، رجّع اشتراكك من زرار «استرجاع المشتريات» جوه التطبيق.</p>
    </div>
  </section>

  <div class="profile" aria-hidden="true"></div>

  <section class="section alt" aria-labelledby="h-afaq">
    <div class="wrap">
      <div class="head"><h2 id="h-afaq" data-en="Questions about the app">أسئلة عن التطبيق</h2><p><a class="linkline" href="support.html" data-en="All help topics and contact">كل مواضيع المساعدة والتواصل</a></p></div>
      <div class="faq">
        <details><summary data-en="Which devices does it run on?">بيشتغل على أنهي أجهزة؟</summary><div><p data-en="iPad and iPhone with iPadOS or iOS 17 or later. The room scan needs a device with a LiDAR sensor (iPad Pro, iPhone Pro).">الآيباد والآيفون بنظام iPadOS أو iOS 17 أو أحدث. مسح الأوضة محتاج جهاز فيه حساس LiDAR (آيباد برو أو آيفون برو).</p></div></details>
        <details><summary data-en="Where are my projects saved?">مشاريعي بتتحفظ فين؟</summary><div><p data-en="On your device only. Keep a copy with Export → Project copy. The app also keeps automatic snapshots you can restore from «Recover a project».">على جهازك بس. اعمل نسخة من «تصدير ← نسخة من المشروع». والتطبيق كمان بيحفظ نسخ تلقائية تقدر ترجعها من «🛟 استرجاع مشروع».</p></div></details>
        <details><summary data-en="Does it work without internet?">بيشتغل من غير نت؟</summary><div><p data-en="Yes. The whole app is on the device.">أيوه. التطبيق كله على الجهاز.</p></div></details>
        <details><summary data-en="Can my workers use it?">العمال يقدروا يستخدموه؟</summary><div><p data-en="Worker mode shows each piece with a picture and big numbers and reads the sizes aloud in Egyptian Arabic. Workers scan the QR on a label to open its piece.">وضع العمال بيعرض كل قطعة بصورة وأرقام كبيرة وبيقرا المقاسات بصوت بالمصري. والعامل بيقرا الـQR اللي على الملصق تفتح القطعة بتاعته.</p></div></details>
      </div>
    </div>
  </section>
</main>
""" + FOOTER
write("app.html", APP)

# ------------------------------------------------------------------ support.html  (the App Store Support URL)
SUP = head("الدعم — NOVERA", "Support — NOVERA", "الدعم الفني لتطبيق NOVERA Kitchen Studio وتواصل مع مصنع NOVERA.", "support.html") + header("support.html") + """
<main id="main">
""" + page_head("الدعم", "Support", "إزاي نقدر نساعدك؟", "How can we help?",
                "دعم تطبيق NOVERA Kitchen Studio وأي سؤال عن شغل المصنع. ابحث في الإجابات، أو ابعتلنا المشكلة ونرد عليك.",
                "Help with NOVERA Kitchen Studio and any question about our work. Search the answers, or send us the problem and we'll reply.") + """
  <section class="section">
    <div class="wrap split" style="align-items:start">
      <div>
        <h2 style="font-size:var(--step-2);margin-bottom:16px" data-en="Answers">إجابات سريعة</h2>
        <div class="faq-search"><label class="lbl" for="faqQ" style="display:block;margin-bottom:6px;font-weight:600" data-en="Search">ابحث</label><input id="faqQ" type="search" placeholder="مثلاً: اشتراك، نسخة، كاميرا" data-en-ph="e.g. subscription, backup, camera"></div>
        <div class="faq">
          <details><summary data-en="How do I cancel or change my subscription?">إزاي ألغي أو أغيّر الاشتراك؟</summary><div><p data-en="Open Settings on your iPad or iPhone → your name → Subscriptions → NOVERA Kitchen Studio. Apple handles the change; it takes effect at the end of the current period.">افتح الإعدادات على الآيباد أو الآيفون ← اسمك ← الاشتراكات ← NOVERA Kitchen Studio. التغيير بيتم عن طريق Apple وبيسري في آخر الفترة الحالية.</p></div></details>
          <details><summary data-en="I changed my device. How do I get my subscription back?">غيّرت الجهاز، أرجّع اشتراكي إزاي؟</summary><div><p data-en="Sign in with the same Apple ID, open the app and tap “Restore Purchases” on the subscription screen.">ادخل بنفس حساب Apple، وافتح التطبيق ودوس «استرجاع المشتريات» في شاشة الاشتراك.</p></div></details>
          <details><summary data-en="How do I back up a project or move it to another device?">إزاي أعمل نسخة من مشروع أو أنقله لجهاز تاني؟</summary><div><p data-en="Export → Project copy saves one file with the whole project. Send it to the other device and open it from Projects → Open a copy.">«تصدير ← نسخة من المشروع» بيحفظ ملف واحد فيه المشروع كله. ابعته للجهاز التاني وافتحه من «مشاريعي ← افتح نسخة».</p></div></details>
          <details><summary data-en="A project disappeared">مشروع اختفى</summary><div><p data-en="On the home screen tap «Recover a project». The app keeps automatic snapshots of every project, even after it is deleted, and lost projects are listed first.">من الشاشة الرئيسية دوس «🛟 استرجاع مشروع». التطبيق بيحفظ نسخ تلقائية من كل مشروع حتى بعد مسحه، والمشاريع الضايعة بتظهر الأول.</p></div></details>
          <details><summary data-en="The camera doesn't open for the QR scan or the room scan">الكاميرا مش بتفتح لقراءة الـQR أو مسح الأوضة</summary><div><p data-en="Settings → NOVERA Studio → Camera, turn it on, then try again. The room scan needs a LiDAR device; on other devices type the measurements in the survey screen.">الإعدادات ← NOVERA Studio ← الكاميرا وشغّلها، وجرّب تاني. مسح الأوضة محتاج جهاز فيه LiDAR، وعلى باقي الأجهزة اكتب المقاسات في شاشة رفع المقاسات.</p></div></details>
          <details><summary data-en="The AR view doesn't open">عرض الـAR مش بيفتح</summary><div><p data-en="AR needs an iPhone or iPad that supports ARKit. If it doesn't open, save the AR file from the window that appears and open it from the Files app — it opens straight in the camera.">الـAR محتاج آيفون أو آيباد بيدعم ARKit. لو ما فتحش، احفظ ملف الـAR من الشباك اللي بيظهر وافتحه من تطبيق «الملفات» — هيفتح بالكاميرا على طول.</p></div></details>
          <details><summary data-en="How do I switch the language?">إزاي أغيّر اللغة؟</summary><div><p data-en="☰ → Language. The app is in Arabic and English.">من ☰ ← اللغة. التطبيق عربي وإنجليزي.</p></div></details>
          <details><summary data-en="Is my data sent anywhere?">بياناتي بتتبعت لأي مكان؟</summary><div><p data-en="No. Projects stay on your device. See the privacy policy.">لأ. المشاريع بتفضل على جهازك. شوف <a href="privacy.html">سياسة الخصوصية</a>.</p></div></details>
        </div>
        <p id="faqNone" class="note" hidden data-en="Nothing matches. Send us the question with the form.">مفيش إجابة مطابقة. ابعتلنا السؤال من الفورم.</p>
      </div>
      <div>
        <h2 style="font-size:var(--step-2);margin-bottom:16px" data-en="Contact support">كلّم الدعم</h2>
        <dl class="contact" style="margin-bottom:24px">
          <div style="border-color:var(--line)"><dt class="muted" data-en="Email">إيميل</dt><dd data-contact="email" style="color:var(--ink)"></dd></div>
          <div style="border-color:var(--line)"><dt class="muted" data-en="WhatsApp">واتساب</dt><dd data-contact="whatsapp" style="color:var(--ink)"></dd></div>
          <div style="border-color:var(--line)"><dt class="muted" data-en="Hours">المواعيد</dt><dd data-contact="hours" style="color:var(--ink)"></dd></div>
        </dl>
        <form class="form" id="supForm" novalidate>
          <div class="field"><label for="sName" data-en="Name">الاسم</label><input id="sName" autocomplete="name"></div>
          <div class="field"><label for="sReach" data-en="Email or mobile">إيميل أو موبايل</label><input id="sReach" dir="ltr" autocomplete="email"></div>
          <div class="field"><label for="sDev" data-en="Device">الجهاز</label><select id="sDev"><option>iPad</option><option>iPhone</option><option data-en="Web browser">متصفح</option></select></div>
          <div class="field"><label for="sTopic" data-en="Topic">الموضوع</label><select id="sTopic"><option data-en="A problem in the app">مشكلة في التطبيق</option><option data-en="Subscription">الاشتراك</option><option data-en="Feature request">اقتراح ميزة</option><option data-en="Factory order">طلب من المصنع</option></select></div>
          <div class="field full"><label for="sMsg" data-en="What happened?">إيه اللي حصل؟</label><textarea id="sMsg" placeholder="اكتب الخطوات اللي عملتها وإيه اللي ظهر" data-en-ph="Write the steps you took and what you saw"></textarea></div>
          <p class="form-err full" role="alert" hidden></p>
          <div class="full"><button class="btn" type="submit" data-en="Prepare the message">جهّز الرسالة</button></div>
          <div class="form-out" hidden aria-live="polite"></div>
        </form>
      </div>
    </div>
  </section>
</main>
<script>
document.addEventListener("DOMContentLoaded", () => {
  const f = document.getElementById("supForm"), N = window.NOVERA, t = N.t;
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = f.querySelector(".form-err"), msg = f.querySelector("#sMsg").value.trim(), reach = f.querySelector("#sReach").value.trim();
    if (!msg || !reach) { err.hidden = false; err.textContent = !msg ? t("اكتب المشكلة أو السؤال.", "Write the problem or question.") : t("اكتب إيميل أو رقم نرد عليك عليه.", "Add an email or number we can reply to."); (msg ? f.querySelector("#sReach") : f.querySelector("#sMsg")).focus(); return; }
    err.hidden = true;
    const text = [t("دعم NOVERA Kitchen Studio", "NOVERA Kitchen Studio support"), `${t("الاسم", "Name")}: ${f.querySelector("#sName").value.trim() || "—"}`, `${t("للرد", "Reply to")}: ${reach}`,
      `${t("الجهاز", "Device")}: ${f.querySelector("#sDev").selectedOptions[0].textContent}`, `${t("الموضوع", "Topic")}: ${f.querySelector("#sTopic").selectedOptions[0].textContent}`, "", msg].join("\\n");
    N.handoff(f.querySelector(".form-out"), text);
  });
});
</script>
""" + FOOTER
write("support.html", SUP)

# ------------------------------------------------------------------ privacy.html  (the App Store Privacy Policy URL)
PRIV = head("سياسة الخصوصية — NOVERA", "Privacy Policy — NOVERA", "سياسة الخصوصية لتطبيق NOVERA Kitchen Studio وموقع NOVERA.", "privacy.html") + header("") + """
<main id="main">
""" + page_head("الخصوصية", "Privacy", "سياسة الخصوصية", "Privacy policy", "لتطبيق NOVERA Kitchen Studio ولموقع NOVERA. آخر تحديث: 7 أكتوبر 2026.", "For the NOVERA Kitchen Studio app and the NOVERA website. Last updated: 7 October 2026.") + """
  <section class="section">
    <div class="wrap">
      <div class="prose" data-en="
        <h2>The app: NOVERA Kitchen Studio</h2>
        <p>NOVERA Kitchen Studio is an app for designing and manufacturing kitchens and furniture.</p>
        <h3>Data we collect</h3><p>The app does not collect personal data and does not send any data to the developer's servers. There is no tracking, no advertising, no analytics, and no sign-in inside the iPhone and iPad app.</p>
        <h3>Your projects</h3><p>Designs, projects, materials and settings are stored on your device only. Deleting the app deletes them, so keep a backup with “Export → Project copy”.</p>
        <h3>Camera, photos and room scanning</h3><p>The camera is used only when you choose to photograph a wall or a material, to scan a part label's QR code, or to scan the room with the LiDAR sensor (Apple RoomPlan). Photos and scan results stay on your device. When you save an exported image, the app asks only for permission to add it to your photo library.</p>
        <h3>Microphone</h3><p>The microphone is used only when you tap “Record a voice note” during a site survey. The recording is stored on your device with the project.</p>
        <h3>Files you export</h3><p>PDF, Excel, DXF and image files are created on your device; you choose where to save or send them from the share sheet.</p>
        <h3>Subscription</h3><p>Payment and subscriptions are handled entirely by Apple. The developer never receives your payment details. Cancel any time in your Apple account settings, and restore your subscription with “Restore Purchases”.</p>
        <h3>Children</h3><p>The app is meant for professionals and workshops and is not directed at children.</p>
        <h3>Deleting your data</h3><p>All your data is on your device: delete any project from “My projects”, or delete the app and its data goes with it. There is no account with us to delete.</p>
        <h2>The website</h2>
        <p>The website has no accounts, no tracking and no advertising. The booking and support forms do not send anything by themselves: they prepare a message on your device, and you choose to send it to us on WhatsApp or copy it. Your language, theme and kitchen-planner settings are kept in your own browser (local storage) so the site remembers them; nothing is sent to us. The site loads its fonts from Google Fonts, which receives your IP address as part of that request.</p>
        <h2>Contact</h2>
        <p>Developer: Eng. Amr Osman — NOVERA, Minya, Egypt. For any privacy question: email <span data-contact=&quot;email&quot;></span>, WhatsApp <span data-contact=&quot;whatsapp&quot;></span>.</p>">
        <h2>التطبيق: NOVERA Kitchen Studio</h2>
        <p>NOVERA Kitchen Studio تطبيق لتصميم وتصنيع المطابخ والأثاث.</p>
        <h3>البيانات اللي بنجمعها</h3><p>التطبيق مش بيجمع أي بيانات شخصية ومش بيبعت أي بيانات لسيرفرات المطوّر. مفيش تتبّع، ولا إعلانات، ولا أدوات تحليل، ولا تسجيل دخول جوه تطبيق الآيفون والآيباد.</p>
        <h3>مشاريعك</h3><p>التصميمات والمشاريع والخامات والإعدادات بتتحفظ على جهازك بس. لو مسحت التطبيق بتتمسح معاه، فاعمل نسخة احتياطي من «تصدير ← نسخة من المشروع».</p>
        <h3>الكاميرا والصور ومسح الأوضة</h3><p>التطبيق بيستخدم الكاميرا بس لما انت تختار: تصوير حيطة أو خامة، أو قراءة الـQR اللي على ملصق القطعة، أو مسح الأوضة بمستشعر LiDAR (RoomPlan من Apple). الصور ونتيجة المسح بيفضلوا على جهازك. ولما تحفظ صورة صدّرتها، التطبيق بيطلب إذن الإضافة لمكتبة الصور بس.</p>
        <h3>الميكروفون</h3><p>الميكروفون بيشتغل بس لما تدوس «سجّل ملاحظة صوتية» وانت بترفع المقاسات. التسجيل بيتحفظ على جهازك مع المشروع.</p>
        <h3>الملفات اللي بتصدّرها</h3><p>ملفات PDF وExcel وDXF والصور بتتعمل على جهازك، وانت اللي بتختار تحفظها أو تبعتها لمين من قايمة المشاركة.</p>
        <h3>الاشتراك</h3><p>الدفع والاشتراك بيتمّوا بالكامل عن طريق Apple، والمطوّر ما بيوصلوش بيانات الدفع بتاعتك. تقدر تلغي في أي وقت من إعدادات حسابك في Apple، وترجّع اشتراكك من «استرجاع المشتريات».</p>
        <h3>الأطفال</h3><p>التطبيق موجّه للمحترفين والورش، ومش موجّه للأطفال.</p>
        <h3>مسح البيانات</h3><p>كل بياناتك على جهازك: تقدر تمسح أي مشروع من «مشاريعي»، أو تمسح التطبيق وبياناته بتتمسح معاه. مفيش حساب عندنا يحتاج يتمسح.</p>
        <h2>الموقع</h2>
        <p>الموقع مفيهوش حسابات ولا تتبّع ولا إعلانات. فورم الحجز وفورم الدعم مش بيبعتوا حاجة لوحدهم: بيجهّزوا رسالة على جهازك، وانت اللي بتختار تبعتهالنا على واتساب أو تنسخها. اللغة والوضع الليلي وإعدادات مخطط المطبخ بتتحفظ في المتصفح بتاعك بس (التخزين المحلي) عشان الموقع يفتكرها، ومش بتتبعتلنا. الموقع بيحمّل الخطوط من Google Fonts، واللي بيوصله عنوان الـIP بتاعك مع الطلب ده.</p>
        <h2>تواصل معانا</h2>
        <p>المطوّر: م. عمرو عثمان — NOVERA، المنيا، مصر. لأي سؤال عن الخصوصية: إيميل <span data-contact="email"></span>، واتساب <span data-contact="whatsapp"></span>.</p>
      </div>
    </div>
  </section>
</main>
""" + FOOTER
write("privacy.html", PRIV)

# ------------------------------------------------------------------ terms.html
TERMS = head("الشروط — NOVERA", "Terms — NOVERA", "شروط استخدام تطبيق NOVERA Kitchen Studio وموقع NOVERA.", "terms.html") + header("") + """
<main id="main">
""" + page_head("الشروط", "Terms", "شروط الاستخدام", "Terms of use", "آخر تحديث: 7 أكتوبر 2026.", "Last updated: 7 October 2026.") + """
  <section class="section">
    <div class="wrap">
      <div class="prose" data-en="
        <h2>The app</h2>
        <p>NOVERA Kitchen Studio is licensed to you under Apple's standard End User License Agreement (EULA) for apps from the App Store, together with these terms.</p>
        <ul><li>Subscriptions are bought, renewed and cancelled through your Apple account. A subscription renews automatically unless you cancel at least 24 hours before the end of the period.</li>
        <li>The app calculates sizes, cutting plans and prices from what you enter. Check the measurements on site and the numbers before cutting; you are responsible for the work you produce with it.</li>
        <li>Your projects belong to you and stay on your device.</li></ul>
        <h2>The website and the planner</h2>
        <p>The kitchen planner gives a first layout and rough quantities. The final design, sizes and price are agreed after a site visit and stated in a written quotation.</p>
        <h2>Factory orders</h2>
        <p>Work starts after you approve the design and the quotation. The quotation states the price, what is included, the payment schedule, the delivery time and the warranty.</p>
        <h2>Contact</h2><p>NOVERA, Minya, Egypt — <a href=&quot;support.html&quot;>Support</a>.</p>">
        <h2>التطبيق</h2>
        <p>استخدام NOVERA Kitchen Studio بيكون بموجب اتفاقية ترخيص المستخدم القياسية من Apple (EULA) للتطبيقات اللي على App Store، ومعاها الشروط دي.</p>
        <ul><li>الاشتراك بيتشتري ويتجدد ويتلغي من حساب Apple بتاعك، وبيتجدد تلقائياً لو ما اتلغاش قبل نهاية الفترة بـ24 ساعة على الأقل.</li>
        <li>التطبيق بيحسب المقاسات وخطة القص والسعر من البيانات اللي بتدخلها. راجع المقاسات في الموقع والأرقام قبل القص؛ ومسؤولية الشغل اللي بتنفّذه بيه عليك.</li>
        <li>مشاريعك ملكك وبتفضل على جهازك.</li></ul>
        <h2>الموقع والمخطط</h2>
        <p>مخطط المطبخ بيدّي تصميم مبدئي وكميات تقريبية. التصميم والمقاسات والسعر النهائي بيتحددوا بعد المعاينة وبيتكتبوا في عرض سعر مكتوب.</p>
        <h2>طلبات المصنع</h2>
        <p>الشغل بيبدأ بعد موافقتك على التصميم وعرض السعر. عرض السعر بيكون فيه السعر، والمشمول فيه، ونظام الدفع، ومدة التنفيذ، والضمان.</p>
        <h2>تواصل</h2><p>NOVERA، المنيا، مصر — <a href="support.html">الدعم</a>.</p>
      </div>
    </div>
  </section>
</main>
""" + FOOTER
write("terms.html", TERMS)

# ------------------------------------------------------------------ 404.html
NF = head("الصفحة مش موجودة — NOVERA", "Page not found — NOVERA", "الصفحة دي مش موجودة.", "404.html", noindex=True) + header("") + """
<main id="main">
  <section class="section">
    <div class="wrap" style="display:grid;gap:18px;justify-items:start">
      <p class="muted" style="font:600 var(--step-3)/1 var(--f-display);color:var(--brass)">404</p>
      <h1 style="font-size:var(--step-3)" data-en="This page isn't here">الصفحة دي مش موجودة</h1>
      <p class="muted" data-en="The link may be old. Start from the home page or plan your kitchen.">ممكن يكون اللينك قديم. ابدأ من الرئيسية أو خطّط مطبخك.</p>
      <div class="hero-actions"><a class="btn" href="index.html" data-en="Home">الرئيسية</a><a class="btn ghost" href="planner.html" data-en="Kitchen planner">مخطط المطبخ</a></div>
    </div>
  </section>
</main>
""" + FOOTER
write("404.html", NF)
