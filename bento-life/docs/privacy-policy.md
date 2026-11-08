# 개인정보처리방침 — 냠냠졸졸 (출시 전 초안)

> **배포 보류:** 개발자 이름·연락처·시행일이 확정되지 않았다. 아래 빈칸을 운영자가 확인하고 최종 배포 앱과 대조하기 전에는 시행 중인 방침이나 스토어 제출용 URL로 사용하지 않는다. 이 문서 원본은 공개 GitHub 기능 브랜치에서 볼 수 있는 초안이다. 스토어에 제출했거나 시행 중인 공식 개인정보처리방침으로 게시한 상태는 아니다.

- 개발자(개인정보 처리 책임자): **[운영자 확인 필요]**
- 문의 이메일: **[운영자 확인 필요]**
- 시행일: **[출시 전 확정 필요 — 아직 시행되지 않음]**
- 초안 검증일: **2026-11-06**

## 1. 현재 앱이 처리하는 정보

현재 기능 브랜치의 테스트 앱은 게스트 플레이와 **이메일·비밀번호 계정 로그인 및 계정별 자동 저장**을 제공합니다. 광고·분석 SDK와 결제 기능은 없습니다. 연락처·위치·기기 사진첩을 요청하지 않습니다. 게임 사진첩은 게임에서 생성한 장면입니다.

계정 기능을 사용하면 이메일, 인증용 계정 식별자 및 로그인 세션을 Supabase Auth에서 처리합니다. 비밀번호는 인증 요청에 사용되며 게임 저장·복구 파일에 넣지 않습니다. Native 세션 토큰은 별도의 Keychain/Keystore 기반 보안 저장소를 사용하고, 웹 세션은 브라우저의 별도 인증 저장 영역을 사용합니다. 웹 저장을 기기 보안 저장소와 동일하다고 보장하지 않습니다.

게임 속 아이의 이름·성장·선택·진행, 도감·하트·게임 아이템, 게임 사진첩, 설정과 중단 화면 상태를 기기에 저장합니다. 로그인한 계정의 진행은 해당 계정으로 접근을 제한한 Supabase 서버에도 전송해 기기 변경 시 이어갈 수 있게 합니다. 최초 로그인 때 기존 게스트 진행은 이용자가 가져오기를 선택해야 복사됩니다. 계정별 기기 캐시·미전송 기록과 복구 사본도 남을 수 있습니다. 토큰은 게임 snapshot이나 복구 내보내기에 포함하지 않습니다.

처음 계정 저장을 확인하거나 로그인·가입·복원할 때에는 연결이 필요합니다. 이미 확인된 계정의 오프라인 진행은 기기에 대기시켰다가 재연결 시 전송하며, 서버에서 확인하기 전에 기기 데이터를 잃으면 최신 진행을 복원하지 못할 수 있습니다. 게스트 진행은 계정에 자동 전송하지 않습니다. 호스팅 제공자의 인증·보안 운영 기록, 보관 기간·처리 지역·위탁 고지는 최종 설정을 확인해 출시 전에 확정해야 합니다. 현재 기본 메일 서비스는 허용된 테스트 이메일에만 사용할 수 있어 공개 가입 준비가 끝난 상태가 아닙니다. 구현 범위는 [ACCOUNT-IMPLEMENTATION.md](ACCOUNT-IMPLEMENTATION.md)를 따릅니다.

## 2. 운영체제 백업과 기기 이전

