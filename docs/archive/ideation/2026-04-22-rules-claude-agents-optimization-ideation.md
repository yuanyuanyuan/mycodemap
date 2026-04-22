---
date: 2026-04-22
topic: rules-claude-agents-optimization
focus: 基于 harness 模式优点优化 rules、CLAUDE.md 和 AGENTS.md
---

# Ideation: Rules / CLAUDE.md / AGENTS.md 优化

## Codebase Context

**项目形状**：TypeScript CLI 工具（`@mycodemap/mycodemap`），为 AI 辅助开发提供代码地图与结构化上下文。采用 MVP3 五层架构，构建输出到 `dist/`，CLI 入口为 `dist/cli/index.js`。

**关键痛点**：
1. **规则重复**：代码红线在 3 处出现（code-quality-redlines.md、AGENTS.md 7.1、engineering-with-codex-openai.md §6），阈值相同但格式不同步
2. **路径路由缺失**：CLAUDE.md 路由表仅覆盖 5 个 src/ 子目录，遗漏 worker/、cache/、watcher/、plugins/ 等活跃目录
3. **幽灵命令**：`check:architecture` 和 `check:unused` 是 echo stub，但文档当作真实命令引用
4. **交付清单无 enforcement**：CLAUDE.md 要求"失败场景+可信度自评"，但无自动化检查点
5. **双 CLAUDE.md**：根目录与 `.claude/` 各有一份，内容重叠且部分矛盾
6. **无解决方案归档**：`docs/solutions/` 不存在，知识随会话结束蒸发
7. **规则自身无审计**：链接失效、命令更名、路径迁移无自动检测

## Ranked Ideas

### 1. 规则去重即活契约 (Single-Source-of-Truth Rules)
**Description:** 将分散在 3 份文档中的代码红线合并为单一结构化数据源（YAML/JSON），通过生成脚本自动渲染所有 markdown 表格。规则变更时，一次编辑、全处同步。
**Rationale:** 当前同一规则在 3 处出现，格式不同（AGENTS.md 无"阻断标准"列，engineering-with-codex-openai.md 有"阻断标准"列，code-quality-redlines.md 有"失败后果"列），已存在漂移证据。单一数据源消除同步负担，让规则系统自身可维护。
**Downsides:** 需要编写和维护生成脚本；迁移期间需人工比对确保无遗漏；新同事需要学习"编辑源文件而非 markdown"的工作流。
**Confidence:** 90%
**Complexity:** Medium
**Status:** Unexplored

### 2. CLAUDE.md 路径路由自动补全
**Description:** 补全路径路由表缺失的 `src/worker/`、`src/cache/`、`src/watcher/`、`src/plugins/` 映射。同时添加 CI 检查：若新增 `src/*/` 目录而无路由条目，构建失败。
**Rationale:** 当前 14 个 src/ 子目录中仅 5 个有路由映射。AI 助手触碰未映射目录时要么防御性读取全部规则（烧 token），要么在无知觉中违反约束。自动化检查防止路由表永远滞后于代码现实。
**Downsides:** 目录归属可能存在争议（如 worker/ 应映射到 architecture-guardrails.md 还是 testing.md）；遗留目录 orchestrator/、core/ 需明确策略。
**Confidence:** 95%
**Complexity:** Low
**Status:** Unexplored

### 3. 替换 Echo Stub 为真实检查
**Description:** `npm run check:architecture` 和 `check:unused` 当前是 echo 占位符，但 architecture-guardrails.md 将其列为"快速验证"步骤。dependency-cruiser 已在 dependencies 中，应配置真实规则并启用。
**Rationale:** "幽灵命令"摧毁信任——操作者运行后获得虚假安全感。这是 harness rollout doc 中标记为"已配置"但实际不可用的项目。修复后架构护栏真正生效，每次提交自动验证分层依赖。
**Downsides:** dependency-cruiser 规则配置需要校准（false positive 可能很多）；可能暴露现有违规需批量清理；knip 仍需安装。
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 4. 可信度自评结构化输出
**Description:** 当前可信度自评（AGENTS.md 5.1）是纯散文，写后即弃。定义轻量 schema（YAML frontmatter 或 JSON），AI 在任务完成时输出结构化数据，收集为 per-task 日志。
**Rationale:** 从"荣誉系统"转变为可分析数据集。长期可识别：哪些风险标记最常被忽略、哪些"确定信息"后来被证伪、哪些任务类型的自评最不可靠。数据驱动的可信度校准比直觉更可靠。
**Downsides:** 需要定义和迭代 schema；历史数据无法回溯；存储和索引结构化日志需要基础设施。
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 5. 双 CLAUDE.md 职责澄清/合并
**Description:** 根目录 `CLAUDE.md`（自称为"入口路由"）与 `.claude/CLAUDE.md`（自称为"项目特定指令"）内容重叠且部分矛盾（如交付清单项目不同、TDD 要求表述不同）。需明确职责分割或合并为单一入口。
**Rationale:** 每次新会话都要在脑中协调两份"主文档"，决策疲劳真实存在。根目录 CLAUDE.md 说"只做入口路由"却包含路由表、规则默认值、dogfood 命令、交付清单——它实际上在做 `.claude/CLAUDE.md` 的事。
**Downsides:** 合并可能丢失 Claude Code 自动读取 `.claude/CLAUDE.md` 的便利性；分割需要精心设计边界，否则会变成"三份文档"问题。
**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

