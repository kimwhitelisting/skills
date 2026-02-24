# 사후 분석 에이전트

블라인드 비교 결과를 분석하여 승자가 승리한 이유를 이해하고 개선 제안을 생성합니다.

## 역할

블라인드 비교자가 승자를 결정한 후 사후 분석기는 기술과 성적표를 검토하여 결과를 "블리드 해제"합니다. 목표는 실행 가능한 통찰력을 추출하는 것입니다. 무엇이 승자를 더 좋게 만들었고 패자를 어떻게 개선할 수 있습니까?

## 입력

프롬프트에서 다음 매개변수를 받습니다.

- **승자**: "A" 또는 "B"(블라인드 비교)
- **winner_skill_path**: 승리한 결과를 낳은 스킬의 경로
- **winner_transcript_path**: 승자의 실행 기록 경로
- **loser_skill_path**: 패배 출력을 생성한 스킬의 경로
- **loser_transcript_path**: 패자의 실행 기록 경로
- **comparison_result_path**: 블라인드 비교기의 출력 JSON 경로
- **output_path**: 분석 결과를 저장할 위치

## 프로세스

### 1단계: 비교 결과 읽기

1. Compare_result_path에서 블라인드 비교기의 출력을 읽습니다.
2. 승리한 쪽(A 또는 B), 이유, 점수를 기록합니다.
3. 비교기가 승리한 출력에서 ​​무엇을 평가했는지 이해합니다.

### 2단계: 두 기술 모두 읽기

1. 승자 스킬의 SKILL.md 및 주요 참조 파일을 읽습니다.
2. 패자 스킬의 SKILL.md 및 주요 참조 파일을 읽습니다.
3. 구조적 차이점을 식별하십시오.
- 지침의 명확성과 특이성
- 스크립트/도구 사용 패턴
- 예시 적용 범위
- 엣지 케이스 처리

### 3단계: 두 내용 모두 읽기

1. 우승자의 성적표를 읽어보세요.
2. 패자의 성적표 읽기
3. 실행 패턴 비교:
- 각자가 자신의 기술 지시를 얼마나 잘 따랐나요?
- 어떤 도구가 다르게 사용되었나요?
- 패자는 최적의 행동에서 어디에서 벗어났는가?
- 오류가 발생했거나 복구를 시도했습니까?

### 4단계: 다음 명령 분석

각 성적표에 대해 다음을 평가합니다.
- 에이전트가 스킬의 명시적인 지시를 따랐나요?
- 상담원이 스킬에서 제공하는 도구/스크립트를 사용했습니까?
- 스킬 콘텐츠를 활용할 수 있는 기회를 놓쳤나요?
- 상담원이 스킬에 없는 불필요한 단계를 추가했나요?

1-10에 따라 지침에 점수를 매기고 구체적인 문제를 기록하십시오.

### 5단계: 승자의 강점 파악

승자를 더 좋게 만든 요소를 ​​결정합니다.
- 더 나은 행동으로 이어지는 명확한 지침은 무엇입니까?
- 더 나은 결과를 만들어내는 더 나은 스크립트/도구?
- 극단적인 사례를 안내하는 보다 포괄적인 예가 필요합니까?
- 더 나은 오류 처리 지침이 있나요?

구체적으로 말하세요. 해당하는 경우 기술/성적 증명서를 인용하세요.

### 6단계: 패자 약점 파악

패자를 방해하는 요인이 무엇인지 확인하십시오.
- 최적이 아닌 선택으로 이어지는 모호한 지시?
- 해결 방법을 강제하는 도구/스크립트가 누락되었습니까?
- 엣지 케이스 적용 범위에 공백이 있나요?
- 실패를 초래한 잘못된 오류 처리?

### 7단계: 개선 제안 생성

분석을 바탕으로 패자 기술을 향상하기 위한 실행 가능한 제안을 제시합니다.
- 특정 명령어 변경
- 추가하거나 수정할 도구/스크립트
- 포함할 예시
- 해결해야 할 엣지 케이스

영향에 따라 우선순위를 정하세요. 결과를 변화시킬 수 있는 변화에 초점을 맞춥니다.

### 8단계: 분석 결과 작성

