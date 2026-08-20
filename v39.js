(()=>{
const CLIENT_ID_KEY='homerGoogleClientIdV39';
const TOKEN_KEY='homerGoogleCalendarTokenV39';
const TOKEN_EXP_KEY='homerGoogleCalendarTokenExpV39';
const SCOPE='https://www.googleapis.com/auth/calendar.readonly';
const DAYS_AHEAD=14;
let tokenClient=null;

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function getClientId(){return localStorage.getItem(CLIENT_ID_KEY)||''}
function getToken(){
  const token=sessionStorage.getItem(TOKEN_KEY)||'';
  const exp=Number(sessionStorage.getItem(TOKEN_EXP_KEY)||0);
  if(!token||!exp||Date.now()>exp){sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TOKEN_EXP_KEY);return ''}
  return token;
}
function saveToken(token,expiresIn){sessionStorage.setItem(TOKEN_KEY,token);sessionStorage.setItem(TOKEN_EXP_KEY,String(Date.now()+Math.max(60,Number(expiresIn||3600)-60)*1000))}
function clearToken(){sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TOKEN_EXP_KEY)}
function setCalStatus(text,mode='idle'){
  const el=document.getElementById('googleCalStatus');if(el)el.textContent=text;
  const dot=document.getElementById('googleCalDot');if(dot)dot.className='cloud-dot'+(mode==='online'?' online':mode==='error'?' error':'');
}
function fmtWhen(event){
  const start=event?.start?.dateTime||event?.start?.date;
  if(!start)return '';
  if(event?.start?.date && !event?.start?.dateTime){return new Date(start+'T00:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+' · All day'}
  const d=new Date(start);
  return d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
function eventStartMs(event){const s=event?.start?.dateTime||event?.start?.date;return s?new Date(event.start.date&&!event.start.dateTime?s+'T00:00:00':s).getTime():Infinity}

function buildCard(){
  if(document.getElementById('googleCalendarShell'))return;
  const anchor=document.getElementById('cloudSyncShell')||document.getElementById('liveBriefingShell')||document.querySelector('.summary-grid');
  if(!anchor)return;
  const section=document.createElement('section');
  section.id='googleCalendarShell';
  section.className='card';
  section.innerHTML=`
    <div class="section-head">
      <div><h2>Google Calendar</h2><p>Your next appointments and events inside Mission Control.</p></div>
      <span class="badge next">V3.9</span>
    </div>
    <div class="cloud-sync-grid">
      <div class="cloud-sync-panel">
        <h3>Connection</h3>
        <div class="cloud-sync-status"><span id="googleCalDot" class="cloud-dot"></span><strong id="googleCalStatus">Checking Calendar…</strong></div>
        <div class="cloud-sync-actions" style="margin-top:10px">
          <button id="googleCalConnect" class="btn blue" type="button">Connect Google Calendar</button>
          <button id="googleCalRefresh" class="btn" type="button">Refresh</button>
          <button id="googleCalDisconnect" class="btn ghost" type="button">Disconnect</button>
          <button id="googleCalConfigure" class="btn ghost" type="button">Google Setup</button>
        </div>
        <div id="googleCalSetupNote" class="cloud-sync-note" style="margin-top:9px"></div>
      </div>
      <div class="cloud-sync-panel">
        <h3>Next Up</h3>
        <div id="googleCalNext" class="task-note">No Calendar events loaded yet.</div>
      </div>
    </div>
    <div id="googleCalEvents" class="task-list" style="margin-top:14px"></div>`;
  anchor.insertAdjacentElement('afterend',section);
  document.getElementById('googleCalConnect').onclick=connectCalendar;
  document.getElementById('googleCalRefresh').onclick=refreshCalendar;
  document.getElementById('googleCalDisconnect').onclick=disconnectCalendar;
  document.getElementById('googleCalConfigure').onclick=configureGoogle;
}

function configureGoogle(){
  const current=getClientId();
  const value=prompt('Paste the Google OAuth Web Client ID for Mission Control.\n\nThis is safe to store in the browser; do not paste a client secret.',current);
  if(value===null)return;
  const clean=value.trim();
  if(!clean){localStorage.removeItem(CLIENT_ID_KEY);tokenClient=null;clearToken();updateSetupNote();setCalStatus('Google setup needed');return}
  localStorage.setItem(CLIENT_ID_KEY,clean);tokenClient=null;clearToken();updateSetupNote();setCalStatus('Google setup saved');
}
function updateSetupNote(){
  const note=document.getElementById('googleCalSetupNote');if(!note)return;
  note.textContent=getClientId()?`Google OAuth client configured for ${location.origin}. Access tokens stay in this browser session only.`:'One-time Google OAuth setup is still needed before Calendar can connect.';
}

function loadGIS(){
  if(window.google?.accounts?.oauth2)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const existing=document.getElementById('googleIdentityServices');
    if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.id='googleIdentityServices';s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load Google Identity Services'));document.head.appendChild(s);
  });
}
async function ensureTokenClient(){
  const clientId=getClientId();
  if(!clientId)throw new Error('Google OAuth setup needed');
  await loadGIS();
  if(tokenClient)return tokenClient;
  tokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:SCOPE,callback:()=>{}});
  return tokenClient;
}
async function connectCalendar(){
  try{
    setCalStatus('Opening Google authorization…');
    const client=await ensureTokenClient();
    client.callback=async(resp)=>{
      if(resp.error){setCalStatus(resp.error_description||resp.error,'error');return}
      saveToken(resp.access_token,resp.expires_in);
      setCalStatus('Google Calendar connected','online');
      await loadEvents();
    };
    client.requestAccessToken({prompt:getToken()?'':'consent'});
  }catch(e){setCalStatus(e.message||'Could not connect Google Calendar','error');if(!getClientId())configureGoogle()}
}
async function refreshCalendar(){
  if(!getToken()){await connectCalendar();return}
  await loadEvents();
}
function disconnectCalendar(){clearToken();renderEvents([]);setCalStatus('Calendar disconnected');}

