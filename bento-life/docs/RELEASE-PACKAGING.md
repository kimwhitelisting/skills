# 출시 웹·네이티브 내용 검사

2026-11-10.

`npm run build:release`는 공개 계정 설정뿐 아니라 실제 생성된 HTML·JS·CSS·글꼴을 기록한다. 직접 Gradle Release 또는 Xcode Archive를 실행해도 복사된 내용이 이 기록과 맞아야 한다. 이는 개발 파일·오래된 파일·다른 설정의 혼합을 방지하는 검사다. 악의적인 소스 작성자에 대한 서명·공급망 증명이나 서버·SMTP·스토어 준비 완료를 뜻하지 않는다.

## 빌드와 설정

기존 `.env.release.local` 또는 프로세스의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_AUTH_REDIRECT_URL`을 쓴다. 비밀 키는 사용할 수 없다. 실제 값은 Git에 넣지 않는다. [기존 설정 조건](ANDROID.md#출시-계정-설정-2026-11-09)을 따른다.

```sh
npm ci
npm test
npm run build:release
npx cap sync android
cd android
./gradlew bundleRelease
```

iOS는 `npm run ios:sync:release` 후 Xcode에서 빌드한다. 웹 빌드와 네이티브 검사에서 **동일한 세 설정**을 제공한다. Xcode PATH에는 Node 22가 있어야 한다. 기존 AAB workflow도 웹 빌드와 Gradle 단계 양쪽에 같은 공개 Variables를 전달한다. 이 변경은 CI를 실행하거나 실제 Variables·서명 키를 만들지 않는다.

일반 `build`, `dev`, `build:preview`, Debug 빌드는 기존 개발 경로를 유지한다. 개발 빌드를 스토어 후보로 사용할 수는 없다. 일반 release 출력은 기존 `dist`로 한정하며 `emptyOutDir:false`, 다른 출력 경로, symlink인 `dist`는 거절한다. 합성 출력만 새 외부 폴더를 허용한다. 이 출력 조건과 출시 설정 오류는 Vite가 폴더를 비우기 전에 검사한다.

## 검사 범위

- Vite의 resolved 환경에서 세 값을 검증하고 `index.html`의 비실행 JSON 블록에 넣는다. release의 계정 모듈은 그 블록만 읽는다. 누락·중복·잘못된 블록에 게스트/env fallback은 없다. HTML 종료 문자는 escape한다. MODE/env를 바꾸는 `define` override는 거절한다.
- `bento-release.json`에는 실제 설정과 digest, 원본/lock/빌드 검사 입력 digest, Node major·Vite 버전·resolved 빌드 옵션, 전체 웹 파일 해시와 실제 chunk 연결을 기록한다. 문서·Git HEAD·로컬 서명 파일은 원본 digest에 넣지 않는다.
- 생성 entry에서 실제 config consumer chunk가 도달 가능해야 한다. 복사된 파일의 누락·추가·변조와 현재 원본/선택 설정과 다른 결과를 거절한다. 이 graph는 Vite가 기록한 현재 번들의 근거이며 임의 JavaScript 동작 전체를 증명하는 분석기는 아니다.
- public 폴더 또는 APK/AAB 내부의 실제 파일을 검사한다. 현재 Capacitor가 추가하는 `cordova.js`, `cordova_plugins.js`는 **0바이트**일 때만 예외다. 중복 ZIP 경로·추가 파일·symlink 입력은 거절한다. Cordova 플러그인을 추가하면 이 빈 stub 조건을 별도 검토해야 한다.
- 복사된 Capacitor 설정은 기존 앱 ID·`webDir: dist`·플랫폼 override를 포함한 logging none이어야 한다. `server`로 원격 페이지를 대신 불러오는 설정은 거절한다.

```sh
node --experimental-strip-types scripts/verify-release-native.ts \
  --assets android/app/src/main/assets/public \
  --capacitor android/app/src/main/assets/capacitor.config.json
node --experimental-strip-types scripts/verify-release-native.ts --archive path/to/app-release.aab
node --experimental-strip-types scripts/verify-release-native.ts --app path/to/App.app
```

Gradle은 `preReleaseBuild` 전에 복사된 내용을 검사한다. 실제 `packageRelease`, `packageReleaseBundle`, `signReleaseBundle`의 finalizer는 생성 APK/AAB를 다시 읽는다. 검사 task는 자체 출력이 없어 producer가 UP-TO-DATE여도 실행한다. 앱 서명 방식·키·ID는 변경하지 않는다. finalizer가 실패한 뒤 APK/AAB 파일이 남아 있어도 배포 후보로 사용하지 않는다.

Xcode는 Release 구성 **또는** install/archive action에서 Sources 전과 Resources 후 두 번 검사한다. Debug 구성의 Archive도 검사 대상이다. 일반 Debug build에는 적용하지 않는다. 두 phase는 환경 전체를 로그에 출력하지 않는다. 웹 빌드 뒤 Xcode 저장 등으로 원본 native project/build 파일이 바뀌면 stale로 거절되므로 release 웹 빌드와 sync를 다시 수행한다.

## 합성 검사와 완료 범위

회귀의 실제 Vite 합성 빌드는 `BENTO_RELEASE_TEST_ONLY=1`과 새 외부 출력 폴더만 사용한다. 기존 폴더를 비우지 않으며 provenance에 비배포 표식을 남긴다. **production native 검사에는 이 표식을 허용하는 옵션·환경 우회가 없다.** 합성 도메인/키의 문법 통과는 실제 서버 존재·접속·메일 설정 증거가 아니다.

회귀는 실제 Vite 출력의 누락·추가·변조·stale·설정 불일치·외부 entry·중복 JSON, native 설정 override, 실제 컴파일된 설정 모듈의 소비/누락 실패를 확인한다. compiled module 시험은 네트워크를 금지한 별도 Node 과정이며 실제 계정 로그인 시험이 아니다. 전체 앱 bundle의 도달 graph 검사와 구분한다.

네이티브 독립 검증 결과는 [MAC-BUILD.md](MAC-BUILD.md)에 기록한다. copied JS를 바꾸지 않은 Debug 컴파일은 hook/빌드 호환 증거이며 새 release runtime의 기기 실행 증거가 아니다. 기존 개인 미리보기·실제 iPhone 앱·계정 데이터·사용자에게 미룬 개인 계정 확인은 변경하지 않는다. 서명된 출시 APK/AAB·Archive·스토어 업로드와 운영 서버/SMTP는 별도 확인이 필요하다.

근거: [Vite 환경과 mode](https://vite.dev/guide/env-and-mode), [Vite plugin API](https://v6.vite.dev/guide/api-plugin), [Gradle task 구성](https://docs.gradle.org/current/userguide/writing_tasks_intermediate.html), [Xcode custom build script](https://developer.apple.com/documentation/xcode/running-custom-scripts-during-a-build). 구현 API는 설치된 Vite 6.4.5·Gradle/AGP 버전과 대조했다.
