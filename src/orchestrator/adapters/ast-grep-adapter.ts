/**
 * [META] AstGrepAdapter - ast-grep 工具适配器
 * [WHY] 实现基于 AST 的代码搜索功能，补充 ToolOrchestrator 的工具链
 * 实现 ToolAdapter 接口，供编排器调用
 * 提供基于 AST 的代码搜索功能
 */

import { spawn } from 'node:child_process';
import type { UnifiedResult, ToolOptions } from '../types.js';
import type { ToolAdapter } from './base-adapter.js';
import { discoverProjectFiles } from '../../core/file-discovery.js';
import { loadCodemapConfig } from '../../cli/config-loader.js';

export type AstGrepAdapterErrorCode = 'file-discovery-failed' | 'scan-failed' | 'parse-failed';

export class AstGrepAdapterError extends Error {
  readonly code: AstGrepAdapterErrorCode;
  override readonly cause?: unknown;

  constructor(code: AstGrepAdapterErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AstGrepAdapterError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * AstGrepAdapter 配置选项
 */
export interface AstGrepAdapterOptions {
  /** 工作目录路径 */
  cwd?: string;
  /** 是否包含测试文件 */
  includeTests?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否在扫描错误时抛出错误 */
  failOnScanError?: boolean;
}

/**
 * AstGrepAdapter 实现
 * 实现 ToolAdapter 接口，提供统一的 ast-grep 工具调用接口
 */
export class AstGrepAdapter implements ToolAdapter {
  /** 适配器名称 */
  name = 'ast-grep';

  /** 结果权重（1.0 为最高优先级） */
  weight = 1.0;

  private cwd: string;
  private includeTests: boolean;
  private timeout: number;
  private failOnScanError: boolean;

  constructor(options: AstGrepAdapterOptions = {}) {
    this.cwd = options.cwd || process.cwd();
    this.includeTests = options.includeTests ?? true;
    this.timeout = options.timeout ?? 30000;
    this.failOnScanError = options.failOnScanError ?? false;
  }

  /**
   * 检查 ast-grep 是否可用
   * 检查 ast-grep CLI 是否可执行
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 尝试运行 npx ast-grep --version 检查是否可用
      await this.runCommand(['ast-grep', '--version']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 执行工具搜索
   * 根据 base-adapter.ts 接口定义
   */
  async execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]> {
    if (keywords.length === 0) {
      return [];
    }

    try {
      const topK = options.topK ?? 10;
      const results: UnifiedResult[] = [];

      for (const keyword of keywords) {
        const searchResults = await this.search(keyword, options);
        results.push(...searchResults);
      }

      // 限制返回结果数量
      return results.slice(0, topK);
    } catch (error) {
      if (this.failOnScanError) {
        throw this.toAdapterError(error, 'scan-failed', 'ast-grep 执行失败');
      }
      console.error(`ast-grep 执行失败: ${error}`);
      return [];
    }
  }

  /**
   * search 方法 - 执行 AST 搜索
   * @param pattern - 搜索模式
   * @param options - 搜索选项
   * @returns 统一结果列表
   */
  async search(pattern: string, options: ToolOptions = {}): Promise<UnifiedResult[]> {
    if (!pattern) {
      return [];
    }

    try {
      // 获取目标文件
      const files = await this.getTargetFiles();
      if (files.length === 0) {
        return [];
      }

      // 使用 ast-grep 执行搜索
      const results = await this.runAstGrepSearch(pattern, files);
      return results;
    } catch (error) {
      if (this.failOnScanError) {
        throw this.toAdapterError(error, 'scan-failed', 'ast-grep search 失败');
      }
      console.warn(`ast-grep search 失败: ${error}`);
      return [];
    }
  }

  /**
   * 运行 ast-grep 搜索命令
   */
  private async runAstGrepSearch(
    pattern: string,
    files: string[]
  ): Promise<UnifiedResult[]> {
    const results: UnifiedResult[] = [];

    // 使用 npx ast-grep 执行搜索
    const args = [
      'ast-grep',
      'scan',
      '--json',
      '--pattern', pattern,
      '--root', this.cwd,
      ...files
    ];

    try {
      const output = await this.runCommand(args);
      const parsedResults = this.parseAstGrepOutput(output, pattern);
      results.push(...parsedResults);
    } catch (error) {
      if (this.failOnScanError) {
        throw this.toAdapterError(error, 'scan-failed', 'ast-grep scan 命令失败');
      }
      console.warn(`ast-grep scan 命令失败: ${error}`);
    }

    return results;
  }

  /**
   * 执行命令的辅助方法
   */
  private runCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('npx', args, {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.timeout
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`命令失败: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 解析 ast-grep JSON 输出
   */
  private parseAstGrepOutput(output: string, keyword: string): UnifiedResult[] {
    const results: UnifiedResult[] = [];

    try {
      const parsed = JSON.parse(output);
      const matches = Array.isArray(parsed) ? parsed : parsed.results || [];

      for (const match of matches) {
        const file = match.file_path || match.path || '';
        const line = match.line || match.start?.line || 1;
        const content = match.code || match.matched_text || match.text || '';
        const toolScore = match.score || 0.8;

        if (!file) continue;

        const result: UnifiedResult = {
          id: `${file}:${line}:${content.substring(0, 10)}`,
          source: 'ast-grep',
          toolScore,
          type: 'code',
          file,
          line,
          content: content.substring(0, 200), // 截断内容
          relevance: toolScore,
          keywords: keyword ? [keyword] : [],
          metadata: {
            symbolType: this.inferSymbolType(content),
            dependencies: [],
            testFile: '',
            commitCount: 0,
            gravity: 0,
            heatScore: {
              freq30d: 0,
              lastType: '',
              lastDate: null,
              stability: true
            },
            impactCount: 0,
            stability: true,
            riskLevel: 'low'
          }
        };

        results.push(result);
      }
    } catch (error) {
      if (this.failOnScanError) {
        throw new AstGrepAdapterError(
          'parse-failed',
          `解析 ast-grep 输出失败: ${error instanceof Error ? error.message : String(error)}`,
          error
        );
      }
      console.warn(`解析 ast-grep 输出失败: ${error}`);
    }

    return results;
  }

  /**
   * 推断符号类型
   */
  private inferSymbolType(content: string): 'class' | 'function' | 'interface' | 'variable' {
    const trimmed = content.trim();
    if (trimmed.startsWith('class ')) return 'class';
    if (trimmed.startsWith('function ') || (trimmed.startsWith('const ') && trimmed.includes('=>'))) return 'function';
    if (trimmed.startsWith('interface ')) return 'interface';
    return 'variable';
  }

  /**
   * 获取目标文件列表
   */
  private async getTargetFiles(): Promise<string[]> {
    try {
      const { config } = await loadCodemapConfig(this.cwd);
      const effectiveExclude = [...config.exclude];

      if (!this.includeTests) {
        effectiveExclude.push(
          '**/*.test.ts',
          '**/*.spec.ts',
          '**/*.test.js',
          '**/*.spec.js',
          '**/*.test.tsx',
          '**/*.spec.tsx'
        );
      }

      const files = await discoverProjectFiles({
        rootDir: this.cwd,
        include: config.include,
        exclude: effectiveExclude,
        absolute: true,
        gitignore: true
      });
      return files;
    } catch (error) {
      if (this.failOnScanError) {
        throw new AstGrepAdapterError(
          'file-discovery-failed',
          `获取文件列表失败: ${error instanceof Error ? error.message : String(error)}`,
          error
        );
      }
      console.warn(`获取文件列表失败: ${error}`);
      return [];
    }
  }

  private toAdapterError(
    error: unknown,
    fallbackCode: AstGrepAdapterErrorCode,
    fallbackMessage: string
  ): AstGrepAdapterError {
    if (error instanceof AstGrepAdapterError) {
      return error;
    }

    return new AstGrepAdapterError(
      fallbackCode,
      `${fallbackMessage}: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

/**
 * 创建 AstGrepAdapter 实例的工厂函数
 */
export function createAstGrepAdapter(options?: AstGrepAdapterOptions): ToolAdapter {
  return new AstGrepAdapter(options);
}
