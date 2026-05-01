// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Shared types for AI-first output mode — single source of truth for mode, progress, error shapes

/**
 * Output mode: 'json' for non-TTY/CI/piped consumers, 'human' for interactive terminals
 */
export type OutputMode = 'json' | 'human';

/**
 * Options passed from CLI flags to resolveOutputMode
 */
export interface OutputModeOptions {
  json?: boolean;
  human?: boolean;
}

/**
 * Structured progress emitter — abstracts away NDJSON-vs-spinner differences
 */
export interface ProgressEmitter {
  update(percent: number, message: string): void;
  complete(): void;
  fail(message?: string): void;
}

/**
 * Structured error shape for JSON mode output
 */
export interface StructuredError {
  type: 'error';
  code: string;
  message: string;
  remediation?: string;
}
