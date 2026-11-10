import { afterEach, expect, it, vi } from 'vitest';
import { createClient as actualCreateClient, type Session } from '@supabase/supabase-js';
import { SocialTransport } from '../src/account/social-transport.ts';
import { NATIVE_SOCIAL_CALLBACK } from '../src/account/social-config.ts';
const uid = '12345678-1234-1234-1234-123456789abc';
const config = { providers: { google: true, apple: false }, socialDeletionReady: true, webCallback: 'https://play.fixture.dev/?bento_social=1' };
const user = { id: uid, identities: [{ provider: 'google', user_id: uid }], app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01' };
const access_token = btoa('{"alg":"HS256"}') + '.' + btoa(JSON.stringify({ sub: uid, exp: Math.floor(Date.now()/1000)+3600 })) + '.test';
const response = { access_token, refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer', user };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); vi.doUnmock('@supabase/supabase-js'); });
async function setup(cold = false, hash = '', failAdoption = false, corruptWeb = false) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL','https://fixture.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','sb_publishable_synthetic'); vi.stubEnv('VITE_SOCIAL_AUTH_CONFIG', JSON.stringify(config));
  const secureMap = new Map<string,string>(), gameMap = new Map<string,string>();
  const secure = { getItem: vi.fn(async(k:string)=>secureMap.get(k)??null), setItem:vi.fn(async(k:string,v:string)=>{secureMap.set(k,v)}),removeItem:vi.fn(async(k:string)=>{secureMap.delete(k)}) };
  const request = vi.fn(async(raw:string|URL|Request)=>new Response(JSON.stringify(String(raw).includes('/token?')?response:user)));
  vi.stubGlobal('fetch',request);
  if(cold){const seed = new SocialTransport({ url:'https://fixture.supabase.co',publishable:'sb_publishable_synthetic',config,platform:'android',origin:'https://play.fixture.dev',port:secure,session:async()=>null,checkpoint:async()=>{},adopt:async()=>{},open:async()=>{},close:async()=>{},fetch:request });await seed.start('google','login');}
  if(corruptWeb){secureMap.set('bento-social-transaction:v1','{broken');secureMap.set('bento-auth:v1','primary-original');secureMap.set('bento-life:snapshot:v1','game-original');vi.stubGlobal('sessionStorage',secure);}
  const native={get:vi.fn(async(k:string)=>gameMap.get(k)??null),set:vi.fn(async(k:string,v:string)=>{gameMap.set(k,v)}),remove:vi.fn(async()=>{})};
  const storage = {getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),length:0,key:()=>null};vi.stubGlobal('localStorage',storage);
  const handlers = new Map<string,(e:unknown)=>void>(), dispatched:string[]=[];const reload=vi.fn();
  const panel={innerHTML:'',hidden:true,setAttribute:vi.fn(),contains:()=>false,addEventListener:(e:string,fn:(e:unknown)=>void)=>handlers.set(e,fn)};
  vi.stubGlobal('document',{getElementById:(id:string)=>id==='app'?{textContent:''}:null,createElement:()=>panel,body:{append:vi.fn()},querySelectorAll:()=>[],activeElement:undefined});
  vi.stubGlobal('window',{addEventListener:vi.fn(),dispatchEvent:(event:Event)=>{dispatched.push(event.type);return true}});
  vi.stubGlobal('location',{origin:'https://play.fixture.dev',pathname:'/',hash,href:'https://play.fixture.dev/',reload});
  vi.stubGlobal('navigator',{locks:{request:(_a:string,_b:unknown,fn:(lock:object)=>unknown)=>fn({})}});
  let primarySession:Session|null=null;
  const adopt=vi.fn(async(tokens:{access_token:string;refresh_token:string})=>{if(failAdoption)throw Error('secure locked');primarySession={...response,...tokens} as Session;return{data:{session:primarySession,user},error:null}});
  const primary={auth:{getSession:async()=>({data:{session:primarySession},error:null}),onAuthStateChange:vi.fn(),setSession:adopt}};
  vi.doMock('@supabase/supabase-js',()=>({createClient:(url:string,key:string,options:Parameters<typeof actualCreateClient>[2])=>options?.auth?.storageKey==='bento-auth:v1'?primary:actualCreateClient(url,key,options)}));
  let callback!:(url:string)=>Promise<void>,finished!:()=>Promise<void>;
  const entry={platform:corruptWeb?'web':'android',open:vi.fn(async()=>{}),close:vi.fn(async()=>{}),connect:async(consumer:(url:string)=>Promise<void>,onFinished:()=>Promise<void>)=>{callback=consumer;finished=onFinished;if(cold)await consumer(NATIVE_SOCIAL_CALLBACK+'?code=fixture-code')}};
  const account=await import('../src/account/account.ts'); const mounted=await account.bootAccount(corruptWeb?undefined:native,corruptWeb?undefined:secure,entry);
  const click=(action:string)=>handlers.get('click')!({target:{closest:()=>({dataset:{account:action}})}});
  return{account,mounted,panel,native,secure,storage,gameMap,adopt,reload,entry,dispatched,click,request,secureMap,callback:(url:string)=>callback(url),finished:()=>finished()};
}
it('actual cold callback verifies SDK result, adopts once and returns before stale guest storage hydration',async()=>{
  const h=await setup(true);expect(h.adopt).toHaveBeenCalledOnce();expect(h.reload).toHaveBeenCalledOnce();expect(h.mounted).toBe(false);
  expect(h.native.set).not.toHaveBeenCalled();expect(h.storage.setItem).not.toHaveBeenCalled();expect(h.gameMap.size).toBe(0);
  expect(h.request.mock.calls.some(([url])=>String(url).endsWith('/user'))).toBe(true);
});
it('real account social action checkpoints then cancels via reload, never reactivating old mounted generation',async()=>{
  const h=await setup();h.account.openAccount();expect(h.panel.innerHTML).toContain('social-login-google');
  const{gameWrites}=await import('../src/account/runtime-gate.ts');const generation=gameWrites.capture();expect(gameWrites.allows(generation)).toBe(true);
  h.click('social-login-google');await vi.waitFor(()=>expect(h.entry.open).toHaveBeenCalledOnce());
  expect(h.dispatched).toContain('bento-account-checkpoint');expect(gameWrites.allows(generation)).toBe(false);expect(h.panel.innerHTML).toContain('social-cancel');
  h.click('social-cancel');await vi.waitFor(()=>expect(h.reload).toHaveBeenCalledOnce());expect(gameWrites.allows(generation)).toBe(false);expect(h.adopt).not.toHaveBeenCalled();
});

