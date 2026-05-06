# Phase 61: MCP Direct Execution - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace `cli_redirect` responses for the first high-value contract-backed MCP tool family with real execution, using a dedicated shared service/executor layer that both CLI wrappers and MCP adapters call. This phase covers `query`, `deps`, and `analyze` as the initial direct-execution family, establishes one structured success/failure envelope around their native result payloads, and starts thinning CLI wrappers. It does not convert every contract tool, redesign all command result schemas, or finish every CLI cleanup pass in one step.

</domain>

<decisions>
## Implementation Decisions

### First direct-execution tool family
- **D-01:** Phase 61 converts `query`, `deps`, and `analyze` together as the first direct-execution MCP tool family.
- **D-02:** The phase should treat these three commands as one shared execution domain for "read/search/dependency/analysis" work, not as unrelated one-off conversions.

### Shared execution architecture
- **D-03:** Shared execution must live in a dedicated service/executor layer, not inside MCP handlers and not as ad-hoc helpers buried in existing CLI command files.
- **D-04:** Both CLI wrappers and MCP adapters must call the same executor/service seam for the converted tool family.
- **D-05:** The dedicated execution layer may be scoped to `query`, `deps`, and `analyze` for now; it does not need to become a universal abstraction for every command in Phase 61.

### Structured result contract
- **D-06:** Shared execution returns a unified outer envelope for both CLI and MCP direct execution paths.
- **D-07:** The outer envelope should standardize success/failure semantics and diagnostics, while the inner business payload remains the command's native result shape.
- **D-08:** The preferred shape is conceptually `status + result + error + diagnostics` (or an equivalent naming scheme), not a full rewrite of all command-specific payload schemas.

### CLI wrapper thinning boundary
- **D-09:** `query` and `deps` wrappers should become thin in this phase: argument parsing, executor invocation, and output rendering only.
- **D-10:** `analyze` must also move onto the shared executor and become materially thinner in Phase 61, but it may retain a smaller compatibility shell than `query`/`deps` because of its higher existing complexity.
- **D-11:** Remaining wrapper cleanup that is not necessary to establish the shared executor boundary may be deferred to `61-03-PLAN.md`.

### Failure-path and contract expectations
- **D-12:** Direct execution is not "done" unless MCP success and failure paths both return real structured results rather than `cli_redirect`.
- **D-13:** Existing `codemap_env_contract` native-tool behavior is the pattern to emulate for "real structured MCP result", but the converted family should use the new shared executor instead of bespoke per-tool logic.
- **D-14:** Phase 61 should prefer explicit structured error semantics over silently reusing CLI-only human messaging.

### the agent's Discretion
- Exact naming and placement of the new executor/service modules, as long as they form a clear shared layer outside the MCP transport and outside thick CLI wrappers.
- Exact outer-envelope field names, as long as success/failure/diagnostics semantics are unified and the command-native payload remains intact inside the result body.
- Exact split of wrapper cleanup between Phase 61 Wave 1/Wave 2 and `61-03-PLAN.md`, as long as `query`/`deps` are clearly thin and `analyze` is meaningfully thinner by the end of this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase authority
- `.planning/ROADMAP.md` — Phase 61 goal, dependencies, and success criteria for MCP direct execution
- `.planning/REQUIREMENTS.md` — locked milestone requirements `MCP-01` through `MCP-04`
- `.planning/PROJECT.md` — milestone-level product direction for `v2.2 architecture-foundation`
- `.planning/STATE.md` — current milestone/phase position and prior recorded decisions

### Prior locked context
- `.planning/phases/59-parser-cutover/59-CONTEXT.md` — prior phase pattern for single execution truth and compatibility shims
- `.planning/phases/60-storage-convergence/60-CONTEXT.md` — prior phase pattern for explicit failure semantics and shared runtime truth

### MCP execution surfaces
- `src/server/mcp/server.ts` — native MCP tool registration, current direct-execution examples, and contract-tool registration entrypoint
- `src/server/mcp/schema-adapter.ts` — current contract-tool conversion and `cli_redirect` output contract that Phase 61 must replace for the selected tool family
- `src/server/mcp/index.ts` — public MCP export surface
- `src/server/mcp/types.ts` — existing MCP result/error typing patterns
- `src/server/mcp/service.ts` — current native shared-service sample (`codemap_query` / `codemap_impact`) that proves structured MCP return shape

