// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] 定义质量检查规则，包括 mustPass 和 shouldPass 检查项

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { CommitAnalysis, VersionType } from './version-rules.js';

export interface CheckContext {
  commits: CommitAnalysis[];
  changedFiles: string[];
  currentVersion: string;
  branch: string;
  versionType: VersionType;
}

export interface CheckResult {
  passed: boolean;
  message?: string;
  details?: string;
}

export interface QualityRule {
  name: string;
  check: (ctx: CheckContext) => CheckResult | Promise<CheckResult>;
  message: string;
  blocking: boolean;
}

const LOCAL_RELEASE_COMMANDS = [
  { name: 'docs:check:pre-release', command: 'npm run docs:check:pre-release' },
  { name: 'check:all', command: 'npm run check:all' },
  { name: 'build', command: 'npm run build' },
  { name: 'validate-pack', command: 'npm run validate-pack' }
] as const;

function extractCommandError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  const stderr = 'stderr' in error && typeof error.stderr === 'string'
    ? error.stderr
    : 'stderr' in error && Buffer.isBuffer(error.stderr)
      ? error.stderr.toString('utf-8')
      : '';

  const stdout = 'stdout' in error && typeof error.stdout === 'string'
    ? error.stdout
    : 'stdout' in error && Buffer.isBuffer(error.stdout)
      ? error.stdout.toString('utf-8')
      : '';

  const message = error instanceof Error ? error.message : String(error);
  return [message, stderr.trim(), stdout.trim()].filter(Boolean).join('\n');
}

async function runLocalReleaseChecks(): Promise<CheckResult> {
  if (process.env.SHIP_IN_CI === '1') {
    return {
      passed: true,
      message: undefined,
      details: 'SHIP_IN_CI=1，跳过本地重复检查'
    };
  }

  const failed: string[] = [];
  const details: string[] = [];

  for (const { name, command } of LOCAL_RELEASE_COMMANDS) {
    try {
      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error) {
      failed.push(name);
      details.push(`[${name}]\n${extractCommandError(error)}`);
    }
  }

  if (failed.length > 0) {
    return {
      passed: false,
      message: `检查未全部通过: ${failed.join(', ')}`,
      details: details.join('\n\n')
    };
  }

  return { passed: true };
}

async function readCoveragePercentage(): Promise<number | null> {
  const coveragePath = path.join(process.cwd(), 'coverage', 'lcov.info');

  try {
    await fs.access(coveragePath);
    const content = await fs.readFile(coveragePath, 'utf-8');
    const recordPattern = /LF:(\d+)[\s\S]*?LH:(\d+)/g;

    let totalLines = 0;
    let coveredLines = 0;
    let match: RegExpExecArray | null;

    match = recordPattern.exec(content);
    while (match) {
      totalLines += parseInt(match[1], 10) || 0;
      coveredLines += parseInt(match[2], 10) || 0;
      match = recordPattern.exec(content);
    }

    if (totalLines === 0) {
      return null;
    }

    return Math.round((coveredLines / totalLines) * 10000) / 100;
  } catch {
    return null;
  }
}

// mustPass 检查（失败即停止）
export const mustPassRules: QualityRule[] = [
  {
    name: 'workingTreeClean',
    message: '工作区有未提交的变更',
    blocking: true,
    check: () => {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
      const isClean = status === '';
      return {
        passed: isClean,
        message: isClean ? undefined : '工作区有未提交的变更',
        details: isClean ? undefined : status
      };
    }
  },
  {
    name: 'correctBranch',
    message: '只能在 main/master 分支发布',
    blocking: true,
    check: (ctx) => {
      const allowedBranches = ['main', 'master'];
      const isCorrect = allowedBranches.includes(ctx.branch);
      return {
        passed: isCorrect,
        message: isCorrect ? undefined : `当前分支 "${ctx.branch}" 不能发布`,
        details: isCorrect ? undefined : `允许的分支: ${allowedBranches.join(', ')}`
      };
    }
  },
  {
    name: 'allChecksPass',
    message: '发布前检查必须全部通过',
    blocking: true,
    check: async () => runLocalReleaseChecks()
  },
  {
    name: 'noBreakingWithoutMajor',
    message: '检测到破坏性变更，必须使用 major 版本',
    blocking: true,
    check: (ctx) => {
      const hasBreakingChange = ctx.commits.some(c =>
        c.isBreaking || /breaking[_-]change|BREAKING/i.test(c.message)
      );

      return {
        passed: !hasBreakingChange || ctx.versionType === 'major',
        message: !hasBreakingChange || ctx.versionType === 'major'
          ? undefined
          : '检测到 breaking change，但建议版本不是 major'
      };
    }
  }
];

// shouldPass 检查（影响置信度，不阻塞）
export const shouldPassRules: QualityRule[] = [
  {
    name: 'testCoverageAbove80',
    message: '测试覆盖率应该 > 80%',
    blocking: false,
    check: async () => {
      const percentage = await readCoveragePercentage();
      if (percentage === null) {
        return {
          passed: false,
          message: '未找到 coverage/lcov.info，无法验证覆盖率'
        };
      }

      return {
        passed: percentage >= 80,
        message: percentage >= 80 ? undefined : `测试覆盖率仅 ${percentage}%`
      };
    }
  },
  {
    name: 'changelogUpdated',
    message: 'CHANGELOG 应该更新',
    blocking: false,
    check: async (ctx) => {
      try {
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
        const changelogStat = await fs.stat(changelogPath);
        const changelogModified = changelogStat.mtime;

        // 获取最新 commit 的时间
        const latestCommitTime = execSync('git log -1 --format=%ct', { encoding: 'utf-8' }).trim();
        const commitTime = new Date(parseInt(latestCommitTime) * 1000);

        const isUpdated = changelogModified >= commitTime;
        return {
          passed: isUpdated,
          message: isUpdated ? undefined : 'CHANGELOG.md 自上次提交后未更新'
        };
      } catch {
        return { passed: true, message: undefined }; // 文件不存在，跳过
      }
    }
  },
  {
    name: 'commitsFollowConvention',
    message: 'Commit 消息应该遵循 conventional commits 规范',
    blocking: false,
    check: (ctx) => {
      const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|ci|perf|breaking|feature|bugfix|hotfix|config|infra|enhance|improvement)(\(.+\))?:/i;
      const allFollowConvention = ctx.commits.every(c =>
        conventionalPattern.test(c.type + ':' + c.message)
      );

      return {
        passed: allFollowConvention,
        message: allFollowConvention ? undefined : '部分 commit 未遵循 conventional commits 规范'
      };
    }
  }
];

export async function runChecks(ctx: CheckContext): Promise<{
  mustPassResults: Map<string, CheckResult>;
  shouldPassResults: Map<string, CheckResult>;
}> {
  const mustPassResults = new Map<string, CheckResult>();
  const shouldPassResults = new Map<string, CheckResult>();

  // 运行 mustPass 检查
  for (const rule of mustPassRules) {
    const result = await rule.check(ctx);
    mustPassResults.set(rule.name, result);
  }

  // 运行 shouldPass 检查
  for (const rule of shouldPassRules) {
    const result = await rule.check(ctx);
    shouldPassResults.set(rule.name, result);
  }

  return { mustPassResults, shouldPassResults };
}
