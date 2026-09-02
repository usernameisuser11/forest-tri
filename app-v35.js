import './app-v32.js';
import * as THREE from 'three';

const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 35';
if(credit) credit.textContent='Three.js · approved v32 + sampled exterior star coordinates';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'2',pointerEvents:'none'});
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-1,1,1,-1,-2,2);
camera.position.z=1;

function rngFactory(seed=35092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const txt=await fetch('./ext-v35-0.part',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`v35 exterior data ${r.status}`);return r.text();});
const clean=txt.trim();
const bin=atob(clean);
const data=new Uint8Array(bin.length);
for(let i=0;i<bin.length;i++)data[i]=bin.charCodeAt(i);
if(data.length%8!==0)throw new Error(`v35 exterior point data mismatch ${data.length}`);

const P=[],C=[],S=[],A=[],R=[];
const HP=[],HC=[],HS=[],HA=[],HR=[];

// Exact sampled stars from the generated exterior reference.
for(let k=0;k<data.length;k+=8){
  const xq=(data[k]<<8)|data[k+1];
  const yq=(data[k+2]<<8)|data[k+3];
  const rr=data[k+4]/255,gg=data[k+5]/255,bb=data[k+6]/255,L=data[k+7]/255;
  const x=xq/65535*2-1;
  const y=1-yq/65535*2;
  const gain=rand(.82,1.08);
  const col=[Math.min(1,rr*gain),Math.min(1,gg*gain),Math.min(1,bb*gain)];
  const q=rnd();
  const size=L>.72?rand(1.18,1.55):L>.46?rand(.92,1.20):rand(.76,1.02);
  const alpha=L>.72?rand(.62,.88):L>.46?rand(.42,.68):rand(.26,.48);
  P.push(x,y,0);C.push(...col);S.push(size);A.push(alpha);R.push(rnd());

  // Micro-stars around each extracted coordinate preserve the local density pattern
  // without introducing a new rectangular boundary.
  const children=L>.65?8:L>.38?6:4;
  for(let j=0;j<children;j++){
    const radius=Math.pow(rnd(),1.65)*rand(.003,.017);
    const ang=rand(0,Math.PI*2);
    const cx=clamp(x+Math.cos(ang)*radius,-1,1);
    const cy=clamp(y+Math.sin(ang)*radius,-1,1);
    const cg=rand(.38,.72);
    P.push(cx,cy,-.04);C.push(col[0]*cg,col[1]*cg,col[2]*cg);S.push(rand(.66,.92));A.push(rand(.15,.32));R.push(rnd());
  }

  if(L>.76 && rnd()<.42){
    HP.push(x,y,.12);HC.push(...col);HS.push(rand(1.28,1.72));HA.push(rand(.58,.84));HR.push(rnd());
  }
}

// Ultra-faint edge-to-edge substrate: same density everywhere, so no rectangular seams.
const FP=[],FC=[],FS=[],FA=[],FR=[];
const BASE=145000;
for(let i=0;i<BASE;i++){
  const x=rand(-1,1),y=rand(-1,1);
  const q=rnd();
  let col=q<.48?[.60,.70,.92]:q<.77?[.82,.88,1.0]:q<.91?[.90,.78,.63]:q<.97?[.72,.63,.91]:[.92,.61,.73];
  const gain=rand(.26,.58);
  col=col.map(v=>v*gain);
  FP.push(x,y,-.18);FC.push(...col);FS.push(rand(.62,.86));FA.push(rand(.10,.23));FR.push(rnd());
}

function material({min,max,opacity,halo,twinkle}){
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uDpr:{value:renderer.getPixelRatio()},uMin:{value:min},uMax:{value:max},uOpacity:{value:opacity},uHalo:{value:halo},uTime:{value:0}},
    vertexShader:`attribute vec3 color;attribute float aSize;attribute float aAlpha;attribute float aSeed;varying vec3 vColor;varying float vAlpha;uniform float uDpr,uMin,uMax,uTime;void main(){vColor=color;vAlpha=aAlpha;float tw=1.0+sin(uTime*(.10+aSeed*.20)+aSeed*43.0)*${twinkle.toFixed(3)};gl_PointSize=clamp(aSize*uDpr*tw,uMin*uDpr,uMax*uDpr);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha;uniform float uOpacity,uHalo;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p)*2.0;if(d>1.0)discard;float core=1.0-smoothstep(.08,.58,d);float halo=(1.0-smoothstep(.48,1.0,d))*uHalo;float a=(core+halo)*vAlpha*uOpacity;if(a<.0025)discard;gl_FragColor=vec4(vColor,a);}`});
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

const faintMat=material({min:.62,max:.88,opacity:.78,halo:.01,twinkle:.001});
const extMat=material({min:.72,max:1.58,opacity:.96,halo:.045,twinkle:.003});
const hiMat=material({min:1.12,max:1.78,opacity:.90,halo:.18,twinkle:.010});
addPoints(FP,FC,FS,FA,FR,faintMat,-2);
addPoints(P,C,S,A,R,extMat,-1);
addPoints(HP,HC,HS,HA,HR,hiMat,0);

const clock=new THREE.Clock(),mats=[faintMat,extMat,hiMat];
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();

addEventListener('resize',()=>{
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  const d=renderer.getPixelRatio();for(const m of mats)m.uniforms.uDpr.value=d;
});
