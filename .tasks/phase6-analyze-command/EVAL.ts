import { expect, test, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Level 0: 项目约定检查
describe('[L0] 代码应遵循项目的架构约定', () => {
  test('应使用项目的 TypeScript 严格模式', () => {
    const tsconfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions?.strict).toBe(true);
  });

  test('应使用项目现有的依赖', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    expect(pkg.dependencies?.['commander'] || pkg.devDependencies?.['commander']).toBeTruthy();
  });
});

// Level 1: 存在性检查
describe('[L1] AnalyzeCommand 和测试关联器实现', () => {
  test('AnalyzeCommand 文件存在', () => {
    const filePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('测试关联器文件存在', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/test-linker.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('命令已在 CLI 中注册', () => {
    const indexPath = join(process.cwd(), 'src/cli/index.ts');
    const content = readFileSync(indexPath, 'utf-8');
    expect(content).toMatch(/analyze/);
  });
});

// Level 2: 结构检查
describe('[L2] 参数契约完整', () => {
  test('AnalyzeCommand 包含 intent 参数', () => {
    const filePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/intent.*impact.*dependency.*search/);
  });

  test('AnalyzeCommand 包含 topK 参数', () => {
    const filePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/topK/);
  });

  test('测试关联器包含 Jest/Vitest 配置解析', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/test-linker.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/jest|vitest|testMatch|testRegex/);
  });
});

// Level 3: 模式检查
describe('[L3] 错误码系统实现', () => {
  test('包含 E0001 无效 intent', () => {
    const filePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/E0001/);
  });

  test('包含 E0006 置信度过低', () => {
    const filePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/E0006/);
  });

  test('outputMode 区分 machine/human', () => {
    const filePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/outputMode.*machine.*human/);
  });
});

// Level 4: 负面检查
describe('[L4] 不应该出现反模式', () => {
  test('不应该使用 any 类型', () => {
    const filePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
    const content = readFileSync(filePath, 'utf-8');
    // 允许注释中出现 any
    const lines = content.split('\n').filter(line => !line.startsWith('//') && !line.startsWith('*'));
    const anyUsage = lines.some(line => /\bany\b/.test(line) && !line.includes(': any'));
    expect(anyUsage).toBe(false);
  });

  test('machine 模式不应有额外日志输出', () => {
    const filePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
    const content = readFileSync(filePath, 'utf-8');
    // 检查是否有条件日志输出逻辑
    expect(content).toMatch(/outputMode.*machine.*console\.log|json.*outputMode/);
  });
});
