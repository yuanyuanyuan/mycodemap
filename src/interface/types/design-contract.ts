// [META] since:2026-03-25 | owner:architecture-team | stable:false
// [WHY] Define the formal design-contract types shared by CLI validation and future design-to-agent workflows
// ============================================
// Design Contract 类型定义
// ============================================

/**
 * 必填 section
 */
export type DesignContractRequiredSectionId =
  | 'goal'
  | 'constraints'
  | 'acceptanceCriteria'
  | 'nonGoals';

/**
 * 可选 section
 */
export type DesignContractOptionalSectionId =
  | 'context'
  | 'openQuestions'
  | 'notes';

/**
 * 全量 section 标识
 */
export type DesignContractSectionId =
  | DesignContractRequiredSectionId
  | DesignContractOptionalSectionId;

/**
 * 结构化诊断严重级别
 */
export type DesignContractDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * 结构化诊断代码
 */
export type DesignContractDiagnosticCode =
  | 'file-not-found'
  | 'missing-section'
  | 'duplicate-section'
  | 'empty-section'
  | 'unknown-section'
  | 'ambiguous-heading';

/**
 * 原始/归一化 section 内容
 */
export interface DesignContractSection {
  id: DesignContractSectionId;
  title: string;
  rawHeading: string;
  content: string[];
  line: number;
}

/**
 * 设计契约元数据
 */
export interface DesignContractMetadata {
  version: 'v1';
  title?: string;
  sourcePath?: string;
}

/**
 * 结构化诊断
 */
export interface DesignContractDiagnostic {
  code: DesignContractDiagnosticCode;
  severity: DesignContractDiagnosticSeverity;
  message: string;
  section?: DesignContractSectionId;
  heading?: string;
  line?: number;
  suggestion?: string;
}

/**
 * 原始设计契约文档
 */
export interface DesignContract {
  metadata: DesignContractMetadata;
  sections: DesignContractSection[];
}

/**
 * 归一化设计契约（允许带缺失段，供 validator/CLI 决策）
 */
export interface NormalizedDesignContract {
  metadata: DesignContractMetadata;
  sections: Partial<Record<DesignContractSectionId, DesignContractSection>>;
  orderedSections: DesignContractSection[];
  missingRequiredSections: DesignContractRequiredSectionId[];
  diagnostics: DesignContractDiagnostic[];
}
