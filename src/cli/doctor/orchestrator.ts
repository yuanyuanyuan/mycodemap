// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Orchestrate all doctor checkers and compute aggregate exit code per CONTEXT.md exit behavior decision

import { checkGhostCommands } from './check-ghost-commands.js';
import { checkNativeDeps } from './check-native-deps.js';
import { checkWorkspaceDrift } from './check-workspace-drift.js';
import { checkAgent } from './check-agent.js';
import type { DiagnosticResult, DoctorOptions, DoctorReport } from './types.js';

export async function runDoctor(options: DoctorOptions): Promise<DoctorReport> {
  const rootDir = options.cwd ?? process.cwd();

  // Run all checkers in parallel — ghost/native/workspace are sync, agent is async
  const [ghostResults, nativeResults, workspaceResults, agentResults] = await Promise.all([
    Promise.resolve(checkGhostCommands(rootDir)),
    Promise.resolve(checkNativeDeps()),
    Promise.resolve(checkWorkspaceDrift(rootDir)),
    checkAgent(),
  ]);

  const results: DiagnosticResult[] = [
    ...ghostResults,
    ...nativeResults,
    ...workspaceResults,
    ...agentResults,
  ];

  // Compute exit code: 0=all pass, 1=has errors, 2=warnings only
  const hasErrors = results.some((r) => r.severity === 'error');
  const hasWarnings = results.some((r) => r.severity === 'warn');

  let exitCode: number;
  if (hasErrors) {
    exitCode = 1;
  } else if (hasWarnings) {
    exitCode = 2;
  } else {
    exitCode = 0;
  }

  return { results, exitCode };
}
