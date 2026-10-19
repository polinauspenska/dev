# 4.4.9 — larger, fuller hover

The liquid radius increases from 72 to 96 reference units (33%). The two sampled gray colours are preserved, with a larger visible deeper-gray area and less transparent boundary. Hover no longer fades after 1.1 seconds without pointer movement: it stays fully visible while hovered, then fades on leaving.

Pointer damping is reduced to 115ms for less trailing lag. Shape deformation is slower and fine lines now follow each animation frame. The shader bypasses expensive wake calculations outside its bounding box and uses a lower resolution for mobile fills. No promise of device frame rate is made.

All CSS, hero.js, responsive sizing, assets, signature and layout are unchanged from 4.4.8. Upload as replacement and clear caches. Keep existing Additional CSS and [ln_hero].

Validation: JS syntax, mocked flow runtime including stationary-hover persistence and fade after leave, existing core hero logic regressions, archive comparison. Shader/GPU rendering and actual device smoothness are not verified in this environment.
