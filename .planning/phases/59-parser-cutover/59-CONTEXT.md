# Phase 59: Parser Cutover - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Collapse parser selection to a single Tree-sitter-based main path and remove threshold-driven `fast` / `hybrid` runtime behavior from the active analysis flow. The MVP3 `ParserRegistry` becomes the single truth for parser resolution; legacy `createParser()` becomes a thin delegation wrapper; `SmartParser` is reduced to an optional `TypeScriptTypeEnhancer` post-processor; deprecated mode requests fail with structured error via Failure-to-Action Protocol.

</domain>

<decisions>
## Implementation Decisions

### Parser 主入口归属
- **D-01:** MVP3 `ParserRegistry`（`src/infrastructure/parser/registry/ParserRegistry.ts`）是 parser 解析的单一真相源。`getParserByFile()` 按文件扩展名路由到 TS/Python/Go parser。
- **D-02:** `createParser()`（`src/parser/index.ts`）保留为薄封装委托层——内部委托给 `ParserRegistry.getParserByFile()`，保留函数签名兼容性，外部调用方无需改动。
- **D-03:** `src/core/analyzer.ts` 改内部实现——内部改用 registry 获取 parser，移除 hybrid 阈值逻辑（`HYBRID_THRESHOLD`），但保留 `analyze()` 函数签名不变。
- **D-04:** `CodeMap` 类型中的 `actualMode` 字段移除——已收敛到 ParserRegistry，内部不区分 fast/smart 模式，下游不再依赖 `actualMode` 做分支。`src/generator/index.ts` 中引用 `actualMode` 的逻辑需要同步清理。

### SmartParser 收缩策略
- **D-05:** `SmartParser`（1600+ 行，TS Compiler API）收缩为独立后处理增强层——在 TreeSitterParser 解析结构后，补充类型推断、调用图增强、decorator 信息。两者通过 `ParseResult` 组合。
- **D-06:** `SmartParser` 重命名为 `TypeScriptTypeEnhancer`，放在 `src/parser/enhancers/` 下。不实现 `IParser` 接口，而是接收 `ParseResult[]` 并返回增强后的 `ParseResult[]`。
- **D-07:** `TypeScriptTypeEnhancer` 仅应用于 TS/TSX 文件。Python/Go 文件跳过增强步骤，直接返回 TreeSitter 结果。
- **D-08:** `TypeScriptTypeEnhancer` 默认启用，可通过 `parser.enhanceTypes: false` 关闭。保留灵活性但避免大多数用户需要手动开启。

### 废弃模式失败语义
- **D-09:** 用户请求 `fast`/`smart`/`hybrid` mode 时，返回 Failure-to-Action Protocol 结构化错误：`DEPRECATED_PARSER_MODE` 错误码 + `rootCause` + `remediation` + `nextCommand`。与 v2.0 错误协议一致。
- **D-10:** CLI `-m`/`--mode` 选项保留但拒绝旧值——传 `'fast'`/`'smart'`/`'hybrid'` 触发 `DEPRECATED_PARSER_MODE` 错误。接受无参数或默认值。
- **D-11:** `mycodemap.config.json` 中 `parser.mode` 字段保留但拒绝旧值——与 CLI 行为一致。`'tree-sitter'` 或省略为合法值。
- **D-12:** `DEPRECATED_PARSER_MODE` 错误的 remediation 为三步修复指引：(1) 移除 `-m` 参数或改为默认值；(2) 更新 `config.json` 中 `parser.mode`；(3) 运行 `codemap doctor` 验证。

### 多语言路由时机
- **D-13:** Wave 1 全接 TS/Python/Go——59-01 建立 ParserRegistry 主流程 + createParser 委托，59-02 把 TS/Python/Go 都接进去。与 ROADMAP Wave 结构一致。三个 parser 已在 registry 中，接线工作量可控。
- **D-14:** `analyzer.ts` 的 `discoverProjectFiles` 默认 include 扩展为 `['src/**/*.{ts,tsx,js,jsx,py,go}']`。用户不配置也能扫描多语言项目。
- **D-15:** `GoParser`/`PythonParser` 的 MVP debt 标记不阻塞 Phase 59——它们已注册在 registry 中，能解析基本结构（imports/exports/symbols），深度分析留到后续 phase。

