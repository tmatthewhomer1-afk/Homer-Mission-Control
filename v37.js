(()=>{
const WEATHER_KEY='homerWeatherCoordsV37';
const SAVED_KEY='homerSavedHeadlinesV37';
const HIDDEN_KEY='homerHiddenHeadlinesV37';
let headlineData={updatedAt:null,categories:{}};
let activeHeadlineCategory='Top';
let saved=new Set(JSON.parse(localStorage.getItem(SAVED_KEY)||'[]'));
let hidden=new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)||'[]'));

function esc37(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function installLiveBriefing(){
 if(document.getElementById('liveBriefingShell')) return;
 const weekly=document.getElementById('weeklyPlanShell')||document.querySelector('.summary-grid');
 if(!weekly)return;
 const section=document.createElement('section');
 section.id='liveBriefingShell';section.className='card live-briefing-shell';
 section.innerHTML=`<div class="section-head"><div><h2>Live Briefing</h2><p>Weather, calendar readiness, and a daily headline queue.</p></div><span class="badge next">V3.7</span></div>
 <div class="live-briefing-grid">
  <div class="live-card"><h3>Weather</h3><div class="live-muted">Uses your browser location only after permission.</div><div id="weatherBox"><div class="empty">Weather not loaded yet.</div></div><div class="live-tools"><button id="weatherLocate" class="btn small blue" type="button">Use My Location</button><button id="weatherRefresh" class="btn small" type="button">Refresh</button></div></div>
  <div class="live-card"><h3>Google Calendar</h3><div class="live-muted">Secure connection layer planned for V3.8.</div><div class="calendar-placeholder"><strong>Calendar connection is protected</strong><span>Your Google credentials will never be placed in the public GitHub repo. V3.8 will connect through a secure backend and then show today's events here.</span></div><div class="live-tools"><a class="btn small" href="https://calendar.google.com/" target="_blank" rel="noopener">Open Google Calendar</a></div></div>
  <div class="live-card headlines-card"><h3>Daily Headlines</h3><div id="headlineUpdated" class="live-muted">Loading today's feed…</div><div id="headlineTabs" class="headline-tabs"></div><div id="headlineList" class="headline-list"></div></div>
 </div>`;
 weekly.insertAdjacentElement('afterend',section);
 document.getElementById('weatherLocate').onclick=requestWeather;
 document.getElementById('weatherRefresh').onclick=()=>loadSavedWeather(true);
 loadSavedWeather(false);loadHeadlines();
}
function codeText(c){return ({0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Cloudy',45:'Fog',48:'Fog',51:'Drizzle',53:'Drizzle',55:'Drizzle',61:'Rain',63:'Rain',65:'Heavy rain',71:'Snow',80:'Showers',81:'Showers',82:'Heavy showers',95:'Thunderstorms'})[c]||'Conditions'}
async function fetchWeather(lat,lon){
 const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=4`;
 const r=await fetch(url);if(!r.ok)throw new Error('Weather unavailable');const d=await r.json();
 const days=d.daily.time.slice(1,4).map((date,i)=>({date,hi:d.daily.temperature_2m_max[i+1],lo:d.daily.temperature_2m_min[i+1],rain:d.daily.precipitation_probability_max[i+1],code:d.daily.weather_code[i+1]}));
 document.getElementById('weatherBox').innerHTML=`<div class="weather-main"><div><div class="weather-temp">${Math.round(d.current.temperature_2m)}°</div><div class="weather-detail">${esc37(codeText(d.current.weather_code))}</div></div><div class="weather-detail">Today: ${Math.round(d.daily.temperature_2m_max[0])}° / ${Math.round(d.daily.temperature_2m_min[0])}°<br>Rain ${d.daily.precipitation_probability_max[0]??0}%</div></div><div class="weather-days">${days.map(x=>`<div class="weather-day"><strong>${new Date(x.date+'T12:00').toLocaleDateString(undefined,{weekday:'short'})}</strong>${Math.round(x.hi)}° / ${Math.round(x.lo)}°<br>${x.rain??0}% rain</div>`).join('')}</div>`;
}
function requestWeather(){navigator.geolocation.getCurrentPosition(p=>{const c={lat:p.coords.latitude,lon:p.coords.longitude};localStorage.setItem(WEATHER_KEY,JSON.stringify(c));fetchWeather(c.lat,c.lon).catch(showWeatherError)},showWeatherError,{enableHighAccuracy:false,timeout:10000});}
function showWeatherError(){const b=document.getElementById('weatherBox');if(b)b.innerHTML='<div class="empty">Could not load weather. Allow location access and try again.</div>';}
function loadSavedWeather(force){try{const c=JSON.parse(localStorage.getItem(WEATHER_KEY));if(c?.lat&&c?.lon)fetchWeather(c.lat,c.lon).catch(showWeatherError);else if(force)requestWeather();}catch(e){}}
async function loadHeadlines(){try{const r=await fetch('data/headlines.json',{cache:'no-store'});headlineData=await r.json();renderHeadlineTabs();renderHeadlines();document.getElementById('headlineUpdated').textContent=headlineData.updatedAt?`Updated ${new Date(headlineData.updatedAt).toLocaleString()}`:'Daily feed';}catch(e){document.getElementById('headlineList').innerHTML='<div class="empty">Headline feed is not available yet.</div>';}}
function renderHeadlineTabs(){const cats=Object.keys(headlineData.categories||{});if(!cats.length)return; if(!cats.includes(activeHeadlineCategory))activeHeadlineCategory=cats[0];document.getElementById('headlineTabs').innerHTML=cats.map(c=>`<button class="headline-tab ${c===activeHeadlineCategory?'active':''}" data-headcat="${esc37(c)}">${esc37(c)}</button>`).join('');}
function renderHeadlines(){const list=(headlineData.categories?.[activeHeadlineCategory]||[]).filter(h=>!hidden.has(h.id));document.getElementById('headlineList').innerHTML=list.length?list.slice(0,10).map(h=>`<div class="headline ${saved.has(h.id)?'saved-headline':''}"><div class="headline-title">${esc37(h.title)}</div><div class="headline-meta">${esc37(h.source||'')} ${h.published?`• ${esc37(new Date(h.published).toLocaleString())}`:''}</div><div class="headline-actions"><a class="btn small" href="${esc37(h.url)}" target="_blank" rel="noopener">Open</a><button class="btn small" data-savehead="${esc37(h.id)}" type="button">${saved.has(h.id)?'Saved':'Save'}</button><button class="btn small ghost" data-hidehead="${esc37(h.id)}" type="button">Hide</button></div></div>`).join(''):'<div class="empty">No stories in this category right now.</div>';}
document.addEventListener('click',e=>{const c=e.target.closest('[data-headcat]');if(c){activeHeadlineCategory=c.dataset.headcat;renderHeadlineTabs();renderHeadlines();}const s=e.target.closest('[data-savehead]');if(s){saved.has(s.dataset.savehead)?saved.delete(s.dataset.savehead):saved.add(s.dataset.savehead);localStorage.setItem(SAVED_KEY,JSON.stringify([...saved]));renderHeadlines();}const h=e.target.closest('[data-hidehead]');if(h){hidden.add(h.dataset.hidehead);localStorage.setItem(HIDDEN_KEY,JSON.stringify([...hidden]));renderHeadlines();}});
installLiveBriefing();
})();