기기 설정에 따라 게임 데이터가 Android의 자동 백업·기기 간 전송 또는 Apple의 iCloud·컴퓨터 백업에 포함될 수 있습니다. Android의 현재 앱 설정은 게임 데이터의 백업을 허용하지만, 보안 로그인 정보를 담는 파일은 자동 백업·기기 간 전송 대상에서 제외합니다. iCloud 백업은 앱 데이터를 포함하며 컴퓨터 백업도 대부분의 기기 데이터·설정을 포함합니다. 이는 운영체제와 이용자가 선택한 백업 서비스가 수행하는 처리이며, 위 계정 기반 게임 저장과 별개의 사본입니다. [Android 공식 안내](https://developer.android.com/identity/data/autobackup), [Apple iCloud 백업 안내](https://support.apple.com/en-us/108770), [Apple 백업 방법 안내](https://support.apple.com/en-us/108771)

백업 여부와 시점·포함 범위·복원 결과는 기기·OS 버전·설정에 따라 달라집니다. 재설치나 기기 변경 뒤 데이터가 복원될 수 있지만, 최신 진행의 보존이나 복원을 보장하지 않습니다. 백업 관리와 삭제는 사용 중인 기기 및 백업 서비스의 설정에서 확인해 주세요.

## 3. 저장 오류 복구와 내보내기

저장 오류에 대비해 이전 정상 저장과 손상된 저장 원본을 보관할 수 있습니다. 서로 다른 손상 원본은 자동으로 삭제하지 않습니다. 보관한 원본에는 당시의 게임 진행·도감·하트·설정 등이 포함될 수 있습니다.

이용자가 저장 오류 안내 또는 설정의 **“보관한 저장 원본 내려받기”**를 선택하면 웹에서는 JSON 다운로드를 요청하고, Native 앱에서는 임시 파일을 만들어 OS 공유 창을 엽니다. 공유할 앱이나 보관할 위치는 이용자가 선택합니다. 앱이 개발자에게 자동으로 보내지 않습니다. 공유 취소·실패 시에도 저장 원본을 지우지 않으며, 실제 파일 보관 여부는 선택한 위치에서 확인해야 합니다. 임시 사본은 앱 캐시의 한 파일을 재사용하며 OS가 정리할 수 있습니다. 파일을 저장·공유한 위치의 보관 및 동기화 설정은 별도로 적용됩니다. 내려받기는 복구 원본 확보 기능이며 현재 앱에 파일 가져오기나 완전한 백업 복원 기능이 제공된다는 뜻은 아닙니다.

## 4. 새 게임과 데이터 삭제

- **새로 키우기:** 확인 후 현재 판을 새 판으로 바꾸지만 도감·하트 등 누적 수집과 설정은 유지합니다. 전체 데이터 삭제 기능이 아닙니다. 이전 정상 저장·이전 형식의 저장·복구 원본에도 과거 진행이 남을 수 있습니다.
- **손상 저장 복구 초기화:** 정상 백업 복구를 우선하며, 복구할 수 없을 때에만 설명과 두 번의 확인을 거쳐 초기화합니다. 진행만 손상된 구형 저장은 확인된 정상 도감·하트·설정을 유지하고, 통합 저장이 손상되면 전체 초기화 범위를 안내합니다. 손상 원본은 보관합니다.
- **계정 삭제:** 계정 화면에서 현재 비밀번호로 재확인한 뒤 서버 계정·게임 기록 삭제를 요청할 수 있습니다. 성공 응답을 확인하면 현재 기기의 해당 계정 캐시도 정리합니다. 다른 계정·게스트·외부로 내보낸 파일 및 다른 기기의 오프라인 사본은 함께 지우지 않습니다. 서버 운영 백업의 삭제 반영 기간은 운영 설정을 확인해 출시 전 고지해야 합니다.
- **기기 저장 제거:** OS의 앱 데이터 삭제 또는 앱 삭제, 웹 미리보기의 사이트 데이터 삭제로 해당 로컬 저장을 제거할 수 있습니다. 앱에는 모든 보관 원본을 포함한 영구 삭제 버튼이 없습니다.
- **남은 사본:** 로컬 삭제가 OS 백업·다른 기기·내려받은 JSON까지 삭제하지는 않습니다. 각 백업 서비스와 파일 저장 위치에서 별도로 관리해야 합니다. 이후 OS 복원으로 이전 저장이 다시 나타날 수도 있습니다.

## 5. 현재 광고 및 향후 변경

현재 앱은 광고를 표시하지 않으며 광고 ID 수집 또는 분석 SDK를 사용하지 않습니다. 광고·결제·분석 서비스를 추가할지는 별도 결정 사항입니다. 도입 시 실제 SDK와 수집 항목·목적·제공 대상·보관 및 이용자 선택을 확인하여, 해당 버전 배포 전에 방침과 스토어 신고를 갱신합니다. 이 초안은 미래 서비스의 수집이나 동의가 이미 적용된다는 뜻이 아닙니다.

## 6. 이용 대상과 문의

현재 기획상 성인 이용자를 대상으로 합니다. 최종 스토어 대상 연령과 등급은 제출 전 검토해야 하며, 이 문구가 등급 확정을 뜻하지 않습니다.

문의 채널은 위 개발자·이메일 확인 후 공개합니다. 문의를 통해 별도로 받을 정보와 처리 절차도 채널 운영 전에 확정해야 합니다. 비밀번호·계정 토큰 등 인증 정보는 보내지 마세요.

## 출시 전 검증 메모 (정책 본문과 함께 확정 필요)

검증일 **2026-11-06**, 코드 기준 **BENTO-ACCOUNT-IMPL-001 기능 브랜치의 계정 저장 구현 후보**. 현재 코드 확인과 OS 공식 문서에 근거한 초안이며 실제 Android/iPhone의 파일 공유·백업·복원·삭제 검증은 아직 완료하지 않았다.

- `package.json`, `src/entry-app.ts`: 광고·분석 SDK 없음, Supabase Auth/게임 저장과 Native 보안 토큰 저장 어댑터 사용. `src/game/save.ts`, `src/main.ts`: 저장·복구 원본·내보내기 및 새 게임 처리. 상세 저장 동작은 [STORAGE.md](STORAGE.md).
- `android/app/src/main/AndroidManifest.xml`: `android:allowBackup="true"`; 앱의 별도 `fullBackupContent`/`dataExtractionRules` 지정 없음. 따라서 “기기 밖으로 절대 나가지 않는다”는 고지를 사용하지 않는다.
- Android 공식 근거: [Back up user data with Auto Backup](https://developer.android.com/identity/data/autobackup) — 기본 저장 범위, 백업 허용, 클라우드·기기 간 전송 및 복원 조건.
- Apple 공식 근거: [What does iCloud back up?](https://support.apple.com/en-us/108770), [Backup methods for iPhone or iPad](https://support.apple.com/en-us/108771) — 앱 데이터의 iCloud 백업 및 컴퓨터 백업.
- 운영자 이름·이메일·시행일, 최종 앱/SDK, 실제 삭제·백업 결과, 공개 웹 주소 및 스토어 신고를 확인하기 전에는 배포하지 않는다.

---

## English summary — pre-release draft, not yet effective

Developer: **[TO BE CONFIRMED]**. Contact: **[TO BE CONFIRMED]**. Effective date: **[TO BE CONFIRMED BEFORE RELEASE]**. Reviewed: **2026-11-06**.

The current test branch supports guest play and email/password accounts with account-scoped cloud saves using Supabase Auth and a dedicated database. Email, authentication identity/session and game progress are processed for login, autosave and restoration. Native session tokens use a separate Keychain/Keystore adapter; web sessions use browser auth storage. Passwords and tokens are excluded from game snapshots and recovery exports. Existing guest progress is copied only after an explicit choice. There are no advertising, analytics or payment SDKs. The album contains generated game scenes, not device photos.

Previously verified account play can queue offline progress locally, but login and initial restoration require a connection. Unacknowledged progress can be lost if local data is removed. Current hosted email delivery is restricted to permitted test addresses. Provider processing region, operational log retention, backup deletion periods and final processor disclosures must be confirmed before release.
Depending on device settings, Android backup/device transfer or Apple iCloud/computer backups may include app data. Android backup rules exclude the secure login storage file while retaining game-data backup eligibility. These services are distinct from developer-operated cloud saves. See the official Android and Apple sources above. Backup or restoration of the latest progress is not guaranteed.

The game may retain a previous valid save and damaged originals for recovery. Distinct damaged originals are not automatically removed. A user-triggered export requests a browser JSON download or opens the native OS share sheet using one reusable cache file. The user chooses a recipient or file destination; nothing is automatically sent to the developer. Cancellation or failure does not erase originals. Check the chosen destination to confirm receipt; exported copies are managed there. An import feature is not currently provided.

Starting a new game preserves collections, hearts and settings, and does not erase historical recovery copies. A confirmed corruption reset explains its scope and preserves originals first. Removing local app/site data does not remove OS backups, copies on other devices or exported files; those require separate management. OS restoration may bring older saves back. Account deletion requires the current password and a successful server response before this device’s account cache is removed. It does not erase guest data, other accounts, exports or offline copies on other devices. There is no single button that deletes every external copy.

Advertising or analytics, if introduced, requires an updated policy and store disclosures before that release. The intended audience is adults; final store declarations, contact handling, native backup/deletion testing and this policy remain pending. Do not publish this draft as an effective policy until the missing information and release checks are completed.
