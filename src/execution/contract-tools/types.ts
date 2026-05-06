// [META] since:2026-05-06 | owner:orchestrator-team | stable:false
// [WHY] Shared transport-free execution envelope for the Phase 61 query/deps/analyze convergence

export type ContractToolName = 'query' | 'deps' | 'analyze';
export type ContractToolStatus = 'ok' | 'error';

export interface ContractToolError {
  code: string;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

export interface ContractToolDiagnostics {
  tool: ContractToolName;
  rootDir: string;
  dataPath?: string;
  durationMs?: number;
  cacheHit?: boolean;
  notes?: string[];
}

export interface ContractToolExecutionResult<TResult> {
  status: ContractToolStatus;
  result?: TResult;
  error?: ContractToolError;
  diagnostics: ContractToolDiagnostics;
}

export function createContractSuccess<TResult>(
  diagnostics: ContractToolDiagnostics,
  result: TResult
): ContractToolExecutionResult<TResult> {
  return {
    status: 'ok',
    result,
    diagnostics,
  };
}

export function createContractError<TResult>(
  diagnostics: ContractToolDiagnostics,
  error: ContractToolError
): ContractToolExecutionResult<TResult> {
  return {
    status: 'error',
    error,
    diagnostics,
  };
}

export function normalizeExecutionError(error: unknown): ContractToolError {
  if (error instanceof Error) {
    const enriched = error as Error & {
      code?: string;
      remediation?: string;
      details?: Record<string, unknown>;
    };

    return {
      code: enriched.code ?? 'EXECUTION_FAILED',
      message: enriched.message,
      ...(enriched.remediation ? { remediation: enriched.remediation } : {}),
      ...(enriched.details ? { details: enriched.details } : {}),
    };
  }

  return {
    code: 'EXECUTION_FAILED',
    message: String(error),
  };
}
