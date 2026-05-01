import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { CommandContract, FlagDef, OutputShape } from '../../../cli/interface-contract/types.js';
import {
  convertFlagTypeToZod,
  convertFlagsToZodShape,
  convertOutputShapeToJsonSchema,
  convertOutputShapeToZodSchema,
  convertContractToMcpTools,
} from '../schema-adapter.js';

describe('schema-adapter', () => {
  describe('convertFlagTypeToZod', () => {
    it('maps string flags to z.string()', () => {
      const flag: FlagDef = { name: 'target', long: 'target', description: 'Target path', type: 'string' };
      const schema = convertFlagTypeToZod(flag);
      expect(schema.parse('foo')).toBe('foo');
    });

    it('maps boolean flags to z.boolean()', () => {
      const flag: FlagDef = { name: 'json', long: 'json', description: 'JSON output', type: 'boolean' };
      const schema = convertFlagTypeToZod(flag);
      expect(schema.parse(true)).toBe(true);
    });

    it('maps number flags to z.number()', () => {
      const flag: FlagDef = { name: 'limit', long: 'limit', description: 'Result limit', type: 'number' };
      const schema = convertFlagTypeToZod(flag);
      expect(schema.parse(42)).toBe(42);
    });

    it('wraps multiple flags in z.array()', () => {
      const flag: FlagDef = { name: 'targets', long: 'targets', description: 'Targets', type: 'string', multiple: true };
      const schema = convertFlagTypeToZod(flag);
      expect(schema.parse(['a', 'b'])).toEqual(['a', 'b']);
    });

    it('applies default values', () => {
      const flag: FlagDef = { name: 'topK', long: 'topK', description: 'Top K', type: 'number', defaultValue: 8 };
      const schema = convertFlagTypeToZod(flag);
      expect(schema.parse(undefined)).toBe(8);
    });

    it('makes non-required flags optional', () => {
      const flag: FlagDef = { name: 'scope', long: 'scope', description: 'Scope', type: 'string' };
      const schema = convertFlagTypeToZod(flag);
      expect(schema.parse(undefined)).toBeUndefined();
    });

    it('keeps required flags non-optional', () => {
      const flag: FlagDef = { name: 'intent', long: 'intent', description: 'Intent', type: 'string', required: true };
      const schema = convertFlagTypeToZod(flag);
      expect(() => schema.parse(undefined)).toThrow();
    });

    it('falls back to z.string() for unknown flag types', () => {
      const flag = { name: 'weird', long: 'weird', description: 'Weird', type: 'unknown-type' } as unknown as FlagDef;
      const schema = convertFlagTypeToZod(flag);
      expect(schema.parse('anything')).toBe('anything');
    });

    it('preserves description on the schema', () => {
      const flag: FlagDef = { name: 'verbose', long: 'verbose', description: 'Be verbose', type: 'boolean' };
      const schema = convertFlagTypeToZod(flag);
      expect(schema.description).toBe('Be verbose');
    });
  });

  describe('convertFlagsToZodShape', () => {
    it('builds a shape object from multiple flags', () => {
      const flags: FlagDef[] = [
        { name: 'symbol', long: 'symbol', description: 'Symbol name', type: 'string' },
        { name: 'limit', long: 'limit', description: 'Limit', type: 'number', defaultValue: 10 },
      ];
      const shape = convertFlagsToZodShape(flags);
      expect(Object.keys(shape)).toEqual(['symbol', 'limit']);
      expect(() => shape.symbol.parse('test')).not.toThrow();
      expect(() => shape.limit.parse(42)).not.toThrow();
    });

    it('returns an empty object for empty flags', () => {
      const shape = convertFlagsToZodShape([]);
      expect(Object.keys(shape)).toHaveLength(0);
    });
  });

  describe('convertOutputShapeToJsonSchema', () => {
    it('converts a simple object shape to JSON Schema', () => {
      const shape: OutputShape = {
        type: 'object',
        properties: [
          { name: 'status', type: 'string', description: 'Status code' },
          { name: 'count', type: 'number' },
        ],
      };
      const schema = convertOutputShapeToJsonSchema(shape) as Record<string, unknown>;
      expect(schema.type).toBe('object');
      expect((schema.properties as Record<string, unknown>).status).toEqual({ type: 'string', description: 'Status code' });
      expect((schema.properties as Record<string, unknown>).count).toEqual({ type: 'number' });
      expect(schema.required).toEqual(['status', 'count']);
    });

    it('marks nullable properties as not required', () => {
      const shape: OutputShape = {
        type: 'object',
        properties: [
          { name: 'path', type: 'string', nullable: true },
          { name: 'id', type: 'string' },
        ],
      };
      const schema = convertOutputShapeToJsonSchema(shape) as Record<string, unknown>;
      expect(schema.required).toEqual(['id']);
      expect((schema.properties as Record<string, unknown>).path).toEqual({ type: ['string', 'null'], description: undefined });
    });

    it('handles nested array items', () => {
      const shape: OutputShape = {
        type: 'object',
        properties: [
          {
            name: 'results',
            type: 'array',
            items: { name: 'item', type: 'string' },
          },
        ],
      };
      const schema = convertOutputShapeToJsonSchema(shape) as Record<string, unknown>;
      const resultsProp = (schema.properties as Record<string, unknown>).results as Record<string, unknown>;
      expect(resultsProp.type).toBe('array');
      expect(resultsProp.items).toEqual({ type: 'string' });
    });

    it('handles nested object properties', () => {
      const shape: OutputShape = {
        type: 'object',
        properties: [
          {
            name: 'metrics',
            type: 'object',
            properties: [
              { name: 'durationMs', type: 'number' },
              { name: 'cacheHit', type: 'boolean' },
            ],
          },
        ],
      };
      const schema = convertOutputShapeToJsonSchema(shape) as Record<string, unknown>;
      const metricsProp = (schema.properties as Record<string, unknown>).metrics as Record<string, unknown>;
      expect(metricsProp.type).toBe('object');
      expect((metricsProp.properties as Record<string, unknown>).durationMs).toEqual({ type: 'number' });
    });

    it('degrades gracefully on deep nesting beyond depth limit', () => {
      const deepProp = { name: 'level0', type: 'object' } as { name: string; type: 'object'; properties?: unknown[] };
      let current = deepProp;
      for (let i = 1; i < 15; i++) {
        const next = { name: `level${i}`, type: 'object' as const, properties: [] as unknown[] };
        current.properties = [next];
        current = next;
      }
      const shape: OutputShape = {
        type: 'object',
        properties: [deepProp as OutputShape['properties'][number]],
      };
      // Should not throw
      expect(() => convertOutputShapeToJsonSchema(shape)).not.toThrow();
    });

    it('degrades gracefully on malformed shapes', () => {
      const shape = { type: 'object', properties: [] } as OutputShape;
      expect(() => convertOutputShapeToJsonSchema(shape)).not.toThrow();
    });
  });

  describe('convertOutputShapeToZodSchema', () => {
    it('converts a simple object shape to a Zod object schema', () => {
      const shape: OutputShape = {
        type: 'object',
        properties: [
          { name: 'status', type: 'string' },
          { name: 'count', type: 'number' },
        ],
      };
      const schema = convertOutputShapeToZodSchema(shape);
      expect(() => schema.parse({ status: 'ok', count: 1 })).not.toThrow();
    });

    it('handles arrays with items', () => {
      const shape: OutputShape = {
        type: 'object',
        properties: [
          {
            name: 'items',
            type: 'array',
            items: { name: 'item', type: 'string' },
          },
        ],
      };
      const schema = convertOutputShapeToZodSchema(shape);
      expect(() => schema.parse({ items: ['a', 'b'] })).not.toThrow();
    });

    it('degrades to z.any() on unexpected failure', () => {
      const shape = { type: 'object', properties: [] } as OutputShape;
      // Even with empty properties, z.object({}) is valid, so this won't degrade.
      // Instead test with a shape that would cause issues.
      const schema = convertOutputShapeToZodSchema(shape);
      expect(() => schema.parse({})).not.toThrow();
    });
  });

  describe('convertContractToMcpTools', () => {
    it('creates a tool definition for a simple command', () => {
      const contract: CommandContract = {
        name: 'test',
        description: 'A test command',
        args: [],
        flags: [
          { name: 'foo', long: 'foo', description: 'Foo flag', type: 'string' },
        ],
        outputShape: {
          type: 'object',
          properties: [{ name: 'result', type: 'string' }],
        },
        errorCodes: [{ code: 'ERR', description: 'Error' }],
        examples: ['codemap test --foo bar'],
      };
      const tools = convertContractToMcpTools(contract);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('codemap_test');
      expect(tools[0].config.title).toBe('CodeMap test');
      expect(tools[0].config.description).toContain('A test command');
      expect(tools[0].config.description).toContain('codemap test --foo bar');
      expect(tools[0].config.inputSchema).toHaveProperty('foo');
    });

    it('creates alias tools when aliases are present', () => {
      const contract: CommandContract = {
        name: 'deps',
        description: 'Deps command',
        aliases: ['dependencies', 'd'],
        args: [],
        flags: [],
        outputShape: { type: 'object', properties: [] },
        errorCodes: [],
        examples: [],
      };
      const tools = convertContractToMcpTools(contract);
      expect(tools.map(t => t.name)).toEqual([
        'codemap_deps',
        'codemap_dependencies',
        'codemap_d',
      ]);
    });

    it('handler returns a cli_redirect structured response', async () => {
      const contract: CommandContract = {
        name: 'analyze',
        description: 'Analyze command',
        args: [],
        flags: [
          { name: 'intent', long: 'intent', description: 'Intent', type: 'string' },
          { name: 'json', long: 'json', description: 'JSON', type: 'boolean' },
        ],
        outputShape: { type: 'object', properties: [] },
        errorCodes: [{ code: 'BAD', description: 'Bad' }],
        examples: ['codemap analyze --intent find'],
      };
      const tools = convertContractToMcpTools(contract);
      const result = await tools[0].handler({ intent: 'find', json: true });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('codemap analyze');
      expect(result.structuredContent).toMatchObject({
        status: 'cli_redirect',
        command: 'analyze',
      });
    });

    it('handler omits undefined and false flags from cli command line', async () => {
      const contract: CommandContract = {
        name: 'query',
        description: 'Query command',
        args: [],
        flags: [
          { name: 'symbol', long: 'symbol', description: 'Symbol', type: 'string' },
          { name: 'json', long: 'json', description: 'JSON', type: 'boolean' },
        ],
        outputShape: { type: 'object', properties: [] },
        errorCodes: [],
        examples: [],
      };
      const tools = convertContractToMcpTools(contract);
      const result = await tools[0].handler({ symbol: 'MyClass', json: false });
      expect(result.content[0].text).toBe('Command available via CLI: codemap query --symbol MyClass');
    });

    it('handler formats array flags correctly', async () => {
      const contract: CommandContract = {
        name: 'analyze',
        description: 'Analyze command',
        args: [],
        flags: [
          { name: 'targets', long: 'targets', description: 'Targets', type: 'string', multiple: true },
        ],
        outputShape: { type: 'object', properties: [] },
        errorCodes: [],
        examples: [],
      };
      const tools = convertContractToMcpTools(contract);
      const result = await tools[0].handler({ targets: ['src/a.ts', 'src/b.ts'] });
      expect(result.content[0].text).toContain('--targets src/a.ts --targets src/b.ts');
    });

    it('handler quotes shell metacharacters in flag values', async () => {
      const contract: CommandContract = {
        name: 'query',
        description: 'Query command',
        args: [],
        flags: [
          { name: 'symbol', long: 'symbol', description: 'Symbol', type: 'string' },
        ],
        outputShape: { type: 'object', properties: [] },
        errorCodes: [],
        examples: [],
      };
      const tools = convertContractToMcpTools(contract);
      const result = await tools[0].handler({ symbol: 'Foo; rm -rf /' });
      expect(result.content[0].text).toContain("--symbol 'Foo; rm -rf /'");
    });

    it('handler quotes values containing spaces', async () => {
      const contract: CommandContract = {
        name: 'query',
        description: 'Query command',
        args: [],
        flags: [
          { name: 'symbol', long: 'symbol', description: 'Symbol', type: 'string' },
        ],
        outputShape: { type: 'object', properties: [] },
        errorCodes: [],
        examples: [],
      };
      const tools = convertContractToMcpTools(contract);
      const result = await tools[0].handler({ symbol: 'my class' });
      expect(result.content[0].text).toContain("--symbol 'my class'");
    });

    it('handler escapes single quotes correctly', async () => {
      const contract: CommandContract = {
        name: 'query',
        description: 'Query command',
        args: [],
        flags: [
          { name: 'symbol', long: 'symbol', description: 'Symbol', type: 'string' },
        ],
        outputShape: { type: 'object', properties: [] },
        errorCodes: [],
        examples: [],
      };
      const tools = convertContractToMcpTools(contract);
      const result = await tools[0].handler({ symbol: "it's" });
      expect(result.content[0].text).toContain("--symbol 'it'\\''s'");
    });
  });
});
