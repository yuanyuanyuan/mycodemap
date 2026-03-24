# Phase 07: Plugin Contract & Config Surface - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Roadmap Phase 07 goal + repo config/plugin audit

<domain>
## Phase Boundary

本阶段只处理“插件扩展点产品化”的第一段闭环：
1. 给 `CodemapConfig`、JSON Schema、默认配置与配置解析入口补上正式插件配置面；
2. 让 CLI 在进入主流程前就能读取并校验插件配置，而不是继续忽略配置文件；
3. 为下一阶段的插件运行时接入预留明确的 normalized config seam。

本阶段**不**真正执行插件钩子、**不**新增独立 `plugins` 公共 CLI 命令、**不**建设插件生态/marketplace、**不**顺手切入图数据库后端生产化。

</domain>

<decisions>
## Implementation Decisions

### Config contract
- **D-01:** 插件配置面优先复用现有 `PluginLoadOptions` 语义，即围绕 `builtInPlugins`、`pluginDir`、`plugins`、`debug` 建立正式配置字段，而不是再发明第二套概念。
- **D-02:** 插件配置必须是可选且向后兼容的；没有 `plugins` 段的现有项目仍应保持当前行为。

### Source of truth
- **D-03:** `src/interface/config/index.ts`、`mycodemap.config.schema.json`、`src/cli/commands/init.ts` 默认配置、以及新的 config loader/normalizer 必须同步收口，不能继续各自维护事实。
- **D-04:** 磁盘配置读取与路径兼容逻辑保留在 CLI 侧（`src/cli/`），Interface Layer 继续只承载类型与契约。

### Scope control
- **D-05:** Phase 07 只负责“读配置、验配置、归一化配置”；真正把插件运行接到 `generate` / analyze 主链路属于 Phase 08。
- **D-06:** 任何本阶段新增的配置项，都必须至少同步最小配置文档入口，避免仓库再次出现“实现改了，配置说明没改”的坏链；更完整的 AI 文档与 guardrail 扩围留到 Phase 09。

### Failure handling
- **D-07:** 非法插件配置必须在 CLI / config loading 阶段硬失败并给出可操作错误，而不是静默忽略。
- **D-08:** 旧配置文件名 `codemap.config.json` 的回退支持保留，但新的插件契约只以 `mycodemap.config.json` / schema 为主叙事。

### the agent's Discretion
- config loader 文件命名与具体放置（只要仍在 `src/cli/`）
- 配置错误对象的内部结构与消息文案
- `generate` 对 CLI 显式 flag 与配置文件默认值的合并实现细节

</decisions>

<specifics>
## Specific Ideas

- `src/cli/paths.ts` 已经提供 `resolveConfigPath()`，但当前主流程没有真正消费它。
- `src/cli/commands/init.ts` 生成的是 `mycodemap.config.json`，而 README 仍写成 `codemap.config.json`，这是现成的漂移样本。
- `src/cli/commands/generate.ts` 当前只把 `mode/rootDir/output` 传给 `analyze()`，完全没有读取配置文件。
- `src/plugins/plugin-loader.ts` 已有 `PluginLoadOptions` 与加载入口，说明当前缺的不是插件骨架，而是配置契约和接入 seam。

</specifics>

<canonical_refs>
## Canonical References

### Milestone / Requirement
- `.planning/PROJECT.md` — 当前 milestone 目标、范围边界与 out-of-scope
- `.planning/REQUIREMENTS.md` — `PLG-01`、`PLG-02`、`PLG-03`
- `.planning/ROADMAP.md` — Phase 07 goal、success criteria 与 plan 拆分
- `.planning/STATE.md` — 当前 phase 状态与累积风险

### Config Surface
- `src/interface/config/index.ts` — 正式 `CodemapConfig` 类型定义
- `mycodemap.config.schema.json` — 机器可读配置 schema
- `src/cli/commands/init.ts` — 默认配置生成与新旧配置文件迁移
- `src/cli/paths.ts` — `mycodemap.config.json` / `codemap.config.json` 路径兼容逻辑

### Runtime / Integration
- `src/cli/commands/generate.ts` — 当前生成入口；尚未消费 config loader
- `src/plugins/types.ts` — `PluginLoadOptions` 语义事实源
- `src/plugins/plugin-loader.ts` — 插件加载选项与生命周期入口

### Docs / Guardrails
- `README.md` — 当前配置说明入口，已存在配置文件名漂移
- `scripts/validate-docs.js` — docs guardrail 主检查脚本
- `src/cli/__tests__/validate-docs-script.test.ts` — docs guardrail fixture tests

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolveConfigPath()`：已支持新旧配置文件名回退，可直接复用。
- `PluginLoadOptions`：已经定义了与插件加载最接近的选项面，适合作为配置契约参考。
- `src/cli/commands/__tests__/generate.test.ts` 与 `src/cli/__tests__/generate.test.ts`：可作为 config loading / precedence 回归测试的起点。

### Established Patterns
- 公共 CLI 的文件系统兼容逻辑集中在 `src/cli/`，而不是散落到 domain/interface。
- 配置/schema/默认值一旦改动，就需要同步 README / docs guardrail / 测试入口。
- 当前仓库倾向于用 focused Vitest 回归，而不是为一个小契约引入重型新依赖。

### Integration Points
- `generateCommand()` 是 Phase 07 必须切入的第一个 CLI 入口。
- `initCommand()` 与 `mycodemap.config.schema.json` 是配置默认值与用户发现面的事实源。
- Phase 08 会在本阶段产出的 normalized config seam 上继续接入 `PluginLoader`。

</code_context>

<deferred>
## Deferred Ideas

- 插件运行结果如何注入 `generate` / analyze 输出 —— Phase 08
- 已加载插件列表、诊断命令、用户插件可观测性 —— Phase 08/09
- 插件作者指南、完整 AI 文档、docs guardrail 扩围 —— Phase 09
- KuzuDB / Neo4j 生产化、HTTP API 产品面 —— 后续 milestone

</deferred>

---

*Phase: 07-plugin-contract-config-surface*
*Context gathered: 2026-03-24*
