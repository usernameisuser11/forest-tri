import './app-v18.js';
import * as THREE from 'three';

// v22 — rebalance perceived star scale.
// The detailed v18 cosmos is gently dimmed so large highlights recede,
// while this overlay restores brighter, clearly readable small stars.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 22';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='REBALANCING STAR SCALE<br><span style="opacity:.48">restrained bright stars · larger brighter micro-stars · dense chromatic Milky Way grains</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · rebalanced particle sky';
const ui=document.querySelector('#ui');
if(ui) ui.style.zIndex='10';

// v18 already contains the detailed Milky Way / dust / nebula structure.
// Slightly dim that base pass so its brightest stars feel smaller without losing the structure.
const baseCanvas=document.querySelector('canvas');
if(baseCanvas){
  baseCanvas.style.filter='brightness(.82) saturate(.98)';
}

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

function rngFactory(seed=22092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const lerp=(a,b,t)=>a+(b-a)*t;
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];

const PAL={
  sky:[rgb(0xd8e6ff),rgb(0xf5f6ff),rgb(0xfff1d6),rgb(0xffdfb3),rgb(0xbad1ff),rgb(0xc4abe4),rgb(0xe5a0b9),rgb(0xa8c2ff)],
  cool:[rgb(0xbcd2fb),rgb(0x9ab9ee),rgb(0xd6e1f4),rgb(0xa29bd1),rgb(0x7ea6f2)],
  warm:[rgb(0xffefcf),rgb(0xf7d1a1),rgb(0xefb17c),rgb(0xde946b),rgb(0xe9b6a8)],
  violet:[rgb(0xbda0df),rgb(0xa489d5),rgb(0xd5a0cb),rgb(0x9584cf)]
};

function starTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);
  // Tight core: brighter point without a large blurry halo.
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(.08,'rgba(255,255,255,1)');
  g.addColorStop(.20,'rgba(255,255,255,.78)');
  g.addColorStop(.38,'rgba(255,255,255,.23)');
  g.addColorStop(.62,'rgba(255,255,255,.035)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const tex=starTexture();

function makeMaterial({minSize=1.24,maxSize=1.82,twinkle=.02,opacity=1}={}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uMap:{value:tex},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uMin:{value:minSize},uMax:{value:maxSize},uOpacity:{value:opacity}},
    vertexShader:`
      attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;
      varying vec3 vColor;varying float vAlpha;
      uniform float uTime;uniform float uDpr;uniform float uMin;uniform float uMax;
      void main(){
        vColor=color;vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(.18+aSeed*.44)+aSeed*61.0)*${twinkle.toFixed(3)};
        float ps=aSize*uDpr*tw;
        gl_PointSize=clamp(ps,uMin*uDpr,uMax*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uMap;uniform float uOpacity;varying vec3 vColor;varying float vAlpha;
      void main(){
        vec4 t=texture2D(uMap,gl_PointCoord);
        float a=t.a*vAlpha*uOpacity;
        if(a<.0012)discard;
        gl_FragColor=vec4(vColor,a);
      }`
  });
}

const mats=[],objs=[];
function makeSystem(count,generator,mat){
  mats.push(mat);
  const p=new Float32Array(count*3),c=new Float32Array(count*3),s=new Float32Array(count),a=new Float32Array(count),seed=new Float32Array(count);
  let i=0,guard=0;
  while(i<count&&guard<count*20){
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
  clear();rnd=rngFactory(22092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  // Main small-star ocean: clearly larger + brighter than v21.
  makeSystem(92000,()=>{
    const q=rnd();let size,alpha;
    if(q<.84){size=rand(1.12,1.38);alpha=rand(.36,.64);}
    else if(q<.988){size=rand(1.38,1.62);alpha=rand(.44,.72);}
    else{size=rand(1.62,1.78);alpha=rand(.52,.78);}
    let col=pick(PAL.sky).slice();
    const gain=rand(.96,1.16);col=col.map(v=>Math.min(1,v*gain));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:0,col,size,alpha};
  },makeMaterial({minSize:1.24,maxSize:1.82,twinkle:.018,opacity:1.04}));

  // Extra Milky Way grains: same broad diagonal, stronger readable micro-stars.
  const x0=-W*.59,y0=64,x1=W*.56,y1=-45;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{const bend=Math.sin((t+.05)*Math.PI)*W*.021+Math.sin(t*6.1+1.3)*1.25+Math.sin(t*14)*.36;return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};};
  const coreW=t=>Math.exp(-Math.pow((t-.67)/.205,2));

  makeSystem(56000,()=>{
    const t=rand(-.05,1.05),p=band(t),cw=coreW(t),sigma=8+rand(0,6.5)+cw*7.5,off=gauss()*sigma;
    const feather=Math.exp(-.5*(off/(sigma*1.38))**2);
    if(rnd()>feather*.91)return null;
    const q=rnd();let col=q<(.32+.30*cw)?pick(PAL.warm):q<.72?pick(PAL.cool):q<.90?pick(PAL.violet):pick(PAL.sky);
    col=col.map(v=>Math.min(1,v*rand(.94,1.14)));
    const size=rnd()<.90?rand(1.10,1.42):rand(1.42,1.66);
    const alpha=rand(.34,.68)*(.70+.30*feather);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.25,col,size,alpha};
  },makeMaterial({minSize:1.18,maxSize:1.72,twinkle:.022,opacity:1.03}));

  // Bright accents: fewer, slightly smaller, slightly dimmer than v21.
  makeSystem(520,()=>{
    let col=rnd()<.35?pick(PAL.cool):rnd()<.68?pick(PAL.warm):pick(PAL.violet);
    col=col.map(v=>Math.min(1,v*rand(.84,.96)));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:.4,col,size:rand(.98,1.24),alpha:rand(.28,.50)};
  },makeMaterial({minSize:1.02,maxSize:1.42,twinkle:.032,opacity:.84}));

  if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},300);}
}

build();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(build,120);});
