# "service-mcp-server",

## 문서 정보

- **이름**: `"service-mcp-server",`
- **설명**: "What the tool does",
- **라이선스**: -


## 빠른 안내

- **문서 요약**: 이 문서에서는 MCP TypeScript SDK를 사용하여 MCP 서버를 구현하기 위한 Node/TypeScript 관련 모범 사례와 예제를
             제공합니다. 프로젝트 구조, 서버 설정, 도구 등록 패턴, Zod를 통한 입력 검증, 오류 처리 및 전체 작업 예제를 다룹니다.
- **핵심 섹션**: 개요, MCP 타입스크립트 SDK, 서버 명명 규칙, 프로젝트 구조, 도구 구현, 입력 검증을 위한 Zod 스키마

### 권장 읽기 순서
1. 개요
2. MCP 타입스크립트 SDK
3. 서버 명명 규칙
4. 프로젝트 구조
5. 도구 구현


## 개요

이 문서에서는 MCP TypeScript SDK를 사용하여 MCP 서버를 구현하기 위한 Node/TypeScript 관련 모범 사례와 예제를 제공합니다. 프로젝트 구조, 서버
설정, 도구 등록 패턴, Zod를 통한 입력 검증, 오류 처리 및 전체 작업 예제를 다룹니다.


## MCP 타입스크립트 SDK

공식 MCP TypeScript SDK는 다음을 제공합니다.

- 서버 초기화를 위한 `McpServer` 클래스
- 도구 등록을 위한 `registerTool` 방법
- 런타임 입력 검증을 위한 Zod 스키마 통합
- 유형이 안전한 도구 핸들러 구현

**중요 - 최신 API만 사용하세요:**

- **사용하세요**: `server.registerTool()`, `server.registerResource()`, `server.registerPrompt()`
- **사용하지 마세요**: `server.tool()`, `server.setRequestHandler(ListToolsRequestSchema, ...)` 또는 수동
  핸들러 등록과 같이 더 이상 사용되지 않는 오래된 API

- `register*` 메서드는 더 나은 유형 안전성과 자동 스키마 처리를 제공하며 권장되는 접근 방식입니다.

자세한 내용은 참조의 MCP SDK 설명서를 참조하세요.

## 서버 명명 규칙

Node/TypeScript MCP 서버는 다음 이름 지정 패턴을 따라야 합니다.

- **형식**: `{service}-mcp-server`(하이픈 포함 소문자)
- **예**: `github-mcp-server`, `jira-mcp-server`, `stripe-mcp-server`

이름은 다음과 같아야 합니다.

- 일반(특정 기능과 관련 없음)
- 통합되는 서비스/API에 대한 설명
- 업무 설명을 통해 쉽게 추론 가능
- 버전 번호나 날짜가 없습니다.

## 프로젝트 구조

Node/TypeScript MCP 서버에 대해 다음 구조를 만듭니다.

```
{service}-mcp-server/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts          # Main entry point with McpServer initialization
│   ├── types.ts          # TypeScript type definitions and interfaces
│   ├── tools/            # Tool implementations (one file per domain)
│   ├── services/         # API clients and shared utilities
│   ├── schemas/          # Zod validation schemas
│   └── constants.ts      # Shared constants (API_URL, CHARACTER_LIMIT, etc.)
└── dist/                 # Built JavaScript files (entry point: dist/index.js)
```

## 도구 구현

### 도구 이름 지정

명확하고 작업 지향적인 이름으로 도구 이름(예: "search_users", "create_project", "get_channel_info")에 snake_case를
사용합니다.

**명칭 충돌 방지**: 중복을 방지하기 위해 서비스 컨텍스트를 포함합니다.

- "send_message" 대신 "slack_send_message"를 사용하세요.
- "create_issue" 대신 "github_create_issue"를 사용하세요.
- 그냥 "list_tasks" 대신 "asana_list_tasks"를 사용하세요.

### 도구 구조

도구는 다음 요구 사항에 따라 `registerTool` 메서드를 사용하여 등록됩니다.

- 런타임 입력 검증 및 유형 안전성을 위해 Zod 스키마 사용
- `description` 필드는 명시적으로 제공되어야 합니다. - JSDoc 주석은 자동으로 추출되지 않습니다.
- `title`, `description`, `inputSchema`, `annotations`을 명시적으로 제공합니다.
- `inputSchema`은 Zod 스키마 개체(JSON 스키마 아님)여야 합니다.
- 모든 매개변수와 반환값을 명시적으로 입력하세요.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "example-mcp",
  version: "1.0.0"
});

