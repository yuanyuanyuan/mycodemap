// [META] since:2026-04-30 | owner:server-team | stable:false
// [WHY] Adapt CLI interface contract schema to MCP tool definitions with zero handwritten maintenance

import { z } from 'zod';
import type {
  CommandContract,
  FlagDef,
  OutputProperty,
  OutputShape,
} from '../../cli/interface-contract/types.js';
import {
  executeAnalyzeTool,
  executeDepsTool,
  executeQueryTool,
} from '../../execution/contract-tools/index.js';

export interface McpToolDefinition {
  name: string;
  config: {
    title: string;
    description: string;
    inputSchema: Record<string, z.ZodTypeAny>;
    outputSchema?: z.ZodTypeAny;
  };
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    structuredContent: Record<string, unknown>;
    isError: boolean;
  }>;
}

interface McpExecutionContext {
  rootDir?: string;
}

/**
 * Convert a single contract flag definition into a Zod schema.
 * Handles type mapping, arrays, defaults, optionality, and descriptions.
 */
export function convertFlagTypeToZod(flag: FlagDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (flag.type) {
    case 'string': {
      schema = z.string();
      break;
    }
    case 'boolean': {
      schema = z.boolean();
      break;
    }
    case 'number': {
      schema = z.number();
      break;
    }
    default: {
      // Graceful degradation for unknown flag types
      schema = z.string();
    }
  }

  if (flag.multiple) {
    schema = z.array(schema);
  }

  if (flag.defaultValue !== undefined) {
    schema = schema.default(flag.defaultValue);
  } else if (!flag.required) {
    schema = schema.optional();
  }

  if (flag.description) {
    schema = schema.describe(flag.description);
  }

  return schema;
}

/**
 * Convert an array of flag definitions into a Zod raw shape object
 * suitable for the MCP SDK's `inputSchema` field.
 */
export function convertFlagsToZodShape(flags: FlagDef[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const flag of flags) {
    shape[flag.name] = convertFlagTypeToZod(flag);
  }

  return shape;
}

/**
 * Recursively convert an OutputProperty into a JSON Schema fragment.
 * Falls back to permissive schemas on unexpected depth or complexity.
 */
function convertOutputPropertyToJsonSchema(prop: OutputProperty, depth = 0): unknown {
  // Prevent runaway recursion on deeply nested or circular schemas
  if (depth > 10) {
    return { type: 'object', description: 'Nested structure (depth limit reached)' };
  }

  const schema: Record<string, unknown> = {};

  if (prop.description) {
    schema.description = prop.description;
  }

  if (prop.nullable) {
    schema.type = [prop.type, 'null'];
  } else {
    schema.type = prop.type;
  }

  if (prop.items) {
    schema.items = convertOutputPropertyToJsonSchema(prop.items, depth + 1);
  }

  if (prop.properties && prop.properties.length > 0) {
    schema.properties = Object.fromEntries(
      prop.properties.map(p => [p.name, convertOutputPropertyToJsonSchema(p, depth + 1)]),
    );
  }

  return schema;
}

/**
 * Convert an OutputShape into a JSON Schema object.
 * Degrades gracefully to a permissive object schema on failure.
 */
export function convertOutputShapeToJsonSchema(outputShape: OutputShape): unknown {
  try {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const prop of outputShape.properties) {
      properties[prop.name] = convertOutputPropertyToJsonSchema(prop);
      if (!prop.nullable) {
        required.push(prop.name);
      }
    }

    const schema: Record<string, unknown> = {
      type: outputShape.type,
      properties,
    };

    if (required.length > 0) {
      schema.required = required;
    }

    if (outputShape.description) {
      schema.description = outputShape.description;
    }

    return schema;
  } catch {
    return {
      type: 'object',
      description: outputShape.description ?? 'Command output',
    };
  }
}

/**
 * Convert an OutputProperty into a Zod schema.
 * Degrades to z.any() for complex or unsupported structures.
 */
