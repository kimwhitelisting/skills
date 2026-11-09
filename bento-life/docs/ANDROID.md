# 안드로이드 앱 — 빌드와 출시

게임은 웹 기술(Vite + TypeScript)로 만들고 **Capacitor**로 감싸서 안드로이드 앱이 된다. 웹 코드는 그대로, `android/` 폴더가 앱 껍데기다.

## 이미 해 둔 것
| 항목 | 내용 | 파일 |
|---|---|---|
| 앱 설정 | 앱 이름 「냠냠졸졸」, 웹 파일 위치 `dist`, 배경색 | `capacitor.config.ts` |
| 패키지 이름 | **`com.paranstudio.dosirak`** (확정 · 스튜디오 파란). iOS 번들 ID도 같은 이름으로 | `capacitor.config.ts` |
| 저장 | 웹뷰의 통합 저장을 Preferences에 미러링하고 로그인 계정에 동기화한다. 복원 범위와 미전송 기록·저장 실패 제한은 [ACCOUNT-IMPLEMENTATION.md](ACCOUNT-IMPLEMENTATION.md), [STORAGE.md](STORAGE.md)를 따른다 | `src/entry-app.ts`, `src/game/save.ts` |
| 뒤로가기 | 창이 열려 있으면 닫기, 등굣길 도중엔 그대로, 타이틀이면 앱을 내린다 | `src/entry-app.ts`, `src/main.ts` |
| 아이콘 | 보자기 도시락 뒤로 빼꼼 보는 아이 (도트). 적응형 아이콘 + 예전 방식 네모·동그라미 | `scripts/android-assets.ts` |
| 시작 화면 | 크림색 바탕 + 두 아이와 보자기 도시락 | 〃 |
| 화면 방향 | 세로 고정 | 〃 (AndroidManifest 수정) |
| 글자 크기 | 휴대폰 설정에서 글자를 키워도 게임 화면은 그대로 (웹뷰 글자 배율 100%) — 화면이 넘치지 않게 | 〃 (MainActivity 수정) |
| 글꼴 | 갈무리11이 앱 안에 들어 있어 오프라인에서도 같다 | — |

## android 폴더
패키지 이름을 확정해서 **폴더째 깃에 올려 둔다**. 손으로 고친 곳은 `app/build.gradle`의 출시용 서명 설정뿐이다.
아이콘·시작 화면·세로 고정·글자 배율은 `scripts/android-assets.ts`가 넣는다 (`npm run android:assets`).
⚠ `npm run android:reset`은 android 폴더를 지우고 새로 만든다 — 패키지 이름이 확정된 지금은 쓸 일이 거의 없고, 쓰면 `app/build.gradle`의 서명 설정을 다시 넣어야 한다.

## 명령
```bash
npm run android:sync     # 웹 빌드 → android 폴더로 복사 (코드를 고칠 때마다)
npm run android:sync:release # 출시 계정 설정 검사 → 웹 빌드 → android 복사
npm run android:open     # Android Studio로 열기 (PC에서)
npm run android:bundle   # 출시용 AAB 빌드 (서명 설정이 있어야 함)
npm run android:assets   # 아이콘·시작 화면·세로 고정·글자 배율 다시 넣기
npm run android:reset    # android 폴더를 지우고 새로 만든다 (⚠ 서명 설정도 지워짐)
```

