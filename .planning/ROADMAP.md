# Roadmap: CodeMap

## Milestones

- ✅ **v2.4 parser-multilang-depth** — Phases `67-69, 71` (shipped `2026-05-10`)
- 🚧 **v2.5 deep-analysis-hooks** — Phases `70`, `72`, `73`, `74` (active)
- 🚧 **v2.7 agent-effectiveness-validation** — Phases `75-78` (active)
- 📋 **v2.6 polish-and-stabilize** — complexity / MCP / edge-ID / contract polish (planned)
- 📋 **v3.0 architecture-intelligence** — agent integration, architecture intelligence, broader parser coverage (planned)

## Phases

<details>
<summary>✅ v2.4 parser-multilang-depth (Phases 67-69, 71) — SHIPPED 2026-05-10</summary>

- [x] Phase 67: Tree-sitter Python Grammar Integration (1/1 plans) — completed 2026-05-09
- [x] Phase 68: Multi-language Parser Switching (2/2 plans) — completed 2026-05-09
- [x] Phase 69: PythonTypeEnhancer (2/2 plans) — completed 2026-05-09
- [x] Phase 71: Parser Legacy Cleanup (3/3 plans) — completed 2026-05-10

</details>

## 🚧 v2.5 deep-analysis-hooks

**Goal:** 在 `v2.4` 已收敛的 Python AST / type depth 与共享 parser 契约之上，交付 Python call-graph / complexity，并补齐 hub-bridge / hook / dedup follow-ups。

**Requirements:** `PY-07`, `PY-08`, `HOOK-01`, `HOOK-02`, `HOOK-03`

### Phase 70: Python Call-graph Extraction

**Goal:** 把 Python AST 深度扩展为稳定的文件内与跨文件调用关系，并将其写入 shared graph truth。
**Depends on:** Shipped `v2.4` parser/type baseline
**Requirements:** `PY-07`
**Plans:** 1 planned

**Success Criteria:**
1. Python parse/runtime path can emit file-local call relationships through shared `ParseResult.callGraph`.
2. Imported Python callees can resolve into cross-file graph dependency edges through the existing global-index / graph path.
3. Unresolved or ambiguous Python callees remain explicit instead of silently reading as complete success.

### Phase 72: Python Complexity Truth

**Goal:** 让 Python complexity metrics 进入 shared symbol/module truth，并被 downstream surfaces 复用。
**Depends on:** Phase 70 or equivalent stable Python deep-analysis seam
**Requirements:** `PY-08`
**Plans:** 1 planned

**Success Criteria:**
1. Python complexity metrics are computed from the active AST-based path, not the deprecated regex path.
2. Complexity data persists into shared symbol/module truth instead of staying trapped in one CLI-only output.
3. At least one downstream consumer path (CLI/MCP/analyzer) proves it reads the persisted complexity truth.

### Phase 73: Graph Topology Signals and Dedup

**Goal:** 在现有 graph/community baseline 上交付 hub / bridge detection，并用三层 dedup 策略保护 topology truth。
**Depends on:** Phase 70 for richer graph edges
**Requirements:** `HOOK-01`, `HOOK-03`
**Plans:** 1 planned

**Success Criteria:**
1. Hub / bridge output uses persisted graph truth and remains interpretable to users/agents.
2. Duplicate node/edge creation is suppressed across file-local, cross-file, and cache/writeback paths.
3. A failure-path or regression proof shows topology results are not inflated by duplicate graph artifacts.

### Phase 74: Env-contract Reminder Hook

**Goal:** 实现 first-remind-then-silent 的 hook 行为，并把提醒统一路由到 Phase 58 `env-contract` retrieval surface。
**Depends on:** Shipped Phase 58 env-contract baseline
**Requirements:** `HOOK-02`
**Plans:** 1 planned

**Success Criteria:**
1. The first matching session event triggers a reminder to query `env-contract`.
2. Later matching events in the same session stay silent.
3. If the retrieval surface is unavailable, the failure is visible and actionable rather than replaced by hidden fallback rules.

## 🚧 v2.7 agent-effectiveness-validation

**Milestone Goal:** 新建 `codemap agent-metrics` 命令，提供 token 成本分析维度的 agent 有效性指标。MVP 为 CLI 离线报告，后续演进到 MCP gateway 持续采集 + CI 门禁 + agent 行为分类。

### Phase 75: Core Infrastructure and Basic Token Analysis

**Goal:** 用户可以通过 `codemap agent-metrics token` 对代表性 CodeMap 查询执行 token 成本分析，获得每个查询的响应大小、估算 token 数和原始字符数。
**Depends on:** Nothing (first phase of milestone)
**Requirements:** CMD-01, CMD-02, TOKEN-01, TOKEN-02
**Plans:** TBD

