import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountSync, type CloudRemote, type CloudSave, type PutResult } from '../src/account/sync.ts';
import { saveStatusLabel } from '../src/account/save-status.ts';
import { configureSaveScope, scopedStorage } from '../src/account/scope.ts';
import { validSnapshot, type Snapshot } from '../src/game/save.ts';
import { newGame } from '../src/game/state.ts';
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const snapshot = (hearts = 3): Snapshot => ({ version: 1, run: newGame(5), dex: { menus: [], endings: [], events: [], plays: 0, hearts, owned: [], equip: {}, photos: {} }, prefs: {} });
function store() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
function server(initial: Snapshot | null = null) {
  let current: CloudSave = { revision: initial ? 1 : 0, snapshot: initial, updated_at: null };
  const ops = new Map<string, { revision: number; value: Snapshot }>();
  const remote: CloudRemote = {
    get: vi.fn(async () => structuredClone(current)),
    put: vi.fn(async (revision, operation, value): Promise<PutResult> => {
      const previous = ops.get(operation);
      if (previous) {
        if (JSON.stringify(previous.value) !== JSON.stringify(value)) throw Error('operation mismatch');
        return { ...current, status: 'saved', duplicate: true, operation_revision: previous.revision };
      }
      if (revision !== current.revision) return { ...current, status: 'conflict' };
      current = { revision: revision + 1, snapshot: structuredClone(value), updated_at: 'now' };
      ops.set(operation, { revision: current.revision, value: structuredClone(value) });
      return { ...current, status: 'saved', duplicate: false, operation_revision: current.revision };
    }),
  };
  return { remote, current: () => current, ops };
}
const clients: AccountSync[] = [];
function client(storage = store(), remote = server().remote, install = vi.fn(async (_s: Snapshot) => {}), who = owner) {
  const c = new AccountSync(who, storage, remote, install);
  clients.push(c);
  return { c, storage, remote, install };
}
afterEach(() => { clients.forEach(c => c.stop()); clients.length = 0; vi.useRealTimers(); vi.unstubAllGlobals(); configureSaveScope(); });

