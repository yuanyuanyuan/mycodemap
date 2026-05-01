# AI Guide - 输出结构解析

> 命令输出的 JSON 结构详解，帮助 AI 正确解析和处理结果

---

## Phase 1 契约基线

| 维度 | 目标态 | 当前 CLI 现实 |
|------|--------|---------------|
| 机器可读 | 机器可读优先，适合 AI/Agent 继续处理 | 多数命令仍通过 `--json` 显式返回结构化结果 |
| 人类可读 | 显式的人类阅读入口 | `analyze` 当前支持 `--output-mode human`，其余命令多保留现有文本输出 |
| analyze 收敛 | 输出契约应逐步收敛 | 当前公共契约已固定为 `find` / `read` / `link` / `show`，legacy alias 通过 `warnings[]` 暴露迁移提示 |
| 文件发现 | 扫描类命令共享一个文件发现模块 | 先尊重仓库 `.gitignore`，无 `.gitignore` 时回退到默认 `exclude` |

---

## 当前 CLI 现实：何时使用 --json

| 场景 | 使用 `--json` | 原因 |
|------|--------------|------|
| 需要解析结果进行进一步处理 | ✅ 是 | 结构化数据便于解析 |
| 向用户展示结果 | ❌ 否 | 人类可读格式更好 |
| 需要提取文件路径列表 | ✅ 是 | 便于正则提取 |
| 需要计算统计数据 | ✅ 是 | JSON 可直接计算 |
| 需要过滤或排序结果 | ✅ 是 | 可编程处理 |
| 简单查询确认存在性 | ❌ 否 | 文本输出更直观 |

---

## Interface Contract Schema 输出结构

> `mycodemap --schema` 输出整个 CLI 表面的单一真相源（single source of truth）。

```typescript
interface InterfaceContractSchema {
  version: string;           // 契约版本号，如 "2.0.0"
  commands: CommandSchema[]; // 所有 CLI 命令的定义
  options: GlobalOptionSchema[]; // 全局选项定义
  metadata: {
    generatedAt: string;     // ISO 8601 时间戳
    schemaVersion: string;   // schema 格式版本
    totalCommands: number;
    totalOptions: number;
  };
}

interface CommandSchema {
  name: string;              // 命令名，如 "query", "analyze", "doctor"
  description: string;       // 命令描述
  arguments: ArgumentSchema[];
  options: OptionSchema[];
  output: OutputSchema;      // 输出结构定义
  examples: string[];
}

interface ArgumentSchema {
  name: string;
  required: boolean;
  description: string;
  type: "string" | "number" | "boolean" | "array";
}

interface OptionSchema {
  name: string;
  alias?: string;
  type: "string" | "number" | "boolean" | "array";
  description: string;
  default?: unknown;
  required: boolean;
}

interface OutputSchema {
  format: "json" | "text" | "table";
  schemaRef: string;         // 指向具体 TypeScript interface 的引用
}
```

### 关键特性

- **单一真相源**：此 schema 同时驱动以下四个输出：
  1. CLI parser（命令行参数解析器）
  2. MCP tool definitions（MCP 工具定义）
  3. `--help-json`（机器可读帮助）
  4. Shell completions（bash/zsh/fish 补全）
- **变更即生效**：修改 schema 中的命令定义后，上述四个输出自动同步更新，无需手写维护
- **MCP 网关依赖**：MCP server 通过读取此 schema 动态注册所有工具，见下文 MCP 章节

### 示例

```json
{
  "version": "2.0.0",
  "commands": [
    {
      "name": "query",
      "description": "查询符号、模块或依赖信息",
      "arguments": [],
      "options": [
        { "name": "symbol", "alias": "s", "type": "string", "required": false },
        { "name": "json", "alias": "j", "type": "boolean", "required": false }
      ],
      "output": { "format": "json", "schemaRef": "QueryOutput" }
    }
  ],
  "metadata": {
    "generatedAt": "2026-05-01T00:00:00.000Z",
    "schemaVersion": "2.0.0",
    "totalCommands": 20,
    "totalOptions": 45
  }
}
```

---

## 文件发现契约

```typescript
type DiscoveryFallbackExclude =
  | "node_modules/**"
  | "dist/**"
  | "build/**"
  | "coverage/**"
  | "**/*.test.ts"
  | "**/*.spec.ts"
  | "**/*.d.ts";

interface DiscoveryContract {
  gitignore: true;
  fallbackExclude: DiscoveryFallbackExclude[];
  sharedBy: ["generate", "analyze", "ci check-headers -d"];
}
```

> `generate`、`analyze` 与 `ci check-headers -d` 会共享同一个文件发现模块；若仓库没有 `.gitignore`，则回退到上面的默认排除列表。

---

## generate / codemap.json 插件扩展字段

> 仅当 `mycodemap.config.json` **显式声明** `plugins` 段时，`generate` 输出才会包含 `pluginReport`。

```typescript
interface PluginDiagnostic {
  plugin?: string;
  stage: "load" | "initialize" | "analyze" | "generate";
  level: "warning" | "error";
  message: string;
}

interface PluginExecutionReport {
  loadedPlugins: string[];
  generatedFiles: string[];
  metrics: Record<string, unknown>;
  diagnostics: PluginDiagnostic[];
}

interface CodeMap {
  version: string;
  generatedAt: string;
  project: ProjectInfo;
  summary: ProjectSummary;
  modules: ModuleInfo[];
  dependencies: DependencyGraph;
  graphStatus?: "complete" | "partial";
  failedFileCount?: number;
  parseFailureFiles?: string[];
  actualMode?: "fast" | "smart";
  pluginReport?: PluginExecutionReport;
}
```

### graph integrity 语义

| 字段 | 含义 | 何时出现 |
|------|------|----------|
| `graphStatus` | 当前图是否完整：`complete` / `partial` | `generate` 输出总会写入 |
| `failedFileCount` | 发现到但未成功进入最终图的文件数 | `generate` 输出总会写入 |
| `parseFailureFiles` | 失败文件路径列表 | 仅当 `failedFileCount > 0` 时出现 |

- `summary.totalFiles` 仍表示**成功进入最终图**的模块数，不代表发现阶段的总文件数。
- 若 `graphStatus = "partial"`，Agent / 自动化流程必须把图视为**降级结果**，不能伪装成完整 truth。
- `generate --symbol-level` 与默认 generate 都遵守同一套 `graphStatus` 语义；差别只在是否 materialize symbol-level `call` 依赖。

