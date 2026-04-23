# CodeMap

## What This Is

CodeMap 仍是一个面向 AI / Agent 的代码地图工具。`v1.4` 已把 `design validate → design map → design handoff → design verify` 收口为正式 public collaboration chain；`v1.6` 把 Agent-facing CLI 的机器契约真相继续收口；`post-v1.6` 补齐了 opt-in symbol-level graph 与 experimental local MCP 的最小可信纵向切片；`v1.7` 则把 repo-local rule control 与 `mycodemap init` 项目级 AI 基础设施收敛成可验证 contract；`v1.8` 进一步把 rules 入口文档面收敛成 constitution / router / adapter 三层结构；`v1.9` 已把 milestone closeout 与 npm release 的发布治理面收敛成统一 `/release` contract。

`v1.8` 已完成：`AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md` 现在分别承担宪法 / 路由 / Claude adapter 单一职责，操作性细节已迁回现有 live 文档，入口面恢复为单一权威、零重复、可导航的结构。`v1.9` 已完成 docs + skill + dry-run readiness 三个 phase，随后又用 `Phase 34` 关闭了 `pre-release-checklist.md` 中的 helper-first authority drift，使 `/release` 再次回到唯一推荐入口。

2026-04-18 起，规划边界已经调整：**Docker / ArcadeDB 原型线不再属于当前版本范围**。此前 `v1.5` 的 22-24 phase 保留为历史工件，但不会继续作为 active work。

## Core Value

为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## Latest Completed Milestone: v1.9 release-governance-unification

**Goal:** 定义并验证统一 `/release` 发布治理流程，将 milestone closeout、版本映射、双确认门与现有 npm/GitHub 发布工具链串成一个薄编排入口。
**Status:** Closed as a planning milestone on 2026-04-23; real npm / GitHub release remains out of scope until a future explicit `/release v1.9`

**Target features:**
- `docs/rules/release.md` 成为 `/release` 的权威流程文档
- `AGENTS.md`、`CLAUDE.md`、deployment 与 pre-release 文档能路由到 release 权威文档
- `.claude/skills/release/SKILL.md` 提供带双确认门的薄编排器
- 验证覆盖 docs guardrails、docs-sync 与关键失败场景预演
- 已清理 `docs/rules/pre-release-checklist.md` 中 helper-first 竞争入口，并补强 `VAL-01` 的 authority drift 证明面

## Previous Completed Milestone: v1.8 entry-docs-structure-consolidation

**Goal:** 收敛三层入口文档面，恢复“单一权威 + 零重复 + 明确路由”的治理入口结构。

**Delivered outcome:**
- `AGENTS.md` / `CLAUDE.md` / `.claude/CLAUDE.md` 已稳定收敛为 constitution / router / Claude adapter
- `Phase 28` 迁移图固定了“旧 section → 新归宿文件”的长期 authority baseline
- `Phase 29` 把入口文档中的执行回路、命令块、RTK 长表、Claude 第二手册与会话 mem payload 全部迁出
- `Phase 30` 同步了 README、AI_GUIDE、rules index、ARCHITECTURE、AI index 与 docs guardrail terminology，完成 zero-duplication verification

## Earlier Completed Milestone: v1.7 init-and-rule-hardening

**Goal:** Close repo-local rule-control hardening and make `mycodemap init` a project-level AI infrastructure state reconciler.

**Delivered outcome:**
- Phase 27 shipped repo-local capability baseline, validator contract, hooks/CI backstop, scoped rule-context injection, and executable QA.
- Phase 999.1 shipped canonical `.mycodemap/config.json`, reconciliation preview, machine-readable receipt, hook/rule packaging, manual AI context snippets, docs guardrails, and tarball smoke evidence.
- Open artifacts were acknowledged at close and recorded as deferred rather than hidden.

## Historical Closed Branch: v1.5 Isolated ArcadeDB Server-backed Prototype

**Status:** Closed on 2026-04-18 by user direction

**Closure rule:**
- 不需要 Docker
- 不需要 ArcadeDB
- `Phase 22-24` 不再继续处理
- 如未来真的要重开类似方向，必须以全新 milestone 重新定 scope，而不是恢复旧 blocker

## Requirements

### Validated

