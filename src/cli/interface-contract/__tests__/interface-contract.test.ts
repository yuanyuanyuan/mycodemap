import { describe, expect, it } from 'vitest';
import {
  agentMetricsContract,
  getFullContract,
  validateContract,
  validateCurrentContract,
  commandContracts,
  analyzeContract,
  queryContract,
  depsContract,
  interfaceContractSchema,
} from '../index.js';

describe('interface contract', () => {
  describe('types and exports', () => {
    it('exports all command contracts', () => {
      expect(analyzeContract).toBeDefined();
      expect(queryContract).toBeDefined();
      expect(depsContract).toBeDefined();
      expect(commandContracts.length).toBeGreaterThanOrEqual(3);
    });

    it('getFullContract returns a valid structure', () => {
      const contract = getFullContract();
      expect(contract.version).toBe('1.0.0');
      expect(contract.programName).toBe('mycodemap');
      expect(contract.aliases).toContain('codemap');
      expect(contract.commands.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('meta-schema validation', () => {
    it('validates a correct contract', () => {
      const contract = getFullContract();
      const validated = validateContract(contract);
      expect(validated.programName).toBe('mycodemap');
    });

    it('rejects an invalid contract', () => {
      expect(() => validateContract({ invalid: true })).toThrow();
    });

    it('rejects a contract with missing required fields', () => {
      expect(() =>
        validateContract({
          version: '1.0.0',
          programName: 'test',
          aliases: [],
          description: 'test',
          commands: [
            {
              name: 'bad',
              // missing description, stable, args, flags, outputShape, errorCodes, examples
            },
          ],
        }),
      ).toThrow();
    });

    it('validateCurrentContract passes for the built-in contract', () => {
      const result = validateCurrentContract();
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('validateCurrentContract returns errors for a broken contract', async () => {
      // Temporarily break getFullContract by mocking the commands module
      const mod = await import('../commands/index.js');
      const original = [...mod.commandContracts];
      mod.commandContracts.length = 0;
      mod.commandContracts.push({ name: '' } as never);

      const result = validateCurrentContract();
      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);

      // Restore
      mod.commandContracts.length = 0;
      original.forEach((c) => mod.commandContracts.push(c));
    });
  });

  describe('command contract shapes', () => {
    it('analyze contract has expected flags', () => {
      const flagNames = analyzeContract.flags.map((f) => f.name);
      expect(flagNames).toContain('intent');
      expect(flagNames).toContain('targets');
      expect(flagNames).toContain('json');
      expect(flagNames).toContain('structured');
    });

    it('query contract has expected flags', () => {
      const flagNames = queryContract.flags.map((f) => f.name);
      expect(flagNames).toContain('symbol');
      expect(flagNames).toContain('module');
      expect(flagNames).toContain('search');
      expect(flagNames).toContain('limit');
    });

    it('deps contract has expected flags', () => {
      const flagNames = depsContract.flags.map((f) => f.name);
      expect(flagNames).toContain('module');
      expect(flagNames).toContain('json');
    });

    it('agent-metrics contract exposes the additive intelligence fields and gate verdict block', () => {
      const flagNames = agentMetricsContract.flags.map((flag) => flag.name);
      expect(flagNames).toContain('max-tokens-per-query');

      const summaryShape = agentMetricsContract.outputShape.properties.find((property) => property.name === 'queryTypeSummaries');
      expect(summaryShape?.items?.properties).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'historicalSampleCount' }),
        expect.objectContaining({ name: 'p50EstimatedTotalTokens' }),
        expect.objectContaining({ name: 'p95EstimatedTotalTokens' }),
      ]));

      const trendShape = agentMetricsContract.outputShape.properties.find((property) => property.name === 'queryTypeTrends');
      expect(trendShape?.items?.properties).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'queryType' }),
        expect.objectContaining({ name: 'latestEstimatedTotalTokens' }),
        expect.objectContaining({ name: 'previousEstimatedTotalTokens' }),
        expect.objectContaining({ name: 'deltaEstimatedTotalTokens' }),
        expect.objectContaining({ name: 'deltaPercent' }),
        expect.objectContaining({ name: 'baselineAvailable' }),
      ]));

      const highestCostQueryTypesShape = agentMetricsContract.outputShape.properties.find((property) => property.name === 'highestCostQueryTypes');
      expect(highestCostQueryTypesShape?.items?.properties).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'queryType' }),
        expect.objectContaining({ name: 'estimatedTotalTokens' }),
        expect.objectContaining({ name: 'riskNote' }),
      ]));

      const highestCostRowsShape = agentMetricsContract.outputShape.properties.find((property) => property.name === 'highestCostRows');
      expect(highestCostRowsShape?.items?.properties).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'queryType' }),
        expect.objectContaining({ name: 'commandSlug' }),
        expect.objectContaining({ name: 'estimatedTotalTokens' }),
        expect.objectContaining({ name: 'riskNote' }),
      ]));

      const gateShape = agentMetricsContract.outputShape.properties.find((property) => property.name === 'gate');
      expect(gateShape).toBeDefined();
      expect(gateShape?.properties).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'verdict' }),
        expect.objectContaining({ name: 'warnOnly' }),
        expect.objectContaining({ name: 'threshold' }),
        expect.objectContaining({ name: 'violationCount' }),
        expect.objectContaining({ name: 'maxRow' }),
        expect.objectContaining({ name: 'violations' }),
      ]));
    });

    it('each command has at least one example', () => {
      for (const cmd of commandContracts) {
        expect(cmd.examples.length, `${cmd.name} has examples`).toBeGreaterThan(0);
      }
    });

    it('each command has output shape properties', () => {
      for (const cmd of commandContracts) {
        expect(cmd.outputShape.properties.length, `${cmd.name} has output properties`).toBeGreaterThan(0);
      }
    });

    it('each built-in command explicitly declares stable: true', () => {
      for (const cmd of commandContracts) {
        expect(cmd.stable, `${cmd.name} is marked stable`).toBe(true);
      }
    });
  });

  describe('JSON serializability', () => {
    it('full contract round-trips through JSON', () => {
      const contract = getFullContract();
      const json = JSON.stringify(contract);
      const parsed = JSON.parse(json);
      expect(parsed.programName).toBe(contract.programName);
      expect(parsed.commands.length).toBe(contract.commands.length);
      // Re-validate after round-trip
      const revalidated = validateContract(parsed);
      expect(revalidated.commands.length).toBe(contract.commands.length);
    });
  });

  describe('schema-driven commander config validation', () => {
    it('schema flags match existing commander query command flags', () => {
      // These are the flags defined in src/cli/index.ts for the query command
      const expectedFlags = [
        'symbol',
        'module',
        'deps',
        'search',
        'limit',
        'json',
        'structured',
        'verbose',
        'regex',
        'context',
        'case-sensitive',
        'include-references',
        'deps-format',
        'no-cache',
      ];
      const schemaFlagNames = queryContract.flags.map((f) => f.name);
      for (const flag of expectedFlags) {
        expect(schemaFlagNames).toContain(flag);
      }
    });

    it('schema flags match existing commander deps command flags', () => {
      const expectedFlags = ['module', 'json', 'structured'];
      const schemaFlagNames = depsContract.flags.map((f) => f.name);
      for (const flag of expectedFlags) {
        expect(schemaFlagNames).toContain(flag);
      }
    });

    it('schema flags match existing commander analyze command flags', () => {
      const expectedFlags = [
        'intent',
        'targets',
        'keywords',
        'scope',
        'topK',
        'include-tests',
        'include-git-history',
        'json',
        'structured',
        'output-mode',
      ];
      const schemaFlagNames = analyzeContract.flags.map((f) => f.name);
      for (const flag of expectedFlags) {
        expect(schemaFlagNames).toContain(flag);
      }
    });
  });

  describe('interfaceContractSchema direct usage', () => {
    it('can parse a minimal valid contract', () => {
      const minimal = {
        version: '1.0.0',
        programName: 'test',
        aliases: [],
        description: 'test cli',
        commands: [
          {
            name: 'cmd',
            description: 'a command',
            stable: true,
            args: [],
            flags: [],
            outputShape: { type: 'object', properties: [] },
            errorCodes: [],
            examples: [],
          },
        ],
      };
      const result = interfaceContractSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });
});
