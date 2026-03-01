/**
 * 工作流上下文管理
 * 提供工作流上下文的创建、验证和管理功能
 */

import type {
  WorkflowContext,
  WorkflowPhase,
  PhaseArtifacts,
  CachedResults,
  PhaseStatus
} from './types.js';

/**
 * 工作流上下文工厂
 */
export class WorkflowContextFactory {
  /**
   * 创建新的工作流上下文
   */
  static create(task: string): WorkflowContext {
    return {
      id: this.generateId(),
      task,
      currentPhase: 'reference' as WorkflowPhase,
      phaseStatus: 'pending' as PhaseStatus,
      artifacts: new Map<WorkflowPhase, PhaseArtifacts>(),
      cachedResults: {} as CachedResults,
      userConfirmed: new Set<WorkflowPhase>(),
      startedAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 生成唯一 ID
   */
  private static generateId(): string {
    return `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 验证工作流上下文
   */
  static validate(context: WorkflowContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!context.id) {
      errors.push('Missing workflow ID');
    }

    if (!context.task) {
      errors.push('Missing task description');
    }

    if (!context.currentPhase) {
      errors.push('Missing current phase');
    }

    if (!context.phaseStatus) {
      errors.push('Missing phase status');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 创建阶段产物
   */
  static createPhaseArtifacts(
    phase: WorkflowPhase,
    results?: unknown[],
    confidence?: { score: number; level: string; reasons: string[] },
    metadata?: Record<string, unknown>
  ): PhaseArtifacts {
    return {
      phase,
      results: results as never[],
      confidence: confidence as never,
      metadata,
      createdAt: new Date()
    };
  }
}

/**
 * 工作流上下文验证器
 */
export class WorkflowContextValidator {
  /**
   * 验证是否可以推进到下一阶段
   */
  static canProceed(context: WorkflowContext): { valid: boolean; reason?: string } {
    // 检查当前阶段是否完成
    if (context.phaseStatus !== 'completed' && context.phaseStatus !== 'verified') {
      return {
        valid: false,
        reason: `Current phase ${context.currentPhase} is not completed (status: ${context.phaseStatus})`
      };
    }

    // 检查是否有产物
    const artifacts = context.artifacts.get(context.currentPhase);
    if (!artifacts) {
      return {
        valid: false,
        reason: `No artifacts found for phase ${context.currentPhase}`
      };
    }

    return { valid: true };
  }

  /**
   * 验证阶段状态转换是否有效
   */
  static isValidStatusTransition(
    currentStatus: PhaseStatus,
    newStatus: PhaseStatus
  ): boolean {
    const validTransitions: Record<PhaseStatus, PhaseStatus[]> = {
      'pending': ['running'],
      'running': ['completed', 'pending'],
      'completed': ['verified', 'skipped'],
      'verified': ['pending'],
      'skipped': []
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }
}
