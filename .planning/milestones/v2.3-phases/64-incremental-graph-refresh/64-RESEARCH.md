# Phase 64: Incremental Graph Refresh - Research

**Researched:** 2026-05-08  
**Domain:** 基于 graph-v1 persisted truth 的增量图刷新 [VERIFIED: codebase grep; .planning/ROADMAP.md:31-46][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:7-45]  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Changed-input sourcing
- **D-01:** Phase 64 defaults to `git diff` as the changed-input source, while also supporting explicit `--changed-files` input.
- **D-02:** Explicit `--base` / `--against` revision inputs take priority when provided; otherwise the default diff baseline falls back to `HEAD`.
- **D-03:** If both `git diff`-based inputs and explicit `--changed-files` are provided, explicit `--changed-files` wins and the diff-derived input is ignored with visible guidance.
- **D-04:** If the system cannot derive a reliable changed-file set, it must fail closed and direct the user to run a full graph regenerate rather than silently broadening scope or guessing.

### Invalidation radius
- **D-05:** The default incremental refresh radius is the changed files plus a `2-hop` graph neighborhood.
- **D-06:** Invalidation propagates across both `upstream` and `downstream` relationships rather than only one direction.
- **D-07:** `INFERRED` and `AMBIGUOUS` edges are treated conservatively during propagation; they should expand refresh scope rather than be trusted as narrow precise boundaries.
- **D-08:** High-risk change surfaces or any case where the impact boundary cannot be determined reliably must force a full regenerate instead of continuing incrementally.

### Writeback and recovery
- **D-09:** Incremental refresh must rebuild the affected slice in memory or another temporary graph representation first, then replace persisted truth transactionally after validation succeeds.
- **D-10:** Partial refresh is allowed: successfully recomputed slices may be committed while failed slices are marked `stale` / `partial` rather than pretending the whole refresh succeeded cleanly.
- **D-11:** The system should retain exactly one pre-refresh snapshot so the latest incremental attempt can be compared or rolled back without turning Phase 64 into a multi-version history feature.
- **D-12:** External refresh status uses three explicit states: `success`, `partial`, and `failed`.

### Observability and downgrade behavior
- **D-13:** Incremental refresh output must expose, at minimum, counts for `changed`, `reused`, `recomputed`, `invalidated`, and `failed` graph slices.
- **D-14:** Output must also expose the affected files/modules plus short reason summaries for why slices were reused, recomputed, invalidated, or failed.
- **D-15:** These diagnostics must be available in both human-facing CLI output and structured JSON/MCP output; the human path may be thinner, but it must still surface the core refresh story.
- **D-16:** Warning and failure categories must use stable machine-readable codes, not only prose.
- **D-17:** When incremental refresh hits a high-risk downgrade condition, the default result is `failed` with explicit guidance to run a full generate; it must not silently auto-fallback into full regeneration inside the same command path.

### the agent's Discretion
- Exact flag names and command-surface placement for incremental refresh, as long as explicit changed-file inputs remain able to override diff-derived scope.
- Exact neighborhood computation and validation mechanics, as long as the default behavior preserves the locked `2-hop`, bidirectional, conservative propagation semantics.
- Exact snapshot storage format and location, as long as only one pre-refresh snapshot is retained and rollback/diagnostic comparisons stay possible.
- Exact warning/error code names and output field names, as long as the structured diagnostics remain stable and the `success | partial | failed` state boundary stays explicit.

