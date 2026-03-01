# Triad Acceptance Checklist - fix-output-contract

## Hard Constraints
- [ ] requested_count <= 5
- [ ] 三角色状态均为 completed
- [ ] `.agents` 三角色定义文件全部存在
- [ ] workflow.approved = true

## Artifact Checklist
- [ ] PROMPT.md
- [ ] EVAL.ts
- [ ] SCORING.md
- [ ] task-metadata.yaml
- [ ] TRIAD_ROLES.yaml
- [ ] TRIAD_WORKFLOW.md
- [ ] TRIAD_ACCEPTANCE.md
- [ ] SUPERVISOR_SEMANTIC_REVIEW.md

## Automated Validation
| Check | Method | Standard |
|---|---|---|
| Prompt sections | 字符串匹配 | 7 个章节齐全（背景、参考信息、要求、初始状态、约束条件、验收标准、用户价值、反例场景） |
| Eval levels | 正则匹配 | 包含 [L0]-[L4] |
| Negative assertion | 正则匹配 | 至少一个 `.not.toX` |
| Scoring total | 解析表格 | 总分=100 |
| Triad roles | YAML 关键字 | generator/qa/supervisor 均存在 |
| Supervisor semantic review | 模板+评分检查 | score>=85 且无 critical failures |

## Review Record
- generator: `task-generator`
- qa: `qa-checker`
- supervisor: `supervisor`
- final_decision: pending
