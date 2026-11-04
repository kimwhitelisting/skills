import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 안드로이드 앱 설정. 빌드·출시 방법은 docs/ANDROID.md
 * ⚠ appId(패키지 이름)는 임시값이다. Play에 처음 올리기 전에 정해서 바꾸고, 그 뒤로는 바꿀 수 없다.
 *   바꾸는 법: 아래 appId 수정 → `npm run android:reset` (android 폴더를 새로 만든다)
 */
const config: CapacitorConfig = {
  appId: 'com.bentolife.app',
  appName: '도시락 육아',
  webDir: 'dist',
  android: { backgroundColor: '#f3e2c6' },
};

export default config;
