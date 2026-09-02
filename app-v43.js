import * as THREE from 'three';
import './app-v36.js';

const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
const loading=document.querySelector('#loading');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 43';
if(credit) credit.textContent='Three.js · evolving gravitational lens trajectories · 5 minute recorder';

const baseCanvas=document.querySelector('canvas');
if(!baseCanvas) throw new Error('v36 base canvas not found');

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'2',pointerEvents:'none'});
document.body.appendChild(renderer.domElement);
window.__STARLIT_FINAL_CANVAS=renderer.domElement;

const sourceTexture=new THREE.CanvasTexture(baseCanvas);
sourceTexture.minFilter=THREE.LinearFilter;
sourceTexture.magFilter=THREE.LinearFilter;
sourceTexture.generateMipmaps=false;
sourceTexture.wrapS=THREE.ClampToEdgeWrapping;
sourceTexture.wrapT=THREE.ClampToEdgeWrapping;
sourceTexture.colorSpace=THREE.SRGBColorSpace;

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);

const lensMat=new THREE.ShaderMaterial({
  depthWrite:false,
  depthTest:false,
  transparent:false,
  uniforms:{
    tDiffuse:{value:sourceTexture},
    uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)},
    uCenter:{value:new THREE.Vector2(.5,.5)},
    uStrength:{value:0},
    uRs:{value:.034}
  },
  vertexShader:`
    varying vec2 vUv;
    void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
  `,
  fragmentShader:`
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uStrength;
    uniform float uRs;
    varying vec2 vUv;

    vec3 acesSoft(vec3 x){
      return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);
    }
    vec3 sampleSafe(vec2 uv){
      if(uv.x<=0.0||uv.x>=1.0||uv.y<=0.0||uv.y>=1.0) return vec3(0.0);
      return texture2D(tDiffuse,uv).rgb;
    }

    void main(){
      float aspect=uResolution.x/max(uResolution.y,1.0);
      vec2 delta=vUv-uCenter;
      delta.x*=aspect;
      float r=max(length(delta),0.0004);
      vec2 dir=delta/r;
      float phi=atan(delta.y,delta.x);

      float rs=uRs;
      float thetaE=rs*2.18;
      float influenceEnd=thetaE*4.6;

      float beta=r-(thetaE*thetaE)/r;
      beta=clamp(beta,-thetaE*2.6,influenceEnd);
      vec2 srcDelta=dir*beta;
      vec2 lensUV=uCenter+vec2(srcDelta.x/aspect,srcDelta.y);

      float spatial=1.0-smoothstep(thetaE*2.0,influenceEnd,r);
      vec2 uv=mix(vUv,lensUV,uStrength*spatial);
      vec3 col=sampleSafe(uv);

      float secondaryMask=(1.0-smoothstep(thetaE*.95,thetaE*1.45,r))*uStrength;
      float mirroredR=max(thetaE*.18,thetaE*2.0-r);
      vec2 secondaryDelta=dir*mirroredR;
      vec2 secondaryUV=uCenter-vec2(secondaryDelta.x/aspect,secondaryDelta.y);
      vec3 secondary=sampleSafe(secondaryUV);
      float secLum=dot(secondary,vec3(.2126,.7152,.0722));
      col+=secondary*secondaryMask*smoothstep(.025,.18,secLum)*.22;

      float shadow=1.0-smoothstep(rs*.992,rs*1.012,r);
      col*=1.0-shadow*uStrength;

      float photonR=rs*1.47;
      float photon=exp(-pow((r-photonR)/(rs*.018),2.0))*uStrength;
      float einstein=exp(-pow((r-thetaE)/(rs*.105),2.0))*uStrength;
      vec2 ringUV=uCenter+vec2(dir.x*photonR/aspect,dir.y*photonR);
      vec3 local=sampleSafe(ringUV);
      float localLum=dot(local,vec3(.2126,.7152,.0722));
      float sourceGate=smoothstep(.025,.16,localLum);
      float arcVariation=.72+.18*sin(phi*3.0+1.1)+.10*sin(phi*7.0-.6);
      arcVariation=clamp(arcVariation,.42,1.0);
      float ringGate=mix(.04,1.0,sourceGate)*arcVariation;
      col+=local*photon*ringGate*.24;
      col*=1.0+einstein*sourceGate*.045;

      vec3 mapped=acesSoft(col);
      col=mix(col,mapped,uStrength*.08);
      gl_FragColor=vec4(col,1.0);
    }
  `
});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),lensMat));

