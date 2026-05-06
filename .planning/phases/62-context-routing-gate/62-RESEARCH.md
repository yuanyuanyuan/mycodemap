# Phase 62: Context Routing Gate - Research

**Researched:** 2026-05-06
**Status:** Ready for planning

<research_question>
## What do we need to know to plan this phase well?

How to add a minimal native `codemap_context` MCP routing gate that returns lightweight `review` / `debug` / `default` context, real executable next-step tool suggestions, and a clear `minimal` vs `standard` boundary without inventing a new execution engine.

</research_question>

<repo_facts>
## Verified Code Facts

### The MCP server already has the right native-tool insertion point
- `src/server/mcp/server.ts` already mixes native MCP tools with contract-derived tools and reserves native names such as `codemap_query`, `codemap_impact`, and `codemap_env_contract`.
- Native MCP handlers already follow the project’s expected return shape: `{ content, structuredContent, isError }`, with JSON text mirroring `structuredContent`.
- This means Phase 62 can ship `codemap_context` as a native MCP tool without rewriting contract discovery or adding a parallel transport stack.

### The storage layer already exposes enough graph truth for `graphStats`
- `src/interface/types/storage.ts` exposes `loadGraphMetadata()`, `getStatistics()`, and `detectCycles()` on `IStorage`.
- `GraphMetadata` already includes `moduleCount` and `symbolCount`; `ProjectStatistics` already includes `totalDependencies`, which can supply the Phase 62 `edgeCount` baseline.
- Because these are storage-level capabilities, Phase 62 does not need to load full code snippets or invent graph-only tables to satisfy `graphStats`.

### The repo already contains reusable structured-result and diagnostics patterns
- `src/server/mcp/service.ts` demonstrates transport-free service logic and a stable success/failure envelope with graph diagnostics.
- `src/server/mcp/types.ts` already models MCP-native status/error fields and graph metadata in a way Phase 62 can extend instead of replacing.
- `src/execution/contract-tools/types.ts` also shows a family-level `status + result + error + diagnostics` pattern, which reinforces the Context decision to keep one thin outer envelope.

### The tool universe is discoverable from real code, not guesswork
- `src/cli/interface-contract/commands/index.ts` registers the contract-backed command catalog: `analyze`, `query`, `deps`, `doctor`, `benchmark`, `init`, `preview`, and `env-contract`.
- `src/server/mcp/server.ts` shows that native MCP tools add `codemap_query`, `codemap_impact`, and `codemap_env_contract` on top of that contract-derived set.
- `src/server/mcp/schema-adapter.ts` already normalizes MCP tool names, so Phase 62 can derive or validate `nextToolSuggestions` against the real executable tool surface rather than a hand-maintained doc list.

### The routing gate does not exist yet
- A repo-wide search finds `codemap_context` only in planning docs and backlog text, not in `src/`.
- `src/server/mcp/__tests__/dynamic-server.test.ts` currently asserts native-tool presence for `codemap_query` / `codemap_impact` and contract-tool behavior for `codemap_analyze` / `codemap_deps`, but there is no dedicated routing-tool coverage yet.

### Existing risk helpers are informative but should not become the new truth seam
- `src/orchestrator/file-header-scanner.ts` contains a simple `assessRisk()` helper that maps changed-file patterns to `low|medium|high|critical` with factors.
- `src/orchestrator/workflow/git-analyzer.ts` contains a richer git-oriented risk model, but it is workflow-centric and heavier than what a lightweight routing gate needs.
- These are useful reference patterns for naming and factorization, but Phase 62 should not depend on workflow-only git history machinery to answer a lightweight MCP routing request.

</repo_facts>

<planning_implications>
## Planning Implications

### 1. `codemap_context` should be a native MCP tool, not a contract-only stub
The tool is routing-oriented and needs storage-backed graph stats plus task-aware suggestions. The native-tool path in `server.ts` is the cleanest fit and preserves the project’s “real structured result” expectation.

### 2. `graphStats` can be real without widening scope
Phase 62 can satisfy the roadmap’s `modules + symbols + edges` baseline by combining:
- `loadGraphMetadata()` for module/symbol counts and graph health
- `getStatistics()` for dependency/edge counts
- `detectCycles()` for compact routing risk factors

This avoids dragging in v2.3 graph-capability work.

### 3. Suggestion generation should be static-first and code-backed
The most stable design is:
- task-to-tool static mapping as primary truth
- dynamic adjustments only for clearly observable runtime conditions
- validation against real registered MCP/contract tool names

This matches the Context decisions and avoids opaque “smart” recommendations.

### 4. `minimal` vs `standard` should be an explicit payload contract, not just shorter prose
To make the compression requirement testable, the phase should define which fields always exist in `minimal` and which are only allowed in `standard`:
- `minimal`: summary, graphStats, compact riskSummary, 2-3 suggestions
- `standard`: `minimal` plus rationale, warnings, and optional hotspot/candidate-file hints where cheaply available

### 5. Tool filtering must be validated together with suggestion generation
If filtering removes a tool that the response still recommends, the route is broken. Phase 62 therefore needs focused tests for:
- invalid task input
- missing/stale graph truth
- filters that over-prune
- `minimal` output not being observably shorter than `standard`

</planning_implications>

<recommended_plan_shape>
## Recommended Plan Shape

### 62-01-PLAN
Establish the native routing gate:
- add `codemap_context` registration in `server.ts`
- introduce a transport-free context builder/service
- return real `graphStats`, compact `riskSummary`, and task-based `nextToolSuggestions`
- cover `review` / `debug` / `default` plus missing-graph and invalid-input behavior

### 62-02-PLAN
Finish the routing contract:
- add `detailLevel` (`minimal` / `standard`)
- add strict tool filtering with invariants
- prove `minimal` is observably shorter than `standard`
- add focused verification and doc sync for the new public MCP surface

</recommended_plan_shape>

<validation_architecture>
## Validation Architecture

### Success-path checks
- `codemap_context` is discoverable through MCP `listTools()`
- `review`, `debug`, and `default` requests all return structured content
- `graphStats` contains real module/symbol/edge counts from the storage truth
- `nextToolSuggestions` only contains real executable tools

### Failure-path checks
- invalid task input fails structurally
- missing graph truth returns explicit reduced-confidence or unavailable routing output
- stale graph truth is visible through warnings/risk factors rather than silently ignored
- filtered responses never recommend a tool that the same filter removed

### Lightweight verification commands to require in plans
- targeted Vitest coverage for `src/server/mcp/__tests__/context-tool.test.ts`, `dynamic-server.test.ts`, and `CodeMapMcpServer.test.ts`
- `rtk rg -n "codemap_context|nextToolSuggestions|detailLevel|riskSummary"` over touched files
- `rtk tsc --noEmit`

</validation_architecture>

<open_risks>
## Risks To Watch During Execution

- If Phase 61 has not actually landed on the execution branch, Phase 62 can accidentally recommend tools whose direct-execution contract is still transitional.
- If risk scoring tries to become “smart” by depending on git history or deep hotspot analysis on every call, the routing gate will stop being lightweight.
- If `minimal` and `standard` differ only in wording, the compression requirement will be impossible to verify.
- If the tool catalog is hand-maintained instead of code-derived, `nextToolSuggestions` will drift as MCP/contract names evolve.

</open_risks>

## RESEARCH COMPLETE
