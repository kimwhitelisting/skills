# MCP 서버 평가 가이드
## 빠른 안내

- **문서 요약**: 이 문서는 MCP 서버에 대한 포괄적인 평가 작성에 대한 지침을 제공합니다. 평가는 LLM이 MCP 서버를 효과적으로 사용하여 제공된 도구만을
             사용하여 현실적이고 복잡한 질문에 답할 수 있는지 여부를 테스트합니다.
- **핵심 섹션**: 개요, 빠른 참조, 평가의 목적, 평가 개요, 질문 지침, 답변 지침

### 권장 읽기 순서
1. 개요
2. 빠른 참조
3. 평가의 목적
4. 평가 개요
5. 질문 지침



## 개요

이 문서는 MCP 서버에 대한 포괄적인 평가 작성에 대한 지침을 제공합니다. 평가는 LLM이 MCP 서버를 효과적으로 사용하여 제공된 도구만을 사용하여 현실적이고 복잡한 질문에
답할 수 있는지 여부를 테스트합니다.

---

## 빠른 참조

### 평가 요구 사항
- 사람이 읽을 수 있는 질문 10개 만들기
- 질문은 읽기 전용, 독립적, 비파괴적이어야 합니다.
- 각 질문에는 여러 번의 도구 호출(잠재적으로 수십 개)이 필요합니다.
- 답변은 검증 가능한 단일 값이어야 합니다.
- 답변은 안정적이어야 합니다(시간이 지나도 변경되지 않음).

### 출력 형식
```xml
<evaluation>
   <qa_pair>
      <question>Your question here</question>
      <answer>Single verifiable answer</answer>
   </qa_pair>
</evaluation>
```

---

## 평가의 목적

MCP 서버의 품질 측정은 서버가 도구를 얼마나 잘 또는 포괄적으로 구현하는지가 아니라 이러한 구현(입력/출력 스키마, 독스트링/설명, 기능)이 다른 컨텍스트 없이 LLM을
얼마나 잘 활성화하고 MCP 서버에만 액세스하여 현실적이고 어려운 질문에 답할 수 있는지에 달려 있습니다.

## 평가 개요

답변하려면 읽기 전용, 독립, 비파괴 및 IDEMPOTENT 작업만 요구하는 사람이 읽을 수 있는 질문 10개를 만드세요. 각 질문은 다음과 같아야 합니다.

- 현실적
- 명확하고 간결함
- 모호하지 않음
- 잠재적으로 수십 개의 도구 호출 또는 단계가 필요할 정도로 복잡함
- 사전에 식별한 검증 가능한 단일 값으로 응답 가능

## 질문 지침

### 핵심 요구사항

1. **질문은 독립적이어야 합니다**
- 각 질문은 다른 질문에 대한 답변에 의존해서는 안 됩니다.
- 다른 질문을 처리하기 위해 사전 쓰기 작업을 가정해서는 안 됩니다.

2. **질문에는 비파괴적이고 멱등적인 도구 사용만 요구되어야 합니다**
- 정답에 도달하기 위해 상태 수정을 지시하거나 요구해서는 안 됩니다.

3. **질문은 현실적이고, 명확하고, 간결하고, 복잡해야 합니다**
- 답변을 위해 여러(잠재적으로 수십 개의) 도구 또는 단계를 사용하려면 다른 LLM이 필요합니다.

### 복잡성과 깊이

4. **질문에는 깊은 탐색이 필요해야 합니다**
- 여러 하위 질문과 순차적인 도구 호출이 필요한 다중 홉 질문을 고려하세요.
- 각 단계는 이전 질문에서 찾은 정보를 활용해야 합니다.

5. **질문에는 광범위한 페이징이 필요할 수 있습니다**
- 결과의 여러 페이지를 페이징해야 할 수도 있습니다.
- 틈새 정보를 찾기 위해 오래된 데이터(1~2년 전)를 쿼리해야 할 수도 있습니다.
- 질문은 어려워야 합니다.

6. **질문에는 깊은 이해가 필요해야 합니다**
- 표면적인 지식보다는
- 증거가 필요한 참/거짓 질문으로 복잡한 아이디어를 제시할 수 있음
- LLM이 서로 다른 가설을 검색해야 하는 객관식 형식을 사용할 수 있습니다.

7. **단순한 키워드 검색으로 질문이 해결되어서는 안 됩니다**
- 대상 콘텐츠 중 특정 키워드를 포함하지 마세요.
- 동의어, 관련 개념, 의역을 사용하세요.
- 다수의 검색이 필요하며, 다수의 관련 항목을 분석하고 맥락을 추출한 후 답변을 도출합니다.

