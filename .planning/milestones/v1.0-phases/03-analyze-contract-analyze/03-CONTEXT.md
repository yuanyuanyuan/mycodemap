# Phase 3: Analyze Contract（Analyze 意图与输出契约重构） - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Auto-mode decisions from roadmap + design draft + CodeMap/codebase audit

<domain>
## Phase Boundary

本阶段只处理 `analyze` 公共契约：将 `analyze` 从 8 个 legacy intents 收敛为 `find` / `read` / `link` / `show` 四意图，统一 CLI 参数校验、机器输出 schema、旧 intent 的弃用/报错路径，并同步直接耦合的测试、错误码、文档与 guardrail。  
本阶段**不**简化 `workflow` 阶段模型、**不**重构 `ship/ci` 职责、**不**重新开放 `server/watch/report/logs` 之类非分析型 public surface，也**不**顺手删除独立 `impact` / `deps` / `complexity` 命令；这些独立命令只可作为新 `analyze` schema 的内部数据来源。

</domain>

<decisions>
## Implementation Decisions

### Public intent contract
- **D-01:** `analyze` 的目标态 public intents 只保留 `find`、`read`、`link`、`show` 四个名字；旧 8 intents 不再作为目标态公开契约。
- **D-02:** 顶层 CLI 继续要求显式 `--intent/-i`；`AnalyzeCommand` 与 `IntentRouter` 里彼此冲突的默认 intent 必须移除或统一，不能再出现“CLI 无 intent 显示 help，但内部默认值却各不相同”的漂移。
- **D-03:** 本阶段只改 `analyze` 契约，不顺手下线独立 `impact`、`deps`、`complexity` 等现有命令；这些命令仍可作为 `read/link/show` 的底层实现来源。

### Legacy intent migration
- **D-04:** 兼容映射固定为：`search → find`、`impact → read`、`complexity → read`、`dependency → link`、`reference → link`、`overview → show`、`documentation → show`；`refactor` 只提供弃用提示，不为其创造新的等价 public intent。
- **D-05:** 设计稿里 `documentation` 的“移除 / 别名 overview / 映射到 show”存在歧义；本 phase 锁定为“兼容期内把 `documentation` 视为 deprecated alias 并最终归并到 `show`”，而不是继续保留 `overview` 作为长期 public name。
- **D-06:** 旧 intent 的兼容窗口固定为 **2 个 minor 版本**；兼容窗口内返回结构化弃用警告并继续执行映射后的新意图，窗口结束后统一报 `E0001_INVALID_INTENT`。

### Parameter and warning rules
- **D-07:** 参数校验必须按 intent 分流，不能继续沿用“一刀切 `targets` 必填”的旧逻辑：`find` 首版至少支持 `keywords-only` 或 `targets-only`；`read` / `link` / `show` 再按各自数据源要求校验必要参数。
- **D-08:** 机器输出优先级高于人类提示；JSON / structured 输出中的弃用信息必须通过结构化字段承载，不能把 `[DEPRECATED] ...` 直接拼到 JSON 前后污染机器消费链路。人类模式可额外显示文本警告。

### Schema scope
- **D-09:** `read` 首版统一承接 `impact + complexity`：顶层 intent 为 `read`，结果中允许同时表达复杂度与影响分析信息；底层可以复用现有 `ImpactCommand` / `ComplexityCommand`。
- **D-10:** `link` 首版统一承接 `reference + dependency`：顶层 intent 为 `link`，结果中允许同时表达引用关系与依赖关系；当前没有稳定“历史关联”schema 时，不把 git history 升格为 Phase 3 的必达契约。
- **D-11:** `show` 首版承接 `overview + documentation` 一类展示/导出型 analyze 结果，但不重新打开旧 `report` public surface，也不把 workflow/showcase 文案混回 `analyze`。

### Scope guardrails
- **D-12:** `Phase 3` 的 plan 必须覆盖实现、schema、错误码、测试、文档/guardrail 五条链路；只改意图名字不改 docs/tests/error path 视为不达标。
- **D-13:** `workflow` 的 `find → read → link → show` 阶段模型留到 `Phase 4`，`ship/ci` 职责重排留到 `Phase 5`；本 phase 只处理 analyze 契约，不混改后续 phase 的状态机或命令边界。

### the agent's Discretion
- 结构化弃用警告字段的具体命名（如 `warnings[]`、`deprecations[]`）
- `read/link/show` 结果中 typed summary 字段与 `results[]` 明细字段的具体嵌套形状
- Phase 3 需要同步的最小文档/guardrail 集合，只要能防止 analyze 新旧契约再次漂移即可

</decisions>

<specifics>
## Specific Ideas

- 设计稿已经明确把 `analyze` 目标态收敛为 `find/read/link/show`，并要求旧 intent 保留两个 minor 版本的兼容窗口。
- 当前实现仍把 `impact/dependency/search/documentation/complexity/overview/refactor/reference` 当作有效 intents，CLI help 也仍展示这 8 个名字。
- 当前 `AnalyzeCommand.validate()` 强制要求 `targets`，但文档却给出了 `search` 仅靠 `-k/--keywords` 的示例；这意味着 Phase 3 必须顺手修复“按 intent 分流的参数校验”，而不是只换 intent 名字。
- 当前无 `intent` 时存在三套互相打架的现实：顶层 CLI 直接显示 help、`AnalyzeCommand` 内部默认 `impact`、`IntentRouter` 内部默认 `search`；如果不先统一这点，新契约会继续漂。
- `link` 的设计稿描述含“测试/历史关联”，但当前代码中稳定可复用的只有 `reference/dependency` 与 `include-tests` 附加信息；更重的 git-history 关联应作为 future enhancement，而不是在本 phase 臆造稳定契约。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning source of truth
- `.planning/PROJECT.md` — 当前产品边界、AI-first 原则、兼容与 scope 限制
- `.planning/ROADMAP.md` — Phase 3 目标、success criteria、`03-01` / `03-02` / `03-03` 拆分
- `.planning/REQUIREMENTS.md` — `ANL-01` ~ `ANL-05`
- `.planning/STATE.md` — 当前 phase 状态、高风险入口与已知风险

