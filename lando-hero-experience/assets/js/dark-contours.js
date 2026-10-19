/* Approved background preview: slow gray contours, no background fade. */
(() => {
  'use strict';
  document.querySelectorAll('.ln-hero').forEach(root => {
    const stage = root.querySelector('.ln-hero__stage');
    if (!stage) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'ln-dark-contours';
    canvas.setAttribute('aria-hidden', 'true');
    stage.prepend(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return; }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, frame = 0, previous = 0, elapsed = 0, inView = true;
    const visible = () => inView && !document.hidden && root.classList.contains('is-shrinking');
    const groups = [[-70,60,340,195],[490,-80,310,235],[1020,330,370,260],[380,600,390,225]];
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const phase = elapsed / 1000 * Math.PI * 2 / 10;
      groups.forEach(([cx, cy, rx, ry], j) => {
        for (let ring = 0; ring < 4; ring++) {
          const radius = .51 + ring * .27;
          const shade = 52 + ((j + ring) % 3) * 4;
          ctx.strokeStyle = `rgb(${shade},${shade + 3},${shade})`;
          ctx.lineWidth = .8;
          ctx.beginPath();
          for (let step = 0; step <= 180; step++) {
            const a = step / 180 * Math.PI * 2;
            const wave = 1 + .15 * Math.sin(a * 3 + phase * .35 + j) + .075 * Math.cos(a * 5 - phase * .3 + j);
            const x = (cx + 16 * Math.sin(phase + j) + rx * radius * wave * Math.cos(a + .14 * Math.sin(phase + j))) * width / 960;
            const y = (cy + 14 * Math.cos(phase + j) + ry * radius * wave * Math.sin(a)) * height / 540;
            if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      });
    };
    const tick = now => {
      frame = 0;
      if (!visible() || motion.matches) { previous = 0; return; }
      // Cap drawing at 30fps, with time-based motion on all refresh rates.
      if (!previous || now - previous >= 32) {
        elapsed += previous ? Math.min(80, now - previous) : 0;
        previous = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; previous = 0;
      if (!visible()) return;
      draw();
      if (!motion.matches) frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      width = stage.clientWidth; height = stage.clientHeight;
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    };
    new ResizeObserver(resize).observe(stage);
    let wasShrinking = root.classList.contains('is-shrinking');
    new MutationObserver(() => {
      const shrinking = root.classList.contains('is-shrinking');
      if (shrinking !== wasShrinking) { wasShrinking = shrinking; sync(); }
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
    new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }).observe(root);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    resize(); sync();
  });
})();
