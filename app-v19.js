import './app-v18.js';
import * as THREE from 'three';

// v19 — restore readable small-star scale without bringing back oversized bright stars.
// v18 stays as the base cosmos; this pass adds a carefully sized mid-micro star layer.

const title=document.querySelector('#title');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 19';
const loading=document.querySelector('#loading');
if(loading) loading.innerHTML='BALANCING STAR SCALE<br><span style="opacity:.48">readable micro-stars · restrained bright stars · chromatic depth</span>';
const credit=document.querySelector('#credit');
if(credit) credit.textContent='Three.js · balanced particle sky';
const ui=document.querySelector('#ui');
if(ui) ui.style.zIndex='10';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x000000,0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'2',pointerEvents:'none'});
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-80,80,50,-50,-10,10);
camera.position.z=3;

function rngFactory(seed=19092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const rgb=h=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const palette=[
  rgb(0xc8dbff),rgb(0xe4ecff),rgb(0xf7f7ff),rgb(0xffefd0),rgb(0xffddb0),
  rgb(0xf7ba87),rgb(0xb7a3df),rgb(0xd98fad),rgb(0x9cbcff)
];
const pick=a=>a[Math.floor(rnd()*a.length)];

function starTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(.14,'rgba(255,255,255,.92)');
  g.addColorStop(.30,'rgba(255,255,255,.34)');
  g.addColorStop(.58,'rgba(255,255,255,.05)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const tex=starTexture();

const mat=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
  uniforms:{uMap:{value:tex},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()}},
  vertexShader:`
    attribute float aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 color;
    varying vec3 vColor;varying float vAlpha;
    uniform float uTime;uniform float uDpr;
    void main(){
      vColor=color;vAlpha=aAlpha;
      float tw=1.0+sin(uTime*(0.22+aSeed*.45)+aSeed*61.0)*0.025;
      float ps=aSize*uDpr*tw;
      gl_PointSize=clamp(ps,0.75*uDpr,1.55*uDpr);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    }`,
  fragmentShader:`
    uniform sampler2D uMap;varying vec3 vColor;varying float vAlpha;
    void main(){vec4 t=texture2D(uMap,gl_PointCoord);float a=t.a*vAlpha;if(a<.003)discard;gl_FragColor=vec4(vColor,a);}`
});

let points;
function build(){
  if(points){scene.remove(points);points.geometry.dispose();}
  rnd=rngFactory(19092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  mat.uniforms.uDpr.value=renderer.getPixelRatio();
  const H=100,W=H*innerWidth/Math.max(1,innerHeight);
  camera.left=-W/2;camera.right=W/2;camera.top=50;camera.bottom=-50;camera.updateProjectionMatrix();

  const count=42000;
  const pos=new Float32Array(count*3),col=new Float32Array(count*3),size=new Float32Array(count),alpha=new Float32Array(count),seed=new Float32Array(count);
  for(let i=0;i<count;i++){
    pos[i*3]=rand(-W/2,W/2);pos[i*3+1]=rand(-50,50);pos[i*3+2]=0;
    let c=pick(palette).slice();const dim=rand(.76,1.02);c=c.map(v=>Math.min(1,v*dim));
    col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];
    const q=rnd();
    if(q<.83){size[i]=rand(.48,.72);alpha[i]=rand(.11,.29);}
    else if(q<.985){size[i]=rand(.72,1.02);alpha[i]=rand(.16,.40);}
    else{size[i]=rand(1.02,1.30);alpha[i]=rand(.28,.52);}
    seed[i]=rnd();
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(size,1));
  g.setAttribute('aAlpha',new THREE.BufferAttribute(alpha,1));
  g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
  points=new THREE.Points(g,mat);scene.add(points);
}

build();
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);mat.uniforms.uTime.value+=Math.min(clock.getDelta(),.05);renderer.render(scene,camera);}
animate();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(build,120);});

if(loading){setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},320);}
