# CodeMap

## What This Is

CodeMap 是一个 AI-Native 优先的代码架构治理基础设施。`v2.0` 已把 CLI 表面升级为 schema 驱动的自描述统一接口：单一 contract schema 同时生成 parser、MCP tool 定义、`--help-json` 和 shell completion。`v2.1` 把首次运行 onboarding、零配置预览、init receipt 和 subagent 环境契约检索收口为可归档的 UX milestone。`v2.2` 收敛了解析、存储和 MCP 执行基线，`v2.3` 建立了 graph-native schema / incremental refresh / impact / community 基础，`v2.4` 则把 Python 主解析路径升级到 Tree-sitter AST 深度，并完成共享 parser switching、Python type enhancement 与 parser contract cleanup。

`v1.4` 已把 `design validate → design map → design handoff → design verify` 收口为正式 public collaboration chain；`v1.6` 把 Agent-facing CLI 的机器契约真相继续收口；`post-v1.6` 补齐了 opt-in symbol-level graph 与 experimental local MCP 的最小可信纵向切片；`v1.7` 则把 repo-local rule control 与 `mycodemap init` 项目级 AI 基础设施收敛成可验证 contract；`v1.8` 进一步把 rules 入口文档面收敛成 constitution / router / adapter 三层结构；`v1.9-v1.11` 收口了 release governance、publish-status 与 readiness gate 表面。所有 release follow-ups 已收口，未触发真实发布动作。

2026-04-18 起，规划边界已经调整：**Docker / ArcadeDB 原型线不再属于当前版本范围**。此前 `v1.5` 的 22-24 phase 保留为历史工件，但不会继续作为 active work。

## Core Value

为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## Planning Horizon

当前处于 **between milestones** 状态：`v2.6 polish-and-stabilize` 已完成 closeout，2026-05-12 又以 special `Phase 84` 完成了一次 hook protocol hardening，但下一轮 active milestone 仍待定义。更远候选保留为 `v3.0 architecture-intelligence` 与后续 contract migration / shared-output 扩展。

## Current State

**Status:** No active milestone is open. Latest shipped milestone is `v2.6 polish-and-stabilize` (closed 2026-05-11); `v2.7 agent-effectiveness-validation` remains a historical shipped snapshot from earlier the same day. Between milestones, a special `Phase 84` hardening pass completed on 2026-05-12 without opening a new milestone.

**What just shipped in v2.6:**
- complexity truth 已统一到单一 canonical analyzer seam ✅
- MCP stdio transport 已过滤空白行输入，并保持 malformed payload 显式失败 ✅
- graph edge ID 已稳定为 canonical lowercase / underscore-safe form ✅
- interface contract 已升级为 `1.0.0`，核心命令显式 `stable: true` ✅
- 高频 graph read path 已获得 bounded eager-cache / adjacency acceleration，且保持 SQLite-only truth 语义 ✅

**What remains next:**
- 定义下一轮 active milestone，并重新创建新的 `.planning/REQUIREMENTS.md`
- 继续 contract migration / shared-output follow-ups（`AGENT-10` / `AGENT-11`）
- Rust/Java/C++ grammar 扩展与更广 architecture-intelligence 仍在 `v3.0+`

## Latest Special Follow-up: Phase 84 AI Agent Hook Control Protocol

**Goal:** 把 `git commit` hooks 从“对人类可读的阻断提示”升级成“对 AI Agent 可直接执行的 fail-fast 控制协议”，并确保 installable templates 与 managed hook copies 一致。

**Status:** Completed 2026-05-12. This was a between-milestones special follow-up, not a new milestone.

