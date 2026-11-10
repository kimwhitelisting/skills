import { afterEach, describe, expect, it, vi } from 'vitest';
import { SocialTransport, SOCIAL_TRANSACTION_KEY, type SocialEnvironment } from '../src/account/social-transport.ts';
import { enabledSocialProviders, socialConfig, validateSocialConfig, NATIVE_SOCIAL_CALLBACK, type SocialConfig } from '../src/account/social-config.ts';
import { nativeSocialEntry, webSocialEntry } from '../src/account/social-entry.ts';
import type { Session } from '@supabase/supabase-js';
const UID = '12345678-1234-1234-1234-123456789abc', OTHER = '87654321-4321-4321-4321-cba987654321';
const config: SocialConfig = { providers: { google: true, apple: true }, socialDeletionReady: true, webCallback: 'https://play.fixture.dev/?bento_social=1' };
const user = (id = UID, provider = 'google') => ({ id, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01', identities: [{ id: 'provider-id', user_id: id, provider, created_at: '2026-01-01', updated_at: '2026-01-01' }] });
const token = (id = UID, seconds = 3600) => btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + seconds })) + '.fixture';
const session = (id = UID, seconds = 3600) => ({ access_token: token(id, seconds), refresh_token: 'synthetic-refresh-' + id, expires_at: Math.floor(Date.now() / 1000) + seconds, expires_in: seconds, token_type: 'bearer', user: user(id) }) as Session;
function harness(shared = new Map<string, string>(), initial: Session | null = null, platform = 'web') {
  let current = initial, response = session();
  const calls: { url: URL; body?: Record<string, unknown> }[] = [];
  const port = { getItem: vi.fn(async (key: string) => shared.get(key) ?? null), setItem: vi.fn(async (key: string, value: string) => { shared.set(key, value); }), removeItem: vi.fn(async (key: string) => { shared.delete(key); }) };
  const request = vi.fn(async (raw: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(raw)), body = init?.body ? JSON.parse(String(init.body)) : undefined; calls.push({ url, body });
    if (url.pathname.endsWith('/token')) {
      if (url.searchParams.get('grant_type') !== 'pkce' || body?.auth_code !== 'fixture-code' || typeof body?.code_verifier !== 'string') return new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'fixture rejected' }), { status: 400 });
      return Response.json(response);
    }
    if (url.pathname.endsWith('/user/identities/authorize')) {
      expect(url.searchParams.get('code_challenge_method')).toBe('s256');
      return Response.json({ url: 'https://accounts.google.com/o/oauth2/auth?fixture=1' });
    }
    if (url.pathname.endsWith('/user')) return Response.json(response.user);
    throw Error('Unexpected fixture request');
  });
  const env: SocialEnvironment = { url: 'https://fixture.supabase.co', publishable: 'sb_publishable_synthetic', config, platform, origin: 'https://play.fixture.dev', port,
    session: async () => current, checkpoint: vi.fn(async () => {}), adopt: vi.fn(async value => { current = value; }), open: vi.fn(async () => {}), close: vi.fn(async () => {}), fetch: request };
  const transport = new SocialTransport(env);
  return { transport, env, port, shared, calls, request, setCurrent: (s: Session | null) => { current = s; }, respond: (s: Session) => { response = s; }, callback: () => (platform === 'web' ? config.webCallback + '&code=fixture-code' : NATIVE_SOCIAL_CALLBACK + '?code=fixture-code') };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('actual pinned SDK PKCE transport', () => {
  it('persists S256 verifier but never temporary tokens, restores cold and verifies user before adoption', async () => {
    const h = harness(); await h.transport.start('google', 'login');
    const launch = new URL(vi.mocked(h.env.open).mock.calls[0][0]);
    expect(launch.searchParams.get('code_challenge_method')).toBe('s256');
    expect(launch.searchParams.get('redirect_to')).toBe(config.webCallback);
    const record = JSON.parse(h.shared.get(SOCIAL_TRANSACTION_KEY)!);
    expect(record.tx.flowId).toMatch(/^[a-zA-Z0-9_-]{8,64}$/); expect(record.tx.id).toMatch(/^[a-f0-9]{64}$/);
    const verifier = JSON.parse(record.verifiers[`bento-social:v1-flow-${record.tx.flowId}-code-verifier`]);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    expect(launch.searchParams.get('code_challenge')).toBe(btoa(String.fromCharCode(...hash)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
    const cold = harness(h.shared); await cold.transport.restore(); await cold.transport.consume(cold.callback());
    expect(cold.calls[0].body?.code_verifier).toBe(verifier); expect(cold.calls.at(-1)?.url.pathname).toBe('/auth/v1/user'); expect(cold.env.adopt).toHaveBeenCalledOnce();
    expect([...h.shared.keys()]).toEqual([SOCIAL_TRANSACTION_KEY]); expect([...h.shared.values()].join()).not.toContain('synthetic-refresh');
    expect(JSON.parse(h.shared.get(SOCIAL_TRANSACTION_KEY)!).verifiers).toEqual({});
    await expect(cold.transport.consume(cold.callback())).rejects.toThrow(); await h.transport.cancel();
  });
  it('link keeps the original UID, never signs out or refreshes borrowed primary credentials', async () => {
    const h = harness(new Map([['bento-auth:v1', 'primary-exact']]), session()); await h.transport.start('google', 'link'); await h.transport.consume(h.callback());
    expect(h.env.adopt).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ id: UID }) }));
    expect(h.calls.some(c => /logout|refresh_token/.test(c.url.href))).toBe(false); expect(h.shared.get('bento-auth:v1')).toBe('primary-exact');
    const cancel = harness(new Map([['bento-auth:v1', 'primary-exact']]), session()); await cancel.transport.start('google', 'link'); await cancel.transport.cancel();
    expect(cancel.calls.some(c => /logout|refresh_token/.test(c.url.href))).toBe(false); expect(cancel.shared.get('bento-auth:v1')).toBe('primary-exact');
  });
  it('refuses near-expired link seed before SDK can refresh it', async () => {
    const h = harness(new Map(), session(UID, 10)); await expect(h.transport.start('google', 'link')).rejects.toThrow('Refresh primary');
    expect(h.calls.some(c => c.url.pathname.endsWith('/token'))).toBe(false); expect(h.env.open).not.toHaveBeenCalled();
  });
  it.each(['?code=fixture-code&code=second','?code=fixture-code&sb_flow_id=other','?code=fixture-code#access_token=forbidden'])('rejects mismatched native callback %s before exchange', async suffix => {
    const h = harness(new Map(), null, 'android'); await h.transport.start('google', 'login'); await expect(h.transport.consume(NATIVE_SOCIAL_CALLBACK + suffix)).rejects.toThrow(); expect(h.request).not.toHaveBeenCalled(); await h.transport.cancel();
  });
  it('rejects custom scheme host/path ambiguity and expired, replay, wrong purpose', async () => {
    const h = harness(new Map(), null, 'android'); await h.transport.start('google', 'login');
    for (const url of ['com.paranstudio.dosirak://other/social?code=fixture-code','other://auth/social?code=fixture-code','com.paranstudio.dosirak://auth/other?code=fixture-code']) await expect(h.transport.consume(url)).rejects.toThrow();
    h.env.now = () => Date.now() + 700_000; await expect(h.transport.consume(h.callback())).rejects.toThrow(); expect(h.request).not.toHaveBeenCalled(); await h.transport.cancel();
    await expect(h.transport.start('google', 'delete-reauth' as 'login')).rejects.toThrow();
  });
  it('rejects wrong-code PKCE, wrong provider identity and changed owner without adopting', async () => {
    const h = harness(); await h.transport.start('google', 'login'); await expect(h.transport.consume(h.callback().replace('fixture-code','other-code'))).rejects.toThrow(); expect(h.env.adopt).not.toHaveBeenCalled();
    const p = harness(); await p.transport.start('google', 'login'); const wrong = session(); wrong.user = user(UID, 'apple') as Session['user']; p.respond(wrong); await expect(p.transport.consume(p.callback())).rejects.toThrow('identity'); expect(p.env.adopt).not.toHaveBeenCalled();
    const owner = harness(new Map(), session()); await owner.transport.start('google', 'link'); owner.setCurrent(session(OTHER)); await expect(owner.transport.consume(owner.callback())).rejects.toThrow('Account changed'); expect(owner.env.adopt).not.toHaveBeenCalled();
  });
  it('exact provider cancellation clears only its verifier and preserves the primary record',async()=>{
    const h=harness(new Map([['bento-auth:v1','original']]));await h.transport.start('google','login');
    await expect(h.transport.consume(config.webCallback+'&error=access_denied')).rejects.toThrow();
    expect(JSON.parse(h.shared.get(SOCIAL_TRANSACTION_KEY)!).verifiers).toEqual({});expect(h.shared.get('bento-auth:v1')).toBe('original');expect(h.env.adopt).not.toHaveBeenCalled();
  });
  it('single pending transaction survives restart and cannot be overwritten or borrowed', async () => {
    const h = harness(); await h.transport.start('google', 'login'); const cold = harness(h.shared);
    await expect(cold.transport.start('apple', 'login')).rejects.toThrow('already pending'); expect(cold.env.open).not.toHaveBeenCalled(); await cold.transport.cancel(); await h.transport.cancel();
  });
  it('persistence and crypto failure never opens browser and never removes primary credentials', async () => {
    const h = harness(new Map([['bento-auth:v1','primary']])); h.port.setItem.mockRejectedValue(new Error('locked')); await expect(h.transport.start('google','login')).rejects.toThrow(); expect(h.env.open).not.toHaveBeenCalled(); expect(h.shared.get('bento-auth:v1')).toBe('primary');
    const c = harness(); vi.spyOn(crypto.subtle, 'digest').mockRejectedValueOnce(new Error('digest denied')); await expect(c.transport.start('google','login')).rejects.toThrow(); expect(c.env.open).not.toHaveBeenCalled();
  });
  it('callback during Browser.open completion exchanges exactly once and close event cannot cancel it', async () => {
    const h = harness(new Map(), null, 'android'); let callback!: Promise<void>;
    vi.mocked(h.env.open).mockImplementation(async () => { callback = h.transport.consume(h.callback()); });
    vi.mocked(h.env.close).mockImplementation(async () => { expect(h.transport.acceptingBrowserClose).toBe(false); });
    await h.transport.start('google','login'); await callback; expect(h.env.adopt).toHaveBeenCalledOnce();
  });
  it('cancel before transaction allocation stops start, and concurrent starts cannot replace it', async () => {
    const h=harness();let release!:()=>void;let entered=false;
    h.env.session=()=>new Promise(resolve=>{entered=true;release=()=>resolve(null)});
    const start=h.transport.start('google','login');await vi.waitFor(()=>expect(entered).toBe(true));
    await expect(h.transport.start('google','login')).rejects.toThrow('already pending');await h.transport.cancel();release();
    await expect(start).rejects.toThrow('cancelled');expect(h.env.open).not.toHaveBeenCalled();expect(h.request).not.toHaveBeenCalled();expect(h.shared.size).toBe(0);
  });
  it('cancelled delayed exchange prevents restart until old SDK work has drained', async () => {
    const h=harness();await h.transport.start('google','login');let release!:()=>void;let entered=false;const request=h.env.fetch!;
    h.env.fetch=async(input,init)=>{if(String(input).includes('/token?')){entered=true;await new Promise<void>(done=>{release=done})}return request(input,init)};
    // Start's client captured the first fetch wrapper, which dispatches through env.fetch dynamically.
    const callback=h.transport.consume(h.callback());await vi.waitFor(()=>expect(entered).toBe(true));await h.transport.cancel();
    await expect(h.transport.start('google','login')).rejects.toThrow('already pending');release();await expect(callback).rejects.toThrow();expect(h.env.adopt).not.toHaveBeenCalled();
    await h.transport.start('google','login');expect(h.transport.pending).toBe(true);await h.transport.cancel();
  });
  it('does not report cancellation once verified primary adoption has begun', async () => {
    const h=harness();await h.transport.start('google','login');let release!:()=>void;let entered=false;
    vi.mocked(h.env.adopt).mockImplementation(async()=>{entered=true;await new Promise<void>(done=>{release=done})});
    const callback=h.transport.consume(h.callback());await vi.waitFor(()=>expect(entered).toBe(true));
    await expect(h.transport.cancel()).rejects.toThrow('adoption');release();await callback;await expect(h.transport.cancel()).rejects.toThrow('adoption');
  });
  it('cancel during terminal persistence wins over adoption', async () => {
    const h = harness(); await h.transport.start('google','login'); const set = h.port.setItem.getMockImplementation()!;
    let release!: () => void; let entered = false;
    h.port.setItem.mockImplementation(async (key,value) => { if (JSON.parse(value).tx.phase === 'complete') { entered = true; await new Promise<void>(done => { release = done; }); } await set(key,value); });
    const callback = h.transport.consume(h.callback()); await vi.waitFor(() => expect(entered).toBe(true)); const cancel = h.transport.cancel(); release();
    await expect(callback).rejects.toThrow('cancelled'); await cancel; expect(h.env.adopt).not.toHaveBeenCalled();
  });
});
describe('social readiness and callback entry', () => {
  it('defaults disabled, keeps iOS Apple hidden, validates deletion readiness and release callback', () => {
    expect(enabledSocialProviders(socialConfig,'web')).toEqual([]); expect(enabledSocialProviders(config,'ios')).toEqual(['google']);
    expect(() => validateSocialConfig({...config,socialDeletionReady:false})).toThrow();
    for(const host of ['app.ts.net:8443','app.internal','example.com']) expect(() => validateSocialConfig({...config,webCallback:`https://${host}/?bento_social=1`},true)).toThrow();
    expect(() => validateSocialConfig({...config,webCallback:'https://app.ts.net:8443/?bento_social=1'})).not.toThrow();
  });
  it('scrubs fixed social callback before consumers but leaves implicit recovery untouched', async () => {
    vi.stubGlobal('location',{href: config.webCallback+'&code=secret-code'}); const replace = vi.fn(); vi.stubGlobal('history',{state:null,replaceState:replace});
    const e = webSocialEntry(config); expect(replace).toHaveBeenCalledWith(null,'','/'); const consume=vi.fn(async()=>{}); await e.connect(consume,async()=>{}); expect(consume).toHaveBeenCalledOnce();
    replace.mockClear(); vi.stubGlobal('location',{href:'https://play.fixture.dev/#type=recovery&access_token=email-token'}); webSocialEntry(); expect(replace).not.toHaveBeenCalled();
  });
  it('cold and warm duplicate route once, rejects unknown paths and remains usable after consumer rejection', async () => {
    let receive!:(url:string)=>void; const api={platform:'ios',onURL:async(fn:typeof receive)=>{receive=fn},launchURL:async()=>NATIVE_SOCIAL_CALLBACK+'?code=one',onFinished:async()=>{},open:async()=>{},close:async()=>{}};
    const e=await nativeSocialEntry(api); receive(NATIVE_SOCIAL_CALLBACK+'?code=one'); receive('com.paranstudio.dosirak://other/social?code=bad'); const consumer=vi.fn(async()=>{throw Error('rejected')}); await e.connect(consumer,async()=>{}); expect(consumer).toHaveBeenCalledTimes(1);
    receive(NATIVE_SOCIAL_CALLBACK+'?code=two'); await vi.waitFor(()=>expect(consumer).toHaveBeenCalledTimes(2));
  });
});
