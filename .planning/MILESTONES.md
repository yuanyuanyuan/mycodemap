# Project Milestones: CodeMap

> **Current active planning truth** lives in `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and `.planning/STATE.md`.
> The shipped entries below are **historical snapshots**. Their `What's next` text records closeout-time context and must not override the current active planning surface.

**Current status:** No active milestone. The latest shipped milestone is `v2.0 agent-native-foundation` (2026-05-01). Start the next milestone when ready.

## v2.0 agent-native-foundation (Shipped: 2026-05-01)

**Goal:** 把 CodeMap 从"人类 CLI + AI 可用"升级为"AI-Native 优先、人类友好的代码架构治理基础设施"，用机器可读契约统一 CLI / MCP / 文档三层表面，用结构化错误和持续诊断修复信任危机，用 WASM 回退消除安装失败的头号 drop-off。

**Phases completed:** 40.1-49 (16 plans total)

**Delivered:**

- `src/cli/interface-contract/` 已定义正式的机器可读 CLI 契约 schema，覆盖命令、参数、标志、输出形状、错误码和示例
- `codemap --schema` 可输出完整契约 JSON，供 agent 自省和动态适配
- MCP server 已改为从 contract schema 动态注册工具，零手写维护
- `codemap doctor` 提供持续健康诊断：ghost commands、native dependency、workspace drift、agent connectivity
- `src/cli/output/` 统一输出基础设施：JSON/NDJSON 默认、`--human` 标志、TTY 自动检测、stderr progress
- ActionableError 协议把错误转为结构化状态转移：root cause + remediation plan + confidence + nextCommand
- Ghost commands 已从 `package.json` 诚实移除，docs guardrail 验证引用命令不是 stub
- `tree-sitter` / `better-sqlite3` 提供 WASM 回退路径，`codemap benchmark` 可对比 WASM vs Native 性能
- `mycodemap-repo-analyzer` skill 增强 AI CLI 安装引导体验
- Phase 49 接线修复使所有 v2.0 audit blockers 得到闭环

**Key accomplishments:**

- `Phase 40.1` 把真实场景验证规则固定进 AGENTS.md、testing.md、pre-release-checklist、pre-commit 与 CI
- `Phase 41` 建立 CLI Interface Contract Schema 作为 CLI / MCP / 文档的单一真相源
- `Phase 42` 实现 schema-to-MCP 动态网关，新命令自动获得 MCP tool 暴露
- `Phase 43` 交付 `codemap doctor` 持续诊断，覆盖 install / config / runtime / agent 四类检查
- `Phase 44` 翻转输出范式：JSON 默认、`--human` 按需、TTY 自动检测、stderr NDJSON progress
- `Phase 45` 实现 Failure-to-Action Protocol：结构化错误 + 自动修复建议 + 置信度评分
- `Phase 46` 清理 ghost commands，把验证决策树写进 CLAUDE.md，docs guardrail 接入 CI
- `Phase 47` 建立 WASM-first 构建基础：native/WASM 回退加载器 + benchmark 命令
- `Phase 48` 创建 mycodemap-repo-analyzer skill 和 AI CLI 一键安装引导
- `Phase 49` 接线修复 4 个 audit critical blockers，使所有实现真正 end-to-end 工作

**Stats:**

- `19/19` v2.0 requirements implemented，`10/10` phases complete
- 50 commits, 158 files changed, 16,412 insertions(+), 1,220 deletions(-)
- 74,544 TypeScript LOC in `src/`
- 3 天（2026-04-29 → 2026-05-01）
- Milestone audit: `gaps_found` → Phase 49 closed all blockers → shipped
- Known deferred items at close: 9 (see `STATE.md` Deferred Items for v2.1/v2.2/v3.0 mapping)

**What's next:** Start the next milestone when ready. Candidates: v2.1 UX Onboarding Enhancement (First-Run Concierge, Zero-Config Preview), v2.2 Agent Integration Completion (Auto-Provisioned Skills, MCP verify_contract), or v3.0 Architecture Intelligence (Auto-Generate design.md, Storage Migration).

---

## v1.11 release-followup-hardening (Shipped: 2026-04-29)

