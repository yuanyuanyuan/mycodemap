import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { appendRuntimeLog, cleanupRuntimeLogs, resolveRuntimeLogConfig } from '../runtime-logger.js';

function createLogFile(dir: string, name: string, mtimeMs: number): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, 'log', 'utf-8');
  const atime = new Date(mtimeMs);
  const mtime = new Date(mtimeMs);
  fs.utimesSync(filePath, atime, mtime);
  return filePath;
}

describe('runtime-logger', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    for (const dir of createdDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    createdDirs.length = 0;
  });

  it('should resolve default runtime log config', () => {
    const cwd = '/tmp/demo-project';
    const config = resolveRuntimeLogConfig(cwd, {});

    expect(config.enabled).toBe(true);
    expect(config.logDir).toBe(path.resolve(cwd, '.codemap/logs'));
    expect(config.logFilePath).toMatch(/codemap-\d{4}-\d{2}-\d{2}\.log$/);
    expect(config.retentionDays).toBe(14);
    expect(config.maxFiles).toBe(30);
    expect(config.maxFileSizeBytes).toBe(10 * 1024 * 1024);
  });

  it('should disable runtime log when env flag is false', () => {
    const config = resolveRuntimeLogConfig('/tmp/demo-project', {
      CODEMAP_RUNTIME_LOG_ENABLED: 'false',
    });

    expect(config.enabled).toBe(false);
  });

  it('should clean expired logs and keep max recent files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codemap-runtime-log-'));
    createdDirs.push(dir);

    const now = new Date('2026-03-03T12:00:00.000Z');
    const dayMs = 24 * 60 * 60 * 1000;

    // 过期文件（> 7 天）
    createLogFile(dir, 'codemap-2026-02-20.log', now.getTime() - dayMs * 11);
    createLogFile(dir, 'codemap-2026-02-23.log', now.getTime() - dayMs * 8);

    // 新文件（未过期）
    createLogFile(dir, 'codemap-2026-02-27.log', now.getTime() - dayMs * 4);
    createLogFile(dir, 'codemap-2026-03-01.log', now.getTime() - dayMs * 2);
    createLogFile(dir, 'codemap-2026-03-02.log', now.getTime() - dayMs);

    // 非日志文件不应被处理
    fs.writeFileSync(path.join(dir, 'watch.log'), 'watch', 'utf-8');

    cleanupRuntimeLogs(dir, 7, 2, now);

    const files = fs.readdirSync(dir).sort();
    expect(files).toContain('watch.log');
    expect(files).toContain('codemap-2026-03-01.log');
    expect(files).toContain('codemap-2026-03-02.log');
    expect(files).not.toContain('codemap-2026-02-20.log');
    expect(files).not.toContain('codemap-2026-02-23.log');
    expect(files).not.toContain('codemap-2026-02-27.log');
  });

  it('should rotate and gzip log file when size exceeds max bytes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codemap-runtime-rotate-'));
    createdDirs.push(dir);

    const logFilePath = path.join(dir, 'codemap-2026-03-03.log');
    appendRuntimeLog(logFilePath, 'A'.repeat(40) + '\n', 64);
    appendRuntimeLog(logFilePath, 'B'.repeat(40) + '\n', 64);

    const rotatedGz = `${logFilePath}.1.gz`;
    expect(fs.existsSync(logFilePath)).toBe(true);
    expect(fs.existsSync(rotatedGz)).toBe(true);

    const active = fs.readFileSync(logFilePath, 'utf-8');
    expect(active).toContain('B');

    const rotated = zlib.gunzipSync(fs.readFileSync(rotatedGz)).toString('utf-8');
    expect(rotated).toContain('A');
  });
});
