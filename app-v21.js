import './app-v18.js';
import * as THREE from 'three';

// v21 — brighter, slightly larger small stars while keeping highlight stars restrained.
// v18 remains the detailed cosmos; this pass restores readable micro-star presence.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 21';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='BRIGHTENING MICRO-STARS<br><span style="opacity:.48">slightly larger small stars · stronger micro-star light · restrained highlights</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · bright micro-star pass';
const ui=document.querySelector('#ui');
if(ui) ui.style.zIndex='10';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x000000,0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'2',pointerEvents:'none'});
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-10,10);
camera.position.z=3;

function rngFactory(seed=21092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const lerp=(a,b,t)=>a+(b-a)*t;
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];

const PAL={
  sky:[rgb(0xd5e3ff),rgb(0xf3f5ff),rgb(0xffefd6),rgb(0xffddb5),rgb(0xb8cfff),rgb(0xc3a7df),rgb(0xe29ab5)],
  cool:[rgb(0xb6ccf4),rgb(0x94b2e6),rgb(0xd0dcf0),rgb(0x9d95c9)],
  warm:[rgb(0xffebc8),rgb(0xf3c998),rgb(0xe8a873),rgb(0xd98d68),rgb(0xe7b3a5)],
  violet:[rgb(0xb798d8),rgb(0x9f84cf),rgb(0xd09bc6)]
};

function starTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(.10,'rgba(255,255,255,.99)');
  g.addColorStop(.24,'rgba(255,255,255,.66)');
  g.addColorStop(.46,'rgba(255,255,255,.18)');
  g.addColorStop(.72,'rgba(255,255,255,.035)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const tex=starTexture();

function makeMaterial(maxSize=1.95,twinkle=.024,opacity=1,minSize=1.12){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uMap:{value:tex},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uMax:{value:maxSize},uMin:{value:minSize},uOpacity:{value:opacity}},
    vertexShader:`
      attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;
      varying vec3 vColor;varying float vAlpha;
      uniform float uTime;uniform float uDpr;uniform float uMax;uniform float uMin;
      void main(){
        vColor=color;vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(.22+aSeed*.48)+aSeed*67.0)*${twinkle.toFixed(3)};
        float ps=aSize*uDpr*tw;
        gl_PointSize=clamp(ps,uMin*uDpr,uMax*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uMap;uniform float uOpacity;varying vec3 vColor;varying float vAlpha;
      void main(){vec4 t=texture2D(uMap,gl_PointCoord);float a=t.a*vAlpha*uOpacity;if(a<.0015)discard;gl_FragColor=vec4(vColor,a);}`
  });
}

const mats=[];const objs=[];
function makeSystem(count,generator,mat){
  mats.push(mat);
  const p=new Float32Array(count*3),c=new Float32Array(count*3),s=new Float32Array(count),a=new Float32Array(count),seed=new Float32Array(count);
  let i=0,guard=0;
  while(i<count&&guard<count*16){guard++;const v=generator();if(!v)continue;
    p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z||0;c[i*3]=v.col[0];c[i*3+1]=v.col[1];c[i*3+2]=v.col[2];s[i]=v.size;a[i]=v.alpha;seed[i]=rnd();i++;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setAttribute('aSize',new THREE.BufferAttribute(s,1));g.setAttribute('aAlpha',new THREE.BufferAttribute(a,1));g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));g.setDrawRange(0,i);
  const pts=new THREE.Points(g,mat);scene.add(pts);objs.push(pts);return pts;
}

function clear(){for(const o of objs.splice(0)){scene.remove(o);o.geometry.dispose();}for(const m of mats.splice(0))m.dispose();}

function build(){
  clear();rnd=rngFactory(21092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  // Whole-sky small stars: only the micro/mid layers are raised in size and brightness.
  makeSystem(76000,()=>{
    const q=rnd();let size,alpha;
    if(q<.80){size=rand(.90,1.16);alpha=rand(.26,.52);}
    else if(q<.982){size=rand(1.16,1.43);alpha=rand(.34,.60);}
    else{size=rand(1.43,1.66);alpha=rand(.44,.69);}
    let col=pick(PAL.sky).slice();const dim=rand(.84,1.07);col=col.map(v=>Math.min(1,v*dim));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:0,col,size,alpha};
  },makeMaterial(1.78,.020,1.02,1.12));

  // Milky Way micro-grain layer: slightly more visible but still fine and compact.
  const x0=-W*.59,y0=64,x1=W*.56,y1=-45;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{const bend=Math.sin((t+.05)*Math.PI)*W*.021+Math.sin(t*6.1+1.3)*1.25+Math.sin(t*14)*.36;return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};};
  const coreW=t=>Math.exp(-Math.pow((t-.67)/.205,2));

  makeSystem(42000,()=>{
    const t=rand(-.04,1.04),p=band(t),cw=coreW(t),sigma=8+rand(0,6)+cw*7,off=gauss()*sigma;
    const feather=Math.exp(-.5*(off/(sigma*1.35))**2);if(rnd()>feather*.88)return null;
    const q=rnd();let col=q<(.30+.30*cw)?pick(PAL.warm):q<.72?pick(PAL.cool):q<.90?pick(PAL.violet):pick(PAL.sky);
    col=col.map(v=>Math.min(1,v*rand(.82,1.10)));
    const size=rnd()<.91?rand(.94,1.24):rand(1.24,1.52);
    const alpha=rand(.27,.57)*(.64+.36*feather);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.25,col,size,alpha};
  },makeMaterial(1.68,.024,1.05,1.10));

  // Compact colored accents remain restrained so they do not become oversized stars.
  makeSystem(900,()=>{
    const col=rnd()<.35?pick(PAL.cool):rnd()<.68?pick(PAL.warm):pick(PAL.violet);
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:.4,col,size:rand(1.18,1.48),alpha:rand(.42,.70)};
  },makeMaterial(1.60,.040,.92,1.08));

  if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},300);}
}

build();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(build,120);});
