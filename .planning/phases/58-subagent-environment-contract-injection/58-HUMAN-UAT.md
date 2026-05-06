---
status: ready_for_checkpoint
phase: 58-subagent-environment-contract-injection
source:
  - 58-05-PLAN.md
  - 58-VERIFICATION.md
started: 2026-05-02T16:30:00.000Z
updated: 2026-05-05T00:00:00.000Z
---

## Current Test

[checkpoint blocked - run the manual Claude path below after `node scripts/verify-subagent-env-contract.mjs` refreshes the fixtures]

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

## Notes

- `additionalContext` and `developer_instructions` remain guidance only. They help, but they do not replace transcript evidence.
- Blocker-only JSON files are not proof of success. They only explain why the checkpoint is still open.
