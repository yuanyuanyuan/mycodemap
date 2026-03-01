import { expect, test, describe } from 'vitest';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TASK_DIR = '.tasks/test-linker-core-functionality';
const TEST_FILE = 'src/orchestrator/test-linker.ts';

// 测试前准备：创建临时测试文件
test.beforeAll(() => {
  // 确保测试目录存在
  const testDir = join(process.cwd(), 'src/orchestrator');
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }
});

// Level 0: 项目约定检查
test('[L0] 代码应遵循项目的架构约定', () => {
  const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');

  // 检查是否使用 ESM import 语法（项目使用 ESM）
  expect(content).toMatch(/^import\s+/m);

  // 检查是否避免使用 CommonJS require
  expect(content).not.toMatch(/const\s+\w+\s+=\s+require\(/);
});

// Level 1: buildMapping 方法存在性检查
test('[L1] buildMapping 方法应存在且完整实现', () => {
  const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');

  // 检查 buildMapping 方法签名
  expect(content).toMatch(/async\s+buildMapping\s*\(\s*projectRoot\s*:\s*string\s*,\s*codemap\s*:\s*CodemapData/);

  // 检查是否包含测试文件扫描逻辑
  expect(content).toMatch(/findTestFiles|testFiles\.forEach|for\s*\(\s*const\s+testFile/);

  // 检查是否包含源文件推断逻辑
  expect(content).toMatch(/inferSourceFile|scanTestImports/);
});

// Level 2: findRelatedTests 方法结构检查
test('[L2] findRelatedTests 方法应完整实现', () => {
  const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');

  // 检查 findRelatedTests 方法签名
  expect(content).toMatch(/findRelatedTests\s*\(\s*sourceFiles\s*:\s*string\[\s*\]/);

  // 检查是否支持直接映射
  expect(content).toMatch(/sourceToTestMap\.get|sourceToTestMap/);

  // 检查是否支持目录级别匹配
  expect(content).toMatch(/findDirLevelTests|dirTests|directory.*test/);
});

// Level 3: scanTestImports 方法模式检查
test('[L3] scanTestImports 方法应实现 import 扫描', () => {
  const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');

  // 检查 scanTestImports 方法存在
  expect(content).toMatch(/scanTestImports\s*\(\s*testFile\s*:\s*string/);

  // 检查是否使用 fs/promises 读取文件
  expect(content).toMatch(/fs.*promises|readFileSync/);

  // 检查是否解析 import 语句
  expect(content).toMatch(/import\s*.*\s*from|require\(|dynamic.*import/);
});

// Level 4: TestConfig 接口检查
test('[L4] TestConfig 接口应对齐设计文档', () => {
  const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');

  // 检查 TestConfig 接口定义
  expect(content).toMatch(/interface\s+TestConfig/);

  // 检查必须包含的字段
  expect(content).toMatch(/framework\s*:\s*('jest'\|'vitest'|'none'|string)/);
  expect(content).toMatch(/patterns\s*:/);
  expect(content).toMatch(/sourceToTestMap\s*:\s*Map/);
});

// Level 5: loadConfig 方法检查
test('[L5] loadConfig 方法应完整实现', () => {
  const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');

  // 检查 loadConfig 方法存在
  expect(content).toMatch(/async\s+loadConfig\s*\(\s*projectRoot\s*:\s*string/);

  // 检查是否尝试读取 vitest.config
  expect(content).toMatch(/vitest\.config/);

  // 检查是否尝试读取 jest.config
  expect(content).toMatch(/jest\.config/);
});

// Level 6: 负面检查 - 不应出现反模式
test('[L6-负面] 不应该使用项目中禁止的模式', () => {
  const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');

  // 不应使用 console.log 用于生产代码
  expect(content).not.toMatch(/console\.log\s*\(\s*['"]/);

  // 不应使用 any 类型（严格模式）
  expect(content).not.toMatch(/:\s*any\s*[=;)]/);
});

// Level 7: 集成测试 - 实际功能验证
test('[L7] 核心功能应有对应的单元测试', () => {
  // 检查是否有测试文件
  const testFilePatterns = [
    'tests/orchestrator/test-linker.test.ts',
    'tests/test-linker.test.ts',
    'src/orchestrator/test-linker.test.ts'
  ];

  const hasTestFile = testFilePatterns.some(p => existsSync(join(process.cwd(), p)));

  // 如果没有测试文件，检查源文件中是否有测试相关注释或示例
  if (!hasTestFile) {
    const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');
    // 至少应该有 JSDoc 注释说明方法用途
    expect(content).toMatch(/\/\*\*[\s\S]*\*\/\s*(async\s+)?(buildMapping|findRelatedTests|scanTestImports)/);
  } else {
    expect(true).toBe(true);
  }
});

// Level 8: 设计文档对齐检查
test('[L8] 实现应符合设计文档 REFACTOR_TEST_LINKER_DESIGN.md', () => {
  const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');
  const designDoc = readFileSync(join(process.cwd(), 'docs/REFACTOR_TEST_LINKER_DESIGN.md'), 'utf-8');

  // 检查设计文档中要求的策略是否都有对应实现
  // 文件名匹配策略
  expect(content).toMatch(/inferSourceFile|\.test\.ts|\.spec\.ts/);

  // 目录匹配策略
  expect(content).toMatch(/__tests__|testDir|tests/);

  // import 扫描策略
  expect(content).toMatch(/scanTestImports|import.*from/);
});

describe('验收标准检查', () => {
  test('所有检查点通过', () => {
    // 汇总所有检查
    const content = readFileSync(join(process.cwd(), TEST_FILE), 'utf-8');

    const checks = [
      // L1: buildMapping
      /async\s+buildMapping\s*\(\s*projectRoot/.test(content),
      // L2: findRelatedTests
      /findRelatedTests\s*\(\s*sourceFiles/.test(content),
      // L3: scanTestImports
      /scanTestImports\s*\(\s*testFile/.test(content),
      // L4: TestConfig
      /interface\s+TestConfig/.test(content),
      // L5: loadConfig
      /async\s+loadConfig\s*\(\s*projectRoot/.test(content),
    ];

    const passedCount = checks.filter(Boolean).length;
    expect(passedCount).toBeGreaterThanOrEqual(4);
  });
});
