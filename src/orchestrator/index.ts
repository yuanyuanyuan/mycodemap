/**
 * Orchestrator 模块入口
 *
 * 导出编排层的所有核心类型和类
 */

// 类型导出
export type {
  UnifiedResult,
  HeatScore,
  ToolOptions,
  IntentType,
  CodemapIntent,
  AnalyzeArgs
} from './types';

// 类导出
export { ToolOrchestrator } from './tool-orchestrator.js';
export type { ToolAdapter, ExecutionResult, SafeExecutionResult } from './tool-orchestrator.js';

export { IntentRouter } from './intent-router.js';

export { ResultFusion } from './result-fusion.js';
export type { FusionOptions } from './result-fusion.js';

export { calculateConfidence } from './confidence.js';
export type { ConfidenceResult } from './confidence.js';

export { validateCommitMessage, validateRecentCommits, VALID_TAGS } from './commit-validator.js';
export type { CommitValidationResult } from './commit-validator.js';

export { scanDirectory, assessRisk, SUPPORTED_EXTENSIONS } from './file-header-scanner.js';
export type { FileHeaderResult, RiskAssessment } from './file-header-scanner.js';
