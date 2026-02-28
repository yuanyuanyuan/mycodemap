// ============================================
// CLI Commands Integration Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { analyze } from '../../core/analyzer.js';
import { generateAIMap, generateJSON, generateContext, generateMermaidGraph } from '../../generator/index.js';

// Mock dependencies
vi.mock('../../core/analyzer.js', () => ({
  analyze: vi.fn().mockResolvedValue({
    summary: {
      totalFiles: 10,
      totalLines: 500,
      totalModules: 5,
      totalExports: 20
    },
    modules: [],
    dependencies: [],
    actualMode: 'fast'
  })
}));

vi.mock('../../generator/index.js', () => ({
  generateAIMap: vi.fn().mockResolvedValue(undefined),
  generateJSON: vi.fn().mockResolvedValue(undefined),
  generateContext: vi.fn().mockResolvedValue(undefined),
  generateMermaidGraph: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../generator/ai-overview.js', () => ({
  createAIOverviewGenerator: vi.fn().mockReturnValue({
    generate: vi.fn().mockResolvedValue('/path/to/AI_OVERVIEW.md')
  })
}));

vi.mock('../../ai/subagent-caller.js', () => ({
  createSubagentCaller: vi.fn().mockReturnValue({
    isAvailable: vi.fn().mockResolvedValue(false),
    generateOverview: vi.fn().mockResolvedValue('AI Overview content')
  })
}));

describe('generate command', () => {
  const testDir = path.join(process.cwd(), 'test-output');
  const outputDir = path.join(testDir, '.codemap');

  beforeEach(async () => {
    // Clean up test directories
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  it('should be able to import generate command', async () => {
    // This test verifies the module can be imported
    const { generateCommand } = await import('../commands/generate.js');
    expect(generateCommand).toBeDefined();
    expect(typeof generateCommand).toBe('function');
  });

  it('should call analyze with correct options', async () => {
    const { generateCommand } = await import('../commands/generate.js');

    await generateCommand({
      mode: 'fast',
      output: outputDir,
      ai: false
    });

    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'fast',
        output: outputDir
      })
    );
  });

  it('should use hybrid mode by default', async () => {
    const { generateCommand } = await import('../commands/generate.js');

    await generateCommand({
      output: outputDir,
      ai: false
    });

    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'hybrid'
      })
    );
  });

  it('should generate output files', async () => {
    const { generateCommand } = await import('../commands/generate.js');

    await generateCommand({
      mode: 'fast',
      output: outputDir,
      ai: false
    });

    expect(generateAIMap).toHaveBeenCalled();
    expect(generateJSON).toHaveBeenCalled();
    expect(generateMermaidGraph).toHaveBeenCalled();
    expect(generateContext).toHaveBeenCalled();
  });
});

// Cleanup
afterAll(async () => {
  try {
    await fs.rm(path.join(process.cwd(), 'test-output'), { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});
