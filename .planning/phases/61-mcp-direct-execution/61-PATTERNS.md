# Phase 61: MCP Direct Execution - Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 10
**Analogs found:** 5 / 5 关注模式

## File Classification

| Phase 61 目标文件 | 角色 | 数据流 | 最接近现有 analog | 匹配质量 |
|---|---|---|---|---|
| `src/server/mcp/schema-adapter.ts` | adapter | request-response | `src/server/mcp/server.ts` + `src/server/mcp/service.ts` | partial |
| `src/server/mcp/server.ts` | server/transport | request-response | `src/server/mcp/server.ts` 原生 native tool 注册段 | exact |
| `src/server/mcp/types.ts` | type/model | transform | `src/server/mcp/types.ts` 现有 MCP envelope typing | exact |
| `src/cli/commands/query.ts` | command/wrapper | request-response | `src/cli/commands/publish-status.ts` | role-match |
| `src/cli/commands/deps.ts` | command/wrapper + service seed | CRUD/read | `src/cli/commands/publish-status.ts` + `src/cli/commands/deps.ts` 中 `DepsCommand` | role-match |
| `src/cli/commands/analyze.ts` | command/wrapper + orchestrated service | request-response / fallback | `src/cli/commands/analyze.ts` 中 `AnalyzeCommand.executeWithOrchestrator()` | exact |
| `src/server/mcp/__tests__/dynamic-server.test.ts` | integration test | request-response | `src/server/mcp/__tests__/env-contract-tool.test.ts` | role-match |
| `src/server/mcp/__tests__/env-contract-tool.test.ts` | integration test | request-response | `src/server/mcp/__tests__/env-contract-tool.test.ts` | exact |
| `新共享 executor/service 文件（命名待定）` | service | request-response | `src/server/mcp/service.ts` + `src/cli/commands/publish-status.ts` | role-match |
| `新 executor 单测/集成测试（命名待定）` | test | request-response | `src/cli/commands/__tests__/publish-status-command.test.ts` + `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | role-match |

## Pattern Assignments

### 1. MCP native tool / service pattern

**Source files**
- `src/server/mcp/server.ts:36`
- `src/server/mcp/server.ts:175`
- `src/server/mcp/service.ts:53`
- `src/server/mcp/service.ts:117`

**可直接复用的点**
- `server.ts` 负责 transport 和 registration，业务结果来自 service，而不是直接在 `registerTool()` 里拼业务逻辑。见 `src/server/mcp/server.ts:36-55`、`112-137`。
- MCP handler 的返回形态已经固定为：
  - `content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }]`
  - `structuredContent`
  - `isError: structuredContent.status !== 'ok'`
  见 `src/server/mcp/server.ts:47-54`、`129-136`。
- service 层负责：
  - 读取 runtime truth
  - 做输入归一化/限幅
  - 构造统一 envelope
  - 把业务 payload 填入 envelope
  见 `src/server/mcp/service.ts:53-79`、`120-163`、`165-223`。

**建议给 Phase 61 复制的代码骨架**
```ts
const structuredContent = await service.someExecutorBackedMethod(args);

