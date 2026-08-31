import './app-v7.js';

// v12 — structured photographic Milky Way pass.
// Goal: match the supplied long-exposure reference with a broad, irregular galaxy,
// huge numbers of tiny stars, mixed stellar colors/sizes, warm dust, cool outer clouds,
// branching dark lanes, and no narrow white cigar silhouette.
const overlay=document.createElement('canvas');
overlay.id='sky-v12-overlay';
overlay.style.position='fixed';
overlay.style.left='0';
overlay.style.top='0';
overlay.style.width='100vw';
overlay.style.height='68vh';
overlay.style.pointerEvents='none';
overlay.style.zIndex='2';
overlay.style.opacity='1';
overlay.style.maskImage='linear-gradient(to bottom,black 0%,black 86%,rgba(0,0,0,.98) 91%,rgba(0,0,0,.78) 95%,rgba(0,0,0,.34) 98%,transparent 100%)';
overlay.style.webkitMaskImage=overlay.style.maskImage;
document.body.appendChild(overlay);

const ui=document.querySelector('#ui');
if(ui)ui.style.zIndex='5';
const title=document.querySelector('#title');
if(title)title.textContent='STARLIT FOREST · CINEMATIC PASS 12';
const loading=document.querySelector('#loading');

function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function gaussian(r){return r()+r()+r()+r()-2;}
function mix(a,b,t){return a+(b-a)*t;}

