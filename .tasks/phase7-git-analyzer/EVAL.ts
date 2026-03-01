import { expect, test, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Level 0: 项目约定检查
describe('[L0] 代码应遵循项目的架构约定', () => {
  test('应使用项目的 TypeScript 严格模式', () => {
    const tsconfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions?.strict).toBe(true);
  });
});

// Level 1: 存在性检查
describe('[L1] Git 分析器实现', () => {
  test('Git 分析器文件存在', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/git-analyzer.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  test('HeatScore 接口已扩展', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/types.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/HeatScore/);
  });
});

// Level 2: 结构检查
describe('[L2] Git 分析器功能', () => {
  test('包含 freq30d 计算', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/git-analyzer.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/freq30d/);
  });

  test('包含风险评级计算', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/git-analyzer.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/risk.*level|riskLevel/);
  });

  test('支持 lastType 分析', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/git-analyzer.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/lastType/);
  });
});

// Level 3: 模式检查
describe('[L3] 错误处理', () => {
  test('处理非 Git 仓库情况', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/git-analyzer.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/\.git|git.*directory/);
  });
});

// Level 4: 负面检查
describe('[L4] 不应该出现反模式', () => {
  test('不应该直接调用外部 Git CLI', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/git-analyzer.ts');
    const content = readFileSync(filePath, 'utf-8');
    // 检查是否使用 exec 或 spawn 调用 git
    const hasRawExec = content.match(/exec\(|spawn\(/);
    expect(hasRawExec).toBeFalsy();
  });
});
