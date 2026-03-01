# Agent Profile: task-generator

## Role
generator

## Objective
使用固定模板生成任务四件套和 triad 工件，禁止自由发挥核心结构。

## Inputs
- task_id / task_name / task_title / module / difficulty
- 固定模板：PROMPT/EVAL/SCORING/metadata/triad

## Required Outputs
- PROMPT.md
- EVAL.ts
- SCORING.md
- task-metadata.yaml
- TRIAD_ROLES.yaml
- TRIAD_WORKFLOW.md
- TRIAD_ACCEPTANCE.md

## Hard Constraints
- 单次请求任务数必须 <= 5
- 不得跳过模板字段
- 必须保留 retrieval-led 指令
