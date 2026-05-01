// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Mode-aware error formatting — structured JSON for machines, chalk-colored text for humans

import chalk from 'chalk';
import type { OutputMode, ActionableError, StructuredError } from './types.js';
import { isActionableError, APPLY_SUGGESTION_CONFIDENCE_THRESHOLD } from './types.js';
import { ErrorCodes, ErrorRemediation, type ErrorCode } from './error-codes.js';

interface ErrorWithCode extends Error {
  code?: string;
  remediation?: string;
  syscall?: string;
  path?: string;
  cause?: unknown;
}

/**
 * Format an error based on output mode.
 *
 * - JSON mode: returns JSON string of {type:"error", code, message, ...actionableFields}
 * - Human mode: returns chalk-colored readable string
 */
export function formatError(error: unknown, mode: OutputMode, attempted?: string): string {
  const normalized = normalizeError(error, attempted);

  if (mode === 'json') {
    const base: StructuredError = {
      type: 'error',
      code: normalized.code,
      message: normalized.message,
      ...(normalized.remediation ? { remediation: normalized.remediation } : {}),
    };
    if (isActionableError(normalized)) {
      const json: Record<string, unknown> = {
        ...base,
        attempted: normalized.attempted,
        rootCause: normalized.rootCause,
        remediationPlan: normalized.remediationPlan,
        confidence: normalized.confidence,
      };
      if (normalized.nextCommand) json.nextCommand = normalized.nextCommand;
      if (normalized.causes && normalized.causes.length > 0) json.causes = normalized.causes;
      return JSON.stringify(json);
    }
    return JSON.stringify(base);
  }

  // Human mode
  let output = chalk.red('Error: ') + normalized.message;
  if (normalized.code && normalized.code !== 'UNKNOWN') {
    output = chalk.red('Error: ') + `[${normalized.code}] ${normalized.message}`;
  }
  if (isActionableError(normalized)) {
    output += '\n  ' + chalk.cyan('Attempted: ') + normalized.attempted;
    output += '\n  ' + chalk.cyan('Root cause: ') + normalized.rootCause;
    if (normalized.remediationPlan) {
      const pct = Math.round(normalized.confidence * 100);
      output += `\n  ${chalk.yellow('Suggestion: ')}${normalized.remediationPlan} (${pct}% confidence)`;
    }
    if (normalized.nextCommand) {
      output += '\n  ' + chalk.green('Next: ') + normalized.nextCommand;
    }
  } else if (normalized.remediation) {
    output += '\n  ' + chalk.yellow('Suggestion: ') + normalized.remediation;
  }
  return output;
}

/**
 * Normalize any thrown value into an ActionableError with auto-detected codes.
 */
function normalizeError(error: unknown, attempted?: string): ActionableError {
  if (error instanceof Error) {
    const err = error as ErrorWithCode;
    const detected = detectErrorPattern(err);
    return {
      type: 'error',
      code: detected.code,
      message: err.message,
      attempted: attempted ?? 'unknown operation',
      rootCause: detectRootCause(err),
      remediationPlan: detected.remediation.message,
      confidence: detected.remediation.confidence,
      nextCommand: detected.remediation.nextCommand,
      remediation: detected.remediation.nextCommand ?? detected.remediation.message,
      causes: extractCauses(err),
    };
  }

  return {
    type: 'error',
    code: ErrorCodes.RUN_COMMAND_FAILED,
    message: String(error),
    attempted: attempted ?? 'unknown operation',
    rootCause: String(error),
    remediationPlan: ErrorRemediation.RUN_COMMAND_FAILED.message,
    confidence: 0.1,
  };
}

/**
 * Map Node.js error codes and patterns to our error code registry.
 */
function detectErrorPattern(err: ErrorWithCode): { code: string; remediation: { message: string; nextCommand?: string; confidence: number } } {
  const errCode = err.code ?? '';
  const msg = err.message.toLowerCase();

  // Node.js system error codes
  if (errCode === 'MODULE_NOT_FOUND') {
    return { code: ErrorCodes.DEP_MODULE_NOT_FOUND, remediation: ErrorRemediation.DEP_MODULE_NOT_FOUND };
  }
  if (errCode === 'EACCES' || errCode === 'EPERM') {
    return { code: ErrorCodes.FS_PERMISSION_DENIED, remediation: ErrorRemediation.FS_PERMISSION_DENIED };
  }
  if (errCode === 'ENOENT') {
    return { code: ErrorCodes.FS_FILE_NOT_FOUND, remediation: ErrorRemediation.FS_FILE_NOT_FOUND };
  }

  // Preserve custom error codes from callers (e.g., MISSING_TARGET, INDEX_NOT_FOUND)
  if (errCode && !Object.values(ErrorCodes).includes(errCode as ErrorCode)) {
    const customRemediation = err.remediation
      ? { message: err.remediation, confidence: 0.7 }
      : { message: 'Check the error details and try again', confidence: 0.3 };
    return { code: errCode, remediation: customRemediation };
  }

  // Content-based detection for native dependency failures
  if (msg.includes('tree-sitter') || msg.includes('better-sqlite3')) {
    return { code: ErrorCodes.DEP_NATIVE_MISSING, remediation: ErrorRemediation.DEP_NATIVE_MISSING };
  }
  if (msg.includes('config.json') || msg.includes('.mycodemap')) {
    return { code: ErrorCodes.CFG_INVALID_CONFIG, remediation: ErrorRemediation.CFG_INVALID_CONFIG };
  }
  if (msg.includes('not initialized') || msg.includes('workspace not found')) {
    return { code: ErrorCodes.CFG_WORKSPACE_NOT_INITIALIZED, remediation: ErrorRemediation.CFG_WORKSPACE_NOT_INITIALIZED };
  }

  return { code: ErrorCodes.RUN_COMMAND_FAILED, remediation: ErrorRemediation.RUN_COMMAND_FAILED };
}

/**
 * Extract the deepest root cause from an error message or cause chain.
 */
function detectRootCause(err: ErrorWithCode): string {
  if (err.cause instanceof Error) {
    return detectRootCause(err.cause as ErrorWithCode);
  }
  return err.message;
}

/**
 * Walk the error.cause chain and convert each to ActionableError.
 */
function extractCauses(err: ErrorWithCode): ActionableError[] {
  const causes: ActionableError[] = [];
  let current = err.cause;
  while (current instanceof Error) {
    const causeErr = current as ErrorWithCode;
    causes.push({
      type: 'error',
      code: causeErr.code ?? 'UNKNOWN',
      message: causeErr.message,
      attempted: 'nested error',
      rootCause: causeErr.message,
      remediationPlan: '',
      confidence: 0,
    });
    current = causeErr.cause;
  }
  return causes;
}

/**
 * Programmatically create an ActionableError with sensible defaults.
 */
export function createActionableError(
  code: ErrorCode | string,
  message: string,
  attempted: string,
  overrides?: Partial<Pick<ActionableError, 'confidence' | 'nextCommand' | 'causes' | 'rootCause' | 'remediationPlan'>>
): ActionableError {
  const remediation = ErrorRemediation[code as ErrorCode] ?? { message: 'Check the error details', confidence: 0.3 };
  return {
    type: 'error',
    code,
    message,
    attempted,
    rootCause: overrides?.rootCause ?? message,
    remediationPlan: overrides?.remediationPlan ?? remediation.message,
    confidence: overrides?.confidence ?? remediation.confidence,
    nextCommand: overrides?.nextCommand ?? remediation.nextCommand,
    remediation: overrides?.nextCommand ?? remediation.message,
    ...(overrides?.causes ? { causes: overrides.causes } : {}),
  };
}
