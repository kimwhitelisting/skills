# 냠냠졸졸 작업 지침

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