**Delivered:**
- `pre-commit` 现在会优先处理 cheap blocker，并输出 `codemap.precommit.v1` 协议，带 `checks[]`、`block.rule`、`resolution`、`attempt_id` 与 `CODEMAP_AGENT_CONTEXT`
- `commit-msg` 现在也输出 `codemap.commitmsg.v1`，`commit-format` 与 `commit-scope-message` 都直接路由到 `rewrite_commit_message`
- related-tests remediation 保持 framework-aware / generic fallback，而不是假设所有安装目标仓库都用 `vitest`
- installable template 真源和 managed hook copies 的协议一致性已经被 payload test、workflow unittest 与真实 smoke commit 锁定

## Latest Completed Milestone: v2.6 polish-and-stabilize

**Goal:** 在不重开新能力主线的前提下，统一 complexity truth、清理 MCP stdio 噪音、稳定 edge ID、补齐 Interface Contract `1.0.0`，并给高频 graph read path 加上有界性能优化。

**Status:** Shipped 2026-05-11. `5/5` requirements complete; all in-scope phases (`79`, `80`, `81`, `82`, `83`) delivered.

**Delivered:**
- complexity calculation 已统一到 canonical analyzer，默认 CLI path 不再 fabricate 非 canonical truth ✅
- MCP stdio transport 已在边界过滤 blank lines，并对 malformed payload 返回 explicit parse-error ✅
- graph edge IDs 已在 generate / storage / query / impact 路径稳定为 canonical form ✅
- full interface contract 已升级到 `1.0.0`，built-in contracts 显式 `stable: true` ✅
- 高频 graph read path 已复用 bounded eager cache 与 prebuilt adjacency index，且不改变 SQLite-only baseline ✅

## Previous Completed Milestone: v2.7 agent-effectiveness-validation

**Goal:** 新建 `codemap agent-metrics` 命令，提供 token 成本分析维度的 agent 有效性指标。MVP 为 CLI 离线报告，后续演进到 MCP gateway 持续采集 + CI 门禁 + agent 行为分类。

**Status:** Shipped 2026-05-11. `13/13` requirements complete; all in-scope phases (`75`, `76`, `77`, `78`) delivered.

**Delivered:**
- `agent-metrics` token/report family 已提供固定代表性查询样本的 token cost truth 与 SQLite persistence ✅
- `agent-metrics report` 已提供 grouped summary、summary-first human output 与 explicit latest-run-only semantics ✅
- row-level token threshold gate 已进入 CLI report/root path，显式阈值失败返回非零退出码 ✅
- intelligence layer 已提供 latest-vs-previous 趋势、`p50/p95/max` 分布和 highest-cost advisory，且不改变 gate 语义 ✅

## Previous Completed Milestone: v2.5 deep-analysis-hooks

**Goal:** 在 `v2.4` 已收敛的 Python AST / shared parser/type baseline 之上，交付 Python call-graph / complexity 真相，并补齐 hub / bridge、dedup 与 env-contract reminder hook follow-ups。

**Status:** Shipped 2026-05-10. `5/5` requirements complete; all in-scope phases (`70`, `72`, `73`, `74`) delivered.

**Delivered:**
- Python parser/analyzer 现在能产出 conservative call-graph truth，并保留 explicit non-edge issues ✅
- Python complexity 已进入 shared module/symbol truth，CLI 默认优先读取 persisted truth ✅
- persisted community/storage truth 已暴露 module-level hub / bridge insight，并在多层路径压制 duplicate graph artifacts ✅
- delegated-start hook 现在按 session-role 只提醒一次 `env-contract` retrieval，失败保持 visible warn-and-continue ✅

**Phase numbering:** Continues from the deferred `Phase 70` follow-up in `v2.4`, then adds `72`, `73`, and `74` without rewriting historical numbering.

## Earlier Completed Milestone: v2.4 parser-multilang-depth

**Goal:** 在已收敛的 parser / graph 基线上，把 Python 解析主路径升级到 Tree-sitter AST 深度，并补齐多语言切换、Python 类型增强和 parser contract cleanup。

**Status:** Shipped 2026-05-10. `9/9` requirements complete; all in-scope phases (`67`, `68`, `69`, `71`) delivered.

