Promo video (2026-10-07): capture.py (app screens + 24 orbit keyframes, serve dist/pwa on 8795), capj.py (joint card at 2x),
ffmpeg minterpolate orbit → orbit_i (3 fps → 25 fps), stage.html + script.js (time-driven scenes, ?v=1 = 9:16; serve this folder on 8797),
render.py h|v 25 [from] [to] → frames_*, music.py (timeline.json) → music.wav, then ffmpeg x264 crf 18 + aac + loudnorm -16.
Fonts: copy tools/vendor_assets/gfonts/ofl/ibmplexsansarabic/*.ttf to fonts/.
