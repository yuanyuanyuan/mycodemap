# Triad Workflow - phase7-git-analyzer

## 工作流状态

| 阶段 | Agent | 状态 | 证据 |
|------|-------|------|------|
| 生成 | task-generator | ⏳ pending | - |
| 质量验收 | task-qa | ⏳ pending | - |
| 语义复核 | task-supervisor | ⏳ pending | - |

## 执行流程

### Step 1: Generator (task-generator)
- **职责**: 根据模板生成任务四件套
- **输入**: 任务信息 + 模板
- **输出**: PROMPT.md, EVAL.ts, SCORING.md, task-metadata.yaml
- **完成条件**: 四件套齐全，SCORING.md 总分 = 100

### Step 2: QA (task-qa)
- **职责**: 验证生成内容质量
- **输入**: generator 输出文件
- **输出**: qa.status, qa.evidence
- **完成条件**: 所有检查点通过，无阻断项

### Step 3: Supervisor (task-supervisor)
- **职责**: 独立语义判定
- **输入**: qa 结果 + 产出文件
- **输出**: supervisor.approved, semantic_score
- **完成条件**: semantic_score >= 85, 无 critical failure

## 判定规则

- **Generator 失败**: 四件套不完整 → 任务终止
- **QA 失败**: 存在阻断项 → 打回修改，最多 2 轮
- **Supervisor 失败**: semantic_score < 85 → 任务终止

## 当前状态

```json
{
  "task": "phase7-git-analyzer",
  "generator": { "status": "pending" },
  "qa": { "status": "pending" },
  "supervisor": { "status": "pending", "semantic_score": 0 },
  "approved": false
}
```
