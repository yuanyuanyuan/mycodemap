# Phase 75: Core Infrastructure and Basic Token Analysis - Research

**Researched:** 2026-05-10
**Domain:** `codemap agent-metrics` Phase 75 foundation
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Representative Query Set
- **D-01:** Phase 75 uses a fixed built-in representative query set in the first release.
- **D-02:** The representative set must balance common agent workflows with heavier response shapes.
- **D-03:** The first release focuses on graph/query + content-style CodeMap queries, not tool/ops commands like `doctor` or `benchmark`.
- **D-04:** Query-set extensibility is deferred; repeatability and comparability come first.

### Persistence Granularity
- **D-05:** The primary persisted truth is per-run detail records, not pre-aggregated summaries.
- **D-06:** Aggregates should be computed at read/report time unless a concrete persistence need appears.
- **D-07:** Detail rows must at least capture query type, runtime timestamp, response size bytes, raw character count, and estimated token metrics.
- **D-08:** Do not store full query-input snapshots by default; keep storage narrow.

### Token Estimation Contract
- **D-09:** `rawCharCount` and `responseSizeBytes` are truth fields; token counts are estimated derived fields.
- **D-10:** Record both input and output token estimates, but label them as estimated.
- **D-11:** Use a simple, stable, explainable heuristic instead of a tokenizer dependency.
- **D-12:** Input-side estimation stays minimal in Phase 75; do not model full harness/system/tool-schema cost.

### Phase Boundary Reinforcement
- **D-13:** Ship a new `agent-metrics` command family; do not extend `benchmark`.
- **D-14:** Follow the locked history-pattern direction: thin CLI wrapper over a service layer with SQLite persistence.
- **D-15:** Do not expand Phase 75 into rich report UX, threshold policy tuning, CI enforcement, trend intelligence, or behavior telemetry.

### Deferred Ideas (OUT OF SCOPE)
- Project-custom or user-supplied query sets
- Git-history-driven scenario extraction as the primary sample source
- Tokenizer-accurate accounting
- Full prompt/harness/tool-schema token accounting
- CI threshold gates and non-zero exit semantics
- Trend/distribution intelligence and behavior classification
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CMD-01 | `codemap agent-metrics` command with `token` / `report` entry surfaces | Existing Commander family patterns and CLI registration seams already support this |
| CMD-02 | no-arg `codemap agent-metrics` runs the full report flow | Top-level command wrapper can dispatch to minimal report flow without inventing a new CLI pattern |
| TOKEN-01 | representative CodeMap queries execute token-cost analysis | Existing execution tools and code-graph storage can produce structured responses for a fixed built-in sample set |
| TOKEN-02 | each query reports JSON size, estimated tokens, and raw char count | Shared output layer plus SQLite detail-row persistence can carry both truth and estimated fields |
</phase_requirements>

## Project Constraints

- 输出与交付默认使用中文。[VERIFIED: AGENTS.md]
- 默认采用 retrieval-led reasoning；计划和研究必须以仓库事实为准。[VERIFIED: AGENTS.md]
- 只改与当前 phase 直接相关的文件；禁止顺手扩成 telemetry/CI/trend 工程。[VERIFIED: AGENTS.md]
- 新 CLI 能力应复用现有 shared output / interface-contract / storage seams，而不是新增并行模式。[VERIFIED: CLAUDE.md][VERIFIED: src/cli/output/index.ts][VERIFIED: src/cli/interface-contract/commands/index.ts]
- 任务结束必须能回到可验证 DoD，并至少覆盖 1 个失败场景。[VERIFIED: AGENTS.md]
- 仓库 shell 约定要求使用 `rtk` 包装命令。[VERIFIED: /home/stark/.codex/RTK.md]

## Summary

Phase 75 最稳妥的实现不是“把 ideation 里的所有聪明想法一次做完”，而是先把一个窄而可信的 measurement spine 打通：`agent-metrics` 命令家族、固定 built-in 查询样本、可重复的 token-cost run、SQLite detail-row 持久化、以及一个最小 report/default 入口。[VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/phases/75-core-infrastructure-basic-token-analysis/75-CONTEXT.md]

