# Phase 78: Intelligence Layer - Trends and Distribution - Research

**Researched:** 2026-05-11  
**Domain:** agent-metrics intelligence layer on top of persisted SQLite token-cost facts  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Trend window and comparison scope
- **D-01:** Phase 78 default trend comparison should be **latest run vs previous run** only.
- **D-02:** Phase 78 should not default to comparing `N` recent runs or all historical runs.
- **D-03:** If trend comparison is unavailable because no previous run exists, the command should stay honest about that missing baseline rather than silently widening the time window.

### Cost-risk presentation
- **D-04:** Highest-cost results should be surfaced as a **ranked list** rather than buried inside grouped statistics.
- **D-05:** Each ranked high-cost query type or sample should include a **short risk note** explaining why its token cost may negate the benefit of reduced agent call frequency.
- **D-06:** Phase 78 should not introduce explicit `high / medium / low` risk grades by default.

### Distribution depth
- **D-07:** Phase 78 should extend the grouped summary with **`p50` / `p95` / `max`** depth by `queryType`.
- **D-08:** Existing `avg/min/max` style reporting from Phase 76 remains valid background context, but Phase 78's new outlier signal is the percentile layer.
- **D-09:** Phase 78 should not default to a heavier percentile set or long worst-sample appendices when `p50` / `p95` / `max` already answers the milestone requirement.

### Phase boundary reinforcement
- **D-10:** Phase 78 builds on the locked Phase 76 single-run report contract and the locked Phase 77 gate contract; it should extend them rather than replace them.
- **D-11:** Phase 78 should preserve the current report/root command family and avoid introducing a parallel analytics command surface.
- **D-12:** Phase 78 intelligence remains **advisory**, not a second CI-blocking policy surface beside Phase 77.

### the agent's Discretion
- Exact trend delta fields and wording, as long as default comparison remains latest-vs-previous and missing-history behavior stays explicit.
- Exact top-N count and ordering details for the ranked cost-risk section, as long as the highest-cost query types/samples remain obvious.
- Exact JSON field names and nesting for percentile/trend metadata, as long as the contract stays additive and machine-readable.