**Delivered:**
- `tree-sitter-python` WASM grammar + `PythonTreeSitterParser` 成为 Python 主解析路径 ✅
- TS/JS/Python 共享 extension-aware Tree-sitter parser capability ✅
- `PythonTypeEnhancer` 通过共享 `typeInfo` surface 提升 Python graph/module truth ✅
- Parser runtime contract / ownership 已统一到 interface + infrastructure + composition-root seams ✅

## Requirements

### Validated

- ✓ 代码库已经能生成代码地图和结构化分析结果 —— existing
- ✓ 代码库已经提供 `query` / `deps` / `cycles` / `complexity` / `impact` / `analyze` / `export` / `ci` 等核心分析能力 —— existing
- ✓ `analyze` 公共契约已收口为 `find` / `read` / `link` / `show` 四意图 —— v1.0 / Phase 3
- ✓ docs sync 自动检查已进入 CI / must-pass 路径 —— v1.3 / Phase 16
- ✓ design contract / map / handoff / verify 协作链路已 shipped —— v1.4 / Phases 17-20
- ✓ `analyze find` 已区分 success / `partialFailure` / failure truth —— v1.6 / Phase 25
- ✓ symbol-level graph 与 experimental local MCP 已形成最小可信纵向切片 —— post-v1.6 / Phase 26
- ✓ repo-local rule control 已具备 capability baseline、validator exit contract、hooks/CI backstop、scoped rule-context 与 executable QA —— v1.7 / Phase 27
- ✓ `mycodemap init` 已升级为项目级 AI 基础设施状态收敛器 —— v1.7 / Phase 999.1
- ✓ 入口文档已按 `AGENTS.md = constitution`、`CLAUDE.md = router`、`.claude/CLAUDE.md = Claude adapter` 收口 —— v1.8 / Phase 29
- ✓ `/release` authority chain、publish-status 与 readiness gate 已收口 —— v1.9-v1.11
- ✓ CLI Interface Contract Schema 作为 CLI / MCP / 文档单一真相源 —— v2.0 / Phase 41
- ✓ JSON/NDJSON 默认输出、doctor、Failure-to-Action、WASM-first build 已交付 —— v2.0 / Phases 43-49
- ✓ first-run concierge、zero-config preview、agent bootstrap、subagent env-contract 已交付 —— v2.1 / Phases 53-58
- ✓ parser/storage/MCP baseline 已收敛为 registry-backed tree-sitter、SQLite-only、direct-execution MCP —— v2.2 / Phases 59-62
- ✓ graph-native schema、incremental refresh、impact traversal、community detection 已交付 —— v2.3 / Phases 63-66
- ✓ `tree-sitter-python` WASM grammar 已进入 Python 主解析路径，替代 regex-based MVP —— v2.4 / Phase 67
- ✓ `TreeSitterParser` 已支持 TS/JS/Python 共享 extension-aware grammar switching，并对 Python grammar 不可用场景显式失败 —— v2.4 / Phase 68
- ✓ Python docstring / annotation truth 已通过共享顶层 `typeInfo` surface 进入 graph/module output —— v2.4 / Phase 69
- ✓ active runtime 已统一到 interface-layer `ParseResult`，Core 通过 composition root 注入 parser registry / enhancers —— v2.4 / Phase 71
- ✓ Python call-graph truth 已进入 shared parser/global-index/analyzer seam，并对 unresolved / ambiguous / dynamic call 保持显式 issues —— v2.5 / Phase 70
- ✓ Python complexity metrics 已持久化到 shared symbol/module truth，downstream CLI 默认读取 persisted truth —— v2.5 / Phase 72
- ✓ persisted graph/community truth 已暴露 module-level hub / bridge insight，并在 build/writeback/read path 三层抑制 duplicate graph artifacts —— v2.5 / Phase 73
- ✓ delegated-start hook 已实现 first-remind-then-silent，并统一复用 Phase 58 env-contract retrieval surface —— v2.5 / Phase 74
- ✓ `git commit` hooks 已升级为 AI-agent-readable control protocol：`pre-commit`/`commit-msg` 都输出 structured blocker resolution、attempt context 与 framework-aware verify guidance —— between-milestones / Phase 84
- ✓ `codemap agent-metrics` 已作为独立命令家族落地 `token` / `report` 表面 —— v2.7 / Phase 75
- ✓ no-arg `codemap agent-metrics` 已闭合到最小 report flow —— v2.7 / Phase 75
- ✓ representative CodeMap 查询已支持 token cost analysis，并持久化 detail-row truth —— v2.7 / Phase 75
- ✓ 每条查询结果已暴露 response JSON size、estimated tokens 与 raw char count —— v2.7 / Phase 75
- ✓ `codemap agent-metrics report` 已输出 summary-first 人类可读报告，包含 grouped summary 与 raw rows table —— v2.7 / Phase 76
- ✓ `codemap agent-metrics --json` / `report --json` 已提供稳定 schema，并新增 `queryTypeSummaries` 数组 —— v2.7 / Phase 76
- ✓ explicit `codemap agent-metrics report` 已固定为 latest-run-only，缺少 persisted run 时返回显式 remediation error —— v2.7 / Phase 76
- ✓ `--max-tokens-per-query` 已在 report/root 路径提供 row-level threshold gate，显式超阈值返回非零退出码 —— v2.7 / Phase 77
- ✓ `agent-metrics` gate 默认保持 warn-only，并在 human/JSON 输出暴露稳定 verdict contract —— v2.7 / Phase 77
- ✓ `agent-metrics report` 已提供 latest-vs-previous query-type trend truth —— v2.7 / Phase 78
- ✓ `agent-metrics report` 已提供 highest-cost query type / sample advisory surfaces —— v2.7 / Phase 78
- ✓ `agent-metrics report` 已提供 per-query-type `p50/p95/max` distribution depth —— v2.7 / Phase 78
- ✓ complexity truth 已统一到单一 canonical analyzer —— v2.6 / Phase 79
- ✓ MCP stdio transport 已过滤 blank-line noise 并保持 malformed payload 显式失败 —— v2.6 / Phase 80
- ✓ graph edge ID 已稳定为 canonical lowercase / underscore-safe form —— v2.6 / Phase 81
- ✓ core interface contract 已升级为 `1.0.0` 并显式声明 `stable: true` —— v2.6 / Phase 82
- ✓ 高频 graph read path 已复用 bounded eager cache / adjacency acceleration，且保持 SQLite-only truth 不变 —— v2.6 / Phase 83

