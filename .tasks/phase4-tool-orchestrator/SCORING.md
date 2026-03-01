## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | tool-orchestrator.ts 文件存在 | 10 | 文件系统检查 | 自动 |
| L1-2 | intent-router.ts 文件存在 | 5 | 文件系统检查 | 自动 |
| L1-3 | orchestrator/index.ts 入口存在 | 5 | 文件系统检查 | 自动 |
| L2-1 | ToolOrchestrator 类定义 | 5 | 正则匹配 | 自动 |
| L2-2 | IntentRouter 类定义 | 5 | 正则匹配 | 自动 |
| L2-3 | runToolWithTimeout 方法实现 | 5 | 正则匹配 | 自动 |
| L2-4 | runToolSafely 方法实现 | 5 | 正则匹配 | 自动 |
| L2-5 | executeWithFallback 方法实现 | 5 | 正则匹配 | 自动 |
| L2-6 | executeParallel 方法实现 | 5 | 正则匹配 | 自动 |
| L2-7 | IntentRouter route 方法实现 | 5 | 正则匹配 | 自动 |
| L3-1 | 使用 AbortController 实现超时 | 10 | 正则匹配 | 自动 |
| L3-2 | 默认超时 30 秒配置 | 5 | 正则匹配 | 自动 |
| L3-3 | 正确处理 AbortError | 5 | 正则匹配 | 自动 |
| L3-4 | 错误隔离返回对象结构 | 5 | 正则匹配 | 自动 |
| L3-5 | 置信度阈值检查逻辑 | 5 | 正则匹配 | 自动 |
| L3-6 | Intent 白名单验证 | 5 | 正则匹配 | 自动 |
| L4-1 | 不使用 setTimeout 抛错 | 5 | 正则匹配 | 自动 |
| L4-2 | 错误时不中断流程 | 5 | 正则匹配 | 自动 |
| L4-3 | 无循环回退链 | 5 | 正则匹配 | 自动 |
| L4-4 | 超时使用常量定义 | 5 | 正则匹配 | 自动 |

> **总分：100 分**

### 评分等级

- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 关键检查点说明

#### L3-1: AbortController 使用（10分）
这是本任务的核心技术要求。实现必须：
1. 创建 `AbortController` 实例
2. 使用 `setTimeout` 调用 `controller.abort()`
3. 将 `signal` 传递给底层工具执行
4. 清理 `setTimeout` 避免内存泄漏

#### L3-5: 置信度阈值检查（5分）
回退链触发条件必须严格实现：
- 当 `confidence.score < getThreshold(intent.intent, 'medium')` 时触发回退
- 回退后合并结果并重新计算置信度
- 达到阈值或回退链耗尽后停止

#### L4-1: 不使用 setTimeout 抛错（5分）
常见错误模式：
```typescript
// 错误
setTimeout(() => { throw new Error('Timeout'); }, timeout);
```

正确模式：
```typescript
// 正确
const controller = new AbortController();
setTimeout(() => controller.abort(), timeout);
```

### 验证环境

- Node.js 版本: >= 20
- TypeScript 版本: 5.x
- 测试框架: Vitest
- 执行命令: `npm test .tasks/phase4-tool-orchestrator/EVAL.ts`

### 验证命令示例

```bash
# 自动验证所有检查点
npm test .tasks/phase4-tool-orchestrator/EVAL.ts

# 手动验证 TypeScript 编译
npm run typecheck

# 手动验证代码存在性
ls -la src/orchestrator/

# 手动查看实现细节
cat src/orchestrator/tool-orchestrator.ts
```

### 评分流程

1. **自动评分**：运行 EVAL.ts 测试文件，获取基础分数
2. **人工复核**：检查关键实现细节（如 AbortController 正确使用）
3. **最终得分**：自动评分 + 人工调整（如有）

### 评分示例

| 场景 | 预期得分 | 说明 |
|------|----------|------|
| 完整实现所有要求 | 95-100 | 优秀 |
| 实现核心功能但缺少部分细节 | 70-90 | 通过 |
| 未使用 AbortController | < 50 | 失败（关键检查点未通过）|
| 缺少回退链实现 | < 60 | 失败（核心功能缺失）|
| 错误时抛出异常中断流程 | < 60 | 失败（违背设计原则）|
