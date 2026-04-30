// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Agent diagnostics — validates contract schema integrity and MCP server module availability

import { validateCurrentContract, getFullContract } from '../interface-contract/index.js';
import type { DiagnosticResult } from './types.js';

export async function checkAgent(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Check contract schema validity
  const contractValidation = validateCurrentContract();
  if (contractValidation.valid) {
    results.push({
      category: 'agent',
      severity: 'ok',
      id: 'contract-schema-ok',
      message: 'Interface contract schema is valid',
      remediation: 'No action needed',
    });
  } else {
    const errorDetails = contractValidation.errors?.join('; ') ?? 'unknown validation error';
    results.push({
      category: 'agent',
      severity: 'error',
      id: 'contract-schema-invalid',
      message: `Interface contract schema is invalid: ${errorDetails}`,
      remediation: 'Review the interface contract definitions in src/cli/interface-contract/commands/',
    });
  }

  // Check that contract has registered commands
  const contract = getFullContract();
  if (contract.commands.length === 0) {
    results.push({
      category: 'agent',
      severity: 'warn',
      id: 'contract-empty',
      message: 'Interface contract has no registered commands',
      remediation: 'Ensure command contracts are properly registered in src/cli/interface-contract/commands/',
    });
  }

  // Check MCP server module availability
  try {
    await import('../../server/mcp/server.js');
    results.push({
      category: 'agent',
      severity: 'ok',
      id: 'mcp-server-available',
      message: 'MCP server module is available',
      remediation: 'No action needed',
    });
  } catch {
    results.push({
      category: 'agent',
      severity: 'warn',
      id: 'mcp-server-unavailable',
      message: 'MCP server module could not be loaded',
      remediation: 'Ensure the MCP server module is built and available',
    });
  }

  return results;
}
