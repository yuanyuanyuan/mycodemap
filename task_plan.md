# CodeMap 重构任务生成规划

> 使用 planning-with-files 技能跟踪
> 目标：基于设计文档生成 50-100 个符合 task-generator 技能要求的 AI 评估任务

---

## 项目概述

**项目名称**: CodeMap 编排层重构  
**技术栈**: TypeScript, Node.js, CLI  
**核心功能**: 基于 AST 的代码地图生成与查询，多工具编排，CI 门禁  

### 设计文档清单

| 文档 | 模块 | 复杂度 |
|------|------|--------|
| [REFACTOR_REQUIREMENTS.md](./docs/REFACTOR_REQUIREMENTS.md) | 需求与场景 | 高 |
| [REFACTOR_ARCHITECTURE_OVERVIEW.md](./docs/REFACTOR_ARCHITECTURE_OVERVIEW.md) | 架构概览 | 高 |
| [REFACTOR_ORCHESTRATOR_DESIGN.md](./docs/REFACTOR_ORCHESTRATOR_DESIGN.md) | 编排层设计 | 极高 |
| [REFACTOR_CONFIDENCE_DESIGN.md](./docs/REFACTOR_CONFIDENCE_DESIGN.md) | 置信度机制 | 中 |
| [REFACTOR_RESULT_FUSION_DESIGN.md](./docs/REFACTOR_RESULT_FUSION_DESIGN.md) | 结果融合 | 高 |
| [REFACTOR_TEST_LINKER_DESIGN.md](./docs/REFACTOR_TEST_LINKER_DESIGN.md) | 测试关联器 | 中 |
| [REFACTOR_GIT_ANALYZER_DESIGN.md](./docs/REFACTOR_GIT_ANALYZER_DESIGN.md) | Git 分析器 | 高 |
| [CI_GATEWAY_DESIGN.md](./docs/CI_GATEWAY_DESIGN.md) | CI 门禁 | 高 |

---

## 任务分类体系

### 模块划分 (8 大模块)

1. **M1: UnifiedResult 统一结果格式** (5-8 个任务)
2. **M2: 置信度机制 (Confidence)** (6-10 个任务)
3. **M3: 结果融合 (ResultFusion)** (8-12 个任务)
4. **M4: 工具编排器 (ToolOrchestrator)** (10-15 个任务)
5. **M5: 测试关联器 (TestLinker)** (6-10 个任务)
6. **M6: Git 分析器 (GitAnalyzer)** (10-15 个任务)
7. **M7: CI 门禁 (CI Gateway)** (8-12 个任务)
8. **M8: 工作流编排器 (WorkflowOrchestrator)** (8-12 个任务)

### 任务难度分级

| 级别 | 描述 | 预估任务数 |
|------|------|-----------|
| L1: 基础 | 接口定义、简单函数实现 | 15-20 |
| L2: 进阶 | 类实现、单模块功能 | 25-30 |
| L3: 复杂 | 多模块集成、边界处理 | 15-20 |
| L4: 专家 | 架构设计、性能优化 | 5-10 |

---

## 实施阶段

### Phase 1: 基础模块任务 (M1-M3) - 20 个任务

**目标**: UnifiedResult、Confidence、ResultFusion 基础实现

| 序号 | 任务名称 | 模块 | 难度 | 依赖 |
|------|----------|------|------|------|
| 001 | 定义 UnifiedResult 统一结果接口 | M1 | L1 | - |
| 002 | 定义 SearchResult 搜索接口 | M1 | L1 | - |
| 003 | 定义 IntentType 枚举类型 | M1 | L1 | - |
| 004 | 实现 ConfidenceResult 置信度结果类型 | M2 | L1 | 001 |
| 005 | 实现 calculateConfidence 基础函数 | M2 | L2 | 004 |
| 006 | 实现结果数量评分逻辑 | M2 | L2 | 005 |
| 007 | 实现结果质量评分逻辑 | M2 | L2 | 005 |
| 008 | 实现场景特定评分逻辑 | M2 | L3 | 005 |
| 009 | 实现 CONFIDENCE_THRESHOLDS 配置 | M2 | L2 | 004 |
| 010 | 实现 ResultFusion 类基础结构 | M3 | L2 | 001 |
| 011 | 实现加权合并逻辑 | M3 | L2 | 010 |
| 012 | 实现去重逻辑（基于 file:line） | M3 | L2 | 010 |
| 013 | 实现按相关度排序 | M3 | L2 | 010 |
| 014 | 实现 Token 截断功能 | M3 | L2 | 010 |
| 015 | 实现工具权重配置 | M3 | L2 | 010 |
| 016 | 实现 applyKeywordBoost 关键词加权 | M3 | L3 | 010 |
| 017 | 实现 AI 饲料结果转换 | M3 | L3 | 010, M6 |
| 018 | 实现风险加权排序 | M3 | L3 | 017 |
| 019 | 实现 Top-K 裁剪输出 | M3 | L2 | 010 |
| 020 | 实现 WorkflowFusionContext 跨阶段融合 | M3 | L4 | 010, M8 |

