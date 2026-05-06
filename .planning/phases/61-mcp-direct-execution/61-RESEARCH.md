# Phase 61: MCP Direct Execution - Research

**Researched:** 2026-05-06
**Status:** Ready for planning

<research_question>
## What do we need to know to plan this phase well?

How to replace `cli_redirect` for the first high-value MCP tool family with real structured execution, while keeping one shared execution truth across CLI and MCP for `query`, `deps`, and `analyze`.

</research_question>

<repo_facts>
## Verified Code Facts

### Contract-backed MCP tools still stop at `cli_redirect`
- `src/server/mcp/schema-adapter.ts` currently generates handlers via `createCliAvailabilityHandler(...)`, which returns `structuredContent.status = 'cli_redirect'` plus a shell command suggestion.
- `src/server/mcp/__tests__/dynamic-server.test.ts` and `src/server/mcp/__tests__/schema-adapter.test.ts` still treat `cli_redirect` as the correct success path for contract-backed MCP tools such as `codemap_analyze` and `codemap_deps`.
- This means Phase 61 must change both runtime behavior and the tests that currently encode the transitional contract as truth.

### The repo already has a native MCP structured-result pattern
- `src/server/mcp/server.ts` registers native tools that return `{ content, structuredContent, isError }`, with `structuredContent` rendered as JSON text.
- `src/server/mcp/service.ts` shows the desired service shape: transport-free logic, shared error/result builders, and one structured success/failure envelope with diagnostics such as graph status and parse-failure metadata.
- `src/server/mcp/types.ts` already demonstrates a practical outer-envelope pattern: `status`, business payload fields, `error`, and diagnostics context.

### `query`, `deps`, and `analyze` are not equally mature, but they fit one shared execution family
- `src/cli/commands/query.ts` is still a very thick wrapper: it loads the code map/index, chooses one of several query branches, builds metrics, strips structured fields, renders output, and handles errors in one function.
- `src/cli/commands/deps.ts` is smaller but still mixes code-map loading, business execution, output shaping, and rendering in the CLI entrypoint.
- `src/cli/commands/analyze.ts` already has a stronger internal seam through `AnalyzeCommand` and `ToolOrchestrator`, but the command remains high-complexity and its truth is not exposed as a reusable MCP executor yet.
- `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` proves that `codemap_query` already exists as a native MCP tool, but it does not yet share execution truth with the CLI `query` command.

### Contract discovery is reusable; only the handler path needs selective replacement
- `src/server/mcp/schema-adapter.ts` already does flag-to-Zod conversion, output-schema exposure, alias normalization, and dynamic MCP tool definition generation.
- `src/server/mcp/server.ts` already supports mixing native tools with contract-derived tools, including reserved-name handling such as `codemap_query` vs `codemap_query_contract`.
- This means Phase 61 should preserve schema-driven discovery and selectively replace the handler/output contract for `query`, `deps`, and `analyze`, rather than abandoning the dynamic registry.

### There is an existing “thin wrapper + pure execution result” pattern elsewhere in the repo
- `src/cli/commands/publish-status.ts` separates execution, rendering, and command handling more cleanly than `query`/`deps`/`analyze`.
- `src/cli/storage-runtime.ts` already centralizes storage bootstrap for server/runtime consumers, so Phase 61 does not need to invent a second runtime bootstrap path for MCP direct execution.

### Query naming conflict is a real planning concern
- Because `codemap_query` is already a native MCP tool, the contract-derived `query` command cannot simply claim the same MCP name without an explicit override strategy.
- The current system resolves name conflicts via reservation/rename behavior in `src/server/mcp/server.ts`, and tests already reference `codemap_query_contract`.
- Phase 61 planning must therefore decide explicitly how the new shared executor serves both the existing native `codemap_query` surface and the CLI `query` command, instead of pretending they are separate concerns.

</repo_facts>

<planning_implications>
## Planning Implications

### 1. Phase 61 should establish the shared executor seam before final wrapper cleanup
The phase goal is not just “MCP returns JSON now”; it is “CLI and MCP share one execution truth”. Planning should therefore:
- create a dedicated executor/service layer for the family
- move business execution and result-envelope shaping into that layer
- leave rendering and process/TTY concerns in wrappers

