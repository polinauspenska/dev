# Version 4.4.4 — mobile/tablet composition

Install this ZIP as a replacement for the existing LN Hero Experience plugin, keep [ln_hero], and purge page/cache assets.

The final compact portrait now has a height/width ratio of 1.12. It fits the available space below the LN message logo and above two complete marquee lines. Short screens reduce width and height together. The original live scene scales as before, with smoothly interpolated bottom clipping to remove excess shoulders; the face is not stretched and the top is not clipped. The signature follows the exact visible image bounds. Desktop geometry is unchanged.

Scoped responsive CSS also overrides the earlier marquee padding-bottom:15vh rule. No extra CSS needs pasting.

Validation: JavaScript syntax and simulated DOM geometry/state regressions. Physical mobile and WordPress visual testing are not available in this environment. Check the resulting layout after cache clearing.
