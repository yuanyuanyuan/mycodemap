// [META] since:2026-04-19 | owner:server-team | stable:false
// [WHY] Provide the experimental local-only MCP stdio server for symbol query and impact thin slice

import { cwd } from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { Readable, Writable } from 'node:stream';
import type { IStorage } from '../../interface/types/storage.js';
import { createConfiguredStorage } from '../../cli/storage-runtime.js';
import { getFullContract } from '../../cli/interface-contract/index.js';
import type { InterfaceContract } from '../../cli/interface-contract/types.js';
import {
  discoverProjectEnvironmentContract,
  filterContractForAgent,
  checkProjectEnvironmentContract,
  type ProjectEnvironmentContract,
  type ContractCategory,
} from '../../cli/env-contract/index.js';
import { buildContextRoutingPayload } from './context-tool.js';
import { CodeMapMcpService } from './service.js';
import { convertContractToMcpTools } from './schema-adapter.js';

const MCP_SERVER_NAME = 'mycodemap-experimental';
const MCP_SERVER_VERSION = process.env.npm_package_version ?? '0.5.0';

export interface StartCodeMapMcpServerOptions {
  rootDir?: string;
  stdin?: Readable;
  stdout?: Writable;
}

function renderStructuredContent(result: unknown): string {
  return JSON.stringify(result, null, 2);
}