### Deferred Ideas (OUT OF SCOPE)
- Automatic silent fallback from incremental refresh into full regenerate is out of scope for Phase 64.
- Multi-version graph-history retention beyond one pre-refresh snapshot belongs to a later phase if it ever becomes necessary.
- New analysis capabilities such as recursive impact traversal or community detection remain Phase 65+ work and must not be folded into Phase 64.
- Smarter heuristic narrowing beyond the locked conservative `2-hop` bidirectional propagation can be explored later only after Phase 64 proves safe.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INCR-01 | 维护者可以基于 `git diff` 或显式 changed-file set 触发 scoped incremental update，而不是每次都全量重建整个 repo graph [VERIFIED: codebase grep; .planning/REQUIREMENTS.md:16-17] | 推荐把增量能力放在现有 `generate` 写入链路上，复用 `git diff`/显式 changed-file precedence，并在 scope 不可靠时 fail-closed。[VERIFIED: codebase grep; src/cli/commands/generate.ts:327-341][VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:143-174][VERIFIED: codebase grep; src/cli/commands/ci.ts:307-341] |
| INCR-02 | incremental update 会明确返回或记录哪些节点/边被重算、复用或失效，便于诊断缓存/传播错误 [VERIFIED: codebase grep; .planning/REQUIREMENTS.md:16-17] | 推荐把 refresh result 与 graph integrity 分层，并输出 changed/reused/recomputed/invalidated/failed 计数、受影响对象和 stable codes。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:28-45][VERIFIED: codebase grep; src/interface/types/storage.ts:56-64][VERIFIED: codebase grep; src/server/mcp/service.ts:49-78] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 中文输出、retrieval-led reasoning、事实要落到代码/文档出处。[VERIFIED: codebase grep; AGENTS.md:4-5][VERIFIED: codebase grep; AGENTS.md:60-67]
- 代码搜索优先 CodeMap CLI，只有纯文档或 CLI 不足时才回退到 `rg`/`sed`。[VERIFIED: codebase grep; AGENTS.md:103-108]
- 任务要保持最小改动面，不重开与 Phase 64 无关的 parser/storage/MCP 基线收敛问题。[VERIFIED: codebase grep; AGENTS.md:53-58][VERIFIED: codebase grep; .planning/PROJECT.md:41-45]
- 必须预设失败场景；真实验证最低阈值是真实 filesystem + 真实 subprocess/transport。[VERIFIED: codebase grep; AGENTS.md:130-145]
- 如果实现改动到 CLI、架构、规则或输出契约，后续必须同步权威文档。[VERIFIED: codebase grep; AGENTS.md:153-160]

## Summary

当前仓库只有一条可信 graph build path：`generate` 先分析、再写 `.mycodemap/codemap.json` 和上下文工件，最后通过 `CodeGraphRepositoryImpl.save()` 把 `CodeGraph` 落到 SQLite。[VERIFIED: codebase grep; src/cli/commands/generate.ts:327-341][VERIFIED: codebase grep; src/infrastructure/repositories/CodeGraphRepositoryImpl.ts:26-35] 因此 Phase 64 最稳的方案不是新建并行 refresh writer，而是在 `generate` 路径上增加一个“增量 scope + 局部重算 + 原子写回”的窄模式。[VERIFIED: codebase grep; .planning/ROADMAP.md:33-46][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:87-102]

当前 SQLite 写入也是整图事务替换：`saveCodeGraph()` 直接进入 `replaceCurrentGraph()`，该方法在一个事务里清空 `dependencies/graph_edges/symbols/modules/projects/snapshots` 再整体重写，并在提交前后做 schema/projection parity 守卫。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:425-428][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:965-1026][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1059-1276][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1454] 这要求 Phase 64 先在内存/临时图完成 slice rebuild，验证通过后再一次性提交；不要在 SQLite 上原地边算边改。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:28-31][VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:18-49]

语义上还必须分两层：现有 graph metadata 只表达 `complete|partial`，MCP 再把“没生成图”映射成 `missing`；而 Phase 64 锁定的 `success|partial|failed` 描述的是“这次 refresh 尝试”。[VERIFIED: codebase grep; src/interface/types/storage.ts:56-64][VERIFIED: codebase grep; src/server/mcp/service.ts:49-78][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:28-45] planner 应把这两层状态拆开，避免把失败的 refresh 伪装成一个 `partial graph` 成功路径。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:34-45]

