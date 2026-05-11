---
phase: 84-ai-agent-hook-control-protocol
plan: 01
subsystem: hook-guardrails
tags: [hooks, ai-agent, protocol, pre-commit, commit-msg]

requires:
  - phase: 58-subagent-environment-contract-injection
    provides: retrieval-led env-contract baseline
  - phase: 74-env-contract-reminder-hook
    provides: repo-owned hook reminder baseline
provides:
  - fail-fast pre-commit control protocol for AI agents
  - commit-msg protocol parity with rewrite routing
  - installable hook template truth with parity-safe coverage
affects: [hook-templates, managed-hooks, payload-tests, smoke-tests, planning]

tech-stack:
  added: []
  patterns: [structured hook protocol, attempt context, machine-readable resolution, framework-agnostic verify guidance]

key-files:
  created:
    - .planning/phases/84-ai-agent-hook-control-protocol/84-CONTEXT.md
    - .planning/phases/84-ai-agent-hook-control-protocol/84-RESEARCH.md
    - .planning/phases/84-ai-agent-hook-control-protocol/84-01-PLAN.md
    - .planning/phases/84-ai-agent-hook-control-protocol/84-01-SUMMARY.md
  modified:
    - scripts/hooks/templates/pre-commit
    - scripts/hooks/templates/commit-msg
    - scripts/smoke-commit-hooks.sh
    - scripts/tests/test_rule_control_workflow.py
    - src/cli/init/__tests__/hook-payloads.test.ts

key-decisions:
  - "Hook truth stays in installable templates first; managed copies are parity targets, not the primary fix surface."
  - "Cheap blockers must fail fast before heavy tests or repo-local validation."
  - "Related test remediation must stay framework-aware instead of hard-coding a single test runner."

requirements-completed: [HOOK-AI-01, HOOK-AI-02, HOOK-AI-03]

duration: 1 session
completed: 2026-05-12
---

# Phase 84: AI Agent Hook Control Protocol Summary

**CodeMap 的 git commit hooks 现在会把 blocker 结果输出为 agent-friendly 控制协议，而不是只给人类语言提示；`pre-commit` 与 `commit-msg` 已经都能直接告诉 AI 下一步该做什么。**

## Accomplishments

- `scripts/hooks/templates/pre-commit` 现在会优先处理 staged file count 这类 O(1) blocker，并输出 `codemap.precommit.v1`，其中包含 `checks[]`、`block.rule`、`resolution`、`attempt_id`、`CODEMAP_AGENT_CONTEXT` 与 `next_action`。
- `scripts/hooks/templates/pre-commit` 的 related-tests remediation 已升级为结构化 `verify_commands` / rule metadata / doc refs；失败路径不再退化成 `details.raw` blob。
- `scripts/hooks/templates/commit-msg` 现在具备 `codemap.commitmsg.v1` parity，`commit-format` 与 `commit-scope-message` 都会明确给出 `rewrite_commit_message` 路由。
- hook 协议真相源保持在 installable templates；`src/cli/init/__tests__/hook-payloads.test.ts`、`scripts/tests/test_rule_control_workflow.py` 和 `scripts/smoke-commit-hooks.sh` 共同锁定了 template 与 managed hook copy 的一致性。
- 这次 hardening 被登记为 `between-milestones` 的 special `Phase 84`，不误报为 `v3.0` 或其它新 milestone 已开启。

## Verification

- `rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts`
- `rtk python3 -m unittest scripts/tests/test_rule_control_workflow.py`
- `rtk npm run hooks:smoke`
- `rtk proxy npx vitest run src/cli/commands/__tests__/init-hooks.test.ts src/cli/env-contract/__tests__/discovery.test.ts`

## Decisions Made

- 统一用 `CODEMAP_PRECHECK_PROTOCOL` 承载 blocker/pass contract，而不是再引入额外 side channel。
- 让 `commit-msg` 跟 `pre-commit` 对齐，避免 agent 在第二个 hook 上回到自然语言猜测模式。
- 保持测试命令发现为 generic strategy；当前仓库验证虽然跑 `vitest`，但模板 contract 继续覆盖多技术栈 fallback。

## Deviations from Plan

None.

## Issues Encountered

- 早期 payload 里 `checks[].details` 退化成 `{raw: "..."}`，会让 agent 重新做文本解析；最终通过 base64+宽容 JSON decode 恢复为结构化对象。
- 真实 commit 流会依次输出 pre-commit 与 commit-msg 两条 protocol line，smoke/test harness 需要改成“取最后一个匹配 hook_source 的 payload”。

## Next Phase Readiness

- 当前 special follow-up 已完成。
- 主线 planning 仍停留在 `between-milestones`；下一步依然是定义新 milestone，而不是继续扩写 Phase 84。
