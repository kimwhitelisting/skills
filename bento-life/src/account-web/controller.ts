export interface WebUser { id: string; email: string }
export interface RecoveryTokens { access_token: string; refresh_token: string }
export interface AccountWebPort {
  login(email: string, password: string): Promise<WebUser>;
  recover(tokens: RecoveryTokens): Promise<WebUser>;
  confirmSignup(tokens: RecoveryTokens): Promise<void>;
  sendReset(email: string): Promise<void>;
  changePassword(userId: string, password: string): Promise<void>;
  deleteAccount(userId: string, password: string): Promise<boolean>;
  close(): Promise<void>;
  discard(): void;
}
export class PasswordRejected extends Error {}
export type WebStage = 'verifying' | 'confirmed' | 'link-error' | 'login' | 'confirm' | 'password' | 'deleted' | 'unknown' | 'closed';
export interface WebState { stage: WebStage; busy: boolean; email: string; message: string }

export interface AccountLink { type: 'signup' | 'recovery'; tokens: RecoveryTokens }

/** Read once, then erase all URL parameters before any authentication request. */
export function consumeAccountURL(href: string, replace: (clean: string) => void): AccountLink | null {
  const url = new URL(href);
  const hash = url.hash.slice(1);
  const query = url.search;
  if (hash || query) replace(url.origin + url.pathname);
  if (!hash && !query) return null;
  const params = new URLSearchParams(hash);
  // Auth's optional empty sb marker is transport metadata, never proof of identity.
  const allowed = new Set(['access_token', 'refresh_token', 'type', 'expires_in', 'expires_at', 'token_type', 'sb']);
  if (query || hash.length > 20000 || [...params.keys()].some(key => !allowed.has(key) || params.getAll(key).length !== 1)
    || (params.has('sb') && params.get('sb') !== '')
    || !['signup', 'recovery'].includes(params.get('type') ?? '') || params.get('token_type') !== 'bearer') throw new Error('invalid_account_link');
  const access = params.get('access_token'), refresh = params.get('refresh_token');
  if (!access || !refresh || !/^[A-Za-z0-9._-]+$/.test(access) || !/^[A-Za-z0-9._-]+$/.test(refresh)
    || access.length > 16000 || refresh.length > 2048) throw new Error('invalid_account_link');
  return { type: params.get('type') as AccountLink['type'], tokens: { access_token: access, refresh_token: refresh } };
}

