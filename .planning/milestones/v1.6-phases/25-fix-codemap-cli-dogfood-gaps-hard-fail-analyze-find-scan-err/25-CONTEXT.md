# Phase 25: CodeMap CLI dogfood reliability hardening - Context

**Gathered:** 2026-04-18
**Status:** Ready for re-planning
**Source:** 2026-04-17 dogfood report + 2026-04-18 reopen audit

<domain>
## Phase Boundary

本阶段只处理 **2026-04-17 eatdogfood 报告直接暴露的 Agent-facing CLI 可靠性问题**，目标是把“看起来成功、实际上会误导 Agent”的行为收敛成可验证的机器契约。

P0 是修复 `analyze -i find` 的静默失败与配置边界漂移；同一 phase 里可以继续处理同一份报告中的相邻契约缺口（如 `complexity <file>`、`check` / `ci assess-risk` 状态表达、`workflow start` 机器输出），但前提是这些工作仍然属于 **机器消费真相** 的收口，而不是顺手扩产品。

本阶段**不**重构整个 `analyze` 产品面、**不**把所有 CLI 命令一次性统一、**不**恢复 `workflow` 的更大编排语义、**不**把 `rtk` 纳入产品能力、**不**触碰任何 ArcadeDB milestone 任务。

</domain>

<decisions>
## Implementation Decisions

### Scope packaging
- **D-01:** `analyze -i find` 可靠性是本 phase 的入场门槛；在 stdout-only 消费方仍无法区分“真实 0 命中”和“扫描链路退化/失败”之前，Phase 25 不得再次声明完成。
- **D-02:** dogfood 报告中的相邻缺口（`complexity <file>`、`check` / `ci assess-risk` 状态摘要、`workflow start` 机器输出）继续保留在本 phase 的讨论范围内，但 planner 必须对每项给出“纳入本 phase 的具体 plan”或“显式延期”的书面结论，不能静默丢项。
- **D-03:** `history --symbol` 不作为本 phase 主目标；dogfood 已证明其默认输出对 Agent 足够稳定，本 phase 不应膨胀成全面 CLI surface unification。

### Failure contract
- **D-04:** `analyze find` 需要显式的三态机器契约：真实 success / zero-hit、`partialFailure`、`failure`。仅把错误打到 stderr 不构成 Agent 可依赖的产品面。
- **D-05:** `failure` 应尽可能保留 machine-readable stdout truth，再用非零 exit code 补充 shell 语义；`partialFailure` 只有在 stdout 已明确暴露 degraded truth 时才允许保持零退出码。
- **D-06:** 这份 failure truth 必须挂在正式的 analyze 输出契约（`CodemapOutput` 或等价公共 schema）上，而不是埋在 undocumented metadata、human-only prose 或测试私货里。

### Discovery & target semantics
- **D-07:** `analyze find` 的文件发现边界必须与 `generate` / `query` 已经使用的 config-aware include / exclude 与 `.gitignore` 语义对齐，不能继续依赖 adapter 内部手写 glob。
- **D-08:** 当用户传入显式文件路径时，CLI 必须先按 path anchor 解析，而不是把它当弱关键词走模糊搜索；显式路径却返回 `confidence=low` 的空结果，视为本 phase 失败。
- **D-09:** 即使主扫描器退化，fallback 也必须留在同一 discovery boundary 内，不能通过“扩大搜索宇宙”换取看似有结果的假阳性。

### Secondary contract consistency
- **D-10:** `complexity <file>` 必须要么真正按文件收缩 JSON 输出，要么同步收紧 CLI / 文档契约；“参数存在但结果仍是全量”不可接受。
- **D-11:** 存在“通过 / 跳过 / 未执行”语义的命令（至少 `check`、`ci assess-risk`）必须在 stdout 中暴露明确状态 truth，而不是让 Agent 从空输出或 prose 猜测。
- **D-12:** `workflow start` 只有在能够用最小改动补出机器可读状态/ID surface、且不重开 workflow 产品边界时，才允许并入本 phase；否则必须在计划中显式延期。

### Docs truth & verification
- **D-13:** 只要 analyze/CLI 输出契约、默认推荐路径或 AI 使用方式发生变化，就必须同步 `AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md`，并走现有 docs guardrail；若最终不改文档，也必须在交付中写明原因。
- **D-14:** 回归验证必须是 dogfood-shaped：至少复现一次扫描失败场景并证明新的结构化结果，再补一条真实 0 命中路径，避免 diagnostics 永远等于 failure。

### the agent's Discretion
- diagnostics 字段命名与状态枚举的具体拼写
- 相邻 CLI 缺口是拆成一个 plan 还是多个 plans
- fallback 的具体实现路线，只要复用现有 config-aware discovery seam
- `check` / `ci` / `workflow` 是本 phase 实做还是显式延期，只要结论可追溯且不静默丢项

</decisions>

<specifics>
## Specific Ideas

- 2026-04-18 重开审计已经证明：之前的完成声明与代码事实漂移，原因不是 scope 扩张，而是 `analyze -i find` 仍把 scanner failure 包装成 `confidence=low` 的空 JSON 成功返回。
- `query --search SourceLocation --json --structured` 目前仍是稳定对照组；replan 应保留这条已验证路径，而不是强迫所有查找流量走尚未修好的 `analyze find`。
- 前序 CLI / design phases 已经锁定三个可复用产品原则：机器模式必须是纯结构化输出、blocker/diagnostics 必须显式暴露、public command 变化必须同步 docs + guardrail。
- 本次 re-discuss 采用“更新现有 CONTEXT”路径，并把剩余 gray areas 全部视为已审阅：`analyze find` 为 P0，其余 dogfood 缺口必须被计划化处理或显式延期，而不是继续模糊漂浮。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap / state
- `.planning/PROJECT.md` — 项目级产品边界、AI-first core value 与“不要扩大错误 scope”的总原则
- `.planning/REQUIREMENTS.md` — 当前 active milestone 约束；Phase 25 虽为 out-of-band follow-up，但不能反向污染主线 milestone truth
- `.planning/ROADMAP.md` — Phase 25 的正式 goal、success criteria、reopened 状态与 failure rehearsal
- `.planning/STATE.md` — 2026-04-18 重开背景、审计结论与当前 planning 状态

