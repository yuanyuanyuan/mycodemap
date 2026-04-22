# Phase 28: Entry-doc authority and destination map - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `28-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 28-entry-doc-authority-and-destination-map
**Areas discussed:** entry-doc role split, destination ownership, discoverability sync, operational truth sources
**Mode:** Document-driven discuss (requirements + repo fact audit; no additional user Q&A required)

---

## Entry-doc role split

| Option | Description | Selected |
|--------|-------------|----------|
| Keep root `CLAUDE.md` as light execution manual | 继续让路由页保留轻量执行面与 checklist | |
| Make root `CLAUDE.md` a pure router | 只保留导航、加载顺序、下一步去哪读 | ✓ |
| Let `AGENTS.md` absorb more execution framework | 把更多操作性内容并回宪法层 | |

**User's choice:** Auto-selected from the locked requirements doc and repo audit  
**Notes:** `docs/brainstorms/2026-04-22-rules-entry-docs-phase1-structure-consolidation-requirements.md` 已明确否决 “根 `CLAUDE.md` 保留轻量执行面” 与 “`AGENTS.md` 承接更多执行框架”。

---

## Claude adapter model

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `.claude/CLAUDE.md` as a full Claude manual | Claude 保留完整项目手册与通用政策 | |
| Thin adapter only | 只保留 Claude 专属导入 / 装配差异 | ✓ |
| Keep current mixed mode | 保留 adapter + 通用政策混写 | |

**User's choice:** Auto-selected from the locked requirements doc and repo audit  
**Notes:** requirements doc 已锁定 `.claude/CLAUDE.md` 为超薄 adapter；repo audit 也显示当前文件重复了大量通用政策。

---

## Destination ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Create a new governance landing doc | 新建一份文档统一承接迁移内容 | |
| Reuse existing live docs only | 迁移到 `docs/rules/*.md` / `AI_GUIDE.md` / `RTK.md` 等现有文档 | ✓ |
| Push most content back into `AGENTS.md` | 用宪法层承接从两份 `CLAUDE` 文档移出的细节 | |

**User's choice:** Auto-selected from the locked requirements doc and repo audit  
**Notes:** Phase 28 锁定 `existing destinations only`；`AGENTS.md` 不允许重新承接操作性细节。

---

## Discoverability sync

| Option | Description | Selected |
|--------|-------------|----------|
| No discoverability sync | 只改三份入口文档，不碰导航面 | |
| `docs/rules/README.md` minimal sync only | 只在 rules 导航层补最少表达 | |
| Minimal sync in existing nav docs | 优先 `docs/rules/README.md`，必要时补 `AI_GUIDE.md`，但保持导航-only | ✓ |

**User's choice:** Auto-selected from the locked requirements doc and repo audit  
**Notes:** requirements doc 把是否微调 `docs/rules/README.md` / `AI_GUIDE.md` 明确延后到 planning；这里锁定“只做最小导航同步，不重建第二套规则面”。

---

## Operational truth sources

| Option | Description | Selected |
|--------|-------------|----------|
| Keep command/default tables in entry docs | 继续让入口文档重复命令、默认值与 quick refs | |
| Point to live docs and config truth | 验证内容进 `validation.md`，执行协议进 `engineering-with-codex-openai.md`，命令发现进 `AI_GUIDE.md`，默认值以 config 为准 | ✓ |
| Duplicate both doc truth and config truth | 入口文档和 config 各保留一套说明 | |

**User's choice:** Auto-selected from repo fact audit  
**Notes:** `docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md`、`AI_GUIDE.md`、`.claude/rule-system.config.json`、`RTK.md` 已经构成更合适的 live truth surfaces。

---

## the agent's Discretion

- root `CLAUDE.md` 最终采用路径表、场景表还是最小导航清单
- `.claude/CLAUDE.md` 的最小 adapter 文案与装配写法
- 是否需要在 live nav doc 中保留一条极简 migration 指针

## Deferred Ideas

- duplicate drift automation / self-audit
- ghost commands / validation trust / archive identity governance
- 新治理中间层或生成式文档系统
