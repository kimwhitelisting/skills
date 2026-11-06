/** Real public Auth/JWT/RPC/Edge smoke for EXACTLY two marked synthetic fixtures.
 * Inputs stay in process memory/stdin, never arguments/files/output. No admin credential.
 * Creation and fallback cleanup belong to the root orchestrator, not this script.
 */
import { pathToFileURL } from 'node:url';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
const ids = ['b2800000-0000-4000-8000-000000000001','b2800000-0000-4000-8000-000000000002'];
const emails = ['bento-http-a@example.invalid','bento-http-b@example.invalid'];
export async function runHttpSmoke(input) {
  const { url, publishableKey, expectedProjectRef, confirmSyntheticFixture, phase } = input;
  const fixtures = structuredClone(input.fixtures);
  if (!['save','delete'].includes(phase)) throw Error('Choose save or delete phase explicitly');
  if (confirmSyntheticFixture !== true || !/^[a-z]{20}$/.test(expectedProjectRef ?? '') || url !== `https://${expectedProjectRef}.supabase.co`) throw Error('Explicit dedicated project confirmation required');
  if (typeof publishableKey !== 'string' || publishableKey.startsWith('sb_secret_')) throw Error('Use a public key only');
  if (publishableKey.startsWith('eyJ')) {
    let claims; try { claims=JSON.parse(Buffer.from(publishableKey.split('.')[1],'base64url').toString()); } catch { throw Error('Invalid public key'); }
    if (claims.role !== 'anon') throw Error('Privileged keys prohibited');
  } else if (!publishableKey.startsWith('sb_publishable_')) throw Error('Use a public key only');
  if (!Array.isArray(fixtures) || fixtures.length!==2 || fixtures.some((f,i)=>f.id!==ids[i]||f.email!==emails[i]||typeof f.password!=='string'||f.password.length<32)) throw Error('Only the two known synthetic fixtures are allowed');
  const checks=[], tokens=[null,null], deleted=[false,false];
  let stage='start';
  const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  async function request(path,token,method='GET',body) {
    const response=await fetch(url+path,{method,headers:{apikey:publishableKey,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
    let data;try {data=await response.json();}catch {data=null;}
    return {ok:response.ok,status:response.status,data};
  }
  const rpc=(name,token,body={})=>request('/rest/v1/rpc/'+name,token,'POST',body);
  const snapshot=hearts=>({version:1,dex:{hearts},prefs:{sound:false}});
  const put=(token,revision,id,hearts)=>rpc('bento_put_save',token,{p_expected_revision:revision,p_operation_id:id,p_snapshot:snapshot(hearts)});
  async function login(i) {
    const r=await request('/auth/v1/token?grant_type=password',null,'POST',{email:fixtures[i].email,password:fixtures[i].password});
    if(!r.ok||r.data?.user?.id!==ids[i]||!r.data?.access_token)throw Error(`synthetic login ${i} failed (${r.status})`);
    return r.data.access_token;
  }
  async function deleteFixture(i) {
    if(deleted[i])return true;
    if(!tokens[i])return false;
    const r=await request('/functions/v1/bento-delete-account',tokens[i],'POST',{password:fixtures[i].password});
    deleted[i]=r.ok&&r.data?.deleted===true;
    return deleted[i];
  }
  let failure;
  try {
    stage='authentication';
    for(let i=0;i<2;i++)tokens[i]=await login(i);
    checks.push('two_real_public_auth_sessions');
    const [a,b]=tokens;
    if (phase === 'save') {
    stage='isolation';
    const emptyA=await rpc('bento_get_save',a),emptyB=await rpc('bento_get_save',b);
    check(emptyA.ok&&emptyA.data.revision===0&&emptyB.ok&&emptyB.data.revision===0,'both_accounts_empty');
    const firstId=randomUUID();
    const first=await put(a,0,firstId,123);
    check(first.ok&&first.data.status==='saved'&&first.data.revision===1,'first_save');
    const bRead=await rpc('bento_get_save',b);
    check(bRead.ok&&bRead.data.revision===0,'rpc_account_isolation');
    const rows=await request(`/rest/v1/bento_saves?user_id=eq.${ids[0]}&select=user_id`,b);
    check(rows.ok&&Array.isArray(rows.data)&&rows.data.length===0,'direct_select_rls_isolation');
    const denied=await request(`/rest/v1/bento_saves?user_id=eq.${ids[0]}`,a,'PATCH',{revision:99});
    check(!denied.ok&&denied.data?.code==='42501','direct_writes_denied');
    stage='concurrent_cas';
    const candidates=await Promise.all([put(a,1,randomUUID(),150),put(a,1,randomUUID(),200)]);
    check(candidates.every(r=>r.ok)&&candidates.filter(r=>r.data.status==='saved').length===1&&candidates.filter(r=>r.data.status==='conflict').length===1,'concurrent_one_saved_one_conflict');
    const winner=candidates.find(r=>r.data.status==='saved').data;
    check(candidates.every(r=>r.data.revision===2&&r.data.snapshot.dex.hearts===winner.snapshot.dex.hearts),'conflict_returns_winner');
    const late=await put(a,0,firstId,123);
    check(late.ok&&late.data.duplicate===true&&late.data.operation_revision===1&&late.data.revision===2&&late.data.snapshot.dex.hearts===winner.snapshot.dex.hearts,'late_duplicate_no_rollback');
    const mismatch=await put(a,0,firstId,999);
    check(!mismatch.ok&&mismatch.data?.code==='22023','operation_reuse_rejected');
    stage='restore';
    tokens[0]=await login(0);
    const restored=await rpc('bento_get_save',tokens[0]);
    check(restored.ok&&restored.data.revision===2&&restored.data.snapshot.dex.hearts===winner.snapshot.dex.hearts,'fresh_session_restores_current_save');
    } else {
    stage='deletion';
    const beforeA=await rpc('bento_get_save',tokens[0]);
    const beforeB=await rpc('bento_get_save',tokens[1]);
    check(beforeA.ok&&beforeB.ok,'read_before_deletion');
    const wrong=await request('/functions/v1/bento-delete-account',tokens[0],'POST',{password:'wrong-synthetic-password'});
    check(wrong.status===403&&wrong.data?.error==='reauthentication_failed','wrong_password_does_not_delete');
    const stillThere=await rpc('bento_get_save',tokens[0]);
    check(stillThere.ok&&JSON.stringify(stillThere.data)===JSON.stringify(beforeA.data),'save_preserved_after_bad_reauth');
    const staleToken=tokens[0];
    check(await deleteFixture(0),'real_deletion_edge_A');
    const stale=await rpc('bento_get_save',staleToken);
    check(!stale.ok&&['28000','PGRST301','PGRST303'].includes(stale.data?.code),'deleted_subject_cannot_read');
    const bStill=await rpc('bento_get_save',tokens[1]);
    check(bStill.ok&&JSON.stringify(bStill.data)===JSON.stringify(beforeB.data),'deleting_A_preserves_B');
    check(await deleteFixture(1),'real_deletion_edge_B');
    }
  } catch(error) {
    // Stage and controlled assertion messages only; never print request/response/token objects.
    failure={stage,message:error instanceof Error ? error.message : 'smoke_failed'};
  } finally {
    for(let i=0;i<2;i++) {
      if(phase==='delete'&&!deleted[i])try {await deleteFixture(i);}catch {/* Root uses narrow marked-fixture SQL fallback. */}
      fixtures[i].password='';tokens[i]=null;
    }
  }
  return {phase,pass:!failure,checks,...(failure?{failure}:{}),deletedFixtures:deleted,cleanupDeferred:phase==='save',needsNarrowSqlCleanup:phase==='delete'&&deleted.some(x=>!x)};
}
if(typeof process !== 'undefined' && process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>32768)throw Error('Input too large');}
    const result=await runHttpSmoke(JSON.parse(raw));raw='';
    process.stdout.write(JSON.stringify(result)+'\n');
    if(!result.pass)process.exitCode=1;
  } catch {process.stdout.write(JSON.stringify({pass:false,failure:{stage:'input',message:'Invalid smoke configuration'}})+'\n');process.exitCode=1;}
}
