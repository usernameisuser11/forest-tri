import './app-v7.js';
import * as THREE from 'three';

// v14 — the entire visible sky is built from particle systems.
// Technique inspired by the user's galaxy references: per-particle size/color/alpha,
// shader-based point sprites, separate stellar/gas/dust populations, and dark dust particles.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT FOREST · CINEMATIC PASS 14';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='BUILDING PARTICLE SKY<br><span style="opacity:.48">micro-stars · stellar clouds · warm core · nebulae · particle dust rift</span>';
const ui=document.querySelector('#ui');
if(ui) ui.style.zIndex='8';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x02050d,1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.domElement.id='particle-sky-v14';
Object.assign(renderer.domElement.style,{
  position:'fixed',left:'0',top:'0',width:'100vw',height:'72vh',zIndex:'2',pointerEvents:'none',
  maskImage:'linear-gradient(to bottom,black 0%,black 84%,rgba(0,0,0,.96) 90%,rgba(0,0,0,.62) 96%,transparent 100%)',
  webkitMaskImage:'linear-gradient(to bottom,black 0%,black 84%,rgba(0,0,0,.96) 90%,rgba(0,0,0,.62) 96%,transparent 100%)'
});
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-10,10);
camera.position.z=2;

function rngFactory(seed=14092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a=0,b=1)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rgb=(hex)=>{const c=new THREE.Color(hex);return[c.r,c.g,c.b];};

const PAL={
  bg:[rgb(0xdbe7ff),rgb(0xf2f3f7),rgb(0xaecbff),rgb(0xffdfb8),rgb(0xd4cfdf)],
  outer:[rgb(0x9eb2d2),rgb(0xb7c4d5),rgb(0x8da5c8),rgb(0xc2c4ce),rgb(0xa798bc)],
  core:[rgb(0xf4dfbd),rgb(0xe7bd86),rgb(0xcf9268),rgb(0xf0cfa2),rgb(0xc8877d),rgb(0xb997b8)],
  neb:[rgb(0xb276a3),rgb(0x936fa4),rgb(0xc68092),rgb(0x7e82b0)],
  dust:[rgb(0x08070b),rgb(0x0d0b11),rgb(0x131019),rgb(0x19131b)]
};
const pick=a=>a[Math.floor(rnd()*a.length)];

function radialTexture(kind='star'){
  const c=document.createElement('canvas');c.width=c.height=96;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(48,48,0,48,48,48);
  if(kind==='star'){
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.16,'rgba(255,255,255,.94)');g.addColorStop(.42,'rgba(255,255,255,.30)');g.addColorStop(1,'rgba(0,0,0,0)');
  }else if(kind==='soft'){
    g.addColorStop(0,'rgba(255,255,255,.58)');g.addColorStop(.32,'rgba(255,255,255,.24)');g.addColorStop(1,'rgba(0,0,0,0)');
  }else{
    g.addColorStop(0,'rgba(255,255,255,.72)');g.addColorStop(.40,'rgba(255,255,255,.32)');g.addColorStop(1,'rgba(0,0,0,0)');
  }
  x.fillStyle=g;x.fillRect(0,0,96,96);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const starTex=radialTexture('star'),softTex=radialTexture('soft'),dustTex=radialTexture('dust');

const mats=[];
function material(texture,{opacity=1,blending=THREE.AdditiveBlending,twinkle=.03,scale=1}={}){
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending,uniforms:{
    uMap:{value:texture},uOpacity:{value:opacity},uTime:{value:0},uTwinkle:{value:twinkle},uScale:{value:scale},uDpr:{value:renderer.getPixelRatio()}
  },vertexShader:`
    attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;
    varying vec3 vColor;varying float vAlpha;
    uniform float uTime;uniform float uTwinkle;uniform float uScale;uniform float uDpr;
    void main(){vColor=color;vAlpha=aAlpha;float tw=1.0+sin(uTime*(.45+aSeed*.55)+aSeed*47.0)*uTwinkle;gl_PointSize=max(1.0,aSize*uScale*uDpr*tw);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
  `,fragmentShader:`
    uniform sampler2D uMap;uniform float uOpacity;varying vec3 vColor;varying float vAlpha;
    void main(){vec4 t=texture2D(uMap,gl_PointCoord);float a=t.a*vAlpha*uOpacity;if(a<.003)discard;gl_FragColor=vec4(vColor,a);}
  `});mats.push(m);return m;
}

