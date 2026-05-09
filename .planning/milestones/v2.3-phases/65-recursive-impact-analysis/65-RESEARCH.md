# Phase 65: Recursive Impact Analysis - Research

**Researched:** 2026-05-08  
**Domain:** 基于 Phase 63/64 persisted graph truth 的递归 impact traversal、统一 entrypoint 解析与 layered result shaping [VERIFIED: codebase grep; .planning/ROADMAP.md:48-63][VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:7-41]  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Unified entrypoint model
- **D-01:** Phase 65 必须同时支持 `file` 与 `symbol` 作为一等入口。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:16-20]
- **D-02:** 两种入口都必须先经过共享 resolver，再进入同一条 traversal pipeline。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:17-20]
- **D-03:** CLI 与 MCP 可以保留薄适配层，但不能维持两套 impact 真相。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:19-20][VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:38-41]

### Result structure and semantics
- **D-05:** 返回结果语义固定为 `summary + direct[] + transitiveLayers[]`。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:22-28]
- **D-06:** `direct` / `transitive` 是结果真相，不只是请求时的 mode switch。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:23-26]
- **D-09:** 每个 impacted node 至少要带 `depth` 与代表性 `path`。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:27-28]
- **D-10:** summary 必须足够紧凑，适合 human CLI 和 agent/MCP 共同消费。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:28-28]

### Failure and degraded-state behavior
- **D-11 ~ D-16:** 不允许用空成功结果掩盖 missing entrypoint、ambiguous entrypoint、missing graph、partial/stale graph 或 truncation。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:30-36]

### Delivery surface
- **D-17:** Phase 65 的 completion bar 是 CLI + MCP 同步对齐。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:38-41]
- **D-18:** HTTP `/analysis/impact` 可以复用能力，但不是主交付门槛。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:39-40]
- **D-19:** `codemap_impact` 不应继续作为独立语义分支存在。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:40-41]

### Deferred Ideas (OUT OF SCOPE)
- community detection、surprise score、execution-flow trace、bare-name resolution 和更大范围的 server redesign 不属于本 phase。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:121-127]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMPT-01 | 维护者可以从 file 或 symbol 入口执行 recursive impact traversal，并获得分层 downstream reachability 结果 [VERIFIED: codebase grep; .planning/REQUIREMENTS.md:19-22] | 推荐把“file/symbol 解析 → canonical graph entrypoint → recursive traversal”收口到 storage/helper 层的共享 seam，然后由 CLI/MCP 只做入参与输出适配。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:606-699][VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:312-410][VERIFIED: codebase grep; src/server/mcp/service.ts:165-223] |
| IMPT-02 | impact 输出必须区分 direct 与 transitive，并提供 layered summary 供 human/agent 快速消费 [VERIFIED: codebase grep; .planning/REQUIREMENTS.md:21-22] | 推荐把 shared result contract 从旧的 flat `affectedModules` / `affected_symbols` 升级为 `summary + direct[] + transitiveLayers[]`，并保留 `path` / `depth` / `truncated` / warning semantics。[VERIFIED: codebase grep; src/interface/types/storage.ts:42-44][VERIFIED: codebase grep; src/interface/types/storage.ts:94-106][VERIFIED: codebase grep; src/server/mcp/types.ts:50-63] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 中文输出、retrieval-led reasoning、所有结论要落到代码或文档出处。[VERIFIED: codebase grep; AGENTS.md:40-45][VERIFIED: codebase grep; AGENTS.md:85-94]
- 代码搜索优先 CodeMap CLI，CLI 不足时才回退 `sed` / `rg`。[VERIFIED: codebase grep; AGENTS.md:103-108]
- Phase 65 必须保持最小改动面，不重开 v2.2 的 parser/storage/MCP 基线收敛。[VERIFIED: codebase grep; .planning/PROJECT.md:41-45]
- 每个功能修复/新增都要预设失败场景，真实验证最低阈值是真实 filesystem + 真实 subprocess 或 transport。[VERIFIED: codebase grep; AGENTS.md:130-145]
- 若影响 CLI/MCP 契约或架构叙述，后续必须同步权威文档。[VERIFIED: codebase grep; AGENTS.md:153-160]

