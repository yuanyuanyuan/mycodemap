---
phase: 18
slug: design-to-code-mapping
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts src/cli/commands/__tests__/design-map-command.test.ts` |
| **Full suite command** | `npm test && npm run docs:check:human` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts src/cli/commands/__tests__/design-map-command.test.ts`
- **After every plan wave:** Run `npm test && npm run docs:check:human`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | MAP-01 | static | `rg -n "DesignMappingResult|DesignMappingCandidate|DesignMappingDiagnostic" src/interface/types/design-mapping.ts src/interface/types/index.ts` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | MAP-01 | unit | `pnpm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 1 | MAP-01 | smoke | `node dist/cli/index.js design map tests/fixtures/design-contracts/mapping-basic.design.md --json` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02 | 2 | MAP-02 | unit | `pnpm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts` | ❌ W0 | ⬜ pending |
| 18-02-02 | 02 | 2 | MAP-02 | unit | `pnpm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts src/cli/commands/__tests__/design-map-command.test.ts` | ❌ W0 | ⬜ pending |
| 18-02-03 | 02 | 2 | MAP-02 | smoke | `node dist/cli/index.js design map tests/fixtures/design-contracts/mapping-basic.design.md --json | node -e "const fs=require('fs'); const o=JSON.parse(fs.readFileSync(0,'utf8')); if (!o.candidates?.every(c => Array.isArray(c.dependencies) && Array.isArray(c.testImpact) && c.confidence && Array.isArray(c.unknowns))) process.exit(1);"` | ❌ W0 | ⬜ pending |
| 18-03-01 | 03 | 3 | MAP-03 | unit | `pnpm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts src/cli/commands/__tests__/design-map-command.test.ts` | ❌ W0 | ⬜ pending |
| 18-03-02 | 03 | 3 | MAP-03 | smoke | `(node dist/cli/index.js design map tests/fixtures/design-contracts/no-match.design.md --json >/tmp/phase18-no-match.json 2>&1; test $? -ne 0 && rg -n '"code": "no-candidates"' /tmp/phase18-no-match.json) && (node dist/cli/index.js design map tests/fixtures/design-contracts/over-broad.design.md --json >/tmp/phase18-over-broad.json 2>&1; test $? -ne 0 && rg -n '"code": "over-broad-scope"' /tmp/phase18-over-broad.json) && (node dist/cli/index.js design map tests/fixtures/design-contracts/high-risk.design.md --json >/tmp/phase18-high-risk.json 2>&1; test $? -ne 0 && rg -n '"code": "high-risk-scope"' /tmp/phase18-high-risk.json)` | ❌ W0 | ⬜ pending |
| 18-03-03 | 03 | 3 | MAP-03 | docs | `npm run docs:check:human && pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| reason chain 足以支撑 human review | MAP-01, MAP-02 | 自动化只能验证字段存在，无法完全判断解释是否对 reviewer 足够清晰 | 运行 `node dist/cli/index.js design map tests/fixtures/design-contracts/mapping-basic.design.md --json`，确认每个 candidate 至少有 1 条 `reasons[]`，且 `section` / `matchedText` / `evidenceType` 组合能直接解释为何命中该 candidate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
