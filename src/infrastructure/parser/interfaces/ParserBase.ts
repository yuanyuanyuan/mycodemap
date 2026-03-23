// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Parser base class - provides common functionality for all language parsers
// ============================================
// 解析器基类 - 为所有语言解析器提供通用功能
// ============================================

import type {
  ILanguageParser,
  LanguageId,
  LanguageFeature,
  ParseOptions,
  ParseResult,
  CallGraphInfo,
} from '../../../interface/types/parser.js';
import type {
  Module,
  ModuleSymbol,
  ImportInfo,
  ExportInfo,
  ComplexityMetrics,
} from '../../../interface/types/index.js';

/**
 * 解析错误
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * 解析器基类
 *
 * 为所有语言解析器提供：
 * - 通用的初始化和资源管理
 * - 批量解析的默认实现
 * - 特性支持检测框架
 * - 性能统计
 */
export abstract class ParserBase implements ILanguageParser {
  abstract readonly languageId: LanguageId;
  abstract readonly fileExtensions: string[];
  abstract readonly name: string;
  
  /** 支持的语言特性 */
  protected abstract supportedFeatures: Set<LanguageFeature>;
  
  /** 是否已初始化 */
  protected isInitialized = false;
  
  /** 解析统计 */
  protected stats = {
    totalParsed: 0,
    totalErrors: 0,
    totalTime: 0,
  };

  /**
   * 初始化解析器
   */
  async initialize(): Promise<void> {
    await this.doInitialize();
    this.isInitialized = true;
  }

  /**
   * 子类实现的具体初始化逻辑
   */
  protected abstract doInitialize(): Promise<void>;

  /**
   * 释放解析器资源
   */
  async dispose(): Promise<void> {
    await this.doDispose();
    this.isInitialized = false;
  }

  /**
   * 子类实现的具体释放逻辑
   */
  protected abstract doDispose(): Promise<void>;

  /**
   * 确保已初始化
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ParseError(
        `Parser ${this.name} not initialized. Call initialize() first.`
      );
    }
  }

  /**
   * 解析单个文件（子类必须实现）
   */
  abstract parseFile(
    filePath: string,
    content: string,
    options?: ParseOptions
  ): Promise<ParseResult>;

  /**
   * 批量解析文件（默认实现）
   */
  async parseFiles(
    files: Array<{ path: string; content: string }>,
    options?: ParseOptions
  ): Promise<ParseResult[]> {
    this.ensureInitialized();
    
    const results: ParseResult[] = [];
    
    for (const file of files) {
      try {
        const result = await this.parseFile(file.path, file.content, options);
        results.push(result);
      } catch (error) {
        // 记录错误但继续解析其他文件
        this.stats.totalErrors++;
        results.push(this.createErrorResult(file.path, error));
      }
    }
    
    return results;
  }

  /**
   * 提取导入信息（子类必须实现）
   */
  abstract extractImports(content: string): Promise<ImportInfo[]>;

  /**
   * 提取导出信息（子类必须实现）
   */
  abstract extractExports(content: string): Promise<ExportInfo[]>;

  /**
   * 提取符号信息（子类必须实现）
   */
  abstract extractSymbols(content: string): Promise<ModuleSymbol[]>;

  /**
   * 构建调用图（可选实现）
   */
  async buildCallGraph(content: string): Promise<CallGraphInfo> {
    // 默认空实现
    return {
      calls: [],
      recursive: [],
    };
  }

  /**
   * 计算复杂度（可选实现）
   */
  async calculateComplexity(content: string): Promise<ComplexityMetrics> {
    // 默认实现：基础统计
    const lines = content.split('\n').length;
    return {
      cyclomatic: 1,
      cognitive: 1,
      maintainability: 100,
      details: {
        functions: [{
          name: '<file>',
          cyclomatic: 1,
          cognitive: 1,
          lines,
        }],
      },
    };
  }

  /**
   * 检测是否支持某特性
   */
  supportsFeature(feature: LanguageFeature): boolean {
    return this.supportedFeatures.has(feature);
  }

  /**
   * 获取支持的特性列表
   */
  getSupportedFeatures(): LanguageFeature[] {
    return Array.from(this.supportedFeatures);
  }

  /**
   * 获取解析统计
   */
  getStats(): { totalParsed: number; totalErrors: number; totalTime: number } {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = { totalParsed: 0, totalErrors: 0, totalTime: 0 };
  }

  /**
   * 创建错误结果
   */
  protected createErrorResult(filePath: string, error: unknown): ParseResult {
    return {
      filePath,
      language: this.languageId,
      module: this.createEmptyModule(filePath),
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      parseTime: 0,
      errors: [{
        line: 0,
        column: 0,
        message: error instanceof Error ? error.message : String(error),
        severity: 'error',
      }],
    };
  }

  /**
   * 创建空模块
   */
  protected createEmptyModule(filePath: string): Module {
    return {
      id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      projectId: '',
      path: filePath,
      language: this.languageId,
      stats: {
        lines: 0,
        codeLines: 0,
        commentLines: 0,
        blankLines: 0,
      },
    };
  }

  /**
   * 统计代码行数
   */
  protected countLines(content: string): {
    total: number;
    code: number;
    comment: number;
    blank: number;
  } {
    const lines = content.split('\n');
    let code = 0;
    let comment = 0;
    let blank = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        blank++;
      } else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        comment++;
      } else {
        code++;
      }
    }

    return {
      total: lines.length,
      code,
      comment,
      blank,
    };
  }
}
