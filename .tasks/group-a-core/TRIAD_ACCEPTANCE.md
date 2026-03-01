# TRIAD_ACCEPTANCE.md
# Triad 验收标准
# 任务ID: group-a-core-001

---n
## 1. 验收概述

本文档定义了 Triad 工作流中各阶段的验收标准，用于判断任务是否达到可发布状态。

---

## 2. Generator 阶段验收

### 2.1 交付物完整性

| 检查项 | 标准 | 验收方法 |
|--------|------|----------|
| PROMPT.md 存在 | 文件已创建 | 文件系统检查 |
| EVAL.ts 存在 | 文件已创建 | 文件系统检查 |
| SCORING.md 存在 | 文件已创建 | 文件系统检查 |
| task-metadata.yaml 存在 | 文件已创建 | 文件系统检查 |
| TRIAD_ROLES.yaml 存在 | 文件已创建 | 文件系统检查 |
| TRIAD_WORKFLOW.md 存在 | 文件已创建 | 文件系统检查 |
| TRIAD_ACCEPTANCE.md 存在 | 文件已创建 | 文件系统检查 |

### 2.2 PROMPT.md 内容标准

| 检查项 | 标准 | 验收方法 |
|--------|------|----------|
| 背景章节 | 包含任务背景说明 | 内容审查 |
| 要求章节 | 包含详细功能要求 | 内容审查 |
| 初始状态 | 描述源文件当前状态 | 内容审查 |
| 约束条件 | 列出所有约束 | 内容审查 |
| 验收标准 | 定义明确的验收标准 | 内容审查 |
| 用户价值 | 说明任务价值 | 内容审查 |
| 反例场景 | 提供错误示例 | 内容审查 |
| retrieval-led 指令 | 包含指定短语 | 文本匹配 |

### 2.3 EVAL.ts 内容标准

| 检查项 | 标准 | 验收方法 |
|--------|------|----------|
| Phase 1 检查点 | 基础结构检查 | 代码审查 |
| Phase 2 检查点 | 核心功能测试 | 代码审查 |
| Phase 3 检查点 | 边界条件测试 | 代码审查 |
| Phase 4 检查点 | 覆盖率检查 | 代码审查 |
| 测试代码可运行 | 通过 TypeScript 编译 | 编译检查 |
| 每个检查点有测试 | 检查点对应具体测试 | 代码审查 |

### 2.4 SCORING.md 内容标准

| 检查项 | 标准 | 验收方法 |
|--------|------|----------|
| 总分验证 | 总分 = 100 | 数值计算 |
| 等级定义 | S/A/B/C/D 等级明确 | 内容审查 |
| 分数分布 | 各 Phase 分值合理 | 内容审查 |
| 扣分项说明 | 明确列出扣分规则 | 内容审查 |

### 2.5 YAML 文件标准

| 检查项 | 标准 | 验收方法 |
|--------|------|----------|
| 格式正确性 | 有效的 YAML 格式 | YAML 解析器 |
| 必需字段 | 包含所有必需字段 | 字段检查 |
| 数据类型 | 字段类型正确 | 类型检查 |

---

## 3. QA Engineer 阶段验收

### 3.1 审核覆盖度

| 检查项 | 标准 | 验收方法 |
|--------|------|----------|
| 文件审核 | 审核所有交付物 | 审核记录 |
| 检查点覆盖 | 覆盖所有关键检查项 | 检查清单 |
| 问题记录 | 所有问题已记录 | 问题清单 |

### 3.2 审核质量

| 检查项 | 标准 | 验收方法 |
|--------|------|----------|
| 问题具体性 | 每个问题都有具体描述 | 内容审查 |
| 建议可行性 | 改进建议可操作 | 内容审查 |
| 风险评估 | 风险识别完整 | 内容审查 |

### 3.3 审核结论

| 状态 | 条件 | 后续动作 |
|------|------|----------|
| 通过 | 所有 Critical 检查项通过 | 提交 Supervisor |
| 有条件通过 | Critical 通过，部分 High 有问题 | 提交 Supervisor 并说明 |
| 不通过 | 任何 Critical 检查项失败 | 返回 Generator |

---

## 4. Supervisor 阶段验收

### 4.1 决策依据

| 检查项 | 标准 | 验收方法 |
|--------|------|----------|
| QA 结果确认 | 已确认 QA 审核结果 | 审核记录 |
| 可行性评估 | 已评估技术可行性 | 评估记录 |
| 资源确认 | 已确认资源充足 | 资源检查 |
| 风险评估 | 已评估风险可控性 | 风险评估 |

### 4.2 决策标准

#### 自动批准条件
- QA 审核通过
- 风险等级为低
- 资源充足

#### 批准条件
- QA 审核通过
- 风险等级为中等或以下
- 资源充足

