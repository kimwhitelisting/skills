# 계정 저장 구현·웹 실기기 검증 — BENTO-ACCOUNT-IMPL-001

구현 시작 기준은 2026-11-06의 e3f1baa이며, 최신 실기기 확인일은 **2026-11-07**이다. BENTO-ACCOUNT-IMPL-001의 구현과 iPhone 웹 가입·저장·복원 검증은 완료했다. 결제는 포함하지 않으며 공개 출시나 Native 설치 검증 완료를 뜻하지 않는다. Native·출시 잔여 검증은 BENTO-STABLE-001에서 이어간다.

## 설정과 로그인

- Node22/npm·기존 Capacitor8 구성을 유지한다. 추가 의존성은 정확 버전 Supabase JS2.119.0, capacitor-secure-storage8.0.1과 해당 전이 의존성이다. 기존 잠금 패키지는 변경하지 않았다.
- `.env.example`을 참고해 무시되는 `.env.local`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 넣고 빌드한다. 이 두 값은 공개 클라이언트 설정이다. 서비스 관리자 키·서버 비밀은 앱/환경 예제/저장소에 넣지 않는다.
- 설정이 없으면 기존 게스트 게임을 사용할 수 있고 계정 화면에 연결 미준비를 표시한다. 설정이 잘못되거나 안전한 토큰 저장소를 열지 못하면 조용히 다른 계정이나 평문 Native 저장소로 넘어가지 않는다.
- 현재 동작 경로는 이메일/비밀번호 가입·이메일 확인·로그인·확인 메일 재전송·비밀번호 재설정이다. Apple/Google 로그인 버튼은 구성되지 않아 제공하지 않는다. 호스팅의 기본 메일 서비스는 테스트 조직의 허용 이메일로 제한되어 일반 공개 가입 준비가 아니다.
- 웹 확인/재설정 메일은 현재 origin/path를 redirect로 요청하며 서버 허용 목록에 있어야 한다. Native에서는 별도 VITE_AUTH_REDIRECT_URL의 허용된 웹 주소로 돌아온다. 검증되지 않은 custom deep link는 사용하지 않는다. 2026-11-07 Owner가 실제 iPhone에서 가입·확인 메일을 통한 이메일 인증·로그인 성공을 보고했다. 비밀번호 재설정과 Native 앱에서의 로그인은 별도 확인 대상이다.
- Native 토큰은 iOS Keychain/Android Keystore 기반 별도 저장 어댑터에만 둔다. iCloud 동기화를 끄고 iOS는 device-only 접근을 사용한다. 웹은 SDK의 별도 브라우저 Auth 저장 공간이며 암호화된 기기 저장소라고 표시하지 않는다.
- 비밀번호는 요청 동안만 사용하며 저장하지 않는다. 토큰은 게임 snapshot·복구 원본·JSON 내보내기·클라우드 게임 저장에 포함하지 않는다.

## 저장과 계정 전환