### CLI contract and command authority
- `src/cli/interface-contract/index.ts` — full contract registry used for dynamic MCP tool exposure
- `src/cli/interface-contract/commands/query.ts` — contract definition for `query`
- `src/cli/interface-contract/commands/deps.ts` — contract definition for `deps`
- `src/cli/interface-contract/commands/analyze.ts` — contract definition for `analyze`
- `src/cli/interface-contract/commands/env-contract.ts` — native MCP exception pattern and structured output contract reference
- `src/cli/commands/query.ts` — current CLI implementation to thin behind the new executor layer
- `src/cli/commands/deps.ts` — current CLI implementation to thin behind the new executor layer
- `src/cli/commands/analyze.ts` — current CLI implementation with the highest complexity and greatest need for executor extraction

### Integration points and runtime dependencies
- `src/cli/storage-runtime.ts` — MCP/server runtime storage bootstrap used before execution
- `src/orchestrator/tool-orchestrator.ts` — existing orchestration seam used by `analyze` and likely to influence executor extraction boundaries
- `.planning/codebase/ARCHITECTURE.md` — transitional architecture map showing legacy CLI flow and MVP3 layered flow coexisting
- `.planning/codebase/INTEGRATIONS.md` — local runtime / CLI-first integration guidance relevant to the executor seam
- `.planning/codebase/STACK.md` — runtime/tooling baseline for Node/TypeScript CLI implementation

### Verification and failure-path evidence
- `src/server/mcp/__tests__/dynamic-server.test.ts` — current tests that still treat `cli_redirect` as the expected contract-tool success path
- `src/server/mcp/__tests__/env-contract-tool.test.ts` — native MCP tool tests proving real structured execution instead of `cli_redirect`
- `.planning/research/SUMMARY.md` — milestone research calling out Phase 61 as the shared-service seam decision point
- `.planning/research/PITFALLS.md` — explicit warning that Phase 61 fails if schema registration stops at `cli_redirect`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CodeMapMcpService` in `src/server/mcp/service.ts`: already demonstrates a shared service returning structured MCP results.
- `createCodeMapMcpServer()` in `src/server/mcp/server.ts`: already splits native MCP tools from schema-derived contract tools, giving a natural insertion point for the converted executor-backed family.
- CLI interface contract registry in `src/cli/interface-contract/index.ts`: already centralizes command discovery, so direct-execution conversion can stay selective without abandoning schema-driven registration.
- Existing command implementations in `src/cli/commands/query.ts`, `src/cli/commands/deps.ts`, and `src/cli/commands/analyze.ts`: provide the current business logic that must be moved behind the shared executor boundary instead of duplicated.

### Established Patterns
- Native MCP tools are considered "real" only when they return structured content directly, as shown by `codemap_env_contract`; `cli_redirect` is explicitly transitional and not acceptable as the final truth for this phase.
- The repo accepts compatibility shells during convergence phases, but the execution truth itself must collapse to one shared path.
- Failure-to-Action and structured remediation are established project patterns; direct execution should preserve that philosophy in the outer envelope instead of falling back to CLI-only prose.

### Integration Points
- `src/server/mcp/schema-adapter.ts` is the current redirect seam that Phase 61 must either bypass or refactor for the selected tool family.
- `src/cli/commands/query.ts` and `src/cli/commands/deps.ts` are good candidates for early wrapper thinning because their responsibilities are narrower.
- `src/cli/commands/analyze.ts` is the highest-risk extraction point because it already coordinates multiple adapters and fallback branches.
- MCP server tests and CLI command tests must both change together to prove that CLI and MCP now share one execution truth for the converted family.

</code_context>

<specifics>
## Specific Ideas

- Use `codemap_env_contract` as the reference for what "real MCP structured output" looks like, but do not copy its bespoke implementation style blindly; the converted family should validate the new shared executor seam instead.
- Preserve command-native payloads inside the envelope so downstream agent consumers can get stable business data without forcing a large schema rewrite in Phase 61.
- Plan for asymmetric cleanup: `query`/`deps` should likely end Phase 61 thinner than `analyze`, and that asymmetry is acceptable if the executor seam is already the shared truth.

</specifics>

<deferred>
## Deferred Ideas

- Converting every contract-backed MCP tool in one phase is explicitly out of scope; Phase 61 only commits to the first high-value family.
- A universal executor abstraction for all CLI commands can be considered later if the `query`/`deps`/`analyze` seam proves stable.
- Full final cleanup of any remaining `analyze` compatibility shell belongs in `61-03-PLAN.md` if it is not required to establish shared execution truth.
- `codemap_context` routing and suggestion logic remains Phase 62 work; it must consume stabilized execution truth rather than be built in parallel here.

</deferred>

---

*Phase: 61-mcp-direct-execution*
*Context gathered: 2026-05-06*
