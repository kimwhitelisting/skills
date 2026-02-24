# Python MCP 서버 구현 가이드

## 개요

이 문서에서는 MCP Python SDK를 사용하여 MCP 서버를 구현하기 위한 Python 관련 모범 사례와 예제를 제공합니다. 서버 설정, 도구 등록 패턴, Pydantic을 통한 입력 검증, 오류 처리 및 전체 작업 예제를 다룹니다.

---

## 빠른 참조

### 주요 수입품
```python
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum
import httpx
```

### 서버 초기화
```python
mcp = FastMCP("service_mcp")
```

### 도구 등록 패턴
```python
@mcp.tool(name="tool_name", annotations={...})
async def tool_function(params: InputModel) -> str:
    # Implementation
    pass
```

---

## MCP Python SDK 및 FastMCP

공식 MCP Python SDK는 MCP 서버 구축을 위한 고급 프레임워크인 FastMCP를 제공합니다. 다음을 제공합니다:
- 함수 서명 및 독스트링으로부터 자동 설명 및 inputSchema 생성
- 입력 검증을 위한 Pydantic 모델 통합
- `@mcp.tool`으로 데코레이터 기반 도구 등록

**전체 SDK 문서를 보려면 WebFetch를 사용하여 다음을 로드하세요.**
`https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`

## 서버 명명 규칙

Python MCP 서버는 다음 이름 지정 패턴을 따라야 합니다.
- **형식**: `{service}_mcp`(밑줄이 있는 소문자)
- **예**: `github_mcp`, `jira_mcp`, `stripe_mcp`

이름은 다음과 같아야 합니다.
- 일반(특정 기능과 관련 없음)
- 통합되는 서비스/API에 대한 설명
- 업무 설명을 통해 쉽게 추론 가능
- 버전 번호나 날짜가 없습니다.

## 도구 구현

### 도구 이름 지정

명확하고 작업 지향적인 이름으로 도구 이름(예: "search_users", "create_project", "get_channel_info")에 snake_case를 사용합니다.

**명칭 충돌 방지**: 중복을 방지하기 위해 서비스 컨텍스트를 포함합니다.
- "send_message" 대신 "slack_send_message"를 사용하세요.
- "create_issue" 대신 "github_create_issue"를 사용하세요.
- 그냥 "list_tasks" 대신 "asana_list_tasks"를 사용하세요.

### FastMCP를 사용한 도구 구조

도구는 입력 검증을 위해 Pydantic 모델과 함께 `@mcp.tool` 데코레이터를 사용하여 정의됩니다.

```python
from pydantic import BaseModel, Field, ConfigDict
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("example_mcp")

# Define Pydantic model for input validation
class ServiceToolInput(BaseModel):
    '''Input model for service tool operation.'''
    model_config = ConfigDict(
        str_strip_whitespace=True,  # Auto-strip whitespace from strings
        validate_assignment=True,    # Validate on assignment
        extra='forbid'              # Forbid extra fields
    )

    param1: str = Field(..., description="First parameter description (e.g., 'user123', 'project-abc')", min_length=1, max_length=100)
    param2: Optional[int] = Field(default=None, description="Optional integer parameter with constraints", ge=0, le=1000)
    tags: Optional[List[str]] = Field(default_factory=list, description="List of tags to apply", max_items=10)

@mcp.tool(
    name="service_tool_name",
    annotations={
        "title": "Human-Readable Tool Title",
        "readOnlyHint": True,     # Tool does not modify environment
        "destructiveHint": False,  # Tool does not perform destructive operations
        "idempotentHint": True,    # Repeated calls have no additional effect
        "openWorldHint": False     # Tool does not interact with external entities
    }
)
async def service_tool_name(params: ServiceToolInput) -> str:
    '''Tool description automatically becomes the 'description' field.

    This tool performs a specific operation on the service. It validates all inputs
    using the ServiceToolInput Pydantic model before processing.

    Args:
        params (ServiceToolInput): Validated input parameters containing:
            - param1 (str): First parameter description
            - param2 (Optional[int]): Optional parameter with default
            - tags (Optional[List[str]]): List of tags

    Returns:
        str: JSON-formatted response containing operation results
    '''
    # Implementation here
    pass
```

