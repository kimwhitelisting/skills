# JSON 스키마

이 문서는 Skill-creator에서 사용하는 JSON 스키마를 정의합니다.

---

## evals.json

기술에 대한 평가를 정의합니다. 스킬 디렉터리 내 `evals/evals.json`에 있습니다.

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's example prompt",
      "expected_output": "Description of expected result",
      "files": ["evals/files/sample1.pdf"],
      "expectations": [
        "The output includes X",
        "The skill used script Y"
      ]
    }
  ]
}
```

**전지:**
- `skill_name` : 스킬의 머리말과 일치하는 이름
- `evals[].id`: 고유한 정수 식별자
- `evals[].prompt` : 실행할 작업
- `evals[].expected_output`: 사람이 읽을 수 있는 성공 설명
- `evals[].files`: 입력 파일 경로의 선택적 목록(스킬 루트 기준)
- `evals[].expectations` : 검증가능한 진술 목록

---

## 역사.json

개선 모드에서 버전 진행 상황을 추적합니다. 작업공간 루트에 위치합니다.

```json
{
  "started_at": "2026-01-15T10:30:00Z",
  "skill_name": "pdf",
  "current_best": "v2",
  "iterations": [
    {
      "version": "v0",
      "parent": null,
      "expectation_pass_rate": 0.65,
      "grading_result": "baseline",
      "is_current_best": false
    },
    {
      "version": "v1",
      "parent": "v0",
      "expectation_pass_rate": 0.75,
      "grading_result": "won",
      "is_current_best": false
    },
    {
      "version": "v2",
      "parent": "v1",
      "expectation_pass_rate": 0.85,
      "grading_result": "won",
      "is_current_best": true
    }
  ]
}
```

**전지:**
- `started_at`: 개선이 시작된 시점의 ISO 타임스탬프
- `skill_name` : 강화 중인 스킬 이름
- `current_best`: 최고 성능의 버전 식별자
- `iterations[].version`: 버전 식별자(v0, v1, ...)
- `iterations[].parent`: 이 버전이 파생된 상위 버전
- `iterations[].expectation_pass_rate` : 채점에 따른 합격률
- `iterations[].grading_result`: "기준선", "승리", "패배" 또는 "동점"
- `iterations[].is_current_best`: 현재 최고 버전인지 여부

---

## 채점.json

그레이더 에이전트의 출력입니다. `<run-dir>/grading.json`에 위치합니다.

```json
{
  "expectations": [
    {
      "text": "The output includes the name 'John Smith'",
      "passed": true,
      "evidence": "Found in transcript Step 3: 'Extracted names: John Smith, Sarah Johnson'"
    },
    {
      "text": "The spreadsheet has a SUM formula in cell B10",
      "passed": false,
      "evidence": "No spreadsheet was created. The output was a text file."
    }
  ],
  "summary": {
    "passed": 2,
    "failed": 1,
    "total": 3,
    "pass_rate": 0.67
  },
  "execution_metrics": {
    "tool_calls": {
      "Read": 5,
      "Write": 2,
      "Bash": 8
    },
    "total_tool_calls": 15,
    "total_steps": 6,
    "errors_encountered": 0,
    "output_chars": 12450,
    "transcript_chars": 3200
  },
  "timing": {
    "executor_duration_seconds": 165.0,
    "grader_duration_seconds": 26.0,
    "total_duration_seconds": 191.0
  },
  "claims": [
    {
      "claim": "The form has 12 fillable fields",
      "type": "factual",
      "verified": true,
      "evidence": "Counted 12 fields in field_info.json"
    }
  ],
  "user_notes_summary": {
    "uncertainties": ["Used 2023 data, may be stale"],
    "needs_review": [],
    "workarounds": ["Fell back to text overlay for non-fillable fields"]
  },
  "eval_feedback": {
    "suggestions": [
      {
        "assertion": "The output includes the name 'John Smith'",
        "reason": "A hallucinated document that mentions the name would also pass"
      }
    ],
    "overall": "Assertions check presence but not correctness."
  }
}
```

**전지:**
- `expectations[]`: 증거를 바탕으로 등급화된 기대치
- `summary`: 합격/불합격 횟수 집계
- `execution_metrics`: 도구 사용 및 출력 크기(실행자의metrics.json에서)
- `timing`: 벽시계 타이밍(timing.json에서)
- `claims`: 출력물에서 클레임 추출 및 검증
- `user_notes_summary`: 실행자가 플래그한 문제
- `eval_feedback`: (선택 사항) 평가를 위한 개선 제안, 채점자가 제기할 가치가 있는 문제를 식별한 경우에만 표시됩니다.

---

## 메트릭.json

실행자 에이전트의 출력입니다. `<run-dir>/outputs/metrics.json`에 위치합니다.

```json
{
  "tool_calls": {
    "Read": 5,
    "Write": 2,
    "Bash": 8,
    "Edit": 1,
    "Glob": 2,
    "Grep": 0
  },
  "total_tool_calls": 18,
  "total_steps": 6,
  "files_created": ["filled_form.pdf", "field_values.json"],
  "errors_encountered": 0,
  "output_chars": 12450,
  "transcript_chars": 3200
}
```

**전지:**
- `tool_calls`: 공구 종류별 개수
- `total_tool_calls` : 모든 툴 호출의 합
- `total_steps`: 주요 실행 단계 수
- `files_created`: 생성된 출력 파일 목록
- `errors_encountered`: 실행 중 발생한 오류 개수
- `output_chars`: 출력 파일의 총 문자 수
- `transcript_chars` : 성적 증명서의 글자 수

---

## 타이밍.json

달리기를 위한 벽시계 타이밍. `<run-dir>/timing.json`에 위치합니다.

**캡처 방법:** 하위 에이전트 작업이 완료되면 작업 알림에 `total_tokens` 및 `duration_ms`이 포함됩니다. 이를 즉시 저장하십시오. 다른 곳에서는 지속되지 않으며 사후에는 복구할 수 없습니다.

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3,
  "executor_start": "2026-01-15T10:30:00Z",
  "executor_end": "2026-01-15T10:32:45Z",
  "executor_duration_seconds": 165.0,
  "grader_start": "2026-01-15T10:32:46Z",
  "grader_end": "2026-01-15T10:33:12Z",
  "grader_duration_seconds": 26.0
}
```