describe('account-scoped durable sync', () => {
  it('does not upload defaults or guest data until explicit choice', async () => {
    const { c, remote, install } = client();
    await c.start();
    expect(c.mode).toBe('choose');
    c.offer(snapshot()); await c.flush();
    expect(remote.put).not.toHaveBeenCalled(); expect(install).not.toHaveBeenCalled();
    expect(await c.choose(snapshot())).toBe(true);
    expect(remote.put).toHaveBeenCalledTimes(1); expect(c.dirty).toBe(false);
  });
  it('restores another device from validated cloud before starting gameplay', async () => {
    const s = server(snapshot(50)); const { c, install } = client(store(), s.remote);
    await c.start(); expect(install).toHaveBeenCalledExactlyOnceWith(snapshot(50));
    expect(c.mode).toBe('ready'); expect(c.revision).toBe(1);
  });
  it('blocks first start on network/read failure instead of writing default progress', async () => {
    const s = server(); s.remote.get = vi.fn(async () => { throw Error('offline'); });
    const { c } = client(store(), s.remote); await c.start(); c.offer(snapshot()); await c.flush();
    expect(c.mode).toBe('blocked'); expect(s.remote.put).not.toHaveBeenCalled();
  });
  it('preserves both untracked local and cloud records as a conflict; does not add hearts', async () => {
    const { c, storage, install, remote } = client(store(), server(snapshot(99)).remote);
    await c.start(snapshot(10)); expect(c.mode).toBe('conflict'); expect(install).not.toHaveBeenCalled();
    await c.choose(c.remoteCandidate!, true);
    expect(install).toHaveBeenCalledWith(snapshot(99)); expect(remote.put).not.toHaveBeenCalled();
    const archive = [...storage.data.entries()].find(([key]) => key.includes(':conflict:'))!;
    expect(JSON.parse(archive[1]).latest.dex.hearts).toBe(10);
  });
  it('retries ambiguous committed operation with the exact ID/body after restart', async () => {
    const storage = store(); const s = server(); const realPut = s.remote.put;
    s.remote.put = vi.fn(async (...args: Parameters<CloudRemote['put']>) => { await realPut(...args); throw Error('lost ack'); });
    const one = client(storage, s.remote).c; await one.start(); await one.choose(snapshot(6));
    const op = JSON.parse(storage.getItem(one.key)!).flight;
    expect(s.current().revision).toBe(1); one.stop();
    const retryPut = vi.fn(realPut); s.remote.put = retryPut;
    const two = client(storage, s.remote).c; await two.start(snapshot(6));
    expect(retryPut).toHaveBeenCalledWith(op.revision, op.id, op.snapshot);
    expect(s.current().revision).toBe(1); expect(two.dirty).toBe(false);
  });
  it('turns a duplicate ack of an older operation into conflict instead of rolling back the newer server', async () => {
    const storage = store(); const s = server(); const realPut = s.remote.put;
    s.remote.put = async (...args: Parameters<CloudRemote['put']>) => { await realPut(...args); throw Error('lost ack'); };
    const one = client(storage, s.remote).c; await one.start(); await one.choose(snapshot(6)); one.stop();
    await realPut(1, crypto.randomUUID(), snapshot(20)); s.remote.put = realPut;
    const two = client(storage, s.remote).c; await two.start(snapshot(6));
    expect(two.mode).toBe('conflict'); expect(two.localCandidate?.dex.hearts).toBe(6); expect(two.remoteCandidate?.dex.hearts).toBe(20);
  });
  it('preserves a newer checkpoint while an older write is in flight', async () => {
    const s = server(snapshot()); const storage = store(); const { c } = client(storage, s.remote); await c.start();
    let release!: (result: PutResult) => void;
    s.remote.put = vi.fn(() => new Promise<PutResult>(resolve => { release = resolve; }));
    c.offer(snapshot(4)); const pending = c.flush(); c.offer(snapshot(5));
    release({ status: 'saved', revision: 2, snapshot: snapshot(4), updated_at: 'now' }); await pending;
    expect(c.localCandidate?.dex.hearts).toBe(5); expect(c.dirty).toBe(true);
  });
  it('durably preserves offline writes, then coalesces continuous checkpoints on a throttle', async () => {
    vi.useFakeTimers(); const s = server(snapshot()); const { c, storage } = client(store(), s.remote); await c.start();
    for (let n = 0; n < 5; n++) { c.offer(snapshot(n + 10)); await vi.advanceTimersByTimeAsync(500); }
    expect(s.remote.put).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(c.key)!).latest.dex.hearts).toBe(14);
    await vi.advanceTimersByTimeAsync(500); expect(s.current().snapshot?.dex.hearts).toBe(14);
  });
  it('never sends after stop or applies a late response across logout', async () => {
    const s = server(snapshot()); const { c, storage } = client(store(), s.remote); await c.start();
    let release!: (v: PutResult) => void;
    s.remote.put = vi.fn(() => new Promise<PutResult>(resolve => { release = resolve; }));
    c.offer(snapshot(8)); const pending = c.flush(); const before = storage.getItem(c.key);
    c.stop(); release({ status: 'saved', revision: 2, snapshot: snapshot(8), updated_at: 'now' }); await pending;
    expect(storage.getItem(c.key)).toBe(before); c.offer(snapshot(100)); await c.flush(); expect(s.remote.put).toHaveBeenCalledTimes(1);
    const b = client(storage, server().remote, vi.fn(async () => {}), other).c; await b.start();
    expect(b.mode).toBe('choose'); expect(b.localCandidate).toBeUndefined();
  });
  it('refuses network writes when the operation cannot first be persisted', async () => {
    const storage = store(); const s = server(snapshot()); const { c } = client(storage, s.remote); await c.start();
    storage.setItem = () => { throw Error('quota'); }; c.offer(snapshot(9)); await c.flush();
    expect(c.mode).toBe('blocked'); expect(s.remote.put).not.toHaveBeenCalled();
  });
  it('blocks corrupt journal and malformed cloud response without touching original bytes', async () => {
    const storage = store(); const key = `bento-cloud:${owner}:journal:v1`; storage.setItem(key, '{broken');
    expect(() => client(storage)).toThrow(); expect(storage.getItem(key)).toBe('{broken');
    const s = server(); s.remote.get = async () => ({ revision: 2, snapshot: { version: 1 } as Snapshot, updated_at: null });
    const { c, install } = client(store(), s.remote); await c.start(); expect(c.mode).toBe('blocked'); expect(install).not.toHaveBeenCalled();
  });
  it('does not make a new operation merely because jsonb reorders object keys', async () => {
    const original = snapshot(); const reordered = { prefs: original.prefs, dex: original.dex, run: original.run, version: 1 } as Snapshot;
    const { c, remote } = client(store(), server(reordered).remote); await c.start(); c.offer(original); await c.flush();
    expect(remote.put).not.toHaveBeenCalled();
  });
  it('resumes a chosen cloud save after install failure without uploading the previous canonical', async () => {
    const s = server(snapshot(99)); const storage = store();
    const failedInstall = vi.fn(async (_s: Snapshot) => { throw Error('native write failed'); });
    const one = client(storage, s.remote, failedInstall).c;
    await one.start(snapshot(10)); expect(await one.choose(snapshot(99), true)).toBe(false);
    expect(JSON.parse(storage.getItem(one.key)!).choice.snapshot.dex.hearts).toBe(99);
    one.stop();
    const { c: two, install } = client(storage, s.remote);
    await two.start(snapshot(10));
    expect(install).toHaveBeenCalledExactlyOnceWith(snapshot(99)); expect(s.remote.put).not.toHaveBeenCalled();
    expect(two.mode).toBe('ready'); expect(two.revision).toBe(1);
  });
  it('replays pending choice if install succeeded but final journal commit failed', async () => {
    const s = server(snapshot(99)); const storage = store(); const realSet = storage.setItem;
    let failFinal = false;
    storage.setItem = (key, value) => { if (failFinal && key.endsWith(':journal:v1') && !JSON.parse(value).choice) throw Error('quota'); realSet(key, value); };
    const install = vi.fn(async (_s: Snapshot) => { failFinal = true; });
    const one = client(storage, s.remote, install).c; await one.start(snapshot(10));
    expect(await one.choose(snapshot(99), true)).toBe(false); one.stop(); failFinal = false;
    const two = client(storage, s.remote).c; await two.start(snapshot(99));
    expect(two.mode).toBe('ready'); expect(s.remote.put).not.toHaveBeenCalled();
  });
  it('never sends an in-memory flight on retry until that exact operation is durable', async () => {
    const s = server(snapshot()); const storage = store(); const realSet = storage.setItem;
    const { c } = client(storage, s.remote); await c.start(); c.offer(snapshot(40));
    storage.setItem = (key, value) => { if (JSON.parse(value).flight) throw Error('quota'); realSet(key, value); };
    await c.flush(); expect(c.mode).toBe('blocked'); expect(s.remote.put).not.toHaveBeenCalled();
    await c.start(snapshot(40)); expect(s.remote.put).not.toHaveBeenCalled();
    await c.start(snapshot(40)); expect(s.remote.put).not.toHaveBeenCalled();
    storage.setItem = realSet; await c.start(snapshot(40));
    expect(s.remote.put).toHaveBeenCalledTimes(1); expect(c.dirty).toBe(false);
  });
  it('pauses on server schema rejection while retaining the same operation for diagnosis', async () => {
    const s = server(snapshot());
    const { c, storage } = client(store(), s.remote); await c.start();
    s.remote.put = async () => { throw Object.assign(Error('schema'), { code: '22023' }); };
    c.offer(snapshot(25)); await c.flush();
    expect(c.mode).toBe('blocked');
    expect(JSON.parse(storage.getItem(c.key)!).flight.snapshot.dex.hearts).toBe(25);
  });
  it('does not silently report a too-large local snapshot as already synced', async () => {
    const s = server(snapshot()); const { c } = client(store(), s.remote); await c.start();
    c.offer({ ...snapshot(), prefs: { note: 'x'.repeat(1024 * 1024) } });
    expect(c.mode).toBe('blocked'); expect(s.remote.put).not.toHaveBeenCalled();
  });
  it('rejects unrelated top-level data and oversized snapshots', () => {
    expect(validSnapshot({ ...snapshot(), access_token: 'never-export' })).toBe(false);
    expect(validSnapshot({ ...snapshot(), prefs: { note: 'x'.repeat(1024 * 1024) } })).toBe(false);
  });
  it('isolates recovery/game keys from guest, other account and auth storage', () => {
    const data = new Map<string, string>([['bento-life:snapshot:v1', 'guest'], ['bento-auth:v1', 'token']]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k), get length() { return data.size; }, key: (i: number) => [...data.keys()][i] ?? null });
    configureSaveScope(owner); scopedStorage.setItem('bento-life:snapshot:v1', 'A');
    configureSaveScope(other); expect(scopedStorage.getItem('bento-life:snapshot:v1')).toBeNull(); scopedStorage.setItem('bento-life:snapshot:v1', 'B');
    expect(scopedStorage.length).toBe(1); expect(scopedStorage.key(0)).toBe('bento-life:snapshot:v1');
    configureSaveScope(); expect(scopedStorage.getItem('bento-life:snapshot:v1')).toBe('guest'); expect(data.get('bento-auth:v1')).toBe('token');
  });
});


