---
phase: 62
slug: context-routing-gate
status: completed
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
---

# Phase 62 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/context-tool.test.ts src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts` |
| **Failure-path command** | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/context-tool.test.ts -t "invalid|missing|stale|filter|minimal|standard"` |
| **Type gate** | `rtk tsc --noEmit` |
| **Estimated runtime** | Quick: ~30-90s; type gate: ~30-60s |

## Sampling Rate

- **After every task commit:** Run the task’s targeted Vitest command plus any required `rtk rg` proof.
- **After Wave 1 plan:** Run the quick MCP-focused test command and `rtk tsc --noEmit`.
- **After Wave 2 plan:** Run the quick command, the failure-path command, and `rtk tsc --noEmit`.
- **Before `$gsd-verify-work`:** All targeted Phase 62 MCP tests plus `rtk tsc --noEmit` must be green.
- **Max feedback latency:** 90s for focused checks; 2min for the full phase-targeted run.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 62-01-01 | 01 | 1 | CTX-01, CTX-02 | T-62-01-1 | Routing builder returns real graph stats, compact risk summary, and executable tool suggestions | unit | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/context-tool.test.ts && rtk tsc --noEmit` | W0 | passed |
| 62-01-02 | 01 | 1 | CTX-01, CTX-02 | T-62-01-2 | Native MCP transport exposes `codemap_context` and degraded-truth paths structurally | integration | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/context-tool.test.ts src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts && rtk tsc --noEmit` | W0 | passed |
| 62-02-01 | 02 | 2 | CTX-03, CTX-04 | T-62-02-1 | Detail levels and tool filtering preserve routing correctness | unit | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/context-tool.test.ts -t "minimal|standard|filter" && rtk tsc --noEmit` | W0 | passed |
| 62-02-02 | 02 | 2 | CTX-03, CTX-04 | T-62-02-2 | Compression, stale/missing graph truth, and docs/runtime truth are all verified | integration/docs | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/context-tool.test.ts src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts && rtk tsc --noEmit` | W0 | passed |

## Wave 0 Requirements

- [x] `62-RESEARCH.md` must exist before implementation starts.
- [x] Do not execute Phase 62 on a branch where Phase 61 direct execution has not landed; if selected-family MCP tools still rely on `cli_redirect`, finish or rebase onto Phase 61 first.
- [x] Do not accept any `codemap_context` implementation that invents a second execution engine or bypasses the native MCP tool pattern.
- [x] Do not accept any response that recommends a tool name not present in the real native + contract tool universe.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `minimal` feels materially lighter than `standard` for human inspection | CTX-03 | Automated length assertions alone can pass while payload quality regresses | Call `codemap_context` manually in both modes and confirm `minimal` preserves routing value without carrying `standard`-only rationale noise. |
| Docs describe the same public routing surface the code ships | CTX-03, CTX-04 | Wording drift can survive automated grep checks | Read `AI_GUIDE.md` and `ARCHITECTURE.md` after Wave 2 and confirm they mention only the shipped tasks, detail levels, and filtering behavior. |

## Validation Sign-Off

- [x] All tasks have automated commands that include targeted Vitest or an explicit manual rule.
- [x] At least one failure-path command is required before phase completion.
- [x] At least one end-to-end MCP transport check is required before phase completion.
- [x] `rtk tsc --noEmit` is part of the execution gate, not optional.
- [x] No watch-mode flags are used in validation commands.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** passed 2026-05-06
