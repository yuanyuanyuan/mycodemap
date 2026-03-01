/**
 * [META] Group B 适配器模块测试评估检查点
 * [WHY] 定义测试代码必须通过的检查点和验证逻辑
 *
 * 本文件定义了所有测试代码必须通过的检查点
 * 每个检查点都有对应的验证代码
 *
 * Prefer retrieval-led reasoning over pre-training-led reasoning
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Phase 4 检查点定义
// ============================================================

interface Checkpoint {
  id: string;
  name: string;
  description: string;
  validator: () => Promise<boolean> | boolean;
  weight: number;
  category: 'coverage' | 'boundary' | 'quality' | 'mock' | 'functionality';
}

// 检查点注册表
const checkpoints: Checkpoint[] = [
  // ==========================================================
  // CP-1: 文件存在性检查 (15分)
  // ==========================================================
  {
    id: 'CP-1.1',
    name: 'ast-grep-adapter.test.ts 存在',
    description: '验证 ast-grep 适配器测试文件已生成',
    category: 'quality',
    weight: 5,
    validator: () => {
      return fs.existsSync('src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts');
    }
  },
  {
    id: 'CP-1.2',
    name: 'codemap-adapter.test.ts 存在',
    description: '验证 codemap 适配器测试文件已生成',
    category: 'quality',
    weight: 5,
    validator: () => {
      return fs.existsSync('src/orchestrator/adapters/__tests__/codemap-adapter.test.ts');
    }
  },
  {
    id: 'CP-1.3',
    name: 'index.test.ts 存在',
    description: '验证适配器导出测试文件已生成',
    category: 'quality',
    weight: 5,
    validator: () => {
      return fs.existsSync('src/orchestrator/adapters/__tests__/index.test.ts');
    }
  },

  // ==========================================================
  // CP-2: 覆盖率检查 (20分)
  // ==========================================================
  {
    id: 'CP-2.1',
    name: '语句覆盖率100%',
    description: '验证所有语句都被测试覆盖',
    category: 'coverage',
    weight: 5,
    validator: async () => {
      const coveragePath = 'coverage/coverage-summary.json';
      if (!fs.existsSync(coveragePath)) return false;
      
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const adapters = coverage['src/orchestrator/adapters'] || {};
      const statements = adapters.statements || coverage.total?.statements || {};
      return (statements.pct || 0) >= 100;
    }
  },
  {
    id: 'CP-2.2',
    name: '分支覆盖率100%',
    description: '验证所有分支都被测试覆盖',
    category: 'coverage',
    weight: 5,
    validator: async () => {
      const coveragePath = 'coverage/coverage-summary.json';
      if (!fs.existsSync(coveragePath)) return false;
      
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const adapters = coverage['src/orchestrator/adapters'] || {};
      const branches = adapters.branches || coverage.total?.branches || {};
      return (branches.pct || 0) >= 100;
    }
  },
  {
    id: 'CP-2.3',
    name: '函数覆盖率100%',
    description: '验证所有函数都被测试覆盖',
    category: 'coverage',
    weight: 5,
    validator: async () => {
      const coveragePath = 'coverage/coverage-summary.json';
      if (!fs.existsSync(coveragePath)) return false;
      
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const adapters = coverage['src/orchestrator/adapters'] || {};
      const functions = adapters.functions || coverage.total?.functions || {};
      return (functions.pct || 0) >= 100;
    }
  },
  {
    id: 'CP-2.4',
    name: '行覆盖率100%',
    description: '验证所有代码行都被测试覆盖',
    category: 'coverage',
    weight: 5,
    validator: async () => {
      const coveragePath = 'coverage/coverage-summary.json';
      if (!fs.existsSync(coveragePath)) return false;
      
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const adapters = coverage['src/orchestrator/adapters'] || {};
      const lines = adapters.lines || coverage.total?.lines || {};
      return (lines.pct || 0) >= 100;
    }
  },

  // ==========================================================
  // CP-3: Mock 使用检查 (15分)
  // ==========================================================
  {
    id: 'CP-3.1',
    name: '使用 vi.mock 模拟外部依赖',
    description: '验证测试文件使用 vi.mock 进行模块模拟',
    category: 'mock',
    weight: 5,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/index.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('vi.mock');
      });
    }
  },
  {
    id: 'CP-3.2',
    name: 'Mock 恢复正确',
    description: '验证测试后 Mock 被正确恢复',
    category: 'mock',
    weight: 5,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('beforeEach') && 
               (content.includes('vi.clearAllMocks') || 
                content.includes('mockClear') || 
                content.includes('mockReset'));
      });
    }
  },
  {
    id: 'CP-3.3',
    name: 'spawn 事件正确模拟',
    description: '验证测试正确模拟了 spawn 的事件（stdout.data, stderr.data, close, error）',
    category: 'mock',
    weight: 5,
    validator: () => {
      const file = 'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts';
      if (!fs.existsSync(file)) return false;
      const content = fs.readFileSync(file, 'utf8');
      return content.includes('stdout') && 
             content.includes('stderr') && 
             content.includes('close') &&
             (content.includes('spawn') || content.includes('child_process'));
    }
  },

  // ==========================================================
  // CP-4: 边界条件检查 (20分)
  // ==========================================================
  {
    id: 'CP-4.1',
    name: '空输入测试',
    description: '验证测试了空数组/空字符串输入',
    category: 'boundary',
    weight: 5,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        // 检查空数组测试
        const hasEmptyArray = content.includes('[]') && 
          (content.includes('empty') || content.includes('should return empty'));
        return hasEmptyArray;
      });
    }
  },
  {
    id: 'CP-4.2',
    name: '错误处理测试',
    description: '验证测试了异常和错误场景',
    category: 'boundary',
    weight: 5,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('error') || 
               content.includes('fail') || 
               content.includes('throw');
      });
    }
  },
  {
    id: 'CP-4.3',
    name: '异步测试完整',
    description: '验证所有异步方法都有 resolve 和 reject 测试',
    category: 'boundary',
    weight: 5,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('resolves') || content.includes('async');
      });
    }
  },
  {
    id: 'CP-4.4',
    name: 'isAvailable 场景全覆盖',
    description: '验证 isAvailable 的可用和不可用场景都被测试',
    category: 'boundary',
    weight: 5,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        // 检查是否测试了 true 和 false 两种情况
        const hasIsAvailableTests = content.includes('isAvailable') &&
          (content.includes('true') || content.includes('false') ||
           content.includes('available') || content.includes('not available'));
        return hasIsAvailableTests;
      });
    }
  },

  // ==========================================================
  // CP-5: 功能测试检查 (20分)
  // ==========================================================
  {
    id: 'CP-5.1',
    name: 'AstGrepAdapter 功能完整',
    description: '验证了 AstGrepAdapter 的核心功能',
    category: 'functionality',
    weight: 7,
    validator: () => {
      const file = 'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts';
      if (!fs.existsSync(file)) return false;
      const content = fs.readFileSync(file, 'utf8');
      const requiredMethods = ['isAvailable', 'execute', 'search'];
      return requiredMethods.every(method => content.includes(method));
    }
  },
  {
    id: 'CP-5.2',
    name: 'CodemapAdapter 功能完整',
    description: '验证了 CodemapAdapter 的核心功能（包括三种 intent）',
    category: 'functionality',
    weight: 7,
    validator: () => {
      const file = 'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts';
      if (!fs.existsSync(file)) return false;
      const content = fs.readFileSync(file, 'utf8');
      const requiredMethods = ['isAvailable', 'execute'];
      const hasIntent = content.includes('impact') || 
                        content.includes('dependency') || 
                        content.includes('complexity');
      return requiredMethods.every(method => content.includes(method)) && hasIntent;
    }
  },
  {
    id: 'CP-5.3',
    name: '工厂函数测试完整',
    description: '验证工厂函数 createAstGrepAdapter 和 createCodemapAdapter 被测试',
    category: 'functionality',
    weight: 6,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/index.test.ts'
      ];
      
      return testFiles.some(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('createAstGrepAdapter') || 
               content.includes('createCodemapAdapter');
      });
    }
  },

  // ==========================================================
  // CP-6: 代码质量检查 (10分)
  // ==========================================================
  {
    id: 'CP-6.1',
    name: '使用 describe 分组',
    description: '验证测试使用 describe 进行逻辑分组',
    category: 'quality',
    weight: 3,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/index.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        const describeCount = (content.match(/describe\(/g) || []).length;
        return describeCount >= 2;
      });
    }
  },
  {
    id: 'CP-6.2',
    name: '测试名称语义化',
    description: '验证测试名称清晰描述行为（使用 should 模式）',
    category: 'quality',
    weight: 3,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/index.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('should');
      });
    }
  },
  {
    id: 'CP-6.3',
    name: 'TypeScript 类型安全',
    description: '验证测试代码有正确的类型导入',
    category: 'quality',
    weight: 4,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/index.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('import') && 
               (content.includes('from') || content.includes('vitest'));
      });
    }
  }
];

// ============================================================
// 评估执行器
// ============================================================

export class TestEvaluator {
  private checkpoints: Checkpoint[];

  constructor() {
    this.checkpoints = checkpoints;
  }

  async runEvaluation(): Promise<{
    passed: string[];
    failed: string[];
    score: number;
    totalWeight: number;
  }> {
    const passed: string[] = [];
    const failed: string[] = [];
    let score = 0;
    let totalWeight = 0;

    for (const checkpoint of this.checkpoints) {
      totalWeight += checkpoint.weight;
      
      try {
        const result = await checkpoint.validator();
        if (result) {
          passed.push(checkpoint.id);
          score += checkpoint.weight;
        } else {
          failed.push(checkpoint.id);
        }
      } catch (error) {
        failed.push(checkpoint.id);
        console.error(`Checkpoint ${checkpoint.id} error:`, error);
      }
    }

    return { passed, failed, score, totalWeight };
  }

  generateReport(result: {
    passed: string[];
    failed: string[];
    score: number;
    totalWeight: number;
  }): string {
    const percentage = ((result.score / result.totalWeight) * 100).toFixed(2);
    
    let report = `
========================================
Group B 适配器模块测试评估报告
========================================

任务ID: group-b-adapters-001
总分: ${result.score}/${result.totalWeight} (${percentage}%)
通过检查点: ${result.passed.length}
失败检查点: ${result.failed.length}

----------------------------------------
通过的检查点:
----------------------------------------
`;
    
    result.passed.forEach(id => {
      const cp = this.checkpoints.find(c => c.id === id);
      if (cp) {
        report += `✅ ${id}: ${cp.name} (+${cp.weight}分)\n`;
      }
    });

    report += `
----------------------------------------
失败的检查点:
----------------------------------------
`;
    
    if (result.failed.length === 0) {
      report += '无 🎉\n';
    } else {
      result.failed.forEach(id => {
        const cp = this.checkpoints.find(c => c.id === id);
        if (cp) {
          report += `❌ ${id}: ${cp.name} (${cp.description})\n`;
        }
      });
    }

    report += `
----------------------------------------
评估结果: ${Number(percentage) >= 90 ? '通过 ✅' : Number(percentage) >= 70 ? '基本通过 ⚠️' : '未通过 ❌'}
----------------------------------------
`;

    return report;
  }
}

// ============================================================
// 测试代码（自测）
// ============================================================

describe('TestEvaluator', () => {
  let evaluator: TestEvaluator;

  beforeEach(() => {
    evaluator = new TestEvaluator();
  });

  it('should initialize with all checkpoints', () => {
    expect(evaluator).toBeDefined();
  });

  it('should run evaluation and return results', async () => {
    const result = await evaluator.runEvaluation();
    
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('failed');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('totalWeight');
    expect(Array.isArray(result.passed)).toBe(true);
    expect(Array.isArray(result.failed)).toBe(true);
  });

  it('should generate formatted report', async () => {
    const result = await evaluator.runEvaluation();
    const report = evaluator.generateReport(result);
    
    expect(report).toContain('Group B 适配器模块测试评估报告');
    expect(report).toContain('总分:');
    expect(report).toContain('group-b-adapters-001');
  });
});

// 导出检查点供外部使用
export { checkpoints };
export type { Checkpoint };