**Success Criteria** (what must be TRUE):
1. `codemap agent-metrics token` executes a set of representative CodeMap queries (find callers, impact analysis, dependency trace, etc.) and reports per-query token cost data.
2. Each query result includes response JSON size, estimated token count (input + output), and raw character count.
3. `codemap agent-metrics` with no arguments runs the full token analysis and outputs a report (equivalent to `codemap agent-metrics report`).
4. The command follows the `history` pattern: thin CLI wrapper over a service layer, with SQLite persistence for `agent_metrics`.

### Phase 76: Estimation and Reporting

**Goal:** 用户可以获得格式化的 token 成本报告，支持人类可读表格和机器可消费的 JSON 两种输出模式，并按查询类型查看分组统计。
**Depends on:** Phase 75
**Requirements:** RPT-01, RPT-02, RPT-03
**Plans:** TBD

**Success Criteria** (what must be TRUE):
1. `codemap agent-metrics report` outputs a human-readable formatted report with table and summary.
2. `--json` flag produces JSON output with `schemaVersion` and `rawCharCount` fields, suitable for CI pipeline consumption.
3. Report includes grouped summary statistics by query type (average token count, response size distribution).

### Phase 77: CI Gate and Threshold Enforcement

**Goal:** CI 管道可以通过 `--max-tokens-per-query` 阈值参数检测 token 成本过高的查询，默认以 warn-only 模式运行，不阻断 pipeline。
**Depends on:** Phase 76 (JSON output for CI consumption)
**Requirements:** CI-01, CI-02, CI-03
**Plans:** TBD

**Success Criteria** (what must be TRUE):
1. `--max-tokens-per-query` parameter causes non-zero exit code when any single query exceeds the specified threshold.
2. CI mode outputs a concise pass/fail summary with key metrics.
3. Default behavior is warn-only: reports threshold violations without blocking the CI pipeline.

### Phase 78: Intelligence Layer — Trends and Distribution

**Goal:** 用户可以追踪 token 成本的绝对趋势、识别成本最高的查询类型、以及查看按查询类型的分布统计，从而判断哪些场景的 token 消耗可能抵消调用次数减少的收益。
**Depends on:** Phase 75 (stable token analysis baseline)
**Requirements:** TOKEN-03, TOKEN-04, TOKEN-05
**Plans:** TBD

**Success Criteria** (what must be TRUE):
1. Report tracks absolute token cost trends by query type over time (not compared to rg/grep — different information density).
2. Report identifies the highest token-cost query types and flags which scenarios may negate the benefit of reduced call frequency.
3. Report provides distribution statistics by query type (p50/p95/max) to help identify outliers.

## 📋 v2.6 polish-and-stabilize

- [ ] Complexity calculation unify (`POL-01`)
- [ ] MCP blank-line filter (`POL-02`)
- [ ] Edge ID normalization (`POL-03`)
- [ ] Interface Contract `1.0.0` (`POL-04`)

## 📋 v3.0 architecture-intelligence

- [ ] Auto-Provisioned Agent Skills
- [ ] MCP `verify_contract`
- [ ] Auto-Generate `design.md` from codebase
- [ ] Auto-Generate Architecture Remediation Patches
- [ ] Self-Healing Design Contract
- [ ] Parser extension for Rust / Java / C++

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 67. Tree-sitter Python Grammar Integration | v2.4 | 1/1 | Complete | 2026-05-09 |
| 68. Multi-language Parser Switching | v2.4 | 2/2 | Complete | 2026-05-09 |
| 69. PythonTypeEnhancer | v2.4 | 2/2 | Complete | 2026-05-09 |
| 70. Python Call-graph Extraction | v2.5 | 1/1 | Complete | 2026-05-10 |
| 71. Parser Legacy Cleanup | v2.4 | 3/3 | Complete | 2026-05-10 |
| 72. Python Complexity Truth | v2.5 | 0/0 | Planned | - |
| 73. Graph Topology Signals and Dedup | v2.5 | 0/0 | Planned | - |
| 74. Env-contract Reminder Hook | v2.5 | 1/1 | Complete | 2026-05-10 |
| 75. Core Infrastructure and Basic Token Analysis | v2.7 | 0/TBD | Not started | - |
| 76. Estimation and Reporting | v2.7 | 0/TBD | Not started | - |
| 77. CI Gate and Threshold Enforcement | v2.7 | 0/TBD | Not started | - |
| 78. Intelligence Layer — Trends and Distribution | v2.7 | 0/TBD | Not started | - |
