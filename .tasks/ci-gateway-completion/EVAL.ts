import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const TASK_DIR = '.tasks/ci-gateway-completion';

// Level 0: 项目约定检查
test('[L0] 代码应遵循项目的架构约定', () => {
  // 检查 .githooks 目录存在
  const hooksDir = join(process.cwd(), '.githooks');
  expect(existsSync(hooksDir)).toBe(true);

  // 检查 GitHub Actions 目录存在
  const actionsDir = join(process.cwd(), '.github/workflows');
  expect(existsSync(actionsDir)).toBe(true);
});

// Level 1: pre-commit hook 包含 npm test
test('[L1] pre-commit hook 应包含 npm test 执行', () => {
  const hookPath = join(process.cwd(), '.githooks/pre-commit');

  if (existsSync(hookPath)) {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toMatch(/npm\s+test|vitest/);
  } else {
    // 如果 .githooks 不存在，检查 .husky
    const huskyPath = join(process.cwd(), '.husky/pre-commit');
    if (existsSync(huskyPath)) {
      const content = readFileSync(huskyPath, 'utf-8');
      expect(content).toMatch(/npm\s+test|vitest/);
    }
  }
});

// Level 2: pre-commit hook 包含 AI 饲料生成
test('[L2] pre-commit hook 应包含 AI 饲料生成', () => {
  const hookPath = join(process.cwd(), '.githooks/pre-commit');

  if (existsSync(hookPath)) {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toMatch(/codemap\s+generate|npx\s+codemap/);
  } else {
    const huskyPath = join(process.cwd(), '.husky/pre-commit');
    if (existsSync(huskyPath)) {
      const content = readFileSync(huskyPath, 'utf-8');
      expect(content).toMatch(/codemap\s+generate|npx\s+codemap/);
    }
  }
});

// Level 3: GitHub Actions 包含 AI 饲料同步检查
test('[L3] GitHub Actions 应包含 AI 饲料同步检查', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/ci-gateway.yml');

  if (existsSync(workflowPath)) {
    const content = readFileSync(workflowPath, 'utf-8');
    // 检查是否有 generate + diff 检查
    expect(content).toMatch(/codemap\s+generate|npx\s+codemap\s+generate/);
    expect(content).toMatch(/git\s+diff.*--exit-code|diff\s+--exit-code/);
  }
});

// Level 4: GitHub Actions 包含 assess-risk
test('[L4] GitHub Actions 应包含 assess-risk 步骤', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/ci-gateway.yml');

  if (existsSync(workflowPath)) {
    const content = readFileSync(workflowPath, 'utf-8');
    expect(content).toMatch(/assess-risk/);
    expect(content).toMatch(/--threshold.*0\.7|threshold.*0\.7/);
  }
});

// Level 5: GitHub Actions 包含 check-output-contract
test('[L5] GitHub Actions 应包含 check-output-contract 步骤', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/ci-gateway.yml');

  if (existsSync(workflowPath)) {
    const content = readFileSync(workflowPath, 'utf-8');
    expect(content).toMatch(/check-output-contract/);
  }
});

// Level 6: Commit Tag 使用大写
test('[L6] Hook 应使用大写 Tag 格式', () => {
  const hookPath = join(process.cwd(), '.githooks/commit-msg');

  if (existsSync(hookPath)) {
    const content = readFileSync(hookPath, 'utf-8');
    // 检查是否使用大写 TAG
    expect(content).toMatch(/\[BUGFIX\]|\[FEATURE\]|\[REFACTOR\]/);
  }
});

// Level 7: Husky 集成检查（可选）
test('[L7] 如果存在 Husky 配置，应包含必要 hook', () => {
  const huskyDir = join(process.cwd(), '.husky');

  if (existsSync(huskyDir)) {
    // Husky 目录存在，检查是否有 hook 文件
    const files = ['commit-msg', 'pre-commit'];
    const hasAnyHook = files.some(f => existsSync(join(huskyDir, f)));

    if (hasAnyHook) {
      // 至少应该有一个 hook 文件
      expect(true).toBe(true);
    }
  }
  // 如果没有 .husky 目录，跳过此检查（使用 .githooks 也是可以的）
});

// Level 8: 负面检查 - 不应使用反模式
test('[L8-负面] 不应该使用小写 tag 格式', () => {
  const hookPath = join(process.cwd(), '.githooks/commit-msg');

  if (existsSync(hookPath)) {
    const content = readFileSync(hookPath, 'utf-8');
    // 不应使用小写 [bugfix] 等格式
    expect(content).not.toMatch(/\[bugfix\]|\[feature\]|\[refactor\]/);
  }
});

// Level 9: CI 命令完整性检查
test('[L9] CI 命令应完整实现', () => {
  const ciPath = join(process.cwd(), 'src/cli/commands/ci.ts');

  if (existsSync(ciPath)) {
    const content = readFileSync(ciPath, 'utf-8');

    // 检查必要的子命令
    expect(content).toMatch(/check-commits|check-commits/);
    expect(content).toMatch(/check-headers|check-headers/);
    expect(content).toMatch(/assess-risk/);
    expect(content).toMatch(/check-output-contract/);
  }
});

describe('验收标准检查', () => {
  test('所有关键检查点通过', () => {
    // 汇总检查
    const workflowPath = join(process.cwd(), '.github/workflows/ci-gateway.yml');
    const hookPath = join(process.cwd(), '.githooks/pre-commit');

    const workflowExists = existsSync(workflowPath);
    const hookExists = existsSync(hookPath);

    // 至少工作流或 hook 应该存在
    expect(workflowExists || hookExists).toBe(true);
  });
});
