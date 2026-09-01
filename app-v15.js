import './app-v14.js';
import * as THREE from 'three';

// v15 — refinement pass over the v14 particle sky.
// Keeps the successful all-particle approach, but adds hierarchical clumps,
// fine star depth, color-temperature variation, warm core filaments,
// subtle emission knots and branching dust particles.

const title=document.querySelector('#title');
if(title)title.textContent='STARLIT FOREST · CINEMATIC PASS 15';
const loading=document.querySelector('#loading');
if(loading)loading.innerHTML='REFINING PARTICLE SKY<br><span style="opacity:.48">micro-star depth · stellar filaments · warm core clumps · branching dust · subtle nebulae</span>';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,premultipliedAlpha:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x000000,0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.domElement.id='particle-sky-v15-detail';
Object.assign(renderer.domElement.style,{
  position:'fixed',left:'0',top:'0',width:'100vw',height:'72vh',zIndex:'3',pointerEvents:'none',
  maskImage:'linear-gradient(to bottom,black 0%,black 85%,rgba(0,0,0,.97) 91%,rgba(0,0,0,.64) 96%,transparent 100%)',
  webkitMaskImage:'linear-gradient(to bottom,black 0%,black 85%,rgba(0,0,0,.97) 91%,rgba(0,0,0,.64) 96%,transparent 100%)'
});
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-10,10);
camera.position.z=2;

function rngFactory(seed=15092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a=0,b=1)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const color=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];

const PAL={
  cold:[color(0xb8cced),color(0x97b4df),color(0xd4def0),color(0x9d9fc4)],
  neutral:[color(0xf1eee8),color(0xd9d8dc),color(0xe9dfd5)],
  warm:[color(0xf5dfbd),color(0xe8bd88),color(0xd99a69),color(0xc77b62),color(0xe9c7a0)],
  rose:[color(0xc181a5),color(0xa86e9b),color(0xd18b9a),color(0x8e78aa)],
  dust:[color(0x050508),color(0x09070b),color(0x100c12),color(0x151017)]
};

const mats=[];
function makeMaterial({opacity=1,blend=THREE.AdditiveBlending,soft=.35,twinkle=.02}={}){
  const m=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:blend,uniforms:{uOpacity:{value:opacity},uTime:{value:0},uTwinkle:{value:twinkle},uDpr:{value:renderer.getPixelRatio()},uSoft:{value:soft}},vertexShader:`
    attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;
    varying vec3 vColor;varying float vAlpha;
    uniform float uTime;uniform float uTwinkle;uniform float uDpr;
    void main(){
      vColor=color;vAlpha=aAlpha;
      float tw=1.0+sin(aSeed*83.0+uTime*(.32+aSeed*.58))*uTwinkle;
      gl_PointSize=max(1.0,aSize*uDpr*tw);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    }`,fragmentShader:`
    varying vec3 vColor;varying float vAlpha;
    uniform float uOpacity;uniform float uSoft;
    void main(){
      vec2 q=gl_PointCoord-.5;float d=length(q)*2.0;
      if(d>1.0)discard;
      float core=1.0-smoothstep(max(.02,uSoft),1.0,d);
      float a=core*vAlpha*uOpacity;
      if(a<.002)discard;
      gl_FragColor=vec4(vColor,a);
    }`});
  mats.push(m);return m;
}

function points(count,gen,mat){
  const p=new Float32Array(count*3),c=new Float32Array(count*3),s=new Float32Array(count),a=new Float32Array(count),seed=new Float32Array(count);
  let i=0,guard=0;
  while(i<count&&guard<count*16){guard++;const v=gen(i);if(!v)continue;
    p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z||0;
    c[i*3]=v.col[0];c[i*3+1]=v.col[1];c[i*3+2]=v.col[2];s[i]=v.size;a[i]=v.alpha;seed[i]=rnd();i++;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(p,3));
  g.setAttribute('color',new THREE.BufferAttribute(c,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(s,1));
  g.setAttribute('aAlpha',new THREE.BufferAttribute(a,1));
  g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));g.setDrawRange(0,i);
  const o=new THREE.Points(g,mat);scene.add(o);return o;
}

let objects=[];
function clear(){for(const o of objects){scene.remove(o);o.geometry.dispose();}objects=[];while(mats.length)mats.pop().dispose();}

