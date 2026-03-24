// [META] since:2026-03-02 | owner:workflow-team | stable:true
// [WHY] Centralize workflow domain types shared by orchestrator, persistence, and CLI

/**
 * 工作流编排器类型定义
 * 定义工作流阶段、上下文、交付物等核心类型
 */

import type { UnifiedResult, ConfidenceResult } from '../types.js';

// ============================================
// 工作流阶段类型
// ============================================

/**
 * 工作流阶段类型
 * 4 个纯分析阶段：find → read → link → show
 */
export const WORKFLOW_PHASES = ['find', 'read', 'link', 'show'] as const;

export type WorkflowPhase =
  | 'find'    // 查找符号 / 文件
  | 'read'    // 阅读影响 / 复杂度
  | 'link'    // 关联依赖 / 引用
  | 'show';   // 展示概览 / 文档

/**
 * 阶段执行方式
 */
export type PhaseAction = 'analyze' | 'ci' | 'manual';

/**
 * 阶段状态类型
 */
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'verified' | 'skipped';

// ============================================
// 阶段定义接口
// ============================================

/**
 * 阶段入口条件
 */
export interface PhaseCondition {
  /** 最低置信度 */
  minConfidence?: number;
  /** 必需的产物 */
  requiredArtifacts?: string[];
}

/**
 * 阶段交付物
 */
export interface Deliverable {
  /** 交付物名称 */
  name: string;
  /** 交付物路径 */
  path: string;
  /** 验证器函数 */
  validator: (path: string) => boolean;
}

/**
 * 阶段定义接口
 */
export interface PhaseDefinition {
  /** 阶段名称 */
  name: WorkflowPhase;
  /** 执行方式 */
  action: PhaseAction;
  /** 分析意图（仅 action=analyze 时需要） */
  analyzeIntent?: string;
  /** CI 命令（仅 action=ci 时需要） */
  ciCommand?: string;
  /** 入口条件 */
  entryCondition: PhaseCondition;
  /** 交付物列表 */
  deliverables: Deliverable[];
  /** 下一阶段 */
  nextPhase?: WorkflowPhase;
  /** 可执行的命令 */
  commands: string[];
}

// ============================================
// 工作流上下文接口
// ============================================

/**
 * 阶段产物
 */
export interface PhaseArtifacts {
  /** 阶段 */
  phase: WorkflowPhase;
  /** 分析结果 */
  results?: UnifiedResult[];
  /** 置信度 */
  confidence?: ConfidenceResult;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 缓存结果
 */
export interface CachedResults {
  /** 查找结果 */
  find?: UnifiedResult[];
  /** 阅读结果 */
  read?: UnifiedResult[];
  /** 关联结果 */
  link?: UnifiedResult[];
  /** 展示结果 */
  show?: UnifiedResult[];
}

/**
 * 风险评分
 */
export interface RiskScore {
  /** 总体风险评分 (0-1) */
  score: number;
  /** 风险等级 */
  level: 'high' | 'medium' | 'low';
  /** 风险因素 */
  factors: string[];
}

/**
 * 工作流上下文
 */
export interface WorkflowContext {
  /** 工作流实例 ID */
  id: string;
  /** 用户任务描述 */
  task: string;
  /** 工作流模板名称（可选） */
  templateName?: string;
  /** 当前阶段 */
  currentPhase: WorkflowPhase;
  /** 阶段状态 */
  phaseStatus: PhaseStatus;
  /** 阶段产物（自动传递） */
  artifacts: Map<WorkflowPhase, PhaseArtifacts>;
  /** 分析结果缓存 */
  cachedResults: CachedResults;
  /** 用户确认状态 */
  userConfirmed: Set<WorkflowPhase>;
  /** 开始时间 */
  startedAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

// ============================================
// 工作流状态与结果
// ============================================

/**
 * 工作流状态
 */
export interface WorkflowStatus {
  /** 是否活动 */
  active: boolean;
  /** 任务描述 */
  task?: string;
  /** 当前阶段 */
  currentPhase?: WorkflowPhase;
  /** 阶段状态 */
  phaseStatus?: PhaseStatus;
  /** 进度百分比 */
  progress?: number;
  /** 已完成的阶段 */
  artifacts?: WorkflowPhase[];
}

/**
 * 阶段执行结果
 */
export interface PhaseResult {
  /** 阶段产物 */
  artifacts: PhaseArtifacts;
  /** 置信度 */
  confidence: ConfidenceResult;
  /** 是否可以进入下一阶段 */
  canProceed: boolean;
}

/**
 * 工作流摘要
 */
export interface WorkflowSummary {
  /** 工作流 ID */
  id: string;
  /** 任务描述 */
  task: string;
  /** 当前阶段 */
  currentPhase: WorkflowPhase;
  /** 阶段状态 */
  phaseStatus: PhaseStatus;
  /** 更新时间 */
  updatedAt: string;
}

// ============================================
// 检查点相关
// ============================================

/**
 * 检查项目
 */
export interface CheckItem {
  /** 交付物名称 */
  name: string;
  /** 交付物路径 */
  path: string;
  /** 是否存在 */
  exists: boolean;
  /** 是否有效 */
  valid: boolean;
}

/**
 * 检查点结果
 */
export interface CheckpointResult {
  /** 是否通过 */
  passed: boolean;
  /** 检查项目列表 */
  items: CheckItem[];
}

// ============================================
// 置信度引导
// ============================================

/**
 * 引导动作
 */
export type GuidanceAction = 'auto-proceed' | 'confirm-proceed' | 'hold';

/**
 * 置信度引导
 */
export interface Guidance {
  /** 建议动作 */
  action: GuidanceAction;
  /** 提示消息 */
  message: string;
  /** 建议 */
  suggestion?: string;
}
