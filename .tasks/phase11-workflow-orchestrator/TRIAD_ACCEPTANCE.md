# Triad Acceptance Checklist - phase11-workflow-orchestrator

## Hard Constraints
- [x] requested_count <= 5
- [x] 三角色状态均为 completed
- [x] `.agents` 三角色定义文件全部存在
- [x] workflow.approved = true

## Artifact Checklist
- [x] PROMPT.md
- [x] EVAL.ts
- [x] SCORING.md
- [x] task-metadata.yaml
- [x] TRIAD_ROLES.yaml
- [x] TRIAD_WORKFLOW.md
- [x] TRIAD_ACCEPTANCE.md
- [x] SUPERVISOR_SEMANTIC_REVIEW.md

## Automated Validation
| Check | Method | Standard |
|---|---|---|
| Prompt sections | 字符串匹配 | 7 个章节齐全 |
| Eval levels | 正则匹配 | 包含 [L0]-[L4] |
| Negative assertion | 正则匹配 | 至少一个 `.not.toX` |
| Scoring total | 解析表格 | 总分=100 |
| Triad roles | YAML 关键字 | generator/qa/supervisor 均存在 |
| Supervisor semantic review | 模板+评分检查 | score>=85 且无 critical failures |

## Review Record
- generator: `task-generator` - completed
- qa: `task-qa` - completed
- supervisor: `task-supervisor` - completed (score=99, threshold=85)
- final_decision: approved
