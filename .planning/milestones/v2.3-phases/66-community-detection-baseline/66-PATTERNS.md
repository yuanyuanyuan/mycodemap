# Phase 66: Community Detection Baseline - Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 8
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/infrastructure/storage/community-helpers.ts` | utility | transform | `src/infrastructure/storage/graph-helpers.ts` | exact |
| `src/interface/types/storage.ts` | model | request-response | `src/interface/types/storage.ts` | exact |
| `src/server/mcp/service.ts` | service | request-response | `src/server/mcp/service.ts` | exact |
| `src/server/mcp/server.ts` | route | request-response | `src/server/mcp/server.ts` | exact |
| `src/server/mcp/types.ts` | model | request-response | `src/server/mcp/types.ts` | exact |
| `src/infrastructure/storage/__tests__/community-helpers.test.ts` | test | transform | `src/infrastructure/storage/__tests__/graph-helpers.test.ts` | exact |
| `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | test | request-response | `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | exact |
| `tests/e2e/graph-community-detection.test.ts` | test | request-response | `tests/e2e/graph-impact-analysis.test.ts` | exact |

## Pattern Assignments

### `src/infrastructure/storage/community-helpers.ts` (utility, transform)

**Analog:** `src/infrastructure/storage/graph-helpers.ts`

**Imports + shared helper placement** (`src/infrastructure/storage/graph-helpers.ts:1-24`)
```typescript
import type {
  Cycle,
  GraphMetadata,
  ImpactAnalysisRequest,
  ImpactEntrypoint,
  ImpactEntrypointCandidate,
  ImpactNode,
  SharedImpactResult,
  ImpactResult,
  ProjectStatistics,
  SymbolImpactResult,
  SymbolImpactNode,
} from '../../interface/types/storage.js';
import type {
  CodeGraph,
  DependencyConfidence,
  Module,
  Symbol,
  Dependency,
} from '../../interface/types/index.js';
```

**Empty-result/error contract pattern** (`src/infrastructure/storage/graph-helpers.ts:173-205`)
```typescript
function createEmptyImpactResult(
  request: ImpactAnalysisRequest,
  graphStatus: SharedImpactResult['graphStatus'],
  overrides: Pick<SharedImpactResult, 'status' | 'confidence'> & {
    error?: SharedImpactResult['error'];
    warnings?: SharedImpactResult['warnings'];
    remediation?: string;
    entrypoint?: Partial<ImpactEntrypoint>;
  }
): SharedImpactResult {
  return {
    status: overrides.status,
    confidence: overrides.confidence,
    graphStatus,
    entrypoint: {
      kind: request.kind,
      name: request.kind === 'file' ? request.filePath : request.symbol,
      filePath: request.filePath,
      ...overrides.entrypoint,
    },
    summary: {
      requestedDepth: request.depth,
      directCount: 0,
      transitiveCount: 0,
      totalCount: 0,
      maxDepth: 0,
      truncated: false,
    },
    direct: [],
    transitiveLayers: [],
    warnings: overrides.warnings ?? [],
    truncated: false,
    remediation: overrides.remediation,
    error: overrides.error,
  };
}
```

**Entrypoint resolution + explicit refusal pattern** (`src/infrastructure/storage/graph-helpers.ts:227-246,250-295,299-341`)
```typescript
const graphStatus = graph.modules.length > 0 || graph.symbols.length > 0
  ? (graph.graphStatus ?? 'complete')
  : 'missing';

if (graphStatus === 'missing') {
  return {
    ok: false,
    result: createEmptyImpactResult(request, 'missing', {
      status: 'unavailable',
      confidence: 'unavailable',
      error: {
        code: 'GRAPH_NOT_FOUND',
        message: 'Code graph not found. Run `mycodemap generate --symbol-level` first.',
      },
      remediation: 'Run `mycodemap generate --symbol-level` to rebuild graph truth before querying impact.',
    }),
  };
}
```

**Degraded-success pattern** (`src/infrastructure/storage/graph-helpers.ts:479-521`)
```typescript
const graphStatus = graph.graphStatus ?? 'complete';
const warnings: SharedImpactResult['warnings'] = [];
let confidence: SharedImpactResult['confidence'] = 'high';