### Phase 2: 编排层核心 (M4) - 15 个任务

**目标**: ToolOrchestrator、适配器、意图路由

| 序号 | 任务名称 | 模块 | 难度 | 依赖 |
|------|----------|------|------|------|
| 021 | 实现 ToolAdapter 接口定义 | M4 | L1 | 001 |
| 022 | 实现 ToolOrchestrator 类基础结构 | M4 | L2 | 021 |
| 023 | 实现 runToolWithTimeout 超时控制 | M4 | L2 | 022 |
| 024 | 实现 runToolSafely 错误隔离 | M4 | L2 | 022 |
| 025 | 实现 AstGrepAdapter 适配器 | M4 | L3 | 021 |
| 026 | 实现 CodemapAdapter 适配器 | M4 | L3 | 021 |
| 027 | 实现 RgInternalAdapter 内部兜底适配器 | M4 | L3 | 021 |
| 028 | 实现 executeWithFallback 回退执行 | M4 | L3 | 023, 024 |
| 029 | 实现 IntentRouter 意图路由 | M4 | L3 | - |
| 030 | 实现 CodemapIntent 类型定义 | M4 | L1 | 029 |
| 031 | 实现 analyze 命令 intent 映射 | M4 | L3 | 029, 022 |
| 032 | 实现并行执行策略 | M4 | L3 | 022 |
| 033 | 实现串行执行策略 | M4 | L2 | 022 |
| 034 | 实现工具可用性检测 | M4 | L2 | 022 |
| 035 | 实现 mergeResults 结果合并 | M4 | L2 | 022 |

### Phase 3: 测试关联器 (M5) - 8 个任务

**目标**: TestLinker 实现

| 序号 | 任务名称 | 模块 | 难度 | 依赖 |
|------|----------|------|------|------|
| 036 | 实现 TestConfig 类型定义 | M5 | L1 | - |
| 037 | 实现 TestLinker 类基础结构 | M5 | L2 | 036 |
| 038 | 实现 Vitest 配置解析 | M5 | L2 | 037 |
| 039 | 实现 Jest 配置解析 | M5 | L2 | 037 |
| 040 | 实现 buildMapping 映射构建 | M5 | L3 | 038, 039 |
| 041 | 实现 findRelatedTests 查找相关测试 | M5 | L2 | 040 |
| 042 | 实现 inferSourceFile 源文件推断 | M5 | L2 | 040 |
| 043 | 实现 scanTestImports 测试导入扫描 | M5 | L3 | 040 |

### Phase 4: Git 分析器 (M6) - 15 个任务

**目标**: GitAnalyzer、AI 饲料生成、Commit 验证

| 序号 | 任务名称 | 模块 | 难度 | 依赖 |
|------|----------|------|------|------|
| 044 | 实现 CommitInfo 类型定义 | M6 | L1 | - |
| 045 | 实现 CommitTag 类型定义 | M6 | L1 | 044 |
| 046 | 实现 GitAnalyzer 类基础结构 | M6 | L2 | 044 |
| 047 | 实现 findRelatedCommits 方法 | M6 | L3 | 046 |
| 048 | 实现 searchByKeywords 关键词搜索 | M6 | L2 | 047 |
| 049 | 实现 searchByFiles 文件搜索 | M6 | L2 | 047 |
| 050 | 实现 parseCommitTag 提交标签解析 | M6 | L2 | 045 |
| 051 | 实现 RiskScore 风险评分类型 | M6 | L1 | - |
| 052 | 实现 calculateRiskScore 风险评分计算 | M6 | L3 | 051, 047 |
| 053 | 实现 AIFeed 类型定义 | M6 | L1 | - |
| 054 | 实现 AIFeedGenerator 类基础结构 | M6 | L2 | 053 |
| 055 | 实现 generate 方法生成 AI 饲料 | M6 | L3 | 054 |
| 056 | 实现 FileHeaderScanner 类 | M6 | L2 | - |
| 057 | 实现 scan 文件头扫描 | M6 | L2 | 056 |
| 058 | 实现 CommitValidator 提交验证器 | M6 | L2 | 045 |

