// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Barrel exports for output mode module — single import point for all commands

export { resolveOutputMode } from './mode.js';
export { createProgressEmitter } from './progress.js';
export { formatError } from './errors.js';
export { renderOutput } from './render.js';
export type { OutputMode, OutputModeOptions, ProgressEmitter, StructuredError } from './types.js';
