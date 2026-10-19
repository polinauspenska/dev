(() => {
  'use strict';

  const root = document.querySelector('.ln-hero');
  const stage = root && root.querySelector('.ln-hero__stage');
  const wrap = root && root.querySelector('.ln-hero__person-wrap');
  const canvas = root && root.querySelector('.ln-three-helmet');
  if (!root || !stage || !wrap || !canvas || !window.THREE) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(15, 1, 0.01, 100);
  camera.position.set(0, 0, 3);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x34372f, 1.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-2.5, 3.5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfff00, 0.75);
  rim.position.set(3, 1, -2);
  scene.add(rim);

  const textureLoader = new THREE.TextureLoader();
  const texture = (url, color = false) => {
    const map = textureLoader.load(url);
    map.flipY = false;
    if (color) map.encoding = THREE.sRGBEncoding;
    return map;
  };
  const maps = {
    color: texture(canvas.dataset.basecolor, true),
    normal: texture(canvas.dataset.normal),
    roughness: texture(canvas.dataset.roughness),
    metalness: texture(canvas.dataset.metallic)
  };
  const head = new THREE.Object3D();

  const draco = new THREE.DRACOLoader();
  draco.setDecoderPath(canvas.dataset.draco);
  draco.setDecoderConfig({ type: 'wasm' });
  draco.preload();
  const loader = new THREE.GLTFLoader();
  loader.setDRACOLoader(draco);

  const revealUniforms = {
    uTrail: { value: Array.from({ length: 6 }, () => new THREE.Vector2(-500, -500)) },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uFullReveal: { value: 0 },
    uPace: { value: 0 }
  };

  function addLiquidReveal(material) {
    material.transparent = true;
    material.depthWrite = false;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, revealUniforms);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        uniform vec2 uTrail[6];
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uFullReveal;
        uniform float uPace;
        float lnHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
        float lnNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(lnHash(i),lnHash(i+vec2(1.,0.)),f.x),mix(lnHash(i+vec2(0.,1.)),lnHash(i+vec2(1.,1.)),f.x),f.y);}
      `);
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `vec2 lnFrag=gl_FragCoord.xy;float lnMask=0.0;float lnN=lnNoise(lnFrag/uResolution.y*8.5+vec2(uTime*.11,-uTime*.08));
        for(int lnI=0;lnI<6;lnI++){float lnR=(48.0-float(lnI)*3.5)+lnN*19.0+uPace*12.0;vec2 lnD=lnFrag-uTrail[lnI];lnD.x*=.76;float lnBlob=1.0-smoothstep(lnR*.40,lnR,length(lnD));lnMask=max(lnMask,lnBlob);}
        lnMask=smoothstep(.23,.74,lnMask+lnN*.13);lnMask=max(lnMask,uFullReveal);
        if(lnMask<.035)discard;gl_FragColor=vec4(outgoingLight,diffuseColor.a*lnMask);`
      );
    };
    material.customProgramCacheKey = () => 'ln-liquid-reveal-v13';
  }

  let helmet = null;
  let pointer = { x: 0, y: -0.35 };
  let eased = { x: 0, y: -0.35 };
  let previous = { x: 0, y: -0.35 };
  let speed = 0;
  let lastMove = 0;
  let fullReveal = false;
  let firstFrameSent = false;
  let maskTick = 0;
  const trail = Array.from({ length: 9 }, () => ({ x: 50, y: -15 }));

  loader.load(canvas.dataset.model, (gltf) => {
    helmet = gltf.scene;
    helmet.traverse((object) => {
      if (!object.isMesh) return;
      const name = (object.name || '').toLowerCase();
      if (name.includes('glass')) {
        object.material = new THREE.MeshPhysicalMaterial({
          color: 0x080909, roughness: 0.12, metalness: 0.35,
          transparent: true, opacity: 0.92, side: THREE.DoubleSide
        });
      } else if (name.includes('plastic')) {
        object.material = new THREE.MeshStandardMaterial({ color: 0x090a09, roughness: 0.32, metalness: 0.18 });
      } else {
        object.material = new THREE.MeshStandardMaterial({
          map: maps.color, normalMap: maps.normal,
          roughnessMap: maps.roughness, metalnessMap: maps.metalness,
          roughness: 0.22, metalness: 0.32
        });
      }
      object.material.needsUpdate = true;
    });
    helmet.scale.set(4.25, 4.25, 4.38);
    helmet.position.y = .04;
    scene.add(helmet);
    root.classList.add('ln-three-ready');
    resize();
    requestAnimationFrame(render);
  }, undefined, () => {
    root.classList.remove('ln-three-ready');
  });

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.25);
    renderer.setPixelRatio(ratio);
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(0.1, rect.width / Math.max(1, rect.height));
    camera.updateProjectionMatrix();
    revealUniforms.uResolution.value.set(rect.width * ratio, rect.height * ratio);
  }

  function setPointer(event) {
    const rect = wrap.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    lastMove = performance.now();
  }
  stage.addEventListener('pointermove', setPointer, { passive: true });
  stage.addEventListener('pointerleave', () => { lastMove = 0; });
  addEventListener('resize', resize, { passive: true });

  root.querySelectorAll('[data-ln-state="helmet"]').forEach((button) => {
    button.addEventListener('pointerenter', () => { fullReveal = true; });
    button.addEventListener('focus', () => { fullReveal = true; });
    button.addEventListener('pointerleave', () => { fullReveal = false; });
    button.addEventListener('blur', () => { fullReveal = false; });
  });

  function updateMask(now) {
    const idle = !lastMove || now - lastMove > 1500;
    if (idle) {
      const cycle = (now * 0.00019) % 1.25;
      pointer.x = Math.sin(now * 0.00075) * 0.26;
      pointer.y = 1.2 - cycle * 2.25;
    }
    const dx = pointer.x - previous.x;
    const dy = pointer.y - previous.y;
    speed += (Math.min(1, Math.hypot(dx, dy) * 5) - speed) * 0.18;
    previous.x = pointer.x;
    previous.y = pointer.y;
    eased.x += (pointer.x - eased.x) * 0.16;
    eased.y += (pointer.y - eased.y) * 0.16;
    const x = (eased.x * 0.5 + 0.5) * 100;
    const y = (-eased.y * 0.5 + 0.5) * 100;
    trail[0].x += (x - trail[0].x) * 0.34;
    trail[0].y += (y - trail[0].y) * 0.34;
    for (let i = 1; i < trail.length; i += 1) {
      trail[i].x += (trail[i - 1].x - trail[i].x) * (0.43 - i * 0.018);
      trail[i].y += (trail[i - 1].y - trail[i].y) * (0.43 - i * 0.018);
    }
    const ratio = renderer.getPixelRatio();
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    for (let i = 0; i < revealUniforms.uTrail.value.length; i += 1) {
      const point = trail[Math.min(i, trail.length - 1)];
      revealUniforms.uTrail.value[i].set(point.x * .01 * width * ratio, (100 - point.y) * .01 * height * ratio);
    }
    revealUniforms.uTime.value = now * .001;
    revealUniforms.uPace.value = speed;
    revealUniforms.uFullReveal.value += (((fullReveal || reduced) ? 1 : 0) - revealUniforms.uFullReveal.value) * .075;
    maskTick += 1;
    if (maskTick % 2 !== 0) return;
    if (fullReveal || reduced) {
      canvas.style.webkitMaskImage = 'linear-gradient(#000,#000)';
      canvas.style.maskImage = 'linear-gradient(#000,#000)';
      return;
    }
    const masks = trail.slice(0, 5).map((point, index) => {
      const radius = Math.max(34, 58 - index * 5);
      return `radial-gradient(ellipse ${radius}px ${radius * .78}px at ${point.x}% ${point.y}%,#000 0 44%,rgba(0,0,0,.92) 59%,rgba(0,0,0,.28) 78%,transparent 100%)`;
    }).join(',');
    canvas.style.webkitMaskImage = masks;
    canvas.style.maskImage = masks;
  }

  function render(now) {
    if (!helmet) return;
    updateMask(now);
    head.rotation.y += ((eased.x * .075) - head.rotation.y) * .035;
    head.rotation.x += ((-eased.y * .075) - head.rotation.x) * .035;
    helmet.rotation.y = head.rotation.y / 1.5;
    helmet.rotation.x = head.rotation.x / 1.5 + Math.PI * .06;
    renderer.render(scene, camera);
    if (!firstFrameSent) {
      firstFrameSent = true;
      window.dispatchEvent(new CustomEvent('ln3dready'));
    }
    requestAnimationFrame(render);
  }
})();