if (graphStatus === 'partial') {
  warnings.push({
    code: 'GRAPH_PARTIAL',
    message: 'Graph truth is partial; parse failures may hide affected files or symbols.',
  });
  confidence = 'reduced';
}

if (traversal.truncated) {
  warnings.push({
    code: 'TRAVERSAL_TRUNCATED',
    message: 'Impact traversal hit the configured depth/limit boundary before exhaustion.',
  });
  confidence = 'reduced';
}
```

**Core algorithm seam** (`src/infrastructure/storage/graph-helpers.ts:547-585,612-629`)
```typescript
export function analyzeImpactInGraph(
  graph: CodeGraph,
  request: ImpactAnalysisRequest
): SharedImpactResult {
  const resolved = resolveImpactEntrypointInGraph(graph, request);
  if (!resolved.ok) {
    return resolved.result;
  }

  if (request.kind === 'file') {
    const moduleMap = new Map(graph.modules.map((module) => [module.id, module] as const));
    const traversal = collectImpactTraversal(
      resolved.rootId,
      request.depth,
      request.limit ?? Number.MAX_SAFE_INTEGER,
      buildModuleReverseAdjacency(graph),
      (id, hop, traversalPath) => {
        const module = moduleMap.get(id);
        return module ? toModuleImpactNode(module, hop, traversalPath) : null;
      }
    );

    return buildSharedImpactResult(graph, request, resolved, traversal);
  }
```

**What to copy for Phase 66**
- 文件放在 `src/infrastructure/storage/`，作为共享 helper，而不是写进 MCP surface。
- 先把 persisted `CodeGraph` 投影到模块级分析图，再统一输出 `status/confidence/graphStatus/warnings/remediation`。
- 对弱信号场景沿用“成功但降级”的模式，不返回空成功。

---

### `src/interface/types/storage.ts` (model, request-response)

**Analog:** `src/interface/types/storage.ts`

**Shared result contract pattern** (`src/interface/types/storage.ts:49-122`)
```typescript
export type ImpactAnalysisStatus = 'ok' | 'not_found' | 'ambiguous' | 'unavailable';
export type ImpactAnalysisConfidence = 'high' | 'reduced' | 'ambiguous' | 'unavailable';
export type ImpactGraphStatus = GraphMetadata['graphStatus'] | 'missing';

export interface SharedImpactResult {
  status: ImpactAnalysisStatus;
  confidence: ImpactAnalysisConfidence;
  graphStatus: ImpactGraphStatus;
  entrypoint: ImpactEntrypoint;
  summary: ImpactSummary;
  direct: ImpactNode[];
  transitiveLayers: ImpactLayer[];
  warnings: ImpactWarning[];
  truncated: boolean;
  remediation?: string;
  error?: ImpactError;
}
```

**Graph metadata reuse seam** (`src/interface/types/storage.ts:148-157,275-278`)
```typescript
export interface GraphMetadata {
  generatedAt: string | null;
  graphStatus: 'complete' | 'partial';
  failedFileCount: number;
  parseFailureFiles: string[];
  moduleCount: number;
  symbolCount: number;
  lastRefresh?: IncrementalRefreshSummary;
}

loadCodeGraph(): Promise<CodeGraph>;
loadGraphMetadata(): Promise<GraphMetadata>;
```

**What to copy for Phase 66**
- 在现有 `storage.ts` 中新增 `Community*` 类型族，不新建平行 contract 文件。
- 命名与 impact 保持一致：`Status`、`Confidence`、`GraphStatus`、`Warning`、`Summary`、`SharedCommunityResult`。
- graph truth 元数据继续复用 `GraphMetadata`，不要定义第二套 partial/missing 语义。

---

### `src/server/mcp/service.ts` (service, request-response)

**Analog:** `src/server/mcp/service.ts`

**Imports + thin adapter seam** (`src/server/mcp/service.ts:4-26`)
```typescript
import type {
  IStorage,
  GraphMetadata,
  ImpactAnalysisRequest,
  ImpactEntrypointCandidate,
  ImpactNode,
  SharedImpactResult,
} from '../../interface/types/storage.js';
import { analyzeImpactInGraph } from '../../infrastructure/storage/graph-helpers.js';
import type {
  McpGraphStatus,
  McpImpactEntrypoint,
  McpImpactEntrypointCandidate,
  McpImpactLayer,
  McpImpactNode,
  McpImpactResult,
  McpQueryResult,
  McpSymbolRef,
  McpToolConfidence,
  McpToolError,
  McpToolStatus,
} from './types.js';
```

**Graph envelope pattern** (`src/server/mcp/service.ts:61-90`)
```typescript
export function toGraphStatus(metadata: GraphMetadata): McpGraphStatus {
  return metadata.generatedAt ? metadata.graphStatus : 'missing';
}

export function buildGraphEnvelope(metadata: GraphMetadata): Pick<
  McpQueryResult,
  'graph_status' | 'generated_at' | 'failed_file_count' | 'parse_failure_files'
> {
  return {
    graph_status: toGraphStatus(metadata),
    generated_at: metadata.generatedAt,
    failed_file_count: metadata.failedFileCount,
    parse_failure_files: [...metadata.parseFailureFiles],
  };
}
```

**Shared-result to MCP mapping** (`src/server/mcp/service.ts:180-203`)
```typescript
function mapSharedImpactResult(result: SharedImpactResult, metadata: GraphMetadata): McpImpactResult {
  return {
    status: result.status,
    confidence: result.confidence,
    ...buildGraphEnvelope(metadata),
    entrypoint: toMcpImpactEntrypoint(result.entrypoint),
    summary: {
      requested_depth: result.summary.requestedDepth,
      direct_count: result.summary.directCount,
      transitive_count: result.summary.transitiveCount,
      total_count: result.summary.totalCount,
      max_depth: result.summary.maxDepth,
      truncated: result.summary.truncated,
    },
    direct: result.direct.map(toMcpImpactNode),
    transitive_layers: result.transitiveLayers.map(toMcpImpactLayer),
    warnings: result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
    })),
    truncated: result.truncated,
    remediation: result.remediation,
    error: toMcpImpactError(result.error),
  };
}
```

**Service method shape** (`src/server/mcp/service.ts:254-267`)
```typescript
async impactSymbol(input: ImpactSymbolInput): Promise<McpImpactResult> {
  const metadata = await this.storage.loadGraphMetadata();
  const depth = clampImpactDepth(input.depth);
  const limit = clampImpactLimit(input.limit);
  const graph = await this.storage.loadCodeGraph();
  const request: ImpactAnalysisRequest = {
    kind: 'symbol',
    symbol: input.symbol,
    filePath: input.filePath,
    depth,
    limit,
  };
  return mapSharedImpactResult(analyzeImpactInGraph(graph, request), metadata);
}
```

**What to copy for Phase 66**
- 新增 `impact` 对应的 community service method，顺序保持 `loadGraphMetadata()` → `loadCodeGraph()` → shared helper → MCP mapper。
- mapper 只做字段改名与 envelope 合并，不在 service 里跑第二次图算法。
- 缺图、partial、warnings 一律从 shared result 上翻译，不在 MCP 层重造判定。

---

### `src/server/mcp/server.ts` (route, request-response)

**Analog:** `src/server/mcp/server.ts`

**Tool registration pattern** (`src/server/mcp/server.ts:37-118`)
```typescript
function registerNativeTools(server: McpServer, service: CodeMapMcpService, storage: IStorage): void {
  server.registerTool('codemap_impact', {
    title: 'CodeMap Impact',
    description: 'Experimental: query layered graph-native impact from a symbol entrypoint using the shared persisted graph truth.',
    inputSchema: {
      symbol: z.string().min(1).describe('Exact symbol name to resolve'),
      filePath: z.string().min(1).optional().describe('Optional file path to disambiguate same-name symbols'),
      depth: z.number().int().min(1).max(20).optional().describe('Requested caller traversal depth'),
      limit: z.number().int().min(1).max(200).optional().describe('Requested maximum affected symbols'),
    },
  }, async ({ symbol, filePath, depth, limit }) => {
    const structuredContent = await service.impactSymbol({
      symbol,
      filePath,
      depth,
      limit,
    });

    return {
      content: [{
        type: 'text',
        text: renderStructuredContent(structuredContent),
      }],
      structuredContent,
      isError: structuredContent.status !== 'ok',
    };
  });
}
```

**Reserved native tool names** (`src/server/mcp/server.ts:186-197`)
```typescript
const reservedNames = new Set<string>(['codemap_impact', 'codemap_env_contract', 'codemap_context']);