### Phase 5: CI 门禁 (M7) - 12 个任务

**目标**: CI Gateway、Git Hooks、GitHub Actions

| 序号 | 任务名称 | 模块 | 难度 | 依赖 |
|------|----------|------|------|------|
| 059 | 实现 ci 子命令基础结构 | M7 | L2 | - |
| 060 | 实现 check-commits 提交格式检查 | M7 | L2 | 058 |
| 061 | 实现 check-headers 文件头检查 | M7 | L2 | 057 |
| 062 | 实现 assess-risk 风险评估 | M7 | L3 | 052 |
| 063 | 实现 check-output-contract 输出契约检查 | M7 | L3 | 019 |
| 064 | 创建 commit-msg Git Hook | M7 | L2 | 058 |
| 065 | 创建 pre-commit Git Hook | M7 | L2 | 061 |
| 066 | 创建 GitHub Actions CI 配置 | M7 | L3 | 059-063 |
| 067 | 实现 Husky 集成脚本 | M7 | L2 | 064, 065 |
| 068 | 实现 add-headers 自动添加头注释脚本 | M7 | L2 | 057 |
| 069 | 实现 verify-commit 验证脚本 | M7 | L2 | 058 |
| 070 | 实现 check-headers.js 检查脚本 | M7 | L2 | 057 |

### Phase 6: 工作流编排器 (M8) - 12 个任务

**目标**: WorkflowOrchestrator、阶段管理、上下文持久化

| 序号 | 任务名称 | 模块 | 难度 | 依赖 |
|------|----------|------|------|------|
| 071 | 实现 WorkflowPhase 枚举定义 | M8 | L1 | - |
| 072 | 实现 PhaseDefinition 类型定义 | M8 | L1 | 071 |
| 073 | 实现 WorkflowContext 类型定义 | M8 | L2 | 072 |
| 074 | 实现 PhaseArtifacts 类型定义 | M8 | L1 | 073 |
| 075 | 实现 WorkflowOrchestrator 类基础结构 | M8 | L3 | 073 |
| 076 | 实现 start 启动工作流 | M8 | L3 | 075 |
| 077 | 实现 executeCurrentPhase 执行当前阶段 | M8 | L4 | 075 |
| 078 | 实现 proceedToNextPhase 推进阶段 | M8 | L3 | 077 |
| 079 | 实现 getStatus 获取状态 | M8 | L2 | 075 |
| 080 | 实现 WorkflowPersistence 持久化类 | M8 | L3 | 075 |
| 081 | 实现 PhaseCheckpoint 检查点验证 | M8 | L3 | 075 |
| 082 | 实现 workflow CLI 命令 | M8 | L3 | 075 |

### Phase 7: AnalyzeCommand 与集成 (跨模块) - 8 个任务

**目标**: 统一入口、集成测试、性能优化

| 序号 | 任务名称 | 模块 | 难度 | 依赖 |
|------|----------|------|------|------|
| 083 | 实现 AnalyzeCommand 类基础结构 | M4 | L3 | 022, 029 |
| 084 | 实现 impact intent 处理 | M4 | L3 | 083 |
| 085 | 实现 search intent 处理 | M4 | L3 | 083, 025 |
| 086 | 实现 reference intent 处理 | M4 | L4 | 083, 025, 041 |
| 087 | 实现输出格式化（human/machine 模式） | M4 | L2 | 083 |
| 088 | 实现错误码处理 | M4 | L2 | 083 |
| 089 | 实现向后兼容（现有命令增强） | M4 | L3 | 083 |
| 090 | 实现 Benchmark 测试套件 | 跨模块 | L4 | 所有 |

---

## 总任务统计

| Phase | 任务数 | 模块覆盖 |
|-------|--------|----------|
| Phase 1 | 20 | M1-M3 |
| Phase 2 | 15 | M4 |
| Phase 3 | 8 | M5 |
| Phase 4 | 15 | M6 |
| Phase 5 | 12 | M7 |
| Phase 6 | 12 | M8 |
| Phase 7 | 8 | 跨模块 |
| **总计** | **90** | **完整覆盖** |

