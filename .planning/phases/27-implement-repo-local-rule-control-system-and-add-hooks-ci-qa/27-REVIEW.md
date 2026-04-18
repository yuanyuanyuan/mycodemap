---
phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa
status: warnings
severity_summary:
  critical: 0
  high: 0
  medium: 0
  warning: 4
reviewed_at: 2026-04-19
---

# Phase 27 Code Review

> Advisory only. No blocking / critical issue found.

## Findings

### Warning 1 — `rule-context` 路由覆盖仍然偏窄
- `scripts/rule-context.mjs` 只覆盖 `src/*`、`*.test.ts`、`docs/*`、`.githooks/*`、`.github/workflows/*`。
- 若后续希望把 `CLAUDE.md`、根级配置文件或其他非当前表中的路径纳入 soft gate，需要补充路由表，否则会回退到 `No scoped rules inferred`。

### Warning 2 — `capability-report.py` 对 hooks 可用性可能误判为通过
- `scripts/capability-report.py` 目前只要 `git config core.hooksPath` 返回非空就会判定 hooks 为 `PASS`。
- 若 `core.hooksPath` 配置了不存在的目录，这个检查可能给出假阳性。

### Warning 3 — 本地 docs guardrail 触发范围与文档引导不完全一致
- `.githooks/pre-commit` 只在一部分文档/入口文件变更时自动跑 `npm run docs:check`。
- 但 `CLAUDE.md` / 规则文档对“文档、入口、规则改动”给出的默认建议更宽，后续若想完全对齐，需要收敛一边。

### Warning 4 — worktree / `--no-verify` 说明与真实 hook 细节仍有缝隙
- workflow 文案强调并行 worktree executor 使用 `--no-verify`，总体方向正确。
- 但真实本地 hook、CI backstop、以及某些只在特定文件集触发的 docs guardrail 细节并不完全等价，后续说明文档应继续精确化。

## Summary

- Critical: 0
- High: 0
- Warning: 4

## Suggested Next Step

- 如需清理这些 advisory findings，可运行：`$gsd-code-review-fix 27`