- ✓ 代码库已经能生成代码地图和结构化分析结果 —— existing
- ✓ 代码库已经提供 `query` / `deps` / `cycles` / `complexity` / `impact` / `analyze` / `export` / `ci` 等核心分析能力 —— existing
- ✓ `analyze` 公共契约已收口为 `find` / `read` / `link` / `show` 四意图 —— v1.0 / Phase 3
- ✓ `workflow` CLI help 与运行时实现当前是 analysis-only 四阶段，不再把 `commit` / `ci` 当作真实 phase —— v1.0 / runtime validated
- ✓ 插件系统已经拥有正式配置入口、runtime 接入与 `pluginReport` diagnostics —— v1.1 / Phases 07-09
- ✓ graph storage 正式产品面已收敛为 `filesystem` / `memory` / `kuzudb` / `auto`，历史 `neo4j` 配置走显式迁移诊断 —— v1.2-v1.3
- ✓ docs sync 自动检查已进入 CI / must-pass 路径 —— v1.3 / Phase 16
- ✓ 人类可通过受文档约束的 design contract 定义 feature goal、constraints、acceptance criteria 与 explicit exclusions —— v1.4 / Phase 17
- ✓ CodeMap 可把 design contract 与代码图对齐，输出 candidate files/modules、dependencies、test impact、risk 与 unknowns —— v1.4 / Phase 18
- ✓ 系统可生成同时面向人类审核和机器消费的 handoff package，并保留 assumptions / approvals / open questions —— v1.4 / Phase 19
- ✓ design / workflow / docs drift 可被 guardrail 明确检出，且 `design verify` 已把 acceptance criteria 映射为 checklist / drift report —— v1.4 / Phase 20
- ✓ `analyze find` 现在能在 stdout 中区分 success / `partialFailure` / failure truth，而不是静默返回可信空结果 —— v1.6 / Phase 25
- ✓ 相邻 dogfood CLI 契约（`complexity` / `ci assess-risk` / `workflow start`）与 AI docs truth 已同步收口 —— v1.6 / Phase 25
- ✓ `generate --symbol-level` 现在能持久化 symbol-level graph truth，并在退化场景保留 `partial` / failure metadata —— post-v1.6 / Phase 26
- ✓ experimental local MCP 已能基于 symbol graph 暴露 `codemap_query` / `codemap_impact`，同时保持 `stdout` protocol purity —— post-v1.6 / Phase 26
- ✓ repo-local rule control 已具备 capability baseline、validator exit contract、hooks/CI backstop、scoped rule-context 与 executable QA —— v1.7 / Phase 27
- ✓ `mycodemap init` 已升级为项目级 AI 基础设施状态收敛器，覆盖 `.mycodemap/config.json`、receipt、hooks、rules、docs 与 package smoke —— v1.7 / Phase 999.1
- ✓ 入口文档已按 `AGENTS.md = constitution`、`CLAUDE.md = router`、`.claude/CLAUDE.md = Claude adapter` 收口 —— v1.8 / Phase 29
- ✓ “旧 section → 新归宿文件” 迁移图与 discoverability 同步已完成，入口面不再保留第二套规则正文 —— v1.8 / Phase 28-30
- ✓ 维护者现在可以通过 `docs/rules/release.md` 理解 milestone closeout ↔ npm release 的 1:1 绑定、版本映射、双确认门与失败处理 —— v1.9 / Phase 31
- ✓ Claude `/release` skill 已固定 refusal cases、major jump 警告与双确认门，并委托现有 release tooling —— v1.9 / Phase 32
- ✓ release docs / routing / skill 已通过 docs guardrails、pre-release guardrail、docs-sync 与 diff hygiene 验证 —— v1.9 / Phase 33
- ✓ `pre-release-checklist.md` 不再把 release helper 呈现为绕过 `/release` 的推荐主入口 —— v1.9 / Phase 34

### Active

- [ ] 选择下一个 milestone，或在干净工作树与双确认门下显式执行未来真实 `/release v1.9`

### Out of Scope

- 恢复 `Phase 22-24` 作为当前版本待办 —— 已关闭的历史分支不能重新回流
- 重新引入 Docker / ArcadeDB 作为默认下一步 —— 与当前 milestone 无关
- 把 `rtk` 扩写成 CodeMap 产品能力 —— `rtk` 仍是执行包装层
- 在本 milestone 中执行真实 npm publish / GitHub Release —— 当前目标是流程定义和验证，不是发布当前工作树
- 重建 `scripts/release.sh` 或 GitHub Actions 发布逻辑 —— `/release` 必须保持薄编排器定位
- 在仓库中写入 `NPM_TOKEN` 或其他发布密钥 —— 发布密钥只能来自环境 / GitHub Secrets

## Context

- 当前入口文档面已固定为三层：`AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md`
- `AGENTS.md` 只保留仓库级治理协议与证据协议；`CLAUDE.md` 只负责把 agent 路由到下一份 live doc；`.claude/CLAUDE.md` 只保留 Claude adapter 差异
- `docs/rules/validation.md` 与 `docs/rules/engineering-with-codex-openai.md` 已承担验证顺序、工程执行与交付要求
- `AI_GUIDE.md` 与 `docs/rules/README.md` 已分别承担产品/CLI discoverability 与 rules 路由
- `Phase 28` migration map 是后续维护 entry-doc authority split 的长期参考基线
- `v1.9` scope 来源于 `/home/stark/.claude/plans/ticklish-sprouting-church.md`，其中用户已锁定 milestone / npm release 1:1 绑定、版本统一与二次确认门

## Constraints

