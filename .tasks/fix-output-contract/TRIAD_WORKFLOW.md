# Triad Workflow - fix-output-contract

## Task Snapshot
- task_id: `fix-output-contract`
- task_name: `fix-output-contract`
- title: 修复输出契约校验和字段完整性
- requested_count: 1
- max_allowed: 5

## generator
- owner: `task-generator`
- work_items:
  1. 用固定模板创建四件套文件（PROMPT.md, EVAL.ts, SCORING.md, task-metadata.yaml）
  2. 用固定模板创建 triad 角色与验收文档（TRIAD_ROLES.yaml, TRIAD_WORKFLOW.md, TRIAD_ACCEPTANCE.md）
  3. 确认 `.agents` 三角色 agent 定义存在
  4. 填充 metadata 的 workflow 字段
- done_definition:
  - 四件套全部生成
  - triad 文档全部生成
  - `.agents/task-generator.agent.md` 已校验
  - `.agents/qa-checker.agent.md` 已校验
  - `.agents/supervisor.agent.md` 已校验
  - workflow-report.json 已落盘

## qa
- owner: `qa-checker`
- work_items:
  1. 运行结构检查（章节、分层、负向断言）
  2. 运行评分检查（总分=100）
  3. 校验三角色状态与 evidence
  4. 验证 EVAL.ts 包含 [L0]-[L4] 级别检查
  5. 验证 PROMPT.md 包含 "Prefer retrieval-led reasoning" 指令
- done_definition:
  - QA 结果为 pass
  - findings 为空或已全部关闭
  - EVAL.ts 至少包含一个 `.not.toX` 负面断言
  - SCORING.md 总分等于 100

## supervisor
- owner: `supervisor`
- work_items:
  1. 复核批量约束（<=5）
  2. 运行独立深语义判定引擎（读取 `.agents/supervisor.semantic.prompt.md`）
  3. 复核 qa 结论与语义评分
  4. 输出最终审批结论
- done_definition:
  - 产出 `SUPERVISOR_SEMANTIC_REVIEW.md`
  - semantic_score >= 85 且无 critical failure
  - approved=true（仅在 qa 与语义同时通过时）
  - 若拒绝，必须给出可执行修复项
