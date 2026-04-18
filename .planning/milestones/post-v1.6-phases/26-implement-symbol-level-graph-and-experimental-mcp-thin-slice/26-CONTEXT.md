# Phase 26: Implement symbol-level graph and experimental MCP thin slice - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning and execution
**Source:** Design + eng review test plan + TODO triage

<domain>
## Phase Boundary

Phase 26 的首期目标不是一次做完整张路线图，而是先打通最小可用纵向切片：

- `generate --symbol-level` 可显式开启 symbol-level materialization
- `smart-parser` 现有 `callGraph` / `FunctionSignature.calls` 成为首期调用关系 authority
- CodeGraph / SQLite 能真实保存 symbol-level symbol metadata 与 `call` 依赖，而不是只保留模块级 import
- 为后续 experimental MCP query / impact 读路径准备稳定的图真相源

本 phase 的首轮实施只做 **Now** 路线中的最小基础设施，不把增量更新、community/hub-bridge、HTTP MCP、复杂 risk scoring 混进首批实现。
</domain>

<decisions>
## Implementation Decisions

### Locked Now decisions
- 首期复用 `smart-parser` 的 `callGraph` / `FunctionSignature.calls`，不引入第二套 parser authority
- 先修根因：`generate` 当前只把模块/导入 materialize 到 `CodeGraph`，必须补上 symbol-level truth
- SQLite schema 只扩到支撑首期 symbol-level read model 所需字段，不提前加 community / parse_errors 表
- `generate --symbol-level` 必须是 opt-in，默认 generate 行为保持不变
- `sqlite` 必须成为配置和 storage factory 可达的正式后端，否则 symbol-level SQLite 路径无法从用户面打通
- unresolved / ambiguous 的调用边不伪造；只 materialize 能稳定解析到 symbol 的边

### Deferred ideas
- `generate --incremental`
- `parse_errors` 持久化表
- `mcp start` / `mcp install` 的完整 host lifecycle
- community / hub-bridge / surprise score
- symbol-level impact 的 CLI public surface
</decisions>

<canonical_refs>
## Canonical References

### Design and scope
- `/home/stark/.gstack/projects/yuanyuanyuan-mycodemap/stark-main-design-20260418-011843.md` — Now / Later、Deferred Scope Ledger、Eng 决策、Success Criteria
- `/home/stark/.gstack/projects/yuanyuanyuan-mycodemap/stark-main-eng-review-test-plan-20260418-191311.md` — critical paths、edge cases、docs path 验收清单
- `TODOS.md` — 首期不做但不能遗忘的后续项

### Existing implementation truth
- `src/cli/commands/generate.ts` — 当前 generate / storage save 主入口
- `src/core/analyzer.ts` — `smart-parser` 结果如何进入 `ModuleInfo`
- `src/parser/implementations/smart-parser.ts` — `callGraph` / `FunctionSignature.calls` truth
- `src/core/global-index.ts` — 跨文件调用解析能力
- `src/interface/types/index.ts` — CodeGraph / Symbol / Dependency contract
- `src/domain/entities/CodeGraph.ts` — 当前 domain aggregate 仍只按模块依赖校验
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — normalized governance rows 与 query helpers
- `src/infrastructure/storage/sqlite/schema.ts` — 当前 governance-v2 schema
- `src/cli/config-loader.ts` / `src/infrastructure/storage/StorageFactory.ts` — 当前 `sqlite` 尚未打通到 CLI config 路径
</canonical_refs>

<specifics>
## Specific Ideas

- 首个 plan 优先覆盖：图模型扩展、`sqlite` backend exposure、`generate --symbol-level` materializer
- 只对可稳定映射的函数级 symbol 建边；方法级精确映射缺少 member location 时暂不伪造
- 测试先覆盖：
  - `generate --symbol-level` 会把 symbol call deps 写入 `saveCodeGraph`
  - `sqlite` config / factory 可正常走通
  - SQLite schema 能 round-trip 新字段
</specifics>

<deferred>
## Deferred Ideas

- `graph_status: complete | partial` 与失败文件计数
- stdio MCP transport hygiene / smoke test
- `codemap_query` / `codemap_impact` tool contract
- docs 的 experimental MCP 安装路径
</deferred>

---

*Phase: 26-implement-symbol-level-graph-and-experimental-mcp-thin-slice*
*Context gathered: 2026-04-18*
