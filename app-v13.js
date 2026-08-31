import './app-v7.js';

// v13 — rebuilt photographic particle sky.
// Priorities: extremely dense micro-stars, very few large stars,
// a huge broad Milky Way from upper-left to lower-right,
// warm amber/ivory Galactic center, cool blue-gray outer clouds,
// muted rose/violet emission regions, and thick irregular dark dust lanes.

const overlay=document.createElement('canvas');
overlay.id='sky-v13-overlay';
Object.assign(overlay.style,{
  position:'fixed',left:'0',top:'0',width:'100vw',height:'72vh',
  pointerEvents:'none',zIndex:'2',opacity:'1',
  maskImage:'linear-gradient(to bottom,black 0%,black 86%,rgba(0,0,0,.98) 91%,rgba(0,0,0,.72) 96%,transparent 100%)',
  webkitMaskImage:'linear-gradient(to bottom,black 0%,black 86%,rgba(0,0,0,.98) 91%,rgba(0,0,0,.72) 96%,transparent 100%)'
});
document.body.appendChild(overlay);

const ui=document.querySelector('#ui'); if(ui)ui.style.zIndex='5';
const title=document.querySelector('#title'); if(title)title.textContent='STARLIT FOREST · CINEMATIC PASS 13';
const loading=document.querySelector('#loading');

