# Phase 2: CLI Surface Cleanup（公共 CLI 命令面收缩） - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Auto-mode decisions from roadmap + Phase 1 baseline + CodeMap/codebase audit

<domain>
## Phase Boundary

本阶段只处理**公共 CLI 命令面收缩**：让 `mycodemap --help` / `codemap --help` 不再暴露 `server`、`watch`、`report`、`logs`，并同步相应的兼容报错、文档、guardrail 与测试。  
本阶段**不**重写 `analyze` 四意图、**不**简化 `workflow` 阶段模型、**不**重构 `ship/ci` 职责，也**不**把 `Server Layer` 架构层或 `src/cli-new` 试验性 surface 一起删除。

</domain>

<decisions>
## Implementation Decisions

### Public surface boundary
- **D-01:** 顶层公共 CLI 的保留/移除事实，以 `src/cli/index.ts` 与 `node dist/cli/index.js --help` 为唯一公开事实源；`server`、`watch`、`report`、`logs` 是本 phase 的移除对象。
- **D-02:** `workflow` 与 `ship` 即使仍属过渡能力，也不在本 phase 一并移除；它们分别留给 Phase 4 / Phase 5 处理。
- **D-03:** `Server Layer` 架构概念继续保留，`src/server/` 与 `src/cli-new/` 不是本 phase 的删除目标；本 phase 只收紧当前主 CLI 的公开 surface。

### Compatibility and failure UX
- **D-04:** 被移除命令需要给出**明确迁移/报错策略**，不能只靠模糊的 Commander 默认错误吞掉上下文；目标是“迁移平滑”，不是“静默蒸发”。
- **D-05:** 兼容策略不等于保留旧功能继续正常执行；推荐方向是“显式失败 + 指路说明”，而不是继续维持旧 public surface。

### Docs and guardrail consistency
- **D-06:** 本 phase 必须把源码注册、help 输出、README、AI 文档、setup 文档、guardrail 脚本、docs-sync 测试一起收口，不能只删注册表不删文档。
- **D-07:** Phase 1 已建立的命名边界（`Server Layer` ≠ 公共 `server` 命令）必须保留；Phase 2 只删除 public command surface，不回退 Phase 1 的文档基线。

### Validation strategy
- **D-08:** 最小验证集合固定为：`node dist/cli/index.js --help`、`npm run docs:check`、`node dist/cli/index.js ci check-docs-sync`，外加与 removed commands / docs sync 直接相关的测试。
- **D-09:** 因为 `src/cli/index.ts` 是高 blast-radius 入口，本 phase 的执行仍按 roadmap 拆成三块：注册/help 收口、兼容错误策略、文档引用点同步。

### the agent's Discretion
- removed-command 报错文案的具体文字
- 使用 hidden command、预解析拦截，还是 unknown-command 定制来承载迁移提示
- 哪些二级文档（如 `docs/SETUP_GUIDE.md`、`docs/AI_ASSISTANT_SETUP.md`）需要在本 phase 一并更新

</decisions>

<specifics>
## Specific Ideas

- 设计稿已明确：`server`、`watch`、`report`、`logs` 与 AI-first 定位冲突，属于删除对象；同时要求“迁移平滑”，不能粗暴处理。
- 当前 `node dist/cli/index.js --help` 仍暴露 `watch`、`report`、`logs`、`server`，这说明 Phase 2 的成功标准还完全未达成。
- `src/cli-new/index.ts` 仍注册 `server`，但它是“new architecture CLI / experimental transitional”而非当前主入口；本 phase 若顺手改它，容易把 public surface cleanup 扩成架构层重构。
- 现有 guardrail 重点覆盖 docs sync，但没有看到顶层 `--help` 的专门回归测试；这意味着 Phase 2 计划里需要考虑补齐 help surface 的回归验证。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning source of truth
- `.planning/PROJECT.md` — 已验证的产品边界、当前 active work 与限制条件
- `.planning/ROADMAP.md` — Phase 2 目标、success criteria、`02-01` / `02-02` / `02-03` 拆分
- `.planning/REQUIREMENTS.md` — `CLI-01` ~ `CLI-05`
- `.planning/STATE.md` — 当前 phase 状态与上一 phase 的收口结果

