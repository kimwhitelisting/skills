# 소셜 인증 전송·복귀 구현

2026-11-11. Google 및 웹/Android Apple의 실제 PKCE 경로를 구현했지만 **현재 공급자 준비 플래그는 모두 꺼져 있다**. 실제 제공자 승인·서버 설정·소셜 계정 삭제·실기기 검증 전에는 버튼을 표시하지 않는다. iOS Apple은 별도 AuthenticationServices 구현과 유료 capability 확인 전까지 이 웹 경로에서 허용하지 않는다.

## 저장과 인증 경계

기존 이메일 로그인·가입 확인·비밀번호 복구 client는 implicit 방식과 `bento-auth:v1`을 유지한다. 별도의 Supabase JS **2.119.0** PKCE client는 `persistSession: true`와 제한된 adapter를 사용한다. 이 SDK는 false일 때 전달한 storage를 사용하지 않으므로 false에 의존하지 않는다.

adapter는 단일 `bento-social-transaction:v1` 레코드에 거래 ID·목적(login/link)·공급자·기존 UID·정확한 callback·만료·진행 단계와 최대 3개의 verifier 관련 항목만 보관한다. 임시 access/refresh/provider token과 임시 user는 메모리에만 존재한다. Native는 기존 device-only 보안 저장 port를 요구하고 Preferences/WebView로 대체하지 않는다. 웹은 같은 탭의 sessionStorage를 사용한다. 정상 종료·명시적 취소·확인된 만료는 verifier를 비우고 terminal metadata만 남긴다. 브라우저 닫힘·제공자 오류 자체는 취소로 단정하지 않고 복귀 대기와 명시적 취소 안내를 유지한다. 손상된 보안 레코드는 기존 명시적 복구 절차로 해당 social 키만 초기화할 수 있으며 주 로그인·게임 키를 지우지 않는다.

거래는 암호학적으로 생성한 ID, 10분 만료, 단일 진행 제한을 갖는다. `delete-reauth`는 아직 허용하지 않는다. SDK의 실제 S256 challenge·저장한 flowId·code verifier를 사용하며 충분한 WebCrypto가 없으면 진행하지 않는다. 고정 callback을 정확하게 등록하기 위해 `experimental.appendPkceFlowIdToRedirects`는 false다. 임의 transaction ID를 redirect query에 붙이거나 OAuth 공급자의 state를 덮지 않는다. callback의 code는 현재 단일 거래의 정확한 flowId/verifier로만 교환되며 다른 거래의 code는 서버 PKCE 검증을 통과할 수 없다.

코드 교환 뒤 서버 `getUser(access_token)`가 확인한 사용자·공급자를 검사한 후에만 주 client에 세션을 적용한다. 로그인 도중 기존 UID가 바뀌면 중단한다. 연결은 현재 계정에서 한 번 더 명시적으로 확인하고 같은 UID에 로그인 수단을 추가한다. 이메일·Apple relay 주소를 보고 다른 UID의 게임 기록을 합치지 않는다. link에서 빌린 주 세션을 임시 client가 refresh하거나 logout하지 않도록 120초 이상의 token 여유를 확인하고 임시 fetch의 refresh-token grant도 차단한다. 종료 시 SDK `dispose`와 adapter retirement로 채널·listener·늦은 쓰기를 정리하며 주 세션을 signOut하지 않는다.

새 인증을 열기 전에 게임 checkpoint와 비동기 저장을 확인하고 쓰기를 멈춘다. 취소/실패 뒤에는 저장한 checkpoint로 reload하며 이미 마운트된 옛 generation을 다시 활성화하지 않는다. 코드 교환과 최종 주 세션 적용의 경쟁도 구분한다. 적용이 시작된 뒤에는 취소 완료라고 표시하지 않는다. 보안 저장 적용이 throw/실패하면 결과를 불확실로 표시하고 다시 열어 확인하게 하며 이전 scope를 초기화하지 않는다.

