// [META] since:2026-03-03 | owner:orchestrator-team | stable:true
// [WHY] Thin CLI wrapper for shared deps execution so CLI and MCP can converge on one transport-free truth

import { resolveOutputMode, renderOutput, createProgressEmitter, formatError } from '../output/index.js';
import type { OutputMode } from '../output/index.js';
import {
  DepsCommand,
  executeDepsTool,
  formatDepsHuman,
  type DepsArgs,
  type DepsModuleInfo,
  type DepsOptions,
  type DepsResult,
} from '../../execution/contract-tools/deps.js';
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

export async function depsCommand(options: DepsOptions): Promise<void> {
  const mode: OutputMode = resolveOutputMode({ json: options.json, human: options.human });
  const progress = createProgressEmitter(mode, 'Analyzing deps...');

  try {
    progress.update(30, 'Loading modules...');
    const execution = await executeDepsTool(options, process.cwd());

    if (execution.status !== 'ok' || !execution.result) {
      throw toExecutionError(
        execution.error ?? {
          code: 'EXECUTION_FAILED',
          message: 'Deps execution failed',
        }
      );
    }

    progress.complete();
    renderOutput(execution.result, formatDepsHuman, mode);
  } catch (error) {
    progress.fail();
    process.stdout.write(formatError(error, mode, 'codemap deps') + '\n');
    process.exitCode = 1;
  }
}

export { DepsCommand };
export type {
  DepsArgs,
  DepsModuleInfo,
  DepsOptions,
  DepsResult,
};