function outputPropertyToZodSchema(prop: OutputProperty, depth = 0): z.ZodTypeAny {
  if (depth > 10) {
    return z.any().describe(prop.description ?? 'Nested structure');
  }

  let schema: z.ZodTypeAny;

  switch (prop.type) {
    case 'string': {
      schema = z.string();
      break;
    }
    case 'number': {
      schema = z.number();
      break;
    }
    case 'boolean': {
      schema = z.boolean();
      break;
    }
    case 'null': {
      schema = z.null();
      break;
    }
    case 'array': {
      schema = prop.items
        ? z.array(outputPropertyToZodSchema(prop.items, depth + 1))
        : z.array(z.any());
      break;
    }
    case 'object': {
      if (prop.properties && prop.properties.length > 0) {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const p of prop.properties) {
          shape[p.name] = outputPropertyToZodSchema(p, depth + 1);
        }
        schema = z.object(shape);
      } else {
        schema = z.record(z.string(), z.any());
      }
      break;
    }
    default: {
      schema = z.any();
    }
  }

  if (prop.nullable) {
    schema = schema.nullable();
  }

  if (prop.description) {
    schema = schema.describe(prop.description);
  }

  return schema;
}

/**
 * Convert an OutputShape into a Zod schema suitable for the MCP SDK's `outputSchema` field.
 * Degrades gracefully to z.any() on failure.
 */
export function convertOutputShapeToZodSchema(outputShape: OutputShape): z.ZodTypeAny {
  try {
    if (outputShape.type === 'array') {
      const itemSchema = outputShape.properties.length === 1
        ? outputPropertyToZodSchema(outputShape.properties[0])
        : z.any();
      let schema: z.ZodTypeAny = z.array(itemSchema);
      if (outputShape.description) {
        schema = schema.describe(outputShape.description);
      }
      return schema;
    }

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const prop of outputShape.properties) {
      shape[prop.name] = outputPropertyToZodSchema(prop);
    }

    let schema: z.ZodTypeAny = z.object(shape);

    if (outputShape.description) {
      schema = schema.describe(outputShape.description);
    }

    return schema;
  } catch {
    return z.any().describe(outputShape.description ?? 'Command output');
  }
}

const directExecutionCommands = new Set(['query', 'deps', 'analyze']);

const directExecutionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  remediation: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

const directExecutionDiagnosticsSchema = z.object({
  tool: z.enum(['query', 'deps', 'analyze']),
  rootDir: z.string(),
  dataPath: z.string().optional(),
  durationMs: z.number().optional(),
  cacheHit: z.boolean().optional(),
  notes: z.array(z.string()).optional(),
});

function createDirectExecutionOutputSchema(outputShape: OutputShape): z.ZodTypeAny {
  return z.object({
    status: z.enum(['ok', 'error']),
    result: z.unknown().optional().describe(outputShape.description ?? 'Command result payload'),
    error: directExecutionErrorSchema.optional(),
    diagnostics: directExecutionDiagnosticsSchema,
  });
}

function toStringArray(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === 'string');
    return items.length > 0 ? items : undefined;
  }

  return undefined;
}

function normalizeDirectExecutionArgs(commandName: string, args: Record<string, unknown>): Record<string, unknown> {
  switch (commandName) {
    case 'query':
      return {
        symbol: typeof args.symbol === 'string' ? args.symbol : undefined,
        module: typeof args.module === 'string' ? args.module : undefined,
        deps: typeof args.deps === 'string' ? args.deps : undefined,
        search: typeof args.search === 'string' ? args.search : undefined,
        limit: typeof args.limit === 'number' ? args.limit : undefined,
        json: args.json === true,
        human: args.human === true,
        verbose: args.verbose === true,
        cache: args['no-cache'] === true ? false : true,
        regex: args.regex === true,
        depsFormat: args['deps-format'] === 'detailed' ? 'detailed' : 'default',
        caseSensitive: args['case-sensitive'] === true,
        context: typeof args.context === 'number' || typeof args.context === 'string' ? args.context : undefined,
        includeReferences: args['include-references'] === true,
        structured: args.structured === true,
      };
    case 'deps':
      return {
        module: typeof args.module === 'string' ? args.module : undefined,
        json: args.json === true,
        human: args.human === true,
        structured: args.structured === true,
      };
    case 'analyze':
      return {
        intent: typeof args.intent === 'string' ? args.intent : undefined,
        targets: toStringArray(args.targets),
        keywords: toStringArray(args.keywords),
        scope: typeof args.scope === 'string' ? args.scope : undefined,
        topK: typeof args.topK === 'number' ? args.topK : undefined,
        includeTests: args['include-tests'] === true,
        includeGitHistory: args['include-git-history'] === true,
        json: args.json === true,
        human: args.human === true,
        structured: args.structured === true,
        outputMode: typeof args['output-mode'] === 'string' ? args['output-mode'] : undefined,
      };
    default:
      return args;
  }
}

function renderDirectExecutionText(result: Record<string, unknown>): string {
  return JSON.stringify(result, null, 2);
}

