"""Writes the first assets/store-data.json (the shop catalogue). After that the file belongs to the control panel (admin.html):
prices, what is shown, new products and photos are edited there. Run again only to start over:  python3 tools/store_seed.py --force"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "store-data.json")
if os.path.exists(OUT) and "--force" not in sys.argv:
    sys.exit("store-data.json already exists — it is edited from admin.html now (use --force to overwrite)")
DIMS = json.load(open(os.path.join(ROOT, "tools", "store_dims.json"))) if os.path.exists(os.path.join(ROOT, "tools", "store_dims.json")) else {}

CATS = [
    ("kitchens", "مطابخ", "Kitchens"), ("wardrobes", "دريسنج", "Wardrobes"), ("living", "ريسبشن وشاشات", "Living & TV"),
    ("tables", "ترابيزات", "Tables"), ("shelves", "مكتبات", "Bookshelves"), ("bedroom", "غرف نوم", "Bedroom"),
    ("office", "مكاتب", "Office")
]
FIN = [
    {"id": "hpl", "ar": "HPL", "en": "HPL", "pct": 0, "note_ar": "خامة شغل يومي، سهلة التنضيف", "note_en": "Everyday finish, easy to clean"},
    {"id": "acrylic", "ar": "أكريليك لامع", "en": "Gloss acrylic", "pct": 15, "note_ar": "لمعة مراية ولون ثابت", "note_en": "Mirror gloss, stable colour"},
    {"id": "veneer", "ar": "قشرة خشب طبيعي", "en": "Natural wood veneer", "pct": 30, "note_ar": "خشب حقيقي بعروقه", "note_en": "Real wood grain"},
]
def P(id, cat, ar, en, dar, den, mar, men, imgs, unit="piece", featured=False, badge="", finishes=True, lead=14):
    d = DIMS.get(id, {})
    return {"id": id, "cat": cat, "name": {"ar": ar, "en": en}, "desc": {"ar": dar, "en": den}, "materials": {"ar": mar, "en": men},
            "dims": {"w": d.get("w"), "d": d.get("d"), "h": d.get("h")}, "images": imgs, "unit": unit, "price": None, "old_price": None,
            "badge": badge, "visible": True, "featured": featured, "finishes": finishes, "lead_days": lead}
I = lambda id, n=3: [f"assets/store/{id}-{i}.webp" for i in range(n)]
PRODUCTS = [
    P("kitchen-line", "kitchens", "مطبخ مستقيم أكريليك وبلوط", "Straight kitchen, acrylic & oak", "مطبخ على حيطة واحدة بمقبض ألومنيوم بلت إن، دواليب علوي بضلفة نازلة 2 سم، وكل وحداته بتتصمم على مقاس الحيطة.", "One-wall kitchen with a built-in aluminium handle and wall units whose doors drop 2 cm; every unit is sized to your wall.", "هيكل كونتر 18 مم، ضلف أكريليك، علوي بلوط، مفصلات ومجاري سوفت كلوز", "18 mm board carcass, acrylic fronts, oak uppers, soft-close hinges and runners", ["assets/img/kitchen-line.webp"], unit="meter", featured=True, lead=21),
    P("kitchen-l", "kitchens", "مطبخ L بعمود فرن", "L-shaped kitchen with an oven tower", "مطبخ زاوية L بعمود فرن وتلاجة، الكونتر والوزرة لحد وش الضلف، ومقبض بلت إن على طول السفلي.", "L-shaped kitchen with an oven and fridge tower; counter and plinth to the door face and a built-in handle along the base run.", "هيكل كونتر 18 مم، ضلف أكريليك كريمي، علوي بلوط طبيعي، كونتر بورسلين", "18 mm carcass, cream acrylic fronts, natural oak uppers, porcelain counter", ["assets/img/hero-kitchen.webp", "assets/img/kitchen-corner.webp"], unit="meter", featured=True, badge="best", lead=21),
    P("kitchen-u", "kitchens", "مطبخ U", "U-shaped kitchen", "مطبخ على 3 حيطان بمثلث شغل مظبوط بين الحوض والبوتجاز والتلاجة، وأماكن تخزين كتير.", "Three-wall kitchen with a balanced sink–hob–fridge triangle and plenty of storage.", "هيكل كونتر 18 مم، ضلف HPL، علوي بلوط", "18 mm carcass, HPL fronts, oak uppers", ["assets/img/kitchen-u.webp"], unit="meter", lead=21),
    P("walkin-glass", "wardrobes", "دريسنج مفتوح بأدراج زجاج 240", "Open walk-in with glass drawers, 240", "شماعتين على الجنبين وعمود أدراج بوش زجاج في النص، وليد تحت كل رف.", "Two hanging sections either side of a glass-front drawer tower, with LED under every shelf.", "بلوط طبيعي، زجاج شفاف 4 مم بفريم خشب، ليد", "Natural oak, 4 mm clear glass in wood frames, LED", I("walkin-glass"), featured=True, badge="new", lead=21),
    P("mirror-wardrobe", "wardrobes", "دريسنج بضلف مراية 200", "Mirror-door wardrobe, 200", "4 ضلف مراية بفريم ألومنيوم، وجوه شماعات وأرفف وأدراج.", "Four mirror doors in aluminium frames, with rails, shelves and drawers inside.", "هيكل كونتر 18 مم، مراية فضي بفريم ألومنيوم", "18 mm carcass, silver mirror in aluminium frames", I("mirror-wardrobe"), lead=21),
    P("open-wardrobe", "wardrobes", "دريسنج مفتوح بليد 240", "Open wardrobe with LED, 240", "من غير ضلف: شماعات وأرفف وأدراج، وليد في كل فراغ.", "No doors: rails, shelves and drawers with LED in every bay.", "هيكل كونتر 18 مم، ليد", "18 mm board, LED", I("open-wardrobe"), lead=21),
    P("tv-slats", "living", "وحدة شاشة معلّقة بشرايح أوك", "Floating TV wall with oak slats", "أرضي معلّق بليد تحت، وبانوه شرايح رأسية بليد من ورا.", "A floating low unit with LED underneath and a vertical-slat panel backlit with LED.", "أوك، أنثراسيت، ليد", "Oak, anthracite, LED", I("tv-slats"), featured=True),
    P("tv-black-oak", "living", "وحدة شاشة أسود وأوك", "Black & oak TV wall", "شرايح أوك على أنثراسيت، وعمود أرفف مفتوح بليد على اليمين.", "Oak slats on anthracite with an open, lit shelf column on the right.", "أوك، أنثراسيت، ليد", "Oak, anthracite, LED", I("tv-black-oak")),
    P("tv-stepped", "living", "وحدة شاشة بلوط بصندوق راكب", "Oak TV unit with a riding box", "صندوق بلوط أرضي جواه درجين أبيض، وصندوق تاني راكب على طرفه.", "A low oak box with two white drawers and a second box riding on its end.", "بلوط، أبيض", "Oak, white", I("tv-stepped"), badge="new"),
    P("shoe-float", "living", "جزامة معلّقة بليد", "Floating shoe cabinet with LED", "ضلفتين بفتح بالضغط وليد تحت.", "Two push-to-open doors with LED underneath.", "أوك", "Oak", I("shoe-float")),
    P("glass-walnut", "tables", "ترابيزة انتريه زجاج بماسكين جوز", "Glass coffee table with walnut clamps", "صندوق بيج مرفوع عن الأرض بسطح زجاج، وماسكين جوز على الطرفين.", "A raised greige box with a glass top held by two walnut clamps.", "بيج، جوز، زجاج 8 مم", "Greige, walnut, 8 mm glass", I("glass-walnut"), featured=True, finishes=False),
    P("z-frame", "tables", "ترابيزة انتريه إطار Z وصندوق جوز", "Z-frame coffee table with a walnut box", "إطار أبيض على شكل Z بسطح عالي، وصندوق جوز مفتوح من قدام للكتب.", "A white Z frame with a raised top over an open walnut box for books.", "أبيض، جوز", "White, walnut", I("z-frame"), finishes=False),
    P("two-tubes", "tables", "ترابيزة انتريه أنبوبين وسطح بلوط", "Two-tube coffee table with an oak top", "أنبوبين أبيض مفتوحين، وسطح بلوط بيعدّي جوه واحد ويقعد على التاني.", "Two open white tubes with an oak top passing through one and resting on the other.", "أبيض، بلوط", "White, oak", I("two-tubes"), badge="new", finishes=False),
    P("waterfall", "tables", "ترابيزة انتريه حرف نازل جوز", "Walnut waterfall coffee table", "سطح جوز 3.6 سم نازل على الجنبين، ورف تحت.", "A 3.6 cm walnut top falling down both ends, with a shelf below.", "جوز", "Walnut", I("waterfall"), finishes=False),
    P("side-c", "tables", "ترابيزة جانبية C", "C side table", "قاعدة وسطح بلوط طايرين، وعمود من 3 ألواح متدرجة.", "Cantilevered oak base and top on a column of three stepped panels.", "بلوط، زيتي", "Oak, olive", I("side-c"), finishes=False),
    P("dining-oak", "tables", "سفرة لوح أوك 8 أفراد", "Oak slab dining table for 8", "سفرة 200×100 على رجلين 3.6 سم وعارضة.", "A 200×100 table on two 3.6 cm legs with a stretcher.", "أوك", "Oak", I("dining-oak"), finishes=False),
    P("rings", "shelves", "مكتبة بعمودين أسود وأحزمة بلوط", "Bookshelf with black rings and oak bands", "عمودين أسود مقفولين، و3 أحزمة بلوط بتعدّي جواهم وتطلع على الجنبين.", "Two closed black columns with three oak bands passing through and out to both sides.", "أسود مطفي، بلوط", "Matt black, oak", I("rings"), featured=True, badge="new", finishes=False),
    P("zigzag", "shelves", "مكتبة S أبيض وبلوط", "White S bookshelf with oak columns", "أرفف أبيض على شكل S، وفي كل دور عمود بلوط في الناحية العكسية.", "White shelves in an S, with an oak column on the opposite side of each level.", "أبيض، بلوط", "White, oak", I("zigzag"), finishes=False),
    P("bookcase", "shelves", "مكتبة نيشات بليد", "Lit niche bookcase", "4 نيشات مفتوحة بليد فوق ضلفتين.", "Four open lit niches above two doors.", "أبيض، أوك، ليد", "White, oak, LED", I("bookcase")),
    P("bed-slats", "bedroom", "سرير بضهر شرايح أوك", "Bed with an oak slatted headboard", "شرايح رأسية بمسافات، ورف فوق الضهر بليد.", "Spaced vertical slats with a lit shelf above the headboard.", "أوك، ليد", "Oak, LED", I("bed-slats"), featured=True, lead=21),
    P("bed-float", "bedroom", "سرير معلّق بليد", "Floating bed with LED", "صندوق تخزين بمكبس على قاعدة داخلة وليد تحت.", "A lift-up storage box on a recessed base with LED underneath.", "أوك، ليد، مكبس", "Oak, LED, gas lift", I("bed-float"), lead=21),
    P("nightstand", "bedroom", "كومودينو معلّق بليد", "Floating nightstand with LED", "درج بمقبض بلت إن ونيش مفتوح، وليد تحت.", "A drawer with a built-in handle, an open niche and LED underneath.", "أوك، ليد", "Oak, LED", I("nightstand")),
    P("chest", "bedroom", "شيفونيرة 6 أدراج", "Six-drawer chest", "6 أدراج من غير مقابض ببروفايل بلت إن.", "Six handleless drawers with a built-in profile.", "أكريليك كريمي لامع", "Cream gloss acrylic", I("chest")),
    P("office-exec", "office", "مكتب مدير بعمودين", "Executive desk on two pedestals", "مكتب 180×85 جوز غامق بعمودين وساتر.", "A 180×85 dark walnut desk on two pedestals with a modesty panel.", "جوز غامق", "Dark walnut", I("office-exec"), lead=21),
    P("desk-shelves", "office", "مكتب بأرفف حيطة وليد", "Desk with wall shelves and LED", "وحدة 3 أدراج ورفين على الحيطة بليد.", "A three-drawer unit and two lit wall shelves.", "أبيض، أوك، ليد", "White, oak, LED", I("desk-shelves")),
]
data = {
    "version": 1, "updated": None, "currency": {"ar": "ج.م", "en": "EGP"},
    "settings": {
        "deposit_pct": 50,
        "note": {"ar": "الأسعار للمقاسات المعروضة وبالخامة الأساسية. كل قطعة بتتصنع على مقاس مكانك، والسعر النهائي بيتأكد بعد المعاينة.", "en": "Prices are for the sizes shown in the base finish. Every piece is made to fit your space; the final price is confirmed after the site visit."},
        "delivery": {"ar": "التوصيل والتركيب في المنيا، وباقي المحافظات بالاتفاق.", "en": "Delivery and installation in Minya; other governorates by arrangement."},
    },
    "categories": [{"id": a, "ar": b, "en": c} for a, b, c in CATS],
    "finishes": FIN,
    "products": PRODUCTS,
}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote", OUT, len(PRODUCTS), "products")
