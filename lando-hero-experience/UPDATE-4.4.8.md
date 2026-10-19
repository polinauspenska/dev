# 4.4.8 — softer two-tone gray hover

Reference PNG sampled colours: #FCFCFA background; #F5F5F0 lighter fill; #E9EAE4 deeper fill; #E7E7DD fine lines. The white shader now blends these two fills by liquid density instead of applying a single dark tint. Edges stay soft and the grey layers fade with hover energy.

The liquid renders every animation frame instead of a 30fps gate. Fine lines retain a 30fps budget and filled shapes use lower raster resolution to limit GPU cost. Pointer damping and fading are smoother; restarting a faded hover does not repeatedly reset the trail. Offscreen pausing and reduced motion are retained.

Portrait/helmet assets, core scroll logic, signature, layout and responsive CSS are unchanged except the white background colour. The dark stage colour remains unchanged.

Install by replacing the existing LN Hero Experience plugin; keep [ln_hero] and Additional CSS; purge cache. Syntax, simulated logic and ZIP change checks performed. Actual device frame rate and visual output still need checking on the installed site; no guaranteed FPS claim is made.
