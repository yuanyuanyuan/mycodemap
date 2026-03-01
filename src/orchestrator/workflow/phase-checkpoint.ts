/**
 * 阶段检查点验证
 * 验证阶段交付物是否满足要求
 */

import { promises as fs } from 'node:fs';
import type { WorkflowPhase, PhaseArtifacts, CheckpointResult, CheckItem, PhaseDefinition } from './types.js';

/**
 * 阶段检查点类
 */
export class PhaseCheckpoint {
  /**
   * 验证阶段交付物
   */
  async validate(
    phase: WorkflowPhase,
    artifacts: PhaseArtifacts,
    definition: PhaseDefinition
  ): Promise<CheckpointResult> {
    const results: CheckItem[] = [];

    for (const deliverable of definition.deliverables) {
      const exists = await this.checkFileExists(deliverable.path);
      const valid = exists ? deliverable.validator(deliverable.path) : false;

      results.push({
        name: deliverable.name,
        path: deliverable.path,
        exists,
        valid
      });
    }

    return {
      passed: results.every(r => r.exists && r.valid),
      items: results
    };
  }

  /**
   * 检查文件是否存在
   */
  private async checkFileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证所有必需的阶段产物是否存在
   */
  async validateAll(
    phases: Map<WorkflowPhase, PhaseArtifacts>,
    definitions: Map<WorkflowPhase, PhaseDefinition>
  ): Promise<{ phase: WorkflowPhase; result: CheckpointResult }[]> {
    const results: { phase: WorkflowPhase; result: CheckpointResult }[] = [];

    for (const [phase, artifacts] of phases) {
      const definition = definitions.get(phase);
      if (!definition) continue;

      const result = await this.validate(phase, artifacts, definition);
      results.push({ phase, result });
    }

    return results;
  }

  /**
   * 获取阶段验证状态摘要
   */
  getSummary(results: { phase: WorkflowPhase; result: CheckpointResult }[]): {
    total: number;
    passed: number;
    failed: number;
    phases: Record<WorkflowPhase, boolean>;
  } {
    const phases: Record<WorkflowPhase, boolean> = {} as Record<WorkflowPhase, boolean>;
    let passed = 0;

    for (const { phase, result } of results) {
      phases[phase] = result.passed;
      if (result.passed) passed++;
    }

    return {
      total: results.length,
      passed,
      failed: results.length - passed,
      phases
    };
  }
}
