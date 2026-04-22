# Phase 30 Smart Discuss Log

**Phase:** `30`  
**Name:** `Discoverability sweep and zero-duplication verification`  
**Mode:** Autonomous smart discuss  
**Captured:** 2026-04-22T15:24:35+08:00

> 本 phase 以 Phase 29 已完成的 constitution/router/adapter rewrite 为前提，只处理 discoverability 同步与零重复验证；不重新发明规则正文。

## Grey Area 1/3: discoverability sweep 的边界

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 要扫哪些文件？ | live docs + machine-readable index + 仍引用入口角色的 guardrail comments | 只改用户可见 docs；全仓全文替换 |
| 2 | 要不要改 archive / brainstorm？ | 不改，历史文档保留历史事实 | 全部追改 |
| 3 | AI / human 导航如何同步？ | 只改标签与交叉引用，不追加规则正文 | 顺手补更多操作说明 |
| 4 | `docs/rules/README.md` 要不要补入口角色说明？ | 要，用 1-2 行说明 `AGENTS` 定权、`CLAUDE` 路由 | 保持不动 |

**Decision:** 接受全部推荐答案。

## Grey Area 2/3: machine-readable entry labels 如何表述

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | `ai-document-index.yaml` 的 `CLAUDE.md` 描述写什么？ | `Claude/Codex 入口路由` | `最小执行手册` |
| 2 | `llms.txt` 写什么？ | `Claude/Codex 入口路由` | `执行手册` |
| 3 | `README.md` 顶部导航如何写？ | `AI 入口路由、下一步阅读导航` | `AI 执行手册` |
| 4 | `AI_GUIDE.md` 相关文档如何写？ | `入口路由` | `执行手册` |

**Decision:** 接受全部推荐答案。

## Grey Area 3/3: zero-duplication verification 的证据链

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 先验证什么？ | 先 grep 残留引用，再跑 docs guardrails | 只跑 docs guardrails |
| 2 | 失败预演看什么？ | 把 `CLAUDE.md` 再标回“执行手册”或在导航文档补正文 | 只描述 happy path |
| 3 | Phase 28 migration map 要不要继续保留？ | 要，作为最终交付的 authority baseline | 认为 rewrite 后可删除 |
| 4 | scripts 注释中的旧称呼要不要同步？ | 要，同步到 “入口路由” 避免检索漂移 | 忽略代码注释 |

**Decision:** 接受全部推荐答案。
