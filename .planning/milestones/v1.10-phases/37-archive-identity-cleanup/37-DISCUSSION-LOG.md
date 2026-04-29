# Phase 37 Smart Discuss Log

**Phase:** `37`  
**Name:** `Archive identity cleanup`  
**Mode:** Autonomous smart discuss  
**Captured:** 2026-04-23T11:58:41+08:00

> 本 phase 只修 active vs archived planning identity，不回填全部历史 archive 内容。

## Grey Area 1/3: 哪些面最容易混淆

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | active truth 看哪里？ | 根 `.planning/PROJECT.md` / `ROADMAP.md` / `REQUIREMENTS.md` / `STATE.md` | `MILESTONES.md` 也算 active truth |
| 2 | archive truth 看哪里？ | `.planning/milestones/*` 是历史快照；`MILESTONES.md` 是索引，不是当前执行面 | 靠读者自己推断 |
| 3 | 哪些文件优先修？ | `MILESTONES.md`、`RETROSPECTIVE.md`、最新 `v1.9` archived docs | 回填所有旧 archive |

**Decision:** 接受全部推荐答案。

## Grey Area 2/3: archive note 如何表达

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | archived docs 要不要显式写 note？ | 要，至少最新 archived roadmap / requirements / audit 要有 snapshot note | 只改目录名 |
| 2 | `MILESTONES.md` 怎么防止 “What’s next” 误导？ | 顶部显式声明：下方 entries 是 historical snapshot | 逐条重写所有历史 entry |
| 3 | `RETROSPECTIVE.md` 怎么处理？ | 顶部声明它是 lessons archive，不是 current planning surface | 保持沉默 |

**Decision:** 接受全部推荐答案。

## Grey Area 3/3: 这一步不做什么

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|----------------|
| 1 | 要不要重写所有旧 milestone archive？ | 不要，只修当前导航与最新 archive boundary | 全量批量回填 |
| 2 | 要不要新建治理中间层？ | 不要；只在 `.planning/milestones/README.md` 补 archive index note | 再造新 planning router |

**Decision:** 接受全部推荐答案。
