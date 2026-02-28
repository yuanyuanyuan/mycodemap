import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Level 0: 项目约定检查（验证 AI 是否遵循了项目上下文）
test('[L0] 代码应遵循项目的架构约定', () => {
  const content = readFileSync(join(process.cwd(), '[生成的文件路径]'), 'utf-8');

  // 检查是否使用了项目中定义的模式
  expect(content).toMatch(/[期望的项目特定模式]/);

  // 检查是否避免了训练数据中常见但项目不使用的模式
  expect(content).not.toMatch(/[项目中禁止的模式]/);
});

// Level 0b: 依赖版本检查
test('[L0] 应使用项目现有的依赖，不引入冲突版本', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

  const hasRequiredDep = pkg.dependencies?.['expected-lib'] ||
                         pkg.devDependencies?.['expected-lib'];
  expect(hasRequiredDep).toBe(true);
});

// Level 1: 存在性检查
test('[L1] [检查点1描述]', () => {
  const filePath = join(process.cwd(), '[路径]');
  expect(existsSync(filePath)).toBe(true);
});

// Level 2: 结构检查
test('[L2] [检查点2描述]', () => {
  const content = readFileSync(join(process.cwd(), '[路径]'), 'utf-8');
  expect(content).toMatch(/[正则模式]/);
});

// Level 3: 模式检查
test('[L3] [检查点3描述]', () => {
  const content = readFileSync(join(process.cwd(), '[路径]'), 'utf-8');
  expect(content).toMatch(/[模式]/);
});

// Level 4: 负面检查（反例场景验证）
test('[L4-负面] 不应该出现反模式', () => {
  const content = readFileSync(join(process.cwd(), '[路径]'), 'utf-8');
  expect(content).not.toMatch(/[反模式]/);
});
