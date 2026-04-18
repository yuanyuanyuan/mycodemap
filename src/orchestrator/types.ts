// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] Core type definitions with optional fields for flexible unified results

import type { SourceLocation } from '../types/index.js';

/**
 * ComplexityMetrics 复杂度指标
 */
export interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  functions?: number;
  classes?: number;
  lines?: number;
}

/**
 * UnifiedResult 统一结果接口
 * 用于规范化不同工具的输出格式
 */
export interface UnifiedResult {
  /** 唯一标识 */
  id: string;
  /** 来源工具 */
  source: 'codemap' | 'ast-grep' | 'rg-internal' | 'ai-feed' | 'codemap-fallback';
  /** 工具返回的原始分数（0-1） */
  toolScore: number;
  /** 结果类型 */
  type: 'file' | 'symbol' | 'code' | 'documentation' | 'risk-assessment';
  /** 文件路径 */
  file: string;
  /** 行号（可选）- 保留向后兼容，建议使用 location */
  line?: number;
  /** 结构化位置信息（新增） */
  location?: SourceLocation;
  /** 截断后的内容 */
  content: string;
  /** 归一化相关度（0-1） */
  relevance: number;
  /** 匹配的关键词 */
  keywords: string[];
  /** 元数据（可选） */
  metadata?: {
    /** 符号类型 */
    symbolType?: 'class' | 'function' | 'interface' | 'variable';
    /** 依赖文件列表 */
    dependencies?: string[];
    /** 关联的测试文件 */
    testFile?: string;
    /** 提交次数 */
    commitCount?: number;
    /** 依赖复杂度评分 */
    gravity?: number;
    /** 热度评分对象 */
    heatScore?: HeatScore;
    /** 影响文件数 */
    impactCount?: number;
    /** 是否稳定 */
    stability?: boolean;
    /** 风险等级 */
    riskLevel?: 'high' | 'medium' | 'low';
    /** 复杂度指标 */
    complexityMetrics?: ComplexityMetrics;
  };
}

/**
 * HeatScore 热度评分接口
 */
export interface HeatScore {
  /** 30天修改次数 */
  freq30d: number;
  /** 最后提交标签 */
  lastType: string;
  /** 最后修改日期（ISO 字符串格式） */
  lastDate: string | null;
  /** 是否稳定 (沉积岩 vs 火山灰) */
  stability: boolean;
}

/**
 * ToolOptions 工具选项类型
 * 用于 execute 方法的 options 参数
 */
export interface ToolOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 返回结果数量上限 */
  topK?: number;
  /** 是否包含测试文件 */
  includeTests?: boolean;
  /** 其他扩展选项 */
  [key: string]: unknown;
}

/**
 * IntentType 意图类型
 */
export const PUBLIC_INTENTS = ['find', 'read', 'link', 'show'] as const;

/**
 * LegacyIntentType 旧 analyze 意图类型
 */
export const LEGACY_INTENTS = [
  'impact',
  'dependency',
  'search',
  'documentation',
  'complexity',
  'overview',
  'refactor',
  'reference'
] as const;

/**
 * CompatibleLegacyIntentType 兼容期内可归一化的旧意图
 */
export const COMPATIBLE_LEGACY_INTENTS = [
  'impact',
  'dependency',
  'search',
  'documentation',
  'complexity',
  'overview',
  'reference'
] as const;

export type IntentType = (typeof PUBLIC_INTENTS)[number];
export type LegacyIntentType = (typeof LEGACY_INTENTS)[number];
export type CompatibleLegacyIntentType = (typeof COMPATIBLE_LEGACY_INTENTS)[number];
export type ExecutionIntentType = CompatibleLegacyIntentType;

/**
 * IntentCompatibility 兼容层元数据
 */
export interface IntentCompatibility {
  /** 是否来自旧意图归一化 */
  isDeprecated?: boolean;
  /** 原始旧意图 */
  normalizedFrom?: CompatibleLegacyIntentType;
}

/**
 * AnalyzeWarning 结构化 warning
 */
export interface AnalyzeWarning {
  code: 'deprecated-intent';
  severity: 'warning';
  message: string;
  deprecatedIntent: CompatibleLegacyIntentType;
  replacementIntent: IntentType;
  sunsetPolicy: '2-minor-window';
}

export type AnalyzeDiagnosticStatus = 'success' | 'partialFailure' | 'failure';

