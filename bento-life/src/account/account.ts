import { accountBuildConfig } from './build-config.ts';
import './account.css';
import { saveStatusLabel } from './save-status.ts';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { AccountSync } from './sync.ts';
import { gameWrites, needsFreshRuntime } from './runtime-gate.ts';
import { acquireWriter } from './writer-lock.ts';
import { signedRemote } from './remote.ts';
import { accountPrefix, configureSaveScope } from './scope.ts';
import { initializeStorage, currentSnapshot, writeKey, SNAPSHOT_KEY, flushStorage, storageStatus, subscribeStorage, validSnapshot, type Snapshot, type NativeStorage } from '../game/save.ts';
import { validRun, validDex, validPrefs } from '../game/validate-save.ts';
import { NativeAuthRecoveryPrompt, type NativeAuthRecovery } from './native-auth-recovery.ts';

interface AuthStorage { recovery?: NativeAuthRecovery; getItem(key: string): string | null | Promise<string | null>; setItem(key: string, value: string): void | Promise<void>; removeItem(key: string): void | Promise<void> }
const buildConfig = accountBuildConfig();
const url = buildConfig.VITE_SUPABASE_URL;
const publishable = buildConfig.VITE_SUPABASE_PUBLISHABLE_KEY;
let client: SupabaseClient | undefined;
let user: User | undefined;
let sync: AccountSync | undefined;
let panel: HTMLElement | undefined;
let opened = false;
let suspended = false;
let fatal = '';
let feedback = '';
let recovery = false;
let busy = false;
let deleting = false;
let journalDamaged = false;
let repairConfirm = false;
let redirectURL: string | undefined;
let draftEmail = '';
let booted = false;
let installedAfterBoot = false;
let runtimeReadyAtBoot = false;
let nativeRecoveryPrompt: NativeAuthRecoveryPrompt | undefined;
let nativeStore: (NativeStorage & { keys?(): Promise<string[]> }) | undefined;
let authChanged = false;
const listeners = new Set<() => void>();
const esc = (s: string) => s.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);
export const accountBlocked = () => suspended || !!fatal || opened || (!!user && sync?.mode !== 'ready');
export const isGuestAccount = () => !user;
export const accountSummary = () => saveStatusLabel({ local: storageStatus(), signedIn: !!user, unavailable: !!fatal || suspended, online: navigator.onLine !== false, sync });
export const subscribeAccount = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
function notify(): void {
  if (user && sync && sync.mode !== 'ready') opened = true;
  for (const fn of listeners) fn();
  document.querySelectorAll('.account-summary').forEach(el => { el.textContent = accountSummary(); });
  if (opened && !busy && !panel?.contains(document.activeElement)) renderPanel();
}
export function openAccount(): void { opened = true; notify(); renderPanel(); }
const emptySnapshot = (): Snapshot => ({ version: 1, dex: { menus: [], endings: [], events: [], plays: 0, hearts: 0, owned: [], equip: {}, photos: {} }, prefs: {} });
/** Read-only view of guest storage; never imports account namespaces or auth storage. */
export function readGuestSnapshot(store: Pick<Storage, 'getItem'> = localStorage): Snapshot | undefined {
  const full = store.getItem(SNAPSHOT_KEY);
  if (full) { const parsed: unknown = JSON.parse(full); if (!validSnapshot(parsed)) throw Error('guest damaged'); return parsed; }
  const runRaw = store.getItem('bento-life:run:v2');
  const dexRaw = store.getItem('bento-life:dex:v1');
  const prefsRaw = store.getItem('bento-life:prefs:v1');
  if (!runRaw && !dexRaw && !prefsRaw) return undefined;
  const value = emptySnapshot();
  if (runRaw) { const run = JSON.parse(runRaw); if (!validRun(run)) throw Error('guest damaged'); value.run = run; }
  if (dexRaw) { const dex = JSON.parse(dexRaw); if (!validDex(dex)) throw Error('guest damaged'); value.dex = { ...value.dex, ...dex }; }
  if (prefsRaw) { const prefs = JSON.parse(prefsRaw); if (!validPrefs(prefs)) throw Error('guest damaged'); value.prefs = prefs; }
  return value;
}
function guest(): Snapshot | undefined { try { return readGuestSnapshot(); } catch { return undefined; } }
function summary(snapshot?: Snapshot | null): string {
  return snapshot?.run ? `${snapshot.run.child.name} · ${snapshot.run.age + 1}살 · 하트 ${snapshot.dex.hearts}` : snapshot ? `새 진행 · 하트 ${snapshot.dex.hearts}` : '저장된 진행 없음';
}
async function install(snapshot: Snapshot): Promise<void> {
  if (!validSnapshot(snapshot)) throw Error('invalid snapshot');
  gameWrites.freeze();
  if (booted) installedAfterBoot = true;
  writeKey(SNAPSHOT_KEY, JSON.stringify(snapshot));
  await flushStorage();
  if (storageStatus().blocked || storageStatus().errors.length) throw Error('local write failed');
}
async function removeDeletedLocal(owner: string): Promise<void> {
  const prefix = accountPrefix(owner);
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(prefix) || key.startsWith(`bento-cloud:${owner}:`)) localStorage.removeItem(key);
  }
  if (nativeStore?.keys) {
    for (const key of await nativeStore.keys()) if (key.startsWith(prefix)) await nativeStore.remove(key);
  }
}
function remoteFor(owner: string) {
  return signedRemote(owner, url!, publishable!, async () => {
    const { data, error } = await client!.auth.getSession();
    if (error) throw error;
    return data.session;
  }, () => !suspended && user?.id === owner);
}
export async function bootAccount(native?: NativeStorage & { keys?(): Promise<string[]> }, authStorage?: AuthStorage): Promise<boolean> {
  nativeStore = native;
  redirectURL = authStorage ? buildConfig.VITE_AUTH_REDIRECT_URL : `${location.origin}${location.pathname}`;
  if (redirectURL && !/^https?:\/\//.test(redirectURL)) redirectURL = undefined;
  const loading = document.getElementById('app');
  if (loading) loading.textContent = '계정과 저장 기록을 불러오는 중이에요…';
  recovery = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
  if (recovery) opened = true;
  panel = document.createElement('section');
  panel.id = 'account-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '계정과 저장');
  document.body.append(panel);
  panel.addEventListener('click', e => { const action = (e.target as HTMLElement).closest<HTMLElement>('[data-account]')?.dataset.account; if (action) void act(action); });
  panel.addEventListener('submit', e => { e.preventDefault(); void act('login'); });
  const lease = await acquireWriter(navigator.locks);
  if (!lease.acquired) {
    fatal = navigator.locks ? '다른 탭에서 냠냠졸졸을 사용 중이에요. 그 탭을 닫은 뒤 다시 열기를 눌러 주세요. 기록을 겹쳐 쓰지 않도록 이 화면은 멈춰 있어요.' : '이 브라우저는 안전한 단일 창 저장을 지원하지 않아요. 최신 Safari 또는 Chrome에서 열어 주세요. 저장 원본은 바꾸지 않았어요.';
    opened = true; booted = true; renderPanel(); return false;
  }
  // The browser releases the lease when this document is destroyed/reloaded. Do not release on pagehide:
  // checkpoint/native flush callbacks can still be writing then, and hidden tabs may resume.
  if (authStorage?.recovery) {
    const recovery = authStorage.recovery;
    nativeRecoveryPrompt = new NativeAuthRecoveryPrompt(recovery, () => { renderPanel(); notify(); });
    recovery.subscribe(() => {
      if (recovery.hasFailure) {
        sync?.stop();
        fatal = '보안 로그인 정보를 읽지 못했어요. 게임 기록은 그대로 보관하고 있어요.';
        opened = true;
        queueMicrotask(() => {
          void client?.auth.stopAutoRefresh().catch(() => {});
          notify();
        });
      }
    });
  }
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('bento-deleted:')) await removeDeletedLocal(key.slice('bento-deleted:'.length));
    if (url && publishable) {
      if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || !publishable.startsWith('sb_publishable_')) throw Error('Cloud configuration invalid');
      client = createClient(url, publishable, { auth: { storageKey: 'bento-auth:v1', ...(authStorage ? { storage: authStorage } : {}), persistSession: true, autoRefreshToken: true, detectSessionInUrl: !authStorage } });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      user = data.session?.user;
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') { recovery = true; opened = true; setTimeout(notify, 0); }
        if (event !== 'INITIAL_SESSION' && session?.user.id !== user?.id && !authChanged) {
          window.dispatchEvent(new Event('bento-account-checkpoint'));
          gameWrites.freeze(); authChanged = true; suspended = true; sync?.stop(); notify();
          setTimeout(() => { void flushStorage().finally(() => location.reload()); }, 0);
        }
      });
    }
    if (user && localStorage.getItem(`bento-deleted:${user.id}`) === 'true') {
      await client!.auth.signOut({ scope: 'local' });
      user = undefined;
    }
    configureSaveScope(user?.id);
    const prefix = accountPrefix(user?.id);
    const backend = native ? { get: (key: string) => native.get(prefix + key), set: (key: string, value: string) => native.set(prefix + key, value), remove: (key: string) => native.remove(prefix + key) } : undefined;
    await initializeStorage(backend);
    if (user) {
      try { sync = new AccountSync(user.id, localStorage, remoteFor(user.id), install, notify); }
      catch { journalDamaged = true; throw Error('journal damaged'); }
      await sync.start(currentSnapshot());
      if (sync.mode !== 'ready') opened = true;
      subscribeStorage(() => { const value = currentSnapshot(); if (value && !storageStatus().blocked && !storageStatus().errors.length) sync?.offer(value); });
      window.addEventListener('online', () => { void retry(); });
      window.addEventListener('bento-background', () => { void sync?.flush(); });
      window.addEventListener('pagehide', () => { void sync?.flush(); });
    }
  } catch {
    // SDK initialization can restart refresh in its finally block. Stop again after
    // it settles, as well as when a runtime storage failure is first observed.
    if (authStorage?.recovery?.hasFailure) await client?.auth.stopAutoRefresh().catch(() => {});
    fatal = '안전하게 계정 저장을 열지 못했어요. 원본을 바꾸지 않았어요. 연결과 기기 저장소를 확인한 뒤 앱을 다시 열어 주세요.';
    opened = true;
  }
  booted = true;
  if (!fatal && !suspended && !authChanged && (!user || sync?.mode === 'ready')) {
    gameWrites.activate();
    runtimeReadyAtBoot = true;
  }
  subscribeStorage(notify);
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  renderPanel(); notify();
  return true;
}
function renderPanel(): void {
  if (!panel) return;
  panel.hidden = !opened;
  if (!opened) return;
  const button = (action: string, text: string, primary = false) => `<button type="button" data-account="${action}" ${busy ? 'disabled' : ''} class="${primary ? 'primary' : ''}">${text}</button>`;
  let content = '';
  if (fatal) content = `<p>${esc(fatal)}</p>${button('restart', '다시 열기')}${journalDamaged ? (repairConfirm ? '<p>손상된 전송 기록의 원본을 보관하고 계정 저장을 다시 확인해요. 현재 기기 진행은 남기며 서버 기록과 다르면 선택할 수 있어요.</p>' + button('repair-yes', '확인 · 원본 보관 후 다시 확인') + button('repair-cancel', '취소') : button('repair', '원본 보관 후 계정 저장 다시 확인')) : ''}`;
  else if (!client) content = '<p>아직 계정 저장 연결이 준비되지 않았어요. 지금은 이 기기에만 저장돼요.</p>';
  else if (recovery) content = `<p>새 비밀번호를 정해 주세요.</p><label>새 비밀번호<input id="account-password" type="password" autocomplete="new-password" minlength="8"></label>${button('password', '비밀번호 바꾸기', true)}`;
  else if (!user) content = `<p>로그인한 뒤 보관할 진행을 선택하고 ‘계정에 저장됨’까지 확인하면 다른 기기에서 이어갈 수 있어요. 기존 기기 기록은 직접 선택할 때만 가져와요.</p>
    <form><label>이메일<input id="account-email" type="email" autocomplete="username" value="${esc(draftEmail)}" required></label><label>비밀번호<input id="account-password" type="password" autocomplete="current-password" minlength="8" required></label><button type="submit" class="primary" ${busy ? 'disabled' : ''}>로그인</button></form>
    ${button('signup', '처음이라면 가입하기')}${button('resend', '가입 확인 메일 다시 받기')}${button('reset', '비밀번호 재설정 메일 받기')}<p class="account-note">가입 후 이메일 확인이 필요해요. 메일이 오지 않으면 받은편지함·스팸함을 확인하고 잠시 뒤 다시 요청해 주세요. 비밀번호는 저장 기록이나 복구 파일에 넣지 않아요.</p>`;
  else if (deleting) content = `<p>계정과 서버의 게임 기록을 삭제할까요? 되돌릴 수 없어요. 이 기기의 해당 계정 기록도 삭제해요. 다른 기기의 오프라인 사본이나 이미 내보낸 파일은 별도로 관리해 주세요. 다른 계정·게스트 기록은 지우지 않아요.</p><label>현재 비밀번호<input id="account-password" type="password" autocomplete="current-password"></label>${button('delete-yes', '확인 · 내 계정과 기록 삭제')}${button('delete-cancel', '취소')}`;
  else {
    content = `<p>${esc(user.email ?? '로그인한 계정')}</p><p class="account-message">${esc(accountSummary())}</p>${sync && sync.message !== accountSummary() ? `<p>${esc(sync.message)}</p>` : ''}`;
    if (sync?.mode === 'choose') content += `<p>계정에 처음 저장할 진행을 선택해 주세요. 기기 기록의 원본은 남겨 두고 하트를 합치지 않아요.</p>${guest() ? `<p>이 기기의 기록: ${esc(summary(guest()))}</p>${button('import', '이 기기 기록을 계정으로 가져오기', true)}` : ''}${button('fresh', '계정에서 새로 시작')}`;
    if (sync?.mode === 'conflict') content += `<p>두 기록을 보관했어요. 하나를 선택하며 하트와 도감을 합치지 않아요.</p><p>기기: ${esc(summary(sync.localCandidate))}</p><p>계정: ${esc(summary(sync.remoteCandidate))}</p>${sync.localCandidate ? button('local', '이 기기 진행으로 이어가기') : ''}${sync.remoteCandidate ? button('remote', '계정 진행으로 이어가기', true) : ''}`;
    content += button('retry', '계정 저장 다시 확인') + button('logout', '로그아웃 · 기기 기록으로 돌아가기') + button('delete', '계정 삭제');
  }
  panel.innerHTML = `<div class="account-card"><h2>계정과 저장</h2>${content}${nativeRecoveryPrompt?.markup() ?? ''}${feedback ? `<p role="status" class="account-message">${esc(feedback)}</p>` : ''}${!fatal && (!user || sync?.mode === 'ready') && !recovery ? button('close', '게임으로 돌아가기') : ''}</div>`;
}
async function retry(): Promise<void> {
  if (!sync) return;
  if (sync.mode === 'ready') await sync.flush(); else if (sync.mode !== 'conflict') await sync.start(currentSnapshot());
  if (needsFreshRuntime(runtimeReadyAtBoot, installedAfterBoot, sync.mode === 'ready')) { location.reload(); return; }
  notify();
}
function friendly(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (/invalid login/i.test(message)) return '이메일과 비밀번호를 확인해 주세요.';
  if (/email not confirmed/i.test(message)) return '가입 확인 메일의 링크를 먼저 열어 주세요.';
  if (/rate limit|too many/i.test(message)) return '요청이 잠시 많아요. 잠시 후 다시 시도해 주세요.';
  return '요청을 마치지 못했어요. 연결 상태와 입력을 확인해 주세요. 확인 메일이 오지 않으면 스팸함을 확인하고 잠시 뒤 다시 요청해 주세요.';
}
async function act(action: string): Promise<void> {
  if (action === 'restart') { location.reload(); return; }
  if (busy || suspended) return;
  if (action.startsWith('native-reset') && nativeRecoveryPrompt) {
    if (await nativeRecoveryPrompt.act(action)) {
      gameWrites.freeze(); sync?.stop(); suspended = true;
      location.reload();
    }
    return;
  }
  if (action === 'close') { opened = false; feedback = ''; renderPanel(); notify(); return; }
  if (action === 'repair') { repairConfirm = true; renderPanel(); return; }
  if (action === 'repair-cancel') { repairConfirm = false; renderPanel(); return; }
  if (action === 'delete') { deleting = true; renderPanel(); return; }
  if (action === 'delete-cancel') { deleting = false; renderPanel(); return; }
  const email = (document.getElementById('account-email') as HTMLInputElement | null)?.value.trim() ?? user?.email ?? '';
  draftEmail = email;
  let password = (document.getElementById('account-password') as HTMLInputElement | null)?.value ?? '';
  busy = true; feedback = ''; renderPanel();
  try {
    if (action === 'repair-yes' && repairConfirm && user && journalDamaged) {
      const key = `bento-cloud:${user.id}:journal:v1`;
      const raw = localStorage.getItem(key);
      if (raw !== null) localStorage.setItem(`bento-cloud:${user.id}:damaged:${crypto.randomUUID()}`, raw);
      localStorage.removeItem(key);
      location.reload(); return;
    }
    if (['login', 'signup', 'reset', 'resend'].includes(action) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('email invalid');
    if (['login', 'signup', 'password', 'delete-yes'].includes(action) && password.length < 8) { feedback = '비밀번호를 8자 이상 입력해 주세요.'; return; }
    if (action === 'login') { const { error } = await client!.auth.signInWithPassword({ email, password }); if (error) throw error; }
    if (action === 'signup') { const { error } = await client!.auth.signUp({ email, password, options: { emailRedirectTo: redirectURL } }); if (error) throw error; feedback = '가입 확인 메일을 요청했어요. 메일의 링크를 연 뒤 이 화면에서 로그인해 주세요.'; }
    if (action === 'resend') { const { error } = await client!.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectURL } }); if (error) throw error; feedback = '확인 메일을 요청했어요. 메일함과 스팸함을 확인해 주세요.'; }
    if (action === 'reset') { const { error } = await client!.auth.resetPasswordForEmail(email, { redirectTo: redirectURL }); if (error) throw error; feedback = '재설정 메일을 요청했어요. 링크를 열어 비밀번호를 바꾼 뒤 로그인해 주세요.'; }
    if (action === 'password') { const { error } = await client!.auth.updateUser({ password }); if (error) throw error; recovery = false; feedback = '비밀번호를 바꿨어요.'; }
    if (action === 'logout') {
      window.dispatchEvent(new Event('bento-account-checkpoint'));
      await flushStorage();
      if (storageStatus().blocked || storageStatus().errors.length) { feedback = '기기 저장 오류를 먼저 해결해 주세요. 아직 저장하지 못한 진행을 보호하기 위해 로그아웃을 멈췄어요.'; return; }
      gameWrites.freeze(); suspended = true; notify();
      const { error } = await client!.auth.signOut({ scope: 'local' });
      if (error) { fatal = '로그아웃을 마치지 못했어요. 기기 진행은 보관했어요. 앱을 다시 열고 연결을 확인해 주세요.'; throw error; }
      sync?.stop(); location.reload();
    }
    if (action === 'retry') await retry();
    if (['import', 'fresh', 'local', 'remote'].includes(action)) {
      const chosen = action === 'import' ? guest() : action === 'fresh' ? emptySnapshot() : action === 'remote' ? sync?.remoteCandidate : sync?.localCandidate;
      if (!chosen) throw Error('No snapshot');
      if (await sync!.choose(chosen, action === 'remote')) location.reload();
    }
    if (action === 'delete-yes') {
      const { data, error } = await client!.functions.invoke('bento-delete-account', { body: { password } });
      if (error || data?.deleted !== true) { feedback = '계정 삭제 완료를 확인하지 못했어요. 현재 비밀번호를 확인하고, 필요하면 다시 로그인한 뒤 시도해 주세요. 기기 원본은 지우지 않았어요.'; return; }
      gameWrites.freeze(); sync?.stop(); suspended = true;
      await flushStorage();
      localStorage.setItem(`bento-deleted:${user!.id}`, 'true');
      await removeDeletedLocal(user!.id);
      await client!.auth.signOut({ scope: 'local' });
      location.reload();
    }
  } catch (error) {
    if (action === 'delete-yes' && suspended) fatal = '서버의 계정 삭제 후 이 기기의 정리를 마치지 못했어요. 앱을 다시 열어 주세요.';
    feedback = friendly(error);
  }
  finally { password = ''; busy = false; if (booted) renderPanel(); notify(); }
}
