/**
 * [META] CI Gateway CLI 命令
 * [WHY] 提供 CI 门禁相关的子命令
 */

import { Command } from 'commander';
import { validateCommitMessage, validateRecentCommits, VALID_TAGS } from '../../orchestrator/commit-validator.js';
import { scanDirectory, scanFileHeader, type FileHeaderResult } from '../../orchestrator/file-header-scanner.js';
import { GitAnalyzer } from '../../orchestrator/git-analyzer.js';
import { isCodemapOutput } from '../../orchestrator/types.js';

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
  [CIErrorCode.E0008_MISSING_HEADER]: '文件头缺少 [META] 注释',
  [CIErrorCode.E0009_MISSING_WHY]: '文件头缺少 [WHY] 注释',
  [CIErrorCode.E0010_OUTPUT_CONTRACT_VIOLATION]: '输出契约校验失败',
};

function parseGitDiffFiles(command: string): string[] {
  return command
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function getChangedFiles(options: { files?: string }): Promise<string[]> {
  if (options.files) {
    return options.files
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
  }

  const { execSync } = await import('child_process');

  // 检测是否存在 remote
  let baseBranch = 'main';
  try {
    execSync('git remote get-url origin', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    baseBranch = 'origin/main';
  } catch {
    // 没有 remote，使用本地 main 分支
    baseBranch = 'main';
  }

  try {
    const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const files = parseGitDiffFiles(output);
    if (files.length > 0) {
      return files;
    }
  } catch {
    // fallback 到 HEAD 差异
  }

  try {
    const output = execSync('git diff --name-only HEAD', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return parseGitDiffFiles(output);
  } catch {
    console.error('ERROR: Failed to detect changed files from git diff');
    process.exit(1);
  }
}

/**
 * check-commits 子命令 - 验证 Commit 格式
 */
async function checkCommitsAction(options: { count?: string; message?: string; range?: string }): Promise<void> {
  const count = parseInt(options.count ?? '10', 10);

  if (options.message) {
    const result = validateCommitMessage(options.message);
    if (result.valid) {
      console.log(`Commit message valid: [${result.tag}] ${result.commitMessage}`);
      return;
    }

    console.error(`ERROR: ${result.errorCode}: ${result.errorMessage}`);
    process.exit(1);
  }

  const { execSync } = await import('child_process');

  // 检测是否存在 remote
  let baseBranch = 'main';
  try {
    execSync('git remote get-url origin', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    baseBranch = 'origin/main';
  } catch {
    // 没有 remote，使用本地 main 分支
    baseBranch = 'main';
  }

  const range = options.range || `${baseBranch}..HEAD`;
  let results = await validateRecentCommits(count, range);

  if (results.length === 0 && !options.range) {
    // 本地分支不存在 origin/main 时，退回最近 N 次提交
    results = await validateRecentCommits(count);
  }

  if (results.length === 0) {
    console.log('No commits found for validation.');
    return;
  }

  let hasErrors = false;
  for (const result of results) {
    if (result.valid) {
      console.log(`PASS: [${result.tag}] ${result.commitMessage}`);
    } else {
      console.error(`ERROR: ${result.errorCode}: ${result.errorMessage}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('ERROR: Some commits do not conform to the specification.');
    console.error('Expected format: [TAG] scope: message');
    console.error(`Valid tags: ${VALID_TAGS.join(', ')}`);
    process.exit(1);
  }

  console.log(`All ${results.length} commits are valid.`);
}

/**
 * check-headers 子命令 - 验证文件头注释
 */
function getHeaderCheckCandidates(files: string[]): string[] {
  return files.filter(
    (file) =>
      /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file) &&
      !/\.d\.ts$/.test(file) &&
      !/\.test\.|\.spec\./.test(file)
  );
}

function runHeaderValidation(files: string[]): FileHeaderResult[] {
  const candidates = getHeaderCheckCandidates(files);
  return candidates.map((file) => scanFileHeader(file));
}

async function checkHeadersAction(options: { directory?: string; files?: string }): Promise<void> {
  let results: FileHeaderResult[] = [];

  if (options.files) {
    const files = options.files
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    console.log(`Scanning explicit files: ${files.length}`);
    results = runHeaderValidation(files);
  } else if (options.directory) {
    const directory = options.directory;
    console.log(`Scanning directory: ${directory}`);
    results = scanDirectory({ directory });
  } else {
    const changedFiles = await getChangedFiles({});
    const candidates = getHeaderCheckCandidates(changedFiles);
    console.log(`Scanning changed files: ${candidates.length}`);
    if (candidates.length === 0) {
      console.log('No changed source files detected for header validation.');
      return;
    }
    results = runHeaderValidation(candidates);
  }

  let hasErrors = false;

  for (const result of results) {
    if (result.valid) {
      console.log(`PASS: ${result.filePath}`);
    } else {
      console.error(`ERROR: ${result.errorCode}: ${result.filePath}`);
      console.error(`  ${result.errorMessage}`);
      hasErrors = true;
    }
  }

  const total = results.length;
  const valid = results.filter((r: FileHeaderResult) => r.valid).length;
  console.log(`Summary: total=${total}, valid=${valid}, invalid=${total - valid}`);

  if (hasErrors) {
    process.exit(1);
  }
}

/**
 * assess-risk 子命令 - 评估危险置信度
 */
async function assessRiskAction(options: { files?: string; threshold?: string }): Promise<void> {
  const threshold = parseFloat(options.threshold ?? '0.7');
  const changedFiles = await getChangedFiles(options);

  const targetFiles = changedFiles.filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')
  );

  if (targetFiles.length === 0) {
    console.log('No changed TypeScript source files detected.');
    return;
  }

  const projectRoot = process.cwd();
  const gitAnalyzer = new GitAnalyzer();

  const commits = await gitAnalyzer.findRelatedCommits([], targetFiles, {
    maxCommits: 100,
    projectRoot,
  });

  // 简化版风险评估（移除 AIFeed 依赖）
  type RiskLevel = 'low' | 'medium' | 'high';
  
  const risk: { score: number; level: RiskLevel; riskFactors: string[] } = {
    score: 0.3, // 默认低风险
    level: 'low',
    riskFactors: [],
  };

  // 根据文件数量和提交历史简单评估
  if (targetFiles.length > 10) {
    risk.score += 0.2;
    risk.riskFactors.push(`变更文件数量较多: ${targetFiles.length} 个文件`);
  }

  if (commits.length > 20) {
    risk.score += 0.2;
    risk.riskFactors.push(`相关提交历史复杂: ${commits.length} 个提交`);
  }

  // 调整风险等级
  if (risk.score >= 0.7) {
    risk.level = 'high';
  } else if (risk.score >= 0.4) {
    risk.level = 'medium';
  }

  console.log('Risk assessment summary');
  console.log(`score=${risk.score.toFixed(2)}`);
  console.log(`level=${risk.level}`);
  console.log(`threshold=${threshold.toFixed(2)}`);

  if (risk.riskFactors.length > 0) {
    console.log('riskFactors:');
    for (const factor of risk.riskFactors) {
      console.log(`- ${factor}`);
    }
  }

  if (risk.score > threshold) {
    console.error(`ERROR: Risk score ${risk.score.toFixed(2)} exceeds threshold ${threshold.toFixed(2)}`);
    console.error('Risk mitigation notes required. Add explanation to commit body.');
    process.exit(1);
  }

  console.log('Risk assessment passed.');
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

  console.log('Output contract check');
  console.log(`schemaVersion=${schemaVersion}`);
  console.log(`topK=${topK}`);
  console.log(`maxTokens=${maxTokens}`);

  const { execSync } = await import('child_process');
  let output: string;

  try {
    output = execSync('node dist/cli/index.js analyze -i impact -t src/index.ts --output-mode machine --json', {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: process.cwd(),
    });
  } catch {
    console.error(`ERROR: [${CIErrorCode.E0010_OUTPUT_CONTRACT_VIOLATION}] Failed to run analyze command`);
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    console.error(`ERROR: [${CIErrorCode.E0010_OUTPUT_CONTRACT_VIOLATION}] Invalid JSON output`);
    process.exit(1);
  }

  let errors = 0;

  if (!isCodemapOutput(parsed)) {
    console.error(`ERROR: [${CIErrorCode.E0010_OUTPUT_CONTRACT_VIOLATION}] Missing required fields in output`);
    errors++;
  } else {
    if (!parsed.schemaVersion) {
      console.error('ERROR: Missing schemaVersion in output');
      errors++;
    } else if (parsed.schemaVersion !== schemaVersion) {
      console.error(`ERROR: schemaVersion mismatch: expected ${schemaVersion}, got ${parsed.schemaVersion}`);
      errors++;
    }

    if (!parsed.confidence) {
      console.error('ERROR: Missing confidence in output');
      errors++;
    } else {
      if (typeof parsed.confidence.score !== 'number') {
        console.error('ERROR: Missing confidence.score in output');
        errors++;
      }
      if (!['high', 'medium', 'low'].includes(parsed.confidence.level)) {
        console.error('ERROR: Invalid confidence.level in output');
        errors++;
      }
    }

    if (!parsed.tool) {
      console.error('ERROR: Missing tool in output');
      errors++;
    }

    const resultCount = parsed.results?.length || 0;
    if (resultCount > topK) {
      console.error(`ERROR: Result count ${resultCount} exceeds Top-K limit ${topK}`);
      errors++;
    }

    for (const result of parsed.results ?? []) {
      const content = (result as { content?: string }).content || '';
      const tokenEstimate = content.split(/[\s\u4e00-\u9fa5]/).filter(Boolean).length;
      if (tokenEstimate > maxTokens) {
        console.error(`ERROR: Result token count ${tokenEstimate} exceeds limit ${maxTokens}`);
        errors++;
        break;
      }
    }
  }

  if (errors > 0) {
    console.error(`ERROR: ${errors} output contract violation(s) detected`);
    process.exit(1);
  }

  console.log(`Output contract validated (schema=${schemaVersion}, topK<=${topK}, tokens<=${maxTokens})`);
}

/**
 * 创建 CI Gateway 命令
 */
export function createCICommand(): Command {
  const ci = new Command('ci');
  ci.description('CI Gateway - 代码质量门禁工具');

  ci
    .command('check-commits')
    .description('验证 Commit 格式是否符合 [TAG] scope: message')
    .option('-c, --count <number>', '检查最近的 N 个提交', '10')
    .option('-r, --range <range>', '检查指定 git log 范围，例如 origin/main..HEAD')
    .option('-m, --message <text>', '验证单个 commit message')
    .action(checkCommitsAction);

  ci
    .command('check-headers')
    .description('验证文件头注释是否包含 [META] 和 [WHY]（默认检查 git 变更文件）')
    .option('-d, --directory <path>', '扫描指定目录（全量）')
    .option('-f, --files <files>', '逗号分隔的文件列表（精确模式）')
    .action(checkHeadersAction);

  ci
    .command('assess-risk')
    .description('评估代码变更的危险置信度')
    .option('-f, --files <files>', '逗号分隔的变更文件列表')
    .option('-t, --threshold <number>', '风险阈值 (0-1)', '0.7')
    .action(assessRiskAction);

  ci
    .command('check-output-contract')
    .description('验证 analyze 命令的输出契约')
    .option('-s, --schema-version <version>', '期望的 schema 版本', 'v1.0.0')
    .option('-k, --top-k <number>', '期望的 Top-K 限制', '8')
    .option('-t, --max-tokens <number>', '每个结果的最大 token 数', '160')
    .action(checkOutputContractAction);

  return ci;
}

export const ciCommand = createCICommand();
