---
phase: 80
slug: mcp-stdio-blank-line-filtering
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
---

# Phase 80 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/stdio-transport.test.ts` |
| **Full suite command** | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/stdio-transport.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/env-contract-tool.test.ts src/cli/commands/__tests__/mcp.test.ts && rtk npx tsc --noEmit` |
| **Estimated runtime** | Quick: ~5s; full: ~10-15s |

## Sampling Rate

- **After every task commit:** Run the smallest task-local verify command from `80-01-PLAN.md`; default smoke is the stdio transport test.
- **After every plan wave:** Run the full MCP transport/registration suite plus typecheck.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 15 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 80-01-01 | 01 | 1 | POL-02 | — | blank lines are dropped before protocol parsing, while malformed non-blank payloads emit explicit JSON-RPC parse-error frames | unit + transport | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/stdio-transport.test.ts` | ✅ new phase seam | ✅ green |
| 80-01-02 | 01 | 1 | POL-02 | — | moving `startCodeMapMcpServer` onto the repository-owned transport does not break native MCP tool discovery or shared query/impact behavior | integration | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | ✅ extend existing | ✅ green |
| 80-01-03 | 01 | 1 | POL-02 | — | contract-tool registration, env-contract native tool behavior, and CLI `mcp` surface keep working after transport ownership moves into the repo seam | integration + command | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/env-contract-tool.test.ts src/cli/commands/__tests__/mcp.test.ts && rtk npx tsc --noEmit` | ✅ extend existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

All phase behaviors have automated verification.

## Validation Audit 2026-05-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Audit evidence:
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/stdio-transport.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/env-contract-tool.test.ts src/cli/commands/__tests__/mcp.test.ts && rtk npx tsc --noEmit`

Notes:
- The repeated `codemap_env_contract` rename/skip warnings are pre-existing contract/native name-collision diagnostics already called out in `80-01-SUMMARY.md`; they did not cause test failures and are not validation gaps for `POL-02`.

## Validation Sign-Off

- [x] All tasks have `<automated>` verify coverage.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 coverage exists inside existing test seams; no extra harness is required.
- [x] No watch-mode flags in validation commands.
- [x] Feedback latency < 15s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** verified 2026-05-11
