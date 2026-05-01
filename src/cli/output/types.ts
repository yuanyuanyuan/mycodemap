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

/**
 * Actionable error with recovery context — extends StructuredError
 * with fields that enable automated or guided remediation.
 */
export interface ActionableError extends StructuredError {
  type: 'error';
  code: string;  // ErrorCode from registry or custom code from callers
  attempted: string;
  rootCause: string;
  remediationPlan: string;
  confidence: number;  // 0-1 float
  nextCommand?: string;
  causes?: ActionableError[];
}

/**
 * Type guard: checks if an error has actionable recovery fields
 */
export function isActionableError(error: StructuredError | ActionableError): error is ActionableError {
  return 'attempted' in error && 'rootCause' in error && 'confidence' in error;
}

/**
 * Confidence threshold for --apply-suggestion auto-execution.
 * Suggestions below this threshold are not auto-executed.
 */
export const APPLY_SUGGESTION_CONFIDENCE_THRESHOLD = 0.8;
