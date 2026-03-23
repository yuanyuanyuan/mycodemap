# 测试规则

> 测试框架、覆盖率要求、基准测试

---

## 测试框架

| 项目 | 配置 |
|------|------|
| 框架 | Vitest |
| 覆盖率工具 | @vitest/coverage-v8 |
| 目标覆盖率 | >= 80% |

## 测试文件位置

| 类型 | 路径 |
|------|------|
| 常规测试 | `src/**/*.test.ts` |
| 集成测试 | `tests/` 目录（如存在单独集成测试编排） |
| 基准测试 | `refer/benchmark-quality.test.ts` |

## 测试配置

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'refer/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'threads'
  }
});
```

## 测试要求

- 所有新功能必须附带测试
- 测试文件命名：`* .test.ts`
- 使用 `describe` 和 `it` 组织测试用例
- 使用 `beforeEach`/`afterEach` 管理测试状态

## 基准测试

- 基准查询集：`refer/benchmark-quality.ts`（30 条预定义查询）
- 基准测试配置：`vitest.benchmark.config.ts`
- 关键指标：
  - Token 消耗降低 >= 40%
  - Hit@8 >= 90%

## 常用命令

```bash
# 运行所有测试
npm test
npx vitest run

# 运行特定测试文件
npx vitest run src/orchestrator/__tests__/confidence.test.ts

# 运行与变更相关的测试
npx vitest run --changed

# 运行覆盖率
npx vitest run --coverage

# 监视模式
npx vitest watch
```
