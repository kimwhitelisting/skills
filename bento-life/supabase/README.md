# 계정 저장 백엔드 — BENTO-ACCOUNT-IMPL-001

이 디렉터리는 **무료 게임 진행**을 위한 Supabase DB/RPC와 계정 삭제 함수를 제공한다.
유료 권리·결제·광고는 구현하지 않는다. `hearts`, `owned`와 JSON의 내용은 구매 증거가 아니다.
실제 프로젝트 생성·migration 적용·Edge 배포는 검토 후 통합 담당자가 수행한다. 프로젝트 ID·키·로그인 정보는 이 저장소에 넣지 않는다.

## RPC 계약

인증은 Supabase Auth access token으로 한다. 요청에는 사용자 ID를 받지 않는다.
검증된 이메일의 실재하는 비익명·비차단 계정만 RPC를 실행할 수 있다.

- `bento_get_save()` → `{revision, snapshot, updated_at}`. 기록 없음은 정확히 `{revision:0,snapshot:null,updated_at:null}`.
- `bento_put_save(p_expected_revision bigint, p_operation_id uuid, p_snapshot jsonb)`:
  - 저장 성공: `{status:'saved',revision,snapshot,updated_at,duplicate:false,operation_revision:revision}`.
  - 충돌: `{status:'conflict',revision,snapshot,updated_at}`. 응답은 현재 서버 기록이다. 전송한 후보를 자동 삭제하거나 합산하지 않는다.
  - 성공했던 동일 작업 재시도: `duplicate:true`. `operation_revision`은 원래 성공 revision, 나머지는 **현재** 서버 기록이다. 둘이 다르면 오래된 ACK이므로 클라이언트 후보를 보존하고 현재 서버와 다시 조정한다.
  - 성공한 작업 ID에 다른 기반 revision 또는 다른 본문을 사용하면 SQLSTATE `22023`으로 거절한다. JSON 객체의 키 순서는 무관하다. 작업 ID 범위는 계정별이다.

기반 revision 비교, 갱신과 작업 기록은 한 트랜잭션이다. 계정별 advisory transaction lock으로 최초 저장도 직렬화한다.
유효하지 않은 요청은 `22023`, 확인할 수 없는 계정은 `28000`, 권한 없는 직접 접근은 `42501`이다.
서버 시각·revision·계정은 클라이언트에서 지정할 수 없다. 실수로 민감한 본문을 오류 메시지에 출력하지 않는다.

## 권한과 데이터 경계

- `public.bento_saves`: `auth.uid()` 소유 행 SELECT만 허용하는 RLS. `anon` 접근과 앱의 직접 INSERT/UPDATE/DELETE 권한 없음.
- `bento_private.save_operations`: 클라이언트 테이블 접근 없음. 성공 작업 ID·기반/성공 revision·SHA-256만 보관하고 과거 snapshot 전체는 복제하지 않는다.
- public RPC는 `SECURITY INVOKER`. 비공개 schema의 privileged 함수는 빈 `search_path`, 명시적 소유자 검사와 최소 EXECUTE 권한을 사용한다. **bento_private를 Data API exposed schema에 추가하지 않는다.**
- RPC는 `auth.users`의 존재도 검사한다. 계정 삭제 뒤 아직 만료되지 않은 JWT로 새 저장을 만들지 못한다. 계정 삭제는 FK cascade로 저장과 작업 기록을 함께 제거한다.
- 직접 SELECT 정책은 행 소유권 정책이다. RPC의 이메일 확인/차단 확인과 동일한 정책이라고 설명하지 않는다. 데이터 변경 권한은 RPC에만 있다.
- snapshot은 strict JSON Schema v1 + 서버 JSONB 텍스트 기준 1 MiB 한도. 알려진 무료 `run/dex/prefs` 필드만 허용한다. 배열·문자열·맵·숫자도 제한한다. 구조 검증은 무료 진행의 진위나 부정행위 방지를 보장하지 않는다.
- 현재 서버는 최신 기록 하나를 보관한다. 충돌 양쪽의 로컬 보관과 선택은 클라이언트 책임이다. 서버 전체 이력/서버 충돌 보관함을 구현했다고 표시하지 않는다.
- 작업 해시 기록은 계정 삭제까지 유지한다. 자동 삭제로 멱등성 이력을 끊지 않는다. 클라이언트는 checkpoint를 모아서 전송해야 한다. 공개 대규모 운영 전 쓰기 빈도 제한·용량 관찰·보관 정책을 별도 확정한다.

## 설치/검토 순서

