---
phase: 36
slug: validation-trust-alignment
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-23
updated: 2026-04-23
---

# Phase 36 — Validation Strategy

| Property | Value |
|----------|-------|
| **Framework** | docs guardrails + docs-sync + grep consistency |
| **Quick run command** | `rtk npm run docs:check` |
| **Full suite command** | `rtk npm run docs:check && rtk node dist/cli/index.js ci check-docs-sync && rtk proxy git diff --check` |
| **Estimated runtime** | ~10 seconds |

## Per-Task Verification Map

| Task ID | Requirement | Automated Command | Status |
|---------|-------------|-------------------|--------|
| 36-01-01 | TRUST-01, TRUST-02 | `rtk proxy rg -n "文档/入口变更先跑 \`npm run docs:check\`。|统一 docs/AI guardrail 入口：\`node dist/cli/index.js ci check-docs-sync\`（产品命令等价于 \`mycodemap ci check-docs-sync\`）。|repo-local rules 预检：\`python3 scripts/validate-rules.py code --report-only\` 只报告，不阻断。|CI / PR 超窗、fallback 或 false-positive 漂移时，\`warn-only / fallback\` 不是 hard gate success。" README.md AI_GUIDE.md docs/rules/validation.md docs/rules/engineering-with-codex-openai.md` | ✅ green |
| 36-01-02 | TRUST-01, TRUST-02, TRUST-03 | `rtk proxy rg -n "validateValidationTruthDocs|requiredTruthSnippets" scripts/validate-docs.js` | ✅ green |
| 36-01-03 | TRUST-01, TRUST-02, TRUST-03 | `rtk npm run docs:check` | ✅ green |
| 36-01-04 | TRUST-01, TRUST-03 | `rtk node dist/cli/index.js ci check-docs-sync` | ✅ green |
| 36-01-05 | TRUST-01, TRUST-02, TRUST-03 | `rtk proxy git diff --check` | ✅ green |
| 36-01-06 | TRUST-01, TRUST-02, TRUST-03 | `rtk proxy rg -n "Phase 36|Complete on 2026-04-23|\\[x\\] \\*\\*TRUST-01|\\[x\\] \\*\\*TRUST-02|\\[x\\] \\*\\*TRUST-03|completed_phases: 2|percent: 67|current_phase: 37" .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/STATE.md` | ✅ green |

## Failure Rehearsal

1. 如果 README / AI_GUIDE 又只剩命令、不再说明 `docs:check` first pass  
2. 如果 `--report-only` 被重新写成会阻断提交  
3. 如果 `warn-only / fallback` 再次被描述成 hard gate success  
4. 如果四份 live docs 中任意一份删掉 quick-truth 句子  
