# Milestone v1.8: entry-docs-structure-consolidation

**Status:** ✅ COMPLETE 2026-04-22
**Phases:** 28-30
**Total Plans:** 3 complete

## Overview

这个 milestone 只解决 rules 入口文档一期结构收敛：把 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md` 明确拆成宪法 / 路由 / Claude adapter 三种角色，并把操作性细节迁回现有 live 文档。
目标不是继续堆规则，而是恢复“单一权威 + 零重复 + 明确导航”的入口面，让贡献者和 agent 从任一入口都能知道哪份文档定权、下一步去哪读、规则变更时该改哪一份。
本 milestone 不新增治理中间层、生成式 drift 系统或自审框架；ghost commands / 验证信任 / archive 身份治理仍保持 deferred，除非结构迁移本身被它们阻断。

## Phases

### Phase 28: Entry-doc authority and destination map

**Goal**: 为 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md` 建立 section 级迁移图，锁定每一类被移出内容的现有归宿文档。
**Depends on**: Nothing (first phase)
**Requirements**: `DEST-01`、`DEST-02`、`ROUTE-04`
**Status**: Complete on 2026-04-22
**Plans**: 1/1 plans complete

Plans:
- [x] **28-01** Build the section-level migration map and destination ownership contract

**Success Criteria** (what must be TRUE):
1. 每个准备从三份入口文档移出的 section 都有明确的 `old section → destination file → why` 映射
2. 所有 destination 都是仓库中已存在的 live 文档，而不是新建治理中间层
3. 维护者能在 phase 输出中看到迁移后应去哪里维护每类规则
4. 本阶段不把自审系统、重复检测自动化或 ghost commands 修复并入 current scope

### Phase 29: Rewrite the three entry docs to constitution / router / adapter roles

**Goal**: 重写 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md`，让三份入口文档分别承担宪法、路由、Claude adapter 单一职责。
**Depends on**: Phase 28
**Requirements**: `AUTH-01`、`AUTH-02`、`AUTH-03`、`DEST-03`
**Status**: Complete on 2026-04-22
**Plans**: 1/1 plans complete

Plans:
- [x] **29-01** Rewrite the three entry docs and move residual execution details to existing live docs

**Success Criteria** (what must be TRUE):
1. `AGENTS.md` 只保留仓库级治理协议、证据协议、改动边界与交付底线
2. 根 `CLAUDE.md` 只保留加载顺序、去哪读下一份文档、相关路由表述，不再携带命令清单、默认值、dogfood 或交付 checklist
3. `.claude/CLAUDE.md` 只保留 Claude 专属导入 / adapter 差异，不再重复通用执行政策、提交策略或快速参考
4. 任何规范性要求在三份入口文档中只出现一次，不再形成第二套规则面

### Phase 30: Discoverability sweep and zero-duplication verification

**Goal**: 恢复从任一入口文档出发的可发现性，必要时同步导航文档，并验证结构收敛后的零重复状态。
**Depends on**: Phase 29
**Requirements**: `ROUTE-01`、`ROUTE-02`、`ROUTE-03`
**Status**: Complete on 2026-04-22
**Plans**: 1/1 plans complete

Plans:
- [x] **30-01** Sweep discoverability surfaces and verify zero-duplication state

**Success Criteria** (what must be TRUE):
1. 从 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md` 任一入口开始，都能快速回答“哪份是权威 / 下一步去哪读 / 规则变更时改哪一份”
2. `AI_GUIDE.md` 与 `docs/rules/README.md` 只在导航表达上做必要同步，不重新成长为第二套规则正文
3. docs-focused 验证能证明入口面与 destination docs 没有再形成重复规范性要求
4. 最终交付物保留 migrated-content map，后续维护者不需要重新猜内容归宿

## Milestone Summary

**Key Decisions:**

- 直接以 `docs/brainstorms/2026-04-22-rules-entry-docs-phase1-structure-consolidation-requirements.md` 作为本 milestone 的 canonical requirements source
- 把入口文档角色锁定为 `AGENTS.md = constitution`、`CLAUDE.md = router`、`.claude/CLAUDE.md = Claude adapter`
- 把零重复作为硬约束，而不是“尽量减少重复”的软目标
- 只允许把移出内容迁移到现有 live 文档，不新增治理中间层

**Issues Resolved (planned):**

- 入口文档同时承载治理规则、执行手册和工具提示，导致权威来源不清
- 根 `CLAUDE.md` 声称自己是路由页，但仍内嵌执行回路、验证命令、默认值与 dogfood
- `.claude/CLAUDE.md` 仍重复通用政策，形成第二套 Claude 手册

**Issues Deferred:**

- 入口文档重复 drift 的自动检测 / 自审机制
- ghost commands、验证可信度与 archive/live 身份治理
- 任何新的治理中间层、生成式文档系统或额外承接机制

**Technical Debt To Watch:**

- `.planning/phases/` 的历史残留工件不应被误判为 `v1.8` active scope
- 迁移后如果导航表达不足，仍需微调 `AI_GUIDE.md` 或 `docs/rules/README.md`
- 结构收敛后还需要后续 milestone 决定是否值得做自动化防漂移系统

---
_For current project status, see `.planning/PROJECT.md`, `.planning/STATE.md`, and `.planning/MILESTONES.md`._