describe('visible save evidence', () => {
  const local = { errors: [] as string[], blocked: false, recovered: false, pending: false };
  const label = (sync?: AccountSync, overrides: Record<string, unknown> = {}) => saveStatusLabel({ local, signedIn: !!sync, unavailable: false, online: true, sync, ...overrides });
  it('never equates guest storage or signing in with a confirmed account save', async () => {
    expect(label()).toBe('이 기기에만 저장 · 계정 보관 안 됨');
    expect(label(undefined, { signedIn: true })).toBe('계정 저장 확인 중');
    const { c } = client(); await c.start();
    expect(label(c)).toBe('계정에 보관할 진행 선택 필요');
  });
  it('keeps ambiguous ACK and newer unsent changes pending, then confirms only latest server acknowledgement', async () => {
    const s = server(snapshot()); const { c } = client(store(), s.remote); await c.start();
    expect(label(c)).toBe('계정에 저장됨');
    const realPut = s.remote.put;
    s.remote.put = async (...args) => { await realPut(...args); throw Error('lost ack'); };
    c.offer(snapshot(7)); await c.flush();
    expect(c.mode).toBe('ready'); // This status must not force offline gameplay to stop.
    expect(label(c)).toBe('기기에 저장됨 · 계정 전송 대기');
    expect(c.hasConfirmedSave).toBe(false);
    s.remote.put = realPut; await c.flush();
    expect(label(c)).toBe('계정에 저장됨');
    c.offer(snapshot(8));
    expect(label(c)).toBe('기기에 저장됨 · 계정에 저장 중');
    expect(label(c, { online: false })).toBe('기기에 저장됨 · 계정 전송 대기');
  });
  it('local storage failures and writes take precedence over an earlier cloud ACK', async () => {
    const { c } = client(store(), server(snapshot()).remote); await c.start();
    expect(label(c, { local: { ...local, pending: true } })).toBe('기기에 저장 중');
    expect(label(c, { local: { ...local, errors: ['quota'], pending: true } })).toBe('기기 저장 오류 · 확인이 필요해요');
    expect(label(c, { local: { ...local, blocked: true } })).toBe('기기 저장 오류 · 확인이 필요해요');
    expect(label(c, { unavailable: true })).toBe('계정 확인 필요 · 기기 기록은 유지해요');
  });
});
