# mcp-builder

## 문서 정보

- **이름**: `mcp-builder`
- **설명**: 잘 설계된 도구를 통해 LLM이 외부 서비스와 상호 작용할 수 있도록 하는 고품질 MCP(모델 컨텍스트 프로토콜) 서버를 생성하기 위한 가이드입니다.
          Python(FastMCP) 또는 Node/TypeScript(MCP SDK)에서 외부 API 또는 서비스를 통합하기 위해 MCP 서버를 구축할 때
          사용합니다.

- **라이선스**: -


## 빠른 안내

- **문서 요약**: 잘 설계된 도구를 통해 LLM이 외부 서비스와 상호 작용할 수 있도록 하는 MCP(모델 컨텍스트 프로토콜) 서버를 만듭니다. MCP 서버의 품질은
             LLM이 실제 작업을 얼마나 잘 수행할 수 있는지에 따라 측정됩니다.

- **핵심 섹션**: 개요, 프로세스, 🚀 상위 수준 워크플로, 참조 파일, 📚 문서 라이브러리

### 권장 읽기 순서
1. 개요
2. 프로세스
3. 🚀 상위 수준 워크플로
4. 참조 파일
5. 📚 문서 라이브러리


## 개요

잘 설계된 도구를 통해 LLM이 외부 서비스와 상호 작용할 수 있도록 하는 MCP(모델 컨텍스트 프로토콜) 서버를 만듭니다. MCP 서버의 품질은 LLM이 실제 작업을 얼마나
잘 수행할 수 있는지에 따라 측정됩니다.

---

## 프로세스

## 🚀 상위 수준 워크플로

고품질 MCP 서버를 만드는 데는 네 가지 주요 단계가 포함됩니다.

### 1단계: 심층 조사 및 계획

#### 1.1 최신 MCP 디자인 이해

**API 적용 범위와 워크플로 도구:**
전문적인 워크플로 도구를 사용하여 포괄적인 API 엔드포인트 범위의 균형을 유지하세요. 워크플로 도구는 특정 작업에 더 편리할 수 있으며, 포괄적인 적용 범위는 상담원에게
작업을 구성할 수 있는 유연성을 제공합니다. 성능은 클라이언트에 따라 다릅니다. 일부 클라이언트는 기본 도구를 결합한 코드 실행의 이점을 누리고 다른 클라이언트는 더 높은
수준의 워크플로에서 더 잘 작동합니다. 확실하지 않은 경우 포괄적인 API 적용 범위에 우선순위를 두세요.

**도구 명명 및 검색 가능성:**
명확하고 설명적인 도구 이름은 상담원이 올바른 도구를 빠르게 찾는 데 도움이 됩니다. 일관된 접두사(예: `github_create_issue`,
`github_list_repos`)와 작업 지향적인 이름을 사용합니다.

**컨텍스트 관리:**
상담원은 간결한 도구 설명과 결과 필터링/페이지 매기기 기능의 이점을 누릴 수 있습니다. 집중적이고 관련성 있는 데이터를 반환하는 설계 도구입니다. 일부 클라이언트는 에이전트가
데이터를 효율적으로 필터링하고 처리하는 데 도움이 되는 코드 실행을 지원합니다.

**조치 가능한 오류 메시지:**
오류 메시지는 상담원에게 구체적인 제안 사항과 다음 단계를 포함한 해결 방법을 안내해야 합니다.

#### 1.2 MCP 프로토콜 문서 연구

**MCP 사양 탐색:**

관련 페이지를 찾으려면 사이트맵으로 시작하세요: `https://modelcontextprotocol.io/sitemap.xml`

그런 다음 마크다운 형식을 위해 `.md` 접미사가 있는 특정 페이지를 가져옵니다(예:
`https://modelcontextprotocol.io/specification/draft.md`).

검토할 주요 페이지:

- 사양 개요 및 아키텍처
- 전송 메커니즘(스트리밍 가능한 HTTP, stdio)
- 도구, 리소스 및 프롬프트 정의

#### 1.3 연구 프레임워크 문서

**권장 스택:**

- **언어**: TypeScript(고품질 SDK 지원 및 MCPB와 같은 다양한 실행 환경에서의 우수한 호환성. Plus AI 모델은 TypeScript 코드 생성에
  능숙하여 광범위한 사용, 정적 타이핑 및 우수한 Linting 도구의 이점을 활용함)

