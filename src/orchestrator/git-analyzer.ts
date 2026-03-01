/**
 * Git 分析器
 * 分析文件的 Git 提交历史，评估修改风险
 */

import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import { HeatScore } from './types';

// 将 execFile 转换为 Promise 版本
const execFileAsync = promisify(execFile);

/**
 * 风险等级类型
 */
export type RiskLevel = 'high' | 'medium' | 'low';

/**
 * 提交标签类型
 */
export type CommitTagType = 'BUGFIX' | 'FEATURE' | 'REFACTOR' | 'CONFIG' | 'DOCS' | 'DELETE' | 'UNKNOWN';

/**
 * 提交信息接口
 */
export interface CommitInfo {
  /** 提交哈希 */
  hash: string;
  /** 提交信息 */
  message: string;
  /** 提交日期 */
  date: Date;
  /** 提交作者 */
  author: string;
  /** 修改的文件列表 */
  files: string[];
  /** 解析的 TAG */
  tag?: CommitTag;
}

/**
 * 提交标签接口
 */
export interface CommitTag {
  /** 标签类型 */
  type: CommitTagType;
  /** 模块/作用域 */
  scope: string;
  /** 提交描述 */
  subject: string;
}

/**
 * 风险评分结果接口
 */
export interface RiskScore {
  /** 风险等级 */
  level: RiskLevel;
  /** 综合分数 (0-1) */
  score: number;
  /** 依赖复杂度评分 */
  gravity: number;
  /** 热度评分 */
  heat: HeatScore;
  /** 影响面评分 */
  impact: number;
  /** 风险因素说明 */
  riskFactors: string[];
}

/**
 * AI 饲料接口
 */
export interface AIFeed {
  /** 文件路径 */
  file: string;
  /** 依赖复杂度 (出度+入度) */
  gravity: number;
  /** 热度评分 */
  heat: HeatScore;
  /** 元数据 */
  meta: {
    since?: string;
    owner?: string;
    stable?: boolean;
    why?: string;
  };
  /** 依赖的文件 */
  deps: string[];
  /** 被哪些文件依赖 */
  dependents: string[];
}

/**
 * 标签风险权重映射
 * 基于 REFACTOR_REQUIREMENTS.md 第 8.6 节
 */
export const TAG_WEIGHTS: Record<string, number> = {
  'BUGFIX': 0.9,     // 修复过的代码 = 曾经有问题
  'REFACTOR': 0.8,   // 重构过的代码 = 复杂度较高
  'FEATURE': 0.7,    // 新功能 = 可能不稳定
  'CONFIG': 0.5,     // 配置变更 = 中等风险
  'DOCS': 0.2,       // 文档 = 低风险
  'DELETE': 0.1,     // 删除代码 = 极低风险
  'UNKNOWN': 0.5     // 未知 = 默认中等风险
};

/**
 * 提交标签正则表达式
 * 匹配格式: [TAG] scope: message
 */
export const COMMIT_TAG_REGEX = /^\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\]\s*(.+?)?:\s*(.+)$/;

/**
 * GitAnalyzer 类
 * 提供 Git 历史分析和风险评分功能
 */
