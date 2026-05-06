// [META] since:2026-03-03 | owner:orchestrator-team | stable:true
// [WHY] Thin CLI wrapper for shared query execution so CLI and MCP can converge on one transport-free truth

import { resolveOutputMode, renderOutput, createProgressEmitter, formatError } from '../output/index.js';
import type { OutputMode } from '../output/index.js';
import {
  executeQueryTool,
  formatQueryHuman,
  type QueryMetrics,
  type QueryOptions,
  type QueryResult,
  type QueryResultItem,
} from '../../execution/contract-tools/query.js';
import type { ContractToolError } from '../../execution/contract-tools/types.js';

function toExecutionError(error: ContractToolError): Error {
  const executionError = new Error(error.message) as Error & {
    code?: string;
    remediation?: string;
    details?: Record<string, unknown>;
  };

  executionError.code = error.code;
  executionError.remediation = error.remediation;
  executionError.details = error.details;
  return executionError;
}

export async function queryCommand(options: QueryOptions): Promise<void> {
  const mode: OutputMode = resolveOutputMode({ json: options.json, human: options.human });
  const progress = createProgressEmitter(mode, 'Querying...');

  try {
    progress.update(30, 'Loading index...');
    const execution = await executeQueryTool(options, process.cwd());

    if (execution.status !== 'ok' || !execution.result) {
      throw toExecutionError(
        execution.error ?? {
          code: 'EXECUTION_FAILED',
          message: 'Query execution failed',
        }
      );
    }

    progress.complete();
    renderOutput(execution.result, formatQueryHuman, mode);
  } catch (error) {
    progress.fail();
    process.stdout.write(formatError(error, mode, 'codemap query') + '\n');
    process.exitCode = 1;
  }
}

export type {
  QueryMetrics,
  QueryOptions,
  QueryResult,
  QueryResultItem,
};