export type AnalyzeDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface AnalyzeDiagnostic {
  code: string;
  severity: AnalyzeDiagnosticSeverity;
  message: string;
  source: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export interface AnalyzeDiagnostics {
  status: AnalyzeDiagnosticStatus;
  items: AnalyzeDiagnostic[];
  failedTools?: string[];
  degradedTools?: string[];
}

export interface ReadImpactAnalysisItem {
  file: string;
  location?: SourceLocation;
  changedFiles: string[];
  transitiveDependencies: string[];
  impactCount: number;
  risk: 'high' | 'medium' | 'low';
}

export interface ReadComplexityAnalysisItem {
  file: string;
  location?: SourceLocation;
  metrics: ComplexityMetrics;
  risk: 'high' | 'medium' | 'low';
}

export interface ReadAnalysis {
  intent: 'read';
  impact?: ReadImpactAnalysisItem[];
  complexity?: ReadComplexityAnalysisItem[];
}

export interface LinkReferenceMatch {
  file: string;
  line: number;
  snippet?: string;
}

export interface LinkReferenceAnalysisItem {
  target: string;
  callers: string[];
  callees: string[];
  matches: LinkReferenceMatch[];
}

export interface LinkDependencyAnalysisItem {
  file: string;
  location?: SourceLocation;
  imports: string[];
  importedBy: string[];
  cycles?: string[][];
}

export interface LinkAnalysis {
  intent: 'link';
  reference?: LinkReferenceAnalysisItem[];
  dependency?: LinkDependencyAnalysisItem[];
}

export interface ShowOverviewSection {
  title: string;
  file: string;
  overview: string;
  exports: string[];
}

export interface ShowDocumentationSection {
  title: string;
  file: string;
  content: string;
}

export interface ShowAnalysis {
  intent: 'show';
  overview?: ShowOverviewSection[];
  documentation?: ShowDocumentationSection[];
}

export type CodemapAnalysis = ReadAnalysis | LinkAnalysis | ShowAnalysis;

/**
 * CodemapIntent Codemap 意图对象
 */
export interface CodemapIntent {
  intent: IntentType;
  /** Phase 03-01 过渡期内的底层执行意图 */
  executionIntent?: ExecutionIntentType;
  targets: string[];
  keywords: string[];
  scope: 'direct' | 'transitive';
  tool: string;
  secondary?: string;
  compatibility?: IntentCompatibility;
}

/**
 * AnalyzeArgs 分析命令参数
 */
export interface AnalyzeArgs {
  intent?: string;
  targets?: string[];
  keywords?: string[];
  scope?: 'direct' | 'transitive';
  topK?: number;
  includeTests?: boolean;
  includeGitHistory?: boolean;
  json?: boolean;
  /** 输出完全结构化的 JSON（不包含自然语言字符串） */
  structured?: boolean;
  outputMode?: 'machine' | 'human';
}

/**
 * Confidence 置信度对象
 */
export interface Confidence {
  /** 置信度分数 (0-1) */
  score: number;
  /** 置信度级别 */
  level: 'high' | 'medium' | 'low';
}

/**
 * ConfidenceResult 置信度结果
 */
export interface ConfidenceResult {
  /** 置信度分数 (0-1) */
  score: number;
  /** 置信度级别 */
  level: 'high' | 'medium' | 'low';
  /** 置信度来源说明 */
  reasons: string[];
}

/**
 * CodemapOutput Codemap 统一输出格式
 * 用于规范 analyze 命令的 machine/json 输出
 */
export interface CodemapOutput {
  /** Schema 版本，格式: "v1.0.0" */
  schemaVersion: string;
  /** 执行的 intent 类型 */
  intent: IntentType;
  /** 主要工具 */
  tool: string;
  /** 置信度信息 */
  confidence: Confidence;
  /** 结果列表 */
  results: UnifiedResult[];
  /** 结构化 warning（兼容期弃用提示等） */
  warnings?: AnalyzeWarning[];
  /** 机器可读诊断，区分成功、降级和失败 */
  diagnostics?: AnalyzeDiagnostics;
  /** intent 特定的 machine-readable 聚合分析 */
  analysis?: CodemapAnalysis;
  /** 可选的元数据 */
  metadata?: {
    /** 执行时间（毫秒） */
    executionTime?: number;
    /** 结果总数 */
    resultCount?: number;
    /** 总数（兼容旧字段） */
    total?: number;
    /** 范围 */
    scope?: string;
  };
}

/**
 * 类型守卫：检查对象是否为 CodemapOutput
 */
export function isCodemapOutput(obj: unknown): obj is CodemapOutput {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const output = obj as Record<string, unknown>;

  // 检查必需字段
  if (typeof output.schemaVersion !== 'string') return false;
  if (typeof output.intent !== 'string') return false;
  if (typeof output.tool !== 'string') return false;
  if (typeof output.confidence !== 'object' || output.confidence === null) return false;

  const confidence = output.confidence as Record<string, unknown>;
  if (typeof confidence.score !== 'number') return false;
  if (!['high', 'medium', 'low'].includes(confidence.level as string)) return false;

  if (!Array.isArray(output.results)) return false;

  if (output.diagnostics !== undefined) {
    if (typeof output.diagnostics !== 'object' || output.diagnostics === null) return false;

    const diagnostics = output.diagnostics as Record<string, unknown>;
    if (!['success', 'partialFailure', 'failure'].includes(diagnostics.status as string)) return false;
    if (!Array.isArray(diagnostics.items)) return false;

    if (
      diagnostics.failedTools !== undefined &&
      !(
        Array.isArray(diagnostics.failedTools) &&
        diagnostics.failedTools.every(item => typeof item === 'string')
      )
    ) {
      return false;
    }

    if (
      diagnostics.degradedTools !== undefined &&
      !(
        Array.isArray(diagnostics.degradedTools) &&
        diagnostics.degradedTools.every(item => typeof item === 'string')
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 计算置信度级别
 */
export function calculateConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}
