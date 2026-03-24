# Phase 09: Plugin Docs & Validation - Research

**Researched:** 2026-03-24
**Domain:** plugin docs sync + guardrail + e2e evidence
**Confidence:** HIGH

<research_summary>
## Summary

第一，Phase 07/08 已经把插件配置与 runtime 实现落到代码里，但如果 README / AI 文档不同步，用户仍然会按旧认知操作，例如继续寻找 `codemap.config.json` 或误以为 `generate` 有独立 `--plugin` flags。Phase 09 的核心不是“多写几段文档”，而是让用户入口与实现事实重新对齐。

第二，插件产品面比前几轮更容易发生“局部同步、整体漂移”。仅更新 README 不够，因为 AI 代理主要依赖 `AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md` 与 `docs/ai-guide/OUTPUT.md`；如果 `pluginReport` 契约没有进入这些机器友好文档，AI 仍会把插件结果当成未知字段。

第三，docs guardrail 需要覆盖插件新增事实，而不仅仅是分析/工作流旧边界。`mycodemap.config.json`、`plugins` 表、`Plugin Summary`、`pluginReport` 和诊断阶段说明都必须成为脚本级断言，否则以后再改实现时会再次漂移。

**Primary recommendation:** 把插件配置与输出契约同时写进人类入口和 AI 入口，并用 guardrail + 真实 CLI built-in/user plugin 证据双重锁定。
</research_summary>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: 只在 README 写插件说明
**What goes wrong:** 人类文档知道了，AI 文档仍不知道 `pluginReport`。  
**How to avoid:** 同步更新 `AI_GUIDE.md`、`COMMANDS.md`、`OUTPUT.md`、`QUICKSTART.md`、`INTEGRATION.md`。

### Pitfall 2: docs guardrail 只校验配置文件名
**What goes wrong:** 文件名不漂移了，但 `pluginReport` 字段、Plugin Summary 约定又悄悄变了。  
**How to avoid:** 把输出契约和诊断说明一起写入 `validate-docs.js`。

### Pitfall 3: 仍然只靠 mock tests 证明插件可用
**What goes wrong:** 文档写得完整，但真实 CLI 下 user plugin 依旧可能因为路径或 ESM 解析失败。  
**How to avoid:** 保留 built-in plugin 和 user plugin 的真实 fixture 验证证据。

</common_pitfalls>

<sources>
## Sources

- `README.md`
- `AI_GUIDE.md`
- `docs/ai-guide/COMMANDS.md`
- `docs/ai-guide/OUTPUT.md`
- `docs/ai-guide/QUICKSTART.md`
- `docs/ai-guide/INTEGRATION.md`
- `scripts/validate-docs.js`
- `src/cli/__tests__/validate-docs-script.test.ts`

</sources>

---

*Phase: 09-plugin-docs-validation*
*Research completed: 2026-03-24*
*Ready for planning: yes*
