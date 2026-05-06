import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadCodemapConfig } from '../config-loader.js';

function createTempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-config-loader-'));
}

function writeJson(rootDir: string, fileName: string, value: unknown): void {
  const fullPath = path.join(rootDir, fileName);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(value, null, 2));
}

describe('config-loader', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('returns normalized defaults when no config file exists', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    const result = await loadCodemapConfig(rootDir);

    expect(result.exists).toBe(false);
    expect(result.isLegacy).toBe(false);
    expect(result.hasExplicitPluginConfig).toBe(false);
    expect(result.config.mode).toBe('tree-sitter');
    expect(result.config.include).toEqual(['src/**/*.ts']);
    expect(result.config.storage).toEqual({
      type: 'sqlite',
      databasePath: '.mycodemap/governance.sqlite',
    });
    expect(result.config.plugins).toEqual({
      builtInPlugins: true,
      plugins: [],
      debug: false,
    });
  });

  it('prefers canonical .mycodemap/config.json over root config files', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, '.mycodemap/config.json', { mode: 'tree-sitter', output: '.mycodemap' });
    writeJson(rootDir, 'mycodemap.config.json', { mode: 'tree-sitter' });
    writeJson(rootDir, 'codemap.config.json', { mode: 'tree-sitter' });

    const result = await loadCodemapConfig(rootDir);

    expect(result.exists).toBe(true);
    expect(result.isLegacy).toBe(false);
    expect(result.hasExplicitPluginConfig).toBe(false);
    expect(result.config.mode).toBe('tree-sitter');
    expect(result.configPath).toBe(path.join(rootDir, '.mycodemap/config.json'));
  });

  it('loads root mycodemap.config.json when canonical config is absent', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      output: '.legacy-output',
      plugins: { builtInPlugins: false },
    });

    const result = await loadCodemapConfig(rootDir);

    expect(result.exists).toBe(true);
    expect(result.isLegacy).toBe(false);
    expect(result.hasExplicitPluginConfig).toBe(true);
    expect(result.config.output).toBe('.legacy-output');
    expect(result.config.plugins.builtInPlugins).toBe(false);
    expect(result.configPath).toBe(path.join(rootDir, 'mycodemap.config.json'));
  });

  it('loads legacy config when canonical and root modern config are absent', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'codemap.config.json', {
      output: '.legacy-output',
      plugins: { builtInPlugins: false },
    });

    const result = await loadCodemapConfig(rootDir);

    expect(result.exists).toBe(true);
    expect(result.isLegacy).toBe(true);
    expect(result.hasExplicitPluginConfig).toBe(true);
    expect(result.config.output).toBe('.legacy-output');
    expect(result.config.plugins.builtInPlugins).toBe(false);
    expect(result.configPath).toBe(path.join(rootDir, 'codemap.config.json'));
  });

  it('normalizes plugin config with focused defaults', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      plugins: {
        builtInPlugins: false,
        pluginDir: './plugins',
        plugins: ['call-graph'],
        debug: true,
      },
    });

    const result = await loadCodemapConfig(rootDir);

    expect(result.hasExplicitPluginConfig).toBe(true);
    expect(result.config.plugins).toEqual({
      builtInPlugins: false,
      pluginDir: path.join(rootDir, 'plugins'),
      plugins: ['call-graph'],
      debug: true,
    });
  });

  it('normalizes auto storage config as a SQLite-family alias', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      storage: {
        type: 'auto',
      },
    });

    const result = await loadCodemapConfig(rootDir);

    expect(result.config.storage).toEqual({
      type: 'auto',
      outputPath: undefined,
      databasePath: '.mycodemap/governance.sqlite',
      autoThresholds: undefined,
    });
  });

  it('accepts sqlite as an explicit storage backend', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      storage: {
        type: 'sqlite',
        databasePath: '.mycodemap/governance.sqlite',
      },
    });

    const result = await loadCodemapConfig(rootDir);

    expect(result.config.storage).toEqual({
      type: 'sqlite',
      outputPath: undefined,
      databasePath: '.mycodemap/governance.sqlite',
      autoThresholds: undefined,
    });
  });

  it('rejects deprecated filesystem storage with actionable unsupported-storage remediation', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      storage: {
        type: 'filesystem',
        outputPath: '.mycodemap/storage',
      },
    });

    await expect(loadCodemapConfig(rootDir)).rejects.toMatchObject({
      code: 'UNSUPPORTED_STORAGE_TYPE',
      nextCommand: 'mycodemap doctor',
    });
    await expect(loadCodemapConfig(rootDir)).rejects.toThrow('filesystem');
  });

  it('rejects deprecated kuzudb storage with actionable unsupported-storage remediation', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      storage: {
        type: 'kuzudb',
        databasePath: '.mycodemap/graph.kuzu',
      },
    });

    await expect(loadCodemapConfig(rootDir)).rejects.toMatchObject({
      code: 'UNSUPPORTED_STORAGE_TYPE',
      nextCommand: 'mycodemap doctor',
    });
    await expect(loadCodemapConfig(rootDir)).rejects.toThrow('kuzudb');
  });

  it('rejects invalid plugin config types', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      plugins: 'broken-plugin-config',
    });

    await expect(loadCodemapConfig(rootDir)).rejects.toThrow('"plugins" 必须是对象');
  });

  it('rejects unknown plugin fields instead of silently ignoring them', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      plugins: {
        enabled: true,
      },
    });

    await expect(loadCodemapConfig(rootDir)).rejects.toThrow('"plugins.enabled" 不是受支持的字段');
  });

  it('rejects unknown storage fields instead of silently ignoring them', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      storage: {
        type: 'sqlite',
        location: '.mycodemap/storage',
      },
    });

    await expect(loadCodemapConfig(rootDir)).rejects.toThrow('"storage.location" 不是受支持的字段');
  });

  it('rejects deprecated neo4j storage configs with a migration error', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      storage: {
        type: 'neo4j',
        uri: 'bolt://localhost:7687',
        username: 'neo4j',
        password: 'secret',
      },
    });

    await expect(loadCodemapConfig(rootDir)).rejects.toThrow('Neo4j storage 已不再受支持');
  });

  it('rejects deprecated autoThresholds storage routing config', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      storage: {
        type: 'auto',
        autoThresholds: {
          useGraphDBWhenFileCount: 200,
          useGraphDBWhenNodeCount: 5000,
        },
      },
    });

    await expect(loadCodemapConfig(rootDir)).rejects.toThrow('"storage.autoThresholds" 已废弃');
  });
});
