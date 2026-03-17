// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Interface Layer - Core type definitions for CodeMap
// This is the source of truth for all types in the system
// ============================================
// CodeMap 核心类型定义 - Interface Layer
// ============================================

// ============================================
// Section 1: 基础类型定义
// ============================================

// 符号类型
export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable'
  | 'constant'
  | 'namespace'
  | 'decorator'
  | 'method'
  | 'property'
  | 'parameter';

// 源代码位置
export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

// 装饰器信息
export interface DecoratorInfo {
  name: string;
  params?: unknown;
  target: 'class' | 'method' | 'property' | 'parameter';
}

// 函数参数信息
export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

// 调用关系信息
export interface CallInfo {
  callee: string;
  line: number;
  column?: number;
}

// 代码片段类型
export type CodeSnippetType = 'if' | 'loop' | 'try' | 'switch' | 'early-return' | 'guard';

// 代码片段
export interface CodeSnippet {
  type: CodeSnippetType;
  lines: string;
  lineStart: number;
  lineEnd: number;
  description?: string;
}

// 函数签名信息
export interface FunctionSignature {
  parameters: ParameterInfo[];
  returnType: string;
  genericParams?: string[];
  async: boolean;
  calls?: CallInfo[];  // 该函数调用了哪些函数
  bodySnippets?: CodeSnippet[];  // 函数体关键代码片段
}

// ============================================
// Section 2: 复杂度指标
// ============================================

/** 复杂度指标 */
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

// ============================================
// Section 3: 类/接口成员
// ============================================

// 类/接口成员信息
export interface MemberInfo {
  name: string;
  kind: 'property' | 'method' | 'getter' | 'setter';
  type: string;
  visibility: 'public' | 'private' | 'protected' | 'internal';
  optional: boolean;
  static?: boolean;
  abstract?: boolean;
  readonly?: boolean;
  signature?: FunctionSignature;  // 用于方法
}

// ============================================
// Section 3: JSDoc 注释
// ============================================

// JSDoc 标签
export interface JSDocTag {
  name: string;
  text?: string;
}

// JSDoc 注释
export interface JSDocComment {
  description: string;
  tags: JSDocTag[];
  params: Array<{
    name: string;
    description?: string;
    type?: string;
  }>;
  returns?: {
    description?: string;
    type?: string;
  };
  examples: string[];
  deprecated?: string;
  since?: string;
  see: string[];
}

// ============================================
// Section 4: 符号系统
// ============================================

// 符号信息
export interface ModuleSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
  location: SourceLocation;
  visibility: 'public' | 'private' | 'protected' | 'internal';
  documentation?: string;
  jsdoc?: JSDocComment;           // 结构化 JSDoc
  relatedSymbols: string[];
  decorators?: DecoratorInfo[];
  // 详细签名信息
  signature?: FunctionSignature;  // 用于函数
  members?: MemberInfo[];         // 用于类/接口
  type?: string;                  // 用于类型别名、变量
  extends?: string[];             // 用于类/接口的继承
  implements?: string[];          // 用于类的实现
}

// ============================================
// Section 5: 导入/导出
// ============================================

// 导入信息
export interface ImportInfo {
  source: string;
  sourceType: 'relative' | 'absolute' | 'node_module' | 'alias';
  specifiers: ImportSpecifier[];
  isTypeOnly: boolean;
  isReExport?: boolean;  // 是否为 re-export (export ... from)
}

export interface ImportSpecifier {
  name: string;
  alias?: string;
  isTypeOnly: boolean;
}

// 导出信息
export interface ExportInfo {
  name: string;
  kind: SymbolKind;
  isDefault: boolean;
  isTypeOnly: boolean;
  origin?: string;
}

// ============================================
// Section 6: 模块信息
// ============================================

// 模块信息
export interface ModuleInfo {
  id: string;
  path: string;
  absolutePath: string;
  type: 'source' | 'test' | 'config' | 'type';

  // 基本统计
  stats: {
    lines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  };

  // 导出信息
  exports: ExportInfo[];

  // 导入信息
  imports: ImportInfo[];

  // 模块内容概览
  overview?: string;

  // 符号列表
  symbols: ModuleSymbol[];

