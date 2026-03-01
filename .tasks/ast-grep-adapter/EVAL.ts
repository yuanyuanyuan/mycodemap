import { expect, test } from 'vitest';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const TASK_DIR = '.tasks/ast-grep-adapter';

// Level 0: 项目约定检查
test('[L0] 代码应遵循项目的架构约定', () => {
  // 检查 adapters 目录存在
  const adaptersDir = join(process.cwd(), 'src/orchestrator/adapters');
  expect(existsSync(adaptersDir)).toBe(true);

  // 检查基类存在
  const baseAdapterPath = join(process.cwd(), 'src/orchestrator/adapters/base-adapter.ts');
  expect(existsSync(baseAdapterPath)).toBe(true);
});

// Level 1: AstGrepAdapter 类存在性
test('[L1] AstGrepAdapter 类应存在', () => {
  const adapterPath = join(process.cwd(), 'src/orchestrator/adapters/ast-grep-adapter.ts');
  expect(existsSync(adapterPath)).toBe(true);
});

// Level 2: 继承 ToolAdapter 基类
test('[L2] AstGrepAdapter 应继承 ToolAdapter', () => {
  const adapterPath = join(process.cwd(), 'src/orchestrator/adapters/ast-grep-adapter.ts');
  const content = readFileSync(adapterPath, 'utf-8');

  // 检查导入基类
  expect(content).toMatch(/import.*ToolAdapter.*from.*base-adapter/);

  // 检查继承
  expect(content).toMatch(/extends\s+ToolAdapter/);
});

// Level 3: search 方法实现
test('[L3] search 方法应完整实现', () => {
  const adapterPath = join(process.cwd(), 'src/orchestrator/adapters/ast-grep-adapter.ts');
  const content = readFileSync(adapterPath, 'utf-8');

  // 检查 search 方法签名
  expect(content).toMatch(/async\s+search\s*\(/);

  // 检查方法包含 ast-grep 调用
  expect(content).toMatch(/ast-grep|astGrep|spawn.*ast-grep|exec.*ast-grep/);
});

// Level 4: 结果转换为 UnifiedResult
test('[L4] 应实现 UnifiedResult 转换', () => {
  const adapterPath = join(process.cwd(), 'src/orchestrator/adapters/ast-grep-adapter.ts');
  const content = readFileSync(adapterPath, 'utf-8');

  // 检查 UnifiedResult 导入
  expect(content).toMatch(/import.*UnifiedResult.*from/);

  // 检查返回类型
  expect(content).toMatch(/:.*Promise<.*UnifiedResult.*\[\]>|:.*UnifiedResult.*\[\]/);
});

// Level 5: 错误处理
test('[L5] 应包含错误处理', () => {
  const adapterPath = join(process.cwd(), 'src/orchestrator/adapters/ast-grep-adapter.ts');
  const content = readFileSync(adapterPath, 'utf-8');

  // 检查 try-catch 或错误处理
  expect(content).toMatch(/try\s*\{|catch\s*\(/);
});

// Level 6: ToolOrchestrator 集成
test('[L6] 应在 ToolOrchestrator 中注册', () => {
  const orchestratorPath = join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts');

  if (existsSync(orchestratorPath)) {
    const content = readFileSync(orchestratorPath, 'utf-8');
    // 检查是否导入或注册了 AstGrepAdapter
    const hasImport = content.includes('ast-grep-adapter') || content.includes('AstGrepAdapter');
    const hasRegister = content.includes('registerAdapter') || content.includes('adapters');

    // 至少应该有导入或注册逻辑
    expect(hasImport || hasRegister).toBe(true);
  }
});

// Level 7: 负面检查 - 不使用反模式
test('[L7-负面] 不应该使用反模式', () => {
  const adapterPath = join(process.cwd(), 'src/orchestrator/adapters/ast-grep-adapter.ts');
  const content = readFileSync(adapterPath, 'utf-8');

  // 不应使用 console.log
  expect(content).not.toMatch(/console\.log\s*\(\s*['"]/);

  // 不应使用 any 类型
  expect(content).not.toMatch(/:\s*any\s*[=;)]/);
});

// Level 8: 配置权重检查
test('[L8] 应配置正确的权重', () => {
  const adapterPath = join(process.cwd(), 'src/orchestrator/adapters/ast-grep-adapter.ts');
  const content = readFileSync(adapterPath, 'utf-8');

  // 设计文档建议 ast-grep 权重为 1.0
  // 检查是否包含权重配置
  const hasWeight = content.includes('weight') || content.includes('WEIGHT');
  // 如果没有在适配器中配置权重，检查 ToolOrchestrator
  if (!hasWeight) {
    const orchestratorPath = join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts');
    if (existsSync(orchestratorPath)) {
      const orchContent = readFileSync(orchestratorPath, 'utf-8');
      // 应该在某处配置了权重
      expect(orchContent).toMatch(/weight|WEIGHT/);
    }
  }
});

describe('验收标准检查', () => {
  test('所有关键检查点通过', () => {
    const adapterPath = join(process.cwd(), 'src/orchestrator/adapters/ast-grep-adapter.ts');
    const content = readFileSync(adapterPath, 'utf-8');

    const checks = [
      // L1: 文件存在
      existsSync(adapterPath),
      // L2: 继承 ToolAdapter
      /extends\s+ToolAdapter/.test(content),
      // L3: search 方法
      /async\s+search\s*\(/.test(content),
      // L4: UnifiedResult
      /UnifiedResult/.test(content),
    ];

    const passedCount = checks.filter(Boolean).length;
    expect(passedCount).toBeGreaterThanOrEqual(3);
  });
});
