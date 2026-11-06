import { scopedStorage } from '../account/scope.ts';
import type { GameState, Photo } from './types.ts';
import { validRun, validDex, validPrefs, object } from './validate-save.ts';
const RUN_KEY = 'bento-life:run:v2';
const DEX_KEY = 'bento-life:dex:v1';
export const PREFS_KEY = 'bento-life:prefs:v1';
export const SNAPSHOT_KEY = 'bento-life:snapshot:v1';
export const STORAGE_KEYS = [SNAPSHOT_KEY, RUN_KEY, DEX_KEY, PREFS_KEY];
export interface Snapshot {
    version: 1;
    run?: GameState;
    dex: Dex;
    prefs: unknown;
}
export interface NativeStorage {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
export interface StorageStatus {
    errors: string[];
    blocked: boolean;
    recovered: boolean;
    pending: boolean;
}
let native: NativeStorage | undefined;
let queue: Promise<void> = Promise.resolve();
let queuedWrites = 0;
const pending = new Map<string, string | null>();
const errors = new Map<string, string>();
const blocked = new Set<string>();
const loadFailures = new Set<string>();
const unsafeNative = new Set<string>();
const originals = new Map<string, string>();
const preserved = new Set<string>();
const listeners = new Set<() => void>();
let recovered = false;
const backupKey = (key: string) => `${key}:last-good`;
const check = (key: string, value: string) => { try {
    const v: unknown = JSON.parse(value);
    return key === SNAPSHOT_KEY ? object(v) && v.version === 1 && (v.run === undefined || validRun(v.run)) && validDex(v.dex) && validPrefs(v.prefs) : key === RUN_KEY ? validRun(v) : key === DEX_KEY ? validDex(v) : key === PREFS_KEY ? validPrefs(v) : true;
}
catch {
    return false;
} };
function notify(): void { for (const listener of listeners)
    listener(); }
export const storageStatus = (): StorageStatus => ({ errors: [...errors.values()], blocked: blocked.size > 0 || loadFailures.size > 0 || unsafeNative.size > 0, recovered, pending: pending.size > 0 || queuedWrites > 0 });
export const subscribeStorage = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
/** Read only this game's archived recovery keys; unrelated origin storage is never exported. */
function archivedOriginals(): Record<string, string> {
    const archived: Record<string, string> = {};
    const ownArchive = /^(?:native:|unsaved:)?bento-life:(?:snapshot:v1|run:v2|dex:v1|prefs:v1):recovery:/;
    try {
        for (let index = 0; index < scopedStorage.length; index++) {
            const key = scopedStorage.key(index);
            if (!key || !ownArchive.test(key)) continue;
            const value = scopedStorage.getItem(key);
            if (value !== null) archived[key] = value;
        }
    } catch { /* Captured originals remain exportable even if storage access is unavailable. */ }
    return archived;
}
export const recoveryExport = () => JSON.stringify({ ...archivedOriginals(), ...Object.fromEntries(originals) }, null, 2);
export const hasRecoveryOriginals = () => originals.size > 0 || Object.keys(archivedOriginals()).length > 0;
function archiveName(key: string, value: string, attempt = 0): string {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return `${key}:recovery:${(hash >>> 0).toString(16)}:${value.length}:${attempt}`;
}
function quarantine(key: string, value: string): boolean {
    const identity = key + '\0' + value;
    if (preserved.has(identity)) return true;
    originals.set(key, value);
    try {
        let attempt = 0;
        let dest = archiveName(key, value, attempt);
        let stored = scopedStorage.getItem(dest);
        while (stored !== null && stored !== value) {
            dest = archiveName(key, value, ++attempt);
            stored = scopedStorage.getItem(dest);
        }
        if (stored === null) scopedStorage.setItem(dest, value);
        preserved.add(identity);
        errors.delete(`preserve:${key}`);
        return true;
    } catch {
        errors.set(`preserve:${key}`, '손상된 저장 원본을 기기에 보관하지 못했어요. 원본을 내려받아 주세요.');
        return false;
    }
}

function readRaw(key: string): string | null {
    try {
        const value = scopedStorage.getItem(key);
        loadFailures.delete(`read:${key}`);
        if (errors.delete(`read:${key}`) && !unsafeNative.has(key))
            blocked.delete(key);
        return value;
    }
    catch {
        blocked.add(key);
        loadFailures.add(`read:${key}`);
        errors.set(`read:${key}`, '기기 저장소를 읽지 못했어요.');
        return null;
    }
}
/** Never replace an invalid original with defaults. A valid backup may be used only after preserving the original. */
function readValid(key: string): string | null {
    const raw = readRaw(key);
    if (raw === null || check(key, raw)) {
        if (raw !== null) {
            const backup = backupKey(key);
            blocked.delete(backup);
            loadFailures.delete(`read:${backup}`);
            errors.delete(`read:${backup}`);
        }
        if (!errors.has(`read:${key}`) && !unsafeNative.has(key)) {
            blocked.delete(key);
            errors.delete(`invalid:${key}`);
        }
        return raw;
    }
    const backup = readRaw(backupKey(key));
    if (!originals.has(key))
        quarantine(key, raw);
    if (backup !== null && check(key, backup)) {
        try {
            if (!quarantine(key, raw))
                throw Error('preserve');
            scopedStorage.setItem(key, backup);
            recovered = true;
            blocked.delete(key);
            errors.delete(`invalid:${key}`);
            errors.delete(`local:${key}`);
            return backup;
        }
        catch { /* keep the damaged original untouched */ }
    }
    blocked.add(key);
    errors.set(`invalid:${key}`, '저장 데이터가 손상되어 진행을 잠시 멈췄어요. 원본을 보관하고 복구가 필요해요.');
    return null;
}
export async function initializeStorage(backend?: NativeStorage): Promise<void> {
    native = backend;
    for (const key of STORAGE_KEYS) {
        const needsNativeRecovery = loadFailures.has(`native:${key}`) || loadFailures.has(`hydrate:${key}`);
        const local = readRaw(key);
        if (errors.has(`read:${key}`))
            continue;
        let remote: string | null = null;
        if (native) {
            try {
                remote = await native.get(key);
                errors.delete(`native:${key}`);
                loadFailures.delete(`native:${key}`);
                if (remote === null || check(key, remote)) {
                    unsafeNative.delete(key);
                    errors.delete(`invalid-native:${key}`);
                    loadFailures.delete(`invalid-native:${key}`);
                }
            }
            catch {
                errors.set(`native:${key}`, '앱 백업을 읽지 못했어요. 다시 시도해 주세요.');
                if (local === null || !check(key, local)) {
                    unsafeNative.add(key);
                    blocked.add(key);
                    loadFailures.add(`native:${key}`);
                }
            }
        }
        if ((needsNativeRecovery || local === null || !check(key, local)) && remote !== null && check(key, remote)) {
            if (local !== null && !quarantine(key, local)) {
                blocked.add(key);
                continue;
            }
            try {
                scopedStorage.setItem(key, remote);
                blocked.delete(key);
                errors.delete(`invalid:${key}`);
                errors.delete(`local:${key}`);
                loadFailures.delete(`hydrate:${key}`);
                recovered = true;
            }
            catch {
                errors.set(`local:${key}`, '복구한 저장을 기기에 쓰지 못했어요.');
                blocked.add(key);
                loadFailures.add(`hydrate:${key}`);
            }
        }
        else if (remote !== null && !check(key, remote)) {
            originals.set(`native:${key}`, remote);
            const identity = `native:${key}\0${remote}`;
            try {
                if (!preserved.has(identity)) {
                    let attempt = 0;
                    let dest = archiveName(key, remote, attempt);
                    let stored = await native!.get(dest);
                    while (stored !== null && stored !== remote) {
                        dest = archiveName(key, remote, ++attempt);
                        stored = await native!.get(dest);
                    }
                    if (stored === null) await native!.set(dest, remote);
                    preserved.add(identity);
                }
                errors.delete(`preserve-native:${key}`);
                if (local !== null && check(key, local)) {
                    await native!.set(key, local);
                    unsafeNative.delete(key);
                }
                else {
                    unsafeNative.add(key);
                    blocked.add(key);
                    loadFailures.add(`invalid-native:${key}`);
                    errors.set(`invalid-native:${key}`, '앱 백업이 손상되어 원본을 보관했어요. 복구 전에는 새 진행으로 덮어쓰지 않아요.');
                }
            }
            catch {
                unsafeNative.add(key);
                blocked.add(key);
                errors.set(`preserve-native:${key}`, '손상된 앱 백업 원본을 보관하지 못했어요.');
            }
        }
        const valid = readValid(key);
        if (key === SNAPSHOT_KEY && valid !== null) {
            // Legacy files remain untouched once a trusted complete snapshot supersedes them.
            // Their old read failures must not turn a recoverable snapshot into a reset offer.
            for (const legacy of [RUN_KEY, DEX_KEY, PREFS_KEY]) {
                blocked.delete(legacy);
                blocked.delete(backupKey(legacy));
                unsafeNative.delete(legacy);
                for (const failure of [...loadFailures]) {
                    if (failure.endsWith(`:${legacy}`) || failure.endsWith(`:${backupKey(legacy)}`)) loadFailures.delete(failure);
                }
                for (const error of [...errors.keys()]) {
                    if (error.endsWith(`:${legacy}`) || error.endsWith(`:${backupKey(legacy)}`)) errors.delete(error);
                }
            }
            break;
        }
    }
    notify();
}
function writeLocal(key: string, value: string | null): boolean {
    if (blocked.has(key))
        return false;
    try {
        const old = scopedStorage.getItem(key);
        if (old !== null && !check(key, old)) {
            if (!quarantine(key, old))
                return false;
            blocked.add(key);
            errors.set(`invalid:${key}`, '저장 원본이 바뀌어 덮어쓰기를 중단했어요. 다시 불러와 주세요.');
            return false;
        }
        if (old !== null && old !== value)
            scopedStorage.setItem(backupKey(key), old);
        if (value === null)
            scopedStorage.removeItem(key);
        else
            scopedStorage.setItem(key, value);
        errors.delete(`local:${key}`);
        return true;
    }
    catch {
        errors.set(`local:${key}`, '진행을 저장하지 못했어요. 앱을 닫지 말고 저장을 다시 시도해 주세요.');
        return false;
    }
}
function enqueueNative(key: string, value: string | null): void {
    if (!native)
        return;
    const backend = native;
    queuedWrites += 1;
    queue = queue.then(async () => {
        try {
            if (value === null)
                await backend.remove(key);
            else
                await backend.set(key, value);
            errors.delete(`native:${key}`);
            if (pending.get(key) === value && !errors.has(`local:${key}`))
                pending.delete(key);
        }
        catch {
            errors.set(`native:${key}`, '앱 백업을 저장하지 못했어요. 앱을 닫지 말고 다시 시도해 주세요.');
        }
        queuedWrites -= 1;
        notify();
    });
}
export function writeKey(key: string, value: string | null): void {
    if (value !== null && !check(key, value)) {
        originals.set(`unsaved:${key}`, value!);
        errors.set(`invalid-write:${key}`, '진행 데이터 형식을 확인하지 못해 저장을 중단했어요. 이전 정상 저장은 보존돼요. 재시도하거나 저장된 진행으로 돌아가 주세요.');
        notify();
        return;
    }
    errors.delete(`invalid-write:${key}`);
    pending.set(key, value);
    const ok = writeLocal(key, value);
    if (ok) {
        if (native)
            enqueueNative(key, value);
        else
            pending.delete(key);
    }
    notify();
}
export async function flushStorage(): Promise<void> { await queue; }
export async function retryStorage(): Promise<void> {
    await flushStorage();
    for (const failure of [...loadFailures]) {
        if (failure.startsWith('read:')) readRaw(failure.slice(5));
    }
    await initializeStorage(native);
    if (storageStatus().blocked) {
        notify();
        return;
    }
    errors.delete('recovery-reset');
    for (const [key, value] of [...pending]) {
        if (writeLocal(key, value)) {
            if (native)
                enqueueNative(key, value);
            else
                pending.delete(key);
        }
    }
    await flushStorage();
    notify();
}
export interface Dex {
    menus: string[];
    endings: string[];
    events: string[];
    plays: number;
    hearts: number;
    owned: string[];
    equip: {
        theme?: string;
        hat?: string;
    };
    photos: Record<string, Photo>;
}
export function readSaved<T>(key: string): T | undefined {
    const snapshot = readValid(SNAPSHOT_KEY);
    if (snapshot !== null) {
        const s = JSON.parse(snapshot) as Snapshot;
        return (key === RUN_KEY ? s.run : key === DEX_KEY ? s.dex : s.prefs) as T;
    }
    if (blocked.has(SNAPSHOT_KEY))
        return undefined;
    const raw = readValid(key);
    return raw === null ? undefined : JSON.parse(raw) as T;
}
/** One localStorage write commits run, wallet and settings together. Legacy originals are retained. */
export function saveSnapshot(run: GameState | undefined, dex: Dex, prefs: unknown): void {
    if (storageStatus().blocked || reloadRequired) {
        notify();
        return;
    }
    writeKey(SNAPSHOT_KEY, JSON.stringify({ version: 1, run, dex, prefs } satisfies Snapshot));
}
export const loadRun = () => readSaved<GameState>(RUN_KEY);
export const saveRun = (s: GameState) => writeKey(RUN_KEY, JSON.stringify(s));
export const clearRun = () => writeKey(RUN_KEY, null);
export const loadDex = (): Dex => ({ menus: [], endings: [], events: [], plays: 0, hearts: 0, owned: [], equip: {}, photos: {}, ...readSaved<Dex>(DEX_KEY) });
export const saveDex = (d: Dex) => writeKey(DEX_KEY, JSON.stringify(d));

export interface RecoveryResetPlan {
    description: string;
    retainsCollection: boolean;
}
let reloadRequired = false;
export const storageReloadRequired = () => reloadRequired;
export const hasInvalidWrite = () => [...errors.keys()].some(key => key.startsWith('invalid-write:'));

/** Only offer reset when damaged bytes are known. An unreadable authority cannot be safely discarded. */
export function recoveryResetPlan(): RecoveryResetPlan | undefined {
    if (!storageStatus().blocked || originals.size === 0)
        return undefined;
    if ([...loadFailures].some(key => key.startsWith('read:') || key.startsWith('native:') || key.startsWith('hydrate:')))
        return undefined;
    const snapshotDamaged = originals.has(SNAPSHOT_KEY) || originals.has(`native:${SNAPSHOT_KEY}`);
    const rawDex = readRaw(DEX_KEY);
    const retainsCollection = !snapshotDamaged && rawDex !== null && check(DEX_KEY, rawDex);
    return {
        retainsCollection,
        description: snapshotDamaged
            ? '손상된 통합 저장의 원본을 보관한 뒤, 이번 진행·도감·사진 수집·하트·설정을 새로 시작해요. 이 앱에서는 기존 진행으로 이어갈 수 없고 복구 원본은 보관돼요.'
            : retainsCollection
                ? '손상된 진행 원본을 보관한 뒤 새로 시작해요. 확인된 도감·사진 수집·하트와 정상 설정은 유지돼요.'
                : '손상된 원본을 보관한 뒤 새로 시작해요. 확인하지 못한 진행·도감·하트는 초기값이 되고 정상 설정은 유지돼요.',
    };
}

async function archiveNative(key: string, value: string): Promise<void> {
    if (!native)
        return;
    const identity = `native:${key}\0${value}`;
    if (preserved.has(identity))
        return;
    let attempt = 0;
    let dest = archiveName(key, value, attempt);
    let stored = await native.get(dest);
    while (stored !== null && stored !== value) {
        dest = archiveName(key, value, ++attempt);
        stored = await native.get(dest);
    }
    if (stored === null)
        await native.set(dest, value);
    preserved.add(identity);
}

/** Called only by the second confirmation. True means reload is ready, including recovery instead of reset. */
export async function confirmRecoveryReset(confirmed: boolean): Promise<boolean> {
    if (!confirmed || !storageStatus().blocked)
        return false;
    await flushStorage();
    // Storage may have recovered while the confirmation was open. Diagnose again before
    // replacing anything: a valid native/last-good source always wins over a destructive reset.
    await initializeStorage(native);
    const validSnapshot = readValid(SNAPSHOT_KEY);
    if (!storageStatus().blocked || validSnapshot !== null) {
        reloadRequired = true;
        if (!storageStatus().blocked) errors.delete('recovery-reset');
        notify();
        return !storageStatus().blocked && errors.size === 0;
    }
    const plan = recoveryResetPlan();
    if (!plan)
        return false;
    for (const [source, raw] of [...originals]) {
        if (!quarantine(source, raw))
            return false;
        try {
            await archiveNative(source.startsWith('native:') ? source.slice(7) : source, raw);
        }
        catch {
            errors.set('recovery-reset', '원본 백업에 실패해 초기화를 중단했어요. 기존 데이터는 그대로예요.');
            notify();
            return false;
        }
    }
    const allReset = originals.has(SNAPSHOT_KEY) || originals.has(`native:${SNAPSHOT_KEY}`);
    const rawDex = readRaw(DEX_KEY);
    const rawPrefs = readRaw(PREFS_KEY);
    if ([...loadFailures].some(key => key.startsWith('read:')))
        return false;
    const restoredDex: Dex = plan.retainsCollection && rawDex !== null
        ? { menus: [], endings: [], events: [], plays: 0, hearts: 0, owned: [], equip: {}, photos: {}, ...JSON.parse(rawDex) }
        : { menus: [], endings: [], events: [], plays: 0, hearts: 0, owned: [], equip: {}, photos: {} };
    const restoredPrefs = !allReset && rawPrefs !== null && check(PREFS_KEY, rawPrefs) ? JSON.parse(rawPrefs) : {};
    const payload = JSON.stringify({ version: 1, dex: restoredDex, prefs: restoredPrefs } satisfies Snapshot);
    try {
        scopedStorage.setItem(SNAPSHOT_KEY, payload);
    }
    catch {
        errors.set('recovery-reset', '새 저장을 쓰지 못해 초기화를 중단했어요. 기존 데이터는 그대로예요.');
        notify();
        return false;
    }
    blocked.clear();
    loadFailures.clear();
    unsafeNative.clear();
    errors.clear();
    pending.clear();
    reloadRequired = true;
    recovered = true;
    pending.set(SNAPSHOT_KEY, payload);
    if (native)
        enqueueNative(SNAPSHOT_KEY, payload);
    else
        pending.delete(SNAPSHOT_KEY);
    await flushStorage();
    notify();
    return errors.size === 0;
}

/** Only the same validated game snapshot is eligible for cloud sync; tokens never belong here. */
export function validSnapshot(value: unknown): value is Snapshot {
    return object(value) && value.version === 1 && (value.run === undefined || validRun(value.run)) && validDex(value.dex) && validPrefs(value.prefs)
        && Object.keys(value).every(key => ['version', 'run', 'dex', 'prefs'].includes(key))
        && new TextEncoder().encode(JSON.stringify(value)).length <= 1024 * 1024;
}
export function currentSnapshot(): Snapshot | undefined {
    const raw = readValid(SNAPSHOT_KEY);
    if (raw === null) return undefined;
    const value: unknown = JSON.parse(raw);
    return check(SNAPSHOT_KEY, raw) ? value as Snapshot : undefined;
}
