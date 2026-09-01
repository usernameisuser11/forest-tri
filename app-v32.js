import * as THREE from 'three';

const loading=document.querySelector('#loading');
const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 32';
if(credit) credit.textContent='Three.js · layered lower-panel point reconstruction v32';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setClearColor(0x010309,1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
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
const chunks=await Promise.all(Array.from({length:6},(_,i)=>fetch(`./map-v31-${i}.part`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`map ${i}: ${r.status}`);return r.text();})));
const bin=atob(chunks.join('').trim());
const map=new Uint8Array(bin.length);
for(let i=0;i<bin.length;i++)map[i]=bin.charCodeAt(i);
if(map.length!==MAP_W*MAP_H*STRIDE)throw new Error(`map mismatch ${map.length}`);

function rngFactory(seed=32092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=rngFactory();
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
function world(u,v,z=0){return[(u-.5)*REF_W,(.5-v)*REF_H,z];}
function fitCamera(){const vp=Math.max(.1,innerWidth/Math.max(1,innerHeight));if(vp<REF_ASPECT){camera.left=-REF_W/2;camera.right=REF_W/2;const vh=REF_W/vp;camera.top=vh/2;camera.bottom=-vh/2;}else{camera.top=REF_H/2;camera.bottom=-REF_H/2;const vw=REF_H*vp;camera.left=-vw/2;camera.right=vw/2;}camera.updateProjectionMatrix();}
fitCamera();

function boostColor(ar,ag,ab,pr,pg,pb,L,power=1){
  const peakMix=clamp(.42+.38*(L/90),.42,.88);
  let r=ar*(1-peakMix)+pr*peakMix,g=ag*(1-peakMix)+pg*peakMix,b=ab*(1-peakMix)+pb*peakMix;
  const mean=(r+g+b)/3;
  const sat=L>18?1.18:1.05;
  r=mean+(r-mean)*sat;g=mean+(g-mean)*sat;b=mean+(b-mean)*sat;
  const gain=(L<12?1.85:L<28?1.72:L<55?1.55:L<90?1.40:1.28)*power*rand(.94,1.08);
  return[clamp(r*gain,0,255)/255,clamp(g*gain,0,255)/255,clamp(b*gain,0,255)/255];
}

const BP=[],BC=[],BS=[],BA=[],BR=[];
const GP=[],GC=[],GS=[],GA=[],GR=[];
const CP=[],CC=[],CS=[],CA=[],CR=[];
const HP=[],HC=[],HS=[],HA=[],HR=[];
const yieldTask=()=>new Promise(r=>setTimeout(r,0));

async function sampledPass(attempts,kind){
  const batch=70000;
  for(let start=0;start<attempts;start+=batch){
    const end=Math.min(attempts,start+batch);
    if(loading)loading.innerHTML=`RECONSTRUCTING LOWER PANEL<br><span style="opacity:.48">${kind} · ${Math.floor(start/batch)+1}/${Math.ceil(attempts/batch)}</span>`;
    for(let i=start;i<end;i++){
      const u=rnd(),v=rnd(),s=sample(u,v),ar=s[0],ag=s[1],ab=s[2],pr=s[3],pg=s[4],pb=s[5],frac=s[6]/255,L=lum(ar,ag,ab),PL=lum(pr,pg,pb);
      const [x,y]=world(u,v,0);
      if(kind==='background'){
        const w=clamp(.018+.09*frac+.11*Math.pow(Math.max(L,0)/30,.72),0,.22);
        if(rnd()>w)continue;
        const col=boostColor(ar,ag,ab,pr,pg,pb,L,.78);
        BP.push(x,y,-.30);BC.push(...col);BS.push(rand(.88,1.14));BA.push(rand(.30,.54));BR.push(rnd());
      }else if(kind==='galaxy'){
        const w=clamp(.02+.13*frac+.96*Math.pow(Math.max(0,L-2)/82,.88),0,.98);
        if(rnd()>w)continue;
        const col=boostColor(ar,ag,ab,pr,pg,pb,L,1.0);
        const q=rnd();
        GP.push(x,y,0);GC.push(...col);GS.push(q<.78?rand(1.02,1.34):q<.97?rand(1.34,1.62):rand(1.62,1.82));GA.push(clamp(rand(.62,.86)+L/255*.28,0,1));GR.push(rnd());
      }else{
        const core=Math.pow(clamp((L-18)/78,0,1),.82)*(.55+.45*frac);
        if(rnd()>core)continue;
        const col=boostColor(ar,ag,ab,pr,pg,pb,L,1.12);
        CP.push(x+rand(-.45,.45),y+rand(-.35,.35),.10);CC.push(...col);CS.push(rand(1.22,1.72));CA.push(clamp(rand(.68,.92)+PL/255*.18,0,1));CR.push(rnd());
      }
    }
    await yieldTask();
  }
}

await sampledPass(220000,'background');
await sampledPass(760000,'galaxy');
await sampledPass(220000,'core');

for(let gy=0;gy<MAP_H;gy++)for(let gx=0;gx<MAP_W;gx++){
  const c=getCell(gx,gy),L=lum(c[0],c[1],c[2]),PL=lum(c[3],c[4],c[5]);
  if(PL<115||PL<L*1.45+22)continue;
  const count=PL>205?2:1;
  for(let k=0;k<count;k++){
    if(rnd()>(PL>205?.82:.46))continue;
    const u=(gx+rand(.20,.80))/MAP_W,v=(gy+rand(.20,.80))/MAP_H,[x,y]=world(u,v,.22),col=boostColor(c[0],c[1],c[2],c[3],c[4],c[5],L,1.05);
    HP.push(x,y,.22);HC.push(...col);HS.push(PL>205?rand(1.50,1.95):rand(1.24,1.62));HA.push(PL>205?rand(.88,1):rand(.72,.92));HR.push(rnd());
  }
}

function material({min=.8,max=1.6,opacity=1,halo=.06,twinkle=.003}={}){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,uniforms:{uDpr:{value:renderer.getPixelRatio()},uMin:{value:min},uMax:{value:max},uOpacity:{value:opacity},uHalo:{value:halo},uTime:{value:0}},vertexShader:`attribute vec3 color;attribute float aSize;attribute float aAlpha;attribute float aSeed;varying vec3 vColor;varying float vAlpha;uniform float uDpr,uMin,uMax,uTime;void main(){vColor=color;vAlpha=aAlpha;float tw=1.0+sin(uTime*(.10+aSeed*.24)+aSeed*47.0)*${twinkle.toFixed(3)};gl_PointSize=clamp(aSize*uDpr*tw,uMin*uDpr,uMax*uDpr);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec3 vColor;varying float vAlpha;uniform float uOpacity,uHalo;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p)*2.0;if(d>1.0)discard;float core=1.0-smoothstep(.06,.56,d);float halo=(1.0-smoothstep(.42,1.0,d))*uHalo;float a=(core+halo)*vAlpha*uOpacity;if(a<.003)discard;gl_FragColor=vec4(vColor,a);}`});}
function addPoints(P,C,S,A,R,mat,order){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setAttribute('aSize',new THREE.Float32BufferAttribute(S,1));g.setAttribute('aAlpha',new THREE.Float32BufferAttribute(A,1));g.setAttribute('aSeed',new THREE.Float32BufferAttribute(R,1));const pts=new THREE.Points(g,mat);pts.renderOrder=order;scene.add(pts);return pts;}

const bgMat=material({min:.88,max:1.18,opacity:.86,halo:.02,twinkle:.002});
const galMat=material({min:1.02,max:1.84,opacity:1.36,halo:.055,twinkle:.003});
const coreMat=material({min:1.18,max:1.78,opacity:1.48,halo:.085,twinkle:.004});
const hiMat=material({min:1.22,max:2.02,opacity:1.10,halo:.28,twinkle:.014});
addPoints(BP,BC,BS,BA,BR,bgMat,0);addPoints(GP,GC,GS,GA,GR,galMat,1);addPoints(CP,CC,CS,CA,CR,coreMat,2);addPoints(HP,HC,HS,HA,HR,hiMat,3);

if(loading){loading.innerHTML=`POINT MAP READY<br><span style="opacity:.48">${((BP.length+GP.length+CP.length+HP.length)/3).toLocaleString()} particles · layered brightness reconstruction</span>`;setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},250);}
const mats=[bgMat,galMat,coreMat,hiMat],clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);fitCamera();const d=renderer.getPixelRatio();for(const m of mats)m.uniforms.uDpr.value=d;});
