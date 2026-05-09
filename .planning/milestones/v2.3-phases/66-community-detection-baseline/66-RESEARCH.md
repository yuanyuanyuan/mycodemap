# Phase 66: Community Detection Baseline - Research

**Researched:** 2026-05-08
**Domain:** TypeScript/Node persisted-graph community detection baseline
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Baseline algorithm and weighting
- **D-01:** Phase 66 uses `Louvain` as the initial community-detection baseline rather than starting with Leiden or a pluggable algorithm framework.
- **D-02:** The implementation should preserve a clean seam for a later Leiden upgrade, but Phase 66 itself does not need to ship algorithm switching.
- **D-03:** Phase 66 locks a first-pass edge-type weighting scheme now instead of using equal weights.
- **D-04:** The weighting scheme should stay simple and interpretable, with stronger structural/call relationships weighted above weaker context-only relationships.
- **D-05:** The historical backlog weights are valid starting guidance for planning and research: `CALLS=1.0`, `INHERITS=0.8`, `IMPORTS_FROM=0.7`, `IMPLEMENTS=0.7`, `DEPENDS_ON=0.6`, `TESTED_BY=0.4`, `CONTAINS=0.3`.

### Cluster grain and graph truth
- **D-06:** Phase 66 clusters at the `module/file` level for the baseline instead of starting with symbol-level or mixed-granularity communities.
- **D-07:** Symbol-level or hybrid communities are explicitly deferred; the baseline should reveal module boundaries first because that is more stable and easier to explain.
- **D-08:** Phase 66 must reuse the persisted graph truth established in Phases 63-65 rather than introducing a separate community-only graph representation.

### Delivery surface
- **D-09:** The first public delivery surface for Phase 66 is an existing `agent-facing` surface, with `MCP` preferred over CLI for the baseline rollout.
- **D-10:** Phase 66 is complete with one well-formed public surface; it does not need to ship CLI and MCP simultaneously.
- **D-11:** If a thin CLI seam or internal helper is useful for implementation, that is acceptable, but only the MCP surface is required to satisfy the baseline completion bar.

### Output shape and degradation posture
- **D-12:** Community output should be primarily `interpretable` rather than a raw algorithm dump.
- **D-13:** The baseline result should include readable cluster summaries plus simple quality/explanation fields, not just opaque community IDs or scores.
- **D-14:** Sparse or weak-signal graphs should still be allowed to return cluster results when possible, but the result must explicitly downgrade confidence and attach warnings instead of overclaiming precision.
- **D-15:** Phase 66 should follow the established graph capability pattern: partial, weak-signal, or otherwise degraded community truth must be surfaced explicitly through structured warnings/status rather than hidden behind empty success or unqualified confidence.
- **D-16:** Hard refusal is reserved for cases where the graph truth is unavailable or clustering cannot be computed meaningfully at all; low-signal alone is not sufficient reason to suppress all output.

### the agent's Discretion
- Exact MCP tool shape and naming, as long as the first public surface is agent-facing and reuses existing graph-envelope conventions.
- Exact cluster summary fields, as long as the output remains readable and includes enough explanation for downstream agents to reason about module boundaries.
- Exact weak-signal heuristics and downgrade thresholds, as long as sparse or low-confidence cases are surfaced honestly and machine-readably.
- Exact internal library choice or implementation style for Louvain, as long as it fits the current TypeScript/Node stack and preserves a later Leiden-upgrade seam.

### Deferred Ideas (OUT OF SCOPE)
- Symbol-level communities and mixed-granularity clustering belong to a later graph-experience phase.
- Simultaneous CLI + MCP rollout is out of scope for the baseline; CLI can follow once the agent-facing surface and cluster semantics are stable.
- Multi-pass refinement such as automatic large-community re-splitting with Leiden is deferred beyond the Phase 66 baseline.
- Rich editable naming/configuration for community labels belongs to a later phase; Phase 66 only needs interpretable default summaries.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMM-01 | 维护者可以基于已存储 graph 计算基础 community / cluster 结果，用于揭示模块边界而不只看 import chain | 推荐用 persisted `CodeGraph` 投影成 module-level weighted undirected graph，再用 Louvain 计算社区，并输出解释字段与低信号降级。[VERIFIED: codebase grep; .planning/REQUIREMENTS.md:26-27][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:448-453][CITED: https://graphology.github.io/standard-library/communities-louvain.html] |
| COMM-02 | community detection 结果通过至少一个现有 CLI 或 agent-facing surface 暴露，而不要求调用方直接读取原始 SQL 表 | 推荐复用现有 MCP native tool 模式，新增一个 `codemap_communities` 类似 `codemap_impact` 的薄封装与 envelope，而不是先做 SQL-facing 或双表面 rollout。[VERIFIED: codebase grep; .planning/REQUIREMENTS.md:26-27][VERIFIED: codebase grep; src/server/mcp/server.ts:37-143][VERIFIED: codebase grep; src/server/mcp/service.ts:61-89] |
</phase_requirements>

## Summary

Phase 66 最稳的落地方式是：继续把 SQLite 持久化图当作唯一真相源，在服务侧按需读取 `CodeGraph`，把 module/file 作为节点、把 persisted dependency 折叠为可解释的加权 module affinity graph，然后用 Louvain 算法一次性算出社区，再通过 MCP 暴露结果。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:448-453][VERIFIED: codebase grep; src/infrastructure/storage/sqlite/schema.ts:54-76][VERIFIED: codebase grep; src/server/mcp/service.ts:254-267][VERIFIED: codebase grep; src/server/mcp/server.ts:93-143]