### 도구 테스트

8. **질문은 스트레스 테스트 도구 반환 값이어야 합니다**
- LLM을 압도하는 대규모 JSON 개체 또는 목록을 반환하는 도구를 유도할 수 있습니다.
- 데이터의 다양한 양식을 이해해야 합니다.
     - IDs and names
     - Timestamps and datetimes (months, days, years, seconds)
     - File IDs, names, extensions, and mimetypes
     - URLs, GIDs, etc.

- 모든 유용한 형태의 데이터를 반환하는 도구의 능력을 조사해야 합니다.

9. **질문은 대부분 실제 인간의 사용 사례를 반영해야 합니다**
- LLM의 도움을 받는 HUMANS가 관심을 갖는 정보 검색 작업의 종류

10. **질문에는 수십 번의 도구 호출이 필요할 수 있습니다**
    - This challenges LLMs with limited context
    - Encourages MCP server tools to reduce information returned

11. **모호한 질문 포함**
    - May be ambiguous OR require difficult decisions on which tools to call
    - Force the LLM to potentially make mistakes or misinterpret
    - Ensure that despite AMBIGUITY, there is STILL A SINGLE VERIFIABLE ANSWER

### 안정성

12. **답변이 변하지 않도록 질문을 설계해야 합니다**
    - Do not ask questions that rely on "current state" which is dynamic
    - For example, do not count:
      - Number of reactions to a post
      - Number of replies to a thread
      - Number of members in a channel

13. **MCP 서버가 귀하가 생성하는 질문 종류를 제한하지 않도록 하세요**
    - Create challenging and complex questions
    - Some may not be solvable with the available MCP server tools
    - Questions may require specific output formats (datetime vs. epoch time, JSON vs. MARKDOWN)
    - Questions may require dozens of tool calls to complete

## 답변 지침

### 확인

1. **직접 문자열 비교를 통해 답변을 검증할 수 있어야 합니다**
- 답변을 여러 형식으로 다시 작성할 수 있는 경우 질문에 출력 형식을 명확하게 지정하십시오.
- 예: "YYYY/MM/DD를 사용하세요.", "참 또는 거짓으로 응답하세요.", "A, B, C, D에만 답하세요."
- 답변은 다음과 같은 단일 검증 가능 값이어야 합니다.
     - User ID, user name, display name, first name, last name
     - Channel ID, channel name
     - Message ID, string
     - URL, title
     - Numerical quantity
     - Timestamp, datetime
     - Boolean (for True/False questions)
     - Email address, phone number
     - File ID, file name, file extension
     - Multiple choice answer

- 답변에는 특별한 형식이나 복잡하고 구조화된 출력이 필요하지 않아야 합니다.
- 답변은 DIRECT STRING COMPARISON을 사용하여 확인됩니다.

### 가독성

2. **답변은 일반적으로 사람이 읽을 수 있는 형식을 선호해야 합니다**
- 예: 이름, 이름, 성, 날짜/시간, 파일 이름, 메시지 문자열, URL, 예/아니요, 참/거짓, a/b/c/d
- 불투명한 신분증보다는 (단, 신분증은 허용됩니다)
- 답변의 대부분은 사람이 읽을 수 있는 형식이어야 합니다.

### 안정성

3. **답변은 안정적/정적이어야 합니다**
- 오래된 콘텐츠를 살펴보세요(예: 종료된 대화, 시작된 프로젝트, 질문에 대한 답변)
- 항상 동일한 답변을 반환하는 "폐쇄형" 개념을 기반으로 질문을 만듭니다.
- 질문은 고정되지 않은 답변을 차단하기 위해 고정된 시간 창을 고려하도록 요청할 수 있습니다.
- 상황에 의존할 가능성이 거의 없음
- 예: 논문명을 찾는 경우, 답변이 나중에 출판된 논문과 혼동되지 않도록 충분히 구체적으로 작성하십시오.

4. **답변은 명확하고 모호하지 않아야 합니다**
- 질문은 하나의 명확한 답변이 있도록 설계되어야 합니다.
- MCP 서버 도구를 사용하여 답변을 도출할 수 있습니다.

### 다양성

