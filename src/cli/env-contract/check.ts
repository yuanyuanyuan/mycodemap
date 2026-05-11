// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Drift/conflict/validity checks for Project Environment Contract data.

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { ProjectEnvironmentContract } from './types.js';
import { validateProjectEnvironmentContract } from './validation.js';

export interface EnvContractDiagnostic {
  id: string;
  severity: 'ok' | 'warn' | 'error';
  message: string;
  remediation: string;
}

export interface EnvContractCheckResult {
  ok: boolean;
  status: 'ok' | 'warn' | 'error';
  diagnostics: EnvContractDiagnostic[];
}

const CRITICAL_ITEM_IDS = [
  'commit-format',
  'test-entry-command',
] as const;

function sha256(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/**
 * Check a Project Environment Contract for validity, critical coverage,
 * source freshness, and conflicts.
 */
export function checkProjectEnvironmentContract(
  contract: ProjectEnvironmentContract,
  rootDir?: string,
): EnvContractCheckResult {
  const diagnostics: EnvContractDiagnostic[] = [];

  // 1. Schema validation
  const schemaResult = validateProjectEnvironmentContract(contract);
  if (!schemaResult.valid) {
    diagnostics.push({
      id: 'schema-valid',
      severity: 'error',
      message: `Contract schema invalid: ${schemaResult.errors.join('; ')}`,
      remediation: 'Regenerate the contract with `mycodemap env-contract --update`.',
    });
    return { ok: false, status: 'error', diagnostics };
  }

  diagnostics.push({
    id: 'schema-valid',
    severity: 'ok',
    message: 'Contract schema is valid.',
    remediation: '',
  });

  // 2. Critical item presence
  const presentIds = new Set(contract.items.map((item) => item.id));
  const missingCritical = CRITICAL_ITEM_IDS.filter((id) => !presentIds.has(id));

  if (missingCritical.length > 0) {
    diagnostics.push({
      id: 'critical-items-present',
      severity: 'error',
      message: `Missing critical contract items: ${missingCritical.join(', ')}`,
      remediation: 'Ensure the managed hook payloads exist and the project exposes a detectable test command (package.json scripts.test, pytest, go test, or cargo test), then regenerate.',
    });
  } else {
    diagnostics.push({
      id: 'critical-items-present',
      severity: 'ok',
      message: 'All critical contract items are present.',
      remediation: '',
    });
  }

  // 3. Source snapshot freshness (drift detection)
  if (rootDir) {
    for (const snapshot of contract.sourceSnapshots) {
      const fullPath = path.join(rootDir, snapshot.file);
      if (!existsSync(fullPath)) {
        diagnostics.push({
          id: `source-drift:${snapshot.file}`,
          severity: 'error',
          message: `Source file ${snapshot.file} no longer exists.`,
          remediation: `Regenerate the contract with \`mycodemap env-contract --update\`.`,
        });
        continue;
      }

      try {
        const currentContent = readFileSync(fullPath, 'utf8');
        const currentHash = sha256(currentContent);
        if (currentHash !== snapshot.hash) {
          diagnostics.push({
            id: `source-drift:${snapshot.file}`,
            severity: 'error',
            message: `Source file ${snapshot.file} has changed since contract generation.`,
            remediation: `Regenerate the contract with \`mycodemap env-contract --update\`.`,
          });
        }
      } catch {
        diagnostics.push({
          id: `source-drift:${snapshot.file}`,
          severity: 'warn',
          message: `Cannot read source file ${snapshot.file} for drift check.`,
          remediation: 'Verify file permissions and regenerate the contract.',
        });
      }
    }
  }

  // 4. Conflicts (warn-only)
  if (contract.conflicts.length > 0) {
    diagnostics.push({
      id: 'conflicts',
      severity: 'warn',
      message: `${contract.conflicts.length} conflict(s) detected: ${contract.conflicts.map((c) => c.id).join(', ')}`,
      remediation: 'Review conflicts and align documentation with executable sources.',
    });
  } else {
    diagnostics.push({
      id: 'conflicts',
      severity: 'ok',
      message: 'No conflicts detected.',
      remediation: '',
    });
  }

  // Determine overall status
  const hasError = diagnostics.some((d) => d.severity === 'error');
  const hasWarn = diagnostics.some((d) => d.severity === 'warn');

  const status = hasError ? 'error' : hasWarn ? 'warn' : 'ok';

  return {
    ok: !hasError,
    status,
    diagnostics,
  };
}
