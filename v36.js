(()=>{
const PLAN_KEY="homerWeeklyPlanV36";
let weeklyPlan=loadWeeklyPlan();

function loadWeeklyPlan(){
  try{return JSON.parse(localStorage.getItem(PLAN_KEY))||null}catch(e){return null}
}
function saveWeeklyPlan(){
  if(weeklyPlan) localStorage.setItem(PLAN_KEY,JSON.stringify(weeklyPlan));
  else localStorage.removeItem(PLAN_KEY);
}
function norm(s){return String(s||"").trim().toLowerCase()}
function byTitle(title){return tasks.find(t=>norm(t.title)===norm(title))}
function isOverdue(t){
  if(!t||!t.due||t.status==="done")return false;
  const d=new Date(t.due+"T23:59:59");
  return d<new Date();
}
function escapeHTML(s){return String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}

function installPanel(){
  if(document.getElementById("weeklyPlanShell"))return;
  const summary=document.querySelector(".summary-grid");
  if(!summary)return;
  const section=document.createElement("section");
  section.id="weeklyPlanShell";
  section.className="card weekly-plan-shell";
  section.innerHTML=`
    <div class="section-head">
      <div><h2>This Week</h2><p>Turn the Weekly Review into 3–5 outcomes, grouped work blocks, and real dashboard changes.</p></div>
      <span class="badge next">V3.6</span>
    </div>
    <div class="weekly-plan-grid">
      <div class="weekly-panel">
        <h3>Weekly Outcomes</h3>
        <div id="weeklyOutcomes" class="weekly-outcomes"></div>
        <div class="weekly-tools">
          <button id="prepareWeeklyPrompt" class="btn blue" type="button">Prepare Weekly Review</button>
          <button id="clearWeeklyPlan" class="btn ghost" type="button">Clear Plan</button>
        </div>
        <h3 style="margin-top:18px">Work Blocks</h3>
        <div id="weeklyBlocks" class="work-block-list"></div>
        <h3 style="margin-top:18px">Decision / Overdue</h3>
        <div id="weeklyDecisions" class="decision-list"></div>
      </div>
      <div class="weekly-panel">
        <h3>Apply ChatGPT Plan</h3>
        <p style="margin-top:0;color:var(--muted);font-size:.9rem">Paste the JSON plan ChatGPT gives you after a Weekly Review. Mission Control will preview the changes and ask before changing task statuses.</p>
        <textarea id="weeklyPlanImport" class="plan-import" placeholder='Paste the JSON block here...'></textarea>
        <div class="weekly-tools">
          <button id="previewWeeklyPlan" class="btn" type="button">Preview</button>
          <button id="applyWeeklyPlan" class="btn primary" type="button">Review & Apply</button>
        </div>
        <div id="weeklyApplyStatus" class="apply-status"></div>
        <div class="plan-help">Only exact task-title matches are changed. Unmatched items are reported instead of guessed.</div>
      </div>
    </div>`;
  summary.insertAdjacentElement("afterend",section);

  document.getElementById("prepareWeeklyPrompt").onclick=()=>{
    setAIPrompt("weekly");
    document.getElementById("aiPrompt")?.scrollIntoView({behavior:"smooth",block:"center"});
  };
  document.getElementById("clearWeeklyPlan").onclick=()=>{
    if(confirm("Clear the saved weekly plan? This will not change task statuses.")){
      weeklyPlan=null;saveWeeklyPlan();renderWeeklyPlan();
    }
  };
  document.getElementById("previewWeeklyPlan").onclick=()=>previewImport(false);
  document.getElementById("applyWeeklyPlan").onclick=()=>previewImport(true);
}

function currentOverdue(){
  return tasks.filter(isOverdue).sort((a,b)=>(a.due||"").localeCompare(b.due||""));
}
function renderWeeklyPlan(){
  const out=document.getElementById("weeklyOutcomes");
  const blocks=document.getElementById("weeklyBlocks");
  const decisions=document.getElementById("weeklyDecisions");
  if(!out||!blocks||!decisions)return;

  const outcomes=weeklyPlan?.outcomes||[];
  out.innerHTML=outcomes.length?outcomes.slice(0,5).map((o,i)=>{
    const names=(o.tasks||[]).join(" • ");
    return `<div class="weekly-outcome"><div class="weekly-num">${i+1}</div><div><strong>${escapeHTML(o.title||o)}</strong>${names?`<div class="weekly-meta">${escapeHTML(names)}</div>`:""}</div></div>`;
  }).join(""):`<div class="empty">No weekly plan applied yet. Prepare a Weekly Review, paste ChatGPT's JSON plan here, then apply it.</div>`;

  const workBlocks=weeklyPlan?.workBlocks||[];
  blocks.innerHTML=workBlocks.length?workBlocks.map(b=>`<div class="work-block"><strong>${escapeHTML(b.name)}</strong><span>${escapeHTML((b.tasks||[]).join(" • "))}</span></div>`).join(""):`<div class="task-note">No work blocks saved yet.</div>`;

  const planDecisions=weeklyPlan?.decisions||[];
  const overdue=currentOverdue();
  const seen=new Set();
  const items=[];
  planDecisions.forEach(d=>{
    const key=norm(d.task||d.question);if(seen.has(key))return;seen.add(key);
    items.push(`<div class="decision-item"><strong>${escapeHTML(d.task||"Decision needed")}</strong>${d.question?` — ${escapeHTML(d.question)}`:""}</div>`);
  });
  overdue.forEach(t=>{
    const key=norm(t.title);if(seen.has(key))return;seen.add(key);
    items.push(`<div class="decision-item"><strong>${escapeHTML(t.title)}</strong><span class="overdue-badge">OVERDUE ${escapeHTML(t.due)}</span></div>`);
  });
  decisions.innerHTML=items.length?items.join(""):`<div class="task-note">No decision-needed or overdue items.</div>`;
}

function extractJSON(text){
  let s=String(text||"").trim();
  const fence=s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if(fence)s=fence[1].trim();
  const first=s.indexOf("{");const last=s.lastIndexOf("}");
  if(first>=0&&last>first)s=s.slice(first,last+1);
  return JSON.parse(s);
}
function validatePlan(p){
  if(!p||typeof p!=="object")throw new Error("Plan must be a JSON object.");
  if(!Array.isArray(p.outcomes))p.outcomes=[];
  if(!Array.isArray(p.workBlocks))p.workBlocks=[];
  if(!Array.isArray(p.decisions))p.decisions=[];
  if(!Array.isArray(p.statusUpdates))p.statusUpdates=[];
  return p;
}
function planSummary(p){
  const matched=[];const unmatched=[];
  (p.statusUpdates||[]).forEach(u=>{
    const t=byTitle(u.task);
    if(t)matched.push(`${t.title} → ${String(u.status||"").toUpperCase()}`);
    else unmatched.push(u.task);
  });
  return {matched,unmatched};
}
function previewImport(apply){
  const box=document.getElementById("weeklyPlanImport");
  const status=document.getElementById("weeklyApplyStatus");
  try{
    const p=validatePlan(extractJSON(box.value));
    const {matched,unmatched}=planSummary(p);
    const lines=[`${p.outcomes.length} weekly outcomes`,`${p.workBlocks.length} work blocks`,`${p.decisions.length} decision items`,`${matched.length} matched status changes`];
    if(unmatched.length)lines.push(`Unmatched: ${unmatched.join("; ")}`);
    status.textContent=lines.join("\n");
    if(!apply)return;
    const allowed=new Set(["now","next","waiting","later","done"]);
    if(!confirm(`Apply this weekly plan?\n\n${lines.join("\n")}\n\nOnly matched task titles will be changed.`))return;
    const applied=[];
    p.statusUpdates.forEach(u=>{
      const t=byTitle(u.task);const st=norm(u.status);
      if(t&&allowed.has(st)){
        t.status=st;
        if(st==="waiting"&&u.waitingOn)t.waitingOn=String(u.waitingOn);
        t.updatedAt=Date.now();applied.push(t.title);
      }
    });
    weeklyPlan={...p,appliedAt:new Date().toISOString()};
    saveWeeklyPlan();
    save();render();renderWeeklyPlan();
    status.textContent=`Applied weekly plan. ${applied.length} task status change${applied.length===1?"":"s"} made.${unmatched.length?`\nUnmatched and unchanged: ${unmatched.join("; ")}`:""}`;
  }catch(e){
    status.textContent=`Could not read plan: ${e.message}`;
  }
}

const originalBuildPrompt=buildPrompt;
buildPrompt=function(action){
  if(action!=="weekly")return originalBuildPrompt(action);
  const active=topActive(null,null,24);
  return `You are helping me from Homer Mission Control. Use the dashboard context below as working context. Keep the response practical, concise, and action-oriented. Do not invent missing facts; flag anything that needs my decision.\n\nGive me a practical weekly review. Identify the 3–5 outcomes that would make the week successful, what can be deferred, what should be grouped together to save time, and any overdue item that needs a decision.\n\nAfter the short human-readable review, include ONE JSON code block using exactly this structure so Homer Mission Control can apply the plan:\n{\n  "outcomes": [{"title":"Outcome","tasks":["Exact dashboard task title"]}],\n  "workBlocks": [{"name":"Work block name","tasks":["Exact dashboard task title"]}],\n  "decisions": [{"task":"Exact dashboard task title","question":"Decision needed"}],\n  "statusUpdates": [{"task":"Exact dashboard task title","status":"now|next|waiting|later|done","waitingOn":"optional"}]\n}\n\nRules for the JSON:\n- Use exact dashboard task titles copied from the list below.\n- Recommend no more than 5 NOW outcomes.\n- Use statusUpdates to promote the week's core work to NOW and move clearly deferrable items to NEXT or LATER.\n- Do not mark anything DONE unless the dashboard itself clearly shows it completed.\n- If a needed choice is unclear, put it in decisions instead of guessing.\n\nACTIVE DASHBOARD:\n${contextBlock(active)}`;
};

const originalRender=render;
render=function(){originalRender();renderWeeklyPlan();};

installPanel();
renderWeeklyPlan();
})();
