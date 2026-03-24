# Phase 09: Plugin Docs & Validation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Roadmap Phase 09 goal + Phase 07/08 implementation audit

<domain>
## Phase Boundary

本阶段只处理插件产品面的最后一段闭环：
1. 把插件配置、运行结果与诊断契约写进 README / AI 文档；
2. 把插件相关事实纳入 docs guardrail 与 docs fixture tests；
3. 用 built-in plugin + user plugin 两条真实 CLI 证据证明产品面可用。

本阶段**不**新增插件 UX 命令、**不**继续扩面到 marketplace / 远程安装、**不**重新定义 runtime 契约。

</domain>

<decisions>
## Implementation Decisions

- **D-01:** 以 `mycodemap.config.json`、`AI_MAP.md` 的 `Plugin Summary`、`codemap.json.pluginReport` 作为插件产品面的 canonical 叙事。
- **D-02:** 文档必须明确：`generate` 没有独立 `--plugin` flags，插件只能通过配置文件 `plugins` 段声明。
- **D-03:** docs guardrail 需要同时约束“配置文件名”“插件配置表”“`pluginReport` 输出契约”“Plugin Summary 提示”，避免只保一个点。
- **D-04:** `VAL-01` 不能只靠单元测试，必须保留至少一条 built-in plugin 和一条 user plugin 的真实 CLI 证据。

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — `DOC-03`、`DOC-04`、`VAL-01`
- `README.md` — 用户主入口
- `AI_GUIDE.md` — AI 速查入口
- `docs/ai-guide/COMMANDS.md` / `OUTPUT.md` / `QUICKSTART.md` / `INTEGRATION.md` — 细化插件行为
- `scripts/validate-docs.js` — docs guardrail
- `src/cli/__tests__/validate-docs-script.test.ts` — docs fixture 回归
- `src/cli/commands/__tests__/generate.test.ts` — runtime + plugin evidence tests

</canonical_refs>

<deferred>
## Deferred Ideas

- 插件作者完整开发手册、发布流程与生态治理 —— 后续 milestone
- 更广历史 archive 文档的 plugin guardrail 扩围 —— 后续整理

</deferred>

---

*Phase: 09-plugin-docs-validation*
*Context gathered: 2026-03-24*
