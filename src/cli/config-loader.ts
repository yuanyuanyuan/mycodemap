// [META] since:2026-03-24 | owner:cli-team | stable:false
// [WHY] Provide a single CLI-owned config loading and normalization seam for generate/plugin integration

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import { DEFAULT_DISCOVERY_EXCLUDES } from '../core/file-discovery.js';
import type { CodemapConfig, CodemapPluginConfig } from '../interface/config/index.js';
import type { StorageConfig } from '../interface/types/storage.js';
import { resolveConfigPath } from './paths.js';

export interface NormalizedPluginConfig {
  builtInPlugins: boolean;
  pluginDir?: string;
  plugins: string[];
  debug: boolean;
}

export interface NormalizedStorageConfig extends StorageConfig {}

export interface NormalizedCodemapConfig extends Omit<CodemapConfig, 'plugins' | 'storage'> {
  storage: NormalizedStorageConfig;
  plugins: NormalizedPluginConfig;
}

export interface CodemapConfigFile extends Omit<CodemapConfig, 'plugins' | 'storage'> {
  $schema: string;
  storage: StorageConfig;
  plugins: CodemapPluginConfig;
}

export interface LoadedCodemapConfig {
  config: NormalizedCodemapConfig;
  configPath: string;
  exists: boolean;
  isLegacy: boolean;
  hasExplicitPluginConfig: boolean;
}

const DEFAULT_CONFIG_MODE: NormalizedCodemapConfig['mode'] = 'hybrid';
const DEFAULT_CONFIG_INCLUDE = ['src/**/*.ts'] as const;
const DEFAULT_CONFIG_OUTPUT = '.mycodemap';
const DEFAULT_CONFIG_SCHEMA_URL = 'https://mycodemap.dev/schema/config.json';
const VALID_MODES = new Set<NormalizedCodemapConfig['mode']>(['fast', 'smart', 'hybrid']);
const VALID_STORAGE_TYPES = new Set<NormalizedStorageConfig['type']>([
  'filesystem',
  'sqlite',
  'kuzudb',
  'memory',
  'auto',
]);
const ALLOWED_CONFIG_KEYS = new Set(['$schema', 'mode', 'include', 'exclude', 'output', 'watch', 'storage', 'plugins']);
const ALLOWED_PLUGIN_KEYS = new Set(['builtInPlugins', 'pluginDir', 'plugins', 'debug']);
const ALLOWED_STORAGE_KEYS = new Set([
  'type',
  'outputPath',
  'databasePath',
  'autoThresholds',
]);
const ALLOWED_AUTO_THRESHOLD_KEYS = new Set([
  'useGraphDBWhenFileCount',
  'useGraphDBWhenNodeCount',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertConfigObject(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`配置文件中的 "${label}" 必须是对象`);
  }

  return value;
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  label: string
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`配置文件中的 "${label}.${key}" 不是受支持的字段`);
    }
  }
}

function normalizeString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`配置文件中的 "${label}" 必须是字符串`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`配置文件中的 "${label}" 不能为空字符串`);
  }

  return trimmed;
}

function normalizeStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`配置文件中的 "${label}" 必须是字符串数组`);
  }

  return value.map((item, index) => normalizeString(item, `${label}[${index}]`));
}

function normalizeBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`配置文件中的 "${label}" 必须是布尔值`);
  }

  return value;
}

function normalizeNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`配置文件中的 "${label}" 必须是数字`);
  }

  return value;
}

function normalizeMode(value: unknown): NormalizedCodemapConfig['mode'] {
  const mode = normalizeString(value, 'mode') as NormalizedCodemapConfig['mode'];

  if (!VALID_MODES.has(mode)) {
    throw new Error('配置文件中的 "mode" 仅支持 fast、smart、hybrid');
  }

  return mode;
}

function normalizeStorageType(value: unknown): NormalizedStorageConfig['type'] {
  const storageType = normalizeString(value, 'storage.type') as NormalizedStorageConfig['type'];

  if (!VALID_STORAGE_TYPES.has(storageType)) {
    throw new Error('配置文件中的 "storage.type" 仅支持 filesystem、sqlite、kuzudb、memory、auto');
  }

  return storageType;
}

function assertNoDeprecatedNeo4jConfig(rawStorageConfig: Record<string, unknown>): void {
  const containsLegacyNeo4jFields = rawStorageConfig.type === 'neo4j'
    || rawStorageConfig.uri !== undefined
    || rawStorageConfig.username !== undefined
    || rawStorageConfig.password !== undefined;

  if (containsLegacyNeo4jFields) {
    throw new Error(
      '配置文件中的 Neo4j storage 已不再受支持；请改用 filesystem、sqlite、kuzudb、memory 或 auto，并移除 storage.uri / storage.username / storage.password'
    );
  }
}

function createDefaultPluginConfig(): NormalizedPluginConfig {
  return {
    builtInPlugins: true,
    plugins: [],
    debug: false,
  };
}

export function createDefaultStorageConfig(): NormalizedStorageConfig {
  return {
    type: 'filesystem',
    outputPath: '.mycodemap/storage',
  };
}

export function createDefaultCodemapConfig(): NormalizedCodemapConfig {
  return {
    mode: DEFAULT_CONFIG_MODE,
    include: [...DEFAULT_CONFIG_INCLUDE],
    exclude: [...DEFAULT_DISCOVERY_EXCLUDES],
    output: DEFAULT_CONFIG_OUTPUT,
    watch: false,
    storage: createDefaultStorageConfig(),
    plugins: createDefaultPluginConfig(),
  };
}

