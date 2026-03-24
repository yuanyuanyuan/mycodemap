# Phase 08: Plugin Runtime Integration - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Roadmap Phase 08 goal + Phase 07 config seam + existing plugin runtime audit

<domain>
## Phase Boundary

本阶段只解决插件产品化的第二段闭环：
1. 让 `generate` 主流程真正初始化、执行并释放已配置插件；
2. 把插件分析结果、生成文件与诊断信息回灌到正式输出契约；
3. 加固失败隔离，保证单个插件失败不会直接拖垮整个 `generate` 流程。

本阶段**不**扩展新的 public CLI 插件子命令、**不**建设 marketplace、**不**把全部插件 UX 文档一次性写完；文档与 guardrail 的全面同步留给 Phase 09。

</domain>

<decisions>
## Implementation Decisions

### Runtime activation
- **D-01:** 只有配置文件**显式声明** `plugins` 段时，`generate` 才启用插件 runtime；不能因为 normalized defaults 存在就让旧项目默认跑插件。
- **D-02:** Phase 07 新增的 `hasExplicitPluginConfig` 必须成为 runtime gate，满足旧项目“零配置不变更”兼容要求。

### Output contract
- **D-03:** 插件结果统一写入 `CodeMap.pluginReport`，并同步到 `AI_MAP.md` 的 `Plugin Summary`，而不是引入第二套临时 stdout-only 输出。
- **D-04:** 插件分析产生的 `additionalEdges` 应并入主依赖图，而不是丢在孤立 side-channel 里。

### Failure isolation
- **D-05:** `load / initialize / analyze / generate` 四个阶段的失败都要落为结构化 `PluginDiagnostic`，不能只写 logger。
- **D-06:** 插件生成文件必须经过输出目录越界保护，避免用户插件把文件写到 `.mycodemap` 之外。

### Loader behavior
- **D-07:** built-in plugin 必须允许“按名字显式启用”，但不能因为目录扫描而重复注册。
- **D-08:** `pluginDir` 必须在 CLI config loader 层解析成绝对路径，否则真实 CLI 下动态 `import()` 会找不到用户插件。

</decisions>

<specifics>
## Specific Ideas

- `PluginSystem` 已具备 initialize / runAnalyze / runGenerate 生命周期，只差主命令接线。
- `PluginRegistry` 当前已能追踪状态机，但失败更多是 logger 级别，仍需结构化回传。
- `PluginLoader` 的 built-in / directory / by-name 三条路径已经存在，是很适合补失败隔离而不是重写的落点。
- `generate` 已经有固定输出文件流，适合在同一流程中顺带写出 plugin-generated files。

</specifics>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — `PLG-04`、`PLG-05`、`PLG-06`
- `.planning/ROADMAP.md` — Phase 08 goal、success criteria 与 plans
- `src/cli/commands/generate.ts` — 运行时接入主入口
- `src/plugins/index.ts` — PluginSystem 生命周期聚合
- `src/plugins/plugin-loader.ts` — built-in / directory / by-name 加载路径
- `src/plugins/plugin-registry.ts` — initialize / analyze / generate 状态与失败隔离
- `src/interface/types/index.ts` — `PluginDiagnostic` / `PluginExecutionReport` 正式输出契约
- `src/generator/index.ts` — `AI_MAP.md` 插件摘要渲染入口

</canonical_refs>

<deferred>
## Deferred Ideas

- 插件作者指南、README 深入用例、AI 文档速查与 docs guardrail 扩围 —— Phase 09
- 插件 marketplace / 远程安装 —— 后续 milestone
- 独立 `plugins` CLI 命令或诊断子命令 —— 后续 milestone

</deferred>

---

*Phase: 08-plugin-runtime-integration*
*Context gathered: 2026-03-24*