## 확인된 것
- 이 저장소의 클라우드 환경(JDK 21, Android SDK platform 36 · build-tools 36)에서 `./gradlew assembleDebug` 빌드 성공 — 디버그 APK 4.8MB, 패키지 `com.paranstudio.dosirak`, 앱 이름 「냠냠졸졸」, 세로 고정, targetSdk 36
- 2026-11-09에는 **4c5ed87 Debug APK**를 Android 16/API 36 ARM64 에뮬레이터에 설치해 새 게스트의 첫해 플레이·즉시 올해 사진 반영·Android BACK·강제 종료 후 같은 진행/도감 복원·설정 복귀를 확인했다. [환경·APK 식별·실제 동선과 한계](PLAYTEST.md#android-게스트-첫해-실행결산-문구-2026-11-09).
- 실제 Android 기기, 최소 API 24, 계정·네트워크 전환·오디오/진동·복구 파일 공유·OS 백업/기기 이전은 미검증이다. 고정 APK 이후 결산 문구만 수정했으며 새 Native 산출물이나 배포 검증으로 간주하지 않는다.

## PC에서 처음 빌드하기
1. **Android Studio** 설치 (JDK와 SDK가 같이 들어 있다). 또는 JDK 21 + Android SDK(platform 36, build-tools 36)
2. `npm install` → `npm run android:sync`
3. `npm run android:open` → Android Studio에서 ▶ 실행 (USB로 연결한 휴대폰이나 에뮬레이터)
   - 명령줄: `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`

## 패키지 이름
`com.paranstudio.dosirak` — 확정. Play에 한 번 올리면 영영 못 바꾼다. 게임 이름(「냠냠졸졸」)은 스토어에서 언제든 바꿀 수 있다.

## 서명 키 (출시용)
Play는 **업로드 키**로 서명한 AAB만 받는다. 키를 잃어버리면 업데이트를 올릴 수 없으니(재설정 신청은 가능하지만 번거롭다) 두 군데 이상에 따로 보관한다. **키와 비밀번호는 저장소에 절대 올리지 않는다.**
```bash
keytool -genkey -v -keystore upload-key.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```
`android/keystore.properties` (깃에 올리지 않음):
```
storeFile=/안전한/경로/upload-key.jks
storePassword=…
keyAlias=upload
keyPassword=…
```
`android/app/build.gradle`에는 이 파일이 있으면 읽어서 서명하는 설정이 이미 들어 있다 (없으면 서명 없이 빌드). 시험용 키로 `bundleRelease`가 서명된 AAB를 만드는 것까지 확인했다. `*.jks`·`keystore.properties`는 `android/.gitignore`에 들어 있다. Play Console에서 **Play 앱 서명**을 켜 두면 실제 배포 키는 Google이 보관한다.

## 출시 계정 설정 (2026-11-09)

출시 워크플로우는 `npm run build:release`를 사용한다. Settings → Secrets and variables → Actions의 **Variables**에 `BENTO_SUPABASE_URL`, `BENTO_SUPABASE_PUBLISHABLE_KEY`, `BENTO_AUTH_REDIRECT_URL`을 준비해야 한다. 워크플로우가 이를 대응하는 `VITE_` 변수로 명시적으로 전달한다. 공개 클라이언트 키만 사용하며 서버 secret/service_role 키는 넣지 않는다. 이 코드 변경은 GitHub 변수나 실제 서버 설정을 생성하지 않았다.

로컬에서는 Git에서 제외된 `.env.release.local` 또는 프로세스 환경으로 같은 `VITE_` 세 값을 제공한다. `release` 모드는 기존 `.env.local`도 읽으므로 대상 서버·메일 복귀 주소를 별도로 확인한다. 세 변수 외 다른 `VITE_` 변수, 누락/잘못된 프로젝트 주소·공개 키, 비밀 키는 출시 빌드에서 거부한다. 메일 복귀 주소는 공개 HTTPS 도메인 형식이어야 하며 IP 주소·localhost·Tailscale `*.ts.net`과 알려진 사설/예약 도메인은 거부한다. 따라서 개인 미리보기 주소만 있는 로컬 설정은 출시 명령을 통과하지 못한다. 값은 오류에 출력하지 않는다. 구문 검사는 DNS/서버 연결·메일 허용 목록·공개 SMTP 준비를 증명하지 않는다.

`npm run android:bundle`도 이 검사 경로를 거친다. `npm run build`/`android:sync`/preview는 개발·게스트 테스트를 위해 설정 없이 사용할 수 있으며 스토어 제출 경로로 대신 사용하지 않는다. Xcode에서 배포용 Archive를 만들 때도 먼저 `npm run ios:sync:release`를 사용한다. 서명·스토어 제출은 별도다.

근거(확인 2026-11-09): [Vite 환경·mode](https://vite.dev/guide/env-and-mode), [Supabase 공개/비밀 키](https://supabase.com/docs/guides/getting-started/api-keys).

## PC 없이 출시하기 (GitHub Actions · 휴대폰만으로)
키 만들기와 AAB 빌드를 GitHub이 대신 한다. 작업 파일: 저장소 맨 위 `.github/workflows/android-keygen.yml`, `android-release.yml`.
⚠ 두 작업은 **기본 브랜치(main)에 합쳐진 뒤에야** Actions 탭에 "Run workflow" 버튼이 생긴다.
⚠ 이 저장소는 **공개**라 작업 결과물(Artifacts)은 GitHub에 로그인한 누구나 받을 수 있다. 그래서 키는 비밀번호로 잠기고 하루 뒤 지워지며, 받은 뒤 바로 지운다.

**한 번만 — 업로드 키 만들기**
1. 비밀번호 관리 앱 등으로 **16자 이상** 비밀번호를 만들어 적어 둔다
2. 저장소 → Settings → Secrets and variables → Actions → New repository secret
   - 이름 `ANDROID_KEY_PASSWORD`, 값 = 위 비밀번호 (휴대폰 GitHub 앱에 설정 메뉴가 없으면 브라우저로)
3. Actions → **Android 1) 업로드 키 만들기** → Run workflow → confirm 칸에 `yes`
4. 끝나면 그 실행 화면 맨 아래 Artifacts의 `upload-key` 받기 → 압축 풀기
   - `upload-key.jks`를 **두 군데 이상** 보관 (클라우드 드라이브 + 다른 곳)
5. `upload-key.base64.txt` 안의 글자 **전체**를 복사 → New repository secret `ANDROID_KEYSTORE_BASE64`에 붙여 넣기
6. 실행 화면의 Artifacts에서 `upload-key` 옆 휴지통으로 **지운다**

이미 `ANDROID_KEYSTORE_BASE64`가 있으면 1) 작업은 일부러 실패한다 (키를 실수로 바꾸면 앱 업데이트를 못 올림).

