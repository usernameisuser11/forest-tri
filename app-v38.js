import * as THREE from 'three';

const loading=document.querySelector('#loading');
const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 38';
if(credit) credit.textContent='Three.js · gravitational lensing particle animation';

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

function rngFactory(seed=38092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
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
    if(loading)loading.innerHTML=`BUILDING LENSING SKY<br><span style="opacity:.48">${kind} · ${Math.floor(s0/batch)+1}/${Math.ceil(attempts/batch)}</span>`;
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

function material({min=.7,max=1.6,opacity=1,halo=.05,twinkle=.003,lensResponse=1}={}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uDpr:{value:renderer.getPixelRatio()},uMin:{value:min},uMax:{value:max},uOpacity:{value:opacity},uHalo:{value:halo},uTime:{value:0},uLensResponse:{value:lensResponse}},
    vertexShader:`
      attribute vec3 color;attribute float aSize;attribute float aAlpha;attribute float aSeed;
      varying vec3 vColor;varying float vAlpha;varying float vBright;
      uniform float uDpr,uMin,uMax,uTime,uLensResponse;
      void main(){
        float t=mod(uTime,38.0);
        float lens=smoothstep(8.0,14.0,t)*(1.0-smoothstep(27.0,34.0,t))*uLensResponse;
        float travel=smoothstep(10.0,25.0,t);
        vec2 center=mix(vec2(-.20,.10),vec2(.14,-.07),travel);
        vec2 p=position.xy;
        vec2 r=p-center;
        float d=max(length(r),.001);
        vec2 n=r/d;
        vec2 tangent=vec2(-n.y,n.x);

        // Einstein-radius-like magnification zone. Nothing is rendered at the lens center itself;
        // only the surrounding light field is displaced and magnified.
        float thetaE=.185;
        float ring=exp(-pow((d-thetaE)/.060,2.0));
        float influence=1.0-smoothstep(.07,.78,d);
        float deflect=lens*influence*(.0065/(d+.055));
        p+=n*deflect;

        // Tangential shear makes nearby point clusters bend into short arcs instead of being sucked inward.
        float side=sin(atan(r.y,r.x)*2.0+.65);
        p+=tangent*(lens*ring*.014*side);

        // Extremely small calm drift so the approved v36 composition still reads as the base state.
        p+=vec2(sin(uTime*.08+aSeed*31.0),cos(uTime*.065+aSeed*43.0))*.0007;

        float arcWeight=.55+.45*abs(side);
        vBright=1.0+lens*(ring*.72*arcWeight+influence*.06);
        vAlpha=aAlpha*(1.0+lens*ring*.32*arcWeight);
        vColor=color;
        float tw=1.0+sin(uTime*(.10+aSeed*.22)+aSeed*47.0)*${twinkle.toFixed(3)};
        float mag=1.0+lens*(ring*.62*arcWeight+influence*.035);
        gl_PointSize=clamp(aSize*uDpr*tw*mag,uMin*uDpr,uMax*uDpr*1.45);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,position.z,1.0);
      }`,
    fragmentShader:`
      varying vec3 vColor;varying float vAlpha;varying float vBright;uniform float uOpacity,uHalo;
      void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p)*2.0;if(d>1.0)discard;float core=1.0-smoothstep(.07,.57,d);float halo=(1.0-smoothstep(.45,1.0,d))*uHalo;float a=(core+halo)*vAlpha*uOpacity;if(a<.003)discard;gl_FragColor=vec4(min(vec3(1.0),vColor*vBright),a);}`
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

const bgMat=material({min:.70,max:1.06,opacity:.90,halo:.018,twinkle:.002,lensResponse:1.00});
const galMat=material({min:.94,max:1.80,opacity:1.34,halo:.055,twinkle:.003,lensResponse:.88});
const coreMat=material({min:1.10,max:1.66,opacity:1.46,halo:.085,twinkle:.004,lensResponse:.72});
const hiMat=material({min:1.10,max:1.86,opacity:1.08,halo:.24,twinkle:.012,lensResponse:.82});
add(BG,bgMat,0);add(GAL,galMat,1);add(CORE,coreMat,2);add(HI,hiMat,3);

if(loading){loading.innerHTML=`GRAVITATIONAL LENSING READY<br><span style="opacity:.48">invisible lens · curved light field · Einstein-like arc magnification · 38 s loop</span>`;setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},250);}

const mats=[bgMat,galMat,coreMat,hiMat],clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);const d=renderer.getPixelRatio();for(const m of mats)m.uniforms.uDpr.value=d;});