仓库现状已经给出了足够的可复用接缝：
- CLI 层已经有 command family 模式，可用 `.addCommand()` 或同等 Commander 子命令模式承载 `agent-metrics token` / `report`。[VERIFIED: src/cli/index.ts]
- `query` / `deps` 已经走 shared output + transport-free execution；这比 `benchmark` 的自绘输出模式更适合新命令复用。[VERIFIED: src/cli/commands/query.ts][VERIFIED: src/cli/commands/deps.ts][VERIFIED: src/cli/commands/benchmark.ts]
- `history` 已经证明了“thin CLI wrapper + dedicated service + configured storage”的本仓库模式。[VERIFIED: src/cli/commands/history.ts][VERIFIED: src/orchestrator/history-risk-service.ts]
- SQLite 存储层已有 snapshot-like append persistence 先例，新增 detail-row metrics table 属于自然扩展，而不是新存储方向。[VERIFIED: src/infrastructure/storage/adapters/SQLiteStorage.ts][VERIFIED: src/interface/types/storage.ts]

最关键的研究结论有三点：

1. **Phase 75 不应把 git history 场景提取做成主入口。**  
   brainstorm/ideation 里确实提出过从 git history 提取真实场景，但当前 phase context 已经把 sample source 锁成“fixed built-in representative query set”。因此 git history 最多只能作为后续 phase 的增强方向，不能覆盖当前 phase 的主真相源。[VERIFIED: docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md][VERIFIED: .planning/phases/75-core-infrastructure-basic-token-analysis/75-CONTEXT.md]

2. **Phase 75 应从 day one 复用 shared output，而不是复制 benchmark 的 table-only模式。**  
   benchmark 当前是 repo 已知技术债；新命令继续复制该模式只会再造债。`agent-metrics` 应采用 `resolveOutputMode()` + `renderOutput()`，human renderer 只是一个渲染层，而不是单独输出体系。[VERIFIED: src/cli/commands/benchmark.ts][VERIFIED: src/cli/commands/query.ts][VERIFIED: src/cli/output/index.ts]

3. **Phase 75 需要一个“最小 report”，但不是 Phase 76 的完整 reporting 产品。**  
   这是因为 `CMD-02` 要求 no-arg `codemap agent-metrics` 能跑完整报告流；如果 Phase 75 完全不落 `report`，当前 roadmap 自身就无法闭合。正确做法是：在 Phase 75 打通一个读取最新/本次 detail rows 的最小 report 入口； richer grouping、distribution、JSON schema richness 留给 Phase 76。[VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/PROJECT.md]

## Recommended Architecture

### 1. Command Surface

使用新的 command family，而不是扩 `benchmark`：

```text
codemap agent-metrics
  ├── token   # 执行固定 built-in sample set，持久化 detail rows
  └── report  # 读取并渲染最新/指定 run 的最小报告
```

无参数 `codemap agent-metrics` 直接走 `report` 语义；如果当前没有历史 run，可在 service 内先执行一次 token run，再渲染基础报告。

### 2. Service Boundary

保留 thin CLI wrapper，把核心逻辑压到单独 service：

```text
src/cli/commands/agent-metrics/index.ts
  -> src/orchestrator/agent-metrics-service.ts
      -> existing execution tools / storage runtime / SQLite persistence
```

service 负责：
- fixed built-in scenario definition
- query execution dispatch
- response JSON serialization and size counting
- raw char count and estimated token calculation
- detail-row persistence
- minimal report aggregation from persisted rows

CLI 只负责：
- flag parsing
- output mode resolution
- progress emitter
- renderOutput + exit surface

### 3. Representative Query Set

Phase 75 应优先选择“已有稳定执行面、覆盖常见/偏重响应形态”的 built-in sample set，而不是追求多。

推荐第一版固定样本：
- `query --symbol <stable repo symbol>`：符号查找，轻量结构化响应
- `deps --module <stable repo module>`：依赖查询，中等响应
- `impact --file <stable repo file>`：影响分析，偏重响应形态
- `analyze find --query <stable concept>` 或同等已存在 analyze intent：内容/检索风格响应