### 示例

```json
{
  "graphStatus": "partial",
  "failedFileCount": 1,
  "parseFailureFiles": ["src/broken.ts"],
  "pluginReport": {
    "loadedPlugins": ["complexity-analyzer", "my-local-plugin"],
    "generatedFiles": ["plugins/good.txt"],
    "metrics": {
      "complexity-analyzer": {
        "complexityAnalysis": {
          "totalCyclomaticComplexity": 17
        }
      }
    },
    "diagnostics": [
      {
        "plugin": "my-local-plugin",
        "stage": "analyze",
        "level": "warning",
        "message": "my-local-plugin warning"
      }
    ]
  }
}
```

---

## MCP Tool 输出结构 (CLI-as-MCP Automatic Gateway)

> canonical MCP path 是 `generate --symbol-level → mcp install → host 启动 mcp start`。
> **v2.0 重大变更**：所有 schema 定义的 CLI 命令自动暴露为 MCP tools，不再只有 2 个工具。

### Gateway 模式

CLI-as-MCP Automatic Gateway 的核心机制：

1. **自动映射**：`Interface Contract Schema` 中定义的每个命令自动成为 MCP tool
2. **动态注册**：向 schema 添加新命令 → 重启 MCP server → 新 tool 自动出现，无需手写 tool 定义
3. **契约一致**：CLI 的输入/输出结构与对应的 MCP tool 完全同源，不存在漂移
4. **工具定义自动生成**：MCP server 启动时从 schema 自动生成 `tool.name`、`tool.description`、`inputSchema`

当前 schema 定义了 **20+ 个命令**，意味着 MCP host 可见 20+ 个 tools。以下 `McpQueryResult` 和 `McpImpactResult` 仅为其中两个示例。

> 注意：tool 定义是自动生成的。如果你看到某个命令在 CLI 可用但在 MCP 不可见，检查该命令是否已注册到 `Interface Contract Schema`。

```typescript
type McpToolStatus = "ok" | "not_found" | "ambiguous" | "unavailable";
type McpToolConfidence = "high" | "ambiguous" | "unavailable";
type McpGraphStatus = "complete" | "partial" | "missing";
type McpErrorCode = "GRAPH_NOT_FOUND" | "SYMBOL_NOT_FOUND" | "AMBIGUOUS_EDGE";

interface McpSymbolRef {
  id: string;
  module_id: string;
  name: string;
  kind: string;
  visibility: "public" | "private" | "protected" | "internal";
  file_path: string;
  line: number;
  column: number;
  signature?: string;
}

interface McpQueryResult {
  status: McpToolStatus;
  confidence: McpToolConfidence;
  graph_status: McpGraphStatus;
  generated_at: string | null;
  failed_file_count: number;
  parse_failure_files: string[];
  symbol?: McpSymbolRef;
  callers: McpSymbolRef[];
  callees: McpSymbolRef[];
  error?: {
    code: McpErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface McpImpactResult {
  status: McpToolStatus;
  confidence: McpToolConfidence;
  graph_status: McpGraphStatus;
  generated_at: string | null;
  failed_file_count: number;
  parse_failure_files: string[];
  root_symbol?: McpSymbolRef;
  affected_symbols: Array<{
    symbol: McpSymbolRef;
    depth: number;
    path: string[];
  }>;
  depth: number;
  limit: number;
  truncated: boolean;
  error?: {
    code: McpErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### `codemap_query`

输入：

```typescript
interface CodemapQueryInput {
  symbol: string;
  filePath?: string;
}
```

语义：
- `status = "ok"`：返回 `symbol`、`callers`、`callees`
- `status = "unavailable"` + `GRAPH_NOT_FOUND`：还没生成 symbol-level 图
- `status = "not_found"` + `SYMBOL_NOT_FOUND`：目标符号不存在
- `status = "ambiguous"` + `AMBIGUOUS_EDGE`：同名符号无法仅靠 `symbol` / `filePath` 消歧

### `codemap_impact`

输入：

```typescript
interface CodemapImpactInput {
  symbol: string;
  filePath?: string;
  depth?: number;
  limit?: number;
}
```

语义：
- `affected_symbols` 按 caller impact 链返回，`path` 从 root symbol id 开始
- `depth` / `limit` 会被收敛到首期限额，防止 host 挂起
- `truncated = true` 说明结果已命中 `limit`

### MCP 结果示例

```json
{
  "status": "ok",
  "confidence": "high",
  "graph_status": "partial",
  "generated_at": "2026-04-19T00:00:00.000Z",
  "failed_file_count": 1,
  "parse_failure_files": ["src/broken.ts"],
  "symbol": {
    "id": "sym-target",
    "module_id": "mod-target",
    "name": "target",
    "kind": "function",
    "visibility": "public",
    "file_path": "src/target.ts",
    "line": 1,
    "column": 1,
    "signature": "target() => void"
  },
  "callers": [
    {
      "id": "sym-caller",
      "module_id": "mod-caller",
      "name": "caller",
      "kind": "function",
      "visibility": "public",
      "file_path": "src/caller.ts",
      "line": 1,
      "column": 1,
      "signature": "caller() => void"
    }
  ],
  "callees": []
}
```

---

## doctor 命令输出结构

### JSON 输出 (`--json`)

```typescript
type DoctorCheckStatus = "pass" | "warn" | "fail" | "skip";
type DoctorCategory = "install" | "config" | "runtime" | "agent";

