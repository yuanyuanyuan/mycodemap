// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Step 1: 分析 git commits，提取变更信息

import { execSync } from 'child_process';
import { CommitAnalysis, calculateVersionType, VersionType, versionRules } from './rules/version-rules.js';

export interface AnalyzeResult {
  commits: CommitAnalysis[];
  summary: {
    features: number;
    bugfixes: number;
    refactors: number;
    docs: number;
    other: number;
  };
  versionType: VersionType;
  breakingChanges: boolean;
  changedFiles: string[];
  lastTag?: string;
  commitsSinceTag: number;
}

export interface GitCommit {
  hash: string;
  type: string;
  scope?: string;
  message: string;
  isBreaking: boolean;
}

function parseCommit(commitLine: string): GitCommit | null {
  // 格式: hash|type:message 或 hash|type(scope):message
  const match = commitLine.match(/^([a-f0-9]+)\s+(.+)$/);
  if (!match) return null;

  const [, hash, rest] = match;

  // 解析 type(scope): message 或 [TYPE] message
  const typeMatch = rest.match(/^\[?(\w+)\]?(?:\(([^)]+)\))?:?\s*(.*)$/);
  if (!typeMatch) {
    return {
      hash,
      type: 'unknown',
      message: rest,
      isBreaking: false
    };
  }

  const [, type, scope, message] = typeMatch;

  // 检测破坏性变更
  const isBreaking =
    type.includes('breaking') ||
    message.includes('!') ||
    versionRules.breakingPatterns.some(p => p.test(message));

  return {
    hash: hash.substring(0, 7),
    type: type.toLowerCase(),
    scope,
    message: message.trim(),
    isBreaking
  };
}

function execGitCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    if (error instanceof Error && 'status' in error && (error as { status: number }).status === 1) {
      // git 返回空结果
      return '';
    }
    throw error;
  }
}

export async function analyzeCommits(since?: string): Promise<AnalyzeResult> {
  // 获取上次发布的 tag
  let lastTag = 'v0.0.0';
  try {
    const tags = execGitCommand('git tag --sort=-version:refname | head -1');
    if (tags.trim()) {
      lastTag = tags.trim();
    }
  } catch {
    // 没有 tag，使用初始版本
  }

  // 获取自上次 tag 以来的 commits
  const sinceArg = since || lastTag;
  const commitLines = execGitCommand(
    `git log ${sinceArg}..HEAD --oneline --format="%h %s" 2>/dev/null`
  );

  const commits: CommitAnalysis[] = [];
  const changedFilesSet = new Set<string>();

  // 解析每个 commit
  for (const line of commitLines.trim().split('\n')) {
    if (!line.trim()) continue;
    const parsed = parseCommit(line);
    if (parsed) {
      commits.push({
        ...parsed,
        type: parsed.type,
        scope: parsed.scope,
        message: parsed.message,
        hash: parsed.hash,
        isBreaking: parsed.isBreaking
      });

      // 获取该 commit 修改的文件
      try {
        const files = execGitCommand(`git show ${parsed.hash} --name-only --format="" 2>/dev/null`);
        files.trim().split('\n').forEach(f => {
          if (f.trim()) changedFilesSet.add(f.trim());
        });
      } catch {
        // 忽略文件获取失败
      }
    }
  }

  // 获取所有变更文件（从整个分支）
  try {
    const allFiles = execGitCommand(`git diff ${sinceArg}..HEAD --name-only 2>/dev/null`);
    allFiles.trim().split('\n').forEach(f => {
      if (f.trim()) changedFilesSet.add(f.trim());
    });
  } catch {
    // 忽略
  }

  const changedFiles = Array.from(changedFilesSet);

  // 统计各类 commit
  const summary = {
    features: commits.filter(c =>
      ['feat', 'feature', 'enhance', 'improvement'].some(t => c.type.includes(t))
    ).length,
    bugfixes: commits.filter(c =>
      ['fix', 'bugfix', 'hotfix'].some(t => c.type.includes(t))
    ).length,
    refactors: commits.filter(c => c.type.includes('refactor')).length,
    docs: commits.filter(c => c.type.includes('docs')).length,
    other: commits.filter(c =>
      !['feat', 'feature', 'enhance', 'improvement', 'fix', 'bugfix', 'hotfix', 'refactor', 'docs', 'config', 'infra', 'merge']
        .some(t => c.type.includes(t))
    ).length
  };

  const versionType = calculateVersionType(commits);
  const breakingChanges = commits.some(c => c.isBreaking);

  return {
    commits,
    summary,
    versionType,
    breakingChanges,
    changedFiles,
    lastTag,
    commitsSinceTag: commits.length
  };
}

export function formatAnalyzeOutput(result: AnalyzeResult): string {
  const lines: string[] = [];

  lines.push(`变更分析 (自 ${result.lastTag}):`);
  if (result.summary.features > 0) {
    lines.push(`   [FEATURE] ${result.summary.features}个 - 新功能`);
  }
  if (result.summary.bugfixes > 0) {
    lines.push(`   [BUGFIX] ${result.summary.bugfixes}个 - Bug 修复`);
  }
  if (result.summary.refactors > 0) {
    lines.push(`   [REFACTOR] ${result.summary.refactors}个 - 重构`);
  }
  if (result.summary.docs > 0) {
    lines.push(`   [DOCS] ${result.summary.docs}个 - 文档更新`);
  }
  if (result.summary.other > 0) {
    lines.push(`   [OTHER] ${result.summary.other}个 - 其他`);
  }

  return lines.join('\n');
}
