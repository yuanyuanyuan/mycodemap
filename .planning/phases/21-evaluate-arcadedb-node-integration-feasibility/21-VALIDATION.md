---
phase: 21
slug: evaluate-arcadedb-node-integration-feasibility
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + Node 18 runtime |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` |
| **Full suite command** | `pnpm exec vitest run src/infrastructure/storage/__tests__/fallback-mechanism.test.ts && npm run docs:check:human` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/infrastructure/storage/__tests__/fallback-mechanism.test.ts`
- **After every plan wave:** Run `pnpm exec vitest run src/infrastructure/storage/__tests__/fallback-mechanism.test.ts && npm run docs:check:human`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | ARC-01 | static | `rg -n "Embedded \| JVM only|HTTP/JSON \| Client/server|Bolt \| Client/server|No Node embedded SDK assumption" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVIDENCE.md` | ✅ | ✅ green |
| 21-01-02 | 01 | 1 | ARC-03 | static | `rg -n "auto -> kuzudb|auto -> filesystem|uri|username|password|tls|serverLifecycle|Treat server-backed ArcadeDB as a product-surface change" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-BLAST-RADIUS.md` | ✅ | ✅ green |
| 21-01-03 | 01 | 1 | ARC-02 | smoke | `node --check scripts/experiments/arcadedb-http-smoke.mjs && node scripts/experiments/arcadedb-http-smoke.mjs --help` | ✅ | ✅ green |
| 21-02-01 | 02 | 2 | ARC-04 | static | `rg -n "## Preconditions|## Smoke Checks|## Benchmark Strategy|## Stop Conditions|handshake latency|query latency|setup complexity" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-VALIDATION-DESIGN.md` | ✅ | ✅ green |
| 21-02-02 | 02 | 2 | ARC-05 | static | `rg -n "Decision:|NO-GO for direct replacement|CONDITIONAL for isolated server-backed follow-up|## Decision Matrix|## Risks" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVALUATION-REPORT.md` | ✅ | ✅ green |
| 21-02-03 | 02 | 2 | ARC-05 | static | `rg -n "## If Accepted|## If Rejected|isolated server-backed prototype|storage.type = arcadedb" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-NEXT-STEPS.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure already covers storage fallback baseline and docs guardrail checks; Phase 21 只需要新增 phase artifact 文档与 `scripts/experiments/arcadedb-http-smoke.mjs`。

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `21-EVALUATION-REPORT.md` 是否真的把 `NO-GO` 视为有效主建议，而不是“为了看起来积极”回避拒绝 | ARC-05 | 自动化能校验固定字符串，但不能判断论证是否诚实 | 打开 `21-EVALUATION-REPORT.md`，确认主建议先否定 direct replacement，再说明 `CONDITIONAL` 只针对隔离 server-backed follow-up |
| `21-BLAST-RADIUS.md` 是否把现有 docs/runtime drift 作为 baseline，而不是只统计新增字段 | ARC-03 | 需要人工检查论证完整性 | 阅读 `## Existing Drift That Changes The Baseline`，确认它同时引用 runtime `auto -> kuzudb` 与 docs `auto -> filesystem` 的冲突 |
| HTTP smoke harness 的 `--help` 是否足以让 reviewer 明白 live smoke 所需前提 | ARC-02, ARC-04 | 自动化无法判断帮助文案是否可操作 | 运行 `node scripts/experiments/arcadedb-http-smoke.mjs --help`，确认 env vars、endpoint、auth 和“无服务时仅做离线校验”都说清楚 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved after `21-UAT.md` and automated verification closure on 2026-03-28
