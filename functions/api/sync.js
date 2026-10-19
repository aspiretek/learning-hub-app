// Cloudflare Pages Function: /api/sync
// The Pages site AND this API must be protected by Cloudflare Access.
// This endpoint independently verifies Access JWT before any database access.
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const b64url=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function authorized(request,env){
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 const domain=String(env.ACCESS_TEAM_DOMAIN||'').replace(/\/$/,'');
 const aud=String(env.ACCESS_AUD||'');
 if(!token||!/^https:\/\/[a-z0-9.-]+\.cloudflareaccess\.com$/i.test(domain)||!aud)return false;
 const parts=token.split('.');if(parts.length!==3)return false;
 let header,payload;
 try{header=JSON.parse(new TextDecoder().decode(b64url(parts[0])));payload=JSON.parse(new TextDecoder().decode(b64url(parts[1])))}catch{return false}
 if(header.alg!=='RS256'||!header.kid||payload.iss!==domain||!Array.isArray(payload.aud)||!payload.aud.includes(aud))return false;
 const now=Math.floor(Date.now()/1000);if(typeof payload.exp!=='number'||payload.exp<=now||typeof payload.nbf==='number'&&payload.nbf>now+30)return false;
 try{
  const keys=await fetch(domain+'/cdn-cgi/access/certs',{cf:{cacheTtl:300,cacheEverything:true}});
  if(!keys.ok)return false;
  const jwks=await keys.json();const jwk=(jwks.keys||[]).find(k=>k.kid===header.kid&&k.kty==='RSA');
  if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false}
}
export async function onRequest({request,env}){
 if(request.method!=='GET'&&request.method!=='PUT')return json({error:'Method not allowed'},405);
 if(!env.HUB_DB)return json({error:'Cloud database not configured'},503);
 if(!await authorized(request,env))return json({error:'Cloudflare Access authentication required'},401);
 try{
  await env.HUB_DB.prepare("INSERT OR IGNORE INTO hub_state (id, revision, data_json, updated_at) VALUES (1, 0, NULL, NULL)").run();
  if(request.method==='GET'){
   const row=await env.HUB_DB.prepare('SELECT revision,data_json,updated_at FROM hub_state WHERE id=1').first();
   return json({revision:row.revision,data:row.data_json?JSON.parse(row.data_json):null,updated_at:row.updated_at});
  }
  const length=Number(request.headers.get('Content-Length')||0);
  if(length>750000)return json({error:'Payload too large'},413);
  const raw=await request.text();if(raw.length>750000)return json({error:'Payload too large'},413);
  let input;try{input=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
  if(!Number.isSafeInteger(input.expected_revision)||input.expected_revision<0)return json({error:'Invalid expected revision'},400);
  const obj=input.data;
  if(!obj||obj.schema!=='lille-hub-v1'||!Array.isArray(obj.skills)||!Array.isArray(obj.tasks)||!Array.isArray(obj.history)||obj.skills.length>500||obj.tasks.length>1000||obj.history.length>10000)return json({error:'Invalid learning-hub data'},400);
  const dataJson=JSON.stringify(obj);
  const old=input.expected_revision,now=new Date().toISOString();
  const changes=await env.HUB_DB.batch([
   env.HUB_DB.prepare('INSERT INTO hub_backups (revision,data_json,saved_at) SELECT revision,data_json,? FROM hub_state WHERE id=1 AND revision=? AND data_json IS NOT NULL').bind(now,old),
   env.HUB_DB.prepare('UPDATE hub_state SET revision=revision+1,data_json=?,updated_at=? WHERE id=1 AND revision=?').bind(dataJson,now,old)
  ]);
  if((changes[1]?.meta?.changes||0)!==1){
   const latest=await env.HUB_DB.prepare('SELECT revision,updated_at FROM hub_state WHERE id=1').first();
   return json({error:'Revision conflict',revision:latest.revision,updated_at:latest.updated_at},409);
  }
  return json({revision:old+1,updated_at:now});
 }catch(err){return json({error:'Cloud storage unavailable'},503)}
}
