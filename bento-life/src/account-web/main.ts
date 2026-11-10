import { AccountWebController, consumeAccountURL, type WebState } from './controller.ts';
import { createAccountWebPort } from './client.ts';
import type { AccountWebConfig } from '../../scripts/account-web-config.ts';
import './style.css';

declare const __BENTO_ACCOUNT_WEB_CONFIG__: AccountWebConfig;
const config = __BENTO_ACCOUNT_WEB_CONFIG__;
const panel = document.querySelector<HTMLElement>('#panel')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
let link = null;
let badLink = false;
try { link = consumeAccountURL(location.href, clean => history.replaceState(null, '', clean)); }
catch { badLink = true; }
const callback = new URL(config.returnURL);
// A copied deployment at another origin/path must not send credentials to an unexpected configured service.
if (location.origin !== callback.origin || location.pathname !== callback.pathname) {
  link = null;
  panel.textContent = '설정된 계정 관리 주소와 현재 주소가 달라요. 운영자가 공식 주소 설정을 확인해야 합니다.';
} else {
  const support = document.querySelector<HTMLAnchorElement>('#support')!;
  support.textContent = config.supportEmail;
  support.href = `mailto:${config.supportEmail}`;
  document.querySelector<HTMLElement>('#local-notice')!.hidden = !config.localOnly;
  const port = createAccountWebPort(config);
  let email = '';
  let renderedStage = '';
  const render = (state: WebState) => {
    const initial = renderedStage === '';
    const stageChanged = renderedStage !== state.stage;
    renderedStage = state.stage;
    document.querySelector<HTMLElement>('#delete-scope')!.hidden = !['login', 'confirm', 'unknown'].includes(state.stage);
    document.querySelector<HTMLElement>('h1')!.textContent = state.stage === 'confirmed' ? '이메일 확인 완료' : state.stage === 'password' ? '비밀번호 재설정' : '계정 안내';
    feedback.textContent = state.message || (state.busy ? '처리 중이에요. 잠시 기다려 주세요.' : '');
    if (stageChanged) {
      if (state.stage === 'verifying') {
        panel.innerHTML = '<h2 id="form-title">인증 링크 확인 중</h2><p>서버에서 확인하고 있어요.</p>';
      } else if (state.stage === 'confirmed' || state.stage === 'link-error') {
        panel.innerHTML = `<h2 id="form-title">${state.stage === 'confirmed' ? '게임에서 이어서 로그인해 주세요' : '인증 링크 확인 필요'}</h2><p>이 페이지는 게임에 자동 로그인하거나 진행 기록을 가져오지 않아요. 가입 확인 메일이 필요하면 게임의 ‘계정과 저장’에서 다시 요청해 주세요.</p><button type="button" data-action="cancel" class="secondary">비밀번호 재설정·계정 삭제 안내 보기</button>`;
      } else if (state.stage === 'login' || state.stage === 'unknown') {
        panel.innerHTML = `<h2 id="form-title">${state.stage === 'unknown' ? '삭제 결과 확인 필요' : '본인 계정 확인'}</h2><form id="login-form"><label>이메일<input name="email" type="email" autocomplete="username" required maxlength="254"></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" required maxlength="1024"></label><button type="submit">로그인 · 삭제 전 확인</button><button type="button" data-action="reset" class="secondary">비밀번호 재설정 메일 받기</button></form>`;
        panel.querySelector<HTMLInputElement>('[name=email]')!.value = email;
      } else if (state.stage === 'confirm') {
        panel.innerHTML = `<h2 id="form-title">마지막 삭제 확인</h2><p>삭제할 계정: <strong id="verified-email"></strong></p><form id="delete-form"><label>현재 비밀번호를 다시 입력해 주세요<input name="password" type="password" autocomplete="current-password" required maxlength="1024"></label><label class="check"><input name="confirmed" type="checkbox" required>위 삭제 범위를 읽었으며, 이 계정과 서버 게임 기록을 삭제하겠습니다.</label><button class="danger" type="submit">확인 · 내 계정과 서버 기록 삭제</button><button type="button" data-action="cancel" class="secondary">취소 · 삭제하지 않기</button></form>`;
        panel.querySelector('#verified-email')!.textContent = state.email;
      } else if (state.stage === 'password') {
        panel.innerHTML = `<h2 id="form-title">새 비밀번호 설정</h2><p>계정: <strong id="verified-email"></strong></p><form id="password-form"><label>새 비밀번호<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="1024" required></label><label>새 비밀번호 한 번 더<input name="repeat" type="password" autocomplete="new-password" minlength="8" maxlength="1024" required></label><button type="submit">비밀번호 바꾸기</button><button type="button" data-action="cancel" class="secondary">취소</button></form>`;
        panel.querySelector('#verified-email')!.textContent = state.email;
      } else {
        panel.innerHTML = '<h2 id="form-title">삭제 요청 완료</h2><p>이제 이 페이지를 닫아도 됩니다.</p>';
      }
      panel.querySelector<HTMLElement>('h2')?.setAttribute('tabindex', '-1');
      if (!initial) {
        if (state.message) feedback.focus();
        else panel.querySelector<HTMLElement>('h2')?.focus();
      }
    }
    panel.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button').forEach(element => { element.disabled = state.busy; });
    panel.setAttribute('aria-busy', String(state.busy));
  };
  const controller = new AccountWebController(port, render);
  if (!link && !badLink) render(controller.state);
  panel.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    if (!form.reportValidity() || controller.state.busy) return;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    const repeat = String(data.get('repeat') ?? '');
    form.querySelectorAll<HTMLInputElement>('input[type=password]').forEach(input => { input.value = ''; });
    if (form.id === 'login-form') {
      email = String(data.get('email') ?? '').trim();
      void controller.login(email, password);
    } else if (form.id === 'delete-form') void controller.deleteAccount(password, data.get('confirmed') === 'on');
    else if (form.id === 'password-form') void controller.changePassword(password, repeat);
  });
  panel.addEventListener('click', event => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')?.dataset.action;
    if (action === 'cancel') void controller.cancel();
    if (action === 'reset') {
      const input = panel.querySelector<HTMLInputElement>('[name=email]')!;
      if (input.reportValidity()) {
        email = input.value.trim();
        panel.querySelector<HTMLInputElement>('[name=password]')!.value = '';
        void controller.sendReset(email);
      }
    }
  });
  addEventListener('pagehide', () => { controller.dispose(); panel.replaceChildren(); feedback.textContent = ''; });
  addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  if (badLink) controller.invalidLink();
  else if (link) {
    if (link.type === 'signup') void controller.confirmSignup(link.tokens);
    else void controller.recover(link.tokens);
    link = null;
  }
}
