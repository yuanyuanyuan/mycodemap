# Phase 62: Context Routing Gate - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a minimal `codemap_context` routing gate on top of the stabilized MCP direct-execution surface so agents can request lightweight `review`, `debug`, and `default` context plus executable next-step tool suggestions. This phase defines task semantics, the thin routing payload, detail-level behavior, and tool filtering rules. It does not build a new execution engine, replace the underlying contract-tool implementations, or expand into deep graph capabilities such as communities or full code-snippet dossiers.

</domain>

<decisions>
## Implementation Decisions

### Task semantics
- **D-01:** `review` focuses on change risk and blast radius. It should answer "what should I inspect first?" rather than "how do I fix it?"
- **D-02:** `debug` focuses on failure localization and ordered troubleshooting steps. It should answer "what should I run/check first?" with suggestions tied to executable tools.
- **D-03:** `default` focuses on lightweight general repository context. It should answer "what is the current state of this codebase?" without biasing too hard toward either review or debugging workflows.

### Routing payload contract
- **D-04:** The minimal routing payload must always include `graphStats`, `riskSummary`, and `nextToolSuggestions`.
- **D-05:** `graphStats` should stay thin for v2.2: module count, symbol count, and edge count are the canonical baseline; community-level graph metadata is explicitly deferred.
- **D-06:** `riskSummary` should be a simplified routing-oriented summary, not a full risk report. It should expose an overall level/score plus short factors that explain why the level is high/medium/low.
- **D-07:** Warnings and unknowns belong in the routing contract when they affect decision quality, such as missing graph truth, stale graph truth, or filtered-tool limitations.
- **D-08:** Candidate files and hotspots are useful, but they belong in richer detail modes rather than the minimum always-on payload.

### Suggestions and tool filtering
- **D-09:** `nextToolSuggestions` should use task-based static mappings as the primary truth so the routing gate stays stable and predictable.
- **D-10:** The gate may apply small dynamic adjustments on top of the static mapping when local context clearly changes what is executable or relevant, such as missing graph state or filtered tool availability.
- **D-11:** Tool filtering should be strict: the routing response should expose only tools relevant to the current task/context instead of returning the full tool universe with soft recommendations.
- **D-12:** A filtered response is invalid if it removes a tool required to carry out the gate's own suggestions; suggestion generation and filtering must be validated together.

### Detail levels and verification boundary
- **D-13:** `minimal` should contain only the short summary, key counts, compact risk summary, and 2-3 next-step suggestions.
- **D-14:** `standard` should extend `minimal` with justification, hotspot/candidate-file context where available, and any important warnings or unknowns.
- **D-15:** `full` is not a Phase 62 requirement even if earlier backlog ideas mention it; this phase only needs the `minimal` vs `standard` routing boundary required by the roadmap.
- **D-16:** Verification must cover at least these failure modes: invalid task input, missing or stale graph truth, suggested tools that are not actually executable/relevant, filtering that hides a necessary tool, and `minimal` output that is not observably shorter than `standard`.
- **D-17:** The expected compression target for `minimal` versus `standard` is the backlog guidance of roughly 40-60%, but the practical acceptance bar is "clearly shorter while preserving routing value."

### the agent's Discretion
- Exact field names for the routing payload, as long as task semantics, graph stats, risk summary, suggestions, warnings, and detail-level boundaries remain clear.
- Exact static suggestion lists per task, as long as they map to real executable tools and respect strict filtering.
- Exact stale-graph heuristics and warning wording, as long as the user/agent can tell when routing confidence is reduced.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase authority
- `.planning/ROADMAP.md` — Phase 62 goal, dependency on Phase 61, two-wave plan structure, and success criteria for the routing gate
- `.planning/REQUIREMENTS.md` — locked milestone requirements `CTX-01` through `CTX-04`
- `.planning/PROJECT.md` — milestone-level product direction for `v2.2 architecture-foundation`
- `.planning/STATE.md` — latest recorded milestone position and prior phase sequencing

### Prior locked context
- `.planning/phases/61-mcp-direct-execution/61-CONTEXT.md` — direct-execution truth that Phase 62 must consume instead of bypassing
- `.planning/phases/60-storage-convergence/60-CONTEXT.md` — pattern for explicit failure semantics, warnings, and runtime truth
- `.planning/phases/59-parser-cutover/59-CONTEXT.md` — pattern for single truth, thin compatibility shims, and actionable deprecation boundaries

### Research and backlog guidance
- `.planning/research/SUMMARY.md` — milestone research stating Phase 62 is a lightweight routing gate that should follow existing graph metadata and tool registration patterns
- `.planning/research/PITFALLS.md` — warns against fake MCP execution and validates the phase ordering logic
- `docs/backlog.md` — product-direction sketch for `codemap_context`, `graphStats`, simplified `riskScore`, `nextToolSuggestions`, detail levels, and compression expectations

