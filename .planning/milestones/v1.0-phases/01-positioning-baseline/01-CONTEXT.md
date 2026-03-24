# Phase 1: Positioning Baseline（产品定位与范围基线） - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Brownfield initialization + user-provided design draft

<domain>
## Phase Boundary

本阶段只固化 CodeMap 的产品定位、面向对象、机器/人类输出契约说明，以及 MVP3 `Server Layer` 与公共 `server` CLI 命令之间的边界表达。  
本阶段**不**删除命令、**不**重写 `analyze` 意图、**不**简化 `workflow` 阶段，也**不**重构 `ship/ci` 实现；这些都已被 roadmap 显式拆到后续 phase。

</domain>

<decisions>
## Implementation Decisions

### Product positioning
- **D-01:** 根入口文档必须把 CodeMap 描述为“AI-first 代码地图工具”，而不是“泛化的实现/发布/HTTP 工具箱”。
- **D-02:** `AI/Agent` 是主要消费者；人类开发者是配置、维护与按需阅读输出的次级使用者。

### Output contract baseline
- **D-03:** Phase 1 必须把“机器可读优先 + 人类可读显式入口”写成统一契约，但在当前 CLI 行为仍保留 legacy flag 形态的地方，必须诚实写出过渡说明，不能把目标态伪装成现状。
- **D-04:** 输出契约的核心措辞必须集中到 AI 文档与 guardrail 中，而不是在 README、AI 指南、命令文档里各自发散。

### Architecture vs CLI boundary
- **D-05:** MVP3 的 `Server Layer` 是架构分层概念，必须保留；公共 `server` CLI 命令是一个独立产品面，不能因为架构层保留就被包装成核心定位。
- **D-06:** `watch`、`report`、`logs`、`server`、旧 `analyze` 八意图、六阶段 workflow、`ship/ci` 关系重构，都只允许在 Phase 1 中被标记为“过渡能力 / 后续 phase 处理”，不能提前混改。

### the agent's Discretion
- Hero 文案、导航顺序、表格字段的具体写法
- “机器可读优先”与“默认机器输出”的具体重复用词
- 对 legacy surface 采用“过渡能力”还是“计划移除”的提示强度，只要不打乱 roadmap 依赖顺序即可

</decisions>

<specifics>
## Specific Ideas

- 设计稿明确提出“默认 `JSON`，人类通过 `--human` 阅读”；当前 CLI 仅部分存在 `--json` / `--output-mode human` 形态，所以本阶段规划必须包含迁移说明，而不是直接宣称已经完成。
- 设计稿明确要求区分“Server Layer 架构概念”和公共 `server` CLI 命令；这个区分必须同时出现在 `ARCHITECTURE.md` 和 AI 文档中。
- 根入口文档应停止把 `ship`、HTTP API、实现型 workflow 当成首屏核心价值，而应把它们降级为详细文档中的过渡面或后续 phase 议题。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning source of truth
- `.planning/PROJECT.md` — brownfield 范围、活跃限制条件与当前产品边界
- `.planning/ROADMAP.md` — Phase 1 目标、成功标准与 `01-01` / `01-02` 计划拆分
- `.planning/REQUIREMENTS.md` — `POS-01`、`POS-02`、`POS-03` 的需求定义
- `.planning/STATE.md` — 当前 phase 状态与高风险入口说明

### User-provided direction
- `/home/stark/.gstack/projects/yuanyuanyuan-mycodemap/stark-main-design-20260324-022633.md` — AI-first 定位、目标输出契约与 `Server Layer` / `server` 命令区分的设计底稿

### Current public docs and guardrails
- `README.md` — 当前公开产品描述、快速开始与核心能力叙事
- `AI_GUIDE.md` — 当前 AI 主入口与速查表
- `docs/ai-guide/README.md` — AI 文档目录入口
- `docs/ai-guide/QUICKSTART.md` — AI 决策树与入门场景
- `docs/ai-guide/COMMANDS.md` — 详细 CLI 命令面与 legacy surface 展示
- `docs/ai-guide/OUTPUT.md` — 当前机器/人类输出说明
- `docs/ai-guide/PATTERNS.md` — 当前 workflow 与使用模式说明
- `ARCHITECTURE.md` — MVP3 分层与 legacy 管线说明
- `scripts/validate-docs.js` — 文档护栏与 CI 强耦合检查

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/index.ts`：公共命令与 flag 的单一事实源，最适合校验当前产品面现实
- `scripts/validate-docs.js`：现成的 docs guardrail，可直接扩展为定位/契约一致性检查
- `node dist/cli/index.js impact -f src/cli/index.ts -t -j`：已验证可用的 blast radius 分析入口

### Established Patterns
- 入口文档采用分层结构：`README.md` → `AI_GUIDE.md` → `docs/ai-guide/*`
- 文档护栏依赖精确字符串；一旦调整入口叙事或示例，往往需要同步更新 `scripts/validate-docs.js`
- 架构文档需要同时容纳 legacy pipeline 与 MVP3 分层，不能把“保留架构层”误写成“保留公共命令”

### Integration Points
- `README.md` ↔ `AI_GUIDE.md` ↔ `docs/ai-guide/README.md`：入口级定位一致性
- `docs/ai-guide/COMMANDS.md` ↔ `docs/ai-guide/OUTPUT.md` ↔ `scripts/validate-docs.js`：输出契约与 guardrail 同步
- `ARCHITECTURE.md` ↔ `src/cli/index.ts`：架构层表述与实际公共命令面不能互相打架

</code_context>

<deferred>
## Deferred Ideas

- 从公共 CLI 删除 `server`、`watch`、`report`、`logs` —— Phase 2
- 将 `analyze` 收敛为 `find/read/link/show` 并处理兼容期 —— Phase 3
- 将 workflow 简化为纯分析四阶段 —— Phase 4
- 把 `ship` 的 check 步骤改为复用 `ci` —— Phase 5
- 共享排除规则与最终文档/CI 护栏收口 —— Phase 6

</deferred>

---

*Phase: 01-positioning-baseline*
*Context gathered: 2026-03-24*
