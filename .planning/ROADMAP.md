# Roadmap: CodeMap

## Milestones

- ✅ **v1.0 AI-first 重构** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 插件扩展点产品化** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v1.2 图数据库后端生产化** — Phases 10-12 (shipped 2026-03-24)
- ✅ **v1.3 Kùzu-only 收敛与高信号债务清理** — Phases 13-16 (shipped 2026-03-24)
- ✅ **v1.4 设计契约与 Agent Handoff** — Phases 17-20 (shipped 2026-03-26)
- ✅ **post-v1.4 ArcadeDB Node feasibility follow-up** — Phase 21 (completed 2026-03-28)
- ✅ **v1.6 CodeMap CLI dogfood reliability hardening** — Phase 25 (completed 2026-04-18)
- ✅ **post-v1.6 Symbol-level graph and experimental MCP thin slice** — Phase 26 (completed 2026-04-19)

## Overview

2026-04-18 起，active planning surface 不再继续 Docker / ArcadeDB 路线。用户已明确要求：**从 Phase 25 开始视为新版本，Phase 22-24 的未完成事项不再继续处理**。

因此当前 roadmap 的真实边界是：

- `v1.5` 保留为历史分支，只做记录，不再作为待续工作
- `v1.6` 从 `Phase 25` 起算，聚焦 Agent-facing CLI reliability / JSON contract / docs truth，并已完成
- `post-v1.6` 作为后续薄切片，完成了 symbol-level graph 与 experimental MCP 的最小纵向验证
- 当前没有 active milestone；未来若要继续新工作，必须另开新 phase 或新 milestone，不能自动回跳到 `Phase 22-24`

## Archived Milestone Detail

- `v1.4` roadmap / requirements / audit 已归档到 `.planning/milestones/v1.4-ROADMAP.md`、`.planning/milestones/v1.4-REQUIREMENTS.md`、`.planning/milestones/v1.4-MILESTONE-AUDIT.md`
- `post-v1.4` roadmap / requirements / audit 已归档到 `.planning/milestones/post-v1.4-ROADMAP.md`、`.planning/milestones/post-v1.4-REQUIREMENTS.md`、`.planning/milestones/post-v1.4-MILESTONE-AUDIT.md`
- `v1.6` roadmap / requirements / audit 已归档到 `.planning/milestones/v1.6-ROADMAP.md`、`.planning/milestones/v1.6-REQUIREMENTS.md`、`.planning/milestones/v1.6-MILESTONE-AUDIT.md`
- `v1.6` 的 phase 历史已归档到 `.planning/milestones/v1.6-phases/25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err/`
- `post-v1.6` 的 phase 历史已归档到 `.planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/`
- `v1.5` 当前仍保留的 phase 级历史工件位于 `.planning/milestones/v1.5-phases/22-real-arcadedb-server-live-smoke-gate/`；这些工件仅供追溯，不再构成 active backlog
- dormant seed 来源：`.planning/seeds/SEED-001-evaluate-isolated-arcadedb-server-backed-prototype.md`

## v1.6 CodeMap CLI dogfood reliability hardening

**Status:** Archived on 2026-04-19
**Archive:** `.planning/milestones/v1.6-ROADMAP.md`, `.planning/milestones/v1.6-REQUIREMENTS.md`, `.planning/milestones/v1.6-MILESTONE-AUDIT.md`
**Summary:** `Phase 25` 已把 `analyze find` 静默失败、相邻 CLI JSON contract 缺口与 AI docs / guardrail truth 收口完成；root roadmap 不再保留该 milestone 的详细 phase 级展开。

## post-v1.6 Symbol-level graph and experimental MCP thin slice

**Status:** Completed on 2026-04-19 after verification
**Positioning:** 这是 `v1.6` 之后的薄切片 follow-up，用来验证 symbol-level graph truth 与 experimental MCP 的最小可用纵向链路，不是回补 `v1.5`。

## Phases

- [x] **Phase 26: Implement symbol-level graph and experimental MCP thin slice** - 打通 `generate --symbol-level` → symbol truth / partial graph metadata → experimental local MCP stdio query / impact

### Phase 26: Implement symbol-level graph and experimental MCP thin slice
**Goal:** 先打通 `generate --symbol-level` → CodeGraph / SQLite 的最小纵向切片，让 `smart-parser` 的 symbol-level 调用真相成为后续 experimental MCP query / impact 的真实基础
**Requirements**: `P26-NOW-SYMBOL-GENERATE`、`P26-NOW-SQLITE-PATH`、`P26-NOW-PARTIAL-GRAPH-TRUTH`、`P26-NOW-MCP-STDIO`、`P26-NOW-SYMBOL-IMPACT`
**Depends on:** Phase 25
**Status**: Complete on 2026-04-19 after verification; all 3 plans passed
**Plans**: 3 completed plans (`26-01`, `26-02`, `26-03`)

Plans:
- [x] **26-01** Opt-in symbol-level generate + sqlite path + schema v3 round-trip
- [x] **26-02** Explicit `graphStatus` / partial graph truth through analyzer, generate, SQLite, and docs
- [x] **26-03** Experimental MCP stdio thin slice with `mcp start` / `mcp install` and `codemap_query` / `codemap_impact`

## v1.5 Isolated ArcadeDB Server-backed Prototype

