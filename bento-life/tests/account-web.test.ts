import { describe, it, expect, vi, afterEach } from 'vitest';
import { accountWebConfig } from '../scripts/account-web-config.ts';
import { AccountWebController, PasswordRejected, consumeAccountURL, type AccountWebPort, type WebState } from '../src/account-web/controller.ts';
import { boundedFetch, createAccountWebPort } from '../src/account-web/client.ts';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const env = {
  BENTO_WEB_SUPABASE_URL: 'https://syntheticproject.supabase.co',
  BENTO_WEB_PUBLISHABLE_KEY: 'sb_publishable_synthetic_public',
  BENTO_WEB_RETURN_URL: 'https://accounts.bentoqa.com/',
  BENTO_WEB_SUPPORT_EMAIL: 'support@bentoqa.com',
};
const user = { id: 'synthetic-user', email: 'person@example.test' };
function harness(overrides: Partial<AccountWebPort> = {}) {
  const port: AccountWebPort = {
    login: vi.fn(async () => user), recover: vi.fn(async () => user), confirmSignup: vi.fn(async () => {}), sendReset: vi.fn(async () => {}),
    changePassword: vi.fn(async () => {}), deleteAccount: vi.fn(async () => true),
    close: vi.fn(async () => {}), discard: vi.fn(), ...overrides,
  };
  const states: WebState[] = [];
  return { port, states, controller: new AccountWebController(port, state => states.push(state)) };
}
afterEach(() => vi.unstubAllGlobals());

describe('standalone account web config', () => {
  it('requires all public fields and rejects secrets, unknown fields and private destinations', () => {
    expect(accountWebConfig('account-web', env).localOnly).toBe(false);
    for (const field of Object.keys(env)) expect(() => accountWebConfig('account-web', { ...env, [field]: '' })).toThrow();
    for (const key of [' sb_secret_private', 'sb_secret_private', 'eyJservice_role', '-----BEGIN PRIVATE KEY-----']) {
      expect(() => accountWebConfig('account-web', { ...env, BENTO_WEB_PUBLISHABLE_KEY: key })).toThrow();
    }
    expect(() => accountWebConfig('account-web', { ...env, BENTO_WEB_PASSWORD: 'no' })).toThrow();
    for (const address of ['http://public.bentoqa.com/', 'https://127.0.0.1/', 'https://phone.tail-synthetic.ts.net/', 'https://site.alt/', 'https://example.com/', 'https://accounts.bentoqa.com/?token=bad', 'https://accounts.bentoqa.com/#token', 'https://accounts.bentoqa.com/</script>']) {
      expect(() => accountWebConfig('account-web', { ...env, BENTO_WEB_RETURN_URL: address })).toThrow();
    }
    expect(() => accountWebConfig('account-web', { ...env, BENTO_WEB_SUPPORT_EMAIL: 'support@example.test' })).toThrow();
  });
  it('local build fails closed against hosted settings and service JWT', () => {
    expect(() => accountWebConfig('account-web-local', env)).toThrow();
    const local = { ...env, BENTO_WEB_SUPABASE_URL: 'http://127.0.0.1:43210', BENTO_WEB_RETURN_URL: 'http://localhost:43211/' };
    const jwt = (role: string) => `header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
    expect(accountWebConfig('account-web-local', { ...local, BENTO_WEB_PUBLISHABLE_KEY: jwt('anon') }).localOnly).toBe(true);
    expect(() => accountWebConfig('account-web-local', { ...local, BENTO_WEB_PUBLISHABLE_KEY: jwt('service_role') })).toThrow();
  });
});

describe('recovery URL consumption', () => {
  it('accepts the actual Auth optional empty sb marker but not duplicates or nonempty values', () => {
    const base = 'https://accounts.bentoqa.com/#access_token=aa.bb.cc&expires_at=2000000000&expires_in=3600&refresh_token=refresh&token_type=bearer&type=recovery';
    for (const marker of ['&sb', '&sb=']) expect(consumeAccountURL(base + marker, vi.fn()))
      .toEqual({ type: 'recovery', tokens: { access_token: 'aa.bb.cc', refresh_token: 'refresh' } });
    for (const marker of ['&sb=value', '&sb=&sb=']) {
      const scrub = vi.fn();
      expect(() => consumeAccountURL(base + marker, scrub)).toThrow();
      expect(scrub).toHaveBeenCalledExactlyOnceWith('https://accounts.bentoqa.com/');
    }
  });
  it('accepts only the supported signup and recovery callback types, preserving their purpose', () => {
    for (const type of ['signup', 'recovery']) {
      const scrub = vi.fn();
      expect(consumeAccountURL(`https://accounts.bentoqa.com/#type=${type}&token_type=bearer&access_token=aa.bb.cc&refresh_token=refresh&sb=`, scrub))
        .toEqual({ type, tokens: { access_token: 'aa.bb.cc', refresh_token: 'refresh' } });
      expect(scrub).toHaveBeenCalledExactlyOnceWith('https://accounts.bentoqa.com/');
    }
  });
  it('scrubs before parsing and only accepts unambiguous recovery tokens', () => {
    const clean = vi.fn();
    expect(consumeAccountURL('https://accounts.bentoqa.com/#type=recovery&token_type=bearer&access_token=aa.bb.cc&refresh_token=refresh', clean))
      .toEqual({ type: 'recovery', tokens: { access_token: 'aa.bb.cc', refresh_token: 'refresh' } });
    expect(clean).toHaveBeenCalledExactlyOnceWith('https://accounts.bentoqa.com/');
    for (const hash of ['#type=email&token_type=bearer&access_token=a&refresh_token=b', '#type=magiclink&token_type=bearer&access_token=a&refresh_token=b', '#type=invite&token_type=bearer&access_token=a&refresh_token=b', '#type=recovery&token_type=bearer&access_token=a&access_token=c&refresh_token=b', '#error=expired', '?code=secret', '#type=recovery&token_type=bearer&access_token=a&refresh_token=b&redirect_to=https://bad.test']) {
      const scrub = vi.fn();
      expect(() => consumeAccountURL('https://accounts.bentoqa.com/' + hash, scrub)).toThrow();
      expect(scrub).toHaveBeenCalledExactlyOnceWith('https://accounts.bentoqa.com/');
    }
  });
});

