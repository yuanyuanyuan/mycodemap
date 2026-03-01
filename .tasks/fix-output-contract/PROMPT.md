# 任务：修复输出契约校验和字段完整性

## 背景

CodeMap 项目的 CI 门禁设计中，`codemap ci check-output-contract` 子命令用于验证 analyze 命令的 machine/json 输出格式是否符合契约。然而，当前实现存在两个问题：

**问题 1 - CI check-output-contract 不完整**:
- `src/cli/commands/ci.ts:150-178` 只读取 package.json 验证字段
- 设计要求应校验 analyze 的 machine/json 输出契约
- 参考 `docs/REFACTOR_REQUIREMENTS.md:17` 和 `docs/REFACTOR_ARCHITECTURE_OVERVIEW.md:224-227`

**问题 2 - analyze 输出字段缺失**:
- `src/cli/commands/analyze.ts:143-150` machine 输出缺少必要字段
- 缺少 schemaVersion、tool、confidence 等字段
- 参考设计要求 `docs/REFACTOR_ARCHITECTURE_OVERVIEW.md:224-227`

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - [项目上下文文件：AGENTS.md / CLAUDE.md / docs/REFACTOR_ARCHITECTURE_OVERVIEW.md]
> - [CI 门禁设计：docs/CI_GATEWAY_DESIGN.md (第4.2节 check-output-contract 设计)]
> - [编码规范：tsconfig.json (ES2022, strict模式)]
> - [类似实现参考：src/cli/commands/ci.ts 现有 check-commits/check-headers]
>
> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的工具/库，不引入重复依赖
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

### 设计要求参考

根据 `docs/REFACTOR_ARCHITECTURE_OVERVIEW.md:203-218`，统一输出格式应为：

```typescript
interface CodemapOutput {
  schemaVersion: string;      // 格式: "v1.0.0"
  intent: string;             // 执行的 intent 类型
  tool: string;              // 主要工具
  confidence: {
    score: number;           // 0-1
    level: 'high' | 'medium' | 'low';
  };
  results: UnifiedResult[]; // 结果列表
  metadata?: {
    executionTime: number;   // 毫秒
    resultCount: number;
  };
}
```

根据 `docs/CI_GATEWAY_DESIGN.md:367-436`，check-output-contract 应：
1. 运行 analyze 命令获取 machine 模式输出
2. 校验 schemaVersion 字段存在且匹配
3. 校验 results 数量不超过 Top-K 限制
4. 校验每个结果的 token 数不超过限制
5. 校验 confidence 字段完整性

### 当前代码状态

**src/cli/commands/ci.ts:150-178** (当前不完整的实现):
```typescript
function checkOutputContractAction(): void {
  // 读取 package.json 验证版本
  const packageJsonPath = join(process.cwd(), 'package.json');
  // ... 仅验证 package.json 字段
}
```

**src/cli/commands/analyze.ts:143-150** (machine 输出缺少字段):
```typescript
if (this.args.outputMode === 'machine' || this.args.json) {
  return {
    intent: 'impact',
    results: resultsWithTests.slice(0, topK),
    metadata: {
      total: resultsWithTests.length,
      scope,
    },
  };
}
```

## 要求

1. **修复 CI check-output-contract**:
   - 实现真正的输出契约校验逻辑
   - 运行 analyze 命令获取实际输出
   - 验证 schemaVersion、confidence、tool 等必需字段
   - 验证 results 数量和 token 限制

2. **修复 analyze machine 输出**:
   - 添加 schemaVersion 字段（设为 "v1.0.0"）
   - 添加 tool 字段（标识使用的工具）
   - 添加 confidence 对象（score 和 level）
   - 保持向后兼容

3. **定义 JSON Schema 契约**:
   - 在 src/orchestrator/types.ts 中定义输出接口
   - 添加类型守卫函数验证输出格式

## 初始状态

已有代码：
- `src/cli/commands/ci.ts` - CI 命令，需要修复 check-output-contract
- `src/cli/commands/analyze.ts` - analyze 命令，需要修复 machine 输出
- `src/orchestrator/types.ts` - 类型定义，需要补充输出契约接口

## 约束条件

- 必须使用 TypeScript 严格模式
- 遵循项目的错误处理模式（使用 errorCode）
- **必须查阅项目文档和现有代码模式后再实现**
- **禁止使用训练数据中已知但项目未采用的新 API**
- 保持现有命令行为向后兼容
- 遵循 CI_GATEWAY_DESIGN.md 第4.2节的实现规范

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| CI 校验完整 | `codemap ci check-output-contract` 运行成功 | 实际运行 analyze 并校验输出格式 |
| analyze 输出完整 | 检查 JSON 输出包含所有必需字段 | schemaVersion, tool, confidence |
| 类型定义完整 | 检查 src/orchestrator/types.ts | 包含 CodemapOutput 接口定义 |
| 向后兼容 | 现有人类可读输出模式不受影响 | human 模式保持原有行为 |
| 错误处理 | 契约校验失败返回 E0010 错误码 | 参考现有错误码定义模式 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| CI 契约校验 | 仅检查 package.json | 真正校验 analyze 输出格式 | positive - CI 更可靠 |
| machine 输出 | 字段不完整 | 符合架构设计规范 | positive - AI 消费更安全 |
| JSON Schema | 无明确契约 | 有类型定义和校验 | positive - 可维护性提升 |

## 反例场景

### 反例用户 1
- **用户特征**: 仅使用 human 输出模式
- **场景**: 不需要 JSON 输出
- **原因**: 此修复对 human 模式无影响，仅增强 machine 模式

### 反例用户 2
- **用户特征**: 使用旧版本 analyze 输出解析
- **场景**: 依赖缺失字段的默认行为
- **原因**: 此修复会改变 machine 输出结构，需要适配

### 反例实现（AI 常见错误）
- **错误模式**: 修改所有输出模式，破坏 human 格式
- **后果**: 人类可读输出也变成 JSON，用户无法阅读
- **正确做法**: 仅修改 machine/json 模式，保持 human 模式不变

### 反例实现 2
- **错误模式**: 忽略项目现有的错误码体系，使用自定义错误格式
- **后果**: 错误处理不一致，CI 无法正确解析错误
- **正确做法**: 遵循 CIErrorCode 枚举定义，添加 E0010 契约校验错误码
