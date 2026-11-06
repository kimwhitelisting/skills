# Mac 빌드 검증 — 2026-11-06

원본 main `e694d7a`(PR #2 병합)를 기준으로 새 Mac arm64에서 검증했다.
기존 README/HANDOFF의 게임 설계와 저장 데이터·패키지 ID는 유지했다.

## 확인한 결과

- Node22.23.4 / npm10.9.9, 기존 package-lock으로 `npm ci` 성공.
- `npm test`: 27개 테스트와 2000판 자동 플레이 통과.
- `npm run build`, `npm run build:preview`: 성공.
- JDK Temurin21.0.13+9, Android platform36 rev2/build-tools36.0.0, 기존 AGP8.13.0/Gradle8.14.3.
- `npm run android:sync` 후 `cd android && ./gradlew --no-daemon assembleDebug`: 성공, 153 tasks.
- `apksigner verify --verbose`: v2 서명 검증 통과. 디버그 서명이며 출시용 업로드 서명이 아니다.
- package `com.paranstudio.dosirak`, versionCode1/versionName1.0, minSdk24/targetSdk36, 앱 이름 냠냠졸졸.
- APK SHA256: `de292305f03e8a50cc593e7e0c1e5f7992e8042655b5f60029cda6867c0b2a9c`.

빌드 경로: `android/app/build/outputs/apk/debug/app-debug.apk`.
APK를 공개 저장소에 커밋하지 않는다. 빌드 로그/산출물은 별도 작업 보관소에서 관리한다.

## 아직 확인하지 않은 것

실제 Android 설치·터치·뒤로가기·저장 복원·오프라인·소리·발열은 미검증이다.
웹 preview의 Mac 시작 화면은 확인했지만 iPhone Safari 및 iOS native 테스트를 대신하지 않는다.

iOS는 `@capacitor/ios`와 네이티브 프로젝트가 아직 없다. `.gitignore`의 ios 제외 규칙도
플랫폼을 추가하는 작업에서 함께 검토해야 한다. Xcode 관리자 초기 설정·배포용 계정/서명·TestFlight가 필요하다.
현재 APK를 iPhone에 설치할 수 있다고 안내하지 않는다.

첫 실기기 테스트는 새 게임→아침 도시락→등굣길→저녁→결산, 앱 종료 후 재실행,
저장·도감·하트 보존, 작은 화면·safe-area·키보드, 오프라인·오디오·진동 순으로 기록한다.
테스트를 위해 기존 사용자 저장 데이터를 삭제하지 않는다.
