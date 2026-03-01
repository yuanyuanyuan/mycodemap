# 任务：修复 ToolOrchestrator 超时控制机制

## 背景

`ToolOrchestrator` 是 CodeMap 的核心组件，负责工具执行、超时控制和错误隔离。当前实现中存在一个关键缺陷：虽然代码中创建了 `AbortController` 用于超时控制，但实际上超时机制并未真正生效。

当前问题：
1. `runToolWithTimeout` 方法创建了 `AbortController` 和超时定时器
2. 但 `adapter.execute(intent)` 调用时没有传递 `signal` 参数
3. 超时发生时 `controller.abort()` 被调用，但工具执行并未实际中断
4. 缺少 `Promise.race` 实现的硬超时机制

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - [项目上下文文件：AGENTS.md / CLAUDE.md / .codemap/AI_MAP.md]
> - [架构文档：docs/REFACTOR_ORCHESTRATOR_DESIGN.md]
> - [相关代码：src/orchestrator/tool-orchestrator.ts]
> - [相关代码：src/orchestrator/types.ts]
>
> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的工具/库，不引入重复依赖
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

## 要求

1. **更新 ToolAdapter 接口**：在 `execute` 方法签名中添加可选的 `signal?: AbortSignal` 参数
2. **实现硬超时机制**：使用 `Promise.race` 实现真正的超时控制
3. **传递 AbortSignal**：确保 `adapter.execute()` 调用时传递 `signal` 参数
4. **超时后触发回退**：超时发生时正确返回空结果，触发回退机制执行
5. **保持向后兼容**：现有适配器实现不应因此变更而破坏

## 初始状态

当前 `ToolAdapter` 接口定义（位于 `src/orchestrator/tool-orchestrator.ts`）：

```typescript
export interface ToolAdapter {
  name: string;
  weight: number;
  isAvailable(): Promise<boolean>;
  execute(intent: CodemapIntent): Promise<UnifiedResult[]>;
}
```

当前有问题的 `runToolWithTimeout` 方法实现：

```typescript
async runToolWithTimeout(
  tool: string,
  intent: CodemapIntent,
  timeout: number = this.DEFAULT_TIMEOUT
): Promise<UnifiedResult[]> {
  console.debug(`执行工具: ${tool}, 超时: ${timeout}ms`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const adapter = this.adapters.get(tool);
    if (!adapter) {
      console.warn(`工具 ${tool} 未注册，返回空结果`);
      return [];
    }

    // 检查工具是否可用
    if (!(await adapter.isAvailable())) {
      console.warn(`工具 ${tool} 不可用，返回空结果`);
      return [];
    }

    const results = await adapter.execute(intent);  // 没有传 signal！
    console.debug(`工具 ${tool} 执行成功，返回 ${results.length} 条结果`);
    return results;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`工具 ${tool} 执行超时 (${timeout}ms)`);
    } else {
      console.error(`工具 ${tool} 执行失败: ${error}`);
    }
    // 超时或错误时返回空结果，触发回退
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
```

## 约束条件

- 必须使用 TypeScript 严格模式
- 保持现有接口的向后兼容性
- 超时后必须正确触发回退机制（返回空结果）
- 遵循项目的错误处理模式（使用 `AbortError` 识别超时）
- **必须查阅项目文档和现有代码模式后再实现**
- **禁止使用训练数据中已知但项目未采用的新 API**

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| ToolAdapter 接口更新 | 代码审查 | `execute` 方法包含可选 `signal` 参数 |
| Promise.race 实现 | 代码审查 | 使用 `Promise.race` 实现硬超时 |
| AbortSignal 传递 | 代码审查 | `adapter.execute(intent, signal)` 调用方式 |
| 回退机制触发 | 单元测试 | 超时后返回空数组，触发回退执行 |
| 类型检查通过 | `pnpm typecheck` | 无 TypeScript 编译错误 |
| 单元测试通过 | `pnpm test` | 所有相关测试通过 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 超时控制 | 名义存在但不生效 | 真正生效，超时后中断执行 | positive |
| 系统稳定性 | 慢查询可能阻塞 | 慢查询被中断，系统更稳定 | positive |
| 回退机制 | 超时后可能未触发 | 超时后正确触发回退 | positive |

## 反例场景

### 反例用户 1
- **用户特征**: 使用自定义 ToolAdapter 但不更新实现
- **场景**: 适配器不接收 signal 参数
- **原因**: 虽然接口要求 signal 参数是可选的，但如果实现完全不处理 signal，超时机制对该适配器仍不生效。这是向后兼容的预期行为，但用户需要了解。

### 反例用户 2
- **用户特征**: 期望超时后抛出异常而非触发回退
- **场景**: 需要区分超时和正常空结果
- **原因**: 当前设计超时返回空数组触发回退，不抛出异常。如需区分，需要额外机制。

### 反例实现（AI 常见错误）
- **错误模式**: 直接修改 execute 参数而不保持向后兼容
- **后果**: 破坏现有适配器实现
- **正确做法**: signal 参数必须是可选的（`signal?: AbortSignal`）