interface DoctorCheck {
  name: string;
  status: DoctorCheckStatus;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

interface DoctorCategoryResult {
  category: DoctorCategory;
  summary: {
    pass: number;
    warn: number;
    fail: number;
    skip: number;
  };
  checks: DoctorCheck[];
}

interface DoctorOutput {
  overall: "healthy" | "degraded" | "critical";
  categories: DoctorCategoryResult[];
  // Failure-to-Action Protocol 字段
  rootCause?: string;           // 若 overall != healthy，给出根因
  remediationPlan?: string[];   // 按优先级排列的修复步骤
  confidence: "high" | "medium" | "low";  // 诊断置信度
  nextCommand?: string;         // 建议执行的下一步 CLI 命令
}
```

### Failure-to-Action Protocol

当诊断发现问题时，`doctor` 不仅返回状态，还返回可执行的修复指引：

| 字段 | 含义 | 示例 |
|------|------|------|
| `rootCause` | 问题的根本原因 | `"SQLite binding 缺失，导致 storage backend 无法初始化"` |
| `remediationPlan` | 按优先级排列的修复步骤 | `["npm install better-sqlite3", "mycodemap generate --symbol-level"]` |
| `confidence` | 诊断置信度 | `"high"` — 对根因判断有把握 |
| `nextCommand` | 建议执行的下一步命令 | `"mycodemap generate --symbol-level"` |

### 示例

```json
{
  "overall": "degraded",
  "categories": [
    {
      "category": "install",
      "summary": { "pass": 2, "warn": 0, "fail": 0, "skip": 0 },
      "checks": [
        { "name": "node_version", "status": "pass", "message": "Node.js >= 20" },
        { "name": "npm_packages", "status": "pass", "message": "所有依赖已安装" }
      ]
    },
    {
      "category": "config",
      "summary": { "pass": 1, "warn": 1, "fail": 0, "skip": 0 },
      "checks": [
        { "name": "config_file", "status": "pass", "message": "mycodemap.config.json 存在" },
        { "name": "storage_type", "status": "warn", "message": "storage.type 未显式设置，使用 auto", "remediation": "建议显式设置为 sqlite 或 filesystem" }
      ]
    },
    {
      "category": "runtime",
      "summary": { "pass": 1, "warn": 0, "fail": 1, "skip": 0 },
      "checks": [
        { "name": "graph_exists", "status": "fail", "message": "symbol-level 图不存在", "remediation": "运行 mycodemap generate --symbol-level" },
        { "name": "sqlite_available", "status": "pass", "message": "better-sqlite3 可用" }
      ]
    },
    {
      "category": "agent",
      "summary": { "pass": 1, "warn": 0, "fail": 0, "skip": 1 },
      "checks": [
        { "name": "mcp_server", "status": "pass", "message": "MCP server 可启动" },
        { "name": "shell_completions", "status": "skip", "message": "未检测 shell 环境" }
      ]
    }
  ],
  "rootCause": "symbol-level 图缺失，MCP tools 无法提供完整语义查询",
  "remediationPlan": [
    "mycodemap generate --symbol-level",
    "mycodemap mcp install",
    "重启 MCP host"
  ],
  "confidence": "high",
  "nextCommand": "mycodemap generate --symbol-level"
}
```

---

## benchmark 命令输出结构

### JSON 输出 (`--json`)

```typescript
interface BenchmarkTiming {
  mean: number;      // 平均耗时 (ms)
  median: number;    // 中位数 (ms)
  p95: number;       // 95 分位 (ms)
  p99: number;       // 99 分位 (ms)
  stdDev: number;    // 标准差
  samples: number;   // 采样次数
}

interface BenchmarkComparison {
  command: string;
  wasm: BenchmarkTiming;
  native: BenchmarkTiming;
  speedup: number;   // native / wasm，>1 表示 native 更快
  fallback: {
    used: boolean;   // 是否发生了 WASM → Native fallback
    reason?: string; // fallback 原因，如 "wasm_unavailable", "timeout", "memory_limit"
  };
}

interface BenchmarkOutput {
  overall: {
    totalCommands: number;
    fallbackCount: number;
    averageSpeedup: number;
  };
  comparisons: BenchmarkComparison[];
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    memoryMb: number;
  };
}
```

### WASM vs Native 对比语义

| 字段 | 含义 |
|------|------|
| `speedup` | Native 相对于 WASM 的加速比。`1.0` 表示无差异，`>1` 表示 Native 更快，`<1` 表示 WASM 更快（罕见） |
| `fallback.used` | 是否因 WASM 不可用/超时/内存限制而回退到 Native 实现 |
| `fallback.reason` | fallback 触发原因，用于诊断 WASM 路径的问题 |

### 示例

```json
{
  "overall": {
    "totalCommands": 5,
    "fallbackCount": 1,
    "averageSpeedup": 2.3
  },
  "comparisons": [
    {
      "command": "generate",
      "wasm": { "mean": 1200, "median": 1150, "p95": 1800, "p99": 2100, "stdDev": 200, "samples": 10 },
      "native": { "mean": 500, "median": 480, "p95": 720, "p99": 850, "stdDev": 90, "samples": 10 },
      "speedup": 2.4,
      "fallback": { "used": false }
    },
    {
      "command": "query",
      "wasm": { "mean": 80, "median": 75, "p95": 120, "p99": 150, "stdDev": 15, "samples": 10 },
      "native": { "mean": 35, "median": 32, "p95": 55, "p99": 70, "stdDev": 8, "samples": 10 },
      "speedup": 2.29,
      "fallback": { "used": false }
    },
    {
      "command": "analyze",
      "wasm": { "mean": 0, "median": 0, "p95": 0, "p99": 0, "stdDev": 0, "samples": 0 },
      "native": { "mean": 600, "median": 580, "p95": 900, "p99": 1100, "stdDev": 120, "samples": 10 },
      "speedup": 0,
      "fallback": { "used": true, "reason": "wasm_unavailable: analyze 命令尚未提供 WASM 实现" }
    }
  ],
  "system": {
    "nodeVersion": "v22.14.0",
    "platform": "linux",
    "arch": "x64",
    "memoryMb": 32768
  }
}
```

---

## query 命令输出结构

### JSON 输出 (-j)

```typescript
interface QueryOutput {
  type: 'symbol' | 'module' | 'deps' | 'search';
  query: string;
  count: number;
  results: QueryResult[];
  metrics?: {
    indexLoadTime: number;
    queryTime: number;
    totalTime: number;
    cacheHit: boolean;
    indexSize: number;
  };
}

interface QueryResult {
  name: string;
  path: string;
  kind: string;
  details: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  isExported: boolean;
  references?: Reference[];
  context?: ContextLine[];
}

interface Reference {
  file: string;
  line: number;
  type: 'import' | 'export';
}

