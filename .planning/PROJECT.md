# CodeMap

## What This Is

CodeMap 是一个 AI-Native 优先的代码架构治理基础设施。`v2.0` 已把 CLI 表面升级为 schema 驱动的自描述统一接口：单一 contract schema 同时生成 parser、MCP tool 定义、`--help-json` 和 shell completion。`v2.1` 把首次运行 onboarding、零配置预览、init receipt 和 subagent 环境契约检索收口为可归档的 UX milestone。`v2.2` 收敛了解析、存储和 MCP 执行基线，`v2.3` 建立了 graph-native schema / incremental refresh / impact / community 基础，`v2.4` 则把 Python 主解析路径升级到 Tree-sitter AST 深度，并完成共享 parser switching、Python type enhancement 与 parser contract cleanup。

`v1.4` 已把 `design validate → design map → design handoff → design verify` 收口为正式 public collaboration chain；`v1.6` 把 Agent-facing CLI 的机器契约真相继续收口；`post-v1.6` 补齐了 opt-in symbol-level graph 与 experimental local MCP 的最小可信纵向切片；`v1.7` 则把 repo-local rule control 与 `mycodemap init` 项目级 AI 基础设施收敛成可验证 contract；`v1.8` 进一步把 rules 入口文档面收敛成 constitution / router / adapter 三层结构；`v1.9-v1.11` 收口了 release governance、publish-status 与 readiness gate 表面。所有 release follow-ups 已收口，未触发真实发布动作。

2026-04-18 起，规划边界已经调整：**Docker / ArcadeDB 原型线不再属于当前版本范围**。此前 `v1.5` 的 22-24 phase 保留为历史工件，但不会继续作为 active work。

## Core Value

为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## Planning Horizon

当前 active milestone 已切换到 `v2.7 agent-effectiveness-validation`。它为 CodeMap 补齐 agent 有效性度量基础设施——`codemap agent-metrics` 命令提供 token 成本分析，消除"工具对 agent 划不划算"的盲区。`v2.5 deep-analysis-hooks` 仍保留为 active（Phase 70 ready to plan），可在 v2.7 完成后继续或并行推进。下一轮候选保留为 `v2.6 polish-and-stabilize` 和 `v3.0 architecture-intelligence`。

## Current Milestone: v2.7 agent-effectiveness-validation

**Goal:** 新建 `codemap agent-metrics` 命令，提供 token 成本分析维度的 agent 有效性指标。MVP 为 CLI 离线报告，后续演进到 MCP gateway 持续采集 + CI 门禁 + agent 行为分类。目标是消除"CodeMap 对 agent 划不划算"这个当前完全盲区。

**Target features:**
- Token 成本分析：per-query-type token estimation、响应大小统计、成本趋势追踪
- 报告输出：human-readable 表格 + JSON 模式（`--json`），支持 CI 管道消费
- CI 门禁：`--max-tokens-per-query` 阈值参数，超阈值返回非零退出码
- 命令结构：`codemap agent-metrics token` + `codemap agent-metrics report`

## Current State

**Status:** Active milestone is `v2.7 agent-effectiveness-validation`. `v2.5 deep-analysis-hooks` remains active (Phase 70 ready to plan). Latest shipped milestone remains `v2.4 parser-multilang-depth` on `2026-05-10`.

**What shipped in v2.4:**
- Python 主路径已升级为 Tree-sitter AST parser，替代 regex-based MVP ✅
- TS/JS/Python 现在共享 extension-aware Tree-sitter parser capability ✅
- `PythonTypeEnhancer` 已把 docstring / annotation truth 送入共享顶层 `typeInfo` 输出 ✅
- Parser runtime 已统一到 interface-layer `ParseResult`，Core 通过 composition root 注入 parser registry / enhancers ✅

**What remains next:**
- `v2.7` agent-metrics 命令是当前执行焦点
- `PY-07` / `PY-08` / `HOOK-01~03` 仍在 `v2.5` scope，待 v2.7 完成后继续
- complexity unify、MCP blank-line filter、edge ID normalization、Interface Contract 1.0.0 仍在 `v2.6` 候选池

## Milestone Focus

- Preserve the converged `v2.2` parser/storage/MCP baseline and `v2.3` graph schema
- Carry Python deep-analysis forward from AST/type depth into call-graph and complexity
- Reuse the shared parser/type surfaces shipped in `v2.4` rather than adding Python-only side channels
- Keep hook guidance retrieval-led through Phase 58 `env-contract`, not prompt-snippet reinjection
- Continue reducing architecture drift by extending existing seams instead of reopening settled baselines

