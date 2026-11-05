// 앱(스토어 출시)용 진입점. 도트 글꼴(갈무리)은 번들 안에 같이 들어가 오프라인에서도 동작한다.
// 안드로이드(Capacitor)에서는 게임을 띄우기 전에
//  1) 앱 저장소(Preferences)에 남아 있는 저장을 웹뷰 저장소로 되살리고, 이후 저장할 때마다 거울로 같이 쓴다
//  2) 하드웨어 뒤로가기: 창이 열려 있으면 닫기(브라우저 기록 뒤로), 타이틀이면 앱을 내린다
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { STORAGE_KEYS, setStorageMirror } from './game/save.ts';

async function boot(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    for (const key of STORAGE_KEYS) {
      try {
        const { value } = await Preferences.get({ key });
        if (value !== null && localStorage.getItem(key) === null) localStorage.setItem(key, value);
      } catch { /* 처음 실행 */ }
    }
    setStorageMirror((key, value) => { void (value === null ? Preferences.remove({ key }) : Preferences.set({ key, value })); });
    void App.addListener('backButton', ({ canGoBack }) => { if (canGoBack) history.back(); else void App.minimizeApp(); });
  }
  await import('./main.ts');
}
void boot();
