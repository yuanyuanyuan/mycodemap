---
phase: 1000
slug: evaluate-arcadedb-as-alternative-to-k-zudb
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-25
---

# Phase 1000 — Validation Strategy

> Per-phase validation contract for ArcadeDB feasibility research and bounded experiment execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node 18+ runtime + existing Vitest |
| **Config file** | `package.json` |
| **Quick run command** | `node --check scripts/experiments/arcadedb-http-smoke.mjs` |
| **Full suite command** | `npm run typecheck && npm test -- src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` |
| **Estimated runtime** | ~20 seconds (without live ArcadeDB server) |

---

## Sampling Rate

- **After every task commit:** Run `node --check scripts/experiments/arcadedb-http-smoke.mjs`
- **After every plan wave:** Run `npm run typecheck && npm test -- src/infrastructure/storage/__tests__/fallback-mechanism.test.ts`
- **Before `$gsd-verify-work`:** Full suite must be green and evidence docs must exist
- **Max feedback latency:** 20 seconds for offline checks

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1000-01-01 | 01 | 1 | ARC-01 | doc | `grep -n "Embedded | JVM only" .planning/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb/1000-EVIDENCE.md` | ❌ W0 | ⬜ pending |
| 1000-01-02 | 01 | 1 | ARC-03 | doc | `grep -n "Blast Radius" .planning/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb/1000-ARCHITECTURE-IMPACT.md` | ❌ W0 | ⬜ pending |
| 1000-01-03 | 01 | 1 | ARC-02 | syntax | `node --check scripts/experiments/arcadedb-http-smoke.mjs` | ❌ W0 | ⬜ pending |
| 1000-02-01 | 02 | 2 | ARC-04 | doc | `grep -n "Benchmark Strategy" .planning/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb/1000-EVALUATION-REPORT.md` | ❌ W0 | ⬜ pending |
| 1000-02-02 | 02 | 2 | ARC-05 | doc | `grep -n "Decision:" .planning/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb/1000-EVALUATION-REPORT.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb/1000-EVIDENCE.md` — official support matrix
- [ ] `.planning/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb/1000-ARCHITECTURE-IMPACT.md` — blast radius analysis
- [ ] `scripts/experiments/arcadedb-http-smoke.mjs` — isolated HTTP smoke script
- [ ] `.planning/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb/1000-EVALUATION-REPORT.md` — final decision package

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTTP smoke against a live ArcadeDB server | ARC-02 / ARC-04 | 需要真实服务、凭证和可达性 | 启动 ArcadeDB server，设置 `ARCADEDB_HTTP_URL`、`ARCADEDB_DATABASE`、`ARCADEDB_USERNAME`、`ARCADEDB_PASSWORD`，运行 `node scripts/experiments/arcadedb-http-smoke.mjs` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing artifact references
- [x] No watch-mode flags
- [x] Feedback latency < 30s for offline checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
