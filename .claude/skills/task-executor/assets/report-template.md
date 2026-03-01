# Task Execution Report: {{task_name}}

## 执行摘要
- **执行时间**: {{timestamp}}
- **执行模式**: {{execution_mode}}
- **执行状态**: {{status}}
- **最终得分**: {{score}}/100

## 任务信息
- **任务ID**: {{task_id}}
- **任务名称**: {{task_name}}
- **难度**: {{difficulty}}
- **预估时间**: {{estimated_minutes}} 分钟

## 代码变更
- **修改文件数**: {{modified_files}}
- **新增文件数**: {{added_files}}
- **删除文件数**: {{deleted_files}}

## 变更详情
{{changes_details}}

## 测试结果
- **测试框架**: Vitest
- **通过检查点**: {{passed_checkpoints}}/{{total_checkpoints}}
- **失败检查点**: {{failed_checkpoints}}

### 测试输出
```
{{test_output}}
```

## 自评详情

| 检查点 | 分值 | 状态 | 备注 |
|--------|------|------|------|
{{scoring_table}}

## 验收标准达成情况
{{acceptance_criteria}}

## 问题与风险
{{issues_and_risks}}

## 评分等级
- {{excellent_status}} **优秀 (Excellent)**: >= 90 分
- {{pass_status}} **通过 (Pass)**: >= 70 分
- {{fail_status}} **失败 (Fail)**: < 70 分

## 结论
{{conclusion}}

## 后续建议
{{recommendations}}

---
*报告生成时间: {{timestamp}}*
*执行者: task-executor*
