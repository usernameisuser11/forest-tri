import './app-v18.js';
import * as THREE from 'three';

// v23 — reference-matched star readability pass.
// Keep the large highlights restrained while making the small stars visibly larger and much brighter.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 23';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='MATCHING REFERENCE STARLIGHT<br><span style="opacity:.48">brighter larger micro-stars · dense chromatic field · restrained highlights</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · reference-matched particle sky';
const ui=document.querySelector('#ui');
if(ui) ui.style.zIndex='10';

// Keep v18's Milky Way structure, but suppress its oversized highlights slightly.
const baseCanvas=document.querySelector('canvas');
if(baseCanvas){
  baseCanvas.style.filter='brightness(.78) saturate(1.03) contrast(1.02)';
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

function rngFactory(seed=23092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const lerp=(a,b,t)=>a+(b-a)*t;
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];

const PAL={
  sky:[rgb(0xddeaff),rgb(0xf8f8ff),rgb(0xfff3da),rgb(0xffdfb0),rgb(0xb8d2ff),rgb(0xc9b1eb),rgb(0xe6a0bd),rgb(0x9fbfff)],
  cool:[rgb(0xc3d9ff),rgb(0x9dbcf4),rgb(0xd8e4f7),rgb(0xa49bd9),rgb(0x7ca8ff)],
  warm:[rgb(0xfff0d0),rgb(0xf8d0a0),rgb(0xefad77),rgb(0xdf9368),rgb(0xecb8a8)],
  violet:[rgb(0xc4a4e7),rgb(0xaa8bdc),rgb(0xdca5d4),rgb(0x9b86d7)],
  rose:[rgb(0xf0a5be),rgb(0xde8aaa),rgb(0xc996b5)]
};

function starTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);
  // Brighter compact core, still without a wide blurry halo.
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(.07,'rgba(255,255,255,1)');
  g.addColorStop(.18,'rgba(255,255,255,.92)');
  g.addColorStop(.34,'rgba(255,255,255,.42)');
  g.addColorStop(.55,'rgba(255,255,255,.11)');
  g.addColorStop(.78,'rgba(255,255,255,.02)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const tex=starTexture();

function makeMaterial({minSize=1.42,maxSize=2.02,twinkle=.018,opacity=1.08}={}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uMap:{value:tex},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uMin:{value:minSize},uMax:{value:maxSize},uOpacity:{value:opacity}},
    vertexShader:`
      attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;
      varying vec3 vColor;varying float vAlpha;
      uniform float uTime;uniform float uDpr;uniform float uMin;uniform float uMax;
      void main(){
        vColor=color;vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(.16+aSeed*.40)+aSeed*59.0)*${twinkle.toFixed(3)};
        float ps=aSize*uDpr*tw;
        gl_PointSize=clamp(ps,uMin*uDpr,uMax*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uMap;uniform float uOpacity;varying vec3 vColor;varying float vAlpha;
      void main(){
        vec4 t=texture2D(uMap,gl_PointCoord);
        float a=t.a*vAlpha*uOpacity;
        if(a<.0010)discard;
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
  clear();rnd=rngFactory(23092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  // Main all-sky small-star field: visibly larger and much brighter than v22.
  makeSystem(118000,()=>{
    const q=rnd();let size,alpha;
    if(q<.86){size=rand(1.30,1.58);alpha=rand(.50,.78);}
    else if(q<.992){size=rand(1.58,1.84);alpha=rand(.58,.84);}
    else{size=rand(1.84,1.98);alpha=rand(.66,.90);}
    let col=pick(PAL.sky).slice();
    const gain=rand(1.00,1.20);col=col.map(v=>Math.min(1,v*gain));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:0,col,size,alpha};
  },makeMaterial({minSize:1.42,maxSize:2.02,twinkle:.016,opacity:1.12}));

  // Secondary pinpoint layer: adds the dense sparkling texture seen in the reference.
  makeSystem(46000,()=>{
    let col=(rnd()<.42?pick(PAL.cool):rnd()<.68?pick(PAL.sky):rnd()<.86?pick(PAL.warm):pick(PAL.violet)).slice();
    col=col.map(v=>Math.min(1,v*rand(.92,1.12)));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:.08,col,size:rand(1.18,1.48),alpha:rand(.34,.58)};
  },makeMaterial({minSize:1.28,maxSize:1.62,twinkle:.014,opacity:1.02}));

  // Milky Way micro-grains: brighter and denser than the surrounding field.
  const x0=-W*.59,y0=64,x1=W*.56,y1=-45;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{const bend=Math.sin((t+.05)*Math.PI)*W*.021+Math.sin(t*6.1+1.3)*1.25+Math.sin(t*14)*.36;return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};};
  const coreW=t=>Math.exp(-Math.pow((t-.67)/.205,2));

  makeSystem(76000,()=>{
    const t=rand(-.05,1.05),p=band(t),cw=coreW(t),sigma=8+rand(0,6.5)+cw*8.0,off=gauss()*sigma;
    const feather=Math.exp(-.5*(off/(sigma*1.40))**2);
    if(rnd()>feather*.94)return null;
    const q=rnd();let col=q<(.34+.30*cw)?pick(PAL.warm):q<.70?pick(PAL.cool):q<.84?pick(PAL.violet):q<.94?pick(PAL.rose):pick(PAL.sky);
    col=col.map(v=>Math.min(1,v*rand(.98,1.18)));
    const size=rnd()<.91?rand(1.28,1.62):rand(1.62,1.88);
    const alpha=rand(.48,.82)*(.72+.28*feather);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.26,col,size,alpha};
  },makeMaterial({minSize:1.38,maxSize:1.94,twinkle:.020,opacity:1.12}));

  // Large highlights: fewer, smaller and slightly dimmer than v22.
  makeSystem(360,()=>{
    let col=rnd()<.35?pick(PAL.cool):rnd()<.68?pick(PAL.warm):pick(PAL.violet);
    col=col.map(v=>Math.min(1,v*rand(.80,.92)));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:.42,col,size:rand(.92,1.16),alpha:rand(.22,.42)};
  },makeMaterial({minSize:.96,maxSize:1.30,twinkle:.028,opacity:.78}));

  if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},300);}
}

build();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(build,120);});
