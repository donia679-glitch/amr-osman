// NOVERA Kitchen Studio — promo script. Each problem scene: the problem alone (pdur s), then the answer with the real screen.
window.SCRIPT = {
  labels: { problem: "المشكلة", solution: "الحل في NOVERA Kitchen Studio" },
  scenes: [
    { kind: "hook", dur: 6, clear: 3.6, lines: [
      { at: .2, text: "مطبخ واحد." },
      { at: 1.0, text: "246 قطعة.", cls: "brass" },
      { at: 1.8, text: "وكل قطعة ممكن تغلط في مكان.", size: 70 },
    ], after: "إلا لو الشغل كله ماشي في مكان واحد." },

    { kind: "problem", n: "1 من 6", dur: 11, pdur: 3,
      problem: "المقاسات على ورقة…<br>والورقة بتضيع.",
      title: "ارفع المقاسات صح من أول مرة",
      bullets: ["شاشة رفع مقاسات خطوة بخطوة في الموقع", "أو امسح الأوضة بكاميرا الآيباد", "الأبواب والشبابيك ونقط الكهربا والمية بارتفاعاتها"],
      media: [{ src: "cap/room.png", focus: [[0, 0, 1366], [330, 70, 1000]] }] },

    { kind: "problem", n: "2 من 6", dur: 11, pdur: 3, full: true,
      problem: "العميل مش قادر<br>يتخيّل المطبخ.",
      title: "يشوفه 3D قبل ما يتقص لوح",
      bullets: ["بخاماته وألوانه الحقيقية", "رندر واقعي وعرض للعميل", "ويحطه في أوضته بالـAR"],
      media: [{ seq: "orbit_i/o%03d.jpg", count: 184 }] },

    { kind: "problem", n: "3 من 6", dur: 11, pdur: 3,
      problem: "الهالك بياكل المكسب.",
      title: "خطة قص بأقل هالك",
      bullets: ["كل لوح وقطعه بالمقاس وترتيب القص", "رقم ثابت لكل قطعة على الملصق", "البواقي بتتسجل في المخزن"],
      media: [{ src: "cap/cut.png", focus: [[0, 0, 1366], [30, 470, 720]] }] },

    { kind: "problem", n: "4 من 6", dur: 11, pdur: 3,
      problem: "العامل مش بيقرا<br>الرسمة.",
      title: "وضع العمال",
      bullets: ["صورة القطعة وأرقام كبيرة", "بيقول المقاس بصوت بالمصري", "QR على كل ملصق يفتح قطعته"],
      media: [{ src: "cap/worker.png", focus: [[0, 0, 1366], [700, 90, 666]] }] },

    { kind: "problem", n: "5 من 6", dur: 10, pdur: 3,
      problem: "التجميع بالتخمين…<br>والخرم بييجي غلط.",
      title: "دليل تجميع مصوّر",
      bullets: ["كل خرم أليتا مكانه ومقاسه", "ترتيب التجميع خطوة بخطوة", "كتيّب PDF للورشة"],
      media: [{ src: "cap/jcard2.png", iw: 614, ih: 1430, ratio: 1.93, phone: true, focus: [[0, 240, 614], [0, 240, 614]] }] },

    { kind: "problem", n: "6 من 6", dur: 10, pdur: 3,
      problem: "السعر بالتخمين.",
      title: "سعر من الخامة الحقيقية",
      bullets: ["مسطح كل خامة × سعر لوحها", "الهاردوير والمصنعية والنقل وهامش ربحك", "عرض سعر PDF بتوقيع العميل"],
      media: [{ src: "cap/price.png", focus: [[0, 0, 1366], [600, 170, 766]] }] },

    { kind: "finale", dur: 10,
      grid: ["cap/room.png", "cap/design.png", "cap/cut.png", "cap/worker.png", "cap/parts.png", "cap/price.png"],
      line: "كل ده… في تطبيق واحد.",
      sub: "للآيباد والآيفون — بيشتغل من غير نت",
      soon: "Coming soon on the",
      trial: "جرّب 3 أيام مجاناً",
      made: "اتعمل في مصنع NOVERA — للمصانع والورش" },
  ],
};
