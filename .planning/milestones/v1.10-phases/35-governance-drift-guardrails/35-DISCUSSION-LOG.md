# Phase 35 Smart Discuss Log

**Phase:** `35`  
**Name:** `Governance drift guardrails`  
**Mode:** Autonomous smart discuss  
**Captured:** 2026-04-23T11:49:06+08:00

> 本 phase 只给现有 `docs:check` / `ci check-docs-sync` 增加 entry-doc governance drift backstop；不新建治理 CLI，也不重写入口文档正文。

## Grey Area 1/3: 入口文档到底检测什么

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | duplicate drift 检什么？ | 检高信号治理正文是否从 `AGENTS.md` 漂回 `CLAUDE.md` / `.claude/CLAUDE.md` | 做全文相似度比对 |
| 2 | ghost command 检什么？ | 检入口文档是否重新出现 `npm run` / `node dist/cli` / `$gsd-` 这类可执行命令面 | 只检查文件存在性 |
| 3 | ghost route 检什么？ | 检入口路由指向的 live docs / index 文件是否真实存在 | 人工 review |
| 4 | authority routing 怎么验？ | 验证 constitution / router / adapter 基线语句仍存在 | 只看标题 |

**Decision:** 接受全部推荐答案。

## Grey Area 2/3: 检测入口放哪

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 新检测放哪？ | `scripts/validate-docs.js` | 新建 `validate-entry-docs.js` |
| 2 | 如何触发？ | 继续走 `npm run docs:check` 与 `ci check-docs-sync` | 新增独立 npm script |
| 3 | 失败输出如何分类？ | 明确分成 `duplicate-policy` / `ghost-command` / `ghost-route` / `authority-routing` | 统一报 generic docs failure |

**Decision:** 接受全部推荐答案。

## Grey Area 3/3: 这一步先不做什么

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 要不要现在同步 README / AI_GUIDE 验证顺序？ | 不要，留给 Phase 36 | 一次性都做完 |
| 2 | 要不要现在处理 archive/live 身份文案？ | 不要，留给 Phase 37 | 顺手一起改 |
| 3 | 要不要给 archive 文档补 guardrail？ | 不要；只校 live routing/docs surface | 回填全部历史工件 |

**Decision:** 接受全部推荐答案。
