# 앱 밖 계정 삭제 · 비밀번호 복구

2026-11-10 구현 후보. **공개 운영 주소·지원 이메일·SMTP는 아직 확정/배포하지 않았다.** 이 문서는 공개 삭제 URL이 준비됐거나 스토어 요구사항을 모두 충족했다는 뜻이 아니다.

## 이용 흐름과 삭제 범위

1. 앱 설치 없이 별도 웹페이지에서 이메일·비밀번호로 로그인한다. 서버가 확인한 계정 이메일을 표시한다.
2. 삭제 범위를 읽고 현재 비밀번호를 다시 입력한 뒤 체크박스와 최종 삭제 버튼으로 확인한다. 취소는 삭제 요청을 보내지 않는다.
3. 기존 `bento-delete-account`가 같은 계정의 암호 재인증 → 세션 취소 → 계정 삭제를 수행한다. 페이지는 명시적인 `deleted: true` 응답만 완료로 표시한다.
4. 비밀번호를 잊었다면 메일을 요청하고 새 탭의 재설정 화면에서 바꾼다. 변경 후에는 다시 로그인해야 하며 자동으로 삭제하지 않는다.

삭제 대상은 서버 Auth 계정과 연결된 현재 게임 저장·저장 작업 기록이다. 도감·게임에서 얻은 하트·설정도 그 저장에 포함된다. 현재 광고·실제 결제는 없다. **웹페이지는 앱/브라우저 게임 저장을 읽거나 지우지 않는다.** 앱 안 삭제의 현재 기기 캐시 정리와 다르며, 다른 기기의 오프라인 사본·내보낸 파일·OS 백업도 별도로 관리해야 한다. 제공자 로그·운영 백업의 물리 삭제나 보존 기간을 확약하지 않는다. [개인정보처리방침 초안](privacy-policy.md)의 운영 미확정 항목을 먼저 정리해야 한다.

응답 유실·실패·503은 이미 삭제됐거나 일부 절차만 끝난 **결과 불명**으로 표시한다. 상태/receipt API가 없으므로 로그인 실패만으로 삭제 성공을 추정하지 않으며 자동으로 재전송하지 않는다. 지원 문의 또는 새 로그인과 새 최종 확인이 필요하다. MFA 계정 삭제는 기존 서버가 지원하지 않으며 별도 지원 절차가 필요하다.

## 인증 경계

- 기존 Supabase JS 2.119.0을 별도 client로 사용한다. 게임 `account.ts`, 저장소, 작성 잠금, Native 모듈을 import하지 않는다.
- `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`, 독립 `storageKey`를 사용한다. 비밀번호·세션은 이 페이지 메모리에만 있으며 게임 snapshot·localStorage·sessionStorage·IndexedDB·로그에 넣지 않는다. 페이지 종료/새로고침 후 재로그인한다.
- 메일은 공식 implicit 복구 흐름이다. recovery fragment만 엄격히 받아 즉시 주소에서 제거하고, `setSession` 이후 서버 `getUser`를 확인한다. URL에서 받은 이메일/사용자 ID를 권위로 쓰지 않는다. 다른 종류 링크·중복 필드·query 토큰은 거부한다.
- 비밀번호 변경 성공/결과 불명 뒤 인증을 정리한다. 고정 SDK의 `weak_password`·`same_password`와 명시적 400/422 응답만 수정 입력을 위해 복구 화면에 머문다. 취소의 서버 로그아웃은 `scope: local`이며 다른 기기의 세션을 임의 취소하지 않는다. 페이지 종료 시 진행 중 요청을 중단하고 메모리 client를 폐기한다. 이미 서버에 도착한 삭제 요청은 취소로 되돌릴 수 없다.
- 요청과 응답 본문 읽기에 시간 제한을 둔다. 오류 원문·비밀번호·토큰은 화면/로그에 노출하지 않는다. 사용자 이메일은 `textContent`로 표시한다.
- self JS/CSS와 지정된 API만 쓰는 CSP meta, `no-referrer`, URL 경로/출처 일치 검사를 포함한다. 실제 호스트에도 HTTPS, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, CSP의 `frame-ancestors 'none'`, `X-Frame-Options: DENY` 등 응답 헤더를 설정하고 별도 검증한다. 분석 스크립트/외부 추적기를 추가하지 않는다.

## 별도 빌드

앱 `dist`, 미리보기 `dist-preview`, Native public 자산과 독립이다. 새 의존성이나 lock 변경은 없다.

```sh
npm ci
npm test
npm run build
npm run build:account-web       # 공개 설정 필수 → dist-account-web/
```

아래 네 변수를 빌드 환경에 제공한다. 값은 공개 클라이언트 설정이지만 개인 개발 주소·실제 운영 연락처를 이 문서에 복제하지 않는다. `.env` 파일은 Git에서 제외된다.

| 변수 | 의미 |
|---|---|
| `BENTO_WEB_SUPABASE_URL` | 기존 계정 서비스를 사용하는 HTTPS Supabase 프로젝트 기본 주소 |
| `BENTO_WEB_PUBLISHABLE_KEY` | 해당 프로젝트의 `sb_publishable_…` 공개 키. 서버 secret/service_role/JWT 불가 |
| `BENTO_WEB_RETURN_URL` | 이 페이지 자체의 정확한 공개 HTTPS 주소. Auth redirect allowlist에 등록해야 함 |
| `BENTO_WEB_SUPPORT_EMAIL` | 실제 운영자가 확인하고 응답할 지원 이메일 |

