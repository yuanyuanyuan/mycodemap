# Phase 20: Design Drift Verification & Docs Sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `20-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 20-design-drift-verification-docs-sync
**Areas discussed:** Verification surface, Drift truth model, Docs & CI guardrail closure, Failure rehearsal & E2E evidence
**Mode note:** 本轮运行处于 execute/default 回退路径，未使用交互式菜单；以下选择为基于 roadmap、prior context、现有 docs guardrail 与 codebase scout 的 auto-default 决策。

---

## Verification surface

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated `design verify` under existing design seam | 延续 `design validate → design map → design handoff` 的 purpose-built sidecar 路线，把实现后 verification 挂在同一入口，不改 `analyze` / `workflow` / `ci` contract | ✓ |
| Extend `design handoff` to also do verification | 命令数更少，但会把 pre-implementation packaging 与 post-implementation verification 混成一件事 | |
| Re-open `workflow` or `ci` as verification phase | 生命周期叙事看似集中，但会重开 workflow/CI public contract 漂移与更大 blast radius | |

**User's choice:** Auto default — Dedicated `design verify` under existing design seam  
**Notes:** 推荐项延续 Phase 17-19 已锁定的“新能力走 `design` seam，不回灌 `analyze` / `workflow`”路线；Phase 20 的目标是补闭环，不是再开一个高风险 top-level surface。

---

## Drift truth model

| Option | Description | Selected |
|--------|-------------|----------|
| Acceptance-checklist + handoff-boundary drift model | 以 `Acceptance Criteria` 生成 checklist，并用 reviewed handoff scope 判断实现是否漂移；同时保留 machine-readable evidence refs | ✓ |
| Candidate-file diff only | 主要比较 touched files / dependencies，较容易实现，但会丢失 acceptance semantics 与人类验收口径 | |
| Human-written verification note | 人类可自由描述验收，但不稳定、不可机器消费，也难纳入 guardrail 回归 | |

**User's choice:** Auto default — Acceptance-checklist + handoff-boundary drift model  
**Notes:** `VAL-04` 明确要求 acceptance criteria 映射为 verification checklist；如果只做 touched-file diff，本质上是在逃避 requirement，而不是满足它。

---

## Docs & CI guardrail closure

| Option | Description | Selected |
|--------|-------------|----------|
| Full closure across README / AI docs / rules / guardrails / CI | 把真实设计链路、workflow boundary、verify output contract 与 must-pass checks 一次对齐，并继续让 docs drift 可被脚本阻断 | ✓ |
| Only update README + AI_GUIDE | 成本低，但 rules / tests / CI 仍可能继续漂移，无法满足 `DOC-07` | |
| Put verify narrative only in rules docs | 能留下一点流程说明，但用户入口和 AI 速查面会失真，guardrail 也缺统一真相 | |

**User's choice:** Auto default — Full closure across README / AI docs / rules / guardrails / CI  
**Notes:** Phase 17/18/19 都故意只做最小 sync；Phase 20 的任务定义就是把这些“留到以后”的闭环真补完，否则 docs drift 只是被延期，不是被解决。

---

## Failure rehearsal & E2E evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Fixture-driven ready path + three failure classes | 用 repo-local fixture 和命令链证明 success + 失败预演，覆盖缺失 section、scope blocker、docs/contract drift | ✓ |
| Success-path demo only | 好看但脆弱，只证明 happy path，无法满足 `VAL-05` | |
| Manual checklist narrative | 成本最低，但无法回归、无法自动阻断，也不适合作为 milestone audit 证据 | |

**User's choice:** Auto default — Fixture-driven ready path + three failure classes  
**Notes:** `19-UAT.md` 已经暴露 ready-path fixture 仍缺位；如果不在 Phase 20 补齐 success + failure fixtures，端到端闭环就只剩文档叙事，没有可重复验证的事实。

---

## the agent's Discretion

- verification output 的精确字段名与 markdown summary 排版
- drift evidence 的最小粒度与 artifact 形态
- ready-path fixture 的具体命名与放置路径

## Deferred Ideas

- 显式 approval mutation command / sign-off ledger —— future phase
- verify 直接驱动 autonomous execution / workflow mutation —— out of current milestone scope
- 外部设计输入集成 —— future milestone
- ArcadeDB 可行性评估 —— `Phase 21`
