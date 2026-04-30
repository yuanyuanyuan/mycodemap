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

function registerNativeTools(server: McpServer, service: CodeMapMcpService): void {
  server.registerTool('codemap_query', {
    title: 'CodeMap Query',
    description: 'Experimental: query a symbol definition plus callers and callees from the local CodeMap graph.',
    inputSchema: {
      symbol: z.string().min(1).describe('Exact symbol name to resolve'),
      filePath: z.string().min(1).optional().describe('Optional file path to disambiguate same-name symbols'),
    },
  }, async ({ symbol, filePath }) => {
    const structuredContent = await service.querySymbol({ symbol, filePath });

    return {
      content: [{
        type: 'text',
        text: renderStructuredContent(structuredContent),
      }],
      structuredContent,
      isError: structuredContent.status !== 'ok',
    };
  });

  server.registerTool('codemap_impact', {
    title: 'CodeMap Impact',
    description: 'Experimental: query symbol-level caller impact from the local CodeMap graph.',
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
}

function registerContractTools(server: McpServer, contract: InterfaceContract, reservedNames: Set<string>): void {
  const registeredNames = new Set<string>(reservedNames);

  for (const command of contract.commands) {
    const definitions = convertContractToMcpTools(command);

    for (const def of definitions) {
      let toolName = def.name;
      // If a native tool occupies this name, register under a stable alternative
      if (registeredNames.has(toolName)) {
        const altName = `${toolName}_contract`;
        if (registeredNames.has(altName)) {
          continue; // Both taken, silently skip
        }
        toolName = altName;
      }
      registeredNames.add(toolName);

      server.registerTool(toolName, {
        title: def.config.title,
        description: def.config.description,
        inputSchema: def.config.inputSchema,
      }, async (args) => def.handler(args as Record<string, unknown>));
    }
  }
}

export function createCodeMapMcpServer(storage: IStorage): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });
  const service = new CodeMapMcpService(storage);

  const reservedNames = new Set<string>(['codemap_query', 'codemap_impact']);

  registerNativeTools(server, service);
  registerContractTools(server, getFullContract(), reservedNames);

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
  const server = createCodeMapMcpServer(storage);
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