## Pydantic v2 주요 기능

- 중첩된 `Config` 클래스 대신 `model_config` 사용
- 더 이상 사용되지 않는 `validator` 대신 `field_validator`을 사용하세요.
- 더 이상 사용되지 않는 `dict()` 대신 `model_dump()`을 사용하세요.
- 유효성 검사기에는 `@classmethod` 데코레이터가 필요합니다.
- 유효성 검사기 메서드에는 유형 힌트가 필요합니다.

```python
from pydantic import BaseModel, Field, field_validator, ConfigDict

class CreateUserInput(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True
    )

    name: str = Field(..., description="User's full name", min_length=1, max_length=100)
    email: str = Field(..., description="User's email address", pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    age: int = Field(..., description="User's age", ge=0, le=150)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Email cannot be empty")
        return v.lower()
```

## 응답 형식 옵션

유연성을 위해 다양한 출력 형식을 지원합니다.

```python
from enum import Enum

class ResponseFormat(str, Enum):
    '''Output format for tool responses.'''
    MARKDOWN = "markdown"
    JSON = "json"

class UserSearchInput(BaseModel):
    query: str = Field(..., description="Search query")
    response_format: ResponseFormat = Field(
        default=ResponseFormat.MARKDOWN,
        description="Output format: 'markdown' for human-readable or 'json' for machine-readable"
    )
```

**마크다운 형식**:
- 명확성을 위해 헤더, 목록, 서식을 사용하세요.
- 타임스탬프를 사람이 읽을 수 있는 형식으로 변환합니다(예: 에포크 대신 '2024-01-15 10:30:00 UTC').
- 괄호 안에 ID가 포함된 표시 이름 표시(예: "@john.doe (U123456)")
- 자세한 메타데이터 생략(예: 모든 크기가 아닌 하나의 프로필 이미지 URL만 표시)
- 관련 정보를 논리적으로 그룹화

**JSON 형식**:
- 프로그래밍 방식 처리에 적합한 완전하고 구조화된 데이터를 반환합니다.
- 사용 가능한 모든 필드와 메타데이터를 포함합니다.
- 일관된 필드 이름과 유형을 사용하세요.

## 페이지 매김 구현

리소스를 나열하는 도구의 경우:

```python
class ListInput(BaseModel):
    limit: Optional[int] = Field(default=20, description="Maximum results to return", ge=1, le=100)
    offset: Optional[int] = Field(default=0, description="Number of results to skip for pagination", ge=0)

async def list_items(params: ListInput) -> str:
    # Make API request with pagination
    data = await api_request(limit=params.limit, offset=params.offset)

    # Return pagination info
    response = {
        "total": data["total"],
        "count": len(data["items"]),
        "offset": params.offset,
        "items": data["items"],
        "has_more": data["total"] > params.offset + len(data["items"]),
        "next_offset": params.offset + len(data["items"]) if data["total"] > params.offset + len(data["items"]) else None
    }
    return json.dumps(response, indent=2)
```

## 오류 처리

명확하고 실행 가능한 오류 메시지를 제공하십시오.

```python
def _handle_api_error(e: Exception) -> str:
    '''Consistent error formatting across all tools.'''
    if isinstance(e, httpx.HTTPStatusError):
        if e.response.status_code == 404:
            return "Error: Resource not found. Please check the ID is correct."
        elif e.response.status_code == 403:
            return "Error: Permission denied. You don't have access to this resource."
        elif e.response.status_code == 429:
            return "Error: Rate limit exceeded. Please wait before making more requests."
        return f"Error: API request failed with status {e.response.status_code}"
    elif isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out. Please try again."
    return f"Error: Unexpected error occurred: {type(e).__name__}"
```

## 공유 유틸리티

공통 기능을 재사용 가능한 기능으로 추출합니다.

```python
# Shared API request function
async def _make_api_request(endpoint: str, method: str = "GET", **kwargs) -> dict:
    '''Reusable function for all API calls.'''
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method,
            f"{API_BASE_URL}/{endpoint}",
            timeout=30.0,
            **kwargs
        )
        response.raise_for_status()
        return response.json()
```