**올릴 때마다 — 출시 파일 만들기**
1. Actions → **Android 2) 출시 파일(AAB) 만들기** → Run workflow → 버전 이름(예: `1.0.0`)
2. 끝나면 Artifacts의 `nyamjoljol-버전-번호` 받기 → 압축 풀면 `.aab` → Play Console에 업로드
- versionCode는 이 작업을 돌린 횟수라 누를 때마다 저절로 올라간다. 테스트도 돌려서 실패하면 빌드하지 않는다

## 버전 올리기
GitHub 출시 작업은 자동이다 (위). PC에서 빌드할 때는 `cd android && ./gradlew bundleRelease -PappVersionCode=2 -PappVersionName=1.0.1`처럼 넘긴다 (안 넘기면 1 / 1.0). versionCode는 Play에 올릴 때마다 전보다 커야 한다.

## Play Console에 올리기
1. 앱 만들기 → 기본 언어 한국어, 게임, 무료
2. 스토어 등록정보: [`STORE.md`](STORE.md)의 초안 + 스크린샷 (`art-src/store/`)
3. 앱 콘텐츠: 개인정보처리방침 URL ([`privacy-policy.md`](privacy-policy.md)를 웹에 올린 주소), 광고 포함 여부, **타깃 연령**, 콘텐츠 등급 설문, 데이터 보안 양식 — 답변 초안은 STORE.md
4. 테스트: 내부 테스트 → 비공개 테스트 (개인 개발자 계정은 **비공개 테스트 12명 이상 · 14일 이상** 조건이 있을 수 있다) → 프로덕션
5. `npm run android:bundle`로 만든 `android/app/build/outputs/bundle/release/app-release.aab` 업로드

## 광고를 붙일 때 (다음 단계)
- AdMob 계정과 앱 등록은 본인이 직접. 광고 단위 ID를 받으면 코드에 연결한다
- 광고를 넣으면 개인정보처리방침·데이터 보안 양식을 고쳐야 한다 (광고 ID 수집)
- 타깃 연령에 아동이 포함되면 광고 정책이 크게 달라진다 → 대상은 **성인(부모)**으로

## Native 로그인 정보와 OS 백업

2026-11-09 후보는 `allowBackup=true`를 유지하면서 `WSSecureStorageSharedPreferences.xml`만 legacy `fullBackupContent`와 Android 12+ `dataExtractionRules`의 cloud-backup/device-transfer에서 제외한다. 게임의 `CapacitorStorage.xml`은 제외하지 않는다. Keystore 키와 암호문을 서로 다른 기기에 복사해서 생기는 인증 오류를 줄이려는 설정이며, 계정 클라우드 저장과 OS 백업은 별개다.

고정 secure-storage 플러그인은 Keystore 별칭이 없으면 null을 반환할 수도 있다. 모든 복원에 오류가 발생한다고 단정하지 않는다. 확인된 손상만 이용자가 로그인 정보를 복구할 수 있고 게임·게스트·미전송 기록은 유지한다. [동작과 회귀 범위](ACCOUNT-IMPLEMENTATION.md#2026-11-09-native-로그인-정보-손상-보호). 실제 Android OS 백업·기기 전송·재로그인은 아직 시험하지 않았다. 공식 근거: [Android Auto Backup](https://developer.android.com/identity/data/autobackup), [사용 중인 secure-storage](https://github.com/aparajita/capacitor-secure-storage) (2026-11-09 확인).