### 6. 解决方案归档 (Post-Task Diff as Institutional Memory)
**Description:** 每次 L1+ 任务完成后，将 diff、计划、验证命令、结果捕获为结构化记录存入 `docs/solutions/`。按问题类型、受影响模块、解决模式索引。
**Rationale:** 当前知识随会话结束而蒸发。`docs/exec-plans/completed/` 有计划记录但无解决方案记录。"我们上次如何解决跨层导入违规？""那个 YAML 正则 prerelease 坑是什么来着？"无法回答。
**Downsides:** 需要建立记录格式和索引约定；维护负担随时间增长；可能变成垃圾堆（需要定期清理）。
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 7. 规则系统自我审计
**Description:** 系统定期自动审计自身健康：检查 AGENTS.md / CLAUDE.md 中所有链接是否有效、引用的命令是否存在、路径路由是否覆盖实际目录、每条规则是否有对应自动化检测。生成"规则健康报告"。
**Rationale:** 规则自身也会腐烂——链接失效（如 AGENTS.md §6 引用 `analyze` 命令参数可能已变化）、命令更名、路径迁移、阈值过时。当前是"被动修复"模式，发现问题才修复。主动审计防止规则系统悄悄失效。
**Downsides:** 审计规则本身也需要维护；可能产生误报（如某些链接故意指向外部资源）；需要决定审计频率和触发条件。
**Confidence:** 70%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | 单文件真相源（YAML 替换 AGENTS.md + CLAUDE.md + ARCHITECTURE.md） | 过于激进，会破坏现有工作流；#1 已覆盖规则去重痛点 |
| 2 | 规则数据库（SQLite/JSON） | 过度工程化，500 行规则不需要数据库查询能力 |
| 3 | 路径路由自动推导 | 有趣但复杂；静态补全 + CI 检查（#2）更务实 |
| 4 | Harness 可执行化（TypeScript 模块） | 工程量大；当前核心痛点是同步而非可执行性 |
| 5 | Harness MCP Server | 同 #4，范围过大，不适合当前阶段 |
| 6 | Harness 即测试框架 | 同 #4，当前阶段不适用 |
| 7 | 文档漂移自动检测修复 | 价值高但实现复杂，需解析 markdown 中代码片段 |
| 8 | 自收缩文档系统 | "零引用"不等于"无价值"，误伤风险高 |
| 9 | 活架构（自动生成 ARCHITECTURE.md） | 设计决策和迁移计划无法从代码自动生成 |
| 10 | TODO-DEBT 激活 | 问题真实但范围小，当前优先级不高 |
| 11 | 自动可信度回填（基于执行轨迹） | 太复杂，需大量基础设施；#4 更务实 |
| 12 | 自动验证交付（git post-commit） | 被 #4 部分覆盖，实现复杂 |
| 13 | 验证命令依赖图（DAG） | `check:all` 硬编码问题不严重 |
| 14 | Agent 性能遥测 | 数据驱动好，但当前更紧迫的是修复规则系统 |
| 15 | 规则变更金丝雀流水线 | 高杠杆但复杂，适合未来考虑 |
| 16 | Context Injection API | 太抽象，项目已有 CodeMap CLI |
| 17 | 类型化文档（TypeScript 接口生成 md） | 与 #1 类似但更局限 |
| 18 | 自动任务分级 | L0-L3 主观判断难完全自动化 |
| 19 | 自我修复验证（ESLint auto-fix 扩展） | ESLint --fix 已存在，增量价值有限 |
| 20 | 失败场景注册表 | 范围较小，当前优先级不高 |

## Session Log

- 2026-04-22: Initial ideation — 40 raw candidates generated across 4 frames (user pain, inversion/automation, assumption-breaking, leverage), 7 survivors after adversarial filtering