---

## 벤치마크.json

벤치마크 모드의 출력입니다. `benchmarks/<timestamp>/benchmark.json`에 위치합니다.

```json
{
  "metadata": {
    "skill_name": "pdf",
    "skill_path": "/path/to/pdf",
    "executor_model": "claude-sonnet-4-20250514",
    "analyzer_model": "most-capable-model",
    "timestamp": "2026-01-15T10:30:00Z",
    "evals_run": [1, 2, 3],
    "runs_per_configuration": 3
  },

  "runs": [
    {
      "eval_id": 1,
      "eval_name": "Ocean",
      "configuration": "with_skill",
      "run_number": 1,
      "result": {
        "pass_rate": 0.85,
        "passed": 6,
        "failed": 1,
        "total": 7,
        "time_seconds": 42.5,
        "tokens": 3800,
        "tool_calls": 18,
        "errors": 0
      },
      "expectations": [
        {"text": "...", "passed": true, "evidence": "..."}
      ],
      "notes": [
        "Used 2023 data, may be stale",
        "Fell back to text overlay for non-fillable fields"
      ]
    }
  ],

  "run_summary": {
    "with_skill": {
      "pass_rate": {"mean": 0.85, "stddev": 0.05, "min": 0.80, "max": 0.90},
      "time_seconds": {"mean": 45.0, "stddev": 12.0, "min": 32.0, "max": 58.0},
      "tokens": {"mean": 3800, "stddev": 400, "min": 3200, "max": 4100}
    },
    "without_skill": {
      "pass_rate": {"mean": 0.35, "stddev": 0.08, "min": 0.28, "max": 0.45},
      "time_seconds": {"mean": 32.0, "stddev": 8.0, "min": 24.0, "max": 42.0},
      "tokens": {"mean": 2100, "stddev": 300, "min": 1800, "max": 2500}
    },
    "delta": {
      "pass_rate": "+0.50",
      "time_seconds": "+13.0",
      "tokens": "+1700"
    }
  },

  "notes": [
    "Assertion 'Output is a PDF file' passes 100% in both configurations - may not differentiate skill value",
    "Eval 3 shows high variance (50% ± 40%) - may be flaky or model-dependent",
    "Without-skill runs consistently fail on table extraction expectations",
    "Skill adds 13s average execution time but improves pass rate by 50%"
  ]
}
```

