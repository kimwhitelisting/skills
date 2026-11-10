# 가입 확인·비밀번호 재설정 메일

2026-11-10. **템플릿·연결 절차 후보이며 운영 적용 전**이다. 지원 주소의 수신 전달 확인과 인증 메일 발송은 별개다. 현재 Auth, 로컬 `supabase/config.toml`, 앱 빌드, 기존 인증 복귀 주소는 변경하지 않았다.

## 적용할 템플릿

Supabase Authentication → Email의 해당 유형에 **파일 전체를 본문으로** 넣고 아래 제목을 지정한다. `supabase/templates`에 파일을 추가하는 것만으로 hosted 또는 로컬 Auth에 자동 적용되지 않는다.

| 유형 | 제목 | 본문 원본 |
|---|---|---|
| Confirm signup | `[냠냠졸졸] 이메일 주소를 확인해 주세요` | [confirmation.html](../supabase/templates/confirmation.html) |
| Reset password | `[냠냠졸졸] 비밀번호 재설정 안내` | [recovery.html](../supabase/templates/recovery.html) |

두 파일은 공식 `{{ .ConfirmationURL }}`를 그대로 사용한다. 별도 토큰 조립·확인 API·OTP 방식·복귀 주소 대체는 하지 않는다. 사용자 metadata·이메일·비밀번호를 본문에 추가하지 않는다. 외부 이미지, 스크립트, 폰트, 분석/추적 요청은 없으며 문의는 확인된 `support@offbluestudio.com`으로 새 메일을 보내도록 안내한다. 이 템플릿을 추가해도 support 주소로 답장할 발신 기능이 생기지는 않는다.

## 제안하는 발송 설정

Resend 무료 계정 로그인과 도메인 확인이 먼저 필요하다. 현재 제안값이며 아래 DNS/SMTP가 적용됐다는 뜻은 아니다.

| 항목 | 값 또는 처리 |
|---|---|
| 발송 도메인 | `auth.offbluestudio.com` |
| From | `냠냠졸졸 · 오프블루 <no-reply@auth.offbluestudio.com>` |
| SMTP host / port | `smtp.resend.com` / `465` (SSL/TLS) |
| Username | `resend` |
| Password | 이 발송 도메인으로 제한한 Resend **Sending access** API key |
| Open / click tracking | 모두 끔 |

API key는 서버 SMTP 설정과 승인된 비밀 저장소에서만 취급한다. Git, 클라이언트 빌드 환경, 작업 로그나 대화에 넣지 않는다. 계정의 전체 관리 권한 키를 발송에 사용하지 않는다. 키 이름·생성일·용도만 비밀 없는 운영 기록에 남기고 원문은 남기지 않는다.

2026-11-10 공식 가격 기준 Free는 월 **3,000통**, 하루 **100통**, 도메인 **3개**다. 한도는 계정의 다른 발송과 공유될 수 있으므로 적용 직전 대시보드에서 재확인한다. Supabase custom SMTP의 기본 발송 제한은 시간당 **30통**이며 별도 제한이다. 자동으로 한도를 높이거나 유료 전환하지 않는다. 실제 사용량·반송·거부·한도 초과가 발생하면 발송 실패 처리와 재요청 동선을 확인한다.

## 기존 수신을 보존하는 연결 순서

