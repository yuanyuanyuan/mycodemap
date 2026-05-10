# Feature Landscape: CodeMap v2.7 agent-effectiveness-validation

**Domain:** Agent tool effectiveness metrics / token cost analysis
**Researched:** 2026-05-10
**Confidence:** HIGH

## External Benchmark Summary

Before categorizing features, here is what comparable tools do and what CodeMap can learn from each.

### LangSmith (LangChain Observability)

LangSmith tracks per-LLM-call token usage (input/output), cost estimation via model pricing tables, latency per request, cumulative metrics across agent traces, and hierarchical trace visualization. Its key design choice: **token tracking is automatic and per-call** -- users never opt in, every call is measured. Dashboard aggregation comes later.

**Takeaway for CodeMap:** Per-query token estimation should be the default behavior, not an opt-in flag. Aggregation is a reporting concern, not a collection concern.

### GitHub Copilot Metrics API

Copilot tracks acceptance rate (% of suggestions accepted), active users, suggestions count, lines suggested/accepted, language and IDE breakdown. Its key design choice: **metrics are aggregated and anonymized at the org level** -- individual code content is not tracked. The most cited finding is "55% faster task completion."

**Takeaway for CodeMap:** Report aggregate statistics (per-query-type averages, distributions), not individual query payloads. The "55% faster" framing maps to CodeMap's "6+ calls reduced to 1" claim -- but CodeMap has never validated the token side of that equation.

### SPACE Framework (Forsgren et al., 2021)

SPACE defines five dimensions of developer productivity: Satisfaction, Performance, Activity, Communication, Efficiency. Its core principle: **no single metric captures productivity** -- metrics must be multidimensional and balanced. Both perception-based and system-based metrics matter.

**Takeaway for CodeMap:** Token cost is one dimension (Efficiency). The requirements doc deliberately scopes v2.7 to this one dimension. Future dimensions (agent behavior quality, adoption decay) are deferred to MCP gateway phase. This is the right scoping decision.

### Anthropic Tool Design Evaluation

Anthropic's guidance emphasizes: clear tool descriptions and schemas, proper error handling, testing with diverse inputs. For evaluation: task completion rates, accuracy, token efficiency (cost per task), latency. Best practice: define success criteria before evaluation, use diverse test cases.

**Takeaway for CodeMap:** The git-history-based scenario extraction (R3) aligns with "diverse test cases" without requiring manual scenario design. Token efficiency as "cost per query type" maps directly to "cost per task."

---

## Table Stakes

Features users expect from an agent-metrics command. Missing any of these makes the feature feel incomplete or toy-like.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Per-query token estimation (R1, R2) | Core value proposition -- without this, the command has no reason to exist | LOW | JSON byte count / 4 chars per token heuristic. Must cover input + output. |
| Per-query-type grouping (R2, R10) | "How much does `find callers` cost?" is the primary question. Flat totals are useless. | LOW | Group by CodeMap subcommand / query intent (find, impact, deps, etc.) |
| Human-readable table output (R8) | Default UX -- developers open a terminal, not a JSON viewer | LOW | Follow `benchmark.ts` table pattern: box-drawing characters, aligned columns |
| JSON output mode (`--json`) (R9) | CI pipeline consumption is a stated success criterion | LOW | `JSON.stringify(result, null, 2)` -- follow existing `benchmark.ts` pattern |
| Response size statistics (R2) | Token estimate is derived from response size; both must be visible | LOW | Show raw bytes alongside estimated tokens for transparency |
| Subcommand structure: `agent-metrics token` + `agent-metrics report` (R13, R14) | CLI discoverability, `--help` scoping, future extensibility | MEDIUM | Requires `commander` subcommand registration; follows `design` / `ship` pattern |
| Default behavior = full report (R14) | `codemap agent-metrics` with no args should "just work" | LOW | Default to `report` subcommand when no subcommand given |

### Table Stakes Dependencies on Existing Code

| Feature | Depends On | Integration Point |
|---------|-----------|-------------------|
| Token estimation | Existing CLI command execution | Wrap `query`, `deps`, `impact`, `complexity`, `find` calls; measure response size |
| Query-type grouping | Existing command taxonomy | Map each CLI command to a "query type" label |
| Table output | Existing output formatting patterns | Follow `benchmark.ts` box-drawing style |
| JSON mode | Existing `--json` convention | Follow `benchmark.ts` JSON output pattern |
| Subcommand structure | `commander` library (already in use) | Register under `agent-metrics` parent command |

