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
scene.fog=new THREE.FogExp2(0x091725,.0062);
const camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,650);
camera.position.set(0,6.35,34);
camera.lookAt(0,12.4,-96);

function hash(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453123;return s-Math.floor(s)}
function sm(t){return t*t*(3-2*t)}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=sm(fx),v=sm(fz),a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a,b,u),THREE.MathUtils.lerp(c,d,u),v)}
function fbm(x,z){let s=0,a=.5,f=1;for(let i=0;i<6;i++){s+=noise(x*f,z*f)*a;f*=2.03;a*=.5}return s}
function seeded(i,k=1){const v=Math.sin(i*12.9898*k+78.233)*43758.5453;return v-Math.floor(v)}
function gauss(){return Math.random()+Math.random()+Math.random()+Math.random()-2}

function groundY(x,z){
  const broad=(fbm(x*.024,z*.024)-.5)*3.8;
  const detail=(fbm((x+67)*.075,(z-14)*.075)-.5)*.95;
  const banks=Math.pow(Math.min(1,Math.abs(x)/43),1.78)*2.8;
  const valley=-Math.exp(-(x*x)/255)*1.35;
  const far=THREE.MathUtils.clamp((-z-40)/150,0,1)*1.8;
  return -1.75+broad+detail+banks+valley+far;
}

/* ===================== CINEMATIC REALISTIC MILKY WAY ===================== */
function galaxyCenter(t,W,H){
  return {
    x:W*(-.18+1.38*t),
    y:H*(.885-.755*t + Math.sin(t*7.7)*.013 + Math.sin(t*19.0)*.004)
  };
}

