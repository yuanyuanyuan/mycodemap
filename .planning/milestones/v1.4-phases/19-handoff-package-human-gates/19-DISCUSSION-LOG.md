# Phase 19: Handoff Package & Human Gates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `19-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 19-handoff-package-human-gates
**Areas discussed:** Handoff surface, Artifact packaging, Human gate policy, Traceability model
**Mode note:** 本轮运行处于 execute/default 回退路径，未使用交互式菜单；以下选择为基于 roadmap、prior context 与 codebase scout 的 auto-default 决策。

---

## Handoff surface

| Option | Description | Selected |
|--------|-------------|----------|
| `design handoff` under existing design seam | 保持 purpose-built 的 `design` sidecar surface，复用 `design validate` / `design map` 上游真相，不改 `analyze` / `workflow` | ✓ |
| New top-level `handoff` command | 命令名直观，但会新增一层 public surface 与 docs blast radius | |
| Re-open `workflow` / extend `analyze` | 直接把 handoff 挂进已有高风险 surface，但会重开已收口的 contract 漂移 | |

**User's choice:** Auto default — `design handoff` under existing design seam  
**Notes:** 推荐项来自 `Phase 17/18` 对独立 `design` surface 的锁定，以及 v1.4 对 public contract stability 的持续要求。

---

## Artifact packaging

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical truth + dual artifacts under `.mycodemap/handoffs` | 单一 truth 同时渲染 markdown / json，并复用 `resolveOutputDir()` 的路径约定 | ✓ |
| Stdout-only handoff output | CLI 简洁，但缺少持久化 artifact，难满足 traceability 与 human gate 复核 | |
| Write sidecars next to design contract | 路径直观，但容易把仓库根目录继续堆满 handoff 文件，且绕开既有 output helper | |

**User's choice:** Auto default — Canonical truth + dual artifacts under `.mycodemap/handoffs`  
**Notes:** `generate` / `report` 都已证明 `.mycodemap` 是当前产物落点真相；复用现有 helper 比再造一套路径体系更稳。

---

## Human gate policy

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit readiness flag + pending review state | handoff 仍可生成，但 unresolved assumptions / open questions 会让 artifact 标记 `readyForExecution=false` | ✓ |
| Hard fail on any unresolved item | 最保守，但 reviewer 甚至拿不到完整 handoff artifact 做复核 | |
| Always ready after validate/map pass | 最省流程，但会把未审 gaps 伪装成已批准事实 | |

**User's choice:** Auto default — Explicit readiness flag + pending review state  
**Notes:** 这样既保留人类 gate，又不牺牲 artifact 的可审查性；mapping blocker 仍应 hard fail，但 review-needed 不是 CLI 崩溃条件。

---

## Traceability model

| Option | Description | Selected |
|--------|-------------|----------|
| Provenance-first structured lists | `approvals` / `assumptions` / `openQuestions` 分离建模，并都带 source refs | ✓ |
| Flatten into free-text summary | markdown 好写，但 downstream agent 很难稳定消费或反查来源 | |
| Machine JSON only, human summary weak traceability | 机器好用，但人类 reviewer 难以快速审计为什么 not-ready | |

**User's choice:** Auto default — Provenance-first structured lists  
**Notes:** `HOF-03` 要求的是“可追踪”，不是“总结得像看起来差不多”；source refs 必须是正式字段，不是 prose 注脚。

---

## the agent's Discretion

- `DesignHandoff*` 的精确字段命名与 markdown 标题顺序
- `--output` 之外是否增加更多控制 flag
- `readyForExecution` 的细粒度阈值

## Deferred Ideas

- drift report / acceptance verification 闭环 —— `Phase 20`
- 完整 handoff docs / CI / e2e narrative —— `Phase 20`
- 若未来真要显式 mutation 式 approval command，再单独评估为后续 phase
