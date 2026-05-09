---
phase: 66
slug: community-detection-baseline
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts`, `vitest.e2e.config.ts` |
| **Quick run command** | `npx vitest run src/infrastructure/storage/__tests__/community-helpers.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts` |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/infrastructure/storage/__tests__/community-helpers.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
- **After every plan wave:** Run `npx vitest run tests/e2e/graph-community-detection.test.ts --config vitest.e2e.config.ts`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 66-01-01 | 01 | 1 | COMM-01 | T-66-01 | Weighted module projection yields interpretable communities and downgrades low-signal confidence instead of overclaiming | unit | `npx vitest run src/infrastructure/storage/__tests__/community-helpers.test.ts` | task bootstrap | ✅ green |
| 66-01-02 | 01 | 1 | COMM-02 | T-66-02 | MCP tool returns structured community envelope with status/confidence/warnings and clamps inputs | integration | `npx vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | existing file extension | ✅ green |
| 66-01-03 | 01 | 1 | COMM-01, COMM-02 | T-66-01 / T-66-02 | Real SQLite + real MCP transport prove happy path and sparse/degraded path | e2e | `npx vitest run tests/e2e/graph-community-detection.test.ts --config vitest.e2e.config.ts` | task bootstrap | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Bootstrap Policy

- 不使用 standalone Wave 0；缺失测试文件由对应实现任务在同一 plan 内先写后补。
- Task `66-01-01` 负责创建 `src/infrastructure/storage/__tests__/community-helpers.test.ts` 并锁定权重折叠、module projection、warning heuristics。
- Task `66-01-02` 负责在现有 `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` 内新增 `codemap_communities` happy/degraded cases。
- Task `66-01-03` 负责创建 `tests/e2e/graph-community-detection.test.ts`，并复用 Phase 65 的真实 SQLite + MCP transport 验证结构。

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Community labels remain human-readable on a real repo graph | COMM-01 | Final readability judgment is subjective even when shape metrics pass | Run the MCP tool against the repo graph, inspect top community labels and summaries, and confirm they reveal module boundaries instead of opaque IDs only |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify with in-task bootstrap where files do not yet exist
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No standalone Wave 0 prerequisites remain
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
