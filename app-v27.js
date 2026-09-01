import * as THREE from 'three';

// v27 — standalone sculpted Milky Way refinement.
// One canvas only. Removes the parallel-rail look from v26 and rebuilds the galaxy
// as a broad luminous body with one dominant dust rift, branching dust, mottled core,
// cool outer halo and localized chromatic nebula patches.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 27';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='SCULPTING GALACTIC STRUCTURE<br><span style="opacity:.48">broad warm body · dominant dust rift · branching filaments · cool halo</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · standalone sculpted Milky Way';
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
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-10,10);
camera.position.z=3;

function rngFactory(seed=27092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
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
  const c=document.createElement('canvas');c.width=c.height=96;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(48,48,0,48,48,48);
  if(kind==='star'){
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.07,'rgba(255,255,255,1)');
    g.addColorStop(.18,'rgba(255,255,255,.90)');
    g.addColorStop(.34,'rgba(255,255,255,.39)');
    g.addColorStop(.56,'rgba(255,255,255,.09)');
    g.addColorStop(.80,'rgba(255,255,255,.012)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }else{
    g.addColorStop(0,'rgba(255,255,255,.64)');
    g.addColorStop(.24,'rgba(255,255,255,.27)');
    g.addColorStop(.58,'rgba(255,255,255,.060)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }
  x.fillStyle=g;x.fillRect(0,0,96,96);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const starTex=radialTexture('star');
const softTex=radialTexture('soft');

const mats=[],objs=[];
function pointMaterial(texture,{opacity=1,minSize=.9,maxSize=2,twinkle=.015,blending=THREE.AdditiveBlending}={}){
  const m=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending,
    uniforms:{uMap:{value:texture},uOpacity:{value:opacity},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uMin:{value:minSize},uMax:{value:maxSize}},
    vertexShader:`
      attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;
      varying vec3 vColor;varying float vAlpha;
      uniform float uTime;uniform float uDpr;uniform float uMin;uniform float uMax;
      void main(){
        vColor=color;vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(.15+aSeed*.42)+aSeed*61.0)*${twinkle.toFixed(3)};
        float ps=aSize*uDpr*tw;
        gl_PointSize=clamp(ps,uMin*uDpr,uMax*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uMap;uniform float uOpacity;varying vec3 vColor;varying float vAlpha;
      void main(){vec4 t=texture2D(uMap,gl_PointCoord);float a=t.a*vAlpha*uOpacity;if(a<.001)discard;gl_FragColor=vec4(vColor,a);}`
  });
  mats.push(m);return m;
}

function system(count,generator,mat,renderOrder){
  const p=new Float32Array(count*3),c=new Float32Array(count*3),s=new Float32Array(count),a=new Float32Array(count),seed=new Float32Array(count);
  let i=0,guard=0;
  while(i<count&&guard<count*30){
    guard++;const v=generator();if(!v)continue;
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

function build(){
  clear();rnd=rngFactory(27092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  const x0=-W*.60,y0=62,x1=W*.58,y1=-47;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{
    const bend=Math.sin((t+.03)*Math.PI)*W*.024+Math.sin(t*5.3+1.0)*1.85+Math.sin(t*12.8)*.48;
    return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};
  };
  const coreW=t=>Math.exp(-Math.pow((t-.60)/.22,2));
  const segmentW=t=>clamp(.62+
    .25*Math.exp(-Math.pow((t-.18)/.09,2))+
    .34*Math.exp(-Math.pow((t-.40)/.11,2))+
    .68*Math.exp(-Math.pow((t-.60)/.14,2))+
    .28*Math.exp(-Math.pow((t-.82)/.09,2)),.48,1.42);

  // One dominant dust rift, not parallel rails.
  const mainLane=t=>1.0+Math.sin(t*6.0+.5)*2.15+Math.sin(t*15.7+1.2)*.72;
  const branchA=t=>mainLane(t)-6.5-Math.sin(t*8.2)*2.0;
  const branchB=t=>mainLane(t)+7.3+Math.sin(t*7.6+1.4)*2.3;
  const branchC=t=>mainLane(t)-11.5+Math.sin(t*11.4+.7)*1.5;
  const branchD=t=>mainLane(t)+12.0+Math.sin(t*10.2+2.2)*1.7;
  const window=(t,c,w)=>Math.exp(-Math.pow((t-c)/w,2));

  function dustMask(t,off){
    const main=Math.exp(-Math.pow((off-mainLane(t))/(3.5+coreW(t)*1.2),2));
    const a=.62*window(t,.42,.28)*Math.exp(-Math.pow((off-branchA(t))/2.4,2));
    const b=.58*window(t,.68,.26)*Math.exp(-Math.pow((off-branchB(t))/2.6,2));
    const c=.40*window(t,.30,.18)*Math.exp(-Math.pow((off-branchC(t))/1.9,2));
    const d=.36*window(t,.82,.16)*Math.exp(-Math.pow((off-branchD(t))/2.0,2));
    const knot=.48*window(t,.60,.14)*Math.exp(-Math.pow((off+1.0)/7.0,2));
    return clamp(Math.max(main,a,b,c,d,knot),0,1);
  }

  // 1) Background stars: still readable, but with more black breathing room.
  system(50000,()=>{
    const q=rnd();let size,alpha;
    if(q<.90){size=rand(1.18,1.44);alpha=rand(.30,.52);}
    else if(q<.995){size=rand(1.44,1.64);alpha=rand(.38,.60);}
    else{size=rand(1.64,1.80);alpha=rand(.46,.68);}
    let col=(rnd()<.46?pick(PAL.cool):rnd()<.74?pick(PAL.sky):rnd()<.89?pick(PAL.ivory):pick(PAL.rose)).slice();
    col=col.map(v=>Math.min(1,v*rand(.84,1.06)));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:-.9,col,size,alpha};
  },pointMaterial(starTex,{opacity:.90,minSize:1.18,maxSize:1.82,twinkle:.013}),1);

  // 2) Faint depth stars.
  system(18000,()=>{
    let col=(rnd()<.58?pick(PAL.cool):pick(PAL.sky)).map(v=>v*rand(.62,.86));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:-.8,col,size:rand(.90,1.18),alpha:rand(.10,.26)};
  },pointMaterial(starTex,{opacity:.76,minSize:.98,maxSize:1.28,twinkle:.007}),2);

  // 3) Huge cool outer halo — much broader and softer than the bright body.
  system(62000,()=>{
    const t=rand(-.11,1.11),p=band(t),cw=coreW(t),sw=segmentW(t),sigma=22+rand(0,12)+cw*11;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.34))**2);
    if(rnd()>feather*.78*sw)return null;
    let col=(rnd()<.60?pick(PAL.halo):rnd()<.80?pick(PAL.cool):rnd()<.91?pick(PAL.violet):pick(PAL.rose)).slice();
    col=col.map(v=>v*rand(.46,.76));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.55,col,size:rand(2.8,8.8),alpha:rand(.010,.050)*feather};
  },pointMaterial(softTex,{opacity:.72,minSize:1.6,maxSize:9.0,twinkle:.001}),3);

  // 4) Diffuse luminous galactic body — fills the space between stars so it no longer reads as two rails.
  system(44000,()=>{
    const t=rand(-.05,1.05),p=band(t),cw=coreW(t),sw=segmentW(t),sigma=13+rand(0,7)+cw*10;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.30))**2),dm=dustMask(t,off);
    if(rnd()>feather*.82*sw*(1-dm*.60))return null;
    let col=(rnd()<(.28+.34*cw)?pick(PAL.ivory):rnd()<.62?pick(PAL.warm):rnd()<.80?pick(PAL.halo):rnd()<.91?pick(PAL.violet):pick(PAL.rose)).slice();
    col=col.map(v=>v*rand(.60,.92));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.30,col,size:rand(3.0,9.5),alpha:rand(.018,.075)*feather*(1-dm*.45)};
  },pointMaterial(softTex,{opacity:.90,minSize:1.8,maxSize:9.8,twinkle:.001}),4);

  // 5) Main Milky Way stars — broad single body with density gaps from the dominant rift.
  system(90000,()=>{
    const t=rand(-.06,1.06),p=band(t),cw=coreW(t),sw=segmentW(t),sigma=11+rand(0,7.5)+cw*10.5;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.34))**2),dm=dustMask(t,off);
    if(rnd()>feather*.90*sw*(1-dm*.76))return null;
    const q=rnd();let col=q<(.26+.36*cw)?pick(PAL.ivory):q<(.48+.28*cw)?pick(PAL.warm):q<.72?pick(PAL.cool):q<.86?pick(PAL.violet):q<.95?pick(PAL.rose):pick(PAL.sky);
    col=col.map(v=>Math.min(1,v*rand(.88,1.12)));
    const size=rnd()<.94?rand(1.20,1.52):rand(1.52,1.78);
    const alpha=rand(.34,.68)*(.68+.32*feather)*(1-dm*.42);
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.06,col,size,alpha};
  },pointMaterial(starTex,{opacity:1.0,minSize:1.25,maxSize:1.84,twinkle:.017}),5);

  // 6) Mottled warm core clouds — asymmetric clumps across a thick region.
  const coreClumps=Array.from({length:72},()=>{
    const t=clamp(rand(.28,.92)+gauss()*.045,.18,1.02),p=band(t),cw=coreW(t),off=gauss()*(4.2+cw*7.0);
    return{x:p.x+nx*off,y:p.y+ny*off,t,r:rand(1.4,7.2),pal:rnd()<.50?PAL.ivory:rnd()<.76?PAL.warm:rnd()<.90?PAL.rose:PAL.violet};
  });
  system(46000,()=>{
    const cl=pick(coreClumps),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.74));
    if(rnd()>fade)return null;
    const p0=band(cl.t),off=((cl.x-p0.x)*nx+(cl.y-p0.y)*ny)+Math.sin(ang)*rr,dm=dustMask(cl.t,off);
    if(rnd()<dm*.62)return null;
    let col=pick(cl.pal).slice();col=col.map(v=>Math.min(1,v*rand(.80,1.08)));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.06,col,size:rand(1.8,5.8),alpha:rand(.032,.16)*fade*(1-dm*.42)};
  },pointMaterial(softTex,{opacity:1.0,minSize:1.3,maxSize:6.0,twinkle:.002}),6);

  // 7) Luminous micro-grain core: concentrated but not a thin line.
  system(34000,()=>{
    const t=clamp(rand(.30,.91)+gauss()*.025,.20,.98),p=band(t),cw=coreW(t),sigma=5.0+rand(0,4.4)+cw*5.0,off=gauss()*sigma,dm=dustMask(t,off);
    const feather=Math.exp(-.5*(off/(sigma*1.26))**2);if(rnd()>feather*(1-dm*.78))return null;
    let col=(rnd()<.48?pick(PAL.ivory):rnd()<.78?pick(PAL.warm):rnd()<.91?pick(PAL.rose):pick(PAL.violet)).slice();
    col=col.map(v=>Math.min(1,v*rand(.94,1.16)));
    return{x:p.x+nx*off,y:p.y+ny*off,z:.14,col,size:rand(1.18,1.56),alpha:rand(.42,.80)*feather};
  },pointMaterial(starTex,{opacity:1.08,minSize:1.24,maxSize:1.64,twinkle:.016}),7);

  // 8) Localized nebula masses.
  const anchors=[.20,.33,.46,.57,.69,.80,.90];
  const nebulae=anchors.map((t,i)=>{const p=band(t),side=(i%2?1:-1)*rand(6,17);return{x:p.x+nx*side,y:p.y+ny*side,rx:rand(3.0,7.2),ry:rand(2.0,5.5),pal:i%3===0?PAL.rose:i%3===1?PAL.violet:PAL.blue};});
  system(15000,()=>{
    const n=pick(nebulae),gx=gauss()*n.rx,gy=gauss()*n.ry,fade=Math.exp(-.5*((gx/n.rx)**2+(gy/n.ry)**2));
    if(rnd()>fade*.80)return null;
    let col=pick(n.pal).slice();col=col.map(v=>v*rand(.62,.94));
    return{x:n.x+gx,y:n.y+gy,z:.20,col,size:rand(2.2,6.4),alpha:rand(.018,.090)*fade};
  },pointMaterial(softTex,{opacity:.76,minSize:1.3,maxSize:6.6,twinkle:.001}),8);

  // 9) Main Great Rift: thick, irregular, only one dominant lane.
  system(19000,()=>{
    const t=rand(.02,.99),p=band(t),cw=coreW(t),base=mainLane(t),off=base+gauss()*(2.3+cw*1.8)+Math.sin(t*13.0)*rand(-.8,.8);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.36,col:pick(PAL.dust),size:rand(3.0,9.2),alpha:rand(.055,.17)};
  },pointMaterial(softTex,{opacity:.88,minSize:1.8,maxSize:9.4,twinkle:0,blending:THREE.NormalBlending}),9);

  // 10) Branching dust filaments: localized so they read as splits, not parallel stripes.
  system(10500,()=>{
    const t=rand(.08,.96),p=band(t),r=rnd();let lanePos,weight;
    if(r<.30){lanePos=branchA(t);weight=window(t,.42,.28);}else if(r<.58){lanePos=branchB(t);weight=window(t,.68,.26);}else if(r<.79){lanePos=branchC(t);weight=window(t,.30,.18);}else{lanePos=branchD(t);weight=window(t,.82,.16);}
    if(rnd()>weight)return null;
    const off=lanePos+gauss()*rand(1.2,2.5);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.37,col:pick(PAL.dust),size:rand(2.2,6.0),alpha:rand(.035,.12)*weight};
  },pointMaterial(softTex,{opacity:.78,minSize:1.4,maxSize:6.2,twinkle:0,blending:THREE.NormalBlending}),10);

  // 11) Very few highlights, scattered globally.
  system(180,()=>{
    let col=(rnd()<.38?pick(PAL.cool):rnd()<.70?pick(PAL.ivory):rnd()<.86?pick(PAL.warm):pick(PAL.violet)).slice();
    col=col.map(v=>v*rand(.78,.92));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:.46,col,size:rand(.90,1.14),alpha:rand(.22,.42)};
  },pointMaterial(starTex,{opacity:.80,minSize:.94,maxSize:1.26,twinkle:.028}),11);

  if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},320);}
}

build();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(build,120);});