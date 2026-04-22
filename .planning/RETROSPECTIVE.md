# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.7 — init-and-rule-hardening

**Shipped:** 2026-04-22
**Phases:** 2 | **Plans:** 11 | **Sessions:** multiple

### What Was Built

- Repo-local rule control now has capability baseline, validator exit-code contract, hooks/CI backstop, scoped rule-context injection, and executable QA.
- `mycodemap init` now reconciles canonical `.mycodemap/config.json`, workspace directories, receipts, first-run guidance, hooks, rules, and manual AI context snippets.
- Packaged CLI smoke proves `mycodemap init --yes` can install config, receipt, hooks, and rules from the npm tarball shape.
- Human and AI docs now describe `.mycodemap/config.json`, `.mycodemap/status/init-last.json`, `.mycodemap/hooks/`, and `.mycodemap/rules/` as the canonical init contract.

### What Worked

- Keeping rule-control and init convergence as concrete executable contracts made validation evidence stronger than documentation-only claims.
- Tarball smoke caught package-shape risks that source-checkout tests would miss.
- Focused test selection kept feedback fast while still covering changed init, docs, and GSD lookup behavior.

### What Was Inefficient

- Root planning truth drifted: `STATE.md`, `ROADMAP.md`, and `REQUIREMENTS.md` did not all describe the same current milestone before close.
- Phase 999.1 validation remained draft after execution and had to be reconciled during milestone close.
- Full `check:all` was blocked earlier by GSD tool-location assumptions, so focused tests and package smoke carried the final confidence.

### Patterns Established

- Init assets use an asset-level receipt model: missing / installed / migrated / already-synced / conflict / manual-action-needed / skipped.
- Packaged hooks live under `scripts/hooks/templates/` so npm tarball installs can initialize target projects without relying on source-only `.githooks/`.
- AI context integration stays manual and auditable through generated snippets rather than automatic edits to team-owned files.

### Key Lessons

1. Milestone close should start with a forensic planning-truth check whenever root `STATE.md` and roadmap analysis disagree.
2. Package smoke is mandatory for CLI commands that copy bundled assets into another repository.
3. Validation artifacts must be updated at execution close, not deferred to milestone archival.

### Cost Observations

- Model mix: not captured in durable telemetry for this milestone.
- Sessions: multiple implementation and closeout sessions.
- Notable: Context stayed manageable once large phase execution history was summarized into archives.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.7 | multiple | 2 | Moved from docs-only guardrails to executable rule/init contracts with package smoke |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.7 | 60 focused tests + prior Phase 27 QA | focused changed-surface coverage | no new runtime package dependency required by closeout |

### Top Lessons (Verified Across Milestones)

1. Machine-readable CLI truth must move together with README, AI guide, and guardrail checks.
2. Planning archives are only trustworthy when `STATE.md`, `ROADMAP.md`, requirements, and phase summaries are reconciled at close.