registerNativeTools(server, service, storage);
registerContractTools(server, getFullContract(), reservedNames, rootDir);
```

**What to copy for Phase 66**
- 在 `registerNativeTools` 里追加 `codemap_communities`，不要开新 server 文件。
- 输入 schema 继续用 `zod`，输出仍是 `content + structuredContent + isError`。
- 记得把新工具名加入 `reservedNames`，避免 contract tool 冲突。

---

### `src/server/mcp/types.ts` (model, request-response)

**Analog:** `src/server/mcp/types.ts`

**Top-level tool types** (`src/server/mcp/types.ts:7-23`)
```typescript
export type McpToolStatus = 'ok' | 'not_found' | 'ambiguous' | 'unavailable' | 'invalid_input';
export type McpToolConfidence = 'high' | 'reduced' | 'ambiguous' | 'unavailable';
export type McpGraphStatus = GraphMetadata['graphStatus'] | 'missing';

export interface McpToolError {
  code: McpErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
```

**Payload naming convention** (`src/server/mcp/types.ts:51-112`)
```typescript
export interface McpImpactSummary {
  requested_depth: number;
  direct_count: number;
  transitive_count: number;
  total_count: number;
  max_depth: number;
  truncated: boolean;
}

export interface McpImpactResult {
  [key: string]: unknown;
  status: McpToolStatus;
  confidence: McpToolConfidence;
  graph_status: McpGraphStatus;
  generated_at: string | null;
  failed_file_count: number;
  parse_failure_files: string[];
  entrypoint: McpImpactEntrypoint;
  summary: McpImpactSummary;
  direct: McpImpactNode[];
  transitive_layers: McpImpactLayer[];
  warnings: McpImpactWarning[];
  truncated: boolean;
  remediation?: string;
  error?: McpToolError;
}
```

**What to copy for Phase 66**
- MCP community payload继续使用 snake_case 字段。
- 复用 `McpToolStatus` / `McpToolConfidence` / `McpGraphStatus`，只新增 `McpCommunity*` 接口，不另起状态枚举。
- warning/error shape 保持 `{ code, message, details? }`。

---

### `src/infrastructure/storage/__tests__/community-helpers.test.ts` (test, transform)

**Analog:** `src/infrastructure/storage/__tests__/graph-helpers.test.ts`

**Fixture-first unit test pattern** (`src/infrastructure/storage/__tests__/graph-helpers.test.ts:1-74`)
```typescript
import { describe, expect, it } from 'vitest';
import type { CodeGraph } from '../../../interface/types/index.js';
import {
  analyzeImpactInGraph,
  calculateImpactInGraph,
  createEmptyCodeGraph,
  deserializeCodeGraphSnapshot,
  deleteModuleFromGraph,
  detectCyclesInGraph,
  findCalleesInGraph,
  findCallersInGraph,
  getProjectStatisticsFromGraph,
  serializeCodeGraphSnapshot,
  upsertModuleInGraph,
} from '../graph-helpers.js';

function createGraphFixture(): CodeGraph {
  return {
    project: {
      id: 'proj-1',
      name: 'fixture',
      rootPath: '/fixture',
```

**Explicit failure/degraded assertions** (`src/infrastructure/storage/__tests__/graph-helpers.test.ts:156-220`)
```typescript
it('returns explicit not_found and ambiguous impact states instead of empty success', () => {
  const graph = createGraphFixture();
  graph.symbols.push({
    id: 'sym-a-duplicate',
    moduleId: 'mod-b',
    name: 'callA',
    kind: 'function',
    location: { file: 'src/b.ts', line: 4, column: 1 },
    visibility: 'public',
  });

  expect(analyzeImpactInGraph(graph, {
    kind: 'file',
    filePath: 'src/missing.ts',
    depth: 2,
  })).toEqual(expect.objectContaining({
    status: 'not_found',
    error: expect.objectContaining({ code: 'FILE_NOT_FOUND' }),
  }));
});

it('degrades confidence for partial truth and marks traversal truncation explicitly', () => {
  const graph = createGraphFixture();
  graph.graphStatus = 'partial';
  graph.failedFileCount = 1;
  graph.parseFailureFiles = ['src/stale.ts'];
```

**What to copy for Phase 66**
- 保持单文件 fixture，直接构造 `CodeGraph`，不 mock storage。
- 覆盖成功、not_found/ambiguous、partial、weak-signal/truncated 这四类结果。
- 断言 `warnings` 与 `confidence`，不要只断言 community 数量。

---

### `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` (test, request-response)

**Analog:** `src/server/mcp/__tests__/CodeMapMcpServer.test.ts`

**In-memory transport harness** (`src/server/mcp/__tests__/CodeMapMcpServer.test.ts:143-177`)
```typescript
async function createConnectedClient(options: {
  withGraph?: boolean;
  updatedAt?: Date;
  graphStatus?: 'complete' | 'partial';
  failedFileCount?: number;
  parseFailureFiles?: string[];
} = {}) {
  const storage = new MemoryStorage();
  await storage.initialize('/fixture');
  if (options.withGraph ?? true) {
    await storage.saveCodeGraph(createGraphFixture(options));
  }

  const server = createCodeMapMcpServer(storage);
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();
  let rawStdout = '';
  serverToClient.on('data', chunk => {
    rawStdout += chunk.toString('utf8');
  });

  await server.connect(new StdioServerTransport(clientToServer, serverToClient));
```

**Protocol-clean + tool list assertions** (`src/server/mcp/__tests__/CodeMapMcpServer.test.ts:219-250`)
```typescript
const tools = await connection.client.listTools();
const toolNames = tools.tools.map(tool => tool.name);
expect(toolNames).toEqual(expect.arrayContaining([
  'codemap_query',
  'codemap_env_contract',
  'codemap_impact',
  'codemap_context',
]));

const stdoutFrames = connection.getRawStdout().trim().split('\n').filter(Boolean);
for (const frame of stdoutFrames) {
  expect(() => JSON.parse(frame)).not.toThrow();
}
```

**Thin-surface truth assertion** (`src/server/mcp/__tests__/CodeMapMcpServer.test.ts:273-318,476-517`)
```typescript
const result = await connection.client.callTool({
  name: 'codemap_impact',
  arguments: { symbol: 'target', depth: 4, limit: 10 },
});
const structured = result.structuredContent as Record<string, unknown>;

expect(structured.status).toBe('ok');
expect(structured.summary).toEqual(expect.objectContaining({
  requested_depth: 4,
  direct_count: 1,
  transitive_count: 1,
  total_count: 2,
}));
expect(structured.graph_status).toBe('complete');
```

**What to copy for Phase 66**
- 继续用 `MemoryStorage + PassThrough + Client` 做 MCP unit/integration test。
- 断言 `codemap_communities` 出现在 tool list，并验证 stdout 每帧都是纯 JSON。
- 至少覆盖 complete、missing、partial/weak-signal 三个 MCP 响应面。

---

### `tests/e2e/graph-community-detection.test.ts` (test, request-response)

**Analog:** `tests/e2e/graph-impact-analysis.test.ts`

**Real repo fixture + build once pattern** (`tests/e2e/graph-impact-analysis.test.ts:13-39,47-114`)
```typescript
const CLI_PATH = path.resolve(__dirname, '../../dist/cli/index.js');

function runCli(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}
```

**Real SQLite mutation seam** (`tests/e2e/graph-impact-analysis.test.ts:116-237,393-409`)
```typescript
const database = new Database(path.join(rootDir, '.mycodemap', 'governance.sqlite'));
database.prepare(`
  INSERT INTO metadata (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`).run('graph_status', 'partial');
database.prepare(`
  INSERT INTO metadata (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`).run('failed_file_count', '1');
```

**CLI + MCP shared truth verification** (`tests/e2e/graph-impact-analysis.test.ts:289-341`)
```typescript
const generateResult = runCli(['generate', '--symbol-level'], rootDir);
expect(generateResult.exitCode).toBe(0);

const cliResult = runCli(['impact', '--file', 'src/target.ts', '--transitive', '--json'], rootDir);
expect(cliResult.exitCode).toBe(0);

const connection = await createConnectedMcpClient(rootDir);
const mcpResult = await connection.client.callTool({
  name: 'codemap_impact',
  arguments: { symbol: 'target', depth: 4, limit: 10 },
});
```

**Failure-mode proof** (`tests/e2e/graph-impact-analysis.test.ts:343-439`)
```typescript
const missingGraph = runCli(['impact', '--file', 'src/target.ts', '--json'], rootDir);
expect(missingGraph.exitCode).toBe(1);
expect(parseTrailingJson(missingGraph.stdout)).toEqual(expect.objectContaining({
  status: 'unavailable',
  error: expect.objectContaining({ code: 'GRAPH_NOT_FOUND' }),
}));

const truncated = await connection.client.callTool({
  name: 'codemap_impact',
  arguments: { symbol: 'target', depth: 4, limit: 1 },
});
expect(truncated.structuredContent).toEqual(expect.objectContaining({
  status: 'ok',
  confidence: 'reduced',
  truncated: true,
}));
```

**What to copy for Phase 66**
- E2E 继续证明“真实 CLI/build + 真实 SQLite + 真实 MCP transport”。
- 若 Phase 66 只公开 MCP，也可用 CLI/DB 作为 fixture setup seam，但最终断言仍应落在 shipped MCP tool。
- 至少保留一个失败场景和一个 degraded-success 场景。

## Shared Patterns

### Shared Graph Result Semantics
**Source:** `src/infrastructure/storage/graph-helpers.ts:479-521`
**Apply to:** `community-helpers.ts`, `storage.ts`, `service.ts`, `types.ts`, MCP tests, E2E tests
```typescript
if (graphStatus === 'partial') {
  warnings.push({
    code: 'GRAPH_PARTIAL',
    message: 'Graph truth is partial; parse failures may hide affected files or symbols.',
  });
  confidence = 'reduced';
}
```

### Persisted Graph Truth Loading
**Source:** `src/server/mcp/service.ts:254-267`
**Apply to:** `src/server/mcp/service.ts`
```typescript
const metadata = await this.storage.loadGraphMetadata();
const graph = await this.storage.loadCodeGraph();
return mapSharedImpactResult(analyzeImpactInGraph(graph, request), metadata);
```

### MCP Envelope
**Source:** `src/server/mcp/service.ts:61-90`
**Apply to:** `src/server/mcp/service.ts`, `src/server/mcp/types.ts`
```typescript
return {
  graph_status: toGraphStatus(metadata),
  generated_at: metadata.generatedAt,
  failed_file_count: metadata.failedFileCount,
  parse_failure_files: [...metadata.parseFailureFiles],
};
```

### MCP Tool Registration
**Source:** `src/server/mcp/server.ts:93-118`
**Apply to:** `src/server/mcp/server.ts`
```typescript
server.registerTool('codemap_impact', { ... }, async ({ ...args }) => {
  const structuredContent = await service.impactSymbol({ ...args });
  return {
    content: [{ type: 'text', text: renderStructuredContent(structuredContent) }],
    structuredContent,
    isError: structuredContent.status !== 'ok',
  };
});
```

### Real Transport Test Harness
**Source:** `src/server/mcp/__tests__/CodeMapMcpServer.test.ts:143-177`
**Apply to:** `src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
```typescript
const server = createCodeMapMcpServer(storage);
const clientToServer = new PassThrough();
const serverToClient = new PassThrough();
await server.connect(new StdioServerTransport(clientToServer, serverToClient));
await client.connect(new StdioServerTransport(serverToClient, clientToServer));
```

### Real SQLite Failure/Degraded Proof
**Source:** `tests/e2e/graph-impact-analysis.test.ts:393-409`
**Apply to:** `tests/e2e/graph-community-detection.test.ts`
```typescript
database.prepare(`
  INSERT INTO metadata (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`).run('graph_status', 'partial');
```

## No Analog Found

None. All likely Phase 66 targets have strong in-repo analogs from the Phase 63-65 graph capability line.

## Metadata

**Analog search scope:** `src/infrastructure/storage`, `src/interface/types`, `src/server/mcp`, `tests/e2e`
**Files scanned:** 8 primary files, plus phase `66-CONTEXT.md` and `66-RESEARCH.md`
**Pattern extraction date:** 2026-05-08
