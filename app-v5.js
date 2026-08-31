import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const loading=document.querySelector('#loading');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.14;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x0a1828,.0067);

const camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,620);
camera.position.set(0,6.55,33);
camera.lookAt(0,11.7,-92);

function hash(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453123;return s-Math.floor(s)}
function sm(t){return t*t*(3-2*t)}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=sm(fx),v=sm(fz),a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a,b,u),THREE.MathUtils.lerp(c,d,u),v)}
function fbm(x,z){let s=0,a=.5,f=1;for(let i=0;i<6;i++){s+=noise(x*f,z*f)*a;f*=2.03;a*=.5}return s}
function seeded(i,k=1){const v=Math.sin(i*12.9898*k+78.233)*43758.5453;return v-Math.floor(v)}
function gauss(){return Math.random()+Math.random()+Math.random()+Math.random()-2}

function groundY(x,z){
  const broad=(fbm(x*.024,z*.024)-.5)*4.1;
  const detail=(fbm((x+67)*.075,(z-14)*.075)-.5)*1.05;
  const banks=Math.pow(Math.min(1,Math.abs(x)/41),1.75)*3.0;
  const valley=-Math.exp(-(x*x)/235)*1.4;
  const far=THREE.MathUtils.clamp((-z-38)/145,0,1)*1.9;
  return -2.0+broad+detail+banks+valley+far;
}

function makeSky(){
  const W=3072,H=1728,c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#01030a');
  g.addColorStop(.24,'#040b1d');
  g.addColorStop(.50,'#0a1d3d');
  g.addColorStop(.70,'#12335c');
  g.addColorStop(.84,'#1b4168');
  g.addColorStop(1,'#0a1a2c');
  x.fillStyle=g;x.fillRect(0,0,W,H);

  const horizon=x.createLinearGradient(0,H*.54,0,H*.93);
  horizon.addColorStop(0,'rgba(72,117,165,0)');
  horizon.addColorStop(.58,'rgba(84,135,176,.16)');
  horizon.addColorStop(1,'rgba(15,27,45,0)');
  x.fillStyle=horizon;x.fillRect(0,H*.48,W,H*.48);

  // broad galactic haze
  x.globalCompositeOperation='screen';
  for(let i=0;i<920;i++){
    const t=Math.random();
    const cx=W*(-.13+1.27*t);
    const cy=H*(.82-.72*t + Math.sin(t*8.6)*.022);
    const off=gauss()*H*.105;
    const px=cx+.46*off,py=cy+.89*off;
    const core=Math.exp(-Math.pow((t-.58)/.23,2));
    const r=28+Math.random()*(105+core*55);
    const rg=x.createRadialGradient(px,py,0,px,py,r);
    if(Math.random()<.20&&core>.2) rg.addColorStop(0,`rgba(245,205,190,${.018+Math.random()*.045})`);
    else if(Math.random()<.24) rg.addColorStop(0,`rgba(160,118,255,${.016+Math.random()*.05})`);
    else rg.addColorStop(0,`rgba(112,156,255,${.018+Math.random()*.06})`);
    rg.addColorStop(1,'rgba(40,70,160,0)');
    x.fillStyle=rg;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
  }

  // dense granular core and star clouds
  for(let i=0;i<6200;i++){
    const t=Math.random();
    const cx=W*(-.10+1.22*t),cy=H*(.815-.715*t+Math.sin(t*9.4)*.015);
    const off=gauss()*H*.052;
    const px=cx+.46*off,py=cy+.89*off;
    const core=Math.exp(-Math.pow((t-.58)/.18,2));
    const r=.7+Math.random()*(3.4+core*8.5);
    const a=.012+Math.random()*(.065+core*.10);
    const rg=x.createRadialGradient(px,py,0,px,py,r);
    const warm=core>.45&&Math.random()<.36;
    rg.addColorStop(0,warm?`rgba(255,221,204,${a})`:`rgba(${175+Math.floor(55*core)},${195+Math.floor(35*core)},255,${a})`);
    rg.addColorStop(1,'rgba(95,115,230,0)');
    x.fillStyle=rg;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
  }

  // dark dust lanes
  x.globalCompositeOperation='source-over';
  for(let i=0;i<760;i++){
    const t=Math.random();
    const cx=W*(-.09+1.20*t),cy=H*(.808-.712*t+Math.sin(t*8.9)*.014);
    const off=gauss()*H*.021+H*.010;
    const px=cx+.46*off,py=cy+.89*off;
    const r=10+Math.random()*52;
    const rg=x.createRadialGradient(px,py,0,px,py,r);
    rg.addColorStop(0,`rgba(0,2,12,${.03+Math.random()*.12})`);
    rg.addColorStop(1,'rgba(0,1,8,0)');
    x.fillStyle=rg;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
  }

  // star field: tiny and varied
  x.globalCompositeOperation='screen';
  for(let i=0;i<10800;i++){
    const px=Math.random()*W,py=Math.pow(Math.random(),1.04)*H*.86;
    const b=Math.random();
    const r=b>.9975?1.45+Math.random()*1.75:(b>.988?.65+Math.random()*.85:.18+Math.random()*.55);
    const a=b>.9975?.95:.10+Math.random()*.60;
    const blue=Math.random()<.18;
    x.fillStyle=blue?`rgba(195,219,255,${a})`:`rgba(238,242,255,${a})`;
    x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
    if(b>.99915){
      x.strokeStyle=`rgba(210,230,255,${a*.32})`;x.lineWidth=.7;
      x.beginPath();x.moveTo(px-r*5,py);x.lineTo(px+r*5,py);x.moveTo(px,py-r*4);x.lineTo(px,py+r*4);x.stroke();
    }
  }

  // soft cloud wisps crossing lower galaxy
  x.globalCompositeOperation='source-over';
  for(let i=0;i<24;i++){
    const px=W*(.30+Math.random()*.78),py=H*(.34+Math.random()*.34);
    const rx=120+Math.random()*350,ry=18+Math.random()*38;
    const rg=x.createRadialGradient(px,py,0,px,py,rx);
    rg.addColorStop(0,'rgba(82,105,145,.055)');
    rg.addColorStop(1,'rgba(35,48,80,0)');
    x.fillStyle=rg;x.save();x.translate(px,py);x.scale(1,ry/rx);x.beginPath();x.arc(0,0,rx,0,Math.PI*2);x.fill();x.restore();
  }

  const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  return tex;
}
scene.background=makeSky();

function moonTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  const halo=x.createRadialGradient(256,256,18,256,256,248);
  halo.addColorStop(0,'rgba(255,255,250,1)');halo.addColorStop(.14,'rgba(248,252,255,.98)');halo.addColorStop(.27,'rgba(195,220,255,.32)');halo.addColorStop(.58,'rgba(115,155,255,.085)');halo.addColorStop(1,'rgba(85,125,255,0)');
  x.fillStyle=halo;x.fillRect(0,0,512,512);
  x.globalCompositeOperation='source-over';
  x.fillStyle='rgba(236,243,250,.95)';x.beginPath();x.arc(256,256,43,0,Math.PI*2);x.fill();
  for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,r=Math.random()*31,rr=2+Math.random()*7;x.fillStyle=`rgba(145,158,176,${.06+Math.random()*.09})`;x.beginPath();x.arc(256+Math.cos(a)*r,256+Math.sin(a)*r,rr,0,Math.PI*2);x.fill();}
  return new THREE.CanvasTexture(c);
}
const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:moonTexture(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
moon.position.set(39,32,-135);moon.scale.set(8.0,8.0,1);scene.add(moon);

function makeGroundMaps(){
  const N=768,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');
  x.fillStyle='#17271e';x.fillRect(0,0,N,N);
  for(let i=0;i<2600;i++){
    const px=Math.random()*N,py=Math.random()*N,r=2+Math.random()*25;
    const moss=Math.random()>.43;
    const rg=x.createRadialGradient(px,py,0,px,py,r);
    rg.addColorStop(0,moss?`rgba(52,88,55,${.05+Math.random()*.15})`:`rgba(88,69,43,${.035+Math.random()*.12})`);
    rg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=rg;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
  }
  for(let i=0;i<650;i++){x.fillStyle=`rgba(120,115,94,${.025+Math.random()*.07})`;x.beginPath();x.ellipse(Math.random()*N,Math.random()*N,1+Math.random()*2,4+Math.random()*10,Math.random()*Math.PI,0,Math.PI*2);x.fill();}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(14,18);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const bump=new THREE.CanvasTexture(c);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.copy(tex.repeat);
  return {tex,bump};
}
const gm=makeGroundMaps();
const tg=new THREE.PlaneGeometry(150,205,180,210);tg.rotateX(-Math.PI/2);
const pp=tg.attributes.position,cols=[],cc=new THREE.Color();
for(let i=0;i<pp.count;i++){
  const x=pp.getX(i),z=pp.getZ(i)-58;pp.setZ(i,z);const y=groundY(x,z);pp.setY(i,y);
  const dist=THREE.MathUtils.clamp((-z-5)/165,0,1),center=Math.exp(-(x*x)/520);
  const light=.14+.18*(1-dist)+.10*center+.06*Math.max(0,(y+2)/6);
  cc.setRGB(.055+light*.22,.095+light*.34,.080+light*.24);cols.push(cc.r,cc.g,cc.b);
}
tg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));tg.computeVertexNormals();
const ground=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({map:gm.tex,bumpMap:gm.bump,bumpScale:.18,vertexColors:true,roughness:.94,metalness:0}));
ground.receiveShadow=true;scene.add(ground);

