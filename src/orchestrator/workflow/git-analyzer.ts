/**
 * [META] since:2026-03 | owner:codemap-team | stable:false
 * [WHY] @version 2.5
 */

/**
 * 工作流 Git 分析器
 * 根据工作流阶段执行 Git 分析
 *
 * @module WorkflowGitAnalyzer
 * @version 2.5
 *
 * 设计参考: REFACTOR_GIT_ANALYZER_DESIGN.md §10.2
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { WorkflowPhase } from './types.js';
import type { WorkflowContext } from './types.js';

const execFileAsync = promisify(execFile);

// ============================================
// 类型定义
// ============================================

/**
 * Git 分析配置
 */
export interface GitAnalysisConfig {
  /** 分析类型 */
  analysisType: GitAnalysisType;
  /** 最大提交数 */
  maxCommits: number;
  /** 是否包含历史 */
  includeHistory: boolean;
  /** 时间窗口（如 '30d'） */
  timeWindow?: string;
  /** 文件模式 */
  extractPatterns?: string[];
}

/**
 * Git 分析类型
 */
export type GitAnalysisType =
  | 'none'              // 不分析
  | 'find-similar-commits'  // 查找相似提交
  | 'file-history'      // 文件历史
  | 'heat-analysis'     // 热度分析
  | 'validate-commit'   // 验证提交
  | 'full-analysis';    // 完整分析

/**
 * 提交信息
 */
export interface CommitInfo {
  hash: string;
  message: string;
  date: Date;
  author: string;
  files: string[];
  tag?: CommitTag;
}

/**
 * Commit Tag
 */
export interface CommitTag {
  type: 'BUGFIX' | 'FEATURE' | 'REFACTOR' | 'CONFIG' | 'DOCS' | 'DELETE' | 'UNKNOWN';
  scope: string;
  subject: string;
}

/**
 * 文件热度
 */
export interface FileHeat {
  file: string;
  freq30d: number;      // 30天修改次数
  lastType: string;     // 最后提交标签
  lastDate: Date | null;
  stability: boolean;   // 是否稳定
}

/**
 * 风险评分
 */
export interface GitRiskScore {
  level: 'high' | 'medium' | 'low';
  score: number;
  gravity: number;
  heat: FileHeat;
  impact: number;
  riskFactors: string[];
}

/**
 * Git 分析结果
 */
export interface GitAnalysisResult {
  type: GitAnalysisType;
  commits?: CommitInfo[];
  fileHeat?: FileHeat[];
  riskScore?: GitRiskScore;
  validation?: {
    valid: boolean;
    errors?: string[];
  };
}

// ============================================
// 阶段 Git 分析配置
// ============================================

/**
 * 工作流阶段与 Git 分析的映射
 */
const PHASE_GIT_CONFIG: Record<WorkflowPhase, GitAnalysisConfig> = {
  'reference': {
    analysisType: 'find-similar-commits',
    maxCommits: 10,
    includeHistory: true,
    extractPatterns: ['*.ts'],
  },
  'impact': {
    analysisType: 'file-history',
    maxCommits: 20,
    includeHistory: true,
    extractPatterns: ['*.ts'],
  },
  'risk': {
    analysisType: 'heat-analysis',
    maxCommits: 30,
    includeHistory: true,
    timeWindow: '30d',
  },
  'implementation': {
    analysisType: 'none',
    maxCommits: 0,
    includeHistory: false,
  },
  'commit': {
    analysisType: 'validate-commit',
    maxCommits: 1,
    includeHistory: false,
  },
  'ci': {
    analysisType: 'full-analysis',
    maxCommits: 50,
    includeHistory: true,
  },
};

// ============================================
// Commit Tag 正则
// ============================================

const COMMIT_TAG_REGEX = /^\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\]\s*(.+?)?:(.+)$/;

const TAG_DESCRIPTIONS: Record<string, string> = {
  'BUGFIX': '修复问题',
  'FEATURE': '新功能',
  'REFACTOR': '重构',
  'CONFIG': '配置变更',
  'DOCS': '文档',
  'DELETE': '删除代码',
};

// ============================================
// WorkflowGitAnalyzer 类
// ============================================

