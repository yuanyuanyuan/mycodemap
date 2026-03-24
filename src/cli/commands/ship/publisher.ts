// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Step 4: 创建发布提交和 git tag，并通过 push 触发 GitHub Actions 发布

import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { AnalyzeResult, GitCommit } from './analyzer.js';

export interface PublishOptions {
  dryRun?: boolean;
  analyzeResult?: AnalyzeResult;
}

interface ReplacementRule {
  file: string;
  pattern: RegExp;
  replacement: string;
}

const CHANGELOG_HEADER = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
const COMMAND_MAX_BUFFER = 20 * 1024 * 1024;

// Commit 数量警告阈值
const LARGE_RELEASE_COMMIT_THRESHOLD = 20;

interface MilestoneGroup {
  name: string;
  description: string;
  commits: GitCommit[];
}

/**
 * 检测 commit 是否属于 milestone 相关
 * 基于 commit message 中的关键词识别 milestone/phase 变更
 */
function detectMilestoneKeywords(message: string): { isMilestone: boolean; phase?: string; type?: 'start' | 'close' | 'archive' | 'progress' } {
  const lowerMsg = message.toLowerCase();

  // Phase 相关
  const phaseMatch = message.match(/phase\s*(\d+)/i);
  const phase = phaseMatch ? `Phase ${phaseMatch[1]}` : undefined;

  // 检测 milestone 生命周期
  if (/\bstart\s+(v?\d+\.\d+|milestone)/i.test(message) || /启动.*milestone/i.test(message)) {
    return { isMilestone: true, phase, type: 'start' };
  }
  if (/\b(close|complete|finish)\s+(v?\d+\.\d+|milestone)/i.test(message) || /完成.*milestone/i.test(message)) {
    return { isMilestone: true, phase, type: 'close' };
  }
  if (/\barchive\b/i.test(message) || /归档/i.test(message)) {
    return { isMilestone: true, phase, type: 'archive' };
  }

  // 检测 planning 文档变更
  if (/planning:/i.test(message) || /\.planning\//i.test(message)) {
    return { isMilestone: true, phase, type: 'progress' };
  }

  return { isMilestone: false };
}

/**
 * 从 commits 中提取 milestone 信息
 */
function extractMilestoneInfo(commits: GitCommit[]): { milestoneName?: string; hasCompleteMilestone: boolean } {
  // 查找 milestone close/start 的 commit
  for (const commit of commits) {
    const milestoneMatch = commit.message.match(/v?(\d+\.\d+)\s*milestone/i);
    if (milestoneMatch) {
      const closeMatch = /\b(close|complete|finish)\b/i.test(commit.message);
      return {
        milestoneName: `v${milestoneMatch[1]}`,
        hasCompleteMilestone: closeMatch
      };
    }
  }

  return { hasCompleteMilestone: false };
}

/**
 * 按 milestone/phase 分组 commits
 */
function groupCommitsByMilestone(commits: GitCommit[]): Map<string, MilestoneGroup> {
  const groups = new Map<string, MilestoneGroup>();

  for (const commit of commits) {
    const milestoneInfo = detectMilestoneKeywords(commit.message);

    if (milestoneInfo.isMilestone && milestoneInfo.phase) {
      const key = milestoneInfo.phase;
      const existing = groups.get(key);
      if (existing) {
        existing.commits.push(commit);
      } else {
        groups.set(key, {
          name: key,
          description: `${key} Delivery`,
          commits: [commit]
        });
      }
    }
  }

  return groups;
}

/**
 * 检查是否为大规模发布，需要额外注意
 */
export function isLargeRelease(commits: GitCommit[]): boolean {
  return commits.length > LARGE_RELEASE_COMMIT_THRESHOLD;
}

/**
 * 生成大规模发布警告
 */
