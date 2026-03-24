# Phase 08: Plugin Runtime Integration - Research

**Researched:** 2026-03-24
**Domain:** plugin runtime wiring + failure isolation
**Confidence:** HIGH

<research_summary>
## Summary

第一，仓库并不缺插件运行时骨架。`PluginSystem` 已经封装了 `initialize / runAnalyze / runGenerate / dispose`，`PluginLoader` 也已经支持 built-in plugin、目录扫描和按名字加载。这意味着 Phase 08 的核心不是“发明 runtime”，而是把已有 runtime 正式接到 `generate`，并为失败路径补结构化可观测性。

第二，兼容性边界比“跑起来”更重要。Phase 07 引入的 normalized defaults 会让 `plugins` 配置看起来总是存在；如果 `generate` 直接依据 defaults 启用 runtime，就会让没有 `plugins` 段的旧项目突然开始加载 built-in plugins，破坏 `D-02` 的向后兼容承诺。因此 Phase 08 必须显式依赖 `hasExplicitPluginConfig`。

第三，真实 CLI 场景暴露了比单测更刁钻的问题。用户插件目录如果只保留相对路径，真实 `import(pluginPath)` 解析会失败；同理，如果 built-in plugin 既从目录扫描又从名字加载，注册表会重复。这些都说明 Phase 08 需要以“主流程 + 真实 CLI spot-check”为设计中心，而不是只靠 mock tests。

**Primary recommendation:** 不重写插件 runtime；直接在 `generate` 上接 `PluginSystem`，同时用 `pluginReport`、`Plugin Summary`、diagnostics 与路径越界保护把可观测性和安全边界一次补齐。
</research_summary>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Explicit opt-in runtime
Phase 08 必须把“配置显式 opt-in”当成 runtime 激活条件，而不是把 default config 误当成用户意图。

### Pattern 2: Structured diagnostics over logger-only failure
logger 可以保留，但最终必须沉淀到 `PluginDiagnostic[]`，否则 AI / CLI / docs 都没法稳定消费失败结果。

### Pattern 3: Main-output-first observability
`AI_MAP.md` 与 `codemap.json` 已是现有用户必读输出，插件结果也应落在那里，而不是增加新的临时文件或 stdout-only contract。

### Pattern 4: Guard output paths like user input
用户插件生成文件本质上是不可信输入；必须做 `outputDir` 越界保护，不能默认认为插件路径永远安全。

</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: 旧项目被默认启用插件
**What goes wrong:** 没有 `plugins` 段的仓库也开始加载 built-in plugin，导致行为悄悄变化。  
**How to avoid:** runtime 只看 `hasExplicitPluginConfig`，不直接看 normalized defaults。

### Pitfall 2: 插件失败只打日志，不进入输出契约
**What goes wrong:** 终端滚过去一堆 warn，但 `codemap.json` 无法告诉 AI 哪个插件在哪个阶段失败。  
**How to avoid:** 统一用 `PluginDiagnostic` 暴露 `load / initialize / analyze / generate` 四阶段。

### Pitfall 3: 用户插件在真实 CLI 下找不到
**What goes wrong:** 单测里路径正常，真实项目里 `pluginDir: "./codemap-plugins"` 却无法 `import()`。  
**How to avoid:** 在 config loader 中把 `pluginDir` 归一化为绝对路径。

### Pitfall 4: 插件文件写出越界
**What goes wrong:** 恶意或粗心插件用 `../` 把生成文件写到 `.mycodemap` 之外。  
**How to avoid:** 写文件前用 `resolvePluginOutputPath()` 做边界校验。

</common_pitfalls>

<sources>
## Sources

- `src/cli/commands/generate.ts`
- `src/plugins/index.ts`
- `src/plugins/plugin-loader.ts`
- `src/plugins/plugin-registry.ts`
- `src/interface/types/index.ts`
- `src/generator/index.ts`
- `src/cli/commands/__tests__/generate.test.ts`

</sources>

---

*Phase: 08-plugin-runtime-integration*
*Research completed: 2026-03-24*
*Ready for planning: yes*
