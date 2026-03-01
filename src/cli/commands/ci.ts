/**
 * CI Gateway CLI 命令
 * 提供 CI 门禁相关的子命令
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommitMessage, validateRecentCommits } from '../../orchestrator/commit-validator.js';
import { scanDirectory, assessRisk, type FileHeaderResult } from '../../orchestrator/file-header-scanner.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * CI 命令错误码
 */
export enum CIErrorCode {
  E0007_INVALID_COMMIT_FORMAT = 'E0007',
  E0008_MISSING_HEADER = 'E0008',
  E0009_MISSING_WHY = 'E0009',
}

/**
 * CI 命令错误信息
 */
export const CI_ERROR_MESSAGES: Record<CIErrorCode, string> = {
  [CIErrorCode.E0007_INVALID_COMMIT_FORMAT]: 'Commit 格式不符合规范',
  [CIErrorCode.E0008_MISSING_HEADER]: '文件头缺少 [META] 或 [WHY] 注释',
  [CIErrorCode.E0009_MISSING_WHY]: '高风险文件缺少 [WHY] 注释',
};

/**
 * check-commits 子命令 - 验证 Commit 格式
 */
async function checkCommitsAction(options: { count?: number; message?: string }): Promise<void> {
  const count = options.count ?? 10;

  if (options.message) {
    // 验证单个 commit message
    const result = validateCommitMessage(options.message);
    if (result.valid) {
      console.log(chalk.green(`✅ Valid commit: [${result.tag}] ${result.commitMessage}`));
    } else {
      console.error(chalk.red(`❌ ${result.errorCode}: ${result.errorMessage}`));
      process.exit(1);
    }
  } else {
    // 验证最近的 commits
    const results = await validateRecentCommits(count);
    let hasErrors = false;

    for (const result of results) {
      if (result.valid) {
        console.log(chalk.green(`✅ [${result.tag}] ${result.commitMessage}`));
      } else {
        console.error(chalk.red(`❌ ${result.errorCode}: ${result.errorMessage}`));
        hasErrors = true;
      }
    }

    if (hasErrors) {
      console.error(chalk.red('\n❌ Some commits do not conform to the format specification.'));
      console.error(chalk.yellow('Expected format: [TAG] message'));
      console.error(chalk.yellow('Valid tags: feat, fix, refactor, docs, chore, test, style, perf, ci, build, revert'));
      process.exit(1);
    }

    console.log(chalk.green(`\n✅ All ${results.length} commits are valid.`));
  }
}

/**
 * check-headers 子命令 - 验证文件头注释
 */
function checkHeadersAction(options: { directory?: string; 'no-high-risk'?: boolean }): void {
  const directory = options.directory ?? process.cwd();
  const includeHighRisk = !options['no-high-risk'];

  console.log(chalk.blue(`Scanning directory: ${directory}`));
  console.log(chalk.blue(`Include high-risk check: ${includeHighRisk}\n`));

  const results = scanDirectory({ directory, includeHighRisk });
  let hasErrors = false;

  for (const result of results) {
    if (result.valid) {
      console.log(chalk.green(`✅ ${result.filePath}`));
    } else {
      console.error(chalk.red(`❌ ${result.errorCode}: ${result.filePath}`));
      console.error(chalk.gray(`   ${result.errorMessage}`));
      hasErrors = true;
    }
  }

  const total = results.length;
  const valid = results.filter((r: FileHeaderResult) => r.valid).length;

  console.log(chalk.blue(`\nTotal: ${total}, Valid: ${valid}, Invalid: ${total - valid}`));

  if (hasErrors) {
    process.exit(1);
  }
}

/**
 * assess-risk 子命令 - 评估危险置信度
 */
async function assessRiskAction(options: { files?: string }): Promise<void> {
  let changedFiles: string[] = [];

  if (options.files) {
    changedFiles = options.files.split(',').map((f) => f.trim());
  } else {
    // 获取 git 变更的文件
    const { execSync } = await import('child_process');
    try {
      const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
      changedFiles = output.split('\n').filter(Boolean);
    } catch {
      console.error(chalk.red('❌ Failed to get git changed files'));
      process.exit(1);
    }
  }

  if (changedFiles.length === 0) {
    console.log(chalk.yellow('No changed files detected.'));
    return;
  }

  const assessment = assessRisk(changedFiles);

  console.log(chalk.blue('\n=== Risk Assessment ===\n'));
  console.log(chalk.bold(`Risk Level: ${chalk.cyan(assessment.level.toUpperCase())}`));
  console.log(chalk.bold(`Confidence: ${(assessment.confidence * 100).toFixed(0)}%`));

  if (assessment.factors.length > 0) {
    console.log(chalk.bold('\nRisk Factors:'));
    for (const factor of assessment.factors) {
      console.log(`  - ${factor}`);
    }
  }

  if (assessment.level === 'critical' || assessment.level === 'high') {
    process.exit(1);
  }
}

/**
 * check-output-contract 子命令 - 验证输出契约
 */
function checkOutputContractAction(): void {
  // 读取 package.json 验证版本
  const packageJsonPath = join(process.cwd(), 'package.json');

  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    console.log(chalk.blue('=== Output Contract Check ===\n'));
    console.log(chalk.bold('Package:'), pkg.name);
    console.log(chalk.bold('Version:'), pkg.version);
    console.log(chalk.bold('Main:'), pkg.main ?? 'N/A');
    console.log(chalk.bold('Types:'), pkg.types ?? pkg.typing ?? 'N/A');

    // 验证必要字段
    const required = ['name', 'version', 'main'];
    const missing = required.filter((f) => !pkg[f]);

    if (missing.length > 0) {
      console.error(chalk.red(`\n❌ Missing required fields: ${missing.join(', ')}`));
      process.exit(1);
    }

    console.log(chalk.green('\n✅ Output contract valid.'));
  } catch (err) {
    console.error(chalk.red('❌ Failed to read package.json'));
    process.exit(1);
  }
}

/**
 * 创建 CI Gateway 命令
 */
export function createCICommand(): Command {
  const ci = new Command('ci');
  ci.description('CI Gateway - 代码质量门禁工具');

  // check-commits 子命令
  ci
    .command('check-commits')
    .description('验证 Commit 格式是否符合规范')
    .option('-c, --count <number>', '检查最近的 N 个提交', '10')
    .option('-m, --message <text>', '验证单个 commit message')
    .action(checkCommitsAction);

  // check-headers 子命令
  ci
    .command('check-headers')
    .description('验证文件头注释是否包含 [META] 或 [WHY]')
    .option('-d, --directory <path>', '要扫描的目录', process.cwd())
    .option('--no-high-risk', '跳过高风险文件检查')
    .action(checkHeadersAction);

  // assess-risk 子命令
  ci
    .command('assess-risk')
    .description('评估代码变更的危险置信度')
    .option('-f, --files <files>', '逗号分隔的变更文件列表')
    .action(assessRiskAction);

  // check-output-contract 子命令
  ci
    .command('check-output-contract')
    .description('验证输出契约 (package.json)')
    .action(checkOutputContractAction);

  return ci;
}

// 导出命令作为默认导出
export const ciCommand = createCICommand();