## Summary

当前仓库确实存在两套 impact 真相：CLI `impact` 仍读取 `codemap.json`，输入只支持 `--file`，并通过 `scope: 'direct' | 'transitive'` 分支决定是否展开递归依赖；这条链路完全停留在旧 `CodeMap` 结构与命令层本地逻辑。[VERIFIED: codebase grep; src/cli/commands/impact.ts:14-46][VERIFIED: codebase grep; src/cli/commands/impact.ts:55-77][VERIFIED: codebase grep; src/cli/commands/impact.ts:242-281] 同时，MCP `codemap_impact` 已经直接基于 SQLite graph truth 做 symbol caller traversal，并带有 `status` / `confidence` / `graph_status` / `truncated` 等 envelope。[VERIFIED: codebase grep; src/server/mcp/service.ts:165-223][VERIFIED: codebase grep; src/server/mcp/types.ts:50-63]

这意味着 Phase 65 最重要的不是“再加一个新 impact 工具”，而是把 file-impact 和 symbol-impact 都降级成 shared resolver + traversal truth 的薄适配面。当前 `calculateImpactInGraph()` 与 `calculateSymbolImpactInGraph()` 已经都在 `graph-helpers.ts`，`SQLiteStorage` 也暴露了 `calculateImpact()` 与 `calculateSymbolImpact()`，这是最自然的收口 seam。[VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:312-410][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:606-699]

不过，现有 shared types 还不够：module impact 只有 `rootModule + affectedModules + depth`，symbol impact 是 flat `affectedSymbols[]`，MCP 结果也还是 `affected_symbols[]` 平铺数组。[VERIFIED: codebase grep; src/interface/types/storage.ts:42-44][VERIFIED: codebase grep; src/interface/types/storage.ts:94-106][VERIFIED: codebase grep; src/server/mcp/types.ts:44-63] 这与 Phase 65 已锁定的 `summary + direct[] + transitiveLayers[]` 语义不匹配，因此 planner 应优先把 shared impact contract 升级成一份新真相，再让 CLI/MCP 分别映射 human 与 structured surface，而不是先改某一个 surface 的文案。

另一个已验证风险是 degraded-state 语义目前不完整。MCP 已有 `GRAPH_NOT_FOUND`、`SYMBOL_NOT_FOUND`、`AMBIGUOUS_EDGE`、`graph_status=missing|complete|partial` 等显式返回，但 partial graph 仍被标成 `confidence: 'high'`，并没有按 Phase 65 的 D-14 降低置信度或附 warning。[VERIFIED: codebase grep; src/server/mcp/service.ts:49-78][VERIFIED: codebase grep; src/server/mcp/service.ts:120-145][VERIFIED: codebase grep; src/server/mcp/service.ts:239-243][VERIFIED: codebase grep; src/server/mcp/types.ts:7-10] CLI 侧则更弱：找不到目标文件时只是 warn 后跳过，天然会产生“空成功列表”这类与 D-11/D-16 冲突的行为。[VERIFIED: codebase grep; src/cli/commands/impact.ts:263-270]

