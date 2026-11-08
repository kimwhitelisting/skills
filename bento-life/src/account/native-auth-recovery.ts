const AUTH_KEYS = new Set(['bento-auth:v1', 'bento-auth:v1-user', 'bento-auth:v1-code-verifier']);
export interface SecureAuthPort {
  get(key: string): Promise<unknown>;
  set(key: string, value: string | null): Promise<void>;
  remove(key: string): Promise<boolean>;
}
const invalidData = () => Object.assign(new Error('Invalid secure auth data'), { code: 'invalidData' });

export function confirmedCredentialCorruption(error: unknown, platform: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 'invalidData' || (platform === 'android' && code === 'osError'
    && message === 'An OS error occurred (AEADBadTagException)');
}

/** Only an observed, known authentication key can be reset. Game storage is never referenced. */
export class NativeAuthRecovery {
  private failures = new Map<string, { corrupt: boolean }>();
  private resetting = false;
  private retired = false;
  private queue: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(private port: SecureAuthPort, private platform: string) {}
  get hasFailure(): boolean { return this.failures.size > 0; }
  get canReset(): boolean { return [...this.failures.values()].some(failure => failure.corrupt) && !this.resetting && !this.retired; }
  subscribe(listener: () => void): void { this.listeners.add(listener); }
  private notify(): void { for (const listener of this.listeners) listener(); }
  private checkActive(): void {
    if (this.resetting || this.retired) throw new Error('Reopen the app after secure auth recovery.');
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.queue.then(() => { this.checkActive(); return operation(); });
    this.queue = task.then(() => {}, () => {});
    return task;
  }
  private async read(key: string): Promise<string | null> {
    const value = await this.port.get(key);
    if (value === null) return null;
    if (typeof value !== 'string') throw invalidData();
    // Supabase writes JSON strings. Do not let its absent/invalid-session fallback
    // silently replace damaged secure credentials before the user chooses recovery.
    if (AUTH_KEYS.has(key)) {
      let parsed: unknown;
      try { parsed = JSON.parse(value); } catch { throw invalidData(); }
      if (key === 'bento-auth:v1' && (!parsed || typeof parsed !== 'object'
        || !['access_token', 'refresh_token', 'expires_at'].every(field => field in parsed))) throw invalidData();
    }
    return value;
  }
  async getItem(key: string): Promise<string | null> {
    return this.serial(async () => {
      try {
        const value = await this.read(key);
        if (this.failures.delete(key)) this.notify();
        return value;
      } catch (error) {
        this.failures.set(key, { corrupt: AUTH_KEYS.has(key) && confirmedCredentialCorruption(error, this.platform) });
        this.notify();
        throw error;
      }
    });
  }
  async setItem(key: string, value: string): Promise<void> {
    return this.serial(async () => {
      if (this.failures.has(key)) throw new Error('Secure credentials must be readable before they can be changed.');
      await this.port.set(key, value);
    });
  }
  async removeItem(key: string): Promise<void> {
    return this.serial(async () => {
      // SDK logout/refresh must not erase an observed corrupt entry behind the prompt.
      if (this.failures.has(key)) throw new Error('Secure credentials must be readable before they can be removed.');
      await this.port.remove(key);
    });
  }
  async resetConfirmed(confirmed: boolean): Promise<boolean> {
    if (!confirmed || !this.canReset) return false;
    const key = [...this.failures].find(([, failure]) => failure.corrupt)![0];
    this.resetting = true;
    try {
      await this.queue;
      // Recheck after confirmation: a recovered valid session must never be deleted.
      try {
        await this.read(key);
        this.failures.delete(key);
        this.retired = true;
        return true;
      } catch (error) {
        if (!confirmedCredentialCorruption(error, this.platform)) return false;
      }
      const removed = await this.port.remove(key);
      try {
        if (await this.read(key) !== null) return false;
      } catch (error) {
        // Pinned Android plugin may return false without removing orphan prefs.
        // Only the confirmed key receives an encrypted null, never plaintext storage.
        if (removed || this.platform !== 'android' || !confirmedCredentialCorruption(error, this.platform)) return false;
        await this.port.set(key, null);
        if (await this.read(key) !== null) return false;
      }
      this.failures.delete(key);
      this.retired = true;
      return true;
    } catch {
      return false;
    } finally {
      this.resetting = false;
      this.notify();
    }
  }
}

/** Shared production prompt/controller; tests exercise confirmation, cancel and duplicate actions. */
export class NativeAuthRecoveryPrompt {
  private phase: 'notice' | 'confirm' | 'working' | 'failed' | 'complete' = 'notice';
  private confirmedAt = 0;
  constructor(private recovery: NativeAuthRecovery, private changed: () => void, private now = () => performance.now()) {}
  markup(): string {
    if (!this.recovery.hasFailure) return '';
    if (this.phase === 'working') return '<p role="status">로그인 정보를 복구하고 있어요. 잠시 기다려 주세요.</p>';
    if (!this.recovery.canReset) return '<p>기기 잠금을 해제한 뒤 다시 열어 주세요. 일시적인 보안 저장소 오류일 수 있어 로그인 정보를 지우지 않았어요.</p>';
    if (this.phase === 'confirm') return '<p>손상된 로그인 정보만 초기화할까요? 다시 로그인해야 해요. 게임 진행·게스트 기록·계정별 미전송 기록은 그대로 남아요.</p><button type="button" data-account="native-reset-confirm">확인 · 로그인 정보만 복구</button><button type="button" data-account="native-reset-cancel">취소 · 그대로 두기</button>';
    return `${this.phase === 'failed' ? '<p role="status">복구 완료를 확인하지 못했어요. 게임 기록은 바꾸지 않았어요. 기기 잠금을 해제하고 다시 열거나 다시 시도해 주세요.</p>' : '<p>저장된 로그인 정보의 손상을 확인했어요. 게임 기록을 유지한 채 로그인 정보만 복구할 수 있어요.</p>'}<button type="button" data-account="native-reset">로그인 정보 복구 안내</button>`;
  }
  async act(action: string): Promise<boolean> {
    if (this.phase === 'working' || this.phase === 'complete') return false;
    if (action === 'native-reset' && this.recovery.canReset) {
      this.phase = 'confirm'; this.confirmedAt = this.now();
    } else if (action === 'native-reset-cancel') this.phase = 'notice';
    else if (action === 'native-reset-confirm' && this.phase === 'confirm' && this.now() - this.confirmedAt >= 400) {
      this.phase = 'working'; this.changed();
      const done = await this.recovery.resetConfirmed(true);
      this.phase = done ? 'complete' : 'failed';
      this.changed();
      return done;
    }
    this.changed();
    return false;
  }
}
