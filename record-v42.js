const title=document.querySelector('#title');
const credit=document.querySelector('#credit');
if(title) title.textContent='STARLIT SKY · CINEMATIC PASS 42';
if(credit) credit.textContent='Three.js · refined moving lens · 5 minute canvas recorder';

const style=document.createElement('style');
style.textContent=`
#record-v42{position:fixed;top:18px;right:18px;z-index:30;display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid rgba(190,215,255,.16);border-radius:10px;background:rgba(2,7,16,.50);backdrop-filter:blur(10px);font-family:Inter,system-ui,sans-serif;color:#dce8ff;box-shadow:0 8px 28px rgba(0,0,0,.22)}
#record-v42 button{appearance:none;border:1px solid rgba(210,225,255,.22);background:rgba(12,20,34,.76);color:#e8f0ff;border-radius:7px;padding:7px 11px;font:600 11px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;transition:.18s ease}
#record-v42 button:hover{background:rgba(24,35,54,.88)}
#record-v42 button[data-recording="1"]{border-color:rgba(255,105,105,.46);background:rgba(94,18,25,.72)}
#record-v42 .dot{width:7px;height:7px;border-radius:50%;background:#748096;box-shadow:none;transition:.18s ease}
#record-v42[data-recording="1"] .dot{background:#ff5151;box-shadow:0 0 10px rgba(255,70,70,.8);animation:recPulse 1s ease-in-out infinite}
#record-v42 .time{min-width:76px;font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;opacity:.78}
#record-v42 .hint{font-size:9px;letter-spacing:.08em;opacity:.42;white-space:nowrap}
@keyframes recPulse{50%{opacity:.35}}
@media(max-width:640px){#record-v42{top:10px;right:10px;padding:7px 8px}.hint{display:none!important}}
`;
document.head.appendChild(style);

const panel=document.createElement('div');
panel.id='record-v42';
panel.innerHTML=`<span class="dot"></span><button type="button">5분 녹화</button><span class="time">00:00 / 05:00</span><span class="hint">WebM · 30fps</span>`;
document.body.appendChild(panel);

const button=panel.querySelector('button');
const timeEl=panel.querySelector('.time');
const MAX_MS=5*60*1000;
let recorder=null;
let chunks=[];
let startAt=0;
let timerId=0;
let targetCanvas=null;
let activeMime='video/webm';

function format(ms){
  const s=Math.max(0,Math.min(300,Math.floor(ms/1000)));
  const m=Math.floor(s/60);
  return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function chooseMime(){
  const types=[
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for(const type of types){
    if(window.MediaRecorder?.isTypeSupported?.(type)) return type;
  }
  return '';
}

function getFinalCanvas(){
  const canvases=[...document.querySelectorAll('canvas')].filter(c=>c.width>0&&c.height>0);
  return canvases.at(-1)||null;
}

function setIdle(message='5분 녹화'){
  panel.dataset.recording='0';
  button.dataset.recording='0';
  button.textContent=message;
}

function saveRecording(){
  if(!chunks.length) return;
  const blob=new Blob(chunks,{type:activeMime||'video/webm'});
  const url=URL.createObjectURL(blob);
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const a=document.createElement('a');
  a.href=url;
  a.download=`starlit-sky-v42-${stamp}.webm`;
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}

function stopRecording(auto=false){
  if(!recorder||recorder.state==='inactive') return;
  clearInterval(timerId);
  timerId=0;
  if(recorder.state==='recording') recorder.stop();
  setIdle(auto?'저장 중…':'저장 중…');
}

function updateTimer(){
  if(!startAt) return;
  const elapsed=performance.now()-startAt;
  timeEl.textContent=`${format(elapsed)} / 05:00`;
  if(elapsed>=MAX_MS) stopRecording(true);
}

function startRecording(){
  if(!window.MediaRecorder){
    alert('이 브라우저는 MediaRecorder 녹화를 지원하지 않습니다. Chrome 또는 Edge 최신 버전을 사용해 주세요.');
    return;
  }
  targetCanvas=getFinalCanvas();
  if(!targetCanvas||typeof targetCanvas.captureStream!=='function'){
    alert('최종 렌더 캔버스를 찾지 못했거나 canvas.captureStream을 지원하지 않습니다.');
    return;
  }

  const stream=targetCanvas.captureStream(30);
  const mime=chooseMime();
  const options={videoBitsPerSecond:6000000};
  if(mime) options.mimeType=mime;

  try{
    recorder=new MediaRecorder(stream,options);
  }catch(err){
    console.error(err);
    alert('녹화기를 시작하지 못했습니다. 다른 Chromium 기반 브라우저에서 다시 시도해 주세요.');
    return;
  }

  chunks=[];
  activeMime=recorder.mimeType||mime||'video/webm';
  recorder.ondataavailable=e=>{if(e.data&&e.data.size>0) chunks.push(e.data);};
  recorder.onerror=e=>{console.error('MediaRecorder error',e);clearInterval(timerId);setIdle('녹화 오류');};
  recorder.onstop=()=>{
    stream.getTracks().forEach(track=>track.stop());
    saveRecording();
    timeEl.textContent='00:00 / 05:00';
    startAt=0;
    setIdle('5분 녹화');
    recorder=null;
  };

  recorder.start(1000);
  startAt=performance.now();
  panel.dataset.recording='1';
  button.dataset.recording='1';
  button.textContent='녹화 중지';
  updateTimer();
  timerId=setInterval(updateTimer,250);
}

button.addEventListener('click',()=>{
  if(recorder&&recorder.state==='recording') stopRecording(false);
  else startRecording();
});

addEventListener('beforeunload',()=>{
  if(recorder&&recorder.state==='recording'){
    try{recorder.stop();}catch{}
  }
});
