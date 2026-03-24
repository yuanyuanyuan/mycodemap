# Phase 3: Analyze Contract（Analyze 意图与输出契约重构） - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in `03-CONTEXT.md` — this log only records the alternatives considered in auto mode.

**Date:** 2026-03-24
**Mode:** Auto (`$gsd-discuss-phase 3 --auto`)

## Boundary

- 只讨论 `analyze` 的 public intent / schema / compatibility。
- 不讨论 `workflow` 四阶段状态机、`ship/ci` 职责重排、`server/watch/report/logs` public surface 回流。

## Gray Areas Reviewed

### 1. Public intent set and missing-intent behavior

**Question:** `analyze` 目标态是否继续允许混合新旧 intent？无 `intent` 时是否保留默认值？

**Options presented**
1. **只保留四个 public intents，并要求显式 `--intent`（Recommended）** — 目标态最清晰，也能消除当前 CLI/help/内部默认值互相冲突的问题。
2. 只保留四个 public intents，但无 `intent` 默认到 `find` — 兼容更软，但仍会留下隐式行为。
3. 兼容期同时公开新旧两套 public names — 对机器消费者最混乱。

**Auto-selected:** Option 1  
**Why:** 当前顶层 CLI 已经在无 `intent` 时直接打印 help，而内部却分别默认 `impact` / `search`；继续保留隐式默认值只会把漂移固化。

### 2. Legacy intent migration matrix

**Question:** 旧 8 intents 如何映射到 `find/read/link/show`？

**Options presented**
1. **按能力归并（Recommended）** — `search → find`、`impact/complexity → read`、`dependency/reference → link`、`overview/documentation → show`、`refactor` 仅弃用无映射。
2. 只映射最明显的 4 个旧 intents，其余直接报错 — 破坏过大，不符合 2 minor 兼容期。
3. 给 `refactor` 额外发明一个新 intent — 超出 roadmap 范围。

**Auto-selected:** Option 1  
**Why:** 它同时满足设计稿的迁移窗口与 roadmap 的四意图目标，也避免把 `refactor` 这种已被设计稿删除的能力硬塞回新契约。

### 3. `documentation` and `show` ambiguity

**Question:** 设计稿里 `documentation` 写着“移除 / 别名 overview / 映射到 show”，落地时到底怎么算？

**Options presented**
1. **兼容期把 `documentation` 直接视为 deprecated alias to `show`（Recommended）** — 目标态只保留 `show`。
2. 长期保留 `overview` 作为新旧之间的过渡 public name — 会让 public names 变成 5 个。
3. `documentation` 直接删除且不映射 — 与设计稿的兼容期要求冲突。

**Auto-selected:** Option 1  
**Why:** 这是唯一能把歧义压平到“四意图唯一 public name”的方案。

### 4. `link` first-version scope

**Question:** `link` 首版要不要把“测试/历史关联”也定义成硬性 schema？

**Options presented**
1. **首版只保证 `reference + dependency`，测试文件作为 best-effort 附加，history 延后（Recommended）** — 对齐现有稳定实现。
2. 强制把 git history 也纳入 `link` 必达 schema — 当前代码没有稳定对应结构，风险高。
3. 只做 `reference`，把 `dependency` 延后 — 不满足 `ANL-03`。

**Auto-selected:** Option 1  
**Why:** 当前稳定可复用的底层能力是 `reference/dependency`；history 关联若硬塞进本 phase，只会制造伪契约。

### 5. Deprecation warning channel

**Question:** 兼容期的 `[DEPRECATED]` 警告应通过什么通道输出？

**Options presented**
1. **JSON/structured 走结构化字段，人类模式再附文本提示（Recommended）** — 保持机器可读。
2. 所有模式都直接在 stdout 前置文本警告 — 会污染 JSON。
3. 完全静默，不输出 warning — 不满足设计稿。

**Auto-selected:** Option 1  
**Why:** 项目的核心价值是“稳定、机器可读的代码上下文”，所以 warning 不能破坏机器输出。

## Deferred

- `workflow` 阶段模型改成 `find → read → link → show`
- `link` 的 git history / commit-history 正式 schema
- 是否在后续下线独立 `impact/deps/complexity` public commands

---

*Phase: 03-analyze-contract-analyze*
*Discussion logged: 2026-03-24*
