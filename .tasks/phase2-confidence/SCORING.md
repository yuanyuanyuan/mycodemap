## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | confidence.ts 文件存在 | 8 | 文件检查 | 自动 |
| L2-1 | IntentType 类型定义 | 8 | 正则匹配 | 自动 |
| L2-2 | IntentType 包含全部 8 种类型 | 8 | 正则匹配 | 自动 |
| L2-3 | ConfidenceResult 接口定义 | 8 | 正则匹配 | 自动 |
| L2-4 | CONFIDENCE_THRESHOLDS 常量定义 | 8 | 正则匹配 | 自动 |
| L2-5 | calculateConfidence 函数导出 | 7 | 正则匹配 | 自动 |
| L2-6 | getThreshold 辅助函数实现 | 5 | 正则匹配 | 自动 |
| L2-7 | getRelevance 辅助函数实现 | 5 | 正则匹配 | 自动 |
| L2-8 | getMatchCount 辅助函数实现 | 5 | 正则匹配 | 自动 |
| L2-9 | clamp 辅助函数实现 | 5 | 正则匹配 | 自动 |
| L3-1 | 函数参数类型正确 | 6 | 正则匹配 | 自动 |
| L3-2 | 数量权重 40% 实现 | 6 | 正则匹配 | 自动 |
| L3-3 | 质量权重 40% 实现 | 6 | 正则匹配 | 自动 |
| L3-4 | intent 场景分支处理 | 5 | 正则匹配 | 自动 |
| L4-1 | 无硬编码魔法数字 | 5 | 正则匹配 | 自动 |
| L4-2 | SearchResult 类型已定义或导入 | 5 | 正则匹配 | 自动 |

**总分: 100**

### 评分等级
- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 验证环境
- Node.js 版本: >= 20
- 测试框架: Vitest
- 执行命令: `pnpm test .tasks/phase2-confidence/EVAL.ts`

### 手动验证步骤
```bash
# 1. 检查文件存在性
ls src/orchestrator/confidence.ts

# 2. TypeScript 编译检查
npx tsc --noEmit

# 3. 运行测试
pnpm test .tasks/phase2-confidence/EVAL.ts

# 4. 验证置信度计算逻辑
# 创建测试脚本验证各种场景
node -e "
const { calculateConfidence } = require('./dist/orchestrator/confidence.js');
const results = [
  { file: 'a.ts', content: 'test', score: 0.9 },
  { file: 'b.ts', content: 'test', score: 0.8 },
  { file: 'c.ts', content: 'test', score: 0.7 }
];
console.log(calculateConfidence(results, 'search'));
"
```

### 测试场景参考

| 场景 | 输入 | 预期 level | 预期原因 |
|------|------|------------|----------|
| 空结果 | `[]` | low | 无搜索结果 |
| 高质量结果 | 3+ 结果，平均相关度 >0.8 | high | 多个高相关度结果 |
| 中等质量 | 1-2 结果，相关度中等 | medium | 结果较少 |
| impact 场景 | 结果含多处引用 | high | 发现多处引用 |
| search 场景 | 最高相关度 >0.9 | high | 高质量匹配 |
