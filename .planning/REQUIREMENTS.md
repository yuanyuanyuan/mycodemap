# Requirements: v1.6 CodeMap CLI dogfood reliability hardening

**Defined:** 2026-04-18
**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Source Phase:** `Phase 25`
**Previous Closed Branch:** `v1.5 Isolated ArcadeDB Server-backed Prototype`（2026-04-18 起不再继续）

## Completed Requirements

### Analyze Contract Truth

- [x] **P25-SC1**: `analyze -i find` 在扫描失败场景中必须返回显式 warning / failure / `partialFailure`，不能再伪装成可信的 0 结果
- [x] **P25-SC2**: `analyze find` 的 include / exclude / discovery boundary 必须与现有 config-aware scanning truth 对齐
- [x] **P25-SC3**: JSON/stdout-only 消费方必须能区分“真实 0 命中”和“扫描链路部分失败”

### Adjacent Dogfood Contracts

- [x] **P25-DOGFOOD-COMPLEXITY**: `complexity -f --json` 必须按单文件稳定输出机器可读结果
- [x] **P25-DOGFOOD-CI-RISK**: `ci assess-risk --json` 必须暴露稳定的状态 truth
- [x] **P25-DOGFOOD-WORKFLOW**: `workflow start --json` 必须输出纯 JSON 的 workflow state

### Docs & Product Truth

- [x] **P25-SC4**: CLI 输出契约 / 默认推荐路径 / AI 使用模式变更后，相关 AI docs 必须同步
- [x] **P25-SC5**: `rtk` 只作为 token 节省 wrapper，不进入 CodeMap 产品能力说明
- [x] **P25-DOCS**: `AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md` 与 guardrail checks 必须和实现一致

## Constraints

| Boundary | Why |
|----------|-----|
| stdout 必须携带 Agent 可消费的结构化真相 | 不能再依赖 stderr 或人类经验补足语义 |
| config-aware discovery 是 `find` 的边界真相 | 不能靠扩大搜索范围掩盖 scanner 退化 |
| docs / guardrail 必须跟随 CLI 契约同步 | 否则会再次出现“代码真相”和“AI 文档真相”漂移 |
| `rtk` 只属于执行包装层 | 避免把仓库工具误写成 CodeMap 产品功能 |
| `Phase 22-24` 不再是当前 requirement 的前置条件 | 用户已明确关闭旧版本 continuation |

## Failure Rehearsal

- **风险模式 1**: scanner 明明失败，但 stdout 仍返回看似可信的空成功 JSON
- **风险模式 2**: `find` 为了“看起来有结果”而绕开既有 config-aware discovery boundary
- **风险模式 3**: 相邻 CLI 命令继续输出 human-only prose，迫使 Agent 猜测状态
- **风险模式 4**: 文档未同步，导致 AI 按旧契约调用新实现
- **风险模式 5**: 把已关闭的 Docker / ArcadeDB 历史分支重新当成当前 requirement

## Deferred

- 更大范围的 CLI surface unification
- `workflow` 的更大产品化 / 自动编排语义
- 任何 Docker / ArcadeDB / remote backend 相关实验
- 超出 Phase 25 dogfood 报告的额外 CLI 扩张

## Out of Scope

| Feature | Reason |
|---------|--------|
| 恢复 `Phase 22-24` 作为当前版本 requirement | 用户已明确不再继续 |
| 重新把 Docker / ArcadeDB 作为默认下一步 | 不符合当前版本边界 |
| 把 `rtk` 宣称为 CodeMap 正式产品能力 | 只属于执行包装层 |
| 借 `Phase 25` 顺手统一所有 CLI 命令的所有旗标 / schema | 超出当前版本 scope |

## Traceability

| Requirement | Phase / Plan | Status | Notes |
|-------------|--------------|--------|-------|
| P25-SC1 | Phase 25 / Plan 01 | Completed | stdout diagnostics 已显式建模 |
| P25-SC2 | Phase 25 / Plan 01 | Completed | `find` discovery 对齐 config-aware seam |
| P25-SC3 | Phase 25 / Plan 01 | Completed | 真实 0 命中与 degraded truth 可区分 |
| P25-DOGFOOD-COMPLEXITY | Phase 25 / Plan 02 | Completed | 单文件 JSON contract 已收口 |
| P25-DOGFOOD-CI-RISK | Phase 25 / Plan 02 | Completed | 风险评估输出含明确状态 truth |
| P25-DOGFOOD-WORKFLOW | Phase 25 / Plan 02 | Completed | `workflow start --json` 输出纯 JSON |
| P25-SC4 | Phase 25 / Plan 03 | Completed | AI docs 已与实现同步 |
| P25-SC5 | Phase 25 / Plan 03 | Completed | `rtk` wrapper-only 边界已写实 |
| P25-DOCS | Phase 25 / Plan 03 | Completed | docs guardrail / validation 已覆盖 |

**Coverage:**
- Completed requirements: 9 total
- Mapped to plans: 9
- Unmapped: 0

---
*Requirements defined: 2026-04-18*
*Last updated: 2026-04-18 after reconciling Phase 25 as v1.6*