5. **답변은 다양해야 합니다**
- 답변은 다양한 양식과 형식의 검증 가능한 단일 값이어야 합니다.
- 사용자 개념 : 사용자 ID, 사용자 이름, 표시 이름, 이름, 성, 이메일 주소, 전화번호
- 채널 개념 : 채널 ID, 채널 이름, 채널 주제
- 메시지 개념: 메시지 ID, 메시지 문자열, 타임스탬프, 월, 일, 연도

6. **답변은 복잡한 구조가 아니어야 합니다**
- 값 목록이 아님
- 복잡한 물건이 아니다
- ID 또는 문자열 목록이 아닙니다.
- 자연어 텍스트가 아님
- DIRECT STRING COMPARISON을 사용하여 답변을 직접 확인할 수 없는 경우
- 사실적으로 재현 가능
- LLM이 다른 순서나 형식으로 동일한 목록을 반환할 가능성은 낮아야 합니다.

## 평가 과정

### 1단계: 문서 검사

이해하려면 대상 API 문서를 읽어보세요.

- 사용 가능한 엔드포인트 및 기능
- 모호한 점이 있으면 웹에서 추가 정보를 가져옵니다.
- 가능한 한 이 단계를 병렬화하세요.
- 각 하위 에이전트가 파일 시스템이나 웹의 문서만 검사하는지 확인하세요.

### 2단계: 도구 검사

MCP 서버에서 사용 가능한 도구를 나열합니다.

- MCP 서버를 직접 검사
- 입력/출력 스키마, 독스트링 및 설명을 이해합니다.
- 이 단계에서는 도구 자체를 호출하지 않고

### 3단계: 이해력 키우기

완전히 이해할 때까지 1단계와 2단계를 반복하세요.

- 여러 번 반복
- 만들고 싶은 작업 종류에 대해 생각해 보세요.
- 이해를 구체화하라
- 어떤 단계에서도 MCP 서버 구현 자체의 코드를 읽어서는 안 됩니다.
- 직관과 이해력을 사용하여 합리적이고 현실적이지만 매우 어려운 작업을 만듭니다.

### 4단계: 읽기 전용 콘텐츠 검사

API와 도구를 이해한 후 MCP 서버 도구를 사용하십시오.

- 읽기 전용 및 비파괴 작업만 사용하여 콘텐츠를 검사합니다.
- 목표: 현실적인 질문을 만들기 위한 특정 콘텐츠(예: 사용자, 채널, 메시지, 프로젝트, 작업)를 식별합니다.
- 상태를 수정하는 도구를 호출하면 안 됩니다.
- MCP 서버 구현 자체의 코드를 읽지 않습니다.
- 독립적인 탐색을 추구하는 개별 하위 에이전트와 이 단계를 병행합니다.
- 각 하위 에이전트가 읽기 전용, 비파괴 및 IDEMPOTENT 작업만 수행하는지 확인하세요.
- 주의하세요: 일부 도구는 많은 양의 데이터를 반환하여 CONTEXT가 부족해질 수 있습니다.
- 탐색을 위해 점진적이고 소규모이며 대상이 지정된 도구 호출을 수행합니다.
- 모든 도구 호출 요청에서 `limit` 매개변수를 사용하여 결과를 제한합니다(<10).
- 페이지 매김 사용

### 5단계: 작업 생성

콘텐츠를 검사한 후 사람이 읽을 수 있는 질문 10개를 만듭니다.

- LLM은 MCP 서버를 통해 이에 응답할 수 있어야 합니다.
- 위의 모든 질문과 답변 지침을 따르십시오.

## 출력 형식

각 QA 쌍은 질문과 답변으로 구성됩니다. 출력은 다음 구조의 XML 파일이어야 합니다.

```xml
<evaluation>
   <qa_pair>
      <question>Find the project created in Q2 2024 with the highest number of completed tasks. What is the project name?</question>
      <answer>Website Redesign</answer>
   </qa_pair>
   <qa_pair>
      <question>Search for issues labeled as "bug" that were closed in March 2024. Which user closed the most issues? Provide their username.</question>
      <answer>sarah_dev</answer>
   </qa_pair>
   <qa_pair>
      <question>Look for pull requests that modified files in the /api directory and were merged between January 1 and January 31, 2024. How many different contributors worked on these PRs?</question>
      <answer>7</answer>
   </qa_pair>
   <qa_pair>
      <question>Find the repository with the most stars that was created before 2023. What is the repository name?</question>
      <answer>data-pipeline</answer>
   </qa_pair>
</evaluation>
```

## 평가 예시

### 좋은 질문

