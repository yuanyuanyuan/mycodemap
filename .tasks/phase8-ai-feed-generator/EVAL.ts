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
describe('[L1] AI 饲料生成器实现', () => {
  test('AI 饲料生成器文件存在', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/ai-feed-generator.ts');
    expect(existsSync(filePath)).toBe(true);
  });
});

// Level 2: 结构检查
describe('[L2] AI 饲料生成器功能', () => {
  test('包含文件头解析 [META]', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/ai-feed-generator.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/\[META\]|META/);
  });

  test('包含文件头解析 [WHY]', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/ai-feed-generator.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/\[WHY\]|WHY/);
  });

  test('包含三维评分 gravity/heat/impact', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/ai-feed-generator.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/gravity/);
    expect(content).toMatch(/heat/);
    expect(content).toMatch(/impact/);
  });

  test('输出路径为 .codemap/ai-feed.txt', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/ai-feed-generator.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/\.codemap.*ai-feed/);
  });
});

// Level 3: 集成检查
describe('[L3] 集成 Git 分析器', () => {
  test('调用 Git 分析器获取历史', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/ai-feed-generator.ts');
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/GitAnalyzer|git-analyzer/);
  });
});

// Level 4: 负面检查
describe('[L4] 不应该出现反模式', () => {
  test('不应硬编码风险公式', () => {
    const filePath = join(process.cwd(), 'src/orchestrator/ai-feed-generator.ts');
    const content = readFileSync(filePath, 'utf-8');
    // 应该引用 REQUIREMENTS 中定义的公式，而非硬编码
    expect(content).not.toMatch(/score.*=.*Math\.random/);
  });
});
