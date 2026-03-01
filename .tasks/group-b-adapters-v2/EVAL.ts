/**
 * [META] Group B - 适配器模块测试任务评估脚本
 * [WHY] 评估适配器模块的测试覆盖率和正确性
 * 运行: npx tsx EVAL.ts
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface Checkpoint {
  id: string;
  name: string;
  weight: number;
  test: () => { passed: boolean; message: string };
}

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const basePath = '/data/codemap/src/orchestrator/adapters';
const testsPath = path.join(basePath, '__tests__');

// 辅助函数：检查文件是否存在
const fileExists = (filePath: string): boolean => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

// 辅助函数：读取文件内容
const readFile = (filePath: string): string => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
};

// ==================== 分层检查点 ====================

// L1 层：文件结构和存在性
const L1_Checkpoints: Checkpoint[] = [
  {
    id: 'L1-1',
    name: 'ast-grep-adapter.test.ts 存在',
    weight: 5,
    test: () => {
      const exists = fileExists(path.join(testsPath, 'ast-grep-adapter.test.ts'));
      return {
        passed: exists,
        message: exists ? '文件存在' : '文件不存在',
      };
    },
  },
  {
    id: 'L1-2',
    name: 'codemap-adapter.test.ts 存在',
    weight: 5,
    test: () => {
      const exists = fileExists(path.join(testsPath, 'codemap-adapter.test.ts'));
      return {
        passed: exists,
        message: exists ? '文件存在' : '文件不存在',
      };
    },
  },
  {
    id: 'L1-3',
    name: 'index.test.ts 存在',
    weight: 5,
    test: () => {
      const exists = fileExists(path.join(testsPath, 'index.test.ts'));
      return {
        passed: exists,
        message: exists ? '文件存在' : '文件不存在',
      };
    },
  },
];

// L2 层：导入和依赖
const L2_Checkpoints: Checkpoint[] = [
  {
    id: 'L2-1',
    name: 'ast-grep-adapter.test.ts 正确导入源代码',
    weight: 5,
    test: () => {
      const content = readFile(path.join(testsPath, 'ast-grep-adapter.test.ts'));
      const hasCorrectImport = content.includes("from '../ast-grep-adapter.js'") || 
                               content.includes("from '../ast-grep-adapter'") ||
                               content.includes('from "../ast-grep-adapter.js"') ||
                               content.includes('from "../ast-grep-adapter"');
      return {
        passed: hasCorrectImport,
        message: hasCorrectImport ? '正确导入源代码' : '未正确导入源代码',
      };
    },
  },
  {
    id: 'L2-2',
    name: 'codemap-adapter.test.ts 正确导入源代码',
    weight: 5,
    test: () => {
      const content = readFile(path.join(testsPath, 'codemap-adapter.test.ts'));
      const hasCorrectImport = content.includes("from '../codemap-adapter.js'") || 
                               content.includes("from '../codemap-adapter'") ||
                               content.includes('from "../codemap-adapter.js"') ||
                               content.includes('from "../codemap-adapter"');
      return {
        passed: hasCorrectImport,
        message: hasCorrectImport ? '正确导入源代码' : '未正确导入源代码',
      };
    },
  },
  {
    id: 'L2-3',
    name: '使用 node:child_process mock',
    weight: 5,
    test: () => {
      const astContent = readFile(path.join(testsPath, 'ast-grep-adapter.test.ts'));
      const codemapContent = readFile(path.join(testsPath, 'codemap-adapter.test.ts'));
      const hasCorrectMock = astContent.includes("vi.mock('node:child_process')") || astContent.includes("vi.mock('node:child_process',") ||
                             astContent.includes('vi.mock("node:child_process")') ||
                             codemapContent.includes("vi.mock('node:child_process')") || codemapContent.includes("vi.mock('node:child_process',") ||
                             codemapContent.includes('vi.mock("node:child_process")');
      return {
        passed: hasCorrectMock,
        message: hasCorrectMock ? '正确使用 node:child_process mock' : '未使用 node: 前缀',
      };
    },
  },
  {
    id: 'L2-4',
    name: '使用 globby mock（非 glob）',
    weight: 5,
    test: () => {
      const astContent = readFile(path.join(testsPath, 'ast-grep-adapter.test.ts'));
      const codemapContent = readFile(path.join(testsPath, 'codemap-adapter.test.ts'));
      const hasGlobbyMock = astContent.includes("vi.mock('globby',") || astContent.includes('vi.mock("globby",') || codemapContent.includes("vi.mock('globby')") ||
                            codemapContent.includes('vi.mock("globby")');
      const hasWrongGlobMock = (codemapContent.includes("vi.mock('glob')") || 
                                codemapContent.includes('vi.mock("glob")')) &&
                               !(codemapContent.includes("vi.mock('globby')") ||
                                 codemapContent.includes('vi.mock("globby")'));
      return {
        passed: hasGlobbyMock && !hasWrongGlobMock,
        message: hasGlobbyMock ? '正确使用 globby mock' : '未使用 globby mock',
      };
    },
  },
  {
    id: 'L2-5',
    name: 'index.test.ts 正确测试所有导出',
    weight: 5,
    test: () => {
      const content = readFile(path.join(testsPath, 'index.test.ts'));
      const hasAstGrepAdapter = content.includes('AstGrepAdapter');
      const hasCodemapAdapter = content.includes('CodemapAdapter');
      const hasCreateAstGrep = content.includes('createAstGrepAdapter');
      const hasCreateCodemap = content.includes('createCodemapAdapter');
      const allPresent = hasAstGrepAdapter && hasCodemapAdapter && hasCreateAstGrep && hasCreateCodemap;
      return {
        passed: allPresent,
        message: allPresent ? '覆盖所有导出' : '缺少部分导出测试',
      };
    },
  },
];

// L3 层：行为测试
const L3_Checkpoints: Checkpoint[] = [
  {
    id: 'L3-1',
    name: '测试 AstGrepAdapter.name 属性',
    weight: 5,
    test: () => {
      const content = readFile(path.join(testsPath, 'ast-grep-adapter.test.ts'));
      const hasNameTest = (content.includes('name') && content.includes("'ast-grep'")) ||
                         content.includes('.name') || 
                         content.includes('get name');
      return {
        passed: hasNameTest,
        message: hasNameTest ? '测试 name 属性' : '未测试 name 属性',
      };
    },
  },
  {
    id: 'L3-2',
    name: '测试 AstGrepAdapter.isAvailable()',
    weight: 5,
    test: () => {
      const content = readFile(path.join(testsPath, 'ast-grep-adapter.test.ts'));
      const hasIsAvailableTest = content.includes('isAvailable');
      return {
        passed: hasIsAvailableTest,
        message: hasIsAvailableTest ? '测试 isAvailable 方法' : '未测试 isAvailable 方法',
      };
    },
  },
  {
    id: 'L3-3',
    name: '测试 AstGrepAdapter.execute() 边界情况',
    weight: 5,
    test: () => {
      const content = readFile(path.join(testsPath, 'ast-grep-adapter.test.ts'));
      const hasEmptyArrayTest = content.includes('[]') || content.includes('empty');
      const hasTopKTest = content.includes('topK') || content.includes('limit');
      return {
        passed: hasEmptyArrayTest || hasTopKTest,
        message: (hasEmptyArrayTest || hasTopKTest) ? '测试边界情况' : '未测试边界情况',
      };
    },
  },
  {
    id: 'L3-4',
    name: '测试 CodemapAdapter 基本行为',
    weight: 5,
    test: () => {
      const content = readFile(path.join(testsPath, 'codemap-adapter.test.ts'));
      const hasExecuteTest = content.includes('execute');
      return {
        passed: hasExecuteTest,
        message: hasExecuteTest ? '测试 execute 方法' : '未测试 execute 方法',
      };
    },
  },
];

// L4 层：覆盖率和质量
const L4_Checkpoints: Checkpoint[] = [
  {
    id: 'L4-1',
    name: '所有测试通过',
    weight: 10,
    test: () => {
      try {
        execSync('npm test -- --run src/orchestrator/adapters', { 
          cwd: '/data/codemap',
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        return { passed: true, message: '所有测试通过' };
      } catch (error) {
        return { passed: false, message: '有测试失败' };
      }
    },
  },
  {
    id: 'L4-2',
    name: '行覆盖率达到 100%',
    weight: 10,
    test: () => {
      try {
        const output = execSync('npm test -- --run --coverage src/orchestrator/adapters', { 
          cwd: '/data/codemap',
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        const has100Percent = output.includes('100%') || output.includes('100 |');
        return { passed: has100Percent, message: has100Percent ? '达到 100% 覆盖率' : '未达到 100% 覆盖率' };
      } catch (error: any) {
        const output = error.stdout || error.message || '';
        const has100Percent = output.includes('100%') || output.includes('100 |');
        return { passed: has100Percent, message: has100Percent ? '达到 100% 覆盖率' : '未达到 100% 覆盖率' };
      }
    },
  },
  {
    id: 'L4-3',
    name: 'TypeScript 类型检查通过',
    weight: 10,
    test: () => {
      try {
        execSync('npx tsc --noEmit', { 
          cwd: '/data/codemap',
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        return { passed: true, message: '类型检查通过' };
      } catch (error) {
        return { passed: false, message: '类型检查失败' };
      }
    },
  },
];

// 合并所有检查点
const allCheckpoints = [...L1_Checkpoints, ...L2_Checkpoints, ...L3_Checkpoints, ...L4_Checkpoints];

// 主评估函数
function evaluate() {
  console.log('='.repeat(60));
  console.log('Group B - 适配器模块测试任务评估');
  console.log('='.repeat(60));
  console.log();

  let totalScore = 0;
  let maxScore = 0;
  let passedCount = 0;

  // 按层级分组执行
  const levels = [
    { name: 'L1 - 文件结构', checkpoints: L1_Checkpoints },
    { name: 'L2 - 导入和依赖', checkpoints: L2_Checkpoints },
    { name: 'L3 - 行为测试', checkpoints: L3_Checkpoints },
    { name: 'L4 - 覆盖率和质量', checkpoints: L4_Checkpoints },
  ];

  for (const level of levels) {
    console.log('\n' + '-'.repeat(60));
    console.log(level.name);
    console.log('-'.repeat(60));

    for (const checkpoint of level.checkpoints) {
      maxScore += checkpoint.weight;
      const result = checkpoint.test();

      if (result.passed) {
        totalScore += checkpoint.weight;
        passedCount++;
        console.log(`${colors.green}PASS${colors.reset} ${checkpoint.id}: ${checkpoint.name} (+${checkpoint.weight})`);
      } else {
        console.log(`${colors.red}FAIL${colors.reset} ${checkpoint.id}: ${checkpoint.name}`);
        console.log(`    ${colors.yellow}NOTE${colors.reset} ${result.message}`);
      }
    }
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('评估总结');
  console.log('='.repeat(60));
  console.log(`总分: ${totalScore}/${maxScore} (${((totalScore / maxScore) * 100).toFixed(1)}%)`);
  console.log(`通过: ${passedCount}/${allCheckpoints.length} 检查点`);

  if (totalScore >= 90) {
    console.log(`${colors.green}结果: PASS (优秀)${colors.reset}`);
  } else if (totalScore >= 70) {
    console.log(`${colors.yellow}结果: CONDITIONAL (条件通过)${colors.reset}`);
  } else {
    console.log(`${colors.red}结果: FAIL (失败)${colors.reset}`);
  }

  console.log();
  process.exit(totalScore >= 70 ? 0 : 1);
}

// 运行评估
evaluate();