export function formatLargeReleaseWarning(commits: GitCommit[]): string[] {
  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.yellow('⚠️  检测到大规模发布'));
  lines.push(chalk.gray(`   本次发布包含 ${commits.length} 个 commits，超过阈值 ${LARGE_RELEASE_COMMIT_THRESHOLD}`));

  // 分析 milestone 分布
  const milestoneGroups = groupCommitsByMilestone(commits);
  if (milestoneGroups.size > 0) {
    lines.push(chalk.gray('   发现以下 Phase/Milestone 分组:'));
    for (const [name, group] of milestoneGroups) {
      lines.push(chalk.gray(`     - ${name}: ${group.commits.length} commits`));
    }
  }

  const { milestoneName, hasCompleteMilestone } = extractMilestoneInfo(commits);
  if (milestoneName) {
    lines.push(chalk.gray(`   Milestone: ${milestoneName} ${hasCompleteMilestone ? '(已完成)' : '(进行中)'}`));
  }

  lines.push(chalk.gray('   建议: 请仔细 review 生成的 CHANGELOG，确保 milestone 变更已完整记录'));
  lines.push('');

  return lines;
}

function updateFileByRules(rules: ReplacementRule[]): void {
  for (const rule of rules) {
    if (!existsSync(rule.file)) {
      throw new Error(`缺少版本同步文件: ${rule.file}`);
    }

    const content = readFileSync(rule.file, 'utf-8');
    if (!rule.pattern.test(content)) {
      throw new Error(`无法在 ${rule.file} 中定位版本占位符`);
    }

    const updated = content.replace(rule.pattern, rule.replacement);
    writeFileSync(rule.file, updated, 'utf-8');
  }
}

function syncAIDocsVersion(version: string): void {
  const versionStr = version.replace(/^v/, '');
  const quotedVersion = `$1${versionStr}$3`;

  updateFileByRules([
    {
      file: 'AI_GUIDE.md',
      pattern: /(> 版本:\s*)\d+\.\d+\.\d+(?:-[\w.]+)?/m,
      replacement: `$1${versionStr}`
    },
    {
      file: 'llms.txt',
      pattern: /(> 版本:\s*)\d+\.\d+\.\d+(?:-[\w.]+)?/m,
      replacement: `$1${versionStr}`
    },
    {
      file: 'AI_DISCOVERY.md',
      pattern: /("version"\s*:\s*")(\d+\.\d+\.\d+(?:-[\w.]+)?)(")/,
      replacement: quotedVersion
    },
    {
      file: 'ai-document-index.yaml',
      pattern: /(version:\s*")(\d+\.\d+\.\d+(?:-[\w.]+)?)(")/,
      replacement: quotedVersion
    },
    {
      file: 'ai-document-index.yaml',
      pattern: /(current:\s*")(\d+\.\d+\.\d+(?:-[\w.]+)?)(")/,
      replacement: quotedVersion
    },
    {
      file: 'ai-document-index.yaml',
      pattern: /(min_supported:\s*")(\d+\.\d+\.\d+(?:-[\w.]+)?)(")/,
      replacement: quotedVersion
    }
  ]);
}

function classifyCommitSection(type: string): string {
  const normalized = type.toLowerCase();

  if (['feat', 'feature', 'enhance', 'improvement'].some(item => normalized.includes(item))) {
    return '### 🚀 New Features';
  }
  if (['fix', 'bugfix', 'hotfix'].some(item => normalized.includes(item))) {
    return '### 🐛 Bug Fixes';
  }
  if (normalized.includes('docs')) {
    return '### 📚 Documentation';
  }
  if (normalized.includes('refactor')) {
    return '### ♻️ Refactors';
  }

  return '### 🔧 Maintenance';
}

function buildReleaseTitle(analyzeResult?: AnalyzeResult): string {
  if (!analyzeResult) {
    return 'Automated Ship Release';
  }

  if (analyzeResult.summary.features > 0) {
    return 'Ship Workflow Release';
  }
  if (analyzeResult.summary.bugfixes > 0) {
    return 'Ship Workflow Fixes';
  }
  if (analyzeResult.summary.docs > 0) {
    return 'Documentation Sync';
  }

  return 'Automated Ship Release';
}

function formatCommitLine(commit: GitCommit): string {
  if (commit.scope) {
    return `- **${commit.scope}**: ${commit.message}`;
  }
  return `- ${commit.message}`;
}