- **Zero Duplication**: 入口文档之间不得保留提醒式摘要、重复政策或第二套规则面
- **Existing Destinations Only**: 被移出的内容只能迁移到现有 live 文档，不新增治理中间层
- **Constitutional Narrowness**: `AGENTS.md` 必须保持窄而稳定，只承载宪法级规则
- **Navigation First**: 根 `CLAUDE.md` 与 `.claude/CLAUDE.md` 必须表达导航/装配关系，而不是重新长成执行手册
- **Release L3 Boundary**: AI 不得在缺少用户显式确认时执行版本号变更、tag 创建、远程 push 或真实发布
- **Thin Orchestration**: `/release` 只能编排和委托现有工具链，不重建 GSD closeout、release script 或 GitHub Actions
- **Version Binding**: milestone `vX.Y` 映射为 npm `X.Y.0`，major 跳跃必须在确认门中特别提示

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 启动 `v1.8 entry-docs-structure-consolidation` | `v1.7` 已归档，下一步需要 fresh requirements 处理入口文档结构收敛 | Active 2026-04-22 |
| 本 milestone 直接采用 `docs/brainstorms/2026-04-22-rules-entry-docs-phase1-structure-consolidation-requirements.md` 作为 canonical requirements source | 产品级结构决策已经收敛，不需要额外 questioning / research 循环 | ✓ Good |
| `AGENTS.md` / 根 `CLAUDE.md` / `.claude/CLAUDE.md` 分别收敛为宪法 / 路由 / Claude adapter | 这是本 milestone 的核心结构目标 | Shipped 2026-04-22 |
| 零重复是本 milestone 的硬约束 | 若保留摘要式复述，入口面会继续重新膨胀 | Shipped 2026-04-22 |
| 被移出内容只能落回现有 live 文档 | 避免新建治理中间层制造新的入口漂移 | Shipped 2026-04-22 |
| `v1.4` 以 `Phase 17 → 18 → 19 → 20` 完成并归档 | 设计链主线已经闭环，不应继续停留在 active planning surface | Shipped 2026-03-26 |
| `Phase 21` 以 direct replacement `NO-GO` 收尾 | 避免把错误的 storage 假设包装成实现前提 | Archived 2026-03-28 |
| `v1.5` Docker / ArcadeDB 原型线关闭 | 用户明确表示不再继续该方向，也不需要补旧遗漏 | Closed 2026-04-18 |
| `Phase 25` 起算为 `v1.6` | 该 phase 属于新的 CLI reliability / docs truth 版本线，而不是旧原型线尾巴 | Completed 2026-04-18 |
| `Phase 26` 作为 `post-v1.6` 薄切片完成 | 该 phase 验证的是 symbol graph / MCP 分发层最小价值，不应回写成 `v1.5` continuation | Completed 2026-04-19 |
| `Phase 27` 作为 repo-local rule-control hardening 完成 | 该 phase 把规则系统从文档假设推进到 capability、validator、hooks/CI、workflow injection、QA 一体化可验证 contract | Completed 2026-04-19 |
| `v1.7` closed Phase 27 + Phase 999.1 | 把 repo-local rule-control contract 与 `mycodemap init` 项目基础设施收敛合并为一个已归档里程碑 | Shipped 2026-04-22 |
| 启动 `v1.9 release-governance-unification` | 用户提供 `/release` 统一发布流程方案，并要求用它开启 v1.9 milestone | Shipped 2026-04-23 |
| `v1.9` 采用 milestone / npm release 1:1 绑定 | 用户决策明确每个 milestone 对应一个 npm release，且 `v1.9` 映射 npm `1.9.0` | Shipped 2026-04-23 |
| `/release` 必须保留两道用户确认门 | 发布属于 L3；确认门是防止 AI 自主发布和 major 版本跳跃误操作的核心安全机制 | Shipped 2026-04-23 |

## Current State

- **Completed milestones / follow-ups:** `v1.0`、`v1.1`、`v1.2`、`v1.3`、`v1.4`、`post-v1.4`、`v1.6`、`post-v1.6`、`v1.7 init-and-rule-hardening`、`v1.8 entry-docs-structure-consolidation`、`v1.9 release-governance-unification`
- **Historical closed branch:** `v1.5 Isolated ArcadeDB Server-backed Prototype`（22-24 不再继续）
- **Active milestone:** None selected after `v1.9` closeout
- **Current planning status:** `v1.9` archived; waiting for next milestone selection or a future explicit `/release v1.9`
- **Known remaining debt:** deferred debug artifact 与 governance follow-ups 仍记录在 `STATE.md`

## Next Execution Step

- 运行 `$gsd-new-milestone` 选择下一轮，或等待未来显式 `/release v1.9` 指令进入真实发布流程。

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone**:
1. 审查 `What This Is` / `Core Value` 是否仍准确
2. 将已交付 requirement 移入 Validated
3. 将下一轮候选目标移入 Active 或 Out of Scope
4. 更新 Current State / Context / Key Decisions

---
*Last updated: 2026-04-23 after closing v1.9 release-governance-unification*