---

## 质量门禁检查清单

每个任务必须包含：

- [ ] PROMPT.md（含背景、要求、验收标准）
- [ ] EVAL.ts（分层检查点测试代码）
- [ ] SCORING.md（总分 100）
- [ ] task-metadata.yaml（元数据）

交付前必须：
- [ ] 运行 `scripts/task-quality-gate.ts`
- [ ] 验证上下文块更新

---

## 进度跟踪

| 阶段 | 状态 | 已完成 | 总计 |
|------|------|--------|------|
| Phase 1 | 🔲 | 0 | 20 |
| Phase 2 | 🔲 | 0 | 15 |
| Phase 3 | 🔲 | 0 | 8 |
| Phase 4 | 🔲 | 0 | 15 |
| Phase 5 | 🔲 | 0 | 12 |
| Phase 6 | 🔲 | 0 | 12 |
| Phase 7 | 🔲 | 0 | 8 |

**当前阶段**: Phase 0 - 审查任务 (进行中)

---

## 审查任务 (2026-03-01 新增)

### 审查目标

审查 `/data/codemap/.tasks` 目录下所有任务，检查是否符合：
1. **task-generator 技能要求**
2. **8 个设计文档要求**

### 审查范围

| 设计文档 | 模块 |
|----------|------|
| REFACTOR_TEST_LINKER_DESIGN.md | 测试关联器 |
| REFACTOR_RESULT_FUSION_DESIGN.md | 结果融合 |
| [REFACTOR_REQUIREMENTS.md](./docs/REFACTOR_REQUIREMENTS.md) | 需求与场景 |
| REFACTOR_ORCHESTRATOR_DESIGN.md | 编排层设计 |
| REFACTOR_GIT_ANALYZER_DESIGN.md | Git 分析器 |
| REFACTOR_CONFIDENCE_DESIGN.md | 置信度机制 |
| [REFACTOR_ARCHITECTURE_OVERVIEW.md](./docs/REFACTOR_ARCHITECTURE_OVERVIEW.md) | 架构概览 |
| [CI_GATEWAY_DESIGN.md](./docs/CI_GATEWAY_DESIGN.md) | CI 门禁 |

### 审查清单

- [x] 检查任务四件套完整性 (PROMPT.md, EVAL.ts, SCORING.md, task-metadata.yaml)
- [x] 检查 task-generator 技能格式要求
- [x] 检查是否符合设计文档的功能要求
- [x] 检查评分标准是否符合规范
- [x] 检查 EVAL 测试覆盖是否完整

### 审查结果

- 总任务数: 90
- 符合规范: 50 (56%)
- 部分符合: 2
- 不符合: 38

详细报告: [TASK_REVIEW_REPORT.md](./TASK_REVIEW_REPORT.md)

---

## 2026-03-01 修复计划（已完成）

### 目标
1. 单次任务生成数量超过 5 时立即阻断
2. 每个任务生成强制经过三角色流程（generator/qa/supervisor）

### 执行状态
- [x] 更新 task-generator skill 规则与原则文档
- [x] 更新 metadata 模板，加入 workflow.triad 结构
- [x] 重构 `scripts/generate-tasks.js`，增加 <=5 阻断和三角色流程
- [x] 更新双质量门禁脚本，强制校验 triad 完成态
- [x] 迁移 90 个历史任务元数据以通过新门禁
- [x] 执行验证命令并确认门禁通过

## 2026-03-01 扩展计划（已完成）

### 目标
1. 用固定脚本+模板进一步替代自由生成
2. 将任务能力拆分为两个独立 skill：生成与分析

### 执行状态
- [x] 新增 triad 固定模板（角色定义/工作流/验收）
- [x] 新增 triad 工件生成脚本 `create-triad-artifacts.js`
- [x] `generate-tasks.js` 改为写入 triad 固定工件
- [x] 双质量门禁脚本新增 triad 工件检查
- [x] 新增 `task-analyzer` skill（脚本+模板+说明）
- [x] 90 个历史任务补齐 triad 工件并通过门禁

## 2026-03-01 三角色 agent + supervisor 语义引擎强化（已完成）

### 目标
1. 三角色必须是 3 个独立 agents，并强制检查 `.agents` 资产。
2. supervisor 增加独立深语义判定引擎（模板驱动）。
3. 生成/门禁/分析全链路纳入语义与 agent 校验。

