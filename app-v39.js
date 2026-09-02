import * as THREE from 'three';

const loading=document.querySelector('#loading');
const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 39';
if(credit) credit.textContent='Three.js · screen-space Schwarzschild-style lensing';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setClearColor(0x010309,1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'1'});
document.body.prepend(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-1,1,1,-1,-3,3);
camera.position.z=2;

const MAP_W=96,MAP_H=31,STRIDE=7;
const chunks=await Promise.all(Array.from({length:6},(_,i)=>fetch(`./map-v31-${i}.part`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`map ${i}: ${r.status}`);return r.text();})));
const bin=atob(chunks.join('').trim());
const map=new Uint8Array(bin.length);
for(let i=0;i<bin.length;i++)map[i]=bin.charCodeAt(i);
if(map.length!==MAP_W*MAP_H*STRIDE)throw new Error(`map mismatch ${map.length}`);

function rngFactory(seed=36092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lum=(r,g,b)=>.2126*r+.7152*g+.0722*b;

function getCell(x,y){x=clamp(x,0,MAP_W-1)|0;y=clamp(y,0,MAP_H-1)|0;const k=(y*MAP_W+x)*STRIDE;return[map[k],map[k+1],map[k+2],map[k+3],map[k+4],map[k+5],map[k+6]];}
function sample(u,v){
  const fx=clamp(u,0,1)*(MAP_W-1),fy=clamp(v,0,1)*(MAP_H-1);
  const x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(MAP_W-1,x0+1),y1=Math.min(MAP_H-1,y0+1),tx=fx-x0,ty=fy-y0;
  const a=getCell(x0,y0),b=getCell(x1,y0),c=getCell(x0,y1),d=getCell(x1,y1),o=new Array(7);
  for(let i=0;i<7;i++){const t=a[i]*(1-tx)+b[i]*tx,q=c[i]*(1-tx)+d[i]*tx;o[i]=t*(1-ty)+q*ty;}
  return o;
}
function world(u,v,z=0){return[u*2-1,1-v*2,z];}
function boost(ar,ag,ab,pr,pg,pb,L,power=1){
  const peakMix=clamp(.44+.40*(L/90),.44,.90);
  let r=ar*(1-peakMix)+pr*peakMix,g=ag*(1-peakMix)+pg*peakMix,b=ab*(1-peakMix)+pb*peakMix;
  const mean=(r+g+b)/3,sat=L>18?1.20:1.07;
  r=mean+(r-mean)*sat;g=mean+(g-mean)*sat;b=mean+(b-mean)*sat;
  const gain=(L<12?1.78:L<28?1.66:L<55?1.50:L<90?1.36:1.25)*power*rand(.94,1.08);
  return[clamp(r*gain,0,255)/255,clamp(g*gain,0,255)/255,clamp(b*gain,0,255)/255];
}

const BG=[[],[],[],[],[]],GAL=[[],[],[],[],[]],CORE=[[],[],[],[],[]],HI=[[],[],[],[],[]];
const yieldTask=()=>new Promise(r=>setTimeout(r,0));
function push(layer,x,y,z,col,size,alpha){layer[0].push(x,y,z);layer[1].push(...col);layer[2].push(size);layer[3].push(alpha);layer[4].push(rnd());}

async function pass(attempts,kind){
  const batch=70000;
  for(let s0=0;s0<attempts;s0+=batch){
    const end=Math.min(attempts,s0+batch);
    if(loading)loading.innerHTML=`BUILDING BASE SKY<br><span style="opacity:.48">${kind} · ${Math.floor(s0/batch)+1}/${Math.ceil(attempts/batch)}</span>`;
    for(let i=s0;i<end;i++){
      const u=rnd(),v=rnd(),s=sample(u,v),ar=s[0],ag=s[1],ab=s[2],pr=s[3],pg=s[4],pb=s[5],frac=s[6]/255;
      const L=lum(ar,ag,ab),PL=lum(pr,pg,pb),[x,y]=world(u,v,0);
      if(kind==='background'){
        const w=clamp(.06+.18*frac+.20*Math.pow(Math.max(L,0)/34,.72),0,.42);
        if(rnd()>w)continue;
        push(BG,x,y,-.35,boost(ar,ag,ab,pr,pg,pb,L,.82),rand(.72,1.04),rand(.26,.50));
      }else if(kind==='galaxy'){
        const w=clamp(.02+.14*frac+1.05*Math.pow(Math.max(0,L-2)/82,.86),0,.99);
        if(rnd()>w)continue;
        const q=rnd();
        push(GAL,x,y,0,boost(ar,ag,ab,pr,pg,pb,L,1.0),q<.78?rand(.94,1.28):q<.97?rand(1.28,1.56):rand(1.56,1.78),clamp(rand(.62,.86)+L/255*.30,0,1));
      }else{
        const w=Math.pow(clamp((L-17)/78,0,1),.80)*(.55+.45*frac);
        if(rnd()>w)continue;
        push(CORE,x+rand(-.004,.004),y+rand(-.004,.004),.10,boost(ar,ag,ab,pr,pg,pb,L,1.10),rand(1.12,1.62),clamp(rand(.70,.94)+PL/255*.16,0,1));
      }
    }
    await yieldTask();
  }
}

await pass(300000,'background');
await pass(820000,'galaxy');
await pass(250000,'core');

for(let i=0;i<170000;i++){
  const u=rnd(),v=rnd(),s=sample(u,v),L=lum(s[0],s[1],s[2]);
  if(L>24&&rnd()<.70)continue;
  const [x,y]=world(u,v,-.48),q=rnd();
  let col=q<.48?[.61,.70,.91]:q<.77?[.84,.88,1.0]:q<.91?[.93,.80,.64]:q<.97?[.77,.66,.92]:[.96,.67,.76];
  const gain=rand(.38,.78);col=col.map(c=>c*gain);
  push(BG,x,y,-.48,col,rand(.70,1.00),rand(.18,.40));
}

for(let gy=0;gy<MAP_H;gy++)for(let gx=0;gx<MAP_W;gx++){
  const c=getCell(gx,gy),L=lum(c[0],c[1],c[2]),PL=lum(c[3],c[4],c[5]);
  if(PL<120||PL<L*1.45+20)continue;
  if(rnd()>(PL>205?.80:.44))continue;
  const u=(gx+rand(.20,.80))/MAP_W,v=(gy+rand(.20,.80))/MAP_H,[x,y]=world(u,v,.22),col=boost(c[0],c[1],c[2],c[3],c[4],c[5],L,1.05);
  push(HI,x,y,.22,col,PL>205?rand(1.38,1.82):rand(1.14,1.48),PL>205?rand(.84,.98):rand(.68,.88));
}

function particleMaterial({min=.7,max=1.6,opacity=1,halo=.05,twinkle=.003}={}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uDpr:{value:renderer.getPixelRatio()},uMin:{value:min},uMax:{value:max},uOpacity:{value:opacity},uHalo:{value:halo},uTime:{value:0}},
    vertexShader:`attribute vec3 color;attribute float aSize;attribute float aAlpha;attribute float aSeed;varying vec3 vColor;varying float vAlpha;uniform float uDpr,uMin,uMax,uTime;void main(){vColor=color;vAlpha=aAlpha;float tw=1.0+sin(uTime*(.10+aSeed*.24)+aSeed*47.0)*${twinkle.toFixed(3)};gl_PointSize=clamp(aSize*uDpr*tw,uMin*uDpr,uMax*uDpr);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha;uniform float uOpacity,uHalo;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p)*2.0;if(d>1.0)discard;float core=1.0-smoothstep(.07,.57,d);float halo=(1.0-smoothstep(.45,1.0,d))*uHalo;float a=(core+halo)*vAlpha*uOpacity;if(a<.003)discard;gl_FragColor=vec4(vColor,a);}`
  });
}
function add(layer,mat,order){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(layer[0],3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(layer[1],3));
  g.setAttribute('aSize',new THREE.Float32BufferAttribute(layer[2],1));
  g.setAttribute('aAlpha',new THREE.Float32BufferAttribute(layer[3],1));
  g.setAttribute('aSeed',new THREE.Float32BufferAttribute(layer[4],1));
  const p=new THREE.Points(g,mat);p.renderOrder=order;scene.add(p);
}

