// ============================================
// IParser - 解析器接口定义
// ============================================

import type { ExportInfo, ImportInfo, ModuleSymbol } from '../../types/index.js';

/**
 * 解析器模式
 */
export type ParserMode = 'fast' | 'smart';

/**
 * 解析器选项
 */
export interface ParserOptions {
  /** 解析模式 */
  mode: ParserMode;
  /** 根目录 */
  rootDir: string;
  /** 文件过滤 */
  include?: string[];
  /** 排除模式 */
  exclude?: string[];
}

/**
 * 解析结果
 */
export interface ParseResult {
  /** 文件路径 */
  path: string;
  /** 导出信息 */
  exports: ExportInfo[];
  /** 导入信息 */
  imports: ImportInfo[];
  /** 符号信息 */
  symbols: ModuleSymbol[];
  /** 依赖列表 */
  dependencies: string[];
  /** 模块类型 */
  type: 'source' | 'test' | 'config' | 'type';
  /** 代码统计 */
  stats: {
    lines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  };
  /** Smart 模式额外信息 */
  typeInfo?: TypeInfo;
  /** Smart 模式额外信息 */
  callGraph?: CallGraph;
  /** Smart 模式额外信息 */
  complexity?: ComplexityMetrics;
}

/**
 * 类型信息（Smart 模式）- 增强版
 */
export interface TypeInfo {
  /** 类型定义 */
  typeDefinitions: Array<{
    name: string;
    kind: 'interface' | 'type' | 'enum' | 'class' | 'alias';
    members: Array<{
      name: string;
      type: string;
      optional: boolean;
      visibility?: 'public' | 'private' | 'protected' | 'internal';
      isReadonly?: boolean;
    }>;
    extends?: string[];
    implements?: string[];
    genericParams?: Array<{
      name: string;
      extends?: string;
      default?: string;
    }>;
  }>;
  /** 泛型参数 */
  genericParams: Array<{
    name: string;
    extends?: string;
    default?: string;
    constraint?: string;
  }>;
  /** 跨文件引用 */
  crossFileRefs: Array<{
    symbol: string;
    file: string;
    line: number;
    column?: number;
    exportName?: string;
  }>;
  /** 联合类型 */
  unionTypes: string[];
  /** 交叉类型 */
  intersectionTypes: string[];
  /** 类型别名 */
  typeAliases: Array<{
    name: string;
    type: string;
    genericParams?: Array<{
      name: string;
      extends?: string;
      default?: string;
    }>;
  }>;
  /** 条件类型 */
  conditionalTypes?: Array<{
    checkType: string;
    extendsType: string;
    trueType: string;
    falseType: string;
  }>;
  /** 映射类型 */
  mappedTypes?: Array<{
    typeParameter: string;
    constraint: string;
    valueType: string;
    asType?: string;
    readonly?: 'add' | 'remove';
    optional?: 'add' | 'remove';
  }>;
  /** 模板字面量类型 */
  templateLiteralTypes?: Array<{
    head: string;
    spans: Array<{
      type: string;
      literal: string;
    }>;
  }>;
  /** 索引访问类型 */
  indexedAccessTypes?: string[];
  /** 推断类型 */
  inferredTypes?: string[];
}

/**
 * 调用图（Smart 模式）
 */
export interface CallGraph {
  /** 函数调用关系 */
  calls: Array<{
    caller: string;
    callee: string;
    line: number;
  }>;
  /** 递归函数 */
  recursive: string[];
  /** 被调用次数 */
  callCounts: Record<string, number>;
}

/**
 * 复杂度指标（Smart 模式）
 */
export interface ComplexityMetrics {
  /** 圈复杂度 */
  cyclomatic: number;
  /** 认知复杂度 */
  cognitive: number;
  /** 可维护性指数 */
  maintainability: number;
  /** 圈复杂度详情 */
  details: {
    functions: Array<{
      name: string;
      cyclomatic: number;
      cognitive: number;
      lines: number;
    }>;
  };
}

/**
 * 解析器接口
 */
export interface IParser {
  /** 解析器名称 */
  readonly name: string;
  /** 解析模式 */
  readonly mode: ParserMode;

  /**
   * 解析单个文件
   */
  parseFile(filePath: string): Promise<ParseResult>;

  /**
   * 批量解析文件
   */
  parseFiles(filePaths: string[]): Promise<ParseResult[]>;

  /**
   * 增量解析（仅 Fast 模式支持）
   */
  parseIncremental?(oldTree: any, edit: TextEdit): ParseResult;

  /**
   * 释放资源
   */
  dispose(): void;
}

/**
 * 文本编辑（用于增量解析）
 */
export interface TextEdit {
  startIndex: number;
  endIndex: number;
  newText: string;
}

/**
 * 解析器工厂
 */
export interface IParserFactory {
  /**
   * 创建解析器
   */
  create(options: ParserOptions): IParser;

  /**
   * 获取支持的文件类型
   */
  getSupportedExtensions(): string[];
}

/**
 * 默认解析器工厂实现
 */
export class DefaultParserFactory implements IParserFactory {
  create(options: ParserOptions): IParser {
    if (options.mode === 'fast') {
      // 动态导入 Fast 解析器
      return new (require('./implementations/fast-parser.js').FastParser)(options);
    } else {
      // 使用 Smart 解析器
      return new (require('./implementations/smart-parser.js').SmartParser)(options);
    }
  }

  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  }
}