### Active

- [ ] 为下一 milestone 定义新的 milestone-scoped requirements（between milestones 状态下 live `REQUIREMENTS.md` 为空是正常现象）
- [ ] 剩余 12+ CLI 命令迁移到 contract schema
- [ ] benchmark 命令迁移到共享输出基础设施
- [ ] 架构 intelligence / broader parser coverage 新 scope 待确认

### Future Milestones

- [ ] **AGENT-10**: 剩余 12+ CLI 命令迁移到 contract schema
- [ ] **AGENT-11**: benchmark 命令迁移到共享输出基础设施
- [ ] **INT-04**: Auto-Provisioned Agent Skills
- [ ] **INT-05**: MCP `verify_contract` Tool
- [ ] **ARCH-01**: Auto-Generate design.md from codebase
- [ ] **ARCH-02**: Auto-Generate Architecture Remediation Patches
- [ ] **ARCH-03**: Self-Healing Design Contract (Drift Approval)
- [ ] **ARCH-04**: Parser extension for Rust / Java / C++ (Tree-sitter grammar)

### Out of Scope

- 恢复 `Phase 22-24` 作为当前版本待办 —— 已关闭的历史分支不能重新回流
- 重新引入 Docker / ArcadeDB 作为默认下一步 —— 与当前 milestone 无关
- 在没有明确 blocker 的情况下重新打开 `v2.2` parser/storage/MCP baseline 或 `v2.3` graph schema —— 这些基础已收敛
- 在未来 Python 深度迭代中静默回退到 regex 主路径 —— Python grammar 不可用时必须显式失败
- 在仓库中执行真实 npm publish / GitHub Release —— 发布仍受显式 `/release` 与双确认门约束

