import * as THREE from 'three';

// v17 — richer full-screen Three.js particle cosmos.
// No terrain: the whole frame is sky. All visible celestial structure is point-particle based.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 17';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='BUILDING CHROMATIC PARTICLE COSMOS<br><span style="opacity:.48">deep micro-stars · broad Milky Way · warm stellar core · blue/violet/rose nebulae · branching dark rift</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · chromatic particle sky';
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
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-20,20);
camera.position.z=5;

function rngFactory(seed=17092026){
  return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}
let rnd=rngFactory();
const rand=(a=0,b=1)=>a+(b-a)*rnd();
const gauss=()=>rnd()+rnd()+rnd()+rnd()-2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const pick=a=>a[Math.floor(rnd()*a.length)];

const PAL={
  icy:[rgb(0xaec9ff),rgb(0xc9dcff),rgb(0xdce8ff),rgb(0x91b5ff),rgb(0x789dff)],
  white:[rgb(0xf8f8ff),rgb(0xeef3ff),rgb(0xf5f0e9),rgb(0xe7e8f3)],
  ivory:[rgb(0xfff0d0),rgb(0xffe2b6),rgb(0xf7d6a8),rgb(0xf4e4cf)],
  amber:[rgb(0xffca87),rgb(0xf3a96d),rgb(0xe78d5f),rgb(0xd97855),rgb(0xf1bd82)],
  rose:[rgb(0xe78aa8),rgb(0xd96f99),rgb(0xc9859f),rgb(0xf09aab)],
  violet:[rgb(0xb78ed9),rgb(0x957dce),rgb(0x806fbd),rgb(0xcb9bd9)],
  blue:[rgb(0x72a5ff),rgb(0x5b86e8),rgb(0x88b9ff),rgb(0x6a72d5),rgb(0x9bc5ff)],
  red:[rgb(0xe66e74),rgb(0xd85865),rgb(0xef8a72)],
  coolDust:[rgb(0x667994),rgb(0x8290a9),rgb(0x77728f)],
  dust:[rgb(0x030309),rgb(0x06050a),rgb(0x09070d),rgb(0x100b11)]
};

function weightedStarColor(){
  const q=rnd();
  if(q<.25)return pick(PAL.icy);
  if(q<.55)return pick(PAL.white);
  if(q<.76)return pick(PAL.ivory);
  if(q<.88)return pick(PAL.amber);
  if(q<.94)return pick(PAL.violet);
  if(q<.975)return pick(PAL.rose);
  return pick(PAL.red);
}

function radialTexture(kind='star'){
  const c=document.createElement('canvas');c.width=c.height=96;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(48,48,0,48,48,48);
  if(kind==='star'){
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.10,'rgba(255,255,255,.98)');
    g.addColorStop(.28,'rgba(255,255,255,.44)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }else if(kind==='soft'){
    g.addColorStop(0,'rgba(255,255,255,.68)');
    g.addColorStop(.26,'rgba(255,255,255,.26)');
    g.addColorStop(.62,'rgba(255,255,255,.065)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }else{
    g.addColorStop(0,'rgba(255,255,255,.86)');
    g.addColorStop(.42,'rgba(255,255,255,.28)');
    g.addColorStop(1,'rgba(0,0,0,0)');
  }
  x.fillStyle=g;x.fillRect(0,0,96,96);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const starTex=radialTexture('star');
const softTex=radialTexture('soft');
const dustTex=radialTexture('dust');

const materials=[];
function pointMaterial(texture,{opacity=1,blending=THREE.AdditiveBlending,twinkle=.02,scale=1}={}){
  const m=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending,
    uniforms:{uMap:{value:texture},uOpacity:{value:opacity},uTime:{value:0},uTwinkle:{value:twinkle},uScale:{value:scale},uDpr:{value:renderer.getPixelRatio()}},
    vertexShader:`
      attribute float aSize; attribute float aAlpha; attribute float aSeed; attribute vec3 color;
      varying vec3 vColor; varying float vAlpha;
      uniform float uTime; uniform float uTwinkle; uniform float uScale; uniform float uDpr;
      void main(){
        vColor=color; vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(0.28+aSeed*0.92)+aSeed*83.0)*uTwinkle;
        gl_PointSize=max(0.62,aSize*uScale*uDpr*tw);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D uMap; uniform float uOpacity;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 t=texture2D(uMap,gl_PointCoord);
        float a=t.a*vAlpha*uOpacity;
        if(a<0.0015) discard;
        gl_FragColor=vec4(vColor,a);
      }`
  });
  materials.push(m);return m;
}

