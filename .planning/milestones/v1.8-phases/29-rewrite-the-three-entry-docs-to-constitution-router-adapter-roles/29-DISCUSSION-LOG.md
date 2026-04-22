# Phase 29 Smart Discuss Log

**Phase:** `29`  
**Name:** `Rewrite the three entry docs to constitution / router / adapter roles`  
**Mode:** Autonomous smart discuss  
**Captured:** 2026-04-22T15:24:35+08:00

> 本轮以 `Phase 28` 迁移图为先验真相运行；由于当前会话是自治推进且无 inline 问答 API，以下推荐答案按默认方案自动采纳。若用户后续提出 override，应以 override 为准。

## Grey Area 1/4: 入口文档各自回答什么

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | `AGENTS.md` 保留到什么粒度？ | 只保留仓库级治理、证据协议、改动边界、验证/交付底线 | 保留长表与清单；把操作细节继续留在入口面 |
| 2 | 根 `CLAUDE.md` 应该长什么样？ | 只做角色声明、加载顺序、按问题路由、编辑归宿提示 | 保留执行模板；保留命令速查 |
| 3 | `.claude/CLAUDE.md` 应该长什么样？ | 只解释 Claude 自动读取与 shared truth 的关系 | 保留第二套执行政策；保留 commit/TDD/checklist |
| 4 | 三份入口都要回答 “去哪里改” 吗？ | 只给最小路由，不复写正文 | 每份都附完整规则摘要 |

**Decision:** 接受全部推荐答案。

## Grey Area 2/4: 要不要在入口文档里保留压缩版操作细节

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 根 `CLAUDE.md` 是否保留执行回路？ | 不保留，直接路由到 `docs/rules/engineering-with-codex-openai.md` | 压成 3 行摘要 |
| 2 | 根 `CLAUDE.md` 是否保留验证命令？ | 不保留，直接路由到 `docs/rules/validation.md` | 保留最常用 2-3 条命令 |
| 3 | `.claude/CLAUDE.md` 是否保留任务初始化模板？ | 不保留，迁到工程规则文档 | 继续保留 Claude 专用模板 |
| 4 | `AGENTS.md` 是否保留 RTK 长表？ | 不保留，只留“shell 命令优先加 `rtk`”原则 | 保留整张速查表 |

**Decision:** 接受全部推荐答案。

## Grey Area 3/4: 需要补写哪些 destination docs

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 工程执行模板迁到哪里？ | 补到 `docs/rules/engineering-with-codex-openai.md` | 留在根 `CLAUDE.md` |
| 2 | AI 友好文档规范迁到哪里？ | 补到 `docs/rules/engineering-with-codex-openai.md` 的 docs-sync / authoring 区块 | 保留在 `AGENTS.md` |
| 3 | 验证命令与 rule-system defaults 要不要补写？ | 不补，沿用 `docs/rules/validation.md` 现有真相 | 在 router 里再写一份摘要 |
| 4 | RTK 细节要不要迁回规则文档？ | 不迁，继续以 `RTK.md` 为唯一速查真相 | 拆到多个入口文档 |

**Decision:** 接受全部推荐答案。

## Grey Area 4/4: rewrite 后如何证明没变成第二套规则面

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 验收重点是什么？ | 看角色边界是否清晰、操作细节是否完全迁出、目标文档标签是否同步 | 只看文字是否更短 |
| 2 | 先验证什么？ | 先跑 docs guardrail，再做入口/引用词扫描 | 只靠人工阅读 |
| 3 | 如何记录结果？ | 产出 `29-VERIFICATION.md`，保留失败预演 | 只在聊天里口头说明 |
| 4 | 是否现在就做 discoverability sweep？ | 不在本 phase 展开，把全局引用扫尾留给 Phase 30 | Phase 29 顺手改完所有导航 |

**Decision:** 接受全部推荐答案。

## Deferred Ideas

- 若未来需要自动检测入口文档重复漂移，另开 milestone，不在本 phase 内扩 scope。
- 若后续发现还需要更强的导航层，只能补已有 live docs，不新增治理中间层。
