# SCORING.md - confidence.ts 测试任务评分标准

## 总分：100分

---

## Phase 1: 基础结构检查 (20分)

| 检查点 | 分值 | 描述 | 通过标准 |
|--------|------|------|----------|
| 1.1 | 5分 | 测试文件存在 | `src/orchestrator/__tests__/confidence.test.ts` 文件存在 |
| 1.2 | 5分 | Vitest导入 | 文件包含 `from 'vitest'` 导入 |
| 1.3 | 5分 | retrieval-led注释 | 包含 `Prefer retrieval-led reasoning` 注释 |
| 1.4 | 5分 | 完整导入 | 导入所有5个导出函数 |

**小计：20分**

---

## Phase 2: 函数覆盖检查 (30分)

| 检查点 | 分值 | 描述 | 通过标准 |
|--------|------|------|----------|
| 2.1 | 6分 | clamp测试 | 包含 `describe('clamp')` 测试块 |
| 2.2 | 6分 | getRelevance测试 | 包含 `describe('getRelevance')` 测试块 |
| 2.3 | 6分 | getMatchCount测试 | 包含 `describe('getMatchCount')` 测试块 |
| 2.4 | 6分 | getThreshold测试 | 包含 `describe('getThreshold')` 测试块 |
| 2.5 | 6分 | calculateConfidence测试 | 包含 `describe('calculateConfidence')` 测试块 |

**小计：30分**

---

## Phase 3: Intent类型覆盖检查 (25分)

| 检查点 | 分值 | 描述 | 通过标准 |
|--------|------|------|----------|
| 3.1 | 3分 | impact测试 | 包含 impact intent 测试 |
| 3.2 | 3分 | dependency测试 | 包含 dependency intent 测试 |
| 3.3 | 3分 | search测试 | 包含 search intent 测试 |
| 3.4 | 3分 | documentation测试 | 包含 documentation intent 测试 |
| 3.5 | 3分 | complexity测试 | 包含 complexity intent 测试 |
| 3.6 | 3分 | overview测试 | 包含 overview intent 测试 |
| 3.7 | 3分 | refactor测试 | 包含 refactor intent 测试 |
| 3.8 | 3分 | reference测试 | 包含 reference intent 测试 |
| 3.9 | 1分 | it.each使用 | 使用 `it.each(intents)` 模式 |

**小计：25分**

---

## Phase 4: 边界条件检查 (25分)

| 检查点 | 分值 | 描述 | 通过标准 |
|--------|------|------|----------|
| 4.1 | 5分 | 空数组测试 | 测试 `calculateConfidence([], intent)` |
| 4.2 | 5分 | 结果数量边界 | 测试 0, 1, 5, 6, 10 个结果 |
| 4.3 | 5分 | 质量评分边界 | 测试 relevance: 0, 0.5, 1 |
| 4.4 | 5分 | clamp边界 | 测试超出范围的值 (-0.1, 1.1) |
| 4.5 | 5分 | 置信度级别 | 测试 high/medium/low 判定 |

**小计：25分**

---

## 总分验证

```
Phase 1: 20分
Phase 2: 30分
Phase 3: 25分
Phase 4: 25分
----------------
Total:   100分 ✓
```

---

## 评分等级

| 等级 | 分数范围 | 描述 |
|------|----------|------|
| A+ (卓越) | 95-100 | 完美实现，所有边界条件覆盖 |
| A (优秀) | 90-94 | 符合所有要求，少量可忽略缺陷 |
| B (良好) | 80-89 | 基本实现，缺少部分边界测试 |
| C (及格) | 70-79 | 主要功能测试完成，缺少intent覆盖 |
| D (不及格) | <70 | 大量测试缺失，无法合并 |

---

## 通过标准

- **最低通过分数：90分 (A级)**
- **推荐目标：95分+ (A+级)**
- **必须满足**：
  - Phase 1 全部通过 (20/20)
  - Phase 2 全部通过 (30/30)
  - Phase 3 至少 22/25
  - Phase 4 至少 20/25