**Goal:** Pick up deferred `RELF-01~03` release follow-ups after `v1.9` / `v1.10` by shipping non-Claude runtime release entry surfaces, adding optional publish-status polling, and evaluating whether release readiness should become a stronger gate.

**Phases completed:** 38-40 (3 plans total)

**Delivered:**

- `.agents/skills/release/SKILL.md` 已为 Codex 收口首个 non-Claude release entry / wrapper，保持 `docs/rules/release.md` 仍是唯一 authority chain
- `mycodemap publish-status` 已提供 snapshot-only、strict truth-first 的 publish follow-up 状态查询
- `mycodemap readiness-gate` 已把 release quality checks 重构为 hard / warn-only / fallback 三层语义
- `ship` pipeline 现在会在遇到 `fallback` 状态时显式停止并提示人工判断

**Key accomplishments:**

- `Phase 38` 为 Codex 补齐 repo-local release adapter，不形成 competing release path
- `Phase 39` 为 GitHub Actions publish 链补齐独立只读 follow-up observability
- `Phase 40` 统一发布检查体系为三层 gate 语义，并把 gate 暴露为独立 CLI 命令

**Stats:**

- `3/3` milestone requirements satisfied，`3/3` phases complete，milestone audit 为 `passed`
- No blocker remained at close; deferred items are actual `/release v1.9` execution and multi-runtime expansion

**What's next:** Start the next milestone when ready, or explicitly decide whether the next focus is real `/release v1.9` execution or broader governance / integration expansion.

---

## v1.10 governance-debt-cleanup (Shipped: 2026-04-23)

**Goal:** Close the deferred governance debt left after `v1.8` / `v1.9` by adding entry-doc drift backstops, aligning validation truth, and clarifying archive/live planning identity.

**Phases completed:** 35-37 (3 plans total)

**Delivered:**

- `scripts/validate-docs.js` 现在会捕捉 entry-doc duplicate policy、ghost command / route 与 authority-routing drift
- README、`AI_GUIDE.md`、`docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md` 现在共享同一组 validation quick truth
- `.planning/MILESTONES.md`、`.planning/RETROSPECTIVE.md`、`.planning/milestones/README.md` 与最新 `v1.9` archive docs 现在都显式区分 current truth 与 historical snapshot

**Key accomplishments:**

- `Phase 35` 把 entry-doc governance drift detection 接进现有 `docs:check` / `ci check-docs-sync`
- `Phase 36` 把 `docs:check` first pass、`check-docs-sync` 统一入口、`report-only` 非阻断、`warn-only / fallback` 非 hard-gate-success 这四件事锁成共享 truth
- `Phase 37` 把 active planning truth 与 archive snapshot 的身份边界写实，并避免继续靠历史 `What's next` 文案猜 current state

**Stats:**

- `9/9` milestone requirements satisfied，`3/3` phases complete，milestone audit 为 `passed`
- No blocker remained at close; deferred items are now release follow-ups rather than governance debt

**What's next:** Start the next milestone when ready, or explicitly decide whether the next focus is real `/release v1.9` execution or `RELF-01~03` release follow-ups.

---

## v1.9 release-governance-unification (Shipped: 2026-04-23)

**Goal:** Define and verify a safe unified `/release` workflow that binds milestone closeout to npm release, while preserving L3 user-confirmation boundaries for version bumps, tags, pushes, and publication.

**Phases completed:** 31-34 (4 plans total)

**Delivered:**

- `docs/rules/release.md` 已成为 `/release` 的 authoritative workflow document
- deployment、pre-release、`AGENTS.md` 与 `CLAUDE.md` 现在都把 release governance 路由到同一权威文档
- `.claude/skills/release/SKILL.md` 已提供 thin orchestrator：preflight checks、版本映射、双确认门、helper delegation
- docs guardrails、pre-release guardrail、docs-sync、failure rehearsal 已证明 release surface 在不执行真实 npm publish 的前提下可 dry-run
- `Phase 34` 已清理 `pre-release-checklist.md` 的 helper-first authority drift，恢复 `/release` 为唯一推荐入口

**Source:** `/home/stark/.claude/plans/ticklish-sprouting-church.md`

