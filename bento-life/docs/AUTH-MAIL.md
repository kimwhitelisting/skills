# 가입 확인·비밀번호 재설정 메일

2026-11-11. **냠냠졸졸 전용 Supabase에 custom SMTP와 한국어 템플릿을 적용했다.** 같은 제한 키를 사용한 일반 시험 메일은 제공자에서 Delivered로 확인했다. 실제 Supabase 가입 확인·비밀번호 복구 링크의 전체 흐름과 수신함 확인까지 완료한 것은 아니다. 지원 수신 전달은 기존대로 유지하며, 로컬 `supabase/config.toml`, 앱 빌드, 기존 인증 복귀 주소는 변경하지 않았다.

## 적용한 템플릿

Supabase Authentication → Email의 해당 유형에 **파일 전체를 본문으로** 넣고 아래 제목을 지정했다. 저장·새로고침 후 두 제목과 전체 HTML이 아래 원본과 정확히 같은지 대조했다. `supabase/templates`에 파일을 추가하는 것만으로 hosted 또는 로컬 Auth에 자동 적용되지 않으므로 향후 수정도 명시적으로 반영·대조해야 한다.

| 유형 | 제목 | 본문 원본 |
|---|---|---|
| Confirm signup | `[냠냠졸졸] 이메일 주소를 확인해 주세요` | [confirmation.html](../supabase/templates/confirmation.html) |
| Reset password | `[냠냠졸졸] 비밀번호 재설정 안내` | [recovery.html](../supabase/templates/recovery.html) |

두 파일은 공식 `{{ .ConfirmationURL }}`를 그대로 사용한다. 별도 토큰 조립·확인 API·OTP 방식·복귀 주소 대체는 하지 않는다. 사용자 metadata·이메일·비밀번호를 본문에 추가하지 않는다. 외부 이미지, 스크립트, 폰트, 분석/추적 요청은 없으며 문의는 확인된 `support@offbluestudio.com`으로 새 메일을 보내도록 안내한다. 이 템플릿을 추가해도 support 주소로 답장할 발신 기능이 생기지는 않는다.

## 적용한 발송 설정

Owner의 DNS·제한 키·SMTP 적용 승인 후 Resend 무료 계정과 발송 도메인을 연결했다. 도메인은 Tokyo 지역이며 2026-11-10 23:57 KST에 Verified를 확인했다. SMTP 저장 후 새로고침에서도 custom SMTP 켜짐과 공개 설정이 유지되고 비밀번호는 숨김 상태임을 확인했다.

| 항목 | 값 또는 처리 |
|---|---|
| 발송 도메인 | `auth.offbluestudio.com` |
| From | `냠냠졸졸 · 오프블루 <no-reply@auth.offbluestudio.com>` |
| SMTP host / port | `smtp.resend.com` / `465` (SSL/TLS) |
| Username | `resend` |
| Password | 이 발송 도메인으로 제한한 Resend **Sending access** API key |
| Open / click tracking | 비활성·미설정 상태 유지 |
| 수신 기능 / 전송 TLS 정책 | 수신 끔 / 제공자 기본 Opportunistic 유지 |

API key는 서버 SMTP 설정과 승인된 비밀 저장소에서만 취급한다. Git, 클라이언트 빌드 환경, 작업 로그나 대화에 넣지 않는다. 계정의 전체 관리 권한 키를 발송에 사용하지 않는다. 키 이름·생성일·용도만 비밀 없는 운영 기록에 남기고 원문은 남기지 않는다.

2026-11-10 공식 가격과 실제 무료 플랜 대시보드에서 확인한 Free는 월 **3,000통**, 하루 **100통**, 도메인 **3개**다. 한도는 계정의 다른 발송과 공유될 수 있으므로 확대 운영 전에 대시보드에서 재확인한다. 유료 추가 기능은 적용하지 않았다. Supabase custom SMTP의 기본 발송 제한은 시간당 **30통**이며 별도 제한이다. 이번에는 기본값으로 적용했고 추가 상향이나 유료 전환을 하지 않았다. 실제 사용량·반송·거부·한도 초과가 발생하면 발송 실패 처리와 재요청 동선을 확인한다.

## 기존 수신을 보존하는 연결 순서

1. 기존 Auth의 SMTP 사용 여부·메일 제목/본문·발송 제한과 DNS를 읽어 되돌릴 설정을 비공개로 보관한다. 비밀 값은 공개 문서에 복제하지 않는다.
2. Resend에 발송용 `auth.offbluestudio.com`을 추가한다. 화면에 제시된 **실제 이름·값·종류**만 Cloudflare에 등록한다. 이번 제공자의 발송 설정은 `resend._domainkey.auth` TXT(DKIM), `rsend.auth` → `rsend-apne1.forge.rmta.net` CNAME, `send.auth` → `send.forge.rmta.net` CNAME이었다. CNAME 둘은 DNS only이며 MX를 추가한 구성이 아니다. 두 권한 네임서버의 CNAME 응답도 확인했다. 재설정 때 이 값을 고정 복제하거나 SPF/MX로 임의 치환하지 말고 제공자의 현재 안내를 다시 대조한다. DNS 값을 추측해서 만들지 않는다. 기존 루트 도메인의 Cloudflare Email Routing MX 3개·SPF·DKIM과 `support` 전달 규칙·사이트 DNS는 보존했다. 이후에도 이 레코드를 유지한다. Resend의 수신 기능을 켜거나 루트 MX를 바꾸지 않는다. 이미 같은 이름의 레코드가 있으면 합치기/교체 전에 충돌을 확인한다.
3. Resend가 해당 도메인을 검증했다고 표시하는지 확인한다. Auth 발송 도메인의 open/click tracking을 끄고, 인증 링크가 재작성되지 않도록 유지한다. DMARC 도입은 현재 정책·정렬 결과를 확인한 별도 단계로 다루며 검증 없이 강한 거부 정책을 추가하지 않는다.
4. 제한된 발송 키를 생성하고 **냠냠졸졸 전용** Supabase SMTP에 위 값을 입력한다. 두 템플릿/제목을 적용한다. 기존 개발용 복귀 URL을 삭제하지 않으며, 공개 복귀 URL 변경은 실제 웹 페이지·앱 처리 검증과 함께 별도로 수행한다. 길목·다른 서버에 일괄 적용하지 않는다.
5. 승인된 시험 수신 주소로 가입 확인과 비밀번호 재설정을 각각 한 번 시험한다. 발송 성공 로그만으로 수신 성공을 선언하지 않는다. 실제 수신, SPF/DKIM/DMARC 결과, 표시 이름, 한국어·모바일 가독성, 추적 없는 링크와 정확한 복귀, 새 탭 복구·새 비밀번호 로그인, 기존 진행 보존을 확인한다. 시험 계정과 실제 개인 계정은 구분한다.

