import { describe, expect, it } from 'vitest';
import {
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
      expect(contract.version).toBe('0.1.0');
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
              // missing description, args, flags, outputShape, errorCodes, examples
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
