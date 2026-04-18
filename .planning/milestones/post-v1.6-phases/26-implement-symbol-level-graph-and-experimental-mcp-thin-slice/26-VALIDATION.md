---
phase: 26
slug: implement-symbol-level-graph-and-experimental-mcp-thin-slice
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-19
---

# Phase 26 — Validation Strategy

> Reconstructed after execution from phase plans, summaries, verification evidence, and real `dist` smoke verification.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk npm run test -- src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/FileSystemStorage.test.ts src/cli/__tests__/generate.test.ts src/cli/__tests__/removed-commands.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/mcp.test.ts src/cli/__tests__/index-help.test.ts` |
| **Full suite command** | `rtk npm run test -- src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/FileSystemStorage.test.ts src/cli/__tests__/generate.test.ts src/cli/__tests__/removed-commands.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/mcp.test.ts src/cli/__tests__/index-help.test.ts && rtk npm run typecheck && rtk npm run docs:check && rtk npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most-local focused `vitest` command for the touched slice.
- **After every plan wave:** Run `rtk npm run test -- src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/FileSystemStorage.test.ts src/cli/__tests__/generate.test.ts src/cli/__tests__/removed-commands.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/mcp.test.ts src/cli/__tests__/index-help.test.ts`.
- **Before milestone audit:** Run `rtk npm run typecheck && rtk npm run docs:check && rtk npm run build`.
- **Max feedback latency:** ~15 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| `26-01-01` | 01 | 1 | `P26-NOW-SYMBOL-GENERATE` | — | `generate --symbol-level` must be explicit opt-in and preserve default module-level surface | unit | `rtk npm run test -- src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/cli/__tests__/config-loader.test.ts src/cli/__tests__/generate.test.ts` | ✅ | ✅ green |
| `26-01-02` | 01 | 1 | `P26-NOW-SQLITE-PATH` | — | symbol-level data must persist through SQLite / storage read model rather than staying in parser memory | unit | `rtk npm run test -- src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/cli/__tests__/config-loader.test.ts src/cli/__tests__/generate.test.ts` | ✅ | ✅ green |
| `26-02-01` | 02 | 2 | `P26-NOW-PARTIAL-GRAPH-TRUTH` | — | partial graph truth must stay explicit through analyzer, generate output, and storage readback | unit | `rtk npm run test -- src/core/__tests__/analyzer.test.ts src/cli/__tests__/generate.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | ✅ | ✅ green |
| `26-03-01` | 03 | 3 | `P26-NOW-MCP-STDIO` | — | `mcp start` must keep stdio protocol pure and avoid stdout pollution from human startup logs | unit + smoke | `rtk npm run test -- src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/mcp.test.ts src/cli/__tests__/index-help.test.ts && rtk node dist/cli/index.js mcp install && rtk node /tmp/codemap-mcp-smoke.mjs` | ✅ | ✅ green |
| `26-03-02` | 03 | 3 | `P26-NOW-SYMBOL-IMPACT` | — | `codemap_query` / `codemap_impact` must return structured symbol definition / callers / callees / impact truth with explicit error semantics | unit + smoke | `rtk npm run test -- src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/FileSystemStorage.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/mcp.test.ts && rtk node /tmp/codemap-mcp-smoke.mjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Audit Basis

- Plans: `26-01-PLAN.md`, `26-02-PLAN.md`, `26-03-PLAN.md`
- Execution evidence: `26-01-SUMMARY.md`, `26-02-SUMMARY.md`, `26-03-SUMMARY.md`
- Phase verification: `26-VERIFICATION.md`
- Real runtime evidence:
  - `rtk node dist/cli/index.js generate --symbol-level -m smart`
  - `rtk node dist/cli/index.js mcp install`
  - `rtk node /tmp/codemap-mcp-smoke.mjs`

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-19
