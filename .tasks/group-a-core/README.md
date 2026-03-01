# 任务套件: group-a-core-001

> **任务名称**: 为核心模块生成测试套件  
> **生成时间**: 2026-01-20  
> **状态**: ✅ Generator 阶段完成，等待 QA 审核  

---

## 快速导航

| 文件 | 说明 | 行数 |
|------|------|------|
| [PROMPT.md](./PROMPT.md) | 任务需求文档 | 218 |
| [EVAL.ts](./EVAL.ts) | 评估检查点与测试代码 | 241 |
| [SCORING.md](./SCORING.md) | 评分规则 | 173 |
| [task-metadata.yaml](./task-metadata.yaml) | 任务元数据 | 167 |
| [TRIAD_ROLES.yaml](./TRIAD_ROLES.yaml) | 三角色定义 | 213 |
| [TRIAD_WORKFLOW.md](./TRIAD_WORKFLOW.md) | 工作流定义 | 282 |
| [TRIAD_ACCEPTANCE.md](./TRIAD_ACCEPTANCE.md) | 验收标准 | 295 |

**总计**: 7个文件，1589行

---

## 任务概览

### 目标
为 CodeMap 编排层的核心模块生成完整的测试套件：
- `confidence.ts` - 置信度计算模块 (173行)
- `types.ts` - 统一类型定义模块 (200行)

### 要求
- 使用 Vitest 框架
- 100% 代码覆盖率
- confidence.test.ts ≥ 25 个测试用例
- types.test.ts ≥ 15 个测试用例

---

## 质量门禁检查结果

| 检查项 | 状态 |
|--------|------|
| PROMPT.md 包含 retrieval-led 指令 | ✅ |
| EVAL.ts 覆盖所有 Phase (1-4) | ✅ |
| SCORING.md 总分 = 100 | ✅ |
| YAML 文件格式正确 | ✅ |
| Markdown 文件渲染正常 | ✅ |
| TypeScript 语法检查通过 | ✅ |

---

## 下一步

1. **QA Engineer** 审核任务四件套
2. **Supervisor** 进行最终审批
3. 发布任务给执行团队

---

## 源文件信息

```
/data/codemap/src/orchestrator/confidence.ts (173 lines)
├── calculateConfidence() - 核心置信度计算函数
├── clamp() - 数值范围限制
├── getRelevance() - 获取结果相关度
├── getMatchCount() - 获取匹配次数
├── getThreshold() - 获取阈值
└── CONFIDENCE_THRESHOLDS - 8种意图的阈值配置

/data/codemap/src/orchestrator/types.ts (200 lines)
├── UnifiedResult - 统一结果接口
├── CodemapOutput - 统一输出格式
├── isCodemapOutput() - 类型守卫函数
└── calculateConfidenceLevel() - 置信度级别计算
```

---

## 参考文档

- [REFACTOR_CONFIDENCE_DESIGN.md](/data/codemap/docs/REFACTOR_CONFIDENCE_DESIGN.md) - 置信度机制设计 (v2.4)
- [REFACTOR_ARCHITECTURE_OVERVIEW.md](/data/codemap/docs/REFACTOR_ARCHITECTURE_OVERVIEW.md) - 架构概览 (v2.5)
