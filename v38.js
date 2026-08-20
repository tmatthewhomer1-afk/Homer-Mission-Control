(()=>{
const SUPABASE_URL='https://lebmrigcipsddkkhkcbe.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_IvduWJZUNTR4Ps-fTq11Cw_UTX2Nw7F';
const TASK_KEY='mattCommandCenterV35';
const PLAN_KEY='homerWeeklyPlanV36';
const SAVED_HEADLINES_KEY='homerSavedHeadlinesV37';
const HIDDEN_HEADLINES_KEY='homerHiddenHeadlinesV37';
const PRE_PULL_BACKUP_KEY='homerPreCloudPullBackupV38';
let sb=null;
let currentUser=null;
let lastCloudUpdated=null;

function parseLocal(key,fallback){
  try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}catch(e){return fallback}
}
function snapshot(){
  return {
    version:38,
    savedAt:new Date().toISOString(),
    tasks:parseLocal(TASK_KEY,[]),
    weeklyPlan:parseLocal(PLAN_KEY,null),
    savedHeadlines:parseLocal(SAVED_HEADLINES_KEY,[]),
    hiddenHeadlines:parseLocal(HIDDEN_HEADLINES_KEY,[])
  };
}
function setStatus(text,mode='idle'){
  const textEl=document.getElementById('cloudStatusText');
  const dot=document.getElementById('cloudStatusDot');
  if(textEl)textEl.textContent=text;
  if(dot){dot.className='cloud-dot'+(mode==='online'?' online':mode==='error'?' error':'')}
}
function setMeta(text){const el=document.getElementById('cloudSyncMeta');if(el)el.textContent=text||''}
function fmtDate(value){if(!value)return 'Not synced yet';try{return new Date(value).toLocaleString()}catch(e){return value}}
function localTaskCount(){const t=parseLocal(TASK_KEY,[]);return Array.isArray(t)?t.length:0}

function buildCard(){
  if(document.getElementById('cloudSyncShell'))return;
  const anchor=document.getElementById('liveBriefingShell')||document.getElementById('weeklyPlanShell')||document.querySelector('.summary-grid');
  if(!anchor)return;
  const section=document.createElement('section');
  section.id='cloudSyncShell';
  section.className='card cloud-sync-shell';
  section.innerHTML=`
    <div class="section-head"><div><h2>Cloud Sync</h2><p>Private cross-device backup for Mission Control.</p></div><span class="badge next">V3.8</span></div>
    <div class="cloud-sync-grid">
      <div class="cloud-sync-panel">
        <h3>Account</h3>
        <div class="cloud-sync-status"><span id="cloudStatusDot" class="cloud-dot"></span><strong id="cloudStatusText">Checking sign-in…</strong></div>
        <div id="cloudSignedOut">
          <div class="cloud-email-row"><input id="cloudEmail" type="email" placeholder="Email address" autocomplete="email"><button id="cloudSignIn" class="btn blue" type="button">Send Sign-In Link</button></div>
          <div class="cloud-sync-note">Supabase sends a one-time magic link. Your private task data stays behind your authenticated account and row-level security.</div>
        </div>
        <div id="cloudSignedIn" class="hidden">
          <div id="cloudUserEmail" class="cloud-sync-note"></div>
          <div class="cloud-sync-actions"><button id="cloudSignOut" class="btn small" type="button">Sign Out</button></div>
        </div>
      </div>
      <div class="cloud-sync-panel">
        <h3>Sync Controls</h3>
        <div class="cloud-sync-note">First sync is manual on purpose. Push uploads this browser's current Mission Control state. Pull replaces this browser with the cloud snapshot only after confirmation.</div>
        <div class="cloud-sync-actions"><button id="cloudPush" class="btn blue" type="button" disabled>Push This Device → Cloud</button><button id="cloudPull" class="btn" type="button" disabled>Pull Cloud → This Device</button></div>
        <div id="cloudSyncMeta" class="cloud-sync-meta">Local tasks: ${localTaskCount()} · Cloud: not checked</div>
      </div>
    </div>`;
  anchor.insertAdjacentElement('afterend',section);
  document.getElementById('cloudSignIn').onclick=sendMagicLink;
  document.getElementById('cloudSignOut').onclick=signOut;
  document.getElementById('cloudPush').onclick=pushCloud;
  document.getElementById('cloudPull').onclick=pullCloud;
}

function updateAuthUI(){
  const out=document.getElementById('cloudSignedOut');
  const inn=document.getElementById('cloudSignedIn');
  const push=document.getElementById('cloudPush');
  const pull=document.getElementById('cloudPull');
  if(!out)return;
  if(currentUser){
    out.classList.add('hidden');inn.classList.remove('hidden');
    document.getElementById('cloudUserEmail').textContent=`Signed in as ${currentUser.email||'Mission Control user'}`;
    push.disabled=false;pull.disabled=false;
    setStatus('Cloud account connected','online');
  }else{
    out.classList.remove('hidden');inn.classList.add('hidden');push.disabled=true;pull.disabled=true;
    setStatus('Sign in to enable cloud sync');
  }
}

async function sendMagicLink(){
  const email=document.getElementById('cloudEmail').value.trim();
  if(!email){setStatus('Enter your email address','error');return}
  setStatus('Sending sign-in link…');
  const redirectTo=window.location.origin+window.location.pathname;
  const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});
  if(error){setStatus(error.message||'Could not send sign-in link','error');return}
  setStatus('Check your email for the sign-in link','online');
  setMeta('After opening the link, return here and your session should connect automatically.');
}
async function signOut(){await sb.auth.signOut();currentUser=null;lastCloudUpdated=null;updateAuthUI();setMeta(`Local tasks: ${localTaskCount()} · Signed out`)}

