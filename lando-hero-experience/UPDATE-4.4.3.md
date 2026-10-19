# LN Hero Experience 4.4.3

This update addresses the centre LN logo, scroll response, signature tails and touch/automatic helmet motion. Portrait and helmet files have not been replaced.

## Install
1. Keep a backup of the current plugin ZIP and your Additional CSS.
2. In WordPress, Plugins > Add New > Upload Plugin, choose this ZIP.
3. Choose Replace current with uploaded when prompted. Keep just one LN Hero Experience plugin active.
4. Keep the existing [ln_hero] shortcode. Clear the site/page cache and reload the page.
5. Existing cosmetic button/menu CSS can remain. Remove older custom rules that set signature opacity, stroke-dasharray, stroke-dashoffset or animation; this version owns those properties. Avoid extra scripts controlling the same hero scroll.

## Changes
- The black LN image is a stage-level sibling, outside the scene being scaled. It fades out on scroll; the message heading uses the LN image as well.
- Scrolling drives a single frame-rate-independent damped progress value, starting immediately. One uniform scale drives both scene and signature bounds. Mobile uses stable small-viewport height rather than resizing every time browser chrome moves.
- Signature dash length is measured per SVG path, with a gap longer than the stroke. Paths are explicitly invisible before drawing, preventing early repeated fragments.
- Touch-down no longer toggles the helmet. Only a short stationary tap toggles it; pointer cancellation or scrolling cancels the tap.
- The automatic mask follows a continuous sine path instead of wrapping abruptly. Mobile uses three soft mask gradients rather than seven. Helmet fades out during the shrinking sequence.

## Validation and limitations
JavaScript syntax and a simulated-DOM regression harness passed at 360x640, 390x844, 768x1024, 1024x768 and 1440x900. Checks cover initial logo opacity, first-scroll scaling, signature start/middle/end/reversal, swipe vs tap, and helmet fade. These are logic tests, not rendered device tests or measured frame-rate results.
The cloud browser could not reach the local preview. No WordPress/PHP runtime or physical-device visual check was possible here. Test on iOS Safari and Android Chrome after installation, including rotation and scrolling backwards. Theme/Elementor ancestor overflow or separate injected scroll code can still interfere.