1. 대상이 전용 개발 프로젝트인지, 기존 `bento_*` 데이터/객체가 없는지 확인한다. 다른 앱 프로젝트에는 적용하지 않는다.
2. `pg_jsonschema`와 `pgcrypto` 사용 가능 여부를 확인한다. migration은 `extensions` schema에 활성화한다.
3. `migrations/20261106115047_bento_account_save.sql`을 검토하고 한 번 적용한다. `scripts/migration-body.sql`은 리뷰/생성 템플릿이며 직접 실행하지 않는다.
4. 아래 rollback SQL 회귀를 실행하고 전/후 데이터가 없는지 확인한다. 보안 advisor 결과도 확인한다.
5. 이메일 확인/발송 설정, 사이트/복귀 URL과 최소 키 노출을 별도 검증한다. 기본 메일 발송의 제한을 무시하거나 실제 계정의 확인 상태를 SQL로 우회하지 않는다.
6. 계정 삭제 Edge는 별도로 배포하고 실제 검증 전 앱에서 배포 완료로 표시하지 않는다. `config.toml`의 `verify_jwt=true`를 유지한다.

## 계정 삭제

`POST bento-delete-account`, Bearer access token, JSON `{password:string}` → 성공 `200 {deleted:true}`.
이메일/UUID는 `auth.getUser(token)`의 검증 결과에서만 가져온다. 새 암호 인증 결과의 UUID도 같아야 한다.
성공 후 전체 세션을 폐기한 다음 서버의 Auth Admin `deleteUser`를 호출한다. 서버 예약 환경의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`만 사용하며 키를 응답/클라이언트/저장 JSON에 넣지 않는다.
요청 본문은 스트림에서 4 KiB로 제한하고 로그로 남기지 않는다. 클라이언트도 암호를 저장·분석 로그로 보내지 않는다.

- `401 authentication_required`: 사용자 인증/이메일 확인 필요.
- `403 reauthentication_failed`: 새 암호 인증 실패 또는 UUID 불일치.
- `403 mfa_deletion_not_supported`: 확인된 MFA가 있는 계정. 암호만으로 두 번째 인증을 우회하지 않는다. 현재 이메일/암호 범위 밖의 MFA/OAuth 삭제 흐름은 별도 구현 전 지원한다고 표시하지 않는다.
- `400 invalid_request/password_required`, `413 request_too_large`: 입력 오류.
- `503 service_unavailable/session_revocation_failed/deletion_failed`: 완료되지 않음. 세션 폐기 후 삭제 실패라면 재로그인이 필요할 수 있다.

응답 유실은 삭제 성공으로 단정하지 않는다. 성공 응답을 확인한 뒤 클라이언트가 해당 계정의 로컬 영역을 정리한다.
앱/저장소 삭제, OS 백업, 사용자가 이미 외부에 내보낸 JSON의 삭제는 별개다.

## 검증 명령과 범위

프로젝트 패키지는 변경하지 않는다. 기존 lockfile로 `npm ci`한 환경에서:

```sh
# 실제 게임 규칙으로 합성 phase snapshots 생성(목적지는 scratch 파일)
npx vite-node supabase/scripts/schema-fixtures.ts /tmp/bento-schema-fixtures.json
# 서버 schema와 동일한 JSON Schema 검증. 토큰/클라우드 불필요.
npx --yes deno@2.9.6 run --no-config --lock=supabase/functions/deno.lock \
  --allow-read=supabase/snapshot.schema.json,/tmp/bento-schema-fixtures.json \
  supabase/scripts/validate-fixtures.ts supabase/snapshot.schema.json /tmp/bento-schema-fixtures.json
