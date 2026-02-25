# 문서 품질 운영 가이드
## 빠른 안내

- **문서 요약**: 이 가이드는 `my-docs` 문서 사이트에서 반복된 문제를 다시 발생시키지 않기 위한 운영 기준입니다.
- **핵심 섹션**: 목적, 이번에 정리한 원인, 현재 표준, 운영 절차, 스크립트 역할, 인코딩 이슈 판별법

### 권장 읽기 순서
1. 목적
2. 이번에 정리한 원인
3. 현재 표준
4. 운영 절차
5. 스크립트 역할



## 목적

이 가이드는 `my-docs` 문서 사이트에서 반복된 문제를 다시 발생시키지 않기 위한 운영 기준입니다.

- 상단 타이틀(`H1`) 표시 불일치
- 인코딩/BOM 문제로 글자 깨짐 재발
- 평탄화(`__`) 이후 상대 링크 깨짐
- 스킬 메타 블록(`문서 정보`) 중복/파손

## 이번에 정리한 원인

1. 스킬 문서는 원본에 `frontmatter`가 있고, 일부 문서는 본문에만 제목이 있어서 페이지별 표시가 달랐습니다.
2. 문서 재가공 스크립트가 idempotent(재실행 안전)하지 않아, 한 번 정리된 문서를 다시 처리하면서 메타가 깨졌습니다.
3. 터미널 코드페이지(`cp949`) 출력과 실제 파일 UTF-8 상태를 혼동하기 쉬웠습니다.
4. 원본 트리 기반 상대 링크가 평탄화된 파일명(`team_share_ko__...`)과 맞지 않았습니다.

## 현재 표준

모든 `docs/*.md` 문서는 아래를 만족해야 합니다.

- UTF-8 (BOM 없음)
- 문서 시작이 반드시 `# ...` (H1)
- H1은 정확히 1개
- `!!! info` 메타 블록 사용 금지 (구형 형식)
- 스킬 문서는 `## 문서 정보` 블록 유지
- 로컬 `.md` 링크는 평탄화 경로로 변환되어 유효해야 함

## 운영 절차

### 0) 도구 버전 고정(권장)

```powershell
pip install -r requirements-docs.txt
```

`mkdocs/material` 버전이 어긋나면 불필요한 경고가 반복될 수 있으니 먼저 고정합니다.

### 1) 원본 동기화 + 정규화

```powershell
python scripts/sync_team_share_docs.py
```

실행 내용:

1. 소스 문서 폴더를 평탄 복사
2. 스킬 메타(frontmatter) -> `문서 정보` 블록 변환
3. H1/링크/개행/BOM 일괄 정규화

### 2) 품질 검증

```powershell
python scripts/validate_docs_quality.py
```

정상 결과:

```text
OK: all markdown quality checks passed
```

### 3) 사이트 빌드 검증

```powershell
mkdocs build
```

## 스크립트 역할

- `scripts/sync_team_share_docs.py`
  - 원본 복사 + 정규화 파이프라인 실행

- `scripts/reformat_skill_meta_for_readability.py`
  - frontmatter 기반 메타 블록 생성

- `scripts/normalize_docs_all.py`
  - H1 상단 고정, H1 1개 규칙, 링크/개행/BOM 정리

- `scripts/validate_docs_quality.py`
  - 정적 품질 체크

## 인코딩 이슈 판별법

중요: PowerShell 출력이 깨져 보여도 파일 자체는 정상 UTF-8일 수 있습니다.

진짜 파일 인코딩 상태는 아래 검증 스크립트 기준으로 판단합니다.

```powershell
python scripts/validate_docs_quality.py
```

이 스크립트가 통과하면 파일 인코딩/구조는 정상입니다.

## 변경 전 체크리스트

- 원본에서 새 문서가 추가됐는가?
- 정규화 스크립트를 실행했는가?
- 품질 검증을 통과했는가?
- `mkdocs build` 경고가 신규로 증가하지 않았는가?

## 운영 원칙

- 문서는 항상 원본 기준으로 재생성 가능해야 한다.
- 수작업 수정은 최소화하고, 규칙은 스크립트로 강제한다.
- “보기에는 괜찮다”가 아니라 “검증 스크립트 통과”를 완료 기준으로 삼는다.
