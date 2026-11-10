import { equal } from './equal.ts';
import { SNAPSHOT_KEY, validLocalSnapshot, validSnapshot, type NativeStorage, type Snapshot } from '../game/save.ts';
import { validRun, validDex, validPrefs } from '../game/validate-save.ts';

const LEGACY_KEYS = ['bento-life:run:v2', 'bento-life:dex:v1', 'bento-life:prefs:v1'] as const;
export type GuestSource = 'web' | 'native';
export interface GuestRecord {
  source: GuestSource;
  status: 'absent' | 'ready' | 'damaged' | 'unavailable';
  raw: Record<string, string | null>;
  snapshot?: Snapshot;
  cloudEligible?: boolean;
}
export type GuestRecords = GuestRecord[];
type WebStore = Pick<Storage, 'getItem' | 'setItem'>;
const empty = (): Snapshot => ({ version: 1, dex: { menus: [], endings: [], events: [], plays: 0, hearts: 0, owned: [], equip: {}, photos: {} }, prefs: {} });
function parse(raw: Record<string, string | null>): Snapshot | undefined {
  if (raw[SNAPSHOT_KEY] !== null) {
    const value: unknown = JSON.parse(raw[SNAPSHOT_KEY]!);
    if (!validLocalSnapshot(value)) throw Error('guest damaged');
    return value;
  }
  if (LEGACY_KEYS.every(key => raw[key] === null)) return undefined;
  const value = empty();
  const [run, dex, prefs] = LEGACY_KEYS.map(key => raw[key] === null ? undefined : JSON.parse(raw[key]!));
  if (run !== undefined) { if (!validRun(run)) throw Error('guest damaged'); value.run = run; }
  if (dex !== undefined) { if (!validDex(dex)) throw Error('guest damaged'); value.dex = { ...value.dex, ...dex }; }
  if (prefs !== undefined) { if (!validPrefs(prefs)) throw Error('guest damaged'); value.prefs = prefs; }
  if (!validLocalSnapshot(value)) throw Error('guest damaged');
  return value;
}
/** Compatibility read for web callers; malformed or unreadable records never mean absent. */
export function readGuestSnapshot(store: Pick<Storage, 'getItem'> = localStorage): Snapshot | undefined {
  const raw: Record<string, string | null> = { [SNAPSHOT_KEY]: store.getItem(SNAPSHOT_KEY) };
  if (raw[SNAPSHOT_KEY] === null) for (const key of LEGACY_KEYS) raw[key] = store.getItem(key);
  return parse(raw);
}
async function inspect(source: GuestSource, get: (key: string) => string | null | Promise<string | null>): Promise<GuestRecord> {
  const raw: Record<string, string | null> = {};
  try {
    raw[SNAPSHOT_KEY] = await get(SNAPSHOT_KEY);
    if (raw[SNAPSHOT_KEY] === null) for (const key of LEGACY_KEYS) raw[key] = await get(key);
  } catch { return { source, status: 'unavailable', raw }; }
  try {
    const snapshot = parse(raw);
    return snapshot ? { source, status: 'ready', raw, snapshot, cloudEligible: validSnapshot(snapshot) } : { source, status: 'absent', raw };
  } catch { return { source, status: 'damaged', raw }; }
}
/** Reads only unprefixed guest keys. Never hydrates or switches the active game store. */
export async function inspectGuestRecords(native?: Pick<NativeStorage, 'get'>, web?: Pick<Storage, 'getItem'>): Promise<GuestRecords> {
  return Promise.all([inspect('web', key => (web ?? globalThis.localStorage).getItem(key)), ...(native ? [inspect('native', key => native.get(key))] : [])]);
}
export const sameGuestRecords = (a: GuestRecords, b: GuestRecords): boolean => JSON.stringify(a) === JSON.stringify(b);
export function guestNeedsResolution(records: GuestRecords): boolean {
  if (records.length < 2) return false;
  if (records.some(record => record.status === 'unavailable')) return true;
  const ready = records.filter(record => record.status === 'ready');
  return ready.length === 2 ? !equal(ready[0].snapshot, ready[1].snapshot)
    : ready.length === 1 && records.some(record => record.status === 'damaged');
}
/** No clock/revision exists across these mirrors; choosing one must be explicit. */
export async function activateGuestRecord(expected: GuestRecords, source: GuestSource, native: NativeStorage, web: WebStore = localStorage, active: () => boolean = () => true): Promise<void> {
  const current = await inspectGuestRecords(native, web);
  const guard = () => { if (!active()) throw Error('Account changed'); };
  guard();
  if (!sameGuestRecords(current, expected) || current.some(record => record.status === 'unavailable')) throw Error('Guest records changed or unreadable');
  const chosen = current.find(record => record.source === source && record.status === 'ready')?.snapshot;
  if (!chosen) throw Error('No valid guest record');
  // Archive exact bytes in their original stores BEFORE either canonical mirror changes.
  for (const record of current) for (const [key, value] of Object.entries(record.raw)) {
    if (value === null) continue;
    guard();
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    const get = (name: string) => record.source === 'native' ? native.get(name) : Promise.resolve(web.getItem(name));
    let attempt = 0, archive: string, stored: string | null;
    do {
      guard(); archive = `${key}:recovery:guest-${(hash >>> 0).toString(16)}:${value.length}:${attempt++}`;
      stored = await get(archive); guard();
    } while (stored !== null && stored !== value);
    if (stored === null) {
      if (record.source === 'native') await native.set(archive, value);
      else web.setItem(archive, value);
    }
    guard();
    if (await get(archive) !== value) throw Error('Guest archive read-back failed');
  }
  guard();
  // Recheck after asynchronous preservation. A competing change invalidates the selection.
  if (!sameGuestRecords(current, await inspectGuestRecords(native, web))) throw Error('Guest records changed');
  guard();
  const bytes = JSON.stringify(chosen);
  await native.set(SNAPSHOT_KEY, bytes);
  guard();
  if (await native.get(SNAPSHOT_KEY) !== bytes) throw Error('Native activation read-back failed');
  guard(); web.setItem(SNAPSHOT_KEY, bytes);
  if (web.getItem(SNAPSHOT_KEY) !== bytes) throw Error('Web activation read-back failed');
}

