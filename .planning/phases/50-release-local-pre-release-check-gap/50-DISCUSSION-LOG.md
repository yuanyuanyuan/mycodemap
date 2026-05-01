# Phase 50: Release Local Pre-Release Check Gap - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 50-release-local-pre-release-check-gap
**Areas discussed:** phase promotion, local/CI parity, fix placement, verification

---

## Phase Promotion

| Option | Description | Selected |
|--------|-------------|----------|
| Leave under milestone draft | Keep the phase only in `.planning/milestones/v2.0-phases/`. | |
| Promote to active queue | Move it into `.planning/phases/50-release-local-pre-release-check-gap/`. | yes |

**User's choice:** User pointed to the existing Phase 50 context under the v2.0 milestone path and asked to reintegrate the phases.
**Notes:** This becomes the canonical active Phase 50; the init and CLI guard phases are renumbered to 51 and 52.

---

## Fix Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit release script step | Add `npm run docs:check:pre-release` directly to `scripts/release.sh`. | preferred |
| Fold into `check:all` | Broader but can make non-release checks slower/stricter. | acceptable with docs |

**User's choice:** Original context listed both as possible fixes.
**Notes:** Planning should choose the least surprising release-specific path.

---

## Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Passing checks only | Run docs checks after edits. | |
| Failure + passing paths | Show local pre-release failure is caught, then passing checks. | yes |

**User's choice:** Selected from repo verification rules and original success criteria.
**Notes:** No real release operation should be run.

## Deferred Ideas

- Full release dry-run simulator.
- Real tag/push/publish.
