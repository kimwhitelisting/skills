# Claude 공개 Skills 번역 가이드

> Anthropic 공개 Skills 저장소의 문서를 팀 학습용으로 정리한 문서 허브입니다.

이 문서는 [anthropics/skills](https://github.com/anthropics/skills) 기반이며,
**Claude가 어떤 구조로 스킬을 실행하는지 이해하고 커스텀 스킬 작성 기준을 확보하는 것**이 목적입니다.

## 이 가이드에서 얻는 것

- Claude 스킬 실행 흐름 이해
- 공개 스킬 패턴을 우리 팀 작업 방식에 맞게 재사용
- 스킬별 핵심 문서를 빠르게 탐색

## Claude 스킬 동작 방식

1. 사용자 요청과 스킬 설명이 매칭되면 스킬이 선택됩니다.
2. `SKILL.md`를 우선 읽고, 필요한 참조 문서만 선택적으로 로드합니다.
3. 스킬 내 `scripts/`, `templates/`, `assets/`가 있으면 재사용합니다.
4. 산출물을 만들고 테스트/빌드/검증으로 마무리합니다.

핵심 원칙: **요청 매칭 → 최소 문맥 로드 → 재사용 우선 → 검증**

## 커스텀 스킬 작성 체크리스트

- 트리거 조건이 구체적인가?
- 단계가 순서대로 정의되어 있는가?
- 출력 형식(파일/경로/포맷)이 명시되어 있는가?
- 실패 시 대체 경로가 있는가?
- 검증 방법(테스트/체크 명령)이 포함되어 있는가?

## 빠른 이동: 공개 스킬

<div class="skill-cards">
  <a class="skill-card" href="team_share_ko__skills__public__docx__SKILL/">
    <strong>문서 처리 (DOCX)</strong>
    Word 문서 생성/수정 자동화
  </a>
  <a class="skill-card" href="team_share_ko__skills__public__frontend-design__SKILL/">
    <strong>프론트엔드 디자인</strong>
    UI/UX 구조화와 설계 패턴
  </a>
  <a class="skill-card" href="team_share_ko__skills__public__pdf__SKILL/">
    <strong>PDF 처리</strong>
    PDF 생성/편집/양식 처리
  </a>
  <a class="skill-card" href="team_share_ko__skills__public__pptx__SKILL/">
    <strong>프레젠테이션 (PPTX)</strong>
    슬라이드 생성/편집 워크플로우
  </a>
  <a class="skill-card" href="team_share_ko__skills__public__product-self-knowledge__SKILL/">
    <strong>제품 셀프 진단</strong>
    제품 방향성/진단 프레임
  </a>
  <a class="skill-card" href="team_share_ko__skills__public__xlsx__SKILL/">
    <strong>스프레드시트 (XLSX)</strong>
    표 데이터 생성/분석/수정
  </a>
</div>

## 빠른 이동: 예제 스킬

<div class="skill-cards">
<a class="skill-card" href="team_share_ko__skills__examples__algorithmic-art__SKILL/"><strong>알고리즘
아트</strong>시각 생성 예제</a>
<a class="skill-card" href="team_share_ko__skills__examples__mcp-builder__SKILL/"><strong>MCP
빌더</strong>MCP 서버/도구 구축 예제</a>
<a class="skill-card" href="team_share_ko__skills__examples__skill-creator__SKILL/"><strong>스킬
크리에이터</strong>스킬 생성/개선 메타 스킬</a>
<a class="skill-card"
href="team_share_ko__skills__examples__web-artifacts-builder__SKILL/"><strong>웹 산출물 빌더</strong>웹
결과물 빌드 파이프라인</a>
</div>

## 실제 사용법

1. 상단 탭에서 `공개 스킬` 또는 `예제 스킬`을 선택합니다.
2. 대상 스킬의 `SKILL` 문서를 먼저 읽습니다.
3. 하위 문서가 있는 경우(`FORMS`, `REFERENCE`, `evaluation` 등) 필요한 문서만 이어서 읽습니다.
4. 팀 스킬 작성 시 동일한 구조(트리거/단계/출력/검증)를 그대로 적용합니다.
