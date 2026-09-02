import './app-v33.js';
import * as THREE from 'three';

const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 34';
if(credit) credit.textContent='Three.js · approved v32 core + edge-to-edge starfield';

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

function rngFactory(seed=34092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();

const P=[],C=[],S=[],A=[],R=[];
const COUNT=260000;
for(let i=0;i<COUNT;i++){
  const x=rand(-1,1),y=rand(-1,1);

  // Keep the approved v32 galaxy readable while still filling every pixel row.
  // The central diagonal receives fewer overlay stars; top/bottom bands receive more.
  const bandY=0.18-0.52*x;
  const dist=Math.abs(y-bandY);
  const edgeBoost=Math.pow(Math.min(1,Math.abs(y)*1.18),1.35);
  const keep=0.42 + 0.38*edgeBoost + 0.20*Math.min(1,dist/0.42);
  if(rnd()>keep) continue;

  const q=rnd();
  let col;
  if(q<.43) col=[.66,.75,.98];
  else if(q<.74) col=[.88,.92,1.0];
  else if(q<.88) col=[1.0,.86,.67];
  else if(q<.96) col=[.83,.70,1.0];
  else col=[1.0,.68,.78];

  const gain=rand(.48,.92);
  col=col.map(v=>Math.min(1,v*gain));

  const s=rnd();
  const size=s<.76?rand(.72,.94):s<.97?rand(.94,1.18):rand(1.18,1.42);
  const alpha=s<.76?rand(.22,.42):s<.97?rand(.34,.56):rand(.48,.72);

  P.push(x,y,0);
  C.push(...col);
  S.push(size);
  A.push(alpha);
  R.push(rnd());
}

// A sparse brighter layer prevents the formerly empty bands from looking flat.
const BP=[],BC=[],BS=[],BA=[],BR=[];
for(let i=0;i<1100;i++){
  const x=rand(-1,1),y=rand(-1,1);
  const bandY=0.18-0.52*x;
  if(Math.abs(y-bandY)<.25 && rnd()<.65) continue;
  const q=rnd();
  const col=q<.52?[.78,.86,1.0]:q<.78?[1.0,.91,.74]:q<.91?[.80,.72,1.0]:[1.0,.72,.80];
  const gain=rand(.72,1.0);
  BP.push(x,y,.1);
  BC.push(...col.map(v=>Math.min(1,v*gain)));
  BS.push(rand(1.05,1.52));
  BA.push(rand(.50,.82));
  BR.push(rnd());
}

function material({min,max,opacity,halo,twinkle}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uDpr:{value:renderer.getPixelRatio()},uMin:{value:min},uMax:{value:max},uOpacity:{value:opacity},uHalo:{value:halo},uTime:{value:0}},
    vertexShader:`attribute vec3 color;attribute float aSize;attribute float aAlpha;attribute float aSeed;varying vec3 vColor;varying float vAlpha;uniform float uDpr,uMin,uMax,uTime;void main(){vColor=color;vAlpha=aAlpha;float tw=1.0+sin(uTime*(.10+aSeed*.22)+aSeed*43.0)*${twinkle.toFixed(3)};gl_PointSize=clamp(aSize*uDpr*tw,uMin*uDpr,uMax*uDpr);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha;uniform float uOpacity,uHalo;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p)*2.0;if(d>1.0)discard;float core=1.0-smoothstep(.08,.58,d);float halo=(1.0-smoothstep(.50,1.0,d))*uHalo;float a=(core+halo)*vAlpha*uOpacity;if(a<.003)discard;gl_FragColor=vec4(vColor,a);}`
  });
}
function addPoints(P,C,S,A,R,mat){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  g.setAttribute('aSize',new THREE.Float32BufferAttribute(S,1));
  g.setAttribute('aAlpha',new THREE.Float32BufferAttribute(A,1));
  g.setAttribute('aSeed',new THREE.Float32BufferAttribute(R,1));
  scene.add(new THREE.Points(g,mat));
}

const fieldMat=material({min:.72,max:1.42,opacity:.78,halo:.018,twinkle:.002});
const brightMat=material({min:1.02,max:1.58,opacity:.88,halo:.16,twinkle:.010});
addPoints(P,C,S,A,R,fieldMat);
addPoints(BP,BC,BS,BA,BR,brightMat);

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  fieldMat.uniforms.uTime.value+=dt;
  brightMat.uniforms.uTime.value+=dt;
  renderer.render(scene,camera);
}
animate();

addEventListener('resize',()=>{
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  const d=renderer.getPixelRatio();
  fieldMat.uniforms.uDpr.value=d;
  brightMat.uniforms.uDpr.value=d;
});
