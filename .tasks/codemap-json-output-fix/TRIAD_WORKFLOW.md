# Triad Workflow for CodeMap CLI JSON Output Fix

## 概述

本文档定义了 CodeMap CLI JSON 输出修复任务的三角色工作流程。

**三角色原则**:
- 三个角色必须是独立的 agents
- 禁止同名复用
- 必须按顺序执行: generator → qa → supervisor

---

## Phase 1: Generation (生成阶段)

### 执行角色: Generator

### 输入
- 任务背景和需求描述
- 目标文件位置
- 修复范围和要求

### 处理流程

1. **分析需求**
   - 理解 JSON 输出污染问题
   - 确定修复范围: tool-orchestrator.ts
   - 识别需要移除的 console 日志位置

2. **生成任务四件套**
   - ✅ PROMPT.md - 任务提示词
   - ✅ EVAL.ts - 评估检查点
   - ✅ SCORING.md - 评分标准
   - ✅ task-metadata.yaml - 任务元数据

3. **生成 Triad 工件**
   - ✅ TRIAD_ROLES.yaml - 角色定义
   - ✅ TRIAD_WORKFLOW.md - 工作流文档
   - ✅ TRIAD_ACCEPTANCE.md - 验收标准

4. **质量自检查**
   - SCORING.md 总分是否为 100
   - PROMPT.md 是否包含 retrieval-led 指令
   - EVAL.ts 是否包含所有4个 phase 的测试
   - 所有模板字段是否已填写

### 输出
- 7个任务文件全部生成完毕
- 提交给 QA 进行审查

### 交接条件
- [x] 所有必需文件已生成
- [x] 文件格式正确
- [x] 可以进入 QA 审查阶段

---

## Phase 2: QA Review (质量保证审查)

### 执行角色: QA

### 输入
- Generator 生成的所有任务文件

### 审查流程

#### Step 1: PROMPT.md 审查
```yaml
检查项:
  - background_clear: 背景描述是否清晰
    status: pending
  
  - requirements_specific: 需求是否具体明确
    status: pending
  
  - constraints_defined: 约束条件是否定义完整
    status: pending
  
  - acceptance_criteria_testable: 验收标准是否可测试
    status: pending
  
  - retrieval_led_instruction_present: 是否包含 retrieval-led 指令
    status: pending
```

#### Step 2: EVAL.ts 审查
```yaml
检查项:
  - phase1_tests_exist: Phase 1 测试代码存在
    status: pending
  
  - phase2_tests_exist: Phase 2 测试代码存在
    status: pending
  
  - phase3_tests_exist: Phase 3 测试代码存在
    status: pending
  
  - phase4_tests_exist: Phase 4 测试代码存在
    status: pending
  
  - tests_are_executable: 测试可执行
    status: pending
```

#### Step 3: SCORING.md 审查
```yaml
检查项:
  - total_is_100: 总分等于100
    status: pending
  
  - criteria_clear: 评分标准清晰
    status: pending
  
  - grades_defined: 等级定义明确
    status: pending
```

#### Step 4: Triad 工件审查
```yaml
检查项:
  - roles_distinct: 三个角色是独立的
    status: pending
  
  - no_name_reuse: 没有同名复用
    status: pending
  
  - workflow_complete: 工作流完整
    status: pending
```

### 输出
- QA 审查报告
- 问题清单（如有）
- 通过/不通过决定

### 决策路径

```
if (所有检查项通过):
    → 通过，提交给 Supervisor
elif (轻微问题):
    → 记录问题，通过，提交给 Supervisor
else:
    → 不通过，返回给 Generator 修改
```

### 交接条件
- [ ] QA 审查完成
- [ ] 审查报告已生成
- [ ] 可以进入 Supervisor 审批阶段

---

## Phase 3: Supervisor Approval (监督者审批)

### 执行角色: Supervisor

### 输入
- Generator 生成的任务文件
- QA 的审查报告

### 审批流程

