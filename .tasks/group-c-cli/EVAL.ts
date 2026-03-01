/**
 * [META] CLI命令模块测试评估标准
 * [WHY] 定义分层检查点和自动化测试代码
 */

import { expect, describe, it } from 'vitest';

// ============================================
// Phase 1: 测试文件结构检查 (20分)
// ============================================

describe('Phase 1: 测试文件结构检查', () => {
  const requiredTestFiles = [
    'src/cli/commands/__tests__/complexity.test.ts',
    'src/cli/commands/__tests__/cycles.test.ts',
    'src/cli/commands/__tests__/generate.test.ts',
    'src/cli/commands/__tests__/init.test.ts',
    'src/cli/commands/__tests__/query.test.ts',
    'src/cli/commands/__tests__/watch.test.ts',
    'src/cli/commands/__tests__/watch-foreground.test.ts',
    'src/cli/commands/__tests__/workflow.test.ts',
  ];

  it.each(requiredTestFiles)('应存在测试文件: %s', (filePath) => {
    const fs = require('fs');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it.each(requiredTestFiles)('测试文件应包含[META]注释: %s', (filePath) => {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('[META]');
    expect(content).toContain('[WHY]');
  });

  it.each(requiredTestFiles)('测试文件应使用vitest导入: %s', (filePath) => {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("from 'vitest'");
    expect(content).toContain('describe(');
    expect(content).toContain('it(');
  });
});

// ============================================
// Phase 2: 测试覆盖率检查 (25分)
// ============================================

describe('Phase 2: 测试覆盖率检查', () => {
  const targetFiles = [
    'src/cli/commands/complexity.ts',
    'src/cli/commands/cycles.ts',
    'src/cli/commands/generate.ts',
    'src/cli/commands/init.ts',
    'src/cli/commands/query.ts',
    'src/cli/commands/watch.ts',
    'src/cli/commands/watch-foreground.ts',
    'src/cli/commands/workflow.ts',
  ];

  it('应达到100%语句覆盖率', () => {
    const coverageData = require('../../../coverage/coverage-summary.json');
    
    for (const file of targetFiles) {
      const fileCoverage = coverageData[file];
      expect(fileCoverage).toBeDefined();
      expect(fileCoverage.statements.pct).toBe(100);
    }
  });

  it('应达到100%分支覆盖率', () => {
    const coverageData = require('../../../coverage/coverage-summary.json');
    
    for (const file of targetFiles) {
      const fileCoverage = coverageData[file];
      expect(fileCoverage).toBeDefined();
      expect(fileCoverage.branches.pct).toBe(100);
    }
  });

  it('应达到100%函数覆盖率', () => {
    const coverageData = require('../../../coverage/coverage-summary.json');
    
    for (const file of targetFiles) {
      const fileCoverage = coverageData[file];
      expect(fileCoverage).toBeDefined();
      expect(fileCoverage.functions.pct).toBe(100);
    }
  });

  it('应达到100%行覆盖率', () => {
    const coverageData = require('../../../coverage/coverage-summary.json');
    
    for (const file of targetFiles) {
      const fileCoverage = coverageData[file];
      expect(fileCoverage).toBeDefined();
      expect(fileCoverage.lines.pct).toBe(100);
    }
  });
});

// ============================================
// Phase 3: 模拟策略检查 (15分)
// ============================================

describe('Phase 3: 模拟策略检查', () => {
  const testFiles = [
    'src/cli/commands/__tests__/complexity.test.ts',
    'src/cli/commands/__tests__/cycles.test.ts',
    'src/cli/commands/__tests__/generate.test.ts',
    'src/cli/commands/__tests__/init.test.ts',
    'src/cli/commands/__tests__/query.test.ts',
    'src/cli/commands/__tests__/watch.test.ts',
    'src/cli/commands/__tests__/watch-foreground.test.ts',
    'src/cli/commands/__tests__/workflow.test.ts',
  ];

  it.each(testFiles)('应mock console.log/error: %s', (filePath) => {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/vi\.spyOn\(console,\s*['"]log['"]\)/);
    expect(content).toMatch(/vi\.spyOn\(console,\s*['"]error['"]\)/);
  });

  it.each(testFiles)('应mock process.exit: %s', (filePath) => {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/vi\.spyOn\(process,\s*['"]exit['"]\)/);
  });

  it.each(testFiles)('应使用vi.mock: %s', (filePath) => {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/vi\.mock\(/);
  });

  it.each(testFiles)('应使用beforeEach/afterEach: %s', (filePath) => {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('beforeEach(');
    expect(content).toContain('afterEach(');
  });
});

// ============================================
// Phase 4: 功能测试检查 (30分)
// ============================================

describe('Phase 4: 功能测试检查', () => {
  it('complexity.test.ts 应测试ComplexityCommand类', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/complexity.test.ts', 'utf-8');
    expect(content).toContain('ComplexityCommand');
    expect(content).toContain('run(');
    expect(content).toContain('runEnhanced(');
  });

  it('complexity.test.ts 应测试complexityCommand函数', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/complexity.test.ts', 'utf-8');
    expect(content).toContain('complexityCommand');
  });

  it('cycles.test.ts 应测试cyclesCommand函数', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/cycles.test.ts', 'utf-8');
    expect(content).toContain('cyclesCommand');
  });

  it('generate.test.ts 应测试generateCommand函数', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/generate.test.ts', 'utf-8');
    expect(content).toContain('generateCommand');
  });

  it('init.test.ts 应测试initCommand函数', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/init.test.ts', 'utf-8');
    expect(content).toContain('initCommand');
  });

  it('query.test.ts 应测试queryCommand函数', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/query.test.ts', 'utf-8');
    expect(content).toContain('queryCommand');
  });

  it('watch.test.ts 应测试watchCommand函数', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/watch.test.ts', 'utf-8');
    expect(content).toContain('watchCommand');
  });

  it('watch-foreground.test.ts 应测试watchCommandForeground函数', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/watch-foreground.test.ts', 'utf-8');
    expect(content).toContain('watchCommandForeground');
  });

  it('workflow.test.ts 应测试所有子命令', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/workflow.test.ts', 'utf-8');
    expect(content).toContain('start');
    expect(content).toContain('status');
    expect(content).toContain('proceed');
    expect(content).toContain('resume');
    expect(content).toContain('checkpoint');
    expect(content).toContain('list');
    expect(content).toContain('delete');
  });

  it('所有测试文件应包含错误场景测试', () => {
    const testFiles = [
      'src/cli/commands/__tests__/complexity.test.ts',
      'src/cli/commands/__tests__/cycles.test.ts',
      'src/cli/commands/__tests__/generate.test.ts',
      'src/cli/commands/__tests__/init.test.ts',
      'src/cli/commands/__tests__/query.test.ts',
      'src/cli/commands/__tests__/watch.test.ts',
      'src/cli/commands/__tests__/watch-foreground.test.ts',
      'src/cli/commands/__tests__/workflow.test.ts',
    ];

    for (const file of testFiles) {
      const fs = require('fs');
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toMatch(/error|Error|reject|throw/i);
    }
  });
});

