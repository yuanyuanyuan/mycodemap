# SCORING.md - 评分规则

> **任务ID**: group-a-core-001  
> **总分**: 100 分  

---

## 评分等级定义

| 等级 | 分数范围 | 说明 | 后续动作 |
|------|----------|------|----------|
| **S** | 90-100 | 优秀，超出预期 | 直接合并 |
| **A** | 80-89 | 良好，满足所有要求 | 直接合并 |
| **B** | 70-79 | 及格，基本满足要求 | 小问题修复后合并 |
| **C** | 60-69 | 边缘，有明显缺陷 | 需要修改后重新评估 |
| **D** | <60 | 不及格，不满足要求 | 需要重写 |

---

## 分数分布 (总分 = 100)

### Phase 1: 基础结构检查 (20分)

| 检查点 | 分数 | 描述 |
|--------|------|------|
| CHK-1.1 | 4 | 测试目录存在 |
| CHK-1.2 | 4 | confidence.test.ts 文件存在 |
| CHK-1.3 | 4 | types.test.ts 文件存在 |
| CHK-1.4 | 4 | confidence.test.ts 使用 Vitest |
| CHK-1.5 | 4 | types.test.ts 使用 Vitest |

**Phase 1 小计**: 20分

---

### Phase 2: confidence.ts 测试覆盖 (40分)

#### R1: calculateConfidence 函数测试 (20分)

| 检查点 | 分数 | 描述 |
|--------|------|------|
| CHK-2.1 | 3 | 测试空结果数组 (R1.1) |
| CHK-2.2 | 3 | 测试 1-5 个结果范围 (R1.2) |
| CHK-2.3 | 3 | 测试超过 5 个结果 (R1.3) |
| CHK-2.4 | 4 | 测试所有 8 种 intent 类型 (R1.4) |
| CHK-2.5 | 3 | 测试高置信度判定 (R1.5) |
| CHK-2.6 | 3 | 测试中置信度判定 (R1.5) |
| CHK-2.7 | 3 | 测试低置信度判定 (R1.5) |
| CHK-2.8 | 3 | 测试 reasons 数组内容 (R1.6) |

#### R2: 辅助函数测试 (13分)

| 检查点 | 分数 | 描述 |
|--------|------|------|
| CHK-2.9 | 3 | 测试 clamp 函数 (R2.1) |
| CHK-2.10 | 3 | 测试 getRelevance 函数 (R2.2) |
| CHK-2.11 | 3 | 测试 getMatchCount 函数 (R2.3) |
| CHK-2.12 | 3 | 测试 getThreshold 函数 (R2.4) |
| CHK-2.13 | 1 | 验证 CONFIDENCE_THRESHOLDS (R3) |

**Phase 2 小计**: 40分

---

### Phase 3: types.ts 测试覆盖 (30分)

#### R4: 类型守卫测试 (12分)

| 检查点 | 分数 | 描述 |
|--------|------|------|
| CHK-3.1 | 3 | 测试 isCodemapOutput 有效对象 (R4.1) |
| CHK-3.2 | 3 | 测试 isCodemapOutput null/undefined (R4.2) |
| CHK-3.3 | 3 | 测试 isCodemapOutput 缺少必需字段 (R4.3) |
| CHK-3.4 | 3 | 测试 isCodemapOutput 错误类型字段 (R4.4) |

#### R5: 辅助函数测试 (9分)

| 检查点 | 分数 | 描述 |
|--------|------|------|
| CHK-3.5 | 3 | 测试 calculateConfidenceLevel 边界 0.7 (R5.1) |
| CHK-3.6 | 3 | 测试 calculateConfidenceLevel 边界 0.4 (R5.2) |
| CHK-3.7 | 3 | 测试 calculateConfidenceLevel 极端值 (R5.4) |

#### R6: 类型兼容性测试 (9分)

| 检查点 | 分数 | 描述 |
|--------|------|------|
| CHK-3.8 | 3 | 测试 UnifiedResult 接口 (R6.1) |
| CHK-3.9 | 3 | 测试 CodemapOutput 接口 (R6.2) |
| CHK-3.10 | 3 | 测试 HeatScore 接口 (R6.3) |

**Phase 3 小计**: 30分

---

### Phase 4: 覆盖率检查 (10分)

| 检查点 | 分数 | 描述 |
|--------|------|------|
| CHK-4.1 | 5 | 测试覆盖率报告可生成 |
| CHK-4.2 | 3 | 至少 25 个 confidence 测试用例 |
| CHK-4.3 | 2 | 至少 15 个 types 测试用例 |

**Phase 4 小计**: 10分

---

## 总分验证

| Phase | 分值 |
|-------|------|
| Phase 1 | 20 |
| Phase 2 | 40 |
| Phase 3 | 30 |
| Phase 4 | 10 |
| **总计** | **100** ✅ |

---

## 扣分项 (额外)

以下问题会在总分基础上扣分：

| 问题 | 扣分 |
|------|------|
| 使用 `any` 类型绕过类型检查 | -5 |
| 测试代码未通过 TypeScript 编译 | -10 |
| 测试代码未通过 ESLint 检查 | -5 |
| 测试文件缺少必要注释 | -3 |
| 测试用例命名不清晰 | -2 |
| 测试间存在相互依赖 | -5 |

---

## 评估命令

```bash
# 运行所有检查
cd /data/codemap && npx vitest run .kimi/tasks/group-a-core/EVAL.ts

# 生成覆盖率报告
cd /data/codemap && npx vitest run src/orchestrator/__tests__ --coverage

# 运行实际测试
cd /data/codemap && npx vitest run src/orchestrator/__tests__/confidence.test.ts
cd /data/codemap && npx vitest run src/orchestrator/__tests__/types.test.ts
```

---

## 评估结果示例

### 优秀示例 (S级)
```
Phase 1: 20/20 ✅
Phase 2: 38/40 ✅ (2个检查点需微调)
Phase 3: 30/30 ✅
Phase 4: 10/10 ✅
总分: 98/100 (S级)
结论: 直接合并
```

### 需改进示例 (C级)
```
Phase 1: 20/20 ✅
Phase 2: 25/40 ❌ (缺少辅助函数测试)
Phase 3: 20/30 ⚠️ (缺少类型守卫测试)
Phase 4: 5/10 ❌ (测试用例不足)
总分: 70/100 (B级)
结论: 修复后重新评估
扣分项: 使用any类型 (-5)
最终: 65/100 (C级)
```
