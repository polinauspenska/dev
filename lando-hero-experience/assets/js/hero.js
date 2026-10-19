(() => {
  'use strict';
  const root = document.querySelector('.ln-hero');
  if (!root) return;

  const stage = root.querySelector('.ln-hero__stage');
  const liveScene = root.querySelector('.ln-live-scene');
  const person = root.querySelector('.ln-hero__person-wrap');
  const helmet = root.querySelector('.ln-liquid-layer--helmet');
  const visor = root.querySelector('.ln-liquid-layer--visor');
  const message = root.querySelector('.ln-hero__message');
  const marquee = root.querySelector('.ln-marquee');
  const marqueeTracks = [...root.querySelectorAll('.ln-marquee__row')];
  const card = root.querySelector('.ln-scroll-card');
  const cardScene = card && card.querySelector('.ln-scroll-card__scene');
  const cardImage = cardScene && cardScene.querySelector('img');
  const signaturePaths = root.querySelectorAll('.ln-signature path');
  const headMark = root.querySelector('.ln-head-mark');
  const buttons = [...root.querySelectorAll('[data-ln-state]')];
  const loader = document.querySelector('.ln-loader');
  const loaderStarted = performance.now();
  const flowCanvas = root.querySelector('.ln-flow-canvas');
  const flowContext = flowCanvas ? flowCanvas.getContext('2d') : null;
  const contourCanvas = document.createElement('canvas');
  const contourContext = contourCanvas.getContext('2d');
  let contourFrame = 0;
  const menuToggle = root.querySelector('.ln-menu-toggle');
  const menuPanel = root.querySelector('.ln-menu-panel');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state = 'portrait';
  let resetTimer = 0;
  let ticking = false;
  let scrollProgress = 0;
  let lastScrollTime = 0;
  let lastMaskTime = 0;
  let idleTime = 0;
  let trailInitialized = false;
  let touchStart = null;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  let tracking = false;
  let maskFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  const trail = Array.from({ length: 7 }, () => ({ x: 0, y: 0 }));
  // v4.4.22: independent autonomous helmet trail. This keeps sweeping even while
  // the pointer hover trail is active, so automatic + hover reveals render together.
  const autoTrail = Array.from({ length: 7 }, () => ({ x: 0, y: 0 }));
  let autoTrailInitialized = false;
  const flowTrail = Array.from({ length: 10 }, () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
  let flowX = window.innerWidth / 2;
  let flowY = window.innerHeight / 2;
  let flowActive = false;
  let flowOpacity = 0;

  const resizeFlowCanvas = () => {
    if (!flowCanvas || !flowContext) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const rect = stage.getBoundingClientRect();
    flowCanvas.width = Math.round(rect.width * ratio);
    flowCanvas.height = Math.round(rect.height * ratio);
    flowContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    contourCanvas.width = Math.max(180, Math.round(rect.width / 5));
    contourCanvas.height = Math.max(100, Math.round(rect.height / 5));
  };

  const renderFlow = () => {
    if (flowContext && flowCanvas) {
      const rect = stage.getBoundingClientRect();
      if (!flowActive) {
        const time = performance.now() * 0.00062;
        flowX = rect.width * (0.5 + Math.sin(time * 2.1) * 0.34);
        flowY = rect.height * (0.47 + Math.cos(time * 1.55) * 0.29);
      }
      flowTrail[0].x += (flowX - flowTrail[0].x) * 0.18;
      flowTrail[0].y += (flowY - flowTrail[0].y) * 0.18;
      for (let index = 1; index < flowTrail.length; index += 1) {
        flowTrail[index].x += (flowTrail[index - 1].x - flowTrail[index].x) * 0.16;
        flowTrail[index].y += (flowTrail[index - 1].y - flowTrail[index].y) * 0.16;
      }
      flowOpacity += ((flowActive ? 1 : 0.78) - flowOpacity) * 0.07;
      flowContext.clearRect(0, 0, rect.width, rect.height);
      flowContext.save();
      flowContext.filter = 'blur(22px)';
      flowTrail.slice(0, 7).forEach((point, index) => {
        const radius = Math.max(70, Math.min(150, rect.width * .075)) * (1 - index * .055);
        const gradient = flowContext.createRadialGradient(point.x, point.y, radius * .12, point.x, point.y, radius);
        gradient.addColorStop(0, `rgba(165,168,160,${.22 * flowOpacity})`);
        gradient.addColorStop(.55, `rgba(187,190,183,${.14 * flowOpacity})`);
        gradient.addColorStop(1, 'rgba(215,216,210,0)');
        flowContext.fillStyle = gradient;
        flowContext.beginPath();
        flowContext.ellipse(point.x, point.y, radius * 1.38, radius * .72, index * .16, 0, Math.PI * 2);
        flowContext.fill();
      });
      flowContext.restore();
      flowContext.save();
      flowContext.globalAlpha = .22 * flowOpacity;
      flowContext.strokeStyle = '#777b73';
      flowContext.lineWidth = .8;
      const lead = flowTrail[0];
      for (let ring = 0; ring < 5; ring += 1) {
        const radius = 72 + ring * 28;
        flowContext.beginPath();
        for (let step = 0; step <= 52; step += 1) {
          const angle = step / 52 * Math.PI * 2;
          const wobble = Math.sin(angle * 3 + performance.now() * .0014 + ring) * 8;
          const px = lead.x + Math.cos(angle) * (radius + wobble) * 1.55;
          const py = lead.y + Math.sin(angle) * (radius + wobble) * .68;
          if (!step) flowContext.moveTo(px, py); else flowContext.lineTo(px, py);
        }
        flowContext.closePath();
        flowContext.stroke();
      }
      flowContext.restore();
    }
    window.requestAnimationFrame(renderFlow);
  };

  const reveal = (layer) => {
    if (!layer) return;
    layer.classList.add('is-showing');
  };
  const conceal = (layer) => {
    if (!layer) return;
    layer.classList.remove('is-showing', 'is-full');
  };
  const setState = (next, activeButton = null) => {
    window.clearTimeout(resetTimer);
    tracking = false;
    state = next;
    root.classList.toggle('is-dark', next === 'message');
    buttons.forEach((button) => button.classList.toggle('is-active', button === activeButton));
    conceal(helmet);
    conceal(visor);
    if (message) message.style.clipPath = 'inset(0 0 100% 0)';
    if (next === 'helmet') {
      helmet.classList.add('is-full');
      reveal(helmet);
    }
    if (next === 'visor') reveal(visor);
    if (next === 'message' && message) message.style.clipPath = 'inset(0 0 0 0)';
    if (next === 'portrait' && !maskFrame) maskFrame = window.requestAnimationFrame(renderMask);
  };
  const resetSoon = () => {
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => setState('portrait'), 180);
  };

  buttons.forEach((button) => {
    const activate = () => setState(button.dataset.lnState, button);
    button.addEventListener('pointerenter', activate);
    button.addEventListener('focus', activate);
    button.addEventListener('click', activate);
  });
  const nav = root.querySelector('.ln-state-nav');
  if (nav) {
    nav.addEventListener('pointerleave', resetSoon);
    nav.addEventListener('focusout', (event) => { if (!nav.contains(event.relatedTarget)) resetSoon(); });
  }
  const renderMask = (now = performance.now()) => {
    const dt = Math.min(40, now - (lastMaskTime || now));
    lastMaskTime = now;
    if (document.hidden || scrollProgress > .015 || menuPanel?.classList.contains('is-open')) {
      helmet.style.setProperty('--ln-helmet-opacity', '0');
      maskFrame = window.requestAnimationFrame(renderMask);
      return;
    }
    idleTime += dt;
    helmet.style.setProperty('--ln-helmet-opacity', reduced ? '0' : '1');
    if (!helmet || state === 'helmet' || state === 'visor' || state === 'message') { maskFrame = 0; return; }
    // Use the exact autonomous contour/water path for the helmet mask too.
    // This makes the helmet reveal appear *inside* the travelling grey shape,
    // rather than looking like a separate animation over the portrait.
    const autoT = idleTime * 0.001;
    const stageRect = stage.getBoundingClientRect();
    const personRect = person.getBoundingClientRect();
    const flowStageX = stageRect.width * ((480 + 325 * Math.sin(autoT * .90) + 48 * Math.sin(autoT * 1.60)) / 960);
    const flowStageY = stageRect.height * ((270 + 150 * Math.sin(autoT * 1.10) + 28 * Math.cos(autoT * 1.85)) / 540);
    const autoX = (flowStageX - (personRect.left - stageRect.left)) * person.clientWidth / personRect.width;
    const autoY = (flowStageY - (personRect.top - stageRect.top)) * person.clientHeight / personRect.height;
    if (!tracking) {
      pointerX = autoX;
      pointerY = autoY;
      helmet.classList.remove('is-full');
      helmet.classList.add('is-showing');
    }
    if (!autoTrailInitialized) {
      autoTrail.forEach(point => { point.x = autoX; point.y = autoY; });
      autoTrailInitialized = true;
    }
    const autoFollow = 1 - Math.exp(-dt / 82);
    autoTrail[0].x += (autoX - autoTrail[0].x) * autoFollow;
    autoTrail[0].y += (autoY - autoTrail[0].y) * autoFollow;
    for (let index = 1; index < autoTrail.length; index += 1) {
      autoTrail[index].x += (autoTrail[index - 1].x - autoTrail[index].x) * (0.255 - index * 0.016);
      autoTrail[index].y += (autoTrail[index - 1].y - autoTrail[index].y) * (0.255 - index * 0.016);
    }
    if (!trailInitialized) {
      trail.forEach(point => { point.x = pointerX; point.y = pointerY; });
      trailInitialized = true;
    }
    // The hover trail is separate, therefore keeping the mouse still cannot freeze
    // the autonomous helmet transition.
    const hoverTargetX = tracking ? pointerX : autoX;
    const hoverTargetY = tracking ? pointerY : autoY;
    const follow = 1 - Math.exp(-dt / 32);
    trail[0].x += (hoverTargetX - trail[0].x) * follow;
    trail[0].y += (hoverTargetY - trail[0].y) * follow;
    for (let index = 1; index < trail.length; index += 1) {
      // Frame-rate-independent damping prevents the pointer wake from hanging/stuttering.
      const trailLag = 48 + index * 7;
      const trailFollow = 1 - Math.exp(-dt / trailLag);
      trail[index].x += (trail[index - 1].x - trail[index].x) * trailFollow;
      trail[index].y += (trail[index - 1].y - trail[index].y) * trailFollow;
    }
    const base = Math.max(78, Math.min(145, window.innerWidth * 0.085));
    const autoPoints = window.innerWidth <= 1100 ? autoTrail.slice(0, 3) : autoTrail;
    const hoverPoints = window.innerWidth <= 1100 ? trail.slice(0, 3) : trail;
    const makeGradients = (points, scale = 1) => points.map((point, index) => {
      const radius = base * scale * (1 - index * 0.065);
      return `radial-gradient(circle ${radius}px at ${point.x}px ${point.y}px,#000 0 48%,rgba(0,0,0,.92) 59%,rgba(0,0,0,.38) 76%,transparent 100%)`;
    });
    // Autonomous sweep is always present; pointer reveal is layered on top only while hovering.
    const gradients = makeGradients(autoPoints, 0.96).concat(tracking ? makeGradients(hoverPoints, 1.46) : []).join(',');
    helmet.style.webkitMaskImage = gradients;
    helmet.style.maskImage = gradients;
    maskFrame = window.requestAnimationFrame(renderMask);
  };

  if (stage) stage.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || scrollProgress > .015 || menuPanel?.classList.contains('is-open')) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.max(10, Math.min(90, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(90, ((event.clientY - rect.top) / rect.height) * 100));
    flowX = event.clientX - rect.left;
    flowY = event.clientY - rect.top;
    flowActive = true;
    const fluidShapes = root.querySelectorAll('.ln-fluid-bg i');
    const dx = (x - 50) * rect.width / 100;
    const dy = (y - 50) * rect.height / 100;
    const factors = [[-.12,-.10,22],[.16,.12,-35],[-.10,.14,64],[.13,-.13,105]];
    fluidShapes.forEach((shape, index) => {
      const factor = factors[index];
      shape.style.transform = `translate(${dx * factor[0]}px,${dy * factor[1]}px) rotate(${factor[2]}deg)`;
    });
    if (!event.target.closest('.ln-state-nav,.ln-hero__nav,.ln-hero__race-card') && state !== 'message') {
      const personRect = person.getBoundingClientRect();
      pointerX = (event.clientX - personRect.left) * person.clientWidth / personRect.width;
      pointerY = (event.clientY - personRect.top) * person.clientHeight / personRect.height;
      if (!tracking) {
        tracking = true;
        state = 'tracking';
        root.classList.add('is-pointer-tracking');
        trail.forEach((point) => { point.x = pointerX; point.y = pointerY; });
        helmet.classList.remove('is-full');
        helmet.classList.add('is-showing');
        if (!maskFrame) maskFrame = window.requestAnimationFrame(renderMask);
      }
    }
    if (!reduced && window.innerWidth > 900) {
      // The reference has a restrained vertical float, not a left/right shake.
      const verticalOffset = (y - 50) * 0.13;
      if (person) {
        person.style.transition = 'margin-top .16s cubic-bezier(.22,.61,.36,1)';
        person.style.marginLeft = '0px';
        person.style.marginTop = `${verticalOffset}px`;
      }
    }
  });
  if (stage) stage.addEventListener('pointerleave', () => {
    tracking = false;
    root.classList.remove('is-pointer-tracking');
    flowActive = false;
    if (person) { person.style.marginLeft = '0px'; person.style.marginTop = '0px'; }
    conceal(helmet);
    state = 'portrait';
  });
  // A swipe must never toggle the helmet. Only a short, stationary tap does.
  if (person) {
    person.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' || scrollProgress > .015) return;
      touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: window.scrollY, time: performance.now() };
    }, { passive: true });
    person.addEventListener('pointerup', (event) => {
      const start = touchStart;
      touchStart = null;
      if (!start || start.id !== event.pointerId || scrollProgress > .015) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10 || Math.abs(window.scrollY - start.scroll) > 5 || performance.now() - start.time > 450) return;
      setState(state === 'helmet' ? 'portrait' : 'helmet');
      helmet.style.setProperty('--ln-helmet-opacity', '1');
      if (state === 'helmet') resetTimer = window.setTimeout(() => setState('portrait'), 1400);
    }, { passive: true });
    person.addEventListener('pointercancel', () => { touchStart = null; }, { passive: true });
    person.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      setState(state === 'helmet' ? 'portrait' : 'helmet');
    });
  }

  if (menuToggle && menuPanel) menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuPanel.classList.toggle('is-open', open);
    menuPanel.setAttribute('aria-hidden', String(!open));
    root.classList.toggle('is-dark', open);
  });
  if (menuPanel) menuPanel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menuPanel.classList.remove('is-open');
    menuPanel.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-dark');
  }));

  // Each stroke is one dash plus a gap longer than the path: no repeated tail.
  const signatureLengths = [...signaturePaths].map((path) => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length} ${length + 2}`;
    path.style.strokeDashoffset = String(length + 1);
    path.style.opacity = '0';
    return length;
  });
  const signature = root.querySelector('.ln-signature');
  const updateScroll = (now = performance.now()) => {
    const rect = root.getBoundingClientRect();
    const viewportWidth = stage.clientWidth;
    const viewportHeight = stage.clientHeight;
    const distance = Math.max(1, root.offsetHeight - viewportHeight);
    const target = clamp(-rect.top / distance);
    const dt = Math.min(64, now - (lastScrollTime || now - 16));
    lastScrollTime = now;
    scrollProgress += (target - scrollProgress) * (reduced ? 1 : 1 - Math.exp(-dt / 100));
    if (Math.abs(target - scrollProgress) < .00005) scrollProgress = target;
    const progress = scrollProgress;
    const compact = viewportWidth <= 1100;
    const started = target > .0001;
    root.classList.toggle('is-shrinking', started);
    root.classList.toggle('is-scroll-dark', started);
    stage.style.backgroundColor = started ? '#20271a' : '#f7f7f3';
    // Start scaling on the first scroll; no dead zone or nearly-flat quintic start.
    const phase = clamp(progress / .82);
    const eased = 1 - Math.pow(1 - phase, 3);
    // Reserve distinct rows for message heading, portrait and two marquee lines.
    const headingTop = Math.max(82, Math.min(104, viewportHeight * .10));
    const imageTop = headingTop + 86;
    const marqueeFont = Math.max(30, Math.min(58, viewportWidth * .09));
    const availableHeight = Math.max(80, viewportHeight - imageTop - 24 - (marqueeFont * 2 + 4) - 28);
    const finalWidth = compact
      ? Math.min(viewportWidth * .70, 520, availableHeight / 1.12)
      : Math.min(viewportWidth * .34, 650);
    const finalHeight = compact ? finalWidth * 1.12 : viewportHeight * finalWidth / viewportWidth;
    const scale = 1 + (finalWidth / viewportWidth - 1) * eased;
    const width = viewportWidth * scale;
    const sceneHeight = viewportHeight * scale;
    const height = viewportHeight + (finalHeight - viewportHeight) * eased;
    const lift = compact ? (viewportHeight / 2 - imageTop - finalHeight / 2) * eased : 0;
    // Crop only the lower scene: keep the original hair/head top rather than
    // stretching the person or cutting the top off with a centred crop.
    const bottomCrop = Math.max(0, (sceneHeight - height) / scale);
    const sceneLift = lift - Math.max(0, sceneHeight - height) / 2;
    root.style.setProperty('--ln-message-top', `${headingTop}px`);
    root.style.setProperty('--ln-marquee-top', `${imageTop + finalHeight + 24}px`);
    root.style.setProperty('--ln-card-width', `${width}px`);
    root.style.setProperty('--ln-card-height', `${height}px`);
    root.style.setProperty('--ln-card-lift', `${lift}px`);
    if (liveScene) {
      liveScene.style.transform = `translate(-50%,calc(-50% - ${sceneLift}px)) scale(${scale})`;
      liveScene.style.clipPath = `inset(0 0 ${bottomCrop}px 0 round ${eased * 3}px)`;
      liveScene.style.filter = `grayscale(${eased}) contrast(${1 - eased * .12}) brightness(${1 + eased * .025})`;
      liveScene.style.setProperty('--ln-live-dark', String(eased));
    }
    if (headMark) headMark.style.opacity = String(1 - clamp(progress / .055));
    root.querySelectorAll('.ln-hero__copy,.ln-state-nav,.ln-hero__race-card,.ln-hero__scroll').forEach((el) => { el.style.opacity = String(1 - clamp(progress / .16)); });
    if (marquee) marquee.style.opacity = String(clamp(progress / .17));
    root.classList.toggle('is-message-ready', progress > .24);
    if (card) {
      card.style.opacity = '1';
      card.style.width = `${width}px`;
      card.style.height = `${height}px`;
      card.style.transform = `translate(-50%,calc(-50% - ${lift}px))`;
      card.style.filter = 'none';
      if (cardScene) cardScene.style.display = 'none';
    }
    // Signature belongs to the second scroll beat: bring it in early, from the left,
    // while the hero is still transitioning rather than waiting for the final state.
    const revealProgress = clamp((progress - .14) / .22);
    const signatureEase = 1 - Math.pow(1 - revealProgress, 3);
    if (signature) {
      signature.style.setProperty('--ln-signature-visible', revealProgress > 0 ? '1' : '0');
      signature.style.opacity = revealProgress > 0 ? String(signatureEase) : '0';
      signature.style.transform = `translateX(${(-18 * (1 - signatureEase)).toFixed(3)}vw)`;
      signature.style.willChange = 'transform,opacity';
    }
    signaturePaths.forEach((path, index) => {
      const draw = reduced ? Number(revealProgress > 0) : clamp((revealProgress - index * .12) / .88);
      path.style.opacity = draw > 0 ? '1' : '0';
      path.style.strokeDashoffset = String((signatureLengths[index] + 1) * (1 - draw));
    });
    if (progress > .015) {
      touchStart = null;
      if (state !== 'portrait') setState('portrait');
      helmet.style.setProperty('--ln-helmet-opacity', '0');
    }
    ticking = Math.abs(target - scrollProgress) > .00005;
    if (ticking) window.requestAnimationFrame(updateScroll);
  };
  const requestScrollUpdate = () => {
    if (!ticking) { ticking = true; lastScrollTime = 0; window.requestAnimationFrame(updateScroll); }
  };
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', () => { requestScrollUpdate(); resizeFlowCanvas(); });
  requestScrollUpdate();
  resizeFlowCanvas();
  if (!reduced && flowContext) renderFlow();
  helmet.classList.add('is-showing');
  maskFrame = window.requestAnimationFrame(renderMask);

  let finished = false;
  const finishLoading = () => {
    if (finished) return;
    const remaining = 2300 - (performance.now() - loaderStarted);
    if (remaining > 0) {
      window.setTimeout(finishLoading, remaining);
      return;
    }
    finished = true;
    document.documentElement.style.overflow = '';
    document.body.classList.add('ln-ready');
    if (!loader) return;
    loader.style.transition = 'clip-path .8s cubic-bezier(.77,0,.18,1)';
    loader.style.clipPath = 'inset(0 0 100% 0)';
    window.setTimeout(() => loader.remove(), 900);
  };
  document.documentElement.style.overflow = 'hidden';
  let pageLoaded = document.readyState === 'complete';
  let sceneLoaded = true;
  const tryFinishLoading = () => { if (pageLoaded && sceneLoaded) window.setTimeout(finishLoading, 180); };
  if (!pageLoaded) window.addEventListener('load', () => { pageLoaded = true; tryFinishLoading(); }, { once: true });
  window.addEventListener('ln3dready', () => { sceneLoaded = true; tryFinishLoading(); }, { once: true });
  tryFinishLoading();
  window.setTimeout(finishLoading, 4000);
})();
