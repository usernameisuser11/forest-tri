import './app-v7.js';

// v10: photographic night-sky pass modeled after the supplied Milky Way reference.
// The new sky intentionally covers the old v7 sky almost completely, while fading out before the terrain.
const overlay=document.createElement('canvas');
overlay.id='sky-v10-overlay';
overlay.style.position='fixed';
overlay.style.left='0';
overlay.style.top='0';
overlay.style.width='100vw';
overlay.style.height='64vh';
overlay.style.pointerEvents='none';
overlay.style.zIndex='2';
overlay.style.opacity='1';
overlay.style.maskImage='linear-gradient(to bottom,black 0%,black 80%,rgba(0,0,0,.96) 86%,rgba(0,0,0,.68) 93%,transparent 100%)';
overlay.style.webkitMaskImage='linear-gradient(to bottom,black 0%,black 80%,rgba(0,0,0,.96) 86%,rgba(0,0,0,.68) 93%,transparent 100%)';
document.body.appendChild(overlay);

const ui=document.querySelector('#ui');
if(ui)ui.style.zIndex='5';
const title=document.querySelector('#title');
if(title)title.textContent='STARLIT FOREST · CINEMATIC PASS 10';

function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function gaussian(r){return r()+r()+r()+r()-2;}

function drawSky(){
  const dpr=Math.min(window.devicePixelRatio||1,1.7);
  const w=Math.max(1,Math.floor(innerWidth*dpr));
  const h=Math.max(1,Math.floor(innerHeight*.64*dpr));
  overlay.width=w;overlay.height=h;
  const ctx=overlay.getContext('2d',{alpha:true});
  const rnd=mulberry32(10082026);

  // Opaque photographic sky foundation. This hides the old synthetic galaxy and moon.
  const base=ctx.createLinearGradient(0,0,0,h);
  base.addColorStop(0,'rgba(2,3,8,.995)');
  base.addColorStop(.28,'rgba(8,8,16,.992)');
  base.addColorStop(.57,'rgba(21,15,27,.985)');
  base.addColorStop(.78,'rgba(48,26,43,.972)');
  base.addColorStop(.94,'rgba(31,30,50,.90)');
  base.addColorStop(1,'rgba(20,35,58,.28)');
  ctx.fillStyle=base;ctx.fillRect(0,0,w,h);

  // Soft mauve / dusty-rose night air near the horizon like the reference photo.
  const horizon=ctx.createLinearGradient(0,h*.45,0,h);
  horizon.addColorStop(0,'rgba(104,57,81,0)');
  horizon.addColorStop(.62,'rgba(120,72,92,.12)');
  horizon.addColorStop(.84,'rgba(127,76,98,.20)');
  horizon.addColorStop(1,'rgba(58,74,104,.07)');
  ctx.fillStyle=horizon;ctx.fillRect(0,h*.42,w,h*.58);

  // Broad photographic Milky Way path: enters from the upper-left and descends toward the right horizon.
  // This is intentionally very different from the previous shallow diagonal band.
  const band=(t)=>{
    const bend=Math.sin((t-.12)*Math.PI)*.035;
    return {
      x:w*(.235+.585*t + bend),
      y:h*(-.12+.99*t - Math.sin(t*Math.PI)*.075 + Math.sin(t*8.0)*.008)
    };
  };
  const coreWeight=(t)=>Math.exp(-Math.pow((t-.70)/.22,2));

  // Outer diffuse galactic glow: wide, patchy and with no hard boundary.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<2200;i++){
    const t=rnd(),p=band(t),core=coreWeight(t);
    const local=h*(.145+.065*(.5+.5*Math.sin(t*10.8+1.7))+.065*core);
    const off=gaussian(rnd)*local;
    const feather=Math.exp(-.5*Math.pow(off/(local*1.12),2));
    if(rnd()>feather*.88)continue;
    const px=p.x+.88*off,py=p.y-.47*off;
    const rx=(18+rnd()*(68+core*58))*dpr;
    const ry=rx*(.22+rnd()*.38);
    const g=ctx.createRadialGradient(px,py,0,px,py,rx);
    const q=rnd();
    const a=(.008+rnd()*(.026+core*.032))*feather;
    if(core>.34&&q<.31)g.addColorStop(0,`rgba(244,205,170,${a})`);
    else if(q<.48)g.addColorStop(0,`rgba(198,170,169,${a*.92})`);
    else if(q<.64)g.addColorStop(0,`rgba(164,148,178,${a*.82})`);
    else if(q<.78)g.addColorStop(0,`rgba(184,188,211,${a*.72})`);
    else g.addColorStop(0,`rgba(124,144,180,${a*.62})`);
    g.addColorStop(1,'rgba(65,48,68,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(.56+gaussian(rnd)*.15);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // Mid-scale dusty cloud masses: warm ivory / bronze / muted lavender.
  for(let k=0;k<210;k++){
    const t=.02+rnd()*.96,p=band(t),core=coreWeight(t);
    const side=gaussian(rnd)*h*(.050+.038*core);
    const cx=p.x+.88*side,cy=p.y-.47*side;
    const rx=(22+rnd()*(58+core*56))*dpr;
    const ry=rx*(.16+rnd()*.28);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
    const q=rnd(),a=.010+rnd()*(.026+core*.032);
    if(core>.38&&q<.36)g.addColorStop(0,`rgba(246,206,170,${a})`);
    else if(q<.52)g.addColorStop(0,`rgba(207,179,170,${a*.92})`);
    else if(q<.68)g.addColorStop(0,`rgba(177,158,188,${a*.82})`);
    else if(q<.79)g.addColorStop(0,`rgba(202,199,206,${a*.70})`);
    else g.addColorStop(0,`rgba(141,156,190,${a*.62})`);
    g.addColorStop(1,'rgba(84,59,73,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(cx,cy);ctx.rotate(.56+gaussian(rnd)*.22);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // Dense stellar population inside the Milky Way. Most stars are tiny so the band reads as a star cloud, not glitter paint.
  for(let i=0;i<42000;i++){
    const t=rnd(),p=band(t),core=coreWeight(t);
    const width=h*(.058+.043*(.5+.5*Math.sin(t*13.2+.6))+.038*core);
    const off=gaussian(rnd)*width;
    const feather=Math.exp(-.5*Math.pow(off/(width*1.28),2));
    if(rnd()>feather*(.66+.20*core))continue;
    const px=p.x+.88*off,py=p.y-.47*off;
    const q=rnd();
    const rad=(q>.9984?(.50+rnd()*.88):(.075+rnd()*.31))*dpr;
    const alpha=(.045+rnd()*(.22+core*.14))*feather;
    const c=rnd();
    if(core>.40&&c<.30)ctx.fillStyle=`rgba(249,218,187,${alpha*.88})`;
    else if(c<.45)ctx.fillStyle=`rgba(218,198,193,${alpha*.92})`;
    else if(c<.59)ctx.fillStyle=`rgba(190,184,210,${alpha*.82})`;
    else if(c<.73)ctx.fillStyle=`rgba(201,211,231,${alpha*.84})`;
    else ctx.fillStyle=`rgba(230,226,223,${alpha*.90})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // Galactic-center bulge: broad warm stellar light similar to the reference, not a white stripe.
  for(let i=0;i<4200;i++){
    const t=.47+rnd()*.43,p=band(t),core=coreWeight(t);
    if(rnd()>.18+.76*core)continue;
    const off=gaussian(rnd)*h*(.022+.035*core);
    const px=p.x+.88*off,py=p.y-.47*off;
    const rad=(.25+rnd()*(1.15+core*2.8))*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad*3.5);
    const a=.025+rnd()*(.070+core*.065);
    const q=rnd();
    if(q<.62)g.addColorStop(0,`rgba(251,210,174,${a})`);
    else g.addColorStop(0,`rgba(224,190,181,${a*.84})`);
    g.addColorStop(.45,`rgba(198,177,184,${a*.28})`);
    g.addColorStop(1,'rgba(166,165,190,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad*3.5,0,Math.PI*2);ctx.fill();
  }

  // A few muted HII regions / pink knots, kept small and photographic.
  for(let i=0;i<38;i++){
    const t=.34+rnd()*.50,p=band(t),off=(rnd()-.5)*h*.085;
    const px=p.x+.88*off,py=p.y-.47*off,rad=(3+rnd()*12)*dpr;
    const g=ctx.createRadialGradient(px,py,0,px,py,rad);
    g.addColorStop(0,`rgba(207,102,130,${.016+rnd()*.038})`);
    g.addColorStop(1,'rgba(135,66,96,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // Great Rift: a broad branching network of dark dust lanes cutting through the warm core.
  ctx.globalCompositeOperation='source-over';
  for(let lane=0;lane<5;lane++){
    for(let i=0;i<560;i++){
      const t=.02+rnd()*.96,p=band(t),core=coreWeight(t);
      if(rnd()<.08+.08*Math.max(0,Math.sin(t*21+lane*1.6)))continue;
      const wave=Math.sin(t*(7.8+lane*2.0)+lane*1.7)*h*(.010+.003*lane);
      const shift=(lane-2.0)*h*.013+wave;
      const off=shift+gaussian(rnd)*h*(.007+.0023*lane);
      const px=p.x+.88*off,py=p.y-.47*off;
      const rx=(10+rnd()*(32+core*28))*dpr;
      const ry=rx*(.14+rnd()*.25);
      const g=ctx.createRadialGradient(px,py,0,px,py,rx);
      const a=.055+rnd()*(.090+core*.052);
      g.addColorStop(0,`rgba(5,3,8,${a})`);g.addColorStop(1,'rgba(7,5,12,0)');
      ctx.fillStyle=g;ctx.save();ctx.translate(px,py);ctx.rotate(.56+gaussian(rnd)*.17);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }

  // Re-seed tiny points after the dust lanes so the band still looks stellar.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<9000;i++){
    const t=rnd(),p=band(t),core=coreWeight(t);
    const width=h*(.066+.022*core),off=gaussian(rnd)*width;
    const feather=Math.exp(-.5*Math.pow(off/(width*1.35),2));
    if(rnd()>feather*.76)continue;
    const px=p.x+.88*off,py=p.y-.47*off;
    const rad=(.07+rnd()*.23)*dpr,a=(.045+rnd()*.18)*feather;
    const q=rnd();
    if(core>.42&&q<.24)ctx.fillStyle=`rgba(247,215,184,${a*.82})`;
    else if(q<.38)ctx.fillStyle=`rgba(198,199,222,${a*.90})`;
    else ctx.fillStyle=`rgba(226,225,228,${a*.88})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // Dense all-sky star field: much closer to a long-exposure photograph than earlier versions.
  for(let i=0;i<24500;i++){
    const px=rnd()*w,py=Math.pow(rnd(),1.02)*h*.99,q=rnd();
    let rad,a;
    if(q>.99945){rad=(.95+rnd()*1.45)*dpr;a=.84;}
    else if(q>.992){rad=(.30+rnd()*.62)*dpr;a=.16+rnd()*.38;}
    else{rad=(.065+rnd()*.29)*dpr;a=.04+rnd()*.27;}
    const tq=rnd();
    if(tq<.12)ctx.fillStyle=`rgba(186,208,239,${a})`;
    else if(tq<.19)ctx.fillStyle=`rgba(242,209,178,${a*.84})`;
    else if(tq<.27)ctx.fillStyle=`rgba(215,195,204,${a*.84})`;
    else ctx.fillStyle=`rgba(230,228,226,${a*.90})`;
    ctx.beginPath();ctx.arc(px,py,rad,0,Math.PI*2);ctx.fill();
  }

  // A couple of very faint horizontal atmospheric bands like the long-exposure reference.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<6;i++){
    const cy=h*(.73+rnd()*.20),cx=w*(.15+rnd()*.55),rx=w*(.10+rnd()*.22),ry=h*(.004+rnd()*.009);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
    g.addColorStop(0,`rgba(188,101,112,${.012+rnd()*.022})`);g.addColorStop(1,'rgba(120,70,95,0)');
    ctx.fillStyle=g;ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/rx);ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}

drawSky();
let rt;
addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(drawSky,120);});