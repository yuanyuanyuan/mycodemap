# Phase 45: Failure-to-Action Protocol - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn every error into a structured, recoverable state transition. Errors must return `{attempted, rootCause, remediationPlan, confidence, nextCommand}`. Native dependency failures auto-suggest `--wasm-fallback` or prebuilt binary URL. Agents can attempt remediation without human intervention using `nextCommand`. Confidence scoring prevents cascading failures. No auto-execution without explicit `--apply-suggestion`.

</domain>

<decisions>
## Implementation Decisions

### Error Structure Design
- Extend existing `StructuredError` type (add `attempted`, `rootCause`, `confidence`, `nextCommand` fields) — backward compatible with Phase 44 output infrastructure
- `nextCommand` is a plain string — consistent with Phase 43 doctor `DiagnosticResult.nextCommand`
- `confidence` is a float 0-1 — thresholdable for auto-execution gating
- Error codes use prefix classification: `DEP_*` (dependencies), `CFG_*` (configuration), `RUN_*` (runtime), `FS_*` (filesystem) — extensible and human-readable

### Auto-Remediation & Safety Gates
- `--apply-suggestion` is a global flag registered at commander program level — consistent with `--json`/`--human` pattern
- Confidence threshold of 0.8 required for `--apply-suggestion` auto-execution — high confidence only, prevents cascading failures
- Auto-exec failure stops immediately and returns a new ActionableError — no retry to prevent cascading damage
- `--wasm-fallback` triggers at error handler level (reactive) — when native dep load fails and flag is present, switches to WASM path

### Command Migration Strategy
- Priority commands: `analyze`, `query`, `deps` — aligned with Phase 44 output mode migration, already have output mode infrastructure
- Unmigrated commands get auto-upgraded via `normalizeError` — adds generic remediation suggestions when none provided
- Error detail level: `attempted` + `rootCause` + 1-2 specific suggestions — actionable but not verbose
- Native dep failure suggestions: `--wasm-fallback` + prebuilt binary URL + `npm rebuild` — covers most common fix paths

### Agent Interaction Protocol
- Agent auto-fixability check: `confidence >= 0.8 && nextCommand` — explicit machine-readable condition
- `nextCommand` execution result format: `{type: "result", success, data?}` JSON — standardized feedback
- Error chain support: `ActionableError.causes` array tracks nested error sources — debug-friendly
- `--apply-suggestion` execution logs go to stderr NDJSON — consistent with Phase 44 progress events

### Claude's Discretion
Implementation details beyond the above decisions are at Claude's discretion. Follow existing codebase patterns and conventions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/output/errors.ts` — `formatError()` and `normalizeError()` already produce `StructuredError` with `code`, `message`, `remediation`
- `src/cli/output/types.ts` — `StructuredError` type definition, `OutputMode`, `ProgressEmitter`
- `src/cli/output/mode.ts` — `resolveOutputMode()` for TTY/flag detection
- `src/cli/output/progress.ts` — `createProgressEmitter()` with NDJSON stderr and ora spinner
- `src/cli/doctor/types.ts` — `DiagnosticResult` with `nextCommand?: string` field
- `src/cli/doctor/check-native-deps.ts` — native dep detection with remediation text
- `src/cli/tree-sitter-check.ts` — `detectTreeSitter()` / `detectTreeSitterSync()` pattern
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — dynamic import pattern for better-sqlite3

### Established Patterns
- Commander.js options: `program.option('-j, --json', '...')` for global flags
- `--json`/`--human` global flags from Phase 44
- `normalizeError()` converts any thrown value to structured shape
- `formatError()` produces mode-aware output (JSON or chalk-colored)
- Doctor `DiagnosticResult.nextCommand` field as precedent for executable remediation
- Phase 44 output mode: JSON by default on non-TTY, human on TTY

### Integration Points
- `src/cli/output/types.ts` — extend `StructuredError` with new fields
- `src/cli/output/errors.ts` — extend `normalizeError()` and `formatError()`
- `src/cli/commands/analyze.ts`, `query.ts`, `deps.ts` — migrate error handling to ActionableError
- `src/cli/index.ts` — register `--apply-suggestion` and `--wasm-fallback` global flags
- `src/cli/doctor/` — `nextCommand` field alignment and `--fix` support (deferred from Phase 43)
- Phase 42 MCP server — ActionableError schema exposure for agent consumption

</code_context>

<specifics>
## Specific Ideas

- Extend `StructuredError` in-place rather than creating a parallel type — keeps output infrastructure unified
- `normalizeError()` should detect common error patterns (MODULE_NOT_FOUND, EACCES, ENOENT) and auto-assign error codes and remediation
- The `--apply-suggestion` flag should be a safety gate, not an auto-pilot — user must explicitly opt in
- Confidence scoring should be based on: known error code (high), heuristically matched pattern (medium), unknown error (low)
- Error chain (`causes[]`) helps distinguish "tree-sitter failed because better-sqlite3 failed" from "tree-sitter failed independently"

</specifics>

<deferred>
## Deferred Ideas

- `doctor --fix` auto-remediation — uses the same ActionableError infrastructure but deferred to post-Phase 45 when doctor is more mature
- Automatic retry with exponential backoff — not in scope; single attempt with clear failure feedback
- Error telemetry / reporting — deferred; structured errors enable this but collection infrastructure doesn't exist yet
- MCP `apply_suggestion` tool — Phase 42 gateway can auto-expose this once the CLI flag exists

</deferred>
