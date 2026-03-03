// ============================================
// Fast Parser - 基于 Tree-sitter 的快速解析器
// ============================================

// [META] since:2024-06 | owner:parser-team | stable:true
// [WHY] 基于 Tree-sitter 的快速解析器，提供高性能的代码结构分析
import * as path from 'path';
import * as fs from 'fs';
import type { IParser, ParseResult, ParserOptions, TextEdit } from '../interfaces/IParser.js';
import type { ExportInfo, ImportInfo, ModuleSymbol, SymbolKind } from '../../types/index.js';

/**
 * 将构建路径转换为源代码路径
 * 例如: ../types/index.js -> ../types/index.ts
 */
export function normalizeSourcePath(depPath: string): string {
  // 已经是 .ts 或 .tsx 的不需要转换
  if (depPath.endsWith('.ts') || depPath.endsWith('.tsx')) {
    return depPath;
  }

  // 替换 .js/.jsx 后缀为 .ts/.tsx
  return depPath.replace(/\.js$/i, '.ts').replace(/\.jsx$/i, '.tsx');
}

/**
 * Fast Parser - 使用 Tree-sitter 进行快速解析
 * 注意: 需要安装 tree-sitter 和 tree-sitter-typescript
 */
export class FastParser implements IParser {
  readonly name = 'fast-parser';
  readonly mode = 'fast';

  constructor(_options: ParserOptions) {
    console.log('[FastParser] 初始化 (简化模式)');
  }

