(() => {
  'use strict';
  const root = document.querySelector('.ln-hero');
  const stage = root && root.querySelector('.ln-hero__stage');
  const wrap = root && root.querySelector('.ln-hero__person-wrap');
  const canvas = root && root.querySelector('.ln-webgl-portrait');
  if (!root || !stage || !wrap || !canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return;
  const vertex = `attribute vec2 p;varying vec2 v;void main(){v=vec2((p.x+1.)*.5,1.-(p.y+1.)*.5);gl_Position=vec4(p,0.,1.);}`;
  const fragment = `precision highp float;
    varying vec2 v;uniform sampler2D baseTex,helmetTex;uniform vec2 trail[6];uniform vec2 velocity;uniform float time,aspect,pace,hoverWave;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
    float fbm(vec2 p){float n=0.;n+=noise(p)*.55;p*=2.03;n+=noise(p)*.28;p*=2.01;n+=noise(p)*.17;return n;}
    void main(){vec2 warped=v;float flow=fbm(v*5.5+velocity*1.8+vec2(time*.08,-time*.055));warped+=(flow-.5)*velocity*.28;
      vec4 a=texture2D(baseTex,v),b=texture2D(helmetTex,warped);float m=0.;float n=fbm(v*7.+velocity*2.4+vec2(time*.13,-time*.09));
      for(int i=0;i<6;i++){vec2 d=v-trail[i];d.x*=aspect;float along=dot(d,normalize(velocity+vec2(.0001)));d-=normalize(velocity+vec2(.0001))*along*.42;float r=.105-float(i)*.006+n*.052+pace*.025;float blob=1.-smoothstep(r*.48,r,length(d));m=max(m,blob);}
      float wave=v.y+sin(v.x*3.141592)*sin(hoverWave*3.141592)*.20;
      m=max(m,step(1.-wave,hoverWave));m=smoothstep(.13,.78,m+fbm(v*18.-time*.16)*.20);
      vec4 c=mix(a,b,m*b.a);c.rgb-=smoothstep(.48,.64,m)*(1.-smoothstep(.64,.82,m))*.08;c.a=max(a.a,b.a*m);gl_FragColor=c;}`;
  const shader = (type, source) => { const item = gl.createShader(type); gl.shaderSource(item, source); gl.compileShader(item); return item; };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const makeTexture = (image, unit, uniform) => { const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.uniform1i(gl.getUniformLocation(program,uniform),unit); };
  const load = (src) => new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.crossOrigin='anonymous';image.src=src;});
  Promise.all([load(canvas.dataset.base),load(canvas.dataset.helmet)]).then(([base,helmet])=>{
    makeTexture(base,0,'baseTex');makeTexture(helmet,1,'helmetTex');root.classList.add('ln-webgl-ready');start();
  }).catch(()=>{});

  const points = Array.from({length:6},()=>({x:.5,y:-.2}));
  let target={x:.5,y:-.2},hoverTarget={x:.5,y:-.2},previous={x:.5,y:-.2},velocity={x:0,y:0},lastMove=0,locked=false,wave=0,waveTarget=0;
  const resize=()=>{const rect=wrap.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));gl.viewport(0,0,canvas.width,canvas.height);};
  stage.addEventListener('pointermove',(event)=>{const rect=wrap.getBoundingClientRect();hoverTarget.x=(event.clientX-rect.left)/rect.width;hoverTarget.y=(event.clientY-rect.top)/rect.height;lastMove=performance.now();});
  stage.addEventListener('pointerenter',()=>{waveTarget=1;});
  stage.addEventListener('pointerleave',()=>{waveTarget=0;});
  stage.addEventListener('pointerdown',(event)=>{if(!event.target.closest('.ln-state-nav,.ln-hero__nav'))locked=!locked;});
  addEventListener('resize',resize,{passive:true});
  function start(){resize();requestAnimationFrame(draw);}
  function draw(now){const idle=!locked&&now-lastMove>1200;const cycle=(now*.00022)%1.35;
    if(idle){target.x=.5+Math.sin(now*.0011)*.13;target.y=cycle*1.42-.2;waveTarget=.18+.12*Math.sin(now*.0007);}
    else{
      // Mouse hover and automatic helmet motion run in parallel instead of one pausing the other.
      target.x=hoverTarget.x+Math.sin(now*.00135)*.055+Math.sin(now*.00225)*.018;
      target.y=hoverTarget.y+Math.sin(now*.00105)*.045+Math.cos(now*.00185)*.014;
      waveTarget=.88+.12*Math.sin(now*.0011);
    }
    velocity.x+=(target.x-previous.x-velocity.x)*.24;velocity.y+=(target.y-previous.y-velocity.y)*.24;previous.x=target.x;previous.y=target.y;wave+=(waveTarget-wave)*(waveTarget>wave?.045:.075);
    points[0].x+=(target.x-points[0].x)*.22;points[0].y+=(target.y-points[0].y)*.22;
    for(let i=1;i<points.length;i++){points[i].x+=(points[i-1].x-points[i].x)*(.2-i*.014);points[i].y+=(points[i-1].y-points[i].y)*(.2-i*.014);}
    const speed=Math.min(1,Math.hypot(velocity.x,velocity.y)*18);gl.uniform2fv(gl.getUniformLocation(program,'trail[0]'),new Float32Array(points.flatMap(p=>[p.x,p.y])));gl.uniform2f(gl.getUniformLocation(program,'velocity'),velocity.x,velocity.y);gl.uniform1f(gl.getUniformLocation(program,'time'),now*.001);gl.uniform1f(gl.getUniformLocation(program,'aspect'),canvas.width/canvas.height);gl.uniform1f(gl.getUniformLocation(program,'pace'),speed);gl.uniform1f(gl.getUniformLocation(program,'hoverWave'),wave);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(draw);}
})();
