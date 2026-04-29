---
phase: 35
slug: governance-drift-guardrails
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-23
updated: 2026-04-23
---

# Phase 35 — Validation Strategy

> Focused validation contract for extending entry-doc governance drift detection without creating a new validation surface.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | docs guardrails + CLI docs-sync checks |
| **Config file** | `package.json` |
| **Quick run command** | `rtk npm run docs:check` |
| **Full suite command** | `rtk npm run docs:check && rtk node dist/cli/index.js ci check-docs-sync && rtk proxy git diff --check` |
| **Estimated runtime** | ~10 seconds |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | GOV-01, GOV-02 | static guardrail source | `rtk proxy rg -n "\\[entry-doc duplicate-policy\\]|\\[entry-doc ghost-command\\]|\\[entry-doc ghost-route\\]|\\[entry-doc authority-routing\\]" scripts/validate-docs.js` | ✅ | ✅ green |
| 35-01-02 | 01 | 1 | GOV-01, GOV-02, GOV-03 | docs guardrail | `rtk npm run docs:check` | ✅ | ✅ green |
| 35-01-03 | 01 | 1 | GOV-03 | docs sync | `rtk node dist/cli/index.js ci check-docs-sync` | ✅ | ✅ green |
| 35-01-04 | 01 | 1 | GOV-01, GOV-02, GOV-03 | diff hygiene | `rtk proxy git diff --check` | ✅ | ✅ green |
| 35-01-05 | 01 | 1 | GOV-01, GOV-02, GOV-03 | planning truth | `rtk proxy rg -n "Phase 35|Complete on 2026-04-23|\\[x\\] \\*\\*GOV-01|\\[x\\] \\*\\*GOV-02|\\[x\\] \\*\\*GOV-03|completed_phases: 1|percent: 33" .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/STATE.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Failure Rehearsal

1. **如果有人把治理正文漂回 `CLAUDE.md` / `.claude/CLAUDE.md`**
   - Detection: `[entry-doc duplicate-policy]` 失败

2. **如果有人把 `npm run ...` / `node dist/cli/index.js ...` 等命令重新塞回入口文档**
   - Detection: `[entry-doc ghost-command]` 失败

3. **如果 router / adapter / rules index 指向的 live docs 被移动或删除**
   - Detection: `[entry-doc ghost-route]` 失败

4. **如果 entry-doc baseline 不再把读者路由回 `AGENTS.md` / root `CLAUDE.md` / rules index**
   - Detection: `[entry-doc authority-routing]` 失败

---

## Validation Sign-Off

- [x] All tasks have automated verification
- [x] No new validation entrypoint introduced
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true`
