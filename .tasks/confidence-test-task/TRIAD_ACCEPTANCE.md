# TRIAD_ACCEPTANCE.md - 验收标准

## 验收清单

### ✅ 代码交付物

| 检查项 | 标准 | 状态 |
|--------|------|------|
| 测试文件路径 | `src/orchestrator/__tests__/confidence.test.ts` | ⬜ |
| 测试框架 | Vitest | ⬜ |
| 测试数量 | ≥ 90个 | ⬜ |
| 通过率 | 100% | ⬜ |

### ✅ 覆盖率要求

| 维度 | 要求 | 状态 |
|------|------|------|
| Statements | 100% | ⬜ |
| Branches | 100% | ⬜ |
| Functions | 100% | ⬜ |
| Lines | 100% | ⬜ |

### ✅ 函数覆盖

| 函数 | 必须有测试 | 状态 |
|------|-----------|------|
| `clamp` | ✅ | ⬜ |
| `getRelevance` | ✅ | ⬜ |
| `getMatchCount` | ✅ | ⬜ |
| `getThreshold` | ✅ | ⬜ |
| `calculateConfidence` | ✅ | ⬜ |

### ✅ Intent类型覆盖

| Intent | 必须有测试 | 状态 |
|--------|-----------|------|
| `impact` | ✅ | ⬜ |
| `dependency` | ✅ | ⬜ |
| `search` | ✅ | ⬜ |
| `documentation` | ✅ | ⬜ |
| `complexity` | ✅ | ⬜ |
| `overview` | ✅ | ⬜ |
| `refactor` | ✅ | ⬜ |
| `reference` | ✅ | ⬜ |

### ✅ 边界条件覆盖

| 场景 | 必须有测试 | 状态 |
|------|-----------|------|
| 空结果数组 `[]` | ✅ | ⬜ |
| 1个结果 | ✅ | ⬜ |
| 5个结果（最优） | ✅ | ⬜ |
| 6个结果（超出） | ✅ | ⬜ |
| relevance = 0 | ✅ | ⬜ |
| relevance = 1 | ✅ | ⬜ |
| clamp 负数输入 | ✅ | ⬜ |
| clamp 大于1输入 | ✅ | ⬜ |
| high置信度判定 | ✅ | ⬜ |
| medium置信度判定 | ✅ | ⬜ |
| low置信度判定 | ✅ | ⬜ |

### ✅ 代码质量

| 检查项 | 标准 | 状态 |
|--------|------|------|
| retrieval-led注释 | 包含 `Prefer retrieval-led reasoning` | ⬜ |
| 类型导入 | 导入所有必要类型 | ⬜ |
| 断言质量 | 具体、不宽松 | ⬜ |
| 测试命名 | 清晰、描述准确 | ⬜ |
| 代码风格 | 一致、可读 | ⬜ |

### ✅ 工件交付

| 工件 | 路径 | 状态 |
|------|------|------|
| PROMPT.md | `.tasks/confidence-test-task/PROMPT.md` | ⬜ |
| EVAL.ts | `.tasks/confidence-test-task/EVAL.ts` | ⬜ |
| SCORING.md | `.tasks/confidence-test-task/SCORING.md` | ⬜ |
| task-metadata.yaml | `.tasks/confidence-test-task/task-metadata.yaml` | ⬜ |
| TRIAD_ROLES.yaml | `.tasks/confidence-test-task/TRIAD_ROLES.yaml` | ⬜ |
| TRIAD_WORKFLOW.md | `.tasks/confidence-test-task/TRIAD_WORKFLOW.md` | ⬜ |
| TRIAD_ACCEPTANCE.md | `.tasks/confidence-test-task/TRIAD_ACCEPTANCE.md` | ⬜ |

---

## 验收命令

```bash
# 1. 运行测试
npm test -- src/orchestrator/__tests__/confidence.test.ts --reporter=verbose

# 2. 检查覆盖率
npm test -- src/orchestrator/__tests__/confidence.test.ts --coverage

# 3. 运行EVAL检查（如有）
npx tsx .tasks/confidence-test-task/EVAL.ts
```

---

## 验收通过标准

### 必须满足（Hard Requirements）
- [ ] 所有测试通过
- [ ] 覆盖率100%
- [ ] 所有导出函数有测试
- [ ] 所有8种intent类型有测试
- [ ] 包含 retrieval-led 注释

### 应该满足（Soft Requirements）
- [ ] 测试数量 ≥ 98个
- [ ] 使用 `it.each` 优化重复测试
- [ ] 断言具体、有描述性
- [ ] 代码风格一致

### 理想满足（Nice to Have）
- [ ] 测试数量 > 100个
- [ ] 包含额外的边界测试
- [ ] 详细的测试注释
- [ ] 测试分组清晰

---

## 验收状态

```
□ 待验收
□ 验收中
□ 验收通过
□ 验收不通过（需修复）
```

---

## 验收记录

| 日期 | 验收人 | 结果 | 备注 |
|------|--------|------|------|
| | | | |