1~4단계의 DNS·SMTP·템플릿 적용은 완료했다. 2026-11-11 00:03 KST에 명시 승인된 수신 주소로 일반 UTF-8 제목의 시험 메일 한 통을 같은 제한 키·SMTP SSL 경로로 보내 SMTP 접수와 Resend **Delivered**를 확인했다. 이는 수신 서버로 전달됐다는 제공자 상태이며 수신함 표시·열람 확인이나 Supabase Auth가 만든 링크의 정상 처리를 증명하지 않는다. **5단계의 실제 가입 확인·복구 흐름은 남아 있다.**

메일 보안 스캐너의 링크 미리 읽기는 일회용 확인 링크를 소모할 수 있다. 현재 직접 `ConfirmationURL` 방식은 유지하되 실제 Gmail/iPhone 메일에서 만료·이미 사용됨 오류가 재현되는지 확인한다. 문제가 있으면 별도 확인 페이지/OTP 변경을 설계·검증하고, SMTP 설정만 바꿔 해결됐다고 보고하지 않는다. 메일 업체의 링크 추적도 인증 링크를 깨뜨릴 수 있어 비활성화한다.

## 실패 시 복구와 완료 기준

문제가 발생하면 새 가입 안내를 확대하지 않고 변경 전에 보관한 설정으로 복원한다. 이번 변경 전 상태는 **custom SMTP 끔 + Supabase 기본 영어 확인/복구 제목·본문**이다. SMTP를 끄고 두 템플릿을 변경 전 원문으로 되돌린 뒤 저장·새로고침 대조한다. 이는 복구 절차이며 실제로 되돌리지는 않았다. 이전 기본 SMTP의 수신 대상·발송량 제한도 함께 돌아오므로 공개 가입이 계속 가능하다고 보장하지 않는다. API key 문제가 있으면 해당 발송 키만 교체하며 다른 서비스 키·지원 수신 DNS를 건드리지 않는다. 이미 전송된 링크를 재사용하거나 성공 여부가 불명한 메일을 대량 재발송하지 않는다.

이번 후보는 두 템플릿 각각 320/390/600px·light/dark의 격리 Chromium DOM/레이아웃 **12개 경우**를 통과했다. 공식 변수 3곳과 정확한 확인 링크, 한국어 문서·제목·44px 이상 버튼 높이, 가로 넘침 없음, 외부 요청 0건을 확인했다. HTML 구조·공식 변수 보존·외부 리소스 부재와 브라우저 레이아웃 범위이며 시각 스크린샷/실제 메일 클라이언트 시험은 아니다. DNS/SMTP와 템플릿 저장·일반 메일의 제공자 Delivered 상태는 위 범위에서 확인했다. Gmail/iOS Mail의 수신함·렌더링·보안 스캐너 동작과 실제 Auth 링크·개인 계정 복구는 아직 미검증이다. 로컬 메일함(Mailpit)의 성공도 실제 발송 성공을 대신하지 않는다. 공개 가입 준비 완료는 위 실제 수신/복귀와 [앱 밖 계정 웹](ACCOUNT-WEB.md)의 공개 운영 조건까지 확인한 후 판정한다.

## 다음 앱 변경

`src/account/account.ts`의 가입 안내와 일반 오류 문구에는 아직 “초대된 테스트 이메일만” 또는 “테스트 초대 여부” 표현이 남아 있다. custom SMTP 적용 뒤에는 그 설명을 현재 운영 조건과 맞춰야 한다. 다음 앱 소스 변경과 새 출시 빌드에서 수정·검증할 항목이며, 이번 SMTP/문서 반영으로 앱 코드나 이전 Native 패키지가 갱신된 것은 아니다. 실제 발송/복귀 확인 전 무제한 공개 가입이 가능하다는 문구로 바꾸지 않는다.

공식 근거(2026-11-10): [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [메일 템플릿·변수·prefetch](https://supabase.com/docs/guides/auth/auth-email-templates), [Resend SMTP 연동](https://resend.com/docs/send-with-supabase-smtp), [발송 도메인](https://resend.com/docs/dashboard/domains/introduction), [키 권한](https://resend.com/docs/api-reference/api-keys/create-api-key), [요금](https://resend.com/pricing).
