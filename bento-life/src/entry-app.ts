// 앱(스토어 출시)용 진입점. 도트 글꼴(갈무리)은 번들 안에 같이 들어가 오프라인에서도 동작한다.
// 안드로이드(Capacitor)에서는 게임을 띄우기 전에
//  1) 앱 저장소(Preferences)에 남아 있는 저장을 웹뷰 저장소로 되살리고, 이후 저장할 때마다 거울로 같이 쓴다
//  2) 하드웨어 뒤로가기: 창이 열려 있으면 닫기(브라우저 기록 뒤로), 타이틀이면 앱을 내린다
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { nativeSocialEntry, webSocialEntry } from './account/social-entry.ts';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { registerRecoveryTransport } from './ui/recovery-export.ts';
import { nativeRecoveryTransport } from './ui/native-recovery-export.ts';
import { flushStorage } from './game/save.ts';
import { bootAccount } from './account/account.ts';
import { nativeAuthStorage } from './account/native-auth.ts';

async function boot(): Promise<void> {
  if (Capacitor.isNativePlatform()) registerRecoveryTransport(nativeRecoveryTransport(Filesystem, Share));
  const native = Capacitor.isNativePlatform();
  const social = native ? await nativeSocialEntry({ platform: Capacitor.getPlatform(),
    onURL: fn => App.addListener('appUrlOpen', event => fn(event.url)),
    launchURL: async () => (await App.getLaunchUrl())?.url,
    onFinished: fn => Browser.addListener('browserFinished', fn),
    open: url => Browser.open({ url, presentationStyle: 'fullscreen' }), close: () => Browser.close(),
  }) : webSocialEntry();
  const ready = await bootAccount(Capacitor.isNativePlatform() ? {
    get: async key => (await Preferences.get({key})).value,
    set: (key,value) => Preferences.set({key,value}),
    remove: key => Preferences.remove({key}),
    keys: async () => (await Preferences.keys()).keys,
  } : undefined, Capacitor.isNativePlatform() ? await nativeAuthStorage() : undefined, social);
  if (!ready) return;
  if (Capacitor.isNativePlatform()) {
    void App.addListener('backButton', ({canGoBack}) => { if(canGoBack) history.back(); else void App.minimizeApp(); });
    void App.addListener('appStateChange', ({isActive}) => { if(!isActive) { window.dispatchEvent(new Event('bento-background')); void flushStorage(); } });
  }
  const { mountGame } = await import('./main.ts');
  mountGame();
}
void boot().catch(() => {
  const app = document.getElementById('app')!;
  app.textContent = '안전한 로그인 저장소를 열지 못했어요. 기기 잠금을 해제하고 앱을 다시 열어 주세요. 진행 원본은 바꾸지 않았어요.';
  const retry = document.createElement('button');
  retry.textContent = '앱 다시 열기';
  retry.addEventListener('click', () => location.reload());
  app.append(retry);
});
