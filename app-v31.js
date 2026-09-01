import * as THREE from 'three';

const loading=document.querySelector('#loading');
const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 31';
if(credit) credit.textContent='Three.js · lower-panel point-data reconstruction v31';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setClearColor(0x010309,1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'1'});
document.body.prepend(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-1,1,1,-1,-4,4);
camera.position.z=2;

const MAP_W=96,MAP_H=31,STRIDE=7;
const REF_ASPECT=1317/430;
const REF_H=100,REF_W=REF_H*REF_ASPECT;

const chunkCount=6;
const parts=await Promise.all(Array.from({length:chunkCount},(_,i)=>
  fetch(`./map-v31-${i}.part`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`map chunk ${i}: ${r.status}`);return r.text();})
));
const packed=parts.join('').trim();
const bin=atob(packed);
const map=new Uint8Array(bin.length);
for(let i=0;i<bin.length;i++)map[i]=bin.charCodeAt(i);
if(map.length!==MAP_W*MAP_H*STRIDE)throw new Error(`v31 map mismatch ${map.length}`);

function rngFactory(seed=31092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lum=(r,g,b)=>.2126*r+.7152*g+.0722*b;

function getCell(x,y){
  x=clamp(x,0,MAP_W-1)|0;y=clamp(y,0,MAP_H-1)|0;
  const k=(y*MAP_W+x)*STRIDE;
  return [map[k],map[k+1],map[k+2],map[k+3],map[k+4],map[k+5],map[k+6]];
}
function sample(u,v){
  const fx=clamp(u,0,1)*(MAP_W-1),fy=clamp(v,0,1)*(MAP_H-1);
  const x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(MAP_W-1,x0+1),y1=Math.min(MAP_H-1,y0+1);
  const tx=fx-x0,ty=fy-y0;
  const a=getCell(x0,y0),b=getCell(x1,y0),c=getCell(x0,y1),d=getCell(x1,y1),out=new Array(7);
  for(let i=0;i<7;i++){
    const top=a[i]*(1-tx)+b[i]*tx,bot=c[i]*(1-tx)+d[i]*tx;
    out[i]=top*(1-ty)+bot*ty;
  }
  return out;
}
function world(u,v,z=0){return[(u-.5)*REF_W,(.5-v)*REF_H,z];}
function fitCamera(){
  const vp=Math.max(.1,innerWidth/Math.max(1,innerHeight));
  if(vp<REF_ASPECT){
    camera.left=-REF_W/2;camera.right=REF_W/2;
    const vh=REF_W/vp;camera.top=vh/2;camera.bottom=-vh/2;
  }else{
    camera.top=REF_H/2;camera.bottom=-REF_H/2;
    const vw=REF_H*vp;camera.left=-vw/2;camera.right=vw/2;
  }
  camera.updateProjectionMatrix();
}
fitCamera();

const P=[],C=[],S=[],A=[],R=[];
const HP=[],HC=[],HS=[],HA=[],HR=[];
const yieldTask=()=>new Promise(r=>setTimeout(r,0));

async function buildParticles(){
  const ATTEMPTS=360000;
  const batch=60000;
  for(let start=0;start<ATTEMPTS;start+=batch){
    const end=Math.min(ATTEMPTS,start+batch);
    if(loading)loading.innerHTML=`RECONSTRUCTING LOWER PANEL<br><span style="opacity:.48">point-data pass ${Math.floor(start/batch)+1}/${Math.ceil(ATTEMPTS/batch)}</span>`;
    for(let i=start;i<end;i++){
      const u=rnd(),v=rnd();
      const s=sample(u,v);
      const ar=s[0],ag=s[1],ab=s[2],pr=s[3],pg=s[4],pb=s[5],frac=s[6]/255;
      const L=lum(ar,ag,ab);
      const weight=Math.min(1,.025+.23*frac+.72*Math.pow(Math.max(0,L-2)/85,1.22));
      if(rnd()>weight)continue;
      const mix=rand(.15,.80);
      const gain=(.92+.28*Math.min(1,L/70))*rand(.90,1.10);
      const rr=clamp((ar*(1-mix)+pr*mix)*gain,0,255)/255;
      const gg=clamp((ag*(1-mix)+pg*mix)*gain,0,255)/255;
      const bb=clamp((ab*(1-mix)+pb*mix)*gain,0,255)/255;
      const [x,y,z]=world(u,v,0);
      const q=rnd();
      const size=q<.68?rand(.72,.92):q<.94?rand(.92,1.12):rand(1.12,1.32);
      const alpha=clamp(rand(.50,.72)+L/255*.34,0,1);
      P.push(x,y,z);C.push(rr,gg,bb);S.push(size);A.push(alpha);R.push(rnd());
    }
    renderer.render(scene,camera);
    await yieldTask();
  }

  for(let gy=0;gy<MAP_H;gy++)for(let gx=0;gx<MAP_W;gx++){
    const c=getCell(gx,gy),L=lum(c[0],c[1],c[2]),PL=lum(c[3],c[4],c[5]);
    if(PL<82||PL<L*1.55+16)continue;
    if(rnd()>.34)continue;
    const u=(gx+rand(.18,.82))/MAP_W,v=(gy+rand(.18,.82))/MAP_H;
    const [x,y,z]=world(u,v,.18),gain=rand(1.02,1.13);
    HP.push(x,y,z);HC.push(clamp(c[3]*gain,0,255)/255,clamp(c[4]*gain,0,255)/255,clamp(c[5]*gain,0,255)/255);
    HS.push(PL>150?rand(1.28,1.62):rand(1.02,1.34));HA.push(PL>150?rand(.78,.96):rand(.60,.82));HR.push(rnd());
  }
}
await buildParticles();

function material({min=.7,max=1.4,opacity=1,halo=.04,twinkle=.004}={}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uDpr:{value:renderer.getPixelRatio()},uMin:{value:min},uMax:{value:max},uOpacity:{value:opacity},uHalo:{value:halo},uTime:{value:0}},
    vertexShader:`attribute vec3 color;attribute float aSize;attribute float aAlpha;attribute float aSeed;varying vec3 vColor;varying float vAlpha;uniform float uDpr,uMin,uMax,uTime;void main(){vColor=color;vAlpha=aAlpha;float tw=1.0+sin(uTime*(.10+aSeed*.24)+aSeed*47.0)*${twinkle.toFixed(3)};gl_PointSize=clamp(aSize*uDpr*tw,uMin*uDpr,uMax*uDpr);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha;uniform float uOpacity,uHalo;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p)*2.0;if(d>1.0)discard;float core=1.0-smoothstep(.10,.58,d);float halo=(1.0-smoothstep(.48,1.0,d))*uHalo;float a=(core+halo)*vAlpha*uOpacity;if(a<.004)discard;gl_FragColor=vec4(vColor,a);}`
  });
}
function addPoints(P,C,S,A,R,mat,order){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  g.setAttribute('aSize',new THREE.Float32BufferAttribute(S,1));
  g.setAttribute('aAlpha',new THREE.Float32BufferAttribute(A,1));
  g.setAttribute('aSeed',new THREE.Float32BufferAttribute(R,1));
  const pts=new THREE.Points(g,mat);pts.renderOrder=order;scene.add(pts);return pts;
}
const mainMat=material({min:.72,max:1.34,opacity:1.10,halo:.035,twinkle:.003});
const hiMat=material({min:1.00,max:1.72,opacity:1.00,halo:.22,twinkle:.012});
addPoints(P,C,S,A,R,mainMat,1);addPoints(HP,HC,HS,HA,HR,hiMat,2);

if(loading){loading.innerHTML=`POINT MAP READY<br><span style="opacity:.48">96 × 31 bilinear source map · ${(P.length/3).toLocaleString()} points · aspect locked</span>`;setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},260);}

const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);mainMat.uniforms.uTime.value+=dt;hiMat.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));renderer.setSize(innerWidth,innerHeight,false);fitCamera();const d=renderer.getPixelRatio();mainMat.uniforms.uDpr.value=d;hiMat.uniforms.uDpr.value=d;});
