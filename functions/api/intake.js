// Private assessment intake. A Google Apps Script poller delivers JSON from a private Drive inbox.
// Requires an Access service-token policy at the edge AND INGEST_SHARED_SECRET server-side.
// Never expose these secrets in browser code or repository content.
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const allowed=['not-assessed','needs-practice','developing','proficient','mastered'];
function safeDriveUrl(s){if(typeof s!=='string')return false;try{const u=new URL(s);return u.protocol==='https:'&&['drive.google.com','docs.google.com'].includes(u.hostname)}catch{return false}}
function validAssessment(a,skills,allowReview=false){
 if(!a||a.schema!=='lille-assessment-v1'||!/^[-a-zA-Z0-9_]{8,100}$/.test(a.id||'')||!/^\d{4}-\d{2}-\d{2}$/.test(a.date||'')||typeof a.title!=='string'||!a.title.trim()||a.title.length>180||typeof a.summary!=='string'||a.summary.length>3000||!safeDriveUrl(a.source_url)||typeof a.source_title!=='string'||!a.source_title.trim()||a.source_title.length>180||!Array.isArray(a.observations)||a.observations.length>30||a.observations.some(x=>typeof x!=='string'||x.length>500)||!Array.isArray(a.proposals)||a.proposals.length>30)return false;
 return a.proposals.every(p=>p&&typeof p.skill_id==='string'&&(skills.some(s=>s.id===p.skill_id)||(allowReview&&p.decision==='needs-lesson-review'&&typeof p.original_skill_id==='string'&&p.original_skill_id===p.skill_id))&&allowed.includes(p.suggested_status)&&typeof p.rationale==='string'&&!!p.rationale.trim()&&p.rationale.length<=1200);
}
function equalSecret(a,b){
 const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);
 if(x.length!==y.length)return false;
 let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
}
export async function onRequestPost({request,env}){
 const expected=String(env.INGEST_SHARED_SECRET||'');
 const supplied=String(request.headers.get('X-Lille-Ingest-Key')||'');
 if(expected.length<32||supplied.length!==expected.length||!equalSecret(supplied,expected))return json({error:'Unauthorized'},401);
 if(!env.HUB_DB)return json({error:'Database not configured'},503);
 const bytes=Number(request.headers.get('content-length')||0);
 if(bytes>60000)return json({error:'Too large'},413);
 let a;
 try{const raw=await request.text();if(raw.length>60000)return json({error:'Too large'},413);a=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
 try{
  await env.HUB_DB.prepare("INSERT OR IGNORE INTO hub_state (id,revision,data_json,updated_at) VALUES (1,0,NULL,NULL)").run();
  // Serial conflict retries preserve updates from browser, other devices, and intake.
  for(let attempt=0;attempt<5;attempt++){
   const state=await env.HUB_DB.prepare('SELECT revision,data_json FROM hub_state WHERE id=1').first();
   if(!state?.data_json)return json({error:'Initialize cloud progress in Parent Dashboard first'},409);
   const obj=JSON.parse(state.data_json);
   if(obj.schema!=='lille-hub-v1'||!Array.isArray(obj.history)||!Array.isArray(obj.skills)||!Array.isArray(obj.tasks))return json({error:'Invalid hub state'},503);
   // Support older ChatGPT assessment JSON that still references archived custom IDs.
   if(obj.curriculum_alignment?.version==='im-monitoring-v1'&&Array.isArray(a?.proposals)){
    const alias={prime:'im-u1-a-1',factors:'im-u1-b-1',multiples:'im-u1-b-1',equiv:'im-u2-b-1',compare:'im-u2-c-1',numberline:'im-u2-a-2',fractionmodels:'im-u2-a-1',add:'im-u3-b-3',subtract:'im-u3-b-3'};
    a.proposals=a.proposals.map(p=>({...p,skill_id:alias[p.skill_id]||p.skill_id}));
   }
   // Preserve historical goal-level proposals as review-needed evidence when
   // the hub tracks lessons. Never guess which lesson a broad goal means.
   if(obj.curriculum_alignment?.version==='im-lessons-v1'&&Array.isArray(a?.proposals)){
     const lessonIDs=new Set(obj.skills.map(s=>s.id));
     a.proposals=a.proposals.map(p=>{
       if(lessonIDs.has(p.skill_id))return p;
       return {...p,original_skill_id:p.skill_id,decision:'needs-lesson-review'};
     });
   }
   if(!validAssessment(a,obj.skills,obj.curriculum_alignment?.version==='im-lessons-v1'))return json({error:'Invalid assessment or unknown lesson'},400);
   if((obj.assessment_inbox||[]).some(x=>x.id===a.id)||obj.history.some(h=>h.assessment_id===a.id))return json({ok:true,duplicate:true,revision:state.revision,assessment_id:a.id});
   if(obj.history.length>=10000||(obj.assessment_inbox||[]).length>=5000)return json({error:'Archive full'},413);
   const stamp=new Date().toISOString();
   const draft={...a,imported_at:stamp,proposals:a.proposals.map(p=>({...p,decision:p.decision==='needs-lesson-review'?'needs-lesson-review':'pending'}))};
   obj.assessment_inbox=Array.isArray(obj.assessment_inbox)?obj.assessment_inbox:[];
   obj.assessment_inbox.push(draft);
   obj.history.push({assessment_id:a.id,date:a.date,title:a.title,result:a.summary.slice(0,1000),source_url:a.source_url,source_title:a.source_title,observations:a.observations});
   const dataJson=JSON.stringify(obj);
   if(dataJson.length>700000)return json({error:'Hub state too large'},413);
   // Back up BEFORE attempting revision change. If a concurrent writer wins, backup
   // may contain a duplicate snapshot; this is harmless and doesn't alter hub_state.
   const result=await env.HUB_DB.batch([
    env.HUB_DB.prepare('INSERT INTO hub_backups (revision,data_json,saved_at) SELECT revision,data_json,? FROM hub_state WHERE id=1 AND revision=? AND data_json IS NOT NULL').bind(stamp,state.revision),
    env.HUB_DB.prepare('UPDATE hub_state SET revision=revision+1,data_json=?,updated_at=? WHERE id=1 AND revision=?').bind(dataJson,stamp,state.revision)
   ]);
   if((result[1]?.meta?.changes||0)===1)return json({ok:true,duplicate:false,revision:state.revision+1,assessment_id:a.id});
  }
  return json({error:'Concurrent revision conflict; retry later'},409);
 }catch{return json({error:'Cloud database unavailable'},503)}
}
export async function onRequest(){return json({error:'Method not allowed'},405)}
