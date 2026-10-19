# 4.4.10 — crisp hover boundaries

Both supplied screenshots contain the same principal RGB colours: background #FCFCFA, light gray #F5F5F0, deeper gray #E9EAE4. This update preserves those colours and replaces wide spatial blending with approximately one rendered pixel of antialiasing at the outer and inner boundaries. The deeper gray is a flat fill rather than a gradient into the light gray.

Uses standard WebGL derivatives when available; a narrow fixed threshold is the fallback. Canvas resolution now follows device pixel ratio up to 1.5, replacing the earlier mobile 0.75 scale. Motion timing, pointer trail, size, core hero.js, all responsive CSS and images are unchanged. Dark background shader opacity behaviour is preserved.

Install as replacement, retain [ln_hero] and Additional CSS, then clear caches. JavaScript/mock-runtime and archive checks passed; shader appearance, real-device frame rate and WordPress runtime are not verified here. Higher canvas resolution can increase GPU cost on older devices.