function drawSky(){
  const dpr=Math.min(window.devicePixelRatio||1,1.65);
  const w=Math.max(1,Math.floor(innerWidth*dpr));
  const h=Math.max(1,Math.floor(innerHeight*.68*dpr));
  overlay.width=w;overlay.height=h;
  const ctx=overlay.getContext('2d',{alpha:true});
  const rnd=mulberry32(12082026);

  // ---------- Photographic night-sky base ----------
  const base=ctx.createLinearGradient(0,0,0,h);
  base.addColorStop(0,'rgba(2,3,7,1)');
  base.addColorStop(.26,'rgba(8,8,14,1)');
  base.addColorStop(.52,'rgba(22,17,26,1)');
  base.addColorStop(.72,'rgba(42,28,41,.995)');
  base.addColorStop(.88,'rgba(70,43,61,.985)');
  base.addColorStop(.96,'rgba(63,48,70,.92)');
  base.addColorStop(1,'rgba(37,50,77,.40)');
  ctx.fillStyle=base;ctx.fillRect(0,0,w,h);

  // Warm mauve/brown airglow near horizon, like a long-exposure sky.
  const air=ctx.createLinearGradient(0,h*.43,0,h);
  air.addColorStop(0,'rgba(126,78,92,0)');
  air.addColorStop(.50,'rgba(130,79,93,.045)');
  air.addColorStop(.76,'rgba(151,91,106,.13)');
  air.addColorStop(.91,'rgba(163,101,113,.16)');
  air.addColorStop(1,'rgba(90,80,111,.04)');
  ctx.fillStyle=air;ctx.fillRect(0,h*.40,w,h*.60);

  // ---------- Dense full-sky tiny stars ----------
  // Many stars are intentionally sub-pixel/small; only a few are bright.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<46000;i++){
    const px=rnd()*w;
    const py=Math.pow(rnd(),1.015)*h*.995;
    const q=rnd();
    let rad,a;
    if(q>.99965){rad=(.90+rnd()*1.40)*dpr;a=.85;}
    else if(q>.9940){rad=(.28+rnd()*.52)*dpr;a=.16+rnd()*.38;}
    else{rad=(.045+rnd()*.19)*dpr;a=.025+rnd()*.18;}
    const tq=rnd();
    if(tq<.10)ctx.fillStyle=`rgba(177,202,239,${a})`;       // blue-white
    else if(tq<.17)ctx.fillStyle=`rgba(242,207,173,${a*.83})`; // warm amber
    else if(tq<.23)ctx.fillStyle=`rgba(214,192,201,${a*.80})`; // soft rose
    else if(tq<.30)ctx.fillStyle=`rgba(200,200,218,${a*.86})`; // cool neutral
    else ctx.fillStyle=`rgba(232,230,226,${a*.90})`;           // neutral white
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // Rare bright stars with tiny diffraction-like sparkle.
  for(let i=0;i<115;i++){
    const px=rnd()*w,py=rnd()*h*.92;
    const rad=(.55+rnd()*1.15)*dpr;
    const warm=rnd()<.28;
    const c=warm?'255,224,189':'211,228,255';
    const g=ctx.createRadialGradient(px,py,0,px,py,rad*5.5);
    g.addColorStop(0,`rgba(${c},.96)`);g.addColorStop(.18,`rgba(${c},.48)`);g.addColorStop(1,`rgba(${c},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad*5.5,0,Math.PI*2);ctx.fill();
    if(rnd()<.38){ctx.strokeStyle=`rgba(${c},.22)`;ctx.lineWidth=.45*dpr;ctx.beginPath();ctx.moveTo(px-rad*4.2,py);ctx.lineTo(px+rad*4.2,py);ctx.moveTo(px,py-rad*3.4);ctx.lineTo(px,py+rad*3.4);ctx.stroke();}
  }

  // ---------- Milky Way geometry ----------
  // Reference-like diagonal: enters high at upper-left, bends through center,
  // and broadens toward the lower-right Galactic center.
  const p0={x:w*.255,y:h*(-.22)};
  const p1={x:w*.765,y:h*1.04};
  const vx=p1.x-p0.x,vy=p1.y-p0.y,len=Math.hypot(vx,vy);
  const tx=vx/len,ty=vy/len,nx=-ty,ny=tx;
  const angle=Math.atan2(vy,vx);
  const band=(t)=>{
    const bend=Math.sin((t+.08)*Math.PI)*h*.055 + Math.sin(t*7.0+1.4)*h*.008;
    return {x:p0.x+vx*t+nx*bend,y:p0.y+vy*t+ny*bend};
  };
  const coreWeight=t=>Math.exp(-Math.pow((t-.72)/.20,2));
  const upperWeight=t=>Math.exp(-Math.pow((t-.30)/.26,2));

  // ---------- Outer stellar haze / diffuse envelope ----------
  // Very broad and low-opacity, so the galaxy has no hard boundary.
  for(let i=0;i<4300;i++){
    const t=-.14+rnd()*1.28,p=band(t),core=coreWeight(t),upper=upperWeight(t);
    const sigma=h*(.19+.070*(.5+.5*Math.sin(t*9.4+.8))+.085*core+.020*upper);
    const off=gaussian(rnd)*sigma;
    const feather=Math.exp(-.5*Math.pow(off/(sigma*1.36),2));
    if(rnd()>feather*.88)continue;
    const px=p.x+nx*off,py=p.y+ny*off;
    const rx=(24+rnd()*(110+core*105))*dpr;
    const ry=rx*(.32+rnd()*.52);
    const g=ctx.createRadialGradient(px,py,0,px,py,rx);
    const q=rnd(),a=(.005+rnd()*(.016+core*.022))*feather;
    if(core>.25&&q<.28)g.addColorStop(0,`rgba(237,190,147,${a})`);      // tan/ivory dust
    else if(q<.44)g.addColorStop(0,`rgba(204,161,151,${a*.92})`);     // dusty rose-brown
    else if(q<.58)g.addColorStop(0,`rgba(172,149,181,${a*.83})`);     // muted violet
    else if(q<.74)g.addColorStop(0,`rgba(181,192,213,${a*.76})`);     // gray-blue
    else if(q<.87)g.addColorStop(0,`rgba(198,194,190,${a*.72})`);     // neutral haze
    else g.addColorStop(0,`rgba(133,151,184,${a*.67})`);              // cool outskirts
    g.addColorStop(1,'rgba(72,48,68,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(angle+gaussian(rnd)*.40);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // ---------- Large colored star-cloud / dust masses ----------
  // These overlapping islands give the band photographic structure rather than a tube shape.
  for(let k=0;k<520;k++){
    const t=-.05+rnd()*1.10,p=band(t),core=coreWeight(t);
    const sigma=h*(.115+.055*core);
    const off=gaussian(rnd)*sigma;
    const cx=p.x+nx*off,cy=p.y+ny*off;
    const rx=(28+rnd()*(105+core*95))*dpr;
    const ry=rx*(.20+rnd()*.48);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
    const q=rnd(),a=.007+rnd()*(.020+core*.030);
    if(core>.30&&q<.31)g.addColorStop(0,`rgba(245,195,151,${a})`);
    else if(q<.47)g.addColorStop(0,`rgba(214,170,153,${a*.93})`);
    else if(q<.60)g.addColorStop(0,`rgba(193,158,173,${a*.88})`);
    else if(q<.72)g.addColorStop(0,`rgba(168,157,191,${a*.84})`);
    else if(q<.84)g.addColorStop(0,`rgba(188,199,220,${a*.77})`);
    else g.addColorStop(0,`rgba(141,157,188,${a*.70})`);
    g.addColorStop(1,'rgba(78,55,73,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(cx,cy);ctx.rotate(angle+gaussian(rnd)*.54);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // ---------- Broad micro-star population ----------
  // A huge number of tiny particles defines the Milky Way itself.
  for(let i=0;i<68000;i++){
    const t=-.11+rnd()*1.23,p=band(t),core=coreWeight(t);
    const sigma=h*(.115+.050*(.5+.5*Math.sin(t*11.7+.9))+.070*core);
    const off=gaussian(rnd)*sigma;
    const feather=Math.exp(-.5*Math.pow(off/(sigma*1.48),2));
    if(rnd()>feather*(.58+.18*core))continue;
    const px=p.x+nx*off,py=p.y+ny*off;
    const q=rnd();
    const rad=(q>.9991?(.48+rnd()*.88):(.040+rnd()*.18))*dpr;
    const alpha=(.028+rnd()*(.145+core*.10))*feather;
    const c=rnd();
    if(core>.36&&c<.24)ctx.fillStyle=`rgba(247,208,169,${alpha*.92})`;
    else if(c<.38)ctx.fillStyle=`rgba(220,184,167,${alpha*.91})`;
    else if(c<.50)ctx.fillStyle=`rgba(196,172,196,${alpha*.86})`;
    else if(c<.64)ctx.fillStyle=`rgba(188,202,226,${alpha*.86})`;
    else if(c<.79)ctx.fillStyle=`rgba(213,210,208,${alpha*.90})`;
    else ctx.fillStyle=`rgba(232,224,213,${alpha*.90})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // ---------- Medium-size colored stars in the galaxy ----------
  for(let i=0;i<9200;i++){
    const t=-.08+rnd()*1.16,p=band(t),core=coreWeight(t);
    const sigma=h*(.085+.045*core),off=gaussian(rnd)*sigma;
    const feather=Math.exp(-.5*Math.pow(off/(sigma*1.35),2));
    if(rnd()>feather*.72)continue;
    const px=p.x+nx*off,py=p.y+ny*off;
    const rad=(.13+rnd()*.52)*dpr;
    const a=(.08+rnd()*.30)*feather;
    const c=rnd();
    if(c<.18)ctx.fillStyle=`rgba(174,205,247,${a})`;
    else if(c<.35)ctx.fillStyle=`rgba(247,211,174,${a*.90})`;
    else if(c<.46)ctx.fillStyle=`rgba(224,177,177,${a*.82})`;
    else if(c<.58)ctx.fillStyle=`rgba(196,178,217,${a*.84})`;
    else ctx.fillStyle=`rgba(233,229,220,${a*.93})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // ---------- Warm Galactic-center bulge ----------
  // Bigger, textured and distinctly tan/ivory rather than white.
  for(let i=0;i<7600;i++){
    const t=.45+rnd()*.48,p=band(t),core=coreWeight(t);
    if(rnd()>.15+.79*core)continue;
    const off=gaussian(rnd)*h*(.040+.060*core);
    const px=p.x+nx*off,py=p.y+ny*off;
    const rad=(.18+rnd()*(.90+core*2.5))*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad*4.0);
    const a=.018+rnd()*(.052+core*.060),q=rnd();
    if(q<.48)g.addColorStop(0,`rgba(250,202,158,${a})`);
    else if(q<.72)g.addColorStop(0,`rgba(226,178,156,${a*.91})`);
    else if(q<.87)g.addColorStop(0,`rgba(201,168,180,${a*.84})`);
    else g.addColorStop(0,`rgba(185,174,199,${a*.72})`);
    g.addColorStop(.48,`rgba(193,170,174,${a*.25})`);
    g.addColorStop(1,'rgba(152,150,178,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad*4,0,Math.PI*2);ctx.fill();
  }

  // ---------- HII / emission-region accents ----------
  // Small dusty rose / muted magenta knots, never neon.
  for(let i=0;i<64;i++){
    const t=.30+rnd()*.60,p=band(t),off=(rnd()-.5)*h*.17;
    const px=p.x+nx*off,py=p.y+ny*off,rad=(3+rnd()*15)*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad);
    const a=.012+rnd()*.038;
    g.addColorStop(0,`rgba(211,99,126,${a})`);
    g.addColorStop(.35,`rgba(182,94,127,${a*.45})`);
    g.addColorStop(1,'rgba(135,65,102,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // ---------- Great Rift / branching dark dust ----------
  ctx.globalCompositeOperation='source-over';
  for(let lane=0;lane<7;lane++){
    for(let i=0;i<860;i++){
      const t=-.03+rnd()*1.07,p=band(t),core=coreWeight(t);
      if(rnd()<.075+.055*Math.max(0,Math.sin(t*19+lane*1.35)))continue;
      const wave=Math.sin(t*(6.6+lane*1.45)+lane*1.6)*h*(.014+.0035*lane);
      const shift=(lane-3.0)*h*.016+wave;
      const off=shift+gaussian(rnd)*h*(.010+.0025*lane);
      const px=p.x+nx*off,py=p.y+ny*off;
      const rx=(12+rnd()*(45+core*42))*dpr;
      const ry=rx*(.18+rnd()*.34);
      const g=ctx.createRadialGradient(px,py,0,px,py,rx);
      const a=.052+rnd()*(.095+core*.060);
      g.addColorStop(0,`rgba(5,3,7,${a})`);
      g.addColorStop(.45,`rgba(8,5,12,${a*.58})`);
      g.addColorStop(1,'rgba(10,7,15,0)');
      ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(angle+gaussian(rnd)*.32);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }

  // ---------- Re-seed fine stars after dust lanes ----------
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<17000;i++){
    const t=-.09+rnd()*1.18,p=band(t),core=coreWeight(t);
    const sigma=h*(.105+.040*core),off=gaussian(rnd)*sigma;
    const feather=Math.exp(-.5*Math.pow(off/(sigma*1.50),2));
    if(rnd()>feather*.75)continue;
    const px=p.x+nx*off,py=p.y+ny*off;
    const rad=(.045+rnd()*.18)*dpr,a=(.030+rnd()*.15)*feather;
    const q=rnd();
    if(core>.40&&q<.20)ctx.fillStyle=`rgba(247,211,173,${a*.84})`;
    else if(q<.36)ctx.fillStyle=`rgba(191,202,228,${a*.90})`;
    else if(q<.48)ctx.fillStyle=`rgba(205,185,207,${a*.82})`;
    else ctx.fillStyle=`rgba(229,226,219,${a*.91})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // ---------- One faint long-exposure meteor/streak ----------
  if(w>700*dpr){
    const sx=w*.41,sy=h*.12,ex=w*.52,ey=h*.28;
    const g=ctx.createLinearGradient(sx,sy,ex,ey);
    g.addColorStop(0,'rgba(236,225,214,0)');g.addColorStop(.42,'rgba(236,225,214,.10)');g.addColorStop(1,'rgba(236,225,214,0)');
    ctx.strokeStyle=g;ctx.lineWidth=.55*dpr;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();
  }

  // ---------- Very faint horizontal airglow bands ----------
  for(let i=0;i<6;i++){
    const cy=h*(.73+rnd()*.18),cx=w*(.12+rnd()*.52),rx=w*(.11+rnd()*.25),ry=h*(.003+rnd()*.007);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
    g.addColorStop(0,`rgba(190,101,112,${.008+rnd()*.018})`);g.addColorStop(1,'rgba(120,67,91,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  if(loading){loading.innerHTML='CINEMATIC PASS 12 READY';setTimeout(()=>loading.style.opacity='0',700);}
}

drawSky();
let rt;
addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(drawSky,120);});