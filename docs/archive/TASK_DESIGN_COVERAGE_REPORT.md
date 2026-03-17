# CodeMap 任务与设计文档覆盖检查报告

> 归档时间：2026-03-15
> 归档原因：历史覆盖率报告，部分结论已被后续实现状态推翻。
> 当前依据：`ARCHITECTURE.md`、`docs/exec-plans/completed/2026-03-03-post-task-plan.md`、`src/cli/commands/workflow.ts`
> 状态：仅供历史对照，不作为当前执行依据。


> 生成时间: 2026-03-01
> 检查范围: Phase 1-10 vs 8个设计文档

---

## 摘要

| 指标 | 数值 |
|------|------|
| 设计文档总数 | 8 |
| 核心功能覆盖 | 8 (100%) |
| v2.5 规划覆盖 | 0 (0%) |
| 总体覆盖率 | ~80-85% |

---

## 详细覆盖情况

### ✅ 完整覆盖的设计文档

| 设计文档 | 对应任务 | 覆盖内容 |
|----------|----------|----------|
| **REFACTOR_CONFIDENCE_DESIGN.md** | Phase 2 | 置信度计算函数、三级阈值配置、辅助函数 |
| **REFACTOR_RESULT_FUSION_DESIGN.md** | Phase 3 | 加权合并、风险加权、去重、排序、Token截断 |
| **REFACTOR_ORCHESTRATOR_DESIGN.md** (核心) | Phase 4-5 | 工具编排器、适配器、向后兼容、Intent路由 |
| **REFACTOR_TEST_LINKER_DESIGN.md** | Phase 6 | 测试配置加载、映射构建、关联查找 |
| **REFACTOR_GIT_ANALYZER_DESIGN.md** | Phase 7-8 | Git历史分析、风险评分、AI饲料生成器 |
| **CI_GATEWAY_DESIGN.md** | Phase 9 | Commit验证、文件头检查、GitHub Actions |
| **REFACTOR_ARCHITECTURE_OVERVIEW.md** | Phase 1-10 | 整体架构、CLI命令结构、验收标准 |

### ❌ 未覆盖的设计文档（v2.5 规划）

| 设计文档 | 章节 | 说明 |
|----------|------|------|
| **REFACTOR_ORCHESTRATOR_DESIGN.md** | 第8节 | 工作流编排器设计 (WorkflowOrchestrator) |
| **REFACTOR_RESULT_FUSION_DESIGN.md** | 第8节 | 工作流上下文融合 |
| **REFACTOR_TEST_LINKER_DESIGN.md** | 第7节 | 工作流阶段测试策略 |
| **REFACTOR_GIT_ANALYZER_DESIGN.md** | 第10节 | 工作流Git分析器集成 |
| **CI_GATEWAY_DESIGN.md** | 第11节 | 工作流CI集成 |

---

## Phase 任务与设计文档映射

```
Phase 1 (unified-result)
  └── REFACTOR_ARCHITECTURE_OVERVIEW.md (第4.1节)
  └── REFACTOR_ORCHESTRATOR_DESIGN.md (第2节 类型定义)

Phase 2 (confidence)
  └── REFACTOR_CONFIDENCE_DESIGN.md (完整)
  └── REFACTOR_ARCHITECTURE_OVERVIEW.md (第4.1节)

Phase 3 (result-fusion)
  └── REFACTOR_RESULT_FUSION_DESIGN.md (完整)
  └── REFACTOR_ARCHITECTURE_OVERVIEW.md (第4.2节)

Phase 4 (tool-orchestrator)
  └── REFACTOR_ORCHESTRATOR_DESIGN.md (第1-2节)
  └── REFACTOR_CONFIDENCE_DESIGN.md (第3节)
  └── REFACTOR_RESULT_FUSION_DESIGN.md (第3节)

Phase 5 (refactor-commands)
  └── REFACTOR_ORCHESTRATOR_DESIGN.md (第3-5节)

Phase 6 (analyze-command)
  └── REFACTOR_ORCHESTRATOR_DESIGN.md (第4节)
  └── REFACTOR_TEST_LINKER_DESIGN.md (完整)
  └── REFACTOR_ARCHITECTURE_OVERVIEW.md (第4.4节)

Phase 7 (git-analyzer)
  └── REFACTOR_GIT_ANALYZER_DESIGN.md (第1-3, 6节)
  └── REFACTOR_ARCHITECTURE_OVERVIEW.md (第4.5节)

Phase 8 (ai-feed-generator)
  └── REFACTOR_GIT_ANALYZER_DESIGN.md (第4节)
  └── REFACTOR_ARCHITECTURE_OVERVIEW.md (第4.6节)
  └── REFACTOR_REQUIREMENTS.md (第8.6节)

Phase 9 (ci-gateway)
  └── CI_GATEWAY_DESIGN.md (完整)
  └── REFACTOR_ARCHITECTURE_OVERVIEW.md (第4.7节)

Phase 10 (integration)
  └── REFACTOR_ARCHITECTURE_OVERVIEW.md (第7-8节)
```

