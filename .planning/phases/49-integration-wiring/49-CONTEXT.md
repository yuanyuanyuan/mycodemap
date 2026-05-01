# Phase 49: Integration Wiring - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Source:** Gap closure from v2.0 milestone audit (gaps_found)

<domain>
## Phase Boundary

Phase 49 是 v2.0 agent-native-foundation 的 gap closure phase。v2.0 的 9 个 phase 已全部实现代码，但 milestone audit 发现 4 个 critical integration blockers 导致 3 个 E2E flows 断裂。

本 phase 的目标：**纯接线修复**，使已实现的代码真正工作。不新增功能，不补写文档。

## Scope (Locked)

### In Scope — 4 个 Critical Blocker 修复

1. **P0 — `validateTreeSitter` loader-aware 改造**
   - 当前：`index.ts:77-88` 调用 `validateTreeSitter()` 在 loader 之前抛出
   - 修复：改为调用 `loadTreeSitter()`（Phase 47 的 WASM-aware loader），失败再走 fallback
   - 恢复 flow: "Native dep failure → WASM fallback → continue"

2. **P0 — `tryApplySuggestion` 统一接入错误处理**
   - 当前：`tryApplySuggestion()` 有完整 3-gate 实现但零调用点
   - 修复：在 `index.ts` 顶层 command error handler 中统一调用
   - 读取 `cliOpts.applySuggestion` 并传参
   - 恢复 flow: "Error with suggestion → --apply-suggestion → auto-remediation"

3. **P1 — Global flags 消费接线**
   - `--wasm-fallback` → 在 loader 调用链中读取并激活 WASM 路径
   - `--apply-suggestion` → 已随 P0 完成
   - 清理 flag 注册与实际消费之间的 gap

4. **P1 — Contract schema 核心命令补全**
   - 将 `doctor`、`benchmark`、`init` 加入 contract schema
   - 使 MCP gateway 能 auto-register 这些命令
   - 不追求 15+ 命令全量覆盖（够用即可，渐进迁移）

### Out of Scope (Explicit)

- Phase 41/42/48 SUMMARY.md 补写
- Phase 47 VERIFICATION.md 补写
- REQUIREMENTS.md traceability 更新
- 5 个 warnings 的修复（v2.1 backlog）
- 剩余 12+ 命令的 contract schema 迁移

</domain>

<decisions>
## Implementation Decisions

### validateTreeSitter 修复策略 (D-01)
- **决策 A：** 让 `validateTreeSitter()` 调用 loader-aware check（先尝试加载，失败再抛）
- **原因：** 保持安全边界的同时不阻断 WASM fallback 路径

### tryApplySuggestion 触发位置 (D-02)
- **决策 A：** 在 `index.ts` 的顶层 error handler 中统一调用
- **原因：** 集中管理，避免每个 command action 重复

### Contract schema 补全范围 (D-03)
- **决策 B/C：** 够用就行，仅加入核心命令（doctor, benchmark, init）
- **原因：** 渐进迁移，Phase 49 只做接线修复

### Scope 边界 (D-04)
- **决策 A：** 最小修复（纯接线），不补文档
- **原因：** 快速关闭 v2.0，文档补写可延后

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v2.0 Audit
- `.planning/v2.0-MILESTONE-AUDIT.md` — 完整 blocker 列表、evidence、修复建议

### Phase 实现代码
- `src/index.ts` — CLI 入口、flag 注册、错误处理、validateTreeSitter 调用
- `src/commands/doctor/` — Phase 43 实现
- `src/commands/benchmark.ts` — benchmark 命令
- `src/commands/init/` — init 命令族
- `src/interface-contract/` — Phase 41 schema 定义
- `src/mcp/schema-adapter.ts` — Phase 42 MCP 适配器
- `src/output/` — Phase 44 输出基础设施（resolveOutputMode, renderOutput, createProgressEmitter）
- `src/error/` — Phase 45 ActionableError、tryApplySuggestion
- `src/loaders/tree-sitter-loader.ts` — Phase 47 WASM-aware loader
- `src/loaders/sqlite-loader.ts` — Phase 47 SQLite loader

### 关键文件（修复目标）
- `src/index.ts:77-88` — validateTreeSitter 前置验证（Blocker #2）
- `src/index.ts` 错误处理路径 — tryApplySuggestion 接入点（Blocker #3）
- `src/interface-contract/schema.ts` 或等价文件 — contract 定义（Blocker #4）
- `package.json` scripts — ghost commands（验证用）

</canonical_refs>

<specifics>
## Specific Ideas

### Blocker #2 修复细节
当前证据：`index.ts:77-88` 调用 `validateTreeSitter()` 抛出 plain Error。
修复方向：将 `validateTreeSitter()` 替换为 `loadTreeSitter()` 调用，包装 try/catch，catch 中激活 WASM fallback。

### Blocker #3 修复细节
当前证据：`tryApplySuggestion()` exported 但零 consumers。
修复方向：在 `index.ts` 的 command action catch 块中，构造 `ActionableError` 后调用 `tryApplySuggestion(error, { apply: cliOpts.applySuggestion })`。

### Blocker #1 修复细节
当前证据：`--wasm-fallback` 和 `--apply-suggestion` 在 `index.ts` 中注册为 global flags，但 `cliOpts.wasmFallback` / `cliOpts.applySuggestion` 从未被读取。
修复方向：在 loader 初始化路径中读取 `cliOpts.wasmFallback`，在错误处理路径中读取 `cliOpts.applySuggestion`。

### Blocker #4 修复细节
当前证据：`commands/index.ts` 仅导出 analyze/query/deps。
修复方向：在 contract schema 中增加 `doctor`、`benchmark`、`init` 的定义，使 `schema-adapter.ts` 能 auto-register。

</specifics>

<deferred>
## Deferred Ideas

- 剩余 12+ 命令的 contract schema 迁移 → v2.1 backlog
- benchmark 命令的 output infrastructure 迁移（warning）→ v2.1 backlog
- query/deps contract schema 的 `--human` flag 补全（warning）→ v2.1 backlog
- contract schema 中 number/string 默认类型不匹配（warning）→ v2.1 backlog
- MCP outputSchema 描述 cli_redirect 而非 outputShape（warning）→ v2.1 backlog
- Zod default/optional 顺序导致 required 属性问题（warning）→ v2.1 backlog

</deferred>

---

*Phase: 49-integration-wiring*
*Context gathered: 2026-05-01 via gap closure discussion*