**Primary recommendation:** 在 `generate` 主路径内引入显式增量模式，changed-file sourcing 复用现有 precedence，invalidations 基于 `graph_edges` 做双向 2-hop conservative propagation，slice 先在内存图里重建，再通过现有 SQLite 事务边界原子提交，并统一输出 stable diagnostics。[VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:143-174][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:998-1026][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| changed-file sourcing (`git diff`, `--changed-files`, `--base`, `--against`) | CLI | — | 现有 changed-file 逻辑全部在 CLI 层，且 Phase 64 的 trigger 是 maintainer-run refresh。[VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:119-174][VERIFIED: codebase grep; src/cli/commands/ci.ts:307-341] |
| 2-hop 双向 invalidation | Storage / Domain Helper | CLI | 传播半径要读 graph truth、entity type 和 confidence，不应停留在路径字符串层。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1339-1410][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:22-27] |
| transactional slice rebuild | Storage | Repository | 当前唯一原子写回边界就在 `SQLiteStorage.runInTransaction()`。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422] |
| single pre-refresh snapshot retention | Storage | — | `snapshots` 已是单镜像表，最接近 Phase 64 的“一份 pre-refresh snapshot”。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1114-1121][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1187-1260] |
| human/JSON/MCP diagnostics | CLI + MCP | Storage metadata | 机器 envelope 已由 MCP service 和 CLI structured output 模式建立，storage 负责底层 truth。[VERIFIED: codebase grep; ARCHITECTURE.md:19-20][VERIFIED: codebase grep; ARCHITECTURE.md:72-74][VERIFIED: codebase grep; src/server/mcp/service.ts:53-78] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | repo `^5.3.3`; npm latest `6.0.3` [VERIFIED: codebase grep; package.json:76][VERIFIED: npm registry] | 承载 CLI/storage/repository/MCP 变更。[VERIFIED: codebase grep; ARCHITECTURE.md:7-8][VERIFIED: codebase grep; ARCHITECTURE.md:21-33] | Phase 64 涉及的全部主链路都在 `src/` TypeScript 层。[VERIFIED: codebase grep; ARCHITECTURE.md:7-8] |
| better-sqlite3 | repo `^12.9.0`; npm latest `12.9.0` [VERIFIED: codebase grep; package.json:65][VERIFIED: npm registry] | graph-v1 persisted truth、projection parity、事务提交。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:425-428][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422] | v2.2 已锁定 SQLite-only baseline，本 phase 不应换 backend。[VERIFIED: codebase grep; .planning/PROJECT.md:30-34][VERIFIED: codebase grep; ARCHITECTURE.md:48-57] |
| Vitest | repo `^1.1.0`; npm latest `4.1.5` [VERIFIED: codebase grep; package.json:87][VERIFIED: npm registry] | 单测、集成测、E2E。[VERIFIED: codebase grep; vitest.config.ts:9-26][VERIFIED: codebase grep; vitest.e2e.config.ts:8-23] | Phase 63 的真实 subprocess 证明已经建在这套框架上。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-02-SUMMARY.md:55-60] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js | local `v24.14.0` [VERIFIED: local command] | 运行 built CLI、Vitest、SQLite loader。[VERIFIED: codebase grep; .planning/codebase/INTEGRATIONS.md:7-12] | 所有本地与 E2E 路径。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-02-SUMMARY.md:50-60] |
| Git | local `2.43.0` [VERIFIED: local command] | 默认 changed-file truth source。[VERIFIED: codebase grep; src/cli/commands/ci.ts:320-341] | 只有显式 `--changed-files` 场景可不依赖它。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:17-20] |
| built CLI | `dist/cli/index.js` exists [VERIFIED: local command] | shipped path 的真实 subprocess 验证。[VERIFIED: codebase grep; AGENTS.md:164-165] | Phase gate 的真实证明面。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-02-SUMMARY.md:50-60] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 扩展 `generate` | 新建公共 `refresh`/`incrementalUpdate` server API | `AnalysisHandler` 当前明确返回 unsupported 501，先开 server 面会扩大 blast radius。[VERIFIED: codebase grep; src/server/handlers/AnalysisHandler.ts:74-93][VERIFIED: codebase grep; src/server/handlers/AnalysisHandler.ts:138-153] |
| 复用 repository/storage seam | 另造平行 graph writer | 会制造第二真相，且绕开现有事务和 parity 守卫。[VERIFIED: codebase grep; src/infrastructure/repositories/CodeGraphRepositoryImpl.ts:26-35][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1005-1026] |
| 复用 diff precedence 模式 | 手写另一套 changed-file override/fallback 逻辑 | 仓库已有稳定 warning code 与边界检查先例，重复实现只会 drift。[VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:48-64][VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:149-163] |