function rng(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function gauss(r){return (r()+r()+r()+r()+r()+r()-3)/1.225;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function drawEllipse(ctx,x,y,rx,ry,rot,style){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1,ry/rx);ctx.fillStyle=style;ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawSky(){
  const dpr=Math.min(window.devicePixelRatio||1,1.7);
  const w=Math.max(1,Math.floor(innerWidth*dpr));
  const h=Math.max(1,Math.floor(innerHeight*.72*dpr));
  overlay.width=w; overlay.height=h;
  const ctx=overlay.getContext('2d',{alpha:true});
  const r=rng(13082026);

  // ---------- sky base ----------
  const base=ctx.createLinearGradient(0,0,0,h);
  base.addColorStop(0,'#010207');
  base.addColorStop(.24,'#030610');
  base.addColorStop(.50,'#090c18');
  base.addColorStop(.69,'#171522');
  base.addColorStop(.84,'#2b1d2a');
  base.addColorStop(.94,'#3a2938');
  base.addColorStop(1,'#273449');
  ctx.fillStyle=base;ctx.fillRect(0,0,w,h);

  // very restrained horizon color — no flat purple wall
  const air=ctx.createLinearGradient(0,h*.56,0,h);
  air.addColorStop(0,'rgba(98,55,75,0)');
  air.addColorStop(.58,'rgba(126,72,88,.035)');
  air.addColorStop(.82,'rgba(154,83,92,.075)');
  air.addColorStop(.94,'rgba(185,105,92,.045)');
  air.addColorStop(1,'rgba(77,96,128,.025)');
  ctx.fillStyle=air;ctx.fillRect(0,h*.52,w,h*.48);

  // ---------- dense full-sky MICRO star field ----------
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<88000;i++){
    const x=r()*w, y=Math.pow(r(),1.015)*h*.995, q=r();
    let rad,alpha;
    if(q>.99972){rad=(.62+r()*.65)*dpr;alpha=.56+r()*.28;}
    else if(q>.9962){rad=(.22+r()*.32)*dpr;alpha=.12+r()*.28;}
    else{rad=(.026+r()*.115)*dpr;alpha=.018+r()*.12;}
    const c=r();
    if(c<.10)ctx.fillStyle=`rgba(176,204,244,${alpha})`;
    else if(c<.16)ctx.fillStyle=`rgba(247,216,180,${alpha*.78})`;
    else if(c<.21)ctx.fillStyle=`rgba(222,197,204,${alpha*.72})`;
    else if(c<.29)ctx.fillStyle=`rgba(202,207,223,${alpha*.82})`;
    else ctx.fillStyle=`rgba(236,236,232,${alpha*.88})`;
    ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();
  }

  // only a FEW bright stars, small and crisp
  for(let i=0;i<34;i++){
    const x=r()*w,y=r()*h*.90,rad=(.48+r()*.58)*dpr;
    const warm=r()<.24; const cc=warm?'255,224,188':'207,226,255';
    const g=ctx.createRadialGradient(x,y,0,x,y,rad*3.5);
    g.addColorStop(0,`rgba(${cc},.82)`);g.addColorStop(.22,`rgba(${cc},.28)`);g.addColorStop(1,`rgba(${cc},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rad*3.5,0,Math.PI*2);ctx.fill();
  }

  // ---------- Milky Way path ----------
  // Giant diagonal swath, matching the latest reference composition.
  const p0={x:-w*.16,y:-h*.08};
  const p1={x:w*1.06,y:h*.88};
  const vx=p1.x-p0.x,vy=p1.y-p0.y,L=Math.hypot(vx,vy);
  const tx=vx/L,ty=vy/L,nx=-ty,ny=tx,angle=Math.atan2(vy,vx);
  function band(t){
    const bend=Math.sin((t+.03)*Math.PI)*h*.035 + Math.sin(t*7.8+1.1)*h*.006;
    return {x:p0.x+vx*t+nx*bend,y:p0.y+vy*t+ny*bend};
  }
  const coreW=t=>Math.exp(-Math.pow((t-.78)/.18,2));
  const midW=t=>Math.exp(-Math.pow((t-.52)/.33,2));

  // ---------- huge diffuse outer envelope ----------
  for(let i=0;i<5200;i++){
    const t=-.08+r()*1.16,p=band(t),core=coreW(t),mid=midW(t);
    const width=h*(.145+.050*(.5+.5*Math.sin(t*10.4+.9))+.050*core+.018*mid);
    const off=gauss(r)*width;
    const feather=Math.exp(-.5*Math.pow(off/(width*1.45),2));
    if(r()>feather*.78)continue;
    const x=p.x+nx*off,y=p.y+ny*off;
    const rx=(22+r()*(92+core*92))*dpr,ry=rx*(.24+r()*.48);
    const g=ctx.createRadialGradient(x,y,0,x,y,rx);
    const c=r(),a=(.003+r()*(.012+core*.020))*feather;
    if(core>.25&&c<.26)g.addColorStop(0,`rgba(237,174,118,${a})`);      // amber dust
    else if(c<.42)g.addColorStop(0,`rgba(214,167,147,${a*.92})`);      // tan rose
    else if(c<.56)g.addColorStop(0,`rgba(181,152,178,${a*.82})`);      // muted violet
    else if(c<.72)g.addColorStop(0,`rgba(176,189,215,${a*.76})`);      // cool cloud
    else if(c<.86)g.addColorStop(0,`rgba(208,199,188,${a*.72})`);      // warm neutral
    else g.addColorStop(0,`rgba(128,149,188,${a*.66})`);
    g.addColorStop(1,'rgba(65,45,64,0)');
    drawEllipse(ctx,x,y,rx,ry,angle+gauss(r)*.20,g);
  }

  // ---------- large irregular dust / star-cloud islands ----------
  for(let i=0;i<760;i++){
    const t=-.04+r()*1.09,p=band(t),core=coreW(t);
    const width=h*(.095+.040*core);
    const off=gauss(r)*width;
    const x=p.x+nx*off,y=p.y+ny*off;
    const rx=(25+r()*(85+core*95))*dpr,ry=rx*(.16+r()*.42);
    const g=ctx.createRadialGradient(x,y,0,x,y,rx);
    const c=r(),a=.005+r()*(.017+core*.030);
    if(core>.24&&c<.34)g.addColorStop(0,`rgba(246,186,126,${a})`);
    else if(c<.50)g.addColorStop(0,`rgba(219,166,144,${a*.95})`);
    else if(c<.62)g.addColorStop(0,`rgba(195,151,171,${a*.88})`);
    else if(c<.74)g.addColorStop(0,`rgba(171,157,195,${a*.83})`);
    else if(c<.87)g.addColorStop(0,`rgba(188,201,223,${a*.78})`);
    else g.addColorStop(0,`rgba(142,163,199,${a*.70})`);
    g.addColorStop(1,'rgba(78,55,72,0)');
    drawEllipse(ctx,x,y,rx,ry,angle+gauss(r)*.34,g);
  }

  // ---------- gigantic Milky Way micro-star population ----------
  for(let i=0;i<128000;i++){
    const t=-.08+r()*1.16,p=band(t),core=coreW(t);
    const width=h*(.098+.040*(.5+.5*Math.sin(t*12.0+.4))+.055*core);
    const off=gauss(r)*width;
    const feather=Math.exp(-.5*Math.pow(off/(width*1.55),2));
    if(r()>feather*(.54+.18*core))continue;
    const x=p.x+nx*off,y=p.y+ny*off;
    const q=r();
    const rad=(q>.9993?(.34+r()*.62):(.024+r()*.105))*dpr;
    const alpha=(.020+r()*(.11+core*.09))*feather;
    const c=r();
    if(core>.32&&c<.22)ctx.fillStyle=`rgba(247,197,145,${alpha*.93})`;
    else if(c<.36)ctx.fillStyle=`rgba(224,181,158,${alpha*.92})`;
    else if(c<.49)ctx.fillStyle=`rgba(201,174,199,${alpha*.88})`;
    else if(c<.64)ctx.fillStyle=`rgba(187,203,229,${alpha*.86})`;
    else if(c<.79)ctx.fillStyle=`rgba(215,211,205,${alpha*.91})`;
    else ctx.fillStyle=`rgba(235,225,211,${alpha*.90})`;
    ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();
  }

  // ---------- warm Galactic-center bulge (lower-right) ----------
  for(let i=0;i<12500;i++){
    const t=.58+r()*.36,p=band(t),core=coreW(t);
    if(r()>.14+.79*core)continue;
    const off=gauss(r)*h*(.038+.055*core);
    const x=p.x+nx*off,y=p.y+ny*off;
    const q=r(),rad=(.06+r()*(.55+core*1.25))*dpr;
    const alpha=(.035+r()*(.12+core*.11));
    if(q<.46)ctx.fillStyle=`rgba(255,190,119,${alpha})`;
    else if(q<.70)ctx.fillStyle=`rgba(243,207,164,${alpha*.94})`;
    else if(q<.86)ctx.fillStyle=`rgba(220,170,163,${alpha*.82})`;
    else ctx.fillStyle=`rgba(201,177,201,${alpha*.72})`;
    ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();
  }

  // ---------- HII / emission-region accents ----------
  for(let i=0;i<52;i++){
    const t=.42+r()*.45,p=band(t),off=(r()-.5)*h*.11;
    const x=p.x+nx*off,y=p.y+ny*off,rad=(2+r()*8)*dpr;
    const g=ctx.createRadialGradient(x,y,0,x,y,rad);
    g.addColorStop(0,`rgba(219,91,139,${.018+r()*.045})`);
    g.addColorStop(.35,`rgba(194,91,148,${.010+r()*.025})`);
    g.addColorStop(1,'rgba(116,53,105,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();
  }

  // ---------- Great Rift: several branching dark lanes ----------
  ctx.globalCompositeOperation='source-over';
  for(let lane=0;lane<7;lane++){
    const laneOffset=(lane-3)*h*.012;
    ctx.beginPath();
    for(let s=0;s<=160;s++){
      const t=s/160;
      const p=band(t);
      const wav=Math.sin(t*(7.0+lane*1.15)+lane*.9)*h*(.0055+.0018*lane)
               +Math.sin(t*(19+lane*1.8)+lane)*h*.0028;
      const off=laneOffset+wav;
      const x=p.x+nx*off,y=p.y+ny*off;
      if(s===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.strokeStyle=`rgba(2,1,5,${.12+lane*.012})`;
    ctx.lineWidth=(8+lane*3.2)*dpr;
    ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  }

  // broken dark cloud knots around the Rift
  for(let i=0;i<1550;i++){
    const t=.05+r()*.90,p=band(t),core=coreW(t);
    const central=(r()<.70?1:-1)*(h*(.008+r()*.045));
    const off=central+gauss(r)*h*.022;
    const x=p.x+nx*off,y=p.y+ny*off;
    const rx=(7+r()*(28+core*24))*dpr,ry=rx*(.18+r()*.34);
    const g=ctx.createRadialGradient(x,y,0,x,y,rx);
    g.addColorStop(0,`rgba(2,1,5,${.045+r()*(.11+core*.055)})`);g.addColorStop(1,'rgba(2,1,5,0)');
    drawEllipse(ctx,x,y,rx,ry,angle+gauss(r)*.30,g);
  }

  // ---------- re-seed fine stars after dust lanes ----------
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<26000;i++){
    const t=-.05+r()*1.10,p=band(t),core=coreW(t);
    const width=h*(.10+.025*core),off=gauss(r)*width;
    const feather=Math.exp(-.5*Math.pow(off/(width*1.5),2));
    if(r()>feather*.68)continue;
    const x=p.x+nx*off,y=p.y+ny*off;
    const rad=(.025+r()*.095)*dpr,a=(.025+r()*.12)*feather,c=r();
    if(core>.36&&c<.20)ctx.fillStyle=`rgba(248,205,157,${a*.90})`;
    else if(c<.34)ctx.fillStyle=`rgba(194,207,232,${a*.90})`;
    else ctx.fillStyle=`rgba(232,229,222,${a*.91})`;
    ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();
  }

  // ---------- sparse stellar clusters ----------
  for(let k=0;k<18;k++){
    const t=.10+r()*.78,p=band(t),core=coreW(t),off=(r()-.5)*h*.14;
    const cx=p.x+nx*off,cy=p.y+ny*off;
    const spread=(5+r()*16)*dpr,count=65+Math.floor(r()*180);
    for(let j=0;j<count;j++){
      const a=r()*Math.PI*2,rr=Math.pow(r(),.62)*spread;
      const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.62;
      const rad=(.05+r()*.16)*dpr,al=.05+r()*.25;
      ctx.fillStyle=core>.4&&r()<.18?`rgba(248,207,165,${al})`:`rgba(218,228,245,${al})`;
      ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();
    }
  }

  // ---------- subtle long-exposure airglow ribbons ----------
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<5;i++){
    const cy=h*(.79+r()*.13),cx=w*(.08+r()*.54),rx=w*(.10+r()*.19),ry=h*(.002+r()*.006);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
    g.addColorStop(0,`rgba(187,89,96,${.006+r()*.012})`);g.addColorStop(1,'rgba(120,60,88,0)');
    drawEllipse(ctx,cx,cy,rx,ry,0,g);
  }

  if(loading){loading.innerHTML='CINEMATIC PASS 13 READY';setTimeout(()=>loading.style.opacity='0',700);}
}

drawSky();
let resizeTimer;
addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawSky,120);});