#### 有条件批准条件
- QA 审核通过
- 风险等级为高
- 有明确的风险缓解措施

#### 拒绝条件
- QA 审核不通过
- 资源不足
- 风险不可控
- 技术不可行

### 4.3 审批记录

| 要素 | 要求 |
|------|------|
| 审批人 | 记录审批者身份 |
| 审批时间 | 记录审批时间戳 |
| 审批决定 | 明确记录批准/拒绝 |
| 审批理由 | 说明决策依据 |
| 附加条件 | 如有条件批准，列出条件 |

---

## 5. 最终验收清单

### 5.1 交付物清单

- [ ] PROMPT.md 已创建并符合标准
- [ ] EVAL.ts 已创建并符合标准
- [ ] SCORING.md 已创建并符合标准
- [ ] task-metadata.yaml 已创建并符合标准
- [ ] TRIAD_ROLES.yaml 已创建并符合标准
- [ ] TRIAD_WORKFLOW.md 已创建并符合标准
- [ ] TRIAD_ACCEPTANCE.md 已创建并符合标准

### 5.2 质量检查清单

- [ ] PROMPT.md 包含 retrieval-led 指令
- [ ] EVAL.ts 包含所有 Phase 的检查点
- [ ] EVAL.ts 测试代码可编译
- [ ] SCORING.md 总分 = 100
- [ ] 所有 YAML 文件格式正确
- [ ] QA 审核通过
- [ ] Supervisor 审批通过

### 5.3 发布就绪清单

- [ ] 任务 ID 已分配
- [ ] 优先级已确定
- [ ] 预估工时已确定
- [ ] 依赖关系已明确
- [ ] 风险已识别并有缓解措施
- [ ] 验收标准已定义
- [ ] 通知已发送给执行团队

---

## 6. 验收流程

```
开始验收
    │
    ▼
┌─────────────────┐
│ 交付物完整性检查 │ ──不通过──▶ 返回 Generator
└────────┬────────┘
         │通过
         ▼
┌─────────────────┐
│ 内容质量检查    │ ──不通过──▶ 返回 Generator
└────────┬────────┘
         │通过
         ▼
┌─────────────────┐
│ QA 审核         │ ──不通过──▶ 返回 Generator
└────────┬────────┘
         │通过
         ▼
┌─────────────────┐
│ Supervisor 审批 │ ──拒绝────▶ 返回 Generator
└────────┬────────┘
         │批准
         ▼
┌─────────────────┐
│ 发布任务        │
└─────────────────┘
```

---

## 7. 验收记录模板

### 7.1 Generator 阶段记录

```yaml
generator_phase:
  completed_at: "YYYY-MM-DD HH:MM:SS"
  deliverables:
    - file: "PROMPT.md"
      status: "created"
    - file: "EVAL.ts"
      status: "created"
    - file: "SCORING.md"
      status: "created"
    - file: "task-metadata.yaml"
      status: "created"
    - file: "TRIAD_ROLES.yaml"
      status: "created"
    - file: "TRIAD_WORKFLOW.md"
      status: "created"
    - file: "TRIAD_ACCEPTANCE.md"
      status: "created"
  quality_gate:
    prompt_has_retrieval_led: true
    eval_has_all_phases: true
    scoring_total_is_100: true
    yaml_valid: true
  result: "passed"
```

### 7.2 QA 阶段记录

```yaml
qa_phase:
  started_at: "YYYY-MM-DD HH:MM:SS"
  completed_at: "YYYY-MM-DD HH:MM:SS"
  reviewer: "qa-engineer-name"
  check_items:
    - id: "QA-1"
      item: "PROMPT.md 需求完整性"
      result: "pass"
    - id: "QA-2"
      item: "EVAL.ts 检查点可测试性"
      result: "pass"
    - id: "QA-3"
      item: "SCORING.md 分值正确性"
      result: "pass"
  issues_found: []
  risks_identified: []
  result: "passed"
```

### 7.3 Supervisor 阶段记录

```yaml
supervisor_phase:
  started_at: "YYYY-MM-DD HH:MM:SS"
  completed_at: "YYYY-MM-DD HH:MM:SS"
  approver: "supervisor-name"
  decision: "approved"
  decision_basis:
    qa_passed: true
    feasibility: "high"
    resources: "sufficient"
    risk_level: "low"
  conditions: []
  notes: "任务可以发布"
```

---

## 8. 附录

### 8.1 参考文档

- PROMPT.md - 任务需求
- EVAL.ts - 评估检查点
- SCORING.md - 评分规则
- TRIAD_ROLES.yaml - 角色定义
- TRIAD_WORKFLOW.md - 工作流定义

### 8.2 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-01-20 | 初始版本 |