### Claude's Discretion
- `TypeScriptTypeEnhancer` 的具体接口设计（enhance 方法签名、ParseResult 增量合并策略）
- `FastParser` 和 `TreeSitterParser` 的代码清理/合并策略（两者都基于 tree-sitter 但实现不同）
- `src/server/routes/api.ts` 和 `src/server/handlers/AnalysisHandler.ts` 中 `mode` 参数的迁移方式
- `src/cli-new/types/index.ts` 和 `src/interface/types/index.ts` 中 `mode` 类型定义的清理

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Parser Architecture
- `src/infrastructure/parser/index.ts` — MVP3 parser 模块入口，`createDefaultParserRegistry()` 注册 TS/Python/Go
- `src/infrastructure/parser/registry/ParserRegistry.ts` — Parser 注册表实现，`getParserByFile()` 路由逻辑
- `src/parser/index.ts` — Legacy parser 入口，`createParser()` fast/smart 分支（需改为委托）
- `src/core/analyzer.ts` — Legacy 分析主入口，HYBRID_THRESHOLD 逻辑（需移除）
- `src/parser/implementations/smart-parser.ts` — SmartParser 实现（需收缩为 TypeScriptTypeEnhancer）
- `src/parser/implementations/fast-parser.ts` — FastParser 实现（需废弃）
- `src/parser/implementations/tree-sitter-parser.ts` — TreeSitterParser 实现
- `src/parser/implementations/tree-sitter-loader.ts` — tree-sitter native/WASM 加载逻辑

### MVP3 Language Parsers
- `src/infrastructure/parser/implementations/TypeScriptParser.ts` — MVP3 TS parser
- `src/infrastructure/parser/implementations/GoParser.ts` — MVP3 Go parser（MVP debt）
- `src/infrastructure/parser/implementations/PythonParser.ts` — MVP3 Python parser（MVP debt）

### Mode/Config References
- `src/cli/index.ts` — CLI `-m`/`--mode` 选项注册
- `src/cli-new/index.ts` — 新 CLI `-m` 选项注册
- `src/interface/config/index.ts` — 配置类型定义（`mode: 'fast' | 'smart' | 'hybrid'`）
- `src/interface/types/index.ts` — AnalysisOptions 类型定义
- `src/server/routes/api.ts` — Server API mode 参数
- `src/server/handlers/AnalysisHandler.ts` — Analysis handler mode 类型
- `src/generator/index.ts` — 引用 `actualMode` 的生成逻辑

### Project Docs
- `AGENTS.md` — 仓库宪法，Section 6（CodeMap CLI 优先）
- `ARCHITECTURE.md` — 架构分层与边界
- `.planning/codebase/CONCERNS.md` — 技术关注点（#1 hybrid drift, #3 SmartParser 复杂度, #4 MVP debt）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ParserRegistry**（`src/infrastructure/parser/registry/ParserRegistry.ts`）: 已实现完整的语言注册、扩展名映射、按文件路由能力。直接作为主入口，无需新建。
- **createDefaultParserRegistry()**（`src/infrastructure/parser/index.ts`）: 工厂函数已注册 TS/Python/Go，可直接在 analyzer.ts 中使用。
- **TreeSitterParser**（`src/parser/implementations/tree-sitter-parser.ts`）: 成熟的 tree-sitter 解析实现，WASM-first 加载逻辑已验证。
- **tree-sitter-loader.ts**（`src/parser/implementations/tree-sitter-loader.ts`）: native/WASM 自动切换逻辑，Phase 47 WASM-first 验证过。

### Established Patterns
- **Failure-to-Action Protocol**: v2.0 交付的结构化错误模式（`rootCause + remediation + confidence + nextCommand`），`DEPRECATED_PARSER_MODE` 应复用此模式。
- **Registry pattern**: MVP3 层已使用 `ParserRegistry`，扩展名→语言→parser 的路由模式成熟。
- **Enhancer/post-processor pattern**: `TypeScriptTypeEnhancer` 可参考 `PythonTypeEnhancer`（PAR-06）的设计模式，两者共享 enhance 接口。

### Integration Points
- `src/core/analyzer.ts` → `createParser()`: 主要接入点，需改为调用 ParserRegistry
- `src/cli/index.ts` + `src/cli-new/index.ts`: `-m` 选项验证点
- `src/interface/config/index.ts`: 配置 schema 更新点
- `src/generator/index.ts`: `actualMode` 引用清理点
- `src/server/handlers/AnalysisHandler.ts`: server 端 mode 参数清理点

</code_context>

<specifics>
## Specific Ideas

- `TypeScriptTypeEnhancer` 的命名与位置（`src/parser/enhancers/`）对齐 PAR-06 `PythonTypeEnhancer` 的模式，两者可后续共享 `ITypeEnhancer` 基接口
- 三步修复指引的具体文本应包含可执行的 CLI 命令（如 `codemap doctor --fix`），让用户能直接复制执行
- `discoverProjectFiles` 默认 include 扩展后，`DEFAULT_DISCOVERY_EXCLUDES` 可能需要同步增加 `.venv/`、`__pycache__/`、`vendor/` 等 Python/Go 排除项

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 59-parser-cutover*
*Context gathered: 2026-05-06*