关键原则：
- 目标必须来自仓库内稳定、长期存在的 fixture/symbol/file，而不是用户机器上的偶然路径
- 每种 query type 只需 1 个起步样本，先证明 measurement path
- 不把 `doctor` / `benchmark` / 发布命令纳入 Phase 75 样本

### 4. Persistence Shape

新增一张 append-friendly detail table 即可，避免 summary-first 设计：

```text
agent_metrics_runs
  - id
  - project_id
  - recorded_at
  - sample_set_version
  - estimator_version

agent_metrics
  - id
  - run_id
  - query_type
  - command_slug
  - response_size_bytes
  - raw_char_count
  - estimated_input_tokens
  - estimated_output_tokens
  - estimated_total_tokens
  - execution_time_ms
  - metadata_json
```

如果仓库当前更偏向“单表 + metadata_json”实现，也可以收敛成一张表，但必须保留 `run_id` 语义，避免后续 report/trend 无法归组。

### 5. Token Estimation Contract

Phase 75 的估算策略应显式而保守：
- `rawCharCount = serializedJson.length`
- `responseSizeBytes = Buffer.byteLength(serializedJson, 'utf8')`
- `estimatedOutputTokens = ceil(rawCharCount / 4)`
- `estimatedInputTokens = minimal fixed approximation based on command/query string only`
- `estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens`

输出与持久化都必须把 “estimated” 写进字段名或解释文案里，防止伪装成 tokenizer-exact truth。

## Build Order Recommendation

1. **Command skeleton + contract + red tests**  
   先把 `agent-metrics` family、no-arg default、interface contract、最小 JSON shape expectation 钉住。

2. **Service + built-in sample set + persistence**  
   然后实现 token run、样本 dispatch、token estimation、SQLite detail-row 持久化。

3. **Minimal report path**  
   最后补 report/default flow，让无参数命令能闭合到基础报告，而不是把 rich reporting 一次做满。

## Validation Architecture

Phase 75 至少要证明以下四类真相：

1. **Command truth**  
   `codemap agent-metrics token` 和 `codemap agent-metrics report` 已注册；无参数 `codemap agent-metrics` 走默认 report 语义。

2. **Measurement truth**  
   每条 detail row 都包含 `responseSizeBytes`、`rawCharCount`、`estimatedInputTokens`、`estimatedOutputTokens`、`estimatedTotalTokens`。

3. **Persistence truth**  
   一次 token run 会把 run-level identity 和 detail rows 写入 SQLite，并可被后续 report 读取。

4. **Failure-path truth**  
   当某个 built-in scenario 目标缺失、执行失败、或仓库还未生成 code graph 时，命令必须返回可解释错误，而不是静默给 0 或空报告。

推荐验证顺序：
- focused unit tests for service and storage adapter
- command tests for default/no-arg/report routing
- targeted integration test against a seeded storage/runtime fixture
- `rtk npx tsc --noEmit`

## Common Pitfalls

### Pitfall 1: 把“固定 built-in 样本”偷偷改回 git-history 驱动
这会直接违反当前 phase context，并把结果稳定性变成 commit message 质量函数。

### Pitfall 2: 继续复制 benchmark 的自定义输出模式
这会让新命令从第一天起背上 shared output 迁移债。

### Pitfall 3: 输出看起来很精确，但没有强调 estimate
一旦 human/JSON payload 里只写 `tokens` 而不写 `estimated`，就会制造错误精度幻觉。

### Pitfall 4: 把 Phase 76/77 的能力塞回 Phase 75
例如 distribution、threshold gate、CI exit semantics、trend analysis，这些都属于后续 phase。

## Recommended Plan Shape

一个单计划文件即可闭合当前 phase，建议拆成三任务：

1. CLI family / contract / default routing
2. service + built-in samples + SQLite detail-row persistence
3. minimal report/default flow + end-to-end regression proof

---
*Phase: 75-core-infrastructure-basic-token-analysis*
*Research completed: 2026-05-10*
