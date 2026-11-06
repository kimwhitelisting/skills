import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { available } from '../src/game/bento.ts';
import { newGame } from '../src/game/state.ts';
import { startGame, chooseEventOption, continueAfterEvent } from '../src/game/engine.ts';
import { validRun, validDex, validPrefs } from '../src/game/validate-save.ts';
import { captureCheckpoint, restoreCheckpoint } from '../src/game/checkpoint.ts';
import { captureFollow, restoreFollow, type FollowState } from '../src/proto/follow-checkpoint.ts';
import { TransitionGuard } from '../src/ui/transition-guard.ts';
import { playthrough } from './sim.ts';
const RUN = 'bento-life:run:v2', DEX = 'bento-life:dex:v1', PREFS = 'bento-life:prefs:v1';
let data: Map<string, string>;
let failWrite = false, failRead = false;
const dex = () => ({ menus: [], endings: [], events: [], plays: 0, hearts: 40, owned: [], equip: {}, photos: {} });
const prefs = () => ({ sound: true, haptics: true, music: true, seenTips: [], tuning: {}, seenIntro: true, seenDragHint: false });
const fresh = async () => { vi.resetModules(); return import('../src/game/save.ts'); };
beforeEach(() => {
    data = new Map();
    failWrite = false;
    failRead = false;
    vi.stubGlobal('localStorage', {
        get length() { return data.size; },
        key: (index: number) => [...data.keys()][index] ?? null,
        getItem: (key: string) => { if (failRead)
            throw Error('SecurityError'); return data.get(key) ?? null; },
        setItem: (key: string, value: string) => { if (failWrite)
            throw Error('QuotaExceededError'); data.set(key, value); },
        removeItem: (key: string) => data.delete(key),
    });
});
afterEach(() => vi.unstubAllGlobals());
describe('durable save and recovery', () => {
    it('migrates legacy keys without deleting originals and commits run/wallet/settings in one snapshot', async () => {
        const old = newGame(1);
        data.set(RUN, JSON.stringify(old));
        data.set(DEX, JSON.stringify({ hearts: 40 }));
        data.set(PREFS, JSON.stringify({ sound: false }));
        const s = await fresh();
        expect(s.loadRun()).toEqual(old);
        expect(s.loadDex().hearts).toBe(40);
        const next = structuredClone(old);
        next.money = 18;
        s.saveSnapshot(next, { ...dex(), hearts: 35 }, prefs());
        expect(data.get(RUN)).toBe(JSON.stringify(old));
        expect(s.loadRun()?.money).toBe(18);
        expect(s.loadDex().hearts).toBe(35);
    });
    it('reports quota failure, keeps prior snapshot intact, and retries the whole latest snapshot', async () => {
        const s = await fresh(), old = newGame(2);
        s.saveSnapshot(old, dex(), prefs());
        const previous = data.get(s.SNAPSHOT_KEY);
        const next = structuredClone(old);
        next.money = 11;
        failWrite = true;
        s.saveSnapshot(next, { ...dex(), hearts: 2 }, prefs());
        expect(data.get(s.SNAPSHOT_KEY)).toBe(previous);
        expect(s.storageStatus().errors.length).toBeGreaterThan(0);
        expect(s.storageStatus().pending).toBe(true);
        failWrite = false;
        await s.retryStorage();
        expect(s.loadRun()?.money).toBe(11);
        expect(s.loadDex().hearts).toBe(2);
        expect(s.storageStatus().errors).toEqual([]);
    });
    it('refuses to replace unreadable storage with a default new game', async () => {
        const s = await fresh();
        data.set(RUN, JSON.stringify(newGame(3)));
        failRead = true;
        await s.initializeStorage();
        s.loadRun();
        s.saveSnapshot(newGame(4), dex(), prefs());
        expect(s.storageStatus().blocked).toBe(true);
        expect(data.has(s.SNAPSHOT_KEY)).toBe(false);
        failRead = false;
        await s.retryStorage();
        expect(s.loadRun()?.rng).toBe(newGame(3).rng);
        expect(s.storageStatus().errors).toEqual([]);
    });
    it('quarantines malformed run/dex/prefs and blocks silent default overwrites', async () => {
        const s = await fresh();
        data.set(RUN, '{"version":2}');
        data.set(DEX, '{"equip":null}');
        data.set(PREFS, '{"seenTips":null}');
        expect(s.loadRun()).toBeUndefined();
        s.loadDex();
        s.readSaved(PREFS);
        s.saveSnapshot(newGame(5), dex(), prefs());
        expect(data.get(RUN)).toBe('{"version":2}');
        expect(data.has(s.SNAPSHOT_KEY)).toBe(false);
        expect(s.storageStatus().blocked).toBe(true);
        expect(s.hasRecoveryOriginals()).toBe(true);
    });
    it('recovers a valid native save from a corrupt local original, preserving original only once', async () => {
        const s = await fresh(), good = JSON.stringify(newGame(6));
        data.set(RUN, '{broken');
        const native = { get: async (key: string) => key === RUN ? good : null, set: vi.fn(async () => { }), remove: async () => { } };
        await s.initializeStorage(native);
        expect(s.loadRun()).toEqual(JSON.parse(good));
        expect([...data.values()]).toContain('{broken');
        const archived = [...data.keys()].filter(k => k.includes(':recovery:')).length;
        await s.retryStorage();
        expect([...data.keys()].filter(k => k.includes(':recovery:')).length).toBe(archived);
        expect(s.storageStatus().errors).toEqual([]);
    });
    it('recovers last-good snapshot and keeps corrupt snapshot bytes', async () => {
        const s = await fresh(), a = newGame(7);
        s.saveSnapshot(a, dex(), prefs());
        const b = { ...a, money: 9 };
        s.saveSnapshot(b, dex(), prefs());
        data.set(s.SNAPSHOT_KEY, '{broken-snapshot');
        expect(s.loadRun()?.money).toBe(a.money);
        expect([...data.values()]).toContain('{broken-snapshot');
        expect(s.storageStatus().recovered).toBe(true);
    });
    it('retries native read-only failures even when no pending write exists', async () => {
        const s = await fresh();
        s.saveSnapshot(newGame(8), dex(), prefs());
        let fail = true;
        const native = { get: async () => { if (fail)
                throw Error('offline'); return null; }, set: async () => { }, remove: async () => { } };
        await s.initializeStorage(native);
        expect(s.storageStatus().errors.length).toBe(1);
        expect(s.storageStatus().pending).toBe(false);
        fail = false;
        await s.retryStorage();
        expect(s.storageStatus().errors).toEqual([]);
    });
    it.each(['unreadable', 'corrupt', 'backup-unreadable', 'hydrate-failure'] as const)('never background-overwrites untrusted native authority: %s', async (mode) => {
        const s = await fresh();
        const good = JSON.stringify({ version: 1, run: { ...newGame(10), money: 19 }, dex: dex(), prefs: prefs() });
        let remote = mode === 'corrupt' ? '{broken-native' : good;
        let readFails = mode === 'unreadable' || mode === 'backup-unreadable';
        const writes: string[] = [];
        const native = { get: async (key: string) => { if (key === s.SNAPSHOT_KEY && readFails)
                throw Error('native read'); return key === s.SNAPSHOT_KEY ? remote : null; }, set: async (key: string, value: string) => { if (key === s.SNAPSHOT_KEY) {
                writes.push(value);
                remote = value;
            } }, remove: async () => { } };
        if (mode === 'backup-unreadable') {
            data.set(s.SNAPSHOT_KEY, '{corrupt');
            data.set(s.SNAPSHOT_KEY + ':last-good', JSON.stringify({ version: 1, run: { ...newGame(10), money: 3 }, dex: dex(), prefs: prefs() }));
        }
        if (mode === 'hydrate-failure')
            failWrite = true;
        await s.initializeStorage(native);
        expect(s.storageStatus().blocked).toBe(true);
        failWrite = false;
        s.saveSnapshot(s.loadRun(), s.loadDex(), prefs());
        await s.flushStorage();
        expect(writes).toEqual([]);
        readFails = false;
        remote = good;
        await s.retryStorage();
        expect(s.storageStatus().blocked).toBe(false);
        expect(s.loadRun()?.money).toBe(19);
    });
    it('keeps native authority blocked when native original quarantine fails despite a valid local fallback', async () => {
        const s = await fresh();
        const good = JSON.stringify({ version: 1, run: newGame(11), dex: dex(), prefs: prefs() });
        data.set(s.SNAPSHOT_KEY, '{local-corrupt');
        data.set(s.SNAPSHOT_KEY + ':last-good', good);
        let failArchive = true;
        let remote = '{native-corrupt';
        const originals = new Map<string, string>();
        const writes: string[] = [];
        const native = {
            get: async (key: string) => key === s.SNAPSHOT_KEY ? remote : originals.get(key) ?? null,
            set: async (key: string, value: string) => {
                if (key.includes(':recovery:')) {
                    if (failArchive) throw Error('archive failure');
                    originals.set(key, value);
                } else if (key === s.SNAPSHOT_KEY) { writes.push(value); remote = value; }
            },
            remove: async () => {},
        };
        await s.initializeStorage(native);
        expect(s.storageStatus().blocked).toBe(true);
        s.saveSnapshot(s.loadRun(), s.loadDex(), prefs());
        await s.flushStorage();
        expect(writes).toEqual([]);
        failArchive = false;
        await s.retryStorage();
        expect([...originals.values()]).toContain('{native-corrupt');
        expect(s.storageStatus().errors).toEqual([]);
        expect(s.storageStatus().blocked).toBe(false);
    });
    it('retries failed backup reads and releases the hold after canonical recovery', async () => {
        const s = await fresh();
        data.set(s.SNAPSHOT_KEY, '{corrupt');
        let failBackup = true;
        const originalGet = localStorage.getItem;
        localStorage.getItem = (key: string) => {
            if (key === s.SNAPSHOT_KEY + ':last-good' && failBackup) throw Error('backup read');
            return originalGet(key);
        };
        await s.initializeStorage();
        expect(s.storageStatus().blocked).toBe(true);
        failBackup = false;
        data.set(s.SNAPSHOT_KEY + ':last-good', JSON.stringify({ version: 1, run: newGame(12), dex: dex(), prefs: prefs() }));
        await s.retryStorage();
        expect(s.storageStatus().blocked).toBe(false);
        expect(s.storageStatus().errors).toEqual([]);
    });
    it('does not create another quarantine copy after a module/app restart', async () => {
        let s = await fresh();
        data.set(RUN, '{broken');
        s.loadRun();
        const before = [...data.keys()].filter(key => key.includes(':recovery:'));
        s = await fresh();
        s.loadRun();
        expect([...data.keys()].filter(key => key.includes(':recovery:'))).toEqual(before);
    });
    it('recovers a healthy native snapshot instead of resetting when quarantine becomes writable after confirmation opens', async () => {
        const s = await fresh();
        const good = JSON.stringify({version:1,run:newGame(16),dex:{...dex(),hearts:999},prefs:prefs()});
        const remote = new Map([[s.SNAPSHOT_KEY,good]]);
        data.set(s.SNAPSHOT_KEY,'{broken');
        let archiveFails = true;
        const originalSet = localStorage.setItem;
        localStorage.setItem = (key:string,value:string) => {
            if(archiveFails && key.includes(':recovery:')) throw Error('quota');
            originalSet(key,value);
        };
        const native = {get:async(key:string)=>remote.get(key)??null,set:async(key:string,value:string)=>{remote.set(key,value);},remove:async()=>{}};
        await s.initializeStorage(native);
        expect(s.storageStatus().blocked).toBe(true);
        archiveFails = false;
        expect(await s.confirmRecoveryReset(true)).toBe(true);
        expect(s.loadRun()).toEqual(newGame(16));
        expect(s.loadDex().hearts).toBe(999);
        expect(remote.get(s.SNAPSHOT_KEY)).toBe(good);
        expect(data.get(s.SNAPSHOT_KEY)).toBe(good);
        expect([...data.values()]).toContain('{broken');
        expect(s.storageReloadRequired()).toBe(true);
    });
    it.each([false, true])('never resets a complete snapshot that supersedes earlier broken legacy files (backup read failure: %s)', async backupReadFails => {
        const s = await fresh();
        data.set(RUN,'{legacy-broken');
        const originalGet = localStorage.getItem;
        localStorage.getItem = (key: string) => {
            if (backupReadFails && key === RUN + ':last-good') throw Error('legacy backup read');
            return originalGet(key);
        };
        await s.initializeStorage();
        const good=JSON.stringify({version:1,run:newGame(17),dex:{...dex(),hearts:111},prefs:prefs()});
        data.set(s.SNAPSHOT_KEY,good);
        expect(await s.confirmRecoveryReset(true)).toBe(true);
        expect(data.get(s.SNAPSHOT_KEY)).toBe(good);
        expect(s.loadDex().hearts).toBe(111);
        expect(data.get(RUN)).toBe('{legacy-broken');
    });
    it('does not reset on cancel and preserves a legacy run original plus valid wallet on confirmed recovery', async () => {
        const s = await fresh();
        data.set(RUN, '{corrupt-run');
        data.set(DEX, JSON.stringify({ ...dex(), hearts: 77 }));
        data.set(PREFS, JSON.stringify({ sound: false }));
        await s.initializeStorage();
        expect(s.recoveryResetPlan()?.retainsCollection).toBe(true);
        expect(await s.confirmRecoveryReset(false)).toBe(false);
        expect(data.get(RUN)).toBe('{corrupt-run');
        expect(data.has(s.SNAPSHOT_KEY)).toBe(false);
        expect(s.recoveryExport()).toContain('{corrupt-run');
        expect(await s.confirmRecoveryReset(true)).toBe(true);
        expect(s.loadRun()).toBeUndefined();
        expect(s.loadDex().hearts).toBe(77);
        expect(s.readSaved<{sound:boolean}>(PREFS)?.sound).toBe(false);
        expect(data.get(RUN)).toBe('{corrupt-run');
        expect(s.storageReloadRequired()).toBe(true);
    });
    it('clearly scopes whole corrupt snapshot reset and retains its original bytes', async () => {
        const s = await fresh();
        data.set(s.SNAPSHOT_KEY, '{bad-snapshot');
        data.set(DEX, JSON.stringify({ ...dex(), hearts: 99 }));
        await s.initializeStorage();
        expect(s.recoveryResetPlan()?.description).toContain('도감');
        expect(s.recoveryResetPlan()?.retainsCollection).toBe(false);
        expect(await s.confirmRecoveryReset(true)).toBe(true);
        expect(s.loadDex().hearts).toBe(0);
        expect([...data.values()]).toContain('{bad-snapshot');
        expect(data.get(DEX)).toContain('99');
    });
    it('refuses reset if the corrupt original cannot be preserved', async () => {
        const s = await fresh();
        data.set(RUN, '{bad');
        failWrite = true;
        await s.initializeStorage();
        expect(await s.confirmRecoveryReset(true)).toBe(false);
        expect(data.get(RUN)).toBe('{bad');
        expect(data.has(s.SNAPSHOT_KEY)).toBe(false);
    });
    it('refuses recovery reset while native authority is unreadable even if local corruption is known', async () => {
        const s = await fresh();
        data.set(s.SNAPSHOT_KEY, '{bad');
        await s.initializeStorage({get: async () => {throw Error('read');},set: async () => {},remove: async () => {}});
        expect(s.recoveryResetPlan()).toBeUndefined();
        expect(await s.confirmRecoveryReset(true)).toBe(false);
        expect(data.get(s.SNAPSHOT_KEY)).toBe('{bad');
    });
    it('refuses reset when native quarantine fails, then retries only after backup succeeds', async () => {
        const s = await fresh();
        data.set(RUN, '{bad');
        let fail = true;
        const remote = new Map<string,string>();
        const native={get:async(key:string)=>remote.get(key)??null,set:async(key:string,value:string)=>{if(fail)throw Error('native archive');remote.set(key,value);},remove:async()=>{}};
        await s.initializeStorage(native);
        expect(await s.confirmRecoveryReset(true)).toBe(false);
        expect(data.has(s.SNAPSHOT_KEY)).toBe(false);
        fail=false;
        expect(await s.confirmRecoveryReset(true)).toBe(true);
        expect([...remote.values()]).toContain('{bad');
    });
    it('keeps prior durable state for invalid writes and accepts a corrected in-memory retry', async () => {
        const s = await fresh(), previous = newGame(15);
        s.saveSnapshot(previous,dex(),prefs());
        const invalid = {...previous, child:null} as any;
        s.saveSnapshot(invalid,dex(),prefs());
        expect(s.hasInvalidWrite()).toBe(true);
        expect(s.recoveryExport()).toContain('null');
        expect(s.loadRun()).toEqual(previous);
        s.saveSnapshot({...previous,money:14},dex(),prefs());
        await s.retryStorage();
        expect(s.hasInvalidWrite()).toBe(false);
        expect(s.loadRun()?.money).toBe(14);
    });
    it('keeps archived originals exportable after reset and module reload without exporting unrelated storage', async () => {
        let s = await fresh();
        data.set(RUN, '{recovery-original');
        data.set('unrelated-secret', 'do-not-export');
        await s.initializeStorage();
        expect(await s.confirmRecoveryReset(true)).toBe(true);
        s = await fresh();
        await s.initializeStorage();
        expect(s.hasRecoveryOriginals()).toBe(true);
        expect(s.recoveryExport()).toContain('{recovery-original');
        expect(s.recoveryExport()).not.toContain('do-not-export');
        expect(s.recoveryExport()).not.toContain('unrelated-secret');
        expect(s.storageStatus().blocked).toBe(false);
    });
    it('handles native rejection and serializes queued snapshots through flush/retry', async () => {
        const s = await fresh();
        let active = 0, maxActive = 0, fail = true;
        const nativeData = new Map<string, string>();
        const native = { get: async (key: string) => nativeData.get(key) ?? null, set: async (key: string, value: string) => { active++; maxActive = Math.max(maxActive, active); await new Promise(r => setTimeout(r, 1)); active--; if (fail)
                throw Error('disk'); nativeData.set(key, value); }, remove: async () => { } };
        await s.initializeStorage(native);
        const a = newGame(9);
        s.saveSnapshot(a, dex(), prefs());
        expect(s.storageStatus().pending).toBe(true);
        await s.flushStorage();
        expect(s.storageStatus().errors.length).toBeGreaterThan(0);
        fail = false;
        s.saveSnapshot({ ...a, money: 8 }, dex(), prefs());
        s.saveSnapshot({ ...a, money: 7 }, { ...dex(), hearts: 2 }, prefs());
        await s.retryStorage();
        expect(maxActive).toBe(1);
        expect(JSON.parse(nativeData.get(s.SNAPSHOT_KEY)!).run.money).toBe(7);
        expect(s.storageStatus().errors).toEqual([]);
        expect(s.storageStatus().pending).toBe(false);
    });
});
describe('validation and UI checkpoints', () => {
    it('accepts every engine phase in 100 complete real rule simulations', () => {
        for (let seed = 1; seed <= 100; seed++)
            playthrough(seed, 'random', undefined, undefined, s => expect(validRun(JSON.parse(JSON.stringify(s))), `${seed}/${s.age}/${s.step}/${s.today?.phase}`).toBe(true));
    });
    it('validates nested fields while retaining historical partial dex/preferences', () => {
        expect(validDex({ hearts: 12 })).toBe(true);
        expect(validPrefs({ sound: false })).toBe(true);
        expect(validRun({ version: 2 })).toBe(false);
        expect(validDex({ photos: null })).toBe(false);
        expect(validPrefs({ seenTips: null })).toBe(false);
        const bad = newGame(4);
        bad.child.known.dislikes = ['missing-food'];
        expect(validRun(bad)).toBe(false);
        bad.child.known.dislikes = [];
        bad.album = [{ age: 0, menu: 'test', lunch: -1 }];
        expect(validRun(bad)).toBe(false);
    });
    it('rejects malformed optional album photo caption fields before rendering', () => {
        const saved = newGame(2);
        saved.album = [{ age: 0, menu: 'test', lunch: 2, momentKind: 'calm', moment: { broken: true } as unknown as string }];
        expect(validRun(saved)).toBe(false);
        saved.album[0].moment = '정상 문구';
        expect(validRun(saved)).toBe(true);
        saved.album[0].momentKind = null as unknown as string;
        expect(validRun(saved)).toBe(false);
        saved.album = [];
        saved.today = {reqs:[],forgot:false,phase:'morning',commute:{over:'lost',delivered:false,score:1,bond:0,indep:0,happy:0,moment:{bad:true} as unknown as string}};
        expect(validRun(saved)).toBe(false);
    });
    it('restores morning selection/tab/time only for the same valid day', () => {
        const s = startGame(newGame(1));
        chooseEventOption(s, 0);
        continueAfterEvent(s);
        const morning = { draft: { base: available(s, 'base')[0].id }, tab: 'main' as const, timer: 12.25 };
        captureCheckpoint(s, { morning });
        expect(restoreCheckpoint(JSON.parse(JSON.stringify(s)))?.morning).toEqual(morning);
        s.dayIndex++;
        expect(restoreCheckpoint(s)).toBeUndefined();
    });
    it('preserves pending event result without applying the event twice', () => {
        const s = startGame(newGame(2)), id = s.active!.id;
        const effect = chooseEventOption(s, 0);
        continueAfterEvent(s);
        const before = structuredClone(s.stats);
        captureCheckpoint(s, { eventResult: { id, emoji: '🎉', title: 'test', text: effect.text, delta: effect.delta, money: effect.money, kind: '1살' } });
        const loaded = JSON.parse(JSON.stringify(s));
        expect(restoreCheckpoint(loaded)?.eventResult?.text).toBe(effect.text);
        expect(loaded.stats).toEqual(before);
        loaded.age++;
        expect(restoreCheckpoint(loaded)).toBeUndefined();
    });
    it('rejects invalid/stale checkpoint values without rejecting otherwise valid legacy run', () => {
        const s = startGame(newGame(4));
        s.checkpoint = { version: 1, context: 'wrong', morning: { draft: {}, tab: 'base', timer: NaN } };
        expect(validRun(s)).toBe(true);
        expect(restoreCheckpoint(s)).toBeUndefined();
    });
    it('blocks click-through across a screen transition while allowing rapid ingredient changes', () => {
        const guard = new TransitionGuard();
        expect(guard.allows(0)).toBe(true);
        guard.changed('choice', 'result', 10);
        expect(guard.allows(100)).toBe(false);
        expect(guard.allows(410)).toBe(true);
        guard.changed('morning', 'morning', 420);
        expect(guard.allows(421)).toBe(true);
        guard.changed('photo', 'album', 430);
        expect(guard.allows(440)).toBe(false);
    });
});
const followState = (): FollowState => ({ phase: 'run', t: 12, px: 500, kx: 690, walking: true, dashTo: 550, lastMoveT: 11, slow: 0.2, kidState: 'look', kidTimer: 0.5, nextLook: 4, fakeOut: false, sus: 30, lostFor: 0, score: 44, nearMiss: 1, covers: [{ x: 510, e: '🌳' }], crises: [{ at: .36, emoji: '🐕', text: 'test', saved: 'yes', alone: 'alone', hurt: 'hurt', done: true }], crisis: { at: .36, emoji: '🐕', text: 'test', saved: 'yes', alone: 'alone', hurt: 'hurt', done: true }, crisisLeft: 1.25, log: ['event'], bond: 1, indep: 2, happy: 0, deliverLeft: 0, events: [{ at: .2, kind: 'dog', done: true }], dog: { left: 3, bark: .5 }, newsLeft: 1, newsUsed: true, heartAcc: .4, moment: { rank: 2, kind: 'dog', text: 'dog' }, stepAcc: .2 });
describe('follow checkpoint', () => {
    it('preserves positions, score, timers, hazards, tools and held-input reset through JSON', () => {
        const state = followState(), snapshot = captureFollow(6, state);
        const restored = restoreFollow(JSON.parse(JSON.stringify(snapshot)), 6)!;
        expect(restored).toEqual({ ...state, walking: false });
        restored.score++;
        expect(state.score).toBe(44);
    });
    it.each(['intro', 'deliver', 'over'] as const)('restores %s phase without re-awarding results', phase => {
        const state = { ...followState(), phase, over: 'school' as const, delivered: true, deliverLeft: 1.1 };
        expect(restoreFollow(captureFollow(10, state), 10)).toEqual({ ...state, walking: false });
    });
    it('rejects wrong age and malformed positions/crisis fields', () => {
        const saved = captureFollow(6, followState());
        expect(restoreFollow(saved, 15)).toBeUndefined();
        saved.state.px = NaN;
        expect(restoreFollow(saved, 6)).toBeUndefined();
        const corrupt = captureFollow(6, followState()) as any;
        corrupt.state.crisis.text = null;
        expect(restoreFollow(corrupt, 6)).toBeUndefined();
    });
});