**전지:**
- `metadata`: 벤치마크 실행에 대한 정보
- `skill_name` : 스킬 이름
- `timestamp`: 벤치마크가 실행된 시점
- `evals_run`: 평가자 이름 또는 ID 목록
- `runs_per_configuration`: 구성당 실행 횟수(예: 3)
- `runs[]` : 개별 실행 결과
- `eval_id`: 숫자 평가 식별자
- `eval_name`: 사람이 읽을 수 있는 평가 이름(뷰어에서 섹션 헤더로 사용됨)
- `configuration`: `"with_skill"` 또는 `"without_skill"`이어야 합니다(시청자는 그룹화 및 색상 코딩을 위해 이 정확한 문자열을 사용합니다).
- `run_number`: 정수 실행 번호(1, 2, 3...)
- `result`: `pass_rate`, `passed`, `total`, `time_seconds`, `tokens`, `errors`이 포함된 중첩 개체
- `run_summary`: 구성별 통계 집계
- `with_skill` / `without_skill`: 각각 `mean` 및 `stddev` 필드가 있는 `pass_rate`, `time_seconds`, `tokens` 개체를 포함합니다.
- `delta`: `"+0.50"`, `"+13.0"`, `"+1700"`과 같은 차이점 문자열
- `notes`: 분석기의 자유형 관찰

**중요:** 뷰어는 이러한 필드 이름을 정확하게 읽습니다. `configuration` 대신 `config`을 사용하거나 `result` 아래에 중첩되는 대신 실행의 최상위 수준에 `pass_rate`을 배치하면 뷰어에 빈/0 값이 표시됩니다. benchmark.json을 수동으로 생성할 때는 항상 이 스키마를 참조하세요.

---

## 비교.json

블라인드 비교기의 출력. `<grading-dir>/comparison-N.json`에 위치합니다.

```json
{
  "winner": "A",
  "reasoning": "Output A provides a complete solution with proper formatting and all required fields. Output B is missing the date field and has formatting inconsistencies.",
  "rubric": {
    "A": {
      "content": {
        "correctness": 5,
        "completeness": 5,
        "accuracy": 4
      },
      "structure": {
        "organization": 4,
        "formatting": 5,
        "usability": 4
      },
      "content_score": 4.7,
      "structure_score": 4.3,
      "overall_score": 9.0
    },
    "B": {
      "content": {
        "correctness": 3,
        "completeness": 2,
        "accuracy": 3
      },
      "structure": {
        "organization": 3,
        "formatting": 2,
        "usability": 3
      },
      "content_score": 2.7,
      "structure_score": 2.7,
      "overall_score": 5.4
    }
  },
  "output_quality": {
    "A": {
      "score": 9,
      "strengths": ["Complete solution", "Well-formatted", "All fields present"],
      "weaknesses": ["Minor style inconsistency in header"]
    },
    "B": {
      "score": 5,
      "strengths": ["Readable output", "Correct basic structure"],
      "weaknesses": ["Missing date field", "Formatting inconsistencies", "Partial data extraction"]
    }
  },
  "expectation_results": {
    "A": {
      "passed": 4,
      "total": 5,
      "pass_rate": 0.80,
      "details": [
        {"text": "Output includes name", "passed": true}
      ]
    },
    "B": {
      "passed": 3,
      "total": 5,
      "pass_rate": 0.60,
      "details": [
        {"text": "Output includes name", "passed": true}
      ]
    }
  }
}
```

---

## 분석.json

사후 분석기의 출력입니다. `<grading-dir>/analysis.json`에 위치합니다.

```json
{
  "comparison_summary": {
    "winner": "A",
    "winner_skill": "path/to/winner/skill",
    "loser_skill": "path/to/loser/skill",
    "comparator_reasoning": "Brief summary of why comparator chose winner"
  },
  "winner_strengths": [
    "Clear step-by-step instructions for handling multi-page documents",
    "Included validation script that caught formatting errors"
  ],
  "loser_weaknesses": [
    "Vague instruction 'process the document appropriately' led to inconsistent behavior",
    "No script for validation, agent had to improvise"
  ],
  "instruction_following": {
    "winner": {
      "score": 9,
      "issues": ["Minor: skipped optional logging step"]
    },
    "loser": {
      "score": 6,
      "issues": [
        "Did not use the skill's formatting template",
        "Invented own approach instead of following step 3"
      ]
    }
  },
  "improvement_suggestions": [
    {
      "priority": "high",
      "category": "instructions",
      "suggestion": "Replace 'process the document appropriately' with explicit steps",
      "expected_impact": "Would eliminate ambiguity that caused inconsistent behavior"
    }
  ],
  "transcript_insights": {
    "winner_execution_pattern": "Read skill -> Followed 5-step process -> Used validation script",
    "loser_execution_pattern": "Read skill -> Unclear on approach -> Tried 3 different methods"
  }
}
```
