(() => {
  'use strict';
  const root = document.querySelector('.ln-hero');
  const stage = root && root.querySelector('.ln-hero__stage');
  const canvas = root && root.querySelector('.ln-webgl-bg');
  if (!root || !stage || !canvas) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return;

  const vertex = `attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  const fragment = `precision highp float;
    varying vec2 uv;uniform vec2 resolution;uniform vec2 pointer;uniform vec2 previous;uniform float time;uniform float energy;uniform float scroll;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    float fbm(vec2 p){float v=0.;v+=noise(p)*.52;p=p*2.03+2.7;v+=noise(p)*.28;p=p*2.01-1.4;v+=noise(p)*.14;p*=2.02;v+=noise(p)*.06;return v;}
    void main(){vec2 q=uv;q.x*=resolution.x/resolution.y;vec2 m=pointer;m.x*=resolution.x/resolution.y;vec2 old=previous;old.x*=resolution.x/resolution.y;
      vec2 velocity=m-old;float speed=min(1.,length(velocity)*13.);float d=length(q-m);float wake=exp(-d*d*5.5)*(energy*.85+speed*.9);
      vec2 bend=normalize(velocity+vec2(.0001))*wake*.075;vec2 w=q-bend;
      float terrain=fbm(w*1.62+vec2(time*.025,-time*.018))+fbm(w*3.25-vec2(time*.019,time*.014))*.38;
      float ripple=sin(d*31.-time*2.2-wake*7.)*exp(-d*3.1)*wake;
      float field=terrain+ripple*.14;
      float fine=abs(fract(field*7.5)-.5);float contours=1.-smoothstep(.455,.5,fine);
      float major=1.-smoothstep(.465,.5,abs(fract(field*2.5)-.5));
      float blob=smoothstep(.62,.05,d+fbm(w*4.+time*.035)*.13)*(.12+.24*energy);
      vec3 paper=vec3(.973,.973,.952);vec3 grey=vec3(.60,.615,.58);vec3 line=vec3(.69,.70,.645);
      vec3 color=mix(paper,grey,blob);color=mix(color,line,contours*.18+major*.13);float darkMix=smoothstep(.04,.72,scroll);vec3 dark=vec3(.12,.145,.095);
      float darkField=fbm(w*.72+vec2(time*.006,-time*.004));float darkContour=1.-smoothstep(.475,.5,abs(fract(darkField*3.15)-.5));
      vec3 darkColor=dark+vec3(.055,.07,.012)*darkContour*.22;color=mix(color,darkColor,darkMix);
      gl_FragColor=vec4(color,.92);}`;

  const compile = (type, source) => { const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);return shader; };
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  const uniforms={resolution:gl.getUniformLocation(program,'resolution'),pointer:gl.getUniformLocation(program,'pointer'),previous:gl.getUniformLocation(program,'previous'),time:gl.getUniformLocation(program,'time'),energy:gl.getUniformLocation(program,'energy'),scroll:gl.getUniformLocation(program,'scroll')};
  let target={x:.5,y:.48},current={x:.5,y:.48},previous={x:.5,y:.48},active=0,lastMove=0;
  const resize=()=>{const rect=stage.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,innerWidth<700?1:1.35);canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));gl.viewport(0,0,canvas.width,canvas.height);};
  stage.addEventListener('pointermove',event=>{const rect=stage.getBoundingClientRect();target.x=(event.clientX-rect.left)/rect.width;target.y=1-(event.clientY-rect.top)/rect.height;active=1;lastMove=performance.now();},{passive:true});
  stage.addEventListener('pointerleave',()=>{active=0;});addEventListener('resize',resize,{passive:true});
  resize();root.classList.add('has-webgl-fluid');
  const draw=now=>{if(!active&&now-lastMove>900){target.x=.5+Math.sin(now*.00043)*.37;target.y=.5+Math.cos(now*.00031)*.31;}
    previous.x+=(current.x-previous.x)*.09;previous.y+=(current.y-previous.y)*.09;current.x+=(target.x-current.x)*.075;current.y+=(target.y-current.y)*.075;
    const rect=root.getBoundingClientRect(),distance=Math.max(1,root.offsetHeight-innerHeight),progress=Math.max(0,Math.min(1,-rect.top/distance));
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform2f(uniforms.pointer,current.x,current.y);gl.uniform2f(uniforms.previous,previous.x,previous.y);gl.uniform1f(uniforms.time,now*.001);gl.uniform1f(uniforms.energy,active?.95:.38);gl.uniform1f(uniforms.scroll,progress);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(draw);};
  requestAnimationFrame(draw);
})();