**Primary recommendation:** Phase 65 应先建立 shared impact contract 和 shared resolver/traversal seam，再分两层落地：一层在 storage/helper 中把 file/symbol 统一为 canonical entrypoint 并输出 layered result；另一层在 CLI/MCP 适配各自 surface，同时继承现有 MCP graph-envelope 错误语义并补齐 partial/stale/truncated warning semantics。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:16-41][VERIFIED: codebase grep; src/server/mcp/service.ts:165-223][VERIFIED: codebase grep; ARCHITECTURE.md:19-20][VERIFIED: codebase grep; ARCHITECTURE.md:72-74]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| file/symbol entrypoint normalization | Storage / helper | CLI / MCP adapters | file 与 symbol 必须先解析到 canonical graph node，再共享 traversal；不能在 surface 层各写一套解析规则。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:16-20][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:606-699] |
| recursive traversal + direct/transitive layering | Storage / helper | — | 现有 traversal 已经在 `graph-helpers.ts` 与 `SQLiteStorage.ts`；把 layering truth 放在这里最符合“one traversal truth”模式。[VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:312-410][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:619-699] |
| graph-state degradation semantics | MCP/CLI adapters | storage metadata | `graph_status` 来源于 metadata，但 warning/confidence/status 的 surface envelope 需要适配层表达。[VERIFIED: codebase grep; src/server/mcp/service.ts:49-78][VERIFIED: codebase grep; src/server/mcp/types.ts:7-10] |
| human-readable summary | CLI | shared impact contract | CLI 应该消费 shared summary，而不是重新基于 flat lists 拼一套第二叙事。[VERIFIED: codebase grep; src/cli/commands/impact.ts:287-352] |
| transport-ready structured result | MCP | shared impact contract | `codemap_impact` 已有 structuredContent 验证面，最适合作为 shared contract 的首个严格消费者。[VERIFIED: codebase grep; src/server/mcp/__tests__/CodeMapMcpServer.test.ts:273-336] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | repo `^5.3.3` [VERIFIED: codebase grep; package.json:76] | 统一 CLI / storage / MCP 的 impact contract 与实现 | Phase 65 涉及的全部主链路都在 `src/` TypeScript 层。[VERIFIED: codebase grep; ARCHITECTURE.md:7-19] |
| better-sqlite3 | repo `^12.9.0` [VERIFIED: codebase grep; package.json:65] | persisted graph truth 与 symbol traversal 读取 | 现有 graph truth 和 `calculateSymbolImpact()` 已建立在 SQLite 上，不应重新引入第二 backend 语义。[VERIFIED: codebase grep; ARCHITECTURE.md:48-57][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:619-699] |
| Vitest | repo `^1.1.0` [VERIFIED: codebase grep; package.json:87] | helper/storage/MCP/CLI 回归验证 | 已覆盖 graph helpers 与 MCP transport 场景，适合补 direct-vs-transitive 和 failure rehearsals。[VERIFIED: codebase grep; src/infrastructure/storage/__tests__/graph-helpers.test.ts:113-127][VERIFIED: codebase grep; src/server/mcp/__tests__/CodeMapMcpServer.test.ts:273-336] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js | local runtime | built CLI、Vitest、SQLite transport | 所有真实 subprocess/transport 验证场景 |
| built CLI | `dist/cli/index.js` exists [VERIFIED: local command] | shipped impact command 的真实行为证明 | Phase 65 的 CLI proof 不能只停留在 source-level unit test |
| MCP stdio server | existing local transport | `codemap_impact` structured contract proof | 适合验证 CLI/MCP 共享 truth 而非只测纯函数 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 演进现有 `impact` command | 新增平行 `graph impact` 命令 | 会把同一能力拆成两套 public surface，违反 brownfield convergence 原则。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:97-101][VERIFIED: codebase grep; ARCHITECTURE.md:76-101] |
| 在 helper/storage 层统一 traversal | 在 CLI/MCP 各自做 resolver + BFS | 会复制 direct/transitive / ambiguity / degraded-state 语义，增加 drift 风险。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:103-107] |
| 复用现有 MCP envelope | 设计全新 impact-only 错误模型 | 会与 `codemap_query` / `codemap_context` 的 status/confidence/graph_status 模式漂移。[VERIFIED: codebase grep; src/server/mcp/types.ts:7-10][VERIFIED: codebase grep; src/server/mcp/service.ts:53-78] |