**Installation:**
```bash
npm install
```

**Version verification:** 依赖最新 registry 版本已核对；planner 仍应按仓库锁定版本做验证，而不是顺手升级 TypeScript/Vitest。[VERIFIED: npm registry][VERIFIED: codebase grep; package.json:65][VERIFIED: codebase grep; package.json:76][VERIFIED: codebase grep; package.json:87]

## Architecture Patterns

### System Architecture Diagram

```text
changed-file source
  ├─ explicit --changed-files
  └─ git diff (--base/--against or HEAD fallback)
            |
            v
scope resolver
  ├─ normalize paths
  ├─ verify in-repo boundary
  └─ fail closed if unreliable
            |
            v
2-hop bidirectional invalidation
  ├─ seed changed files/modules/symbols
  ├─ expand upstream + downstream
  └─ conservative expand on INFERRED/AMBIGUOUS
            |
            v
temporary graph rebuild
  ├─ clone current graph
  ├─ drop/recompute affected slice
  ├─ reuse untouched slice
  └─ validate parity/integrity
            |
            v
SQLite transactional writeback
  ├─ retain one pre-refresh snapshot
  ├─ commit new truth atomically
  └─ update graph integrity metadata
            |
            v
CLI/MCP diagnostics
  ├─ refresh_status
  ├─ graph_status
  ├─ changed/reused/recomputed/invalidated/failed
  └─ stable machine codes
```

### Recommended Project Structure
```text
src/
├── cli/commands/                    # 增量入口与 human summary
├── cli/                             # changed-file resolver / shared diagnostics
├── infrastructure/storage/          # graph clone / slice helper / snapshot helper
├── infrastructure/storage/adapters/ # SQLite atomic writeback
├── infrastructure/repositories/     # 单一 persistence seam
└── server/handlers/                 # 仅同步 unsupported/diagnostic 行为
```

### Pattern 1: Explicit Changed Files Override Diff-Derived Input
**What:** `--changed-files` 胜过 `--base`，并要有稳定 warning code。[VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:149-163]

**When to use:** 同时给出显式 changed-file set 与 diff baseline 时。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:17-20]

**Example:**
```typescript
// Source: src/cli/contract-diff-scope.ts:149-163
if (changedFiles.length > 0) {
  const resolvedScope = normalizeChangedFiles(changedFiles, paths);
  if (options.base && resolvedScope.scanMode === 'diff') {
    resolvedScope.warnings.push({
      code: 'changed-files-overrides-base',
      message: '--changed-files 已显式提供，忽略 --base',
    });
  }
  return resolvedScope;
}
```

### Pattern 2: Clone First, Commit Once
**What:** 在临时图上做 slice rebuild，最后一次事务提交。[VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:18-49][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422]

**When to use:** 任意增量刷新写回路径。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:28-31]

**Example:**
```typescript
// Source: adapted from SQLiteStorage transaction seam
const nextGraph = cloneCodeGraph(currentGraph);
// mutate nextGraph with rebuilt slice
validateNextGraph(nextGraph);
database.exec('BEGIN');
try {
  replaceCurrentGraph(database, nextGraph, 'incremental-refresh', recordedAt);
  database.exec('COMMIT');
} catch (error) {
  database.exec('ROLLBACK');
  throw error;
}
```

### Pattern 3: Refresh Result and Graph Integrity Must Be Separate
**What:** `refresh_status` 描述本次尝试；`graph_status` 描述当前 persisted graph 状态。[VERIFIED: codebase grep; src/interface/types/storage.ts:56-64][VERIFIED: codebase grep; src/server/mcp/service.ts:49-78][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:28-45]

**When to use:** 所有 human/JSON/MCP 输出增量结果时。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:34-39]

