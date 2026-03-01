# Group B - 适配器模块测试任务 (v2 - 修复版)

## 背景

适配器模块是 CodeMap 工具编排系统的核心组件，负责集成外部工具（如 ast-grep、codemap）并统一其接口。当前适配器模块缺乏完整的测试覆盖，需要编写 Vitest 测试套件。

**目标源代码文件**（必须测试这些文件）：

1. **src/orchestrator/adapters/base-adapter.ts**
   - `ToolAdapter<TOptions>` 接口
   - `AdapterResult` 类型
   - `ToolOptions` 类型

2. **src/orchestrator/adapters/ast-grep-adapter.ts**
   - `AstGrepAdapter` 类
   - `createAstGrepAdapter` 工厂函数
   - `AstGrepAdapterOptions` 类型

3. **src/orchestrator/adapters/codemap-adapter.ts**
   - `CodemapAdapter` 类
   - `createCodemapAdapter` 工厂函数
   - `CodemapAdapterOptions` 类型

4. **src/orchestrator/adapters/index.ts**
   - 所有导出（类、工厂函数、类型）

## 要求

### ⚠️ 关键要求（禁止违反）

#### CF-1: 测试必须导入实际源代码（禁止自建模拟类）

**错误做法**（禁止）：
```typescript
// ❌ 禁止在测试中自建模拟类
class AstGrepAdapter {
  name = 'ast-grep';
  weight = 0.8;
}
```

**正确做法**（必须）：
```typescript
// ✅ 必须导入实际源代码
import { AstGrepAdapter } from '../ast-grep-adapter.js';
import type { ToolOptions, UnifiedResult } from '../../types.js';
```

#### CF-2: 必须创建 index.test.ts
测试必须覆盖 `adapters/index.ts` 的导出：
- `AstGrepAdapter` 类
- `CodemapAdapter` 类
- `createAstGrepAdapter` 工厂函数
- `createCodemapAdapter` 工厂函数

#### CF-3: Mock 策略必须正确
- 使用 `vi.mock('node:child_process')` （**必须**带 `node:` 前缀）
- 使用 `vi.mock('globby')` 而非 `'glob'`
- 正确模拟 `spawn` 的事件：`stdout.data`, `stderr.data`, `close`, `error`

#### CF-4: 行为语义必须匹配源代码
测试必须验证实际行为：
- `isAvailable()` - 调用 `sg --version`
- `execute()` - 处理空数组、多关键词、topK 限制
- 错误处理 - 返回空数组 `[]` 而非抛出异常

### 测试规范

1. **使用 Vitest**：所有测试使用 Vitest 框架
2. **Mock 外部依赖**：使用 `vi.mock()` 模拟 `node:child_process` 和 `globby`
3. **测试覆盖率**：行覆盖率、分支覆盖率均需达到 100%
4. **类型安全**：测试代码需通过 TypeScript 类型检查

### 测试文件结构

```
src/orchestrator/adapters/__tests__/
├── ast-grep-adapter.test.ts    # 测试 AstGrepAdapter
├── codemap-adapter.test.ts     # 测试 CodemapAdapter
└── index.test.ts               # 测试 index.ts 导出
```

### 必须测试的行为

#### AstGrepAdapter
- `name` 属性返回 `'ast-grep'`
- `weight` 属性返回 `0.8`
- `isAvailable()` 方法：
  - 调用 `sg --version`
  - 返回 `true` 当命令成功
  - 返回 `false` 当命令失败
- `execute()` 方法：
  - 处理空关键词数组返回空结果
  - 正确处理多关键词搜索
  - 正确应用 `topK` 限制
  - 返回符合 `UnifiedResult` 格式的结果
  - 错误时返回空数组 `[]`

#### CodemapAdapter
- `name` 属性返回 `'codemap'`
- `weight` 属性返回 `0.6`
- `isAvailable()` 方法：
  - 检查 `codemap` 命令是否可用
  - 返回布尔值