describe('explicit deletion and recovery state machine', () => {
  it('signup confirmation clears authentication and never offers password change or deletion', async () => {
    const { controller, port, states } = harness();
    await controller.confirmSignup({ access_token: 'private-token', refresh_token: 'private-refresh' });
    expect(controller.state.stage).toBe('confirmed');
    expect(controller.state.email).toBe('');
    expect(states[0].stage).toBe('verifying');
    expect(states.some(state => ['confirm', 'password'].includes(state.stage))).toBe(false);
    await controller.changePassword('passwordA', 'passwordA');
    await controller.deleteAccount('passwordA', true);
    expect(port.changePassword).not.toHaveBeenCalled();
    expect(port.deleteAccount).not.toHaveBeenCalled();
    expect(port.discard).toHaveBeenCalled();
    expect(JSON.stringify(states)).not.toContain('private-token');
  });
  it.each(['signup', 'recovery'])('failed %s verification is never success or deletion UI', async type => {
    const fail = vi.fn(async () => { throw new Error('private error'); });
    const { controller, port } = harness({ confirmSignup: fail, recover: fail });
    await (type === 'signup' ? controller.confirmSignup : controller.recover).call(controller, { access_token: 'a', refresh_token: 'r' });
    expect(controller.state.stage).toBe('link-error');
    expect(controller.state.message).not.toContain('private error');
    expect(port.discard).toHaveBeenCalled();
    expect(port.deleteAccount).not.toHaveBeenCalled();
  });
  it('invalid URLs hide deletion and dispose late confirmation without success UI', async () => {
    const invalid = harness(); invalid.controller.invalidLink();
    expect(invalid.controller.state.stage).toBe('link-error');
    let resolve!: () => void;
    const { controller, states } = harness({ confirmSignup: () => new Promise<void>(r => { resolve = r; }) });
    const pending = controller.confirmSignup({ access_token: 'a', refresh_token: 'r' });
    controller.dispose(); resolve(); await pending;
    expect(controller.state.stage).toBe('closed');
    expect(states.some(state => state.stage === 'confirmed')).toBe(false);
  });
  it('login never deletes; cancel preserves everything and requires new login', async () => {
    const { controller, port, states } = harness();
    await controller.login(user.email, 'private-password');
    expect(controller.state.stage).toBe('confirm');
    expect(port.deleteAccount).not.toHaveBeenCalled();
    await controller.deleteAccount('password', false);
    expect(port.deleteAccount).not.toHaveBeenCalled();
    await controller.cancel();
    await controller.deleteAccount('password', true);
    expect(controller.state.stage).toBe('login');
    expect(port.deleteAccount).not.toHaveBeenCalled();
    expect(JSON.stringify(states)).not.toContain('private-password');
  });
  it('sends one explicit final request and accepts only confirmed server completion', async () => {
    let resolve!: (value: boolean) => void;
    const { controller, port } = harness({ deleteAccount: vi.fn(() => new Promise<boolean>(r => { resolve = r; })) });
    await controller.login(user.email, 'password');
    const first = controller.deleteAccount('password', true);
    await controller.deleteAccount('password', true);
    expect(port.deleteAccount).toHaveBeenCalledTimes(1);
    resolve(true); await first;
    expect(controller.state.stage).toBe('deleted');
    await controller.deleteAccount('password', true);
    expect(port.deleteAccount).toHaveBeenCalledTimes(1);
  });
  it.each(['false', 'throw'])('uncertain %s deletion cannot retry without new authentication and confirmation', async failure => {
    const { controller, port } = harness({ deleteAccount: vi.fn(async () => { if (failure === 'throw') throw new Error('lost ACK'); return false; }) });
    await controller.login(user.email, 'password');
    await controller.deleteAccount('password', true);
    expect(controller.state.stage).toBe('unknown');
    expect(controller.state.message).toContain('이미 삭제');
    await controller.deleteAccount('password', true);
    expect(port.deleteAccount).toHaveBeenCalledTimes(1);
    await controller.login(user.email, 'password');
    expect(controller.state.stage).toBe('confirm');
    expect(port.deleteAccount).toHaveBeenCalledTimes(1);
  });
  it('recovery and password change never grant direct deletion; mismatch sends no update', async () => {
    const { controller, port } = harness();
    await controller.recover({ access_token: 'secret-token', refresh_token: 'refresh' });
    await controller.deleteAccount('password', true);
    expect(port.deleteAccount).not.toHaveBeenCalled();
    await controller.changePassword('passwordA', 'passwordB');
    expect(port.changePassword).not.toHaveBeenCalled();
    await controller.changePassword('passwordA', 'passwordA');
    expect(controller.state.stage).toBe('login');
    expect(port.close).toHaveBeenCalledTimes(1);
    await controller.deleteAccount('passwordA', true);
    expect(port.deleteAccount).not.toHaveBeenCalled();
  });
  it('confirmed password policy rejection retains recovery session for corrected input', async () => {
    const change = vi.fn().mockRejectedValueOnce(new PasswordRejected('password_rejected')).mockResolvedValue(undefined);
    const { controller, port } = harness({ changePassword: change });
    await controller.recover({ access_token: 'secret', refresh_token: 'secret' });
    await controller.changePassword('passwordA', 'passwordA');
    expect(controller.state.stage).toBe('password');
    expect(port.close).not.toHaveBeenCalled();
    await controller.changePassword('differentB', 'differentB');
    expect(controller.state.stage).toBe('login');
    expect(port.close).toHaveBeenCalledTimes(1);
  });
  it('unknown password-change result discards session and states uncertainty', async () => {
    const { controller, port } = harness({ changePassword: vi.fn(async () => { throw new Error('ACK lost'); }) });
    await controller.recover({ access_token: 'secret', refresh_token: 'secret' });
    await controller.changePassword('passwordA', 'passwordA');
    expect(controller.state.stage).toBe('login');
    expect(controller.state.message).toContain('변경됐을 수도');
    expect(port.close).toHaveBeenCalled();
  });
  it('pagehide retires late authentication without publishing an authenticated screen', async () => {
    let resolve!: (value: typeof user) => void;
    const { controller, states } = harness({ login: () => new Promise(r => { resolve = r; }) });
    const pending = controller.login(user.email, 'password');
    controller.dispose(); resolve(user); await pending;
    expect(controller.state.stage).toBe('closed');
    expect(states.some(state => state.stage === 'confirm')).toBe(false);
  });
});