### Dogfood evidence
- `docs/eatdogfood-reports/2026-04-17-eatdogfood-agent-experience.md` — 原始 Agent 体验报告，定义 P0/P1 契约缺口
- `docs/exec-plans/completed/2026-04-17-eatdogfood-codemap-cli.md` — 首份 eatdogfood 执行记录；可作历史输入，但不能再被当作“已交付事实”

### Prior CLI contract decisions
- `.planning/phases/17-design-contract-surface/17-CONTEXT.md` — 纯结构化 JSON、显式 diagnostics、CLI-owned contract seam 的既有先例
- `.planning/phases/19-handoff-package-human-gates/19-CONTEXT.md` — public command human/json 双面输出、artifact truth 单源、docs sync 原则
- `.planning/phases/20-design-drift-verification-docs-sync/20-CONTEXT.md` — failure-first verification、docs closure 与 analysis/workflow scope 边界
- `.planning/codebase/CONVENTIONS.md` — CLI/output/type discipline 与 public command docs sync 约束
- `.planning/codebase/STRUCTURE.md` — 相关实现、tests、guardrail 的自然落点

### AI/public docs
- `AI_GUIDE.md` — AI 速查入口，当前仍把 `query -S` 作为“查找相关代码”的默认路径
- `docs/ai-guide/COMMANDS.md` — CLI 命令面、参数语义与机器输出入口说明
- `docs/ai-guide/OUTPUT.md` — analyze/check/history 等正式 machine-readable contract

### Implementation anchors
- `mycodemap.config.json` — include / exclude / output truth
- `src/core/file-discovery.ts` — config-aware discovery 与 `.gitignore` 感知 truth
- `src/cli/config-loader.ts` — CLI-owned config normalization seam
- `src/orchestrator/types.ts` — `CodemapOutput` 与 analyze machine contract 定义
- `src/cli/commands/analyze.ts` — `find` 路由、fallback、`CodemapOutput` 组装入口
- `src/orchestrator/adapters/ast-grep-adapter.ts` — 当前 silent degradation、hard-coded glob 与 scanner fallback seam
- `src/cli/commands/complexity.ts` — `complexity <file>` 参数语义与 JSON 输出事实源
- `src/cli/commands/check.ts` — contract gate stdout shape 与 annotation-adjacent diagnostics
- `src/cli/commands/ci.ts` — `ci assess-risk` 当前输出与状态表达入口
- `src/cli/commands/workflow.ts` — `workflow start` 当前 human-only 行为与边界

### Regression anchors
- `src/cli/commands/__tests__/analyze-command.test.ts` — analyze contract/fallback regression harness
- `src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts` — adapter error handling 与 discovery pattern tests
- `src/cli/commands/__tests__/ci-docs-sync.test.ts` — public command docs sync guardrail harness

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/file-discovery.ts` 已提供 config-aware `discoverProjectFiles` / ignore pattern seam，可作为 `analyze find` discovery 对齐的现成 truth。
- `src/cli/config-loader.ts` 已把 include/exclude 默认值与配置归一化固定下来，避免新逻辑重复解析 `mycodemap.config.json`。
- `src/cli/commands/analyze.ts` 已经是 `CodemapOutput` 的集中组装点，也已有兼容 warning 先例，适合挂 diagnostics/failure truth。
- `src/cli/commands/__tests__/analyze-command.test.ts` 与 `src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts` 已覆盖 fallback / adapter seam，是最自然的回归落点。
- `src/cli/commands/__tests__/ci-docs-sync.test.ts` 已经锁住 public docs guardrail 执行路径，适合为契约改动兜底。

### Established Patterns
- public analysis/design commands 偏好“human mode + 纯结构化 machine mode”双面输出，而不是混合 prose JSON。
- blocker / degraded truth 应显式建模，而不是靠 stderr、人类经验或 exit code 单独表达。
- public command 变化必须同步 AI docs、rules 与 guardrail tests，避免再次出现文档真相漂移。

### Integration Points
- `src/orchestrator/types.ts` 是 analyze contract 扩展的首要接入点。
- `src/orchestrator/adapters/ast-grep-adapter.ts` 是 scanner 错误处理与 target file discovery 的根因位点。
- `src/cli/commands/analyze.ts` 是 `find` 诊断上浮、path-target 语义和 fallback 编排入口。
- `src/cli/commands/complexity.ts`、`src/cli/commands/check.ts`、`src/cli/commands/ci.ts`、`src/cli/commands/workflow.ts` 是 Phase 25 次级一致性收口位点。
- `AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md`、`scripts/validate-docs.js` / docs sync tests 构成契约改动后的真相护栏。

</code_context>

<deferred>
## Deferred Ideas

- 把 `analyze` 全面重构成唯一统一查询入口，并替代 `query` / `deps` / `impact` / `complexity`
- 超出 dogfood 报告的 CLI surface 大一统（例如所有命令统一旗标体系）
- `workflow` 的自动推进、执行编排或更大产品化语义
- 将 `rtk` 变成 CodeMap 产品功能或官方 CLI 依赖
- 与 ArcadeDB prototype / storage 路线相关的任何工作

</deferred>

---

*Phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err*
*Context gathered: 2026-04-18 after reopen audit*
