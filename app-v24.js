import './app-v23.js';
import * as THREE from 'three';

// v24 — macro Milky Way structure pass.
// Keep v23's dense readable stars, then add broad halo, warm core, dark rift and chromatic nebula particle layers.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 24';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='BUILDING GALACTIC DEPTH<br><span style="opacity:.48">broad stellar halo · warm core · branching dust rift · blue/rose/violet nebula particles</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · layered particle Milky Way';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x000000,0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'3',pointerEvents:'none'});
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-10,10);
camera.position.z=3;

function rngFactory(seed=24092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];

const PAL={
  halo:[rgb(0x89a6d0),rgb(0x9db7dd),rgb(0x7c8fb8),rgb(0xb7bfd6),rgb(0x7f78a6)],
  core:[rgb(0xffedcf),rgb(0xf7cf9c),rgb(0xeeb07d),rgb(0xdd916b),rgb(0xe9b6a5)],
  rose:[rgb(0xd890ad),rgb(0xe29ab8),rgb(0xb77ba7),rgb(0xc486b5)],
  violet:[rgb(0x8b75c8),rgb(0xa489d9),rgb(0x6f82d2),rgb(0xb99adf)],
  blue:[rgb(0x6f9be8),rgb(0x80b0ff),rgb(0x6e7fd3),rgb(0x9fc0f1)],
  dust:[rgb(0x010205),rgb(0x030307),rgb(0x06050a),rgb(0x0a070d)]
};

