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
| Workflow E2E | `tests/e2e/**/*.test.ts` |
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

```typescript
// vitest.e2e.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
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

## 真实场景验证规则（强制）

> **适用范围**：本规则适用于 Phase 41 之后的所有新开发及对已有代码的后续修改。  
> **豁免条款**：Phase 41/42 已有实现（截至本规则生效日）不受追溯约束；后续任何修改必须合规。  
> **宪法依据**：→ `AGENTS.md` Section 8.1（真实场景验证阈值）、Section 8.2（豁免条款）

> **原则：测试必须通过真实运行验证，拒绝仅依赖单元测试断言的"纸面通过"。**

### 什么是真实场景验证

| 验证层级 | 定义 | 最低要求 |
|----------|------|----------|
| **真实环境** | 在未初始化/干净环境中运行 | 全新 `mktemp -d` 或隔离容器 |
| **真实数据** | 使用实际生产数据或等价数据集 | 不得全用 mock/fixture 替代 |
| **真实调用** | 通过实际 SDK/CLI/协议连接 | 不得仅断言函数返回值 |
| **真实输出** | 捕获并校验实际 stdout/stderr/文件 | 不得仅断言内部状态 |

### 强制规则

1. **每个测试必须有证据**
   - 测试通过 ≠ 任务完成
   - 必须附加：真实运行截图、日志片段、或可复制验证的命令
   - 证据格式：`[证据] path:line` 或 `[证据] 命令输出`

2. **禁止以下"伪验证"**
   - ❌ 仅 mock 依赖后断言函数返回值
   - ❌ 仅运行 `toEqual` 断言但没有真实端到端触发
   - ❌ 在已污染环境中运行并声称"通过"
   - ❌ 没有失败场景验证（只证明成功路径）

3. **失败场景必须验证**
   - 每个修复/功能必须至少模拟 1 个失败场景
   - 证据：故意构造错误输入，确认系统按预期失败

4. **可信度自评**
   - 每次交付前必须输出：
     ```markdown
     ## 可信度自评
     - **确定信息**（基于代码/文档验证）：...
     - **推测信息**（基于模式匹配）：...
     - **需验证信息**（未确认/无法确认）：...
     - **风险标记**：...
     ```

### 快速检查清单

- [ ] 是否在干净环境中运行过？
- [ ] 是否使用真实数据/连接验证过？
- [ ] 是否有失败场景的验证证据？
- [ ] 是否记录了"需验证信息"和风险标记？

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

# 运行 workflow E2E 护栏
npm run test:e2e

# 运行特定测试文件
npx vitest run src/orchestrator/__tests__/confidence.test.ts

# 运行与变更相关的测试
npx vitest run --changed

# 运行覆盖率
npx vitest run --coverage

# 监视模式
npx vitest watch
```