function system(count,generator,mat){
  const p=new Float32Array(count*3),c=new Float32Array(count*3),s=new Float32Array(count),a=new Float32Array(count),seed=new Float32Array(count);
  let i=0,guard=0;while(i<count&&guard<count*12){guard++;const v=generator(i);if(!v)continue;p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z??0;c[i*3]=v.color[0];c[i*3+1]=v.color[1];c[i*3+2]=v.color[2];s[i]=v.size;a[i]=v.alpha;seed[i]=rnd();i++;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setAttribute('aSize',new THREE.BufferAttribute(s,1));g.setAttribute('aAlpha',new THREE.BufferAttribute(a,1));g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));g.setDrawRange(0,i);const pts=new THREE.Points(g,mat);scene.add(pts);return pts;
}

let skyObjects=[];
function clearSky(){for(const o of skyObjects){scene.remove(o);o.geometry?.dispose();}skyObjects=[];while(mats.length)mats.pop().dispose();}

function buildSky(){
  clearSky();rnd=rngFactory(14092026);
  const aspect=innerWidth/Math.max(1,innerHeight*.72),H=100,W=H*aspect;
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,Math.max(1,innerHeight*.72),false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));

  const x0=-W*.30,y0=62,x1=W*.34,y1=-39,dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>({x:lerp(x0,x1,t)+nx*(Math.sin(t*Math.PI)*W*.020+Math.sin(t*7.2)*1.2),y:lerp(y0,y1,t)+ny*(Math.sin(t*Math.PI)*W*.020+Math.sin(t*7.2)*1.2)});
  const coreW=t=>Math.exp(-Math.pow((t-.69)/.20,2));
  const lane=(t,k)=>(k-2.5)*2.1+Math.sin(t*(7.0+k*1.55)+k*1.4)*(1.4+.28*k)+Math.sin(t*19+k)*.55;
  const dustFactor=(t,off)=>{let d=99;for(let k=0;k<6;k++)d=Math.min(d,Math.abs(off-lane(t,k)));return clamp((d-.55)/2.4,0,1);};

  // 1) Deep all-sky micro-stars: almost everything is tiny.
  skyObjects.push(system(56000,()=>{const q=rnd();let size,alpha;if(q>.9994){size=rand(2.1,3.5);alpha=rand(.68,1)}else if(q>.978){size=rand(.8,1.45);alpha=rand(.28,.72)}else{size=rand(.28,.66);alpha=rand(.10,.38)}let col=pick(PAL.bg);if(rnd()<.32)col=col.map(v=>v*rand(.72,.95));return{x:rand(-W/2,W/2),y:rand(-49,50),z:0,color:col,size,alpha};},material(starTex,{opacity:.95,twinkle:.045,scale:1})));

  // 2) Broad cool stellar envelope: feathered, irregular, never a hard-edged tube.
  skyObjects.push(system(40000,()=>{const t=rand(-.08,1.10),p=band(t),cw=coreW(t),sigma=12+rand(0,8)+cw*5,off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.18))**2);if(rnd()>feather*.83)return null;let col=pick(PAL.outer).slice();if(rnd()<.15)col=pick(PAL.neb).map(v=>v*.82);return{x:p.x+nx*off,y:p.y+ny*off,z:.1,color:col,size:rand(.28,.78),alpha:rand(.035,.16)*feather};},material(softTex,{opacity:.9,twinkle:.015,scale:1})));

  // 3) Main Milky Way granular population, with real gaps carved by the Great Rift.
  skyObjects.push(system(62000,()=>{const t=rand(-.05,1.08),p=band(t),cw=coreW(t),sigma=6.5+rand(0,5.2)+cw*6.5,off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.32))**2),df=dustFactor(t,off);if(rnd()>feather*(.78+.14*cw)*(.28+.72*df))return null;const r=rnd();let col;if(cw>.25&&r<.46)col=pick(PAL.core);else if(r<.73)col=pick(PAL.outer);else if(r<.86)col=pick(PAL.neb);else col=rgb(0xe8e0d5);return{x:p.x+nx*off,y:p.y+ny*off,z:.2,color:col,size:rnd()<.982?rand(.32,.82):rand(1.0,1.75),alpha:rand(.07,.34)*feather};},material(starTex,{opacity:1,twinkle:.032,scale:1})));

  // 4) Warm Galactic-center particle bulge: ivory / amber / dusty rose, not white.
  skyObjects.push(system(14500,()=>{let t=clamp(.43+Math.abs(gauss())*.18,.40,.98),p=band(t),cw=coreW(t),off=gauss()*(5.0+cw*8.8),df=dustFactor(t,off);if(rnd()>(.35+.65*df))return null;let col=pick(PAL.core).slice();if(rnd()<.25)col=col.map(v=>Math.min(1,v*1.08));return{x:p.x+nx*off,y:p.y+ny*off,z:.25,color:col,size:rand(.38,1.05),alpha:rand(.10,.42)*( .45+.55*cw)};},material(softTex,{opacity:.96,twinkle:.02,scale:1.15})));

  // 5) Emission regions: clustered muted rose/violet/blue particles, all still particles.
  const clusters=Array.from({length:13},()=>{const t=rand(.18,.88),p=band(t),side=rand(-11,11);return{x:p.x+nx*side,y:p.y+ny*side,t,r:rand(2.5,6.5),col:pick(PAL.neb)};});
  skyObjects.push(system(9000,()=>{const cl=pick(clusters),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.75));if(rnd()>fade)return null;const col=cl.col.map(v=>v*rand(.86,1.05));return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.3,color:col,size:rand(.45,1.45),alpha:rand(.035,.18)*fade};},material(softTex,{opacity:.8,twinkle:.012,scale:1.35})));

  // 6) Branching Great Rift made of dark particles, plus the density gaps above.
  skyObjects.push(system(16500,()=>{const t=rand(.02,.98),p=band(t),k=Math.floor(rand(0,6)),center=lane(t,k),off=center+gauss()*rand(.8,2.3),cw=coreW(t);const col=pick(PAL.dust);return{x:p.x+nx*off,y:p.y+ny*off,z:.5,color:col,size:rand(3.0,10.0+cw*4),alpha:rand(.055,.19)+cw*.035};},material(dustTex,{opacity:.82,blending:THREE.NormalBlending,twinkle:0,scale:1})));

  // 7) Fine bright knots re-seeded after dust so the Milky Way stays stellar.
  skyObjects.push(system(5600,()=>{const t=rand(.03,.97),p=band(t),cw=coreW(t),off=gauss()*(4.2+cw*4.5),df=dustFactor(t,off);if(rnd()>(.28+.72*df))return null;const col=rnd()<.45?pick(PAL.core):pick(PAL.outer);return{x:p.x+nx*off,y:p.y+ny*off,z:.7,color:col,size:rand(.55,1.65),alpha:rand(.22,.70)};},material(starTex,{opacity:1,twinkle:.05,scale:1})));

  // 8) Only a handful of prominent stars.
  skyObjects.push(system(72,()=>{const col=pick(PAL.bg);return{x:rand(-W/2,W/2),y:rand(-45,49),z:.8,color:col,size:rand(2.0,4.0),alpha:rand(.70,1)};},material(starTex,{opacity:1,twinkle:.08,scale:1.15})));

  // 9) Low atmospheric particle glow instead of a painted gradient.
  skyObjects.push(system(3600,()=>{const warm=rnd()<.58,col=warm?pick(PAL.neb):pick(PAL.outer);return{x:rand(-W/2,W/2),y:-43+Math.abs(gauss())*5,z:-.2,color:col,size:rand(3,10),alpha:rand(.008,.035)};},material(softTex,{opacity:.58,twinkle:0,scale:1.5})));
}

buildSky();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(buildSky,160);});
