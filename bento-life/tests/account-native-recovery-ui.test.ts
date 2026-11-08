import { afterEach, expect, it, vi } from 'vitest';
import { NativeAuthRecovery } from '../src/account/native-auth-recovery.ts';

vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, _key: string, options: { auth: { storage: { getItem(key: string): Promise<unknown> } } }) => ({
    auth: { stopAutoRefresh: vi.fn(async () => {}), getSession: async () => { await options.auth.storage.getItem('bento-auth:v1'); return { data: { session: null }, error: null }; } },
  }),
}));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

async function bootWithFailure(error: Error & { code: string }) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://testproject.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_synthetic_test_value');
  let time = 0;
  const handlers = new Map<string, (event: unknown) => void>();
  const panel = { innerHTML: '', hidden: true, setAttribute: vi.fn(), contains: () => false,
    addEventListener: (name: string, fn: (event: unknown) => void) => handlers.set(name, fn) };
  const game = { textContent: '' };
  const records = new Map([['bento-life:snapshot:v1', 'guest-bytes'], ['bento-cloud:owner:journal:v1', 'pending-bytes']]);
  const before = [...records];
  const reload = vi.fn();
  vi.stubGlobal('localStorage', { getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => records.set(key, value), removeItem: (key: string) => records.delete(key) });
  vi.stubGlobal('location', { origin: 'https://play.release-demo.com', pathname: '/', hash: '', reload });
  vi.stubGlobal('performance', { now: () => time });
  vi.stubGlobal('navigator', { locks: { request: (_name: string, _opts: unknown, fn: (lock: object) => Promise<void>) => fn({}) } });
  vi.stubGlobal('document', { getElementById: () => game, createElement: () => panel,
    body: { append: vi.fn() }, querySelectorAll: () => [], activeElement: undefined });
  let damaged = true;
  const port = { get: vi.fn(async () => { if (damaged) throw error; return null; }),
    remove: vi.fn(async () => { damaged = false; return true; }), set: vi.fn(async () => {}) };
  const recovery = new NativeAuthRecovery(port, 'ios');
  const { bootAccount } = await import('../src/account/account.ts');
  await bootAccount(undefined, { recovery, getItem: key => recovery.getItem(key),
    setItem: (key, value) => recovery.setItem(key, value), removeItem: key => recovery.removeItem(key) });
  const click = (action: string) => handlers.get('click')!({ target: { closest: () => ({ dataset: { account: action } }) } });
  return { panel, click, port, reload, elapsed: () => { time += 500; }, unchanged: () => expect([...records]).toEqual(before) };
}

it('the actual boot failure panel routes cancel and confirmed auth-only recovery, then reloads', async () => {
  const h = await bootWithFailure(Object.assign(new Error('Invalid data'), { code: 'invalidData' }));
  expect(h.panel.hidden).toBe(false); expect(h.panel.innerHTML).toContain('로그인 정보 복구 안내');
  h.click('native-reset'); await Promise.resolve(); expect(h.panel.innerHTML).toContain('미전송 기록은 그대로');
  h.click('native-reset-cancel'); await Promise.resolve(); h.unchanged(); expect(h.port.remove).not.toHaveBeenCalled();
  h.click('native-reset'); h.elapsed(); h.click('native-reset-confirm');
  await vi.waitFor(() => expect(h.reload).toHaveBeenCalledTimes(1));
  expect(h.port.remove).toHaveBeenCalledExactlyOnceWith('bento-auth:v1'); h.unchanged();
});

it('a locked iOS boot offers retry without a credential reset action or any deletion', async () => {
  const h = await bootWithFailure(Object.assign(new Error('An OS error occurred (-25308)'), { code: 'osError' }));
  expect(h.panel.innerHTML).toContain('잠금을 해제');
  expect(h.panel.innerHTML).not.toContain('data-account="native-reset"');
  h.click('native-reset-confirm'); await Promise.resolve(); expect(h.port.remove).not.toHaveBeenCalled();
  h.click('restart'); expect(h.reload).toHaveBeenCalledTimes(1); h.unchanged();
});
