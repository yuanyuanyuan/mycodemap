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
  /** 行号 */
  line: number;
  /** 截断后的内容 */
  content: string;
  /** 归一化相关度（0-1） */
  relevance: number;
  /** 匹配的关键词 */
  keywords: string[];
  /** 元数据 */
  metadata: {
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
  /** 最后修改日期 */
  lastDate: string;
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