npx --yes deno@2.9.6 test --no-config --lock=supabase/functions/deno.lock supabase/tests/delete-account.test.ts
npx --yes deno@2.9.6 check --no-config --lock=supabase/functions/deno.lock supabase/functions/bento-delete-account/index.ts
```

`tests/account-save.sql` 전체를 관리자 SQL 연결로 실행한다. `BEGIN/ROLLBACK` 사이에 합성 Auth 2행을 만든다. 기존 UUID가 있으면 INSERT가 실패하며 덮어쓰지 않는다. 실패 시 `ROLLBACK`하고 원인을 확인한다. SQL 파일의 테스트에는 DDL이 없다.
이 검증은 역할/claims를 모의한 DB 시험이지 실제 가입/로그인/JWT 또는 동시 HTTP 실행 시험이 아니다.
실제 HTTP 시험은 확인된 테스트 계정으로 별도 수행한다. 우선 Dashboard의 지원되는 Auth Admin 생성 절차를 사용한다. SMTP 개발 제한으로 그것이 곤란한 **데이터가 없는 전용 개발 프로젝트**에서만 통합 담당자가 `tests/http-fixtures-create.sql`을 검토해 두 합성 Auth fixture를 seed할 수 있다. 이는 공급자의 내부 Auth schema에 종속되는 시험용 우회이며 가입·메일 발송·이메일 확인 시험이 아니다. 공급자 업그레이드 후 metadata를 다시 확인한다. 기존/실제 사용자나 이메일 확인 설정은 변경하지 않는다.
이 seed는 users/saves/operations가 모두 0이 아니면 거절한다. 고정된 두 시험 UUID·example.invalid 주소·fixture 표식만 생성하고 서버에서 임의 암호를 생성해 bcrypt로 저장한다. 결과의 임시 암호는 대화·로그·공개 저장소에 출력하지 않는다. 통합 담당자의 함수 메모리 또는 명시적으로 허용된 단기 mode600 scratch에서만 사용하고 시험 종료 후 제거한다. 관리 키 추출이나 임시 관리자 HTTP endpoint는 없다.

`scripts/http-smoke.mjs`는 public key와 두 시험 credential을 stdin JSON 또는 `runHttpSmoke(input)`의 메모리 인자로 받는다. URL과 별도로 `expectedProjectRef`를 확인하며 privileged key는 거절한다. `phase`는 명시적으로 선택한다.

- `phase:'save'`: 실제 public Auth 로그인, A/B 격리, 동시에 같은 revision 쓰기(한 saved/한 conflict), operation 재사용, 새 세션 복원을 시험한다. **계정을 삭제하지 않는다.** 이후 UI 로그인·기기 변경 모의 시험에 사용할 수 있다.
- `phase:'delete'`: UI 시험 종료 후 호출한다. 틀린 암호에서 데이터 유지, 실제 삭제 Edge, 삭제된 JWT 거절, 다른 계정 보존과 두 시험 계정 삭제를 확인한다.
- 출력은 통과한 case 이름과 상태뿐이며 credential/token/서버 응답 본문을 출력하지 않는다. 실패 후 `needsNarrowSqlCleanup`이면 `tests/http-fixtures-cleanup.sql`로 UUID+이메일+서버 fixture 표식이 **모두 일치하는 두 계정만** 정리하고 관련행 0을 확인한다. 정상 경로는 실제 삭제 Edge를 사용한다.
- 실제 Owner 계정은 seed·확인상태 변경·삭제 대상이 아니다. 테스트 ID를 다른 사용자 ID로 바꿔 재사용하지 않는다.

2026-11-06 검증 기록:

| 범위 | 실제 결과 |
|---|---|
| JSON Schema | 100판 엔진 관찰의 454개 고유 phase + UI-only 사진/이벤트결과/아침 draft/등굣길 checkpoint를 포함한 457개 snapshot 통과, 잘못된/권한 관련 payload 6종 거절 |
| 삭제 handler | 인증·재인증·UUID 변조·MFA·본문 한도·오류 마스킹·호출 순서 모의 6개 통과, Edge와 검증 스크립트 Deno typecheck 통과 |
| 전용 hosted 개발 DB | 통합 담당자가 migration 적용 성공을 확인. 이 디렉터리 작성자는 원격 배포를 수행하지 않음 |
| hosted rollback SQL | 통합 담당자가 `account-save.sql` 전체 실행으로 CAS·동일/변형 operation·late ACK·검증·RLS·직접쓰기 권한·확인된 계정·삭제 cascade PASS 확인 |
| rollback 후 | saves 0 / operations 0 / Auth users 0 확인. 테스트 사용자는 지속시키지 않음 |
| advisor | performance 없음. security의 private operations `RLS enabled without policy` INFO 하나는 의도된 직접 접근 차단 |
| 비인증 HTTP | 공개 get RPC와 save table SELECT 모두 401 / SQLSTATE 42501 거절 확인 |
| 실제 public Auth / HTTP | 통합 담당자가 정확한 두 합성 seed 계정으로 JWT 발급, RPC/SELECT 계정 격리, 직접쓰기 거절, 실제 동시 CAS의 한 saved/한 conflict, late ACK, 변형 operation 거절, 새 세션 복원을 PASS 확인. 가입/메일 검증 시험은 아님 |
| HTTP fixture 수명 | save phase 후 정확히 두 합성 계정을 UI 검증용으로 유지. UI 종료 후 delete phase와 좁은 fallback cleanup 및 잔여 0 확인은 통합 담당자가 수행 |
| 아직 미검증 | 실제 사용자 이메일 확인·실기기 변경 복원·Edge 실제 계정 삭제. SQL claims 시험이나 handler mock으로 이를 대신했다고 주장하지 않음 |

통합 이후 실제 Auth·HTTP·기기 결과는 별도 작업 기록으로 추가한다. 통합 담당자가 삭제 Edge v1 ACTIVE 배포와 `verify_jwt=true`를 확인했다. 실제 인증 요청/삭제 성공 여부는 별도 시험 결과로 기록한다.

## 변경 시

`scripts/snapshot-schema.ts --write`는 검토용 `snapshot.schema.json`을 재생성한다. 이미 적용한 migration을 다시 쓰지 않는다. 앱 필드/ID/스키마가 바뀌면 호환 범위를 확인해 새 migration을 작성한다. 생성은 `supabase migration new <name>`으로 시작하고, template의 `__SNAPSHOT_SCHEMA__` 자리에 압축 JSON을 넣는다.
Supabase JS는 `2.119.0`, 검증용 AJV는 `8.20.0`에 고정하며 Edge/test 의존성은 `functions/deno.lock`으로 보존한다.

공식 근거: [Database functions](https://supabase.com/docs/guides/database/functions), [pg_jsonschema](https://supabase.com/docs/guides/database/extensions/pg_jsonschema), [Edge Authorization](https://supabase.com/docs/guides/functions/auth-headers), [Auth Admin deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser). 변경 시 현재 문서와 changelog를 다시 확인한다.
