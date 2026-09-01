import './app-v24.js';
import * as THREE from 'three';

// v25 — macro galactic structure enhancement.
// Keeps v23/v24 star readability, then strengthens broad halo, warm core,
// branching dark rift, localized nebula clouds and subtle lower atmospheric glow.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 25';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='SCULPTING THE MILKY WAY<br><span style="opacity:.48">wide stellar halo · luminous warm core · deep branching dust · chromatic nebulae</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · sculpted particle Milky Way';

// v24 already carries the first macro structure layer. Lift it slightly so it reads
// underneath this second structural pass without changing the small-star balance.
const previousCanvases=[...document.querySelectorAll('canvas')];
if(previousCanvases.length){
  const macro=previousCanvases[previousCanvases.length-1];
  macro.style.filter='brightness(1.16) saturate(1.10) contrast(1.03)';
}

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x000000,0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'4',pointerEvents:'none'});
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-10,10);
camera.position.z=3;

function rngFactory(seed=25092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];

const PAL={
  halo:[rgb(0x6f8eb6),rgb(0x86a4ce),rgb(0xa3b7d4),rgb(0xb8c0d3),rgb(0x827ea4)],
  haloBright:[rgb(0xc6d4e7),rgb(0xd5dce8),rgb(0xaabfe0),rgb(0xb8afd2)],
  ivory:[rgb(0xfff1d8),rgb(0xffe4c4),rgb(0xf8d5ae),rgb(0xf5e4cf)],
  peach:[rgb(0xf6c19d),rgb(0xefa77e),rgb(0xe69670),rgb(0xeab3a1)],
  amber:[rgb(0xe7a36f),rgb(0xd8895d),rgb(0xc97850),rgb(0xf0b781)],
  rose:[rgb(0xd88fa9),rgb(0xe8a0b8),rgb(0xc77fa5),rgb(0xb777a0)],
  violet:[rgb(0x987fcf),rgb(0xb296dd),rgb(0x7f70bd),rgb(0xc19fdc)],
  blue:[rgb(0x6d96df),rgb(0x7fb0f2),rgb(0x6885cc),rgb(0x9abbea)],
  dust:[rgb(0x010205),rgb(0x020207),rgb(0x050409),rgb(0x08060b)]
};

