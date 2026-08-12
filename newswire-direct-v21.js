(()=>{
  const NEWSWIRE='audio/newswire-today.MP3';
  const HANDOFF='audio/station-id-2.mp3';
  let running=false;
  let phase='idle';
  let timer=null;

  function chain(){
    try{
      const outer=document.getElementById('board');
      const v19=outer?.contentDocument;
      const v18f=v19?.getElementById('shell');
      const v18=v18f?.contentDocument;
      const v17f=v18?.getElementById('shell');
      const v17=v17f?.contentDocument;
      const v17w=v17f?.contentWindow;
      const basef=v17?.getElementById('board');
      return{v17w,base:basef?.contentDocument||null};
    }catch(e){return{}}
  }

  function d(){return chain().base||null}

  function audio(){
    let a=document.getElementById('sbrNewswireDirectV21');
    if(!a){
      a=document.createElement('audio');
      a.id='sbrNewswireDirectV21';
      a.preload='auto';
      a.playsInline=true;
      document.body.appendChild(a);
    }
    return a;
  }

  function fmt(sec){
    if(!Number.isFinite(sec)||sec<0)return'--:--';
    sec=Math.max(0,Math.ceil(sec));
    return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  }

  function set(id,val){const e=d()?.getElementById(id);if(e)e.textContent=val}
  function meter(pct){const e=d()?.getElementById('playerMeter');if(e)e.style.width=Math.max(0,Math.min(100,pct||0))+'%'}

  function ui(title,sub,left='--:--',kind='NEWSWIRE'){
    set('nowTitle',title);set('nowSub',sub);set('nowLeft',left);set('nowKind',kind);
    set('playerTitle',title);set('playerDetail',sub);
  }

  function updateClock(){
    if(!running)return;
    const a=audio();
    if(!Number.isFinite(a.duration)||a.duration<=0)return;
    const left=Math.max(0,a.duration-a.currentTime);
    ui(phase==='newswire'?'Silver Bull Newswire':'Station ID 2',phase==='newswire'?'ON AIR · finished mixed Newswire':'Newswire complete · station handoff',fmt(left),phase==='newswire'?'NEWSWIRE':'STATION ID');
    meter(100*(a.currentTime/a.duration));
  }

  function stopClock(){if(timer){clearInterval(timer);timer=null}}
  function startClock(){stopClock();timer=setInterval(updateClock,100)}

  function finish(){
    running=false;phase='idle';stopClock();meter(0);
    set('nowLeft','--:--');
    ui('JChains','Newswire complete · take the room live','--:--','MIC');
  }

  function playPhase(file,next){
    const a=audio();
    a.onended=null;a.onerror=null;a.ontimeupdate=null;a.onloadedmetadata=null;
    a.pause();try{a.currentTime=0}catch(e){}
    a.src=file+'?v='+Date.now();a.load();
    a.ontimeupdate=updateClock;a.onloadedmetadata=updateClock;
    a.onended=next;
    a.onerror=()=>{if(next)next();else finish()};
    const p=a.play();
    if(p&&typeof p.catch==='function')p.catch(err=>{
      running=false;phase='idle';stopClock();
      ui('NEWSWIRE ERROR','Playback blocked: '+err.message,'--:--','ERROR');
    });
  }

  function playNewswire(){
    if(running)return;
    const {v17w}=chain();
    try{if(v17w&&typeof v17w.stopNewswire==='function')v17w.stopNewswire()}catch(e){}
    running=true;phase='newswire';startClock();
    ui('Silver Bull Newswire','Starting finished mixed Newswire…','--:--','NEWSWIRE');
    playPhase(NEWSWIRE,()=>{
      if(!running)return;
      phase='id';
      ui('Station ID 2','Newswire complete · station handoff','--:--','STATION ID');
      playPhase(HANDOFF,finish);
    });
  }

  function patch(){
    const btn=d()?.getElementById('newswireMain');
    if(!btn)return false;
    btn.onclick=playNewswire;
    btn.dataset.directNewswire='1';
    const span=btn.querySelector('span');
    if(span)span.textContent='Finished mix → station ID';
    return true;
  }

  function boot(){
    const t=setInterval(()=>{if(patch())clearInterval(t)},200);
    setInterval(patch,2000);
  }

  window.addEventListener('beforeunload',()=>{try{audio().pause()}catch(e){}stopClock()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