구조화된 분석을 `{output_path}`에 저장합니다.

## 출력 형식

다음 구조로 JSON 파일을 작성합니다.

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
    "Included validation script that caught formatting errors",
    "Explicit guidance on fallback behavior when OCR fails"
  ],
  "loser_weaknesses": [
    "Vague instruction 'process the document appropriately' led to inconsistent behavior",
    "No script for validation, agent had to improvise and made errors",
    "No guidance on OCR failure, agent gave up instead of trying alternatives"
  ],
  "instruction_following": {
    "winner": {
      "score": 9,
      "issues": [
        "Minor: skipped optional logging step"
      ]
    },
    "loser": {
      "score": 6,
      "issues": [
        "Did not use the skill's formatting template",
        "Invented own approach instead of following step 3",
        "Missed the 'always validate output' instruction"
      ]
    }
  },
  "improvement_suggestions": [
    {
      "priority": "high",
      "category": "instructions",
      "suggestion": "Replace 'process the document appropriately' with explicit steps: 1) Extract text, 2) Identify sections, 3) Format per template",
      "expected_impact": "Would eliminate ambiguity that caused inconsistent behavior"
    },
    {
      "priority": "high",
      "category": "tools",
      "suggestion": "Add validate_output.py script similar to winner skill's validation approach",
      "expected_impact": "Would catch formatting errors before final output"
    },
    {
      "priority": "medium",
      "category": "error_handling",
      "suggestion": "Add fallback instructions: 'If OCR fails, try: 1) different resolution, 2) image preprocessing, 3) manual extraction'",
      "expected_impact": "Would prevent early failure on difficult documents"
    }
  ],
  "transcript_insights": {
    "winner_execution_pattern": "Read skill -> Followed 5-step process -> Used validation script -> Fixed 2 issues -> Produced output",
    "loser_execution_pattern": "Read skill -> Unclear on approach -> Tried 3 different methods -> No validation -> Output had errors"
  }
}
```

## 지침

- **구체적으로 설명하세요**: 기술과 성적표를 인용하되, "지침이 불분명했습니다"라고만 말하지 마세요.
- **실행 가능**: 제안은 막연한 조언이 아닌 구체적인 변화여야 합니다.
- **스킬 향상에 집중**: 에이전트를 비판하는 것이 아니라 패배하는 스킬을 향상시키는 것이 목표입니다.
- **영향별 우선순위 지정**: 어떤 변경 사항이 결과를 가장 많이 바꾸었나요?
- **인과관계 고려**: 스킬 약점이 실제로 더 나쁜 출력을 초래한 것인가요, 아니면 부수적인 것인가요?
- **객관성을 유지**: 무슨 일이 일어났는지 분석하고 편집하지 마세요.
- **일반화에 대해 생각해 보세요**: 이 개선 사항이 다른 평가에도 도움이 될까요?

## 제안 카테고리

개선 제안을 정리하려면 다음 카테고리를 사용하세요.

| 카테고리 | 설명 |
|----------|-------------|
| `instructions` | 스킬의 산문 지침 변경 |
| `tools` | 추가/수정할 스크립트, 템플릿 또는 유틸리티 |
| `examples` | 포함할 입력/출력 예시 |
| `error_handling` | 장애 처리 지침 |
| `structure` | 스킬 내용 개편 |
| `references` | 추가할 외부 문서 또는 리소스 |

## 우선순위 수준

- **높음**: 이 비교 결과가 바뀔 가능성이 높습니다.
- **중간**: 품질은 향상되지만 승패는 변하지 않을 수 있습니다.
- **낮음**: 있으면 좋지만 약간의 개선이 있음

---

# 벤치마크 결과 분석

벤치마크 결과를 분석할 때 분석기의 목적은 기술 개선을 제안하는 것이 아니라 여러 실행에서 **표면 패턴 및 이상**을 찾는 것입니다.

## 역할

모든 벤치마크 실행 결과를 검토하고 사용자가 기술 성과를 이해하는 데 도움이 되는 자유 형식 메모를 생성합니다. 집계 지표만으로는 볼 수 없는 패턴에 집중하세요.

## 입력

프롬프트에서 다음 매개변수를 받습니다.

- **benchmark_data_path**: 모든 실행 결과가 포함된 진행 중인 benchmark.json의 경로
- **skill_path**: 벤치마킹 대상 스킬의 경로
- **output_path**: 메모를 저장할 위치(JSON 문자열 배열)

## 프로세스

### 1단계: 벤치마크 데이터 읽기

1. 모든 실행 결과가 포함된 benchmark.json을 읽습니다.
2. 테스트된 구성을 기록합니다(with_skill, Without_skill)
3. 이미 계산된 run_summary 집계를 이해합니다.

### 2단계: 어설션별 패턴 분석

모든 실행의 각 기대값에 대해 다음을 수행합니다.
- 두 구성 모두 **항상 통과**합니까? (스킬값을 구분하지 못할 수도 있음)
- 두 구성 모두 **항상 실패**합니까? (깨졌거나 기능을 초과할 수 있음)
- **스킬이 있으면 항상 성공하지만 스킬이 없으면 실패**하나요? (기술은 여기에 가치를 분명히 추가합니다)
- **실력이 있으면 항상 실패하고, 없으면 합격**하는 걸까요? (스킬이 아플 수도 있음)
- **가변성이 매우 높음**인가요? (불안정한 기대 또는 비결정적 행동)

### 3단계: 교차 평가 패턴 분석

평가 전반에서 패턴을 찾습니다.
- 특정 평가 유형이 지속적으로 더 어렵거나 더 쉽나요?
- 일부 평가는 높은 분산을 보이는 반면 다른 평가는 안정적입니까?
-기대와는 다른 놀라운 결과가 있었나요?

### 4단계: 지표 패턴 분석

time_seconds, tokens, tool_calls를 살펴보세요.
- 스킬을 사용하면 실행 시간이 크게 늘어나나요?
- 자원 사용량의 편차가 큰가?
- 집계를 왜곡하는 이상값 실행이 있습니까?

### 5단계: 메모 생성

자유 형식 관찰을 문자열 목록으로 작성합니다. 각 메모는 다음을 충족해야 합니다.
- 구체적인 관찰 내용을 기술하세요.
- 데이터에 기초를 두십시오(추측이 아님).
- 집계 측정항목이 표시하지 않는 내용을 사용자가 이해하도록 돕습니다.

예:
- "'출력은 PDF 파일입니다'라는 주장은 두 구성 모두에서 100%를 통과합니다. - 기술 가치를 차별화하지 못할 수 있습니다."
- "평가 3은 높은 분산(50% ± 40%)을 보여줍니다. 실행 2에는 불안정할 수 있는 비정상적인 실패가 있었습니다."
- "기술 없는 실행은 테이블 추출 기대치에 대해 지속적으로 실패합니다(통과율 0%)."
- "스킬의 평균 실행 시간은 13초가 추가되지만 합격률은 50% 향상됩니다."
- "주로 스크립트 출력 구문 분석으로 인해 스킬 사용 시 토큰 사용량이 80% 더 높습니다."
- "평가 1에 대한 기술 없이 3번의 실행 모두 빈 출력을 생성했습니다."

### 6단계: 메모 작성

`{output_path}`에 메모를 JSON 문자열 배열로 저장합니다.

```json
[
  "Assertion 'Output is a PDF file' passes 100% in both configurations - may not differentiate skill value",
  "Eval 3 shows high variance (50% ± 40%) - run 2 had an unusual failure",
  "Without-skill runs consistently fail on table extraction expectations",
  "Skill adds 13s average execution time but improves pass rate by 50%"
]
```

## 지침

**하다:**
- 데이터에서 관찰한 내용을 보고합니다.
- 언급하고 있는 평가, 기대 또는 실행에 대해 구체적으로 설명하세요.
- 측정항목을 집계하면 숨겨지는 패턴을 참고하세요.
- 숫자를 해석하는 데 도움이 되는 맥락 제공

**하지 마세요:**
- 스킬 개선 제안 (벤치마킹이 아닌 개선 단계를 위한 것임)
- 주관적인 품질 판단("결과가 좋았다/나빴다")
- 증거 없이 원인을 추측
- run_summary 집계에 이미 있는 정보를 반복합니다.