function texture(kind='soft'){
  const c=document.createElement('canvas');c.width=c.height=96;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(48,48,0,48,48,48);
  if(kind==='soft'){
    g.addColorStop(0,'rgba(255,255,255,.64)');
    g.addColorStop(.20,'rgba(255,255,255,.30)');
    g.addColorStop(.46,'rgba(255,255,255,.105)');
    g.addColorStop(.72,'rgba(255,255,255,.022)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }else{
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.10,'rgba(255,255,255,.96)');
    g.addColorStop(.25,'rgba(255,255,255,.48)');
    g.addColorStop(.52,'rgba(255,255,255,.08)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }
  x.fillStyle=g;x.fillRect(0,0,96,96);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const softTex=texture('soft');
const pointTex=texture('point');

const mats=[],objs=[];
function material(tex,{opacity=1,minSize=.8,maxSize=8,twinkle=.004,blending=THREE.AdditiveBlending}={}){
  const m=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending,
    uniforms:{uMap:{value:tex},uOpacity:{value:opacity},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uMin:{value:minSize},uMax:{value:maxSize}},
    vertexShader:`
      attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;
      varying vec3 vColor;varying float vAlpha;
      uniform float uTime;uniform float uDpr;uniform float uMin;uniform float uMax;
      void main(){
        vColor=color;vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(.10+aSeed*.22)+aSeed*47.0)*${twinkle.toFixed(3)};
        float ps=aSize*uDpr*tw;
        gl_PointSize=clamp(ps,uMin*uDpr,uMax*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uMap;uniform float uOpacity;varying vec3 vColor;varying float vAlpha;
      void main(){vec4 t=texture2D(uMap,gl_PointCoord);float a=t.a*vAlpha*uOpacity;if(a<.0008)discard;gl_FragColor=vec4(vColor,a);}`
  });
  mats.push(m);return m;
}

function system(count,generator,mat){
  const p=new Float32Array(count*3),c=new Float32Array(count*3),s=new Float32Array(count),a=new Float32Array(count),seed=new Float32Array(count);
  let i=0,guard=0;
  while(i<count&&guard<count*30){
    guard++;const v=generator();if(!v)continue;
    p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z||0;
    c[i*3]=v.col[0];c[i*3+1]=v.col[1];c[i*3+2]=v.col[2];
    s[i]=v.size;a[i]=v.alpha;seed[i]=rnd();i++;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(p,3));
  g.setAttribute('color',new THREE.BufferAttribute(c,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(s,1));
  g.setAttribute('aAlpha',new THREE.BufferAttribute(a,1));
  g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
  g.setDrawRange(0,i);
  const pts=new THREE.Points(g,mat);scene.add(pts);objs.push(pts);return pts;
}

function clear(){for(const o of objs.splice(0)){scene.remove(o);o.geometry.dispose();}for(const m of mats.splice(0))m.dispose();}

function build(){
  clear();rnd=rngFactory(25092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  const x0=-W*.60,y0=65,x1=W*.58,y1=-47;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{
    const bend=Math.sin((t+.04)*Math.PI)*W*.022+Math.sin(t*5.9+1.25)*1.42+Math.sin(t*14.5)*.38;
    return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};
  };
  const coreW=t=>Math.exp(-Math.pow((t-.63)/.20,2));
  const segmentWeight=t=>clamp(.72
    +Math.exp(-Math.pow((t-.22)/.09,2))*.16
    +Math.exp(-Math.pow((t-.42)/.08,2))*.28
    +Math.exp(-Math.pow((t-.62)/.11,2))*.52
    +Math.exp(-Math.pow((t-.79)/.08,2))*.24,0,1.45);
  const mainLane=t=>Math.sin(t*7.0+0.6)*2.7+Math.sin(t*15.4)*.75;
  const sideLane=(t,k)=>{
    const bases=[-11,-7,-3.2,3.4,7.3,11.4];
    return bases[k]+Math.sin(t*(6.4+k*.85)+k*.9)*(1.0+k*.10)+Math.sin(t*17.0+k*.7)*.45;
  };

  // 1) Huge feathered halo — deliberately much wider than v24.
  system(52000,()=>{
    const t=rand(-.10,1.10),p=band(t),cw=coreW(t),sw=segmentWeight(t),sigma=19+rand(0,12)+cw*9;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.42))**2);
    if(rnd()>feather*.90*sw)return null;
    let col=(rnd()<.60?pick(PAL.halo):rnd()<.80?pick(PAL.haloBright):rnd()<.91?pick(PAL.violet):pick(PAL.blue)).slice();
    col=col.map(v=>v*rand(.62,.96));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.25,col,size:rand(4.0,11.5),alpha:rand(.010,.050)*feather};
  },material(softTex,{opacity:.92,minSize:2.2,maxSize:12.0,twinkle:.001}));

  // 2) Mid halo grains bridge the huge glow to the readable micro-star layer.
  system(34000,()=>{
    const t=rand(-.04,1.04),p=band(t),cw=coreW(t),sigma=11+rand(0,8)+cw*7,off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.32))**2);
    if(rnd()>feather*.86*segmentWeight(t))return null;
    let col=(rnd()<.48?pick(PAL.haloBright):rnd()<.72?pick(PAL.ivory):rnd()<.87?pick(PAL.violet):pick(PAL.blue)).slice();
    col=col.map(v=>Math.min(1,v*rand(.72,1.02)));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.06,col,size:rand(1.4,3.2),alpha:rand(.035,.14)*feather};
  },material(softTex,{opacity:.94,minSize:1.1,maxSize:3.4,twinkle:.002}));

  // 3) Warm luminous core built from many irregular clumps.
  const coreClumps=Array.from({length:62},()=>{
    const t=clamp(rand(.30,.94)+gauss()*.045,.18,1.02),p=band(t),cw=coreW(t),side=gauss()*(3.0+cw*5.8);
    const q=rnd();
    return{x:p.x+nx*side,y:p.y+ny*side,r:rand(1.4,6.6),pal:q<.34?PAL.ivory:q<.63?PAL.peach:q<.82?PAL.amber:q<.92?PAL.rose:PAL.violet};
  });
  system(36000,()=>{
    const cl=pick(coreClumps),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.76));
    if(rnd()>fade)return null;
    let col=pick(cl.pal).slice();col=col.map(v=>Math.min(1,v*rand(.84,1.10)));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.16,col,size:rand(2.0,7.4),alpha:rand(.035,.18)*fade};
  },material(softTex,{opacity:1.06,minSize:1.5,maxSize:7.8,twinkle:.002}));

  // 4) Bright pinpoint nuclei inside the core — compact, warm and irregular.
  system(17000,()=>{
    const t=rand(.28,.93),p=band(t),cw=coreW(t),off=gauss()*(4.0+cw*5.0);
    if(rnd()>(.48+.46*cw)*segmentWeight(t))return null;
    const q=rnd();let col=q<.45?pick(PAL.ivory):q<.72?pick(PAL.peach):q<.88?pick(PAL.amber):pick(PAL.violet);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.28,col,size:rand(1.10,1.92),alpha:rand(.34,.76)};
  },material(pointTex,{opacity:1.04,minSize:1.0,maxSize:2.0,twinkle:.015}));

  // 5) Local chromatic nebula patches, kept sparse and painterly.
  const nebulaAnchors=[.18,.28,.39,.51,.60,.69,.78,.88].map((t,i)=>{
    const p=band(t),side=(i%2?1:-1)*rand(4.5,13.5);
    return{x:p.x+nx*side,y:p.y+ny*side,rx:rand(3.0,7.5),ry:rand(2.0,5.2),pal:i%3===0?PAL.rose:i%3===1?PAL.violet:PAL.blue};
  });
  system(15000,()=>{
    const n=pick(nebulaAnchors),gx=gauss()*n.rx,gy=gauss()*n.ry,fade=Math.exp(-.5*((gx/n.rx)**2+(gy/n.ry)**2));
    if(rnd()>fade*.82)return null;
    let col=pick(n.pal).slice();col=col.map(v=>v*rand(.74,1.02));
    return{x:n.x+gx,y:n.y+gy,z:.34,col,size:rand(2.4,8.0),alpha:rand(.018,.105)*fade};
  },material(softTex,{opacity:.88,minSize:1.5,maxSize:8.2,twinkle:.001}));

  // 6) Main dark rift + six branching lanes. Normal blending lets dust actually carve the luminous structure.
  system(28500,()=>{
    const t=rand(.02,.995),p=band(t),choose=rnd();
    let off;
    if(choose<.42) off=mainLane(t)+gauss()*rand(.65,2.7);
    else off=sideLane(t,Math.floor(rand(0,6)))+gauss()*rand(.55,2.1);
    // Core dust is broader/deeper; outer dust tapers away.
    const cw=coreW(t),strength=.56+.64*cw;
    let col=pick(PAL.dust).slice();
    return{x:p.x+nx*off,y:p.y+ny*off,z:.52,col,size:rand(3.0,10.5+cw*4.0),alpha:rand(.040,.145)*strength};
  },material(softTex,{opacity:.88,minSize:2.2,maxSize:14.0,twinkle:0,blending:THREE.NormalBlending}));

  // 7) Subtle lower-frame airglow made only from very soft particles.
  system(12000,()=>{
    const x=rand(-W/2,W/2),y=rand(-50,-8),f=clamp((-y-8)/42,0,1);
    let col=(rnd()<.48?pick(PAL.blue):rnd()<.78?pick(PAL.violet):pick(PAL.rose)).slice();
    col=col.map(v=>v*rand(.50,.78));
    return{x,y,z:-.4,col,size:rand(5.0,13.0),alpha:rand(.004,.022)*f};
  },material(softTex,{opacity:.44,minSize:3.0,maxSize:13.5,twinkle:0}));

  if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},340);}
}

build();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(build,120);});