## Architecture Patterns

### System Architecture Diagram

```text
CLI file input / MCP symbol input
            |
            v
shared entrypoint resolver
  ├─ file path -> module / symbol candidates
  ├─ symbol name + optional filePath -> symbol candidate
  └─ explicit ambiguous/not_found/unavailable result
            |
            v
shared recursive traversal
  ├─ graph-native BFS/recursive walk
  ├─ collect depth + representative path
  ├─ partition hop 1 -> direct[]
  └─ group hop 2+ -> transitiveLayers[]
            |
            v
shared impact contract
  ├─ summary
  ├─ direct[]
  ├─ transitiveLayers[]
  ├─ warnings / truncated
  └─ status / confidence / graph-state semantics
            |
            +--> CLI adapter (human + JSON)
            +--> MCP adapter (structuredContent)
            \--> optional HTTP reuse (non-blocking)
```

### Recommended Project Structure
```text
src/
├── cli/commands/impact.ts                 # evolve existing CLI surface
├── infrastructure/storage/graph-helpers.ts
├── infrastructure/storage/adapters/SQLiteStorage.ts
├── interface/types/storage.ts             # shared impact contract
├── server/mcp/service.ts                  # thin MCP adapter
├── server/mcp/types.ts                    # aligned structured output contract
└── tests / src/**/__tests__/              # helper + CLI + MCP verification
```

### Pattern 1: Resolver Before Traversal
**What:** 先把 file 或 symbol 归一成 canonical graph entrypoint，再统一做 traversal。  
**When to use:** 所有 impact surfaces。  
**Why:** 当前 phase 的真正分叉点不是 BFS 算法，而是入口解析语义。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:16-20]

### Pattern 2: Layered Result as Shared Truth
**What:** `summary + direct[] + transitiveLayers[]` 作为 storage-facing contract，而不是 surface-local render shape。  
**When to use:** helper/storage 输出给 CLI/MCP/HTTP 的所有 impact 结果。  
**Why:** 当前 flat arrays 已不足以表达 direct-vs-transitive 与 depth grouping。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:22-28][VERIFIED: codebase grep; src/interface/types/storage.ts:42-44][VERIFIED: codebase grep; src/interface/types/storage.ts:94-106]

### Pattern 3: Reuse MCP Error Envelope, Tighten Partial Semantics
**What:** 保留 `status + confidence + graph_status + error` 框架，但补 `partial/stale/truncated` warnings 与 reduced confidence。  
**When to use:** 所有 structured impact surfaces。  
**Why:** MCP 已经有 missing/not_found/ambiguous 的 transport-ready 真相，扩它比重造成本更低。[VERIFIED: codebase grep; src/server/mcp/service.ts:120-145][VERIFIED: codebase grep; src/server/mcp/service.ts:165-223][VERIFIED: codebase grep; src/server/mcp/types.ts:7-10]

### Anti-Patterns to Avoid
- 继续让 CLI file impact 与 MCP symbol impact 各自维护 traversal 真相。
- 用请求参数 `--transitive` 充当 direct/transitive 语义真相，而不是返回结构的一部分。
- unresolved entrypoint 时返回空列表成功。
- partial graph 仍声称 `high confidence` 且不给 warning。
- 新开一个公共 HTTP analysis redesign，扩大本 phase blast radius。

## Common Pitfalls

### Pitfall 1: 把旧 `ImpactResult` 直接“补字段”当成新 contract
旧 module impact 只有 `affectedModules[]`，symbol impact 是 `affectedSymbols[]`，两者既不对齐 entrypoint，也没有 layered grouping；直接局部补字段容易留下历史语义分支。[VERIFIED: codebase grep; src/interface/types/storage.ts:42-44][VERIFIED: codebase grep; src/interface/types/storage.ts:94-106]

