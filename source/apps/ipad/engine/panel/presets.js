import { deepDup } from "../core/ruby.js";
export const LIST = {
    "vanity_float_led": {
        "label": "حوض معلّق أدراج + ليد",
        "group": "الحمام",
        "desc": "درجين بجولا، ليد تحت، أكريليك كريمي.",
        "params": {
            "template": "vanity",
            "width": 90,
            "handle": "gola",
            "led_under": true,
            "fronts": [
                {
                    "type": "drawers",
                    "count": 2
                }
            ],
            "materials": {
                "front": {
                    "lib": "acrylic_cream"
                },
                "accent": {
                    "lib": "hpl_greige"
                }
            }
        }
    },
    "vanity_double": {
        "label": "حوض دبل 120",
        "group": "الحمام",
        "desc": "ضلفتين عريضتين Push، أنثراسيت مطفي.",
        "params": {
            "template": "vanity",
            "width": 120,
            "height": 55,
            "handle": "push",
            "fronts": [
                {
                    "type": "doors",
                    "count": 2,
                    "shelves": 0
                }
            ],
            "materials": {
                "front": {
                    "lib": "hpl_anthracite"
                },
                "accent": {
                    "lib": "hpl_greige"
                }
            }
        }
    },
    "vanity_niche": {
        "label": "حوض بنيش مفتوح بليد",
        "group": "الحمام",
        "desc": "نيش فوطة تحت بليد + ضلفتين.",
        "params": {
            "template": "vanity",
            "width": 80,
            "height": 60,
            "handle": "push",
            "fronts": [
                {
                    "type": "open",
                    "height": 18,
                    "shelves": 0,
                    "led": true
                },
                {
                    "type": "doors",
                    "count": 2,
                    "shelves": 0
                }
            ],
            "materials": {
                "front": {
                    "lib": "acrylic_cream"
                },
                "accent": {
                    "lib": "hpl_greige"
                }
            }
        }
    },
    "mirror_led": {
        "label": "دولاب مراية بليد تحت",
        "group": "الحمام",
        "desc": "3 ضلف مراية Push وليد تحت على الحوض.",
        "params": {
            "template": "mirror_cabinet",
            "width": 90,
            "led_under": true,
            "fronts": [
                {
                    "type": "doors",
                    "count": 2,
                    "shelves": 2
                }
            ],
            "materials": {
                "front": {
                    "lib": "acrylic_white"
                }
            }
        }
    },
    "bath_tall_float": {
        "label": "عمود حمام معلّق بنيش",
        "group": "الحمام",
        "desc": "معلّق 140 سم، ضلفة + نيش بليد تحت.",
        "params": {
            "template": "bath_tall",
            "height": 140,
            "mount": "wall",
            "handle": "push",
            "led_under": true,
            "fronts": [
                {
                    "type": "open",
                    "height": 30,
                    "shelves": 0,
                    "led": true
                },
                {
                    "type": "doors",
                    "count": 1,
                    "shelves": 3
                }
            ],
            "materials": {
                "front": {
                    "lib": "acrylic_cream"
                },
                "accent": {
                    "lib": "hpl_greige"
                }
            }
        }
    },
    "washer_tower_pro": {
        "label": "وحدة غسالة بضلف جولا",
        "group": "الحمام",
        "desc": "غسالة تحت، دولاب فوق بضلفتين جولا.",
        "params": {
            "template": "washer_tower",
            "handle": "gola",
            "materials": {
                "front": {
                    "lib": "acrylic_white"
                }
            }
        }
    },
    "bed_floating_led": {
        "label": "سرير معلّق بليد",
        "group": "غرف النوم",
        "desc": "صندوق بمكبس فوق قاعدة داخلة وليد تحت، ضهر أوك سادة.",
        "params": {
            "template": "bed",
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "wood_oak_light_v"
                },
                "accent": {
                    "lib": "wood_oak_light_v"
                },
                "shelf": {
                    "lib": "hpl_white"
                }
            },
            "bed": {
                "mattress_width": 160,
                "floating": true,
                "led": true,
                "headboard_height": 110
            }
        }
    },
    "bed_slats": {
        "label": "سرير بضهر شرايح أوك",
        "group": "غرف النوم",
        "desc": "شرايح رأسية 6 سم بمسافات، رف فوق الضهر بليد.",
        "params": {
            "template": "bed",
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "wood_oak_light_v"
                },
                "accent": {
                    "lib": "wood_oak_light_v"
                },
                "shelf": {
                    "lib": "hpl_white"
                }
            },
            "bed": {
                "mattress_width": 160,
                "headboard_style": "slats",
                "headboard_height": 125,
                "headboard_extra": 10,
                "headboard_shelf": true,
                "led": true
            }
        }
    },
    "bed_hotel_wings": {
        "label": "سرير فندقي بأجنحة وكومودينو معلّق",
        "group": "غرف النوم",
        "desc": "ضهر عريض بانوهات جوز، كومودينو معلّق في الجناحين، ليد.",
        "params": {
            "template": "bed",
            "materials": {
                "carcass": {
                    "lib": "hpl_offwhite"
                },
                "front": {
                    "lib": "hpl_beige"
                },
                "accent": {
                    "lib": "wood_walnut_v"
                },
                "shelf": {
                    "lib": "hpl_offwhite"
                }
            },
            "bed": {
                "mattress_width": 180,
                "headboard_style": "panels",
                "panel_rows": 3,
                "headboard_height": 120,
                "headboard_extra": 60,
                "side_tables": true,
                "led": true,
                "upholstered": true
            }
        }
    },
    "bed_upholstered_shelf": {
        "label": "سرير بضهر منجّد ورف",
        "group": "غرف النوم",
        "desc": "بانوهات أفقية منجّدة جريج ورف أوك فوقها.",
        "params": {
            "template": "bed",
            "materials": {
                "carcass": {
                    "lib": "hpl_offwhite"
                },
                "front": {
                    "lib": "hpl_greige"
                },
                "accent": {
                    "lib": "hpl_greige"
                }
            },
            "bed": {
                "mattress_width": 160,
                "headboard_style": "panels",
                "panel_rows": 4,
                "headboard_height": 115,
                "upholstered": true,
                "headboard_shelf": true
            }
        }
    },
    "nightstand_float": {
        "label": "كومودينو معلّق بليد",
        "group": "غرف النوم",
        "desc": "درج جولا ونيش مفتوح، ليد تحت.",
        "params": {
            "template": "nightstand",
            "width": 50,
            "height": 35,
            "mount": "wall",
            "handle": "gola",
            "led_under": true,
            "fronts": [
                {
                    "type": "drawers",
                    "count": 1
                },
                {
                    "type": "open",
                    "height": 12,
                    "shelves": 0,
                    "led": true
                }
            ],
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "wood_oak_light_v"
                },
                "accent": {
                    "lib": "wood_oak_light_v"
                },
                "shelf": {
                    "lib": "hpl_white"
                }
            }
        }
    },
    "nightstand_legs": {
        "label": "كومودينو برجول معدن",
        "group": "غرف النوم",
        "desc": "درجين جوز على رجول 15 سم.",
        "params": {
            "template": "nightstand",
            "width": 50,
            "height": 60,
            "plinth": {
                "height": 15,
                "style": "legs"
            },
            "fronts": [
                {
                    "type": "drawers",
                    "count": 2
                }
            ],
            "materials": {
                "carcass": {
                    "lib": "wood_walnut_v"
                },
                "front": {
                    "lib": "wood_walnut_v"
                },
                "drawer_box": {
                    "lib": "hpl_white"
                }
            }
        }
    },
    "chest_gola": {
        "label": "شيفونيرة 6 أدراج جولا",
        "group": "غرف النوم",
        "desc": "من غير مقابض، أكريليك كريمي لامع.",
        "params": {
            "template": "chest",
            "width": 80,
            "height": 130,
            "handle": "gola",
            "fronts": [
                {
                    "type": "drawers",
                    "count": 6
                }
            ],
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "acrylic_cream"
                },
                "accent": {
                    "lib": "wood_oak_light_v"
                }
            }
        }
    },
    "chest_low_wide": {
        "label": "كونسول واطي عريض",
        "group": "غرف النوم",
        "desc": "3 أدراج عريضة برجول معدن، جريج + أوك.",
        "params": {
            "template": "chest",
            "width": 120,
            "height": 75,
            "depth": 45,
            "plinth": {
                "height": 15,
                "style": "legs"
            },
            "fronts": [
                {
                    "type": "drawers",
                    "count": 3
                }
            ],
            "materials": {
                "carcass": {
                    "lib": "hpl_offwhite"
                },
                "front": {
                    "lib": "hpl_greige"
                },
                "accent": {
                    "lib": "wood_oak_natural_v"
                }
            }
        }
    },
    "dresser_float_backlit": {
        "label": "تسريحة معلّقة بمراية Backlit",
        "group": "غرف النوم",
        "desc": "درج معلّق بليد تحت ومراية بإضاءة من ورا.",
        "params": {
            "template": "dresser",
            "width": 100,
            "depth": 40,
            "mount": "wall",
            "handle": "gola",
            "led_under": true,
            "fronts": [
                {
                    "type": "drawers",
                    "count": 1
                }
            ],
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "wood_oak_light_v"
                },
                "accent": {
                    "lib": "wood_oak_light_v"
                },
                "shelf": {
                    "lib": "hpl_white"
                }
            },
            "dresser": {
                "base_height": 20,
                "float_height": 70,
                "mirror_width": 80,
                "mirror_height": 100,
                "mirror_gap": 15,
                "mirror_led": true
            }
        }
    },
    "dresser_classic": {
        "label": "تسريحة 3 أدراج",
        "group": "غرف النوم",
        "desc": "أدراج جوز ومراية على لوح بيج.",
        "params": {
            "template": "dresser",
            "width": 110,
            "materials": {
                "carcass": {
                    "lib": "hpl_offwhite"
                },
                "front": {
                    "lib": "wood_walnut_v"
                },
                "accent": {
                    "lib": "wood_walnut_v"
                },
                "shelf": {
                    "lib": "hpl_offwhite"
                }
            },
            "fronts": [
                {
                    "type": "drawers",
                    "count": 3
                }
            ]
        }
    },
    "desk_shelves": {
        "label": "مكتب بأرفف حيطة وليد",
        "group": "غرف النوم",
        "desc": "وحدة 3 أدراج + رفين حيطة وليد تحت.",
        "params": {
            "template": "desk",
            "width": 140,
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "wood_oak_light_v"
                },
                "accent": {
                    "lib": "wood_oak_light_v"
                },
                "shelf": {
                    "lib": "hpl_white"
                }
            },
            "handle": "gola",
            "desk": {
                "pedestal": "right",
                "wall_shelves": 2,
                "led": true
            }
        }
    },
    "desk_kids": {
        "label": "مكتب أطفال",
        "group": "غرف النوم",
        "desc": "100 سم، أدراج شمال، أخضر سيج + زان.",
        "params": {
            "template": "desk",
            "width": 100,
            "depth": 55,
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "hpl_sage"
                },
                "accent": {
                    "lib": "wood_beech_zan_v"
                }
            },
            "desk": {
                "pedestal": "left",
                "pedestal_drawers": 3,
                "height": 70,
                "wall_shelves": 1
            }
        }
    },
    "tv_float_slats": {
        "label": "شاشة معلّقة بشرايح أوك",
        "group": "الريسبشن",
        "desc": "أرضي معلّق بليد، شرايح رأسية، ليد ورا البانوه.",
        "params": {
            "template": "tv_unit",
            "width": 240,
            "height": 200,
            "handle": "gola",
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "wood_oak_light_v"
                },
                "accent": {
                    "lib": "wood_oak_light_v"
                },
                "shelf": {
                    "lib": "hpl_white"
                }
            },
            "tv": {
                "columns": "none",
                "base_float": 25,
                "base_fronts": "drawers",
                "panel_style": "slats",
                "panel_height": 150,
                "led": true
            }
        }
    },
    "tv_full_wall": {
        "label": "حيطة شاشة كاملة بأعمدة",
        "group": "الريسبشن",
        "desc": "عمودين بضلف، أرضي أدراج، بانوه جوز بليد.",
        "params": {
            "template": "tv_unit",
            "width": 300,
            "height": 240,
            "materials": {
                "carcass": {
                    "lib": "hpl_offwhite"
                },
                "front": {
                    "lib": "hpl_beige"
                },
                "accent": {
                    "lib": "wood_walnut_v"
                },
                "shelf": {
                    "lib": "hpl_offwhite"
                }
            },
            "handle": "push",
            "tv": {
                "columns": "both",
                "column_width": 45,
                "base_fronts": "drawers",
                "base_float": 20,
                "panel_height": 160,
                "led": true
            }
        }
    },
    "tv_floating_shelves": {
        "label": "شاشة بأرفف عائمة",
        "group": "الريسبشن",
        "desc": "بانوه سادة + 3 أرفف عائمة سميكة بليد على اليمين.",
        "params": {
            "template": "tv_unit",
            "width": 260,
            "height": 200,
            "materials": {
                "carcass": {
                    "lib": "hpl_offwhite"
                },
                "front": {
                    "lib": "hpl_greige"
                },
                "accent": {
                    "lib": "wood_oak_natural_v"
                }
            },
            "handle": "gola",
            "tv": {
                "columns": "none",
                "base_float": 20,
                "base_fronts": "flap",
                "panel_height": 150,
                "panel_shelves": 3,
                "shelf_width": 55,
                "shelf_thickness": 3.6,
                "shelves_side": "right",
                "led": true
            }
        }
    },
    "tv_black_oak": {
        "label": "شاشة أسود وأوك",
        "group": "الريسبشن",
        "desc": "عمود أرفف مفتوح بليد يمين، شرايح أوك على أنثراسيت.",
        "params": {
            "template": "tv_unit",
            "width": 260,
            "height": 220,
            "materials": {
                "carcass": {
                    "lib": "hpl_black"
                },
                "front": {
                    "lib": "hpl_anthracite"
                },
                "accent": {
                    "lib": "wood_oak_natural_v"
                }
            },
            "handle": "push",
            "tv": {
                "columns": "right",
                "column_width": 40,
                "column_doors": false,
                "column_shelves": 4,
                "base_fronts": "doors",
                "base_float": 0,
                "panel_style": "slats",
                "slat_width": 5,
                "slat_gap": 1.5,
                "panel_height": 170,
                "led": true
            }
        }
    },
    "shoe_float_led": {
        "label": "جزامة معلّقة بليد",
        "group": "الريسبشن",
        "desc": "ضلفتين Push وليد تحت، أوك.",
        "params": {
            "template": "shoe_cabinet",
            "width": 90,
            "height": 80,
            "mount": "wall",
            "handle": "push",
            "led_under": true,
            "fronts": [
                {
                    "type": "doors",
                    "count": 2,
                    "shelves": 2
                }
            ],
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "wood_oak_light_v"
                },
                "accent": {
                    "lib": "wood_oak_light_v"
                },
                "shelf": {
                    "lib": "hpl_white"
                }
            }
        }
    },
    "shoe_legs_niche": {
        "label": "جزامة برجول ونيش",
        "group": "الريسبشن",
        "desc": "نيش مفاتيح فوق بليد + ضلفتين، رجول معدن.",
        "params": {
            "template": "shoe_cabinet",
            "width": 90,
            "height": 110,
            "plinth": {
                "height": 15,
                "style": "legs"
            },
            "fronts": [
                {
                    "type": "doors",
                    "count": 2,
                    "shelves": 3
                },
                {
                    "type": "open",
                    "height": 20,
                    "shelves": 0,
                    "led": true
                }
            ],
            "materials": {
                "carcass": {
                    "lib": "hpl_offwhite"
                },
                "front": {
                    "lib": "hpl_greige"
                },
                "accent": {
                    "lib": "wood_oak_natural_v"
                }
            }
        }
    },
    "bookcase_niches": {
        "label": "مكتبة نيشات بليد",
        "group": "الريسبشن",
        "desc": "4 نيشات مفتوحة بليد فوق ضلفتين تحت.",
        "params": {
            "template": "open_shelf",
            "width": 90,
            "height": 220,
            "depth": 35,
            "handle": "push",
            "fronts": [
                {
                    "type": "doors",
                    "count": 2,
                    "height": 70,
                    "shelves": 1
                },
                {
                    "type": "open",
                    "shelves": 0,
                    "led": true
                },
                {
                    "type": "open",
                    "shelves": 0,
                    "led": true
                },
                {
                    "type": "open",
                    "shelves": 0,
                    "led": true
                }
            ],
            "materials": {
                "carcass": {
                    "lib": "hpl_white"
                },
                "front": {
                    "lib": "wood_oak_light_v"
                },
                "accent": {
                    "lib": "wood_oak_light_v"
                },
                "shelf": {
                    "lib": "hpl_white"
                }
            }
        }
    },
                "blk_side_c_interlock": {
            "label": "ترابيزة جانبية C بثلاث ألواح متدرجة",
            "group": "ترابيزات كتل",
            "desc": "قاعدة وسطح بلوط 2.5 سم طايرين ناحية الشمال (شكل C)، والعمود في اليمين من 3 ألواح واقفة متدرجة في العمق: بلوط 3.6 قدام، زيتي في النص راجع لورا، وبلوط ورا. 45×38×58.",
            "params": {
                "template": "blocks",
                "width": 45,
                "depth": 38,
                "height": 58,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "slab",
                        "name": "قاعدة بلوط",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W",
                        "d": "D",
                        "h": 2.4,
                        "t": 2.4,
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "لوح واقف بلوط قدام",
                        "x": "W-6-3.6",
                        "y": 0,
                        "z": 2.4,
                        "w": 3.6,
                        "d": "D-10",
                        "h": "H-4.8",
                        "t": 3.6,
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "لوح واقف زيتي",
                        "x": "W-6-3.6-T",
                        "y": 6,
                        "z": 2.4,
                        "w": "T",
                        "d": "D-6",
                        "h": "H-4.8",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "لوح واقف بلوط ورا",
                        "x": "W-6-3.6-2*T",
                        "y": 12,
                        "z": 2.4,
                        "w": "T",
                        "d": "D-12",
                        "h": "H-4.8",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "سطح بلوط",
                        "x": 0,
                        "y": 0,
                        "z": "H-2.4",
                        "w": "W",
                        "d": "D",
                        "h": 2.4,
                        "t": 2.4,
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "accent": {
                        "lib": "wood_oak_light_v"
                    },
                    "carcass": {
                        "lib": "hpl_olive"
                    }
                }
            }
        },
            "blk_coffee_glass_walnut": {
            "label": "انتريه زجاج بماسكين جوز",
            "group": "ترابيزات كتل",
            "desc": "صندوق بيج 30 سم مرفوع 11 سم عن الأرض، مقفول من الطرفين ومن ورا ومفتوح من قدام. ماسك جوز شمال: شريط 3.6 فوق الرأس بالعمق كله + لوح 22 سم واقف قدام الفتحة لحد الأرض. ماسك جوز يمين: لوح 26 سم على جنب الصندوق اليمين نازل للأرض (أوطى من الرأس 7.5) + رجلين جوز تحت الصندوق. زجاج 10 مم على الرأس من الناحيتين. 123.6×63.6×44.6.",
            "params": {
                "template": "blocks",
                "width": 123.6,
                "depth": 60,
                "height": 44.6,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "الصندوق",
                        "x": 0,
                        "y": 0,
                        "z": 11,
                        "w": "W-3.6",
                        "d": "D",
                        "h": 30,
                        "faces": [
                            "top",
                            "bottom",
                            "back",
                            "left",
                            "right"
                        ],
                        "mat": "carcass"
                    },
                    {
                        "k": "glass",
                        "name": "زجاج شمال",
                        "x": 0,
                        "y": 0,
                        "z": 41,
                        "w": 15,
                        "d": "D",
                        "h": 1,
                        "t": 1
                    },
                    {
                        "k": "glass",
                        "name": "زجاج يمين",
                        "x": 37,
                        "y": 0,
                        "z": 41,
                        "w": "W-3.6-37",
                        "d": "D",
                        "h": 1,
                        "t": 1
                    },
                    {
                        "k": "slab",
                        "name": "ماسك شمال — شريط فوق الرأس",
                        "x": 15,
                        "y": 0,
                        "z": 41,
                        "w": 22,
                        "d": "D",
                        "h": 3.6,
                        "t": 3.6,
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "ماسك شمال — لوح قدام لحد الأرض",
                        "x": 15,
                        "y": -3.6,
                        "z": 0,
                        "w": 22,
                        "d": 3.6,
                        "h": 44.6,
                        "t": 3.6,
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "ماسك يمين — لوح على الجنب",
                        "x": "W-3.6",
                        "y": 20,
                        "z": 0,
                        "w": 3.6,
                        "d": 26,
                        "h": 33.5,
                        "t": 3.6,
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "ماسك يمين — رجل تحت الصندوق قدام",
                        "x": "W-3.6-15",
                        "y": 20,
                        "z": 0,
                        "w": 15,
                        "d": 3.6,
                        "h": 11,
                        "t": 3.6,
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "ماسك يمين — رجل تحت الصندوق ورا",
                        "x": "W-3.6-15",
                        "y": 42.4,
                        "z": 0,
                        "w": 15,
                        "d": 3.6,
                        "h": 11,
                        "t": 3.6,
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_greige"
                    },
                    "accent": {
                        "lib": "wood_walnut_v"
                    }
                }
            }
        },

            "blk_coffee_z_frame": {
            "label": "انتريه صندوق جوز على قاعدة بيضا بسطح عالي",
            "group": "ترابيزات كتل",
            "desc": "إطار أبيض (قاعدة + لوح واقف يمين + سطح عالي) عمقه 50 وبارز 10 سم قدام صندوق الجوز. صندوق جوز 86×40×21 مقفول من الطرفين ومن ورا ومفتوح من قدام، مرفوع 9 سم على رجلين بيض. فوق الصندوق لوح أبيض واقف شايل السطح العالي (41 سم)، وبين الصندوق واللوح اليمين فتحة كتب 13 سم. 101×50×48.",
            "params": {
                "template": "blocks",
                "width": 101,
                "depth": 50,
                "height": 48,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "slab",
                        "name": "قاعدة بيضا",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W-T",
                        "d": "D",
                        "h": "T",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "لوح واقف يمين",
                        "x": "W-T",
                        "y": 0,
                        "z": 0,
                        "w": "T",
                        "d": "D",
                        "h": "H-T",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رجل بيضا تحت الصندوق شمال",
                        "x": 7,
                        "y": 12,
                        "z": "T",
                        "w": "T",
                        "d": "D-14",
                        "h": 9,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رجل بيضا تحت الصندوق يمين",
                        "x": 64,
                        "y": 12,
                        "z": "T",
                        "w": "T",
                        "d": "D-14",
                        "h": 9,
                        "mat": "carcass"
                    },
                    {
                        "k": "box",
                        "name": "صندوق جوز",
                        "x": 0,
                        "y": 10,
                        "z": "T+9",
                        "w": 86,
                        "d": "D-10",
                        "h": 21,
                        "faces": [
                            "top",
                            "bottom",
                            "back",
                            "left",
                            "right"
                        ],
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "لوح أبيض فوق الصندوق",
                        "x": 64,
                        "y": 10,
                        "z": "T+30",
                        "w": "T",
                        "d": "D-10",
                        "h": "H-T-(T+30)",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "سطح أبيض",
                        "x": 60,
                        "y": 0,
                        "z": "H-T",
                        "w": "W-60",
                        "d": "D",
                        "h": "T",
                        "mat": "carcass"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_white"
                    },
                    "accent": {
                        "lib": "wood_walnut"
                    }
                }
            }
        },

    "blk_coffee_nested": {
            "label": "انتريه صندوق بلوط وجواه صندوق أبيض طالع من الجنب",
            "group": "ترابيزات كتل",
            "desc": "صندوق بلوط مفتوح من قدام ومن اليمين (رأس + قاعدة + ظهر + جنب شمال)، وجواه صندوق أبيض بدرج قاعد على قاعدته وطالع من الطرف اليمين 20 سم. 120×60×40.",
            "params": {
                "template": "blocks",
                "width": 120,
                "depth": 60,
                "height": 40,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "صندوق بلوط",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W-20",
                        "d": "D",
                        "h": "H",
                        "faces": [
                            "top",
                            "bottom",
                            "back",
                            "left"
                        ],
                        "mat": "accent"
                    },
                    {
                        "k": "drawer",
                        "name": "صندوق أبيض",
                        "x": "W-20-50",
                        "y": 4,
                        "z": "T",
                        "w": 70,
                        "d": "D-8",
                        "h": "H-2*T-4",
                        "mat": "carcass",
                        "front_cover": "inset",
                        "handle": "none",
                        "front_mat": "front"
                    }
                ],
                "materials": {
                    "accent": {
                        "lib": "wood_oak_light"
                    },
                    "carcass": {
                        "lib": "hpl_white"
                    },
                    "front": {
                        "lib": "hpl_white"
                    }
                }
            }
        },
        "blk_night_drawer_frame": {
            "label": "كومودينو أبيض بدرج وفتحة بضهر جوز",
            "group": "ترابيزات كتل",
            "desc": "جسم أبيض: درج 18 سم تحت من غير مقبض، وفوقه فتحة مفتوحة ضهرها لوح جوز، وسطح جوز 1.8 سم على المستوى. 50×40×45.",
            "params": {
                "template": "blocks",
                "width": 50,
                "depth": 40,
                "height": 45,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "drawer",
                        "name": "الجسم",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W",
                        "d": "D",
                        "h": "H-T",
                        "faces": [
                            "left",
                            "right",
                            "bottom",
                            "back"
                        ],
                        "drawer_h": 18,
                        "mat": "carcass",
                        "front_mat": "front",
                        "handle": "none"
                    },
                    {
                        "k": "slab",
                        "name": "ضهر جوز للفتحة",
                        "x": "T",
                        "y": "D-T-T",
                        "z": "T+18+T",
                        "w": "W-2*T",
                        "d": "T",
                        "h": "H-T-(T+18+T)",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "سطح جوز",
                        "x": 0,
                        "y": 0,
                        "z": "H-T",
                        "w": "W",
                        "d": "D",
                        "h": "T",
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_white"
                    },
                    "front": {
                        "lib": "hpl_white"
                    },
                    "accent": {
                        "lib": "wood_walnut"
                    }
                }
            }
        },
        "blk_coffee_float_dark": {
            "label": "انتريه صندوق أنثراسايت وسطح جوز بلوح جوز واقف",
            "group": "ترابيزات كتل",
            "desc": "صندوق أنثراسايت مفتوح من قدام واليمين برف، فوقه سطح جوز 3.6 سم مزحزح لليمين وراكب على لوح جوز 3.6 واقف في الطرف اليمين (فتحة كتب بينه وبين الصندوق). 120×60×40.",
            "params": {
                "template": "blocks",
                "width": 120,
                "depth": 60,
                "height": 40,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "الصندوق",
                        "x": 0,
                        "y": 4,
                        "z": 0,
                        "w": "W-30",
                        "d": "D-4",
                        "h": "H-3.6",
                        "faces": [
                            "top",
                            "bottom",
                            "back",
                            "left"
                        ],
                        "shelves": 1,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "لوح جوز واقف",
                        "x": "W-3.6",
                        "y": 6,
                        "z": 0,
                        "w": 3.6,
                        "d": "D-12",
                        "h": "H-3.6",
                        "t": 3.6,
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "سطح جوز",
                        "x": 28,
                        "y": 0,
                        "z": "H-3.6",
                        "w": "W-28",
                        "d": "D-2",
                        "h": 3.6,
                        "t": 3.6,
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_anthracite"
                    },
                    "accent": {
                        "lib": "wood_walnut"
                    }
                }
            }
        },
        "blk_coffee_plinth_slab": {
            "label": "انتريه سطح جوز على كتلة مقفولة بطبقة وسطى",
            "group": "ترابيزات كتل",
            "desc": "كتلة بيج مقفولة من كل الجهات، فوقها لوح بيج 3.6 سم مزحزح لقدام، وفوقه سطح جوز 3.6 سم مزحزح لليمين — ثلاث طبقات متدرجة. 130×65×30.",
            "params": {
                "template": "blocks",
                "width": 130,
                "depth": 65,
                "height": 30,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "الكتلة",
                        "x": 10,
                        "y": 10,
                        "z": 0,
                        "w": "W-30",
                        "d": "D-14",
                        "h": "H-7.2",
                        "faces": [
                            "left",
                            "right",
                            "top",
                            "bottom",
                            "back",
                            "front"
                        ],
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "الطبقة الوسطى",
                        "x": 4,
                        "y": 0,
                        "z": "H-7.2",
                        "w": "W-24",
                        "d": "D-10",
                        "h": 3.6,
                        "t": 3.6,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "سطح جوز",
                        "x": 24,
                        "y": 3,
                        "z": "H-3.6",
                        "w": "W-24",
                        "d": "D-6",
                        "h": 3.6,
                        "t": 3.6,
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_greige"
                    },
                    "accent": {
                        "lib": "wood_walnut"
                    }
                }
            }
        },
        "blk_tv_stepped": {
            "label": "وحدة شاشة بلوط بأدراج بيضا وصندوق راكب",
            "group": "ترابيزات كتل",
            "desc": "صندوق بلوط أرضي مفتوح من قدام ومن اليمين وجواه درجين أبيض، وصندوق بلوط تاني راكب على طرفه اليمين (مفتوح من قدام والشمال) ومحمول على لوح واقف في الطرف. 200×40×52.",
            "params": {
                "template": "blocks",
                "width": 200,
                "depth": 40,
                "height": 52,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "صندوق بلوط أرضي",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": 130,
                        "d": "D",
                        "h": 30,
                        "faces": [
                            "top",
                            "bottom",
                            "back",
                            "left"
                        ],
                        "mat": "accent"
                    },
                    {
                        "k": "drawer",
                        "name": "درج أبيض 1",
                        "x": 40,
                        "y": 3,
                        "z": "T",
                        "w": 44,
                        "d": "D-6",
                        "h": "30-2*T",
                        "mat": "carcass",
                        "front_mat": "front",
                        "handle": "none",
                        "front_cover": "inset"
                    },
                    {
                        "k": "drawer",
                        "name": "درج أبيض 2",
                        "x": 85,
                        "y": 3,
                        "z": "T",
                        "w": 44,
                        "d": "D-6",
                        "h": "30-2*T",
                        "mat": "carcass",
                        "front_mat": "front",
                        "handle": "none",
                        "front_cover": "inset"
                    },
                    {
                        "k": "slab",
                        "name": "لوح واقف أبيض",
                        "x": "W-T",
                        "y": 2,
                        "z": 0,
                        "w": "T",
                        "d": "D-4",
                        "h": 30,
                        "mat": "carcass"
                    },
                    {
                        "k": "box",
                        "name": "صندوق بلوط راكب",
                        "x": 118,
                        "y": 2,
                        "z": 30,
                        "w": "W-118",
                        "d": "D-4",
                        "h": "H-30",
                        "faces": [
                            "top",
                            "bottom",
                            "back",
                            "right"
                        ],
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "accent": {
                        "lib": "wood_oak_light"
                    },
                    "carcass": {
                        "lib": "hpl_white"
                    },
                    "front": {
                        "lib": "hpl_white"
                    }
                }
            }
        },
        "blk_tv_long_nested": {
            "label": "وحدة شاشة ممتدة صندوق جوه صندوق",
            "group": "ترابيزات كتل",
            "desc": "صندوق بلوط 200 سم مفتوح من قدام بقاطوع في النص، وجوه النص اليمين صندوق أبيض بدرج قاعد على قاعدته. 200×40×40.",
            "params": {
                "template": "blocks",
                "width": 200,
                "depth": 40,
                "height": 40,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "صندوق بلوط",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W",
                        "d": "D",
                        "h": "H",
                        "faces": [
                            "top",
                            "bottom",
                            "back",
                            "left",
                            "right"
                        ],
                        "dividers": 1,
                        "mat": "accent"
                    },
                    {
                        "k": "drawer",
                        "name": "صندوق أبيض",
                        "x": "W/2+T/2+2",
                        "y": 3,
                        "z": "T",
                        "w": "W/2-1.5*T-4",
                        "d": "D-6",
                        "h": "H-2*T-4",
                        "mat": "carcass",
                        "front_mat": "front",
                        "handle": "none",
                        "front_cover": "inset"
                    }
                ],
                "materials": {
                    "accent": {
                        "lib": "wood_oak_light"
                    },
                    "carcass": {
                        "lib": "hpl_white"
                    },
                    "front": {
                        "lib": "hpl_white"
                    }
                }
            }
        },
        "blk_side_cube": {
            "label": "ترابيزة جانبية مكعب مفتوح",
            "group": "ترابيزات كتل",
            "desc": "مكعب بلوط مفتوح من قدام واليمين برف أبيض في النص. 45×45×50.",
            "params": {
                "template": "blocks",
                "width": 45,
                "depth": 45,
                "height": 50,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "المكعب",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W",
                        "d": "D",
                        "h": "H",
                        "faces": [
                            "top",
                            "bottom",
                            "back",
                            "left"
                        ],
                        "joint": "sides",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رف أبيض",
                        "x": "T",
                        "y": 4,
                        "z": "H/2",
                        "w": "W-T-6",
                        "d": "D-4-T",
                        "h": "T",
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "wood_oak_light"
                    },
                    "accent": {
                        "lib": "hpl_white"
                    }
                }
            }
        },
        "blk_night_float_open": {
            "label": "كومودينو معلّق بدرج وفتحة",
            "group": "ترابيزات كتل",
            "desc": "جسم جوز يتعلّق على الحيطة: درج 15 سم بوش أبيض تحت وفتحة مفتوحة فوقه. 50×35×32 (ارفعه من «من الأرض»).",
            "params": {
                "template": "blocks",
                "width": 50,
                "depth": 35,
                "height": 32,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "drawer",
                        "name": "الجسم",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W",
                        "d": "D",
                        "h": "H",
                        "faces": [
                            "left",
                            "right",
                            "bottom",
                            "back",
                            "top"
                        ],
                        "drawer_h": 15,
                        "mat": "carcass",
                        "front_mat": "front",
                        "handle": "none"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "wood_walnut"
                    },
                    "front": {
                        "lib": "hpl_white"
                    }
                }
            }
        },
        "blk_coffee_two_L": {
            "label": "انتريه حرفين L متعاكسين",
            "group": "ترابيزات كتل",
            "desc": "حرف L أبيض (جنب شمال + قاعدة) وحرف L جوز 3.6 سم (سطح + جنب يمين) داخلين في بعض. 120×60×40.",
            "params": {
                "template": "blocks",
                "width": 120,
                "depth": 60,
                "height": 40,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "L أبيض",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W",
                        "d": "D",
                        "h": "H-3.6",
                        "faces": [
                            "left",
                            "bottom"
                        ],
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "جنب جوز",
                        "x": "W-3.6",
                        "y": 0,
                        "z": "T",
                        "w": 3.6,
                        "d": "D",
                        "h": "H-T-3.6",
                        "t": 3.6,
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "سطح جوز",
                        "x": 0,
                        "y": 0,
                        "z": "H-3.6",
                        "w": "W",
                        "d": "D",
                        "h": 3.6,
                        "t": 3.6,
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_white"
                    },
                    "accent": {
                        "lib": "wood_walnut"
                    }
                }
            }
        },
        "blk_console_offset": {
            "label": "كونسول كتل متدرجة",
            "group": "ترابيزات كتل",
            "desc": "صندوق بلوط واقف بأرفف، وسطح أبيض طويل راكب عليه وعلى لوح واقف في الطرف. 120×35×80.",
            "params": {
                "template": "blocks",
                "width": 120,
                "depth": 35,
                "height": 80,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "الصندوق",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": 40,
                        "d": "D",
                        "h": "H-T",
                        "faces": [
                            "left",
                            "right",
                            "top",
                            "bottom",
                            "back"
                        ],
                        "shelves": 2,
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "السطح",
                        "x": 20,
                        "y": 0,
                        "z": "H-T",
                        "w": "W-20",
                        "d": "D",
                        "h": "T",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "لوح واقف",
                        "x": "W-T",
                        "y": 4,
                        "z": 0,
                        "w": "T",
                        "d": "D-4",
                        "h": "H-T",
                        "mat": "carcass"
                    }
                ],
                "materials": {
                    "accent": {
                        "lib": "wood_oak_light_v"
                    },
                    "carcass": {
                        "lib": "hpl_white"
                    }
                }
            }
        },

        "blk_coffee_two_tubes": {
            "label": "انتريه أنبوبين أبيض وسطح بلوط",
            "group": "ترابيزات كتل",
            "desc": "أنبوبين أبيض مفتوحين من الطرفين (رأس + قاعدة + وش + ضهر). سطح البلوط بيعدّي جوه الأنبوب الشمال تحت رأسه وطالع منه من الناحيتين ومن ورا، وقاعد على الأنبوب اليمين، وفوقه لوح أبيض فوق الأنبوب اليمين — الرأسين على نفس المستوى. 119×50×45.",
            "params": {
                "template": "blocks",
                "width": 119,
                "depth": 50,
                "height": 45,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "slab",
                        "name": "قاعدة الأنبوب الشمال",
                        "x": 5,
                        "y": 0,
                        "z": 0,
                        "w": 22,
                        "d": 38,
                        "h": "T",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رأس الأنبوب الشمال",
                        "x": 5,
                        "y": 0,
                        "z": "H-T",
                        "w": 22,
                        "d": 38,
                        "h": "T",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "وش الأنبوب الشمال",
                        "x": 5,
                        "y": 0,
                        "z": "T",
                        "w": 22,
                        "d": "T",
                        "h": "H-2*T-1.8",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "ضهر الأنبوب الشمال",
                        "x": 5,
                        "y": "38-T",
                        "z": "T",
                        "w": 22,
                        "d": "T",
                        "h": "H-2*T-1.8",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "سطح بلوط",
                        "x": 0,
                        "y": 0,
                        "z": "H-T-1.8",
                        "w": "W",
                        "d": "D",
                        "h": 1.8,
                        "mat": "accent"
                    },
                    {
                        "k": "box",
                        "name": "الأنبوب اليمين",
                        "x": 82,
                        "y": 0,
                        "z": 0,
                        "w": 22,
                        "d": 40,
                        "h": "H-T-1.8",
                        "faces": [
                            "top",
                            "bottom",
                            "front",
                            "back"
                        ],
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "لوح أبيض فوق السطح",
                        "x": 76,
                        "y": 6,
                        "z": "H-T",
                        "w": 32,
                        "d": 34,
                        "h": "T",
                        "mat": "carcass"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_white"
                    },
                    "accent": {
                        "lib": "wood_oak_light"
                    }
                }
            }
        },
        "blk_shelf_black_rings": {
            "label": "مكتبة بعمودين أسود وأحزمة بلوط",
            "group": "مكتبات",
            "desc": "زي الصورة: عمودين أسود، كل عمود حلقة مقفولة عرضها 12 سم (وش + ضهر + رأس + قاعدة، سمك 3.6 = طبقتين 18) ومفتوحة من الجنبين، واقفة على الأرض بطول الوحدة. 3 أحزمة بلوط على 3 أدوار (من تحت 8 سم، في النص، وفوق): كل حزام رف تحت + رف فوق (بينهم 30 سم من بره) بلوط 18 مم بيعدّوا جوه الحلقتين، وبيطلعوا 6 سم بره كل عمود ويتقفلوا بجنب بلوط — من غير أي وش. بين الأحزمة مفتوح. 88×32×180.",
            "params": {
                "template": "blocks",
                "against_wall": true,
                "width": 88,
                "depth": 32,
                "height": 180,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "عمود أسود شمال",
                        "x": 6,
                        "y": 0,
                        "z": 0,
                        "w": 12,
                        "d": "D",
                        "h": "H",
                        "t": 3.6,
                        "faces": [
                            "top",
                            "bottom",
                            "front",
                            "back"
                        ],
                        "mat": "carcass"
                    },
                    {
                        "k": "box",
                        "name": "عمود أسود يمين",
                        "x": "W-18",
                        "y": 0,
                        "z": 0,
                        "w": 12,
                        "d": "D",
                        "h": "H",
                        "t": 3.6,
                        "faces": [
                            "top",
                            "bottom",
                            "front",
                            "back"
                        ],
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رف 1 تحت",
                        "x": 0,
                        "y": 3.6,
                        "z": 8,
                        "w": "W",
                        "d": "D-7.2",
                        "h": "T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "رف 1 فوق",
                        "x": 0,
                        "y": 3.6,
                        "z": "38-T",
                        "w": "W",
                        "d": "D-7.2",
                        "h": "T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب حزام 1 شمال",
                        "x": 0,
                        "y": 3.6,
                        "z": "8+T",
                        "w": "T",
                        "d": "D-7.2",
                        "h": "30-2*T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب حزام 1 يمين",
                        "x": "W-T",
                        "y": 3.6,
                        "z": "8+T",
                        "w": "T",
                        "d": "D-7.2",
                        "h": "30-2*T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "رف 2 تحت",
                        "x": 0,
                        "y": 3.6,
                        "z": 68,
                        "w": "W",
                        "d": "D-7.2",
                        "h": "T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "رف 2 فوق",
                        "x": 0,
                        "y": 3.6,
                        "z": "98-T",
                        "w": "W",
                        "d": "D-7.2",
                        "h": "T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب حزام 2 شمال",
                        "x": 0,
                        "y": 3.6,
                        "z": "68+T",
                        "w": "T",
                        "d": "D-7.2",
                        "h": "30-2*T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب حزام 2 يمين",
                        "x": "W-T",
                        "y": 3.6,
                        "z": "68+T",
                        "w": "T",
                        "d": "D-7.2",
                        "h": "30-2*T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "رف 3 تحت",
                        "x": 0,
                        "y": 3.6,
                        "z": 132,
                        "w": "W",
                        "d": "D-7.2",
                        "h": "T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "رف 3 فوق",
                        "x": 0,
                        "y": 3.6,
                        "z": "162-T",
                        "w": "W",
                        "d": "D-7.2",
                        "h": "T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب حزام 3 شمال",
                        "x": 0,
                        "y": 3.6,
                        "z": "132+T",
                        "w": "T",
                        "d": "D-7.2",
                        "h": "30-2*T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب حزام 3 يمين",
                        "x": "W-T",
                        "y": 3.6,
                        "z": "132+T",
                        "w": "T",
                        "d": "D-7.2",
                        "h": "30-2*T",
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_black"
                    },
                    "accent": {
                        "lib": "wood_oak_light"
                    }
                }
            }
        },
        "blk_shelf_zigzag": {
            "label": "مكتبة S أبيض بأعمدة بلوط",
            "group": "مكتبات",
            "desc": "أرفف أبيض على شكل S: كل دور ليه جنب أبيض من ناحية والدور اللي بعده من الناحية التانية، وفي كل دور عمود بلوط 22 سم في الناحية العكسية شايل الرف اللي فوقه. 90×30×175.",
            "params": {
                "template": "blocks",
            "against_wall": true,
                "width": 90,
                "depth": 30,
                "height": 175,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "slab",
                        "name": "قاعدة",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W",
                        "d": "D",
                        "h": 3.6,
                        "t": 3.6,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رف 1",
                        "x": 0,
                        "y": 0,
                        "z": 39.6,
                        "w": "W",
                        "d": "D",
                        "h": 1.8,
                        "t": 1.8,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رف 2",
                        "x": 0,
                        "y": 0,
                        "z": 72.6,
                        "w": "W",
                        "d": "D",
                        "h": 1.8,
                        "t": 1.8,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رف 3",
                        "x": 0,
                        "y": 0,
                        "z": 105.6,
                        "w": "W",
                        "d": "D",
                        "h": 1.8,
                        "t": 1.8,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رف 4",
                        "x": 0,
                        "y": 0,
                        "z": 138.6,
                        "w": "W",
                        "d": "D",
                        "h": 1.8,
                        "t": 1.8,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "رأس",
                        "x": 0,
                        "y": 0,
                        "z": 173.2,
                        "w": "W",
                        "d": "D",
                        "h": 1.8,
                        "t": 1.8,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "جنب أبيض 1",
                        "x": 0,
                        "y": 0,
                        "z": 3.6,
                        "w": "T",
                        "d": "D",
                        "h": 36.0,
                        "mat": "carcass"
                    },
                    {
                        "k": "box",
                        "name": "عمود بلوط 1",
                        "x": 60,
                        "y": 0,
                        "z": 3.6,
                        "w": 22,
                        "d": "D-2",
                        "h": 36.0,
                        "faces": [
                            "left",
                            "right",
                            "front",
                            "back"
                        ],
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب أبيض 2",
                        "x": "W-T",
                        "y": 0,
                        "z": 41.4,
                        "w": "T",
                        "d": "D",
                        "h": 31.2,
                        "mat": "carcass"
                    },
                    {
                        "k": "box",
                        "name": "عمود بلوط 2",
                        "x": 8,
                        "y": 0,
                        "z": 41.4,
                        "w": 22,
                        "d": "D-2",
                        "h": 31.2,
                        "faces": [
                            "left",
                            "right",
                            "front",
                            "back"
                        ],
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب أبيض 3",
                        "x": 0,
                        "y": 0,
                        "z": 74.4,
                        "w": "T",
                        "d": "D",
                        "h": 31.2,
                        "mat": "carcass"
                    },
                    {
                        "k": "box",
                        "name": "عمود بلوط 3",
                        "x": 60,
                        "y": 0,
                        "z": 74.4,
                        "w": 22,
                        "d": "D-2",
                        "h": 31.2,
                        "faces": [
                            "left",
                            "right",
                            "front",
                            "back"
                        ],
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب أبيض 4",
                        "x": "W-T",
                        "y": 0,
                        "z": 107.4,
                        "w": "T",
                        "d": "D",
                        "h": 31.2,
                        "mat": "carcass"
                    },
                    {
                        "k": "box",
                        "name": "عمود بلوط 4",
                        "x": 8,
                        "y": 0,
                        "z": 107.4,
                        "w": 22,
                        "d": "D-2",
                        "h": 31.2,
                        "faces": [
                            "left",
                            "right",
                            "front",
                            "back"
                        ],
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "جنب أبيض 5",
                        "x": 0,
                        "y": 0,
                        "z": 140.4,
                        "w": "T",
                        "d": "D",
                        "h": 32.8,
                        "mat": "carcass"
                    },
                    {
                        "k": "box",
                        "name": "عمود بلوط 5",
                        "x": 60,
                        "y": 0,
                        "z": 140.4,
                        "w": 22,
                        "d": "D-2",
                        "h": 32.8,
                        "faces": [
                            "left",
                            "right",
                            "front",
                            "back"
                        ],
                        "mat": "accent"
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_white"
                    },
                    "accent": {
                        "lib": "wood_oak_natural"
                    }
                }
            }
        },

    "coffee_waterfall_walnut": {
        "label": "انتريه حرف نازل جوز",
        "group": "الترابيزات",
        "desc": "Waterfall جوز 3.6 سم + رف تحت، 120×60.",
        "params": {
            "template": "coffee_table",
            "width": 120,
            "depth": 60,
            "height": 40,
            "table": {
                "base": "waterfall",
                "shelf": true,
                "shelf_height": 10,
                "stretcher": "none"
            },
            "materials": {
                "table_top": {
                    "lib": "wood_walnut"
                },
                "table_base": {
                    "lib": "wood_walnut_v"
                }
            }
        }
    },
    "coffee_round_cross_marble": {
        "label": "انتريه دايرة رخام على صليب",
        "group": "الترابيزات",
        "desc": "سطح كالاكاتا Ø90 على قاعدة صليب سودا.",
        "params": {
            "template": "coffee_table",
            "width": 90,
            "height": 38,
            "table": {
                "shape": "round",
                "base": "cross",
                "shelf": false,
                "stretcher": "none"
            },
            "materials": {
                "table_top": {
                    "lib": "marble_calacatta"
                },
                "table_base": {
                    "lib": "hpl_black"
                }
            }
        }
    },
    "coffee_oval_pedestal_led": {
        "label": "انتريه بيضاوي عائم بليد",
        "group": "الترابيزات",
        "desc": "أوك على عمود أنثراسيت وليد حوالين القاعدة.",
        "params": {
            "template": "coffee_table",
            "width": 130,
            "depth": 75,
            "height": 38,
            "table": {
                "shape": "oval",
                "base": "pedestals",
                "columns": 1,
                "column_size": 50,
                "base_depth": 32,
                "shelf": false,
                "stretcher": "none",
                "led": true
            },
            "materials": {
                "table_top": {
                    "lib": "wood_oak_natural"
                },
                "table_base": {
                    "lib": "hpl_anthracite"
                }
            }
        }
    },
    "coffee_box_floating": {
        "label": "انتريه صندوق عائم",
        "group": "الترابيزات",
        "desc": "أركان مدوّرة، قاعدة صندوق داخلة 12 سم بليد = شكل طاير.",
        "params": {
            "template": "coffee_table",
            "width": 110,
            "depth": 70,
            "height": 36,
            "table": {
                "shape": "rounded",
                "corner_radius": 10,
                "base": "box",
                "overhang_x": 14,
                "overhang_y": 12,
                "shelf": false,
                "stretcher": "none",
                "led": true
            },
            "materials": {
                "table_top": {
                    "lib": "hpl_greige"
                },
                "table_base": {
                    "lib": "hpl_black"
                }
            }
        }
    },
    "coffee_stadium_frame": {
        "label": "انتريه كبسولة ببرواز أسود",
        "group": "الترابيزات",
        "desc": "أوك فاتح على رجول برواز سودا + رف.",
        "params": {
            "template": "coffee_table",
            "width": 120,
            "depth": 60,
            "height": 40,
            "table": {
                "shape": "stadium",
                "base": "frame",
                "frame_width": 5,
                "overhang_x": 18,
                "overhang_y": 4,
                "shelf": true,
                "shelf_height": 10,
                "stretcher": "none"
            },
            "materials": {
                "table_top": {
                    "lib": "wood_oak_light"
                },
                "table_base": {
                    "lib": "hpl_black"
                }
            }
        }
    },
    "side_round_pedestal": {
        "label": "جانبية دايرة على عمود",
        "group": "الترابيزات",
        "desc": "Ø50 رخام على عمود جوز.",
        "params": {
            "template": "side_table",
            "materials": {
                "table_top": {
                    "lib": "marble_calacatta"
                },
                "table_base": {
                    "lib": "wood_walnut_v"
                }
            }
        }
    },
    "side_cube_waterfall": {
        "label": "جانبية مكعب حرف نازل",
        "group": "الترابيزات",
        "desc": "45×45 أوك برف في النص.",
        "params": {
            "template": "side_table",
            "width": 45,
            "depth": 45,
            "height": 50,
            "table": {
                "shape": "rect",
                "base": "waterfall",
                "shelf": true,
                "shelf_height": 20,
                "stretcher": "none"
            },
            "materials": {
                "table_top": {
                    "lib": "wood_oak_natural"
                },
                "table_base": {
                    "lib": "wood_oak_natural_v"
                }
            }
        }
    },
    "dining_slab_oak": {
        "label": "سفرة رجلين لوح أوك",
        "group": "الترابيزات",
        "desc": "200×100 لـ 8 أفراد، رجلين 3.6 سم وعارضة.",
        "params": {
            "template": "dining_table",
            "width": 200,
            "depth": 100,
            "table": {
                "base": "slab",
                "overhang_x": 25
            },
            "materials": {
                "table_top": {
                    "lib": "wood_oak_natural"
                },
                "table_base": {
                    "lib": "wood_oak_natural_v"
                }
            }
        }
    },
    "dining_round_cross": {
        "label": "سفرة دايرة على صليب",
        "group": "الترابيزات",
        "desc": "Ø120 رخام على صليب جوز — 6 أفراد.",
        "params": {
            "template": "dining_table",
            "width": 120,
            "table": {
                "shape": "round",
                "base": "cross",
                "stretcher": "none"
            },
            "materials": {
                "table_top": {
                    "lib": "marble_calacatta"
                },
                "table_base": {
                    "lib": "wood_walnut_v"
                }
            }
        }
    },
    "dining_rounded_legs4": {
        "label": "سفرة 4 رجول جوز",
        "group": "الترابيزات",
        "desc": "أركان مدوّرة، رجول مصمتة 7.2 وبرواز تحت السطح.",
        "params": {
            "template": "dining_table",
            "width": 180,
            "depth": 90,
            "table": {
                "shape": "rounded",
                "corner_radius": 8,
                "base": "legs4",
                "leg_size": 7.2,
                "overhang_x": 8,
                "overhang_y": 6,
                "stretcher": "center",
                "stretcher_height": 10
            },
            "materials": {
                "table_top": {
                    "lib": "wood_walnut"
                },
                "table_base": {
                    "lib": "wood_walnut_v"
                }
            }
        }
    },
    "dining_boat_pedestals": {
        "label": "سفرة قارب على عمودين",
        "group": "الترابيزات",
        "desc": "220 سم جوانب مقوّسة، عمودين أسود.",
        "params": {
            "template": "dining_table",
            "width": 220,
            "depth": 105,
            "table": {
                "shape": "boat",
                "base": "pedestals",
                "columns": 2,
                "column_size": 35,
                "base_depth": 45,
                "overhang_x": 35,
                "stretcher": "center",
                "stretcher_height": 12
            },
            "materials": {
                "table_top": {
                    "lib": "hpl_greige"
                },
                "table_base": {
                    "lib": "hpl_black"
                }
            }
        }
    },
    "office_slab_modesty": {
        "label": "مكتب لوحين + ساتر ودرج",
        "group": "الترابيزات",
        "desc": "150×70، ساتر ورا، درج معلّق وفتحة كابلات.",
        "params": {
            "template": "office_table",
            "materials": {
                "table_top": {
                    "lib": "wood_oak_light"
                },
                "table_base": {
                    "lib": "hpl_white"
                }
            }
        }
    },
    "office_frame_black": {
        "label": "مكتب برواز أسود",
        "group": "الترابيزات",
        "desc": "جوز على رجول برواز سودا + درج.",
        "params": {
            "template": "office_table",
            "width": 140,
            "depth": 70,
            "table": {
                "base": "frame",
                "frame_width": 5,
                "overhang_x": 6,
                "overhang_y": 3,
                "modesty": false,
                "stretcher": "back",
                "stretcher_height": 10,
                "drawer": true,
                "grommets": 1
            },
            "materials": {
                "table_top": {
                    "lib": "wood_walnut"
                },
                "table_base": {
                    "lib": "hpl_black"
                }
            }
        }
    },
    "office_executive": {
        "label": "مكتب مدير بعمودين",
        "group": "الترابيزات",
        "desc": "180×85 جوز غامق، عمودين وساتر ورا.",
        "params": {
            "template": "office_table",
            "width": 180,
            "depth": 85,
            "table": {
                "base": "pedestals",
                "columns": 2,
                "column_size": 45,
                "base_depth": 60,
                "overhang_x": 10,
                "stretcher": "back",
                "modesty": true,
                "drawer": false,
                "grommets": 2
            },
            "materials": {
                "table_top": {
                    "lib": "wood_walnut_dark"
                },
                "table_base": {
                    "lib": "hpl_beige"
                }
            }
        }
    },
    "meeting_boat_3col": {
        "label": "اجتماعات قارب 12 فرد",
        "group": "الترابيزات",
        "desc": "360×130، 3 أعمدة، كابلات وعلبة كهرباء — السطح بيتقسم أوتوماتيك.",
        "params": {
            "template": "meeting_table",
            "width": 360,
            "depth": 130,
            "table": {
                "shape": "boat",
                "base": "pedestals",
                "columns": 3,
                "column_size": 45,
                "base_depth": 50,
                "overhang_x": 50,
                "stretcher": "center",
                "stretcher_height": 35,
                "grommets": 3,
                "power_box": true
            },
            "materials": {
                "table_top": {
                    "lib": "wood_oak_natural"
                },
                "table_base": {
                    "lib": "hpl_anthracite"
                }
            }
        }
    },
    "meeting_stadium_slab": {
        "label": "اجتماعات كبسولة رخام",
        "group": "الترابيزات",
        "desc": "280×120 رجلين لوح أسود وساتر في النص.",
        "params": {
            "template": "meeting_table",
            "width": 280,
            "depth": 120,
            "table": {
                "shape": "stadium",
                "base": "slab",
                "overhang_x": 40,
                "stretcher": "center",
                "stretcher_height": 30,
                "grommets": 2,
                "power_box": true
            },
            "materials": {
                "table_top": {
                    "lib": "marble_carrara"
                },
                "table_base": {
                    "lib": "hpl_black"
                }
            }
        }
    },
    "meeting_round_6": {
        "label": "اجتماعات دايرة Ø140",
        "group": "الترابيزات",
        "desc": "عمود واحد في النص وعلبة كهرباء — 7 أفراد.",
        "params": {
            "template": "meeting_table",
            "width": 140,
            "table": {
                "shape": "round",
                "base": "pedestals",
                "columns": 1,
                "column_size": 60,
                "grommets": 0,
                "power_box": true,
                "stretcher": "none"
            },
            "materials": {
                "table_top": {
                    "lib": "wood_walnut"
                },
                "table_base": {
                    "lib": "hpl_black"
                }
            }
        }
    },
    "console_waterfall_led": {
        "label": "كونسول حرف نازل بليد",
        "group": "الترابيزات",
        "desc": "120×35 أوك، رف تحت وليد.",
        "params": {
            "template": "console_table",
            "table": {
                "led": true
            },
            "materials": {
                "table_top": {
                    "lib": "wood_oak_natural"
                },
                "table_base": {
                    "lib": "wood_oak_natural_v"
                }
            }
        }
    },
    "console_frame_marble": {
        "label": "كونسول رخام أسود ببرواز",
        "group": "الترابيزات",
        "desc": "نيرو ماركينا على برواز أسود + رف.",
        "params": {
            "template": "console_table",
            "width": 130,
            "depth": 38,
            "height": 82,
            "table": {
                "base": "frame",
                "frame_width": 5,
                "overhang_x": 5,
                "overhang_y": 2,
                "shelf": true,
                "shelf_height": 15,
                "stretcher": "back",
                "stretcher_height": 8
            },
            "materials": {
                "table_top": {
                    "lib": "marble_nero_marquina"
                },
                "table_base": {
                    "lib": "hpl_black"
                }
            }
        }
    },
    // ---------------------------------------------------------------- v112: new designs (2025–2026 trends)
    "x_bed_japandi_low": {
        "label": "سرير ياباني واطي عائم",
        "group": "غرف النوم",
        "desc": "قاعدة واطية طايرة بليد، ضهر أوك واطي ورف فوقه — ستايل جابندي.",
        "params": {
            "template": "bed",
            "bed": { "mattress_width": 160, "storage": "none", "height": 24, "floating": true, "float_height": 8, "float_setback": 12, "led": true,
                "headboard_height": 95, "headboard_extra": 25, "headboard_thickness": 3.6, "headboard_shelf": true },
            "materials": { "front": { "lib": "wood_oak_light_v" }, "carcass": { "lib": "hpl_offwhite" }, "accent": { "lib": "wood_oak_light" } }
        }
    },
    "x_bed_fluted_wall": {
        "label": "سرير بحيطة شرايح جوز وكومودينو معلّق",
        "group": "غرف النوم",
        "desc": "ضهر شرايح رفيعة 4 سم بعرض الحيطة، كومودينو معلّق في كل جناح وليد ورا.",
        "params": {
            "template": "bed",
            "bed": { "mattress_width": 180, "storage": "lift", "headboard_style": "slats", "slat_width": 4, "slat_gap": 1.5, "headboard_height": 150,
                "headboard_extra": 60, "side_tables": true, "led": true },
            "handle": "gola",
            "materials": { "front": { "lib": "hpl_anthracite" }, "carcass": { "lib": "hpl_anthracite" }, "accent": { "lib": "wood_walnut_v" } }
        }
    },
    "x_night_waterfall": {
        "label": "كومودينو بحرف أوك نازل",
        "group": "غرف النوم",
        "desc": "سطح أوك 3.6 بينزل على جنب لحد الأرض، صندوق أبيض بدرج ونيش مفتوح. 50×40×55.",
        "params": {
            "template": "blocks", "width": 50, "depth": 40, "height": 55, "thickness": 1.8,
            "blocks": [
                { "k": "slab", "name": "سطح أوك", "x": 0, "y": 0, "z": "H-3.6", "w": "W", "d": "D", "h": 3.6, "t": 3.6, "mat": "accent" },
                { "k": "slab", "name": "رجل أوك نازلة", "x": "W-3.6", "y": 0, "z": 0, "w": 3.6, "d": "D", "h": "H-3.6", "t": 3.6, "mat": "accent" },
                { "k": "drawer", "name": "صندوق الدرج", "x": 0, "y": 0, "z": 0, "w": "W-3.6", "d": "D", "h": "H-3.6", "faces": ["left", "bottom", "back"], "drawer_h": 18, "mat": "carcass", "front_mat": "front", "handle": "none" }
            ],
            "materials": { "carcass": { "lib": "hpl_white" }, "front": { "lib": "hpl_white" }, "accent": { "lib": "wood_oak_natural" } }
        }
    },
    "x_bench_bed_end": {
        "label": "بنش آخر السرير بدرجين",
        "group": "غرف النوم",
        "desc": "قعدة أوك 3.6 على صندوق بدرجين كبار، فوق وزرة داخلة = شكل طاير.",
        "params": {
            "template": "blocks", "width": 130, "depth": 42, "height": 46, "thickness": 1.8,
            "blocks": [
                { "k": "box", "name": "وزرة داخلة", "x": 6, "y": 6, "z": 0, "w": "W-12", "d": "D-12", "h": 8, "faces": ["left", "right", "front", "back"], "joint": "sides", "mat": "plinth" },
                { "k": "drawer", "name": "درج شمال", "x": 0, "y": 0, "z": 8, "w": "W/2", "d": "D", "h": "H-8-3.6", "faces": ["left", "right", "bottom", "back"], "front_cover": "inset", "mat": "carcass", "front_mat": "front" },
                { "k": "drawer", "name": "درج يمين", "x": "W/2", "y": 0, "z": 8, "w": "W/2", "d": "D", "h": "H-8-3.6", "faces": ["left", "right", "bottom", "back"], "front_cover": "inset", "mat": "carcass", "front_mat": "front" },
                { "k": "slab", "name": "قعدة أوك", "x": 0, "y": -1.8, "z": "H-3.6", "w": "W", "d": "D+1.8", "h": 3.6, "t": 3.6, "mat": "accent" }
            ],
            "materials": { "carcass": { "lib": "hpl_greige" }, "front": { "lib": "hpl_greige" }, "accent": { "lib": "wood_oak_natural" }, "plinth": { "lib": "hpl_black" } }
        }
    },
    "x_tv_fluted_sage": {
        "label": "شاشة شرايح رفيعة بعمود مفتوح",
        "group": "الريسبشن",
        "desc": "شرايح أوك 3 سم (Fluted) على أخضر سيج، عمود أرفف مفتوح بليد شمال، أرضي معلّق بقلاب.",
        "params": {
            "template": "tv_unit", "width": 280, "height": 220, "handle": "push",
            "tv": { "columns": "left", "column_width": 45, "column_doors": false, "column_shelves": 5, "base_fronts": "flap", "base_float": 30,
                "panel_style": "slats", "slat_width": 3, "slat_gap": 1, "panel_height": 170, "led": true },
            "materials": { "carcass": { "lib": "hpl_sage" }, "front": { "lib": "hpl_sage" }, "accent": { "lib": "wood_oak_natural_v" } }
        }
    },
    "x_credenza_float": {
        "label": "كريدنزا 180 أدراج ونيشين",
        "group": "الريسبشن",
        "desc": "أدراج في النص ونيش مفتوح برف في كل طرف، سطح جوز 3.6 ووزرة سودا داخلة.",
        "params": {
            "template": "blocks", "width": 180, "depth": 45, "height": 72, "thickness": 1.8,
            "blocks": [
                { "k": "box", "name": "وزرة داخلة", "x": 10, "y": 6, "z": 0, "w": "W-20", "d": "D-12", "h": 12, "faces": ["left", "right", "front", "back"], "joint": "sides", "mat": "plinth" },
                { "k": "box", "name": "نيش شمال", "x": 0, "y": 0, "z": 12, "w": 40, "d": "D", "h": "H-12-3.6", "faces": ["left", "right", "bottom", "back"], "shelves": 1, "mat": "carcass" },
                { "k": "drawer", "name": "درج تحت", "x": 40, "y": 0, "z": 12, "w": "W-80", "d": "D", "h": "(H-12-3.6)/2", "faces": ["bottom", "back"], "front_cover": "inset", "mat": "carcass", "front_mat": "front" },
                { "k": "drawer", "name": "درج فوق", "x": 40, "y": 0, "z": "12+(H-12-3.6)/2", "w": "W-80", "d": "D", "h": "(H-12-3.6)/2", "faces": ["bottom", "back"], "front_cover": "inset", "mat": "carcass", "front_mat": "front" },
                { "k": "box", "name": "نيش يمين", "x": "W-40", "y": 0, "z": 12, "w": 40, "d": "D", "h": "H-12-3.6", "faces": ["left", "right", "bottom", "back"], "shelves": 1, "mat": "carcass" },
                { "k": "slab", "name": "سطح جوز", "x": 0, "y": -1.8, "z": "H-3.6", "w": "W", "d": "D+1.8", "h": 3.6, "t": 3.6, "mat": "accent" }
            ],
            "materials": { "carcass": { "lib": "hpl_offwhite" }, "front": { "lib": "wood_walnut" }, "accent": { "lib": "wood_walnut" }, "plinth": { "lib": "hpl_black" } }
        }
    },
    "x_shoe_slim_flap": {
        "label": "جزامة رفيعة 24 سم بقلابات",
        "group": "الريسبشن",
        "desc": "معلّقة، عمقها 24 بس للطرقات الضيقة — 3 قلابات Push ونيش مفاتيح بليد فوق.",
        "params": {
            "template": "shoe_cabinet", "width": 80, "height": 125, "depth": 24, "mount": "wall", "handle": "push", "led_under": true,
            "fronts": [{ "type": "flap", "count": 1, "shelves": 0 }, { "type": "flap", "count": 1, "shelves": 0 }, { "type": "flap", "count": 1, "shelves": 0 }, { "type": "open", "height": 18, "shelves": 0, "led": true }],
            "materials": { "carcass": { "lib": "hpl_white" }, "front": { "lib": "wood_oak_light_v" } }
        }
    },
    "x_console_float_drawer": {
        "label": "كونسول مدخل معلّق بدرج",
        "group": "الريسبشن",
        "desc": "شريط 120 معلّق بدرج جولا وليد تحت — للمفاتيح والمراية فوقه.",
        "params": {
            "template": "cabinet", "width": 120, "height": 20, "depth": 36, "mount": "wall", "handle": "gola", "led_under": true, "back": { "enabled": true },
            "fronts": [{ "type": "drawers", "count": 1 }],
            "materials": { "carcass": { "lib": "wood_walnut_v" }, "front": { "lib": "wood_walnut_v" }, "accent": { "lib": "wood_walnut_v" } }
        }
    },
    "x_vanity_float_shelf": {
        "label": "حوض معلّق بدرج ورف فوط",
        "group": "الحمام",
        "desc": "درج جوز جولا فوق، رف مفتوح للفوط تحت، ليد تحت الوحدة.",
        "params": {
            "template": "vanity", "width": 100, "height": 55, "handle": "gola", "led_under": true,
            "fronts": [{ "type": "open", "height": 20, "shelves": 0, "led": true }, { "type": "drawers", "count": 1 }],
            "materials": { "carcass": { "lib": "hpl_white" }, "front": { "lib": "wood_walnut_v" }, "accent": { "lib": "terrazzo" } }
        }
    },
    "x_vanity_double150": {
        "label": "حوض دبل 150 بأدراج",
        "group": "الحمام",
        "desc": "معلّق، درجين عراض جولا بعرض الحوضين، أخضر زيتي وسطح تيرازو.",
        "params": {
            "template": "vanity", "width": 150, "height": 52, "handle": "gola", "led_under": true,
            "fronts": [{ "type": "drawers", "count": 2 }],
            "materials": { "carcass": { "lib": "hpl_white" }, "front": { "lib": "hpl_olive" }, "accent": { "lib": "terrazzo" } }
        }
    },
    "x_bath_over_wc_open": {
        "label": "دولاب فوق التواليت بنيش",
        "group": "الحمام",
        "desc": "معلّق 70 سم: نيش مفتوح بليد تحت وضلفتين Push فوق.",
        "params": {
            "template": "cabinet", "environment": "wet", "width": 70, "height": 85, "depth": 22, "mount": "wall", "handle": "push",
            "fronts": [{ "type": "open", "height": 25, "shelves": 0, "led": true }, { "type": "doors", "count": 2, "shelves": 1 }],
            "materials": { "carcass": { "lib": "hpl_greige" }, "front": { "lib": "hpl_greige" } }
        }
    },
    "x_dining_pill": {
        "label": "سفرة كبسولة على عمودين",
        "group": "الترابيزات",
        "desc": "220×100 أطرافها نص دايرة (Pill)، عمودين صندوق كريمي — 8 أفراد.",
        "params": {
            "template": "dining_table", "width": 220, "depth": 100,
            "table": { "shape": "stadium", "base": "pedestals", "columns": 2, "column_size": 40, "base_depth": 40, "overhang_x": 40, "stretcher": "center", "stretcher_height": 12 },
            "materials": { "table_top": { "lib": "wood_oak_natural" }, "table_base": { "lib": "hpl_cream" } }
        }
    },
    "x_coffee_round_plinth": {
        "label": "انتريه دايرة على قاعدة صندوق",
        "group": "الترابيزات",
        "desc": "Ø95 رخام كريما على صندوق مايكروسمنت داخل 15 سم — شكل نحتي.",
        "params": {
            "template": "coffee_table", "width": 95, "depth": 95, "height": 36,
            "table": { "shape": "round", "base": "box", "overhang_x": 15, "overhang_y": 15, "shelf": false, "stretcher": "none" },
            "materials": { "table_top": { "lib": "marble_crema_marfil" }, "table_base": { "lib": "concrete_microcement" } }
        }
    },
    "x_desk_pill_frame": {
        "label": "مكتب كبسولة ببرواز",
        "group": "الترابيزات",
        "desc": "140×65 أطراف مدوّرة على رجول برواز أبيض، درج وفتحة كابلات.",
        "params": {
            "template": "office_table", "width": 140, "depth": 65,
            "table": { "shape": "stadium", "base": "frame", "frame_width": 5, "overhang_x": 16, "overhang_y": 3, "modesty": false, "stretcher": "back", "stretcher_height": 10, "drawer": true, "grommets": 1 },
            "materials": { "table_top": { "lib": "wood_oak_light" }, "table_base": { "lib": "hpl_white" } }
        }
    },
    "x_blk_coffee_box_fall": {
        "label": "انتريه صندوق بدرج وحرف نازل",
        "group": "ترابيزات كتل",
        "desc": "سطح جوز بيقعد على صندوق جريج بدرج شمال وبينزل لحد الأرض يمين، ورف بينهم.",
        "params": {
            "template": "blocks", "width": 120, "depth": 60, "height": 38, "thickness": 1.8,
            "blocks": [
                { "k": "slab", "name": "سطح جوز", "x": 0, "y": 0, "z": "H-3.6", "w": "W", "d": "D", "h": 3.6, "t": 3.6, "mat": "accent" },
                { "k": "slab", "name": "رجل جوز نازلة", "x": "W-3.6", "y": 0, "z": 0, "w": 3.6, "d": "D", "h": "H-3.6", "t": 3.6, "mat": "accent" },
                { "k": "drawer", "name": "صندوق الدرج", "x": 0, "y": 0, "z": 0, "w": 55, "d": "D", "h": "H-3.6", "faces": ["left", "right", "bottom", "back"], "drawer_h": 14, "mat": "carcass", "front_mat": "front", "handle": "none" },
                { "k": "slab", "name": "رف تحت", "x": 55, "y": 6, "z": 8, "w": "W-55-3.6", "d": "D-12", "h": 1.8, "mat": "carcass" }
            ],
            "materials": { "carcass": { "lib": "hpl_greige" }, "front": { "lib": "hpl_greige" }, "accent": { "lib": "wood_walnut" } }
        }
    },
    "x_blk_side_stacked": {
        "label": "جانبية مكعبين متزحلقين",
        "group": "ترابيزات كتل",
        "desc": "مكعب أوك مفتوح قدام وفوقه مكعب أسود مزحلق 10 سم ومفتوح من الجنب.",
        "params": {
            "template": "blocks", "width": 55, "depth": 40, "height": 50, "thickness": 1.8,
            "blocks": [
                { "k": "box", "name": "مكعب تحت", "x": 0, "y": 0, "z": 0, "w": 45, "d": "D", "h": 25, "faces": ["left", "right", "top", "bottom", "back"], "mat": "carcass" },
                { "k": "box", "name": "مكعب فوق", "x": 10, "y": 0, "z": 25, "w": 45, "d": "D", "h": 25, "faces": ["left", "top", "bottom", "back", "front"], "mat": "accent" }
            ],
            "materials": { "carcass": { "lib": "wood_oak_natural" }, "accent": { "lib": "hpl_black" } }
        }
    },
    "x_shelf_offset": {
        "label": "مكتبة فواصل متلخبطة بدرجين",
        "group": "مكتبات",
        "desc": "4 أدوار، كل دور فاصله في مكان مختلف (Asymmetric)، ودرجين مقفولين ملوّنين. 120×35×180.",
        "params": {
            "template": "blocks", "against_wall": true, "width": 120, "depth": 35, "height": 180, "thickness": 1.8,
            "blocks": [
                { "k": "slab", "name": "جنب شمال", "x": 0, "y": 0, "z": 0, "w": 1.8, "d": "D", "h": "H", "mat": "carcass" },
                { "k": "slab", "name": "جنب يمين", "x": "W-1.8", "y": 0, "z": 0, "w": 1.8, "d": "D", "h": "H", "mat": "carcass" },
                { "k": "slab", "name": "قاعدة", "x": 1.8, "y": 0, "z": 0, "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                { "k": "slab", "name": "رف 1", "x": 1.8, "y": 0, "z": 44.55, "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                { "k": "slab", "name": "رف 2", "x": 1.8, "y": 0, "z": 89.1, "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                { "k": "slab", "name": "رف 3", "x": 1.8, "y": 0, "z": 133.65, "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                { "k": "slab", "name": "رأس", "x": 1.8, "y": 0, "z": "H-1.8", "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                { "k": "slab", "name": "فاصل دور 1", "x": 40, "y": 0, "z": 1.8, "w": 1.8, "d": "D", "h": 42.75, "mat": "carcass" },
                { "k": "slab", "name": "فاصل دور 2", "x": 78, "y": 0, "z": 46.35, "w": 1.8, "d": "D", "h": 42.75, "mat": "carcass" },
                { "k": "slab", "name": "فاصل دور 3", "x": 30, "y": 0, "z": 90.9, "w": 1.8, "d": "D", "h": 42.75, "mat": "carcass" },
                { "k": "slab", "name": "فاصل دور 4", "x": 64, "y": 0, "z": 135.45, "w": 1.8, "d": "D", "h": 42.75, "mat": "carcass" },
                { "k": "drawer", "name": "درج دور 1", "x": 1.8, "y": 0, "z": 1.8, "w": 38.2, "d": "D", "h": 42.75, "faces": ["back"], "front_cover": "inset", "mat": "carcass", "front_mat": "front" },
                { "k": "drawer", "name": "درج دور 3", "x": 31.8, "y": 0, "z": 90.9, "w": 86.4, "d": "D", "h": 42.75, "faces": ["back"], "front_cover": "inset", "mat": "carcass", "front_mat": "front" }
            ],
            "materials": { "carcass": { "lib": "wood_oak_light" }, "front": { "lib": "hpl_sage" } }
        }
    },
    "x_shelf_divider": {
        "label": "مكتبة فاصل غرفة بالوشين",
        "group": "مكتبات",
        "desc": "شبكة 4×4 مفتوحة من الناحيتين، ألواح جوز في نص العمق بشكل شطرنج — بتتشاف من الوشين. 160×35×160.",
        "params": {
            "template": "blocks", "width": 160, "depth": 35, "height": 160, "thickness": 1.8,
            "blocks": [
                { "k": "box", "name": "وزرة داخلة", "x": 6, "y": 6, "z": 0, "w": "W-12", "d": "D-12", "h": 8, "faces": ["left", "right", "front", "back"], "joint": "sides", "mat": "plinth" },
                { "k": "slab", "name": "جنب شمال", "x": 0, "y": 0, "z": 8, "w": 1.8, "d": "D", "h": "H-8", "mat": "carcass" },
                { "k": "slab", "name": "جنب يمين", "x": "W-1.8", "y": 0, "z": 8, "w": 1.8, "d": "D", "h": "H-8", "mat": "carcass" },
                { "k": "slab", "name": "قاعدة", "x": 1.8, "y": 0, "z": 8, "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                { "k": "slab", "name": "رف 1", "x": 1.8, "y": 0, "z": 45.55, "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                { "k": "slab", "name": "رف 2", "x": 1.8, "y": 0, "z": 83.1, "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                { "k": "slab", "name": "رف 3", "x": 1.8, "y": 0, "z": 120.65, "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                { "k": "slab", "name": "رأس", "x": 1.8, "y": 0, "z": "H-1.8", "w": "W-3.6", "d": "D", "h": 1.8, "mat": "carcass" },
                {"k": "slab", "name": "فاصل دور 1-1", "x": 39.55, "y": 0, "z": 9.8, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 1-2", "x": 79.1, "y": 0, "z": 9.8, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 1-3", "x": 118.65, "y": 0, "z": 9.8, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 2-1", "x": 39.55, "y": 0, "z": 47.35, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 2-2", "x": 79.1, "y": 0, "z": 47.35, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 2-3", "x": 118.65, "y": 0, "z": 47.35, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 3-1", "x": 39.55, "y": 0, "z": 84.9, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 3-2", "x": 79.1, "y": 0, "z": 84.9, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 3-3", "x": 118.65, "y": 0, "z": 84.9, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 4-1", "x": 39.55, "y": 0, "z": 122.45, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 4-2", "x": 79.1, "y": 0, "z": 122.45, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "فاصل دور 4-3", "x": 118.65, "y": 0, "z": 122.45, "w": 1.8, "d": "D", "h": 35.75, "mat": "carcass"},
                {"k": "slab", "name": "لوح نص العمق 1-1", "x": 1.8, "y": "D/2-0.9", "z": 9.8, "w": 37.75, "d": 1.8, "h": 35.75, "mat": "accent"},
                {"k": "slab", "name": "لوح نص العمق 1-3", "x": 80.9, "y": "D/2-0.9", "z": 9.8, "w": 37.75, "d": 1.8, "h": 35.75, "mat": "accent"},
                {"k": "slab", "name": "لوح نص العمق 2-2", "x": 41.35, "y": "D/2-0.9", "z": 47.35, "w": 37.75, "d": 1.8, "h": 35.75, "mat": "accent"},
                {"k": "slab", "name": "لوح نص العمق 2-4", "x": 120.45, "y": "D/2-0.9", "z": 47.35, "w": 37.75, "d": 1.8, "h": 35.75, "mat": "accent"},
                {"k": "slab", "name": "لوح نص العمق 3-1", "x": 1.8, "y": "D/2-0.9", "z": 84.9, "w": 37.75, "d": 1.8, "h": 35.75, "mat": "accent"},
                {"k": "slab", "name": "لوح نص العمق 3-3", "x": 80.9, "y": "D/2-0.9", "z": 84.9, "w": 37.75, "d": 1.8, "h": 35.75, "mat": "accent"},
                {"k": "slab", "name": "لوح نص العمق 4-2", "x": 41.35, "y": "D/2-0.9", "z": 122.45, "w": 37.75, "d": 1.8, "h": 35.75, "mat": "accent"},
                {"k": "slab", "name": "لوح نص العمق 4-4", "x": 120.45, "y": "D/2-0.9", "z": 122.45, "w": 37.75, "d": 1.8, "h": 35.75, "mat": "accent"}
            ],
            "materials": { "carcass": { "lib": "hpl_white" }, "accent": { "lib": "wood_walnut" }, "plinth": { "lib": "hpl_black" } }
        }
    },
    "x_shelf_stepped": {
        "label": "مكتبة سلالم 4 أعمدة",
        "group": "مكتبات",
        "desc": "أعمدة بتعلى من 45 لحد 180 زي السلم، أوك وأبيض ودرج في أول عمود. 160×35.",
        "params": {
            "template": "blocks", "against_wall": true, "width": 160, "depth": 35, "height": 180, "thickness": 1.8,
            "blocks": [
                {"k": "slab", "name": "قايم 1", "x": 0.0, "y": 0, "z": 0, "w": 1.8, "d": "D", "h": 45, "mat": "accent"},
                {"k": "slab", "name": "قايم 2", "x": 39.55, "y": 0, "z": 0, "w": 1.8, "d": "D", "h": 90, "mat": "accent"},
                {"k": "slab", "name": "قايم 3", "x": 79.1, "y": 0, "z": 0, "w": 1.8, "d": "D", "h": 135, "mat": "accent"},
                {"k": "slab", "name": "قايم 4", "x": 118.65, "y": 0, "z": 0, "w": 1.8, "d": "D", "h": 180, "mat": "accent"},
                {"k": "slab", "name": "قايم 5", "x": 158.2, "y": 0, "z": 0, "w": 1.8, "d": "D", "h": 180, "mat": "accent"},
                {"k": "slab", "name": "قاعدة عمود 1", "x": 1.8, "y": 0, "z": 0, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رأس عمود 1", "x": 1.8, "y": 0, "z": 43.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "قاعدة عمود 2", "x": 41.35, "y": 0, "z": 0, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رف عمود 2 - 1", "x": 41.35, "y": 0, "z": 43.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رأس عمود 2", "x": 41.35, "y": 0, "z": 88.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "قاعدة عمود 3", "x": 80.9, "y": 0, "z": 0, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رف عمود 3 - 1", "x": 80.9, "y": 0, "z": 43.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رف عمود 3 - 2", "x": 80.9, "y": 0, "z": 88.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رأس عمود 3", "x": 80.9, "y": 0, "z": 133.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "قاعدة عمود 4", "x": 120.45, "y": 0, "z": 0, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رف عمود 4 - 1", "x": 120.45, "y": 0, "z": 43.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رف عمود 4 - 2", "x": 120.45, "y": 0, "z": 88.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رف عمود 4 - 3", "x": 120.45, "y": 0, "z": 133.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "slab", "name": "رأس عمود 4", "x": 120.45, "y": 0, "z": 178.2, "w": 37.75, "d": "D", "h": 1.8, "mat": "carcass"},
                {"k": "drawer", "name": "درج عمود 1", "x": 1.8, "y": 0, "z": 1.8, "w": 37.75, "d": "D", "h": 41.4, "faces": ["back"], "front_cover": "inset", "mat": "carcass", "front_mat": "front"}
            ],
            "materials": { "carcass": { "lib": "hpl_white" }, "accent": { "lib": "wood_oak_natural_v" }, "front": { "lib": "wood_oak_natural" } }
        }
    }
    ,
    "tvw_flex": {
        "label": "وحدة شاشة: دولابين مفتوحين + وحدة مصمتة بتجويف",
        "group": "الريسبشن",
        "desc": "دولاب أرفف مفتوح بليد يمين وشمال، وبينهم وحدة مصمتة بارتفاعهم فيها تجويف بليد — كل مقاس بيتظبط لوحده.",
        "params": { "template": "tv_wall", "handle": "push",
            "tvw": { "left": { "on": true, "width": 60, "height": 240, "depth": 35, "z": 0, "fronts": [ { "type": "open", "count": 1, "height": "auto", "shelves": 5, "led": true } ] }, "right": { "on": true, "width": 60, "height": 240, "depth": 35, "z": 0, "fronts": [ { "type": "open", "count": 1, "height": "auto", "shelves": 5, "led": true } ] }, "mid": { "width": 200, "low": false },
                "clad": { "on": true, "match": true, "z0": 0, "depth": 30, "mat": "accent", "style": "flat", "led": false },
                "niches": [ { "on": true, "x": "center", "z": 40, "w": 150, "h": 35, "depth": 25, "shelves": 0, "led": true, "lining": "carcass", "back": "carcass" } ] },
            "materials": { "carcass": { "lib": "hpl_offwhite" }, "front": { "lib": "hpl_offwhite" }, "accent": { "lib": "wood_walnut_v" }, "shelf": { "lib": "hpl_offwhite" } } }
    },
    "wc_tv": {
        "label": "حيطة مقسومة: شاشة بين مكتبتين",
        "group": "الريسبشن",
        "desc": "قسّم الحيطة: أرفف بليد يمين وشمال، وفي النص تكسية مصمتة فوق مكان الشاشة وأدراج تحتها — افتحها وغيّر أي خانة أو مقاس بلمسة.",
        "params": { "template": "wall_comp", "width": 360, "height": 260, "handle": "push",
            "wc": { "depth": 35, "root": { "dir": "v", "parts": [ { "size": 60, "node": { "kind": "open", "shelves": 5, "led": true } },
                { "size": null, "node": { "dir": "h", "parts": [ { "size": 80, "node": { "kind": "solid" } }, { "size": null, "node": { "kind": "device", "tv": true } }, { "size": 50, "node": { "kind": "drawers", "count": 2, "depth": 45 } } ] } },
                { "size": 60, "node": { "kind": "open", "shelves": 5, "led": true } } ] } },
            "materials": { "carcass": { "lib": "hpl_offwhite" }, "front": { "lib": "hpl_offwhite" }, "accent": { "lib": "wood_walnut_v" }, "shelf": { "lib": "hpl_offwhite" } } }
    },
    "wc_wardrobe": {
        "label": "حيطة مقسومة: دولاب حيطة بأدراج وتجويف",
        "group": "غرف النوم",
        "desc": "دولاب حيطة كاملة: ضلف فوق وأدراج تحت في الأطراف، وفي النص تجويف ديكور بليد وأدراج — كل خانة بتتغيّر من «قسّم الحيطة».",
        "params": { "template": "wall_comp", "width": 300, "height": 260, "handle": "bar",
            "wc": { "depth": 58, "root": { "dir": "v", "parts": [
                { "size": 100, "node": { "dir": "h", "parts": [ { "size": null, "node": { "kind": "doors", "count": 2, "shelves": 3 } }, { "size": 70, "node": { "kind": "drawers", "count": 3 } } ] } },
                { "size": null, "node": { "dir": "h", "parts": [ { "size": 60, "node": { "kind": "doors", "count": 1, "shelves": 0 } }, { "size": null, "node": { "kind": "niche", "shelves": 1, "led": true, "depth": 35 } }, { "size": 70, "node": { "kind": "drawers", "count": 3 } } ] } },
                { "size": 100, "node": { "dir": "h", "parts": [ { "size": null, "node": { "kind": "doors", "count": 2, "shelves": 3 } }, { "size": 70, "node": { "kind": "drawers", "count": 3 } } ] } } ] } },
            "materials": { "carcass": { "lib": "hpl_offwhite" }, "front": { "lib": "hpl_offwhite" }, "accent": { "lib": "wood_oak_natural_v" }, "shelf": { "lib": "hpl_offwhite" } } }
    },
    "wc_study": {
        "label": "حيطة مقسومة: مكتبة ومكتب",
        "group": "غرف النوم",
        "desc": "مكتبة حيطة: أرفف مفتوحة فوق، ضلف تحت، وفي النص مكان مكتب فاضي فوقه تجويف بليد — قسّمها على مقاس الأوضة.",
        "params": { "template": "wall_comp", "width": 280, "height": 240, "handle": "push",
            "wc": { "depth": 35, "root": { "dir": "v", "parts": [
                { "size": 80, "node": { "dir": "h", "parts": [ { "size": null, "node": { "kind": "open", "shelves": 3 } }, { "size": 80, "node": { "kind": "doors", "count": 2, "shelves": 1 } } ] } },
                { "size": null, "node": { "dir": "h", "parts": [ { "size": 40, "node": { "kind": "doors", "count": 2, "shelves": 0 } }, { "size": 60, "node": { "kind": "niche", "led": true, "depth": 25 } }, { "size": null, "node": { "kind": "empty" } } ] } },
                { "size": 80, "node": { "dir": "h", "parts": [ { "size": null, "node": { "kind": "open", "shelves": 3 } }, { "size": 80, "node": { "kind": "doors", "count": 2, "shelves": 1 } } ] } } ] } },
            "materials": { "carcass": { "lib": "hpl_offwhite" }, "front": { "lib": "hpl_greige" }, "accent": { "lib": "wood_oak_natural_v" }, "shelf": { "lib": "hpl_offwhite" } } }
    },
    "wc_closet_hang": {
        "label": "حيطة مقسومة: دولاب هدوم بشماعات وجرار",
        "group": "غرف النوم",
        "desc": "دولاب هدوم حيطة: شماعة طويلة شمال، شماعتين فوق بعض يمين، وفي النص أدراج + ضلف زجاج بفريم — كله بيتغيّر من «قسّم الحيطة».",
        "params": { "template": "wall_comp", "width": 300, "height": 250, "handle": "bar",
            "wc": { "depth": 60, "module_max": 90, "root": { "dir": "v", "parts": [
                { "size": 90, "node": { "kind": "wardrobe", "rods": 1, "count": 2 } },
                { "size": null, "node": { "kind": "combo", "dcount": 3, "dh": 60, "count": 2, "shelves": 2, "glass": true } },
                { "size": 90, "node": { "kind": "wardrobe", "rods": 2, "count": 2 } } ] } },
            "materials": { "carcass": { "lib": "hpl_offwhite" }, "front": { "lib": "hpl_greige" }, "accent": { "lib": "wood_oak_natural_v" }, "shelf": { "lib": "hpl_offwhite" } } }
    },
    "wc_tv_niche": {
        "label": "حيطة مقسومة: تكسية بتجويف + فاترينتين",
        "group": "الريسبشن",
        "desc": "تكسية مصمتة خشب في النص بتجويف ليد فوق الشاشة، يمين وشمال فاترينتين ضلف زجاج فوق أدراج.",
        "params": { "template": "wall_comp", "width": 380, "height": 260, "handle": "push",
            "wc": { "depth": 40, "root": { "dir": "v", "parts": [
                { "size": 70, "node": { "kind": "combo", "dcount": 2, "dh": 45, "count": 1, "hinge": "left", "shelves": 3, "glass": true } },
                { "size": null, "node": { "dir": "h", "parts": [ { "size": null, "node": { "kind": "solid", "depth": 25, "hole": { "w": 150, "h": 35, "x": "center", "z": 205, "shelves": 0, "led": true } } }, { "size": 45, "node": { "kind": "drawers", "count": 2 } } ] } },
                { "size": 70, "node": { "kind": "combo", "dcount": 2, "dh": 45, "count": 1, "hinge": "right", "shelves": 3, "glass": true } } ] } },
            "materials": { "carcass": { "lib": "hpl_offwhite" }, "front": { "lib": "hpl_offwhite" }, "accent": { "lib": "wood_walnut_v" }, "shelf": { "lib": "hpl_offwhite" } } }
    },
    "tvw_slats_two_niches": {
        "label": "وحدة شاشة: دولابين مفتوحين + وحدة مصمتة سادة",
        "group": "الريسبشن",
        "desc": "نفس الفكرة من غير تجويف: وحدة مصمتة أوك بارتفاع الدواليب بين دولابين أرفف بليد.",
        "params": { "template": "tv_wall", "handle": "push",
            "tvw": { "left": { "on": true, "width": 60, "height": 240, "depth": 35, "z": 0, "fronts": [ { "type": "open", "count": 1, "height": "auto", "shelves": 5, "led": true } ] }, "right": { "on": true, "width": 60, "height": 240, "depth": 35, "z": 0, "fronts": [ { "type": "open", "count": 1, "height": "auto", "shelves": 5, "led": true } ] }, "mid": { "width": 200, "low": false },
                "clad": { "on": true, "match": true, "z0": 0, "depth": 30, "mat": "accent", "style": "flat", "led": false },
                "niches": [] },
            "materials": { "carcass": { "lib": "hpl_offwhite" }, "front": { "lib": "hpl_offwhite" }, "accent": { "lib": "wood_oak_natural_v" }, "shelf": { "lib": "hpl_offwhite" } } }
    },
    "tvw_floating": {
        "label": "وحدة شاشة: دولاب واحد + وحدة مصمتة بتجويف طويل",
        "group": "الريسبشن",
        "desc": "دولاب أرفف مفتوح بليد على الشمال بس، وجنبه وحدة مصمتة بارتفاعه فيها تجويف طويل بليد.",
        "params": { "template": "tv_wall", "handle": "push",
            "tvw": { "left": { "on": true, "width": 70, "height": 240, "depth": 35, "z": 0, "fronts": [ { "type": "open", "count": 1, "height": "auto", "shelves": 5, "led": true } ] }, "right": { "on": false, "width": 60, "height": 240, "depth": 35, "z": 0, "fronts": [ { "type": "open", "count": 1, "height": "auto", "shelves": 5, "led": true } ] }, "mid": { "width": 220, "low": false },
                "clad": { "on": true, "match": true, "z0": 0, "depth": 30, "mat": "accent", "style": "flat", "led": false },
                "niches": [ { "on": true, "x": "center", "z": 35, "w": 180, "h": 30, "depth": 25, "shelves": 0, "led": true, "lining": "carcass", "back": "carcass" } ] },
            "materials": { "carcass": { "lib": "hpl_anthracite" }, "front": { "lib": "hpl_anthracite" }, "accent": { "lib": "hpl_greige" }, "shelf": { "lib": "wood_oak_natural_v" } } }
    }
};
export const get = (key) => (Object.prototype.hasOwnProperty.call(LIST, key) ? LIST[key] : undefined);
export function paramsFor(key) {
    const pr = get(key);
    return pr ? { ...deepDup(pr.params), preset: key } : null;
}