## Latest Completed Milestone: v2.4 parser-multilang-depth

**Goal:** 在已收敛的 parser / graph 基线上，把 Python 解析主路径升级到 Tree-sitter AST 深度，并补齐多语言切换、Python 类型增强和 parser contract cleanup。

**Status:** Shipped 2026-05-10. `9/9` requirements complete; all in-scope phases (`67`, `68`, `69`, `71`) delivered.

**Delivered:**
- `tree-sitter-python` WASM grammar + `PythonTreeSitterParser` 成为 Python 主解析路径 ✅
- TS/JS/Python 共享 extension-aware Tree-sitter parser capability ✅
- `PythonTypeEnhancer` 通过共享 `typeInfo` surface 提升 Python graph/module truth ✅
- Parser runtime contract / ownership 已统一到 interface + infrastructure + composition-root seams ✅

**Phase numbering:** Continues from Phase 66 → phases 67-71, with Phase 70 deferred to `v2.5+`

## Previous Completed Milestone: v2.3 graph-capability

**Goal:** 在 `v2.2` 已收敛的 parser / SQLite / MCP 基线上，补齐 CodeMap 的 graph-native 数据模型与核心图分析能力，让后续 agent graph experience 建立在可计算、可增量、可解释的 graph truth 上。

**Status:** Shipped 2026-05-09. 9/9 requirements complete; all 4 phases (63-66) delivered.

**Delivered:**
- Graph-optimized SQLite schema 替换旧 governance-oriented 结构 ✅
- Edge confidence 语义 (`EXTRACTED` / `INFERRED` / `AMBIGUOUS`) 持久化 ✅
- Incremental graph refresh 支持 scoped recompute from `git diff` ✅
- Recursive impact traversal 提供 direct vs transitive 分层结果 ✅
- Community detection baseline 通过 Louvain 算法暴露模块聚类 ✅

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

### Active

- [ ] **PY-07**: Python call-graph 提取与 graph dependency edge generation
- [ ] **PY-08**: Python complexity metrics 持久化到 symbol truth
- [ ] **HOOK-01**: hub / bridge detection
- [ ] **HOOK-02**: hook mechanism (first-remind-then-silent, Phase 58 integration)
- [ ] **HOOK-03**: node dedup (3-layer)

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
- 当前 planning focus：Python call-graph / complexity、hook surfaces；Rust/Java/C++ grammar 继续后移到 `v3.0+`
- 最新 shipped milestone：`v2.4 parser-multilang-depth`
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
| 启动 `v2.5 deep-analysis-hooks` | 用户确认本 milestone 覆盖 `PY-07` / `PY-08` 与 `HOOK-01~03`，并要求先 research 再进 requirements | Active 2026-05-10 |
| 继续使用保留的 `Phase 70` 编号 | `Phase 70` 已在 `v2.4` closeout 中明确递延到 `v2.5+`，不应重写历史编号 | Active 2026-05-10 |
| `v2.3` 不重新打开 parser/storage/MCP baseline | graph capability 建立在稳定执行基础上，而不是回到底座收敛 | Shipped 2026-05-09 |
| `v2.2` 聚焦 parser / storage / MCP 基线收敛 | 先清理架构根基，再进入图能力与 agent/intelligence 扩展 | Shipped 2026-05-07 |

## Current State

- **Completed milestones / follow-ups:** `v1.0`→`v1.11`、`v2.0`、`v2.1`、`v2.2`、`v2.3`、`v2.4`
- **Historical closed branch:** `v1.5 Isolated ArcadeDB Server-backed Prototype`
- **Active milestone:** `v2.5 deep-analysis-hooks`
- **Current planning status:** research complete; requirements / roadmap now define Phase `70`, `72`, `73`, `74`
- **Known remaining debt:** `v2.6` polish items、contract migration 渐进债务、benchmark 输出基础设施迁移

## Next Milestone Goals (Candidates)

1. **v2.5 deep-analysis-hooks** — Python call-graph / complexity, hub-bridge / hook / dedup (active, Phase 70 ready to plan)
2. **v2.6 polish-and-stabilize** — complexity calculation unify, MCP blank-line filter, edge ID normalization, Interface Contract 1.0.0
3. **v3.0 architecture-intelligence** — Auto-Generate design.md, Architecture Remediation Patches, Self-Healing Design Contract, parser extension

## Next Execution Step

Define v2.7 requirements and create roadmap via `/gsd-plan-phase`.

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
*Last updated: 2026-05-10 after starting Milestone v2.7 agent-effectiveness-validation*
