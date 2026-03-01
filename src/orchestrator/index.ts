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

// AI 饲料生成器导出
export {
  AIFeedGenerator,
  FileHeaderScanner
} from './ai-feed-generator.js';
export type {
  AIFeed,
  FileMeta,
  FileHeader,
  FileHeaderMeta
} from './ai-feed-generator.js';

// Git 分析器导出
export {
  GitAnalyzer,
  TAG_WEIGHTS,
  COMMIT_TAG_REGEX
} from './git-analyzer.js';
export type {
  CommitInfo,
  CommitTag,
  CommitTagType,
  RiskLevel,
  RiskScore
} from './git-analyzer.js';
