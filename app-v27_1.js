import * as THREE from 'three';

// v27.1 — same standalone sculpted Milky Way direction, but with a bounded,
// staged particle build so the browser never gets trapped in a long synchronous loop.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 27.1';
const loading=document.querySelector('#loading');
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · staged standalone particle Milky Way';
const ui=document.querySelector('#ui');
if(ui) ui.style.zIndex='10';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x01030a,1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
renderer.setSize(innerWidth,innerHeight,false);
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'1',pointerEvents:'none'});
document.body.prepend(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-10,10);
camera.position.z=3;

function rngFactory(seed=271092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];

const PAL={
  sky:[rgb(0xddeaff),rgb(0xf8f8ff),rgb(0xfff3da),rgb(0xffdfb0),rgb(0xb8d2ff),rgb(0xc9b1eb),rgb(0xe6a0bd),rgb(0x9fbfff)],
  cool:[rgb(0xc3d9ff),rgb(0x9dbcf4),rgb(0xd8e4f7),rgb(0xa49bd9),rgb(0x7ca8ff),rgb(0x91b9e7)],
  halo:[rgb(0x6d82a4),rgb(0x8298b8),rgb(0x9aa9c1),rgb(0x76718f),rgb(0x607493),rgb(0xa29bb2)],
  ivory:[rgb(0xfff5df),rgb(0xffeccb),rgb(0xf9dfb9),rgb(0xf7d6ae)],
  warm:[rgb(0xf8c995),rgb(0xeea66e),rgb(0xdf8c60),rgb(0xd77852),rgb(0xe9aa91)],
  rose:[rgb(0xf0a1bb),rgb(0xde83a7),rgb(0xc98daf),rgb(0xd36f9a)],
  violet:[rgb(0xc09fe2),rgb(0xa486d7),rgb(0x917bd1),rgb(0x736dc2)],
  blue:[rgb(0x70a4ef),rgb(0x8dbdff),rgb(0x647bd4),rgb(0xa4cdf5)],
  dust:[rgb(0x010205),rgb(0x020207),rgb(0x040308),rgb(0x07050a)]
};

function radialTexture(kind='star'){
  const c=document.createElement('canvas');c.width=c.height=64;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);
  if(kind==='star'){
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.08,'rgba(255,255,255,1)');
    g.addColorStop(.20,'rgba(255,255,255,.88)');
    g.addColorStop(.38,'rgba(255,255,255,.36)');
    g.addColorStop(.60,'rgba(255,255,255,.07)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }else{
    g.addColorStop(0,'rgba(255,255,255,.58)');
    g.addColorStop(.25,'rgba(255,255,255,.22)');
    g.addColorStop(.60,'rgba(255,255,255,.045)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }
  x.fillStyle=g;x.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const starTex=radialTexture('star');
const softTex=radialTexture('soft');

const mats=[],objs=[];
function pointMaterial(texture,{opacity=1,minSize=.9,maxSize=2,twinkle=.012,blending=THREE.AdditiveBlending}={}){
  const m=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending,
    uniforms:{uMap:{value:texture},uOpacity:{value:opacity},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uMin:{value:minSize},uMax:{value:maxSize}},
    vertexShader:`
      attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;
      varying vec3 vColor;varying float vAlpha;
      uniform float uTime;uniform float uDpr;uniform float uMin;uniform float uMax;
      void main(){
        vColor=color;vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(.15+aSeed*.40)+aSeed*57.0)*${twinkle.toFixed(3)};
        gl_PointSize=clamp(aSize*uDpr*tw,uMin*uDpr,uMax*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uMap;uniform float uOpacity;varying vec3 vColor;varying float vAlpha;
      void main(){vec4 t=texture2D(uMap,gl_PointCoord);float a=t.a*vAlpha*uOpacity;if(a<.001)discard;gl_FragColor=vec4(vColor,a);}`
  });
  mats.push(m);return m;
}