function registerNativeTools(server: McpServer, service: CodeMapMcpService, storage: IStorage): void {
  server.registerTool('codemap_env_contract', {
    title: 'CodeMap Environment Contract',
    description: 'Query the Project Environment Contract for subagent rule retrieval. Returns filtered contract items by agent type.',
    inputSchema: {
      agentType: z.enum(['explore', 'plan', 'edit', 'worker', 'review', 'verify', 'default']).optional().describe('Agent type to filter contract items'),
      category: z.enum(['execution', 'commit', 'retrieval', 'validation', 'style']).optional().describe('Contract category filter'),
      check: z.boolean().optional().describe('Run contract freshness and critical coverage check'),
    },
  }, async ({ agentType, category, check }) => {
    const rootDir = cwd();
    let contract: ProjectEnvironmentContract;
    try {
      contract = discoverProjectEnvironmentContract(rootDir);
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to discover contract: ${error instanceof Error ? error.message : String(error)}` }],
        structuredContent: { status: 'error', message: 'Contract discovery failed' },
        isError: true,
      };
    }

    if (check) {
      const checkResult = checkProjectEnvironmentContract(contract, rootDir);
      return {
        content: [{ type: 'text', text: renderStructuredContent(checkResult) }],
        structuredContent: {
          schemaVersion: contract.schemaVersion,
          generatedAt: contract.generatedAt,
          ...checkResult,
        },
        isError: checkResult.status === 'error',
      };
    }

    let items = filterContractForAgent(contract, agentType ?? 'default');
    if (category) {
      items = items.filter((item) => item.category === category);
    }

    const result = {
      schemaVersion: contract.schemaVersion,
      generatedAt: contract.generatedAt,
      agentType: agentType ?? 'default',
      items,
      conflicts: contract.conflicts,
      sourceSnapshots: contract.sourceSnapshots,
    };

    return {
      content: [{ type: 'text', text: renderStructuredContent(result) }],
      structuredContent: result,
      isError: false,
    };
  });

  server.registerTool('codemap_impact', {
    title: 'CodeMap Impact',
    description: 'Experimental: query layered graph-native impact from a symbol entrypoint using the shared persisted graph truth.',
    inputSchema: {
      symbol: z.string().min(1).describe('Exact symbol name to resolve'),
      filePath: z.string().min(1).optional().describe('Optional file path to disambiguate same-name symbols'),
      depth: z.number().int().min(1).max(20).optional().describe('Requested caller traversal depth'),
      limit: z.number().int().min(1).max(200).optional().describe('Requested maximum affected symbols'),
    },
  }, async ({ symbol, filePath, depth, limit }) => {
    const structuredContent = await service.impactSymbol({
      symbol,
      filePath,
      depth,
      limit,
    });

    return {
      content: [{
        type: 'text',
        text: renderStructuredContent(structuredContent),
      }],
      structuredContent,
      isError: structuredContent.status !== 'ok',
    };
  });

  server.registerTool('codemap_communities', {
    title: 'CodeMap Communities',
    description: 'Experimental: query module-level community structure from the shared persisted graph truth.',
    inputSchema: {},
  }, async () => {
    const structuredContent = await service.communities();

    return {
      content: [{
        type: 'text',
        text: renderStructuredContent(structuredContent),
      }],
      structuredContent,
      isError: structuredContent.status !== 'ok',
    };
  });

  server.registerTool('codemap_context', {
    title: 'CodeMap Context Router',
    description: 'Return lightweight review/debug/default routing context with graph stats, risk summary, and real next-step tool suggestions.',
    inputSchema: {
      task: z.string().min(1).optional().describe('Requested routing context task family'),
      detailLevel: z.enum(['minimal', 'standard']).optional().describe('Controls whether the response stays aggressively thin or includes warnings/rationale.'),
      allowedTools: z.array(z.string().min(1)).optional().describe('Strict allow-list for suggested tools. The request fails if the filter would hide a required suggestion.'),
    },
  }, async ({ task, detailLevel, allowedTools }) => {
    const structuredContent = await buildContextRoutingPayload(storage, {
      task,
      detailLevel,
      allowedTools,
    });

    return {
      content: [{
        type: 'text',
        text: renderStructuredContent(structuredContent),
      }],
      structuredContent,
      isError: structuredContent.status !== 'ok',
    };
  });
}

function registerContractTools(
  server: McpServer,
  contract: InterfaceContract,
  reservedNames: Set<string>,
  rootDir: string,
): void {
  const registeredNames = new Set<string>(reservedNames);

  for (const command of contract.commands) {
    const definitions = convertContractToMcpTools(command, contract.programName, { rootDir });

    for (const def of definitions) {
      let toolName = def.name;
      if (registeredNames.has(toolName)) {
        if (reservedNames.has(toolName)) {
          // Native tool conflict — rename to stable alternative
          const altName = `${toolName}_contract`;
          if (registeredNames.has(altName)) {
            console.warn(`Contract tool "${def.name}" skipped — name reserved by native tool and alternative "${altName}" also taken`);
            continue;
          }
          console.warn(`Contract tool "${def.name}" renamed to "${altName}" — name reserved by native tool`);
          toolName = altName;
        } else {
          // Normalized alias collision with prior contract tool — skip
          continue;
        }
      }
      registeredNames.add(toolName);

      server.registerTool(toolName, {
        title: def.config.title,
        description: def.config.description,
        inputSchema: def.config.inputSchema,
        outputSchema: def.config.outputSchema,
      }, async (args) => def.handler(args as Record<string, unknown>));
    }
  }
}

export function createCodeMapMcpServer(storage: IStorage, rootDir: string = cwd()): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });
  const service = new CodeMapMcpService(storage);

  const reservedNames = new Set<string>([
    'codemap_impact',
    'codemap_communities',
    'codemap_env_contract',
    'codemap_context',
  ]);

  registerNativeTools(server, service, storage);
  registerContractTools(server, getFullContract(), reservedNames, rootDir);

  return server;
}

export async function startCodeMapMcpServer(
  options: StartCodeMapMcpServerOptions = {}
): Promise<{
  server: McpServer;
  storage: IStorage;
  transport: StdioServerTransport;
  close: () => Promise<void>;
}> {
  const rootDir = options.rootDir ?? cwd();
  const { storage } = await createConfiguredStorage(rootDir);
  const server = createCodeMapMcpServer(storage, rootDir);
  const transport = new StdioServerTransport(options.stdin, options.stdout);

  await server.connect(transport);

  return {
    server,
    storage,
    transport,
    close: async () => {
      await server.close();
      await storage.close();
    },
  };
}