interface ContextLine {
  line: number;
  content: string;
}
```

### 示例

```json
{
  "type": "symbol",
  "query": "IntentRouter",
  "count": 3,
  "results": [
    {
      "name": "IntentRouter",
      "path": "/project/src/orchestrator/intent-router.ts",
      "kind": "class",
      "details": "定义于 src/orchestrator/intent-router.ts:15",
      "location": {
        "file": "src/orchestrator/intent-router.ts",
        "line": 15,
        "column": 1
      },
      "isExported": true,
      "references": [
        { "file": "src/cli/commands/analyze.ts", "line": 1, "type": "import" }
      ]
    }
  ],
  "metrics": {
    "indexLoadTime": 12.34,
    "queryTime": 5.67,
    "totalTime": 18.01,
    "cacheHit": true,
    "indexSize": 1523
  }
}
```

---

## analyze 命令输出结构

> 当前 `analyze` 的公共契约为 `find` / `read` / `link` / `show`；legacy alias 会在输出中返回 `warnings[]`，其中 `refactor` 不在兼容白名单内。

### 标准 JSON 输出 (--json)

```typescript
type AnalyzeIntent = "find" | "read" | "link" | "show";

interface AnalyzeOutput {
  schemaVersion: "v1.0.0";
  intent: AnalyzeIntent;
  tool: string;
  confidence: {
    score: number;        // 0.0 - 1.0
    level: "high" | "medium" | "low";
  };
  results: AnalyzeResult[];
  warnings?: AnalyzeWarning[];
  diagnostics?: AnalyzeDiagnostics;
  analysis?: ReadAnalysis | LinkAnalysis | ShowAnalysis;
  metadata: {
    total: number;
    scope: "direct" | "transitive";
    resultCount: number;
  };
}

interface AnalyzeDiagnostics {
  status: "success" | "partialFailure" | "failure";
  items: AnalyzeDiagnostic[];
  failedTools?: string[];
  degradedTools?: string[];
}

interface AnalyzeDiagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  source: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

interface AnalyzeWarning {
  code:
    | "deprecated-intent"
    | "git-history-unavailable"
    | "git-history-precompute-recommended"
    | "git-history-stale"
    | "git-history-unsupported-intent";
  severity: "warning";
  message: string;
  details?: Record<string, string | number | boolean | null>;
  deprecatedIntent?: "impact" | "dependency" | "search" | "documentation" | "complexity" | "overview" | "reference";
  replacementIntent?: AnalyzeIntent;
  sunsetPolicy?: "2-minor-window";
}

interface AnalyzeResult {
  file: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  content?: string;         // 自然语言描述
  relevance: number;        // 0.0 - 1.0
  metadata?: {
    testFile?: string;      // 关联的测试文件
    dependencies?: string[];
    impactCount?: number;
    historyRisk?: {
      status: "ok" | "ambiguous" | "not_found" | "unavailable";
      level: "high" | "medium" | "low" | "unavailable";
      confidence: "high" | "medium" | "low" | "unavailable";
      freshness: "fresh" | "stale" | "expired" | "unknown";
      score: number | null;
      factors: string[];
      analyzedAt: string | null;
    };
    complexityMetrics?: {
      cyclomatic: number;
      cognitive: number;
      maintainability: number;
    };
    riskLevel?: "high" | "medium" | "low";
    [key: string]: unknown;
  };
}

interface ReadAnalysis {
  intent: "read";
  impact?: Array<{
    file: string;
    changedFiles: string[];
    transitiveDependencies: string[];
    impactCount: number;
    risk: "high" | "medium" | "low";
  }>;
  complexity?: Array<{
    file: string;
    metrics: {
      cyclomatic: number;
      cognitive: number;
      maintainability: number;
    };
    risk: "high" | "medium" | "low";
  }>;
  history?: Array<{
    file: string;
    status: "ok" | "ambiguous" | "not_found" | "unavailable";
    confidence: "high" | "medium" | "low" | "unavailable";
    freshness: "fresh" | "stale" | "expired" | "unknown";
    source: "git-live" | "sqlite-materialized" | "sqlite-cache" | "unavailable";
    scopeMode: "full" | "partial" | "top-files-only" | "precompute-required";
    analyzedAt: string | null;
    risk: {
      level: "high" | "medium" | "low" | "unavailable";
      score: number | null;
      gravity: number | null;
      impact: number | null;
      factors: string[];
    };
  }>;
}

interface LinkAnalysis {
  intent: "link";
  reference?: Array<{
    target: string;
    callers: string[];
    callees: string[];
  }>;
  dependency?: Array<{
    file: string;
    imports: string[];
    importedBy: string[];
  }>;
}

interface ShowAnalysis {
  intent: "show";
  overview?: Array<{
    title: string;
    file: string;
    overview: string;
    exports: string[];
  }>;
  documentation?: Array<{
    title: string;
    file: string;
    content: string;
  }>;
}
```

### analyze find failure semantics

- `diagnostics.status = "success"` 且 `results=[]`：扫描链路可信完成，表示真实 0 命中。
- `diagnostics.status = "partialFailure"`：主扫描退化，但配置感知 fallback 已返回可用结果；读取 `degradedTools[]` 和 `items[]`。
- `diagnostics.status = "failure"`：主扫描与 fallback 都失败，不能把 `results=[]` 当作“代码不存在”；JSON/machine 模式会设置非零 exit code。
- 通用查找默认仍推荐 `query -S "XXX" -j`；`analyze -i find -k "XXX" --json --structured` 用于需要统一 analyze schema 与 diagnostics 的 Agent 流程。

### 纯结构化输出 (--structured --json)

移除了 `content` 字段，只保留结构化数据：

```typescript
interface StructuredAnalyzeOutput {
  schemaVersion: "v1.0.0";
  intent: AnalyzeIntent;
  tool: string;
  confidence: {
    score: number;
    level: "high" | "medium" | "low";
  };
  results: StructuredResult[];
  warnings?: AnalyzeWarning[];
  analysis?: ReadAnalysis | LinkAnalysis | ShowAnalysis;
  metadata: {
    total: number;
    scope: string;
    resultCount: number;
  };
}