## 비동기/대기 모범 사례

네트워크 요청 및 I/O 작업에는 항상 async/await를 사용하세요.

```python
# Good: Async network request
async def fetch_data(resource_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/resource/{resource_id}")
        response.raise_for_status()
        return response.json()

# Bad: Synchronous request
def fetch_data(resource_id: str) -> dict:
    response = requests.get(f"{API_URL}/resource/{resource_id}")  # Blocks
    return response.json()
```

## 유형 힌트

전체적으로 유형 힌트를 사용하십시오.

```python
from typing import Optional, List, Dict, Any

async def get_user(user_id: str) -> Dict[str, Any]:
    data = await fetch_user(user_id)
    return {"id": data["id"], "name": data["name"]}
```

## 도구 독스트링

모든 도구에는 명시적인 유형 정보가 포함된 포괄적인 독스트링이 있어야 합니다.

```python
async def search_users(params: UserSearchInput) -> str:
    '''
    Search for users in the Example system by name, email, or team.

    This tool searches across all user profiles in the Example platform,
    supporting partial matches and various search filters. It does NOT
    create or modify users, only searches existing ones.

    Args:
        params (UserSearchInput): Validated input parameters containing:
            - query (str): Search string to match against names/emails (e.g., "john", "@example.com", "team:marketing")
            - limit (Optional[int]): Maximum results to return, between 1-100 (default: 20)
            - offset (Optional[int]): Number of results to skip for pagination (default: 0)

    Returns:
        str: JSON-formatted string containing search results with the following schema:

        Success response:
        {
            "total": int,           # Total number of matches found
            "count": int,           # Number of results in this response
            "offset": int,          # Current pagination offset
            "users": [
                {
                    "id": str,      # User ID (e.g., "U123456789")
                    "name": str,    # Full name (e.g., "John Doe")
                    "email": str,   # Email address (e.g., "john@example.com")
                    "team": str     # Team name (e.g., "Marketing") - optional
                }
            ]
        }

        Error response:
        "Error: <error message>" or "No users found matching '<query>'"

    Examples:
        - Use when: "Find all marketing team members" -> params with query="team:marketing"
        - Use when: "Search for John's account" -> params with query="john"
        - Don't use when: You need to create a user (use example_create_user instead)
        - Don't use when: You have a user ID and need full details (use example_get_user instead)

    Error Handling:
        - Input validation errors are handled by Pydantic model
        - Returns "Error: Rate limit exceeded" if too many requests (429 status)
        - Returns "Error: Invalid API authentication" if API key is invalid (401 status)
        - Returns formatted list of results or "No users found matching 'query'"
    '''
```

## 완전한 예

전체 Python MCP 서버 예제는 아래를 참조하세요.