// Zod schema for input validation
const UserSearchInputSchema = z.object({
  query: z.string()
    .min(2, "Query must be at least 2 characters")
    .max(200, "Query must not exceed 200 characters")
    .describe("Search string to match against names/emails"),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

// Type definition from Zod schema
type UserSearchInput = z.infer<typeof UserSearchInputSchema>;

server.registerTool(
  "example_search_users",
  {
    title: "Search Example Users",
    description: `Search for users in the Example system by name, email, or team.

This tool searches across all user profiles in the Example platform, supporting partial matches and various search filters. It does NOT create or modify users, only searches existing ones.

Args:
  - query (string): Search string to match against names/emails
  - limit (number): Maximum results to return, between 1-100 (default: 20)
  - offset (number): Number of results to skip for pagination (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format: Structured data with schema:
  {
    "total": number,           // Total number of matches found
    "count": number,           // Number of results in this response
    "offset": number,          // Current pagination offset
    "users": [
      {
        "id": string,          // User ID (e.g., "U123456789")
        "name": string,        // Full name (e.g., "John Doe")
        "email": string,       // Email address
        "team": string,        // Team name (optional)
        "active": boolean      // Whether user is active
      }
    ],
    "has_more": boolean,       // Whether more results are available
    "next_offset": number      // Offset for next page (if has_more is true)
  }

Examples:
  - Use when: "Find all marketing team members" -> params with query="team:marketing"
  - Use when: "Search for John's account" -> params with query="john"
  - Don't use when: You need to create a user (use example_create_user instead)

Error Handling:
  - Returns "Error: Rate limit exceeded" if too many requests (429 status)
  - Returns "No users found matching '<query>'" if search returns empty`,
    inputSchema: UserSearchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: UserSearchInput) => {
    try {
      // Input validation is handled by Zod schema
      // Make API request using validated parameters
      const data = await makeApiRequest<any>(
        "users/search",
        "GET",
        undefined,
        {
          q: params.query,
          limit: params.limit,
          offset: params.offset
        }
      );

      const users = data.users || [];
      const total = data.total || 0;

      if (!users.length) {
        return {
          content: [{
            type: "text",
            text: `No users found matching '${params.query}'`
          }]
        };
      }

      // Prepare structured output
      const output = {
        total,
        count: users.length,
        offset: params.offset,
        users: users.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          ...(user.team ? { team: user.team } : {}),
          active: user.active ?? true
        })),
        has_more: total > params.offset + users.length,
        ...(total > params.offset + users.length ? {
          next_offset: params.offset + users.length
        } : {})
      };

      // Format text representation based on requested format
      let textContent: string;
      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines = [`# User Search Results: '${params.query}'`, "",
          `Found ${total} users (showing ${users.length})`, ""];
        for (const user of users) {
          lines.push(`## ${user.name} (${user.id})`);
          lines.push(`- **Email**: ${user.email}`);
          if (user.team) lines.push(`- **Team**: ${user.team}`);
          lines.push("");
        }
        textContent = lines.join("\n");
      } else {
        textContent = JSON.stringify(output, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: output // Modern pattern for structured data
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: handleApiError(error)
        }]
      };
    }
  }
);
```

## 입력 검증을 위한 Zod 스키마

Zod는 런타임 유형 유효성 검사를 제공합니다.

```typescript
import { z } from "zod";

// Basic schema with validation
const CreateUserSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters"),
  email: z.string()
    .email("Invalid email format"),
  age: z.number()
    .int("Age must be a whole number")
    .min(0, "Age cannot be negative")
    .max(150, "Age cannot be greater than 150")
}).strict();  // Use .strict() to forbid extra fields

// Enums
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

const SearchSchema = z.object({
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format")
});

// Optional fields with defaults
const PaginationSchema = z.object({
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip")
});
```

## 응답 형식 옵션

유연성을 위해 다양한 출력 형식을 지원합니다.

```typescript
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