### MCP routing and execution surfaces
- `src/server/mcp/schema-adapter.ts` — current contract-tool MCP conversion seam and lingering `cli_redirect` transitional contract
- `src/server/mcp/server.ts` — MCP tool registration surface and reserved-name boundary
- `src/server/mcp/service.ts` — existing native structured MCP result pattern that the routing gate should emulate rather than returning CLI recipes
- `src/server/mcp/types.ts` — existing MCP result/error typing conventions that may constrain the new routing payload
- `src/server/mcp/__tests__/dynamic-server.test.ts` — current dynamic-tool expectations, including transitional assumptions that may need focused updates
- `src/server/mcp/__tests__/env-contract-tool.test.ts` — proof of native structured MCP results rather than `cli_redirect`

### Tool and risk sources
- `src/cli/interface-contract/index.ts` — command registry used to derive real executable tool suggestions
- `src/cli/interface-contract/commands/env-contract.ts` — existing agent-type filtering contract and naming conventions for routed agent contexts
- `src/orchestrator/file-header-scanner.ts` — one existing simplified risk-score pattern that may inform a lightweight routing summary
- `src/orchestrator/workflow/git-analyzer.ts` — existing risk-score structure and factorization pattern that may inform `riskSummary`
- `src/execution/contract-tools/analyze.ts` — existing analysis-layer outputs that may provide hotspot/candidate-file context for richer detail modes

### Architecture and conventions
- `.planning/codebase/STACK.md` — runtime/tooling baseline for Node/TypeScript CLI + MCP work
- `.planning/codebase/ARCHITECTURE.md` — transitional architecture map showing legacy CLI and layered MCP/server coexistence
- `.planning/codebase/CONVENTIONS.md` — TypeScript, CLI, contract, and testing conventions for high-blast-radius command changes
- `ARCHITECTURE.md` — top-level architecture narrative that should stay aligned once `codemap_context` becomes part of the public MCP surface

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CodeMapMcpService` in `src/server/mcp/service.ts`: already returns structured MCP-native results with graph envelope metadata and explicit error semantics.
- `schema-adapter.ts`: already converts interface contracts into MCP tools, so Phase 62 can stay within the existing MCP registration surface instead of inventing a parallel tool path.
- `src/cli/interface-contract/index.ts`: central registry of real tools that can anchor suggestion generation and executable-tool validation.
- `src/orchestrator/file-header-scanner.ts` and `src/orchestrator/workflow/git-analyzer.ts`: existing lightweight and richer risk scoring patterns that can be mined for a routing-oriented `riskSummary`.
- `src/execution/contract-tools/analyze.ts`: already aggregates impact/complexity-oriented analysis outputs that may provide hotspot hints for `standard` mode without requiring a brand-new analysis subsystem.

### Established Patterns
- Native MCP tools are considered complete only when they return structured content directly; `cli_redirect` is explicitly transitional and not an acceptable end state.
- Recent v2.2 phases prefer one truth seam plus thin compatibility layers, rather than duplicating logic across CLI/MCP adapters.
- Failure-to-Action and explicit warning visibility are established project patterns; routing confidence should degrade visibly when graph truth is missing/stale or when filtering limits suggestions.
- High-blast-radius CLI/MCP changes require focused verification and docs sync rather than broad speculative refactors.

### Integration Points
- `src/server/mcp/server.ts` is the natural MCP registration entry for a new native `codemap_context` tool.
- `src/server/mcp/schema-adapter.ts` and the command-contract registry define the available tool universe that `nextToolSuggestions` must map onto.
- Existing MCP tests, especially `dynamic-server.test.ts`, will need synchronized updates to prove the new routing contract and strict filtering rules.
- Any public routing contract change will likely require docs updates across MCP/AI guidance surfaces, not just code.

</code_context>

<specifics>
## Specific Ideas

- Use a thin, stable routing-gate posture: task-based defaults first, small dynamic adjustments second, never "smart" opaque recommendations as the primary behavior.
- Treat `review` as "inspect blast radius first", `debug` as "locate and triage failure first", and `default` as "orient me quickly" across the codebase.
- Keep `minimal` aggressively short and reserve hotspot/candidate-file expansion for `standard`, which preserves the routing gate's token-budget value.
- Preserve backlog intent for simplified `graphStats` and compact `riskScore`, but align terminology with existing code if current types already favor names like `riskSummary`.

</specifics>

<deferred>
## Deferred Ideas

- Community-level graph metadata and deeper graph explainability belong to later graph-capability milestones, not the v2.2 routing gate.
- Rich `full` detail mode with code snippets or dossier-style outputs is outside Phase 62 and should not block the minimal routing contract.
- Highly dynamic or learned recommendation logic is deferred; v2.2 should optimize for predictability and verifiability first.
- Any expansion beyond `review` / `debug` / `default` task families belongs in future phases once the minimal routing gate proves stable.

</deferred>

---

*Phase: 62-context-routing-gate*
*Context gathered: 2026-05-06*
