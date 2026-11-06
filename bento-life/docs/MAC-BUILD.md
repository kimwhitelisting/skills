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

iOS는 후속 BENTO-MOBILE-001에서 `@capacitor/ios`8.6.0과 SPM 네이티브 프로젝트를 추가했다.
기존 의존성의 잠금 버전은 변경하지 않았다. 생성 자산/사용자 설정만 ignore하고 iOS 소스는 Git에 보존한다.
세로 방향과 전체 화면, Preferences의 UserDefaults 접근 사유(CA92.1) manifest와 앱 Resources 연결을 준비했다.
`npm test` 27개 및 `npm run ios:sync`는 성공했다. `npm run ios:simulator`는 Xcode 관리자 라이선스 적용 문제로 exit69여서 compile은 미검증이다.
`Package.swift`는 Capacitor8.6.0을 exact로 지정하지만, 실제 SPM 해석 후 생성될 Package.resolved는 아직 없다.
아이콘과 시작 화면은 Capacitor 기본 테스트 자산이며 교체·실기기 확인이 필요하다.
Xcode 관리자 초기 설정·배포용 계정/서명·TestFlight가 필요하다.
현재 APK를 iPhone에 설치할 수 있다고 안내하지 않는다.

## iOS 재현 (관리자 초기 설정 이후)

```sh
npm ci
npm test
npm run ios:simulator
```

이 명령은 웹 빌드→SPM sync→unsigned Simulator compile을 수행한다.
새 clone을 Xcode에서 직접 열 때도 먼저 `npm ci`와 `npm run ios:sync`를 실행한다. 생성된 public/config 파일은 Git에 없으며 첫 SPM 해석에는 네트워크가 필요하다.
성공 시 `build/NyamnyamJoljol-Simulator.zip`; 실제 iPhone 설치 파일이 아니다.
번들 ID는 기존 앱 ID와 같은 `com.paranstudio.dosirak`이다. 서명 팀이나 계정을 코드에 넣지 않았다.
Preferences manifest 근거: https://capacitorjs.com/docs/apis/preferences

현재 npm audit의 개발용 Vitest/tinypool 계열에 critical2/moderate1 경고가 있고,
`npm audit --omit=dev` 결과는 0개다. 일괄 강제 업그레이드는 하지 않았으며 테스트 도구 업데이트를 별도 검증할 후속 항목으로 둔다.

Claude 읽기 전용 검토의 문서 불일치를 정정했다. 출시 전에 기본 armv7 capability·영문 개발 지역·시작 배경색도 실제 Xcode/기기에서 검토한다.

첫 실기기 테스트는 새 게임→아침 도시락→등굣길→저녁→결산, 앱 종료 후 재실행,
저장·도감·하트 보존, 작은 화면·safe-area·키보드, 오프라인·오디오·진동 순으로 기록한다.
테스트를 위해 기존 사용자 저장 데이터를 삭제하지 않는다.

## iPhone 웹 미리보기 문서 수정 (BENTO-PREVIEW-001)

모바일에서 임베드용 `preview.single.html`을 직접 제공하면 viewport와 doctype가 없어
화면이 작게 축소된다. 일반 HTTP 미리보기는 새 `preview.standalone.html`을 제공한다.
원본 preview.html의 메타데이터를 보존하고 CSS/JS만 inline한다. 기존 fragment 6개는 SHA256 동일.
기존 테스트27개·2000판, 웹 build와 preview build 통과. 생성된 문서6개에서 viewport/doctype와
외부 로컬 script/style 미참조를 확인했다. 일부 prototype의 기존 Google Fonts는 유지한다.
브라우저 390px 폭에서 app/doc 폭390px, 주 버튼 높이 약50.8px·정상 문서 모드를 확인했다.
Owner iPhone LTE 사진으로 수정 전 접속은 확인했다. 수정 후 iPhone 화면은 재확인 대기다.
게임 로직·저장 키·origin·네이티브 빌드는 변경하지 않았다.