- **전송**: 상태 비저장 JSON을 사용하여 원격 서버를 위한 스트리밍 가능한 HTTP(상태 저장 세션 및 스트리밍 응답과 달리 확장 및 유지 관리가 더 간단함) 로컬
  서버용 stdio.

**프레임워크 문서 로드:**

- **MCP 모범 사례**: [📋 View Best
  Practices](team_share_ko__skills__examples__mcp-builder__reference__mcp_best_practices.md) -
  ​​핵심 지침

**TypeScript의 경우(권장):**

- **TypeScript SDK**: WebFetch를 사용하여
  `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md` 로드

- [⚡ TypeScript
  Guide](team_share_ko__skills__examples__mcp-builder__reference__node_mcp_server.md) -
  ​​TypeScript 패턴 및 예제

**파이썬의 경우:**

- **Python SDK**: WebFetch를 사용하여
  `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md` 로드

- [🐍 Python
  Guide](team_share_ko__skills__examples__mcp-builder__reference__python_mcp_server.md) -
  ​​Python 패턴 및 예제

#### 1.4 구현 계획

**API 이해:**
서비스의 API 문서를 검토하여 주요 엔드포인트, 인증 요구 사항 및 데이터 모델을 식별하세요. 필요에 따라 웹 검색과 WebFetch를 사용하세요.

**도구 선택:**
포괄적인 API 적용 범위에 우선순위를 둡니다. 가장 일반적인 작업부터 시작하여 구현할 엔드포인트를 나열합니다.

---

### 2단계: 구현

#### 2.1 프로젝트 구조 설정

프로젝트 설정에 대한 언어별 가이드를 참조하세요.

- [⚡ TypeScript
  Guide](team_share_ko__skills__examples__mcp-builder__reference__node_mcp_server.md) - ​​프로젝트
  구조, package.json, tsconfig.json

- [🐍 Python
  Guide](team_share_ko__skills__examples__mcp-builder__reference__python_mcp_server.md) - ​​모듈
  구성, ​​종속성

#### 2.2 핵심 인프라 구현

공유 유틸리티 만들기:

- 인증이 가능한 API 클라이언트
- 오류 처리 도우미
- 응답 형식(JSON/Markdown)
- 페이지 매김 지원

#### 2.3 도구 구현

각 도구에 대해 다음을 수행합니다.

**입력 스키마:**

- Zod(TypeScript) 또는 Pydantic(Python)을 사용하세요.
- 제약 조건과 명확한 설명을 포함합니다.
- 필드 설명에 예시 추가

**출력 스키마:**

- 구조화된 데이터의 경우 가능한 경우 `outputSchema`을 정의합니다.
- 도구 응답에 `structuredContent` 사용(TypeScript SDK 기능)
- 고객이 도구 출력을 이해하고 처리하도록 돕습니다.

**도구 설명:**

- 기능에 대한 간결한 요약
- 매개변수 설명
- 반환 유형 스키마

**구현:**

- I/O 작업 비동기/대기
- 조치 가능한 메시지를 통한 적절한 오류 처리
- 해당되는 경우 페이지 매김 지원
- 최신 SDK를 사용할 때 텍스트 콘텐츠와 구조화된 데이터를 모두 반환합니다.

**주석:**

- `readOnlyHint`: 참/거짓
- `destructiveHint`: 참/거짓
- `idempotentHint`: 참/거짓
- `openWorldHint`: 참/거짓

---

### 3단계: 검토 및 테스트

#### 3.1 코드 품질

후기 상품:

- 중복코드 없음(DRY 원칙)
- 일관된 오류 처리
- 전체 유형 범위
- 명확한 도구 설명

#### 3.2 빌드 및 테스트

**타입스크립트:**

- `npm run build`을 실행하여 컴파일을 확인합니다.
- MCP Inspector로 테스트: `npx @modelcontextprotocol/inspector`

**파이썬:**

- 구문 확인: `python -m py_compile your_server.py`
- MCP Inspector로 테스트

자세한 테스트 접근 방식과 품질 체크리스트는 언어별 가이드를 참조하세요.

---

### 4단계: 평가 생성

