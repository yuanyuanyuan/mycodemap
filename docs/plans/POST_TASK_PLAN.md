# CodeMap 后续任务计划

> 生成时间: 2026-03-03
> 状态: 规划中

---

## 一、v2.5 工作流编排器实现状态

### ✅ 已完成 (核心功能)

| 模块 | 实现文件 | 状态 |
|------|---------|------|
| WorkflowOrchestrator | `src/orchestrator/workflow/workflow-orchestrator.ts` | ✅ |
| WorkflowPersistence | `src/orchestrator/workflow/workflow-persistence.ts` | ✅ |
| PhaseCheckpoint | `src/orchestrator/workflow/phase-checkpoint.ts` | ✅ |
| WorkflowContext | `src/orchestrator/workflow/workflow-context.ts` | ✅ |
| CLI Commands | `src/cli/commands/workflow.ts` | ✅ |
| CI Integration | `src/cli/commands/ci.ts` | ✅ |

### ⚠️ 扩展功能 (v2.6 规划)

| 模块 | 设计位置 | 优先级 | 说明 |
|------|---------|--------|------|
| WorkflowResultFusion | RESULT_FUSION_DESIGN.md §8.1 | P2 | 跨阶段结果融合 |
| PhaseInheritance | RESULT_FUSION_DESIGN.md §8.2 | P2 | 阶段结果继承 |
| WorkflowTestLinker | TEST_LINKER_DESIGN.md §7.2 | P3 | 工作流测试建议 |
| WorkflowGitAnalyzer | GIT_ANALYZER_DESIGN.md §10.2 | P3 | 工作流Git分析 |
| WorkflowCIExecutor | CI_GATEWAY_DESIGN.md §11.2 | P3 | 工作流CI执行 |

---

## 二、后续任务清单

### P0 - 立即执行 (24小时内)

| 任务ID | 任务描述 | 依赖 | 状态 |
|--------|---------|------|------|
| T001 | 运行完整测试套件验证功能 | - | ✅ done |
| T002 | 更新 README.md 工作流文档 | T001 | pending |

### P1 - 高优先级 (本周)

| 任务ID | 任务描述 | 依赖 | 状态 |
|--------|---------|------|------|
| T003 | 实现 WorkflowResultFusion 跨阶段融合 | T001 | pending |
| T004 | 实现 PhaseInheritance 阶段继承 | T003 | pending |
| T005 | 添加工作流 E2E 集成测试 | T001 | pending |

### P2 - 中优先级 (本月)

| 任务ID | 任务描述 | 依赖 | 状态 |
|--------|---------|------|------|
| T006 | WorkflowTestLinker 实现 | T005 | pending |
| T007 | WorkflowGitAnalyzer 实现 | T005 | pending |
| T008 | WorkflowCIExecutor 实现 | T005 | pending |

### P3 - 低优先级 (季度)

| 任务ID | 任务描述 | 依赖 | 状态 |
|--------|---------|------|------|
| T009 | 工作流可视化 UI | T005 | pending |
| T010 | 工作流模板系统 | T005 | pending |

---

## 三、验收标准

### 功能验收

- [x] 所有 CLI 命令正常工作 (`workflow start/status/proceed/resume/checkpoint`)
- [x] CI 门禁全部通过 (`check-commits/check-headers/assess-risk/check-output-contract`)
- [x] 单元测试通过率 >= 80% (723/723)
- [x] 工作流持久化正常工作

### 性能验收

- [ ] Hit@8 >= 90% (需要基准测试验证)
- [ ] Token 消耗降低 >= 40% (需要基准测试验证)
- [ ] CLI 响应时间 < 2s

### 文档验收

- [ ] README.md 更新
- [ ] CLI 命令文档完整
- [ ] API 文档同步更新

---

## 四、里程碑

### M1: v2.5 正式发布 (目标: 2026-03-07)
- [x] P0 任务全部完成 (测试已通过)
- [x] 核心功能稳定 (723/723 测试通过)
- [ ] 文档更新完成 (README.md 待更新)

### M2: v2.6 规划 (目标: 2026-04-01)
- [ ] P1 任务全部完成
- [ ] 扩展功能实现

---

## 五、技术债务

| 债务项 | 描述 | 优先级 |
|--------|------|--------|
| TEST_PATTERNS 硬编码 | 测试匹配模式应配置化 | P2 |
| 缺少错误重试机制 | 网络/IO 错误应自动重试 | P2 |
| 日志轮转配置 | 生产环境需要日志轮转 | P3 |

---

## 六、资源

### 相关文档

- [REFACTOR_ARCHITECTURE_OVERVIEW.md](../docs/REFACTOR_ARCHITECTURE_OVERVIEW.md)
- [REFACTOR_ORCHESTRATOR_DESIGN.md](../docs/REFACTOR_ORCHESTRATOR_DESIGN.md)
- [CI_GATEWAY_DESIGN.md](../docs/CI_GATEWAY_DESIGN.md)

### 代码位置

- 工作流核心: `src/orchestrator/workflow/`
- CLI 命令: `src/cli/commands/workflow.ts`
- CI 命令: `src/cli/commands/ci.ts`

---

*此文档由 Claude Code 自动生成*