async function loadEvents(){
  const token=getToken();
  if(!token){setCalStatus('Connect Google Calendar to load events');return}
  setCalStatus('Refreshing Calendar…');
  const timeMin=new Date();
  const timeMax=new Date(Date.now()+DAYS_AHEAD*86400000);
  const params=new URLSearchParams({timeMin:timeMin.toISOString(),timeMax:timeMax.toISOString(),singleEvents:'true',orderBy:'startTime',maxResults:'30'});
  try{
    const r=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?'+params.toString(),{headers:{Authorization:'Bearer '+token}});
    if(r.status===401){clearToken();setCalStatus('Google authorization expired — reconnect','error');return}
    if(!r.ok){const body=await r.json().catch(()=>({}));throw new Error(body?.error?.message||`Google Calendar error ${r.status}`)}
    const data=await r.json();
    const items=(data.items||[]).filter(e=>e.status!=='cancelled').sort((a,b)=>eventStartMs(a)-eventStartMs(b));
    renderEvents(items);
    setCalStatus('Google Calendar connected','online');
  }catch(e){setCalStatus(e.message||'Could not load Calendar','error')}
}
function renderEvents(items){
  const list=document.getElementById('googleCalEvents');
  const next=document.getElementById('googleCalNext');
  if(!list||!next)return;
  if(!items.length){next.textContent='No upcoming events loaded.';list.innerHTML='<div class="empty">No upcoming Google Calendar events.</div>';return}
  const first=items[0];
  next.innerHTML=`<strong>${esc(first.summary||'Untitled event')}</strong><div class="task-note">${esc(fmtWhen(first))}${first.location?` · ${esc(first.location)}`:''}</div>`;
  list.innerHTML=items.slice(0,10).map(e=>`<div class="task"><div>📅</div><div><div class="task-title">${esc(e.summary||'Untitled event')}</div><div class="task-note">${esc(fmtWhen(e))}${e.location?` · ${esc(e.location)}`:''}</div></div><div></div></div>`).join('');
}

async function init(){
  buildCard();
  updateSetupNote();
  if(getToken())await loadEvents();else setCalStatus(getClientId()?'Ready to connect Google Calendar':'Google setup needed');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