const clock=new THREE.Clock();
let elapsed=0;
const CYCLE=36;

function clamp01(v){return Math.max(0,Math.min(1,v));}
function smooth01(v){v=clamp01(v);return v*v*(3-2*v);}
function easeInOutCubic(v){v=clamp01(v);return v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2;}
function rand(a,b){return a+Math.random()*(b-a);}
function chooseSign(){return Math.random()<.5?-1:1;}

let pathCycle=-1;
let path=null;

function makePath(){
  return {
    direction:chooseSign(),
    startAngle:rand(0,Math.PI*2),
    arc:rand(Math.PI*.62,Math.PI*1.18),
    radius:rand(.155,.225),
    pivotX:rand(.455,.545),
    pivotY:rand(.455,.545),
    angularWobble:rand(.035,.105),
    radialWobble:rand(.025,.080),
    secondaryWobble:rand(.010,.038),
    phaseA:rand(0,Math.PI*2),
    phaseB:rand(0,Math.PI*2),
    sizeBase:rand(.0275,.0325),
    sizePeak:rand(.007,.012),
    strength:rand(.88,1.08)
  };
}

function ensurePath(cycleIndex){
  if(cycleIndex===pathCycle&&path) return;
  pathCycle=cycleIndex;
  path=makePath();
}

function updateLens(t){
  const cycleIndex=Math.floor(t/CYCLE);
  const cycle=t-cycleIndex*CYCLE;
  ensurePath(cycleIndex);

  const appear=smooth01((cycle-5)/4);
  const disappear=1-smooth01((cycle-25)/5);
  const visible=appear*disappear;
  const orbitLinear=clamp01((cycle-7)/20);
  const orbitT=easeInOutCubic(orbitLinear);
  const envelope=Math.sin(Math.PI*orbitT);
  const aspect=Math.max(.1,innerWidth/Math.max(1,innerHeight));

  // Every cycle gets a different broad direction, while these two smooth perturbations
  // continuously change the local direction and curvature during the same pass.
  const angularDrift=
    Math.sin(orbitT*Math.PI*2+path.phaseA)*path.angularWobble*envelope +
    Math.sin(orbitT*Math.PI*5+path.phaseB)*path.angularWobble*.28*envelope;
  const angle=path.startAngle+path.direction*path.arc*orbitT+angularDrift;

  const radiusScale=1+
    Math.sin(orbitT*Math.PI*2.4+path.phaseB)*path.radialWobble*envelope+
    Math.sin(orbitT*Math.PI*4.7+path.phaseA)*path.secondaryWobble*envelope;
  const r=path.radius*radiusScale;

  const pivotDriftX=Math.sin(orbitT*Math.PI*1.35+path.phaseA)*.018*envelope/aspect;
  const pivotDriftY=Math.cos(orbitT*Math.PI*1.20+path.phaseB)*.018*envelope;
  const cx=path.pivotX+pivotDriftX+(r/aspect)*Math.cos(angle);
  const cy=path.pivotY+pivotDriftY+r*Math.sin(angle);

  const breathe=Math.sin(Math.PI*clamp01((cycle-5)/25));
  lensMat.uniforms.uCenter.value.set(cx,cy);
  lensMat.uniforms.uStrength.value=visible*path.strength;
  lensMat.uniforms.uRs.value=path.sizeBase+path.sizePeak*breathe*visible;
}

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  elapsed+=dt;
  sourceTexture.needsUpdate=true;
  updateLens(elapsed);
  renderer.render(scene,camera);
}
animate();

if(loading){
  loading.innerHTML=`EVOLVING LENS TRAJECTORIES READY<br><span style="opacity:.48">new path every cycle · continuously changing curvature · v36 preserved</span>`;
  setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},300);
}

addEventListener('resize',()=>{
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  lensMat.uniforms.uResolution.value.set(innerWidth,innerHeight);
});