**Key accomplishments:**

- `Phase 31` 固定了 `/release` 的 rules authority、milestone ↔ npm version 绑定、双确认门与机械 helper 委托边界
- `Phase 32` 为 Claude runtime 落地 `.claude/skills/release/SKILL.md`，并把 refusal matrix 与 `0.5.2-beta.1 → 1.9.0` 警告写成运行时模板
- `Phase 33` 用 docs / pre-release / docs-sync 验证和 failure rehearsal 证明 release routing、rules 与 skill 当前一致
- `Phase 34` 关闭了 release checklist authority drift，重新满足 `REL-01` / `DOC-02` / `VAL-01`
- `v1.9` planning state 已归档为 milestone closeout-ready / shipped planning milestone，且没有执行真实 tag / push / publish

**Stats:**

- `13/13` milestone requirements satisfied，`4/4` phases complete，milestone audit 为 `passed`
- Known deferred items at close: 1 (`mycodemap-install-runtime-deps`, see `STATE.md` Deferred Items)

**What's next:** Start the next milestone with `$gsd-new-milestone` when desired; only run a real `/release v1.9` later on a clean tree with both confirmation gates explicitly accepted.

---

## v1.8 entry-docs-structure-consolidation (Shipped: 2026-04-22)

**Delivered:** 将 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md` 收敛为 constitution / router / Claude adapter，并同步 live docs 与 machine-readable indexes，恢复单一权威、零重复、可导航的入口面。

**Phases completed:** 28-30 (3 plans total)

**Key accomplishments:**

- `Phase 28` 固定了 section-level migration map，明确每类 migrated content 的 destination ownership
- `Phase 29` 重写三份入口文档，移出执行回路、命令块、RTK 长表、Claude 第二手册与会话 mem payload
- `Phase 30` 同步 `README.md`、`AI_GUIDE.md`、`docs/rules/README.md`、`ARCHITECTURE.md`、`ai-document-index.yaml`、`llms.txt` 与 `scripts/validate-docs.js`，锁定 `CLAUDE.md = 入口路由`
- docs guardrails、docs-sync 与 terminology scan 共同证明 entry-doc surface 不再保留第二套规则正文

**Stats:**

- `10/10` milestone requirements satisfied，`3/3` phases complete，milestone audit 为 `passed`
- 3 phases，3 plans，全部为 docs-governance / discoverability 收口
- `v1.9 release-governance-unification` 已作为下一轮 active milestone 启动

**Git range:** 未单独捕获（当前运行约束禁止自动 commit / tag / push）

**What's next:** 维护 v1.8 作为已归档基线；不要把已关闭的 `v1.8` 再当作 active planning surface。

---

## v1.7 init-and-rule-hardening (Shipped: 2026-04-22)

**Delivered:** Closed repo-local rule-control hardening and upgraded `mycodemap init` into a project-level AI infrastructure state reconciler.

**Phases completed:** 27, 999.1 (11 plans total)

**Key accomplishments:**

- Repo-local rule control now has capability baseline, validator exit-code contract, hooks/CI backstop, scoped rule-context injection, and executable QA.
- `mycodemap init` now reconciles canonical `.mycodemap/config.json`, workspace directories, receipts, first-run guidance, hooks, rules, and manual AI context snippets.
- Packaged CLI smoke proves `mycodemap init --yes` can install config, receipt, hooks, and rules from the npm tarball shape.
- Human and AI docs now describe `.mycodemap/config.json`, `.mycodemap/status/init-last.json`, `.mycodemap/hooks/`, and `.mycodemap/rules/` as the canonical init contract.
- Focused validation passed: docs guardrails, 60 targeted vitest tests, typecheck, build, Phase 27 verifier, and package smoke evidence.

**Stats:**

- 2 phases, 11 plans, 52 task/checklist markers
- 67,512 TypeScript LOC in `src/` at close
- Focused verification: docs guardrails, 60 targeted tests, typecheck, build, Phase 27 verification, tarball smoke evidence
- Deferred items at close: 2; current deferred items after seed cleanup: 1 (see `STATE.md` Deferred Items)

**Git range:** implementation commits immediately before archive close; see local tag `v1.7`

**What's next:** Start the next milestone with `$gsd-new-milestone /data/codemap`; do not auto-restore closed Phase 22-24 work.

---

## post-v1.6 Symbol-level graph and experimental MCP thin slice (Completed: 2026-04-19)

**Delivered:** 在不改变默认模块级 surface 的前提下，完成 `generate --symbol-level` → partial graph truth → experimental local MCP stdio query / impact 的最小纵向切片，并用真实 dist smoke 证明协议输出干净可消费。

**Phases completed:** 26 (3 plans total)

**Key accomplishments:**

- 打通 opt-in `generate --symbol-level`，把 `smart-parser` 的 symbol-level 调用真相落到 CodeGraph / SQLite
- 把 `graph_status` / `generated_at` / `failed_file_count` / `parse_failure_files` 固定为正式 truth，而不是依赖日志猜测
- 引入 experimental `mycodemap mcp start` / `mycodemap mcp install`，暴露 `codemap_query` / `codemap_impact`
- 同步 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md`、`docs/ai-guide/INTEGRATION.md` 的真实 stdio MCP path
- 真实 dogfood 抓到 filesystem 日期反序列化缺口，并以 regression test 固定修复

