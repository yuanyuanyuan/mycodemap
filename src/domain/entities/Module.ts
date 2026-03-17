// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Domain entity: Module - represents a source code module (file) in the project
// ============================================
// 领域实体：模块 - 表示项目中的源代码模块（文件）
// ============================================

import type { Module as ModuleInterface } from '../../interface/types/index.js';

/**
 * 模块统计信息
 */
export interface ModuleStats {
  lines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
}

/**
 * 模块领域实体
 *
 * 职责：
 * - 维护模块身份信息
 * - 记录代码统计信息
 * - 关联到项目和语言
 */
export class Module implements ModuleInterface {
  readonly id: string;
  readonly projectId: string;
  path: string;
  language: string;
  stats: ModuleStats;

  constructor(
    id: string,
    projectId: string,
    path: string,
    language: string,
    stats: ModuleStats = {
      lines: 0,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
    }
  ) {
    this.id = id;
    this.projectId = projectId;
    this.path = path;
    this.language = language;
    this.stats = { ...stats };

    this.validate();
  }

  /**
   * 从接口数据创建模块实体
   */
  static fromInterface(data: ModuleInterface): Module {
    return new Module(
      data.id,
      data.projectId,
      data.path,
      data.language,
      data.stats
    );
  }

  /**
   * 转换为接口数据
   */
  toInterface(): ModuleInterface {
    return {
      id: this.id,
      projectId: this.projectId,
      path: this.path,
      language: this.language,
      stats: { ...this.stats },
    };
  }

  /**
   * 更新代码统计信息
   */
  updateStats(stats: Partial<ModuleStats>): void {
    this.stats = {
      ...this.stats,
      ...stats,
    };
  }

  /**
   * 更新文件路径（如重命名）
   */
  updatePath(newPath: string): void {
    if (!newPath || newPath.trim().length === 0) {
      throw new Error('Module path cannot be empty');
    }
    this.path = newPath.trim();
  }

  /**
   * 设置语言类型
   */
  setLanguage(language: string): void {
    if (!language || language.trim().length === 0) {
      throw new Error('Language cannot be empty');
    }
    this.language = language.trim().toLowerCase();
  }

  /**
   * 验证领域规则
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Module ID cannot be empty');
    }
    if (!this.projectId || this.projectId.trim().length === 0) {
      throw new Error('Project ID cannot be empty');
    }
    if (!this.path || this.path.trim().length === 0) {
      throw new Error('Module path cannot be empty');
    }
    if (!this.language || this.language.trim().length === 0) {
      throw new Error('Language cannot be empty');
    }
  }

  /**
   * 检查两个模块是否相同（基于 ID）
   */
  equals(other: Module): boolean {
    return this.id === other.id;
  }

  /**
   * 计算代码密度（代码行 / 总行数）
   */
  getCodeDensity(): number {
    if (this.stats.lines === 0) return 0;
    return this.stats.codeLines / this.stats.lines;
  }

  /**
   * 计算注释密度（注释行 / 总行数）
   */
  getCommentDensity(): number {
    if (this.stats.lines === 0) return 0;
    return this.stats.commentLines / this.stats.lines;
  }

  /**
   * 是否是测试文件（启发式判断）
   */
  isTestFile(): boolean {
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /_test\.ts$/,
      /\.test\.ts$/,
      /\.spec\.ts$/,
    ];
    return testPatterns.some(pattern => pattern.test(this.path));
  }

  /**
   * 是否是配置文件
   */
  isConfigFile(): boolean {
    const configPatterns = [
      /\.config\./,
      /config\./,
      /^\./,  // 隐藏文件
      /rc\./,
      /rc$/,
    ];
    return configPatterns.some(pattern => pattern.test(this.path));
  }

  /**
   * 创建模块快照（克隆）
   */
  snapshot(): Module {
    return new Module(
      this.id,
      this.projectId,
      this.path,
      this.language,
      { ...this.stats }
    );
  }
}
