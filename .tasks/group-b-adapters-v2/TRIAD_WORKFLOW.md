# Group B - 适配器模块测试任务：三角色工作流

## 工作流概览

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Generator  │────▶│     QA      │────▶│ Supervisor  │
│  (生成器)    │     │ (质量检查)   │     │  (主管)     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      ▼                    ▼                    ▼
  任务四件套           QA_FEEDBACK.md      APPROVAL_STATUS.md
  Triad 工件           CHECKLIST.md        FINAL_REPORT.md
```

---

## Phase 1: Generator (任务生成)

### 输入
- 用户需求和修复要求
- 目标源代码路径
- 已知失败项和修复清单

### 执行步骤
1. 分析需求，提取关键失败项 (CF-1~CF-4)
2. 创建任务四件套：
   - PROMPT.md: 包含背景、要求、约束、验收标准
   - EVAL.ts: 分层检查点评估脚本
   - SCORING.md: 评分标准（总分 100）
   - task-metadata.yaml: 任务元数据
3. 创建 Triad 工件：
   - TRIAD_ROLES.yaml: 三角色配置
   - TRIAD_WORKFLOW.md: 本文件
   - TRIAD_ACCEPTANCE.md: 验收标准

### 输出交付物
| 文件 | 说明 |
|------|------|
| PROMPT.md | 完整任务描述 |
| EVAL.ts | 可执行评估脚本 |
| SCORING.md | 评分标准 |
| task-metadata.yaml | 任务元数据 |
| TRIAD_ROLES.yaml | 三角色配置 |
| TRIAD_WORKFLOW.md | 工作流定义 |
| TRIAD_ACCEPTANCE.md | 验收标准 |

### 交接至 QA
- 所有文件创建完成
- 运行质量门禁检查
- 提交 QA 审查

---

## Phase 2: QA (质量检查)

### 输入
- Generator 交付的所有文件
- 目标源代码（可选，用于验证）

### 执行步骤
1. **CF 检查**：验证关键失败项是否被正确捕获
   - CF-1: 测试导入实际源代码
   - CF-2: 存在 index.test.ts
   - CF-3: Mock 策略正确
   - CF-4: 行为语义匹配

2. **EVAL 检查**：
   - 检查点是否可执行
   - 分数计算是否正确
   - 通过/失败判定是否清晰

3. **SCORING 检查**：
   - 总分是否等于 100
   - 评分等级是否定义清晰
   - 关键失败项惩罚机制是否明确

4. **生成反馈**：
   - QA_FEEDBACK.md: 审查反馈
   - CHECKLIST.md: 检查清单结果

### QA 检查清单

#### CF-1: 测试必须导入实际源代码
- [ ] PROMPT.md 明确禁止自建模拟类
- [ ] PROMPT.md 提供正确导入示例
- [ ] EVAL.ts 检查 L2-1, L2-2

#### CF-2: 必须创建 index.test.ts
- [ ] PROMPT.md 要求创建 index.test.ts
- [ ] PROMPT.md 列出必须测试的导出
- [ ] EVAL.ts 检查 L1-3, L2-5

#### CF-3: Mock 策略必须正确
- [ ] PROMPT.md 要求使用 node:child_process
- [ ] PROMPT.md 要求使用 globby 而非 glob
- [ ] EVAL.ts 检查 L2-3, L2-4

#### CF-4: 行为语义必须匹配源代码
- [ ] PROMPT.md 列出具体行为要求
- [ ] PROMPT.md 包含反例场景
- [ ] EVAL.ts 检查 L3-1 ~ L3-4

### 输出交付物
| 文件 | 说明 |
|------|------|
| QA_FEEDBACK.md | 审查反馈和改进建议 |
| CHECKLIST.md | 检查清单结果 |

### 决策
- **通过**: 所有检查项通过，提交 Supervisor
- **有条件通过**: 轻微问题，附带说明提交
- **不通过**: 重大问题，返回 Generator

---

## Phase 3: Supervisor (最终审批)

### 输入
- Generator 交付的任务四件套
- QA 的反馈和检查清单

### 执行步骤
1. **审查完整性**：
   - 所有必需文件存在
   - CF-1~CF-4 被正确标识
   - EVAL.ts 可执行

2. **评估质量**：
   - 任务描述清晰
   - 约束条件明确
   - 验收标准可验证

3. **做出决策**：
   - 批准：标记为 READY_FOR_PUBLISH
   - 有条件批准：标记为 READY_WITH_NOTES
   - 拒绝：返回 Generator 重新生成

### 决策矩阵

| 条件 | 决策 | 动作 |
|------|------|------|
| QA 通过 + 无重大问题 | 批准 | 标记 READY_FOR_PUBLISH |
| QA 通过 + 轻微问题 | 有条件批准 | 标记 READY_WITH_NOTES |
| QA 不通过 或 严重问题 | 拒绝 | 返回 Generator |

### 输出交付物
| 文件 | 说明 |
|------|------|
| APPROVAL_STATUS.md | 审批状态和理由 |
| FINAL_REPORT.md | 最终报告 |

---

## 工作流状态转换

```
CREATED ──▶ QA_REVIEW ──▶ SUPERVISOR_REVIEW ──▶ APPROVED
              │                    │
              ▼                    ▼
           REJECTED            REJECTED
              │                    │
              └────────▶ Generator (重新生成)
```

---

## 时间线

| 阶段 | 预计时间 | 责任人 |
|------|----------|--------|
| Generator | 10-15 分钟 | generator |
| QA Review | 5-10 分钟 | qa-engineer |
| Supervisor Review | 5 分钟 | supervisor |
| **总计** | **20-30 分钟** | - |

---

## 质量门禁

在每个阶段结束前必须满足：

### Generator 门禁
- [ ] 所有模板字段已填写
- [ ] CF-1~CF-4 明确标识
- [ ] 包含 "Prefer retrieval-led reasoning" 指令
- [ ] SCORING.md 总分 = 100

### QA 门禁
- [ ] 所有 CF 检查点验证完成
- [ ] EVAL.ts 可执行
- [ ] 无严重遗漏

### Supervisor 门禁
- [ ] 任务完整性确认
- [ ] 决策理由记录
