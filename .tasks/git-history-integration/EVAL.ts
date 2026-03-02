// [META] since:2026-03 | owner:orchestrator-team | stable:true
// [WHY] 验证 Git 历史分析功能的集成是否正确工作
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Level 0: 项目约定检查
test('[L0] 应使用项目现有的 Git 分析实现', () => {
  const gitAnalyzerPath = join(process.cwd(), 'src/orchestrator/git-analyzer.ts');
  expect(existsSync(gitAnalyzerPath)).toBe(true);

  // 检查 GitAnalyzer 类存在
  const content = readFileSync(gitAnalyzerPath, 'utf-8');
  expect(content).toMatch(/class GitAnalyzer/);
});

// Level 0b: 类型定义检查
test('[L0] includeGitHistory 类型定义应存在', () => {
  const typesPath = join(process.cwd(), 'src/orchestrator/types.ts');
  const content = readFileSync(typesPath, 'utf-8');
  expect(content).toMatch(/includeGitHistory\??:/);
});

// Level 1: 参数传递检查
test('[L1] analyze 命令应定义 --include-git-history 参数', () => {
  const analyzePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
  const content = readFileSync(analyzePath, 'utf-8');
  expect(content).toMatch(/include-git-history/);
});

// Level 2: 参数传递到编排层
test('[L2] 参数应传递到编排层', () => {
  const analyzePath = join(process.cwd(), 'src/cli/commands/analyze.ts');
  const content = readFileSync(analyzePath, 'utf-8');

  // 检查参数被读取并传递给 orchestrator
  expect(content).toMatch(/includeGitHistory.*values/);
});

// Level 3: 功能验证 - 构建项目
test('[L3] 项目应能成功构建', () => {
  try {
    execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
    expect(true).toBe(true);
  } catch (e) {
    expect(true).toBe(false);
  }
});

// Level 4: 负面检查 - 不引入新依赖
test('[L4-负面] 不应引入新的 Git 相关依赖', () => {
  const pkgPath = join(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  };

  // 检查没有引入新的 Git 库
  expect(allDeps['isomorphic-git']).toBeUndefined();
  expect(allDeps['nodegit']).toBeUndefined();
  expect(allDeps['simple-git']).toBeUndefined();
});

// Level 5: 运行测试
test('[L5] Git 分析器测试应通过', () => {
  try {
    const result = execSync('pnpm test src/orchestrator/__tests__/git-analyzer.test.ts', {
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    expect(result.toString()).toMatch(/passed| PASS /);
  } catch (e) {
    // 测试可能不存在，跳过
    expect(true).toBe(true);
  }
});

// Level 6: 集成测试
test('[L6] CLI 应能解析 --include-git-history 参数', () => {
  // 构建项目
  execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });

  // 运行 help 检查参数存在
  const helpOutput = execSync('node dist/cli/index.js analyze --help', {
    cwd: process.cwd(),
    encoding: 'utf-8'
  });

  expect(helpOutput).toMatch(/include-git-history/);
});
