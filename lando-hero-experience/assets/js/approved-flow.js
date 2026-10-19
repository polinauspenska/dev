/* 4.4.22: larger, faster, smoother pointer wake while autonomous motion continues independently. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(hover: none)');
  const groups = [[-110,-20,395,280],[665,-90,405,330],[560,650,495,335]];
  const vertex = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const fragment = `precision mediump float;
    varying vec2 uv;uniform float time,energy,dark;uniform vec4 wake[8];uniform vec4 bounds;
    float contribution(vec2 pos,vec2 point,float index,float size,float strength){
      float u=index/8.;
      float radius=96.*size*(1.-u*.46);
      vec2 delta=(pos-point)/vec2(radius*1.16,radius);
      return exp(-dot(delta,delta)*1.48)*(strength*pow(1.-u*.72,1.22));
    }
    void main(){
      vec2 p=vec2(uv.x,1.-uv.y)*vec2(960.,540.);
      if(p.x<bounds.x||p.y<bounds.y||p.x>bounds.z||p.y>bounds.w){gl_FragColor=vec4(0.);return;}
      vec2 warped=vec2(
        p.x+22.*sin(p.y*.026+time*.45)+12.*sin(p.x*.019-p.y*.018-time*.56),
        p.y+24.*sin(p.x*.023-time*.43)+12.*cos(p.y*.022+p.x*.011+time*.3));
      float field=0.;
      for(int i=0;i<8;i++){
        field+=contribution(warped,wake[i].xy,float(i),.98,.34);
        field+=contribution(warped,wake[i].zw,float(i),1.42,.39);
      }
      // Smooth motion does not require a blurred spatial edge.
      float innerField=field+.045*sin(p.x*.014-p.y*.011+time*.45);
      float outerAA=.002;float innerAA=.003;
      #ifdef LN_DERIVATIVES
        outerAA=max(fwidth(field)*.6,.0001);
        innerAA=max(fwidth(innerField)*.6,.0001);
      #endif
      float edge=smoothstep(.2175-outerAA,.2175+outerAA,field);
      // Flat reference fills separated by a roughly one-pixel antialiased edge.
      // Broad light-grey body, with a smaller balanced dark-grey core.
      float inner=smoothstep(.72-innerAA,.72+innerAA,innerField);
      vec3 lightGrey=vec3(242.,242.,237.)/255.;
      vec3 deeperGrey=vec3(224.,225.,218.)/255.;
      vec3 colour=mix(lightGrey,deeperGrey,inner);
      if(dark>.5){gl_FragColor=vec4(vec3(1.),smoothstep(.18,.255,field)*energy*31./255.*.6);}
      else{gl_FragColor=vec4(colour,edge*energy);}
    }`;
  function makeRenderer(parent, dark) {
    const wrap = document.createElement('div');
    wrap.className = `ln-approved-flow${dark ? ' ln-approved-flow--dark' : ''}`;
    wrap.setAttribute('aria-hidden', 'true');
    const water=document.createElement('canvas'), lines=document.createElement('canvas');
    wrap.append(water,lines); parent.prepend(wrap);
    const ctx=lines.getContext('2d');
    const gl=water.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,powerPreference:'low-power'});
    let ready=false,uniforms={},width=0,height=0,lastLines=-1;
    if(gl){
      const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}return s;};
      const derivatives=gl.getExtension('OES_standard_derivatives');
      const source=(derivatives?'#extension GL_OES_standard_derivatives : enable\n#define LN_DERIVATIVES\n':'')+fragment;
      const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,source);
      if(vs&&fs){
        const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
        if(gl.getProgramParameter(program,gl.LINK_STATUS)){
          gl.useProgram(program);
          const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
          gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
          const attr=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
          ['time','energy','dark','wake[0]','bounds'].forEach(n=>{uniforms[n]=gl.getUniformLocation(program,n);});ready=true;
        }
      }
      water.addEventListener('webglcontextlost',()=>{ready=false;water.style.visibility='hidden';});
    }
    const resize=()=>{
      width=parent.clientWidth;height=parent.clientHeight;
      const ratio=Math.min(devicePixelRatio||1,1.35);
      // Avoid enlarging a low-resolution canvas, which softens the silhouette.
      const waterRatio=Math.min(devicePixelRatio||1,1.5);
      water.width=Math.max(1,Math.round(width*waterRatio));water.height=Math.max(1,Math.round(height*waterRatio));
      lines.width=Math.max(1,Math.round(width*ratio));lines.height=Math.max(1,Math.round(height*ratio));
      lastLines=-1;
      if(ctx)ctx.setTransform(ratio,0,0,ratio,0,0);
      if(ready)gl.viewport(0,0,water.width,water.height);
    };
    const draw=(time,energy,mx,my,wake)=>{
      if(ready && !dark){
        gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.energy,energy);gl.uniform1f(uniforms.dark,dark?1:0);
        let minX=960,minY=540,maxX=0,maxY=0;
        for(let i=0;i<wake.length;i+=2){minX=Math.min(minX,wake[i]);maxX=Math.max(maxX,wake[i]);minY=Math.min(minY,wake[i+1]);maxY=Math.max(maxY,wake[i+1]);}
        // Skip the expensive liquid calculation outside the entire moving wake.
        gl.uniform4f(uniforms.bounds,minX-270,minY-250,maxX+270,maxY+250);
        gl.uniform4fv(uniforms['wake[0]'],wake);gl.drawArrays(gl.TRIANGLES,0,6);
      }
      if(!ctx)return;
      if(lastLines>=0 && time===lastLines)return;
      lastLines=time;
      ctx.clearRect(0,0,width,height);ctx.lineWidth=.8;
      ctx.strokeStyle=dark?'#3e443d':'#e7e7dd';
      groups.forEach(([cx,cy,rx,ry],j)=>{
        for(let ring=0;ring<3;ring++){
          const radius=.61+ring*.31;ctx.beginPath();
          for(let step=0;step<=240;step++){
            const a=step/240*Math.PI*2;
            const wave=1+.11*Math.sin(a*3+time*.52+j)+.055*Math.cos(a*5-time*.56);
            let x=cx+rx*radius*wave*Math.cos(a),y=cy+ry*radius*wave*Math.sin(a);
            const dist=Math.hypot(x-mx,y-my),pull=Math.exp(-Math.pow(dist/145,2))*energy;
            x+=pull*14*Math.sin(y*.012-time*2.35);y+=pull*14*Math.cos(x*.013+time*2.10);
            if(step===0)ctx.moveTo(x*width/960,y*height/540);else ctx.lineTo(x*width/960,y*height/540);
          }
          ctx.closePath();ctx.stroke();
        }
      });
    };
    resize();return {resize,draw};
  }
  document.querySelectorAll('.ln-hero').forEach(root=>{
    const stage=root.querySelector('.ln-hero__stage'),scene=root.querySelector('.ln-live-scene');
    if(!stage||!scene)return;
    const white=makeRenderer(scene,false),dark=makeRenderer(stage,true);
    let frame=0,last=0,time=0,energy=0,inView=true,active=false;
    let targetX=480,targetY=270,x=480,y=270,hoverX=480,hoverY=270;
    // v4.4.21: two independent wakes. The first is always automatic; the second
    // follows the pointer. They are packed together for the shader, so hover never
    // pauses or replaces the autonomous grey-water transition.
    const autoWake=new Float32Array(16),hoverWake=new Float32Array(16),wake=new Float32Array(32);
    for(let i=0;i<8;i++){autoWake[i*2]=480;autoWake[i*2+1]=270;hoverWake[i*2]=-1200;hoverWake[i*2+1]=-1200;}
    const sampleChain=(chain,px,py,dt,headLag=34)=>{
      chain[0] += (px-chain[0])*(1-Math.exp(-dt/headLag));
      chain[1] += (py-chain[1])*(1-Math.exp(-dt/headLag));
      for(let i=1;i<8;i++){
        const lag=active ? (28+i*4.5) : (48+i*7);
        const a=1-Math.exp(-dt/lag);
        chain[i*2] += (chain[(i-1)*2]-chain[i*2])*a;
        chain[i*2+1] += (chain[(i-1)*2+1]-chain[i*2+1])*a;
      }
    };
    const packWake=()=>{wake.set(autoWake,0);wake.set(hoverWake,16);};
    stage.addEventListener('pointermove',event=>{
      if(event.pointerType!=='mouse'||event.target.closest('.ln-hero__nav,.ln-menu-panel'))return;
      const rect=stage.getBoundingClientRect();hoverX=(event.clientX-rect.left)/rect.width*960;hoverY=(event.clientY-rect.top)/rect.height*540;targetX=hoverX;targetY=hoverY;
      if(!active){for(let i=0;i<8;i++){hoverWake[i*2]=hoverX;hoverWake[i*2+1]=hoverY;}}
      active=true;
    },{passive:true});
    stage.addEventListener('pointerleave',()=>{active=false;},{passive:true});
    packWake();
    const paint=()=>{
      white.draw(time,energy,x,y,wake);
      if(root.classList.contains('is-shrinking'))dark.draw(time,energy,x,y,wake);
    };
    const tick=now=>{
      frame=0;if(document.hidden||!inView||motion.matches){last=0;return;}
      {
        const dt=last?Math.min(50,now-last):16.667;last=now;time+=dt/1000;
        // Automatic water path is always sampled, even with the mouse stationary
        // inside the slider. Pointer motion adds a second independent wake.
        const autoX=480+325*Math.sin(time*.90)+48*Math.sin(time*1.60);
        const autoY=270+150*Math.sin(time*1.10)+28*Math.cos(time*1.85);
        targetX=active?hoverX:autoX;targetY=active?hoverY:autoY;
        const follow=1-Math.exp(-dt/(active?46:82));x+=(targetX-x)*follow;y+=(targetY-y)*follow;
        sampleChain(autoWake,autoX,autoY,dt,36);
        if(active){
          sampleChain(hoverWake,hoverX,hoverY,dt,18);
        }else{
          // Park the hover wake outside the scene instead of duplicating the auto wake.
          sampleChain(hoverWake,-1200,-1200,dt,70);
        }
        packWake();
        const desired=active?1.08:.72;
        energy+=(desired-energy)*(1-Math.exp(-dt/(desired>energy?82:420)));
        paint();
      }
      frame=requestAnimationFrame(tick);
    };
    const sync=()=>{
      if(frame)cancelAnimationFrame(frame);frame=0;last=0;
      if(document.hidden||!inView)return;
      if(motion.matches)energy=0;
      paint();if(!motion.matches)frame=requestAnimationFrame(tick);
    };
    new ResizeObserver(()=>{white.resize();dark.resize();paint();}).observe(stage);
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();}).observe(root);
    // Static reduced-motion background still needs a redraw on entering scroll.
    let shrinking=root.classList.contains('is-shrinking');
    new MutationObserver(()=>{const next=root.classList.contains('is-shrinking');if(next!==shrinking){shrinking=next;paint();}}).observe(root,{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);sync();
  });
})();
