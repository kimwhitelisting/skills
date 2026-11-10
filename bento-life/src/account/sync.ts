import { equal } from './equal.ts';
import { validSnapshot, type Snapshot } from '../game/save.ts';
export interface CloudSave { revision: number; snapshot: Snapshot | null; updated_at: string | null }
export interface PutResult extends CloudSave { status: 'saved' | 'conflict'; duplicate?: boolean; operation_revision?: number }
export interface CloudRemote {
  get(): Promise<CloudSave>;
  put(revision: number, operation: string, snapshot: Snapshot): Promise<PutResult>;
}
interface Operation { id: string; revision: number; snapshot: Snapshot }
interface Choice { snapshot: Snapshot; useRemote: boolean; revision: number }
interface Journal { choice?: Choice; version: 1; owner: string; revision: number; confirmed: Snapshot | null; latest?: Snapshot; flight?: Operation; conflict?: CloudSave; chosen: boolean }
export type SyncMode = 'loading' | 'choose' | 'ready' | 'conflict' | 'blocked';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export function validCloud(value: unknown): value is CloudSave {
  if (!value || typeof value !== 'object') return false;
  const v = value as CloudSave;
  return Number.isSafeInteger(v.revision) && v.revision >= 0 && (v.snapshot === null ? v.revision === 0 : validSnapshot(v.snapshot))
    && (v.updated_at === null || typeof v.updated_at === 'string');
}
/** One durable journal keeps the original operation intact across ambiguous network acknowledgements. */
export class AccountSync {
  mode: SyncMode = 'loading';
  message = '계정 저장을 확인하고 있어요.';
  pending = false;
  saveIssue = false;
  private stopped = false;
  private timer?: ReturnType<typeof setTimeout>;
  private journal: Journal;
  readonly key: string;
  constructor(readonly owner: string, private store: Pick<Storage, 'getItem' | 'setItem'>, private remote: CloudRemote,
    private install: (snapshot: Snapshot) => Promise<void>, private changed: () => void = () => {}) {
    this.key = `bento-cloud:${owner}:journal:v1`;
    this.journal = { version: 1, owner, revision: 0, confirmed: null, chosen: false };
    const raw = store.getItem(this.key);
    if (raw !== null) {
      const j = JSON.parse(raw) as Journal;
      if (j.version !== 1 || j.owner !== owner || !Number.isSafeInteger(j.revision) || j.revision < 0 || typeof j.chosen !== 'boolean'
        || (j.confirmed !== null && !validSnapshot(j.confirmed)) || (j.latest && !validSnapshot(j.latest))
        || (j.flight && (!validSnapshot(j.flight.snapshot) || typeof j.flight.id !== 'string' || !Number.isSafeInteger(j.flight.revision)))
        || (j.conflict && !validCloud(j.conflict)) || (j.choice && (!validSnapshot(j.choice.snapshot) || typeof j.choice.useRemote !== 'boolean' || !Number.isSafeInteger(j.choice.revision) || j.choice.revision < 0))) throw Error('계정 저장 대기 기록을 읽지 못했어요. 원본은 보존했어요.');
      this.journal = j;
    }
  }
  get hasConfirmedSave(): boolean { return this.mode === 'ready' && this.journal.chosen && this.journal.confirmed !== null && !this.dirty; }
  get dirty(): boolean { return !!(this.journal.latest || this.journal.flight); }
  get localCandidate(): Snapshot | undefined { return this.journal.latest ?? this.journal.flight?.snapshot; }
  get remoteCandidate(): Snapshot | null { return this.journal.conflict?.snapshot ?? this.journal.confirmed; }
  get revision(): number { return this.journal.revision; }
  private notify(message: string, mode = this.mode): void { this.message = message; this.mode = mode; this.changed(); }
  private persist(): void { this.store.setItem(this.key, JSON.stringify(this.journal)); }
  private safePersist(): boolean {
    try { this.persist(); return true; }
    catch { this.notify('계정 저장 대기 기록을 기기에 쓰지 못했어요. 공간을 확보한 뒤 다시 시도해 주세요.', 'blocked'); return false; }
  }
  async start(local?: Snapshot): Promise<void> {
    if (this.journal.choice) { await this.finishChoice(); return; }
    if (local && !validSnapshot(local)) { this.notify('기기 진행 형식이나 크기를 계정에 저장할 수 없어요. 원본은 유지했어요.', 'blocked'); return; }
    // A prior canonical write may have succeeded while the journal write failed. Preserve that candidate.
    if (local && this.journal.chosen && !equal(local, this.journal.confirmed) && !equal(local, this.journal.latest)) {
      this.journal.latest = clone(local);
      if (!this.safePersist()) return;
    }
    if (this.journal.conflict) { this.notify('두 기기의 진행이 달라요. 이어갈 기록을 선택해 주세요.', 'conflict'); return; }
    if (this.dirty) { this.notify('기기에 보관한 진행을 계정에 저장하고 있어요.', 'ready'); await this.flush(); return; }
    try {
      const server = await this.remote.get();
      if (this.stopped) return;
      if (!validCloud(server)) throw Error('invalid cloud');
      this.saveIssue = false;
      if (local && !this.journal.chosen) {
        this.journal.latest = clone(local);
        this.journal.conflict = server;
        if (!this.safePersist()) return;
        this.notify('기기와 계정의 진행을 확인해 주세요.', 'conflict');
      } else if (server.snapshot) {
        // Automatic restore uses the same durable installation intent as an explicit choice.
        this.journal.choice = { snapshot: clone(server.snapshot), useRemote: true, revision: server.revision };
        await this.finishChoice();
      } else {
        this.notify('이 계정의 첫 진행을 선택해 주세요.', 'choose');
      }
    } catch {
      this.saveIssue = true;
      this.notify(local && this.journal.chosen ? '연결이 끊겼어요. 진행은 기기에 보관하고 연결되면 다시 저장해요.' : '계정 저장을 확인하지 못했어요. 연결 후 다시 시도해 주세요.', local && this.journal.chosen ? 'ready' : 'blocked');
    }
  }
  /** Called after game-local persistence, never for guest state or before explicit first-save choice. */
  offer(snapshot: Snapshot): void {
    if (this.stopped || this.mode !== 'ready' || !this.journal.chosen) return;
    if (!validSnapshot(snapshot)) { this.notify('진행 형식이나 크기를 계정에 저장할 수 없어요. 기기 원본은 보관했어요.', 'blocked'); return; }
    if (equal(snapshot, this.journal.latest ?? this.journal.flight?.snapshot ?? this.journal.confirmed)) return;
    this.journal.latest = clone(snapshot);
    if (!this.safePersist()) return;
    this.notify('기기에 저장됨 · 계정에 저장 중');
    // Throttle rather than reset debounce: continuous half-second checkpoints still upload.
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, 3000);
  }
  async choose(snapshot: Snapshot, useRemote = false): Promise<boolean> {
    if (this.stopped || !validSnapshot(snapshot) || !['choose', 'conflict'].includes(this.mode)) return false;
    try {
      if (this.journal.conflict) this.store.setItem(`bento-cloud:${this.owner}:conflict:${crypto.randomUUID()}`, JSON.stringify(this.journal));
      this.journal.choice = { snapshot: clone(snapshot), useRemote, revision: this.journal.conflict?.revision ?? this.journal.revision };
      this.persist(); // Intent survives BEFORE touching the canonical local/native save.
      return await this.finishChoice();
    } catch { this.notify('선택한 기록을 기기에 보관하지 못했어요. 원본은 유지했어요.', 'blocked'); return false; }
  }
  private async finishChoice(): Promise<boolean> {
    const choice = this.journal.choice;
    if (!choice || this.stopped) return false;
    this.notify('선택한 진행을 기기에 복원하고 있어요.', 'blocked');
    try {
      // Also persist on retry: a previous intent write may itself have failed.
      this.persist();
      await this.install(clone(choice.snapshot));
      if (this.stopped) return false;
      const next: Journal = { version: 1, owner: this.owner, revision: choice.revision,
        confirmed: choice.useRemote ? clone(choice.snapshot) : null, chosen: true,
        ...(choice.useRemote ? {} : { latest: clone(choice.snapshot) }) };
      this.store.setItem(this.key, JSON.stringify(next));
      this.journal = next;
      this.notify(choice.useRemote ? '계정 진행을 선택했어요.' : '선택한 진행을 계정에 저장하고 있어요.', 'ready');
      if (!choice.useRemote) await this.flush();
      return true;
    } catch { this.notify('선택한 진행의 복원을 마치지 못했어요. 선택과 원본을 보관했으니 저장을 다시 시도해 주세요.', 'blocked'); return false; }
  }
  async flush(): Promise<void> {
    if (this.stopped || this.pending || this.mode !== 'ready' || !this.dirty) return;
    this.pending = true;
    try {
      if (!this.journal.flight) {
        this.journal.flight = { id: crypto.randomUUID(), revision: this.journal.revision, snapshot: clone(this.journal.latest!) };
      }
      // A failed persist leaves an in-memory flight. Every attempt must make it durable before sending.
      try { this.persist(); }
      catch { this.notify('전송할 기록을 기기에 보관하지 못했어요. 공간을 확보한 뒤 다시 시도해 주세요.', 'blocked'); return; }
      const flight = clone(this.journal.flight);
      const result = await this.remote.put(flight.revision, flight.id, flight.snapshot);
      if (this.stopped) return;
      if (!validCloud(result) || !['saved', 'conflict'].includes(result.status)) throw Error('invalid response');
      if (result.status === 'saved' && !result.duplicate && (result.revision !== flight.revision + 1 || !equal(result.snapshot, flight.snapshot))) throw Error('Invalid acknowledgement');
      if (result.status === 'conflict' || (result.duplicate && result.operation_revision !== result.revision)) {
        this.journal.conflict = result;
        if (this.safePersist()) this.notify('다른 기기에서 저장한 진행이 있어요. 두 기록 중 이어갈 진행을 선택해 주세요.', 'conflict');
        return;
      }
      this.saveIssue = false;
      this.journal.revision = result.revision;
      this.journal.confirmed = result.snapshot;
      if (equal(this.journal.latest, flight.snapshot)) delete this.journal.latest;
      delete this.journal.flight;
      if (this.safePersist()) this.notify(this.dirty ? '기기에 저장됨 · 계정에 저장 중' : '계정에 저장됨', 'ready');
    } catch (error) {
      this.saveIssue = true;
      const code = (error as { code?: string })?.code;
      if (code === '22023') this.notify('진행 형식을 서버에서 확인하지 못했어요. 기기 원본은 유지했어요. 업데이트를 확인해 주세요.', 'blocked');
      else this.notify('연결을 확인해 주세요. 진행은 기기에 보관되어 다시 저장할 수 있어요.');
    }
    finally {
      this.pending = false;
      this.changed();
      if (!this.stopped && this.mode === 'ready' && this.dirty && !this.timer)
        this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, 5000);
    }
  }
  stop(): void { this.stopped = true; clearTimeout(this.timer); }
}
