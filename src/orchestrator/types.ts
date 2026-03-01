// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] Core type definitions with optional fields for flexible unified results

/**
 * UnifiedResult 统一结果接口
 * 用于规范化不同工具的输出格式
 */
export interface UnifiedResult {
  /** 唯一标识 */
  id: string;
  /** 来源工具 */
  source: 'codemap' | 'ast-grep' | 'rg-internal' | 'ai-feed';
  /** 工具返回的原始分数（0-1） */
  toolScore: number;
  /** 结果类型 */
  type: 'file' | 'symbol' | 'code' | 'documentation' | 'risk-assessment';
  /** 文件路径 */
  file: string;
  /** 行号（可选） */
  line?: number;
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
export type IntentType =
  | 'impact'
  | 'dependency'
  | 'search'
  | 'documentation'
  | 'complexity'
  | 'overview'
  | 'refactor'
  | 'reference';

/**
 * CodemapIntent Codemap 意图对象
 */
export interface CodemapIntent {
  intent: IntentType;
  targets: string[];
  keywords: string[];
  scope: 'direct' | 'transitive';
  tool: string;
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
  intent: string;
  /** 主要工具 */
  tool: string;
  /** 置信度信息 */
  confidence: Confidence;
  /** 结果列表 */
  results: UnifiedResult[];
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
