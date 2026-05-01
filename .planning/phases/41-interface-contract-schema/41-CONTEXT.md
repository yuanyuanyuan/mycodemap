# Phase 41: Interface Contract Schema - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped — infrastructure phase)

<domain>
## Phase Boundary

Define the CLI surface as a formal machine-readable contract schema and expose runtime metadata. The contract schema must cover: command names, positional + optional arguments, flags (boolean/string/number/array), output shapes (JSON Schema), error code enumerations, and examples. At least 3 core command families (`analyze`, `query`, `deps`) must be defined in schema. `codemap --schema` (or equivalent) must output the full contract as JSON. Schema must be able to generate or validate existing commander configuration.

</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
All implementation choices are at the agent's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from PROJECT.md:
- Zero Duplication: do not create parallel governance layers
- Reuse Existing Guardrails: new detection should plug into `docs:check` / `ci check-docs-sync`
- Navigation First: keep `CLAUDE.md` as router, not execution manual

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/index.ts` — commander-based CLI entry with 15+ commands registered manually
- `src/cli/commands/*.ts` — individual command handlers (query, deps, cycles, complexity, impact, design, ci, workflow, export, check, history, publish-status, readiness-gate, mcp, ship, analyze)
- `src/cli/design-contract-schema.ts` — existing design contract schema using zod (pattern to follow)
- `src/cli/contract-checker.ts` — existing contract validation logic
- `src/server/mcp/server.ts` — experimental MCP server with 2 hand-registered tools

### Established Patterns
- Commander.js for CLI argument parsing
- zod for schema validation
- JSON output already used in some commands (`--json` flag bolt-on)
- File header convention: `// [META] since:YYYY-MM-DD | owner:team | stable:bool` + `// [WHY]`

### Integration Points
- CLI entry `src/cli/index.ts` — where contract schema must integrate (for `--schema` flag)
- `src/server/mcp/server.ts` — downstream consumer of contract schema (Phase 42)
- `package.json` scripts — downstream validation target (Phase 46 for ghost commands)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

Requirements mapping:
- AGENT-01: Define CLI Interface Contract Schema as single source of truth
- AGENT-02: Schema-driven CLI parser generation
- AGENT-04: Schema-driven `--help-json` and shell completion
- AGENT-05: Runtime expose interface contract metadata (`codemap --schema`)
- AGENT-06: Progressive migration of core commands to contract schema

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
