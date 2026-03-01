```yaml
task: "fix-output-contract"
semantic_review:
  score: 100
  threshold: 85
  critical_failures: 0
  status: "completed"
  approved: true

dimension_scores:
  completeness: 25
  trap_effectiveness: 25
  scoring_rationale: 25
  context_consistency: 25

findings:
  strengths:
    - "PROMPT.md 极为详细，明确描述了两个具体问题（CI校验不完整、analyze输出字段缺失）"
    - "包含设计要求参考，明确引用 CodemapOutput 接口定义"
    - "当前代码状态展示清晰（ci.ts:150-178、analyze.ts:143-150）"
    - "EVAL.ts 包含 8 个分层测试，覆盖 CI 校验、analyze 输出、类型定义、负面检查"
    - "SCORING.md 总分 100 分，analyze 输出字段（40分）和 CI 校验（30分）分值充足"
    - "陷阱设计非常全面：5个陷阱覆盖严重/高/中等级别"
    - "反例场景真实：仅使用 human 模式用户、依赖旧格式解析用户"
    - "上下文引用精确：具体到文档行号（REFACTOR_ARCHITECTURE_OVERVIEW.md:203-218、CI_GATEWAY_DESIGN.md:367-436）"
    - "遵循 retrieval-led 原则，并强调以项目文档为准"
  weaknesses:
    - "无弱项，设计质量优秀"
  risks:
    - "极低 - 任务设计完善，可直接进入执行阶段"

rejection_reason: ""
```

## 详细评审意见

### 1. 任务完整性 (25/25)
| 检查项 | 状态 | 说明 |
|--------|------|------|
| PROMPT.md | ✅ | 包含背景、问题描述、设计要求参考、当前代码状态、要求、约束、验收标准 |
| EVAL.ts | ✅ | 8个测试覆盖 L0, L0b, L1, L2, L3, L3b, L4-负面 |
| SCORING.md | ✅ | 总分 = 100 分 (30+40+25+5) |
| task-metadata.yaml | ✅ | 包含 5 个详细陷阱设计和 2 个反例场景 |

### 2. 陷阱设计有效性 (25/25)
| 陷阱 | 严重程度 | 说明 |
|------|----------|------|
| 破坏 human 输出 | 严重 | 常见 AI 错误，检查点 L4-负面覆盖 |
| 仅检查 package.json | 严重 | 当前问题根源，检查点 L1 覆盖 |
| 引入新依赖 (zod/ajv) | 高 | 项目未使用，检查点 L0b 覆盖 |
| 忽略错误码体系 | 中 | E0010 错误码，检查点 L1 覆盖 |
| 类型定义不完整 | 中 | CodemapOutput 接口，检查点 L3 覆盖 |

### 3. 评分合理性 (25/25)
- CI 校验实现: 30分（核心功能）
- analyze 输出字段: 40分（核心功能，schemaVersion/tool/confidence）
- 类型定义: 25分（CodemapOutput接口、isCodemapOutput守卫）
- 负面检查: 5分（human模式保护）

### 4. 上下文一致性 (25/25)
- 精确引用文档行号：REFACTOR_ARCHITECTURE_OVERVIEW.md:203-218、CI_GATEWAY_DESIGN.md:367-436
- 精确引用代码行号：ci.ts:150-178、analyze.ts:143-150
- 引用项目资源：AGENTS.md / CLAUDE.md / REFACTOR_ARCHITECTURE_OVERVIEW.md / CI_GATEWAY_DESIGN.md
- 明确强调 retrieval-led 原则
