// [META] since:2026-04-30 | owner:server-team | stable:false
// [WHY] Adapt CLI interface contract schema to MCP tool definitions with zero handwritten maintenance

import { z } from 'zod';
import type {
  CommandContract,
  FlagDef,
  OutputProperty,
  OutputShape,
} from '../../cli/interface-contract/types.js';

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
export function convertContractToMcpTools(contract: CommandContract, programName = 'codemap'): McpToolDefinition[] {
  const definitions: McpToolDefinition[] = [];
  const inputSchema = convertFlagsToZodShape(contract.flags);

  definitions.push({
    name: `codemap_${contract.name}`,
    config: {
      title: `CodeMap ${contract.name}`,
      description: `${contract.description}\n\nExamples:\n${contract.examples.join('\n')}`,
      inputSchema,
      outputSchema: cliRedirectOutputSchema,
    },
    handler: createCliAvailabilityHandler(contract, programName),
  });

  for (const alias of contract.aliases ?? []) {
    definitions.push({
      name: `codemap_${alias}`,
      config: {
        title: `CodeMap ${alias}`,
        description: `${contract.description} (alias for ${contract.name})\n\nExamples:\n${contract.examples.join('\n')}`,
        inputSchema,
        outputSchema: cliRedirectOutputSchema,
      },
      handler: createCliAvailabilityHandler({ ...contract, name: alias }, programName),
    });
  }

  return definitions;
}