export class WorkflowGitAnalyzer {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * 根据当前阶段执行 Git 分析
   *
   * @param phase - 当前工作流阶段
   * @param targetFiles - 目标文件列表
   * @param context - 工作流上下文
   * @returns Git 分析结果
   */
  async analyzeForPhase(
    phase: WorkflowPhase,
    targetFiles: string[],
    context: WorkflowContext
  ): Promise<GitAnalysisResult> {
    const config = PHASE_GIT_CONFIG[phase];

    if (config.analysisType === 'none') {
      return { type: 'none' };
    }

    // 从上下文获取历史结果（避免重复分析）
    const cachedHistory = this.getCachedHistory(context, phase);
    if (cachedHistory && phase !== 'risk') {
      return { type: config.analysisType, commits: cachedHistory };
    }

    // 执行新的分析
    switch (config.analysisType) {
      case 'find-similar-commits':
        return this.findSimilarCommits(context.task, targetFiles, config);

      case 'file-history':
        return this.analyzeFileHistory(targetFiles, config);

      case 'heat-analysis':
        return this.analyzeFileHeat(targetFiles, config);

      case 'validate-commit':
        return this.validateLastCommit();

      case 'full-analysis':
        return this.performFullAnalysis(targetFiles, config);

      default:
        return { type: 'none' };
    }
  }

  /**
   * 查找相似提交
   */
  private async findSimilarCommits(
    task: string,
    files: string[],
    config: GitAnalysisConfig
  ): Promise<GitAnalysisResult> {
    const keywords = task.split(' ').slice(0, 5); // 最多 5 个关键词
    const commits = await this.searchByKeywords(keywords, config.maxCommits);

    // 合并文件搜索结果
    if (files.length > 0) {
      const fileCommits = await this.searchByFiles(files, config.maxCommits);
      commits.push(...fileCommits);
    }

    // 去重并按日期排序
    const uniqueCommits = this.deduplicateCommits(commits);

    return {
      type: 'find-similar-commits',
      commits: uniqueCommits.slice(0, config.maxCommits),
    };
  }

  /**
   * 分析文件历史
   */
  private async analyzeFileHistory(
    files: string[],
    config: GitAnalysisConfig
  ): Promise<GitAnalysisResult> {
    const commits = await this.searchByFiles(files, config.maxCommits);

    return {
      type: 'file-history',
      commits: this.deduplicateCommits(commits),
    };
  }

  /**
   * 分析文件热度
   */
  private async analyzeFileHeat(
    files: string[],
    config: GitAnalysisConfig
  ): Promise<GitAnalysisResult> {
    const fileHeat: FileHeat[] = [];

    for (const file of files) {
      const heat = await this.getFileHeat(file, config.timeWindow);
      fileHeat.push(heat);
    }

    // 计算综合风险评分
    const riskScore = this.calculateRiskScore(fileHeat);

    return {
      type: 'heat-analysis',
      fileHeat,
      riskScore,
    };
  }