const bgMat=particleMaterial({min:.70,max:1.06,opacity:.90,halo:.018,twinkle:.002});
const galMat=particleMaterial({min:.94,max:1.80,opacity:1.34,halo:.055,twinkle:.003});
const coreMat=particleMaterial({min:1.10,max:1.66,opacity:1.46,halo:.085,twinkle:.004});
const hiMat=particleMaterial({min:1.10,max:1.86,opacity:1.08,halo:.24,twinkle:.012});
add(BG,bgMat,0);add(GAL,galMat,1);add(CORE,coreMat,2);add(HI,hiMat,3);

// Render the approved v36-style particle sky to an offscreen texture first.
const drawSize=new THREE.Vector2();
renderer.getDrawingBufferSize(drawSize);
const skyTarget=new THREE.WebGLRenderTarget(drawSize.x,drawSize.y,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false});
skyTarget.texture.generateMipmaps=false;
skyTarget.texture.wrapS=THREE.ClampToEdgeWrapping;
skyTarget.texture.wrapT=THREE.ClampToEdgeWrapping;

const postScene=new THREE.Scene();
const postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const lensMat=new THREE.ShaderMaterial({
  depthWrite:false,depthTest:false,
  uniforms:{
    tDiffuse:{value:skyTarget.texture},
    uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)},
    uCenter:{value:new THREE.Vector2(.505,.505)},
    uTime:{value:0},
    uRs:{value:.052},
    uStrength:{value:1.0}
  },
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
  fragmentShader:`
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uTime;
    uniform float uRs;
    uniform float uStrength;
    varying vec2 vUv;

    vec3 tonemapSoft(vec3 c){return c/(1.0+c*.18);}

    void main(){
      float cycle=mod(uTime,42.0);
      float lens=smoothstep(6.0,12.0,cycle)*(1.0-smoothstep(31.0,39.0,cycle))*uStrength;

      float aspect=uResolution.x/max(uResolution.y,1.0);
      vec2 delta=vUv-uCenter;
      delta.x*=aspect;
      float r=max(length(delta),0.0005);
      vec2 dir=delta/r;

      float rs=uRs;
      float thetaE=rs*2.38;
      float maxR=thetaE*5.1;

      // Thin-lens equation in circular, aspect-corrected image space:
      // beta = theta - theta_E^2/theta
      float beta=r-(thetaE*thetaE)/r;
      beta=clamp(beta,-thetaE*3.25,maxR);
      vec2 srcDelta=dir*beta;
      vec2 lensedUV=uCenter+vec2(srcDelta.x/aspect,srcDelta.y);

      float influence=1.0-smoothstep(thetaE*2.4,maxR,r);
      float lensMix=lens*influence;
      vec2 sampleUV=mix(vUv,lensedUV,lensMix);

      vec3 col=vec3(0.0);
      if(sampleUV.x>0.0&&sampleUV.x<1.0&&sampleUV.y>0.0&&sampleUV.y<1.0){
        col=texture2D(tDiffuse,sampleUV).rgb;
      }

      // Circular event-shadow. It fades with the lens so Act 1 remains exactly the v36 sky.
      float shadow=1.0-smoothstep(rs*.96,rs*1.035,r);
      col*=1.0-shadow*lens;

      // Narrow photon ring hugging the shadow; kept subtle so it reads as lensed starlight, not a neon disk.
      float photonR=rs*1.48;
      float photonW=rs*.050;
      float photon=exp(-pow((r-photonR)/photonW,2.0))*lens;

      // Mild Einstein-ring caustic enhancement. The background texture still provides the actual structure.
      float einstein=exp(-pow((r-thetaE)/(rs*.16),2.0))*lens;
      vec3 warm=vec3(1.0,.82,.62);
      vec3 cool=vec3(.70,.80,1.0);
      col+=mix(cool,warm,.58)*photon*.34;
      col*=1.0+einstein*.18;

      // Very small brightness compression prevents the ring from blowing out while leaving v36 unchanged at lens=0.
      vec3 mapped=tonemapSoft(col);
      col=mix(col,mapped,lens*.16);

      gl_FragColor=vec4(col,1.0);
    }`
});
const postQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),lensMat);
postScene.add(postQuad);

if(loading){loading.innerHTML=`SCREEN-SPACE LENSING READY<br><span style="opacity:.48">v36 base · circular aspect correction · thin-lens remap · photon ring</span>`;setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},260);}

const mats=[bgMat,galMat,coreMat,hiMat],clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  for(const m of mats)m.uniforms.uTime.value+=dt;
  lensMat.uniforms.uTime.value+=dt;

  renderer.setRenderTarget(skyTarget);
  renderer.setClearColor(0x010309,1);
  renderer.clear();
  renderer.render(scene,camera);

  renderer.setRenderTarget(null);
  renderer.setClearColor(0x010309,1);
  renderer.clear();
  renderer.render(postScene,postCamera);
}
animate();

addEventListener('resize',()=>{
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.getDrawingBufferSize(drawSize);
  skyTarget.setSize(drawSize.x,drawSize.y);
  lensMat.uniforms.uResolution.value.set(innerWidth,innerHeight);
  const d=renderer.getPixelRatio();for(const m of mats)m.uniforms.uDpr.value=d;
});
