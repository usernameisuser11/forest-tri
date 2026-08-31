import './app-v7.js';

// v9: softer, higher, more photographic Milky Way pass.
// The overlay intentionally stops before the terrain so stars do not paint over the trees.
const overlay=document.createElement('canvas');
overlay.id='sky-v9-overlay';
overlay.style.position='fixed';
overlay.style.left='0';
overlay.style.top='0';
overlay.style.width='100vw';
overlay.style.height='58vh';
overlay.style.pointerEvents='none';
overlay.style.zIndex='2';
overlay.style.opacity='.96';
overlay.style.maskImage='linear-gradient(to bottom,black 0%,black 74%,rgba(0,0,0,.93) 82%,rgba(0,0,0,.48) 91%,transparent 100%)';
overlay.style.webkitMaskImage='linear-gradient(to bottom,black 0%,black 74%,rgba(0,0,0,.93) 82%,rgba(0,0,0,.48) 91%,transparent 100%)';
document.body.appendChild(overlay);

const ui=document.querySelector('#ui');
if(ui)ui.style.zIndex='5';
const title=document.querySelector('#title');
if(title)title.textContent='STARLIT FOREST · CINEMATIC PASS 09';

function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function gaussian(r){return r()+r()+r()+r()-2;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function drawSky(){
  const dpr=Math.min(window.devicePixelRatio||1,1.65);
  const w=Math.max(1,Math.floor(innerWidth*dpr));
  const h=Math.max(1,Math.floor(innerHeight*.58*dpr));
  overlay.width=w;overlay.height=h;
  const ctx=overlay.getContext('2d',{alpha:true});
  ctx.clearRect(0,0,w,h);
  const rnd=mulberry32(9082026);

  // Slight photographic sky tint. Keep this subtle so the original 3D sky still reads underneath.
  const tint=ctx.createLinearGradient(0,0,0,h);
  tint.addColorStop(0,'rgba(2,3,10,.18)');
  tint.addColorStop(.42,'rgba(4,10,25,.10)');
  tint.addColorStop(.80,'rgba(8,22,45,.035)');
  tint.addColorStop(1,'rgba(10,28,52,0)');
  ctx.fillStyle=tint;ctx.fillRect(0,0,w,h);

  // Higher trajectory than v8: no longer sits on the treeline.
  const band=(t)=>({
    x:w*(-.08+1.18*t),
    y:h*(.70-.50*t + Math.sin(t*6.7)*.014 + Math.sin(t*17.0)*.0035)
  });
  const coreWeight=(t)=>Math.exp(-Math.pow((t-.50)/.19,2));

  // 1) Very broad, soft outer luminosity. This removes the cut-out edge.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<1450;i++){
    const t=rnd(),p=band(t),core=coreWeight(t);
    const width=h*(.115+.050*(.5+.5*Math.sin(t*10.5+1.2))+.055*core);
    const off=gaussian(rnd)*width;
    const feather=Math.exp(-.5*Math.pow(off/(width*1.25),2));
    if(rnd()>feather*.92)continue;
    const px=p.x+.52*off,py=p.y+.855*off;
    const rx=(18+rnd()*(62+core*48))*dpr;
    const ry=rx*(.22+rnd()*.34);
    const g=ctx.createRadialGradient(px,py,0,px,py,rx);
    const q=rnd();
    const a=(.008+rnd()*(.020+core*.022))*feather;
    if(core>.34&&q<.22)g.addColorStop(0,`rgba(238,220,198,${a})`);
    else if(q<.42)g.addColorStop(0,`rgba(181,199,226,${a})`);
    else if(q<.56)g.addColorStop(0,`rgba(168,164,195,${a*.75})`);
    else g.addColorStop(0,`rgba(130,158,207,${a})`);
    g.addColorStop(1,'rgba(55,70,110,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(-.32+gaussian(rnd)*.08);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // 2) Soft colored cloud islands. Low saturation = photographic, not neon fantasy.
  for(let k=0;k<120;k++){
    const t=.02+rnd()*.96,p=band(t),core=coreWeight(t);
    const side=gaussian(rnd)*h*(.040+.030*core);
    const cx=p.x+.52*side,cy=p.y+.855*side;
    const rx=(22+rnd()*(50+core*48))*dpr;
    const ry=rx*(.14+rnd()*.24);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
    const q=rnd(),a=.008+rnd()*(.019+core*.018);
    if(core>.38&&q<.30)g.addColorStop(0,`rgba(246,224,201,${a})`);
    else if(q<.48)g.addColorStop(0,`rgba(190,204,228,${a})`);
    else if(q<.61)g.addColorStop(0,`rgba(176,165,196,${a*.72})`);
    else if(q<.68)g.addColorStop(0,`rgba(191,145,160,${a*.50})`);
    else g.addColorStop(0,`rgba(145,171,215,${a})`);
    g.addColorStop(1,'rgba(75,88,120,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(cx,cy);ctx.rotate(-.32+gaussian(rnd)*.15);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // 3) Main stellar population. Edge density decays smoothly instead of ending at a line.
  for(let i=0;i<36000;i++){
    const t=rnd(),p=band(t),core=coreWeight(t);
    const width=h*(.044+.032*(.5+.5*Math.sin(t*12.7+.8))+.030*core);
    const off=gaussian(rnd)*width;
    const feather=Math.exp(-.5*Math.pow(off/(width*1.18),2));
    if(rnd()>feather*(.74+.18*core))continue;
    const px=p.x+.52*off,py=p.y+.855*off;
    const q=rnd();
    const rad=(q>.998?(.58+rnd()*1.10):(.10+rnd()*.38))*dpr;
    const alpha=(.055+rnd()*(.25+core*.13))*feather;
    const c=rnd();
    if(core>.40&&c<.24)ctx.fillStyle=`rgba(245,226,205,${alpha*.80})`;
    else if(c<.43)ctx.fillStyle=`rgba(190,207,233,${alpha})`;
    else if(c<.52)ctx.fillStyle=`rgba(181,173,201,${alpha*.60})`;
    else ctx.fillStyle=`rgba(222,229,240,${alpha})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 4) Warm Galactic-center bulge, broad and subdued.
  for(let i=0;i<2600;i++){
    const t=.31+rnd()*.34,p=band(t),core=coreWeight(t);
    if(rnd()>.16+.73*core)continue;
    const off=gaussian(rnd)*h*(.018+.027*core);
    const px=p.x+.52*off,py=p.y+.855*off;
    const rad=(.24+rnd()*(1.00+core*2.1))*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad*3.4);
    const a=.022+rnd()*(.055+core*.050);
    g.addColorStop(0,`rgba(247,225,201,${a})`);
    g.addColorStop(.42,`rgba(218,211,207,${a*.32})`);
    g.addColorStop(1,'rgba(190,200,220,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad*3.4,0,Math.PI*2);ctx.fill();
  }

  // 5) Faint HII regions: tiny dusty rose/magenta accents only.
  for(let i=0;i<28;i++){
    const t=.20+rnd()*.60,p=band(t),off=(rnd()-.5)*h*.070;
    const px=p.x+.52*off,py=p.y+.855*off,rad=(3+rnd()*10)*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad);
    g.addColorStop(0,`rgba(203,117,139,${.012+rnd()*.030})`);
    g.addColorStop(1,'rgba(140,72,104,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 6) Great Rift and branching dust. Broken, uneven, and semi-transparent.
  ctx.globalCompositeOperation='source-over';
  for(let lane=0;lane<4;lane++){
    for(let i=0;i<430;i++){
      const t=rnd(),p=band(t),core=coreWeight(t);
      if(rnd()<.12+.10*Math.sin(t*23+lane))continue;
      const wave=Math.sin(t*(8.1+lane*2.45)+lane*1.85)*h*(.009+.003*lane);
      const shift=(lane-1.45)*h*.015+wave;
      const off=shift+gaussian(rnd)*h*(.007+.0026*lane);
      const px=p.x+.52*off,py=p.y+.855*off;
      const rx=(10+rnd()*(28+core*24))*dpr;
      const ry=rx*(.14+rnd()*.22);
      const g=ctx.createRadialGradient(px,py,0,px,py,rx);
      const a=.045+rnd()*(.080+core*.040);
      g.addColorStop(0,`rgba(0,2,9,${a})`);g.addColorStop(1,'rgba(0,2,9,0)');
      ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(-.32+gaussian(rnd)*.12);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }

  // 7) Re-seed tiny stars after dust so the band remains stellar rather than smoky.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<7600;i++){
    const t=rnd(),p=band(t),core=coreWeight(t);
    const width=h*(.050+.018*core),off=gaussian(rnd)*width;
    const feather=Math.exp(-.5*Math.pow(off/(width*1.3),2));
    if(rnd()>feather*.78)continue;
    const px=p.x+.52*off,py=p.y+.855*off;
    const rad=(.08+rnd()*.27)*dpr,a=(.06+rnd()*.23)*feather;
    const q=rnd();
    if(core>.42&&q<.17)ctx.fillStyle=`rgba(244,225,204,${a*.72})`;
    else if(q<.30)ctx.fillStyle=`rgba(192,210,238,${a})`;
    else ctx.fillStyle=`rgba(225,233,245,${a})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // 8) General star field: plentiful but mainly faint, with several natural color temperatures.
  for(let i=0;i<15500;i++){
    const px=rnd()*w,py=Math.pow(rnd(),1.035)*h*.98,q=rnd();
    let rad,a;
    if(q>.99925){rad=(1.05+rnd()*1.55)*dpr;a=.84;}
    else if(q>.990){rad=(.36+rnd()*.72)*dpr;a=.20+rnd()*.40;}
    else{rad=(.09+rnd()*.34)*dpr;a=.06+rnd()*.31;}
    const tq=rnd();
    if(tq<.14)ctx.fillStyle=`rgba(188,213,247,${a})`;
    else if(tq<.19)ctx.fillStyle=`rgba(246,220,193,${a*.78})`;
    else if(tq<.25)ctx.fillStyle=`rgba(214,219,229,${a*.88})`;
    else ctx.fillStyle=`rgba(232,238,248,${a})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
    if(q>.99962){ctx.strokeStyle=`rgba(218,232,248,${a*.22})`;ctx.lineWidth=.55*dpr;ctx.beginPath();ctx.moveTo(px-rad*3.6,py);ctx.lineTo(px+rad*3.6,py);ctx.moveTo(px,py-rad*2.9);ctx.lineTo(px,py+rad*2.9);ctx.stroke();}
  }

  // Bottom atmospheric veil hides the canvas transition and keeps tree silhouettes clean.
  ctx.globalCompositeOperation='source-over';
  const veil=ctx.createLinearGradient(0,h*.72,0,h);
  veil.addColorStop(0,'rgba(5,15,31,0)');
  veil.addColorStop(.72,'rgba(7,21,41,.018)');
  veil.addColorStop(1,'rgba(9,25,46,0)');
  ctx.fillStyle=veil;ctx.fillRect(0,h*.70,w,h*.30);
}

drawSky();
let rt;
addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(drawSky,120);});