# Triad 工作流说明

## 任务ID
group-b-adapters-001

## 概述
本文档定义了 Group B 适配器模块测试任务的 Triad 三角色工作流。

---

## 三角色定义

### 1. Generator (任务生成器)

**职责**:
- 分析源代码，理解接口定义
- 生成任务四件套 (PROMPT.md, EVAL.ts, SCORING.md, task-metadata.yaml)
- 设计测试策略和 Mock 方案
- 定义验收标准

**工作流**:
```
1. 读取源文件
   ↓
2. 分析接口定义
   ↓
3. 生成 PROMPT.md
   ↓
4. 生成 EVAL.ts（含检查点）
   ↓
5. 生成 SCORING.md（总分=100）
   ↓
6. 生成 task-metadata.yaml
   ↓
7. 通知 QA 审查
```

**交付物**:
- PROMPT.md - 详细需求文档
- EVAL.ts - 评估检查点
- SCORING.md - 评分规则
- task-metadata.yaml - 任务元数据
- TRIAD_ROLES.yaml - 本文件
- TRIAD_WORKFLOW.md - 工作流说明
- TRIAD_ACCEPTANCE.md - 验收标准

---

### 2. QA (质量审查员)

**职责**:
- 审查任务套件的完整性
- 验证检查点的可执行性
- 确认 Mock 策略的可行性
- 识别遗漏的测试场景

**工作流**:
```
1. 接收任务套件
   ↓
2. 对照源代码验证接口定义
   ↓
3. 检查 EVAL.ts 检查点
   ↓
4. 验证评分规则合理性
   ↓
5. 生成 QA 审查报告
   ↓
6. 提交给 Supervisor
```

**审查清单**:
- [ ] PROMPT.md 接口定义与源代码一致
- [ ] PROMPT.md 包含 retrieval-led 指令
- [ ] EVAL.ts 检查点覆盖所有关键路径
- [ ] EVAL.ts 包含 spawn 事件模拟检查
- [ ] SCORING.md 总分等于 100
- [ ] SCORING.md 等级定义清晰
- [ ] task-metadata.yaml 依赖完整
- [ ] 边界条件覆盖完整（空输入、错误处理、异步）
- [ ] Mock 策略考虑了所有外部依赖

**交付物**:
- QA 审查报告
- 问题列表（如有）
- 改进建议（如有）

---

### 3. Supervisor (任务监督员)

**职责**:
- 批准任务发布
- 监控任务执行
- 最终验收判定

**工作流**:
```
1. 接收 QA 审查报告
   ↓
2. 审查任务套件
   ↓
3. 决策：批准 / 驳回
   ├─ 批准 → 发布任务给 Executor
   └─ 驳回 → 返回 Generator 修改
```

**审批标准**:
- QA 审查通过
- 所有约束条件满足
- 无重大遗漏

**交付物**:
- 批准/驳回决定
- 发布指令

---

## 工作流图示

```
┌─────────────┐
│  Generator  │
│  (生成任务)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     QA      │
│  (质量审查)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Supervisor │
│  (审批发布)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Executor  │
│  (执行任务)  │
└─────────────┘
```

---

## 状态流转

| 阶段 | 状态 | 负责人 | 动作 |
|------|------|--------|------|
| 1 | pending | - | 等待开始 |
| 2 | generating | Generator | 生成任务套件 |
| 3 | qa_review | QA | 质量审查 |
| 4 | supervisor_review | Supervisor | 审批 |
| 5 | rejected | Generator | 修改后重新提交 |
| 6 | approved | Supervisor | 发布任务 |
| 7 | executing | Executor | 执行测试生成 |
| 8 | verifying | QA | 验证执行结果 |
| 9 | completed | Supervisor | 任务完成 |

---

## 沟通协议

### Generator → QA
- **触发**: 任务套件生成完成
- **消息**: "任务套件已生成，请进行 QA 审查"
- **附件**: 任务四件套

### QA → Supervisor
- **触发**: QA 审查完成
- **消息**: "QA 审查完成，结果: [通过/有条件通过/不通过]"
- **附件**: 审查报告 + 任务套件

### Supervisor → Generator
- **触发**: 审批驳回
- **消息**: "任务被驳回，原因: [详细说明]，请修改后重新提交"

### Supervisor → Executor
- **触发**: 审批通过
- **消息**: "任务已批准发布，请开始执行"
- **附件**: 任务套件 + 发布指令

---

## 冲突解决

### Generator 与 QA 意见不一致
1. QA 记录具体问题
2. Generator 说明设计理由
3. 提交 Supervisor 仲裁
4. Supervisor 做最终决定

### QA 审查发现重大遗漏
1. QA 立即通知 Generator
2. Generator 评估修改范围
3. 如需重大修改，重新走完整流程
4. 如为小问题，快速修复后重新审查

---

## 时间预期

| 阶段 | 预计时间 | 备注 |
|------|----------|------|
| 生成任务套件 | 30分钟 | 基于源代码分析 |
| QA 审查 | 15分钟 | 对照检查清单 |
| Supervisor 审批 | 10分钟 | 审查报告 |
| 修改（如需） | 15分钟 | 根据反馈 |

---

## 当前状态

- **Generator**: ✅ completed (2025-03-02)
- **QA**: ⏳ pending
- **Supervisor**: ⏳ pending
- **Executor**: ⏳ pending

---

## 附录

### 相关文件
- PROMPT.md - 详细需求
- EVAL.ts - 评估检查点
- SCORING.md - 评分规则
- task-metadata.yaml - 任务元数据
- TRIAD_ROLES.yaml - 角色定义

### 源代码
- src/orchestrator/adapters/base-adapter.ts
- src/orchestrator/adapters/ast-grep-adapter.ts
- src/orchestrator/adapters/codemap-adapter.ts
- src/orchestrator/adapters/index.ts
