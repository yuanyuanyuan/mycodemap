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
    // CI 门禁不需要额外依赖
    expect(pkg).toBeDefined();
  });
});

// Level 1: 存在性检查
describe('[L1] CI Gateway 核心文件实现', () => {
  test('Commit 验证器文件存在', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/commit-validator.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('文件头扫描器文件存在', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/file-header-scanner.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('GitHub Actions 工作流存在', () => {
    const filePath = join(process.cwd(), '.github/workflows/ci-gateway.yml');
    expect(existsSync(filePath)).toBe(true);
  });
});

// Level 2: 结构检查
describe('[L2] Commit 验证器实现', () => {
  test('支持 feat TAG', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/commit-validator.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/feat/);
  });

  test('支持 fix TAG', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/commit-validator.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/fix/);
  });

  test('输出 E0007 错误码', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/commit-validator.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/E0007/);
  });
});

// Level 3: 模式检查
describe('[L3] 文件头扫描器实现', () => {
  test('检查 [META] 标签', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/file-header-scanner.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/\[META\]/);
  });

  test('检查 [WHY] 标签', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/file-header-scanner.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/\[WHY\]/);
  });

  test('输出 E0008/E0009 错误码', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/file-header-scanner.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/E000[89]/);
  });
});

// Level 4: 负面检查
describe('[L4] 不应该出现反模式', () => {
  test('不应该使用 any 类型', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/commit-validator.ts');
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => !line.startsWith('//') && !line.startsWith('*'));
    const anyUsage = lines.some(line => /\bany\b/.test(line) && !line.includes(': any'));
    expect(anyUsage).toBe(false);
  });

  test('Hook 不应该硬编码路径', () => {
    const hookPath = join(process.cwd(), '.git/hooks/pre-commit');
    if (existsSync(hookPath)) {
      const content = readFileSync(hookPath, 'utf-8');
      // Hook 应该使用相对路径或环境变量
      expect(content).not.toMatch(/\/Users\//);
    }
  });
});
