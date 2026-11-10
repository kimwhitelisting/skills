import { afterEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../src/game/state.ts';
import { SNAPSHOT_KEY, type Snapshot } from '../src/game/save.ts';
import { activateGuestRecord, collectGuestRecovery, guestNeedsResolution, inspectGuestRecords } from '../src/account/guest-records.ts';
const UID = '12345678-1234-1234-1234-123456789abc';
const PREFIX = `bento-account:${UID}:`;
const snapshot = (hearts: number): Snapshot => ({ version: 1, run: newGame(42), dex: { menus: [], endings: [], events: [], plays: 1, hearts, owned: [], equip: {}, photos: {} }, prefs: { seenIntro: true } });
function stores(webData: [string, string][] = [], nativeData: [string, string][] = []) {
  const webMap = new Map(webData), nativeMap = new Map(nativeData);
  const web = { getItem: vi.fn((key: string) => webMap.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { webMap.set(key, value); }), removeItem: vi.fn((key: string) => { webMap.delete(key); }), get length() { return webMap.size; }, key: (i: number) => [...webMap.keys()][i] ?? null };
  const native = { get: vi.fn(async (key: string) => nativeMap.get(key) ?? null), set: vi.fn(async (key: string, value: string) => { nativeMap.set(key, value); }), remove: vi.fn(async (key: string) => { nativeMap.delete(key); }) };
  return { web, native, webMap, nativeMap };
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); vi.doUnmock('@supabase/supabase-js'); });
describe('read-only native guest boundary', () => {
  it('reads native-only full and legacy records without auth/account keys or writes', async () => {
    const s = stores([], [[SNAPSHOT_KEY, JSON.stringify(snapshot(9))], ['bento-auth:v1', 'not-game'], [PREFIX + SNAPSHOT_KEY, JSON.stringify(snapshot(80))]]);
    const records = await inspectGuestRecords(s.native, s.web);
    expect(records.map(r => r.status)).toEqual(['absent', 'ready']);
    expect(records[1].snapshot?.dex.hearts).toBe(9);
    expect(s.native.get.mock.calls.map(([key]) => key)).toEqual([SNAPSHOT_KEY]);
    expect(s.native.set).not.toHaveBeenCalled(); expect(s.web.setItem).not.toHaveBeenCalled();
    s.nativeMap.delete(SNAPSHOT_KEY); s.nativeMap.set('bento-life:run:v2', JSON.stringify(snapshot(9).run)); s.nativeMap.set('bento-life:dex:v1', JSON.stringify(snapshot(9).dex));
    expect((await inspectGuestRecords(s.native, s.web))[1].snapshot?.dex.hearts).toBe(9);
  });
  it('distinguishes absent, corruption and read failure; does not silently use legacy after damaged full save', async () => {
    const s = stores([[SNAPSHOT_KEY, '{bad']], [['bento-life:dex:v1', JSON.stringify(snapshot(8).dex)]]);
    s.webMap.set('bento-life:dex:v1', JSON.stringify(snapshot(1).dex));
    expect((await inspectGuestRecords(s.native, s.web)).map(r => r.status)).toEqual(['damaged', 'ready']);
    s.native.get.mockRejectedValue(new Error('locked'));
    expect((await inspectGuestRecords(s.native, s.web)).map(r => r.status)).toEqual(['damaged', 'unavailable']);
    expect(s.webMap.get(SNAPSHOT_KEY)).toBe('{bad'); expect(s.native.set).not.toHaveBeenCalled();
  });
  it('never ranks divergent valid snapshots by age/hearts and preserves exact originals before explicit activation', async () => {
    const older = JSON.stringify(snapshot(2), null, 2), later = JSON.stringify(snapshot(9));
    const s = stores([[SNAPSHOT_KEY, older]], [[SNAPSHOT_KEY, later]]);
    const records = await inspectGuestRecords(s.native, s.web); expect(guestNeedsResolution(records)).toBe(true);
    await activateGuestRecord(records, 'native', s.native, s.web);
    expect(s.webMap.get(SNAPSHOT_KEY)).toBe(later); expect(s.nativeMap.get(SNAPSHOT_KEY)).toBe(later);
    expect([...s.webMap].some(([key, value]) => key.includes(':recovery:') && value === older)).toBe(true);
    expect([...s.nativeMap].some(([key, value]) => key.includes(':recovery:') && value === later)).toBe(true);
    expect(guestNeedsResolution(await inspectGuestRecords(s.native, s.web))).toBe(false);
  });
  it('blocks unreadable sources, changed selections, account changes and failed archive read-back before canonical writes', async () => {
    const s = stores([[SNAPSHOT_KEY, JSON.stringify(snapshot(2))]], [[SNAPSHOT_KEY, JSON.stringify(snapshot(9))]]);
    const records = await inspectGuestRecords(s.native, s.web);
    await expect(activateGuestRecord(records, 'native', s.native, s.web, () => false)).rejects.toThrow('Account changed');
    s.native.get.mockRejectedValueOnce(new Error('locked'));
    await expect(activateGuestRecord(records, 'native', s.native, s.web)).rejects.toThrow();
    s.nativeMap.set(SNAPSHOT_KEY, JSON.stringify(snapshot(10)));
    await expect(activateGuestRecord(records, 'native', s.native, s.web)).rejects.toThrow('changed');
    const next = await inspectGuestRecords(s.native, s.web);
    s.native.set.mockImplementation(async () => {}); // a broken adapter resolves without persisting
    await expect(activateGuestRecord(next, 'native', s.native, s.web)).rejects.toThrow('archive');
    expect(s.webMap.get(SNAPSHOT_KEY)).toBe(JSON.stringify(snapshot(2)));
    expect(s.nativeMap.get(SNAPSHOT_KEY)).toBe(JSON.stringify(snapshot(10)));
    expect(s.native.set.mock.calls.every(([key]) => key.includes(':recovery:'))).toBe(true);
  });
  it('stops before canonical writes if the source changes while archives are being stored', async () => {
    const s = stores([[SNAPSHOT_KEY, JSON.stringify(snapshot(2))]], [[SNAPSHOT_KEY, JSON.stringify(snapshot(9))]]);
    const records = await inspectGuestRecords(s.native, s.web), set = s.native.set.getMockImplementation()!;
    s.native.set.mockImplementation(async (key, value) => { await set(key, value); if (key.includes(':recovery:')) s.nativeMap.set(SNAPSHOT_KEY, JSON.stringify(snapshot(10))); });
    await expect(activateGuestRecord(records, 'native', s.native, s.web)).rejects.toThrow('changed');
    expect(s.webMap.get(SNAPSHOT_KEY)).toBe(JSON.stringify(snapshot(2)));
    expect(s.nativeMap.get(SNAPSHOT_KEY)).toBe(JSON.stringify(snapshot(10)));
    expect(s.native.set.mock.calls.every(([key]) => key.includes(':recovery:'))).toBe(true);
  });
  it('reuses content archives through quota-limited retries and verifies collisions before reuse', async () => {
    const s = stores([[SNAPSHOT_KEY, JSON.stringify(snapshot(2))]], [[SNAPSHOT_KEY, JSON.stringify(snapshot(9))]]);
    const records = await inspectGuestRecords(s.native, s.web), set = s.web.setItem.getMockImplementation()!;
    s.web.setItem.mockImplementation((key, value) => { if (!s.webMap.has(key) && s.webMap.size >= 2) throw Error('quota'); set(key, value); });
    s.native.set.mockRejectedValue(new Error('native full'));
    for (let i = 0; i < 6; i++) await expect(activateGuestRecord(records, 'native', s.native, s.web)).rejects.toThrow('native full');
    expect(s.webMap.size).toBe(2); expect(s.web.setItem).toHaveBeenCalledTimes(1);
    expect(s.webMap.get(SNAPSHOT_KEY)).toBe(JSON.stringify(snapshot(2)));
    const archive = [...s.webMap.keys()].find(key => key.includes(':recovery:'))!;
    s.webMap.set(archive, 'different colliding bytes');
    s.web.setItem.mockImplementation(set);
    await expect(activateGuestRecord(records, 'native', s.native, s.web)).rejects.toThrow('native full');
    expect(s.webMap.get(archive)).toBe('different colliding bytes');
    expect([...s.webMap].some(([key, value]) => key !== SNAPSHOT_KEY && value === JSON.stringify(snapshot(2)))).toBe(true);
  });
  it('compares full and legacy snapshot shapes structurally while retaining strict raw selection checks', async () => {
    const value = snapshot(9), s = stores([[SNAPSHOT_KEY, JSON.stringify(value)]], [['bento-life:run:v2', JSON.stringify(value.run)], ['bento-life:dex:v1', JSON.stringify(value.dex)], ['bento-life:prefs:v1', JSON.stringify(value.prefs)]]);
    const records = await inspectGuestRecords(s.native, s.web); expect(guestNeedsResolution(records)).toBe(false);
    s.webMap.set(SNAPSHOT_KEY, JSON.stringify(value, null, 2));
    await expect(activateGuestRecord(records, 'native', s.native, s.web)).rejects.toThrow('changed');
  });
  it('keeps game-valid oversized/additive records playable while declaring them cloud-ineligible, not damaged', async () => {
    const oversized = snapshot(9); oversized.run!.log.push({ age: 0, text: 'x'.repeat(1024 * 1024) });
    const s = stores([[SNAPSHOT_KEY, JSON.stringify(oversized)]], [[SNAPSHOT_KEY, JSON.stringify({ ...snapshot(2), extra: 'retained' })]]);
    const records = await inspectGuestRecords(s.native, s.web);
    expect(records.map(r => [r.status, r.cloudEligible])).toEqual([['ready', false], ['ready', false]]);
    await activateGuestRecord(records, 'web', s.native, s.web);
    expect(JSON.parse(s.nativeMap.get(SNAPSHOT_KEY)!).run.log.at(-1).text.length).toBe(1024 * 1024);
  });
  it('exports only readable guest originals/recovery archives and marks failures without reading credentials', async () => {
    const archive = SNAPSHOT_KEY + ':recovery:guest-original';
    const s = stores([[SNAPSHOT_KEY, '{broken'], ['bento-life:run:v2', 'legacy-exact'], [SNAPSHOT_KEY + ':last-good', 'backup-exact'], ['bento-auth:v1', 'web-secret'], [PREFIX + SNAPSHOT_KEY, 'other-account']], [[archive, 'native-old'], ['native:' + archive, 'older-native'], ['unsaved:' + archive, 'unsaved-original'], ['bento-auth:v1', 'native-secret'], [PREFIX + archive, 'other-secret']]);
    const native = { ...s.native, keys: async () => [...s.nativeMap.keys()] };
    const get = s.native.get.getMockImplementation()!;
    s.native.get.mockImplementation(async key => { if (key === SNAPSHOT_KEY) throw Error('unreadable'); return get(key); });
    const result = await collectGuestRecovery(native, s.web), parsed = JSON.parse(result.json);
    expect(result.partial).toBe(true); expect(parsed.sources[0].originals[SNAPSHOT_KEY]).toBe('{broken');
    expect(parsed.sources[0].originals['bento-life:run:v2']).toBe('legacy-exact'); expect(parsed.sources[0].originals[SNAPSHOT_KEY + ':last-good']).toBe('backup-exact');
    expect(parsed.sources[1].unreadableOriginalKeys).toContain(SNAPSHOT_KEY);
    expect(parsed.sources[1].archives[archive]).toBe('native-old');
    expect(parsed.sources[1].archives['native:' + archive]).toBe('older-native'); expect(parsed.sources[1].archives['unsaved:' + archive]).toBe('unsaved-original');
    expect(result.json).not.toMatch(/web-secret|native-secret|other-secret|other-account/);
    expect(s.native.get.mock.calls.every(([key]) => !key.startsWith('bento-auth:') && !key.startsWith('bento-account:'))).toBe(true);
    expect(s.native.set).not.toHaveBeenCalled(); expect(s.web.setItem).not.toHaveBeenCalled();
  });
  it('reports WebView getter/read failure as unavailable and still exports native records', async () => {
    const s = stores([], [[SNAPSHOT_KEY, JSON.stringify(snapshot(9))]]);
    s.web.getItem.mockImplementation(() => { throw Error('blocked'); });
    expect((await inspectGuestRecords(s.native, s.web))[0].status).toBe('unavailable');
    vi.stubGlobal('localStorage', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw Error('denied global'); } });
    expect((await inspectGuestRecords(s.native))[0].status).toBe('unavailable');
    const result = await collectGuestRecovery({ ...s.native, keys: async () => [] });
    expect(result.partial).toBe(true); expect(result.json).toContain('unavailable'); expect(result.json).toContain('hearts');
  });
  it('stops on identity change during guest activation after archive write, before any canonical write', async () => {
    const s = stores([[SNAPSHOT_KEY, JSON.stringify(snapshot(2))]], [[SNAPSHOT_KEY, JSON.stringify(snapshot(9))]]), records = await inspectGuestRecords(s.native, s.web);
    let active = true; const set = s.native.set.getMockImplementation()!;
    s.native.set.mockImplementation(async (key, value) => { await set(key, value); active = false; });
    await expect(activateGuestRecord(records, 'native', s.native, s.web, () => active)).rejects.toThrow('Account changed');
    expect(s.nativeMap.get(SNAPSHOT_KEY)).toBe(JSON.stringify(snapshot(9))); expect(s.webMap.get(SNAPSHOT_KEY)).toBe(JSON.stringify(snapshot(2)));
    expect(s.native.set.mock.calls.every(([key]) => key.includes(':recovery:'))).toBe(true);
  });
  it('an interrupted activation retains both exact originals and can be safely retried', async () => {
    const webOriginal = JSON.stringify(snapshot(2)), nativeOriginal = JSON.stringify(snapshot(9));
    const s = stores([[SNAPSHOT_KEY, webOriginal]], [[SNAPSHOT_KEY, nativeOriginal]]);
    const records = await inspectGuestRecords(s.native, s.web), set = s.web.setItem.getMockImplementation()!;
    s.web.setItem.mockImplementation((key, value) => { if (key === SNAPSHOT_KEY) throw Error('quota'); set(key, value); });
    await expect(activateGuestRecord(records, 'native', s.native, s.web)).rejects.toThrow('quota');
    expect(s.webMap.get(SNAPSHOT_KEY)).toBe(webOriginal);
    expect([...s.webMap].some(([key, value]) => key.includes(':recovery:') && value === webOriginal)).toBe(true);
    expect([...s.nativeMap].some(([key, value]) => key.includes(':recovery:') && value === nativeOriginal)).toBe(true);
    s.web.setItem.mockImplementation(set);
    await activateGuestRecord(await inspectGuestRecords(s.native, s.web), 'native', s.native, s.web);
    expect(s.webMap.get(SNAPSHOT_KEY)).toBe(nativeOriginal);
  });
});

