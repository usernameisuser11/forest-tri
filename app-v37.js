import * as THREE from 'three';

const loading=document.querySelector('#loading');
const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 37';
if(credit) credit.textContent='Three.js · three-act gravitational particle animation';

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

const BG=[[],[],[],[],[]], GAL=[[],[],[],[],[]], CORE=[[],[],[],[],[]], HI=[[],[],[],[],[]];
const RING=[[],[],[],[],[]], RING2=[[],[],[],[],[]];
const yieldTask=()=>new Promise(r=>setTimeout(r,0));
function push(layer,x,y,z,col,size,alpha){layer[0].push(x,y,z);layer[1].push(...col);layer[2].push(size);layer[3].push(alpha);layer[4].push(rnd());}

async function pass(attempts,kind){
  const batch=70000;
  for(let s0=0;s0<attempts;s0+=batch){
    const end=Math.min(attempts,s0+batch);
    if(loading)loading.innerHTML=`BUILDING ANIMATED GALAXY<br><span style="opacity:.48">${kind} · ${Math.floor(s0/batch)+1}/${Math.ceil(attempts/batch)}</span>`;
    for(let i=s0;i<end;i++){
      const u=rnd(),v=rnd(),s=sample(u,v),ar=s[0],ag=s[1],ab=s[2],pr=s[3],pg=s[4],pb=s[5],frac=s[6]/255;
      const L=lum(ar,ag,ab),PL=lum(pr,pg,pb),[x,y]=world(u,v,0);
      if(kind==='background'){
        const w=clamp(.06+.18*frac+.20*Math.pow(Math.max(L,0)/34,.72),0,.42);
        if(rnd()>w)continue;
        const col=boost(ar,ag,ab,pr,pg,pb,L,.82);
        push(BG,x,y,-.35,col,rand(.72,1.04),rand(.26,.50));
      }else if(kind==='galaxy'){
        const w=clamp(.02+.14*frac+1.05*Math.pow(Math.max(0,L-2)/82,.86),0,.99);
        if(rnd()>w)continue;
        const col=boost(ar,ag,ab,pr,pg,pb,L,1.0);
        const q=rnd();
        push(GAL,x,y,0,col,q<.78?rand(.94,1.28):q<.97?rand(1.28,1.56):rand(1.56,1.78),clamp(rand(.62,.86)+L/255*.30,0,1));
      }else{
        const w=Math.pow(clamp((L-17)/78,0,1),.80)*(.55+.45*frac);
        if(rnd()>w)continue;
        const col=boost(ar,ag,ab,pr,pg,pb,L,1.10);
        push(CORE,x+rand(-.004,.004),y+rand(-.004,.004),.10,col,rand(1.12,1.62),clamp(rand(.70,.94)+PL/255*.16,0,1));
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

// Particle-only accretion structure. It stays hidden until Act 3.
const BHX=.06,BHY=-.02,ROT=-.48;
for(let i=0;i<18000;i++){
  const a=rand(0,Math.PI*2),spread=(rnd()-rnd())*.020;
  const rx=.125+spread,ry=.050+spread*.42;
  let x=Math.cos(a)*rx,y=Math.sin(a)*ry;
  const cs=Math.cos(ROT),sn=Math.sin(ROT),xx=x*cs-y*sn,yy=x*sn+y*cs;
  const q=rnd();
  const col=q<.30?[1.00,.92,.78]:q<.60?[1.00,.70,.43]:q<.82?[.92,.55,.72]:[.62,.72,1.00];
  push(RING,BHX+xx,BHY+yy,.34,col,rand(.92,1.38),rand(.48,.88));
}
for(let i=0;i<9000;i++){
  const a=rand(0,Math.PI*2),spread=(rnd()-rnd())*.030;
  const rx=.185+spread,ry=.073+spread*.40;
  let x=Math.cos(a)*rx,y=Math.sin(a)*ry;
  const cs=Math.cos(ROT),sn=Math.sin(ROT),xx=x*cs-y*sn,yy=x*sn+y*cs;
  const q=rnd();
  const col=q<.48?[.62,.73,1.00]:q<.72?[.82,.70,1.00]:q<.90?[1.00,.72,.84]:[1.00,.86,.68];
  push(RING2,BHX+xx,BHY+yy,.30,col,rand(.76,1.12),rand(.20,.50));
}

function mainMaterial({min=.7,max=1.6,opacity=1,halo=.05,twinkle=.003,motion=.5}={}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uDpr:{value:renderer.getPixelRatio()},uMin:{value:min},uMax:{value:max},uOpacity:{value:opacity},uHalo:{value:halo},uTime:{value:0},uMotion:{value:motion}},
    vertexShader:`
      attribute vec3 color;attribute float aSize;attribute float aAlpha;attribute float aSeed;
      varying vec3 vColor;varying float vAlpha;varying float vBright;
      uniform float uDpr,uMin,uMax,uTime,uMotion;
      float sat(float x){return clamp(x,0.0,1.0);} 
      float pulse(float t,float a,float b,float c,float d){return smoothstep(a,b,t)*(1.0-smoothstep(c,d,t));}
      void main(){
        float t=mod(uTime,38.0);
        float anomaly=smoothstep(9.0,15.0,t)*(1.0-smoothstep(28.0,35.0,t));
        float climax=pulse(t,19.0,22.0,26.0,30.0);
        float after=pulse(t,27.0,29.0,33.0,36.0);
        vec2 center=vec2(${BHX.toFixed(3)},${BHY.toFixed(3)});
        vec2 p=position.xy;
        vec2 r=p-center;
        float dist=length(r);
        float influence=(1.0-smoothstep(.10,.92,dist))*uMotion;

        // Act 1: almost imperceptible breathing/drift.
        float calmAmp=.0012+.0012*uMotion;
        p+=vec2(sin(uTime*.105+aSeed*41.0),cos(uTime*.083+aSeed*53.0))*calmAmp;

        // Act 2: broad lensing and a slow spiral toward the gravitational center.
        float ang=anomaly*influence*(.10+.24*(1.0-sat(dist/.9)));
        float ca=cos(ang),sa=sin(ang);
        r=mat2(ca,-sa,sa,ca)*r;
        float pull=1.0-anomaly*influence*.075-climax*influence*.14;
        r*=pull;
        p=center+r;

        // Recovery wave after the climax.
        if(dist>.001){
          vec2 n=normalize(r);
          p+=n*sin(dist*31.0-uTime*2.0+aSeed*3.0)*.0065*after*influence;
        }

        // Particle-only event horizon: points disappear from the innermost region during Act 3.
        float voidMask=1.0-climax*(1.0-smoothstep(.045,.105,length(p-center)))*uMotion;
        vAlpha=aAlpha*voidMask;
        vBright=1.0+anomaly*influence*.10+climax*influence*.22+after*influence*.08;
        vColor=color;
        float tw=1.0+sin(uTime*(.10+aSeed*.24)+aSeed*47.0)*${twinkle.toFixed(3)};
        gl_PointSize=clamp(aSize*uDpr*tw*(1.0+climax*influence*.05),uMin*uDpr,uMax*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,position.z,1.0);
      }`,
    fragmentShader:`
      varying vec3 vColor;varying float vAlpha;varying float vBright;uniform float uOpacity,uHalo;
      void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p)*2.0;if(d>1.0)discard;float core=1.0-smoothstep(.07,.57,d);float halo=(1.0-smoothstep(.45,1.0,d))*uHalo;float a=(core+halo)*vAlpha*uOpacity;if(a<.003)discard;gl_FragColor=vec4(min(vec3(1.0),vColor*vBright),a);}`
  });
}

function ringMaterial({min,max,opacity,halo,speed,outer=0}={}){
  return new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    uniforms:{uDpr:{value:renderer.getPixelRatio()},uMin:{value:min},uMax:{value:max},uOpacity:{value:opacity},uHalo:{value:halo},uTime:{value:0}},
    vertexShader:`
      attribute vec3 color;attribute float aSize;attribute float aAlpha;attribute float aSeed;
      varying vec3 vColor;varying float vAlpha;uniform float uDpr,uMin,uMax,uTime;
      float pulse(float t,float a,float b,float c,float d){return smoothstep(a,b,t)*(1.0-smoothstep(c,d,t));}
      void main(){
        float t=mod(uTime,38.0);float vis=pulse(t,18.5,22.0,26.0,31.0);
        vec2 center=vec2(${BHX.toFixed(3)},${BHY.toFixed(3)});vec2 r=position.xy-center;
        float ang=uTime*${speed.toFixed(3)}*(.75+aSeed*.55)*vis;
        float ca=cos(ang),sa=sin(ang);r=mat2(ca,-sa,sa,ca)*r;
        vec2 p=center+r;
        vColor=color;vAlpha=aAlpha*vis*${outer?'.72':'1.0'};
        gl_PointSize=clamp(aSize*uDpr*(1.0+vis*.12),uMin*uDpr,uMax*uDpr);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,position.z,1.0);
      }`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha;uniform float uOpacity,uHalo;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p)*2.0;if(d>1.0)discard;float core=1.0-smoothstep(.06,.56,d);float halo=(1.0-smoothstep(.42,1.0,d))*uHalo;float a=(core+halo)*vAlpha*uOpacity;if(a<.003)discard;gl_FragColor=vec4(vColor,a);}`
  });
}

function add(layer,mat,order){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(layer[0],3));g.setAttribute('color',new THREE.Float32BufferAttribute(layer[1],3));g.setAttribute('aSize',new THREE.Float32BufferAttribute(layer[2],1));g.setAttribute('aAlpha',new THREE.Float32BufferAttribute(layer[3],1));g.setAttribute('aSeed',new THREE.Float32BufferAttribute(layer[4],1));const p=new THREE.Points(g,mat);p.renderOrder=order;scene.add(p);return p;}

const bgMat=mainMaterial({min:.70,max:1.06,opacity:.90,halo:.018,twinkle:.004,motion:.20});
const galMat=mainMaterial({min:.94,max:1.80,opacity:1.34,halo:.055,twinkle:.006,motion:.78});
const coreMat=mainMaterial({min:1.10,max:1.66,opacity:1.46,halo:.085,twinkle:.008,motion:1.00});
const hiMat=mainMaterial({min:1.10,max:1.86,opacity:1.08,halo:.24,twinkle:.018,motion:.88});
const ringMat=ringMaterial({min:.92,max:1.44,opacity:1.18,halo:.16,speed:1.10});
const ring2Mat=ringMaterial({min:.76,max:1.20,opacity:.78,halo:.10,speed:-.62,outer:1});
add(BG,bgMat,0);add(GAL,galMat,1);add(CORE,coreMat,2);add(HI,hiMat,3);add(RING2,ring2Mat,4);add(RING,ringMat,5);

if(loading){loading.innerHTML=`THREE-ACT ANIMATION READY<br><span style="opacity:.48">calm · anomaly · particle black hole · recovery · 38 s loop</span>`;setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},250);}

const mats=[bgMat,galMat,coreMat,hiMat,ringMat,ring2Mat],clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);for(const m of mats)m.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);const d=renderer.getPixelRatio();for(const m of mats)m.uniforms.uDpr.value=d;});