### 执行状态
- [x] 新增 agent 固定模板与 `bootstrap-triad-agents.js`
- [x] `generate-tasks.js` 强制检查三 agent 独立性与 `.agents` 资产
- [x] 接入 supervisor semantic engine（评分阈值=85）并输出语义报告
- [x] 双质量门禁脚本增加 agent 资产与语义报告校验
- [x] `task-analyzer` 增加语义与 agent 阻断项
- [x] 新增 `backfill-triad-semantic.js` 回填 90 个历史任务语义工件

## 2026-03-01 多运行时适配（Claude/Codex/Kimi）（已完成）

### 目标
1. 按运行时拆分 skill 适配目录（claude/codex/kimi）。
2. skill 执行时自动判断运行时并初始化（skill 同步 + agents）。
3. Claude 补充 subagent/agent-teams 兼容方案。

### 执行状态
- [x] 新增 `skills-adapters/{claude,codex,kimi}/{task-generator,task-analyzer}/SKILL.md`
- [x] 新增 `scripts/skills/init-runtime-skills.js`（detect + sync + bootstrap + state）
- [x] `scripts/generate-tasks.js` 接入 runtime init（默认自动执行）
- [x] `task-analyzer` 与 `create-triad-artifacts` 接入 runtime init
- [x] 新增 `.skills-runtime/runtime-state.json` 状态落盘
- [x] 更新 AGENTS/CLAUDE 上下文命令与 skill 文档

## 2026-03-01 初始化资产归档到 `.tasks`（已完成）

### 目标
1. 两个 skill 的初始化目录统一到 `.tasks`（scripts/skills-adapters/.skills-runtime）。
2. analyzer 报告默认输出到 `.tasks/task_analysis_report.*`。
3. agent 资产改为 `.tasks/agents` 主存储，并在 `.agents` 建立符号链接消费层。

### 执行状态
- [x] 运行时初始化脚本迁移到 `.tasks/scripts/skills/init-runtime-skills.js`
- [x] 适配目录迁移到 `.tasks/skills-adapters/*`
- [x] 运行时状态迁移到 `.tasks/.skills-runtime/runtime-state.json`
- [x] analyzer 默认报告路径更新到 `.tasks/task_analysis_report.md/.json`
- [x] `bootstrap-triad-agents.js` 改为“先写 `.tasks/agents` 再链接 `.agents`”
- [x] `init-runtime-skills` 增加 agent 历史文件迁移（legacy/task profiles 自动迁移+回链）
- [x] 运行时 skill 同步改为 symlink，避免复制漂移

## 2026-03-01 scripts 主入口目录迁移（已完成）

### 目标
1. 将两项 skill 的主入口脚本统一迁移到 `.tasks/scripts`。
2. 根目录仅保留符号链接兼容，不保留独立脚本副本。

### 执行状态
- [x] `scripts -> .tasks/scripts`（目录级符号链接）
- [x] `generate-tasks.js`/`task-quality-gate.ts` 主文件迁入 `.tasks/scripts`
- [x] `init-runtime-skills.js` 主文件位于 `.tasks/scripts/skills`
- [x] 相关文档与 skill 使用命令改为 `.tasks/scripts/*`

## 2026-03-01 初始化依赖修复（已完成）

### 目标
1. 去除 `init-runtime-skills` 对 `.claude/skills/task-generator` 的硬依赖。
2. 支持“仅保留 `.tasks` 目录”时正常初始化。

### 执行状态
- [x] 新增 `.tasks/scripts/skills/bootstrap-triad-agents.js`（内置模板）
- [x] `init-runtime-skills` 改为优先使用 `.tasks` bootstrap，`.claude` 仅回退
- [x] AGENTS/CLAUDE 的 bootstrap 命令切换到 `.tasks` 路径

## 2026-03-01 `.tasks` 独立初始化修复（已完成）

### 目标
1. 使 `init-runtime-skills` 在缺失 `.claude/skills/task-generator` 时仍可成功。
2. 清除 `generate-tasks` 的 triad 模板读取对 `.claude` 的硬依赖。

### 执行状态
- [x] 新增 `.tasks/scripts/skills/bootstrap-triad-agents.js`
- [x] `init-runtime-skills` bootstrap 路径改为 `.tasks` 优先，`.claude` 回退
- [x] 新增 `.tasks/templates/triad-roles/workflow/acceptance` 模板
- [x] `generate-tasks` triad 模板改为 `.tasks/templates` 优先
