import * as THREE from 'three';

// v27.2 — robust standalone build.
// Single canvas, no previous imports, no requestAnimationFrame dependency during construction.

const title=document.querySelector('#title');
const loading=document.querySelector('#loading');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 27.2';
if(credit) credit.textContent='Three.js · robust staged particle Milky Way';

const show=(a,b='')=>{if(loading){loading.innerHTML=`${a}<br><span style="opacity:.48">${b}</span>`;}};
const fail=e=>{console.error(e);if(loading){loading.style.opacity='1';loading.innerHTML=`RENDER ERROR<br><span style="opacity:.65">${String(e?.message||e).slice(0,180)}</span>`;}};
window.addEventListener('error',e=>fail(e.error||e.message));
window.addEventListener('unhandledrejection',e=>fail(e.reason));

let renderer;
try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0x01030a,1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
  renderer.setSize(innerWidth,innerHeight,false);
  Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'1',pointerEvents:'none'});
  document.body.prepend(renderer.domElement);
}catch(e){fail(e);throw e;}

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-10,10);camera.position.z=3;

function rngFactory(seed=272092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];
const PAL={
 sky:[rgb(0xddeaff),rgb(0xf8f8ff),rgb(0xfff2d5),rgb(0xffdfb0),rgb(0xb7d1ff),rgb(0xc7afe9)],
 cool:[rgb(0xc3d9ff),rgb(0x9dbcf4),rgb(0x7ca8ff),rgb(0xa49bd9)],
 halo:[rgb(0x7186a7),rgb(0x8ca3c0),rgb(0x9ca9bd),rgb(0x77738f)],
 ivory:[rgb(0xfff5df),rgb(0xffeccb),rgb(0xf8ddb8)],
 warm:[rgb(0xf8c995),rgb(0xeea66e),rgb(0xdf8c60),rgb(0xe9aa91)],
 rose:[rgb(0xf0a1bb),rgb(0xde83a7),rgb(0xc98daf)],
 violet:[rgb(0xc09fe2),rgb(0xa486d7),rgb(0x7f73c8)],
 blue:[rgb(0x70a4ef),rgb(0x8dbdff),rgb(0x647bd4)],
 dust:[rgb(0x010205),rgb(0x020207),rgb(0x050409)]
};

function texture(soft=false){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);if(soft){g.addColorStop(0,'rgba(255,255,255,.58)');g.addColorStop(.25,'rgba(255,255,255,.22)');g.addColorStop(.6,'rgba(255,255,255,.045)');}else{g.addColorStop(0,'#fff');g.addColorStop(.09,'rgba(255,255,255,1)');g.addColorStop(.22,'rgba(255,255,255,.86)');g.addColorStop(.42,'rgba(255,255,255,.30)');g.addColorStop(.68,'rgba(255,255,255,.045)');}g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const starTex=texture(false),softTex=texture(true);
const mats=[],objs=[];
function mat(tex,{opacity=1,min=1,max=2,tw=.01,blend=THREE.AdditiveBlending}={}){const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:blend,uniforms:{uMap:{value:tex},uOpacity:{value:opacity},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uMin:{value:min},uMax:{value:max}},vertexShader:`attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;varying vec3 vColor;varying float vAlpha;uniform float uTime,uDpr,uMin,uMax;void main(){vColor=color;vAlpha=aAlpha;float k=1.0+sin(uTime*(.15+aSeed*.35)+aSeed*53.0)*${tw.toFixed(3)};gl_PointSize=clamp(aSize*uDpr*k,uMin*uDpr,uMax*uDpr);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform sampler2D uMap;uniform float uOpacity;varying vec3 vColor;varying float vAlpha;void main(){vec4 t=texture2D(uMap,gl_PointCoord);float a=t.a*vAlpha*uOpacity;if(a<.001)discard;gl_FragColor=vec4(vColor,a);}`});mats.push(m);return m;}
function system(attempts,fn,m,order){const p=new Float32Array(attempts*3),c=new Float32Array(attempts*3),s=new Float32Array(attempts),a=new Float32Array(attempts),seed=new Float32Array(attempts);let i=0;for(let n=0;n<attempts;n++){const v=fn();if(!v)continue;p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z||0;c[i*3]=v.col[0];c[i*3+1]=v.col[1];c[i*3+2]=v.col[2];s[i]=v.size;a[i]=v.alpha;seed[i]=rnd();i++;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setAttribute('aSize',new THREE.BufferAttribute(s,1));g.setAttribute('aAlpha',new THREE.BufferAttribute(a,1));g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));g.setDrawRange(0,i);const pts=new THREE.Points(g,m);pts.renderOrder=order;scene.add(pts);objs.push(pts);}
function clear(){for(const o of objs.splice(0)){scene.remove(o);o.geometry.dispose();}for(const m of mats.splice(0))m.dispose();}
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
let token=0;