// ============================================
// Phase 5: 代码规范检查 (10分)
// ============================================

describe('Phase 5: 代码规范检查', () => {
  it('所有测试文件应使用TypeScript类型', () => {
    const testFiles = [
      'src/cli/commands/__tests__/complexity.test.ts',
      'src/cli/commands/__tests__/cycles.test.ts',
      'src/cli/commands/__tests__/generate.test.ts',
      'src/cli/commands/__tests__/init.test.ts',
      'src/cli/commands/__tests__/query.test.ts',
      'src/cli/commands/__tests__/watch.test.ts',
      'src/cli/commands/__tests__/watch-foreground.test.ts',
      'src/cli/commands/__tests__/workflow.test.ts',
    ];

    for (const file of testFiles) {
      const fs = require('fs');
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toContain('type Mock');
    }
  });

  it('测试文件应正确导入被测模块', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/cli/commands/__tests__/complexity.test.ts', 'utf-8');
    expect(content).toContain("from '../complexity.js'");
  });
});

// ============================================
// 评估执行命令
// ============================================

export const evaluationCommands = {
  // 运行所有测试
  runTests: 'npx vitest run src/cli/commands/__tests__',
  
  // 运行覆盖率检查
  runCoverage: 'npx vitest run --coverage src/cli/commands',
  
  // 运行特定测试文件
  runComplexityTest: 'npx vitest run src/cli/commands/__tests__/complexity.test.ts',
  runCyclesTest: 'npx vitest run src/cli/commands/__tests__/cycles.test.ts',
  runGenerateTest: 'npx vitest run src/cli/commands/__tests__/generate.test.ts',
  runInitTest: 'npx vitest run src/cli/commands/__tests__/init.test.ts',
  runQueryTest: 'npx vitest run src/cli/commands/__tests__/query.test.ts',
  runWatchTest: 'npx vitest run src/cli/commands/__tests__/watch.test.ts',
  runWatchForegroundTest: 'npx vitest run src/cli/commands/__tests__/watch-foreground.test.ts',
  runWorkflowTest: 'npx vitest run src/cli/commands/__tests__/workflow.test.ts',
  
  // 类型检查
  typeCheck: 'npx tsc --noEmit',
};

// ============================================
// 评分计算
// ============================================

export interface EvaluationResult {
  phase1: number; // 文件结构 (20分)
  phase2: number; // 覆盖率 (25分)
  phase3: number; // 模拟策略 (15分)
  phase4: number; // 功能测试 (30分)
  phase5: number; // 代码规范 (10分)
  total: number;
}

export function calculateScore(results: EvaluationResult): number {
  return results.phase1 + results.phase2 + results.phase3 + results.phase4 + results.phase5;
}