**Stats:**

- `5/5` follow-up requirements satisfied，`1/1` phase complete
- 3 个 plans 全部完成并验证
- real `dist` CLI + MCP stdio smoke 已通过；`stderrPreview = null`
- 当前 active milestone 再次回到 none

**Git range:** 未单独捕获（当前运行约束禁止自动 commit / tag / push）

**What's next:** `TODOS.md` 中仍保留首期后复盘项：query 质量基线、graph freshness identity、`mcp install` host support matrix，以及是否继续保留 MCP 在首期 surface。

---

## v1.6 CodeMap CLI dogfood reliability hardening (Completed: 2026-04-18)

**Delivered:** 将 2026-04-17 eatdogfood 直接暴露的 Agent-facing CLI 可靠性缺口收口为正式产品契约：`analyze find` 不再静默伪装成功，相邻 CLI 子命令也提供稳定机器输出与文档真相。

**Phases completed:** 25 (3 plans total)

**Key accomplishments:**

- 为 `analyze -i find` 增加 stdout-visible diagnostics，并把失败 / 部分失败语义显式建模
- 让 `find` discovery boundary 与现有 config-aware scanning truth 对齐
- 收口 `complexity -f --json`、`ci assess-risk --json`、`workflow start --json` 的机器输出
- 同步 `AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md` 与 docs guardrail

**Stats:**

- `9/9` milestone requirements satisfied，`1/1` phase complete
- 3 个 plans 全部完成并验证
- milestone 在 2026-04-18 与历史 `v1.5` Docker / ArcadeDB 分支切开，成为独立版本线

**Git range:** 未单独捕获（当前运行约束禁止自动 commit / tag / push）

**What's next:** 当前没有 active milestone。若继续新工作，应新开 phase / milestone；不要回补已关闭的 `Phase 22-24`。

---

## post-v1.4 ArcadeDB Node feasibility follow-up (Shipped: 2026-03-28)

**Delivered:** 在不改动当前 storage public surface 的前提下，完成 ArcadeDB Node feasibility follow-up，锁定官方支持矩阵、isolated smoke path、blast radius、validation strategy 与 decision package，并以 direct replacement `NO-GO` 收尾。

**Phases completed:** 21 (2 plans total)

**Key accomplishments:**

- Wave 1 已把 `Phase 21` 从模糊猜测收口成硬证据：官方支持矩阵、blast radius baseline 和隔离 smoke harness 都已就位
- Wave 2 已把 `Phase 21` 的结论写实：怎样验证、为什么现在不能 direct replacement、以及如果继续该走哪条隔离 follow-up 路
- milestone audit 已确认 `5/5` requirements satisfied、`1/1` phase complete，当前没有 blocker 留在 active surface

**Stats:**

- `5/5` requirements satisfied，`1/1` phase complete，milestone audit 为 `passed`
- Nyquist 为 `compliant`；唯一非阻断 debt 是尚未对真实 ArcadeDB server 执行 live smoke，这被明确 deferred 到未来 isolated prototype
- 已归档 `post-v1.4` roadmap / requirements / milestone audit
- 2 天（2026-03-27 → 2026-03-28）

