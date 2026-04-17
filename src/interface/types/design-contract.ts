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
  | 'ambiguous-heading'
  | 'invalid-frontmatter'
  | 'invalid-rules-root'
  | 'invalid-rule-type'
  | 'missing-rule-field'
  | 'invalid-rule-severity'
  | 'unknown-rule-field'
  | 'unknown-frontmatter-field';

/**
 * 可执行 rule 严重级别
 */
export type DesignContractRuleSeverity = 'error' | 'warn';

/**
 * 可执行 rule 类型
 */
export type DesignContractRuleType =
  | 'layer_direction'
  | 'forbidden_imports'
  | 'module_public_api_only'
  | 'complexity_threshold';

/**
 * Rule 公共字段
 */
export interface DesignContractBaseRule {
  type: DesignContractRuleType;
  name: string;
  severity: DesignContractRuleSeverity;
}

/**
 * 分层依赖方向规则
 */
export interface LayerDirectionRule extends DesignContractBaseRule {
  type: 'layer_direction';
  from: string;
  to: string;
}

/**
 * 禁止导入规则
 */
export interface ForbiddenImportsRule extends DesignContractBaseRule {
  type: 'forbidden_imports';
  module: string;
  forbidden: string[];
}

/**
 * 模块只能通过 public api 访问
 */
export interface ModulePublicApiOnlyRule extends DesignContractBaseRule {
  type: 'module_public_api_only';
  module: string;
  publicApi: string;
}

/**
 * 复杂度阈值规则
 */
export interface ComplexityThresholdRule extends DesignContractBaseRule {
  type: 'complexity_threshold';
  module: string;
  maxCyclomatic?: number;
  maxCognitive?: number;
  minMaintainability?: number;
}

/**
 * 全量可执行规则
 */
export type DesignContractRule =
  | LayerDirectionRule
  | ForbiddenImportsRule
  | ModulePublicApiOnlyRule
  | ComplexityThresholdRule;

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
  rules: DesignContractRule[];
  sections: Partial<Record<DesignContractSectionId, DesignContractSection>>;
  orderedSections: DesignContractSection[];
  missingRequiredSections: DesignContractRequiredSectionId[];
  diagnostics: DesignContractDiagnostic[];
}