interface StructuredResult {
  file: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  // 注意：没有 content 字段
  relevance: number;
  metadata?: {
    [key: string]: unknown;
  };
}
```

### 示例

```json
{
  "schemaVersion": "v1.0.0",
  "intent": "read",
  "tool": "codemap-read",
  "confidence": {
    "score": 0.85,
    "level": "high"
  },
  "warnings": [
    {
      "code": "deprecated-intent",
      "severity": "warning",
      "message": "legacy intent \"impact\" 已弃用，请改用 \"read\"",
      "deprecatedIntent": "impact",
      "replacementIntent": "read",
      "sunsetPolicy": "2-minor-window"
    }
  ],
  "results": [
    {
      "file": "src/cli/commands/analyze.ts",
      "location": {
        "file": "src/cli/commands/analyze.ts",
        "line": 45,
        "column": 1
      },
      "content": "被 3 个模块依赖",
      "relevance": 0.95,
      "metadata": {
        "impactCount": 3,
        "dependencies": [
          "src/orchestrator/intent-router.ts"
        ],
        "riskLevel": "medium",
        "historyRisk": {
          "status": "ok",
          "level": "high",
          "confidence": "high",
          "freshness": "fresh",
          "score": 0.82,
          "factors": ["recent bugfixes"],
          "analyzedAt": "2026-04-15T00:00:00.000Z"
        }
      }
    }
  ],
  "analysis": {
    "intent": "read",
    "impact": [
      {
        "file": "src/cli/commands/analyze.ts",
        "changedFiles": [
          "src/cli/commands/analyze.ts"
        ],
        "transitiveDependencies": [
          "src/orchestrator/intent-router.ts"
        ],
        "impactCount": 3,
        "risk": "medium"
      }
    ],
    "history": [
      {
        "file": "src/cli/commands/analyze.ts",
        "status": "ok",
        "confidence": "high",
        "freshness": "fresh",
        "source": "git-live",
        "scopeMode": "full",
        "analyzedAt": "2026-04-15T00:00:00.000Z",
        "risk": {
          "level": "high",
          "score": 0.82,
          "gravity": 0.6,
          "impact": 0.8,
          "factors": ["recent bugfixes"]
        }
      }
    ]
  },
  "metadata": {
    "total": 8,
    "scope": "transitive",
    "resultCount": 8
  }
}
```

---

## design validate 命令输出结构

### JSON 输出 (--json)

```typescript
type DesignContractSectionId =
  | "goal"
  | "constraints"
  | "acceptanceCriteria"
  | "nonGoals"
  | "context"
  | "openQuestions"
  | "notes";

type DesignContractDiagnosticCode =
  | "file-not-found"
  | "missing-section"
  | "duplicate-section"
  | "empty-section"
  | "unknown-section"
  | "ambiguous-heading"
  | "invalid-frontmatter"
  | "invalid-rules-root"
  | "invalid-rule-type"
  | "missing-rule-field"
  | "invalid-rule-severity"
  | "unknown-rule-field"
  | "unknown-frontmatter-field";

interface DesignValidateOutput {
  ok: boolean;
  exists: boolean;
  filePath: string;
  title?: string;
  missingRequiredSections: Array<"goal" | "constraints" | "acceptanceCriteria" | "nonGoals">;
  diagnostics: DesignContractDiagnostic[];
  rules: Array<{
    name: string;
    type: "layer_direction" | "forbidden_imports" | "module_public_api_only";
    severity: "error" | "warn";
  }>;
  sections: Array<{
    id: DesignContractSectionId;
    title: string;
    line: number;
    itemCount: number;
  }>;
}

interface DesignContractDiagnostic {
  code: DesignContractDiagnosticCode;
  severity: "error" | "warning" | "info";
  message: string;
  section?: DesignContractSectionId;
  heading?: string;
  line?: number;
  suggestion?: string;
}
```

### 示例

```json
{
  "ok": false,
  "exists": true,
  "filePath": "/repo/mycodemap.design.md",
  "title": "Design Contract: Missing acceptance example",
  "missingRequiredSections": [
    "acceptanceCriteria"
  ],
  "rules": [],
  "diagnostics": [
    {
      "code": "missing-section",
      "severity": "error",
      "message": "缺少必填 section: Acceptance Criteria",
      "section": "acceptanceCriteria"
    }
  ],
  "sections": [
    {
      "id": "goal",
      "title": "Goal",
      "line": 3,
      "itemCount": 1
    }
  ]
}
```

> `design validate --json` 必须保持纯 JSON；不要在前后拼接说明性 prose。

---

## check 命令输出结构

### JSON 输出（默认）

```typescript
interface ContractCheckResult {
  passed: boolean;
  scan_mode: "full" | "diff";
  contract_path: string;
  against_path: string;
  changed_files: string[];
  scanned_files: string[];
  warnings: Array<{
    code: string;
    message: string;
    details?: Record<string, string | number | boolean | null>;
  }>;
  history?: {
    status: "ok" | "ambiguous" | "not_found" | "unavailable";
    confidence: "high" | "medium" | "low" | "unavailable";
    freshness: "fresh" | "stale" | "expired" | "unknown";
    scope_mode: "full" | "partial" | "top-files-only" | "precompute-required";
    enriched_file_count: number;
    unavailable_count: number;
    stale_count: number;
    low_confidence_count: number;
    requires_precompute: boolean;
  };
  violations: Array<{
    rule: string;
    rule_type: "layer_direction" | "forbidden_imports" | "module_public_api_only" | "complexity_threshold";
    severity: "error" | "warn";
    location: string;
    message: string;
    dependency_chain: string[];
    hard_fail: boolean;
    diagnostic?: {
      file?: string;
      line?: number;
      column?: number;
      endLine?: number;
      endColumn?: number;
      scope: "line" | "file" | "general";
      source: "dependency-cruiser" | "custom-evaluator";
      category: "dependency" | "module_boundary" | "complexity";
      degraded: boolean;
    };
    risk?: {
      status: "ok" | "ambiguous" | "not_found" | "unavailable";
      level: "high" | "medium" | "low" | "unavailable";
      confidence: "high" | "medium" | "low" | "unavailable";
      freshness: "fresh" | "stale" | "expired" | "unknown";
      score: number | null;
      factors: string[];
      analyzed_at: string | null;
    };
  }>;
  summary: {
    total_violations: number;
    error_count: number;
    warn_count: number;
    scanned_file_count: number;
    rule_count: number;
  };
}
```

### 示例

```json
{
  "passed": false,
  "scan_mode": "diff",
  "contract_path": "/repo/mycodemap.design.md",
  "against_path": "src",
  "changed_files": ["src/domain/index.ts"],
  "scanned_files": ["src/app/use-domain.ts", "src/domain/index.ts"],
  "warnings": [
    {
      "code": "hard-gate-window-exceeded",
      "message": "changed files=11 超出 calibrated hard-gate window <=10",
      "details": {
        "calibrated": false,
        "changed_files": 11,
        "max_changed_files": 10,
        "recommended_mode": "warn-only"
      }
    }
  ],
  "history": {
    "status": "ok",
    "confidence": "high",
    "freshness": "fresh",
    "scope_mode": "full",
    "enriched_file_count": 1,
    "unavailable_count": 0,
    "stale_count": 0,
    "low_confidence_count": 0,
    "requires_precompute": false
  },
  "violations": [
    {
      "rule": "app 不可依赖 domain barrel",
      "rule_type": "layer_direction",
      "severity": "error",
      "location": "src/app/use-domain.ts",
      "message": "src/app/use-domain.ts 依赖 src/domain/index.ts，违反规则 app 不可依赖 domain barrel",
      "dependency_chain": ["src/app/use-domain.ts", "src/domain/index.ts"],
      "hard_fail": true,
      "diagnostic": {
        "file": "src/app/use-domain.ts",
        "line": 3,
        "column": 1,
        "scope": "line",
        "source": "dependency-cruiser",
        "category": "dependency",
        "degraded": false
      },
      "risk": {
        "status": "ok",
        "level": "high",
        "confidence": "high",
        "freshness": "fresh",
        "score": 0.88,
        "factors": ["recent bugfixes", "high blast radius"],
        "analyzed_at": "2026-04-15T00:00:00.000Z"
      }
    }
  ],
  "summary": {
    "total_violations": 1,
    "error_count": 1,
    "warn_count": 0,
    "scanned_file_count": 2,
    "rule_count": 1
  }
}
```

> `check` 默认就是纯 JSON；`--human` 只改变渲染，不改变底层 `ContractCheckResult` truth。
> Git history risk 是 additive enrichment：它补充 `history` 与 `violations[].risk`，但不会改变 `severity:error` / exit 语义。history 不可用时应显式返回 `unavailable` / warning，而不是伪装成低风险。
> CI-native truth：PR 默认 hard gate 仅在 calibration 通过且 `changed files <= 10` 时启用；若出现 `diff-scope-fallback`、`hard-gate-window-exceeded` 或 `false-positive rate >10%`，CI 必须回退 `warn-only / fallback`。校准命令：`node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10`

### Annotation-friendly diagnostics

```typescript
interface ContractViolationDiagnostic {
  file?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  scope: "line" | "file" | "general";
  source: "dependency-cruiser" | "custom-evaluator";
  category: "dependency" | "module_boundary" | "complexity";
  degraded: boolean;
}

