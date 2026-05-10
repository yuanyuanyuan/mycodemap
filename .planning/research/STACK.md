# Stack Research

**Domain:** CodeMap v2.7 agent-effectiveness-validation (agent-metrics command)
**Researched:** 2026-05-10
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | `5.3.3` | implementation language | Current repo baseline; all CLI/execution/storage code already in TS. |
| Commander.js | `11.1.0` (existing) | CLI subcommand registration | Already used by all existing commands including `benchmark` and `ci`. Register `agent-metrics` as a new top-level command with `token` and `report` subcommands. |
| `src/cli/output/` module | existing repo-internal | JSON/human mode switching | `renderOutput()` + `resolveOutputMode()` already handle `--json` vs human-readable output. Agent-metrics should use this pattern, not reinvent mode detection. |
| `src/cli/storage-runtime.ts` | existing repo-internal | SQLite access for metrics persistence | `createConfiguredStorage()` provides project-aware storage. Use for reading existing code graph data and optionally persisting metrics baselines. |
| Zod | `4.3.6` (existing) | JSON schema validation for report output | Already a dependency; use to define and validate the `agent-metrics report --json` output contract. Keeps schema co-located with code. |
| chalk | `5.3.0` (existing) | colored terminal output | Already used across CLI. Use for pass/fail coloring in CI mode and highlighting threshold breaches. |

### Token Estimation

**Approach: Character-count heuristic (no external library)**

The requirements doc explicitly specifies `~4 chars/token` as the estimation method. This is the right call because:

1. **No tokenizer dependency needed.** Libraries like `tiktoken-js` or `gpt-tokenizer` add ~200-500KB and require model-specific vocabulary files. The estimation is for relative comparison and regression detection, not billing.
2. **Already precedent in codebase.** `src/cli/commands/ci.ts` line ~909 already does word-split based token estimation for `check-output-contract`. Agent-metrics should use a consistent, slightly more accurate char-based heuristic.
3. **Sufficient for stated goals.** R2 (per-query-type stats), R3 (trend tracking), R11 (threshold gating) all work with approximate tokens. Exact counts matter for billing, not for regression detection.

**Implementation:** A single `estimateTokens(jsonSize: number): number` function returning `Math.ceil(jsonSize / 4)`. No library required.

### Git History Parsing for Query Scenarios

**Approach: Extend existing `GitAnalyzer` pattern with `execFile`**

The codebase already has `src/orchestrator/git-analyzer.ts` which uses `child_process.execFile`/`execSync` for git operations. For extracting query scenarios from git history:

1. **Use `git log` with commit message pattern matching.** The existing `GitAnalyzer.parseCommitTag()` already parses `[TAG] scope: message` format. Extend this to identify impact-analysis / refactoring / dependency-tracing scenarios from commit patterns.
2. **Map commit patterns to query types.** `[REFACTOR]` commits suggest `impact` queries; `[FEATURE]` commits touching multiple files suggest `deps` queries; `[BUGFIX]` with scope changes suggest `find callers` queries.
3. **No `simple-git` library needed.** The codebase already uses raw `execFile` for git operations. Adding `simple-git` would be a new dependency for functionality the codebase already handles with built-in Node APIs.

**Implementation:** A `ScenarioExtractor` class in `src/cli/commands/agent-metrics/` that:
- Calls `git log --format="%H|%s" -n <limit>` (reuse pattern from `git-analyzer.ts`)
- Parses commit messages with existing `parseCommitTag()` logic
- Maps tags/scopes to predefined query scenario types
- Returns `Array<{ queryType: string; target: string; source: 'git-history' }>`

### CLI Output Formatting

**Approach: Reuse existing patterns, add lightweight table renderer**

The benchmark command (`src/cli/commands/benchmark.ts`) already renders ASCII tables with `console.log` and pad-based alignment. Agent-metrics should follow the same pattern.

| Need | Solution | Notes |
|------|----------|-------|
| Table rendering | Manual pad-based ASCII tables | Matches benchmark.ts pattern. No `cli-table3` or `table` library needed for 2-3 table layouts. |
| Color | chalk (existing) | Green for pass, red for threshold breach, dim for secondary stats. |
| Progress | ora (existing) | Use `createProgressEmitter()` from output module for consistency. |
| JSON mode | `renderOutput()` (existing) | Single call handles human vs JSON switching. |

**No new CLI formatting libraries needed.** The existing chalk + manual table approach is consistent with the codebase and sufficient for the report layout.

### JSON Schema Design

**Approach: Zod schema co-located with command module**

Define the report output schema using Zod, following the pattern in `src/cli/interface-contract/`:

```typescript
// Proposed shape (simplified)
const AgentMetricsReportSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  generatedAt: z.string().datetime(),
  summary: z.object({
    totalQueries: z.number(),
    totalEstimatedTokens: z.number(),
    averageTokensPerQuery: z.number(),
    threshold: z.number().optional(),
    thresholdBreached: z.boolean().optional(),
  }),
  queryTypes: z.array(z.object({
    queryType: z.string(),           // 'find-callers' | 'impact' | 'deps' | 'dependency-trace'
    count: z.number(),
    averageTokens: z.number(),
    p50Tokens: z.number(),
    p95Tokens: z.number(),
    maxTokens: z.number(),
    averageResponseBytes: z.number(),
  })),
  scenarios: z.array(z.object({
    queryType: z.string(),
    target: z.string(),
    estimatedTokens: z.number(),
    responseBytes: z.number(),
    source: z.literal('git-history'),
  })),
});
```

