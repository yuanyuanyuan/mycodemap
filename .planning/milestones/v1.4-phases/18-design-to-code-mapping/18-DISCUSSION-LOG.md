# Phase 18: Design-to-Code Mapping - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `18-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 18-design-to-code-mapping
**Areas discussed:** Mapping surface, Matching heuristics, Output contract, Failure semantics
**Mode note:** 本轮运行处于 execute/default 回退路径，未使用交互式菜单；以下选择为基于 roadmap、prior context 与 codebase scout 的 auto-default 决策。

---

## Mapping surface

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated design mapping seam | 保持 `design` / handoff 旁路，对外输出围绕 design contract；内部复用 `query` / `analyze` / `impact` / `test-linker` | ✓ |
| Extend `analyze` public intent | 直接给 `analyze` 增加 mapping intent，复用 CLI surface，但会放大 public contract blast radius | |
| Re-open `workflow` phases | 通过 `workflow` 编排引入 mapping/handoff 语义，但会重新触发已收口的 phase 漂移 | |

**User's choice:** Auto default — Dedicated design mapping seam  
**Notes:** 推荐项来自 `Phase 17` 对独立 `design` surface 的锁定，以及 v1.4 对 public contract stability 的约束；因此本轮不把新语义塞进 `analyze` / `workflow`。

---

## Matching heuristics

| Option | Description | Selected |
|--------|-------------|----------|
| Boundary-first multi-signal | 先用 design contract 的 goal / constraints / acceptance / non-goals 提取 scope anchors，再用 code map、dependency、impact 补足 | ✓ |
| Semantic-first fuzzy ranking | 主要依赖关键词模糊匹配或相似度，再事后解释原因链；实现快但误命中风险高 | |
| Path-only exact scope | 只接受 design 中明确路径或模块名，不做任何模糊补足；安全但覆盖率过低 | |

**User's choice:** Auto default — Boundary-first multi-signal  
**Notes:** `MAP-01` 既要求 files / modules / symbols，又要求原因链；纯 fuzzy 会弱化 reason chain，纯 path-only 又无法覆盖一般 design contract，因此采用中间的保守组合。

---

## Output contract

| Option | Description | Selected |
|--------|-------------|----------|
| Structured primary + short summary | 以 machine-readable mapping result 为主，同时附简短 human summary，避免提前侵入 Phase 19 handoff | ✓ |
| Full dual artifact now | 现在就做完整 human+machine 双产物，直接接近 handoff package 形态 | |
| Prose-first review note | 主要输出人类说明，再附少量字段；阅读友好但不利于后续 agent 消费 | |

**User's choice:** Auto default — Structured primary + short summary  
**Notes:** Project 已要求输出同时支持 human review 和 machine consumption，但完整 handoff artifact 明确属于 `Phase 19`，因此本阶段只做最小必要的 review-friendly 结构化输出。

---

## Failure semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Hard block on no-match / over-broad / high-risk | 直接返回“需要人类补充设计”的 diagnostics，并阻止继续规划 | ✓ |
| Warn but continue | 保留 warning，仍然生成 mapping / 计划建议，风险是把猜测伪装成范围 | |
| Always ask for manual confirmation | 每次有歧义都进入人工确认，最安全但会显著放大流程摩擦 | |

**User's choice:** Auto default — Hard block on no-match / over-broad / high-risk  
**Notes:** `MAP-03` 与 Phase 17 的 failure-first 原则都要求显式阻断。保守 block 比“带病继续”更符合当前 milestone 的信任基线。

---

## the agent's Discretion

- multi-signal ranking 的权重公式
- over-broad 的数值阈值与候选规模上限
- reason chain 的字段命名与序列化格式
- mapping artifact 的最终路径与命令命名（前提是不越界到 Phase 19）

## Deferred Ideas

- 完整 handoff package 与审批边界 —— `Phase 19`
- design drift verification、docs sync、CI guardrail —— `Phase 20`
- 外部设计输入集成 —— future milestone