type ContractGateRecommendation = "hard-gate-ok" | "warn-only" | "re-scope";

interface GitLabContractAnnotation {
  description: string;
  check_name: string;
  fingerprint: string;
  severity: "major" | "minor";
  location: {
    path: string;
    lines: {
      begin: number;
    };
  };
}
```

- `--annotation-format github` 会直接输出 GitHub Actions annotations；允许 file-scoped degraded diagnostics，但不会伪造不存在的行号。
- `--annotation-format gitlab --annotation-file gl-code-quality-report.json` 会输出 GitLab Code Quality artifact；只包含 `scope="line"` 且有 `line` 的 diagnostics。
- `recommended_mode` 是 CI 编排 truth：当 calibration 失败、`changed files <= 10` 条件不满足或 false-positive 漂移时，workflow 必须走 `warn-only / fallback`。

---

## history 命令输出结构

### JSON 输出（默认）

```typescript
interface HistoryCommandResult {
  query: string;
  status: "ok" | "ambiguous" | "not_found" | "unavailable";
  symbol: null | {
    name: string;
    kind: string;
    file: string;
    line: number;
  };
  candidates: Array<{
    symbolId: string;
    name: string;
    file: string;
    line: number;
  }>;
  files: string[];
  warnings: string[];
  risk: {
    level: "high" | "medium" | "low" | "unavailable";
    score: number | null;
    riskFactors: string[];
  };
}
```

### 失败语义

- `ok`: 找到唯一 symbol，并返回 timeline + risk
- `ambiguous`: 找到多个候选 symbol，不自动合并
- `not_found`: storage 中找不到 symbol
- `unavailable`: Git history 不可用或无持久化快照

---

## design map 命令输出结构

### JSON 输出 (--json)

```typescript
type DesignMappingCandidateKind = "file" | "module" | "symbol";

type DesignMappingDiagnosticCode =
  | "no-candidates"
  | "over-broad-scope"
  | "high-risk-scope"
  | string;

interface DesignMappingReason {
  section: DesignContractSectionId;
  matchedText: string;
  evidenceType: string;
}

interface DesignMappingCandidate {
  kind: DesignMappingCandidateKind;
  path: string;
  moduleName?: string;
  symbolName?: string;
  reasons: DesignMappingReason[];
  dependencies: string[];
  testImpact: string[];
  risk: "high" | "medium" | "low";
  confidence: {
    score: number;
    level: "high" | "medium" | "low";
  };
  unknowns: string[];
}

interface DesignMappingDiagnostic {
  code: DesignMappingDiagnosticCode;
  severity: "error" | "warning" | "info";
  blocker: boolean;
  message: string;
  candidatePaths?: string[];
}

interface DesignMapOutput {
  ok: boolean;
  filePath: string;
  summary: {
    candidateCount: number;
    blocked: boolean;
    unknownCount: number;
    diagnosticCount: number;
  };
  candidates: DesignMappingCandidate[];
  diagnostics: DesignMappingDiagnostic[];
}
```

### 示例

```json
{
  "ok": false,
  "filePath": "/repo/mycodemap.design.md",
  "summary": {
    "candidateCount": 1,
    "blocked": true,
    "unknownCount": 0,
    "diagnosticCount": 1
  },
  "candidates": [
    {
      "kind": "file",
      "path": "src/cli/commands/analyze.ts",
      "reasons": [
        {
          "section": "goal",
          "matchedText": "src/cli/commands/analyze.ts",
          "evidenceType": "path-anchor"
        }
      ],
      "dependencies": [],
      "testImpact": [],
      "risk": "high",
      "confidence": {
        "score": 0.92,
        "level": "high"
      },
      "unknowns": []
    }
  ],
  "diagnostics": [
    {
      "code": "high-risk-scope",
      "severity": "error",
      "blocker": true,
      "message": "候选范围命中了高 blast-radius 文件；请先补充更具体的 design scope，再继续执行。"
    }
  ]
}
```

> `design map --json` 必须保持纯 JSON；不要在前后拼接说明性 prose。`unknowns` 与 `diagnostics` 都属于正式契约，不是可选注释。

---

## design handoff 命令输出结构

### JSON 输出 (--json)

```typescript
type DesignHandoffApprovalStatus = "approved" | "needs-review";

