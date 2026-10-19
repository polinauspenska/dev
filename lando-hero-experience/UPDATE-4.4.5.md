# 4.4.5 — approved dark-background contour motion

Adds faint gray moving contour lines behind the shrinking image, signature and marquee. The canvas is transparent: the existing solid dark background colour and opacity are untouched. Uses the same contour equations and speed as the approved preview. Other hero animation and responsive geometry remain unchanged from 4.4.4.

Motion runs only while the hero is onscreen, scrolled and the document visible. Reduced-motion preference shows static lines. No new external library or video asset is loaded.

Install as replacement for the existing plugin, retain [ln_hero] and clear the site cache. Keep existing Additional CSS. JavaScript syntax, existing animation logic regressions and archive comparison were checked. Physical-device rendering has not been verified here.
