# Mac 빌드 검증 — 2026-11-06

아래 초기 검증 기록 이후의 현재 Native 후보 상태는 문서 끝의 최신 날짜 기록을 우선한다.

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

초기 검증 당시 npm audit의 개발용 Vitest/tinypool 계열에 critical2/moderate1 경고가 있었고,
당시 `npm audit --omit=dev` 결과는 0개였다. 일괄 강제 업그레이드를 하지 않고 별도 검증으로 미뤘으며, 후속 해결 결과는 아래 **2026-11-10 테스트 도구 보안 업데이트**에 기록한다.

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

## 2026-11-09 Native 손상 인증 보호 후보 빌드

전체 **186개 테스트**(기존 2,000판 포함), TypeScript/Vite 웹 빌드, Android 공식 sync와 `assembleDebug` 244 tasks, iOS 공식 sync와 기존 ad-hoc Simulator 스크립트를 통과했다. Android merged manifest·APK의 compiled XML에서 정확한 로그인 파일 백업 제외를 확인했고, APK v2 debug 서명·logging none을 확인했다. iOS 16.0 최소 버전·서명/entitlement·logging none 가드와 ZIP 생성을 통과했다. 의존성·lockfile·패키지 ID·실기기 서명 설정은 바꾸지 않았다.

이 결과는 새 손상 복구 UI의 실제 Android/iPhone 실행 검증이 아니다. Simulator 설치·GUI 실행·Owner 계정 접근 및 기존 iPhone 앱 업데이트도 하지 않았다. 기존 Native 로그인·재설치 시험의 결과와 이번 합성 오류 회귀를 구분한다. 실제 iPhone 개인 계정 복원, iOS 16 런타임, OS 백업·기기 전송 및 무료 개발 프로파일의 주기적 재서명은 남아 있다.

### 같은 후보의 미리보기 갱신과 격리 DOM 검사

후보 **4c5ed87**을 기존 기능 브랜치에 보존하고 원격 SHA 일치를 확인했다. 별도 검토에서도 최신 Simulator 패키징 가드가 통과했다. 기존 비공개 미리보기는 같은 origin·같은 계정 서버/공개 키 설정을 유지해 원자 교체했으며 이전 HTML도 보관했다. 로컬 HTTP와 기존 비공개 HTTPS 모두 200 응답 및 후보 HTML SHA256 `d8d9237c2abd4b6a3763f2adde2e5a976293392b6f2a04395907d8ec9bd1b239` 일치를 확인했다. 이 과정에서 사용자 데이터나 로그인에 접근하지 않았다.

네트워크를 차단한 격리 Chromium 158에서는 light/dark 초기 화면과 계정 패널의 로그인 폼·닫기를 DOM 이벤트로 확인했다. 320/390px에서 문서 가로 넘침이 없었고 uncaught 오류는 0개였다. 다만 최소 HTML·기존 앱·후보 모두 해당 headless 환경에서 native `requestAnimationFrame` 콜백이 실행되지 않아 스크린샷·포인터·게임 진행 검증은 하지 못했다. 따라서 이 결과를 시각적 대비·실제 터치·로그인 성공으로 확대하지 않는다. 비공개 검증 기록은 `browser-dom-smoke.json`과 `preview-deployment.json`에 보관했다.

## 2026-11-09 인증 보조 키 복구와 Android 후속 시험

설치 auth-js 2.119.0의 PKCE index·동적 슬롯을 정확한 키 문법과 최대 5개 흐름으로 한정해 명시적 손상 복구에 포함했다. 전체 **222개 테스트**(2,000판 포함), TypeScript/Vite 웹 빌드, Android sync·debug 빌드 244 tasks·APK 서명 검증을 통과했다. APK SHA256: `34d1fee33dc416a84ebf061f508620d65660c152a834ffbcdab1aef0ac57915e`. 독립 Claude 읽기 검토의 차단 지적은 없었다. 설명 주석만 수정한 뒤 생성 웹 14개 파일이 기존 APK와 바이트 단위로 같음을 확인했다.