interface DesignHandoffTraceItem {
  id: string;
  text: string;
  sourceRefs: string[];
}

interface DesignHandoffOutput {
  ok: boolean;
  filePath: string;
  outputDir: string;
  readyForExecution: boolean;
  artifacts: {
    markdownPath: string;
    jsonPath: string;
  };
  summary: {
    approvalCount: number;
    assumptionCount: number;
    openQuestionCount: number;
    requiresReview: boolean;
  };
  handoff: {
    touchedFiles: string[];
    constraints: string[];
    tests: string[];
    approvals: Array<DesignHandoffTraceItem & {
      status: DesignHandoffApprovalStatus;
    }>;
    assumptions: DesignHandoffTraceItem[];
    openQuestions: DesignHandoffTraceItem[];
  };
  diagnostics: Array<{
    code: "blocked-mapping" | "review-required" | string;
    blocker: boolean;
    message: string;
  }>;
}
```

### 示例

```json
{
  "ok": true,
  "filePath": "/repo/mycodemap.design.md",
  "outputDir": "/repo/.mycodemap/handoffs",
  "readyForExecution": false,
  "artifacts": {
    "markdownPath": "/repo/.mycodemap/handoffs/mycodemap.handoff.md",
    "jsonPath": "/repo/.mycodemap/handoffs/mycodemap.handoff.json"
  },
  "summary": {
    "approvalCount": 4,
    "assumptionCount": 1,
    "openQuestionCount": 1,
    "requiresReview": true
  },
  "handoff": {
    "touchedFiles": [
      "src/cli/design-handoff-builder.ts"
    ],
    "constraints": [
      "默认 artifact path 必须复用 src/cli/paths.ts"
    ],
    "tests": [
      "src/cli/__tests__/design-handoff-builder.test.ts"
    ],
    "approvals": [
      {
        "id": "approved-goal",
        "status": "approved",
        "text": "Goal 已被纳入 handoff 事实输入",
        "sourceRefs": ["design:goal"]
      }
    ],
    "assumptions": [
      {
        "id": "assumption-1-1",
        "text": "需要补充 reviewer 对未知范围的确认",
        "sourceRefs": ["candidate:src/cli/design-handoff-builder.ts"]
      }
    ],
    "openQuestions": [
      {
        "id": "open-question-1",
        "text": "低风险 assumptions 是否也必须显式批准？",
        "sourceRefs": ["design:openQuestions"]
      }
    ]
  },
  "diagnostics": [
    {
      "code": "review-required",
      "blocker": false,
      "message": "Handoff generated successfully but still requires human review before execution."
    }
  ]
}
```

> `design handoff --json` 必须保持纯 JSON；`readyForExecution`、`approvals`、`assumptions`、`openQuestions` 都属于正式契约。human mode 默认写出 `.mycodemap/handoffs/{stem}.handoff.md|json`。

---

## design verify 命令输出结构

### JSON 输出 (--json)

```typescript
type DesignVerificationStatus =
  | "satisfied"
  | "needs-review"
  | "violated"
  | "blocked";

type DesignDriftKind =
  | "scope-extra"
  | "acceptance-unverified"
  | "handoff-missing"
  | "blocked-input";

interface DesignVerificationOutput {
  ok: boolean;
  filePath: string;
  readyForExecution: boolean;
  summary: {
    checklistCount: number;
    satisfiedCount: number;
    needsReviewCount: number;
    violatedCount: number;
    blockedCount: number;
    driftCount: number;
    diagnosticCount: number;
    reviewRequired: boolean;
    blocked: boolean;
  };
  checklist: Array<{
    id: string;
    text: string;
    status: DesignVerificationStatus;
    evidenceRefs: string[];
  }>;
  drift: Array<{
    kind: DesignDriftKind;
    severity: "error" | "warning" | "info";
    message: string;
    sourceRefs: string[];
  }>;
  diagnostics: Array<{
    code: "handoff-missing" | "handoff-invalid" | "blocked-input" | string;
    blocker: boolean;
    message: string;
    sourceRefs: string[];
  }>;
}
```

### 示例

```json
{
  "ok": true,
  "filePath": "/repo/tests/fixtures/design-contracts/verify-ready.design.md",
  "readyForExecution": false,
  "summary": {
    "checklistCount": 3,
    "satisfiedCount": 1,
    "needsReviewCount": 2,
    "violatedCount": 0,
    "blockedCount": 0,
    "driftCount": 3,
    "diagnosticCount": 1,
    "reviewRequired": true,
    "blocked": false
  },
  "checklist": [
    {
      "id": "acceptance-1",
      "text": "src/cli/design-verification-builder.ts 会产出 conservative verification result",
      "status": "satisfied",
      "evidenceRefs": [
        "candidate:src/cli/design-verification-builder.ts",
        "diagnostic:handoff-missing"
      ]
    },
    {
      "id": "acceptance-2",
      "text": "src/interface/types/design-verification.ts 会定义正式 verification schema",
      "status": "needs-review",
      "evidenceRefs": [
        "design:acceptanceCriteria"
      ]
    }
  ],
  "drift": [
    {
      "kind": "handoff-missing",
      "severity": "warning",
      "message": "Canonical handoff artifact is missing, so verification remains review-needed even though a live handoff was rebuilt.",
      "sourceRefs": [
        "diagnostic:handoff-missing"
      ]
    }
  ],
  "diagnostics": [
    {
      "code": "handoff-missing",
      "blocker": false,
      "message": "Canonical handoff artifact is missing, so verification remains review-needed even though a live handoff was rebuilt.",
      "sourceRefs": [
        "diagnostic:handoff-missing"
      ]
    }
  ]
}
```

> `design verify --json` 必须保持纯 JSON；`checklist` 与 `drift` 都属于正式契约。`readyForExecution=false` 不等于 blocker，只有 `ok=false` 或 blocker diagnostics 才应返回非零 exit code。

---

## impact 命令输出结构

### JSON 输出 (-j)

```typescript
interface ImpactOutput {
  file: string;
  direct: ImpactItem[];
  transitive?: ImpactItem[];
  stats: {
    directCount: number;
    transitiveCount?: number;
  };
}