function ridge(z,base,amp,width,col,seed){
  const n=190,pos=[];
  for(let i=0;i<n-1;i++){
    const f0=i/(n-1),f1=(i+1)/(n-1),x0=-width/2+width*f0,x1=-width/2+width*f1;
    const y0=base+Math.sin(f0*10.2+seed)*amp*.20+Math.sin(f0*24+seed*.8)*amp*.07+(fbm(f0*7.3+seed,seed*.33)-.5)*amp;
    const y1=base+Math.sin(f1*10.2+seed)*amp*.20+Math.sin(f1*24+seed*.8)*amp*.07+(fbm(f1*7.3+seed,seed*.33)-.5)*amp;
    pos.push(x0,y0,z,x1,y1,z,x0,-20,z,x1,y1,z,x1,-20,z,x0,-20,z);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();
  scene.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:col,roughness:1,metalness:0})));
}
ridge(-150,4.7,6.1,215,0x183853,2.1);ridge(-184,7.0,8.3,250,0x102a46,4.8);ridge(-224,9.2,10.8,295,0x0a2038,8.3);

const hemi=new THREE.HemisphereLight(0x9bb8e8,0x0a110c,.72);scene.add(hemi);
const key=new THREE.DirectionalLight(0xc8dcff,2.15);key.position.set(50,65,32);key.target.position.set(-4,2,-72);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-55;key.shadow.camera.right=55;key.shadow.camera.top=45;key.shadow.camera.bottom=-30;key.shadow.camera.near=1;key.shadow.camera.far=190;key.shadow.bias=-.0003;scene.add(key,key.target);
const fill=new THREE.DirectionalLight(0x426a9a,.42);fill.position.set(-35,18,5);scene.add(fill);
scene.add(new THREE.AmbientLight(0x14233c,.22));

const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
const TREE='https://cdn.polyhaven.com/asset_img/thumbs/fir_tree_01.png?format=png&width=1500';
const ROCK='https://cdn.polyhaven.com/asset_img/renders/rock_moss_set_01/orth_front.png?height=900&quality=95';
function load(url){return new Promise((res,rej)=>loader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();res(t)},undefined,rej))}
function crop(base,x,w){const t=base.clone();t.needsUpdate=true;t.offset.set(x,0);t.repeat.set(w,1);return t}
function addTree(map,aspect,x,z,h,tint=0xffffff,opacity=1,renderOrder=0){
  const mat=new THREE.SpriteMaterial({map,color:tint,transparent:true,alphaTest:.14,depthWrite:true,opacity,fog:true});
  const s=new THREE.Sprite(mat);s.center.set(.5,0);s.position.set(x,groundY(x,z)-.05,z);s.scale.set(h*aspect,h,1);s.renderOrder=renderOrder;scene.add(s);return s;
}
function addRock(map,x,z,h,tint=0x8a958b){const s=new THREE.Sprite(new THREE.SpriteMaterial({map,color:tint,transparent:true,alphaTest:.10,depthWrite:true,fog:true}));s.center.set(.5,.06);s.position.set(x,groundY(x,z)+.01,z);s.scale.set(h*1.24,h,1);scene.add(s);return s}

