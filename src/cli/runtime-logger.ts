// [META] since:2026-03 | owner:orchestrator-team | stable:false
// [WHY] 为 codemap CLI 提供运行日志落盘与保留策略，便于问题追踪与离线排查

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import util from 'node:util';
import zlib from 'node:zlib';

const DEFAULT_LOG_DIR = '.codemap/logs';
const DEFAULT_RETENTION_DAYS = 14;
const DEFAULT_MAX_FILES = 30;
const DEFAULT_MAX_SIZE_MB = 10;
const LOG_FILE_PREFIX = 'codemap-';
const LOG_FILE_EXT = '.log';
const LOG_FILE_NAME_PATTERN = /^codemap-\d{4}-\d{2}-\d{2}\.log(?:\.\d+)?(?:\.gz)?$/;

export interface RuntimeLogConfig {
  enabled: boolean;
  logDir: string;
  logFilePath: string;
  retentionDays: number;
  maxFiles: number;
  maxFileSizeBytes: number;
}

interface ConsoleLike {
  log: typeof console.log;
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
  debug: typeof console.debug;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function shouldEnableRuntimeLog(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  return value.toLowerCase() !== 'false';
}

function getLogFilePath(logDir: string, now: Date): string {
  const date = now.toISOString().slice(0, 10);
  return path.join(logDir, `${LOG_FILE_PREFIX}${date}${LOG_FILE_EXT}`);
}

function isRuntimeLogFile(fileName: string): boolean {
  return LOG_FILE_NAME_PATTERN.test(fileName);
}

function formatLogLine(level: string, message: string, now = new Date()): string {
  return `[${now.toISOString()}] [${level}] ${message}\n`;
}

function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack || `${arg.name}: ${arg.message}`;
      }
      if (typeof arg === 'string') {
        return arg;
      }
      return util.inspect(arg, { depth: 4, breakLength: 120 });
    })
    .join(' ');
}

function getNextRotationIndex(logFilePath: string): number {
  const dir = path.dirname(logFilePath);
  const baseName = path.basename(logFilePath);
  const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rotationPattern = new RegExp(`^${escaped}\\.(\\d+)(?:\\.gz)?$`);
  let maxIndex = 0;

  for (const name of fs.readdirSync(dir)) {
    const match = name.match(rotationPattern);
    if (!match) {
      continue;
    }
    const index = Number.parseInt(match[1], 10);
    if (Number.isFinite(index) && index > maxIndex) {
      maxIndex = index;
    }
  }

  return maxIndex + 1;
}

function maybeRotateLog(logFilePath: string, maxFileSizeBytes: number, pendingBytes: number): void {
  if (maxFileSizeBytes <= 0 || !fs.existsSync(logFilePath)) {
    return;
  }

  const stat = fs.statSync(logFilePath);
  if (stat.size === 0 || stat.size + pendingBytes <= maxFileSizeBytes) {
    return;
  }

  const nextIndex = getNextRotationIndex(logFilePath);
  const rotatedPath = `${logFilePath}.${nextIndex}`;
  fs.renameSync(logFilePath, rotatedPath);

  try {
    const gzPath = `${rotatedPath}.gz`;
    const raw = fs.readFileSync(rotatedPath);
    fs.writeFileSync(gzPath, zlib.gzipSync(raw));
    fs.unlinkSync(rotatedPath);
  } catch {
    // 压缩失败时保留未压缩轮转文件
  }
}

export function appendRuntimeLog(logFilePath: string, line: string, maxFileSizeBytes: number): void {
  try {
    const pendingBytes = Buffer.byteLength(line, 'utf-8');
    maybeRotateLog(logFilePath, maxFileSizeBytes, pendingBytes);
    fs.appendFileSync(logFilePath, line, 'utf-8');
  } catch {
    // 日志写入失败不应影响 CLI 主流程
  }
}

export function resolveRuntimeLogConfig(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  now = new Date()
): RuntimeLogConfig {
  const enabled = shouldEnableRuntimeLog(env.CODEMAP_RUNTIME_LOG_ENABLED);
  const logDir = path.resolve(cwd, env.CODEMAP_RUNTIME_LOG_DIR || DEFAULT_LOG_DIR);
  const retentionDays = parsePositiveInt(env.CODEMAP_RUNTIME_LOG_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
  const maxFiles = parsePositiveInt(env.CODEMAP_RUNTIME_LOG_MAX_FILES, DEFAULT_MAX_FILES);
  const maxFileSizeMb = parsePositiveInt(env.CODEMAP_RUNTIME_LOG_MAX_SIZE_MB, DEFAULT_MAX_SIZE_MB);

  return {
    enabled,
    logDir,
    logFilePath: getLogFilePath(logDir, now),
    retentionDays,
    maxFiles,
    maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
  };
}

export function cleanupRuntimeLogs(
  logDir: string,
  retentionDays: number,
  maxFiles: number,
  now = new Date()
): void {
  if (!fs.existsSync(logDir)) {
    return;
  }

  const entries = fs.readdirSync(logDir)
    .filter(isRuntimeLogFile)
    .map((name) => {
      const filePath = path.join(logDir, name);
      const stat = fs.statSync(filePath);
      return { name, filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => a.mtimeMs - b.mtimeMs);

  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const expired = entries.filter((entry) => now.getTime() - entry.mtimeMs > retentionMs);
  for (const entry of expired) {
    try {
      fs.unlinkSync(entry.filePath);
    } catch {
      // ignore
    }
  }

  const remaining = fs.readdirSync(logDir)
    .filter(isRuntimeLogFile)
    .map((name) => {
      const filePath = path.join(logDir, name);
      const stat = fs.statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => a.mtimeMs - b.mtimeMs);

  const overflow = Math.max(0, remaining.length - maxFiles);
  for (let i = 0; i < overflow; i++) {
    try {
      fs.unlinkSync(remaining[i].filePath);
    } catch {
      // ignore
    }
  }
}

export function setupRuntimeLogging(
  argv: string[],
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): RuntimeLogConfig | null {
  const config = resolveRuntimeLogConfig(cwd, env);
  if (!config.enabled) {
    return null;
  }

  try {
    fs.mkdirSync(config.logDir, { recursive: true });
    cleanupRuntimeLogs(config.logDir, config.retentionDays, config.maxFiles);
  } catch {
    return null;
  }

  const command = argv.join(' ').trim() || '(no args)';
  appendRuntimeLog(config.logFilePath, formatLogLine('INFO', `session.start pid=${process.pid} cwd=${cwd} cmd="${command}"`), config.maxFileSizeBytes);
  appendRuntimeLog(
    config.logFilePath,
    formatLogLine('INFO', `runtime node=${process.version} platform=${os.platform()} arch=${os.arch()}`),
    config.maxFileSizeBytes
  );

  const originalConsole: ConsoleLike = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  const wrapMethod = <T extends keyof ConsoleLike>(method: T, level: string): void => {
    const original = originalConsole[method];
    console[method] = ((...args: unknown[]) => {
      appendRuntimeLog(config.logFilePath, formatLogLine(level, formatConsoleArgs(args)), config.maxFileSizeBytes);
      original(...args);
    }) as ConsoleLike[T];
  };

  wrapMethod('log', 'INFO');
  wrapMethod('info', 'INFO');
  wrapMethod('warn', 'WARN');
  wrapMethod('error', 'ERROR');
  wrapMethod('debug', 'DEBUG');

  process.on('exit', (code) => {
    appendRuntimeLog(config.logFilePath, formatLogLine('INFO', `session.end code=${code}`), config.maxFileSizeBytes);
  });

  return config;
}
