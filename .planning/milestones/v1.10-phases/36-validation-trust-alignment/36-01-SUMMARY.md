---
phase: 36-validation-trust-alignment
plan: 01
subsystem: validation-governance
tags: [validation, docs, trust, guardrail]

requires:
  - .planning/phases/35-governance-drift-guardrails/35-VERIFICATION.md
provides:
  - unified validation quick truth across README / AI guide / rules / engineering docs
  - docs guardrail enforcement for validation truth drift
  - completed `TRUST-01~03`
affects:
  - README.md
  - AI_GUIDE.md
  - docs/rules/validation.md
  - docs/rules/engineering-with-codex-openai.md
  - scripts/validate-docs.js
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
  - .planning/STATE.md
  - .planning/PROJECT.md

requirements-completed:
  - TRUST-01
  - TRUST-02
  - TRUST-03

duration: session
completed: 2026-04-23
---

# Phase 36 Plan 01 Summary

**Phase 36 已完成：validation truth 现在在四份 live docs 中读起来是同一套事实，而且 guardrail 会锁住它。**

## Accomplishments

- 给 README、AI_GUIDE、validation rule、engineering rule 加上同一组 validation quick truth。
- 让 `scripts/validate-docs.js` 要求这四份文档始终保持这组 truth 一致。
- 明确固定了 `docs:check` first pass、`check-docs-sync` 统一入口、`report-only` 非阻断、`warn-only / fallback` 非 hard-gate-success 这四件事。

## Next Phase Readiness

- `Phase 37` 现在可以专注 archive/live 身份治理，不再需要顺手兜 validation truth drift。