- 기존 guest 저장 키는 그대로 남긴다. 계정 UUID별 게임 저장/last-good/복구 원본 namespace와 별도 동기화 journal을 사용한다. 내보내기는 현재 게임 scope의 복구 원본만 읽는다.
- 새 계정에 서버 저장이 없으면 사용자가 기존 기기 기록 가져오기 또는 새로 시작을 고른다. 이전은 원본을 남기는 복사이며 하트/도감을 합치지 않는다. 선택하지 않고 로그아웃해도 guest 기록은 유지된다.
- 서버 저장이 있으면 검증 후 해당 계정 scope로 복원한다. 같은 계정의 미전송 기기 후보가 있으면 원본을 먼저 보호하며 다른 기기의 최신 진행과 충돌한 경우 양쪽 요약과 선택을 제공한다.
- 매 게임 저장은 먼저 기기에 기록한다. 계정별 journal은 최신 후보와 전송 중 operation ID/기반 revision/원본을 보관한다. 0.5초 게임 checkpoint마다 서버 요청을 하지 않고 최대 3초 간격으로 묶어 전송하며, 실패 후 재시도한다.
- 서버 응답 유실 시 같은 operation ID와 같은 원본을 다시 보낸다. 이전 작업의 중복 ACK가 더 최신 서버 revision을 반환하면 성공으로 덮지 않고 충돌로 처리한다. JSON 객체 키 순서 차이는 새 저장으로 취급하지 않는다.
- 충돌 선택 전 양쪽 원본을 계정별 복구 기록에 남긴다. 선택하지 않은 기록을 임의로 합치거나 유료 권리로 해석하지 않는다. 현재 별도 가져오기 UI는 첫 계정 저장 선택에만 제공한다.
- 동일 origin은 Web Locks로 하나의 작성 창만 허용한다. 두 번째 탭은 저장을 시작하지 않으며 기존 탭을 닫고 다시 열도록 안내한다. 잠금 API 미지원은 안전하게 중단한다. Native WKWebView 지원은 Simulator와 실기기에서 따로 확인해야 한다.
- 선택·복원은 설치 의도를 먼저 영속화하고, 설치 성공까지 자동 전송을 막는다. 이전 화면의 저장 generation을 폐기해 reload/pagehide가 옛 상태를 재기록하지 못하게 하며 boot 이후 복원은 새 런타임을 연다. 삭제도 정리 전에 generation을 폐기한다.
- 로그인 계정이 바뀌면 이전 sync를 중지하고 런타임을 다시 시작한다. 각 RPC는 요청 직전 소유 계정을 확인하고 그 요청의 bearer를 고정한다. 이전 작업의 늦은 응답을 다른 계정 화면/저장에 적용하지 않는다.
- 로그아웃은 미전송 계정 journal을 보관한다. 다시 같은 계정으로 로그인하면 이어서 전송한다. 기기 쓰기 실패가 해결되지 않으면 저장되지 않은 진행 보호를 위해 로그아웃을 중단한다.
- 웹 브라우저 데이터 삭제/OS에 의한 WebView 저장소 제거는 미전송 journal을 잃게 할 수 있다. Native 게임 사본이 남았다면 계정 충돌 후보로 보존하지만, 서버가 확인하지 않은 최신 진행의 복원을 보장하지 않는다.

## 서버 계약과 삭제

- `bento_get_save()`와 `bento_put_save(p_expected_revision,p_operation_id,p_snapshot)`를 사용한다. 서버는 인증 사용자만 기준으로 CAS/중복 방지/접근 권한을 확인하며 클라이언트가 owner를 보내지 않는다. DB 구현/배포는 별도 검증 기록을 따른다.
- 서버 형식은 snapshot v1(run 선택, dex, prefs)이며 기존 게임 구조를 검증한다. 결제 원장은 없다. 손상된 local journal이나 서버 응답은 기본 새 게임으로 덮지 않는다.
- 삭제는 확인 화면과 현재 비밀번호 재입력 후 `bento-delete-account`에 요청한다. 서버가 `{deleted:true}`를 반환한 경우에만 현재 계정의 기기 캐시/journal/Native 사본을 정리하고 로그아웃한다. guest/다른 계정/기존에 외부로 내보낸 파일은 삭제하지 않는다.
- 삭제 완료 응답을 받지 못하면 완료했다고 표시하지 않는다. 서버 세션 해제 후 삭제에 실패한 경우 다시 로그인해야 할 수 있다. 삭제 대상 UUID 표시는 복구용으로 남겨 같은 기기의 오래된 세션을 다시 열지 않는다.
- 결제/다른 OAuth 계정/MFA 삭제는 이 후보의 지원 범위가 아니다. 계정 생성·저장·삭제의 실제 개인정보 안내와 운영자 연락처/보관 정책은 공개 출시 전 실제 서버 설정에 맞춰 확정해야 한다.

## 검증 및 실제 기기 범위

