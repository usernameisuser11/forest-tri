import * as THREE from 'three';

// v26 — standalone single-canvas particle Milky Way.
// No previous-pass imports. One renderer, one scene, all sky structure rebuilt here.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 26';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='REBUILDING THE GALAXY<br><span style="opacity:.48">single canvas · readable stars · broad halo · warm core · deep rift</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · standalone particle Milky Way';
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

function rngFactory(seed=26092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
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
  halo:[rgb(0x758cad),rgb(0x8da5c5),rgb(0x9ba7bd),rgb(0x76718f),rgb(0x667b9d)],
  ivory:[rgb(0xfff2d8),rgb(0xfbe9c8),rgb(0xf6ddba)],
  warm:[rgb(0xf8d0a0),rgb(0xefad77),rgb(0xdf9368),rgb(0xd77f59),rgb(0xeab39d)],
  rose:[rgb(0xf0a5be),rgb(0xde8aaa),rgb(0xc996b5),rgb(0xd2799d)],
  violet:[rgb(0xc4a4e7),rgb(0xaa8bdc),rgb(0x9b86d7),rgb(0x7f73c8)],
  blue:[rgb(0x76a6ef),rgb(0x8abaff),rgb(0x657ed8),rgb(0x9cc7f3)],
  dust:[rgb(0x010205),rgb(0x020207),rgb(0x050409),rgb(0x08060b)]
};