describe('real pinned SDK adapter with isolated fetch', () => {
  const serverUser = { ...user, email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z' };
  function sdkHarness() {
    let liveId = user.id;
    let emailConfirmed = true;
    let deletion: unknown = { deleted: true };
    let passwordError: { code: string; status: number } | null = null;
    const requests: { path: string; body: unknown; authorization: string | null }[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      const headers = new Headers(init?.headers);
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
      requests.push({ path: url.pathname, body, authorization: headers.get('authorization') });
      let response: unknown;
      if (url.pathname.endsWith('/token')) response = { access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user: serverUser };
      else if (url.pathname.endsWith('/user') && init?.method === 'PUT' && passwordError) {
        return new Response(JSON.stringify({ code: passwordError.code, message: 'upstream private message', weak_password: { reasons: ['length'] } }), { status: passwordError.status, headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
      }
      else if (url.pathname.endsWith('/user')) response = { ...serverUser, id: liveId, email_confirmed_at: emailConfirmed ? serverUser.email_confirmed_at : null };
      else if (url.pathname.endsWith('/bento-delete-account')) response = deletion;
      else response = {};
      return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const port = createAccountWebPort(accountWebConfig('account-web', env), fetcher);
    return { port, requests, unconfirm: () => { emailConfirmed = false; }, changeUser: () => { liveId = 'other-user'; }, setDeletion: (value: unknown) => { deletion = value; }, setPasswordError: (code: string, status: number) => { passwordError = { code, status }; } };
  }
  it('signup completion requires the live server-confirmed account and closes its temporary session', async () => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const access_token = `${encode({alg: 'HS256'})}.${encode({sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600})}.${encode('signature')}`;
    const good = sdkHarness();
    await good.port.confirmSignup({ access_token, refresh_token: 'synthetic-refresh' });
    expect(good.requests.some(request => request.path.endsWith('/user'))).toBe(true);
    expect(good.requests.some(request => request.path.endsWith('/logout'))).toBe(true);
    expect(good.requests.some(request => request.path.includes('/functions/'))).toBe(false);
    const bad = sdkHarness(); bad.unconfirm();
    await expect(bad.port.confirmSignup({ access_token, refresh_token: 'synthetic-refresh' })).rejects.toThrow();
    expect(bad.requests.some(request => request.path.includes('/functions/'))).toBe(false);
  });
  it('never touches browser storage; uses verified identity and password-only deletion payload', async () => {
    const storage = { getItem: vi.fn(() => { throw new Error('forbidden'); }), setItem: vi.fn(() => { throw new Error('forbidden'); }), removeItem: vi.fn(() => { throw new Error('forbidden'); }) };
    vi.stubGlobal('localStorage', storage); vi.stubGlobal('sessionStorage', storage);
    const { port, requests } = sdkHarness();
    expect(await port.login(user.email, 'test-password')).toEqual(user);
    expect(await port.deleteAccount(user.id, 'test-password')).toBe(true);
    expect(requests.find(request => request.path.includes('functions'))?.body).toEqual({ password: 'test-password' });
    expect(storage.getItem).not.toHaveBeenCalled(); expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
    await port.close();
    expect(requests.find(request => request.path.endsWith('/logout'))).toBeDefined();
  });
  it('refuses changed live user and malformed deletion completion', async () => {
    const { port, requests, changeUser, setDeletion } = sdkHarness();
    await port.login(user.email, 'test-password');
    setDeletion({ deleted: 'true' });
    expect(await port.deleteAccount(user.id, 'test-password')).toBe(false);
    changeUser();
    await expect(port.deleteAccount(user.id, 'test-password')).rejects.toThrow('account_changed');
    expect(requests.filter(request => request.path.includes('functions'))).toHaveLength(1);
    port.discard();
  });
  it('classifies only SDK confirmed weak/same password rejections, not 5xx or unrelated errors', async () => {
    const { port, setPasswordError } = sdkHarness();
    await port.login(user.email, 'test-password');
    for (const code of ['weak_password', 'same_password']) {
      setPasswordError(code, 422);
      await expect(port.changePassword(user.id, 'new-password')).rejects.toBeInstanceOf(PasswordRejected);
    }
    for (const [code, status] of [['unexpected_failure', 400], ['same_password', 503]] as const) {
      setPasswordError(code, status);
      await expect(port.changePassword(user.id, 'new-password')).rejects.not.toBeInstanceOf(PasswordRejected);
    }
    port.discard();
  });
  it('ends stalled real HTTP response bodies within the request budget', async () => {
    const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.write('{'); });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as {port: number}).port;
    const begin = Date.now();
    try { await expect(boundedFetch(new AbortController().signal, fetch, 100)(`http://127.0.0.1:${port}/`)).rejects.toThrow(); }
    finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
    expect(Date.now() - begin).toBeLessThan(2000);
  });
  it('standalone imports never include game storage or native entrypoints', () => {
    for (const path of ['src/account-web/main.ts', 'src/account-web/client.ts', 'src/account-web/controller.ts']) {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toMatch(/(?:localStorage|sessionStorage|indexedDB|game\/save|account\/account|entry-app)/);
    }
  });
});
