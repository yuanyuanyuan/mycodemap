/**
 * [META] CI Gateway CLI 命令
 * [WHY] 提供 CI 门禁相关的子命令
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommitMessage, validateRecentCommits } from '../../orchestrator/commit-validator.js';
import { scanDirectory, assessRisk, type FileHeaderResult } from '../../orchestrator/file-header-scanner.js';
import { isCodemapOutput } from '../../orchestrator/types.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * CI 命令错误码
 */
export enum CIErrorCode {
  E0007_INVALID_COMMIT_FORMAT = 'E0007',
  E0008_MISSING_HEADER = 'E0008',
  E0009_MISSING_WHY = 'E0009',
  E0010_OUTPUT_CONTRACT_VIOLATION = 'E0010',
}

/**
 * CI 命令错误信息
 */
export const CI_ERROR_MESSAGES: Record<CIErrorCode, string> = {
  [CIErrorCode.E0007_INVALID_COMMIT_FORMAT]: 'Commit 格式不符合规范',
  [CIErrorCode.E0008_MISSING_HEADER]: '文件头缺少 [META] 或 [WHY] 注释',
  [CIErrorCode.E0009_MISSING_WHY]: '高风险文件缺少 [WHY] 注释',
  [CIErrorCode.E0010_OUTPUT_CONTRACT_VIOLATION]: '输出契约校验失败',
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
async function assessRiskAction(options: { files?: string; threshold?: string }): Promise<void> {
  let changedFiles: string[] = [];
  const threshold = parseFloat(options.threshold ?? '0.7');

  if (options.files) {
    changedFiles = options.files.split(',').map((f) => f.trim());
  } else {
    // 获取 git 变更的文件
    const { execSync } = await import('child_process');
    try {
      const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
      changedFiles = output.split('\n').filter(Boolean);
    } catch {
      console.error(chalk.red('Failed to get git changed files'));
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
  console.log(chalk.bold(`Threshold: ${(threshold * 100).toFixed(0)}%`));

  if (assessment.factors.length > 0) {
    console.log(chalk.bold('\nRisk Factors:'));
    for (const factor of assessment.factors) {
      console.log(`  - ${factor}`);
    }
  }

  // 使用阈值判断是否阻断
  if (assessment.confidence >= threshold) {
    console.log(chalk.red(`\nRisk confidence ${(assessment.confidence * 100).toFixed(0)}% exceeds threshold ${(threshold * 100).toFixed(0)}%`));
    process.exit(1);
  }
}

/**
 * check-output-contract 子命令 - 验证输出契约
 */
async function checkOutputContractAction(options: {
  schemaVersion?: string;
  topK?: string;
  maxTokens?: string;
}): Promise<void> {
  const schemaVersion = options.schemaVersion || 'v1.0.0';
  const topK = parseInt(options.topK || '8', 10);
  const maxTokens = parseInt(options.maxTokens || '160', 10);

  console.log(chalk.blue('=== Output Contract Check ===\n'));
  console.log(chalk.bold('Schema Version:'), schemaVersion);
  console.log(chalk.bold('Top-K Limit:'), topK);
  console.log(chalk.bold('Max Tokens:'), maxTokens);
  console.log();

  // 运行 analyze 命令获取 machine 模式输出
  const { execSync } = await import('child_process');
  let output: string;

  try {
    output = execSync('node dist/cli/index.js analyze -i impact -t src/index.ts --output-mode machine', {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: process.cwd(),
    });
  } catch (error) {
    console.error(chalk.red(`❌ [${CIErrorCode.E0010_OUTPUT_CONTRACT_VIOLATION}] Failed to run analyze command`));
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    console.error(chalk.red(`❌ [${CIErrorCode.E0010_OUTPUT_CONTRACT_VIOLATION}] Invalid JSON output`));
    process.exit(1);
  }

  let errors = 0;

  // 1. 校验 schemaVersion
  if (!isCodemapOutput(parsed)) {
    console.error(chalk.red(`❌ [${CIErrorCode.E0010_OUTPUT_CONTRACT_VIOLATION}] Missing required fields in output`));
    errors++;
  } else {
    const output_1 = parsed;

    if (!output_1.schemaVersion) {
      console.error(chalk.red('❌ Missing schemaVersion in output'));
      errors++;
    } else if (output_1.schemaVersion !== schemaVersion) {
      console.error(chalk.red(`❌ schemaVersion mismatch: expected ${schemaVersion}, got ${output_1.schemaVersion}`));
      errors++;
    }

    // 2. 校验 confidence 字段完整性
    if (!output_1.confidence) {
      console.error(chalk.red('❌ Missing confidence in output'));
      errors++;
    } else {
      if (typeof output_1.confidence.score !== 'number') {
        console.error(chalk.red('❌ Missing confidence.score in output'));
        errors++;
      }
      if (!['high', 'medium', 'low'].includes(output_1.confidence.level)) {
        console.error(chalk.red('❌ Invalid confidence.level in output'));
        errors++;
      }
    }

    // 3. 校验 tool 字段
    if (!output_1.tool) {
      console.error(chalk.red('❌ Missing tool in output'));
      errors++;
    }

    // 4. 校验 Top-K
    const resultCount = output_1.results?.length || 0;
    if (resultCount > topK) {
      console.error(chalk.red(`❌ Result count ${resultCount} exceeds Top-K limit ${topK}`));
      errors++;
    }

    // 5. 校验 token 限制 (简单估算)
    if (output_1.results) {
      for (const result of output_1.results) {
        const content = (result as { content?: string }).content || '';
        // 简单估算 token 数：按空格和中文分词
        const tokenEstimate = content.split(/[\s\u4e00-\u9fa5]/).filter(Boolean).length;
        if (tokenEstimate > maxTokens) {
          console.error(chalk.red(`❌ Result token count ${tokenEstimate} exceeds limit ${maxTokens}`));
          errors++;
          break; // 只报告一次
        }
      }
    }
  }

  if (errors > 0) {
    console.error(chalk.red(`\n❌ ${errors} output contract violation(s) detected`));
    process.exit(1);
  }

  console.log(chalk.green(`✅ Output contract validated (schema: ${schemaVersion}, topK: ≤${topK}, tokens: ≤${maxTokens})`));
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
    .option('-t, --threshold <number>', '风险阈值 (0-1)', '0.7')
    .action(assessRiskAction);

  // check-output-contract 子命令
  ci
    .command('check-output-contract')
    .description('验证 analyze 命令的输出契约')
    .option('-s, --schema-version <version>', '期望的 schema 版本', 'v1.0.0')
    .option('-k, --top-k <number>', '期望的 Top-K 限制', '8')
    .option('-t, --max-tokens <number>', '每个结果的最大 token 数', '160')
    .action(checkOutputContractAction);

  return ci;
}

// 导出命令作为默认导出
export const ciCommand = createCICommand();