#### Gate 1: 工件完整性检查
```yaml
检查项:
  - PROMPT.md: 存在且有效
    status: pending
  
  - EVAL.ts: 存在且有效
    status: pending
  
  - SCORING.md: 存在且有效
    status: pending
  
  - task-metadata.yaml: 存在且有效
    status: pending
  
  - TRIAD_ROLES.yaml: 存在且有效
    status: pending
  
  - TRIAD_WORKFLOW.md: 存在且有效
    status: pending
  
  - TRIAD_ACCEPTANCE.md: 存在且有效
    status: pending
```

#### Gate 2: QA 审查结果
```yaml
检查项:
  - qa_review_completed: QA 审查已完成
    status: pending
  
  - no_blocking_issues: 无阻塞性问题
    status: pending
```

#### Gate 3: 验收标准清晰度
```yaml
检查项:
  - acceptance_criteria_specific: 验收标准具体明确
    status: pending
  
  - validation_commands_provided: 提供了验证命令
    status: pending
  
  - success_criteria_measurable: 成功标准可衡量
    status: pending
```

#### Gate 4: 约束条件满足
```yaml
检查项:
  - retrieval_led_instruction_present: 包含 retrieval-led 指令
    status: pending
  
  - scoring_total_equals_100: 评分总和为100
    status: pending
  
  - max_tasks_within_limit: 任务数不超过5个
    status: pending
  
  - all_phases_have_tests: 所有阶段有测试
    status: pending
```

### 输出
- 审批决定: approve / reject / escalate
- 审批意见

### 决策路径

```
if (所有 Gate 通过):
    → APPROVE: 批准任务，进入执行阶段
    → 交接给 Task-Executor
    
elif (可修复的问题):
    → REJECT: 拒绝任务，返回 Generator 修改
    → 提供具体的修改要求
    
else:
    → ESCALATE: 升级处理
    → 需要人工干预决策
```

### 交接条件
- [ ] Supervisor 审批通过
- [ ] 任务已标记为可执行
- [ ] 可以交给 Task-Executor 执行

---

## Phase 4: Execution (执行阶段)

### 执行角色: Task-Executor

### 输入
- Supervisor 批准的任务
- 所有任务文件

### 执行流程

1. **阅读任务**
   - 仔细阅读 PROMPT.md
   - 理解修复要求和验收标准

2. **执行修复**
   - 读取 tool-orchestrator.ts 文件
   - 注释或删除所有 console 日志调用
   - 保留业务逻辑代码

3. **构建验证**
   - 运行 `npm run build`
   - 确保编译通过

4. **功能验证**
   - 运行 `node dist/cli/index.js analyze --json`
   - 验证输出为纯净 JSON
   - 运行 EVAL.ts 中的所有检查点

5. **提交结果**
   - 标记任务完成
   - 提供执行报告

---

## 工作流状态流转

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  GENERATION │────→│  QA REVIEW  │────→│ SUPERVISOR  │────→│  EXECUTION  │
│   (Done)    │     │  (Pending)  │     │ (Pending)   │     │  (Pending)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                            │                   │
                            ▼                   ▼
                     ┌─────────────┐     ┌─────────────┐
                     │   REJECT    │     │  ESCALATE   │
                     │ (Back to    │     │ (Manual     │
                     │  Generator) │     │  Review)    │
                     └─────────────┘     └─────────────┘
```

---

## 当前状态

| Phase | Status | Role | Next Action |
|-------|--------|------|-------------|
| Generation | ✅ Completed | Generator | Handoff to QA |
| QA Review | ⏳ Pending | QA | Review artifacts |
| Supervisor Approval | ⏳ Pending | Supervisor | Await QA completion |
| Execution | ⏳ Pending | Task-Executor | Await approval |

---

## 升级路径

如果在任何阶段遇到以下情况，需要升级处理：

1. **Generator 阶段**: 需求不明确，无法生成任务
2. **QA 阶段**: 发现严重设计问题
3. **Supervisor 阶段**: 资源冲突或优先级调整
4. **Execution 阶段**: 遇到未预料的技术障碍

升级联系人: 项目技术负责人