const inputSchema = z.object({
  query: z.string(),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
});
```

**마크다운 형식**:

- 명확성을 위해 헤더, 목록, 서식을 사용하세요.
- 타임스탬프를 사람이 읽을 수 있는 형식으로 변환
- 괄호 안에 ID가 포함된 표시 이름 표시
- 장황한 메타데이터 생략
- 관련 정보를 논리적으로 그룹화

**JSON 형식**:

- 프로그래밍 방식 처리에 적합한 완전하고 구조화된 데이터를 반환합니다.
- 사용 가능한 모든 필드와 메타데이터를 포함합니다.
- 일관된 필드 이름과 유형을 사용하세요.

## 페이지 매김 구현

리소스를 나열하는 도구의 경우:

```typescript
const ListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

async function listItems(params: z.infer<typeof ListSchema>) {
  const data = await apiRequest(params.limit, params.offset);

  const response = {
    total: data.total,
    count: data.items.length,
    offset: params.offset,
    items: data.items,
    has_more: data.total > params.offset + data.items.length,
    next_offset: data.total > params.offset + data.items.length
      ? params.offset + data.items.length
      : undefined
  };

  return JSON.stringify(response, null, 2);
}
```

## 문자 제한 및 잘림

압도적인 응답을 방지하려면 CHARACTER_LIMIT 상수를 추가하세요.

```typescript
// At module level in constants.ts
export const CHARACTER_LIMIT = 25000;  // Maximum response size in characters

async function searchTool(params: SearchInput) {
  let result = generateResponse(data);

  // Check character limit and truncate if needed
  if (result.length > CHARACTER_LIMIT) {
    const truncatedData = data.slice(0, Math.max(1, data.length / 2));
    response.data = truncatedData;
    response.truncated = true;
    response.truncation_message =
      `Response truncated from ${data.length} to ${truncatedData.length} items. ` +
      `Use 'offset' parameter or add filters to see more results.`;
    result = JSON.stringify(response, null, 2);
  }

  return result;
}
```

## 오류 처리

명확하고 실행 가능한 오류 메시지를 제공하십시오.

```typescript
import axios, { AxiosError } from "axios";

function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          return "Error: Resource not found. Please check the ID is correct.";
        case 403:
          return "Error: Permission denied. You don't have access to this resource.";
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        default:
          return `Error: API request failed with status ${error.response.status}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    }
  }
  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}
```

## 공유 유틸리티

공통 기능을 재사용 가능한 기능으로 추출합니다.

```typescript
// Shared API request function
async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}/${endpoint}`,
      data,
      params,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

## 비동기/대기 모범 사례

네트워크 요청 및 I/O 작업에는 항상 async/await를 사용하세요.

```typescript
// Good: Async network request
async function fetchData(resourceId: string): Promise<ResourceData> {
  const response = await axios.get(`${API_URL}/resource/${resourceId}`);
  return response.data;
}

// Bad: Promise chains
function fetchData(resourceId: string): Promise<ResourceData> {
  return axios.get(`${API_URL}/resource/${resourceId}`)
    .then(response => response.data);  // Harder to read and maintain
}
```

## TypeScript 모범 사례

1. **Strict TypeScript 사용**: tsconfig.json에서 엄격 모드를 활성화합니다.
2. **인터페이스 정의**: 모든 데이터 구조에 대한 명확한 인터페이스 정의 생성
3. **`any` 피하기**: `any` 대신 적절한 유형 또는 `unknown`을 사용하십시오.
4. **런타임 유효성 검사를 위한 Zod**: Zod 스키마를 사용하여 외부 데이터 유효성 검사
5. **유형 가드**: 복잡한 유형 검사를 위한 유형 가드 기능 생성
6. **오류 처리**: 항상 적절한 오류 유형 검사와 함께 try-catch를 사용하세요.
7. **Null 안전성**: 선택적 연결(`?.`) 및 Nullish 병합(`??`)을 사용합니다.

```typescript
// Good: Type-safe with Zod and interfaces
interface UserResponse {
  id: string;
  name: string;
  email: string;
  team?: string;
  active: boolean;
}

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  team: z.string().optional(),
  active: z.boolean()
});

type User = z.infer<typeof UserSchema>;

async function getUser(id: string): Promise<User> {
  const data = await apiCall(`/users/${id}`);
  return UserSchema.parse(data);  // Runtime validation
}

// Bad: Using any
async function getUser(id: string): Promise<any> {
  return await apiCall(`/users/${id}`);  // No type safety
}
```

## 패키지 구성

### 패키지.json