function radialTexture(kind='soft'){
  const c=document.createElement('canvas');c.width=c.height=96;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(48,48,0,48,48,48);
  if(kind==='soft'){
    g.addColorStop(0,'rgba(255,255,255,.62)');
    g.addColorStop(.25,'rgba(255,255,255,.24)');
    g.addColorStop(.60,'rgba(255,255,255,.055)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }else{
    g.addColorStop(0,'rgba(255,255,255,.95)');
    g.addColorStop(.14,'rgba(255,255,255,.78)');
    g.addColorStop(.34,'rgba(255,255,255,.30)');
    g.addColorStop(.70,'rgba(255,255,255,.035)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }
  x.fillStyle=g;x.fillRect(0,0,96,96);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const softTex=radialTexture('soft');
const pointTex=radialTexture('point');

const mats=[],objs=[];
function material(texture,{opacity=1,minSize=.8,maxSize=6,twinkle=.01,blending=THREE.AdditiveBlending}={}){
  const m=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending,
    uniforms:{uMap:{value:texture},uOpacity:{value:opacity},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uMin:{value:minSize},uMax:{value:maxSize}},
    vertexShader:`
      attribute float aSize; attribute float aAlpha; attribute float aSeed; attribute vec3 color;
      varying vec3 vColor; varying float vAlpha;
      uniform float uTime; uniform float uDpr; uniform float uMin; uniform float uMax;
      void main(){
        vColor=color; vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(.12+aSeed*.24)+aSeed*41.0)*${twinkle.toFixed(3)};
        float ps=aSize*uDpr*tw;
        gl_PointSize=clamp(ps,uMin*uDpr,uMax*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uMap; uniform float uOpacity; varying vec3 vColor; varying float vAlpha;
      void main(){vec4 t=texture2D(uMap,gl_PointCoord);float a=t.a*vAlpha*uOpacity;if(a<.001)discard;gl_FragColor=vec4(vColor,a);}`
  });
  mats.push(m);return m;
}

function system(count,generator,mat){
  const p=new Float32Array(count*3),c=new Float32Array(count*3),s=new Float32Array(count),a=new Float32Array(count),seed=new Float32Array(count);
  let i=0,guard=0;
  while(i<count&&guard<count*24){
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
  clear();rnd=rngFactory(24092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  // Main diagonal geometry inherited visually from v23/v18.
  const x0=-W*.60,y0=64,x1=W*.57,y1=-46;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{
    const bend=Math.sin((t+.04)*Math.PI)*W*.022+Math.sin(t*6.0+1.2)*1.35+Math.sin(t*14.7)*.34;
    return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};
  };
  const coreW=t=>Math.exp(-Math.pow((t-.67)/.19,2));
  const lane=(t,k)=>(k-3.5)*1.18+Math.sin(t*(5.0+k*.88)+k*1.13)*(1.0+.13*k)+Math.sin(t*18+k*.75)*.42;

  // 1) Broad cool halo — gives the galaxy a huge soft silhouette.
  system(42000,()=>{
    const t=rand(-.08,1.08),p=band(t),cw=coreW(t),sigma=14+rand(0,11)+cw*8;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.32))**2);
    if(rnd()>feather*.80)return null;
    let col=(rnd()<.70?pick(PAL.halo):rnd()<.86?pick(PAL.violet):pick(PAL.blue)).slice();
    col=col.map(v=>v*rand(.55,.88));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.2,col,size:rand(2.0,6.5),alpha:rand(.018,.070)*feather};
  },material(softTex,{opacity:.78,minSize:1.2,maxSize:7.2,twinkle:.002}));

  // 2) Warm core clouds — irregular clumps, not a uniform stripe.
  const clumps=Array.from({length:46},()=>{
    const t=clamp(rand(.36,.96)+gauss()*.035,.28,1.02),p=band(t),side=gauss()*(3.5+coreW(t)*5.0);
    return{x:p.x+nx*side,y:p.y+ny*side,r:rand(1.3,5.4),pal:rnd()<.70?PAL.core:(rnd()<.60?PAL.rose:PAL.violet)};
  });
  system(30000,()=>{
    const cl=pick(clumps),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.78));
    if(rnd()>fade)return null;
    let col=pick(cl.pal).slice();col=col.map(v=>Math.min(1,v*rand(.78,1.05)));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.10,col,size:rand(1.4,4.4),alpha:rand(.035,.16)*fade};
  },material(softTex,{opacity:.96,minSize:1.2,maxSize:4.8,twinkle:.003}));

  // 3) Small stellar clumps so the galaxy reads as structured rather than uniformly noisy.
  const stellar=Array.from({length:34},()=>{
    const t=rand(.12,.98),p=band(t),side=gauss()*8.0;
    return{x:p.x+nx*side,y:p.y+ny*side,r:rand(.7,2.8),pal:rnd()<.38?PAL.core:rnd()<.64?PAL.blue:rnd()<.82?PAL.violet:PAL.rose};
  });
  system(14000,()=>{
    const cl=pick(stellar),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.62));
    if(rnd()>fade)return null;
    const col=pick(cl.pal);
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.22,col,size:rand(.85,1.55),alpha:rand(.20,.55)*fade};
  },material(pointTex,{opacity:.92,minSize:.9,maxSize:1.7,twinkle:.020}));

  // 4) Local blue / violet / rose nebula regions.
  const nebulae=Array.from({length:18},(_,i)=>{
    const t=rand(.14,.98),p=band(t),side=(rnd()<.5?-1:1)*rand(6,18);
    return{x:p.x+nx*side,y:p.y+ny*side,rx:rand(2.2,6.4),ry:rand(1.5,4.8),pal:i%3===0?PAL.rose:i%3===1?PAL.violet:PAL.blue};
  });
  system(12000,()=>{
    const n=pick(nebulae),gx=gauss()*n.rx,gy=gauss()*n.ry,fade=Math.exp(-.5*((gx/n.rx)**2+(gy/n.ry)**2));
    if(rnd()>fade*.80)return null;
    let col=pick(n.pal).slice();col=col.map(v=>v*rand(.68,.98));
    return{x:n.x+gx,y:n.y+gy,z:.28,col,size:rand(1.6,5.0),alpha:rand(.018,.095)*fade};
  },material(softTex,{opacity:.76,minSize:1.1,maxSize:5.2,twinkle:.002}));

  // 5) Branching Great Rift. Dark particles cut through both the warm core and v23 star field.
  system(22000,()=>{
    const t=rand(.03,.99),p=band(t),k=Math.floor(rand(0,8));
    const off=lane(t,k)+gauss()*rand(.45,2.1);
    const branch=Math.sin(t*(8.0+k*.7)+k)*rand(.2,1.2);
    let col=pick(PAL.dust).slice();
    return{x:p.x+nx*(off+branch),y:p.y+ny*(off+branch),z:.50,col,size:rand(2.0,6.8),alpha:rand(.045,.16)};
  },material(softTex,{opacity:.80,minSize:1.4,maxSize:7.0,twinkle:0,blending:THREE.NormalBlending}));

  if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},320);}
}

build();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(build,120);});
