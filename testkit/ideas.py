import json
B=lambda **k: k
def P(key,label,desc,W,D,H,blocks,mats): return key,{"label":label,"group":"ترابيزات كتل","desc":desc,"params":{"template":"blocks","width":W,"depth":D,"height":H,"thickness":1.8,"blocks":blocks,"materials":{k:{"lib":v} for k,v in mats.items()}}}
I=[]
# 1 waterfall walnut over a white box sliding out of one end
I.append(P("blk_n_waterfall_slide","انتريه حرف نازل جوز وصندوق أبيض منزلق","سطح جوز 3.6 نازل على الطرفين (Waterfall)، الرجل الشمال لحد الأرض والرجل اليمين واقفة على صندوق أبيض مفتوح من قدام بيعدّي تحت السطح وطالع من اليمين 25 سم. 120×60×38.",120,60,38,[
 B(k="slab",name="سطح جوز",x=0,y=0,z="H-3.6",w=95,d="D",h=3.6,t=3.6,mat="accent"),
 B(k="slab",name="رجل جوز شمال",x=0,y=0,z=0,w=3.6,d="D",h="H-3.6",t=3.6,mat="accent"),
 B(k="slab",name="رجل جوز يمين (واقفة على الصندوق)",x=91.4,y=4,z=18,w=3.6,d="D-8",h="H-3.6-18",t=3.6,mat="accent"),
 B(k="box",name="صندوق أبيض",x=30,y=4,z=0,w="W-30",d="D-8",h=18,faces=["top","bottom","back","left","right"],mat="carcass"),
],{"accent":"wood_walnut_v","carcass":"hpl_white"}))
# 2 cross X side table (one full upright + two halves = cross lap without overlap)
I.append(P("blk_n_cross_side","ترابيزة جانبية X بلوحين متقاطعين","لوحين بلوط 3.6 متقاطعين على شكل + (واحد كامل واتنين نصين بيتلزقوا عليه)، قاعدة مربعة وسطح مربع أنثراسايت. 45×45×52.",45,45,52,[
 B(k="slab",name="قاعدة",x=0,y=0,z=0,w="W",d="D",h=1.8,mat="carcass"),
 B(k="slab",name="لوح طولي",x="W/2-1.8",y=4,z=1.8,w=3.6,d="D-8",h="H-3.6",t=3.6,mat="accent"),
 B(k="slab",name="نص لوح شمال",x=4,y="D/2-1.8",z=1.8,w="W/2-1.8-4",d=3.6,h="H-3.6",t=3.6,mat="accent"),
 B(k="slab",name="نص لوح يمين",x="W/2+1.8",y="D/2-1.8",z=1.8,w="W/2-1.8-4",d=3.6,h="H-3.6",t=3.6,mat="accent"),
 B(k="slab",name="سطح",x=0,y=0,z="H-1.8",w="W",d="D",h=1.8,mat="carcass"),
],{"accent":"wood_oak_light_v","carcass":"hpl_anthracite"}))
# 3 bridge: two walnut cubes + oak top bridging, overhanging
I.append(P("blk_n_bridge","انتريه كوبري على مكعبين","مكعبين جوز مفتوحين من قدام في الطرفين، وسطح بلوط 3.6 بيكوبر عليهم وبارز 8 سم من كل ناحية. 130×60×40.",130,60,40,[
 B(k="box",name="مكعب شمال",x=8,y=4,z=0,w=34,d="D-8",h="H-3.6",faces=["top","bottom","back","left","right"],shelves=0,mat="accent"),
 B(k="box",name="مكعب يمين",x="W-42",y=4,z=0,w=34,d="D-8",h="H-3.6",faces=["top","bottom","back","left","right"],mat="accent"),
 B(k="slab",name="سطح بلوط",x=0,y=0,z="H-3.6",w="W",d="D",h=3.6,t=3.6,mat="carcass"),
],{"accent":"wood_walnut","carcass":"wood_oak_light"}))
# 4 stepped slabs (each slab shifted, hidden spacers)
I.append(P("blk_n_steps","انتريه تلات ألواح متدرجة","كتلة رمادي مقفولة وفوقها 3 ألواح 3.6 مزحزحة عن بعض (جوز / رمادي فاتح / جوز) بينهم كعوب مخفية 3.6 — شكل درجات. 120×60×38.",120,60,38,[
 B(k="box",name="كتلة تحت",x=12,y=8,z=0,w=66,d="D-16",h=20,faces=["left","right","top","bottom","back","front"],mat="carcass"),
 B(k="slab",name="لوح جوز أول",x=0,y=3,z=20,w=82,d="D-6",h=3.6,t=3.6,mat="accent"),
 B(k="slab",name="كعب مخفي 1",x=40,y=14,z=23.6,w=30,d="D-28",h=3.6,t=3.6,mat="carcass"),
 B(k="slab",name="لوح رمادي",x=22,y=0,z=27.2,w=78,d="D",h=3.6,t=3.6,mat="shelf"),
 B(k="slab",name="كعب مخفي 2",x=55,y=14,z=30.8,w=30,d="D-28",h=3.6,t=3.6,mat="carcass"),
 B(k="slab",name="سطح جوز",x=40,y=3,z=34.4,w="W-40",d="D-6",h=3.6,t=3.6,mat="accent"),
],{"accent":"wood_walnut","carcass":"hpl_anthracite","shelf":"hpl_light_grey"}))
# 5 serpentine S side table: base -> right upright -> shelf -> left upright -> top
I.append(P("blk_n_serpentine","ترابيزة جانبية S متعرّجة","لوح واحد لونه بلوط ماشي على شكل S: قاعدة، يطلع يمين، رف في النص، يطلع شمال، وسطح — كل دور مفتوح من ناحية. 45×40×60.",45,40,60,[
 B(k="slab",name="قاعدة",x=0,y=0,z=0,w="W-1.8",d="D",h=1.8,mat="accent"),
 B(k="slab",name="لوح يمين",x="W-1.8",y=0,z=0,w=1.8,d="D",h="H/2+0.9",mat="accent"),
 B(k="slab",name="رف النص",x=1.8,y=0,z="H/2-0.9",w="W-3.6",d="D",h=1.8,mat="carcass"),
 B(k="slab",name="لوح شمال",x=0,y=0,z="H/2-0.9",w=1.8,d="D",h="H/2+0.9",mat="accent"),
 B(k="slab",name="سطح",x=1.8,y=0,z="H-1.8",w="W-1.8",d="D",h=1.8,mat="accent"),
],{"accent":"wood_oak_light_v","carcass":"hpl_sage"}))
# 6 slatted top japandi
I.append(P("blk_n_slats","انتريه سطح شرايح (ياباني)","سطح من 9 شرايح بلوط 3.6×6 بينها 1 سم، محمول على حرفين U أنثراسايت، ورف سفلي أنثراسايت. 110×60×38.",110,60,38,[
 *[B(k="slab",name=f"شريحة {i+1}",x=0,y=i*7,z="H-3.6",w="W",d=6,h=3.6,t=3.6,mat="accent") for i in range(9)],
 B(k="slab",name="جنب شمال",x=8,y=0,z=0,w=3.6,d="D-3",h="H-3.6",t=3.6,mat="carcass"),
 B(k="slab",name="جنب يمين",x="W-11.6",y=0,z=0,w=3.6,d="D-3",h="H-3.6",t=3.6,mat="carcass"),
 B(k="slab",name="رف سفلي",x=11.6,y=4,z=8,w="W-23.2",d="D-11",h=1.8,mat="carcass"),
],{"accent":"wood_oak_light","carcass":"hpl_anthracite"}))
# 7 floating drawer
I.append(P("blk_n_float_drawer","انتريه بدرج عايم تحت السطح","سطح جوز 3.6 على جنبين جوز، وتحت السطح في النص صندوق أبيض بدرج من غير مقبض متعلّق في السطح وعايم فوق الأرض. 120×60×40.",120,60,40,[
 B(k="slab",name="سطح جوز",x=0,y=0,z="H-3.6",w="W",d="D",h=3.6,t=3.6,mat="accent"),
 B(k="slab",name="جنب شمال",x=0,y=0,z=0,w=3.6,d="D",h="H-3.6",t=3.6,mat="accent"),
 B(k="slab",name="جنب يمين",x="W-3.6",y=0,z=0,w=3.6,d="D",h="H-3.6",t=3.6,mat="accent"),
 B(k="drawer",name="درج عايم",x=30,y=4,z="H-3.6-16",w=60,d="D-8",h=16,faces=["left","right","bottom","back","top"],mat="carcass",front_mat="front",handle="none",front_cover="inset"),
],{"accent":"wood_walnut_v","carcass":"hpl_white","front":"hpl_white"}))
# 8 tetris two Ls
I.append(P("blk_n_tetris","ترابيزة جانبية تتريس","صندوقين L متداخلين: صندوق أبيض مفتوح من قدام تحت، وصندوق زيتي مفتوح من الجنب فوقه مزحزح — شكل قطع تتريس. 50×40×55.",50,40,55,[
 B(k="box",name="صندوق أبيض",x=0,y=0,z=0,w=36,d="D",h=30,faces=["top","bottom","back","left","right"],mat="carcass"),
 B(k="slab",name="لوح أبيض واقف",x="W-1.8",y=0,z=0,w=1.8,d="D",h=30,mat="carcass"),
 B(k="box",name="صندوق زيتي",x=14,y=0,z=30,w="W-14",d="D",h="H-30",faces=["top","bottom","back","right"],mat="accent"),
],{"carcass":"hpl_white","accent":"hpl_olive"}))
# 9 plinth square
I.append(P("blk_n_plinth_square","انتريه مربع على قاعدة داخلة","سطح بلوط مربع 3.6 بارز 15 سم من كل ناحية على قاعدة مقفولة أنثراسايت، وفيها فتحة رف من قدام. 90×90×36.",90,90,36,[
 B(k="box",name="القاعدة",x=15,y=15,z=0,w="W-30",d="D-30",h="H-3.6",faces=["left","right","top","bottom","back"],shelves=0,mat="carcass"),
 B(k="slab",name="وش القاعدة (نص)",x=16.8,y=15,z=1.8,w="W-33.6",d=1.8,h=12,mat="carcass"),
 B(k="slab",name="سطح بلوط",x=0,y=0,z="H-3.6",w="W",d="D",h=3.6,t=3.6,mat="accent"),
],{"carcass":"hpl_anthracite","accent":"wood_oak_natural"}))
# 10 walnut ring with a white box and a glass shelf inside
I.append(P("blk_n_ring","انتريه حلقة جوز بصندوق أبيض ورف زجاج","حلقة جوز مفتوحة من قدام وورا (سطح + قاعدة + جنبين)، جواها في اليمين صندوق أبيض مفتوح من قدام، وفي الشمال رف زجاج في النص. 120×55×38.",120,55,38,[
 B(k="box",name="حلقة جوز",x=0,y=0,z=0,w="W",d="D",h="H",faces=["top","bottom","left","right"],mat="accent"),
 B(k="box",name="صندوق أبيض",x="W-1.8-42",y=0,z=1.8,w=42,d="D",h="H-3.6",faces=["top","bottom","back","left"],mat="carcass"),
 B(k="glass",name="رف زجاج",x=1.8,y=2,z="H/2-0.4",w="W-3.6-42",d="D-4",h=0.8,t=0.8),
],{"accent":"wood_walnut","carcass":"hpl_white","glass":"glass_clear"}))
open("ideas.json","w").write(json.dumps(dict(I),ensure_ascii=False))
print(len(I))