### Prior phase decisions
- `.planning/milestones/v1.0-phases/01-positioning-baseline/01-CONTEXT.md` — Phase 1 锁定的 AI-first 定位、输出契约和命名边界
- `.planning/milestones/v1.0-phases/01-positioning-baseline/01-RESEARCH.md` — Phase 1 的 blast-radius / guardrail 研究
- `.planning/milestones/v1.0-phases/01-positioning-baseline/01-VERIFICATION.md` — POS-01 / POS-02 / POS-03 已满足的证据

### Product direction
- `/home/stark/.gstack/projects/yuanyuanyuan-mycodemap/stark-main-design-20260324-022633.md` — 删除命令清单、迁移平滑原则与文档迁移优先级

### Public CLI and guardrails
- `src/cli/index.ts` — 当前主 CLI 的公开命令注册与 help surface
- `src/cli/tree-sitter-check.ts` — 命令列表辅助逻辑，`watch` 仍在 require-list 中
- `src/cli/commands/ci.ts` — `check-docs-sync` 的统一入口
- `scripts/validate-docs.js` — 文档/命令面高信号 guardrail
- `src/cli/__tests__/validate-docs-script.test.ts` — docs guardrail 失败模式测试
- `src/cli/commands/__tests__/ci-docs-sync.test.ts` — docs-sync CLI helper 测试

### Docs that currently expose removed commands
- `README.md` — 顶层 CLI 命令列表与过渡能力说明
- `docs/ai-guide/COMMANDS.md` — 详细命令参考
- `docs/SETUP_GUIDE.md` — 安装后帮助入口
- `docs/AI_ASSISTANT_SETUP.md` — 仓库维护者 guardrail 指引

### Codebase audit
- `.planning/codebase/CONCERNS.md` — high blast-radius、docs guardrail coupling、具体失败模式
- `.planning/codebase/ARCHITECTURE.md` — `src/cli/index.ts` 主入口与 `src/cli-new` / `src/server` 旁路风险
- `.planning/codebase/INTEGRATIONS.md` — `server` / `watch` 对应的现有集成位置

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/index.ts`：当前公共命令面的单一注册表，是最直接的 surface cleanup 入口。
- `scripts/validate-docs.js`：现成的高信号文档 guardrail，可直接扩展为“命令已移除”后的新基线检查。
- `src/cli/__tests__/validate-docs-script.test.ts` 与 `src/cli/commands/__tests__/ci-docs-sync.test.ts`：已有 docs-sync 测试挂点，适合补 Phase 2 回归。

### Established Patterns
- 当前仓库使用 Commander 在 `src/cli/index.ts` 统一注册顶层命令，help 输出天然跟随注册表。
- 文档护栏采用精确字符串匹配；命令面一变，README / AI docs / rules / workflow / tests 往往必须一起改。
- `src/cli-new/` 明确标注为 transitional/new architecture CLI，不应与当前主 CLI 的 public surface 混为一谈。

### Integration Points
- `src/cli/index.ts` ↔ `node dist/cli/index.js --help`：公开命令面事实
- `src/cli/index.ts` ↔ `README.md` ↔ `docs/ai-guide/COMMANDS.md`：命令列表同步
- `scripts/validate-docs.js` ↔ `src/cli/__tests__/validate-docs-script.test.ts` ↔ `ci check-docs-sync`：文档/guardrail/CI 验证链
- `src/cli/tree-sitter-check.ts` ↔ removed commands：辅助命令列表若不更新，会留下死配置

</code_context>

<deferred>
## Deferred Ideas

- `analyze` 从 8 意图收敛到 `find/read/link/show` —— Phase 3
- `workflow` 从 6 阶段简化为纯分析流 —— Phase 4
- `ship` 检查复用 `ci`，而不是重复实现 —— Phase 5
- 共享 `.gitignore` 感知排除模块与最终文档/测试收口 —— Phase 6
- 是否彻底删除 `src/server/` / `src/cli-new/commands/server.ts` 的代码实现 —— 不在本 phase，除非 public surface cleanup 被证明必须触碰

</deferred>

---

*Phase: 02-cli-surface-cleanup-cli*
*Context gathered: 2026-03-24*
