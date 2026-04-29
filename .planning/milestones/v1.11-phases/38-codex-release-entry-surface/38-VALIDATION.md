---
phase: 38
slug: codex-release-entry-surface
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-23
updated: 2026-04-23
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for Codex-first release-wrapper work. This phase validates docs / skill routing truth only; it must not trigger real release side effects.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | existing docs guardrails + targeted grep |
| **Quick run command** | `rtk npm run docs:check` |
| **Cross-check command** | `rtk node dist/cli/index.js ci check-docs-sync` |
| **Diff hygiene** | `rtk git diff --check` |
| **Estimated runtime** | ~30-60 seconds |

---

## Sampling Rate

- **After wrapper draft lands:** run targeted `rg` against `.agents/skills/release/SKILL.md`
- **After docs routing note lands:** run targeted `rg` against `docs/rules/release.md`
- **Before phase close:** run `rtk npm run docs:check`, `rtk node dist/cli/index.js ci check-docs-sync`, `rtk git diff --check`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | RELF-01, SAFE-01, SAFE-02 | skill routing | `rtk proxy rg -n "docs/rules/release\\.md|Confirmation Gate #1|Confirmation Gate #2|scripts/release\\.sh|\\.github/workflows/publish\\.yml" .agents/skills/release/SKILL.md` | ✅ | ✅ green |
| 38-01-02 | 01 | 1 | SAFE-01 | anti-authority-drift | `! rtk proxy rg -n "single authoritative|authoritative workflow document" .agents/skills/release/SKILL.md` | ✅ | ✅ green |
| 38-01-03 | 01 | 1 | SAFE-01 | docs routing | `rtk proxy rg -n "single authoritative|单一权威|\\.claude/skills/release/SKILL\\.md|\\.agents/skills/release/SKILL\\.md" docs/rules/release.md` | ✅ | ✅ green |
| 38-01-04 | 01 | 1 | SAFE-01 | no duplicate gates in entry docs | `! rtk proxy rg -n "Confirmation Gate #1|Confirmation Gate #2" README.md AI_GUIDE.md CLAUDE.md` | ✅ | ✅ green |
| 38-01-05 | 01 | 1 | RELF-01, SAFE-01, SAFE-02 | docs guardrail | `rtk npm run docs:check` | ✅ | ✅ green |
| 38-01-06 | 01 | 1 | RELF-01, SAFE-01, SAFE-02 | docs sync | `rtk node dist/cli/index.js ci check-docs-sync` | ✅ | ✅ green |
| 38-01-07 | 01 | 1 | SAFE-02 | diff hygiene | `rtk git diff --check` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

- Confirm the Codex wrapper never claims to be the single workflow authority.
- Confirm no command path in this phase can bypass explicit `/release v{X.Y}` + two-gate semantics.

---

## Validation Sign-Off

- [x] All tasks have automated verify steps
- [x] No validation step can trigger a real publish side effect
- [x] Docs guardrails and docs-sync remain the primary validation surface
- [x] `nyquist_compliant: true` set only after all verification rows turn green

**Approval:** approved
