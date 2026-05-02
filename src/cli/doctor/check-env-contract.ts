// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Doctor checker for env-contract schema validity, critical coverage, source drift, and conflicts.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DiagnosticResult } from './types.js';
import { checkProjectEnvironmentContract } from '../env-contract/check.js';
import type { ProjectEnvironmentContract } from '../env-contract/types.js';

const CONTRACT_RELATIVE_PATH = '.mycodemap/env-contract.json';

export function checkEnvContract(rootDir: string): DiagnosticResult[] {
  const results: DiagnosticResult[] = [];
  const contractPath = path.join(rootDir, CONTRACT_RELATIVE_PATH);

  // Missing contract file — warn (not error) since init may not have been run
  if (!existsSync(contractPath)) {
    results.push({
      category: 'agent',
      severity: 'warn',
      id: 'env-contract-missing',
      message: 'No .mycodemap/env-contract.json found.',
      remediation: 'Run `mycodemap init` or `mycodemap env-contract --update` to generate the environment contract.',
    });
    return results;
  }

  // Read and parse
  let contract: ProjectEnvironmentContract;
  try {
    const raw = readFileSync(contractPath, 'utf8');
    contract = JSON.parse(raw) as ProjectEnvironmentContract;
  } catch {
    results.push({
      category: 'agent',
      severity: 'error',
      id: 'env-contract-unreadable',
      message: 'Could not read or parse .mycodemap/env-contract.json.',
      remediation: 'Regenerate the contract with `mycodemap env-contract --update`.',
    });
    return results;
  }

  // Run core checks (schema validation, critical items, drift, conflicts)
  const checkResult = checkProjectEnvironmentContract(contract, rootDir);

  // Schema validity
  const schemaDiag = checkResult.diagnostics.find((d) => d.id === 'schema-valid');
  if (schemaDiag && schemaDiag.severity !== 'ok') {
    results.push({
      category: 'agent',
      severity: 'error',
      id: 'env-contract-schema-invalid',
      message: schemaDiag.message,
      remediation: schemaDiag.remediation,
    });
  }

  // Missing critical items
  const criticalDiag = checkResult.diagnostics.find((d) => d.id === 'critical-items-present');
  if (criticalDiag && criticalDiag.severity !== 'ok') {
    results.push({
      category: 'agent',
      severity: 'error',
      id: 'env-contract-critical-missing',
      message: criticalDiag.message,
      remediation: criticalDiag.remediation,
    });
  }

  // Source drift (error-level)
  for (const diag of checkResult.diagnostics) {
    if (diag.id.startsWith('source-drift:') && diag.severity === 'error') {
      results.push({
        category: 'agent',
        severity: 'error',
        id: 'env-contract-source-drift',
        message: diag.message,
        remediation: diag.remediation,
      });
    }
  }

  // Conflicts (warn-level)
  const conflictDiag = checkResult.diagnostics.find((d) => d.id === 'conflicts');
  if (conflictDiag && conflictDiag.severity === 'warn') {
    results.push({
      category: 'agent',
      severity: 'warn',
      id: 'env-contract-conflict',
      message: conflictDiag.message,
      remediation: conflictDiag.remediation,
    });
  }

  // If all checks passed, report ok
  if (results.length === 0) {
    results.push({
      category: 'agent',
      severity: 'ok',
      id: 'env-contract-fresh',
      message: 'Environment contract is valid, fresh, and has no conflicts.',
      remediation: 'No action needed.',
    });
  }

  return results;
}