### Pitfall 2: 把 representative path 做成 exhaustive path search
Phase 65 只要求 explainable layered summary，不要求最全路径枚举；过早做 path ranking / exhaustive enumeration 会把本 phase 拉向 v2.4+ 范围。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:114-117][VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:124-127]

### Pitfall 3: 只改 MCP，保留 legacy CLI 作为“以后再统一”
这会让 public CLI 与 agent surface 继续分叉，直接违背 D-17/D-19 的 completion bar。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:38-41]

### Pitfall 4: 只测 happy path，不测 ambiguous/missing/partial/truncated
当前仓库已经有 structured failure envelope 先例，若不把失败场景写进 tests，就很容易回退到“空成功”或“silent narrowing”。[VERIFIED: codebase grep; src/server/mcp/__tests__/CodeMapMcpServer.test.ts:301-336]

## Validation Architecture

### Required checks for this phase
- helper/storage tests 证明 file/symbol 都能落到同一 traversal truth，并能正确分层 direct 与 transitive。
- CLI tests 证明 legacy `impact` surface 已从旧 `codemap.json`-local logic 转向 shared graph truth，且 human/JSON 输出都包含 layered summary。
- MCP tests 证明 `codemap_impact` 不再只是 symbol-only experimental branch，而是共享同一 contract，并覆盖 `GRAPH_NOT_FOUND`、`SYMBOL_NOT_FOUND`、`AMBIGUOUS_EDGE`、partial/stale/truncated warnings。
- 至少一个真实 subprocess 或真实 transport 场景证明 built CLI / MCP surface 读到的是统一 impact truth，而不是 mock 出来的同构对象。

### Recommended failure rehearsal
- missing file entrypoint：返回显式 `not_found` / remediation，而不是空 direct/transitive 数组。
- ambiguous symbol entrypoint：返回 candidate details，而不是自动选第一个。
- missing graph truth：返回 `unavailable` + regenerate guidance。
- partial graph truth：返回结果但降低 confidence，并附 warning。
- traversal truncation：命中 depth/limit 时显式标记 `truncated=true` 与 summary warning。

## Open Questions

- file entrypoint 最终是只 resolve 到 module，还是允许 file → contained symbols → merged layered impact？当前 context 允许 resolver shape 自由，但实现复杂度不同。[INFERENCE from .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:43-47]
- shared impact contract 是否应直接替换旧 `ImpactResult` / `SymbolImpactResult`，还是先新增 v2 contract 再由旧类型别名过渡？这取决于 blast radius 与 test migration 成本。[INFERENCE from src/interface/types/storage.ts:42-44][INFERENCE from src/interface/types/storage.ts:94-106]
- HTTP `/analysis/impact` 是否在本 phase 只做 capability reuse，不做 output contract 收口？按 current scope，推荐保持 non-blocking reuse。[VERIFIED: codebase grep; .planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:39-40]

## Sources

### Primary
- `.planning/ROADMAP.md:48-63`
- `.planning/REQUIREMENTS.md:19-22`
- `.planning/phases/65-recursive-impact-analysis/65-CONTEXT.md:7-127`
- `src/cli/commands/impact.ts:14-46`
- `src/cli/commands/impact.ts:242-352`
- `src/infrastructure/storage/graph-helpers.ts:312-410`
- `src/infrastructure/storage/adapters/SQLiteStorage.ts:606-699`
- `src/interface/types/storage.ts:42-44`
- `src/interface/types/storage.ts:94-106`
- `src/server/mcp/service.ts:49-78`
- `src/server/mcp/service.ts:120-223`
- `src/server/mcp/types.ts:7-63`
- `src/server/mcp/__tests__/CodeMapMcpServer.test.ts:273-336`
- `ARCHITECTURE.md:19-20`
- `ARCHITECTURE.md:72-74`

### Secondary
- `src/infrastructure/storage/__tests__/graph-helpers.test.ts:113-127`
- `ARCHITECTURE.md:76-108`
- `.planning/PROJECT.md:26-45`