## Context

- 当前入口文档面已固定为三层：`AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md`
- `docs/rules/validation.md` 与 `docs/rules/engineering-with-codex-openai.md` 已承担验证顺序、工程执行与交付要求
- `AI_GUIDE.md` 与 `docs/rules/README.md` 已分别承担产品/CLI discoverability 与 rules 路由
- 当前 `src/` 约 `88,496` 行 TypeScript
- 当前 planning focus：between milestones，等待定义下一轮 active milestone
- 最新 shipped milestone：`v2.6 polish-and-stabilize`
- `scripts/validate-docs.js` 与 `node dist/cli/index.js ci check-docs-sync` 继续作为 docs governance enforcement surface

## Constraints

- **Zero Duplication**: 入口文档之间不得保留提醒式摘要、重复政策或第二套规则面
- **Existing Destinations Only**: 被移出的内容只能迁移到现有 live 文档，不新增治理中间层
- **Constitutional Narrowness**: `AGENTS.md` 必须保持窄而稳定，只承载宪法级规则
- **Navigation First**: 根 `CLAUDE.md` 与 `.claude/CLAUDE.md` 必须表达导航/装配关系，而不是重新长成执行手册
- **Release L3 Boundary**: AI 不得在缺少用户显式确认时执行版本号变更、tag 创建、远程 push 或真实发布
- **Thin Orchestration**: `/release` 只能编排和委托现有工具链，不重建 GSD closeout、release script 或 GitHub Actions
- **Archive Identity**: archive 文档只能作为 historical snapshot / index，不得重新声明 current truth
- **Baseline Preservation**: 不重新打开 `v2.2` parser/storage/MCP 或 `v2.3` graph schema，除非出现明确 blocker
- **Python Depth First**: 先沿着 Python AST / type / call-graph / complexity 主线继续推进，再考虑更广 grammar 扩展
- **Explicit Failure Over Silent Fallback**: Python grammar 不可用时必须给出可操作错误，而不是静默回退到 regex main path
- **Retrieval-Led Hooks**: hook 相关能力必须复用 Phase 58 `env-contract` 检索面，而不是重新引入 prompt snippet / hidden rule cache

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 启动 `v2.4 parser-multilang-depth` | 用户确认 Python 深度解析无 phase 覆盖，创建独立 milestone 覆盖 Tree-sitter Python、多语言切换、PythonTypeEnhancer、call-graph/complexity | Shipped 2026-05-10 |
| `PY-04` 锁定为 strict no-fallback | Python grammar 可用时必须走 AST parser，不可用时显式失败，而不是静默回退 regex | Completed 2026-05-10 |
| `PY-06` 通过共享顶层 `typeInfo` surface 闭合 | Python 类型增强复用现有 graph/module truth 输出契约，不引入 Python-only side channel | Completed 2026-05-10 |
| `Phase 70` 递延到 `v2.5+` | Python call-graph / complexity 仍重要，但不再作为 `v2.4` closeout blocker | Deferred 2026-05-10 |
| 启动 `v2.5 deep-analysis-hooks` | 用户确认本 milestone 覆盖 `PY-07` / `PY-08` 与 `HOOK-01~03`，并要求先 research 再进 requirements | Shipped 2026-05-10 |
| 继续使用保留的 `Phase 70` 编号 | `Phase 70` 已在 `v2.4` closeout 中明确递延到 `v2.5+`，不应重写历史编号 | Shipped 2026-05-10 |
| `v2.5` closeout 采用“补建 archive、保留 v2.7 live truth”策略 | live `STATE` / `PROJECT` / `REQUIREMENTS` 已先切到 `v2.7`，不能再把 active requirement truth 误归档到 `v2.5` | Completed 2026-05-10 |
| `agent-metrics` 作为独立命令家族落地 | token-cost measurement 与 benchmark 关注点不同，需要独立 surface + shared output + SQLite truth | Completed 2026-05-10 |
| Phase 76 grouped reporting 在 service layer 聚合 | human/JSON 输出需要共享同一份 read-time aggregation truth，同时保留 `rows` / `totals` 稳定契约 | Completed 2026-05-10 |
| explicit `agent-metrics report` 与 bare-root flow 语义分离 | 显式 report 应只读取 latest persisted run，便捷入口 `codemap agent-metrics` 才负责 auto-run | Completed 2026-05-10 |
| Phase 77 gate 保持 row-level and CLI-edge only | CI blocking 必须只由显式阈值触发，默认仍可见但非阻断 | Completed 2026-05-10 |
| Phase 78 intelligence 保持 additive and advisory-only | 趋势/分位数/高成本提示必须扩展既有报告，而不能变成第二套 gate policy | Completed 2026-05-11 |
| `v2.7` closeout先清 stale open artifacts 再归档 | 用户选择 `Resolve` 路径，closeout 只在 Phase 45/53/58/debug 工件更新并且 `audit-open` 清零后继续 | Completed 2026-05-11 |
| `v2.6` 继续沿用 backlog 标签 | 用户明确要求沿用既有 `v2.6` 命名启动 polish milestone，而不是把该 scope 重命名为 `v2.8` | Completed 2026-05-11 |
| 将 hook protocol hardening 记录为 special Phase 84 | 用户要求把本次 AI-agent-friendly hook 优化作为特殊 phase 登记，但当前 planning truth 仍应保持 `between-milestones` | Completed 2026-05-12 |
| installable hook template 是协议真相源 | 其他项目通过 `mycodemap init` 安装时也要拿到同一套 guardrail，因此不能只修当前仓库本地 hook copy | Completed 2026-05-12 |
| `v2.3` 不重新打开 parser/storage/MCP baseline | graph capability 建立在稳定执行基础上，而不是回到底座收敛 | Shipped 2026-05-09 |
| `v2.2` 聚焦 parser / storage / MCP 基线收敛 | 先清理架构根基，再进入图能力与 agent/intelligence 扩展 | Shipped 2026-05-07 |

## Current State

- **Completed milestones / follow-ups:** `v1.0`→`v1.11`、`v2.0`、`v2.1`、`v2.2`、`v2.3`、`v2.4`、`v2.5`、`v2.6`、`v2.7`、special `Phase 84`
- **Historical closed branch:** `v1.5 Isolated ArcadeDB Server-backed Prototype`
- **Active milestone:** none (between milestones)
- **Current planning status:** closeout complete; next step is define the next milestone and create fresh milestone-scoped requirements
- **Known remaining debt:** contract migration 渐进债务、benchmark 输出基础设施迁移、broader architecture-intelligence backlog

## Next Milestone Goals (Candidates)

1. **v3.0 architecture-intelligence** — Auto-Generate design.md, Architecture Remediation Patches, Self-Healing Design Contract, parser extension
2. **AGENT-10 / AGENT-11 follow-up** — remaining CLI contract migration and benchmark shared-output convergence
3. **Contract / output migration milestone** — finish schema migration for the remaining command surface

## Next Execution Step

Run `$gsd-new-milestone` to define the next active milestone and create a fresh `.planning/REQUIREMENTS.md`.

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
*Last updated: 2026-05-11 after completing milestone v2.6*