---

## 未覆盖内容详解 (v2.5 规划)

### 1. 工作流编排器 (WorkflowOrchestrator)

**需要实现的内容**:
- 阶段状态机管理 (pending → running → completed → verified)
- 阶段间上下文持久化 (WorkflowContext)
- 阶段交付物检查点 (PhaseCheckpoint)
- 交互式工作流引导 (WorkflowCLI)

**关键文件**:
- `src/orchestrator/workflow/workflow-orchestrator.ts`
- `src/orchestrator/workflow/workflow-context.ts`
- `src/orchestrator/workflow/workflow-persistence.ts`
- `src/cli/commands/workflow.ts`

### 2. 工作流上下文融合

**需要实现的内容**:
- 跨阶段结果传递
- 工作流特定加权
- 阶段间结果继承

### 3. 工作流阶段测试

**需要实现的内容**:
- 阶段特定的测试策略 (PHASE_TEST_STRATEGY)
- 测试建议生成

### 4. 工作流 Git 分析器集成

**需要实现的内容**:
- 阶段 Git 分析配置 (PHASE_GIT_CONFIG)
- WorkflowGitAnalyzer 类

### 5. 工作流 CI 集成

**需要实现的内容**:
- 阶段 CI 配置 (PHASE_CI_CONFIG)
- WorkflowCIExecutor 类

---

## 建议

### 方案 A: 保持现状
- 优点: Phase 1-10 已完成 v1.0 范围，核心功能完整
- 缺点: v2.5 规划内容缺失

### 方案 B: 添加 Phase 11
- 新增 Phase 11 专门实现工作流编排器
- 需要额外 1-2 天工作量

### 方案 C: 分阶段实施
- 在 Phase 6-10 中逐步引入工作流概念
- 但可能影响核心功能的清晰度

---

## 结论

**当前 Phase 1-10 任务足够完成实施所有设计文档的核心功能 (v1.0 范围)，覆盖率约 80-85%。**

v2.5 规划的工作流相关内容属于扩展功能，不在本次重构范围内。如果需要完整实施所有设计文档，建议添加 Phase 11。

---

## 附录 A: 详细 Phase 与设计文档对比矩阵

| 设计文档 | 总行数 | 对应任务 | 覆盖状态 | 备注 |
|---------|--------|----------|----------|------|
| REFACTOR_REQUIREMENTS.md | 962 | Phase 1-10 | ⚠️ 部分 | 场景七 E2E 流程依赖工作流编排器 |
| REFACTOR_ARCHITECTURE_OVERVIEW.md | 544 | Phase 1-10 | ✅ 核心覆盖 | v2.5 规划内容缺失 |
| REFACTOR_ORCHESTRATOR_DESIGN.md | 1000+ | Phase 4,6 | ⚠️ 部分 | 第8章工作流编排器(~350行)完全缺失 |
| REFACTOR_CONFIDENCE_DESIGN.md | 244 | Phase 2 | ✅ 基础完整 | 第6节工作流置信度(~50行)缺失 |
| REFACTOR_RESULT_FUSION_DESIGN.md | 482 | Phase 3 | ⚠️ 基础完整 | 第8节工作流融合(~70行)缺失 |
| REFACTOR_TEST_LINKER_DESIGN.md | 311 | Phase 6 | ⚠️ 基础完整 | 第7节工作流测试(~50行)缺失 |
| REFACTOR_GIT_ANALYZER_DESIGN.md | 785 | Phase 7-8 | ⚠️ 基础完整 | 第10节工作流Git集成(~100行)缺失 |
| CI_GATEWAY_DESIGN.md | 692 | Phase 9 | ⚠️ 基础完整 | 第11节工作流CI集成(~80行)缺失 |

---

## 附录 B: 遗漏功能详细清单

### B1. CLI 命令遗漏