**예 1: 심층 탐색이 필요한 멀티 홉 질문(GitHub MCP)**
```xml
<qa_pair>
   <question>Find the repository that was archived in Q3 2023 and had previously been the most forked project in the organization. What was the primary programming language used in that repository?</question>
   <answer>Python</answer>
</qa_pair>
```

이 질문이 좋은 이유는 다음과 같습니다.

- 보관된 저장소를 찾으려면 여러 번의 검색이 필요합니다.
- 보관 이전에 포크가 가장 많았던 항목을 식별해야 합니다.
- 언어에 대한 저장소 세부 정보를 검사해야 합니다.
- 답변은 간단하고 검증 가능한 값입니다.
- 변경되지 않는 과거(폐쇄) 데이터를 기반으로 합니다.

**예 2: 키워드 일치 없이 컨텍스트 이해 필요(프로젝트 관리 MCP)**
```xml
<qa_pair>
   <question>Locate the initiative focused on improving customer onboarding that was completed in late 2023. The project lead created a retrospective document after completion. What was the lead's role title at that time?</question>
   <answer>Product Manager</answer>
</qa_pair>
```

이 질문이 좋은 이유는 다음과 같습니다.

- 특정 프로젝트 이름을 사용하지 않습니다("고객 온보딩 개선에 초점을 맞춘 이니셔티브").
- 특정 기간에 완료된 프로젝트를 찾아야 함
- 프로젝트 리더와 그들의 역할을 파악해야 합니다.
- 회고 문서의 맥락을 이해해야 합니다.
- 답변은 사람이 읽을 수 있고 안정적입니다.
- 완성된 작품 기준 (변경되지 않음)

**예 3: 여러 단계가 필요한 복잡한 집계(이슈 트래커 MCP)**
```xml
<qa_pair>
   <question>Among all bugs reported in January 2024 that were marked as critical priority, which assignee resolved the highest percentage of their assigned bugs within 48 hours? Provide the assignee's username.</question>
   <answer>alex_eng</answer>
</qa_pair>
```

이 질문이 좋은 이유는 다음과 같습니다.

- 날짜, 우선순위, 상태별로 버그를 필터링해야 합니다.
- 담당자별로 그룹화하고 해결률을 계산해야 함
- 48시간 창을 결정하려면 타임스탬프를 이해해야 합니다.
- 페이지 매김 테스트(처리할 버그가 많을 수 있음)
- 답변은 단일 사용자 이름입니다.
- 특정 기간의 과거 데이터를 기반으로 함

**예 4: 여러 데이터 유형에 걸쳐 합성이 필요함(CRM MCP)**
```xml
<qa_pair>
   <question>Find the account that upgraded from the Starter to Enterprise plan in Q4 2023 and had the highest annual contract value. What industry does this account operate in?</question>
   <answer>Healthcare</answer>
</qa_pair>
```

이 질문이 좋은 이유는 다음과 같습니다.

- 구독 등급 변경에 대한 이해가 필요합니다.
- 특정 기간의 업그레이드 이벤트를 식별해야 합니다.
- 계약 가치 비교 필요
- 계정 산업 정보에 접근해야 함
- 답변은 간단하고 검증 가능합니다.
- 완료된 과거 거래 기준

### 불쌍한 질문

**예 1: 시간에 따른 답변 변경**
```xml
<qa_pair>
   <question>How many open issues are currently assigned to the engineering team?</question>
   <answer>47</answer>
</qa_pair>
```

이 질문은 다음과 같은 이유로 좋지 않습니다.

- 이슈가 생성되거나 종료되거나 재할당되면 답변이 변경됩니다.
- 안정적/정적 데이터를 기반으로 하지 않음
- 동적인 "현재 상태"에 의존합니다.

**예 2: 키워드 검색이 너무 쉬움**
```xml
<qa_pair>
   <question>Find the pull request with title "Add authentication feature" and tell me who created it.</question>
   <answer>developer123</answer>
</qa_pair>
```

이 질문은 다음과 같은 이유로 좋지 않습니다.

- 정확한 제목에 대한 간단한 키워드 검색으로 해결 가능
- 깊은 탐색이나 이해가 필요하지 않습니다.
- 합성이나 분석이 필요하지 않습니다.

**예 3: 모호한 답변 형식**
```xml
<qa_pair>
   <question>List all the repositories that have Python as their primary language.</question>
   <answer>repo1, repo2, repo3, data-pipeline, ml-tools</answer>
</qa_pair>
```

이 질문은 다음과 같은 이유로 좋지 않습니다.