### Anti-Patterns to Avoid
- Silent auto full-regenerate fallback。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:38-45]
- 直接把现有单向 cache cascade 当成双向 2-hop invalidation 算法。[VERIFIED: codebase grep; src/cache/index.ts:280-325][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:22-27]
- 边分析边改 SQLite 表，而不是先构建 next graph。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1114-1276][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422]
- 复用 `graphStatus` 直接承载 `failed`。[VERIFIED: codebase grep; src/interface/types/storage.ts:56-64]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| changed-file precedence | 再写一套 override/fallback 解析器 | 复用 `contract-diff-scope` 模式 | 已有路径归一化、边界检查和 warning code。[VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:83-116][VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:143-174] |
| atomic writeback | ad-hoc SQLite commit/rollback 协议 | 复用 `runInTransaction()` | 现有 schema/projection/caching 全围绕这条边界。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1454] |
| second graph truth | 平行 in-memory-only writer 或新 backend | 复用 `CodeGraphRepositoryImpl` + SQLiteStorage | v2.2/63 已锁定 graph-v1 truth 与 SQLite-only baseline。[VERIFIED: codebase grep; .planning/STATE.md:52-53][VERIFIED: codebase grep; src/infrastructure/repositories/CodeGraphRepositoryImpl.ts:26-35] |
| server-first rollout | 先开放 public refresh API | 先落在 CLI `generate` 路径 | handler 目前明确 unsupported。[VERIFIED: codebase grep; src/server/handlers/AnalysisHandler.ts:138-153] |

**Key insight:** Phase 64 新增的核心价值不是“更少解析文件”本身，而是“更可靠的 scope、可追溯的局部传播、和不会污染 persisted truth 的失败降级”。[VERIFIED: codebase grep; .planning/ROADMAP.md:42-46][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:34-45]

## Common Pitfalls

### Pitfall 1: 只缩小 parse input，却仍全量重写 persisted graph
**What goes wrong:** CPU 可能省了，但并没有实现 scoped persisted refresh。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1114-1276]
**Why it happens:** 现有唯一写入 seam 就是 full replace。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:425-428]
**How to avoid:** 设计明确的 slice replace seam 或 next-graph commit seam。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:28-31]
**Warning signs:** 方案里没有 reused slice 概念，只有“重新生成更少文件”。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:34-37]

### Pitfall 2: 只按 module import 做 invalidation
**What goes wrong:** symbol/call edges 被漏刷，Phase 65 impact traversal 会吃到脏边界。[VERIFIED: codebase grep; src/cli/commands/generate.ts:521-564][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:550-577]
**Why it happens:** 现有 cache cascade 是文件级、单向、module-heavy。[VERIFIED: codebase grep; src/cache/index.ts:280-325]
**How to avoid:** invalidation 以 graph-v1 entity/edge truth 为准，而不是仅靠 parse cache dependency map。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:22-27]
**Warning signs:** 设计文档完全不提 symbol/call edges 或 confidence semantics。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:22-27]

### Pitfall 3: 把 unreliable diff boundary 宽容地扩大成 full scan
**What goes wrong:** 这会把 refresh failure 伪装成成功路径，并污染 observability。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:19-20][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:38-45]
**Why it happens:** `contract-diff-scope` 的语义是 contract-check fallback，不是 persisted truth mutation。[VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:48-64]
**How to avoid:** 对 graph refresh 改成 fail-closed command result `failed` + remediation。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:38-45]
**Warning signs:** 设计里出现“自动改跑 full generate”，但没有显式用户重试边界。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:38-45]

## Code Examples

### Changed-file sourcing precedent
```typescript
// Source: src/cli/commands/ci.ts:320-341
try {
  const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, { encoding: 'utf-8' });
  const files = parseGitDiffFiles(output);
  if (files.length > 0) return files;
} catch {
  // fallback to HEAD diff
}
```

