---
status: complete
phase: 58-subagent-environment-contract-injection
source:
  - 58-05-PLAN.md
  - 58-VERIFICATION.md
started: 2026-05-02T16:30:00.000Z
updated: 2026-05-11T03:15:00Z
---

## Current Test

[testing complete]

## Checkpoint Result

本 checkpoint 需要的人工/真实会话证据已经齐备，Phase 58 不再停留在 `ready_for_checkpoint`。

## Documentation Review (2026-05-03)

Official docs confirmed that the historical single-command paths are not valid subagent evidence. The table below keeps only the facts needed for the rework.

**Sources:**
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/cli-reference
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/cli/reference

| Path | Historical assumption | Current truth | Status |
|------|-----------------------|---------------|--------|
| `claude -p` | Could stand in for Claude subagent verification | Print mode only; it does not exercise the Agent / SubagentStart path | superseded evidence path |
| `codex exec --agent` | Codex supports an explicit `--agent` flag | The flag does not exist | superseded evidence path |
| `additionalContext` | Forces Claude subagents to run the retrieval command | Text injection only; it is guidance, not proof | keep as guidance only |
| `developer_instructions` | Forces Codex subagents to run the retrieval command | Text injection only; it is guidance, not proof | keep as guidance only |

## Tests

### 1. Claude required path
expected: 使用真实 Claude subagent 路径，并证明在任何 substantive work 之前先执行 env-contract retrieval。
result: pass
evidence: `docs/generated/phase-58/subagent-evidence/claude-session.md` 显示首个实质动作是 `mycodemap env-contract --for explore --json`；`claude-subagent.json` 的 `verdict` 为 `pass`。

### 2. Codex optional parity path
expected: 若当前环境可运行真实 Codex parity 路径，则补齐 transcript 与 verdict。
result: pass
evidence: `docs/generated/phase-58/subagent-evidence/codex-session.md` 记录 `mycodemap env-contract --for worker --json` 先于任何 substantive work；`codex-subagent.json` 的 `verdict` 为 `pass`。

### 3. Verification manifest and fixture staging
expected: 手动验证所需的 manifest、session transcript、verdict JSON 都已齐备，closure gate 可关闭。
result: pass
evidence: `docs/generated/phase-58/subagent-evidence/verification-manifest.json` 与 4 个证据文件均存在，且 `58-VERIFICATION.md` 已将 SDC-05 标记为 satisfied。

## Protocol Summary

- `Claude required`
- `Codex optional`
- `retrieval call exists` before any substantive work is the only Claude pass rule.

### Required Evidence Files

- `docs/generated/phase-58/subagent-evidence/claude-session.md`
- `docs/generated/phase-58/subagent-evidence/claude-subagent.json`
- `docs/generated/phase-58/subagent-evidence/codex-session.md`
- `docs/generated/phase-58/subagent-evidence/codex-subagent.json`
- `docs/generated/phase-58/subagent-evidence/verification-manifest.json`

## Claude Required Procedure

1. Run `node scripts/verify-subagent-env-contract.mjs` from the repo root.
2. Open an authenticated Claude Code session in this repository.
3. Delegate to `env-contract-verifier` using `.claude/agents/env-contract-verifier.md`.
4. Save the relevant transcript to `docs/generated/phase-58/subagent-evidence/claude-session.md`.
5. Fill `docs/generated/phase-58/subagent-evidence/claude-subagent.json`:
   - `attempted`
   - `available`
   - `commandTranscriptPath`
   - `retrievalEvidence`
   - `verdict`
   - `blocker`
   - `notes`
6. Mark Claude as `pass` only if the transcript shows `mycodemap env-contract --for explore --json`, `node dist/cli/index.js env-contract --for explore --json`, or `codemap_env_contract(agentType="explore")` before any other substantive work.

## Codex Optional Procedure

1. Use `.codex/agents/env-contract-verifier.toml` only if a real Codex parity run is available in this environment.
2. Save the relevant transcript to `docs/generated/phase-58/subagent-evidence/codex-session.md`.
3. Fill `docs/generated/phase-58/subagent-evidence/codex-subagent.json`.
4. If Codex cannot be run, record the exact blocker and use `verdict: "waived"` or `verdict: "fail"` as appropriate.

## Verdict Semantics

| Verdict | Meaning |
|---------|---------|
| `pass` | Retrieval happened before any substantive work and the transcript proves it. |
| `fail` | The path ran, but retrieval was missing, too late, or contradicted by the transcript. |
| `waived` | Codex optional parity was not run and the exact blocker is recorded. |
| `blocked` | The required path could not be executed at all; Phase 58 stays open. |

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
