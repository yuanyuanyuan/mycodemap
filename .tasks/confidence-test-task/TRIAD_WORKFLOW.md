# TRIAD_WORKFLOW.md - 三角色工作流定义

## 概述

本任务采用三角色协作模式完成 confidence.ts 模块测试用例生成：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Generator  │ --> │     QA      │ --> │ Supervisor  │
│  (生成器)    │     │ (质量保证)   │     │  (监督者)   │
└─────────────┘     └─────────────┘     └─────────────┘
       ^                    |                   |
       └--------------------┴-------------------┘
                    (驳回时退回)
```

---

## Phase 1: Generator (生成)

### 触发条件
- 接收到用户任务请求
- 设计文档已提供

### 执行步骤

1. **源代码分析** (30分钟)
   - 读取 `src/orchestrator/confidence.ts`
   - 识别所有导出函数和类型
   - 分析逻辑分支和边界条件

2. **测试设计** (60分钟)
   - 为每个导出函数设计测试用例
   - 识别所有边界条件
   - 设计8种intent类型的测试

3. **代码生成** (90分钟)
   - 编写 `src/orchestrator/__tests__/confidence.test.ts`
   - 确保所有分支被覆盖
   - 使用 `it.each` 优化重复测试

4. **验证** (30分钟)
   - 运行测试确保通过
   - 检查覆盖率

5. **工件生成** (30分钟)
   - 生成 PROMPT.md
   - 生成 EVAL.ts
   - 生成 SCORING.md
   - 生成 task-metadata.yaml
   - 生成 TRIAD_ROLES.yaml
   - 生成 TRIAD_WORKFLOW.md
   - 生成 TRIAD_ACCEPTANCE.md

### 完成标准
- 所有测试通过
- 覆盖率初步达标
- 所有工件已生成

### 输出工件
| 工件 | 路径 | 说明 |
|------|------|------|
| 测试文件 | `src/orchestrator/__tests__/confidence.test.ts` | 主要交付物 |
| PROMPT.md | `.tasks/confidence-test-task/PROMPT.md` | 任务描述 |
| EVAL.ts | `.tasks/confidence-test-task/EVAL.ts` | 检查点定义 |
| SCORING.md | `.tasks/confidence-test-task/SCORING.md` | 评分标准 |
| task-metadata.yaml | `.tasks/confidence-test-task/task-metadata.yaml` | 任务元数据 |
| TRIAD_ROLES.yaml | `.tasks/confidence-test-task/TRIAD_ROLES.yaml` | 三角色配置 |
| TRIAD_WORKFLOW.md | `.tasks/confidence-test-task/TRIAD_WORKFLOW.md` | 本文件 |
| TRIAD_ACCEPTANCE.md | `.tasks/confidence-test-task/TRIAD_ACCEPTANCE.md` | 验收标准 |

---

## Phase 2: QA (质量保证)

### 触发条件
- Generator 完成并提交

### 执行步骤

1. **代码审查** (30分钟)
   - 阅读测试文件
   - 检查代码风格
   - 验证命名规范

2. **覆盖验证** (30分钟)
   - 检查所有导出函数是否有测试
   - 检查所有边界条件是否有测试
   - 检查所有intent类型是否有测试

3. **问题识别** (30分钟)
   - 记录遗漏的测试场景
   - 标记可优化的断言
   - 识别重复测试

4. **报告生成** (15分钟)
   - 生成 QA_REPORT.md
   - 给出通过/不通过结论

### 完成标准
- 所有导出函数有测试
- 所有边界条件有测试
- 所有intent类型有测试
- 代码风格符合规范

### 输出工件
| 工件 | 路径 | 说明 |
|------|------|------|
| QA报告 | `.tasks/confidence-test-task/QA_REPORT.md` | 质量审查结果 |

### 流转规则
- **通过** → 进入 Phase 3 (Supervisor)
- **不通过** → 退回 Phase 1 (Generator) 修复

---

## Phase 3: Supervisor (监督)

### 触发条件
- QA 通过后提交

### 执行步骤

1. **质量门禁运行** (10分钟)
   ```bash
   # 测试执行检查
   npm test -- src/orchestrator/__tests__/confidence.test.ts
   
   # 覆盖率检查
   npm test -- --coverage
   
   # EVAL评分检查
   npx tsx .tasks/confidence-test-task/EVAL.ts
   ```

2. **结果评估** (10分钟)
   - 验证测试通过数量 >= 90
   - 验证覆盖率 = 100%
   - 验证 EVAL评分 >= 90

3. **审批决定** (5分钟)
   - 批准：生成 SUPERVISOR_APPROVAL.md
   - 驳回：记录原因，退回修复

### 完成标准
- 所有质量门禁通过
- 覆盖率100%
- 评分 >= 90分

### 输出工件
| 工件 | 路径 | 说明 |
|------|------|------|
| 审批报告 | `.tasks/confidence-test-task/SUPERVISOR_APPROVAL.md` | 最终审批结果 |

### 流转规则
- **批准** → 任务完成
- **驳回** → 退回 Phase 1 (Generator) 修复

---

## 角色责任矩阵

| 责任项 | Generator | QA | Supervisor |
|--------|-----------|-----|------------|
| 生成测试代码 | ✅ | ❌ | ❌ |
| 生成任务工件 | ✅ | ❌ | ❌ |
| 代码质量审查 | ❌ | ✅ | ❌ |
| 覆盖率验证 | ⚠️ | ✅ | ✅ |
| 最终审批 | ❌ | ❌ | ✅ |
| 质量门禁执行 | ❌ | ❌ | ✅ |

---

## 时间预估

| 阶段 | 预计耗时 | 说明 |
|------|----------|------|
| Phase 1: Generator | 4-5小时 | 包含代码生成和工件生成 |
| Phase 2: QA | 1-2小时 | 审查和报告生成 |
| Phase 3: Supervisor | 30分钟 | 自动化检查为主 |
| **总计** | **5.5-7.5小时** | 无往返修复 |

---

## 流转图

```
开始
  │
  ▼
┌─────────────────┐
│  Phase 1        │
│  Generator      │
│  生成测试代码    │
└────────┬────────┘
         │ 提交
         ▼
┌─────────────────┐     ┌──────────────┐
│  Phase 2        │ --> │ 退回修复     │
│  QA             │     │ (发现严重问题)│
│  质量审查        │     └──────────────┘
└────────┬────────┘
         │ 通过
         ▼
┌─────────────────┐     ┌──────────────┐
│  Phase 3        │ --> │ 退回修复     │
│  Supervisor     │     │ (门禁未通过) │
│  最终审批        │     └──────────────┘
└────────┬────────┘
         │ 批准
         ▼
       完成
```

---

## 紧急处理

如遇到以下情况，可跳过流程：
- 用户明确要求快速交付
- 代码变更极小（<10行）
- 仅修改注释或文档

跳过规则：
- Generator 可直接交付
- 但必须在文档中标注
