# Phase 30: Discoverability sweep and zero-duplication verification - Context

**Gathered:** 2026-04-22  
**Status:** Ready for planning  
**Source:** Phase 29 rewrite output + repo-wide terminology scan + autonomous smart discuss defaults

<domain>
## Phase Boundary

本 phase 只做两件事：

1. 最小 discoverability 同步：更新 live docs、索引和 machine-readable metadata 中对 `AGENTS.md` / `CLAUDE.md` / `.claude/CLAUDE.md` 角色的描述；
2. zero-duplication verification：证明入口面与 destination docs 没有重新长成第二套规则正文。

本 phase 不新增规则正文、不改 archive 历史文档、不引入新的导航层。

</domain>

<decisions>
## Implementation Decisions

### Discoverability sync scope
- 只修改 live docs、machine-readable indexes 和仍会影响检索的 guardrail comments。
- `README.md`、`AI_GUIDE.md`、`docs/rules/README.md`、`ARCHITECTURE.md`、`docs/ai-guide/INTEGRATION.md`、`ai-document-index.yaml`、`llms.txt` 是首批同步面。
- archive / brainstorm / completed retrospectives 保留历史表述，不作为本 phase 修改对象。

### Navigation wording
- `CLAUDE.md` 的统一称呼改为“入口路由”或“下一步阅读导航”，不再叫“执行手册”。
- `docs/rules/README.md` 明确说明：`AGENTS.md` 定权，`CLAUDE.md` 负责把 agent 路由到本目录与其他 live docs。
- 任何导航补写都只能回答“去哪读 / 去哪改”，不能追加规则正文。

### Verification strategy
- 先做术语扫描，再跑 `npm run docs:check` 与 `node dist/cli/index.js ci check-docs-sync`。
- 保留 `Phase 28` migration map 作为最终 authority baseline，证明维护者不需要重新猜内容归宿。
- 若 guardrail comment 仍写旧角色称呼，同步为“入口路由”，避免检索漂移。

</decisions>

<specifics>
## Specific Ideas

- `README.md` 顶部 AI 文档入口是最容易让新 agent 误解 `CLAUDE.md` 角色的地方，必须改成 router 表述。
- `ai-document-index.yaml` 与 `llms.txt` 是 machine-readable discoverability 面，必须和 live docs 使用同一套称呼。
- `scripts/validate-docs.js` 虽非用户文档，但它承载 docs guardrail 的 repo truth，旧称呼会让后续检索再次飘移。

</specifics>

<canonical_refs>
## Canonical References

- `.planning/phases/28-entry-doc-authority-and-destination-map/28-ENTRY-DOC-MIGRATION-MAP.md`
- `.planning/phases/29-rewrite-the-three-entry-docs-to-constitution-router-adapter-roles/29-VERIFICATION.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.claude/CLAUDE.md`
- `README.md`
- `AI_GUIDE.md`
- `docs/rules/README.md`
- `ARCHITECTURE.md`
- `ai-document-index.yaml`
- `llms.txt`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 28 migration map 已锁定 authority split 与 destination ownership
- Phase 29 已完成入口文档 rewrite，本 phase 只需同步外围 discoverability surfaces

### Established Patterns
- 导航文档只做路由，不复写规则正文
- machine-readable index 应与 live docs 使用同一套术语

### Integration Points
- 本 phase 会修改 live docs、索引与 docs guardrail 注释
- 本 phase 会通过 docs guardrails 和术语扫描固定 zero-dup baseline

</code_context>

<deferred>
## Deferred Ideas

- archive / brainstorm 历史文档术语统一
- 自动化重复漂移检测

</deferred>