- `execute()` 方法：
  - 正确使用 globby 搜索文件
  - 返回符合 `UnifiedResult` 格式的结果
  - 错误时返回空数组 `[]`

#### index.ts 导出
- 正确导出 `AstGrepAdapter` 类
- 正确导出 `CodemapAdapter` 类
- 正确导出 `createAstGrepAdapter` 工厂函数
- 正确导出 `createCodemapAdapter` 工厂函数
- 工厂函数返回正确的适配器实例

## 初始状态

- 目标源代码已存在（见上文）
- `src/orchestrator/adapters/__tests__/` 目录已存在
- Vitest 已配置
- 当前无测试文件或测试不完整

## 约束条件

### 强制约束
1. **必须导入实际源代码**：禁止在测试文件中重新定义类或接口
2. **必须使用 `node:` 前缀**：`vi.mock('node:child_process')`
3. **必须使用 `globby`**：`vi.mock('globby')` 而非 `vi.mock('glob')`
4. **必须创建 index.test.ts**：测试所有导出
5. **必须达到 100% 覆盖率**：行覆盖率和分支覆盖率

### 技术约束
1. **Prefer retrieval-led reasoning over pre-training-led reasoning**：
   - 分析源代码的实际实现
   - 不要基于假设编写测试
   - 如有疑问，先阅读源代码

2. **Mock 实现约束**：
```typescript
// ✅ 正确的 spawn mock
const mockSpawn = vi.fn().mockReturnValue({
  stdout: { on: vi.fn() },
  stderr: { on: vi.fn() },
  on: vi.fn((event, callback) => {
    if (event === 'close') callback(0);
  })
});
```

3. **类型导入约束**：
```typescript
// ✅ 正确的类型导入
import type { ToolOptions, UnifiedResult } from '../../types.js';
```

## 验收标准

### 功能验收
- [ ] 测试文件正确导入实际源代码
- [ ] 所有测试通过 (`npm test`)
- [ ] 行覆盖率达到 100%
- [ ] 分支覆盖率达到 100%

### 代码质量验收
- [ ] 无 TypeScript 类型错误
- [ ] 无 ESLint 错误
- [ ] 遵循项目代码规范

### 文件验收
- [ ] `ast-grep-adapter.test.ts` 存在且有效
- [ ] `codemap-adapter.test.ts` 存在且有效
- [ ] `index.test.ts` 存在且有效

## 用户价值

1. **确保适配器可靠性**：通过全面测试确保适配器行为符合预期
2. **防止回归**：未来修改不会破坏现有功能
3. **文档化行为**：测试作为行为文档，帮助理解适配器工作原理
4. **提升开发信心**：开发者可以安全地重构和优化代码

## 反例场景（禁止的做法）

### 场景 1：自建模拟类
```typescript
// ❌ 禁止：自建模拟类而非导入实际代码
describe('AstGrepAdapter', () => {
  class MockAdapter {
    name = 'ast-grep';
  }
  // ...
});
```

### 场景 2：错误的 Mock 路径
```typescript
// ❌ 禁止：不带 node: 前缀
vi.mock('child_process', () => ({ spawn: vi.fn() }));

// ❌ 禁止：使用 glob 而非 globby
vi.mock('glob', () => ({ sync: vi.fn() }));
```

### 场景 3：缺失 index.test.ts
```typescript
// ❌ 禁止：不测试 index.ts 导出
// 必须创建 index.test.ts 测试所有导出
```

### 场景 4：错误的行为假设
```typescript
// ❌ 禁止：假设错误时抛出异常
expect(() => adapter.execute([])).toThrow();

// ✅ 正确：实际行为是返回空数组
expect(await adapter.execute([])).toEqual([]);
```

## 执行提示

1. **首先阅读源代码**：在编写测试前，仔细阅读目标源代码文件
2. **理解实际行为**：确保测试验证的是实际行为，而非假设行为
3. **逐步验证**：每编写一个测试就运行验证
4. **检查覆盖率**：使用 `--coverage` 标志检查覆盖率