/** Explicit recovery export: only guest game keys and their own recovery archives. */
export async function collectGuestRecovery(native?: Pick<NativeStorage, 'get'> & { keys?(): Promise<string[]> }, web?: Pick<Storage, 'getItem' | 'length' | 'key'>): Promise<{ json: string; partial: boolean }> {
  const records = await inspectGuestRecords(native, web);
  const sources = records.map(record => ({ source: record.source, status: record.status, originals: {} as Record<string, string | null>, unreadableOriginalKeys: [] as string[], archives: {} as Record<string, string>, archiveStatus: 'read', unreadableArchiveKeys: [] as string[] }));
  const allowed = /^(?:native:|unsaved:)?bento-life:(?:snapshot:v1|run:v2|dex:v1|prefs:v1):recovery:[^\s]+$/;
  let partial = records.some(record => record.status === 'unavailable');
  for (const source of sources) {
    // Export all known originals/backups even when a full snapshot exists or is damaged.
    for (const key of [SNAPSHOT_KEY, ...LEGACY_KEYS].flatMap(key => [key, `${key}:last-good`])) {
      try { source.originals[key] = source.source === 'native' ? await native!.get(key) : (web ?? globalThis.localStorage).getItem(key); }
      catch { source.unreadableOriginalKeys.push(key); partial = true; }
    }
    let keys: string[];
    try {
      if (source.source === 'native') {
        if (!native?.keys) { source.archiveStatus = 'enumeration-unavailable'; partial = true; continue; }
        keys = await native.keys();
      } else {
        const store = web ?? globalThis.localStorage;
        keys = Array.from({ length: store.length }, (_, index) => store.key(index)).filter((key): key is string => key !== null);
      }
    } catch { source.archiveStatus = 'unavailable'; partial = true; continue; }
    for (const key of keys.filter(key => allowed.test(key))) {
      try {
        const raw = source.source === 'native' ? await native!.get(key) : (web ?? globalThis.localStorage).getItem(key);
        if (raw !== null) source.archives[key] = raw;
      } catch { source.archiveStatus = 'partial'; source.unreadableArchiveKeys.push(key); partial = true; }
    }
  }
  return { json: JSON.stringify({ version: 1, kind: 'guest-recovery', partial, sources }, null, 2), partial };
}
