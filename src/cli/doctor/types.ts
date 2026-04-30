// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Shared diagnostic types for codemap doctor — single source of truth for checker output shape

export type DiagnosticCategory = 'install' | 'config' | 'runtime' | 'agent';
export type DiagnosticSeverity = 'ok' | 'warn' | 'error' | 'info';

export interface DiagnosticResult {
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  id: string;             // English kebab-case, e.g. "ghost-command-detected"
  message: string;        // Human-readable description
  remediation: string;    // Plain text remediation instruction
  nextCommand?: string;   // Optional executable command for remediation
}

export interface DoctorOptions {
  json?: boolean;
  cwd?: string;
}

export interface DoctorReport {
  results: DiagnosticResult[];
  exitCode: number;  // 0=all pass, 1=has errors, 2=warnings only
}
