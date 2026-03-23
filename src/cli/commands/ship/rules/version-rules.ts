// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] 定义版本号计算规则，支持 conventional commits 规范

export interface VersionRuleConfig {
  bump: {
    major: string[];
    minor: string[];
    patch: string[];
    none: string[];
  };
  noBumpPaths: string[];
  riskyModules: string[];
  breakingPatterns: RegExp[];
}

export const versionRules: VersionRuleConfig = {
  // 版本递增规则
  bump: {
    major: ['breaking', 'breaking-change', 'BREAKING'],
    minor: ['feat', 'feature', 'enhance', 'improvement'],
    patch: ['fix', 'bugfix', 'hotfix'],
    none: ['docs', 'style', 'refactor', 'test', 'chore', 'ci', 'perf', 'WIP']
  },

  // 不触发版本变更的文件
  noBumpPaths: [
    '*.md',
    '*.txt',
    'LICENSE',
    '.gitignore',
    'docs/**',
    '.github/**',
    '*.lock'
  ],

  // 高风险模块（修改时降低置信度）
  riskyModules: [
    'src/core/**',
    'src/parser/**',
    'src/domain/entities/**'
  ],

  // 破坏性变更检测模式
  breakingPatterns: [
    /breaking[_-]change/i,
    /^.+!:/, // feat!:
    /BREAKING/i
  ]
};

export type VersionType = 'major' | 'minor' | 'patch' | 'none';

export interface CommitAnalysis {
  type: string;
  scope?: string;
  message: string;
  hash: string;
  isBreaking: boolean;
  files?: string[];
}

export function calculateVersionType(commits: CommitAnalysis[]): VersionType {
  let highestVersion: VersionType = 'none';

  for (const commit of commits) {
    const type = commit.type.toLowerCase();

    // 检查破坏性变更
    if (commit.isBreaking || versionRules.breakingPatterns.some(p => p.test(commit.message))) {
      return 'major';
    }

    // 检查 feat 类型 -> minor
    if (versionRules.bump.minor.some(t => type.includes(t)) && highestVersion === 'none') {
      highestVersion = 'minor';
    }

    // 检查 fix 类型 -> patch
    if (versionRules.bump.patch.some(t => type.includes(t)) && highestVersion === 'none') {
      highestVersion = 'patch';
    }
  }

  return highestVersion;
}

export function shouldBumpVersion(commits: CommitAnalysis[], changedFiles: string[]): boolean {
  // 如果有影响代码功能的 commit，触发版本更新
  const versionType = calculateVersionType(commits);
  if (versionType !== 'none') {
    return true;
  }

  // 检查是否有代码文件变更
  const codeFilePattern = /\.(ts|js|tsx|jsx|py|go)$/;
  return changedFiles.some(f => codeFilePattern.test(f) &&
    !versionRules.noBumpPaths.some(p => matchPath(f, p)));
}

function matchPath(file: string, pattern: string): boolean {
  if (pattern.includes('**')) {
    const prefix = pattern.replace('/**', '');
    return file.startsWith(prefix);
  }
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return regex.test(file);
  }
  return file === pattern || file.endsWith('/' + pattern);
}
