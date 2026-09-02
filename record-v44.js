const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 44';
if(credit) credit.textContent='Three.js · exact tab capture · evolving lens trajectories';

const style=document.createElement('style');
style.textContent=`
#record-v44{position:fixed;top:18px;right:18px;z-index:50;display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid rgba(190,215,255,.16);border-radius:10px;background:rgba(2,7,16,.50);backdrop-filter:blur(10px);font-family:Inter,system-ui,sans-serif;color:#dce8ff;box-shadow:0 8px 28px rgba(0,0,0,.22);transition:opacity .25s ease,transform .25s ease}
#record-v44 button{appearance:none;border:1px solid rgba(210,225,255,.22);background:rgba(12,20,34,.76);color:#e8f0ff;border-radius:7px;padding:7px 11px;font:600 11px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;transition:.18s ease}
#record-v44 button:hover{background:rgba(24,35,54,.88)}
#record-v44 button[data-recording="1"]{border-color:rgba(255,105,105,.46);background:rgba(94,18,25,.72)}
#record-v44 .dot{width:7px;height:7px;border-radius:50%;background:#748096;transition:.18s ease}
#record-v44[data-recording="1"] .dot{background:#ff5151;box-shadow:0 0 10px rgba(255,70,70,.8);animation:recPulse 1s ease-in-out infinite}
#record-v44 .time{min-width:76px;font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;opacity:.78}
#record-v44 .hint{font-size:9px;letter-spacing:.08em;opacity:.46;white-space:nowrap}
html.recording-clean,html.recording-clean body,html.recording-clean *{cursor:none!important}
html.recording-clean #ui{opacity:0!important}
html.recording-clean #record-v44{opacity:0!important;transform:translateY(-8px);pointer-events:none}
@keyframes recPulse{50%{opacity:.35}}
@media(max-width:720px){#record-v44{top:10px;right:10px;padding:7px 8px}.hint{display:none!important}}
`;
document.head.appendChild(style);

const panel=document.createElement('div');
panel.id='record-v44';
panel.innerHTML=`<span class="dot"></span><button type="button">5분 원본화면 녹화</button><span class="time">00:00 / 05:00</span><span class="hint">현재 탭 선택 · 30fps · R 중지</span>`;
document.body.appendChild(panel);

const button=panel.querySelector('button');
const timeEl=panel.querySelector('.time');
const MAX_MS=5*60*1000;
let recorder=null;
let stream=null;
let chunks=[];
let startAt=0;
let timerId=0;
let activeMime='video/webm';

function format(ms){
  const s=Math.max(0,Math.min(300,Math.floor(ms/1000)));
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function chooseMime(){
  const types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  for(const type of types){if(window.MediaRecorder?.isTypeSupported?.(type))return type;}
  return '';
}

function setClean(on){
  document.documentElement.classList.toggle('recording-clean',on);
}

function setIdle(text='5분 원본화면 녹화'){
  panel.dataset.recording='0';
  button.dataset.recording='0';
  button.textContent=text;
  setClean(false);
}

function saveRecording(){
  if(!chunks.length)return;
  const blob=new Blob(chunks,{type:activeMime||'video/webm'});
  const url=URL.createObjectURL(blob);
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const a=document.createElement('a');
  a.href=url;
  a.download=`starlit-sky-v44-exact-tab-${stamp}.webm`;
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),120000);
}

function stopRecording(){
  if(!recorder||recorder.state==='inactive')return;
  clearInterval(timerId);timerId=0;
  if(recorder.state==='recording')recorder.stop();
  button.textContent='저장 중…';
}

function updateTimer(){
  if(!startAt)return;
  const elapsed=performance.now()-startAt;
  timeEl.textContent=`${format(elapsed)} / 05:00`;
  if(elapsed>=MAX_MS)stopRecording();
}

async function startRecording(){
  if(!navigator.mediaDevices?.getDisplayMedia||!window.MediaRecorder){
    alert('현재 탭 고화질 녹화는 Chrome 또는 Edge 최신 버전이 필요합니다.');
    return;
  }

  button.textContent='현재 탭을 선택해 주세요…';

  try{
    stream=await navigator.mediaDevices.getDisplayMedia({
      video:{
        displaySurface:'browser',
        frameRate:{ideal:30,max:30},
        cursor:'never'
      },
      audio:false,
      preferCurrentTab:true,
      selfBrowserSurface:'include',
      surfaceSwitching:'exclude',
      monitorTypeSurfaces:'exclude'
    });
  }catch(err){
    console.debug('Tab capture cancelled',err);
    setIdle();
    return;
  }

  const track=stream.getVideoTracks()[0];
  if(!track){setIdle();return;}
  try{track.contentHint='detail';}catch{}

  const settings=track.getSettings?.()||{};
  if(settings.displaySurface&&settings.displaySurface!=='browser'){
    stream.getTracks().forEach(t=>t.stop());
    stream=null;
    setIdle();
    alert('화면 전체나 창이 아니라 “현재 탭”을 선택해 주세요. 그래야 카톡 알림·다른 앱·마우스가 영상에 들어가지 않습니다.');
    return;
  }

  // Hide page UI only after the browser has finished asking which surface to share.
  setClean(true);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(resolve,180))));

  const mime=chooseMime();
  const width=settings.width||innerWidth;
  const height=settings.height||innerHeight;
  // Dense one-pixel star fields need considerably more bitrate than ordinary UI/video.
  const pixels=Math.max(1,width*height);
  const bitrate=Math.round(Math.max(12000000,Math.min(18000000,pixels*7.2)));
  const options={videoBitsPerSecond:bitrate};
  if(mime)options.mimeType=mime;

  try{
    recorder=new MediaRecorder(stream,options);
  }catch(err){
    console.error(err);
    stream.getTracks().forEach(t=>t.stop());
    stream=null;
    setIdle();
    alert('녹화기를 시작하지 못했습니다. Chrome/Edge에서 다시 시도해 주세요.');
    return;
  }

  chunks=[];
  activeMime=recorder.mimeType||mime||'video/webm';
  recorder.ondataavailable=e=>{if(e.data&&e.data.size>0)chunks.push(e.data);};
  recorder.onerror=e=>{
    console.error('MediaRecorder error',e);
    clearInterval(timerId);timerId=0;
    setIdle('녹화 오류');
  };
  recorder.onstop=()=>{
    if(stream)stream.getTracks().forEach(t=>t.stop());
    saveRecording();
    timeEl.textContent='00:00 / 05:00';
    startAt=0;
    setIdle();
    recorder=null;
    stream=null;
  };

  track.addEventListener('ended',()=>{
    if(recorder&&recorder.state==='recording')stopRecording();
  },{once:true});

  recorder.start(1000);
  startAt=performance.now();
  panel.dataset.recording='1';
  button.dataset.recording='1';
  button.textContent='녹화 중지';
  updateTimer();
  timerId=setInterval(updateTimer,250);
}

button.addEventListener('click',()=>{
  if(recorder&&recorder.state==='recording')stopRecording();
  else startRecording();
});

addEventListener('keydown',e=>{
  if((e.key==='r'||e.key==='R')&&recorder&&recorder.state==='recording'){
    e.preventDefault();stopRecording();
  }
});

addEventListener('beforeunload',()=>{
  try{if(recorder&&recorder.state==='recording')recorder.stop();}catch{}
  try{if(stream)stream.getTracks().forEach(t=>t.stop());}catch{}
});
