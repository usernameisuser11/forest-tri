import './app-v7.js';

// v8: a dedicated high-resolution sky pass layered over the stable v7 scene.
// This is intentionally much stronger than the previous parameter-only tweaks.
const overlay=document.createElement('canvas');
overlay.id='sky-v8-overlay';
overlay.style.position='fixed';
overlay.style.left='0';
overlay.style.top='0';
overlay.style.width='100vw';
overlay.style.height='69vh';
overlay.style.pointerEvents='none';
overlay.style.zIndex='2';
overlay.style.opacity='1';
overlay.style.maskImage='linear-gradient(to bottom,black 0%,black 82%,rgba(0,0,0,.78) 90%,transparent 100%)';
overlay.style.webkitMaskImage='linear-gradient(to bottom,black 0%,black 82%,rgba(0,0,0,.78) 90%,transparent 100%)';
document.body.appendChild(overlay);

const ui=document.querySelector('#ui');
if(ui)ui.style.zIndex='5';
const title=document.querySelector('#title');
if(title)title.textContent='STARLIT FOREST · CINEMATIC PASS 08';

function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function gaussian(r){return r()+r()+r()+r()-2;}

function drawSky(){
  const dpr=Math.min(window.devicePixelRatio||1,1.7);
  const w=Math.max(1,Math.floor(innerWidth*dpr));
  const h=Math.max(1,Math.floor(innerHeight*.69*dpr));
  overlay.width=w;overlay.height=h;
  const ctx=overlay.getContext('2d',{alpha:true});
  ctx.clearRect(0,0,w,h);
  const rnd=mulberry32(8082026);

  // faint upper-sky tint so the overlay integrates with the existing render
  const tint=ctx.createLinearGradient(0,0,0,h);
  tint.addColorStop(0,'rgba(0,2,10,.14)');
  tint.addColorStop(.48,'rgba(3,10,28,.08)');
  tint.addColorStop(1,'rgba(11,30,58,0)');
  ctx.fillStyle=tint;ctx.fillRect(0,0,w,h);

  const band=(t)=>({
    x:w*(-.13+1.28*t),
    y:h*(.84-.70*t + Math.sin(t*7.5)*.015 + Math.sin(t*21.0)*.004)
  });
  const coreWeight=(t)=>Math.exp(-Math.pow((t-.53)/.18,2));

  // 1) Large galactic luminosity: broad enough to be unmistakable, but granular.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<1050;i++){
    const t=rnd(),p=band(t),core=coreWeight(t);
    const local=h*(.070+.045*(.5+.5*Math.sin(t*11.8+1.1))+.045*core);
    const off=gaussian(rnd)*local;
    const px=p.x+.50*off,py=p.y+.87*off;
    const rx=(18+rnd()*(54+core*46))*dpr;
    const ry=rx*(.18+rnd()*.24);
    const g=ctx.createRadialGradient(px,py,0,px,py,rx);
    const q=rnd();
    const a=.018+rnd()*(.045+core*.045);
    if(core>.28&&q<.48)g.addColorStop(0,`rgba(255,231,205,${a})`);
    else if(q<.57)g.addColorStop(0,`rgba(210,198,230,${a*.72})`);
    else g.addColorStop(0,`rgba(145,177,238,${a})`);
    g.addColorStop(1,'rgba(70,95,160,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(-.34+gaussian(rnd)*.045);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // 2) Dense stellar population inside the Milky Way.
  for(let i=0;i<42000;i++){
    const t=rnd(),p=band(t),core=coreWeight(t);
    const width=h*(.038+.052*(.5+.5*Math.sin(t*13.6+.7))+.038*core);
    const off=gaussian(rnd)*width;
    const edge=Math.min(1,Math.abs(off)/(width*2.2));
    if(rnd()<edge*.28)continue;
    const px=p.x+.50*off,py=p.y+.87*off;
    const q=rnd();
    const rad=(q>.996?(.72+rnd()*1.35):(.18+rnd()*.55))*dpr;
    const alpha=(.15+rnd()*(.52+core*.16))*(1-.38*edge);
    const tintQ=rnd();
    if(core>.38&&tintQ<.28)ctx.fillStyle=`rgba(255,235,214,${alpha*.86})`;
    else if(tintQ<.40)ctx.fillStyle=`rgba(198,215,248,${alpha})`;
    else ctx.fillStyle=`rgba(235,241,252,${alpha})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 3) Warm central bulge - subtle ivory/gold, not orange.
  for(let i=0;i<2500;i++){
    const t=.33+rnd()*.36,p=band(t),core=coreWeight(t);
    if(rnd()>.18+.76*core)continue;
    const off=gaussian(rnd)*h*(.020+.030*core);
    const px=p.x+.50*off,py=p.y+.87*off;
    const rad=(.28+rnd()*(1.2+core*2.6))*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad*3.2);
    g.addColorStop(0,`rgba(255,226,194,${.045+rnd()*(.11+core*.09)})`);
    g.addColorStop(1,'rgba(220,220,235,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad*3.2,0,Math.PI*2);ctx.fill();
  }

  // 4) Small real-photo-style magenta HII knots.
  for(let i=0;i<34;i++){
    const t=.18+rnd()*.66,p=band(t),off=(rnd()-.5)*h*.075;
    const px=p.x+.50*off,py=p.y+.87*off,rad=(3+rnd()*11)*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad);
    g.addColorStop(0,`rgba(224,112,143,${.025+rnd()*.055})`);
    g.addColorStop(1,'rgba(160,65,105,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 5) Great Rift / dark dust lanes: much more visible than v7.
  ctx.globalCompositeOperation='source-over';
  for(let lane=0;lane<4;lane++){
    for(let i=0;i<520;i++){
      const t=rnd(),p=band(t),core=coreWeight(t);
      const wave=Math.sin(t*(8.5+lane*2.8)+lane*1.7)*h*(.010+.003*lane);
      const shift=(lane-1.45)*h*.019+wave;
      const off=shift+gaussian(rnd)*h*(.009+.003*lane);
      const px=p.x+.50*off,py=p.y+.87*off;
      const rx=(10+rnd()*(31+core*26))*dpr;
      const ry=rx*(.15+rnd()*.20);
      const g=ctx.createRadialGradient(px,py,0,px,py,rx);
      g.addColorStop(0,`rgba(0,1,8,${.085+rnd()*(.11+core*.06)})`);
      g.addColorStop(1,'rgba(0,1,8,0)');
      ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(-.34+gaussian(rnd)*.08);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }

  // 6) Re-seed bright micro-stars after the dust lanes.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<9800;i++){
    const t=rnd(),p=band(t),core=coreWeight(t);
    const off=gaussian(rnd)*h*(.055+.018*core);
    const px=p.x+.50*off,py=p.y+.87*off;
    const rad=(.16+rnd()*.48)*dpr,a=.16+rnd()*.49;
    ctx.fillStyle=rnd()<.14?`rgba(255,229,205,${a*.75})`:`rgba(233,242,255,${a})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 7) Much richer general star field across the whole visible sky.
  for(let i=0;i<17000;i++){
    const px=rnd()*w,py=Math.pow(rnd(),1.04)*h*.94,q=rnd();
    let rad,a;
    if(q>.9990){rad=(1.4+rnd()*2.0)*dpr;a=.98;}
    else if(q>.988){rad=(.48+rnd()*.86)*dpr;a=.32+rnd()*.55;}
    else{rad=(.16+rnd()*.46)*dpr;a=.12+rnd()*.52;}
    const tq=rnd();
    if(tq<.12)ctx.fillStyle=`rgba(192,219,255,${a})`;
    else if(tq<.17)ctx.fillStyle=`rgba(255,224,197,${a*.82})`;
    else ctx.fillStyle=`rgba(240,245,255,${a})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
    if(q>.99945){ctx.strokeStyle=`rgba(224,238,255,${a*.30})`;ctx.lineWidth=.7*dpr;ctx.beginPath();ctx.moveTo(px-rad*4.3,py);ctx.lineTo(px+rad*4.3,py);ctx.moveTo(px,py-rad*3.5);ctx.lineTo(px,py+rad*3.5);ctx.stroke();}
  }
}

drawSky();
let rt;
addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(drawSky,120);});
