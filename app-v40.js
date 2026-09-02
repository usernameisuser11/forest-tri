import * as THREE from 'three';
import './app-v36.js';

const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
const loading=document.querySelector('#loading');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 40';
if(credit) credit.textContent='Three.js · moving circular gravitational lens · half-orbit';

// app-v36 remains the untouched base sky. This second renderer only performs screen-space lensing.
const baseCanvas=document.querySelector('canvas');
if(!baseCanvas) throw new Error('v36 base canvas not found');

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'2',pointerEvents:'none'});
document.body.appendChild(renderer.domElement);

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
    void main(){
      vUv=uv;
      gl_Position=vec4(position.xy,0.0,1.0);
    }
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

      // Measure distance in pixel-corrected space so the lens is always a true circle.
      vec2 delta=vUv-uCenter;
      delta.x*=aspect;
      float r=max(length(delta),0.0004);
      vec2 dir=delta/r;

      float rs=uRs;
      float thetaE=rs*2.18;
      float influenceEnd=thetaE*4.6;

      // Thin point-mass lens mapping: beta = theta - theta_E^2 / theta.
      float beta=r-(thetaE*thetaE)/r;
      beta=clamp(beta,-thetaE*2.6,influenceEnd);
      vec2 srcDelta=dir*beta;
      vec2 lensUV=uCenter+vec2(srcDelta.x/aspect,srcDelta.y);

      float spatial=1.0-smoothstep(thetaE*2.0,influenceEnd,r);
      float amount=uStrength*spatial;
      vec2 uv=mix(vUv,lensUV,amount);
      vec3 col=sampleSafe(uv);

      // Secondary image close to the Einstein radius. This is subtle and comes from the real sky texture.
      float secondaryMask=(1.0-smoothstep(thetaE*.95,thetaE*1.45,r))*uStrength;
      float mirroredR=max(thetaE*.18,thetaE*2.0-r);
      vec2 secondaryDelta=dir*mirroredR;
      vec2 secondaryUV=uCenter-vec2(secondaryDelta.x/aspect,secondaryDelta.y);
      vec3 secondary=sampleSafe(secondaryUV);
      float secLum=dot(secondary,vec3(.2126,.7152,.0722));
      col+=secondary*secondaryMask*smoothstep(.018,.16,secLum)*.34;

      // Circular black shadow; no ellipse, no accretion disk object.
      float shadow=1.0-smoothstep(rs*.96,rs*1.035,r);
      col*=1.0-shadow*uStrength;

      // Thin photon ring and mild Einstein caustic, derived from the distorted sky rather than a thick neon ring.
      float photonR=rs*1.47;
      float photon=exp(-pow((r-photonR)/(rs*.032),2.0))*uStrength;
      float einstein=exp(-pow((r-thetaE)/(rs*.115),2.0))*uStrength;
      vec3 local=sampleSafe(uCenter+vec2(dir.x*photonR/aspect,dir.y*photonR));
      float localLum=dot(local,vec3(.2126,.7152,.0722));
      vec3 ringTint=mix(vec3(.64,.74,1.0),vec3(1.0,.84,.64),smoothstep(.04,.22,localLum));
      col+=ringTint*photon*.20;
      col*=1.0+einstein*.13;

      // Keep highlights controlled only while the lens is active.
      vec3 mapped=acesSoft(col);
      col=mix(col,mapped,uStrength*.10);

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
function easeInOutCubic(v){
  v=clamp01(v);
  return v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2;
}

function updateLens(t){
  const cycle=t%CYCLE;

  // 0–5 s calm, 5–9 s appearance, 9–25 s half orbit, 25–30 s disappearance, 30–36 s calm.
  const appear=smooth01((cycle-5)/4);
  const disappear=1-smooth01((cycle-25)/5);
  const strength=appear*disappear;

  const orbitT=easeInOutCubic((cycle-7)/20);
  const aspect=Math.max(.1,innerWidth/Math.max(1,innerHeight));

  // A true circular half-orbit in screen pixels. X radius is divided by aspect so it stays circular visually.
  const pivotX=.50;
  const pivotY=.50;
  const radius=.205;
  const startAngle=Math.PI*1.12;
  const angle=startAngle+Math.PI*orbitT;
  const cx=pivotX+(radius/aspect)*Math.cos(angle);
  const cy=pivotY+radius*Math.sin(angle);

  // Slight natural growth toward the middle, then contraction before vanishing.
  const breathe=Math.sin(Math.PI*clamp01((cycle-5)/25));
  lensMat.uniforms.uCenter.value.set(cx,cy);
  lensMat.uniforms.uStrength.value=strength;
  lensMat.uniforms.uRs.value=.030+.010*breathe*strength;
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
  loading.innerHTML=`MOVING GRAVITATIONAL LENS READY<br><span style="opacity:.48">v36 preserved · circular half-orbit · ease in/out · natural disappearance</span>`;
  setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},300);
}

addEventListener('resize',()=>{
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  lensMat.uniforms.uResolution.value.set(innerWidth,innerHeight);
});
