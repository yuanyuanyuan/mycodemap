# Phase 44: AI-First Default Output - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Flip the output paradigm — structured JSON by default, human rendering on demand. All commands must emit JSON/NDJSON on stdout by default, with `--human` flag and TTY auto-detection preserving interactive behavior. Progress events go to stderr as structured NDJSON. `codemap analyze | jq '.findings[] | select(.severity=="high")'` must work out of the box.

</domain>

<decisions>
## Implementation Decisions

### Output Mode Flip Strategy
- TTY compatibility: interactive terminal defaults to human-readable, non-TTY defaults to JSON — no breaking change for humans, consistent with Phase 43 doctor
- `--human` / `--json` relationship: `--human` = force human-readable (overrides TTY), `--json` = force JSON (overrides TTY), no flag = TTY auto-detect — three-state clear
- Migration strategy: progressive — migrate 3 core commands first (analyze, query, deps), remaining commands later — lower risk, establish pattern
- Flip granularity: command-level — each command's action handler decides output mode — minimal change, no commander flow disruption

### Data Flow & Progress Events
- stdout purpose: pure data JSON only — compatible with `| jq` pipes
- Progress event location: stderr NDJSON — `{type: "progress", percent, message}` to stderr, does not pollute stdout data stream
- Single command output format: single JSON object (not array) — `codemap analyze` outputs `{findings: [...], summary: {...}}`
- Multi-result output format: newline-separated NDJSON — `codemap query` multi-result outputs one JSON per line — streaming-friendly
- ora spinner behavior: enable ora spinner (to stderr) in `--human` or TTY mode, silent in JSON mode — consistent with Phase 43 doctor

### Output Content & Rendering
- JSON output structure source: reuse Phase 41 contract OutputShape — already has analyze/query/deps JSON schema definitions
- Human-readable renderer: use chalk + padEnd simple tables (consistent with Phase 43 doctor formatter) — no new dependencies
- Error output format: errors also go JSON: `{type: "error", code, message, remediation}` — aligned with Phase 45 Failure-to-Action

### Claude's Discretion
Implementation details beyond the above decisions are at Claude's discretion. Follow existing codebase patterns and conventions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/interface-contract/types.ts` — OutputShape definition with JSON schema for command outputs
- `src/cli/interface-contract/commands/analyze.ts` — analyze command contract with output shape
- `src/cli/interface-contract/commands/query.ts` — query command contract with output shape
- `src/cli/doctor/formatter.ts` — formatDoctorReport (chalk + padEnd table) and formatDoctorJson (JSON.stringify) patterns from Phase 43
- `src/cli/commands/doctor.ts` — TTY auto-detection pattern (`process.stdout.isTTY` + `--json` flag)
- `chalk@5.3.0` — already installed, widely used for terminal styling
- `ora@8.0.1` — already in dependencies, spinner library

### Established Patterns
- `--json` flag already supported by: analyze, query, deps, cycles, complexity, impact, doctor
- `--structured` flag exists on some commands (superset of `--json`)
- Console output in commands: `console.log()` for human output, `JSON.stringify()` for JSON output
- Commander.js options pattern: `program.option('-j, --json', '...')`
- Doctor command: TTY detection → `formatDoctorReport()` or `formatDoctorJson()`

### Integration Points
- `src/cli/commands/*.ts` — all command handlers need output mode awareness
- `src/cli/interface-contract/` — OutputShape provides the JSON structure definitions
- Phase 43 doctor formatter — pattern to follow for human-readable rendering
- Phase 45 (Failure-to-Action) — downstream consumer of structured error format

</code_context>

<specifics>
## Specific Ideas

- Start with the 3 core commands that already have contract schemas: analyze, query, deps
- Each migrated command should: (1) always compute structured data first, (2) then render based on output mode
- Progress events during long-running commands (analyze, generate) should use `process.stderr.write(JSON.stringify({type: "progress", ...}) + '\n')`
- ora spinner should be created only when output mode is human-readable, and should output to stderr
- The `--human` flag is new; `--json` already exists on many commands

</specifics>

<deferred>
## Deferred Ideas

- Full migration of all 20+ commands — only 3 core commands in this phase
- Global output middleware at program level — deferred; command-level is sufficient for now
- Removing existing `--json` flag — deferred; keep both `--json` and `--human` as explicit overrides
- Progress NDJSON on stderr in JSON mode — deferred to Phase 45; current phase focuses on output mode flip

</deferred>