  // 依赖关系
  dependencies: string[];
  dependents: string[];

  // Smart 模式额外信息
  /** 复杂度指标 */
  complexity?: {
    cyclomatic: number;
    cognitive: number;
    maintainability: number;
    details?: {
      functions: Array<{
        name: string;
        cyclomatic: number;
        cognitive: number;
        lines: number;
      }>;
    };
  };

  /** 调用图 */
  callGraph?: {
    calls: Array<{
      caller: string;
      callee: string;
      line: number;
    }>;
    recursive: string[];
    callCounts: Record<string, number>;
    crossFileCalls?: CrossFileCall[];
  };

  /** 完整类型信息 */
  typeInfo?: {
    typeDefinitions: Array<{
      name: string;
      kind: 'interface' | 'type' | 'enum' | 'class' | 'alias';
      members: Array<{
        name: string;
        type: string;
        optional: boolean;
      }>;
    }>;
    genericParams: Array<{
      name: string;
      extends?: string;
      default?: string;
    }>;
    crossFileRefs: Array<{
      symbol: string;
      file: string;
      line: number;
    }>;
    unionTypes: string[];
    intersectionTypes: string[];
  };
}

// ============================================
// Section 7: 项目信息
// ============================================

// 项目摘要
export interface ProjectSummary {
  totalFiles: number;
  totalLines: number;
  totalModules: number;
  totalExports: number;
  totalTypes: number;
}

// 项目信息
export interface ProjectInfo {
  name: string;
  rootDir: string;
  tsconfigPath?: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

// ============================================
// Section 8: 依赖图
// ============================================

// 依赖图节点
export interface DependencyNode {
  id: string;
  path: string;
  category: 'core' | 'feature' | 'utility' | 'external';
}

// 依赖图边
export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'inherit' | 'implement' | 'call' | 'type-ref';
  weight: number;
}

// 依赖图
export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

// ============================================
// Section 9: 代码地图根对象
// ============================================

// 代码地图根对象
export interface CodeMap {
  version: string;
  generatedAt: string;
  project: ProjectInfo;
  summary: ProjectSummary;
  modules: ModuleInfo[];
  dependencies: DependencyGraph;
  actualMode?: 'fast' | 'smart'; // Hybrid 模式下实际使用的模式
}

// ============================================
// Section 10: 分析选项
// ============================================

// 分析选项
export interface AnalysisOptions {
  mode: 'fast' | 'smart' | 'hybrid';
  rootDir: string;
  include?: string[];
  exclude?: string[];
  output?: string;
  watch?: boolean;
  actualMode?: 'fast' | 'smart'; // Hybrid 模式下实际使用的模式
}

// 文件变更
export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  oldHash?: string;
  newHash?: string;
}

// ============================================
// Section 11: 全局符号索引
// ============================================

// 全局符号信息
export interface GlobalSymbolInfo {
  name: string;
  kind: SymbolKind;
  filePath: string;
  line: number;
  column: number;
  isExported: boolean;
  isDefault?: boolean;
}

// 跨文件调用信息
export interface CrossFileCall {
  callee: string;
  calleeLocation: SourceLocation;
  callerLocation: SourceLocation;
  importPath?: string;
  resolved: boolean;
}

// 全局符号索引
export interface GlobalSymbolIndex {
  symbols: Map<string, GlobalSymbolInfo[]>;  // symbolName -> locations
  files: Map<string, FileSymbolIndex>;       // filePath -> file symbols
}

// 单个文件的符号索引
export interface FileSymbolIndex {
  filePath: string;
  imports: Map<string, ImportInfo>;              // alias -> import
  exports: Map<string, GlobalSymbolInfo>;        // name -> symbol
  localSymbols: Map<string, GlobalSymbolInfo>;   // name -> symbol
  crossFileCalls: CrossFileCall[];
}

// 调用链
export interface CallChain {
  entries: CallChainEntry[];
  depth: number;
}

// 调用链条目
export interface CallChainEntry {
  file: string;
  symbol: string;
  line: number;
  column: number;
  callType: 'local' | 'cross-file' | 'external';
}

// ============================================
// Section 12: 完整类型信息
// ============================================

