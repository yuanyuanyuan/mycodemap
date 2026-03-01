import { expect, test, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Level 0: 项目约定检查
describe('[L0] 代码应遵循项目的架构约定', () => {
  test('应使用项目的 TypeScript 严格模式', () => {
    const tsconfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions?.strict).toBe(true);
  });

  test('应使用项目现有的测试框架', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    expect(pkg.devDependencies?.['vitest'] || pkg.dependencies?.['vitest']).toBeTruthy();
  });
});

// Level 1: 存在性检查
describe('[L1] 集成测试和基准验证文件', () => {
  test('集成测试文件存在', () => {
    const filePath = join(process.cwd(), 'tests/integration/orchestrator.test.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('基准验证脚本存在', () => {
    const filePath = join(process.cwd(), 'scripts/benchmark.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('Golden Files 目录存在', () => {
    const dirPath = join(process.cwd(), 'tests/golden');
    expect(existsSync(dirPath)).toBe(true);
  });
});

// Level 2: 结构检查
describe('[L2] 集成测试覆盖', () => {
  test('测试完整分析流程', () => {
    const filePath = join(process.cwd(), 'tests/integration/orchestrator.test.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/analyze.*orchestrate.*fuse|full.*flow/);
  });

  test('测试多工具回退', () => {
    const filePath = join(process.cwd(), 'tests/integration/orchestrator.test.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/fallback|CodeMap.*ast-grep.*rg/);
  });

  test('测试置信度计算', () => {
    const filePath = join(process.cwd(), 'tests/integration/orchestrator.test.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/confidence|score/);
  });
});

// Level 3: 模式检查
describe('[L3] 基准验证实现', () => {
  test('执行 30 条查询', () => {
    const filePath = join(process.cwd(), 'scripts/benchmark.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/30/);
  });

  test('计算 Hit@8 指标', () => {
    const filePath = join(process.cwd(), 'scripts/benchmark.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/Hit@8|hit.*8/);
  });

  test('统计 Token 消耗', () => {
    const filePath = join(process.cwd(), 'scripts/benchmark.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/token|Token/);
  });
});

// Level 4: 负面检查
describe('[L4] 不应该出现反模式', () => {
  test('不应该使用自定义查询代替基准查询', () => {
    const filePath = join(process.cwd(), 'scripts/benchmark.ts');
    const content = readFileSync(filePath, 'utf-8');
    // 应该引用项目定义的基准查询
    expect(content).toMatch(/refer.*benchmark|benchmark.*query/);
  });

  test('Token 统计应使用 cl100k_base', () => {
    const filePath = join(process.cwd(), 'scripts/benchmark.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/cl100k|encoding/);
  });
});