async function build(){
 const mine=++token;clear();rnd=rngFactory(272092026);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.setSize(innerWidth,innerHeight,false);const W=100*innerWidth/Math.max(1,innerHeight);camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();
 const x0=-W*.60,y0=62,x1=W*.58,y1=-47,dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
 const band=t=>{const bend=Math.sin((t+.03)*Math.PI)*W*.024+Math.sin(t*5.3+1)*1.8+Math.sin(t*12.8)*.45;return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};};
 const core=t=>Math.exp(-Math.pow((t-.60)/.22,2));
 const main=t=>1+Math.sin(t*6+.5)*2.1+Math.sin(t*15.7+1.2)*.7;
 const dust=(t,o)=>clamp(Math.exp(-Math.pow((o-main(t))/(3.8+core(t)*1.2),2)),0,1);
 try{
  show('BUILDING STAR FIELD','1/6');
  system(36000,()=>{const q=rnd();let col=(rnd()<.45?pick(PAL.cool):rnd()<.76?pick(PAL.sky):pick(PAL.ivory)).slice();col=col.map(v=>v*rand(.85,1.05));return{x:rand(-W/2,W/2),y:rand(-50,50),z:-.8,col,size:q<.92?rand(1.18,1.44):rand(1.44,1.70),alpha:q<.92?rand(.30,.52):rand(.40,.64)};},mat(starTex,{opacity:.90,min:1.18,max:1.76}),1);
  renderer.render(scene,camera);await yieldUI();if(mine!==token)return;

  show('FORMING OUTER HALO','2/6');
  system(26000,()=>{const t=rand(-.1,1.1),p=band(t),cw=core(t),sig=23+rand(0,12)+cw*11,o=gauss()*sig,f=Math.exp(-.5*(o/(sig*1.35))**2);if(rnd()>f*.70)return null;let col=(rnd()<.65?pick(PAL.halo):rnd()<.84?pick(PAL.cool):pick(PAL.violet)).map(v=>v*rand(.46,.74));return{x:p.x+nx*o,y:p.y+ny*o,z:-.5,col,size:rand(3,8),alpha:rand(.012,.052)*f};},mat(softTex,{opacity:.74,min:1.6,max:8.2,tw:.001}),2);
  renderer.render(scene,camera);await yieldUI();if(mine!==token)return;

  show('BUILDING GALACTIC BODY','3/6');
  system(42000,()=>{const t=rand(-.05,1.05),p=band(t),cw=core(t),sig=14+rand(0,8)+cw*11,o=gauss()*sig,f=Math.exp(-.5*(o/(sig*1.32))**2),d=dust(t,o);if(rnd()>f*.79*(1-d*.45))return null;let col=(rnd()<(.32+.34*cw)?pick(PAL.ivory):rnd()<.67?pick(PAL.warm):rnd()<.84?pick(PAL.halo):pick(PAL.rose)).map(v=>v*rand(.62,.95));return{x:p.x+nx*o,y:p.y+ny*o,z:-.3,col,size:rand(2.8,8.5),alpha:rand(.02,.082)*f};},mat(softTex,{opacity:.94,min:1.7,max:8.8,tw:.001}),3);
  system(52000,()=>{const t=rand(-.06,1.06),p=band(t),cw=core(t),sig=12+rand(0,8)+cw*10,o=gauss()*sig,f=Math.exp(-.5*(o/(sig*1.34))**2),d=dust(t,o);if(rnd()>f*.84*(1-d*.70))return null;let col=(rnd()<(.26+.34*cw)?pick(PAL.ivory):rnd()<.58?pick(PAL.warm):rnd()<.78?pick(PAL.cool):rnd()<.90?pick(PAL.violet):pick(PAL.rose)).map(v=>Math.min(1,v*rand(.9,1.12)));return{x:p.x+nx*o,y:p.y+ny*o,z:-.05,col,size:rand(1.20,1.60),alpha:rand(.36,.70)*f*(1-d*.38)};},mat(starTex,{opacity:1.02,min:1.24,max:1.70,tw:.015}),4);
  renderer.render(scene,camera);await yieldUI();if(mine!==token)return;

  show('SCULPTING WARM CORE','4/6');
  const clumps=Array.from({length:34},()=>{const t=rand(.30,.90),p=band(t),o=gauss()*(4+core(t)*7);return{x:p.x+nx*o,y:p.y+ny*o,t,r:rand(1.8,6.8),pal:rnd()<.52?PAL.ivory:rnd()<.80?PAL.warm:PAL.rose};});
  system(22000,()=>{const cl=pick(clumps),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),f=Math.exp(-rr/(cl.r*.74));if(rnd()>f)return null;let col=pick(cl.pal).map(v=>Math.min(1,v*rand(.84,1.10)));return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.08,col,size:rand(1.8,5.5),alpha:rand(.035,.16)*f};},mat(softTex,{opacity:1,min:1.3,max:5.8,tw:.002}),5);
  renderer.render(scene,camera);await yieldUI();if(mine!==token)return;

  show('CARVING GREAT RIFT','5/6');
  system(9000,()=>{const t=rand(.02,.99),p=band(t),cw=core(t),o=main(t)+gauss()*(2.5+cw*1.7);return{x:p.x+nx*o,y:p.y+ny*o,z:.35,col:pick(PAL.dust),size:rand(3,8.4),alpha:rand(.055,.16)};},mat(softTex,{opacity:.88,min:1.8,max:8.6,tw:0,blend:THREE.NormalBlending}),6);
  renderer.render(scene,camera);await yieldUI();if(mine!==token)return;

  show('FINAL COLOR DETAILS','6/6');
  const anchors=[.22,.38,.54,.70,.84];const neb=anchors.map((t,i)=>{const p=band(t),side=(i%2?1:-1)*rand(7,15);return{x:p.x+nx*side,y:p.y+ny*side,rx:rand(3,6),ry:rand(2,5),pal:i%3===0?PAL.rose:i%3===1?PAL.violet:PAL.blue};});
  system(6000,()=>{const n=pick(neb),gx=gauss()*n.rx,gy=gauss()*n.ry,f=Math.exp(-.5*((gx/n.rx)**2+(gy/n.ry)**2));if(rnd()>f*.75)return null;return{x:n.x+gx,y:n.y+gy,z:.2,col:pick(n.pal).map(v=>v*rand(.65,.95)),size:rand(2.2,5.8),alpha:rand(.02,.08)*f};},mat(softTex,{opacity:.72,min:1.3,max:6,tw:.001}),7);
  renderer.render(scene,camera);
  if(loading){loading.innerHTML='GALAXY READY<br><span style="opacity:.48">robust build complete</span>';setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),500);},120);}
 }catch(e){fail(e);}
}

const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
setTimeout(()=>build(),20);
setTimeout(()=>{if(loading&&document.body.contains(loading)&&loading.textContent!==''){loading.style.opacity='0';}},12000);
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(build,220);});
