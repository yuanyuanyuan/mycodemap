// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] 定义质量检查规则，包括 hard、warn-only 和 fallback 三层 gate 语义

import fs from 'fs/promises';
import path from 'path';
import { CommitAnalysis, VersionType } from './version-rules.js';
import { runWorkingTreeCheck, runBranchCheck, runScriptsCheck } from '../../ci.js';

export interface CheckContext {
  commits: CommitAnalysis[];
  changedFiles: string[];
  currentVersion: string;
  versionType: VersionType;
}

export type GateStatus = 'passed' | 'failed' | 'fallback';

export type GateMode = 'hard' | 'warn-only' | 'fallback';

export interface CheckResult {
  status: GateStatus;
  message?: string;
  details?: string;
}

export interface QualityRule {
  name: string;
  check: (ctx: CheckContext) => CheckResult | Promise<CheckResult>;
  message: string;
  gateMode: GateMode;
}

export interface GateCheckItem {
  result: CheckResult;
  gateMode: GateMode;
}

function toCheckResult(ciResult: { passed: boolean; message?: string; details?: string }): CheckResult {
  return {
    status: ciResult.passed ? 'passed' : 'failed',
    message: ciResult.message,
    details: ciResult.details,
  };
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

// hard 检查（失败即阻断发布流程）
export const hardRules: QualityRule[] = [
  {
    name: 'workingTreeClean',
    message: '工作区有未提交的变更',
    gateMode: 'hard',
    check: () => {
      const result = runWorkingTreeCheck();
      return toCheckResult(result);
    }
  },
  {
    name: 'correctBranch',
    message: '只能在 main/master 分支发布',
    gateMode: 'hard',
    check: () => {
      const result = runBranchCheck();
      return toCheckResult(result);
    }
  },
  {
    name: 'allChecksPass',
    message: '发布前检查必须全部通过',
    gateMode: 'hard',
    check: () => {
      const result = runScriptsCheck();
      return toCheckResult(result);
    }
  },
  {
    name: 'noBreakingWithoutMajor',
    message: '检测到破坏性变更，必须使用 major 版本',
    gateMode: 'hard',
    check: (ctx) => {
      const hasBreakingChange = ctx.commits.some(c =>
        c.isBreaking || /breaking[_-]change|BREAKING/i.test(c.message)
      );

      const passed = !hasBreakingChange || ctx.versionType === 'major';
      return {
        status: passed ? 'passed' : 'failed',
        message: passed
          ? undefined
          : '检测到 breaking change，但建议版本不是 major'
      };
    }
  }
];

// warn-only 检查（影响置信度，不阻断发布流程）
export const warnOnlyRules: QualityRule[] = [
  {
    name: 'testCoverageAbove80',
    message: '测试覆盖率应该 > 80%',
    gateMode: 'warn-only',
    check: async () => {
      const percentage = await readCoveragePercentage();
      if (percentage === null) {
        return {
          status: 'fallback',
          message: '未找到 coverage/lcov.info，无法验证覆盖率'
        };
      }

      const passed = percentage >= 80;
      return {
        status: passed ? 'passed' : 'failed',
        message: passed ? undefined : `测试覆盖率仅 ${percentage}%`
      };
    }
  },
  {
    name: 'changelogUpdated',
    message: 'CHANGELOG 应该更新',
    gateMode: 'warn-only',
    check: async (ctx) => {
      try {
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
        await fs.access(changelogPath);
        const isUpdated = ctx.changedFiles.includes('CHANGELOG.md');
        return {
          status: isUpdated ? 'passed' : 'failed',
          message: isUpdated ? undefined : '自上次 tag 以来未检测到 CHANGELOG.md 变更'
        };
      } catch {
        return {
          status: 'fallback',
          message: '缺少 CHANGELOG.md'
        };
      }
    }
  },
  {
    name: 'commitsFollowConvention',
    message: 'Commit 消息应该遵循 conventional commits 规范',
    gateMode: 'warn-only',
    check: (ctx) => {
      const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|ci|perf|breaking|feature|bugfix|hotfix|config|infra|enhance|improvement)(\(.+\))?:/i;
      const allFollowConvention = ctx.commits.every(c =>
        conventionalPattern.test(c.type + ':' + c.message)
      );

      return {
        status: allFollowConvention ? 'passed' : 'failed',
        message: allFollowConvention ? undefined : '部分 commit 未遵循 conventional commits 规范'
      };
    }
  }
];

export const allRules: QualityRule[] = [...hardRules, ...warnOnlyRules];

export async function runChecks(ctx: CheckContext): Promise<Map<string, GateCheckItem>> {
  const results = new Map<string, GateCheckItem>();

  for (const rule of allRules) {
    const result = await rule.check(ctx);
    results.set(rule.name, { result, gateMode: rule.gateMode });
  }

  return results;
}
