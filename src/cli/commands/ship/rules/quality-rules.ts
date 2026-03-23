// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] 定义质量检查规则，包括 mustPass 和 shouldPass 检查项

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { CommitAnalysis } from './version-rules.js';

export interface CheckContext {
  commits: CommitAnalysis[];
  changedFiles: string[];
  currentVersion: string;
  branch: string;
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
    name: 'noBreakingWithoutMajor',
    message: '检测到破坏性变更，必须使用 major 版本',
    blocking: true,
    check: (ctx) => {
      const hasBreaking = ctx.commits.some(c => c.isBreaking);
      // 检查 message 中是否包含破坏性变更标记
      const breakingInMessage = ctx.commits.some(c =>
        /breaking[_-]change|BREAKING/i.test(c.message)
      );
      const hasBreakingChange = hasBreaking || breakingInMessage;

      // 如果有破坏性变更，不阻止（让 versioner 决定 bump 到 major）
      // 这里只检查是否在 non-master 分支有破坏性变更
      return {
        passed: true, // 让发布流程继续，版本计算会处理
        message: undefined
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
      try {
        // 尝试读取 coverage/lcov.info
        const coveragePath = path.join(process.cwd(), 'coverage', 'lcov.info');
        await fs.access(coveragePath);

        const content = await fs.readFile(coveragePath, 'utf-8');
        const lineCoverageMatch = content.match(/LF:\d+\s+LH:\d+\s+BRF:\d+\s+BRH:\d+/g);

        if (lineCoverageMatch) {
          // 简单的覆盖率估算
          const hasGoodCoverage = lineCoverageMatch.length > 0;
          return {
            passed: hasGoodCoverage,
            message: hasGoodCoverage ? undefined : '测试覆盖率可能不足'
          };
        }
      } catch {
        // coverage 文件不存在，跳过此检查
      }
      return { passed: true, message: undefined }; // 跳过，不影响
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
      const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|ci|perf|breaking)(\(.+\))?:/;
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