function build(){
  clear();rnd=rngFactory(15092026);
  const vh=Math.max(1,innerHeight*.72),aspect=innerWidth/vh,H=100,W=H*aspect;
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,vh,false);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));

  const x0=-W*.30,y0=62,x1=W*.34,y1=-39,dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{const bend=Math.sin(t*Math.PI)*W*.020+Math.sin(t*7.2)*1.2;return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};};
  const coreW=t=>Math.exp(-Math.pow((t-.70)/.19,2));
  const lane=(t,k)=>(k-2.6)*1.85+Math.sin(t*(6.7+k*1.32)+k*1.53)*(1.0+.23*k)+Math.sin(t*18.5+k*.7)*.45;
  const laneDistance=(t,off)=>{let d=99;for(let k=0;k<7;k++)d=Math.min(d,Math.abs(off-lane(t,k)));return d;};

  // Hierarchical clump anchors: these stop the galaxy reading as a uniform stripe.
  const anchors=[];
  for(let i=0;i<44;i++){
    const t=rand(-.03,1.03),p=band(t),cw=coreW(t),side=gauss()*(4.0+cw*5.8);
    anchors.push({t,x:p.x+nx*side,y:p.y+ny*side,r:rand(1.4,4.8+cw*3.5),gain:rand(.55,1.15),warm:rnd()<(.32+.48*cw)});
  }

  // A) Extra ultra-fine background depth. Nearly all remain ~1 px or smaller-looking via alpha.
  objects.push(points(48000,()=>{
    const q=rnd();let size,alpha;
    if(q>.9995){size=rand(2.0,2.8);alpha=rand(.50,.78)}
    else if(q>.986){size=rand(1.15,1.65);alpha=rand(.20,.46)}
    else{size=rand(.55,1.02);alpha=rand(.025,.13)}
    let col=rnd()<.63?pick(PAL.cold):rnd()<.82?pick(PAL.neutral):pick(PAL.warm);
    col=col.map(v=>v*rand(.70,.94));
    return{x:rand(-W/2,W/2),y:rand(-49,50),z:.05,col,size,alpha};
  },makeMaterial({opacity:.72,soft:.18,twinkle:.025})));

  // B) Cool diffuse outer stellar cloud — broad but extremely fine.
  objects.push(points(19000,()=>{
    const t=rand(-.10,1.10),p=band(t),cw=coreW(t),sigma=13+rand(0,8)+cw*3.5,off=gauss()*sigma;
    const feather=Math.exp(-.5*Math.pow(off/(sigma*1.35),2));if(rnd()>feather*.72)return null;
    const col=(rnd()<.76?pick(PAL.cold):pick(PAL.neutral)).map(v=>v*rand(.70,.94));
    return{x:p.x+nx*off,y:p.y+ny*off,z:.15,col,size:rand(.65,1.18),alpha:rand(.018,.085)*feather};
  },makeMaterial({opacity:.72,soft:.38,twinkle:.008})));

  // C) Fine stellar filaments following several neighboring paths inside the Milky Way.
  objects.push(points(36000,()=>{
    const t=rand(-.04,1.06),p=band(t),cw=coreW(t),f=Math.floor(rand(0,9));
    const filament=(f-4)*1.05+Math.sin(t*(8.2+f*.62)+f*1.1)*(1.0+.12*f);
    const off=filament+gauss()*rand(.7,2.35+cw*1.5),d=laneDistance(t,off);
    if(d<.48&&rnd()<.90)return null;
    const col=(cw>.28&&rnd()<.48?pick(PAL.warm):rnd()<.78?pick(PAL.neutral):pick(PAL.cold)).map(v=>v*rand(.82,1.02));
    return{x:p.x+nx*off,y:p.y+ny*off,z:.35,col,size:rand(.58,1.15),alpha:rand(.07,.27)*(d<1.2?.45:1)};
  },makeMaterial({opacity:.88,soft:.20,twinkle:.028})));

  // D) Hierarchical star clumps: granular knots with different color temperatures and scales.
  objects.push(points(26000,()=>{
    const cl=pick(anchors),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.62));if(rnd()>fade*.94)return null;
    const t=cl.t,cw=coreW(t);let col=cl.warm?pick(PAL.warm):(rnd()<.70?pick(PAL.neutral):pick(PAL.cold));
    if(rnd()<.065)col=pick(PAL.rose);col=col.map(v=>Math.min(1,v*rand(.83,1.06)));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.45,col,size:rnd()<.975?rand(.58,1.18):rand(1.3,1.9),alpha:rand(.055,.30)*fade*cl.gain*(.78+.22*cw)};
  },makeMaterial({opacity:.93,soft:.22,twinkle:.026})));

  // E) Rich warm core grains — concentrated, mottled, never a flat bright patch.
  objects.push(points(13500,()=>{
    const t=clamp(.42+Math.abs(gauss())*.22,.38,.99),p=band(t),cw=coreW(t),off=gauss()*(3.8+cw*7.0),d=laneDistance(t,off);
    if(d<.55&&rnd()<.93)return null;
    let col=rnd()<.68?pick(PAL.warm):rnd()<.86?pick(PAL.neutral):pick(PAL.rose);col=col.map(v=>Math.min(1,v*rand(.88,1.08)));
    return{x:p.x+nx*off,y:p.y+ny*off,z:.55,col,size:rand(.62,1.32),alpha:rand(.07,.31)*(.35+.65*cw)*(d<1.25?.55:1)};
  },makeMaterial({opacity:.95,soft:.24,twinkle:.024})));

  // F) Tiny muted emission knots — enough color to reward close inspection, never neon.
  const nebAnchors=Array.from({length:19},()=>{const t=rand(.18,.90),p=band(t),side=rand(-7,7);return{x:p.x+nx*side,y:p.y+ny*side,r:rand(.8,2.6),col:pick(PAL.rose)};});
  objects.push(points(2400,()=>{
    const cl=pick(nebAnchors),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.55));if(rnd()>fade)return null;
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.65,col:cl.col.map(v=>v*rand(.85,1.05)),size:rand(.72,1.55),alpha:rand(.035,.16)*fade};
  },makeMaterial({opacity:.72,soft:.34,twinkle:.008})));

  // G) Branching dark particulate Great Rift. Soft black/brown particles darken the luminous layers beneath.
  objects.push(points(7600,()=>{
    const t=rand(.01,.99),p=band(t),k=Math.floor(rand(0,7)),cw=coreW(t),center=lane(t,k),off=center+gauss()*rand(.45,1.75+cw*.7);
    const col=pick(PAL.dust);return{x:p.x+nx*off,y:p.y+ny*off,z:.90,col,size:rand(2.4,7.8+cw*3.2),alpha:rand(.035,.13)+cw*.018};
  },makeMaterial({opacity:.74,blend:THREE.NormalBlending,soft:.50,twinkle:0})));

  // H) Fine foreground sparkles after dust: mostly tiny, only a handful strong.
  objects.push(points(2100,()=>{
    const t=rand(.02,.98),p=band(t),cw=coreW(t),off=gauss()*(3.5+cw*4.2),d=laneDistance(t,off);if(d<.7&&rnd()<.86)return null;
    const col=rnd()<.42?pick(PAL.warm):rnd()<.78?pick(PAL.neutral):pick(PAL.cold);
    return{x:p.x+nx*off,y:p.y+ny*off,z:1.0,col,size:rnd()<.985?rand(.75,1.45):rand(1.7,2.4),alpha:rand(.18,.58)};
  },makeMaterial({opacity:.94,soft:.16,twinkle:.045})));

  // I) Very few tasteful hero stars with restrained glow.
  objects.push(points(28,()=>{
    const col=rnd()<.58?pick(PAL.cold):pick(PAL.warm);
    return{x:rand(-W/2,W/2),y:rand(-42,49),z:1.1,col,size:rand(2.2,3.35),alpha:rand(.55,.82)};
  },makeMaterial({opacity:.92,soft:.24,twinkle:.055})));
  objects.push(points(28,()=>{
    const col=rnd()<.58?pick(PAL.cold):pick(PAL.warm);
    return{x:rand(-W/2,W/2),y:rand(-42,49),z:1.05,col,size:rand(5.5,9.0),alpha:rand(.025,.07)};
  },makeMaterial({opacity:.55,soft:.55,twinkle:.02})));
}

build();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}
animate();
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(build,140);});
setTimeout(()=>{if(loading){loading.style.opacity='0';setTimeout(()=>loading.remove(),800);}},900);
