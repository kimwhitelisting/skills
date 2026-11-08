# 냠냠졸졸 작업 지침

- 이 폴더에서 시작한 새 세션도 공용 운영 원본 [kimwhitelisting/agent-studio](https://github.com/kimwhitelisting/agent-studio)의 `AGENTS.md`, `operations/WORKSPACE.md`, `operations/work-items.yaml`을 확인한다. 현재 작업 ID·담당·작업 브랜치를 총괄(Studio Lead)과 확인한 뒤 배정된 범위에서 작업한다.
- Studio에 접근할 수 없으면 쓰기 담당을 임의로 지정하지 않는다. 읽기 전용으로 프로젝트를 탐색한 뒤 총괄에 상황을 반환한다.
- Studio의 비공개 절대 경로·계정 정보·작업 상세는 이 공개 저장소에 복제하지 않는다. 공용 운영 규칙은 Studio 원본을 참조한다.
- 먼저 README.md, docs/HANDOFF.md, docs/ANDROID.md, docs/MAC-BUILD.md를 읽는다. 문서 상태는 현재 Git 이력과 대조한다.
- 이 프로젝트의 작업 범위는 `bento-life/`다. 상위 저장소의 다른 스킬·제품은 변경하지 않는다.
- 한 작업 폴더의 작성자는 한 명. 다른 에이전트는 읽기 전용 검토를 맡고, 동시 구현은 별도 branch/worktree로 분리한다.
- 작업별 담당·브랜치·포트·검증 결과를 남긴다. 역할은 명시적으로 교대할 수 있다.
- 기존 Node/npm lockfile, TypeScript/Vite/Capacitor 구성을 유지한다. 재현 설치에는 `npm ci`를 사용한다.
- 검증 순서: `npm ci` → `npm test` → `npm run build`. Android는 이어서 `npm run android:sync` → `android/gradlew assembleDebug`(android 폴더에서 실행).
- 패키지 ID `com.paranstudio.dosirak`과 기존 저장 키/진행·도감·하트 데이터를 보존한다.
- `android:reset`은 기존 네이티브 설정을 지우므로 일반 빌드 절차에서 사용하지 않는다.
- 자동 생성 메뉴·그림은 기존 생성 스크립트를 따른다. 출시용 키·비밀번호·개인 경로·계정 정보를 이 공개 저장소에 기록하지 않는다.
- 단위 테스트/자동 플레이, 웹 화면, Simulator, 실제 Android/iPhone 설치를 구분해서 보고한다.
- 광고·결제·서명 키·스토어 제출은 구현 테스트와 별도 작업으로 다룬다.