### Current transaction seam
```typescript
// Source: src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422
private runInTransaction(database: SQLiteDatabaseLike, callback: () => void): void {
  database.exec('BEGIN');
  try {
    callback();
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generate` 总是全量分析并全量落盘。[VERIFIED: codebase grep; src/cli/commands/generate.ts:265-341] | Phase 64 应把增量刷新定义成同一路径上的安全收窄。[VERIFIED: codebase grep; .planning/ROADMAP.md:33-46] | Phase 64 planning。[VERIFIED: codebase grep; .planning/ROADMAP.md:31-46] | planner 需要 changed-file → invalidation → rebuild → transaction 的完整链路。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:22-45] |
| graph integrity 只有 `complete|partial`，MCP 再映射 `missing`。[VERIFIED: codebase grep; src/interface/types/storage.ts:56-64][VERIFIED: codebase grep; src/server/mcp/service.ts:49-78] | Phase 64 新增 refresh result `success|partial|failed` 层。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:28-45] | Phase 64 locked decisions。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:28-45] | 不能把本次尝试失败伪装成 partial graph success。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:34-45] |
| public server refresh API 仍未开放。[VERIFIED: codebase grep; src/server/handlers/AnalysisHandler.ts:138-153] | 先做 CLI/storage seam，再决定是否公开 API。[VERIFIED: codebase grep; src/cli/commands/generate.ts:335-341] | Current repo state。[VERIFIED: codebase grep; .planning/STATE.md:43-46] | 避免过早扩大 API contract 变更面。[VERIFIED: codebase grep; .planning/codebase/ARCHITECTURE.md:7-12] |

**Deprecated/outdated:**
- 把单向 cache invalidation 当成 graph refresh 算法主体已经不够。[VERIFIED: codebase grep; src/cache/index.ts:280-325][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:22-27]
- 只证明 `codemap.json` 侧 direct-execution 成功，不足以证明 SQLite refresh truth 一致性。[VERIFIED: codebase grep; src/cli/storage-runtime.ts:33-54][VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-02-SUMMARY.md:74-80]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| None | 本研究核心结论均由仓库事实或本地环境探测支撑。[VERIFIED: codebase grep; .planning/ROADMAP.md:31-46][VERIFIED: local command] | — | — |

## Open Questions (RESOLVED)

1. **refresh diagnostics 是否需要持久化到 metadata/snapshot？**
   - What we know: 当前 metadata 只保存 graph integrity 相关键，`snapshots` 是单镜像，`history_snapshots/history_relations` 是历史材料。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:92-100][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1187-1272]
   - Resolved decision: D-13~D-16 要求的 refresh diagnostics **必须跨进程保留**，但按摘要/详情分层持久化。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:34-45]
   - RESOLVED boundary:
     - `GraphMetadata` 持久化最近一次 refresh attempt 的摘要：`refresh_status`、`changed/reused/recomputed/invalidated/failed` 计数、稳定 diagnostics codes、是否存在 stale/failed slices。
     - 单个 pre-refresh snapshot 持久化更细的 affected-slice 与 reason evidence，用于回滚/对比/调试。
     - CLI / JSON / MCP 继续直接输出同一份 refresh attempt truth，而不是让调用方再拼装。
   - Why: 只放在 command result 会让后续命令和跨进程读面失去 refresh 状态；全部塞进 metadata 又会过重，因此 summary 进 metadata、详情进 snapshot 最符合 D-11 / D-15 / D-16。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:29-45]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | built CLI、Vitest、SQLite runtime [VERIFIED: codebase grep; .planning/codebase/INTEGRATIONS.md:7-12] | ✓ [VERIFIED: local command] | `v24.14.0` [VERIFIED: local command] | — |
| npm | build/test/typecheck [VERIFIED: codebase grep; package.json:31-41] | ✓ [VERIFIED: local command] | `11.9.0` [VERIFIED: local command] | — |
| Git | default changed-file sourcing [VERIFIED: codebase grep; src/cli/commands/ci.ts:320-341] | ✓ [VERIFIED: local command] | `2.43.0` [VERIFIED: local command] | explicit `--changed-files` [VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:17-20] |
| built CLI `dist/cli/index.js` | real subprocess proof [VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-02-SUMMARY.md:50-60] | ✓ [VERIFIED: local command] | local artifact [VERIFIED: local command] | `rtk npm run build` [VERIFIED: codebase grep; package.json:31-32] |

