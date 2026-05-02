// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Interface contract for the `env-contract` command — subagent rule retrieval surface.

import type { CommandContract } from '../types.js';

export const envContractContract: CommandContract = {
  name: 'env-contract',
  aliases: ['env_contract'],
  description: 'Query the Project Environment Contract for subagent rule retrieval',
  args: [],
  flags: [
    {
      name: 'json',
      short: 'j',
      long: 'json',
      description: 'Output contract as JSON',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'human',
      long: 'human',
      description: 'Force human-readable output',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'for',
      long: 'for',
      description: 'Agent type filter: explore|plan|edit|worker|review|verify|default',
      type: 'string',
      defaultValue: undefined,
    },
    {
      name: 'category',
      long: 'category',
      description: 'Contract category filter: execution|commit|retrieval|validation|style',
      type: 'string',
      defaultValue: undefined,
    },
    {
      name: 'check',
      long: 'check',
      description: 'Check contract freshness and critical coverage',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'update',
      long: 'update',
      description: 'Regenerate .mycodemap/env-contract.json',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'asHookConfig',
      long: 'as-hook-config',
      description: 'Print Claude Code SubagentStart hook example',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'asCodexAgent',
      long: 'as-codex-agent',
      description: 'Print Codex agent developer_instructions example',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  outputShape: {
    description: 'Project Environment Contract query result',
    type: 'object',
    properties: [
      { name: 'schemaVersion', type: 'string', description: 'Contract schema version (env-contract.v1)' },
      { name: 'generatedAt', type: 'string', description: 'ISO timestamp of contract generation' },
      { name: 'agentType', type: 'string', description: 'Agent type used for filtering' },
      {
        name: 'items',
        type: 'array',
        description: 'Filtered contract items',
        items: {
          name: 'item',
          type: 'object',
          properties: [
            { name: 'id', type: 'string', description: 'Unique contract item identifier' },
            { name: 'category', type: 'string', description: 'Contract category: execution|commit|retrieval|validation|style' },
            { name: 'severity', type: 'string', description: 'Severity level: critical|high|medium|low' },
            { name: 'content', type: 'string', description: 'Human-readable contract rule' },
            {
              name: 'sources',
              type: 'array',
              description: 'Source file references',
              items: {
                name: 'source',
                type: 'object',
                properties: [
                  { name: 'file', type: 'string', description: 'Source file path' },
                  { name: 'line', type: 'number', description: 'Source line number', nullable: true },
                  { name: 'hash', type: 'string', description: 'Content hash' },
                  { name: 'authority', type: 'string', description: 'Source authority: executable|governance|generated|example' },
                ],
              },
            },
          ],
        },
      },
      {
        name: 'conflicts',
        type: 'array',
        description: 'Detected conflicts between sources',
        items: {
          name: 'conflict',
          type: 'object',
          properties: [
            { name: 'id', type: 'string' },
            { name: 'severity', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'recommendation', type: 'string' },
          ],
        },
      },
      {
        name: 'sourceSnapshots',
        type: 'array',
        description: 'Hash snapshots of source files',
        items: {
          name: 'snapshot',
          type: 'object',
          properties: [
            { name: 'file', type: 'string' },
            { name: 'hash', type: 'string' },
            { name: 'lastModified', type: 'string' },
          ],
        },
      },
      {
        name: 'diagnostics',
        type: 'array',
        description: 'Check diagnostics (only present with --check)',
        nullable: true,
        items: {
          name: 'diagnostic',
          type: 'object',
          properties: [
            { name: 'id', type: 'string' },
            { name: 'severity', type: 'string' },
            { name: 'message', type: 'string' },
            { name: 'remediation', type: 'string' },
          ],
        },
      },
    ],
  },
  errorCodes: [
    { code: 'ENV_CONTRACT_NOT_FOUND', description: 'No contract file and discovery failed' },
    { code: 'ENV_CONTRACT_SCHEMA_INVALID', description: 'Contract file fails schema validation' },
    { code: 'ENV_CONTRACT_CHECK_FAILED', description: 'Contract check detected errors (exit code 1)' },
    { code: 'ENV_CONTRACT_CHECK_WARN', description: 'Contract check detected warnings (exit code 2)' },
  ],
  examples: [
    'codemap env-contract',
    'codemap env-contract --for worker --json',
    'codemap env-contract --check',
    'codemap env-contract --update',
    'codemap env-contract --as-hook-config',
    'codemap env-contract --as-codex-agent',
    'codemap env-contract --category commit --json',
  ],
};
