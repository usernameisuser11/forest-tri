import * as THREE from 'three';

// v18 — chromatic full-screen particle sky with strict star-size caps.
// The entire frame remains sky; stars are intentionally tiny and numerous.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 18';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='REFINING PARTICLE COSMOS<br><span style="opacity:.48">smaller stars · deeper micro-star field · broad Milky Way · chromatic core · dark rift</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · fine-particle sky';
const ui=document.querySelector('#ui');
if(ui) ui.style.zIndex='10';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x01030a,1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'1',pointerEvents:'none'});
document.body.prepend(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-20,20);
camera.position.z=5;

function rngFactory(seed=18092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a=0,b=1)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];

const PAL={
  icy:[rgb(0x91b7ff),rgb(0xacc9ff),rgb(0xc9dcff),rgb(0xdce8ff),rgb(0x789dff)],
  white:[rgb(0xf9f9ff),rgb(0xeff3ff),rgb(0xf5f0e9),rgb(0xe8e9f3)],
  ivory:[rgb(0xfff0d0),rgb(0xffe3b8),rgb(0xf7d7aa),rgb(0xf4e4cf)],
  amber:[rgb(0xffcb89),rgb(0xf3aa6f),rgb(0xe99061),rgb(0xd97b57),rgb(0xf1bd83)],
  rose:[rgb(0xe78ba8),rgb(0xd9709a),rgb(0xc886a0),rgb(0xf09aac)],
  violet:[rgb(0xb88fda),rgb(0x967ed0),rgb(0x816fbe),rgb(0xcb9cda)],
  blue:[rgb(0x72a6ff),rgb(0x5c87e9),rgb(0x89baff),rgb(0x6b73d6),rgb(0x9cc6ff)],
  red:[rgb(0xe66f75),rgb(0xd95966),rgb(0xef8b73)],
  coolDust:[rgb(0x667994),rgb(0x8290a9),rgb(0x77728f)],
  dust:[rgb(0x030309),rgb(0x06050a),rgb(0x09070d),rgb(0x100b11)]
};

function weightedStarColor(){
  const q=rnd();
  if(q<.25)return pick(PAL.icy);
  if(q<.55)return pick(PAL.white);
  if(q<.76)return pick(PAL.ivory);
  if(q<.88)return pick(PAL.amber);
  if(q<.94)return pick(PAL.violet);
  if(q<.975)return pick(PAL.rose);
  return pick(PAL.red);
}