- **2026-11-07 실제 iPhone 웹:** Owner가 가입·이메일 확인·로그인 성공을 직접 보고했다. 서버에서는 해당 검증 시점의 집계로 인증·로그인 완료 1건과 저장 revision **1→15** 증가를 확인했다. 계정 식별자나 게임 원문을 공개 기록에 포함하지 않았다.
- **같은 iPhone의 별도 저장 공간 복원:** Owner가 Safari 개인정보 보호 모드의 새 탭에서 같은 계정으로 로그인한 뒤 “같은 진행으로 복원됐어요”라고 직접 확인했다. 일반 탐색과 분리된 브라우저 저장 공간에서 계정 복원을 확인한 시험이며, 다른 물리 기기로 교체하거나 앱을 재설치한 시험은 아니다.
- 자동 회귀: 기존76개 + 신규 sync/auth/writer/lifecycle/boot35개 =111개 통과. 신규 항목은 명시적 첫 저장 선택, 다른 기기 복원, 충돌 원본 보존, 응답 유실 재시작, 오래된 중복 ACK, 최신 checkpoint 보존, 스로틀, 계정 전환/늦은 응답, quota·손상·잘못된 응답, bearer 계정 고정, secure storage 실패, guest 읽기 경계와 복원·삭제 뒤 stale lifecycle 쓰기 차단이다. 단일 HTML의 eager import에서도 게임 초기화는 명시적인 `mountGame()` 호출 전까지 시작하지 않는다.
- TypeScript·웹 빌드, Android/iOS 플러그인 sync, Android debug compile과 unsigned iOS Simulator compile을 통과했다. 단일 HTML 미리보기는 동적 import의 JS/CSS도 함께 묶는다. Native 보안 저장 어댑터 모의 테스트는 실제 Keychain/Keystore 접근 검증을 대신하지 않는다.
- 후보4 실제 브라우저 UI: 게스트 “우진 · 1살” 생성/새로고침 보존 → 테스트 계정 B 로그인/명시적 가져오기 → 새로고침 후 보존 → 계정 패널 닫기 → 분유 주식 선택/“계정에 저장됨” → 저장이 없는 별도 origin에서 같은 계정 로그인 → 같은 이름·나이·주식 선택과 남은 두 칸 복원까지 통과했다. 같은 origin의 두 번째 탭은 작성 잠금으로 차단됐다. 후보4 HTML SHA256: `35d303329d0246963c17ea419ca28ddbb4093b0d66399ffc0675b7848ffce8eb`.
- 계정 전환 UI도 통과했다: B 로그아웃 후 게스트의 “우진 · 1살” 원본이 유지됐고, A 로그인 후 A의 기존 하트150·진행 없음이 표시되어 B의 우진 진행이 섞이지 않았다.
- 별도 서버 검증에서 실제 두 테스트 사용자 접근 분리·동시 CAS·응답 유실 재전송·새 로그인 복원을 통과했다. 계정 삭제 UI·비밀번호 재설정, 실제 iPhone의 오프라인 진행/재연결·충돌, 다른 물리 기기의 복원 및 재설치는 별도 확인 대상이다. 위 Safari 검증은 Native iPhone 설치 검증이 아니다.
- Mac 화면 잠금으로 Simulator UI 확인은 진행하지 못했다. 따라서 iOS Native 결과는 unsigned compile 성공까지이며 WKWebView의 Web Locks 지원과 Keychain 실제 접근은 미확인이다. 잠금 API가 없으면 안전하게 중단하는 현재 동작 때문에 Native 실행 가능성을 compile만으로 보장하지 않는다. 근거 없는 Native 잠금 우회는 넣지 않았다. Native 실행·서명·TestFlight·실제 Android/iPhone 설치 검증은 BENTO-STABLE-001의 잔여 범위다.
- 재현 순서: `npm ci` → `npm test` → `npm run build` → `npm run build:preview` → `npx cap sync android` / `npx cap sync ios`. Native 빌드/서명과 iPhone 설치는 기존 빌드 문서에 따른다.

근거(2026-11-06 확인): [Supabase 로그인](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [비밀번호 재설정](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [secure-storage의 Native/Web 저장 차이](https://github.com/aparajita/capacitor-secure-storage). Supabase changelog의 CLI v3 변경은 이번 앱 SDK 경로에 해당하지 않으며 TLS 변경은 실제 HTTPS 연결 검증 대상으로 둔다.