| 命令 | 设计文档位置 | 当前任务状态 | 影响 |
|------|-------------|-------------|------|
| `codemap ci check-output-contract` | CI_GATEWAY_DESIGN.md 第4.2节 | ⚠️ Phase 9 未明确提及 | CI 门禁不完整 |
| `codemap workflow start` | ORCHESTRATOR_DESIGN.md 第8.5节 | ❌ 完全缺失 | 无法启动工作流 |
| `codemap workflow status` | ORCHESTRATOR_DESIGN.md 第8.5节 | ❌ 完全缺失 | 无法查看状态 |
| `codemap workflow proceed` | ORCHESTRATOR_DESIGN.md 第8.5节 | ❌ 完全缺失 | 无法推进阶段 |
| `codemap workflow resume` | ORCHESTRATOR_DESIGN.md 第8.5节 | ❌ 完全缺失 | 无法恢复中断 |
| `codemap workflow checkpoint` | ORCHESTRATOR_DESIGN.md 第8.5节 | ❌ 完全缺失 | 无法创建检查点 |

### B2. 类型定义遗漏

| 类型/接口 | 设计文档位置 | 用途 | 任务状态 |
|----------|-------------|------|----------|
| `WorkflowPhase` | ORCHESTRATOR_DESIGN.md 第8.2节 | 阶段类型定义 | ❌ 缺失 |
| `WorkflowContext` | ORCHESTRATOR_DESIGN.md 第8.2节 | 工作流上下文 | ❌ 缺失 |
| `PhaseDefinition` | ORCHESTRATOR_DESIGN.md 第8.2节 | 阶段契约 | ❌ 缺失 |
| `PhaseArtifacts` | ORCHESTRATOR_DESIGN.md 第8.2节 | 阶段交付物 | ❌ 缺失 |
| `WorkflowFusionContext` | RESULT_FUSION_DESIGN.md 第8.1节 | 跨阶段融合 | ❌ 缺失 |
| `PHASE_CI_CONFIG` | CI_GATEWAY_DESIGN.md 第11.1节 | 阶段CI配置 | ❌ 缺失 |
| `PHASE_GIT_CONFIG` | GIT_ANALYZER_DESIGN.md 第10.1节 | 阶段Git配置 | ❌ 缺失 |
| `PHASE_TEST_STRATEGY` | TEST_LINKER_DESIGN.md 第7.1节 | 阶段测试策略 | ❌ 缺失 |

### B3. 类实现遗漏

| 类名 | 设计文档位置 | 职责 | 任务状态 |
|------|-------------|------|----------|
| `WorkflowOrchestrator` | ORCHESTRATOR_DESIGN.md 第8.3节 | 工作流编排核心 | ❌ 缺失 |
| `WorkflowPersistence` | ORCHESTRATOR_DESIGN.md 第8.4节 | 上下文持久化 | ❌ 缺失 |
| `PhaseCheckpoint` | ORCHESTRATOR_DESIGN.md 第8.6节 | 检查点验证 | ❌ 缺失 |
| `ConfidenceGuide` | ORCHESTRATOR_DESIGN.md 第8.6节 | 置信度引导 | ❌ 缺失 |
| `WorkflowResultFusion` | RESULT_FUSION_DESIGN.md 第8.1节 | 工作流结果融合 | ❌ 缺失 |
| `PhaseInheritance` | RESULT_FUSION_DESIGN.md 第8.2节 | 阶段结果继承 | ❌ 缺失 |
| `WorkflowTestLinker` | TEST_LINKER_DESIGN.md 第7.2节 | 工作流测试建议 | ❌ 缺失 |
| `WorkflowGitAnalyzer` | GIT_ANALYZER_DESIGN.md 第10.2节 | 工作流Git分析 | ❌ 缺失 |
| `WorkflowCIExecutor` | CI_GATEWAY_DESIGN.md 第11.2节 | 工作流CI执行 | ❌ 缺失 |

---

## 附录 C: 用户场景覆盖检查

REFACTOR_REQUIREMENTS.md 第8节定义了7个用户场景：

| 场景 | 描述 | 依赖任务 | 可完整实施？ |
|------|------|----------|-------------|
| 8.1 影响分析 | 带置信度和回退 | Phase 2,4,5,6 | ✅ 是 |
| 8.2 置信度触发回退 | 低置信度时回退 | Phase 2,4 | ✅ 是 |
| 8.3 代码搜索 | 高置信度场景 | Phase 2,4,6 | ✅ 是 |
| 8.4 文档搜索 | 多工具融合 | Phase 3,6 | ✅ 是 |
| 8.5 功能实现辅助 | 参考现有实现 | Phase 5,6 | ✅ 是 |
| 8.6 CI门禁护栏 | 双层次门禁 | Phase 9 | ⚠️ 缺少 output-contract 检查 |
| 8.7 完整E2E开发流程 | 串联所有功能 | **需要工作流编排器** | ❌ **否** |

