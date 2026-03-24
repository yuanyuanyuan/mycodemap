# Phase 07: Plugin Contract & Config Surface - Research

**Researched:** 2026-03-24
**Domain:** CLI config contract + plugin loading seam
**Confidence:** HIGH

<research_summary>
## Summary

第一，仓库已经具备插件系统骨架，但没有正式产品化入口。`PluginLoader` 支持 `builtInPlugins`、`pluginDir`、`plugins` 与 `debug`，`PluginSystem` 也具备 initialize / runAnalyze / runGenerate 的生命周期；然而这些能力完全没有接到当前 CLI 主流程上。换句话说，问题不是“没有插件系统”，而是“插件系统不在产品面上”。

第二，当前配置面存在明显断层。`initCommand()` 会生成 `mycodemap.config.json`，`resolveConfigPath()` 也支持新旧配置文件名回退，但 `generateCommand()` 依旧直接硬编码 `mode/rootDir/output`，没有读取任何配置文件。这意味着只在类型或 schema 上加插件字段是无效的；必须同时补一个真正被 CLI 消费的 config loader / normalizer。

第三，现有依赖中没有专门的 JSON Schema runtime validator，仓库也更偏向 focused tests + 轻量 guardrail，而不是为单一配置面引入大型校验库。因此 Phase 07 的最佳路线不是引入新依赖，而是：复用现有 `resolveConfigPath()` 与 schema/type/default config，增加一个小而明确的 config loader，对插件字段做手工归一化与错误报告。

**Primary recommendation:** 先建立单一配置事实源（type + schema + init + loader），再把 `generate` 切到“先读配置、先做插件配置校验”的入口模式，为 Phase 08 的运行时接入铺路。
</research_summary>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Reuse existing runtime option shape
不要为配置文件再定义一套与 `PluginLoadOptions` 平行但不兼容的字段。Phase 07 应尽量让配置结构与 loader 选项同构，这样 Phase 08 接入运行时才不会再做一次 shape conversion 重构。

### Pattern 2: CLI-owned config loading
配置文件路径兼容、JSON 读取、默认值合并、错误消息格式化，这些都属于 CLI 入口职责。Interface Layer 继续只提供 `CodemapConfig` 与相关类型；否则会把文件系统副作用扩散到本不需要知道磁盘的层。

### Pattern 3: Validate before integrate
在真正运行插件前，先让 `generate` 进入“读取配置并拒绝坏配置”的状态。这能把 Phase 07 和 Phase 08 分出清晰边界：前者解决契约和入口，后者解决运行时与结果暴露。

### Pattern 4: Minimal docs sync for config changes
仓库规则要求配置项变更同步文档；但完整插件用户指南属于 Phase 09。最稳妥的做法是 Phase 07 只修正配置名称/字段的 canonical examples，Phase 09 再扩展 AI docs、guardrail 和作者指南。

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 插件配置字段设计 | 再造一套 `pluginSettings` 私有结构 | 复用 `PluginLoadOptions` 语义 | 减少 shape drift 与后续桥接成本 |
| 配置路径兼容 | 手写第二套 config path 查找 | 复用 `resolveConfigPath()` | 仓库已内建新旧文件名兼容逻辑 |
| 配置校验依赖 | 为此单独引入大型 schema validator | 轻量 normalize + focused tests | 当前依赖栈和代码风格都更偏轻量 |

**Key insight:** Phase 07 的主要风险不是“功能不够多”，而是“事实源太多、入口没打通”。解决这个问题靠收敛，不靠堆新抽象。
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: 只改类型，不改真实入口
**What goes wrong:** `CodemapConfig` 和 schema 看起来支持插件，但 CLI 仍完全忽略配置文件。  
**Why it happens:** 容易把 Phase 07 当成纯类型任务。  
**How to avoid:** 把 `generateCommand()` 纳入本 phase 计划，至少做到读取与校验配置。  
**Warning signs:** 测试仍只断言 `generateCommand` 传固定 `output`，没有配置 fixture。

### Pitfall 2: 静默吞掉坏配置
**What goes wrong:** 非法插件路径、错误字段类型或拼写错误被默默忽略，用户以为插件生效了。  
**Why it happens:** “兼容旧配置”很容易被误用成“任何坏值都跳过”。  
**How to avoid:** 区分“字段缺失可回退默认值”和“字段存在但非法必须报错”。  
**Warning signs:** loader 只有 warning，没有 hard failure 测试。

### Pitfall 3: 配置面与文档再次漂移
**What goes wrong:** 实现已经切到 `mycodemap.config.json` + 新插件字段，README / setup 还保留旧名字或旧示例。  
**Why it happens:** 认为 Phase 09 才做 docs，因此当前可以先放着。  
**How to avoid:** 至少修正 canonical config example，并给 docs guardrail 留好 fixture。  
**Warning signs:** README 仍写 `codemap.config.json`，而 `initCommand()` 已输出新文件名。

### Pitfall 4: Phase 07 scope creep into runtime/plugin UX
**What goes wrong:** 还没定好配置契约，就顺手开始做插件列表、运行结果输出、debug UX。  
**Why it happens:** 插件骨架现成，容易“顺手接一点”。  
**How to avoid:** 把“插件执行与结果对外可见”明确留给 Phase 08。  
**Warning signs:** 计划中开始修改 `PluginSystem.runGenerate()` 输出契约或 README 大段使用教程。

</common_pitfalls>

<open_questions>
## Open Questions

1. **CLI 显式参数与配置文件默认值的优先级怎么定？**  
   - What we know: 现有 `generateCommand(options)` 已支持显式 `mode/output`。  
   - What's unclear: 是否需要新增 `--config` 或更细粒度 override。  
   - Recommendation: Phase 07 采用最小规则——CLI 显式参数优先于配置文件，先不新增新的 public flags。

2. **Phase 07 是否要同步所有插件文档？**  
   - What we know: 配置项变更必须同步文档，但完整插件 guide 已被 roadmap 放到 Phase 09。  
   - What's unclear: 最小同步边界画在哪里。  
   - Recommendation: Phase 07 只同步 canonical config examples / setup facts；完整 AI docs 和 guardrail 扩围留在 Phase 09。

</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `src/plugins/plugin-loader.ts` — 现有插件加载选项与生命周期入口
- `src/plugins/index.ts` — 现有插件系统主类与分析/生成钩子入口
- `src/interface/config/index.ts` — 当前正式配置类型
- `src/cli/commands/init.ts` — 默认配置与新旧配置迁移事实
- `src/cli/paths.ts` — config path fallback 事实
- `src/cli/commands/generate.ts` — 当前未消费配置文件的主流程事实
- `README.md` — 当前配置说明入口与配置文件名漂移样本
- `mycodemap.config.schema.json` — 当前 schema 事实源

</sources>

---

*Phase: 07-plugin-contract-config-surface*
*Research completed: 2026-03-24*
*Ready for planning: yes*