function buildChangelogSections(analyzeResult?: AnalyzeResult): string[] {
  if (!analyzeResult || analyzeResult.commits.length === 0) {
    return [
      '### 🔧 Maintenance',
      '',
      '- Automated release triggered by `codemap ship`'
    ];
  }

  const { commits } = analyzeResult;
  const lines: string[] = [];

  // 1. 检查是否为大规模发布，添加 milestone 摘要
  const { milestoneName, hasCompleteMilestone } = extractMilestoneInfo(commits);
  if (milestoneName && hasCompleteMilestone) {
    lines.push(`### 🏗️ ${milestoneName} Milestone`);
    lines.push('');
    lines.push(`${milestoneName} milestone 完成。`);
    lines.push('');
  }

  // 2. 按 Phase 分组（如果存在）
  const phaseGroups = groupCommitsByMilestone(commits);
  if (phaseGroups.size > 0) {
    // 按 Phase 编号排序
    const sortedPhases = Array.from(phaseGroups.entries())
      .sort((a, b) => {
        const numA = parseInt(a[0].match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b[0].match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });

    for (const [phaseName, group] of sortedPhases) {
      lines.push(`#### ${group.description}`);
      lines.push('');
      for (const commit of group.commits.slice(0, 10)) { // 限制每个 phase 显示 10 条
        lines.push(formatCommitLine(commit));
      }
      if (group.commits.length > 10) {
        lines.push(`- ... and ${group.commits.length - 10} more commits`);
      }
      lines.push('');
    }
  }

  // 3. 剩余 commits 按类型分组
  const remainingCommits = commits.filter(c => !detectMilestoneKeywords(c.message).isMilestone);
  const typeGroups = new Map<string, string[]>();

  for (const commit of remainingCommits) {
    const section = classifyCommitSection(commit.type);
    const sectionLines = typeGroups.get(section) ?? [];
    sectionLines.push(formatCommitLine(commit));
    typeGroups.set(section, sectionLines);
  }

  // 4. 按优先级输出类型分组
  const priority = ['### 🚀 New Features', '### 🐛 Bug Fixes', '### 📚 Documentation', '### ♻️ Refactors', '### 🔧 Maintenance'];
  for (const section of priority) {
    const sectionLines = typeGroups.get(section);
    if (sectionLines && sectionLines.length > 0) {
      lines.push(section);
      lines.push('');
      lines.push(...sectionLines);
      lines.push('');
    }
  }

  return lines;
}

function ensureChangelogEntry(version: string, analyzeResult?: AnalyzeResult): void {
  const versionStr = version.replace(/^v/, '');
  const existing = existsSync('CHANGELOG.md')
    ? readFileSync('CHANGELOG.md', 'utf-8')
    : CHANGELOG_HEADER;

  if (new RegExp(`^## \\[${versionStr.replace(/\./g, '\\.')}]`, 'm').test(existing)) {
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const title = buildReleaseTitle(analyzeResult);
  const sections = buildChangelogSections(analyzeResult).join('\n').trimEnd();
  const entry = `## [${versionStr}] - ${date} - ${title}\n\n${sections}\n\n`;

  const content = existing.startsWith('# Changelog')
    ? existing
    : `${CHANGELOG_HEADER}${existing.trimStart()}\n`;

  const prefix = content.startsWith(CHANGELOG_HEADER)
    ? CHANGELOG_HEADER
    : '# Changelog\n\n';

  const remainder = content.startsWith(prefix) ? content.slice(prefix.length) : content;
  writeFileSync('CHANGELOG.md', `${prefix}${entry}${remainder.replace(/^\n+/, '')}`, 'utf-8');
}

function resolveRepoSlug(): string | undefined {
  try {
    return execSync('git remote get-url origin', { encoding: 'utf-8' })
      .trim()
      .replace(/.*github\.com[/:]/, '')
      .replace(/\.git$/, '');
  } catch {
    return undefined;
  }
}

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

function shouldFallbackToHttps(errorText: string): boolean {
  return /port 22|Connection timed out|Could not read from remote repository/i.test(errorText);
}

function pushReleaseRefs(tagName: string, repo?: string): void {
  const baseOptions = {
    stdio: 'pipe' as const,
    encoding: 'utf-8' as const,
    maxBuffer: COMMAND_MAX_BUFFER
  };

  try {
    execSync(`git push origin HEAD tag ${tagName}`, baseOptions);
    return;
  } catch (error) {
    const errorText = extractCommandError(error);
    if (!repo || !shouldFallbackToHttps(errorText)) {
      throw error;
    }

    console.log(chalk.yellow('  SSH push 失败，回退到 HTTPS token push...'));
    execSync(
      `TOKEN=$(gh auth token) && BASIC=$(printf 'x-access-token:%s' "$TOKEN" | base64 | tr -d '\\n') && git -c http.extraheader="AUTHORIZATION: basic $BASIC" push https://github.com/${repo}.git HEAD tag ${tagName}`,
      baseOptions
    );
  }
}

export interface PublishResult {
  success: boolean;
  version: string;
  tagName: string;
  versionCommitted: boolean;
  tagCreated: boolean;
  pushed: boolean;
  headSha?: string;
  pushedAtMs?: number;
  repo?: string;
  releaseUrl?: string;
  error?: string;
}

export async function publish(version: string, options: PublishOptions = {}): Promise<PublishResult> {
  const dryRun = options.dryRun ?? false;
  const tagName = `v${version.replace(/^v/, '')}`;
  const result: PublishResult = {
    success: false,
    version,
    tagName,
    versionCommitted: false,
    tagCreated: false,
    pushed: false
  };

  if (dryRun) {
    console.log(chalk.gray('  [dry-run] 跳过实际发布'));
    return {
      ...result,
      success: true,
      versionCommitted: true,
      tagCreated: true,
      pushed: true
    };
  }

  try {
    // 1. 更新 package.json 版本
    console.log(chalk.gray('  更新 package.json 版本...'));
    execSync(`npm version ${version} --no-git-tag-version`, { stdio: 'pipe' });

    // 2. 同步 AI 文档版本
    console.log(chalk.gray('  同步 AI 文档版本...'));
    syncAIDocsVersion(version);

    // 3. 生成 CHANGELOG 条目
    console.log(chalk.gray('  生成 CHANGELOG 条目...'));
    ensureChangelogEntry(version, options.analyzeResult);

    // 4. 提交版本更新（必须在创建 tag 之前）
    console.log(chalk.gray('  提交版本更新...'));
    const filesToAdd = [
      'package.json',
      'package-lock.json',
      'AI_GUIDE.md',
      'AI_DISCOVERY.md',
      'llms.txt',
      'ai-document-index.yaml',
      'CHANGELOG.md'
    ].filter(file => existsSync(file));
    execSync(`git add ${filesToAdd.join(' ')}`, { stdio: 'pipe' });
    execSync(`git commit -m "[CONFIG] version: bump to v${version}"`, { stdio: 'pipe' });
    result.versionCommitted = true;
    result.headSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    result.repo = resolveRepoSlug();
    if (result.repo) {
      result.releaseUrl = `https://github.com/${result.repo}/releases/tag/${tagName}`;
    }

    // 5. 创建 git tag（在 commit 之后）
    console.log(chalk.gray('  创建 git tag...'));
    execSync(`git tag ${tagName}`, { stdio: 'pipe' });

    result.tagCreated = true;

    // 6. 推送版本提交和 tag，由 GitHub Actions 执行实际 npm 发布
    console.log(chalk.gray('  推送发布提交与 tag...'));
    pushReleaseRefs(tagName, result.repo);
    result.pushed = true;
    result.pushedAtMs = Date.now();

    result.success = result.versionCommitted && result.tagCreated && result.pushed;
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

export function formatPublishOutput(result: PublishResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push('发布成功!');
    lines.push(`  版本: v${result.version}`);
    lines.push(`  ✅ 版本提交已创建`);
    lines.push(`  ✅ Git tag 已创建`);
    lines.push(`  ✅ 已推送到远程，等待 GitHub Actions 发布`);
  } else {
    lines.push('发布部分成功:');
    lines.push(`  版本: v${result.version}`);
    lines.push(`  ${result.versionCommitted ? '✅' : '❌'} 版本提交`);
    lines.push(`  ${result.tagCreated ? '✅' : '❌'} Git tag 已创建`);
    lines.push(`  ${result.pushed ? '✅' : '❌'} 已推送到远程`);
    if (result.error) {
      lines.push(`  错误: ${result.error}`);
    }
  }

  if (result.releaseUrl) {
    lines.push(`  预期 Release: ${result.releaseUrl}`);
  }

  return lines.join('\n');
}
