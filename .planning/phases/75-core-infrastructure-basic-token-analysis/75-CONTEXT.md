# Phase 75: Core Infrastructure and Basic Token Analysis - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the first executable `codemap agent-metrics token` foundation that runs a fixed set of representative CodeMap queries and persists per-run token-cost facts for later reporting. This phase delivers: a fixed built-in representative query set, per-run persisted metric records, and a basic token-cost estimation contract with explicit estimated fields. It does NOT deliver: project-custom query sets, report formatting/presentation depth, CI threshold enforcement policy, tokenizer-accurate accounting, or broader agent-behavior analytics.

</domain>

<decisions>
## Implementation Decisions

### Representative Query Set
- **D-01:** Phase 75 uses a **fixed built-in** representative query set in the first release.
- **D-02:** The representative set should balance **common agent workflows** with **heavier response shapes**, rather than optimizing only for one side.
- **D-03:** The first release focuses on **graph/query + content-style** CodeMap queries, not tool/ops commands like `doctor` or `benchmark`.
- **D-04:** Query-set extensibility is deferred; Phase 75 should optimize for repeatability and comparability first.

### Persistence Granularity
- **D-05:** The primary persisted truth is **per-run detail records**, not pre-aggregated summary rows.
- **D-06:** Aggregated statistics should be computed at read/report time in later phases unless a concrete persistence need emerges.
- **D-07:** First-release detail rows should at minimum capture: query type, runtime timestamp, response size bytes, raw character count, and estimated token metrics.
- **D-08:** The first release should avoid storing full query-input snapshots by default; keep storage narrow and focused on query type + result metrics.

### Token Estimation Contract
- **D-09:** `rawCharCount` and `responseSizeBytes` are **truth fields**; token values are **estimated derived fields**.
- **D-10:** Phase 75 should record **input + output** token estimates, but the output must clearly label them as estimates rather than tokenizer-exact values.
- **D-11:** The first release should use a **simple, stable, explainable heuristic** rather than integrating a tokenizer dependency.
- **D-12:** Input-side estimation should use a **minimal-scope approximation** first, not a full harness/system-prompt/schema accounting model.

### Phase Boundary Reinforcement
- **D-13:** This phase keeps the existing milestone decision to ship a **new `agent-metrics` command**, not extend `benchmark`.
- **D-14:** This phase follows the locked **history-pattern** direction: thin CLI wrapper over a service layer with SQLite persistence.
- **D-15:** Do not expand Phase 75 into formatting-heavy report UX, threshold policy tuning, or broader intelligence-layer features; those belong to later phases.

### the agent's Discretion
- Exact built-in representative query instances, as long as they stay within the fixed query-type set and reflect both common and heavy response shapes.
- Exact SQLite schema shape for per-run metric rows, as long as detail records remain the primary stored truth.
- Exact heuristic formula for token estimation, as long as it is stable, documented, and clearly marked as estimated.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Authority
- `.planning/ROADMAP.md` — Phase 75 goal, dependency boundary, and success criteria
- `.planning/PROJECT.md` — active milestone scope, current milestone focus, and locked command-pattern decisions

### Upstream Product Intent
- `docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md` — requirement-level intent for `agent-metrics`, token fields, command shape, and deferred items
- `docs/ideation/2026-05-10-agent-effectiveness-validation-ideation.md` — broader rationale for token-cost measurement and why this milestone exists

### Existing Code and Reusable Assets
- `src/cli/commands/benchmark.ts` — neighboring benchmark command surface that this phase must not absorb
- `src/cli/commands/__tests__/history-command.test.ts` — reference for the locked “history pattern” direction
- `src/orchestrator/history-risk-service.ts` — likely service-layer precedent for persistence/report separation
- `src/cli/interface-contract/commands/benchmark.ts` — existing command-contract style relevant to future command wiring
- `src/orchestrator/result-fusion.ts` — existing approximate token/character handling patterns that may inform heuristic design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The codebase already has a `benchmark` command surface, but milestone decisions explicitly separate `agent-metrics` from `benchmark`.
- The repo already contains service-layer patterns and command test structure that can support a thin CLI wrapper over persisted metrics.
- Existing token-related helper logic and heuristics already appear in the codebase, so Phase 75 may be able to reuse approximation patterns instead of importing a tokenizer.

### Established Patterns
- The milestone is already locked to a **new command family** (`codemap agent-metrics`) rather than benchmark expansion.
- Existing planning intent prefers **zero new dependencies** and reusing current building blocks.
- The active milestone is framed around foundational measurement infrastructure first, with richer reporting and CI behavior deferred to later phases.

### Integration Points
- CLI command registration and contract surfaces for the future `agent-metrics` family
- Service-layer implementation patterned after existing thin-command / richer-service separations
- SQLite persistence for per-run metric records
- Later `report`, `CI gate`, and `intelligence layer` phases that will consume the Phase 75 stored truth

</code_context>

<specifics>
## Specific Ideas

- The user explicitly chose a **fixed built-in** representative query set for the first release.
- The user explicitly chose to balance **common agent workflows** with **heavier response shapes**.
- The user explicitly chose to cover **graph/query + content-style** queries first, not tool/ops commands.
- The user explicitly chose **detail-row-first persistence** with aggregation deferred to read time.
- The user explicitly chose **truth fields first** (`rawCharCount`, `responseSizeBytes`) with token as an estimated derived metric.
- The user explicitly chose **minimal input estimation** instead of full harness/system-prompt/schema accounting in Phase 75.

</specifics>

<deferred>
## Deferred Ideas

- Project-custom or user-supplied query sets
- Tool/ops commands like `doctor` and `benchmark` in the representative sample
- Tokenizer-accurate accounting or model-specific tokenizer integration
- Full input-context accounting including harness/system prompts/tool schema cost
- Rich report formatting, CI threshold policy defaults, and trend/distribution intelligence

</deferred>

---

*Phase: 75-core-infrastructure-basic-token-analysis*
*Context gathered: 2026-05-10*
