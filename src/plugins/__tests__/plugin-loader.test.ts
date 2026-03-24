import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PluginLoader } from '../plugin-loader.js';
import type { CodemapConfig } from '../../interface/config/index.js';
import type { PluginLogger } from '../types.js';

const TEST_CONFIG: CodemapConfig = {
  mode: 'fast',
  include: ['src/**/*'],
  exclude: ['node_modules/**'],
  output: '.mycodemap',
  watch: false,
};

const QUIET_LOGGER: PluginLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

function writePluginVersion(pluginPath: string, version: string): void {
  writeFileSync(pluginPath, `
const version = '${version}';

export default {
  metadata: {
    name: 'test-plugin',
    version,
  },
  async initialize() {},
  async dispose() {},
};
`);
}

describe('PluginLoader', () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('reloads a directory plugin with a fresh module instance', async () => {
    const pluginRoot = mkdtempSync(path.join(tmpdir(), 'codemap-plugin-loader-'));
    tempRoots.push(pluginRoot);
    mkdirSync(pluginRoot, { recursive: true });

    const pluginPath = path.join(pluginRoot, 'test-plugin.js');
    writePluginVersion(pluginPath, '1.0.0');

    const loader = new PluginLoader(TEST_CONFIG, QUIET_LOGGER);
    await loader.load({ builtInPlugins: false, pluginDir: pluginRoot });
    expect(loader.getRegistry().get('test-plugin')?.plugin.metadata.version).toBe('1.0.0');

    writePluginVersion(pluginPath, '2.0.0');
    await loader.reload('test-plugin');

    expect(loader.getRegistry().get('test-plugin')?.plugin.metadata.version).toBe('2.0.0');
    await loader.dispose();
  });
});
