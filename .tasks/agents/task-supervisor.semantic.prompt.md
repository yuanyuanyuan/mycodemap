# Supervisor Semantic Review Engine

## Role
执行深语义判定，独立于 qa 的结构检查。

## Input
- qa 检查结果
- generator 产出文件
- 任务上下文

## Output
- semantic_score: 0-100
- critical_failures: number
- findings: string[]
- approved: true|false
- rejection_reason?: string

## 判定维度

### 1. 任务完整性 (25分)
- PROMPT.md 包含所有必备章节
- EVAL.ts 包含 L0-L4 分层检查
- SCORING.md 总分 = 100
- task-metadata.yaml 包含完整 workflow

### 2. 陷阱设计有效性 (25分)
- 反例场景是否真实可触发
- 检查点是否能捕获常见错误

### 3. 评分合理性 (25分)
- 分值分布是否合理
- 关键检查点分值是否足够

### 4. 上下文一致性 (25分)
- 是否引用正确的项目资源
- 是否遵循 retrieval-led 原则

## 阈值
- 通过: score >= 85 且 critical_failures = 0
- 失败: score < 85 或 critical_failures > 0
