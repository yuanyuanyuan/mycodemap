# 适配器模块测试用例生成任务

## 背景

本项目需要为代码搜索工具的适配器模块生成完整的测试套件。适配器模块负责将不同的代码搜索工具（ast-grep, codemap）统一封装为相同的接口。

**核心设计理念**: `Prefer retrieval-led reasoning over pre-training-led reasoning`

测试代码的生成必须基于实际的接口定义和源代码结构，而非依赖预训练知识中的通用模式。

## 初始状态

### 模块1: base-adapter.ts
```typescript
interface ToolAdapter {
  name: string;
  weight: number;
  isAvailable(): Promise<boolean>;
  execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>;
}

interface ToolOptions {
  cwd?: string;
  limit?: number;
  language?: string;
}

interface UnifiedResult {
  file: string;
  line: number;
  column: number;
  content: string;
  score: number;
}
```

### 模块2: ast-grep-adapter.ts
```typescript
class AstGrepAdapter implements ToolAdapter {
  name = 'ast-grep';
  weight = 0.8;
  
  isAvailable(): Promise<boolean>;
  execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>;
  private truncateByToken(content: string, maxTokens: number): string;
  private parseAstGrepOutput(output: string): UnifiedResult[];
}
```

### 模块3: codemap-adapter.ts
```typescript
class CodemapAdapter implements ToolAdapter {
  name = 'codemap';
  weight = 0.6;
  
  isAvailable(): Promise<boolean>;
  execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>;
  private analyzeStructure(filePath: string): StructureInfo;
  private buildCodeMap(files: string[]): CodeMap;
}
```

## 要求

### 技术要求
1. **测试框架**: Vitest
2. **模拟方式**: vi.mock
3. **覆盖率目标**: 100%
4. **语言**: TypeScript

### 测试范围
1. 所有公共方法
2. 所有边界条件
3. 错误处理路径
4. 异步操作

### 文件交付
```
src/orchestrator/adapters/__tests__/
├── base-adapter.test.ts
├── ast-grep-adapter.test.ts
└── codemap-adapter.test.ts
```

## 约束条件

### 硬约束
- 必须使用 `vi.mock()` 模拟外部依赖
- 必须测试所有 `Promise` 的 resolve 和 reject 场景
- 必须验证所有接口契约
- 必须包含至少3个边界条件测试/方法

### 软约束
- 优先使用 `beforeEach` 重置状态
- 测试名称应遵循 `should [expected behavior] when [condition]` 模式
- 单文件测试数建议 15-30 个

## 验收标准

### 功能验收
- [ ] 所有测试可执行并通过
- [ ] 覆盖率报告 100%
- [ ] 无 TypeScript 编译错误
- [ ] 无 ESLint 警告

### 质量验收
- [ ] 边界条件全覆盖
- [ ] 错误场景全覆盖
- [ ] Mock 策略合理
- [ ] 代码重复率 < 10%

### 文档验收
- [ ] 测试意图清晰
- [ ] 复杂逻辑有注释
- [ ] 边界条件有说明

## 反例场景

以下情况视为不合格：

1. **缺少边界测试**
   ```typescript
   // ❌ 错误：只测试正常路径
   it('should parse JSON', () => {
     expect(parse('{"a":1}')).toEqual({a:1});
   });
   
   // ✅ 正确：包含边界测试
   it('should parse JSON', () => { ... });
   it('should throw on invalid JSON', () => { ... });
   it('should handle empty string', () => { ... });
   ```

2. **错误的Mock方式**
   ```typescript
   // ❌ 错误：直接修改模块
   fs.readFileSync = vi.fn();
   
   // ✅ 正确：使用vi.mock
   vi.mock('fs', () => ({ readFileSync: vi.fn() }));
   ```

3. **未测试异步错误**
   ```typescript
   // ❌ 错误：只测试成功路径
   it('should execute', async () => {
     await expect(adapter.execute([])).resolves.toEqual([]);
   });
   
   // ✅ 正确：包含错误测试
   it('should throw on execution error', async () => {
     await expect(adapter.execute([])).rejects.toThrow();
   });
   ```

## 用户价值

完成此任务后，用户将获得：
1. 可靠的回归测试套件
2. 100%代码覆盖率保障
3. 边界条件安全网
4. 重构信心
5. 文档化的行为规格

## 上下文块

```yaml
task_context:
  framework: vitest
  mock_strategy: vi.mock
  coverage_target: 100%
  adapter_pattern: ToolAdapter
  test_pattern: AAA (Arrange-Act-Assert)
  
retrieval_priority: high
reasoning_mode: retrieval-led
```

**注意**: 所有测试代码的生成应基于实际的源代码结构和接口定义，优先使用检索式推理而非预训练知识中的通用测试模式。
