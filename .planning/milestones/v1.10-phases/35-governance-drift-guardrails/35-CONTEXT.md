# Phase 35: Governance drift guardrails - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 35 只处理入口文档治理 drift 的 guardrail backstop：
- 为 `AGENTS.md` / `CLAUDE.md` / `.claude/CLAUDE.md` / `docs/rules/README.md` 建立 role + routing baseline
- 检测高信号 duplicate policy drift
- 检测 ghost commands / ghost routes / authority routing drift
- 全部复用现有 `scripts/validate-docs.js`、`npm run docs:check` 与 `ci check-docs-sync`

本 phase 不同步 validation truth 文案，也不处理 archive/live 身份治理。

</domain>

<decisions>
## Implementation Decisions

### Scope Guardrails
- 只在现有 docs guardrail 中加一层 entry-doc governance validation
- 不新增 CLI、npm script、治理中间层或 inventory 系统
- 只抓高信号 drift：职责基线、命令面漂移、路由目标失效、治理正文回流

### Validation Strategy
- `rtk npm run docs:check`
- `rtk node dist/cli/index.js ci check-docs-sync`
- `rtk proxy git diff --check`
- verification 里显式记录 4 类 failure rehearsal：duplicate policy、ghost command、ghost route、authority routing

### the agent's Discretion
- 可用字符串/snippet 级 guardrail，而不是过早引入全文相似度比对
- 对 `docs/rules/README.md` 的 bare filename route，可在脚本里映射成真实路径验证

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/validate-docs.js` 已是 repo 的 docs guardrail 主入口
- `node dist/cli/index.js ci check-docs-sync` 已委托 docs guardrail + analyze docs sync
- `AGENTS.md`、`CLAUDE.md`、`.claude/CLAUDE.md`、`docs/rules/README.md` 已有稳定 role baseline，可作为 required snippets

### Established Patterns
- 高信号 docs truth 通过 required/outdated snippets 固定
- 统一 guardrail 失败由 `Documentation guardrails failed` 汇总输出
- 入口文档应该路由，不应该重新长出命令清单或第二套规则正文

### Integration Points
- `scripts/validate-docs.js`
- `package.json` scripts `docs:check`
- `node dist/cli/index.js ci check-docs-sync`

</code_context>

<specifics>
## Specific Ideas

- 为 `CLAUDE.md` / `.claude/CLAUDE.md` 增加 “不得出现 command surface” 检测
- 为 `CLAUDE.md` / `.claude/CLAUDE.md` 增加 “不得复制 AGENTS 级治理 section” 检测
- 为 root router / adapter / rules index 增加 route target existence 检测
- 让失败输出带上 `[entry-doc duplicate-policy]` / `[entry-doc ghost-command]` / `[entry-doc ghost-route]` / `[entry-doc authority-routing]` 前缀

</specifics>

<deferred>
## Deferred Ideas

- README / AI_GUIDE / validation rule 的统一验证顺序速查
- archive/live identity cleanup
- 更广范围的 docs inventory / generation

</deferred>

---

*Phase: 35-governance-drift-guardrails*
*Context gathered: 2026-04-23 after reviewing current entry docs and docs guardrail surfaces*