function fogTex(){const c=document.createElement('canvas');c.width=768;c.height=256;const x=c.getContext('2d');for(let i=0;i<44;i++){const px=70+Math.random()*630,py=72+Math.random()*110,r=35+Math.random()*140,g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,`rgba(170,199,230,${.020+Math.random()*.035})`);g.addColorStop(1,'rgba(100,135,185,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill()}return new THREE.CanvasTexture(c)}
const ft=fogTex(),fog=[];
for(let i=0;i<30;i++){
  const z=-34-seeded(i+1200,1.8)*105;
  const spread=12+THREE.MathUtils.clamp((-z-40)/100,0,1)*25;
  const x=(seeded(i+1200,2.2)-.5)*spread*2;
  const m=new THREE.SpriteMaterial({map:ft,transparent:true,depthWrite:false,opacity:.11+seeded(i+1200,4)*.10,color:0xb8d0e8,fog:true});
  const s=new THREE.Sprite(m);s.position.set(x,groundY(x,z)+1.0+seeded(i+1200,3)*1.7,z);s.scale.set(18+seeded(i+1200,5)*30,3.4+seeded(i+1200,6)*3.8,1);s.userData={x,phase:seeded(i+1200,7)*6.28};scene.add(s);fog.push(s);
}

try{
  const [tb,rb]=await Promise.all([load(TREE),load(ROCK)]);
  const tm=[crop(tb,0,.39),crop(tb,.335,.36),crop(tb,.665,.335)],ta=[.365,.337,.313];
  const rm=[crop(rb,0,.34),crop(rb,.33,.34),crop(rb,.66,.34)];

  // distant bands, broken into depth clusters rather than one row
  for(let band=0;band<3;band++){
    const count=[46,39,30][band];
    for(let i=0;i<count;i++){
      const id=i+band*100;
      const z=-65-band*26-seeded(id,1.7)*27;
      let x=(seeded(id,2.35)-.5)*(108+band*15);
      const gap=9+band*4;
      if(Math.abs(x)<gap && z>-118) x+=Math.sign(x||1)*(gap+seeded(id,8)*7);
      const idx=Math.floor(seeded(id,3.2)*3);
      const h=(4.1+seeded(id,4.7)*5.6)*(1-band*.08);
      const tint=[0x6f8794,0x58717f,0x425e6c][band];
      addTree(tm[idx],ta[idx],x,z,h,tint,.78-band*.05);
    }
  }

  // midground clusters on the banks
  const clusterCenters=[[-28,-40,12],[27,-46,10],[-37,-66,10],[38,-72,9]];
  clusterCenters.forEach((c,ci)=>{
    for(let j=0;j<c[2];j++){
      const id=500+ci*40+j,x=c[0]+(seeded(id,2)-.5)*17,z=c[1]+(seeded(id,3)-.5)*17;
      const idx=Math.floor(seeded(id,4)*3);addTree(tm[idx],ta[idx],x,z,7+seeded(id,5)*6,0x536c72,.90);
    }
  });

  // hero framing trees: only edges, clear sky in centre
  const hero=[[-31,8,22,0],[-24,-4,16,1],[-35,-12,18,2],[31,5,18,2],[38,-8,21,0],[27,-18,14,1]];
  hero.forEach(v=>addTree(tm[v[3]],ta[v[3]],v[0],v[1],v[2],0x3e5552,1,2));

  // natural rock groups instead of isolated pebbles
  const groups=[[-19,9,3.4],[-15,7,1.8],[17,8,3.1],[21,6,1.5],[-27,-7,2.4],[27,-11,2.2],[-8,2,1.35],[9,-5,1.25]];
  groups.forEach((v,i)=>addRock(rm[i%3],v[0],v[1],v[2],i<4?0x849587:0x71827a));

  // smaller foreground stones to give scale without clutter
  for(let i=0;i<16;i++){
    let x=(seeded(i+800,2.2)-.5)*54,z=14-seeded(i+800,3.1)*32;
    if(Math.abs(x)<5) x+=Math.sign(x||1)*7;
    addRock(rm[i%3],x,z,.55+seeded(i+800,5)*.85,0x65766d);
  }

  loading.innerHTML='CINEMATIC PASS 05 READY';
  setTimeout(()=>loading.style.opacity='0',900);
}catch(e){
  console.error(e);
  loading.innerHTML='NATURE ASSET CDN FAILED<br><span style="opacity:.5">sky · terrain · fog still active</span>';
}

const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.18,.50,.95));
composer.addPass(new OutputPass());

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  fog.forEach(s=>{s.position.x=s.userData.x+Math.sin(t*.030+s.userData.phase)*1.15});
  camera.position.x=Math.sin(t*.022)*.16;
  camera.position.y=6.55+Math.sin(t*.019)*.045;
  camera.lookAt(Math.sin(t*.016)*.16,11.7,-92);
  composer.render();
}
animate();

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
});