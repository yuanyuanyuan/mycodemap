// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Step 2: 根据 commit 分析结果计算版本号

import { execSync } from 'child_process';
import { AnalyzeResult } from './analyzer.js';
import { VersionType, shouldBumpVersion } from './rules/version-rules.js';

export interface VersionResult {
  currentVersion: string;
  suggestedVersion: string;
  versionType: VersionType;
  reason: string;
  shouldRelease: boolean;
}

function parseCurrentVersion(): string {
  try {
    // 从 package.json 读取版本
    const pkg = execSync('node -p "require(\'./package.json\').version"', {
      encoding: 'utf-8'
    }).trim();
    return pkg;
  } catch {
    // 尝试从 git tag 获取
    try {
      const tags = execSync('git tag --sort=-version:refname | head -1', {
        encoding: 'utf-8'
      }).trim();
      return tags.replace(/^v/, '');
    } catch {
      return '0.0.0';
    }
  }
}

function bumpVersion(version: string, type: VersionType): string {
  const parts = version.split('.').map(p => parseInt(p, 10) || 0);

  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    case 'none':
    default:
      return version;
  }
}

function getVersionReason(type: VersionType, result: AnalyzeResult): string {
  switch (type) {
    case 'major':
      return '检测到破坏性变更 (breaking changes)';
    case 'minor':
      return `包含 ${result.summary.features} 个新功能`;
    case 'patch':
      return `包含 ${result.summary.bugfixes} 个 bug 修复`;
    case 'none':
    default:
      if (result.changedFiles.length > 0) {
        return '有代码变更但无功能性 commit';
      }
      return '无可发布的变更';
  }
}

export async function calculateVersion(analyzeResult: AnalyzeResult): Promise<VersionResult> {
  const currentVersion = parseCurrentVersion();
  const versionType = analyzeResult.versionType;
  const shouldRelease = shouldBumpVersion(analyzeResult.commits, analyzeResult.changedFiles);

  let suggestedVersion = currentVersion;
  let finalVersionType: VersionType = 'none';

  // 强制 major 如果有破坏性变更
  if (analyzeResult.breakingChanges) {
    finalVersionType = 'major';
    suggestedVersion = bumpVersion(currentVersion, 'major');
  } else if (shouldRelease) {
    finalVersionType = versionType;
    suggestedVersion = bumpVersion(currentVersion, versionType);
  }

  return {
    currentVersion,
    suggestedVersion,
    versionType: finalVersionType,
    reason: getVersionReason(finalVersionType, analyzeResult),
    shouldRelease
  };
}

export function formatVersionOutput(result: VersionResult): string {
  const lines: string[] = [];

  if (!result.shouldRelease) {
    lines.push(`推荐版本: 无需发布`);
    lines.push(`  原因: ${result.reason}`);
  } else {
    const typeLabel = result.versionType.toUpperCase();
    lines.push(`推荐版本: v${result.suggestedVersion} (${result.versionType})`);
    lines.push(`  原因: ${result.reason}`);
  }

  return lines.join('\n');
}