return {
  content: [{ type: 'text', text: renderStructuredContent(structuredContent) }],
  structuredContent,
  isError: structuredContent.status !== 'ok',
};
```

**Phase 61 应避免的反模式**
- 不要把 `query/deps/analyze` 的真实执行逻辑直接塞进 `registerTool()` 回调里。
- 不要让 MCP handler 重新解析 CLI 参数、重新拼 human 文本、重新做 fallback 决策。
- 不要让 MCP path 和 CLI path 分别维护两套结果判定逻辑。

---

### 2. contract-backed schema adapter pattern

**Source files**
- `src/server/mcp/schema-adapter.ts:269`
- `src/server/mcp/schema-adapter.ts:286`
- `src/server/mcp/schema-adapter.ts:317`
- `src/server/mcp/schema-adapter.ts:331`
- `src/server/mcp/server.ts:140`

**可直接复用的点**
- contract -> MCP tool discovery 这层已经是可用资产：
  - flag 转 input schema
  - output schema 暴露给 `listTools()`
  - alias/tool-name normalization
  见 `src/server/mcp/schema-adapter.ts:331-359`。
- `server.ts` 已经支持 selective override：先注册 native tools，再注册 contract tools，并保留 reservedNames 冲突处理。见 `src/server/mcp/server.ts:140-171`、`182-185`。
- 这意味着 Phase 61 不必推翻动态注册机制，只需要把 `query/deps/analyze` 从 `cli_redirect handler` 升级成“contract 驱动 schema + executor 驱动 handler”。

**推荐复用方式**
- 保留 `convertFlagsToZodShape()`、`normalizeToolNameSegment()`、tool metadata 生成。
- 把 `createCliAvailabilityHandler()` 替换为“executor-backed handler factory”，只对 `query/deps/analyze` 生效，其余命令暂时保持 redirect。
- `outputSchema` 不应再绑定 `cliRedirectOutputSchema`；应改为“统一 outer envelope + native result payload”的 schema。

**Phase 61 应避免的反模式**
- 不要删除 contract registry，然后为 `query/deps/analyze` 手写第二份 schema。
- 不要继续让 `structuredContent.status = 'cli_redirect'` 作为成功路径。现状见 `src/server/mcp/schema-adapter.ts:295-303`、`317-325`。
- 不要让 `query/deps/analyze` 成为特例到无法再从 contract metadata discover。

---

### 3. CLI thin-wrapper / shared service seam pattern

**Source files**
- `src/cli/commands/publish-status.ts:35`
- `src/cli/commands/publish-status.ts:111`
- `src/cli/commands/publish-status.ts:123`
- `src/cli/commands/query.ts:819`
- `src/cli/commands/deps.ts:303`
- `src/cli/commands/analyze.ts:1490`
- `src/cli/commands/analyze.ts:234`
- `src/cli/storage-runtime.ts:14`

**最接近的现有正向样板**
- `publish-status` 是当前最干净的“共享执行 + 薄 CLI wrapper”模式：
  - `executePublishStatusCommand()` 只返回结构化结果，见 `src/cli/commands/publish-status.ts:111-120`
  - `handlePublishStatusCommand()` 只做 `--structured` 守卫与输出渲染，见 `src/cli/commands/publish-status.ts:123-138`
  - `renderPublishStatusResult()` 是单独 renderer，见 `src/cli/commands/publish-status.ts:75-109`
- `analyze` 内部已经有半成品 seam：`AnalyzeCommand.executeWithOrchestrator()` 把实际执行收敛到 orchestrator，见 `src/cli/commands/analyze.ts:234-287`。
- `storage-runtime` 是共享 runtime bootstrap 的现成入口，见 `src/cli/storage-runtime.ts:14-22`。

**Phase 61 可复用的具体拆分**
- 新 executor/service 应负责：
  - runtime bootstrap
  - 核心 business execution
  - diagnostics/error mapping
  - 返回统一 envelope
- CLI wrapper 应只保留：
  - 参数解析
  - output mode 决策
  - progress emitter
  - renderer 调用
  - exit code 落点

**现有厚 wrapper 症状，Phase 61 要削薄**
- `query` 当前把加载索引、分支选择、metrics、structured strip、错误渲染都堆在一个函数里。见 `src/cli/commands/query.ts:819-933`。
- `deps` 当前 wrapper 直接加载 codeMap、选择目标模块、构造输出数据。见 `src/cli/commands/deps.ts:303-347`。
- `analyze` 外层 wrapper 已经较薄，但核心 `AnalyzeCommand` 仍承担过多执行与 fallback 细节；Phase 61 至少要把 MCP/CLI 公共真相抽到共享 executor，而不是仅让 MCP 调 CLI wrapper。

**Phase 61 应避免的反模式**
- 不要让 MCP 直接调用 `queryCommand()` / `depsCommand()` / `analyzeCommand()` 这类带 stdout/process.exitCode 的 wrapper。
- 不要新建 executor 后，CLI 仍旧保留一套旧执行分支，导致“双真相”。
- 不要让 shared service 依赖 `renderOutput()`、`chalk`、TTY 或 `process.stdout`。

---

### 4. structured success / failure envelope pattern

**Source files**
- `src/server/mcp/types.ts:7`
- `src/server/mcp/types.ts:30`
- `src/server/mcp/service.ts:53`
- `src/server/mcp/service.ts:65`
- `src/server/mcp/service.ts:120`
- `src/server/mcp/service.ts:165`
- `src/cli/commands/publish-status.ts:22`
- `src/cli/commands/publish-status.ts:35`

**现有 envelope 事实**
- MCP 现有 native tool envelope 已经体现出 Phase 61 想要的方向：
  - `status`
  - 主结果字段
  - `error`
  - 诊断上下文（如 `graph_status` / `generated_at` / parse failure 信息）
  见 `src/server/mcp/types.ts:30-63`。
- `createErrorResult()` 是很好的统一失败构造器，见 `src/server/mcp/service.ts:65-79`。
- `publish-status` 则展示了 CLI 侧结构化结果中“machine payload 与 human content 可分离”的模式，见 `src/cli/commands/publish-status.ts:35-55`。

**Phase 61 推荐 envelope 方向**
- 外层统一字段建议保持接近 Context 决议：
  - `status`
  - `result`
  - `error`
  - `diagnostics`
- 其中 `result` 保持 command-native payload：
  - `query` 继续返回现有 `type/query/count/results/metrics`
  - `deps` 继续返回现有 `module/allDependencies/modules`
  - `analyze` 继续返回现有 `intent/results/metadata/confidence`
- `diagnostics` 应承接 runtime 维度信息，而不是 CLI prose。

**可复制实现习惯**
- 失败不要抛给 MCP transport 层做隐式字符串化；要返回结构化失败对象并设置 `isError`。
- 成功/失败都返回相同外层形状，只让 `status` 和 `error` 差异化。
- 如果需要 human 文本，像 `publish-status` 一样放在可选 `content` 或 renderer，而不是污染结构化 payload。

**Phase 61 应避免的反模式**
- 不要直接复用 `formatError(error, mode, 'codemap ...')` 的 CLI prose 作为 MCP error payload。
- 不要让成功返回 native payload、失败返回完全不同字符串对象。
- 不要把 diagnostics 丢到日志里而不放入 structured result。

---

### 5. tests proving success + failure without `cli_redirect`

**Source files**
- `src/server/mcp/__tests__/env-contract-tool.test.ts:27`
- `src/server/mcp/__tests__/env-contract-tool.test.ts:90`
- `src/server/mcp/__tests__/dynamic-server.test.ts:84`
- `src/server/mcp/__tests__/dynamic-server.test.ts:104`
- `src/server/mcp/__tests__/schema-adapter.test.ts:256`
- `src/cli/commands/__tests__/publish-status-command.test.ts:25`
- `src/cli/commands/__tests__/publish-status-command.test.ts:56`
- `src/cli/commands/__tests__/publish-status-command.test.ts:81`
- `src/server/mcp/__tests__/CodeMapMcpServer.test.ts:237`
- `src/server/mcp/__tests__/CodeMapMcpServer.test.ts:264`

**推荐测试模式**
- MCP integration test 用真实 `Client` + `PassThrough` + `StdioServerTransport`，不要走 CLI redirect。见 `src/server/mcp/__tests__/env-contract-tool.test.ts:27-53`。
- 成功路径断言：
  - `structured.status !== 'cli_redirect'`
  - payload 关键字段正确
  - `listTools()` 仍暴露 schema/metadata
  见 `src/server/mcp/__tests__/env-contract-tool.test.ts:90-107`。
- 失败路径断言：
  - `status` 为显式失败态
  - 错误码/diagnostics 存在
  - `isError` 与 envelope 一致
  可复用 `CodeMapMcpServer.test.ts` 对 `GRAPH_NOT_FOUND`、`SYMBOL_NOT_FOUND`、`AMBIGUOUS_EDGE` 的断言风格，见 `src/server/mcp/__tests__/CodeMapMcpServer.test.ts:264-296`。
- CLI thin wrapper 测试应像 `publish-status`：
  - mock 底层 service
  - 分别验证 human/json/structured 三种输出
  - 验证非法参数组合失败
  见 `src/cli/commands/__tests__/publish-status-command.test.ts:25-123`。

**Phase 61 需要替换的旧测试预期**
- `dynamic-server.test.ts` 当前仍断言 `codemap_analyze` / `codemap_deps` 返回 `cli_redirect`，见 `src/server/mcp/__tests__/dynamic-server.test.ts:84-119`。
- `schema-adapter.test.ts` 当前也把 `cli_redirect` 当 contract handler 正确输出，见 `src/server/mcp/__tests__/schema-adapter.test.ts:256-277`。

**Phase 61 应避免的反模式**
- 不要只验证 `listTools()`，不验证真实调用。
- 不要只测成功路径；至少补一个结构化失败路径。
- 不要通过断言 “返回某个 CLI 命令字符串” 来证明 direct execution 完成。

## Shared Patterns

### Shared runtime bootstrap
**Source:** `src/cli/storage-runtime.ts:14-22`  
**Apply to:** 新共享 executor/service

```ts
export async function createConfiguredStorage(rootDir: string = cwd()): Promise<LoadedStorageRuntime> {
  const loadedConfig = await loadCodemapConfig(rootDir);
  const storage = await storageFactory.createForProject(rootDir, loadedConfig.config.storage);

  return {
    loadedConfig,
    storage,
  };
}
```

用途：Phase 61 的 executor 若需要 storage/backend truth，应从这里进入，不要在 MCP adapter 或 CLI wrapper 各自散落初始化逻辑。

### Service-owned error shaping
**Source:** `src/server/mcp/service.ts:65-79`

```ts
function createErrorResult<T extends McpQueryResult | McpImpactResult>(
  metadata: GraphMetadata,
  status: McpToolStatus,
  confidence: McpToolConfidence,
  error: McpToolError,
  base: Omit<T, 'status' | 'confidence' | 'error' | 'graph_status' | 'generated_at' | 'failed_file_count' | 'parse_failure_files'>
): T {
  return {
    status,
    confidence,
    error,
    ...buildGraphEnvelope(metadata),
    ...base,
  } as T;
}
```

用途：Phase 61 的外层 envelope 适合沿用“统一失败构造器”思路。

### Thin wrapper split
**Source:** `src/cli/commands/publish-status.ts:111-138`

```ts
export async function executePublishStatusCommand(
  options: PublishStatusCommandOptions,
): Promise<PublishStatusCommandResult> {
  const snapshot = await snapshotPublishStatus({
    tagName: options.tag,
    headSha: options.sha,
    workflowFile: options.workflowFile,
  });

  return toCommandResult(snapshot, options.structured === true);
}