자체 Android AVD에서 기존 앱을 지우지 않고 업데이트한 뒤, 원래 없던 정확한 인증 키 하나에 합성 손상 암호문을 넣었다. 실제 Native `invalidData` → UI 취소/원문 보존 → 명시 확인/암호화된 null fallback·읽기 확인 → 강제종료/재시작 후 기존 게스트 진행과 앨범 보존을 통과했다. Native Preferences 전체와 비인증 WebView 저장 바이트/digest가 유지됐다. 주입한 키·alias만 정리해 원래 보안 파일 부재 상태를 복원하고 AVD를 종료했다. 계정 미전송 키는 애초 없었으므로 부재 보존만 검증했으며, 기존 계정 미전송 데이터가 있는 Native 시험은 아니다. [상세 범위와 한계](ACCOUNT-IMPLEMENTATION.md#android-자체-테스트-앱의-손상-복구-확인)를 따른다.

같은 소스로 iOS 공식 sync·기존 ad-hoc Simulator 빌드/서명·entitlement 가드와 ZIP 생성을 통과했다. 실제 앱의 최소 iOS 16.0, `loggingBehavior: 'none'`, UserDefaults `CA92.1`·FileTimestamp `C617.1` 사유를 확인했다. ZIP의 42개 파일이 앱과 일치하며 웹 14개 파일은 Android APK·웹 dist와도 동일하다. ZIP SHA256: `a718475cea270391374997d761669289da02858cad351613a8d2aeadee9b841a`. 이번 iOS 실행은 컴파일·패키징만 수행했고 Simulator를 시작하거나 앱을 설치하지 않았다.

현재 PKCE index·동적 슬롯 및 늦은 SDK 쓰기는 설치 SDK와 합성 포트의 회귀 증거다. iOS 실제 손상 복구·하드웨어 잠김·OS 백업/기기 전송·실제 iPhone 개인 계정 복원·오프라인 재연결은 미검증으로 남는다. 호스트 Keychain·서버 계정·실제 iPhone 앱·개인 서명 설정과 의존성은 바꾸지 않았다.


## 2026-11-10 출시 패키지 내용 검사

[출시 검사 경로](RELEASE-PACKAGING.md)를 추가했다. `npm ci` → 전체 **240개 테스트**(기존 2,000판 포함) → TypeScript/Vite 일반 빌드를 통과했다. 실제 Vite 합성 release 출력에서 파일 누락·추가·변조·설정/원본 불일치와 출력 폴더 보호를 확인했고, 별도로 컴파일한 설정 소비 모듈이 JSON만 읽고 누락 시 실패하는 것을 네트워크 없이 실행했다. 합성 출력은 비배포 표식으로 native 검사에서 거절된다.

독립 검증에서 문법상 올바른 합성 공개 설정을 제공한 직접 Gradle Release와 Xcode Release build·Debug 구성의 install action은 **기존 복사 자산에 release provenance가 없어서** 거절됐다. 설정 누락으로만 실패한 시험이 아니다. 실제 packageRelease/packageReleaseBundle/signReleaseBundle graph의 finalizer와 자체 출력 없음도 확인했다. 성공한 producer의 UP-TO-DATE 재호출에서 finalizer 실행까지 실측한 것은 아니다.

일반 Android Debug 컴파일·서명과 iOS Simulator Debug 컴파일·ad-hoc 서명/실행 파일 entitlement 검사는 통과했다. 두 패키지의 웹 파일 각 16개는 기존 copied inputs와 일치했다. QA의 복사 입력 35개는 전후 같았다. 이는 기존 copied JS를 이용한 **hook/빌드 호환** 증거이며 새 release runtime의 기기 실행 시험이 아니다. 실제 기기·Simulator 앱 실행, sync, 계정 로그인·클라우드 변경은 하지 않았다.

후속 출력 옵션 보호는 Vite plugin과 회귀만 보강했다. 위에서 실측한 native hook·검사기 바이트는 그대로 유지했다. 일반 dist는 같은 기존 계정 설정의 새 소스 개발 빌드로 갱신했으며 개인 미리보기와 Android/iOS 복사 자산은 바꾸지 않았다. 서명된 출시 APK/AAB·Archive의 성공 생성과 스토어 제출, 실제 운영 서버/SMTP 준비, Owner가 미룬 개인 iPhone 계정 확인은 미완료로 유지한다. finalizer 실패 뒤 남은 과거 APK/AAB를 새 배포 후보로 사용하지 않는다.


## 2026-11-10 테스트 도구 보안 업데이트

개발 전용 Vitest를 지원되는 **4.1.12 exact**로 갱신했다. 공식 지원 정책은 4.1에 중요·보안 수정 backport를 제공하며, 4.1.12에는 mocker 수정이 포함된다. 기존 Tinypool 의존성은 Vitest 4 전환으로 제거됐다. `npm audit`의 critical 2·moderate 1은 업데이트 후 **전체 0, production 0**으로 확인했다. 이는 현재 registry 권고 목록 결과이며 앱 전체의 무결점·보안 보증은 아니다.

격리된 작업 폴더에서 업데이트 전후 각각 기존 npm으로 `npm ci` → **240개 테스트**(2,000판 포함) → 일반 웹 빌드 → 여섯 미리보기 빌드를 통과했다. 출시 설정·실제 Vite 합성 출력·compiled config consumer 회귀도 같은 테스트에 포함된다. 테스트/앱 코드를 수정하거나 판정을 완화하지 않았다. 직접 사용하는 vite-node의 읽기 전용 `npm run endings`도 통과했다.

기존 production lock 항목 **27개**의 version/resolved/integrity, Vite **6.4.5**, vite-node **3.2.4**, Capacitor 패키지는 모두 동일하다. lockfile 형식 3을 유지했고 변경은 Vitest/Chai 등 테스트 의존성 체인으로 한정했다. 일반 웹 **14개 파일**과 미리보기 **30개 파일**의 전후 SHA256이 모두 같다. 이 비교는 설정을 복사하지 않은 같은 게스트 환경에서의 결과다. 운영 미리보기·네이티브 복사 자산·개인 설정을 교체하지 않았다.

기존 npm **10.9.9**는 업데이트 의존성을 계산할 때 `edgesOut` 내부 오류를 냈고, Vitest/Vite/Node 타입만 둔 최소 프로젝트에서도 재현됐다. 강제 설치·legacy-peer-deps·override 없이, 공식 tarball의 integrity를 확인한 **npm 11.21.2를 임시 격리해 lockfile 계산에만** 사용했다. 이후 기존 Node **22.23.4**와 npm **10.9.9**의 일반 `npm ci`, 전체 테스트/빌드, `npm ls --all`로 다시 검증했다. 이 임시 resolver는 lockfile 업데이트 계산에만 사용했다. 전역 npm을 바꾸지 않았으며 일반 개발·재현 설치에서는 기존 `npm ci`를 사용하고 별도 npm 업그레이드를 요구하지 않는다.

이번 변경은 네이티브 컴파일·실제 기기 실행·계정 복원·서명된 출시 패키지 검증이 아니다. 웹 내용이 같아도 package/lock provenance가 바뀌었으므로 실제 출시 후보는 [출시 검사 절차](RELEASE-PACKAGING.md)에 따라 새 release 빌드와 sync가 필요하다. 기존 개인 iPhone 확인과 출시 운영 조건은 그대로 남는다.

공식 근거(2026-11-10): [지원 버전](https://vitest.dev/releases), [Vitest 4 이전 요구사항](https://v4.vitest.dev/guide/migration), [4.1.12 수정](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12), [mocker 코드 주입](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [mocker 파일 읽기](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [Tinypool worker 옵션](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [Tinypool run 옵션](https://github.com/advisories/GHSA-85c8-ppgw-ccpr), [npm optional-peer 오류 보고](https://github.com/npm/cli/issues/9787).

## 2026-11-10 최신 개발용 기기 빌드

소스 `749008ff352edfd96aaf36d209a6210ce72301c3`를 기존 Node 22.23.4/npm 10.9.9와 lockfile로 빌드했다. `npm ci` → `npm test` → `npm run build` → `npm run android:sync` → `npm run ios:sync` → Android `assembleDebug` → generic iOS device 대상 Xcode **Debug build** 순서가 모두 성공했다. 테스트는 **15개 파일, 257개**이며 기존 2,000판 시뮬레이션을 포함한다. Xcode install/archive action이나 Release 검사를 우회하지 않았다.

- Android Debug APK: v2 서명 검증 통과, minSdk 24/targetSdk 36, 기존 패키지 식별자·버전 유지. 실제 Android 기기 설치·실행은 하지 않았다.
- iPhone 개발용 `.app`: `codesign --verify --deep --strict` 통과, 최소 iOS 16.0, 기존 식별자·버전 유지. 기존 로컬 서명과 유효 프로비저닝을 재사용했으며 인증서를 새로 만들거나 폐기하지 않았다. 프로파일 만료는 **2026-11-14 08:33 KST**이고 등록된 연결 대상 기기의 포함 여부를 확인했다. 이는 기기 통신이나 앱 실행 성공을 뜻하지 않는다.
- 현재 웹 출력 **14개 파일**이 두 네이티브 패키지에 바이트 단위로 동일하게 포함됐다. Capacitor `loggingBehavior: none`과 원격 `server` override 없음도 확인했다.
- 이전에 보관한 iPhone 개발 빌드와 새 빌드의 application identifier, team, Keychain group 목록, 계정 서버 호스트를 별도로 비교해 모두 같음을 확인했다. 명시적 Keychain group이 없는 기존 앱/플러그인 구성은 유지했다. 이는 식별자 비교이며 새 빌드의 실제 Keychain 저장·계정 복원을 실행한 증거는 아니다.

기존 개인 계정 설정·로컬 서명 설정·패키지/lockfile·미추적 공유 scheme 파일의 해시가 유지됐다. 빌드 산출물과 상세 로그·해시 manifest는 저장소 밖 비공개 운영 자료로 보관하며 이전 보관 빌드도 유지했다. 실제 Claude Code의 읽기 전용 검토에서 소스 차단 항목은 발견되지 않았다. Happier를 통한 검토 위임은 SDK 실행 오류로 실패했으므로 Happier 위임 성공으로 기록하지 않는다.

**설치와 실기기 검증은 대기 중이다.** 기기 목록 표시와 달리 실제 앱 조회가 connection reset으로 실패했고 재시도도 15초 timeout으로 끝났다. 새 앱을 설치·실행하지 않았으며 기존 앱을 제거하거나 기기 데이터를 초기화하지 않았다. 연결이 복구되면 기존 앱을 보존하는 업데이트 설치부터 이어가야 한다. Owner가 미룬 설치형 앱의 개인 계정 복원 확인은 미확인으로 유지한다.

기존 Tailscale 인증 복귀 주소를 유지했고 공개 SMTP·공개 인증 복귀 주소·운영 서버 데이터는 변경하지 않았다. 따라서 이 결과는 **개발용 설치 후보**이며 공개 출시 후보, 배포용 IPA/AAB, TestFlight 또는 스토어 제출 완료가 아니다. 출시 패키지는 별도로 [출시 검사 절차](RELEASE-PACKAGING.md)를 충족해야 한다.

## 2026-11-11 게스트 원본 보존 개발용 후보

소스 `3a0066a12959a2547449a35a36be241a37afe0df`의 게스트 원본 선택·보관·부분 내보내기 보완을 개발용 Native 후보로 패키징했다. 원본 검증은 재현 설치 → 289개 테스트/16개 파일 → 웹 빌드이며, 독립 Claude 재검토에서도 차단 사항이 없었다.

- Android sync와 Debug 빌드 성공. APK v2 서명 검증과 기존 디버그 서명 일치를 확인했다.
- iOS sync와 개발 서명 iPhone Debug 빌드 성공. `.app`의 deep/strict 서명 및 보관 ZIP 추출 후 서명을 확인했다.
- 두 패키지의 웹 파일 14개가 같은 소스의 dist와 일치했다. 번들·팀·Keychain 그룹·계정 서버/공개 클라이언트 설정과 개인 로컬 설정 파일 6개를 유지했다. 기존 프로파일을 재사용했으며 만료는 **2026-11-14 08:33 KST**다.
- 같은 소스의 개인용 미리보기를 기존 설정·저장 namespace 확인 후 교체하고 이전 파일을 보관했다. Mac의 로컬 HTTP와 Tailscale HTTPS가 모두 200 응답으로 동일 바이트를 반환했다.

이번 패키징에서는 기기 조회·설치·앱 실행을 하지 않았다. 물리 기기 저장 내구성, Keychain, 개인 계정 복원, Native 공유 창·파일 저장, 갱신된 미리보기의 아이폰 직접 조작은 확인하지 않았다. 기존 설치 앱과 사용자 데이터를 지우지 않았으며 공개 공급자 설정도 변경하지 않았다. APK는 디버그, iPhone 산출물은 기존 개발 서명 후보로, 출시 후보·TestFlight·스토어 제출 완료가 아니다.

## 2026-11-11 소셜 전송 개발용 컴파일 후보

소스 `a0863ab519f2113522958b03f6b7069b1caac88b`의 324개 테스트/18개 파일·웹 빌드·화면 점검 15개와 독립 Claude 재검토(차단 사항 없음)를 바탕으로 개발용 패키지를 만들었다. `android:sync` → Gradle `--no-daemon assembleDebug` → `ios:sync` → `ios:verify` → Xcode `Debug`, `generic/platform=iOS` 순서로 성공했다. 동기화 과정의 웹 빌드 외 전체 테스트를 반복하지 않았다.

- Browser 8.0.5를 공식 sync가 Android Gradle 두 파일과 iOS SPM에 등록했다. 실제 APK의 Browser 플러그인·콜백 intent 및 iOS의 플러그인·URL scheme 포함을 확인했다.
- Android v2 서명과 이전 디버그 서명 일치, iOS deep/strict 서명과 ZIP 추출 후 서명을 확인했다. ZIP에는 AppleDouble 메타데이터를 넣지 않았다.
- 두 패키지의 웹 파일 **15개**가 현재 dist와 정확히 일치했다. 기존 번들·팀·Keychain 그룹·프로파일·계정 서버/공개 클라이언트 설정을 유지했으며, 개인 환경·서명·scheme 파일도 변경하지 않았다. iOS 생성 config는 Browser 플러그인 등록만 추가됐다.
- 기존 개발 프로파일 만료는 **2026-11-14 08:33 KST**다. 새 인증서·프로파일 생성이나 프로비저닝 갱신 옵션을 사용하지 않았다.

기기 조회·설치·실행이나 GUI 조작은 하지 않았다. 실제 Google/Apple 로그인, Native cold/warm 복귀·browser 닫힘 순서·계정 연결·개인 계정 복원은 미검증이며 공급자 준비 플래그는 계속 꺼져 있다. 개인 미리보기·설치 앱·호스팅은 이번 패키징으로 갱신되지 않았다. 이 산출물은 개발용 APK와 iPhone `.app`/ZIP이며 출시 서명·TestFlight·스토어 제출 후보가 아니다.

후속 통합에서 같은 소스의 미리보기 6개를 빌드하고, 계정 서버/공개 키·저장 namespace를 대조한 뒤 기존 개인용 runtime을 원자 교체했다. 이전 HTML은 보관했다. Mac 로컬 HTTP와 기존 비공개 HTTPS의 응답이 모두 200이며 SHA256 `567ce91631a0b9771448e07ad8e2249a19cd554cb7c5e92a11ac1b9557d16c51`로 일치했다. 서비스 재시작·사용자 저장 변경·물리 아이폰 조작은 하지 않았다.