## Web / Native 복귀

- 웹은 시작 앱과 같은 origin의 명시적 HTTPS URL을 쓴다. 별도 계정 도움말 origin은 verifier 저장소를 공유하지 않으므로 쓰지 않는다. 고정 `?bento_social=1`은 단일 HTML 호스팅에서도 사용할 수 있다. callback URL은 주 이메일/Auth client 요청 전에 제거한다. 기존 이메일 recovery fragment는 유지한다.
- 앱 HTML은 `no-referrer` meta를 사용한다. Vite는 meta 이전에 개발 client를 주입하므로 개발 서버 응답에도 `Referrer-Policy: no-referrer`를 설정한다. JS 실행 전 요청보다 먼저 URL을 지웠다고 주장하지 않는다. 실제 배포의 응답 정책과 callback 전달은 통합 단계에서 대조한다.
- Native는 공식 **@capacitor/browser 8.0.5**의 시스템 browser 경로를 사용한다. Google 로그인 UI를 앱 WebView에 넣지 않는다. `appUrlOpen`을 먼저 등록하고 `getLaunchUrl`을 조회해 cold/warm 복귀를 모으며 중복은 한 consumer에서 처리한다. 정확한 route는 `com.paranstudio.dosirak://auth/social`이며 scheme·host·port·path·query·fragment를 검사한다. iOS URL scheme과 Android intent filter를 추가했다. 아래 Native sync/compile은 확인했으며 실제 OS 복귀 동작은 별도 검증이다.

## 복귀 순서·재시작 보완

Android의 `browserFinished`가 `appUrlOpen`보다 먼저 와도 거래를 폐기하거나 reload하지 않는다. 앱 복귀 뒤 닫힘이 오는 순서도 동일한 한 번의 적용으로 처리한다. 사용자가 명시적으로 취소하면 저장한 진행으로 reload하며, 시작 실패 뒤에도 자동으로 옛 게임 쓰기를 재개하지 않는다.

`getLaunchUrl()`이 WebView reload 뒤 이전 주소를 돌려주는 경우를 위해, 정확히 검증한 callback의 기준 주소와 해독한 opaque code를 SHA-256으로 요약해 **최근 8개**만 기존 social 레코드에 보관한다. 원문 code·URL·token은 receipt에 넣지 않는다. 거래가 없는 상태에 도착한 code도 `tx:null`, 빈 verifier의 receipt-only 형태로 기억하고 다음 거래에 넘긴다. 코드 교환 전에 consuming 단계와 receipt를 함께 쓰고 읽어 확인하므로 중단된 전달은 로그인 성공으로 표시하지 않는다. 재시작하면 실패한 요청을 정리하고 명시적 재시도를 요구한다.

이미 기억한 callback은 새 거래를 바꾸지 않고 무시한다. 한 번도 관찰하지 못한 주소와 최근 8개에서 밀려난 오래된 주소까지 판별하는 장치는 아니다. 이 경우에도 PKCE와 서버 사용자 검증 없이 로그인되지는 않지만 현재 요청이 실패해 재시도가 필요할 수 있다. 공급자가 꺼져 transport를 만들지 않은 시기의 URL은 receipt 대상이 아니다. receipt 쓰기·읽기 확인 실패는 새 거래를 막고 앱을 다시 열어 확인하게 하며, 기존 로그인·게임 저장소는 지우지 않는다.

웹에서는 구문·형식 손상이 확인된 social 레코드에만 두 단계 초기화를 제공한다. 확인 직전 원문이 동일한지 다시 읽고 `bento-social-transaction:v1` 하나만 지운다. 저장소 접근 오류는 손상으로 취급하거나 자동 초기화하지 않는다. Native는 기존 보안 저장 복구 절차를 유지한다.

## 준비 설정