**场景七详细检查** (REFACTOR_REQUIREMENTS.md 第8.7节 ~300行): 

| 阶段 | 描述 | 独立任务可覆盖？ | 需工作流编排器？ |
|------|------|-----------------|-----------------|
| 一：参考搜索 | 找可参考实现 | ✅ Phase 6 | 否 |
| 二：影响分析 | 分析影响范围 | ✅ Phase 5/6 | 否 |
| 三：风险评估 | 风险评分计算 | ✅ Phase 7/8/9 | 否 |
| 四：代码实现 | 开发者编码 | N/A (手动) | 否 |
| 五：提交验证 | pre-commit检查 | ✅ Phase 9 | 否 |
| 六：CI流水线 | GitHub Actions | ✅ Phase 9 | 否 |
| **阶段间上下文传递** | 结果自动传递 | ❌ **无** | ✅ **是** |
| **检查点机制** | 交付物验证 | ❌ **无** | ✅ **是** |
| **交互式引导** | CLI引导 | ❌ **无** | ✅ **是** |

---

## 附录 D: 补充建议（基于详细分析）

### 新增任务建议

如果决定实施 v2.5 规划内容，建议新增：

```
Phase 11: workflow-orchestrator (工作量：2-3天)
├── 11.1 工作流核心类型定义
│   ├── WorkflowPhase, WorkflowContext, PhaseDefinition
│   └── PhaseArtifacts, PhaseStatus
├── 11.2 WorkflowOrchestrator 类实现
│   ├── start(), executeCurrentPhase(), proceedToNextPhase()
│   └── getStatus(), resume(), checkpoint()
├── 11.3 WorkflowPersistence 持久化层
│   ├── save(), load(), loadActive(), list(), delete()
│   └── Map/Set 序列化处理
├── 11.4 PhaseCheckpoint 检查点验证
│   └── validate() 交付物验证
├── 11.5 workflow CLI 命令
│   ├── workflow start/status/proceed/resume/checkpoint
│   └── 交互式引导输出
├── 11.6 各模块工作流集成配置
│   ├── PHASE_CI_CONFIG (CI_GATEWAY)
│   ├── PHASE_GIT_CONFIG (GIT_ANALYZER)
│   ├── PHASE_TEST_STRATEGY (TEST_LINKER)
│   └── CONFIDENCE_REQUIREMENTS (CONFIDENCE)
└── 11.7 集成测试
    └── 完整 E2E 流程测试
```

### 当前任务微调建议

对现有 Phase 任务进行轻微调整以修复遗漏：

| 任务 | 建议调整 |
|------|----------|
| Phase 9 | 明确添加 `codemap ci check-output-contract` 子命令实现 |
| Phase 6 | 在测试关联器中预留 `WorkflowTestLinker` 扩展接口 |
| Phase 4 | 在 `IntentRouter` 中预留 `workflow` 意图处理 |

---

## 修订结论

### 基础功能评估 (v1.0 范围)
- **Phase 1-10 足够完成**：✅ **是**
- 覆盖 REFACTOR_ARCHITECTURE_OVERVIEW.md 中标记为 v1.0 的内容
- 所有核心分析功能可正常工作

### 完整设计评估 (含 v2.5 规划)
- **Phase 1-10 足够完成**：❌ **否**
- **覆盖率约 75%**（现有报告 ~80-85% 偏乐观）
- **关键遗漏：工作流编排器 (~350行设计文档)**
- 场景七（完整 E2E 流程）无法实施

### 实施建议优先级

| 优先级 | 建议 | 理由 |
|--------|------|------|
| P0 | 保持 Phase 1-10 不变 | 核心功能完整，可独立交付 |
| P1 | 在 Phase 9 添加 check-output-contract | 完善 CI 门禁 |
| P2 | 添加 Phase 11 工作流编排器 | 完整实现设计文档 |

---

*此报告由 Claude Code 自动生成*
*补充内容生成时间: 2026-03-01*
*分析依据: 10个任务文件 vs 8个设计文档逐行对比*
