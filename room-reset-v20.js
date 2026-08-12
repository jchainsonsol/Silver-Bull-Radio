(()=>{
  const COMMERCIALS_URL='data/commercials.json';
  const MUSIC_URL='data/music.json';
  const ID_KEY='sbrResetNextId';
  let commercials=[];
  let music=[];
  let running=false;
  let queue=[];
  let queueIndex=0;
  let restoreBeds=[];
  let clockTimer=null;

  function chain(){
    try{
      const outer=document.getElementById('board');
      const v19=outer?.contentDocument;
      const v19w=outer?.contentWindow;
      const v18f=v19?.getElementById('shell');
      const v18=v18f?.contentDocument;
      const v18w=v18f?.contentWindow;
      const v17f=v18?.getElementById('shell');
      const v17=v17f?.contentDocument;
      const v17w=v17f?.contentWindow;
      const basef=v17?.getElementById('board');
      return{
        v19,v19w,v18,v18w,v17,v17w,
        base:basef?.contentDocument||null,
        basew:basef?.contentWindow||null
      };
    }catch(e){return{}}
  }

  function d(){return chain().base||null}

  function player(){
    let a=document.getElementById('sbrRoomResetPlayerV20');
    if(!a){
      a=document.createElement('audio');
      a.id='sbrRoomResetPlayerV20';
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

  function status(text){
    const doc=d();
    const s=doc?.getElementById('sbrResetStatus');
    if(s)s.textContent=text;
  }

  function now(title,sub,kind='RESET'){
    const doc=d();
    if(!doc)return;
    const vals={nowTitle:title,nowSub:sub,nowKind:kind,playerTitle:title,playerDetail:sub};
    Object.entries(vals).forEach(([id,val])=>{const e=doc.getElementById(id);if(e)e.textContent=val});
  }

  function setText(id,value){
    const e=d()?.getElementById(id);
    if(e)e.textContent=value;
  }

  function setMeter(pct){
    const e=d()?.getElementById('playerMeter');
    if(e)e.style.width=Math.max(0,Math.min(100,pct||0))+'%';
  }

  function resetPlaybackDisplay(){
    setText('songLeft','--:--');
    setText('nowLeft','--:--');
    setMeter(0);
  }

  function updateResetClock(){
    if(!running)return;
    const item=queue[queueIndex];
    const a=player();
    if(!item||!Number.isFinite(a.duration)||a.duration<=0)return;
    const left=Math.max(0,a.duration-a.currentTime);
    const pct=a.duration?100*(a.currentTime/a.duration):0;
    setText('nowLeft',fmt(left));
    setMeter(pct);
    if(item.type==='song'){
      setText('songLeft',fmt(left));
    }else{
      setText('songLeft','--:--');
    }
  }

  function startClock(){
    stopClock();
    clockTimer=setInterval(updateResetClock,75);
  }

  function stopClock(){
    if(clockTimer){clearInterval(clockTimer);clockTimer=null}
  }

  function allDocuments(){
    const docs=[];
    const seen=new Set();
    function walk(doc){
      if(!doc||seen.has(doc))return;
      seen.add(doc);docs.push(doc);
      [...doc.querySelectorAll('iframe')].forEach(f=>{
        try{if(f.contentDocument)walk(f.contentDocument)}catch(e){}
      });
    }
    walk(document);
    return docs;
  }

  function allBeds(){
    const out=[];
    allDocuments().forEach(doc=>[...doc.querySelectorAll('audio')].forEach(a=>{
      const id=(a.id||'').toLowerCase();
      const src=(a.currentSrc||a.getAttribute('src')||'').toLowerCase();
      if(id.includes('bed')||src.includes('/beds/')||src.includes('sunset-gate'))out.push(a);
    }));
    return out;
  }

  function muteBedsForReset(){
    restoreBeds=allBeds().map(a=>({a,muted:a.muted}));
    restoreBeds.forEach(x=>x.a.muted=true);
  }

  function restoreBedState(){
    restoreBeds.forEach(x=>{try{x.a.muted=x.muted}catch(e){}});
    restoreBeds=[];
  }

  function stopOtherAudio(){
    const {base}=chain();
    if(!base)return;
    ['deckA','deckB','fx'].forEach(id=>{
      const a=base.getElementById(id);
      if(a){a.pause();try{a.currentTime=0}catch(e){}}
    });
  }

  function currentCommercial(){
    const doc=d();
    const h=Number(doc?.getElementById('briefHour')?.value||9);
    return commercials.find(c=>Number(c.hour)===h)||commercials[0]||null;
  }

  function randomSong(){
    if(!music.length)return null;
    return music[Math.floor(Math.random()*music.length)];
  }

  function nextStationId(){
    const n=localStorage.getItem(ID_KEY)==='2'?2:1;
    localStorage.setItem(ID_KEY,n===1?'2':'1');
    return n;
  }

  function labelFor(item){
    if(item.type==='commercial')return `COMMERCIAL · ${item.title}`;
    if(item.type==='song')return `SONG · ${item.title}`;
    return `STATION ID ${item.id}`;
  }

  function subFor(item){
    if(item.type==='commercial')return 'Room reset · sponsor break';
    if(item.type==='song')return 'Room reset · one-song music break';
    return 'Room reset · station handoff';
  }

  function armResetButton(){
    const btn=d()?.getElementById('sbrRoomReset');
    if(btn)btn.disabled=false;
  }

  function finish(ok=true){
    running=false;
    queue=[];
    queueIndex=0;
    stopClock();
    restoreBedState();
    const a=player();
    a.onended=null;a.onerror=null;a.ontimeupdate=null;a.onloadedmetadata=null;a.ondurationchange=null;
    resetPlaybackDisplay();
    status(ok?'ROOM RESET COMPLETE · TAKE THE MIC':'ROOM RESET STOPPED');
    now(ok?'JChains':'Manual Control',ok?'Room reset complete · take the room live':'Room reset stopped',ok?'MIC':'RESET');
    armResetButton();
  }

  function playQueueItem(){
    if(!running)return;
    if(queueIndex>=queue.length)return finish(true);
    const item=queue[queueIndex];
    const a=player();
    a.onended=null;a.onerror=null;a.ontimeupdate=null;a.onloadedmetadata=null;a.ondurationchange=null;
    a.pause();
    try{a.currentTime=0}catch(e){}
    a.src=item.file+'?v=reset-'+Date.now();
    a.load();
    status(labelFor(item));
    now(labelFor(item),subFor(item),item.type.toUpperCase());
    setText('songLeft',item.type==='song'?'loading…':'--:--');
    setText('nowLeft','--:--');
    setMeter(0);
    a.ontimeupdate=updateResetClock;
    a.onloadedmetadata=updateResetClock;
    a.ondurationchange=updateResetClock;
    a.onended=()=>{
      queueIndex++;
      playQueueItem();
    };
    a.onerror=()=>{
      status(`${labelFor(item)} · ERROR · SKIPPING`);
      queueIndex++;
      setTimeout(playQueueItem,100);
    };
    const p=a.play();
    if(p&&typeof p.catch==='function')p.catch(err=>{
      status(`${labelFor(item)} · PLAYBACK BLOCKED · TAP ROOM RESET AGAIN`);
      running=false;
      stopClock();
      restoreBedState();
      armResetButton();
      console.warn('Room reset playback blocked',err);
    });
  }

  function roomReset(){
    if(running)return;
    const c=currentCommercial();
    const song=randomSong();
    const id=nextStationId();
    if(!c){status('ROOM RESET ERROR · NO COMMERCIAL LOADED');return}
    if(!song){status('ROOM RESET ERROR · MUSIC LIBRARY NOT LOADED');return}

    running=true;
    stopOtherAudio();
    muteBedsForReset();
    queue=[
      {type:'commercial',title:c.title,file:c.audio},
      {type:'song',title:song.title,file:song.file},
      {type:'id',id,title:`Station ID ${id}`,file:`audio/station-id-${id}.mp3`}
    ];
    queueIndex=0;
    const btn=d()?.getElementById('sbrRoomReset');
    if(btn)btn.disabled=true;
    status(`ROOM RESET · ${c.title} → ${song.title} → ID ${id}`);
    startClock();
    playQueueItem();
  }

  function pauseEveryAudio(){
    allDocuments().forEach(doc=>[...doc.querySelectorAll('audio')].forEach(a=>{
      try{a.pause()}catch(e){}
      try{a.currentTime=0}catch(e){}
    }));
  }

  function emergencyStop(){
    running=false;
    queue=[];
    queueIndex=0;
    stopClock();

    const {v19w,v17w,basew}=chain();
    try{if(v19w&&typeof v19w.stopOpen==='function')v19w.stopOpen()}catch(e){}
    try{if(v17w&&typeof v17w.stopNewswire==='function')v17w.stopNewswire()}catch(e){}
    try{if(basew&&typeof basew.stopMusic==='function')basew.stopMusic()}catch(e){}

    const a=player();
    a.onended=null;a.onerror=null;a.ontimeupdate=null;a.onloadedmetadata=null;a.ondurationchange=null;
    pauseEveryAudio();
    restoreBedState();
    resetPlaybackDisplay();
    armResetButton();
    status('STOP ALL · ALL AUDIO SILENCED');
    now('Stopped','All audio stopped','STOPPED');
    setText('segState','stopped');
  }

  async function loadData(){
    try{
      const [cr,mr]=await Promise.all([
        fetch(COMMERCIALS_URL+'?v='+Date.now(),{cache:'no-store'}),
        fetch(MUSIC_URL+'?v='+Date.now(),{cache:'no-store'})
      ]);
      if(cr.ok){const x=await cr.json();commercials=Array.isArray(x.commercials)?x.commercials:[]}
      if(mr.ok){const x=await mr.json();music=Array.isArray(x.items)?x.items:[]}
    }catch(e){console.warn('Room reset data load failed',e)}
  }

  function patchRoomReset(){
    const doc=d();
    const btn=doc?.getElementById('sbrRoomReset');
    if(!btn)return false;
    if(btn.dataset.v20Queue!=='1'){
      btn.dataset.v20Queue='1';
      btn.onclick=roomReset;
      const hint=btn.querySelector('span');
      if(hint)hint.textContent='Commercial → 1 full song → station ID → mic';
      status('Ready · queued reset player armed.');
    }
    return true;
  }

  function patchStopAll(){
    const doc=d();
    const btn=doc?.getElementById('stopAll');
    if(!btn)return false;
    if(btn.dataset.v20GlobalStop==='1')return true;
    const original=btn.onclick;
    btn.dataset.v20GlobalStop='1';
    btn.onclick=e=>{
      try{if(typeof original==='function')original.call(btn,e)}catch(err){console.warn('Original STOP ALL failed',err)}
      emergencyStop();
    };
    btn.textContent='STOP ALL';
    btn.title='Immediately stop every Silver Bull Radio audio source';
    return true;
  }

  function patch(){
    const a=patchRoomReset();
    const b=patchStopAll();
    return a&&b;
  }

  function boot(){
    loadData();
    const t=setInterval(()=>{
      if(patch())clearInterval(t);
    },200);
    setInterval(patch,2000);
  }

  window.addEventListener('beforeunload',()=>{
    try{player().pause()}catch(e){}
    stopClock();
    restoreBedState();
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
