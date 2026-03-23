// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Parser abstraction layer type definitions
// ============================================
// 解析器抽象层类型定义
// ============================================

import type { Module, ModuleSymbol, ImportInfo, ExportInfo, Dependency, FunctionSignature, ComplexityMetrics } from './index.js';

// ============================================
// Section 1: 语言标识
// ============================================

/** 支持的语言 */
export type LanguageId = 
  | 'typescript' | 'javascript' | 'go'      // Phase 1 (已支持)
  | 'python' | 'java' | 'rust' | 'cpp'      // Phase 2 (MVP3)
  | 'csharp' | 'ruby' | 'php'               // Phase 3
  | 'swift' | 'kotlin' | 'dart' | 'perl';   // Phase 3

// ============================================
// Section 2: 解析选项
// ============================================

/** 解析选项 */
export interface ParseOptions {
  /** 包含调用图 */
  includeCallGraph?: boolean;
  /** 包含复杂度指标 */
  includeComplexity?: boolean;
  /** 包含类型信息 */
  includeTypeInfo?: boolean;
}

// ============================================
// Section 3: 解析结果
// ============================================

/** 调用图信息 */
export interface CallGraphInfo {
  calls: Array<{
    caller: string;
    callee: string;
    line: number;
  }>;
  recursive: string[];
}

/** 解析错误 */
export interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

/** 解析结果 */
export interface ParseResult {
  /** 文件路径 */
  filePath: string;
  /** 语言 */
  language: LanguageId;
  /** 模块信息 */
  module: Module;
  /** 符号列表 */
  symbols: ModuleSymbol[];
  /** 导入列表 */
  imports: ImportInfo[];
  /** 导出列表 */
  exports: ExportInfo[];
  /** 依赖列表 */
  dependencies: Dependency[];
  /** 调用图 */
  callGraph?: CallGraphInfo;
  /** 复杂度指标 */
  complexity?: ComplexityMetrics;
  /** 解析耗时 (ms) */
  parseTime: number;
  /** 错误信息 */
  errors?: ParseError[];
}

// ============================================
// Section 4: 语言特性
// ============================================

/** 语言特性 */
export type LanguageFeature = 
  | 'type-inference'      // 类型推导
  | 'generic-types'       // 泛型
  | 'decorators'          // 装饰器
  | 'call-graph'          // 调用图
  | 'cross-file-analysis' // 跨文件分析
  | 'complexity-metrics'; // 复杂度指标

// ============================================
// Section 5: 语言解析器接口
// ============================================

/**
 * 语言解析器接口
 * 所有语言解析器必须实现此接口
 */
export interface ILanguageParser {
  /** 支持的语言标识 */
  readonly languageId: LanguageId;
  
  /** 支持的文件扩展名 */
  readonly fileExtensions: string[];
  
  /** 解析器名称 */
  readonly name: string;
  
  /** 初始化解析器 */
  initialize(): Promise<void>;
  
  /** 释放解析器资源 */
  dispose(): Promise<void>;
  
  /** 解析单个文件 */
  parseFile(filePath: string, content: string, options?: ParseOptions): Promise<ParseResult>;
  
  /** 批量解析文件 */
  parseFiles(files: Array<{ path: string; content: string }>, options?: ParseOptions): Promise<ParseResult[]>;
  
  /** 提取导入信息 */
  extractImports(content: string): Promise<ImportInfo[]>;
  
  /** 提取导出信息 */
  extractExports(content: string): Promise<ExportInfo[]>;
  
  /** 提取符号信息 */
  extractSymbols(content: string): Promise<ModuleSymbol[]>;
  
  /** 构建调用图 */
  buildCallGraph(content: string): Promise<CallGraphInfo>;
  
  /** 计算复杂度 */
  calculateComplexity(content: string): Promise<ComplexityMetrics>;
  
  /** 检测语言特性支持 */
  supportsFeature(feature: LanguageFeature): boolean;
}

// ============================================
// Section 6: 解析器注册表接口
// ============================================

/** 解析器注册表 */
export interface IParserRegistry {
  /** 注册解析器 */
  register(parser: ILanguageParser): void;
  
  /** 获取解析器 */
  getParser(language: LanguageId): ILanguageParser | undefined;
  getParserByFile(filePath: string): ILanguageParser | undefined;
  
  /** 获取所有支持的扩展名 */
  getSupportedExtensions(): string[];
  
  /** 获取所有支持的语言 */
  getSupportedLanguages(): LanguageId[];
}
