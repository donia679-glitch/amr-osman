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
            "label": "ترابيزة جانبية C ألواح متداخلة",
            "group": "ترابيزات كتل",
            "desc": "قاعدة وسطح جوز، وفي النص 3 ألواح واقفة متزحزحة عن بعض (جوز / رمادي / أبيض) — 45×35×55.",
            "params": {
                "template": "blocks",
                "width": 45,
                "depth": 35,
                "height": 55,
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
                        "h": "T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "لوح واقف جوز",
                        "x": "W-14-T",
                        "y": 0,
                        "z": "T",
                        "w": "T",
                        "d": "D",
                        "h": "H-2*T",
                        "mat": "accent"
                    },
                    {
                        "k": "slab",
                        "name": "لوح واقف رمادي",
                        "x": "W-14",
                        "y": 4,
                        "z": "T",
                        "w": "T",
                        "d": "D-4",
                        "h": "H-2*T",
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "لوح واقف أبيض",
                        "x": "W-14+T",
                        "y": 8,
                        "z": "T",
                        "w": "T",
                        "d": "D-8",
                        "h": "H-2*T",
                        "mat": "shelf"
                    },
                    {
                        "k": "slab",
                        "name": "سطح",
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
                    "accent": {
                        "lib": "wood_oak_light_v"
                    },
                    "carcass": {
                        "lib": "hpl_grey"
                    },
                    "shelf": {
                        "lib": "hpl_white"
                    }
                }
            }
        },
        "blk_coffee_glass_walnut": {
            "label": "انتريه زجاج على صندوق رمادي بجوانب جوز",
            "group": "ترابيزات كتل",
            "desc": "صندوق رمادي مفتوح من قدام برف، لوحين جوز واقفين من الناحيتين، وسطح زجاج 10 مم — 120×60×42.",
            "params": {
                "template": "blocks",
                "width": 120,
                "depth": 60,
                "height": 42,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "الصندوق",
                        "x": 14,
                        "y": 4,
                        "z": 0,
                        "w": "W-28",
                        "d": "D-8",
                        "h": "H-12",
                        "faces": [
                            "top",
                            "bottom",
                            "back"
                        ],
                        "shelves": 1,
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "جنب جوز شمال",
                        "x": 6,
                        "y": 0,
                        "z": 0,
                        "w": 3.6,
                        "d": "D",
                        "h": "H-1",
                        "mat": "accent",
                        "t": 3.6
                    },
                    {
                        "k": "slab",
                        "name": "جنب جوز يمين",
                        "x": "W-6-3.6",
                        "y": 0,
                        "z": 0,
                        "w": 3.6,
                        "d": "D",
                        "h": "H-1",
                        "mat": "accent",
                        "t": 3.6
                    },
                    {
                        "k": "glass",
                        "name": "سطح زجاج",
                        "x": 0,
                        "y": 0,
                        "z": "H-1",
                        "w": "W",
                        "d": "D",
                        "h": 1,
                        "t": 1
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_grey"
                    },
                    "accent": {
                        "lib": "wood_walnut_v"
                    }
                }
            }
        },
        "blk_coffee_nested": {
            "label": "انتريه صندوق جوه صندوق",
            "group": "ترابيزات كتل",
            "desc": "صندوق بلوط مفتوح من قدام واليمين، وجواه صندوق أبيض بدرج طالع من الجنب — 120×60×38.",
            "params": {
                "template": "blocks",
                "width": 120,
                "depth": 60,
                "height": 38,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "الصندوق الخارجي",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": "W-22",
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
                        "name": "الصندوق الداخلي",
                        "x": 52,
                        "y": 3,
                        "z": "T+2",
                        "w": "W-52",
                        "d": "D-6",
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
            "label": "كومودينو كتلة بدرج وسطح جوز",
            "group": "ترابيزات كتل",
            "desc": "صندوق أبيض: درج تحت وفتحة مفتوحة فوقه، وسطح جوز 3.6 سم بارز — 50×40×45.",
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
                        "h": "H-3.6",
                        "faces": [
                            "left",
                            "right",
                            "bottom",
                            "back",
                            "top"
                        ],
                        "drawer_h": 18,
                        "mat": "carcass",
                        "front_mat": "front",
                        "handle": "none"
                    },
                    {
                        "k": "slab",
                        "name": "سطح جوز",
                        "x": -1,
                        "y": -1,
                        "z": "H-3.6",
                        "w": "W+2",
                        "d": "D+1",
                        "h": 3.6,
                        "mat": "accent",
                        "t": 3.6
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
            "label": "انتريه سطح جوز طافي على صندوق غامق",
            "group": "ترابيزات كتل",
            "desc": "صندوق أنثراسايت مفتوح من اليمين وقدام برف، سطح جوز 3.6 سم مزحزح لليمين ومحمول على كتلة صغيرة — 120×60×40.",
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
                        "y": 6,
                        "z": 0,
                        "w": "W-30",
                        "d": "D-6",
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
                        "k": "box",
                        "name": "كتلة الحمل",
                        "x": "W-14",
                        "y": 12,
                        "z": 0,
                        "w": 14,
                        "d": "D-24",
                        "h": "H-3.6",
                        "faces": [
                            "left",
                            "right",
                            "top",
                            "bottom"
                        ],
                        "mat": "carcass"
                    },
                    {
                        "k": "slab",
                        "name": "سطح جوز",
                        "x": 22,
                        "y": 0,
                        "z": "H-3.6",
                        "w": "W-22",
                        "d": "D-4",
                        "h": 3.6,
                        "mat": "accent",
                        "t": 3.6
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
            "label": "انتريه سطح جوز مرفوع على قاعدة",
            "group": "ترابيزات كتل",
            "desc": "كتلة مقفولة رمادي فاتح، وفوقها سطح جوز 3.6 سم مرفوع 3.6 سم على كعبين مخفيين — 130×60×32.",
            "params": {
                "template": "blocks",
                "width": 130,
                "depth": 60,
                "height": 32,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "القاعدة",
                        "x": 12,
                        "y": 6,
                        "z": 0,
                        "w": "W-24",
                        "d": "D-12",
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
                    {"k": "slab", "name": "كعب شمال", "x": 24, "y": 16, "z": "H-7.2", "w": 12, "d": "D-32", "h": 3.6, "t": 3.6, "mat": "carcass"},
                    {"k": "slab", "name": "كعب يمين", "x": "W-36", "y": 16, "z": "H-7.2", "w": 12, "d": "D-32", "h": 3.6, "t": 3.6, "mat": "carcass"},
                    {
                        "k": "slab",
                        "name": "سطح جوز",
                        "x": 0,
                        "y": 0,
                        "z": "H-3.6",
                        "w": "W",
                        "d": "D",
                        "h": 3.6,
                        "mat": "accent",
                        "t": 3.6
                    }
                ],
                "materials": {
                    "carcass": {
                        "lib": "hpl_light_grey"
                    },
                    "accent": {
                        "lib": "wood_walnut"
                    }
                }
            }
        },
        "blk_tv_stepped": {
            "label": "وحدة شاشة كتل متدرجة",
            "group": "ترابيزات كتل",
            "desc": "صندوق بلوط طويل مفتوح بقاطوع، وجنبه صندوق أبيض بدرج أعلى منه، ورف بلوط طافي بيربطهم — 180×40×45.",
            "params": {
                "template": "blocks",
                "width": 180,
                "depth": 40,
                "height": 45,
                "thickness": 1.8,
                "blocks": [
                    {
                        "k": "box",
                        "name": "صندوق بلوط",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": 110,
                        "d": "D",
                        "h": 30,
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
                        "x": 110,
                        "y": 2,
                        "z": 8,
                        "w": "W-110",
                        "d": "D-4",
                        "h": "H-8-T-2",
                        "mat": "carcass",
                        "front_mat": "front",
                        "handle": "none"
                    },
                    {
                        "k": "slab",
                        "name": "رف بلوط طافي",
                        "x": 70,
                        "y": 0,
                        "z": "H-T",
                        "w": "W-70",
                        "d": "D",
                        "h": "T",
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
            "desc": "صندوق بلوط 200 سم مفتوح من قدام بقاطوع، وجواه من اليمين صندوق أبيض بدرج — 200×40×40.",
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
                        "x": "W/2+T+3",
                        "y": 2,
                        "z": "T+5",
                        "w": "W/2-2*T-6",
                        "d": "D-5",
                        "h": "H-2*T-10",
                        "mat": "carcass",
                        "front_mat": "front",
                        "handle": "none"
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
            "desc": "مكعب 45 سم مفتوح من قدام واليمين — فتحة مجلات، سطح بلوط — 45×45×50.",
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
                        "name": "رف داخلي",
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
            "desc": "كومودينو يتعلّق على الحيطة: درج تحت وفتحة مفتوحة فوقه — 50×35×32 (ارفعه من «من الأرض»).",
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
            "desc": "حرف L أبيض (جنب + قاعدة) وحرف L جوز (سطح + جنب) داخلين في بعض — 120×60×40.",
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
                        "h": "H-T",
                        "faces": [
                            "left",
                            "bottom"
                        ],
                        "mat": "carcass"
                    },
                    {
                        "k": "box",
                        "name": "L جوز",
                        "x": 0,
                        "y": 0,
                        "z": "T",
                        "w": "W",
                        "d": "D",
                        "h": "H-T",
                        "faces": [
                            "right",
                            "top"
                        ],
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
            "desc": "صندوق بلوط واقف بأرفف، وسطح أبيض طويل محمول عليه وعلى لوح واقف في الطرف — 120×35×80.",
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
    }
};
export const get = (key) => (Object.prototype.hasOwnProperty.call(LIST, key) ? LIST[key] : undefined);
export function paramsFor(key) {
    const pr = get(key);
    return pr ? { ...deepDup(pr.params), preset: key } : null;
}
