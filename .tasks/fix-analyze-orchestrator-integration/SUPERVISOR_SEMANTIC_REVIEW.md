```yaml
task: "fix-analyze-orchestrator-integration"
semantic_review:
  score: 99
  threshold: 85
  critical_failures: 0
  status: "completed"
  approved: true

dimension_scores:
  completeness: 25
  trap_effectiveness: 24
  scoring_rationale: 25
  context_consistency: 25

findings:
  strengths:
    - "PROMPT.md 章节完整，背景描述清晰（3个现有问题）"
    - "EVAL.ts 包含 9 个分层测试（L0-L4c），覆盖面广"
    - "SCORING.md 总分 100 分，核心功能（ToolOrchestrator 35分、ResultFusion 25分）分值充足"
    - "task-metadata.yaml 包含完整的陷阱设计和反例场景"
    - "反例场景真实（旧版 JSON 格式依赖、低性能环境内存溢出）"
    - "陷阱设计全面：重新实现而非复用（严重）、破坏向后兼容（高）、硬编码残留（中）"
    - "检查点设计精确：L3 检查 8 个 intent、L3b 检查新 intent 的 orchestrator 使用"
    - "向后兼容性检查完善（L4b）：错误码、VALID_INTENTS、CLI 参数解析"
  weaknesses:
    - "无明显弱项"
  risks:
    - "极低 - 任务设计质量优秀"

rejection_reason: ""
```

## 详细评审意见

### 1. 任务完整性 (25/25)
| 检查项 | 状态 | 说明 |
|--------|------|------|
| PROMPT.md 必备章节 | ✅ | 背景、参考信息、要求、初始状态、约束、验收标准齐全 |
| EVAL.ts L0-L4 | ✅ | 9个测试覆盖 L0, L0b, L1, L2, L3, L3b, L4, L4b, L4c |
| SCORING.md 总分 | ✅ | 总分 = 100 分 (20+15+15+10+20+10+10) |
| task-metadata.yaml | ✅ | workflow triad 结构完整 |

### 2. 陷阱设计有效性 (24/25)
| 陷阱 | 严重程度 | 检查点覆盖 |
|------|----------|------------|
| 重新实现而非复用 | 严重 | L0 检查 ToolOrchestrator/ResultFusion 使用 |
| 破坏向后兼容 | 高 | L4b 检查错误码和 VALID_INTENTS |
| 硬编码 switch 残留 | 中 | L4 负面检查直接命令调用 |
| 类型安全丢失 | 中 | L4c 检查 TypeScript 类型注解 |

### 3. 评分合理性 (25/25)
- ToolOrchestrator 集成: 35分（核心功能，分值充足）
- ResultFusion 融合: 25分（核心功能）
- 8 intent 支持: 20分（功能完整性）
- 向后兼容: 10分（重要）
- 代码质量: 10分（基本要求）

### 4. 上下文一致性 (25/25)
- 引用项目资源：AGENTS.md / CLAUDE.md / REFACTOR_ORCHESTRATOR_DESIGN.md / REFACTOR_RESULT_FUSION_DESIGN.md
- 引用代码：src/orchestrator/tool-orchestrator.ts / result-fusion.ts / types.ts
- 明确强调 retrieval-led 原则
