---
phase: 34
slug: release-authority-gap-closure
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-22
updated: 2026-04-22
---

# Phase 34 — Validation Strategy

> Focused validation contract for closing the `v1.9` release authority drift without reopening real publish behavior.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | docs guardrails + CLI docs-sync checks |
| **Config file** | `package.json` |
| **Quick run command** | `rtk npm run docs:check:pre-release` |
| **Full suite command** | `rtk proxy git diff --check && rtk npm run docs:check && rtk npm run docs:check:pre-release && rtk node dist/cli/index.js ci check-docs-sync` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local docs check for the touched release surface
- **After every plan wave:** Run `rtk npm run docs:check:pre-release`
- **Before milestone re-audit:** Run the full suite command above
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 1 | REL-01, DOC-02 | static docs | `! rtk proxy rg -n "方式1: 使用发布脚本（推荐）|\\.\\/scripts/release\\.sh patch" docs/rules/pre-release-checklist.md` | ✅ | ✅ green |
| 34-01-02 | 01 | 1 | REL-01, DOC-02 | static docs | `rtk proxy rg -n "\\$gsd-complete-milestone v\\{X\\.Y\\}|推荐方式: 使用 \`/release vX\\.Y\` 统一编排|机械 helper" docs/rules/release.md docs/rules/pre-release-checklist.md` | ✅ | ✅ green |
| 34-01-03 | 01 | 1 | VAL-01 | docs guardrail | `rtk npm run docs:check` | ✅ | ✅ green |
| 34-01-04 | 01 | 1 | VAL-01 | pre-release docs guardrail | `rtk npm run docs:check:pre-release` | ✅ | ✅ green |
| 34-01-05 | 01 | 1 | VAL-01 | docs sync | `rtk node dist/cli/index.js ci check-docs-sync` | ✅ | ✅ green |
| 34-01-06 | 01 | 1 | REL-01, DOC-02, VAL-01 | diff hygiene | `rtk proxy git diff --check` | ✅ | ✅ green |
| 34-01-07 | 01 | 1 | REL-01, DOC-02, VAL-01 | planning truth | `rtk proxy rg -n "\\[x\\] \\*\\*REL-01|\\[x\\] \\*\\*DOC-02|\\[x\\] \\*\\*VAL-01|completed_phases: 4|percent: 100|ready_for_milestone_closeout" .planning/REQUIREMENTS.md .planning/STATE.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing docs guardrail infrastructure already covers this phase. No additional wave-0 assets are needed beyond the phase artifacts created here.

---

## Manual-Only Verifications

All Phase 34 behaviors are covered by static docs validation and planning truth checks.

---

## Failure Rehearsal

1. **Checklist reintroduces helper-first recommendation**
   - Failure mode: `pre-release-checklist.md` again looks like the primary release workflow, making `/release` non-authoritative.
   - Detection: the negative grep for `方式1: 使用发布脚本（推荐）` / `./scripts/release.sh patch` fails immediately.

2. **Closeout command example drifts away from current GSD invocation convention**
   - Failure mode: `release.md` points to a command surface inconsistent with the actual GSD skill entry point.
   - Detection: the positive grep for `$gsd-complete-milestone v{X.Y}` fails.

---

## Validation Sign-Off

- [x] All tasks have automated verification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true`

**Approval:** approved 2026-04-22