MCP 서버를 구현한 후 포괄적인 평가를 작성하여 효율성을 테스트하십시오.

**전체 평가 지침을 보려면 [✅ Evaluation
Guide](team_share_ko__skills__examples__mcp-builder__reference__evaluation.md)을 로드하세요.**

#### 4.1 평가 목적 이해

평가를 통해 LLM이 MCP 서버를 효과적으로 사용하여 현실적이고 복잡한 질문에 답할 수 있는지 테스트합니다.

#### 4.2 10개의 평가 질문 만들기

효과적인 평가를 작성하려면 평가 가이드에 설명된 프로세스를 따르십시오.

1. **도구 검사**: 사용 가능한 도구를 나열하고 해당 기능을 이해합니다.
2. **콘텐츠 탐색**: 읽기 전용 작업을 사용하여 사용 가능한 데이터 탐색
3. **질문 생성**: 복잡하고 현실적인 질문 10개 만들기
4. **답변 확인**: 각 질문을 직접 풀어 답변을 확인하세요.

#### 4.3 평가 요구 사항

각 질문이 다음과 같은지 확인하세요.

- **독립적**: 다른 질문에 종속되지 않음
- **읽기 전용**: 비파괴 작업만 필요
- **복잡함**: 여러 도구 호출 및 심층 탐색 필요
- **현실적**: 인간이 관심을 가질 만한 실제 사용 사례를 기반으로 함
- **검증 가능**: 문자열 비교를 통해 검증할 수 있는 단일하고 명확한 답변
- **안정적**: 시간이 지나도 답변이 변경되지 않습니다.

#### 4.4 출력 형식

다음 구조로 XML 파일을 만듭니다.

```xml
<evaluation>
  <qa_pair>
    <question>Find discussions about AI model launches with animal codenames. One model needed a specific safety designation that uses the format ASL-X. What number X was being determined for the model named after a spotted wild cat?</question>
    <answer>3</answer>
  </qa_pair>
<!-- More qa_pairs... -->
</evaluation>
```

---

## 참조 파일

## 📚 문서 라이브러리

개발 중에 필요에 따라 다음 리소스를 로드합니다.

### 핵심 MCP 문서(먼저 로드)
- **MCP 프로토콜**: `https://modelcontextprotocol.io/sitemap.xml`의 사이트맵으로 시작한 다음 `.md` 접미사가 있는 특정
  페이지를 가져옵니다.

- [📋 MCP Best
  Practices](team_share_ko__skills__examples__mcp-builder__reference__mcp_best_practices.md) -
  ​​다음을 포함한 범용 MCP 지침:

- 서버 및 도구 명명 규칙
- 응답 형식 지침(JSON vs Markdown)
- 페이지 매김 모범 사례
- 전송 선택(스트리밍 가능한 HTTP 대 stdio)
- 보안 및 오류 처리 표준

### SDK 설명서(1/2단계 중 로드)
- **Python SDK**:
  `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`에서 가져오기

- **TypeScript SDK**:
  `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md`에서 가져오기

### 언어별 구현 가이드(2단계 중 로드)
- [🐍 Python Implementation
  Guide](team_share_ko__skills__examples__mcp-builder__reference__python_mcp_server.md) - ​​다음을
  포함하는 완전한 Python/FastMCP 가이드:

- 서버 초기화 패턴
- Pydantic 모델 예
- `@mcp.tool`으로 도구 등록
- 완전한 작업 예제
- 품질 체크리스트

- [⚡ TypeScript Implementation
  Guide](team_share_ko__skills__examples__mcp-builder__reference__node_mcp_server.md) - ​​다음을
  포함하는 완전한 TypeScript 가이드:

- 프로젝트 구조
- Zod 스키마 패턴
- `server.registerTool`으로 도구 등록
- 완전한 작업 예제
- 품질 체크리스트

### 평가 가이드(4단계 중 로드)
- [✅ Evaluation Guide](team_share_ko__skills__examples__mcp-builder__reference__evaluation.md) -
  ​​다음을 포함하는 완전한 평가 생성 가이드:

- 질문 작성 지침
- 답변 검증 전략
- XML ​​형식 사양
- 예시 질문과 답변
- 제공된 스크립트를 사용하여 평가 실행