```python
#!/usr/bin/env python3
'''
MCP Server for Example Service.

This server provides tools to interact with Example API, including user search,
project management, and data export capabilities.
'''

from typing import Optional, List, Dict, Any
from enum import Enum
import httpx
from pydantic import BaseModel, Field, field_validator, ConfigDict
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("example_mcp")

# Constants
API_BASE_URL = "https://api.example.com/v1"

# Enums
class ResponseFormat(str, Enum):
    '''Output format for tool responses.'''
    MARKDOWN = "markdown"
    JSON = "json"

# Pydantic Models for Input Validation
class UserSearchInput(BaseModel):
    '''Input model for user search operations.'''
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True
    )

    query: str = Field(..., description="Search string to match against names/emails", min_length=2, max_length=200)
    limit: Optional[int] = Field(default=20, description="Maximum results to return", ge=1, le=100)
    offset: Optional[int] = Field(default=0, description="Number of results to skip for pagination", ge=0)
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN, description="Output format")

    @field_validator('query')
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Query cannot be empty or whitespace only")
        return v.strip()

# Shared utility functions
async def _make_api_request(endpoint: str, method: str = "GET", **kwargs) -> dict:
    '''Reusable function for all API calls.'''
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method,
            f"{API_BASE_URL}/{endpoint}",
            timeout=30.0,
            **kwargs
        )
        response.raise_for_status()
        return response.json()

def _handle_api_error(e: Exception) -> str:
    '''Consistent error formatting across all tools.'''
    if isinstance(e, httpx.HTTPStatusError):
        if e.response.status_code == 404:
            return "Error: Resource not found. Please check the ID is correct."
        elif e.response.status_code == 403:
            return "Error: Permission denied. You don't have access to this resource."
        elif e.response.status_code == 429:
            return "Error: Rate limit exceeded. Please wait before making more requests."
        return f"Error: API request failed with status {e.response.status_code}"
    elif isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out. Please try again."
    return f"Error: Unexpected error occurred: {type(e).__name__}"

# Tool definitions
@mcp.tool(
    name="example_search_users",
    annotations={
        "title": "Search Example Users",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True
    }
)
async def example_search_users(params: UserSearchInput) -> str:
    '''Search for users in the Example system by name, email, or team.

    [Full docstring as shown above]
    '''
    try:
        # Make API request using validated parameters
        data = await _make_api_request(
            "users/search",
            params={
                "q": params.query,
                "limit": params.limit,
                "offset": params.offset
            }
        )

        users = data.get("users", [])
        total = data.get("total", 0)

        if not users:
            return f"No users found matching '{params.query}'"

        # Format response based on requested format
        if params.response_format == ResponseFormat.MARKDOWN:
            lines = [f"# User Search Results: '{params.query}'", ""]
            lines.append(f"Found {total} users (showing {len(users)})")
            lines.append("")

            for user in users:
                lines.append(f"## {user['name']} ({user['id']})")
                lines.append(f"- **Email**: {user['email']}")
                if user.get('team'):
                    lines.append(f"- **Team**: {user['team']}")
                lines.append("")

            return "\n".join(lines)

        else:
            # Machine-readable JSON format
            import json
            response = {
                "total": total,
                "count": len(users),
                "offset": params.offset,
                "users": users
            }
            return json.dumps(response, indent=2)

    except Exception as e:
        return _handle_api_error(e)

if __name__ == "__main__":
    mcp.run()
```

---

## 고급 FastMCP 기능

### 컨텍스트 매개변수 삽입

FastMCP는 로깅, 진행 상황 보고, 리소스 읽기 및 사용자 상호 작용과 같은 고급 기능을 위한 도구에 `Context` 매개 변수를 자동으로 주입할 수 있습니다.

```python
from mcp.server.fastmcp import FastMCP, Context

mcp = FastMCP("example_mcp")

@mcp.tool()
async def advanced_search(query: str, ctx: Context) -> str:
    '''Advanced tool with context access for logging and progress.'''

    # Report progress for long operations
    await ctx.report_progress(0.25, "Starting search...")

    # Log information for debugging
    await ctx.log_info("Processing query", {"query": query, "timestamp": datetime.now()})

    # Perform search
    results = await search_api(query)
    await ctx.report_progress(0.75, "Formatting results...")

    # Access server configuration
    server_name = ctx.fastmcp.name

    return format_results(results)

@mcp.tool()
async def interactive_tool(resource_id: str, ctx: Context) -> str:
    '''Tool that can request additional input from users.'''

    # Request sensitive information when needed
    api_key = await ctx.elicit(
        prompt="Please provide your API key:",
        input_type="password"
    )

    # Use the provided key
    return await api_call(resource_id, api_key)
```

**컨텍스트 기능:**
- `ctx.report_progress(progress, message)` - ​​장기 작업에 대한 진행 상황을 보고합니다.
- `ctx.log_info(message, data)` / `ctx.log_error()` / `ctx.log_debug()` - 로깅
- `ctx.elicit(prompt, input_type)` - ​​사용자의 입력을 요청합니다.
- `ctx.fastmcp.name` - ​​접속 서버 구성
- `ctx.read_resource(uri)` - ​​MCP 리소스 읽기

### 리소스 등록

효율적인 템플릿 기반 액세스를 위해 데이터를 리소스로 노출합니다.

