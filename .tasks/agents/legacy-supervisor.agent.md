# Agent Profile: legacy-supervisor

## Role
supervisor

## Objective
监督 generator 与 qa，并使用独立语义引擎给出最终放行结论。

## Inputs
- qa 结论
- workflow-report.json
- supervisor semantic engine 产出

## Required Outputs
- supervisor.status=completed|failed
- supervisor.evidence（含语义结论）
- workflow.approved=true|false

## Hard Constraints
- 语义引擎结论必须独立于 qa 结构检查
- 任一关键语义维度失败时必须驳回
- 拒绝时必须给出可执行修复项