**Status:** Closed on 2026-04-18 by explicit user direction
**Reason:** Docker / ArcadeDB 不再属于当前版本规划
**Historical note:** 22-24 的 phase 工件保留以便追溯，但不再继续执行、补齐或解 blocker

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 22. Live smoke gate | v1.5 | 2/2 | Closed | — |
| 23. Evidence & blast radius | v1.5 | 0/0 | Dropped | — |
| 24. Decision package | v1.5 | 0/0 | Dropped | — |
| 25. CLI dogfood hardening | v1.6 | 3/3 | Complete | 2026-04-18 |
| 26. Symbol graph + experimental MCP | post-v1.6 | 3/3 | Complete | 2026-04-19 |
| 27. Rule control system + hooks/CI QA | next | 6/6 | Complete    | 2026-04-18 |

## Current Routing Rule

- 不要再把 `Phase 22-24` 当成待恢复 blocker 或默认下一步
- `Phase 25` 是 `v1.6` 的起点与已完成交付，不再挂靠 `v1.5`
- `Phase 26` 已作为 `post-v1.6` 薄切片 follow-up 完成；如果继续新工作，应新开 milestone / phase scope，而不是回补已关闭版本
- `Phase 27` 已完成 repo-local rule control / hooks / CI / scoped subagent injection / QA hardening；如继续新工作，应新开 phase / milestone scope

### Phase 27: Implement repo-local rule control system and add hooks CI QA coverage for the seven workflow gaps

**Goal:** 以 `/home/stark/.claude/plans/harness-claude-openai-github-openharness-parallel-alpaca.md` 作为主计划，结合 `/home/stark/.gstack/projects/codemap/stark-main-eng-review-test-plan-20260418-200710.md` 作为实施 / QA 清单，把 repo-local rule control system 的落地与验证纳入下一阶段规划
**Requirements**: `P27-NOW-CAPABILITY-REPORT`、`P27-NOW-VALIDATE-RULES`、`P27-NOW-HOOKS-CI-QA`、`P27-NOW-SOFT-GATE-DEFAULTS`、`P27-NOW-SUBAGENT-RULE-INJECTION`、`P27-NOW-WORKFLOW-VALIDATION`、`P27-NOW-NO-VERIFY-BACKSTOP`
**Depends on:** Phase 26
**Status**: Complete on 2026-04-18 after verification; all 6 plans passed
**Plans:** 6/6 plans complete

Planning Inputs:
- Main plan: `/home/stark/.claude/plans/harness-claude-openai-github-openharness-parallel-alpaca.md`
- QA checklist: `/home/stark/.gstack/projects/codemap/stark-main-eng-review-test-plan-20260418-200710.md`

Seed TODOs:
- [x] 默认启用能覆盖 session start / edit path 的 soft-gate 能力，避免 feature flag 默认关闭导致规则系统失效
- [x] 把规则加载从“依赖任务分析格式”改成“按编辑文件路径强制推断”
- [x] 为 Edit/Write 后验证建立可核实路径，不再只靠 agent 自述“已验证”
- [x] 把 hooks / CI / 临时目录 / 临时 git repo 的 QA 路径补成可执行测试清单
- [x] 为 subagent / agent spawning 注入最小必要规则上下文，避免遗漏或串味
- [x] 评估并补齐 commit 之前更早的 hard-gate / advisory timing，减少晚发现问题
- [x] 处理 `--no-verify` 绕过场景，确保 CI 仍能作为最终 backstop

Plans:
- [x] **27-01** Capability report baseline and JSON contract
- [x] **27-02** Repo-local `validate-rules.py` exit-code contract
- [x] **27-03** Entry docs, path-based routing, and soft-gate defaults
- [x] **27-04** Pre-commit / commit-msg / CI backstop integration
- [x] **27-05** Scoped rule-context helper and subagent prompt injection
- [x] **27-06** Executable QA matrix for hooks, soft-gate, and backstop flows

## Backlog

### Phase 999.1: mycodemap init enhancements — centralized workspace, git hooks, and AI guardrail rules (BACKLOG)

**Goal:** 将 mycodemap 的初始化流程从"配置文件扔根目录"升级为"项目级 AI 助手基础设施初始化"

**Requirements (captured, TBD):**

1. **集中式工作空间** — 所有 mycodemap 相关文件统一放到目标项目的 `.mycodemap/` 目录内
   - `mycodemap.config.json` 从项目根目录迁移到 `.mycodemap/config.json`
   - 输出目录 (`.mycodemap/`)、日志、缓存、workflow 等全部收敛到一个目录下
   - 向后兼容：检测到旧位置配置文件时自动迁移并提示

2. **Git hooks 引导安装** — `mycodemap init` 时引导用户为目标项目添加 git hooks
   - 参考实现：本项目自身的 `.githooks/` (pre-commit, commit-msg 等)
   - 可选安装，不强制覆盖用户已有 hooks
   - hooks 内容围绕 mycodemap 生态的验证（如 docs sync、rules 校验等）

3. **AI 护栏规则注入** — `mycodemap init` 时引导用户将 CI/guardrail rules 注入目标项目的 AI 上下文
   - 在目标项目创建 `.mycodemap/rules/` 目录，存放规则文件
   - 规则覆盖：commit 规范、PR 流程、lint 要求、测试门禁、CI 检查等
   - 引导用户将规则引用添加到目标项目的 `CLAUDE.md` 或 `AGENTS.md`
   - 目标是让 AI 大模型（Claude Code 等）在操作该项目时自动遵守项目级护栏

**Status:** Backlog — captured for future planning
**Depends on:** None
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)
