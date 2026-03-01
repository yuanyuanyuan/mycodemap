/**
 * [META] 工作流编排器模块测试评估检查点
 * [WHY] 自动化验证测试质量和覆盖率
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

interface EvalReport {
  total: number;
  passed: number;
  failed: number;
  results: CheckResult[];
}

// ============================================
// 检查点定义
// ============================================

const CHECKPOINTS = {
  // Phase 1: 文件结构检查
  'file-structure': [
    {
      name: 'workflow-orchestrator.test.ts 存在',
      check: () => existsSync(join(process.cwd(), 'src/orchestrator/workflow/__tests__/workflow-orchestrator.test.ts'))
    },
    {
      name: 'workflow-context.test.ts 存在',
      check: () => existsSync(join(process.cwd(), 'src/orchestrator/workflow/__tests__/workflow-context.test.ts'))
    },
    {
      name: 'workflow-persistence.test.ts 存在',
      check: () => existsSync(join(process.cwd(), 'src/orchestrator/workflow/__tests__/workflow-persistence.test.ts'))
    },
    {
      name: 'phase-checkpoint.test.ts 存在',
      check: () => existsSync(join(process.cwd(), 'src/orchestrator/workflow/__tests__/phase-checkpoint.test.ts'))
    },
    {
      name: 'config.test.ts 存在',
      check: () => existsSync(join(process.cwd(), 'src/orchestrator/workflow/__tests__/config.test.ts'))
    }
  ],

  // Phase 2: 内容检查（需要读取文件内容）
  'content-validation': [
    {
      name: '使用 vi.mock 模拟 fs',
      check: (content: string) => content.includes("vi.mock('node:fs')") || content.includes('vi.mock("node:fs")')
    },
    {
      name: '使用 describe 组织测试',
      check: (content: string) => content.includes('describe(')
    },
    {
      name: '使用 it 或 test 定义用例',
      check: (content: string) => content.includes('it(') || content.includes('test(')
    },
    {
      name: '使用 beforeEach 重置状态',
      check: (content: string) => content.includes('beforeEach(')
    },
    {
      name: '有 expect 断言',
      check: (content: string) => content.includes('expect(')
    }
  ],

  // Phase 3: 特定模块检查
  'module-specific': {
    'workflow-orchestrator': [
      { name: '测试 start 方法', check: (c: string) => /describe.*start|it.*start|test.*start/.test(c) },
      { name: '测试 executeCurrentPhase 方法', check: (c: string) => /executeCurrentPhase/.test(c) },
      { name: '测试 proceedToNextPhase 方法', check: (c: string) => /proceedToNextPhase/.test(c) },
      { name: '测试 getStatus 方法', check: (c: string) => /getStatus/.test(c) },
      { name: '测试状态转换', check: (c: string) => /pending|running|completed|verified/.test(c) }
    ],
    'workflow-context': [
      { name: '测试 WorkflowContextFactory', check: (c: string) => /WorkflowContextFactory/.test(c) },
      { name: '测试 WorkflowContextValidator', check: (c: string) => /WorkflowContextValidator/.test(c) },
      { name: '测试 canProceed', check: (c: string) => /canProceed/.test(c) },
      { name: '测试 isValidStatusTransition', check: (c: string) => /isValidStatusTransition/.test(c) },
      { name: '测试 Map/Set 序列化', check: (c: string) => /Map|Set/.test(c) }
    ],
    'workflow-persistence': [
      { name: '测试 save 方法', check: (c: string) => /describe.*save|it.*save/.test(c) },
      { name: '测试 load 方法', check: (c: string) => /describe.*load|it.*load/.test(c) },
      { name: '测试 loadActive 方法', check: (c: string) => /loadActive/.test(c) },
      { name: '测试 list 方法', check: (c: string) => /describe.*list|it.*list/.test(c) },
      { name: '测试 delete 方法', check: (c: string) => /describe.*delete|it.*delete/.test(c) }
    ],
    'phase-checkpoint': [
      { name: '测试 validate 方法', check: (c: string) => /describe.*validate|it.*validate/.test(c) },
      { name: '测试 validateAll 方法', check: (c: string) => /validateAll/.test(c) },
      { name: '测试 getSummary 方法', check: (c: string) => /getSummary/.test(c) }
    ],
    'config': [
      { name: '测试 PHASE_CI_CONFIG', check: (c: string) => /PHASE_CI_CONFIG/.test(c) },
      { name: '测试 PHASE_GIT_CONFIG', check: (c: string) => /PHASE_GIT_CONFIG/.test(c) },
      { name: '测试 CONFIDENCE_REQUIREMENTS', check: (c: string) => /CONFIDENCE_REQUIREMENTS/.test(c) },
      { name: '测试 WORKFLOW_CONFIG', check: (c: string) => /WORKFLOW_CONFIG/.test(c) }
    ]
  }
};

// ============================================
// 评估函数
// ============================================

export async function runEvaluation(): Promise<EvalReport> {
  const results: CheckResult[] = [];
  let passed = 0;
  let failed = 0;

  // Phase 1: 文件结构检查
  for (const check of CHECKPOINTS['file-structure']) {
    const result = check.check();
    results.push({
      name: check.name,
      passed: result,
      message: result ? '通过' : '未通过'
    });
    result ? passed++ : failed++;
  }

  return {
    total: results.length,
    passed,
    failed,
    results
  };
}

export function generateReport(report: EvalReport): string {
  const lines = [
    '========================================',
    '工作流编排器测试评估报告',
    '========================================',
    `总计: ${report.total} 项`,
    `通过: ${report.passed} 项`,
    `失败: ${report.failed} 项`,
    `通过率: ${((report.passed / report.total) * 100).toFixed(1)}%`,
    '----------------------------------------',
    ''
  ];

  for (const result of report.results) {
    const icon = result.passed ? '✅' : '❌';
    lines.push(`${icon} ${result.name}`);
    if (!result.passed) {
      lines.push(`   原因: ${result.message}`);
    }
  }

  lines.push('');
  lines.push('========================================');
  
  return lines.join('\n');
}

// ============================================
// 质量门禁
// ============================================

export function qualityGate(report: EvalReport): { passed: boolean; reason?: string } {
  // 所有检查点必须通过
  if (report.failed > 0) {
    return {
      passed: false,
      reason: `有 ${report.failed} 个检查点未通过`
    };
  }

  // 通过率必须100%
  if (report.passed < report.total) {
    return {
      passed: false,
      reason: `通过率 ${((report.passed / report.total) * 100).toFixed(1)}% 未达到100%`
    };
  }

  return { passed: true };
}

// 导出检查点供外部使用
export { CHECKPOINTS };