---

## Differentiators

Features that make the tool notably better than "just another metrics command." Worth building, but should not delay table stakes.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cost trend tracking (R3) | Shows whether token costs are increasing over time (parser changes, output bloat) | MEDIUM | Requires storing historical baseline data. Could use SQLite or simple JSON file in `.mycodemap/`. |
| Highest-cost query identification (R4) | Directs optimization effort -- "fix the expensive ones first" | LOW | Sort query types by average token cost, flag top N |
| CI gate with `--max-tokens-per-query` (R11, R12) | Automated regression detection -- blocks merges that inflate token costs | MEDIUM | Non-zero exit code on exceed. Needs pass/fail summary format. |
| Scenario extraction from git history (Key Decision) | Real-world test scenarios without manual design | MEDIUM-HIGH | Parse commit messages for impact/dependency/refactoring patterns; map to query types. Lightweight subset of "Zero-Touch Git History" idea. |
| Baseline comparison | "Is this run better or worse than last time?" | MEDIUM | Store previous run results, compute delta. Requires persistence layer. |
| Per-query-type distribution stats (R10) | Mean alone is misleading; p50/p95/max reveal outliers | LOW | Compute from collected samples; no new infrastructure |

### Differentiator Dependencies

| Feature | Depends On | Notes |
|---------|-----------|-------|
| Cost trend tracking | Table stakes (token estimation) + persistence | Needs a storage decision: SQLite table vs JSON file |
| CI gate | Table stakes (JSON output) + exit code convention | Exit code 0 = pass, 1 = fail; follow existing `ci` command patterns |
| Git history scenarios | `git log` parsing + query type mapping | Could reuse existing `history` command infrastructure |
| Baseline comparison | Cost trend tracking persistence | Same storage layer |

---

## Anti-Features

Features that were considered or requested but should NOT be built in v2.7.

| Anti-Feature | Why Requested | Why Problematic | What to Do Instead |
|--------------|---------------|-----------------|-------------------|
| A/B harness (CodeMap vs text-search) | "Prove CodeMap is better" | Requires ground truth definition, agent variability, 2-3 weeks dedicated effort. Scope explosion. | v2.7 proves token cost; A/B is a separate milestone. |
| Agent behavior classification (accepted/re-queried/abandoned) | "Know if the agent liked the result" | Requires MCP gateway real-time data. CLI-only mode cannot observe post-query behavior. | Defer to MCP gateway phase. |
| Adoption decay monitoring | "Are agents still using CodeMap?" | Requires gateway-side telemetry and longitudinal tracking. CLI cannot see agent tool selection. | Defer to MCP gateway phase. |
| Precision-weighted cost model | "What do false positives cost?" | Needs real agent session data to calibrate. "Wasted action cost" is judgment-dependent. | Defer until real usage data exists. |
| Agent-perceived latency redefinition | "Compare CodeMap time vs multi-call rg time" | Defining "equivalent workflow" requires per-query-type judgment. Different framing of same latency data. | Defer to separate investigation. |
| Exact token counting (tokenizer integration) | "Approximate is not good enough" | tiktoken / cl100k_base integration adds dependency, model-specific drift, and marginal accuracy gain. ~4 chars/token heuristic is standard industry practice. | Use heuristic. Note approximation in output. |
| MCP gateway continuous collection | "Real-time metrics" | v2.7 scope is CLI offline report. Gateway collection is architecturally different (streaming, session tracking). | Explicitly v2 scope per requirements doc. |
| Comparison against rg/grep token costs | "Show CodeMap is cheaper" | Information density differs fundamentally between structured JSON and raw text grep results. Direct comparison is misleading per R3. | Track absolute token costs only. |

### Anti-Feature Decision Rationale

The requirements doc (Scope Boundaries section) explicitly excludes: A/B harness, Zero-Touch auto test generation, Adoption Decay, Precision-Weighted Cost Model, Agent-Perceived Latency, MCP gateway collection, Agent behavior classification. All of these are either architecturally impossible in CLI-only mode or require data that does not yet exist.

