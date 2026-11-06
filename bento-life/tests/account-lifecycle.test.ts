import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AccountSync, type CloudRemote } from '../src/account/sync.ts';
import { RuntimeWriteGate, needsFreshRuntime } from '../src/account/runtime-gate.ts';
import { configureSaveScope } from '../src/account/scope.ts';
import { currentSnapshot, saveSnapshot, writeKey, SNAPSHOT_KEY, type Snapshot } from '../src/game/save.ts';
import { newGame } from '../src/game/state.ts';
const owner = '11111111-1111-4111-8111-111111111111';
const value = (hearts: number): Snapshot => ({ version: 1, run: newGame(20), dex: { menus: [], endings: [], events: [], plays: 0, hearts, owned: [], equip: {}, photos: {} }, prefs: {} });
let data: Map<string, string>;
const clients: AccountSync[] = [];
beforeEach(() => {
  data = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, v: string) => data.set(key, v), removeItem: (key: string) => data.delete(key), get length() { return data.size; }, key: (i: number) => [...data.keys()][i] ?? null });
  configureSaveScope(owner);
});
afterEach(() => { clients.forEach(c => c.stop()); clients.length = 0; configureSaveScope(); vi.unstubAllGlobals(); });
function harness(remote: CloudRemote, gate: RuntimeWriteGate) {
  const store = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, v: string) => { data.set(key, v); } };
  const sync = new AccountSync(owner, store, remote, async snapshot => { gate.freeze(); writeKey(SNAPSHOT_KEY, JSON.stringify(snapshot)); });
  clients.push(sync); return sync;
}
it('guest import → reload pagehide from empty old main → restart preserves imported progress', async () => {
  const gate = new RuntimeWriteGate();
  const oldMain = value(0); const oldGeneration = gate.capture();
  const cloud = value(77);
  let server: Snapshot | null = null;
  const remote: CloudRemote = { get: async () => ({ revision: server ? 1 : 0, snapshot: server, updated_at: null }), put: vi.fn(async (_revision, _id, snapshot) => { server = snapshot; return { status: 'saved' as const, revision: 1, snapshot, updated_at: 'now' }; }) };
  const sync = harness(remote, gate); await sync.start(); await sync.choose(cloud);
  // Exact production lifecycle gate around main.persist invoked by pagehide.
  if (gate.allows(oldGeneration)) saveSnapshot(oldMain.run, oldMain.dex, oldMain.prefs);
  expect(currentSnapshot()?.dex.hearts).toBe(77); sync.stop();
  const restarted = harness(remote, new RuntimeWriteGate()); await restarted.start(currentSnapshot());
  expect((server as Snapshot | null)?.dex.hearts).toBe(77); expect(remote.put).toHaveBeenCalledTimes(1);
});
it('conflict remote choice → pagehide cannot reinstate stale local snapshot or upload it after restart', async () => {
  const gate = new RuntimeWriteGate(); gate.activate(); const oldGeneration = gate.capture();
  const oldMain = value(10); saveSnapshot(oldMain.run, oldMain.dex, oldMain.prefs);
  const cloud = value(99);
  const remote: CloudRemote = { get: async () => ({ revision: 4, snapshot: cloud, updated_at: 'now' }), put: vi.fn(async () => { throw Error('must not upload'); }) };
  const sync = harness(remote, gate); await sync.start(currentSnapshot()); await sync.choose(cloud, true);
  if (gate.allows(oldGeneration)) saveSnapshot(oldMain.run, oldMain.dex, oldMain.prefs);
  expect(currentSnapshot()?.dex.hearts).toBe(99); sync.stop();
  const reboot = harness(remote, new RuntimeWriteGate()); await reboot.start(currentSnapshot());
  expect(remote.put).not.toHaveBeenCalled(); expect(currentSnapshot()?.dex.hearts).toBe(99);
});
it('initial offline boot → retry restore retires the empty main generation until a fresh runtime loads', async () => {
  const gate = new RuntimeWriteGate(); const oldGeneration = gate.capture(); let offline = true;
  const cloud = value(88);
  const remote: CloudRemote = { get: async () => { if (offline) throw Error('offline'); return { revision: 2, snapshot: cloud, updated_at: 'now' }; }, put: vi.fn(async () => { throw Error('must not upload'); }) };
  const sync = harness(remote, gate); await sync.start(); expect(sync.mode).toBe('blocked');
  offline = false; await sync.start();
  expect(gate.allows(oldGeneration)).toBe(false); expect(currentSnapshot()?.dex.hearts).toBe(88);
  gate.activate(); expect(gate.allows(oldGeneration)).toBe(false); expect(gate.allows(gate.capture())).toBe(true);
  expect(remote.put).not.toHaveBeenCalled();
});
it('logout explicitly persists the current checkpoint before retiring all late lifecycle writes', () => {
  const gate = new RuntimeWriteGate(); gate.activate(); const generation = gate.capture(); const latest = value(40);
  if (gate.allows(generation)) saveSnapshot(latest.run, latest.dex, latest.prefs);
  gate.freeze();
  if (gate.allows(generation)) saveSnapshot(value(0).run, value(0).dex, {});
  expect(currentSnapshot()?.dex.hearts).toBe(40);
});

it('deletion retires the runtime before removing its namespace so late pagehide cannot recreate it', () => {
  const gate = new RuntimeWriteGate(); gate.activate(); const generation = gate.capture();
  const oldMain = value(51); saveSnapshot(oldMain.run, oldMain.dex, oldMain.prefs);
  gate.freeze(); data.clear();
  if (gate.allows(generation)) saveSnapshot(oldMain.run, oldMain.dex, oldMain.prefs);
  expect(data.size).toBe(0);
});

it('blocked durable-outbox boot → quota recovery without install starts a new writable runtime', async () => {
  const gate = new RuntimeWriteGate(); const blockedMain = gate.capture();
  const latest = value(56); const confirmed = value(55);
  data.set(`bento-cloud:${owner}:journal:v1`, JSON.stringify({ version: 1, owner, revision: 1, confirmed, latest, chosen: true }));
  let quota = true;
  const install = vi.fn(async (_value: Snapshot) => {});
  const remote: CloudRemote = { get: vi.fn(async () => ({ revision: 1, snapshot: confirmed, updated_at: null })), put: vi.fn(async (_rev, _id, snapshot) => ({ status: 'saved' as const, revision: 2, snapshot, updated_at: null })) };
  const sync = new AccountSync(owner, { getItem: key => data.get(key) ?? null, setItem: (key, raw) => { if (quota) throw Error('quota'); data.set(key, raw); } }, remote, install);
  clients.push(sync); await sync.start(latest);
  expect(sync.mode).toBe('blocked'); expect(remote.put).not.toHaveBeenCalled();
  const readyAtBoot = sync.mode === 'ready';
  quota = false; await sync.start(latest);
  expect(sync.mode).toBe('ready'); expect(install).not.toHaveBeenCalled();
  expect(needsFreshRuntime(readyAtBoot, false, sync.mode === 'ready')).toBe(true);
  gate.activate();
  expect(gate.allows(blockedMain)).toBe(false);
  if (gate.allows(gate.capture())) saveSnapshot(latest.run, latest.dex, {});
  expect(currentSnapshot()?.dex.hearts).toBe(56);
});
