// [META] since:2026-03-04 | owner:cli-team | stable:false
// [WHY] 提供统一的路径解析工具，处理新旧目录/配置文件名的兼容逻辑

import { existsSync, readFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { cwd } from 'node:process';

/**
 * 新旧路径常量
 */
export const DEFAULT_OUTPUT_DIR_NEW = '.mycodemap';
export const DEFAULT_OUTPUT_DIR_OLD = '.codemap';
export const CONFIG_FILE_CANONICAL = 'config.json';
export const CONFIG_FILE_NEW = 'mycodemap.config.json';
export const CONFIG_FILE_OLD = 'codemap.config.json';
export const DATA_FILE = 'codemap.json'; // P0 保持不变

/**
 * 路径解析结果
 */
export interface ResolvePathsResult {
  /** 实际使用的输出目录 */
  outputDir: string;
  /** 是否使用了旧路径（用于显示迁移提示） */
  isLegacy: boolean;
  /** 配置文件完整路径 */
  configPath: string;
  /** 数据文件完整路径 */
  dataPath: string;
}

interface OutputConfigShape {
  output?: unknown;
}

function getCanonicalConfigPath(rootDir: string): string {
  return join(rootDir, DEFAULT_OUTPUT_DIR_NEW, CONFIG_FILE_CANONICAL);
}

function resolveConfiguredOutput(rootDir: string): string | undefined {
  const { path: configPath } = resolveConfigPath(rootDir);
  if (!existsSync(configPath)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as OutputConfigShape;
    if (typeof parsed.output !== 'string') {
      return undefined;
    }

    const trimmedOutput = parsed.output.trim();
    return trimmedOutput.length > 0 ? trimmedOutput : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 解析输出目录
 * - 优先使用新路径 .mycodemap
 * - 不存在则回退旧路径 .codemap
 * - 如果显式指定了 output 则使用指定的路径
 *
 * @param customOutput - 用户显式指定的输出目录
 * @param rootDir - 项目根目录（默认为 cwd）
 * @returns 解析结果（默认返回绝对路径）
 */
export function resolveOutputDir(customOutput?: string, rootDir: string = cwd()): ResolvePathsResult {
  let resolvedPath: string;

  // 如果用户显式指定了输出目录，直接使用
  if (customOutput) {
    resolvedPath = isAbsolute(customOutput) ? customOutput : join(rootDir, customOutput);
  } else {
    const configuredOutput = resolveConfiguredOutput(rootDir);
    if (configuredOutput) {
      resolvedPath = isAbsolute(configuredOutput) ? configuredOutput : join(rootDir, configuredOutput);
    } else {
      // 优先检查新路径
      const newPath = join(rootDir, DEFAULT_OUTPUT_DIR_NEW);
      if (existsSync(newPath) || !existsSync(join(rootDir, DEFAULT_OUTPUT_DIR_OLD))) {
        resolvedPath = newPath;
      } else {
        // 回退到旧路径
        resolvedPath = join(rootDir, DEFAULT_OUTPUT_DIR_OLD);
      }
    }
  }

  const isLegacy = resolvedPath.includes(DEFAULT_OUTPUT_DIR_OLD);

  return {
    outputDir: resolvedPath,
    isLegacy,
    configPath: resolveConfigPath(rootDir).path,
    dataPath: join(resolvedPath, DATA_FILE),
  };
}

/**
 * 解析配置文件路径（读取时使用）
 * - 优先检查 canonical `.mycodemap/config.json`
 * - 不存在则回退根目录 `mycodemap.config.json`
 * - 再回退旧配置 `codemap.config.json`
 *
 * @param rootDir - 项目根目录（默认为 cwd）
 * @returns 配置文件路径和是否使用旧配置
 */
export function resolveConfigPath(rootDir: string = cwd()): { path: string; isLegacy: boolean } {
  const canonicalPath = getCanonicalConfigPath(rootDir);
  if (existsSync(canonicalPath)) {
    return { path: canonicalPath, isLegacy: false };
  }

  const newPath = join(rootDir, CONFIG_FILE_NEW);
  if (existsSync(newPath)) {
    return { path: newPath, isLegacy: false };
  }

  const oldPath = join(rootDir, CONFIG_FILE_OLD);
  if (existsSync(oldPath)) {
    return { path: oldPath, isLegacy: true };
  }

  return { path: canonicalPath, isLegacy: false };
}

/**
 * 解析数据文件路径
 * P0 保持 codemap.json 不变
 *
 * @param rootDir - 项目根目录
 * @param outputDir - 输出目录（可选，默认使用 resolveOutputDir）
 * @returns 数据文件路径
 */
export function resolveDataPath(rootDir: string = cwd(), outputDir?: string): string {
  const resolved = resolveOutputDir(outputDir, rootDir);
  return resolved.dataPath;
}

/**
 * 获取日志目录路径
 *
 * @param rootDir - 项目根目录
 * @returns 日志目录路径
 */
export function resolveLogDir(rootDir: string = cwd()): string {
  const resolved = resolveOutputDir(undefined, rootDir);
  return join(resolved.outputDir, 'logs');
}

/**
 * 获取 workflow 目录路径
 *
 * @param rootDir - 项目根目录
 * @param outputDir - 输出目录（可选）
 * @returns workflow 目录路径
 */
export function resolveWorkflowDir(rootDir: string = cwd(), outputDir?: string): string {
  const dir = outputDir || resolveOutputDir(undefined, rootDir).outputDir;
  return join(dir, 'workflow');
}

/**
 * 获取 workflow 特定文件路径
 *
 * @param name - 文件名（不含路径）
 * @param rootDir - 项目根目录
 * @param outputDir - 输出目录（可选）
 * @returns 文件完整路径
 */
export function resolveWorkflowFile(name: string, rootDir: string = cwd(), outputDir?: string): string {
  return join(resolveWorkflowDir(rootDir, outputDir), name);
}

/**
 * 获取模板目录路径
 *
 * @param rootDir - 项目根目录
 * @param outputDir - 输出目录（可选）
 * @returns 模板目录路径
 */
export function resolveTemplatesDir(rootDir: string = cwd(), outputDir?: string): string {
  const dir = outputDir || resolveOutputDir(undefined, rootDir).outputDir;
  return join(dir, 'templates');
}

/**
 * 输出迁移提示（当检测到使用旧路径时）
 */
export function printMigrationWarning(): void {
  const { isLegacy } = resolveOutputDir();
  if (isLegacy) {
    console.warn('');
    console.warn('\x1b[33m⚠️  检测到使用旧目录 .codemap，新版本将使用 .mycodemap\x1b[0m');
    console.warn('\x1b[33m   请迁移您的数据：mv .codemap .mycodemap\x1b[0m');
    console.warn('');
  }
}
