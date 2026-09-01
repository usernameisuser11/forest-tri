import * as THREE from 'three';

// v16 — full-screen particle cosmos. No terrain, no forest, no canvas sky overlay.
// Every visible celestial feature is built from Three.js point particles.

const title = document.querySelector('#title');
if (title) title.textContent = 'STARLIT SKY · CINEMATIC PASS 16';
const loading = document.querySelector('#loading');
if (loading) loading.innerHTML = 'BUILDING FULL PARTICLE COSMOS<br><span style="opacity:.48">dense micro-stars · warm Milky Way core · dark rift · blue/pink nebula clusters</span>';
const credit = document.querySelector('#credit');
if (credit) credit.textContent = 'Three.js · full particle sky';
const ui = document.querySelector('#ui');
if (ui) ui.style.zIndex = '10';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x01040b, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight, false);
Object.assign(renderer.domElement.style, {
  position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '1', pointerEvents: 'none'
});
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-80, 80, 50, -50, -20, 20);
camera.position.z = 5;

function rngFactory(seed = 16092026) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let rnd = rngFactory();
const rand = (a = 0, b = 1) => a + (b - a) * rnd();
const gauss = () => rnd() + rnd() + rnd() + rnd() - 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const pick = a => a[Math.floor(rnd() * a.length)];

const PAL = {
  star: [rgb(0xf2f5ff), rgb(0xd8e6ff), rgb(0xb7d0ff), rgb(0xffe6c6), rgb(0xffcda4), rgb(0xd8c7e8)],
  cool: [rgb(0x9eb8e6), rgb(0xb6c8e8), rgb(0x879fc9), rgb(0xc7cbe0), rgb(0x8b86c5)],
  warm: [rgb(0xffe4bc), rgb(0xf4c991), rgb(0xe4a06d), rgb(0xd27d62), rgb(0xf1d6b2), rgb(0xc89191)],
  violet: [rgb(0xb67ac8), rgb(0x8c74d7), rgb(0xd178b4), rgb(0x6f8fe0), rgb(0xc99bd2)],
  blue: [rgb(0x74a7ff), rgb(0x8bbcff), rgb(0x597fe0), rgb(0xa8c7ff)],
  red: [rgb(0xe06b8a), rgb(0xd9547c), rgb(0xef8a82)],
  dust: [rgb(0x05050a), rgb(0x08070d), rgb(0x0c0910), rgb(0x130d12)]
};