---

## Feature Dependencies

```
Per-query token estimation (table stakes)
    └──feeds──> Per-query-type grouping
    └──feeds──> Response size statistics
    └──feeds──> Highest-cost query identification (differentiator)

Per-query-type grouping
    └──feeds──> Human-readable table output
    └──feeds──> JSON output mode
    └──feeds──> Distribution stats (p50/p95/max)

JSON output mode
    └──feeds──> CI gate (--max-tokens-per-query)

Cost trend tracking (differentiator)
    └──depends on──> Per-query token estimation
    └──depends on──> Persistence layer (SQLite or JSON file)

Git history scenario extraction (differentiator)
    └──depends on──> git log parsing
    └──feeds──> Representative query set for token analysis

Subcommand structure (agent-metrics token / report)
    └──contains──> All of the above
```

### Critical Path

1. **Subcommand registration** -- nothing works without the CLI skeleton
2. **Token estimation engine** -- core measurement logic
3. **Query-type grouping** -- makes raw numbers meaningful
4. **Table + JSON output** -- makes results consumable
5. **CI gate** -- makes results actionable in pipelines
6. **Trend tracking** -- makes results useful over time

---

## MVP Recommendation

### Phase 1: Core Measurement (Must Ship)

1. Subcommand structure: `codemap agent-metrics token` + `codemap agent-metrics report`
2. Per-query token estimation via ~4 chars/token heuristic
3. Per-query-type grouping with response size stats
4. Human-readable table output (default)
5. JSON output mode (`--json`)
6. Default `codemap agent-metrics` = full report

### Phase 2: CI Integration (Should Ship)

7. `--max-tokens-per-query` threshold parameter
8. Non-zero exit code on exceed
9. CI-friendly pass/fail summary

### Phase 3: Intelligence (Ship If Time Permits)

10. Highest-cost query identification and flagging
11. Cost trend tracking with baseline persistence
12. Git history scenario extraction

### Defer Beyond v2.7

- A/B harness: separate milestone, requires ground truth
- Agent behavior classification: requires MCP gateway
- Adoption decay monitoring: requires MCP gateway
- Exact tokenizer integration: marginal gain over heuristic
- Cross-tool cost comparison (rg/grep): misleading by design

---

## Complexity Estimates

| Feature | Complexity | Time Estimate | Risk |
|---------|------------|---------------|------|
| Subcommand skeleton | LOW | 0.5 day | Low -- follows existing patterns |
| Token estimation engine | LOW | 1 day | Low -- byte counting + division |
| Query-type grouping | LOW | 0.5 day | Low -- map command names to labels |
| Table output | LOW | 0.5 day | Low -- copy benchmark.ts pattern |
| JSON output | LOW | 0.25 day | Low -- JSON.stringify |
| CI gate | MEDIUM | 1 day | Medium -- exit code conventions, summary format |
| Distribution stats | LOW | 0.5 day | Low -- standard percentile calculation |
| Cost trend tracking | MEDIUM | 1.5 days | Medium -- persistence design decision |
| Git history extraction | MEDIUM-HIGH | 2 days | High -- commit pattern parsing, query type mapping |
| Baseline comparison | MEDIUM | 1 day | Medium -- depends on trend tracking storage |

**Total MVP (Phase 1):** ~3 days
**With CI (Phase 1+2):** ~4 days
**Full scope (Phase 1+2+3):** ~7-8 days

---

## Sources

- Requirements doc: `docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md`
- Ideation doc: `docs/ideation/2026-05-10-agent-effectiveness-validation-ideation.md`
- Existing benchmark CLI: `src/cli/commands/benchmark.ts` -- pattern reference
- Interface contract pattern: `src/cli/interface-contract/commands/benchmark.ts`
- CLI entry: `src/cli/index.ts` -- command registration pattern
- SPACE framework: Forsgren et al., "Space: Software engineering productivity metrics" (Communications of the ACM, 2021)
- LangSmith: `docs.smith.langchain.com` -- token tracking, cost estimation, trace visualization
- GitHub Copilot Metrics API: `docs.github.com/en/rest/copilot` -- acceptance rate, active users, aggregate metrics

---
*Feature research for: v2.7 agent-effectiveness-validation*
*Researched: 2026-05-10*
