# Project Milestones: CodeMap

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
- Known deferred items at close: 2 (see `STATE.md` Deferred Items)

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
