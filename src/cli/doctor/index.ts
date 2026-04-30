// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Public API for the doctor module — orchestrator, formatters, types, individual checkers

export type {
  DiagnosticCategory,
  DiagnosticResult,
  DiagnosticSeverity,
  DoctorOptions,
  DoctorReport,
} from './types.js';

export { runDoctor } from './orchestrator.js';
export { formatDoctorJson, formatDoctorReport } from './formatter.js';
export { checkGhostCommands } from './check-ghost-commands.js';
export { checkNativeDeps } from './check-native-deps.js';
export { checkWorkspaceDrift } from './check-workspace-drift.js';
export { checkAgent } from './check-agent.js';
