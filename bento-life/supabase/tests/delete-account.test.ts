import { deletionHandler, type AccountUser, type DeletionServices } from '../functions/bento-delete-account/handler.ts';
const assert = (ok: unknown, message: string) => { if (!ok) throw Error(message); };
function fixture() {
  const calls: string[] = [];
  const user: AccountUser = { id: 'test-own-id', email: 'synthetic@example.invalid', email_confirmed_at: '2026-01-01' };
  const services: DeletionServices = {
    async getUser(token) { calls.push('get:' + token); return user; },
    async reauthenticate(email, password) { calls.push('reauth:' + email + ':' + password); return {userId:user.id,accessToken:'synthetic-new-token'}; },
    async revokeSessions(token) { calls.push('revoke:' + token); return true; },
    async deleteUser(id) { calls.push('delete:' + id); return true; },
  };
  const request = (body: unknown = {password:'synthetic-password'}, auth = true) => new Request('https://example.invalid/function', {method:'POST',headers:{...(auth?{Authorization:'Bearer synthetic-old-token'}:{}),'Content-Type':'application/json'},body:JSON.stringify(body)});
  return { user, calls, services, request };
}
Deno.test('deletion requires a live authenticated verified non-anonymous user', async () => {
  const f=fixture();
  assert((await deletionHandler(f.services)(f.request({},false))).status===401,'missing bearer');
  f.services.getUser=async()=>null;
  assert((await deletionHandler(f.services)(f.request())).status===401,'invalid bearer');
  f.services.getUser=async()=>({...f.user,is_anonymous:true});
  assert((await deletionHandler(f.services)(f.request())).status===401,'anonymous');
  f.services.getUser=async()=>({...f.user,email_confirmed_at:undefined});
  assert((await deletionHandler(f.services)(f.request())).status===401,'unverified');
  assert(!f.calls.some(x=>x.startsWith('delete:')),'no deletion');
});
Deno.test('a posted account/email cannot redirect deletion and fresh password confirmation precedes it', async () => {
  const f=fixture();
  const result=await deletionHandler(f.services)(f.request({password:'synthetic-password',id:'victim',email:'victim@example.invalid'}));
  assert(result.status===200 && (await result.json()).deleted===true,'success');
  assert(JSON.stringify(f.calls)===JSON.stringify(['get:synthetic-old-token','reauth:synthetic@example.invalid:synthetic-password','revoke:synthetic-new-token','delete:test-own-id']),'authoritative own account and correct sequence');
});
Deno.test('wrong password, mismatched identity and enrolled MFA cannot delete', async () => {
  const f=fixture();
  f.services.reauthenticate=async()=>null;
  assert((await deletionHandler(f.services)(f.request())).status===403,'wrong password');
  f.services.reauthenticate=async()=>({userId:'victim',accessToken:'not-returned'});
  assert((await deletionHandler(f.services)(f.request())).status===403,'identity mismatch');
  f.user.factors=[{status:'verified'}];
  assert((await deletionHandler(f.services)(f.request())).status===403,'mfa not bypassed');
  assert(!f.calls.some(x=>x.startsWith('delete:')),'no deletion');
});
Deno.test('malformed and oversized requests cannot reach reauthentication', async () => {
  const f=fixture();
  for(const body of [{},null,{password:1},{password:''},{password:'x'.repeat(1025)}]) assert((await deletionHandler(f.services)(f.request(body))).status===400,'invalid request');
  assert((await deletionHandler(f.services)(f.request({password:'x'.repeat(5000)}))).status===413,'bounded body without trusting Content-Length');
  assert(!f.calls.some(x=>x.startsWith('reauth:')),'no password checks');
});
Deno.test('revocation failure stops deletion and backend errors never disclose secrets', async () => {
  const f=fixture();
  f.services.revokeSessions=async()=>false;
  assert((await deletionHandler(f.services)(f.request())).status===503,'revocation failure');
  assert(!f.calls.some(x=>x.startsWith('delete:')),'no deletion after failed revoke');
  f.services.revokeSessions=async()=>true;
  f.services.deleteUser=async()=>{throw Error('synthetic-secret-do-not-return');};
  const response=await deletionHandler(f.services)(f.request());
  assert(response.status===503,'provider failure');
  assert(!((await response.text()).includes('synthetic-secret')),'no leakage');
});
Deno.test('CORS preflight and unsupported methods have no auth or data side effects', async () => {
  const f=fixture(), handler=deletionHandler(f.services);
  assert((await handler(new Request('https://example.invalid',{method:'OPTIONS'}))).status===204,'preflight');
  assert((await handler(new Request('https://example.invalid',{method:'GET'}))).status===405,'method');
  assert(f.calls.length===0,'no side effects');
});
