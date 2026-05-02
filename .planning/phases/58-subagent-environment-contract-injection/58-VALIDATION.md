---
phase: 58
slug: subagent-environment-contract-injection
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-02
---

# Phase 58 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts`, `vitest.e2e.config.ts` |
| **Quick run command** | `npx vitest run src/cli/env-contract src/cli/init src/cli/doctor src/server/mcp src/cli/interface-contract` |
| **Full suite command** | `npx vitest run` |
| **Built CLI command** | `npm run build && node dist/cli/index.js env-contract --for worker --json` |
| **Estimated runtime** | Quick: ~30-60s; full: ~2-4min |

## Sampling Rate

- **After every task commit:** Run the plan-specific Vitest command listed below.
- **After every plan wave:** Run `npm run build` plus the wave's integration command.
- **Before `$gsd-verify-work`:** `npm run typecheck`, `npm run lint`, `npx vitest run`, and `npm run build` must be green.
- **Max feedback latency:** 60s for quick checks; 5min for full checks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 58-01-01 | 01 | 0 | SDC-01 | T-58-01 | Stops if Phase 57 dependency is not actually complete | preflight | `test -f .planning/phases/57-*/57-SUMMARY.md || true` | N/A | pending |
| 58-01-02 | 01 | 1 | SDC-01, SDC-02 | T-58-02 | Schema rejects malformed contract items | unit | `npx vitest run src/cli/env-contract` | W0 | pending |
| 58-01-03 | 01 | 1 | SDC-02, SDC-04 | T-58-03 | Discovery reads real source files and records source hashes | unit/integration | `npx vitest run src/cli/env-contract src/cli/init` | W0 | pending |
| 58-02-01 | 02 | 2 | SDC-01, SDC-03, VER-03 | T-58-04 | CLI returns filtered JSON and check exits non-zero on failure | subprocess | `npm run build && node dist/cli/index.js env-contract --for worker --json` | W0 | pending |
| 58-02-02 | 02 | 2 | SDC-03, SDC-05 | T-58-05 | MCP exposes `codemap_env_contract` with actual contract payload | integration | `npx vitest run src/server/mcp src/cli/interface-contract` | W0 | pending |
| 58-03-01 | 03 | 3 | ABT-01, ABT-02, ABT-03 | T-58-06 | Assistant assets tell agents to retrieve, not read stale snippets | unit/integration | `npx vitest run src/cli/init` | W0 | pending |
| 58-03-02 | 03 | 3 | SDC-04 | T-58-07 | Doctor reports stale/missing critical contract and warn-only conflicts | unit/integration | `npx vitest run src/cli/doctor src/cli/env-contract` | W0 | pending |
| 58-04-01 | 04 | 4 | VER-03, SDC-05 | T-58-08 | Built CLI works in temp repo and records success/failure evidence | subprocess/e2e | `npm run build && npx vitest run tests/e2e` | W0 | pending |
| 58-04-02 | 04 | 4 | SDC-05 | T-58-09 | Claude/Codex attempts are real or explicitly blocked with evidence | manual/automated harness | `node scripts/verify-subagent-env-contract.mjs` | W0 | pending |

## Wave 0 Requirements

- [ ] Confirm Phase 57 status before code execution: if `.planning/phases/57-*/57-SUMMARY.md` is absent and `.planning/STATE.md` still says Phase 57 is `ready_to_plan`, stop and ask for dependency resolution.
- [ ] Read existing untracked `src/cli/env-contract/validator-injected.ts` and `src/cli/env-contract/__tests__/validator-injected.test.ts` if present; migrate useful validation constants rather than overwriting blindly.
- [ ] Confirm no `.mycodemap/prompt-snippets/` path is introduced.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code real subagent path | SDC-05 | Requires installed/authenticated `claude` CLI and platform runtime | Run the generated harness in an isolated temp repo and verify transcript shows `mycodemap env-contract --for <type> --json` or MCP retrieval before task work. |
| Codex real subagent path | SDC-05 | Requires installed/authenticated `codex` CLI and platform runtime | Run the generated harness in an isolated temp repo and verify transcript shows `codemap_env_contract` or `mycodemap env-contract` retrieval before task work. |

## Validation Sign-Off

- [ ] All tasks have `<verify>` blocks with automated commands or explicit manual evidence rules.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers dependency risk and existing untracked env-contract work.
- [ ] No watch-mode flags in validation commands.
- [ ] Feedback latency < 60s for quick checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
