```yaml
task: "fix-runanalysis-implementation"
semantic_review:
  score: 98
  threshold: 85
  critical_failures: 0
  status: "completed"
  approved: true

dimension_scores:
  completeness: 25
  trap_effectiveness: 23
  scoring_rationale: 25
  context_consistency: 25

findings:
  strengths:
    - "PROMPT.md 结构完整，包含所有必备章节（背景、参考信息、要求、约束、验收标准、用户价值、反例场景）"
    - "EVAL.ts 包含 L0-L4 完整分层检查，覆盖架构约定、存在性、结构、模式和负面检查"
    - "SCORING.md 总分 100 分，分值分布均衡（4个检查点各25分）"
    - "task-metadata.yaml 包含完整的 workflow triad 定义"
    - "反例场景设计真实可触发（旧版本 Node.js、未安装 ast-grep）"
    - "AI 常见错误陷阱设计准确（直接调用 AnalyzeCommand 而非 ToolOrchestrator）"
    - "遵循 retrieval-led 原则，引用正确的项目资源（AGENTS.md、架构文档、现有代码）"
    - "检查点能有效捕获常见错误（L0 检查 AnalyzeCommand 导入、L4 检查存根代码残留）"
  weaknesses:
    - "反例场景可以更丰富一些，例如可以增加超时处理不当的场景"
  risks:
    - "低 - 任务设计整体质量高，风险可控"

rejection_reason: ""
```

## 详细评审意见

### 1. 任务完整性 (25/25)
| 检查项 | 状态 | 说明 |
|--------|------|------|
| PROMPT.md 必备章节 | ✅ | 背景、参考信息、要求、初始状态、约束条件、验收标准、用户价值、反例场景齐全 |
| EVAL.ts L0-L4 分层 | ✅ | L0项目约定、L1存在性、L2结构、L3模式、L4负面检查完整 |
| SCORING.md 总分 | ✅ | 总分 = 100 分 |
| task-metadata.yaml | ✅ | workflow triad 结构完整 |

### 2. 陷阱设计有效性 (23/25)
| 陷阱 | 严重程度 | 检查点覆盖 |
|------|----------|------------|
| 直接使用 AnalyzeCommand | 高 | L0 检查 `import.*AnalyzeCommand` |
| 忽略 ResultFusion | 中 | L3 检查 `.fuse()` 调用 |
| 修改方法签名 | 严重 | 约束条件明确禁止 |
| 未处理错误情况 | 中 | L4 负面检查存根代码 |

### 3. 评分合理性 (25/25)
- 核心功能检查点（runAnalysis实现、ToolOrchestrator集成、ResultFusion调用、移除存根）各25分，分布均衡合理

### 4. 上下文一致性 (25/25)
- 正确引用项目资源：AGENTS.md / CLAUDE.md / docs/REFACTOR_ORCHESTRATOR_DESIGN.md
- 正确引用代码：src/orchestrator/tool-orchestrator.ts / result-fusion.ts / analyze.ts
- 明确强调 retrieval-led 原则