function makeSky(){
  const W=4096,H=2304,c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d');

  // Realistic dark-sky gradient: near-black zenith, faint cyan-blue horizon airglow.
  const g=x.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#010207');
  g.addColorStop(.18,'#020612');
  g.addColorStop(.40,'#061126');
  g.addColorStop(.60,'#0a2140');
  g.addColorStop(.77,'#113457');
  g.addColorStop(.90,'#173f63');
  g.addColorStop(1,'#091827');
  x.fillStyle=g;x.fillRect(0,0,W,H);

  const air=x.createLinearGradient(0,H*.54,0,H*.95);
  air.addColorStop(0,'rgba(90,130,170,0)');
  air.addColorStop(.58,'rgba(104,151,186,.11)');
  air.addColorStop(1,'rgba(18,30,45,0)');
  x.fillStyle=air;x.fillRect(0,H*.48,W,H*.50);

  // Dense all-sky stellar background. Almost all stars are sub-pixel/small.
  x.globalCompositeOperation='screen';
  for(let i=0;i<18000;i++){
    const px=Math.random()*W,py=Math.pow(Math.random(),1.025)*H*.90;
    const q=Math.random();
    let r,a;
    if(q>.99945){r=1.7+Math.random()*2.0;a=.96;}
    else if(q>.993){r=.55+Math.random()*.85;a=.28+Math.random()*.48;}
    else{r=.10+Math.random()*.40;a=.07+Math.random()*.43;}
    const tint=Math.random();
    if(tint<.11)x.fillStyle=`rgba(195,218,255,${a})`;
    else if(tint<.145)x.fillStyle=`rgba(255,225,199,${a*.72})`;
    else x.fillStyle=`rgba(239,243,255,${a})`;
    x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
    if(q>.99972){
      x.strokeStyle=`rgba(215,232,255,${a*.26})`;x.lineWidth=.7;
      x.beginPath();x.moveTo(px-r*5.2,py);x.lineTo(px+r*5.2,py);x.moveTo(px,py-r*4.0);x.lineTo(px,py+r*4.0);x.stroke();
    }
  }

  // Broad but very low-opacity galactic luminosity. Warm-neutral core, cool outer disk.
  for(let i=0;i<420;i++){
    const t=Math.random(),p=galaxyCenter(t,W,H),core=Math.exp(-Math.pow((t-.56)/.19,2));
    const width=H*(.045+.028*(.5+.5*Math.sin(t*13.0+1.2))+.022*core);
    const off=gauss()*width;
    const px=p.x+.50*off,py=p.y+.865*off;
    const rx=45+Math.random()*(105+core*80),ry=14+Math.random()*(34+core*23);
    const grad=x.createRadialGradient(px,py,0,px,py,rx);
    const a=.008+Math.random()*(.018+core*.020);
    const choice=Math.random();
    if(core>.34&&choice<.48)grad.addColorStop(0,`rgba(244,226,206,${a})`);
    else if(choice<.56)grad.addColorStop(0,`rgba(205,207,219,${a})`);
    else grad.addColorStop(0,`rgba(135,163,220,${a})`);
    grad.addColorStop(1,'rgba(55,75,125,0)');
    x.fillStyle=grad;x.save();x.translate(px,py);x.rotate(-.34+gauss()*.04);x.scale(1,ry/rx);x.beginPath();x.arc(0,0,rx,0,Math.PI*2);x.fill();x.restore();
  }

  // Main Milky Way: tens of thousands of actual points, with width/brightness variation.
  for(let i=0;i<28000;i++){
    const t=Math.random(),p=galaxyCenter(t,W,H),core=Math.exp(-Math.pow((t-.56)/.16,2));
    const patch=.46+.54*(.5+.5*Math.sin(t*37.0+Math.sin(t*8.0)*2.3));
    if(Math.random()>.64+.22*core+.11*patch)continue;
    const localWidth=H*(.026+.032*(.5+.5*Math.sin(t*12.2+.8))+.022*core);
    const off=gauss()*localWidth;
    const px=p.x+.50*off,py=p.y+.865*off;
    const q=Math.random();
    const r=q>.9974?.75+Math.random()*1.18:.11+Math.random()*.44;
    const fall=1-.42*Math.min(1,Math.abs(off)/(localWidth*2.25));
    const alpha=(.08+Math.random()*(.43+core*.18))*fall;
    const tint=Math.random();
    if(core>.40&&tint<.27)x.fillStyle=`rgba(250,229,210,${alpha*.74})`;
    else if(tint<.38)x.fillStyle=`rgba(205,216,242,${alpha})`;
    else x.fillStyle=`rgba(229,236,246,${alpha})`;
    x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
  }

  // Larger star-cloud islands: bright granular patches like real wide-field Milky Way photos.
  for(let k=0;k<82;k++){
    const t=.035+Math.random()*.93,p=galaxyCenter(t,W,H),core=Math.exp(-Math.pow((t-.56)/.20,2));
    const side=(Math.random()-.5)*H*(.045+.028*Math.random());
    const cx=p.x+.50*side,cy=p.y+.865*side;
    const sx=18+Math.random()*(44+core*35),sy=6+Math.random()*(17+core*12);
    const count=55+Math.floor(Math.random()*(105+core*85));
    for(let j=0;j<count;j++){
      const ang=Math.random()*Math.PI*2,rr=Math.sqrt(Math.random());
      const px=cx+Math.cos(ang)*rr*sx,py=cy+Math.sin(ang)*rr*sy;
      const r=.10+Math.random()*.48,al=.06+Math.random()*(.24+core*.17);
      const q=Math.random();
      if(core>.45&&q<.18)x.fillStyle=`rgba(251,229,211,${al*.74})`;
      else x.fillStyle=`rgba(222,232,247,${al})`;
      x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
    }
  }

  // Galactic center: subtle cream/gold stellar bulge, never orange or neon.
  for(let i=0;i<2100;i++){
    const t=.37+Math.random()*.38,p=galaxyCenter(t,W,H),core=Math.exp(-Math.pow((t-.56)/.115,2));
    if(Math.random()>.16+.78*core)continue;
    const off=gauss()*H*(.014+.018*core);
    const px=p.x+.50*off,py=p.y+.865*off;
    const r=.35+Math.random()*(1.4+core*2.8),rg=x.createRadialGradient(px,py,0,px,py,r*2.5);
    rg.addColorStop(0,`rgba(248,229,207,${.025+Math.random()*(.075+core*.08)})`);
    rg.addColorStop(1,'rgba(210,220,240,0)');x.fillStyle=rg;x.beginPath();x.arc(px,py,r*2.5,0,Math.PI*2);x.fill();
  }

  // A few faint HII regions: actual Milky Way can show small red/magenta emission regions.
  for(let i=0;i<24;i++){
    const t=.22+Math.random()*.62,p=galaxyCenter(t,W,H),off=(Math.random()-.5)*H*.045;
    const px=p.x+.50*off,py=p.y+.865*off,r=6+Math.random()*20;
    const rg=x.createRadialGradient(px,py,0,px,py,r);
    rg.addColorStop(0,`rgba(210,105,130,${.012+Math.random()*.025})`);rg.addColorStop(1,'rgba(150,70,110,0)');
    x.fillStyle=rg;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
  }

  // Dark dust lanes. Three broken lanes create the unmistakable Milky Way split/rift.
  x.globalCompositeOperation='source-over';
  for(let lane=0;lane<3;lane++){
    for(let i=0;i<420;i++){
      const t=Math.random(),p=galaxyCenter(t,W,H),core=Math.exp(-Math.pow((t-.56)/.21,2));
      const wave=Math.sin(t*(9.4+lane*3.1)+lane*2.0)*H*(.008+.003*lane);
      const shift=(lane-1)*H*.016+wave;
      const off=shift+gauss()*H*(.008+.003*lane);
      const px=p.x+.50*off,py=p.y+.865*off;
      const rx=18+Math.random()*(44+core*30),ry=4+Math.random()*(12+core*7);
      const alpha=.050+Math.random()*(.095+core*.055);
      const rg=x.createRadialGradient(px,py,0,px,py,rx);
      rg.addColorStop(0,`rgba(0,2,9,${alpha})`);rg.addColorStop(1,'rgba(0,2,9,0)');
      x.fillStyle=rg;x.save();x.translate(px,py);x.rotate(-.34+gauss()*.09);x.scale(1,ry/rx);x.beginPath();x.arc(0,0,rx,0,Math.PI*2);x.fill();x.restore();
    }
  }

  // Re-seed stars after dust lanes so the band reads as stars, not painted smoke.
  x.globalCompositeOperation='screen';
  for(let i=0;i<7200;i++){
    const t=Math.random(),p=galaxyCenter(t,W,H),core=Math.exp(-Math.pow((t-.56)/.18,2));
    const off=gauss()*H*(.045+.010*core),px=p.x+.50*off,py=p.y+.865*off;
    const r=.09+Math.random()*.36,a=.07+Math.random()*.34;
    x.fillStyle=Math.random()<.12?`rgba(255,230,207,${a*.65})`:`rgba(231,239,252,${a})`;
    x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
  }

  // Sparse real high-altitude cloud wisps, kept extremely weak.
  x.globalCompositeOperation='source-over';
  for(let i=0;i<8;i++){
    const px=W*(.12+Math.random()*.82),py=H*(.45+Math.random()*.21),rx=170+Math.random()*330,ry=12+Math.random()*22;
    const rg=x.createRadialGradient(px,py,0,px,py,rx);rg.addColorStop(0,'rgba(75,93,120,.022)');rg.addColorStop(1,'rgba(28,40,65,0)');
    x.fillStyle=rg;x.save();x.translate(px,py);x.rotate(-.1+Math.random()*.2);x.scale(1,ry/rx);x.beginPath();x.arc(0,0,rx,0,Math.PI*2);x.fill();x.restore();
  }

  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex;
}
scene.background=makeSky();