it('existing implicit password recovery remains available and performs no social exchange',async()=>{
  const h=await setup(false,'#type=recovery&access_token=synthetic-email');
  expect(h.panel.innerHTML).toContain('새 비밀번호');expect(h.panel.innerHTML).not.toContain('social-login-google');
  expect(h.request).not.toHaveBeenCalled();expect(h.entry.open).not.toHaveBeenCalled();
});

it('thrown secure adoption failure clears completing state and offers reload without stale scope writes',async()=>{
  const h=await setup(true,'',true);expect(h.mounted).toBe(false);expect(h.adopt).toHaveBeenCalledOnce();
  expect(h.panel.innerHTML).toContain('로그인 적용을 마쳤는지 확인하지 못했어요');expect(h.panel.innerHTML).toContain('data-account="restart"');
  expect(h.panel.innerHTML).not.toContain('잠시 기다려 주세요');expect(h.native.set).not.toHaveBeenCalled();h.click('restart');expect(h.reload).toHaveBeenCalledOnce();
});

it('confirmed corrupt social secure record resets only that record, never primary credentials',async()=>{
  const{NativeAuthRecovery}=await import('../src/account/native-auth-recovery.ts');
  const values=new Map([['bento-social-transaction:v1','{"tx":'],['bento-auth:v1','primary-original'],['bento-life:snapshot:v1','guest-original']]);
  const remove=vi.fn(async(key:string)=>values.delete(key));
  const r=new NativeAuthRecovery({get:async key=>values.get(key)??null,set:async()=>{},remove},'ios');
  await expect(r.getItem('bento-social-transaction:v1')).rejects.toThrow();expect(r.canReset).toBe(true);
  expect(await r.resetConfirmed(true)).toBe(true);expect(remove).toHaveBeenCalledExactlyOnceWith('bento-social-transaction:v1');expect(values.get('bento-auth:v1')).toBe('primary-original');expect(values.get('bento-life:snapshot:v1')).toBe('guest-original');
});

it.each(['finish-first','callback-first'])('actual account accepts Android return with %s event order',async order=>{
  const h=await setup();h.account.openAccount();h.click('social-login-google');await vi.waitFor(()=>expect(h.entry.open).toHaveBeenCalledOnce());
  if(order==='finish-first'){await h.finished();expect(h.reload).not.toHaveBeenCalled();expect(h.panel.innerHTML).toContain('인증 창이 닫혔어요');expect(h.panel.innerHTML).toContain('social-cancel');}
  await h.callback(NATIVE_SOCIAL_CALLBACK+'?code=fixture-code');if(order==='callback-first')await h.finished();
  expect(h.adopt).toHaveBeenCalledOnce();expect(h.reload).toHaveBeenCalledOnce();
});
it('actual web corruption prompt needs explicit confirmation and preserves primary/game bytes',async()=>{
  const h=await setup(false,'',false,true);expect(h.panel.innerHTML).toContain('social-reset');expect(h.secure.removeItem).not.toHaveBeenCalled();
  h.click('social-reset');expect(h.panel.innerHTML).toContain('social-reset-confirm');h.click('social-reset-cancel');expect(h.secure.removeItem).not.toHaveBeenCalled();
  h.click('social-reset');h.click('social-reset-confirm');await vi.waitFor(()=>expect(h.reload).toHaveBeenCalledOnce());
  expect(h.secure.removeItem).toHaveBeenCalledExactlyOnceWith('bento-social-transaction:v1');expect(h.secureMap.get('bento-auth:v1')).toBe('primary-original');expect(h.secureMap.get('bento-life:snapshot:v1')).toBe('game-original');
});
