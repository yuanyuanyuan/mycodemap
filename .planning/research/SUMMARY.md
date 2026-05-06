# Project Research Summary

**Project:** CodeMap
**Domain:** AI-native code analysis CLI architecture foundation
**Researched:** 2026-05-06
**Confidence:** HIGH

## Executive Summary

`v2.2 architecture-foundation` 更像一次“现有能力收敛”而不是“引入新外部能力”。当前代码库已经具备 Tree-sitter parser、SQLite fallback chain、MCP native tools、parser registry 等关键积木，但它们仍被 legacy parser mode、Kùzu/FileSystem backend、以及 `cli_redirect` MCP contract tool 这三组旧路径牵制。最合理的策略不是再扩表面，而是把这些既有积木收敛成更少、更稳定的 truth seam。

研究结果表明，`v2.2` 不需要优先引入新第三方依赖，重点是用现有 `tree-sitter` / SQLite runtime / MCP SDK 完成架构对齐。最大风险不是“技术做不到”，而是“只切了一半”：parser、storage、MCP 任一条线如果停在双轨中间态，requirements 和 roadmap 都会失真。

## Key Findings

### Recommended Stack

优先复用现有依赖，而不是扩依赖面。当前仓库已经有 `tree-sitter`、`better-sqlite3`、`sql.js`、`@modelcontextprotocol/sdk` 和 `zod`。这意味着 `v2.2` 的主要任务是：

- 让 Tree-sitter 成为主流程 parser truth
- 让 SQLite family 成为唯一 storage truth
- 让 MCP tool 返回真实 structured result，而不是 CLI recipe

**Core technologies:**
- TypeScript — 继续作为 parser/storage/MCP/shared contract 的唯一实现语言
- `tree-sitter` — parser cutover 主路径
- SQLite runtime chain — storage convergence 的唯一 backend family
- MCP SDK — direct execution 与 routing gate 的宿主表面

### Expected Features

本 milestone 的 table stakes 很清楚，且都已经在 backlog 中被定义过。

**Must have (table stakes):**
- 单一 parser 主路径
- 单一 storage truth
- MCP 真实执行
- `codemap_context` 最小 routing gate

**Should have (competitive):**
- `detail_level` / tool filters
- `PythonTypeEnhancer`
- SSE transport

**Defer (v2+):**
- SQLite schema redesign
- incremental update / impact CTE / community detection
- Auto-Provisioned Agent Skills / MCP `verify_contract`

### Architecture Approach

建议把 `v2.2` 看成四个 seam 的收敛工程：`parser entrypoint`、`storage runtime/factory`、`shared service seam`、`MCP routing surface`。现有 native MCP tools 已经证明 “storage-backed structured result” 这条路成立；接下来只需要把 contract tools 和 CLI wrappers 拉到同一执行模型。

**Major components:**
1. Parser orchestrator — 决定谁是主流程 parser truth
2. Storage runtime/factory — 决定 backend 与 fallback 语义
3. Shared command/service seam — 让 CLI 和 MCP 共用执行逻辑
4. MCP routing gate — 用轻量上下文引导 agent 下一步工具选择

### Critical Pitfalls

1. **Parser truth 只迁了一半** — 先固定唯一 orchestrator，再删/废弃旧 mode
2. **Storage 仍静默跨 backend fallback** — fallback 只能留在 SQLite family 内
3. **MCP direct execution 停在 schema 层** — 以 native tool 模式扩展 shared service，而不是继续 `cli_redirect`
4. **Node baseline 与 `node:sqlite` 假设漂移** — built-in sqlite 只能当 bonus/fallback，不能当唯一方案

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 59: Parser Cutover
**Rationale:** parser 是主流程最上游 truth，先定这一层，后续 storage/MCP 才不会继续兼容旧 mode。  
**Delivers:** `createParser()` / `analyze()` / parser registry truth 收敛，旧 mode 废弃策略与错误语义。  
**Addresses:** parser 统一、四语言主路径、`PythonTypeEnhancer` 是否作为 stretch。  
**Avoids:** parser truth half-migrated。

### Phase 60: Storage Convergence
**Rationale:** parser truth 稳定后，收敛 backend family 与 config truth，风险边界最清晰。  
**Delivers:** SQLite-only storage contract、unsupported storage errors、runtime remediation path、docs/config migration。  
**Uses:** existing `better-sqlite3` / `sql.js` / `node:sqlite` fallback chain。  
**Avoids:** silent backend fallback、Node baseline drift。

### Phase 61: MCP Direct Execution
**Rationale:** 在 parser/storage truth 稳定后，再抽 shared service seam，避免同时移动底层与 transport。  
**Delivers:** 高频 contract tools 不再返回 `cli_redirect`，CLI wrapper 变薄。  
**Implements:** shared execution/service boundary。  
**Avoids:** fake execution MCP surface。

### Phase 62: Routing Gate and Verification
**Rationale:** 只有 tool execution 已稳定，`codemap_context` 的建议才有真实价值。  
**Delivers:** `codemap_context` minimal / standard detail levels，tool suggestions，focused verification and docs sync。  
**Avoids:** 先做“建议层”，后面却发现底层 tool 还不能直接跑。

### Phase Ordering Rationale

- parser truth 在最前，因为它影响 graph generation、storage contents、后续 MCP query/impact correctness
- storage convergence 第二，因为它是所有 query/impact/runtime proof 的基础
- direct execution 第三，因为它依赖前两层稳定输出
- routing gate 最后，因为它消费的是已经稳定的 tool truth，而不是替代它

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 60:** Node 20/22 baseline decision and remediation messaging
- **Phase 61:** Which commands are highest-value first movers into shared service seams

Phases with standard patterns (skip research-phase):
- **Phase 59:** parser truth consolidation pattern is already clear from local code and backlog
- **Phase 62:** lightweight routing gate can follow existing graph metadata + tool registration patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Mostly based on current repo dependencies and official Node docs |
| Features | HIGH | Backlog scope is already explicit and matches current code gaps |
| Architecture | HIGH | Current seams are visible in code: parser, storage, MCP |
| Pitfalls | HIGH | All major failure modes are directly observable in current source layout |

**Overall confidence:** HIGH

### Gaps to Address

- Exact requirement wording for breaking config migration still needs milestone-level REQ IDs
- Phase 61 should decide whether to move all contract tools or only the highest-value subset in v2.2

## Sources

### Primary (HIGH confidence)
- [docs/backlog.md](/data/codemap/docs/backlog.md)
- [src/parser/index.ts](/data/codemap/src/parser/index.ts)
- [src/core/analyzer.ts](/data/codemap/src/core/analyzer.ts)
- [src/infrastructure/storage/StorageFactory.ts](/data/codemap/src/infrastructure/storage/StorageFactory.ts)
- [src/infrastructure/storage/adapters/sqlite-loader.ts](/data/codemap/src/infrastructure/storage/adapters/sqlite-loader.ts)
- [src/server/mcp/server.ts](/data/codemap/src/server/mcp/server.ts)
- [src/server/mcp/schema-adapter.ts](/data/codemap/src/server/mcp/schema-adapter.ts)
- https://nodejs.org/api/sqlite.html

---
*Research completed: 2026-05-06*
*Ready for roadmap: yes*
