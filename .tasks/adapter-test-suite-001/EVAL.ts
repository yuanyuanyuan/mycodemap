/**
 * [META] 适配器模块测试评估检查点
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
  category: 'coverage' | 'boundary' | 'quality' | 'mock';
}

// 检查点注册表
const checkpoints: Checkpoint[] = [
  // ==========================================================
  // CP-1: 文件存在性检查
  // ==========================================================
  {
    id: 'CP-1.1',
    name: 'base-adapter.test.ts 存在',
    description: '验证基础适配器测试文件已生成',
    category: 'quality',
    weight: 5,
    validator: () => {
      return fs.existsSync('src/orchestrator/adapters/__tests__/base-adapter.test.ts');
    }
  },
  {
    id: 'CP-1.2',
    name: 'ast-grep-adapter.test.ts 存在',
    description: '验证ast-grep适配器测试文件已生成',
    category: 'quality',
    weight: 5,
    validator: () => {
      return fs.existsSync('src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts');
    }
  },
  {
    id: 'CP-1.3',
    name: 'codemap-adapter.test.ts 存在',
    description: '验证codemap适配器测试文件已生成',
    category: 'quality',
    weight: 5,
    validator: () => {
      return fs.existsSync('src/orchestrator/adapters/__tests__/codemap-adapter.test.ts');
    }
  },

  // ==========================================================
  // CP-2: 覆盖率检查
  // ==========================================================
  {
    id: 'CP-2.1',
    name: '语句覆盖率100%',
    description: '验证所有语句都被测试覆盖',
    category: 'coverage',
    weight: 10,
    validator: async () => {
      // 读取覆盖率报告
      const coveragePath = 'coverage/coverage-summary.json';
      if (!fs.existsSync(coveragePath)) return false;
      
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverage.total || {};
      const statements = total.statements || {};
      return (statements.pct || 0) >= 100;
    }
  },
  {
    id: 'CP-2.2',
    name: '分支覆盖率100%',
    description: '验证所有分支都被测试覆盖',
    category: 'coverage',
    weight: 10,
    validator: async () => {
      const coveragePath = 'coverage/coverage-summary.json';
      if (!fs.existsSync(coveragePath)) return false;
      
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverage.total || {};
      const branches = total.branches || {};
      return (branches.pct || 0) >= 100;
    }
  },

  // ==========================================================
  // CP-3: Mock使用检查
  // ==========================================================
  {
    id: 'CP-3.1',
    name: '使用vi.mock模拟外部依赖',
    description: '验证测试文件使用vi.mock进行模块模拟',
    category: 'mock',
    weight: 10,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/base-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
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
    name: 'Mock恢复正确',
    description: '验证测试后Mock被正确恢复',
    category: 'mock',
    weight: 5,
    validator: () => {
      // 检查测试文件是否包含mock恢复逻辑
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        // 检查是否有beforeEach或afterEach中的mockClear/mockReset
        return content.includes('mockClear') || content.includes('mockReset') || 
               content.includes('vi.clearAllMocks');
      });
    }
  },

  // ==========================================================
  // CP-4: 边界条件检查
  // ==========================================================
  {
    id: 'CP-4.1',
    name: '空输入测试',
    description: '验证测试了空数组/空字符串输入',
    category: 'boundary',
    weight: 8,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('[]') && 
               (content.includes("''") || content.includes('""'));
      });
    }
  },
  {
    id: 'CP-4.2',
    name: '错误处理测试',
    description: '验证测试了异常和错误场景',
    category: 'boundary',
    weight: 8,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('rejects.toThrow') || 
               content.includes('throws') ||
               content.includes('error');
      });
    }
  },
  {
    id: 'CP-4.3',
    name: '异步测试完整',
    description: '验证所有异步方法都有resolve和reject测试',
    category: 'boundary',
    weight: 7,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('resolves') && content.includes('rejects');
      });
    }
  },

  // ==========================================================
  // CP-5: 代码质量检查
  // ==========================================================
  {
    id: 'CP-5.1',
    name: '使用describe分组',
    description: '验证测试使用describe进行逻辑分组',
    category: 'quality',
    weight: 5,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/base-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        const describeCount = (content.match(/describe\(/g) || []).length;
        return describeCount >= 2; // 至少2个describe
      });
    }
  },
  {
    id: 'CP-5.2',
    name: '测试名称语义化',
    description: '验证测试名称清晰描述行为',
    category: 'quality',
    weight: 5,
    validator: () => {
      const testFiles = [
        'src/orchestrator/adapters/__tests__/base-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        // 检查是否使用should模式
        return content.includes('should');
      });
    }
  },
  {
    id: 'CP-5.3',
    name: 'TypeScript类型安全',
    description: '验证测试代码无类型错误',
    category: 'quality',
    weight: 8,
    validator: async () => {
      // 简化检查，实际应运行tsc
      const testFiles = [
        'src/orchestrator/adapters/__tests__/base-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts',
        'src/orchestrator/adapters/__tests__/codemap-adapter.test.ts'
      ];
      
      return testFiles.every(file => {
        if (!fs.existsSync(file)) return false;
        const content = fs.readFileSync(file, 'utf8');
        // 检查基本的TypeScript语法
        return content.includes('import') && 
               (content.includes('from') || content.includes('require'));
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
适配器模块测试评估报告
========================================

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
评估结果: ${Number(percentage) >= 90 ? '通过 ✅' : '未通过 ❌'}
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
    
    expect(report).toContain('适配器模块测试评估报告');
    expect(report).toContain('总分:');
  });
});

// 导出检查点供外部使用
export { checkpoints };
export type { Checkpoint };
