# Phase 76: Estimation and Reporting - Research

**Researched:** 2026-05-10
**Domain:** `codemap agent-metrics` reporting depth on top of Phase 75 persisted truth
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Human-readable report shape
- **D-01:** Phase 76 should render a sectioned report with run metadata, summary, and formatted per-query table.
- **D-02:** The report should stay summary-first, not devolve into table-only or bullet-dump output.
- **D-03:** The current line-based renderer is explicitly insufficient as the final Phase 76 UX.

### Grouping and aggregation semantics
- **D-04:** Keep raw per-query rows and add grouped summary by `queryType`.
- **D-05:** Aggregate by `queryType` only in this phase; do not add `commandSlug` as a second grouping dimension.
- **D-06:** Compute aggregates at read/report time from persisted Phase 75 detail rows.

### JSON report contract
- **D-07:** Keep the JSON schema narrow and stable.
- **D-08:** Add grouped query-type summary data now instead of forcing downstream consumers to reconstruct it.
- **D-09:** Do not pre-allocate trend / threshold / comparison placeholders.

### Default reporting scope
- **D-10:** Report mode defaults to the latest persisted run only.
- **D-11:** Run-scoped metadata remains explicit.

### Distribution depth
- **D-12:** Grouped stats stop at average + min/max in Phase 76.
- **D-13:** Percentiles (`p50` / `p95`) are deferred to Phase 78.
- **D-14:** Response-size distribution signals should use lightweight min/max ranges now.

### Empty-state and command-path behavior
- **D-15:** Explicit `codemap agent-metrics report` should show a no-runs-yet / rebuild-needed state instead of silently creating a run.
- **D-16:** Bare `codemap agent-metrics` may still auto-run end-to-end.
- **D-17:** Empty persisted runs remain visible error conditions.

### Deferred Ideas (OUT OF SCOPE)
- Multi-run comparison or trend visualization
- Threshold gates / CI exit behavior
- Percentile distribution depth
- Custom sample sets or tokenizer-exact accounting
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RPT-01 | human-readable formatted report with table and summary | Existing human renderer is intentionally minimal and can be upgraded in-place |
| RPT-02 | JSON output with `schemaVersion` and `rawCharCount` suitable for CI consumption | Existing report schema already exposes these fields and can be extended incrementally |
| RPT-03 | grouped summary statistics by query type | Existing persisted detail rows already carry enough truth to compute grouped read-time aggregates |
</phase_requirements>

## Project Constraints

- 输出与交付默认使用中文。[VERIFIED: AGENTS.md]
- 默认采用 retrieval-led reasoning；计划和研究必须以仓库事实为准。[VERIFIED: AGENTS.md]
- 只改与当前 phase 直接相关的文件；禁止把 77/78 的 threshold / trend / percentile 能力混进来。[VERIFIED: AGENTS.md][VERIFIED: 76-CONTEXT.md]
- 继续复用 shared output / interface-contract / service seams，不引入 benchmark-style 平行输出体系。[VERIFIED: src/cli/output/index.ts][VERIFIED: src/cli/commands/agent-metrics/index.ts]
- 至少覆盖 1 个失败场景。[VERIFIED: AGENTS.md]
- shell 命令继续使用 `rtk` 包装。[VERIFIED: /home/stark/.codex/RTK.md]

## Summary

Phase 76 不是再做一遍 Phase 75 的 persistence，而是在其之上补齐“读出来怎么呈现、怎么聚合、CLI 在空数据时怎么分支”的 reporting contract。[VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/phases/76-estimation-and-reporting/76-CONTEXT.md]

当前实现已经暴露出三个稳定接缝：
- `AgentMetricsService` 已经能返回 single-run `rows` / `totals`，而且所有 truth fields 已落地到 persisted detail rows。[VERIFIED: src/orchestrator/agent-metrics-service.ts]
- `formatAgentMetricsReportHuman()` 目前只是 line dump，因此可以直接在同一文件里升级为 summary + table，而不用重写 CLI output stack。[VERIFIED: src/cli/commands/agent-metrics/human.ts]
- `agentMetricsContract` 已经声明了 report / token outputShape，因此 Phase 76 最稳妥的方式是增量扩展现有 contract，而不是替换顶层 schema。[VERIFIED: src/cli/interface-contract/commands/agent-metrics.ts]

最关键的研究结论有四点：

1. **Grouped summary 应该建在 service 层，而不是 renderer 临时拼接。**  
   human renderer 和 JSON output 都需要复用同一份 grouped truth；如果只在 renderer 里现算，会导致 JSON 和 human 两套逻辑漂移。[VERIFIED: src/orchestrator/agent-metrics-service.ts][VERIFIED: src/cli/commands/agent-metrics/human.ts]

2. **Phase 76 最合理的 JSON 扩展是新增 first-class grouped block，而不是改写 `rows` / `totals` 语义。**  
   现有测试与 contract 都围绕 `rows`、`totals`、`schemaVersion`；保留这些顶层字段，新增例如 `queryTypeSummaries` 之类的 block，能让 Phase 77 直接消费且不破坏 Phase 75 兼容面。[VERIFIED: src/cli/interface-contract/commands/agent-metrics.ts][VERIFIED: src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts]

3. **Explicit `report` 与 bare root flow 必须分叉。**  
   现在 `report` 和 bare command 都走 `runReportFlow()`，这会在显式 `report` 时也触发 auto-run，违反已锁定的 D-15 / D-16。Phase 76 应把 bare root 保留为 `runReportFlow()`，而把 `report` 改成“latest run only, no run then explicit error”。[VERIFIED: src/cli/commands/agent-metrics/index.ts][VERIFIED: 76-CONTEXT.md]