/** No passwords, tokens, game records, or storage adapters live in UI state. */
export class AccountWebController {
  state: WebState = { stage: 'login', busy: false, email: '', message: '' };
  private user: WebUser | null = null;
  private generation = 0;
  constructor(private port: AccountWebPort, private changed: (state: WebState) => void) {}
  private publish() { this.changed({ ...this.state }); }
  private async run(operation: () => Promise<void>, failure: string) {
    if (this.state.busy || this.state.stage === 'closed') return;
    const generation = this.generation;
    this.state.busy = true;
    this.state.message = '';
    this.publish();
    try { await operation(); }
    catch { if (generation === this.generation) this.state.message = failure; }
    finally {
      if (generation === this.generation) { this.state.busy = false; this.publish(); }
      else { this.user = null; this.state = { stage: 'closed', busy: false, email: '', message: '' }; }
    }
  }
  async login(email: string, password: string) {
    if (!['login', 'unknown'].includes(this.state.stage)) return;
    await this.run(async () => {
      this.port.discard();
      try { this.user = await this.port.login(email, password); }
      catch { this.port.discard(); throw new Error('login_failed'); }
      this.state.email = this.user.email;
      this.state.stage = 'confirm';
    }, '로그인하지 못했어요. 이메일·비밀번호와 네트워크를 확인해 주세요. 로그인 실패만으로 계정 삭제 여부를 알 수는 없어요.');
  }
  async recover(tokens: RecoveryTokens) {
    if (this.state.stage !== 'login') return;
    this.state.stage = 'verifying';
    await this.run(async () => {
      try {
        this.user = await this.port.recover(tokens);
        this.state.email = this.user.email;
        this.state.stage = 'password';
      } catch {
        this.port.discard();
        this.state.stage = 'link-error';
        throw new Error('recovery_failed');
      }
    }, '재설정 링크를 확인하지 못했어요. 만료되었거나 이미 사용했을 수 있어요. 새 메일을 요청해 주세요.');
  }
  async confirmSignup(tokens: RecoveryTokens) {
    if (this.state.stage !== 'login') return;
    this.state.stage = 'verifying';
    await this.run(async () => {
      try {
        await this.port.confirmSignup(tokens);
        this.state.stage = 'confirmed';
        this.state.message = '이메일 확인을 완료했어요. 게임으로 돌아가 직접 로그인해 주세요.';
      } catch {
        this.state.stage = 'link-error';
        throw new Error('confirmation_failed');
      } finally {
        this.port.discard();
        this.user = null;
        this.state.email = '';
      }
    }, '가입 확인 결과를 확인하지 못했어요. 이미 확인되었을 수도 있으니 게임에서 로그인을 시도하거나 가입 확인 메일을 다시 요청해 주세요.');
  }
  async sendReset(email: string) {
    if (!['login', 'unknown'].includes(this.state.stage)) return;
    await this.run(async () => {
      await this.port.sendReset(email);
      this.state.message = '이 주소에 가입된 계정이 있다면 재설정 메일이 발송됩니다. 받은편지함과 스팸함을 확인해 주세요.';
    }, '메일 요청을 완료하지 못했어요. 잠시 뒤 다시 시도하거나 지원 이메일로 문의해 주세요.');
  }
  async changePassword(password: string, repeat: string) {
    if (this.state.stage !== 'password' || !this.user) return;
    if (password.length < 8 || password.length > 1024 || password !== repeat) {
      this.state.message = '8자 이상 같은 새 비밀번호를 두 번 입력해 주세요.'; this.publish(); return;
    }
    await this.run(async () => {
      const id = this.user!.id;
      try {
        await this.port.changePassword(id, password);
        this.state.message = '비밀번호를 바꿨어요. 게임으로 돌아가 새 비밀번호로 로그인해 주세요. 계정 삭제를 원하면 새 비밀번호로 다시 로그인한 뒤 최종 확인해 주세요.';
      } catch (error) {
        if (error instanceof PasswordRejected) {
          this.state.message = '새 비밀번호가 보안 기준에 맞지 않거나 이전과 같아요. 더 길고 다른 비밀번호를 입력해 주세요.';
          return;
        }
        this.state.message = '비밀번호 변경 완료를 확인하지 못했어요. 변경됐을 수도 있으므로 새 비밀번호로 로그인해 확인하거나 재설정 메일을 다시 요청해 주세요.';
      }
      await this.port.close();
      this.user = null;
      this.state.email = '';
      this.state.stage = 'login';
    }, '작업 결과를 확인하지 못했어요. 새로 로그인해 확인해 주세요.');
  }
  async deleteAccount(password: string, confirmed: boolean) {
    if (this.state.stage !== 'confirm' || !this.user || !confirmed || !password || password.length > 1024) return;
    await this.run(async () => {
      let deleted = false;
      try { deleted = await this.port.deleteAccount(this.user!.id, password); } catch { /* Ambiguous, never retry automatically. */ }
      this.port.discard();
      this.user = null;
      this.state.email = '';
      this.state.stage = deleted ? 'deleted' : 'unknown';
      this.state.message = deleted
        ? '서버가 계정과 현재 게임 기록의 삭제 완료를 확인했어요. 이 페이지는 기기의 게임 사본이나 내보낸 백업을 지우지 않았어요.'
        : '삭제 완료를 확인하지 못했어요. 이미 삭제됐거나 일부 절차만 끝났을 수 있어요. 자동으로 다시 요청하지 않습니다. 지원 이메일로 문의하거나 새로 로그인한 뒤 다시 최종 확인해 주세요.';
    }, '삭제 결과를 확인하지 못했어요. 지원 이메일로 문의해 주세요.');
  }
  async cancel() {
    await this.run(async () => {
      await this.port.close();
      this.user = null;
      this.state = { stage: 'login', busy: true, email: '', message: '이 페이지의 인증을 종료했어요. 삭제 요청을 보내지 않았어요.' };
    }, '인증 종료를 확인하지 못했어요. 페이지를 닫아 주세요.');
  }
  invalidLink() {
    this.port.discard();
    this.state.stage = 'link-error';
    this.state.message = '올바른 가입 확인·비밀번호 재설정 링크가 아니거나 만료되었어요. 주소의 인증 정보는 제거했어요. 게임에서 가입 확인 메일을 다시 요청하거나 아래에서 비밀번호 재설정 메일을 요청해 주세요.';
    this.publish();
  }
  dispose() {
    this.generation++;
    this.port.discard();
    this.user = null;
    this.state = { stage: 'closed', busy: false, email: '', message: '' };
  }
}
