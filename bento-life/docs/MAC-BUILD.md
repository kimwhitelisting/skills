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

이 명령은 웹 빌드→SPM sync→Simulator ad-hoc 서명 빌드와 entitlement 검사를 수행한다. 처음에는 unsigned compile만 했으나 아래 Native 로그인 조사에서 Keychain 쓰기 불가를 확인하여 수정했다.
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

- Xcode에서 iPhone 18 Pro / iOS 27.2 Simulator 빌드·설치 후 홈·계정 화면과 SecureStorage 읽기를 확인했다. 아래 ad-hoc 서명 수정 후에는 Native 로그인·토큰 쓰기·인증 후 앱 reload·계정 진행 저장도 확인했다. 실제 iPhone은 설치·앱 열림까지 확인했으며, 해당 기기의 Native 로그인·복원과 TestFlight는 미검증이다.
- 첫 시작에 오래 걸리며 일시적으로 빈 화면이 보였고 LLDB의 `RPC Server exited`/detach 실패가 관찰됐다. 이후 정상 화면을 확인했으므로 이 디버거 오류만으로 앱 결함이라고 결론 내리지 않는다. 실제 기기의 시작 시간은 따로 확인한다.
- `capacitor.config.ts`의 전역 `loggingBehavior: 'none'`은 Debug/Release에서 Capacitor의 JS·Native bridge 로그를 끈다. 인증 플러그인의 요청·응답에 세션 정보가 포함될 수 있으므로 실제 로그인 전에 적용한다. 모든 OS 로그나 개발자가 별도로 추가한 로그까지 제거하는 설정은 아니다. [Capacitor 설정](https://capacitorjs.com/docs/config)
- 로깅·로컬 서명 변경 **f488432** 기준 후속 검증: unsigned iOS Simulator 빌드·설치 성공, 설치된 앱의 `loggingBehavior: 'none'` 확인, iPhone 18 Pro / iOS 27.2에서 새로 실행한 홈 화면 확인을 통과했다. 이 실행에서는 Native 로그인·토큰 쓰기·로그인 상태 재실행 복원을 시험하지 않았다.
- 같은 f488432 기준 Android `./gradlew --no-daemon assembleDebug`가 244 tasks로 성공했다. APK의 v2 debug 서명과 포함된 config의 `loggingBehavior: 'none'`을 확인했다. 출시 서명 또는 실제 Android 설치·실행 검증은 아니다.
- f488432의 독립 읽기 전용 보안 검토도 통과했다. 이 단계의 빌드·설치·화면 확인을 Native 인증·계정 복원 검증으로 대체하지 않았으며, 이후 Simulator 로그인 결과는 아래에 별도로 기록했다.

### 실제 iPhone 개발 빌드 설치·실행

- 소스 HEAD 5a292d3, 런타임 f488432 기준으로 실제 iPhone 17 / iOS 26.6.1에서 검증했다. Owner가 개발자 모드를 켠 뒤 CoreDevice·devmodectl에서도 활성 상태를 확인했다.
- 해당 기기를 대상으로 Xcode Debug 빌드가 성공했다. `codesign --verify --deep --strict`를 통과했고, 개발 프로파일의 연결 기기 포함·번들 일치·`get-task-allow=true`와 앱 config의 `loggingBehavior: 'none'`을 확인했다. 기기 식별자·서명 팀·프로파일 값은 공개 기록에 넣지 않는다.
- `devicectl` 설치 성공 후 첫 실행은 개발자 인증서 신뢰 단계에서 막혔다. Owner가 본인의 인증서를 신뢰한 뒤 “앱이 열려요”라고 보고했으며 실행 중인 앱 프로세스도 확인했다. 이는 실제 기기의 앱 열림 확인이며 게임 전체 동작이나 Native 계정 로그인 성공을 뜻하지 않는다.
- 이번 설치는 **Personal Team 무료 개발 빌드**이며 TestFlight/App Store 배포가 아니다. 로컬에서 확인한 개발 프로파일의 유효 기간은 7일이다. 기간이 지나면 같은 개발 경로로 재서명·재설치가 필요하며, 정확한 만료 시점과 개인 서명 정보는 비공개 운영 기록으로 관리한다.
- 실제 iPhone의 Native 로그인·계정 진행 복원·토큰 쓰기·앱 재실행 후 로그인/진행 유지는 추가 검증 대기다. Safari 웹 및 Simulator 계정 검증 결과와 구분한다.

### 로컬 개발 서명

공개 프로젝트에는 팀 값을 넣지 않는다. `ios/signing.xcconfig`가 Git에서 제외한 `ios/signing.local.xcconfig`를 선택적으로 읽으며, Debug는 기존 `debug.xcconfig`를 통해, Release는 직접 이 공통 설정을 사용한다. 실제 로컬 파일은 권한 `600`으로 보관한다.

다른 개발 Mac에서는 Xcode에 본인 Apple 계정을 추가한 뒤 다음 형식으로 로컬 파일을 만든다. 예제 값을 그대로 사용하지 않는다.

```xcconfig
DEVELOPMENT_TEAM = YOUR_TEAM_ID
```

로컬 파일이 없어도 선택적 include는 실패하지 않는다. Simulator 인증 테스트에는 아래 ad-hoc 서명·entitlement 검사를 통과한 앱을 사용한다. Xcode UI가 팀 값을 `project.pbxproj`에 다시 쓰면 커밋 전에 로컬 파일로 옮긴다. 인증서·프로비저닝 프로파일·비밀번호는 저장소에 추가하지 않는다. [Apple xcconfig 안내](https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project)

일반적으로 유료 Apple Developer Program에 가입하지 않은 Apple 계정도 Xcode의 **Personal Team**으로 개인 기기에 개발용 테스트를 할 수 있다. 주기적 재프로비저닝이 필요하며 이 경로가 TestFlight/App Store 배포 자격을 뜻하지 않는다. 사용자 가입 보고와 멤버십 활성화·선택된 서명 팀의 확인은 별개다. [Apple 계정·Personal Team 안내](https://developer.apple.com/help/account/basics/about-your-developer-account)

### 출시 전 호환성 잔여 항목

초기 설정의 iOS 15.0은 이미 사용하는 `navigator.locks`/`AbortSignal.timeout()` 지원 범위와 맞지 않았다. **2026-11-09에는 최소 iOS 16.0으로 정합화**했다. Xcode 프로젝트와 App의 Debug/Release 네 곳을 맞추고 공식 `cap sync ios`로 생성한 CapApp-SPM도 `.iOS(.v16)`인지 확인한다. 플러그인 버전·패키지 ID·로컬 서명 설정은 유지한다. iOS 15 지원을 주장하지 않으며 저장 잠금 안전성을 낮추는 fallback은 추가하지 않았다.

`npm run ios:verify`와 공식 `capacitor:sync:after` hook이 네 곳과 생성된 SPM을 검사하고 불일치하면 실패한다. Simulator 빌드 시작 전 같은 검사를 수행하고, 패키징 가드는 실제 `.app/Info.plist`의 `MinimumOSVersion`도 16.0인지 확인한다. 의존 패키지의 더 낮은 최소 OS 선언은 앱의 지원 OS를 낮추지 않는다. 설치된 Capacitor CLI 8.6.0의 `getMajoriOSVersion`/SPM 생성 코드를 대조했으며 sync가 앱 선언에서 v16을 재생성하는 것을 확인했다.

2026-11-09 검증: 전체 테스트 **143개** 통과(최소 버전 회귀 7개 포함), `npm run ios:simulator`의 웹 빌드→공식 sync→설정 hook→ad-hoc Simulator 빌드→패키징 가드 통과. Xcode의 실제 Debug/Release build settings와 앱 `MinimumOSVersion`은 모두 16.0이며 ZIP의 42개 파일은 빌드 앱과 일치했다. 이 실행은 앱 설치나 GUI 실행을 하지 않았다. 기존 실제 iPhone 앱·계정 데이터·개인 서명 설정을 바꾸지 않았다.

최소 버전 설정·패키징 검사는 **iOS 16.0 실제 런타임에서의 전체 동작 검증이 아니다**. iOS 16 기기/Simulator에서 계정·잠금·네트워크 시간제한·복귀 검증이 남으며, 기존 iOS 27.2 Simulator와 iOS 26.6.1 실제 기기 결과를 그 대신 사용하지 않는다. [WebKit의 Web Locks 지원 안내](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/), [AbortSignal.timeout 호환성](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static), [공식 Capacitor CLI hooks](https://capacitorjs.com/docs/cli/hooks).

공식 문서와 설치된 Capacitor 8 설정 대조일: 2026-11-07.

### Simulator Native 로그인 실패 원인과 빌드 수정

독립 테스트 계정의 서버 인증은 성공했지만 Native 로그인 UI가 일반 오류로 돌아왔다. Simulator `securityd`에서 **-34018**, `application-identifier`와 `keychain-access-groups` entitlement가 없다는 오류를 확인했다. 이전 빌드 스크립트가 `CODE_SIGNING_ALLOWED=NO`로 서명을 끈 결과이며, 계정 비밀번호나 SecureStorage 메서드 인자 불일치가 원인은 아니었다. SecureStorage 8.0.1의 실제 API·Swift 구현과 대조했고 인증 어댑터는 변경하지 않았다.

`scripts/build-ios-simulator.sh`는 이제 `CODE_SIGN_IDENTITY="-" CODE_SIGNING_ALLOWED=YES`로 Xcode의 Simulator ad-hoc 서명을 유지한다. 이 설정은 Simulator SDK를 지정한 명령에만 적용되며 실제 iPhone의 개발 서명·프로파일은 바꾸지 않는다. ad-hoc Simulator 서명을 스토어의 Ad Hoc 배포 방식과 혼동하지 않는다.

ZIP을 만들기 전 `scripts/verify-ios-simulator.mjs`가 Simulator 플랫폼, 코드 서명 검증, 각 아키텍처에서 번들과 일치하는 `application-identifier`, iOS override를 우선한 `loggingBehavior: 'none'`을 검사한다. Xcode는 Simulator entitlement를 Mach-O의 `__TEXT,__entitlements`에 넣으므로 `codesign -d --entitlements` 출력이 비어 있다는 사실만으로 실패 처리하지 않는다. 가드는 `lipo`·`otool`로 실제 실행 파일의 모든 slice를 검사하며 중간 `.xcent` 파일만 신뢰하지 않는다. 검사를 통과하지 못하면 패키징을 중단하며 식별자·entitlement 내용은 출력하지 않는다. 기존 unsigned 산출물 거부와 새 arm64/x86_64 산출물 통과를 확인했다. 이 검사는 로그인·Keychain 쓰기·재실행 복원 성공을 대신하지 않으며 해당 UI 재검증은 별도로 수행한다.

수정된 스크립트 전체 실행은 빌드·검사·ZIP 생성까지 exit 0으로 완료했다. 독립 검토에서 ZIP과 최종 `.app`의 42개 파일이 모두 일치했다. ZIP SHA256: `3f5f6f5a498fbeaa2e57003e3495debb8fdd49f7098e7928c54820b53ecc5d52`. 앱·토큰 저장 로직의 변경이 없어 게임 테스트를 반복하지 않았으며 빌드 스크립트 구문과 실제 산출물의 양성·음성 검증을 수행했다.

수정 **4ccfd74**의 후속 Simulator UI 시험에서는 독립 테스트 계정의 Native 로그인 → 첫 진행을 새로 시작 → 새 게임의 “하린 · 1살” 이름 선택을 통과했다. 서버 저장 revision **1→4**와 해당 진행 반영을 확인했다. Native 보안 토큰 쓰기와 인증 직후 앱 reload까지 동작한 근거이며 실제 iPhone의 본인 계정 복원 시험은 아니다.

첫 강제종료·재실행 시험은 Mac 자동 잠금으로 화면 확인이 막혔다. 잠금 해제 후 새 독립 테스트 계정으로 “선우 · 1살” 이름 선택과 서버 revision 4 저장을 확인하고 다시 시험했다. 강제종료·재실행 후 재로그인 입력 없이 같은 계정 패널·이어하기·동일 이벤트 결과가 표시되어 **로그인 상태와 진행 복원 PASS**를 확인했다.

이어 같은 Simulator의 앱을 삭제·재설치했다. 앱 데이터 컨테이너가 바뀌었고 최초 실행 전 Preferences 저장 파일과 WebKit 디렉터리가 없는 것을 확인했다. Keychain 인증은 유지된 상태에서 서버의 “선우 · 1살”과 동일 이벤트가 복원됐으며 서버 revision 4와 snapshot digest는 전후 동일했다. **빈 게임 저장 공간에서 서버 복원 PASS**이며, 다른 물리 기기나 실제 iPhone의 개인 계정 복원 시험은 아니다.

시험 후 UI 로그아웃과 빈 게스트 홈을 확인하고 Simulator 테스트 앱을 삭제했다. 이전에 남아 있던 로컬 테스트 세션 정리도 완료했다. 이번 독립 테스트 계정의 서버 사용자·인증 연결·세션·저장·전송 작업 기록은 모두 제거했고 기존 사용자와 저장 digest가 유지됨을 확인했다. 실제 iPhone 앱은 변경하지 않았으며 무료 개발 프로파일의 주기적 재서명 안내는 계속 적용된다. 이 후속 시험에서 런타임 코드는 변경하지 않았다.

근거: [Apple의 앱별 Keychain 접근과 서명 시 application-identifier 추가](https://developer.apple.com/documentation/security/sharing-access-to-keychain-items-among-a-collection-of-apps), [Xcode 빌드 설정](https://developer.apple.com/documentation/xcode/build-settings-reference).
