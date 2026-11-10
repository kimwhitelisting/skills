import { SNAPSHOT_KEY, validSnapshot, type NativeStorage, type Snapshot } from '../game/save.ts';
import { validRun, validDex, validPrefs } from '../game/validate-save.ts';

const LEGACY_KEYS = ['bento-life:run:v2', 'bento-life:dex:v1', 'bento-life:prefs:v1'] as const;
export type GuestSource = 'web' | 'native';
export interface GuestRecord {
  source: GuestSource;
  status: 'absent' | 'ready' | 'damaged' | 'unavailable';
  raw: Record<string, string | null>;
  snapshot?: Snapshot;
}
export type GuestRecords = GuestRecord[];
type WebStore = Pick<Storage, 'getItem' | 'setItem'>;
const empty = (): Snapshot => ({ version: 1, dex: { menus: [], endings: [], events: [], plays: 0, hearts: 0, owned: [], equip: {}, photos: {} }, prefs: {} });
function parse(raw: Record<string, string | null>): Snapshot | undefined {
  if (raw[SNAPSHOT_KEY] !== null) {
    const value: unknown = JSON.parse(raw[SNAPSHOT_KEY]!);
    if (!validSnapshot(value)) throw Error('guest damaged');
    return value;
  }
  if (LEGACY_KEYS.every(key => raw[key] === null)) return undefined;
  const value = empty();
  const [run, dex, prefs] = LEGACY_KEYS.map(key => raw[key] === null ? undefined : JSON.parse(raw[key]!));
  if (run !== undefined) { if (!validRun(run)) throw Error('guest damaged'); value.run = run; }
  if (dex !== undefined) { if (!validDex(dex)) throw Error('guest damaged'); value.dex = { ...value.dex, ...dex }; }
  if (prefs !== undefined) { if (!validPrefs(prefs)) throw Error('guest damaged'); value.prefs = prefs; }
  if (!validSnapshot(value)) throw Error('guest damaged');
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
    return snapshot ? { source, status: 'ready', raw, snapshot } : { source, status: 'absent', raw };
  } catch { return { source, status: 'damaged', raw }; }
}
/** Reads only unprefixed guest keys. Never hydrates or switches the active game store. */
export async function inspectGuestRecords(native?: Pick<NativeStorage, 'get'>, web: Pick<Storage, 'getItem'> = localStorage): Promise<GuestRecords> {
  return Promise.all([inspect('web', key => web.getItem(key)), ...(native ? [inspect('native', key => native.get(key))] : [])]);
}
export const sameGuestRecords = (a: GuestRecords, b: GuestRecords): boolean => JSON.stringify(a) === JSON.stringify(b);
export function guestNeedsResolution(records: GuestRecords): boolean {
  if (records.length < 2) return false;
  if (records.some(record => record.status === 'unavailable')) return true;
  const ready = records.filter(record => record.status === 'ready');
  return ready.length === 2 ? JSON.stringify(ready[0].snapshot) !== JSON.stringify(ready[1].snapshot)
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
  const attempt = crypto.randomUUID();
  for (const record of current) for (const [key, value] of Object.entries(record.raw)) {
    if (value === null) continue;
    guard();
    const archive = `${key}:recovery:guest-choice-${attempt}`;
    if (record.source === 'native') { await native.set(archive, value); guard(); if (await native.get(archive) !== value) throw Error('Native archive not durable'); }
    else { web.setItem(archive, value); if (web.getItem(archive) !== value) throw Error('Web archive not durable'); }
  }
  guard();
  // Recheck after asynchronous preservation. A competing change invalidates the selection.
  if (!sameGuestRecords(current, await inspectGuestRecords(native, web))) throw Error('Guest records changed');
  guard();
  const bytes = JSON.stringify(chosen);
  await native.set(SNAPSHOT_KEY, bytes);
  guard();
  if (await native.get(SNAPSHOT_KEY) !== bytes) throw Error('Native activation not durable');
  guard(); web.setItem(SNAPSHOT_KEY, bytes);
  if (web.getItem(SNAPSHOT_KEY) !== bytes) throw Error('Web activation not durable');
}