function radialTexture(kind='star'){
  const c=document.createElement('canvas');c.width=c.height=96;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(48,48,0,48,48,48);
  if(kind==='star'){
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.07,'rgba(255,255,255,1)');
    g.addColorStop(.18,'rgba(255,255,255,.91)');
    g.addColorStop(.34,'rgba(255,255,255,.40)');
    g.addColorStop(.56,'rgba(255,255,255,.095)');
    g.addColorStop(.80,'rgba(255,255,255,.012)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }else{
    g.addColorStop(0,'rgba(255,255,255,.62)');
    g.addColorStop(.24,'rgba(255,255,255,.26)');
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
  clear();rnd=rngFactory(26092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  const x0=-W*.60,y0=63,x1=W*.58,y1=-47;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{
    const bend=Math.sin((t+.04)*Math.PI)*W*.023+Math.sin(t*5.8+1.15)*1.55+Math.sin(t*13.7)*.40;
    return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};
  };
  const coreW=t=>Math.exp(-Math.pow((t-.61)/.19,2));
  const segmentW=t=>clamp(.58+
    .28*Math.exp(-Math.pow((t-.18)/.08,2))+
    .38*Math.exp(-Math.pow((t-.39)/.10,2))+
    .62*Math.exp(-Math.pow((t-.61)/.12,2))+
    .30*Math.exp(-Math.pow((t-.82)/.08,2)),.45,1.35);

  function lane(t,k){
    const base=[-10.8,-6.8,-3.5,0.0,3.8,7.4,11.2][k];
    return base+Math.sin(t*(5.1+k*.61)+k*.92)*(1.15+k*.13)+Math.sin(t*(15.2+k*.5)+k)*.48;
  }
  function dustMask(t,off){
    let m=0;
    for(let k=0;k<7;k++){
      const width=k===3?2.9:(k===2||k===4?2.2:1.55);
      const d=(off-lane(t,k))/width;
      const strength=k===3?1.0:(k===2||k===4?.70:.42);
      m=Math.max(m,Math.exp(-d*d)*strength);
    }
    const knot=.55*Math.exp(-Math.pow((t-.60)/.12,2))*Math.exp(-Math.pow((off-1.5)/5.5,2));
    return clamp(Math.max(m,knot),0,1);
  }

  // 1) Background field: readable but deliberately less uniform/dense than v23.
  system(62000,()=>{
    const q=rnd();let size,alpha;
    if(q<.89){size=rand(1.22,1.48);alpha=rand(.34,.58);}
    else if(q<.995){size=rand(1.48,1.68);alpha=rand(.42,.66);}
    else{size=rand(1.68,1.82);alpha=rand(.50,.72);}
    let col=(rnd()<.44?pick(PAL.cool):rnd()<.72?pick(PAL.sky):rnd()<.88?pick(PAL.ivory):pick(PAL.rose)).slice();
    const gain=rand(.88,1.08);col=col.map(v=>Math.min(1,v*gain));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:-.8,col,size,alpha};
  },pointMaterial(starTex,{opacity:.94,minSize:1.24,maxSize:1.84,twinkle:.014}),1);

  // 2) Sparse faint depth stars.
  system(24000,()=>{
    let col=(rnd()<.55?pick(PAL.cool):pick(PAL.sky)).map(v=>v*rand(.68,.90));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:-.7,col,size:rand(.92,1.22),alpha:rand(.12,.30)};
  },pointMaterial(starTex,{opacity:.80,minSize:1.0,maxSize:1.34,twinkle:.008}),2);

  // 3) Huge feathered halo: the galaxy silhouette extends far beyond its bright core.
  system(52000,()=>{
    const t=rand(-.10,1.10),p=band(t),cw=coreW(t),sw=segmentW(t),sigma=18+rand(0,10)+cw*10;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.30))**2);
    if(rnd()>feather*.76*sw)return null;
    let col=(rnd()<.62?pick(PAL.halo):rnd()<.80?pick(PAL.cool):rnd()<.91?pick(PAL.violet):pick(PAL.rose)).slice();
    col=col.map(v=>v*rand(.50,.80));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.45,col,size:rand(2.2,6.6),alpha:rand(.014,.060)*feather};
  },pointMaterial(softTex,{opacity:.78,minSize:1.5,maxSize:6.8,twinkle:.001}),3);

  // 4) Main Milky Way star population with real density gaps from dust lanes.
  system(86000,()=>{
    const t=rand(-.06,1.06),p=band(t),cw=coreW(t),sw=segmentW(t),sigma=8.5+rand(0,6.8)+cw*8.5;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.38))**2),dm=dustMask(t,off);
    if(rnd()>feather*.88*sw*(1-dm*.82))return null;
    const q=rnd();let col=q<(.24+.38*cw)?pick(PAL.ivory):q<(.44+.30*cw)?pick(PAL.warm):q<.72?pick(PAL.cool):q<.86?pick(PAL.violet):q<.95?pick(PAL.rose):pick(PAL.sky);
    col=col.map(v=>Math.min(1,v*rand(.90,1.12)));
    const size=rnd()<.93?rand(1.24,1.56):rand(1.56,1.82);
    const alpha=rand(.38,.72)*(.70+.30*feather)*(1-dm*.45);
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.05,col,size,alpha};
  },pointMaterial(starTex,{opacity:1.02,minSize:1.30,maxSize:1.88,twinkle:.018}),4);

  // 5) Warm core clouds and clumps.
  const coreClumps=Array.from({length:58},()=>{
    const t=clamp(rand(.31,.90)+gauss()*.035,.20,1.00),p=band(t),cw=coreW(t),off=gauss()*(3.0+cw*5.5);
    return{x:p.x+nx*off,y:p.y+ny*off,t,r:rand(1.2,5.6),pal:rnd()<.56?PAL.ivory:rnd()<.78?PAL.warm:rnd()<.90?PAL.rose:PAL.violet};
  });
  system(34000,()=>{
    const cl=pick(coreClumps),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.72));
    if(rnd()>fade)return null;
    const p0=band(cl.t),off=((cl.x-p0.x)*nx+(cl.y-p0.y)*ny)+Math.sin(ang)*rr;
    const dm=dustMask(cl.t,off);if(rnd()<dm*.70)return null;
    let col=pick(cl.pal).slice();col=col.map(v=>Math.min(1,v*rand(.84,1.10)));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.08,col,size:rand(1.7,4.6),alpha:rand(.035,.17)*fade*(1-dm*.50)};
  },pointMaterial(softTex,{opacity:1.0,minSize:1.3,maxSize:4.8,twinkle:.002}),5);

  // 6) Dense luminous micro-core grains: light comes from many small points, not giant stars.
  system(26000,()=>{
    const t=clamp(rand(.34,.88)+gauss()*.02,.25,.96),p=band(t),cw=coreW(t),sigma=3.0+rand(0,3.7)+cw*3.5,off=gauss()*sigma,dm=dustMask(t,off);
    const feather=Math.exp(-.5*(off/(sigma*1.22))**2);if(rnd()>feather*(1-dm*.86))return null;
    let col=(rnd()<.55?pick(PAL.ivory):rnd()<.82?pick(PAL.warm):pick(PAL.rose)).slice();col=col.map(v=>Math.min(1,v*rand(.96,1.18)));
    return{x:p.x+nx*off,y:p.y+ny*off,z:.16,col,size:rand(1.20,1.60),alpha:rand(.48,.82)*feather};
  },pointMaterial(starTex,{opacity:1.08,minSize:1.28,maxSize:1.68,twinkle:.017}),6);

  // 7) Localized nebula patches — color masses instead of random colored dots everywhere.
  const nebulaAnchors=[.18,.31,.44,.56,.66,.76,.88];
  const nebulae=nebulaAnchors.map((t,i)=>{const p=band(t),side=(i%2?1:-1)*rand(5,14);return{x:p.x+nx*side,y:p.y+ny*side,rx:rand(2.5,6.5),ry:rand(1.8,4.7),pal:i%3===0?PAL.rose:i%3===1?PAL.violet:PAL.blue};});
  system(12000,()=>{
    const n=pick(nebulae),gx=gauss()*n.rx,gy=gauss()*n.ry,fade=Math.exp(-.5*((gx/n.rx)**2+(gy/n.ry)**2));
    if(rnd()>fade*.78)return null;
    let col=pick(n.pal).slice();col=col.map(v=>v*rand(.66,.96));
    return{x:n.x+gx,y:n.y+gy,z:.20,col,size:rand(1.8,5.2),alpha:rand(.020,.095)*fade};
  },pointMaterial(softTex,{opacity:.76,minSize:1.2,maxSize:5.3,twinkle:.001}),7);

  // 8) Great Rift: broad main lane + branching side lanes over the bright structure.
  system(28000,()=>{
    const t=rand(.02,.99),p=band(t),cw=coreW(t),k=Math.floor(rand(0,7));
    const mainBoost=k===3?1.75:1.0;
    const width=(k===3?2.7:(k===2||k===4?2.0:1.4))*(.85+.50*cw);
    const off=lane(t,k)+gauss()*width+Math.sin(t*(9+k*.8)+k)*rand(-.7,.7);
    const col=pick(PAL.dust);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.38,col,size:rand(2.2,7.2)*mainBoost,alpha:rand(.045,.15)*(k===3?1.15:1)};
  },pointMaterial(softTex,{opacity:.84,minSize:1.6,maxSize:8.2,twinkle:0,blending:THREE.NormalBlending}),8);

  // 9) Very few restrained highlights, scattered globally rather than strung along the band.
  system(220,()=>{
    let col=(rnd()<.38?pick(PAL.cool):rnd()<.70?pick(PAL.ivory):rnd()<.86?pick(PAL.warm):pick(PAL.violet)).slice();col=col.map(v=>v*rand(.80,.94));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:.45,col,size:rand(.92,1.16),alpha:rand(.24,.44)};
  },pointMaterial(starTex,{opacity:.82,minSize:.96,maxSize:1.28,twinkle:.030}),9);

  if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},320);}
}

build();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(build,120);});