/* ===================== MOON ===================== */
function moonTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  const halo=x.createRadialGradient(256,256,24,256,256,250);
  halo.addColorStop(0,'rgba(255,255,248,.98)');halo.addColorStop(.13,'rgba(245,250,255,.89)');halo.addColorStop(.24,'rgba(190,215,255,.20)');halo.addColorStop(.52,'rgba(110,150,245,.045)');halo.addColorStop(1,'rgba(80,120,235,0)');x.fillStyle=halo;x.fillRect(0,0,512,512);
  x.fillStyle='rgba(235,241,244,.97)';x.beginPath();x.arc(256,256,34,0,Math.PI*2);x.fill();
  for(let i=0;i<28;i++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*28,rr=1.5+Math.random()*5.3;x.fillStyle=`rgba(128,139,151,${.04+Math.random()*.085})`;x.beginPath();x.arc(256+Math.cos(a)*r,256+Math.sin(a)*r,rr,0,Math.PI*2);x.fill();}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:moonTexture(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
moon.position.set(58,36,-155);moon.scale.set(5.7,5.7,1);scene.add(moon);

/* ===================== TERRAIN ===================== */
function makeGroundMaps(){
  const N=768,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle='#1a281f';x.fillRect(0,0,N,N);
  for(let i=0;i<2800;i++){const px=Math.random()*N,py=Math.random()*N,r=2+Math.random()*26,rg=x.createRadialGradient(px,py,0,px,py,r);const moss=Math.random()>.41;rg.addColorStop(0,moss?`rgba(54,91,57,${.05+Math.random()*.15})`:`rgba(94,72,46,${.035+Math.random()*.11})`);rg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=rg;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();}
  for(let i=0;i<720;i++){x.fillStyle=`rgba(120,116,96,${.025+Math.random()*.06})`;x.beginPath();x.ellipse(Math.random()*N,Math.random()*N,1+Math.random()*2,4+Math.random()*10,Math.random()*Math.PI,0,Math.PI*2);x.fill();}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(14,19);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const bump=tex.clone();bump.needsUpdate=true;return {tex,bump};
}
const gm=makeGroundMaps();
const tg=new THREE.PlaneGeometry(154,210,180,210);tg.rotateX(-Math.PI/2);const pp=tg.attributes.position,cols=[],cc=new THREE.Color();
for(let i=0;i<pp.count;i++){const x=pp.getX(i),z=pp.getZ(i)-60;pp.setZ(i,z);const y=groundY(x,z);pp.setY(i,y);const dist=THREE.MathUtils.clamp((-z-4)/175,0,1),center=Math.exp(-(x*x)/620);const light=.19+.20*(1-dist)+.10*center+.05*Math.max(0,(y+2)/6);cc.setRGB(.065+light*.22,.105+light*.36,.085+light*.25);cols.push(cc.r,cc.g,cc.b);}
tg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));tg.computeVertexNormals();
const ground=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({map:gm.tex,bumpMap:gm.bump,bumpScale:.16,vertexColors:true,roughness:.95,metalness:0}));ground.receiveShadow=true;scene.add(ground);