Zod provides runtime validation + TypeScript type inference from one definition. No need for separate JSON Schema generation for this use case.

### CI Integration Patterns

**Approach: Follow existing `ci.ts` gate pattern**

The `ci assess-risk` command already implements the exact pattern needed:
1. Parse threshold from `--threshold` flag
2. Run analysis
3. Compare result against threshold
4. `process.exit(1)` on breach
5. JSON mode for machine consumption

Agent-metrics `report` should follow the same pattern:

```typescript
// Pseudo-structure
const maxTokens = parseInt(options.maxTokensPerQuery ?? '0', 10);
const report = await generateReport(options);

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
}

if (maxTokens > 0) {
  const breaches = report.queryTypes.filter(q => q.averageTokens > maxTokens);
  if (breaches.length > 0) {
    console.error(`FAIL: ${breaches.length} query type(s) exceed ${maxTokens} tokens/query`);
    process.exit(1);
  }
}
```

### SQLite Storage for Metrics

**Approach: Optional baseline persistence in existing storage**

The code graph already lives in SQLite via `better-sqlite3`. For agent-metrics:

1. **Read path:** Use existing `createConfiguredStorage()` to load the code graph, then run representative queries against it to measure token costs.
2. **Write path (optional):** Add a `metrics_baseline` table to store historical measurements for trend tracking. This follows the same pattern as `GitHistoryService` which persists risk scores.
3. **No new storage technology.** SQLite is already the right fit for local, append-only metrics data.

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `tiktoken-js` / `gpt-tokenizer` / `js-tiktoken` | Adds ~200-500KB dependency + model-specific vocab files for precision that isn't needed for regression detection | Character-count heuristic (`~4 chars/token`), consistent with existing `ci check-output-contract` approach |
| `simple-git` | New dependency for git operations the codebase already handles with `child_process.execFile` | Extend existing `GitAnalyzer` pattern from `src/orchestrator/git-analyzer.ts` |
| `cli-table3` / `table` / `boxen` | New formatting dependencies for a command that needs 2-3 simple tables | Manual pad-based ASCII tables matching `benchmark.ts` pattern |
| `json-schema` / `ajv` / separate schema generation | Zod already provides runtime validation + TS types | Zod schema co-located with command module |
| `commander` subcommand nesting beyond 2 levels | `agent-metrics token` and `agent-metrics report` are flat enough | Single `agent-metrics` command with `.command('token')` and `.command('report')` |
| External test runner or benchmark framework | vitest is already the test runner | vitest for unit tests; the command itself is the benchmark runner |
| Real tokenizer integration for "accurate" counts | Requirements explicitly defer this; heuristic is sufficient for MVP | Heuristic with calibration deferred to planning (as stated in requirements) |

## Integration Points

### Existing Code to Reuse

| Module | Path | Reuse For |
|--------|------|-----------|
| `renderOutput()` | `src/cli/output/render.ts` | JSON/human mode output |
| `resolveOutputMode()` | `src/cli/output/mode.ts` | `--json` flag handling |
| `createConfiguredStorage()` | `src/cli/storage-runtime.ts` | SQLite access for running queries |
| `executeQueryTool()` | `src/execution/contract-tools/query.ts` | Running representative queries to measure token cost |
| `GitAnalyzer` | `src/orchestrator/git-analyzer.ts` | Git log parsing, commit tag extraction |
| `benchmarkCommand` | `src/cli/commands/benchmark.ts` | Table rendering pattern, JSON output pattern |
| `createCICommand` / `assessRiskAction` | `src/cli/commands/ci.ts` | Threshold gate pattern, exit code handling |
| `ErrorCodes` | `src/cli/output/error-codes.ts` | Consistent error code registration |

### New Code to Create

| Module | Path | Purpose |
|--------|------|---------|
| `agent-metrics` command | `src/cli/commands/agent-metrics/index.ts` | Top-level command with `token` and `report` subcommands |
| `token-estimator.ts` | `src/cli/commands/agent-metrics/token-estimator.ts` | `estimateTokens(bytes: number): number` heuristic |
| `scenario-extractor.ts` | `src/cli/commands/agent-metrics/scenario-extractor.ts` | Git history → query scenario mapping |
| `report-builder.ts` | `src/cli/commands/agent-metrics/report-builder.ts` | Aggregate metrics into report schema |
| `metrics-schemas.ts` | `src/cli/commands/agent-metrics/metrics-schemas.ts` | Zod schemas for report output |

## Sources

- [package.json](/data/codemap/package.json) — current dependencies
- [src/cli/commands/benchmark.ts](/data/codemap/src/cli/commands/benchmark.ts) — table rendering and JSON output pattern
- [src/cli/commands/ci.ts](/data/codemap/src/cli/commands/ci.ts) — CI gate pattern with threshold + exit codes
- [src/cli/output/](/data/codemap/src/cli/output/) — shared output module (renderOutput, resolveOutputMode)
- [src/cli/storage-runtime.ts](/data/codemap/src/cli/storage-runtime.ts) — SQLite storage access
- [src/orchestrator/git-analyzer.ts](/data/codemap/src/orchestrator/git-analyzer.ts) — git history parsing patterns
- [src/execution/contract-tools/query.ts](/data/codemap/src/execution/contract-tools/query.ts) — query execution for token measurement
- [docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md](/data/codemap/docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md) — requirements doc

---
*Stack research for: v2.7 agent-effectiveness-validation*
*Researched: 2026-05-10*