4. **Human table 不需要新依赖。**  
   仓库没有现成通用表格 helper，也没有必要为这个 phase 引入表格库。手工 column width + `padEnd()` 足以满足 summary + table 要求，而且更符合“minimum code”原则。[VERIFIED: src/cli/commands/benchmark.ts][VERIFIED: src/orchestrator/workflow/visualizer.ts]

## Recommended Architecture

### 1. Service-Layer Report Enrichment

在 `AgentMetricsService` 内把 Phase 76 report result 扩成：

```text
AgentMetricsReportResult
  - existing run metadata
  - rows[]
  - totals
  - queryTypeSummaries[]
```

每个 `queryTypeSummary` 推荐包含：
- `queryType`
- `queryCount`
- `avgResponseSizeBytes`
- `minResponseSizeBytes`
- `maxResponseSizeBytes`
- `avgRawCharCount`
- `minRawCharCount`
- `maxRawCharCount`
- `avgEstimatedTotalTokens`
- `minEstimatedTotalTokens`
- `maxEstimatedTotalTokens`
- `avgExecutionTimeMs`

理由：
- 覆盖 roadmap 里的 average token count 与 response size distribution
- 不提前引入 percentile
- 仍保持 run-scoped、read-time derived

### 2. Explicit Report vs Root Flow Split

建议把 CLI 行为拆成两条：

```text
codemap agent-metrics
  -> runReportFlow()            // no run -> execute token run -> report

codemap agent-metrics report
  -> buildLatestReport()
  -> if null: explicit actionable error
```

这样可以同时满足：
- bare command MVP 闭合
- explicit report 不隐式产生新测量

### 3. Human Renderer Shape

推荐 human output 结构：

```text
Agent Metrics Report
Run metadata...

Summary
- query count
- total bytes / chars / estimated tokens / execution time

By query type
| queryType | count | avg tok | min tok | max tok | avg bytes | min bytes | max bytes |

Per-query rows
| queryType | command | bytes | chars | est in | est out | est total | time |
```

关键原则：
- 先 summary，再 grouped summary，再 raw rows
- grouped section 用于 Phase 76 新价值
- raw rows 保留 sample-level 可追踪性

### 4. Contract Evolution

`agentMetricsContract` 最稳妥的扩展方式：
- 保留 `rows` / `items` / `totals`
- 新增 `queryTypeSummaries`
- 让 grouped item 成为 object array，而不是嵌套 dictionary

推荐 shape：

```text
queryTypeSummaries: [
  {
    queryType,
    queryCount,
    avgEstimatedTotalTokens,
    minEstimatedTotalTokens,
    maxEstimatedTotalTokens,
    avgResponseSizeBytes,
    minResponseSizeBytes,
    maxResponseSizeBytes
  }
]
```

理由：
- contract schema 更清晰
- downstream CI / parser 不需要处理动态 object keys

## Build Order Recommendation

1. **Service aggregation + report shape tests**  
   先把 grouped summary 的 truth 计算固定下来，并把 `report` explicit no-run behavior 写成红测。

2. **Human renderer upgrade**  
   在 service truth 稳定后升级 summary + table 输出，避免渲染阶段反向绑死 service 结构。

3. **Contract + CLI wiring + end-to-end regression**  
   最后扩 `agentMetricsContract`、修正 `report` 与 bare root 分叉，并验证 human/json 两条输出路径。

## Validation Architecture

Phase 76 至少要证明以下五类真相：

1. **Grouped-truth correctness**  
   同一 `queryType` 下多条 rows 会被聚合成一条 grouped summary，平均值和 min/max 正确。

2. **Human report shape**  
   输出不再是 line dump，而是 summary + grouped section + per-row table。

3. **JSON contract stability**  
   `schemaVersion`、`rows`、`totals`、truth-vs-estimate 字段保留，且 grouped block 可机器消费。

4. **Command-path split**  
   bare `agent-metrics` 仍可 auto-run；explicit `agent-metrics report` 在无 run 时返回 clear error。

5. **Empty-run visibility**  
   persisted latest run exists but has zero detail rows 时，仍返回 `AGENT_METRICS_EMPTY_RUN` 或同等 clear error。

推荐验证顺序：
- focused service tests for grouped stats and no-run split
- command tests for explicit `report` vs bare root behavior
- human renderer snapshot-ish assertions for section/table structure
- `rtk ./node_modules/.bin/vitest run ...`
- `rtk npm run typecheck`

## Common Pitfalls

### Pitfall 1: 在 renderer 里重复算 grouped summary
这会让 human / JSON 两套输出 drift，后续 CI 很快踩坑。

### Pitfall 2: 为了“省接口变更”继续让 `report` 自动触发 token run
这会直接违背 Phase 76 已锁定的 command-path behavior。

### Pitfall 3: 过早加入 percentile 或 multi-run compare
这会把 78 的 scope 提前混进 76。

### Pitfall 4: 用动态 object key 当 grouped summary schema
对机器消费不友好，也会让 interface-contract 更难维护。

## Recommended Plan Shape

一个单计划文件即可闭合当前 phase，建议拆成三任务：

1. report service 聚合与 explicit report-path split
2. human renderer 升级为 summary + grouped table + row table
3. interface contract / command tests / regression verification

---
*Phase: 76-estimation-and-reporting*
*Research completed: 2026-05-10*
