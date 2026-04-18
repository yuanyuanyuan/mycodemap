---
phase: 19
slug: handoff-package-human-gates
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run src/cli/__tests__/design-handoff-builder.test.ts src/cli/commands/__tests__/design-handoff-command.test.ts` |
| **Full suite command** | `npm test && npm run docs:check:human` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/cli/__tests__/design-handoff-builder.test.ts src/cli/commands/__tests__/design-handoff-command.test.ts`
- **After every plan wave:** Run `npm test && npm run docs:check:human`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | HOF-01 | static | `rg -n "DesignHandoffResult|DesignHandoffPayload|DesignHandoffApproval|DesignHandoffOpenQuestion" src/interface/types/design-handoff.ts src/interface/types/index.ts` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | HOF-01, HOF-02 | unit | `pnpm exec vitest run src/cli/__tests__/design-handoff-builder.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-03 | 01 | 1 | HOF-01, HOF-02 | smoke | `node dist/cli/index.js design handoff tests/fixtures/design-contracts/handoff-basic.design.md --json | node -e "const fs=require('fs'); const o=JSON.parse(fs.readFileSync(0,'utf8')); if (!o.artifacts || !o.summary) process.exit(1);"` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 2 | HOF-02, HOF-03 | unit | `pnpm exec vitest run src/cli/__tests__/design-handoff-builder.test.ts` | ❌ W0 | ⬜ pending |
| 19-02-02 | 02 | 2 | HOF-03 | smoke | `node dist/cli/index.js design handoff tests/fixtures/design-contracts/handoff-pending-review.design.md --json | node -e "const fs=require('fs'); const o=JSON.parse(fs.readFileSync(0,'utf8')); if (o.readyForExecution !== false || !Array.isArray(o.handoff?.openQuestions)) process.exit(1);"` | ❌ W0 | ⬜ pending |
| 19-02-03 | 02 | 2 | HOF-03 | failure | `(node dist/cli/index.js design handoff tests/fixtures/design-contracts/no-match.design.md --json >/tmp/phase19-no-match.json 2>&1; test $? -ne 0 && rg -n '"code": "blocked-mapping"|"code": "no-candidates"' /tmp/phase19-no-match.json)` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 3 | HOF-04 | unit | `pnpm exec vitest run src/cli/commands/__tests__/design-handoff-command.test.ts` | ❌ W0 | ⬜ pending |
| 19-03-02 | 03 | 3 | HOF-01, HOF-04 | docs | `npm run docs:check:human && pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts` | ✅ | ⬜ pending |
| 19-03-03 | 03 | 3 | HOF-04 | smoke | `node dist/cli/index.js design handoff tests/fixtures/design-contracts/handoff-basic.design.md --json` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| markdown handoff 足够支持 human review | HOF-01 | 自动化只能验证 heading / 字段存在，无法完全判断 reviewer 是否能快速理解 scope、risks、validation checklist 与 why-not-ready | 运行 `node dist/cli/index.js design handoff tests/fixtures/design-contracts/handoff-basic.design.md --output /tmp/phase19-handoff`，打开生成的 `.handoff.md`，确认至少能直接定位 `Goal`、`Scope`、`Non-Goals`、`Risks`、`Validation Checklist`、`Assumptions`、`Open Questions`、`Approval Gates` |
| gate state 不会把 unresolved items 伪装成 ready | HOF-03 | 自动化可以检查布尔值，但 reviewer 仍需判断 why-not-ready 文案是否可操作 | 运行 `node dist/cli/index.js design handoff tests/fixtures/design-contracts/handoff-pending-review.design.md --json`，确认 `readyForExecution=false` 且 `approvals/assumptions/openQuestions` 的来源可追溯 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
