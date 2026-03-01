# 适配器模块测试套件生成任务 (Group B)

## 背景

本项目需要为编排器（Orchestrator）模块的工具适配器层生成完整的测试套件。适配器模块负责将不同的代码分析工具（ast-grep、codemap）统一封装为相同的 `ToolAdapter` 接口，供 `ToolOrchestrator` 调用。

**核心设计理念**: `Prefer retrieval-led reasoning over pre-training-led reasoning`

测试代码的生成必须基于实际的接口定义和源代码结构，而非依赖预训练知识中的通用模式。

## 初始状态

### 模块1: base-adapter.ts
\`\`\`typescript
/**
 * ToolAdapter 适配器基类接口
 * 所有工具适配器必须实现此接口
 */
export interface ToolAdapter {
  /** 适配器名称 */
  name: string;
  /** 结果权重（0-1） */
  weight: number;

  /**
   * 检查工具是否可用
   * @returns 是否可用的 Promise
   */
  isAvailable(): Promise<boolean>;

  /**
   * 执行工具搜索
   * @param keywords - 搜索关键词列表
   * @param options - 工具选项
   * @returns 统一结果列表的 Promise
   */
  execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>;
}
\`\`\`

### 模块2: ast-grep-adapter.ts
\`\`\`typescript
export class AstGrepAdapter implements ToolAdapter {
  name = 'ast-grep';
  weight = 1.0;

  constructor(options: AstGrepAdapterOptions = {})
  async isAvailable(): Promise<boolean>  // 通过 npx ast-grep --version 检测
  async execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>
  async search(pattern: string, options?: ToolOptions): Promise<UnifiedResult[]>
  private async runAstGrepSearch(pattern: string, files: string[]): Promise<UnifiedResult[]>
  private runCommand(args: string[]): Promise<string>  // 使用 spawn 执行 npx
  private parseAstGrepOutput(output: string, keyword: string): UnifiedResult[]
  private inferSymbolType(content: string): 'class' | 'function' | 'interface' | 'variable'
  private async getTargetFiles(): Promise<string[]>  // 使用 globby
}

export function createAstGrepAdapter(options?: AstGrepAdapterOptions): ToolAdapter
\`\`\`

**依赖**: \`node:child_process\` (spawn), \`globby\`

### 模块3: codemap-adapter.ts
\`\`\`typescript
export class CodemapAdapter implements ToolAdapter {
  name = 'codemap';
  weight = 0.9;

  constructor(options: CodemapAdapterOptions = {})
  async isAvailable(): Promise<boolean>  // 检查 .codemap/codemap.json 是否存在
  async execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>
  private async executeImpact(targets: string[], scope: 'direct' | 'transitive', topK: number, keywords: string[]): Promise<UnifiedResult[]>
  private async executeDeps(targets: string[], topK: number, keywords: string[]): Promise<UnifiedResult[]>
  private async executeComplexity(targets: string[], topK: number, keywords: string[]): Promise<UnifiedResult[]>
}

export function createCodemapAdapter(options?: CodemapAdapterOptions): ToolAdapter
\`\`\`

**依赖**: \`node:fs/promises\` (readFile), \`node:path\` (join), \`ImpactCommand\`, \`DepsCommand\`, \`ComplexityCommand\`

### 模块4: index.ts
\`\`\`typescript
// 统一导出所有适配器
export type { ToolAdapter } from './base-adapter.js';
export type { CodemapAdapterOptions } from './codemap-adapter.js';
export { CodemapAdapter, createCodemapAdapter } from './codemap-adapter.js';
export type { AstGrepAdapterOptions } from './ast-grep-adapter.js';
export { AstGrepAdapter, createAstGrepAdapter } from './ast-grep-adapter.js';
\`\`\`

### 统一结果类型
\`\`\`typescript
interface UnifiedResult {
  id: string;
  source: string;
  toolScore: number;
  type: 'code' | 'file';
  file: string;
  line?: number;
  content: string;
  relevance: number;
  keywords: string[];
  metadata: {
    symbolType?: 'class' | 'function' | 'interface' | 'variable';
    dependencies: string[];
    testFile: string;
    commitCount: number;
    gravity: number;
    heatScore: {
      freq30d: number;
      lastType: string;
      lastDate: Date | null;
      stability: boolean;
    };
    impactCount: number;
    stability: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

interface ToolOptions {
  cwd?: string;
  topK?: number;
  intent?: string;
  scope?: 'direct' | 'transitive';
  targets?: string[];
  includeTests?: boolean;
}
\`\`\`

## 要求

### 技术要求
1. **测试框架**: Vitest
2. **模拟方式**: \`vi.mock()\` 模拟外部依赖
3. **覆盖率目标**: 100%（语句、分支、函数、行）
4. **语言**: TypeScript

### 关键测试场景

#### AstGrepAdapter 测试场景
1. **isAvailable()**:
   - ast-grep 可用时返回 true
   - ast-grep 不可用时返回 false（命令执行失败）
   - spawn 错误处理

2. **execute()**:
   - 空关键词数组返回空数组
   - 正常执行返回 UnifiedResult[]
   - 多个关键词分别搜索并合并结果
   - 根据 topK 限制返回数量
   - 错误时返回空数组（不抛出）

3. **search()**:
   - 空模式返回空数组
   - 使用 globby 获取目标文件
   - 调用 spawn 执行 npx ast-grep scan
   - 解析 JSON 输出
   - 无目标文件时返回空数组

4. **runCommand()** (私有方法，通过公共方法间接测试):
   - spawn 成功执行返回 stdout
   - spawn 失败返回 reject
   - 超时处理

5. **parseAstGrepOutput()** (私有方法，通过公共方法间接测试):
   - 正确解析 JSON 数组格式
   - 正确解析 { results: [...] } 格式
   - 处理无效 JSON（不抛出，返回空数组）
   - 缺失字段的默认值处理

6. **inferSymbolType()**:
   - 识别 class 定义
   - 识别 function 定义
   - 识别箭头函数
   - 识别 interface 定义
   - 其他内容标记为 variable

#### CodemapAdapter 测试场景
1. **isAvailable()**:
   - .codemap/codemap.json 存在时返回 true
   - 文件不存在时返回 false
   - readFile 错误处理

2. **execute()**:
   - 根据 intent 路由到对应方法（impact/dependency/complexity）
   - 从 options 提取 intent、scope、targets
   - 空目标时返回空数组
   - 使用 defaultIntent 当 options.intent 未指定
   - 使用 defaultScope 当 options.scope 未指定

3. **executeImpact()**:
   - 调用 ImpactCommand.runEnhanced()
   - 合并关键词到结果
   - 根据 topK 限制返回数量
   - 错误时返回空数组

4. **executeDeps()**:
   - 调用 DepsCommand.runEnhanced()
   - 合并关键词到结果
   - 根据 topK 限制返回数量
   - 错误时返回空数组

5. **executeComplexity()**:
   - 调用 ComplexityCommand.runEnhanced()
   - 合并关键词到结果
   - 根据 topK 限制返回数量
   - 错误时返回空数组

#### 工厂函数测试
1. **createAstGrepAdapter()**:
   - 返回 ToolAdapter 实例
   - 正确传递配置选项

2. **createCodemapAdapter()**:
   - 返回 ToolAdapter 实例
   - 正确传递配置选项

### 模拟策略

#### AstGrepAdapter 需要模拟
\`\`\`typescript
vi.mock('node:child_process', () => ({
  spawn: vi.fn()
}));

vi.mock('globby', () => ({
  globby: vi.fn()
}));
\`\`\`

#### CodemapAdapter 需要模拟
\`\`\`typescript
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn()
}));

vi.mock('../../cli/commands/impact.js', () => ({
  ImpactCommand: vi.fn().mockImplementation(() => ({
    runEnhanced: vi.fn()
  }))
}));

vi.mock('../../cli/commands/deps.js', () => ({
  DepsCommand: vi.fn().mockImplementation(() => ({
    runEnhanced: vi.fn()
  }))
}));

vi.mock('../../cli/commands/complexity.js', () => ({
  ComplexityCommand: vi.fn().mockImplementation(() => ({
    runEnhanced: vi.fn()
  }))
}));
\`\`\`

### 文件交付
\`\`\`
src/orchestrator/adapters/__tests__/
├── ast-grep-adapter.test.ts      # AstGrepAdapter 完整测试
├── codemap-adapter.test.ts       # CodemapAdapter 完整测试
└── index.test.ts                 # 导出和工厂函数测试
\`\`\`

## 约束条件

### 硬约束
- 必须使用 \`vi.mock()\` 模拟外部依赖（child_process, fs/promises, globby, CLI 命令类）
- 必须测试所有 \`Promise\` 的 resolve 和 reject 场景
- 必须验证所有接口契约（name、weight、isAvailable、execute）
- 每个公共方法至少3个边界条件测试
- 必须测试 spawn 的 stdout、stderr、error、close 事件

### 软约束
- 优先使用 \`beforeEach\` 重置 mock 状态
- 测试名称应遵循 \`should [expected behavior] when [condition]\` 模式
- 单文件测试数建议 20-40 个
- 使用 \`describe\` 按方法分组测试

## 验收标准

### 功能验收
- [ ] 所有测试可执行并通过（\`npx vitest run\`）
- [ ] 覆盖率报告 100%（\`npx vitest run --coverage\`）
- [ ] 无 TypeScript 编译错误
- [ ] 无 ESLint 警告

### 质量验收
- [ ] 边界条件全覆盖（空输入、无效输入、极端值）
- [ ] 错误场景全覆盖（文件不存在、命令失败、超时）
- [ ] Mock 策略合理，不测试实现细节
- [ ] 代码重复率 < 10%
- [ ] 异步测试使用 await 或 resolves/rejects

### 文档验收
- [ ] 测试意图清晰（测试名称自解释）
- [ ] 复杂 mock 设置有注释
- [ ] 边界条件测试有说明注释

## 反例场景

以下情况视为不合格：

### 1. 缺少 spawn 事件模拟
\`\`\`typescript
// ❌ 错误：不完整的事件模拟
const mockSpawn = vi.fn().mockReturnValue({
  stdout: { on: vi.fn() },
  // 缺少 stderr、on('close')、on('error')
});

// ✅ 正确：完整的事件模拟
const mockSpawn = vi.fn().mockReturnValue({
  stdout: { on: vi.fn((event, cb) => event === 'data' && cb('output')) },
  stderr: { on: vi.fn() },
  on: vi.fn((event, cb) => {
    if (event === 'close') cb(0);
  })
});
\`\`\`

### 2. 未重置 mock 状态
\`\`\`typescript
// ❌ 错误：mock 状态污染
it('test 1', async () => {
  vi.mocked(spawn).mockReturnValue(...);
  // ...
});

it('test 2', async () => {
  // 可能继承 test 1 的 mock 状态
});

// ✅ 正确：每个测试前重置
beforeEach(() => {
  vi.clearAllMocks();
});
\`\`\`

### 3. 未测试错误边界
\`\`\`typescript
// ❌ 错误：只测试成功路径
it('should execute', async () => {
  await expect(adapter.execute(['test'])).resolves.toEqual([]);
});

// ✅ 正确：包含错误和边界测试
it('should return empty array when keywords is empty', async () => {
  await expect(adapter.execute([])).resolves.toEqual([]);
});

it('should return empty array when spawn fails', async () => {
  vi.mocked(spawn).mockImplementation(() => {
    throw new Error('spawn error');
  });
  await expect(adapter.execute(['test'])).resolves.toEqual([]);
});
\`\`\`

### 4. 直接测试私有方法
\`\`\`typescript
// ❌ 错误：测试私有方法（实现细节）
it('should parse output', () => {
  const result = (adapter as any).parseAstGrepOutput('{}', 'test');
  expect(result).toEqual([]);
});

// ✅ 正确：通过公共方法间接测试
it('should handle invalid JSON output', async () => {
  vi.mocked(spawn).mockReturnValue(createMockSpawn('{invalid json}'));
  const result = await adapter.search('pattern');
  expect(result).toEqual([]);  // 内部处理错误，返回空数组
});
\`\`\`

## 用户价值

完成此任务后，用户将获得：
1. **可靠的回归测试套件** - 防止适配器功能退化
2. **100%代码覆盖率保障** - 确保所有代码路径都被测试
3. **边界条件安全网** - 防止极端情况导致程序崩溃
4. **重构信心** - 可以安全地修改适配器实现
5. **文档化的行为规格** - 测试即文档

## 上下文块

\`\`\`yaml
task_context:
  framework: vitest
  mock_strategy: vi.mock
  coverage_target: 100%
  adapter_pattern: ToolAdapter
  test_pattern: AAA (Arrange-Act-Assert)
  spawn_events: [stdout.data, stderr.data, close, error]
  critical_paths:
    - AstGrepAdapter.isAvailable() - 工具可用性检测
    - AstGrepAdapter.execute() - 核心搜索功能
    - CodemapAdapter.execute() - 意图路由
    - error handling - 所有错误场景返回空数组而非抛出
  
retrieval_priority: high
reasoning_mode: retrieval-led
\`\`\`

**注意**: 所有测试代码的生成应基于实际的源代码结构和接口定义，优先使用检索式推理而非预训练知识中的通用测试模式。特别要注意 spawn 的事件驱动特性和错误处理模式。