function ridge(z,base,amp,width,col,seed){const n=190,pos=[];for(let i=0;i<n-1;i++){const f0=i/(n-1),f1=(i+1)/(n-1),x0=-width/2+width*f0,x1=-width/2+width*f1,y0=base+Math.sin(f0*10.2+seed)*amp*.20+Math.sin(f0*24+seed*.8)*amp*.07+(fbm(f0*7.3+seed,seed*.33)-.5)*amp,y1=base+Math.sin(f1*10.2+seed)*amp*.20+Math.sin(f1*24+seed*.8)*amp*.07+(fbm(f1*7.3+seed,seed*.33)-.5)*amp;pos.push(x0,y0,z,x1,y1,z,x0,-20,z,x1,y1,z,x1,-20,z,x0,-20,z);}const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));gg.computeVertexNormals();scene.add(new THREE.Mesh(gg,new THREE.MeshStandardMaterial({color:col,roughness:1,metalness:0})));}
ridge(-154,4.2,5.7,218,0x17364f,2.1);ridge(-190,6.6,8.0,255,0x102943,4.8);ridge(-232,8.8,10.4,300,0x0a2036,8.3);

/* ===================== LIGHT ===================== */
scene.add(new THREE.HemisphereLight(0x9db9e3,0x0b130d,.76));
const key=new THREE.DirectionalLight(0xcbdfff,2.25);key.position.set(58,68,34);key.target.position.set(-5,2,-78);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-58;key.shadow.camera.right=58;key.shadow.camera.top=48;key.shadow.camera.bottom=-30;key.shadow.camera.near=1;key.shadow.camera.far=200;key.shadow.bias=-.0003;scene.add(key,key.target);
const fill=new THREE.DirectionalLight(0x446c9c,.48);fill.position.set(-38,22,6);scene.add(fill,new THREE.AmbientLight(0x17283e,.25));

