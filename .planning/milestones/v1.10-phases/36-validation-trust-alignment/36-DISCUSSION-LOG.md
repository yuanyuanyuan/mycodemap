# Phase 36 Smart Discuss Log

**Phase:** `36`  
**Name:** `Validation trust alignment`  
**Mode:** Autonomous smart discuss  
**Captured:** 2026-04-23T11:54:02+08:00

> 本 phase 只统一 validation truth 与 gate 语义的 live-doc 表达，不重写 CI 逻辑本身。

## Grey Area 1/3: 统一哪几份 live docs

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 最小真相面包括哪些文档？ | `README.md`、`AI_GUIDE.md`、`docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md` | 全量 docs sweep |
| 2 | 怎么保持一致？ | 抽成同一组 quick-truth 句子 | 每份文档各写各的摘要 |
| 3 | 需要机器兜底吗？ | 要，把同一组句子接进 `scripts/validate-docs.js` | 只靠人工 review |

**Decision:** 接受全部推荐答案。

## Grey Area 2/3: 这一步强调哪些 gate 语义

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | docs 入口先写什么？ | `npm run docs:check` 是文档/入口变更的 first pass | 只推荐 `ci check-docs-sync` |
| 2 | 统一入口怎么写？ | `ci check-docs-sync` 是统一 docs/AI guardrail 入口 | 把它写成 docs:check 的替代品 |
| 3 | repo-local rules 怎么写？ | `--report-only` 只报告，不阻断 | 混写成 enforce |
| 4 | `warn-only / fallback` 怎么写？ | 明确不是 hard gate success | 只说“非理想状态” |

**Decision:** 接受全部推荐答案。

## Grey Area 3/3: 这一步先不碰什么

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 要不要改 `.githooks/` 或 CI workflow？ | 不改，当前是 docs truth alignment phase | 顺手改 hook / workflow |
| 2 | 要不要处理 archive/live 身份？ | 不要，留给 Phase 37 | 一次性混进来 |
| 3 | 要不要补 release follow-up？ | 不要，继续 deferred | 顺手扩 scope |

**Decision:** 接受全部推荐答案。
