## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | src/orchestrator/types.ts 文件存在 | 10 | 文件存在性检查 | 自动 |
| L1-2 | src/orchestrator/adapters/base-adapter.ts 文件存在 | 10 | 文件存在性检查 | 自动 |
| L1-3 | src/orchestrator/adapters/index.ts 文件存在 | 10 | 文件存在性检查 | 自动 |
| L2-1 | UnifiedResult 接口包含所有必需字段 | 15 | 正则匹配检查 | 自动 |
| L2-2 | HeatScore 接口正确定义 | 4 | 正则匹配检查 | 自动 |
| L2-3 | ToolAdapter 接口正确定义 | 5 | 正则匹配检查 | 自动 |
| L2-4 | ToolOptions 类型定义 | 5 | 正则匹配检查 | 自动 |
| L3-1 | source 使用字面量联合类型 | 5 | 正则匹配检查 | 自动 |
| L3-2 | type 使用字面量联合类型 | 5 | 正则匹配检查 | 自动 |
| L3-3 | riskLevel 使用字面量联合类型 | 3 | 正则匹配检查 | 自动 |
| L3-4 | symbolType 使用字面量联合类型 | 3 | 正则匹配检查 | 自动 |
| L3-5 | 核心字段为必需（非可选） | 5 | 正则匹配检查 | 自动 |
| L3-6 | 所有公共类型被导出 | 3 | 正则匹配检查 | 自动 |
| L4-1 | 无 any 类型使用 | 5 | 正则匹配检查 | 自动 |
| L4-2 | 无 class 定义数据结构 | 5 | 正则匹配检查 | 自动 |
| L4-3 | 无 enum 定义 | 3 | 正则匹配检查 | 自动 |
| L4-4 | 数值字段明确使用 number 类型 | 4 | 正则匹配检查 | 自动 |

> **总分：100 分**

### 评分等级

- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 验证环境

- Node.js 版本: >= 20
- TypeScript 版本: 5.x
- 测试框架: Vitest
- 执行命令: `npm test`

### 验证命令

```bash
# 自动验证
npm test .tasks/phase1-unified-result/EVAL.ts

# 或使用 pnpm
pnpm test .tasks/phase1-unified-result/EVAL.ts

# 手动验证 TypeScript 编译
npx tsc --noEmit src/orchestrator/types.ts src/orchestrator/adapters/base-adapter.ts
```

### 评分说明

**Level 1 (30分)**: 基础文件结构
- 确保所有必需文件都存在
- 这是后续所有检查的前提

**Level 2 (30分)**: 接口完整性
- UnifiedResult 必须包含所有指定字段
- HeatScore 和 ToolAdapter 定义正确
- 目录结构符合要求

**Level 3 (27分)**: 类型模式正确性
- 使用字面量联合类型而非 enum
- 核心字段为非可选（required）
- 所有类型正确导出

**Level 4 (13分)**: 负面约束遵守
- 无 any 类型
- 无 class 定义
- 数值字段类型明确

### 常见失分点

1. **字段缺失** (-15分): 遗漏 UnifiedResult 的核心字段
2. **可选字段误用** (-7分): 核心字段标记为可选（?）
3. **any 类型使用** (-5分): 使用 any 失去类型安全
4. **class 误用** (-5分): 使用 class 而非 interface
5. **enum 误用** (-3分): 使用 enum 而非字面量联合类型
6. **导出遗漏** (-4分): 未导出公共类型
