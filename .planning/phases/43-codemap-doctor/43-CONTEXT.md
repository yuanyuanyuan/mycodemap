# Phase 43: codemap doctor - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a living diagnostics command that audits the entire CodeMap ecosystem. `codemap doctor` must detect ghost commands (echo stubs in package.json), native dependency health (tree-sitter, better-sqlite3 load status), and .mycodemap/ workspace drift against receipts. It must emit both human-readable and machine-readable JSON output, with diagnostics categorized as install / config / runtime / agent.

</domain>

<decisions>
## Implementation Decisions

### Output Format & Exit Behavior
- TTY auto-detection for default output: interactive terminal shows table+color, non-TTY outputs JSON
- JSON output structure: flat array `[{category, severity, id, message, remediation}]` — simple, grepable, jq-friendly
- Exit code: 0 = all pass, 1 = has error-level findings, 2 = only warnings — follows UNIX convention, CI-usable
- No `--fix` support in this phase — fix requires user confirmation gates (Phase 45 prerequisite), doctor only diagnoses and suggests

### Diagnostic Scope & Detection Strategy
- Ghost command detection: scan project `package.json` scripts for echo stubs (confirmed 2 existing: check:architecture, check:unused)
- Native dependency detection: reuse `tree-sitter-check.ts` try-import pattern + same strategy for better-sqlite3 — proven pattern already in codebase
- Workspace drift detection: compare `init-last.json` receipt asset list against actual filesystem — detect missing/modified/orphaned files
- Agent diagnostics: detect MCP server connectivity and contract schema availability — aligns with Phase 41/42 outputs

### Diagnostic Result Metadata
- Severity levels: 4-tier — `ok` / `warn` / `error` / `info` — consistent with CI gate semantics
- Diagnostic IDs: English kebab-case — `ghost-command-detected`, `native-dep-missing` — machine-grepable
- Remediation format: plain text description + optional `nextCommand` field (becomes executable after Phase 45 Failure-to-Action)

### Claude's Discretion
Implementation details beyond the above decisions are at Claude's discretion. Follow existing codebase patterns and conventions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/tree-sitter-check.ts` — async/sync tree-sitter detection with `detectTreeSitter()`, `detectTreeSitterSync()`, `getTreeSitterDiagnostics()`
- `src/cli/commands/init.ts` — init command with receipt generation pattern
- `src/cli/init/reconciler.ts` — `scanInitState()` / `createInitPlan()` / `applyInitPlan()` three-phase reconciliation
- `.mycodemap/status/init-last.json` — receipt with asset list (key, status, ownership, path, hash)
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — dynamic `import('better-sqlite3')` pattern
- `src/cli/index.ts` — commander.js CLI registration pattern
- `src/server/mcp/server.ts` — MCP server with contract-driven tool registration (Phase 42 output)
- `src/cli/interface-contract/schema.ts` — contract schema (Phase 41 output)

### Established Patterns
- Commander.js for CLI argument parsing
- Dynamic imports for native dependency isolation
- `--json` flag for machine-readable output (bolt-on pattern, will be standardized in Phase 44)
- Receipt-based state tracking in `.mycodemap/status/`
- File header convention: `// [META] since:YYYY-MM-DD | owner:team | stable:bool` + `// [WHY]`

### Integration Points
- `src/cli/index.ts` — where `doctor` command will be registered
- `package.json` scripts — ghost command detection target
- `.mycodemap/` directory — workspace drift detection target
- Phase 41/42 outputs — contract schema and MCP server for agent diagnostics

</code_context>

<specifics>
## Specific Ideas

- Ghost commands confirmed in codebase: `check:architecture` and `check:unused` are echo stubs in package.json
- Doctor should be a top-level command (`codemap doctor`), not a subcommand
- Each diagnostic category maps to a clear check module for maintainability
- Remediation messages should reference concrete commands or config paths, not vague instructions

</specifics>

<deferred>
## Deferred Ideas

- `--fix` auto-remediation — deferred to Phase 45 (Failure-to-Action Protocol) which provides the confirmation gate infrastructure
- Global node_modules bin ghost command scanning — out of scope; project-level package.json is the primary trust surface
- Doctor as MCP tool — deferred; Phase 42 gateway pattern can auto-expose doctor once it's in the contract schema

</deferred>