- 답변은 어떤 순서로든 반환될 수 있는 목록입니다.
- 직접 문자열 비교로 검증이 어려움
- LLM은 형식이 다를 수 있습니다(JSON 배열, 쉼표로 구분, 줄바꿈으로 구분).
- 특정 집계(개수) 또는 최상급(대부분의 별)을 요청하는 것이 더 좋습니다.

## 확인 과정

평가를 생성한 후:

1. **XML 파일을 검사**하여 스키마를 이해합니다.
2. **각 작업 지침을 로드**하고 MCP 서버 및 도구를 사용하여 병렬로 작업을 직접 해결하여 정답을 식별합니다.
3. **쓰기 또는 파괴 작업이 필요한 모든 작업에 플래그를 지정**
4. **정답을 모두 누적**하고 문서의 오답을 교체합니다.
5. **쓰기 또는 파괴 작업이 필요한 `<qa_pair>`**을 제거합니다.

컨텍스트 부족을 방지하기 위해 작업 해결을 병렬화한 다음 모든 답변을 축적하고 마지막에 파일을 변경하는 것을 잊지 마십시오.

## 품질 평가 작성을 위한 팁

1. 작업을 생성하기 전에 **열심히 생각하고 미리 계획**하세요.
2. **기회가 생기는 곳을 병렬화**하여 프로세스 속도를 높이고 상황을 관리합니다.
3. 인간이 실제로 달성하고자 하는 **현실적인 사용 사례에 집중**
4. MCP 서버 기능의 한계를 테스트하는 **도전적인 질문 만들기**
5. 과거 데이터와 폐쇄적 개념을 활용하여 **안정성 보장**
6. MCP 서버 도구를 사용하여 직접 질문을 해결하여 **답변 확인**
7. 프로세스 중에 배운 내용을 바탕으로 **반복 및 개선**

---

## 평가 실행

평가 파일을 생성한 후 제공된 평가 도구를 사용하여 MCP 서버를 테스트할 수 있습니다.

## 설정

1. **종속성 설치**

   ```bash
   pip install -r scripts/requirements.txt
   ```

또는 수동으로 설치하십시오.
   ```bash
   pip install anthropic mcp
   ```

2. **API 키 설정**

   ```bash
   export ANTHROPIC_API_KEY=your_api_key_here
   ```

## 평가 파일 형식

평가 파일은 `<qa_pair>` 요소가 포함된 XML 형식을 사용합니다.

```xml
<evaluation>
   <qa_pair>
      <question>Find the project created in Q2 2024 with the highest number of completed tasks. What is the project name?</question>
      <answer>Website Redesign</answer>
   </qa_pair>
   <qa_pair>
      <question>Search for issues labeled as "bug" that were closed in March 2024. Which user closed the most issues? Provide their username.</question>
      <answer>sarah_dev</answer>
   </qa_pair>
</evaluation>
```

## 평가 실행

평가 스크립트(`scripts/evaluation.py`)는 세 가지 전송 유형을 지원합니다.

**중요한:**

- **stdio 전송**: 평가 스크립트는 자동으로 MCP 서버 프로세스를 시작하고 관리합니다. 서버를 수동으로 실행하지 마십시오.
- **sse/http 전송**: 평가를 실행하기 전에 별도로 MCP 서버를 시작해야 합니다. 스크립트는 지정된 URL에서 이미 실행 중인 서버에 연결됩니다.

### 1. 로컬 STDIO 서버

로컬로 실행되는 MCP 서버의 경우(스크립트가 자동으로 서버를 시작함):

```bash
python scripts/evaluation.py \
  -t stdio \
  -c python \
  -a my_mcp_server.py \
  evaluation.xml
```

환경 변수 사용:
```bash
python scripts/evaluation.py \
  -t stdio \
  -c python \
  -a my_mcp_server.py \
  -e API_KEY=abc123 \
  -e DEBUG=true \
  evaluation.xml
```

### 2. 서버에서 보낸 이벤트(SSE)

SSE 기반 MCP 서버의 경우(먼저 서버를 시작해야 함):

```bash
python scripts/evaluation.py \
  -t sse \
  -u https://example.com/mcp \
  -H "Authorization: Bearer token123" \
  -H "X-Custom-Header: value" \
  evaluation.xml
```

### 3. HTTP(스트리밍 가능한 HTTP)

HTTP 기반 MCP 서버의 경우(먼저 서버를 시작해야 함):

