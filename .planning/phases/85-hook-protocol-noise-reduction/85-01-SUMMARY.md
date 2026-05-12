---
phase: 85-hook-protocol-noise-reduction
plan: 01
subsystem: hook-guardrails
tags: [hooks, ai-agent, protocol, noise-reduction, protocol-only]

requires:
  - phase: 84-ai-agent-hook-control-protocol
    provides: structured hook protocol baseline
provides:
  - protocol-only hook output mode for autonomous agents
  - explicit protocol log-path fallback
  - clearer hook status semantics and lower-noise report-only wording
affects: [hook-templates, managed-hooks, payload-tests, smoke-tests]

tech-stack:
  added: []
  patterns: [protocol-only stdout suppression, short recovery line, status taxonomy refinement]

key-files:
  created:
    - .planning/phases/85-hook-protocol-noise-reduction/85-CONTEXT.md
    - .planning/phases/85-hook-protocol-noise-reduction/85-01-PLAN.md
    - .planning/phases/85-hook-protocol-noise-reduction/85-01-SUMMARY.md
  modified:
    - scripts/hooks/templates/pre-commit
    - scripts/hooks/templates/commit-msg
    - scripts/smoke-commit-hooks.sh
    - scripts/tests/test_rule_control_workflow.py
    - src/cli/init/__tests__/hook-payloads.test.ts

key-decisions:
  - "Protocol-only mode should silence human logs globally rather than selectively filtering dozens of echo sites."
  - "A short log-path line is the safest truncation fallback when shell transports clip long output."
  - "`not_applicable` should represent genuine non-applicability; blocked downstream checks stay `skipped`."

requirements-completed: [HOOK-AI-04]

duration: 1 session
completed: 2026-05-12
---

# Phase 85: Hook Protocol Noise Reduction Summary

**CodeMap 的 installable hooks 现在既保留人类可读模式，也支持 `CODEMAP_PROTOCOL_ONLY=1` 的纯协议输出；同时 `checks[].status`、report-only 文案和 log-path 回退都更适合 autonomous agent。**

## Accomplishments

- `scripts/hooks/templates/pre-commit` 与 `scripts/hooks/templates/commit-msg` 现在都支持 `CODEMAP_PROTOCOL_ONLY=1`，通过全局 stdout/stderr suppression 只保留 `CODEMAP_PRECHECK_LOG_PATH` 和 `CODEMAP_PRECHECK_PROTOCOL`。
- 两个 hook 都会显式输出 `CODEMAP_PRECHECK_LOG_PATH:<relative-path>`，让 agent 在 protocol 行被截断时仍可读取完整 JSON。
- `pre-commit` 的 `report-only` rule validation 在 time limit reached 场景下不再输出 `timed out after ...`，改为完成态说明，并在协议细节中暴露 `result=limit-reached` 与 `non_blocking=true`。
- `checks[].status` 现在对“当前不适用”的路径使用 `not_applicable`，而被上游 blocker 截断的路径继续保持 `skipped`。
- payload test、workflow unittest、smoke commit 已补到 protocol-only 与 report-only limit-reached case。

## Verification

- `rtk sh -n scripts/hooks/templates/pre-commit`
- `rtk sh -n scripts/hooks/templates/commit-msg`
- `rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts`
- `rtk python3 -m unittest scripts/tests/test_rule_control_workflow.py`
- `rtk npm run hooks:smoke`

## Decisions Made

- 用 fd 级别的输出切换实现 protocol-only，比在每个 `echo` 上逐个加条件更稳，也更不容易漏掉测试/子命令输出。
- `CODEMAP_PRECHECK_LOG_PATH` 作为独立短行暴露，比只把路径塞进 JSON 更抗 shell transport 截断。
- `warn` + `details.result=limit-reached` 比 `timeout` 更符合 report-only 非阻断语义。

## Deviations from Plan

None.

## Issues Encountered

- 默认 mixed 模式下同一次 `git commit` 仍会出现 pre-commit 与 commit-msg 两条 protocol line；测试 harness 需要继续按 `hook_source` 取目标 payload。

## Next Phase Readiness

- `v2.7.1` milestone 可以 closeout；hook hardening 已具备 Phase 84 的结构化协议 baseline 和 Phase 85 的低噪音 refinement。
