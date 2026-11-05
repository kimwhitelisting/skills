# 안드로이드 앱 — 빌드와 출시

게임은 웹 기술(Vite + TypeScript)로 만들고 **Capacitor**로 감싸서 안드로이드 앱이 된다. 웹 코드는 그대로, `android/` 폴더가 앱 껍데기다.

## 이미 해 둔 것
| 항목 | 내용 | 파일 |
|---|---|---|
| 앱 설정 | 앱 이름 「냠냠졸졸」, 웹 파일 위치 `dist`, 배경색 | `capacitor.config.ts` |
| 패키지 이름 | **`com.paranstudio.dosirak`** (확정 · 스튜디오 파란). iOS 번들 ID도 같은 이름으로 | `capacitor.config.ts` |
| 저장 | 웹뷰 저장소 + 앱 저장소(@capacitor/preferences)에 같이 쓴다. 기기 저장 공간이 부족해 웹뷰 저장소가 지워져도 진행·도감·하트가 남는다 | `src/entry-app.ts`, `src/game/save.ts` |
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
npm run android:open     # Android Studio로 열기 (PC에서)
npm run android:bundle   # 출시용 AAB 빌드 (서명 설정이 있어야 함)
npm run android:assets   # 아이콘·시작 화면·세로 고정·글자 배율 다시 넣기
npm run android:reset    # android 폴더를 지우고 새로 만든다 (⚠ 서명 설정도 지워짐)
```

## 확인된 것
- 이 저장소의 클라우드 환경(JDK 21, Android SDK platform 36 · build-tools 36)에서 `./gradlew assembleDebug` 빌드 성공 — 디버그 APK 4.8MB, 패키지 `com.paranstudio.dosirak`, 앱 이름 「냠냠졸졸」, 세로 고정, targetSdk 36
- 실제 기기·에뮬레이터 실행은 아직 안 해 봤다 (디버그 APK를 휴대폰에 설치해서 확인)

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

## 버전 올리기
`android/app/build.gradle`의 `versionCode`(올릴 때마다 +1)와 `versionName`("1.0.1" 등).

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
