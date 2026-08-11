(()=>{
  const FEED='data/live-news.json';
  const POLL_MS=60000;
  let items=[],updated='',idx=0,tickerTimer=null,pollTimer=null;

  function nested(){
    try{
      const outer=document.getElementById('board');
      const v19=outer?.contentDocument;
      const v18f=v19?.getElementById('shell');
      const v18=v18f?.contentDocument;
      const v17f=v18?.getElementById('shell');
      const v17=v17f?.contentDocument;
      const basef=v17?.getElementById('board');
      return basef?.contentDocument||null;
    }catch(e){return null}
  }

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

  function ensureStyle(d){
    if(d.getElementById('sbrLiveNewsStyle'))return;
    const st=d.createElement('style');
    st.id='sbrLiveNewsStyle';
    st.textContent=`
      .sbrTicker{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;margin:8px 0 0;padding:8px 10px;border:1px solid rgba(255,79,109,.45);border-radius:10px;background:linear-gradient(90deg,rgba(255,79,109,.11),rgba(10,15,21,.94));min-height:38px}
      .sbrTickerBadge{font-size:9px;font-weight:950;letter-spacing:.08em;color:#ff758e;white-space:nowrap}.sbrTickerText{font-size:11px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sbrTickerMeta{font-size:9px;color:var(--mut);white-space:nowrap}.sbrTicker a{font-size:9px;font-weight:900;color:var(--cyan);text-decoration:none;white-space:nowrap}
      .sbrLiveGrid{display:grid;gap:7px}.sbrLiveItem{border:1px solid #26313d;border-radius:9px;background:#0a0f15;padding:9px 10px}.sbrLiveItem b{display:block;font-size:12px;line-height:1.35;margin-bottom:5px}.sbrLiveItem .meta{font-size:9px;color:var(--mut)}.sbrLiveItem .row{margin-top:6px}.sbrLiveFresh{color:#ff758e;font-weight:950}
      @media(max-width:620px){.sbrTicker{grid-template-columns:auto 1fr auto}.sbrTickerMeta{display:none}.sbrTickerText{font-size:10px}.sbrTicker a{font-size:8px}}
    `;
    d.head.appendChild(st);
  }

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
    el.innerHTML='<span class="sbrTickerBadge">● LIVE NEWS</span><span id="sbrTickerText" class="sbrTickerText">Loading live headlines…</span><span id="sbrTickerMeta" class="sbrTickerMeta"></span><a id="sbrTickerOpen" href="#" target="_blank" rel="noopener">OPEN ↗</a>';
    body.prepend(el);
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
    injectTicker(d);injectNewsPanel(d);
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
        return `<div class="sbrLiveItem"><b>${fresh?'<span class="sbrLiveFresh">NEW · </span>':''}${esc(x.headline)}</b><div class="meta">${esc(x.source||'News')} · ${esc(age(x.published))}</div><div class="row"><a class="mini" href="${safeUrl(x.url)}" target="_blank" rel="noopener">OPEN STORY ↗</a></div></div>`
      }).join('')||'<div class="story"><b>Waiting for first live refresh</b><p>The morning producer board remains available while the breaking-news collector starts.</p></div>';
    }
  }

  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

  async function loadFeed(){
    try{
      const r=await fetch(FEED+'?v='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('feed '+r.status);
      const data=await r.json();
      items=Array.isArray(data.items)?data.items:[];
      updated=data.updated||'';idx=0;render();
    }catch(e){render()}
  }

  function boot(){
    const wait=setInterval(()=>{const d=nested();if(!d||!d.getElementById('control'))return;clearInterval(wait);injectTicker(d);injectNewsPanel(d);loadFeed();tickerTimer=setInterval(()=>{if(items.length){idx=(idx+1)%items.length;render()}},9000);pollTimer=setInterval(loadFeed,POLL_MS)},150);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