**Git range:** 未单独捕获（当前运行约束禁止自动 commit / tag / push）

**What's next:** 当前没有新的 active milestone。默认保持 direct replacement `NO-GO`；若确有业务动机继续，只能新开 isolated server-backed prototype phase / milestone，并把真实 server smoke / latency / auth/setup evidence 作为第一阻断项。

---

## v1.4 设计契约与 Agent Handoff (Shipped: 2026-03-26)

**Delivered:** 将 CodeMap 从“AI-first 代码分析工具”推进到“人类设计 → AI 执行准备”的正式桥接面，固定 `design validate → design map → design handoff → design verify` 全链路，并把 docs / guardrail / drift verification 一起收口。

**Phases completed:** 17-20 (12 plans total)

**Key accomplishments:**

- 固定 design contract 输入面、schema、模板与结构化 diagnostics，停止在自由文本上猜需求
- 固定 `design map` 输出 contract，使 candidate scope、dependencies、risk、test impact、confidence 与 unknowns 可被人类审核
- 固定 `design handoff` human/json 双产物与 traceability gate，让 approvals / assumptions / open questions 可追踪
- 固定 `design verify` 与 full-chain ready/blocker evidence，把 acceptance criteria 真正接入实现后验证
- 同步 README、AI docs、rules、guardrail tests 与 workflow truth，降低 design/workflow drift 再次回流

**Stats:**

- `13/13` requirements satisfied，`4/4` phases complete，milestone audit 为 `passed`
- Nyquist 总体为 `partial`；唯一非阻断 debt 是 `Phase 17` validation artifact 仍未补齐
- 已归档 `v1.4` roadmap / requirements / milestone audit
- 2 天（2026-03-25 → 2026-03-26）

**Git range:** 未单独捕获（当前运行约束禁止自动 commit / tag / push）

**What's next:** 按既定顺序进入 `Phase 21` ArcadeDB Node feasibility；先验证官方 Node 支持面、blast radius 与 Go/No-Go，再决定是否值得开启新的 backend milestone。

---

## v1.3 Kùzu-only 收敛与高信号债务清理 (Shipped: 2026-03-24)

**Delivered:** 将 graph storage 正式产品面从 “Kùzu + Neo4j 并存” 收敛到 “Kùzu-only + filesystem/memory/auto”，并把 unfinished public surface、核心 debt 与 docs guardrail drift 一并收口。

**Phases completed:** 13-16 (12 plans total)

**Key accomplishments:**

- 从 schema / config / runtime / tests / docs 中移除 `neo4j` 正式支持，并为历史配置补齐明确迁移诊断
- 关闭 `analyze find` fallback 漂移，移除 public `server` command 残留并清理 `workflow` 过渡措辞
- 为 `plugin-loader` reload、`global-index` 路径解析、parser debt 与 `AnalysisHandler` unsupported contract 补齐真实实现与回归测试
- 将 `ci check-docs-sync` 串联 docs guardrail 与 analyze docs sync 校验，并接进 CI Gateway
- 用 docs / typecheck / lint / test / build / docs-sync 验证固定 Kùzu-only 边界与真实产品面

**Stats:**

- 4 个 phase，12 个 plans，同日完成收口
- 8 个实现/文档提交形成主交付边界（`8957fca` → `a4c8e12`）
- 已归档 `v1.3` roadmap / requirements / milestone audit
- 1 天（2026-03-24 → 2026-03-24）

**Git range:** `eb49891` → `a4c8e12`

**What's next:** 下一轮应在 `API-01`、`OPT-01`、`WKF-01` 等候选里单独定 scope；不要在未定义 milestone 的前提下重新打开 `neo4j` 或公共 HTTP API 产品面。

---

## v1.2 图数据库后端生产化 (Shipped: 2026-03-24)

**Delivered:** 将图数据库后端从“抽象层存在但主路径不可达”的占位能力，推进到“可被选择、可持久化、可验证”的正式产品能力，同时明确不重新打开公共 HTTP API 产品面。