**Missing dependencies with no fallback:** None.[VERIFIED: local command]  
**Missing dependencies with fallback:** None.[VERIFIED: local command]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest on Node.[VERIFIED: codebase grep; vitest.config.ts:9-26] |
| Config file | `vitest.config.ts`; `vitest.e2e.config.ts`.[VERIFIED: codebase grep; vitest.config.ts:9-26][VERIFIED: codebase grep; vitest.e2e.config.ts:8-23] |
| Quick run command | `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/generate.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/server/handlers/__tests__/AnalysisHandler.test.ts`.[VERIFIED: codebase grep; src/cli/commands/__tests__/generate.test.ts:1][VERIFIED: codebase grep; src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:1][VERIFIED: codebase grep; src/server/handlers/__tests__/AnalysisHandler.test.ts:1] |
| Full suite command | `rtk npm test && rtk npm run test:e2e && rtk npm run typecheck`.[VERIFIED: codebase grep; package.json:31-41] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INCR-01 | precedence、fail-closed scope、explicit changed-files override [VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:16-21] | unit | `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/generate-incremental.test.ts` [ASSUMED] | ❌ Wave 0 |
| INCR-01 | built CLI temp repo incremental success path [VERIFIED: codebase grep; .planning/ROADMAP.md:42-46] | e2e | `rtk ./node_modules/.bin/vitest run tests/e2e/incremental-graph-refresh.test.ts --config vitest.e2e.config.ts` [ASSUMED] | ❌ Wave 0 |
| INCR-02 | transactional slice rebuild、snapshot、partial/stale diagnostics [VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:28-45] | integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteIncrementalRefresh.test.ts` [ASSUMED] | ❌ Wave 0 |
| INCR-02 | unsupported/high-risk downgrade 返回 stable codes [VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:38-45] | unit | `rtk ./node_modules/.bin/vitest run src/server/handlers/__tests__/AnalysisHandler.test.ts src/cli/commands/__tests__/generate-incremental.test.ts` [ASSUMED] | `AnalysisHandler.test.ts` ✅ / 增量专用测试 ❌ |

### Sampling Rate
- **Per task commit:** `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/generate.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts`
- **Per wave merge:** `rtk npm test`
- **Phase gate:** `rtk npm test && rtk npm run test:e2e && rtk npm run typecheck`

### Wave 0 Gaps
- [ ] `src/cli/commands/__tests__/generate-incremental.test.ts` — changed-file precedence、stable codes、fail-closed downgrade。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:16-45]
- [ ] `src/infrastructure/storage/__tests__/SQLiteIncrementalRefresh.test.ts` — slice replace、single snapshot、rollback parity。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1114-1276][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422]
- [ ] `tests/e2e/incremental-graph-refresh.test.ts` — built CLI + real filesystem + real subprocess 成功/失败路径。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-02-SUMMARY.md:50-60][VERIFIED: codebase grep; AGENTS.md:140-145]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no [VERIFIED: codebase grep; .planning/codebase/INTEGRATIONS.md:63-70] | None — Phase 64 不增加用户鉴权面。 |
| V3 Session Management | no [VERIFIED: codebase grep; .planning/codebase/INTEGRATIONS.md:63-70] | None — CLI/local runtime only。 |
| V4 Access Control | no [VERIFIED: codebase grep; ARCHITECTURE.md:13-20] | None — 非多租户权限问题。 |
| V5 Input Validation | yes [VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:83-116] | 路径归一化、存在性检查、against-boundary 检查、fail-closed fallback。 |
| V6 Cryptography | no [VERIFIED: codebase grep; .planning/codebase/INTEGRATIONS.md:63-70] | None — 本 phase 关注事务完整性，不是加密。 |

### Known Threat Patterns for TypeScript CLI + SQLite graph refresh

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| changed-file 路径越界项目根 | Tampering | `path.resolve` + `existsSync` + `isWithinAgainstPath`，不可靠则 fail-closed。[VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:83-116] |
| `git diff` 失败后静默改跑 full generate | Tampering / Repudiation | 返回 `failed` + remediation，不在同一命令里自动 fallback。[VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:38-45] |
| slice writeback 中断导致 projection drift | Tampering / DoS | 提交前后执行事务与 projection parity 守卫。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1005-1026][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422] |
| 诊断缺失导致 agent 误读 stale graph | Integrity | 拆分 `refresh_status` 与 `graph_status`，并输出 stable machine codes。[VERIFIED: codebase grep; src/server/mcp/service.ts:53-78][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:34-45] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:7-45`
- `.planning/ROADMAP.md:31-46`
- `.planning/REQUIREMENTS.md:14-18`
- `.planning/PROJECT.md:15-45`
- `.planning/STATE.md:25-53,96-108`
- `.planning/phases/63-graph-schema-foundation/63-02-SUMMARY.md:29-36,50-60,74-80`
- `src/cli/commands/generate.ts:265-341,389-566`
- `src/infrastructure/storage/adapters/SQLiteStorage.ts:92-100,299-319,425-459,965-1026,1059-1276,1413-1454`
- `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts:20-35`
- `src/infrastructure/storage/graph-helpers.ts:18-49,51-112`
- `src/cache/index.ts:280-325`
- `src/cli/contract-diff-scope.ts:48-64,83-174`
- `src/cli/commands/ci.ts:307-341`
- `src/server/handlers/AnalysisHandler.ts:74-93,138-153`
- `src/server/mcp/service.ts:49-78,120-223`
- `ARCHITECTURE.md:19-20,38-57,72-74`