export function createDefaultCodemapConfigFile(): CodemapConfigFile {
  const defaults = createDefaultCodemapConfig();

  return {
    $schema: DEFAULT_CONFIG_SCHEMA_URL,
    mode: defaults.mode,
    include: defaults.include,
    exclude: defaults.exclude,
    output: defaults.output,
    watch: defaults.watch,
    storage: defaults.storage,
    plugins: {
      builtInPlugins: defaults.plugins.builtInPlugins,
      plugins: defaults.plugins.plugins,
      debug: defaults.plugins.debug,
    },
  };
}

function normalizeAutoThresholds(value: unknown): NonNullable<NormalizedStorageConfig['autoThresholds']> {
  const rawThresholds = assertConfigObject(value, 'storage.autoThresholds');
  assertAllowedKeys(rawThresholds, ALLOWED_AUTO_THRESHOLD_KEYS, 'storage.autoThresholds');

  return {
    useGraphDBWhenFileCount: normalizeNumber(
      rawThresholds.useGraphDBWhenFileCount,
      'storage.autoThresholds.useGraphDBWhenFileCount'
    ),
    useGraphDBWhenNodeCount: normalizeNumber(
      rawThresholds.useGraphDBWhenNodeCount,
      'storage.autoThresholds.useGraphDBWhenNodeCount'
    ),
  };
}

function normalizeStorageConfig(value: unknown): NormalizedStorageConfig {
  if (value === undefined) {
    return createDefaultStorageConfig();
  }

  const defaults = createDefaultStorageConfig();
  const rawStorageConfig = assertConfigObject(value, 'storage');
  assertNoDeprecatedNeo4jConfig(rawStorageConfig);
  assertAllowedKeys(rawStorageConfig, ALLOWED_STORAGE_KEYS, 'storage');

  return {
    type: rawStorageConfig.type === undefined ? defaults.type : normalizeStorageType(rawStorageConfig.type),
    outputPath:
      rawStorageConfig.outputPath === undefined
        ? defaults.outputPath
        : normalizeString(rawStorageConfig.outputPath, 'storage.outputPath'),
    databasePath:
      rawStorageConfig.databasePath === undefined
        ? undefined
        : normalizeString(rawStorageConfig.databasePath, 'storage.databasePath'),
    autoThresholds:
      rawStorageConfig.autoThresholds === undefined
        ? undefined
        : normalizeAutoThresholds(rawStorageConfig.autoThresholds),
  };
}

function normalizePluginConfig(value: unknown, rootDir: string): NormalizedPluginConfig {
  if (value === undefined) {
    return createDefaultPluginConfig();
  }

  const rawPluginConfig = assertConfigObject(value, 'plugins');
  assertAllowedKeys(rawPluginConfig, ALLOWED_PLUGIN_KEYS, 'plugins');

  return {
    builtInPlugins:
      rawPluginConfig.builtInPlugins === undefined
        ? true
        : normalizeBoolean(rawPluginConfig.builtInPlugins, 'plugins.builtInPlugins'),
    pluginDir:
      rawPluginConfig.pluginDir === undefined
        ? undefined
        : path.resolve(rootDir, normalizeString(rawPluginConfig.pluginDir, 'plugins.pluginDir')),
    plugins:
      rawPluginConfig.plugins === undefined
        ? []
        : normalizeStringArray(rawPluginConfig.plugins, 'plugins.plugins'),
    debug:
      rawPluginConfig.debug === undefined
        ? false
        : normalizeBoolean(rawPluginConfig.debug, 'plugins.debug'),
  };
}

function normalizeCodemapConfig(value: unknown, rootDir: string): NormalizedCodemapConfig {
  const defaults = createDefaultCodemapConfig();
  const rawConfig = assertConfigObject(value, 'root');
  assertAllowedKeys(rawConfig, ALLOWED_CONFIG_KEYS, 'root');

  return {
    mode: rawConfig.mode === undefined ? defaults.mode : normalizeMode(rawConfig.mode),
    include: rawConfig.include === undefined ? defaults.include : normalizeStringArray(rawConfig.include, 'include'),
    exclude: rawConfig.exclude === undefined ? defaults.exclude : normalizeStringArray(rawConfig.exclude, 'exclude'),
    output: rawConfig.output === undefined ? defaults.output : normalizeString(rawConfig.output, 'output'),
    watch: rawConfig.watch === undefined ? defaults.watch : normalizeBoolean(rawConfig.watch, 'watch'),
    storage: normalizeStorageConfig(rawConfig.storage),
    plugins: normalizePluginConfig(rawConfig.plugins, rootDir),
  };
}

function parseConfigText(text: string, configPath: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`无法解析配置文件 ${configPath}: ${reason}`);
  }
}

export async function loadCodemapConfig(rootDir: string = cwd()): Promise<LoadedCodemapConfig> {
  const { path: configPath, isLegacy } = resolveConfigPath(rootDir);

  if (!existsSync(configPath)) {
    return {
      config: createDefaultCodemapConfig(),
      configPath,
      exists: false,
      isLegacy,
      hasExplicitPluginConfig: false,
    };
  }

  const configText = await readFile(configPath, 'utf8');
  const parsedConfig = parseConfigText(configText, configPath);
  const hasExplicitPluginConfig = isRecord(parsedConfig) && Object.prototype.hasOwnProperty.call(parsedConfig, 'plugins');

  return {
    config: normalizeCodemapConfig(parsedConfig, rootDir),
    configPath,
    exists: true,
    isLegacy,
    hasExplicitPluginConfig,
  };
}