선택적 공개 설정 `VITE_SOCIAL_AUTH_CONFIG`는 JSON이다. 기존 세 가지 계정 변수만 있는 설정은 그대로 유효하다. 값이 없으면 아래와 같이 비활성화된다.

```json
{"providers":{"google":false,"apple":false},"socialDeletionReady":false,"webCallback":null}
```

개발 주소는 Git에서 제외된 `.env.local` 또는 프로세스 환경에만 넣는다. 명시적 HTTPS 비기본 포트도 개발 모드에서 허용하지만 현재 파일의 값을 바꾸지는 않았다. provider를 켜려면 삭제 준비 확인과 같은 앱의 정확한 callback이 함께 필요하다. 이런 플래그가 실제 서버 준비의 증명은 아니므로 총괄이 통합 검증 후 설정한다.

Release에서도 이 선택적 JSON은 기존 단일 설정/provenance 문서에 포함된다. 공개 HTTPS callback·기본 포트만 허용하고 Tailscale/사설/예약 도메인과 불완전한 준비 설정은 거부한다. 현재 GitHub workflow가 전달하는 기존 세 변수만으로는 계속 비활성화된다. 실제 provider client secret은 이 JSON/VITE/저장소에 넣지 않는다.

## 실제 확인과 남은 범위

`npm ci` → 전체 **324개 테스트/18개 파일** → TypeScript/Vite 빌드를 통과했다. 설치된 실제 SDK를 사용하는 격리 응답 시험에서 challenge/verifier/flowId, cold restart, 잘못된 code/route/중복/만료, 취소·지연 응답·최종 적용 경쟁, primary refresh/logout 방지, 보안 저장 실패와 기존 이메일 복구/게스트 경계를 검사한다.

실제 headless 앱·SDK의 HTTPS 합성 provider 왕복과 손상 요청 복구 **15개 검사**는 S256 proof와 단일 교환, 서버 확인 후 첫 계정 저장 선택, URL scrub, 임시 세션 비영속, 이메일 유지, 미준비 Apple 버튼 비노출, code가 없는 asset referrer를 확인했다. Auth/RPC/provider 응답은 모두 격리된 합성이며 운영 API·실제 Google/Apple 계정·메일을 쓰지 않았다. 초기 검사에서 Vite client의 code-bearing referrer를 발견해 응답 정책을 보완한 후 통과했다. 후속 실제 브라우저 검사에서는 초기화 확인·취소·정확한 social 키 제거와 primary/게임 원문 보존도 확인했다.

`a0863ab`로 공식 Android/iOS sync와 Android Debug·generic iOS Debug 컴파일을 통과했다. Browser 플러그인 등록과 콜백 route가 산출물에 포함됐고, 양쪽 웹 자산 15개·서명·기존 계정 설정 보존을 확인했다. [패키지 검증 범위](MAC-BUILD.md#2026-11-11-소셜-전송-개발용-컴파일-후보)를 따른다. 이는 OS의 browser 열기·닫기 순서나 실제 callback 처리를 실행한 검증이 아니다.

현재 남은 것은 실제 Google/Apple 준비, 서버의 정확한 callback 허용, 소셜 전용 계정의 서버 검증 재인증·삭제와 Apple grant 취소, iOS AuthenticationServices 및 실제 Native cold/warm 복귀·취소·계정 연결 검증이다. 공급자는 비활성화 상태다. 총괄의 후속 통합에서 개인 미리보기만 기존 설정·저장 namespace를 유지해 갱신하고 Mac HTTP/HTTPS 응답 일치를 확인했다. 기존 설치 앱·공개 호스팅은 변경하지 않았다.

공식 근거: [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [계정 연결](https://supabase.com/docs/guides/auth/auth-identity-linking), [Capacitor Browser](https://capacitorjs.com/docs/apis/browser), [Capacitor App](https://capacitorjs.com/docs/apis/app). 2026-11-11 changelog와 고정 SDK의 GoTrueClient/helpers 구현을 함께 확인했다.