```python
@mcp.resource("file://documents/{name}")
async def get_document(name: str) -> str:
    '''Expose documents as MCP resources.

    Resources are useful for static or semi-static data that doesn't
    require complex parameters. They use URI templates for flexible access.
    '''
    document_path = f"./docs/{name}"
    with open(document_path, "r") as f:
        return f.read()

@mcp.resource("config://settings/{key}")
async def get_setting(key: str, ctx: Context) -> str:
    '''Expose configuration as resources with context.'''
    settings = await load_settings()
    return json.dumps(settings.get(key, {}))
```

**리소스와 도구를 사용하는 경우:**
- **리소스**: 간단한 매개변수를 사용한 데이터 액세스용(URI 템플릿)
- **도구**: 검증 및 비즈니스 로직이 포함된 복잡한 작업용

### 구조화된 출력 유형

FastMCP는 문자열 이외의 여러 반환 유형을 지원합니다.

```python
from typing import TypedDict
from dataclasses import dataclass
from pydantic import BaseModel

# TypedDict for structured returns
class UserData(TypedDict):
    id: str
    name: str
    email: str

@mcp.tool()
async def get_user_typed(user_id: str) -> UserData:
    '''Returns structured data - FastMCP handles serialization.'''
    return {"id": user_id, "name": "John Doe", "email": "john@example.com"}

# Pydantic models for complex validation
class DetailedUser(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    metadata: Dict[str, Any]

@mcp.tool()
async def get_user_detailed(user_id: str) -> DetailedUser:
    '''Returns Pydantic model - automatically generates schema.'''
    user = await fetch_user(user_id)
    return DetailedUser(**user)
```

### 수명관리

요청 전반에 걸쳐 지속되는 리소스를 초기화합니다.

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def app_lifespan():
    '''Manage resources that live for the server's lifetime.'''
    # Initialize connections, load config, etc.
    db = await connect_to_database()
    config = load_configuration()

    # Make available to all tools
    yield {"db": db, "config": config}

    # Cleanup on shutdown
    await db.close()

mcp = FastMCP("example_mcp", lifespan=app_lifespan)

@mcp.tool()
async def query_data(query: str, ctx: Context) -> str:
    '''Access lifespan resources through context.'''
    db = ctx.request_context.lifespan_state["db"]
    results = await db.query(query)
    return format_results(results)
```

### 운송 옵션

FastMCP는 두 가지 주요 전송 메커니즘을 지원합니다.

```python
# stdio transport (for local tools) - default
if __name__ == "__main__":
    mcp.run()

# Streamable HTTP transport (for remote servers)
if __name__ == "__main__":
    mcp.run(transport="streamable_http", port=8000)