async function boot(s: ReturnType<typeof stores>, signedIn = true, cloud: Snapshot | null = null) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://guesttest.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_synthetic_test');
  const reload = vi.fn(), signOut = vi.fn(async () => ({ error: null }));
  const handlers = new Map<string, (e: unknown) => void>();
  const panel = { innerHTML: '', hidden: true, setAttribute: vi.fn(), contains: () => false, addEventListener: (event: string, fn: (e: unknown) => void) => handlers.set(event, fn) };
  const app = { textContent: '' };
  const put = vi.fn();
  let authChange: (event: string, session: unknown) => void = () => {};
  vi.stubGlobal('localStorage', s.web);
  vi.stubGlobal('navigator', { onLine: true, locks: { request: (_name: string, _opts: unknown, fn: (lock: object) => Promise<void>) => fn({}) } });
  vi.stubGlobal('location', { origin: 'https://guest.test', pathname: '/', hash: '', reload });
  vi.stubGlobal('window', { addEventListener: vi.fn(), dispatchEvent: vi.fn() });
  vi.stubGlobal('document', { getElementById: (id: string) => id === 'app' ? app : null, createElement: () => panel, body: { append: vi.fn() }, querySelectorAll: () => [], activeElement: undefined });
  vi.stubGlobal('fetch', vi.fn(async (_url: unknown, options: RequestInit) => {
    const data = JSON.parse(String(options.body));
    if ('p_snapshot' in data) { put(data.p_snapshot); return new Response(JSON.stringify({ status: 'saved', revision: data.p_expected_revision + 1, snapshot: data.p_snapshot, updated_at: null })); }
    return new Response(JSON.stringify({ revision: cloud ? 1 : 0, snapshot: cloud, updated_at: null }));
  }));
  vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getSession: async () => ({ data: { session: signedIn ? { user: { id: UID, email: 'fixture@example.test' }, access_token: 'synthetic' } : null }, error: null }), onAuthStateChange: (fn: typeof authChange) => { authChange = fn; }, signOut }, functions: { invoke: vi.fn() } }) }));
  const account = await import('../src/account/account.ts');
  const mounted = await account.bootAccount(s.native);
  const click = (action: string) => handlers.get('click')!({ target: { closest: () => ({ dataset: { account: action } }) } });
  return { ...account, mounted, panel, reload, signOut, put, click, changeAccount: () => authChange('SIGNED_OUT', null) };
}
describe('actual account boot and import with native storage contract', () => {
  it('signed-in cold boot sees native-only guest and imports into only the chosen account namespace', async () => {
    const bytes = JSON.stringify(snapshot(9)); const s = stores([], [[SNAPSHOT_KEY, bytes]]);
    const h = await boot(s); expect(h.panel.innerHTML).toContain('기기 앱 저장소'); expect(h.panel.innerHTML).toContain('하트 9');
    expect(s.webMap.has(SNAPSHOT_KEY)).toBe(false); expect(s.nativeMap.get(SNAPSHOT_KEY)).toBe(bytes);
    h.click('guest-native'); await vi.waitFor(() => expect(h.reload).toHaveBeenCalled());
    expect(JSON.parse(s.nativeMap.get(PREFIX + SNAPSHOT_KEY)!).dex.hearts).toBe(9);
    expect(s.nativeMap.get(SNAPSHOT_KEY)).toBe(bytes); expect(s.webMap.has(SNAPSHOT_KEY)).toBe(false); expect(h.put).toHaveBeenCalledWith(snapshot(9));
  });
  it('presents stale WebView and different native records explicitly; rechecks and refuses changed candidate', async () => {
    const s = stores([[SNAPSHOT_KEY, JSON.stringify(snapshot(2))]], [[SNAPSHOT_KEY, JSON.stringify(snapshot(9))]]);
    const h = await boot(s); expect(h.panel.innerHTML).toContain('서로 다른'); expect(h.panel.innerHTML).toContain('하트 2'); expect(h.panel.innerHTML).toContain('하트 9');
    s.nativeMap.set(SNAPSHOT_KEY, JSON.stringify(snapshot(10))); h.click('guest-native');
    await vi.waitFor(() => expect(h.panel.innerHTML).toContain('다시 표시한 기록'));
    expect(h.put).not.toHaveBeenCalled(); expect(s.nativeMap.has(PREFIX + SNAPSHOT_KEY)).toBe(false);
    h.click('guest-native'); await vi.waitFor(() => expect(h.reload).toHaveBeenCalled()); expect(h.put).toHaveBeenCalledWith(snapshot(10));
    expect(JSON.parse(s.webMap.get(SNAPSHOT_KEY)!).dex.hearts).toBe(2);
  });
  it('does not import a candidate after identity changes during its native reread', async () => {
    const s = stores([], [[SNAPSHOT_KEY, JSON.stringify(snapshot(9))]]), h = await boot(s);
    let release!: (value: string | null) => void;
    s.native.get.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    h.click('guest-native'); await vi.waitFor(() => expect(release).toBeDefined());
    h.changeAccount(); release(JSON.stringify(snapshot(9)));
    await vi.waitFor(() => expect(h.reload).toHaveBeenCalled());
    expect(h.put).not.toHaveBeenCalled(); expect(s.nativeMap.has(PREFIX + SNAPSHOT_KEY)).toBe(false);
  });
  it('reports damaged and unreadable guest separately while preserving an existing account restore', async () => {
    const s = stores([[SNAPSHOT_KEY, '{bad']], []);
    const get = s.native.get.getMockImplementation()!; s.native.get.mockImplementation(async key => { if (!key.startsWith(PREFIX)) throw Error('locked guest'); return get(key); });
    const h = await boot(s, true, snapshot(80)); h.openAccount();
    expect(h.panel.innerHTML).toContain('손상'); expect(h.panel.innerHTML).toContain('없는지는 아직 알 수 없어요');
    expect(h.panel.innerHTML).not.toContain('게스트 기록이 없어요'); expect(h.panel.innerHTML).not.toContain('data-account="guest-native"');
    expect(JSON.parse(s.nativeMap.get(PREFIX + SNAPSHOT_KEY)!).dex.hearts).toBe(80); expect(s.webMap.get(SNAPSHOT_KEY)).toBe('{bad');
  });
  it('logout preserves guest and account copies, then native-only guest reboot hydrates the guest scope', async () => {
    const bytes = JSON.stringify(snapshot(9)); const s = stores([], [[SNAPSHOT_KEY, bytes]]);
    const h = await boot(s, true, snapshot(80)); h.click('logout'); await vi.waitFor(() => expect(h.reload).toHaveBeenCalled());
    expect(h.signOut).toHaveBeenCalledWith({ scope: 'local' }); expect(s.nativeMap.get(SNAPSHOT_KEY)).toBe(bytes);
    const next = await boot(s, false); expect(next.mounted).toBe(true);
    const { currentSnapshot } = await import('../src/game/save.ts'); expect(currentSnapshot()?.dex.hearts).toBe(9);
    expect(JSON.parse(s.nativeMap.get(PREFIX + SNAPSHOT_KEY)!).dex.hearts).toBe(80);
  });
  it('guest reboot blocks divergent mirrors before storage hydration; explicit activation preserves and reloads', async () => {
    const old = JSON.stringify(snapshot(2)), next = JSON.stringify(snapshot(9)); const s = stores([[SNAPSHOT_KEY, old]], [[SNAPSHOT_KEY, next]]);
    const h = await boot(s, false); expect(h.mounted).toBe(false); expect(h.accountBlocked()).toBe(true);
    expect(s.native.set).not.toHaveBeenCalled(); expect(s.web.setItem).not.toHaveBeenCalled();
    h.click('guest-native'); await vi.waitFor(() => expect(h.reload).toHaveBeenCalled());
    expect(s.webMap.get(SNAPSHOT_KEY)).toBe(next);
    expect([...s.webMap].some(([key, value]) => key.includes(':recovery:') && value === old)).toBe(true);
    const resumed = await boot(s, false); expect(resumed.mounted).toBe(true);
  });
  it('reboot after a real partial activation keeps the displaced native original and resumes the explicit web choice', async () => {
    const webOriginal = JSON.stringify(snapshot(2)), nativeOriginal = JSON.stringify(snapshot(9));
    const s = stores([[SNAPSHOT_KEY, webOriginal]], [[SNAPSHOT_KEY, nativeOriginal]]);
    const records = await inspectGuestRecords(s.native, s.web), set = s.web.setItem.getMockImplementation()!;
    s.web.setItem.mockImplementation((key, value) => { if (key === SNAPSHOT_KEY) throw Error('interrupted'); set(key, value); });
    await expect(activateGuestRecord(records, 'web', s.native, s.web)).rejects.toThrow('interrupted');
    expect(s.nativeMap.get(SNAPSHOT_KEY)).toBe(webOriginal); // Canonical bytes really changed.
    expect([...s.nativeMap].some(([key, value]) => key.includes(':recovery:') && value === nativeOriginal)).toBe(true);
    expect([...s.webMap].some(([key, value]) => key.includes(':recovery:') && value === webOriginal)).toBe(true);
    s.web.setItem.mockImplementation(set);
    const next = await boot(s, false); expect(next.mounted).toBe(true);
    const { currentSnapshot } = await import('../src/game/save.ts'); expect(currentSnapshot()?.dex.hearts).toBe(2);
    expect([...s.nativeMap].some(([key, value]) => key.includes(':recovery:') && value === nativeOriginal)).toBe(true);
  });
  it('early guest guard exports through a late-registered native transport and keeps partial wording truthful', async () => {
    const s = stores([[SNAPSHOT_KEY, JSON.stringify(snapshot(2))]], []); s.native.get.mockRejectedValue(new Error('unavailable'));
    const h = await boot(s, false); expect(h.mounted).toBe(false);
    const { registerRecoveryTransport } = await import('../src/ui/recovery-export.ts');
    const transport = vi.fn(async (_json: string) => ({ status: 'share-returned' as const, message: '공유 창을 닫았어요. 파일 위치를 확인해 주세요.' }));
    registerRecoveryTransport(transport); h.click('guest-export');
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(h.panel.innerHTML).toContain('읽지 못한 출처·항목은 파일에 포함되지 않았고'));
    expect(JSON.parse(transport.mock.calls[0][0]).partial).toBe(true); expect(h.reload).not.toHaveBeenCalled();
    expect(s.native.set).not.toHaveBeenCalled(); expect(s.web.setItem).not.toHaveBeenCalled();
  });
  it('signed-in import labels a locally valid cloud-ineligible source without offering its import button', async () => {
    const s = stores([], [[SNAPSHOT_KEY, JSON.stringify({ ...snapshot(9), extra: 'local extension' })]]);
    const h = await boot(s); expect(h.panel.innerHTML).toContain('손상된 기록은 아니며');
    expect(h.panel.innerHTML).not.toContain('data-account="guest-native"');
    h.click('guest-native'); await new Promise(resolve => setTimeout(resolve, 10));
    expect(h.put).not.toHaveBeenCalled(); expect(s.nativeMap.has(PREFIX + SNAPSHOT_KEY)).toBe(false);
  });
  it('unreadable guest reboot cannot start fresh or activate another source until it becomes readable', async () => {
    const s = stores([[SNAPSHOT_KEY, JSON.stringify(snapshot(2))]], []); s.native.get.mockRejectedValue(new Error('locked'));
    const h = await boot(s, false); expect(h.mounted).toBe(false); expect(h.panel.innerHTML).not.toContain('data-account="fresh"'); expect(h.panel.innerHTML).not.toContain('data-account="guest-web"');
    h.click('guest-web'); await vi.waitFor(() => expect(h.panel.innerHTML).toContain('보관을 마치지 못했어요'));
    expect(s.web.setItem).not.toHaveBeenCalled(); expect(s.native.set).not.toHaveBeenCalled();
    s.native.get.mockResolvedValue(null); h.click('guest-retry'); await vi.waitFor(() => expect(h.reload).toHaveBeenCalled());
  });
});

it('native entry registers share transport before a guest guard returns false', async () => {
  vi.resetModules();
  const writeFile = vi.fn(async () => ({ uri: 'file://fixture/recovery.json' }));
  const share = vi.fn(async () => ({}));
  const names = ['@capacitor/core', '@capacitor/filesystem', '@capacitor/share', '../src/account/native-auth.ts', '../src/account/account.ts'];
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
  vi.doMock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Encoding: { UTF8: 'utf8' }, Filesystem: { writeFile } }));
  vi.doMock('@capacitor/share', () => ({ Share: { canShare: async () => ({ value: true }), share } }));
  vi.doMock('../src/account/native-auth.ts', () => ({ nativeAuthStorage: async () => ({}) }));
  vi.doMock('../src/account/account.ts', () => ({ bootAccount: async () => {
    const { RecoveryExporter } = await import('../src/ui/recovery-export.ts');
    await new RecoveryExporter(() => '{"fixture":true}').run(); return false;
  } }));
  try {
    vi.stubGlobal('document', { createElement: () => { throw Error('browser default must not run'); } });
    await import('../src/entry-app.ts');
    await vi.waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({ data: '{"fixture":true}' }));
  } finally { for (const name of names) vi.doUnmock(name); }
});
