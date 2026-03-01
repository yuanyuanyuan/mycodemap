## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | buildMapping 方法完整实现 | 20 | 代码审查 + 正则匹配 | 自动 |
| L2-1 | findRelatedTests 方法完整实现 | 20 | 代码审查 + 正则匹配 | 自动 |
| L3-1 | scanTestImports 方法实现 | 15 | 代码审查 + 正则匹配 | 自动 |
| L4-1 | TestConfig 接口对齐设计 | 15 | 接口对比 | 自动 |
| L5-1 | loadConfig 完整实现 | 10 | 代码审查 | 自动 |
| L6-1 | 目录级别匹配实现 | 10 | 代码审查 | 自动 |
| L7-1 | 无反模式（any type, console.log） | 5 | 代码审查 | 自动 |
| L8-1 | 设计文档对齐 | 5 | 文档对比 | 自动 |

> 以上分值总和 = 100

### 评分等级
- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 验证环境
- Node.js 版本: >= 18
- 测试框架: Vitest
- 执行命令: `pnpm test .tasks/test-linker-core-functionality/EVAL.ts`

### 验证命令示例
```bash
# 自动验证
pnpm test .tasks/test-linker-core-functionality/EVAL.ts

# 手动验证
# 1. 检查 src/orchestrator/test-linker.ts 中是否包含以下方法:
#    - async buildMapping(projectRoot: string, codemap: CodemapData)
#    - findRelatedTests(sourceFiles: string[]): string[]
#    - scanTestImports(testFile: string): string[]
#    - findDirLevelTests(sourceFile: string): string[]
# 2. 检查 TestConfig 接口字段是否完整
# 3. 检查 loadConfig 是否支持 vitest/jest 配置解析
```