function createDirectExecutionHandler(
  contract: CommandContract,
  context: McpExecutionContext = {},
) {
  const rootDir = context.rootDir;

  return async (args: Record<string, unknown>) => {
    const normalizedArgs = normalizeDirectExecutionArgs(contract.name, args);

    const execution = contract.name === 'query'
      ? await executeQueryTool(normalizedArgs, rootDir)
      : contract.name === 'deps'
        ? await executeDepsTool(normalizedArgs, rootDir)
        : await executeAnalyzeTool(normalizedArgs as Parameters<typeof executeAnalyzeTool>[0]);

    const structuredContent = execution as unknown as Record<string, unknown>;

    return {
      content: [{
        type: 'text' as const,
        text: renderDirectExecutionText(structuredContent),
      }],
      structuredContent,
      isError: execution.status !== 'ok',
    };
  };
}

/**
 * Normalize a command name segment for use in MCP tool names.
 * Replaces any character that is not alphanumeric or underscore with underscore.
 * This ensures hyphenated command names like 'env-contract' become 'env_contract'.
 */
export function normalizeToolNameSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, '_');
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9@+_./:-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildCliCommandLine(contract: CommandContract, args: Record<string, unknown>, programName = 'codemap'): string {
  const flagArgs = Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        return v.map(item => `--${k} ${shellQuote(String(item))}`).join(' ');
      }
      if (typeof v === 'boolean') {
        return `--${k}`;
      }
      return `--${k} ${shellQuote(String(v))}`;
    })
    .join(' ');

  return `${programName} ${contract.name}${flagArgs ? ` ${flagArgs}` : ''}`;
}

function createCliAvailabilityHandler(contract: CommandContract, programName: string) {
  return async (args: Record<string, unknown>) => {
    const commandLine = buildCliCommandLine(contract, args, programName);

    return {
      content: [{
        type: 'text' as const,
        text: `Command available via CLI: ${commandLine}`,
      }],
      structuredContent: {
        status: 'cli_redirect',
        command: contract.name,
        args,
        cliCommand: commandLine,
        description: contract.description,
        examples: contract.examples,
        errorCodes: contract.errorCodes.map(e => e.code),
      } as Record<string, unknown>,
      isError: false,
    };
  };
}

/**
 * Zod schema matching the structured content returned by cli_redirect handlers.
 * Used as the output schema for contract tools until handlers return real command output.
 *
 * NOTE: `z.unknown()` is used for `args` instead of `z.record(z.unknown())` because
 * Zod v4's `z.record()` triggers a crash in `z4mini.toJSONSchema` when the SDK
 * serializes the schema for `listTools()` discovery.
 */
const cliRedirectOutputSchema = z.object({
  status: z.literal('cli_redirect'),
  command: z.string(),
  args: z.unknown(),
  cliCommand: z.string(),
  description: z.string(),
  examples: z.array(z.string()),
  errorCodes: z.array(z.string()),
});

/**
 * Convert a CommandContract into one or more MCP tool definitions.
 * The primary command and any aliases each get their own tool name.
 */
export function convertContractToMcpTools(
  contract: CommandContract,
  programName = 'codemap',
  context: McpExecutionContext = {},
): McpToolDefinition[] {
  const definitions: McpToolDefinition[] = [];
  const inputSchema = convertFlagsToZodShape(contract.flags);
  const isDirectExecution = directExecutionCommands.has(contract.name);
  const outputSchema = isDirectExecution
    ? createDirectExecutionOutputSchema(contract.outputShape)
    : cliRedirectOutputSchema;
  const handler = isDirectExecution
    ? createDirectExecutionHandler(contract, context)
    : createCliAvailabilityHandler(contract, programName);

  definitions.push({
    name: `codemap_${normalizeToolNameSegment(contract.name)}`,
    config: {
      title: `CodeMap ${contract.name}`,
      description: `${contract.description}\n\nExamples:\n${contract.examples.join('\n')}`,
      inputSchema,
      outputSchema,
    },
    handler,
  });

  for (const alias of contract.aliases ?? []) {
    definitions.push({
      name: `codemap_${normalizeToolNameSegment(alias)}`,
      config: {
        title: `CodeMap ${alias}`,
        description: `${contract.description} (alias for ${contract.name})\n\nExamples:\n${contract.examples.join('\n')}`,
        inputSchema,
        outputSchema,
      },
      handler: isDirectExecution
        ? createDirectExecutionHandler(contract, context)
        : createCliAvailabilityHandler({ ...contract, name: alias }, programName),
    });
  }

  return definitions;
}
