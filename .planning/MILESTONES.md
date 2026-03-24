# Project Milestones: CodeMap

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