interface ImpactItem {
  file: string;
  type: "import" | "export" | "dependency";
  relevance?: number;
}
```

### 示例

```json
{
  "file": "src/cli/index.ts",
  "direct": [
    { "file": "src/cli/commands/analyze.ts", "type": "import", "relevance": 0.95 },
    { "file": "src/cli/commands/query.ts", "type": "import", "relevance": 0.90 }
  ],
  "transitive": [
    { "file": "src/orchestrator/intent-router.ts", "type": "dependency", "relevance": 0.75 }
  ],
  "stats": {
    "directCount": 5,
    "transitiveCount": 12
  }
}
```

---

## deps 命令输出结构

### JSON 输出 (-j)

```typescript
interface DepsOutput {
  module: string;
  dependencies: DependencyItem[];
  dependents?: DependencyItem[];
}

interface DependencyItem {
  source: string;
  target: string;
  type: "import" | "export" | "dependency";
}
```

### 示例

```json
{
  "module": "src/domain/services",
  "dependencies": [
    {
      "source": "src/domain/services/CodeGraphBuilder.ts",
      "target": "src/interface/types",
      "type": "import"
    }
  ],
  "dependents": [
    {
      "source": "src/infrastructure/repositories",
      "target": "src/domain/services",
      "type": "import"
    }
  ]
}
```

---

## complexity 命令输出结构

### JSON 输出 (-j)

```typescript
interface ComplexityOutput {
  files: FileComplexity[];
  summary: {
    averageComplexity: number;
    maxComplexity: number;
    totalFiles: number;
  };
}

interface FileComplexity {
  file: string;
  complexity: number;
  maintainability: number;  // 0-100
  functions?: FunctionComplexity[];
}

interface FunctionComplexity {
  name: string;
  line: number;
  complexity: number;       // 圈复杂度
  cognitive: number;        // 认知复杂度
}
```

---

## cycles 命令输出结构

### JSON 输出 (-j)

```typescript
interface CyclesOutput {
  cycles: Cycle[];
  count: number;
  maxDepth: number;
}

interface Cycle {
  path: string[];           // 循环依赖的文件路径
  length: number;
}
```

### 示例

```json
{
  "cycles": [
    {
      "path": [
        "src/core/analyzer.ts",
        "src/core/global-index.ts",
        "src/core/analyzer.ts"
      ],
      "length": 3
    }
  ],
  "count": 1,
  "maxDepth": 3
}
```

---

## 输出处理工具函数

### TypeScript 示例

```typescript
// 从 analyze 结果中提取文件列表
function extractFilesFromAnalyze(output: string): string[] {
  const data: AnalyzeOutput = JSON.parse(output);
  return data.results
    .map(r => r.location?.file || r.file)
    .filter((v, i, a) => a.indexOf(v) === i); // 去重
}

// 从 impact 结果中提取需要测试的文件
function extractTestCandidates(output: string): string[] {
  const data: AnalyzeOutput = JSON.parse(output);
  return data.results
    .filter(r => r.metadata?.testFile)
    .map(r => r.metadata!.testFile!)
    .filter((v, i, a) => a.indexOf(v) === i);
}

// 检查置信度是否足够高
function isConfidenceHigh(output: string): boolean {
  const data: AnalyzeOutput = JSON.parse(output);
  return data.confidence?.level === 'high' && 
         data.confidence?.score >= 0.7;
}

// 按相关度排序结果
function sortByRelevance(output: string): AnalyzeResult[] {
  const data: AnalyzeOutput = JSON.parse(output);
  return [...data.results].sort((a, b) => b.relevance - a.relevance);
}

// 过滤结果（例如只取相关度 > 0.5 的）
function filterByRelevance(output: string, threshold: number): AnalyzeResult[] {
  const data: AnalyzeOutput = JSON.parse(output);
  return data.results.filter(r => r.relevance >= threshold);
}

// 分组统计（按文件目录）
function groupByDirectory(output: string): Record<string, number> {
  const data: AnalyzeOutput = JSON.parse(output);
  const groups: Record<string, number> = {};
  
  for (const result of data.results) {
    const dir = result.file.split('/').slice(0, -1).join('/');
    groups[dir] = (groups[dir] || 0) + 1;
  }
  
  return groups;
}
```

### Python 示例

```python
import json
from typing import List, Dict, Any

def extract_files_from_analyze(output: str) -> List[str]:
    data = json.loads(output)
    files = [r.get('location', {}).get('file') or r.get('file') 
             for r in data.get('results', [])]
    return list(set(files))  # 去重

def is_confidence_high(output: str) -> bool:
    data = json.loads(output)
    confidence = data.get('confidence', {})
    return (confidence.get('level') == 'high' and 
            confidence.get('score', 0) >= 0.7)

def sort_by_relevance(output: str) -> List[Dict[str, Any]]:
    data = json.loads(output)
    results = data.get('results', [])
    return sorted(results, key=lambda x: x.get('relevance', 0), reverse=True)
```

---

## 置信度解读

| 等级 | 分数范围 | 含义 | 建议 |
|------|---------|------|------|
| high | 0.7 - 1.0 | 高置信度 | 可放心使用结果 |
| medium | 0.4 - 0.7 | 中等置信度 | 建议人工复核 |
| low | 0.0 - 0.4 | 低置信度 | 扩大搜索范围或换关键词 |

---

## 相关度解读

| 分数范围 | 含义 |
|---------|------|
| 0.9 - 1.0 | 高度相关（精确匹配或核心依赖） |
| 0.7 - 0.9 | 非常相关（直接依赖） |
| 0.5 - 0.7 | 相关（间接依赖或相似命名） |
| 0.3 - 0.5 | 弱相关（可能相关） |
| 0.0 - 0.3 | 低相关（仅供参考） |
