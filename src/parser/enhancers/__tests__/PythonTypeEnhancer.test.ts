import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PythonTypeEnhancer } from '../PythonTypeEnhancer.js';
import { PythonTreeSitterParser } from '../../../infrastructure/parser/implementations/PythonTreeSitterParser.js';
import { createParser } from '../../index.js';
import type { ParseResult } from '../../../interface/types/parser.js';

const FIXTURE_DIR = path.resolve(import.meta.dirname, '../../../../tests/fixtures/python');

async function parseFixture(parser: PythonTreeSitterParser, fixtureName: string): Promise<ParseResult> {
  const fixturePath = path.join(FIXTURE_DIR, fixtureName);
  const content = await readFile(fixturePath, 'utf-8');
  return parser.parseFile(fixturePath, content, {
    includeTypeInfo: true,
    includeCallGraph: true,
    includeComplexity: true,
  });
}

describe('PythonTypeEnhancer', () => {
  let parser: PythonTreeSitterParser;
  let enhancer: PythonTypeEnhancer;

  beforeEach(async () => {
    parser = new PythonTreeSitterParser();
    await parser.initialize();
    enhancer = new PythonTypeEnhancer();
  });

  afterEach(async () => {
    enhancer.dispose();
    await parser.dispose();
  });

  it('enriches Google docstrings and preserves stronger annotations', async () => {
    const parsed = await parseFixture(parser, 'type-enhancer-google.py');
    const [enhanced] = await enhancer.enhance([parsed]);

    const buildClient = enhanced.symbols.find((symbol) => symbol.name === 'build_client');
    const clientClass = enhanced.symbols.find((symbol) => symbol.name === 'Client');
    const functionSummary = enhanced.typeInfo?.typeDefinitions.find((definition) => definition.name === 'build_client');
    const classSummary = enhanced.typeInfo?.typeDefinitions.find((definition) => definition.name === 'Client');

    expect(buildClient?.signature?.parameters.find((parameter) => parameter.name === 'name')?.type).toBe('str');
    expect(buildClient?.signature?.parameters.find((parameter) => parameter.name === 'alias')?.type).toBe('Optional[str]');
    expect(buildClient?.signature?.returnType).toBe('list[Client]');
    expect(clientClass?.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'timeout', type: 'int' }),
      ])
    );
    expect(functionSummary?.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'name', type: 'str' }),
        expect.objectContaining({ name: 'alias', type: 'Optional[str]' }),
        expect.objectContaining({ name: 'return', type: 'list[Client]' }),
      ])
    );
    expect(classSummary?.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'timeout', type: 'int' }),
      ])
    );
    expect(enhanced.typeInfo?.unionTypes).toContain('Optional[str]');
  });

  it('enriches NumPy docstrings', async () => {
    const parsed = await parseFixture(parser, 'type-enhancer-numpy.py');
    const [enhanced] = await enhancer.enhance([parsed]);

    const loadUsers = enhanced.symbols.find((symbol) => symbol.name === 'load_users');
    const directory = enhanced.symbols.find((symbol) => symbol.name === 'UserDirectory');

    expect(loadUsers?.signature?.parameters.find((parameter) => parameter.name === 'limit')?.type).toBe('int');
    expect(loadUsers?.signature?.returnType).toBe('list[UserDirectory]');
    expect(directory?.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'retries', type: 'int' }),
      ])
    );
  });

  it('enriches Sphinx docstrings', async () => {
    const parsed = await parseFixture(parser, 'type-enhancer-sphinx.py');
    const [enhanced] = await enhancer.enhance([parsed]);

    const createSession = enhanced.symbols.find((symbol) => symbol.name === 'create_session');

    expect(createSession?.signature?.parameters.find((parameter) => parameter.name === 'timeout')?.type).toBe('int');
    expect(createSession?.signature?.returnType).toBe('str');
  });

  it('fails soft on ambiguous prose-only docstrings', async () => {
    const parsed = await parseFixture(parser, 'type-enhancer-ambiguous.py');
    const [enhanced] = await enhancer.enhance([parsed]);

    const maybeRender = enhanced.symbols.find((symbol) => symbol.name === 'maybe_render');

    expect(maybeRender?.signature?.parameters.find((parameter) => parameter.name === 'value')?.type).toBe('');
    expect(maybeRender?.signature?.returnType).toBe('');
    expect(enhanced.typeInfo?.typeDefinitions).toEqual([]);
    expect(enhanced.typeInfo?.unionTypes).toEqual([]);
    expect(enhanced.typeInfo?.typeAliases).toEqual([]);
  });

  it('keeps parser compatibility output on the legacy parseFile path', async () => {
    const compatibilityParser = createParser({
      rootDir: process.cwd(),
      mode: 'tree-sitter',
      enhanceTypes: true,
    });

    const result = await compatibilityParser.parseFile(
      path.join(FIXTURE_DIR, 'type-enhancer-google.py')
    );

    expect(result.typeInfo).toBeDefined();
    expect(result.typeInfo).toEqual(
      expect.objectContaining({
        typeDefinitions: expect.any(Array),
        genericParams: expect.any(Array),
        crossFileRefs: expect.any(Array),
        unionTypes: expect.any(Array),
        intersectionTypes: expect.any(Array),
        typeAliases: expect.any(Array),
      })
    );
    expect(
      result.typeInfo?.typeDefinitions.find((definition) => definition.name === 'build_client')?.members
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'name', type: 'str' }),
      ])
    );

    compatibilityParser.dispose();
  });
});