function radialTexture(kind = 'star') {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(48, 48, 0, 48, 48, 48);
  if (kind === 'star') {
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(.12, 'rgba(255,255,255,.98)');
    g.addColorStop(.32, 'rgba(255,255,255,.40)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (kind === 'soft') {
    g.addColorStop(0, 'rgba(255,255,255,.72)');
    g.addColorStop(.30, 'rgba(255,255,255,.24)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    g.addColorStop(0, 'rgba(255,255,255,.82)');
    g.addColorStop(.46, 'rgba(255,255,255,.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
  }
  x.fillStyle = g; x.fillRect(0, 0, 96, 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const starTex = radialTexture('star');
const softTex = radialTexture('soft');
const dustTex = radialTexture('dust');

const materials = [];
function pointMaterial(texture, { opacity = 1, blending = THREE.AdditiveBlending, twinkle = .02, scale = 1 } = {}) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending,
    uniforms: {
      uMap: { value: texture }, uOpacity: { value: opacity }, uTime: { value: 0 },
      uTwinkle: { value: twinkle }, uScale: { value: scale }, uDpr: { value: renderer.getPixelRatio() }
    },
    vertexShader: `
      attribute float aSize; attribute float aAlpha; attribute float aSeed; attribute vec3 color;
      varying vec3 vColor; varying float vAlpha;
      uniform float uTime; uniform float uTwinkle; uniform float uScale; uniform float uDpr;
      void main(){
        vColor=color; vAlpha=aAlpha;
        float tw=1.0+sin(uTime*(0.35+aSeed*0.75)+aSeed*71.0)*uTwinkle;
        gl_PointSize=max(0.72,aSize*uScale*uDpr*tw);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uOpacity;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 t=texture2D(uMap,gl_PointCoord);
        float a=t.a*vAlpha*uOpacity;
        if(a<0.002) discard;
        gl_FragColor=vec4(vColor,a);
      }`
  });
  materials.push(m); return m;
}

const skyObjects = [];
function system(count, generator, mat) {
  const p = new Float32Array(count * 3), c = new Float32Array(count * 3);
  const s = new Float32Array(count), a = new Float32Array(count), seed = new Float32Array(count);
  let i = 0, guard = 0;
  while (i < count && guard < count * 25) {
    guard++;
    const v = generator(i); if (!v) continue;
    p[i*3]=v.x; p[i*3+1]=v.y; p[i*3+2]=v.z ?? 0;
    c[i*3]=v.color[0]; c[i*3+1]=v.color[1]; c[i*3+2]=v.color[2];
    s[i]=v.size; a[i]=v.alpha; seed[i]=rnd(); i++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p,3));
  g.setAttribute('color', new THREE.BufferAttribute(c,3));
  g.setAttribute('aSize', new THREE.BufferAttribute(s,1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(a,1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed,1));
  g.setDrawRange(0,i);
  const pts = new THREE.Points(g, mat); scene.add(pts); skyObjects.push(pts); return pts;
}

function clearSky() {
  for (const o of skyObjects.splice(0)) { scene.remove(o); o.geometry.dispose(); }
  for (const m of materials.splice(0)) m.dispose();
}

function buildSky() {
  clearSky(); rnd = rngFactory(16092026);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);

  const H = 100, W = H * innerWidth / Math.max(1, innerHeight);
  camera.left=-W/2; camera.right=W/2; camera.top=50; camera.bottom=-50; camera.updateProjectionMatrix();

  // Wide diagonal Milky Way, upper-left -> lower-right.
  const x0=-W*.56, y0=61, x1=W*.53, y1=-43;
  const dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy), nx=-dy/L, ny=dx/L;
  const band = t => {
    const bend = Math.sin((t+.06)*Math.PI)*W*.018 + Math.sin(t*6.6+1.2)*1.15;
    return { x:lerp(x0,x1,t)+nx*bend, y:lerp(y0,y1,t)+ny*bend };
  };
  const coreW = t => Math.exp(-Math.pow((t-.67)/.19,2));
  const lane = (t,k) => (k-3.0)*1.48 + Math.sin(t*(6.2+k*1.22)+k*1.31)*(1.05+.20*k) + Math.sin(t*18.0+k*.72)*.50;
  const dustGap = (t,off) => {
    let d=99; for(let k=0;k<7;k++) d=Math.min(d,Math.abs(off-lane(t,k)));
    return clamp((d-.42)/2.15,0,1);
  };

  // 1. Full-frame star sea — including the former terrain area.
  system(90000, ()=>{
    const q=rnd(); let size,alpha;
    if(q>.99965){size=rand(2.0,3.5);alpha=rand(.72,1)}
    else if(q>.988){size=rand(.72,1.35);alpha=rand(.30,.75)}
    else {size=rand(.20,.56);alpha=rand(.08,.34)}
    let col=pick(PAL.star).slice();
    if(rnd()<.34) col=col.map(v=>v*rand(.72,.96));
    return {x:rand(-W/2,W/2),y:rand(-50,50),z:-.6,color:col,size,alpha};
  }, pointMaterial(starTex,{opacity:.96,twinkle:.042,scale:1}));

  // 2. Ultra-fine faint depth layer.
  system(42000, ()=>{
    const col=(rnd()<.72?pick(PAL.cool):pick(PAL.star)).map(v=>v*rand(.55,.82));
    return {x:rand(-W/2,W/2),y:rand(-50,50),z:-.8,color:col,size:rand(.15,.36),alpha:rand(.035,.14)};
  }, pointMaterial(starTex,{opacity:.78,twinkle:.015,scale:.9}));

  // 3. Very broad cool Milky Way halo.
  system(52000, ()=>{
    const t=rand(-.06,1.06), p=band(t), cw=coreW(t), sigma=13+rand(0,8)+cw*5.5;
    const off=gauss()*sigma, feather=Math.exp(-.5*(off/(sigma*1.24))**2);
    if(rnd()>feather*.84) return null;
    let col=(rnd()<.20?pick(PAL.violet):pick(PAL.cool)).slice();
    col=col.map(v=>v*rand(.72,1));
    return {x:p.x+nx*off,y:p.y+ny*off,z:-.2,color:col,size:rand(.24,.70),alpha:rand(.025,.13)*feather};
  }, pointMaterial(softTex,{opacity:.88,twinkle:.012,scale:1}));

  // 4. Main granular band with density carved by dark lanes.
  system(78000, ()=>{
    const t=rand(-.04,1.04), p=band(t), cw=coreW(t), sigma=6.0+rand(0,5.0)+cw*7.2;
    const off=gauss()*sigma, feather=Math.exp(-.5*(off/(sigma*1.35))**2), gap=dustGap(t,off);
    if(rnd()>feather*(.79+.15*cw)*(.22+.78*gap)) return null;
    const r=rnd(); let col;
    if(cw>.22 && r<.54) col=pick(PAL.warm);
    else if(r<.72) col=pick(PAL.cool);
    else if(r<.86) col=pick(PAL.violet);
    else col=pick(PAL.star);
    return {x:p.x+nx*off,y:p.y+ny*off,z:.0,color:col,size:rnd()<.986?rand(.24,.72):rand(.9,1.55),alpha:rand(.065,.30)*feather};
  }, pointMaterial(starTex,{opacity:1,twinkle:.030,scale:1}));

  // 5. Warm, luminous core clumps.
  const coreClusters=Array.from({length:34},()=>{
    const t=clamp(rand(.42,.94)+gauss()*.045,.35,1), p=band(t), side=gauss()*6.5;
    return {x:p.x+nx*side,y:p.y+ny*side,t,r:rand(1.5,5.2),warm:rnd()<.76};
  });
  system(22000, ()=>{
    const cl=pick(coreClusters), rr=Math.abs(gauss())*cl.r, ang=rand(0,Math.PI*2), fade=Math.exp(-rr/(cl.r*.78));
    if(rnd()>fade) return null;
    let col=(cl.warm?pick(PAL.warm):pick(PAL.violet)).slice(); col=col.map(v=>Math.min(1,v*rand(.86,1.12)));
    return {x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.25,color:col,size:rand(.28,1.05),alpha:rand(.08,.42)*fade};
  }, pointMaterial(softTex,{opacity:1,twinkle:.018,scale:1.12}));

  // 6. Fine luminous filaments running along the band.
  const filaments=Array.from({length:11},(_,k)=>({
    bias:(k-5)*1.45+rand(-.7,.7), amp:rand(.7,2.3), freq:rand(5.2,10.5), phase:rand(0,Math.PI*2),
    palette:rnd()<.58?PAL.warm:(rnd()<.55?PAL.violet:PAL.cool)
  }));
  system(24000, ()=>{
    const f=pick(filaments), t=rand(.01,.99), p=band(t), cw=coreW(t);
    const off=f.bias+Math.sin(t*f.freq+f.phase)*f.amp+gauss()*rand(.35,1.3);
    if(rnd()>.55+.35*cw) return null;
    const col=pick(f.palette);
    return {x:p.x+nx*off,y:p.y+ny*off,z:.32,color:col,size:rand(.22,.70),alpha:rand(.06,.28)};
  }, pointMaterial(starTex,{opacity:.94,twinkle:.025,scale:1}));

  // 7. Purple / blue / magenta nebula islands distributed around the sky.
  const nebClusters=[];
  const fixed=[[-W*.30,-21,'violet'],[-W*.19,-31,'blue'],[-W*.06,-39,'violet'],[W*.12,-28,'violet'],[W*.30,-36,'red'],[W*.37,-19,'violet'],[-W*.05,23,'blue'],[W*.13,15,'violet']];
  for(const [x,y,p] of fixed) nebClusters.push({x,y,r:rand(3.5,8.5),pal:PAL[p]});
  for(let i=0;i<9;i++) nebClusters.push({x:rand(-W*.42,W*.42),y:rand(-38,35),r:rand(2.3,6.5),pal:rnd()<.5?PAL.violet:PAL.blue});
  system(16000, ()=>{
    const cl=pick(nebClusters), rr=Math.abs(gauss())*cl.r, ang=rand(0,Math.PI*2), fade=Math.exp(-rr/(cl.r*.70));
    if(rnd()>fade*.82) return null;
    const col=pick(cl.pal).map(v=>v*rand(.74,1.08));
    return {x:cl.x+Math.cos(ang)*rr,y:cl.y+Math.sin(ang)*rr,z:.10,color:col,size:rand(.35,1.35),alpha:rand(.018,.16)*fade};
  }, pointMaterial(softTex,{opacity:.82,twinkle:.012,scale:1.25}));

  // 8. Great Rift — dark branching particles + the density gaps above.
  system(21000, ()=>{
    const t=rand(.01,.99), p=band(t), k=Math.floor(rand(0,7)), cw=coreW(t);
    const center=lane(t,k), off=center+gauss()*rand(.55,1.85);
    return {x:p.x+nx*off,y:p.y+ny*off,z:.50,color:pick(PAL.dust),size:rand(2.3,8.0+cw*4.5),alpha:rand(.045,.18)+cw*.025};
  }, pointMaterial(dustTex,{opacity:.82,blending:THREE.NormalBlending,twinkle:0,scale:1}));

  // 9. Bright knots and young blue stars re-seeded over the dust.
  system(7800, ()=>{
    const t=rand(.03,.97), p=band(t), cw=coreW(t), off=gauss()*(3.5+cw*5.0), gap=dustGap(t,off);
    if(rnd()>(.22+.78*gap)) return null;
    const col=rnd()<.44?pick(PAL.warm):(rnd()<.55?pick(PAL.blue):pick(PAL.star));
    return {x:p.x+nx*off,y:p.y+ny*off,z:.72,color:col,size:rand(.48,1.55),alpha:rand(.20,.70)};
  }, pointMaterial(starTex,{opacity:1,twinkle:.052,scale:1}));

  // 10. Rare showcase stars across the entire sky.
  system(110, ()=>{
    const r=rnd(); const col=r<.48?pick(PAL.star):(r<.73?pick(PAL.blue):(r<.90?pick(PAL.warm):pick(PAL.red)));
    return {x:rand(-W/2,W/2),y:rand(-49,49),z:.85,color:col,size:rand(1.7,3.5),alpha:rand(.70,1)};
  }, pointMaterial(starTex,{opacity:1,twinkle:.075,scale:1.14}));
}

buildSky();
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  for(const m of materials) m.uniforms.uTime.value += dt;
  renderer.render(scene,camera);
  if(loading && loading.style.opacity!=='0'){
    loading.style.opacity='0'; setTimeout(()=>{if(loading) loading.style.display='none';},700);
  }
}
animate();

let resizeTimer;
addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(buildSky,180);
});
