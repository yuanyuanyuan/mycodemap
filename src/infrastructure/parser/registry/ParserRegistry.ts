// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Parser registry - manages language parsers and file extension mappings
// ============================================
// 解析器注册表 - 管理语言解析器和文件扩展名映射
// ============================================

import type {
  ILanguageParser,
  IParserRegistry,
  LanguageId,
} from '../../../interface/types/parser.js';

/**
 * 解析器未找到错误
 */
export class ParserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No parser found for: ${identifier}`);
    this.name = 'ParserNotFoundError';
  }
}

/**
 * 解析器注册表实现
 *
 * 职责：
 * - 管理所有注册的解析器
 * - 根据语言 ID 或文件扩展名查找解析器
 * - 提供支持的语言和扩展名列表
 */
export class ParserRegistry implements IParserRegistry {
  private parsers = new Map<LanguageId, ILanguageParser>();
  private extensionMap = new Map<string, LanguageId>();

  /**
   * 注册解析器
   */
  register(parser: ILanguageParser): void {
    this.parsers.set(parser.languageId, parser);
    
    // 注册扩展名映射
    for (const ext of parser.fileExtensions) {
      this.extensionMap.set(ext.toLowerCase(), parser.languageId);
    }
  }

  /**
   * 根据语言 ID 获取解析器
   */
  getParser(language: LanguageId): ILanguageParser | undefined {
    return this.parsers.get(language);
  }

  /**
   * 根据文件路径获取解析器
   */
  getParserByFile(filePath: string): ILanguageParser | undefined {
    const ext = this.extractExtension(filePath);
    if (!ext) return undefined;
    
    const languageId = this.extensionMap.get(ext.toLowerCase());
    if (!languageId) return undefined;
    
    return this.parsers.get(languageId);
  }

  /**
   * 获取所有支持的扩展名
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }

  /**
   * 获取所有支持的语言
   */
  getSupportedLanguages(): LanguageId[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * 检查是否支持某语言
   */
  hasLanguage(language: LanguageId): boolean {
    return this.parsers.has(language);
  }

  /**
   * 检查是否支持某文件扩展名
   */
  hasExtension(ext: string): boolean {
    return this.extensionMap.has(ext.toLowerCase());
  }

  /**
   * 取消注册解析器
   */
  unregister(language: LanguageId): void {
    const parser = this.parsers.get(language);
    if (parser) {
      // 清理扩展名映射
      for (const ext of parser.fileExtensions) {
        this.extensionMap.delete(ext.toLowerCase());
      }
      this.parsers.delete(language);
    }
  }

  /**
   * 清空所有解析器
   */
  clear(): void {
    this.parsers.clear();
    this.extensionMap.clear();
  }

  /**
   * 获取已注册解析器数量
   */
  get size(): number {
    return this.parsers.size;
  }

  /**
   * 提取文件扩展名
   */
  private extractExtension(filePath: string): string | undefined {
    const match = filePath.match(/\.([^.]+)$/);
    return match?.[1];
  }
}

/**
 * 默认解析器注册表实例
 */
export const parserRegistry = new ParserRegistry();