```bash
python scripts/evaluation.py \
  -t http \
  -u https://example.com/mcp \
  -H "Authorization: Bearer token123" \
  evaluation.xml
```

## 명령줄 옵션

```
usage: evaluation.py [-h] [-t {stdio,sse,http}] [-m MODEL] [-c COMMAND]
                     [-a ARGS [ARGS ...]] [-e ENV [ENV ...]] [-u URL]
                     [-H HEADERS [HEADERS ...]] [-o OUTPUT]
                     eval_file

positional arguments:
  eval_file             Path to evaluation XML file

optional arguments:
  -h, --help            Show help message
  -t, --transport       Transport type: stdio, sse, or http (default: stdio)
  -m, --model           Claude model to use (default: claude-3-7-sonnet-20250219)
  -o, --output          Output file for report (default: print to stdout)

stdio options:
  -c, --command         Command to run MCP server (e.g., python, node)
  -a, --args            Arguments for the command (e.g., server.py)
  -e, --env             Environment variables in KEY=VALUE format

sse/http options:
  -u, --url             MCP server URL
  -H, --header          HTTP headers in 'Key: Value' format
```

## 출력

평가 스크립트는 다음을 포함하는 세부 보고서를 생성합니다.

- **요약 통계**:
- 정확도(올바른/전체)
- 평균 작업 기간
- 작업당 평균 도구 호출
- 총 도구 호출

- **작업별 결과**:
- 신속하고 기대되는 응답
- 상담원의 실제 응답
- 정답 여부(✅/❌)
- 기간 및 도구 호출 세부정보
- 에이전트의 접근 방식 요약
- 도구에 대한 상담원의 피드백

### 보고서를 파일에 저장

```bash
python scripts/evaluation.py \
  -t stdio \
  -c python \
  -a my_server.py \
  -o evaluation_report.md \
  evaluation.xml
```

## 완전한 예시 워크플로

다음은 평가를 생성하고 실행하는 전체 예입니다.

1. **평가 파일 만들기**(`my_evaluation.xml`):

```xml
<evaluation>
   <qa_pair>
      <question>Find the user who created the most issues in January 2024. What is their username?</question>
      <answer>alice_developer</answer>
   </qa_pair>
   <qa_pair>
      <question>Among all pull requests merged in Q1 2024, which repository had the highest number? Provide the repository name.</question>
      <answer>backend-api</answer>
   </qa_pair>
   <qa_pair>
      <question>Find the project that was completed in December 2023 and had the longest duration from start to finish. How many days did it take?</question>
      <answer>127</answer>
   </qa_pair>
</evaluation>
```

2. **종속성 설치**:

```bash
pip install -r scripts/requirements.txt
export ANTHROPIC_API_KEY=your_api_key
```

3. **평가 실행**:

```bash
python scripts/evaluation.py \
  -t stdio \
  -c python \
  -a github_mcp_server.py \
  -e GITHUB_TOKEN=ghp_xxx \
  -o github_eval_report.md \
  my_evaluation.xml
```

4. `github_eval_report.md`의 **보고서를 검토**하여 다음을 수행합니다.
- 어떤 질문이 통과/불합격했는지 확인하세요.
- 도구에 대한 상담원의 피드백을 읽어보세요.
- 개선할 부분 파악
- MCP 서버 설계 반복

## 문제 해결

### 연결 오류

연결 오류가 발생하는 경우:

- **STDIO**: 명령과 인수가 올바른지 확인하세요.
- **SSE/HTTP**: URL에 액세스할 수 있는지, 헤더가 올바른지 확인하세요.
- 필수 API 키가 환경 변수 또는 헤더에 설정되어 있는지 확인하세요.

### 낮은 정확도

많은 평가가 실패하는 경우:

- 작업별 상담원의 피드백을 검토하세요.
- 도구 설명이 명확하고 포괄적인지 확인하세요.
- 입력 매개변수가 잘 문서화되어 있는지 확인하세요.
- 도구가 너무 많은 데이터를 반환하는지 아니면 너무 적은 데이터를 반환하는지 고려하세요.
- 오류 메시지가 실행 가능한지 확인

### 시간 초과 문제

작업 시간이 초과된 경우:

- 더 유능한 모델을 사용하세요(예: `claude-3-7-sonnet-20250219`)
- 도구가 너무 많은 데이터를 반환하는지 확인하세요.
- 페이지 매김이 올바르게 작동하는지 확인
- 복잡한 질문을 단순화하는 것을 고려해보세요.
