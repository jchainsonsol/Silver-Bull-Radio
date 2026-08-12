(()=>{
  const FEED='data/live-news.json';
  const POLL_MS=60000;
  const BED_ENABLED_KEY='sbrBedEnabled';
  const COMMERCIALS_URL='data/commercials.json';
  let items=[],updated='',idx=0,tickerTimer=null,pollTimer=null,commercials=[];
  let resetRunning=false;

  function chain(){
    try{
      const outer=document.getElementById('board');
      const v19=outer?.contentDocument;
      const v18f=v19?.getElementById('shell');
      const v18=v18f?.contentDocument;
      const v17f=v18?.getElementById('shell');
      const v17=v17f?.contentDocument;
      const basef=v17?.getElementById('board');
      return{
        v19,v18,v17,
        base:basef?.contentDocument||null,
        basew:basef?.contentWindow||null
      };
    }catch(e){return{}}
  }
  function nested(){return chain().base||null}

  function age(iso){
    if(!iso)return'';
    const ms=Date.now()-new Date(iso).getTime();
    if(!Number.isFinite(ms))return'';
    const m=Math.max(0,Math.round(ms/60000));
    if(m<1)return'just now';
    if(m<60)return m+'m ago';
    const h=Math.round(m/60);
    if(h<24)return h+'h ago';
    return Math.round(h/24)+'d ago';
  }

  function safeUrl(url){
    try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.href:'#'}catch(e){return'#'}
  }
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

  function xIntent(text){
    window.open('https://x.com/intent/post?text='+encodeURIComponent(text),'_blank','noopener');
  }
  function tweetAlert(item){
    if(!item)return;
    const source=item.source||'News';
    let text=`BREAKING / LIVE NEWS on Silver Bull Radio W3BC:\n\n${item.headline}\n\nSource: ${source}`;
    if(item.url)text+='\n'+item.url;
    xIntent(text);
  }

  function ensureStyle(d){
    if(d.getElementById('sbrLiveNewsStyle'))return;
    const st=d.createElement('style');
    st.id='sbrLiveNewsStyle';
    st.textContent=`
      .sbrTicker{display:grid;grid-template-columns:auto 1fr auto auto auto;gap:8px;align-items:center;margin:8px 0 0;padding:8px 10px;border:1px solid rgba(255,79,109,.45);border-radius:10px;background:linear-gradient(90deg,rgba(255,79,109,.11),rgba(10,15,21,.94));min-height:38px}
      .sbrTickerBadge{font-size:9px;font-weight:950;letter-spacing:.08em;color:#ff758e;white-space:nowrap}.sbrTickerText{font-size:11px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sbrTickerMeta{font-size:9px;color:var(--mut);white-space:nowrap}.sbrTicker a,.sbrTicker button{font-size:9px;font-weight:900;white-space:nowrap}
      .sbrLiveGrid{display:grid;gap:7px}.sbrLiveItem{border:1px solid #26313d;border-radius:9px;background:#0a0f15;padding:9px 10px}.sbrLiveItem b{display:block;font-size:12px;line-height:1.35;margin-bottom:5px}.sbrLiveItem .meta{font-size:9px;color:var(--mut)}.sbrLiveItem .row{margin-top:6px}.sbrLiveFresh{color:#ff758e;font-weight:950}
      .sbrOps{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.sbrOpsBox{border:1px solid #26313d;border-radius:10px;background:#0a0f15;padding:9px}.sbrOpsBox h3{font-size:10px;letter-spacing:.08em;margin:0 0 7px;color:var(--cyan)}.sbrCommercialGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.sbrCommercialBtn{min-height:48px}.sbrReset{width:100%;min-height:54px;font-size:13px!important;border-color:var(--yellow)!important;color:var(--yellow)!important}.sbrBedToggle.on{border-color:var(--green)!important;color:var(--green)!important}.sbrBedToggle.off{border-color:var(--red)!important;color:#ff9da7!important}
      @media(max-width:800px){.sbrOps{grid-template-columns:1fr}.sbrCommercialGrid{grid-template-columns:1fr 1fr}}
      @media(max-width:620px){.sbrTicker{grid-template-columns:auto 1fr auto}.sbrTickerMeta,.sbrTickerOpen{display:none}.sbrTickerText{font-size:10px}.sbrTicker button{font-size:8px}}
    `;
    d.head.appendChild(st);
  }

  function bedEnabled(){return localStorage.getItem(BED_ENABLED_KEY)!=='0'}
  function allBedAudios(){
    const {v19,v18,v17,base}=chain();
    const roots=[v19,v18,v17,base].filter(Boolean),out=[];
    roots.forEach(root=>[...root.querySelectorAll('audio')].forEach(a=>{
      const id=(a.id||'').toLowerCase();
      const src=(a.currentSrc||a.getAttribute('src')||'').toLowerCase();
      if(id.includes('bed')||src.includes('/beds/')||src.includes('sunset-gate'))out.push(a);
    }));
    return out;
  }
  function applyBedSwitch(){
    const on=bedEnabled();
    allBedAudios().forEach(a=>{a.muted=!on});
    const d=nested(),b=d?.getElementById('sbrBedToggle');
    if(b){b.textContent=on?'BED: ON':'BED: OFF';b.classList.toggle('on',on);b.classList.toggle('off',!on)}
  }
  function toggleBed(){localStorage.setItem(BED_ENABLED_KEY,bedEnabled()?'0':'1');applyBedSwitch()}

  function injectTicker(d){
    ensureStyle(d);
    if(d.getElementById('sbrLiveTicker'))return;
    const control=d.getElementById('control');
    if(!control)return;
    const first=control.querySelector('.panel');
    const body=first?.querySelector('.body');
    if(!body)return;
    const el=d.createElement('div');
    el.id='sbrLiveTicker';el.className='sbrTicker';
    el.innerHTML='<span class="sbrTickerBadge">● LIVE NEWS</span><span id="sbrTickerText" class="sbrTickerText">Loading live headlines…</span><span id="sbrTickerMeta" class="sbrTickerMeta"></span><button id="sbrTickerTweet" class="mini cyan">TWEET</button><a id="sbrTickerOpen" class="sbrTickerOpen" href="#" target="_blank" rel="noopener">OPEN ↗</a>';
    body.prepend(el);
    d.getElementById('sbrTickerTweet').onclick=()=>tweetAlert(items[idx%Math.max(items.length,1)]);
  }

  function currentCommercial(d){
    const h=Number(d?.getElementById('briefHour')?.value||new Date().getHours());
    return commercials.find(c=>Number(c.hour)===h)||commercials[0]||null;
  }

  function setStatus(d,text){const s=d?.getElementById('sbrResetStatus');if(s)s.textContent=text}

  function commercialAudio(){
    let a=document.getElementById('sbrCommercialAudio');
    if(!a){a=document.createElement('audio');a.id='sbrCommercialAudio';a.preload='auto';document.body.appendChild(a)}
    return a;
  }

  function stopReset(){
    resetRunning=false;
    const a=commercialAudio();a.pause();try{a.currentTime=0}catch(e){}
    setStatus(nested(),'Room reset stopped.');
  }

  function playCommercial(c,done){
    const d=nested();
    if(!c){setStatus(d,'No commercial assigned — skipping to song.');return done&&done()}
    const a=commercialAudio();
    a.pause();a.src=c.audio+'?v='+Date.now();a.currentTime=0;
    a.onended=()=>done&&done();
    a.onerror=()=>{setStatus(d,`${c.slot} commercial audio missing — skipped.`);done&&done()};
    setStatus(d,`COMMERCIAL · ${c.slot} · ${c.title}`);
    a.play().catch(()=>{setStatus(d,`${c.slot} commercial could not start — skipped.`);done&&done()});
  }

  function playOneSong(done){
    const {base,basew}=chain();const d=nested();
    if(!base||!basew||typeof basew.choose!=='function'){setStatus(d,'Music engine unavailable — skipping song.');return done&&done()}
    try{
      if(typeof basew.stopMusic==='function')basew.stopMusic();
      const track=basew.choose();
      if(!track){setStatus(d,'No song available — skipping.');return done&&done()}
      const a=base.getElementById('deckA');
      const b=base.getElementById('deckB');
      const deck=(a&&a.paused)?a:(b&&b.paused)?b:a;
      [a,b].filter(Boolean).forEach(x=>{x.pause();try{x.currentTime=0}catch(e){}});
      deck.src=track.file;deck.volume=1;
      setStatus(d,`SONG · ${track.title}`);
      deck.onended=()=>done&&done();
      deck.play().catch(()=>{setStatus(d,'Song playback blocked — skipping to ID.');done&&done()});
      const musicNow=base.getElementById('musicNow');if(musicNow)musicNow.textContent=track.title;
    }catch(e){setStatus(d,'Song error — skipping to ID.');done&&done()}
  }

  function playStationId(done){
    const {basew}=chain();const d=nested();
    if(basew&&typeof basew.playFx==='function'){
      setStatus(d,'STATION ID · Reset handoff');
      basew.playFx('audio/station-id-1.mp3','Station ID 1',()=>{setStatus(d,'ROOM RESET COMPLETE · Take the mic.');resetRunning=false;done&&done()});
    }else{setStatus(d,'ROOM RESET COMPLETE · Station ID unavailable.');resetRunning=false;done&&done()}
  }

  function roomReset(){
    if(resetRunning)return;
    const d=nested();resetRunning=true;
    const c=currentCommercial(d);
    setStatus(d,'ROOM RESET STARTING · commercial → song → station ID');
    playCommercial(c,()=>{if(!resetRunning)return;playOneSong(()=>{if(!resetRunning)return;playStationId()})});
  }

  function injectOperations(d){
    ensureStyle(d);
    if(d.getElementById('sbrV20Ops'))return;
    const control=d.getElementById('control'),first=control?.querySelector('.panel'),body=first?.querySelector('.body');
    if(!body)return;
    const wrap=d.createElement('div');wrap.id='sbrV20Ops';wrap.className='sbrOps';
    wrap.innerHTML=`
      <div class="sbrOpsBox"><h3>LIVE AUDIO</h3><div class="row"><button id="sbrBedToggle" class="mini sbrBedToggle">BED: ON</button><span class="small">Instant bed kill / restore</span></div></div>
      <div class="sbrOpsBox"><h3>TOTAL ROOM RESET</h3><button id="sbrRoomReset" class="btn sbrReset">ROOM RESET<span style="display:block;font-size:8px;margin-top:3px;color:var(--mut)">Commercial → 1 song → station ID → mic</span></button><div id="sbrResetStatus" class="small" style="margin-top:6px">Ready.</div></div>
      <div class="sbrOpsBox" style="grid-column:1/-1"><h3>HOURLY COMMERCIALS</h3><div id="sbrCommercialGrid" class="sbrCommercialGrid"></div></div>`;
    body.appendChild(wrap);
    d.getElementById('sbrBedToggle').onclick=toggleBed;
    d.getElementById('sbrRoomReset').onclick=roomReset;
    renderCommercialButtons(d);
    applyBedSwitch();
  }

  function renderCommercialButtons(d){
    const root=d?.getElementById('sbrCommercialGrid');if(!root)return;
    root.innerHTML=commercials.map((c,i)=>`<button class="mini sbrCommercialBtn" data-commercial="${i}"><b>${esc(c.slot)}</b><span style="display:block;font-size:8px;margin-top:3px;color:var(--mut)">${esc(c.title)}</span></button>`).join('')||'<span class="small">Commercial slots loading…</span>';
    root.querySelectorAll('[data-commercial]').forEach(b=>b.onclick=()=>playCommercial(commercials[+b.dataset.commercial],()=>setStatus(d,'Commercial complete.')));
  }

  function injectNewsPanel(d){
    ensureStyle(d);
    const sec=d.getElementById('news');
    if(!sec||d.getElementById('sbrLiveNewsPanel'))return;
    const p=d.createElement('div');p.id='sbrLiveNewsPanel';p.className='panel';
    p.innerHTML='<div class="head"><h2>LIVE / BREAKING NEWS</h2><span id="sbrLiveUpdated" class="mut">refreshing…</span></div><div class="body"><div class="row" style="margin-bottom:8px"><button id="sbrLiveRefresh" class="mini cyan">REFRESH NOW</button><span class="small">Background collector checks every 5 min</span></div><div id="sbrLiveNewsList" class="sbrLiveGrid"></div></div>';
    sec.prepend(p);
    d.getElementById('sbrLiveRefresh').onclick=loadFeed;
  }

  function render(){
    const d=nested();if(!d)return;
    injectTicker(d);injectNewsPanel(d);injectOperations(d);applyBedSwitch();
    const current=items[idx%Math.max(items.length,1)];
    const text=d.getElementById('sbrTickerText'),meta=d.getElementById('sbrTickerMeta'),open=d.getElementById('sbrTickerOpen');
    if(current){
      if(text)text.textContent=current.headline;
      if(meta)meta.textContent=(current.source||'News')+' · '+age(current.published);
      if(open)open.href=safeUrl(current.url);
    }else{
      if(text)text.textContent='Live feed warming up — morning producer board is still available.';
      if(meta)meta.textContent='';if(open)open.href='#';
    }
    const up=d.getElementById('sbrLiveUpdated');
    if(up)up.textContent=updated?'feed updated '+age(updated):'waiting for first feed';
    const list=d.getElementById('sbrLiveNewsList');
    if(list){
      const now=Date.now();
      list.innerHTML=items.slice(0,20).map((x,i)=>{
        const fresh=x.published&&(now-new Date(x.published).getTime())<30*60000;
        return `<div class="sbrLiveItem"><b>${fresh?'<span class="sbrLiveFresh">NEW · </span>':''}${esc(x.headline)}</b><div class="meta">${esc(x.source||'News')} · ${esc(age(x.published))}</div><div class="row"><button class="mini cyan" data-tweet-live="${i}">TWEET ALERT</button><a class="mini" href="${safeUrl(x.url)}" target="_blank" rel="noopener">OPEN STORY ↗</a></div></div>`
      }).join('')||'<div class="story"><b>Waiting for first live refresh</b><p>The morning producer board remains available while the breaking-news collector starts.</p></div>';
      list.querySelectorAll('[data-tweet-live]').forEach(b=>b.onclick=()=>tweetAlert(items[+b.dataset.tweetLive]));
    }
    renderCommercialButtons(d);
  }

  async function loadFeed(){
    try{
      const r=await fetch(FEED+'?v='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('feed '+r.status);
      const data=await r.json();
      items=Array.isArray(data.items)?data.items:[];
      updated=data.updated||'';idx=0;render();
    }catch(e){render()}
  }

  async function loadCommercials(){
    try{const r=await fetch(COMMERCIALS_URL+'?v='+Date.now(),{cache:'no-store'});if(r.ok){const data=await r.json();commercials=Array.isArray(data.commercials)?data.commercials:[]}}catch(e){}
    render();
  }

  function boot(){
    const wait=setInterval(()=>{
      const d=nested();if(!d||!d.getElementById('control'))return;
      clearInterval(wait);
      injectTicker(d);injectNewsPanel(d);injectOperations(d);
      loadFeed();loadCommercials();applyBedSwitch();
      tickerTimer=setInterval(()=>{if(items.length){idx=(idx+1)%items.length;render()}},9000);
      pollTimer=setInterval(loadFeed,POLL_MS);
      setInterval(applyBedSwitch,500);
    },150);
  }

  window.addEventListener('beforeunload',stopReset);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
