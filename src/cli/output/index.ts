// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Barrel exports for output mode module — single import point for all commands

export { resolveOutputMode } from './mode.js';
export { createProgressEmitter } from './progress.js';
export { formatError, createActionableError } from './errors.js';
export { renderOutput } from './render.js';
export type { OutputMode, OutputModeOptions, ProgressEmitter, StructuredError, ActionableError } from './types.js';
export { isActionableError, APPLY_SUGGESTION_CONFIDENCE_THRESHOLD } from './types.js';
export { ErrorCodes, ErrorRemediation } from './error-codes.js';
export type { ErrorCode } from './error-codes.js';
