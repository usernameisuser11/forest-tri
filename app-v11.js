import './app-v7.js';

// v11: broad photographic Milky Way pass matched to the supplied reference.
// The galaxy is intentionally wide, warm, dusty and irregular — never a narrow white streak.
const overlay=document.createElement('canvas');
overlay.id='sky-v11-overlay';
overlay.style.position='fixed';
overlay.style.left='0';
overlay.style.top='0';
overlay.style.width='100vw';
overlay.style.height='72vh';
overlay.style.pointerEvents='none';
overlay.style.zIndex='2';
overlay.style.opacity='1';
overlay.style.maskImage='linear-gradient(to bottom,black 0%,black 84%,rgba(0,0,0,.97) 90%,rgba(0,0,0,.64) 96%,transparent 100%)';
overlay.style.webkitMaskImage=overlay.style.maskImage;
document.body.appendChild(overlay);

const ui=document.querySelector('#ui');
if(ui)ui.style.zIndex='5';
const title=document.querySelector('#title');
if(title)title.textContent='STARLIT FOREST · CINEMATIC PASS 11';
const loading=document.querySelector('#loading');

function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function gaussian(r){return r()+r()+r()+r()-2;}

function drawSky(){
  const dpr=Math.min(window.devicePixelRatio||1,1.7);
  const w=Math.max(1,Math.floor(innerWidth*dpr));
  const h=Math.max(1,Math.floor(innerHeight*.72*dpr));
  overlay.width=w;overlay.height=h;
  const ctx=overlay.getContext('2d',{alpha:true});
  const rnd=mulberry32(11082026);

  // Opaque long-exposure sky so the older synthetic sky and moon are fully hidden.
  const base=ctx.createLinearGradient(0,0,0,h);
  base.addColorStop(0,'rgba(3,4,8,.998)');
  base.addColorStop(.30,'rgba(11,10,18,.996)');
  base.addColorStop(.58,'rgba(30,22,33,.992)');
  base.addColorStop(.78,'rgba(61,39,55,.982)');
  base.addColorStop(.91,'rgba(72,48,68,.955)');
  base.addColorStop(1,'rgba(31,44,67,.26)');
  ctx.fillStyle=base;ctx.fillRect(0,0,w,h);

  // Mauve/brown long-exposure airglow like the reference photograph.
  const glow=ctx.createLinearGradient(0,h*.38,0,h);
  glow.addColorStop(0,'rgba(120,72,86,0)');
  glow.addColorStop(.55,'rgba(125,78,91,.075)');
  glow.addColorStop(.82,'rgba(151,89,103,.16)');
  glow.addColorStop(1,'rgba(77,77,102,.06)');
  ctx.fillStyle=glow;ctx.fillRect(0,h*.34,w,h*.66);

  // Reference-like path: upper-left to lower-right, with a slight natural bend.
  const p0={x:w*.26,y:h*(-.16)};
  const p1={x:w*.73,y:h*.96};
  const vx=p1.x-p0.x,vy=p1.y-p0.y,len=Math.hypot(vx,vy);
  const tx=vx/len,ty=vy/len;
  const nx=-ty,ny=tx;
  const angle=Math.atan2(vy,vx);
  const band=(t)=>{
    const bend=Math.sin((t-.05)*Math.PI)*h*.034 + Math.sin(t*8.2)*h*.006;
    return {x:p0.x+vx*t+nx*bend,y:p0.y+vy*t+ny*bend};
  };
  const coreWeight=(t)=>Math.exp(-Math.pow((t-.68)/.20,2));

  // 1) Huge diffuse stellar/dust envelope. Very wide and feathered.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<3400;i++){
    const t=-.10+rnd()*1.22,p=band(t),core=coreWeight(t);
    const sigma=h*(.145+.060*(.5+.5*Math.sin(t*10.7+1.1))+.080*core);
    const off=gaussian(rnd)*sigma;
    const feather=Math.exp(-.5*Math.pow(off/(sigma*1.30),2));
    if(rnd()>feather*.92)continue;
    const px=p.x+nx*off,py=p.y+ny*off;
    const rx=(20+rnd()*(92+core*88))*dpr;
    const ry=rx*(.30+rnd()*.45);
    const g=ctx.createRadialGradient(px,py,0,px,py,rx);
    const q=rnd();
    const a=(.006+rnd()*(.020+core*.028))*feather;
    if(core>.30&&q<.34)g.addColorStop(0,`rgba(238,194,156,${a})`);         // warm tan
    else if(q<.49)g.addColorStop(0,`rgba(199,165,158,${a*.92})`);        // dusty rose-brown
    else if(q<.62)g.addColorStop(0,`rgba(171,151,180,${a*.82})`);        // muted violet
    else if(q<.79)g.addColorStop(0,`rgba(192,193,204,${a*.76})`);        // neutral starlight
    else g.addColorStop(0,`rgba(137,154,184,${a*.66})`);                 // cool gray-blue
    g.addColorStop(1,'rgba(70,50,66,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(angle+gaussian(rnd)*.26);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // 2) Large irregular dust/star-cloud islands to avoid any tube/cigar silhouette.
  for(let k=0;k<360;k++){
    const t=-.03+rnd()*1.07,p=band(t),core=coreWeight(t);
    const sigma=h*(.085+.045*core);
    const off=gaussian(rnd)*sigma;
    const cx=p.x+nx*off,cy=p.y+ny*off;
    const rx=(25+rnd()*(82+core*76))*dpr;
    const ry=rx*(.20+rnd()*.46);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
    const q=rnd(),a=.008+rnd()*(.024+core*.034);
    if(core>.35&&q<.38)g.addColorStop(0,`rgba(246,201,161,${a})`);
    else if(q<.54)g.addColorStop(0,`rgba(210,174,162,${a*.92})`);
    else if(q<.68)g.addColorStop(0,`rgba(181,157,185,${a*.84})`);
    else if(q<.82)g.addColorStop(0,`rgba(203,197,199,${a*.76})`);
    else g.addColorStop(0,`rgba(146,161,190,${a*.70})`);
    g.addColorStop(1,'rgba(78,58,73,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(cx,cy);ctx.rotate(angle+gaussian(rnd)*.38);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // 3) Dense granular Milky Way population across a BROAD band.
  for(let i=0;i<52000;i++){
    const t=-.08+rnd()*1.18,p=band(t),core=coreWeight(t);
    const sigma=h*(.082+.035*(.5+.5*Math.sin(t*12.3+.7))+.055*core);
    const off=gaussian(rnd)*sigma;
    const feather=Math.exp(-.5*Math.pow(off/(sigma*1.42),2));
    if(rnd()>feather*(.62+.19*core))continue;
    const px=p.x+nx*off,py=p.y+ny*off;
    const q=rnd();
    const rad=(q>.9986?(.48+rnd()*.95):(.065+rnd()*.30))*dpr;
    const alpha=(.035+rnd()*(.19+core*.13))*feather;
    const c=rnd();
    if(core>.38&&c<.28)ctx.fillStyle=`rgba(248,215,181,${alpha*.90})`;
    else if(c<.43)ctx.fillStyle=`rgba(219,192,181,${alpha*.92})`;
    else if(c<.57)ctx.fillStyle=`rgba(193,182,207,${alpha*.84})`;
    else if(c<.72)ctx.fillStyle=`rgba(199,210,227,${alpha*.86})`;
    else ctx.fillStyle=`rgba(229,224,217,${alpha*.92})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 4) Warm Galactic bulge, broad and mottled rather than white.
  for(let i=0;i<5600;i++){
    const t=.44+rnd()*.48,p=band(t),core=coreWeight(t);
    if(rnd()>.17+.77*core)continue;
    const off=gaussian(rnd)*h*(.032+.048*core);
    const px=p.x+nx*off,py=p.y+ny*off;
    const rad=(.22+rnd()*(1.05+core*2.7))*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad*3.8);
    const a=.018+rnd()*(.055+core*.060);
    const q=rnd();
    if(q<.60)g.addColorStop(0,`rgba(249,204,164,${a})`);
    else if(q<.82)g.addColorStop(0,`rgba(220,177,163,${a*.90})`);
    else g.addColorStop(0,`rgba(190,171,188,${a*.75})`);
    g.addColorStop(.46,`rgba(192,172,178,${a*.25})`);
    g.addColorStop(1,'rgba(150,153,181,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad*3.8,0,Math.PI*2);ctx.fill();
  }

  // 5) Subtle rosy HII knots.
  for(let i=0;i<44;i++){
    const t=.30+rnd()*.58,p=band(t),off=(rnd()-.5)*h*.13;
    const px=p.x+nx*off,py=p.y+ny*off,rad=(3+rnd()*13)*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad);
    g.addColorStop(0,`rgba(207,104,128,${.014+rnd()*.040})`);
    g.addColorStop(1,'rgba(137,66,96,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 6) Great Rift: several thick, broken, branching dust lanes.
  ctx.globalCompositeOperation='source-over';
  for(let lane=0;lane<6;lane++){
    for(let i=0;i<720;i++){
      const t=-.02+rnd()*1.04,p=band(t),core=coreWeight(t);
      if(rnd()<.08+.07*Math.max(0,Math.sin(t*20+lane*1.7)))continue;
      const wave=Math.sin(t*(7.1+lane*1.65)+lane*1.45)*h*(.012+.003*lane);
      const shift=(lane-2.5)*h*.014+wave;
      const off=shift+gaussian(rnd)*h*(.009+.0024*lane);
      const px=p.x+nx*off,py=p.y+ny*off;
      const rx=(11+rnd()*(38+core*34))*dpr;
      const ry=rx*(.16+rnd()*.31);
      const g=ctx.createRadialGradient(px,py,0,px,py,rx);
      const a=.050+rnd()*(.095+core*.060);
      g.addColorStop(0,`rgba(6,4,8,${a})`);g.addColorStop(1,'rgba(8,5,12,0)');
      ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(angle+gaussian(rnd)*.24);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }

  // 7) Fine stars re-seeded after the dark lanes.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<11500;i++){
    const t=-.06+rnd()*1.13,p=band(t),core=coreWeight(t);
    const sigma=h*(.090+.030*core),off=gaussian(rnd)*sigma;
    const feather=Math.exp(-.5*Math.pow(off/(sigma*1.45),2));
    if(rnd()>feather*.76)continue;
    const px=p.x+nx*off,py=p.y+ny*off;
    const rad=(.06+rnd()*.22)*dpr,a=(.035+rnd()*.16)*feather;
    const q=rnd();
    if(core>.42&&q<.22)ctx.fillStyle=`rgba(246,214,181,${a*.82})`;
    else if(q<.38)ctx.fillStyle=`rgba(197,201,224,${a*.88})`;
    else ctx.fillStyle=`rgba(226,224,224,${a*.90})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 8) Dense full-sky long-exposure stars with natural color temperatures.
  for(let i=0;i<30000;i++){
    const px=rnd()*w,py=Math.pow(rnd(),1.02)*h*.995,q=rnd();
    let rad,a;
    if(q>.9995){rad=(.90+rnd()*1.35)*dpr;a=.83;}
    else if(q>.9925){rad=(.28+rnd()*.60)*dpr;a=.14+rnd()*.36;}
    else{rad=(.055+rnd()*.27)*dpr;a=.035+rnd()*.24;}
    const tq=rnd();
    if(tq<.12)ctx.fillStyle=`rgba(185,207,237,${a})`;
    else if(tq<.20)ctx.fillStyle=`rgba(243,209,176,${a*.84})`;
    else if(tq<.27)ctx.fillStyle=`rgba(215,194,201,${a*.82})`;
    else ctx.fillStyle=`rgba(230,227,222,${a*.90})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 9) A few faint horizontal reddish airglow bands from the reference image.
  for(let i=0;i<7;i++){
    const cy=h*(.72+rnd()*.20),cx=w*(.10+rnd()*.55),rx=w*(.10+rnd()*.25),ry=h*(.003+rnd()*.008);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
    g.addColorStop(0,`rgba(190,100,110,${.010+rnd()*.020})`);g.addColorStop(1,'rgba(120,68,92,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}

drawSky();
if(loading){loading.innerHTML='CINEMATIC PASS 11 READY';setTimeout(()=>loading.style.opacity='0',850);}
let rt;
addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(drawSky,120);});