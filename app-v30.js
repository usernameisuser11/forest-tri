import * as THREE from 'three';

const loading=document.querySelector('#loading');
const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 30';
if(credit) credit.textContent='Three.js · lower-panel point-data reconstruction';

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setClearColor(0x010309,1);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-1,1,1,-1,-2,2);
camera.position.z=1;

const MAP_W=132,MAP_H=43,STRIDE=7;
const txt=await fetch('./map-v30.b64').then(r=>r.text());
const bin=atob(txt.trim());
const map=new Uint8Array(bin.length);
for(let i=0;i<bin.length;i++)map[i]=bin.charCodeAt(i);

function rngFactory(seed=30092026){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=rngFactory();
const rand=(a,b)=>a+(b-a)*rnd();
const lum=(r,g,b)=>.2126*r+.7152*g+.0722*b;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function cell(x,y){const k=(y*MAP_W+x)*STRIDE;const p=map[k+6];return{ar:map[k],ag:map[k+1],ab:map[k+2],mr:map[k+3],mg:map[k+4],mb:map[k+5],dx:p%10,dy:Math.floor(p/10)};}
function density(L){if(L<5)return rnd()<.12?1:0;if(L<9)return 1+(rnd()<.30?1:0);if(L<16)return 2+Math.floor(rnd()*3);if(L<28)return 4+Math.floor(rnd()*4);if(L<45)return 7+Math.floor(rnd()*5);if(L<65)return 11+Math.floor(rnd()*7);if(L<90)return 16+Math.floor(rnd()*9);return 22+Math.floor(rnd()*11);}

const P=[],C=[],S=[],A=[],Z=[];
const HP=[],HC=[],HS=[],HA=[],HZ=[];
for(let y=0;y<MAP_H;y++){
  for(let x=0;x<MAP_W;x++){
    const c=cell(x,y),L=lum(c.ar,c.ag,c.ab),ML=lum(c.mr,c.mg,c.mb),n=density(L);
    for(let j=0;j<n;j++){
      const px=((x+rnd())/MAP_W)*2-1;
      const py=1-((y+rnd())/MAP_H)*2;
      const m=.18+rnd()*.47;
      let r=c.ar*(1-m)+c.mr*m,g=c.ag*(1-m)+c.mg*m,b=c.ab*(1-m)+c.mb*m;
      const gain=(L<18?1.55:L<50?1.38:L<90?1.26:1.16)*rand(.90,1.10);
      r=clamp(r*gain,0,255)/255;g=clamp(g*gain,0,255)/255;b=clamp(b*gain,0,255)/255;
      let size,alpha;
      if(L<16){size=rand(.86,1.12);alpha=rand(.36,.58);}else if(L<45){size=rand(.94,1.24);alpha=rand(.48,.72);}else if(L<80){size=rand(1.02,1.34);alpha=rand(.58,.84);}else{size=rand(1.10,1.46);alpha=rand(.68,.94);}
      P.push(px,py,0);C.push(r,g,b);S.push(size);A.push(alpha);Z.push(rnd());
    }
    if(ML>205&&ML>Math.max(42,L*1.90)){
      const px=((x+(c.dx+.5)/10)/MAP_W)*2-1;
      const py=1-((y+(c.dy+.5)/10)/MAP_H)*2;
      const gain=rand(1.03,1.16);
      HP.push(px,py,.2);HC.push(clamp(c.mr*gain,0,255)/255,clamp(c.mg*gain,0,255)/255,clamp(c.mb*gain,0,255)/255);HS.push(rand(1.30,1.92));HA.push(rand(.72,.94));HZ.push(rnd());
    }
  }
}

function material(minSize,maxSize,opacity,halo,twinkle){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,uniforms:{uDpr:{value:renderer.getPixelRatio()},uMin:{value:minSize},uMax:{value:maxSize},uOpacity:{value:opacity},uHalo:{value:halo},uTime:{value:0}},vertexShader:`attribute vec3 color;attribute float aSize;attribute float aAlpha;attribute float aSeed;varying vec3 vColor;varying float vAlpha;uniform float uDpr,uMin,uMax,uTime;void main(){vColor=color;vAlpha=aAlpha;float tw=1.0+sin(uTime*(.15+aSeed*.28)+aSeed*41.0)*${twinkle.toFixed(3)};gl_PointSize=clamp(aSize*uDpr*tw,uMin*uDpr,uMax*uDpr);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec3 vColor;varying float vAlpha;uniform float uOpacity,uHalo;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p)*2.0;if(d>1.0)discard;float core=smoothstep(.42,0.0,d);float halo=smoothstep(1.0,.18,d)*uHalo;float a=(core+halo)*vAlpha*uOpacity;if(a<.006)discard;gl_FragColor=vec4(vColor,a);}`});}
function points(P,C,S,A,Z,m){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setAttribute('aSize',new THREE.Float32BufferAttribute(S,1));g.setAttribute('aAlpha',new THREE.Float32BufferAttribute(A,1));g.setAttribute('aSeed',new THREE.Float32BufferAttribute(Z,1));const pts=new THREE.Points(g,m);scene.add(pts);return pts;}

const mainMat=material(.86,1.50,1.10,.20,.008);
const hiMat=material(1.20,1.96,.96,.36,.016);
points(P,C,S,A,Z,mainMat);
points(HP,HC,HS,HA,HZ,hiMat);

if(loading){loading.innerHTML='REFERENCE POINT MAP READY<br><span style="opacity:.48">132 × 43 sampled cells · '+(P.length/3).toLocaleString()+' particles</span>';setTimeout(()=>{loading.style.opacity='0';setTimeout(()=>loading.remove(),650);},240);}

const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);mainMat.uniforms.uTime.value+=dt;hiMat.uniforms.uTime.value+=dt;renderer.render(scene,camera);}animate();
addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);mainMat.uniforms.uDpr.value=renderer.getPixelRatio();hiMat.uniforms.uDpr.value=renderer.getPixelRatio();});