### 2. `query` must be treated as part of the family even though it is already native on MCP
`query` is the highest-risk place to accidentally keep dual truth:
- native MCP `codemap_query` already returns structured results
- CLI `query` still runs through its own wrapper-local implementation
- if Phase 61 only converts `deps` and `analyze`, requirement `MCP-02` is only half-satisfied

### 3. The best migration shape is “standardize the outer envelope, preserve native payloads”
The Context decisions are correct and the codebase supports that direction:
- keep one outer result contract for status/error/diagnostics
- keep `query`, `deps`, and `analyze` payloads close to their current shapes inside `result`
- avoid a broad business-schema rewrite during the direct-execution cutover

### 4. MCP adapter conversion should be selective, not a full adapter rewrite
The contract schema conversion utilities are already good enough.
The real change is:
- replace `cli_redirect` handlers for the selected family
- keep dynamic schema exposure
- add direct-execution output schemas that match the new outer envelope

### 5. Wave 2 should focus on proof, thinning, and compatibility cleanup
Because `analyze` has the largest impact surface and `query` is still a thick CLI wrapper, trying to perfect all wrapper cleanup in Wave 1 would blur the main cutover goal.
The roadmap split is therefore sound:
- Wave 1: shared executor seam + MCP adapter cutover
- Wave 2: wrapper slimming, targeted integration tests, and explicit failure-path evidence

</planning_implications>

<recommended_plan_shape>
## Recommended Plan Shape

### 61-01-PLAN
Focus on the shared execution seam:
- define family-level executor/result types
- centralize runtime bootstrap and business execution for `query`, `deps`, and `analyze`
- make `query` native MCP and CLI `query` converge on the same executor entrypoint
- extract only the minimum logic needed to establish one truth

### 61-02-PLAN
Focus on MCP adapter conversion:
- replace `cli_redirect` for `codemap_analyze`, `codemap_deps`, and the `query` MCP surface with executor-backed handlers
- keep contract-driven `listTools()` discoverability
- introduce a structured success/failure envelope schema
- update MCP integration tests away from command-string assertions

### 61-03-PLAN
Focus on thin-wrapper cleanup and evidence:
- reduce CLI wrappers to parsing, output-mode selection, executor invocation, and rendering
- add targeted tests for success and failure on both CLI and MCP surfaces
- add any doc/runtime truth sync required by the new direct-execution contract

</recommended_plan_shape>

<validation_architecture>
## Validation Architecture

### Success-path checks
- `codemap_analyze` and `codemap_deps` return real structured results instead of `cli_redirect`
- `codemap_query` continues returning structured results, but now through the new shared executor seam used by CLI `query`
- CLI wrappers can invoke the same executor layer without re-implementing business logic locally

### Failure-path checks
- at least one direct-execution MCP failure path returns structured `status/error/diagnostics` instead of CLI prose or thrown transport text
- `query`, `deps`, and `analyze` wrapper tests prove non-success paths without relying on `process.stdout`-only behavior
- no MCP success-path test still asserts that returning a shell command string means execution is complete

### Lightweight verification commands to require in plans
- targeted Vitest coverage for `src/server/mcp/__tests__/dynamic-server.test.ts`, `schema-adapter.test.ts`, `CodeMapMcpServer.test.ts`, and the relevant CLI command tests
- `rtk rg -n "cli_redirect"` over touched MCP files/tests to prove the selected family no longer relies on it
- `rtk tsc --noEmit` to guard shared-type and adapter/wrapper refactors

</validation_architecture>

<open_risks>
## Risks To Watch During Execution

- `query` has an existing native MCP surface plus a separate CLI implementation; careless cutover can leave two truths while superficially “passing” MCP tests.
- `analyze.ts` has a very large dependency surface through `ToolOrchestrator`; over-extraction in Wave 1 could turn the plan into an unbounded refactor.
- `schema-adapter.ts` is already high-complexity; Phase 61 should avoid making it the new home for business execution logic.
- If the new outer envelope is added only on MCP but not reflected in wrapper/service boundaries, the repo will still carry hidden CLI/MCP divergence.

</open_risks>

## RESEARCH COMPLETE