### Deferred Ideas (OUT OF SCOPE)
- Longer default historical windows such as `latest vs last N` or full-history trend mode
- Explicit `high / medium / low` risk grades
- Heavier percentile sets or default worst-sample appendices beyond `p50` / `p95` / `max`
- Normalized token trends, git-history scenario extraction, and broader intelligence-layer analytics beyond Phase 78
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOKEN-03 | 按查询类型追踪绝对 token 成本趋势 | Add a recent-run read path that returns latest + previous run metadata and rows, then compute additive `queryType` deltas in the service layer instead of widening the CLI surface. ([src/interface/types/storage.ts:439-446], [src/orchestrator/agent-metrics-service.ts:375-422]) [VERIFIED: codebase grep] |
| TOKEN-04 | 识别 token 成本最高的查询类型并标注成本风险场景 | Build a ranked advisory section from absolute token totals plus deterministic short notes derived from rank, delta, and dispersion; keep it advisory and on the report path only. ([.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md], [src/cli/commands/agent-metrics/index.ts:83-95]) [VERIFIED: codebase grep] |
| TOKEN-05 | 按查询类型提供 `p50/p95/max` 分布统计 | Extend the existing `queryTypeSummaries` aggregation seam with percentile fields and explicit sample counts; do not assume SQL percentile functions are available in the runtime. ([src/orchestrator/agent-metrics-service.ts:178-205], [https://www.sqlite.org/percentile.html]) [VERIFIED: codebase grep] [CITED: https://www.sqlite.org/percentile.html] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Use Chinese for research output and keep evidence explicit with source pointers. ([AGENTS.md:3-4], [AGENTS.md:60-66]) [VERIFIED: codebase grep]
- Prefer retrieval-led reasoning and read the nearest authoritative docs/code instead of broad repo wandering. ([AGENTS.md:30-33], [AGENTS.md:57-58]) [VERIFIED: codebase grep]
- Treat this work as `L0-自主` only because it is research/documentation; do not expand into release or unrelated cleanup. ([AGENTS.md:35-49], [AGENTS.md:53-58]) [VERIFIED: codebase grep]
- Keep changes surgical and scoped to the phase artifact; do not clean unrelated files. ([AGENTS.md:53-58]) [VERIFIED: codebase grep]
- Validation order for implementation planning is `npm run typecheck` → `npm run lint` → `npm test`, with docs checks first when docs or entry contracts move. ([docs/rules/validation.md:7-13], [docs/rules/validation.md:46-55]) [VERIFIED: codebase grep]
- For CLI work, prefer the existing `dist/cli/index.js` guardrail path, and extend the current command family instead of inventing a parallel surface. ([docs/rules/engineering-with-codex-openai.md:45-72]) [VERIFIED: codebase grep]
- The repo’s dependency direction remains `CLI -> Server -> Domain -> Infrastructure -> Interface`; Phase 78 planning should keep trend/risk math in service/domain-style seams and storage reads in infrastructure. ([ARCHITECTURE.md], [docs/rules/engineering-with-codex-openai.md:144-153]) [VERIFIED: codebase grep]
- Delivery must include at least one failure-mode validation, not only happy-path proof. ([AGENTS.md:104-110], [docs/rules/engineering-with-codex-openai.md:183-188]) [VERIFIED: codebase grep]

## Summary

Phase 78 should be planned as a narrow additive extension of the existing `agent-metrics report` path: storage still owns persisted run/detail truth, the service layer owns historical comparison plus percentile/ranking math, and the CLI/contract layer only exposes the new advisory fields in human and JSON output. The current code already centralizes report assembly in `AgentMetricsService`, already emits grouped `queryTypeSummaries`, and already keeps explicit `report` vs bare-root semantics separate, so the phase does not need a new command family, new table, or second policy surface. ([src/orchestrator/agent-metrics-service.ts:56-96], [src/orchestrator/agent-metrics-service.ts:375-468], [src/cli/commands/agent-metrics/index.ts:115-188], [.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep]

The real planning risk is data shape, not rendering. Today the built-in sample set contains four fixed samples covering four distinct query types, which means a single run usually has one row per `queryType`; if Phase 78 computes `p50/p95/max` only from the latest run’s grouped rows, most percentile values will collapse to the same number and add little signal. The planner should therefore explicitly decide the percentile sample population, with the strongest recommendation being “historical persisted rows for each `queryType`, while keeping trend deltas latest-vs-previous only.” ([src/orchestrator/agent-metrics-service.ts:470-520]) [VERIFIED: codebase grep] [ASSUMED]

The second planning risk is runtime capability drift around SQL percentiles. SQLite’s percentile functions are only available from SQLite `3.51.0` when compiled with `-DSQLITE_ENABLE_PERCENTILE`, or earlier as a loadable extension, so this repo should not plan SQL-native `percentile_cont` as a baseline capability unless runtime support is explicitly proven. Because the existing service already aggregates rows in TypeScript and the machine lacks a `sqlite3` CLI while the repo’s `better-sqlite3` tests pass, the lowest-risk plan is to keep percentile math in the service layer with deterministic tests. ([https://www.sqlite.org/percentile.html], [src/orchestrator/agent-metrics-service.ts:178-205], [src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:645-710]) [CITED: https://www.sqlite.org/percentile.html] [VERIFIED: codebase grep] [VERIFIED: vitest run]

**Primary recommendation:** Extend `AgentMetricsService` with a recent-run read seam plus TypeScript-side trend/percentile/ranking helpers, then expose the results as additive report fields on the existing `agent-metrics report` human/JSON surfaces. ([src/orchestrator/agent-metrics-service.ts:375-468], [src/cli/interface-contract/commands/agent-metrics.ts:33-151]) [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Latest vs previous run lookup | Database / Storage | API / Backend | Historical comparison starts from persisted `agent_metrics_runs` and `agent_metrics` rows; the current storage seam only exposes latest-run + by-run detail reads, so Phase 78 must extend infrastructure read APIs first. ([src/interface/types/storage.ts:439-446], [src/infrastructure/storage/adapters/SQLiteStorage.ts:940-1029]) [VERIFIED: codebase grep] |
| Trend delta computation by `queryType` | API / Backend | Database / Storage | Deltas are additive report-time math over persisted rows and belong beside existing grouped-summary logic in `AgentMetricsService`, not in SQL rendering or the CLI wrapper. ([src/orchestrator/agent-metrics-service.ts:178-205], [src/orchestrator/agent-metrics-service.ts:424-468]) [VERIFIED: codebase grep] |
| Ranked cost-risk notes | API / Backend | CLI | Ranking should be computed once from shared report truth, while final presentation stays human/JSON specific. ([.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md], [src/cli/commands/agent-metrics/human.ts:94-138]) [VERIFIED: codebase grep] |
| Percentile/distribution summaries | API / Backend | CLI / Interface | `queryTypeSummaries` already come from service-layer aggregation and then flow into contract + renderer; percentile fields should follow the same ownership split. ([src/orchestrator/agent-metrics-service.ts:178-205], [src/cli/interface-contract/commands/agent-metrics.ts:93-150]) [VERIFIED: codebase grep] |
| Human-readable report changes | CLI | API / Backend | The CLI renderer should remain read-only over report truth, avoiding duplicate trend/percentile math. ([src/cli/commands/agent-metrics/human.ts:37-138]) [VERIFIED: codebase grep] |
| JSON contract evolution | CLI / Interface | API / Backend | Machine-readable additive fields are declared in the command contract and proven by interface-contract tests. ([src/cli/interface-contract/commands/agent-metrics.ts:33-165], [src/cli/interface-contract/__tests__/interface-contract.test.ts:106-120]) [VERIFIED: codebase grep] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-sqlite3` | repo pin `^12.9.0`; npm latest `12.9.0` published `2026-04-12` | persisted run/detail truth and deterministic local reads | Phase 78 already depends on the existing SQLite-backed storage seam; no new database layer is needed. ([package.json:62-81], [src/infrastructure/storage/sqlite/schema.ts:107-160], [src/infrastructure/storage/adapters/SQLiteStorage.ts:940-1029]) [VERIFIED: codebase grep] [VERIFIED: npm registry] |
| `commander` | repo pin `^11.1.0`; npm latest `14.0.3` published `2026-01-31` | keep extending the existing `agent-metrics` command family | The locked phase boundary forbids a parallel analytics command surface, and current flag parsing already lives here. ([package.json:62-81], [src/cli/commands/agent-metrics/index.ts:35-188], [.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep] [VERIFIED: npm registry] |
| `TypeScript` | repo pin `^5.3.3`; npm latest `6.0.3` published `2026-04-16` | additive service/contract typing for trends and percentiles | The repo is already TypeScript-first and Phase 78 only needs additive type changes, not a compiler migration. ([package.json:76-90]) [VERIFIED: codebase grep] [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | repo pin `^1.1.0`; local binary `1.6.1`; npm latest `4.1.5` published `2026-04-21` | targeted regression tests for service, CLI, and contract seams | Use for unit coverage around previous-run lookup, percentile helpers, ranked-note rendering, and additive JSON fields. ([package.json:83-90], [vitest.config.ts:9-30]) [VERIFIED: codebase grep] [VERIFIED: npm registry] [VERIFIED: vitest run] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TypeScript-side percentile helpers over persisted rows | SQLite percentile functions / extension | SQLite percentile support is not a safe baseline because it requires SQLite `3.51.0` with `-DSQLITE_ENABLE_PERCENTILE` or a separately loaded extension; planning against it would add runtime risk without reducing much code. ([https://www.sqlite.org/percentile.html]) [CITED: https://www.sqlite.org/percentile.html] |
| Extending `agent-metrics report` and bare-root output | New `agent-metrics trend` or `analytics` subcommand | A new surface conflicts with locked decisions D-10 and D-11 and would duplicate contract/rendering work. ([.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep] |
| Service-owned historical aggregation | Renderer-owned or test-only calculations | Recomputing trend or percentile math in the renderer would drift from JSON truth and make CLI tests weaker. ([src/cli/commands/agent-metrics/human.ts:94-138], [src/orchestrator/agent-metrics-service.ts:414-468]) [VERIFIED: codebase grep] |

**Installation:**
```bash
# No new packages are required for Phase 78.
npm install
```

**Version verification:** `better-sqlite3@12.9.0` published `2026-04-12`, `commander@14.0.3` published `2026-01-31`, `typescript@6.0.3` published `2026-04-16`, and `vitest@4.1.5` published `2026-04-21`. The repo is intentionally behind latest on several packages, so Phase 78 should reuse current pins unless the user explicitly opens an upgrade phase. ([package.json:62-90]) [VERIFIED: codebase grep] [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
codemap agent-metrics report / codemap agent-metrics
        |
        v
Commander option parsing
        |
        v
AgentMetricsService
        |
        +--> storage.listRecentRuns?(2) --------------------+
        |                                                   |
        +--> storage.listAgentMetricsByRun(run.id) ---------+--> latest + previous row sets
        |                                                   |
        +--> grouped summary helper ------------------------+--> avg/min/max + p50/p95/max by queryType
        |                                                   |
        +--> trend helper ----------------------------------+--> latest-vs-previous deltas by queryType
        |                                                   |
        +--> ranking helper --------------------------------+--> top-cost query types / top rows + short risk notes
        |
        +--> report object (additive JSON fields)
                |
                +--> human renderer
                +--> --json output
```

This keeps historical reads in storage, math in the service layer, and presentation in CLI adapters. ([src/orchestrator/agent-metrics-service.ts:375-468], [src/cli/commands/agent-metrics/index.ts:83-188]) [VERIFIED: codebase grep]

### Recommended Project Structure
```text
src/
├── orchestrator/
│   ├── agent-metrics-service.ts        # canonical report/trend/ranking/percentile truth
│   └── __tests__/agent-metrics-service.test.ts
├── infrastructure/storage/
│   ├── adapters/SQLiteStorage.ts       # recent-run reads and row loading
│   └── __tests__/SQLiteStorage.test.ts
├── cli/commands/agent-metrics/
│   ├── index.ts                        # report/root routing only
│   ├── human.ts                        # read-only rendering
│   └── __tests__/agent-metrics-command.test.ts
└── cli/interface-contract/commands/
    └── agent-metrics.ts                # additive machine contract
```

This matches the current repo layering and file ownership. ([ARCHITECTURE.md], [docs/rules/engineering-with-codex-openai.md:144-153], [src/cli/commands/agent-metrics/index.ts:1-193]) [VERIFIED: codebase grep]

### Pattern 1: Report-Time Historical Aggregation
**What:** Read persisted rows first, then derive latest-vs-previous trends, percentiles, and rankings in one service-owned report object. ([src/orchestrator/agent-metrics-service.ts:375-468]) [VERIFIED: codebase grep]  
**When to use:** Any Phase 78 field that can be recomputed from stored run/detail truth without schema changes. ([src/infrastructure/storage/sqlite/schema.ts:107-160]) [VERIFIED: codebase grep]  
**Example:**
```typescript
// Source: existing repo pattern in src/orchestrator/agent-metrics-service.ts
const recentRuns = await storage.listRecentAgentMetricsRuns(2); // additive API for Phase 78
const latestRows = await storage.listAgentMetricsByRun(recentRuns[0].id);
const previousRows = recentRuns[1]
  ? await storage.listAgentMetricsByRun(recentRuns[1].id)
  : [];

return {
  ...existingReport,
  queryTypeSummaries: buildPercentileSummaries(latestRows, historicalRowsByQueryType),
  trends: buildQueryTypeTrends(latestRows, previousRows),
  highestCost: buildCostRiskRanking(latestRows, previousRows),
};
```

### Pattern 2: Additive Contract Evolution
**What:** Keep `schemaVersion` stable and add nullable/additive report fields instead of replacing `rows`, `totals`, or `queryTypeSummaries`. ([src/cli/interface-contract/commands/agent-metrics.ts:33-165]) [VERIFIED: codebase grep]  
**When to use:** Adding `trends`, percentile fields, ranked advisory blocks, and missing-baseline metadata. ([.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep]  
**Example:**
```typescript
// Source: existing command-contract pattern in src/cli/interface-contract/commands/agent-metrics.ts
{
  name: 'trends',
  type: 'array',
  nullable: true,
  items: {
    name: 'queryTypeTrend',
    type: 'object',
    properties: [
      { name: 'queryType', type: 'string' },
      { name: 'latestEstimatedTotalTokens', type: 'number' },
      { name: 'previousEstimatedTotalTokens', type: 'number', nullable: true },
      { name: 'deltaEstimatedTotalTokens', type: 'number', nullable: true },
      { name: 'baselineAvailable', type: 'boolean' },
    ],
  },
}
```

### Anti-Patterns to Avoid
- **SQL percentile optimism:** Do not plan around `percentile_cont` unless runtime support is verified first. ([https://www.sqlite.org/percentile.html]) [CITED: https://www.sqlite.org/percentile.html]
- **Renderer-owned math:** Do not compute deltas or percentiles in `human.ts`; keep one canonical report truth. ([src/cli/commands/agent-metrics/human.ts:94-138], [src/orchestrator/agent-metrics-service.ts:414-468]) [VERIFIED: codebase grep]
- **Silent baseline widening:** If there is no previous run, emit an explicit “baseline unavailable” state instead of using older or all-history runs automatically. ([.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep]
- **Second gate surface:** Do not turn ranked cost notes or percentile outliers into a new blocking CI policy in this phase. ([.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md], [.planning/phases/77-ci-gate-threshold-enforcement/77-CONTEXT.md]) [VERIFIED: codebase grep]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Historical analytics persistence | A second `agent_metrics_intelligence` table or JSON blob store | Existing `agent_metrics_runs` + `agent_metrics` truth, aggregated at read time | The repo already stores run metadata and detail rows with the needed keys and indexes. ([src/infrastructure/storage/sqlite/schema.ts:107-160], [src/infrastructure/storage/adapters/SQLiteStorage.ts:940-1029]) [VERIFIED: codebase grep] |
| Runtime SQL percentile dependency | Custom SQLite extension loading or compile-flag assumptions | Deterministic TypeScript percentile helpers with unit tests | SQLite percentile support is optional at build/load time, so code-level aggregation is the safer default. ([https://www.sqlite.org/percentile.html]) [CITED: https://www.sqlite.org/percentile.html] |
| Separate risk-note engine | LLM-generated or free-form advisory text | Short deterministic note templates keyed off rank, delta, and dispersion | Phase 78 is CLI-local, advisory, and testable; deterministic notes avoid nondeterministic output drift. [ASSUMED] |
| Contract divergence | One-off JSON emitted only by human renderer or only by CLI wrapper | Additive fields in the existing command contract plus interface-contract tests | The repo already guards the `agent-metrics` contract shape via tests. ([src/cli/interface-contract/__tests__/interface-contract.test.ts:106-120]) [VERIFIED: codebase grep] |

**Key insight:** The hard part here is choosing the sample population and missing-baseline behavior, not inventing a new analytics stack. Once those are explicit, the existing service/storage seams are sufficient. ([src/orchestrator/agent-metrics-service.ts:375-468], [src/orchestrator/agent-metrics-service.ts:470-520]) [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Single-Run Percentiles With One Sample Per Query Type
**What goes wrong:** `p50`, `p95`, and `max` all collapse to the same value, so the report looks richer without adding insight. ([src/orchestrator/agent-metrics-service.ts:470-520]) [VERIFIED: codebase grep]  
**Why it happens:** The built-in sample set currently has one production sample per `queryType`, so intra-run distributions are nearly degenerate. ([src/orchestrator/agent-metrics-service.ts:470-520]) [VERIFIED: codebase grep]  
**How to avoid:** Define the percentile population explicitly, with historical rows per `queryType` as the recommended default. [ASSUMED]  
**Warning signs:** `queryCount` is `1` for most summaries and `p50 == p95 == max` across the board. [ASSUMED]

### Pitfall 2: Planning Trend Logic Without a Previous-Run Read API
**What goes wrong:** Phase 78 tasks start in the renderer or CLI, then stall because storage can only load the latest run plus rows for a known run id. ([src/interface/types/storage.ts:439-446], [src/infrastructure/storage/adapters/SQLiteStorage.ts:1004-1029]) [VERIFIED: codebase grep]  
**Why it happens:** The Phase 76/77 surface never needed “previous run” metadata, so the storage seam stayed minimal. ([src/orchestrator/agent-metrics-service.ts:375-422]) [VERIFIED: codebase grep]  
**How to avoid:** Make the first implementation task an additive recent-run read API plus tests. [ASSUMED]  
**Warning signs:** Service code starts reaching for raw SQL in the CLI layer or duplicating storage access logic. [ASSUMED]

### Pitfall 3: Assuming SQL Percentiles Exist Everywhere
**What goes wrong:** Planning leans on `percentile_cont` or `median()` in SQL, but the runtime lacks the compile flag/extension and implementation blocks late. ([https://www.sqlite.org/percentile.html]) [CITED: https://www.sqlite.org/percentile.html]  
**Why it happens:** SQLite documents percentile functions, but they are optional rather than universal runtime guarantees. ([https://www.sqlite.org/percentile.html]) [CITED: https://www.sqlite.org/percentile.html]  
**How to avoid:** Treat SQL percentiles as an optional optimization only; implement a TypeScript fallback as the canonical path. [ASSUMED]  
**Warning signs:** Planning includes extension loading, `sqlite3` shell commands, or runtime feature detection even though the machine lacks a `sqlite3` CLI. [VERIFIED: shell command]

### Pitfall 4: Reopening Gate Semantics
**What goes wrong:** Ranked high-cost sections get conflated with CI fail conditions, effectively creating a second policy engine. ([.planning/phases/77-ci-gate-threshold-enforcement/77-CONTEXT.md], [.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep]  
**Why it happens:** The same report object already carries `gate`, so it is tempting to attach pass/fail semantics to the new advisory fields. ([src/orchestrator/agent-metrics-service.ts:72-81], [src/cli/interface-contract/commands/agent-metrics.ts:117-150]) [VERIFIED: codebase grep]  
**How to avoid:** Keep Phase 78 fields advisory-only and separate from `gate.verdict`. ([.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep]  
**Warning signs:** New fields begin influencing `process.exitCode` or threshold evaluation. ([src/cli/commands/agent-metrics/index.ts:83-95]) [VERIFIED: codebase grep]

## Code Examples

Verified patterns from official sources and the current repo:

### Recent-Run Comparison Helper
```typescript
// Source: repo pattern in src/orchestrator/agent-metrics-service.ts
function buildQueryTypeDelta(latest: number, previous: number | null) {
  return {
    previous,
    delta: previous === null ? null : latest - previous,
    deltaPercent: previous === null || previous === 0
      ? null
      : Math.round(((latest - previous) / previous) * 100),
    baselineAvailable: previous !== null,
  };
}
```

### Percentile Helper Kept Out Of SQL
```typescript
// Source: SQLite percentile availability constraints
function nearestRank(values: number[], percentile: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((percentile / 100) * sorted.length));
  return sorted[rank - 1] ?? sorted[sorted.length - 1] ?? null;
}
```
Source rationale: SQLite percentile functions are optional runtime features, so the fallback should be local and deterministic. ([https://www.sqlite.org/percentile.html]) [CITED: https://www.sqlite.org/percentile.html] [ASSUMED]

### Deterministic Risk Note Templates
```typescript
// Source: phase boundary + advisory-only requirement
function buildRiskNote(input: {
  rank: number;
  deltaTokens: number | null;
  p95: number | null;
  p50: number | null;
}) {
  if (input.deltaTokens !== null && input.deltaTokens > 0) {
    return 'Absolute token cost is rising versus the previous run.';
  }
  if (input.p95 !== null && input.p50 !== null && input.p95 > input.p50 * 2) {
    return 'Outlier-heavy distribution suggests occasional expensive responses.';
  }
  return 'Absolute token cost remains large enough to dilute call-count savings.';
}
```
[ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Latest-run-only report with `avg/min/max` grouped summaries | Latest-vs-previous trend plus `p50/p95/max` percentile depth as an additive intelligence layer | Phase 76 deferred this work to Phase 78 on `2026-05-10` | Planning must add historical read paths and richer service aggregation without changing the command family. ([.planning/phases/76-estimation-and-reporting/76-CONTEXT.md], [.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep] |
| Assuming SQL aggregates are enough for percentile analytics | Treat SQL percentile support as optional and keep a code-level fallback | SQLite percentile docs now document built-in support only when compiled with `-DSQLITE_ENABLE_PERCENTILE` | Phase 78 should not block on optional runtime capabilities. ([https://www.sqlite.org/percentile.html]) [CITED: https://www.sqlite.org/percentile.html] |
| Gate-only cost verdicts | Advisory ranked cost-risk notes separate from `gate.verdict` | Phase 77 locked the blocking policy surface before Phase 78 started | The planner must keep policy and intelligence surfaces decoupled. ([.planning/phases/77-ci-gate-threshold-enforcement/77-CONTEXT.md], [.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- Planning `agent-metrics report` as an auto-run path is outdated for explicit report mode; Phase 76 locked explicit `report` to persisted latest-run semantics only. ([src/orchestrator/agent-metrics-service.ts:391-401], [.planning/phases/76-estimation-and-reporting/76-CONTEXT.md]) [VERIFIED: codebase grep]

## Planning Resolutions

> These items were open during initial research and are now **RESOLVED for Phase 78 planning** so the plan can freeze one executable contract.

1. **RESOLVED — Percentile sample population**
   - [证据] latest-vs-previous is locked only for trend comparison, while the current built-in sample set is mostly one row per `queryType` per run. ([src/orchestrator/agent-metrics-service.ts:470-520], [.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep]
   - [推论] If Phase 78 computes `p50/p95/max` from latest-run rows only, most query types will collapse to a one-sample distribution and add little signal.
   - Resolution: compute `p50/p95/max` from persisted historical detail rows grouped by `queryType`, while keeping trend deltas strictly latest-vs-previous.
   - Why this is acceptable: it preserves D-01/D-02 trend narrowness, does not add a new command surface, and uses the existing SQLite truth rather than inventing a second store.

2. **RESOLVED — Percentile formula**
   - [证据] SQLite documents percentile math, but runtime SQL percentile support is optional rather than guaranteed. ([https://www.sqlite.org/percentile.html]) [CITED: https://www.sqlite.org/percentile.html]
   - [推论] A deterministic TypeScript-side nearest-rank formula is the lowest-risk contract for a CLI-local additive report feature.
   - Resolution: freeze `p50` and `p95` to a nearest-rank implementation over sorted historical `estimatedTotalTokens`, with fixtures that pin exact outputs.
   - Why this is acceptable: it avoids runtime feature drift and keeps test assertions integer-friendly and stable.

3. **RESOLVED — Ranked view shape**
   - [证据] D-04 and D-05 require a ranked list and short risk notes, and the context explicitly mentions high-cost query types and samples. ([.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep]
   - [推论] One combined list would blur “which query type is structurally expensive” with “which concrete sample is currently worst”.
   - Resolution: expose two compact advisory blocks: a primary `highestCostQueryTypes` ranking and a secondary `highestCostRows` ranking, each capped to the top `3` entries from the latest run.
   - Why this is acceptable: it keeps the report readable, satisfies the “query types + scenarios” requirement, and stays advisory rather than policy-like.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Historical persisted rows grouped by `queryType` are the right default sample pool for percentile depth. | Planning Resolutions, Summary, Common Pitfalls | If the product later requires single-run-only distributions, storage reads and percentile semantics would need narrowing. |
| A2 | Nearest-rank integer percentiles are the best default formula for CLI output. | Planning Resolutions, Code Examples | If continuous/interpolated percentiles are later preferred, fixture values and JSON output will shift. |
| A3 | Two compact ranked blocks (`highestCostQueryTypes` + `highestCostRows`) are clearer than one merged advisory list. | Planning Resolutions, Don’t Hand-Roll | If users find the output noisy, the renderer may need consolidation without changing service truth. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI execution, TypeScript runtime, tests | ✓ | `v24.14.0` | — |
| npm | package scripts and verification commands | ✓ | `11.9.0` | — |
| `vitest` local binary | targeted regression tests | ✓ | `1.6.1` | `npm test` |
| `better-sqlite3` repo dependency | persisted storage reads for agent-metrics | ✓ | repo pin `^12.9.0` | — |
| `sqlite3` system CLI | optional ad hoc inspection only | ✗ | — | use `better-sqlite3`-backed tests / storage adapter tests instead |

Availability was verified on this machine with `node --version`, `npm --version`, local `vitest --version`, and the absence of a `sqlite3` executable. [VERIFIED: shell command]

**Missing dependencies with no fallback:**
- None. [VERIFIED: shell command]

**Missing dependencies with fallback:**
- `sqlite3` CLI is absent, but Phase 78 can verify storage behavior through `SQLiteStorage` tests and the existing adapter path. ([src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:645-710]) [VERIFIED: codebase grep]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest` local binary `1.6.1`; repo devDependency `^1.1.0` |
| Config file | `vitest.config.ts` |
| Quick run command | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts` |
| Full suite command | `rtk npm test` |

The quick command above passed on `2026-05-11` with `39/39` tests green across the three most relevant files. ([vitest.config.ts:9-30]) [VERIFIED: codebase grep] [VERIFIED: vitest run]

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOKEN-03 | latest-vs-previous comparison by `queryType`, including missing-baseline honesty | unit | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` | ✅ |
| TOKEN-04 | ranked highest-cost query types/samples with advisory note text | unit | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` | ✅ |
| TOKEN-05 | additive `p50/p95/max` distribution stats in service + contract + human/JSON output | unit | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` | ✅ |

### Sampling Rate
- **Per task commit:** `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts`
- **Per wave merge:** `rtk npm test`
- **Phase gate:** `rtk npm run typecheck && rtk npm run lint && rtk npm test`

### Wave 0 Gaps
- [ ] Add storage-adapter tests for “latest + previous” metadata reads; current storage tests only prove save/latest/by-run reads. ([src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:645-710]) [VERIFIED: codebase grep]
- [ ] Add service tests for explicit no-previous-run behavior so the report says “baseline unavailable” instead of fabricating a delta. ([src/orchestrator/agent-metrics-service.ts:391-401]) [VERIFIED: codebase grep]
- [ ] Add percentile-specific golden assertions that pin the chosen formula and sample population. [ASSUMED]
- [ ] Add human/JSON contract assertions for ranked risk notes and additive trend fields. ([src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts:171-324], [src/cli/interface-contract/__tests__/interface-contract.test.ts:106-120]) [VERIFIED: codebase grep]

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | CLI-local report phase; no new auth surface. ([package.json:15-18], [docs/rules/engineering-with-codex-openai.md:8-10]) [VERIFIED: codebase grep] |
| V3 Session Management | no | CLI-local report phase; no session state changes. ([docs/rules/engineering-with-codex-openai.md:8-10]) [VERIFIED: codebase grep] |
| V4 Access Control | no | Reads existing local SQLite data only; no new permission model. ([src/infrastructure/storage/adapters/SQLiteStorage.ts:1004-1029]) [VERIFIED: codebase grep] |
| V5 Input Validation | yes | Reuse explicit CLI parsing/validation patterns for any new numeric/report flags and test invalid states. ([src/cli/commands/agent-metrics/index.ts:60-80]) [VERIFIED: codebase grep] |
| V6 Cryptography | no | No cryptographic behavior in scope. ([.planning/phases/78-intelligence-layer-trends-and-distribution/78-CONTEXT.md]) [VERIFIED: codebase grep] |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Missing or stale baseline presented as real trend | Integrity | Explicit `baselineAvailable=false` / `previous=null` output plus tests for missing previous run. [ASSUMED] |
| Renderer/JSON drift in ranked notes or percentiles | Tampering | Compute all intelligence fields once in `AgentMetricsService` and assert both human and JSON paths against the same report object. ([src/orchestrator/agent-metrics-service.ts:414-468], [src/cli/commands/agent-metrics/human.ts:94-138]) [VERIFIED: codebase grep] |
| Unbounded historical reads slowing the CLI | Denial of Service | Keep trend reads at two runs by default and document any wider percentile pool/window explicitly with sample counts. [ASSUMED] |
| Invalid future analytics flags | Input Validation | Reuse the existing CLI-edge numeric validation pattern used by `--max-tokens-per-query`. ([src/cli/commands/agent-metrics/index.ts:60-80]) [VERIFIED: codebase grep] |

## Sources

### Primary (HIGH confidence)
- Codebase: `src/orchestrator/agent-metrics-service.ts`, `src/cli/commands/agent-metrics/index.ts`, `src/cli/commands/agent-metrics/human.ts`, `src/cli/interface-contract/commands/agent-metrics.ts`, `src/infrastructure/storage/adapters/SQLiteStorage.ts`, `src/infrastructure/storage/sqlite/schema.ts`, `src/interface/types/storage.ts` - existing phase seams, data model, and command boundary checks. [VERIFIED: codebase grep]
- Test evidence: `src/orchestrator/__tests__/agent-metrics-service.test.ts`, `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts`, `src/cli/interface-contract/__tests__/interface-contract.test.ts`, `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` - current behavior proof and coverage gaps. [VERIFIED: codebase grep] [VERIFIED: vitest run]
- Official SQLite docs: https://www.sqlite.org/percentile.html - percentile availability and compile/extension constraints. [CITED: https://www.sqlite.org/percentile.html]
- npm registry: `better-sqlite3`, `commander`, `typescript`, `vitest` - current latest package versions and publish dates. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Repo docs: `.planning/*`, `docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md`, `docs/ideation/2026-05-10-agent-effectiveness-validation-ideation.md`, `docs/ai-guide/OUTPUT.md`, `docs/rules/validation.md`, `docs/rules/engineering-with-codex-openai.md` - phase intent, validation order, percentile naming precedent. [VERIFIED: codebase grep]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - the phase reuses an already-shipped `commander` + `better-sqlite3` + TypeScript + Vitest stack and does not need a new dependency. ([package.json:30-98]) [VERIFIED: codebase grep] [VERIFIED: npm registry]
- Architecture: MEDIUM - the core seams are clear, but the percentile sample population and exact read API shape still need one explicit decision. ([src/interface/types/storage.ts:439-446], [src/orchestrator/agent-metrics-service.ts:375-468]) [VERIFIED: codebase grep] [ASSUMED]
- Pitfalls: HIGH - the main risks are already visible in the current codebase and official SQLite percentile docs. ([src/orchestrator/agent-metrics-service.ts:470-520], [https://www.sqlite.org/percentile.html]) [VERIFIED: codebase grep] [CITED: https://www.sqlite.org/percentile.html]

**Research date:** 2026-05-11  
**Valid until:** 2026-06-10
