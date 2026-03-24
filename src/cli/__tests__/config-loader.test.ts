import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadCodemapConfig } from '../config-loader.js';

function createTempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-config-loader-'));
}

function writeJson(rootDir: string, fileName: string, value: unknown): void {
  writeFileSync(path.join(rootDir, fileName), JSON.stringify(value, null, 2));
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
    expect(result.config.mode).toBe('hybrid');
    expect(result.config.include).toEqual(['src/**/*.ts']);
    expect(result.config.storage).toEqual({
      type: 'filesystem',
      outputPath: '.codemap/storage',
    });
    expect(result.config.plugins).toEqual({
      builtInPlugins: true,
      plugins: [],
      debug: false,
    });
  });

  it('prefers mycodemap.config.json over legacy config', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', { mode: 'smart' });
    writeJson(rootDir, 'codemap.config.json', { mode: 'fast' });

    const result = await loadCodemapConfig(rootDir);

    expect(result.exists).toBe(true);
    expect(result.isLegacy).toBe(false);
    expect(result.hasExplicitPluginConfig).toBe(false);
    expect(result.config.mode).toBe('smart');
  });

  it('loads legacy config when the new filename is absent', async () => {
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

  it('normalizes storage config with explicit backend fields', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    writeJson(rootDir, 'mycodemap.config.json', {
      storage: {
        type: 'neo4j',
        uri: 'bolt://localhost:7687',
        username: 'neo4j',
        password: 'secret',
        autoThresholds: {
          useGraphDBWhenFileCount: 200,
          useGraphDBWhenNodeCount: 5000,
        },
      },
    });

    const result = await loadCodemapConfig(rootDir);

    expect(result.config.storage).toEqual({
      type: 'neo4j',
      outputPath: '.codemap/storage',
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'secret',
      autoThresholds: {
        useGraphDBWhenFileCount: 200,
        useGraphDBWhenNodeCount: 5000,
      },
    });
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
        type: 'filesystem',
        location: '.codemap/storage',
      },
    });

    await expect(loadCodemapConfig(rootDir)).rejects.toThrow('"storage.location" 不是受支持的字段');
  });
});
