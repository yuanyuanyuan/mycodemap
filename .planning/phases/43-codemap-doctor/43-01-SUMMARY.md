---
phase: 43-codemap-doctor
plan: 01
status: completed
completed_at: 2026-04-30
---

# Phase 43 Summary: codemap doctor

## Objective

Create `codemap doctor` — a living diagnostics command that audits the entire CodeMap ecosystem, surfacing ghost commands, native dependency health, workspace drift, and agent connectivity. Fix the "docs say one thing, commands do another" trust crisis.

## Plan vs. Implementation Alignment

| Plan Item | Status | Notes |
|-----------|--------|-------|
| Task 1: Diagnostic types + 4 checker modules | Completed | All 5 files created exactly as planned |
| Task 2: Orchestrator + formatter + CLI registration | Completed | Orchestrator runs checkers in parallel; formatter supports TTY table + JSON |
| Task 3: 5 test files | Completed | 23 tests, all passing |
| `--fix` support | Deferred | Correctly deferred to Phase 45 per CONTEXT.md decision |
| Ghost command detection (check:architecture, check:unused) | Completed | Confirmed detection of both echo stubs in package.json |

## New Files (13)

| File | Purpose | Lines |
|------|---------|-------|
| `src/cli/doctor/types.ts` | DiagnosticResult, DiagnosticCategory, DiagnosticSeverity, DoctorOptions, DoctorReport | 25 |
| `src/cli/doctor/check-ghost-commands.ts` | Scans package.json scripts for echo stubs | 97 |
| `src/cli/doctor/check-native-deps.ts` | tree-sitter/better-sqlite3 load status via try-import | 58 |
| `src/cli/doctor/check-workspace-drift.ts` | Compares init-last.json receipt against filesystem | 106 |
| `src/cli/doctor/check-agent.ts` | Validates contract schema and MCP server availability | 64 |
| `src/cli/doctor/orchestrator.ts` | runDoctor() — parallel checker execution + exit code computation | 42 |
| `src/cli/doctor/formatter.ts` | formatDoctorJson (flat array) + formatDoctorReport (TTY table+color) | 107 |
| `src/cli/doctor/index.ts` | Barrel exports for public API | 17 |
| `src/cli/commands/doctor.ts` | Commander.js command with --json and TTY auto-detection | 42 |
| `src/cli/commands/__tests__/doctor-ghost.test.ts` | 4 tests: echo stub detection, no stubs, no scripts, no package.json | 96 |
| `src/cli/commands/__tests__/doctor-native-deps.test.ts` | 4 tests: tree-sitter available/missing, better-sqlite3 available/missing | 86 |
| `src/cli/commands/__tests__/doctor-workspace-drift.test.ts` | 4 tests: no workspace, missing tool-owned, missing user-owned, all present | 114 |
| `src/cli/commands/__tests__/doctor-agent.test.ts` | 5 tests: valid/invalid contract, MCP available/unavailable, empty contract | 112 |
| `src/cli/commands/__tests__/doctor-integration.test.ts` | 6 tests: exit codes 0/1/2, JSON format, table format, end-to-end | 178 |

## Modified Files (1)

| File | Change |
|------|--------|
| `src/cli/index.ts` | Added doctor command import + registration (2 lines) |

## Key Design Decisions

- **Exit codes:** 0=all pass, 1=has errors, 2=warnings only — UNIX-compatible, CI-usable
- **Output modes:** TTY auto-detect (table+color for interactive, JSON for non-TTY), overridable via `--json`/`--human`
- **JSON format:** Flat array `[{category, severity, id, message, remediation}]` — grepable, jq-friendly
- **Severity tiers:** 4-level (`ok`/`warn`/`error`/`info`) consistent with CI gate semantics
- **Diagnostic IDs:** English kebab-case (`ghost-command-detected`, `native-dep-missing`) — machine-grepable
- **nextCommand field:** Optional executable remediation command (becomes actionable after Phase 45)

## Test Results

- **Unit tests:** 23/23 pass across 5 test files
- **Type check:** `npx tsc --noEmit` passes
- **Build:** `npm run build` succeeds
- **Live CLI:** `node dist/cli/index.js doctor --json` outputs valid JSON with 9 diagnostics covering all 4 categories

## Verification

See `43-VERIFICATION.md` for full verification report including live CLI output details.

## Gaps / Deferred

| Item | Target | Reason |
|------|--------|--------|
| `--fix` auto-remediation | Phase 45 | Requires confirmation gate infrastructure (Failure-to-Action Protocol) |
| Doctor as MCP tool | Future | Phase 42 gateway can auto-expose once contract schema is updated |

## Architecture

```
src/cli/doctor/
  types.ts          ── Diagnostic contracts
  check-*.ts        ── 4 independent checkers (install, config, runtime, agent)
  orchestrator.ts   ── Parallel execution + exit code computation
  formatter.ts      ── TTY table vs JSON serialization
  index.ts          ── Public API barrel

src/cli/commands/doctor.ts ── Commander.js command registration
```

## Commits

- `e907d60` docs(43): create phase plan for codemap doctor
- `f7bc033` [FEATURE] doctor: add diagnostic types and 4 checker modules
- `f720a0b` [FEATURE] doctor: add orchestrator, formatter, and CLI command registration
- `60e7167` [FEATURE] doctor: add 5 test files for all checkers and integration
- `cd9a28b` [FEATURE] cli: add codemap doctor diagnostics command (TRUST-01, TRUST-02, TRUST-03)
- `8fc06d6` [FEATURE] doctor: align with shared output infrastructure (Phase 44, wave 1)