依赖选择上，`graphology@0.26.0` + `graphology-communities-louvain@2.0.2` 是当前最适合这仓库的基线：有 TypeScript 类型、官方 Louvain 包、支持 weighted edge、自带 `detailed()` 结果可拿到 `communities/count/modularity/dendrogram/moves/nodesVisited`，并且文档里已经把未来 Leiden 也放在同一生态内，但 npm registry 里当前没有名为 `graphology-communities-leiden` 的已发布包，所以 Phase 66 只能保留“算法 seam”，不能把 Leiden 当成下一步可直接 `npm install` 的既定事实。[CITED: https://graphology.github.io/standard-library/communities-louvain.html][VERIFIED: npm registry][VERIFIED: npm registry]

规划重点不该放在“如何把 Louvain 算出来”，而该放在“如何让输出诚实、可解释、与现有 degraded-state 契约一致”。现有 impact 路径已经建立了 `status/confidence/graph_status/warnings/remediation` 语言和真实 MCP transport 验证模式；Phase 66 应直接继承这个 posture，而不是引入第二套 opaque score dump。[VERIFIED: codebase grep; src/interface/types/storage.ts:51-121][VERIFIED: codebase grep; src/server/mcp/types.ts:7-17][VERIFIED: codebase grep; tests/e2e/graph-impact-analysis.test.ts:289-439]

**Primary recommendation:** 用 `graphology` 生态做 module-level weighted Louvain，按需计算、不新增 SQLite 社区表，先交付一个 `codemap_communities` MCP tool，并把低信号/稀疏图作为显式 reduced-confidence 成功路径来验证。[CITED: https://graphology.github.io/standard-library/communities-louvain.html][VERIFIED: codebase grep; src/server/mcp/server.ts:93-143][ASSUMED]

## Project Constraints (from AGENTS.md)

- 必须先读最相关事实来源，代码搜索优先用 CodeMap CLI；只有 CodeMap 结果不足时才回退 `rg`/`sed`。[VERIFIED: codebase grep; AGENTS.md:31-37][VERIFIED: codebase grep; AGENTS.md:77-81]
- 所有面向用户的结论要区分 `[证据]`、`[推论]`、`[假设]`；事实需要带仓库路径行号或外部 URL。[VERIFIED: codebase grep; AGENTS.md:48-67]
- 只做与 Phase 66 直接相关的最小改动，不顺手重构相邻代码；如果文档/契约会受影响，必须同步权威文档。[VERIFIED: codebase grep; AGENTS.md:41-46][VERIFIED: codebase grep; AGENTS.md:103-110]
- 真实场景验证是硬约束：至少 1 个失败场景，且要有真实 filesystem + subprocess 或真实 transport，不接受纯 mock happy path 充数。[VERIFIED: codebase grep; AGENTS.md:88-101][VERIFIED: codebase grep; docs/rules/testing.md:41-77]
- 公开命令与 runtime 现实要基于 `dist/cli/index.js`，MCP 相关改动要验证 stdout 协议纯净与结构化输出契约。[VERIFIED: codebase grep; AGENTS.md:118-121][VERIFIED: codebase grep; docs/rules/engineering-with-codex-openai.md:34-58]
- 当前测试基线是 Vitest，默认单测入口 `src/**/*.test.ts`，E2E 入口 `tests/e2e/**/*.test.ts`。[VERIFIED: codebase grep; vitest.config.ts:8-24][VERIFIED: codebase grep; vitest.e2e.config.ts:8-19]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persisted graph load & graph-health metadata | Database / Storage | API / Backend | SQLiteStorage 已提供 `loadCodeGraph()`/`loadGraphMetadata()`，并暴露 `graphStatus`/`failedFileCount`/`parseFailureFiles`，应继续由 storage 真相层负责。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:195-239][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:448-453] |
| Module projection from mixed module/symbol dependencies | API / Backend | Database / Storage | 社区算法需要把 persisted graph 解释成 module affinity graph，这属于分析逻辑，不应回写 SQL truth 或塞进 transport。[VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:353-401][VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14] |
| Weighted Louvain execution | API / Backend | — | 算法运行是纯分析过程，最适合放在共享 helper/service 层而不是 MCP handler 或 SQLite schema。[VERIFIED: codebase grep; src/server/mcp/service.ts:254-267][CITED: https://graphology.github.io/standard-library/communities-louvain.html] |
| Community result shaping and degraded-state warnings | API / Backend | Frontend Server (MCP) | 现有 impact helper 已定义 `status/confidence/warnings` 语言，社区结果应复用同一 shared-result posture，再由 MCP 做字段映射。[VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:171-205][VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:473-521][VERIFIED: codebase grep; src/server/mcp/service.ts:180-203] |
| Agent-facing delivery surface | Frontend Server (MCP) | API / Backend | D-09 锁定 MCP 优先；`server.ts` 已有 native tool 注册模式，最小风险是新增一个社区工具而不是扩展 CLI 公共表面。[VERIFIED: codebase grep; .planning/phases/66-community-detection-baseline/66-CONTEXT.md:28-31][VERIFIED: codebase grep; src/server/mcp/server.ts:37-143] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `graphology` | `0.26.0` | In-memory graph container for module affinity projection | 官方 JS/TS 图论生态核心库；与官方 Louvain 包直接配合，支持 directed/undirected/multi graph 基础能力。[VERIFIED: npm registry][CITED: https://graphology.github.io/standard-library/communities-louvain.html] |
| `graphology-communities-louvain` | `2.0.2` | Louvain community detection | 官方 Graphology Louvain 包；支持 weighted edge、resolution、`detailed()` 指标，避免自研 modularity bookkeeping。[VERIFIED: npm registry][CITED: https://graphology.github.io/standard-library/communities-louvain.html] |
| `@modelcontextprotocol/sdk` | `1.29.0` | Native MCP transport/tool registration | 仓库已在 MCP native tool 注册中使用，Phase 66 只需扩一个工具，不引入新 transport。[VERIFIED: npm registry][VERIFIED: codebase grep; src/server/mcp/server.ts:5-6] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `graphology-types` | `0.24.8` | Peer type package for graphology ecosystem | 如果 npm peer 解析或 TS 类型边界需要显式满足 `graphology-communities-louvain` peerDependency 时安装。[VERIFIED: npm registry][VERIFIED: npm registry] |
| `better-sqlite3` | `12.9.0` | Persisted graph storage runtime | 已是当前 graph truth 落盘与读取基础，不是 Phase 66 新增依赖。[VERIFIED: npm registry][VERIFIED: codebase grep; package.json] |
| `vitest` | `4.1.5` | Unit + E2E verification | 现有测试基线；Phase 66 应沿用现有 unit/MCP/E2E 分层验证模式。[VERIFIED: npm registry][VERIFIED: codebase grep; vitest.config.ts:8-24][VERIFIED: codebase grep; vitest.e2e.config.ts:8-19] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `graphology` + official Louvain package | `louvain` npm package `1.2.0` | `louvain` 最后 publish 于 2017-12-15，registry 元数据未声明类型文件，不适合作为当前 TS baseline。[VERIFIED: npm registry] |
| `graphology` + official Louvain package | `ngraph.graph` `20.1.2` + 自研 Louvain | `ngraph.graph` 只是图结构库，不提供官方 Louvain；会把算法正确性、调参与可解释性都变成仓库自负担。[VERIFIED: npm registry] |
| Dependency-based Louvain | 纯自研 Louvain | 会把 modularity 增量更新、随机遍历、dendrogram/细节指标、回归验证全部变成本 phase 范围，和“一天内可收敛的最小成果”冲突。[CITED: https://graphology.github.io/standard-library/communities-louvain.html][VERIFIED: codebase grep; AGENTS.md:41-46] |

**Installation:**
```bash
npm install graphology@0.26.0 graphology-communities-louvain@2.0.2 graphology-types@0.24.8
```

**Version verification:** 已用 `npm view` 验证推荐版本与发布时间：`graphology@0.26.0` 发布于 2025-01-26，`graphology-communities-louvain@2.0.2` 发布于 2024-12-17，`graphology-types@0.24.8` 发布于 2024-11-22。[VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
SQLite persisted graph truth
  modules / symbols / dependencies / graph_edges / metadata
        |
        v
SQLiteStorage.loadCodeGraph() + loadGraphMetadata()
        |
        v
Community projection helper
  - collapse symbol edges to module edges
  - normalize edge kinds -> locked weights
  - aggregate to undirected weighted module graph
        |
        v
Louvain runner
  - graphology graph
  - graphology-communities-louvain.detailed()
        |
        +------------------------+
        |                        |
        v                        v
community summaries         quality / warning heuristics
  - size                    - missing graph -> unavailable
  - representative paths    - partial graph -> reduced
  - dominant edge kinds     - sparse/weak signal -> reduced + warnings
  - cohesion/modularity
        |
        v
CodeMapMcpService mapper
        |
        v
codemap_communities MCP tool
  structuredContent + graph envelope + status/confidence/warnings
```

### Recommended Project Structure
```text
src/
├── infrastructure/storage/
│   ├── community-helpers.ts      # module projection + Louvain + summary/warning logic
│   └── __tests__/community-helpers.test.ts
├── interface/types/
│   └── storage.ts                # shared community result contracts
├── server/mcp/
│   ├── service.ts                # map shared community result -> MCP shape
│   ├── server.ts                 # register codemap_communities
│   ├── types.ts                  # MCP community payload types
│   └── __tests__/CodeMapMcpServer.test.ts
└── tests/e2e/
    └── graph-community-detection.test.ts
```

### Pattern 1: Shared Helper, Thin MCP Surface
**What:** 把社区计算与输出 shaping 放在共享 helper/service，MCP 只做输入校验与 envelope 映射。[VERIFIED: codebase grep; src/server/mcp/service.ts:180-267][VERIFIED: codebase grep; src/server/mcp/server.ts:93-143]
**When to use:** 任何要复用 persisted graph truth 且未来可能被 CLI/agent 双表面消费的图能力。[VERIFIED: codebase grep; tests/e2e/graph-impact-analysis.test.ts:289-340]
**Example:**
```typescript
// Source: src/server/mcp/service.ts
const metadata = await this.storage.loadGraphMetadata();
const graph = await this.storage.loadCodeGraph();
const request: ImpactAnalysisRequest = { kind: 'symbol', symbol, filePath, depth, limit };
return mapSharedImpactResult(analyzeImpactInGraph(graph, request), metadata);
```

### Pattern 2: Project Mixed Truth to Module-Level Analysis Graph
**What:** persisted truth里同时有 module 和 symbol edge；社区基线要先折叠到 module/file 节点，再做 weighted affinity clustering。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/schema.ts:54-76][VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14]
**When to use:** D-06 已锁定 module/file 粒度，且不想破坏 future Leiden seam。[VERIFIED: codebase grep; .planning/phases/66-community-detection-baseline/66-CONTEXT.md:24-26]
**Example:**
```typescript
// Source: recommended Phase 66 helper shape
for (const dependency of graph.dependencies) {
  const sourceModuleId = dependency.sourceEntityType === 'symbol'
    ? symbolToModule.get(dependency.sourceId)
    : dependency.sourceId;
  const targetModuleId = dependency.targetEntityType === 'symbol'
    ? symbolToModule.get(dependency.targetId)
    : dependency.targetId;
  if (!sourceModuleId || !targetModuleId || sourceModuleId === targetModuleId) continue;
  addUndirectedWeight(sourceModuleId, targetModuleId, weightFor(dependency.type));
}
```

### Pattern 3: Degraded Success, Not Fake Precision
**What:** 稀疏/弱信号图尽量仍返回社区，但把 `confidence` 降到 `reduced` 并附 `warnings[]`。[VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:473-521][VERIFIED: codebase grep; tests/e2e/graph-impact-analysis.test.ts:385-439]
**When to use:** partial graph、弱连接图、largest cluster 过大、singleton 过多等“还能算但不应过度自信”的场景。[ASSUMED]
**Example:**
```typescript
// Source: src/infrastructure/storage/graph-helpers.ts
if (graphStatus === 'partial') {
  warnings.push({
    code: 'GRAPH_PARTIAL',
    message: 'Graph truth is partial; parse failures may hide affected files or symbols.',
  });
  confidence = 'reduced';
}
```

### Anti-Patterns to Avoid
- **把社区结果先持久化进 SQLite 新表再暴露 MCP:** 当前没有社区失效/刷新契约，先持久化会把 Phase 66 复杂度扩到 schema + invalidation + writeback。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1008-1210][VERIFIED: codebase grep; .planning/ROADMAP.md:67-80][ASSUMED]
- **直接在 `server.ts` 里写算法:** 会重复现有 impact 之前已经避开的“surface-local graph logic”问题。[VERIFIED: codebase grep; src/server/mcp/service.ts:180-267][VERIFIED: codebase grep; src/server/mcp/server.ts:93-143]
- **照抄 backlog 的关系名做新 synthetic edge:** 当前 persisted dependency kinds 真实集合是 `import|inherit|implement|call|type-ref`，并没有 `TESTED_BY`/`CONTAINS`/`DEPENDS_ON` 真边可直接消费。[VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14][VERIFIED: codebase grep; docs/backlog.md:141-144]

## Recommended Output Contract

推荐新增 shared result 与 MCP result，字段风格直接对齐 impact/tool envelope，而不是发裸 partition map。[VERIFIED: codebase grep; src/server/mcp/types.ts:37-112]

```typescript
interface SharedCommunityResult {
  status: 'ok' | 'unavailable';
  confidence: 'high' | 'reduced' | 'unavailable';
  graphStatus: 'complete' | 'partial' | 'missing';
  summary: {
    totalModules: number;
    totalEdges: number;
    communityCount: number;
    singletonCount: number;
    modularity: number | null;
    largestCommunitySize: number;
    largestCommunityRatio: number;
  };
  communities: Array<{
    id: string;
    label: string;
    moduleIds: string[];
    modulePaths: string[];
    size: number;
    topPaths: string[];
    dominantEdgeKinds: Array<{ kind: string; weight: number }>;
    cohesion: number | null;
  }>;
  warnings: Array<{
    code:
      | 'GRAPH_PARTIAL'
      | 'LOW_SIGNAL_SPARSE_GRAPH'
      | 'LOW_SIGNAL_DOMINANT_SINGLE_CLUSTER'
      | 'LOW_SIGNAL_SINGLETON_HEAVY';
    message: string;
  }>;
  remediation?: string;
  error?: { code: 'GRAPH_NOT_FOUND'; message: string; details?: Record<string, unknown> };
}
```

解释字段建议固定保留 `label/topPaths/dominantEdgeKinds/cohesion`，因为这四类字段最适合让 agent 理解“这个 community 为什么存在”，也最容易从 module path 和聚合权重里稳定导出。[VERIFIED: codebase grep; .planning/phases/66-community-detection-baseline/66-CONTEXT.md:35-39][ASSUMED]

## Weighting and Projection Rules

| Current persisted kind | Phase 66 weight | Rule |
|------------------------|-----------------|------|
| `call` | `1.0` | 直接映射 backlog `CALLS`。[VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14][VERIFIED: codebase grep; docs/backlog.md:141-144] |
| `inherit` | `0.8` | 直接映射 backlog `INHERITS`。[VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14][VERIFIED: codebase grep; docs/backlog.md:141-144] |
| `implement` | `0.7` | 直接映射 backlog `IMPLEMENTS`。[VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14][VERIFIED: codebase grep; docs/backlog.md:141-144] |
| `import` | `0.7` | 作为 `IMPORTS_FROM` 的当前实现对应物。[VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14][VERIFIED: codebase grep; docs/backlog.md:141-144] |
| `type-ref` | `0.6` | 作为当前最接近 `DEPENDS_ON` 的弱结构边处理。[ASSUMED] |
| `TESTED_BY` / `CONTAINS` | `not emitted in v2.3 truth` | Phase 66 不应凭空合成这两类 persisted edge；后续如果 schema 真有这些边，再补权重即可。[VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14][VERIFIED: codebase grep; docs/backlog.md:141-144] |

额外投影规则：
- symbol→symbol `call` 边先折叠为 caller.module ↔ callee.module，再累计权重；同模块内边跳过，因为 module-level clustering 不需要 self affinity。[VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:353-401][ASSUMED]
- 多条边命中同一 module pair 时，用**求和**而不是 max；这样能保留“多关系叠加更强”的解释性，也与 Louvain 的 weighted edge 语义一致。[CITED: https://graphology.github.io/standard-library/communities-louvain.html][ASSUMED]
- Phase 66 推荐把分析图投影成 **undirected weighted graph**，因为“社区边界”表达的是模块相互耦合而不是影响方向；这样比 directed modularity 更容易解释给 agent。[CITED: https://graphology.github.io/standard-library/communities-louvain.html][ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Louvain modularity optimization | 自研社区移动/增量 modularity 逻辑 | `graphology-communities-louvain` | 官方包已提供 weighted Louvain 与 `detailed()` 指标，能把 Phase 66 聚焦在 projection/output，而不是算法正确性。[CITED: https://graphology.github.io/standard-library/communities-louvain.html] |
| Graph container + iteration utilities | 直接在 `Map<string, Map<string, number>>` 上堆整个算法 | `graphology` | TS 类型、边权读取、后续 Leiden seam 都更清晰。[CITED: https://graphology.github.io/standard-library/communities-louvain.html][VERIFIED: npm registry] |
| MCP transport/protocol layer | 新 transport 或自定义 envelope | 现有 `createCodeMapMcpServer` + `buildGraphEnvelope` 模式 | 仓库已经有原生 MCP 工具注册与 graph envelope；复用风险最低。[VERIFIED: codebase grep; src/server/mcp/server.ts:37-143][VERIFIED: codebase grep; src/server/mcp/service.ts:61-89] |
| SQL-level community read model | `communities` SQLite table + invalidation pipeline | Phase 66 按需计算 | baseline 只需一个 surface；先持久化社区会提早引入 refresh/schema 负担。[VERIFIED: codebase grep; .planning/ROADMAP.md:67-80][ASSUMED] |

**Key insight:** Phase 66 的真正复杂度不在数学，而在“如何把 persisted graph truth 转成 agent 可消费的、诚实的、低噪声的社区解释”。算法外包给成熟库，仓库自己只保留 projection、warnings 和 output contract。[CITED: https://graphology.github.io/standard-library/communities-louvain.html][VERIFIED: codebase grep; src/server/mcp/types.ts:96-153]

## Common Pitfalls

### Pitfall 1: 直接使用 backlog 关系名而忽略当前 persisted truth
**What goes wrong:** 规划时把 `TESTED_BY`、`CONTAINS`、`DEPENDS_ON` 当成现成边，结果实现阶段才发现 SQLite truth 里没有这些 dependency kinds。[VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14][VERIFIED: codebase grep; docs/backlog.md:141-144]
**Why it happens:** backlog 给的是历史指导，不是当前 schema 的逐字段镜像。[VERIFIED: codebase grep; .planning/phases/66-community-detection-baseline/66-CONTEXT.md:21]
**How to avoid:** 先锁“当前可用 kind 映射表”，把缺席 kind 作为 future seam 而不是 baseline 任务。[VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14]
**Warning signs:** 设计里出现需要新 synthetic edge 或新 SQL relation 才能满足 baseline 权重表。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/schema.ts:54-76]

### Pitfall 2: 把弱信号图当成精确社区
**What goes wrong:** 稀疏图、单大团、singleton-heavy 图被包装成“高置信度社区结构”，误导 agent 做结构性判断。[ASSUMED]
**Why it happens:** Louvain 总能给 partition，但 partition 存在不等于结构信号强。[CITED: https://graphology.github.io/standard-library/communities-louvain.html][ASSUMED]
**How to avoid:** 输出必须带 `confidence`、`warnings` 和简单质量摘要，不允许只给 opaque community id。[VERIFIED: codebase grep; .planning/phases/66-community-detection-baseline/66-CONTEXT.md:35-39][VERIFIED: codebase grep; src/server/mcp/types.ts:96-153]
**Warning signs:** modularity 接近 `0`、`largestCommunityRatio` 极高、singleton 占比过半。[ASSUMED]

### Pitfall 3: 继续膨胀 `graph-helpers.ts`
**What goes wrong:** 现有共享 helper 已经承担 clone/impact/cycle/statistics，多塞一套 community pipeline 会让维护和测试颗粒度更差。[VERIFIED: CodeMap CLI analyze on src/infrastructure/storage/graph-helpers.ts]
**Why it happens:** “复用 helper seam”被误解成“必须写进同一个文件”。[VERIFIED: codebase grep; .planning/phases/66-community-detection-baseline/66-CONTEXT.md:87-93]
**How to avoid:** 在同目录新建 `community-helpers.ts`，只复用共享类型/小工具，不把整个算法硬塞进现有文件。[ASSUMED]
**Warning signs:** 计划里只提修改 `graph-helpers.ts`，没有新增针对社区的独立测试文件。[VERIFIED: codebase grep; src/infrastructure/storage/__tests__/graph-helpers.test.ts:1-220]

## Code Examples

Verified patterns from official sources:

### Weighted Louvain with Detailed Output
```typescript
// Source: https://graphology.github.io/standard-library/communities-louvain.html
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

const graph = new Graph();
graph.mergeEdgeWithKey('a:b', 'a', 'b', {weight: 1.7});

const details = louvain.detailed(graph, {
  getEdgeWeight: 'weight',
  resolution: 1,
});
```

### Existing MCP Graph Envelope Pattern
```typescript
// Source: src/server/mcp/service.ts
return {
  status: result.status,
  confidence: result.confidence,
  ...buildGraphEnvelope(metadata),
  warnings: result.warnings.map((warning) => ({
    code: warning.code,
    message: warning.message,
  })),
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ngraph + self-built Louvain` backlog候选 | `graphology` + official Louvain package | registry verified on 2026-05-08; current package versions published 2024-12-17 / 2025-01-26 | 降低算法 ownership，保留未来 Leiden seam，但不把 Leiden 当作本 phase 可直接安装的承诺。[VERIFIED: npm registry][CITED: https://graphology.github.io/standard-library/communities-louvain.html] |
| 直接把图能力塞进 CLI/MCP surface | shared helper/service + thin surface adapter | 已在 Phase 65 impact 中成形 | Phase 66 应沿用同一 shared-truth 架构，而不是重新发明 graph surface pattern。[VERIFIED: codebase grep; src/server/mcp/service.ts:180-267][VERIFIED: codebase grep; tests/e2e/graph-impact-analysis.test.ts:289-439] |
| `codemap_context` 只含 module/symbol/edge stats | community surface 独立工具优先 | v2.2 明确把 communities 排除在 context route payload 外 | 不应把 baseline communities 强塞回 `codemap_context` 主 payload；应先独立 tool，再决定未来是否回灌摘要。[VERIFIED: codebase grep; docs/backlog.md:83][VERIFIED: codebase grep; .planning/phases/62-context-routing-gate/62-CONTEXT.md:23] |

**Deprecated/outdated:**
- `louvain` npm 旧包作为 baseline：最后 publish 于 2017-12-15，不带现代 TS metadata，已不适合当前仓库基线。[VERIFIED: npm registry]
- “先做 communities SQLite 表”作为 baseline：当前 roadmap/phase 边界没有要求双向持久化社区 truth，这会超出 baseline slice。[VERIFIED: codebase grep; .planning/ROADMAP.md:67-80][ASSUMED]

## Concrete Plan Split Recommendation

1. **Plan A: Community contracts + shared helper**
   - 新增 shared community result types。
   - 新增 `community-helpers.ts`，实现 module projection、weight map、Louvain runner、summary/warning shaping。
   - 单测覆盖 projection、权重累计、label/topPaths、low-signal downgrade。[VERIFIED: codebase grep; src/interface/types/storage.ts:110-121][ASSUMED]

2. **Plan B: MCP surface**
   - 在 `service.ts` 增加 shared→MCP mapper。
   - 在 `types.ts` 增加 MCP community payload。
   - 在 `server.ts` 注册 `codemap_communities` native tool，并沿用 `zod` 输入约束与 `structuredContent` 返回模式。[VERIFIED: codebase grep; src/server/mcp/server.ts:37-143][VERIFIED: codebase grep; src/server/mcp/types.ts:96-153]

3. **Plan C: Real verification**
   - 仿照 `graph-impact-analysis.test.ts` 做 built CLI + real SQLite + real MCP transport 证明。
   - 证明 sparse/weak-signal 图走 reduced-confidence success，不是假成功也不是一刀拒绝。[VERIFIED: codebase grep; tests/e2e/graph-impact-analysis.test.ts:289-439][ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `type-ref` 应按 `0.6` 映射为当前最接近 `DEPENDS_ON` 的弱结构边 | Weighting and Projection Rules | 如果实际语义差异太大，社区边界会被类型引用噪声拉偏。 |
| A2 | Phase 66 baseline 先按需计算 communities，不新增 SQLite `communities` 表，是更稳的 slice | Summary / Don’t Hand-Roll | 如果仓库真实图规模过大导致按需计算太慢，后续要回头补缓存或持久化。 |
| A3 | `LOW_SIGNAL_SPARSE_GRAPH` / `DOMINANT_SINGLE_CLUSTER` / `SINGLETON_HEAVY` 这类告警与阈值适合 baseline | Output Contract / Common Pitfalls | 如果阈值过严或过松，会造成误报或漏报，影响 planner 的验证设计。 |
| A4 | `community-helpers.ts` 独立文件比继续膨胀 `graph-helpers.ts` 更符合仓库可维护性 | Architecture Patterns / Pitfalls | 如果团队强烈偏好集中 helper，后续实现需要改成在原文件内拆函数。 |

## Open Questions (RESOLVED)

1. **社区 label 是否只用路径前缀，还是允许“路径前缀 + 主导类/函数名”混合命名？**
   - What we know: backlog 倾向“路径前缀优先，再 fallback 到 prefix::dominant class，再 fallback `community_N`”。[VERIFIED: codebase grep; docs/backlog.md:143-144]
   - What's unclear: Phase 66 是否要把第二层命名启发式一并做掉。
   - Recommendation: 先做“路径前缀优先 + `community_N` 兜底”，把主导符号命名留作可选增强，避免 baseline 过拟合噪声符号名。[ASSUMED]
   - RESOLVED: Phase 66 只实现“路径前缀优先 + `community_N` 兜底”，不引入 `dominant class/function` 混合命名；这样最符合 D-12/D-13 的可解释基线，也避免 symbol-level 命名噪声提前渗入 module-level 社区摘要。[推论: 基于 .planning/phases/66-community-detection-baseline/66-CONTEXT.md:35-39 与 docs/backlog.md:143-144]

2. **是否要把 community 摘要回灌进 `codemap_context.graphStats`？**
   - What we know: v2.2 明确说 `codemap_context` 不含 communities，Phase 66 只要求一个 agent-facing surface。[VERIFIED: codebase grep; .planning/phases/62-context-routing-gate/62-CONTEXT.md:23][VERIFIED: codebase grep; .planning/phases/66-community-detection-baseline/66-CONTEXT.md:28-31]
   - What's unclear: planner 是否想把 community count 作为 Phase 66 同步增强的一部分。
   - Recommendation: 不放进 baseline plan；先独立 `codemap_communities`，等语义稳定后再考虑 context 摘要回灌。[VERIFIED: codebase grep][ASSUMED]
   - RESOLVED: Phase 66 不把 community 摘要回灌到 `codemap_context.graphStats`；唯一 public baseline surface 是独立 MCP tool `codemap_communities`，待后续语义稳定再评估 context summary 回灌。[推论: 基于 .planning/phases/62-context-routing-gate/62-CONTEXT.md:23 与 .planning/phases/66-community-detection-baseline/66-CONTEXT.md:28-31]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build / MCP / tests | ✓ | `v24.14.0` | — |
| npm | install / build / version verification | ✓ | `11.9.0` | — |
| Vitest | unit / e2e validation | ✓ | `4.1.5` | `npm test` / `npm run test:e2e` wrappers |
| `better-sqlite3` | persisted graph truth | ✓ | `12.9.0` | repo already carries optional `sql.js`, but current graph truth path is SQLite-backed |
| `graphology` | Louvain baseline implementation | ✗ | — | self-implement or choose weaker package, both higher risk |
| `graphology-communities-louvain` | Louvain algorithm dependency | ✗ | — | self-implement Louvain, higher risk |

**Missing dependencies with no fallback:**
- None for planning itself; execution can install missing graphology packages before coding.[VERIFIED: package.json][VERIFIED: npm registry]

**Missing dependencies with fallback:**
- `graphology` and `graphology-communities-louvain` are not installed yet; fallback is self-implementation, but this should be treated as a last resort rather than a preferred path.[VERIFIED: npm registry][ASSUMED]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.5` |
| Config file | `vitest.config.ts`, `vitest.e2e.config.ts` |
| Quick run command | `npx vitest run src/infrastructure/storage/__tests__/community-helpers.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts` |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMM-01 | persisted graph can produce module communities with weighted Louvain and interpretable summaries | unit + e2e | `npx vitest run src/infrastructure/storage/__tests__/community-helpers.test.ts tests/e2e/graph-community-detection.test.ts -x` | task-internal TDD bootstrap |
| COMM-02 | community result is exposed through MCP with graph envelope and warnings | MCP integration + e2e | `npx vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts tests/e2e/graph-community-detection.test.ts -x` | partial (`CodeMapMcpServer.test.ts` exists, new cases required in-task) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/infrastructure/storage/__tests__/community-helpers.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
- **Per wave merge:** `npx vitest run tests/e2e/graph-community-detection.test.ts --config vitest.e2e.config.ts`
- **Phase gate:** `npm test && npm run test:e2e && npm run build`

### Test Bootstrap Decision (RESOLVED)
- 不新增 standalone Wave 0 plan；缺失测试文件在对应任务内按 `tdd="true"` 或同任务 bootstrap 创建。
- `src/infrastructure/storage/__tests__/community-helpers.test.ts` 由 Task 66-01-01 先写后实现。
- `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` 的新增 case 由 Task 66-01-02 在现有测试文件内扩展。
- `tests/e2e/graph-community-detection.test.ts` 与必要 fixture helper 由 Task 66-01-03 自举创建，并复用 Phase 65 的真实 SQLite + MCP transport 模式。

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 本 phase 为本地 CLI/MCP 分析能力，不新增 auth surface |
| V3 Session Management | no | 本 phase 不引入会话态 |
| V4 Access Control | no | 本 phase 不新增多租户/权限模型 |
| V5 Input Validation | yes | MCP tool 输入继续用 `zod` schema 做边界校验与 clamp。[VERIFIED: codebase grep; src/server/mcp/server.ts:93-127] |
| V6 Cryptography | no | 本 phase 不新增密码学功能 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 过大 depth/limit 或巨大图导致分析资源膨胀 | DoS | 仿照 impact 对输入做 clamp，并在 helper 内增加 module/node 上限或 early degradation。[VERIFIED: codebase grep; src/server/mcp/service.ts:107-127][ASSUMED] |
| 稀疏/partial 图被误判为高可信结构 | Tampering / Integrity | 强制 `confidence=reduced` + `warnings[]` + quality summary，而不是裸社区 ID。[VERIFIED: codebase grep; src/infrastructure/storage/graph-helpers.ts:473-521][ASSUMED] |
| 缺图或 stale truth 下返回假成功 | Integrity | 继续沿用 `GRAPH_NOT_FOUND` / `graph_status` envelope 与真实 E2E 失败验证。[VERIFIED: codebase grep; src/server/mcp/types.ts:7-17][VERIFIED: codebase grep; tests/e2e/graph-impact-analysis.test.ts:343-439] |

## Sources

### Primary (HIGH confidence)
- `/graphology/graphology` via Context7 — Louvain weighted-edge usage, `detailed()` output, resolution/getEdgeWeight options, official docs URL.[CITED: https://graphology.github.io/standard-library/communities-louvain.html]
- npm registry — `graphology@0.26.0`, `graphology-communities-louvain@2.0.2`, `graphology-types@0.24.8`, `@modelcontextprotocol/sdk@1.29.0`, `better-sqlite3@12.9.0`, `vitest@4.1.5`, `louvain@1.2.0`, `ngraph.graph@20.1.2` version/time/metadata checks.[VERIFIED: npm registry]
- Codebase grep / file reads — persisted graph schema, storage seams, MCP envelope pattern, current dependency kinds, and existing impact verification shape.[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/schema.ts:15-133][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:195-239][VERIFIED: codebase grep; src/server/mcp/service.ts:61-267][VERIFIED: codebase grep; tests/e2e/graph-impact-analysis.test.ts:289-439]

### Secondary (MEDIUM confidence)
- `docs/backlog.md` — historical weight seeds, naming heuristic seed, and earlier ngraph/self-built candidate direction.[VERIFIED: codebase grep; docs/backlog.md:141-144]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 官方 graphology 文档 + npm registry 版本/发布时间都已核验。[CITED: https://graphology.github.io/standard-library/communities-louvain.html][VERIFIED: npm registry]
- Architecture: HIGH - 当前 storage/MCP/impact 代码接缝和 E2E 模式都已存在，Phase 66 只是在同一轨道上扩能力。[VERIFIED: codebase grep; src/server/mcp/service.ts:180-267][VERIFIED: codebase grep; tests/e2e/graph-impact-analysis.test.ts:289-439]
- Pitfalls: MEDIUM - “当前 persisted kinds 与 backlog 权重名不完全一致”是代码事实，但低信号阈值与 label heuristics 仍带假设成分。[VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-14][ASSUMED]

**Research date:** 2026-05-08
**Valid until:** 2026-06-07
