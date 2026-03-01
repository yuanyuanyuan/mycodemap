# Triad 验收标准

## 概述

本文档定义工作流编排器测试任务的验收标准，确保交付质量。

## 验收检查清单

### 文件结构验收

- [ ] `src/orchestrator/workflow/__tests__/workflow-orchestrator.test.ts` 存在
- [ ] `src/orchestrator/workflow/__tests__/workflow-context.test.ts` 存在
- [ ] `src/orchestrator/workflow/__tests__/workflow-persistence.test.ts` 存在
- [ ] `src/orchestrator/workflow/__tests__/phase-checkpoint.test.ts` 存在
- [ ] `src/orchestrator/workflow/__tests__/config.test.ts` 存在

### 测试框架验收

- [ ] 使用 `vitest` 导入 (import { ... } from 'vitest')
- [ ] 使用 `describe` 组织测试套件
- [ ] 使用 `it` 或 `test` 定义测试用例
- [ ] 使用 `expect` 进行断言
- [ ] 使用 `beforeEach`/`afterEach` 管理生命周期

### Mock验收

- [ ] 使用 `vi.mock('node:fs')` 模拟文件系统
- [ ] Mock包含 `readFile`, `writeFile`, `mkdir`, `readdir`, `unlink`, `access`
- [ ] 使用 `vi.mock` 模拟外部依赖类
- [ ] 使用 `vi.fn()` 创建spy函数
- [ ] Mock有明确的返回值

### 功能覆盖验收

#### workflow-orchestrator.test.ts
- [ ] 测试 `start()` 方法
- [ ] 测试 `executeCurrentPhase()` 方法
- [ ] 测试 `proceedToNextPhase()` 方法
- [ ] 测试 `getStatus()` 方法
- [ ] 测试 `resume()` 方法
- [ ] 测试 `checkpoint()` 方法
- [ ] 测试 `listWorkflows()` 方法
- [ ] 测试 `deleteWorkflow()` 方法
- [ ] 测试状态机: pending → running → completed → verified
- [ ] 测试错误处理

#### workflow-context.test.ts
- [ ] 测试 `WorkflowContextFactory.create()`
- [ ] 测试 `WorkflowContextFactory.validate()`
- [ ] 测试 `WorkflowContextFactory.createPhaseArtifacts()`
- [ ] 测试 `WorkflowContextValidator.canProceed()`
- [ ] 测试 `WorkflowContextValidator.isValidStatusTransition()`
- [ ] 测试所有有效状态转换
- [ ] 测试所有无效状态转换

#### workflow-persistence.test.ts
- [ ] 测试 `save()` 方法
- [ ] 测试 `load()` 方法（成功和失败）
- [ ] 测试 `loadActive()` 方法
- [ ] 测试 `list()` 方法
- [ ] 测试 `delete()` 方法
- [ ] 测试 Map 序列化和反序列化
- [ ] 测试 Set 序列化和反序列化
- [ ] 测试 Date 序列化和反序列化
- [ ] 测试文件不存在处理

#### phase-checkpoint.test.ts
- [ ] 测试 `validate()` 方法
- [ ] 测试 `validateAll()` 方法
- [ ] 测试 `getSummary()` 方法
- [ ] 测试交付物存在验证
- [ ] 测试交付物内容验证
- [ ] 测试验证失败场景

#### config.test.ts
- [ ] 测试 `PHASE_CI_CONFIG` 导出
- [ ] 测试 `PHASE_GIT_CONFIG` 导出
- [ ] 测试 `PHASE_TEST_STRATEGY` 导出
- [ ] 测试 `CONFIDENCE_REQUIREMENTS` 导出
- [ ] 测试 `WORKFLOW_CONFIG` 导出
- [ ] 测试配置值正确性

### 边界条件验收

- [ ] null参数处理
- [ ] undefined参数处理
- [ ] 空字符串处理
- [ ] 空Map序列化
- [ ] 空Set序列化
- [ ] 文件不存在返回null
- [ ] 无效状态转换返回false
- [ ] 强制推进(force=true)场景

### 代码质量验收

- [ ] 无 `any` 类型使用
- [ ] 类型导入正确
- [ ] 测试描述清晰准确
- [ ] 无冗余代码
- [ ] 代码格式一致
- [ ] 遵循项目代码风格

### 覆盖率验收

- [ ] 语句覆盖率100%
- [ ] 分支覆盖率100%
- [ ] 函数覆盖率100%
- [ ] 行覆盖率100%

## 自动化验收

运行以下命令进行自动化验收：

```bash
# 1. 运行测试
npm test -- src/orchestrator/workflow/__tests__

# 2. 检查覆盖率
npm run test:coverage -- src/orchestrator/workflow/__tests__

# 3. TypeScript检查
npx tsc --noEmit

# 4. Lint检查
npm run lint -- src/orchestrator/workflow/__tests__
```

## 验收流程

```
┌─────────────────┐
│   开始验收      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 1. 文件结构检查 │
│    (自动)       │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. 测试运行     │
│    (自动)       │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. 覆盖率验证   │
│    (自动)       │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. 代码质量检查 │
│    (自动+人工)  │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. 边界条件审查 │
│    (人工)       │
└────────┬────────┘
         ▼
┌─────────────────┐
│    决策点       │
│ 通过 / 不通过   │
└─────────────────┘
```

## 验收决策

### 通过标准

所有验收检查项通过，评分为 **A级(90-100)** 或 **B级(75-89)**。

### 不通过标准

以下任一情况导致不通过：
- 有测试失败
- 覆盖率<100%
- 有TypeScript错误
- 评分 < 75分
- 关键边界条件未覆盖

### 后续动作

| 结果 | 动作 |
|------|------|
| 通过 | 合并代码，记录完成 |
| 不通过 | 返回QA或Generator修复 |

## 验收记录

验收完成后，记录以下信息：

- 验收日期
- 验收人
- 测试结果摘要
- 覆盖率报告
- 评分结果
- 备注/建议