/* ===================== FOG ===================== */
function fogTex(){const c=document.createElement('canvas');c.width=768;c.height=256;const x=c.getContext('2d');for(let i=0;i<45;i++){const px=90+Math.random()*590,py=55+Math.random()*145,r=45+Math.random()*145,g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,`rgba(160,193,220,${.016+Math.random()*.035})`);g.addColorStop(1,'rgba(100,135,180,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();}return new THREE.CanvasTexture(c);}
const ft=fogTex(),fog=[];
for(let i=0;i<30;i++){const z=-32-seeded(i+900,1.7)*100;const spread=9+Math.max(0,(z+118)*.07);let x=(seeded(i+900,2.1)-.5)*spread*2.1;const m=new THREE.SpriteMaterial({map:ft,transparent:true,depthWrite:false,opacity:.12+seeded(i+900,4)*.10,color:0xa8c5df,fog:true}),s=new THREE.Sprite(m);s.position.set(x,groundY(x,z)+1.0+seeded(i+900,3)*1.9,z);s.scale.set(16+seeded(i+900,5)*30,3.7+seeded(i+900,6)*4.0,1);s.userData={x,phase:seeded(i+900,7)*6.28};scene.add(s);fog.push(s);}

/* ===================== TREE / ROCK IMPOSTORS ===================== */
const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
const TREE='https://cdn.polyhaven.com/asset_img/thumbs/fir_tree_01.png?format=png&width=1500';
const ROCK='https://cdn.polyhaven.com/asset_img/renders/rock_moss_set_01/orth_front.png?height=900&quality=95';
function load(url){return new Promise((res,rej)=>loader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();res(t)},undefined,rej));}
function crop(base,x,w){const t=base.clone();t.needsUpdate=true;t.offset.set(x,0);t.repeat.set(w,1);return t;}
function addTree(map,aspect,x,z,h,tint=0xffffff,opacity=1){const s=new THREE.Sprite(new THREE.SpriteMaterial({map,color:tint,transparent:true,alphaTest:.16,depthWrite:true,opacity,fog:true}));s.center.set(.5,0);s.position.set(x,groundY(x,z)-.03,z);s.scale.set(h*aspect,h,1);scene.add(s);return s;}
function addRock(map,x,z,h,tint=0x7f8e80){const s=new THREE.Sprite(new THREE.SpriteMaterial({map,color:tint,transparent:true,alphaTest:.12,depthWrite:true,fog:true}));s.center.set(.5,.07);s.position.set(x,groundY(x,z)+.02,z);s.scale.set(h*1.20,h,1);scene.add(s);return s;}

try{
  const [tb,rb]=await Promise.all([load(TREE),load(ROCK)]);
  const tm=[crop(tb,0,.39),crop(tb,.335,.36),crop(tb,.665,.335)],ta=[.365,.337,.313],rm=[crop(rb,0,.34),crop(rb,.33,.34),crop(rb,.66,.34)];
  for(let cluster=0;cluster<13;cluster++){
    const cz=-58-seeded(cluster,1.9)*75;
    let cx=(seeded(cluster,2.6)-.5)*104;
    if(Math.abs(cx)<13&&cz>-112)cx+=Math.sign(cx||1)*(17+seeded(cluster,5.1)*9);
    const count=5+Math.floor(seeded(cluster,3.7)*8);
    for(let j=0;j<count;j++){
      const id=cluster*20+j,z=cz+(seeded(id,4.7)-.5)*19,x=cx+(seeded(id,7.1)-.5)*16,idx=Math.floor(seeded(id,8.4)*3),h=4.8+seeded(id,9.3)*7.4;
      if(Math.abs(x)<9&&z>-100)continue;addTree(tm[idx],ta[idx],x,z,h,0x728a91,.82+seeded(id,4.2)*.16);
    }
  }
  const hero=[[-29,10,20,0],[-24,-3,15,2],[-34,-20,17,1],[27,8,15,2],[34,-8,19,0],[27,-24,13,1]];
  hero.forEach(v=>addTree(tm[v[3]],ta[v[3]],v[0],v[1],v[2],0x7b9293,1));
  const rockGroups=[[[-24,12,3.3,0],[-20,10,1.3,2],[-27,8,1.1,1]],[[22,10,3.0,1],[26,7,1.4,2],[19,6,1.0,0]],[[-13,-3,1.7,2],[-10,-4,1.0,1]],[[16,-14,1.9,0],[20,-15,1.1,2]]];
  rockGroups.flat().forEach(v=>addRock(rm[v[3]],v[0],v[1],v[2]));
  loading.innerHTML='CINEMATIC PASS 07 READY';setTimeout(()=>loading.style.opacity='0',900);
}catch(e){console.error(e);loading.innerHTML='NATURE ASSET CDN FAILED<br><span style="opacity:.5">sky · terrain · fog are still active</span>';}

/* ===================== POST / LOOP ===================== */
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.13,.40,.985));composer.addPass(new OutputPass());
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();fog.forEach(s=>{s.position.x=s.userData.x+Math.sin(t*.031+s.userData.phase)*.75;});camera.position.x=Math.sin(t*.026)*.16;camera.position.y=6.35+Math.sin(t*.022)*.045;camera.lookAt(Math.sin(t*.018)*.18,12.4,-96);composer.render();}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});