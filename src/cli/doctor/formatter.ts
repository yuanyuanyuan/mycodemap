// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] TTY-aware output formatting — JSON flat array for non-TTY/CI, colorized table for interactive terminals

import chalk from 'chalk';
import type { DiagnosticResult, DiagnosticSeverity } from './types.js';

const CATEGORY_ORDER: Record<string, number> = {
  install: 0,
  config: 1,
  runtime: 2,
  agent: 3,
};

const CATEGORY_WIDTH = 10;
const SEVERITY_WIDTH = 8;
const ID_WIDTH = 28;

function severityLabel(severity: DiagnosticSeverity): string {
  switch (severity) {
    case 'error':
      return chalk.red('error');
    case 'warn':
      return chalk.yellow('warn');
    case 'ok':
      return chalk.green('ok');
    case 'info':
      return chalk.cyan('info');
  }
}

function sortByCategory(results: DiagnosticResult[]): DiagnosticResult[] {
  return [...results].sort((a, b) => {
    const orderA = CATEGORY_ORDER[a.category] ?? 99;
    const orderB = CATEGORY_ORDER[b.category] ?? 99;
    return orderA - orderB;
  });
}

/**
 * Format diagnostics as a JSON flat array — simple, grepable, jq-friendly.
 * Each element: {category, severity, id, message, remediation}
 * nextCommand is included only when defined.
 */
export function formatDoctorJson(results: DiagnosticResult[]): string {
  const serializable = results.map((r) => {
    const entry: Record<string, string> = {
      category: r.category,
      severity: r.severity,
      id: r.id,
      message: r.message,
      remediation: r.remediation,
    };
    if (r.nextCommand) {
      entry.nextCommand = r.nextCommand;
    }
    return entry;
  });
  return JSON.stringify(serializable, null, 2);
}

/**
 * Format diagnostics as a colorized table — human-friendly for TTY output.
 * Columns: CATEGORY, SEVERITY, ID, MESSAGE
 * Grouped by category order with a summary line.
 */
export function formatDoctorReport(results: DiagnosticResult[]): string {
  const sorted = sortByCategory(results);
  const lines: string[] = [];

  // Header
  const header =
    'CATEGORY'.padEnd(CATEGORY_WIDTH) +
    'SEVERITY'.padEnd(SEVERITY_WIDTH) +
    'ID'.padEnd(ID_WIDTH) +
    'MESSAGE';
  lines.push(header);
  lines.push('-'.repeat(header.length));

  // Data rows
  for (const r of sorted) {
    const category = r.category.padEnd(CATEGORY_WIDTH);
    const severity = severityLabel(r.severity).padEnd(SEVERITY_WIDTH + 9); // +9 for ANSI escape codes from chalk
    const id = r.id.padEnd(ID_WIDTH);
    lines.push(`${category}${severity}${id}${r.message}`);
  }

  // Summary line
  const errorCount = results.filter((r) => r.severity === 'error').length;
  const warnCount = results.filter((r) => r.severity === 'warn').length;
  const infoCount = results.filter((r) => r.severity === 'info').length;
  const okCount = results.filter((r) => r.severity === 'ok').length;

  lines.push('');
  lines.push(
    `Total: ${results.length} diagnostics (${errorCount} errors, ${warnCount} warnings, ${infoCount} info, ${okCount} passed)`
  );

  return lines.join('\n');
}
