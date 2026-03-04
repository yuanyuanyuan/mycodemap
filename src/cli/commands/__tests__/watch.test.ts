/**
 * [META] Watch CLI Command Test
 * [WHY] Ensure watch command handles foreground, background, status, and stop modes correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simple mock setup
vi.mock('chalk', () => ({
  default: {
    blue: (text: string) => text,
    gray: (text: string) => text,
    yellow: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
  },
}));

const mockWatchForeground = vi.fn();
vi.mock('../watch-foreground.js', () => ({
  watchCommandForeground: (...args: unknown[]) => mockWatchForeground(...args),
}));

const mockDaemonStart = vi.fn();
const mockDaemonStop = vi.fn();
const mockDaemonGetStatus = vi.fn();

vi.mock('../../../watcher/index.js', () => ({
  createWatchDaemon: vi.fn(() => ({
    start: mockDaemonStart,
    stop: mockDaemonStop,
    getStatus: mockDaemonGetStatus,
  })),
}));

import { watchCommand } from '../watch.js';

describe('Watch CLI', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let mockExitCode: number | undefined;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockExitCode = undefined;
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      mockExitCode = typeof code === 'number' ? code : 1;
      throw new Error(`Process exit with code: ${code}`);
    });
    
    // Reset mocks
    vi.clearAllMocks();
    mockWatchForeground.mockReset();
    mockDaemonStart.mockReset();
    mockDaemonStop.mockReset();
    mockDaemonGetStatus.mockReset();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('watchCommand', () => {
    it('should run in foreground mode by default', async () => {
      mockWatchForeground.mockResolvedValue(undefined);

      await watchCommand({});

      expect(mockWatchForeground).toHaveBeenCalledWith({
        mode: 'fast',
        output: '.mycodemap',
      });
    });

    it('should run in foreground mode with custom options', async () => {
      mockWatchForeground.mockResolvedValue(undefined);

      await watchCommand({
        mode: 'smart',
        output: 'custom-output',
      });

      expect(mockWatchForeground).toHaveBeenCalledWith({
        mode: 'smart',
        output: 'custom-output',
      });
    });

    it('should start daemon in background mode', async () => {
      mockDaemonStart.mockResolvedValue(undefined);

      await watchCommand({ detach: true, mode: 'smart' });

      expect(mockDaemonStart).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Watch 守护进程已启动'));
    });

    it('should show warning when daemon already running', async () => {
      mockDaemonStart.mockRejectedValue(new Error('已在运行'));
      mockDaemonGetStatus.mockResolvedValue({ pid: 12345 });

      await watchCommand({ detach: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已在运行'));
    });

    it('should exit on daemon start failure', async () => {
      mockDaemonStart.mockRejectedValue(new Error('Permission denied'));

      await expect(watchCommand({ detach: true })).rejects.toThrow('Process exit');
      expect(mockExitCode).toBe(1);
    });

    it('should stop daemon successfully', async () => {
      mockDaemonStop.mockResolvedValue(undefined);

      await watchCommand({ stop: true });

      expect(mockDaemonStop).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('已停止'));
    });

    it('should show warning when stopping non-running daemon', async () => {
      mockDaemonStop.mockRejectedValue(new Error('未运行'));

      await watchCommand({ stop: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('未运行'));
    });

    it('should show status when daemon is running', async () => {
      mockDaemonGetStatus.mockResolvedValue({
        pid: 12345,
        rootDir: '/project',
        outputDir: '.mycodemap',
        mode: 'fast',
        startedAt: Date.now(),
      });

      await watchCommand({ status: true });

      expect(mockDaemonGetStatus).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('运行中'));
    });

    it('should show status when daemon is not running', async () => {
      mockDaemonGetStatus.mockResolvedValue(null);

      await watchCommand({ status: true });

      expect(mockDaemonGetStatus).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('未运行'));
    });

    it('should not run foreground when status is requested', async () => {
      mockDaemonGetStatus.mockResolvedValue(null);
      mockWatchForeground.mockResolvedValue(undefined);

      await watchCommand({ status: true, detach: true });

      expect(mockDaemonGetStatus).toHaveBeenCalled();
      expect(mockWatchForeground).not.toHaveBeenCalled();
    });

    it('should prioritize stop over detach', async () => {
      mockDaemonStop.mockResolvedValue(undefined);

      await watchCommand({ stop: true, detach: true });

      expect(mockDaemonStop).toHaveBeenCalled();
      expect(mockDaemonStart).not.toHaveBeenCalled();
    });
  });
});
