---
phase: 61
slug: mcp-direct-execution
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-06
---

# Phase 61 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk npx vitest run src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/query-output.test.ts src/cli/commands/__tests__/deps-output.test.ts` |
| **Failure-path command** | `rtk npx vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts -t "GRAPH_NOT_FOUND|SYMBOL_NOT_FOUND|AMBIGUOUS"` |
| **Type gate** | `rtk tsc --noEmit` |
| **Estimated runtime** | Quick: ~30-90s; type gate: ~30-60s |

## Sampling Rate

- **After every task commit:** Run the task's targeted Vitest command plus any required `rtk rg` proof.
- **After every Wave 1 plan:** Run `rtk tsc --noEmit` and the MCP-focused test command.
- **After Wave 2 plan:** Run both CLI and MCP targeted Vitest commands plus `rtk tsc --noEmit`.
- **Before `$gsd-verify-work`:** `rtk tsc --noEmit` and all targeted Phase 61 Vitest commands must be green.
- **Max feedback latency:** 90s for quick checks; 2min for the combined phase-targeted run.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 61-01-01 | 01 | 1 | MCP-02 | T-61-01-1 | Shared executor/service seam exists outside wrappers and MCP registration | unit/integration | `rtk npx vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/server/mcp/__tests__/dynamic-server.test.ts && rtk tsc --noEmit` | W0 | pending |
| 61-01-02 | 01 | 1 | MCP-02, MCP-04 | T-61-01-2 | CLI wrappers invoke shared seam without reclaiming business logic | unit | `rtk npx vitest run src/cli/commands/__tests__/query-output.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/analyze-command.test.ts && rtk tsc --noEmit` | W0 | pending |
| 61-02-01 | 02 | 2 | MCP-01, MCP-03 | T-61-02-1 | MCP selected family returns real structured results instead of `cli_redirect` | integration | `rtk npx vitest run src/server/mcp/__tests__/schema-adapter.test.ts src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts && rtk tsc --noEmit` | W0 | pending |
| 61-02-02 | 02 | 2 | MCP-01, MCP-03 | T-61-02-2 | Success and failure paths are both structurally verified through MCP transport | integration/failure | `rtk npx vitest run src/server/mcp/__tests__/dynamic-server.test.ts -t "structured" && rtk npx vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts -t "GRAPH_NOT_FOUND|SYMBOL_NOT_FOUND|AMBIGUOUS"` | W0 | pending |
| 61-03-01 | 03 | 3 | MCP-02, MCP-04 | T-61-03-1 | `query`/`deps` are thin wrappers and `analyze` is materially thinner | unit | `rtk npx vitest run src/cli/commands/__tests__/query-output.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/analyze-command.test.ts && rtk tsc --noEmit` | W0 | pending |
| 61-03-02 | 03 | 3 | MCP-03, MCP-04 | T-61-03-2 | CLI + MCP failure-path evidence and docs truth stay aligned | integration/docs | `rtk npx vitest run src/cli/commands/__tests__/query-output.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/analyze-command.test.ts && rtk npx vitest run src/server/mcp/__tests__/dynamic-server.test.ts -t "error|not found|ambiguous|structured" && rtk tsc --noEmit` | W0 | pending |

## Wave 0 Requirements

- [ ] `61-RESEARCH.md` and `61-PATTERNS.md` must exist before implementation starts.
- [ ] Phase 60 must remain the last completed phase in `.planning/STATE.md`; if execution begins from an older branch state, stop and reconcile first.
- [ ] Do not accept any selected-family implementation that still treats `cli_redirect` as the success contract.
- [ ] Do not accept MCP handlers that directly call CLI wrappers with `process.stdout` / `process.exitCode` side effects.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Human-readable CLI output remains understandable after wrapper thinning | MCP-04 | Renderer quality is partly subjective and TTY-dependent | Run the affected commands in a real terminal with `--human` and verify the output remains legible and phase-appropriate. |
| Docs describe the same direct-execution boundary the code ships | MCP-02, MCP-03, MCP-04 | Drift can hide in phrasing even when automated `rg` checks pass | Read `ARCHITECTURE.md` and `docs/ai-guide/OUTPUT.md` after Wave 2 and confirm they mention shared executor + thin wrapper + direct MCP execution for the selected family. |

## Validation Sign-Off

- [ ] All tasks have automated commands that include targeted Vitest or an explicit manual rule.
- [ ] At least one MCP failure-path command is required before phase completion.
- [ ] At least one CLI-focused verification command is required before phase completion.
- [ ] `rtk tsc --noEmit` is part of the execution gate, not an optional extra.
- [ ] No watch-mode flags are used in validation commands.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