// Bounded builder: attempts are fixed. No rejection loop can run millions of times.
function system(attempts,generator,mat,renderOrder){
  const p=new Float32Array(attempts*3),c=new Float32Array(attempts*3),s=new Float32Array(attempts),a=new Float32Array(attempts),seed=new Float32Array(attempts);
  let i=0;
  for(let n=0;n<attempts;n++){
    const v=generator();if(!v)continue;
    p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z??0;
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
  const pts=new THREE.Points(g,mat);pts.renderOrder=renderOrder;scene.add(pts);objs.push(pts);return pts;
}

function clear(){for(const o of objs.splice(0)){scene.remove(o);o.geometry.dispose();}for(const m of mats.splice(0))m.dispose();}
const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
let buildToken=0;

async function build(){
  const token=++buildToken;
  clear();rnd=rngFactory(271092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  const x0=-W*.60,y0=62,x1=W*.58,y1=-47;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{const bend=Math.sin((t+.03)*Math.PI)*W*.024+Math.sin(t*5.3+1.0)*1.85+Math.sin(t*12.8)*.48;return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};};
  const coreW=t=>Math.exp(-Math.pow((t-.60)/.22,2));
  const segmentW=t=>clamp(.62+.25*Math.exp(-Math.pow((t-.18)/.09,2))+.34*Math.exp(-Math.pow((t-.40)/.11,2))+.68*Math.exp(-Math.pow((t-.60)/.14,2))+.28*Math.exp(-Math.pow((t-.82)/.09,2)),.48,1.42);
  const mainLane=t=>1.0+Math.sin(t*6.0+.5)*2.15+Math.sin(t*15.7+1.2)*.72;
  const branchA=t=>mainLane(t)-6.5-Math.sin(t*8.2)*2.0;
  const branchB=t=>mainLane(t)+7.3+Math.sin(t*7.6+1.4)*2.3;
  const window=(t,c,w)=>Math.exp(-Math.pow((t-c)/w,2));
  function dustMask(t,off){
    const main=Math.exp(-Math.pow((off-mainLane(t))/(3.7+coreW(t)*1.3),2));
    const a=.55*window(t,.42,.28)*Math.exp(-Math.pow((off-branchA(t))/2.7,2));
    const b=.52*window(t,.68,.26)*Math.exp(-Math.pow((off-branchB(t))/2.8,2));
    return clamp(Math.max(main,a,b),0,1);
  }

  const progress=(name,sub)=>{if(loading) loading.innerHTML=`${name}<br><span style="opacity:.48">${sub}</span>`;};

  progress('BUILDING STAR FIELD','stage 1/7 · background depth');
  system(42000,()=>{
    const q=rnd();let size=q<.90?rand(1.18,1.44):q<.995?rand(1.44,1.64):rand(1.64,1.78);let alpha=q<.90?rand(.30,.52):q<.995?rand(.38,.60):rand(.46,.66);
    let col=(rnd()<.46?pick(PAL.cool):rnd()<.74?pick(PAL.sky):rnd()<.89?pick(PAL.ivory):pick(PAL.rose)).slice();col=col.map(v=>Math.min(1,v*rand(.84,1.06)));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:-.9,col,size,alpha};
  },pointMaterial(starTex,{opacity:.90,minSize:1.18,maxSize:1.80}),1);
  system(12000,()=>{let col=(rnd()<.58?pick(PAL.cool):pick(PAL.sky)).map(v=>v*rand(.62,.86));return{x:rand(-W/2,W/2),y:rand(-50,50),z:-.8,col,size:rand(.90,1.16),alpha:rand(.10,.24)};},pointMaterial(starTex,{opacity:.75,minSize:.98,maxSize:1.26,twinkle:.006}),2);
  await nextFrame(); if(token!==buildToken)return;

  progress('FORMING OUTER HALO','stage 2/7 · broad cool stellar haze');
  system(36000,()=>{
    const t=rand(-.11,1.11),p=band(t),cw=coreW(t),sw=segmentW(t),sigma=22+rand(0,12)+cw*11,off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.34))**2);
    if(rnd()>feather*.72*sw)return null;
    let col=(rnd()<.60?pick(PAL.halo):rnd()<.80?pick(PAL.cool):rnd()<.91?pick(PAL.violet):pick(PAL.rose)).slice();col=col.map(v=>v*rand(.46,.76));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.55,col,size:rand(2.8,8.0),alpha:rand(.010,.048)*feather};
  },pointMaterial(softTex,{opacity:.72,minSize:1.6,maxSize:8.2,twinkle:.001}),3);
  await nextFrame(); if(token!==buildToken)return;

  progress('FILLING GALACTIC BODY','stage 3/7 · wide warm continuous structure');
  system(36000,()=>{
    const t=rand(-.05,1.05),p=band(t),cw=coreW(t),sw=segmentW(t),sigma=14+rand(0,8)+cw*11,off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.32))**2),dm=dustMask(t,off);
    if(rnd()>feather*.78*sw*(1-dm*.48))return null;
    let col=(rnd()<(.30+.34*cw)?pick(PAL.ivory):rnd()<.64?pick(PAL.warm):rnd()<.80?pick(PAL.halo):rnd()<.91?pick(PAL.violet):pick(PAL.rose)).slice();col=col.map(v=>v*rand(.60,.94));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.30,col,size:rand(3.0,9.0),alpha:rand(.018,.080)*feather*(1-dm*.35)};
  },pointMaterial(softTex,{opacity:.94,minSize:1.8,maxSize:9.2,twinkle:.001}),4);
  await nextFrame(); if(token!==buildToken)return;

  progress('ADDING MILKY WAY STARS','stage 4/7 · dense fine stellar grain');
  system(72000,()=>{
    const t=rand(-.06,1.06),p=band(t),cw=coreW(t),sw=segmentW(t),sigma=11.5+rand(0,8)+cw*11,off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.34))**2),dm=dustMask(t,off);
    if(rnd()>feather*.86*sw*(1-dm*.72))return null;
    const q=rnd();let col=q<(.26+.36*cw)?pick(PAL.ivory):q<(.48+.28*cw)?pick(PAL.warm):q<.72?pick(PAL.cool):q<.86?pick(PAL.violet):q<.95?pick(PAL.rose):pick(PAL.sky);col=col.map(v=>Math.min(1,v*rand(.88,1.12)));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.06,col,size:rnd()<.94?rand(1.20,1.52):rand(1.52,1.76),alpha:rand(.34,.68)*(.68+.32*feather)*(1-dm*.38)};
  },pointMaterial(starTex,{opacity:1.02,minSize:1.25,maxSize:1.82,twinkle:.016}),5);
  await nextFrame(); if(token!==buildToken)return;

  progress('SCULPTING WARM CORE','stage 5/7 · mottled ivory / amber / rose');
  const clumps=Array.from({length:44},()=>{const t=clamp(rand(.28,.92)+gauss()*.045,.18,1.02),p=band(t),cw=coreW(t),off=gauss()*(4.2+cw*7.0);return{x:p.x+nx*off,y:p.y+ny*off,t,r:rand(1.5,7.0),pal:rnd()<.50?PAL.ivory:rnd()<.76?PAL.warm:rnd()<.90?PAL.rose:PAL.violet};});
  system(30000,()=>{
    const cl=pick(clumps),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.74));if(rnd()>fade)return null;
    const p0=band(cl.t),off=((cl.x-p0.x)*nx+(cl.y-p0.y)*ny)+Math.sin(ang)*rr,dm=dustMask(cl.t,off);if(rnd()<dm*.58)return null;
    let col=pick(cl.pal).slice();col=col.map(v=>Math.min(1,v*rand(.82,1.10)));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.06,col,size:rand(1.8,5.6),alpha:rand(.032,.16)*fade*(1-dm*.38)};
  },pointMaterial(softTex,{opacity:1.0,minSize:1.3,maxSize:5.8,twinkle:.002}),6);
  system(24000,()=>{
    const t=clamp(rand(.30,.91)+gauss()*.025,.20,.98),p=band(t),cw=coreW(t),sigma=5.3+rand(0,4.6)+cw*5.2,off=gauss()*sigma,dm=dustMask(t,off),feather=Math.exp(-.5*(off/(sigma*1.26))**2);if(rnd()>feather*(1-dm*.74))return null;
    let col=(rnd()<.48?pick(PAL.ivory):rnd()<.78?pick(PAL.warm):rnd()<.91?pick(PAL.rose):pick(PAL.violet)).slice();col=col.map(v=>Math.min(1,v*rand(.94,1.16)));
    return{x:p.x+nx*off,y:p.y+ny*off,z:.14,col,size:rand(1.18,1.55),alpha:rand(.42,.80)*feather};
  },pointMaterial(starTex,{opacity:1.08,minSize:1.24,maxSize:1.62,twinkle:.015}),7);
  await nextFrame(); if(token!==buildToken)return;

  progress('CARVING THE GREAT RIFT','stage 6/7 · dominant dark lane + branches');
  system(12000,()=>{const t=rand(.02,.99),p=band(t),cw=coreW(t),off=mainLane(t)+gauss()*(2.5+cw*1.8)+Math.sin(t*13)*rand(-.8,.8);return{x:p.x+nx*off,y:p.y+ny*off,z:.36,col:pick(PAL.dust),size:rand(3.0,8.6),alpha:rand(.055,.16)};},pointMaterial(softTex,{opacity:.88,minSize:1.8,maxSize:8.8,twinkle:0,blending:THREE.NormalBlending}),9);
  system(6000,()=>{const t=rand(.08,.96),p=band(t),useA=rnd()<.5,lane=useA?branchA(t):branchB(t),weight=useA?window(t,.42,.28):window(t,.68,.26);if(rnd()>weight)return null;const off=lane+gauss()*rand(1.2,2.5);return{x:p.x+nx*off,y:p.y+ny*off,z:.37,col:pick(PAL.dust),size:rand(2.2,5.8),alpha:rand(.035,.11)*weight};},pointMaterial(softTex,{opacity:.76,minSize:1.4,maxSize:6.0,twinkle:0,blending:THREE.NormalBlending}),10);
  await nextFrame(); if(token!==buildToken)return;

  progress('FINAL COLOR DETAILS','stage 7/7 · blue / violet / rose nebula patches');
  const anchors=[.20,.34,.47,.58,.70,.81,.90];
  const nebulae=anchors.map((t,i)=>{const p=band(t),side=(i%2?1:-1)*rand(6,17);return{x:p.x+nx*side,y:p.y+ny*side,rx:rand(3.0,7.0),ry:rand(2.0,5.2),pal:i%3===0?PAL.rose:i%3===1?PAL.violet:PAL.blue};});
  system(9000,()=>{const n=pick(nebulae),gx=gauss()*n.rx,gy=gauss()*n.ry,fade=Math.exp(-.5*((gx/n.rx)**2+(gy/n.ry)**2));if(rnd()>fade*.78)return null;let col=pick(n.pal).slice();col=col.map(v=>v*rand(.62,.94));return{x:n.x+gx,y:n.y+gy,z:.20,col,size:rand(2.2,6.0),alpha:rand(.018,.085)*fade};},pointMaterial(softTex,{opacity:.74,minSize:1.3,maxSize:6.2,twinkle:.001}),8);
  system(160,()=>{let col=(rnd()<.38?pick(PAL.cool):rnd()<.70?pick(PAL.ivory):rnd()<.86?pick(PAL.warm):pick(PAL.violet)).slice();col=col.map(v=>v*rand(.78,.92));return{x:rand(-W/2,W/2),y:rand(-50,50),z:.46,col,size:rand(.90,1.12),alpha:rand(.22,.40)};},pointMaterial(starTex,{opacity:.78,minSize:.94,maxSize:1.24,twinkle:.026}),11);

  await nextFrame();if(token!==buildToken)return;
  if(loading){loading.innerHTML='GALAXY READY<br><span style="opacity:.48">single canvas · staged build complete</span>';setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),700);},180);}
}

const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
build();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>build(),180);});