누락·비밀 값·알 수 없는 `BENTO_WEB_` 변수·사설/예약 주소·잘못된 메일·query/fragment가 있는 복귀 주소는 출력 디렉터리를 비우기 전에 거부한다. 호스팅의 루트/index 리다이렉트도 `BENTO_WEB_RETURN_URL`의 정확한 경로로 끝나는지 확인한다. 문법 검사로 주소 소유권·접속 가능성·SMTP 작동을 보장하지 않는다. 공개 설정이 없으므로 현재 공개 빌드는 의도적으로 실패한다. 운영 정보가 결정된 후 실제 계정 서비스·공식 주소와 대조한다.

`npm run build:account-web:local`은 두 주소를 **HTTP loopback**으로 제한하고 로컬 anon JWT만 추가로 허용한다. `dist-account-web-local/`에 ‘로컬 시험용’ 안내가 있는 후보를 만든다. 기존 hosted 설정을 그대로 사용하면 거부한다. 로컬 산출물은 공개 배포하지 않는다. 설정은 별도 네 변수만 읽으며 기존 앱의 `VITE_` 설정은 사용하지 않는다.

별도 웹 출력이 게임 번들을 바꾸지는 않지만, `src`·`package.json` 변경은 기존 앱의 출시 provenance source digest에 포함된다. 이전 출시 provenance를 재사용하지 말고 다음 실제 Native 출시 후보는 기존 `build:release` → sync → 패키지 검증 절차를 다시 따른다. 이 작업은 Native 재컴파일·서명·설치를 하지 않는다.

## 검증과 공개 전 남은 조건

- 실제 메일 시험에서 Auth의 빈 `sb` fragment 필드를 거부하는 호환 문제를 발견했다. [공식 서버 변경](https://github.com/supabase/auth/commit/2d3dbc6)을 확인해 선택적인 빈 필드 하나만 허용하고 중복/비어 있지 않은 값은 거부한다. 이 표시는 인증 근거로 사용하지 않으며 서버 사용자 확인은 그대로 유지한다.
- 단위 검증: 필수 설정/비밀/hosted 로컬 유출 거절, 복구 링크 주소 제거·중복/잘못된 타입 거절, 취소·중복 클릭·결과 불명·암호 변경 후 재로그인, 종료 뒤 늦은 응답 차단, 실제 고정 SDK의 메모리 인증·live user 일치·password-only 삭제 요청. 실제 loopback 응답 본문 stall의 시간 제한도 검사한다.
- 기존 `npm ci` → 전체 **257개 테스트/15개 파일**(자동 플레이 2,000판 포함) → 앱 빌드와 별도 로컬 웹 빌드를 통과했다. 실제 공개 빌드는 설정 누락/secret 두 경우 모두 출력 생성 전에 거절됐다. 합성 공개 형식 네 값으로 공개 모드의 빌드 성공도 확인했고 local 안내 표시 차이·CSP API 대상·동일 CSS/파일 종류를 대조했다. 이 산출물은 외부 요청 없이 별도 시험 보관소로 옮겨 비배포용으로 표시했으며 실제 도메인·운영 설정의 준비를 뜻하지 않는다. 기존 앱 dist 14개, preview 30개, iOS/Android public 각 16개 파일은 전후 바이트가 같고 lockfile도 유지됐다.
- 별도 로컬 Auth/DB/Edge의 합성 계정으로 실제 HTTP 삭제 10개·복구 9개 검사를 통과했다. 첫 브라우저 후보는 취소·미확인 체크박스·틀린 암호·실제 삭제 후 old JWT 거부·다른 계정 보존·390px 키보드/넘침 등 **12개 확인 뒤** 위 `sb` 호환 결함에서 중단됐다. 이를 고친 최종 후보에서 실제 Mailpit 새 탭 복구, weak/same 암호 거부 후 재입력, 새 암호 로그인, 저장 보존 및 실제 삭제, 서버가 삭제했지만 응답을 유실한 경우의 결과 불명/자동 재시도 없음, 320px dark/키보드 등 **후속 16개 검사**를 통과했다. 두 후보의 증거를 최종 후보 전체 동선 재실행으로 합쳐 주장하지 않는다.
- 해당 headless Chromium 시험에서 game/journal 합성 저장과 localStorage·sessionStorage·쿠키·IndexedDB 상태가 전후 같았고, 페이지 uncaught 오류는 없었다. 예상한 API 거부/네트워크 실패는 별도로 발생했다. 모든 요청은 새 시험용 loopback 대상이었다. 시험 후 합성 users/identities/sessions/saves/operations가 모두 0임을 확인하고 시험 서버와 테스트 자격증명을 정리했다. 합성 테스트는 운영 SMTP, 실제 개인 계정, iPhone Safari 또는 Native 기기 검증을 대체하지 않는다.
- 공개 전: 운영자·지원 메일·도메인 확인, 정적 호스팅/보안 헤더, 기존 Auth redirect allowlist 및 실제 SMTP, 공식 메일의 새 탭 복구, 삭제 결과/문의 처리, 스토어 외부 삭제 URL 등록이 필요하다. 정책의 로그/백업 보존 기간을 임의로 작성하지 않는다.

공식 근거(2026-11-10 확인): [Supabase 비밀번호 복구](https://supabase.com/docs/guides/auth/passwords), [implicit flow](https://supabase.com/docs/guides/auth/sessions/implicit-flow), [resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser), [Google Play 계정 삭제 요구사항](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en). 현재 changelog의 CLI/Flutter 변경을 앱 SDK 업그레이드로 혼동하지 않는다.