// 类型成员
export interface TypeMember {
  name: string;
  type: string;
  optional: boolean;
  visibility: 'public' | 'private' | 'protected';
  isReadonly?: boolean;
}

// 类型定义
export interface TypeDefinition {
  name: string;
  kind: 'interface' | 'type' | 'enum' | 'class' | 'alias';
  members: TypeMember[];
  extends?: string[];
  implements?: string[];
  genericParams?: GenericParam[];
  description?: string;
}

// 泛型参数
export interface GenericParam {
  name: string;
  extends?: string;
  default?: string;
  constraint?: string;
  variance?: 'in' | 'out' | 'inout';
}

// 条件类型
export interface ConditionalTypeInfo {
  checkType: string;
  extendsType: string;
  trueType: string;
  falseType: string;
}

// 映射类型
export interface MappedTypeInfo {
  typeParameter: string;
  constraint: string;
  valueType: string;
  asType?: string;
  modifiers?: ('readonly' | 'optional' | 'nullable')[];
  readonly?: 'add' | 'remove';
  optional?: 'add' | 'remove';
}

// 模板字面量类型
export interface TemplateLiteralTypeInfo {
  head: string;
  spans: Array<{
    type: string;
    literal: string;
  }>;
}

// 增强类型信息
export interface AdvancedTypeInfo {
  conditionalTypes?: ConditionalTypeInfo[];
  mappedTypes?: MappedTypeInfo[];
  templateLiteralTypes?: TemplateLiteralTypeInfo[];
  indexedAccessTypes?: string[];
  inferredTypes?: string[];
}

// 跨文件引用
export interface CrossFileRef {
  symbol: string;
  file: string;
  line: number;
  column?: number;
  exportName?: string;
}

// 完整类型信息
export interface FullTypeInfo {
  typeDefinitions: TypeDefinition[];
  genericParams: GenericParam[];
  crossFileRefs: CrossFileRef[];
  unionTypes: string[];
  intersectionTypes: string[];
  typeAliases: Array<{
    name: string;
    type: string;
    genericParams?: GenericParam[];
  }>;
}

// ============================================
// Section 13: 可视化配置
// ============================================

// 可视化节点
export interface VisualizationNode {
  id: string;
  label: string;
  path: string;
  category: 'core' | 'feature' | 'utility' | 'external' | 'entry';
  type: 'source' | 'test' | 'config' | 'type';
  exportCount: number;
  dependencyCount: number;
}

// 可视化边
export interface VisualizationEdge {
  from: string;
  to: string;
  type: 'import' | 'inherit' | 'implement' | 'call' | 'type-ref';
  label?: string;
}

// Mermaid 可视化配置
export interface MermaidConfig {
  graphType: 'graph' | 'flowchart' | 'mindmap';
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  nodeShape: 'box' | 'round' | 'stadium' | 'cylinder';
  showLabels: boolean;
  maxNodes: number;
  maxEdges: number;
}

// 可视化输出配置
export interface VisualizationConfig {
  mermaid: MermaidConfig;
  includeTestFiles: boolean;
  includeExternalDeps: boolean;
  showComplexity: boolean;
  outputFormat: 'markdown' | 'html' | 'json';
}

// ============================================
// Section 14: Domain 实体类型 (MVP3 新增)
// ============================================

// 领域实体: 项目
export interface Project {
  id: string;
  name: string;
  rootPath: string;
  createdAt: Date;
  updatedAt: Date;
}

// 领域实体: 模块
export interface Module {
  id: string;
  projectId: string;
  path: string;
  language: string;
  stats: {
    lines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  };
}

// 领域实体: 符号
export interface Symbol {
  id: string;
  moduleId: string;
  name: string;
  kind: SymbolKind;
  location: SourceLocation;
  visibility: 'public' | 'private' | 'protected' | 'internal';
}

// 领域实体: 依赖
export interface Dependency {
  id: string;
  sourceId: string;  // 模块ID
  targetId: string;  // 模块ID
  type: 'import' | 'inherit' | 'implement' | 'call' | 'type-ref';
}

// 领域实体: 代码图
export interface CodeGraph {
  project: Project;
  modules: Module[];
  symbols: Symbol[];
  dependencies: Dependency[];
}
