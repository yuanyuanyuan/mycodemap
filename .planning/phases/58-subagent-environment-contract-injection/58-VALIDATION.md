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
| 58-05-01 | 05 | 5 | SDC-05 | T-58-17 | Verification docs no longer accept `claude -p` / blocker-only evidence as phase closure truth | docs/rebaseline | `rtk rg -n "Claude required|Codex optional|retrieval call exists" .planning/phases/58-subagent-environment-contract-injection/58-HUMAN-UAT.md .planning/phases/58-subagent-environment-contract-injection/58-UAT.md .planning/phases/58-subagent-environment-contract-injection/58-VERIFICATION.md` | W0 | pending |
| 58-05-02 | 05 | 5 | SDC-05, VER-03 | T-58-18 | Preparation script stages real verification fixtures and evidence templates without pretending to run a subagent | subprocess/filesystem | `rtk npm run build && rtk node scripts/verify-subagent-env-contract.mjs` | W0 | pending |
| 58-05-03 | 05 | 5 | SDC-05 | T-58-19 | Claude manual session captures retrieval-before-work evidence; Codex records pass or explicit waiver | checkpoint/manual | `See 58-HUMAN-UAT.md and verify docs/generated/phase-58/subagent-evidence/*.json` | W0 | pending |
| 58-05-04 | 05 | 5 | SDC-05 | T-58-19 | Verification report and state reflect the checkpoint evidence exactly, without silent success | docs/rollup | `rtk rg -n "claude-subagent.json|claude-session.md|codex-subagent.json" .planning/phases/58-subagent-environment-contract-injection/58-VERIFICATION.md .planning/phases/58-subagent-environment-contract-injection/58-UAT.md .planning/STATE.md` | W0 | pending |

## Wave 0 Requirements

- [ ] Confirm Phase 57 status before code execution: if `.planning/phases/57-*/57-SUMMARY.md` is absent and `.planning/STATE.md` still says Phase 57 is `ready_to_plan`, stop and ask for dependency resolution.
- [ ] Read existing untracked `src/cli/env-contract/validator-injected.ts` and `src/cli/env-contract/__tests__/validator-injected.test.ts` if present; migrate useful validation constants rather than overwriting blindly.
- [ ] Confirm no `.mycodemap/prompt-snippets/` path is introduced.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code real subagent path | SDC-05 | Required closure gate; the interactive Agent path cannot be automated end-to-end | Use `.claude/agents/env-contract-verifier.md`, save the session transcript to `docs/generated/phase-58/subagent-evidence/claude-session.md`, and require `claude-subagent.json` to show retrieval evidence before work. |
| Codex real subagent path | SDC-05 | Optional parity path; absence is a waiver only if the exact blocker is captured | Use `.codex/agents/env-contract-verifier.toml` when available, or record the environment blocker/waiver in `docs/generated/phase-58/subagent-evidence/codex-subagent.json`. |

## Validation Sign-Off

- [ ] All tasks have `<verify>` blocks with automated commands or explicit manual evidence rules.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers dependency risk and existing untracked env-contract work.
- [ ] No watch-mode flags in validation commands.
- [ ] Feedback latency < 60s for quick checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
