# Triad Workflow - {{TASK_ID}}

## Task Snapshot
- task_id: `{{TASK_ID}}`
- task_name: `{{TASK_NAME}}`
- title: {{TASK_TITLE}}
- requested_count: {{REQUESTED_COUNT}}
- max_allowed: 5

## generator
- owner: `{{GENERATOR_AGENT}}`
- work_items:
  1. 用固定模板创建四件套文件
  2. 用固定模板创建 triad 角色与验收文档
  3. 确认 `.agents` 三角色 agent 定义存在
  4. 填充 metadata 的 workflow 字段
- done_definition:
  - 四件套全部生成
  - triad 文档全部生成
  - `.agents/{{GENERATOR_AGENT}}.agent.md` 已校验
  - `.agents/{{QA_AGENT}}.agent.md` 已校验
  - `.agents/{{SUPERVISOR_AGENT}}.agent.md` 已校验
  - workflow-report.json 已落盘

## qa
- owner: `{{QA_AGENT}}`
- work_items:
  1. 运行结构检查（章节、分层、负向断言）
  2. 运行评分检查（总分=100）
  3. 校验三角色状态与 evidence
- done_definition:
  - QA 结果为 pass
  - findings 为空或已全部关闭

## supervisor
- owner: `{{SUPERVISOR_AGENT}}`
- work_items:
  1. 复核批量约束（<=5）
  2. 运行独立深语义判定引擎（读取 `.agents/{{SUPERVISOR_AGENT}}.semantic.prompt.md`）
  3. 复核 qa 结论与语义评分
  4. 输出最终审批结论
- done_definition:
  - 产出 `SUPERVISOR_SEMANTIC_REVIEW.md`
  - semantic_score >= 85 且无 critical failure
  - approved=true（仅在 qa 与语义同时通过时）
  - 若拒绝，必须给出可执行修复项
