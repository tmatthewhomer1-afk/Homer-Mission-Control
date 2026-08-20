(()=>{
const TASK_KEY='mattCommandCenterV35';

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function loadTasks(){try{const t=JSON.parse(localStorage.getItem(TASK_KEY)||'[]');return Array.isArray(t)?t:[]}catch(e){return []}}
function dueScore(t){if(!t?.due)return 9999999999999;const ms=new Date(t.due+'T23:59:59').getTime();return Number.isFinite(ms)?ms:9999999999999}
function topTasks(){
 const rank={now:0,next:1,waiting:2,later:3,done:9};
 return loadTasks().filter(t=>t.status!=='done').sort((a,b)=>(rank[a.status]??5)-(rank[b.status]??5)||dueScore(a)-dueScore(b)||(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0)).slice(0,3);
}
function buildToday(){
 if(document.getElementById('todayCommandShell'))return;
 const anchor=document.querySelector('.summary-grid');if(!anchor)return;
 const section=document.createElement('section');
 section.id='todayCommandShell';section.className='card';
 section.innerHTML=`
  <div class="section-head"><div><h2>Today</h2><p>One glance: what matters, what's next, and what to know.</p></div><span class="badge now">V4.0</span></div>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px" id="todayGrid">
   <div class="live-card"><h3>Top 3</h3><div id="todayTasks"></div></div>
   <div class="live-card"><h3>Next Up</h3><div id="todayNextUp" class="task-note">Calendar not connected yet.</div></div>
   <div class="live-card"><h3>Weather</h3><div id="todayWeather" class="task-note">Weather not loaded yet.</div></div>
   <div class="live-card"><h3>Briefing</h3><div id="todayBriefing" class="task-note">Headlines loading…</div></div>
  </div>`;
 anchor.insertAdjacentElement('afterend',section);
 const style=document.createElement('style');
 style.textContent='@media(max-width:900px){#todayGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:620px){#todayGrid{grid-template-columns:1fr!important}}';
 document.head.appendChild(style);
}
function renderTasks(){
 const box=document.getElementById('todayTasks');if(!box)return;
 const items=topTasks();
 box.innerHTML=items.length?items.map(t=>`<div class="brief-item"><strong>${esc(t.title||'Untitled')}</strong><span class="brief-meta">${esc(String(t.status||'next').toUpperCase())}${t.due?` · Due ${esc(t.due)}`:''}</span></div>`).join(''):'<div class="task-note">No active tasks yet.</div>';
}
function syncCalendar(){
 const out=document.getElementById('todayNextUp');if(!out)return;
 const source=document.getElementById('googleCalNext');
 if(source&&source.textContent.trim()&&source.textContent.trim()!=='No Calendar events loaded yet.'&&source.textContent.trim()!=='No upcoming events loaded.')out.innerHTML=source.innerHTML;
 else out.textContent='Calendar not connected yet.';
}
function syncWeather(){
 const out=document.getElementById('todayWeather');if(!out)return;
 const source=document.getElementById('weatherBox');
 if(!source){out.textContent='Weather not loaded yet.';return}
 const temp=source.querySelector('.weather-temp')?.textContent?.trim();
 const detail=source.querySelector('.weather-detail')?.textContent?.trim();
 if(temp){out.innerHTML=`<strong style="font-size:1.4rem;color:var(--navy)">${esc(temp)}</strong>${detail?`<div class="brief-meta">${esc(detail)}</div>`:''}`}
 else out.textContent='Weather not loaded yet.';
}
function syncHeadlines(){
 const out=document.getElementById('todayBriefing');if(!out)return;
 const titles=[...document.querySelectorAll('#headlineList .headline-title')].slice(0,3).map(n=>n.textContent.trim()).filter(Boolean);
 out.innerHTML=titles.length?titles.map(t=>`<div class="brief-item">${esc(t)}</div>`).join(''):'<div class="task-note">Headlines loading…</div>';
}
function refresh(){renderTasks();syncCalendar();syncWeather();syncHeadlines()}
function init(){
 buildToday();refresh();
 const observer=new MutationObserver(()=>refresh());
 ['googleCalNext','weatherBox','headlineList'].forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true})});
 window.addEventListener('storage',refresh);
 setInterval(refresh,30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
