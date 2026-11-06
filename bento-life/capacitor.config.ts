import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 안드로이드 앱 설정. 빌드·출시 방법은 docs/ANDROID.md
 * appId(패키지 이름)는 확정: com.paranstudio.dosirak (스튜디오 파란). Play에 한 번 올리면 영영 못 바꾼다.
 * iOS를 만들 때도 같은 이름(번들 ID)을 쓴다.
 */
const config: CapacitorConfig = {
  appId: 'com.paranstudio.dosirak',
  appName: '냠냠졸졸',
  webDir: 'dist',
  android: { backgroundColor: '#f3e2c6' },
  ios: { backgroundColor: '#f3e2c6' },
};

export default config;
