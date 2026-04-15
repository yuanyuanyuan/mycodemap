---
phase: 22
slug: real-arcadedb-server-live-smoke-gate
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-30
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node 18 runtime + shell verification |
| **Config file** | `none — experiment seam and planning artifacts only` |
| **Quick run command** | `node --check scripts/experiments/arcadedb-http-smoke.mjs && node scripts/experiments/arcadedb-http-smoke.mjs --help` |
| **Full suite command** | `node --check scripts/experiments/arcadedb-http-smoke.mjs && node scripts/experiments/arcadedb-http-smoke.mjs --help && rg -n "Gate outcome: (pass|blocked|fail)" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-GATE-RESULT.md` |
| **Estimated runtime** | ~30 seconds without live server |

---

## Sampling Rate

- **After every task commit:** Run `node --check scripts/experiments/arcadedb-http-smoke.mjs && node scripts/experiments/arcadedb-http-smoke.mjs --help`
- **After every plan wave:** Run the plan-specific `rg` checks plus the quick run command
- **Before `$gsd-verify-work`:** Full suite must be green, and live-smoke artifacts must record either `pass` or `blocked/fail`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | PROTO-01 | static | `rg -n "ARCADEDB_HTTP_URL|ARCADEDB_DATABASE|ARCADEDB_USERNAME|ARCADEDB_PASSWORD|Authorization: Basic|No shipped runtime/config changes" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-LIVE-SMOKE-RUNBOOK.md` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | PROTO-01 | static | `rg -n "Gate outcome: pass|Gate outcome: blocked|Gate outcome: fail|TLS preconditions|public-surface change required" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-GATE-CHECKLIST.md` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 2 | PROTO-01 | smoke | `node --check scripts/experiments/arcadedb-http-smoke.mjs && node scripts/experiments/arcadedb-http-smoke.mjs --help && rg -n "Live smoke command|Observed outcome|Sanitized endpoint|Auth mode|TLS mode|Failure reason" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-LIVE-SMOKE-EVIDENCE.md` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 2 | PROTO-01 | static | `rg -n "Gate outcome: (pass|blocked|fail)|Next action|Phase 23 unlocked|Phase 23 blocked" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-GATE-RESULT.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing experiment seam already exists in `scripts/experiments/arcadedb-http-smoke.mjs`; `Phase 22` only needs new phase artifacts to turn it into an auditable gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `22-LIVE-SMOKE-EVIDENCE.md` 是否在脱敏前提下足够说明真实运行条件 | PROTO-01 | 自动化能校验字段存在，不能判断记录是否诚实、是否泄露敏感信息 | 打开 evidence 文档，确认 endpoint 已脱敏、未出现密码/token、但 auth/TLS/server 条件仍可审计 |
| `22-GATE-RESULT.md` 是否把 `blocked` / `fail` 当成合法结果，而不是回避 | PROTO-01 | 自动化只能找字符串，不能判断 gate 逻辑是否诚实 | 阅读结果文档，确认若缺环境或需 public-surface change，则不会写成 `pass` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved for planning on 2026-03-30