1. 기존 Auth의 SMTP 사용 여부·메일 제목/본문·발송 제한과 DNS를 읽어 되돌릴 설정을 비공개로 보관한다. 비밀 값은 공개 문서에 복제하지 않는다.
2. Resend에 발송용 `auth.offbluestudio.com`을 추가한다. 화면에 제시된 **실제 이름·값·우선순위**의 SPF/반송용 MX와 DKIM만 Cloudflare에 등록한다. DNS 값을 추측해서 만들지 않는다. 기존 루트 도메인의 Cloudflare Email Routing MX·SPF·DKIM과 `support` 전달 규칙은 보존한다. Resend의 수신 기능을 켜거나 루트 MX를 바꾸지 않는다. 이미 같은 이름의 레코드가 있으면 합치기/교체 전에 충돌을 확인한다.
3. Resend가 해당 도메인을 검증했다고 표시하는지 확인한다. Auth 발송 도메인의 open/click tracking을 끄고, 인증 링크가 재작성되지 않도록 유지한다. DMARC 도입은 현재 정책·정렬 결과를 확인한 별도 단계로 다루며 검증 없이 강한 거부 정책을 추가하지 않는다.
4. 제한된 발송 키를 생성하고 **냠냠졸졸 전용** Supabase SMTP에 위 값을 입력한다. 두 템플릿/제목을 적용한다. 기존 개발용 복귀 URL을 삭제하지 않으며, 공개 복귀 URL 변경은 실제 웹 페이지·앱 처리 검증과 함께 별도로 수행한다. 길목·다른 서버에 일괄 적용하지 않는다.
5. 승인된 시험 수신 주소로 가입 확인과 비밀번호 재설정을 각각 한 번 시험한다. 발송 성공 로그만으로 수신 성공을 선언하지 않는다. 실제 수신, SPF/DKIM/DMARC 결과, 표시 이름, 한국어·모바일 가독성, 추적 없는 링크와 정확한 복귀, 새 탭 복구·새 비밀번호 로그인, 기존 진행 보존을 확인한다. 시험 계정과 실제 개인 계정은 구분한다.

메일 보안 스캐너의 링크 미리 읽기는 일회용 확인 링크를 소모할 수 있다. 현재 직접 `ConfirmationURL` 방식은 유지하되 실제 Gmail/iPhone 메일에서 만료·이미 사용됨 오류가 재현되는지 확인한다. 문제가 있으면 별도 확인 페이지/OTP 변경을 설계·검증하고, SMTP 설정만 바꿔 해결됐다고 보고하지 않는다. 메일 업체의 링크 추적도 인증 링크를 깨뜨릴 수 있어 비활성화한다.

## 실패 시 복구와 완료 기준

문제가 발생하면 새 가입 안내를 확대하지 않고 이전 SMTP·템플릿 설정을 복원한다. 이전 기본 SMTP의 제한도 함께 복구되는 것이므로 공개 가입이 계속 가능하다고 보장하지 않는다. API key 문제가 있으면 해당 발송 키만 교체하며 다른 서비스 키·지원 수신 DNS를 건드리지 않는다. 이미 전송된 링크를 재사용하거나 성공 여부가 불명한 메일을 대량 재발송하지 않는다.

이번 후보는 두 템플릿 각각 320/390/600px·light/dark의 격리 Chromium DOM/레이아웃 **12개 경우**를 통과했다. 공식 변수 3곳과 정확한 확인 링크, 한국어 문서·제목·44px 이상 버튼 높이, 가로 넘침 없음, 외부 요청 0건을 확인했다. HTML 구조·공식 변수 보존·외부 리소스 부재와 브라우저 레이아웃 범위이며 시각 스크린샷/실제 메일 클라이언트 시험은 아니다. 실제 DNS/SMTP 반영·메일 전달·Gmail/iOS Mail 렌더링·보안 스캐너 동작·개인 계정 복구는 아직 미검증이다. 로컬 메일함(Mailpit)의 성공도 실제 발송 성공을 대신하지 않는다. 공개 가입 준비 완료는 위 실제 수신/복귀와 [앱 밖 계정 웹](ACCOUNT-WEB.md)의 공개 운영 조건까지 확인한 후 판정한다.

공식 근거(2026-11-10): [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [메일 템플릿·변수·prefetch](https://supabase.com/docs/guides/auth/auth-email-templates), [Resend SMTP 연동](https://resend.com/docs/send-with-supabase-smtp), [발송 도메인](https://resend.com/docs/dashboard/domains/introduction), [키 권한](https://resend.com/docs/api-reference/api-keys/create-api-key), [요금](https://resend.com/pricing).
