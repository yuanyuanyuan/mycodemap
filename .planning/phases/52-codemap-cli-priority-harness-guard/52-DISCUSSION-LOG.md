# Phase 52: CodeMap CLI Priority Harness Guard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 52-codemap-cli-priority-harness-guard
**Areas discussed:** split from Phase 51, enforcement mode, detection boundary, runtime coverage

---

## Split From Phase 51

| Option | Description | Selected |
|--------|-------------|----------|
| Keep combined | Plan init bootstrap and runtime compliance together. | |
| Separate phase | Phase 51 handles post-install init; Phase 52 handles runtime/session compliance. | yes |

**User's choice:** User observed there were effectively two Phase 50s and asked to separate them.
**Notes:** This log records the extracted runtime compliance phase.

---

## Enforcement Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Report-only first | Warn/audit initially, then consider escalation after false-positive review. | yes |
| Immediate blocking | Block non-compliant search commands from the start. | |

**User's choice:** Selected from existing harness principle and prior repair plan.
**Notes:** Blocking is deferred.

---

## Detection Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Code search first-use | Detect `rg` / `grep` / `find` before CodeMap CLI for code paths. | yes |
| All text search | Detect every textual search, including docs/config/log tasks. | |

**User's choice:** Selected to avoid excessive false positives.
**Notes:** Docs/config/log, CLI failure, unsupported path, and insufficient result fallbacks stay allowed.

---

## Runtime Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Claude + Codex first | Cover the audited runtimes first. | yes |
| All runtimes | Try to cover every assistant integration now. | |

**User's choice:** Inferred from original audit request covering Claude and Codex.
**Notes:** Additional runtimes can be added after the first detector/auditor proves useful.

## Deferred Ideas

- Immediate hard blocking.
- Full historical dashboard.
- All-runtime enforcement.
