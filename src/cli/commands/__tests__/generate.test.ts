/**
 * [META] Generate CLI Command Test
 * [WHY] Ensure code generation command correctness including AI logic and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

// Simple mock setup
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  })),
}));

vi.mock('chalk', () => ({
  default: {
    blue: (text: string) => text,
    gray: (text: string) => text,
    yellow: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
    cyan: (text: string) => text,
  },
}));

const mockAnalyze = vi.fn();
const mockGenerateAIMap = vi.fn();
const mockGenerateJSON = vi.fn();
const mockGenerateContext = vi.fn();
const mockGenerateContextWithAI = vi.fn();
const mockGenerateMermaidGraph = vi.fn();
const mockCreateAIOverviewGenerator = vi.fn();
const mockCreateSubagentCaller = vi.fn();

vi.mock('../../../core/analyzer.js', () => ({
  analyze: (...args: unknown[]) => mockAnalyze(...args),
}));

vi.mock('../../../generator/index.js', () => ({
  generateAIMap: (...args: unknown[]) => mockGenerateAIMap(...args),
  generateJSON: (...args: unknown[]) => mockGenerateJSON(...args),
  generateContext: (...args: unknown[]) => mockGenerateContext(...args),
  generateContextWithAI: (...args: unknown[]) => mockGenerateContextWithAI(...args),
  generateMermaidGraph: (...args: unknown[]) => mockGenerateMermaidGraph(...args),
}));

vi.mock('../../../generator/ai-overview.js', () => ({
  createAIOverviewGenerator: (...args: unknown[]) => mockCreateAIOverviewGenerator(...args),
}));

vi.mock('../../../ai/subagent-caller.js', () => ({
  createSubagentCaller: (...args: unknown[]) => mockCreateSubagentCaller(...args),
}));

import { generateCommand } from '../generate.js';

describe('Generate CLI', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let mockExitCode: number | undefined;
  let originalEnv: NodeJS.ProcessEnv;

  const createMockCodeMap = () => ({
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    project: {
      name: 'test-project',
      rootDir: '/project',
      packageManager: 'npm' as const,
    },
    summary: {
      totalFiles: 10,
      totalLines: 1000,
      totalModules: 10,
      totalExports: 20,
    },
    modules: [],
    dependencies: { nodes: [], edges: [] },
  });

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExitCode = undefined;
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      mockExitCode = typeof code === 'number' ? code : 1;
      throw new Error(`Process exit with code: ${code}`);
    });
    originalEnv = { ...process.env };
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockAnalyze.mockResolvedValue(createMockCodeMap());
    mockGenerateAIMap.mockResolvedValue(undefined);
    mockGenerateJSON.mockResolvedValue(undefined);
    mockGenerateContext.mockResolvedValue(undefined);
    mockGenerateContextWithAI.mockResolvedValue(undefined);
    mockGenerateMermaidGraph.mockResolvedValue(undefined);
    mockCreateAIOverviewGenerator.mockReturnValue({
      generate: vi.fn().mockResolvedValue('/project/.codemap/AI_OVERVIEW.md'),
    });
    mockCreateSubagentCaller.mockReturnValue({
      isAvailable: vi.fn().mockResolvedValue(true),
      generateOverview: vi.fn().mockResolvedValue({
        summary: 'Test overview',
        keyInsights: [],
        recommendations: [],
      }),
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('generateCommand', () => {
    it('should generate with default options', async () => {
      await generateCommand({});
      expect(mockAnalyze).toHaveBeenCalled();
    }, 30000);

    it('should generate with fast mode', async () => {
      await generateCommand({ mode: 'fast' });
      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({ mode: 'fast' }));
    }, 30000);

    it('should generate with smart mode', async () => {
      await generateCommand({ mode: 'smart' });
      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({ mode: 'smart' }));
    }, 30000);

    it('should use custom output directory', async () => {
      await generateCommand({ output: 'custom-output' });
      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({ output: 'custom-output' }));
    }, 30000);

    it('should generate with AI context enabled', async () => {
      await generateCommand({ 'ai-context': true });
      expect(mockGenerateContextWithAI).toHaveBeenCalled();
    }, 30000);

    it('should skip AI context when disabled', async () => {
      await generateCommand({ 'ai-context': false });
      expect(mockGenerateContext).toHaveBeenCalled();
      expect(mockGenerateContextWithAI).not.toHaveBeenCalled();
    }, 30000);

    it('should skip AI overview in Claude Code session', async () => {
      process.env.CLAUDECODE = 'true';
      await generateCommand({});
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Claude Code'));
    }, 30000);

    it('should force AI overview with environment variable', async () => {
      process.env.CLAUDECODE = 'true';
      process.env.CODEMAP_ENABLE_AI = 'true';
      await generateCommand({});
      expect(mockCreateSubagentCaller).toHaveBeenCalled();
    }, 30000);

    it('should handle analysis error', async () => {
      mockAnalyze.mockRejectedValue(new Error('Analysis failed'));
      await expect(generateCommand({})).rejects.toThrow('Process exit');
      expect(mockExitCode).toBe(1);
    }, 30000);

    it('should display project statistics', async () => {
      await generateCommand({});
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('文件总数'));
    }, 30000);

    it('should display actual mode when available', async () => {
      mockAnalyze.mockResolvedValue({ ...createMockCodeMap(), actualMode: 'smart' });
      await generateCommand({ mode: 'hybrid' });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('解析模式'));
    }, 30000);

    it('should handle AI overview generation failure gracefully', async () => {
      mockCreateSubagentCaller.mockReturnValue({
        isAvailable: vi.fn().mockResolvedValue(true),
        generateOverview: vi.fn().mockRejectedValue(new Error('AI service unavailable')),
      });
      await generateCommand({});
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('AI 概述生成失败'));
    }, 30000);

    it('should skip AI overview when subagent is not available', async () => {
      mockCreateSubagentCaller.mockReturnValue({
        isAvailable: vi.fn().mockResolvedValue(false),
        generateOverview: vi.fn(),
      });
      await generateCommand({});
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Claude CLI 不可用'));
    }, 30000);
  });
});