**Phases completed:** 10-12 (9 plans total)

**Key accomplishments:**

- 为 `mycodemap.config.json` / schema / CLI loader 补齐正式 `storage` 配置面，并接通 `generate` / `export` / 内部 runtime 主路径
- 抽取共享 graph helper 与 contract tests，锁住 callers / callees / cycles / impact / statistics 的最小一致行为
- 将 `KuzuDBStorage` / `Neo4jStorage` 升级为 snapshot-backed real persistence，并补齐更新、查询与分析接口
- 为 Kùzu / Neo4j 补齐明确失败路径测试，证明 backend 不是“代码里存在但主流程不可达”
- 将 graph storage 的配置、依赖、边界和失败语义写入 README、AI docs、setup/rules、schema 与 docs guardrail

**Stats:**

- 3 个 phase，9 个 plans，同日完成收口
- 已归档 `v1.2` roadmap / requirements / phase artifacts / milestone audit
- 1 天（2026-03-24 → 2026-03-24）

**Git range:** 未单独捕获（当前运行约束禁止 git commit / git tag / git push）

**What's next:** 优先在 DB-native 查询优化、HTTP API 产品面再评估、或历史 Nyquist / docs guardrail 扩围三条线中择一收敛。

---

## v1.1 插件扩展点产品化 (Shipped: 2026-03-24)

**Delivered:** 将插件系统从内部骨架升级为正式产品面：有配置入口、有主流程接入、有诊断输出，并被文档与 guardrail 固定下来。

**Phases completed:** 7-9 (6 plans total)

**Key accomplishments:**

- 为 `mycodemap.config.json` 补齐插件配置 schema、默认值、config loader 与 CLI precedence
- 让 `generate` 在显式插件配置下真正执行 plugin runtime，并把结果写入 `pluginReport` / `Plugin Summary`
- 将插件失败统一收口为结构化 diagnostics，并加固 user plugin 路径解析与输出越界保护
- 同步 README、AI_GUIDE 与 AI docs 的插件配置/诊断/输出契约说明
- 用 docs guardrail 与 built-in/user plugin 双场景真实 CLI 验证锁定插件产品面

**Stats:**

- 23 个核心非规划文件纳入本 milestone 证据链
- `src/` 当前约 47,858 行 TypeScript
- 3 个 phase，6 个 plans，28 个 tasks
- 1 天（2026-03-24 → 2026-03-24）

**Git range:** 未单独捕获（当前工作树含跨 milestone 未提交改动，且本轮未创建 git tag）

**What's next:** 优先在图数据库后端生产化、HTTP API 产品面再评估、以及早期 phase 验证债务扩围三条线中择一收敛。

---

## v1.0 AI-first 重构 (Shipped: 2026-03-24)

**Delivered:** 将 CodeMap 收口为 AI-first 代码地图工具，固定 analyze / workflow / ci / ship / docs guardrail 的公开边界。

**Phases completed:** 1-6 (15 plans total)

**Key accomplishments:**

- 固化 AI-first 定位、机器可读优先输出契约与 `Server Layer` / 公共 `server` 命名边界
- 收缩 public CLI，移除 `server` / `watch` / `report` / `logs` 并提供显式迁移提示
- 将 `analyze` 收敛到 `find` / `read` / `link` / `show` 四意图，并固定 `warnings[]` / `analysis` 机器输出契约
- 将 `workflow` 收敛为 analysis-only 四阶段模型
- 将 `ship` 的 must-pass 检查收敛为复用 `ci check-working-tree` / `check-branch` / `check-scripts`
- 用共享 `.gitignore` 感知文件发现模块与 docs guardrail 把最终产品边界固定下来

**Stats:**

- 54 个非规划文件在当前里程碑收口中发生变更
- `src/` 当前约 46,896 行 TypeScript
- 6 个 phase，15 个 plans，同日完成收口
- 1 天（2026-03-24 → 2026-03-24）

**Git range:** 未单独捕获（本轮未按里程碑创建独立提交 / tag）

**What's next:** 若开启下一个 milestone，优先从插件扩展点、图数据库后端生产化、以及是否需要独立 HTTP API 面三个方向中重新定 scope。

---
