---
phase: 37
slug: archive-identity-cleanup
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-23
updated: 2026-04-23
---

# Phase 37 — Validation Strategy

| Property | Value |
|----------|-------|
| **Framework** | targeted grep + diff hygiene + docs smoke |
| **Quick run command** | `rtk proxy rg -n "historical snapshot|current active planning truth|lessons archive" .planning/MILESTONES.md .planning/RETROSPECTIVE.md .planning/milestones/README.md .planning/milestones/v1.9-ROADMAP.md .planning/milestones/v1.9-REQUIREMENTS.md .planning/milestones/v1.9-MILESTONE-AUDIT.md` |
| **Full suite command** | `rtk proxy rg -n "historical snapshot|current active planning truth|lessons archive" .planning/MILESTONES.md .planning/RETROSPECTIVE.md .planning/milestones/README.md .planning/milestones/v1.9-ROADMAP.md .planning/milestones/v1.9-REQUIREMENTS.md .planning/milestones/v1.9-MILESTONE-AUDIT.md && rtk npm run docs:check && rtk proxy git diff --check` |
| **Estimated runtime** | ~10 seconds |

## Failure Rehearsal

1. 如果 `MILESTONES.md` 下方的 historical entries 被误读成 current truth  
2. 如果最新 archived docs 打开时没有 snapshot note  
3. 如果 retrospective 被误读成当前执行面  