export async function handlePublishStatusCommand(
  options: PublishStatusCommandOptions,
): Promise<void> {
  if (options.structured && !options.json) {
    throw new Error('--structured 需要配合 --json 使用');
  }

  const result = await executePublishStatusCommand(options);
  // output only
}
```

用途：Phase 61 的 `query/deps/analyze` wrapper 应向这个结构靠拢。

### Orchestrated execution seam
**Source:** `src/cli/commands/analyze.ts:234-287`  
**Apply to:** `analyze` 的 shared executor 抽取

关键点：已有 `ToolOrchestrator` + `ResultFusion` + adapter 注册逻辑，Phase 61 应抽共享真相，不要在 MCP 侧重写同一套编排。

## No Analog Found

| 文件 | 角色 | 数据流 | 原因 |
|---|---|---|---|
| 无 | - | - | Phase 61 五类关注模式都能在现有代码里找到可用类比，只是没有“query/deps/analyze 已完成 direct execution”的现成成品。 |

## Metadata

**Analog search scope:** `src/server/mcp/`, `src/cli/commands/`, `src/cli/interface-contract/`, `src/orchestrator/`, `src/server/mcp/__tests__/`, `src/cli/commands/__tests__/`  
**Files scanned:** 17  
**Pattern extraction date:** 2026-05-06