### Prior phase decisions
- `.planning/milestones/v1.0-phases/01-positioning-baseline/01-CONTEXT.md` — 机器可读优先、过渡现实必须诚实记录
- `.planning/milestones/v1.0-phases/02-cli-surface-cleanup-cli/02-CONTEXT.md` — Phase 2 锁定的 scope guardrail：只改当前 phase，不混改 workflow/ship/server
- `.planning/milestones/v1.0-phases/02-cli-surface-cleanup-cli/02-RESEARCH.md` — 高 blast-radius CLI 改动必须同步 docs/guardrail/tests 的经验

### Product direction
- `/home/stark/.gstack/projects/yuanyuanyuan-mycodemap/stark-main-design-20260324-022633.md` — `analyze` 四意图目标态、迁移矩阵、兼容窗口与新 schema 草图

### Current analyze implementation
- `src/cli/commands/analyze.ts` — CLI 参数解析、错误码、help、machine/human 输出总入口
- `src/orchestrator/intent-router.ts` — 旧 intent 白名单、默认 tool 路由与默认 intent 漂移点
- `src/orchestrator/types.ts` — `IntentType`、`CodemapIntent`、`AnalyzeArgs`、`CodemapOutput`
- `src/orchestrator/confidence.ts` — 旧 8 intents 的 confidence 阈值与场景分支
- `src/cli/commands/impact.ts` — `read` 的影响分析底层来源
- `src/cli/commands/deps.ts` — `link` 的依赖关系底层来源
- `src/cli/commands/complexity.ts` — `read` 的复杂度底层来源

### Current tests and docs tied to analyze contract
- `src/orchestrator/__tests__/intent-router.test.ts` — 旧 intent router 单元测试
- `src/orchestrator/__tests__/types.test.ts` — `CodemapOutput` / `IntentType` 类型与守卫测试
- `src/orchestrator/__tests__/confidence.test.ts` — confidence 对旧 8 intents 的阈值假设
- `docs/ai-guide/COMMANDS.md` — 当前 `analyze` 8 intents 命令文档与示例
- `docs/ai-guide/OUTPUT.md` — 当前 `analyze` JSON / structured schema 说明

### Codebase audit
- `.planning/codebase/CONCERNS.md` — analyze 改名若不同步 CLI / docs / tests 会同时炸机器消费者与 CI

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/commands/analyze.ts`：现成的参数解析、错误码、machine/human 输出总入口，是 `Phase 3` 的主装配点。
- `src/orchestrator/intent-router.ts` 与 `src/orchestrator/types.ts`：当前 intent 白名单、route 结构与 schema 类型源头，适合承接 4-intent 收敛。
- `src/cli/commands/impact.ts`、`src/cli/commands/deps.ts`、`src/cli/commands/complexity.ts`：分别提供 `read/link` 需要复用的底层分析能力。
- `src/orchestrator/confidence.ts`：现有 confidence 阈值机制可复用，但其 intent 分支需要与新契约一起收口。

### Established Patterns
- `analyze` 当前统一输出遵循 `schemaVersion + intent + tool + confidence + results + metadata` 包装形状，已有 `--json`、`--structured`、`--output-mode machine|human` 三种消费方式。
- CLI 参数解析、help 文案、验证逻辑目前都集中在 `src/cli/commands/analyze.ts`，因此“意图名字”“默认值”“参数必填规则”很容易在同文件内漂移。
- 文档与 guardrail 使用精确字符串/示例比对；analyze 契约一旦变化，`docs/ai-guide/*` 与相关测试必须同步更新。

### Integration Points
- `src/cli/commands/analyze.ts` ↔ `src/orchestrator/intent-router.ts` ↔ `src/orchestrator/types.ts`：新 public intent 与内部 route/schema 对齐
- `src/cli/commands/analyze.ts` ↔ `src/orchestrator/confidence.ts` ↔ `src/orchestrator/__tests__/confidence.test.ts`：意图收敛后的 confidence 分支同步
- `src/cli/commands/analyze.ts` ↔ `docs/ai-guide/COMMANDS.md` ↔ `docs/ai-guide/OUTPUT.md` ↔ docs guardrail/tests：CLI 契约、示例、schema 文档一致性
- `src/cli/commands/analyze.ts` ↔ `src/cli/commands/impact.ts|deps.ts|complexity.ts`：`read/link` 对现有底层分析命令的复用边界

</code_context>

<deferred>
## Deferred Ideas

- `workflow` 阶段模型切换到 `find → read → link → show` —— Phase 4
- `ship` / `ci` 职责对齐 —— Phase 5
- 共享 `.gitignore` 感知排除模块与最终 docs/CI 收口 —— Phase 6
- `link` 引入真正稳定的 git-history / commit-history 关联 schema —— 未来 phase / backlog
- 是否在后续产品面下线独立 `impact` / `deps` / `complexity` 命令 —— 当前 roadmap 未授权，本 phase 不处理

</deferred>

---

*Phase: 03-analyze-contract-analyze*
*Context gathered: 2026-03-24*