export class GitAnalyzer {
  /**
   * 检查指定路径是否为 Git 仓库
   */
  async isGitRepository(projectRoot: string): Promise<boolean> {
    try {
      await execFileAsync('git', ['rev-parse', '--git-dir'], { cwd: projectRoot });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 分析单个文件的 Git 热度
   * @param filePath - 文件路径（相对于 projectRoot）
   * @param projectRoot - 项目根目录
   * @returns HeatScore 热度评分
   */
  async analyzeFileHeat(filePath: string, projectRoot: string): Promise<HeatScore> {
    // 检查是否为 Git 仓库
    const isGitRepo = await this.isGitRepository(projectRoot);
    if (!isGitRepo) {
      return this.createEmptyHeatScore();
    }

    try {
      // 使用 execSync 获取提交历史
      const log = execSync(
        `git log --since="30 days ago" --pretty=format:"%s" -- "${filePath}"`,
        { cwd: projectRoot, encoding: 'utf-8' }
      ) as string;

      const commits = log.split('\n').filter(Boolean);

      if (commits.length === 0) {
        return this.createEmptyHeatScore();
      }

      // 解析最后一次提交的标签
      const lastCommit = commits[0] ?? '';
      const tag = this.parseCommitTag(lastCommit);
      const lastType = tag?.type ?? 'UNKNOWN';

      // 获取最后一次提交的日期
      let lastDate: Date | null = null;
      try {
        const dateOutput = execSync(
          `git log -1 --pretty=format:"%ci" -- "${filePath}"`,
          { cwd: projectRoot, encoding: 'utf-8' }
        ) as string;
        lastDate = dateOutput ? new Date(dateOutput.split(' ')[0]) : null;
      } catch {
        lastDate = null;
      }

      // 稳定性：30天内少于3次视为稳定
      const stability = commits.length < 3;

      return {
        freq30d: commits.length,
        lastType,
        lastDate,
        stability
      };
    } catch {
      // 优雅降级：发生任何错误时返回空热度
      return this.createEmptyHeatScore();
    }
  }

  /**
   * 分析目录下所有文件的 Git 热度
   * @param dirPath - 目录路径（相对于 projectRoot）
   * @param projectRoot - 项目根目录
   * @returns Map<文件路径, HeatScore>
   */
  async analyzeDirectoryHeat(dirPath: string, projectRoot: string): Promise<Map<string, HeatScore>> {
    const result = new Map<string, HeatScore>();

    // 检查是否为 Git 仓库
    const isGitRepo = await this.isGitRepository(projectRoot);
    if (!isGitRepo) {
      return result;
    }

    try {
      // 获取目录下最近30天有修改的所有文件
      const files = await this.getModifiedFilesInDirectory(dirPath, projectRoot, 30);

      // 分析每个文件的热度
      for (const file of files) {
        const heat = await this.analyzeFileHeat(file, projectRoot);
        result.set(file, heat);
      }
    } catch {
      // 优雅降级：发生错误时返回空结果
    }

    return result;
  }

  /**
   * 计算风险评分（简单版本 - 任务要求）
   * 基于 REFACTOR_REQUIREMENTS.md 第 8.6 节的公式
   *
   * @param gravity - 依赖复杂度（出度+入度）
   * @param heat - 热度评分
   * @param impact - 影响面（被依赖文件数）
   * @param stable - 是否稳定
   * @returns RiskLevel 风险等级
   */
  calculateRiskLevel(
    gravity: number,
    heat: HeatScore,
    impact: number,
    stable: boolean
  ): RiskLevel {
    // 归一化各维度
    const gravityNorm = Math.min(gravity / 20, 1);
    const freqNorm = Math.min(heat.freq30d / 10, 1);
    const tagWeight = TAG_WEIGHTS[heat.lastType] ?? TAG_WEIGHTS['UNKNOWN'];
    const stableBoost = stable ? 0 : 0.15;
    const impactNorm = Math.min(impact / 50, 1);

    // 计算综合分数（严格按照需求文档公式）
    let score = gravityNorm * 0.30 +
                freqNorm * 0.15 +
                tagWeight * 0.10 +
                stableBoost +
                impactNorm * 0.10;

    // clamp 到 [0, 1]
    score = Math.max(0, Math.min(1, score));

    // 确定风险等级
    if (score > 0.7) {
      return 'high';
    } else if (score > 0.4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 计算风险评分（完整版本 - 设计文档版本）
   * @param targetFiles - 目标文件列表
   * @param commits - 提交信息列表
   * @param feedData - AI 饲料数据
   * @returns RiskScore 风险评分结果
   */
  calculateRiskScore(
    targetFiles: string[],
    commits: CommitInfo[],
    feedData: AIFeed[]
  ): RiskScore {
    // 获取目标文件的饲料数据
    const fileFeeds = feedData.filter(f => targetFiles.includes(f.file));

    // 计算平均 gravity
    const avgGravity = fileFeeds.reduce((sum, f) => sum + f.gravity, 0) / (fileFeeds.length || 1);
    const gravityNorm = Math.min(avgGravity / 20, 1);

    // 计算平均 freq
    const totalFreq = fileFeeds.reduce((sum, f) => sum + f.heat.freq30d, 0);
    const avgFreq = totalFreq / (fileFeeds.length || 1);
    const freqNorm = Math.min(avgFreq / 10, 1);

    // 计算标签风险权重
    const lastTypes = fileFeeds.map(f => f.heat.lastType);
    const avgTagRisk = lastTypes.reduce((sum, t) => sum + (TAG_WEIGHTS[t] ?? 0.5), 0) /
                       (lastTypes.length || 1);

    // 计算影响面
    const totalDependents = fileFeeds.reduce((sum, f) => sum + f.dependents.length, 0);
    const impactNorm = Math.min(totalDependents / 50, 1);

    // 计算稳定性调整
    const unstableCount = fileFeeds.filter(f => f.meta.stable === false).length;
    const unstableRatio = unstableCount / (fileFeeds.length || 1);
    const stabilityBoost = unstableRatio * 0.15;

    // 计算综合分数
    let score = gravityNorm * 0.30 +
                freqNorm * 0.15 +
                avgTagRisk * 0.10 +
                stabilityBoost +
                impactNorm * 0.10;

    // clamp 到 [0, 1]
    score = Math.max(0, Math.min(1, score));

    // 确定风险等级
    let level: RiskLevel;
    if (score > 0.7) {
      level = 'high';
    } else if (score > 0.4) {
      level = 'medium';
    } else {
      level = 'low';
    }

    // 生成风险因素
    const riskFactors: string[] = [];
    if (gravityNorm > 0.7) riskFactors.push('高依赖复杂度');
    if (freqNorm > 0.7) riskFactors.push('近期频繁修改');
    if (avgTagRisk > 0.7) riskFactors.push('历史问题较多(BUGFIX频繁)');
    if (impactNorm > 0.7) riskFactors.push('影响面广');
    if (unstableCount > 0) riskFactors.push('模块标记为不稳定');

    // 构建 HeatScore（平均值）
    const avgHeat: HeatScore = {
      freq30d: Math.round(avgFreq),
      lastType: lastTypes[0] ?? 'UNKNOWN',
      lastDate: fileFeeds[0]?.heat.lastDate ?? null,
      stability: unstableCount === 0
    };

    return {
      level,
      score,
      gravity: gravityNorm,
      heat: avgHeat,
      impact: impactNorm,
      riskFactors
    };
  }

  /**
   * 查找相关提交
   * 支持关键词搜索和文件搜索两种模式
   *
   * @param keywords - 关键词列表
   * @param files - 文件路径列表
   * @param options - 选项（最大提交数、项目根目录）
   * @returns CommitInfo[] 提交信息列表
   */
  async findRelatedCommits(
    keywords: string[],
    files: string[],
    options: { maxCommits: number; projectRoot: string }
  ): Promise<CommitInfo[]> {
    const commits: CommitInfo[] = [];

    // 检查是否为 Git 仓库
    const isGitRepo = await this.isGitRepository(options.projectRoot);
    if (!isGitRepo) {
      return commits;
    }

    // 1. 关键词搜索（提交信息）
    if (keywords.length > 0) {
      const keywordResults = await this.searchByKeywords(keywords, options.maxCommits, options.projectRoot);
      commits.push(...keywordResults);
    }

    // 2. 文件搜索（修改过的文件）
    if (files.length > 0) {
      const fileResults = await this.searchByFiles(files, options.maxCommits, options.projectRoot);
      commits.push(...fileResults);
    }

    // 3. 去重 + 排序（按日期降序）
    const unique = new Map<string, CommitInfo>();
    for (const commit of commits) {
      if (!unique.has(commit.hash)) {
        unique.set(commit.hash, commit);
      }
    }

    return Array.from(unique.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, options.maxCommits);
  }

  /**
   * 解析提交信息中的 TAG
   * @param message - 提交信息
   * @returns CommitTag | undefined
   */
  parseCommitTag(message: string): CommitTag | undefined {
    // 只处理第一行
    const firstLine = message.split('\n')[0] ?? '';
    const match = firstLine.match(COMMIT_TAG_REGEX);
    if (!match) {
      return undefined;
    }

    const [, type, scope, subject] = match;

    return {
      type: type as CommitTagType,
      scope: scope?.trim() ?? 'general',
      subject: subject.trim()
    };
  }

  /**
   * 验证提交信息格式
   * @param message - 提交信息
   * @returns 是否有效
   */
  validateCommitMessage(message: string): { valid: boolean; error?: string } {
    const lines = message.split('\n');
    const firstLine = lines[0]?.trim() ?? '';

    // 检查第一行格式（更宽松的正则，先提取 TAG 类型）
    const tagMatch = firstLine.match(/^\[(\w+)\]\s*(.+)$/);
    if (!tagMatch) {
      return {
        valid: false,
        error: '提交信息必须以大写标签开头，格式: [TAG] scope: message'
      };
    }

    const [, tagType] = tagMatch;

    // 验证标签有效性
    if (!TAG_WEIGHTS[tagType]) {
      return {
        valid: false,
        error: `无效的标签: [${tagType}]`
      };
    }

    // 使用严格的正则检查完整格式
    const fullMatch = firstLine.match(COMMIT_TAG_REGEX);
    if (!fullMatch) {
      // 检查是否是 scope 或 subject 的问题
      const scopeMatch = firstLine.match(/^\[\w+\]\s*(.+)$/);
      if (scopeMatch) {
        const rest = scopeMatch[1];
        if (!rest.includes(':')) {
          return {
            valid: false,
            error: 'scope 不能为空，格式: [TAG] scope: message'
          };
        }
        const parts = rest.split(':');
        if (parts.length >= 2 && parts[1]?.trim() === '') {
          return {
            valid: false,
            error: '提交描述不能为空'
          };
        }
      }
      return {
        valid: false,
        error: '格式错误，应为: [TAG] scope: message'
      };
    }

    const [, type, scope, subject] = fullMatch;

    // scope 不能为空
    if (!scope || scope.trim() === '') {
      return {
        valid: false,
        error: 'scope 不能为空，格式: [TAG] scope: message'
      };
    }

    // subject 不能为空
    if (!subject || subject.trim() === '') {
      return {
        valid: false,
        error: '提交描述不能为空'
      };
    }

    return { valid: true };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 创建空热度评分
   */
  private createEmptyHeatScore(): HeatScore {
    return {
      freq30d: 0,
      lastType: 'NEW',
      lastDate: null,
      stability: true
    };
  }

  /**
   * 格式化日期为 ISO 日期字符串
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] ?? '';
  }

  /**
   * 获取文件的提交历史
   */
  private async getFileCommits(
    filePath: string,
    projectRoot: string,
    days: number
  ): Promise<CommitInfo[]> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        [
          'log',
          `--since=${days} days ago`,
          '--pretty=format:%H|%s|%ai|%an',
          '--name-only',
          '--',
          filePath
        ],
        { cwd: projectRoot }
      );

      return this.parseGitLogWithFiles(stdout);
    } catch {
      return [];
    }
  }

  /**
   * 获取目录下最近有修改的文件列表
   */
  private async getModifiedFilesInDirectory(
    dirPath: string,
    projectRoot: string,
    days: number
  ): Promise<string[]> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        [
          'log',
          `--since=${days} days ago`,
          '--pretty=format:',
          '--name-only',
          '--',
          dirPath
        ],
        { cwd: projectRoot }
      );

      // 去重并过滤空行
      const files = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      return [...new Set(files)];
    } catch {
      return [];
    }
  }

  /**
   * 基于关键词搜索提交
   */
  private async searchByKeywords(
    keywords: string[],
    limit: number,
    projectRoot: string
  ): Promise<CommitInfo[]> {
    // 清理和验证关键词
    const sanitizedKeywords = keywords
      .slice(0, 5) // 最多 5 个关键词
      .map(k => k.slice(0, 100)) // 每个关键词最多 100 字符
      .filter(k => /^[\w\-./]+$/.test(k)); // 仅允许安全字符

    if (sanitizedKeywords.length === 0) {
      return [];
    }

    try {
      const pattern = sanitizedKeywords.join('|');
      const { stdout } = await execFileAsync(
        'git',
        [
          'log',
          '--all',
          `--grep=${pattern}`,
          '--format=%H|%s|%ai|%an',
          '-n',
          String(limit)
        ],
        { cwd: projectRoot }
      );

      return this.parseGitLog(stdout);
    } catch {
      return [];
    }
  }

  /**
   * 基于文件搜索提交
   */
  private async searchByFiles(
    files: string[],
    limit: number,
    projectRoot: string
  ): Promise<CommitInfo[]> {
    const allCommits: CommitInfo[] = [];

    for (const file of files.slice(0, 10)) { // 最多处理 10 个文件
      try {
        const { stdout } = await execFileAsync(
          'git',
          [
            'log',
            '--follow',
            '--format=%H|%s|%ai|%an',
            '--name-only',
            '-n',
            String(limit),
            '--',
            file
          ],
          { cwd: projectRoot }
        );

        const fileCommits = this.parseGitLogWithFiles(stdout);
        allCommits.push(...fileCommits);
      } catch {
        // 单文件查询失败时跳过
        continue;
      }
    }

    // 按哈希去重
    const unique = new Map<string, CommitInfo>();
    for (const commit of allCommits) {
      if (!unique.has(commit.hash)) {
        unique.set(commit.hash, commit);
      }
    }

    return Array.from(unique.values());
  }

  /**
   * 解析 Git 日志（无文件列表）
   */
  private parseGitLog(stdout: string): CommitInfo[] {
    return stdout
      .trim()
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        const parts = line.split('|');
        const hash = parts[0] ?? '';
        const message = parts[1] ?? '';
        const dateStr = parts[2] ?? '';
        const author = parts[3] ?? '';

        return {
          hash,
          message,
          date: new Date(dateStr),
          author,
          files: [],
          tag: this.parseCommitTag(message)
        };
      })
      .filter(commit => commit.hash.length > 0);
  }

  /**
   * 解析 Git 日志（含文件列表）
   * 格式: hash|message|date|author\n\nfile1\nfile2\n\nhash|...
   */
  private parseGitLogWithFiles(stdout: string): CommitInfo[] {
    const commits: CommitInfo[] = [];
    const blocks = stdout.split('\n\n');

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length === 0) {
        continue;
      }

      // 第一行是提交信息
      const headerLine = lines[0];
      const parts = headerLine.split('|');
      if (parts.length < 4) {
        continue;
      }

      const hash = parts[0] ?? '';
      const message = parts[1] ?? '';
      const dateStr = parts[2] ?? '';
      const author = parts[3] ?? '';

      // 剩余行是文件列表
      const files = lines.slice(1).filter(f => f.trim().length > 0);

      if (hash.length > 0) {
        commits.push({
          hash,
          message,
          date: new Date(dateStr),
          author,
          files,
          tag: this.parseCommitTag(message)
        });
      }
    }

    return commits;
  }
}

// 重新导出 HeatScore 以便外部使用
export type { HeatScore };