async function refreshCloudMeta(){
  if(!currentUser)return;
  const {data,error}=await sb.from('mission_control_state').select('updated_at').eq('user_id',currentUser.id).maybeSingle();
  if(error){setMeta(`Local tasks: ${localTaskCount()} · Could not check cloud snapshot`);return}
  lastCloudUpdated=data?.updated_at||null;
  setMeta(`Local tasks: ${localTaskCount()} · Cloud: ${fmtDate(lastCloudUpdated)}`);
}
async function pushCloud(){
  if(!currentUser)return;
  const state=snapshot();
  const count=Array.isArray(state.tasks)?state.tasks.length:0;
  if(!confirm(`Upload this device to Mission Control Cloud?\n\n${count} tasks will become the current cloud snapshot.`))return;
  setStatus('Uploading Mission Control…');
  const {data,error}=await sb.from('mission_control_state').upsert({user_id:currentUser.id,payload:state,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('updated_at').single();
  if(error){setStatus('Cloud upload failed','error');setMeta(error.message||'Upload error');return}
  lastCloudUpdated=data.updated_at;setStatus('Cloud snapshot updated','online');setMeta(`Local tasks: ${count} · Cloud: ${fmtDate(lastCloudUpdated)}`);
}
async function pullCloud(){
  if(!currentUser)return;
  setStatus('Checking cloud snapshot…');
  const {data,error}=await sb.from('mission_control_state').select('payload,updated_at').eq('user_id',currentUser.id).maybeSingle();
  if(error){setStatus('Cloud download failed','error');setMeta(error.message||'Download error');return}
  if(!data?.payload){setStatus('No cloud snapshot exists yet');setMeta(`Local tasks: ${localTaskCount()} · Push this device first.`);return}
  const state=data.payload;
  const cloudCount=Array.isArray(state.tasks)?state.tasks.length:0;
  if(!confirm(`Replace this browser's Mission Control data with the cloud snapshot?\n\nCloud snapshot: ${cloudCount} tasks\nSaved: ${fmtDate(data.updated_at)}\n\nA local safety backup will be created first.`)){setStatus('Pull cancelled','online');return}
  localStorage.setItem(PRE_PULL_BACKUP_KEY,JSON.stringify(snapshot()));
  if(Array.isArray(state.tasks))localStorage.setItem(TASK_KEY,JSON.stringify(state.tasks));
  if('weeklyPlan' in state){state.weeklyPlan===null?localStorage.removeItem(PLAN_KEY):localStorage.setItem(PLAN_KEY,JSON.stringify(state.weeklyPlan))}
  if(Array.isArray(state.savedHeadlines))localStorage.setItem(SAVED_HEADLINES_KEY,JSON.stringify(state.savedHeadlines));
  if(Array.isArray(state.hiddenHeadlines))localStorage.setItem(HIDDEN_HEADLINES_KEY,JSON.stringify(state.hiddenHeadlines));
  setStatus('Cloud snapshot restored','online');
  location.reload();
}

async function init(){
  buildCard();
  if(!window.supabase?.createClient){setStatus('Supabase client failed to load','error');return}
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  const {data}=await sb.auth.getSession();
  currentUser=data?.session?.user||null;
  updateAuthUI();
  if(currentUser)await refreshCloudMeta();
  sb.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;updateAuthUI();if(currentUser)refreshCloudMeta()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