  /**
   * 验证最近提交
   */
  private async validateLastCommit(): Promise<GitAnalysisResult> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['log', '-1', '--format=%H|%s'],
        { cwd: this.projectRoot }
      );

      const [hash, message] = stdout.trim().split('|');
      const validation = this.validateCommitMessage(message);

      return {
        type: 'validate-commit',
        validation,
      };
    } catch (error) {
      return {
        type: 'validate-commit',
        validation: {
          valid: false,
          errors: ['无法获取最近提交'],
        },
      };
    }
  }

  /**
   * 执行完整分析
   */
  private async performFullAnalysis(
    files: string[],
    config: GitAnalysisConfig
  ): Promise<GitAnalysisResult> {
    // 合并所有分析类型
    const commits = await this.searchByFiles(files, config.maxCommits);
    const fileHeat: FileHeat[] = [];

    for (const file of files) {
      const heat = await this.getFileHeat(file, config.timeWindow);
      fileHeat.push(heat);
    }

    const riskScore = this.calculateRiskScore(fileHeat);

    return {
      type: 'full-analysis',
      commits: this.deduplicateCommits(commits),
      fileHeat,
      riskScore,
    };
  }

  /**
   * 按关键词搜索提交
   */
  private async searchByKeywords(
    keywords: string[],
    limit: number
  ): Promise<CommitInfo[]> {
    // 清理关键词
    const sanitizedKeywords = keywords
      .slice(0, 5)
      .map((k) => k.slice(0, 100))
      .filter((k) => /^[a-zA-Z0-9_\-\.]+$/.test(k));

    if (sanitizedKeywords.length === 0) return [];

    const pattern = sanitizedKeywords.join('|');

    try {
      const { stdout } = await execFileAsync(
        'git',
        [
          'log', '--all', `--grep=${pattern}`,
          '--format=%H|%s|%ai|%an',
          '-n', String(limit),
        ],
        { cwd: this.projectRoot }
      );

      return this.parseGitLog(stdout);
    } catch {
      return [];
    }
  }

  /**
   * 按文件搜索提交
   */
  private async searchByFiles(
    files: string[],
    limit: number
  ): Promise<CommitInfo[]> {
    const allCommits: CommitInfo[] = [];

    for (const file of files) {
      try {
        const { stdout } = await execFileAsync(
          'git',
          [
            'log', '--follow',
            '--format=%H|%s|%ai|%an', '--name-only',
            '-n', String(limit), '--', file,
          ],
          { cwd: this.projectRoot }
        );

        const fileCommits = this.parseGitLogWithFiles(stdout);
        allCommits.push(...fileCommits);
      } catch {
        // 单文件查询失败时跳过
      }
    }

    return this.deduplicateCommits(allCommits);
  }

  /**
   * 获取文件热度
   */
  private async getFileHeat(
    file: string,
    timeWindow: string = '30d'
  ): Promise<FileHeat> {
    try {
      // 获取指定时间窗口内的提交数
      const { stdout: log } = await execFileAsync(
        'git',
        [
          'log', `--since="${timeWindow}"`,
          '--pretty=format:%s',
          '--', file,
        ],
        { cwd: this.projectRoot }
      );

      const commits = log.split('\n').filter(Boolean);
      const last = commits[0] || '';
      const typeMatch = last.match(/^\[(\w+)\]/);

      // 获取最后修改日期
      const { stdout: dateStr } = await execFileAsync(
        'git',
        ['log', '-1', '--pretty=format:%ci', '--', file],
        { cwd: this.projectRoot }
      );

      return {
        file,
        freq30d: commits.length,
        lastType: typeMatch ? typeMatch[1] : 'UNKNOWN',
        lastDate: dateStr ? new Date(dateStr.split(' ')[0]) : null,
        stability: commits.length < 3, // 30天内少于3次视为稳定
      };
    } catch {
      return {
        file,
        freq30d: 0,
        lastType: 'NEW',
        lastDate: null,
        stability: true,
      };
    }
  }

  /**
   * 计算风险评分
   */
  private calculateRiskScore(fileHeat: FileHeat[]): GitRiskScore {
    // 计算各维度分数
    const totalFreq = fileHeat.reduce((sum, f) => sum + f.freq30d, 0);
    const avgFreq = totalFreq / (fileHeat.length || 1);
    const freqScore = Math.min(avgFreq / 10, 1);

    // 标签风险权重
    const tagWeights: Record<string, number> = {
      'BUGFIX': 0.9,
      'REFACTOR': 0.8,
      'FEATURE': 0.7,
      'CONFIG': 0.5,
      'DOCS': 0.2,
      'DELETE': 0.1,
      'UNKNOWN': 0.5,
    };

    const lastTypes = fileHeat.map((f) => f.lastType);
    const avgTagRisk = lastTypes.reduce(
      (sum, t) => sum + (tagWeights[t] || 0.5),
      0
    ) / (lastTypes.length || 1);

    // 稳定性调整
    const unstableCount = fileHeat.filter((f) => !f.stability).length;
    const unstableRatio = unstableCount / (fileHeat.length || 1);
    const stabilityBoost = unstableRatio * 0.15;

    // 综合评分
    const totalScore = Math.min(
      Math.max(freqScore * 0.15 + avgTagRisk * 0.10 + stabilityBoost, 0),
      1
    );

    // 风险因素
    const riskFactors: string[] = [];
    if (freqScore > 0.7) riskFactors.push('近期频繁修改');
    if (avgTagRisk > 0.7) riskFactors.push('历史问题较多');
    if (unstableCount > 0) riskFactors.push('模块不稳定');

    return {
      level: totalScore > 0.7 ? 'high' : totalScore > 0.4 ? 'medium' : 'low',
      score: totalScore,
      gravity: 0, // 由依赖分析提供
      heat: fileHeat[0] || {
        file: '',
        freq30d: 0,
        lastType: 'UNKNOWN',
        lastDate: null,
        stability: true,
      },
      impact: 0, // 由依赖分析提供
      riskFactors,
    };
  }

  /**
   * 验证提交信息格式
   */
  private validateCommitMessage(message: string): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const firstLine = message.split('\n')[0].trim();

    const match = firstLine.match(COMMIT_TAG_REGEX);
    if (!match) {
      errors.push(this.formatCommitError('提交信息必须以大写标签开头'));
    } else {
      const [, tag, scope, subject] = match;

      if (!TAG_DESCRIPTIONS[tag]) {
        errors.push(`无效的标签: [${tag}]`);
      }

      if (!scope || scope.trim() === '') {
        errors.push('scope 不能为空，格式: [TAG] scope: message');
      }

      if (!subject || subject.trim() === '') {
        errors.push('提交描述不能为空');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 格式化提交错误信息
   */
  private formatCommitError(msg: string): string {
    const tags = Object.entries(TAG_DESCRIPTIONS)
      .map(([tag, desc]) => `   [${tag}] ${desc}`)
      .join('\n');

    return `${msg}\n\n允许的格式:\n${tags}\n\n示例:\n   [BUGFIX] git-analyzer: fix risk score calculation`;
  }

  /**
   * 解析 Git 日志
   */
  private parseGitLog(stdout: string): CommitInfo[] {
    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, message, date, author] = line.split('|');
        return {
          hash,
          message,
          date: new Date(date),
          author,
          files: [],
          tag: this.parseCommitTag(message),
        };
      });
  }

  /**
   * 解析带文件的 Git 日志
   */
  private parseGitLogWithFiles(stdout: string): CommitInfo[] {
    const commits: CommitInfo[] = [];
    const blocks = stdout.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n').filter((l) => l.trim());
      if (lines.length === 0) continue;

      const header = lines[0];
      const [hash, message, date, author] = header.split('|');
      const files = lines.slice(1);

      commits.push({
        hash,
        message,
        date: new Date(date),
        author,
        files,
        tag: this.parseCommitTag(message),
      });
    }

    return commits;
  }

  /**
   * 解析 Commit Tag
   */
  private parseCommitTag(message: string): CommitTag | undefined {
    const match = message.match(COMMIT_TAG_REGEX);
    if (!match) return undefined;

    return {
      type: match[1] as CommitTag['type'],
      scope: match[2]?.trim() || 'general',
      subject: match[3].trim(),
    };
  }

  /**
   * 去重提交
   */
  private deduplicateCommits(commits: CommitInfo[]): CommitInfo[] {
    const seen = new Map<string, CommitInfo>();

    for (const commit of commits) {
      if (!seen.has(commit.hash)) {
        seen.set(commit.hash, commit);
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }

  /**
   * 从上下文获取缓存的历史
   */
  private getCachedHistory(
    context: WorkflowContext,
    phase: WorkflowPhase
  ): CommitInfo[] | undefined {
    // 尝试从 impact 阶段的产物获取
    const impactArtifacts = context.artifacts.get('impact');
    if (impactArtifacts?.metadata?.gitHistory) {
      return impactArtifacts.metadata.gitHistory as CommitInfo[];
    }
    return undefined;
  }

  /**
   * 获取阶段的 Git 分析配置
   */
  getPhaseConfig(phase: WorkflowPhase): GitAnalysisConfig {
    return PHASE_GIT_CONFIG[phase];
  }

  /**
   * 获取所有阶段的 Git 分析配置
   */
  getAllConfigs(): Record<WorkflowPhase, GitAnalysisConfig> {
    return { ...PHASE_GIT_CONFIG };
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建工作流 Git 分析器实例
 */
export function createWorkflowGitAnalyzer(projectRoot?: string): WorkflowGitAnalyzer {
  return new WorkflowGitAnalyzer(projectRoot);
}

/**
 * 快速分析当前阶段（便捷函数）
 */
export async function analyzePhase(
  phase: WorkflowPhase,
  targetFiles: string[],
  context: WorkflowContext,
  projectRoot?: string
): Promise<GitAnalysisResult> {
  const analyzer = createWorkflowGitAnalyzer(projectRoot);
  return analyzer.analyzeForPhase(phase, targetFiles, context);
}

export default WorkflowGitAnalyzer;
