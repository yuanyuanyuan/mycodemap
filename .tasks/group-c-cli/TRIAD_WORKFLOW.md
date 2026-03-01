# Triad Workflow Specification
# 任务ID: group-c-cli-001

## 概述

本文档定义CLI命令模块测试任务的三角色工作流：
- **Generator** (任务生成器)
- **QA Reviewer** (质量审核员)
- **Supervisor** (任务监理)

## 工作流阶段

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Generator  │────▶│ QA Reviewer │────▶│  Supervisor │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                    │                  │
       │                    ▼                  ▼
       └────────────┐  需返工           ┌─────────┐
                    │◀──────────────────┤ 批准执行 │
                    └───────────────────┘         │
                                                  ▼
                                           ┌─────────────┐
                                           │   Executor  │
                                           └─────────────┘
```

## Phase 1: 任务生成 (Generator)

### 输入
- 源文件列表 (11个CLI命令)
- 设计文档 (CI_GATEWAY_DESIGN.md等)
- 现有测试参考 (ci.test.ts等)

### 执行步骤

1. **读取源文件**
   ```bash
   # 分析命令结构和依赖
   cat src/cli/commands/complexity.ts
   cat src/cli/commands/cycles.ts
   # ... 其他文件
   ```

2. **生成任务套件**
   创建以下文件：
   - `PROMPT.md` - 详细需求文档
   - `EVAL.ts` - 分层评估标准
   - `SCORING.md` - 评分规则
   - `task-metadata.yaml` - 任务元数据
   - `TRIAD_ROLES.yaml` - 角色定义
   - `TRIAD_WORKFLOW.md` - 工作流说明
   - `TRIAD_ACCEPTANCE.md` - 验收标准

3. **自检清单**
   - [ ] 所有必需字段已填写
   - [ ] 总分等于100
   - [ ] 包含retrieval-led指令
   - [ ] 包含反例场景
   - [ ] 评分规则可执行

4. **提交评审**
   将生成物提交给QA Reviewer

### 输出物
完整任务四件套 + Triad工件

---

## Phase 2: 质量评审 (QA Reviewer)

### 输入
- Generator生成的全套文档

### 执行步骤

1. **完整性检查**
   ```yaml
   检查项:
     - PROMPT.md 存在且非空
     - EVAL.ts 存在且可执行
     - SCORING.md 分值总和为100
     - task-metadata.yaml 格式正确
     - TRIAD_ROLES.yaml 角色定义完整
     - TRIAD_WORKFLOW.md 流程清晰
     - TRIAD_ACCEPTANCE.md 标准可测量
   ```

2. **内容质量检查**
   ```yaml
   PROMPT.md:
     - 背景说明清晰
     - 初始状态明确
     - 约束条件具体
     - 验收标准可验证
   
   EVAL.ts:
     - 分层检查点完整
     - 测试代码可执行
     - 覆盖所有功能点
   
   SCORING.md:
     - 分值分配合理
     - 评分等级明确
     - 扣分项清晰
   ```

3. **风险评估**
   | 风险级别 | 定义 | 处理 |
   |----------|------|------|
   | 阻塞 | 导致任务无法执行 | 必须返工 |
   | 高 | 可能导致质量问题 | 建议返工 |
   | 中 | 需要关注 | 记录并监控 |
   | 低 | 轻微改进点 | 记录即可 |

4. **生成评审报告**
   ```markdown
   # QA Review Report
   
   ## 总结
   - 状态: [通过/有条件通过/不通过]
   - 风险级别: [高/中/低]
   
   ## 发现项
   
   ### 阻塞问题
   1. [问题描述] - [建议]
   
   ### 高风险项
   1. [问题描述] - [建议]
   
   ### 改进建议
   1. [建议内容]
   
   ## 检查清单
   - [x] 完整性检查通过
   - [x] 内容质量检查通过
   - [x] 风险评估完成
   ```

### 输出物
`qa_review_report.md`

---

## Phase 3: 监理审批 (Supervisor)

### 输入
- 全套生成物
- QA评审报告

### 决策矩阵

| QA评审结果 | 风险级别 | 决策 |
|------------|----------|------|
| 通过 | 无 | 批准执行 |
| 通过 | 低 | 批准执行，记录改进项 |
| 有条件通过 | 中 | 批准执行，监控风险点 |
| 不通过 | 高/阻塞 | 退回返工 |

### 执行步骤

1. **审阅生成物**
   - 快速检查完整性
   - 关注QA标记的风险点

2. **审阅QA报告**
   - 确认检查清单已执行
   - 评估风险级别准确性

3. **做出决策**
   ```yaml
   批准条件:
     - 无阻塞问题
     - QA评审通过或有条件通过
   
   返工条件:
     - 存在阻塞问题
     - QA建议返工
     - Supervisor发现严重问题
   ```

4. **通知相关方**
   - 批准：通知Executor
   - 返工：通知Generator并说明原因

### 输出物
- 批准/返工决定
- 验收报告（如批准）

---

## Phase 4: 任务执行 (Executor)

### 输入
- 批准的任务套件

### 执行步骤

1. **阅读任务文档**
   - PROMPT.md - 理解需求
   - EVAL.ts - 理解验收标准
   - SCORING.md - 理解评分规则

2. **执行任务**
   - 按PROMPT.md要求生成测试
   - 确保覆盖EVAL.ts检查点
   - 追求SCORING.md高分

3. **自检验证**
   ```bash
   # 运行测试
   npx vitest run src/cli/commands/__tests__
   
   # 检查覆盖率
   npx vitest run --coverage src/cli/commands
   
   # 类型检查
   npx tsc --noEmit
   ```

4. **提交验收**
   向Supervisor提交成果

---

## Phase 5: 最终验收 (Supervisor)

### 验收检查

1. **文件存在性**
   - [ ] 8个测试文件全部创建

2. **测试通过性**
   - [ ] 所有测试通过

3. **覆盖率达标**
   - [ ] 语句覆盖率100%
   - [ ] 分支覆盖率100%
   - [ ] 函数覆盖率100%
   - [ ] 行覆盖率100%

4. **代码规范**
   - [ ] 文件头注释完整
   - [ ] 模拟策略正确
   - [ ] 类型使用规范

### 评分
按照SCORING.md计算最终得分

### 输出
- 验收报告
- 最终得分
- 任务关闭

---

## 流转规则

### Generator → QA Reviewer
- 触发条件: 生成物创建完成
- 必需附件: 全套7个文件
- 时限: 无

### QA Reviewer → Supervisor
- 触发条件: 评审完成
- 必需附件: qa_review_report.md
- 时限: 24小时内

### Supervisor → Generator (返工)
- 触发条件: 发现阻塞问题
- 必需附件: 返工说明
- 时限: 立即

### Supervisor → Executor
- 触发条件: 审批通过
- 必需附件: 批准通知
- 时限: 立即

---

## 沟通模板

### Generator提交评审
```
任务套件已生成完成，提交QA评审。

任务ID: group-c-cli-001
生成物位置: /data/codemap/.kimi/tasks/group-c-cli/
文件清单:
- PROMPT.md
- EVAL.ts
- SCORING.md
- task-metadata.yaml
- TRIAD_ROLES.yaml
- TRIAD_WORKFLOW.md
- TRIAD_ACCEPTANCE.md

自检结果: [通过/问题说明]
```

### QA提交审批
```
QA评审完成，提交Supervisor审批。

任务ID: group-c-cli-001
评审结果: [通过/有条件通过/不通过]
风险级别: [高/中/低/无]
阻塞问题: [数量]
建议项: [数量]

详细报告见附件: qa_review_report.md
```

### Supervisor审批通知
```
审批决定: [批准/返工]

任务ID: group-c-cli-001
决策理由: [说明]

下一步:
- 如批准: Executor开始执行
- 如返工: Generator修改后重新提交
```
