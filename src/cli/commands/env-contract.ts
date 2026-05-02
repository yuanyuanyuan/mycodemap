// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Top-level 'env-contract' command — query the Project Environment Contract for subagent rule retrieval.

import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  discoverProjectEnvironmentContract,
  filterContractForAgent,
  checkProjectEnvironmentContract,
  validateProjectEnvironmentContract,
  type ProjectEnvironmentContract,
  type ContractCategory,
} from '../env-contract/index.js';
import { resolveOutputMode, formatError } from '../output/index.js';

interface EnvContractCommandOptions {
  json?: boolean;
  human?: boolean;
  for?: string;
  category?: string;
  check?: boolean;
  update?: boolean;
  asHookConfig?: boolean;
  asCodexAgent?: boolean;
}

const CONTRACT_FILE = '.mycodemap/env-contract.json';

function loadExistingContract(rootDir: string): ProjectEnvironmentContract | undefined {
  const contractPath = path.join(rootDir, CONTRACT_FILE);
  if (!existsSync(contractPath)) return undefined;
  try {
    const raw = readFileSync(contractPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const result = validateProjectEnvironmentContract(parsed);
    if (result.valid) return parsed as ProjectEnvironmentContract;
    return undefined;
  } catch {
    return undefined;
  }
}

function writeContractFile(rootDir: string, contract: ProjectEnvironmentContract): void {
  const contractPath = path.join(rootDir, CONTRACT_FILE);
  const dir = path.dirname(contractPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(contractPath, JSON.stringify(contract, null, 2) + '\n', 'utf8');
}

function buildHookConfigOutput(agentType: string): string {
  const hookJson = {
    hooks: {
      SubagentStart: [
        {
          matcher: agentType === 'default' ? '*' : agentType.charAt(0).toUpperCase() + agentType.slice(1),
          hooks: [
            {
              type: 'command',
              command: `echo '{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":"Before starting work, run: mycodemap env-contract --for ${agentType} --json"}}'`,
            },
          ],
        },
      ],
    },
  };
  return JSON.stringify(hookJson, null, 2);
}

function buildCodexAgentOutput(agentType: string): string {
  return `name = "${agentType}"
description = "Execution-focused agent for implementation and fixes"
# model = "gpt-5.4"
# model_reasoning_effort = "high"
# sandbox_mode = "workspace-write"
developer_instructions = """
You are a ${agentType} agent responsible for implementing and fixing code.

Before starting any task, query the project environment contract:
- Run: mycodemap env-contract --for ${agentType} --json
- Or use the MCP tool: codemap_env_contract(agentType="${agentType}")

The contract contains project-specific rules that you MUST follow, including:
- Shell command wrappers (e.g., rtk)
- Commit message format
- Test entry commands
- Code style requirements
"""
`;
}

function getExitCodeForCheck(
  result: ReturnType<typeof checkProjectEnvironmentContract>,
  contract: ProjectEnvironmentContract,
): number {
  if (result.status === 'error') return 1;
  if (result.status === 'warn') return 2;
  // Also check if there are only conflicts (warn-only)
  if (contract.conflicts.length > 0 && result.status === 'ok') return 2;
  return 0;
}

async function envContractAction(options: EnvContractCommandOptions): Promise<void> {
  try {
    const rootDir = process.cwd();
    const mode = resolveOutputMode({ json: options.json, human: options.human });

    // Determine agent type for filtering
    const agentType = options.for ?? 'default';

    // Load or discover contract
    let contract = loadExistingContract(rootDir);
    let discoveredFresh = false;
    if (!contract) {
      contract = discoverProjectEnvironmentContract(rootDir);
      discoveredFresh = true;
      // Write if --update is specified
      if (options.update) {
        writeContractFile(rootDir, contract);
        discoveredFresh = false;
      }
    } else if (options.update) {
      // Regenerate even if existing
      contract = discoverProjectEnvironmentContract(rootDir);
      writeContractFile(rootDir, contract);
    }

    // --as-hook-config mode
    if (options.asHookConfig) {
      const output = buildHookConfigOutput(agentType);
      process.stdout.write(output + '\n');
      return;
    }

    // --as-codex-agent mode
    if (options.asCodexAgent) {
      const output = buildCodexAgentOutput(agentType);
      process.stdout.write(output + '\n');
      return;
    }

    // --check mode
    if (options.check) {
      const checkResult = checkProjectEnvironmentContract(contract, rootDir);
      if (mode === 'json') {
        process.stdout.write(JSON.stringify({
          ...checkResult,
          contract: {
            schemaVersion: contract.schemaVersion,
            generatedAt: contract.generatedAt,
            itemCount: contract.items.length,
            conflictCount: contract.conflicts.length,
          },
        }, null, 2) + '\n');
      } else {
        const statusIcon = checkResult.status === 'ok' ? 'OK' : checkResult.status === 'warn' ? 'WARN' : 'ERROR';
        process.stdout.write(`Contract Status: ${statusIcon}\n`);
        for (const d of checkResult.diagnostics) {
          const icon = d.severity === 'ok' ? '  [OK]' : d.severity === 'warn' ? '  [WARN]' : '  [ERR]';
          process.stdout.write(`${icon} ${d.message}\n`);
          if (d.remediation) {
            process.stdout.write(`         -> ${d.remediation}\n`);
          }
        }
      }
      process.exitCode = getExitCodeForCheck(checkResult, contract);
      return;
    }

    // Normal retrieval mode
    let items = filterContractForAgent(contract, agentType);

    // Apply optional category filter
    if (options.category) {
      const category = options.category as ContractCategory;
      items = items.filter((item) => item.category === category);
    }

    // Build output
    const output = {
      schemaVersion: contract.schemaVersion,
      generatedAt: contract.generatedAt,
      agentType,
      items,
      conflicts: contract.conflicts,
      sourceSnapshots: contract.sourceSnapshots,
      ...(discoveredFresh ? { _note: 'Contract discovered from current files (not loaded from .mycodemap/env-contract.json). Run with --update to persist.' } : {}),
    };

    if (mode === 'json') {
      process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    } else {
      // Human-readable output
      process.stdout.write(`Project Environment Contract\n`);
      process.stdout.write(`Schema: ${contract.schemaVersion} | Generated: ${contract.generatedAt}\n`);
      process.stdout.write(`Agent filter: ${agentType} | Items: ${items.length}\n\n`);
      for (const item of items) {
        process.stdout.write(`[${item.severity.toUpperCase()}] ${item.id} (${item.category})\n`);
        process.stdout.write(`  ${item.content}\n`);
        for (const src of item.sources) {
          process.stdout.write(`  Source: ${src.file}${src.line ? `:${src.line}` : ''} [${src.authority}]\n`);
        }
        process.stdout.write('\n');
      }
      if (contract.conflicts.length > 0) {
        process.stdout.write(`\nConflicts (${contract.conflicts.length}):\n`);
        for (const c of contract.conflicts) {
          process.stdout.write(`  [${c.severity.toUpperCase()}] ${c.id}: ${c.description}\n`);
          process.stdout.write(`  Recommendation: ${c.recommendation}\n`);
        }
      }
    }
  } catch (error) {
    const mode = resolveOutputMode({ json: options.json, human: options.human });
    process.stdout.write(formatError(error, mode) + '\n');
    process.exitCode = 1;
  }
}

export const envContractCommand = new Command('env-contract')
  .description('Query the Project Environment Contract for subagent rule retrieval')
  .option('-j, --json', 'Output contract as JSON')
  .option('--human', 'Force human-readable output')
  .option('--for <agentType>', 'Filter contract items for an agent type (explore|plan|edit|worker|review|verify|default)')
  .option('--category <category>', 'Filter by contract category (execution|commit|retrieval|validation|style)')
  .option('--check', 'Check contract freshness and critical coverage')
  .option('--update', 'Regenerate .mycodemap/env-contract.json')
  .option('--as-hook-config', 'Print Claude Code SubagentStart hook example')
  .option('--as-codex-agent', 'Print Codex agent developer_instructions example')
  .action(envContractAction);