  /**
   * 解析单个文件
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const content = fs.readFileSync(filePath, 'utf-8');

    // 使用简化解析
    const exports = this.extractExportsSimple(content);
    const imports = this.extractImportsSimple(content);
    const symbols = this.extractSymbolsSimple(content);
    const dependencies = this.extractDependenciesSimple(imports);

    return {
      path: filePath,
      exports,
      imports,
      symbols,
      dependencies,
      type: this.getModuleType(filePath),
      stats: this.getFileStats(content)
    };
  }

  /**
   * 批量解析文件
   */
  async parseFiles(filePaths: string[]): Promise<ParseResult[]> {
    const results: ParseResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.parseFile(filePath);
        results.push(result);
      } catch (error) {
        console.error(`解析失败: ${filePath}`, error);
      }
    }

    return results;
  }

  /**
   * 增量解析
   */
  parseIncremental(_oldTree: unknown, _edit: TextEdit): ParseResult {
    // Tree-sitter 支持增量解析
    throw new Error('增量解析尚未实现');
  }

  /**
   * 释放资源
   */
  dispose(): void {
    // 清理资源
  }

  /**
   * 简化导出提取
   */
  private extractExportsSimple(content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|interface|type|const|let|var|enum)\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        kind: this.getKindFromMatch(match[0]) as any,
        isDefault: match[0].includes('default'),
        isTypeOnly: false
      });
    }

    // 命名导出 export { ... }
    const namedExportRegex = /export\s+\{\s*([^}]+)\s*\}/g;
    while ((match = namedExportRegex.exec(content)) !== null) {
      const names = match[1].split(',').map((s: string) => s.trim());
      for (const name of names) {
        if (name && !name.startsWith('type ')) {
          exports.push({
            name,
            kind: 'variable',
            isDefault: false,
            isTypeOnly: false
          });
        }
      }
    }

    return exports;
  }

  /**
   * 简化导入提取（包括 import 和 re-export）
   */
  private extractImportsSimple(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // import { ... } from '...'
    const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))?\s*(?:,\s*\{([^}]+)\})?\s*from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const specifiers: string[] = [];

      if (match[1]) {
        specifiers.push(...match[1].split(',').map((s: string) => s.trim()));
      }
      if (match[2]) {
        specifiers.unshift(match[2]);
      }
      if (match[3]) {
        specifiers.push(...match[3].split(',').map((s: string) => s.trim()));
      }

      if (match[4]) {
        imports.push({
          source: normalizeSourcePath(match[4]),
          sourceType: match[4].startsWith('.') ? 'relative' : 'alias',
          specifiers: specifiers.map(s => ({ name: s, isTypeOnly: false })) as any,
          isTypeOnly: false
        });
      }
    }

    // 处理 re-export: export { ... } from '...'
    const reExportRegex = /export\s+\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"]/g;
    while ((match = reExportRegex.exec(content)) !== null) {
      const specifiers = match[1].split(',').map((s: string) => s.trim()).filter(Boolean);
      if (match[2]) {
        imports.push({
          source: normalizeSourcePath(match[2]),
          sourceType: match[2].startsWith('.') ? 'relative' : 'alias',
          specifiers: specifiers.map(s => ({ name: s, isTypeOnly: false })),
          isTypeOnly: false,
          isReExport: true  // 标记为 re-export
        } as ImportInfo);
      }
    }

    // 处理 re-export: export * from '...'
    const reExportAllRegex = /export\s+\*\s*from\s+['"]([^'"]+)['"]/g;
    while ((match = reExportAllRegex.exec(content)) !== null) {
      if (match[1]) {
        imports.push({
          source: match[1],
          sourceType: match[1].startsWith('.') ? 'relative' : 'alias',
          specifiers: [],
          isTypeOnly: false,
          isReExport: true
        } as ImportInfo);
      }
    }

    // 处理 re-export: export { default } from '...'
    const reExportDefaultRegex = /export\s+\{\s*default\s*\}\s*from\s+['"]([^'"]+)['"]/g;
    while ((match = reExportDefaultRegex.exec(content)) !== null) {
      if (match[1]) {
        imports.push({
          source: match[1],
          sourceType: match[1].startsWith('.') ? 'relative' : 'alias',
          specifiers: [{ name: 'default', isTypeOnly: false }],
          isTypeOnly: false,
          isReExport: true
        } as ImportInfo);
      }
    }

    return imports;
  }

  /**
   * 简化符号提取
   */
  private extractSymbolsSimple(content: string): ModuleSymbol[] {
    const symbols: ModuleSymbol[] = [];

    // 函数
    const funcRegex = /(?:export\s+)?function\s+(\w+)/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      symbols.push({
        id: this.generateId(match[1]),
        name: match[1],
        kind: 'function',
        location: { file: '', line: 0, column: 0 },
        visibility: content.substring(0, match.index).includes('export') ? 'public' : 'private',
        relatedSymbols: []
      } as any);
    }

    // 类
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      symbols.push({
        id: this.generateId(match[1]),
        name: match[1],
        kind: 'class',
        location: { file: '', line: 0, column: 0 },
        visibility: content.substring(0, match.index).includes('export') ? 'public' : 'private',
        relatedSymbols: []
      } as any);
    }

    return symbols;
  }

  /**
   * 简化依赖提取
   * 只返回外部模块依赖，过滤掉本地相对路径导入
   */
  private extractDependenciesSimple(imports: ImportInfo[]): string[] {
    const deps = new Set<string>();

    for (const imp of imports) {
      // 只收集外部模块依赖，过滤掉本地相对路径（以 . 开头）
      if (!imp.source.startsWith('.')) {
        deps.add(imp.source);
      }
    }

    return Array.from(deps);
  }

  /**
   * 从匹配获取类型
   */
  private getKindFromMatch(match: string): SymbolKind {
    if (match.includes('class')) return 'class';
    if (match.includes('function')) return 'function';
    if (match.includes('interface')) return 'interface';
    if (match.includes('type')) return 'type';
    if (match.includes('enum')) return 'enum';
    return 'variable';
  }

  /**
   * 获取模块类型
   */
  private getModuleType(filePath: string): 'source' | 'test' | 'config' | 'type' {
    const basename = path.basename(filePath);
    if (basename.includes('.test.') || basename.includes('.spec.')) {
      return 'test';
    }
    if (basename === 'tsconfig.json' || basename === 'jest.config.js') {
      return 'config';
    }
    if (basename.endsWith('.d.ts')) {
      return 'type';
    }
    return 'source';
  }

  /**
   * 获取文件统计
   */
  private getFileStats(content: string): ParseResult['stats'] {
    const lines = content.split('\n');
    let codeLines = 0;
    let commentLines = 0;
    let blankLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        blankLines++;
      } else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        commentLines++;
      } else {
        codeLines++;
      }
    }

    return {
      lines: lines.length,
      codeLines,
      commentLines,
      blankLines
    };
  }

  /**
   * 生成 ID
   */
  private generateId(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