```json
{
  "name": "{service}-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for {Service} API integration",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.6.1",
    "axios": "^1.7.9",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 완전한 예

```typescript
#!/usr/bin/env node
/**
 * MCP Server for Example Service.
 *
 * This server provides tools to interact with Example API, including user search,
 * project management, and data export capabilities.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios, { AxiosError } from "axios";

// Constants
const API_BASE_URL = "https://api.example.com/v1";
const CHARACTER_LIMIT = 25000;

// Enums
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

// Zod schemas
const UserSearchInputSchema = z.object({
  query: z.string()
    .min(2, "Query must be at least 2 characters")
    .max(200, "Query must not exceed 200 characters")
    .describe("Search string to match against names/emails"),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

type UserSearchInput = z.infer<typeof UserSearchInputSchema>;

// Shared utility functions
async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}/${endpoint}`,
      data,
      params,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          return "Error: Resource not found. Please check the ID is correct.";
        case 403:
          return "Error: Permission denied. You don't have access to this resource.";
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        default:
          return `Error: API request failed with status ${error.response.status}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    }
  }
  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}

// Create MCP server instance
const server = new McpServer({
  name: "example-mcp",
  version: "1.0.0"
});

// Register tools
server.registerTool(
  "example_search_users",
  {
    title: "Search Example Users",
    description: `[Full description as shown above]`,
    inputSchema: UserSearchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: UserSearchInput) => {
    // Implementation as shown above
  }
);

// Main function
// For stdio (local):
async function runStdio() {
  if (!process.env.EXAMPLE_API_KEY) {
    console.error("ERROR: EXAMPLE_API_KEY environment variable is required");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running via stdio");
}

// For streamable HTTP (remote):
async function runHTTP() {
  if (!process.env.EXAMPLE_API_KEY) {
    console.error("ERROR: EXAMPLE_API_KEY environment variable is required");
    process.exit(1);
  }

  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on('close', () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || '3000');
  app.listen(port, () => {
    console.error(`MCP server running on http://localhost:${port}/mcp`);
  });
}

// Choose transport based on environment
const transport = process.env.TRANSPORT || 'stdio';
if (transport === 'http') {
  runHTTP().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
```

---

## 고급 MCP 기능

### 리소스 등록

효율적인 URI 기반 액세스를 위해 데이터를 리소스로 노출합니다.

```typescript
import { ResourceTemplate } from "@modelcontextprotocol/sdk/types.js";

// Register a resource with URI template
server.registerResource(
  {
    uri: "file://documents/{name}",
    name: "Document Resource",
    description: "Access documents by name",
    mimeType: "text/plain"
  },
  async (uri: string) => {
    // Extract parameter from URI
    const match = uri.match(/^file:\/\/documents\/(.+)$/);
    if (!match) {
      throw new Error("Invalid URI format");
    }

    const documentName = match[1];
    const content = await loadDocument(documentName);

    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: content
      }]
    };
  }
);

// List available resources dynamically
server.registerResourceList(async () => {
  const documents = await getAvailableDocuments();
  return {
    resources: documents.map(doc => ({
      uri: `file://documents/${doc.name}`,
      name: doc.name,
      mimeType: "text/plain",
      description: doc.description
    }))
  };
});
```

**리소스와 도구를 사용하는 경우:**

- **리소스**: 간단한 URI 기반 매개변수를 사용한 데이터 액세스용
- **도구**: 검증 및 비즈니스 로직이 필요한 복잡한 작업용
- **리소스**: 데이터가 상대적으로 정적이거나 템플릿 기반인 경우
- **도구**: 작업에 부작용이 있거나 작업 흐름이 복잡한 경우

### 운송 옵션

TypeScript SDK는 두 가지 주요 전송 메커니즘을 지원합니다.

#### 스트리밍 가능한 HTTP(원격 서버에 권장)

```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  // Create new transport for each request (stateless, prevents request ID collisions)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on('close', () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000);
```

#### stdio(로컬 통합용)

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

**교통수단 선택:**

- **스트리밍 가능한 HTTP**: 웹 서비스, 원격 액세스, 다중 클라이언트
- **stdio**: 명령줄 도구, 로컬 개발, 하위 프로세스 통합

### 알림 지원

서버 상태가 변경되면 클라이언트에 알립니다.

```typescript
// Notify when tools list changes
server.notification({
  method: "notifications/tools/list_changed"
});

// Notify when resources change
server.notification({
  method: "notifications/resources/list_changed"
});
```

서버 기능이 실제로 변경되는 경우에만 알림을 드물게 사용하십시오.

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

## 빌드 및 실행

실행하기 전에 항상 TypeScript 코드를 빌드하세요.

```bash
## Build the project
npm run build

## Run the server
npm start

## Development with auto-reload
npm run dev
```

구현 완료를 고려하기 전에 항상 `npm run build`이 성공적으로 완료되었는지 확인하세요.

## 품질 체크리스트

Node/TypeScript MCP 서버 구현을 마무리하기 전에 다음을 확인하세요.

### 전략적 디자인
- [ ] 도구는 API 엔드포인트 래퍼뿐만 아니라 완전한 워크플로를 지원합니다.
- [ ] 도구 이름은 자연스러운 작업 세분화를 반영합니다.
- [ ] 에이전트 컨텍스트 효율성을 위해 최적화된 응답 형식
- [ ] 적절한 경우 사람이 읽을 수 있는 식별자 사용
- [ ] 오류 메시지는 상담원이 올바른 사용법을 안내합니다.

### 구현 품질
- [ ] 집중 구현: 가장 중요하고 가치 있는 도구 구현
- [ ] 완전한 구성으로 `registerTool`을 사용하여 등록된 모든 도구
- [ ] 모든 도구에는 `title`, `description`, `inputSchema` 및 `annotations`이 포함됩니다.
- [ ] 주석이 올바르게 설정되었습니다(readOnlyHint, destructiveHint, idempotentHint, openWorldHint).
- [ ] 모든 도구는 `.strict()` 시행을 통한 런타임 입력 검증을 위해 Zod 스키마를 사용합니다.
- [ ] 모든 Zod 스키마에는 적절한 제약 조건과 설명적인 오류 메시지가 있습니다.
- [ ] 모든 도구에는 명시적인 입력/출력 유형과 함께 포괄적인 설명이 있습니다.
- [ ] 설명에는 반환 값 예제와 전체 스키마 문서가 포함됩니다.
- [ ] 오류 메시지는 명확하고 실행 가능하며 교육적입니다.

### TypeScript 품질
- [ ] TypeScript 인터페이스는 모든 데이터 구조에 대해 정의됩니다.
- [ ] tsconfig.json에서 Strict TypeScript가 활성화되었습니다.
- [ ] `any` 유형을 사용하지 않음 - 대신 `unknown` 또는 적절한 유형을 사용하십시오.
- [ ] 모든 비동기 함수에는 명시적인 Promise<T> 반환 유형이 있습니다.
- [ ] 오류 처리에서는 적절한 유형 가드(예: `axios.isAxiosError`, `z.ZodError`)를 사용합니다.

### 고급 기능(해당되는 경우)
- [ ] 적절한 데이터 엔드포인트에 등록된 리소스
- [ ] 적절한 전송 구성(stdio 또는 스트리밍 가능한 HTTP)
- [ ] 동적 서버 기능에 대해 구현된 알림
- [ ] SDK 인터페이스를 통한 유형 안전

### 프로젝트 구성
- [ ] Package.json에는 필요한 모든 종속성이 포함되어 있습니다.
- [ ] 빌드 스크립트는 dist/ 디렉토리에서 작동하는 JavaScript를 생성합니다.
- [ ] 기본 진입점이 dist/index.js로 올바르게 구성되었습니다.
- [ ] 서버 이름은 `{service}-mcp-server` 형식을 따릅니다.
- [ ] tsconfig.json이 엄격 모드로 올바르게 구성되었습니다.

### 코드 품질
- [ ] 해당하는 경우 페이지 매김이 올바르게 구현되었습니다.
- [ ] 큰 응답은 CHARACTER_LIMIT 상수를 확인하고 일반 메시지로 잘립니다.
- [ ] 잠재적으로 큰 결과 세트에 대해 필터링 옵션이 제공됩니다.
- [ ] 모든 네트워크 작업은 시간 초과 및 연결 오류를 적절하게 처리합니다.
- [ ] 공통 기능을 재사용 가능한 기능으로 추출
- [ ] 유사한 작업 전반에 걸쳐 반환 유형이 일관됩니다.

### 테스트 및 빌드
- [ ] `npm run build`이(가) 오류 없이 성공적으로 완료되었습니다.
- [ ] dist/index.js가 생성되어 실행 가능
- [ ] 서버 실행: `node dist/index.js --help`
- [ ] 모든 가져오기가 올바르게 해결됩니다.
- [ ] 샘플 도구 호출이 예상대로 작동합니다.