### Secondary (MEDIUM confidence)
- `.planning/codebase/ARCHITECTURE.md:7-12,24-29,74-85`
- `.planning/codebase/INTEGRATIONS.md:7-12,39-52,63-76`
- `AGENTS.md:103-160`
- `package.json:31-41,65,76,87`
- `vitest.config.ts:9-26`
- `vitest.e2e.config.ts:8-23`
- npm registry for `better-sqlite3`, `typescript`, `vitest`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 依赖版本、运行时和测试框架都可直接验证。[VERIFIED: codebase grep; package.json:31-41][VERIFIED: local command]
- Architecture: MEDIUM - 代码事实清楚，但增量命令面与诊断持久化策略仍属于规划结论。[VERIFIED: codebase grep; src/cli/commands/generate.ts:335-341][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422]
- Pitfalls: MEDIUM - 风险模式由现有实现和 locked decisions 推导，仍需实现期测试封死回归路径。[VERIFIED: codebase grep; src/cache/index.ts:280-325][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:22-45]

**Research date:** 2026-05-08  
**Valid until:** 2026-06-07 for repo facts; 2026-05-15 for npm/latest-version checks。[VERIFIED: npm registry]

## RESEARCH COMPLETE

**Phase:** 64 - incremental-graph-refresh  
**Confidence:** MEDIUM

### Key Findings
- 增量刷新应扩展 `generate` 主路径，而不是先开放新的 public server refresh API。[VERIFIED: codebase grep; src/cli/commands/generate.ts:335-341][VERIFIED: codebase grep; src/server/handlers/AnalysisHandler.ts:138-153]
- changed-file precedence 和 fail-safe 边界已有仓库先例，但 graph refresh 需要把“不可靠 scope”从 fallback 提升为 fail-closed `failed`。[VERIFIED: codebase grep; src/cli/contract-diff-scope.ts:48-64][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:38-45]
- 当前 SQLite 是整图事务替换模型，所以 Phase 64 必须先在内存/临时图完成 slice rebuild，再一次性提交。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1114-1276][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1413-1422]
- `refresh_status` 与 `graph_status` 必须分层，否则 partial/failed 语义会漂移。[VERIFIED: codebase grep; src/interface/types/storage.ts:56-64][VERIFIED: codebase grep; src/server/mcp/service.ts:49-78]
- 验证必须沿用 Phase 63 的 real filesystem + real subprocess 证明面，并新增至少一个失败降级场景。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-02-SUMMARY.md:50-60][VERIFIED: codebase grep; AGENTS.md:140-145]

### File Created
`.planning/phases/64-incremental-graph-refresh/64-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | 本地脚本、依赖和运行时都已验证。 |
| Architecture | MEDIUM | 增量策略清晰，但具体 storage seam 仍需实现期定型。 |
| Pitfalls | MEDIUM | 风险来源明确，仍需测试锁死。 |

### Resolved Decisions
- refresh diagnostics 不是“仅 command-local truth”；它必须跨进程持久化。摘要进 `GraphMetadata`，详细 affected/reason evidence 进单个 pre-refresh snapshot。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1187-1272][VERIFIED: codebase grep; .planning/phases/64-incremental-graph-refresh/64-CONTEXT.md:29-45]

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