const objects=[];
function system(count,generator,mat){
  const p=new Float32Array(count*3),c=new Float32Array(count*3),s=new Float32Array(count),a=new Float32Array(count),seed=new Float32Array(count);
  let i=0,guard=0;
  while(i<count&&guard<count*28){
    guard++;const v=generator(i);if(!v)continue;
    p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z??0;
    c[i*3]=v.color[0];c[i*3+1]=v.color[1];c[i*3+2]=v.color[2];
    s[i]=v.size;a[i]=v.alpha;seed[i]=rnd();i++;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(p,3));
  g.setAttribute('color',new THREE.BufferAttribute(c,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(s,1));
  g.setAttribute('aAlpha',new THREE.BufferAttribute(a,1));
  g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
  g.setDrawRange(0,i);
  const pts=new THREE.Points(g,mat);scene.add(pts);objects.push(pts);return pts;
}

function clearSky(){
  for(const o of objects.splice(0)){scene.remove(o);o.geometry.dispose();}
  for(const m of materials.splice(0))m.dispose();
}

function buildSky(){
  clearSky();rnd=rngFactory(17092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  // Broad diagonal structure: upper-left to lower-right.
  const x0=-W*.59,y0=64,x1=W*.56,y1=-45;
  const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  const band=t=>{
    const bend=Math.sin((t+.05)*Math.PI)*W*.021+Math.sin(t*6.1+1.3)*1.25+Math.sin(t*14.0)*.36;
    return{x:lerp(x0,x1,t)+nx*bend,y:lerp(y0,y1,t)+ny*bend};
  };
  const coreW=t=>Math.exp(-Math.pow((t-.67)/.205,2));
  const lane=(t,k)=>(k-3.5)*1.32+Math.sin(t*(5.5+k*1.17)+k*1.19)*(1.0+.19*k)+Math.sin(t*17.5+k*.81)*.48;
  const dustGap=(t,off)=>{let d=99;for(let k=0;k<8;k++)d=Math.min(d,Math.abs(off-lane(t,k)));return clamp((d-.38)/2.22,0,1);};

  // 1) Dense full-frame star ocean. 97% are tiny.
  system(112000,()=>{
    const q=rnd();let size,alpha;
    if(q>.99955){size=rand(2.0,3.45);alpha=rand(.72,1)}
    else if(q>.989){size=rand(.66,1.28);alpha=rand(.27,.73)}
    else{size=rand(.16,.52);alpha=rand(.07,.34)}
    let col=weightedStarColor().slice();
    const dim=rand(.70,1.02);col=col.map(v=>Math.min(1,v*dim));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:-.9,color:col,size,alpha};
  },pointMaterial(starTex,{opacity:.98,twinkle:.04,scale:1}));

  // 2) Very faint sub-pixel depth field.
  system(54000,()=>{
    const col=(rnd()<.55?pick(PAL.icy):rnd()<.78?pick(PAL.white):pick(PAL.ivory)).map(v=>v*rand(.43,.76));
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:-1,color:col,size:rand(.10,.31),alpha:rand(.025,.12)};
  },pointMaterial(starTex,{opacity:.76,twinkle:.012,scale:.88}));

  // 3) Huge feathered cool halo around the Milky Way.
  system(62000,()=>{
    const t=rand(-.08,1.08),p=band(t),cw=coreW(t),sigma=15+rand(0,10)+cw*7;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.30))**2);
    if(rnd()>feather*.82)return null;
    const q=rnd();let col=q<.52?pick(PAL.icy):q<.75?pick(PAL.coolDust):q<.89?pick(PAL.violet):pick(PAL.rose);
    col=col.map(v=>v*rand(.58,.93));
    return{x:p.x+nx*off,y:p.y+ny*off,z:-.4,color:col,size:rand(.20,.68),alpha:rand(.018,.11)*feather};
  },pointMaterial(softTex,{opacity:.90,twinkle:.01,scale:1}));

  // 4) Main Milky Way star population with carved dust gaps.
  system(93000,()=>{
    const t=rand(-.05,1.05),p=band(t),cw=coreW(t),sigma=7.0+rand(0,6.2)+cw*8.6;
    const off=gauss()*sigma,feather=Math.exp(-.5*(off/(sigma*1.39))**2),gap=dustGap(t,off);
    if(rnd()>feather*(.82+.13*cw)*(.19+.81*gap))return null;
    const q=rnd();let col;
    if(cw>.20&&q<.48)col=pick(PAL.ivory);
    else if(cw>.18&&q<.66)col=pick(PAL.amber);
    else if(q<.78)col=pick(PAL.icy);
    else if(q<.87)col=pick(PAL.violet);
    else if(q<.94)col=pick(PAL.rose);
    else col=pick(PAL.white);
    return{x:p.x+nx*off,y:p.y+ny*off,z:0,color:col,size:rnd()<.989?rand(.20,.66):rand(.85,1.50),alpha:rand(.055,.31)*feather};
  },pointMaterial(starTex,{opacity:1,twinkle:.028,scale:1}));

  // 5) Warm center built from many uneven clumps.
  const coreClusters=Array.from({length:48},()=>{
    const t=clamp(rand(.38,.96)+gauss()*.035,.31,1.02),p=band(t),side=gauss()*7.4;
    return{x:p.x+nx*side,y:p.y+ny*side,t,r:rand(1.1,5.7),palette:rnd()<.58?PAL.ivory:rnd()<.75?PAL.amber:rnd()<.88?PAL.rose:PAL.violet};
  });
  system(30000,()=>{
    const cl=pick(coreClusters),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.72));
    if(rnd()>fade)return null;
    let col=pick(cl.palette).slice();col=col.map(v=>Math.min(1,v*rand(.80,1.14)));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.2,color:col,size:rand(.24,1.05),alpha:rand(.075,.43)*fade};
  },pointMaterial(softTex,{opacity:1,twinkle:.017,scale:1.16}));

  // 6) Long luminous filaments: warm/cool/rose/violet strands mixed together.
  const filaments=Array.from({length:15},(_,k)=>({
    bias:(k-7)*1.12+rand(-.75,.75),amp:rand(.55,2.6),freq:rand(4.4,11.8),phase:rand(0,Math.PI*2),
    palette:k%5===0?PAL.rose:k%4===0?PAL.violet:k%3===0?PAL.icy:k%2===0?PAL.ivory:PAL.amber
  }));
  system(32000,()=>{
    const f=pick(filaments),t=rand(.0,1),p=band(t),cw=coreW(t);
    const off=f.bias+Math.sin(t*f.freq+f.phase)*f.amp+gauss()*rand(.28,1.15);
    if(rnd()>.50+.39*cw)return null;
    let col=pick(f.palette).slice();col=col.map(v=>v*rand(.72,1.04));
    return{x:p.x+nx*off,y:p.y+ny*off,z:.30,color:col,size:rand(.18,.62),alpha:rand(.045,.27)};
  },pointMaterial(starTex,{opacity:.96,twinkle:.026,scale:1}));

  // 7) Local blue/violet/rose nebula clusters — still made only of particles.
  const nebClusters=[];
  const nebPals=[PAL.blue,PAL.violet,PAL.rose,PAL.blue,PAL.violet];
  for(let i=0;i<21;i++){
    const useBand=i<14,t=rand(.08,.95),p=useBand?band(t):{x:rand(-W*.42,W*.42),y:rand(-36,30)};
    const side=useBand?gauss()*rand(8,18):0;
    nebClusters.push({x:p.x+nx*side,y:p.y+ny*side,r:rand(2.0,7.5),pal:nebPals[i%nebPals.length]});
  }
  system(23000,()=>{
    const cl=pick(nebClusters),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.68));
    if(rnd()>fade*.88)return null;
    let col=pick(cl.pal).slice();col=col.map(v=>v*rand(.62,1.05));
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.34,color:col,size:rand(.28,1.25),alpha:rand(.025,.19)*fade};
  },pointMaterial(softTex,{opacity:.88,twinkle:.014,scale:1.30}));

  // 8) Bright colored knots inside nebulae and the Galactic band.
  system(9000,()=>{
    const cl=pick(nebClusters),rr=Math.abs(gauss())*cl.r*.62,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.50));
    if(rnd()>fade*.72)return null;
    const q=rnd();let col=q<.30?pick(PAL.blue):q<.56?pick(PAL.violet):q<.76?pick(PAL.rose):q<.90?pick(PAL.ivory):pick(PAL.amber);
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.46,color:col,size:rand(.36,1.20),alpha:rand(.10,.46)*fade};
  },pointMaterial(starTex,{opacity:1,twinkle:.05,scale:1.05}));

  // 9) Great Rift: density holes above + soft dark particles here.
  system(26000,()=>{
    const t=rand(.0,1),p=band(t),k=Math.floor(rand(0,8)),cw=coreW(t),center=lane(t,k);
    const off=center+gauss()*rand(.65,2.2);
    const col=pick(PAL.dust);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.58,color:col,size:rand(2.6,9.5+cw*5.5),alpha:rand(.052,.19)+cw*.025};
  },pointMaterial(dustTex,{opacity:.84,blending:THREE.NormalBlending,twinkle:0,scale:1}));

  // 10) Stellar clusters sprinkled through and around the galaxy.
  const starClusters=Array.from({length:26},()=>{
    const t=rand(.03,.97),p=band(t),off=gauss()*rand(8,20);
    return{x:p.x+nx*off,y:p.y+ny*off,r:rand(.7,2.8),pal:rnd()<.42?PAL.icy:rnd()<.66?PAL.ivory:rnd()<.82?PAL.violet:PAL.amber};
  });
  system(14500,()=>{
    const cl=pick(starClusters),rr=Math.abs(gauss())*cl.r,ang=rand(0,Math.PI*2),fade=Math.exp(-rr/(cl.r*.65));
    if(rnd()>fade)return null;
    const col=pick(cl.pal);
    return{x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.66,color:col,size:rand(.22,.92),alpha:rand(.08,.52)*fade};
  },pointMaterial(starTex,{opacity:1,twinkle:.045,scale:1}));

  // 11) Re-seed fine stars over dust to avoid a painted-black look.
  system(10500,()=>{
    const t=rand(.02,.98),p=band(t),cw=coreW(t),off=gauss()*(5.0+cw*6.5),gap=dustGap(t,off);
    if(rnd()>(.18+.72*gap))return null;
    const q=rnd();let col=q<.30?pick(PAL.ivory):q<.48?pick(PAL.amber):q<.66?pick(PAL.icy):q<.80?pick(PAL.violet):q<.90?pick(PAL.rose):pick(PAL.white);
    return{x:p.x+nx*off,y:p.y+ny*off,z:.74,color:col,size:rand(.30,1.15),alpha:rand(.12,.58)};
  },pointMaterial(starTex,{opacity:1,twinkle:.055,scale:1}));

  // 12) Rare prominent colored stars — intentionally sparse.
  system(110,()=>{
    const q=rnd();let col=q<.28?pick(PAL.icy):q<.50?pick(PAL.white):q<.68?pick(PAL.ivory):q<.80?pick(PAL.amber):q<.90?pick(PAL.blue):q<.96?pick(PAL.rose):pick(PAL.red);
    return{x:rand(-W/2,W/2),y:rand(-50,50),z:.9,color:col,size:rand(1.65,3.85),alpha:rand(.68,1)};
  },pointMaterial(starTex,{opacity:1,twinkle:.075,scale:1.12}));

  if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},260);}
}

buildSky();
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  for(const m of materials)m.uniforms.uTime.value+=dt;
  renderer.render(scene,camera);
}
animate();

let resizeTimer;
addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(buildSky,120);});