function radialTexture(kind='star'){
  const c=document.createElement('canvas');c.width=c.height=96;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(48,48,0,48,48,48);
  if(kind==='star'){
    // Tighter halo than v17, so stars read as points rather than glowing discs.
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.08,'rgba(255,255,255,.96)');
    g.addColorStop(.20,'rgba(255,255,255,.33)');
    g.addColorStop(.48,'rgba(255,255,255,.055)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }else if(kind==='soft'){
    g.addColorStop(0,'rgba(255,255,255,.68)');
    g.addColorStop(.26,'rgba(255,255,255,.26)');
    g.addColorStop(.62,'rgba(255,255,255,.065)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }else{
    g.addColorStop(0,'rgba(255,255,255,.86)');
    g.addColorStop(.42,'rgba(255,255,255,.28)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }
  x.fillStyle=g;x.fillRect(0,0,96,96);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const starTex=radialTexture('star'),softTex=radialTexture('soft'),dustTex=radialTexture('dust');

const materials=[];
function pointMaterial(texture,{opacity=1,blending=THREE.AdditiveBlending,twinkle=.02,scale=1,maxSize=3}={}){
  const m=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending,
    uniforms:{
      uMap:{value:texture},uOpacity:{value:opacity},uTime:{value:0},uTwinkle:{value:twinkle},
      uScale:{value:scale},uDpr:{value:renderer.getPixelRatio()},uMaxSize:{value:maxSize}
    },
    vertexShader:`
      attribute float aSize; attribute float aAlpha; attribute float aSeed; attribute vec3 color;
      varying vec3 vColor; varying float vAlpha;
      uniform float uTime; uniform float uTwinkle; uniform float uScale; uniform float uDpr; uniform float uMaxSize;
      void main(){
        vColor=color;vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(0.28+aSeed*0.92)+aSeed*83.0)*uTwinkle;
        float ps=aSize*uScale*uDpr*tw;
        gl_PointSize=clamp(ps,0.55,uMaxSize*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uMap; uniform float uOpacity;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 t=texture2D(uMap,gl_PointCoord);
        float a=t.a*vAlpha*uOpacity;
        if(a<0.0015) discard;
        gl_FragColor=vec4(vColor,a);
      }`
  });
  materials.push(m);return m;
}

const objects=[];
function system(count,generator,mat){
  const p=new Float32Array(count*3),c=new Float32Array(count*3),s=new Float32Array(count),a=new Float32Array(count),seed=new Float32Array(count);
  let i=0,guard=0;
  while(i<count&&guard<count*28){
    guard++;const v=generator(i);if(!v)continue;
    p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z??0;
    c[i*3]=v.color[0];c[i*3+1]=v.color[1];c[i*3+2]=v.color[2];
    s[i]=v.size;a[i]=v.alpha;seed[i]=rnd();i++;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(p,3));
  g.setAttribute('color',new THREE.BufferAttribute(c,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(s,1));
  g.setAttribute('aAlpha',new THREE.BufferAttribute(a,1));
  g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
  g.setDrawRange(0,i);
  const pts=new THREE.Points(g,mat);scene.add(pts);objects.push(pts);return pts;
}

function clearSky(){for(const o of objects.splice(0)){scene.remove(o);o.geometry.dispose();}for(const m of materials.splice(0))m.dispose();}

function buildSky(){
  clearSky();rnd=rngFactory(18092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  const x0=-W*.59,y0=64,x1=W*.56,y1=-45;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{
    const bend=Math.sin((t+.05)*Math.PI)*W*.021+Math.sin(t*6.1+1.3)*1.25+Math.sin(t*14.0)*.36;
    return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};
  };
  const coreW=t=>Math.exp(-Math.pow((t-.67)/.205,2));
  const lane=(t,k)=>(k-3.5)*1.32+Math.sin(t*(5.5+k*1.17)+k*1.19)*(1.0+.19*k)+Math.sin(t*17.5+k*.81)*.48;
  const dustGap=(t,off)=>{let d=99;for(let k=0;k<8;k++)d=Math.min(d,Math.abs(off-lane(t,k)));return clamp((d-.38)/2.22,0,1);};

  // Full-frame star ocean. Big stars are now capped and physically much smaller.
  system(118000,()=>{
    const q=rnd();let size,alpha;
    if(q>.9997){size=rand(.95,1.35);alpha=rand(.68,.96)}
    else if(q>.989){size=rand(.46,.82);alpha=rand(.25,.68)}
    else{size=rand(.12,.40);alpha=rand(.065,.31)}
    let col=weightedStarColor().slice();
    const dim=rand(.70,1.02);col=col.map(v=>Math.min(1,v*dim));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:-.9,color:col,size,alpha};
  },pointMaterial(starTex,{opacity:.98,twinkle:.035,scale:1,maxSize:1.55}));

  // Very faint sub-pixel field to add depth without visible large dots.
  system(58000,()=>{
    const col=(rnd()<.55?pick(PAL.icy):rnd()<.78?pick(PAL.white):pick(PAL.ivory)).map(v=>v*rand(.43,.76));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:-1,color:col,size:rand(.08,.25),alpha:rand(.022,.105)};
  },pointMaterial(starTex,{opacity:.76,twinkle:.01,scale:.88,maxSize:.75}));

  // Huge feathered cool halo.
  system(64000,()=>{
    const t=rand(-.08,1.08),p=band(t),cw=coreW(t),sigma=15+rand(0,10)+cw*7;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.30))**2);
    if(rnd()>feather*.82)return null;
    const q=rnd();let col=q<.52?pick(PAL.icy):q<.75?pick(PAL.coolDust):q<.89?pick(PAL.violet):pick(PAL.rose);
    col=col.map(v=>v*rand(.58,.93));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.4,color:col,size:rand(.18,.60),alpha:rand(.018,.105)*feather};
  },pointMaterial(softTex,{opacity:.90,twinkle:.008,scale:1,maxSize:2.4}));

  // Main Milky Way population. Even its bright knots stay fine-grained.
  system(96000,()=>{
    const t=rand(-.05,1.05),p=band(t),cw=coreW(t),sigma=7.0+rand(0,6.2)+cw*8.6;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.39))**2),gap=dustGap(t,off);
    if(rnd()>feather*(.82+.13*cw)*(.19+.81*gap))return null;
    const q=rnd();let col;
    if(cw>.20&&q<.48)col=pick(PAL.ivory);
    else if(cw>.18&&q<.66)col=pick(PAL.amber);
    else if(q<.78)col=pick(PAL.icy);
    else if(q<.87)col=pick(PAL.violet);
    else if(q<.94)col=pick(PAL.rose);
    else col=pick(PAL.white);
    return{x:p.x+nx*off,y:p.y+ny*off,z:0,color:col,size:rnd()<.992?rand(.16,.48):rand(.55,.88),alpha:rand(.052,.29)*feather};
  },pointMaterial(starTex,{opacity:1,twinkle:.023,scale:1,maxSize:1.25}));

  // Warm center clumps.
  const coreClusters=Array.from({length:48},()=>{
    const t=clamp(rand(.38,.96)+gauss()*.035,.31,1.02),p=band(t),side=gauss()*7.4;
    return{x:p.x+nx*side,y:p.y+ny*side,r:rand(1.1,5.7),palette:rnd()<.58?PAL.ivory:rnd()<.75?PAL.amber:rnd()<.88?PAL.rose:PAL.violet};
  });
  system(30000,()=>{
    const cl=pick(coreClusters),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.72));
    if(rnd()>fade)return null;
    let col=pick(cl.palette).slice();col=col.map(v=>Math.min(1,v*rand(.80,1.14)));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.2,color:col,size:rand(.18,.68),alpha:rand(.07,.40)*fade};
  },pointMaterial(softTex,{opacity:1,twinkle:.014,scale:1.05,maxSize:1.8}));

  // Long luminous filaments.
  const filaments=Array.from({length:15},(_,k)=>({
    bias:(k-7)*1.12+rand(-.75,.75),amp:rand(.55,2.6),freq:rand(4.4,11.8),phase:rand(0,Math.PI*2),
    palette:k%5===0?PAL.rose:k%4===0?PAL.violet:k%3===0?PAL.icy:k%2===0?PAL.ivory:PAL.amber
  }));
  system(32000,()=>{
    const f=pick(filaments),t=rand(0,1),p=band(t),cw=coreW(t);
    const off=f.bias+Math.sin(t*f.freq+f.phase)*f.amp+gauss()*rand(.35,1.25);
    if(rnd()>.50+.38*cw)return null;
    const col=pick(f.palette);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.34,color:col,size:rand(.15,.48),alpha:rand(.05,.25)};
  },pointMaterial(starTex,{opacity:.94,twinkle:.018,scale:1,maxSize:1.15}));

  // Local blue / violet / rose nebula particle clusters.
  const nebulae=Array.from({length:21},(_,i)=>{
    const t=rand(.08,.95),p=band(t),side=gauss()*rand(8,23);
    return{x:p.x+nx*side,y:p.y+ny*side,r:rand(1.8,6.8),pal:i%4===0?PAL.blue:i%3===0?PAL.rose:PAL.violet};
  });
  system(15000,()=>{
    const cl=pick(nebulae),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.68));
    if(rnd()>fade*.78)return null;
    const col=pick(cl.pal).map(v=>v*rand(.75,1));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.40,color:col,size:rand(.28,1.25),alpha:rand(.025,.15)*fade};
  },pointMaterial(softTex,{opacity:.78,twinkle:.006,scale:1.15,maxSize:2.8}));

  // Branching Great Rift: dark particles + carved density gaps.
  system(24000,()=>{
    const t=rand(.01,.99),p=band(t),k=Math.floor(rand(0,8)),center=lane(t,k);
    const off=center+gauss()*rand(.65,2.0),cw=coreW(t),col=pick(PAL.dust);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.55,color:col,size:rand(2.0,7.0+cw*3),alpha:rand(.055,.18)+cw*.025};
  },pointMaterial(dustTex,{opacity:.84,blending:THREE.NormalBlending,twinkle:0,scale:1,maxSize:11}));

  // Stellar knots remain small; the visual richness comes from density, not dot size.
  const starClusters=Array.from({length:26},()=>{
    const t=rand(.06,.96),p=band(t),off=gauss()*rand(4,12);
    return{x:p.x+nx*off,y:p.y+ny*off,r:rand(.7,2.8),pal:rnd()<.42?PAL.icy:rnd()<.66?PAL.ivory:rnd()<.82?PAL.violet:PAL.amber};
  });
  system(15000,()=>{
    const cl=pick(starClusters),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.65));
    if(rnd()>fade)return null;
    const col=pick(cl.pal);
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.66,color:col,size:rand(.16,.58),alpha:rand(.075,.48)*fade};
  },pointMaterial(starTex,{opacity:1,twinkle:.035,scale:1,maxSize:1.1}));

  // Re-seed fine stars over dust.
  system(11000,()=>{
    const t=rand(.02,.98),p=band(t),cw=coreW(t),off=gauss()*(5.0+cw*6.5),gap=dustGap(t,off);
    if(rnd()>(.18+.72*gap))return null;
    const q=rnd();let col=q<.30?pick(PAL.ivory):q<.48?pick(PAL.amber):q<.66?pick(PAL.icy):q<.80?pick(PAL.violet):q<.90?pick(PAL.rose):pick(PAL.white);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.74,color:col,size:rand(.20,.62),alpha:rand(.11,.52)};
  },pointMaterial(starTex,{opacity:1,twinkle:.04,scale:1,maxSize:1.1}));

  // Rare prominent stars: still visible by brightness/color, not exaggerated diameter.
  system(92,()=>{
    const q=rnd();let col=q<.28?pick(PAL.icy):q<.50?pick(PAL.white):q<.68?pick(PAL.ivory):q<.80?pick(PAL.amber):q<.90?pick(PAL.blue):q<.96?pick(PAL.rose):pick(PAL.red);
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:.9,color:col,size:rand(.82,1.35),alpha:rand(.66,.98)};
  },pointMaterial(starTex,{opacity:1,twinkle:.055,scale:1,maxSize:1.6}));

  if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},260);}
}

buildSky();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of materials)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();

let resizeTimer;
addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(buildSky,120);});
