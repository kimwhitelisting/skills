# Mac 빌드 검증 — 2026-11-06

아래 초기 검증 기록 이후의 현재 Native 상태는 문서 끝의 **2026-11-07 Native 실행·로컬 서명 설정**을 우선한다.

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
초기 기본 아이콘·시작 화면은 아래 iOS 자산 준비에서 기존 게임 아트로 교체했다. 실제 설치 화면 확인은 남아 있다.
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

## iOS 자산·시작 색 준비 (BENTO-STABLE-001)

- 별도 branch/worktree의 Codex 구현으로 기존 스토어 아이콘과 Android 시작 화면의 코드 도트 아트를 재사용했다. 게임 코드·Android 자산·패키지 잠금 파일은 변경하지 않았다.
- `scripts/ios-assets.ts`가 1024×1024 불투명 RGB 아이콘과 2732×2732 불투명 RGB 시작 이미지 3개를 기존 asset catalog 파일명으로 생성한다. 기본 Capacitor 로고를 제거했다.
- 재생성: `npm ci` 후 `npx --no-install vite-node scripts/ios-assets.ts`. 서명이나 Xcode 실행은 필요하지 않다.
- `scripts/png.ts`는 기본 RGBA 출력을 그대로 유지하고 선택한 RGB 출력에서 투명 픽셀을 거부한다. 기존 스토어 512 아이콘의 정확한 2배 픽셀 일치, 기본 RGBA 바이트 호환, 자산 크기와 알파 채널 없음, 생성 이미지 육안 확인을 수행했다.
- iOS WebView·시작 화면 배경을 `#f3e2c6`으로 명시했다. 설치된 Capacitor가 지원하는 `UIStatusBarStyleDarkContent`로 밝은 게임 화면의 상태바 글자를 지정했다. 세로 방향·전체 화면·번들 ID는 유지했다.
- `npm test` 27개와 2000판 자동 플레이, TypeScript/Vite build, `cap sync ios`, plist·storyboard XML 검증 통과.
- **Xcode 컴파일·Simulator·실제 iPhone 설치는 확인하지 않았다.** 관리자 초기 설정 이후 iOS sync/compile과 작은 화면·안전 영역·다크 모드 상태바·시작 이미지 잘림을 실제 기기에서 확인해야 한다.

## 2026-11-07 Native 실행·로컬 서명 설정

- Xcode에서 iPhone 18 Pro / iOS 27.2 Simulator 빌드·설치 후 홈 화면과 계정 화면 표시를 확인했다. SecureStorage의 Native 읽기 응답도 확인했다. 로그인 후 토큰 쓰기·재실행 복원, 실제 iPhone 설치·실행과 TestFlight는 아직 확인하지 않았다.
- 첫 시작에 오래 걸리며 일시적으로 빈 화면이 보였고 LLDB의 `RPC Server exited`/detach 실패가 관찰됐다. 이후 정상 화면을 확인했으므로 이 디버거 오류만으로 앱 결함이라고 결론 내리지 않는다. 실제 기기의 시작 시간은 따로 확인한다.
- `capacitor.config.ts`의 전역 `loggingBehavior: 'none'`은 Debug/Release에서 Capacitor의 JS·Native bridge 로그를 끈다. 인증 플러그인의 요청·응답에 세션 정보가 포함될 수 있으므로 실제 로그인 전에 적용한다. 모든 OS 로그나 개발자가 별도로 추가한 로그까지 제거하는 설정은 아니다. [Capacitor 설정](https://capacitorjs.com/docs/config)
- 로깅·로컬 서명 변경 **f488432** 기준 후속 검증: unsigned iOS Simulator 빌드·설치 성공, 설치된 앱의 `loggingBehavior: 'none'` 확인, iPhone 18 Pro / iOS 27.2에서 새로 실행한 홈 화면 확인을 통과했다. 이 실행에서는 Native 로그인·토큰 쓰기·로그인 상태 재실행 복원을 시험하지 않았다.
- 같은 f488432 기준 Android `./gradlew --no-daemon assembleDebug`가 244 tasks로 성공했다. APK의 v2 debug 서명과 포함된 config의 `loggingBehavior: 'none'`을 확인했다. 출시 서명 또는 실제 Android 설치·실행 검증은 아니다.
- f488432의 독립 읽기 전용 보안 검토도 통과했다. 실제 iPhone 설치·Native 인증·세션 복원과 TestFlight는 계속 미검증이며, 위 빌드·설정·화면 확인으로 대체하지 않는다.

### 로컬 개발 서명

공개 프로젝트에는 팀 값을 넣지 않는다. `ios/signing.xcconfig`가 Git에서 제외한 `ios/signing.local.xcconfig`를 선택적으로 읽으며, Debug는 기존 `debug.xcconfig`를 통해, Release는 직접 이 공통 설정을 사용한다. 실제 로컬 파일은 권한 `600`으로 보관한다.

다른 개발 Mac에서는 Xcode에 본인 Apple 계정을 추가한 뒤 다음 형식으로 로컬 파일을 만든다. 예제 값을 그대로 사용하지 않는다.

```xcconfig
DEVELOPMENT_TEAM = YOUR_TEAM_ID
```

로컬 파일이 없어도 선택적 include는 실패하지 않으며 unsigned Simulator 빌드가 가능하다. Xcode UI가 팀 값을 `project.pbxproj`에 다시 쓰면 커밋 전에 로컬 파일로 옮긴다. 인증서·프로비저닝 프로파일·비밀번호는 저장소에 추가하지 않는다. [Apple xcconfig 안내](https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project)

일반적으로 유료 Apple Developer Program에 가입하지 않은 Apple 계정도 Xcode의 **Personal Team**으로 개인 기기에 개발용 테스트를 할 수 있다. 주기적 재프로비저닝이 필요하며 이 경로가 TestFlight/App Store 배포 자격을 뜻하지 않는다. 사용자 가입 보고와 멤버십 활성화·선택된 서명 팀의 확인은 별개다. [Apple 계정·Personal Team 안내](https://developer.apple.com/help/account/basics/about-your-developer-account)

### 출시 전 호환성 잔여 항목

현재 배포 대상 설정은 iOS 15.0이지만 계정 경로는 `navigator.locks`와 `AbortSignal.timeout()`을 사용한다. Web Locks는 Safari 15.4부터이며 `AbortSignal.timeout()`의 Safari 16 지원 범위도 고려해야 한다. iOS 15.0 전체를 지원한다고 보고하지 않는다. 최소 버전 상향 또는 검증된 대체 구현을 별도 결정·시험하며, 이번 로깅·서명 설정에서는 배포 대상이나 게임 코드를 바꾸지 않았다. [WebKit의 Safari 15.4 안내](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/), [AbortSignal.timeout 호환성](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static)

공식 문서와 설치된 Capacitor 8 설정 대조일: 2026-11-07.