```

**교통수단 선택:**
- **stdio**: 명령줄 도구, 로컬 통합, 하위 프로세스 실행
- **스트리밍 가능한 HTTP**: 웹 서비스, 원격 액세스, 다중 클라이언트

---

## 코드 모범 사례

### 코드 구성성 및 재사용성

구현에서는 구성 가능성과 코드 재사용을 우선시해야 합니다.

1. **공통 기능 추출**:
- 여러 도구에서 사용되는 작업을 위한 재사용 가능한 도우미 기능 만들기
- 코드를 복제하는 대신 HTTP 요청을 위한 공유 API 클라이언트 구축
- 유틸리티 기능의 오류 처리 논리를 중앙 집중화합니다.
- 비즈니스 로직을 구성 가능한 전용 기능으로 추출
- 공유 마크다운 또는 JSON 필드 선택 및 서식 기능 추출

2. **중복 방지**:
- 도구 간에 유사한 코드를 복사하여 붙여넣지 마십시오.
- 비슷한 논리를 두 번 작성하는 경우 함수로 추출하세요.
- 페이지 매김, 필터링, 필드 선택, 서식 지정과 같은 일반적인 작업을 공유해야 합니다.
- 인증/권한 부여 로직이 중앙 집중화되어야 함

### Python 관련 모범 사례

1. **유형 힌트 사용**: 함수 매개변수 및 반환 값에 대한 유형 주석을 항상 포함합니다.
2. **Pydantic 모델**: 모든 입력 검증을 위해 명확한 Pydantic 모델을 정의합니다.
3. **수동 검증 방지**: Pydantic이 제약 조건을 사용하여 입력 검증을 처리하도록 합니다.
4. **적절한 가져오기**: 그룹 가져오기(표준 라이브러리, 타사, 로컬)
5. **오류 처리**: 특정 예외 유형 사용(일반 예외가 아닌 httpx.HTTPStatusError)
6. **비동기 컨텍스트 관리자**: 정리가 필요한 리소스에는 `async with`을 사용하세요.
7. **상수**: UPPER_CASE로 모듈 수준 상수를 정의합니다.

## 품질 체크리스트

Python MCP 서버 구현을 마무리하기 전에 다음을 확인하세요.

### 전략적 디자인
- [ ] 도구는 API 엔드포인트 래퍼뿐만 아니라 완전한 워크플로를 지원합니다.
- [ ] 도구 이름은 자연스러운 작업 세분화를 반영합니다.
- [ ] 에이전트 컨텍스트 효율성을 위해 최적화된 응답 형식
- [ ] 적절한 경우 사람이 읽을 수 있는 식별자 사용
- [ ] 오류 메시지는 상담원이 올바른 사용법을 안내합니다.

### 구현 품질
- [ ] 집중 구현: 가장 중요하고 가치 있는 도구 구현
- [ ] 모든 도구에는 설명이 포함된 이름과 문서가 있습니다.
- [ ] 유사한 작업 전반에 걸쳐 반환 유형이 일관됩니다.
- [ ] 모든 외부 호출에 대해 오류 처리가 구현되었습니다.
- [ ] 서버 이름은 `{service}_mcp` 형식을 따릅니다.
- [ ] 모든 네트워크 작업에서는 async/await를 사용합니다.
- [ ] 공통 기능을 재사용 가능한 기능으로 추출
- [ ] 오류 메시지는 명확하고 실행 가능하며 교육적입니다.
- [ ] 출력이 올바르게 검증되고 형식이 지정되었습니다.

### 도구 구성
- [ ] 모든 도구는 데코레이터에서 '이름'과 '주석'을 구현합니다.
- [ ] 주석이 올바르게 설정되었습니다(readOnlyHint, destructiveHint, idempotentHint, openWorldHint).
- [ ] 모든 도구는 Field() 정의를 통한 입력 검증을 위해 Pydantic BaseModel을 사용합니다.
- [ ] 모든 Pydantic 필드에는 제약 조건이 있는 명시적인 유형과 설명이 있습니다.
- [ ] 모든 도구에는 명시적인 입력/출력 유형이 포함된 포괄적인 독스트링이 있습니다.
- [ ] Docstring에는 dict/JSON 반환을 위한 완전한 스키마 구조가 포함됩니다.
- [ ] Pydantic 모델은 입력 검증을 처리합니다(수동 검증이 필요하지 않음).

### 고급 기능(해당되는 경우)
- [ ] 로깅, 진행 또는 추출에 사용되는 컨텍스트 주입
- [ ] 적절한 데이터 엔드포인트에 등록된 리소스
- [ ] 지속적인 연결을 위해 구현된 수명 관리
- [ ] 구조화된 출력 유형 사용(TypedDict, Pydantic 모델)
- [ ] 적절한 전송 구성(stdio 또는 스트리밍 가능한 HTTP)

### 코드 품질
- [ ] 파일에는 Pydantic 가져오기를 포함한 적절한 가져오기가 포함되어 있습니다.
- [ ] 해당하는 경우 페이지 매김이 올바르게 구현되었습니다.
- [ ] 잠재적으로 큰 결과 세트에 대해 필터링 옵션이 제공됩니다.
- [ ] 모든 비동기 기능이 `async def`으로 올바르게 정의되었습니다.
- [ ] HTTP 클라이언트 사용은 적절한 컨텍스트 관리자를 사용하여 비동기 패턴을 따릅니다.
- [ ] 코드 전반에 걸쳐 유형 힌트가 사용됩니다.
- [ ] 상수는 모듈 수준에서 UPPER_CASE로 정의됩니다.

### 테스트
- [ ] 서버가 성공적으로 실행되었습니다: `python your_server.py --help`
- [ ] 모든 가져오기가 올바르게 해결됩니다.
- [ ] 샘플 도구 호출이 예상대로 작동합니다.
- [ ] 오류 시나리오가 정상적으로 처리됨